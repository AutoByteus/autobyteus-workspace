# Investigation Notes

## Investigation Meta

- Package identifier: `interrupt-idempotent-stop` (Project Task autobyteus-533)
- Request / ticket: autobyteus-533, "Interrupt clicked twice shows a raw error: find the root cause and make a second click harmless (desktop and phone)"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`, branch `codex/interrupt-idempotent-stop`
- Resolved base remote / branch / revision: `origin/personal` at `bd2053ee51963b4d9fa715f5d9ab4d548aca2214` (fetched 2026-11-18)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from the fetched `origin/personal`; `pnpm install --frozen-lockfile`, server `prebuild` and `build`, `nuxt prepare` all passed (Node v22.23.1).
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate, 2026-11-18): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; repository `AGENTS.md`, `TESTING.md`; `reflections/lessons.md`.
- Investigation status: Requirements investigation complete (root cause reproduced and measured).

## Initial Request And Clarifications

- Original request (founder, 2026-11-18, via the PM): on desktop and phone, clicking Stop twice shows an error; when the run is already stopped the second click should have no effect, or a short message that it is already stopped. Find the ROOT CAUSE and improve the experience.
- Screenshot (phone, a Team's solution designer): red toast `Could not stop solution_designer_e7ba… AgentRun 'solution_designer_e7ba…' has no canonical active turn to interrupt.`
- Direction set by the Task (founder's direction): a second interrupt, or an interrupt of a run with no active turn, is harmless (no error toast); Stop is disabled or shows "Stopping…" after the first click until the status updates; if the turn already ended the interrupt is a quiet no-op (or at most a short "Already stopped"); never raw run IDs or internal words; a real failure still shows a clear message in plain words; apply to desktop and phone, standalone agent, Team member, Org member, delegated run; tests: unit for double click, e2e on an isolated node with a scripted runtime (twice quickly; after the turn ended), the phone probe case; check whether the server should treat an idle interrupt as idempotent success (PM suggests yes). Release only on the founder's word.
- Clarifications received: none needed.

## Product And Domain Understanding

- Product area: the run composer's primary action (Send / Stop generation) in every run view, desktop and phone (`/mobile`), and the node's `INTERRUPT_GENERATION` command on each stream.
- Relevant terminology: *interrupt* (Stop generation) ends the current turn and keeps the run; *terminate* (the run's Stop/Terminate in settings, autobyteus-458) ends the run. This ticket is the interrupt only.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-interrupt-state.ts:34-80` | Origin of the message | `reserve()` returns `{accepted:false, code:"NO_ACTIVE_TURN", message:"AgentRun '<runId>' has no canonical active turn to interrupt."}` when the run has no active turn; a Stop while an interrupt is in flight *joins* it (same result); the reservation is cleared when the turn's terminal event is observed (`observeTerminal`), and on failure | — |
| 2026-11-18 | Code | `agent-run.ts:315-318` | Domain entry | `AgentRun.interrupt()` → interrupt state (or straight to the backend for a recoverable block with no turn) | — |
| 2026-11-18 | Code | `services/agent-streaming/agent-stream-handler.ts:389-440`, `interrupt-generation-command-ack.ts` | Standalone stream command | Not active run → `rejected RUN_NOT_FOUND "Agent run '<id>' is not active."`; `!result.accepted` → `failed <code> <message>` carrying the domain's text verbatim | — |
| 2026-11-18 | Code | `team-interrupt-generation-command-handler.ts` | Team member command | Same pass-through: `failed NO_ACTIVE_TURN <domain text>`; inactive Team → `rejected RUN_NOT_FOUND "Team run '<id>' is not active."` | — |
| 2026-11-18 | Code | `agent-org-stream-handler.ts:59`, `agent-collaboration-stream-handler.ts:185`, `peer-run-stream-session.ts:112-117` | Org member, standalone-root peer rows, remote (peer) runs | Same pass-through of `accepted:false` codes/messages into a `rejected` ack | — |
| 2026-11-18 | Code | `flat-team-agent-execution-handle.ts:81`, `configured-agent-execution-handle.ts:206` | Team/Org member with no started AgentRun | Already returns `{accepted:true}` (a Stop to a member that never started is a quiet success today) | Inconsistent with the standalone path |
| 2026-11-18 | Code | backends: `claude-agent-run-backend.ts:143`, `claude-session.ts:275-350`, `codex-agent-run-backend.ts:189`, `agy-agent-run-backend.ts:130-142`, `acp-agent-run-backend.ts:169-176`, `autobyteus-agent-run-backend.ts:285-306` | Every runtime | Each backend is reached only through `AgentRunInterruptState` (it passes the canonical turn id). Claude and AGY resolve the interrupt only after the turn has settled (terminal emitted first); AGY's interrupt stops its CLI process, so the run becomes inactive (`offline`) after a Stop (by design: AGY cannot cancel a turn in place) | — |
| 2026-11-18 | Code | `autobyteus-web/services/runSubmission/agentPrimaryAction.ts`; `components/agentInput/AgentUserInputTextArea.vue:136-146,314-330`; `MessagePrimaryActionButton.vue` | The Stop control | Stop is shown and enabled whenever `currentStatus === Running`; there is no pending-stop state: each click sends a new `INTERRUPT_GENERATION` with a fresh command id until a status frame changes the status. The button's label "Stop generation" is a hard-coded English literal | — |
| 2026-11-18 | Code | `components/mobile/runScreen/MobileRunTargetView.vue:26` → `AgentEventMonitor` → `AgentUserInputForm` → `AgentUserInputTextArea` | Phone composer | The phone uses the same composer component and the same stores; one fix covers both | — |
| 2026-11-18 | Code | `stores/agentRunStore.ts:59-76`; `services/agentStreaming/teamRunCommandPresentation.ts:14-31`; `localization/messages/en/agents.ts:103-104` | The toast | Any non-accepted ack → error toast `Could not stop {{target}}: {{detail}}` with `target` = the raw run id and `detail` = the server's raw message; transport failures → `Could not send Stop to {{target}}: {{detail}}` | — |
| 2026-11-18 | Code | `stores/activeContextStore.ts:46-121,251-272`; `stores/delegatedRunsStore.ts:118-155`; `stores/agentOrgContextsStore.ts:360-380`; `services/agentOrgExecution/agentOrgStreamingService.ts:214,365-390`; `services/peerRuns/peerRunStreams.ts:30` | Every run kind's interrupt route | Standalone and delegated agent runs → `agentRunStore` (toast with raw id). Team member and delegated Team member → `agentTeamRunStore` / Team stream (toast with raw id). Org member → `AgentOrgStreamingService.command` rejects its promise on a non-accepted ack; `handleStop` discards it (`void`), so it becomes an unhandled rejection: nothing shown in production (debug panel only), neither for a harmless nor a real failure. Peer (remote) run → its `AgentStreamingService` has no result callback: nothing shown for any outcome | — |
| 2026-11-18 | Code | `services/agentStreaming/AgentStreamingService.ts` / `TeamStreamingService.ts:135,285,467` | Pending interrupt on disconnect | A pending interrupt whose stream disconnects is reported as a transport failure toast "Interrupt was cancelled because the stream disconnected." even when the node already stopped the turn | — |
| 2026-11-18 | Code | `services/runOpen/agentRunOpenCoordinator.ts:79-109`; `services/runStatus/agentRuntimeStatusState.ts:47-53`; server `agent-stream-handler.ts:245` | Stale status on open | Opening a live run whose stream is not yet bound uses `Running` as a placeholder until the stream's first `AGENT_STATUS` (sent on bind); a Stop in that window reaches an idle run | Read only |
| 2026-11-18 | Doc | `autobyteus-web/docs/agent_execution_architecture.md:372-423`; `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:331-341` | Documented contract | Docs state a rejected/failed result "creates one target-aware toast"; "Acceptance confirms request admission; later runtime events own terminal status" | Docs to update with the new outcome rule |
| 2026-11-18 | Code | `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs:231`; server `tests/integration/agent/agent-websocket.integration.test.ts:621,665` | Existing tests | They assert today's `NO_ACTIVE_TURN` failure toast / ack; they become stale under this ticket | Rewrite in this ticket |
| 2026-11-18 | Code (SR-003, ARCH-REV-001 AR-001) | `AgentStreamingService.ts:120-123,304-326`; `agentRunStreamReconnection.ts`; `liveStreamReconnectScheduler.ts:14,53-57`; `peerRunStreams.ts:10,32-35`; `TeamStreamingService.ts:132-140,281-287,312-323`; `agentOrgStreamingService.ts:133-140,312,446-454,491-496`; server `agent-stream-handler.ts:150-155`, `peer-run-stream-session.ts:78` | Where a waiting Stop goes on a connection loss | Every service drains waiting Stops at the drop; the same service reconnects (agent/peer first retry 1 s; Team/Org through their recovery) and the new connection brings the status first (agent/peer: `CONNECTED` + `AGENT_STATUS`; Team/Org: the snapshot that sets `ready`) | Design D-W7 |
| 2026-11-18 | Command | `grep -rln "INTERRUPT_GENERATION\|NO_ACTIVE_TURN"` over SDKs, gateway, iOS, Android, applications | Other clients | None outside the web app (only a DTO in `autobyteus-collaboration-stream-contracts`) | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Stop generation while the run shows Running | Click → `INTERRUPT_GENERATION` → node interrupts the turn → turn end + new status → ack `accepted` | The turn ends; the run stays (AGY: becomes offline by design); no toast | Code + reproduction | High |
| BEH-002 | User | A second Stop while the first is still being processed on the node | Joins the in-flight interrupt | Both acks `accepted`; no toast | Reproduced (gap 0) | High |
| BEH-003 | User | A second Stop that reaches the node after the turn ended but before the page shows the new status | Node has no active turn | `failed NO_ACTIVE_TURN` (or `rejected RUN_NOT_FOUND` when the run went inactive, AGY) → red toast with the raw run id twice and internal wording | Reproduced (desktop browser, server) | High |
| BEH-004 | User | Stop on a run that shows Running while the node has no turn (stale placeholder on open) | Same as BEH-003 | Same red toast | Read (placeholder code); the server half reproduced (idle-run case) | Medium |
| BEH-005 | User | Stop on a Team member (incl. delegated Team member) | Team stream | Same as BEH-001…003 with the member's raw run id | Reproduced (server, gap 20/100) | High |
| BEH-006 | User | Stop on an Org member | Org stream | Harmless and real failures alike are silently dropped (unhandled rejection) | Read | Medium |
| BEH-007 | User | Stop on a remote (peer) run | Peer stream on this node | Every outcome is silent; a real failure is never shown | Read | Medium |
| BEH-008 | User | The stream disconnects while a Stop waits for its ack | Pending command drained | Red toast "Could not send Stop to <id>: Interrupt was cancelled because the stream disconnected." even when the Stop worked | Reproduced (browser, 150 ms latency, AGY run going offline) | High |
| BEH-009 | User | Stop clicked while the page is not connected to the node | Command not sent | Red toast "Could not send Stop to <id>: Interrupt was not sent because the stream is <state>." | Read | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `AgentRunInterruptState.reserve` | Owns "is there a turn to interrupt"; joins an in-flight interrupt | The idempotency fact ("nothing to interrupt") already exists as `NO_ACTIVE_TURN` | Where to translate it into the user command's outcome: the domain (used also by termination/shutdown) or the command boundary |
| `buildInterruptGenerationCommandAck` + Team / Org / collaboration / peer handlers | Four places build the user-facing interrupt ack | Every stream must answer the same way | One shared outcome rule rather than four copies |
| `agentRunStore` / `teamRunCommandPresentation` / Org / peer paths in the web | Four presentations of the ack (two toasts, two silent) | One presentation rule for every run kind | A single presentation owner reused by every route |
| `AgentContext.state.currentStatus` + `resolveAgentPrimaryAction` | Decides Stop vs Send | A pending-stop state must live where both the composer and the stores see it | Per-context pending flag, cleared by status/failure |
| `MessagePrimaryActionButton` (`busy` prop already shows a spinner) | Renders Send/Stop | "Stopping…" can reuse the busy spinner and a label | Localize the label |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Wire: `AGENT_COMMAND_ACK` for `INTERRUPT_GENERATION` on `/ws/agent`, `/ws/agent-team` (strict zod schema in `autobyteus-team-stream-contracts`), `/ws/agent-org` and `/ws/agent-collaboration` (collaboration contracts), `/ws/peer-run`.
- Localization: `localization/messages/{en,zh-CN}/agents.ts` keys `agents.store.interrupt.*`.

### Structural Surfaces

- Server: the interrupt command boundary in `services/agent-streaming/*`; domain `AgentRunInterruptState` (also used by `agent-run-termination.ts`, `agent-run-root-shutdown-fence.ts`, `configured-agent-execution-handle.ts`).
- Web: composer primary action, stores per run kind, streaming services.

### Potential Structural Impacts To Investigate

- API or external-contract change: possibly none (an `accepted` ack already exists in every schema); to confirm in design.
- Persistence: none. Security/privacy: removes run ids from user-visible text (no new exposure).
- Concurrency/lifecycle: the pending-stop state and its clearing rules.
- Confirmed absent: migrations, deployment changes.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Server e2e, scripted AGY, real Studio server + WebSocket: `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs INTERRUPT_REPRO_EVIDENCE=<file> pnpm exec vitest run tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts --no-watch` (in `autobyteus-server-ts`) | Standalone: Stop on an idle run | Ack `failed NO_ACTIVE_TURN` "AgentRun '<id>' has no canonical active turn to interrupt." within 1 ms | Reproduced | REQ-001 | `evidence/reproduction/server-stop-twice-base-run1.json` |
| same | Standalone: two Stops sent together (gap 0) | Both join; turn end + status at 37 ms; both acks `accepted` at 62 ms | Measured | Joining already works server-side | same |
| same | Standalone: second Stop 5–600 ms after the first | Turn ended on the node 24–45 ms after the first Stop, **before** the first ack (AGY settles the turn, then answers); every second Stop after that → `rejected RUN_NOT_FOUND "Agent run '<id>' is not active."` (AGY run went offline) | Measured | REQ-001/REQ-002 | same |
| same | Team member: idle member (never started) | `accepted` (handle has no AgentRun) | Measured | Shows the inconsistency | same |
| same | Team member: second Stop 20 / 100 ms after the first | `failed NO_ACTIVE_TURN` with the member's raw id | Reproduced | REQ-002, AC-004 | same; run 2 (`server-stop-twice-base-run2.json`) repeats it with failing assertions |
| Browser, real renderer: built server (`dist/app.js`) + scripted AGY + `nuxi dev` + headless Chrome, `node tests/e2e/interrupt-twice-repro-scratch.mjs --output-dir <dir> [--latency-ms N]` (in `autobyteus-web`) | Desktop, loopback, click Stop then click the same spot after 0/60/150/300/600 ms | 0 ms and 60 ms: red toast "Could not stop stopper_…: Agent run 'stopper_…' is not active."; ≥150 ms: the button already shows Send, no toast | Reproduced | REQ-003 (Stop must not stay clickable), REQ-004 | `evidence/reproduction/browser-desktop-loopback.json`, `…-gap60-toast.png` |
| same, `--latency-ms 150` (each WebSocket/HTTP chunk delayed 150 ms each way through a probe TCP proxy, as a phone on a remote path) | Clicks 0/150/300/450/700/1000 ms apart | 0 and 300 ms: the same red toast; 150 ms: "Could not send Stop to stopper_…: Interrupt was cancelled because the stream disconnected." (the Stop had worked; the AGY run went offline and the stream rebound); ≥450 ms: no toast | Reproduced | REQ-003, REQ-005 | `evidence/reproduction/browser-latency-150ms.json`, `…-gap300-toast.png`, `…-gap150-disconnect-toast.png` |

**Root cause (Reproduced).** Three things together:

1. **The node answers "nothing to stop" as a failure.** `AgentRunInterruptState.reserve` returns `NO_ACTIVE_TURN` when the turn has already ended (and the stream handlers return `RUN_NOT_FOUND` when the run is no longer active); every stream passes it to the client as a `failed`/`rejected` ack with the domain's developer text, which embeds the run id.
2. **The Stop control stays live after the first click.** It is enabled while the status is `Running` and has no pending state, so every further click sends another interrupt until the new status reaches the page.
3. **The app shows every non-accepted ack as an error toast**, built from the raw run id and the server's raw message.

The race is with the end of the turn, not a UI double-send bug alone: the node ends the turn (and emits the new status) before it answers the first Stop, so a second Stop that reaches the node after that point and before the page has rendered the new status gets the failure. Two Stops that arrive together join and both succeed.

**How often.** The window is one network trip from the node to the page (plus a render). Measured: ≈70 ms on the desktop's local node (a normal double-click at 0–60 ms reproduced it every time; 150 ms did not), ≈300+ ms with 150 ms one-way latency (clicks up to 300 ms apart reproduced it). A phone on a remote path (Tailscale, mobile network) has 50–300 ms one-way latency, so an ordinary double tap, or a second tap because nothing visibly changed after the first, falls in the window most of the time. On runtimes whose interrupt takes seconds (Claude), extra taps during that time join and succeed; the failure comes from the tap after the turn ended. A Stop on a run whose status is stale (`Running` placeholder on open) always fails.

- Temporary diagnostics: None (no product code was changed).
- Reproduction for implementation to start from: `autobyteus-server-ts/tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` (fails on the base: standalone 7 non-accepted acks; Team member `gap20:failed:NO_ACTIVE_TURN`, …), command above; `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` (browser, evidence only). Both are labelled reproductions; implementation turns them into the durable tests or removes them (no scratch file is delivered).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (2026-11-18, phone screenshot) | A second Stop must be harmless; no raw ids or internal words | Direct report + screenshot | REQ-001…REQ-006 | None |
| PM (Task text) | Server: an idle interrupt as idempotent success | Suggestion | DEC-001 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Team stream contract (`autobyteus-team-stream-contracts`, strict zod) | repo | Interrupt ack is `accepted` or `rejected/failed` with `code`,`message` | `team-agent-message-dtos.ts:79-82` | An extra field would need a contract change; `accepted` needs none |
| Runtime SDKs (Claude Agent SDK, Codex app-server, AGY CLI, ACP/Grok, native) | installed | Interrupt is only called with the canonical turn id; none is reached when there is no turn | backend files above | None for this ticket |
| Industry practice | — | Stop/cancel operations on something already stopped are idempotent (HTTP DELETE semantics; cloud "stop instance" on a stopped instance returns success with the current state) | General practice | — |

## Persisted Data And State Facts

- No persisted data is affected.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The visible change is small (a "Stopping…" state on the existing button and plain toast wording) and the direction sets it.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/reproduction/*.json`, `*.png` | Solution Designer | Reproduction and measurement of the root cause | Base `bd2053ee51` | REQ-001…REQ-005 | Final | Evidence; no approval needed |
| `autobyteus-server-ts/tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` | Solution Designer → Implementation | Failing reproduction | Server | AC-001…AC-004 | Hand-over | Evidence |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Solution Designer → Implementation | Browser reproduction (with latency) | Web | AC-005…AC-007 | Hand-over; to be replaced by the durable probe | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Live Claude/Codex timing of turn end vs. ack on the founder's node | Confirms the same window on real runtimes | Code read: Claude settles the turn before answering (`claude-session.ts:349`), as AGY does; Codex resolves after `turn/interrupt` returns. The window rule does not depend on the runtime; no paid run needed | Closed by reading |
| R-001 | Risk | Treating "run not active" as nothing-to-stop could hide a wrong target | A real defect would be silent | Only the composer's own open run is targeted; malformed/unknown-member targets stay rejected (DEC-002) | Accepted |
| R-002 | Risk | 448/526 FU-002 may change turn identity in `AgentRunInterruptState` | Merge overlap | This ticket keeps the domain's turn logic unchanged; coordinate through the PM if FU-002 lands first | Open (informational) |

## Requirement Implications

- The fix spans server (outcome of an interrupt with nothing to stop) and web (pending Stop state; one presentation rule; plain words; every run kind).
- The existing tests that assert today's failure toast/ack are stale under the new behavior and are rewritten in this ticket.

## Notes For Architecture Design

- Map SCN-001…SCN-007 to: the server's interrupt command boundary (agent, Team, Org, collaboration, peer handlers) and the web's composer primary action, the per-kind stores and streaming services.
- Keep `AgentRun.interrupt()`'s domain result truthful for its internal callers (termination, shutdown fence, execution handles).
- A peer node (same version, DESIGN.md rule 9) answers an owner-command interrupt with its domain result (`NO_ACTIVE_TURN`, or `RUN_NOT_ACTIVE` from `notLiveRefusal`, `paired-agent-access.ts:57`); the relaying node's stream boundary must apply the same rule.
