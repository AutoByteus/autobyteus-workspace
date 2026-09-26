# Code Review Report — claude-sdk-streaming-input-session

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (Approved, SR-011)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md` (SR-011)
- Supplemental Task Artifacts Reviewed As Context: `solution-handoff.md`; `probe-evidence/` (evidence only)
- Relevant Solution Revision IDs: SR-006..SR-011
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md` (ARCH-REV-004 Pass; IC-1..IC-4)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: `Implementation Complete` from `/implementation_engineer` (IR-002; commits `26450e6b0`, `f33b175d4` on `codex/claude-sdk-streaming-input-session`; base `origin/personal` @ `6f7b5e371`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

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
| BEH-002 / BEH-009 (REQ-004/012) | Confirmed, with defect CR-001 in the AC-016 sub-path | `claimNext` walk skips entries forwarded into the active IDENTIFIED turn and stops at any other non-queued entry. Claude `registerInput` handles append/join. Codex routes through `turn/steer`. Requeue on `undeliveredRetryAsStart` | — |
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
| CAND-001 | The requeue path in `applyDispatchResult` keeps a stale `pendingTerminal` from turn T | CR-SCN-001 | A message arrives as T ends (AC-016) | See CR-001. Because the terminal is observed during the in-flight append claim, `claim.pendingTerminal = T terminal`. The requeue then resets state, dispatch kind and associated turn, but not `pendingTerminal`. On the later `start_turn` forward into T2, `applyPendingTerminal` finishes the entry at once with T's terminal (`completed`, `interrupted` or `failed` for T), and T2's real terminal never reaches it | `agent-run-input-admission-state.ts` L212-219, L306-310, L414-421. `agent-run.ts` L310 enqueues the result application after `await backend.dispatchUserInput`. The Claude backend emits `TURN_COMPLETED` synchronously into `dispatchProcessedAgentRunEvents` → `dispatchQueue.enqueue` before `registerInput` rejects, so in the Claude race the terminal task always precedes the result application. Reviewer probe output: `[admitted, forwarded(start_turn,T2), turn_associated(T2), completed(T)]` | Promote | Bounded local fix plus a unit test for the terminal-before-result ordering |
| CAND-002 | The provider-UUID "unconfirmed completion" guard was dropped | Contract: BEH-007 resumability | A `result` with no `session_id` on any frame of the process | Every SDK frame carries `session_id`; `handleFrame` confirms it; a conflicting id throws → pump failure → close → turn `ERROR` | SDK stream shape (probe logs P/Q show `session_id` on every frame) | Reject | No supported path produces an unconfirmed completion |
| CAND-003 | RSK-007 zeroed-usage guard drops non-success results whose `modelUsage` rows are all zero | Token accounting contract (`token_usage.md`) | Crash/startup-error result (SDK doc) | Forwarding it would regress the reconciler baseline (`regressed` → re-baseline) and the next result would count the whole session again; the guard drops only all-zero rows, which carry no usage | `claude-session-token-usage.ts`; reconciler L156-164 | Reject (as a defect) | Proportionate, and it loses no real usage. Totals after a crash reopen remain a live API/E2E check |
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
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The AC-016 tests cover only the terminal-after-requeue ordering, not the terminal-during-claim ordering that production Claude produces (CR-001) | Add that ordering at the admission-state and AgentRun levels |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/helpers/fake-claude-streaming-sdk.ts`; admission-state `createState` helper | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The runtime-policy integration test was deleted; the background-bash E2E was replaced | — |
| API/E2E readiness for the next workflow stage | Fail | AC-016 lifecycle resolution is wrong in its dominant ordering (CR-001) | Fix CR-001 before API/E2E |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `backends/claude/session/claude-session.ts` | 477 | Pass | Triggered (+330/−355, a design-mandated rewrite) | Pass: composition plus the public operations; turn, process and registry logic are delegated | Pass | Accepted | — |
| `backends/claude/session/claude-turn-tracker.ts` | 368 | Pass | Triggered (new, +409) | Pass: one state machine | Pass | Accepted | — |
| `runtime-management/claude/client/claude-sdk-client.ts` | 471 | Pass | Pass | Pass | Pass | Accepted | — |
| `input/agent-run-input-admission-state.ts` | 418 | Pass | Pass | Pass | Pass | Local defect (CR-001) | Fix |
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

- Overall score (`/10`): 9.0
- Overall score (`/100`): 90
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | SPINE-1..5 are implemented as designed, with a single pump and synchronous `registerInput` | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The tracker is pure, the process owns SDK I/O, the undeclared `cancelQueued` is confined to one adapter, and the shared claim has a single owner | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Explicit dispatch union; the optional result flag has its validity documented; IC-3 uses a distinct code | IC-4 claim-time hint (documented) | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | New files match their owners | `claude-session.ts` (477) and the converter (497) are near the limit | Keep future additions out of these files |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.3 | Shared image source; additive trace fields | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names match the design vocabulary; comments explain probe-derived rules | — | — |
| `7` | `API/E2E Readiness` | 8.5 | Broad unit and fake-CLI coverage; live Claude suites pass on both CLIs | AC-016 resolves wrongly in its production ordering and no test covers that ordering (CR-001) | Fix and test CR-001 |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.0 | Tracker settlement, IC-1, IC-2, crash and close paths are sound | CR-001: a requeued input resolves early with the previous turn's terminal (completed/interrupted/failed), and its real turn's terminal is lost | Reset `pendingTerminal` on requeue |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean cut | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Obsolete code, tests and docs removed | — | — |

## Findings

### CR-001 — Requeued undelivered append keeps the previous turn's pending terminal (High; Local Fix)

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

- `Local Fix`: a bounded implementation defect in the correct owner. No design or requirement change is needed; the design text already specifies the correct behavior.

## Recommended Recipient

- `/implementation_engineer`

Routing note: after the fix, source review runs again (focused on CR-001 and its tests), then API/E2E.

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

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.0/10 (90/100). Runtime Correctness 8.0 and API/E2E Readiness 8.5 are below the clean-pass bar because of CR-001; every other category is ≥ 9.2.
- Failure Origin: N/A
- Recommended Recipient: `/implementation_engineer` (`Local Fix`)
- Notes: everything else passes, including IC-1..IC-4, tracker settlement and I-1..I-3, the claim walk, the registry consumption and notice-origin refinement, the RSK-007 guard, the dropped UUID guard (rejected premise), the notice history path, and cleanup. The re-review can stay focused on CR-001.
