#!/usr/bin/env node
/**
 * screenshot.js — Capture screenshot of an HTML file or URL
 * 
 * Usage:
 *   node screenshot.js --target <path|URL> --output <out.png> [--viewport-w <width>] [--viewport-h <height>] [--type png|jpeg] [--full-page]
 * 
 * Exit codes:
 *   0 = success
 *   1 = failure
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let target = null;
let outputPath = null;
let viewportW = 1280;
let viewportH = 800;
let type = 'png';
let fullPage = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && i + 1 < args.length) target = args[++i];
  else if (args[i] === '--output' && i + 1 < args.length) outputPath = args[++i];
  else if (args[i] === '--viewport-w' && i + 1 < args.length) viewportW = parseInt(args[++i]);
  else if (args[i] === '--viewport-h' && i + 1 < args.length) viewportH = parseInt(args[++i]);
  else if (args[i] === '--type' && i + 1 < args.length) type = args[++i];
  else if (args[i] === '--full-page') fullPage = true;
}

if (!target || !outputPath) {
  console.error('ERROR: --target and --output are required');
  process.exit(1);
}

function resolveTarget(t) {
  if (fs.existsSync(t)) return 'file://' + path.resolve(t);
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://')) return t;
  const resolved = path.resolve(t);
  if (fs.existsSync(resolved)) return 'file://' + resolved;
  return t;
}

const resolvedUrl = resolveTarget(target);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: viewportW, height: viewportH }
  });
  const page = await context.newPage();

  await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Allow fonts/CSS to settle
  await page.waitForTimeout(800);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const screenshot = await page.screenshot({
    type,
    fullPage,
    path: outputPath
  });

  await browser.close();

  const info = {
    path: outputPath,
    viewport: { width: viewportW, height: viewportH },
    type,
    fullPage,
    url: resolvedUrl,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});