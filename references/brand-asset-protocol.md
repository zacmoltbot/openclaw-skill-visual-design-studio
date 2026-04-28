# Brand Asset Protocol

## Purpose
Define how to handle brand identity when user provides it vs. when they don't.

---

## When User Provides Brand Assets

User may provide:
- Logo (SVG, PNG)
- Brand colors (hex codes or CSS)
- Typography (web font URLs or font files)
- Brand guidelines (PDF or URL)

**Protocol:**
1. Extract and validate provided assets
2. Map brand colors → CSS custom properties
3. Apply logo in header/nav positions
4. Do NOT modify provided assets
5. Store reference to brand config in `state/{session}/brand.json`

---

## When No Brand Provided

**Default to neutral, professional baseline:**
- Colors: `--vds-color-primary: #2563eb; --vds-color-bg: #ffffff; --vds-color-text: #1f2937;`
- Typography: system font stack (no external fonts)
- No logo (omit or use text mark)
- Neutral spacing and layout

---

## CSS Custom Properties (V1 Design Tokens)

```css
:root {
  /* Colors */
  --vds-color-primary: #2563eb;
  --vds-color-secondary: #64748b;
  --vds-color-accent: #f59e0b;
  --vds-color-bg: #ffffff;
  --vds-color-bg-alt: #f8fafc;
  --vds-color-text: #1f2937;
  --vds-color-text-muted: #6b7280;
  --vds-color-border: #e5e7eb;

  /* Typography */
  --vds-font-sans: system-ui, -apple-system, sans-serif;
  --vds-font-mono: ui-monospace, monospace;
  --vds-font-size-base: 1rem;
  --vds-font-size-sm: 0.875rem;
  --vds-font-size-lg: 1.125rem;
  --vds-font-size-xl: 1.25rem;
  --vds-font-size-2xl: 1.5rem;
  --vds-font-size-3xl: 1.875rem;
  --vds-font-size-4xl: 2.25rem;

  /* Spacing */
  --vds-space-1: 0.25rem;
  --vds-space-2: 0.5rem;
  --vds-space-4: 1rem;
  --vds-space-6: 1.5rem;
  --vds-space-8: 2rem;
  --vds-space-12: 3rem;
  --vds-space-16: 4rem;

  /* Border Radius */
  --vds-radius-sm: 0.25rem;
  --vds-radius-md: 0.5rem;
  --vds-radius-lg: 0.75rem;
  --vds-radius-full: 9999px;

  /* Shadows */
  --vds-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --vds-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --vds-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## Asset Rules

- **Logo**: SVG preferred, max 200px wide, transparent background
- **Images**: User-provided only in V1; no stock photo fetching
- **Icons**: Inline SVG only (no icon font CDN in V1)
- **Fonts**: System stack only in V1; Google Fonts optional Phase 2
