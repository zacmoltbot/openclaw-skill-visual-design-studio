# Startup Wrapper Delta

## Purpose

Document the **real** runtime requirements and setup strategy for `visual-design-studio` skill, so it can run reliably in a Zeabur/Node environment — including after container restarts.

---

## The Problem with "Almost No Wrapper Change Needed"

The Phase 1 analysis said Playwright "almost certainly" works in the OpenClaw environment. That's an assumption, not a guarantee. This document plans for the **real** setup path.

Three concrete risks:
1. Playwright's browser binaries are large (~150MB chromium) — they may not be pre-installed
2. `npm install playwright` inside the skill directory may conflict with workspace-level node_modules
3. After a Zeabur cold restart, the skill's `node_modules/` may not survive (ephemeral filesystem)

---

## Skill-Inclusive Setup Strategy (No Wrapper Changes Required)

The skill must be **fully self-contained** and **idempotent**. It installs its own runtime dependencies on first run, survives restarts via re-install, and doesn't depend on pre-existing global Playwright.

### What `scripts/setup.sh` Must Do

```sh
#!/bin/bash
# Idempotent — safe to run multiple times

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SKILL_DIR"

# 1. Install npm deps in skill context (not global)
if [ ! -d "node_modules" ]; then
  npm install --package-lock-only
  npm install
fi

# 2. Install Chromium browser binary (in skill-local path)
export PLAYWRIGHT_BROWSERS_PATH="$SKILL_DIR/.playwright-browsers"
if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
  mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  npx playwright install chromium
fi

# 3. Create state directories
mkdir -p state/artifacts state/verify

# 4. Make scripts executable
chmod +x scripts/playwright/*.js 2>/dev/null || true

echo "setup complete"
```

### Why This Works After Restart

- `npm install` is idempotent — fast if deps already present locally
- Playwright browsers are stored at `$SKILL_DIR/.playwright-browsers/` — survives as long as the persistent volume survives
- If the entire skill directory is wiped (Zeabur ephemeral disk), setup re-downloads everything on first `setup.sh` run
- No reliance on global `playwright` package or system-installed browsers

---

## Wrapper Integration: What We'd Ask the Startup Script to Support

If the OpenClaw startup wrapper (`startup-zeabur.sh`) is being updated, these are the concrete asks:

### P0 (Must Have)

| Item | Ask | Rationale |
|------|-----|-----------|
| Node.js 18+ | Confirm present | Already required by OpenClaw core |
| npm | Confirm present | Already required |
| writeable `$SKILL_DIR` | Persistent volume mount | Skill needs to write `node_modules/` and `.playwright-browsers/` |
| internet access | Allow download of chromium | Needed for `npx playwright install` on first run |
| `/tmp` dir | Writable temp space | Playwright uses `/tmp` for browser profile |

### P1 (Should Have)

| Item | Ask | Rationale |
|------|-----|-----------|
| ~500MB disk headroom | For chromium + deps | First-run download is ~200MB |
| Ability to run `exec` with long timeout | For playwright install | Browser download may take 2-3 min on cold install |

### P2 (Nice to Have, Deferred)

| Item | Ask | Rationale |
|------|-----|-----------|
| Python 3.11+ | Phase 2+ | For matplotlib-based data viz |
| LibreOffice headless | Phase 2+ | Better PDF pagination than Chromium print |
| FFmpeg | Phase 2+ | MP4/GIF export |

---

## Runtime Behavior After Zeabur Restart

```
Container starts
  └─→ startup-zeabur.sh runs (does NOT know about our skill)
        └─→ Skill is first triggered (lazy bootstrap)
              └─→ scripts/setup.sh runs
                    └─→ npm install + playwright install (2-3 min first time)
                          └─→ Skill scripts usable
                                └─→ Subsequent runs: instant (deps cached)
```

**Key insight**: The skill's runtime only needs to exist when the skill is actually invoked. It does NOT need to be pre-warmed by the wrapper.

---

## What the Wrapper Does NOT Need to Change

- No Docker image changes needed for V1
- No Python runtime in V1
- No system package installations
- No cron jobs or background services
- No port allocations beyond what's already in use

---

## Phase 2 Wrapper Changes (Deferred)

If Phase 2 adds Python or FFmpeg:

1. **Python**: Add to wrapper as a separate runtime environment (conda or venv)
2. **LibreOffice**: `apt-get install libreoffice-impress` (Debian/Ubuntu)
3. **FFmpeg**: `apt-get install ffmpeg` or static binary

All Phase 2 changes require explicit wrapper PR — do not silently add dependencies.