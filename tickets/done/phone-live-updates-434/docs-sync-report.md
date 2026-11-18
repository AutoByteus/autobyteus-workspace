# Docs Sync Report — autobyteus-434

## Scope

- Ticket: autobyteus-434. Phone live updates: run streams recover after a lost path and after the background, and a user message no longer shows twice.
- Trigger: delivery DR-002, after the code reviewer's pass CRR-004.
- Bootstrap base reference: `origin/personal` `eebbc2b8ee`
- Integrated base reference used for docs sync: `origin/personal` `4ec4d0ae52`, merged as `336ea8ed63`
- Post-integration verification reference: `release-deployment-report.md`, Initial Delivery Integration Refresh

## Why Docs Were Updated

- Summary:
  - The four live run streams no longer give up after five attempts. They follow one shared reconnect schedule that holds while the page is hidden and resumes at once.
  - The plain WebSocket client no longer retries.
  - An agent run catches up from its stored state before it reopens.
  - Codex, Claude and AGY user records now store `message_id` / `dedupe_key`.
  - Two long-lived docs still described the old "at most five attempts" behavior, and none described the new lifecycle.
- Why this should live in long-lived project docs: the reconnect rule is shared by every live stream owner (agent, Team, Org, collaboration). A future change to any one of them has to keep that rule.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | Owns the stream services, the transport and the Org recovery text | Updated | New section, Live Run Stream Reconnection; the Org recovery bullet corrected |
| `autobyteus-web/docs/agent_orgs.md` | Org recovery said "at most five recovery attempts" | Updated | Now: keeps trying, pauses while hidden, notice at the fifth failure |
| `autobyteus-web/docs/remote_access.md` | Phone behavior | Updated | New section, Live run streams on the phone |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | The external-runtime raw-trace user record | Updated | Item 2 now says the user record stores `message_id` / `dedupe_key` |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | Stream protocol | No change | No protocol message changed |
| `autobyteus-server-ts/docs/modules/run_history.md` (accepted-input identity) | The identity join | No change | The client-side match is unchanged; the server now supplies the keys |
| `docs/android_mobile_access.md` | Android shell | No change | No Android change. ASM-001 held on the emulator (API-09) |
| `DESIGN.md` | Project design rules | No change | No new rule. The ticket follows the existing owner-per-stream structure |
| `TESTING.md` | Testing guideline | No change | The phone-probe rule (line 63) already applies. The probe now refuses duplicate case IDs by itself (API-REV-003), so no written rule is needed |
| `RELEASE.md` | Release guide | No change | The guide's steps matched this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_execution_architecture.md` | New section and a correction | Live Run Stream Reconnection: plain socket, scheduler waits and states, hold while hidden, resume, re-sync after ≥ 30 s hidden, what each owner does, the Agent Connect Rule, the read-to-open window accepted by design. The Org bullet no longer says "at most five attempts" | Promote the lifecycle; remove stale behavior |
| `autobyteus-web/docs/agent_orgs.md` | Correction | Org recovery wording | Stale behavior |
| `autobyteus-web/docs/remote_access.md` | New section | What the phone does after a lost path, in the background, and with a message sent during a busy turn | User-visible phone behavior |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Addition | User `RawTraceItem` carries `message_id` / `dedupe_key`; older records still load | New stored fields |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One reconnect rule for every live stream | The scheduler decides when to try again; the owner decides how to connect and catch up. There is no final give-up while the page is visible | `design-spec.md` (SR-004), `implementation-handoff.md` | `agent_execution_architecture.md` |
| Agent catch-up before the socket opens | Stored state is committed while the socket is closed. The read-to-open window is narrow and accepted | `design-spec.md`, `api-e2e-execution-coverage-report.md` (residual risks) | `agent_execution_architecture.md` |
| External-runtime user identity | Stored user records carry the accepted input's identity, so a reload during the turn finds the live message | `design-spec.md`, IMP-02 | `agent_memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `WebSocketClient` retries and its `RECONNECTING` state | `LiveStreamReconnectScheduler` in each stream owner | `agent_execution_architecture.md` Live Run Stream Reconnection |
| Org "at most five recovery attempts" and terminal offline | A notice at the fifth failure, then retrying continues | `agent_execution_architecture.md`, `agent_orgs.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then finalization.
- Notes:
  - `agent_memory.md` line 1 and item 1 name only Codex and Claude for the raw-trace recorder, while MSP-23 stored the keys on an AGY run.
  - This ticket's sentence is true for every runtime the recorder covers, so the runtime list was left unchanged; correcting it is outside this ticket.
