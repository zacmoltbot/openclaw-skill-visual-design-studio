# Runtime Plan — Playwright & Rendering Runtime

## Decision: Single Playwright (Node.js) for V1

### Rationale

| Option | Pros | Cons |
|--------|------|------|
| Single Playwright (Node.js) | Simple deployment, one runtime, @playwright/test is mature | No Python ecosystem for data viz |
| Dual (Node.js + Python) | Access to matplotlib/plotly for charts | Extra container complexity, more to deploy |
| Python-first | Rich visualization libs | Playwright is an afterthought in Python, not the primary use |

**Decision: Single Playwright (Node.js)**

V1 use cases are:
1. HTML prototype → Playwright renders it
2. Screenshot/PDF export → Playwright does this natively
3. Smoke test → Playwright is purpose-built for this

No chart-heavy or data-viz use case in V1 that demands Python.

---

## V1 Runtime Stack

```
Node.js (v18+)  ← runtime host
  └── playwright  (npm package)  ← browser automation
        └── chromium  ← default headless browser
```

- No Python in V1
- No browser pre-install step (Playwright auto-downloads browsers)
- Optional: Firefox / WebKit for cross-browser screenshot (Phase 2)

---

## Phase 2 Runtime Considerations (Dual Runtime)

If Phase 2 needs Python (e.g., data viz, matplotlib charts, pandas-driven slides):

```
Zeabur service:
  Primary: Node.js (Playwright)
  Sidecar: Python (FastAPI or plain script)
    └─→ communicate via tmp files or local HTTP
```

**Decision deferred to Phase 2. Do not implement dual runtime in V1 skeleton.**

---

## Playwright Script Patterns (V1)

All scripts live in `scripts/` directory:

| Script | Purpose |
|--------|---------|
| `playwright/screenshot.js` | Full-page screenshot via CLI |
| `playwright/pdf.js` | PDF export via CLI |
| `playwright/smoke.js` | Smoke test (load + no errors) |
| `playwright/verify.js` | Verification with element checks |

All scripts:
- Accept JSON config via `--config` flag or env vars
- Output to `state/` directory
- Return exit code 0 on success, non-zero on failure
- Log structured JSON to stdout on completion

---

## Browser Selection

- **Chromium** — default for V1 (Chrome-compatible, fastest)
- **Firefox** — Phase 2 (cross-browser testing)
- **WebKit** — Phase 2 (Safari compatibility)

Install via: `npx playwright install chromium` (Phase 1 implementation task)

---

## Headless vs. Headed

- **Headless** — default for all V1 automation
- ** headed** — only for manual debugging (not in scripts)

---

## Container / Zeabur Notes

- Playwright's browser binaries are downloaded at install time
- No system-level browser dependency needed
- Chromium headless works in Zeabur's Node.js service container
- Recommended: set `PLAYWRIGHT_BROWSERS_PATH=/tmp/playwright-browsers` in env
