# Design Spec — create_or_update_project

## Solution And Approval Basis
- Package: create-or-update-project-tool; solution round SR-003.
- Approved requirements: SR-002, AP-001 (2026-10-06 user affirmation after optional-workspaces scope proposal and JSON/link clarification). REQ-001–006, AC-001–006, SCN-001–004 are the authority.
- Design status: Ready; independent-review/routing gates remain.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool; branch codex/create-or-update-project-tool.
- Base: origin/personal @ 68261f8111e2f0eb119824c91a2650410c9aeffa, refreshed at bootstrap. Finalization target origin/personal; no release requested.
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/investigation-notes.md.
- Behavior-defining supplements: None. Product package: N/A — not requested. Review artifacts: N/A — not reviewed yet, do not misstate a pass.

## Current-State Read
Three shared Project/Task tools exist; ProjectService already owns create, full-form update, name uniqueness and registered workspace links. ProjectStore owns serialized catalog writes and current exact JSON. Native and MCP share a manifest/parser, with independent runtime selection. Manager template selects existing three tools. Existing service view enrichment reads Tasks/availability after mutation, even though the proposed compact command result does not need either. Full-form update is not an omission-preserving patch. See investigation AP-001/Architecture section for exact source reads.

## Task Size And Architectural Risk
- `task_size: Medium`: bounded server feature across shared tool contract, native registration, manifest, domain command/service, Manager template, tests and docs; existing owners, no frontend redesign or new subsystem.
- `architectural_risk: High`: new externally callable write contract accepts nested workspace replacement and partial metadata changes, with a governing service command extension/refactor and serialized omission preservation. Additive contract is material, even with unchanged persisted shape/authorization machinery. High is not caused by Markdown volume or legacy code elsewhere.
- Payload: one schema/name/description, Manager config/prompt, documentation/tests. Structural delta: new mutation contract and record-returning service commands. No migration, deployment, broad security policy, new coordinator, or store lifecycle change.
- Escalate/revise if runtime requires a new authorization path, schema migration, workspace creation/discovery, global UI sync, Task mutation, lock changes or uncertain command-write semantics. Do not broaden implementation silently.

## Architecture Investigation Evidence
Project guideline: worktree DESIGN.md and canonical server docs/design/data_migration_guideline.md; TESTING.md governs verification. No conflict found. Evidence authority is investigation-notes.md, AP-001 And Architecture Investigation. Key decisions: current reader/writer ⇒ no migration; locked store callback ⇒ patch current state inside service; view post-write reads ⇒ record-returning command result; pre-coercion native parse ⇒ strict nested schema; manifest-derived adapters/name filter ⇒ extend existing exposure without runtime rewrites.

## Intended Change
Add `create_or_update_project` to existing Project tools with optional project_id/name/description/workspaces arguments. New command boundaries in the existing ProjectService supply committed records, not enriched Task views. Expose projected metadata/link acknowledgement; update Manager config/instructions and docs. No unrelated feature work.

## Relevant Behavior And Production-Path Map
| Behavior / scenarios | Approved basis | Trigger and preserved outcome | Target path / lifecycle |
| --- | --- | --- | --- |
| BEH-001 / SCN-001 | REQ/AC-001/003/006 | User requests Project creation; required trimmed unique name, optional metadata/registered links | DS-001: selected native/MCP call → shared contract → manifest → ProjectService.createProjectRecord → ProjectStore catalog commit → projected acknowledgement |
| BEH-002 / SCN-002/004 | REQ/AC-002/003/006 | User requests known-ID patch; omitted fields preserved; explicit list replacement never deletes workspace directories or Tasks | DS-002: selected call → strict parser → manifest → ProjectService.patchProjectRecord → locked current-record change → committed record projection |
| BEH-003 / SCN-001–003 | REQ/AC-004/005 | Manager resolves actual IDs, invokes requested capability; custom agents remain explicitly selected | DS-003: startup template sync → definition resolution → fresh run selection → existing exposure/catalog → available selected tool; unselected sessions rejected |

## Relevant Supplemental Task Artifacts
User screenshot (absolute path in investigation) corroborates missing Manager tool, REQ/AC-004. It is not normative UI design. No other supplement. Canonical requirements/investigation/revision record travel with this design.

## Task Design Health Assessment
- Change posture: Feature / Behavior Change; missing capability, not a defective old contract.
- Current design issue: existing full-form service API is insufficient for atomic partial tool patches and compact results. Root classification: Boundary Or Ownership Issue for the proposed extension, not a claim that existing UI forms are broken.
- Refactor needed now: Yes, narrowly within ProjectService. Extract existing creation write once into record-returning command, retain UI read-enriched facade. Share workspace resolution with explicit omission policy rather than duplicate it or let manifest pre-read/merge/write.
- Existing folders/owner boundaries are healthy; no renaming of project-tasks subsystem, generic framework, cache, or blanket rewrite. Residual discovery limitation is approved out-of-scope and reported.

## Terminology
Workspace attachment/link is a persisted object inside Project.workspaces. It references a registered workspace ID and stored root snapshot; not a symlink, URL or filesystem operation. Patch changes explicitly present fields only. Provided workspace list is complete desired list, not append operations.

## Design Reading Order
Approval/current evidence → behavior/path map → data/refactor decisions → spines/owners → interfaces → concrete files → sequencing/verification.

## Legacy Removal Policy
No backward-compatibility aliases/fallbacks. New canonical tool only. Existing full-form UI update remains an actively supported operation, not legacy compatibility. Remove duplicated creation-write body when extracting command; share workspace resolution. Historical migration code is out of scope and remains unchanged.

## Persisted Data / State Transition Decision
**Directly Usable — No Migration.** Project data at projects/<projectId>/project.json retains identical current fields and meaning: projectId,name,description,createdAt,updatedAt,workspaces[]. Links retain workspaceId,workspaceRootPath,description,addedAt. Current tolerant readProjectFile and exact projectFileContent already consume/emit these. Ordinary tool writes use same store; no scan/rewrite of historical records beyond existing catalog lookup required for unique names. Tasks/context/run-resource files not written. Real data volume unknown; representative current fixture shapes inspected, no user data read.

Migration guideline §2 checklist:
1. Need: none; shape/meaning unchanged, command input is not a persisted schema.
2. Availability: existing Projects migration-pending gate unchanged; no new startup/history dependency.
3. Source/target: same current Project/link shapes observed in store/service fixtures; no predecessor conversion altered or new source admitted.
4. Disposition: existing records directly retained; only deliberate ordinary edits. No migration exclusions/status introduced.
5. Commit/retry: existing catalog lock and atomic temp+rename writer sufficient; no backups/journal/CAS. Uncertain failure never advertised as success or rollback; inspect saved Project before retry.
6. Current-only boundary: reader/writer unchanged; no old-shape decoder, version flag or migration source retirement.
7. Cost: required existing catalog name check + one Project JSON write; no Task/history/availability enrichment for command result.
8. References: Project links reference registered workspace IDs; new links validated through existing WorkspaceManager lookup, retained snapshots preserved. Task files/history ownership untouched.
9. Evidence: service/native/MCP/HTTP/bootstrap tests planned below; implementation owner executes them. No post-change evidence yet.
10. Lessons/review: canonical guideline no-lockout/tolerant-reader rules read; no speculative migration. Independent review follows High classification through handoff rules.
Migration Plan: N/A — no transformation. Never rewrite installed data to bootstrap this tool.

## Data-Flow Spine Inventory
| Spine | Scope | Start → end | Governing owner / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary End-to-End / BEH-001 | user instruction → selected invocation → saved Project acknowledged | ProjectService owns creation invariants |
| DS-002 | Primary End-to-End / BEH-002 | requested explicit patch → locked current Project → saved patch acknowledged | ProjectService owns partial semantics |
| DS-003 | Primary End-to-End / BEH-003 | built-in bootstrap → fresh run definition selection → session tool exposed | built-in lifecycle and existing runtime exposure/session authority own availability/selection |
| DS-004 | Return-Event / all | committed record or error → native JSON / MCP structuredContent → agent result | shared manifest owns result projection/error convention |
| DS-005 | Bounded Local / DS-002 | catalog lock → read current → validate/merge/resolve links → write JSON → return | ProjectStore owns serialization, service callback owns meaning |

## Primary Execution Spines
DS-001: user/Manager → native or session-selected MCP boundary → shared strict parser/manifest → ProjectService.createProjectRecord → ProjectStore.createProject catalog lock and atomic commit → metadata/link result.
DS-002: user/agent known-ID request → selected native/MCP boundary → shared strict parser/manifest → ProjectService.patchProjectRecord → ProjectStore.updateProject callback/current snapshot → atomic commit → patch acknowledgement.
DS-003: server startup → BuiltInAgentBootstrapper template sync → AgentDefinition resolution → fresh run requested tools → shared exposure names filter/catalog → explicit session/native selected invocation.

## Spine Narratives
Creation validates the user request and known workspace IDs at the normal tool boundary. Service owns name normalization, new UUID/timestamps, duplicate names and link registration; store commits before a record returns. The manifest projects the same record into a compact result without task-count/availability queries.
Patch is not a list_projects/getProject pre-read merged by the agent adapter. It applies each provided field to the current record inside the existing catalog-serialized callback. Full-list replacement and retained-link description omission preservation happen at that same boundary. Validation of all links/name completes before the single save.
Manager instructions and config are synchronized using current bootstrap. Fresh runs use their resolved definition and existing session selection. A generic/custom agent receives nothing unless it selects the new name. Running-session automatic upgrades are not promised.

## Spine Actors / Main-Line Nodes And Ownership Map
Native/MCP entry: transport/schema and selected capability, not domain state. Shared contract/manifest: wire parsing, mapping and response. ProjectService: authoritative naming, identity/timestamps, patch/preservation, workspace links. ProjectStore: current shape, physical paths/locking/atomic save. WorkspaceManager: registration lookup only. Bootstrapper/definition/exposure/session authority: definition and run availability lifecycle. No new governing owner.

## Thin Entry Facades / Public Wrappers
Existing native ProjectTaskNativeTool and MCP provider stay thin over the shared manifest. Existing ProjectService.createProject remains a UI/GraphQL facade: invokes authoritative creation command once then returns existing enriched ProjectView; it is not a compatibility branch. Tool invokes record command through service, never reaches store directly. Existing updateProject remains full-form semantics.

## Removal / Decommission Plan
Remove original in-place creation-write implementation from createProject when moving it to createProjectRecord; do not duplicate it. Replace resolveFormLinks private resolver with one shared explicit-omission-policy resolver used by form/create and patch. Update obsolete “exactly three/no Project creation” documentation and seven-tool Manager assertions. Remove no released public tools, UI operations, persisted attributes or migrations.

## Return Or Event Spines
DS-004: committed Project record → `{project: {projectId,name,description,workspaces:[{workspaceId,description}]}}` → native JSON string / MCP JSON text plus matching structuredContent → agent/user confirmation. Include no Task counts, root paths, availability or fabricated completion assessments. No UI event/push introduced; manual Refresh remains.

## Bounded Local / Internal Spines
DS-005 belongs to ProjectStore; service callback runs within catalog lock, validates unique name and every proposed link, derives next metadata from current record, then exact atomic writer saves one project.json. Existing locking controls freshness; no new coordinator or optimistic pre-read.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility | Constraint |
| --- | --- | --- | --- |
| ParameterSchema | shared contract | nested object-array public documentation/validation | no default workspace [] on update; no lost absence |
| workspace registration lookup | ProjectService | resolve new ID to current registered root | do not create/register/delete directories; retained links keep snapshots |
| store layout/current serializer/locks | service/store | safe path, exact JSON and serialized writes | never exposed to upstream manifest callers |
| result/error mapper | manifest/native/MCP | same domain result/error, uncertain mutation messaging | no raw exception/secret leak or false rollback |
| built-in config/prompt | bootstrap lifecycle | actual selected tools and safe instruction sequence | no arbitrary custom-agent rewriting |

## Ownership Boundaries And Boundary Encapsulation Map
| Boundary | Encapsulates | Callers / forbidden bypass |
| --- | --- | --- |
| ProjectService | naming, mutation semantics, link policy and ProjectStore | manifest and GraphQL use public service; forbidden tool direct store/write/pre-read merge |
| ProjectStore | folder layout, tolerant reader, exact writer, locks | service calls existing callbacks; forbidden adapter-owned lock/JSON rewrite |
| WorkspaceManager lookup | registered roots | service only resolves new links; no manifest access to registry store/filesystem |
| run tool selection/session catalog | authorization/exposure | shared recognized-name extension only; never expose all task-category tools |

## Dependency Rules
Existing direction stays entry adapter → shared contract/manifest → ProjectService → ProjectStore/WorkspaceManager lookup. Parser maps wire snake_case to typed domain camelCase at manifest, not store. ProjectService must not import native/MCP/agent-template code. No tool bypass to persistence, no Task service use in new Project mutation branch, no lower owner imports of transport. UI and custom agent permissions unchanged.

## Interface Boundary Mapping And Check
| Interface | Subject/identity | Responsibility / singular / ambiguity |
| --- | --- | --- |
| create_or_update_project | absence of project_id = create; present nonblank explicit Project ID = patch | one Project mutation contract; singular Yes; selector risk Low with presence checks, unknown IDs fail |
| createProjectRecord(CreateProjectCommand): Promise<Project> | new Project identity generated by service | authoritative existing create write, returning committed record; singular Yes |
| patchProjectRecord(PatchProjectCommand): Promise<Project> | explicit projectId; name?/description?/workspaces? | current-state partial patch; singular Yes; name is not lookup selector |
| createProject / updateProject | existing form inputs | unchanged UI/GraphQL contracts/views; legitimate full-form lifecycle, not fallback |

Add PatchProjectCommand to projects/domain/models.ts with projectId required, name?:string, description?:string, workspaces?:ProjectWorkspaceInput[]. Present undefined is treated as omission at typed service boundary; strict wire parser rejects non-string/null/present-invalid values. Field presence, not truthiness, controls empty strings/arrays. Reject no-field patch with PROJECT_PATCH_REQUIRED added to ProjectErrorCode. Use PROJECT_NAME_REQUIRED/TAKEN, PROJECT_NOT_FOUND, WORKSPACE_NOT_REGISTERED/ALREADY_LINKED and PROJECT_TOOL_ARGUMENT_INVALID as appropriate.

### Wire Schema And Parser
All four top-level fields optional in generic schema because name is required only for creation. `workspaces` is ARRAY with nested ParameterSchema of required string workspace_id and optional string description. Descriptions explain complete-list replacement and [] clearing. Do not assign defaults that erase absence. Strict branch in parseProjectTaskToolInput checks plain object top-level/nested rows, allowlists, string IDs and descriptions, duplicate trimmed workspace IDs, create required name, patch at least one field, and preservation of missing row description. Reject null list, strings (including empty string), sparse/nonobject rows, wrong types/unknown row keys before native BaseTool coercion. Existing tools' parser branches remain unchanged.

### Service Write Details
Extract current create write body unchanged into public createProjectRecord and return actual result of store.createProject; createProject calls it then toView for existing clients. New patchProjectRecord calls updateProjectRecord with callback: derive name/description from present fields or current values; assert name available inside catalog callback; omitted workspaces reuse current list; provided list resolves full desired rows and retains existing root/addedAt/omitted description; new rows validate registration and default blank description. Return committed Project directly, not toView.
One private `resolveWorkspaceLinks(project, rows, omittedDescription: "clear" | "preserve")` owns duplicate validation and new-ID lookup. Existing form/create call clear to preserve current form semantics; partial patch calls preserve. These explicit supported operation semantics are not version fallbacks. Reuse current normalizeName/normalizeDescription/time/UUID and serialization; do not broaden other service method semantics.

### Mutation Failure Contract
Parser/known service validation failures retain structured domain code. Use shared unconfirmed-mutation error convention for unexpected Project write failures (may be unconfirmed, never imply rollback); extend current manifest's local TaskMutationUnconfirmed to naturally named ProjectMutationUnconfirmed accepting Project/Task subject message, preserving existing Task text/code. Result projection follows confirmed record only. Because record commands avoid post-write enrichment, no Task/view domain failure can masquerade as rejection after the new Project mutation. Native abort/transport failures remain transport errors. No blind automatic retry.

## Main Domain Subject Naming Check
Project, ProjectWorkspaceLink, CreateOrUpdateProjectTool, PatchProjectCommand and ProjectService describe actual subjects. Existing project-tasks tool group already includes list_projects; extension is coherent without broad folder renaming. Command names ending Record distinguish persisted acknowledgement from derived ProjectView without exposing a store bypass.

## Existing Capability / Subsystem Reuse Check And Allocation
Projects extends domain/service; existing store/registry reused unchanged. Agent-tools/project-tasks extends schema/parser/manifest/native. Existing MCP provider, runtime name selection and startup loader reused, no production code edits expected there beyond tests if needed. Built-in agents extends template only. No new subsystem/module.

## Draft File Responsibility Mapping
Candidates: shared tool contract for wire schema/name/parser; native-tools for wrapper registration; manifest for mapping/result; domain models/errors for command type/error; ProjectService for command/preservation; Manager template for selection/instructions. Final mappings below retain these owners; no new transport-specific implementation or shared service layer needed.

## Reusable Owned Structures Check
Use existing Project, ProjectWorkspaceInput, ParameterSchema and current error/manifest shapes. New PatchProjectCommand is separate from full-form UpdateProjectCommand to prevent weakening existing UI required-name semantics. Shared link resolver inside ProjectService removes policy duplication. Compact Project acknowledgement is a projection in existing manifest, not a second persisted model or independent state owner.

## Shared Structure / Data Model Tightness Check
Wire workspace_id references existing registered identity; no caller-supplied root snapshot/addedAt/path. Domain command holds only writable fields; Project owns timestamp/root snapshots. Acknowledgement omits internal counters/availability/history. No redundant aliases (workspaceIds/workspace_paths), no schemaVersion, no output-only input fields. No new global config.

## Final File Responsibility Mapping / Target Subsystem Folder File Mapping
Paths are workspace-relative. Existing folders separate transport, domain/service and persistence; keep compact grouping, no mixed-layer new flat subsystem.
| File(s) | Delta / owner | Must not contain |
| --- | --- | --- |
| autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts | name/type/description/schema + strict mutation/nested-array branch | service IO or defaults erasing omission |
| .../project-task-native-tools.ts | CreateOrUpdateProjectTool class and registration using shared definitions | independent business parser/mutation |
| .../project-task-tool-manifest.ts | explicit branch before Task handling; map typed command, record projection, subject-aware unconfirmed error | store/pre-read merging or automatic retry |
| autobyteus-server-ts/src/projects/domain/models.ts | PatchProjectCommand distinct from full-form command | transport/MCP state or persisted field change |
| .../domain/project-errors.ts | PROJECT_PATCH_REQUIRED code | new permission model |
| .../services/project-service.ts | extract record creation, add record patch, share omission-aware link resolver | tool transport imports, task-read enrichment in new command |
| autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json | add create_or_update_project to selected names | changing other capabilities |
| .../agent.md | explain user-requested Project create/edit, known workspace IDs, omit/preserve vs replace/clear, ambiguity/failure clarification | invented IDs, auto-create unrelated projects, implicit run dispatch |
| tests/unit/projects/project-service.test.ts | command/preservation/atomic invalid-input coverage | writing installed data |
| tests/unit/agent-tools/project-tasks/project-task-tools.test.ts | native/MCP/schema/error/selection parity | permissive hidden defaults |
| tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts | bootstrapped eight-tool Manager and instructions | custom-agent automatic grants |
| tests/e2e/projects/project-task-boundaries.e2e.test.ts (or focused sibling) | real HTTP MCP authorization/create/patch/workspace persistence parity | paid model or installed app |
| autobyteus-server-ts/docs/modules/{projects,agent_tools_mcp_server}.md; autobyteus-web/docs/projects.md | four-tool contract, nested workspaces/limitations and Manager | stale “no Project creation/exactly three” claims |

Unchanged expected: ProjectStore/layout/serializers/migrations, WorkspaceManager, GraphQL types/resolvers, web UI/store, startup loader, runtime exposure and MCP adapter. Change one only if evidence requires and return design impact if material.

## Applied Patterns
Reuse existing adapter and serialized service callback. Extract governing record command to separate write acknowledgement from derived UI read; no command bus, cache or repository layer added.

## Folder Boundary Check
Agent-tools is wire contract/transport adapters; projects/domain and services own subject semantics; projects/stores remain persistence; built-in templates are bootstrapped payload. Separation clear, low over-split/mixed-layer risk. Existing group name does not justify sweeping rename.

## Concrete Examples / Shape Guidance
Create: `{name:"Website", workspaces:[{workspace_id:"agent_ws_real",description:"Frontend"}]}`.
Patch metadata: `{project_id:"project_real",description:"Updated goal"}` leaves name/links unchanged.
Replace links: `{project_id:"project_real",workspaces:[{workspace_id:"agent_ws_real"}]}` retains that existing link description/root/time, removes other associations only.
Clear: `{project_id:"project_real",workspaces:[]}` does not delete folders/registration/Tasks.
Avoid: `{project_id:null,name:"Website"}` as creation, treating supplied list as append, generating workspace IDs from paths, or adapter getProject → stale merge → full update.

## Backward-Compatibility Rejection Log
Aliases/upsert-by-name/legacy task exposure: Rejected, explicit canonical mutation/ID only. Old persisted decoders, schema versions and workspace root-path shortcuts: Rejected, same current reader/registered-ID contract. Existing create/update form facade is supported live UI behavior and not a compatibility mechanism; no old-shape runtime branches introduced.

## Derived Layering
Existing direction: selected entry → shared tool contract/manifest → ProjectService → ProjectStore + registered-root lookup. Result reverses through shared projection and transport mapper. No new layer.

## Change / Refactor Sequence
1. Add typed patch command/code and focused service tests; extract creation write, implement locked partial patch/shared resolver preserving existing forms. Do not leave duplicate creation body.
2. Extend shared names/schema/strict parser and manifest explicit Project branch; add native wrapper. Use same result/errors for MCP.
3. Extend Manager config/instructions and bootstrap assertion; update relevant docs. Preserve seven existing tool selections and existing status/delegation behavior.
4. Execute focused unit/service/native/MCP/bootstrap tests, then real-HTTP E2E; validate selected-only exposure, saved links and unchanged Task/context/workspace bytes. Record each actual result/failure/cleanup; no success claims from source inspection.
5. Follow High-risk independent review and downstream API/E2E/delivery workflow as configured; no release unless user later requests.

## Key Tradeoffs
Record command extraction is a small purposeful service refactor preventing unnecessary Task reads and false post-write view failures; form APIs remain unchanged. Full-list replacement matches existing Project aggregate form contract and explicitly approved semantics, rather than inventing append/delete operations. No workspace discovery capability in scope: caller must know IDs/full desired list, Manager asks when ambiguous. No speculative optimization beyond removing irrelevant read work from acknowledgement; required catalog uniqueness scan stays.

## Risks
R-001: row/top-level absence accidentally erased by default/coercion ⇒ strict pre-BaseTool parse + native/MCP tests.
R-002: stale adapter merge loses other fields ⇒ only locked service callback derives next values; parallel supported metadata patches prove preservation.
R-003: replacement misunderstood as append ⇒ schema/prompt/docs/examples + explicit empty/full-list tests.
R-004: extraction changes UI full-form semantics ⇒ existing service/GraphQL tests retained; clear-vs-preserve policy explicit.
R-005: custom-agent or running-session permissions broaden ⇒ explicit selection tests; no rewrite/grant.
R-006: unknown command failure repeats work ⇒ unconfirmed message/check-before-repeat; no retry claim. No unresolved material architecture uncertainty; validation pending.

## Guidance For Implementation / Verification Intent
Respect repository AGENTS.md, DESIGN.md/TESTING.md; stage explicit files only. Implement this design, not a generic Project CRUD suite. Tests use test-owned data and disposable registered folders, never ~/.autobyteus beyond the supplied image reference. Required checks:
- current service tests + new create/patch record-return tests; exact JSON and identity/createdAt/retained root/time/description, omission vs blank/list/[], validation without partial commit, unknown/duplicate name/IDs; no listTasks/toView dependency on tool commands;
- native public prepare/execute and MCP adapter parity, nested schema, strict invalid types/keys/empty string/null rows, preserved absent row description, abort remains transport;
- catalog/runtime exposure selected name only, static collision behavior and enabledProjectTaskToolNames; bootstrap Manager config/instructions;
- real HTTP MCP selected-session create/patch + GraphQL read of saved Project, registered-workspace linking/replacement/clear, read-only session call rejected, persisted Task/context preservation and node-local isolation;
- existing Task tools/business-result and Project service regressions, docs contract consistency.
Suggested focused unit invocation: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/project-service.test.ts tests/unit/agent-tools/project-tasks tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts --no-watch`.
Suggested real HTTP: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/project-task-boundaries.e2e.test.ts --no-watch` (include focused sibling if created). Build prerequisites per package/root TESTING.md. Expected no model call. These are plans, not executed evidence. UI redesign/desktop-shell change N/A; delivery verifies actual user experience through approved normal routes, retaining limits of API-only evidence.
