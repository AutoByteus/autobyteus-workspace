#!/bin/bash
# Drives the isolated instance's renderer through its control port (attach only).
exec env CHROME_REMOTE_DEBUGGING_PORT=55232 BROWSER_AUTOMATION_ATTACH_ONLY=1 /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser "$@"
