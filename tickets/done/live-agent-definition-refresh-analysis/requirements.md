# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user-approved on 2026-08-25, re-approved after architecture finding F-001, narrowed after code-review requirement gap CR-F-002, and corrected for integrated General/Application ownership after code-review design finding CR-F-003. The supported browser journey remains sequential: Stop completes, the user opens Settings, edits, and saves; only a later browser message restores the run. Existing-run model settings remain locked until the standalone run or entire root Team is stopped and no live Application binding owns that identity. All three runtimes must honor saved settings on restore, and the stopped existing-Team editor does not add a Reset-to-inherited action.

## Goal / Problem Statement

Allow a user to update **model-specific configuration** on an already-created independent Agent Run or Agent Team Run only after it has been explicitly stopped/inactivated. Examples include Codex reasoning effort and Fast mode, and AutoByteus thinking/reasoning controls supported by the selected model.

The run's runtime and model identity remain fixed. Executing work must never be reconfigured mid-turn, and saving model settings must not discard the logical run, history, workspace, team structure, member identities, or provider conversation binding.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Saving an Agent Definition updates the reusable definition but does not mutate an already-active runtime. | No change. Existing-run model-setting edits use a dedicated per-run operation rather than piggybacking on definition save. | Definition editing remains separate from run-instance editing. | REQ-001, REQ-015; AC-015 |
| BEH-002 | A newly created or restored runtime consumes the run's persisted model and `llmConfig` during bootstrap. | Preserve bootstrap behavior and make a successful existing-run edit the persisted input to the next restore/bootstrap. | New-run creation continues to use its launch draft; provider/runtime capability handling stays authoritative. | REQ-006, REQ-007, REQ-015; AC-001, AC-002, AC-007, AC-014, AC-015 |
| BEH-003 | An active runtime keeps a prepared configuration for its lifetime; later turns do not re-read edited configuration automatically. Integrated source has distinct General Process and Application-scoped live owners for the same persisted identity namespace. | Preserve active runtime behavior. Configuration remains locked until the General runtime is stopped or a nonterminal Application binding has durably terminalized and released the identity; the next eligible restore uses any subsequently saved settings. | No provider-specific hot mutation, implicit interruption, mixed-configuration turn, or cross-owner manager access. | REQ-002, REQ-003, REQ-006, REQ-009; AC-002–AC-004, AC-007, AC-008 |
| BEH-004 | Selecting an existing independent Agent Run makes the entire configuration form read-only, including `llmConfig`, even when the run is inactive. No supported write API persists a local edit. | Keep the form locked while the run is active, including active-idle. After the user explicitly stops it, keep runtime/model/unrelated controls fixed but permit schema-supported `llmConfig` edits and persist them on Save. | The run ID, agent definition, model, runtime, workspace, history, and unrelated launch settings do not change. | REQ-001–REQ-007, REQ-010–REQ-012; AC-001–AC-004, AC-009–AC-014 |
| BEH-005 | Selecting an existing Agent Team Run projects its stored execution tree as entirely read-only. Root, nested-team, and member model settings cannot be revised. | Keep the Team Configuration locked while the root is active. After the user explicitly stops the root, permit model-setting edits at the root, nested-team, and configured-agent scopes. Preserve deterministic parent-cascade boundaries but do not add Reset-to-inherited to this stopped-run surface. | Team topology, task/message history, runtime/model identities, workspaces, unrelated launch settings, and existing pre-launch Reset behavior do not change. | REQ-001, REQ-003–REQ-012, REQ-015; AC-005–AC-015 |
| BEH-006 | Standalone history exposes incomplete inactive editability flags, while team history exposes no editability contract; neither baseline path provides a persistence mutation. Integrated Studio reads/mutations currently consult only General Process live maps. | After Stop completes, opening Settings obtains network-fresh canonical configuration and owner-aware editability. The server rechecks both General live state and any nonterminal Application ownership before narrow standalone/team persistence. | Existing history storage remains canonical; active direct API calls remain rejected without allowing Studio to reach into Application-scoped managers. | REQ-002, REQ-003, REQ-009, REQ-012; AC-003, AC-004, AC-008, AC-010 |
| BEH-007 | Current model catalogs and schemas drive launch-time Thinking and advanced controls, including Codex reasoning effort/service tier, but historical selected-run mode presents them as read-only. | Reuse the selected runtime/model's current schema to edit only supported values. Never silently discard a stored value when the catalog/schema is loading, unavailable, or no longer represents it. | A model without a supported editable parameter does not gain an invented control or value. | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-012 |
| BEH-008 | External-channel ingress resolves General-owned persisted runs. Application Engine input resolves Application-bound executions through separate application-scoped services, managers, and lanes; nonterminal binding ownership is durably indexed. | Preserve both owner families. General stopped Save continues to share its per-identity lane with General/external-channel restore. A nonterminal Application binding is instead an ownership barrier: owner-aware Settings reads stay locked and direct updates return `RUN_ACTIVE` without writing until the Application terminal transition releases the identity. | Binding identities, ingress/application dispatch, Application encapsulation, and normal active-run behavior remain unchanged; no browser multi-writer policy is added. | REQ-002, REQ-003, REQ-006, REQ-009, REQ-012; AC-003, AC-004, AC-008, AC-014 |

## Investigation Findings

- The `origin/personal` baseline selected-run UI applied one broad read-only flag and had no Save action. The integrated task branch now contains the stopped-edit implementation plus the advanced Application runtime topology; SR-005 corrects the last owner-routing assumption in that real code.
- Standalone and team runtime configurations are bootstrap-lifetime snapshots. Codex maps `llmConfig.reasoning_effort` and `llmConfig.service_tier` into thread configuration; AutoByteus passes `llmConfig` into LLM creation.
- Existing standalone metadata and the team execution tree already persist `llmConfig`; no storage-shape change is required.
- The approved browser workflow removes active-idle detection and interruption from Save. It is explicitly sequential: Stop completes, Settings opens and refreshes canonical state, Save completes, and only a later browser message restores the run. Concurrent tabs/users and hand-speed browser Save-versus-message timing are not supported initiating paths. External-channel ingress shares the General lifecycle owner and lane. Application Engine input does not: while its binding is nonterminal, the durable Application ownership index keeps Studio Settings locked and rejects direct Save; after terminalization, Application input is no longer accepted for that binding and General stopped editing may proceed.
- CR-F-003 established that General Process and Application Engine deliberately construct distinct managers, services, live maps, and transition lanes. The correction is an owner-aware Studio model-config boundary plus an Application-owned lifecycle lease, not a global manager, cross-owner lock, revision token, or GraphQL bypass into Application internals.
- Team lifecycle and persistence are owned at the root execution. A team edit therefore requires the entire root to be stopped and uses one root-scoped persistence update; it never independently edits a live member.
- A stored team execution tree contains resolved/effective launch settings but not original override provenance. The stopped form uses value equality only to preserve deterministic parent-change propagation: editing a parent/default flows to descendants whose fixed runtime/model and normalized `llmConfig` currently match that parent; other branches remain unchanged. It does not add Reset-to-inherited, because the stopped-run contract cannot change fixed runtime/model identity.

Detailed evidence is in `investigation-notes.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | UI/UX state, journey, feedback, and accessibility specification for existing-run model-setting edits | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012 | AC-001–AC-014, AC-016 | Refined through SR-005 on 2026-08-25; user-approved browser flow unchanged | Constrains intended observable behavior and is part of the approved requirements basis. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / Behavior Change.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant and Boundary Or Ownership Issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, narrowly to make Studio model-config access owner-aware while preserving the intentionally separate General and Application runtime families.
- Evidence basis: CR-F-003 confirmed that Application launch/input uses application-scoped `AgentRunManager`, `AgentTeamRunManager`, lifecycle, and facade instances, while Studio history/model-config uses General Process instances. Their live maps and lanes are instance-local, so a General-only active check is false for a normally active Application binding even though both families share persisted history. The existing durable Application run lookup and binding terminal state already provide the correct ownership boundary.
- Requirement or scope impact: General/external-channel Save and restore continue to share their existing General lane. Studio configuration reads and updates must first consult the Application-owned lifecycle lease. A nonterminal binding is locked/`RUN_ACTIVE`; only terminal release permits delegation to General stopped persistence. The solution must not merge managers, bypass Application encapsulation, restore revisions/rebasing, or broaden Studio Stop/archival behavior.

## Recommendations

1. Treat this as a stopped-run persistence feature, not only a form-unlock patch.
2. Keep runtime and model selectors visibly fixed; enable only schema-backed model-configuration controls.
3. Keep the UI change small and contextual: before launch, the existing footer action remains `Run Agent` / `Run Team`. For a selected existing run/team, that footer action is `Save`; it remains disabled while active, clean, invalid, or otherwise ineligible. After Stop and a valid change, Save enables and persists without starting or stopping a runtime. The next message uses the existing automatic restore path.
4. Make the server's editability decision and Save result authoritative. Preserve the draft when eligibility changes or the server rejects the update.
5. Use a narrow team model-config command contract rather than accepting a client-authored replacement execution tree.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium: the stored data shape is reusable and the product workflow is simple, but the change crosses standalone/team UI, GraphQL contracts, stopped-state enforcement, General/Application ownership composition, persistence, restore behavior, three runtime adapters, and durable coverage. The owner correction is bounded because the existing Application lookup/binding lifecycle can serve as a fail-closed lease; managers do not need to be unified.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- **UC-001:** Edit schema-supported model settings for an existing independent Agent Run while it is inactive/stopped.
- **UC-002:** Keep an active standalone run fully locked, explicitly stop it through the existing Stop workflow, and then enter UC-001.
- **UC-003:** Edit root, nested-team, or configured-agent model settings for an existing Agent Team Run while the root is inactive/stopped.
- **UC-004:** Keep an active Team Run fully locked, explicitly stop the root through the existing Stop workflow, and then enter UC-003.
- **UC-005:** Save the configuration and use it on the next message/activation without creating a new logical run or losing continuity.
- **UC-006:** Recover from eligibility, validation, catalog, persistence, or network failures without silent configuration loss.

### Out of Scope

- Changing the runtime kind or LLM model identifier of an existing run.
- Changing workspace, Agent/Team Definition, topology, role, tools/skills, auto-approval, skill-access mode, or any other unrelated launch field.
- Mutating an in-flight turn, interrupting executing work merely to apply settings, or hot-patching a provider/native backend.
- Editing task-created/transient team executions; only root, nested configured-team defaults, and configured-agent launch settings are editable.
- Adding model parameters or provider capabilities that are not already exposed by the selected runtime/model schema.
- Fixing unrelated runtime-adapter behavior; the approved Claude thinking/reasoning bridge is in scope because those settings are already advertised to this form.
- Changing reusable Agent or Team Definitions; this feature edits one stored run instance.
- Archival/deletion semantics or creation of a new run/version as a substitute for updating the selected run.
- Multi-tab or multi-user concurrent editing, concurrent Save submissions, and hand-speed browser Save-versus-message timing scenarios. These mechanical possibilities must not drive revision tokens, draft rebasing, findings, deductions, or coverage. Only the normal owner/lifecycle paths named in REQ-009 govern stopped eligibility.
- Rerouting general Studio Stop, message, archive, or delete operations into Application Engine, or allowing Studio to hot-edit a nonterminal Application binding. This ticket adds an owner-aware configuration guard, not a generic cross-owner command router.

### Preserved Behavior Boundary

BEH-001 through BEH-003 and REQ-007/REQ-015 remain authoritative. Each executing turn uses one stable effective configuration. Existing logical run identity, history, provider binding, workspace, team topology, member identities, task/message records, and all non-`llmConfig` launch fields must survive an edit.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **REQ-001 — Editable field boundary:** For an existing standalone or team run, the only mutable launch field is `llmConfig`. Runtime kind and LLM model identifier remain visible but disabled, as do workspace and every unrelated field. The update contract must reject attempts to change fixed fields.
- **REQ-002 — Standalone stopped-only eligibility:** A standalone run's configuration remains fully locked whenever its General runtime is active or a nonterminal Application binding owns its run ID, regardless of whether the visible runtime appears initializing, idle, running, error, or temporarily unmaterialized. Model settings become editable only after the existing owning Stop/termination operation completes, the Application binding (if any) has terminalized/released the ID, and the server confirms no General runtime is active. Deleted or archived runs are not editable.
- **REQ-003 — Team stopped-only eligibility:** A Team Run's configuration remains fully locked whenever its General root is managed/active or a nonterminal Application binding owns the root/team identity, regardless of member statuses or whether the team appears idle. Model settings become editable only after the existing owning root Stop/termination completes, the Application binding (if any) has terminalized/released the IDs, and the server confirms the entire General root is inactive/offline. No configured or transient member is edited independently while the root is active or Application-owned.
- **REQ-004 — Supported model settings:** Editable controls are generated from the selected runtime/model's current model-configuration schema. They include, where supported, Thinking, reasoning effort, service tier/Fast mode, budgets, summaries, and other already-advertised `llmConfig` parameters. The required examples are Codex reasoning effort and Default/Fast service tier, plus AutoByteus and Claude thinking/reasoning settings supported by their selected models. Every setting offered for Save must be carried into that runtime's next restored execution; the Claude adapter must no longer discard its advertised thinking/reasoning values.
- **REQ-005 — Contextual footer and explicit Save:** Before launch, the existing configuration footer continues to show `Run Agent` or `Run Team`. After the user completes Stop and opens that run's selected configuration, the client first loads network-fresh canonical configuration and editability, then shows `Save` in the same footer position and visual style. Changing an eligible control modifies a local draft only. Save is enabled only when the draft differs from canonical stored config, the schema is available, values are valid, and the loaded lifecycle state is eligible. Leaving without saving does not persist the draft; reopening reloads canonical stored values.
- **REQ-006 — Stopped Save boundary:** Save never stops, interrupts, activates, or transfers ownership of a runtime. The server first performs the owner-aware eligibility check from REQ-009, then rechecks General standalone/root inactivity inside its General lifecycle lane, validates the submitted `llmConfig`, persists it, and leaves the run inactive. The next supported General/browser message uses the existing automatic restore path and the revised configuration.
- **REQ-007 — Continuity and preservation:** A successful update preserves the standalone `runId` or root `teamRunId`, all configured member addresses and agent/team run IDs, provider conversation/thread/session bindings, history, summaries, workspace associations, team task/message records, and all fixed launch fields. It does not create a replacement run.
- **REQ-008 — Team scope and stopped-run propagation boundary:** After the entire root Team is stopped, the user may edit root defaults, nested configured-team defaults, and configured-agent settings through the existing Team Configuration hierarchy. A direct leaf edit changes only that configured scope. When an edited scope is a parent/default, the change also flows to each descendant whose draft-start fixed runtime, fixed model, and normalized `llmConfig` matched its immediate parent and that has not been directly edited in the current draft; any fixed-identity/model-config divergence or direct draft edit is a boundary and that branch remains unchanged. A direct edit after propagation overrides the propagated value and becomes a boundary for later ancestor edits in the same draft. This value-based comparison plus explicit draft-edit tracking is the available deterministic rule because stored execution trees do not retain original override provenance. The stopped existing-run editor does **not** offer `Reset to inherited`; users edit each scope's own model settings directly. Existing pre-launch Reset behavior remains unchanged under REQ-015. Transient task executions are never editable targets.
- **REQ-009 — Authoritative stopped-state and owner boundary:** The supported browser lifecycle is `Stop completes -> user opens Settings -> network-fresh canonical read -> user edits -> Save completes -> a later browser message restores`. Studio model-config reads and updates obtain read-only canonical history, including any persisted Application binding provenance, then ask an Application-owned, startup-ready ownership reader to resolve the exact run/root ID from both that provenance and the global run lookup. If a verified binding is nonterminal, reads report locked/active and updates return `RUN_ACTIVE` with no write; Studio does not inspect or mutate Application-scoped managers. Lookup/provenance disagreement, a missing referenced binding, or unreadable ownership state fails closed. The Application terminal transition persists `TERMINATED`/`ORPHANED` before releasing its durable run-ID lookup, and normal Application input rejects terminal bindings. Once the reader proves no Application lease exists, the update delegates to the General standalone/root lifecycle boundary; General/browser/external-channel restore and Save remain ordered there, so restore-first yields `RUN_ACTIVE` and Save-first makes the later General restore read the committed configuration. This ticket defines no cross-owner manager lane, optimistic revision, draft rebase, concurrent-writer, archive/delete coordination, or generic multi-tab/hand-speed browser race contract.
- **REQ-010 — Validation and catalog safety:** The server validates that `llmConfig` is null or an object and that every submitted key/value is currently valid for the fixed runtime/model schema. The client may validate early but is not authoritative. While the model catalog/schema is loading, failed, missing, or cannot represent a stored historical value, editing and Save are unavailable; the UI shows the stored value without silently normalizing, deleting, or persisting it and offers catalog retry where possible.
- **REQ-011 — User-visible operation states:** The existing configuration surface receives only the necessary additions: active-state guidance to stop before editing, a loading state while stopped configuration/editability is refreshed on Settings entry, editable model-setting controls after that refresh, one Save action, `Saving…` progress, and success/error feedback. It explains that the next message resumes the stopped run automatically. During Save, affected inputs and the Save action are disabled and an accessible progress state is exposed.
- **REQ-012 — Canonical response and refresh:** Read and update APIs return enough canonical data to render current `llmConfig`, owner-aware lifecycle/editability, and update outcome. Settings entry uses a network-fresh read. A live Application lease is projected through the existing active/`RUN_ACTIVE` lock contract; no new browser ownership workflow is added. After a determinate update result, the client applies the canonical server response; after transport, ownership-resolution, or physical-store uncertainty, it remains locked and performs a network-fresh read before another Save. It must not treat a local patch as proof that persistence, ownership release, or runtime recycling succeeded.
- **REQ-013 — Failure safety:** An active-state or validation rejection makes no persisted change. If persistence fails, the run remains stopped, the previously committed configuration remains authoritative, and the response supplies or triggers a canonical refresh. An indeterminate persistence outcome must be reported explicitly and reconciled from storage before another Save; the UI must never claim success speculatively.
- **REQ-014 — Idempotency/no-op:** Reapplying the canonical normalized `llmConfig` is a no-op and does not stop or activate a run. The UI disables Save for an unchanged draft; if the narrow update API nevertheless receives an equal normalized value, it returns canonical state with `UNCHANGED` and performs no write. Concurrent duplicate submission policy is outside this sequential ticket.
- **REQ-015 — Preserved creation and definition flows:** New Agent/Team launch configuration and reusable Agent/Team Definition editing retain their existing behavior. This feature does not broaden their editable fields or couple definition save to existing-run mutation.

## Acceptance Criteria

- **AC-001 (UC-001):** Given an inactive standalone AutoByteus run whose fixed model exposes thinking/reasoning parameters, selecting it shows runtime/model as disabled and those model-setting controls as editable. Saving a valid change persists the new `llmConfig`, keeps the run inactive, and the next message restores the same run with the new values.
- **AC-002 (UC-002/UC-005):** Given an active or active-idle Codex run, all configuration remains locked with guidance to stop it. After Stop completes, reasoning effort and Fast mode become editable. Successful Save keeps the same run stopped; the next message resumes the same provider thread/run and Codex receives the new reasoning effort and service tier.
- **AC-003 (UC-002/UC-006):** Given any active General standalone runtime or any nonterminal Application binding for the run ID, model-setting controls and Save are unavailable. Calling the update API directly returns `RUN_ACTIVE` and leaves persisted configuration unchanged even when the Application runtime is invisible to the General manager. After owner-confirmed Stop/terminal release, only schema-supported model settings become editable.
- **AC-004 (UC-001/UC-002/UC-005):** Given the user waits for standalone Stop to complete, opens Settings, waits for canonical configuration, changes a valid model setting, and waits for Save success before sending the next browser message, Save keeps the same run stopped and the later General/browser message restores it with the saved value. A normal General/external-channel restore through `AgentRunCommandCoordinator` remains serialized with Save: restore-first yields `RUN_ACTIVE`; Save-first makes restore consume the committed value. Separately, a live Application binding always keeps Studio read/update locked until its terminal transition releases the run ID; Application `sendInput` and Studio Save therefore never form a permitted cross-owner write/restore pair. No concurrent browser-writer or revision-token behavior is required.
- **AC-005 (UC-003):** Given an inactive Team Run, changing a root model setting updates root/nested-team/member draft `llmConfig` only along the REQ-008 draft-start matching-propagation chain; stored-divergent or directly edited draft branches remain unchanged. Saving persists exactly the resulting narrow configured-scope changes.
- **AC-006 (UC-003):** Given an inactive Team Run, the user can directly update a configured nested-team or agent scope's own schema-supported `llmConfig`. The stopped-run form offers no `Reset to inherited` action. If that scope's effective settings diverged from its parent before an ancestor edit, runtime/model remain fixed and the ancestor change does not cross that branch. Task-created/transient executions are not offered as editable targets.
- **AC-007 (UC-004/UC-005):** Given any active Team Run, configuration remains locked even when all members appear idle. After the existing root Stop completes, the authorized Team model settings become editable; successful Save keeps the same root stopped, and the next message restores the same team/member identities with revised values.
- **AC-008 (UC-003/UC-004/UC-005/UC-006):** A direct Team update while the General root is managed/active or while a nonterminal Application binding owns the root is rejected with `RUN_ACTIVE` and does not change the execution tree. Given the user waits for root Stop/release, opens Settings, loads canonical state, saves, and only later sends a General/browser message, the restored Team uses the saved tree values. General/external-channel restore through `ChannelBindingRunLauncher` remains serialized with stopped Team Save. Application Engine Team input stays within its application-scoped owner and cannot coexist with an eligible Studio Save because its live binding is the lock/rejection barrier. No concurrent browser-writer or revision-token behavior is required.
- **AC-009 (UC-006):** Given an unknown key, wrong value type, out-of-range value, or unsupported enum for the fixed runtime/model, Save shows validation errors, retains the draft, keeps the run stopped, and does not alter persisted configuration.
- **AC-010 (UC-006):** Given persistence definitively fails, the UI reports failure, preserves or applies the server-confirmed canonical configuration, and the run remains stopped. Given a transport failure or indeterminate physical commit result, the UI reports an uncertain outcome and blocks another Save until a network-fresh canonical outcome-verification read completes.
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
- The integrated process has distinct General and Application run-owner families. Application managers/maps remain encapsulated; Studio configuration consults only the Application-owned lifecycle lease and delegates actual stopped persistence to General services after release.
- Application startup recovery must complete before the owner-aware Settings boundary answers. Because normal application reentry clears/rebuilds the global lookup after startup, persisted Agent `applicationExecutionContext` and Team `applicationBinding` are also mandatory ownership evidence: a referenced nonterminal binding remains locked even during lookup rebuild. Nonterminal statuses (`ATTACHED`, `TERMINATING`, `FAILED`) remain locked; terminal statuses (`TERMINATED`, `ORPHANED`) release eligibility according to REQ-009.
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
| AC-003 | General/Application standalone non-eligible state and direct-API defense |
| AC-004 | Sequential standalone journey, General resolver ordering, and Application lease barrier |
| AC-005 | Inactive Team root cascade/inheritance |
| AC-006 | Team nested/member direct edit, divergent-branch isolation, and no stopped-run Reset |
| AC-007 | Active Team locked; stopped Team save/restore success |
| AC-008 | General/Application Team rejection, sequential journey, General resolver ordering, and Application lease barrier |
| AC-009 | Schema validation failure while stopped |
| AC-010 | Definite persistence failure and uncertain-outcome verification |
| AC-011 | Catalog/schema/historical-value safety |
| AC-012 | Fixed-versus-editable control boundary |
| AC-013 | Draft, no-op, submission, navigation, keyboard, and announcement behavior |
| AC-014 | Persistence and identity preservation |
| AC-015 | Existing launch/definition regression boundary |
| AC-016 | Stopped Claude save/restore and runtime-adapter effectiveness |

## Approval Status

Approved on 2026-08-25, re-approved after architecture-review finding F-001, explicitly narrowed after CR-F-002, and corrected without scope expansion after CR-F-003. The authoritative browser workflow is sequential: manually stop the independent Agent Run or the entire root Team Run and wait for completion; open Settings and load network-fresh canonical state; edit schema-supported model configuration; click Save and wait for the result; only then send the next browser message, which restores the same logical execution with the saved configuration. Concurrent tabs/users, concurrent submissions, and hand-speed browser races are not supported product paths and must not drive revision tokens, draft rebasing, findings, deductions, or coverage. External-channel restore remains ordered with Save inside General lifecycle owners. Application Engine retains separate managers and lanes: its nonterminal durable binding is treated as active/locked by Studio until the Application lifecycle terminalizes and releases the identity. Team parent changes propagate only through pre-edit value-matching descendants; divergent branches are edited directly and the stopped-run surface adds no Reset-to-inherited action. Existing pre-launch Reset behavior is unchanged. AutoByteus, Codex, and Claude must honor saved settings on an eligible restore.
