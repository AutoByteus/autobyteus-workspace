# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/requirements-doc.md` (SR-001 amended by SR-004; the AC-B1 alternate clarification was approved by the user on 2026-09-29)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/design-spec.md` (SR-003 decisions unchanged, plus the SR-004 note)
- Supplemental Task Artifacts Reviewed: `probes/*`, `predecessor-delivery-receipt-verification.md`, `handoff-architecture-design-complete.md` (SR-004 section). Triggering downstream evidence: `code-review-report.md` (CRR-002 / CR-001), `evidence/live-org-b1.json`, `evidence/live-team-d4.json`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-stop-cleanup-and-org-recovery/tickets/in-progress/runtime-stop-cleanup-and-org-recovery/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Revised package from `/solution_designer` (SR-004, a requirements-only clarification of the AC-B1 alternate), after code review CRR-002 / CR-001 (API/E2E F-API-B1-ALT)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: Round-1 code evidence is still valid. The worktree is unchanged apart from the ticket folder (base `5d6179797`). Round 2 re-checked the revised D-B3/D-B4 against `team-run-service.ts` (`restoreTeamRun`, `resolveActiveTeamRun`, `resolveManagedTeamRun`), `agent-team-run-manager.ts` (`restoreTeamRun`, `terminateTeamRun`), `agent-org-run.ts` (`terminate`, `terminateOnce`, `enterFailStop`), `root-team-run.ts` (`failStopped`), and `flat-team-execution-manager.ts` (`createFrozenTerminationScope`).

## Routing Classification Review

- Task size: `Medium` (about 10 production files after SR-003; still inside existing owners)
- Architectural risk: `High`
- Classification rationale reviewed: The change alters shared Org/Team root-termination, retry and fencing semantics, adds restore self-heal, and adds OS process-group signalling.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (unchanged since round 1)
- Relevant existing behavior and evidence confirmed: Yes. The round-1 confirmation still holds. Round 3 checked the already-stopped Terminate path:
  - `AgentOrgRunManager.terminate` (`if (!run) return false;`) and `AgentTeamRunManager.terminateTeamRun` (`if (!root) return false;`) have no side effects for an unregistered root.
  - `AgentOrgRunService.terminate` / `TeamRunService.terminateTeamRun` record history only on `true`.
  - The resolvers `agent-org-run.ts` `terminateAgentOrgRun` and `agent-team-run.ts` `terminateAgentTeamRun` map `false` to `success:false` "…not found.".
  - Live evidence (`live-org-b1.json`, `live-team-d4.json`) matches.

  Also from round 2: For round 2, `TeamRunService.restoreTeamRun` is confirmed as the only product restore entry for Teams (GraphQL `restoreAgentTeamRun`). `resolveActiveTeamRun` and `resolveManagedTeamRun` serve the stream handler and application scope, not restore.
- Scope guardrail confirmed: Yes
- Approved change, preserved behavior, and outside scope understood: Yes. SR-004 clarifies the AC-B1 alternate with user approval (option (b)): a retry after a failed or stuck attempt completes the stop, and Terminate on an already-stopped root keeps its existing response. The approved intent is unchanged. Option (a), an idempotent-success contract, was rejected, so no GraphQL, service or manager change is required.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking findings remain)
- Remaining material ambiguity, if any: None
- AC alternate-column mapping (added in round 3; CR-001 found this was missing in round 2). Every AC, including its alternate, now maps to a design decision or to confirmed unchanged behavior:
  - AC-A1/A2 → D-A1.
  - AC-A3 → preserved (a normal turn end never calls `stop()`).
  - AC-B1 main → D-B1/D-B3.
  - AC-B1 alternate, retry after a failed or stuck attempt → D-B3 (the failed attempt and scope promises are cleared, and the root stays registered, so `terminate` re-runs) plus D-B4 (restore self-heal).
  - AC-B1 alternate, already-stopped root → confirmed unchanged behavior (no state change; response `success:false` "…not found." preserved).
  - AC-B2 → D-B2/D-B4.
  - AC-B3 → D-B2.
  - AC-B4 → preserved healthy paths.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-A1 | User | Pass | Pass | Pass (R-1..R-3 folded into D-A1 and the example) | Confirmed | None |
| BEH-A2 | System | Pass | Pass | Pass | Confirmed | None |
| BEH-B1 | User | Pass (Org and Team roots; AC-B1 alternate per SR-004) | Pass | Pass. S-B3 reaches the manager for Teams (AR-001 resolved); the retry keeps the fail-stop origin (AR-002 resolved); an already-stopped Terminate stays unchanged (SR-004). | Confirmed | None |
| BEH-B2 | User | Pass | Pass | Pass (R-4: both publication sites) | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/*` | Pass | Pass | Pass | Pass | Pass (evidence) | None |
| `predecessor-delivery-receipt-verification.md` | Pass | Pass | Pass | Pass | Pass (record) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix (B) and Behavior Change (A) | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`, backed by the code read in round 1 | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | All changes stay in existing owners. The Team service change is a guard removal that makes the manager the single authority. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-A (AGY stop) | BEH-A1/A2 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S-B1 (root terminate with dead member) | BEH-B1 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S-B2 (member re-activation) | BEH-B2 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S-B3 (restore self-heal) | BEH-B1 / REQ-B4 | Pass (Team: GraphQL → `TeamRunService.restoreTeamRun` → `AgentTeamRunManager.restoreTeamRun` inside `withRootTransition`) | Pass | Pass (service = facade; manager = governing owner) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgyStreamProcess` + private helper | Pass | Pass | Pass | Pass | |
| `ConfiguredAgentExecutionHandle` → `AgentRunManager` | Pass | Pass | Pass | Pass | |
| `AgentOrgRunManager` → `AgentOrgRun` | Pass | Pass | Pass | Pass | |
| `TeamRunService` → `AgentTeamRunManager` (restore) | Pass | Pass | Pass | Pass | Duplicate pre-guard removed; the manager decides (AR-001 resolved) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY stream helper | Pass | Pass | Pass | Pass | |
| Handle / planner | Pass | Pass | Pass | Pass | |
| Org / Team managers | Pass | Pass | Pass | Pass | Self-heal calls the root's `terminate()`, never the manager's transition-wrapped `terminate` |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgyStreamProcess.stop(): void` | Pass | Pass | Pass | Low | Pass |
| `listAgyBackgroundProcessGroups` / `signalProcessGroups` | Pass | Pass | Pass | Low | Pass |
| `ConfiguredAgentActivationPlanner.prepare(config, platformAgentRunId, mode)` | Pass | Pass | Pass | Low | Pass |
| `AgentOrgRunManager.restore` / `AgentTeamRunManager.restoreTeamRun` (+ `*_STOP_INCOMPLETE`) | Pass | Pass | Pass | Low | Pass |
| `TeamRunService.restoreTeamRun` (guard removed); `resolveActiveTeamRun` / `resolveManagedTeamRun` (unchanged) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stale-run cleanup | Pass | Pass | N/A | Pass | |
| Retry after failed termination (incl. fail-stop origin) | Pass | Pass | N/A | Pass | Now matches `RootTeamRun.failStopped` |
| Process-group discovery | Pass | Pass | Pass | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/antigravity/stream` | Pass | Pass | Pass | Pass | |
| `agent-collaboration/execution/backends` | Pass | Pass | Pass | Pass | |
| `agent-org-execution` | Pass | Pass | Pass | Pass | |
| `agent-team-execution` (services + local) | Pass | Pass | Pass | Pass | `team-run-service.ts` and `flat-team-execution-manager.ts` now mapped |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Clear-on-failure promise caching | Pass | N/A | N/A | Pass | Small local occurrences; extraction would be empty indirection |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Handle `activationMode` | Pass | Pass | Pass | N/A | Pass | |
| `AgentOrgRun.failStopped` | Pass | Pass | Pass | N/A | Pass | Fail-stop origin is kept separately from the `lifecycle` state |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agy-background-process-groups.ts` (new) | Pass | Pass | N/A | Pass | |
| `agy-stream-process.ts` | Pass | Pass | N/A | Pass | |
| `configured-agent-execution-handle.ts` | Pass | Pass | N/A | Pass | |
| `configured-agent-activation-planner.ts` | Pass | Pass | N/A | Pass | |
| `agent-org-run.ts` | Pass | Pass | N/A | Pass | AR-002 resolved |
| `frozen-agent-org-termination-scope.ts` | Pass | Pass | N/A | Pass | |
| `agent-org-run-manager.ts` | Pass | Pass | N/A | Pass | |
| `agent-team-run-manager.ts` | Pass | Pass | N/A | Pass | |
| `team-run-service.ts` | Pass | Pass | N/A | Pass | AR-001 resolved |
| `flat-team-execution-manager.ts` | Pass | Pass | N/A | Pass | `fencing` clear-on-failure only (R-8) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New helper in `backends/antigravity/stream` | Pass | Pass | Low | Pass | |
| All other changes in existing files | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Planner constructor `mode` | Pass | Pass | Pass | Pass | |
| Cached failed Org termination / scope promises; Team scope `fencing` cache | Pass | Pass | Pass | Pass | |
| F-API-001 "future fix" doc paragraph | Pass | Pass | Pass | Pass | |
| `TeamRunService.restoreTeamRun` pre-guard | Pass | Pass | Pass | Pass | Removed; manager decides |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Planner mode | No | Pass | Pass | |
| Termination retry / restore | No | Pass | Pass | |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org/Team execution trees, bindings, history rows | Not Affected (no schema change) | Pass | Pass | N/A | Pass | The self-heal path skips `recordTerminated`, but the following `recordRestored` upsert sets `terminatedAt: null`, so history ends consistent. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| B then A; tests per step; live checks including Stop-caused and standalone-Team cases | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Process-group helper + `stop()` | Yes | Pass | Pass | Pass | Includes R-1/R-2/R-3 |
| Handle stale-run termination and fence ordering | Yes | Pass | N/A | Pass | R-4/R-5 comments |
| Org fail-stop retry | Yes | Pass | N/A | Pass | |
| Restore self-heal | Yes | Pass (prose; Team entry path named) | Pass (rejected `resolve*` change explained) | Pass | |

## Material Premise Validation (Only When Needed)

The round-1 records still apply unchanged:

- `PR-001` (Team root registered but inactive at restore): `Reachable`. It drove AR-001, now resolved by removing the service pre-guard.
- `PR-002` (retry after a failed fail-stop termination attempt): `Reachable`. It drove AR-002, now resolved by the persistent `failStopped` field.
- `PR-003` (delayed `SIGKILL` hits a reused pgid): `Not Reachable`. No re-verification machinery; the design follows this.
- `PR-004` (AGY descendant in a foreign-led group): `Not Reachable`. Leader-descends selection was adopted as zero-cost tightening, not as required machinery.

No new material premise was introduced by SR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 3: SR-004 requirements clarification; design SR-003 unchanged)

## Findings

None open. AR-001 and AR-002 are resolved (see ARCH-REV-002 in the revision record).

Non-blocking implementation notes:

- N-1: Change Sequence step 2 still says "confirm the Team frozen scope's caching and align if needed". D-B3/R-8 now settle this: clear `fencing` on failure only, because `finishing` already clears. Follow D-B3.
- N-2: The escalation trigger says "restore-after-stuck needs changes beyond the manager transition". The `TeamRunService` guard removal is outside the manager, but it is the reviewed, intended change, not an escalation.
- N-4 (SR-004): There is no production change. Only the API/E2E durable assertions for the second Terminate (LIVE-ORG-B1, LIVE-ORG-R7, LIVE-TEAM-D4) must follow the clarified AC-B1: expect an unchanged state and the existing `success:false` "…not found." response, not a success. Two lines of `handoff-architecture-design-complete.md` are stale and cosmetic: the "Current solution revision" line mixes SR-003/SR-004 wording, and "Open Risks: Team frozen scope may also cache failures" was already resolved by R-8. Neither is blocking.
- N-3: With the service pre-guard removed, `tokenUsageReadiness.assertExistingRunRestoreReady()` in `TeamRunService.restoreTeamRun` now runs before the manager's "already managed" rejection of a still-active Team. This is harmless; keep its current order.

## Classification

N/A (Pass)

## Recommended Recipient

`/implementation_engineer` (primary). Informational pass notification to `/solution_designer`.

## Residual Risks

- Hard-killed app leaves AGY and its daemons running (existing; documented).
- AGY crash orphans (DEC-001), self-detaching commands (DEC-002), Windows (DEC-003) remain documented limits.
- `SIGTERM`-ignoring daemons may survive app quit, because the unref'd `SIGKILL` sweep may not run.
- A synchronous `ps` inside `stop()` briefly blocks the event loop per live AGY member (≤ 2 s timeout).
- A live run with a failed irreversible root-shutdown fence can still block root termination (R-6; outside scope).
- `AgentRunRemovalCleanupError` on first stale discovery surfaces once before the retry completes.
- AGY `--conversation` resume after a crash or Stop is proven only by live validation (ASM-001).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: The SR-003 design stands. The SR-004 clarification is coherent with it, with no design or production change. Downstream, only the API/E2E durable assertion and test-code review are needed (N-4).
