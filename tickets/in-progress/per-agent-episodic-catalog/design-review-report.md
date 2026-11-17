# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `…/per-agent-episodic-catalog/investigation-notes.md`
- Upstream Solution Revision Record: `…/per-agent-episodic-catalog/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/per-agent-episodic-catalog/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001, FU-002); `handoff-architecture-review.md` (SR-002 section); `episodic-catalog-contract.md` (behavior-defining, SR-002 addendum, reviewed in round 3)
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `…/per-agent-episodic-catalog/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: the contract corrected for AR-007; N-5 adopted in the contract §2.2 and design-spec `CatalogEntry`
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Fail`, scoped to the contract)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: worktree `codex/per-agent-episodic-catalog` at `2b73308ce5`. Round 1 files, re-opened where SR-002 relies on them: `build-studio-server.ts:108-121, 330-376`; `start-standalone-application-host.ts:114-129, 243-279, 316-336`; `general-process-run-supervisor.ts:317, 353`; `collaboration-composition.ts:80-120, 160, 264`; `delegation-index.ts:242-251`; `task-execution-resource-port.ts:16, 62-75`; `project-task-service.ts:113-114, 262-271`; `memory-search/domain/memory-search-models.ts:1-27`; `api/graphql/types/memory-search.ts:5, 179`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: SR-002 still adds a new subsystem, moves discovery across subsystems, adds derived persisted files beside user data, a privacy boundary and a background lifecycle, and changes two composition roots and two composition steps (about 15 files across seven subsystems).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: SR-002 changes the approved behavior.
  - An entry is exactly: start → last activity, run id, Task title (when any), workspace, journal folder and files (name, time range, size) (DEC-013, AC-013).
  - Archive leaves the catalog unchanged; delete removes entries (REQ-006).
  - There is one `catalog.md`, with no JSON copy and no "updated" time; a file is written only when its content changes (REQ-003, REQ-010).
  - Catalogs are rebuilt at every start, with records read once (REQ-007, AC-007).
  - The Task title comes from the run's current Task, in any role (REQ-004).
  - The overview drops the unattributed count (REQ-009).
  - The user directed these changes, and the Solution Designer recorded the approval (requirements header, SR-002). Technical review does not reopen them.
- Relevant existing behavior and evidence confirmed: yes. The cited lines were re-opened; see Meta.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A (none remain).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on, checked at their cited lines:
  - Both composition roots run steps 1–2, step 3 and steps 4–8 in that order: confirmed.
  - `ProjectTaskService` is created in step 4 (`collaboration-composition.ts:160`): confirmed.
  - `DelegationIndex.currentTaskOf` covers any role, newest open entry else newest entry: confirmed (`delegation-index.ts:247-251`).
  - A Task entry holds `taskId` but no title: confirmed (`task-execution-resource-port.ts:62-75`).
  - The standalone host has its own app-data folder and its own close path: confirmed (`start-standalone-application-host.ts:114, 316-336`).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass | Pass (`runDeleted` after a successful delete in the three services; archive untouched) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (one `findRuns()`, existing folders listed, write-if-changed) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass (`currentTaskOf` → `taskTitleOf`, title only) | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Pass | Pass | Pass | Pass (FU-002's "counted" wording predates SR-002 dropping the count; harmless) | Pass | — |
| `episodic-catalog-contract.md` | Pass | Pass (linked from requirements-doc:14, :175; investigation-notes:147; design-spec:7, :71; solution-revision-record:61) | Pass (§2.3: one rule, as discovery reports it; examples match) | Pass (files, write rules, entry fields, privacy, index, events match the reviewed design and REQ-001…004, 009, 010; design-spec `startedAt` is nullable, contract §2.2) | Pass | — (AR-007 resolved) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | Discovery placement (INV-C4) | — |
| Refactor decision explicit | Pass | Move discovery now | — |
| Refactor decision reflected in design sections | Pass | File mapping, removal plan (AR-006 resolved), sequence step 2 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | journal change → catalog | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | delete → entries dropped | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | composition root → start pass | Pass | Pass | Pass (no loader; the root owns the lifecycle) | Pass | Pass | Pass | Pass |
| DS-004 | bounded refresh | Pass | Pass (timer in one sentence) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `EpisodicCatalog` | Pass | Pass | Pass | Pass | `start({ taskTitles })` / `runDeleted` / `stop` |
| `RunFolderDiscovery` | Pass | Pass | Pass | Pass | — |
| `WorkJournalService` | Pass | Pass | Pass | Pass | — |
| `CatalogEntryBuilder` (privacy) | Pass | Pass | Pass | Pass | `taskTitleOf` returns only the title, so the description never reaches the catalog |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-episodic-catalog` → agent-memory, agent-work-journal, agent-collaboration (`Pick<DelegationIndex,"currentTaskOf">`), projects (`Pick<ProjectTaskService,"taskTitleOf">`) | Pass | Pass | Pass | Pass | — |
| `agent-memory` (discovery) → run-history, agent-org-execution | Pass | Pass | Pass | Pass | Already the existing direction |
| run services → catalog (`Pick<…,"runDeleted">`) | Pass | Pass | Pass | Pass | A notification; required constructor collaborator |
| `DiscoveredRun.subject` type location | Pass | Pass | Pass | Pass | See Residual Risks, note N-1 |

Owners receive their collaborators from the composition root, and no lookup hides a missing collaborator (Principle 16): `Pass — deviation recorded, reason holds` (design-spec, Task Design Health → Hidden dependency).
- `taskTitles` is supplied at `start()`, the call that begins every refresh, so nothing can use it earlier.
- A missing argument is a type error, and a second `start()` throws.
- It hides no cycle: the Task service does not depend on the catalog.
- `runDeleted` before `start` has nothing to drop.
- `getWorkJournalService()` is the existing process instance, passed in.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `EpisodicCatalog.start / runDeleted / stop` | Pass | Pass | Pass | Low | Pass |
| `ProjectTaskService.taskTitleOf(taskId)` | Pass | Pass | Pass (long Task id) | Low | Pass |
| `EpisodicCatalogStore.listCatalogFolders / writeIfChanged` | Pass | Pass | Pass | Low | Pass |
| `RunFolderDiscovery.findRuns / findRunsOfRoot / rootOf` | Pass | Pass | Pass | Low | Pass |
| `WorkJournalService.readJournalSpans` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. No port or wrapper is added.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Run attribution | Pass | Pass | N/A | Pass | — |
| Journal events / spans | Pass | Pass | N/A | Pass | — |
| Task of a run | Pass | Pass | Pass (`taskTitleOf` beside `taskKeyOf`) | Pass | AR-003 resolved |
| Catalog upkeep | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-episodic-catalog/` | Pass | Pass | Pass | Pass | — |
| `agent-memory/` | Pass | Pass | Pass | Pass | — |
| Composition roots and steps (studio, standalone host, supervisor, `composeCollaboration`) | Pass | Pass | Pass | Pass | AR-002 resolved; the order is listed step by step |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `DiscoveredRun` | Pass | Pass | Pass | Pass | Note N-1 |
| Definition-folder encoding | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DiscoveredRun` | Pass | Pass | Pass | N/A | Pass | `root` is non-null; uncatalogued means `agentDefinitionId` null (AR-004 resolved). For `AGENT` runs, `subject.agentDefinitionId` repeats the top-level value; both are set from one value in one place (N-1) |
| `CatalogEntry` (in memory) | Pass | Pass | Pass | N/A | Pass | Matches DEC-013 |

Derived consumers listed with a decision for each: `Pass`. `MemoryRun` reproduces today exactly, pinned by the moved test that includes `agents/<id>` with no record → `AGENT`, null.

One vocabulary (Principle 15): `Pass`. `runDeleted` has the same meaning as `DelegationIndex.runDeleted`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog subsystem files | Pass | Pass | Pass | Pass | — |
| `run-folder-discovery.ts`, `discovered-run.ts` | Pass | Pass | Pass | Pass | N-1 |
| `project-task-service.ts` (+ `taskTitleOf`) | Pass | Pass | N/A | Pass | — |
| Composition roots and steps | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-episodic-catalog/…` | Pass | Pass | Low | Pass | — |
| `src/agent-memory/services/run-folder-discovery.ts` | Pass | Pass | Low | Pass | — |
| Startup loader | N/A | N/A | — | Pass | Removed in SR-002 |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-search/runs/memory-run-discovery.ts` | Pass | Pass | Pass | Pass | — |
| `folderRun`, `runKeyOf`, `nameFromFolder`; `folderRun` in the pipeline's `Pick` | Pass | Pass | Pass | Pass | AR-006 resolved |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Discovery move | No | Pass | Pass | No re-export |
| Old id forms | No | Pass | Pass | DEC-006, FU-002 |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<memory>/episodic/**` | Discard or Rebuild | Pass | Pass | N/A | Pass | Rebuilt at each start; no stored state of its own |
| Every existing memory file | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Files, catalog.md, index.md | Yes | Pass | Pass | Pass | — |
| Attribution rules | Yes | Pass | N/A | Pass | Matches today |
| Composition order | Yes | Pass | N/A | Pass | Six numbered steps |
| Task title | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### MP-001 — A run whose Task records name a Task, but which is not the Task's latest `assigned` root (from ARCH-REV-001)

- Reachability: `Reachable` (unchanged evidence: `task-execution-resource-service.ts:102-110, 242-248`).
- Review consequence: resolved. SR-002 uses `DelegationIndex.currentTaskOf` (any role), and REQ-004 now says "in any role".

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The design passed in ARCH-REV-002, and its behavior-defining contract (`episodic-catalog-contract.md`) is now internally consistent and agrees with it. The package is ready for implementation.

## Findings

AR-001…AR-006 are resolved (ARCH-REV-002).

AR-007 is resolved (ARCH-REV-004). §2.3 now has one rule: the newest run's `agentName` exactly as `RunFolderDiscovery` reports it (row name, else definition id, else folder-derived name; for members, the address basename), or the decoded definition id when there are no runs. §2.5 and §3 use `solution_designer` and `Project Task Manager`, which match `memory-run-discovery.ts:34, 99, 114, 136`.

No findings are open.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`), with the contract as part of the package; informational notice to the Solution Designer.

## Residual Risks

These are implementation notes, not findings. Each follows from the design's own rules.

- **N-1. Where the `subject` type lives.**
  - The SR-002 `DiscoveredRun` is "the facts discovery produces today for `MemoryRun` (… `subject`) plus `root`, `agentDefinitionId`, `recordedStartAt`". The `subject` type, `MemoryRunSubject`, lives today in `memory-search/domain/memory-search-models.ts:3-9` and is imported by `api/graphql/types/memory-search.ts:5`.
  - Under the design's dependency rule (the catalog never depends on memory search; memory search → agent-memory), `agent-memory/domain/discovered-run.ts` must not import from memory search. The subject classification is computed by discovery, so its type moves to agent-memory with discovery, and memory search and its GraphQL type import it from there, with no re-export.
  - For `AGENT` runs, set `subject.agentDefinitionId` and the top-level `agentDefinitionId` from one value.
- **N-2.** Settled by contract §2.3: a catalog with no runs uses its decoded definition id.
- **N-5. Contract-driven details for implementation** (consistent with the design; the design defers to the contract):
  - `CatalogEntry.startedAt` is nullable for the `start unknown` heading (adopted in the design spec).
  - A same-day header range is written with the full date on both sides of a file line (adopted in contract §2.2).
  - The journal folder path is written without a trailing separator.
  - The design spec's `index.md` example lists `solution_designer` before `Project Task Manager`, against contract §3's order by agent name. The contract wins (design-spec:7), so implement and test the contract's order.
- **N-3. Start-build time in Node** (AC-010; escalation at 2 minutes).
- **N-4. The Task title is the root's current Task.** A root that worked on several Tasks shows only one. This is accepted in the design's Risks.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: the ARCH-REV-002 design pass stands, and the SR-002 contract addendum is confirmed. The contract is the authority for `CatalogMarkdownRenderer`, `CatalogEntryBuilder` attributes and the store's write rules, and the renderer tests compare against its examples.
