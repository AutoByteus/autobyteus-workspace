# API-FIND-016 — valid AgentOrg ERROR recovery is broken in a real browser

## Result

Fail. On reviewed artifact `5bfc54c11ef82e4fec217c84dc66887965cf98ac`, an inactive AgentOrg active-route load receives the valid correlated server `ERROR`, but the browser client throws before scheduling its bounded recovery. The production page remains indefinitely at `Connecting to Agent Org…`.

## Exact real-system sequence

1. Imported the owned package through Settings and created real Team `apirev7-team` and AgentOrg `apirev7` through normal production UI.
2. Launched standalone Team and AgentOrg with Codex App Server / `gpt-5.6-sol`, sent real prompts, and completed a mounted-Team delegate -> submit -> accept lifecycle.
3. Sent application-owned SIGTERM to the isolated backend. It logged `Server closed cleanly`; first API history after restart returned both roots inactive with complete exact durable trees/tasks.
4. The normal inactive history selection did rematerialize the whole Org on the backend. After an extra full page reload and workspace/history re-entry, exact prior conversation and accepted task appeared and a continuation returned `APIREV7-POST-RESTORE-CONTINUE-001`.
5. To isolate the client failure, stopped the restored Org through the normal `Stop Agent Org` control, then loaded the exact stopped run's active route in the same production Chromium tab.
6. CDP captured the server frame and client exception in one reload:
   - frame: `ERROR`, code `AGENT_ORG_NOT_ACTIVE`, exact correlated run ID;
   - exception: `InvalidAccessError: Failed to execute 'close' on 'WebSocket': The close code must be either 1000, or between 3000 and 4999. 1002 is neither.`
   - page remained `Connecting to Agent Org…`; no bounded attempts or exhaustion notice occurred.

## Expected

A valid current-run server `ERROR` must enter the approved five-attempt fail-closed automatic recovery/exhaustion path. The browser must close/release the rejected stream without throwing, then either converge to a complete verified active snapshot or surface exactly one exhaustion notice. Users do not click Reconnect.

## Observed

`AgentOrgStreamingService.handleMessage` throws for the server `ERROR`. `processFrame` calls `failClosed`, but `failClosed` calls the browser `WebSocket.close(1002, ...)`. The WebSocket browser API rejects that locally supplied close code. Because the exception occurs before `scheduleTransparentRecovery(detail)`, the approved recovery state machine does not run and the UI stays in Connecting.

## Direct source boundary

`autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts`:

```ts
generation.socket.close(1002, 'Invalid AgentOrg stream')
this.scheduleTransparentRecovery(detail)
```

The browser exception is not theoretical: it is captured from the production build at the corresponding minified `failClosed -> processFrame` stack.

## Failure-origin assessment

Preliminary `Local Fix`, implementation-owned frontend stream transport/recovery defect. This is not a fixture, test-harness, environment, requirement, product, architecture, server, provider, persistence, or migration gap. The server emitted the approved correlated ERROR, restart/Restore durability succeeded, and the failure is deterministic at the browser API call. Focused source review should confirm the safe browser close mechanism and require real-browser coverage of ERROR -> recovery scheduling.

## Evidence

- `LIVE-005-stopped-root-correlated-reload-cdp.jsonl`
- `LIVE-005-stopped-root-invalid-close-cdp.jsonl`
- `LIVE-005-browser-reload-cdp.jsonl`
- `screenshots/LIVE-005-correlated-error-stuck-connecting.png`
- `screenshots/LIVE-005-stopped-active-url-stuck-connecting.png`
- `graceful-shutdown.log`
- `backend-restart.log`
- `api/LIVE-005-first-post-restart-history-summary.json`
- `persistence/LIVE-004-agent-org-task-delegation-records-before-restart.json`
- `persistence/LIVE-005-agent-org-task-delegation-records-after-restore.json`
