# Code Review Report — delegated-copy-model-change

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-007)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-007)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007, `Ready`; Revision Notes SR-005..SR-007 are authoritative over the body)
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Relevant Solution Revision IDs: SR-007
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, `Pass`)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001..ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md` (this folder)
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Full Re-Audit`
- Review Scope Evidence: the IR-002 delta (`b3928c649f..0fb29b6d8c`, 53 files) adds stream events to both contract packages and changes the web member-context spine and three server owners. All structural checks were rerun on the changed areas. Round 1 evidence carries forward for the unchanged server Stop, Save, restore and validation paths.
- Trigger: IR-002 local-fix handoff (CR-001..CR-003) from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: 1 (CRR-001, `Fail`)
- Latest Authoritative Round: 2
- Failure-origin / delivery fields: N/A

Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-model-change`, `a609de982a..0fb29b6d8c` (IR-001: `71d51a1608`, `312653734c`; IR-002: `810742c628` server + contracts, `0fb29b6d8c` web).

## Routing Classification Review

- Task size `Large`, architectural risk `High`, route `Implementation Review`. Independent source review is required: `Yes`.
- Classification evidence or correction required: None. The change touches persisted fields, two contract packages, new GraphQL commands, a forced per-copy shutdown in three root kinds, and concurrency between Stop, wake, idle shutdown, restore and Save.

## Round 2 Re-Audit Summary

- **CR-001 resolved.**
  - `teamAgentSourceAt(tree, address, agentRunId)` and `collaborationInstanceSource(instances, agentRunId, source)` apply the contract rule (`teamCopyAgentLaunch` / `collaborationCopyAgentLaunch`) with the server's follower rule: recorded member → no own launch; configured-placement copy → equal to the Team default; nested Team members never follow; Agent copies and collaborators use their own choice.
  - Every member-context call site passes the run ID (Team context factory, run and member hydration, view workspace lookup, Org view index, Agent collaboration index).
  - The remaining address-only calls are the started-source reads in `delegatedLaunchRows`, which applies the rule itself, and an existence check in `agentOrgExecutionContext.validateTaskExecutionStarted`.
  - Specs cover both casings.
- **CR-002 resolved.**
  - The command publishes `recordedDelegatedLaunchSelections` in `afterDurability`, only after a committed write. Team: `DELEGATED_LAUNCH_SELECTIONS` → `DELEGATED_LAUNCH_SELECTIONS_CHANGED`. Org/Agent: `delegated_launch_selections_changed`, defined by one contract schema. This follows the existing `collaborator_added` publication pattern.
  - Web Team view: records the choices in place, rejects unknown runs, and refreshes the member contexts.
  - Web Org/Agent views: validate the run IDs, then reload through `checkpoint_required`.
  - `savedByRoot`, `saved` and `savedOf` are removed.
  - Server tests: one event after UPDATED, none after UNCHANGED.
- **CR-003 resolved.** Each split is a coherent owner and behavior is unchanged:
  - `root-task-execution-lifecycle.ts` is now 488 lines; leases, stopping marks and the drain moved to `TaskExecutionLiveHolds`.
  - `configured-agent-execution-handle.ts` is now 484 lines; `AgentActivationFence` moved to `configured-agent-execution-support.ts`.
  - `agent-team-run-manager.ts` is now 436 lines; the plan and options moved to `team-run-delegated-launch-plan.ts`.
- **Reviewer-run checks:**
  - `typecheck` exit 0.
  - Server: the changed unit tests plus `tests/unit/agent-collaboration`, 41 files / 486 tests pass.
  - Web: `collaborators`, `teamExecution`, `agentOrgExecution`, `agentCollaboration`, the draft store spec and `runSettings`, 27 files / 179 tests pass.
  - Contracts: 16/16 and 27/27 pass.
  - `tests/architecture/application-framework-boundaries.test.ts` fails one SR-011 case. The test and the files it reads (`application-standalone-package-validator.ts`, `host-definition-services.ts`) are unchanged from base `a609de982a`, so this is a pre-existing base failure, not from this branch. It should be reported to its owner under TESTING.md Rule 9.
- **Non-blocking note.** `configured-agent-execution-support.ts` groups three unrelated helpers (`AgentActivationFence`, `describeActivationFailure`, `completedLocalTermination`) under a "support" name. The design principles discourage that kind of name. Consider moving the fence into `agent-activation-fence.ts` and the other two helpers into concern-named files the next time the file is touched.

## Review Scope

- Behaviors: BEH-001..BEH-005 (REQ-001..REQ-006, REQ-008, REQ-009).
- Files and areas read:
  - **Records and launch rule:** `run-execution-tree-shared-records.ts` (`UserLaunchSelection`, `memberFollowsTeam`, `effectiveCopyAgentLaunch`).
  - **Domain:** `delegated-launch-selection.ts`, `delegated-stop-set.ts`.
  - **Command:** `delegated-launch-selection-command.ts`.
  - **Task lifecycle and queue:** `root-task-execution-lifecycle.ts` (`stopForUser`, `whileTaskExecutionsStopped`, stopping marks, lease drain, the `acquireAtHead` refusal) and the queue kinds.
  - **Handle:** `configured-agent-execution-handle.ts` (`withActivationFence`, `isStopped`, `releaseRuntimeForUserStop`, `replaceModelChoice`) and the flat-team handle fence.
  - **Restore and resolution:** `collaborator-source-projector.ts`, `task-team-node-restoration.ts`, the Team source resolver, and the Team adapter's `restoreChain` and `shutDown`. For the restore paths: the Org and Agent adapters too.
  - **Roots and ports:** `root-team-run.ts`, `team-run-delegated-launches.ts`, `root-hosted-delegated-launches.ts`.
  - **Stopped-root Save:** `agent-team-run-manager.ts`.
  - **API:** `delegated-launch-selection-service.ts` and the GraphQL type.
  - **Web:** `delegatedLaunchDraftStore.ts`, `delegatedCopyLiveness.ts`, `DelegatedStopButton.vue`, the `ExistingRunConfigEditor.vue` wiring, the contract copy-launch functions, and `agentSourceSelectors.ts` (unchanged).
- Reviewer-run checks:
  - The changed server unit tests pass: 14 files, 165 tests.
  - The changed web specs pass: 5 files, 21 tests.
  - Sweeps: users of the activation fences; consumers of the copy-member selectors; publication after Save; sizes of the changed source files.
- Exclusions: API/E2E and the real-runtime check (design step 6). The Org and standalone stopped managers were spot-read only, through the service and the handoff.

## Upstream Behavior And Production-Path Basis Confirmation

- Behavior-basis status: `Confirmed`. The approved requirements (SR-007) and the design Revision Notes are implemented on the server as designed. The two gaps are on the web side and in publication (CR-001, CR-002).

| Behavior ID | Current Status | Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| BEH-001 (Save on a live root) | Confirmed | Root → `DelegatedLaunchSelectionCommand.update`: validate (one `validateMany`) → fences (address order) → `whileTaskExecutionsStopped` (`reconfigure`) → re-resolve targets → `commitSelections` → `replaceModelChoice` after durability; `COPY_RUNNING` when a target is live, leased or stopping | — |
| BEH-002 (per-copy Stop) | Confirmed | `delegatedStopSet` (lineage + hosting, innermost first) → `stopForUser`: marks, refusal before the queue and at `acquireAtHead`, drain outside the queue, non-waiting `stop` steps, `finally` clears; collaborators under fences; idle shutdown skips stopping copies | — |
| BEH-003 (restore uses the choice) | Confirmed (server) / Contradicted (web member context, CR-001) | Server: hosting, `restoreTaskAgentNode`, `restoreTaskTeamNode` (followers) via `effectiveCopyAgentLaunch`; extra and teammate copies start on started values (AR-005). Web: the copy-member selectors ignore the choice | CR-001 |
| BEH-004 (new copies unchanged) | Confirmed | `projectCollaboratorCopySource` uses started nodes; resolution unchanged | — |
| BEH-005 (validation) | Confirmed | `planDelegatedLaunchValidation`: runtime and workspace stay; the current effective model is used for the capacity rule; all-or-nothing; stopped-root combined Save in one `validateMany` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related | Kind | Actor | Goal | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001/004/005 | User | User | Give a delegated agent a better model | Settings → copy row → Save; message resumes | Normal | BEH-001 → BEH-003 | Runs on the choice; shows the choice | requirements-doc | Supported Normal | Use |
| SCN-002 | REQ-002/004 | User | User | Change a member or the whole team | Same | Normal | Follower rule | As REQ-002 | requirements-doc | Supported Normal | Use |
| SCN-003 | REQ-005 | System | Platform | Keep the choice | Idle shutdown, stop, restart | Normal | Restore | Choice persists | requirements-doc | Supported Normal | Use |
| SCN-006 | REQ-009, AC-011 | User | User | Stop one copy | Sidebar / Settings stop icon | Normal | BEH-002 | Copy offline; rest continues; woken copy refuses Save | requirements-doc | Supported Normal | Use |
| SCN-007 (from the prior ticket's established contract, DS-005 / AR-001 of `delegated-launch-config-defaults`) | REQ-005; design Removal Plan | User | User | Open a copy member's conversation (or "+" from it) after changing its model | Sidebar → copy member | Normal | `agentSourceSelectors` → member conversation context | Context shows the model the member runs on | Prior ticket AR-001; this design's Removal Plan ("web selectors … In this change") | Supported Normal | Use |
| CON-001 | design Removal Plan, Task Design Health ("one rule … replace the remaining call sites", incl. web selectors) | Contract | — | — | — | — | — | — | design-spec | Supported (contract) | Use |
| CON-002 | DESIGN.md §4 (server authority, update freshness); design DS-001 (response carries the tree) and DS-004 (rows read the run tree DTO) | Contract | — | — | — | — | — | — | DESIGN.md, design-spec | Supported (contract) | Use |
| CON-003 | `>500` effective-line hard limit for changed source | Contract | — | — | — | — | — | — | Review rules | Supported (contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Path / Consequence | Evidence | Disposition | Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | The four copy-member selectors in `agentSourceSelectors.ts` still return the started launch and ignore `user_launch_selection` / `userLaunchSelection` | SCN-007, CON-001 | The user changes a copy agent's model (SCN-001), then opens that member's conversation or uses "+" from it | Selector → member conversation context: it shows the started model while the agent runs on the choice, and "+" prefills the started model. This persists after a full reload, because the rule is missing, not just stale | `git diff a609de982a -- autobyteus-web/services/collaborators/agentSourceSelectors.ts` is empty; the contracts export `teamCopyAgentLaunch` / `collaborationCopyAgentLaunch`; consumers are `agentOrgExecutionContext.ts`, `agentOrgExecutionViewIndex.ts`, `agentRunCollaborationIndex.ts` and the Team context factories | Promote | CR-001 |
| C-002 | No view publication after a Save. The live root views never receive the choice, and the web keeps a session overlay (`savedByRoot`) so that Settings rows show it | SCN-001, SCN-007, CON-002 | The user Saves on a live root | Committed tree → `replaceTree` only (Team: `team-run-delegated-launches.ts`; Org/Agent: `commitTree`), with no event. The live view tree keeps the old state; only Settings reads the overlay. Member contexts (after CR-001) and other clients stay on the old model until the run is re-read. The overlay is a second, client-side copy of server state | Handoff note 5; `commitSelections` paths publish nothing; `delegatedLaunchDraftStore.savedByRoot`; design DS-001 response `{outcome, tree}` | Promote | CR-002 |
| C-003 | Three changed server files cross the 500 effective-line hard limit: `agent-team-run-manager.ts` 466→530, `root-task-execution-lifecycle.ts` 418→521, `configured-agent-execution-handle.ts` 476→516 | CON-003 | — | Maintainability of three central owners | Size audit | Promote | CR-003 |
| C-004 | `update` holds collaborator activation fences while it waits for the task queue head (also when no task copy is in the Save). ARCH-REV-003 noted "no fence holder may wait on the root queue" | AR-001 | A Save that includes a collaborator | A deadlock would need a queue step that activates a collaborator handle | Team/Org/Agent `restoreChain` and activation look up host TeamRuns synchronously (`requireCollaboratorTeam` is a map lookup; `teams.require`) and restore only task-copy handles | Reject (no reachable path) | Residual note: keep queue steps free of collaborator activation |
| C-005 | A stopped standalone Save writes two files (tree, then host metadata); a metadata failure leaves copies saved and the host unchanged | AR-004 | I/O failure after validation | Reported to the user | Service code; handoff note 6 | Reject (infrastructure failure; reported) | Residual |
| C-006 | Configured-placement followers are computed from the current configuration at restore time, not "at the time of the change" | AR-003 | Editing a configured placed member on a stopped Org after a team choice | The member then has its own model and stops following, which is consistent | `configuredTeamFollowerAddresses` | Reject | — |
| C-007 | Stop drains held leases with no timeout | SR-006 | A delivery holding a lease for a long time | Deliveries hold leases only while delivering | Lifecycle code | Reject (no evidence of long holds) | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health preserved | Pass | Round 2: one rule from the server through the contracts to the web member contexts | — |
| Supplemental artifacts | Pass | None | — |
| Data-flow spine clarity | Pass | Round 2: DS-004 is complete (Save → publication → live view → contexts) | — |
| Ownership boundary | Pass | Service → root → command → port; the lifecycle owns marks and queue; handles own fences | — |
| Off-spine clarity | Pass | Validation reused; status publication owned by the roots | — |
| Existing capability reuse | Pass | `validateMany`, the persistence commit, the restore projectors and the run-settings controls are reused | — |
| Reusable owned structures | Pass | `effectiveCopyAgentLaunch`, the contract rule functions, the pure apply and resolve functions | — |
| Shared-structure tightness | Pass | Round 2: `savedByRoot` removed; the server is the single source | — |
| Repeated coordination ownership | Pass | Round 2: the contract rule is used in one place per casing | — |
| Empty indirection | Pass | The service owns routing and outcome mapping | — |
| Separation of concerns / file responsibility | Pass | Round 2: all changed owners ≤ 488 lines | — |
| Ownership-driven dependency | Pass | The run-history domain stays independent; `execution/task` does not import collaborators | — |
| Authoritative Boundary Rule | Pass | Roots never bypass the lifecycle queue; the service never touches handles | — |
| File placement | Pass | — | — |
| Layout | Pass | — | — |
| Interface clarity | Pass | Explicit run-ID references; exactly one ID per change | — |
| Naming | Pass | — | — |
| No unjustified duplication | Pass | One instance-choice walk per DTO casing (the established precedent) | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed in touched files | Pass | The old projector exports were reshaped; no dead code found | — |
| Tests clear and requirement-aligned | Pass | Round 1 tests plus round 2 selector specs (both casings), publication tests (UPDATED/UNCHANGED) and view-application specs | — |
| Test structure | Pass | — | — |
| No stale tests | Pass | — | — |
| API/E2E readiness | Pass | Server and web paths are consistent | — |

## Source File Size And Structure Audit

| Source File | Effective Lines | `>500` | `>220` Delta | SoC | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/services/agent-team-run-manager.ts` | 436 (round 2) | Pass | Pass | Pass | Pass | CR-003 resolved | — |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 488 (round 2) | Pass | Pass | Pass (`TaskExecutionLiveHolds` extracted) | Pass | CR-003 resolved | — |
| `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | 484 (round 2) | Pass | Pass | Pass (`AgentActivationFence` extracted) | Pass | CR-003 resolved | Non-blocking: the "support" file name |
| All other changed source files | ≤ 486 | Pass | Pass | Pass | Pass | — | Near the limit: `teamExecutionViewState.ts` (486), `root-team-run.ts` (481), `general-process-run-supervisor.ts` (476) |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | Optional fields with truthful absence |
| No legacy retention | Pass | Round 2: the selectors apply the rule (CR-001 resolved) |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`; AC-005 old-record test |
| No dual reads/writes | Pass | — |
| Transition mechanics | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Required Action |
| --- | --- | --- | --- | --- |
| Inline started-launch reads in the copy-member selectors | LegacyBranch | — | — | **Resolved in round 2** (instance rule applied) |
| `savedByRoot` overlay | CompatWrapper | — | — | **Removed in round 2** |

## Docs-Impact Verdict

- Docs impact: `Yes`. The implementation updated `settings.md`, `run_history.md` and `agent_communication.md`. Re-check the Settings doc after CR-002, for example what the user sees right after Save.

## Additional Material Premise Validation

- Upstream P-premises: Confirmed as recorded in ARCH-REV-003.
- No new material premise. The rejected candidates are listed above.

## Review Scorecard (Mandatory)

- Overall score: 9.2 / 92 (round 2; round 1 was 8.8)

| Priority | Category | Score | Why | Weakness | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-001..DS-004 complete, with publication through the existing live-mutation pattern | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.3 | The lifecycle owns `TaskExecutionLiveHolds`; the handle owns its fence; the port publishes | — | — |
| 3 | API / Interface Clarity | 9.2 | Explicit references; one contract schema per casing for the new event | — | — |
| 4 | Separation of Concerns and File Placement | 9.0 | All owners under the limit with coherent extractions | The "support" helper file groups three helpers; several files are near the limit | Concern-named files on the next touch |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | No client shadow state; the selection record is reused in the event | — | — |
| 6 | Naming and Readability | 9.0 | Clear vocabulary | `configured-agent-execution-support.ts` | Rename on the next touch |
| 7 | API/E2E Readiness | 9.2 | Server and web consistent; e2e DCM-001..004 and probe DCP-001 re-run by implementation | Real-runtime check pending (design step 6) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | The per-instance rule is consistent end to end; publication only after a committed write | — | — |
| 9 | No Backward-Compatibility / No Legacy | 9.4 | No version branches; inline derivations replaced | — | — |
| 10 | Cleanup Completeness | 9.2 | Removal Plan complete; shadow state removed | — | — |

## Findings

### CR-001 — The copy-member selectors ignore the user's choice (Medium, Local Fix) — **Resolved (round 2)**

- Basis: SCN-001 → SCN-007. The design Removal Plan and Task Design Health require the single launch rule at the web selectors. The prior ticket's AR-001 contract: a copy member's conversation context shows the runtime/model it actually runs on.
- Evidence: `autobyteus-web/services/collaborators/agentSourceSelectors.ts` is unchanged in this change.
  - `teamCollaboratorAgentSourceAt`, `teamCatalogAgentSourceAt`, `collaboratorAgentSourceAt` and `catalogSourceAt` return `entry.launch_configuration`, `task.source.launch_configuration` and `team…MemberLaunchConfiguration(...)`, which are the started values.
  - The contracts already export `teamCopyAgentLaunch` / `collaborationCopyAgentLaunch` and `teamMemberFollowsTeam`.
  - Consumers: `agentRunCollaborationIndex.ts`, `agentOrgExecutionViewIndex.ts`, `agentOrgExecutionContext.ts`, and the Team member context factories.
- Consequence: after a Save, the member's conversation context shows the started model while the agent runs on the choice, and "+" from that member prefills the started model. This persists after a reload.
- Required action:
  1. Apply the contract copy-launch rule in all four selectors: the agent's own selection, else the Team selection when the member follows its Team (recorded rule; the configured-placement equality where applicable), else the started value.
  2. Extend `agentSourceSelectors.spec.ts`: an agent copy with a choice, a Team copy follower and non-follower with a Team choice, a collaborator member with a choice, in both DTO casings.
  3. Re-check the "+" prefill from a copy member.

### CR-002 — Live views do not reflect a saved choice; the web keeps a client-side shadow (Medium, Local Fix) — **Resolved (round 2)**

- Basis: SCN-001 / SCN-007 on a live root. DESIGN.md §4 asks to preserve server authority and freshness. Design DS-001 returns `{outcome, tree}`, and DS-004 has the rows read the run tree DTO.
- Evidence:
  - `team-run-delegated-launches.ts` `commitSelections` (`replaceTree` + `afterDurability`, no publish) and `root-hosted-delegated-launches.ts` → `commitTree` publish no view update.
  - Handoff note 5: the live Agent-root view gets no event.
  - `delegatedLaunchDraftStore.savedByRoot` overlays saved choices per session, for Settings rows only.
- Consequence: on a live run, every surface fed by the live view stays on the old model until the run is re-read. That includes the member contexts once CR-001 is fixed, the Team/Org/Agent views and other open clients. The overlay is a second source of truth that only Settings consults.
- Required action:
  1. Make the live root view reflect a committed choice through the server. Either publish the root's existing tree/view update after the commit, as other live tree mutations do, or return the tree as designed and have the web refresh the live view from it.
  2. Remove `savedByRoot`.
  3. Add a test that a Save on a live root updates the view's tree.
- If neither option fits the existing publication model, return it to the Solution Designer as `Design Impact` instead of keeping the shadow.

### CR-003 — Three changed owners exceed the 500 effective-line hard limit (Medium, Local Fix) — **Resolved (round 2)**

- Evidence:
  - `agent-team-run-manager.ts`: 466 → 530.
  - `root-task-execution-lifecycle.ts`: 418 → 521.
  - `configured-agent-execution-handle.ts`: 476 → 516.
- Required action: split by owned concern without changing behavior.
  - The manager's delegated-launch reader, plan glue and options go to a sibling file.
  - The lifecycle's stopping-mark and lease-drain mechanics go to an owned collaborator; the queue steps stay in the lifecycle.
  - The handle's activation-fence mechanics go to a small owned helper, or the handle is trimmed otherwise.
  - Keep the existing tests green.

## Classification

- Round 2: N/A (Pass). Round 1 was `Local Fix` for CR-001..CR-003, all resolved.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (primary). Informational pass notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Stop interrupts work in progress (the user's choice); older copies without a delegator are not stopped (`notStoppedUnattributed`).
- A standalone stopped Save writes two files; a metadata failure is reported (C-005).
- A collaborator Save holds fences while waiting for the queue head. No deadlock path exists today; keep queue steps free of collaborator activation (C-004).
- Near the size limit: `teamExecutionViewState.ts` (486), `root-team-run.ts` (481), `general-process-run-supervisor.ts` (476).
- Another client with Team/Org Settings open sees a choice saved elsewhere only after Refresh; its live views update.
- A pre-existing base failure in `tests/architecture/application-framework-boundaries.test.ts` (SR-011), not caused by this branch.
- The real-runtime check (Codex/Claude) and user verification (AC-010) remain.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Full Re-Audit)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.2 / 92; every category is at least 9.0
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CR-001..CR-003 are resolved and verified against the code and tests. The package is ready for API/E2E.
  - Priorities: the per-instance member context and "+" prefill after a choice, the live Team/Org/Agent view updates after Save, and the real-runtime check (Codex/Claude).
  - Coverage hints for the Org UI, collaborator Team Stop and AutoByteus capacity are in `implementation-handoff.md`.
