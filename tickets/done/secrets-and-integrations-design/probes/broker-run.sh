#!/bin/bash
# stand-in for the broker running a FIXED template: the secret goes only into this child process, never the caller's shell
ALLOW="$1"; shift
if [ "$ALLOW" = "allowlist" ]; then case "$1 $2" in "api user"|"issue list"|"pr view") ;; *) echo "refused: '$1 $2' is not allowed for this integration"; exit 3;; esac; fi
GH_TOKEN=dummy-cli-token-999 ./fake-gh "$@" | sed 's/dummy-cli-token-999/[REDACTED]/g'
