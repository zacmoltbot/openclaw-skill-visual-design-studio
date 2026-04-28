---
name: visual-design-studio
description: Generate HTML prototypes, slide decks, and visual deliverables; verify with Playwright smoke tests; export to screenshot/PDF.
---

# Visual Design Studio

## When to Trigger

**YES** when user asks for: HTML page / prototype, landing page, slide deck, UI/UX design, wireframe, mockup, design critique, screenshot export, PDF export, or verification that a design works in browser.

**NO** when: full-stack coded app needed → `coding_agent`; database-backed dynamic site → `coding_agent`; pure graphic art without web output → external tool.

## Supported Task Types (V1)

| Task | Description |
|------|-------------|
| HTML Prototype | Single-page, responsive, no backend |
| Slide Deck | HTML-based, exportable to screenshot/PDF |
| Design Critique | Heuristic review against defined principles |
| Playwright Verification | Smoke-test artifact in headless browser |
| Export Pipeline | HTML + screenshot + PDF output |

## Workflow

```
User request
  └─→ Identify task type
        └─→ Read relevant references (capability-map, workflows, etc.)
              └─→ Generate artifact (HTML/CSS/JS)
                    └─→ Playwright smoke test
                          └─→ Export (screenshot / PDF)
                                └─→ Present paths to user
```

## Reference Loading

| Task | References to read |
|------|-------------------|
| HTML prototype | `references/capability-map`, `references/workflows`, `references/web-design-heuristics`, `references/brand-asset-protocol` |
| Slide deck | `references/capability-map`, `references/workflows`, `references/design-directions`, `references/export-guide` |
| Design critique | `references/capability-map`, `references/critique-framework`, `references/ui-ux-heuristics` |
| Playwright verification | `references/playwright-verification`, `references/workflows` |
| Export | `references/export-guide` |

## Export Tiers

- **Tier 1 (V1)**: HTML / PNG / PDF — always available
- **Tier 2 (Phase 2)**: review pack / annotated screenshots / multi-shot set
- **Tier 3 (Phase 2)**: MP4/GIF / editable PPTX — needs FFmpeg + extra libs

## Runtime

**Node.js + Playwright only** — no Python in V1. All scripts run via `scripts/*.sh` or `scripts/playwright/*.js`.

## Constraints

- No external assets unless user provides or CC0/PD
- No fonts/colors/branding copied from reference sources
- All generated content must be original composition
- Playwright verification is smoke-only (not full regression)

## V1 Scope (Explicit)

**IN scope:** HTML prototype (single page, responsive) · Slide deck (HTML, screenshot export) · Design critique (heuristic review) · Playwright verification (smoke) · Export: HTML + screenshots + PDF

**OUT of scope for V1:** animated video output (MP4/GIF) · editable PPTX · motion graphics · collaborative design editing · backend integration

## Key References

- `references/trigger-matrix.md` — exact activation rules
- `references/startup-wrapper-delta.md` — runtime setup strategy
- `references/playwright-verification.md` — smoke test protocol
- `references/export-guide.md` — tiered export format guide
- `references/capability-map.md` — full capability matrix
- `references/clean-room-boundary.md` — IP/licensing boundaries