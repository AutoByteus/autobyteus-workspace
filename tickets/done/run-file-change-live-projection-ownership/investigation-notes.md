# Investigation Notes

## Investigation Meta

- Package identifier: `run-file-change-live-projection-ownership`
- Request / ticket: Artifacts created after the first one by an active agent show "File not found — deleted or moved" although the files exist.
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership` / `codex/run-file-change-live-projection-ownership`
- Resolved base remote / branch / revision: `origin/personal` @ `5c74fed71` (fetched 2026-10-06)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Investigation status: Complete for requirements and architecture.

## Initial Request And Clarifications

- Original request (2026-10-06, user): "the content creator used generate image to create image, only the first image i could see, the other images after the first show as artifact deleted or something. i am not sure whether its a bug or the file is really moved. please investigate."
- Clarifications received:
  - User: "since you found the bug, please work on the ticket now. the requirement is clear." (requirements approval reference, see requirements-doc).
  - User: "make sure check whether this is a design issue or not does it need some refactoring" (explicit design-health assessment request).
- User-supplied facts: three screenshots of the `marketing_content_creator` Artifacts tab (Marketing Team run, agy runtime): `workspace_vs_task_hierarchy_…jpg` renders; `light_concept_transition_…jpg` shows "File not found. This file has been deleted from the workspace or moved to a different location."
- Initial ambiguity: whether the file was really moved/deleted (resolved: it was not).

## Product And Domain Understanding

- Product area: Agent Artifacts tab (run file changes: produced/edited files and generated media).
- Affected actors or systems: any user viewing artifacts of an **active** run (standalone agent or team member); the server's run-file-change read path (GraphQL `getRunFileChanges`, REST `/runs/:runId/file-change-content`).
- Existing purpose: show and preview files an agent produced during a run, live and historically.
- Terminology: *projection* = per-run list of file-change entries (`file_changes.json` on disk, plus in-memory live copy).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | Runtime | `find /root/.gemini/antigravity-cli/brain -iname "*light_concept*" -o -iname "*workspace_vs_task*"` | Did the files move? | All three images exist in `brain/47b26f69-…/` (created 05:01:26, 05:02:20, 05:02:42 UTC). | None |
| 2026-10-06 | Data | `/home/autobyteus/data/memory/agent_teams/marketing_team_94a61bec…/marketing_content_creator_e02994da…/file_changes.json` | Are entries recorded? | All three entries exist, correct absolute paths, `status: available`, `sourceTool: generated_output`. | None |
| 2026-10-06 | Command | `curl http://localhost:8000/rest/runs/<runId>/file-change-content?path=<each image>` | Reproduce | Image 1 → `200` (533279 bytes). Images 2, 3 → `404 {"detail":"File change not found"}` (entry lookup failed, not file-existence). | Root-cause in reader |
| 2026-10-06 | Runtime | `/home/autobyteus/data/logs/server.log` (level-40 request logs) | Timeline | 404s for images 2/3 from 05:02:20 continuously through 05:04:37+, sub-millisecond, i.e. stale and permanent while the run stays active. 200s are not logged. | — |
| 2026-10-06 | Code | `src/api/rest/run-file-changes.ts` | Endpoint semantics | 404 "File change not found" = `projectionService.resolveEntry()` returned null; 404 "content is not available" = entry found but file missing. | — |
| 2026-10-06 | Code | `src/run-history/services/run-file-change-projection-service.ts` | Reader path | Active standalone → `this.changes.getProjectionForRun(run)`; active collaboration member → `this.changes.getProjectionForCollaborationMember(...)`; inactive → fresh disk read. `this.changes` = module singleton `getRunFileChangeService()`. | — |
| 2026-10-06 | Code | `src/services/run-file-changes/run-file-change-service.ts` | Cache semantics | `load()` caches any runId on first read in `projections` map, never invalidated except via `attachToRun` unsubscribe. Only `handle()` (event path of attached runs) updates the cache. | — |
| 2026-10-06 | Code | `grep -rn "new RunFileChangeService\|getRunFileChangeService()\|attachToRun("` | Who writes? | Writers: `general-process-run-supervisor.ts:186` (`new RunFileChangeService({workspaceManager})` into `AgentRunResourceManager`) and `application-execution-scope-kernel-builder.ts:90` (per application scope). The singleton `getRunFileChangeService()` is used **only** by `RunFileChangeProjectionService`; nothing attaches runs to it. | Ownership split |
| 2026-10-06 | Command | `git show 8704f2653` ("refactor(agent): close execution family composition", 2026-08-26); `git show ae5a1c7bc` (2026-08-22) | Origin | Previously `AgentRunManager` defaulted to `options.runFileChangeService ?? getRunFileChangeService()` (writer = singleton = reader). Composition refactors switched the writer to explicitly constructed instances; the reader kept the singleton. | Regression origin |
| 2026-10-06 | Doc | `docs/features/artifact_file_serving_design.md` §Reference flow; `docs/modules/run_history.md` (~L770); `docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Intended design | One `RunFileChangeService` consumes `FILE_CHANGE` and updates the run projection; frontend hydrates via `getRunFileChanges(runId)` and previews via `/file-change-content`. | Design authority |
| 2026-10-06 | Code | `src/api/graphql/types/run-file-changes.ts:39` | Other reader | GraphQL `getRunFileChanges` uses the same projection service → same stale cache (list hydration for active runs can also miss entries after reload/reopen). | Same fix covers it |
| 2026-10-06 | Code | `src/agent-execution/services/agent-run-service.ts:326-350` | Repo pattern | Process-scoped services use `bindProcessX` / `releaseProcessX` / `getX` (throws if unbound), bound/released in `general-process-run-supervisor.ts`. | Follow pattern |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Agent of an **active** run produces file/media N ≥ 2 after the user (or UI) has already read the run's artifacts once | Live `FILE_CHANGE` event → Artifacts row appears → viewer fetches `/file-change-content` | Row visible but preview shows "File not found … deleted or moved"; persists until run deactivates or server restarts | curl reproduction; server.log 404s | High |
| BEH-002 | User | Reopen/reload Artifacts of an active run (`getRunFileChanges`) after first read | GraphQL list from same stale cache | Entries added after first read are missing from hydrated list | Code path (same cache); not separately reproduced | Medium (code-evident) |
| BEH-003 | User | Artifacts of an **inactive** (historical) run | Fresh disk read of `file_changes.json` | Correct | Code | High |
| BEH-004 | System | Writer persists projection on each change | `handle()` → `writeProjection` atomic temp+rename; strips transient `content` | Correct, unaffected | Code + data | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `src/services/run-file-changes/run-file-change-service.ts` | Event-driven projection owner for attached runs + read cache for **any** runId + module singleton getter | Reads must reflect writes | Cache must be limited to runs whose events this instance receives; singleton is orphaned |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | Process composition root; constructs writer instance inline | — | Should own and bind the single process instance |
| `src/application-platform/execution/application-execution-scope-kernel-builder.ts` | Separate instance per application scope (separate AgentRunManager) | Application runs are not "active" to the process reader; read via disk | Keep scoped; benefits from cache invariant |
| `src/run-history/services/run-file-change-projection-service.ts` | Unified reader for GraphQL + REST | — | Must read live state from the process owner, resolved per call (not captured at construction) |
| `src/agent-execution/services/agent-run-resource-manager.ts` | Attaches/detaches run to file-change service | — | Unchanged |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `file_changes.json` per run memory dir — shape unchanged.

### Structural Surfaces

- Process-scoped service binding of `RunFileChangeService`; cache policy in `RunFileChangeService.load()`; reader dependency resolution in `RunFileChangeProjectionService`.
- Evidence paths: listed in Source Log.

### Potential Structural Impacts To Investigate

- API or external-contract change: None (GraphQL/REST shapes unchanged).
- Persistence schema or invariant change: None.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: Yes, minor — which instance's in-memory state readers observe; cache lifetime tied to attachment.
- Ownership-boundary change: Yes — restore single process owner of live projections (documented design).
- Confirmed: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| curl content endpoint for 3 images of active team member run | SCN-001 | 200 / 404 / 404 ("File change not found") | REQ-001 | server.log lines ~529546–529557 |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (screenshots) | Must be able to preview every produced image while agent is active | Direct | REQ-001 | None |
| User | Wants design-health judgement / refactor if needed | Direct | Design spec | None |

## External Contracts, Standards, And Dependencies

None beyond internal docs listed.

## Persisted Data And State Facts

- Affected stored subject: none changed. `file_changes.json` read/write semantics unchanged.
- Acceptable loss: in-memory caches are disposable.

## Product Design Request Context

- Product Design request in the current input: `Not stated` — N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| User screenshots (conversation, 2026-10-06) | User | Symptom evidence | SCN-001 | REQ-001 | Final | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Exact time image 1 was first read (200s not logged) | Confirms cache-fill moment | Not needed: code path deterministic; reproduction sufficient | Closed |
| RSK-001 | Risk | Frontend message "deleted or moved" shown for any 404 (including entry-not-found) | Misleading UX | Out of scope; separate-ticket candidate | Open (non-blocking) |

## Architecture Investigation Findings

- Current live read path: `GraphQL/REST → RunFileChangeProjectionService (module singleton) → getRunFileChangeService() (module singleton, never attached) → load() caches disk snapshot forever`.
- Current write path: `AgentRun event → AgentRunResourceManager.attachToRun → RunFileChangeService (instance created in supervisor) → handle() → its own cache + file_changes.json`.
- Root cause: (1) two owners of live projection state in one process (boundary/ownership drift from 8704f2653 / ae5a1c7bc); (2) missing invariant — a non-owning instance caches state it cannot keep current.
- Process-scope binding pattern exists (`bindProcessAgentRunService`, `bindProcessTeamRunService`, …) and is released in the supervisor's finally/teardown.

## Requirement Implications

- Correctness requirement only; no product behavior change beyond restoring documented behavior.

## Notes For Architecture Design

- Map SCN-001/SCN-002 to: single process owner bound in supervisor; reader resolves owner per call; cache only for attached runs; delete orphan singleton.
