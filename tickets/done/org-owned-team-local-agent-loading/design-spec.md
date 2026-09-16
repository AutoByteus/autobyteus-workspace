# Design — ORG-LOCAL-AGENT-20260916-001 / DS-REV-003

## Solution And Approval Basis
SR-001 requirements Approved unchanged; SR-006 / DS-REV-003 Ready supersedes DS-REV-002 technical scope. User explicitly requested this bounded separation improvement after the original-personal assessment; SR-001 intended behavior remains unchanged. CRR-001 F-001 is Design Impact within REQ004/AC004; no new user approval needed. User further asks to confirm real user reachability and continue if real; actual API Alpha/Beta reproductions confirm that premise. Investigation-notes.md owns evidence. Prior DS-001/DS-REV-002 and handoffs preserved under history/ as superseded records. IR-001 backend and IR-002 frontend implementations are retained; API-REV-001 remains Fail77.9% confidence, not pass rate. No Product/UI redesign requested.

## Current-State Read
Backend IR-001 implements exact Org-owned Team/Team-local Agent reads and normal Team cache dispatch. API actual catalog/detail succeed. At API-REV-001, ordinary frontend launch failed: AgentOrgRunConfigPanel only fetches public lists, then passes a list getter into its pure form projector. Owned Teams intentionally are absent from that list. The detailed view's component-local exact reads do not populate the launch getter. This is a pre-existing frontend consumer defect exposed by correct backend reads; DS-001's backend-only path missed it. IR-002 now implements selected-Org launch reference projection; actual API retest still required. Retain that code and clarify the residual misleading catalog-only store getter contract, not a wholesale inventory replacement.

## Task Size And Architectural Risk (Mandatory)
- task_size: Medium, reassessed cumulatively. Existing five backend read/classification files plus completed frontend exact-reference integration, then catalog getter/callback contract rename across11 current production owner/consumer files (most changes mechanical) and their tests. No new data-flow spine or runtime subsystem. Source volume/fixtures are not grounds for High.
- architectural_risk: Low, reassessed rather than inherited. Existing exact GraphQL operations and ownership checks serve detail/launch with a local snapshot. New refinement only clarifies internal catalog-versus-exact method contracts and migrates their consumers. No GraphQL/schema/persistence/security/ownership/runtime lifecycle, public catalog contents or global cache semantics change. Drafts remain store-owned; model/workspace validation unchanged. No new event/retry framework.
- Escalate if supported journey needs changed identity/permissions, schema/writer/runtime lifecycle, cross-window/global cache authority, or speculative recovery/automatic submissions. Do not weaken read validation or silently widen scope.

## Architecture Investigation Evidence
See investigation-notes.md post-approval and CRR-001 recovery sections. Backend source/index/cache findings still apply. New independently inspected frontend path: AgentOrgExperience.openLaunch -> AgentOrgRunConfigPanel.projection -> agentTeamDefinitionStore public-array getter -> editableAgentOrgRunFormModel MISSING_TEAM_DEFINITION. Existing agentOrgAuthoringReferences reads exact Team/Agent queries with scope/owner checks and no list insertion. API actual Alpha/Beta DOM/transport and shared control establish supported reachability; reviewer attribution proves unchanged frontend files at base65fc02a99. Designer inspected evidence/source only, no new runtime execution or test Pass.

## Intended Change
Retain IR-001's implemented backend changes:
1. Existing Team source locator selects exact indexed Org-owned sources using explicit read Org roots, normalizes existing ResolvedTeamSourcePaths; never infer physical paths by decoding opaque IDs.
2. File Agent Team-local read and File Team exact read supply Org roots; duplicate inline Team read mapping removed. Writer contexts/guards remain unchanged.
3. Team-family classifier plus exact-owned cache bypass mirror Agent behavior without catalog insertion/negative cache.

Frontend correction, DS-003:
4. Generalize only the name of the existing selected-Org reference reader: move agentOrgAuthoringReferences.ts to agentOrgDefinitionReferences.ts; rename exports to loadAgentOrgDefinitionReferences / AgentOrgDefinitionReferences. Update existing detail/editor/TeamDetail imports/types. Keep query/ownership/coordinator/local-Agent resolution semantics and result shape unchanged. No compatibility re-export, duplicate reader or new store.
5. AgentOrgRunConfigPanel owns a component-local, selected-Org reference snapshot obtained through this reader. Pure form projection consumes this snapshot, not public Team list lookup. Keep public catalog contents/eligibility unchanged; SR-006 renames catalog-only getters as specified below. Exact queries already supply all required Team fields and Agent names; no GraphQL change.
6. Gate existing Run surface on current complete references, ordinary form/model/workspace readiness, and existing launching guard. Define loading/unavailable state below. Existing orgRunStore.launch -> CreateAgentOrgRun -> active route -> mounted Send remains unmodified and must be actually validated.

## Explicit Catalog / Exact Reference / Ownership Contracts (SR-006)
This is the bounded improvement learned from personal: availability in a lookup, eligibility in a catalog and ownership are separate questions. Do not conflate them or equate a private in-memory index with sharing. We retain current demand-driven exact reads instead of adopting personal's whole-inventory population, because the existing reader supplies the required exact-read contract and IR-002 integrates it into the approved path (actual API acceptance pending) and broader cache lifecycle work has not been justified.

### Two clearly named read boundaries
- **Catalog lookup:** rename frontend Team store `getAgentTeamDefinitionById` to `getCatalogAgentTeamDefinitionById`, and by-name getter to `getCatalogAgentTeamDefinitionByName`. Signature/returned domain value and synchronous behavior unchanged. They search current catalog only. `null` means not present in that catalog snapshot, NOT absent from storage or invalid ownership. Document this contract adjacent to exported getters and in maintained Team/Org developer docs. Existing fetch/list/root selectors keep contents and lifecycle unchanged.
- **Exact selected-Org resolution:** `loadAgentOrgDefinitionReferences` remains the common reader for Org detail/editor, Org-owned Team detail and Org launch. It resolves exact identities according to expected owner/scope and returns a selected graph; do not introduce another resolver/store or a global normalized cache. Change its callback input type to `AgentOrgReferenceCatalogLookup` with explicit `getCatalogAgentById` and `getCatalogTeamById` fields. Both callback fields are required; each may return no catalog match, and scope determines when catalog data is eligible. Do not add optional booleans/overloads or a new fallback policy. Agent's existing store getter can be adapted into this named callback without a global Agent-store rename.
- **Ownership:** remains definition metadata and server authority; reading/caching never grants shared visibility, standalone mutation or new run permissions. Preserve existing exact ownership checks and parent save/delete boundaries. No ID-to-path parsing.

### Caller decisions / narrow migration map
| Current owner/consumer | Correct boundary | Change in this revision |
|---|---|---|
| agentTeamDefinitionStore internal create/update result, ID/name exports | Current catalog snapshot | Rename two getters and internal references; same list/cache/invalidation |
| AgentOrgExperience, AgentOrgRunConfigPanel | Shared exact selected-Org reader, with eligible catalog callback | Rename callback keys/getter references; owned result still from scoped snapshot |
| AgentTeamDetail | Scoped exact reader on returnToOrg branch; catalog on standalone branch | Explicit catalog name in latter/callback; preserve existing branches |
| AgentTeamEdit | Existing catalog-based standalone authoring | Rename only; no independent owned edit enablement |
| RunConfigPanel, teamRunConfigStore, agentTeamRunStore | Existing standalone Team draft/root lookup | Rename callsites only; no new async lookup or runtime policy |
| useMobileRunSetupController, useMobileRunLaunchCoordinator | Existing Team catalog picker/draft | Rename only; no new Org mobile path |
| RunningAgentsPanel.createTeamRun | Existing root-run/draft catalog lookup | Rename only; retain catalog-miss behavior |

Audit is of actual current callers, not a claim every route accepts owned identities correctly. In particular independent Run/Edit buttons on Org-owned Team detail are a separate reachability/policy concern; do not silently change those actions or claim them validated by enclosing-Org launch acceptance. Pure utility parameter `getTeamDefinitionById` is a caller-supplied lookup contract, not the renamed store getter; do not globally replace that different symbol or reintroduce nested recursion.

### Removal and regression boundary
Remove old store getter exports entirely (no alias/wrapper) and migrate all TS/Vue callers/test mocks; historical archived ticket text stays untouched. Source search should find no live old store symbol. Preserve exact loader semantics, public arrays, existing asynchronous UI states, payloads and schema validation. Add/extend store contract test: eligible catalog ID resolves, absent/owned ID returns null with no exact network call or insertion; a real exact-reader/panel test resolves that same owned ID while catalog getter remains null. Include current shared/application controls and owner mismatch cases. Test renaming must not mock away production reader/projector/store boundary.

## Selected-Org Launch Reference Lifecycle (DS-003)
The panel is the sole owner of this launch-only read snapshot; agentOrgRunConfigStore remains the sole owner of user draft/configuration. The shared reader owns exact query/identity validation, not Vue lifecycle. Do not reuse detail-local state or require prior detail visitation.

- **Scope key:** selected Org ID + revision + member ref/type/scope list (including member names); capture values for the request. When no selected Org exists, no reference projection is ready. Retain existing Org/catalog/workspace initialization; missing catalog entries can be resolved by the reader's exact-query path.
- **Entry/change:** immediate watcher starts once a selected Org is available, and on relevant key change. Clear prior snapshot, mark loading, register watcher cleanup to ignore completion after scope change/unmount. Bind publication to captured key; readiness also compares current key so stale data cannot enable Run even before watcher cleanup. This uses ordinary local watcher semantics already present in detail; no global generation service/cache/retry machinery.
- **Read:** call shared reader with selected Org ID/members and current public catalog getters. Owned/Team-local references always get exact reads with exact ID/scope/owner validation. Shared/application references retain existing reader semantics. Do not re-run queries on model/workspace/override changes; those only recompute the pure projection.
- **Complete:** publish returned snapshot only for the current scope. Ready requires no unavailable IDs. Reader may return a Team while a child Agent is unavailable; do NOT treat populated teams as sufficient. Direct Org Agents and all mounted Team Agents must be resolved. Failure/error produces unavailable state, not an actionable partial form or fallback to unrelated shared entries.
- **Projection:** pass `(id) => references.teams[id] ?? null` to existing projector; Agent name comes from references.agents. Project only a ready current snapshot. Leave pure utility/network separation intact. Owned definitions never enter public Pinia arrays; Apollo normal query caching is not public catalog publication.
- **Presentation:** while resolving, show an inline localized status (“Loading organization members…”), keep Run disabled, and do not display a premature MISSING_TEAM_DEFINITION error. Unavailable shows a localized alert (“Unable to load organization members: {references}”), Run disabled; do not call every network error a missing-file diagnosis. Use existing panel alert/status conventions, not a new dialog/page. Existing model/workspace messages remain truthful and independent. Add en/zh-CN keys. Re-entering configuration performs a fresh read; no automatic retries, polling or new retry UI required.
- **Draft preservation:** asynchronous reference completion must not call begin/reset model, workspace, approvals or sparse overrides. Existing begin-on-new-definition policy stays. On unavailable/reload of same scope retain user choices; existing model-schema reconciliation applies when a current ready form is available. Do not discard overrides to conceal topology mismatches; existing pure projection still reports stale/invalid overrides.
- **Launch:** canRun includes current reference readiness, never just absence of errors. runOrg uses existing guards and command serialization; no background reference read may create a run/Send. Do not redesign workspace creation or launch submission concurrency. Ordinary route switching/late reference completion is covered; unrelated concurrency mechanisms are not in scope.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Requirements / AC | Trigger | Current -> target | Spine |
|---|---|---|---|---|
| BEH-001 | REQ/AC001,002,004 | Register/import/startup -> Org Run -> valid configuration -> mounted Send | Backend exact reads succeed after IR-001; frontend list-only projection blocks -> selected-Org exact snapshot allows ordinary launch, existing instructions reach member | DS-001,002,003 |
| BEH-002 | REQ/AC002,003,004 | Existing shared/application/direct Org configurations | Preserve roles, scope, visibility, drafts, model/workspace/override semantics and lazy startup | DS-001,002,003 |
| BEH-003 | REQ/AC003,004 | Missing reference or failed exact read while configuring | Block without substituting same-name other owner; distinguish unavailable/loading from ready; unrelated valid scope unaffected | DS-001,003 |

## Relevant Supplemental Task Artifacts
Canonical inventory in investigation-notes.md includes external conversion evidence, initial Designer history, IR-001 source/tests, CRR-001 focused failure-origin report and API-REV-001 actual evidence. All reviewer/implementation/API artifacts remain externally owned; no edits or replacement claims. No external Product artifact. Prior backend tests prove their boundary, not UI launch. Private authored packages remain reference-only and are not committed.

## Task Design Health Assessment (Mandatory)
Bug Fix; issue Yes; root cause Missing Invariant / Local Implementation Defect: an exact owned-reference projection cannot assume a public catalog is exhaustive. Backend local consolidation retained. Frontend refactor needed now is minimal reuse/neutral rename of the already-correct exact-reference reader because it now serves authoring, detail and launch; remove authoring-only naming rather than duplicate query/ownership policy. Panel owns selected-scope readiness, store owns draft, projector pure. No global catalog/schema/runtime refactor. SR-006 additionally removes ambiguous Team store getter names/callback terminology rather than letting a catalog accessor masquerade as exact access. This is a real contract distinction backed by tests, not an alternate lookup implementation. Explicitly acknowledge original solution exposure gap: DS-002 stopped at backend planner rather than user Run gate. Startup performance, data repair and unrelated launch issues remain separate unless the approved journey produces evidence.

## Terminology
Org-local means directly owned by the Org. Team-local Agent means directly owned by its Team, even if Team is Org-local. Tagged opaque ID identifies a family, not an instruction to derive a filesystem path. Public catalog is not an exhaustive owned-definition inventory.

## Design Reading Order
Approved SR-001 -> current CRR/API evidence -> DS-003 selected-Org lifecycle -> cumulative source/index/read spines -> files/tests. Backend IR-001 stays accepted as implementation-boundary evidence, not final acceptance. DS-001 history is superseded, current spec is authoritative.

## Legacy Removal Policy (Mandatory)
No backward compatibility; remove legacy code paths. This task introduces no legacy schema path. Do not copy old recursive Team ownership parser; old personal branch is evidence for resolving the immediate owner, not target code. Remove duplicated Org-owned Team read mapping after centralization.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
Definitions: Directly Usable — No Migration. Representative current Org packages have org.md/org-config.json, indexed org_local Team IDs, Team files beneath agent-teams/, and Agents beneath each Team's agents/. Existing current reader correctly interprets their contents once the source is resolved. Two real converted packages are evidence, not a bulk rewrite inventory. Preserve IDs, roles/handoffs/assets/defaults/file bytes and source privacy. Only lookup changes; no serializer/schema change, no new ledger, no import-time rewriting. Runtime/history/DB: Not Affected. No discard/rebuild or migration plan applicable.

## Data-Flow Spine Inventory
| ID | Scope | Start -> end | Owner / purpose |
|---|---|---|---|
| DS-001 | Primary end-to-end | Startup/import/reload -> source registry -> admission -> file providers -> exact source/topology -> available Org | Admission/provider current-schema reads |
| DS-002 | Primary end-to-end | User Org Run -> DS-003 ready configuration -> ordinary Create mutation -> admission/planner/cache/file reads -> active workspace -> mounted member Send -> enclosing instructions | Existing launch/runtime owners; full initiating surface now explicit |
| DS-003 | Bounded frontend read/return within DS-002 | Selected Org identity -> exact reference read -> current validated snapshot -> pure form projection -> Run readiness | Panel scope lifecycle; definition reference service read validation |

## Primary Execution Spine(s)
DS-001: registration -> source registry -> admission -> flat member resolution -> Agent provider -> Team source locator -> Org index -> local Agent read -> available catalog/detail.
DS-002: user clicks Org Run (detail or existing direct configuration route) -> AgentOrgRunConfigPanel selected reference acquisition (DS-003) -> ready projector/model/workspace -> orgRunStore.launch/CreateAgentOrgRun -> server admission/planner -> existing providers -> active route/context -> focused mounted Agent Send -> current Team instructions/execution. No direct API bypass for acceptance.

## Spine Narratives (Mandatory)
DS-001 retains IR-001: exact Team source correlation makes owned local Agent readable; missing files still block admission.
DS-002 now spans the actual UI gate, not merely server planner. Configuration acquires current referenced Team/Agent definitions independently of detail; after complete readiness, user's normal click issues the unchanged create command. Existing runtime/context owns later focus/Send; real API acceptance must reach it and confirm enclosing Team instructions.
DS-003 starts from the selected Org, not the public catalog. Reader resolves exact owned refs and validates identity/owner. Panel adopts only current response; loading/error never enables Run. Draft changes recompute pure form without refetching/resetting. Existing catalogs remain non-exhaustive by design.

## Spine Actors / Main-Line Nodes
Org Run surface, config panel, definition reference reader, Apollo exact query boundary, pure form projector and draft store, Org run store/API, admission/planner, definition services/providers/index, existing mounted context/Send. No new manager or event authority.

## Ownership Map
Panel owns launch reference scope/readiness; shared reader owns exact-query/scope/owner validation; config store owns draft and schema state; pure projector owns editable hierarchy validation; Apollo owns transport/cache; public catalog stores own public listings only. Server admission owns availability; providers/index own exact source resolution; runtime owns activation unchanged. Neither component-local snapshot nor Apollo response inserts owned definitions into catalog arrays.

## Thin Entry Facades / Public Wrappers (If Applicable)
Org detail Run only navigates; no hidden transfer of local reference maps. Existing frontend/server APIs unchanged. Components call the shared reader, not parallel bespoke ownership queries.

## Removal / Decommission Plan (Mandatory)
Retain completed removal of File Team getById inline source duplication. Rename existing authoring-reference module/function/type to neutral definition-reference names; migrate both existing consumers and tests and delete old module without compatibility re-export. Remove launch projection's reliance on public Team getter as complete input. Remove old ambiguous Team store getter aliases and migrate consumers. Retain public lists, backend writer guards, pure projector and existing GraphQL operations.

## Return Or Event Spine(s) (If Applicable)
Exact query -> validated reference result (possibly unavailable IDs) -> panel adopts current-scope snapshot -> pure form/canRun. Late result after route/revision/unmount is ignored via watcher cleanup/key binding. No durable event/replay protocol.

## Bounded Local / Internal Spines (If Applicable)
DS-003 local pending -> ready/unavailable -> invalidate on selected-scope change. Panel owns lifetime; reference service remains stateless request/result. No global scheduler, retry loop or subscription.

## Off-Spine Concerns Around The Spine
Org index/source adapters serve backend providers. Current Team-local path validation serves Agent reader. Exact queries/ownership checks serve frontend reference reader. Localization serves panel diagnostics; existing model schemas/workspace operations serve draft/projection. They do not become new catalog authorities.

## Ownership Boundaries
Frontend: selected Org -> shared reference reader -> existing Apollo queries; validated result belongs to panel scope only. Public catalog is only a source for eligible shared/application references, not owner of Org-local identities. Draft store must not hold reference inventory. Backend provider -> Team locator -> exact Org source index unchanged; read discovery does not grant mutation rights.

## Boundary Encapsulation Map
| Boundary | Internals | Callers | Forbidden bypass |
|---|---|---|---|
| Definition reference reader | exact queries, scope/owner validation, member traversal | Org detail/editor, owned Team detail, launch panel | duplicated direct queries/owner parsing inside panel |
| Pure form projector | addresses, hierarchy, override validation | launch panel with ready selected snapshot | query side effects or public-catalog publication |
| Team source locator | source index/shared/application adapters | backend file readers | UI/runtime decoding opaque ID into path |
| Definition provider | parse/cache/source dispatch | existing services/admission | runtime direct files to bypass provider |

## Dependency Rules
Frontend components depend on one reference reader for reference data; reader uses existing query documents/getApolloClient and current local Agent ID builder. No dependency on execution or draft stores; catalog lookups passed as callbacks. Model/workspace stores keep their current policy. Do not make UI ownership checks weaker than current reader or inject owned results into public arrays.
Backend: explicit Org read roots, exact index only; no domain Team service instantiated inside Agent provider; writer lookup context unchanged. Keep IDs opaque apart from existing family classification/Team-local ID builder.

## Interface Boundary Mapping
Backend interfaces from DS-001 retained/implemented: findTeamSourcePaths fourth optional readOrgRoots context; tagged owned Team branch returns exact indexed source or null with no shared fallback. Cached Team getById dispatches exact-owned read without insertion. No writer/schema change.
Frontend loadAgentOrgDefinitionReferences(orgId, members, catalogLookup) keeps existing agents/teams/unavailable result and existing queries; catalog callback names/types become explicit in SR-006. Agent summary fields suffice for direct display; full Team query satisfies form projection. Errors/missing/owner mismatch produce unavailable IDs. Panel adds local key-bound state and readiness, not a new API or global store. Projector callback signatures unchanged; inputs now come from selected snapshot.

## Interface Boundary Check
One Team subject per backend lookup; no path decoding. One selected Org reference-read operation in frontend; component owns lifetime, service does not own drafts/execution. Partially loaded result allowed for existing detail display but never for launch readiness. Network error not asserted as file missing. No GraphQL/API wire contract change; internal catalog method naming is intentionally corrected.

## Main Domain Subject Naming Check
Backend names retained. Rename authoring-only reference service/type to AgentOrgDefinitionReferences because it now serves authoring/detail/launch. No generic helper/support framework or backend rename.

## Existing Capability / Subsystem Reuse Check
Reuse exact reference reader/queries/ownership checks already used in detail; ordinary Vue watcher cleanup, existing config store and pure projector, current status/alert presentation. Reuse backend index/source union/local Agent reader/cache pattern. No new catalog/cache or parser. Catalog-only getter names make the boundary explicit for existing consumers.

## Subsystem / Capability-Area Allocation
Backend definition providers retain completed read correction. Frontend agentOrgDefinition service owns exact reference reading; workspace/config panel owns launch readiness; existing draft/projector own editable input. Existing Org/Team detail consumers only update renamed import/type. Localization supplies two messages. Runtime/admission/schema unchanged.

## Draft File Responsibility Mapping
Keep IR-001 five source files/seven-file source+test manifest. Frontend candidates: rename services/agentOrgDefinition/agentOrgAuthoringReferences.ts; edit AgentOrgRunConfigPanel.vue; update AgentOrgExperience.vue and AgentTeamDetail.vue imports/types; en/zh-CN workspace messages; new/extended colocated launch and reader regressions. SR-006 additionally edits agentTeamDefinitionStore getter names, its catalog-based consumers and reference-reader callback contract; pure projector/query documents remain unchanged.

## Reusable Owned Structures Check
Reuse backend ResolvedTeamSourcePaths, existing frontend reference result maps/unavailable list and current query types. No new overlapping inventory DTO or ownership fields. Keep readiness state local and key-bound; avoid duplicate ownership validation in panel.

## Shared Structure / Data Model Tightness Check
Backend Agent stays team_local with canonical ownerTeamId. Frontend result fields retain one meaning: exact validated definitions and unavailable IDs. Scope key/state identifies the in-flight/current selected Org only; not persisted, not source identity parser. No schema change or stale-result cache.

## Final File Responsibility Mapping
Backend IR-001 unchanged. Frontend renamed service reuses existing exact-read policy; panel integrates single local readiness path; two detail consumers mechanical import/type updates, behavior preserved. Localization messages only. Tests target real panel/Pinia/projector/reader/Apollo seam. No extra store/composable/module. SR-006 additional callsite edits are mechanical names documented in the contract map, not new reader policies.

## Applied Patterns (If Any)
Existing provider/source-index, owned-cache read-through, selected-view query projection and watcher cleanup. These are local current patterns, not new framework architecture.

## Target Subsystem / Folder / File Mapping
Backend five source files from IR-001 remain as documented in implementation-handoff.md/manifest.
Frontend under autobyteus-web/:
- Move services/agentOrgDefinition/agentOrgAuthoringReferences.ts -> agentOrgDefinitionReferences.ts; rename exports/comments, preserve behavior.
- components/workspace/config/AgentOrgRunConfigPanel.vue: selected-scope read state, pure projection inputs, loading/error gate.
- components/agentOrgs/AgentOrgExperience.vue and components/agentTeams/AgentTeamDetail.vue: rename imports/types only, no authoring semantics change.
- localization/messages/en/workspace.ts and zh-CN/workspace.ts: reference loading/unavailable messages and catalog checks as appropriate.
- components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts and focused Apollo/owned-launch test colocated there; reference service tests if needed under its __tests__. Existing OrgOwnedAuthoring.spec.ts protects old consumers. Do not replace production reads in tests with invented resolved definitions/list insertion.
No changes to agentTeamDefinitionStore public list contents, editableAgentOrgRunFormModel pure utility, query schemas, runtime behavior or server lifecycle. Store getter names and existing consumer references are explicitly changed by the contract refinement below.

### Additional SR-006 file responsibilities
- stores/agentTeamDefinitionStore.ts: catalog-only ID/name getter exports and adjacent contract documentation.
- services/agentOrgDefinition/agentOrgDefinitionReferences.ts: named CatalogLookup type/fields, same exact read semantics.
- Existing Org/Team detail and Org config consumers above: callback/getter references only beyond IR-002.
- components/agentTeams/AgentTeamEdit.vue; components/workspace/config/RunConfigPanel.vue; components/workspace/running/RunningAgentsPanel.vue; stores/teamRunConfigStore.ts; stores/agentTeamRunStore.ts; composables/mobile/useMobileRunSetupController.ts and useMobileRunLaunchCoordinator.ts: mechanical store getter references with behavior unchanged.
- Colocated/store tests and mocks containing old store exports: migrate and retain assertions; add explicit catalog-vs-exact invariant. Do not edit archived tickets merely to eliminate old names.
- docs/agent_teams.md and docs/agent_orgs.md if needed: document catalog enumeration vs exact scoped reads; no promise of independent owned write/run behavior.

## Folder Boundary Check
Existing backend provider/identity folders and frontend definition-service/workspace-config folders fit. UI state remains at panel, stateless lookup in service, draft in store. No new mixed-layer directory or shared dumping ground.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Good backend: Org-local Team source -> its agents/worker file, preserving full owning Team ID. Good frontend: public Team list excludes squad, exact Team query returns validated squad for selected Org, local snapshot enables /group/worker form and user's Run. Bad: push squad into shared store, borrow same-name Team, depend on visiting detail first, or cast a partial snapshot as ready.

## Backward-Compatibility Rejection Log (Mandatory)
Reject old recursive Team reader, shared extraction and dual schemas. Reject obsolete authoring-reference compatibility re-export (migrate all consumers). Reject global list insertion and backend/manual API launch workaround. Existing shared/application reference lookup is legitimate current policy, not old-shape fallback.

## Derived Layering (If Useful)
Frontend surface -> stateless reference service/Apollo -> existing API; panel -> pure form -> unchanged launch store. Backend services -> providers -> index/file adapters unchanged. No additional layer or global inventory.

## Change / Refactor Sequence
1. Preserve all IR-001/IR-002/API/CRR source/evidence; capture pre-refinement manifests. Apply explicit catalog getter/type/callback renames and update all audited consumer/test references, remove old exports without aliases; retain the existing frontend failing-baseline regression and add the explicit catalog-versus-exact contract regression with owned Team absent from list.
2. Preserve the already-completed IR-002 reader rename/reuse and its existing detail tests; do not repeat or revert it.
3. Preserve the already-completed IR-002 key-bound loading/ready/unavailable panel snapshot, draft/model/workspace/overrides and localized diagnostics; only apply the explicit catalog callback/getter contract refinement.
4. Run durable panel/query success plus unavailable/wrong-owner/late-result/shared controls; ensure no create while pending and ordinary create payload once ready. Keep backend regressions/build baseline qualified.
5. API reruns F-001/B02 FIRST on Alpha/Beta, ordinary UI model/workspace selection -> enabled Run -> create -> select mounted worker -> Send -> verify enclosing Team instructions. Preserve shared control/catalog non-publication/file hashes/read laziness. No API-only workaround. Classify new observed failures honestly.
6. Normal route/finalization only after validation and explicit user acceptance/Git authority; no current finalization authorization.

## Key Tradeoffs
Reuse existing full reference read (including local Agents) instead of separate Team-only shortcut: gives owner-validated complete selected scope and avoids another query policy. One local request per selected scope; no model/workspace refetch. Reading may incur exact queries already required by detail; no startup-speed claim. Neutral rename touches two existing consumers but avoids misleading authoring coupling/duplicate logic.

## Risks
Incomplete mocks can hide list-only defect; actual query boundary mandatory. Existing service returns partial results, requiring explicit gate. Old response must not enable a new Org's form. User edits must survive reference completion. Shared/catalog stores must stay unchanged. Non-success query errors are unavailable, not proven missing. Keep source/typecheck limits truthful. Backend cache/source fix remains good but no full accepted launch until actual API rerun. Private fixture contents never copied.

## Guidance For Implementation
Approved SR-001 unchanged; SR-006/DS-REV-003 supplies full path and explicit catalog/exact contract. This is not a whole-inventory, standalone-owned action or global Agent-store refactor. API remains Fail until F-001 fixed and actual downstream Send validated. User confirmed proceed only for real scenario; API ordinary Alpha/Beta paths establish it. Hold lifted only by this revised delivered package and applicable routing.
Durable frontend test must mount real panel with real Pinia stores, pure projector and shared reference reader; simulate Apollo/server boundary responses (not loader result or owned-list injection). Start with Org-owned Team absent from public list; exact owned Team/direct/local Agent reads provide correctly scoped IDs. Valid model/schema/workspace -> enabled Run -> ordinary Create mutation payload, no premature mutation/provider action. Test direct config entry with no prior detail, shared control, missing Team/Agent and query-error unavailable, wrong id/scope/owner, same names in another Org, pending request then route/revision/unmount late completion, retained user overrides/workspace/model choices. Existing shared-only test fixtures may need complete referenced Agent data rather than shortcuts.
Run old authoring/owned Team detail tests after rename; server169/15 prior Pass carried only if not rerun; no global strict-clean claim. Implementation rendered UI check per role and isolated API actual browser rerun required. No user server/Electron/data/private package actions, release or new migration. If readiness integration requires changed schema, global cache or runtime lifecycle, return Design Impact instead of inventing it.
