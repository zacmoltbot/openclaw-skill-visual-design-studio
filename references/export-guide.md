# Export Guide — Tiered Artifact Output Pipeline

## Purpose

Define how generated artifacts are exported to deliverable formats, organized by tiers reflecting real review workflows.

---

## Tiered Export Overview

| Tier | Formats | Use Case | V1? |
|------|---------|----------|-----|
| Tier 1 | HTML · PNG · PDF | Core deliverables — source + visual record | ✅ |
| Tier 2 | Review pack · Annotated screenshots · Multi-shot set | Team review, stakeholder feedback | Phase 2 |
| Tier 3 | MP4/GIF · Editable PPTX | Presentation, animated walkthrough | Phase 2 |

### Tier Rationale

- **Tier 1**: Every design deliverable needs a source file and a visual snapshot. This is the minimum viable export.
- **Tier 2**: Real review workflows involve comparing multiple states, marking up screenshots, and capturing sets of views (mobile + desktop + hover states). This is where review-pack lives.
- **Tier 3**: Stakeholder presentations may need video walkthroughs or editable slide files. Heavy dependencies (FFmpeg, pptxgenjs).

---

## Tier 1 — Core Deliverables (V1)

### HTML Source
Always exported — HTML is the source of truth.
```bash
cp generated.html state/artifacts/{slug}.html
```

### Screenshot (PNG/JPEG)
```javascript
// scripts/playwright/screenshot.js
const screenshot = await page.screenshot({
  type: 'png', // or 'jpeg'
  fullPage: true,
  path: `state/artifacts/${slug}.png`
});
```

### PDF Export
```javascript
// scripts/playwright/pdf.js
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  path: `state/artifacts/${slug}.pdf`
});
```

**Note**: Playwright PDF uses Chromium print. For better pagination, Phase 2 may add LibreOffice headless.

### ZIP Export (Tier 1)
```bash
cd state/artifacts
zip -r ${slug}-export.zip ${slug}.html
# If assets folder exists:
zip -r ${slug}-export.zip assets/
```

### Output Naming Convention (Tier 1)
```
state/artifacts/
  ├── {slug}.html          # Source
  ├── {slug}.png           # Full-page screenshot
  ├── {slug}.pdf           # PDF export
  └── {slug}-export.zip    # Archive (optional)
```

---

## Tier 2 — Review Pack (Phase 2)

A review pack is a structured collection of assets and metadata designed for team review workflows.

### Contents

| Asset | Purpose |
|-------|---------|
| Annotated screenshot(s) | Marked-up images with callout annotations |
| Multi-shot set | Mobile + desktop + tablet viewports in one session |
| Verification JSON | Machine-readable smoke test results |
| Diff screenshot | Compare against baseline if baseline exists |
| Metadata JSON | Artifact name, generation timestamp, viewport info |

### Annotated Screenshots

Use Playwright to capture base screenshot, then overlay annotations (callout boxes, arrows, text labels) using HTML/CSS overlay rendered in a second pass, or via Canvas API in a node script.

### Multi-Shot Set

```javascript
// Export at multiple viewports
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 }
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.screenshot({ path: `state/artifacts/${slug}-${vp.name}.png` });
}
```

### Review Pack Structure
```
state/review-packs/{slug}/
  ├── metadata.json          # Artifact info, timestamp, viewport
  ├── smoke-result.json      # Playwright verification result
  ├── screenshots/           # Clean screenshots (preserved)
  │   ├── {slug}-desktop.png
  │   ├── {slug}-mobile.png
  │   └── {slug}-tablet.png
  ├── annotated/             # Annotated versions (Phase 3)
  │   ├── {slug}-desktop-annotated.png
  │   ├── {slug}-mobile-annotated.png
  │   └── {slug}-tablet-annotated.png
  └── index.html            # Contact sheet (clean | annotated tabs)
```

---

## Tier 3 — Presentation Formats (Phase 2)

| Format | Technical Approach |
|--------|-------------------|
| MP4 | Playwright `recordVideo()` + FFmpeg concat/trim |
| GIF | Playwright screenshot sequence + FFmpeg convert |
| PPTX | PptxGenJS (Node.js, declarative API) |
| SVG | CSS @page / print stylesheet to vector |

**Phase 2 note**: These require additional runtime dependencies (FFmpeg, pptxgenjs). See `startup-wrapper-delta.md` for what needs to be added to the wrapper.

---

## Multi-Slide Deck Export

Each slide is exported as a separate PNG; slides are also assembled into a multi-page PDF via `pdf-lib`:

```
state/decks/{slug}/
  ├── slides/
  │   ├── {slug}-slide-01.png
  │   ├── {slug}-slide-02.png
  │   └── ...                 (one PNG per slide)
  ├── pdf-pages/              (intermediate single-page PDFs)
  │   ├── page-01.pdf
  │   └── ...
  ├── {slug}-slides.pdf       (merged multi-page PDF)
  ├── {slug}-cover.png        (slide-1 preview)
  └── metadata.json
```

Run: `node scripts/export_deck.js --deck <path> --slug <name> [--out-dir <dir>]`

---

## Artifact Diff (Phase 3)

Compare two artifact versions (HTML or screenshots) for structural and visual delta:

```
state/diffs/{slug}/
  ├── metadata.json           # Input paths, generation time
  ├── diff-summary.json      # Structured delta: totalChanges, added, removed, changed, sample
  ├── {slug}-compare.html    # Side-by-side viewer: old | new | structural delta table
  ├── old-screenshot.png     # (captured or copied)
  └── new-screenshot.png     # (captured or copied)
```

Run: `node scripts/diff_artifact.js --old <path> --new <path> --slug <name> [--out-dir <dir>]`

The HTML structural delta is tag-level, showing exact changed/added/removed lines. Screenshots are always captured at 1280×800 desktop viewport.

---

## Export Workflow (Full)

```
Generate artifact (HTML/CSS/JS)
  └─→ Store in state/artifacts/{slug}.html
        └─→ Run Playwright smoke test
              └─→ Collect requested tier outputs:
                    Tier 1: screenshot() + pdf() + zip
                    Tier 2: multi-viewport + review-pack (Phase 2)
                    Tier 3: video/animation (Phase 2)
              └─→ Report output paths to user
```

---

## Phase 2 Export Considerations

| Format | Technical Approach |
|--------|-------------------|
| MP4 | Playwright recordVideo + FFmpeg concat |
| GIF | Playwright screenshot sequence + FFmpeg |
| PPTX | PptxGenJS (Node.js, declarative) |
| SVG | CSS @page / print stylesheet |