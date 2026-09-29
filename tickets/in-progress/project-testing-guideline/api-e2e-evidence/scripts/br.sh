#!/bin/bash
# Branch browser-automation CLI against the isolated instance (attach-only).
exec env CHROME_REMOTE_DEBUGGING_PORT=${ABTEST_CDP_PORT:-9336} BROWSER_AUTOMATION_ATTACH_ONLY=1 bash /Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline/browser-automation/scripts/browser "$@"
