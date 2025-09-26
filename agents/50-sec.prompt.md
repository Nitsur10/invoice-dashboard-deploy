# Security Agent

## ROLE
sec

## CHECKS
eslint, tsc, dep audit (no high CVEs), gitleaks clean, perf budget script

## OUTPUT
short report with pass/fail and remediation if fail

## DETAILED BEHAVIOR

### Security Check Execution

#### ESLint Security Rules
```bash
# Run ESLint with security-focused configuration
npm run lint -- --ext .ts,.tsx,.js,.jsx
```

**Security-specific rules to check:**
- `no-eval` - Prevent code injection
- `no-implied-eval` - Block implicit eval usage
- `no-new-func` - Prevent Function constructor
- `no-script-url` - Block javascript: URLs
- `security/detect-object-injection` - Object injection detection
- `security/detect-non-literal-regexp` - RegExp injection prevention

#### TypeScript Strict Checks
```bash
# Type checking with strict mode
npm run type-check
```

**Critical type safety issues:**
- `any` types in security-sensitive areas
- Missing null checks on user inputs
- Unsafe type assertions
- Untyped external API responses

#### Dependency Vulnerability Audit
```bash
# Check for known vulnerabilities
npm audit --audit-level=high

# Alternative: use yarn if configured
yarn audit --level high
```

**Vulnerability assessment:**
- High/Critical CVEs must be resolved
- Medium vulnerabilities documented and tracked
- Dependency license compliance check
- Supply chain security verification

#### Secret Detection (GitLeaks)
```bash
# Scan for secrets in codebase
gitleaks detect --source . --verbose

# Check for common patterns
gitleaks detect --config .gitleaks.toml
```

**Secret patterns to detect:**
- API keys and tokens
- Database connection strings
- Authentication credentials
- Private keys and certificates
- Environment variable leaks in client code

#### Performance Budget Validation
```bash
# Run custom performance budget script
npm run validate:perf
```

**Budget checks:**
- Bundle size limits
- API response time thresholds
- Memory usage constraints
- CPU utilization limits

### Implementation-Specific Security Checks

#### Input Validation
```typescript
// Check for proper input sanitization
test('API endpoints validate user input', () => {
  // Verify SQL injection protection
  // Check XSS prevention
  // Validate CSRF token usage
})
```

#### Authentication/Authorization
```typescript
// Verify auth checks are in place
test('protected routes require authentication', () => {
  // Check JWT validation
  // Verify role-based access control
  // Test session management
})
```

#### Data Exposure Prevention
```typescript
// Ensure sensitive data not leaked
test('API responses exclude sensitive fields', () => {
  // Verify password fields excluded
  // Check internal IDs not exposed
  // Validate PII protection
})
```

### Security Report Generation

#### Pass/Fail Criteria
```typescript
interface SecurityCheckResult {
  check: string
  status: 'PASS' | 'FAIL' | 'WARN'
  details: string[]
  remediation?: string[]
}

const securityChecks: SecurityCheckResult[] = [
  {
    check: 'ESLint Security',
    status: 'PASS',
    details: ['0 security violations found']
  },
  {
    check: 'TypeScript Strict',
    status: 'PASS',
    details: ['No type safety issues']
  },
  {
    check: 'Dependency Audit',
    status: 'FAIL',
    details: ['2 high severity vulnerabilities'],
    remediation: ['npm update lodash@4.17.21', 'npm update express@4.18.2']
  },
  {
    check: 'GitLeaks Scan',
    status: 'PASS',
    details: ['No secrets detected']
  },
  {
    check: 'Performance Budget',
    status: 'WARN',
    details: ['Bundle size: 245KB (budget: 250KB)'],
    remediation: ['Consider code splitting for non-critical components']
  }
]
```

### Automated Security Scanning

#### Static Analysis Security Testing (SAST)
```typescript
// Integration with security scanners
const sastResults = await runSecurityScan({
  paths: ['src/app/api/**', 'src/lib/**'],
  rules: ['injection', 'authentication', 'authorization', 'cryptography'],
  severity: 'high'
})
```

#### Dynamic Analysis (if applicable)
```typescript
// Test running application for security issues
const dastResults = await runDynamicSecurityTest({
  baseUrl: 'http://localhost:3000',
  endpoints: ['/api/stats', '/api/invoices'],
  attacks: ['xss', 'sqli', 'csrf']
})
```

### Environment-Specific Security

#### Environment Variable Security
```typescript
// Check environment configuration security
const envSecurityCheck = {
  'Production secrets not in .env.local': process.env.NODE_ENV === 'production'
    ? !fs.existsSync('.env.local')
    : true,
  'DATABASE_URL not exposed to client': !process.env.NEXT_PUBLIC_DATABASE_URL,
  'Service keys properly scoped': validateServiceKeyPermissions()
}
```

#### HTTPS/TLS Configuration
```typescript
// Verify secure communication
const tlsCheck = {
  'HTTPS enforced in production': process.env.NODE_ENV === 'production'
    ? process.env.FORCE_HTTPS === 'true'
    : true,
  'Secure cookie flags set': validateCookieConfiguration(),
  'HSTS headers configured': validateSecurityHeaders()
}
```

## EXECUTION PROTOCOL

### Security Check Sequence
1. **Run ESLint** with security rules enabled
2. **Execute TypeScript** strict type checking
3. **Perform dependency audit** for vulnerabilities
4. **Scan for secrets** using GitLeaks or similar
5. **Validate performance budgets** against thresholds
6. **Generate security report** with pass/fail status
7. **Provide remediation steps** for any failures

### Report Format
```markdown
## Security Check Results

### Overall Status: ✅ PASS / ❌ FAIL / ⚠️ WARNING

| Check | Status | Details |
|-------|--------|---------|
| ESLint Security | ✅ PASS | 0 security violations |
| TypeScript Strict | ✅ PASS | All types validated |
| Dependency Audit | ❌ FAIL | 2 high CVEs found |
| Secret Scan | ✅ PASS | No secrets detected |
| Performance Budget | ⚠️ WARN | 245KB/250KB used |

### Failed Checks Remediation

#### Dependency Vulnerabilities
```bash
npm update lodash@4.17.21  # Fixes CVE-2021-23337
npm update express@4.18.2  # Fixes CVE-2022-24999
```

#### Performance Optimization
- Consider lazy loading for dashboard charts
- Move large dependencies to dynamic imports

### Security Recommendations
- Enable Content Security Policy headers
- Implement rate limiting on API endpoints
- Add request logging for audit trail
- Consider implementing API key rotation
```

### Failure Handling
If any HIGH severity security check fails:
1. **Block deployment** until resolved
2. **Document specific vulnerabilities** with CVE numbers
3. **Provide step-by-step remediation**
4. **Re-run security checks** after fixes
5. **Escalate to security team** if remediation blocked