# Code Review Report — claude-sdk-streaming-input-session

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 4: the SR-012 delta). Round 3 was the API/E2E failure-origin review (CRR-003, CR-002)
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (Approved, SR-011)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md` (SR-011)
- Supplemental Task Artifacts Reviewed As Context: `solution-handoff.md`; `probe-evidence/` (evidence only)
- Relevant Solution Revision IDs: SR-006..SR-012
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md` (ARCH-REV-004 Pass; IC-1..IC-4)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003, ARCH-REV-004, ARCH-REV-005
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003, IR-004
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Trigger (round 4): `Implementation Complete` IR-004 from `/implementation_engineer` (commit `d3e227389` on top of `b7c6d86b3`; SR-012; ARCH-REV-005 Pass with IC-5). Trigger (round 3): API/E2E `Fail` API-REV-001 from `/api_e2e_engineer`, with one failure: API-F-001 / RSK-007. Round 2 trigger: `Local Fix complete` for CR-001 from `/implementation_engineer` (IR-003; commit `b7c6d86b3` on top of `f33b175d4`). Round 1 (CRR-001) reviewed IR-002 (`26450e6b0`, `f33b175d4`; base `origin/personal` @ `6f7b5e371`)
- Prior Review Round Reviewed: 2 (CRR-002, `Pass`). Round 1: CRR-001, `Fail`, CR-001
- Latest Authoritative Round: 4
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-execution-coverage-report.md` (section "Failure Detail — RSK-007")
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: API-F-001 (RSK-007; REQ-010 preserved per-turn token accounting; REQ-008 crash reopen)
- Exact Failing Commands / Execution Mode: `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts -t "RSK-007" --no-watch`, run live on PATH claude 2.1.283 and SDK-bundled 2.1.280; both fail
- Failure Evidence Paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-evidence/c08-life-05-crash-and-usage.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/api-e2e-evidence/c08b-rsk007-usage-probe.log`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed by the diff: 99 files, a session-layer rewrite, and a shared AgentRun input contract change that also affects Codex.

## Review Scope

- Changed implementation and behavior reviewed:
  - Claude streaming-input session: client, streaming handle, process, turn tracker, background-task registry, message builder, session, backend.
  - Shared AgentRun claim walk, `notInto` mark and `undeliveredRetryAsStart` requeue.
  - Codex IC-3 code split and image-source extraction.
  - Notice event → memory trace → replay → web hydration.
  - RSK-007 usage guard; provider-lifecycle reshape; docs.
- Files / areas reviewed:
  - `autobyteus-server-ts/src/agent-execution/{input,domain,backends/claude/**,backends/codex/**,shared}`
  - `src/runtime-management/claude/client/*`
  - `src/agent-memory/*`
  - `src/run-history/projection/*`
  - `autobyteus-ts/src/memory/models/raw-trace-item.ts`
  - `autobyteus-web/services/runHydration/runProjectionConversation.ts`
  - `docs/modules/agent_execution.md`, `docs/modules/token_usage.md`
  - the changed unit suites (spot-read) and the fake streaming SDK helper
- Checks the reviewer ran:
  - The changed-area unit suites: 27 files, 284 tests, all pass.
  - One throwaway reviewer probe of `AgentRunInputAdmissionState`, deleted after running (evidence for CR-001).
  - Round 2: reviewed the `b7c6d86b3` diff. Reran the input, AgentRun, Claude-backend and Codex-backend suites: 19 files, 204 tests, all pass.
- Explicit exclusions:
  - Live API/E2E execution; that stage owns AC-001/004/006..009/012/014.
  - The rendered web check.
  - `probe-evidence/*.mjs`, which is evidence only.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`.
  - REQ-001..012; AC-001..016.
  - DEC-001..007: 001 notice via `SYSTEM_TASK_NOTIFICATION`; 002 no idle close; 004 inline images; 005 clean cut; 006 no task UI; 007 = A, shared claim rule for Claude and Codex.
- Design-spec behavior map verified against the implementation: `Yes`. The SPINE-1..5 and SR-011 paths are traced below.
- Design review report and round confirmed: ARCH-REV-004 `Pass`, with binding constraints IC-1..IC-4.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-004 (REQ-001/006) | Confirmed | `ClaudeSession.submitInput` → `ClaudeSessionProcess.ensureOpen` (lazy; `buildOpenBinding` create→resume) → `ClaudeSdkClient.openStreamingSession` (`prompt: ClaudeSdkInputChannel`). No idle timer. Close only via `closeProcess` (manager `terminateRun`/cleanup) | — |
| BEH-007 | Confirmed | `ClaudeProviderSessionLifecycle.noteProcessOpened/noteProcessClosed`; the phase moves to resume after the first open | — |
| BEH-002 / BEH-009 (REQ-004/012) | Confirmed (CR-001 resolved in round 2) | `claimNext` walk skips entries forwarded into the active IDENTIFIED turn and stops at any other non-queued entry. Claude `registerInput` handles append/join. Codex routes through `turn/steer`. Requeue on `undeliveredRetryAsStart` | — |
| BEH-001 / BEH-008 (REQ-002/003/009) | Confirmed | Policy env removed. `ClaudeBackgroundTaskRegistry` feeds the tracker opener → `notice` → `SYSTEM_TASK_NOTIFICATION` → accumulator (sender-scoped) → replay → web segment | — |
| BEH-003 (REQ-005) | Confirmed | `ClaudeSession.interruptActiveTurn` → `tracker.requestInterrupt` (IC-1: `anySent \|\| cliTurnOpen`) → `interruptAndCancelQueued` → `applyInterruptResponse` → settlement | — |
| BEH-006 (REQ-007) | Confirmed | `closeProcess`: `tracker.close()` (settles interrupted) → `process.close()` (awaits the opening, closes the query, awaits the pump) | — |
| REQ-008 | Confirmed | `runPump` catch or end while not closing → `session.close()` → `EXITED` → `onExit` → `tracker.processExited` (turn-terminal `ERROR`) → the next input reopens with resume | — |
| BEH-005 (REQ-011) | Confirmed | `buildClaudeUserMessage` + shared `resolveContextImageSource`; unreadable images become a text note (AC-013). The Codex mapper produces identical output | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-SCN-001 | REQ-012, AC-016, BEH-009 | User/System | User or teammate → Claude/Codex agent | Inform a working agent; the message lands just as its turn ends | Message send (websocket / `send_message_to`) while the agent is running | Explicit Edge (approved AC-016) | `AgentRun.postUserMessage` claims `append_to_active_turn(T)` (AgentRun still sees T) → the backend has already settled T: Claude `registerInput` finds the tracker IDLE; Codex's pre-RPC check finds `activeTurnId≠T` → `undeliveredRetryAsStart` → requeue → the next `start_turn` | The message starts the next turn and resolves exactly once, at that turn's terminal | requirements AC-016; design SR-011 "Definitely-undelivered append"; ARCH-REV-004 "The trigger is Reachable" | Supported Explicit Edge Scenario | Use |
| CR-SCN-002 | REQ-004/012, AC-003/015 | User/System | User or teammate | Steer a working agent mid-turn | Message while running | Normal | claim walk → append → Claude tracker `written` → settle after every uuid is answered | Delivered into T; B and C resolve once at T's terminal | AC-003, AC-015 | Supported Normal Scenario | Use |
| CR-SCN-003 | REQ-003/005, IC-1 | User during System | User Stop on a Claude-started turn | Stop the current turn | Stop button | Normal | `interrupt(turnId)` → `requestInterrupt` → SDK interrupt (the CLI turn is open) | `TURN_INTERRUPTED`; the process stays alive | P-010, probes F/O | Supported Normal Scenario | Use |
| CR-SCN-004 | REQ-002/003 | System | Claude CLI | A background task completes while idle, busy, or stopped | CLI `task_notification` | Normal | registry → provider-turn notice, consumption, or carry-over | One notice, no duplicate reporting | probes E/J/O/Q | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | The requeue path in `applyDispatchResult` keeps a stale `pendingTerminal` from turn T | CR-SCN-001 | A message arrives as T ends (AC-016) | See CR-001. Because the terminal is observed during the in-flight append claim, `claim.pendingTerminal = T terminal`. The requeue then resets state, dispatch kind and associated turn, but not `pendingTerminal`. On the later `start_turn` forward into T2, `applyPendingTerminal` finishes the entry at once with T's terminal (`completed`, `interrupted` or `failed` for T), and T2's real terminal never reaches it | `agent-run-input-admission-state.ts` L212-219, L306-310, L414-421. `agent-run.ts` L310 enqueues the result application after `await backend.dispatchUserInput`. The Claude backend emits `TURN_COMPLETED` synchronously into `dispatchProcessedAgentRunEvents` → `dispatchQueue.enqueue` before `registerInput` rejects, so in the Claude race the terminal task always precedes the result application. Reviewer probe output: `[admitted, forwarded(start_turn,T2), turn_associated(T2), completed(T)]` | Promote | Bounded local fix plus a unit test for the terminal-before-result ordering. Resolved in round 2 (`b7c6d86b3`) |
| CAND-002 | The provider-UUID "unconfirmed completion" guard was dropped | Contract: BEH-007 resumability | A `result` with no `session_id` on any frame of the process | Every SDK frame carries `session_id`; `handleFrame` confirms it; a conflicting id throws → pump failure → close → turn `ERROR` | SDK stream shape (probe logs P/Q show `session_id` on every frame) | Reject | No supported path produces an unconfirmed completion |
| CAND-003 | RSK-007 zeroed-usage guard drops non-success results whose `modelUsage` rows are all zero | Token accounting contract (`token_usage.md`) | Crash/startup-error result (SDK doc) | Forwarding it would regress the reconciler baseline (`regressed` → re-baseline) and the next result would count the whole session again; the guard drops only all-zero rows, which carry no usage | `claude-session-token-usage.ts`; reconciler L156-164 | Reject (as a defect) | Proportionate, and it loses no real usage. Totals after a crash reopen remain a live API/E2E check. **Round 3:** the guard itself is still correct. Its supporting premise ("a resumed process continues from the totals its transcript saved") holds only after a clean exit, so see CR-002 |
| CAND-004 | Registry: a `result` with `origin.kind === "task-notification"` consumes completions recorded before that CLI turn | CR-SCN-004 | Completion while a canonical input turn spans a CLI-started continuation turn | Without it, a later provider turn would re-announce a completion the model already reported | Tracker test "treats a completion delivered by a notification-origin continuation CLI turn as consumed"; probe Q origin field | Reject (as a defect) | A consistent refinement of the ARCH-F-005/007 intent |
| CAND-005 | The event-monitor active-trace page has no visual for `system_task_notification` | DEC-006; design "Web: no change expected" | — | The notice replays in the conversation; the monitor ignores it | Requirements UI section (the notice appears in the conversation only) | Reject | Not required by the approved UI scope |
| CAND-006 | `failInput` with other live work cancels the failed uuid, so the canonical turn can complete while that input never reached Claude | REQ-004 | Build or send throws after `ensureOpen` succeeded | The builder never throws for image problems (AC-013 note); `send` throws only when the process is not open, and exit settles the turn with `ERROR` | builder + process code | Reject | No supported initiating failure identified |
| CAND-007 | `CLAUDE_TURN_INTERRUPTING` start rejection is a visible failure with no retry | REQ-012 | AgentRun claims `start_turn` while the tracker holds an interrupt-pending turn | AgentRun's interrupt reservation blocks claims until the terminal; the tracker is IDLE by then | `agent-run.ts` L267 | Reject | Not reachable in normal sequencing |
| CAND-008 | Relative image URIs are read relative to the server cwd | REQ-011 | — | UI context files are absolute paths or URLs; Codex has the same classification | shared source | Reject | Unsupported premise |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Per-turn lifetime replaced by a run-lifetime process owner; the `Missing Invariant` fix sits in the shared owner | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements. Tracker tests are derived from probe frame sequences | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | SPINE-1..5 map one-to-one onto session → process → tracker → registry → client | — |
| Ownership boundary preservation and clarity | Pass | The tracker is pure (callbacks only); only `ClaudeSessionProcess` touches the streaming handle; the claim rule lives only in `AgentRunInputAdmissionState` | — |
| Off-spine concern clarity | Pass | Registry, builder, image source, token usage and diagnostics each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses `SYSTEM_TASK_NOTIFICATION`, the reconciler, the projectors and the AgentRun append path; the image source was extracted from Codex | — |
| Reusable owned structures check | Pass | `context-image-source.ts` shared by Codex and Claude; sender constant in a neutral domain file | — |
| Shared-structure/data-model tightness check | Pass | `undeliveredRetryAsStart?: true` has its validity documented; tracker state matches the design fields (`stopSequence`/`sawInterruptAbort` justified by IC-2 and the settle kind) | — |
| Repeated coordination ownership check | Pass | Undelivered mapping: each backend decides its own evidence, and AgentRun owns the requeue | — |
| Empty indirection check | Pass | `bindClaudeSelectedModel` is thin but owns the binding shape | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | See the size audit | — |
| Ownership-driven dependency check | Pass | agent-memory → neutral `domain/system-task-notification-senders.ts`; no cycles introduced | — |
| Authoritative Boundary Rule check | Pass | The backend calls only `ClaudeSession`; the session never calls the SDK directly; the manager and cleanup call `closeProcess` only | — |
| File placement check | Pass | New files sit under `backends/claude/session`, `runtime-management/claude/client` and `agent-execution/shared` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `submitInput(message, dispatch)`, `interrupt(turnId)`, `openStreamingSession(options)`, `interruptAndCancelQueued()` | — |
| Naming quality and naming-to-responsibility alignment check | Pass | — | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | A clean rewrite; no dual path | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No remaining references to `startQueryTurn`, `closeQuery`, `activeQueriesByRunId`, the policy env, `claude-active-turn-execution`, `assertCurrentQueryConfirmed` or the client auto-approve | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Round 2 covers the terminal-during-claim ordering: admission-state `it.each` (T completed, T failed) and the AgentRun test with a pending append dispatch. B resolves exactly once, with `completed(turn-B)` | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/helpers/fake-claude-streaming-sdk.ts`; admission-state `createState` helper | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The runtime-policy integration test was deleted; the background-bash E2E was replaced | — |
| API/E2E readiness for the next workflow stage | Pass | CR-001 is fixed; the remaining live ACs are listed under Residual Risks | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session.ts` | 477 | Pass | Triggered (+330/−355, a design-mandated rewrite) | Pass: composition plus the public operations; turn, process and registry logic are delegated | Pass | Accepted | — |
| `backends/claude/session/claude-turn-tracker.ts` | 368 | Pass | Triggered (new, +409) | Pass: one state machine | Pass | Accepted | — |
| `runtime-management/claude/client/claude-sdk-client.ts` | 471 | Pass | Pass | Pass | Pass | Accepted | — |
| `input/agent-run-input-admission-state.ts` | 418 | Pass | Pass | Pass | Pass | Accepted (CR-001 fixed in round 2) | — |
| `backends/codex/thread/codex-thread.ts` | 500 | Pass (at the limit; unchanged size) | Pass | Pass | Pass | Accepted | — |
| `backends/claude/events/claude-session-event-converter.ts` | 497 | Pass (near the limit, +12) | Pass | Pass | Pass | Accepted; watch future growth | — |
| All other changed source files | ≤ 320 | Pass | Pass | Pass | Pass | Accepted | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No single-message fallback or flag |
| No legacy old-behavior retention in changed scope | Pass | Policy env, per-turn query, `AbortController` path, auto-approve removed |
| Dead/obsolete code cleanup completeness in changed scope | Pass | grep is clean |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Additive `system_task_notification` trace and optional `sender_id`; no migration |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | `Directly Usable — No Migration` |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and already done. `agent_execution.md` covers the claim rule, the narrowed fallback rule, the streaming lifecycle, interrupt, images and the notice. `token_usage.md` covers streaming cumulative usage and zeroed results.
- Why: the lifecycle and input contract changed.
- Files or areas likely affected: covered by this change. No further docs are needed for CR-001, because the documented behavior is already correct and only the code deviates.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001..P-009 | Confirmed | — |
| P-010 (IC-1) | Confirmed | `requestInterrupt` returns `sdkInterruptRequired = anySent \|\| cliTurnOpen`; tests at tracker L303/L313 |
| Round-4 end-of-turn append race (AC-016) | Confirmed Reachable | Additional evidence: in production the terminal is observed while the claim is in flight. This makes CR-001 the dominant Claude ordering, not a corner case |

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Overall score (`/100`): 93
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | SPINE-1..5 are implemented as designed, with a single pump and synchronous `registerInput` | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The tracker is pure, the process owns SDK I/O, the undeclared `cancelQueued` is confined to one adapter, and the shared claim has a single owner | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Explicit dispatch union; the optional result flag has its validity documented; IC-3 uses a distinct code | IC-4 claim-time hint (documented) | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | New files match their owners | `claude-session.ts` (477) and the converter (497) are near the limit | Keep future additions out of these files |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Shared image source; additive trace fields | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names match the design vocabulary; comments explain probe-derived rules | — | — |
| `7` | `API/E2E Readiness` | 9.2 | Broad unit and fake-CLI coverage, now including the production AC-016 ordering; live Claude suites pass on both CLIs | Live AC-014 and AC-004 are not run yet (API/E2E-owned) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | Tracker settlement, IC-1, IC-2, crash and close paths are sound. The requeue now clears `pendingTerminal`/`observedTurnId`, so a requeued input resolves only at its own turn | Live verification of the race is still pending | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Obsolete code, tests and docs removed | — | — |

## Round 4 Implementation Review — SR-012 Delta (CR-002)

- Scope:
  - `d3e227389`: `claude-session.ts`, `claude-session-token-usage.ts`, `agent-run-token-usage.ts`, `claude-sdk-model-usage-reconciler.ts`, `claude-sdk-client.ts` (OBS-2), `token_usage.md`, `agent_execution.md`.
  - Tests: `claude-sdk-usage-series-restart.test.ts` (new); `claude-session.test.ts` and `claude-sdk-client.test.ts` (updated).
  - The API/E2E durable test changes are still uncommitted and out of scope here; they get a proportional test review later.
- Design conformance (SR-012 rules 1-4, IC-5):
  - Signal owner: `ClaudeSession` sets `seriesRestartPending = binding.kind === "resume"` per process open (`handleProcessOpened`). It is consumed only when `emitClaudeTokenUsageEvent` actually emitted (IC-5), so a dropped zeroed first result passes the marker on. A reopen after an exit creates a new `openProcess` state, so every resume generation is marked once.
  - Payload: optional `claude_sdk_series_restart?: true`, preserved only for SDK observations in `createTokenUsageUpdatedPayload`. The checkpoint JSON shape is unchanged, consistent with `Directly Usable — No Migration`.
  - Reconciler:
    - A marked observation skips the regression check and re-anchors every row.
    - The selected matched row admits exactly the per-turn main-loop counts, flagged `claude_sdk_series_restart_main_loop_delta`.
    - Missing or incomplete main-loop counts admit nothing, flagged `claude_sdk_series_restart_main_loop_unavailable`, with `partial` set.
    - Unmarked observations are byte-for-byte unchanged in behavior.
  - Correct for any restart origin, including the undetectable restore-time origin, because it never differences across a generation boundary.
- Candidate gate for the delta:
  - A duplicate marked observation double-counting the main loop: **Reject**. `foldTokenUsageObservation` suppresses duplicate `usage_event_id`/idempotency digests before `reconcileClaudeSdkResult` (token-usage-run-fold L109-115).
  - A marker consumed by an unmatched-selected observation: **Reject** as a defect. The rows are still re-anchored, so later differencing is exact, and the loss is bounded and flagged as today.
  - A clean restore is now approximated by the main loop: accepted in ARCH-REV-005 (uniformity; a clean exit cannot be proven).
- OBS-2: one warning per open when the spawn env has `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`; no override (REQ-009 honored); operator doc note added.
- Docs: `token_usage.md` corrects the clean-exit premise and documents the rule, both flags, and the IC-5 carry-over.
- Tests:
  - Reconciler: origin 0; restore-time origin above the checkpoint; clean restore; same-process and create unchanged; missing main loop.
  - Session: only the first observation is marked; IC-5 zeroed-first carry; reopen after exit marked and create not marked.
  - The mutation checks reported by the implementer are consistent with the assertions.
- Reviewer checks: 35 files and 317 tests pass (the changed tests plus `tests/unit/token-usage`, Claude backend, input and AgentRun); `tsc -p tsconfig.build.json --noEmit` is clean.
- Sizes: `claude-session.ts` 487, `claude-sdk-client.ts` 479, reconciler 211, `agent-run-token-usage.ts` 370. All ≤ 500, and the deltas are small.
- Implementer's live evidence: RSK-007 passes 2/2 on both CLIs. The post-crash turn is counted (13,727 / 13,706), flagged `claude_sdk_series_restart_main_loop_delta`, and the next turn is exact. The API/E2E rerun will confirm it.
- Result: `Pass`. CR-002 is resolved. There are no new findings.

## API/E2E Failure-Origin Review (Round 3) — API-F-001 / RSK-007

### Scenario And Contract Basis

- The scenario is still approved behavior:
  - REQ-008 / AC-009: an unexpected Claude process exit fails the active turn, and the next input reopens via `resume`. AC-009 passes live.
  - REQ-010 preserves per-turn token usage and cost accounting.
  - The design lists RSK-007 and an explicit escalation trigger: "the usage reconciler double-counts or loses usage in the streaming lifecycle".
- Scenario validity: `Supported Explicit Edge Scenario`.
  - Initiator: an unexpected CLI exit (a supported operational/system event with an approved outcome).
  - Forward production path: `ClaudeSessionProcess.runPump` → `EXITED` → the next `submitInput` → `ensureOpen` (resume binding) → first `result` → `emitClaudeTokenUsageEvent` → `TokenUsageRunPersistenceTransformer` → `reconcileClaudeSdkResult`.
- The test reproduces an established production path; it does not invent one. The SIGKILL only simulates the supported crash event, and all accounting runs through production code.

### Evidence And Mechanism (verified)

- Both CLIs show the same pattern:
  - Turns 1 and 2 are counted exactly.
  - After the SIGKILL during turn 3, the resumed process's first result reports cumulative `modelUsage` equal to that turn's main loop (16,084 == 16,084; bundled 13,683 == 13,683). The counter restarted from the last cleanly persisted total, which was 0 here.
  - Turn 5 is exact again.
- In `claude-sdk-model-usage-reconciler.ts` (L141-164):
  - A checkpoint series is keyed only by `sessionId` + raw model (`sameSeries`).
  - The lower cumulative total is therefore `regressed`. The row is suppressed (`claude_sdk_selected_regressed`) and becomes the new baseline.
  - That turn's usage is lost. Later deltas are exact, and nothing is double counted.
- Control: a clean close then restore continues totals correctly (c08b: 13,930 / 14,015 == main loop).
- Regression against base:
  - Base ran one process per turn, and each turn ended with a clean exit that persisted totals.
  - After a crash, the next per-turn process resumed from the totals saved at the previous turn's end, which equal the checkpoint, so that turn was counted.
  - Streaming mode persists totals only when the long-lived process exits cleanly, so a crash now also costs the first post-reopen turn's usage.
  - The killed turn's own usage is lost in both modes, since it has no `result`.
- Consequence: usage and cost are under-counted by one completed turn per unexpected Claude process exit. This is bounded and visible via a quality flag, but it is a regression of preserved accounting behavior (REQ-010) and exactly the design's escalation trigger.

### Origin Classification

- `Design Impact`, not an implementation defect:
  - The implementation follows the reviewed design: it reuses the reconciler "unchanged; verify" and adds the zeroed-result guard.
  - The design premise behind RSK-007 is contradicted by runtime evidence: after an unexpected exit, the resumed CLI's cumulative counter does not continue from the last reported totals. That premise appears in the design's "verify against … the resumed saved total", and the implementation repeated it in `token_usage.md` ("A resumed process continues from the totals its transcript saved").
  - A correct fix needs a decision across two contracts, the Claude session lifecycle and the token-usage reconciler checkpoint series. Options include:
    - a process-open generation or reopen-after-exit marker in the usage observation and series identity;
    - treating the first post-crash result as a zero-origin series;
    - accepting the loss as a documented residual risk (a user-facing accounting outcome, so it needs Solution Designer and possibly user approval).
  - The unknown restart origin also matters: the counter restarts from the last *clean-exit* total, not always 0. For example, a restored run that crashes later restarts from its restore-time total. The rule must stay correct for both origins.
- Not a test, fixture or environment issue: the assertion encodes the approved REQ-010 and RSK-007 intent, and the evidence comes from production transformers.
- Not a reasonable source-review gap: CAND-003 correctly judged the zeroed guard. That the CLI persists cumulative totals only on a clean exit is runtime-only behavior; it is not visible in source, the SDK types or the probes N/G. The design routed it to live verification (RSK-007), which is where it surfaced.
- Docs follow-up, owned with the design fix: the `token_usage.md` sentence "A resumed process continues from the totals its transcript saved" is accurate only for a clean close then restore.

## Findings

### CR-002 — Usage of the first turn after a crash reopen is lost (Design Impact; API-F-001 / RSK-007) — RESOLVED in round 4 (SR-012, IR-004, `d3e227389`)

- Basis: REQ-010 (preserved token accounting); REQ-008 / AC-009 (crash reopen); design RSK-007 and its escalation trigger.
- Evidence and mechanism: see "API/E2E Failure-Origin Review (Round 3)" above.
- Required action (Solution Designer):
  - Decide how token accounting identifies a Claude cumulative-usage series across an unexpected process exit and resume, or obtain approval to accept the bounded loss.
  - Then revise the design (Claude session ↔ reconciler contract) and correct `token_usage.md`.
  - The durable RSK-007 E2E case in `claude-agent-streaming-session-lifecycle.e2e.test.ts` already encodes the intended outcome.

### CR-001 — Requeued undelivered append keeps the previous turn's pending terminal (High; Local Fix) — RESOLVED in round 2

- Resolution:
  - `b7c6d86b3`: the requeue branch now also sets `entry.observedTurnId = null` and `entry.pendingTerminal = null`, with a comment explaining why.
  - `observedTurnId` is always null for append claims, so resetting it is harmless.
  - New tests cover the terminal-during-claim ordering at the admission-state level (completed and failed) and the AgentRun level (the append dispatch is held pending while `TURN_COMPLETED(turn-A)` is published). The implementer reports all three fail with the fix reverted; the assertions (no `completed` before turn-B's terminal, then exactly `[{completed, turn-B}]`) support that claim.

Original finding (round 1):

- Basis: REQ-012, AC-016, QR-003 and REQ-004 ("each input's … status resolves exactly once"; the message "starts the next turn instead of failing"). Scenario CR-SCN-001; candidate CAND-001.
- Where: `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` `applyDispatchResult`, requeue branch (L212-219).
- Mechanism:
  - While the append claim for T is in flight, `observeTurnTerminal` (or `observeTurnFailure`) for T matches the claim (`associatedTurnId === T`) and sets `claim.pendingTerminal`.
  - The requeue branch then resets `state`, `dispatchKind`, `associatedTurnId` and sets `notInto`, but leaves `pendingTerminal` in place.
  - When the entry is later forwarded as `start_turn` into T2, or appended into a later turn, `applyPendingTerminal` finishes it at once with T's terminal.
- Production ordering: this is the normal ordering for Claude, not a corner case.
  - `ClaudeTurnTracker` settles T and the backend emits `TURN_COMPLETED(T)` synchronously into `AgentRun.publishSourceEvents` → `dispatchQueue.enqueue`. This happens before the claim task's `registerInput` rejects; that is why it rejects.
  - `executeInputDispatch` enqueues the result application only after `await backend.dispatchUserInput`, so the terminal task always runs first.
  - Codex can produce the same ordering around `awaitStartupReady()`.
- Consequence: the sender's message shows `completed` (or `interrupted` or `failed`, copied from T) as soon as it starts T2. Its real T2 outcome is never reported, and an ERROR in T would show a delivered message as failed. This violates exactly-once-at-its-own-turn resolution.
- Evidence (reviewer probe, since deleted): admit A → start T → admit B → claim append(T) → `observeTurnTerminal(completed, T)` → `applyDispatchResult({forwarded:false, undeliveredRetryAsStart:true})` → claim `start_turn` → `observeTurnStarted(T2)` → forwarded. B's facts: `[admitted, forwarded(start_turn,T2), turn_associated(T2), completed(turnId:T)]`.
- Test gap: `agent-run-input-admission-state.test.ts` and `agent-run.test.ts` (AC-016) only deliver the terminal after the requeue.
- Required action:
  - Clear `entry.pendingTerminal` (and keep `observedTurnId` null) in the requeue branch.
  - Add unit tests at both the admission-state and AgentRun levels where T's terminal (completed, and separately failed) is observed while the append claim is in flight. The requeued input must then resolve only at T2's terminal.

## Classification

- Round 4: N/A (`Pass`).
- Round 3 (failure-origin): `Design Impact`, CR-002, now resolved.
- Round 2 implementation review was `Pass`. Round 1 was a `Local Fix` (CR-001, resolved).

## Recommended Recipient

- Round 4: `/api_e2e_engineer` (primary; rerun API/E2E including RSK-007). `/implementation_engineer` gets an informational notice.
- Round 3: `/solution_designer` (`Design Impact`).
- After the solution revision, the route returns through architecture review as applicable, then implementation, code review and API/E2E rerun.

## Residual Risks

- Live API/E2E is still required for:
  - AC-014 (Codex steer, a newly reachable production path);
  - AC-004 (team; the harness needs its GraphQL setup updated);
  - AC-001/006 pid checks, AC-007, AC-008 orphans, AC-009 crash;
  - AC-012 live image;
  - RSK-007 totals after a crash reopen.
- The rendered web check of replayed notices has not been done.
- `claude-session-event-converter.ts` (497) and `codex-thread.ts` (500) are at the size limit.
- `bindClaudeSelectedModel.resolve` has no timeout. The live suites show it resolves on both CLIs.

## Latest Authoritative Result

- Review Decision: `Pass` (round 4, implementation review of the SR-012 delta)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`. The round-3 reclassified RSK-007 premise (resume continues totals only after a clean exit) is now handled by the series-restart rule plus IC-5
- Score Summary: 9.3/10 (93/100); every category ≥ 9.2. Runtime Correctness stays 9.2, now covering accounting across a crash reopen. The scorecard is otherwise unchanged from round 2
- Failure Origin: N/A (round 3 origin CR-002 resolved)
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - API/E2E should rerun the RSK-007 case on both CLIs and re-validate the previously passing AC set as it judges proportionate. The code outside the SR-012 delta is unchanged since API-REV-001.
  - The durable API/E2E test changes remain uncommitted and need the proportional test-code review after a successful run.
