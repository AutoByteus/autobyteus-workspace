# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/requirements-doc.md` (SR-004, Approved)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/design-spec.md` (SR-004; round 3 reviews D-D2 and its Change Scope rows)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001, FU-002); `handoff-architecture-design-complete.md`; `handoff-design-revised-sr-002.md`; `handoff-design-revised-sr-004.md`; `code-review-report.md` (CRR-002, failure-origin, Design Impact on API-REV-001 F-1)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003 (evidence only), SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Solution Designer's revised design SR-004 (D-D2) after CRR-002 (`handoff-design-revised-sr-004.md`, branch head `d999196dbb`), 2026-11-23
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis (round 3): branch head `d999196dbb`, implementation tree `255a0b0ada` + tests `54a305f690`. Opened: node `raw-trace-to-historical-replay-events.ts:75-100,135-150,205-220`, `runtime-tool-trace-sequencer.ts:110-200`, `runtime-memory-event-accumulator.ts:110-122,199-206`, `agent-work-journal/rendering/result-envelopes.ts:135-146`, `run-projection-utils.ts:81-90`, `run-history/services/agent-run-view-projection-service.ts:40-150`, providers `claude-`/`codex-`/`local-memory-run-view-projection-provider.ts`, backends' interruption events (AGY `agy-stream-event-converter.ts:102`, Claude `claude-session-event-converter.ts:239-240`, Codex `codex-turn-event-converter.ts:83`, `codex-thread-event-converter.ts:63`); `autobyteus-ts` `memory-manager.ts:385-410`, `agent-turn-runner.ts:100-115`, `raw-trace-item.ts:17,61,92,123`; web `runProjectionConversation.ts:211-261`; `git grep` for the runtime-native providers' importers.
- Round 2 basis: branch `codex/phone-web-followups-609` at `510c3aba0f` (base `origin/personal` `f2c0d2a902`; product code unchanged). Round 2 additionally opened: web `stores/agentBackgroundTaskStore.ts:25-55` (`seedTasks` never replaces an ended row), `services/runStatus/agentRuntimeStatusState.ts:60-78` (an Offline status zeroes the running count), `components/mobile/views/MobileActivity.vue:7,46` and `MobilePairedShell.vue:47` (the phone's Activity is mounted only on its screen). Round 1 opened:
  - node `event-monitor-active-trace-page-projection.ts:1-80`;
  - `api/graphql/types/agent-background-task-view.ts:14,57-104`;
  - `workspaces/workspace-manager.ts:105-150`;
  - `api/rest/workspaces.ts:15-95`;
  - backends' `backgroundTaskInspection` (Claude `:26`, Codex `:50`, native `:113`, AGY `:45`, ACP `:71`) and the `run_ended` producers;
  - web `useBackgroundTaskPanelView.ts:1-112`, `useEventMonitorFilePreview.ts:55-145`, `workspaceResourceUrl.ts:30-115`, `toolDisplaySummary.ts:1-60`, `agentRunStore.ts:68,100`;
  - `git grep` for `summaryArgs` / `EventMonitorToolSummaryArgs` consumers.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: ten items over six subsystems (about 35 files). A GraphQL field changes shape. A contract package gains an export. The REST file routes gain registry restoration (behind the node access gate). Build inputs change (DESIGN.md rule 12).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 3: AC-D made explicit for read-back; D-D2 coherent; DEC-010's Codex premise is false but excludes only verification, N-3. Round 2: REQ-I, QR-1, DEC-007 and ASM-1 corrected within the direction; Codex snapshot lists out of scope; AR-001 resolved)
- Approved requirements / intended behavior understood: Yes (REQ-A…J; DEC-001…008).
- Relevant existing behavior and evidence confirmed: Yes for A–H and J. For I, the read path the design relies on was opened and contradicts the design (below).
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (round 1 AR-001 → REQ-I, AC-I, QR-1; round 2: no blocking finding).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on:
  - E: the node copies only its 16 keys (`event-monitor-active-trace-page-projection.ts:16-21`); it filters file keys for write/edit and command keys for terminal (`:34-46`); the web reads more keys (`toolDisplaySummary.ts:19-25`). True. With the shared list, `view_file`/`AbsolutePath` (a generic activity) gets every key and `run_command`/`CommandLine` gets the command keys, so AC-E is reachable.
  - J: the REST routes use `getWorkspaceById` (memory only), while `getOrCreateWorkspace` restores from the registry and throws "not found" for an unknown ID (`workspace-manager.ts:111-150`). True. Side effects of the restoring lookup on a GET:
    - an on-demand skill workspace (resolved by skill name);
    - the semantic memory workspace;
    - the temp workspace.
    The GraphQL Files path already reaches all three. Route permissions are unchanged. Accepted as recorded under D-J.
  - H: `resolveWorkspaceRelativeReference(href, '')` resolves against the root and blocks `..` past it (`workspaceResourceUrl.ts:62-115`); `openPath` checks the remote node first (`useEventMonitorFilePreview.ts:65-68`). True.
  - Round 2 (SR-002): the corrected ASM-1 holds. Claude, native and Antigravity end running tasks with `run_ended` at run end (producers cited in the notes). The web already zeroes the running count on Offline (`agentRuntimeStatusState.ts:66,74`). A row the store has ended is never turned back to running (`agentBackgroundTaskStore.ts:33-44`). `Error` correctly does not count as stopped.
  - Round 1 (SR-001, corrected): **I: ASM-1 "The node's task view lists ended tasks after a run stops" — false at the read the design uses.** The backends' `list()`/`current()` do keep ended tasks, but the GraphQL view answers `{ kind: 'unavailable', reason: 'inactive' }` for any run that is not active (`agent-background-task-view.ts:94-101`: `if (!run || !run.isActive()) return inactive();`, checked again after the read). DS-I's re-read fires exactly when the run's status turns Offline/Error, after the run stopped. See AR-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-A | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-B | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-C | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-D | User | Pass | Pass | Pass | Confirmed | — |
| BEH-E | User | Pass | Pass | Pass | Confirmed | — |
| BEH-F/G | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-H | User | Pass | Pass | Pass | Confirmed | N-1 resolved in SR-002 |
| BEH-I | User | Pass (SR-002) | Pass (corrected ASM-1) | Pass (DS-I: observed live → Offline ends running rows; no read; no polling while stopped) | Confirmed | AR-001 resolved; note N-2 |
| BEH-J | User/System | Pass | Pass | Pass | Confirmed | — |

### Round 3 (SR-004): D-D2, a stopped call read back from the node

Statements D-D2 relies on, opened at their lines:
- **The replay maps every stored error to `error`.** True: `createToolEvent` checks denied, then error, then success (`raw-trace-to-historical-replay-events.ts:88-93`). Both call sites (`:144`, `:214`) pass the `tool_result` trace as `terminal`. One change covers both.
- **The interruption signals are written only on interruption paths.**
  - Sequencer: `interruptTurn` runs only on `TURN_INTERRUPTED` (`runtime-memory-event-accumulator.ts:118-119,199-205`) and writes `sourceEvent = TURN_INTERRUPTED`. `persistTerminalResult` writes `TOOL_EXECUTION_INTERRUPTED` only for that event (`runtime-tool-trace-sequencer.ts:134-160,185-198`).
  - Native: `finalizePendingToolCallsForTurn` has one caller, the interruption branch of `agent-turn-runner.ts:107-110`, with `source: 'AgentTurnInterruptedEvent'`, stored as the raw trace's `sourceEvent` (`raw-trace-item.ts:61,92`).
  - A turn that fails writes neither signal, so it stays `error`. A denial is checked first and stays `denied`. True.
- **The journal's text rule is the same fact.** `INTERRUPTION_TEXTS = {"user_interrupt", "Tool execution interrupted."}` (`result-envelopes.ts:143-146`). Moving it into the shared rule keeps its outputs. True; Principle 11 satisfied.
- **Removing the web's `inferToolStatus` is safe for every producer.** Every provider builds its conversation through one transformer: `buildRunProjectionBundleFromEvents` → `buildRunProjectionConversation` (`run-projection-utils.ts:81-90`; local-memory, Claude and Codex providers). So `toolStatus: event.status` in that transformer reaches every entry. The replay already decides `denied` (`:88-90`), the same as the web rule it replaces (`runProjectionConversation.ts:211-224`). True.
- **Persisted data Not Affected.** The rule reads fields every stored trace already has (`sourceEvent`, `toolError`), and the projection is computed at read time. True.
- **DEC-010: "Codex runs are read from Codex's thread files" — false for the UI.** Normal history reads every runtime through the local replay. `AgentRunViewProjectionService` uses only `localProjectionProvider` (`agent-run-view-projection-service.ts:54,100-124`). The Codex and Claude providers are diagnostic utilities that nothing outside their own tests imports (`git grep`; `run_history.md:1000-1001`, provider docstrings). Codex is an external-provider runtime whose events the node records (`isExternalProviderRuntimeKind`), and its converters emit `TOOL_EXECUTION_INTERRUPTED` and `TURN_INTERRUPTED` (`codex-thread-event-converter.ts:63`, `codex-turn-event-converter.ts:83`). So D-D2 as designed already gives Codex read-back "Stopped". The exclusion only removes verification and would send a wrong follow-up (FU-008). See N-3 (non-blocking).

Verdicts for D-D2 (the round 1/2 tables below stay valid for A–J):
- Spine: `Pass` — `stored tool_result (sourceEvent, toolError) -> isInterruptedToolResult -> createToolEvent status 'interrupted' -> activities / page statusKey / conversation entry toolStatus -> web hydration -> "Stopped"`. One owner of the fact (the node rule); the web stops re-deriving.
- Ownership and boundaries: `Pass` (`agent-memory/domain/` beside the trace models it reads; the sequencer and the journal import it; `autobyteus-ts` keeps its literal because it cannot depend on the server, a recorded reason that holds).
- Interface: `Pass` (`isInterruptedToolResult({ sourceEvent, error })`, a pure function; `toolStatus?` on the conversation entry, JSON wire, same version per rule 9).
- Derived consumers: `Pass` (activities builder, page `statusKey`, conversation transformer, Claude/Codex providers, `recent-run-projection-policy.ts` and `run-projection-utils.ts` status reads to be listed by implementation per Case 26; team member reconciliation to be checked).
- Behavior by absence: `Pass` (an explicit rule from explicit stored signals).
- Persisted data: `Pass` (`Not Affected`).
- Tests: `Pass` (each writer's form, error-only, failure stays `error`, denial stays `denied`; MSP-102 read-back paths).

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` FU-001, FU-002 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Per item | — |
| Root cause explicit and evidence-backed | Pass | E duplicated policy, J parallel path, B missing invariant; I openly unknown (DEC-007, FU-001) | — |
| Refactor decision explicit | Pass | E and J consolidate | — |
| Supported by concrete sections | Pass | D-A…D-J, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | One Owner Per Node, In Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-A | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-B | Operational | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-C | Operational | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-D | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-E | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-H | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-I | Return-Event | Pass | Pass (SR-002) | Pass (panel view = trigger; store = rows and the run-end shape) | Pass | Pass | Pass | Pass |
| DS-J | Primary | Pass | Pass | Pass (route → manager) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WorkspaceManager.getOrCreateWorkspace` | Pass | Pass | Pass | Pass | Routes no longer read the map |
| `openPath` (run-relative) | Pass | Pass | Pass | Pass | Renderer hands the href over |
| `useBackgroundTaskPanelView` | Pass | Pass | Pass | Pass | Still the one refresh owner |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| web / node → `agent-presentation-contracts` | Pass | Pass | Pass | Pass | Existing dependencies |
| Panel view ← `runLive` from callers | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass` (no binding added; `getWorkspaceManager()` used, not added).

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TOOL_SUMMARY_ARGUMENT_KEYS` | Pass | Pass | N/A | Low | Pass |
| `file-path-action` discriminated union (`absolute` / `run-relative`) | Pass | Pass | Pass | Low | Pass |
| GraphQL `summaryArgs: JSON` | Pass | Pass | N/A | Low | Pass (tradeoff recorded: one key list over field typing; values stay strings) |
| `useBackgroundTaskPanelView(runId, expanded, runLive)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `N/A` (no port or wrapper added).

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Relative path confinement | Pass | Pass (576 resolver) | N/A | Pass | — |
| Workspace restore | Pass | Pass | N/A | Pass | — |
| Task list end after stop | Pass | Pass (store owns the rows; `endRunningTasksForRunEnd` beside `seedTasks`) | N/A | Pass | AR-001 resolved |
| Liveness rule | Pass | Pass (`isAgentStatusLive` exported) | N/A | Pass | — |
| Summary keys location | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All areas in the design's allocation table | Pass | Pass (except I, AR-001) | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Summary key list | Pass | Pass (contract package both sides import) | Pass | Pass | — |
| Interrupted icon | Pass | Pass (card reads the activity presentation's icon) | Pass | Pass | FU-002 records the other icons |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TOOL_SUMMARY_ARGUMENT_KEYS` by kind | Pass | Pass | Pass | N/A | Pass | — |
| `RunProjectionToolActivityEntry` without `contextText` | Pass | Pass | Pass | N/A | Pass | Dedupe score loses the same 1 on both sides |

Derived consumers listed: `Pass` (SR-002 added `recent-run-projection-graphql.e2e.test.ts` and `codex-command-failure-detail.page.vue`).

Vocabulary: `Pass` ("Stopped" matches the product's run-stop word).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping rows | Pass | Pass | N/A | Pass | SR-002 rows for the panel view, store and callers |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-presentation-contracts/src/tool-summary-argument-keys.ts`, `scripts/check-contract-dist.mjs` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `contextText` and both `resolveContextText`; node key lists; GraphQL object type; web key arrays; REST `getWorkspaceById` use; stale hydration case | Pass | Pass | Pass | Pass | `getWorkspaceById` itself stays (three callers named) |

## Legacy / Backward-Compatibility Verdict

| Area | Retention Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| `contextText`, typed `summaryArgs` | No | Pass | Pass | Rule 9 |

## Persisted-Data Transition Verdict (When Applicable)

N/A — `Not Affected`; confirmed (read-time projection; registry read only).

## Change / Refactor Safety Verdict

| Area | Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Sequence 1–10; rule 12 fresh-start build and build-only release run named | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Bad Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared keys, relative link, DS-I trigger | Yes | Pass | Pass | Pass | SR-002 updated the DS-I example |

## Material Premise Validation (Only When Needed)

### `MP-001` — After the run stops, the task list can read the node's final task view

- Related approved requirement: REQ-I (the list shows each task's end within 10 s of the run's stop, even when a live update was missed); AC-I; QR-1.
- Relevant behavior ID(s): BEH-I.
- Initiating basis kind: `User`.
- Independent trigger: the founder stops a run while its Activity (phone) or Background Tasks section (desktop) lists a running task (SCN-I), and the live `BACKGROUND_TASK_UPDATED` is missed (AC-I drops it on purpose in MSP-99).
- Forward path (target design): the run stops → `AGENT_STATUS` offline → `runLive` false → `refresh()` → `agentBackgroundTaskView(agentRunId)`. The resolver finds the run not active and answers `AgentBackgroundTaskUnavailable { reason: inactive }` (`agent-background-task-view.ts:94-96,101`). The panel view sets `mode = 'unavailable'` (`useBackgroundTaskPanelView.ts:72`). `tasks` then falls back to the stream store's rows, which still show `running` (`:27-32`). The existing `finally` re-schedules a 2 s refresh with no bound for any mode but `event-stream` (`:78`).
- Lifecycle consequence: the row never reads Stopped, so AC-I fails on the branch as it does on the base. The panel also keeps reading every 2 s with no end while expanded, which works against QR-1's "at most 5".
- Reachability: `Reachable` (it is AC-I's own scenario); the premise ASM-1 is `Not Established` for the read used.
- Review consequence: AR-001 (round 1). Round 2: SR-002 no longer reads; the end is applied on the web from the observed stop, so the premise is no longer needed.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 3)

## Findings

None open. AR-001 below is `Resolved` (ARCH-REV-002) and kept for traceability. Round 3 has no blocking finding; N-3 and N-4 are non-blocking (Residual Risks).

### AR-001 — D-I re-reads a view the node refuses for a stopped run, so the task never reads Stopped

- Status: `Resolved` (SR-002 D-I, ASM-1, REQ-I, QR-1, DEC-007; verified in ARCH-REV-002)
- Type: Design Impact
- Severity: High (blocking in round 1)
- Protects: REQ-I, AC-I, QR-1.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Affected behavior: BEH-I / SCN-I, on the phone's Activity and the desktop Background Tasks section, for event-stream runtimes (Claude, native, AGY).
- Concrete problem: DS-I fires its re-read when the run is no longer live. By then the run is not active, and `agentBackgroundTaskView` answers `unavailable/inactive` for any inactive run. ASM-1 was validated against the backends' `list()`, not against the read the panel actually makes. The re-read therefore never seeds the ended tasks: the row keeps showing `running`, and the existing unbounded 2 s retry in non-event-stream modes runs on (MP-001).
- Evidence: MP-001; `agent-background-task-view.ts:94-101`; `useBackgroundTaskPanelView.ts:27-32,65-79`.
- Required update: make the end reach the list through a path that works after the stop, and state who drives it and in what order. Options for the Solution Designer:
  1. **Web only:** on the explicit live → not-live transition, the panel view (the refresh owner) ends every listed row that still shows `running` with the run-end reason (`run_ended`, "Stopped: the run ended"), in the stream store that owns the rows. Basis: every event-stream runtime ends its tasks at run end; `run_ended` is produced by the Claude registry, the native reporter and the AGY monitor (`claude-background-task-registry.ts`, `autobyteus-background-task-reporter.ts`, `agy-background-task-monitor.ts`). It needs no read and no loop. It is an explicit rule keyed on an explicit event, not behavior by absence. Record the invariant ("a run that is not live has no running background task") and its evidence in the design.
  2. **Node:** let the view answer a published run that has stopped with its final task list (a resolver and run-lifecycle change). Then keep the bounded re-read. Check that the run is still published after the stop, or name where the final list lives.
  Whichever is chosen:
  - stop the panel's unbounded 2 s retry for a run that is not live, or bound it as QR-1 says;
  - correct DS-I, the bounded local spine, the DS-I example and ASM-1;
  - make MSP-99 assert the outcome (it already drops the live update);
  - add a unit case for the not-live transition with a running row.
- Why proportionate: it corrects the one path REQ-I depends on; option 1 removes machinery rather than adding it.
- Recommended recipient: Solution Designer.

## Classification

N/A (Pass). Round 1: `Design Impact` (AR-001, resolved).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational pass notice to the Solution Designer.

## Residual Risks

- N-3 (round 3, non-blocking correction, AC-D / DEC-010 / FU-008): DEC-010's basis is false. UI history reads Codex runs from the node's own recorded traces, not from Codex's thread files, and Codex emits both interruption events, so D-D2 covers Codex read-back already. Suggested before delivery:
  - drop the Codex exclusion from AC-D and DEC-010;
  - withdraw FU-008 (not sent);
  - add a Codex form to the replay unit cases (a `TOOL_EXECUTION_INTERRUPTED` result recorded from a Codex run).
  This changes no design structure.
- N-4 (round 3, non-blocking, Principle 7): `codex-run-view-projection-provider.ts` and `claude-run-view-projection-provider.ts` are imported only by their own tests (`git grep`). D-A touched the Codex one (its `contextText` copy was removed). Code reached only by its own tests is dead code in a touched file. Either remove both providers, their tests and their doc mentions in this ticket, or record them in `follow-ups.md` with the evidence and why not now. Their docs call them diagnostic utilities, but no script or entry point uses them.

- N-1 (H): resolved in SR-002 (metadata root fallback as the absolute flow). Round-1 text: for a run-relative link, the design takes the root from `activeWorkspaceTarget.workspaceRootPath` and fails when it is empty. The absolute-path flow first resolves a missing workspace through `resolveWorkspaceMetadataForTarget` (`useEventMonitorFilePreview.ts:91-97`). Use the same resolution so a run whose folder is known but not yet loaded does not answer "could not open" (REQ-H1).
- N-2 (I, non-blocking suggestion): the end is applied by the panel view, so only a list that is mounted when the run stops gets it. The initial Offline deliberately never counts (`DEFAULT_AGENT_STATUS`). Consider a phone user who stops the run from the run screen and opens Activity afterwards: `MobileActivity` is mounted only on its screen (`MobilePairedShell.vue:47`), so a lost end update would still show the task running there. That case is outside REQ-I's wording ("while its tasks are listed"), so it is not a finding. If wanted, apply the same store action where the run's status is written Offline from a live status (the writer that already zeroes the count, `agentRuntimeStatusState.ts:66`), so every later list is right too.
- E: SR-002 added the two missing `summaryArgs` consumers.
- J: a GET can now create the temp workspace or open the semantic memory / an on-demand skill workspace after a restart. This matches the GraphQL Files path and is accepted (D-J).
- Rule 12 (build inputs) is covered by the design's fresh-start build and build-only release run; C's Windows behavior is proven only by that run (R recorded).
- FU-001 (unknown hop) and FU-002 (two icon owners) are correctly recorded as follow-ups.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, SR-004 D-D2)
- Material-Premise Gate: `Pass` (no new premise; D-D2's signals verified at their writers)
- Round 3 notes: D-D2 is a sound read-side fix. One node rule reads what each writer already stores, both replay call sites and the journal use it, and the conversation entry carries the node's status so the web's re-derivation goes. Every provider shares the conversation transformer. Persisted data Not Affected. N-3 (DEC-010's false Codex premise) and N-4 (test-only providers) are non-blocking. Classification Large / High unchanged.
- Round 2 notes (kept):
- Notes: AR-001 resolved. D-I applies the run's end to its listed running tasks on the observed live → Offline transition, with no read and no polling while stopped, based on the corrected ASM-1. N-1 and the E consumers are added. A–H and J pass as in round 1. Classification Large / High unchanged; DESIGN.md rule 12 steps are named. N-2 is a non-blocking suggestion.
