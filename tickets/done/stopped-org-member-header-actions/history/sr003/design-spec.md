# Design specification — ORG-STOPPED-CONFIG-20260917-001

## Document status and reading order
DS-001 / SR-003; Ready for architecture review; 2026-09-17. Approved intended behavior: SR-001 baseline explicitly approved in SR-002 and reaffirmed in user's follow-up (same-runtime compatible replacement and current-model settings). Canonical investigation: investigation-notes.md in this directory. Read requirements → investigation/personal comparison → this design → solution-handoff. No Product prototype requested or required; preserve existing controls/forms.

## Current-state read and intended change
The Org monitor wrongly treats live messaging access as header eligibility; both rendering and click handler reject stopped members. The existing Org member configuration form then unconditionally locks model edits. Team's stopped editor already provides the policy and persistence pattern but writes a different canonical root.
Restore Settings/+ reachability, then supply a focused stopped-Org configured-Agent canonical read/save path. Keep the Org manager as lifecycle/persistence authority; reuse existing model validation/UI. No fake Team root, standalone writer shortcut, provider startup or history rehydration for Settings.

## Task size and architectural risk
- task_size: Medium. Bounded Org feature integration across renderer, GraphQL, existing Org lifecycle/persistence and their tests, with a focused draft/controller and pure leaf patch mechanism. No new runtime family or provider implementation.
- architectural_risk: High. New stopped-Org command/read contracts mutate durable root configuration and must serialize with restore/termination, distinguish atomic-write uncertainty and preserve exact retained context. This is not Low because only two controls are visible. Independent architecture/source review is applicable under current rules.
- Payload versus structural assessment: four screenshots/docs are evidence; the material delta is the new root-owned model-save API and persistence/lifecycle integration, not evidence volume.
- Escalation: changed runtime identity, schema/migration, wider defaults propagation, application-bound editing, unsupported provider resume requiring new lifecycle semantics or task edits → return to Solution Designer, do not broaden silently.

## Architecture evidence
| Evidence | Decision | Remaining validation |
|---|---|---|
| WorkspaceView live-only gates; locked OrgMember panel | Separate header/inspection eligibility from live command access | Rendered stopped direct/mounted journey |
| Personal/current Team model editor/manager/validator | Reuse compatibility policy, explicit Save, root transition and durable result pattern | Regression controls for Team |
| Org manager withTransition + strict tree store + current fixture | Org-root writer, unchanged schema, configured leaf only | Concurrent activation and write-fault tests |
| Scope builder/projector/handle use persisted leaf launch config | Existing restore consumes edited model without new resume branch | Actual UI continuation native/external as available |
| Context view/index vs AgentContext ownership and draft store | Config-only adoption; no whole-history replacement | identity/draft/Activity preservation and late response tests |
Exact references and source-only limitations: investigation-notes.md, Post-approval architecture investigation. No test Pass claimed by designer.

## Behavior and production-path map
| Behavior / intent | Supported trigger | Target path / lifecycle | AC |
|---|---|---|---|
| BEH-001 / REQ-001 | stopped configured member selected → gear | DS-001 header→panel→canonical read; same selected member | AC-001 |
| BEH-002 / REQ-002,003 | edit model or parameters → Save | DS-002 root-owned inactive validation/write→canonical return | AC-002,005 |
| BEH-003 / REQ-005 | + from stopped member | DS-004 unchanged new Org configuration navigation | AC-004 |
| BEH-004 / REQ-004,006 | back/reopen or subsequent ordinary Send | DS-003 config-only publication, then existing restore→recipient startup | AC-003,006 |

## Supplemental artifacts
personal-stopped-config-comparison.md is source comparison/rationale, not a separate behavior authority. Four evidence screenshots support visibility/Team parity only. bootstrap-handoff.md records worktree provenance; solution-revision-record.md preserves approval history. No external prototype.

## Task design-health assessment
Posture: Bug Fix / missing parity capability. Design issue: Yes. Root cause: Missing Invariant plus Boundary Or Ownership Issue (live transport permission conflated with inspect/edit eligibility; no Org-owned stopped-save capability). Refactor needed now: bounded Yes—replace panel's unconditional locked policy with canonical editor state and replace live-only action conditions; extend existing root boundary, do not refactor the whole Team/Org runtime. The standalone editor's whole-tree inheritance planner is not the right owner for a focused Org leaf. Intentional deferrals: root defaults/bulk propagation, task editing, application ownership expansion, generalizing all editor stores; their existing behavior remains unchanged.

## Terminology
Configured member means an Agent in rootOrg.members, or in a configured mounted Team's members—not task executions. Root is the enclosing Org run. Canonical member configuration is exact identity plus its saved launchConfiguration, not a live Agent's mutable status. New-run + is not add-member.

## Legacy removal policy / removal plan
No backward-compatibility wrapper or dual-shape runtime path. Remove live-only rendering/click conditions for configured-member Settings/+; remove unconditional model-edit=false for eligible configured members. Retain intentional active/task read-only mode through one explicit panel policy. Replace tests asserting blanket locked behavior with scoped active/task assertions plus stopped cases. Do not delete the old Team editor or copy nested-Team recursion. No obsolete persistence format to retain/remove in this ticket.

## Persisted-state transition
Decision: Directly Usable — No Migration. Current canonical `memory/agent_orgs/<orgRunId>/agent_org_run_execution_tree.json` schemaVersion1 already contains each configured Agent's resolved launchConfiguration. Model edit changes only llmModelIdentifier and llmConfig values within that existing shape; current strict reader/writer and restore projector/handle consume those fields. Representative current fixture: server tests/fixtures/current-agent-org-run-fixtures.ts. No schema/version change, historical decoder, global scan or user-data rewrite. Volume: one selected root tree per Save; actual user inventory not inspected/needed. Preserve all node/root identities, platform bindings, tool/skill/runtime/workspace values, defaults, peers, tasks, handoffs, sidecars and traces. No loss/rebuild acceptable. Atomic tree replacement already supplies pre/post-rename outcome; do not add multi-file transactions for a single-authority patch. Migration plan N/A.

## Spine inventory and narratives
| ID / scope | Flow and narrative | Governing owner / off-spine needs |
|---|---|---|
| DS-001 Primary read | Org member header → member panel/controller → Org context-store read action → typed GraphQL query → AgentOrgRunService → manager canonical read → existing model options service → exact draft/form. Fresh read supplies values and eligibility without restore. | Org manager for canonical identity/lifecycle; existing model selection for catalog/capacity |
| DS-002 Primary write | explicit Save → editor draft validation → Org context-store save action → GraphQL command → Org service → manager transition lane → pure configured leaf resolver/patch → model validator → strict atomic tree store → readback result. | Manager owns inactive check and commit, store owns bytes; UI cannot authorize runtime edits |
| DS-003 Return/event and continuation | verified command result → exact context-store config-only adoption → editor success/reopen → existing Send→Org restore→scope projection→selected configured handle→Agent/provider input using saved model. | Context store preserves retained objects; manager restore reads canonical tree; existing lazy startup unchanged |
| DS-004 Primary new draft | stopped member + → existing openNewOrgRun→/workspace Org configuration route→existing launch form. | Existing navigation/config flow; no Save/restore/runtime call |
| DS-005 Bounded local | acquire existing manager root lane→read/check→validate→patch/write/readback→release; on failure return classified result. Client capture identity/generation→await→publish only if still owned. | No new global lock/scheduler/retry engine |

## Main-line actors, ownership and thin facades
- Panel/controller owns editable draft, current model/options/schema feedback and request-generation guards. It never writes live context optimistically.
- agentOrgContextsStore owns retained root/member publication, existing operation exclusion and lifetime/disposal. Settings actions use this boundary; no direct writes from component to index or AgentContext.
- GraphQL resolver is a thin typed transport adapter: identity/selection input, result projection, no file or manager bypass.
- AgentOrgRunService is the public Org boundary; narrow canonical/member-save operations delegate to manager and existing model options capability. No alternate standalone service call for Org IDs.
- AgentOrgRunManager governs lifecycle ordering and authoritative stopped-tree update. Its private leaf patch helper is pure; store remains persistence-only.
- RunModelSelectionService owns existing same-runtime/equal-or-greater-capacity and schema policy. No duplicated capacities in Org code.

## Ownership / boundary encapsulation and dependencies
| Boundary | Encapsulates | Required caller path / forbidden bypass |
|---|---|---|
| Org context store | retained view/index/config adoption; save operation lease | editor→store; never editor→raw context mutation or parallel standalone history writer |
| AgentOrgRunService | Org manager, canonical identity, model-options integration | resolver→service; never resolver→Org files + service or standalone manager |
| Org manager | per-root lane, registry, package admission, tree persistence | service→manager methods; no public arbitrary callback-with-lock API |
| Model selection | catalog/capacity/schema | use existing listOptions/validate, never independent Org comparison policy |

Off-spine: pure leaf resolver/patch serves manager; strict serializer/atomic writer serves persistence; model value clone/equality/selectionAllowed helpers serve draft; existing form/i18n serves panel; config-only projection serves retained context. None starts providers or owns lifecycle independently. Runtime status remains agent/Org context truth, not editor-owned state.

## Interfaces and identity check
Introduce domain `AgentOrgMemberModelConfigIdentity { orgRunId, memberAddress, agentRunId }`; all fields required. It deliberately correlates root, placement and execution identity, not alternative selectors. Resolve address against configured nodes and require matching Agent ID. Reject root/team addresses, task addresses, mismatched member/root/ID. Never parse opaque ID contents.
- `getAgentOrgMemberModelConfig(identity)`: returns identity, canonical launchConfiguration, root isActive, modelConfigEditability, and existing RunModelOptions (or its unavailable reason). Backend canonical read is root-lane serialized and no-repair; model options derive only from returned runtime/model/workspace. If a root activates after read, Save rechecks authoritatively. Unknown read is an error/unavailable, not proof of inactivity.
- `updateStoppedAgentOrgMemberModelConfig({identity, llmModelIdentifier, llmConfig})`: no runtime/workspace input. Return existing RunModelConfigUpdateResult semantics with exact canonical member payload or null. Use shared GraphQL result/editability/field-error/model-option types, typed Org canonical wrapper. Do not expose entire tree as writable input.
- `AgentOrgRunManager.getMemberModelConfig` and `updateStoppedMemberModelConfig`: named subject-specific entrypoints; private read/resolve helpers shared between them as needed without reentrant withTransition calls.
- `agentOrgContextsStore.readMemberModelConfig` / `saveMemberModelConfig`: root-aware frontend boundary; transport client internal. Context gets `applyMemberModelConfig` for validated config-only publication.
All interfaces have singular responsibilities and explicit identity; ambiguity Low. Main subject names reflect Org member configuration, not generic “support”/“adapter” infrastructure.

## Backend write algorithm
1. Enter same existing `withTransition(orgRunId)` lane as restore/create/terminate. Normalize identity, read current strict Org package without repair; respect initialized package admission. Keep managed registry presence authoritative: a fail-stopped registered root is not editable just because getActive returns null. Reject managed/active root, archived root, missing/unadmitted package and invalid target. Application-bound root editing is not added: retain its read-only state with clear unavailable-ownership reason; do not misuse Agent/Team application-binding reader as Org authority.
2. Resolve only configured direct/mounted Agent; retrieve its persisted launchConfiguration. Call existing validator with saved runtime, saved current model, saved workspace, requested model/config. Same model uses schema validation without replacement-capacity prerequisite. Replacement uses exact existing verified equal/larger rule. No provider thread startup or workspace activation just to save. Metadata/model-catalog reads are not agent activation.
3. Apply normalized selection immutably to only that leaf. Deep-equal no-op returns UNCHANGED without disk write. Preserve all other fields; strict package validation remains satisfied. No task, sidecar, metadata or definition rewrite.
4. Write tree via existing AgentOrgRunExecutionTreeStore. On committed, strict readback must match expected canonical patch before UPDATED. Pre-rename failure → PERSISTENCE_FAILED, old state remains; post-rename indeterminate or committed-but-unreadable → PERSISTENCE_INDETERMINATE, no claim of rollback. Return only actually verified canonical payload (null if unknown), never substitute requested values as saved.
5. Release lane in finally. No activation, scope building, registration or history summary update. Restore after release reads latest tree under same lane. Reuse existing serialized last-accepted-write semantics (no new optimistic-revision protocol). Active-state check and validation/write remain within lane so another restore cannot interleave.
Read-only canonical query shares exact resolution; active root can expose current configuration for inspection but editable=false. Existing task panel stays read-only; no model mutation API for task instances.

## Frontend flow and return semantics
Header: expose actions for selected configured direct/mounted Agent even when historical/continuable. Preserve live task header behavior and historical task restrictions; do not show editable controls for no selected target. Gear entry must use the same eligibility rule as rendering, not `access==='live'`. Config editability is separate from send capability.
Editor: component-scoped controller holds draft, canonical original, options, schema state, loading/saving/reconciliation feedback and generation keyed by all three identity fields. Reuse AgentRunConfigForm/RuntimeModelConfigFields and existing value helpers; runtime/workspace/tool/skill policy stay locked. Connect existing model-selection-change and schema-state outputs. Save enabled only dirty + eligible + ready schema + existing selectionAllowed + no outstanding operation/reconciliation. Options unavailable blocks replacements but does not automatically block valid same-model settings. Preserve submitted draft on validation failure; reload canonical explicitly on uncertain commit, with retry control if refresh fails. No automatic resend of mutation.
Canonical root read and retained context must both support inactive editing; a leaf's Offline status cannot grant it. Live/unknown/reopen/pending state locks edits; server guards final write. Late reads/schema/options/save feedback are applied only to their captured identity/generation. Changing selection or leaving panel cannot cause result to appear on another member. Dispose controller callbacks, not the underlying accepted server operation.
Save action joins context-store operations with new 'configuration' value, using existing deferred-disposal/finishOperation handling. It blocks concurrent local Stop/Send while mutation awaits; no separate frontend lifecycle mutex. Use exact captured context/root correlation. End lease in finally, including failure. Backend lane remains final authority across clients.
On verified canonical result, apply model/config through context owner only while same retained context generation is still historical/inactive and root/member identity matches. Update the matching leaf in view.execution_tree, rebuild its index coherently and patch only that AgentContext.config model fields (and current conversation metadata model label where needed), without replacing messages/state/Activity/draft/attachments/selection/status. Never use full projection hydration just for Save. If owner became live/replaced, do not overwrite it; preserve result truth for original request and require fresh canonical read for editor. Do not mark a live root offline from stale query return. Recovery/continuation snapshots remain their existing authority.
On transport loss after Save, outcome is unknown: show verification required, no success; canonical refresh determines current saved values before another Save. Later ordinary Send always restores canonical tree, not the abandoned draft. No new replay/retry protocol or status/color workaround.
+ uses existing openNewOrgRun (root definition route) unchanged. It does not clone history, add member, alter existing configuration or start a provider.

## Capability reuse, draft → reusable → final file mapping
Draft responsibilities were header/entry, focused draft state, transport, authoritative root update, pure patch, retained publication and tests. Reusable structures: existing RunModelSelection/RunModelConfigUpdateResult and UI value helpers/form; new Org identity/canonical type under Org domain, not mostly-optional Agent/Team/Org mega-draft. Tightness: identity fields correlate rather than duplicate authority; canonical launch config is one source; draft selection is intentionally uncommitted user input, never another live config store.

Paths relative to repository; Add/Modify is final intended inventory, exact colocated test filenames may follow project convention:
| Path | Action / owner / single responsibility |
|---|---|
| server src/agent-org-execution/domain/agent-org-member-model-config.ts | Add narrow identity/canonical contract using existing shared result/selection types |
| server src/agent-org-execution/services/agent-org-member-model-config-mutator.ts | Add pure configured direct/mounted leaf resolve + immutable patch; no IO/lifecycle |
| server src/agent-org-execution/services/agent-org-run-manager.ts | Modify named canonical read/save under existing root lane and persistence ownership |
| server src/agent-org-execution/services/agent-org-run-service.ts | Modify public read/options/save boundary; reuse model selection service |
| server src/agent-execution/runtime/general-process-run-supervisor.ts | Modify composition/injection of existing model validator/options capability; no new runtime |
| server src/api/graphql/types/agent-org-run.ts | Modify typed canonical query/mutation DTOs and delegate; reuse run-model-config GraphQL objects |
| web components/workspace/org/AgentOrgWorkspaceView.vue | Modify visibility and entry eligibility, preserve new Org navigation |
| web components/workspace/org/AgentOrgMemberRunConfigPanel.vue | Modify form wiring and loading/save/error/back UI; active/task lock preserved |
| web composables/useAgentOrgMemberModelConfig.ts | Add focused ephemeral draft controller with exact identity/generation guards |
| web services/runConfigEditing/agentOrgMemberModelConfigClient.ts | Add typed transport/response shape checks, no context/lifecycle ownership |
| web graphql/queries/runModelOptionsQueries.ts and graphql/mutations/agentOrgRunMutations.ts | Add query/mutation documents in existing subject locations; if mutation document file absent create there |
| web stores/agentOrgContextsStore.ts | Modify read/save public actions, existing operation exclusion and exact publication delegation |
| web services/agentOrgExecution/agentOrgExecutionContext.ts | Modify config-only coherent view/index/context application |
| web locales existing workspace runModelConfig entries | Reuse current copy first; add only missing Org-specific messages in existing locale ownership |
| server tests/unit + integration corresponding Org/model-config owners; web colocated org/composable/store tests | Add durable acceptance/preservation coverage below |

`server` means autobyteus-server-ts/, `web` means autobyteus-web/. Existing directory depths clearly separate domain contracts, lifecycle services, persistence, GraphQL and renderer. No new folder hierarchy required for one capability. No writer/schema/platform handle production changes expected; unexpected need returns Design Impact. Generic value helpers remain unchanged unless a minimal reusable pure operation is genuinely missing; do not rewrite standalone stores.

## Examples and rejected compatibility shortcuts
Good: {orgRunId:'org-A', memberAddress:'/engineering/worker', agentRunId:'agent-7'} → manager-owned leaf patch in org-A tree. Bad: send agent-7 to standalone Agent settings API, or team mount ID to standalone Team manager. Good: canonical config-only publication on same inactive retained context. Bad: unhide gear but keep locked form; restore Org to obtain Settings; swap entire context/history after Save.
Rejected: nested-Team compatibility root, provider restore as read path, duplicated context-capacity policy, runtime ID recreation, whole-tree client writes. Replacement is native Org-owned model command using existing policy and persistence. No dual old/new schema paths. Derived layering: view/draft → context owner/transport → Org public service → lifecycle owner → pure patch/store; model validator is reused off-spine.

## Change/refactor sequence
1. Add narrow domain target/canonical contract and pure configured leaf resolver; durable identity/exclusion tests.
2. Extend manager read/save + composition/service/GraphQL; prove same-lane activation rejection and atomic outcomes using actual store fixture. No migration.
3. Add transport/controller, config-only context method and store action/exclusion; prove late owner isolation and preserved retained content.
4. Replace header/entry/panel restrictions, preserve active/task behavior and plus route, add real form rendered tests.
5. Run focused and adjacent checks; normal reviewed route, then actual API/E2E journeys. No source completion based only on mocks.
6. Remove obsolete blanket-lock assertions/conditions; retain historical tests only for behavior still intended.

## Validation and implementation guidance
Durable: direct/mounted exact configured targets; reject task/team/root/foreign IDs; active root with offline leaf, managed fail-stop, archive, missing/unadmitted; same-model config change (including 0/false), equal/larger replacement, smaller/unknown capacity rejection, schema/catalog errors; unchanged no write; pre-rename failure and post-rename uncertainty/readback; serialized restore-vs-save; bytes/semantic equivalence for all untouched fields. Render actual form/store path, not buttons-only stubs; canonical loading, schema events, disabled Save, field errors, stale response on selection switch, back/reopen, plus and no-target/task controls. Retain stopped Team/Agent control regression.
API acceptance: start with stopped Org direct and mounted members, Settings→same-model parameter Save→reopen; same-runtime supported replacement Save→ordinary Send verifies actual runtime uses selection and retained identity/content. Include native and an available external runtime where feasible; do not fabricate unavailable model pairs or assert all-provider certification. Actual browser controls required; API-only saves do not establish UI acceptance. Verify zero Agent/provider startups for inspect/save (model catalog metadata requests may occur), existing history/Activity/draft/attachment retention, untouched peers, active Org with Offline leaf remains locked. + opens new configuration only. Failure/uncertainty paths can use bounded controlled faults with limits explicitly stated. No user live dataset/server mutation.

## Tradeoffs, risks and residuals
Focused editor avoids copying old nested hierarchy and parent propagation while satisfying approved member scope. Separate draft controller reuses values/form, not standalone ownership; accepts a small subject-specific controller rather than broad global store refactor. Existing root lane is sufficient; no distributed locking/new CAS demanded. Cross-process concurrent writes to same profile are not newly supported. External provider continuation model semantics must be validated, not assumed from source. Full data-volume audit, all-provider matrix, Electron build, migrations and production rollout are out of scope. Canonical schema same → no data conversion benefit. Review must verify persistence/lifecycle and retained-publication paths before dependent implementation.
