# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user-approved on 2026-08-25 and re-approved after architecture finding F-001. Existing-run model settings unlock only after the user manually stops the standalone run or entire root Team; Save persists without restarting, all three runtimes must honor the saved settings on automatic restore, and the stopped existing-Team editor does not add a Reset-to-inherited action.

## Goal / Problem Statement

Allow a user to update **model-specific configuration** on an already-created independent Agent Run or Agent Team Run only after it has been explicitly stopped/inactivated. Examples include Codex reasoning effort and Fast mode, and AutoByteus thinking/reasoning controls supported by the selected model.

The run's runtime and model identity remain fixed. Executing work must never be reconfigured mid-turn, and saving model settings must not discard the logical run, history, workspace, team structure, member identities, or provider conversation binding.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Saving an Agent Definition updates the reusable definition but does not mutate an already-active runtime. | No change. Existing-run model-setting edits use a dedicated per-run operation rather than piggybacking on definition save. | Definition editing remains separate from run-instance editing. | REQ-001, REQ-015; AC-015 |
| BEH-002 | A newly created or restored runtime consumes the run's persisted model and `llmConfig` during bootstrap. | Preserve bootstrap behavior and make a successful existing-run edit the persisted input to the next restore/bootstrap. | New-run creation continues to use its launch draft; provider/runtime capability handling stays authoritative. | REQ-006, REQ-007, REQ-015; AC-001, AC-002, AC-007, AC-014, AC-015 |
| BEH-003 | An active runtime keeps a prepared configuration for its lifetime; later turns do not re-read edited configuration automatically. | Preserve active runtime behavior. Configuration remains locked until the user explicitly stops the run/team; the next message restores the stopped run with any subsequently saved settings. | No provider-specific hot mutation, implicit interruption, or mixed-configuration turn. | REQ-002, REQ-003, REQ-006, REQ-009; AC-002–AC-004, AC-007, AC-008 |
| BEH-004 | Selecting an existing independent Agent Run makes the entire configuration form read-only, including `llmConfig`, even when the run is inactive. No supported write API persists a local edit. | Keep the form locked while the run is active, including active-idle. After the user explicitly stops it, keep runtime/model/unrelated controls fixed but permit schema-supported `llmConfig` edits and persist them on Save. | The run ID, agent definition, model, runtime, workspace, history, and unrelated launch settings do not change. | REQ-001–REQ-007, REQ-010–REQ-012; AC-001–AC-004, AC-009–AC-014 |
| BEH-005 | Selecting an existing Agent Team Run projects its stored execution tree as entirely read-only. Root, nested-team, and member model settings cannot be revised. | Keep the Team Configuration locked while the root is active. After the user explicitly stops the root, permit model-setting edits at the root, nested-team, and configured-agent scopes. Preserve deterministic parent-cascade boundaries but do not add Reset-to-inherited to this stopped-run surface. | Team topology, task/message history, runtime/model identities, workspaces, unrelated launch settings, and existing pre-launch Reset behavior do not change. | REQ-001, REQ-003–REQ-012, REQ-015; AC-005–AC-015 |
| BEH-006 | Standalone history exposes incomplete inactive editability flags, while team history exposes no editability contract; neither path provides a persistence mutation. | The server returns authoritative editability and canonical configuration and owns the update transition for standalone and team runs. The UI must not infer safety from stale local status alone. | Existing read/history hydration remains the source of displayed stored configuration. | REQ-002, REQ-003, REQ-009, REQ-012; AC-003, AC-004, AC-008, AC-010 |
| BEH-007 | Current model catalogs and schemas drive launch-time Thinking and advanced controls, including Codex reasoning effort/service tier, but historical selected-run mode presents them as read-only. | Reuse the selected runtime/model's current schema to edit only supported values. Never silently discard a stored value when the catalog/schema is loading, unavailable, or no longer represents it. | A model without a supported editable parameter does not gain an invented control or value. | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-012 |

## Investigation Findings

- The selected-run UI applies one broad read-only flag to runtime, model, and model-configuration controls. It has no existing Save action.
- Standalone and team runtime configurations are bootstrap-lifetime snapshots. Codex maps `llmConfig.reasoning_effort` and `llmConfig.service_tier` into thread configuration; AutoByteus passes `llmConfig` into LLM creation.
- Existing standalone metadata and the team execution tree already persist `llmConfig`; no storage-shape change is required.
- The approved stopped-only workflow removes active-idle detection and interruption from Save. The server still must serialize a stopped-run Save against automatic restoration so persisted and effective state cannot race.
- Team lifecycle and persistence are owned at the root execution. A team edit therefore requires the entire root to be stopped and uses one root-scoped persistence update; it never independently edits a live member.
- A stored team execution tree contains resolved/effective launch settings but not original override provenance. The stopped form uses value equality only to preserve deterministic parent-change propagation: editing a parent/default flows to descendants whose fixed runtime/model and normalized `llmConfig` currently match that parent; other branches remain unchanged. It does not add Reset-to-inherited, because the stopped-run contract cannot change fixed runtime/model identity.

Detailed evidence is in `investigation-notes.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | UI/UX state, journey, feedback, and accessibility specification for existing-run model-setting edits | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012 | AC-001–AC-014, AC-016 | Refined; re-approved after F-001 on 2026-08-25 | Constrains intended observable behavior and is part of the approved requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Behavior Change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, narrowly within run lifecycle transition ownership.
- Evidence basis: The UI's all-or-nothing lock is only the visible limitation. No server update operation exists and local standalone edit guards do not persist. Restricting edits to stopped runs removes active command-admission/termination coordination from Save, but persistence still must serialize with automatic restore/activation and concurrent updates. Team create/restore already has a per-root transition lane that can govern the stopped-state update.
- Requirement or scope impact: Implementation must introduce explicit standalone and team model-configuration update boundaries. It must not bypass `AgentRun`/`AgentTeamRunManager`, mutate backend internals directly, or write metadata/tree state independently of lifecycle serialization.

## Recommendations

1. Treat this as a stopped-run persistence feature, not only a form-unlock patch.
2. Keep runtime and model selectors visibly fixed; enable only schema-backed model-configuration controls.
3. Keep the UI change small and contextual: before launch, the existing footer action remains `Run Agent` / `Run Team`. For a selected existing run/team, that footer action is `Save`; it remains disabled while active, clean, invalid, or otherwise ineligible. After Stop and a valid change, Save enables and persists without starting or stopping a runtime. The next message uses the existing automatic restore path.
4. Make the server's editability decision and Save result authoritative. Preserve the draft when eligibility changes or the server rejects the update.
5. Use a narrow team model-config command contract rather than accepting a client-authored replacement execution tree.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium: the stored data shape is reusable, but the change crosses standalone/team UI, GraphQL contracts, lifecycle concurrency, persistence, restore behavior, and durable coverage.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001:** Edit schema-supported model settings for an existing independent Agent Run while it is inactive/stopped.
- **UC-002:** Keep an active standalone run fully locked, explicitly stop it through the existing Stop workflow, and then enter UC-001.
- **UC-003:** Edit root, nested-team, or configured-agent model settings for an existing Agent Team Run while the root is inactive/stopped.
- **UC-004:** Keep an active Team Run fully locked, explicitly stop the root through the existing Stop workflow, and then enter UC-003.
- **UC-005:** Save the revision and use it on the next message/activation without creating a new logical run or losing continuity.
- **UC-006:** Recover from eligibility, validation, catalog, persistence, or race failures without silent configuration loss.

### Out of Scope

- Changing the runtime kind or LLM model identifier of an existing run.
- Changing workspace, Agent/Team Definition, topology, role, tools/skills, auto-approval, skill-access mode, or any other unrelated launch field.
- Mutating an in-flight turn, interrupting executing work merely to apply settings, or hot-patching a provider/native backend.
- Editing task-created/transient team executions; only root, nested configured-team defaults, and configured-agent launch settings are editable.
- Adding model parameters or provider capabilities that are not already exposed by the selected runtime/model schema.
- Fixing unrelated runtime-adapter behavior; the approved Claude thinking/reasoning bridge is in scope because those settings are already advertised to this form.
- Changing reusable Agent or Team Definitions; this feature edits one stored run instance.
- Archival/deletion semantics or creation of a new run/version as a substitute for updating the selected run.

### Preserved Behavior Boundary

BEH-001 through BEH-003 and REQ-007/REQ-015 remain authoritative. Each executing turn uses one stable effective configuration. Existing logical run identity, history, provider binding, workspace, team topology, member identities, task/message records, and all non-`llmConfig` launch fields must survive an edit.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **REQ-001 — Editable field boundary:** For an existing standalone or team run, the only mutable launch field is `llmConfig`. Runtime kind and LLM model identifier remain visible but disabled, as do workspace and every unrelated field. The update contract must reject attempts to change fixed fields.
- **REQ-002 — Standalone stopped-only eligibility:** A standalone run's configuration remains fully locked whenever its runtime is active, regardless of whether its visible status is initializing, idle, running, or error. Model settings become editable only after the existing Stop operation completes and the server confirms the run is inactive/offline. Deleted or archived runs are not editable.
- **REQ-003 — Team stopped-only eligibility:** A Team Run's configuration remains fully locked whenever the root is managed/active, regardless of member statuses or whether the team appears idle. Model settings become editable only after the existing root Stop operation completes and the server confirms the entire root is inactive/offline. No configured or transient member is edited independently while the root is active.
- **REQ-004 — Supported model settings:** Editable controls are generated from the selected runtime/model's current model-configuration schema. They include, where supported, Thinking, reasoning effort, service tier/Fast mode, budgets, summaries, and other already-advertised `llmConfig` parameters. The required examples are Codex reasoning effort and Default/Fast service tier, plus AutoByteus and Claude thinking/reasoning settings supported by their selected models. Every setting offered for Save must be carried into that runtime's next restored execution; the Claude adapter must no longer discard its advertised thinking/reasoning values.
- **REQ-005 — Contextual footer and explicit Save:** Before launch, the existing configuration footer continues to show `Run Agent` or `Run Team`. After launch, opening that run's selected configuration shows `Save` in the same footer position and visual style. Changing an eligible control modifies a local draft only. Save is enabled only when the draft differs from canonical stored config, the schema is available, values are valid, and the last known lifecycle state is eligible. Leaving without saving does not persist the draft; reopening shows canonical stored values.
- **REQ-006 — Stopped Save boundary:** Save never stops, interrupts, or activates a runtime. The server rechecks that the standalone run or Team root is inactive, validates the submitted `llmConfig`, persists it, and leaves the run inactive. The next message uses the existing automatic restore path and the revised configuration.
- **REQ-007 — Continuity and preservation:** A successful update preserves the standalone `runId` or root `teamRunId`, all configured member addresses and agent/team run IDs, provider conversation/thread/session bindings, history, summaries, workspace associations, team task/message records, and all fixed launch fields. It does not create a replacement run.
- **REQ-008 — Team scope and stopped-run propagation boundary:** After the entire root Team is stopped, the user may edit root defaults, nested configured-team defaults, and configured-agent settings through the existing Team Configuration hierarchy. A direct leaf edit changes only that configured scope. When an edited scope is a parent/default, the change also flows to each descendant whose draft-start fixed runtime, fixed model, and normalized `llmConfig` matched its immediate parent and that has not been directly edited in the current draft; any fixed-identity/model-config divergence or direct draft edit is a boundary and that branch remains unchanged. A direct edit after propagation overrides the propagated value and becomes a boundary for later ancestor edits in the same draft. This value-based comparison plus explicit draft-edit tracking is the available deterministic rule because stored execution trees do not retain original override provenance. The stopped existing-run editor does **not** offer `Reset to inherited`; users edit each scope's own model settings directly. Existing pre-launch Reset behavior remains unchanged under REQ-015. Transient task executions are never editable targets.
- **REQ-009 — Authoritative stopped-state serialization:** The stopped-state check and persistence must be governed by the standalone/root lifecycle owner and serialized against restore/activation and concurrent updates. If a message restores the run before Save claims the stopped state, Save is rejected with no persisted change and the form relocks. If Save claims first, restore waits or is rejected/retried until persistence completes. No active runtime may coexist with an uncommitted configuration update.
- **REQ-010 — Validation and catalog safety:** The server validates that `llmConfig` is null or an object and that every submitted key/value is currently valid for the fixed runtime/model schema. The client may validate early but is not authoritative. While the model catalog/schema is loading, failed, missing, or cannot represent a stored historical value, editing and Save are unavailable; the UI shows the stored value without silently normalizing, deleting, or persisting it and offers catalog retry where possible.
- **REQ-011 — User-visible operation states:** The existing configuration surface receives only the necessary additions: active-state guidance to stop before editing, editable model-setting controls after stop, one Save action, `Saving…` progress, and success/error feedback. It explains that the next message resumes the stopped run automatically. During Save, affected inputs and duplicate Save actions are disabled and an accessible progress state is exposed.
- **REQ-012 — Canonical response and refresh:** Read and update APIs return enough canonical data to render current `llmConfig`, lifecycle/editability, and update outcome. After success or failure, the client refreshes/reconciles from the server response; it must not treat a local patch as proof that persistence or runtime recycling succeeded.
- **REQ-013 — Failure safety:** An active-state or validation rejection makes no persisted change. If persistence fails, the run remains stopped, the previously committed configuration remains authoritative, and the response supplies or triggers a canonical refresh. An indeterminate persistence outcome must be reported explicitly and reconciled from storage before another Save; the UI must never claim success speculatively.
- **REQ-014 — Idempotency/no-op:** Reapplying the canonical normalized `llmConfig` is a no-op and does not stop or activate a run. Duplicate in-flight submissions are coalesced or rejected deterministically.
- **REQ-015 — Preserved creation and definition flows:** New Agent/Team launch configuration and reusable Agent/Team Definition editing retain their existing behavior. This feature does not broaden their editable fields or couple definition save to existing-run mutation.

## Acceptance Criteria

- **AC-001 (UC-001):** Given an inactive standalone AutoByteus run whose fixed model exposes thinking/reasoning parameters, selecting it shows runtime/model as disabled and those model-setting controls as editable. Saving a valid change persists the new `llmConfig`, keeps the run inactive, and the next message restores the same run with the new values.
- **AC-002 (UC-002/UC-005):** Given an active or active-idle Codex run, all configuration remains locked with guidance to stop it. After Stop completes, reasoning effort and Fast mode become editable. Successful Save keeps the same run stopped; the next message resumes the same provider thread/run and Codex receives the new reasoning effort and service tier.
- **AC-003 (UC-002/UC-006):** Given any active standalone runtime status, model-setting controls and Save are unavailable. Calling the update API directly is rejected and leaves persisted configuration unchanged. After server-confirmed Stop, only schema-supported model settings become editable.
- **AC-004 (UC-001/UC-002/UC-006):** Given a stopped standalone run and a concurrent message that would restore it, exactly one operation wins: if restore claims first, Save is rejected and the form relocks; if Save claims first, restore waits or is retried until the atomic persistence result is known. Save never interrupts a turn.
- **AC-005 (UC-003):** Given an inactive Team Run, changing a root model setting updates root/nested-team/member draft `llmConfig` only along the REQ-008 draft-start matching-propagation chain; stored-divergent or directly edited draft branches remain unchanged. Saving persists exactly the resulting narrow configured-scope changes.
- **AC-006 (UC-003):** Given an inactive Team Run, the user can directly update a configured nested-team or agent scope's own schema-supported `llmConfig`. The stopped-run form offers no `Reset to inherited` action. If that scope's effective settings diverged from its parent before an ancestor edit, runtime/model remain fixed and the ancestor change does not cross that branch. Task-created/transient executions are not offered as editable targets.
- **AC-007 (UC-004/UC-005):** Given any active Team Run, configuration remains locked even when all members appear idle. After the existing root Stop completes, the authorized Team model settings become editable; successful Save keeps the same root stopped, and the next message restores the same team/member identities with revised values.
- **AC-008 (UC-003/UC-004/UC-006):** A direct Team update while the root is managed/active is rejected without changing the execution tree. A stopped-root Save racing with restore follows REQ-009 ordering and never edits a live member.
- **AC-009 (UC-006):** Given an unknown key, wrong value type, out-of-range value, or unsupported enum for the fixed runtime/model, Save shows validation errors, retains the draft, keeps the run stopped, and does not alter persisted configuration.
- **AC-010 (UC-006):** Given persistence fails, the UI reports failure, refreshes canonical stored configuration, and the run remains stopped. Given an indeterminate team-tree commit result, the UI reports an uncertain outcome and blocks another Save until canonical reconciliation completes.
- **AC-011 (UC-001–UC-004/UC-006):** Given a loading/failed/missing catalog or a selected model whose schema cannot represent a stored value, no automatic sanitization is persisted. Editable controls and Save stay unavailable, the stored representation remains visible, and Retry is available for a recoverable catalog failure.
- **AC-012 (UC-001–UC-004):** On every existing-run screen, runtime, model, workspace, definition/topology, auto-approval, and skill-access controls remain disabled. Only schema-supported model-setting controls at eligible scopes can receive focus or edits.
- **AC-013 (UC-001–UC-006):** Save is disabled for an unchanged draft and during submission. Unsaved edits never reach persistence and reopening the selected configuration restores canonical values. Save feedback is announced to assistive technology and all editable controls/actions are keyboard accessible.
- **AC-014 (UC-005):** Across successful standalone and team updates, run IDs, provider bindings, histories, workspace associations, topology/member identities, task/message records, and fixed launch fields compare equal before and after; only authorized `llmConfig` locations differ.
- **AC-015:** Creating a new run and saving a reusable definition continue to follow their pre-change paths and do not call the existing-run update operation.
- **AC-016 (UC-001/UC-005):** Given a stopped Claude run whose fixed model advertises thinking/reasoning settings, saving a valid change and sending the next message restores the same run/session and carries the revised values through the Claude session/query adapter rather than silently discarding them.

## Constraints / Dependencies

- Runtime/model schemas are supplied by the existing runtime-scoped model catalog and may be dynamically unavailable.
- Model configuration is prepared during backend bootstrap. The supported generic boundary is runtime recycle/restore, not backend-specific hot mutation.
- The standalone command path can lazily restore an inactive run; the team send path already restores an inactive root before dispatch.
- Team edits must be root-scoped because task, communication, materialization, persistence, and member lifecycle are coordinated by the root execution owner.
- Existing stored Team Run snapshots do not retain original launch override provenance; REQ-008 uses effective-value comparison only for deterministic parent-change propagation. The stopped-run surface does not attempt to reconstruct or clear launch-time override intent and does not add Reset-to-inherited.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Standalone `run_metadata.json.llmConfig`; Team Run `team_run_execution_tree.json` schema v2 root/nested `defaultLaunchConfiguration.llmConfig` and configured-agent `launchConfiguration.llmConfig`.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): **Directly Usable — No Migration**.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Existing null/object `llmConfig` values remain valid and are edited in place through normal atomic writers. No historical package rewrite or schema-version bump is authorized.
- Unacceptable data loss or corruption: Loss or replacement of run/team/member identity, history, provider binding, workspace, task/message records, fixed launch values, or stored model-config keys due to catalog loading/sanitization.
- Relevant availability, maintenance-window, or rollout constraints: None identified; updates are per selected run and require a server-confirmed stopped/inactive boundary.
- Related requirement and acceptance-criteria IDs: REQ-006–REQ-010, REQ-012–REQ-014; AC-001, AC-002, AC-005, AC-007, AC-009–AC-011, AC-014.

## Assumptions

- “Stopped” means the stored run remains resumable/inactive, not deleted.
- The user confirmed that runtime and model identity do not change; only the selected model's configuration changes.
- Stop is an explicit user action completed before editing. Save never stops or interrupts an active run/team.
- Team configuration includes the global/root defaults and existing configured member/nested-team model settings shown in the selected Team Configuration surface.

## Risks / Open Questions

- **Approved:** Existing-run configuration is stopped-only. While active—including active-idle—the form remains locked. The user explicitly stops the run/team first; then edits and clicks Save. Save itself never stops or interrupts work. The user approved this on 2026-08-25.
- **Approved:** Keep the UI change minimal and contextual: the pre-launch footer action is Run; after launch, the selected configuration footer action is Save. The user approved this interaction on 2026-08-25.
- **Approved:** Saved model settings must be effective across AutoByteus, Codex, and Claude. The user approved adding the missing Claude `llmConfig` session/query bridge on 2026-08-25.
- **Approved:** A Team must be stopped at the root before any Team model setting unlocks. Editing a specific configured scope changes that scope; a parent/default change follows REQ-008's value-matching propagation boundary. The stopped-run editor adds no Reset-to-inherited action; existing pre-launch Reset remains unchanged. The user approved this simplified F-001 resolution on 2026-08-25.
- Unrelated adapter gaps remain outside this ticket; the already-advertised Claude thinking/reasoning path is the approved exception required for all-three-runtime parity.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001–UC-004 |
| REQ-002 | UC-001, UC-002, UC-006 |
| REQ-003 | UC-003, UC-004, UC-006 |
| REQ-004 | UC-001–UC-004 |
| REQ-005 | UC-001–UC-004, UC-006 |
| REQ-006 | UC-001–UC-005 |
| REQ-007 | UC-005 |
| REQ-008 | UC-003, UC-004 |
| REQ-009 | UC-001–UC-006 |
| REQ-010 | UC-001–UC-004, UC-006 |
| REQ-011 | UC-001–UC-006 |
| REQ-012 | UC-001–UC-006 |
| REQ-013 | UC-006 |
| REQ-014 | UC-001–UC-006 |
| REQ-015 | Preserved boundary outside changed use cases |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Inactive standalone AutoByteus success path |
| AC-002 | Active Codex locked; stopped Codex reasoning/Fast save and continuity |
| AC-003 | Standalone non-eligible state and direct-API defense |
| AC-004 | Stopped standalone Save-versus-restore race ordering |
| AC-005 | Inactive Team root cascade/inheritance |
| AC-006 | Team nested/member direct edit, divergent-branch isolation, and no stopped-run Reset |
| AC-007 | Active Team locked; stopped Team save/restore success |
| AC-008 | Active Team rejection and stopped Team Save-versus-restore race |
| AC-009 | Schema validation failure while stopped |
| AC-010 | Persistence failure and indeterminate reconciliation |
| AC-011 | Catalog/schema/historical-value safety |
| AC-012 | Fixed-versus-editable control boundary |
| AC-013 | Draft, no-op, submission, navigation, keyboard, and announcement behavior |
| AC-014 | Persistence and identity preservation |
| AC-015 | Existing launch/definition regression boundary |
| AC-016 | Stopped Claude save/restore and runtime-adapter effectiveness |

## Approval Status

Approved on 2026-08-25 and re-approved after architecture-review finding F-001. The authoritative workflow is: manually stop the independent Agent Run or the entire root Team Run; only then edit schema-supported model configuration and Save; leave the run/team stopped; automatically restore the same logical execution with the saved configuration on the next message. Team parent changes propagate only through pre-edit value-matching descendants; divergent branches are edited directly and the stopped-run surface adds no Reset-to-inherited action. Existing pre-launch Reset behavior is unchanged. AutoByteus, Codex, and Claude must honor the saved settings.
