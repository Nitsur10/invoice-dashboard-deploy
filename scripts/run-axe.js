#!/usr/bin/env node

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');

async function runAccessibilityTests() {
  let browser;
  let results = {
    summary: {
      timestamp: new Date().toISOString(),
      totalViolations: 0,
      totalPasses: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0
    },
    pages: []
  };

  try {
    console.log('🚀 Starting accessibility tests for Invoice Dashboard...');

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    // Test pages
    const testPages = [
      {
        name: 'Invoice Dashboard',
        url: 'http://localhost:3000',
        description: 'Main dashboard with invoice table and description column'
      }
    ];

    for (const testPage of testPages) {
      console.log(`\n📋 Testing: ${testPage.name}`);

      try {
        // Navigate to page
        await page.goto(testPage.url, { waitUntil: 'networkidle' });

        // Wait for table to load
        await page.waitForSelector('[data-testid="invoice-table"]', { timeout: 10000 }).catch(() => {
          console.log('⚠️  Invoice table not found, testing page as-is');
        });

        // Run Axe accessibility tests
        const axeBuilder = new AxeBuilder({ page });

        // Configure axe rules
        axeBuilder
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .options({
            rules: {
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'focus-order-semantics': { enabled: true },
              'aria-required-attr': { enabled: true },
              'aria-valid-attr-value': { enabled: true },
              'button-name': { enabled: true },
              'link-name': { enabled: true },
              'label': { enabled: true },
              'heading-order': { enabled: true }
            }
          });

        const accessibilityResult = await axeBuilder.analyze();

        // Process results
        const pageResult = {
          name: testPage.name,
          url: testPage.url,
          violations: accessibilityResult.violations,
          passes: accessibilityResult.passes,
          incomplete: accessibilityResult.incomplete,
          inapplicable: accessibilityResult.inapplicable,
          violationCount: accessibilityResult.violations.length,
          passCount: accessibilityResult.passes.length
        };

        // Count severity levels
        accessibilityResult.violations.forEach(violation => {
          switch (violation.impact) {
            case 'critical':
              results.summary.criticalIssues++;
              break;
            case 'serious':
              results.summary.seriousIssues++;
              break;
            case 'moderate':
              results.summary.moderateIssues++;
              break;
            case 'minor':
              results.summary.minorIssues++;
              break;
          }
        });

        results.summary.totalViolations += pageResult.violationCount;
        results.summary.totalPasses += pageResult.passCount;
        results.pages.push(pageResult);

        console.log(`✅ Completed: ${pageResult.violationCount} violations, ${pageResult.passCount} passes`);

        // Test specific description column functionality
        await testDescriptionColumn(page, results);

      } catch (error) {
        console.error(`❌ Error testing ${testPage.name}:`, error.message);
        results.pages.push({
          name: testPage.name,
          url: testPage.url,
          error: error.message,
          violations: [],
          passes: [],
          violationCount: 0,
          passCount: 0
        });
      }
    }

    // Generate report
    await generateReport(results);

    console.log('\n📊 Accessibility Test Summary:');
    console.log(`Total Violations: ${results.summary.totalViolations}`);
    console.log(`Total Passes: ${results.summary.totalPasses}`);
    console.log(`Critical Issues: ${results.summary.criticalIssues}`);
    console.log(`Serious Issues: ${results.summary.seriousIssues}`);
    console.log(`Moderate Issues: ${results.summary.moderateIssues}`);
    console.log(`Minor Issues: ${results.summary.minorIssues}`);

    // Exit with appropriate code
    const hasErrors = results.summary.criticalIssues > 0 || results.summary.seriousIssues > 0;
    process.exit(hasErrors ? 1 : 0);

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function testDescriptionColumn(page, results) {
  console.log('🔍 Testing description column accessibility...');

  try {
    // Test description cells
    const descriptionCells = await page.locator('[data-testid="description-cell"]').all();

    if (descriptionCells.length === 0) {
      console.log('⚠️  No description cells found');
      return;
    }

    console.log(`Found ${descriptionCells.length} description cells`);

    // Test keyboard navigation
    for (let i = 0; i < Math.min(descriptionCells.length, 5); i++) {
      const cell = descriptionCells[i];

      // Check if cell is focusable when it has a tooltip
      const tabIndex = await cell.getAttribute('tabindex');
      const hasTitle = await cell.getAttribute('title');

      if (hasTitle && tabIndex === '0') {
        // Test keyboard focus
        await cell.focus();
        const isFocused = await cell.evaluate(el => document.activeElement === el);

        if (!isFocused) {
          results.pages[results.pages.length - 1].customViolations = results.pages[results.pages.length - 1].customViolations || [];
          results.pages[results.pages.length - 1].customViolations.push({
            id: 'description-cell-focus',
            description: 'Description cell with tooltip is not properly focusable',
            impact: 'serious',
            help: 'Ensure description cells with tooltips can receive keyboard focus'
          });
        }
      }
    }

    // Test ARIA attributes
    for (const cell of descriptionCells.slice(0, 3)) {
      const ariaLabel = await cell.getAttribute('aria-label');
      const title = await cell.getAttribute('title');

      if (title && !ariaLabel) {
        results.pages[results.pages.length - 1].customViolations = results.pages[results.pages.length - 1].customViolations || [];
        results.pages[results.pages.length - 1].customViolations.push({
          id: 'description-cell-aria',
          description: 'Description cell with tooltip missing aria-label',
          impact: 'moderate',
          help: 'Add appropriate aria-label for screen reader accessibility'
        });
      }
    }

  } catch (error) {
    console.error('Error testing description column:', error.message);
  }
}

async function generateReport(results) {
  const reportDir = path.join(process.cwd(), 'test-results', 'accessibility');

  // Ensure directory exists
  fs.mkdirSync(reportDir, { recursive: true });

  // Generate JSON report
  const jsonReport = path.join(reportDir, 'accessibility-report.json');
  fs.writeFileSync(jsonReport, JSON.stringify(results, null, 2));

  // Generate HTML report
  const htmlReport = path.join(reportDir, 'accessibility-report.html');
  const htmlContent = generateHtmlReport(results);
  fs.writeFileSync(htmlReport, htmlContent);

  console.log(`\n📄 Reports generated:`);
  console.log(`JSON: ${jsonReport}`);
  console.log(`HTML: ${htmlReport}`);
}

function generateHtmlReport(results) {
  const { summary, pages } = results;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Test Report - Issue #8</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
        .critical { background-color: #fef2f2; border-color: #fecaca; }
        .serious { background-color: #fef3c7; border-color: #fde68a; }
        .moderate { background-color: #eff6ff; border-color: #bfdbfe; }
        .minor { background-color: #f0f9ff; border-color: #bae6fd; }
        .success { background-color: #f0fdf4; border-color: #bbf7d0; }
        .violation { margin: 20px 0; padding: 15px; border-left: 4px solid #ef4444; background-color: #fef2f2; }
        .pass { margin: 10px 0; padding: 10px; border-left: 4px solid #10b981; background-color: #f0fdf4; }
        .page-section { margin: 30px 0; }
        .violation-details { margin-top: 10px; font-size: 14px; color: #6b7280; }
        .impact-critical { color: #dc2626; font-weight: bold; }
        .impact-serious { color: #ea580c; font-weight: bold; }
        .impact-moderate { color: #2563eb; font-weight: bold; }
        .impact-minor { color: #0891b2; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Accessibility Test Report</h1>
        <p><strong>Issue #8:</strong> Description Column Implementation</p>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
    </div>

    <div class="summary">
        <div class="summary-card critical">
            <h3>Critical Issues</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.criticalIssues}</div>
        </div>
        <div class="summary-card serious">
            <h3>Serious Issues</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.seriousIssues}</div>
        </div>
        <div class="summary-card moderate">
            <h3>Moderate Issues</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.moderateIssues}</div>
        </div>
        <div class="summary-card minor">
            <h3>Minor Issues</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.minorIssues}</div>
        </div>
        <div class="summary-card success">
            <h3>Passes</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.totalPasses}</div>
        </div>
    </div>

    ${pages.map(page => `
        <div class="page-section">
            <h2>${page.name}</h2>
            <p><strong>URL:</strong> ${page.url}</p>

            ${page.error ? `<div class="violation"><strong>Error:</strong> ${page.error}</div>` : ''}

            ${page.violations && page.violations.length > 0 ? `
                <h3>Violations (${page.violations.length})</h3>
                ${page.violations.map(violation => `
                    <div class="violation">
                        <div><strong>${violation.id}:</strong> ${violation.description}</div>
                        <div class="impact-${violation.impact}">Impact: ${violation.impact}</div>
                        <div class="violation-details">${violation.help}</div>
                        ${violation.nodes ? `<div class="violation-details">Affected elements: ${violation.nodes.length}</div>` : ''}
                    </div>
                `).join('')}
            ` : ''}

            ${page.customViolations && page.customViolations.length > 0 ? `
                <h3>Custom Violations (${page.customViolations.length})</h3>
                ${page.customViolations.map(violation => `
                    <div class="violation">
                        <div><strong>${violation.id}:</strong> ${violation.description}</div>
                        <div class="impact-${violation.impact}">Impact: ${violation.impact}</div>
                        <div class="violation-details">${violation.help}</div>
                    </div>
                `).join('')}
            ` : ''}

            ${page.passes && page.passes.length > 0 ? `
                <h3>Passes (${page.passes.length})</h3>
                <details>
                    <summary>View passing tests</summary>
                    ${page.passes.slice(0, 10).map(pass => `
                        <div class="pass">
                            <strong>${pass.id}:</strong> ${pass.description}
                        </div>
                    `).join('')}
                    ${page.passes.length > 10 ? `<p>... and ${page.passes.length - 10} more</p>` : ''}
                </details>
            ` : ''}
        </div>
    `).join('')}

    <div class="page-section">
        <h2>Recommendations for Issue #8</h2>
        <ul>
            <li>Ensure all description cells with tooltips have proper keyboard focus management</li>
            <li>Add appropriate ARIA labels for screen reader compatibility</li>
            <li>Verify color contrast meets WCAG AA standards for truncated text</li>
            <li>Test responsive behavior across different screen sizes</li>
            <li>Validate tooltip positioning and accessibility</li>
        </ul>
    </div>
</body>
</html>
  `;
}

// Run the tests
runAccessibilityTests();