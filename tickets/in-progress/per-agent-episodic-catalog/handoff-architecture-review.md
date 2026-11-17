# Handoff: Architecture Design Complete → Architecture Review

- Package: `per-agent-episodic-catalog` (Project Task autobyteus-493, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), team run `software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Date: 2026-11-17
- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`
- Current SR: SR-001
- Route applied: handoff rule "Large or High → `/architecture_reviewer`" (from `get_handoff_rules`, 2026-11-17)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`
- Branch: `codex/per-agent-episodic-catalog` (created from `origin/personal` at `2b73308ce57286a203f0f5a341b4f47d9275c78e`); ticket documents are uncommitted in the worktree
- Finalization target: `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/`

## Original request and direction (summary)

The founder wants, per agent definition, an episodic folder `memory/episodic/<encoded definition id>/` (named like the semantic folder) holding a system-maintained catalog of all that agent's runs on the node in time order, pointing to the runs' Work Journal folders, kept current whenever a journal is created or changed. Option A decided; option B (moving journals) not wanted now. Per run: start time, run id, where it ran, a short summary with no quotes of his conversations, state, journal paths. Settle archive/delete behavior; incremental upkeep and a one-time build that touches nothing in run folders; privacy rule. Then build with tests and a real-app proof on an isolated instance; his data is only read; his approval and a backup before anything writes beside his real data (the first build on his node); release only on his word. The full text is in the Task (read with `get_project_task`).

## Approval basis

- Requirements: `Approved` by the Solution Designer within the founder's direction; the user was informed in the Solution Designer's conversation on 2026-11-17 (SR-001), decisions DEC-001…DEC-012 in the requirements doc.
- Design user approval: not required (direction decided by the founder; his gates are delivery gates).

## Documents

- `requirements-doc.md` — approved requirements, scope guardrail, decisions
- `investigation-notes.md` — evidence (code, read-only data survey, cost probe), option B comparison (INV-B)
- `design-spec.md` — the design (spines DS-001…004, `EpisodicCatalog` subsystem, discovery move, journal spans, archive/delete notification, file formats, sequence)
- `solution-revision-record.md` — SR-001
- `follow-ups.md` — FU-001 (consumers learn the path), FU-002 (old ids / unattributed folders)

## Points for the reviewer's attention

1. Discovery moves from `memory-search/runs/` to `agent-memory/services/run-folder-discovery.ts` and gains `findRunsOfRoot`, `rootOf` and catalog facts (`DiscoveredRun`); memory search maps to its unchanged `MemoryRun`.
2. Archive/delete reach the catalog through `rootRunChanged(root)` calls in three run services (narrowed `Pick`), the catalog refreshing the root from records.
3. Privacy rule lives in one place (the entry builder); the run-history `summary` is excluded because it is the user's first message verbatim (INV-D3).
4. The catalog never renders journals and writes only under `<memory>/episodic/`.
5. Measured full read on the founder's node: 6.6–12.6 s (Python probe); Node timing to be measured on an APFS clone (AC-010).

## Open risks

- First-build time in Node (AC-010; escalation trigger at 2 minutes).
- The Task shown is the root's current Task.

## Next expected action

Independent architecture review of the package against the approved requirements.

---

## SR-002 resubmission (2026-11-17)

- Result: `Architecture Design Complete`, `task_size=Large`, `architectural_risk=High`. Route: handoff rule "Large or High → `/architecture_reviewer`".
- Basis: requirements Approved at SR-002. The user directed the slimmer entry ("think from the agent's perspective … remove those redundant ones"). The Solution Designer decided DEC-013 and the review-driven refinements, and informed the user.

### What changed in requirements (user-directed)

- Entry fields:
  - kept: start → last activity, run id, Task title (when any), workspace, journal folder and files (name, time range, size);
  - removed: where/context, delegation, node, runtime, state, Task key, open/closed (AC-013 is new).
- Archive leaves the catalog unchanged; delete removes entries.
- One `catalog.md`, with no JSON copy and no "updated" time. Unchanged files are not rewritten.
- The overview drops the unattributed count.

### How each finding is resolved

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 | Option (b): REQ-007, REQ-010, AC-007 and QR-002 revised. The start pass reuses one `findRuns()`, with records read once. It renders every definition found in discovery or as an existing `episodic/` folder; an agent with no runs left gets an empty catalog. The store writes only files whose content changed. No stored state. | requirements-doc; design-spec DS-003, Ownership Map (store) |
| AR-002 | Construction order in both composition roots (studio and standalone application host):<br>1. The catalog is created after steps 1–2.<br>2. It is passed to `createGeneralProcessRunSupervisor` (→ `AgentOrgRunService`, `TeamRunHistoryService`) and to `composeCollaboration` (→ `AgentRunHistoryService`) as a required collaborator.<br>3. `start({ taskTitles })` runs right after `composeCollaboration`.<br>4. `stop()` runs at close.<br>There is no loader, no singleton and no node id. The one after-construction collaborator is recorded under Principle 16. | design-spec Dependency Rules, Task Design Health (Hidden dependency), File Mapping |
| AR-003 | `DelegationIndex.currentTaskOf(execution)` (any role) → `ProjectTaskService.taskTitleOf(taskId)` (new; title only, never the description). `currentTasksOfTaskWorkers` is not used. REQ-004 states "any role". | design-spec Current-State Read, attribution/Task section; requirements REQ-004 |
| AR-004 | The attribution table matches today: every `agents/<id>` folder is `AGENT`, with the definition id from metadata, else the row, else null. `root` is non-null. Uncatalogued means `agentDefinitionId` null. The `MemoryRun` mapping reproduces today exactly. | design-spec Shared Structure, Discovery attribution rules |
| AR-005 | "A refresh pass starts 5 s after the most recently queued request, and at most 30 s after the oldest queued request." | design-spec Bounded Local Spine |
| AR-006 | `folderRun`, `runKeyOf` and `nameFromFolder` become private or unexported; `folderRun` is dropped from the pipeline's `Pick`. | design-spec Removal Plan |

Reviewer suggestions adopted: the header's agent name is the newest run's.
