#!/bin/bash
# autobyteus-534 API/E2E (from autobyteus-525): which phone bundle the held alpha serves (it reads autobyteus-web/dist/public per request).
W=/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/autobyteus-web/dist
case "$1" in head) T=$W/public-head ;; base) T=/tmp/abtest534/base/autobyteus-web/dist/public ;; *) exit 2 ;; esac
ln -sfn "$T" "$W/public" && echo "serving $1 bundle"
