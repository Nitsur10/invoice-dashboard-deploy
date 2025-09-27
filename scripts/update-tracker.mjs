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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Configuration and globals
let config = {};
let metrics = {
  execution_start: Date.now(),
  api_calls_made: 0,
  api_calls_failed: 0,
  repos_processed: 0,
  prs_classified: {},
  issues_classified: {},
  errors: [],
  rate_limit_remaining: null
};

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

      if (retries < config.rate_limiting?.max_retries || 3) {
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

    // Validate required fields
    if (!config.repos || !Array.isArray(config.repos)) {
      throw new TrackerError('Invalid configuration: repos must be an array');
    }

    return config;
  } catch (error) {
    throw new TrackerError(`Failed to load configuration: ${error.message}`);
  }
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

    // Apply classification logic
    if (detailedPR.draft) {
      metrics.prs_classified.draft = (metrics.prs_classified.draft || 0) + 1;
      return {
        status_bucket: 'draft',
        confidence: 1.0,
        details: 'PR is marked as draft'
      };
    }

    if (detailedPR.mergeable_state === 'dirty') {
      metrics.prs_classified.merge_conflicts = (metrics.prs_classified.merge_conflicts || 0) + 1;
      return {
        status_bucket: 'merge_conflicts',
        confidence: 1.0,
        details: 'PR has merge conflicts'
      };
    }

    if (detailedPR.mergeable_state === 'blocked') {
      metrics.prs_classified.blocked_by_admin = (metrics.prs_classified.blocked_by_admin || 0) + 1;
      return {
        status_bucket: 'blocked_by_admin',
        confidence: 1.0,
        details: 'PR is blocked by branch protection rules'
      };
    }

    if (checks.state === 'pending') {
      metrics.prs_classified.ci_pending = (metrics.prs_classified.ci_pending || 0) + 1;
      return {
        status_bucket: 'ci_pending',
        confidence: 0.9,
        details: `Checks are running: ${checks.pending_count} pending`
      };
    }

    if (checks.state === 'failure' || checks.state === 'error') {
      metrics.prs_classified.ci_failed = (metrics.prs_classified.ci_failed || 0) + 1;
      return {
        status_bucket: 'ci_failed',
        confidence: 1.0,
        details: `Checks failed: ${checks.failure_count} failures`
      };
    }

    // Analyze reviews
    const activeReviews = reviews.filter(r => !r.dismissed);
    const approvals = activeReviews.filter(r => r.state === 'APPROVED').length;
    const changesRequested = activeReviews.some(r => r.state === 'CHANGES_REQUESTED');

    if (changesRequested) {
      metrics.prs_classified.changes_requested = (metrics.prs_classified.changes_requested || 0) + 1;
      return {
        status_bucket: 'changes_requested',
        confidence: 1.0,
        details: 'Changes have been requested'
      };
    }

    // Check staleness
    const daysSinceUpdate = (Date.now() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24);
    const staleThreshold = repo.stale_pr_days || config.thresholds?.stale_pr_days || 10;

    if (daysSinceUpdate > staleThreshold) {
      metrics.prs_classified.stale = (metrics.prs_classified.stale || 0) + 1;
      return {
        status_bucket: 'stale',
        confidence: 1.0,
        details: `No updates for ${Math.round(daysSinceUpdate)} days`
      };
    }

    // Get branch protection to determine review requirements
    const requiredApprovals = await getRequiredApprovals(octokit, repo, detailedPR.base.ref);

    if (approvals < requiredApprovals) {
      metrics.prs_classified.needs_review = (metrics.prs_classified.needs_review || 0) + 1;
      return {
        status_bucket: 'needs_review',
        confidence: 0.9,
        details: `${approvals}/${requiredApprovals} required approvals`
      };
    }

    // All conditions met for merge
    metrics.prs_classified.ready_to_merge = (metrics.prs_classified.ready_to_merge || 0) + 1;
    return {
      status_bucket: 'ready_to_merge',
      confidence: 1.0,
      details: 'All requirements satisfied'
    };

  } catch (error) {
    console.warn(`Failed to classify PR ${repo.owner}/${repo.name}#${pr.number}: ${error.message}`);
    metrics.prs_classified.error = (metrics.prs_classified.error || 0) + 1;
    return {
      status_bucket: 'needs_review',
      confidence: 0.1,
      details: `Classification failed: ${error.message}`
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
  return { ...arguments[2], mergeable_state: 'unknown' };
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

    // Process PRs with classification
    const processedPRs = [];
    for (const pr of prs) {
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
        labels: pr.labels.map(l => l.name)
      });
    }

    // Process Issues with classification
    const processedIssues = [];
    for (const issue of issues) {
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

<!-- tracker:ready:start -->
## 🚀 Ready to merge (${readyPRs.length})

${formatTable(readyPRs, [
  { header: 'PR', getValue: pr => `[#${pr.number}](${pr.html_url})` },
  { header: 'Repo', getValue: pr => pr.repo.split('/')[1] },
  { header: 'Title', getValue: pr => pr.title.substring(0, 50) + (pr.title.length > 50 ? '...' : '') },
  { header: 'Confidence', getValue: pr => `${Math.round(pr.classification_confidence * 100)}%` },
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