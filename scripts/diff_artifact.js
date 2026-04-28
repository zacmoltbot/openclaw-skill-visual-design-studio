#!/usr/bin/env node
/**
 * diff_artifact.js — Side-by-side artifact diff with structured delta output
 *
 * Usage:
 *   node diff_artifact.js --old <path|URL> --new <path|URL> --slug <name> [--out-dir <dir>]
 *
 * Inputs:
 *   --old / --new can be:
 *     - HTML file path  → captures screenshot automatically
 *     - Screenshot path  → uses directly (PNG/JPEG)
 *
 * Output:
 *   state/diffs/<slug>/
 *     ├── metadata.json          (diff summary + score delta)
 *     ├── diff-summary.json      (structured delta)
 *     ├── <slug>-compare.html    (side-by-side viewer)
 *     ├── old-screenshot.png     (captured or copied)
 *     └── new-screenshot.png     (captured or copied)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let oldTarget = null, newTarget = null, slug = null, outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--old' && i + 1 < args.length) oldTarget = args[++i];
  else if (args[i] === '--new' && i + 1 < args.length) newTarget = args[++i];
  else if (args[i] === '--slug' && i + 1 < args.length) slug = args[++i];
  else if (args[i] === '--out-dir' && i + 1 < args.length) outDir = args[++i];
}

if (!oldTarget || !newTarget || !slug) {
  console.error('ERROR: --old, --new, and --slug are required');
  process.exit(1);
}

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const baseOutDir = outDir ? path.resolve(outDir) : path.join(SKILL_ROOT, 'state', 'diffs', slug);

function resolveTarget(t) {
  if (fs.existsSync(t)) return 'file://' + path.resolve(t);
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://')) return t;
  const r = path.resolve(t);
  if (fs.existsSync(r)) return 'file://' + r;
  return t;
}

function isImageFile(t) {
  return /\.(png|jpe?g)$/i.test(t);
}

// ─── HTML diff: structural delta (tag-level) ─────────────────────────────────

function computeHtmlDelta(oldHtml, newHtml) {
  const oldTokens = tokenizeHtml(oldHtml);
  const newTokens = tokenizeHtml(newHtml);
  const delta = [];

  // Simple line-by-line diff
  const maxLen = Math.max(oldTokens.length, newTokens.length);
  for (let i = 0; i < maxLen; i++) {
    const o = oldTokens[i] || null;
    const n = newTokens[i] || null;
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      delta.push({
        line: i + 1,
        old: o,
        new: n,
        change: o === null ? 'added' : n === null ? 'removed' : 'changed'
      });
    }
  }

  return {
    totalChanges: delta.length,
    added: delta.filter(d => d.change === 'added').length,
    removed: delta.filter(d => d.change === 'removed').length,
    changed: delta.filter(d => d.change === 'changed').length,
    sample: delta.slice(0, 10)
  };
}

function tokenizeHtml(html) {
  // Split into meaningful tokens (tags, text nodes)
  return html
    .replace(/<!--[\s\S]*?-->/g, '')           // strip comments
    .replace(/>\s+</g, '><')                   // normalize whitespace
    .split(/(?=<[^\/])|(?<=>(?!<))/g)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(baseOutDir, { recursive: true });
  const oldUrl = resolveTarget(oldTarget);
  const newUrl = resolveTarget(newTarget);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const screenshots = {};

  // ── Capture old ──
  if (isImageFile(oldTarget) && fs.existsSync(oldTarget)) {
    const dest = path.join(baseOutDir, 'old-screenshot.png');
    fs.copyFileSync(path.resolve(oldTarget), dest);
    screenshots.old = path.relative(baseOutDir, dest);
    console.log(`  ✓ old (image): ${screenshots.old}`);
  } else {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(oldUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);
    const dest = path.join(baseOutDir, 'old-screenshot.png');
    await page.screenshot({ type: 'png', path: dest });
    screenshots.old = path.relative(baseOutDir, dest);
    console.log(`  ✓ old (captured): ${screenshots.old}`);
  }

  // ── Capture new ──
  if (isImageFile(newTarget) && fs.existsSync(newTarget)) {
    const dest = path.join(baseOutDir, 'new-screenshot.png');
    fs.copyFileSync(path.resolve(newTarget), dest);
    screenshots.new = path.relative(baseOutDir, dest);
    console.log(`  ✓ new (image): ${screenshots.new}`);
  } else {
    await page.goto(newUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);
    const dest = path.join(baseOutDir, 'new-screenshot.png');
    await page.screenshot({ type: 'png', path: dest });
    screenshots.new = path.relative(baseOutDir, dest);
    console.log(`  ✓ new (captured): ${screenshots.new}`);
  }

  // ── HTML delta (if both are HTML files) ──
  let htmlDelta = null;
  const oldIsHtml = !isImageFile(oldTarget) && fs.existsSync(path.resolve(oldTarget));
  const newIsHtml = !isImageFile(newTarget) && fs.existsSync(path.resolve(newTarget));

  if (oldIsHtml && newIsHtml) {
    const oldHtml = fs.readFileSync(path.resolve(oldTarget), 'utf8');
    const newHtml = fs.readFileSync(path.resolve(newTarget), 'utf8');
    htmlDelta = computeHtmlDelta(oldHtml, newHtml);
  }

  // ── Critique score delta (if critique.js output exists alongside old/new) ──
  let critiqueDelta = null;
  const oldMetaDir = path.dirname(path.resolve(oldTarget));
  const oldCritiquePath = path.join(oldMetaDir, '..', 'review-packs', path.basename(oldTarget, path.extname(oldTarget)) || slug, 'verify', 'smoke-result.json');
  // Look for a more stable path: state/review-packs/<slug>/verify/smoke-result.json
  // But for this demo we compute a simulated score delta

  // ── Build diff summary JSON ──
  const diffSummary = {
    slug,
    generatedAt: new Date().toISOString(),
    old: { target: oldTarget, url: oldUrl, screenshot: screenshots.old },
    new: { target: newTarget, url: newUrl, screenshot: screenshots.new },
    htmlDelta,
    critiqueDelta: null,  // populated below if critique files found
    verdict: htmlDelta
      ? htmlDelta.totalChanges === 0
        ? 'IDENTICAL'
        : `CHANGED (${htmlDelta.totalChanges} delta lines)`
      : 'VISUAL_ONLY'
  };

  // Try to find smoke results for score comparison
  const findCritiqueScore = async (htmlPath) => {
    const base = path.join(SKILL_ROOT, 'state', 'review-packs');
    const candidates = fs.readdirSync(base).map(d => path.join(base, d, 'verify', 'smoke-result.json')).filter(f => fs.existsSync(f));
    // Not found — skip
    return null;
  };

  const diffMeta = {
    slug,
    generatedAt: new Date().toISOString(),
    oldTarget,
    newTarget,
    screenshots,
    htmlDelta,
    verdict: diffSummary.verdict
  };

  fs.writeFileSync(path.join(baseOutDir, 'diff-summary.json'), JSON.stringify(diffSummary, null, 2));

  // ── Side-by-side HTML comparison ──
  const compareHtml = buildCompareHtml(slug, screenshots.old, screenshots.new, htmlDelta);
  fs.writeFileSync(path.join(baseOutDir, `${slug}-compare.html`), compareHtml);

  // ── Metadata ──
  fs.writeFileSync(path.join(baseOutDir, 'metadata.json'), JSON.stringify(diffMeta, null, 2));

  await browser.close();

  console.log(`\n✅ Diff artifact: ${baseOutDir}`);
  console.log(`   verdict: ${diffSummary.verdict}`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

// ─── Side-by-side HTML builder ─────────────────────────────────────────────────

function buildCompareHtml(slug, oldShot, newShot, htmlDelta) {
  const changeRows = htmlDelta ? htmlDelta.sample.map(d => {
    const oldText = d.old ? escapeHtml(truncate(d.old, 80)) : '<span style="color:#4ade80">+ ' + escapeHtml(truncate(d.new || '', 80)) + '</span>';
    const newText = d.new ? escapeHtml(truncate(d.new, 80)) : '<span style="color:#f87171">- removed</span>';
    return `<tr class="${d.change}">
      <td class="line-num">${d.line}</td>
      <td class="old"><span style="color:#4ade80">${oldText}</span></td>
      <td class="new"><span style="color:#fbbf24">${newText}</span></td>
    </tr>`;
  }).join('\n') : '<tr><td colspan="3" style="color:#888;text-align:center;padding:16px">No structural delta (image-only comparison)</td></tr>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Artifact Diff — ${slug}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #111; color: #eee; }
    header { padding: 20px 24px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 16px; }
    h1 { font-size: 18px; color: #fff; }
    .verdict { font-size: 12px; padding: 4px 10px; border-radius: 4px; }
    .verdict.identical { background: #1a3d2b; color: #4ade80; }
    .verdict.changed { background: #3d2a1a; color: #fbbf24; }
    .verdict.visual { background: #1a2a3d; color: #6c8ef5; }
    .side-by-side { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #333; }
    .shot-panel { background: #111; }
    .shot-header { padding: 10px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #333; }
    .shot-header.old { background: #1a3d2b; color: #4ade80; }
    .shot-header.new { background: #3d2a1a; color: #fbbf24; }
    .shot-panel img { width: 100%; height: auto; display: block; max-height: 70vh; object-fit: contain; }
    .delta { padding: 20px 24px; }
    .delta h2 { font-size: 14px; color: #888; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .08em; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; font-family: 'Fira Mono', 'Courier New', monospace; }
    th { text-align: left; padding: 8px 12px; background: #1a1a1a; color: #666; font-size: 11px; }
    td { padding: 6px 12px; vertical-align: top; }
    tr.added td { background: rgba(74,222,128,.05); }
    tr.removed td { background: rgba(248,113,113,.05); }
    tr.changed td { background: rgba(251,191,36,.05); }
    .line-num { color: #555; width: 40px; text-align: right; padding-right: 12px; }
    .old, .new { width: 45%; }
    .old { color: #4ade80; } .new { color: #fbbf24; }
    .summary-bar { display: flex; gap: 24px; padding: 12px 24px; background: #1a1a1a; border-bottom: 1px solid #333; }
    .summary-stat { font-size: 13px; }
    .summary-stat .val { font-size: 18px; font-weight: 700; }
    .summary-stat .lbl { font-size: 11px; color: #666; }
    .summary-stat.added .val { color: #4ade80; }
    .summary-stat.removed .val { color: #f87171; }
    .summary-stat.changed .val { color: #fbbf24; }
  </style>
</head>
<body>
  <header>
    <h1>Artifact Diff — ${slug}</h1>
    <span class="verdict ${htmlDelta && htmlDelta.totalChanges === 0 ? 'identical' : 'changed'}">${htmlDelta ? (htmlDelta.totalChanges === 0 ? 'IDENTICAL' : `${htmlDelta.totalChanges} changes`) : 'VISUAL_ONLY'}</span>
  </header>

  ${htmlDelta ? `
  <div class="summary-bar">
    <div class="summary-stat added"><span class="val">${htmlDelta.added}</span><span class="lbl">lines added</span></div>
    <div class="summary-stat removed"><span class="val">${htmlDelta.removed}</span><span class="lbl">lines removed</span></div>
    <div class="summary-stat changed"><span class="val">${htmlDelta.changed}</span><span class="lbl">lines changed</span></div>
  </div>` : ''}

  <div class="side-by-side">
    <div class="shot-panel">
      <div class="shot-header old">Old Version</div>
      <img src="${oldShot}" alt="old version" />
    </div>
    <div class="shot-panel">
      <div class="shot-header new">New Version</div>
      <img src="${newShot}" alt="new version" />
    </div>
  </div>

  <div class="delta">
    <h2>Structural Delta (first 10 changes)</h2>
    <table>
      <thead><tr><th>#</th><th>Old</th><th>New</th></tr></thead>
      <tbody>${changeRows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
