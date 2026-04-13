# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Large`
- Triage Rationale:
  - The redesign now spans backend ownership, run-memory persistence, historical reconstruction, live streaming transport, frontend stores/viewers, and decommissioning of a narrower stopgap path-serving design.
- Investigation Goal:
  - Redefine file-backed artifact rendering around a backend-owned agent-run file-change projection that supports both live display and historical rerendering from run memory.
- Primary Questions To Resolve:
  - Where should `write_file` and `edit_file` truth live for both live and historical runs?
  - Should current scope be agent-run-owned or team-run-owned?
  - Do we need a public file-change/change ID, or is one row per `run + path` enough?
  - How should content be served without Electron-local reads, workspace inference, or dependence on the current filesystem for historical views?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-10 | Code | `autobyteus-web/stores/agentArtifactsStore.ts` | Inspect current live artifact owner | One browser-owned store currently mixes `write_file`, `edit_file`, generated outputs, and runtime fallback rows keyed by `runId:path`. | Yes |
| 2026-04-10 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Trace live file-row creation | `write_file` and `edit_file` rows are synthesized in the frontend from `SEGMENT_START`; only `write_file` receives streamed content deltas. | Yes |
| 2026-04-10 | Code | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Inspect additional live update paths | The same UI rows are also mutated from `ARTIFACT_UPDATED`, `ARTIFACT_PERSISTED`, and lifecycle fallbacks, confirming fragmented ownership. | Yes |
| 2026-04-10 | Code | `autobyteus-web/services/runHydration/runContextHydrationService.ts`, `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Inspect historical reopen path | Historical hydration only restores conversation/run config. There is no backend-owned file-change projection in the reopen path. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`, `autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts` | Verify backend history contract | The official run projection type only contains `conversation`, `summary`, and `lastActivityAt`. File changes are absent. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`, `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | Inspect durable run-memory capabilities | Agent-run memory already provides a durable per-run directory suitable for storing a file-change projection and content snapshots. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/services/run-artifacts/run-artifact-path-registry-service.ts`, `autobyteus-server-ts/src/services/run-artifacts/run-artifact-storage-locator.ts`, `autobyteus-server-ts/src/api/rest/run-artifacts.ts` | Inspect current stopgap redesign | The current redesign is path-oriented: touched-path authorization plus current filesystem reads. It solves remote/local authority but still does not create a historical file-change model. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`, `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Check whether live transport already has a file-change domain | The transport exposes generic runtime events and generic artifact events. There is no dedicated file-change live event family yet. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts`, `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`, `autobyteus-web/stores/activeContextStore.ts` | Evaluate team-run implications | Team WebSocket forwarding already tags member events with `memberRunId`, but the Artifacts tab still keys off the focused member agent context, so team selection currently behaves like a per-member artifact view. | Yes |
| 2026-04-10 | Code | `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`, `autobyteus-server-ts/src/agent-memory/store/team-member-memory-layout.ts`, `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Evaluate whether team-run aggregation is ready now | Team history exists through member-run memory directories, but reconstructing one unified team-owned file-change projection is materially more complex than agent-run reconstruction. | Yes |
| 2026-04-10 | Doc | `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `autobyteus-web/docs/agent_artifacts.md` | Check stated architecture | Current docs explicitly describe the Artifacts tab as a live touched-file/output view whose file-backed content authority is workspace-serving or the newer run/path route. They do not define a backend-owned historical file-change projection. | Yes |
| 2026-04-10 | Command | `rg -n "RunProjection|projection|conversation" ...`, `rg -n "artifact|write_file|edit_file|SEGMENT_START|ARTIFACT_" ...`, `rg -n "activeAgentContext|activeTeamContext|ArtifactsTab" ...` | Verify ownership and history gaps quickly across server/web code | Searches confirmed three distinct gaps: fragmented live file-row ownership, conversation-only history, and team UI still keying artifacts by focused member run. | No |
| 2026-04-10 | Command | `find ... -name 'design-principles.md' -o -name 'common-design-practices.md'` | Locate referenced shared design docs | The ticket templates reference shared design docs that are not present in this worktree. Design/review therefore needs to follow the workflow skill guides directly. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - Live agent events enter the UI through WebSocket segment, lifecycle, and artifact handlers.
  - Historical run reopen enters through `getRunProjection(...)` plus resume-config queries.
  - File-backed content is currently served either from workspace routes or from the narrower run/path stopgap route.
- Execution boundaries:
  - Runtime event conversion -> streaming transport -> frontend handlers -> browser store.
  - Run history provider -> GraphQL projection -> frontend conversation hydration.
  - Agent-run memory directory -> current stopgap path manifest and future redesign target.
- Owning subsystems / capability areas:
  - `agent-streaming`
  - `run-history`
  - `agent-memory`
  - current `run-artifacts` stopgap
  - frontend `agentArtifactsStore` / Artifacts UI
- Optional modules involved:
  - team-run streaming and team-member history readers
- Folder / file placement observations:
  - Current file-backed artifact behavior is scattered across multiple frontend handlers and a path-serving stopgap route, which is a sign that there is no single authoritative file-change owner yet.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentArtifactsStore.ts` | `useAgentArtifactsStore` | live touched-file/output store | mixes file changes and generated outputs in one browser-owned projection | file-backed projection should move to backend authority; generated outputs can remain separate for now |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | `handleSegmentStart`, `handleSegmentContent` | creates `write_file` / `edit_file` rows and write buffers | frontend currently infers file-change lifecycle from raw runtime segments | this logic should shrink to consuming backend-normalized file-change events |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` | `loadRunContextHydrationPayload` | historical conversation hydration | no file-change hydration exists | historical file changes need their own backend projection path |
| `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts` | `RunProjection` | persisted run history contract | conversation-only projection type | file changes should not continue to hide behind conversation-only history |
| `autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts` | `AgentRunMemoryLayout` | per-run memory subtree owner | already provides a durable run-scoped filesystem root | correct persistence boundary for file-change projection/snapshots |
| `autobyteus-server-ts/src/services/run-artifacts/run-artifact-path-registry-service.ts` | touched-path manifest | stopgap authorization for current filesystem reads | solves a narrower run/path serving problem, not historical rerendering | likely removable or foldable into the new file-change subsystem |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | `convertTeamEvent` | forwards member events to team clients | team transport currently preserves member identity, not a team-owned artifact/file-change projection | future team aggregation remains possible but is not ready to be the current scope owner |
| `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | artifacts UI owner | shows selected run’s artifact rows | keys off `activeAgentContext`, which becomes focused member context on team selection | confirms current scope can stay agent-run-owned without first solving team aggregation |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-10 | Probe | `rg -n "write_file|edit_file|ARTIFACT_" ...` | Live file-backed rows are currently assembled from three handler families, not one owner. | Backend-owned normalization is required. |
| 2026-04-10 | Probe | `rg -n "RunProjection|conversation" ...` | History projection is conversation-only end to end. | File changes need a separate historical projection path. |
| 2026-04-10 | Probe | `rg -n "activeAgentContext|activeTeamContext|ArtifactsTab" ...` | Team selection still drives the Artifacts tab through the focused member agent context. | Team-owned aggregation should be deferred unless explicitly prioritized. |
| 2026-04-10 | Probe | review of `run-artifacts` stopgap files | Current redesign reads current bytes through a path manifest. | Better than workspace inference, but still insufficient for historical rerendering. |

### Reproduction / Environment Setup

- Required services, mocks, or emulators:
  - none for code reading
- Required config, feature flags, or env vars:
  - none for investigation-only work
- Required fixtures, seed data, or accounts:
  - none
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - none
- Setup commands that materially affected the investigation:
  - code search only
- Cleanup notes for temporary investigation-only setup:
  - none

## Constraints

- Technical constraints:
  - Remote server authority is mandatory; Electron-local file access cannot be the content source of truth.
  - Current UI only needs the current/final effective file content, not diff rendering.
  - Historical rerendering should not depend on the current filesystem path still existing.
- Environment constraints:
  - Agent-run memory already exists and is easy to target.
  - Team-run history exists, but a unified team-owned file-change reconstruction layer is not yet straightforward.
- Third-party / API constraints:
  - Existing WebSocket protocol does not yet have a dedicated file-change message family.

## Unknowns / Open Questions

- Unknown:
  - Should current-scope redesign also absorb generated outputs into the same backend-owned projection?
- Why it matters:
  - The current Artifacts tab mixes file changes and generated outputs, but the user’s redesign request is explicitly about file changes.
- Planned follow-up:
  - Keep generated outputs on the existing artifact flow for current scope and revisit convergence only after the file-change path is stable.

- Unknown:
  - Should v1 persist an append-only file-change event log, or only a durable projection plus snapshots?
- Why it matters:
  - An event log improves auditability, but the current product only needs one row per path and final effective content.
- Planned follow-up:
  - Prefer a projection-first design in v1, with room to add an append-only audit log later behind the same owner if needed.

## Implications

### Requirements Implications

- The redesign should target an agent-run-owned file-change projection in current scope.
- There is no need for a public `changeId` if the visible row identity is `runId + normalizedPath`.
- Historical rendering should come from run-memory projection data and committed content snapshots, not from path re-resolution.

### Design Implications

- `write_file` and `edit_file` should share one backend file-change owner, even if their live content behavior differs.
- File-backed rows should stop using the existing artifact store as their authority; generated outputs can remain on the artifact path in current scope.
- The current `run-artifacts` path-manifest stopgap should not be the final architecture for file changes.

### Implementation / Placement Implications

- Add a dedicated backend `run-file-changes` subsystem instead of further extending `run-artifacts`.
- Add a dedicated frontend file-change store/handler/hydration path instead of deriving file rows from raw conversation segments.
- Defer team-run-owned aggregation until a later iteration; keep member attribution as a future extension point, not current scope.

## Re-Entry Additions

### 2026-04-10 Re-Entry Update

- Trigger:
  - User requested a broader redesign around a unified file-change model, historical rerendering from run memory, and backend-owned file-change authority.
- New evidence:
  - Current live behavior is fragmented across frontend handlers.
  - Current history behavior is conversation-only.
  - Team selection still routes Artifacts through the focused member agent context.
  - User clarified that current scope can stay agent-run-owned because agent-run memory is the easiest reliable reconstruction boundary right now.
  - User also clarified that the UI only needs final effective content, not diffs, and does not need a public `changeId`.
- Updated implications:
  - Current redesign target should be an agent-run-owned backend file-change projection with one row per path.
  - Team-run aggregation is explicitly deferred.
  - Projection-first persistence is preferable to a more complex multi-revision public model in the current iteration.
