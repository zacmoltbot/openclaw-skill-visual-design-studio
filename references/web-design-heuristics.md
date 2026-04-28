# Web Design Heuristics — Specific to Web Page Design

## Purpose
Complement to ui-ux-heuristics.md — focused on web-specific design concerns.

---

## Page Structure Heuristics

### Layout
- [ ] Page has a clear header, body, footer structure
- [ ] Content width is readable (max-width: 65ch for body text)
- [ ] Layout is responsive (works at 320px, 768px, 1280px+)
- [ ] Grid or flexbox used appropriately (not tables for layout)

### Visual Pacing
- [ ] Hero section is immediately scannable
- [ ] Sections have clear visual separation
- [ ] Text blocks are not too dense
- [ ] Images break up text appropriately

---

## Typography Heuristics

- [ ] Font sizes follow a clear scale (at least 3 distinct sizes)
- [ ] Line height is comfortable (1.4–1.6 for body, 1.2 for headings)
- [ ] Line length is readable (45–75 characters per line)
- [ ] Font weight used for emphasis (not ALL CAPS or italics alone)
- [ ] Web-safe or properly loaded fonts (no FOUT if possible)

---

## Color Heuristics

- [ ] Color palette is limited (≤ 5 colors + neutral)
- [ ] Primary action is visually distinct
- [ ] Error states are red, success is green (don't rely on color alone)
- [ ] Dark text on light background (or reverse)
- [ ] Contrast ratio ≥ 4.5:1 (normal text), ≥ 3:1 (large text)

---

## Interaction Heuristics

- [ ] Links are visually distinguishable from body text
- [ ] Hover states are provided for interactive elements
- [ ] Focus states are visible (keyboard navigation)
- [ ] Buttons have a pressed / active state
- [ ] Animations are not distracting (no motion for motion's sake)

---

## Performance Heuristics (Design-Time)

- [ ] No autoplay media
- [ ] No carousels as primary content (hard to use, slow)
- [ ] Images sized appropriately (not 4000px wide for a thumbnail)
- [ ] No 10MB background images

---

## Responsive Breakpoints (V1)

```css
/* Mobile first */
@media (min-width: 640px) { /* sm: tablet */ }
@media (min-width: 768px) { /* md: tablet landscape */ }
@media (min-width: 1024px) { /* lg: desktop */ }
@media (min-width: 1280px) { /* xl: large desktop */ }
```

---

## Navigation Patterns

| Pattern | Best For | V1 Support |
|---------|----------|------------|
| Top bar + dropdowns | Desktop-first sites | ✅ |
| Hamburger + drawer | Mobile-first | ✅ |
| Sidebar | Dashboard / admin | ✅ |
| Footer nav | Simple / single-page | ✅ |
| Sticky header | Content-heavy sites | ✅ |
