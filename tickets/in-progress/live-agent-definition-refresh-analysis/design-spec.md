# Design Spec

## Current-State Read

The authoritative worktree is no longer the preimplementation baseline. HEAD `08b11b3aa` contains IR-001 and IR-002: the stopped-run feature, provider bridge, and an SR-003 concurrency implementation. The target design must refine that real code rather than describe a greenfield change.

- The current browser implementation has `ExistingRunConfigEditor`, specialized Agent/Team drafts, narrow mutations, fixed-versus-model-control presentation, schema validation, Save feedback, and Team propagation without stopped-run Reset. Those parts directly serve the approved feature.
- The current Stop actions await backend termination, mark the run inactive, and then refresh resume config. Opening Settings is a separate `workspaceCenterViewStore.showConfig()` action, but Settings entry itself does not own a network-fresh query. Freshness is therefore coupled to Stop rather than to the screen that decides whether editing may unlock.
- `StandaloneAgentRunLifecycleService` now owns activation, stopped update, and a per-run transition lane. `AgentTeamRunManager.updateStoppedModelConfigs` uses the existing root lane. These lanes protect verified production paths: external-channel ingress can independently activate its bound stopped Agent through `AgentRunCommandCoordinator` or restore its bound Team through `ChannelBindingRunLauncher`; Application Engine input uses restore-aware Agent/Team services. Other Team restore-aware callers converge on the same owner but are not used as independent overlap premises.
- SR-003 also added `configurationRevision`/`expectedConfigurationRevision`, `STALE_REVISION`, a digest helper, draft rebasing/retained-rejection flags, concurrent-save tests, a generalized Team archive/delete persistence gate, and archive lane changes. No supported browser or operational path has concurrent model-config writers, and Settings does not normally initiate archive/delete. Those structures are disproportionate and must be removed.
- Existing metadata and schema-v2 Team trees already store the relevant `llmConfig`. The current narrow update services/mutator, validator, atomic write/reread handling, and canonical result shapes can be simplified rather than replaced.
- AutoByteus and Codex consume persisted `llmConfig` during create/restore. The implemented Claude bridge now carries capability-valid thinking/effort into SDK query options for pinned `@anthropic-ai/claude-agent-sdk@0.3.231`; that correction remains required.

The target preserves explicit Stop, the sequential browser journey, independently triggered external-channel restore, persisted packages, provider bindings, and active-runtime immutability. Detailed evidence and commands are in `investigation-notes.md`, BEH-001 through BEH-008.

## Intended Change

Add stopped-only, persisted model-configuration editing for an existing standalone Agent Run or existing root Agent Team Run.

1. While the standalone runtime or Team root is active—including visually idle—all configuration stays locked.
2. After the user manually completes Stop and then opens Settings, a network-fresh resume query must confirm stopped state before unlocking only current-schema `llmConfig` controls. Runtime, model identity, workspace, definition/topology, auto approval, skill mode, and every other launch field remain fixed.
3. The selected-run footer presents `Save` in place of the pre-launch Run action. It stays disabled while active, clean, invalid, or otherwise ineligible. An enabled Save validates and persists a local draft, but never stops, starts, interrupts, or replaces a run.
4. After Save returns, a later browser message uses the existing restore path and reconstructs the same logical run/team and provider binding from the newly persisted configuration.
5. Team editing is root-gated. The draft snapshots parent/child equality at load. A parent update flows through matching descendants until a draft-start divergence or a scope directly edited in the current draft; that boundary and its branch remain unchanged. A direct edit after propagation overrides the propagated value and blocks later ancestor propagation. Configured scopes use their own fixed model schema. The stopped-run surface adds no Reset-to-inherited action; the existing pre-launch Reset remains unchanged. Only configured root/team/agent scopes can be patched.
6. All three runtimes honor exposed settings. Claude gains the missing typed `llmConfig`-to-SDK query adapter and capability-accurate catalog schema.
7. The browser does not gain multi-tab/revision-conflict behavior. A narrow per-run/root lane remains because two verified non-Settings runtime resolvers—external-channel ingress and Application Engine input—can independently restore stopped persisted runs; restore-first yields `RUN_ACTIVE`, while Save-first commits before restore reads.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Contract | REQ-001, REQ-015; AC-015 | Save a reusable Agent/Team Definition | Investigation BEH-001 | Preserve definition saving as separate; never use it to mutate a run instance. | Existing definition path remains unchanged. |
| BEH-002 | System | REQ-004, REQ-006, REQ-007, REQ-015; AC-001, AC-002, AC-007, AC-014, AC-016 | Create or restore a runtime from persisted launch configuration | Investigation BEH-002 and runtime feasibility table | Preserve bootstrap-time configuration and make saved `llmConfig` its next input. | DS-002, DS-004, DS-008 |
| BEH-003 | System / Operational | REQ-002, REQ-003, REQ-006, REQ-009; AC-003, AC-004, AC-008 | Send work to an already active run/team | Investigation BEH-003 | Preserve active backend reuse and stable per-backend configuration; no hot update. | Existing active command path; DS-002/DS-004 only when inactive. |
| BEH-004 | User | REQ-001–REQ-007, REQ-009–REQ-014; AC-001–AC-004, AC-009–AC-014, AC-016 | After Stop completes, open Agent Configuration | Investigation BEH-004 and UI journey trace | Settings performs a network-fresh read; active stays locked; stopped current-schema model controls become draft-editable and Save becomes available. | DS-001, DS-005, DS-006 |
| BEH-005 | User | REQ-001, REQ-003–REQ-015; AC-005–AC-015 | After root Stop completes, open Team Configuration | Investigation BEH-005 and UI journey trace | Settings performs a network-fresh read; active root stays locked; stopped configured scopes become directly model-config-editable. Parent changes use the approved value-matching propagation boundary, and no stopped-run Reset action is added. | DS-003, DS-005, DS-007 |
| BEH-006 | Contract | REQ-002, REQ-003, REQ-009, REQ-012–REQ-014; AC-003, AC-004, AC-008, AC-010 | Read canonical config/status or submit Save | Investigation BEH-006 | Replace broad flags with model-config editability, narrow mutations, canonical results, and outcome verification only for physical/network uncertainty. No revision token. | DS-001, DS-003, DS-005–DS-007 |
| BEH-007 | User / System | REQ-004, REQ-010, REQ-011; AC-009, AC-011, AC-012, AC-016 | Render/validate current runtime-model configuration and restore | Investigation BEH-007 plus exact Claude SDK probe | Reuse current schemas non-destructively; validate authoritatively; make Claude catalog/runtime application truthful. | DS-001, DS-003, DS-008 |
| BEH-008 | System / Operational | REQ-006, REQ-007, REQ-009; AC-004, AC-008, AC-014 | External-channel ingress or Application Engine input needs a stopped persisted run | Investigation BEH-008 and MP-SR4-003/004 | Preserve ingress/application behavior and binding identities. Share the convergent run/root lane with Save so neither reads partial config; do not generalize into browser multi-writer policy. | DS-002, DS-004, DS-006, DS-007 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md` | Sequential Settings states, contextual Save, failure recovery, Team hierarchy, responsive behavior, and accessibility. | REQ-002–REQ-005, REQ-008, REQ-010–REQ-012; AC-001–AC-014, AC-016 | Governs observable frontend behavior in DS-001, DS-003, and DS-005. | Refined after CR-F-002 on 2026-08-25; user-approved browser flow. |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature / Behavior Change.
- Current design issue found: Yes.
- Root cause classification: Missing Invariant and Boundary Or Ownership Issue, with a local Claude adapter defect and SR-003 duplicated policy/coordination overreach.
- Refactor needed now: Yes, narrowly.
- Evidence: The branch now has the core stopped-edit implementation and Claude adapter, but Settings freshness is owned by Stop, while optimistic revisions, writer rebasing, generalized archive/delete coordination, and associated tests were added for unsupported browser scenarios. Verified independent resolvers are external-channel ingress and Application Engine input; other Team restore-aware callers are not used as premises.
- Design response: Keep identity-specific stopped-update commands, per-run/root Save-versus-external-restore lanes, browser drafts, narrow Team patches, validation, canonical outcomes, and Claude mapping. Move network freshness to Settings entry. Remove revisions, stale outcomes, writer rebasing, concurrent-writer tests, and the unrelated Team archive/delete gate expansion.
- Refactor rationale: This keeps the minimum coordination that protects a traced production path while deleting machinery that serves only mechanical possibilities. A direct write outside the lifecycle owner remains invalid because external ingress is real; optimistic concurrency remains invalid because no real writer path was found.
- Intentional deferrals and residual risk: General-purpose schema standardization, external-channel product copy beyond the one relock error, and unrelated runtime/archive cleanup are deferred. Dynamic catalog absence is handled by failing closed and preserving stored values. Simultaneous browser writers are explicitly outside the product contract.

## Terminology

- **Stopped standalone run:** no active `AgentRun` is registered for the run ID and no activation command overlay is starting it.
- **Stopped Team Run:** the root is not managed by `AgentTeamRunManager`. A stopped member inside a managed root is insufficient.
- **Fixed launch identity:** runtime, model, definition, workspace, topology, auto approval, skill mode, IDs, and provider binding; none is accepted by Save.
- **Configured Team scope:** root `/`, configured nested-team address, or configured-agent address. Task-created executions are excluded.
- **Canonical configuration:** the value reread/returned from authoritative persistence after a transition completes.
- **External-ingress restore:** activation/restore initiated by a normal inbound message for an existing channel binding, independent of the Settings browser sequence.
- **Outcome verification:** a network-fresh reread after a transport failure or physical-store indeterminate outcome; it is not revision conflict resolution.

## Product-Reachability Decisions

The complete witnesses and evidence are in `investigation-notes.md` under **Material Premise Reachability**.

- MP-SR4-001 and MP-SR4-002 are Not Reachable and cannot justify revision, rebase, multi-client, or hand-speed race behavior.
- MP-SR4-003 and MP-SR4-004 are Reachable independent runtime-resolution triggers. They alone justify DS-006/DS-007 lifecycle ordering beyond the sequential browser journey.
- MP-SR4-005 is Unclear as a Settings overlap and therefore drives no separate requirement, finding, or test. Its callers already converge on the same Team manager; no extra mechanism is introduced.
- MP-SR4-006 authorizes simple `RUN_ACTIVE` contract defense, not browser recovery machinery.
- MP-SR4-007 authorizes physical/network outcome verification, not optimistic writer reconciliation.

## Design Reading Order

Read the approved behavior map and UI/UX supplement first, then the health, removal, and persisted-data decisions. The spine and ownership sections define lifecycle authority and serialization; interface and subsystem mappings then make those boundaries concrete. Finish with file placement, sequencing, risks, and implementation guidance. This ordering is especially important here because the visible form unlock depends on server-owned stopped-state and restore ordering rather than on frontend status alone.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Replace `RunEditableFieldFlags` with model-config-specific lifecycle editability; do not publish both.
- Remove `activeContextStore.updateConfig`, which suggests existing-run mutation but only changes browser memory. Launch drafts stay in dedicated stores.
- Replace `StoredTeamRunFormModel`'s unconditional read-only meaning with an existing-run form model that separates fixed selectors from model-config editability.
- Rename `StandaloneAgentRunActivationService` to `StandaloneAgentRunLifecycleService`; update imports/tests with no forwarding wrapper.
- Delete SR-003 `configurationRevision` / `expectedConfigurationRevision`, `STALE_REVISION`, `run-model-config-revision.ts`, revision-aware commit/rebase branches, and concurrent-writer tests. Do not leave nullable/ignored compatibility fields.
- Restore Team archive/delete APIs and tests to their `origin/personal` ownership contract; stopped Save alone uses `AgentTeamRunManager.updateStoppedModelConfigs` and the root restore lane.
- Tighten Claude capability mapping in place; remove the branch where either capability enables both controls.
- No legacy API, dual mutation, client full-tree update, or provider hot-update fallback remains.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - Standalone: one `run_metadata.json` with fixed `runtimeKind`, `llmModelIdentifier`, `platformAgentRunId`, and `llmConfig: object | null`.
  - Team: one schema-v2 `team_run_execution_tree.json` with root/nested default and configured-agent `llmConfig`.
  - One selected package changes per operation; no bulk rewrite.
- Relevant change: No stored shape/version changes. Only existing `llmConfig` fields receive new values. No revision field or digest is stored or transported.
- Normal behavior: standalone restore builds config from metadata and metadata writes atomically; Team restore builds config from the tree and the tree writer reports committed, pre-rename failure, or post-rename finalization-indeterminate.
- Required invariants: fixed fields, IDs, bindings, history, tasks/messages, workspaces, topology, timestamps, and task nodes remain unchanged. Only addressed configured-scope `llmConfig` may differ.
- Constraints: history is user data and cannot be discarded/replaced; update must remain atomic at one-file scope.
- Decision: **Directly Usable — No Migration**.
- Rationale: current readers consume exactly these fields. Migration adds I/O and corruption risk without semantic benefit.
- Supported IDs: REQ-006–REQ-010, REQ-012–REQ-014; AC-001, AC-002, AC-005, AC-007, AC-009–AC-011, AC-014.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004, BEH-006, BEH-007 | Open Settings for stopped standalone, then edit/Save | Canonical metadata Save result while stopped | `StandaloneAgentRunLifecycleService` | Network-fresh, durable stopped-only Agent update. |
| DS-002 | Primary End-to-End | BEH-002–BEH-004 | Next message to stopped Agent | Same logical/provider run turns with revised config | `StandaloneAgentRunLifecycleService` | Proves automatic restore continuity. |
| DS-003 | Primary End-to-End | BEH-005–BEH-007 | Open Settings for stopped Team, then hierarchy edit/Save | Canonical tree Save result while root stopped | `AgentTeamRunManager` | Network-fresh root-owned narrow Team update. |
| DS-004 | Primary End-to-End | BEH-002, BEH-003, BEH-005 | Next message to stopped Team | Same root/member/provider identities restored and message dispatched | `AgentTeamRunManager` | Team and mixed-runtime continuity. |
| DS-005 | Return-Event | BEH-004–BEH-007 | Settings query, mutation, lifecycle status, or outcome-verification reread | Form lock, draft, feedback, and canonical cache updated | `existingRunModelConfigStore` | Prevents local draft or uncertain response from becoming false truth. |
| DS-006 | Bounded Local | BEH-004, BEH-006, BEH-008 | Standalone stopped Save or external/application Agent resolution | Exactly one lifecycle operation establishes state first | `StandaloneAgentRunLifecycleService` | Orders verified external/application resolution with Save; no writer revision. |
| DS-007 | Bounded Local | BEH-005, BEH-006, BEH-008 | Team stopped Save or external/application Team resolution | Exactly one root lifecycle operation establishes state first | `AgentTeamRunManager` | Reuses the root restore lane for verified production resolvers; archive/delete are outside this spine. |
| DS-008 | Primary End-to-End | BEH-002, BEH-007 | Restored Claude `llmConfig` | Exact SDK query receives thinking/effort on same session | Claude adapter chain | Closes advertised-but-dropped gap. |

## Primary Execution Spine(s)

- **DS-001:** `RunConfigPanel -> existingRunModelConfigStore -> updateStoppedAgentRunModelConfig -> AgentRunService -> StandaloneAgentRunLifecycleService -> AgentRunHistoryCatalogService / AgentRunMetadataStore -> canonical result`
- **DS-002:** `Message composer -> agentRunStore / command transport -> AgentRunService.resolveCommandReadyAgentRun -> StandaloneAgentRunLifecycleService -> metadata -> backend bootstrapper -> existing provider binding -> turn`
- **DS-003:** `RunConfigPanel Team hierarchy -> existingRunModelConfigStore -> updateStoppedTeamRunModelConfigs -> TeamRunService -> AgentTeamRunManager -> Team model-config mutator -> TeamRunExecutionTreeStore -> canonical result`
- **DS-004:** `Focused Team composer -> agentTeamRunStore -> restoreAgentTeamRun -> TeamRunService -> AgentTeamRunManager -> tree/config builder -> mixed backend restore -> message`
- **DS-006:** `External ingress -> AgentRunCommandCoordinator`, or `Application Engine sendInput -> AgentRunService.resolveAgentRun`, then `StandaloneAgentRunLifecycleService lane`; both share that lane with DS-001 Save.
- **DS-007:** `External ingress -> ChannelBindingRunLauncher.restoreTeamRun`, or `Application Engine sendInput -> TeamRunService.resolveActiveTeamRun`, then `AgentTeamRunManager root lane`; both share that lane with DS-003 Save.
- **DS-008:** `ClaudeSessionBootstrapper -> Claude model-config adapter -> ClaudeSessionConfig -> ClaudeSession.executeTurn -> ClaudeSdkClient.buildQueryOptions -> SDK query`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Settings entry performs a network-fresh query. A stopped run supplies config/editability and browser edits an isolated draft. The lifecycle owner rechecks state inside its lane, validates against the fixed runtime/model, and asks the catalog persistence boundary to replace only metadata `llmConfig`, reread, and classify the physical result. | Draft, lifecycle transition, metadata | Standalone lifecycle service | Validation, GraphQL, feedback |
| DS-002 | A later browser message or verified non-Settings resolver enters the same lane. Restore reads metadata after any prior Save, preserves run/provider IDs, constructs the backend, and dispatches normally. | Persisted run, active run, provider session/thread | Standalone lifecycle service | Workspace and backend factory |
| DS-003 | Settings entry performs a network-fresh query. Team draft snapshots parent/child equality and tracks directly edited scopes. Parent change traverses only matching, unmarked descendants; divergence/direct edit stops the branch. The planner emits changed configured-scope patches and no Reset. Manager lane rejects a managed root, validates every target against its fixed model, mutates only configured launch configs, writes the tree, and returns canonical state without revision semantics. | Team draft, root lifecycle, tree | Team manager | Patch planner, validator, physical outcome verification |
| DS-004 | Team send restores unmanaged root through the same lane. Saved tree creates mixed backends with preserved root/member/provider identities, then sends to focus. | Root Team, configured executions, mixed backend | Team manager | Package loader, stream hydration |
| DS-005 | Settings queries, lifecycle status, and Save results update canonical history. Draft owner relocks on activation, replaces its baseline only from canonical success/fresh load, and performs outcome verification only after network/physical uncertainty. It does not compare revisions or rebase writer drafts. | Resume state, draft, form | Browser draft store | Catalog load and accessible feedback |
| DS-006 | Per run ID, external/application resolver-first publishes active then Save returns `RUN_ACTIVE`; Save-first commits then the resolver reads new config. The same lane retains existing activation quarantine/cleanup. There is no concurrent-save path or stale outcome. | Transition lane | Standalone lifecycle service | External/application resolution and activation cleanup |
| DS-007 | Per root ID, the existing root lane gates external/application restore and stopped Save. Resolver-first makes Save `RUN_ACTIVE`; Save-first commits before restore reads. Archive/delete retain baseline ownership outside this spine. | Root lane | Team manager | External/application resolution; normal history catalog behavior |
| DS-008 | Bootstrap translates only capability-valid saved keys into typed session settings; each query receives them while `resume` keeps session ID. | Session config, SDK options | Claude adapter chain | Capability catalog |

## Spine Actors / Main-Line Nodes

- `RunConfigPanel`: selected/new surface and contextual action host.
- `existingRunModelConfigStore`: selected existing-run draft, Save, and uncertain-outcome refresh owner.
- `AgentRunService` / `TeamRunService`: thin application-facing subject facades.
- `StandaloneAgentRunLifecycleService`: standalone activation/restore/stopped-update sequencer.
- `AgentTeamRunManager`: root Team lifecycle/transition sequencer.
- history catalogs/stores: durable package owners.
- Team model-config mutator: pure narrow transformation.
- runtime bootstrap/session/client: effective provider application.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| `RunConfigPanel` | Launch vs existing mode; contextual Run/Save; draft event delegation | Lifecycle truth, tree algorithms, persistence |
| `existingRunModelConfigStore` | One selected draft; dirty/save/loading/outcome-verification state; request/result routing | Runtime activation, revision arbitration, or persisted truth |
| `AgentRunService` | Public standalone use-case boundary/wiring | Transition internals/file I/O |
| `StandaloneAgentRunLifecycleService` | Per-run ordering, active recheck, update orchestration, activation quarantine | GraphQL/UI state |
| `AgentRunHistoryCatalogService` | Existing catalog queue, archived/missing checks, narrow metadata write/reread classification | Stopped policy/schema validation or writer revisions |
| `TeamRunService` | Public Team use-case boundary/wiring | Tree writes/root lane |
| `AgentTeamRunManager` | Managed-root truth, root lane, stopped update orchestration | UI inheritance/GraphQL DTOs |
| Team model-config mutator | Pure address/kind checked `llmConfig` replacement | I/O, lifecycle, task mutation |
| `ModelConfigValidationService` | Current catalog lookup/schema normalization/strict validation | Eligibility/persistence |
| Claude adapter | Capability schema and typed SDK translation | Generic stopped lifecycle |

Application services remain thin. Resolvers must not call managers or stores directly.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRunResolver` | `AgentRunService` -> standalone lifecycle | GraphQL mapping | stopped checks, metadata I/O |
| `AgentRunService` | standalone lifecycle | Agent application API | second lock/transport codes |
| `AgentTeamRunResolver` | `TeamRunService` -> Team manager | GraphQL mapping | tree traversal/writes |
| `TeamRunService` | Team manager | Team application API | second root lane/patch algorithm |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| GraphQL/frontend `RunEditableFieldFlags` | Advertises unrelated mutability and no Save authority | `RunModelConfigEditability` | In This Change | Update generated client/tests. |
| `activeContextStore.updateConfig` | Unused outside store and not durable | existing-run draft store | In This Change | Launch stores unchanged. |
| history editable getters/broad inactive flag mutation | Fixed fields never change; local inactive is not authority | explicit fixed UI + targeted refresh | In This Change | Local status may relock, never unlock. |
| activation service name/file and activation-only attempt ownership | Save must share restore ordering | renamed lifecycle service/lane | In This Change | Preserve quarantine/abort semantics. |
| `configurationRevision`, `expectedConfigurationRevision`, `STALE_REVISION`, digest helper | No current product path has concurrent config writers | Canonical query/result plus no-op equality | In This Change | Remove server, GraphQL, generated, store, localization, and tests together. |
| revision-aware draft rebase/retained-baseline flags | Served imagined multi-window writer behavior | Simple local draft; fresh Settings load; uncertain-outcome refresh only | In This Change | Remove `forceBaselineOnNextStoppedSync` and revision comparisons/rebase branches. |
| generalized `withUnmanagedRootPersistence` and archive lane changes | Archive/delete are not part of the supported Settings flow | Restore baseline `withUnmanagedHistoryDeletion` and archive behavior; Save calls explicit manager method | In This Change | Keep the pre-existing delete lane independently. |
| stored Team unconditional read-only model/projection | Existing Team needs active-locked/stopped-editable | specialized existing-Team model | In This Change | Launch model remains separate. |
| Claude combined capability predicate | Can advertise unsupported control | per-capability schema builder | In This Change | Update tests. |
| notices saying a new run is required | No longer true after stopped Save | approved guidance/messages | In This Change | English/Chinese. |

## Return Or Event Spine(s) (If Applicable)

**DS-005:** `network-fresh Settings query / mutation result / lifecycle status / uncertain-outcome reread -> runHistoryStore resume payload -> existingRunModelConfigStore -> Agent/Team form -> lock/Save/feedback`.

- `UPDATED`/`UNCHANGED`: replace canonical config, clear dirty, stay stopped, and patch standalone context display.
- Team: replace `teamResumeConfigByTeamRunId.executionTree`; project the selected Team form from that canonical tree/draft, not a stale context configuration snapshot. Restore later rehydrates member contexts.
- `RUN_ACTIVE`: mark active and relock. Local values may remain visibly unsaved for explanation, but are never rebased or resubmitted automatically. A later Stop and Settings reopen establishes a fresh baseline.
- Validation or definite persistence failure: keep the local draft and known canonical baseline. Transport failure or indeterminate physical write blocks Save until a network-fresh reread establishes the committed value.
- Local status can relock immediately; only Settings-owned targeted server refresh unlocks after Stop.

## Bounded Local / Internal Spines (If Applicable)

### DS-006 — standalone lane

`normalize ID -> enter per-run lane -> recheck active/quarantine/persisted state -> external/browser activation or validate/update -> commit/reread -> release`.

The active check must be inside the same lane as restore publication and Save because external-channel and application Agent resolution are independently triggered. An outside check is presentation guidance only. This lane does not serialize concurrent config writers through revisions.

### DS-007 — Team root lane

`normalize root ID -> enter rootTransitionLane -> recheck managed/package/archive state -> external/browser restore or validate/mutate/write -> canonical result -> release`.

Stopped model Save remains an explicit manager method, not a generic callback from GraphQL. Do not generalize the history gate: archive retains its baseline check/queue behavior and delete retains the pre-existing `withUnmanagedHistoryDeletion` lane.

## Off-Spine Concerns Around The Spine

| Concern | Spine(s) | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Schema validation | DS-001, DS-003 | lifecycle owners | Exact runtime/model lookup; normalize both schema forms; reject invalid keys/values | Server authority | duplicated provider checks |
| Agent draft compare | DS-001, DS-005 | draft store | Clone/dirty/no-op without sanitizing | Unsaved separation | local patch seen as durable |
| Team draft planner | DS-003, DS-005 | draft store | Draft-start equality links, direct-edit markers, bounded parent propagation, narrow patch generation; no Reset action | Approved Team semantics | panel blob/full-tree API |
| GraphQL mapping | DS-001, DS-003, DS-005 | facades | Typed inputs/results/errors | Explicit contract | resolver owns lifecycle |
| Catalog representability | DS-001, DS-003, DS-005 | forms/store | Fail closed and preserve residuals | Avoid destructive normalization | silent key loss |
| Claude adapter | DS-008 | Claude boundary | Map config to SDK options | Runtime effectiveness | provider rules in generic service |

## Ownership Boundaries

1. Canonical resume/status is server truth; browser draft never mutates history/context before canonical response.
2. Resolvers call only `AgentRunService`/`TeamRunService`.
3. Standalone activation/restore/Save use the lifecycle lane so external-channel restore cannot interleave. Catalog is internal persistence and keeps its existing queue/archived check; no writer revision is added.
4. Team manager alone authorizes unmanaged-root mutation; tree store is not called from transport/application callers.
5. Validator receives server-read fixed runtime/model and cannot default identity, omit invalid keys, or sanitize silently.
6. Generic lifecycle persists config; runtime adapters interpret provider keys at bootstrap/turn construction.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulates | Required Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRunService` | standalone lifecycle | GraphQL/commands | Resolver -> manager/store | add subject method |
| standalone lifecycle | lane, activation/quarantine, stopped-state validation/commit | Agent service | resolver -> metadata; old wrapper | retain current renamed owner, remove revision branches |
| catalog commit | catalog queue, archive check, metadata write/reread | lifecycle only | metadata write beside archive queue | add narrow commit |
| `TeamRunService` | Team manager | GraphQL/apps | resolver -> manager/store | add Team method |
| Team manager | managed map, root lane, package gate, tree store | Team service/history gate | GraphQL -> tree store | strengthen explicit operations |
| validator | catalog/schema policy | lifecycle owners | frontend-only/provider switch in mutation | extend validator |

## Dependency Rules

- Components depend on the draft store/form models; no direct mutation calls or canonical object mutation.
- Draft store may depend on GraphQL/history/context stores and pure planners; planners import neither Pinia nor Apollo.
- Resolvers depend only on application services and transport DTOs.
- `AgentRunService -> lifecycle -> validator + catalog/metadata reader` is allowed; resolver-to-store is forbidden.
- `TeamRunService -> manager -> validator + mutator + tree store` is allowed; service/resolver-to-tree store is forbidden.
- No layer exposes or computes a model-config revision token; canonical reads/results and the lifecycle lane serve the approved paths.
- Generic lifecycle never branches on Claude/Codex keys.
- UI owns the approved pre-edit equality snapshot and bounded parent-propagation plan; the server applies explicit validated patches and never infers propagation from the submitted final tree.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `getAgentRunResumeConfig(runId)` | standalone run | Return metadata and active/editability | exact `runId` | Settings entry calls network-only; remove broad flags/revision. |
| `getTeamRunResumeConfig(teamRunId)` | root Team | Return projected tree and root editability | exact root ID | Settings entry calls network-only; no revision. |
| `updateStoppedAgentRunModelConfig(input)` | standalone run | Validate/persist `llmConfig` while stopped | `{agentRunId, llmConfig}` | `llmConfig` present, nullable; no fixed fields/revision. |
| `updateStoppedTeamRunModelConfigs(input)` | root Team | Persist configured-scope patches while stopped | `{teamRunId, patches[]}` | Patch has kind/address/present nullable config; reject duplicates; no revision. |
| `AgentRunService.updateStoppedModelConfig` | Agent use case | Thin delegation | standalone input | Public facade. |
| lifecycle `updateStoppedModelConfig` | Agent lifecycle | Serialize/recheck/validate/commit | exact run ID | Governing owner. |
| catalog `commitRunModelConfig` | Agent persistence | In existing queue reject missing/archived; no-op compare; write/reread/classify | ID + canonical config | Internal; no lifecycle/revision policy. |
| `TeamRunService.updateStoppedModelConfigs` | Team use case | Thin delegation | root + patches | Public facade. |
| manager `updateStoppedModelConfigs` | Team lifecycle | Serialize/validate targets/configs/persist | root + typed patches | Governing owner. |
| manager `withUnmanagedHistoryDeletion` | Team history | Preserve the baseline delete-only gate | root + internal delete operation | Unchanged; stopped Save does not call it. |
| validator `validate` | fixed model config | Canonical config or errors | runtime + model + config | No defaults/deletions. |

### Transport outcome shape

Both mutations use:

`UPDATED | UNCHANGED | RUN_ACTIVE | RUN_ARCHIVED | NOT_FOUND | MODEL_UNAVAILABLE | SCHEMA_UNAVAILABLE | VALIDATION_FAILED | PERSISTENCE_FAILED | PERSISTENCE_INDETERMINATE | INTERNAL_ERROR`.

Expected rejections are typed, not message-parsed. Results include `success`, `outcome`, `message`, `isActive`, editability, and field errors. Agent returns canonical `llmConfig`; Team returns canonical projected tree. Only `UPDATED`/`UNCHANGED` have `success=true`. There is no stale-writer outcome.

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguous Risk | Action |
| --- | --- | --- | --- | --- |
| Agent resume/update | Yes | Yes | Low | Keep separate from Team. |
| Team resume/update | Yes | Yes | Low | Root ID + kind/address patches. |
| Team scope patch | Yes | Yes | Low | Verify root `/`, kind/address, and configured target. |
| Shared validation | Yes | Yes | Low | Fixed identity is server-read. |

## Main Domain Subject Naming Check

| Node | Name | Self-Descriptive? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Standalone transition owner | `StandaloneAgentRunLifecycleService` | Yes | Low | Rename. |
| Team transition owner | `AgentTeamRunManager` | Yes | Low | Extend existing responsibility. |
| Browser draft owner | `existingRunModelConfigStore` | Yes | Low | Keep launch drafts separate. |
| Team transformation | `team-run-model-config-mutator.ts` | Yes | Low | No I/O/lifecycle. |
| Schema authority | `ModelConfigValidationService` | Yes | Low | Avoid helper/common. |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Model/schema lookup | `ModelCatalogService` | Extend | Exact runtime catalogs already owned | N/A |
| Agent restore ordering | activation service | Extend + Rename | Already owns activation/restore/quarantine | N/A |
| Team ordering | manager root lanes | Extend | Owns create/restore/managed truth | N/A |
| Agent persistence | history catalog/metadata store | Extend | Queue and atomic file already owned | N/A |
| Team persistence | tree store/writer | Reuse | Schema validation/outcomes correct | N/A |
| Existing-run drafts | launch/history stores | Create focused store | Launch allows different fields; history cannot hold unsaved data | Dedicated owner avoids mixing. |
| Claude translation | Claude adapter chain | Extend | Provider boundary is correct | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spine(s) | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| web existing-run config | Fresh load, drafts, form state, Save/outcome verification | DS-001, DS-003, DS-005 | draft store | Simplify current implementation | Launch unchanged. |
| agent execution | Agent lane/update/restore | DS-001, DS-002, DS-006 | lifecycle | Extend/Rename | Active admission unchanged. |
| Team execution | Root lane/mutator/restore | DS-003, DS-004, DS-007 | manager | Extend | No task patches. |
| run history | Canonical reads/persistence | DS-001, DS-003, DS-005 | lifecycle/read services | Simplify current implementation | No migration or revision. |
| LLM management | Schema lookup/validation | DS-001, DS-003 | validator | Extend | Shared policy. |
| Claude runtime | Capability/query application | DS-008 | adapter chain | Extend | Exact pinned SDK. |
| GraphQL | Subject APIs/mapping | DS-001, DS-003, DS-005 | facades | Extend | Thin. |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `stores/existingRunModelConfigStore.ts` | web | draft owner | Specialized drafts, Save, and uncertain-outcome refresh | One selected operation state | draft types/planners |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Draft-start links, direct-edit markers, bounded parent propagation, patch planning | Cohesive algorithm | config equality |
| `standalone-agent-run-lifecycle-service.ts` | Agent | lifecycle | Activation/restore/update lane for external ingress safety | Same lifecycle subject | validator/catalog |
| `model-config-validation-service.ts` | LLM | validation | Catalog/schema/strict validation | Provider-neutral policy | normalized schema |
| `team-run-model-config-mutator.ts` | Team | pure transform | Configured-scope patch only | Avoid mixed current mutator | patch target |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| editability | tight run-history domain type | history | Same meaning in queries/results | Yes | Yes | field-flag bag or revision carrier |
| normalized schema | validator internal/domain file if needed | LLM | Both update paths | Yes | Yes | full generic JSON Schema engine |
| transport outcomes/errors | `api/graphql/types/run-model-config.ts` | API | Shared vocabulary | Yes | Yes | generic mutation/domain owner |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `RunModelConfigEditability` | Yes | Yes | Low | Only `editable` and `reason`. |
| mutation result core | Yes | Yes | Low | Shared outcomes; specialized canonical payloads. |
| Team patch | Yes | Yes | Low | Only kind/address/config. |
| frontend draft union | Yes | Yes | Low | Agent/Team discriminated variants. |

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concrete Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | web | draft owner | Fresh load, submit, result handling, uncertain-outcome refresh | One operation owner | specialized union |
| `types/agent/ExistingRunModelConfigDraft.ts` | web | contract | Tight Agent/Team variants/errors without revision | Explicit store/component contract | outcomes |
| `types/agent/ExistingTeamRunFormModel.ts` | web | form contract | Fixed facts + model edit/catalog state | Separate from launch model | draft scopes |
| `services/runConfigEditing/existingAgentModelConfigDraft.ts` | web | pure planner | Clone/equality/patch | Testable | equality |
| `services/runConfigEditing/existingTeamModelConfigDraft.ts` | web | pure planner | Tree semantics/patches | Testable | patch type |
| `standalone-agent-run-lifecycle-service.ts` | server Agent | lifecycle | Existing activation + lane/update | One lifecycle owner | validator/catalog |
| `model-config-validation-service.ts` | server LLM | validation | Current strict validation | One policy | catalog |
| `team-run-model-config-mutator.ts` | server Team | transform | Configured patch only | Narrow | tree validation |
| `api/graphql/types/run-model-config.ts` | server API | transport | Shared GraphQL vocabulary | Transport-only | domain results |

## Applied Patterns (If Any)

- Serialized per-identity transition lane inside lifecycle owners.
- Existing repository/atomic store serving lifecycle owners.
- Claude provider adapter for capability/query translation.
- Discriminated Agent/Team frontend draft variants.
- Network-fresh Settings entry and canonical success/outcome-verification reads.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Modify current file | Agent lifecycle | Retain activation/restore/Save lane; remove revision branches | Current owner | GraphQL/provider keys |
| `.../agent-execution/services/agent-run-service.ts` | Modify | Agent facade | Expose/wire update | Existing boundary | direct file writes |
| `.../run-history/services/agent-run-history-catalog-service.ts` | Modify current file | Agent persistence | Queued archived/missing/no-op check + commit/reread; remove revision input | Existing queue | active/schema/revision policy |
| `.../run-history/services/agent-run-model-config-commit.ts` | Modify current file | Agent persistence helper | Exact no-op/write/reread/failure classification without digest | Cohesive physical commit semantics | lifecycle/revision policy |
| `.../run-history/services/agent-run-resume-config-service.ts` | Modify current file | Agent read | Editability without revision; remove broad flags | Existing query source | mutation |
| `.../run-history/services/team-run-history-service.ts` | Modify current file | Team read | Root editability without revision | Existing query source | mutation |
| `.../run-history/domain/run-model-config-revision.ts` | Delete current file | Removed SR-003 policy | No supported concurrent writer | N/A | No replacement. |
| `.../llm-management/services/model-config-validation-service.ts` | Retain current file | Validator | Exact model/schema validation | Catalog subsystem | lifecycle/I/O |
| `.../agent-team-execution/services/agent-team-run-manager.ts` | Modify current file | Team lifecycle | Stopped update in root restore lane; remove revision and generalized history gate | Root-lane owner | UI/GraphQL/archive policy |
| `.../agent-team-execution/services/team-run-service.ts` | Modify | Team facade | Expose update | Existing boundary | tree I/O |
| `.../agent-team-execution/services/team-run-model-config-mutator.ts` | Retain current file | Team transform | Address/kind patch | Cohesive concern | tasks/I/O |
| `.../run-history/services/team-run-history-catalog-service.ts` | Revert SR-003-only portions | Team history | Restore baseline archive and delete-only gate ownership | No supported Settings/archive concurrency path | restore/update logic |
| `.../api/graphql/types/run-model-config.ts` | Modify current file | API | Outcomes/editability/errors without revision | Shared transport | business policy |
| `.../run-history/domain/run-model-config.ts`; GraphQL input/result types; generated frontend types | Simplify current files | Shared contracts | Remove revision field/input and `STALE_REVISION`; retain tight editability/outcomes | Same stopped-update vocabulary | concurrency policy |
| `.../api/graphql/types/agent-run.ts`, `agent-team-run.ts` | Modify | API | Narrow mutations | Subject resolvers | manager/store access |
| `.../api/graphql/types/run-history.ts`, `team-run-history.ts` | Modify current files | API read | Model-config editability without revision | Existing queries | update logic |
| `.../runtime-management/claude/client/claude-sdk-model-normalizer.ts` | Modify | Claude catalog | Independent capability fields | Existing adapter | session state |
| `.../claude/session/claude-session-config.ts` | Modify | Claude session | Typed thinking/effort from config | Session settings | catalog access |
| `.../claude/backend/claude-session-bootstrapper.ts` | Modify | Claude bootstrap | Pass persisted config | Existing assembly | generic validation |
| `.../claude/session/claude-session.ts` | Modify | Claude turn | Forward SDK options | Existing query call | raw config interpretation |
| `.../runtime-management/claude/client/claude-sdk-client.ts` | Modify | Claude SDK | Type/emit options | External boundary | lifecycle |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts`, `agentTeamRunMutations.ts` | Modify | web API | Agent/Team Save documents | Existing API files | draft algorithms |
| `autobyteus-web/graphql/queries/runHistoryQueries.ts` | Modify current file | web API | Query editability without revision; force network on Settings entry | Existing reads | inference |
| `autobyteus-web/stores/runHistoryTypes.ts`, `runHistoryStore.ts`, Settings load actions | Modify current files | canonical history | Remove revision; expose network-only Agent/Team resume refresh used on Settings entry | Existing read model | drafts |
| `autobyteus-web/stores/existingRunModelConfigStore.ts` | Simplify current file | draft | Fresh Settings load, Save, canonical result, uncertain-outcome retry | Focused capability | launch state/revision rebase |
| `autobyteus-web/services/runConfigEditing/` | Add Folder | pure draft | Agent compare/Team planner | Algorithms outside UI | Pinia/Apollo |
| `autobyteus-web/types/agent/ExistingRunModelConfigDraft.ts`, `ExistingTeamRunFormModel.ts` | Add | contracts | Specialized variants | Tight shapes | optional bag |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Modify | surface | Draft lifecycle, Run/Save, notices | Existing host | tree/network logic |
| Agent/Team form hierarchy files | Modify | forms | Fixed vs model editable; Team direct-edit/propagation events; no existing-run Reset | Existing UI | persistence |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Modify | reusable field | Split selector/model-config disablement | Coupling point | selected-run policy |
| `ModelConfigSection.vue` and schema utilities | Modify as needed | schema UI | Residual/representability safety | Existing UI | server authority |
| `autobyteus-web/stores/activeContextStore.ts` | Modify | context facade | Remove local config mutation | Clean ownership | Save |
| English/Chinese workspace localization + generated catalogs | Modify/Regenerate | localization | Approved copy | Existing system | hard-coded strings |
| relevant server/web tests | Modify/Add/Remove | coverage | Sequential journey, external-ingress lifecycle ordering, validation/persistence/UI/runtime; remove concurrent-writer/revision tests | Existing test structure | imagined browser paths |

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-execution/services` | Main-Line Control | Yes | Low | Standalone lifecycle beside manager/service. |
| `agent-team-execution/services` | Main-Line Control + owned transform | Yes | Low | Manager governs; mutator internal. |
| `llm-management/services` | Off-Spine | Yes | Low | Catalog validation shared. |
| `run-history/domain/services/store` | Mixed justified | Yes | Low | Tight editability/outcome domain, service, and physical store stay distinct; revision helper is removed. |
| `web/services/runConfigEditing` | Off-Spine | Yes | Low | Pure algorithms separate. |
| `web/components/workspace/config` | Presentation | Yes | Medium | Keep only rendering/events. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided | Why |
| --- | --- | --- | --- |
| Settings entry | `mount editor -> clear/lock draft -> network-only resume query for selected identity -> ignore superseded response -> create canonical draft -> load schema -> unlock if stopped` | unlock from cached Stop state or refresh config inside the Stop action | Matches the real sequential screen journey and prevents a stale enable flash. |
| Agent input | `{agentRunId, llmConfig:{reasoning_effort:'high'}}` | full runtime/model/workspace config or writer revision | Fixed fields cannot change; no concurrent writer contract. |
| Team patch | `{scopeKind:'CONFIGURED_AGENT', scopeAddress:'/code_reviewer', llmConfig:{...}}` | client replacement tree | Explicit identity; task nodes unreachable. |
| Real independent activation | External-channel Save lane first -> commit -> ingress restore reads new; ingress restore first -> active -> Save `RUN_ACTIVE` | justify with two browser tabs or omit the lane despite channel ingress | Protects BEH-008 without inventing writer policy. |
| Parent propagation | Parent changes only draft-start matching, not-directly-edited descendants; a direct edit before/after propagation wins and becomes a boundary | server guesses from the submitted final tree or overwrites a direct edit | UI snapshots and applies the approved deterministic boundary. |
| Fixed-identity divergence | A child with different fixed runtime/model remains `Customized`, receives no ancestor change, has no Reset action, and edits against its own schema | copy parent `llmConfig` or change child identity | Resolves F-001 without broadening mutable fields. |
| Claude | absent -> omit; true -> adaptive; false -> disabled; effort -> SDK effort | persist but never query-map | Avoid false success. |
| Schema gap | show residual, disable Save, Retry | mount-time sanitization | Prevent data loss. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean Replacement |
| --- | --- | --- | --- |
| Keep broad flags beside new contract | Less frontend churn | Rejected | Replace query/types/stores/tests. |
| Activation wrapper around lifecycle | Fewer imports | Rejected | Rename/update directly. |
| Generic Agent/Team full-config mutation | One API | Rejected | Two narrow subject APIs. |
| Full Team tree replacement | Client has tree | Rejected | Narrow patches/server canonical tree. |
| Hot update or auto-stop Save | Immediate apply | Rejected | Manual Stop -> Save -> restore. |
| Reuse pre-launch Reset in stopped-run editing | Familiar hierarchy action | Rejected | No stopped-run Reset; direct scope edits plus bounded parent propagation. Existing pre-launch Reset is unchanged. |
| Claude deprecated `maxThinkingTokens` fallback | Older examples | Rejected | Exact pinned `thinking`/`effort`. |
| Parallel stored/stopped Team modes | Easier transition | Rejected | One existing-run model contract. |
| Optimistic revision/draft rebase | Mechanically possible concurrent browser writers | Rejected | Sequential browser flow, canonical fresh load/result, and no-op equality. |
| Generalize Team archive/delete lane for Settings Save | One lock for all persistence operations | Rejected | Save uses explicit manager lifecycle method; baseline archive/delete ownership remains. |

## Derived Layering (If Useful)

`Vue presentation -> existing-run draft state -> GraphQL subject boundary -> application facade -> lifecycle owner -> validation/persistence -> runtime adapter/provider`.

This is explanatory; boundary/no-bypass rules remain authoritative.

## Change / Refactor Sequence

1. Protect the current feature baseline with focused tests for validation, narrow Agent/Team mutation, Team propagation/no Reset, and the three runtime adapters before simplifying coordination.
2. Remove `configurationRevision`, `expectedConfigurationRevision`, `STALE_REVISION`, the digest file, revision-aware commit shapes, GraphQL/generated fields, store comparisons/rebase flags, localization, and concurrent-writer tests as one clean contract cut.
3. Keep `StandaloneAgentRunLifecycleService` and its per-run lane because BEH-008 reaches it; simplify `updateStoppedModelConfig` and the catalog commit helper to active/archived/missing/validation/no-op/write/reread outcomes while preserving activation quarantine/abort/binding behavior.
4. Keep Team Save inside `AgentTeamRunManager`'s existing root restore lane; remove revision comparisons and restore `withUnmanagedHistoryDeletion` plus archive/delete behavior/tests from `origin/personal` for SR-003-only changes.
5. Move resume-config refresh ownership from Stop actions to Settings entry. Make `RunConfigPanel`/editor await a network-only Agent/Team resume query before creating an editable draft; cached status may relock but never unlock.
6. Simplify `existingRunModelConfigStore` to canonical/draft/schema/dirty/saving/feedback/field errors plus outcome-verification refresh only for transport or physical indeterminate results. Remove revision rebase, concurrent-writer, and forced-baseline state.
7. Retain and adjust the implemented fixed-versus-model UI, Team planner/direct edits, contextual Save, notices, accessibility, current-schema residual safety, and absence of stopped-run Reset.
8. Retain and verify Claude capability/session/query mapping and AutoByteus/Codex restoration. Update message text to name external activity only where `RUN_ACTIVE` can occur after a stopped Settings load.
9. Run implementation-scoped unit/integration checks. After code review, `api_e2e_engineer` must revise its draft coverage investigation so rejected API-E2E-003/004 browser scenarios do not proceed; add only coverage traced to the sequential journey or BEH-008.

No interim UI unlock may rely on cached Stop state, and no revision compatibility seam remains after step 6.

## Key Tradeoffs

- Manual Stop adds one step but avoids active admission, interruption, recycling, and partial-Team semantics.
- Narrow patches require planners but enforce fixed-field preservation and exclude transient tasks.
- Omitting optimistic revision keeps the API proportional to the sequential single-writer product path; canonical reads/results and no-op detection remain sufficient.
- Client-owned bounded Team propagation preserves the approved deterministic value-matching behavior; the server still validates and persists explicit final patches.
- Omitting Reset from stopped-run editing avoids pretending a narrow `llmConfig` update can clear fixed launch identity; the existing pre-launch authoring action remains available only in its current flow.
- Failing closed on schema drift can temporarily block editing but prevents stored-value loss.
- Claude work is Medium, but required for truthful all-runtime behavior.

## Risks

1. Dynamic model/schema disappears between render and Save: resolve again in transition and reject without write.
2. Historical residuals: display and disable Save; never sanitize historical mode.
3. Missing Team override provenance: use the approved draft-start immediate-parent value comparison plus current-draft direct-edit markers only to bound parent propagation; do not claim recovered intent or offer stopped-run Reset.
4. Team post-rename indeterminate: return explicit outcome, reread, network-refresh, block repeat Save until reconciled.
5. External-channel ingress or Application Engine input can activate a bound stopped run independently: retain only the per-run/root restore lane and direct `RUN_ACTIVE` result described by BEH-008.
6. Claude SDK evolution: isolate mapping against pinned `0.3.231`; no deprecated fallback.
7. Browser multi-tab/multi-user/concurrent submission behavior is intentionally unspecified. Do not add revision or rebase machinery; if product requirements later authorize such a workflow, investigate it as a separate change.

## Guidance For Implementation

- Local lifecycle is only a presentation hint. Stop completes first; Settings entry then fetches a network-fresh resume payload before unlock. Always recheck server-side inside the lane because BEH-008 external ingress can independently activate the same bound run.
- Do not compute, transport, persist, or compare model-config revisions. No compatibility field or ignored input remains.
- Validator accepts only null/plain JSON object, rejects unknown keys, and enforces required/type/integer/enum/min/max/pattern from both schema encodings. Never add defaults/delete keys. Unsupported shapes fail closed.
- Validate all Team patches before any write. Require nonempty patches, reject duplicates/kind mismatches/transient targets, and return `UNCHANGED` without write for no-op.
- Preserve stored objects by replacing only containing launch `llmConfig`; never rebuild metadata/tree from client input. Reread and verify after write.
- Claude mapping: absent `thinking_enabled` omits option; true -> adaptive; false -> disabled; valid effort -> `effort`. Preserve session binding. Emit each catalog field only for its independent capability.
- Keep `AgentRunConfig.isLocked` semantics; add separate selector and model-config editable props.
- Team planner/UI tests: matching descendant chains propagate; a draft-start divergent child and its branch stay unchanged; direct-edit-before-parent and direct-edit-after-propagation both win and bound later propagation; direct edits use the target's fixed schema; no stopped-run Reset is rendered; equal-to-parent edits, sibling isolation, fixed runtime/model differences, minimal patches, and transient exclusion remain covered. Existing pre-launch Reset regression coverage remains unchanged.
- Server coverage: direct active rejection; sequential stopped Save; no-op; fixed-field preservation; validation; definite/indeterminate persistence; and both Save/external-ingress-restore orders through the exact Agent and Team paths in BEH-008. Do not add generic concurrent-writer, stale-revision, multi-tab, or archive/delete-vs-Save tests. Team coverage additionally proves each submitted scope validates against its own fixed runtime/model, a divergent child is not implicitly copied from its parent, and no mutation input can change fixed identity.
- Runtime coverage: AutoByteus rebuilt config, Codex same-thread effort/tier, Claude same-session thinking/effort.
- Frontend coverage: active/idle lock; Stop completes before separate Settings entry; Settings-owned network load and no stale unlock; stopped focusability; Run/Save; dirty/saving/no-op; draft discard; validation and uncertain-outcome refresh; external-activation relock; residual safety; accessible announcements. Remove revision/rebase/multi-client cases.
- API/E2E coverage should prove: (1) sequential stopped standalone Save through GraphQL/storage/restart and later same-ID restore; (2) the equivalent root Team hierarchy path with fixed-field preservation and no Reset; (3) direct active rejection; (4) one exact Agent and one exact Team independent resolver path from BEH-008, preferably external ingress or application input, rather than synthetic two-client timing; and (5) browser Stop completion -> Settings loading -> edit -> Save -> later message. The existing draft API-E2E-003/004 definitions are not authoritative and must be removed or rewritten by their owner before execution.
