# Proposed Design Document

## Design Version

- Current Version: `v6`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial implementation approval | Defined mixed binding setup model: definition-bound `AGENT`, run-bound `TEAM`, metadata-preserving team dispatch, and coordinator-only external replies | 1 |
| v2 | User expanded scope to phase 2 | Replace run-bound `TEAM` setup with definition-bound `TEAM` bindings, add team launch preset persistence, cached `teamRunId` reuse semantics, and lazy first-message team creation | Pending |
| v3 | User clarified lifecycle parity after restart | Narrow cached TEAM reuse to current-process bot-owned active-run parity with AGENT and model restart-safe websocket reconnect behavior for already selected live contexts | Pending |
| v4 | Manual workspace verification found live team selection regression | Preserve subscribed live team contexts on left-tree member selection instead of reopening them from persisted projection | Pending |
| v5 | Repeated websocket attach churn exposed mixed state ownership | Separate persisted history from active-runtime liveness and move websocket subscription ownership behind a dedicated backend active-runtime source plus one frontend subscription manager | Pending |
| v6 | Deeper architecture review found runtime-aware projection is still too low in the history stack | Extend runtime awareness from projection providers into a broader backend history-source boundary and keep member-visible status separate from team aggregate liveness | Pending |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/messaging-agent-team-support/investigation-notes.md`
- Requirements: `tickets/in-progress/messaging-agent-team-support/requirements.md`
- Requirements Status: `Refined`

## Summary

Replace the temporary run-bound team-binding model with a definition-bound team-binding model that behaves analogously to agent bindings while still preserving coordinator-only Telegram replies.

- `AGENT` bindings remain definition-bound and keep the existing `launchPreset` plus agent auto-start behavior.
- `TEAM` bindings become definition-bound and persist:
  - `targetTeamDefinitionId`
  - `teamLaunchPreset`
  - optional cached `teamRunId`
- The setup UI shows a team-definition selector instead of a team-run selector.
- The runtime resolves or creates the concrete team run from the binding:
  - if the binding's cached `teamRunId` is still active, reuse it
  - otherwise create a new team run from the bound definition and launch preset, cache the new `teamRunId`, and dispatch the message
- External replies remain single-stream and coordinator or entry-node only.
- Frontend live-stream transport keeps reconnecting across restart-time failed reconnect closes instead of stopping after the first failed retry.
- Left-tree member selection for an already subscribed live team run changes focus only and does not reopen persisted history.
- Persisted history loading becomes read-only and no longer owns active-run recovery side effects.
- Active agent/team liveness is provided by a dedicated backend active-runtime source.
- One frontend subscription manager owns websocket attachment for active runs and teams.
- Backend run-history behavior becomes runtime-aware above the projection-provider layer through a broader history-source boundary that owns projection, summary extraction, and resume metadata per runtime.
- Member-visible status remains member-first; team aggregate status is kept as a lower-level liveness and subscription signal.

## Goals

- Let users bind Telegram and other supported messaging channels directly to a team definition.
- Avoid requiring the user to manually start a team run before configuring messaging.
- Preserve a single external reply stream for Telegram team conversations.
- Support `autobyteus`, `codex_app_server`, and `claude_agent_sdk` team execution paths through one clean external-channel flow.
- Keep setup concerns in the external-channel setup boundary and runtime launch concerns in runtime or team-execution services.
- Make persisted-history loading side-effect free.
- Make liveness ownership explicit so active/inactive state and websocket subscriptions follow one natural state machine.
- Normalize runtime-aware history access so Codex, Claude, and AutoByteus runs do not leak storage-specific assumptions into shared history services.
- Keep focused-member status as the primary visible team status while treating team aggregate status as infrastructure state for liveness and subscription ownership.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - remove the phase-1 run-bound `TEAM` setup contract from the active design
  - remove UI and GraphQL assumptions that a user selects `targetTeamRunId`
- Gate rule: design is invalid if the user-facing binding target is still a pre-existing team run.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Remove the setup-layer agent-only constraint | AC-001, AC-003 | Setup can save `TEAM` bindings from team definitions | UC-002, UC-007 |
| R-002 | Support direct team-definition messaging behavior | AC-003, AC-004, AC-006 | Team bindings create/reuse runs and dispatch across runtimes | UC-006, UC-007, UC-008 |
| R-003 | Avoid chaotic message fan-out | AC-004 | Only one external reply stream is published | UC-003, UC-008 |
| R-004 | Make team bindings definition-bound for usability | AC-003 | User selects a team definition, not a running team instance | UC-006, UC-007 |
| R-005 | Persist enough team launch configuration to start a run | AC-003, AC-004 | `teamLaunchPreset` is stored and expanded into member configs | UC-006, UC-008 |
| R-006 | Cache and reuse only current-process bot-owned active cached team runs | AC-004, AC-005, AC-006 | cached `teamRunId` is reused only when that exact cached run is both bot-owned in the current process and active | UC-008, UC-009 |
| R-007 | Default to coordinator or entry-node-only external replies | AC-004, AC-007, AC-008 | Team message ingress and callback routing remain single-responder | UC-003, UC-008, UC-009 |
| R-008 | Preserve live-stream reconnect reliability across backend restart | AC-009 | restart-time reconnect attempts continue until retry budget exhaustion | UC-010 |
| R-009 | Preserve live team context on left-tree member selection | AC-010 | subscribed live team contexts are focused in place instead of reopening from persisted projection | UC-011 |
| R-012 | Keep history refresh side-effect free | AC-013 | persisted history loading does not reconnect live streams | UC-014 |
| R-013 | Centralize liveness and subscription ownership | AC-014, AC-015 | active runtime state comes from a backend source and one frontend subscription manager reconciles live sockets | UC-015, UC-016 |
| R-014 | Make the backend active-runtime snapshot runtime-aware | AC-016, AC-017 | team-member runs are excluded from standalone active agents and member-runtime teams remain visible as active teams | UC-015, UC-016 |
| R-015 | Make history projection and resume semantics runtime-aware above the projection-provider layer | AC-018, AC-019 | standalone and team-member history access resolve through a runtime-aware backend history-source boundary | UC-017, UC-018 |
| R-016 | Keep frontend history loading runtime-agnostic | AC-018, AC-019 | web history rendering consumes normalized backend contracts only | UC-017, UC-018 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | External-channel setup lives in `external-channel-setup` GraphQL types and web messaging stores/components. Runtime ingress uses `DefaultChannelRuntimeFacade`. | `src/api/graphql/types/external-channel-setup/resolver.ts`, `autobyteus-web/stores/messagingChannelBindingSetupStore.ts`, `src/external-channel/runtime/default-channel-runtime-facade.ts` | Whether team-definition options should come from setup boundary or direct definition GraphQL |
| Current Naming Conventions | Agent setup uses `targetAgentDefinitionId` and `launchPreset`. Runtime persistence already has `teamRunId`, but not a setup-facing team-definition field. | `src/external-channel/domain/models.ts`, `src/api/graphql/types/external-channel-setup/types.ts` | Best naming for the new setup fields |
| Impacted Modules / Responsibilities | Resolver owns setup mutation validation, mapper owns binding shape, runtime launcher owns agent lazy-start, team mutation service owns team lazy-create today, continuation service owns active-or-resume delivery. | `src/api/graphql/types/external-channel-setup/*`, `src/external-channel/runtime/channel-binding-runtime-launcher.ts`, `src/api/graphql/services/team-run-mutation-service.ts`, `src/run-history/services/team-run-continuation-service.ts` | Cleanest shared service for team lazy-create without GraphQL leakage |
| Data / Persistence / External IO | Binding providers already persist AGENT presets plus `teamRunId`. Prisma/file storage must expand to hold team-definition binding metadata. | `src/external-channel/providers/*channel-binding-provider.ts`, `prisma/schema.prisma` | Whether to store full member configs or a smaller launch preset |

## Current State (As-Is)

- Web setup flow allows `TEAM` only because of the phase-1 branch in this worktree, but it still binds to a selected `teamRunId`.
- Setup GraphQL accepts `TEAM` only as `targetTeamRunId`.
- Binding persistence knows about `teamRunId` but not `teamDefinitionId` plus a reusable team launch preset.
- Runtime team dispatch can continue or resume an existing team run with preserved metadata, but TEAM binding reuse is currently broader than the desired bot-owned lifecycle because it can adopt cached runs that became active again through history reopening after restart.
- Team lazy creation already exists elsewhere, but only behind GraphQL team-run mutation services and requires explicit `memberConfigs`.
- Frontend websocket reconnect attempts stop after the first failed reconnect close during backend restart because the reconnect scheduler only re-arms from the `CONNECTED` close path.
- Workspace history refresh is currently coupled to `recoverActiveRunsFromHistory(...)`, so a persisted-history read path also owns live websocket recovery side effects.
- The backend already has authoritative active-run managers and GraphQL queries for active agent runs and active team runs, but the frontend does not consume them as a dedicated live-registry concept.

## Target State (To-Be)

- Setup flow supports two target types:
  - `AGENT`: existing definition-bound configuration with `targetAgentDefinitionId` and `launchPreset`
  - `TEAM`: definition-bound configuration with `targetTeamDefinitionId` and `teamLaunchPreset`
- Setup GraphQL exposes:
  - `externalChannelTeamDefinitionOptions`
  - `targetTeamDefinitionId` in binding input/output
  - `teamLaunchPreset` in binding input/output
- Binding persistence stores:
  - `teamDefinitionId`
  - `teamLaunchPreset`
  - cached `teamRunId`
- External-channel runtime dispatch for `TEAM` does:
  1. resolve cached `teamRunId` if present and active
  2. otherwise create a new team run from `teamDefinitionId + teamLaunchPreset`
  3. cache the new `teamRunId`
  4. continue or dispatch the external message into that run with preserved metadata
- Verification and binding summary UI understand both target types and render team-definition readiness correctly.
- Frontend live-stream transport continues reconnect attempts across repeated failed reconnect closes during backend restart until the configured retry budget is exhausted.
- Left-tree team-member selection branches by local live subscription state:
  - subscribed live local context -> update focus and selection only
  - non-live or unsubscribed context -> reopen from persisted projection and reconnect
- Persisted history loading is read-only:
  - history queries update rows, summaries, timestamps, and persisted metadata only
  - history refresh does not reconnect sockets or reopen active contexts
- Backend exposes a dedicated active-runtime source for agents and teams:
  - initial snapshot query is acceptable
  - a lightweight push feed for active-set changes is preferred later
- Frontend owns one subscription manager:
  - desired subscribed set = active runs or teams under current product policy
  - actual subscribed set = currently live websocket-backed contexts
  - reconciliation attaches only newly active runs and detaches only no-longer-active runs
- Selection and liveness are separate:
  - selecting a row changes focus
  - it does not itself decide whether a run is active or should be auto-recovered

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: setup concerns stay in the external-channel setup boundary; persisted history, live-runtime liveness, and websocket subscription ownership are distinct concerns and must not be mixed in one polling path.
- SoC cause statement: definition-option discovery, binding validation, binding persistence, team-run creation, active-runtime discovery, subscription orchestration, and row selection are separate responsibilities and should remain in separate owning modules.
- Layering result statement: web history read-model -> web active-runtime registry -> web subscription manager -> per-run streaming service -> backend runtime managers and active-runtime APIs.
- Decoupling rule statement: history refresh must not call reconnect logic; subscription management must not infer liveness from persisted-history polling; runtime dispatch must not depend on UI selection state.
- Module/file placement rule statement: history loading stays in run-history stores, active-runtime discovery gets a dedicated store/service, subscription orchestration gets a dedicated manager, and websocket transport stays a low-level reusable primitive.

## Architecture Direction Decision (Mandatory)

- Chosen direction: keep agent and team bindings both definition-bound, but with distinct preset models:
  - `AGENT` uses `launchPreset`
  - `TEAM` uses `teamLaunchPreset`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - definition-bound team selection fixes the product usability issue directly
  - cached `teamRunId` keeps runtime reuse efficient without exposing run-instance selection to the user
  - a dedicated team-launch preset is explicit and testable
  - extracting a reusable team-launch service prevents external-channel runtime from depending on GraphQL mutation code
- Layering fitness assessment: `Yes`
- Decoupling assessment: `Yes`
- Module/file placement assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add + Split`

## Active Runtime Registry Decision

- Chosen direction: add a dedicated backend-derived active-runtime registry on the frontend and remove run-history-driven live recovery side effects.
- Product policy decision: keep all active runs and teams live-connected while the active set remains small.
- Why this fits the product:
  - the user expects active runs to remain truly live even when not selected
  - the current active-set size is small enough that one websocket per active run or team is operationally acceptable
  - this preserves immediate stream continuity when the user switches focus back to another active run
- Why the current approach is wrong:
  - history polling is a persisted-state concern, not a live-runtime concern
  - it creates confusing state transitions where simple history refresh can trigger reconnect behavior
  - it makes websocket churn hard to reason about because transport retries and app-level recovery are both trying to own reconnection

## Proposed Structural Split

### 1. Persisted History Read Model

- Owner:
  - `runHistoryStore` and history read-model helpers
- Responsibility:
  - fetch and render persisted rows only
  - never reconnect sockets
  - never reopen active contexts as a side effect of polling

### 2. Active Runtime Registry

- Backend source:
  - existing `agentRuns()` and `agentTeamRuns()` are sufficient as a first read-model source
  - later, add one combined active-runtime endpoint or feed if desired
- Frontend owner:
  - new dedicated store or service that tracks active agent and team ids separately from persisted history
- Responsibility:
  - authoritative UI liveness overlay
  - drives status indicators and desired live-subscription set

### 3. Subscription Manager

- Owner:
  - new orchestration layer above `AgentStreamingService` and `TeamStreamingService`
- Responsibility:
  - reconcile desired active subscriptions against actual websocket-backed subscriptions
  - attach once for newly active runs
  - detach once for no-longer-active runs
  - avoid reconnect decisions leaking into history refresh

### 4. Selection And Focus

- Owner:
  - existing selection stores
- Responsibility:
  - change which run or member is focused in the UI
  - never decide runtime liveness
  - never implicitly reopen active contexts just because the user changes focus

### 5. Runtime-Aware History Source

- Owner:
  - backend run-history query services plus a runtime-aware history-source registry
- Responsibility:
  - resolve projection, summary extraction, and resume metadata through a runtime-aware boundary
  - hide local file-layout assumptions from higher history services
  - keep Codex, Claude, and AutoByteus history access behind one normalized backend contract

### 6. Run Lifecycle Service

- Owner:
  - backend run-lifecycle orchestration above runtime-specific launch/continue paths
- Responsibility:
  - converge frontend-started runs, frontend-continued history runs, and backend-triggered external ingress into one lifecycle model
  - mark runs and teams live through one consistent backend path before dispatching message content
  - avoid letting history opening or UI selection drive runtime creation implicitly

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists | Yes | Team lazy-create already exists in team-run mutation flow and is now also needed by external-channel runtime | Extract reusable team-launch service |
| Responsibility overload exists in one file/module | Yes | `TeamRunMutationService` currently owns launch/config/history orchestration that should be reusable outside GraphQL | Split launch orchestration out of the GraphQL service |
| Proposed new layer owns concrete coordination policy | Yes | Team-launch service owns preset expansion, runtime-mode selection, run creation, and manifest persistence | Keep addition |
| Current layering can remain unchanged without SoC/decoupling degradation | No | Reusing GraphQL mutation service from external-channel runtime would be a boundary violation | Change |

## Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Keep run-bound `TEAM` bindings and ask users to start teams first | Smallest code delta | Fails the product requirement and remains hard to use | Rejected | User explicitly wants definition-bound support |
| B | Let external-channel runtime call `TeamRunMutationService` directly for lazy creation | Reuses existing logic quickly | Leaks GraphQL-service responsibilities into runtime boundary | Rejected | Violates clean architecture goal |
| C | Add definition-bound `TEAM` bindings plus reusable team-launch service | Solves usability issue and keeps boundaries clean | Broader persistence and runtime changes | Chosen | Best fit for the requirement and architecture |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts` | Setup-focused team-definition discovery/validation | Server GraphQL setup, tests | Uses team definition service, not run history |
| C-002 | Add | N/A | `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts` | Reusable lazy-create and manifest-persist orchestration for teams | External-channel runtime, GraphQL team run mutations, tests | Extract from `TeamRunMutationService` |
| C-003 | Modify | `autobyteus-server-ts/src/external-channel/domain/models.ts` | same | Add `teamDefinitionId` and `teamLaunchPreset` to binding model/input | Server domain and persistence | Keep `teamRunId` as cached runtime pointer |
| C-004 | Modify | `autobyteus-server-ts/src/external-channel/providers/*channel-binding-provider.ts`, `prisma/schema.prisma` | same | Persist new team-definition binding fields and reset cached `teamRunId` when config changes | Storage providers and schema | Requires Prisma client regeneration |
| C-005 | Modify | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/types.ts` | same | Replace team-run setup fields/query with team-definition setup fields/query and team launch preset contract | GraphQL schema, web codegen | Setup contract change |
| C-006 | Modify | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/resolver.ts` | same | Accept `TEAM` bindings by definition, validate team definitions and launch preset, and persist cleanly | Setup mutation/query behavior | Keep AGENT path intact |
| C-007 | Modify | `autobyteus-server-ts/src/api/graphql/types/external-channel-setup/mapper.ts` | same | Surface `targetTeamDefinitionId`, `teamLaunchPreset`, and cached `teamRunId` appropriately | Web binding list/verification | Pure mapping change |
| C-008 | Modify | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts` | same | Make `resolveOrStartAgentRun(...)` and `resolveOrStartTeamRun(...)` reuse only current-process bot-owned active cached runs | External ingress runtime | prevents history-reopened runs from hijacking a messaging binding after restart |
| C-009 | Modify | `autobyteus-server-ts/src/external-channel/runtime/default-channel-runtime-facade.ts` | same | `TEAM` dispatch resolves or creates the run before continuation | External ingress runtime | Enables definition-bound team bindings |
| C-010 | Modify | `autobyteus-server-ts/src/api/graphql/services/team-run-mutation-service.ts` | same | Delegate existing lazy-create logic to the reusable team-launch service | GraphQL team-run path | Reduces duplication |
| C-011 | Modify | `autobyteus-web/types/messaging.ts`, setup store/composables/component, related docs | same | Replace team-run setup UI with team-definition selector plus team launch preset form | Web settings UX | Keep coordinator-only reply hint |
| C-012 | Modify | `autobyteus-web/stores/messagingVerificationStore.ts` | same | Verify definition-bound team readiness by target type | Web verification UX | No AGENT-only assumption |
| C-013 | Modify | `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` | same | Continue reconnect attempts after failed reconnect closes during backend restart | Web live streaming transport | Shared by agent and team streams |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Team definition options service | N/A | `autobyteus-server-ts/src/external-channel/services/channel-binding-team-definition-options-service.ts` | External-channel setup option policy | Yes | Keep | Setup-facing option mapping belongs in external-channel |
| Team run launch orchestration | logic embedded in `team-run-mutation-service.ts` | `autobyteus-server-ts/src/agent-team-execution/services/team-run-launch-service.ts` | Team launch/runtime policy | Yes | Split | Reusable outside GraphQL |
| Runtime launcher | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-runtime-launcher.ts` | same | External message ingress lazy-start policy | Yes | Keep | Name already fits both agent and team |
| Team continuation service | `autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts` | same | Team resume/delivery policy | Yes | Keep | Resume logic remains distinct from launch logic |
| Messaging setup UI/store | existing messaging files | same | Web settings UX | Yes | Keep | Replace TEAM run selector with TEAM definition preset flow |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Web history read model | Render persisted run/team rows and summaries | history queries, tree shaping, persisted metadata | websocket ownership or active-runtime recovery | Runtime-agnostic by design |
| Web active-runtime registry | Track currently live runs and teams | active runtime snapshot, liveness overlay | history hydration or projection opening | Drives desired live-subscription set |
| Web subscription manager | Reconcile live websocket ownership | attach/detach for active runs and teams, reconnect policy handoff | persisted history polling or runtime launch semantics | Product policy may keep all active runs subscribed |
| Web messaging setup flow | Render provider/binding UX and collect user input | target type selection, team definition selector, team launch preset form state | team runtime creation or resume policy | TEAM subform mirrors agent setup feel |
| External-channel setup GraphQL | Setup-facing query/mutation contract | team-definition option query, target-type-specific validation, binding mapping | team runtime execution internals | Talks to option/binding services only |
| Backend active-runtime registry | Normalize live agent/team membership for consumers | active run ids, member live status snapshots, team aggregate liveness | persisted history projection or UI selection rules | Runtime-aware and safe for member-runtime teams |
| Backend history-source boundary | Normalize runtime-aware history access | projection, summary extraction, resume metadata, storage expectations | websocket subscription policy or UI-facing selection rules | Extends the current projection-provider idea upward |
| Backend run lifecycle service | Converge all run/team activation paths | create or continue run/team, dispatch initiation handoff | persisted history polling or frontend focus state | Same lifecycle model for frontend-started and backend-triggered flows |
| External-channel services/runtime | Binding semantics and ingress routing | AGENT lazy-start, TEAM lazy-start delegation, inbound dispatch | GraphQL mutation orchestration | Uses launcher + continuation services |
| Team execution services | Team lazy-create and runtime-mode orchestration | preset expansion, member config generation, team creation, history manifest persistence | messaging UI concerns | Shared by GraphQL team-run mutations and external-channel runtime |
| Team history/continuation | Active-or-resumable delivery into a known team run | native/member-runtime resume, metadata-preserving message dispatch | setup validation UX | Used after launch resolution |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep the phase-1 `targetTeamRunId` setup field and add definition support beside it | Lower migration effort | Rejected | Replace the setup-facing TEAM contract with `targetTeamDefinitionId + teamLaunchPreset` |
| Reuse agent `launchPreset` fields for TEAM | Smaller schema delta | Rejected | Explicit `teamLaunchPreset` type |
| Call GraphQL `TeamRunMutationService` from runtime code | Quick reuse of lazy-create logic | Rejected | Extract reusable `TeamRunLaunchService` |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `channel-binding-team-definition-options-service.ts` | Add | Server application/service | List and validate bindable team definitions | `listTeamDefinitionOptions()`, `requireTeamDefinition(id)` | none -> option DTO / validated definition | `AgentTeamDefinitionService` |
| `team-run-launch-service.ts` | Add | Server application/service | Expand launch preset into member configs and create team run | `ensureTeamRunFromDefinition(...)` | definition + preset -> `{ teamRunId, runtimeMode }` | team definition service, runtime orchestrators, history service |
| `external-channel-setup/types.ts` | Modify | Server API | GraphQL setup contracts | `ExternalChannelTeamDefinitionOptionGql`, `ExternalChannelTeamLaunchPreset*` | GraphQL -> service | external-channel domain |
| `external-channel-setup/resolver.ts` | Modify | Server API | Setup mutation/query orchestration | `externalChannelTeamDefinitionOptions()`, `upsertExternalChannelBinding()` | GraphQL input -> binding service | team-definition option service, binding service |
| `channel-binding-runtime-launcher.ts` | Modify | Server runtime | Resolve or start AGENT/TEAM runs for a binding | `resolveOrStartAgentRun()`, `resolveOrStartTeamRun()` | binding -> run id | binding service, team launch service, history service |
| `default-channel-runtime-facade.ts` | Modify | Server runtime | External ingress routing | `dispatchToBinding()` | binding + envelope -> dispatch result | runtime launcher, continuation service |
| `team-run-mutation-service.ts` | Modify | Server API/service | Team GraphQL operations | `createAgentTeamRun()`, `sendMessageToTeam()` | GraphQL input -> service calls | reusable team-launch service |
| `ChannelBindingSetupCard.vue` and setup stores | Modify | Web UI/store | Target-type-specific binding form | component bindings/events | store state -> DOM | GraphQL setup queries/mutations |
| `WebSocketClient.ts` | Modify | Web infrastructure | Shared websocket reconnect policy | `connect()`, reconnect scheduling internals | close/error events -> retry scheduling | browser websocket API |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: responsibility is clear at view/component/store boundaries.
- Non-UI scope: responsibility is clear at file/module/service boundaries.
- Integration/infrastructure scope: each adapter/module owns one integration concern with clear contracts.
- Layering note: layering emerges from SoC plus the need to share team-launch orchestration cleanly across callers.
- Decoupling check: dependencies remain one-way and replaceable.
- Module/file placement check: no runtime code depends on GraphQL mutation services after extraction.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API | N/A | `externalChannelTeamDefinitionOptions` | Setup-specific and explicit | Mirrors `targetAgentDefinitionId` concept |
| API field | N/A | `targetTeamDefinitionId` | Natural setup-facing counterpart to agent definition field | Distinct from cached `teamRunId` |
| API field | N/A | `teamLaunchPreset` | Makes launch-time config explicit | Separate from agent `launchPreset` |
| Service | embedded launch helpers in GraphQL service | `TeamRunLaunchService` | Reusable team-run creation concern | Not GraphQL-specific |
| Method | N/A | `resolveOrStartTeamRun` | Mirrors agent runtime launcher method | External ingress use |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `ChannelBindingRuntimeLauncher` | Lazy-start runtimes for channel bindings | Yes | N/A | C-008 |
| `TeamRunMutationService` | GraphQL-facing team mutations | No, if it keeps all launch orchestration | Split | C-010 |
| `TeamRunContinuationService` | Restore or continue known team runs | Yes | N/A | C-009 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Web setup reusing raw team-definition store directly | Medium | Add setup-facing team-definition options query in external-channel setup boundary | Change | Keeps setup contract scoped and stable |
| Runtime reusing GraphQL mutation service for lazy-create | High | Extract reusable team-launch service | Change | Prevents boundary leakage |
| Persisting only `teamRunId` because it already exists | High | Add team-definition binding metadata and treat `teamRunId` as cache | Change | Matches product model |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Treating `TEAM` binding as fake agent binding with one synthetic coordinator agent | High | Explicit team-definition binding contract | Reject shortcut | Misrepresents the product model |
| Storing precomputed `memberConfigs[]` directly in binding to avoid a launch preset model | Medium | Persist a launch preset and expand at launch time | Reject shortcut | Keeps binding configuration human-readable and stable |
| Calling GraphQL service from runtime to create teams | High | Extract reusable launch service | Proper fix | Clean boundary |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `channel-binding-team-definition-options-service.ts` | `AgentTeamDefinitionService` | setup resolver | Low | One-way setup validation dependency |
| `team-run-launch-service.ts` | team definition service, runtime orchestrators, history service | runtime launcher, team-run mutation service | Medium | Keep launch-only scope; continuation remains elsewhere |
| `channel-binding-runtime-launcher.ts` | binding service, runtime composition, team launch service | runtime facade | Low | Centralize lazy-start policy |
| web messaging setup store | GraphQL/Apollo | component/composable layer | Low | Keep remote contract in one store |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Web UI -> Web stores/composables -> GraphQL setup boundary -> external-channel services/runtime -> team execution services -> team continuation/history/runtime adapters`.
- Temporary boundary violations and cleanup deadline: `None`.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| TEAM run selector from messaging setup | remove query, store state, validation, and UI copy for `targetTeamRunId` | Required to make TEAM definition-bound | component/store tests |
| GraphQL-only team lazy-create ownership | move shared launch logic into `TeamRunLaunchService` and delete duplication from mutation service | Required for clean reuse | unit tests + code review |
| run-bound team docs text | replace with definition-bound team docs | Required for product clarity | docs sync |

## Data Models (If Needed)

- Binding domain model adds:
  - `teamDefinitionId?: string | null`
  - `teamLaunchPreset?: ChannelBindingTeamLaunchPreset | null`
  - existing `teamRunId?: string | null` retained as cached runtime pointer
- Team launch preset DTO:
  - `workspaceRootPath`
  - `llmModelIdentifier`
  - `runtimeKind`
  - `autoExecuteTools`
  - `llmConfig`
- Setup team-definition option DTO:
  - `teamDefinitionId`
  - `teamDefinitionName`
  - `description`
  - `coordinatorMemberName`
  - `memberCount`
- Launch service expands `teamLaunchPreset` into leaf-agent `memberConfigs` by recursively walking the team definition tree.

## Error Handling And Edge Cases

- Reject `TEAM` upsert when `targetTeamDefinitionId` is missing.
- Reject `TEAM` upsert when the selected team definition does not exist.
- Reject `TEAM` upsert when `teamLaunchPreset` is incomplete.
- Clear cached `teamRunId` when the team definition or team launch preset changes.
- If cached `teamRunId` is missing from history at dispatch time, lazily create a fresh run instead of failing immediately.
- If recursive member-config expansion finds an agent member without required launch data, throw a deterministic launch error.
- Preserve external metadata on resumed or newly created member-runtime team messages so callback routing still resolves to the entry member response.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001 | Save or list `AGENT` binding without behavior change | Yes | N/A | Yes | `UC-001` |
| UC-002 | R-001, R-004 | Save `TEAM` binding from settings using team definition options | Yes | N/A | Yes | `UC-002` |
| UC-003 | R-003, R-007 | Coordinator-only external reply behavior remains single-stream | Yes | N/A | Yes | `UC-003` |
| UC-004 | R-000 | Verify and render saved bindings for both target types | Yes | N/A | Yes | `UC-004` |
| UC-005 | R-002, R-005 | First inbound message lazily creates a team run from definition and preset | Yes | Yes | Yes | `UC-005` |
| UC-006 | R-006 | Cached team run is reused or reset appropriately | Yes | Yes | Yes | `UC-006` |

## Performance / Security Considerations

- Team-definition option query reads definitions only and should remain small.
- Launch-preset expansion is bounded by the size of a single team-definition tree.
- No new external credentials or provider permissions are introduced.
- Cached `teamRunId` reuse avoids unnecessary team recreation on every inbound message.

## Migration / Rollout (If Needed)

- Prisma schema and file persistence shape must expand to store team-definition binding metadata.
- Existing branch-local run-bound TEAM binding code is replaced rather than retained.
- Existing AGENT bindings remain valid.
- Existing branch-local TEAM bindings are not treated as a compatibility target for the final design.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | Server unit + GraphQL e2e | Planned |
| C-002 | T-002, T-004 | Server unit + API e2e | Planned |
| C-003 | T-001, T-003 | Server unit | Planned |
| C-004 | T-001, T-003 | Provider tests + API e2e | Planned |
| C-005 | T-001, T-005 | GraphQL e2e + web unit | Planned |
| C-006 | T-001 | GraphQL e2e | Planned |
| C-007 | T-001, T-005 | GraphQL e2e + web unit | Planned |
| C-008 | T-003, T-004 | Runtime unit + API e2e | Planned |
| C-009 | T-004 | Runtime unit + API e2e | Planned |
| C-010 | T-002 | Server unit | Planned |
| C-011 | T-005, T-006 | Web unit/component tests | Planned |
| C-012 | T-006 | Web store/component tests | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | User scope expansion | Requirement Gap | Run-bound TEAM setup did not satisfy the direct team-definition product requirement | Yes | Yes | Closed |

## Open Questions

- For this round, no additional open questions block implementation.
- Member-specific launch overrides in messaging setup are deferred unless the implementation proves the shared/global preset is insufficient for basic viability.
