# Investigation Notes

## Investigation Meta

- Package identifier: `send-on-unbound-stream` (Project Task autobyteus-540)
- Request / ticket: autobyteus-540, from autobyteus-533 FU-006 (urgent)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`
- Repository mode: `Git`; branch `codex/send-on-unbound-stream`
- Base: `origin/personal` at `914eb36577d2319baac0ec30ecf32ed0584b8e5a` (fetched 2026-11-18; contains autobyteus-533 `7984543255`)
- Finalization target: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and server `prebuild` passed (Node v22.23.1).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-18, this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; `TESTING.md`; `DESIGN.md`; `reflections/lessons.md`.
- Investigation status: complete for requirements.

## Initial Request And Clarifications

- Request (PM, Task text): a message sent on a run stream that has just opened is silently dropped when the node has not bound the session: the node answers `SESSION_NOT_READY`, the page has already cleared the draft, no turn starts, the user sees nothing. Lead: `ensureAgentStreamConnected` waits for the socket, not for the node's `CONNECTED`. Make the send wait for `CONNECTED` or resend on `SESSION_NOT_READY`; check Team and Org sends; turn the probes' one-time send retry into a failure; decide what the user sees if it still fails (draft back or a plain "not sent" message). Desktop and phone. Release only on the founder's word.
- Clarifications: none needed.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-18 | Evidence | `tickets/done/interrupt-idempotent-stop/evidence/api-e2e/API-10-cg07-send-after-stop/evidence.json` `sendStalls[0]`, `stall-agent-SGD-01-gap60#21-1.png` | Real stack (built server, scripted AGY, desktop page, load ≈60): `380 ms SEND_MESSAGE` up, `412 ms ERROR SESSION_NOT_READY` down, `507 ms CONNECTED`, `508 AGENT_STATUS offline`, `516 AGENT_STREAM_SNAPSHOT`; the screenshot shows no user message, no error, an empty composer; 1 of 80 sends (a send right after a Stop took the AGY run offline, on a new stream) |
| 2026-11-18 | Code | `autobyteus-server-ts/src/api/websocket/agent.ts:40-80` (`attachRunStream`) | One gate for `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration`: while the handler's `connect` runs, any message is answered `ERROR SESSION_NOT_READY` "Retry after CONNECTED message."; established contract (autobyteus-500 FU-036), proven by `tests/integration/agent/run-stream-not-ready.integration.test.ts`, `tests/e2e/agent/run-stream-early-command.e2e.test.ts`; test clients are checked to wait (`tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts`, `autobyteus-web/tests/e2e/fixtures/run-socket-ready.mjs`) |
| 2026-11-18 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts:120-160` | The agent stream sends `CONNECTED` then `AGENT_STATUS` after binding (for a stopped run it first reads its status projection; its stored snapshot follows) |
| 2026-11-18 | Code | `autobyteus-server-ts/src/api/websocket/peer-run.ts:15-35` | `/ws/peer-run` starts its session synchronously (`CONNECTED` at once; messages handled from the start): no not-ready window |
| 2026-11-18 | Code | `autobyteus-web/stores/agentRunStore.ts:315-333` (`ensureAgentStreamConnected`) | Waits (50 ms poll, 10 s) for `connectionState === CONNECTED`, the **socket** state (`WebSocketClient.ts:100-105`), not the node's `CONNECTED` message |
| 2026-11-18 | Code | `agentRunStore.ts:86-262` (`sendUserInputAndSubscribe`) | Standalone/delegated agent send: `beginLocalUserSubmission` shows the message and clears the draft (`localUserSubmission.ts:97-115`); a send without mentions is fire-and-forget (`service.sendMessage`), no wait for its `AGENT_COMMAND_ACK`; a send with mentions waits (`sendMessageAwaitingAdmission`, rejected on a connection loss, `AgentStreamingService.ts:183-207`, `rejectInFlight`); failures go to `failLocalSubmission` (an "Error Occurred" segment with the raw error text, `localUserSubmission.ts:151-180`; the 10 s timeout text names the run id); the draft is not put back |
| 2026-11-18 | Code | `autobyteus-web/services/agentStreaming/agentStreamSnapshotApplication.ts:14-45` | The snapshot that follows `CONNECTED` replaces the conversation with the stored part, keeping only queued input (`overlayPendingUserMessages`): the page's shown message and the `SESSION_NOT_READY` error segment are erased. This is why the loss is silent |
| 2026-11-18 | Code | `autobyteus-web/stores/agentTeamRunStore.ts:128-140,262-355`; `TeamStreamingService.ts:94,144-157,245`; `teamSendAdmission.ts` | Team sends wait for the handshake (`isReady`, phase `ready` after the snapshot) and for admission (`MEMBER_INPUT_MESSAGE` or a send `ERROR`, drained on a loss); a failure puts the draft back, adds an "Error Occurred" segment with the raw error and sets the member's status to Error (`applyOfflineOrTerminalCleanup(…, Error)`) |
| 2026-11-18 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts:309-360`; `agentOrgStreamingService.ts` `command` / `sendPrepared` | Org sends require a ready stream and wait for the ack (rejected on close); a failure puts the draft back (unless edited) and adds the raw error segment |
| 2026-11-18 | Code | `autobyteus-web/stores/delegatedRunsStore.ts:145-155` (`peerInteractionOf.send`) | Peer run send: no connection wait; `sendMessageAwaitingAdmission` throws when the socket is not open (`WebSocketClient.send`), the draft stays, the error goes to the console only |
| 2026-11-18 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-command-registry.ts:25-26`, `agent-run-command-coordinator.ts:225-238` | The node keeps each message's identity per run in memory and answers a repeat `duplicate_*`; lost on a node restart |
| 2026-11-18 | Code | `autobyteus-web/tests/e2e/stop-generation-probe.mjs:234-257`, `mobile-stop-generation-cases.mjs:110-129` | The probes record a lost send (`sendStalls`) and send again once; only a second loss fails the case, so a single loss passes |
| 2026-11-18 | Code | `components/mobile/runScreen/MobileRunTargetView.vue:26` → `AgentEventMonitor` → `AgentUserInputForm` | The phone uses the same composer and stores |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path / Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Send to an agent run whose stream has just opened (first message of a new run or New chat; a message to a stopped or offline run, e.g. after a Stop took an AGY run offline; a send during a reconnect or page resume) | The page sends as soon as the socket opens; if the node's session is not yet bound, the node refuses it `SESSION_NOT_READY`; the snapshot then erases the shown message and the error; the draft is empty: the message is lost without a word | Reproduced (real stack, 533 API-10, 1/80; server measurement below) | High |
| BEH-002 | User | Same for a delegated agent run | Same path (`agentRunStore`) | Read | High |
| BEH-003 | User | Send to a peer (remote) run whose socket is not open | Throws; draft stays; nothing shown | Read | Medium |
| BEH-004 | User | Send to a Team member / Org member | Waits for a ready stream and for admission; failure: draft back + raw error segment (Team also sets the member's status to Error) | Read | High |
| BEH-005 | User | Connection lost after an agent send left the page, before the node's answer | Not tracked (no ack wait for a send without mentions); after the rebind the snapshot shows the message if the node had it, otherwise erases it silently | Read | Medium |
| BEH-006 | User | The agent stream does not become ready in 10 s | `failLocalSubmission`: raw "Timed out waiting for agent stream connection for run '<id>'" segment; draft gone | Read | High |
| BEH-007 | Contract | Run stream protocol | A client sends commands after the stream's `CONNECTED` (Team/Org: after the view snapshot) | Code + tests (FU-036) | High |

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Evidence |
| --- | --- | --- | --- | --- |
| 533 API-10 (real stack: built server, scripted AGY, Nuxt, Chrome; load ≈60) | 80 sends after Stops | 1 send refused `SESSION_NOT_READY` 32 ms after it left, `CONNECTED` 95 ms later; nothing shown, draft empty | Reproduced | 533 archive, path above |
| Server e2e (in-process Studio, scripted AGY): `cd autobyteus-server-ts && env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs SEND_REPRO_EVIDENCE=<file> pnpm exec vitest run tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts --no-watch` (load 42–57) | Never-started and live idle runs: send on open / at 0–50 ms | open → `CONNECTED` 0–1 ms; 80/80 accepted | Measured | `evidence/reproduction/server-window-idle-runs.json` |
| same | A just-stopped run (the case after a Stop): send in the socket's open handler | 15 of 16 refused `SESSION_NOT_READY` (two runs: 8/8, 7/8) | Reproduced | `evidence/reproduction/server-window-stopped-run.json` (second run) |
| same | A just-stopped run: send 3–48 ms after open (the app's poll offsets) | 16/16 accepted; `CONNECTED` 0–4 ms after open | Measured | same |

**Root cause (Reproduced and Read).** Two defects together:
1. The page treats an open socket as a ready stream: `ensureAgentStreamConnected` waits for the socket, while the protocol (FU-036) says a run stream is ready at the node's `CONNECTED`. A send that arrives in between is refused `SESSION_NOT_READY`.
2. The page does not notice that the node never took the message: a send without mentions waits for no answer, the refusal is an uncorrelated `ERROR`, and the snapshot that follows `CONNECTED` replaces the conversation, erasing the shown message and the error. The draft was already cleared.

**How often.** The window is the node's time from accepting the socket to `CONNECTED`: about 0–5 ms on an idle in-process node, longer when the node reads a stopped run's stored state under load (≥127 ms in the 533 stall). The page's send lands 0–50 ms after the socket opens (its 50 ms poll). So it is rare on an idle machine (0 of 80 at the poll offsets above) and appears under load or on a slow node, most often for a send to a run that is stopped or offline (a new stream), such as the message after a Stop of an AGY run (1 of 80 in 533's real stack).

- Temporary diagnostics: None.
- Reproduction for implementation: the server measurement above (proves the node half); the page half is read (cited). Implementation starts from failing web unit tests: (a) a send on a socket that is open but not yet `CONNECTED` must not leave the page before `CONNECTED`; (b) a send refused or lost before the node's answer must not end with an empty draft and no notice.

## External Contracts, Standards, And Dependencies

| Contract | Authority | Constraint |
| --- | --- | --- |
| Run stream readiness | `api/websocket/agent.ts` gate, FU-036 tests | Commands after `CONNECTED` (Team/Org: after the view snapshot) |
| Message identity | `agent-run-command-registry.ts` | A repeated identity is answered `duplicate_*` while the node process lives |

## Persisted Data And State Facts

- No persisted data affected.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `evidence/reproduction/server-window-*.json` | Solution Designer | Window measurements | Final |
| `autobyteus-server-ts/tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts` | Solution Designer → Implementation | Measurement test (evidence, not a product test) | Hand-over: replace or remove |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | A node restart between a lost send and the rebind forgets the message identity | The design must not rely on identity dedupe alone to decide "delivered" | Open (design) |

## Notes For Architecture Design

- One readiness rule for agent streams (standalone, delegated agent, peer run) matching the protocol; Team/Org already wait.
- One owner for "a send that did not reach the node": draft back + one plain notice, for every run kind; it must survive the snapshot that replaces the conversation.
- Lost in flight on an agent stream: after the rebind, decide from the node's own view whether the message arrived.
