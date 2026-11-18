# Design Review Report — projects-left-navigation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/requirements-doc.md` (R4; REQ-008, DEC-013 and AC-007 refined in SR-008; unchanged in SR-009)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/investigation-notes.md` (E-001…E-042)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/solution-revision-record.md` (SR-001…SR-009)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed:
  - `code-review-report.md` (CRR-001, CR-001 Design Impact, CR-002 Local Fix)
  - `handoff-architecture-review.md` § Re-review request — SR-009
  - `docs/design-cases.md` Case 14
  - Product `ui-ux-spec.md` + VIS-001…025 (unchanged)
- Relevant Solution Revision IDs: SR-008 (last passed), SR-009 (this round)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/tickets/in-progress/projects-left-navigation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: the Solution Designer's re-review request for SR-009 (commit `5f8872eca2`), after code review CRR-001 CR-001
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass on SR-008)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: base `8faae96899`, read with `git show`:
  - `run-history/store/agent-run-history-index-store.ts` 16–26 (row-key allow-list), 66–76 (`parseIndexFile` returns `null` on any other key), 160–172 (null → empty index)
  - `agent-team-execution/services/agent-team-run-manager.ts` 126–150 (the team run id comes from the config before `buildInitialTeamRunExecutionTree`)
  - `projects/stores/projects-layout.ts` (single path owner) and `projects/stores/project-store.ts` (folder listing reads directories only; Delete keeps other files)
  - server `docs/modules/projects.md` § Delete
  - `RELEASE.md` § Rollback

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Unchanged and confirmed. The persistence change now sits on the run-creation path.
- Independent Architecture Review required: `Yes`. Requirements unchanged; the user's design approval stands. SR-009 changes where one fact is stored, not intended behavior.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved constraint at stake: Data Continuity, "older builds keep reading data written by this build (they may ignore the new record)".
  - E-041 confirms that SR-008's index-row key broke it. With the key present, a rollback build reads an empty Agent and Team history index and writes it back on the next run creation. That loses earlier rows from the index.
  - `RELEASE.md` § Rollback does not require rollback compatibility in general. This ticket's requirement is stricter, and SR-009 meets it without any compatibility code (no dual writes or version branches). So it is consistent with DESIGN rule 9 and RELEASE.md.
- **Reviewer correction:** my ARCH-REV-001/002 Persisted-Data verdict checked the metadata reader and the Team tree reader but not the two index stores, and passed a decision that was wrong for them. Recorded in ARCH-REV-003.

| Behavior ID | Kind | Alignment | Trigger / Evidence | Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (unchanged from ARCH-REV-002) | Confirmed | — |
| BEH-002 | User/System | Pass | Pass | Pass. DS-001 and DS-002 record the start before the run's records; DS-005 reads the Project by run identity | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (unchanged) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass. A deleted run's entry is skipped by the catalog join | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `code-review-report.md` (CRR-001) | Pass | Pass | Pass | Pass (CR-001 is answered by SR-009; CR-002 stays a Local Fix) | Pass | — |
| `docs/design-cases.md` Case 14 | Pass | Pass | Pass | Pass | Pass | — |
| Product spec + VIS | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

All four rows `Pass`. The `agent-run-history-row-projector.ts` extraction stays as a size refactor with unchanged keys. No new structural trigger fires: Projects already owns every Project ↔ run record (Task run resources), and the new file is that owner's sibling record.

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass (provisioning drives: allocate id → `recordStart` → metadata → `recordPreparedRun`) | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Pass (`AgentTeamRunManager.createTeamRun` inside `withRootTransition`: `recordStart` → tree → row) | Pass | Pass |
| DS-003 | Primary | Pass | Pass | Pass | Pass | Pass (`startedRunsOf(P)` joined with the catalog rows) | Pass | Pass |
| DS-004 | Return-Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Primary | Pass | Pass | Pass | Pass | Pass (`contextOfRun({kind, runId})`; Team members by team run id) | Pass | Pass |
| DS-006, DS-007 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Public Entry | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectRunService` (only writer of `project_runs.json`) | Pass | Pass (`ProjectRunStore` internal) | Pass (run creation reaches it only through `RunProjectStarts`) | Pass | — |
| `RunProjectStarts` / `RunProjectContextReader` (agent-execution ports) | Pass | Pass | Pass | Pass | Bound in `compositions/` |
| `ProjectRunLinks` (`runLinksOf`, `startedRunsOf`) | Pass | Pass | Pass | Pass | — |
| `ProjectRunHistoryService`, `projectRunsStore` / `projectRunsProjection` | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. Run-history, agent-execution and agent-team-execution reach Projects only through the ports. Projects never writes run records, and run creation writes Projects files only through `RunProjectStarts`.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RunProjectStarts.recordStart(projectId, root)` | Pass | Pass | Pass (explicit `{kind: agent \| agent_team, runId}`) | Low | Pass |
| `RunProjectContextReader.contextOfRun(root)` | Pass | Pass | Pass | Low | Pass |
| `ProjectRunLinks.startedRunsOf(projectId)` | Pass | Pass | Pass | Low | Pass |
| `projectRunHistory`, run inputs, `runLinksOf` | Pass | Pass | Pass | Low | Pass (unchanged) |

## Existing Capability / Subsystem Reuse Verdict

`Pass`. The new file reuses the Projects layout path owner, the per-file lock and the atomic temp-file-plus-rename writer used for Task files (server projects.md § Reading and writing). It also reuses the "link before resources" order of Task links (E-024).

## Subsystem / Capability-Area Allocation Verdict

`Pass`. The record belongs in Projects. Run-history keeps only the read and the join, and no longer changes any record.

## Reusable Owned Structures Verdict

`Pass`. `projects/domain/project-runs.ts` holds the entry type and the append rule. The other structures are unchanged.

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict |
| --- | --- | --- | --- | --- | --- |
| `project_runs.json` `{projectId, runs: [{root, linkedAt}]}` | Pass | Pass | Pass (at most one Project file per run; run records hold no copy) | N/A | Pass |
| `ProjectRunHistory.scopes[]` | Pass | Pass | Pass | N/A | Pass |

- Derived consumers listed (Principle 11): `Pass` (the Project-runs read, restore config, Team members, run copy, run delete, Project delete).
- One vocabulary (Principle 15): `Pass` ("started under a Project" = an entry in the Project's `project_runs.json`).

## File Responsibility Mapping Verdict

`Pass`. Run metadata, index record types, the Team tree schema and builder, and the Team row projector are explicitly unchanged. The Projects store, domain and service files each own one concern.

## Subsystem / Folder / File Placement Verdict

`Pass`. `projects/stores/project-run-store.ts`, `projects/domain/project-runs.ts` and `projects/services/project-run-service.ts` sit beside the Task run-resource files. The ports are in `agent-execution/domain/run-project-context.ts` and `run-history/domain/project-run-links.ts`.

## Removal / Decommission Completeness Verdict

`Pass`. IR-001's unreleased `projectId` keys on run metadata, index rows and the Team tree are in the removal plan, to be reverted before API/E2E. Earlier items are unchanged.

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Run-history files | No | Pass | Pass | The rejected alternative (keys plus a second index for older readers) is logged |
| `project_runs.json` | No | Pass | Pass | Additive file; no version branches |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run metadata, Agent/Team index rows, Team trees | Not Affected (unchanged) | Pass (E-041: the strict index readers are why) | Pass | N/A | Pass | Rollback-shape test planned: the base build reads this build's index rows |
| `projects/<projectId>/project_runs.json` (new) | Not Affected for existing data; additive file | Pass. Released Projects code lists Project folders as directories and reads `project.json`, `drafts/` and `tasks/*` only; Project Delete keeps other files (E-042, projects.md § Delete, `project-store.ts` 71, 156) | Pass | N/A | Pass | Tolerant reader (invalid entry skipped and logged; unreadable file affects that Project only, DESIGN rule 7); exact writer; lock; atomic write |

## Change / Refactor Sequence Verdict

`Pass`. Step 2 now covers the store, the service, the ports, the binding, the record step in Agent and Team creation, and the IR-001 revert with reader/writer and rollback-shape tests. After the pass, implementation applies SR-009 with CR-002, and the code reviewer re-reviews before API/E2E.

## Example Adequacy Verdict

`Pass`. The file shape, the call order and the orphan-entry behavior are stated concretely.

## Material Premise Validation

### MP-003 — An older build runs on this build's data (rollback)

- Related contract: requirements § Data Continuity ("older builds keep reading data written by this build"); `RELEASE.md` § Rollback (a revert release or a pinned earlier Docker tag).
- Initiating basis kind: Operational / Contract. Trigger: the user installs a revert release or pins an earlier Docker tag.
- Forward path in SR-008: the older build's `AgentRunHistoryIndexStore.readIndexFile` → `parseIndexFile` finds `projectId` outside `allowedRowKeys` → `null` → empty index → the next run creation writes it back.
- Consequence: history listing empty; earlier rows dropped from the index.
- Reachability: `Reachable`.
- Review consequence: the SR-009 relocation removes the premise. No file an older build reads strictly gains a key.

MP-001 and MP-002 are unchanged and covered (see ARCH-REV-002).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`), to apply SR-009 and CR-002. The code reviewer re-reviews before API/E2E. The Solution Designer gets an informational notification.

## Residual Risks

Guidance for implementation.

- **Load order.** Load `ProjectRunService`'s view in the same composition step that loads the Task run resources, before roots are admitted or restored. Otherwise a restore could build its config before the view exists and omit the `Project` section. Follow the `composeProjectTaskExecutionResources` pattern (`await load()` before the port is returned).
- **Orphan entries.** A creation that fails after `recordStart`, or a prepared run that expires, leaves an entry with no run. The catalog join skips it and `contextOfRun` is never asked for it. No cleanup is needed; cover it with one test.
- **Rollback check.** Verify on a real data copy: start a run under a Project with this build, then confirm the base build lists the Agent and Team history unchanged.
- Carried from ARCH-REV-002:
  - Project-keyed builder inputs.
  - The multi-Project copy's Task line.
  - The stale "per expanded Project" wording in Key Tradeoffs.
  - Composer coverage including `grok_build`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-003 Reachable, removed by SR-009)
- Notes: ARCH-REV-003 passes SR-009. task_size Large / architectural_risk High. The reviewer's earlier miss on the index readers is recorded in ARCH-REV-003.
