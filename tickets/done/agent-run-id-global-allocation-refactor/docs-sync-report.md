# Docs Sync Report

## Scope

- Ticket: `agent-run-id-global-allocation-refactor`
- Trigger: Delivery re-entry after post-API/E2E code review Round 7 passed. Round 7 reviewed API/E2E Round 3 durable REST context-file coverage and the refreshed coverage artifacts.
- Bootstrap base reference: `origin/personal` recorded by upstream package.
- Integrated base reference used for docs sync: `origin/personal` @ `97ea4ae20555` after `git fetch origin personal`; local `HEAD` was also `97ea4ae20555` (`git rev-list --left-right --count HEAD...origin/personal` = `0 0`).
- Post-integration verification reference: No base commits were integrated. Delivery verified long-lived docs against the Round 7 reviewed implementation state, updated stale docs language, and ran `git diff --check` plus a long-lived-doc stale identity/path scan.

## Why Docs Were Updated

- Summary: The reviewed implementation now uses allocator-backed opaque agent/team run IDs and a shared Agent Memory location model. Long-lived docs were updated to describe `AgentMemoryLocationService` / `AgentMemoryLayout`, root-hierarchical `rootTeamRunId + teamRunPath + memberRunId/taskAgentRunId` directories, route-selection ambiguity behavior, context-file final owner resolution, and artifact/read projection lookup through resolved memory locations. Previous delivery docs language that described an `owningTeamRunId`/nearest-child-team directory model was corrected to the Round 7 reviewed root-hierarchical layout.
- Why this should live in long-lived project docs: Runtime identity, nested memory layout, route selector ambiguity, context-file finalization, artifacts, run-history projection, and frontend memory behavior are cross-cutting invariants. Future changes need the canonical docs to avoid reintroducing route-derived IDs, first-match route selection, or flattened/top-level memory assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Canonical standalone/team/task-agent `AgentRun` identity owner | No change | Prior delivery update remains accurate: allocator-backed opaque run IDs, duplicate-active rejection, backend-required IDs, provider ID separation, and historical restore rule still match Round 7. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team launch identity, route selection, mixed member/task-agent memory scope | Updated | Corrected member/task-agent memory docs to root-hierarchical `rootTeamRunId + teamRunPath` model and documented exact/unique-suffix/ambiguous route selector behavior. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory Explorer/storage layout docs | Updated | Replaced superseded owner-team target wording with `AgentMemoryLocationService`, `AgentMemoryLayout`, `TeamRunMemoryTopologyReader`, and root-hierarchical layout guidance. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Run-history persistence/projection/source authority | Updated | Corrected persistence/projection/file-change/team-restore language to root-hierarchical `rootTeamRunId + teamRunPath + runId` locations and `AgentMemoryLocationService`. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex team member identity and storage-only memory docs | Updated | Corrected Codex team-member/task-agent memory paths to root-hierarchical layout while preserving provider ID separation. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Produced Agent Artifact projection storage | Updated | Corrected team-member `file_changes.json` docs to resolved root-hierarchical member memory directory. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature-level artifact serving flow | Updated | Corrected feature-level artifact storage path to root-hierarchical member directory. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Context-file final storage/serving paths | Updated | Corrected final team-member context-file path and documented exact/unique suffix/ambiguous route behavior. |
| `autobyteus-web/docs/memory.md` | Frontend Memory page source-of-truth guidance | Updated | Corrected frontend memory storage docs to root-hierarchical layout and no frontend inference. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Frontend bridge guidance for run IDs | No change | Prior delivery update remains accurate: frontend must treat backend-allocated run IDs as opaque and route by member paths/route keys. |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | High-level server architecture | No change | This doc does not state concrete run-id generation or nested memory layout details; module docs are canonical. |
| `autobyteus-server-ts/docs/PROJECT_OVERVIEW.md` | Transport endpoint overview | No change | Endpoint names `/ws/agent/:runId` and `/ws/agent-team/:teamRunId` remain accurate. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Team identity, memory scope, selector semantics | Documented root-hierarchical member/task-agent memory and exact/unique-suffix/ambiguous route selection | Align with Round 7 CR-005 fix and REST coverage. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Storage layout and memory-location owner | Documented `AgentMemoryLocationService`, `AgentMemoryLayout`, `TeamRunMemoryTopologyReader`, `teamRunPath`, and root-hierarchical paths | Align Memory Explorer/storage docs with final source owners. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persistence/projection identity model | Corrected team-member artifacts, projection, team restore, and memory paths to root-hierarchical model and `AgentMemoryLocationService` | Run-history consumers must use final memory-location authority. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex memory docs | Corrected Codex team-member/task-agent storage-only memory paths | Codex team members use same memory location service as other runtimes. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Artifact projection storage | Corrected `file_changes.json` path to resolved root-hierarchical member directory | Produced artifacts must hydrate through same memory location as runtime writes. |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` | Feature flow storage note | Corrected feature-level artifact path language | Keep feature-level docs aligned with module docs. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Context-file storage/serving | Corrected final context-file path and route ambiguity behavior | Context-file finalization now fails ambiguous suffix selectors instead of first-match behavior. |
| `autobyteus-web/docs/memory.md` | Frontend memory UX source guidance | Corrected direct/nested/task-agent storage paths and no frontend inference guidance | Frontend should rely on backend memory targets, not parse IDs or infer directories. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical `AgentRun` identity allocation | New standalone, team-member, and task-agent runs receive allocator-backed `<agent_definition_name_slug>_<uuid>` IDs before backend creation; the slug is readability-only and must not be parsed. | Requirements doc; design spec; implementation handoff; code review report | `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/agent_integration_minimal_bridge.md` |
| Team run and member launch identities | New team runs receive generated `<team_definition_name_slug>_<uuid>` IDs; public launch cannot supply `memberRunId`/`childTeamRunId`; route keys/member paths remain routing identity. | Requirements doc; design spec; implementation handoff | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/modules/run_history.md` |
| Root-hierarchical team memory locations | Direct members use `rootTeamRunId + memberRunId`; nested members use `rootTeamRunId + teamRunPath + memberRunId`; task agents use that same team memory scope plus generated `taskAgentRunId`. | Requirements doc; implementation handoff; API/E2E coverage investigation; execution coverage report; code review report | `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-web/docs/memory.md` |
| Shared memory location owner | `AgentMemoryLocationService` and `AgentMemoryLayout` own standalone/team/member/task-agent memory directories; `TeamRunMemoryTopologyReader` resolves root metadata even from child team run IDs. | Implementation handoff; code review report | `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-server-ts/docs/modules/run_history.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md` |
| Route selector ambiguity behavior | Exact route-key matches win; suffix selection is allowed only when unique in the requested team scope; ambiguous suffixes fail instead of first-match behavior. | Code review report Round 7; API/E2E execution coverage report Round 3 | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` |
| Context-file and artifact read paths | Final context files and produced artifacts resolve stored member IDs and root-hierarchical memory directories from runtime/metadata, not route-derived ID builders. | Design spec; implementation handoff; execution coverage report | `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-server-ts/docs/features/artifact_file_serving_design.md` |
| Runtime-native/provider ID separation | Codex thread IDs, Claude session IDs, and AutoByteus native IDs remain metadata, not canonical platform run IDs. | Requirements doc; design spec; implementation handoff | `autobyteus-server-ts/docs/modules/agent_execution.md`, `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/run_history.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Readable standalone AutoByteus ID formatter as new-run authority | `AgentRunIdentityAllocator` with `<agent_definition_name_slug>_<uuid>` IDs for all new concrete `AgentRun`s | `agent_execution.md`, `run_history.md` |
| Deterministic route-derived `memberRunId` / `buildTeamMemberRunId(...)` behavior | Allocator-backed opaque member run IDs plus route-key/member-path routing metadata | `agent_team_execution.md`, `run_history.md`, `agent_integration_minimal_bridge.md` |
| Old top-level-only or nearest-child-owner nested member memory assumptions | Root-hierarchical `AgentMemoryLocationService` locations using `rootTeamRunId + teamRunPath + memberRunId/taskAgentRunId` | `agent_memory.md`, `agent_team_execution.md`, `run_history.md`, `codex_integration.md`, `memory.md` |
| First-match route suffix behavior | Exact match or unique suffix selection; ambiguous suffixes fail | `agent_team_execution.md`, `FILE_RENDERING_AND_MEDIA_PIPELINE.md` |
| Team-member context-file final storage under obsolete `/members/<memberRunId>` or non-root-hierarchical shapes | Final files under the resolved member `memoryDir/context_files` | `FILE_RENDERING_AND_MEDIA_PIPELINE.md` |
| Team-member artifact projection under root-team-derived path only | `file_changes.json` under resolved root-hierarchical member memory directory | `agent_artifacts.md`, `artifact_file_serving_design.md`, `run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A` — docs changes were needed and applied.
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against branch state confirmed current with `origin/personal` @ `97ea4ae20555`. `git diff --check` and long-lived-doc stale identity/path scan passed after docs edits. Finalization is intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
