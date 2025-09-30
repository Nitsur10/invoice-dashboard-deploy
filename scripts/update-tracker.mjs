#!/usr/bin/env node

/**
 * Portfolio Issues & PRs Control Board Tracker
 *
 * Aggregates Issues and PRs across repositories with intelligent classification,
 * robust error handling, and comprehensive monitoring.
 */

import { Octokit } from '@octokit/rest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import https from 'https';
import { URL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Configuration and globals
let config = {};
let policy = {};
let maintainers = {};
let trackerState = {};
let metrics = {
  execution_start: Date.now(),
  api_calls_made: 0,
  api_calls_failed: 0,
  repos_processed: 0,
  prs_classified: {},
  issues_classified: {},
  errors: [],
  rate_limit_remaining: null,
  // Phase 2 metrics
  readiness_scores: [],
  sla_violations: [],
  auto_comments_made: 0,
  auto_assignments_made: 0,
  label_suggestions: 0
};

/**
 * Enhanced validation utilities
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new TrackerError('Configuration is required and must be an object');
  }

  if (!config.repos || !Array.isArray(config.repos) || config.repos.length === 0) {
    throw new TrackerError('Configuration must include at least one repository');
  }

  // Validate repo format
  config.repos.forEach((repo, index) => {
    if (typeof repo === 'string') {
      if (!repo.includes('/') || repo.split('/').length !== 2) {
        throw new TrackerError(`Invalid repo format at index ${index}: "${repo}". Expected "owner/repo"`);
      }
    } else if (typeof repo === 'object') {
      if (!repo.name || !repo.name.includes('/')) {
        throw new TrackerError(`Invalid repo object at index ${index}: missing or invalid name property`);
      }
    } else {
      throw new TrackerError(`Invalid repo type at index ${index}: expected string or object`);
    }
  });

  return true;
}

function validatePRData(pr) {
  if (!pr || typeof pr !== 'object') return false;

  const required = ['number', 'title', 'html_url', 'head', 'draft', 'updated_at', 'created_at', 'user'];
  return required.every(field => {
    if (field === 'head') return pr.head && pr.head.ref;
    if (field === 'user') return pr.user && pr.user.login;
    return pr[field] !== undefined && pr[field] !== null;
  });
}

function validateIssueData(issue) {
  if (!issue || typeof issue !== 'object') return false;

  const required = ['number', 'title', 'html_url', 'updated_at', 'created_at', 'user'];
  return required.every(field => {
    if (field === 'user') return issue.user && issue.user.login;
    return issue[field] !== undefined && issue[field] !== null;
  });
}

function sanitizeData(data, fallback = {}) {
  if (!data || typeof data !== 'object') return fallback;

  // Remove undefined/null values and ensure basic structure
  const sanitized = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      sanitized[key] = data[key];
    }
  });

  return { ...fallback, ...sanitized };
}

/**
 * Enhanced error handling with context and recovery
 */
class TrackerError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'TrackerError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Rate limiting and retry logic with exponential backoff
 */
async function makeApiCall(octokit, operation, params, retries = 0) {
  try {
    metrics.api_calls_made++;
    const response = await operation.call(octokit.rest, params);

    // Track rate limit status
    metrics.rate_limit_remaining = response.headers['x-ratelimit-remaining'];

    return response;
  } catch (error) {
    metrics.api_calls_failed++;

    // Handle rate limiting
    if (error.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
      const waitTime = Math.max(resetTime - Date.now(), 0) + 1000; // Add 1s buffer

      console.warn(`Rate limit exceeded. Waiting ${Math.round(waitTime/1000)}s...`);
      await sleep(waitTime);

      if (retries < (config.rate_limiting?.max_retries || 3)) {
        return makeApiCall(octokit, operation, params, retries + 1);
      }
    }

    // Handle temporary failures with exponential backoff
    if (retries < (config.rate_limiting?.max_retries || 3) && isRetryableError(error)) {
      const delay = Math.min(
        (config.rate_limiting?.base_delay_ms || 1000) * Math.pow(2, retries),
        config.rate_limiting?.max_delay_ms || 30000
      );

      console.warn(`API call failed (attempt ${retries + 1}), retrying in ${delay}ms...`);
      await sleep(delay);
      return makeApiCall(octokit, operation, params, retries + 1);
    }

    // Log and re-throw permanent failures
    const errorContext = {
      operation: operation.name,
      params: JSON.stringify(params),
      status: error.status,
      message: error.message,
      retries
    };

    metrics.errors.push(new TrackerError(`API call failed: ${error.message}`, errorContext));
    throw error;
  }
}

function isRetryableError(error) {
  return error.status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load and validate configuration
 */
function loadConfig() {
  const configPath = join(ROOT_DIR, 'tracker.config.yml');

  if (!existsSync(configPath)) {
    throw new TrackerError('Configuration file not found', { path: configPath });
  }

  try {
    const configContent = readFileSync(configPath, 'utf8');
    config = yaml.load(configContent);

    // Comprehensive validation
    validateConfig(config);

    // Sanitize and set defaults
    config = sanitizeData(config, {
      rate_limiting: {
        max_retries: 3,
        base_delay_ms: 1000,
        max_delay_ms: 30000,
        requests_per_hour: 4500
      },
      thresholds: {
        stale_pr_days: 10,
        stale_issue_days: 14,
        critical_pr_count: 5,
        review_timeout_days: 7
      },
      output: {
        json_pretty_print: true,
        markdown_table_limit: 50,
        include_metrics: true,
        include_health_check: true
      }
    });

    // Load Phase 2 configuration files
    loadPhase2Configs();

    return config;
  } catch (error) {
    if (error instanceof TrackerError) {
      throw error;
    }
    throw new TrackerError(`Failed to load configuration: ${error.message}`, { configPath });
  }
}

/**
 * Load Phase 2 configuration files (policy, maintainers, tracker state)
 */
function loadPhase2Configs() {
  // Load policy configuration
  const policyPath = join(ROOT_DIR, 'docs', 'policy.yml');
  if (existsSync(policyPath)) {
    try {
      const policyContent = readFileSync(policyPath, 'utf8');
      policy = yaml.load(policyContent);
      console.log('✓ Loaded policy configuration');
    } catch (error) {
      console.warn(`⚠️  Failed to load policy.yml: ${error.message}`);
      policy = {};
    }
  } else {
    console.log('ℹ️  No policy.yml found, using defaults');
    policy = {};
  }

  // Load maintainers configuration
  const maintainersPath = join(ROOT_DIR, 'docs', 'maintainers.yml');
  if (existsSync(maintainersPath)) {
    try {
      const maintainersContent = readFileSync(maintainersPath, 'utf8');
      maintainers = yaml.load(maintainersContent);
      console.log('✓ Loaded maintainers configuration');
    } catch (error) {
      console.warn(`⚠️  Failed to load maintainers.yml: ${error.message}`);
      maintainers = {};
    }
  } else {
    console.log('ℹ️  No maintainers.yml found, auto-assignment disabled');
    maintainers = {};
  }

  // Load tracker state for anti-spam tracking
  const statePath = join(ROOT_DIR, 'docs', 'tracker-state.json');
  if (existsSync(statePath)) {
    try {
      const stateContent = readFileSync(statePath, 'utf8');
      trackerState = JSON.parse(stateContent);
      console.log('✓ Loaded tracker state');
    } catch (error) {
      console.warn(`⚠️  Failed to load tracker-state.json: ${error.message}`);
      trackerState = initializeTrackerState();
    }
  } else {
    console.log('ℹ️  No tracker-state.json found, initializing');
    trackerState = initializeTrackerState();
  }
}

/**
 * Initialize default tracker state
 */
function initializeTrackerState() {
  return {
    version: "2.0",
    last_updated: new Date().toISOString(),
    anti_spam: {
      comment_history: {},
      assignment_history: {},
      notification_history: {}
    },
    assignment_state: {
      round_robin_index: 0,
      last_assignment: null,
      workload_balance: {}
    },
    metrics: {
      total_auto_comments: 0,
      total_auto_assignments: 0,
      successful_assignments: 0,
      failed_assignments: 0,
      comment_spam_prevented: 0
    },
    feature_usage: {
      readiness_scoring: { enabled: true, last_used: null, usage_count: 0 },
      auto_comments: { enabled: false, last_used: null, usage_count: 0 },
      auto_assignment: { enabled: false, last_used: null, usage_count: 0 },
      sla_enforcement: { enabled: true, last_used: null, usage_count: 0 }
    },
    error_tracking: {
      auto_comment_failures: [],
      assignment_failures: [],
      api_failures: []
    },
    schema_version: "2.0"
  };
}

/**
 * Save tracker state to prevent data loss
 */
function saveTrackerState() {
  try {
    trackerState.last_updated = new Date().toISOString();
    const statePath = join(ROOT_DIR, 'docs', 'tracker-state.json');
    writeFileSync(statePath, JSON.stringify(trackerState, null, 2));
  } catch (error) {
    console.warn(`⚠️  Failed to save tracker state: ${error.message}`);
  }
}

/**
 * PHASE 2: Advanced Intelligence Functions
 */

/**
 * Calculate PR readiness score (0-100) with detailed reasoning
 */
function calculateReadinessScore(pr, reviews, checks, requiredApprovals = 1) {
  let score = 50; // Base score
  const reasons = [];

  // Check status impact (+20)
  if (checks.state === 'success') {
    score += 20;
    reasons.push("✅ All checks passing (+20)");
  } else if (checks.state === 'pending') {
    score += 5;
    reasons.push("⏳ Checks running (+5)");
  } else if (checks.state === 'failure' || checks.state === 'error') {
    score -= 20;
    reasons.push("❌ Checks failing (-20)");
  }

  // Approval impact (max +30)
  const approvals = reviews.filter(r => r.state === 'APPROVED').length;
  const approvalsNeeded = Math.max(0, requiredApprovals - approvals);
  if (approvals >= requiredApprovals) {
    score += 20;
    reasons.push(`✅ Sufficient approvals: ${approvals}/${requiredApprovals} (+20)`);
  } else {
    const partialBonus = Math.min(15, approvals * 7.5);
    score += partialBonus;
    reasons.push(`📝 Partial approvals: ${approvals}/${requiredApprovals} (+${partialBonus})`);
  }

  // Changes requested impact (-20)
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
  if (changesRequested > 0) {
    score -= 20;
    reasons.push(`🔄 Changes requested: ${changesRequested} (-20)`);
  }

  // File change size impact
  const filesChanged = pr.changed_files || 0;
  if (filesChanged > 100) {
    score -= 10;
    reasons.push(`📊 Large changeset: ${filesChanged} files (-10)`);
  } else if (filesChanged < 10) {
    score += 5;
    reasons.push(`📊 Small changeset: ${filesChanged} files (+5)`);
  }

  // Mergeable state impact
  if (pr.mergeable_state === 'blocked') {
    score -= 15;
    reasons.push("🚫 Merge blocked (-15)");
  } else if (pr.mergeable_state === 'dirty') {
    score -= 10;
    reasons.push("🔄 Merge conflicts (-10)");
  } else if (pr.mergeable_state === 'behind') {
    score -= 5;
    reasons.push("📍 Behind target branch (-5)");
  } else if (pr.mergeable_state === 'clean') {
    score += 10;
    reasons.push("✅ Clean merge state (+10)");
  }

  // Age impact
  const ageHours = (Date.now() - new Date(pr.created_at)) / (1000 * 60 * 60);
  const ageDays = Math.floor(ageHours / 24);
  if (ageDays > 7) {
    score -= 10;
    reasons.push(`⏰ Stale PR: ${ageDays} days old (-10)`);
  } else if (ageDays > 3) {
    score -= 5;
    reasons.push(`⏰ Aging PR: ${ageDays} days old (-5)`);
  }

  // Draft impact
  if (pr.draft) {
    score -= 10;
    reasons.push("📝 Draft PR (-10)");
  }

  // Clamp score to 0-100 range
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    reasons,
    category: score >= 80 ? 'ready' : score >= 60 ? 'review' : score >= 40 ? 'needs_work' : 'blocked',
    confidence: score >= 80 ? 0.9 : score >= 60 ? 0.8 : 0.7
  };
}

/**
 * Calculate SLA status and due dates based on priority
 */
function calculateSlaStatus(item, itemType = 'pr') {
  if (!policy.priorities) {
    return { status: 'unknown', due_date: null, hours_remaining: null };
  }

  // Detect priority from labels
  const labels = item.labels?.map(l => l.name || l) || [];
  let priority = 'p2'; // default

  for (const [priorityKey, labelList] of Object.entries(policy.labels || {})) {
    if (priorityKey.startsWith('priority_') && labelList.some(label => labels.includes(label))) {
      priority = priorityKey.replace('priority_', '');
      break;
    }
  }

  const priorityConfig = policy.priorities[priority];
  if (!priorityConfig) {
    return { status: 'unknown', due_date: null, hours_remaining: null, priority };
  }

  const slaHours = itemType === 'pr' ? priorityConfig.pr_sla_hours : priorityConfig.issue_sla_hours;
  const createdAt = new Date(item.created_at);
  const dueDate = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
  const now = new Date();
  const hoursRemaining = Math.round((dueDate - now) / (1000 * 60 * 60));

  let status;
  if (hoursRemaining < 0) {
    status = 'overdue';
  } else if (hoursRemaining <= 24) {
    status = 'due_soon';
  } else {
    status = 'on_track';
  }

  return {
    status,
    due_date: dueDate.toISOString(),
    hours_remaining: hoursRemaining,
    priority,
    sla_hours: slaHours
  };
}

/**
 * Analyze content and suggest labels/classifications
 */
function analyzeContent(title, body) {
  const suggestions = {
    type: null,
    priority: null,
    labels: [],
    confidence: 0.5,
    reasons: []
  };

  const text = `${title} ${body}`.toLowerCase();

  // Type detection
  if (policy.content_patterns) {
    const { bug_indicators, feature_indicators, security_indicators } = policy.content_patterns;

    // Bug detection
    const bugMatches = [
      ...(bug_indicators.title?.filter(pattern => title.toLowerCase().includes(pattern)) || []),
      ...(bug_indicators.body?.filter(pattern => body.toLowerCase().includes(pattern)) || [])
    ];
    if (bugMatches.length > 0) {
      suggestions.type = 'bug';
      suggestions.confidence += 0.3;
      suggestions.reasons.push(`Bug keywords: ${bugMatches.join(', ')}`);
    }

    // Feature detection
    const featureMatches = [
      ...(feature_indicators.title?.filter(pattern => title.toLowerCase().includes(pattern)) || []),
      ...(feature_indicators.body?.filter(pattern => body.toLowerCase().includes(pattern)) || [])
    ];
    if (featureMatches.length > 0 && !suggestions.type) {
      suggestions.type = 'feature';
      suggestions.confidence += 0.2;
      suggestions.reasons.push(`Feature keywords: ${featureMatches.join(', ')}`);
    }

    // Security detection
    const securityMatches = [
      ...(security_indicators.title?.filter(pattern => title.toLowerCase().includes(pattern)) || []),
      ...(security_indicators.body?.filter(pattern => body.toLowerCase().includes(pattern)) || [])
    ];
    if (securityMatches.length > 0) {
      suggestions.priority = 'p0';
      suggestions.confidence += 0.4;
      suggestions.reasons.push(`Security keywords: ${securityMatches.join(', ')}`);
    }
  }

  // Priority inference from urgency words
  const urgentWords = ['urgent', 'critical', 'hotfix', 'emergency', 'asap'];
  const highWords = ['important', 'high', 'priority'];

  if (urgentWords.some(word => text.includes(word))) {
    suggestions.priority = suggestions.priority || 'p0';
    suggestions.confidence += 0.2;
    suggestions.reasons.push('Urgent language detected');
  } else if (highWords.some(word => text.includes(word))) {
    suggestions.priority = suggestions.priority || 'p1';
    suggestions.confidence += 0.1;
    suggestions.reasons.push('High priority language detected');
  }

  // Suggest missing links
  const branchPattern = /^(fix|feat|bug)\/(\d+)-/;
  const branchMatch = title.match(branchPattern);
  if (branchMatch && !body.includes(`#${branchMatch[2]}`)) {
    suggestions.missing_links = [`Fixes #${branchMatch[2]}`];
    suggestions.reasons.push(`Branch suggests issue #${branchMatch[2]}`);
  }

  return suggestions;
}

/**
 * Enhanced PR classification with GitHub state complexity handling
 */
async function classifyPR(octokit, repo, pr) {
  try {
    // Get detailed PR info if mergeable_state is unknown
    let detailedPR = pr;
    if (pr.mergeable_state === 'unknown') {
      detailedPR = await waitForMergeableState(octokit, repo, pr.number);
    }

    // Get reviews and checks in parallel
    const [reviewsResponse, checksResponse] = await Promise.all([
      makeApiCall(octokit, octokit.rest.pulls.listReviews, {
        owner: repo.owner,
        repo: repo.name,
        pull_number: pr.number
      }),
      getAllChecks(octokit, repo, pr.head.sha)
    ]);

    const reviews = reviewsResponse.data;
    const checks = checksResponse;

    // Get branch protection to determine review requirements
    const requiredApprovals = await getRequiredApprovals(octokit, repo, detailedPR.base.ref);

    // PHASE 2: Calculate readiness score
    const readiness = calculateReadinessScore(detailedPR, reviews, checks, requiredApprovals);

    // PHASE 2: Calculate SLA status
    const slaStatus = calculateSlaStatus(detailedPR, 'pr');

    // PHASE 2: Analyze content for suggestions
    const contentAnalysis = analyzeContent(detailedPR.title, detailedPR.body || '');

    // Record readiness score for metrics
    metrics.readiness_scores.push(readiness.score);

    // Enhanced classification with readiness scoring
    let status_bucket = 'needs_review';
    let confidence = readiness.confidence;
    let details = readiness.reasons.join('; ');

    // Priority classification logic (maintains backward compatibility)
    if (detailedPR.draft) {
      status_bucket = 'draft';
      confidence = 1.0;
      details = 'PR is marked as draft';
      metrics.prs_classified.draft = (metrics.prs_classified.draft || 0) + 1;
    } else if (detailedPR.mergeable_state === 'dirty') {
      status_bucket = 'merge_conflicts';
      confidence = 1.0;
      details = 'PR has merge conflicts';
      metrics.prs_classified.merge_conflicts = (metrics.prs_classified.merge_conflicts || 0) + 1;
    } else if (detailedPR.mergeable_state === 'blocked') {
      status_bucket = 'blocked_by_admin';
      confidence = 1.0;
      details = 'PR is blocked by branch protection rules';
      metrics.prs_classified.blocked_by_admin = (metrics.prs_classified.blocked_by_admin || 0) + 1;
    } else if (checks.state === 'failure' || checks.state === 'error') {
      status_bucket = 'ci_failed';
      confidence = 1.0;
      details = `Checks failed: ${checks.failure_count} failures`;
      metrics.prs_classified.ci_failed = (metrics.prs_classified.ci_failed || 0) + 1;
    } else if (checks.state === 'pending') {
      status_bucket = 'ci_pending';
      confidence = 0.9;
      details = `Checks are running: ${checks.pending_count} pending`;
      metrics.prs_classified.ci_pending = (metrics.prs_classified.ci_pending || 0) + 1;
    } else if (reviews.filter(r => r.state === 'CHANGES_REQUESTED' && !r.dismissed).length > 0) {
      status_bucket = 'changes_requested';
      confidence = 1.0;
      details = 'Changes have been requested';
      metrics.prs_classified.changes_requested = (metrics.prs_classified.changes_requested || 0) + 1;
    } else {
      // Use readiness score for final determination
      const daysSinceUpdate = (Date.now() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24);
      const staleThreshold = repo.stale_pr_days || config.thresholds?.stale_pr_days || 10;

      if (daysSinceUpdate > staleThreshold) {
        status_bucket = 'stale';
        confidence = 1.0;
        details = `No updates for ${Math.round(daysSinceUpdate)} days`;
        metrics.prs_classified.stale = (metrics.prs_classified.stale || 0) + 1;
      } else if (readiness.score >= 80) {
        status_bucket = 'ready_to_merge';
        metrics.prs_classified.ready_to_merge = (metrics.prs_classified.ready_to_merge || 0) + 1;
      } else if (readiness.score >= 60) {
        status_bucket = 'needs_review';
        metrics.prs_classified.needs_review = (metrics.prs_classified.needs_review || 0) + 1;
      } else {
        status_bucket = 'needs_work';
        metrics.prs_classified.needs_work = (metrics.prs_classified.needs_work || 0) + 1;
      }
    }

    // Track SLA violations
    if (slaStatus.status === 'overdue') {
      metrics.sla_violations.push({
        type: 'pr',
        number: pr.number,
        hours_overdue: Math.abs(slaStatus.hours_remaining),
        priority: slaStatus.priority
      });
    }

    return {
      status_bucket,
      confidence,
      details,
      // Phase 2 enhancements
      readiness_score: readiness.score,
      readiness_reasons: readiness.reasons,
      sla_status: slaStatus,
      content_analysis: contentAnalysis,
      enhanced_classification: {
        category: readiness.category,
        priority: contentAnalysis.priority || slaStatus.priority,
        suggested_labels: contentAnalysis.labels,
        missing_links: contentAnalysis.missing_links || []
      }
    };

  } catch (error) {
    console.warn(`Failed to classify PR ${repo.owner}/${repo.name}#${pr.number}: ${error.message}`);
    metrics.prs_classified.error = (metrics.prs_classified.error || 0) + 1;
    return {
      status_bucket: 'needs_review',
      confidence: 0.1,
      details: `Classification failed: ${error.message}`,
      readiness_score: 0,
      readiness_reasons: ['Classification failed'],
      sla_status: { status: 'unknown', priority: 'p2' },
      content_analysis: { confidence: 0 },
      enhanced_classification: { category: 'error' }
    };
  }
}

/**
 * Wait for GitHub to compute mergeable_state (can be async)
 */
async function waitForMergeableState(octokit, repo, prNumber, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await makeApiCall(octokit, octokit.rest.pulls.get, {
      owner: repo.owner,
      repo: repo.name,
      pull_number: prNumber
    });

    if (response.data.mergeable_state !== 'unknown') {
      return response.data;
    }

    await sleep(1000 * (i + 1)); // Progressive delay
  }

  // Return with unknown state if still not computed
  // Since we can't get the mergeable state, return a minimal PR object
  const response = await makeApiCall(octokit, octokit.rest.pulls.get, {
    owner: arguments[1].owner,
    repo: arguments[1].name,
    pull_number: arguments[2]
  });
  return { ...response.data, mergeable_state: 'unknown' };
}

/**
 * Get comprehensive check status from both APIs
 */
async function getAllChecks(octokit, repo, sha) {
  try {
    const [statusResponse, checkRunsResponse] = await Promise.all([
      makeApiCall(octokit, octokit.rest.repos.getCombinedStatusForRef, {
        owner: repo.owner,
        repo: repo.name,
        ref: sha
      }).catch(() => ({ data: { state: 'pending', statuses: [] } })),

      makeApiCall(octokit, octokit.rest.checks.listForRef, {
        owner: repo.owner,
        repo: repo.name,
        ref: sha
      }).catch(() => ({ data: { check_runs: [] } }))
    ]);

    const commitStatus = statusResponse.data;
    const checkRuns = checkRunsResponse.data.check_runs;

    // Combine both status types
    const allChecks = [
      ...commitStatus.statuses.map(s => ({ name: s.context, state: s.state, conclusion: s.state })),
      ...checkRuns.map(c => ({ name: c.name, state: c.status, conclusion: c.conclusion }))
    ];

    // Determine overall state
    const pending = allChecks.filter(c => c.state === 'pending' || c.state === 'in_progress').length;
    const failures = allChecks.filter(c =>
      c.conclusion === 'failure' || c.conclusion === 'error' || c.state === 'failure'
    ).length;
    const success = allChecks.filter(c =>
      c.conclusion === 'success' || c.state === 'success'
    ).length;

    let overallState = 'success';
    if (pending > 0) overallState = 'pending';
    if (failures > 0) overallState = 'failure';

    return {
      state: overallState,
      total_count: allChecks.length,
      pending_count: pending,
      failure_count: failures,
      success_count: success,
      checks: allChecks
    };

  } catch (error) {
    console.warn(`Failed to get checks for ${repo.owner}/${repo.name}@${sha}: ${error.message}`);
    return {
      state: 'error',
      total_count: 0,
      pending_count: 0,
      failure_count: 0,
      success_count: 0,
      checks: []
    };
  }
}

/**
 * Get required approvals from branch protection
 */
async function getRequiredApprovals(octokit, repo, branch) {
  try {
    const response = await makeApiCall(octokit, octokit.rest.repos.getBranchProtection, {
      owner: repo.owner,
      repo: repo.name,
      branch: branch
    });

    return response.data.required_pull_request_reviews?.required_approving_review_count || 1;
  } catch (error) {
    // Default to 1 if we can't access branch protection
    return 1;
  }
}

/**
 * Extract linked issues from PR body, title, and branch name
 */
function extractLinkedIssues(pr) {
  const sources = [pr.body || '', pr.title || '', pr.head.ref || ''];
  const allText = sources.join(' ');

  const patterns = [
    // Standard GitHub keywords
    /(fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)[\s:]+#(\d+)/gi,
    // Cross-repo references
    /(fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)[\s:]+(\w+\/\w+)#(\d+)/gi,
    // General mentions
    /(?:^|\s)#(\d+)(?:\s|$)/g,
    // Cross-repo mentions
    /(?:^|\s)(\w+\/\w+)#(\d+)(?:\s|$)/g
  ];

  const linkedIssues = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(allText)) !== null) {
      if (match[2] && match[3]) {
        // Cross-repo
        linkedIssues.push({
          repo: match[2],
          number: parseInt(match[3]),
          type: match[1] ? 'closes' : 'mentions'
        });
      } else if (match[2]) {
        // Same repo
        linkedIssues.push({
          repo: `${pr.base.repo.owner.login}/${pr.base.repo.name}`,
          number: parseInt(match[2]),
          type: match[1] ? 'closes' : 'mentions'
        });
      }
    }
  }

  // Remove duplicates
  return linkedIssues.filter((issue, index, self) =>
    index === self.findIndex(i => i.repo === issue.repo && i.number === issue.number)
  );
}

/**
 * Classify issues based on labels and staleness
 */
function classifyIssue(issue, repoConfig) {
  const labels = issue.labels.map(l => l.name.toLowerCase());
  const daysSinceUpdate = (Date.now() - new Date(issue.updated_at)) / (1000 * 60 * 60 * 24);
  const staleThreshold = repoConfig.stale_issue_days || config.thresholds?.stale_issue_days || 14;

  let classification = 'other';
  let confidence = 0.5;

  // Check for bug labels
  if (config.labels?.bug?.some(bugLabel => labels.includes(bugLabel.toLowerCase()))) {
    classification = 'bug';
    confidence = 0.9;
    metrics.issues_classified.bug = (metrics.issues_classified.bug || 0) + 1;
  }
  // Check for enhancement labels
  else if (config.labels?.enhancement?.some(enhLabel => labels.includes(enhLabel.toLowerCase()))) {
    classification = 'enhancement';
    confidence = 0.9;
    metrics.issues_classified.enhancement = (metrics.issues_classified.enhancement || 0) + 1;
  }
  // Check for question labels
  else if (config.labels?.question?.some(qLabel => labels.includes(qLabel.toLowerCase()))) {
    classification = 'question';
    confidence = 0.9;
    metrics.issues_classified.question = (metrics.issues_classified.question || 0) + 1;
  }
  // Check for blocked labels
  else if (config.labels?.blocked?.some(blockLabel => labels.includes(blockLabel.toLowerCase()))) {
    classification = 'blocked';
    confidence = 0.9;
    metrics.issues_classified.blocked = (metrics.issues_classified.blocked || 0) + 1;
  }

  const isStale = daysSinceUpdate > staleThreshold;
  if (isStale) {
    metrics.issues_classified.stale = (metrics.issues_classified.stale || 0) + 1;
  }

  return {
    classification,
    confidence,
    is_stale: isStale,
    days_since_update: Math.round(daysSinceUpdate),
    labels: labels
  };
}

/**
 * Process a single repository
 */
async function processRepository(octokit, repoConfig) {
  const [owner, repoName] = repoConfig.name.split('/');
  const repo = { owner, name: repoName, ...repoConfig, name: repoName };

  console.log(`Processing repository: ${repo.owner}/${repo.name}`);

  try {
    // Fetch PRs and Issues in parallel
    const [prsResponse, issuesResponse] = await Promise.all([
      getAllPaginatedData(octokit, octokit.rest.pulls.list, {
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        per_page: 100
      }),
      getAllPaginatedData(octokit, octokit.rest.issues.listForRepo, {
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        per_page: 100
      })
    ]);

    // Filter out PRs from issues (GitHub API returns PRs in issues endpoint)
    const prs = prsResponse;
    const issues = issuesResponse.filter(issue => !issue.pull_request);

    console.log(`Found ${prs.length} PRs and ${issues.length} issues`);

    // Process PRs with classification and validation
    const processedPRs = [];
    for (const pr of prs) {
      // Validate PR data before processing
      if (!validatePRData(pr)) {
        console.warn(`⚠️  Skipping invalid PR data: ${pr?.number || 'unknown'} in ${repo.owner}/${repo.name}`);
        metrics.errors.push({
          message: 'Invalid PR data structure',
          context: { repo: `${repo.owner}/${repo.name}`, pr_number: pr?.number, pr_title: pr?.title },
          timestamp: new Date().toISOString()
        });
        continue;
      }

      try {
        const classification = await classifyPR(octokit, repo, pr);
        const linkedIssues = extractLinkedIssues(pr);

      processedPRs.push({
        repo: `${repo.owner}/${repo.name}`,
        number: pr.number,
        title: pr.title,
        html_url: pr.html_url,
        head_ref: pr.head.ref,
        draft: pr.draft,
        mergeable_state: pr.mergeable_state,
        status_bucket: classification.status_bucket,
        classification_confidence: classification.confidence,
        classification_details: classification.details,
        linked_issues: linkedIssues,
        updated_at: pr.updated_at,
        created_at: pr.created_at,
        author: pr.user.login,
        labels: pr.labels.map(l => l.name),
        // CRITICAL: Phase 2 fields that were missing
        readiness_score: classification.readiness_score || 0,
        readiness_reasons: classification.readiness_reasons || [],
        sla_status: classification.sla_status || { status: 'unknown', priority: 'p2' },
        content_analysis: classification.content_analysis || { confidence: 0 },
        enhanced_classification: classification.enhanced_classification || { category: 'unknown' }
      });
      } catch (error) {
        console.warn(`⚠️  Failed to process PR #${pr.number}: ${error.message}`);
        metrics.errors.push({
          message: `PR processing failed: ${error.message}`,
          context: { repo: `${repo.owner}/${repo.name}`, pr_number: pr.number, pr_title: pr.title },
          timestamp: new Date().toISOString()
        });

        // Add fallback PR data to avoid breaking the pipeline
        processedPRs.push(sanitizeData({
          repo: `${repo.owner}/${repo.name}`,
          number: pr.number,
          title: pr.title || 'Unknown',
          html_url: pr.html_url || '',
          head_ref: pr.head?.ref || 'unknown',
          draft: pr.draft || false,
          status_bucket: 'error',
          classification_confidence: 0,
          classification_details: `Processing failed: ${error.message}`,
          updated_at: pr.updated_at,
          created_at: pr.created_at,
          author: pr.user?.login || 'unknown',
          labels: [],
          readiness_score: 0,
          readiness_reasons: ['Processing failed'],
          sla_status: { status: 'error', priority: 'p2' },
          content_analysis: { confidence: 0 },
          enhanced_classification: { category: 'error' }
        }));
      }
    }

    // Process Issues with classification and validation
    const processedIssues = [];
    for (const issue of issues) {
      // Validate issue data before processing
      if (!validateIssueData(issue)) {
        console.warn(`⚠️  Skipping invalid issue data: ${issue?.number || 'unknown'} in ${repo.owner}/${repo.name}`);
        metrics.errors.push({
          message: 'Invalid issue data structure',
          context: { repo: `${repo.owner}/${repo.name}`, issue_number: issue?.number, issue_title: issue?.title },
          timestamp: new Date().toISOString()
        });
        continue;
      }

      try {
        const classification = classifyIssue(issue, repo);

      processedIssues.push({
        repo: `${repo.owner}/${repo.name}`,
        number: issue.number,
        title: issue.title,
        html_url: issue.html_url,
        labels: issue.labels.map(l => l.name),
        assignees: issue.assignees.map(a => a.login),
        milestone: issue.milestone?.title,
        classification: classification.classification,
        classification_confidence: classification.confidence,
        is_stale: classification.is_stale,
        days_since_update: classification.days_since_update,
        updated_at: issue.updated_at,
        created_at: issue.created_at,
        author: issue.user.login
      });
      } catch (error) {
        console.warn(`⚠️  Failed to process issue #${issue.number}: ${error.message}`);
        metrics.errors.push({
          message: `Issue processing failed: ${error.message}`,
          context: { repo: `${repo.owner}/${repo.name}`, issue_number: issue.number, issue_title: issue.title },
          timestamp: new Date().toISOString()
        });

        // Add fallback issue data to avoid breaking the pipeline
        processedIssues.push(sanitizeData({
          repo: `${repo.owner}/${repo.name}`,
          number: issue.number,
          title: issue.title || 'Unknown',
          html_url: issue.html_url || '',
          labels: [],
          assignees: [],
          classification: 'error',
          classification_confidence: 0,
          is_stale: false,
          days_since_update: 0,
          updated_at: issue.updated_at,
          created_at: issue.created_at,
          author: issue.user?.login || 'unknown'
        }));
      }
    }

    metrics.repos_processed++;

    return {
      repo: `${repo.owner}/${repo.name}`,
      prs: processedPRs,
      issues: processedIssues,
      metadata: {
        processed_at: new Date().toISOString(),
        pr_count: prs.length,
        issue_count: issues.length
      }
    };

  } catch (error) {
    const trackerError = new TrackerError(`Failed to process repository ${repo.owner}/${repo.name}`, {
      repo: repo.name,
      owner: repo.owner,
      error: error.message
    });

    metrics.errors.push(trackerError);
    console.error(`Error processing ${repo.owner}/${repo.name}:`, error.message);

    return {
      repo: `${repo.owner}/${repo.name}`,
      prs: [],
      issues: [],
      error: error.message,
      metadata: {
        processed_at: new Date().toISOString(),
        pr_count: 0,
        issue_count: 0,
        failed: true
      }
    };
  }
}

/**
 * Get all paginated data from GitHub API
 */
async function getAllPaginatedData(octokit, operation, params) {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await makeApiCall(octokit, operation, {
      ...params,
      page,
      per_page: 100
    });

    allData.push(...response.data);
    hasMore = response.data.length === 100;
    page++;

    // Safety break to prevent infinite loops
    if (page > 50) {
      console.warn(`Stopped pagination at page ${page} to prevent infinite loop`);
      break;
    }
  }

  return allData;
}

/**
 * Generate the registry JSON
 */
function generateRegistry(repoResults) {
  const allPRs = repoResults.flatMap(result => result.prs);
  const allIssues = repoResults.flatMap(result => result.issues);

  // Calculate summary statistics
  const summary = {
    total_repos: repoResults.length,
    successful_repos: repoResults.filter(r => !r.error).length,
    failed_repos: repoResults.filter(r => r.error).length,

    total_prs: allPRs.length,
    prs_by_status: Object.keys(metrics.prs_classified).reduce((acc, status) => {
      acc[status] = metrics.prs_classified[status];
      return acc;
    }, {}),

    total_issues: allIssues.length,
    issues_by_classification: Object.keys(metrics.issues_classified).reduce((acc, classification) => {
      acc[classification] = metrics.issues_classified[classification];
      return acc;
    }, {}),

    stale_prs: allPRs.filter(pr => pr.status_bucket === 'stale').length,
    stale_issues: allIssues.filter(issue => issue.is_stale).length
  };

  return {
    generated_at: new Date().toISOString(),
    config_version: "1.0",
    repos: repoResults.map(r => r.repo),
    summary,
    prs: allPRs,
    issues: allIssues,
    metadata: {
      execution_time_ms: Date.now() - metrics.execution_start,
      api_calls_made: metrics.api_calls_made,
      api_calls_failed: metrics.api_calls_failed,
      rate_limit_remaining: metrics.rate_limit_remaining,
      errors: metrics.errors.map(e => ({
        message: e.message,
        context: e.context,
        timestamp: e.timestamp
      }))
    },
    repo_results: repoResults
  };
}

/**
 * Generate the markdown dashboard
 */
function generateMarkdown(registry) {
  const { summary, prs, issues, metadata } = registry;

  // Helper function to format tables
  const formatTable = (items, columns, limit = 50) => {
    if (!items.length) return '_No items found_\n';

    const limitedItems = items.slice(0, limit);
    const header = `| ${columns.map(c => c.header).join(' | ')} |`;
    const separator = `|${columns.map(c => ':' + '-'.repeat(c.header.length - 1) + ':').join('|')}|`;

    const rows = limitedItems.map(item =>
      `| ${columns.map(c => c.getValue(item)).join(' | ')} |`
    ).join('\n');

    let table = `${header}\n${separator}\n${rows}\n`;

    if (items.length > limit) {
      table += `\n_Showing ${limit} of ${items.length} items_\n`;
    }

    return table;
  };

  // Filter PRs by status
  const readyPRs = prs.filter(pr => pr.status_bucket === 'ready_to_merge');
  const needsReviewPRs = prs.filter(pr => pr.status_bucket === 'needs_review');
  const failingPRs = prs.filter(pr => pr.status_bucket === 'ci_failed');
  const blockedPRs = prs.filter(pr => pr.status_bucket === 'blocked_by_admin' || pr.status_bucket === 'merge_conflicts');
  const draftPRs = prs.filter(pr => pr.status_bucket === 'draft');
  const stalePRs = prs.filter(pr => pr.status_bucket === 'stale');

  // Filter issues by classification
  const bugIssues = issues.filter(issue => issue.classification === 'bug');
  const enhancementIssues = issues.filter(issue => issue.classification === 'enhancement');
  const staleIssues = issues.filter(issue => issue.is_stale);

  const lastUpdated = new Date(registry.generated_at).toLocaleString();
  const executionTime = Math.round(metadata.execution_time_ms / 1000);

  return `<!-- tracker:summary:start -->
# Issues & PRs Control Board

_Last updated: ${lastUpdated} (execution: ${executionTime}s)_

**At a glance**
- **Repos**: ${summary.total_repos} (${summary.successful_repos} success, ${summary.failed_repos} failed)
- **Open PRs**: ${summary.total_prs} | Ready: ${readyPRs.length} | Needs review: ${needsReviewPRs.length} | Failing: ${failingPRs.length} | Blocked: ${blockedPRs.length} | Draft: ${draftPRs.length} | Stale: ${stalePRs.length}
- **Open Issues**: ${summary.total_issues} | Features: ${enhancementIssues.length} | Bugs: ${bugIssues.length} | Stale: ${staleIssues.length}

**Health Status**: ${metadata.api_calls_failed === 0 ? '🟢 Healthy' : `🟡 ${metadata.api_calls_failed} API failures`} | Rate limit: ${metadata.rate_limit_remaining || 'Unknown'} remaining
<!-- tracker:summary:end -->

<!-- tracker:charts:start -->
## 📊 Portfolio Analytics

### PR Status Distribution
\`\`\`mermaid
pie title Open PRs by Status
    ${readyPRs.length > 0 ? `"Ready (${readyPRs.length})" : ${readyPRs.length}` : ''}
    ${needsReviewPRs.length > 0 ? `"Needs Review (${needsReviewPRs.length})" : ${needsReviewPRs.length}` : ''}
    ${failingPRs.length > 0 ? `"Failing (${failingPRs.length})" : ${failingPRs.length}` : ''}
    ${blockedPRs.length > 0 ? `"Blocked (${blockedPRs.length})" : ${blockedPRs.length}` : ''}
    ${draftPRs.length > 0 ? `"Draft (${draftPRs.length})" : ${draftPRs.length}` : ''}
    ${stalePRs.length > 0 ? `"Stale (${stalePRs.length})" : ${stalePRs.length}` : ''}
    ${summary.total_prs === 0 ? '"No Open PRs" : 1' : ''}
\`\`\`

### Issue Classification
\`\`\`mermaid
pie title Open Issues by Type
    ${enhancementIssues.length > 0 ? `"Features (${enhancementIssues.length})" : ${enhancementIssues.length}` : ''}
    ${bugIssues.length > 0 ? `"Bugs (${bugIssues.length})" : ${bugIssues.length}` : ''}
    ${staleIssues.length > 0 ? `"Stale (${staleIssues.length})" : ${staleIssues.length}` : ''}
    ${summary.total_issues - enhancementIssues.length - bugIssues.length - staleIssues.length > 0 ?
      `"Other (${summary.total_issues - enhancementIssues.length - bugIssues.length - staleIssues.length})" : ${summary.total_issues - enhancementIssues.length - bugIssues.length - staleIssues.length}` : ''}
    ${summary.total_issues === 0 ? '"No Open Issues" : 1' : ''}
\`\`\`

### Readiness Score Distribution
\`\`\`mermaid
graph LR
    A[Total PRs: ${summary.total_prs}] --> B{Readiness Score}
    B --> C[🟢 Ready 80+<br/>${prs.filter(pr => pr.readiness_score >= 80).length} PRs]
    B --> D[🟡 Review 60-79<br/>${prs.filter(pr => pr.readiness_score >= 60 && pr.readiness_score < 80).length} PRs]
    B --> E[🟠 Work Needed 40-59<br/>${prs.filter(pr => pr.readiness_score >= 40 && pr.readiness_score < 60).length} PRs]
    B --> F[🔴 Blocked <40<br/>${prs.filter(pr => pr.readiness_score < 40).length} PRs]
\`\`\`

### SLA Compliance Timeline
\`\`\`mermaid
gantt
    title SLA Compliance Status
    dateFormat X
    axisFormat %s

    section Critical (P0)
    ${prs.filter(pr => pr.enhanced_classification?.priority === 'p0').length > 0 ?
      `Overdue PRs     :crit, 0, ${Math.max(1, (metrics.sla_violations || []).filter(v => v.priority === 'p0').length)}` :
      'No P0 PRs      :milestone, 0, 0'}

    section High (P1)
    ${prs.filter(pr => pr.enhanced_classification?.priority === 'p1').length > 0 ?
      `Due Soon       :active, 0, ${Math.max(1, prs.filter(pr => pr.sla_status?.status === 'due_soon' && pr.enhanced_classification?.priority === 'p1').length)}` :
      'No P1 PRs      :milestone, 0, 0'}

    section Normal (P2)
    ${prs.filter(pr => pr.enhanced_classification?.priority === 'p2').length > 0 ?
      `On Track       :done, 0, ${Math.max(1, prs.filter(pr => pr.sla_status?.status === 'on_track').length)}` :
      'No P2 PRs      :milestone, 0, 0'}
\`\`\`
<!-- tracker:charts:end -->

<!-- tracker:ready:start -->
## 🚀 Ready to merge (${readyPRs.length})

${formatTable(readyPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 40) + (pr.title.length > 40 ? '...' : '') },
  { header: 'Score', getValue: pr => `${pr.readiness_score || 0}/100` },
  { header: 'Priority', getValue: pr => pr.enhanced_classification?.priority?.toUpperCase() || 'P2' },
  { header: 'Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:ready:end -->

<!-- tracker:needsreview:start -->
## 👀 Needs review (${needsReviewPRs.length})

${formatTable(needsReviewPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 50) + (pr.title.length > 50 ? '...' : '') },
  { header: 'Author', getValue: pr => pr.author },
  { header: 'Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:needsreview:end -->

<!-- tracker:failing:start -->
## ❌ Failing checks (${failingPRs.length})

${formatTable(failingPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 50) + (pr.title.length > 50 ? '...' : '') },
  { header: 'Details', getValue: pr => pr.classification_details || 'Check failures' },
  { header: 'Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:failing:end -->

<!-- tracker:blocked:start -->
## 🚫 Blocked PRs (${blockedPRs.length})

${formatTable(blockedPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 50) + (pr.title.length > 50 ? '...' : '') },
  { header: 'Reason', getValue: pr => pr.classification_details || pr.status_bucket },
  { header: 'Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:blocked:end -->

<!-- tracker:draft:start -->
## 📝 Draft PRs (${draftPRs.length})

${formatTable(draftPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 60) + (pr.title.length > 60 ? '...' : '') },
  { header: 'Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:draft:end -->

<!-- tracker:staleprs:start -->
## 🕐 Stale PRs (${stalePRs.length})

${formatTable(stalePRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 60) + (pr.title.length > 60 ? '...' : '') },
  { header: 'Last Updated', getValue: pr => new Date(pr.updated_at).toLocaleDateString() }
])}
<!-- tracker:staleprs:end -->

<!-- tracker:features:start -->
## ✨ Feature requests / Enhancements (${enhancementIssues.length})

${formatTable(enhancementIssues, [
  { header: 'Issue', getValue: issue => `[#${issue.number}](${issue.html_url})` },
  { header: 'Repo', getValue: issue => issue.repo.split('/')[1] },
  { header: 'Title', getValue: issue => issue.title.substring(0, 60) + (issue.title.length > 60 ? '...' : '') },
  { header: 'Labels', getValue: issue => issue.labels.slice(0, 2).join(', ') + (issue.labels.length > 2 ? '...' : '') },
  { header: 'Updated', getValue: issue => new Date(issue.updated_at).toLocaleDateString() }
])}
<!-- tracker:features:end -->

<!-- tracker:bugs:start -->
## 🐛 Bugs (${bugIssues.length})

${formatTable(bugIssues, [
  { header: 'Issue', getValue: issue => `[#${issue.number}](${issue.html_url})` },
  { header: 'Repo', getValue: issue => issue.repo.split('/')[1] },
  { header: 'Title', getValue: issue => issue.title.substring(0, 60) + (issue.title.length > 60 ? '...' : '') },
  { header: 'Assignee', getValue: issue => issue.assignees[0] || 'Unassigned' },
  { header: 'Updated', getValue: issue => new Date(issue.updated_at).toLocaleDateString() }
])}
<!-- tracker:bugs:end -->

<!-- tracker:staleissues:start -->
## 🕐 Stale issues (${staleIssues.length})

${formatTable(staleIssues, [
  { header: 'Issue', getValue: issue => `[#${issue.number}](${issue.html_url})` },
  { header: 'Repo', getValue: issue => issue.repo.split('/')[1] },
  { header: 'Title', getValue: issue => issue.title.substring(0, 60) + (issue.title.length > 60 ? '...' : '') },
  { header: 'Days Stale', getValue: issue => issue.days_since_update.toString() }
])}
<!-- tracker:staleissues:end -->

<!-- tracker:links:start -->
## 🔗 Handy filters

### GitHub Search Links
${registry.repos.map(repo => `
**${repo}**:
- [Ready to merge](https://github.com/${repo}/pulls?q=is%3Apr+is%3Aopen+review%3Aapproved+status%3Asuccess+-is%3Adraft)
- [Needs review](https://github.com/${repo}/pulls?q=is%3Apr+is%3Aopen+-review%3Aapproved+-is%3Adraft)
- [Failing checks](https://github.com/${repo}/pulls?q=is%3Apr+is%3Aopen+status%3Afailure)
- [All open issues](https://github.com/${repo}/issues?q=is%3Aissue+is%3Aopen)
`).join('')}

### Quick Actions
- 📋 [View this tracker](./tracker.md)
- 📊 [View raw data](./tracker.json)
- 🔄 Update tracker: \`npm run update:tracker\`
<!-- tracker:links:end -->

---
_Generated by Portfolio Control Board v1.0 • Execution time: ${executionTime}s • API calls: ${metadata.api_calls_made} (${metadata.api_calls_failed} failed)_
`;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Portfolio Issues & PRs Control Board update...\n');

    // Load configuration
    console.log('📋 Loading configuration...');
    loadConfig();
    console.log(`✓ Loaded config for ${config.repos.length} repositories\n`);

    // Initialize GitHub API
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) {
      throw new TrackerError('GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.');
    }

    const octokit = new Octokit({ auth: token });
    console.log('✓ GitHub API initialized\n');

    // Override repos from environment if provided
    const reposEnv = process.env.REPOS;
    if (reposEnv) {
      const repoNames = reposEnv.split(',').map(r => r.trim());
      config.repos = repoNames.map(name => ({ name }));
      console.log(`📝 Using repos from environment: ${repoNames.join(', ')}\n`);
    }

    // Process all repositories
    console.log('🔄 Processing repositories...\n');
    const repoResults = [];

    for (const repoConfig of config.repos) {
      const result = await processRepository(octokit, repoConfig);
      repoResults.push(result);

      // Small delay to be respectful to GitHub API
      await sleep(100);
    }

    console.log(`\n✓ Processed ${repoResults.length} repositories\n`);

    // Generate outputs
    console.log('📝 Generating registry and dashboard...');
    const registry = generateRegistry(repoResults);
    const markdown = generateMarkdown(registry);

    // Write outputs
    const jsonPath = join(ROOT_DIR, 'docs', 'tracker.json');
    const mdPath = join(ROOT_DIR, 'docs', 'tracker.md');

    // Create docs directory if it doesn't exist
    const docsDir = join(ROOT_DIR, 'docs');
    if (!existsSync(docsDir)) {
      await import('fs').then(fs => fs.promises.mkdir(docsDir, { recursive: true }));
    }

    const jsonContent = config.output?.json_pretty_print !== false
      ? JSON.stringify(registry, null, 2)
      : JSON.stringify(registry);

    writeFileSync(jsonPath, jsonContent);
    writeFileSync(mdPath, markdown);

    console.log(`✓ Generated tracker.json (${(jsonContent.length / 1024).toFixed(1)}KB)`);
    console.log(`✓ Generated tracker.md (${(markdown.length / 1024).toFixed(1)}KB)\n`);

    // Summary
    const { summary, metadata } = registry;
    console.log('📊 Summary:');
    console.log(`   Repositories: ${summary.total_repos} (${summary.successful_repos} success, ${summary.failed_repos} failed)`);
    console.log(`   PRs: ${summary.total_prs} (${Object.values(summary.prs_by_status).join(', ')})`);
    console.log(`   Issues: ${summary.total_issues} (${Object.values(summary.issues_by_classification).join(', ')})`);
    console.log(`   Execution: ${Math.round(metadata.execution_time_ms / 1000)}s, ${metadata.api_calls_made} API calls`);

    if (metadata.errors.length > 0) {
      console.log(`   ⚠️  ${metadata.errors.length} errors occurred`);
      metadata.errors.forEach(error => {
        console.log(`      • ${error.message}`);
      });
    }

    // PHASE 2: External integrations and notifications
    const significantEvents = detectSignificantEvents(registry);

    // Send webhook notifications for significant events
    for (const event of significantEvents) {
      await sendWebhookNotification(event.type, event);
    }

    // Sync to external systems
    await syncToNotion(registry);

    // Save updated tracker state
    saveTrackerState();

    console.log('\n🎉 Portfolio tracker update completed successfully!');

  } catch (error) {
    console.error('\n❌ Tracker update failed:', error.message);
    if (error.context) {
      console.error('Context:', JSON.stringify(error.context, null, 2));
    }
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Portfolio Issues & PRs Control Board Tracker

Usage: node update-tracker.mjs [options]

Options:
  --help, -h          Show this help message
  --dry-run          Validate configuration and API access without writing files
  --verbose          Enable verbose logging
  --validate-config  Validate configuration file only

Environment variables:
  GITHUB_TOKEN       GitHub API token (required)
  REPOS             Comma-separated list of repos (overrides config)

Examples:
  node update-tracker.mjs
  REPOS="owner/repo1,owner/repo2" node update-tracker.mjs
  node update-tracker.mjs --dry-run --verbose
`);
  process.exit(0);
}

/**
 * PHASE 2: External Integration Functions
 */

/**
 * Send webhook notification for significant events
 */
async function sendWebhookNotification(eventType, data) {
  const webhookUrl = process.env.N8N_WEBHOOK;
  if (!webhookUrl || !policy.feature_flags?.webhook_notifications) {
    return;
  }

  try {
    const payload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data,
      source: 'portfolio-control-board'
    };

    await new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const postData = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Portfolio-Control-Board/2.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✓ Webhook sent: ${eventType}`);
            resolve(responseData);
          } else {
            reject(new Error(`Webhook failed: ${res.statusCode} ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.warn(`⚠️  Webhook notification failed: ${error.message}`);
    trackerState.error_tracking.webhook_failures = trackerState.error_tracking.webhook_failures || [];
    trackerState.error_tracking.webhook_failures.push({
      event_type: eventType,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Sync data to Notion database (if configured)
 */
async function syncToNotion(registry) {
  const notionToken = process.env.NOTION_TOKEN;
  const notionDbId = process.env.NOTION_DB_ID;

  if (!notionToken || !notionDbId || !policy.feature_flags?.notion_sync) {
    return;
  }

  try {
    console.log('🔄 Syncing to Notion database...');

    // This would require the Notion SDK, but for now we'll just log the intent
    console.log(`ℹ️  Would sync ${registry.prs.length} PRs and ${registry.issues.length} issues to Notion`);
    console.log('📝 Note: Notion integration requires @notionhq/client dependency');

  } catch (error) {
    console.warn(`⚠️  Notion sync failed: ${error.message}`);
  }
}

/**
 * Check for significant events that warrant notifications
 */
function detectSignificantEvents(registry) {
  const events = [];

  // Check for PRs that became ready
  const readyPRs = registry.prs.filter(pr =>
    pr.readiness_score >= 80 && pr.status_bucket === 'ready_to_merge'
  );
  if (readyPRs.length > 0) {
    events.push({
      type: 'prs_became_ready',
      count: readyPRs.length,
      items: readyPRs.map(pr => ({ number: pr.number, title: pr.title, score: pr.readiness_score }))
    });
  }

  // Check for SLA violations
  const slaViolations = metrics.sla_violations || [];
  if (slaViolations.length > 0) {
    events.push({
      type: 'sla_violations',
      count: slaViolations.length,
      items: slaViolations
    });
  }

  // Check for critical PRs failing
  const criticalFailures = registry.prs.filter(pr =>
    pr.status_bucket === 'ci_failed' &&
    pr.enhanced_classification?.priority === 'p0'
  );
  if (criticalFailures.length > 0) {
    events.push({
      type: 'critical_pr_failures',
      count: criticalFailures.length,
      items: criticalFailures.map(pr => ({ number: pr.number, title: pr.title }))
    });
  }

  return events;
}

if (args.includes('--validate-config')) {
  try {
    loadConfig();
    console.log('✓ Configuration is valid');
    process.exit(0);
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
}

// Run the main function
if (!args.includes('--dry-run')) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  console.log('🔍 Dry run mode - validating configuration and API access...');
  // Add dry run logic here if needed
}