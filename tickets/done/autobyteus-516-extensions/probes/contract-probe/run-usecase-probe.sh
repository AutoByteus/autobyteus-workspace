#!/usr/bin/env bash
# Probe-only: V2/V3/V11/V12 of use-case-spines.md. The founder's ~/.autobyteus/extensions is only
# APFS-cloned (cp -c, copy-on-write); nothing under ~/.autobyteus is written. V2 downloads the real
# voice runtime (GitHub) and speech model (Hugging Face) into the scratch folder; SKIP_FRESH=1 skips it.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/autobyteus-516-usecase.XXXXXX")"
cp -c -R "$HOME/.autobyteus/extensions" "$SCRATCH/home-extensions"
say -v Samantha -o "$SCRATCH/en.wav" --file-format=WAVE --data-format=LEI16@16000 "Please summarize the meeting notes and send them to the team."
stat -f '%m %N' "$HOME/.autobyteus/extensions/registry.json" "$HOME/.autobyteus/extensions/voice-input/installation.json" > "$SCRATCH/before.txt"
echo "scratch: $SCRATCH"
node "$HERE/run-usecase-probe.mjs" "$SCRATCH"
STATUS=$?
stat -f '%m %N' "$HOME/.autobyteus/extensions/registry.json" "$HOME/.autobyteus/extensions/voice-input/installation.json" | diff "$SCRATCH/before.txt" - && echo "FOUNDER FILES UNCHANGED"
pkill -f "$SCRATCH" || true
rm -rf "$SCRATCH"
exit $STATUS
