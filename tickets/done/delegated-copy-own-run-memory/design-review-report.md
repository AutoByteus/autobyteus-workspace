# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/requirements-doc.md` (SR-007: SR-005/SR-006 approved by the user; SR-007 additions REQ-017/REQ-018 by the Solution Designer within the direction, user informed)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/design-spec.md` (SR-007, incl. §Review Response)
- Supplemental Task Artifacts Reviewed: `memory-layout-contract.md` revision 3 (behavior-defining; revision 2 user-approved, revision 3 corrections by the Solution Designer within the direction; governs where the requirements differ); `related-collaboration-model-contract-receipt.md`; `related-collaboration-prompt-wording-receipt.md`; `handoff-architecture-review.md` (SR-005/SR-006 version).
- Relevant Solution Revision IDs: `SR-005` .. `SR-009` (SR-001..SR-004 history)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-own-run-memory/tickets/in-progress/delegated-copy-own-run-memory/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: re-review of SR-009 (contract revision 5: implementer clarifications U-1..U-5; version-free names REQ-019 / DESIGN.md rule 8), after the ARCH-REV-003 Pass (`/software_engineering_team/solution_designer`)
- Prior Review Round Reviewed: `3` (ARCH-REV-003, Pass)
- Latest Authoritative Round: `4`
- Current-State Evidence Basis: worktree at base `db00ba16a9`. Code read:
  - `agent-run-metadata-store.ts` users (22 files) and the direct `run_metadata.json` references;
  - `agent-run-history-identity.ts` and `agent-run-history-catalog-service.ts#deleteRun`;
  - team and org tree-store users and writers (coordinators, root managers, Org catalog archive/compensation);
  - `app-data-migration-registry.ts`, and the released migrations importing modules this design changes;
  - `team-context-file-locator-transition.ts` with `root-run-package-current-validator.ts`;
  - `runtime-memory-location-classifier.ts` (location services);
  - `task-team-node-restoration.ts` and `TaskTeamNestedTeamExecution` producers;
  - `team-run-state-package-validator.ts`.

  Data (read-only): 633 trees on the user's machine, none unparseable; 8 `agent_teams/*` folders without a tree; migration ledger with `20261015_collaborators_to_delegated_runs_v1` SUCCEEDED. Release history: about 20 releases between 2026-08-15 (task copies) and 2026-09-26 (context-file locator migration). Round 2 also read: contract §5.4 / L6 / §8 / §10, requirements REQ-017 / REQ-018 / AC-020..AC-022, the design's §Review Response, Migration Plan and Interface, and the FAILED dispositions of the listed predecessors (`team-agent-memory-layout-app-data-migration.ts` `FAILED_UNSUPPORTED_SOURCE` / `FAILED_INVALID_TARGET`; `team-run-execution-tree-v2` `FAILED_UNSUPPORTED_ENTRY` / `FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD`; `agent-org-flat-team-families-v1` `FAILED_FAMILY_CONFLICT` / `FAILED_MISSING_TEAM_EXECUTION_TREE`; `team-run-execution-tree-v1`, `team-run-metadata-member-tree`) and the runner's `assertPrerequisites`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: persistence boundary of three families, run identity guards, placement, message logs, and a startup migration that moves and rewrites user data.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 3: REQ-017 corrected to per-run containment; consistent with REQ-007 and guideline §1)
- Approved requirements / intended behavior understood: Yes. A task agent is a normal run that owns its facts (`run_metadata.json` / team tree + `taskAgent`). The coordinating run keeps links, coordinates the lifecycle and keeps its own log. G1/G2 hide task agents from user-run readers. Each message is stored with the run(s) it belongs to. Delete keeps task agents (detached). The migration moves, writes own files, reduces trees and builds logs, without lockout. Memory Sync stays coherent with no new capability. Tests encoding the old layout are planned updates.
- Relevant existing behavior and evidence confirmed: metadata readers go through `AgentRunMetadataStore` except the path-based identity resolver (P-004). Team-tree readers go through the tree store. Message commits run under the per-root persistence coordinator. `listTaskExecutionChainForAgent` exists in all three indexes.
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, AC or preserved-behavior ID: `Yes`
- Remaining material ambiguity: None besides ARCH-F-006. Round 2: L1 is reconciled with nested sub-teams.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | D-1 split write: own file first, then link |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | `task_agent_team_member` carries `nestedTeamRunIds` (ARCH-F-002 resolved) |
| BEH-003, BEH-004 | System/User | Pass | Pass | Pass | Confirmed | composed read; placement-based restore |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | views over composed records |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | G1 task-agent reader in the explorer |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | delete own folder only; confirmation text |
| BEH-008 | Operational | Pass | Pass | Pass | Confirmed | Round 3: per-run input gate, no declared prerequisites (ARCH-F-006 resolved) |
| BEH-009 | System | Pass | Pass | Pass | Confirmed | per-run logs under the coordinating lock |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `memory-layout-contract.md` rev 4 | Pass | Pass | Pass | Pass | Pass | §5.4 ordering without a global gate; §8 step 0; nested-team support dropped after Task 9942a43c |
| `requirements-doc.md` | Pass | Pass | Pass | Pass | Pass | REQ-017 corrected; AC-020 adds F-PENDING-FAILED; AC-022 withdrawn |
| `investigation-notes.md` | Pass | Pass | Pass | Pass | Pass | status line at SR-008 |
| `handoff-architecture-review.md` | Pass | Pass | Pass | Pass | Pass | Corrected to SR-005/SR-006 during intake |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Refactor Needed Now | — |
| Root-cause classification is explicit and evidence-backed | Pass | ownership by nesting/embedding instead of links | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes; lazy hub loading deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-1..D-8 mapped to files | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Delegate | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Restore / wake | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass |
| DS-003 Load | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 Settings edit | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass — saves computed against the files inside the lock (ARCH-F-004 resolved) |
| DS-005 Message | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 Memory UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 Startup | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass (round 3: registry order + per-run gate) |
| DS-008 Placement | Pass | Pass | N/A | Pass | Pass | Pass | Pass | Pass (ARCH-F-002 resolved) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| tree stores (D-1) | Pass | Pass | Pass | Pass | all tree reads and writes are store calls (verified) |
| `AgentRunMetadataStore` (G1) | Pass | Pass | Pass | Pass | Path-based `AgentRunHistoryIdentityResolver` (delete/archive by ID) bypasses G1, but no product surface supplies a task agent ID (P-004) |
| team tree store (G2) | Pass | Pass | Pass | Pass | readiness, catalog, location service and offline repair read through the store |
| placement + layout (D-2) | Pass | Pass | Pass | Pass | rule shape incomplete (ARCH-F-002) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| stores → metadata store / team tree store / placement | Pass | Pass | Pass | Pass | — |
| migration source side → frozen module only | Pass | Pass | Pass | Pass | — |
| released migrations → current changed modules | Pass | Pass | Pass | Pass | repointed to frozen copies (D-9, §5.4) |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `readMetadata` / `readTaskAgentMetadata` / `writeTaskAgentMetadata` | Pass | Pass | Pass | Low | Pass |
| team `read` (G2) / `readTaskAgentTeam` / `writeTaskAgentTeam` | Pass | Pass | Pass | Low | Pass |
| `AgentRunMemoryPlacement` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| standard run files for own facts | Pass | Pass | N/A | Pass | `AgentRunMetadata`, team tree V3 + `TaskAgentSection` |
| startup migration / rename pattern | Pass | Pass | N/A | Pass | — |
| placement module | Pass | Pass | Pass | Pass | new rule owner justified (physical scope keeps logical meaning) |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| run-history store, agent-memory, family stores, app-data-migrations, web text | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| composed in-memory records | Pass | Pass | Pass | Pass | 28 consumers unchanged (D-1) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| link + `TaskAgentSection` | Pass | Pass | Pass | Pass | Pass | Immutable relationship facts on both sides by design (P2); changing facts once |
| on-disk tree record: link or full record (L4) | Pass | Pass | Pass | N/A | Pass | A full record is a current shape only until its own file exists (user-approved L4) |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping | Pass | Pass | N/A | Pass | repoint decisions in §5.4 / Change Sequence step 1 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| placement module in `agent-memory/domain`; own-file IO in `run-history/store`; migration folder | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootedAgentMemoryLocator`, physical-scope memory derivation, embedded facts, single tree log | Pass | Pass | Pass | Pass | dead code in touched files left to the implementer with evidence (Principle 7) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| old nested location | No | Pass | Pass | no fallback reads |
| full records kept until the own file exists (L4) | No (user-approved data-integrity guard) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| task agent folders, trees, own files, logs | Migration Required | Pass | Pass | Pass | Pass | Round 3: per-run gate (`WAITING_FOR_PREDECESSOR` non-terminal / `PRESERVED_UNSUPPORTED_TREE` warning); predecessor retry after the move harmless per class |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| steps 0–7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| layout, records, split after a Settings edit | Yes | Pass | Pass | Pass | — |
| nested sub-team member of a task agent team | Yes | Pass | N/A | Pass | S32, F-C2N |

## Material Premise Validation (Only When Needed)

### `P-001` — A released predecessor migration is still pending when this release first starts

- Related approved requirement or established contract: REQ-008 (context-file links behave as before); Data Migration Guideline §4 ("every released source shape stays supported until a release explicitly declares a minimum upgrade-from version"; "Before changing a current schema, repoint any released migration that still imports it").
- Initiating basis kind: `Operational` / `Contract`
- Independent trigger: a user on a release from 2026-08-15 .. 2026-09-26 (Team-root task copies exist; `20260926_team_context_file_execution_locators_v1` not yet run; about 20 releases, 1.4.7x–1.4.88) upgrades directly to this release.
- Forward path: `runPending` runs the locator migration before `20261017_task_agent_own_run_v1` → `TeamContextFileLocatorTransition.discover` → `new RootRunPackageCurrentValidator(memoryDir).scan()`. After D-6, owners' directories come from the placement rule (task agents at L1), but the data is still in the old nested layout. `listContextFileRecordSources` and the owner file checks then miss task-agent members' traces and attachments → `REFERENCE_UNAVAILABLE` (terminal warning success) → those historical attachment references are never converted. The same applies, in a FAILED-retry state, to the two snapshot migrations through `RuntimeMemoryLocationClassifier` → `createStoredCollaborationExecutionLocationService` (D-2). The prerequisite `collaborators_to_delegated_runs_v1` reads and writes trees through the current stores (D-1), which is benign under L4 but unstated.
- Consequence: attachment links of those task agents' members stay unconverted after the move (REQ-008).
- Reachability: `Reachable` (supported upgrade range; this machine's ledger is all terminal).
- Review consequence: ARCH-F-001 (round 1); resolved in round 2 by D-9 repointing. The prerequisite rule chosen with it raises ARCH-F-006.

### `P-002` — A task agent team has a nested sub-team member

- Related approved requirement: REQ-002, AC-002, AC-022; REQ-008 (migrated runs behave as before).
- Initiating basis kind: `Contract` (released data within the supported upgrade range, guideline §4)
- Independent trigger, as corrected in round 2: records written by releases from 2026-08-15 to 2026-09-01, when a team could contain a team. Current code cannot create a nested member: `flat-team-execution-factory.ts:46,58` rejects a configured Team inside a Team (added 2026-09-01, `37d05c7f71`), and `ConfiguredTeamExecutionNode.members` holds agents only. The record type `TaskTeamNestedTeamExecution` and `restoreTaskTeamNode` still accept the old shape. Round 1 named a current Org delegation as the trigger; that was wrong, and the Solution Designer's correction is verified.
- Forward path: the old nested member's memory is at `<root>/<teamCopy>/<subTeam>/<member>`. Migration step 3 renames `<teamCopy>` to `agent_teams/<teamCopy>/`, keeping `<subTeam>/<member>`. Without a nested level in the placement, the reader would resolve `agent_teams/<teamCopy>/<member>`.
- Consequence: migrated old nested members' conversations would not be found (REQ-008).
- Reachability: `Reachable` for old records only (none locally).
- Review consequence: ARCH-F-002 (round 1); resolved in round 2 (`nestedTeamRunIds` in the placement; F-C2N / AC-022 scoped to the old shape; no new nested member is created).

### `P-003` — The migration is retried after the app ran with a partly migrated state

- Related approved requirement: REQ-007 ("nothing is overwritten"), P6, AC-010, AC-015; contract S15 (the user-accepted scenario "the migration did not finish, then the user delegates").
- Initiating basis kind: `Operational`
- Independent trigger: one task agent's step fails → aggregate FAILED → the app starts and works (REQ-007). Messages are exchanged with already-moved task agents, whose own logs gain new entries. The next start retries.
- Forward path: step 5 "builds each moved task agent's own log from the coordinating run's log". If that means writing the log built from the coordinating log, new entries since the first attempt are erased. If it runs only for task agents moved in the current attempt, an agent interrupted between rename and log build is `SKIPPED_ALREADY_CURRENT` and never gets its log (AC-015).
- Reachability: `Reachable` on the same basis the contract used for S15.
- Review consequence: ARCH-F-003 (round 1); resolved in round 2 (merge for every task agent at L1).

### `P-004` — Delete or archive of a task agent's run ID through the standalone history catalog

- Initiating basis kind: `User`
- Independent trigger: none found. History delete and archive act on sidebar rows, and task agents never become rows (G1, history index).
- Forward path: `deleteRun` resolves a path (`AgentRunHistoryIdentityResolver`) and removes `agents/<id>` without reading metadata. A task agent's ID would have to be supplied directly to the API.
- Reachability: `Not Reachable` from a product surface.
- Review consequence: no finding, no machinery.

### `P-005` — The frozen parser cannot read a coordinating tree

- Initiating basis kind: `Operational`
- Evidence: 633 trees locally, 0 unparseable. Folders without a tree (8) are not enumerated.
- Reachability: `Unclear` beyond local data.
- Review consequence: residual note (round 1); round 2 adopts a preserved exclusion with a warning.

### `P-006` — An earlier registered `memory/` migration stays FAILED on a user's install

- Related approved requirement or established contract: REQ-007 ("the app always starts and stays usable"), REQ-008; Data Migration Guideline §1 ("Reject any design that makes … new work depend on successfully loading or migrating all historical data"; "Gate narrowly"; v1.4.87 lesson: a global dependency on aggregate success).
- Initiating basis kind: `Operational`
- Independent trigger: a user's data contains a historical package that one listed predecessor deterministically rejects. This is a released, data-driven disposition, for example `FAILED_UNSUPPORTED_SOURCE` / `FAILED_INVALID_TARGET` (`20260823_repair_team_agent_memory_layout`), `FAILED_UNSUPPORTED_ENTRY` / `FAILED_INVALID_OR_UNSUPPORTED_PAYLOAD` (`20260824_team_run_execution_tree_v2`), `FAILED_FAMILY_CONFLICT` / `FAILED_MISSING_TEAM_EXECUTION_TREE` (`20260901_agent_org_flat_team_families_v1`). The predecessor returns FAILED on every start. Persistent FAILED records do occur in real ledgers: this machine has two, from since-retired migrations.
- Forward path: upgrade → `runPending` retries the predecessor (FAILED again) → `assertPrerequisites` throws for `20261017_task_agent_own_run_v1` on every start → no task agent is ever moved or given an own file → under L6 every task agent of every coordinating run is "not available": not shown, not restorable, and its messages hidden in the run's views (§5.4: "Until then the app works on the old layout with task agents not available").
- Consequence: every existing task agent in every hub becomes inaccessible indefinitely, because of an unrelated package elsewhere.
- Reachability: `Reachable` (released FAILED dispositions; prerequisite semantics verified in `app-data-migration-runner.ts`; this machine is unaffected because all registered predecessors are terminal).
- Review consequence: ARCH-F-006 (round 2); resolved in round 3 (no declared prerequisites, per-run input gate, F-PENDING-FAILED).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None open | — | — | Resolved (round 3) |

## Review Decision

`Pass` (round 4)

## Findings

None open in round 4. ARCH-F-001..ARCH-F-006 remain resolved; SR-009 adds no finding (see `ARCH-REV-004`).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary), `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- Round 4 notes (SR-009, non-blocking):
  - U-4: for `taskAgent.origin: "configured_place"` the own file must still record `agentDefinitionId` (the place's definition, which never changes). Only the launch fields are `null` when never recorded. Otherwise the Memory page would list these task agents as "Unattributed" (AC-013), and the explorer test covers it.
  - The task-agent reader accepts `null` launch fields and `workspaceRootPath` (U-2, U-4); G1's standalone reader stays unchanged.
  - D-10 renames names only, not values. A versioned string value such as `"interrupt_cancel_queued_v1"` (`claude-sdk-streaming-session.ts:56`) is a protocol or event value, not a symbol name: keep it unless it is proven internal. Migration IDs, migration-owned frozen names, on-disk file names and persisted values stay unchanged (rule 8, §3.5). No GraphQL type or field name carries a version (searched).
  - The U-5 dead-code removal of the `hostKind: "team"` append path requires evidence (Principle 7), as the design states.

- Round 3 notes:
  - On an install where a tree-writing predecessor stays FAILED, ours stays non-terminal and re-enumerates the coordinating trees on every start (bounded: one tree read per run). Only the waiting runs' task agents stay unavailable; this is accepted per rule 7.
  - Editorial: the design's §Review Response row for ARCH-F-001 still says "our prerequisites = every earlier `memory/` migration". The Migration Plan ("no declared prerequisites") and the ARCH-F-006 row override it; the implementer follows the Migration Plan.
  - Nested-team support was dropped on the 9942a43c base; the frozen parser rejects the retired shape → `PRESERVED_UNSUPPORTED_TREE`, consistent with that ticket's retirement.

- Handoff focus 4 (Memory Sync residue). The guideline §6 exception requires explicit product approval. The user-approved contract (§4 Memory Sync row, imported-corpora row; REQ-015) states the bounded residue, the newly exported org-coordinated task agents, and that old-layout imports show no task agents. That approval satisfies the requirement; no further action.
- Handoff focus 6 (H2). Composing views (hub tree; team/org run list) reads one own file per task agent across every listed run. This is global work under DESIGN.md; the user accepted it with a follow-up (lazy loading). Measure it in the real-app run as planned (R-3).
- L5 for Team roots: a link whose own file is missing would leave messages in the coordinating Team log whose endpoint is no longer in the index (`team-run-state-package-validator.ts:23-25`). Not reachable in supported flows (own file written before the link and before any message). If tampering is ever in scope, the compose rule must keep the package valid.
- Large surface across three stores; merge coordination with other work in the same stores (R-4).

## Latest Authoritative Result

- Review Decision: `Pass` (round 4)
- Material-Premise Gate: `Pass` (P-006 resolved by the per-run gate; P-001..P-003 resolved; P-004 not reachable)
- Notes: Round 4: SR-009 clarifications (U-1..U-5) and version-free names (D-10, rule 8) are consistent with the requirements and contract; no finding. Round 3: ARCH-F-006 resolved; the design is ready for implementation. Round 2: ARCH-F-001..ARCH-F-005 resolved. L6 (load only available task agents, append-only message saves, saves computed against the files) and D-9 repointing are sound. One correction remains: narrow the migration's gate (ARCH-F-006). Round 1 notes: These are D-1 (compose at load, split at save with L4, in-memory types unchanged), G1/G2 in the readers, placement separate from the logical physical scope, per-run logs under the existing coordinating lock, delete keeping task agents, shape-faithful fixtures instead of real data, and Large / High. The fixes are bounded: handle pending predecessors, add the nested-team placement level, define log-merge semantics and the change-detection baseline, and reconcile stale requirement rows.
