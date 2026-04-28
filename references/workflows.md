# Workflows — High-Level Design Pipelines

## Purpose
Define the standard workflow sequences for each major task type.

---

## Workflow 1: HTML Prototype Pipeline

```
1. REQUEST PARSE
   └─→ Extract: page type, sections, content, brand hints

2. COMPOSE
   └─→ Generate HTML structure + CSS
       └─→ Apply brand-asset-protocol (if brand provided)
       └─→ Apply design-directions (if no brand)

3. GENERATE ARTIFACT
   └─→ Write to state/artifacts/{slug}.html

4. VERIFY (Playwright)
   └─→ playwright/smoke.js → state/verify/{slug}-smoke.json
       ├─ Page loads (HTTP 200)
       ├─ No console errors
       └─ Key element visible

5. EXPORT
   └─→ playwright/screenshot.js → state/artifacts/{slug}.png
   └─→ playwright/pdf.js → state/artifacts/{slug}.pdf

6. PRESENT
   └─→ Return artifact paths + preview URLs to user
```

---

## Workflow 2: Slide Deck Pipeline

```
1. REQUEST PARSE
   └─→ Extract: topic, slide count, tone, content

2. COMPOSE
   └─→ Generate slide HTML (one <section> per slide)
       └─→ Apply slide theme (CSS vars)

3. GENERATE ARTIFACT
   └─→ Write to state/artifacts/{slug}-deck.html

4. VERIFY (Playwright)
   └─→ playwright/smoke.js (basic load + nav check)

5. EXPORT (per-slide)
   └─→ playwright/screenshot.js × N slides
   └─→ Optional: compile PDF

6. PRESENT
   └─→ Return deck HTML + slide PNGs
```

---

## Workflow 3: Design Critique Pipeline

```
1. RECEIVE INPUT
   └─→ Image upload (screenshot/mockup) OR
   └─→ URL to live page (Playwright navigates)

2. ANALYSIS
   └─→ ui-ux-heuristics.md check (manual or assisted)
   └─→ web-design-heuristics.md check
   └─→ Color contrast calculation

3. GENERATE REPORT
   └─→ Structured JSON + human-readable summary
       └─→ Issue: severity (high/med/low)
       └─→ Issue: heuristic violated
       └─→ Issue: recommendation

4. PRESENT
   └─→ Return critique report
```

---

## Workflow 4: Playwright Verification Pipeline

```
1. RECEIVE TARGET
   └─→ HTML file path OR URL

2. CONFIGURE
   └─→ Viewport (mobile/desktop)
   └─→ Elements to check (CSS selectors)
   └─→ Screenshot baseline (if exists)

3. RUN
   └─→ playwright/verify.js --config {config.json}

4. REPORT
   └─→ state/verify/{slug}-report.json
       ├─ passed: boolean
       ├─ errors: []
       └─ screenshot: path

5. PRESENT
   └─→ Return PASS/FAIL + details
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Playwright browser fails to launch | Fallback: report error, suggest manual check |
| HTML file not found | Report: "artifact not found, please generate first" |
| Console errors detected | Include in report as WARNING (not hard FAIL) |
| Screenshot fails | Retry once, then report with error |
| Verification timeout | Hard FAIL, include timeout value |
