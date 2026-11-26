#!/usr/bin/env bash
# Probe-only: prepares a scratch folder and runs run-probe.mjs.
# The founder's installed Voice Input is only READ: its runtime and model are APFS-cloned
# (copy-on-write, cp -c) into the scratch folder; nothing under ~/.autobyteus is written.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$HOME/.autobyteus/extensions/voice-input"
SCRATCH="${1:-$(mktemp -d "${TMPDIR:-/tmp}/autobyteus-516-probe.XXXXXX")}"
mkdir -p "$SCRATCH/node/voice-input/data"
cp -c -R "$SOURCE/runtime" "$SCRATCH/node/voice-input/data/runtime"
cp -c -R "$SOURCE/models" "$SCRATCH/node/voice-input/data/models"
say -v Samantha -o "$SCRATCH/en.wav" --file-format=WAVE --data-format=LEI16@16000 \
  "Please summarize the meeting notes and send them to the team."
say -v 'Flo (Chinesisch (China, Festland))' -o "$SCRATCH/zh.wav" --file-format=WAVE --data-format=LEI16@16000 \
  "请把会议记录整理一下，然后发给团队。" || true
echo "scratch: $SCRATCH"
node "$HERE/run-probe.mjs" "$SCRATCH"
