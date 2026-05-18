# Design Post-Delivery Rework Notes

## Trigger

After running the delivered Electron application, the user observed a standalone-only status flicker when sending a new message to an inactive/offline individual Codex agent after app restart:

```text
offline -> initializing -> running -> initializing -> running
```

The first `initializing -> running -> initializing` transition happens very quickly, mostly within the first second. Agent-team members remain stable and usually show:

```text
offline -> initializing -> running
```

## Root Cause Found In Delivered Source

The standalone command coordinator added a restore-snapshot bridge:

- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:87-95`
- `autobyteus-server-ts/src/agent-execution/services/agent-run-command-coordinator.ts:192-200`

After publishing command `Initializing` and restoring the runtime, the implementation calls `clearOverlayForRuntimeOwnedStatus(activeRun, runId)`. That method clears the command overlay and publishes `activeRun.getStatusSnapshot()` if the snapshot is not `offline` or `idle`.

For Codex, restored thread readiness/status such as `active`, `inprogress`, or `running` can normalize to visible `running` before the accepted user-message command is actually executing. That is the false intermediate `running`.

Team members are stable because their container publishes member command `Initializing`, ensures/restores the member runtime, posts the message, and does not publish a restored-runtime snapshot in between readiness and command execution.

## Design Correction

Separate two concepts:

1. Runtime readiness status: internal fact that runtime/thread/backend is restored or attached.
2. Command lifecycle status: user-visible lifecycle for the accepted user message.

During an accepted command that starts from an inactive/offline standalone run, command lifecycle owns visible status. Runtime readiness must stay internal.

Correct visible sequence:

```text
offline -> initializing -> running
```

Forbidden sequence:

```text
offline -> initializing -> running -> initializing -> running
```

## Required Clean-Cut Change

No legacy/backward-compatible branch and no feature flag.

Remove the restore-snapshot bridge entirely:

- Remove the delivered `clearOverlayForRuntimeOwnedStatus` shape.
- Do not publish `activeRun.getStatusSnapshot()` while a `STARTING` command overlay is active.
- Keep command overlay `Initializing` through restore/create and runtime attachment.
- Clear/replace overlay only from command-correlated events after message handoff: command-start `initializing`, `TURN_STARTED`, command-correlated `AGENT_STATUS running`, command terminal status, or command failure/error.

## Regression Coverage Required

Add a test where inactive standalone send restores an active runtime whose snapshot is immediately `running`. Assert:

- initial command `AGENT_STATUS initializing` is published;
- no `AGENT_STATUS running` is published from restored runtime snapshot before `postUserMessage` / command-correlated runtime event;
- eventual command-correlated `running` is allowed;
- user-visible sequence has no intermediate false `running`.
