#!/usr/bin/env node
/**
 * critique.js — Design critique pipeline (rule-based / heuristic-driven)
 *
 * Usage:
 *   node critique.js --target <path|URL> --slug <name> [--out-dir <dir>]
 *
 * Output:
 *   state/critique/<slug>.json
 *   state/critique/<slug>.md
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
const SKILL_ROOT = path.resolve(__dirname, '..', '..');

// ─── Heuristics (from references/) ──────────────────────────────────────────

/** @returns {{ score: number, max: number, reason: string }[]} */
async function evaluateHeuristics(page) {
  const results = [];

  // 1. Visibility of System Status
  try {
    const hasNav = await page.locator('nav, .nav, header').count() > 0;
    const hasTitle = await page.locator('title').textContent();
    const title = (hasTitle || '').trim();
    const score = hasNav && title ? 3 : hasNav || title ? 2 : 1;
    results.push({
      id: 'visibility',
      name: 'Visibility of System Status',
      score,
      max: 3,
      reason: hasNav
        ? `Navigation found${title ? `, title: "${title}"` : ''}`
        : 'No nav element detected'
    });
  } catch (e) {
    results.push({ id: 'visibility', name: 'Visibility of System Status', score: 1, max: 3, reason: e.message });
  }

  // 2. Consistency & Standards
  try {
    const tags = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*')).map(e => e.tagName.toLowerCase());
      const counts = {};
      all.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      return counts;
    });
    const tagCount = Object.keys(tags).length;
    const score = tagCount > 20 ? 3 : tagCount > 10 ? 2 : 1;
    results.push({
      id: 'consistency',
      name: 'Consistency & Standards',
      score,
      max: 3,
      reason: `${tagCount} unique HTML element types used`
    });
  } catch (e) {
    results.push({ id: 'consistency', name: 'Consistency & Standards', score: 1, max: 3, reason: e.message });
  }

  // 3. Error Prevention — forms with labels
  try {
    const inputs = await page.locator('input, textarea, select').count();
    const labels = await page.locator('label').count();
    const score = inputs === 0 ? 3 : labels >= inputs ? 3 : labels > 0 ? 2 : 1;
    results.push({
      id: 'error-prevention',
      name: 'Error Prevention',
      score,
      max: 3,
      reason: inputs === 0
        ? 'No forms — low error surface'
        : `${labels} label(s) for ${inputs} input(s) — ${labels >= inputs ? 'good' : 'needs label'}`
    });
  } catch (e) {
    results.push({ id: 'error-prevention', name: 'Error Prevention', score: 1, max: 3, reason: e.message });
  }

  // 4. Aesthetic & Minimalist Design — CSS complexity
  try {
    const cssInfo = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      let ruleCount = 0;
      let fontCount = 0;
      sheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          ruleCount += rules.length;
          rules.forEach(r => {
            if (r.style && r.style.fontFamily) fontCount++;
          });
        } catch (_) {}
      });
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return { ruleCount, fontCount, bodyBg };
    });
    // Fewer CSS rules + specific fonts = better score
    const score = cssInfo.ruleCount > 200 ? 1 : cssInfo.ruleCount > 80 ? 2 : 3;
    results.push({
      id: 'aesthetic',
      name: 'Aesthetic & Minimalist Design',
      score,
      max: 3,
      reason: `${cssInfo.ruleCount} CSS rules, ${cssInfo.fontCount} font declarations`
    });
  } catch (e) {
    results.push({ id: 'aesthetic', name: 'Aesthetic & Minimalist Design', score: 2, max: 3, reason: 'fallback: ' + e.message });
  }

  // 5. Performance Design — resource hints
  try {
    const hasViewport = await page.locator('meta[name="viewport"]').count() > 0;
    const hasCharset = await page.locator('meta[charset]').count() > 0;
    const score = hasViewport && hasCharset ? 3 : hasViewport || hasCharset ? 2 : 1;
    results.push({
      id: 'performance',
      name: 'Performance Design (meta setup)',
      score,
      max: 3,
      reason: `viewport${hasViewport ? '✓' : '✗'}, charset${hasCharset ? '✓' : '✗'}`
    });
  } catch (e) {
    results.push({ id: 'performance', name: 'Performance Design', score: 1, max: 3, reason: e.message });
  }

  // 6. Accessibility Surface
  try {
    const imgs = await page.locator('img').count();
    const imgsWithAlt = await page.locator('img[alt]').count();
    const btns = await page.locator('button, [role="button"]').count();
    const score = imgs === 0 ? 3 : imgsWithAlt === imgs ? 3 : imgsWithAlt > 0 ? 2 : 1;
    results.push({
      id: 'accessibility',
      name: 'Accessibility Surface',
      score,
      max: 3,
      reason: `${imgsWithAlt}/${imgs} images with alt text, ${btns} interactive elements`
    });
  } catch (e) {
    results.push({ id: 'accessibility', name: 'Accessibility Surface', score: 1, max: 3, reason: e.message });
  }

  return results;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

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

const baseOutDir = outDir
  ? path.resolve(outDir)
  : path.join(SKILL_ROOT, 'state', 'critique');

function resolveTarget(t) {
  if (fs.existsSync(t)) return 'file://' + path.resolve(t);
  if (t.startsWith('http')) return t;
  return t;
}

(async () => {
  const resolvedUrl = resolveTarget(target);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));

  // Load page
  let status = 'unknown';
  try {
    const resp = await page.goto(resolvedUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    status = resp ? resp.status() : 'loaded';
  } catch (e) {
    console.error('WARN: load error:', e.message);
  }
  await page.waitForTimeout(1000);

  // Grab visible text snippet
  const visibleText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, p, li'))
      .slice(0, 10)
      .map(e => e.textContent.trim())
      .filter(t => t.length > 0)
      .join(' | ');
  });

  // Run heuristic scoring
  const heuristicScores = await evaluateHeuristics(page);

  // Derive overall score
  const totalScore = heuristicScores.reduce((s, h) => s + h.score, 0);
  const maxScore = heuristicScores.reduce((s, h) => s + h.max, 0);
  const overallPct = Math.round((totalScore / maxScore) * 100);

  // Build issue list from low-scoring heuristics
  const issues = [];
  heuristicScores.forEach(h => {
    if (h.score <= 1) {
      issues.push({
        severity: 'HIGH',
        heuristic: h.name,
        description: h.reason,
        recommendation: `Address ${h.name.toLowerCase()} concerns`
      });
    }
  });

  // Build strengths from high-scoring
  const strengths = heuristicScores
    .filter(h => h.score >= 3)
    .map(h => h.reason);

  // Suggestions
  const suggestions = [];
  if (heuristicScores.find(h => h.id === 'accessibility' && h.score < 3)) {
    suggestions.push('Add alt text to all images lacking it');
  }
  if (heuristicScores.find(h => h.id === 'error-prevention' && h.score < 3)) {
    suggestions.push('Ensure every form input has a visible <label> element');
  }
  if (heuristicScores.find(h => h.id === 'performance' && h.score < 3)) {
    suggestions.push('Add <meta name="viewport"> and <meta charset> for proper rendering setup');
  }
  if (suggestions.length === 0) {
    suggestions.push('Continue monitoring design consistency as content scales');
  }

  await browser.close();

  // ─── JSON Report ────────────────────────────────────────────────────────────
  const reportJson = {
    artifactPath: target,
    artifactUrl: resolvedUrl,
    slug,
    generatedAt: new Date().toISOString(),
    loadStatus: status,
    consoleErrors,
    pageErrors,
    visibleTextSnippet: visibleText.slice(0, 300),
    overallScore: overallPct,
    summary: overallPct >= 75
      ? 'Design shows solid fundamentals with good accessibility and meta setup'
      : overallPct >= 50
      ? 'Design is functional but has room for improvement in key areas'
      : 'Design needs attention on multiple heuristics before launch readiness',
    heuristicScores,
    strengths,
    issues,
    suggestions
  };

  fs.mkdirSync(baseOutDir, { recursive: true });
  const jsonPath = path.join(baseOutDir, `${slug}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2));

  // ─── Markdown Report ──────────────────────────────────────────────────────────
  const md = `# Design Critique Report

**Artifact:** \`${target}\`
**Slug:** \`${slug}\`
**Generated:** ${reportJson.generatedAt}
**Load Status:** ${status}
**Overall Score:** ${overallPct}% (${totalScore}/${maxScore})

---

## Summary

${reportJson.summary}

---

## Heuristic Scores

| Heuristic | Score | Detail |
|-----------|-------|--------|
${heuristicScores.map(h => `| ${h.name} | ${h.score}/${h.max} | ${h.reason} |`).join('\n')}

---

## Strengths

${strengths.length > 0 ? strengths.map(s => `- ${s}`).join('\n') : '- No high-scoring areas detected'}

---

## Issues

${issues.length > 0
  ? issues.map(i => `### ⚠️ [${i.severity}] ${i.heuristic}\n${i.description}\n> ${i.recommendation}`).join('\n\n')
  : '- No critical issues found'}

---

## Suggestions

${suggestions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

---

## Console & Page Errors

${consoleErrors.length + pageErrors.length > 0
  ? (consoleErrors.length > 0 ? `**Console errors:** ${consoleErrors.join(', ')}\n` : '') +
    (pageErrors.length > 0 ? `**Page errors:** ${pageErrors.join(', ')}\n` : '')
  : '✅ No JavaScript errors detected'}
`;

  const mdPath = path.join(baseOutDir, `${slug}.md`);
  fs.writeFileSync(mdPath, md);

  console.log(`✅ Critique complete`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   MD:   ${mdPath}`);
  console.log(`   Score: ${overallPct}%`);
  process.exit(0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
