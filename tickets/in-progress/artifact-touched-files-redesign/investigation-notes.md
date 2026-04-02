# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale:
  - The redesign spans frontend streaming handlers, artifact state management, artifact UI behavior, and the current backend artifact persistence path.
  - The likely product simplification is frontend-heavy, but removal/simplification of server persistence and read APIs is also in scope.
  - The work is still bounded to one product concept: artifact area becomes a touched-files projection for the live run UX.
- Investigation Goal:
  - Determine how the current artifact area is populated and rendered, where `write_file` and `edit_file` diverge, and whether backend artifact persistence is currently necessary for the live UX.
- Primary Questions To Resolve:
  - How does the current live artifact UI get populated for `write_file`, `edit_file`, and generated assets?
  - Why does `edit_file` feel weaker than `write_file` in the artifact area?
  - Does the current UI actually depend on persisted artifact metadata from the server?
  - What is the cleanest product model for “all files touched in this run” without over-designing history restore now?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-30 | Command | `git fetch origin personal --prune` | Stage 0 bootstrap and fresh base resolution | Base `origin/personal` refreshed successfully before creating the ticket worktree/branch. | No |
| 2026-03-30 | Command | `git worktree add -b codex/artifact-touched-files-redesign /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign origin/personal` | Create dedicated workflow worktree | Dedicated worktree/branch created successfully for the ticket. | No |
| 2026-03-30 | Code | `autobyteus-web/stores/agentArtifactsStore.ts` | Inspect artifact state model and persisted-read path | Store is live-run oriented; `fetchArtifactsForRun()` exists but is not used anywhere outside the store/doc. `edit_file` uses `touchArtifact()`, `write_file` uses streaming lifecycle actions. | No |
| 2026-03-30 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Trace live artifact creation during stream parsing | `write_file` creates a pending artifact on `SEGMENT_START`, appends streamed content on `SEGMENT_CONTENT`, and finalizes on `SEGMENT_END`; `edit_file` does not create an artifact row at segment start. | No |
| 2026-03-30 | Code | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | Trace backend artifact event handling | `ARTIFACT_UPDATED` calls `touchArtifact()` and can create an entry if missing; `ARTIFACT_PERSISTED` marks streamed files persisted or creates media artifacts directly. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Understand what content users actually see | Viewer fetches full file content from workspace only when status is `persisted`; non-persisted artifacts fall back to in-memory `content`. This is ideal for streamed `write_file`, but blocks early full-file viewing for non-streamed text entries. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Understand selection behavior | Artifact tab auto-selects streaming artifacts and first artifacts, but does not add special behavior for newly touched `edit_file` entries beyond normal list updates. | No |
| 2026-03-30 | Code | `autobyteus-web/components/layout/RightSideTabs.vue` | Check sidebar switching behavior | Sidebar auto-switches to `artifacts` only when a new active streaming artifact exists, so `edit_file` and non-streaming generated outputs do not trigger the same tab switch behavior. | No |
| 2026-03-30 | Code | `autobyteus-web/components/workspace/agent/ArtifactList.vue`, `ArtifactItem.vue` | Understand current artifact-area presentation | UI already groups entries into `Assets` and `Files`, which aligns naturally with a touched-files model. Status/icon semantics are still artifact-lifecycle oriented (`streaming`, `pending_approval`, `persisted`, `failed`). | No |
| 2026-03-30 | Code | `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Verify runtime event routing | `ARTIFACT_PERSISTED` and `ARTIFACT_UPDATED` are first-class streamed message types into the frontend handlers. | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts` | Trace server-side artifact persistence/event emission | Mandatory processor persists `write_file` and generic output-path artifacts, but only emits update notifications for `edit_file`; current backend persistence model is asymmetric. | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/agent-artifacts/services/artifact-service.ts` | Confirm what is actually persisted | Service persists only metadata (`runId`, `path`, `type`, `workspaceRoot`, `url`, timestamps), not full file content. | No |
| 2026-03-30 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | Trace persisted-read path | GraphQL resolver exposes persisted artifact metadata by run id. | No |
| 2026-03-30 | Command | `rg -n "fetchArtifactsForRun\(" autobyteus-web --glob '!**/dist/**'` | Verify whether persisted-read path is actually used | No production caller exists; only the store method and documentation reference the persisted fetch path. | No |
| 2026-03-30 | Doc | `autobyteus-web/docs/agent_artifacts.md` | Check intended/current documented behavior | The doc explicitly says `fetchArtifactsForRun()` is for session restore / future feature, confirming persisted artifact reads are not part of current live UX. | No |
| 2026-03-30 | Command | `rg -n "markArtifactFailed" autobyteus-web/services autobyteus-web/components autobyteus-web/stores --glob '!**/dist/**'` | Verify failure-state wiring | `markArtifactFailed()` exists in the store, but no live handler currently calls it; artifact failure state is not fully wired. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - Frontend live event ingress: `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`
  - Frontend segment-driven touched-file creation: `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - Frontend backend-event artifact updates: `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`
  - Backend tool-result artifact event emission/persistence: `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts`
  - Backend persisted artifact query: `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts`
- Execution boundaries:
  - Stream parsing boundary (`SEGMENT_START` / `SEGMENT_CONTENT` / `SEGMENT_END`)
  - Backend artifact event boundary (`ARTIFACT_PERSISTED` / `ARTIFACT_UPDATED`)
  - Workspace file-content fetch boundary in `ArtifactContentViewer.vue`
  - Server persistence boundary in `ArtifactService`
- Owning subsystems / capability areas:
  - Frontend streaming + run UI projection: `autobyteus-web/services/agentStreaming`, `autobyteus-web/stores`, `autobyteus-web/components/workspace/agent`
  - Backend artifact persistence capability: `autobyteus-server-ts/src/agent-artifacts`
  - Backend tool-result customization/processors: `autobyteus-server-ts/src/agent-customization/processors/tool-result`
- Optional modules involved:
  - Artifact GraphQL query surface is separate from the live websocket path.
- Folder / file placement observations:
  - Frontend touched-file UX already lives in the right subsystem (`services/agentStreaming`, `stores`, `components/workspace/agent`).
  - Backend persistence is cleanly isolated and therefore removable/simplifiable without large cross-system ripples if the product decision is to drop it.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/stores/agentArtifactsStore.ts` | `createPendingArtifact`, `appendArtifactContent`, `finalizeArtifactStream`, `markArtifactPersisted`, `touchArtifact`, `fetchArtifactsForRun` | Frontend artifact state per run | Store is already the live touched-file projection owner for the current UX, but its naming/status model is artifact-persistence-oriented rather than touched-files-oriented. | Keep ownership in frontend store; likely simplify model rather than moving it. |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | `handleSegmentStart`, `handleSegmentContent`, `handleSegmentEnd` | Live segment parsing + stream-side state updates | Only `write_file` creates a row at segment start and streams content; `edit_file` is represented only in the activity sidecar until backend update arrives. | Touched-file creation for `edit_file` belongs here as well. |
| `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | `handleArtifactPersisted`, `handleArtifactUpdated` | Apply backend artifact events to the store | `ARTIFACT_UPDATED` can create a persisted row if missing; this currently makes `edit_file` appear only after backend update, not immediately on start. | Still the right owner for backend event reconciliation, but not sufficient for the desired UX alone. |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | `artifactUrl`, `displayContent`, `refreshPersistedContent` | Render file/media content for selected artifact entry | Full file fetch from workspace happens only for `persisted` artifacts; non-persisted text entries rely on in-memory content only. | Viewer likely remains the correct rendering owner, but fetch policy should be broadened for touched files. |
| `autobyteus-web/components/layout/RightSideTabs.vue` | artifact auto-switch watcher | Right-side tab auto-selection | Auto-switch to artifacts only occurs for active streaming artifacts, which helps `write_file` but not `edit_file` or generated media. | Tab auto-switch logic should follow touched-file creation, not only streaming state, if product wants uniform discoverability. |
| `autobyteus-web/components/workspace/agent/ArtifactList.vue` | assets/files grouping | Artifact list presentation | Already groups entries into `Assets` and `Files`, which matches the desired touched-files UX well. | Reuse this structure; do not redesign away from assets/files grouping unnecessarily. |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts` | `process()` | Persist metadata and emit artifact events | Mandatory processor persists metadata for `write_file` and output-path tools, but only notifies `edit_file`; it is more persistence-oriented than UX-oriented. | If persistence is removed, event emission can likely be retained in a much thinner form or shifted to pure event projection. |
| `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | `agentArtifacts(runId)` | Persisted artifact metadata query | Exists, but current frontend live UX does not consume it. | Candidate for removal/simplification if persistence is dropped now. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-30 | Probe | `rg -n "fetchArtifactsForRun\(" autobyteus-web --glob '!**/dist/**'` | No production call site found; only store definition and docs mention it. | Persisted artifact reads are not currently part of the live artifact UX. |
| 2026-03-30 | Probe | `rg -n "markArtifactFailed" autobyteus-web/services autobyteus-web/components autobyteus-web/stores --glob '!**/dist/**'` | No live call path found for failure-state updates. | Failure-state behavior is incomplete and should be intentionally redesigned rather than preserved by accident. |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: `N/A`
- Version / tag / commit / release: `N/A`
- Files, endpoints, or examples examined: `N/A`
- Relevant behavior, contract, or constraint learned: `N/A`
- Confidence and freshness: `N/A`

### Reproduction / Environment Setup

- Required services, mocks, or emulators: `None`
- Required config, feature flags, or env vars: `None`
- Required fixtures, seed data, or accounts: `None`
- External repos, samples, or artifacts cloned/downloaded for investigation: `None`
- Setup commands that materially affected the investigation:
  - `git fetch origin personal --prune`
  - `git worktree add -b codex/artifact-touched-files-redesign /Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign origin/personal`
- Cleanup notes for temporary investigation-only setup: `None`

## External / Internet Findings

| Source | Fact / Constraint | Why It Matters | Confidence / Freshness |
| --- | --- | --- | --- |
| `N/A` | No internet research was required for this codebase-local redesign investigation. | Current behavior and constraints were determinable from local source and docs. | High / 2026-03-30 |

## Constraints

- Technical constraints:
  - Current `write_file` UX relies on an in-memory streaming buffer and approval-oriented statuses.
  - Current viewer fetches full content from workspace only for `persisted` entries.
  - Current backend persistence stores metadata only, not full content.
- Environment constraints:
  - Work is being staged in dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/artifact-touched-files-redesign` on branch `codex/artifact-touched-files-redesign` created from `origin/personal` on 2026-03-30.
- Third-party / API constraints:
  - None discovered in scope.

## Unknowns / Open Questions

- Unknown:
  - Whether `edit_file` touched-file rows should be created immediately at segment start, or only once execution begins/succeeds.
- Why it matters:
  - Immediate creation improves discoverability and matches user expectation, but might require clearer status semantics for denied/failed edits.
- Planned follow-up:
  - Resolve in Stage 2 requirements and Stage 3 design by explicitly defining touched-file lifecycle semantics.

- Unknown:
  - Whether the right-panel tab label should remain `Artifacts` or shift to `Files` / `Touched Files`.
- Why it matters:
  - Naming influences whether the design keeps artifact-centric semantics or adopts the clearer touched-files mental model.
- Planned follow-up:
  - Decide in Stage 2/3; implementation can keep internal code names temporarily if product copy changes are deferred.

- Unknown:
  - Whether failed or denied tool executions should leave a visible touched-file row.
- Why it matters:
  - Product behavior should be deliberate rather than inherited from the current half-wired artifact status model.
- Planned follow-up:
  - Explicit acceptance criteria and design branching required.

## Implications

### Requirements Implications

- Requirements should redefine the artifact area as a touched-files projection, not as a persistence-backed artifact register.
- Requirements should explicitly include `edit_file` parity with `write_file` in discoverability and click-to-inspect behavior.
- Requirements should state that full current file content is the main goal for text/code files, while diff rendering is out of scope.
- Requirements should decide whether persistence removal is part of this change or a follow-up, based on current product value.

### Design Implications

- The clean architecture is likely a frontend-owned touched-files projection driven by live stream events plus workspace/file fetching, with backend persistence decoupled from current live UX.
- `write_file` should retain streamed-preview behavior, but `edit_file` should become a first-class touched-file entry at stream start or equivalent early lifecycle point.
- Viewer fetch policy should be based on “can resolve file path in workspace” rather than the narrower “artifact status is persisted.”
- Backend artifact persistence can likely be removed or greatly simplified without breaking the current live UX, because no active frontend restore path consumes it.

### Implementation / Placement Implications

- Primary changed files are likely in:
  - `autobyteus-web/stores/agentArtifactsStore.ts`
  - `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`
  - `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/components/layout/RightSideTabs.vue`
- If persistence removal is included, likely backend changes are in:
  - `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts`
  - `autobyteus-server-ts/src/agent-artifacts/**`
  - `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts`
  - related tests/docs for artifact persistence/query behavior

## Re-Entry Additions

### 2026-04-02 — Design-impact investigation refresh after Stage 8 round 5

- Why the score remained `7.1 / 10`:
  - The main direction is still good: the touched-files projection is the right product model, persistence/query cleanup is strong, and the CR-002 monotonic activity-status fix improved the lifecycle sidecar.
  - The score stayed materially below the acceptance bar because two owner invariants were still not preserved in code:
    - `CR-003`: the DS-005 discoverability signal is meant to mean “newly visible touched row,” but the current store re-announces the same row on refresh-only artifact updates.
    - `CR-004`: artifact availability is emitted before tool success is authoritatively established, so failed/denied tool results can still produce availability-shaped artifact events.
- Why this is being treated as redesign work:
  - These are not cosmetic issues. They show that two architecture contracts were not explicit enough in the active design path to reliably constrain implementation:
    - the separation between **first visibility** and **row refresh**,
    - the separation between **tool attempt/result parsing** and **artifact availability authorization**.
  - The user explicitly requested an upstream redesign pass so the architecture can be judged more strictly by the shared design principles rather than patched ad hoc.
- Architecture implications to carry into redesign:
  - DS-005 must define one clear owner for the invariant “announce only on first visibility or explicit re-touch, not on refresh.”
  - DS-002 / DS-003 must define one clear success gate for artifact availability so the backend artifact-event path cannot bypass lifecycle truth.
  - Generated outputs need an explicit rule: either they appear only after confirmed successful output creation, or the system needs a separate failed-output projection path. The current branch implicitly mixes those meanings.
- Immediate redesign targets:
  - tighten the discoverability bounded local spine so selection/tab switching reacts once to new visibility instead of every update,
  - tighten backend artifact emission so only success-authorized outputs become `available`,
  - carry these owner invariants forward into updated runtime call stacks before any more code changes.

### 2026-04-02 — Architecture-score investigation refresh after Stage 8 round 6

- Why the score is still below the desired bar even though Stage 8 now passes:
  - The blocking defects from round 5 were fixed, so the branch is now architecturally sound enough to pass.
  - The remaining gap is no longer correctness; it is **clarity of public boundary shape**.
  - In particular, the frontend touched-entry store still exposes one broad event-shaped mutator, `upsertTouchedEntryFromArtifactEvent(...)`, plus option flags (`announceOnCreate`, `announceOnExisting`) and optional availability semantics. That means multiple different domain subjects are still represented through one generic public API:
    - runtime refresh (`ARTIFACT_UPDATED`)
    - success-authorized availability (`ARTIFACT_PERSISTED`)
    - lifecycle fallback row creation when invocation matching misses
  - This shape is workable, but it weakens the direct mapping between the data-flow spine and the public store boundary. That is why Stage 8 landed at `8.8`, not `9+`, especially on:
    - separation of concerns / file placement,
    - API/interface/query/command clarity,
    - shared-structure/data-model tightness,
    - naming quality and local readability.
- Concrete code evidence for the remaining architecture/API blur:
  - `autobyteus-web/stores/agentArtifactsStore.ts`
    - `upsertTouchedEntryFromArtifactEvent(...)` currently accepts optional `availability`, optional `sourceTool`, and discoverability control flags, so callers must know too much about internal event semantics.
  - `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`
    - runtime `ARTIFACT_UPDATED` and `ARTIFACT_PERSISTED` still target the same generic store method instead of two explicit store-owned domain operations.
  - `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts`
    - lifecycle fallback still routes through that same artifact-event-shaped store method when invocation lookup misses, which is semantically correct but not boundary-clear.
- Why this matters under the shared design principles:
  - The main design rule is that each main-line node should own one clear subject, and public boundaries should make those subjects obvious.
  - Right now the runtime/event spine is clearer than before, but the store API still partially compresses **refresh**, **availability**, and **lifecycle fallback creation** into one public entrypoint.
  - That means the code is relying on caller discipline more than it should. A clearer architecture would let the store boundary express those domain subjects directly.
- Immediate architecture targets for the next redesign iteration:
  - split the store’s public artifact-event boundary into explicit domain operations instead of one generic upsert:
    - refresh from `ARTIFACT_UPDATED`
    - availability from `ARTIFACT_PERSISTED`
    - lifecycle fallback creation / terminal projection
  - keep any generic merge/upsert helper internal to the store, not as the caller-facing API
  - align handler calls so each handler depends on the one store boundary that matches its domain subject
  - rerun runtime-call-stack review against this stricter boundary shape before any further code edits
