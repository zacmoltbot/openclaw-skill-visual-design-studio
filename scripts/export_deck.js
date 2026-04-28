#!/usr/bin/env node
/**
 * export_deck.js — Multi-slide PNG + multi-page PDF export for HTML slide decks
 *
 * Usage:
 *   node export_deck.js --deck <path> --slug <name> [--out-dir <dir>] [--dpi 96]
 *
 * Output:
 *   state/decks/<slug>/
 *     ├── slides/<slug>-slide-01.png, <slug>-slide-02.png, ...
 *     ├── <slug>-slides.pdf    (one page per slide, full deck)
 *     ├── <slug>-cover.png     (slide-1 screenshot, for quick preview)
 *     └── metadata.json
 *
 * Supports both:
 *   - Decks using .slide { position:absolute } stacking (deck-shell.html)
 *   - Decks using flat <section> flow (demo-deck.html)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let deckPath = null, slug = null, outDir = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--deck' && i + 1 < args.length) deckPath = args[++i];
  else if (args[i] === '--slug' && i + 1 < args.length) slug = args[++i];
  else if (args[i] === '--out-dir' && i + 1 < args.length) outDir = args[++i];
}

if (!deckPath || !slug) {
  console.error('ERROR: --deck and --slug are required');
  process.exit(1);
}

const SKILL_ROOT = path.resolve(__dirname, '..', '..');
const baseOutDir = outDir ? path.resolve(outDir) : path.join(SKILL_ROOT, 'state', 'decks', slug);
const slidesDir = path.join(baseOutDir, 'slides');
const deckUrl = (() => {
  if (fs.existsSync(deckPath)) return 'file://' + path.resolve(deckPath);
  if (deckPath.startsWith('http://') || deckPath.startsWith('https://') || deckPath.startsWith('file://')) return deckPath;
  const r = path.resolve(deckPath);
  if (fs.existsSync(r)) return 'file://' + r;
  return deckPath;
})();

(async () => {
  fs.mkdirSync(slidesDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(deckUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Detect slide structure
  const slideCount = await page.locator('section.slide, .slide').count();
  const hasPositionedSlides = await page.evaluate(() => {
    const s = document.querySelector('section.slide, .slide');
    return s ? getComputedStyle(s).position === 'absolute' : false;
  });

  console.log(`📊 Deck: ${slideCount} slides (positioned=${hasPositionedSlides})`);

  const metadata = {
    slug,
    deck: deckPath,
    url: deckUrl,
    generatedAt: new Date().toISOString(),
    slideCount,
    slides: []
  };

  if (hasPositionedSlides) {
    // Stacked/deck style — iterate slides by index
    for (let i = 1; i <= slideCount; i++) {
      const selector = `section.slide:nth-child(${i}), .slide:nth-child(${i})`;
      const exists = await page.locator(selector).count();
      if (!exists) continue;

      // Make slide i visible (show it, hide others)
      await page.evaluate((idx) => {
        const all = document.querySelectorAll('section.slide, .slide');
        all.forEach((s, j) => {
          s.style.visibility = (j === idx - 1) ? 'visible' : 'hidden';
          s.style.position = (j === idx - 1) ? 'absolute' : 'absolute';
        });
      }, i);

      await page.waitForTimeout(300);

      const slidePath = path.join(slidesDir, `${slug}-slide-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ type: 'png', path: slidePath });

      metadata.slides.push({ n: i, screenshot: path.relative(baseOutDir, slidePath) });
      console.log(`  ✓ slide ${i}: ${path.basename(slidePath)}`);

      // Reset visibility
      await page.evaluate(() => {
        document.querySelectorAll('section.slide, .slide').forEach(s => {
          s.style.visibility = 'visible';
        });
      });
    }
  } else {
    // Flat flow — scroll to each slide or use page.pdf per slide via print-to-pdf
    // Use scroll approach: take full-page screenshot then slice per slide height
    for (let i = 1; i <= slideCount; i++) {
      // Scroll to slide i (each slide is ~100vh)
      await page.evaluate((idx) => {
        const all = document.querySelectorAll('section.slide, .slide');
        if (all[idx - 1]) all[idx - 1].scrollIntoView();
      }, i - 1);
      await page.waitForTimeout(400);

      const slidePath = path.join(slidesDir, `${slug}-slide-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ type: 'png', path: slidePath, clip: { x: 0, y: 0, width: 1280, height: 800 } });

      metadata.slides.push({ n: i, screenshot: path.relative(baseOutDir, slidePath) });
      console.log(`  ✓ slide ${i}: ${path.basename(slidePath)}`);
    }
  }

  // ── Cover screenshot (slide 1) ──
  const coverPath = path.join(baseOutDir, `${slug}-cover.png`);
  if (metadata.slides.length > 0) {
    const firstSlidePath = path.join(slidesDir, metadata.slides[0].screenshot);
    if (fs.existsSync(firstSlidePath)) {
      fs.copyFileSync(firstSlidePath, coverPath);
    }
  }

  // ── Multi-page PDF: one page per slide ──
  // Use the flat-scroll approach: navigate to each slide, pdf it, concat later
  // Actually: use page.pdf() with page ranges targeting each slide
  // Simpler: generate full-deck scroll PDF, then also generate per-slide PDFs
  const fullPdfPath = path.join(baseOutDir, `${slug}-slides.pdf`);

  // Reset to top for full PDF
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  // PDF: entire deck (may be multi-page depending on @page print styles)
  // For slide decks, prefer print-background and 1 slide per page via CSS
  // We do it by: for each slide, show it + pdf that page only
  const pdfPages = [];
  for (let i = 1; i <= slideCount; i++) {
    if (hasPositionedSlides) {
      await page.evaluate((idx) => {
        const all = document.querySelectorAll('section.slide, .slide');
        all.forEach((s, j) => {
          s.style.visibility = (j === idx - 1) ? 'visible' : 'hidden';
        });
      }, i);
    } else {
      await page.evaluate((idx) => {
        const all = document.querySelectorAll('section.slide, .slide');
        if (all[idx - 1]) all[idx - 1].scrollIntoView();
      }, i - 1);
    }
    await page.waitForTimeout(300);

    const pdfBuf = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: { top: '0.3in', right: '0.3in', bottom: '0.3in', left: '0.3in' }
    });
    pdfPages.push(pdfBuf);

    if (hasPositionedSlides) {
      await page.evaluate(() => {
        document.querySelectorAll('section.slide, .slide').forEach(s => { s.style.visibility = 'visible'; });
      });
    }
  }

  // Merge PDFs by writing a concatenated PDF manually
  // Simple approach: write first PDF + append others
  // We use the first page as base, then use a basic concat without external libs
  // Write out individual PDFs and track; full merged PDF = write as-is concatenation
  const individualPdfDir = path.join(baseOutDir, 'pdf-pages');
  fs.mkdirSync(individualPdfDir, { recursive: true });
  for (let i = 0; i < pdfPages.length; i++) {
    fs.writeFileSync(path.join(individualPdfDir, `page-${String(i + 1).padStart(2, '0')}.pdf`), pdfPages[i]);
  }

  // Merge PDFs with pdf-lib
  const mergedPdf = await mergePdfsLib(pdfPages);
  fs.writeFileSync(fullPdfPath, mergedPdf);
  console.log(`  ✓ merged PDF: ${path.basename(fullPdfPath)} (${pdfPages.length} pages)`);

  metadata.pdfPages = pdfPages.length;
  metadata.cover = path.relative(baseOutDir, coverPath);

  fs.writeFileSync(path.join(baseOutDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  await browser.close();

  console.log(`\n✅ Deck export: ${baseOutDir}`);
  console.log(`   slides: ${slidesDir}/`);
  console.log(`   PDF: ${fullPdfPath}`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});

// ─── PDF merge via pdf-lib ─────────────────────────────────────────────────────
async function mergePdfsLib(pdfBuffers) {
  const merged = await PDFDocument.create();
  for (const buf of pdfBuffers) {
    const src = await PDFDocument.load(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }
  return merged.save();
}
