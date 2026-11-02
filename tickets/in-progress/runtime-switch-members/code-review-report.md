# Code Review Report — autobyteus-348 (runtime-switch-members)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc / Investigation Notes / Solution Revision Record / Design Spec Reviewed As Context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001), `design-spec.md` (D-1…D-10)
- Supplemental Task Artifacts Reviewed As Context: `switch-member-record-contract.md` (behavior-defining for the data); `task-follow-ups-316.md` (input)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001 Fail → ARCH-REV-002 Pass; ARCH-F-001…010)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1; Review Scope: `Full Review`
- Trigger: implementation handoff IR-001 (Large / High). Prior round, failure-origin and delivery fields: N/A

## Routing Classification Review

- Task size `Large`; architectural risk `High`; route `Implementation Review`; independent source review required: `Yes`.
- Classification evidence: confirmed. 153 files (3,531 insertions): persisted member and copy records, the durable commit of a member's binding in three roots, the shared activation handle with two construction sites, three save paths, two stream-contract packages, the web draft chain, and renames across the Team and Org chains.

## Review Scope

- Changed implementation and behavior reviewed (non-test source in full): `runtime-selection-rule.ts` and its adapters (standalone commit, configured member, copy domain `delegated-launch-selection.ts`); the three tree mutators and the Team committer (`commitRuntimeSwitchInTree`, `commitAgentOrgRuntimeSwitch`, `commitStandaloneRootRuntimeSwitch`) with their roots' call sites; `ConfiguredAgentExecutionHandle.initializeReady` and its failure branch, `ConfiguredAgentSwitchAttempt`, the planner's `beginSwitch`, `wrapPreparedLocalTermination`; `FlatTeamAgentExecutionHandle` (commit adapter, `replaceSelection`), `FlatAgentExecutionContext.refreshSelection`; both restore sites; record types and schemas (configured nodes, task Agent own file, task Team members, user choice runtime); Team/Org/delegated save paths (mutators, managers, services, GraphQL inputs and `requiredRuntimeKind`); `selectionContextFor`; readers (`memory-run-discovery`, `task-team-root-memory-source`, location read models); the two contract packages' sources (tracked `dist/` by size); the web drafts, patches, clients, stores, rows, editor and the hint; docs by file list.
- Tests: read by case list and targeted reads (rule, records, handle switch activation, three-placement member activation, copy commit, launch-rule parity, selection validation context, the built-server `runtime-switch-members-built-server` cases MS-01…04, DCM-009).
- Diff read: `c952758a81..5bccfeb203`. The recorded checks (IMP-01…IMP-13: typecheck, unit 7861, integration 500, web 5008, built-server runs) were read, not rerun: code is unchanged since `d3463e0a7e` apart from tests and documents.
- Explicit exclusions: a live Claude/Codex pair, rendered web rows, a built-server failed start for an Org member or a copy.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a stopped Team member, Org member (direct Agent and Agent of a mounted Team) and delegated copy (task Agent, task Team member) can choose another agent runtime and model; the next input makes the switch exactly as in autobyteus-316 (one shared activation class, one commit kind); a start that fails leaves nothing; no history means a plain start; the chat, journal and memory readers follow; the pending switch is not on the wire; clean-cut renames.
- Design-spec behavior map verified against the implementation: yes. ARCH-REV-002's findings are visible in code: ARCH-F-007 (a pending switch on every affected member, decided at activation by the planner), ARCH-F-008…010 (second construction site `FlatTeamAgentExecutionHandle`, M-7 holder refresh, conflict-never-no-op commit).
- Behavior-basis status: `Confirmed`. No newly discovered behavior; no ambiguity.

| Behavior | Status | Path / evidence |
| --- | --- | --- |
| BEH-001 (Team/Org save) | Confirmed | web patches (each carries `runtimeKind`) → `updateStoppedTeamRunSelections` / `updateStoppedAgentOrgRunConfig(selectionPatches)` → `requiredRuntimeKind` → manager transition lane → targets → `selectionContextFor` (fresh selection for another runtime or a pending member) → `applySelectionToConfiguredMember` (the shared `applyRuntimeSelection`) → one tree write |
| BEH-002 (copy save) | Confirmed | `updateDelegatedLaunchSelections` → `planDelegatedLaunchValidation` (effective runtime as current) → `applyDelegatedLaunchSelectionsToTaskExecutions`: choice recorded beside the started values (runtime only when it differs from started), the rule applied to every copy member whose effective runtime changes (own choice or its Team's for a follower) |
| BEH-003 (activation) | Confirmed | `initializeReady` → `prepareActivation` → planner (pending ⇒ `beginSwitch`: inspect history, `memory.begin` before the candidate) → prepare → `switchAttempt.record()` → `commitPlatformBindingChange({runtime_switch})` → handle drops pending and takes the session → publish; failure: release first, then `discardUnlessRecorded` |
| BEH-004 (readers) | Confirmed | `openRawTraceRuntimeKind` over the effective runtime and pending switch for Team, Org, task Team and task Agent runs |

## Supported Product Scenario And Reachability Gate

| Scenario | Kind | Trigger | Path | Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SC-1 | User | Settings save of a stopped Team/Org with another runtime for a member | BEH-001 | pending switch on that member, binding dropped, nothing archived | Supported Normal |
| SC-2 | User | A copy's choice saved on a stopped Agent, Team or Org root | BEH-002 | choice and pending switch on each affected copy member | Supported Normal |
| SC-3 | User | First input to the member | BEH-003 | marker, archive, hand-over, commit, publish | Supported Normal |
| SC-4 | System | An activation that fails and is sent again (start failure, archive failure, commit that does not land) | BEH-003 failure branch | nothing left behind; one marker, one segment | Supported Explicit Edge |
| SC-5 | User | Undo, a second save before the first input, a Team-default runtime edit that reaches linked members | rule | as in 316; each linked member switches on its own | Supported Explicit Edge |
| SC-6 | System | Member with no conversation | planner `none` | plain start, commit clears the pending switch | Supported Explicit Edge (REQ-005) |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-1 | Handoff question 1, the M-7 holder refresh: do all holders drop the pending switch and take the binding? | Handle: `initializeReady` after the commit rewrites its `execution` (pending removed, session set). Team wrapper: its commit adapter calls `context.refreshSelection(...)` and rewrites `this.config` only after the root commit returned (a failing root commit changes no cache; a failing cache update surfaces as the existing indeterminate `BINDING_CACHE_COMMIT_FAILED`). Root trees: `commitAfterDurability` of Team/Org/Agent roots replaces the tree. Restore of a retained handle: `replaceSelection` rewrites spec, config, context and session. Tests: `configured-agent-switch-activation` (M-7), `runtime-switch-member-activation` ("restores on the committed session"), `runtime-switch-copy-commit` | Reject (no defect) | Confirmed |
| C-2 | Conflict-never-no-op in the three mutators | `commitRuntimeSwitchOnRecord` returns a conflict for `not_pending` and `switch_id_mismatch`; each mutator also throws unless the member matches exactly once; Team throws `TEAM_AGENT_PLATFORM_BINDING_CONFLICT`, Org and Agent root throw; the handle's failure branch keeps the member pending and publishes nothing. Test: "the root's commit refuses a stale switch ID, a member that is not pending and a missing member, writing nothing" | Reject (no defect) | Confirmed |
| C-3 | `replaceSelection` at the two copy restore sites | `RootAgentExecutionRegistry.restoreTask` passes the node built by `restoreTaskAgentNode`, the same node `createHandle` uses for a new handle (session ID and pending switch included); `TaskAgentExecutionRegistry.restore` passes the node with the persisted session ID it already used to build a new handle. Both keep the stopped guard; the Team wrapper forwards to the inner handle and refreshes its own config and context | Reject (no defect) | Confirmed. The change from "model only" to "runtime, model, session, pending" is safe because both sites read the same persisted source for the new-handle and the retained-handle cases |
| C-4 | Launch-rule parity | `copy-launch-rule-parity.test.ts` runs the server rule and both contract mirrors over the full matrix of agent choice × team choice × `followsTeam` (4 × 4 × 2 = 32 cases), including another and the native runtime, and compares runtime, model, settings and `selected`. Mirrors extended in the same way (`runtimeKind ?? started`) | Reject (no defect) | Confirmed; FU-C1 stands for converging the three |
| C-5 | `ConfiguredAgentActivationPlanner` falls back to a process-wide `getDefaultRuntimeSwitchMemory()` and `agent-collaboration` imports a concrete `agent-memory` service | `activityInspector` is handled the same way (imported default) in the same planner; the recorder is stateless; the option `runtimeSwitchMemory` allows injection (tests do) | Reject | Follows the file's existing pattern; no behavior consequence |
| C-6 | Failed-attempt discard is implemented twice: the standalone lifecycle's `discardFailedSwitchAttempt` (316) and `ConfiguredAgentSwitchAttempt.discardUnlessRecorded` | The two sit in different activation owners with different release signals (operation stage versus the handle's confirmed release); the memory port is shared | Reject | Not a duplicated structure to extract today; a third copy would be |
| C-7 | The raw line count of `configured-agent-execution-handle.ts` is 520 (525 before) | Effective non-empty lines (comments and blanks excluded): 467 before, 459 after | Reject | Under 500 by the effective count the template names and not grown; `wrapPreparedLocalTermination` moved out |
| C-8 | A Team or Org patch may name another runtime for a default scope (`/` or a mounted Team); the server changes the default launch's runtime with no pending switch | Design D-4: default scopes change the default launch only; the UI keeps the Team and Org root's runtime fixed; linked members receive their own patches and switch on their own; every changed runtime is validated as a fresh selection | Reject | Matches the approved design |
| C-9 | The member runtime-change hint is the draft-versus-saved comparison, so it does not show when a saved pending switch is reopened | Same behavior as in 316 (its C-4) | Reject (cosmetic) | |
| C-10 | The existing-run browser probe fails four checks (A, D, E, page errors), the same four at the base commit | `IMP-13`: A/D/E wait for `chat-model-locked-runtime` on the Agent root card that 316 unlocked; the page error is a blocked-port websocket | Promote as Follow-up | Pre-existing; not caused by this change; FU-C2 |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Task design health assessment present and preserved | Pass | one pure rule, per-family adapters that only locate and write the record, one activation class, one commit kind; no dual path |
| Behavior-defining supplement matched | Pass | contract §1–§6: record placement, `RecordedPendingRuntimeSwitch`, choice runtime only when it differs from started, commit shape and conflicts, M-1…M-7 |
| Spine clarity | Pass | DS-001/002/003 are the named nodes |
| Ownership boundary | Pass | rule owns what a selection/commit does to a binding; each tree family owns finding and persisting; the handle owns activation order; roots own the durable commit |
| Existing capability reuse | Pass | 316's memory port, recorder, notice, readers, planner and commit seam; `persist` mechanics of each root unchanged |
| Reusable owned structures | Pass | `PendingRuntimeSwitch` reused unchanged; `RecordedPendingRuntimeSwitch` is a one-field mixin; `RuntimeBindingState` is minimal |
| Shared-structure tightness | Pass | `ConfiguredAgentSelection` is a `Pick` of the spec |
| Repeated coordination ownership | Pass | the record step lives once in `commitRuntimeSwitchOnRecord`; selection context once in `selectionContextFor` |
| Empty indirection | Pass | `ConfiguredAgentSwitchAttempt` holds the ticket's state and the discard guard; not a pass-through |
| SoC / file responsibility | Pass | `wrapPreparedLocalTermination` moved to the support file to keep the handle from growing |
| Ownership-driven dependency | Pass | see C-5 |
| Authoritative Boundary Rule | Pass | callers use managers and roots, not the stores |
| File placement | Pass | |
| Interface clarity | Pass | `runtimeKind` is explicit and required on every save input (`requiredRuntimeKind` refuses a missing or unknown one naming the scope); the pending switch is off the wire |
| Naming | Pass | Principle 15: the old `…ModelConfig` names are gone in sources (searched: no hit outside tickets); the shared `RunModelConfig*` result types keep their accurate names |
| No unjustified duplication | Pass | the three launch-rule mirrors are the designed, test-guarded exception (FU-C1) |
| Patch-on-patch | Pass | |
| Dead code removed | Pass | `AgentModelChoice`, `replaceModelChoice`, `DelegatedHostSelectionValue`, the old mutator file and names |
| Tests clear and requirement-aligned | Pass | case names tie to M-x / REQ; the three placements run through real roots with real files; failed start, retry, abandoned attempt, conflict, unreadable history, no history |
| Fixtures reusable / no stale tests | Pass, except the pre-existing stale probe scenarios (FU-C2) | |
| API/E2E readiness | Pass | built-server MS-01…04, RS-01…08 and DCM-001…009 pass |

## Source File Size And Structure Audit

Effective non-empty lines (blank and comment-only excluded), base → head. All changed implementation-source files are under 500 and none grew past it:

| File | Before | After | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 500 | 499 | not grown |
| `configured-agent-execution-handle.ts` | 467 | 459 | not grown (raw lines 525 → 520) |
| `agent-org-run-manager.ts` | 451 | 458 | |
| `standalone-agent-run-root.ts` | 451 | 457 | |
| `runtime-selection-rule.ts` (new) | 0 | 110 | |

Files with more than 220 lines changed across the ticket (the rule and records, the delegated selection domain, the web drafts) each own their new behavior; none needs a split.

## Legacy / Backward-Compatibility Verdict

All Pass. Optional fields with truthful absence; no migration (the schema tests read old shapes unchanged and write the new fields exactly; the app-data migration suites pass unchanged). GraphQL is a clean cut with no alias. Old pending shape does not exist (316's `switchId` shape is the one used).

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

`Yes`, done: `GLOSSARY.md`, server `agent_team_execution.md`, `agent_orgs.md`, `agent_communication.md`, `run_history.md`, `agent_work_journal.md`, `llm_management.md`; web `settings.md`, `chat.md`, `agent_execution_architecture.md`. Delivery re-verifies them against the final code.

## Additional Material Premise Validation

None new or reclassified. The 316 lesson (a candidate can write records while it prepares) is carried by the same ticket order: the ticket is taken before the candidate and only the records after the watermark are discarded; the Grok and native targets are covered by the built-server runs and the three-placement unit tests.

## Review Scorecard

- Overall score: 9.4 / 10 (summary only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Three spines are the named nodes; one activation order for all member kinds | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Rule, locator, activation and commit each have one owner | — | — |
| 3 | API / Interface / Command Clarity | 9.4 | Required explicit `runtimeKind` with a clear refusal; one new commit kind | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | Clean; `existingRunConfigStore.ts` sits at 499 of 500 effective lines | store at the limit | Extract on the next change |
| 5 | Shared-Structure Tightness | 9.4 | Reuses `PendingRuntimeSwitch`; one-field mixin | — | — |
| 6 | Naming and Local Readability | 9.4 | The rename is complete | — | — |
| 7 | API/E2E Readiness | 9.3 | Built-server cases for all three placements; a live Claude/Codex pair, rendered rows and an Org-member/copy failed start on the built server are not run | those three | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Holders, conflicts, retry and discard traced against the code and the tests | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut | — | — |
| 10 | Cleanup Completeness | 9.3 | Dead code removed; the stale probe scenarios are pre-existing (FU-C2) | probe | FU-C2 |

## Findings

None.

## Follow-ups

- Follow-ups this review added: FU-C2 (in `follow-ups.md`). FU-C1 (the designer's) stands.

## Classification

Not applicable (Pass). Task size and architectural risk (`Large` / `High`) unchanged.

## Recommended Recipient

API/E2E engineer (primary pass rule); implementation engineer informed.

## Residual Risks

- No live Claude Agent SDK / Codex App Server pair (needs the test vault); I-7 on those two archived segments is not shown for members.
- The new member and copy rows were not rendered in a browser or isolated instance; layout and the open runtime menu on nested rows are unverified visually.
- A failed start of an Org member or a copy is covered by unit tests at the three placements but not on the built server.
- A Team default's runtime edit switches every linked member at once; each activates separately, so a partially activated Team is a normal state (documented).
- Restart between the save and the first message for a member and for a copy: MS-04 covers a Team member; a copy is not run.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`; Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10, every category ≥ 9.3
- Recommended Recipient: API/E2E engineer
- Notes: The M-7 holder refresh, the conflict commit, the restore-site `replaceSelection`, and the parity test are confirmed (C-1…C-4). The existing browser probe's failures are pre-existing (FU-C2).
