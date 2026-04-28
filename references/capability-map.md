# V1 Capability Map

## Overview
Capabilities mapped by task type, covering: HTML prototype, Slide deck, Design critique, Playwright verification, and Export pipeline.

---

## 1. HTML Prototype

| Capability | V1? | Notes |
|-----------|-----|-------|
| Single-page HTML generation | ✅ | Responsive, no backend |
| Multi-section landing page | ✅ | Up to ~10 sections |
| Form-based page (static) | ✅ | No backend, just UI |
| Navigation / routing (client-side) | ✅ | Hash-based SPA |
| CSS Grid + Flexbox layouts | ✅ | Industry standard |
| Dark / light mode support | ✅ | CSS custom properties |
| User-provided asset injection | ✅ | User provides images/logos |
| User-provided copy/content | ✅ | User provides text |
| Dynamic data binding | ❌ | Phase 2 (JS interop) |
| Real-time collaboration | ❌ | Out of scope |
| Backend API integration | ❌ | Not a design task |

---

## 2. Slide / Deck Deliverables

| Capability | V1? | Notes |
|-----------|-----|-------|
| HTML slide deck (single file) | ✅ | Print-friendly + screen |
| Markdown-driven content model | ✅ | Compose from user text |
| Slide theme system (CSS vars) | ✅ | 2-3 built-in themes |
| Keyboard navigation (arrow keys) | ✅ | Standalone HTML |
| Auto-play / presenter mode | ❌ | Phase 2 |
| Animated transitions between slides | ⚠️ | Minimal CSS only, Phase 2 |
| Speaker notes | ❌ | Phase 2 |
| Multi-column / rich layouts | ✅ | CSS Grid/Flexbox |

---

## 3. Design Critique / Review

| Capability | V1? | Notes |
|-----------|-----|-------|
| Heuristic review (Nielsen-based) | ✅ | 10-point check |
| Layout / hierarchy critique | ✅ | Static analysis |
| Color contrast check | ✅ | WCAG AA formula |
| Typography consistency check | ✅ | Font scale analysis |
| Accessibility surface review | ✅ | Alt text, ARIA labels |
| Screenshot-based design review | ✅ | User uploads image |
| Interactive prototype walkthrough | ❌ | Phase 2 |
| A/B design comparison | ❌ | Phase 2 |

---

## 4. Playwright Verification

| Capability | V1? | Notes |
|-----------|-----|-------|
| Page loads without crash | ✅ | `page.goto()` + no error |
| No console errors (Error level) | ✅ | `console` event listener |
| Element visibility check | ✅ | `expect(locator).toBeVisible()` |
| Screenshot comparison (smoke) | ✅ | Full-page screenshot |
| Responsive layout check | ✅ | Mobile / desktop viewport |
| Form submission smoke test | ✅ | UI only, no backend |
| Network request interception | ⚠️ | Basic, Phase 2 |
| Performance metrics | ❌ | Phase 2 |

---

## 5. Export Pipeline

| Export Format | V1? | Priority | Notes |
|--------------|-----|----------|-------|
| HTML source | ✅ | P0 | Always export as source |
| PNG screenshot | ✅ | P0 | Playwright `screenshot()` |
| PDF | ✅ | P1 | Playwright `pdf()` |
| JPEG screenshot | ✅ | P1 | Playwright `screenshot(type='jpeg')` |
| MP4 / GIF (animated) | ❌ | P2 | Phase 2 |
| PPTX (editable) | ❌ | P2 | Phase 2 |
| SVG | ⚠️ | P2 | Limited support |

### Export Priority Rationale
- **P0**: HTML + PNG are the core deliverables — a rendered artifact + visual record
- **P1**: PDF for shareability, JPEG for thumbnails/previews
- **P2**: MP4/GIF needs video encoding (heavy dependency), PPTX needs binary format library

---

## 6. UX/UI Design (dedicated task)

| Capability | V1? | Notes |
|-----------|-----|-------|
| Wireframe generation | ✅ | HTML-based low-fi |
| High-fidelity mockup (HTML) | ✅ | CSS-styled, static |
| Component palette | ✅ | Buttons, cards, nav, etc. |
| Design token output (CSS vars) | ✅ | Colors, spacing, type |
| Responsive preview | ✅ | Multi-viewport screenshot |
| Mobile-first layout | ✅ | CSS built mobile-up |
| User flow / sitemap diagram | ❌ | Phase 2 |

---

## 7. Web Design (dedicated task)

| Capability | V1? | Notes |
|-----------|-----|-------|
| Landing page | ✅ | Marketing / product |
| Portfolio page | ✅ | Image-forward |
| Blog / article page | ✅ | Typography-focused |
| Dashboard / admin layout | ✅ | Grid-based |
| E-commerce product page | ✅ | Static mockup |
| Coming soon / event page | ✅ | Single page |
| Multi-page site (up to 5 pages) | ⚠️ | Phase 2 |
| CMS-backed site | ❌ | Not a design task |

---

## Phase Tag Key
- ✅ = In V1 scope
- ⚠️ = Partial / deferred to Phase 2
- ❌ = Not planned / out of scope
