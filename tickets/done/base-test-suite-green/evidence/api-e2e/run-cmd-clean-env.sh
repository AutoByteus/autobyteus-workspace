#!/usr/bin/env bash
# API/E2E: runs a documented command in a minimal environment (env -i, disposable HOME):
# no inherited AutoByteus/app/provider variables. Usage: run-cmd-clean-env.sh <label> <cwd> <cmd...>
set -u
EV="$(cd "$(dirname "$0")" && pwd)"; LABEL="$1"; CWD="$2"; shift 2
TMP_HOME="$(mktemp -d /tmp/apie2e-home-XXXXXX)"
cd "$CWD"
start=$(date +%s)
env -i PATH="$PATH" HOME="$TMP_HOME" TMPDIR="${TMPDIR:-/tmp}" LANG="${LANG:-en_US.UTF-8}" TERM=dumb CI=1 "$@" > "$EV/$LABEL.log" 2>&1
code=$?
echo "exit $code; $(( $(date +%s) - start ))s (cwd=$CWD; HOME=$TMP_HOME; cmd=$*)" | tee -a "$EV/$LABEL.log"
exit $code
