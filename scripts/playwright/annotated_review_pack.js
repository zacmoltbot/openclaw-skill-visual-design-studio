#!/usr/bin/env node
/**
 * annotated_review_pack.js — Multi-viewport review pack with DOM-anchored callout overlays
 *
 * Key fix (vs v1): Callouts use REAL Playwright bounding boxes from actual element selectors.
 * No hardcoded x/y/w/h percentages. Every viewport re-computes from live DOM.
 *
 * Usage:
 *   node annotated_review_pack.js --target <path|URL> --slug <name> [--out-dir <dir>]
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── DOM-Anchored Callout Definitions ─────────────────────────────────────────
// Each callout specifies a REAL CSS selector. Bounding boxes are computed live
// via Playwright's locator.boundingBox() — no hardcoded coordinates.

const CALLOUT_DEFS = {
  desktop: [
    {
      id: 1,
      label: 'Hero Section',
      selector: '.hero',
      text: 'Strong CTA hierarchy: headline + 3 stats + gradient bg. Primary entry point.',
      color: '#6c8ef5'
    },
    {
      id: 2,
      label: 'Navigation + Search',
      selector: 'header',
      text: 'Sticky header. Active state on "Health". Search input with focus ring.',
      color: '#4ade80'
    },
    {
      id: 3,
      label: 'Category Card Grid',
      selector: '.category-section',
      text: 'Auto-fill responsive grid. 6 cards visible. Hover lifts card + primary border.',
      color: '#fbbf24'
    },
    {
      id: 4,
      label: 'Ad Placement (In-Feed)',
      selector: '.ad-mid',
      text: '728×90 in-feed unit. Labeled. Non-intrusive positioning between content sections.',
      color: '#f87171'
    },
    {
      id: 5,
      label: 'Sidebar: Popular + Skyscraper',
      selector: 'aside',
      text: 'Popular list with ranked (#1–#3 gold) badges. 300×600 skyscraper below. Clear hierarchy.',
      color: '#a78bfa'
    }
  ],
  tablet: [
    {
      id: 1,
      label: 'Hero Section',
      selector: '.hero',
      text: 'Hero scales well at tablet. Stats remain readable.',
      color: '#6c8ef5'
    },
    {
      id: 2,
      label: 'Search Bar',
      selector: '.header-search',
      text: 'Search persists in header. Responsive input width.',
      color: '#4ade80'
    },
    {
      id: 3,
      label: 'Category Grid',
      selector: '.category-section',
      text: '2-col card grid. Icons + name + desc. Consistent hover.',
      color: '#fbbf24'
    },
    {
      id: 4,
      label: 'Sidebar Widgets',
      selector: 'aside',
      text: 'Sidebar collapses below main. Popular list + ad unit.',
      color: '#a78bfa'
    }
  ],
  mobile: [
    {
      id: 1,
      label: 'Hero Compact',
      selector: '.hero',
      text: 'Hero condenses to single-col. Headline + stats stack vertically.',
      color: '#6c8ef5'
    },
    {
      id: 2,
      label: 'Search (collapsed nav)',
      selector: '.header-search',
      text: 'Nav hides behind hamburger (not shown). Search stays accessible.',
      color: '#4ade80'
    },
    {
      id: 3,
      label: 'Card Grid 2-col',
      selector: '.category-section',
      text: '2-column grid. Cards stack. Icon + text layout preserved.',
      color: '#fbbf24'
    },
    {
      id: 4,
      label: 'Sidebar (stacked)',
      selector: 'aside',
      text: 'Sidebar ad + widget collapse to single column below content.',
      color: '#a78bfa'
    }
  ]
};

// ─── Bounding Box Fetcher ─────────────────────────────────────────────────────
// Queries real element bounding boxes via Playwright locator.
// Falls back to nearest ancestor if exact selector isn't found.

async function getBoundingBoxes(page, calloutDefs, vpWidth, vpHeight) {
  const results = [];
  for (const def of calloutDefs) {
    try {
      const locator = page.locator(def.selector).first();
      const box = await locator.boundingBox();
      if (box) {
        results.push({
          id: def.id,
          label: def.label,
          selector: def.selector,
          x: box.x,
          y: box.y,
          w: box.width,
          h: box.height,
          text: def.text,
          color: def.color
        });
      } else {
        console.warn(`  ⚠ No bounding box for [${def.id}] "${def.label}" selector="${def.selector}"`);
        results.push({
          id: def.id,
          label: def.label,
          selector: def.selector,
          x: 0, y: 0, w: 0, h: 0,
          text: def.text,
          color: def.color,
          skipped: true
        });
      }
    } catch (e) {
      console.warn(`  ⚠ Error for [${def.id}] "${def.label}": ${e.message}`);
      results.push({
        id: def.id,
        label: def.label,
        selector: def.selector,
        x: 0, y: 0, w: 0, h: 0,
        text: def.text,
        color: def.color,
        skipped: true
      });
    }
  }
  return results;
}

// ─── Label Collision Resolver ─────────────────────────────────────────────────
// Shifts labels that would overflow the right edge or collide vertically.
// Strategy: clamp label to stay within vp bounds, nudge Y if overlapping.

function resolveLabelPositions(boxes, vpWidth, vpHeight) {
  const MIN_LABEL_WIDTH = 160;
  const LABEL_OFFSET_X = 10;
  const LABEL_OFFSET_Y = 6;
  const LABEL_GAP = 4; // vertical gap between stacked labels

  // Sort by Y so we can detect vertical overlaps
  const sorted = [...boxes].sort((a, b) => a.y - b.y);

  // Track used Y ranges to avoid label overlap
  const usedYRanges = [];

  return boxes.map(box => {
    let labelX = box.x + box.w + LABEL_OFFSET_X;
    let labelY = box.y + LABEL_OFFSET_Y;

    // If label would overflow right edge, put it inside the box (left side)
    if (labelX + MIN_LABEL_WIDTH > vpWidth - 10) {
      labelX = box.x + LABEL_OFFSET_X;
    }

    // If label is still off-screen horizontally, cap it
    labelX = Math.min(labelX, vpWidth - MIN_LABEL_WIDTH - 10);

    // Check vertical collision with previously placed labels
    const labelH = 56; // estimated label height
    for (const range of usedYRanges) {
      if (labelY < range.end + LABEL_GAP && labelY + labelH > range.start - LABEL_GAP) {
        // Push this label below the conflict
        labelY = range.end + LABEL_GAP;
      }
    }

    // If label still overflows bottom, clamp
    if (labelY + labelH > vpHeight - 10) {
      labelY = vpHeight - labelH - 10;
    }

    usedYRanges.push({ start: labelY, end: labelY + labelH });

    return { ...box, labelX, labelY };
  });
}

// ─── Connector Path Builder ───────────────────────────────────────────────────
// Returns an SVG L-shaped path from box edge to label chip.
// Strategy:
//   - Right side if box.x + box.w + gap + chipWidth < vpWidth
//   - Left side otherwise
//   - Always uses exactly 2 segments (horizontal first, then vertical)
//   - Start: box right-edge midpoint (or left-edge midpoint)
//   - Knee: horizontal midpoint between box edge and label
//   - End: chip top-left corner
// Line stroke is darker shade of chip color, 1.5px.

function buildConnectorPath(box, labelX, labelY, chipWidth, vpWidth) {
  const GAP = 10;
  const boxRight = box.x + box.w;
  const boxMidY = box.y + box.h / 2;
  const chipH = 56; // estimated label chip height

  let startX, kneeX, endX, seg1dir;

  if (box.x + box.w + GAP + chipWidth < vpWidth) {
    // Line goes to the RIGHT of the box
    startX = boxRight;
    kneeX = Math.min(boxRight + GAP * 3, labelX - 4);
    endX = labelX;
    seg1dir = 'R';
  } else {
    // Line goes to the LEFT of the box
    startX = box.x;
    kneeX = Math.max(box.x - GAP * 3, labelX + chipWidth + 4);
    endX = labelX + chipWidth;
    seg1dir = 'L';
  }

  // L-shape: horizontal first (from box edge to kneeX), then vertical to label top
  // Path: M startX,boxMidY → H kneeX → V labelY
  const d = `M ${startX},${boxMidY} H ${kneeX} V ${labelY}`;

  return { d, seg1dir, lineColor: darkenColor(box.color, 25) };
}

// Darken a hex color by blending toward #000 (simple approach, inlined)
function darkenColor(hex, pct) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 1 - pct / 100;
  const rd = Math.round(r * factor);
  const gd = Math.round(g * factor);
  const bd = Math.round(b * factor);
  return `#${rd.toString(16).padStart(2, '0')}${gd.toString(16).padStart(2, '0')}${bd.toString(16).padStart(2, '0')}`;
}

// ─── Annotation HTML Generator ────────────────────────────────────────────────

function buildAnnotationHtml(screenshotPath, boxes, vpWidth, vpHeight) {
  // Pre-compute connector paths per callout
  const connectors = boxes.filter(b => !b.skipped).map(b => {
    const chipWidth = 200;
    return buildConnectorPath(b, b.labelX, b.labelY, chipWidth, vpWidth);
  });

  const connectorSvgHtml = boxes.filter(b => !b.skipped).map((b, i) => {
    const c = connectors[i];
    return `<svg class="connector-svg" viewBox="0 0 ${vpWidth} ${vpHeight}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;position:absolute;inset:0;width:${vpWidth}px;height:${vpHeight}px;z-index:4;pointer-events:none;">
  <path d="${c.d}" stroke="${c.lineColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  }).join('\n');

  const boxHtml = boxes.filter(b => !b.skipped).map(b => `
  <div class="callout" style="
    left: ${b.x}px;
    top: ${b.y}px;
    width: ${b.w}px;
    height: ${b.h}px;
    --callout-color: ${b.color};
  ">
    <div class="callout-circle">${b.id}</div>
  </div>`).join('\n');

  const labelHtml = boxes.filter(b => !b.skipped).map(b => `
  <div class="callout-label" style="
    left: ${b.labelX}px;
    top: ${b.labelY}px;
    --callout-color: ${b.color};
  ">
    <div class="callout-label-num">#${b.id}</div>
    <div class="callout-label-body">
      <div class="callout-label-title">${b.label}</div>
      <div class="callout-label-desc">${b.text}</div>
    </div>
  </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Annotated</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #0a0a0f; }
    .vp-frame {
      position: relative;
      width: ${vpWidth}px;
      height: ${vpHeight}px;
    }
    .screenshot {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    /* Annotation border overlays */
    .callout {
      position: absolute;
      border: 2.5px solid var(--callout-color);
      border-radius: 6px;
      background: rgba(0,0,0,0.25);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.5);
    }
    .callout-circle {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--callout-color);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    /* Floating labels (separate from border so text stays readable) */
    .callout-label {
      position: absolute;
      background: rgba(10,10,20,0.88);
      border: 1.5px solid var(--callout-color);
      border-radius: 6px;
      padding: 5px 8px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      max-width: 200px;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      z-index: 5;
    }
    .callout-label-num {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--callout-color);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .callout-label-body { flex: 1; min-width: 0; }
    .callout-label-title {
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    }
    .callout-label-desc {
      font-size: 10px;
      color: rgba(255,255,255,0.80);
      line-height: 1.35;
    }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <div class="vp-frame">
    <img class="screenshot" src="file://${screenshotPath}" />
    ${connectorSvgHtml}
    ${boxHtml}
    ${labelHtml}
  </div>
</body>
</html>`;
}

// ─── Debug helper: dump selector → bounding box JSON ──────────────────────────

function writeDebugJson(filePath, viewport, calloutDefs, boxes) {
  const debug = {
    viewport,
    generatedAt: new Date().toISOString(),
    callouts: calloutDefs.map((def, i) => ({
      id: def.id,
      label: def.label,
      selector: def.selector,
      boundingBox: boxes[i] ? {
        x: boxes[i].x,
        y: boxes[i].y,
        w: boxes[i].w,
        h: boxes[i].h
      } : null,
      labelPosition: boxes[i] ? {
        x: boxes[i].labelX,
        y: boxes[i].labelY
      } : null
    }))
  };
  fs.writeFileSync(filePath, JSON.stringify(debug, null, 2));
}

// ─── Main ────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let target = null, slug = null, outDir = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && i + 1 < args.length) target = args[++i];
  else if (args[i] === '--slug' && i + 1 < args.length) slug = args[++i];
  else if (args[i] === '--out-dir' && i + 1 < args.length) outDir = args[++i];
}

if (!target || !slug) {
  console.error('ERROR: --target and --slug are required');
  process.exit(1);
}

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const baseOutDir = outDir ? path.resolve(outDir) : path.join(SKILL_ROOT, 'state', 'review-packs', slug);
const screenshotsDir = path.join(baseOutDir, 'screenshots');
const annotatedDir = path.join(baseOutDir, 'annotated');
const debugDir = path.join(baseOutDir, 'debug');
const smokeOutDir = path.join(baseOutDir, 'verify');

const VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1280, height: 800 }
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
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(annotatedDir, { recursive: true });
  fs.mkdirSync(debugDir, { recursive: true });
  fs.mkdirSync(smokeOutDir, { recursive: true });

  const metadata = {
    slug, target, url: resolvedUrl,
    generatedAt: new Date().toISOString(),
    viewports: [], annotated: []
  };

  const browser = await chromium.launch({ headless: true });

  // ── Smoke check (desktop) ──
  const smokeReport = { checks: {}, passed: false, errors: [] };
  const smokeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const smokePage = await smokeCtx.newPage();
  const consoleErrors = [];
  smokePage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  smokePage.on('pageerror', err => consoleErrors.push(err.message));
  try {
    const resp = await smokePage.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    smokeReport.checks.load = { passed: true, status: resp ? resp.status() : 'loaded' };
  } catch (e) {
    smokeReport.checks.load = { passed: false, error: e.message };
    smokeReport.errors.push('load: ' + e.message);
  }
  await smokePage.waitForTimeout(1000);
  smokeReport.checks.consoleErrors = { passed: consoleErrors.length === 0, errors: consoleErrors };
  smokeReport.passed = smokeReport.errors.length === 0;
  await smokeCtx.close();

  // ── Clean + Annotated captures ──
  for (const vp of VIEWPORTS) {
    const vpCtx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vpPage = await vpCtx.newPage();
    const vpErrors = [];
    vpPage.on('pageerror', err => vpErrors.push(err.message));

    await vpPage.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await vpPage.waitForTimeout(800); // let fonts/layout settle

    // Clean screenshot (preserved as-is)
    const cleanPath = path.join(screenshotsDir, `${slug}-${vp.name}.png`);
    await vpPage.screenshot({ type: 'png', path: cleanPath });

    const vpMeta = {
      name: vp.name, width: vp.width, height: vp.height,
      screenshot: path.relative(baseOutDir, cleanPath),
      pageErrors: vpErrors
    };
    metadata.viewports.push(vpMeta);

    // ── DOM-anchored annotation ──
    const calloutDefs = CALLOUT_DEFS[vp.name] || [];
    if (calloutDefs.length > 0) {
      // 1. Get real bounding boxes from live DOM
      const rawBoxes = await getBoundingBoxes(vpPage, calloutDefs, vp.width, vp.height);

      // 2. Resolve label positions (collision avoidance)
      const resolvedBoxes = resolveLabelPositions(rawBoxes, vp.width, vp.height);

      // 3. Write debug JSON
      const debugPath = path.join(debugDir, `bounding-boxes-${vp.name}.json`);
      writeDebugJson(debugPath, vp.name, calloutDefs, resolvedBoxes);

      // 4. Build & screenshot annotation overlay
      const tmpDir = path.join(SKILL_ROOT, 'tmp');
      fs.mkdirSync(tmpDir, { recursive: true });
      const overlayHtml = buildAnnotationHtml(cleanPath, resolvedBoxes, vp.width, vp.height);
      const overlayPath = path.join(tmpDir, `annotation-overlay-${vp.name}.html`);
      fs.writeFileSync(overlayPath, overlayHtml);

      const overlayPage = await vpCtx.newPage();
      await overlayPage.goto('file://' + overlayPath, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await overlayPage.waitForTimeout(500);
      const annotatedPath = path.join(annotatedDir, `${slug}-${vp.name}-annotated.png`);
      await overlayPage.screenshot({ type: 'png', path: annotatedPath });
      await overlayPage.close();
      fs.unlinkSync(overlayPath);

      metadata.annotated.push({
        name: vp.name,
        screenshot: path.relative(baseOutDir, annotatedPath),
        calloutCount: resolvedBoxes.filter(b => !b.skipped).length,
        skipped: resolvedBoxes.filter(b => b.skipped).length
      });

      // Log bounding boxes for verification
      for (const b of resolvedBoxes) {
        if (!b.skipped) {
          console.log(`  [${vp.name}] #${b.id} "${b.label}" selector="${b.selector}" → x=${b.x.toFixed(0)} y=${b.y.toFixed(0)} w=${b.w.toFixed(0)} h=${b.h.toFixed(0)} label=(x=${b.labelX.toFixed(0)},y=${b.labelY.toFixed(0)})`);
        } else {
          console.log(`  [${vp.name}] #${b.id} "${b.label}" SKIPPED (no bounding box)`);
        }
      }
    }

    await vpCtx.close();
    console.log(`  ✓ ${vp.name} clean + annotated`);
  }

  await browser.close();

  // ── Write metadata ──
  const metaPath = path.join(baseOutDir, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(smokeOutDir, 'smoke-result.json'), JSON.stringify(smokeReport, null, 2));

  // ── Contact sheet (index.html) ──
  const tabSection = VIEWPORTS.map(vp => {
    const cleanMeta = metadata.viewports.find(m => m.name === vp.name);
    const annMeta = metadata.annotated.find(a => a.name === vp.name);
    const errors = cleanMeta ? cleanMeta.pageErrors : [];
    return `
    <div class="vp-group">
      <h2 class="vp-label">${vp.name.charAt(0).toUpperCase() + vp.name.slice(1)} · ${vp.width}×${vp.height}px</h2>
      <div class="screenshots">
        <div class="shot-card">
          <div class="shot-tabs">
            <button class="tab active" onclick="showTab('${vp.name}-clean', this)">Clean</button>
            <button class="tab" onclick="showTab('${vp.name}-annotated', this)">Annotated</button>
          </div>
          <div id="${vp.name}-clean" class="shot-img">
            <img src="${cleanMeta?.screenshot || ''}" alt="${vp.name} clean" />
            <div class="shot-badge ${errors.length === 0 ? 'ok' : 'err'}">
              ${errors.length === 0 ? '✓ no errors' : `✗ ${errors.length} error(s)`}
            </div>
          </div>
          <div id="${vp.name}-annotated" class="shot-img" style="display:none">
            ${annMeta
              ? `<img src="${annMeta.screenshot}" alt="${vp.name} annotated" />
                 <div class="shot-badge info">${annMeta.calloutCount} callouts${annMeta.skipped ? ` (${annMeta.skipped} skipped)` : ''}</div>`
              : '<div class="no-annotated">No annotations for this view</div>'
            }
          </div>
        </div>
      </div>
    </div>`;
  }).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Review Pack — ${slug}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #111; color: #eee; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #fff; }
    .meta { font-size: 12px; color: #888; margin-bottom: 24px; }
    .vp-group { margin-bottom: 36px; }
    .vp-label { font-size: 14px; color: #888; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .screenshots { display: flex; gap: 20px; flex-wrap: wrap; }
    .shot-card { background: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #333; min-width: 280px; flex: 1; max-width: 560px; }
    .shot-tabs { display: flex; border-bottom: 1px solid #333; }
    .tab { flex: 1; padding: 10px; background: none; border: none; color: #888; font-size: 13px; cursor: pointer; transition: background .15s, color .15s; }
    .tab:hover { background: #222; color: #ccc; }
    .tab.active { background: #1a1a1a; color: #fff; border-bottom: 2px solid #6c8ef5; }
    .shot-img { position: relative; }
    .shot-img img { width: 100%; height: auto; display: block; }
    .shot-badge { position: absolute; bottom: 8px; right: 8px; font-size: 10px; padding: 3px 8px; border-radius: 4px; }
    .shot-badge.ok { background: #1a3d2b; color: #4ade80; }
    .shot-badge.err { background: #3d1a1a; color: #f87171; }
    .shot-badge.info { background: #1a2a3d; color: #6c8ef5; }
    .no-annotated { padding: 24px; text-align: center; color: #555; font-size: 13px; }
    .smoke { margin-top: 24px; padding: 16px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333; font-size: 13px; }
    .smoke h2 { font-size: 14px; color: #fff; margin-bottom: 12px; }
    .smoke-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot.ok { background: #4ade80; } .dot.fail { background: #f87171; }
    .legend { margin-top: 24px; display: flex; gap: 16px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  </style>
</head>
<body>
  <h1>📦 Review Pack — ${slug}</h1>
  <p class="meta">Target: ${target} &nbsp;|&nbsp; Generated: ${metadata.generatedAt}</p>

  ${tabSection}

  <div class="smoke">
    <h2>🔥 Smoke Check (desktop 1280×800)</h2>
    <div class="smoke-row"><div class="dot ${smokeReport.checks.load?.passed ? 'ok' : 'fail'}"></div><span>Load: ${smokeReport.checks.load?.passed ? 'PASS' : 'FAIL — ' + (smokeReport.checks.load?.error || '')}</span></div>
    <div class="smoke-row"><div class="dot ${smokeReport.checks.consoleErrors?.passed ? 'ok' : 'fail'}"></div><span>Console errors: ${smokeReport.checks.consoleErrors?.passed ? 'NONE' : smokeReport.checks.consoleErrors?.errors?.length + ' error(s)'}</span></div>
  </div>

  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#6c8ef5"></div>Hero / Content Section</div>
    <div class="legend-item"><div class="legend-dot" style="background:#4ade80"></div>Navigation / Search</div>
    <div class="legend-item"><div class="legend-dot" style="background:#fbbf24"></div>Category / Card Grid</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f87171"></div>Ad Placement</div>
    <div class="legend-item"><div class="legend-dot" style="background:#a78bfa"></div>Sidebar / Widgets</div>
  </div>

  <script>
    function showTab(id, btn) {
      document.querySelectorAll('.shot-img').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.getElementById(id).style.display = 'block';
      btn.classList.add('active');
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(baseOutDir, 'index.html'), indexHtml);

  console.log(`\n✅ Annotated review pack: ${baseOutDir}`);
  console.log(`   debug JSON:            ${debugDir}/`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
