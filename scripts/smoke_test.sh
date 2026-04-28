#!/bin/bash
# smoke_test.sh — End-to-end smoke test for the visual-design-studio skill pipeline
# Runs: setup (if needed) → demo artifact → smoke → screenshot → pdf → report

set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SKILL_DIR"

ARTIFACT_DIR="$SKILL_DIR/state/artifacts"
VERIFY_DIR="$SKILL_DIR/state/verify"

echo "============================================"
echo "  visual-design-studio pipeline smoke test"
echo "============================================"

# 0. Ensure setup is done
if [ ! -d "node_modules" ]; then
  echo ""
  echo "[SETUP] Running skill setup (first time)..."
  bash scripts/setup.sh
else
  echo "[SETUP] Dependencies present, skipping install"
fi

# 1. Verify demo artifact exists
DEMO_HTML="$ARTIFACT_DIR/demo-dashboard.html"
if [ ! -f "$DEMO_HTML" ]; then
  echo "ERROR: $DEMO_HTML not found. Run the skill first to generate it."
  exit 1
fi
echo ""
echo "[1/4] Demo artifact found: $DEMO_HTML"

# 2. Smoke test
echo ""
echo "[2/4] Running smoke test..."
SMOKE_OUT="$VERIFY_DIR/smoke-demo-dashboard.json"
node scripts/playwright/smoke.js.cjs \
  --target "$DEMO_HTML" \
  --output "$SMOKE_OUT" \
  --viewport-w 1280 --viewport-h 800

# 3. Screenshot
echo ""
echo "[3/4] Capturing screenshot..."
SCREENSHOT="$ARTIFACT_DIR/demo-dashboard.png"
node scripts/playwright/screenshot.js.cjs \
  --target "$DEMO_HTML" \
  --output "$SCREENSHOT" \
  --viewport-w 1280 --viewport-h 800 \
  --full-page

# 4. PDF
echo ""
echo "[4/4] Exporting PDF..."
PDF_OUT="$ARTIFACT_DIR/demo-dashboard.pdf"
node scripts/playwright/pdf.js.cjs \
  --target "$DEMO_HTML" \
  --output "$PDF_OUT" \
  --format A4

# 5. Report
echo ""
echo "============================================"
echo "  Pipeline complete — output artifacts"
echo "============================================"
echo ""
ls -lh "$ARTIFACT_DIR"
echo ""
echo "Artifacts:"
[ -f "$DEMO_HTML" ]    && echo "  HTML:   $DEMO_HTML"
[ -f "$SCREENSHOT" ]   && echo "  PNG:    $SCREENSHOT"
[ -f "$PDF_OUT" ]      && echo "  PDF:    $PDF_OUT"
[ -f "$SMOKE_OUT" ]    && echo "  Smoke:  $SMOKE_OUT"
echo ""
echo "Smoke result:"
cat "$SMOKE_OUT" | head -5
echo ""
echo "Done."