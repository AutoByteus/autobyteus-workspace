# Design Spec — Frontend fresh-launch auto approval default

## Design Meta / Approval Basis
- Package: auto-approve-default-run-setup; SR-002; status: Ready.
- Requirements: Approved SR-002, REQ-001..004/AC-001..004; USER-APPROVAL-001/002 in canonical requirements.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup; branch codex/auto-approve-default-run-setup.
- Base: origin/personal at d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b; finalization target origin/personal.
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/auto-approve-default-run-setup/tickets/in-progress/auto-approve-default-run-setup/investigation-notes.md.
- Behavior supplements: None. Screenshot diagnostic only. Product/UI redesign not applicable.

## Current-State Read / Architecture Investigation Evidence
Shared frontend constructors initialize fresh Agent and Team root approval false, except existing forced runtime policies. Stores consume them; forms already bind the value; launch serializers send it unchanged. Existing-run-derived seed functions are separate and preserve saved choices. AE-001..005 in investigation notes verify owners, form bindings, payload paths, tests and validation constraints. No runtime evidence claimed.

## Intended Change
In `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`, change only the initial `false` argument to `true` in `buildAgentRunTemplate` and `buildTeamRunTemplate` calls to `autoExecuteForNewRuntimeSelection`. Keep the policy helper and all saved-seed functions unchanged. No backend changes, no UI layout changes and no persistence migration. No new preference service, constants file or settings mechanism needed for two local literals.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved basis | Trigger / change or preservation | Production path / spine |
|---|---|---|---|
| BEH-001 | REQ-001/003, AC-001/003 | Fresh Agent launch shows on and sends true unless opted out | Catalog/library/mobile preparation → agentRunConfigStore.setTemplate → buildAgentRunTemplate → AgentRunConfigForm → RunConfigPanel/createRunFromTemplate → first-send agentRunStore/PrepareAgentRun (DS-001) |
| BEH-002 | REQ-002/003, AC-002/003 | Fresh Team root true and inherited members true; explicit overrides preserved | Catalog/library/mobile preparation → teamRunConfigStore.setTemplate/buildTeamRunTemplate → TeamRunConfigForm/TeamScopeConfigEditor → agentTeamRunStore.launchDraft → projectTeamRunLaunchRecords → createAgentTeamRun (DS-002) |
| BEH-003 | REQ-004, AC-004 | New Chat remains true | chatDraftStore → ChatNewSurface → chatLaunchService → existing launch owners (DS-003, unchanged) |
| BEH-004 | REQ-003/004, AC-003/004 | Saved/seeded false and runtime locks unchanged | Existing config/source → existing editor or buildEditableAgent/TeamRunSeed → existing form/launch serializers (DS-004, unchanged) |

## Relevant Supplemental Task Artifacts
User screenshot linked from investigation notes: diagnostic only; no visual redesign authority. Independent review artifacts N/A — none completed yet. Product artifacts N/A — deferred.

## Task Design Health Assessment (Mandatory)
Change posture: Behavior Change. Current design issue: No structural issue found. Root cause: No Design Issue Found; old initial values differ from approved default. Refactor needed now: No. Existing shared constructor owner cleanly absorbs change; forms and serializers already use state consistently. Do not add parallel display policy, force-on runtime logic or backend fallback. Broad form simplification is an explicit separate-ticket deferral, not required to complete this coherent fix.

## Terminology / Design Reading Order
Fresh template means new launch from a definition, not a seed intentionally copied from an existing run. Read approved requirements → AE evidence → two constructor changes → preservation/validation guidance.

## Legacy Removal Policy / Removal-Decommission Plan (Mandatory)
Clean-cut replacement: remove the two old fresh-template false initializers and superseded fresh-default test expectations. No legacy module, wrapper, flag or dual-path behavior to retain/remove. Existing saved false values are intentional current data, not obsolete code.

## Persisted Data / State Transition (Mandatory)
Not Affected. No stored schema, reader, writer or semantic rewrite; same boolean field and normal cloning/readers continue using saved values. Only new in-memory template seeds change. Existing configs must not be reset. Migration plan: N/A — no transformation. Protect AC-004.

## Data-Flow Spine Inventory / Primary Execution Spines / Narratives
DS-001 (primary Agent): user opens fresh launch → shared template constructor seeds true → store/form displays true → local context retains user choice → first-send payload sends choice → unchanged server/runtime handles it.
DS-002 (primary Team): user opens fresh launch → root template seeds true → form displays true → existing hierarchy resolves root and explicit overrides → launch records carry effective booleans → unchanged server/runtime handles them.
DS-003/004 (preserved paths): Chat retains current true seeds; existing-run edit/clone retains saved choices. No change to their orchestration.
Return/event spines and bounded local loops: N/A — no changes to asynchronous run lifecycle for this initial-value delta.

## Spine Actors / Ownership Map / Thin Entry Facades
Preparation surfaces initiate; shared constructors own fresh defaults; stores own editable draft state; forms display/edit that state; launch stores own submission; Team hierarchy resolver owns effective inheritance. Runtime policy owns existing forced-on cases. Backend remains unchanged authority for execution. No new facade or ownership move.

## Off-Spine Concerns / Ownership Boundaries / Boundary Encapsulation / Dependency Rules
Definition defaults supply model/runtime/parameters; runtime policy retains capability constraints; workspace validation remains existing launch concern. Callers keep using constructors through stores. Do not bypass stored state with a hard-coded switch display; do not force true in serialization or saved hydration. No new dependencies; no backend policy/default edits.

## Interface Boundary Mapping / Check / Main Subject Naming
Existing Agent and Team constructor signatures unchanged; inputs are respective definition identities. Distinct Agent/Team configs and launch boundaries remain; singular concerns and explicit identities. Naming changes N/A — existing names correct.

## Existing Capability Reuse / Subsystem Allocation
Reuse frontend launch-configuration capability. Constructor responsibility stays in existing defaults composable; runtime policy stays in existing utility. No new subsystem/helper or abstraction.

## Draft / Reusable Owned Structures / Shared Model Tightness / Final File Responsibility Mapping
Production change is solely `autobyteus-web/composables/useDefinitionLaunchDefaults.ts`: fresh Agent/Team defaults. Existing config fields represent one boolean meaning; no new type or reusable structure to extract. Tests may change in:
- `composables/__tests__/useDefinitionLaunchDefaults.spec.ts`: fresh true constructors across supported runtimes plus saved false seeds.
- `stores/__tests__/agentRunConfigStore.spec.ts`: update old fresh false expectation and verify opt-out.
- `types/agent/__tests__/TeamRunConfig.spec.ts`: update old root false expectation.
- Appropriate existing Team store/hierarchy and form tests: inherited true, explicit member false, UI checked state using real constructors.
- Browser dev-path probe: use existing harness or focused new probe for visible Agent/Team default and outgoing booleans/opt-out; exact coverage owner is API/E2E Engineer.
Keep seeded-false regression fixtures where testing preserved intent. Documentation sync belongs to Delivery Engineer.

## Applied Patterns / Target Folder-File Mapping / Folder Boundary Check
Reuse existing constructor pattern and colocated tests in current folders. No created/moved/deleted production files or additional module grouping; current layout is proportionate. Tests belong alongside their owner; evidence in ticket, not root.

## Concrete Examples / Backward-Compatibility Rejection Log (Mandatory)
Good: `autoExecuteForNewRuntimeSelection(normalizeRuntimeKind(defaults?.runtimeKind), true)` for fresh templates only. Bad: change `effectiveAutoExecuteTools` to unconditional true, show switch on while payload false, or overwrite a saved explicit false. Compatibility wrappers/version flags/dual paths: rejected as unnecessary; clean-cut default replacement.
Derived layering: N/A — unchanged.

## Change / Refactor Sequence
1. Update the two fresh-template seed literals.
2. Update only obsolete fresh-default expectations; add targeted constructor/UI/inheritance/opt-out/saved-value assertions.
3. Run focused implementation checks and rendered default-state verification. Preserve runtime-policy tests.
4. Executable validation closes UI/payload gap; Delivery owns docs/user verification/finalization. No release requested.

## Tradeoffs / Risks / Guidance For Implementation
Prefer local defaults over global force-on semantics so deliberate opt-outs/saved settings remain real. Security-relevant default increases unattended trust for fresh launches, explicitly approved; no enforcement/capability expansion. Keep review limited to approved scope; proposed new warnings/security controls would be Requirement Gaps, not assumed corrections. Unknown rendered freshness of screenshot does not block boolean state change. Validate using isolated/test-owned surfaces per TESTING.md, never user's running app/data. No tests executed by designer; do not report validation complete.

## Task Size And Architectural Risk (Mandatory; completed design)
- task_size: Small.
- Evidence: two initial-value literals in one production file plus focused existing tests; no form redesign/backend work.
- architectural_risk: High.
- Evidence: changing default approval for fresh Agent/Team launches changes security/trust posture (supported tool/access/permission requests may proceed without manual confirmation), despite tiny frontend implementation. Existing API/runtime enforcement and explicit opt-out remain unchanged. Conservative independent review is warranted by the skill's security-impact rule, not by code volume.
- Payload versus structural impact: no schema/content conversion, new owners, API changes, persistence migration, concurrency or deployment change; security-relevant default is the specific High trigger.
- Escalation: any required backend change, saved-value rewrite, policy force-on, new preference mechanism or broader form change must return Design Impact/Requirement Gap; do not silently expand this ticket.
