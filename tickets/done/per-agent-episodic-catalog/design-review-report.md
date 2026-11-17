# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `…/per-agent-episodic-catalog/investigation-notes.md`
- Upstream Solution Revision Record: `…/per-agent-episodic-catalog/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `…/per-agent-episodic-catalog/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001, FU-002); `handoff-architecture-review.md` (SR-002 section); `episodic-catalog-contract.md` (behavior-defining, SR-002 addendum, reviewed in round 3)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `…/per-agent-episodic-catalog/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: SR-003, a design-only revision after CRR-002 CR-001 (Design Impact; API-09/EC-06, API-15). The design spec's section "SR-003 Revision" governs. Requirements and the contract are unchanged.
- Prior Review Round Reviewed: 4 (ARCH-REV-004, `Pass`)
- Latest Authoritative Round: 5
- SR-003 evidence opened (implemented branch at `4e8a8b3263`):
  - `run-history/services/team-run-package-catalog.ts:22-25` (`getDiagnostics`: root id → `code: reason`);
  - `run-history/services/agent-org-run-package-catalog.ts:22-24` (`listDiagnostics`);
  - `run-history/services/root-run-package-readiness-index.ts:35-46, 79-97` (shared per-memory-folder state; a whole-scan failure is filed as `agent_team`/`*` and logged at `:88`);
  - `run-history/store/agent-run-metadata-store.ts:96-126` (`readMetadataState` does not log; `readMetadata` does);
  - `agent-work-journal/store/work-journal-store.ts:84-96, 100-113` (`readManifestJournalFileNames` returns null for absent and unreadable alike; `writeManifest` is atomic);
  - `agent-work-journal/services/work-journal-service.ts:125-132` (its only caller);
  - `agent-episodic-catalog/services/episodic-catalog.ts:175-190` (`agentDefinitionId === null` skip);
  - `agent-memory/services/run-folder-discovery.ts:28-106, 172`;
  - `code-review-report.md` CRR-002 CR-001; `follow-ups.md` FU-004.
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

## SR-003 Delta Review (round 5)

Only the SR-003 delta changes; the verdicts above stand for everything else.

- **Behavior basis:** REQ-012 and AC-009 ("a run's records are damaged → left out with a warning naming it") are approved and unchanged. CRR-002 traced the failure in code and EC-06 reproduced it. The delta realizes approved behavior and adds no new behavior. Confirmed.
- **Spines:**
  - DS-003 / DS-004: `findRuns` / `findRunsOfRoot` → per folder an explicit `attribution` → the catalog switches on its kind (`attributed` → entry; `unattributed` → silent, DEC-007; `unreadable` → left out, already warned by discovery).
  - For each attributed run, `readJournalSpans` returns `none` (no journal yet), `unreadable` (left out, `EPISODIC_CATALOG_RUN_LEFT_OUT`) or `spans`.
  - One owner warns for each fact: discovery for records, the catalog for the manifest. Pass.
- **Principle 13 (behavior by absence):** resolved. "Unreadable" and "unattributed" no longer collapse into one `null`, so the outcome REQ-012 names comes from an explicit rule. Pass.
- **Principle 11 (tightness):** `attribution` replaces `agentDefinitionId` as a clean cut. Memory search's `AGENT.subject.agentDefinitionId` is derived from it (the attributed id, else null), one source. Pass.
- **Ownership and placement:**
  - Discovery is the scan that leaves runs out, so it is the boundary DESIGN.md rule 7 names. It reads the reasons the admission index already owns, through narrowed `Pick`s of the two package catalogs; it does not add a second validator.
  - The journal store keeps manifest parsing. The change is confined to `readManifestJournalFileNames`, whose only caller is `readJournalSpans` (`work-journal-service.ts:127`); `readManifest` and its four callers are untouched.
  - Pass.
- **Dependencies:** agent-memory → run-history (package catalogs) follows the existing direction. The collaborators are defaulted exactly as the existing location services and metadata store are. That is not behavior by absence, because each default is the real owner; it matches the existing constructor (`run-folder-discovery.ts:66-71`). Pass.
- **Log-once state:**
  - A per-instance set of `(root, record, reason)`, and a per-catalog set of `(run, reason)`. Its purpose: live refreshes of a damaged root would otherwise warn on every journal change. The state is bounded by the number of damaged roots and has no lifecycle beyond the instance.
  - A changed reason logs again; a start logs again, as the rule-7 operator signal intends.
  - Proportionate. Pass.
- **Persisted data:** no change; `Not Affected`. Pass.
- **Scope:** FU-004 (the admission index's own silence toward the history lists) stays a follow-up, which is correct. The catalog meets REQ-012 within its Change Scope.

### Material premise

#### MP-002 — One run's stored record (team tree, org tree, standalone `run_metadata.json`) or journal manifest cannot be read

- Related approved requirement: REQ-012, AC-009 (explicit), DESIGN.md rule 7.
- Initiating basis kind: `Contract`. The approved requirement names the damaged-record case explicitly, so it is a `Supported Explicit Edge Scenario` (CRR-002).
- Forward path: start or refresh → `listAgents` skips the non-admitted root (`team-run-execution-tree-location-service.ts:86`) → the member folder falls to the folder rule → the catalog skip (`episodic-catalog.ts:181`). Reproduced by EC-06 run 9.
- Reachability: `Reachable`. Consequence: SR-003's machinery is required and proportionate.

#### MP-003 — The whole admission scan fails (`*`)

- Basis: infrastructure failure (`validator.scan()` throws). It is not one run's damaged record, and the index already logs it (`root-run-package-readiness-index.ts:83-89`).
- Reachability: `Not Reachable` as a supported AC-009 scenario (Principle 6: infrastructure failure is out of scope by default).
- Consequence: the design's `*` clause adds no machinery beyond one map key and drives no finding. Note N-6 records that it can only match for teams.

## Review Decision

`Pass`. SR-003 resolves CRR-002 CR-001 within the approved requirements, and the design stays ready for implementation.

## Findings

None open. AR-001…AR-007 are resolved (ARCH-REV-002, ARCH-REV-004). SR-003 raises no new finding.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`), for SR-003; informational notice to the Solution Designer.

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
- **N-6 (SR-003): the `*` whole-scan diagnostic.** The readiness index files a whole-scan failure only as `agent_team` / `*` (`root-run-package-readiness-index.ts:85`), so `AgentOrgRunPackageCatalog.listDiagnostics()` never contains `*`.
  - Do not write an org `*` branch: it would be dead code.
  - On such a failure, org member folders become `unattributed`, but the index's own warning (`:88`) still marks the event.
  - The team `*` mapping is acceptable as designed (MP-003).
- **N-7 (SR-003): read the diagnostics only after the shared readiness index is ready.** `listAgents` awaits it (`team-run-execution-tree-location-service.ts:81`), and the diagnostics share that per-memory-folder state (`root-run-package-readiness-index.ts`, `states`). So consult them after the team or org source has run, in the same `discover` call, not before.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-005, SR-003)
- Material-Premise Gate: `Pass` (MP-002 Reachable, a supported explicit edge; MP-003 Not Reachable, so no machinery depends on it)
- Notes: SR-003 makes "unreadable" an explicit outcome with one warning owner for each fact (discovery for records, the catalog for manifests). It keeps memory search's mapping and the contract unchanged, and leaves the admission index's own silence to FU-004.
