# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md`. Approved at SR-003 and re-confirmed in SR-005 (2026-10-10). Relevant: REQ-007/008/009/011/012/013, BEH-004/008, SCN-014, "Not Pursued", R-1..R-3 dispositions.
- Investigation Notes Reviewed As Context: `investigation-notes.md` (Q1–Q5, OBS-003)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004 D-1..D-8, DS-001/DS-002, append states, SR-005 verification gates)
- Supplemental Task Artifacts Reviewed As Context: `handoff-sr-005-rebootstrap.md`, `handover.md`, `followup-cleanup-ticket-brief.md`, `probes/task-close-during-delivery.probe.ts`
- Relevant Solution Revision IDs: SR-003, SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; RR-001..RR-004; AR2-NB-001..003)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-002, IR-003 (fix `10b843f47`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Targeted Delta Review` (round 2). Round 1 was a `Full Review` of `git diff ff25511f6 367108604`.
- Review Scope Evidence (round 2): the delta `git diff ffa1cc1c7 10b843f47` touches only `root-message-append.ts` (+12/−2, the one `dropSlot()` helper) and two test files. That is exactly the CR-001 area. No spine, interface or data-shape change, so the round-1 evidence for all other checks carries forward.
- Trigger:
  - Round 1: implementation_engineer, "Implementation Complete" (IR-002), Large / High.
  - Round 2: implementation_engineer, Local Fix complete (IR-003).
- Prior Review Round Reviewed: CRR-001 (round 1, Fail, CR-001)
- Latest Authoritative Round: 2
- Reviewer commands:
  - `pnpm exec vitest run tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/agent-team-execution tests/unit/standalone-agent-run-root tests/unit/agent-execution tests/unit/services --no-watch` → 240 files passed, 4 skipped; 2327 tests passed, 6 skipped.
  - `pnpm exec tsc -p tsconfig.build.json --noEmit` → clean.
  - Temporary probe, deleted afterwards, built from the `root-communication-roots.test.ts` harness for all three real roots. See CR-001.
  - Round 2: the same unit directories (excluding `tests/unit/services`) → 211 files passed, 4 skipped; 2038 tests passed, 6 skipped. `tsc` clean.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required: `Yes`
- Classification evidence or correction required: None.

## Review Scope

- Changed implementation reviewed:
  - `RootCommunicationEngine`, the new `RootCommunicationPort` and `root-message-append.ts`;
  - the three persistence coordinators' `commitMessageAppend`;
  - the three roots' port construction and `getCommunicationSnapshot()`;
  - `TeamRunMessageDelivery`, `buildTeamCommunicationInputMessage`;
  - removal of the Team service, adapter and plan, the standalone and Org adapters, `InterAgentMessageRouter` and `TaskAgentExecutionRegistry.reserveInput`;
  - `admit()` validation;
  - docs.
- Areas also read: the reservation capability (`agent-run-input-reservation.ts`); `AgentRunInputAdmissionState.fenceForRootShutdown`; `AgentRun.forceReleaseRuntime`; `AgentRunManager.releaseExactRun`; Task closure ordering in `root-task-execution-resource-scope.ts`.
- Explicit exclusions:
  - behavior the design leaves unchanged: the `TeamRun`/`TeamRunBackend` seam, the handles, address resolution, the global router;
  - R-1..R-3 (user-confirmed out of scope);
  - the baseline-contract JSON record itself (API/E2E-adjacent evidence).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - one teammate-delivery implementation with per-root outcomes preserved byte-for-byte;
  - REQ-012 defines the Task-closed outcome: no fail-stop, and the sender gets `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED` "as for a closure just before the save";
  - dead code removed; validation written once; docs.
- Design-spec behavior map verified against the implementation:
  - DS-001/DS-002 match: engine → port → coordinator `commitMessageAppend`, with `prepare` under the lock, then write, then `cancelBeforeDurability` or `commitAfterDurability`, and `abandon` on a coordinator throw.
  - RR-001 is applied: the Team indeterminate error is a plain `Error` with the old text.
  - RR-004 is applied: the Team port's `isOpen()` returns `true`, the engine's own `accepting` replaces the Team service flag, `closeAdmission()` is called at `root-team-run.ts:420,433`, and the code and text `TEAM_RUN_NOT_ACCEPTING_MESSAGES` are unchanged.
- Design review report and round confirmed: ARCH-REV-002 Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None (CR-001 is an implementation gap against the existing REQ-012 contract).
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-004 (one delivery owner, per-root outcomes preserved) | Confirmed | Three ports into one engine. V-2/V-3 baseline contract passes per root (bytes, IDs, codes, messages, event order) | — |
| BEH-005 (dead code removed, global router kept) | Confirmed | `InterAgentMessageRouter` and `TaskAgentExecutionRegistry.reserveInput` deleted; no remaining references (tsc clean) | — |
| BEH-001 (`admit()` validation once) | Confirmed | `admit()` = reserve + commit + release; checks only in `reserve()` | — |
| BEH-007 (docs) | Confirmed | Module docs now name both entry points and the real teammate path | — |
| BEH-008 / REQ-012, post-durability closure | Confirmed | `commitAfterDurability` catch: closure recorded, cancel failure tolerated ("the recipient already dropped the slot"); the engine rethrows `TaskDelegationError`/`CollaborationContractError`, or returns `AGENT_RUN_NOT_ACCEPTING_INPUT` | — |
| BEH-008 / REQ-012, closure found under the lock before the write ("just before the save") | Confirmed (round 2) | `prepare()` → `assertDeliveryAllowed()` throws → coordinator rejects → engine `abandon()` → `dropSlot()`, which tolerates a slot the forced release already dropped, so the `TaskDelegationError` propagates unchanged. Engine and per-root CR-001 tests cover it (the IE reports they fail with the fix stashed) | Round 1: CR-001 (resolved) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-005/006 | BEH-004, REQ-007/008/013 | System | Agent (sender) | Message a teammate | `send_message_to`, handoffs | Normal | DS-001/DS-002 | Saved and delivered together; per-root codes and events | requirements; V-2/V-3 contract test | Supported Normal Scenario | Use |
| SCN-014 (Task closes while a teammate message is being saved) | BEH-008, REQ-012, DEC-001 | Operational | Task owner (user or Manager) marks DONE/CANCELLED while another agent's message is in flight | Close the Task | Task DONE/CANCELLED | Explicit Edge (approved by DEC-001) | Reserve → wait for the root history lock → Task closes (scope closed, then `releaseTaskExecutions` → `releaseExactRun` → `forceReleaseRuntime` → `fenceForRootShutdown` removes **reserved** entries) → `prepare` scope check | REQ-012: thrown `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED`, no fail-stop | requirements REQ-012 text; OBS-003 probe; source chain cited in CR-001 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | `abandon()` / conflict / `cancelBeforeDurability` call `reservation.cancel()` unguarded. After a Task's forced release has dropped the reserved entry, `cancel()` throws and the sender gets `Error("AgentRun input reservation '<n>' cannot be cancelled.")` instead of `TASK_AGENT_RESOURCE_CLOSED` | SCN-014 / REQ-012 | Task DONE/CANCELLED while the message waits for the root history lock (for example behind another teammate's write) | The scope closes before the release (`root-task-execution-resource-scope.ts:77-97`). The release force-releases the run (`agent-run-manager.ts:~320`, `agent-run.ts:133-136`), which removes reserved entries (`agent-run-input-admission-state.ts:384-390`). `cancel()` then throws when `cancelEntry()` is false (`agent-run-input-reservation.ts:33-35`). `prepare()` throws the scope error (`root-message-append.ts`), and the engine's catch calls `abandon()` → `cancel()` → a new throw that masks the scope error | Reviewer probe on all three real roots, with the held slot dropped as the forced release does: `{"error":{"name":"Error","message":"AgentRun input reservation '2' cannot be cancelled."}}` for standalone, Org and Team | Promote → CR-001 | Contract deviation in an approved scenario. The same file already tolerates exactly this in the post-durability path, so the fix is one tolerant cancel helper and one test |
| CAND-002 | A history-publish throw after durability now fail-stops **before** the input is committed (before: committed and released, then fail-stop) | REQ-012 "genuine post-durability failures still fail-stop" | A local listener/publisher throw | The root fail-stops and terminates in both orders. The recipient's input is moot | IE note 2; design D-4 | Reject | Genuine local failure; outcome (fail-stop) preserved; no supported scenario where the difference is observable after termination |
| CAND-003 | Excluding the handle doubles' agent-status events from the V-2/V-3 record | Contract test boundary | — | A real `reservation.commit()` publishes no status. Dispatch, and with it any status change, happens only after `release()` through the drain microtask, in both old and new order. The root-published order is history then presentation in both | `agent-run.ts` reserve/commit path; `agent-run-input-reservation.ts` | Reject (boundary confirmed correct) | Answers IE question: the boundary is right, and the internal reorder is caller-invisible |
| CAND-004 | `release()` no longer re-asserts the delivery scope (the old guarded release did) | — | Closure between `commit()` and `release()` | Both run synchronously in `commitAfterDurability` (`presentRecipientInput` is synchronous) | `root-message-append.ts` | Reject | Not reachable |
| CAND-005 | A conflict-path `cancel()` after root-shutdown fencing has the same unguarded-cancel shape | Root stop | Root terminate during a message | The sender is being shut down with the root | — | Covered by the CR-001 fix | The same helper fixes it; no separate finding |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | Duplicated policy (three commit protocols, two adapters plus the Team service) replaced by one engine-owned append | None |
| Matches behavior-defining supplemental artifacts | Pass | Baseline contract (V-2/V-3) passes per root | None |
| Data-flow spine clarity and preservation | Pass | `deliver` → port reserve → coordinator `commitMessageAppend` (lock) → append steps → engine outcome mapping | None |
| Ownership boundary preservation | Pass | Engine owns sequencing and the reservation lifecycle; coordinators own lock, envelope, write and latch; ports own facts and effects | None |
| Off-spine concern clarity | Pass | Per-root builders and publishers stay in the ports | None |
| Existing capability reuse | Pass | Reuses the per-root validators, stores and publishers | None |
| Reusable owned structures | Pass | One `RootMessageAppend` / `RootMessageAppendResult` contract for all three coordinators | None |
| Shared-structure tightness | Pass | `RootCommunicationPort` holds only the root differences Q4 found real (rejections, recipient input, history event, presentation) | None |
| Repeated coordination ownership | Pass | The duplicate and open checks now run once, under the lock, for every root (closing the Q4 drift) | None |
| Empty indirection | Pass | Team service, adapter and plan removed; `TeamRunMessageDelivery.deliver` is a small identity mapping | None |
| Separation of concerns / file responsibility | Pass | — | None |
| Ownership-driven dependencies | Pass | Coordinators depend only on the `RootMessageAppend` type; no reservation access | None |
| Authoritative Boundary Rule | Pass | Roots call only `engine.deliver/getMessages/closeAdmission` | None |
| File placement | Pass | New files are under `agent-collaboration/execution/communication` | None |
| Flat-vs-over-split layout | Pass | — | None |
| Interface clarity | Pass | Port members documented; results are a closed union | None |
| Naming quality | Pass | `commitMessageAppend`, `closureAfterDurability`, `abandon` | None |
| No unjustified duplication | Pass | The standalone and Org port literals are similar, but they are the data of each root (R-2 is out of scope by user decision) | None |
| Patch-on-patch complexity | Pass | — | None |
| Dead/obsolete cleanup | Pass | — | None |
| Tests clear and requirement-aligned | Pass (round 2) | Dropped-slot doubles now throw as AgentRun's do. Covered: CR-001 at engine level and in all three real roots, plus conflict-while-closing, not-written and indeterminate paths with a dropped slot | None |
| Test fixtures reusable and coherent | Pass | The per-root `RootSubject` harness is reused | None |
| No stale/duplicated/compat tests | Pass | Team service and plan tests removed together with their code; the router test is retargeted | None |
| API/E2E readiness | Pass (round 2) | CR-001 resolved; suites pass | None |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 482 | Pass (near the limit) | Pass (+30/−21) | Pass | Pass | Pass | Watch; no action |
| `agent-execution/input/agent-run-input-admission-state.ts` | 450 | Pass | Pass (−15) | Pass | Pass | Pass | None |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 421 | Pass | Pass | Pass | Pass | Pass | None |
| `agent-org-execution/domain/agent-org-run.ts` | 395 | Pass | Pass | Pass | Pass | Pass | None |
| `root-communication-engine.ts` / `root-message-append.ts` / `root-communication-port.ts` | 100 / 98 / 53 | Pass | Pass | Pass | Pass | Pass | None |
| Three persistence coordinators | 157 / 150 / 144 | Pass | Pass | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | — |
| No legacy old-behavior retention | Pass | — |
| Dead/obsolete cleanup | Pass | — |
| Persisted-data transition followed | Pass | `Not Affected`; history bytes identical per the baseline contract |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, already included (REQ-011). The module docs were updated in the same commit. No further doc change is needed for CR-001.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None reclassified.

### `PREM-CR-001` — the held slot can already be dropped when the engine abandons the append

- Origin: `New`
- Related contract: REQ-012 ("same Task-closed outcome as a closure just before the save")
- Behavior: BEH-008
- Coherent goal or governing event: the Task owner closes the Task while a teammate message waits for the root history lock.
- Scenario validity: `Supported Explicit Edge Scenario` (SCN-014, DEC-001 approved)
- Initiating basis kind: `Operational` / `Contract`
- Trigger: Task DONE/CANCELLED through the Task tools or the UI.
- Forward path:
  1. `RootTaskExecutionResourceScope` marks the copy closed, then `releaseTaskExecutions`;
  2. `releaseOwnedExecution` → `ConfiguredAgentExecutionHandle.releaseRuntime` → `AgentRunManager.releaseExactRun` → `AgentRun.forceReleaseRuntime` → `fenceForRootShutdown` removes `reserved` entries;
  3. the delivery's queued `commitMessageAppend` reaches `prepare` → `assertDeliveryAllowed` throws;
  4. `abandon()` → `reservation.cancel()` throws.
- Lifecycle and consequence: the sender gets a generic `Error` (the MCP internal error path) instead of `TASK_AGENT_RESOURCE_CLOSED`. No fail-stop, and no wrong delivery.
- Reachability: `Reachable`. The window is the lock wait, which is widened by a concurrent teammate write. The reviewer probe reproduces the outcome on all three real roots.
- Review consequence: CR-001, a proportionate local fix.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (94 / 100), round 2. This is a simple average, for trend only. Round 1 was 9.2.

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One traceable delivery spine for three roots | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Engine owns the reservation lifecycle; coordinators never touch it | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Small port; closed append results | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clean split | `root-team-run.ts` at 482 lines | Keep future Team root growth out of that file |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Port carries only the real root differences | — | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names; states documented | — | — |
| 7 | API/E2E Readiness | 9.4 | Strong suites and baseline contract; dropped-slot coverage added at engine level and per root | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | REQ-012 is correct both before and after durability. One cleanup rule (`dropSlot`) means cleanup never masks an outcome | Accepted residual: CAND-002 publish-throw ordering | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | Clean removal | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead router, registry method, service, adapters and plan removed | — | — |

## Findings

No open findings (round 2).

### CR-001 — A Task closed while the message waits for the history lock can mask `TASK_AGENT_RESOURCE_CLOSED` (Resolved in round 2)

- Resolution (IR-003, `10b843f47`):
  - `dropSlot()` in `root-message-append.ts` is the one cleanup rule. It is used by the prepare conflict, `cancelBeforeDurability`, `abandon` and the post-durability closure.
  - It swallows only `reservation.cancel()` failures, whose only producer is a slot no longer in the reserved state.
  - Verified by code reading, the new engine and per-root tests, and the reviewer's suite rerun.

Round-1 record:

- Protects: REQ-012 / BEH-008 / SCN-014. The sender must get the same `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED` as for "a closure just before the save".
- Candidate: CAND-001; premise PREM-CR-001.
- Evidence:
  - `root-message-append.ts`: the shared `cancel` helper calls `input.reservation.cancel()` unguarded. It is used by `prepare` (conflict), `cancelBeforeDurability` and `abandon`. Only the `commitAfterDurability` path tolerates a dropped slot (`try { input.reservation.cancel(); } catch { /* the recipient already dropped the slot */ }`).
  - `agent-run-input-reservation.ts:33-35`: `cancel()` throws when the entry is gone.
  - `agent-run-input-admission-state.ts:384-390`: a Task's forced release removes `reserved` entries.
  - `root-communication-engine.ts`: the engine's catch calls `append.abandon()` before rethrowing, so an `abandon()` throw replaces the original scope error.
  - Reviewer probe on the three real roots (harness from `root-communication-roots.test.ts`; first write held; second message queued; Task closed; second slot's `cancel` throwing as after a forced release): the sender receives `Error: AgentRun input reservation '2' cannot be cancelled.` in the standalone, Org and Team roots.
- Required action (implementation-owned, small):
  1. Make the single `cancel` helper in `root-message-append.ts` tolerate a slot the recipient already dropped, the same way the post-durability path does. Use that helper everywhere, including the post-durability catch, so there is one rule. `abandon()` must never replace the original error.
  2. Add a test, at engine level and per root through `root-communication-roots.test.ts`, for: Task closed while waiting for the lock **and** the held slot already dropped → `TaskDelegationError TASK_AGENT_RESOURCE_CLOSED`, nothing written, no fail-stop.
  3. Optional, same helper: a conflict while the root is closing, with a dropped slot, returns the root's conflict rejection rather than a thrown `Error`.
- No design change: the design already intends `abandon()` to clean up the slot (DS-002, ARCH-REV-002 note "`prepare()` must not change append state before throwing…"). It did not account for the slot already being gone.

## Answers To The Implementation Engineer's Review Questions

1. **Closure classification:** it is correct for the post-durability path. It absorbs only the scope re-check and `reservation.commit()` throws, maps `TaskDelegationError`/`CollaborationContractError` to a rethrow and everything else to `AGENT_RUN_NOT_ACCEPTING_INPUT`. `commit()` throws only when the entry is gone or the fence is closed. The gap is in the **pre-write** cleanup path (CR-001).
2. **History-publish throw before commit (semantic shift):** accepted (CAND-002). It fail-stops either way, and the difference is not observable after termination.
3. **RR-004, Team `isOpen()` = `true`:** confirmed equivalent. `closeAdmission()` is called at fail-stop and terminate (`root-team-run.ts:420,433`), and the code and text are unchanged.
4. **`getCommunicationSnapshot()` built from `engine.getMessages()`:** confirmed. It is the validated list set at commit, and all three roots plus the root-correlation checks now use the initial snapshot's IDs consistently.
5. **V-2/V-3 boundary (excluding the doubles' status events):** agreed (CAND-003). A real `commit()` publishes nothing, and dispatch follows `release()` in both orders.

## Classification

N/A — `Pass` (round 2). Round 1 was `Local Fix` (CR-001), now resolved.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (primary). The implementation engineer gets an informational notice.

## Residual Risks

- R-1..R-3 stay out by user decision. R-3 (a throw before the configured handle exists) remains a recorded residual.
- The V-1 full-suite comparison shows 102 failures that also fail on the baseline. The implementation engineer says each is named; the reviewer did not re-verify that list. Per TESTING rule 9 they need an owner, but outside this ticket.
- `root-team-run.ts` is at 482 effective lines.

## Latest Authoritative Result

- Review Decision: `Pass` (round 2)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (PREM-CR-001 Reachable)
- Score Summary: 9.4/10. Every category is ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001 is resolved. For API/E2E: re-run the delivery-relevant gated suites, REQ-012 / SCN-014 in a real root, and the V-2/V-3 baseline contract on the final head.
