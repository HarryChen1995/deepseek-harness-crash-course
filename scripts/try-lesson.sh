#!/usr/bin/env bash
#
# try-lesson.sh — boot dsh with one lesson's patch overlay, on a throwaway port,
# without touching your main harness on :3080.
#
#   ./scripts/try-lesson.sh 02-first-plugin          # boot, print log, keep running
#   ./scripts/try-lesson.sh 02-first-plugin --check  # boot, verify it loaded, exit
#
# Why an overlay: `--patch` layers on top of your profile without editing
# ~/.dsh/profiles/web/cordis.patch.yml, so a broken lesson can never wedge your
# real setup. See lessons/12-composition-and-layers for what "layer" means here.

set -euo pipefail

COURSE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LESSON="${1:-}"
MODE="${2:-run}"
PORT="${DSH_COURSE_PORT:-3099}"

# Where the deepseek-harness source checkout lives. Override if yours differs:
#   DSH_REPO=~/src/deepseek-harness ./scripts/try-lesson.sh 02-first-plugin
DSH_REPO="${DSH_REPO:-$HOME/deepseek-harness}"

if [[ -z "$LESSON" ]]; then
  echo "usage: $0 <lesson-dir-name> [--check]" >&2
  echo >&2
  echo "available lessons:" >&2
  find "$COURSE_ROOT/lessons" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort | sed 's/^/  /' >&2
  exit 2
fi

PATCH="$COURSE_ROOT/lessons/$LESSON/cordis.patch.yml"
if [[ ! -f "$PATCH" ]]; then
  echo "no patch file at: $PATCH" >&2
  echo "(lessons with no runnable code have no cordis.patch.yml — read their README instead)" >&2
  exit 2
fi

if [[ ! -d "$DSH_REPO" ]]; then
  echo "deepseek-harness checkout not found at: $DSH_REPO" >&2
  echo "set DSH_REPO=/path/to/deepseek-harness" >&2
  exit 2
fi

LOG="$(mktemp -t dsh-course-XXXXXX.log)"

echo "lesson : $LESSON"
echo "patch  : $PATCH"
echo "port   : $PORT"
echo "log    : $LOG"
echo

cd "$DSH_REPO"

if [[ "$MODE" == "--check" ]]; then
  # Boot, wait for the port to answer, then shut down. Exit non-zero if the
  # plugin tree failed to load — that is the signal a lesson's code is broken.
  # NOTE flag order: --profile/--patch are LAUNCHER flags and must come before
  # the app's own flags (--no-open/--port). `dsh web --patch ...` fails with
  # "unknown option '--patch'" because `web` is a subcommand, not the launcher.
  node --import tsx/esm apps/cli/src/bin.ts \
    --profile web --patch "$PATCH" --no-open --port "$PORT" >"$LOG" 2>&1 &
  PID=$!

  for _ in $(seq 1 40); do
    if ! kill -0 "$PID" 2>/dev/null; then break; fi
    if curl -fsS -o /dev/null "http://127.0.0.1:$PORT" 2>/dev/null; then
      echo "PASS — harness booted with the lesson patch applied"
      echo
      grep -iE '\[lesson|\[dsh-course' "$LOG" || true
      kill "$PID" 2>/dev/null || true
      wait "$PID" 2>/dev/null || true
      exit 0
    fi
    sleep 0.5
  done

  echo "FAIL — harness did not come up. Log:"
  echo
  cat "$LOG"
  kill "$PID" 2>/dev/null || true
  wait "$PID" 2>/dev/null || true
  exit 1
fi

echo "starting… (ctrl-c to stop). Open http://127.0.0.1:$PORT"
echo
exec node --import tsx/esm apps/cli/src/bin.ts \
  --profile web --patch "$PATCH" --no-open --port "$PORT"
