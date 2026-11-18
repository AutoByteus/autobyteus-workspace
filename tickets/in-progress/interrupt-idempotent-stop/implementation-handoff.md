# Implementation Handoff — autobyteus-533 (interrupt-idempotent-stop)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Medium / High); ARCH-REV-002 Pass. Route after implementation: Code Reviewer (from `get_handoff_rules`).
- Requirements doc: `requirements-doc.md` (SR-002, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental task artifacts: `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md`; `evidence/reproduction/`
- Design review report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `code-review-report.md`, `code-review-revision-record.md` (CRR-001, CR-001)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`, `codex/interrupt-idempotent-stop`; code commits `ff16e5de85` (server), `1f92302096` (web), `45cae5ebd2` (probe baseline fix); documents and evidence in the commit that follows them (see `git log`). Base `origin/personal` `bd2053ee51`.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (Local Fix CR-001; IR-001 initial)
- Related solution revision IDs: `SR-003` (requirements `SR-002`)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Fail, CR-001); `CRR-002` Pass on IR-002 (`code-review-report.md`, commit `a0d81bbe18`); routed to API/E2E by the Code Reviewer
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001`

**Node.** One rule, `userInterruptOutcome` (`services/agent-streaming/user-interrupt-outcome.ts`), turns `NO_ACTIVE_TURN` and `RUN_NOT_ACTIVE` into `{accepted:true}` at the five user interrupt boundaries: `/ws/agent` (`agent-stream-handler.ts`), `/ws/agent-team` (`team-interrupt-generation-command-handler.ts`), `/ws/agent-org` (own agents and peer rows, interrupt only), `/ws/agent-collaboration` (peer rows), `/ws/peer-run` (relay). A not-running run / Team / Org answers `NOTHING_TO_INTERRUPT` for an interrupt; tool approval keeps its refusal. The domain `AgentRun.interrupt()` result is unchanged. Claude and Codex backends compare the runtime's active turn with `turnId` before calling the session/thread and answer `NO_ACTIVE_TURN`; native maps `no_active_turn`, `already_settled`, `turn_mismatch` to `NO_ACTIVE_TURN`, without the runtime's turn id (IR-002, CR-001: for `turn_mismatch` it is the other active turn's id, which the AgentRun would read as a protocol violation). The contract is stated on `AgentRunBackend.interrupt`.

**Web.** `runInterrupt` (`services/runInterrupt/runInterrupt.ts`) is the one owner of a Stop: it sets `AgentContext.interruptPending` (primary action `stopping`: spinner, "Stopping…", disabled, `aria-busy`), sends one Stop, watches the run's status from the press, and shows one plain localized message only for `not_sent` / `refused`, naming the agent with `targetDisplayName`. Every route returns `InterruptOutcome`. The streaming services hold a Stop lost with a recovering connection in `InterruptsAwaitingRebind` and settle it `connection_lost` after the rebind's status is applied, or at once on a final close (D-W7).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 18 server source files (17 modified, 1 added) and 26 web source files (21 modified, 4 added, 1 renamed); all within existing owners; ack meaning, backend contract, web callback API and port return type changed for every run kind, with a client-side pending state and connection-loss lifecycle, as the design classified.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (no wire schema, `AgentRunInterruptState` turn logic or status writer changed).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Stop on a running run: turn ends, no toast, Stopping until status leaves Running | composer → `activeContextStore.interruptGeneration` → `runInterrupt` → route → streaming service; status watch in `runInterrupt` | Unit + composer journey + probe 533-BR-002/005 |
| BEH-002 | Second press sends nothing; node still joins two Stops | `resolveAgentPrimaryAction` → `stopping` (composer refuses), `runInterrupt` returns at once when pending; `AgentRunInterruptState` unchanged | Composer journey (one `INTERRUPT_GENERATION` for click + click + Enter); server e2e gap 0 both accepted, one turn end |
| BEH-003/004 | Stop after the turn ended / stale status: accepted, no toast | `userInterruptOutcome` on all five streams; not-running branches answer accepted | Server e2e (standalone + Team, idle, together, after the turn ended); browser real stack (loopback, 150 ms) no toast |
| BEH-005 | Team member same as BEH-003 | Team handler + `memberCommand` (`TEAM_RUN_STOPPED` → accepted for an interrupt) | Server e2e Team member; unit per result code |
| BEH-006/007 | Org member, peer run: accepted quiet; real failure shown | `orgInterruptOutcome`; peer route returns its stream's outcome; server Org/collaboration/peer-run boundaries apply the rule | Unit (Org service, Org store route, delegated/peer route, server handlers) |
| BEH-008 | Disconnect while pending: Stopping across the reconnect; `connection_lost` after the rebind's status; no toast | `InterruptsAwaitingRebind` in `AgentStreamingService` (first `AGENT_STATUS`), `TeamStreamingService` (snapshot sets ready), `agentOrgStreamingService` (snapshot sets ready); final closes settle at once | Unit per service; composer journey (rebind running → Stop, idle → Send); probe 533-BR-003; browser real stack at 150 ms |
| BEH-009/010 | Not connected; runtime failure: one plain message naming the agent | `runInterrupt` (`agents.interrupt.notSent`, `agents.interrupt.failed`) | Unit, composer journey, probe 533-BR-001/004; catalog spec en + zh-CN |
| AC-005 | Turn gone inside the runtime → `NO_ACTIVE_TURN` → accepted | Claude, Codex, native backends | Unit per backend; native through a real `AgentRunInterruptState` and `userInterruptOutcome` with the runtime's real result shapes (IMP-11) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src`):
- Add `services/agent-streaming/user-interrupt-outcome.ts`.
- Modify `services/agent-streaming/{agent-stream-handler,team-interrupt-generation-command-handler,agent-team-stream-handler,agent-org-stream-handler,agent-collaboration-stream-handler,peer-run-stream-session}.ts`.
- Modify backends `claude/backend/claude-agent-run-backend.ts`, `codex/backend/codex-agent-run-backend.ts`, `autobyteus/autobyteus-agent-run-backend.ts`, `agent-run-backend.ts` (contract comment); `acp`, `antigravity` backends and `domain/agent-run-interrupt-state.ts` use the `NO_ACTIVE_TURN` constant.
- Modify `domain/agent-operation-result.ts` (`NO_ACTIVE_TURN`, `RUN_NOT_ACTIVE`); `RUN_NOT_ACTIVE` producers use the constant: `paired-agent-access.ts`, `root-team-run.ts`, `agent-org-run-message-delivery.ts`.
- Tests: `tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts` (from the reproduction), unit tests per handler/backend/rule, `tests/integration/agent/agent-websocket.integration.test.ts` rewritten.
- Docs: `docs/design/agent_websocket_streaming_protocol.md`.

Web (`autobyteus-web`):
- Add `services/runInterrupt/{runInterrupt,orgInterruptOutcome}.ts`, `services/agentOrgExecution/agentOrgConnectionLostError.ts`, `utils/workspace/targetDisplayName.ts`.
- Modify `services/agentStreaming/{interruptCommandAdmission,AgentStreamingService,TeamStreamingService,index}.ts`, `protocol/{agentCommandTypes,messageTypes,index}.ts`; `services/agentOrgExecution/agentOrgStreamingService.ts`.
- Rename `services/agentStreaming/teamRunCommandPresentation.ts` → `teamRunCommandIds.ts` (presenters removed; id builders kept, still used).
- Modify stores `activeContextStore`, `agentRunStore`, `agentTeamRunStore`, `delegatedRunsStore`, `agentOrgContextsStore`; types `AgentContext`, `activeAgentWorkspaceTarget`; `services/runSubmission/agentPrimaryAction.ts`; components `AgentUserInputTextArea.vue`, `ChatComposer.vue`; `composables/workspace/useTargetConversation.ts`; localization `en` / `zh-CN` `agents.ts`.
- Tests: new `runInterrupt.spec`, `orgInterruptOutcome.spec`, `AgentUserInputTextArea.stopping.e2e.spec`, `stopInterruptCatalog.spec`; rewritten admission, streaming service, Org service, store and primary-action specs; `tests/e2e/interrupt-result-presentation-probe.mjs` rewritten.
- Docs: `docs/agent_execution_architecture.md`.

## Important Assumptions

- ASM-001 holds: a composer Stop targets the run the view shows.
- The Org agent, delegated and peer contexts are reactive, so the status watch ends Stopping on every kind (checked for the Org route in `agentOrgRetainedRecovery.spec.ts`; Team in the composer journey; standalone and peer contexts are store/`reactive` contexts).

## Known Risks

- R-3 (design): a Stop accepted with no later status change keeps Stopping until the next status or a loss and rebind (no timer, by design).
- R-4 (design): while the node stays unreachable, Stopping lasts until the stream rebinds (backoff up to 30 s) or is closed for good.
- One of six real-stack loopback runs (IMP-09) stalled on the gap-300 step: the *send* of the next held turn to the offline AGY run never reached the node (no `SEND_MESSAGE` handling in its backend log; the gap-150 tool card ended "UNKNOWN"). No toast appeared and the Stops in that run were quiet. Five later runs, including the same gap order with console capture, completed (IMP-09b); I did not find the cause. The send path is not changed by this ticket (`interruptPending` only affects the action while the status is Running; the page showed Offline). Open observation for API/E2E; the run's backend/frontend logs and screenshots are kept.
- Org `agentOrgStreamingService.ts` is 506 physical lines (473 effective, 465 before). The design spec said "stays ≤ 500 lines (498 today)", counting physical lines; the team's limit counts effective non-empty lines, which stay under 500. The hold/settle logic lives in the shared holder; the service gained only the holder field, its use in `rejectPending`, three settle calls and two imports. One no-op `rejectPending` call in `disconnect()` (after `closeSocket`, which already clears the map) was removed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix with a behavior change.
- Reviewed root-cause classification: Duplicated Policy Or Coordination + Missing Invariant.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (bounded: one presentation owner).
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: two placement corrections within the design's own decisions, not design changes:
  - D-S2 Team: the design names the not-running branch at `team-interrupt-generation-command-handler.ts:42-44`, but that branch is unreachable (its only caller always passes the routed member commands). A stopped Team answers `TEAM_RUN_STOPPED` from `agent-team-stream-handler.ts` `memberCommand`. The interrupt answer `NOTHING_TO_INTERRUPT` is applied there (tool approval keeps `TEAM_RUN_STOPPED`), and the handler's dead null branch and unused `teamRunId` input were removed.
  - D-S3 native: `turn_mismatch` is mapped to `NO_ACTIVE_TURN` together with `no_active_turn` and `already_settled`, because D-S3 states the contract as "`turnId` is not the runtime's active turn", which is what `turn_mismatch` reports (Claude and Codex answer the same for another active turn). The mapped answer carries no turn id (IR-002, CR-001).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (presenters, callback options and fields, `InterruptCommandTransportFailure` and its re-exports, failure-callback admission functions, `agents.store.interrupt.*` keys, the Team interrupt handler's null-run branch and `teamRunId` input, unused `useToasts`/`localizationRuntime` imports in `agentRunStore`, the no-op `rejectPending` in the Org `disconnect()`).
- Dead code found elsewhere, added to `follow-ups.md`: FU-003 (`team-tool-approval-command-handler.ts` null-run branch).
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`InterruptOutcome` has four kinds, `detail` only on `refused`; `PendingInterruptCommand` carries its `settle`).
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (largest: `agentOrgContextsStore.ts` 488 effective (+1 import), `agentTeamRunStore.ts` 483, `agentOrgStreamingService.ts` 473, `agent-stream-handler.ts` 457 (was 464); largest delta 125 lines, `interruptCommandAdmission.ts`).
- Notes: `teamRunCommandPresentation.ts` renamed to `teamRunCommandIds.ts`, since only its id builders remain (Principle 12: the name says what it holds).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- macOS, Node v22.23.1; scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`); headless Chrome; server `dist` built from this worktree for the real-stack browser runs.
- `fseventsd` was at 137–154% CPU during the server unit run: an FSEvents write produced no event in 10 s and a watcher close blocked 14.3 s (IMP-03). The four folder-watcher test timeouts come from this (TESTING.md "File watching on a busy Mac").

## Checks Run

Evidence folder: `tickets/in-progress/interrupt-idempotent-stop/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Server reproduction on the base: `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` | `ab7e4c8967` (base code) | macOS, Node 22, scripted AGY | all five server paths | AC-001…AC-004 | Fail (expected: reproduces) | `IMP-01-server-repro-base.log` | `expected [ 'gap20:failed:NO_ACTIVE_TURN', …(1) ] to deeply equal []` |
| IMP-02 | Durable server e2e: `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts` | server code `ff16e5de85` | macOS, Node 22, scripted AGY, real server + WebSocket | standalone + Team interrupt boundaries, AGY backend, domain joining | AC-001, AC-002, AC-003, AC-004 | Pass | `IMP-02-server-e2e-stop-nothing-to-stop.log` | `Tests  2 passed (2)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit`; failing files alone; FSEvents measurement | server code `ff16e5de85` | macOS, Node 22 | whole server unit suite (incl. new handler/backend/rule tests) | AC-001, AC-003, AC-004, AC-005, AC-011 | Pass for the changed code; 5 failures unrelated (see Look For) | `IMP-03-server-unit-full.log` | `Tests  5 failed \| 8376 passed`; the 5: 4 folder-watcher timeouts (`{"writeToEventMs":"none in 10000 ms","closeBlockMs":14321}`), 1 migration timeout under load that passes alone |
| IMP-04 | `vitest run tests/integration/agent/agent-websocket.integration.test.ts`; also `team-conversation-target-websocket` and `team-agent-tools-mcp-lifecycle` integration files (the only other tests naming the old codes) | server code `ff16e5de85` | macOS, Node 22 | `/ws/agent` interrupt acks (rewritten stale cases); Team stream commands | AC-001, AC-003, AC-011 | Pass | `IMP-04-server-integration-agent-websocket.log` | `Tests  8 passed (8)`; the two Team files `Tests  4 passed (4)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | server code `ff16e5de85` | macOS, Node 22 | server src + tests | — | Pass | `IMP-05-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | web code `1f92302096` | macOS, Node 22 | web app, tests, cross-package tests | — | Pass | `IMP-06-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-07 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run`; the timed-out spec alone; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | web code `1f92302096` | macOS, Node 22 | whole web unit/component suite incl. new and rewritten Stop specs; guards | AC-006…AC-009, QR-001 | Pass for the changed code; 1 unrelated timeout (FU-004) | `IMP-07-web-unit-full.log` | `Tests  1 failed \| 5809 passed`; alone `Tests  3 passed (3)`; `[guard:localization-boundary] Passed.` |
| IMP-08 | `pnpm -C autobyteus-web test:e2e:interrupt-result-presentation --output-dir …` (fixture page, nuxi dev, headless Chrome) | `45cae5ebd2` | macOS, Chrome | composer, `runInterrupt`, agent + Team streaming services, toasts | AC-006, AC-007, AC-008, AC-009, QR-003 | Pass | `IMP-08-interrupt-result-presentation/evidence.json`, `533-BR-002-stopping.png` | five scenarios `"result": "Pass"`; screenshot: red button with the spinner, dimmed |
| IMP-09 | Real stack, loopback: built `dist/app.js` + scripted AGY + nuxi dev + Chrome: `node tests/e2e/interrupt-twice-repro-scratch.mjs --output-dir …` | `45cae5ebd2` | macOS, Chrome | the whole Stop path, standalone AGY run | AC-002, AC-006, AC-010 | Pass for Stop (no toast at 0/60/150 ms); the gap-300 send stalled once (Known Risks) | `IMP-09-browser-stop-twice-loopback/` | `gap0 … "second":"Stopping… at 251ms","toasts":""`; `Timed out: Stop shown` after gap150 |
| IMP-09b | Same, rerun with browser console and socket capture (3 further full runs, plus one `--gaps 300,600,0`) | `45cae5ebd2` | macOS, Chrome | as IMP-09 | AC-002, AC-006, AC-010 | Pass | `IMP-09b-browser-stop-twice-loopback-rerun/` | all gaps `"toasts":""`; second taps up to ~150 ms land on `Stopping…` |
| IMP-10 | Same with `--latency-ms 150 --gaps 0,150,300,450,700,1000` (phone on a remote path) | `45cae5ebd2` | macOS, Chrome, 150 ms each way | as IMP-09, plus loss and rebind | AC-008, AC-010 | Pass | `IMP-10-browser-stop-twice-latency-150ms/` | every gap `"toasts":""`; `"second":"Stopping… at 496ms"` (base: toasts at 0, 150, 300 ms) |

| IMP-11 | CR-001: `vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`; the same with the old mapping restored temporarily; both typechecks | CR-001 fix commit (see `git log`, on `eb60ae71e2`) | macOS, Node 22 | native backend `interrupt` → `AgentRunInterruptState` → `userInterruptOutcome` | AC-005 | Pass | `IMP-11-cr001-native-turn-gone.log` | `Tests  20 passed (20)`; old mapping: `Tests  3 failed \| 17 passed (20)`; both typechecks `PASS` at baseline |

- Rerun by impact for IR-002: only the native backend's `interrupt` and its test changed. IMP-02, IMP-04, IMP-07…IMP-10 are still valid (they don't exercise the native backend). IMP-03 covered the old native test; its file was rerun in IMP-11. IMP-05 and IMP-06 were rerun in IMP-11.
- Not run, and why:
  - Phone case in `pnpm -C autobyteus-web test:e2e:mobile-shell` and a durable real-stack desktop probe replacing `tests/e2e/interrupt-twice-repro-scratch.mjs` (design step 5, AC-010): E2E coverage is owned by API/E2E. The scratch file is kept (with added console/socket capture) as their starting point; it must not be delivered as scratch.
  - Server `test:integration` (whole), `pnpm test:e2e` (whole): left to API/E2E; only the rewritten integration file and the new e2e ran.
  - Live runtimes (Claude, Codex, native with a provider): backend answers are unit-tested; no paid run.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the run composer's primary button (desktop run views and the phone run screen use the same `AgentUserInputTextArea`); error toasts.
- Approved UI/UX, interaction, requirement, or design references: requirements "UI, Interaction, And Experience Requirements" (Stop → Stopping with spinner, disabled, localized label as title/aria-label → Send); design D-W2, D-W6.
- Existing design system, shared components, and adjacent product surfaces reviewed: `MessagePrimaryActionButton.vue` (existing `busy` spinner and `title` / `aria-label`, used for chat start); `ChatComposer.vue`; toast container.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser probes; fixture probe (IMP-08) and the real stack with nuxi dev (IMP-09, IMP-10).
- States, layouts, viewports, and interactions inspected: Stop → Stopping (spinner, `aria-busy="true"`, disabled, title "Stopping…") → Send on idle; double click and Enter while Stopping; connection loss while Stopping and rebind with running / idle; refused and not-sent messages; 1000×760 and 1440×1000 desktop viewports.
- Visual or interaction issues found and corrected: none found. The Stopping button keeps the red Stop color with the spinner and the existing disabled dimming, matching the composer's other busy state.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-08 (screenshot `533-BR-002-stopping.png`), IMP-09, IMP-10. The phone bundle (`/mobile`) was not rendered (left to API/E2E's `test:e2e:mobile-shell` case); zh-CN texts verified by catalog spec, not rendered.

## Downstream Coverage Hints / Suggested Scenarios

- AC-010 phone case in `test:e2e:mobile-shell`: standalone run and Team member, press Stop twice quickly, then after the turn ended; assert no toast and that "Stopping…" was seen.
- A durable desktop real-stack probe from `tests/e2e/interrupt-twice-repro-scratch.mjs` (built server + scripted AGY + `--latency-ms`); remove the scratch file once it exists.
- Org member (direct and in an Org-internal Team), delegated agent / Team member, and a peer run (two nodes) in a real stack: Stop twice, Stop after the turn ended, a real failure message names the agent as the view shows it.
- The IMP-09 observation: whether a send to an AGY run right after its Stop took it offline can stall (the step after gap 150).
- Server: whole `test:integration` and `pnpm test:e2e` (the ack meaning changed on five streams; a search of `tests/e2e`, `tests/integration`, `autobyteus-web/tests` and `test-support` for `NO_ACTIVE_TURN`, `TEAM_RUN_STOPPED`, `AGENT_ORG_STOPPED` and "is not active." finds only the rewritten websocket file and two Team integration files whose matches are not interrupt acks; both pass).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: the AC-010 phone case and durable desktop real-stack probe, broader server integration/e2e, multi-node peer and Org real-stack journeys, and the IMP-09 observation, as listed above.
