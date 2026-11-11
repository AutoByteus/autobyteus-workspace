# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/collaboration-tree-open-tasks-only-469/requirements-doc.md` (SR-004 approved; wording corrections at SR-005 that change no intended behavior)
- Upstream Investigation Notes: `.../investigation-notes.md` (A-1 … A-8, B-1 … B-7; U-005 continues)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001 … SR-009)
- Reviewed Design Spec: `.../design-spec.md` (SR-009, `Ready`; commit `6e1f3cb23e`). Round 6 re-reviews D-8 only (DS-R1 and the Team event contract), after the Code Reviewer's failure-origin finding CR-003 (CRR-002, API/E2E round 1)
- Supplemental Task Artifacts Reviewed: `evidence/links-without-task-2026-11-10.txt`, `evidence/unlink-cases-2026-11-10.txt`, `evidence/team-tab-messages-2026-11-10.txt` (and their scripts); `follow-ups.md` (FU-001 … FU-003); `handoff-architecture-design-complete.md`
- Relevant Solution Revision IDs: SR-004 … SR-009 (SR-003 was withdrawn; its review was stopped with no decision)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-006`
- Current Review Round: 6
- Trigger: SR-009, which answers the Code Reviewer's failure-origin finding CR-003 on D-8
- Prior Review Round Reviewed: 5 (`ARCH-REV-005`, `Pass`)
- Latest Authoritative Round: 6
- Current-State Evidence Basis: code at base `bff4faa6f6`, read in the worktree under `autobyteus-server-ts/src`.
  - Round 1:
    - `server-runtime.ts:172-197`
    - `standalone-application-host/start-standalone-application-host.ts:155-167, 242`
    - `compositions/build-studio-server.ts:118-150, 329-330`
    - `compositions/project-task-execution-resource-composition.ts`
    - `run-history/services/root-run-package-readiness-index.ts:60-100`
    - `run-history/services/root-run-package-current-validator.ts:66-100, 176-220`
    - `agent-team-execution/services/agent-team-run-manager.ts:170-226`
    - `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts:175-470`
    - the 19 construction sites of the three tree stores
  - Round 2:
    - `run-history/maintenance/collaboration-run-history-index-repair.ts:26-70`
    - `run-history/services/team-run-history-index-row-projector.ts:23-46`
    - `run-history/services/agent-org-run-history-row-projector.ts`
    - `run-history/store/remote-task-execution-links.ts:1-80`
    - `run-history/store/task-execution-tree-split.ts:140-170`
    - `compositions/build-studio-server.ts:150-329` and `start-standalone-application-host.ts:166-242`, scanned for tree readers
  - Round 3:
    - `projects/domain/task-execution-resources.ts:66-106` (every entry is created `starting`, also by `assignExistingTaskExecution`)
    - `agent-collaboration/execution/task/root-task-dispatch.ts:40-100` (entry → prepare → commit → seed → `markStarted`; `markFailed` on failure)
    - (round 3, continued below)
    - `agent-team-execution/task-delegation/task-team-run-identity-factory.ts` and `agent-execution/services/agent-run-identity-allocator.ts` (planning allocates IDs and writes no file)
  - Round 4:
    - `app-data-migrations/migrations/task-agent-own-run-v1/coordinating-run-migration.ts:22-200`: plan post-order; `run()` continues after a per-run `FAILED_OPERATION`; `migrateOne` writes the own file inside the old folder, then renames it to L1; `ownTeamTree` writes `taskExecutions: []`; `reduceTree` turns a record into a link only when it and every record nested in it own their files
    - base `task-execution-tree-split.ts` compose: a full record whose own file is missing is left out silently today
    - `hasAgentExecution` callers: `GlobalAgentRunMessageRouter:73`, `ActiveCollaborationRootDirectory.placeOf:116`, whose only caller is `BusyRunRecorder:42`
  - Round 5:
    - `migrations/delegated-copy-own-file-complete-v1/own-file-completion.ts:76-151`: reads only the configured placements of a coordinating tree, never its delegated-run lists; the link facts (`address`, `delegatorAgentRunId`, `startedAt`) come from the released own file
    - `frozen/released-run-package-shapes/released-task-agent-own-files-with-origin.ts:119, 483-514`: a v1 own file requires `address`; v1 writes it at `agentMemoryDir(id)` / `teamDir(id)`, the standard place
  - Round 6:
    - `autobyteus-web/services/teamExecution/teamExecutionViewState.ts:380-433`: the "started" handler inserts, plans contexts, repairs focus and reconciles navigation, with no auto-navigation. Today's "reopened" handler sends an unknown reference to `team_stream_recovery_required`. "Closed" throws on an unknown reference.
    - `autobyteus-team-stream-contracts/src/team-task-execution-message-dtos.ts:10-36`: the started payload `{change_sequence, parent_team_run_id, execution}`; the reopened schema is today an alias of the closed one.
    - Every consumer of `TASK_EXECUTIONS_REOPENED` (grep): 3 server root events, 3 view projectors, the Org DTOs, the Team stream contract, three web contexts and a type union in `teamExecutionViewModels.ts`. The cross-node Team projector does not use it.
  - Nothing was run.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged and confirmed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: yes, as in round 1. At SR-007, REQ-007 and AC-009 were made precise (approved within the direction; no visible change). The SR-005 wording corrections do not change the intended behavior:
  - REQ-001 and AC-001: the first save after the upgrade.
  - REQ-003: links to another node keep today's listing rule.
  - AC-005: the warning names the Task (DEC-010).
  - AC-008: admitted at startup.
- Relevant existing behavior and evidence confirmed:
  - The startup order (B-5) was re-read. Nothing between `RootRunPackageReadinessIndex.rebuild()` and the Task-record load reads a tree: `build-studio-server.ts:150-329` and `start-standalone-application-host.ts:166-242` contain no history, catalog, location, manager or store use.
  - D-12 is today's rule: `attachRemoteLinks` leaves out a remote link whose delegator is not an agent of the composed tree (`remote-task-execution-links.ts:60-63`).
- Scope guardrail confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on, opened at their cited lines:
  - B-5's startup order and its 19 construction sites: true.
  - "Startup reads less than today": true. Admission no longer composes delegated runs.
  - D-12 "today's listing rule": true (above).
  - The `Inferred` application-runtime site (`application-execution-scope-kernel-builder.ts:180`) is created inside `buildStudioServer` after line 329. That is consistent with my scan; AC-008 covers it.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass (DS-001 after startup; DS-008 at startup) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | U-003, U-006 stay implementation checks |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass (admission no longer depends on the source) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/links-without-task-*` | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/unlink-cases-*` (plus the U-004 count) | Pass | Pass | Pass | Pass | Pass | — |
| `evidence/team-tab-messages-*` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |
| Investigation notes (B-4, B-5, statuses) | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Refactor with a behavior change | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Shared Structure Looseness` (A-1, A-2, B-1) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `Yes`; FU-001 … FU-003 | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-1 … D-12; removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 Tree read (after startup) | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 Delegate | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 Closure | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 Reopen / follow-up | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 Team tab | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 Memory | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 Token total | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 Startup admission, repair | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-R1 Reopened event | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Tree store `read` / `readOwnParts` / write | Pass | Pass | Pass | Pass | Two reads with distinct subjects: the composed tree, and the root run's own parts. Only admission and repair use the latter |
| `OpenDelegatedRunSource` | Pass | Pass | Pass | Pass | Resolved at the first composed read, never in a constructor |
| `TaskExecutionResourcePort` | Pass | Pass | Pass | Pass | — |
| `RootTaskExecutionAdapter` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/store` → source interface ← `projects` | Pass | Pass | Pass | Pass | Binding in `compositions/` |
| Startup admission and repair → `readOwnParts` | Pass | Pass | Pass | Pass | No dependency on the Task records, so no ordering is needed |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `openDelegatedRunsOf(coordinatingRun)` | Pass | Pass | Pass | Low | Pass |
| `readOwnParts(dir, rootRunId)` (Team, Org) | Pass | Pass | Pass | Low | Pass |
| `closedTaskExecutionOf(hostRoot, by)` | Pass | Pass | Pass | Low | Pass |
| `dropTaskExecutions`, `addTaskExecution`, `knowsRunId` | Pass | Pass | Pass | Low | Pass |
| `collaborationParticipantMessages.pastParticipants` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Compose and save | Pass | Pass | N/A | Pass | — |
| Startup admission | Pass | Pass | N/A | Pass | The existing validator, with a narrower read |
| Runs of a top run | Pass | Pass | N/A | Pass | — |
| Step ordering | Pass | Pass | N/A | Pass | — |
| Tree-membership policy, closed-run reader | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/store`, `run-history/services`, `run-history/maintenance` | Pass | Pass | Pass | Pass | — |
| `projects/services`, `compositions` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration/execution/task` | Pass | Pass | Pass | Pass | — |
| Three root areas | Pass | Pass | Pass | Pass | Team/Org rows read in part (U-005) |
| API, contracts, web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Compose for three shapes | Pass | Pass | Pass | Pass | — |
| `isMessageOfView` | Pass | Pass | Pass | Pass | — |
| Web "unknown reopened → reload" | Pass | N/A | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Tree file list | Pass | Pass | Pass | N/A | Pass | Remote links only |
| Task record entry | Pass | N/A | Pass | N/A | Pass | `hostRoot` kept; 461 note recorded |
| Org per-Team list | Pass | Deferred (FU-003) | Pass | N/A | Pass | Its 2 entries belong to runs with no Task record (U-004) |

Derived consumers of a changed structure listed with a decision for each: `Pass` (Change Scope table and B-5).

Each domain word keeps one meaning, and each concept one name: `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `open-delegated-run-source.ts` | Pass | Pass | N/A | Pass | — |
| `task-execution-tree-split.ts`, the three stores | Pass | Pass | Pass | Pass | `readOwnParts` on the Team and Org stores |
| `root-run-package-current-validator.ts`, `collaboration-run-history-index-repair.ts` | Pass | Pass | N/A | Pass | One call each |
| `task-execution-tree-membership.ts`, `closed-delegated-run-reader.ts`, `coordinating-run-presence.ts` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Existing folders only | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Local link writer/reader, L6 rule | Pass | Pass | Pass | Pass | — |
| `TaskAgentLinkChecker` | Pass | Pass | Pass | Pass | — |
| Validators' endpoint-set loop | Pass | Pass | Pass | Pass | — |
| `refuseCopyOutsideTree` | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Stored local links | No (ignored on read; a strict link left out at a save once its run owns its file at the standard place; every other entry kept byte-for-byte) | Pass | Pass | AR-002 resolved |
| `readOwnParts` beside `read` | No (two subjects, not two versions) | Pass | Pass | — |
| Fallback list for unreadable Task records | No (DEC-010) | Pass | Pass | — |
| Rollback to an older build | No | Pass | Pass | Release notes |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Local links in three tree shapes | Directly Usable — No Migration | Pass (released partial states are kept unchanged for v1; MP-002 closed) | Pass | N/A | Pass | — |
| Remote links | Not Affected | Pass | Pass | N/A | Pass | — |
| 14 runs without a Task record | Out of the tree only (user, DEC-008) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1 … 8 | Pass. Step 2 switches the validator and repair together with compose, so every commit still admits Team and Org runs | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored file, lookup, compose, closure, view rule | Yes | Pass | Pass | Pass | — |
| Startup order | Yes | Pass (DS-008 chain; B-5 table) | N/A | Pass | — |

## Material Premise Validation

### `MP-001` — A stored Team/Org tree is read at startup before the Task records are loaded

Resolved in round 2 (D-11, DS-008). SR-007 does not touch it.

### `MP-002` — A stored full Team record whose own file exists still holds the only record of a nested run

- Related approved requirement or established contract:
  - REQ-007 (the Task records and own files hold every fact; nothing is lost);
  - the Data Migration Guideline §2 item 5 ("preserve released originals and supported partial states") and §4, which the notes cite in B-7;
  - the released migration `20261017_task_agent_own_run_v1`'s retry contract ("every step recognizes from the files what is already done").
- Relevant behavior ID(s): BEH-002 (persisted side), REQ-007 / AC-009
- Initiating basis kind: `Operational` (startup migration, then normal use)
- Independent trigger: the first start of a release carrying v1 on data with a delegated Team that itself delegated (a nested record). One nested run's step ends `FAILED_OPERATION`, for example "'<target>' already exists; it is never overwritten" or an I/O error, which is a per-run disposition `run()` records and moves past. The app keeps running, as the guideline requires and the engineer's existing test exercises.
- Forward path:
  - `plan()` is post-order. The child's `migrateOne` fails. The parent Team's `migrateOne` succeeds: its own file is written with `taskExecutions: []` (`ownTeamTree`) and the folder is renamed to L1.
  - `reduceTree` keeps the parent as a full record, because a descendant is not owned (`:193-195`). The tree file now holds the parent's full record, and the nested child's record exists only inside it.
  - The app runs, and the coordinating run loads and saves.
  - Under SR-007, the save checks only the entry's own run ID. The parent's own file exists at L1, so the whole entry is left out, including the nested record.
  - At the next start, v1 plans from the tree, finds no record for the child and cannot migrate it. Its address, delegator and launch facts are gone. Its folder survives inside the parent's L1 folder, unreferenced.
- Lifecycle preconditions and material consequence: permanent loss of a delegated run's only record in a supported partial state. This is the same class of failure SR-007 was written to prevent.
- Reachability: `Reachable` (a supported per-run failure disposition; the app is required to keep running).
- Review consequence: AR-002

- Status in round 5: under SR-008 the parent's full record is not link-shaped, so it is kept byte-for-byte with the nested record, and the next v1 run can still migrate the child. AR-002 resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Round 5: D-3 (SR-008)

- **Rule:** a stored local entry is left out at a save only when both hold:
  - it has exactly the link keys (`address`, one of `agentRunId` / `teamRunId`, `startedAt`, optionally `delegatorAgentRunId`);
  - its run's own file exists at the standard place.

  Every other local entry is kept byte-for-byte and in place, and is never interpreted.
- **Judgement:**
  - It closes MP-002: a full record, nested or not, is never link-shaped, so the released migration keeps owning it until it reduces it to a link.
  - The exact key set is stricter than today's two-absent-keys test: an unknown shape is kept, never dropped.
  - Every fact of a dropped link is in the run's own file. A v1 own file requires `address`, and the second released migration completes own files from themselves and from configured placements only (`own-file-completion.ts:76-151`), never from delegated-run lists.
  - The standard place equals where v1 writes own files (`agentMemoryDir`, `teamDir`). An own file left inside an old folder before v1's rename does not count, so its entry stays.
  - Route (b) keeps current code from walking a released shape's nesting. The only cost is that a fully owned full record leaves one save later, which is acceptable.
- **AC-009 fixtures** now cover:
  - a full Team record whose own file exists, with an unowned nested record;
  - a full record without an own file;
  - a link whose run has no own file.
- **REQ-007 precision:** no visible change, approved within the direction.

## Round 6: D-8 (SR-009)

- **Problem (CR-003):** a Team view loaded after a restart never holds a closed run. On reopen, today's handler requests a stream recovery, which in the Team client is a manual step. The Agent-run and Org contexts reload themselves through `checkpoint_required`.
- **SR-009:**
  - The Team's `TASK_EXECUTIONS_REOPENED` carries each reopened execution's record with its parent Team run, built from the loaded tree after the add-back, as "started" is.
  - The view inserts a record it does not hold (`insertTaskExecution`), keeps one it holds, then removes every reopened execution from the closed list. The branch to stream recovery is removed.
- **Judgement:**
  - One event serves both client states: holds it hidden, or never held it. It is idempotent: a view whose snapshot already includes the add-back holds the record and only un-hides it.
  - The effects of "started" add no visible behavior: no auto-navigation, focus repaired, navigation reconciled. That keeps DEC-001.
  - The event follows the reopen commit and the add-back in the same queue step, and nothing is published when the commit fails. So the record always exists in the loaded tree when the event is built.
  - The parent of a reopened execution is the root Team run: only `assigned` entries reopen, and an assignment is never made by a Task-owned agent (A-3), so it is never hosted inside a task team. D-2 also puts every local record in the root list.
  - The rejected options are rejected for the right reasons. An automatic Team snapshot reload would be a new recovery mechanism. A "started" event at the add-back throws on a view that holds the run (Team) or is rejected (Org, `agentOrgExecutionContext.ts:371-385`), and would precede the commit.
  - The Agent-run and Org contexts are unchanged and correct.
  - CR-002 (keeping `pastParticipants` current) and DEC-011 (F-1) are recorded and not for this review.
- **Result:** `Pass`.

## Review Decision

`Pass`. D-8 as revised in SR-009 is ready for implementation. All earlier verdicts stand: D-11 (round 2), D-1 (round 3), D-3 (round 5).

## Findings

None open. AR-001 is resolved (ARCH-REV-002) and AR-002 is resolved (ARCH-REV-005).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer is informed.

## Residual Risks

Non-blocking.

- **Contract detail:** today `teamTaskExecutionsReopenedPayloadSchema` is an alias of the closed schema (`team-task-execution-message-dtos.ts:35`). Split it, keep `change_sequence` in the new reopened payload (the view's sequence tracking uses it), and leave "closed" with references.
- **Closed events:** "closed" still throws on an unknown reference in the Team view. This stays unreachable because "closed" is published before the drop, for a run the loaded tree holds (DS-R1 paragraph). Keep that order.
- **U-005** continues during implementation; AC-002 and AC-003 run in the browser per root kind, with and without a restart.
- **Kept entries, D-12, the 461 note:** as before.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: round 6 confirms SR-009's D-8 (the Team's reopened event carries records). No open findings.
