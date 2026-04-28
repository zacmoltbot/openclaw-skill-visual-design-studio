#!/usr/bin/env bash
# scripts/phase3_pipeline.sh — Phase 3 capability validation
#
# Runs:
#   1. Annotated review pack  (calc-studio-home)
#   2. Deck multi-export       (demo-deck.html)
#   3. Artifact diff demo      (calc-studio-home vs variant)
#
# Usage: bash scripts/phase3_pipeline.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE="$SKILL_ROOT/state"

echo "══════════════════════════════════════════════"
echo "  Phase 3 Pipeline — visual-design-studio"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Annotated Review Pack ────────────────────────────────────────────────────
echo "▸ Step 1/3 — Annotated review pack: calc-studio-home"
ARTIFACT="$STATE/artifacts/calc-studio-home.html"
SLUG="calc-studio-home"
OUT_DIR="$STATE/review-packs/$SLUG"

node "$SKILL_ROOT/scripts/playwright/annotated_review_pack.js" \
  --target "$ARTIFACT" \
  --slug "$SLUG" \
  --out-dir "$OUT_DIR"

echo ""
echo "  Clean screenshots:"
ls -lh "$OUT_DIR/screenshots/" 2>/dev/null || echo "  (none)"
echo "  Annotated screenshots:"
ls -lh "$OUT_DIR/annotated/" 2>/dev/null || echo "  (none)"

# ── 2. Deck Multi-Export ───────────────────────────────────────────────────────
echo ""
echo "▸ Step 2/3 — Deck multi-export: demo-deck"
# First ensure demo-deck.html exists
if [ ! -f "$STATE/artifacts/demo-deck.html" ]; then
  echo "  Generating demo-deck.html first..."
  node "$SKILL_ROOT/scripts/generate_deck.js" --out "$STATE/artifacts/demo-deck.html"
fi

DECK="$STATE/artifacts/demo-deck.html"
DECK_SLUG="demo-deck"
DECK_OUT="$STATE/decks/$DECK_SLUG"

node "$SKILL_ROOT/scripts/export_deck.js" \
  --deck "$DECK" \
  --slug "$DECK_SLUG" \
  --out-dir "$DECK_OUT"

echo ""
echo "  Slide PNGs:"
ls -lh "$DECK_OUT/slides/" 2>/dev/null || echo "  (none)"
echo "  PDF:"
ls -lh "$DECK_OUT/"*.pdf 2>/dev/null || echo "  (none)"

# ── 3. Artifact Diff Demo ────────────────────────────────────────────────────────
echo ""
echo "▸ Step 3/3 — Artifact diff demo"

# Create a variant: modify calc-studio-home slightly
VARIANT="$STATE/artifacts/calc-studio-home-variant.html"
if [ -f "$ARTIFACT" ]; then
  sed -e 's/500+/600+/g' \
      -e 's/50M+/60M+/g' \
      -e 's/Free forever/Free forever — no sign-up/g' \
      "$ARTIFACT" > "$VARIANT"
  echo "  Variant created: calc-studio-home-variant.html (hero stats + byline changed)"
fi

DIFF_OUT="$STATE/diffs/calc-studio-home-demo"
node "$SKILL_ROOT/scripts/diff_artifact.js" \
  --old "$ARTIFACT" \
  --new "$VARIANT" \
  --slug "calc-studio-home-demo" \
  --out-dir "$DIFF_OUT"

echo ""
echo "  Diff output:"
ls -lh "$DIFF_OUT/" 2>/dev/null || echo "  (none)"

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  Phase 3 — Key Artifacts"
echo "══════════════════════════════════════════════"
echo ""
echo "  Annotated Review Pack:"
echo "    index:     $OUT_DIR/index.html"
echo "    metadata:  $OUT_DIR/metadata.json"
echo "    clean:     $OUT_DIR/screenshots/"
echo "    annotated: $OUT_DIR/annotated/"
echo ""
echo "  Deck Export:"
echo "    cover:     $DECK_OUT/demo-deck-cover.png"
echo "    slides:    $DECK_OUT/slides/"
echo "    PDF:       $DECK_OUT/demo-deck-slides.pdf"
echo ""
echo "  Artifact Diff:"
echo "    compare:   $DIFF_OUT/calc-studio-home-demo-compare.html"
echo "    summary:   $DIFF_OUT/diff-summary.json"
echo ""
echo "  All artifacts under: $STATE/"
echo ""
echo "✅ Phase 3 pipeline complete."
