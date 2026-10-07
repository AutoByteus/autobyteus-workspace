# Design Spec — Project workspace paths

## Solution And Approval Basis
- Package: `project-workspace-path`; current solution revision: **SR-003**; design status: **Ready**.
- Approved requirements: **SR-002 / AP-001**, user reply **“approve”**, 2026-10-07, to the explicit path/description-only, no-new-migration, absolute-path, registration/existence-independent scope. Subsequent “continue” resumes work without changing scope.
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/requirements-doc.md`.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/investigation-notes.md` (E-001–015, AE-001–011).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`; branch `codex/project-workspace-path`; refreshed base `origin/personal` at `5316a0cad19498819a8a50c594b72c0197d8b6a1`. Finalization target `origin/personal`; no release requested.
- Authorities read, 2026-10-07: full skill `references/architecture-design.md`, `design-principles.md`, design-spec template; full root `DESIGN.md`, `TESTING.md`; server `docs/design/data_migration_guideline.md`; root/server/web `AGENTS.md`. Skill root is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/` (not present in task worktree). No closer DESIGN.md found. No authority conflicts. Design examples not needed.
- Behavior-defining supplements/Product package: **N/A — not applicable**. Independent architecture/code reviews: **N/A — not applicable yet**, no pass assumed.

## Current-State Read
ProjectService already owns Project mutation invariants and the catalog-serialized store. Native and MCP tools share a schema/parser/manifest. The mismatch is end-to-end: input rows, service membership, stored links, GraphQL, feed and frontend identity all use workspaceId. Persistence also contains the root path, so the needed fact already exists. UI manual-path authoring currently registers the folder then submits its ID. Project view generation sorts on per-link addedAt and resolves availability through registry ID. Those are in-scope model dependencies, not reasons to retain IDs/timestamps or introduce a migration. See AE-001–007.

## Task Size And Architectural Risk
- **task_size: Medium.** Coordinated change across existing Project tool/service/store/API/feed/frontend owners, one narrow workspace-manager read accessor, a frozen historical classifier and their tests/docs. No new feature subsystem or run lifecycle. File count includes mechanically updated consumers/fixtures, not architectural breadth by itself.
- **architectural_risk: High.** Material public native/MCP and GraphQL contract changes, persisted association projection change and strict live-feed/web cutover; wrong reader would lose links, and changing a released migration's imported classifier could alter conflict recognition. No new migration does not make these contracts Low risk.
- Payload inventory: docs, localized strings, test fixtures and snapshots. Structural inventory: actual tool/API contracts, Project model/service/persistence, manager read interface and UI consumption. The current structures cannot consume a new payload unchanged, so this is not content-only Low risk.
- Escalation: return Design Impact for new owners, migration/rollout dependency, alias/normalization requirement or missed consumer beyond this map. Changed intended behavior, registration/existence policy or data-loss obligation is a Requirement Gap requiring renewed approval.

## Architecture Investigation Evidence
| Evidence | Exact sources (workspace-relative) | Supports | Uncertainty |
| --- | --- | --- | --- |
| AE-001/002 | server `src/agent-tools/project-tasks/`, `src/projects/services/project-service.ts` | Shared tool contract and retained Project authority | No runtime execution yet |
| AE-003/008–010 | server `src/projects/stores/project-store.ts`, `src/app-data-migrations/migrations/projects-per-folder-v1/`, checked-in fixtures listed in notes | Tolerant two-field projection; freeze predecessor classifier; no new migration | Installed data/volume not inspected |
| AE-004 | server `src/workspaces/{workspace-manager,workspace-registry-store,workspace-registry-file-persistence,workspace-path-utils}.ts` | Metadata-only path validation and registration snapshot | OS-specific execution is validation-owned |
| AE-005–007 | server `src/api/graphql/types/projects.ts`, `src/projects/changes/`; web Project editor/entry/panel/types/store/queries | Coherent transport/UI cutover | Old clients intentionally unsupported |
| AE-011 | existing owner unit, API, restart, feed and browser suites | Reuse coverage surfaces and fix obsolete assertions | No pass claimed |

## Intended Change
A Project workspace association is a folder-path reference plus a description, not a foreign key into workspace registration. Tool users supply `workspace_path`; domain/API/JSON use the already-existing `workspaceRootPath`. Picker and manual entry both produce the same path. Retain ProjectService as mutation authority. Keep workspace registration/runtime IDs outside this feature unchanged.

## Relevant Behavior And Production-Path Map
| Behavior | Kind / scenarios | Approved requirements / ACs | Trigger / preserved outcome | Target path |
| --- | --- | --- | --- | --- |
| BEH-001 | User, SCN-001/002 | REQ/AC-001/003 | Selected agent creates or explicitly patches Project; strict arguments, same permissions and honest acknowledgement | DS-001 |
| BEH-002 | System/User, SCN-001/003 | REQ/AC-002/004/005 | Save/reopen existing Project; paths/descriptions and Task data survive with no migration sweep | DS-001/002/003 |
| BEH-003 | User, SCN-002/003 | REQ/AC-003/004/005 | Omitted list preserves; supplied list replaces; [] unlinks; retained description omission preserves; no directory operations | DS-001/002/004 |
| BEH-004 | User, SCN-004 | REQ/AC-006 | Direct absolute path or picker-selected root; no registration/existence prerequisite | DS-001/002 |
All four scenarios have an approved supported product basis. No corruption-recovery, arbitrary internal-ID import, filesystem move tracking, symlink-identity or cross-OS path translation scenario is introduced.

## Relevant Supplemental Task Artifacts
None. Historical completed `tickets/done/create-or-update-project-tool/` is read-only investigation context, not current approval. Canonical supplement inventory is in investigation notes.

## Task Design Health Assessment
- Change posture: **Behavior Change / bounded model-and-contract refactor**.
- Design issue: **Yes**. Root cause: **Shared Structure Looseness** and **Boundary Or Ownership Issue**—a redundant registry ID in Project association data makes a descriptive path reference depend on registration; UI Save performs that registration itself.
- Refactor needed now: **Yes, bounded**. Shared-structure tightness, legacy cleanup and persisted-data triggers fire (AE-002/003/006). The existing authoritative service and folder ownership remain correct; no service hierarchy/file-placement overhaul required.
- Response: reduce persisted and command identities to path, remove registration from authoring, preserve read-time registration status without imposing it on writes, and remove all current Project ID/timestamp branches.
- No new cache, migration runner, universal workspace abstraction, generic reconciliation or global-ID rewrite. No speculative performance program. Residual operational limitation: matched backend/frontend deployment, not backward compatibility with old clients or binaries.

## Terminology
`workspace_path`: tool argument; `workspaceRootPath`: canonical domain/API/JSON field for the same folder path. `availability`: existing registration-membership projection, not filesystem existence/access. Project identity (`project_id`/`projectId`) is unchanged.

## Legacy Removal Policy
No backward compatibility; remove replaced current Project code paths. Unknown extra JSON fields are ignored by the single current reader; this is not an old/new decoder. Reject old workspace_id tool rows and workspaceId GraphQL inputs. Do not put a path into a field called workspaceId or generate synthetic IDs for Project associations. Historical classifiers are migration-owned only.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration.**
- Stored subject: `<appData>/projects/<projectId>/project.json`, workspaces array. Existing entry has `{workspaceId, workspaceRootPath, description, addedAt}`; new entry has `{workspaceRootPath, description}`. Project-level fields and physical layout unchanged. Volume unknown and irrelevant to a no-sweep transition.
- Meaning preserved: existing root remains the recorded folder path; existing description remains its description. No path rename, ID-to-path reconstruction or relocation. Per-link ID/addedAt are explicitly obsolete under AP-001. Input descriptions default to `""`; stored description remains a required string.
- Current reader: validate Project envelope as now; for each link require only nonempty string workspaceRootPath and string description, then construct the exact two-field projection. Ignore all other keys, regardless of their presence/value. No workspaceId/addedAt validation, no versions/fallbacks. Preserve stored path strings on read; do not resolve/rewrite old files or normalize all history at startup. Invalid required fields continue to filter unusable link rows under the existing tolerant policy.
- Current writer: construct exactly `{workspaceRootPath, description}` for each link, never spread input/view data. An ordinary Project save naturally drops obsolete keys for that Project; listing/reading alone changes no file. Task files, context, assignments, physical directories and workspace registry remain untouched by association writes.
- Evidence: current source/writer pin b61b8452... and rich predecessor fixture `/work/site` with description `repo` already supply both fields (AE-009). Archived-writer fixture with no links is supporting Project continuity evidence only, not proof of links.
- No new ledger entry, backup, version tag, journal, startup sweep or readiness gate. Existing atomic file writer/catalog lock suffice. No empty-data reset or eager cleanup.

### Mandatory Migration-Convention Checklist
1. Need: subtractive projection; no new data fact or meaning, so no new migration.
2. Availability: no added startup dependency; existing Projects-only old-array gate remains unchanged.
3. Source/target: current four-field entries, frozen released array shape and rich fixtures inspected. Current store admits the reduced projection.
4. Dispositions: current superset and reduced entries are admitted by the same reader. Required-field-invalid rows retain existing filtering; no guessing. Existing migration warning/conflict/exclusion dispositions unchanged (AE-010).
5. Commit/retry: ordinary Project atomic write and lock; no multi-file change introduced. Old reads do not write. Existing old-array conversion retry remains its own concern.
6. Current-only boundary: **before modifying readProjectFile**, add migration-owned `released-project-folder-v1.ts`, freezing the exact pre-change Project target type/reader projection and link requirements from the pinned base. Replace only the existing migration's readProjectFile classifier/equality/post-write validation imports/calls with this frozen reader. Do not make it import current ProjectWorkspaceLink. Preserve that migration's established four-field output, id, ledger/dispositions and source-retirement behavior. Its output is a harmless superset for current runtime. ProjectsLayout/readTaskFile are unchanged; no need to fork unchanged code merely by proximity.
7. Cost: zero new historical read/write passes at startup. Normal requested Project read/write only. No copy/hash journal.
8. References: workspace association becomes a path value, not a typed registry foreign key. Project/Task/context references and containment stay unchanged.
9. Evidence required: old-superset and path-only persistence/read-no-write fixtures; exact ordinary writer keys; restart/unchanged Task data; existing migration conflict/retry/warning/startup tests. No customer-data proof claimed.
10. Lessons/review: canonical §§3/4/7 and closest Projects migration inspected; avoid generic migrations and startup lockout. High architectural risk is submitted to the configured independent review route.

### Migration Plan
N/A — no new transformation. Freezing the **existing** registered migration's classifier protects its released behavior; it is not a new migration and does not rerun terminal conversions. A reduced file beside an unfinished legacy source remains a conflict under the frozen classifier rather than being guessed equivalent; the existing warning/preservation policy handles that condition.

## Data-Flow Spine Inventory
| ID | Scope | Behaviors | Start → end | Governing owner / purpose |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001/002/003/004 | User-requested tool call → durable Project + compact acknowledgement | ProjectService realizes path authoring through shared native/MCP contract |
| DS-002 | Primary end-to-end | BEH-002/003/004 | Project editor / direct unlink → durable Project + rendered saved view | ProjectService; editor owns only UI draft |
| DS-003 | Primary end-to-end read | BEH-002 | User opens/reloads Project → path rows and Task counts | ProjectService read view from tolerant store |
| DS-004 | Return-event | BEH-002/003 | Committed Project mark → strict feed → frontend Project state | Existing change publisher/hub, no scheduler change |
| DS-005 | Bounded local | BEH-001/003 | Catalog-locked current record + normalized requested paths → whole validated replacement | ProjectService mutation under ProjectStore lock |

## Primary Execution Spines / Narratives
- **DS-001:** user asks selected agent → native tool or scoped MCP adapter → shared shape parser/manifest → ProjectService create/patch record → catalog lock and exact ProjectStore write → existing projectChanged mark + compact path-based acknowledgement. No registration/read-time availability on the command/ack path.
- **DS-002:** user selects workspace or types folder path / clicks unlink → editor or panel supplies path → projectStore GraphQL mutation → ProjectResolver → ProjectService → locked exact Project write → path-based view → existing navigation/notice. Picker does not add an extra registration step; manual Save does not call workspaceStore.createWorkspace.
- **DS-003:** user opens/reloads Project → projectStore query → ProjectResolver → ProjectService → ProjectStore tolerant read → display-name and registration-status projection → GraphQL → existing path rows. List views obtain one registration root snapshot per request, not one full scan per link.
- **DS-004:** committed ProjectService mark → publisher's existing settled asynchronous read via ProjectService → `projectWire`/strict schema → existing websocket hub/feed → projectStore → rendered rows. Counts/Task flows/publication serialization are preserved.
- **DS-005:** normalize supplied paths → under catalog lock find current Project/name uniqueness → canonical-path duplicate check and description merge → build complete replacement → one Project commit. Any invalid row/duplicate throws before commit. This is local write sequencing, not a new state machine.

## Spine Actors / Ownership / Thin Entry Facades
| Node | Owns | Must not own |
| --- | --- | --- |
| Native/MCP shared contract + adapters | Public snake_case shape/type validation, mapping and errors | Registry resolution, independent persistence, duplicate membership policy |
| Project editor/entry/panel + projectStore | Draft/path selection, node-bound request/navigation/state | Registration as part of Save, backend path interpretation, direct app-data writes |
| ProjectResolver | Typed GraphQL boundary and error translation | Business mutation rules |
| **ProjectService** | Project name/identity, normalized-path membership/duplicates/merge, availability view and post-commit mark | Filesystem creation, provider runtime activation |
| ProjectStore | Project/Task admission, exact JSON, catalog lock, atomic persistence/layout encapsulation | Migration discovery outside existing gate, registry IDs as link authority |
| WorkspaceManager | Read-only snapshot of registered filesystem root paths via its private registry store | Project membership or mutation permission |
| Publisher/feed | Existing commit-to-view propagation and reconnect | New schema fallback or persistent association state |
Wrappers remain thin; none acquires a second authoritative store. Natural subject names retained: Project, ProjectWorkspaceLink, ProjectWorkspaceInput, ProjectService, ProjectStore.

## Removal / Decommission Plan
| Remove | Replacement | Scope |
| --- | --- | --- |
| workspace_id input, workspaceId command/link/ack/GraphQL/feed/web association fields | workspace_path tool; workspaceRootPath elsewhere | This change |
| Link addedAt and toView timestamp sort | Stored/list input order; updates retain positions, add appends, remove retains others | This change |
| Registered-ID admission and WORKSPACE_NOT_REGISTERED Project mutation branch | Absolute path validation + canonical duplicate check | This change |
| Editor manual-path createWorkspace call and ID-based query/row selection | Path value emitted by both modes | This change |
| Unused `web/utils/projects/linkableWorkspaces.ts` and its test (AE-007) | Actual editor path-choice logic | This change; no new generic helper |
| Existing migration's dependency on current Project link classifier | Frozen migration-owned pre-change Project reader/type | This change |
No deletion of global workspace ID infrastructure, old data files, existing migration/ledger, unrelated helpers or Task behavior.

## Off-Spine Concerns / Boundaries / Dependency Rules
| Concern | Serves | Reuse / risk control |
| --- | --- | --- |
| Pure path canonicalization | ProjectService command boundary | Existing `workspace-path-utils.ts`; don't alter its global behavior for this task |
| Registry path projection | ProjectService read view | New narrow read-only `WorkspaceManager.listRegisteredWorkspaceRootPaths()` over `workspaceRegistryStore.listEntries()`, filtering filesystem-ID prefix just as existing registered lookup does; no cleanup/activation/stat/mutation |
| Frozen historical reader | Existing Projects migration | Migration-owned only; current runtime must never import it |
| Error/localization | GraphQL + tool + web | Existing ProjectError/error-key mapping; one `WORKSPACE_PATH_INVALID` domain error |
| Tests/docs | Each owner | Existing suites and module docs, no new framework |
Project callers use ProjectService, not service plus ProjectStore/WorkspaceRegistryStore. ProjectService uses WorkspaceManager public root snapshot; never reaches manager internals or computes a hash as membership authority. Workspaces subsystem continues to own its registry. Web stays independent of server/core code; host-native path validation is server-owned. Reuse pure path utilities, not filesystem/explorer lifecycle. Existing folder layering is already clear.

## Interface Boundary Mapping / Check
| Interface | Identity / target contract | Singular responsibility / selector risk |
| --- | --- | --- |
| create_or_update_project | `{project_id?, name?, description?, workspaces?: [{workspace_path, description?}]}` | Yes; explicit Project ID vs folder path; no aliases |
| ProjectWorkspaceInput / aggregate GraphQL form input | `{workspaceRootPath: string, description?: string \| null}` | Yes; service full-form null/omission policies stay as now |
| Add/update/remove workspace command/API | `{projectId, workspaceRootPath, description?}` (remove has no description) | Yes; selects association by path, update changes description; path replacement uses aggregate list |
| Saved ProjectWorkspaceLink | `{workspaceRootPath: string, description: string}` | Yes; no optional ID/time |
| Read ProjectWorkspaceView / GraphQL / feed | Saved fields + `displayName`, `availability` | Yes; enrichment never persisted |
| WorkspaceManager root snapshot | `Promise<string[]>` of registered filesystem roots | Yes; no Project authority, no registry object leak |
All ambiguous selector risks Low after clean cut: no argument accepts either path or ID. Project-level identity remains separate.

## Concrete Path, Mutation And UI Decisions
1. **Command validation in ProjectService:** local pure normalizer checks string, trim, nonblank, NUL rejection and host `path.isAbsolute` **before** calling existing `canonicalizeWorkspaceRootPath`. Error `WORKSPACE_PATH_INVALID` is actionable. This does not stat/access/realpath/mkdir/register. No relative/tilde/URI expansion; no case folding or symlink alias policy. Tool parser enforces strict row keys/types/description rules; service owns canonical duplicates for every caller (raw-string duplicate-only policy is insufficient).
2. **Membership/merge:** normalize all requested paths, reject duplicates after normalization under existing write semantics, match current canonical recorded paths. New descriptions default empty; tool-patch retained omission preserves; explicit blank clears. GraphQL full form retains its existing clear-on-omitted-link-description semantics; editor sends all descriptions. Preserve all omitted top-level metadata/list semantics. Invalid combined metadata/path patch commits nothing. Remove uses the same path normalizer.
3. **Reader/writer separation:** historical/current rows share a single path/description projection. Do not impose new filesystem or host-platform command checks on stored reads or derive path from obsolete ID; existing supported writers already canonicalized roots. No NUL/relative incoming command can reach a new save. No historical repair/deduplication is introduced.
4. **Ordering:** read and render stored array order. Full list replacement order becomes the desired order; retained single-link description edits keep position, add appends, unlink preserves other positions. Removal of per-link timestamps is deliberate; do not synthesize timestamps or preserve a hidden legacy sorting path.
5. **Availability:** preserve AVAILABLE/UNREGISTERED as **registry membership**, by path. `listRegisteredWorkspaceRootPaths` reads a path snapshot without creating FileSystemWorkspace instances or temp cleanup. ProjectService obtains it at most once per list/detail/view request, builds an ephemeral Set, then tests each link. Skip when no links. One O(W) snapshot plus O(L) membership across the requested views; no cache or new persisted index. Command record acknowledgement does not require it. Do not reinterpret AVAILABLE as folder exists; missing/unregistered paths remain valid associations. Existing refresh/reconnect behavior is unchanged, no new registration event subscriptions.
6. **Frontend shape:** `ProjectWorkspaceDraft` holds UI key/mode, one `workspaceRootPath`, description/error and optional original path-view. Both `<select>` option values and text input bind to the path; choices project existing metadata to path/displayName. Original unregistered path remains selectable/editable. Deduplicate exact candidate paths and exclude paths chosen in other rows as presentation aid; backend normalized duplicates stay authoritative. Do not import node/server path code into web or validate according to the browser's OS (node may be remote).
7. **Submit/error:** send root/description rows directly; remove registration loop. Name-only/no-link flows still work. Existing choice listing may load as now, but successful registration is never a Save prerequisite. Add localized absolute-path error and change `New folder` label to `Folder path`/`文件夹路径` so no folder-creation promise. No layout redesign. Registration availability copy remains truthful.
8. **UI identity:** Vue keys, busy state, edit targeting and unlink use workspaceRootPath. Use router query `{workspacePath: link.workspaceRootPath}` and read the same key; router handles encoding of spaces, `#`, `?`, unicode, slash/backslash. No legacy ID-query fallback. Tests use stable row selectors plus data-path/DOM state rather than assuming ID suffixes are CSS-safe. Numeric draft key still owns input element/focus IDs. ProjectStore sends path fields to existing mutation names.
9. **Errors/results:** remove obsolete Project WORKSPACE_NOT_REGISTERED mapping once no Project code uses it; preserve duplicate/not-found error codes and native/MCP envelope conventions. Acknowledgement `workspaces` contains saved workspaceRootPath/description, no ID/time or availability. Preserve existing unconfirmed-write error semantics; do not turn read-after-commit failure into a rollback claim.
10. **Tool/transport cutover:** one shared parser/manifest for native/MCP, unchanged selection/configuration. GraphQL decorators/fragments, strict feed wire projection and web types change in the same source package. No compatibility aliases/dual readers. No new list_projects/discovery behavior.

## Existing Capability / Subsystem Reuse Check
| Need | Decision / owner |
| --- | --- |
| Path association rules | Extend existing ProjectService, no new service |
| Exact persistence and locked partial update | Reuse ProjectStore and store-utils |
| Normalization | Reuse workspace-path-utils with ProjectService's absolute-path guard |
| Read-only registration status | Extend WorkspaceManager's existing public read boundary; existing registry store unchanged |
| UI path draft/picker | Modify existing editor/entry; no Product Design or new route |
| Historical classifier isolation | Add one frozen file inside existing migration directory, no migration definition |

## Draft And Final File Responsibility Mapping / Target Paths
Prefix server paths below with `autobyteus-server-ts/`, web paths with `autobyteus-web/`. Existing boundaries stay; the tightened shared association types remove redundant fields rather than creating a new overlapping abstraction. No rename/move required.
| Change | Paths | Final responsibility / boundary |
| --- | --- | --- |
| Modify | server `src/projects/domain/{models,project-errors}.ts` | Two-field association, explicit path commands, new invalid-path error; Task types unchanged |
| Modify | server `src/projects/services/project-service.ts` | One command normalizer; canonical membership/merge/direct ops; read-time path availability and list order |
| Modify | server `src/projects/stores/project-store.ts` | Single tolerant path/description reader + exact writer; unchanged locks/layout/Task readers |
| Modify | server `src/workspaces/workspace-manager.ts` | Pure registered-root snapshot boundary, no Project mutation rules |
| Modify | server `src/agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest}.ts` | Strict path argument schema/mapping/ack/docs; native/provider wiring stays shared |
| Modify | server `src/api/graphql/types/projects.ts`, `src/projects/changes/project-change-messages.ts` | Current path command/view/wire contracts; no ID/time fields |
| Add | server `src/app-data-migrations/migrations/projects-per-folder-v1/released-project-folder-v1.ts` | Frozen pre-change Project target projection/types only, provenance pin |
| Modify | server sibling `projects-per-folder-v1-app-data-migration.ts` | Use frozen Project classifier at existing classifier/equality/post-write sites; keep behavior/id unchanged |
| Modify | web `types/{project,projectWorkspaceDraft}.ts`, `graphql/queries/projectQueries.ts`, `stores/projectStore.ts` | Path view/input/draft identity and unchanged mutation names |
| Modify | web `components/projects/{ProjectEditor,ProjectWorkspaceEntry,ProjectWorkspacesPanel,ProjectWorkspaceRow}.vue` | Path picker/manual save, edit/unlink/query/key handling; preserve layout/notice/focus |
| Modify | web `utils/projects/projectErrorMessageKey.ts`, `localization/messages/{en,zh-CN}/projects.ts` | Current path-validation errors and truthful input labels |
| Remove | web `utils/projects/linkableWorkspaces.ts`, `utils/projects/__tests__/linkableWorkspaces.spec.ts` | Unused superseded ID-only selection policy; actual editor owns choices |
| Modify/add focused cases | server unit `projects/{project-service,project-store-per-folder}.test.ts`, `agent-tools/project-tasks/project-task-tools.test.ts`, `api/graphql/projects-schema.test.ts`, `workspaces/workspace-manager.test.ts`, `app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts`; existing feed tests | Owner-level invariants, old-superset continuity, pure registration snapshot, frozen conflict classifier |
| Modify/add focused cases | server E2E `projects/{project-task-boundaries,project-mutation-node-locality,projects-graphql,project-change-feed,projects-startup-migration}.e2e.test.ts`; relevant fixture tool calls; web Project component/store tests and `tests/e2e/projects-feature-probe.mjs` | Native/MCP/API/feed/UI/restart proof; eliminate ID/registration-dependent assertions on Project associations, not runtime workspace tests |
| Modify | server `docs/modules/{projects,agent_tools_mcp_server}.md`; web `docs/projects.md`; root TESTING.md if commands/coverage change | Durable current contract and validation instructions, no copied ticket spec |
Any indirect fixture in Task closure/reactivation/ad-hoc suites that authors a Project link must use new Project inputs; their Task behavior assertions remain. Search current source/tests/docs for stale Project workspace_id/workspaceId/addedAt, distinguishing global workspace use and frozen historical fixtures. Generated GraphQL currently has no ProjectWorkspace declaration; do not hand-edit unrelated generated schemas to satisfy an assumed need.

## Reusable Owned Structures / Tightness / Folder Boundary Check
ProjectWorkspaceLink is the single server persisted association; ProjectWorkspaceInput is the same subject's legitimate optional-description command variant; view adds only ephemeral display/registration fields. Web mirrors transport, not a server import. No new generic shared folder. Server `agent-tools` and `api/graphql` are transport, `projects/services` domain, `projects/stores` persistence, `workspaces` registry ownership, migration directory historical boundary, web components/stores presentation/transport. These separations already fit; no over-splitting needed. Applied patterns: existing service/repository/adapters only.

## Concrete Examples
Tool: `{"name":"Website","workspaces":[{"workspace_path":"/work/site","description":"Source"}]}`.
Saved workspace entry / tool acknowledgement entry: `{"workspaceRootPath":"/work/site","description":"Source"}`.
GraphQL input: `{"projectId":"project_...","workspaceRootPath":"/work/site"}` for unlink.
Historical `{"workspaceId":"old","workspaceRootPath":"/work/site","description":"Source","addedAt":"..."}` is read through the same two-field projection, without detecting a version; read leaves its bytes unchanged. Avoid `{workspaceId:"/work/site"}` or automatically registering `/work/site` to recover an ID.

## Backward-Compatibility Rejection Log
| Candidate | Decision / clean cut |
| --- | --- |
| Accept workspace_id alongside workspace_path | Rejected; current tool uses path only |
| Retain optional workspaceId/addedAt in current runtime/wire | Rejected; remove fields and their consumers |
| Derive/hash synthetic ID or resolve path via registry during Save | Rejected; association is already a path value |
| Versioned old/new Project decoder or fallback to ID | Rejected; one known-field projection suffices |
| Bulk migration/cleanup/startup scan | Rejected; required facts already present, user approved no migration |
| Remove/relax released migration classification when reader changes | Rejected; freeze existing historical contract, not a runtime compatibility layer |
| Old frontend/backend interop | Rejected; coordinated current contracts, no dual API |

## Derived Layering
N/A as a separate mechanism; existing transport → ProjectService → ProjectStore layering and WorkspaceManager read boundary are sufficient.

## Change / Refactor Sequence
1. Freeze existing migration Project classifier at pinned source; switch only that migration's imports/calls; preserve tests proving pre-change conflict/retry dispositions.
2. Tighten Project types, exact store projection, service normalizer/commands/order, root-snapshot accessor and owner tests. Do not touch global workspace registration behavior.
3. Update shared tool/ack, GraphQL and strict feed shape together; build current server types and add direct-path/no-side-effect assertions.
4. Update web transport/drafts/editor/entry/panel/rows/localized errors; remove registration-before-save and unused ID helper. Adapt existing tests/fixtures, not production fallback aliases.
5. Execute focused unit/API/restart/feed and browser regressions with owned data/current builds. Sync docs and verify no obsolete current Project consumer remains. Downstream specialists own implementation, independent source review if routed, executable coverage, delivery and user verification.
6. Deliver matched backend/web assets through ordinary repository process. No release requested, no special migration rollout/ledger reset. No support for concurrent old/new binaries writing the same profile or automatic rollback to old ID-required readers after new saves.

## Verification Guidance (Not Executed Here)
- Server owner unit runs: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/api/graphql/projects-schema.test.ts tests/unit/workspaces/workspace-manager.test.ts tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts --no-watch`.
- Required cases: absolute path/no description; unregistered AND nonexistent path accepted without registry/folder writes; relative/blank/NUL/wrong type/unknown keys reject; canonical duplicate aliases reject whole combined patch; omitted/blank/replacement/[] semantics; description retention; two-key disk/ack entries; root path with spaces/unicode/query-significant characters; registered/unregistered view status by root; no synthetic ID lookup.
- Store continuity: both current two-field and faithful prior four-field Project links, read byte-identical, normal save drops obsolete keys, Tasks/context/resources byte-identical; description-only ordinary save also drops ignored extras; no startup sweep/new migration record.
- Existing migration coverage: frozen classifier distinguishes conflicting old workspace metadata, ordinary retry/terminal no-op/dispositions retained; migrated old superset is usable by current store. Both supported startup entrypoints per TESTING.md. Never alter frozen source fixtures to hide a regression.
- Rebuild with `pnpm -C autobyteus-server-ts prebuild` then `build` before built-process E2E; serialize builds. Run relevant Project API suites and the gated feed suite per TESTING.md. Node-locality now proves equal folder strings are node-local references accepted without registration on each node, not rejection because another node holds the ID. Preserve Project data isolation and permissions.
- Web focused Project/store/error-map tests and `pnpm -C autobyteus-web test:e2e:projects --output-dir=<fresh absolute ticket evidence directory>` prove picker→path, typed path→same JSON, edit/unlink/reload, rejected duplicates, no createWorkspace request and no registry/folder changes from Save. Preserve existing notice/navigation/unavailable-link editing. Run relevant live feed/browser coverage when needed.
- Web-equivalent browser evidence is not packaged-desktop/full product proof. If claiming full real-product journey, use newly built isolated desktop per TESTING.md. No user's running app/data, no installed pre-change build. Keep truthful skipped/environment limits and owned cleanup receipts; a known baseline failure requires explained disposition/fix under TESTING.md.

## Key Tradeoffs / Risks / Implementation Guidance
- Path is the user-facing durable reference; moving a folder does not magically follow registry identity. Explicit link replacement is the supported change. Symlink/case equivalence and remote path translation are out of scope.
- Direct stored-superset use avoids unnecessary historical writes. Frozen classifier maintenance is needed to preserve an existing migration, not to introduce a new one.
- Removing addedAt uses explicit array order rather than hidden historical sort. View-only registration status remains separate from association validity and real filesystem access.
- Broken mixed-version API clients will fail instead of being silently translated; backend/frontend must cut over together. Existing ProjectService post-write view/uncertain-response behavior is preserved.
- Do not re-add IDs, registration or directory checks to make old tests pass. Update tests to approved outcomes while preserving unrelated guarantees.
- No production code/test changes or runtime validation were performed in this design phase. Independent review and implementation/validation remain pending.
