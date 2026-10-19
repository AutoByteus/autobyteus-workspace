# Design Review Report — run-file-change-owner-scoped-reads

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/requirements-doc.md` (Approved, SR-001 content approved in SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/design-spec.md` (SR-003, status `Ready`)
- Supplemental Task Artifacts Reviewed: autobyteus-93 `probe-run1.txt` (Task context file); `tickets/done/delegated-copies-slow-open/evidence/API-05-07-timing-summary.txt` (evidence only)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-owner-scoped-reads/tickets/in-progress/run-file-change-owner-scoped-reads/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: `Architecture Design Complete` handoff for SR-003 (`handoff-architecture-design-complete-sr-003.md`), which revises the design for ARCH-REV-001 AR-001 and AR-002 (2026-10-19)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: code read in the task worktree at base `cba6b85122` (2026-10-19):
  - `run-history/services/run-file-change-projection-service.ts`
  - the three member-view services
  - `team-run-execution-tree-location-service.ts`
  - `collaboration-execution-location-service.ts` (`locatedLaunchConfiguration`)
  - `standalone-root-location-service.ts:212-213`
  - `services/run-file-changes/run-file-change-service.ts`
  - `agent-execution/domain/agent-run-file-change-path.ts`
  - `api/rest/run-file-changes.ts`
  - `agent-collaboration/execution/backends/configured-agent-execution-handle.ts`
  - `application-platform/execution/application-execution-scope-kernel-builder.ts`
  - web `activeContextStore.ts`, `activeAgentWorkspaceTarget.ts`, `agentRunCollaborationStore.ts`, `agentOrgExecutionContext.ts`, `eventMonitorActiveTracePageService.ts`
  - `git grep` checks for consumers and for `getEntry`
  - Round 2 additions:
    - `run-history/store/agent-run-metadata-store.ts#readMetadataState` (G1: a file with a `taskAgent` section reads as `missing`; the path is `getStandaloneRunDirPath(runId)/run_metadata.json`)
    - `agent-memory/store/agent-memory-layout.ts#getAgentRunMemoryDirPath` (configured members live in rooted dirs; task agents in the standalone dir with their own `taskAgent` file)
    - `agent-run-provisioning-service.ts#prepareAgentRun` → `recordPreparedRun`
    - the only standalone `beginActivation` call sites, which activate from recorded metadata (`standalone-agent-run-lifecycle-service.ts:206,234,240`); member activation goes through `configured-agent-activation-planner.ts`
    - `collaborator-source-projector.ts`, whose imports are domain-only, so there is no cycle

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the change adds two GraphQL queries and three REST routes. It narrows the existing run-id surfaces to standalone runs with a clean cut. Team and org member reads become live while running. All of this stays inside the existing owners.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The classification is correct.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. The round-1 current-state correction is applied in SR-003 (BEH-002/BEH-003, DEC-003 evidence, R-001).
- Approved requirements / intended behavior understood: `Yes`. Every file-change read names its owner. Run-id-only reads serve standalone runs only. No read searches every saved run. The content response policy is the same for every owner.
- Relevant existing behavior and evidence confirmed: mostly `Yes`. The scan in `readProjectionContext` matches the record, and so does the unscoped team `requireLocation`.
  - **Correction:** every running collaboration member run is published in the shared `AgentRunActivationRegistry` that `AgentRunManager.getActiveRun` reads. This covers team members, org members, task agents and copies; the evidence is `configured-agent-execution-handle.ts:111,465-473` and the kernel builder lines 97-134. Today a run-id read of a member that is currently active therefore takes `activeStandalone`. It returns a live list and 409 for pending files, with no scan.
  - BEH-003's statement that "this path never sees the team as active" holds only for members that are saved or not yet activated. This does not change DEC-003's target, but it matters for AR-001.
- Scope guardrail confirmed: `Yes`. In scope: UC-001..UC-006. Out of scope: FU-A context files, autobyteus-93 FU-1/FU-2/FU-4, other scans, storage. Preserved: BEH-006, BEH-007, REQ-008, the same entries and bytes, and containment rule 7. The review authority is as stated.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`. AR-001 traces to REQ-005 and AC-007. AR-002 traces to AC-003, AC-005, UC-002, UC-003 and the BEH-003/BEH-005 preserved "same bytes".
- Remaining material ambiguity: none in the approved intent.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass. Hub location carries the catalog `launchConfiguration` (`standalone-root-location-service.ts:213`) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass for lists | Confirmed | — |
| BEH-003 | User | Pass | Pass (corrected in SR-003) | Pass. `locatedExecutionSource` supplies the task agent's catalog launch root | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass for lists | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (same owner, org lists include member teams' `taskExecutions`) | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass. Standalone metadata decides first, then active or stored | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass. Only the fetch moves | Confirmed | — |
| BEH-008 | User | Pass | Pass. `findAgent({ agentRunId })` without the root confirmed | Pass. `rootTeamRunId` makes it one tree (`findInActive`, then one stored root) | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass. `browse` exists on every target kind and the viewer guard covers mismatches | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| autobyteus-93 `probe-run1.txt` | Pass | Pass | Pass | Pass | Pass (evidence) | — |
| `API-05-07-timing-summary.txt` | Pass | Pass | Pass | Pass | Pass (evidence) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Posture: performance with an API identity correction | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`. The ambiguous run-id selector is resolved by a global scan inside the file-change service, which holds its own stored-only locators (confirmed in code) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `Yes`. FU-A is deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, interface mapping and dependency rules reflect it | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 content | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 list | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 team member lookup | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member-view services (per family) | Pass | Pass | Pass | Pass | Routes and resolvers call only the member-view service. The bad shape is named |
| `RunFileChangeProjectionService` | Pass | Pass | Pass | Pass | No location services remain inside it |
| Web `fetchRunFileChanges` / `runFileChangeContentPath` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Resolvers/routes → member-view → file-change service → store/live | Pass | Pass | Pass | Pass | No cycle: the file-change service never depends on member-view or location services |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `getRunFileChanges(runId)`, `/runs/:runId/file-change-content`, `getStandaloneRunProjection` / `resolveStandaloneRunEntry` | Pass | Pass | Pass. Standalone run metadata is the discriminator | Low | Pass |
| `getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges`, `agentRunCollaborationMemberFileChanges` | Pass | Pass | Pass | Low | Pass |
| Three new REST owner routes | Pass | Pass | Pass. `memberAddress` is required where the family validates it | Low | Pass |
| `resolveLocatedCollaborationMemberEntry(location, path)` / `getLocatedCollaborationMemberProjection(location)` | Pass | Pass | Pass. A tagged location (`tagTeamAgentExecution`); the root comes from `locatedExecutionSource` | Low | Pass |
| `locatedExecutionSource(location)` / `tagTeamAgentExecution(item)` (new exports) | Pass | Pass | Pass. Reads only the located tree it is given | Low | Pass |
| Member-view `getFileChanges` / `resolveFileChangeEntry` | Pass | Pass | Pass | Low | Pass |
| Web `fetchRunFileChanges(subject)` / `runFileChangeContentPath(subject, path)` | Pass | Pass | Pass (tagged subject) | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Locate a member in one root | Pass | Pass | N/A | Pass | — |
| Launch workspace root of a located member | Pass | Pass | Pass | Pass | `locatedExecutionSource` becomes the one owner and replaces three private `childSourceOf` helpers |
| Web owner subject | Pass | Pass | N/A | Pass | — |
| Route shapes | Pass | Pass | N/A | Pass | They match the `context-files.ts` precedent |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `run-history/services`, `standalone-agent-run-root/services`, `agent-collaboration/execution/domain`, `api` | Pass | Pass | Pass | Pass | — |
| web `runHydration`, `runFileChanges`, `types/agent`, viewer, mobile | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunReadSubject` + `agentRunIdOf` | Pass | Pass | Pass | Pass | — |
| Content response policy | Pass | Pass | Pass | Pass | — |
| `entryIn` | Pass | Pass | Pass | Pass | — |
| `CollaborationMemberNotFoundError` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunReadSubject` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-file-change-projection-service.ts` | Pass | Pass | N/A | Pass | Metadata first, then active or stored |
| `collaboration-execution-location-service.ts` | Pass | Pass | Pass | Pass | Located-execution helpers sit next to the tagged union |
| `team-member-…`, `agent-org-member-…`, `standalone-root-member-…` view services | Pass | Pass | Pass | Pass | Use `locatedExecutionSource`; the team service tags its location |
| All other listed files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/runFileChanges/runFileChangeContentPath.ts` | Pass | Pass | Low | Pass | — |
| `agent-collaboration/execution/domain/collaboration-member-not-found-error.ts` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/types/agent/agentRunReadSubject.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Collaboration fallback, its locators and imports | Pass | Pass | Pass | Pass | — |
| `RunFileChangeProjectionService.getEntry` | Pass | N/A | Pass | Pass | Dead. The only `.getEntry(` matches in `src` belong to other classes |
| Viewer run-id URL; copy-local `fetchFileChanges`; old subject export | Pass | Pass | Pass | Pass | — |
| Member-by-run-id tests | Pass | Pass | Pass | Pass | — |
| "Active run first" check; three `childSourceOf`; private `tagTeam` | Pass | Pass | Pass | Pass | Replaced in SR-003 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Run-id reads / subject type / method names | No | Pass | Pass | No fallback and no alias. Only in-repo consumers (`git grep`) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Saved trees, `file_changes.json` | Not Affected | Pass | Pass | N/A | Pass | Reads only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server steps 1-4, web steps 5-6, docs step 7 | Pass | Pass. Codegen needs a server built from the worktree | Pass. The R-003 containment trigger has an owner | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Route shape, server dispatch, ownerless read (including an active member), task agent entry, viewer guard | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A run-id-only read names a collaboration member whose AgentRun is currently active

- Related approved requirement or established contract: REQ-005, AC-007, QR-002; SCN-006 (approved `Supported Explicit Edge Scenario`, the API contract of the read surfaces)
- Relevant behavior ID(s): BEH-006
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: REQ-005 and AC-007 define the run-id read contract. For any non-standalone run id it must return an empty list or a 404. SCN-006 names the callers as "other clients or stale tabs".
- Support evidence: the approved requirements explicitly govern this contract, independent of the mechanism under review. AC-007 sets the expected outcome for a "team, org or copy member's run id" without excluding running owners.
- Forward path: a client calls `getRunFileChanges(memberRunId)` or `/runs/<memberRunId>/file-change-content` while the member's team, org or hub runs.
  - The call reaches `getStandaloneRunProjection` / `resolveStandaloneRunEntry` ("active run, else stored metadata, else empty", design-spec Interface Boundary Mapping).
  - `AgentRunManager.getActiveRun(memberRunId)` returns the member's run. Members are activated through `ConfiguredAgentExecutionHandle` against the shared `AgentRunActivationRegistry`, as `isStale` confirms at `configured-agent-execution-handle.ts:473`.
  - The call then reaches `activeStandalone(run)`.
- Lifecycle preconditions and material consequence: the owner is running and the member's run is activated. The read returns the member's live list and file bytes instead of an empty list or a 404, so REQ-005 and AC-007 are not met. No other run's files leak and no tree is scanned, so QR-002 holds.
- Reachability: `Reachable` (contract basis)
- Review consequence / proportionate response: AR-001 was raised in round 1 and is resolved in SR-003 by the metadata-first discriminator plus a running-owner AC-007 test.

### `MP-002` — A user opens a file of a team's (or org's) task agent

- Related approved requirement or established contract: AC-003 ("also a team's task agent"), AC-005, UC-002/UC-003 ("including the team's/org's task agents"), REQ-008, the BEH-003/BEH-005 preserved "same bytes"
- Relevant behavior ID(s): BEH-003, BEH-005
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: Workspaces sidebar → team run (or org run) → select a task agent → Artifacts tab → click a file it wrote (SCN-002/SCN-003)
- Support evidence:
  - The web builds targets for these members: `activeContextStore.ts` `standalone_team_member`, and `agentOrgExecutionContext.ts` `agent_org_task_agent` with `workspaceRootPath: agent.source.launchConfiguration.workspaceRootPath`.
  - Live entries are canonicalized relative to the run's real workspace root (`RunFileChangeService.normalizeEntry` / `fromRun`), so files written inside the workspace are stored with relative paths.
- Forward target path:
  - The viewer calls the team or org owner route, which calls `resolveFileChangeEntry`, then `requireLocation` (a catalog copy: `configuredPlacement === null`, accepted through `childSourceOf`), then `resolveLocatedCollaborationMemberEntry(location, path)`.
  - The workspace root comes from `locatedLaunchConfiguration(location)`. For `agent_team`/`agent_org` this is `configuredPlacement?.launchConfiguration ?? null`, which is `null` for a catalog copy.
  - `resolveRunFileChangeAbsolutePath(relativePath, null)` returns `null` (`agent-run-file-change-path.ts`), so the REST route answers 404 "File change content is not available".
  - By contrast, the hub location fills `launchConfiguration` from the catalog source (`standalone-root-location-service.ts:213`), so copies are unaffected.
- Lifecycle preconditions and material consequence:
  - **Running owner:** a regression. Today the task agent's active run is served by `activeStandalone` with its real workspace root and shows the bytes.
  - **Saved owner:** today's scan uses the same `locatedLaunchConfiguration` and gives the same 404, which is a pre-existing defect. AC-003 nevertheless requires the content to show for a team's task agent.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-002 was raised in round 1 and is resolved in SR-003 by `locatedExecutionSource`, `tagTeamAgentExecution` and saved/running task-agent tests.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| BEH-003 / DEC-003 current-state wording | — | Corrected in SR-003 | Resolved |

## Review Decision

- `Pass`. The behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. The round-1 findings are resolved; see `ARCH-REV-002` in the revision record.

- AR-001 is resolved.
  - `getStandaloneRunProjection` / `resolveStandaloneRunEntry` read standalone metadata first. Absent metadata gives `[]` / `null` with no active check and no tree read.
  - Verified: G1 treats a task agent's own file as `missing`. Configured members have no file at `agents/<runId>/`. Standalone activation only happens from recorded metadata.
  - AC-007 covers running owners.
- AR-002 is resolved.
  - `locatedExecutionSource(location)` is the one owner of a located member's configured or catalog-copy source, and `locatedLaunchConfiguration` delegates to it.
  - The three `childSourceOf` helpers are removed, and `tagTeamAgentExecution` is exported.
  - There is no import cycle. Saved and running task-agent tests are planned.

## Classification

- N/A (Pass)

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (primary). `/software_engineering_team/solution_designer` gets the informational pass notification.

## Residual Risks

- U-001 (timing on a realistic seed) remains for API/E2E under AC-010. The design's cost model (one owner tree per read) is confirmed in code.
- R-002: the viewer guard (`agentRunIdOf(readSubject) === artifact.runId`) is adequate. The guard returns no URL rather than a wrong-owner URL.
- R-003: the containment e2e trigger replacement is delegated to API/E2E with a recorded choice. This is acceptable.
- R-004: one standalone metadata read per run-id read. This is negligible and accepted.
- R-005: `metadataFor` now uses the shared source rule (`configured ?? catalog copy`), with the same outcome as before.
- Non-blocking: team routes do not carry `memberAddress`, which matches the team member-view identity. The web subject still carries it.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are `Reachable`, and their consequences are addressed in SR-003.
- Notes: round 2 verified the SR-003 fixes against code. Sections unaffected since round 1 keep their verdicts.
