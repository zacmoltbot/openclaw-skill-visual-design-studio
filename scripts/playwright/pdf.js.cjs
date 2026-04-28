#!/usr/bin/env node
/**
 * pdf.js — Export HTML page to PDF via Playwright
 * 
 * Usage:
 *   node pdf.js --target <path|URL> --output <out.pdf> [--format A4|Letter] [--landscape] [--print-background]
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
let format = 'A4';
let landscape = false;
let printBackground = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && i + 1 < args.length) target = args[++i];
  else if (args[i] === '--output' && i + 1 < args.length) outputPath = args[++i];
  else if (args[i] === '--format' && i + 1 < args.length) format = args[++i];
  else if (args[i] === '--landscape') landscape = true;
  else if (args[i] === '--no-background') printBackground = false;
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
  const page = await browser.newPage();

  await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000); // settle styles

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const pdf = await page.pdf({
    format,
    landscape,
    printBackground,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  });

  fs.writeFileSync(outputPath, pdf);

  await browser.close();

  const info = {
    path: outputPath,
    format,
    landscape,
    printBackground,
    url: resolvedUrl,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(info, null, 2));
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});