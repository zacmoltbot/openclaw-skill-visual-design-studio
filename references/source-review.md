# Source Review — Clean-Room Analysis

## Purpose
Document what we learn from each reference source and what we explicitly DO NOT copy.

---

## 1. huashu-design (internal reference)

**What we borrow:**
- Overall skill structure / workflow concept
- How the skill bridges user request → artifact → verification
- The notion of brand-asset-protocol for consistent styling
- Trigger phrase patterns

**What we do NOT copy:**
- Any actual design assets, scripts, or configuration
- CSS classes, component names, or design tokens
- Wording, copy, or UI strings
- Any file paths, variable names, or implementation details

---

## 2. Slidev (slidev.js.org)

**What we borrow (workflow / capability):**
- Markdown-driven slide content model (composition over tools)
- The concept of a slide deck as a web artifact
- Presenter mode / auto-export flow
- Theme layering idea (base → brand overrides)

**What we do NOT copy:**
- Slidev source code, themes, or components
- Any `.md` or `.vue` file patterns
- The Slidev CLI or build pipeline
- Any actual slide content or demo decks

---

## 3. PptxGenJS

**What we borrow (workflow / capability):**
- Deck generation as a programmatic pipeline
- Slide → shape → text model for structuring content
- The idea of declarative slide composition

**What we do NOT copy:**
- PptxGenJS source code or API patterns verbatim
- Any `.pptx` file output or internal formats
- Any template decks or demo scripts
- The library itself (our export is HTML-first, not PPTX-first)

---

## 4. Motion Canvas

**What we borrow (workflow / capability):**
- Animation as code concept (thinking about time-based design)
- The notion of exporting to video from a canvas
- Component-based animation composition

**What we do NOT copy:**
- Motion Canvas source code, TypeScript files, or animation graphs
- Any `.ts` animation scripts
- The video pipeline or rendering engine

---

## 5. Penpot

**What we borrow (workflow / capability):**
- Design tool as a collaborative platform concept
- The design → prototype → inspect workflow
- SVG/vector export thinking

**What we do NOT copy:**
- Penpot source code, UI, or assets
- Any Penpot design files, templates, or showcases
- The Penpot branding or UX patterns

---

## 6. GrapesJS

**What we borrow (workflow / capability):**
- Block-based web page composition concept
- The idea of a web page as composable components
- Style manager / layer manager mental model

**What we do NOT copy:**
- GrapesJS source code, plugins, or block presets
- Any HTML/CSS templates from GrapesJS demos
- The GrapesJS branding or documentation wording

---

## Summary: Borrowed vs. Not Copied

| Source | Borrowed (concepts) | Not Copied |
|--------|---------------------|------------|
| huashu-design | Skill structure, trigger logic, workflow | Assets, scripts, copy |
| Slidev | Markdown-deck model, export flow | Source, themes, content |
| PptxGenJS | Programmatic deck composition | Code, API, templates |
| Motion Canvas | Time-based animation thinking | Source, TS files |
| Penpot | Design-prototype-inspect flow | Source, files, UI |
| GrapesJS | Block composition, component model | Source, blocks, templates |
