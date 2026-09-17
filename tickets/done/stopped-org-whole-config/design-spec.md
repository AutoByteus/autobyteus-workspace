# Design Spec — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline / revision and user-approval reference: `SR-002`, approved 2026-09-17 when the user confirmed that selecting an individual member should load the same whole configuration form for AgentOrg as the original nested-Team/Team behavior.
- Behavior-defining supplements and approval references: none. The supplied Team screenshot, prior stopped-Org archive, and pinned personal source are read-only investigation evidence.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-whole-config/tickets/in-progress/stopped-org-whole-config/investigation-notes.md`

## Current-State Read

The current AgentOrg Settings path is internally coherent for its prior, explicitly member-only scope: a selected configured Agent drives an exact-member panel/composable/client/API, the Org manager serializes one member patch, and the retained context adopts one canonical member. The newly approved behavior changes the subject from one member to the enclosing AgentOrg. Keeping the old boundary and sequencing member calls would create the wrong authority, duplicate hierarchy policy, prevent one coherent Save, and permit partial application.

The codebase already contains the two required patterns:

1. AgentOrg launch renders the correct root/direct-Agent/mounted-Team hierarchy and familiar form structure.
2. existing Team Settings owns canonical whole-run loading, parent-linked draft propagation, multi-scope validation, one tree write/readback, and truthful reconciliation.

The target combines those patterns without making current definitions authoritative for stopped history: one shared AgentOrg form body, one existing-run model-config state machine, and one AgentOrg-root read/write contract over the retained execution tree.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: the change spans several files across two existing capability areas—AgentOrg execution/API persistence and web existing-run configuration—plus a bounded shared-form extraction. It adds one whole-root contract, one Org hierarchy adapter, store support, UI routing, tests, and removes the obsolete exact-member path. It does not introduce a new subsystem, storage schema, runtime family, deployment mechanism, or broad application redesign.
- Architectural risk: `High`
- Risk rationale and supporting evidence: this changes a public GraphQL contract, the persistence write granularity from one member to multiple scopes, lifecycle/concurrency authority, canonical client publication, and the configured hierarchy propagation policy. A defect could partially or incorrectly change persisted stopped-run configuration or apply it to the wrong scope. Although no migration is required, the persistence and ownership-boundary impact requires independent architecture review.
- Escalation trigger: reclassify/revise if implementation requires execution-tree schema changes, current-definition fallback for stopped runs, sequential writes, task-scope editing, changes to runtime/workspace/tool policy, a second parallel canonical cache, or changes outside the bounded AgentOrg/existing-run owners.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Current Org workspace/panel | `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue`; `AgentOrgMemberRunConfigPanel.vue` | Settings is keyed to exact selected member | Replace member subject with explicit `{ kind: 'agent_org', orgRunId }` existing-run target | None |
| Existing-run editor/store | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`; `stores/existingRunModelConfigStore.ts` | Already owns canonical load/save/reconcile for Agent/Team | Extend this state machine for AgentOrg; do not create a duplicate Org editor store | Final implementation naming may vary without changing ownership |
| Launch AgentOrg form | `AgentOrgRunConfigPanel.vue`; `editableAgentOrgRunFormModel.ts` | Correct familiar root/direct/mounted hierarchy exists but is coupled to new-run orchestration | Extract a shared presentational `AgentOrgRunConfigForm` used by both controllers | None |
| Team hierarchy policy | `existingTeamModelConfigDraft.ts` | Parent-linked scopes follow parent; direct edits remain independent | Extract generic hierarchical planner and add recursive propagation for Org's extra level | None |
| Org execution tree | `agent-org-run-execution-tree.ts`; shared records/schema | Canonical tree already contains all configured scope values and identities | Project stopped form directly from retained tree; exclude task executions | None |
| Team aggregate writer | `team-run-model-config-mutator.ts`; `AgentTeamRunManager.updateStoppedModelConfigs` | Resolve-all → validateMany → one tree/write/readback is established | Mirror aggregate algorithm behind AgentOrg manager transition | None |
| Org lifecycle writer | `AgentOrgRunManager.updateStoppedMemberModelConfig` | Existing admission/active/archive/ownership/write uncertainty guards are correct | Preserve guards while changing target granularity | None |
| Context publication | `AgentOrgExecutionContext.applyMemberModelConfig`; `agentOrgContextsStore` | In-place model-only adoption preserves local UI state | Generalize to validate and publish a canonical whole tree once | None |
| Pinned personal source | commit `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793` `RunConfigPanel.vue` | Selected nested Team used one enclosing-Team editor | Confirms interaction precedent only; no old runtime architecture copied | None |

## Intended Change

Replace configured AgentOrg member-only Settings with one enclosing AgentOrg existing-run configuration experience. Any eligible configured direct or mounted-Team Agent opens the same editor for `orgRunId`. The body is the same shared form used by AgentOrg launch, but it is supplied an existing-run model: canonical stopped values, fixed runtime/workspace/tool policy, model/model-parameter editing, and Save rather than Run.

The server accepts all changed configured scopes in one command, resolves and validates them before mutation, persists one next execution tree, reads back one canonical tree, and returns a truthful result. Client state adopts that canonical tree only if the root context, window binding, request generation, and lifecycle remain current.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Production Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001 / AC-001 | Gear on eligible configured stopped Org Agent | Exact-member panel keyed by member | One explicit Org target from either placement | `AgentOrgWorkspaceView` → explicit existing-run editor target; DS-001 |
| BEH-002 | User | REQ-002, REQ-003 / AC-001, AC-002 | Whole-Org Settings loads | Launch form has hierarchy; member Settings does not | Shared launch/existing AgentOrg form with locked existing mode | Form projector/body; DS-001 |
| BEH-003 | User | REQ-004 / AC-002 | Root/Team/member model edit | Team has one-level linked propagation | Recursive configured hierarchy propagation with explicit overrides preserved | Hierarchy planner; DS-003/DS-005 |
| BEH-004 | System | REQ-005, REQ-006 / AC-003, AC-004 | Explicit Save | Exact-member write only | Resolve/validate all patches, one write/readback, truthful reconciliation | Store → GraphQL → service/manager/store; DS-003/DS-004 |
| BEH-005 | User/System | REQ-006–008 / AC-004–006 | Active/stale/failure/continuation and adjacent paths | Existing guards and retained tree continuation | Preserve lifecycle/data; canonical saved settings used later; no inspect/save startup | Context/lifecycle/restore; DS-004/DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| User screenshot path recorded in requirements | Shows established whole-Team form | REQ-001–004 / AC-001–002 | Comparative presentation evidence | Read-only; fixture content non-normative |
| `tickets/done/stopped-org-member-header-actions/requirements-doc.md` | Establishes prior member-only authority and preserved guards | REQ-006–008 | Defines what is superseded and what must remain | Historical, read-only |
| Pinned personal commit comparison | Confirms enclosing-Team interaction precedent | REQ-001–004 | Pattern evidence, not target runtime design | Read-only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` plus bounded refactor.
- Current design issue found: `Yes` relative to the newly approved subject boundary; the former design was correct for its prior approved member-only scope.
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination` if the new behavior were added beside it.
- Refactor needed now: `Yes`.
- Evidence: exact-member identity/API cannot express root/global or mounted-Team scopes and cannot guarantee one coherent multi-scope Save. Launch hierarchy markup and existing Team saved-run policy live in separate controllers.
- Design response: make the AgentOrg run the authoritative Settings subject; reuse one existing-run state machine and a shared AgentOrg form body; replace the exact-member API with one whole-root contract; extract a reusable hierarchical draft policy.
- Refactor rationale: retaining both member and root Settings would create competing authorities, duplicated UI, and inconsistent validation/persistence semantics.
- Intentional deferrals and residual risk: broader consolidation of Agent, Team, and Org server services is not required. Team's public API remains unchanged; it only consumes the extracted hierarchy policy. Residual risk is bounded to ensuring the shared form extraction does not change launch behavior.

## Terminology

- **Configured scope:** the root Org, a direct mounted Team, or a configured Agent from `rootOrg.members`; never a delegated task execution.
- **Model-linked:** at draft start, a configured child's runtime/model/model-config equals its configured parent for the fields governed by model inheritance.
- **Whole-Org Save:** one command and one canonical tree outcome for all changed configured scopes.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the configured member-only panel/composable/client/query/mutation/domain/mutator and their obsolete tests/docs after the whole-Org path is complete.
- No wrapper, alias, hidden member endpoint, or sequential fallback may remain for old behavior.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: each retained AgentOrg package contains `agent-org-run-execution-tree.json` under the Org memory directory; schema v1 carries one root and its configured members plus tasks/handoffs. Volume is one file per Org run; no inventory rewrite is needed.
- Relevant model/serialization/physical-store change: none. Only existing `llmModelIdentifier` and `llmConfig` values may change.
- Normal reader/writer behavior: current schema validator reads the full tree; restore and continuation consume the same launch configurations; atomic writer replaces one validated tree and reads it back.
- Required semantics/invariants: schema v1, root identity, configured topology, addresses, run IDs, task/handoff/application/archive metadata, and all locked launch fields remain unchanged.
- Physical-store/privacy/operational constraints: no user-data scan, startup migration, reset, or external package write; normal per-Org atomic file write only after explicit Save.
- Decision: `Directly Usable — No Migration`.
- Rationale: existing packages already contain every required scope and field in the current schema. A migration provides no correctness benefit and would add unnecessary I/O and corruption/recovery exposure.
- Supported constraints: REQ-005–008; AC-003–006.
- Migration plan: N/A.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Configured stopped Org member gear | Canonical whole-Org form rendered | Existing-run editor/store | Establishes one root subject and familiar form |
| DS-002 | Primary End-to-End | BEH-002, BEH-004 | Canonical draft load | Per-scope model options displayed | AgentOrg run service + options service | Options are advisory and independent from canonical display |
| DS-003 | Primary End-to-End | BEH-003, BEH-004 | User edits root/Team/Agent and presses Save | One verified canonical tree returned | AgentOrg manager transition | Core persisted update path |
| DS-004 | Return-Event | BEH-004, BEH-005 | Mutation canonical/failure result | Editor/context reconciled or refresh required | Existing-run store + Org contexts store | Prevents false success and local divergence |
| DS-005 | Bounded Local | BEH-003 | Scope edit in draft | Linked descendants updated; patches planned | Hierarchical draft planner | Encodes Team-consistent change policy |
| DS-006 | Primary End-to-End | BEH-005 | Later ordinary continuation/Send | Provider uses saved scope configuration | AgentOrg restore/runtime owners | Proves meaningful saved outcome without Save-time activation |
| DS-007 | Return-Event | BEH-004, BEH-005 | Root lifecycle/binding/selection changes | Editor locks or stale result is ignored | Context/store generations + manager lock | Race and wrong-target protection |

## Primary Execution Spines

- DS-001: `Member gear → AgentOrgWorkspaceView → ExistingRunConfigEditor({kind:'agent_org', orgRunId}) → existing-run store → whole-run query → AgentOrgRunService/Manager → execution-tree store → existing AgentOrg form projection → shared AgentOrgRunConfigForm`.
- DS-003: `Form edits → hierarchical draft planner → changed-scope patches → existing-run store Save → GraphQL mutation → AgentOrgRunService → AgentOrgRunManager.withTransition → resolve targets → validateMany → apply immutable patches → atomic write/readback → canonical result`.
- DS-006: `User returns to conversation and sends → retained Org continuation/restore → canonical execution tree → configured scope/runtime setup → provider request`.

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Any eligible leaf is only an entry gesture; the editor target is immediately normalized to its enclosing Org run. A network canonical read, not mutable current definitions, populates the shared form. | Org target, canonical tree, existing draft, form model | Existing-run editor/store | stale-generation checks, DTO validation |
| DS-002 | After canonical load, all configured scopes request replacement options using their fixed runtime/workspace/current model. Failure leaves historical values visible but blocks unsupported replacement. | Configured scope options | AgentOrg run service | catalog/capacity availability |
| DS-003 | The draft records hierarchical intent; Save emits only changed scopes. The manager validates every scope under one root transition before producing and persisting one next tree. | Patch command, validated targets, canonical tree | AgentOrgRunManager | schema validation, atomic writer |
| DS-004 | Success adopts the readback tree; failure adopts any trustworthy canonical tree; indeterminate/transport outcomes force refresh and prohibit replay. | Mutation result, local draft/context | Existing-run store | feedback and field-error mapping |
| DS-005 | An edit propagates recursively only through children linked at draft start and not directly edited. | Draft scope graph | Hierarchical planner | immutable cloning/equality |
| DS-006 | Save itself remains inert; only later supported continuation uses the stored tree to configure executions. | Retained Org run | Existing runtime owners | provider evidence during validation |
| DS-007 | UI generations reject late reads/saves; lifecycle publication locks local editing; the manager transition remains definitive against concurrent activation. | Target/lifecycle generation | Context/store and manager | window binding, submissions |

## Spine Actors / Main-Line Nodes And Ownership Map

| Node | Ownership |
| --- | --- |
| `AgentOrgWorkspaceView` | Normalize eligible member action to enclosing `orgRunId`; host config/chat transition only. |
| `ExistingRunConfigEditor` | Explicit existing-run target lifecycle, load trigger, shared Save shell, correct subject form selection. |
| `existingRunModelConfigStore` | Canonical draft state, generations, model options, schema readiness, dirty patches, Save/reconcile state machine. |
| Hierarchical draft planner | Parent links, direct-edit state, recursive propagation, deterministic changed-scope patch plan. |
| `AgentOrgRunConfigForm` | Shared presentation and semantic events for launch/existing modes; no IO or persistence. |
| AgentOrg GraphQL resolver | Typed transport and DTO projection only. |
| `AgentOrgRunService` | Public Org configuration boundary and batched options orchestration. |
| `AgentOrgRunManager` | Root transition, package/lifecycle/editability authority, validate-all/write/readback sequencing. |
| Org model-config mutator | Pure configured-scope resolution and immutable tree patching. |
| `AgentOrgExecutionContext` / contexts store | Current root-operation gate and defensive in-place publication of canonical model-only changes. |

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL query/mutation | AgentOrgRunService/Manager | Stable typed client boundary | hierarchy propagation, lifecycle policy, writes |
| `AgentOrgWorkspaceView` | ExistingRunConfigEditor/store | Product navigation/gesture | canonical cache or persistence |
| client functions | GraphQL/DTO schemas | transport parsing | optimistic canonical mutation |

## Removal / Decommission Plan

| Item To Remove | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AgentOrgMemberRunConfigPanel.vue` | Wrong member-only subject | shared existing-run editor + AgentOrg form | In This Change | No alias wrapper |
| `useAgentOrgMemberModelConfig.ts` | Duplicates existing-run state machine | `existingRunModelConfigStore` AgentOrg branch | In This Change | Preserve race semantics in shared owner |
| `agentOrgMemberModelConfigClient.ts` | Obsolete exact-member transport | whole-run client/mutation/options | In This Change | Remove symbols/tests |
| `agent-org-member-model-config.ts` and mutator | Cannot express root/Team/multiple patches | whole-run domain contract/mutator | In This Change | Clean rename/replacement |
| exact-member GraphQL query/mutation and store methods | Competing legacy API | whole-run query/options/mutation | In This Change | Update docs/tests; no dual path |
| `AgentOrgExecutionContext.applyMemberModelConfig` | Single-leaf publication only | whole-tree model-only adoption | In This Change | Preserve in-place local state |
| duplicated AgentOrg configuration body markup | Would drift between launch and Settings | `AgentOrgRunConfigForm.vue` | In This Change | Controllers retain own actions |

## Return Or Event Spines

- DS-004: `server result → transport schema validation → current-target/generation check → canonical draft sync → defensive context tree adoption → form feedback`; on indeterminate or transport failure: `result/error → reconciliationRequired → network canonical reload → unlock only after success`.
- DS-007: `context activation/operation/binding change → local lifecycle lock/generation invalidation → disabled Save`; independently `concurrent activation → manager transition observes active root → RUN_ACTIVE canonical result`.

## Bounded Local / Internal Spine

- Parent owner: hierarchical draft planner.
- Chain: `edit scope → clone target selection and mark direct edit → visit children → update model-linked, not-direct children → recurse only through updated child → deterministic patch comparison`.
- Why: AgentOrg has two configured descendant levels; immediate-only Team propagation is insufficient.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves Owner | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| DTO/schema parsing | DS-001–004 | client/store | Reject malformed/mismatched root/tree/result | Trust boundary | Corrupt local canonical state |
| Model options | DS-002/003 | store/form | Replacement capacity and catalog advisory | Separate availability from canonical read | Canonical display blocked by catalog |
| Model-schema field errors | DS-003/004 | planner/form | Address server errors to exact scope/field | User correction | Global opaque error or wrong scope |
| Atomic file writer | DS-003 | manager | One rename/outcome/readback | Existing durability mechanism | Partial/misreported persistence |
| Context in-place adoption | DS-004 | contexts store | Preserve conversation/activity/drafts | UI continuity | Rehydration data loss |
| Localization/docs | DS-001–004 | form/contracts | Accurate Org/stopped/save language | Accessibility/clarity | Team/member terminology drift |

## Ownership Boundaries And Encapsulation

- The AgentOrg run is the authoritative configuration subject. Member address is no longer part of the Settings read/write identity.
- UI components depend on the existing-run store, never directly on GraphQL.
- The store depends on typed client boundaries and pure draft/projector structures; it does not inspect server persistence.
- AgentOrgRunService exposes whole-run read/options/update; AgentOrgRunManager encapsulates transition/lifecycle/store sequencing.
- The pure mutator receives an already-read canonical tree and explicit patches; it cannot perform IO, validation lookup, or lifecycle decisions.
- Current definitions/reference catalogs are launch-only inputs and are forbidden on the stopped canonical path.

## Boundary Encapsulation Map

| Authoritative Boundary | Internals Encapsulated | Upstream Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `existingRunModelConfigStore` | draft graph, generations, options, reconciliation | existing-run editor/form | component → Apollo or context mutation | add store action |
| `agentOrgContextsStore` | current context identity, operations, binding/submissions | existing-run store | direct `AgentOrgExecutionContext` mutation from component | add root config read/save/adopt method |
| `AgentOrgRunService` | manager and model-options orchestration | GraphQL resolver | resolver → tree store/model service | add explicit service method |
| `AgentOrgRunManager.withTransition` | active registry, package admission, writer/readback | service | service/mutator writes file | extend manager command |
| whole-run mutator | configured-scope index and immutable patching | manager | manager hand-edits nested nodes | extend resolver/apply functions |

## Dependency Rules

1. Shared form has no store, route, Apollo, definition, or persistence dependency.
2. Launch controller supplies editable form model/events; existing-run editor supplies existing form model/events.
3. Stopped form projection uses only canonical execution tree plus draft/options state, never current definition catalogs.
4. One shared hierarchy planner owns linked/direct-edit/patch policy for Team and Org adapters.
5. Only the manager writes the Org execution tree, and only after all targets/validations succeed.
6. The client never treats requested patches as canonical; only read/readback server tree is adopted.
7. No task address may resolve as a configured patch target.
8. No sequential exact-member fallback, optimistic partial application, or dual legacy endpoint.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `getAgentOrgRunModelConfig` | stopped AgentOrg config | canonical tree + lifecycle/editability | `{ orgRunId }` | network-only canonical read |
| `agentOrgRunModelOptions` | configured scope options | list advisory options for all configured scopes | `{ orgRunId }`; rows carry kind/address | separate from canonical availability |
| `updateStoppedAgentOrgRunModelConfigs` | whole Org update | validate/persist changed scopes, return canonical | `{ orgRunId, patches[] }` | every patch explicitly includes nullable `llmConfig` |
| `ExistingRunConfigTarget` | editor subject | explicit UI load identity | Agent/Team/AgentOrg tagged union | no implicit mixed selector |
| hierarchy planner adapter | canonical hierarchy | construct scope graph | root + parent-addressed scopes | no IO |
| context adoption | retained UI context | publish model-only canonical tree | `{ orgRunId, executionTree, isActive }` | rejects topology/locked-field drift |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| whole-run read | Yes | Yes | Low | root ID only |
| options query | Yes | Yes | Low | scope kind/address rows validated |
| whole-run mutation | Yes | Yes | Low | strict target resolver and duplicate rejection |
| editor target | Yes | Yes | Low | required tagged union prop |

## Main Domain Subject Naming Check

| Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| persisted edit subject | AgentOrg run model configuration | Yes | Low | remove “member” from replaced API names |
| patch target | configured Org/Team/Agent scope | Yes | Low | enum kind + canonical address |
| local policy | existing hierarchical model-config draft | Yes | Low | keep independent of Team/Org transport |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| existing-run state machine | `existingRunModelConfigStore` | Extend | Same lifecycle/Save/reconcile meaning | N/A |
| hierarchy edit policy | Team existing draft | Extract/Extend | Same approved inheritance policy, Org adds a level | N/A |
| AgentOrg presentation | launch form components | Extract/Reuse | User requires same form | N/A |
| atomic persistence | AgentOrg manager/tree store | Extend | Existing root transition and writer authority | N/A |
| selection validation | `RunModelSelectionService` | Reuse `validateMany/listOptionsMany` | Request-local shared evidence and current policy | N/A |

## Subsystem / Capability-Area Allocation

| Capability Area | Concerns | Spines | Governing Owners | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Web existing-run configuration | target, draft, options, validation, save/reconcile | DS-001–005/007 | editor/store/planner | Extend | Add AgentOrg subject cleanly |
| Web AgentOrg workspace/form | gesture normalization, shared form, context publication | DS-001/004/007 | workspace/form/contexts store | Refactor/Extend | Launch and Settings share body |
| Server AgentOrg execution | whole-run read/update/lifecycle/write | DS-001–004 | service/manager/mutator | Replace exact-member contract | Same root owner |
| Model selection | options/validation | DS-002/003 | existing service | Reuse | no new policy |

## Draft File Responsibility Mapping

| Candidate File | Capability | Owner | Concern | One-File Rationale | Shared? |
| --- | --- | --- | --- | --- | --- |
| `existingHierarchicalModelConfigDraft.ts` | web existing-run | planner | generic linked scope graph and recursive patch policy | pure cohesive policy | Yes, Team+Org |
| `existingAgentOrgModelConfigDraft.ts` | web existing-run | Org adapter | flatten canonical Org configured hierarchy | Org-specific projection only | uses planner |
| `existingAgentOrgRunFormModel.ts` | web form | projector | existing tree/draft/options → shared form model | presentation projection | uses existing node types |
| `AgentOrgRunConfigForm.vue` | web form | presentational form | common launch/existing body | exact UI parity owner | Yes |
| `agentOrgRunModelConfigClient.ts` | web transport | typed client | canonical read and result schemas | root contract | no UI |
| `agent-org-run-model-config.ts` | server domain | domain contract | scope/patch/result types | one vocabulary | no IO |
| `agent-org-run-model-config-mutator.ts` | server execution | pure mutator | target resolution/tree apply | one pure concern | no validation IO |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| linked scope/draft/patch policy | `existingHierarchicalModelConfigDraft.ts` | web existing-run | Team and Org same policy | Yes | Yes | transport DTO or UI store |
| editable/existing AgentOrg form shape | `AgentOrgRunFormModel.ts` | web AgentOrg form | one shared body contract | Yes | Yes | canonical persistence model |
| configured-scope server patch vocabulary | `agent-org-run-model-config.ts` | server AgentOrg | service/manager/mutator/GraphQL agree | Yes | Yes | generic cross-family union |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| hierarchy draft scope | Yes | Yes | Low | parent address + original/draft/link/direct-edit only |
| AgentOrg form union | Yes | Yes | Medium | discriminate `editable`/`existing`; keep canonical tree out |
| server patch | Yes | Yes | Low | explicit kind/address/model/config; no identity aliases |

## Final File Responsibility Mapping

| File | Capability | Owner / Boundary | Concrete Responsibility | Why One File | Shared Structure |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/org/AgentOrgWorkspaceView.vue` | workspace | entry | route eligible gear to Org target; render wrapper | navigation only | explicit target |
| `.../config/ExistingRunConfigEditor.vue` | existing config | controller | required target load/render/Save shell | one subject-neutral controller | store |
| `.../config/AgentOrgRunConfigForm.vue` | AgentOrg form | presentation | common launch/existing form body | prevents UI drift | form union |
| `.../config/AgentOrgRunConfigPanel.vue` | launch | launch controller | definition/reference/seed/Run; delegates body | keeps new-run ownership | shared form |
| `.../config/AgentOrgDirectAgentOverrideRow.vue` | AgentOrg form | row | editable/existing direct-Agent row/events | same row both modes | node union |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | existing config | state machine | Agent/Team/Org canonical draft/save/reconcile | one policy owner | hierarchy planner |
| `autobyteus-web/services/runConfigEditing/existingHierarchicalModelConfigDraft.ts` | existing config | pure planner | linked graph/recursive propagation/patches | reusable pure policy | N/A |
| `.../existingTeamModelConfigDraft.ts` | existing config | Team adapter | build Team scopes for planner | subject adapter | planner |
| `.../existingAgentOrgModelConfigDraft.ts` | existing config | Org adapter | build root/Team/Agent scopes; omit tasks | subject adapter | planner |
| `.../existingAgentOrgRunFormModel.ts` | form projection | Org existing projector | canonical/draft/options → shared form model | one projection concern | existing node types |
| `.../agentOrgRunModelConfigClient.ts` | transport | root read parser | canonical read identity/schema | separate read boundary | DTO schema |
| `.../existingRunModelConfigMutationClient.ts` | transport | mutations | add whole-Org mutation | mutation family already here | patch type |
| `.../existingRunModelOptionsClient.ts` | transport | options | add AgentOrg branch | one options policy | draft union |
| `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts` | context | retained context | validate/adopt whole model-only tree in place | replaces one-member method | tree schema |
| `autobyteus-web/stores/agentOrgContextsStore.ts` | context | operation gate | root config read/save/adoption and stale checks | current root owner | client/store |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-model-config.ts` | server domain | contract | whole-run scope/patch/result types | cohesive vocabulary | N/A |
| `.../services/agent-org-run-model-config-mutator.ts` | server execution | pure mutator | configured target resolution/apply | pure tree concern | domain types |
| `.../services/agent-org-run-manager.ts` | server execution | authority | read/editability, validateMany, one write/readback | lifecycle/persistence owner | mutator |
| `.../services/agent-org-run-service.ts` | server service | public boundary | read/update delegation and listOptionsMany | root API orchestration | manager/model service |
| `.../api/graphql/types/agent-org-run.ts` | transport | resolver | new query/options/mutation DTOs; remove member API | one transport surface | service |

## Applied Patterns

- **Explicit subject target:** existing-run editor receives a tagged target instead of consulting multiple selection systems.
- **Functional core / imperative shell:** hierarchy planner and tree mutator are pure; stores/managers own IO and lifecycle.
- **Canonical readback:** client adopts only server-read canonical tree.
- **Shared presentational form:** launch and stopped controllers share one body while keeping Run/Save orchestration separate.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/` | Folder | form capability | shared form/editor components | existing location | Apollo/persistence |
| `autobyteus-web/services/runConfigEditing/` | Folder | existing-run policy/client adapters | planners, projectors, typed clients | existing capability | route/UI state |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | File | state owner | cross-subject existing-run state machine | existing owner | server tree mutation |
| `autobyteus-web/services/agentOrgExecution/` | Folder | retained Org context | canonical model-only adoption | current context owner | form policy |
| `autobyteus-server-ts/src/agent-org-execution/domain/` | Folder | AgentOrg domain | whole-run config vocabulary | natural subject | GraphQL decorators |
| `autobyteus-server-ts/src/agent-org-execution/services/` | Folder | AgentOrg execution | service/manager/mutator | existing ownership depth | web DTO state |
| `autobyteus-server-ts/src/api/graphql/types/agent-org-run.ts` | File | transport | root config operations | existing resolver | persistence logic |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| web config components | Mixed justified presentation/controller | Yes | Low | existing feature folder; explicit store boundaries |
| web runConfigEditing services | Off-spine policy/adapters | Yes | Low | pure policy and typed clients separated by file |
| server AgentOrg domain/services | Domain-control | Yes | Low | contract, pure mutator, service, manager separated |
| GraphQL types | Transport | Yes | Low | thin resolver only |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Settings identity | `{ kind: 'agent_org', orgRunId: 'org-1' }` | `{orgRunId, memberAddress, agentRunId}` | whole Org is the subject |
| Root propagation | `/` edit → linked `/team` → linked `/team/agent`; explicit `/direct` unchanged | issue one mutation per descendant | preserves policy and atomicity |
| Save command | one patch list, validate all, one tree write | sequential exact-member saves | prevents partial result |
| Form reuse | launch and existing controllers both render `AgentOrgRunConfigForm` | copied stopped-only markup | guarantees familiar experience |
| Canonical source | stopped execution tree | current mutable definition graph | retained history must remain inspectable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep exact-member query/mutation for hidden callers | Existing delivered API | Rejected | search-proven consumers migrate; delete API/types/files/tests |
| UI fallback to member editor | Might reduce initial changes | Rejected | whole-Org editor is sole configured-member Settings path |
| Current-definition fallback if tree projection fails | Launch code already has definitions | Rejected | show canonical read/projection error; do not rewrite history meaning |
| Sequential member saves | Reuses exact writer | Rejected | one aggregate manager command and atomic tree write |
| schema migration/dual reader | Generic caution | N/A/Rejected | current schema directly usable |

## Derived Layering

`Workspace gesture → explicit existing-run controller/store → pure hierarchy/form projection → typed GraphQL boundary → AgentOrg service → transition-owning manager → pure tree mutator → atomic tree store`, with model options and context publication as off-spine concerns.

## Change / Refactor Sequence

1. Add server whole-run domain types and pure configured-scope resolver/apply tests.
2. Replace manager/service exact-member read/update with whole-run read/options/update using `validateMany`, existing guards, one write/readback, and scoped errors.
3. Replace GraphQL exact-member operations with whole-run query/options/mutation and tests.
4. Extract generic hierarchical draft policy; adapt Team and prove current Team behavior unchanged, then add recursive Org adapter tests.
5. Define editable/existing AgentOrg form union and extract `AgentOrgRunConfigForm` from launch body; keep launch behavior/tests unchanged.
6. Extend direct-Agent row/shared components for existing mode and add existing Org projector tests.
7. Make existing-run editor target explicit; extend store/options/mutation clients for AgentOrg and reconciliation tests.
8. Generalize context adoption and contexts-store root operation gating.
9. Route AgentOrg workspace gear to root editor; replace member tests with direct/mounted same-editor tests.
10. Remove all exact-member source/API symbols and update canonical docs.
11. Validate supported UI journeys, aggregate persistence/fault cases, Team/Agent/launch/`+` preservation, and ordinary continuation.

## Key Tradeoffs

- Extending the existing-run store is a larger local refactor than an Org-only store, but it avoids two save/reconciliation policies and is the natural capability owner.
- Extracting a shared form body touches launch code, but it is the only robust way to satisfy the user's same-form requirement and prevent visual/policy drift.
- Separate options query adds one request but preserves canonical display when catalog/capacity lookup is unavailable and mirrors Team behavior.
- A new whole-run API replaces a working exact-member API, but retaining both would violate the clean subject boundary and legacy policy.

## Risks

- Recursive propagation may overrun explicit overrides: mitigate with parent-link/direct-edit unit matrices and Team regression tests.
- Whole-tree client adoption may replace local history state: require non-model/topology equality checks and in-place configured-context patching.
- Launch form extraction may alter new-run behavior: retain source hashes/behavioral tests and validate definition-only and source-seeded launch.
- Concurrent activation may race Save: UI lifecycle lock is advisory; manager transition and active registry are definitive.
- Options/field errors may map to wrong scope: validate kind/address rows and encode server paths as `patches[address]...`.
- Large Orgs may request many options: `listOptionsMany` reuses request-local evidence; no stated SLA, but avoid per-scope serial calls.

## Guidance For Implementation

- Do not implement whole-Org Save as a loop over the old member mutation.
- Do not use current definition packages to reconstruct a stopped tree or hide canonical topology errors.
- Keep task executions completely outside configurable scope enumeration.
- Treat `llmConfig: null` as an explicit value; reject omitted patch fields at GraphQL boundary.
- Preserve current model compatibility rule and same-runtime fixed field policy exactly.
- Validate all targets and selections before constructing/writing the next tree.
- On persistence indeterminate or transport loss, never replay automatically; require canonical refresh.
- On client adoption, verify root/topology/IDs and all locked fields before mutating retained contexts; update local model fields in place.
- Tests must use the supported gear → form → Save → reopen → ordinary Send path for both direct and mounted placements; direct API calls alone are insufficient.
- Preserve AgentOrg `+` source-seeded new-run behavior and standalone Team/Agent paths with focused regression evidence.
