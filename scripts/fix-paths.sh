#!/usr/bin/env bash
#
# fix-paths.sh — rewrite the absolute paths in every cordis.patch.yml to wherever
# this course actually lives.
#
# WHY THIS EXISTS: a `--patch` overlay contributes configuration but does NOT
# change the directory that module specifiers resolve from — they resolve relative
# to the profile directory (~/.dsh/profiles/web), not to the patch file. So lesson
# rows must use absolute paths, and absolute paths are not portable.
#
# Run this once after cloning:
#
#   ./scripts/fix-paths.sh
#
# Add --check to verify without writing (useful in CI):
#
#   ./scripts/fix-paths.sh --check

set -euo pipefail

COURSE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_ONLY="${1:-}"

# Any absolute path ending in the course directory name, from any machine.
OLD_PATTERN='/[^" ]*/dsh-custom-plugin'

targets=$(grep -rl -E "$OLD_PATTERN" \
  --include='*.yml' --include='*.yaml' \
  "$COURSE_ROOT/lessons" "$COURSE_ROOT/capstone" 2>/dev/null || true)

if [[ -z "$targets" ]]; then
  echo "no patch files contain an absolute course path — nothing to do"
  exit 0
fi

stale=0
for f in $targets; do
  if grep -qE "${OLD_PATTERN}" "$f" && ! grep -q "$COURSE_ROOT" "$f"; then
    stale=$((stale + 1))
  fi
done

if [[ "$CHECK_ONLY" == "--check" ]]; then
  if [[ "$stale" -gt 0 ]]; then
    echo "FAIL — $stale file(s) point somewhere other than $COURSE_ROOT"
    echo "run ./scripts/fix-paths.sh to fix"
    exit 1
  fi
  echo "PASS — every patch path points at $COURSE_ROOT"
  exit 0
fi

echo "rewriting course paths to: $COURSE_ROOT"
echo

for f in $targets; do
  # BSD sed (macOS) and GNU sed disagree on -i; the '' form works on BSD, and
  # writing to a temp file then moving is portable across both.
  tmp="$(mktemp)"
  sed -E "s|${OLD_PATTERN}|${COURSE_ROOT}|g" "$f" > "$tmp"
  if cmp -s "$f" "$tmp"; then
    rm -f "$tmp"
  else
    mv "$tmp" "$f"
    echo "  updated ${f#"$COURSE_ROOT"/}"
  fi
done

echo
echo "done. Note this does NOT touch ~/.dsh/profiles/web/cordis.patch.yml —"
echo "if you installed the capstone there, update those two rows by hand."
