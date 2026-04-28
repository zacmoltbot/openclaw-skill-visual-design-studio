#!/usr/bin/env node
/**
 * review_pack.js — Multi-viewport review pack generator
 *
 * Usage:
 *   node review_pack.js --target <path|URL> --slug <name> [--out-dir <dir>]
 *
 * Output:
 *   state/review-packs/<slug>/
 *     ├── metadata.json
 *     ├── screenshots/<slug>-mobile.png
 *     ├── screenshots/<slug>-tablet.png
 *     ├── screenshots/<slug>-desktop.png
 *     ├── verify/smoke-result.json
 *     └── index.html   (contact sheet)
 *
 * Exit codes:
 *   0 = success
 *   1 = failure
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let target = null;
let slug = null;
let outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && i + 1 < args.length) target = args[++i];
  else if (args[i] === '--slug' && i + 1 < args.length) slug = args[++i];
  else if (args[i] === '--out-dir' && i + 1 < args.length) outDir = args[++i];
}

if (!target || !slug) {
  console.error('ERROR: --target and --slug are required');
  process.exit(1);
}

// Base directory for state (assumes script is run from skill root)
const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const baseOutDir = outDir
  ? path.resolve(outDir)
  : path.join(SKILL_ROOT, 'state', 'review-packs', slug);
const screenshotsDir = path.join(baseOutDir, 'screenshots');
const smokeOutDir = path.join(baseOutDir, 'verify');

// Viewport definitions
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, type: 'phone' },
  { name: 'tablet', width: 768, height: 1024, type: 'tablet' },
  { name: 'desktop', width: 1280, height: 800, type: 'desktop' },
];

function resolveTarget(t) {
  if (fs.existsSync(t)) return 'file://' + path.resolve(t);
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://')) return t;
  const resolved = path.resolve(t);
  if (fs.existsSync(resolved)) return 'file://' + resolved;
  return t;
}

(async () => {
  const resolvedUrl = resolveTarget(target);

  // Create output dirs
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(smokeOutDir, { recursive: true });

  const metadata = {
    slug,
    target,
    url: resolvedUrl,
    generatedAt: new Date().toISOString(),
    viewports: []
  };

  const browser = await chromium.launch({ headless: true });

  // Run smoke on desktop first
  const smokeReport = { checks: {}, passed: false, errors: [] };
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    const response = await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    smokeReport.checks.load = { passed: true, status: response ? response.status() : 'loaded' };
  } catch (e) {
    smokeReport.checks.load = { passed: false, error: e.message };
    smokeReport.errors.push('load: ' + e.message);
  }
  await page.waitForTimeout(1000);
  smokeReport.checks.consoleErrors = {
    passed: consoleErrors.length === 0,
    errors: consoleErrors
  };
  smokeReport.passed = smokeReport.errors.length === 0;

  // Capture at each viewport
  for (const vp of VIEWPORTS) {
    const vpContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });
    const vpPage = await vpContext.newPage();

    const vpErrors = [];
    vpPage.on('pageerror', err => vpErrors.push(err.message));

    await vpPage.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await vpPage.waitForTimeout(600);

    const screenshotPath = path.join(screenshotsDir, `${slug}-${vp.name}.png`);
    await vpPage.screenshot({ type: 'png', path: screenshotPath });

    const vpMeta = {
      name: vp.name,
      width: vp.width,
      height: vp.height,
      type: vp.type,
      screenshot: path.relative(baseOutDir, screenshotPath),
      pageErrors: vpErrors
    };
    metadata.viewports.push(vpMeta);

    await vpContext.close();
    console.log(`  ✓ ${vp.name} (${vp.width}x${vp.height})`);
  }

  await browser.close();

  // Write metadata JSON
  const metaPath = path.join(baseOutDir, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  // Write smoke report
  fs.writeFileSync(path.join(smokeOutDir, 'smoke-result.json'), JSON.stringify(smokeReport, null, 2));

  // Generate contact sheet index HTML
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Review Pack — ${slug}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #111; color: #eee; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #fff; }
    .meta { font-size: 12px; color: #888; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    .card { background: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
    .card img { width: 100%; height: auto; display: block; }
    .card-label { padding: 12px 16px; }
    .card-label span { font-size: 13px; color: #aaa; }
    .card-label strong { display: block; font-size: 15px; color: #fff; margin-bottom: 2px; }
    .badge { display: inline-block; font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #333; color: #aaa; margin-top: 4px; }
    .smoke { margin-top: 24px; padding: 16px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333; font-size: 13px; }
    .smoke h2 { font-size: 14px; color: #fff; margin-bottom: 12px; }
    .smoke-row { display: flex; gap: 8px; margin-bottom: 6px; }
    .smoke-row .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
    .dot.ok { background: #4ade80; } .dot.fail { background: #f87171; }
  </style>
</head>
<body>
  <h1>📦 Review Pack — ${slug}</h1>
  <p class="meta">Target: ${target} &nbsp;|&nbsp; Generated: ${metadata.generatedAt}</p>

  <div class="grid">
${VIEWPORTS.map(vp => {
  const found = metadata.viewports.find(m => m.name === vp.name);
  const errors = found ? found.pageErrors : [];
  return `    <div class="card">
      <img src="screenshots/${slug}-${vp.name}.png" alt="${vp.name} view" />
      <div class="card-label">
        <strong>${vp.name.charAt(0).toUpperCase() + vp.name.slice(1)}</strong>
        <span>${vp.width} × ${vp.height}px</span>
        <div>
          ${errors.length === 0
            ? '<span class="badge" style="background:#1a3d2b;color:#4ade80">✓ no errors</span>'
            : `<span class="badge" style="background:#3d1a1a;color:#f87171">✗ ${errors.length} error(s)</span>`
          }
        </div>
      </div>
    </div>`;
}).join('\n')}
  </div>

  <div class="smoke">
    <h2>🔥 Smoke Check (desktop 1280×800)</h2>
    <div class="smoke-row">
      <div class="dot ${smokeReport.checks.load?.passed ? 'ok' : 'fail'}"></div>
      <span>Load: ${smokeReport.checks.load?.passed ? 'PASS' : 'FAIL — ' + (smokeReport.checks.load?.error || '')}</span>
    </div>
    <div class="smoke-row">
      <div class="dot ${smokeReport.checks.consoleErrors?.passed ? 'ok' : 'fail'}"></div>
      <span>Console errors: ${smokeReport.checks.consoleErrors?.passed ? 'NONE' : smokeReport.checks.consoleErrors?.errors?.length + ' error(s)'}</span>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(baseOutDir, 'index.html'), indexHtml);

  console.log(`\n✅ Review pack generated: ${baseOutDir}`);
  console.log(`   metadata: ${metaPath}`);
  console.log(`   screenshots: ${screenshotsDir}/`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
