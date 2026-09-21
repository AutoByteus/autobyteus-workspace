# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (requirements approval basis remains SR-002)
- Package identifier: `ORG-STOPPED-WHOLE-CONFIG-20260917-001`
- Request / ticket: Stopped AgentOrg Settings must edit the enclosing whole-Org configuration rather than only the clicked Agent.
- Requirements owner: Solution Designer
- Date: 2026-09-17
- Approval state and reference: Approved by the user on 2026-09-17: “Yes ... when we click one individual agent ... it also loads the same configuration form for the whole agent team. So we should use the same behavior for AgentOg.”
- Exact approved requirements baseline / solution revision: `SR-002`, including launch-form presentation parity, Team-consistent change policy, existing-run locks, coherent Save, lifecycle guards, and preservation boundaries.
- Behavior-defining supplements and their approved versions: None. The supplied screenshot is investigation evidence only.

## Problem And Desired Outcome

- Problem: from a stopped AgentOrg history, Settings is entered through an individual configured Agent and currently opens an editor for that Agent alone. The established stopped-Team experience opens one editor for the complete enclosing Team, including its root configuration and member overrides.
- Affected actors or systems: a user inspecting and preparing to continue a stopped AgentOrg run; existing stopped-run configuration persistence and continuation.
- Desired outcome: Settings from any eligible configured Agent inside a stopped AgentOrg opens one whole-Org configuration editor. It exposes the Org root/global model configuration and the complete configured direct-Agent and mounted-Team hierarchy, so the user can update root defaults or specific overrides coherently before continuation.
- Observable definition of success: the direct-Agent and mounted-Team entry points resolve to the same enclosing Org editor and canonical Org configuration; a valid whole-Org Save survives reopen and is used on continuation without replacing identities, history, or unrelated run state.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A stopped Org member's gear opens `AgentOrgMemberRunConfigPanel`, keyed to the exact member identity and titled as Agent configuration. | The gear on any eligible configured Org member opens the one whole-Org existing-run editor for the enclosing Org. | Existing gear placement, Back behavior, stopped-run eligibility, and direct/mounted entry points. | Current `AgentOrgWorkspaceView.vue`, `AgentOrgMemberRunConfigPanel.vue`, and prior approved ticket archive. |
| BEH-002 | User | SCN-001, SCN-002, SCN-003 | The current Org editor reads and saves one selected member. The AgentOrg launch editor already shows root, direct-Agent, mounted-Team, and Team-member configuration in one hierarchy; stopped Team Settings reuses its familiar complete-Team form structure. | Reuse the same visible AgentOrg configuration form structure and hierarchy that users see when launching an AgentOrg, now populated from the stopped run's canonical values and presented in existing-run mode. Permit root and per-scope model/model-parameter edits. | Existing-run differences remain truthful: fixed fields stay locked, the action is Save rather than Run, and no new identities or run are created. Task executions are not editable configuration scopes. | `AgentOrgRunConfigPanel.vue`, current Team launch/existing forms, execution-tree contracts, and the user's clarification. |
| BEH-003 | User | SCN-003 | Team root edits propagate to children that matched their parent at draft start, while explicit or directly edited overrides remain independent. Current Org member-only editing has no global propagation. | Whole-Org editing follows the same parent-linked override semantics across Org root → direct Agent or mounted Team → Team member. | Existing distinct overrides remain distinct; unrelated explicit overrides are not overwritten. | `existingTeamModelConfigDraft.ts`; Team source and user-provided Team screenshot. |
| BEH-004 | System | SCN-001, SCN-002, SCN-004 | Current Org mutation validates and writes one selected member. Team can validate multiple changed scopes and persist one canonical tree result. | Validate all changed Org scopes and save them as one coherent whole-Org change; never report partial success. Reopen from any member shows canonical saved values. | Existing compatibility/schema validation, inactive/archived/ownership guards, truthful uncertain-write reconciliation, and no provider activation on inspect/save. | Current Org member manager/mutator; Team multi-scope manager/mutator/store behavior. |
| BEH-005 | User/System | SCN-004, SCN-005 | Active Org members remain noneditable; stopped-member continuation uses the retained execution tree. | Whole-Org Settings is editable only while the enclosing Org is authoritatively inactive and eligible. Successful values are used on ordinary continuation at their configured scopes. | Conversation/history, Activity, attachments, drafts, messages, tasks, handoffs, application binding, statuses, timestamps, and unchanged configuration remain intact. | Prior stopped-Org requirements and current lifecycle/inspection paths. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User of a retained AgentOrg run | Adjust the entire stopped Org's model configuration before continuing work | One discoverable whole-Org editor, regardless of which configured member was selected | No need to visit every member and save separately |
| AgentOrg runtime/history system | Preserve canonical stopped-run state and resume it correctly | One validated canonical configuration result, used on continuation | No activation merely to inspect or save; no partial tree update |
| Existing Team/Agent users | Keep current stopped-run behavior | No regression in standalone Agent or Team Settings and new-run controls | This ticket does not redesign those surfaces |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: From an eligible configured direct Agent in a stopped Org, open and use the enclosing whole-Org Settings editor.
- `UC-002`: From an eligible configured Agent inside a mounted Team in a stopped Org, open and use the same enclosing whole-Org Settings editor.
- `UC-003`: Inspect and edit root/global and configured-scope model/model-specific parameters with Team-consistent inheritance and override behavior.
- `UC-004`: Save multiple changed configured scopes coherently, reopen, and continue the same stopped Org with the saved configuration.
- `UC-005`: Handle active, stale, invalid, unavailable, failed, and persistence-indeterminate states truthfully.

### Out Of Scope

- Editing AgentOrg definitions, membership, addresses, handoffs, roles, or package files.
- Editing or synthesizing delegated task executions or task-Agent configuration.
- Changing runtime/provider family, workspace, tool/auto-approval policy, or skill policy for an existing stopped run.
- Changing the `+` action/new-Org seed behavior completed by the earlier ticket.
- Migration, history repair, reset, conversion, release, deployment, or Electron packaging.
- General redesign of Settings, history, sidebar, or monitor surfaces.

### Non-Goals

- Do not make a stopped run equivalent to editing its source definition.
- Do not introduce automatic model choices, arbitrary cross-runtime replacement, or eager provider startup.
- Do not preserve the single-member-only editor as a second competing Settings path for configured Org members.

### Preserved Behavior Boundary

- Preserve the earlier stopped-Org `+` behavior and continuation/data-retention outcomes outside the Settings scope (`BEH-005`, `REQ-007`, `AC-006`).
- Preserve standalone Agent/Team existing-run Settings, validation, new-run copying, and active-run restrictions (`REQ-008`, `AC-006`).
- Cross-cutting invariant: only model selection and model-specific parameters may change; all other canonical run state remains unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- New product behavior, migration duties, editing policies, or compatibility promises require a requirements revision and explicit user approval.
- Adjacent concerns outside this boundary are recommendations or separate-ticket candidates, not required corrections.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Settings invoked from any eligible configured direct or mounted-Team Agent in a stopped AgentOrg opens the complete configuration for that enclosing Org run, not an editor limited to the clicked Agent. | BEH-001 | Must | This is the user's requested Team-parity correction. | User request, 2026-09-17. |
| REQ-002 | The stopped-run editor uses the same recognizable AgentOrg configuration form structure, labels, ordering, disclosures, and root/direct-Agent/mounted-Team hierarchy as the AgentOrg launch configuration surface. It is populated from the selected stopped run's canonical values. Task executions are not configuration scopes. | BEH-002 | Must | Users should see the familiar AgentOrg form again rather than learn a second configuration experience. | User clarification, 2026-09-17; current launch form and execution-tree boundary. |
| REQ-003 | For the root and configured scopes, the editor permits only model selection and model-specific parameter changes. Runtime/provider family, workspace, auto-approval/tool policy, skill policy, topology, identities, addresses, roles, and handoffs are visible only where already established and remain fixed. | BEH-002, BEH-005 | Must | Matches established existing-Team behavior and the earlier same-runtime stopped-run policy. | Current Team editor; prior approved stopped-Org constraints. |
| REQ-004 | Parent-linked configuration behaves like stopped Team Settings: a child whose effective model configuration matched its parent when the draft opened follows parent model/parameter changes until that child is directly edited. A pre-existing or directly edited override remains independent. This applies through Org root → direct Agent or mounted Team → configured Team Agent. | BEH-003 | Must | Gives root/global editing predictable effect without destroying explicit member overrides. | Current Team planner semantics; user requests the same experience. |
| REQ-005 | A single explicit Save validates every changed configured scope using the existing same-runtime compatibility and schema rules, then applies one coherent whole-Org result. Validation failure applies none of the requested changes. A failed or indeterminate persistence result must not claim success and must require canonical refresh/reconciliation before another Save. | BEH-004 | Must / data integrity | Sequential independent writes could leave the Org internally inconsistent. | Existing Team and Org persistence guarantees. |
| REQ-006 | Whole-Org model editing is enabled only while the enclosing Org is authoritatively inactive, unarchived, admitted, and otherwise eligible. An active Org, an offline leaf within an active Org, stale selection, target change, or pending submission must not enable a write or write to another Org. | BEH-004, BEH-005 | Must / lifecycle safety | Leaf status alone does not establish safe stopped-run editing. | Prior approved stopped-Org lifecycle policy. |
| REQ-007 | Inspecting or saving never restores the Org, starts a provider, sends a message, or allocates new run identities. After a successful Save, reopen shows canonical values and ordinary continuation uses them at the correct scopes while preserving all non-configuration run data. | BEH-004, BEH-005 | Must / continuity | Configuration maintenance must not alter execution lifecycle or history. | User goal and prior continuation contract. |
| REQ-008 | Preserve existing standalone Agent/Team Settings, AgentOrg `+`/new-run behavior, active inspection, task policy, and all unrelated AgentOrg launch/definition behavior. | BEH-005 | Must / regression | This is a focused whole-Org stopped Settings change. | Scope guardrail. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, BEH-002 / SCN-001, SCN-002 | A stopped Org contains at least one configured direct Agent and one mounted Team Agent | Gear from either placement opens the same enclosing Org editor, headed as Org configuration and using the familiar launch-form structure for the root and complete configured hierarchy | A task Agent or ineligible target does not become a configurable scope | Rendered comparison plus actual UI in both placements |
| AC-002 | REQ-003, REQ-004 | BEH-002, BEH-003 / SCN-003 | Root, mounted Team, and members include both parent-equal and explicit override model configurations | Root edit updates linked descendants; a mounted-Team edit updates its linked configured members; existing/directly edited overrides remain unchanged; locked fields cannot be changed | Invalid/unavailable selections remain blocked with accurate scope feedback | Planner/projection tests and actual UI inspection |
| AC-003 | REQ-005, REQ-007 | BEH-004, BEH-005 / SCN-001, SCN-002 | User changes root plus at least one explicit member override and saves | One Save succeeds, reopen from either member shows canonical saved values, and ordinary continuation uses the applicable saved root/member settings | Validation failure persists none; uncertain save shows refresh/retry rather than success or replay | Backend/store integration plus actual UI Save→reopen→Send |
| AC-004 | REQ-005, REQ-006 | BEH-004, BEH-005 / SCN-004 | Active Org/offline leaf, archived/ineligible Org, stale navigation, or write failure | Editing is disabled or rejected; no cross-target or partial write; state is reconciled truthfully | A confirmed unchanged request may report unchanged without rewriting | Lifecycle/race tests and actual active/offline control |
| AC-005 | REQ-007 | BEH-005 / SCN-005 | Inspect, Save, reopen, and continue a stopped Org | Org/member identities, addresses, runtime/workspace/tool policy, handoffs, tasks, messages, conversation, Activity, attachments, drafts, application binding, and untouched config remain intact; no provider call before ordinary Send | If continuation fails, the saved canonical configuration remains inspectable and no false response is invented | Preservation manifest and real owner-path validation |
| AC-006 | REQ-008 | BEH-005 / SCN-005 | Exercise adjacent standalone Agent/Team and Org `+` paths | Existing controls and behavior remain unchanged | No new task editing or definition mutation appears | Focused regression coverage |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User inspecting retained Org | Adjust global and member configuration before continuing | Gear on a configured direct Agent in stopped Org history | Enclosing Org is inactive and eligible | Select Agent → Settings → inspect whole Org → edit root/member → Save → reopen/continue | Complete Org editor and durable coherent update | Validation/persistence failures remain truthful and retryable | Supported Normal Scenario | User request plus current stopped-Org Settings entry | REQ-001–007 / AC-001, AC-003 |
| SCN-002 | User | User inspecting retained Org | Get the same whole-Org control from a mounted Team member | Gear on configured mounted-Team Agent in stopped Org history | Same as SCN-001 | Select mounted member → Settings → inspect/edit/save | Same enclosing Org configuration and outcome as direct-Agent entry | Ineligible task branches remain excluded | Supported Normal Scenario | User parity request; current mounted member entry exists | REQ-001–007 / AC-001, AC-003 |
| SCN-003 | User | User editing hierarchical defaults | Change a global or Team-level default without destroying explicit overrides | Whole-Org Settings form | Mixed inherited and overridden configured scopes | Change root; optionally change mounted Team/member; inspect resulting draft | Only parent-linked descendants follow; explicit overrides remain independent | Invalid scope selection blocks Save with scope-specific feedback | Supported Normal Scenario | Established Team editor semantics and screenshot | REQ-003–005 / AC-002 |
| SCN-004 | User/System | User plus lifecycle owner | Prevent an unsafe stopped-run edit | Settings while active/ineligible or while navigation/write state changes | Active root, stale target, or persistence problem | Open/attempt edit/save while condition applies | No unsafe or cross-target write and no false success | Canonical refresh/retry after uncertain persistence | Supported Normal Scenario alternate | Prior stopped-Org approved lifecycle contract | REQ-005, REQ-006 / AC-004 |
| SCN-005 | Contract | Existing run-continuity contract | Preserve the run while changing only authorable model config | Inspect/Save/reopen/ordinary continuation | Existing Org package with history and configured topology | Complete maintenance flow and adjacent regression checks | Only approved model fields change; continuation and other surfaces remain intact | Failure does not reset or repair unrelated data | Supported Normal Scenario preservation | Prior delivery evidence and current Team contract | REQ-007, REQ-008 / AC-005, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: N/A — no separate supplement.
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: N/A — no prototype requested.
- Product prototype ticket record and folder: N/A.
- Prototype revision or commit: N/A.
- UI/UX user-confirmation reference: User approved SR-002 on 2026-09-17 by explicitly directing the same whole-Team configuration behavior for AgentOrg.
- Approved visual-reference baseline: N/A. The supplied Team screenshot is comparative evidence, not a normative mockup.
- Normative visual and interaction details: retain the current monitor gear and Back interaction; identify the surface as whole AgentOrg configuration; reuse the AgentOrg launch configuration form's recognizable layout, labels, ordering, hierarchy, and override disclosures. Existing-run semantics remain visibly truthful: canonical stopped values are loaded, runtime/workspace/tool-policy fields remain locked, the bottom action is one explicit Save rather than Run, and no new-run operation occurs. Preserve labelled, keyboard-operable controls and truthful loading/validation/save/reconciliation feedback.
- Explicitly illustrative fixture content or permitted implementation variation: Agent, Team, Org names and model values in screenshots are illustrative.
- Required states: loading, editable stopped, read-only/ineligible, validation blocked, saving, saved/unchanged, persistence failed, and refresh required.
- Explicitly unresolved product decisions: None beyond explicit user approval of SR-001.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005 / AC-003, AC-004 | Reliability | A multi-scope Save has one observable canonical outcome; no requested subset may be presented as successfully saved. | Validation, write, readback, and indeterminate outcomes | Fault-oriented owner tests and canonical readback evidence |
| QR-002 | REQ-006, REQ-007 / AC-004, AC-005 | Reliability | Zero restore/provider-start/message-send operations occur during inspect or Save. | Direct and mounted entry, success and failure | Runtime/provider call evidence |
| QR-003 | REQ-001, REQ-002 / AC-001 | Accessibility | Whole-Org Settings is reachable through the existing labelled gear, exposes a meaningful Org configuration title/structure, and retains keyboard-operable controls. | Supported desktop/web-equivalent surface | Rendered semantic checks and actual UI |
| QR-004 | REQ-007, REQ-008 / AC-005, AC-006 | Compatibility | Non-model run state and adjacent Agent/Team/Org paths remain unchanged within the scoped fixtures. | Before/after preservation and regression suite | Hash/state comparison and focused regressions |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — the retained AgentOrg execution tree's model-selection fields may change after explicit Save.
- Data or state that must be preserved: root/member run IDs, platform IDs, addresses, definition IDs, roles/descriptions, runtime kind, workspace paths, tool/skill policy, handoffs, task records, messages, conversation/history, Activity, attachments, drafts, timestamps, archive state, application binding, and every untouched configuration value.
- Loss, reset, rebuild, or regeneration that is acceptable: none for user-authored or runtime history data. Only transient editor draft state may be discarded when the user leaves without Save.
- Retention, privacy, compliance, volume, downtime, or operational constraints: use isolated validation data; do not alter the user's running app/profile or external definition packages. No migration downtime is authorized.
- Unknowns requiring downstream investigation: architecture must determine whether the existing execution-tree schema can support the whole-Org operation without a data migration; current evidence indicates the needed resolved configuration already exists in the tree.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| AgentOrg execution-tree package | Supplies root, direct Agent, mounted Team, and Team-member resolved launch configurations | Current domain/schema and inspection DTO | Whole-Org writer/read contract does not yet exist |
| Model catalog/schema validation | Enforces same-runtime compatible model replacement and valid model-specific parameters per changed scope | Existing Agent/Team/Org stopped-run validation | Multi-scope validation must remain deterministic and scope-addressed |
| AgentOrg lifecycle/transition owner | Serializes inspection/save with activation and package ownership state | Current Org run manager | Design must avoid stale UI authority and partial persistence |
| Original `personal` nested-Team source | Comparative source evidence for whole enclosing-Team editor behavior | Pinned commit `5645b49d6f51faa60bd3545bc8e3f0e7e3f96793` | Reference pattern only; it is not authority to copy obsolete nested-Team architecture |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/software_development_department_75403d5130584669869fdd59725f6b3e/software_engineering_team_3e746e3211f34fb39aad3979b4751e04/solution_designer_b1a3b7b01d35499d9fa06baf799a2046/context_files/ctx_292cb8d08517__image.png` | Comparative evidence of the established whole-Team stopped configuration surface | REQ-001–004 / AC-001, AC-002 | Read-only evidence | Not behavior-defining; approval of requirements does not make fixture content normative |
| `tickets/done/stopped-org-member-header-actions/requirements-doc.md` | Prior ticket authority proving member-only Settings was intentional in that earlier scope | REQ-001, REQ-008 | Historical, read-only | Superseded only for Settings scope if SR-001 is approved |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | “Whole AgentOrg config” means the root/global model configuration plus every configured direct/mounted scope, using the established Team-style inheritance and override behavior and the familiar AgentOrg launch-form presentation. | Converts the user's Team-parity request and UI clarification into a testable scope. | User approval of SR-002 | Confirmed |
| ASM-002 | Existing-run runtime/provider family, workspace, tool/auto-approval, and skill policy stay fixed; “runtime like the model and configs” refers to the existing same-runtime model and model-parameter policy. | Avoids silently expanding the prior safety boundary. | User approval of SR-002 and prior ticket policy | Confirmed |
| ASM-003 | Delegated task executions are runtime history, not part of configured whole-Org Settings. | Keeps the editor aligned to authorable configured topology. | User approval of the complete SR-002 boundary; architecture verifies tree projection | Confirmed |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Does the SR-002 interpretation exactly match the requested whole-Org behavior, including launch-form presentation with existing-run locks and Save semantics? | Explicit approval is required before architecture design. | User approval quoted in Document Status | User | Resolved — approved |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001 | SCN-001, SCN-002 | Team screenshot; prior ticket archive |
| REQ-002 | UC-001–003 | BEH-002 | AC-001 | SCN-001–003 | Execution-tree evidence |
| REQ-003 | UC-003 | BEH-002, BEH-005 | AC-002 | SCN-003 | Existing Team editor |
| REQ-004 | UC-003 | BEH-003 | AC-002 | SCN-003 | Existing Team planner |
| REQ-005 | UC-004, UC-005 | BEH-004 | AC-003, AC-004 | SCN-001–004 | Team multi-scope and Org current writer evidence |
| REQ-006 | UC-005 | BEH-004, BEH-005 | AC-004 | SCN-004 | Prior lifecycle authority |
| REQ-007 | UC-004 | BEH-004, BEH-005 | AC-003, AC-005 | SCN-001, SCN-002, SCN-005 | Prior continuation authority |
| REQ-008 | UC-005 | BEH-005 | AC-006 | SCN-005 | Scope guardrail |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: pending approval of SCN-001–005.
- Product and system constraints architecture must preserve: one enclosing Org editor, Team-consistent hierarchy/inheritance, same-runtime model-only edits, coherent canonical Save, inactive lifecycle guard, no provider activation, full run-data preservation.
- Decisions intentionally deferred to architecture design: canonical whole-Org read/write API boundary; reuse or generalization of existing Team planner/form/store; validation aggregation; atomic write/readback/reconciliation; exact UI owner replacement; migration necessity.
- Technical facts architecture should verify: execution tree already carries root/direct/mounted/member resolved launch configs; current Org exact-member GraphQL/service/mutator is narrow; current Team multi-scope editor and mutation are the closest precedent; fresh-Org launch form has different editable fields and new-run semantics and cannot be assumed suitable unchanged.
- Known feasibility or integration risks: two-level parent propagation, active/inspection race safety, per-scope model catalogs/schema errors, preventing divergent read authorities, and preserving previous `+` behavior.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None.

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None.
