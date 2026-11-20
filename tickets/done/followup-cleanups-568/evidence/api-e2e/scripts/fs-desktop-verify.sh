#!/bin/bash
# followup-cleanups-568 API/E2E (temporary): FS-DESKTOP's two verify steps, the `run:` blocks of release-desktop.yml's
# "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" (lines 192-225), extracted from the
# clone's own workflow file and run from the clone root, each with `bash -e`.
# Usage: fs-desktop-verify.sh <clone> <evidence file>
set -uo pipefail
CLONE=$1; LOG=$2
cd "$CLONE" || exit 1
echo "# FS-DESKTOP verify steps (release-desktop.yml build-macos-arm64), from the clone root; $(date -u +%FT%TZ)" > "$LOG"
rc_all=0
for name in "Verify bundled Prisma ARM64 engine target" "Verify packaged terminal runtime ARM64"; do
  body=$(python3 -I - .github/workflows/release-desktop.yml "$name" <<'PY'
import sys, re
text = open(sys.argv[1]).read().splitlines(); name = sys.argv[2]
start = next(i for i, l in enumerate(text) if l.strip() == f"- name: {name}")
assert text[start + 1].strip() == "run: |"
indent = len(text[start + 2]) - len(text[start + 2].lstrip())
out = []
for l in text[start + 2:]:
    if l.strip() and len(l) - len(l.lstrip()) < indent: break
    out.append(l[indent:])
print("\n".join(out))
PY
)
  echo "## step: $name" >> "$LOG"
  bash -e -c "$body" >> "$LOG" 2>&1; rc=$?
  echo "## step exit=$rc: $name" >> "$LOG"; [ $rc -eq 0 ] || rc_all=1
done
echo "# exit: $rc_all" >> "$LOG"
tail -4 "$LOG"
