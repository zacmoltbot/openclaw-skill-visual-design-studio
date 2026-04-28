# Clean-Room Boundary — What We Can and Cannot Do

## Purpose
Clear boundary document so the skill avoids copyright, IP, or licensing issues while still learning from existing open-source projects.

---

## ✅ CAN Learn From (Safe Layers)

### Workflow / Process Design
- How a design request flows through: intake → draft → review → export
- Trigger conditions and task classification logic
- Verification checkpoint placement in the pipeline
- Error handling and fallback strategies

### Capability Architecture
- What features a design tool should expose (slides, prototypes, critique)
- Feature prioritization for V1 / V2 / V3
- Export pipeline staging
- Runtime selection (single vs. dual)

### Design Principles / Heuristics
- Usability heuristics (Nielsen's 10, or equivalent)
- Visual hierarchy principles
- Color theory basics
- Typography guidelines
- Accessibility standards (WCAG 2.1 AA)
- Responsive design breakpoints

### Verification Thinking
- How to smoke-test a design automatically
- What to check (load, no-crash, basic interaction)
- How to report verification results

---

## ❌ CANNOT Copy (Restricted Layers)

### Prohibited
1. **Source code** — No direct code from any reference project (including huashu-design)
2. **Scripts / CLIs** — No copy of build scripts, generators, or automation pipelines
3. **文案 / Copy** — No wording, UI strings, documentation text, or marketing copy
4. **Assets** — No images, icons, fonts, SVGs, or multimedia from reference sources
5. **Reference content** — No Slidev demo decks, PptxGenJS templates, GrapesJS blocks, Penpot files, Motion Canvas animations
6. **Showcases** — No screenshots, mockups, or design showcases from any of these projects
7. **BGM / Audio** — No audio files from any source
8. **Branding / Packaging** — No logos, names, or branding elements from the reference projects
9. **Configuration files** — No `.json`, `.yaml`, `.toml` configs copied from reference repos

### Specific Red Lines
- DO NOT use `github.com/slidevjs/slidev` source as a reference for our slide rendering
- DO NOT use PptxGenJS API signatures verbatim in our code
- DO NOT use GrapesJS block definitions as our block definitions
- DO NOT port huashu-design's CSS classes or JS functions
- DO NOT reproduce "inspiration" galleries or mood boards from these projects

---

## ⚠️ Gray Areas — Use Judgment

| Item | Judgment |
|------|----------|
| General software architecture patterns (MVC, event bus) | ✅ OK — industry common knowledge |
| Nielsen's 10 Usability Heuristics | ✅ OK — public domain |
| CSS Grid / Flexbox layout patterns | ✅ OK — industry standard |
| Playwright API patterns | ✅ OK — official API is public |
| HTML5 semantic element usage | ✅ OK — web standard |
| Open-source library API concepts (e.g., "declarative config") | ⚠️ OK if reimplemented from scratch |
| Color palette theory (complementary, analogous) | ✅ OK — public domain |
| The *idea* of block-based composition | ⚠️ OK as concept; must be original implementation |

---

## Enforcement

- All generated code must be original composition
- All assets must come from: user-provided, CC0/PD sources, or generated from scratch
- Before using any snippet from the web, confirm it is either public domain, MIT/CC0 licensed, or original
- When in doubt, re-implement from description rather than copy-paste
