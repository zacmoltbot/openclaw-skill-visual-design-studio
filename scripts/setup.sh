#!/bin/bash
# setup.sh — Idempotent skill setup for visual-design-studio
# Safe to run multiple times; only does work when needed.

set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SKILL_DIR"

echo "=== visual-design-studio setup ==="

# 1. Install npm deps if not present
if [ ! -d "node_modules" ]; then
  echo "[1/4] Installing npm dependencies..."
  npm install
else
  echo "[1/4] npm dependencies already present, skipping"
fi

# 2. Install Playwright Chromium browser if not present
PLAYWRIGHT_BROWSERS_PATH="$SKILL_DIR/.playwright-browsers"
if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
  echo "[2/4] Installing Playwright Chromium (first run ~2 min)..."
  mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  export PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH"
  npx playwright install chromium
else
  echo "[2/4] Playwright Chromium already installed, skipping"
fi

# 3. Create state directories
echo "[3/4] Creating state directories..."
mkdir -p state/artifacts state/verify
echo "  state/artifacts/ — created"
echo "  state/verify/   — created"

# 4. Make JS scripts executable
echo "[4/4] Setting script permissions..."
chmod +x scripts/playwright/*.js 2>/dev/null || true

echo "=== setup complete ==="
echo "Run 'bash scripts/smoke_test.sh' to verify the pipeline."