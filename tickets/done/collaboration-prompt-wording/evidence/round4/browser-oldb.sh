#!/bin/bash
exec env CHROME_REMOTE_DEBUGGING_PORT=52098 BROWSER_AUTOMATION_ATTACH_ONLY=1 /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser "$@"
