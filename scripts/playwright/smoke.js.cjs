#!/usr/bin/env node
/**
 * smoke.js — Playwright smoke test for HTML artifacts
 * 
 * Usage:
 *   node smoke.js --target <path|URL> [--output <report.json>] [--viewport-w <width>] [--viewport-h <height>]
 * 
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// CLI args
const args = process.argv.slice(2);
let target = null;
let outputPath = null;
let viewportW = 1280;
let viewportH = 800;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && i + 1 < args.length) target = args[++i];
  else if (args[i] === '--output' && i + 1 < args.length) outputPath = args[++i];
  else if (args[i] === '--viewport-w' && i + 1 < args.length) viewportW = parseInt(args[++i]);
  else if (args[i] === '--viewport-h' && i + 1 < args.length) viewportH = parseInt(args[++i]);
}

if (!target) {
  console.error('ERROR: --target is required');
  process.exit(1);
}

// Resolve file path for local files
function resolveTarget(t) {
  if (fs.existsSync(t)) return 'file://' + path.resolve(t);
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://')) return t;
  // try as relative path
  const resolved = path.resolve(t);
  if (fs.existsSync(resolved)) return 'file://' + resolved;
  return t;
}

const resolvedUrl = resolveTarget(target);
const report = {
  passed: false,
  target: target,
  url: resolvedUrl,
  checks: {},
  timestamp: new Date().toISOString(),
  errors: []
};

async function runSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewportW, height: viewportH }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // 1. Load check
  const loadStart = Date.now();
  try {
    const response = await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    report.checks.load = {
      passed: true,
      status: response ? response.status() : 'file-loaded',
      duration_ms: Date.now() - loadStart
    };
  } catch (e) {
    report.checks.load = { passed: false, error: e.message, duration_ms: Date.now() - loadStart };
    report.errors.push('load failed: ' + e.message);
  }

  // 2. Wait a bit for JS to run
  await page.waitForTimeout(1000);

  // 3. Console errors check
  report.checks.consoleErrors = {
    passed: consoleErrors.length === 0,
    errors: consoleErrors
  };
  if (consoleErrors.length > 0) {
    report.errors.push(...consoleErrors.map(e => 'console.error: ' + e));
  }

  // 4. Key element visible check (h1 or .hero or body)
  try {
    const visible = await page.locator('h1, .hero, main, [role="main"], body').first().isVisible({ timeout: 3000 });
    report.checks.elementVisible = { passed: visible, selector: 'h1/.hero/main/[role="main"]/body' };
  } catch (e) {
    // fallback: check body
    try {
      const bodyVisible = await page.locator('body').isVisible();
      report.checks.elementVisible = { passed: bodyVisible, selector: 'body (fallback)' };
    } catch (e2) {
      report.checks.elementVisible = { passed: false, selector: 'none found', error: e2.message };
      report.errors.push('no visible element found');
    }
  }

  await browser.close();

  // Determine overall pass
  report.passed = report.errors.length === 0;

  // Output
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${outputPath}`);
  }

  console.log(JSON.stringify(report, null, 2));

  process.exit(report.passed ? 0 : 1);
}

runSmoke().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});