# Implementation Handoff — autobyteus-139 `chat-socket-content-cadence`

- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence/tickets/in-progress/chat-socket-content-cadence/`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence`
- Branch: `codex/chat-socket-content-cadence` (local, not pushed). Code HEAD `335f065cd1`; the ticket documents and evidence are committed after it (see the handoff message).
- Base: `origin/personal` @ `cf14704473`, merged in IR-002 (merge commit `b3666d458f`). IR-001 was built on `f3124db10f`.

| Commit | Slice |
| --- | --- |
| `be00680819` | contracts (`src` + tracked `dist` + node tests) |
| `3e3b437274` | web contexts, range helper + specs |
| `43b685b906` | server egress, shapes, scheduler, handlers + unit tests |
| `b8eed1387f` | per-socket integration cases + handler close tests |
| `e24ff6b333` | docs |
| `b3666d458f` | IR-002: merge of `origin/personal` @ `cf14704473` (DR-001 Local Fix; 2 conflicts resolved) |
| `335f065cd1` | IR-002: type-clean assertion in the Team content-batch spec (test only) |

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large/High. Independent architecture review was selected and passed (ARCH-REV-002, round 2).
- Requirements doc: `.../requirements-doc.md` (SR-002, Approved)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-002, Ready). Per AR-005, I implemented from Intended Change, DS-002 rules 1-5, the Interface Boundary Mapping contract rows and the Examples.
- Supplemental task artifacts: `.../evidence/validity-probe.*`; this round's local logs are `evidence/impl-*.log`.
- Design review report: `.../design-review-report.md` (ARCH-REV-002 Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: DR-001, `release-deployment-report.md` and `delivery-revision-record.md` (Local Fix: integration merge conflict)

## Current Implementation Summary

Every chat socket now sends through its own `AgentStreamWebSocketEgress`. The Team, Org and delegated-agent sockets use a new sequenced composition:
- While a window is open, all content goes into one pending batch, with one ordered aggregate per content identity.
- An identical status repeat is absorbed into the batch's range. The baseline is the last status this connection forwarded or absorbed for that agent run. The baseline is cleared when a snapshot passes.
- The batch leaves as one frame covering `[change_sequence, change_sequence_through]` when the window ends or any other sequenced message arrives.
- Nothing sequenced overtakes the pending batch. Only `CONNECTED` and `AGENT_COMMAND_ACK` may pass it.

Clients apply a frame when its first sequence is the next expected one, then advance to `through + 1`. `RootEventPublisher`, the snapshot barrier, inspection bases, the `/ws/agent` scheduler and `AgentRun` are unchanged.

- Implementation cycle: `Rework` (IR-002: base integration; IR-001 is the implementation)
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` — Pass (9.4/10, no findings; D-1..D-3 accepted), `code-review-report.md`; `CRR-002` (test code), per `delivery-revision-record.md`.
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `DR-001`
- Triggering finding IDs: DR-001 Local Fix (merge conflict). IR-001: none (AR-004 and AR-005 applied as notes).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` › Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change touches three subsystems (server egress and handlers, two contract packages, three web contexts). It changes the wire contract on three streams and adds new per-connection timers on two sockets. This matches the design.
- Selected route: `Code Review`. Classification is unchanged (Large/High), so the IR-002 Local Fix follows the `get_handoff_rules` rule for a delivery-requested Local Fix on a Large/High package, which sends it back for source review. Delivery asked for the package back; the reviewer's next handoff goes to delivery.
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent review route). A self-review was still done; see below.
- New design impact or escalation trigger: `None`. Root sequencing, the barrier and inspection bases are untouched. Every client accepts the range. UNK-001 still needs live evidence.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `/ws/agent` unchanged | Default composition untouched; `createControls` defaults to it | `agent-status-websocket` and egress unit tests green |
| BEH-002 | Team coalesced per window | `agent-team-stream-handler.ts` → `createSequencedStreamEgressControlComposition(teamStreamSequencedShape)` → `SEGMENT_CONTENT_BATCH` | Integration: 30 deltas → 0 frames at 350 ms, 1 batch after the window |
| BEH-003 | Org coalesced per window | `agent-org-stream-handler.ts` → `createRootExecutionStreamEgress` → `agent_presentation_batch` | Same |
| BEH-004 | Delegated agents coalesced per window | `agent-collaboration-stream-handler.ts` → same egress factory | Same |
| BEH-005 | No gap or reorder; a batch declares its range | Contracts (`change_sequence_through` only on batches); scheduler rule 2 plus no-overtaking; web `advanceSequencedStream` in 3 contexts | Integration `expectContiguousCoverage` on every case; web specs reject gaps and accept ranges |
| BEH-006 | Root subscribers unthrottled | The egress is per socket, after the barrier; the publisher is untouched | AC-005 case: a direct root subscriber gets 61/61 events while the socket holds them |
| BEH-007 | Boundaries flush first | Scheduler rule 5 | AC-004 case: tool, error, token usage, task event, terminal status and segment end each follow their pending text immediately |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/services/agent-streaming/`):
- Added in `websocket-egress/`:
  - `sequenced-stream-shape.ts`
  - `sequenced-content-cadence-scheduler.ts`
  - `team-stream-sequenced-shape.ts`
  - `root-execution-event-sequenced-shape.ts`
  - `root-execution-stream-egress.ts`
- Modified in `websocket-egress/`:
  - `agent-stream-egress-control-composition.ts` (sequenced composition)
  - `agent-stream-websocket-egress.ts` (`createControls`)
- Modified handlers:
  - `agent-org-stream-handler.ts`
  - `agent-collaboration-stream-handler.ts`
  - `agent-team-stream-handler.ts`

Contracts:
- `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`
- `autobyteus-team-stream-contracts/src/team-stream-server-message.ts`
- `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`
- `autobyteus-collaboration-stream-contracts/src/agent-run-collaboration-dtos.ts`
- `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts`
- Plus the tracked `dist/` and one new node test per package.

Web (`autobyteus-web/services/`):
- Added: `agentStreaming/sequencedStreamRange.ts`
- Modified contexts:
  - `agentOrgExecution/agentOrgExecutionContext.ts`
  - `agentCollaboration/agentRunCollaborationContext.ts`
  - `teamExecution/teamExecutionViewState.ts`
  - `teamExecution/teamExecutionViewModels.ts` (AR-004: `TeamAgentStreamMessage` excludes the batch)
- Modified callers that pass the range:
  - `agentOrgExecution/agentOrgStreamingService.ts`
  - `agentCollaboration/agentRunCollaborationStreamingService.ts`

Tests:
- Server unit:
  - `tests/unit/services/agent-streaming/sequenced-content-cadence-scheduler.test.ts` (new; DS-002 rules and design examples 11..15 and 21..26)
  - `tests/unit/services/agent-streaming/sequenced-stream-shapes.test.ts` (new)
  - the Org and collaboration handler tests (close and disconnect cases added)
- Server integration: `tests/integration/agent/chat-socket-content-cadence.integration.test.ts` (new; 6 cases × 3 sockets)
- Web specs:
  - `agentOrgExecutionContextBatch.spec.ts` (new)
  - `agentRunCollaborationContextBatch.spec.ts` (new)
  - cases added to `teamExecutionViewState.spec.ts`, `TeamStreamingService.spec.ts`, `agentOrgStreamingService.spec.ts` and `agentRunCollaborationStreamingService.spec.ts`

Docs:
- `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`
- `autobyteus-server-ts/docs/modules/agent_streaming.md`

## Deviations From The Design Text (Small, Recorded For Review)

- D-1: `SequencedStreamShape` has a fifth method, `isSnapshot(message)`. The scheduler clears its status baselines when a snapshot passes. Reason: the Team handler rebinds a session to a restored root (`bindSessionToTeamRun`) and sends a new snapshot through the same egress. A baseline from before that snapshot could otherwise absorb a status that differs from the snapshot's state. The client would then keep the snapshot's status, for example `idle` while the agent runs. This adds no seeding, consistent with AR-003. On Org and collaboration the snapshot is the first sequenced-stream frame, so clearing there is a no-op.
- D-2: I added the shared `createRootExecutionStreamEgress` (`websocket-egress/root-execution-stream-egress.ts`), so the Org and collaboration handlers do not each build the same egress (serialize, composition, error logging). It is not in the Final File Mapping table. It is a small factory, not a new owner.
- D-3: the sequenced composition throws if extension filters are passed, instead of ignoring them. A suppressing filter would leave a sequence gap (the design's forbidden "per-socket suppression of a sequenced message"). No production caller passes filters.
- Status absorption follows the design literally: any identical repeat is absorbed while a batch is pending, not only `running`. An identical repeat carries no change, and REQ-002 / DEC-002 call for it. A changed status (for example `running` → `idle`) is always a boundary (AC-004 case `terminal_status`).

## AR-004 Producers Of Plain `SEGMENT_CONTENT` (Type Kept)

- Server Team: `team-agent-event-websocket-projector.ts` (`SEGMENT_CONTENT` case) is the egress input. It never goes on the wire.
- Server Org/collaboration: `agent-org-execution-view-projector.ts` and `agent-collaboration-view-projector.ts` build `agent_presentation` + `SEGMENT_CONTENT` via `RootExecutionEventDtoSchema`. This is the egress input.
- Web: `teamExecutionViewModels.ts` `TeamAgentStreamMessage` is the per-item dispatch shape. `teamExecutionViewState.ts` dispatches each batch item as `SEGMENT_CONTENT`. That synthetic message carries the batch's first sequence; `toAgentProjectionMessage` drops it. The Org and collaboration contexts dispatch batch items as `agent_presentation` messages.
- The client branches for plain content stay live: the shared dispatch path. No server types were split.

## Important Assumptions

- UNK-001: canonical "running" statuses before deltas are byte-identical (no timestamp in `{status, trigger, tool_name, error_message, error_details, recoverableBlock}`). Read from code; not measured live.
- Desktop web and server ship together (ASM-001). Strict DTOs reject skew (RSK-003).

## Known Risks

- UNK-001: if live statuses differ between deltas, every status becomes a boundary and batches shrink. Escalate per the design.
- RSK-003: a remote node on a newer version paired with an older desktop. An older client rejects the batch frames under the strict schema. Mention this in the beta release notes.
- Per window, an agent can still send one standalone status before its batch opens, because absorption needs a pending batch. QR-001 counts content frames only.
- A root `lifecycle` event takes a sequence but leaves as an unsequenced `ROOT_LIFECYCLE` (unchanged behavior, now documented). The inactive lifecycle ends the stream after the pending text.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug fix with a contract extension
- Reviewed root-cause classification: Duplicated Policy Or Coordination
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`. No handler calls `connection.send` for session messages any more. Exception: the Team handler's pre-session errors (`SESSION_ERROR`, `TEAM_NOT_FOUND` before an egress exists), which the design did not ask to change.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `grep connection.send` in the Org and collaboration handlers finds nothing.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Single frames keep their one-sequence meaning; `change_sequence_through` exists only on batches.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. `convertTeamEvent`, private `getTeamRun` and their now-unused imports (`SequencedRootEvent`, `TeamRunEvent`) in `agent-team-stream-handler.ts`. Grep confirmed no callers.
- Dead code found elsewhere, listed as follow-up: `tests/integration/agent/agent-team-websocket.integration.test.js` targets a long-removed Team API (`target_member_route_key`, `AgentTeamStreamEvent`). Vitest excludes it (`include: tests/**/*.test.ts`). FU-A.
- Shared structures remain tight: `Yes`. The batch frame has one representation per stream.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. The largest changed file is `teamExecutionViewState.ts` (479 non-empty lines, +15). No file delta is near 220.
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Not Affected`. Streams and sequences are in memory.
- Implementation follows it: `Yes`

## Environment Or Dependency Notes

- Contract packages were rebuilt with `pnpm -C <package> build`; the tracked `dist/` is committed with the source.
- `pnpm -C autobyteus-web exec nuxt prepare` was run for the web specs and tsc.
- Web `tsc --noEmit` has about 800 lines of errors on the base too (none of them from this change). Compared against base built with the new contracts: this change adds no errors and removes 7 that the new contract types would otherwise cause.

## IR-002 Merge Resolution (DR-001)

- Conflict 1, `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` (`ROOT_EXECUTION_EVENT` branch): kept both sides. The base adds `const event = message.payload.event`, its `task_executions_closed` check, and `onTaskExecutionStarted?.(event.execution)` for `task_execution_started`. This ticket adds `message.payload.change_sequence_through` as the third `applyEvent` argument.
- Conflict 2, `.../__tests__/agentRunCollaborationStreamingService.spec.ts`: kept both new tests (this ticket's content-batch test and the base's SR-009 started-task test).
- An `agent_presentation_batch` can never carry `task_execution_started`:
  - The contract allows only `SEGMENT_CONTENT` items (`agentPresentationBatchEventDtoSchema`; contract test IMP-01 rejects an `AGENT_STATUS` item).
  - The server batches only `SEGMENT_CONTENT` (`rootExecutionEventSequencedShape.contentOf`).
  - `task_execution_started` is its own event kind and leaves as its own frame after the batch flush (scheduler rule 5).
  - So the base callback needs no look inside batches.
- Merge scope check:
  - Besides these two files, the base changes nothing under `autobyteus-server-ts/src/services/agent-streaming`, `src/api/websocket`, the web stream services and contexts, the root event publisher, or the three contract packages (`git diff --name-only f3124db10f origin/personal -- <those paths>`).
  - The base adds no new `connection.send` in server `src`.
  - The lockfile and `autobyteus-ts` are unchanged.
  - The contract `dist/` matches a fresh `pnpm build`.
  - The base's `TESTING.md` change concerns the E2E temp `HOME` only.
- Conclusion: the merge is mechanical; it changes no behavior of this ticket.
- One test-only follow-on, `335f065cd1`: the post-merge web tsc (IMP-11) showed 2 errors in my Team content-batch spec case, which was added after the IR-001 tsc baseline. The assertion now goes through `toMatchObject`, and the text checked is the same.

## Checks Run

IR-002 rows are current. Evidence is in `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence/tickets/in-progress/chat-socket-content-cadence/evidence/`. Each `IMP-*` file starts with a header (command, commit, environment, date). Environment for all rows: macOS 26.5.2, node v22.23.1, pnpm 10.28.2. These are local implementation checks, not API/E2E sign-off.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-collaboration-stream-contracts test` | `b3666d458f` | as above | collaboration contracts incl. `agent_presentation_batch` | BEH-005, AC-002 | Pass | `IMP-01-contracts-collaboration.log` | `# pass 33`, `# fail 0` |
| IMP-02 | `pnpm -C autobyteus-team-stream-contracts test` | `b3666d458f` | as above | Team contracts incl. `SEGMENT_CONTENT_BATCH` | BEH-005, AC-002 | Pass | `IMP-02-contracts-team.log` | `# pass 19`, `# fail 0` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `b3666d458f` | as above | server `src` | AC-006 | Pass | `IMP-03-server-typecheck.log` | `# exit: 0` |
| IMP-04 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent/chat-socket-content-cadence.integration.test.ts --no-watch`, 3 runs | `b3666d458f` | as above | egress, sequenced scheduler, shapes, Team/Org/collaboration handlers over real sockets | AC-001..AC-005, AC-009 | Pass | `IMP-04-cadence-integration-run{1,2,3}.log`, `IMP-04-cadence-integration-run1-excerpt.txt` | `Tests  18 passed (18)` in each run |
| IMP-05 | `pnpm -C autobyteus-server-ts test:unit` | `b3666d458f` | as above | all server units incl. scheduler/shape/handler tests | AC-006 | Pass | `IMP-05-server-unit.log`, `IMP-05-server-unit-excerpt.txt` | `Test Files  722 passed \| 4 skipped (726)`, `Tests  5894 passed \| 7 skipped (5901)` |
| IMP-06 | `pnpm -C autobyteus-server-ts test:integration:prepare` | `b3666d458f` | as above | integration build prerequisites | — | Pass | `IMP-06-server-integration-prepare.log` | `Integration test prerequisites are present.` |
| IMP-07 | `pnpm -C autobyteus-server-ts test:integration` | `b3666d458f` | as above | all server integration incl. IMP-04's file and `agent-status-websocket` (PB-001) | AC-005, AC-006 | Pass | `IMP-07-server-integration.log`, `IMP-07-server-integration-excerpt.txt` | `Test Files  77 passed \| 18 skipped (95)`, `Tests  415 passed \| 69 skipped (484)` |
| IMP-08 | `pnpm -C autobyteus-web exec nuxt prepare` | `b3666d458f` | as above | web type generation (setup) | — | Pass | `IMP-08-web-nuxt-prepare.log` | `Types generated in .nuxt.` |
| IMP-09 | `pnpm -C autobyteus-web test:nuxt run services/agentCollaboration services/agentOrgExecution services/teamExecution services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | `b3666d458f` | as above | the merged collaboration streaming service and spec; Org, collaboration and Team contexts and streaming services | BEH-002..005, AC-002 | Pass | `IMP-09-web-touched-specs.log` | `Test Files  19 passed (19)`, `Tests  151 passed (151)` |
| IMP-10 | `pnpm -C autobyteus-web test:nuxt run` | `b3666d458f` | as above | all web specs | AC-006 | Pass | `IMP-10-web-full.log`, `IMP-10-web-full-excerpt.txt` | `Test Files  634 passed \| 2 skipped (636)`, `Tests  4493 passed \| 3 skipped (4496)` |
| IMP-11 | `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec tsc --noEmit -p tsconfig.json` | `b3666d458f` | as above | web types | — | Fail → fixed in `335f065cd1` | `IMP-11-web-tsc-excerpt.txt`, `IMP-11-web-tsc-oom-attempt.log` (first attempt without the heap flag: V8 heap out of memory) | 2 new `TS2339` lines at `TeamStreamingService.spec.ts(220,…)` and `(221,…)` (this ticket's case) |
| IMP-12 | `pnpm -C autobyteus-web test:nuxt run services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | `335f065cd1` | as above | the edited Team streaming spec | BEH-002 | Pass | `IMP-12-web-team-streaming-spec.log` | `Tests  14 passed (14)` |
| IMP-13 | as IMP-11 | `335f065cd1` | as above | web types | — | Pass (no new errors from this ticket) | `IMP-13-web-tsc-excerpt.txt` | `Tracked-source error lines: 671`. New versus pre-merge: only `delegate-task.ts` and `model-catalog-service.ts`. Neither file is changed by the base or this branch; tsc resolves a second `autobyteus-ts` copy under the untracked packaged build `autobyteus-web/electron-dist/` (the excerpt shows the path). That build also adds 7,342 error lines and is the cause of the out-of-memory first attempt. |

- Not committed: the full web tsc logs `IMP-11-web-tsc.log` and `IMP-13-web-tsc.log` (about 2.6 MB each, mostly `electron-dist/` lines). They stay in the evidence folder in the worktree; the excerpts list everything that matters.
- Not rerun in IR-002: none of the requested checks were skipped. API/E2E and real-app checks (AC-007, DESK-01) belong to API/E2E and delivery, which rerun on the integrated state.
- Unchanged code since IR-001: everything except the 2 merged web files and the test edit. The base changes in other areas are covered by IMP-05, IMP-07 and IMP-10.

### Earlier round (IR-001, commit `e24ff6b333`, base `f3124db10f`; superseded by the IR-002 rows)

| Check | Result | Evidence |
| --- | --- | --- |
| Contracts | 33/33, 19/19 | `impl-contracts-tests.log` |
| Server typecheck | Pass | `impl-typecheck.log` |
| Server unit | run 1: 1 timeout in `run-file-change-service.test.ts` (FU-C, unrelated; see below); run 2: 5856 passed | `impl-test-unit.log`, `impl-test-unit-rerun.log` |
| Server integration | 414 passed | `impl-test-integration.log` |
| Web full | 4483 passed | `impl-web-test-nuxt.log` |

The IR-001 unit run 1 failure was a 2,000 ms wall-clock wait in `run-file-change-service.test.ts` under full-suite load. Its import graph has none of the changed server modules; it passed alone, under parallel load and in the rerun, and in IR-002's IMP-05. Recorded as FU-C.

## Frontend Rendered-Result Check

`Not Applicable` for visual design: the change adds no UI and does not change any components. The client logic change (range acceptance, batch dispatch) is covered by context and streaming-service specs that assert the resulting conversation segment text. The rendered result on a real stream (smooth updates, correct final text, no reopen) is AC-007, which belongs to downstream validation on an isolated instance.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007: an isolated instance per TESTING.md with a test data package. Run a Team, an Org and a standalone run that delegates (several tasks at once, for interleaving). Capture socket traces. Expect:
  - window-spaced `SEGMENT_CONTENT_BATCH` / `agent_presentation_batch` frames;
  - no client reopen or `*_CHANGE_SEQUENCE_GAP` warnings;
  - correct final text;
  - smooth screens.
- UNK-001: in those traces, check that a running status between deltas is absorbed. Batches should cover many sequences, and only one standalone status per agent per window should appear.
- Interval setting change mid-stream (AC-003), and a reconnect mid-stream (the snapshot base plus the next batch should start at base + 1).
- Server-initiated close: stopping an Org or delegated root mid-answer should deliver the tail text before `ROOT_LIFECYCLE` inactive.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-007 real-app check and the live UNK-001 confirmation.
- Independent API/E2E confirmation of AC-001..AC-006 and AC-009 as the API/E2E engineer sees fit.

## Self-Review Notes

- Rule order in `accept` matches DS-002. Content without a sequence is not batched; it falls to rule 5. No current producer sends it.
- The timer is reset to null before its flush. A flush with no batch is a no-op. Dispose clears the pending batch, the timer and the baselines.
- Batch items keep first-appearance order (`Map` insertion order). Each aggregate appends deltas in arrival order.
- The web contexts check every item identity before dispatching any item. A rejected batch leaves the state unchanged and requires a reopen, as a gap does.

## Follow-Ups (Out Of Scope)

- FU-A: delete or rewrite the stale, excluded `tests/integration/agent/agent-team-websocket.integration.test.js`.
- FU-C: `run-file-change-service.test.ts` uses a 2,000 ms wall-clock wait that timed out once under full-suite load (see Local Implementation Checks). Consider a load-tolerant wait or an event-driven assertion.
- FU-B: the Team identity sections of both streaming docs ("Team Execution Identity", "Team Stream Contract", Team commands) still describe the removed `agent_execution` / `execution_address` shapes. Current Team messages use `agent_run_id` and `change_sequence`. Only the segment shapes next to the new batch frame were corrected here.
