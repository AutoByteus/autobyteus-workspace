# Design Spec

## Current-State Read

The current `publish_artifacts` flow already has a run-owned durable artifact model after source-path validation, but the validation boundary still treats the current workspace as the maximum allowed source boundary.

Current publish spine:

`Agent runtime -> publish_artifacts tool -> PublishedArtifactPublicationService -> PublishedArtifactSnapshotStore / PublishedArtifactProjectionStore -> AgentRun ARTIFACT_PERSISTED event / application relay`

Current details:

- `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` owns the canonical plural tool name, input normalizer, and public description. It currently says artifacts are files from the current run workspace and that paths must still resolve inside it.
- `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` is the AutoByteus tool entry facade. It resolves `runId`, optional fallback runtime context, and delegates publication to `PublishedArtifactPublicationService`.
- Codex and Claude/MCP tool definitions have their own path descriptions that repeat the workspace-contained rule.
- `PublishedArtifactPublicationService.publishForRun(...)` is the governing publication owner. It resolves active-run or team-member fallback authority, requires a memory directory, currently requires a workspace root, canonicalizes the source path, snapshots the file, writes projection metadata, emits `ARTIFACT_PERSISTED`, and optionally relays to application bindings.
- `published-artifact-path-identity.ts` currently rejects all candidates outside `workspaceRootPath`; `resolvePublishedArtifactAbsolutePath(...)` only resolves workspace-relative canonical paths.
- The service performs a second realpath workspace-containment check, which rejects workspace-relative symlink escapes even if they resolve to readable files.
- `PublishedArtifactSnapshotStore` already copies the source file into run/member-run memory under `published_artifacts/revisions/<revisionId>/<sourceFileName>`. `PublishedArtifactProjectionStore` writes summaries/revisions into `published_artifacts.json` under the same memory directory.
- `PublishedArtifactProjectionService` reads application-facing/historical summaries and revision text from run memory snapshots, not from the original source path.

File-change precedent:

- `agent-run-file-change-path.ts` / `run-file-change-path-identity.ts` already model run-owned file identity.
- File-change paths show that run-owned file paths can come from multiple filesystem places and are not limited to the workspace. For published artifacts, the user clarified that durable storage should go further and keep normalized absolute source identity even for files under the workspace.
- `ArtifactContentViewer.vue` fetches external absolute file-change paths through a run-scoped server route, not browser-local filesystem reads.

Target constraints:

- Preserve the clean plural-only contract from the prior ticket; do not reintroduce `publish_artifact`.
- Preserve durable publish-time snapshots as the authoritative content model.
- Do not rely on application workspace-relative path expectations. Application consumers must treat published artifact paths as source/display identities and derive semantic artifact roles through application-owned rules. New core publications store normalized absolute source paths; app resolvers may tolerate relative historical/test values, but they must not require them.
- The platform must not define “application artifact path” as workspace-relative or app-relative. Application path interpretation is application-internal business logic layered on top of the platform source identity.
- Stop using workspace containment as a source authority for absolute paths.

## Intended Change

Change published-artifact path identity and validation from `workspace-contained source file` to `run-owned published source file`:

- Relative paths continue to resolve from the run workspace root, then store directly as normalized absolute source paths.
- Absolute paths inside a known workspace root store directly as normalized absolute source paths; they are not rewritten to workspace-relative paths.
- Absolute paths outside the workspace also store directly as normalized absolute canonical paths.
- Absolute paths can publish without a workspace binding when the runtime has run/member-run authority and a durable memory directory.
- Relative paths without a workspace root fail clearly; relative paths with a workspace root resolve to absolute source paths before storage.
- Workspace-relative symlink escapes no longer fail as workspace-boundary violations; they publish if they resolve to a readable file and can be snapshotted.
- Snapshotting remains publish-time and run-memory-backed, so historical application reads do not need the original source path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`
- Evidence:
  - The durable published-artifact owner is run memory, but the current validation owner is the workspace boundary.
  - File changes already use run-owned path identity and preserve outside-workspace absolute paths.
  - Tool descriptions/docs encode the wrong ownership rule and instruct workspace copying.
- Design response:
  - Introduce/reuse run-owned file path resolution with the file-change boundary precedent, while giving published artifacts absolute storage semantics.
  - Make `PublishedArtifactPublicationService` validate source readability/copyability instead of workspace containment.
  - Keep snapshot/projection/event boundaries as the authoritative publish path.
- Refactor rationale:
  - Directly special-casing outside paths inside `PublishedArtifactPublicationService` would keep path policy fragmented and workspace-biased.
  - A shared low-level run-owned path resolver prevents boundary drift, while the published-artifact wrapper owns the absolute storage rule.
- Intentional deferrals and residual risk, if any:
  - No new host-file allowlist/approval system in this ticket. Residual risk is that any runtime with `publish_artifacts` and filesystem read access can snapshot readable absolute files. This is user-approved behavior and matches the existing file-change/run-owned path model.
  - No generic frontend published-artifact browser in this ticket. Current published-artifact durable consumers are application backends; the generic Artifacts tab remains file-change-driven.

## Terminology

- `Canonical artifact path`: the run-owned source/display path identity stored in published-artifact summaries/revisions. For published artifacts it is a normalized absolute source path. Application code must not treat this field as the only semantic artifact-role key.
- `Source absolute path`: the concrete server/runtime filesystem path read at publish time.
- `Path resolution result`: if the published-artifact wrapper returns both `canonicalPath` and `sourceAbsolutePath`, `canonicalPath` is the normalized absolute source identity persisted to summaries/revisions and `sourceAbsolutePath` is the filesystem path passed to `stat`/snapshot. It must not be the file-change display canonical path when that path would be workspace-relative.
- `Snapshot`: the durable copy stored under the run/member-run memory directory and used for historical/application reads.
- `Workspace root`: an optional resolver for relative publish inputs; it is no longer the maximum boundary and no longer causes in-workspace absolute published artifacts to be stored as relative paths.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the workspace-contained publication rule from code, tests, docs, and tool descriptions.
- The singular `publish_artifact` tool remains out of scope and must not be reintroduced.
- No compatibility wrapper should accept both old workspace-contained and new run-owned semantics. The old containment rejection is removed as the in-scope behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Runtime calls `publish_artifacts` | Published summary/revision snapshot in run memory plus returned tool result | `PublishedArtifactPublicationService` | This is the core publication behavior that changes from workspace-contained to run-owned absolute-path capable. |
| DS-002 | Return-Event | Successful publication summary | Agent run websocket/application relay consumers | `PublishedArtifactPublicationService` + existing event/relay owners | Ensures outside-path publication still emits the same available artifact contract. |
| DS-003 | Primary End-to-End | Application reconciliation/API call for published artifact text | Snapshot text returned from run memory | `PublishedArtifactProjectionService` | Confirms historical reads use snapshots and never depend on live outside source paths. |
| DS-004 | Bounded Local | Raw source path canonicalization request | `{ canonicalPath, sourceAbsolutePath }` or clear failure | Run-owned file path identity helper / published-artifact wrapper | This local path resolution policy is the main refactor point; it uses file-change as the non-workspace-bound precedent but stores published artifacts as absolute paths. |
| DS-005 | Primary End-to-End | Application published-artifact event or reconciliation summary | Application-specific projected artifact/message state and UI semantics | Application artifact role resolver (`brief-artifact-paths.ts`, `lesson-artifact-paths.ts`) | Ensures apps accept absolute published artifact paths and derive roles semantically instead of assuming workspace-relative path identity. |

## Primary Execution Spine(s)

- DS-001: `Agent runtime -> publish_artifacts tool facade -> PublishedArtifactPublicationService -> run-owned path identity -> source file validation -> PublishedArtifactSnapshotStore -> PublishedArtifactProjectionStore -> tool result`
- DS-003: `Application backend/runtime control -> PublishedArtifactProjectionService -> PublishedArtifactProjectionStore -> PublishedArtifactSnapshotStore -> revision text/content`
- DS-005: `ApplicationPublishedArtifactEvent / getRunPublishedArtifacts summary -> app artifact role resolver -> snapshot revision read -> app projection repository -> application UI/notification`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The runtime submits one or more artifact paths. The tool facade validates the plural input shape and delegates to the publication service. The publication service resolves run/member-run authority, resolves the source path using run-owned path identity, validates that it is a readable regular file, snapshots it into run memory, writes/updates projection metadata, and returns summaries. | Runtime tool call, tool facade, publication service, path identity, snapshot store, projection store | `PublishedArtifactPublicationService` | Input schema, path identity, artifact type inference, snapshot persistence, projection persistence, cleanup on failure |
| DS-002 | After projection write succeeds, the same summary shape is emitted to active run events or fallback notifier/application relay. No caller emits available artifacts before the publication service commits the snapshot/projection. | Publication service, AgentRun event, fallback notifier, application relay | `PublishedArtifactPublicationService` | Payload serialization, websocket mapper, application relay |
| DS-003 | Application reconciliation loads published artifact summaries and revision text from run/member-run memory. It does not read the original source path and therefore remains stable after external source deletion. | Runtime control, projection service, projection store, snapshot store | `PublishedArtifactProjectionService` | Memory-dir lookup, active/historical run metadata |
| DS-004 | Raw path resolution distinguishes relative vs absolute paths. Relative paths require a workspace root and resolve to an absolute source path. Absolute paths remain absolute source identities regardless of workspace containment. | Path identity helper, published-artifact wrapper | Run-owned path identity helper with published-artifact wrapper | Path normalization, platform absolute detection, relative-to-absolute resolution, optional realpath alias collapse |
| DS-005 | Application handlers receive artifact summaries/events whose `path` is a source/display identity. New core events carry normalized absolute source paths; relative values may appear only from historical/test fixtures and are handled by the same semantic resolver. The app-owned resolver maps producer plus recognized filename/suffix to a semantic artifact role, reads the published snapshot by revision ID, stores the received path for traceability, and updates app state/UI using semantic fields. | Application event/reconciliation input, app role resolver, revision snapshot read, app repository, app UI/notification | Application artifact role resolver + reconciliation service | Filename/suffix normalization, producer gating, semantic role mapping, received-path preservation |

## Spine Actors / Main-Line Nodes

- Agent/runtime calling `publish_artifacts`
- `publish-artifacts-tool.ts` facade
- `PublishedArtifactPublicationService`
- Run-owned file path identity helper / `published-artifact-path-identity.ts`
- `PublishedArtifactSnapshotStore`
- `PublishedArtifactProjectionStore`
- `PublishedArtifactProjectionService`
- Existing event/relay path for successful publication
- Application artifact role resolvers (`brief-artifact-paths.ts`, `lesson-artifact-paths.ts`)
- Application projection repositories/frontends that consume semantic artifact fields

## Ownership Map

- `publish-artifacts-tool.ts` owns tool registration, argument schema, runtime-context extraction, and delegation. It is a thin entry facade, not the publication policy owner.
- `published-artifact-tool-contract.ts` owns the canonical plural input contract and shared tool description.
- `PublishedArtifactPublicationService` owns publication authority, sequencing, validation after input normalization, snapshot/projection transaction shape, cleanup, return summaries, and event/relay emission after commit.
- Run-owned file path identity helper owns general `runId + path` path semantics shared by file changes and published artifacts.
- `published-artifact-path-identity.ts` owns published-artifact-specific path result shape and delegates generic path semantics to the shared helper.
- `PublishedArtifactSnapshotStore` owns durable revision file storage under run/member-run memory.
- `PublishedArtifactProjectionStore` owns projection JSON persistence and normalization.
- `PublishedArtifactProjectionService` owns active/historical projection reads and revision content reads from snapshots.
- Application artifact path resolver files own app-specific semantic role derivation from producer plus source path. They must accept normalized absolute source paths from new publications, may tolerate direct relative historical/test values through the same semantic resolver, and must not treat workspace-relative strings as the only valid contract.
- The platform published-artifact subsystem owns source identity, snapshotting, persistence, and event delivery only. It must not own or narrow application business meaning for artifact paths.
- Application frontends own presentation decisions and should use app semantic fields (`publicationKind`, message kind) instead of exact source path equality.

If a public facade or entry wrapper exists:

- `publish-artifacts-tool.ts` is a thin boundary; it must not own workspace containment or snapshot policy.
- Runtime-specific Codex/Claude tool definition builders are schema/description surfaces only; they must not own divergent publication rules.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `publish-artifacts-tool.ts` | `PublishedArtifactPublicationService` | Registers AutoByteus local tool, builds schema, extracts runtime context | Path containment, source validation, snapshot/projection sequencing |
| Codex dynamic tool registration | `PublishedArtifactPublicationService` through dynamic tool callback path | Exposes the same tool to Codex runtimes | Different path semantics or workspace-only wording |
| Claude/MCP tool definition/server | `PublishedArtifactPublicationService` through MCP callback path | Exposes the same tool to Claude runtimes | Different path semantics or workspace-only wording |
| `PublishedArtifactProjectionService` application/runtime-control methods | `PublishedArtifactProjectionService` | Public read facade for application backends | Original source path rereads |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Workspace-contained rejection in `canonicalizePublishedArtifactPath(...)` | Published artifacts are run-owned, not workspace-owned | Shared run-owned file path identity + published-artifact wrapper | In This Change | Outside absolute paths canonicalize as absolute. |
| Workspace-relative published-artifact storage identity | Published artifact storage should preserve absolute source identity | New resolver stores normalized absolute source paths, resolving relative inputs against workspace root first | In This Change | Relative inputs remain accepted but are not stored as relative. |
| Realpath workspace containment check in `PublishedArtifactPublicationService` | It rejects valid outside absolute paths and symlink escapes | Regular-file/copy validation only | In This Change | `fs.stat`/`copyFile` source failure remains authoritative. |
| Service-level unconditional workspace binding requirement | Absolute paths do not need a workspace root | Optional workspace root; required only for relative input resolution | In This Change | Memory directory remains required. |
| Tool/docs wording: “must resolve inside current workspace” / “copy into workspace before publication” | It describes the old boundary | New run-owned absolute-path contract wording | In This Change | Update shared, AutoByteus, Codex, Claude/MCP, docs, app prompts where applicable. |
| Test expectation that workspace-relative symlink escape is rejected | The new behavior explicitly accepts it if readable | New symlink snapshot success test | In This Change | This is a behavior replacement, not compatibility. |
| App exact workspace-relative-only artifact path matching | Absolute published artifact paths are valid app inputs | App-owned semantic role resolvers by producer plus filename/suffix | In This Change | Preserve received path for traceability. |
| App UI exact source-path semantic checks | Source path can be absolute and should not encode role | Semantic fields such as `publicationKind` / message kind | In This Change | Brief Studio final-artifact UI is the concrete case. |
| Singular `publish_artifact` | Already removed by prior ticket; not part of this behavior | `publish_artifacts` only | N/A | Guard against accidental reintroduction. |

## Return Or Event Spine(s) (If Applicable)

DS-002 return/event spine:

`PublishedArtifactPublicationService commits projection -> AgentRun.emitLocalEvent(ARTIFACT_PERSISTED) or fallback notifier -> AgentRunEventMessageMapper / application relay -> websocket/application handlers`

Rules:

- Emit/relay only after snapshot and projection write succeed.
- Event payload path is the canonical artifact path. For newly published artifacts this is the normalized absolute source path, including files under the workspace. Historical/test payloads may still contain relative paths, but no new publication path should be made relative solely because it is workspace-local.
- No event handler or relay should re-resolve the source path or enforce workspace containment.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: published-artifact path identity.

`raw path -> trim/normalize -> classify relative vs absolute -> resolve source absolute path -> canonicalize published-artifact absolute source identity -> return path resolution result`

Why this matters:

- It centralizes the exact policy change.
- It prevents `PublishedArtifactPublicationService` from duplicating low-level path classification/resolution inline.

Parent owner: publication service transaction.

`read projection -> snapshot source -> build next projection -> write projection -> emit/relay -> on failure delete snapshot`

Why this matters:

- Snapshot cleanup already exists and must remain correct for outside-path publication.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Tool input normalization | DS-001 | Tool facade / publication service | Enforce plural array shape and allowed fields | Keeps API contract separate from publication mechanics | Publication service would mix schema errors with source validation. |
| Run/member-run runtime authority resolution | DS-001 | Publication service | Resolve active run or fallback notifier/application context | Team-member publication can occur without standalone active run wrapper | Tool facade would become a hidden publication owner. |
| Run-owned file path resolution | DS-001, DS-004 | Publication service, file-change service | Shared low-level absolute/relative path classification and resolution; published artifacts then persist absolute source identity | Keeps the non-workspace-bound path boundary consistent without forcing published artifacts into file-change display storage semantics | Duplicated low-level path behavior would drift again. |
| Artifact type inference | DS-001 | Publication service | Infer display/application file kind from canonical path | Keeps type assignment after canonical path is known | Tool schemas/runtime surfaces would start guessing types. |
| Snapshot storage | DS-001, DS-003 | Publication/projection services | Durable revision file copy and read | Historical reads must not depend on original path | Projection store would mix metadata with file IO. |
| Projection storage | DS-001, DS-003 | Publication/projection services | Durable summaries/revisions JSON | Separates metadata persistence from publication policy | Publication service would own low-level JSON normalization. |
| Event/application relay | DS-002 | Publication service | Notify active UI/application consumers after commit | Keeps live consumers synchronized | Relays could claim artifacts that were not durably persisted. |
| Documentation/tool description sync | DS-001 | Tool contract and runtime surfaces | Keep agents from following old workspace-copy guidance | Tool behavior and prompts must agree | Agents would continue unnecessary copy-to-workspace work. |
| Application semantic role resolution | DS-005 | App reconciliation services | Map producer + relative/absolute path filename/suffix to app artifact role | Apps need semantic projection independent of workspace-relative path identity | Publication source paths would incorrectly become application role IDs. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Run-owned path resolution | `agent-execution/domain/agent-run-file-change-path.ts` precedent | Extend by extracting/updating shared run-owned file path helper | File changes and published artifacts both need non-workspace-bound path resolution, but published artifacts store absolute source identity | N/A |
| Published-artifact durable snapshot | `services/published-artifacts/PublishedArtifactSnapshotStore` | Reuse | Already copies source into run memory and supports historical reads | N/A |
| Published-artifact projection | `services/published-artifacts/PublishedArtifactProjectionStore` | Reuse | Existing summaries/revisions model supports absolute path strings | N/A |
| Application/historical reads | `run-history/services/PublishedArtifactProjectionService` | Reuse | Already reads revision text from snapshots | N/A |
| Generic frontend artifact rendering | `run-file-changes` frontend store/viewer | No change | Current generic Artifacts tab is file-change-driven and already handles absolute paths | N/A |
| Host-file allowlist/approval | None currently in published artifacts | Do not create in this ticket | User explicitly wants any readable absolute path; runtime authority remains governing boundary | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution domain | Shared run-owned file path resolution | DS-001, DS-004 | File-change service, publication service | Extend | Share low-level path classification/resolution while allowing surface-specific canonical storage/display rules. |
| Published artifacts service | Tool contract, publication policy, projection/snapshot stores | DS-001, DS-002, DS-003 | `PublishedArtifactPublicationService`, `PublishedArtifactProjectionService` | Extend | Change validation/identity only; keep durable stores. |
| Runtime tool exposure | AutoByteus/Codex/Claude/MCP descriptions | DS-001 | Tool facades | Modify | Descriptions must match new contract. |
| Application orchestration | Published-artifact relay and runtime-control reads | DS-002, DS-003 | Existing relay/projection services | Reuse | No behavior change except payload path may be absolute. |
| Frontend run-file-change artifacts | Generic Artifacts tab/file-change display | Context only | Existing file-change owners | Reuse/no change | Serves as precedent; no new UI scope. |
| Documentation/application prompts | Agent-facing instructions | DS-001 | Tool users/application authors | Modify | Remove old workspace-copy guidance. |
| Sample application artifact projection | App-specific role mapping and UI semantic usage | DS-005 | Brief Studio, Socratic Math Teacher | Modify | Accept absolute artifact paths and derive role from producer + filename/suffix. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-run-file-path-identity.ts` | Agent execution domain | Shared run-owned file path identity | Generic normalize/classify/resolve functions, including a low-level way to resolve relative inputs to absolute source paths without forcing workspace-relative display canonicalization | One shared policy used by file changes and published artifacts | N/A |
| `agent-run-file-change-path.ts` | Agent execution domain | File-change-specific path API | Preserve file-change exported function names while delegating low-level resolution to shared helper | Keeps current file-change callers stable without duplicating low-level path policy | Shared path resolution |
| `published-artifact-path-identity.ts` | Published artifacts service | Published-artifact path wrapper | Return published artifact canonical path and source absolute path with clear errors | Keeps publication-specific result/error vocabulary outside generic helper | Shared path identity |
| `published-artifact-publication-service.ts` | Published artifacts service | Publication owner | Resolve authority/memory/workspace, validate readable source, snapshot, project, emit | Existing governing owner for sequencing | Published path wrapper |
| Tool definition files | Runtime tool exposure | Thin tool schema surfaces | Updated path descriptions | Each runtime already owns its exposure schema | Shared description constant where possible |
| Tests | Validation | Behavior guards | New/updated path identity, publication, description tests | Tests map to acceptance criteria | Shared path semantics |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Relative-input and absolute-source path classification/resolution | `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-path-identity.ts` | Agent execution domain | File changes and published artifacts both need platform-aware path classification and source resolution, while each surface owns its own display/storage canonicalization | Yes | Yes | A generic filesystem permission/approval service or a file-change-only display canonicalizer |
| Published-artifact source resolution result | `published-artifact-path-identity.ts` | Published artifacts service | Publication needs a persisted absolute source identity plus the filesystem path to read and specific failure reason | Yes | Yes | A second copy of file-change path logic or a wrapper that leaks file-change workspace-relative display canonicalization |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Generic run-owned path resolution result | Yes | Yes | Low | Keep fields limited to canonical display path and source absolute path if a result object is exposed. |
| Published artifact summary/revision `path` | Yes | N/A | Low | For newly published artifacts, this means the normalized absolute source identity. Relative historical/test values may still be tolerated by app consumers, but new storage must not create workspace-relative published-artifact paths. |
| Published artifact revision `snapshotRelativePath` | Yes | N/A | Low | Continue to mean memory-relative durable snapshot path, never source path. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-path-identity.ts` | Agent execution domain | Shared run-owned path identity | Platform-aware path normalization, absolute detection, relative-to-absolute resolution, optional realpath alias handling, with file-change display canonicalization kept separate from absolute source resolution | Single source for run-owned file path semantics without forcing one surface's storage/display rule onto another | N/A |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change-path.ts` | Agent execution domain | File-change path API | File-change-specific exported names over shared low-level resolution | Existing file-change owner stays readable; no direct dependency from published artifacts to file-change internals | Shared path resolution |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-path-identity.ts` | Run file changes | Service-level re-export | Existing service import path for file-change identity | Keeps existing file-change structure unchanged | File-change path API |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` | Published artifacts | Published-artifact path API | Resolve raw publication path into normalized absolute canonical artifact path plus source absolute path, and resolve canonical paths when needed | Publication-specific absolute-storage result and errors belong here | Shared path identity |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Published artifacts | Publication service | Use new path wrapper, make workspace optional for absolute paths, validate regular file/copy, preserve snapshot/projection/event sequence | Governing owner for publish behavior | Published path API |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Published artifacts | Tool contract | Update canonical description; keep plural normalizer | One shared contract constant | N/A |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` | Runtime tool exposure | AutoByteus tool facade | Update schema description; keep context extraction/delegation | Thin tool entry remains separate | Tool contract |
| `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.ts` | Runtime tool exposure | Codex schema builder | Update path description | Runtime-specific exposure shape | Tool contract wording aligned |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.ts` | Runtime tool exposure | Claude/MCP schema builder | Update path description | Runtime-specific exposure shape | Tool contract wording aligned |
| `applications/brief-studio/backend-src/services/brief-artifact-paths.ts` | Brief Studio backend | Brief artifact role resolver | Accept relative and absolute source paths, map producer + filename/suffix to semantic rule | App role mapping belongs in app-specific resolver | Workspace-relative-only exact validation |
| `applications/socratic-math-teacher/backend-src/services/lesson-artifact-paths.ts` | Socratic Math backend | Lesson artifact role resolver | Accept relative and absolute lesson artifact paths by recognized filename/suffix | App role mapping belongs in app-specific resolver | Workspace-relative-only exact validation |
| `applications/brief-studio/frontend-src/brief-studio-renderer.js` and built UI mirror | Brief Studio frontend | Artifact presentation semantics | Use `publicationKind === "final"` rather than exact path equality | UI role decisions should use app semantic fields | Source path equality as role authority |
| `docs/custom-application-development.md` and built-in app prompt files | Documentation/prompts | Agent-facing contract docs | Remove workspace-contained/copy-first guidance | Documentation must match tool behavior | N/A |
| Tests under `autobyteus-server-ts/tests/unit/...` and focused web/docs tests if applicable | Validation | Acceptance coverage | Update old expectations and add new outside absolute tests | Maps to requirements | Shared path semantics |

## Ownership Boundaries

- Publication callers cross into the authoritative publication boundary at `PublishedArtifactPublicationService`. They must not perform independent workspace containment checks before or after calling it.
- Path identity semantics belong behind run-owned path identity helpers. Publication service may consume `{ canonicalPath, sourceAbsolutePath }`, but must not inline duplicate workspace-relative/outside-absolute logic.
- Snapshot and projection stores remain internal persistence mechanisms. Application/runtime-control readers use `PublishedArtifactProjectionService`; they must not inspect snapshot paths directly.
- Runtime tool definitions own exposure shape only. They must not encode runtime-specific path policies that diverge from the shared contract.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PublishedArtifactPublicationService.publishForRun/publishManyForRun` | Path wrapper, source validation, snapshot store, projection store, event relay | Tool facade, dynamic/MCP callbacks | Tool facade checking workspace containment or writing projection directly | Add/adjust publication service methods/input |
| `published-artifact-path-identity.ts` | Shared run-owned path helper and published-specific result shape | Publication service/tests | Publication service duplicating relative/absolute canonicalization inline | Strengthen path wrapper result/API |
| `PublishedArtifactProjectionService` | Projection store, snapshot store, active/historical metadata lookup | Application orchestration/runtime control | Application code reading `published_artifacts.json` or snapshots directly | Add projection service read method |
| Application artifact role resolver | App rule tables / filename-suffix matching | App reconciliation services and frontends | Reconciliation exact-matching workspace-relative source path strings inline | Add semantic resolver capability in the app-owned resolver file |
| Runtime tool contract constants/builders | Description/schema generation | AutoByteus/Codex/Claude exposure builders | Separate runtime wording that reintroduces workspace-only rule | Centralize wording or update all schema tests |

## Dependency Rules

Allowed:

- Tool facades may depend on the tool contract and publication service.
- Publication service may depend on published-artifact path identity, snapshot store, projection store, workspace manager, agent run manager, and application relay.
- Published-artifact path identity may depend on the shared run-owned path identity helper.
- File-change path identity may depend on the same shared run-owned path identity helper.
- Projection service may depend on projection/snapshot stores and run metadata.

Forbidden:

- No dependency from published artifacts to `run-file-changes` service files. Shared path behavior must live in the agent execution domain helper, not behind file-change service ownership.
- No tool facade or runtime-specific schema builder may enforce a different path boundary from `PublishedArtifactPublicationService`.
- No application consumer may reread the original source absolute path for published-artifact revision content.
- No singular `publish_artifact` exposure, alias, shim, or compatibility branch.
- No application handler may reject an otherwise valid published artifact solely because the event/summary path is absolute or outside the workspace.
- No platform adapter, relay, generic contract, or storage layer may require application artifact paths to be workspace-relative/app-relative as a condition for application consumption.
- No application UI may use exact workspace-relative source path equality as the authority for artifact semantic role.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `publish_artifacts({ artifacts })` | Published-artifact command | Publish one or more readable source files as run artifacts | Array of `{ path: string, description?: string | null }`; path may be workspace-relative or absolute | Relative paths require workspace root; absolute paths do not. |
| `PublishedArtifactPublicationService.publishForRun` | One artifact publication | Resolve source, snapshot, persist, emit | `{ runId, path, description?, fallbackRuntimeContext? }` | `workspaceRootPath` optional for absolute paths. |
| `PublishedArtifactPublicationService.publishManyForRun` | Batch publication | Preserve input order and shared per-artifact policy | `{ runId, artifacts, fallbackRuntimeContext? }` | No all-or-nothing batch guarantee added. |
| Published-artifact path wrapper | Source path resolution | Produce normalized absolute canonical path and source absolute path | raw path + optional workspace root | Relative path without workspace root fails; workspace-local inputs must not receive file-change-style relative canonical paths. |
| `PublishedArtifactProjectionService.getPublishedArtifactRevisionText` | Revision content read | Read snapshot text from memory | `{ runId, revisionId }` | Original source path not used. |
| `PublishedArtifactProjectionService.getPublishedArtifactRevisionTextFromMemoryDir` | Member-run/application revision content read | Read snapshot text from known memory dir | `{ memoryDir, revisionId }` | Existing application path. |
| Brief Studio artifact role resolver | Brief artifact semantic role | Map producer + source path to `artifactKind` / `publicationKind` / status rule | `{ memberRouteKey, artifactPath }`, where new core `artifactPath` values are normalized absolute source paths and direct relative historical/test fixtures are tolerated by the same resolver | Stores received path separately from semantic rule. |
| Socratic lesson artifact role resolver | Lesson message semantic kind | Map source path to `lesson_response` / `lesson_hint` | `{ artifactPath }`, where new core `artifactPath` values are normalized absolute source paths and direct relative historical/test fixtures are tolerated by the same resolver | Uses recognized filename/suffix. |

Rule check: no generic ID selector is added. Existing run/revision identity remains explicit.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `publish_artifacts` | Yes | Yes | Low | Keep plural array contract only. |
| `publishForRun` | Yes | Yes | Low | Make workspace optional but not ambiguous. |
| Published-artifact path wrapper | Yes | Yes | Low | Return a typed result instead of `null` where helpful for clearer error messages. |
| Projection service revision reads | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Publication service | `PublishedArtifactPublicationService` | Yes | Low | Keep. |
| Projection service | `PublishedArtifactProjectionService` | Yes | Low | Keep. |
| Snapshot store | `PublishedArtifactSnapshotStore` | Yes | Low | Keep. |
| Shared path resolution | Proposed `agent-run-file-path-identity.ts` | Yes | Low | Name by run-owned file path resolution, not file-change-only behavior. |
| Published path wrapper | `published-artifact-path-identity.ts` | Yes | Low | Keep but change semantics/result. |

## Applied Patterns (If Any)

- Facade: runtime tool entry files remain thin facades over `PublishedArtifactPublicationService`.
- Repository/store: projection and snapshot stores remain persistence providers behind publication/projection services.
- Shared domain utility: run-owned file path identity is extracted as a reusable domain helper for file changes and published artifacts.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-path-identity.ts` | File | Agent execution domain | Shared run-owned file path identity | File changes and published artifacts are both run-owned file surfaces | Published-artifact projection/snapshot policy |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change-path.ts` | File | File-change path API | File-change exported names over shared low-level resolution | Existing file-change domain import path | Duplicated path logic |
| `autobyteus-server-ts/src/services/published-artifacts/` | Folder | Published artifacts subsystem | Tool contract, publication, projection, snapshot, path wrapper | Existing compact subsystem layout is clear for this scope | Runtime-specific schema builders or frontend rendering |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` | File | Published-artifact path API | Published-specific source resolution and canonical path helpers | Keeps publication service focused on sequencing | File-change service imports or duplicated generic path logic |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | File | Publication service | Publication transaction and event/relay emission | Existing governing owner | Tool schema definitions |
| `autobyteus-server-ts/src/agent-execution/backends/{codex,claude}/published-artifacts/*` | Files | Runtime exposure | Runtime-specific tool definitions/descriptions | Existing backend-specific exposure layout | Publication policy |
| `docs/custom-application-development.md` | File | Public docs | Contract guidance | Existing public custom app doc | Old workspace-copy requirement |
| `applications/*` prompt/config files | Files | Application instructions | App-specific artifact instructions | Existing app source locations | General server validation policy beyond prompt guidance |
| `applications/brief-studio/backend-src/services/brief-artifact-paths.ts` | File | Brief Studio artifact role resolver | Semantic role matching for relative/absolute paths | Existing app-owned path rule file | Exact relative-only source path validation |
| `applications/socratic-math-teacher/backend-src/services/lesson-artifact-paths.ts` | File | Socratic lesson artifact role resolver | Semantic lesson kind matching for relative/absolute paths | Existing app-owned path rule file | Exact relative-only source path validation |
| `applications/brief-studio/frontend-src/brief-studio-renderer.js` | File | Brief Studio UI semantics | Use semantic artifact fields for final/draft decisions | Existing renderer owns display decision | Exact source path equality for role |
| Unit test files under `autobyteus-server-ts/tests/unit/...` | Files | Validation | Acceptance coverage | Existing test layout | Untested behavior changes |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/domain` | Main-Line Domain-Control | Yes | Low | Shared run-owned file path identity belongs with run-domain concepts. |
| `services/published-artifacts` | Mixed Justified | Yes | Low | Existing compact subsystem has clear file names for contract/service/store/path concerns; no folder split needed for this scope. |
| `agent-execution/backends/*/published-artifacts` | Transport/adapter exposure | Yes | Low | Runtime-specific schemas are adapter concerns. |
| `run-history/services` | Query/read services | Yes | Low | Projection service remains historical/application read boundary. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Outside absolute path | Input `/tmp/report/final.md` with workspace `/repo/workspace` -> stored path `/tmp/report/final.md`, snapshot under memory | Reject because `/tmp/report/final.md` is not under `/repo/workspace` | Captures the core user requirement. |
| In-workspace absolute path | Input `/repo/workspace/brief-studio/research.md` -> stored path `/repo/workspace/brief-studio/research.md` (or realpath-equivalent absolute path), not `brief-studio/research.md` | Convert to workspace-relative storage because the file happens to be under workspace | Storage identity remains absolute; apps derive role semantically. |
| Relative path with workspace | Input `brief-studio/research.md` with workspace `/repo/workspace` -> stored path `/repo/workspace/brief-studio/research.md` | Store the relative input as `brief-studio/research.md` | Relative is accepted as input convenience, not durable identity. |
| Relative path no workspace | Input `brief-studio/research.md` with no workspace -> clear failure | Guess from process cwd | Avoids hidden, unsafe path resolution. |
| Symlink escape | Input `escape/secret.txt` where `escape` points outside workspace -> store the resolved absolute source identity such as `/outside/secret.txt` (or an equivalent realpath-normalized absolute path), copy target content into snapshot | Realpath target and reject for not being under workspace | The workspace is no longer the source boundary; relative symlink inputs are still stored as absolute source identities. |
| Shared helper placement | Published artifacts and file changes both depend on low-level `agent-run-file-path-identity.ts`, while published artifacts own absolute storage canonicalization | Published artifacts import `run-file-changes/run-file-change-path-identity.ts` or inherit file-change workspace-relative display behavior | Avoids depending on another subsystem's internal boundary and avoids copying file-change display storage. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old workspace-contained validation for relative paths and add separate outside-absolute exception branch inline | Minimal code change | Rejected | Replace path identity with run-owned absolute source semantics in the path owner. |
| Keep realpath workspace containment for symlink paths | Previous safety behavior | Rejected | Accept readable symlink targets and snapshot at publish time. |
| Require agents to copy external files into workspace as fallback | Previous docs and prompts said this | Rejected | Update docs/descriptions to allow absolute paths directly. |
| Reintroduce singular `publish_artifact` while touching tool docs | Could seem related to old artifact API | Rejected | Preserve plural-only `publish_artifacts`. |
| Application revision reads live-reread original source path if absolute | Might avoid copying large files | Rejected | Keep publish-time snapshots as durable content authority. |


## Design-Impact Addendum: Application Artifact Consumer Contract

### Trigger

After implementation and API/E2E work, the user clarified that the path contract must also apply to application consumers. Since `publish_artifacts` accepts readable absolute paths from anywhere the runtime/server can access, app artifact handlers must not reject artifacts solely because their `path` is absolute or outside the workspace.

### Revised App-Level Intended Change

- Treat `PublishedArtifactSummary.path` and `ApplicationPublishedArtifactEvent.path` as source/display identity. For new published artifacts it must be a normalized absolute source path; app code may tolerate relative historical/test values through the same semantic resolver, but must not require workspace-relative paths.
- Application artifact role mapping must be app-owned semantic resolution, not exact workspace-relative path identity.
- Existing sample applications should derive roles from producer plus recognized artifact filename/suffix:
  - Brief Studio researcher: `research.md`, `research-blocker.md`.
  - Brief Studio writer: `brief-draft.md`, `final-brief.md`, `brief-blocker.md`.
  - Socratic Math Teacher tutor: `lesson-response.md`, `lesson-hint.md`.
- Application projection should preserve the received `path` for traceability. It should not rewrite an absolute path into a fake relative path merely to pass validation.
- Application UI decisions must use semantic fields such as `publicationKind`, not exact relative `path` checks.
- Platform/app boundary rule: the platform exposes the source path identity and durable snapshot; each application decides what that path means for its own workflow. This keeps future applications free to use arbitrary output folders, app-local folders, or other filename conventions without platform changes.

### Additional Data-Flow Spine

`ApplicationPublishedArtifactEvent / getRunPublishedArtifacts summary -> application artifact role resolver -> revision snapshot read -> application projection repository -> application UI / notification`

Governing owners:

- Brief Studio: `brief-artifact-paths.ts` should own mapping from producer + source path to `BriefArtifactPathRule` / semantic role.
- Socratic Math Teacher: `lesson-artifact-paths.ts` should own mapping from source path to lesson message kind.
- Reconciliation services remain projection sequencers and should not inline path parsing.

### App Role Resolver Shape

Brief Studio resolver target:

- Normalize separators and trim path.
- Build app-owned matching candidates from:
  - exact normalized path for existing relative inputs;
  - suffix after the app folder if present, e.g. `/Downloads/brief-studio/final-brief.md` -> `brief-studio/final-brief.md`;
  - basename fallback when unique for that producer, e.g. `/Downloads/final-brief.md` -> `final-brief.md` -> writer final rule.
- Match within the producer's allowed rule set. Producer remains part of the identity so a researcher path cannot project writer roles.
- Return a semantic rule with app role fields and canonical app role path, while projection persists the received published path in repository records.

Socratic resolver target:

- Normalize separators and trim path.
- Accept existing `socratic-math/lesson-response.md` / `socratic-math/lesson-hint.md`.
- Accept absolute paths whose basename or app-folder suffix maps uniquely to `lesson-response.md` or `lesson-hint.md`.

### Additional Removal / Decommission Items

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| Brief Studio exact workspace-relative-only artifact path lookup | Published artifact paths can be absolute and outside workspace | Producer + filename/suffix semantic role resolver | In This Change | Preserve received path in stored artifact records. |
| Socratic Math exact workspace-relative-only artifact path lookup | Published artifact paths can be absolute and outside workspace | Filename/suffix semantic lesson artifact resolver | In This Change | Preserve revision snapshot read behavior. |
| Brief Studio frontend `path === "brief-studio/final-brief.md"` semantic check | Absolute stored paths would fail UI final-artifact logic | `publicationKind === "final"` | In This Change | Path is display/trace, not role. |
| Design assumption that app-specific validators remain intact | User explicitly rejected workspace-relative app assumptions | Revised app-consumer contract | In This Change | Validators are replaced, not retained. |
| Workspace-relative storage for published artifacts | User clarified storage should preserve absolute source identity even for app/workspace-local files | Absolute canonical source path in `PublishedArtifactSummary.path` / revision `path` | In This Change | Relative input remains convenience only. |

### Additional Tests / Validation

- Unit tests for `resolveBriefArtifactPathRule(...)` with relative paths, absolute app-folder suffix paths, and absolute basename-only paths.
- Brief Studio reconciliation tests proving absolute researcher/writer paths project correctly and store the received absolute path.
- Brief Studio renderer test or equivalent proving final-artifact behavior uses `publicationKind` for absolute final paths.
- Unit tests for `resolveLessonArtifactPathRule(...)` with relative and absolute lesson artifact paths.
- Socratic reconciliation test proving absolute lesson-response/hint paths insert the correct message kind.
- API/E2E validation should include app projection of at least one outside-workspace absolute artifact path, not only core publication success.
- Storage tests should prove workspace-relative publish inputs and in-workspace absolute inputs both persist absolute paths.

### Compatibility Rejection

Do not keep exact relative-only app validators as a fallback path. They are the old assumption being replaced. Exact relative paths remain accepted because the new semantic resolver includes them as one candidate form, not because the old validator remains authoritative.

## Derived Layering (If Useful)

- Tool exposure layer: AutoByteus BaseTool, Codex dynamic tool, Claude/MCP tool definitions.
- Publication domain/control layer: `PublishedArtifactPublicationService` and path identity wrapper.
- Persistence layer: projection and snapshot stores.
- Read/query layer: `PublishedArtifactProjectionService` for application/runtime-control reads.

Layering follows ownership only; tool exposure must not bypass publication service into stores.

## Migration / Refactor Sequence

1. Add/update shared run-owned file path identity helper under `agent-execution/domain` so published-artifact source resolution returns normalized absolute source paths. File-change may keep its own display canonicalization where needed, but published-artifact storage must not reuse workspace-relative display identity.
2. Update `agent-run-file-change-path.ts` to delegate to the shared helper while preserving file-change-specific exported API names and existing file-change tests.
3. Refactor `published-artifact-path-identity.ts` to use the shared helper and expose published-artifact-specific resolution helpers:
   - raw path + optional workspace root -> normalized absolute canonical path + source absolute path;
   - canonical path + optional workspace root -> source absolute path when needed.
   - The implementation must not call a shared helper mode that canonicalizes workspace-local paths to relative display paths for the published-artifact stored `canonicalPath`.
4. Update `PublishedArtifactPublicationService`:
   - require memory dir as before;
   - resolve workspace root only when available;
   - do not fail solely because workspace root is absent;
   - fail relative paths without workspace root with a clear error;
   - resolve relative paths with workspace root to absolute stored paths;
   - remove realpath workspace containment check;
   - validate source with `fs.stat(sourceAbsolutePath).isFile()` and snapshot/copy failure handling;
   - store absolute canonical paths in summaries/revisions;
   - keep projection write, snapshot cleanup, event emission, and application relay sequencing.
5. Update tool descriptions and schemas for AutoByteus, Codex, Claude/MCP, and the shared contract.
6. Update docs/application prompt wording to remove workspace-contained/copy-first instructions while preserving app-specific artifact naming guidance without implying workspace-relative-only paths.
7. Replace sample application relative-only artifact path validators with semantic role resolvers that accept absolute paths by producer plus recognized filename/suffix.
8. Update app frontend logic that uses exact path comparisons for semantic decisions to use app semantic fields such as `publicationKind`.
9. Update tests:
   - add shared path identity tests;
   - preserve file-change identity tests;
   - update published-artifact publication tests for outside absolute success, no-workspace absolute success, relative-no-workspace failure, symlink escape success, source deletion snapshot read, invalid path cleanup;
   - update runtime tool description tests;
   - preserve plural-only exposure tests.
10. Run focused server unit tests, app projection tests, frontend/app renderer tests where applicable, and relevant docs/schema search checks. Run broader server/web test suites if implementation changes touch generated schemas or frontend code.

No temporary compatibility seam remains at the end.

## Key Tradeoffs

- Snapshot at publish time vs live reread:
  - Chosen: snapshot at publish time.
  - Reason: existing durable application contract already works this way and avoids historical dependence on arbitrary outside paths.
- Shared generic path helper vs importing file-change path helper from published artifacts:
  - Chosen: shared low-level path resolution, with published-artifact storage using absolute canonical source identity.
  - Reason: file-change display canonicalization and published-artifact storage identity are related but not identical; published artifacts must not inherit workspace-relative display storage.
- Absolute outside paths displayed as full absolute paths vs redaction:
  - Chosen: preserve normalized absolute path.
  - Reason: user said absolute paths are more accurate; file changes already display them.

## Risks

- Agents with `publish_artifacts` can snapshot any server-readable absolute file. This is intentional for this requirement but should be understood as runtime/server filesystem authority.
- Full absolute paths may expose host path details to application consumers. This mirrors existing file-change behavior and is accepted for accuracy.
- Very large files can be snapshotted. This ticket does not add size limits; existing snapshot behavior already has this characteristic for in-workspace files.
- Changing symlink escapes from rejection to acceptance is intentional but should be covered with an explicit test to avoid accidental reversion.

## Guidance For Implementation

- Keep the implementation clean-cut. Do not leave old workspace-contained validation as a fallback or optional branch.
- Prefer a typed path-resolution result over multiple nullable helper calls so `PublishedArtifactPublicationService` receives one authoritative `{ canonicalPath, sourceAbsolutePath }` result.
- For published artifacts, `canonicalPath` is the normalized absolute source identity that will be persisted. If the shared helper also serves file changes, keep file-change workspace-relative display canonicalization behind file-change-specific APIs and do not feed it into published-artifact storage.
- Use error messages that distinguish:
  - relative path cannot be resolved without workspace root;
  - path does not resolve to a readable file;
  - snapshot/copy failed.
- Do not change `PublishedArtifactSummary.path` field name or add a parallel `absolutePath` field. Its meaning becomes the canonical absolute source path for published artifacts.
- Do not add singular tool names or compatibility aliases while editing tool descriptions/tests.
- Do not keep app-specific exact relative-only path validators intact. Replace them with app-owned semantic artifact role resolvers that accept absolute paths while preserving role-specific filenames and producer constraints.
