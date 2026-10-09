#!/bin/bash
# Browser-automation launcher bound to isolated instance iso-61062-6a74 (attach-only).
exec env CHROME_REMOTE_DEBUGGING_PORT=61062 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "$HOME/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser" "$@"
