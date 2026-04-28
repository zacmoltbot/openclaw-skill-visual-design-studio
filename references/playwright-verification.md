# Playwright Verification — Automated Smoke Testing

## Purpose
Define the automated verification layer using Playwright for V1-generated artifacts.

---

## What Gets Verified (V1)

Every generated HTML artifact gets a smoke test:

1. **Page loads** — HTTP 200 / file:// loads without crash
2. **No console errors** — Error-level console messages are captured
3. **Key element visible** — At least one meaningful element is visible (e.g., `h1`, `.hero`)
4. **Full-page screenshot** — Captured for human review

Optional per task:
- **Form interaction** — Type + submit smoke test
- **Navigation** — Click a nav link, verify page state changes
- **Responsive** — Test at mobile + desktop viewport

---

## Verification Script Interface

```javascript
// scripts/playwright/smoke.js
// Usage: node smoke.js --target {path|URL} --output {report.json}
```

**Config object:**
```json
{
  "target": "state/artifacts/my-design.html",
  "viewport": { "width": 1280, "height": 800 },
  "checks": {
    "load": true,
    "consoleErrors": true,
    "elementVisible": "h1",
    "screenshot": true
  },
  "output": "state/verify/my-design-smoke.json"
}
```

**Report schema:**
```json
{
  "passed": true,
  "target": "...",
  "checks": {
    "load": { "passed": true, "duration_ms": 842 },
    "consoleErrors": { "passed": true, "errors": [] },
    "elementVisible": { "passed": true, "selector": "h1" },
    "screenshot": { "passed": true, "path": "state/verify/my-design.png" }
  },
  "timestamp": "2026-04-28T00:00:00.000Z"
}
```

---

## Screenshot Verification (Phase 2)

In V1, screenshots are for human review. In Phase 2:
- Store baseline screenshot
- Compare new screenshot to baseline
- Report pixel diff percentage
- FAIL if diff > threshold (e.g., 5%)

---

## Running Verification

```bash
# Smoke test a local HTML file
node scripts/playwright/smoke.js --target ./state/artifacts/my-design.html

# Smoke test a URL
node scripts/playwright/smoke.js --target http://localhost:3000

# With custom config
node scripts/playwright/smoke.js --config ./my-verify-config.json
```

---

## Playwright Setup

```bash
npm install playwright
npx playwright install chromium
```

---

## V1 Verification Does NOT Include

- API mocking
- Performance benchmarking
- Accessibility audit (beyond basic checks)
- Security scanning
- Cross-browser regression
- All of these → Phase 2
