# Embedded Server Startup Blocker Status Contract

> **Status: Superseded by the `SR-004` scope reset.**
> The later user clarification withdrew this broad protocol contract. It is retained only as historical `SR-001`–`SR-003` context; current intended behavior is limited to `requirements.md` `REQ-009`.
> **Do not reuse any fatal-migration or startup-blocking statement below. Current SR-012 authority is `requirements.md`: every migration warning reaches health; only independently established current-platform inoperability may fail startup.**

## Status And Authority

- Status: `Superseded historical artifact — not current authority`
- Historical purpose: recorded the broad server -> Electron -> renderer terminal-startup proposal from `SR-001`–`SR-003`.
- This supplement is no longer part of the current requirements basis.
- Related requirements: `REQ-011`, `REQ-012`, `REQ-013`, `REQ-014`, `REQ-016`
- Related acceptance criteria: `AC-017` through `AC-020`

## Outcomes

| Outcome | Server process | Electron main process | Renderer |
| --- | --- | --- | --- |
| All current required migrations terminal-success/warning and health is available | Continue normal bootstrap, listen, and expose `/rest/health` | Mark ready only after normal ready/health confirmation | Render application normally |
| Required migration is failed/missing/not-run/running or execution throws | Emit one versioned structured terminal status, stop before runtime/listen, exit nonzero | Stop readiness/health wait promptly and publish one typed error status | Show preserved-data migration blocker with actionable details |
| Child exits nonzero without a valid structured status | Exit as failed | Use generic process-exit fallback immediately | Show generic server startup error plus desktop log path |
| Malformed/unrecognized status line while child remains alive | Continue normal supervision; log parser rejection | Do not trust unversioned payload | No false migration message; later health/exit governs |

A clean exit before health is never treated as continued startup. Normal success still requires the real health endpoint; a log line alone cannot mark the server ready.

## Versioned Terminal Envelope

The embedded server writes one line-framed terminal envelope to `stderr` before nonzero exit. The transport is distinct from ordinary structured log records and has a fixed protocol discriminator.

Required semantic fields:

```text
protocol              = "autobyteus.embedded-server.startup.v1"
outcome               = "blocked"
code                  = "REQUIRED_APP_DATA_MIGRATION_BLOCKED"
migrationId           = current registered migration ID, or null for an unassociated runner failure
migrationStatus       = FAILED | RUNNING | NOT_RUN | MISSING | ERROR
attempts              = non-negative integer or null
failedCount           = non-negative integer or null
summary               = non-empty content-safe actionable sentence
migrationLogPath      = absolute local path or null
desktopLogPath        = supplied by Electron status layer
```

Optional future fields are rejected unless the protocol version explicitly allows them; the first valid terminal envelope for the current child generation wins. The status contains no message body, token raw event, secret, or arbitrary serialized exception object.

## Server Semantics

1. Evaluate readiness for every currently registered `requiredOnStartup` migration after the runner completes.
2. Accept only `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`.
3. Select the first blocking definition in registry/dependency order as the primary status while logs retain all failed outcomes.
4. Emit the terminal envelope once, flush it, and exit nonzero before built-in bootstrap, catalog exposure, background runtime, or HTTP listen.
5. A migration-runner exception emits the same protocol with `migrationStatus=ERROR` and the most specific safe association available.
6. Do not return successfully from the top-level startup function after a terminal block.

## Electron Main-Process Semantics

1. Parse line boundaries across arbitrary stdout/stderr chunking; only the exact versioned discriminator is accepted.
2. Bind parsed status and close/error events to the current child/start generation so stale output from a prior restart cannot overwrite current state.
3. On a valid terminal envelope, cancel the startup timeout and any readiness/health wait immediately, preserve the structured failure, and emit one terminal error transition.
4. On child close before ready, treat both zero and nonzero exits as terminal. A valid structured status is the detailed cause; otherwise use the generic exit fallback.
5. Deduplicate structured-status, process-close, process-error, and `startServer()` catch paths so one failed generation does not fan out conflicting statuses.
6. Retain ordinary server output forwarding and classification; status parsing must not suppress the line from diagnostic logs.
7. Restart begins a new generation and clears the prior terminal status only when the new attempt starts.

## IPC / Renderer Status Shape

The server status payload remains a discriminated lifecycle object and adds an optional typed `startupFailure` object. It is present only for `status="error"` caused during embedded startup.

Renderer-observable migration failure fields:

- error code;
- migration ID;
- terminal migration status;
- attempts/failed count when known;
- actionable summary;
- migration log path when known;
- desktop log path.

The Pinia store must preserve these fields rather than flattening them into one generic timeout string. Health polling stops in terminal error/shutdown states and must not downgrade the UI back to `starting`.

## User-Facing Error State

For a required migration blocker, the embedded startup overlay must:

- state that a required data upgrade could not complete and that the application preserved the data;
- show a non-destructive primary action to retry/restart;
- show migration ID and status without requiring “technical details” expansion;
- show attempts, failed-item count, summary, and migration/desktop log paths in technical details;
- provide the existing safe log-opening action for an available log path;
- never recommend manual deletion, database reset, migration-record editing, or guessed identity;
- keep destructive full-data reset separate under its existing explicit danger confirmation, not as the migration remedy;
- remain keyboard reachable and expose the status/details with normal semantic text/button controls.

The UI changes from `starting` to this error state within `5 seconds` of receiving the terminal envelope or observing the pre-ready child close, rather than waiting for the 100-second watchdog.

## Fallback And Compatibility

- No compatibility wrapper is added to the server's current runtime API. This is a versioned embedded-process startup transport.
- Older/unstructured child failures still receive prompt generic close/error handling.
- Remote-node browser windows do not supervise the embedded server and do not render this embedded-only startup blocker.
