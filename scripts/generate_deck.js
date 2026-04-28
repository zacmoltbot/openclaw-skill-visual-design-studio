#!/usr/bin/env node
/**
 * generate_deck.js — Generate a real HTML slide deck (product/design proposal)
 *
 * Usage:
 *   node generate_deck.js [--out <path>]
 *
 * Hard-coded content (no parser needed for this phase).
 * Output: state/artifacts/demo-deck.html  (at least 3 slides, real content)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const outPath = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : path.join(SKILL_ROOT, 'state', 'artifacts', 'demo-deck.html');

const slug = 'demo-deck';

// ─── Slide Data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    n: 1,
    section: 'cover',
    title: 'Pulse Dashboard',
    subtitle: 'Real-time Metrics for Modern Teams',
    byline: 'Product Design · Q2 2026'
  },
  {
    n: 2,
    section: 'problem',
    title: 'The Problem',
    points: [
      'Teams lack visibility into live operational metrics',
      'Dashboard overload — too many tools, too much noise',
      'Critical alerts get buried in notification chaos',
      'No single pane of glass for cross-functional status'
    ]
  },
  {
    n: 3,
    section: 'solution',
    title: 'Our Solution',
    points: [
      'Unified real-time dashboard — one URL, all metrics',
      'Smart alert routing: right person, right channel, right time',
      'Configurable widgets: drag-and-drop layout per team',
      'Integrates with Slack, Teams, PagerDuty, and custom webhooks'
    ]
  },
  {
    n: 4,
    section: 'metrics',
    title: 'Target Metrics',
    points: [
      '↓ 40% reduction in mean-time-to-acknowledge (MTTA)',
      '↑ 3× faster incident triage via unified view',
      '95th percentile load time < 800ms worldwide',
      'NPS ≥ 52 among beta users after 30 days'
    ]
  },
  {
    n: 5,
    section: 'design-principles',
    title: 'Design Principles',
    points: [
      'Density without clutter — show more, overwhelm less',
      'Dark-mode first — comfortable for extended monitoring sessions',
      'Progressive disclosure — summary first, detail on demand',
      'Accessible by default — WCAG 2.1 AA baseline'
    ]
  },
  {
    n: 6,
    section: 'timeline',
    title: 'Rollout Plan',
    points: [
      'Week 1–2: Core layout + data grid widget',
      'Week 3–4: Alert routing engine + Slack integration',
      'Week 5–6: Widget marketplace (internal beta)',
      'Week 7–8: Analytics dashboard + public launch'
    ]
  },
  {
    n: 7,
    section: 'close',
    title: "Let's build this together.",
    subtitle: 'Open for design partners starting Week 3.',
    byline: 'Questions? → pulse-design@company.com'
  }
];

// ─── HTML Generator ──────────────────────────────────────────────────────────

function generateDeck(slides) {
  const slidesHtml = slides.map(s => {
    if (s.section === 'cover') {
      return `
  <section class="slide slide-cover" id="slide-${s.n}">
    <div class="cover-inner">
      <div class="cover-logo">◉</div>
      <h1>${s.title}</h1>
      <p class="subtitle">${s.subtitle}</p>
      <p class="byline">${s.byline}</p>
    </div>
    <div class="slide-num">${s.n}</div>
  </section>`;
    }
    if (s.section === 'close') {
      return `
  <section class="slide slide-close" id="slide-${s.n}">
    <div class="close-inner">
      <div class="close-icon">◉</div>
      <h1>${s.title}</h1>
      <p class="subtitle">${s.subtitle}</p>
      <p class="byline">${s.byline}</p>
    </div>
    <div class="slide-num">${s.n}</div>
  </section>`;
    }
    return `
  <section class="slide slide-content" id="slide-${s.n}">
    <div class="content-inner">
      <div class="slide-header">
        <span class="slide-label">${s.section.replace(/-/g, ' ')}</span>
        <h2>${s.title}</h2>
      </div>
      <ul class="points">
        ${s.points.map(p => `<li>${p}</li>`).join('\n        ')}
      </ul>
    </div>
    <div class="slide-num">${s.n}</div>
  </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pulse Dashboard — Design Proposal</title>
  <style>
    /* ─── Reset ─────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ─── Tokens ─────────────────────────── */
    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --surface2: #222636;
      --border: #2e3348;
      --text: #e8eaf6;
      --text-muted: #8890a8;
      --accent: #6c8ef5;
      --accent-dim: rgba(108,142,245,0.12);
      --green: #4ade80;
      --yellow: #fbbf24;
      --red: #f87171;
      --font: system-ui, -apple-system, "Noto Sans TC", sans-serif;
      --radius: 12px;
    }

    /* ─── Base ───────────────────────────── */
    html, body {
      width: 100%; height: 100%;
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow: hidden;
    }

    /* ─── Slide container ─────────────────── */
    .deck {
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .slide {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ─── Cover / Close slides ───────────── */
    .slide-cover, .slide-close {
      background: var(--bg);
    }

    .cover-inner, .close-inner {
      text-align: center;
      max-width: 680px;
    }

    .cover-logo, .close-icon {
      font-size: 48px;
      color: var(--accent);
      margin-bottom: 24px;
    }

    .cover-inner h1, .close-inner h1 {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.1;
      margin-bottom: 16px;
      background: linear-gradient(135deg, var(--text) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 22px;
      color: var(--text-muted);
      margin-bottom: 24px;
      line-height: 1.4;
    }

    .byline {
      font-size: 13px;
      color: var(--text-muted);
      opacity: 0.6;
    }

    /* ─── Content slides ──────────────────── */
    .slide-content {
      background: var(--bg);
    }

    .content-inner {
      width: 100%;
      max-width: 900px;
      padding: 0 48px;
    }

    .slide-header {
      margin-bottom: 40px;
    }

    .slide-label {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--accent-dim);
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .slide-header h2 {
      font-size: 40px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }

    /* ─── Bullet points ───────────────────── */
    .points {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .points li {
      font-size: 20px;
      line-height: 1.5;
      color: var(--text-muted);
      padding-left: 28px;
      position: relative;
    }

    .points li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }

    /* ─── Slide number ───────────────────── */
    .slide-num {
      position: absolute;
      bottom: 24px;
      right: 32px;
      font-size: 12px;
      color: var(--border);
      font-variant-numeric: tabular-nums;
    }

    /* ─── Print ──────────────────────────── */
    @media print {
      html, body { overflow: visible; }
      .deck { height: auto; }
      .slide { position: relative; page-break-after: always; height: 100vh; }
    }
  </style>
</head>
<body>
<div class="deck">
${slidesHtml}
</div>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const html = generateDeck(SLIDES);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);

const ext = path.extname(outPath);
const count = SLIDES.length;

// Export screenshot (slide 1) and PDF via existing pipeline
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('file://' + path.resolve(outPath), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // Smoke: verify all slides exist
  const slideCount = await page.locator('section.slide').count();
  console.log(`📊 Deck generated: ${slideCount} slides`);

  // Screenshot of cover slide
  const screenshotPath = outPath.replace(ext, '.png');
  await page.locator('#slide-1').screenshot({ path: screenshotPath, type: 'png' });
  console.log(`  ✓ screenshot: ${path.basename(screenshotPath)}`);

  // PDF export
  const pdfPath = outPath.replace(ext, '.pdf');
  const pdfBuf = await page.pdf({
    format: 'A4',
    landscape: false,
    printBackground: true,
    margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' }
  });
  fs.writeFileSync(pdfPath, pdfBuf);
  console.log(`  ✓ pdf: ${path.basename(pdfPath)}`);

  await browser.close();

  console.log(`\n✅ Deck output: ${outPath}`);
  console.log(`   slides: ${count}`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
