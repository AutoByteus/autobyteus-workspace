#!/usr/bin/env bash
# Runs a server vitest target in a minimal environment: no inherited AutoByteus/app/provider
# variables, and a disposable HOME so nothing can reach ~/.autobyteus or provider CLI config.
# Usage: run-suite-clean-env.sh <label> <vitest target...>
set -u
EVID="$(cd "$(dirname "$0")" && pwd)"
SERVER="$EVID/../../../../autobyteus-server-ts"
LABEL="$1"; shift
TMP_HOME="$(mktemp -d /tmp/base-green-home-XXXXXX)"
cd "$SERVER"
env -i PATH="$PATH" HOME="$TMP_HOME" TMPDIR="${TMPDIR:-/tmp}" LANG="${LANG:-en_US.UTF-8}" TERM=dumb CI=1 \
  node ./node_modules/vitest/vitest.mjs run "$@" --no-watch --reporter=default --reporter=json \
  --outputFile.json="$EVID/$LABEL.json" > "$EVID/$LABEL.log" 2>&1
code=$?
echo "exit $code (HOME=$TMP_HOME)" >> "$EVID/$LABEL.log"
exit $code
