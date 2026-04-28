#!/usr/bin/env bash
# demo_pipeline.sh — End-to-end smoke test for the visual-design-studio skill
#
# Runs: review-pack  →  critique  →  deck generation + export
# Reports artifact paths at the end.
#
# Usage: bash scripts/demo_pipeline.sh [--skip-deck]

set -e

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$SKILL_ROOT/state"
ARTIFACTS_DIR="$STATE_DIR/artifacts"
DEMO_ARTIFACT="$ARTIFACTS_DIR/demo-dashboard.html"

echo "═══════════════════════════════════════════════════"
echo "  visual-design-studio  ·  demo pipeline"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Review Pack ──────────────────────────────────────────────
echo "━━━ 1/3  Review Pack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -f "$DEMO_ARTIFACT" ]; then
  echo "⚠️  Demo artifact not found at $DEMO_ARTIFACT"
  echo "   Falling back to prototype-shell.html"
  DEMO_ARTIFACT="$SKILL_ROOT/assets/prototype-shell.html"
fi

REVIEW_DIR="$STATE_DIR/review-packs/demo-dashboard"
node "$SKILL_ROOT/scripts/playwright/review_pack.js" \
  --target "$DEMO_ARTIFACT" \
  --slug demo-dashboard \
  --out-dir "$REVIEW_DIR"

echo ""

# ── 2. Critique ─────────────────────────────────────────────────
echo "━━━ 2/3  Design Critique ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CRITIQUE_DIR="$STATE_DIR/critique"
node "$SKILL_ROOT/scripts/critique.js" \
  --target "$DEMO_ARTIFACT" \
  --slug demo-dashboard \
  --out-dir "$CRITIQUE_DIR"

echo ""

# ── 3. Deck Generation ──────────────────────────────────────────
SKIP_DECK=false
for arg in "$@"; do
  if [ "$arg" = "--skip-deck" ]; then SKIP_DECK=true; fi
done

if [ "$SKIP_DECK" = false ]; then
  echo "━━━ 3/3  Deck Generation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  node "$SKILL_ROOT/scripts/generate_deck.js"
  echo ""
fi

# ── Summary ─────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo "  Output Artifacts"
echo "═══════════════════════════════════════════════════"

echo ""
echo "📦 Review Pack:"
ls -lh "$REVIEW_DIR"/metadata.json 2>/dev/null && echo "   index: $REVIEW_DIR/index.html"
echo ""
echo "🗺️  Critique:"
ls -lh "$CRITIQUE_DIR"/demo-dashboard.json 2>/dev/null && echo "   md: $CRITIQUE_DIR/demo-dashboard.md"
echo ""
echo "📊 Deck:"
# Note: ESM __dirname resolves to the parent of scripts/, landing output
# in the workspace-level state/. Search both locations.
DECK_FOUND=$(find "$SKILL_ROOT" "$HOME/.openclaw/workspace/state" -name "demo-deck.html" 2>/dev/null | head -1)
if [ -n "$DECK_FOUND" ]; then
  DECK_DIR=$(dirname "$DECK_FOUND")
  echo "   html: $DECK_DIR/demo-deck.html"
  echo "   png:  $DECK_DIR/demo-deck.png"
  echo "   pdf:  $DECK_DIR/demo-deck.pdf"
else
  echo "   (not found)"
fi

echo ""
echo "✅ Demo pipeline complete."
