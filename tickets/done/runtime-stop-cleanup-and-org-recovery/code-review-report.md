# Code Review Report

## Review Round Meta

### Round 3 (latest): Implementation Review of IR-002 after SR-004

- Review Entry Point: `Implementation Review` (round 3)
- Trigger: `/implementation_engineer` IR-002 (no code change), answering CRR-002 / CR-001 after SR-004 (user-approved 2026-09-29, option (b)) and ARCH-REV-003 `Pass`
- Current Code Review Revision ID: `CRR-003`
- Relevant revision IDs:
  - Solution: SR-001..SR-004
  - Architecture review: ARCH-REV-001..ARCH-REV-003
  - Implementation: IR-001, IR-002
  - API/E2E: API-REV-001
- Artifacts re-read, all in the ticket folder:
  - `requirements-doc.md` (SR-004; approval quote "Accept your suggestion.")
  - `solution-revision-record.md` (SR-004)
  - `design-spec.md` (SR-004 note: design unchanged)
  - `design-review-report.md` (ARCH-REV-003 Pass, N-4)
  - `implementation-handoff.md` (IR-002), `implementation-revision-record.md`
- Verification that the source is unchanged:
  - HEAD is still `299875113`.
  - `git diff 299875113 -- autobyteus-server-ts/src autobyteus-server-ts/tests/unit autobyteus-server-ts/tests/architecture`, including the working tree, is empty.
  - The only uncommitted non-ticket changes are the API/E2E live e2e tests.
- Result of the round: CR-001 is resolved by the requirement clarification. AC-B1's alternate now reads: "Retrying Terminate after a failed or stuck attempt completes the stop. Terminate on an already-stopped Org/Team changes nothing and causes no harm; its existing response (`success:false`, '…not found.') is kept". That is exactly the observed live behavior (`evidence/live-org-b1.json`, `live-team-d4.json` `secondTerminate`) and the unchanged source (`AgentOrgRunManager.terminate` / `AgentTeamRunManager.terminateTeamRun` `return false` → resolver "not found"). The retry half is met by D-B3/D-B4 and was proven live in API-REV-001. The behavior basis for BEH-B1 is `Confirmed` again, now including the alternate column. The round-1 structural audit and evidence are otherwise preserved unchanged, because the source is unchanged.

### Round 2: API/E2E Failure-Origin Review

- Review Entry Point: `API/E2E Failure-Origin Review` (round 2). Round 1 was `Implementation Review`. Its structural audit and scorecard below stay valid except where round 2 marks them updated.
- Round 2 trigger: `/api_e2e_engineer` API-REV-001 `Fail`, failure `F-API-B1-ALT`
- Coverage Investigation Reviewed (failure-origin entry point): `.../api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `.../api-e2e-revision-record.md` (API-REV-001), plus `api-e2e-test-case-ledger.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4. In each, only the AC-B1 alternate ("second Terminate") check fails; every other check in those scenarios passed.
- Exact Failing Commands / Execution Mode: `RUN_AGY_RECOVERY_E2E=1 AGY_RECOVERY_EVIDENCE_DIR=<ticket>/evidence pnpm exec vitest run tests/e2e/runtime/agy-runtime-stop-recovery-live.e2e.test.ts --no-watch` in `autobyteus-server-ts`. Real agy 1.2.12, in-process server, `expect.soft` for the second-Terminate check.
- Failure Evidence Paths: `evidence/live-org-b1.json` (`secondTerminate`), `evidence/live-org-r7.json`, `evidence/live-team-d4.json`, `evidence/attempt1-*.json`, `evidence/live-recovery-rerun.log`; ledger events 7, 9, 10, 13
- Current Code Review Revision ID (latest): `CRR-002`
- Latest Authoritative Round: 2

### Round 1 meta (implementation review)

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/requirements-doc.md` (SR-001, approved 2026-09-29)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md`
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md` (SR-001..SR-003)
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: `probes/gql.sh`, `probes/org-send.mjs`, `probes/create-nested-classroom-agy-org.json`, `predecessor-delivery-receipt-verification.md`, `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `.../design-review-report.md` (round 2, Pass, notes N-1..N-3)
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001 (Fail), ARCH-REV-002 (Pass)
- Implementation Handoff Reviewed As Context: `.../implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `.../code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Trigger: Implementation Complete from `/implementation_engineer` (IR-001, commit `299875113`, base `origin/personal` @ `5d6179797`)
- Prior Review Round Reviewed: N/A (initial)
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A — not applicable (implementation review)
- Delivery Revision Record: N/A — not applicable
- Failing Scenario IDs / Commands / Evidence: N/A — not applicable

All paths above are under `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/`.

## Round 2 — API/E2E Failure-Origin Analysis (F-API-B1-ALT)

**Failing criterion.** AC-B1 (REQ-B1; SCN-B1), "Alternate / Failure" column of the approved `requirements-doc.md` SR-001: "Second Terminate is a harmless no-op success". DEC-004 extends it to Team roots.

**Observed.** After a successful Terminate, a second `terminateAgentOrgRun` returns `{success:false, message:"Agent organization run not found."}`. `terminateAgentTeamRun` returns `{success:false, message:"Agent team run not found."}` in the same way. Nothing else changes (no state change, no error thrown, history intact). The result was identical in 3 scenarios × 2 runs.

**Source confirmation.**
- `AgentOrgRunManager.terminate` (`agent-org-run-manager.ts:338-345`): `const run = this.active.get(orgRunId); if (!run) return false;`. After a successful Terminate the Org is unregistered, so the result is `false`.
- `AgentOrgRunService.terminate` passes `false` through and does not record history.
- The GraphQL resolver `terminateAgentOrgRun` (`api/graphql/types/agent-org-run.ts:249-256`) maps `false` to `success:false`, "Agent organization run not found.".
- The Team path is identical: `AgentTeamRunManager.terminateTeamRun` has `if (!root) return false;`, and `agent-team-run.ts:215` gives "Agent team run not found.".
- All of this is unchanged from base `5d6179797`. IR-001 did not touch it, and no design decision (D-B1..D-B4) and no design-spec behavior-map row covers the alternate. The design's Interface Boundary Mapping states "GraphQL / WebSocket / web: No change".

**Does the failing check still represent approved behavior?** Yes. The alternate is written in the approved requirements (SR-001), and the test asserts it literally. The test is not invalid or stale, and there is no fixture, environment or execution problem: the result is deterministic across 2 runs and 3 scenarios.

**Scenario / contract basis.**
- The initiating basis is a `Contract`: the approved AC-B1 alternate outcome.
- In the product UI, a second Terminate on an already-stopped root is not normally offered:
  - `WorkspaceAgentOrgHistoryCollection.vue:52` renders Stop only `v-if="run.isActive"` and disables it while terminating;
  - `agentOrgRunStore.terminate` de-duplicates in-flight calls.
- It is therefore reachable through the GraphQL API directly, or through a stale UI view.
- If it is reached, the web store treats `success:false` as a termination error (`agentOrgRunStore.ts:44-47`) and shows "…not found." to the user.
- Whether the AC meant (a) an idempotent success contract for an already-stopped root, or (b) "a retry after a failed or stuck Terminate is never blocked", is not something source review can decide. Reading (b) is already satisfied: REQ-B1 retry passes live. Reading (a) changes a GraphQL/manager contract that the design declared unchanged. It also changes the semantics of a pre-existing healthy-Org path, which intersects AC-B4 "Unchanged".
- The owner of that choice is Solution Designer (requirements plus design), not implementation.

**Origin decision.**

| Candidate origin | Verdict | Evidence |
| --- | --- | --- |
| Implementation defect | No | The implementation matches the reviewed design (SR-003). The code path is unchanged from base, and no design decision asked for a change. |
| Implementation change after review | No | Commit `299875113` is unchanged. The only uncommitted non-test change is an informational append to `implementation-revision-record.md` (a CRR-001 notification log), with no source effect. |
| Invalid / stale test, fixture, environment, execution | No | The assertion matches the approved AC text, and the result is deterministic. |
| Runtime-only behavior | No | The behavior is fully visible in the source. |
| **Design Impact (design coverage gap)** | **Yes (primary)** | Approved AC-B1's alternate outcome has no design decision, behavior-map row or interface change. The design also fixed "GraphQL … No change", which blocks the only straightforward fix path without a design decision. The fix must define semantics for "known but stopped root" versus "unknown id" consistently across the Org and Team managers, services and resolvers. That is a cross-owner contract decision. |
| Requirement Gap | Contributing | The AC alternate is ambiguous between reading (a), a new idempotent API contract, and reading (b), retry not blocked, which is already met. Reading (a) partly conflicts with the preserved-behavior boundary (AC-B4). Solution Designer may need a user clarification or renewed approval if it reinterprets or changes the AC. |
| Earlier review gap | **Yes** | See finding CR-001. |

**Earlier review gap (CR-001).** It was reasonably detectable in source review.
- In CRR-001 I marked BEH-B1 `Confirmed` against AC-B1 without checking the AC's "Alternate / Failure" column.
- The deciding source lines were in files I read: `agent-org-run-manager.ts` `terminate` (`if (!run) return false;`), the Team `terminateTeamRun`, and the resolver mapping.
- The architecture review (ARCH-REV-002) had the same gap.
- The invariant that should have been caught: every approved AC outcome, including alternates, must map to a design decision or to confirmed unchanged behavior that satisfies it.

**Everything else in API-REV-001 passed live**, confirming the round-1 correctness judgment for AC-A1..A3, the AC-B1 main outcome, AC-B2/ASM-001, AC-B3, R-7, DEC-004 and AC-B4. No other finding or score rationale is affected.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. 10 production files (9 modified, 1 new), all inside the owners named in the design. Shared Org/Team root termination/restore semantics and OS process-group signalling changed, which confirms `High`.

## Review Scope

- Changed implementation and behavior reviewed: D-A1 (AGY background process-group stop), D-B1 (stale-run termination/fence), D-B2 (per-attempt activation mode), D-B3 (Org termination retry, Org/Team frozen-scope retry, persistent `failStopped`), D-B4 (Org/Team restore self-heal, Team service pre-guard removal), and the three module docs.
- Files / areas reviewed (`git diff 5d6179797..299875113`):
  - `src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` (new), `agy-stream-process.ts`
  - `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts`, `configured-agent-activation-planner.ts`
  - `src/agent-org-execution/domain/agent-org-run.ts`, `frozen-agent-org-termination-scope.ts`, `services/agent-org-run-manager.ts`
  - `src/agent-team-execution/local/flat-team-execution-manager.ts`, `services/agent-team-run-manager.ts`, `services/team-run-service.ts`
  - Surrounding production context read to trace the paths: `AgentRunManager` (`getActiveRun`, `prepareAgentRunTermination`, `isCurrentPublishedRun`, `stopAllAgentRuns`), `AgentRunActivationRegistry.getActiveRun`/`removeIfCurrent`, `AgentOrgRun.terminateOnce`, `RootTeamRun.terminate`/`runTermination`/`isActive`, `FlatTeamExecutionManager.isActive`, `AgentOrgOperationGate.closeAndDrain`, `AgentRun.fenceInputAndInterruptForRootShutdown`, AGY backend `stop()` call sites.
  - Unit tests added/extended (9 files) and `team-run-service.test.ts` update; docs `antigravity_cli_runtime.md`, `agent_team_execution.md`, `agent_orgs.md`.
- Explicit exclusions: live AGY/Org/Team behavior (AC-A1/A2, AC-B1..B3, ASM-001, R-7, DEC-004 standalone Team), which belongs to API/E2E. Probe scripts are evidence, not reviewed as production source.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-A1..A3, REQ-B1..B4, DEC-001..DEC-006.
- Design-spec behavior map verified against the implementation: Yes (S-A, S-B1, S-B2, S-B3).
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. N-1 (Team scope clears `fencing` only), N-2 (service guard removal is intended) and N-3 (readiness assert stays first) are applied.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None
- Remaining material ambiguity: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-A1 | Confirmed | Every AutoByteus-initiated stop reaches `AgyStreamProcess.stop()`: backend `stop()` call sites at `agy-agent-run-backend.ts:69/84/95/119`, the factory failure path, and `fail()` on protocol error or startup timeout. `stop()` runs only while `exitCode === null && signalCode === null && pid`. It calls `listAgyBackgroundProcessGroups(pid)`, SIGTERMs those groups, SIGTERMs AGY, then runs an unref'd SIGKILL sweep after 1.5 s. A normal turn end does not call `stop()` (REQ-A2); the predecessor turn-liveness tests are still green. | — |
| BEH-A2 | Confirmed | On `close`, Node sets `exitCode`/`signalCode` before emitting, so `fail()` → `stop()` skips the helper. Tested ("AGY already exited on its own"). | — |
| BEH-B1 | Confirmed | Terminate: `AgentOrgRunManager.terminate` → `AgentOrgRun.terminate` → `terminateOnce` → frozen scope `fenceAgentRunsForRootShutdown` → `handle.fenceForRootShutdown` (latch set, then stale → accepted) → `finish` → `handle.terminate`/`prepareTermination` (stale → `completedLocalTermination(dispose)`) → `lifecycle = terminated` → `onTerminated` → `unregister`. `isStale` uses the same registry predicate as `AgentRunManager.isCurrentPublishedRun` (`registry.getActiveRun(runId) === run`), so published runs follow the unchanged path and only the formerly rejecting case short-circuits. On retry, a rejected or unaccepted attempt clears `termination`, `fencing` and `finishing`. Restore: `restore` → `withTransition` → `completeStoppingRun` (only when registered and `!isActive()`) → the Org's own `terminate()` → unregister → normal restore. The Team path is the same via `withRootTransition` → `completeStoppingRoot`, with the service pre-guard removed. | — |
| BEH-B2 | Confirmed | `ensureReady` sees the inactive `agentRun` → `initializeReady` → `planner.prepare(config, platformAgentRunId, activationMode)`. After the first `commitPublication()` at both sites, `activationMode` is `restore`, so `resolvePlan` yields `restore_external` with the persisted binding, or `restore_native`. The prior-publication claim evicts the dead run through registry inactive discovery. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A1 | BEH-A1, REQ-A1/A2 | User | User | Stop an AGY agent that backgrounded a dev server | Stop, Terminate (run/Team/Org), app quit | Normal | backend → `AgyStreamProcess.stop()` → helper → group SIGTERM → AGY SIGTERM → delayed SIGKILL | Daemon stopped; normal turn end keeps it | F-API-001, requirements, design S-A | Supported Normal Scenario | Use |
| SCN-A2 | BEH-A2, REQ-A3 | System | AGY process | AGY exits on its own | child `close` | Explicit Edge | `fail()` → `stop()` with exit code set → no helper call | Documented limitation | DEC-001 | Supported Explicit Edge Scenario | Use |
| SCN-B1 | BEH-B1, REQ-B1/B2/B4 | User | User | Recover an Org/Team after a member crash | Terminate, then message/restore | Normal | S-B1 then S-B3 | Terminate succeeds; restore continues | Incident, probe L1, design S-B1/S-B3, PR-001/PR-002 | Supported Normal Scenario | Use |
| SCN-B2 | BEH-B2, REQ-B3 | User | User | Continue the crashed member directly | SEND_MESSAGE to member | Normal | S-B2 | Member resumes its conversation | Probe L2, DEC-006 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C1 | Self-heal throws `*_STOP_INCOMPLETE` when the root reaches `terminated` but returns `accepted:false`, although `onTerminated` already unregistered it (handoff point 2). | SCN-B1 / design D-B4 | Restore of a stuck root whose self-heal finish reports a live-member termination error | `terminateOnce` → `terminated` + unregister → `{accepted:false}` → restore throws once. The next restore finds nothing registered and proceeds. | `agent-org-run.ts` `terminateOnce`; design D-B4 "Otherwise … throws" | Reject | Matches the reviewed design literally and is conservative. The trigger is a live member's finish failure, not the dead-member path this ticket fixes (dead members complete). The consequence is one retriable error, with no dead end and no inconsistent state. Recorded as a residual risk. |
| CR-C2 | `isStale` calls `getActiveRun`, which has an inactive-discovery side effect (removal and resource release). | SCN-B1 / D-B1 | Terminate or fence of any member | Same registry call that `prepareAgentRunTermination` → `isCurrentPublishedRun` already made on the base path. | `agent-run-manager.ts:268-272`; registry `getActiveRun` | Reject | Adds no new side effect. For published runs the path is unchanged. |
| CR-C3 | Clear-on-failure promise pattern appears in `AgentOrgRun`, the Org scope (×2) and the Team scope (plus the existing `RootTeamRun`). | Reusable-structure contract | — | — | Design review "Reusable Owned Structures Verdict" | Reject | Five small local occurrences with different owners. Extracting them would be empty indirection, as architecture review agreed. |
| CR-C4 | `completeStoppingRun` / `completeStoppingRoot` are near-identical in the Org and Team managers. | Ownership contract | — | — | Design D-B4 ("manager is the single authority" per root kind) | Reject | Each manager owns its own root registry and transition. A shared helper would cross the subsystem boundary for about 10 lines. |
| CR-C5 | Group selection requires the group leader to descend from AGY, so a group whose leader exited is missed. | SCN-A1 / PR-004 | — | If the leader exits, its children reparent to init and leave AGY's descendant tree anyway. The ppid walk cannot reach them either way. | Helper code; design R-3/PR-004 | Reject | Not reachable as a distinct miss. The real-OS check and the live AC-A1 cover the actual AGY process shape. |
| CR-C6 | Synchronous `ps` inside `stop()` blocks the event loop. | SCN-A1 / QR-002 | Stop / shutdown | About 26 ms per live AGY member, capped at 2 s | Handoff real-OS check; design tradeoff | Reject | Reviewed design tradeoff within QR-002. |
| CR-C7 | A retry re-calls `run.fenceInputAndInterruptForRootShutdown()` for healthy runs after the scope's `fencing` is cleared. | SCN-B1 | Retry after an unaccepted fence | Returns the latched `rootShutdownFence.result` (idempotent) | `agent-run.ts:230-238` | Reject | Idempotent. The blocked-latch case is the known R-6 residual, outside scope. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | `Missing Invariant`, no refactor. All changes are targeted inside existing owners. | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements. Probes are left for API/E2E. | None |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | S-A, S-B1, S-B2 and S-B3 are traced end to end in the code (see basis table). | None |
| Ownership boundary preservation and clarity | Pass | `AgyStreamProcess` owns the child and its groups. The handle owns stale detection and mode. The Org run and scopes own retry. The managers own self-heal. | None |
| Off-spine concern clarity | Pass | The process-group helper is a private off-spine concern of `AgyStreamProcess`. Logging codes are local. | None |
| Existing capability/subsystem reuse check | Pass | Reuses `completedLocalTermination`, registry inactive discovery, planner `restore` mode and the `RootTeamRun` retry pattern. | None |
| Reusable owned structures check | Pass | CR-C3 and CR-C4 were rejected with rationale. | None |
| Shared-structure/data-model tightness check | Pass | `activationMode` and `failStopped` each have one meaning. The planner's constructor `mode` is removed. | None |
| Repeated coordination ownership check | Pass | Each manager has one self-heal owner. Callers do not duplicate the policy. | None |
| Empty indirection check | Pass | No pass-through layer was added. | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | The helper holds parse, select, list and signal only. `stop()` holds orchestration only. | None |
| Ownership-driven dependency check | Pass | The helper imports only `node:child_process` and `node:process` and is used only by `agy-stream-process.ts`. The handle uses only public `AgentRunManager.getActiveRun`. | None |
| Authoritative Boundary Rule check | Pass | Self-heal calls the root's own `terminate()`, never the transition-wrapped manager method, so there is no deadlock. `TeamRunService` no longer duplicates the manager's decision. There is no mixed-level dependency. | None |
| File placement check | Pass | The helper sits in `backends/antigravity/stream` next to its only owner. | None |
| Flat-vs-over-split layout judgment | Pass | One new file; everything else is in place. | None |
| Interface/API/query/command/service-method boundary clarity | Pass | `prepare(config, platformAgentRunId, mode)` makes the mode explicit per attempt. `listAgyBackgroundProcessGroups(agyPid, serverPid = process.pid)` is an allowed deviation (Node has no `getpgid`; the design permits the `ps` fallback). New error codes are explicit. | None |
| Naming quality and naming-to-responsibility alignment check | Pass | `isStale`, `completeStoppingRun/Root`, `selectAgyBackgroundProcessGroups`, `failStopped` and `activationMode` are precise. | None |
| No unjustified duplication of code / repeated structures in changed scope | Pass | See CR-C3 and CR-C4. | None |
| Patch-on-patch complexity control | Pass | Changes are small and local (per-file delta at most +32/−9). | None |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Removed: planner constructor mode, cached failed promises, Team service pre-guard, F-API-001 "future fix" doc text, obsolete service test. | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests cover the design's list: stale prepare/tryPrepare/fence, fence latch (R-5), discovery-failure retry, mode switch at both sites (R-4), first-failure keeps `fresh`, Org retry including fail-stop `drain` (AR-002), Org and Team scope retry, Org and Team self-heal including STOP_INCOMPLETE and still-active rejection, service AR-001/N-3, helper exclusions including unrelated/foreign/own/pgid-1 (QR-001), ESRCH/EPERM (R-2), win32, stop ordering and delayed SIGKILL, crash skip, fail-safe. | None |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The handle test extends the shared `build` fixture with a `crash()` helper. The self-heal suites are separate and focused. | None |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | The obsolete pre-guard service case was replaced, not kept. | None |
| API/E2E readiness for the next workflow stage | Pass | The handoff lists concrete live scenarios (AC-A1/A2, AC-B1..B3, ASM-001, R-7, DEC-004) and probes. | None |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agy-background-process-groups.ts` (new) | 63 | Pass | Pass (+70) | Pass | Pass | OK | None |
| `agy-stream-process.ts` | 108 | Pass | Pass (+19/−1) | Pass | Pass | OK | None |
| `configured-agent-execution-handle.ts` | 374 | Pass | Pass (+32/−9) | Pass | Pass | OK | None |
| `configured-agent-activation-planner.ts` | 172 | Pass | Pass (+13/−5) | Pass | Pass | OK | None |
| `agent-org-run.ts` | 463 | Pass | Pass (+11/−3) | Pass | Pass | OK (near the limit; existing size) | None |
| `frozen-agent-org-termination-scope.ts` | 51 | Pass | Pass (+16/−4) | Pass | Pass | OK | None |
| `agent-org-run-manager.ts` | 433 | Pass | Pass (+17) | Pass | Pass | OK | None |
| `flat-team-execution-manager.ts` | 427 | Pass | Pass (+5) | Pass | Pass | OK | None |
| `agent-team-run-manager.ts` | 466 | Pass | Pass (+17) | Pass | Pass | OK (near the limit; existing size) | None |
| `team-run-service.ts` | 277 | Pass | Pass (+1/−1) | Pass | Pass | OK | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The planner mode moved to a per-call argument with no dual API. |
| No legacy old-behavior retention in changed scope | Pass | The duplicate service guard is removed. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | See the removal list above. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | No schema change. Restore uses persisted trees and `platformAgentRunId` as-is. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already done in this change.
- Why: AGY stop behavior and limits, member stale/retry/self-heal, and per-attempt activation mode are user- and maintainer-visible.
- Files updated: `docs/modules/antigravity_cli_runtime.md`, `docs/modules/agent_team_execution.md`, `docs/modules/agent_orgs.md`. Non-blocking cosmetic note: in `agent_team_execution.md`, the new sentence "A failed first activation keeps the original mode." runs into the pre-existing "Before a candidate is built, …" text on one over-long line. Delivery's docs sync may re-wrap it.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| PR-001 (Team root registered but inactive at restore) | Confirmed | Implemented via service guard removal and `completeStoppingRoot`. |
| PR-002 (retry after failed fail-stop termination) | Confirmed | Persistent `failStopped` is passed to `terminateOnce`. Tested (`drain` used, not `shutdownAndSettle`). |
| PR-003 (delayed SIGKILL hits reused pgid) | Confirmed (Not Reachable) | No re-verification machinery was added, as designed. |
| PR-004 (AGY descendant in foreign-led group) | Confirmed (Not Reachable) | Leader-descends filter implemented as zero-cost tightening. |

New or reclassified premises: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3 (round 3; round 2 was 9.2; round 1 was 9.3)
- Overall score (`/100`): 93 (round 3)
- Round 3 note: category 8 is restored to 9.2 after SR-004 resolved CR-001. Every category is ≥ 9.0.
- Round 2 note: only category 8 is re-scored, because of F-API-B1-ALT / CR-001. The other categories are unaffected; their round-1 evidence is preserved and was confirmed by live API/E2E.
- Score calculation note: simple average of the ten categories, for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | All four spines trace cleanly from the product trigger to the outcome in the code. | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Each change sits in its designed owner. Self-heal uses the root's own `terminate()` inside the manager transition. The service no longer duplicates the manager's decision. | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | The per-attempt `mode` argument is explicit. Error codes are explicit. | The helper's `serverPid` default differs slightly from the design's `ownPgid` shape, but it is justified and permitted. | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | The private helper is correctly placed and scoped. | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.0 | The fields are tight and single-meaning. | The clear-on-failure snippet and the two self-heal helpers are repeated locally (CR-C3/C4, accepted as proportionate). | If a sixth occurrence appears, consider a small owned utility. |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names are clear, and short comments explain the non-obvious ordering (R-5, R-4). | Minor doc line-wrap cosmetic issue. | Re-wrap during docs sync. |
| `7` | `API/E2E Readiness` | 9.2 | The live scenarios, probes and residual assumptions (ASM-001) are enumerated precisely. | The live behavior (actual AGY process shape, `--conversation` resume) is not yet proven. | API/E2E to execute AC-A1/A2, AC-B1..B3, R-7 and DEC-004. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 (round 3; round 2 was 8.5; round 1 was 9.2) | Round 3: CR-001 resolved. SR-004 clarifies the AC-B1 alternate to the existing, harmless "not found" response, which the unchanged code meets, and live API/E2E proved every other reviewed path. History of round 2: live API/E2E confirms every reviewed path, but approved AC-B1's alternate ("second Terminate is a harmless no-op success") is not met. The Org and Team managers return `false`, which the resolvers map to `success:false` "not found". The design did not cover this, and round 1 missed it (CR-001). | The AC-B1 alternate is unmet and unmapped. | Solution Designer decides the semantics; then implementation and re-review. Round-1 rationale, still valid for the rest: | The stale predicate is identical to the manager's published-run check. Retry clearing is guarded by identity. Mode switches only after a successful publication. Fence latch ordering is preserved. I re-ran the focused suites myself: 451 passed. The 12 failures are in two model-selection/config files and also fail at base `5d6179797` (verified on a clean base export). | The strict self-heal throw (CR-C1) costs one retriable error in a narrow live-member-failure case. | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut planner API, no dual paths. | — | — |
| `10` | `Cleanup Completeness` | 9.4 | The obsolete guard, cached promises, constructor mode, doc paragraph and test case are all removed. | — | — |

## Findings

No open findings (round 3).

### CR-001: Resolved in round 3 (CRR-003) by SR-004

The AC-B1 alternate was clarified: the existing "not found" response on an already-stopped root is kept, and the design is unchanged (ARCH-REV-003). The unchanged code and the live evidence match the clarified AC. The remaining step belongs to API/E2E: align the durable second-Terminate assertions with the clarified AC (ARCH-REV-003 N-4). The original record follows for history.

### CR-001 (history): AC-B1 alternate ("second Terminate is a harmless no-op success") is unmet and has no design coverage (round 2; review gap in round 1)

- Affected approved behavior: AC-B1 alternate (REQ-B1, SCN-B1), and DEC-004 for Team roots.
- Contract basis: the approved requirements `requirements-doc.md` SR-001, AC-B1 "Alternate / Failure" column.
- Evidence:
  - live: `evidence/live-org-b1.json` `secondTerminate`, `live-org-r7.json`, `live-team-d4.json`;
  - source: `agent-org-run-manager.ts` `terminate` `if (!run) return false;`, `agent-team-run-manager.ts` `terminateTeamRun` `if (!root) return false;`, `api/graphql/types/agent-org-run.ts:254`, `api/graphql/types/agent-team-run.ts:215`;
  - all unchanged from base `5d6179797`.
- Consequence: a second Terminate reports `success:false` "…not found." instead of a no-op success. There is no state damage. The web store would surface it as a termination error if reached, though the UI normally hides Stop for stopped roots.
- Origin: design coverage gap (no D-* decision; "GraphQL … No change"), plus an ambiguity in the AC's intended semantics. Round-1 code review (and ARCH-REV-002) missed that the alternate column was unmapped.
- Required action (owner: Solution Designer):
  - decide the intended semantics, for example success for a known-but-stopped root versus "not found" for an unknown id, or clarify that the AC means "retry never blocked";
  - obtain user clarification or renewed approval if the AC is reinterpreted or changed;
  - add a design decision covering the Org and Team managers, services and resolvers consistently;
  - then implementation, source re-review and API/E2E rerun of LIVE-ORG-B1/R7 and LIVE-TEAM-D4.

## Classification

Round 3: N/A (Pass). Round 2 classification, kept for history: `Design Impact` (primary: an approved AC outcome has no design coverage, and the fix needs a cross-owner contract decision), with a contributing `Requirement Gap` (the AC alternate's semantics are ambiguous and partly conflict with the AC-B4 preserved-behavior boundary).

## Recommended Recipient

Round 3: `/api_e2e_engineer` (primary), plus an informational pass notification to `/implementation_engineer`. Round 2, kept for history: `/solution_designer`. Implementation-owned rework follows only after the design decision. After the fix: source review, then an API/E2E rerun of the affected scenarios.

## Residual Risks

- CR-C1: if a stuck root's self-heal finish reports a live-member termination error, the first restore throws `*_STOP_INCOMPLETE` even though the root already unregistered itself. The next restore succeeds.
- Live-only unknowns: the actual AGY 1.2.12 background-group shape under real commands (AC-A1/A2), and AGY `--conversation` resume after crash or Stop (ASM-001).
- Carried from design: hard-killed app, AGY crash orphans (DEC-001), self-detaching commands (DEC-002), Windows (DEC-003), SIGTERM-ignoring daemons at app quit, synchronous `ps` cost, R-6 latched-fence block, one-time `AgentRunRemovalCleanupError` surfacing.
- Pre-existing, unrelated unit failures: 12 in `team-run-model-selection-save.test.ts` and `agent-org-run-config.test.ts`, identical at base.

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, CRR-003)
- Review Entry Point: `Implementation Review` (IR-002, no code change since `299875113`)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (no new premise)
- Score Summary: 9.3/10 (93/100). Every category is ≥ 9.0.
- Failure Origin: N/A. The round-2 origin is resolved by SR-004.
- Recommended Recipient: `/api_e2e_engineer`
- Notes:
  - CR-001 is resolved.
  - API/E2E must change the durable second-Terminate assertions in LIVE-ORG-B1, LIVE-ORG-R7 and LIVE-TEAM-D4 (`agy-runtime-stop-recovery-live.e2e.test.ts`). They should expect an unchanged state plus the existing `success:false` "…not found." response instead of a success (ARCH-REV-003 N-4).
  - Then rerun or confirm the affected checks, and return for a proportional test-code review of the added and updated durable tests.
  - No production re-validation is needed, because the source is unchanged.

### Round 2 result (superseded by round 3)

- Review Decision: `Fail` (API/E2E failure origin confirmed upstream)
- Review Entry Point: `API/E2E Failure-Origin Review` (round 2, CRR-002)
- Supported Product Scenario Gate: `Pass`. The failing check is an approved AC contract outcome, so the test is valid.
- Material-Premise Gate: `Pass` (no new premise)
- Score Summary: 9.2/10 (92/100). Category 8 is re-scored to 8.5 for CR-001; all others are unchanged from round 1.
- Failure Origin: Design coverage gap for the approved AC-B1 alternate (`Design Impact`), with a contributing `Requirement Gap` on its semantics, plus an earlier review gap (CR-001). This is not an implementation defect, not an invalid test and not an environment issue.
- Recommended Recipient: `/solution_designer`
- Notes: Everything else in API-REV-001 passed live (AC-A1..A3, the AC-B1 main outcome, AC-B2/ASM-001, AC-B3, R-7, DEC-004, AC-B4). The API/E2E durable tests are still uncommitted in the worktree. After the fix: source review of the new change, then an API/E2E rerun of LIVE-ORG-B1/R7 and LIVE-TEAM-D4, followed by a proportional test-code review.
- Round 1 result (superseded): `Pass`, 9.3/10, recipient `/api_e2e_engineer`.
