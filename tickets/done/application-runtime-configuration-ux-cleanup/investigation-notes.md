# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Deep source investigation complete; requirements basis approved by user; design spec revised after architecture review round 1 and pending re-review.
- Investigation Goal: Determine how the current Applications catalog, application setup/entry shell, and immersive control configuration are implemented; identify the exact UX and architecture problems behind the user's complaint; and define the design-ready requirement basis for a user-centered cleanup.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The visible UX issue is localized to imported applications, but the clean fix spans frontend cards/shell/forms, shared launch-config building blocks, application REST + SDK contracts, sample app launch usage, tests, and stale localization cleanup.
- Scope Summary: Reduce internal metadata exposure, improve application resource/workspace configuration UX by reusing stronger agent/team run-config patterns, preserve mixed-team launch behavior for app-owned runs, and remove touched dead/duplicate code.
- Primary Questions To Resolve:
  1. Which components currently render package / bundle / local application ID metadata on the catalog card and application page?
  2. How is the application launch setup form composed today, and why does it not match the stronger agent / team configuration UX?
  3. How does the immersive control panel reuse or duplicate setup/details behavior after entry?
  4. What shared run-config components already solve the runtime/model/workspace/member-override UX problems?
  5. Can the current application launch-default persistence contract preserve mixed-runtime team configuration, or is it lossy?
  6. Which stale helpers, localization keys, or architecture leftovers should be cleaned up in the touched area?

## Request Context

- User feedback: the Applications catalog card and the application entry/setup page show long platform-internal strings such as package IDs, bundle resources, and other internal metadata that normal users do not care about.
- User expectation: the default UX should emphasize application name, description, purpose, and possibly the supported agent or agent-team information.
- User feedback: the application resource configuration UX is worse than the existing agent / agent-team run configuration UX, especially for mixed-runtime team configuration and workspace selection.
- User feedback: the same weak configuration UX also appears when reopening controls/configuration from inside the application after entering it.
- User request: while investigating the source, also look for redundant code, dead code, obsolete code, or architecture issues created by previous refactors.
- User clarification: this is a new ticket; earlier application UX tickets can be consulted as background only and must not redefine scope.
- User approval/caution: the user approved the refined requirements on 2026-04-24 and explicitly warned that shared-config reuse must not break existing standalone agent run or agent-team run forms, citing a previous regression where runtime fields disappeared.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup/tickets/in-progress/application-runtime-configuration-ux-cleanup`
- Current Branch: `codex/application-runtime-configuration-ux-cleanup`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed without reported errors on 2026-04-24.
- Task Branch: `codex/application-runtime-configuration-ux-cleanup`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Prior tickets around application immersive mode, launch setup, and package UX cleanup are useful background only. This ticket must stay grounded in current code and the current user complaint.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-24 | Command | `git rev-parse --show-toplevel && git branch --show-current && git status --short && git worktree list` | Bootstrap workspace/repo context | Shared checkout was on `personal`; dedicated task worktree did not yet exist. | No |
| 2026-04-24 | Command | `git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Resolve base branch | `origin/HEAD` points to `origin/personal`. | No |
| 2026-04-24 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task worktree creation | Fetch completed without reported errors. | No |
| 2026-04-24 | Setup | `git worktree add -b codex/application-runtime-configuration-ux-cleanup /Users/normy/autobyteus_org/autobyteus-worktrees/application-runtime-configuration-ux-cleanup origin/personal` | Create dedicated task worktree/branch | Dedicated worktree created successfully from `origin/personal`. | No |
| 2026-04-24 | Doc | `.../solution-designer/design-principles.md`; solution-designer templates | Load required design workflow and artifact expectations | Confirmed mandatory bootstrap, requirements approval, and design-artifact workflow. | No |
| 2026-04-24 | Doc | `tickets/done/application-launch-setup-immersive-flow/*.md`; `tickets/done/application-package-ux-cleanup/*.md` | Review nearby historical work without treating it as scope authority | Prior work already introduced setup-first route flow and some package UX cleanup, but current implementation still leaks internal metadata and duplicates weak config UX. | No |
| 2026-04-24 | Code | `autobyteus-web/pages/applications/index.vue`; `autobyteus-web/components/applications/ApplicationCard.vue` | Inspect catalog entrypoint and card rendering | Catalog card still renders `application.packageId` directly on the primary card; setup summary is already business-facing. | No |
| 2026-04-24 | Code | `autobyteus-web/components/applications/ApplicationShell.vue`; `ApplicationImmersiveControlPanel.vue` | Inspect setup-phase hero/details and immersive post-entry control flow | Default detail items still render `packageId`, `localApplicationId`, raw bundle resource mappings, and `writable`; same detail block leaks into immersive control panel. | No |
| 2026-04-24 | Code | `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue`; `ApplicationLaunchDefaultsFields.vue`; `autobyteus-web/utils/application/applicationLaunchSetup.ts` | Inspect application setup composition, persistence, and gate/readiness logic | Application setup uses app-specific flat draft/persistence helpers, raw workspace path text input, and simpler gate logic that cannot model mixed team overrides or unresolved member models. | No |
| 2026-04-24 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue`; `AgentRunConfigForm.vue`; `WorkspaceSelector.vue`; `MemberOverrideItem.vue`; `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`; `DefinitionLaunchPreferencesSection.vue`; `autobyteus-web/utils/teamRunLaunchReadiness.ts`; `autobyteus-web/utils/teamRunMemberConfigBuilder.ts`; `autobyteus-web/utils/teamRunConfigUtils.ts` | Find stronger shared UX and existing readiness/build logic worth reusing | Shared agent/team run-config flows already support runtime/model reuse, workspace selection, team member overrides, mixed-runtime validation, and team member config building. Application setup duplicates a weaker version instead of reusing these owners. | No |
| 2026-04-24 | Code | `autobyteus-web/stores/applicationStore.ts`; `autobyteus-web/graphql/queries/applicationQueries.ts`; `autobyteus-web/components/applications/ApplicationSurface.vue` | Understand current application data contract and whether internal metadata is still needed elsewhere | Store/query expose internal fields (`packageId`, `localApplicationId`, `writable`, `bundleResources`) even to catalog consumers. `ApplicationSurface.vue` still needs `packageId` and `localApplicationId` for iframe bootstrap payload, so these identifiers cannot simply disappear from the whole model; they must disappear from the default UX surface. | No |
| 2026-04-24 | Code | `autobyteus-server-ts/src/api/graphql/types/application.ts`; `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`; `autobyteus-server-ts/src/application-bundles/domain/models.ts` | Trace where application GraphQL data comes from | Current GraphQL `Application` type is an internal-heavy shape reused for both catalog and detail fetches; bundle domain model also includes internal identifiers needed for host/bootstrap, not necessarily for display. | Yes |
| 2026-04-24 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | Inspect available-resource summaries for application setup | Bundle resources are labeled with `name: resource.localId`, which explains why bundled resource selectors show technical IDs instead of display names. | No |
| 2026-04-24 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts`; `.../stores/application-resource-configuration-store.ts`; `.../src/api/rest/application-backends.ts`; `autobyteus-application-sdk-contracts/src/runtime-resources.ts`; `autobyteus-server-ts/tests/unit/application-orchestration/application-resource-configuration-service.test.ts` | Inspect persistence contract, REST shape, and validation rules | Persisted application config currently stores only `resourceRef` plus flat launch defaults (`runtimeKind`, `llmModelIdentifier`, `workspaceRootPath`, `autoExecuteTools`). This path is validated well, but it cannot represent team member overrides or mixed-runtime config. | No |
| 2026-04-24 | Code | `autobyteus-application-sdk-contracts/src/index.ts`; `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`; `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Verify whether downstream run launching already supports richer team config | Application runtime launch already supports `mode: "memberConfigs"` with explicit `ApplicationTeamMemberLaunchConfig[]`, but host-managed saved setup does not preserve enough information to drive that mode. `buildMemberConfigsFromLaunchPreset()` flattens one preset over every member. | No |
| 2026-04-24 | Code | `applications/brief-studio/application.json`; `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | Verify how a real imported app consumes configured resources today | Brief Studio slot supports runtime/model/workspace defaults, but the backend normalizes only the flat defaults and always launches the drafting team with `mode: "preset"`, so any future mixed-runtime config would currently be lost. | Yes |
| 2026-04-24 | Code | `autobyteus-web/localization/messages/en/applications.ts`; `autobyteus-web/localization/messages/zh-CN/applications.ts`; `autobyteus-web/localization/messages/en/applications.generated.ts`; `autobyteus-web/localization/messages/zh-CN/applications.generated.ts`; `rg -n "ApplicationLaunchConfigModal|launchAgain|stopSession|sessionLabel|bindingResultLabel|runtimeTargetId|runIdLabel|requestedSessionReattachedNotice|requestedSessionMissingNotice" ...` | Find stale or dead application UX artifacts left from old flows | Localization still contains many keys for removed `ApplicationLaunchConfigModal` and old session-era application shell behavior that no live component uses. | No |
| 2026-04-24 | Doc | `autobyteus-web/docs/applications.md` | Compare intended application UX docs vs current implementation | Documentation already says catalog cards should describe setup requirements in business-facing language rather than leaking raw runtime-resource IDs, but current UI still leaks internal metadata and uses a weaker duplicated config path. | No |
| 2026-04-24 | Repro | User-provided screenshots and narrative | Confirm real user-visible behavior | Screenshots match code findings: package/internal metadata is prominent on the card and setup page; workspace config is a raw string field; in-app control configuration inherits the same weak UX. | No |
| 2026-04-24 | Doc / Code | `design-review-report.md`; re-opened `autobyteus-application-sdk-contracts/src/manifests.ts`, `autobyteus-application-sdk-contracts/src/runtime-resources.ts`, `autobyteus-application-sdk-contracts/src/index.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts`, `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`, `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Address architecture review findings DI-APP-001 and DI-APP-002 with exact schema and recoverable invalid-state behavior | Tightened the target design around a kind-keyed `supportedLaunchConfig`, an exact `launchProfile` union with canonical team-member identity tuple `(memberRouteKey, agentDefinitionId)`, and a slot-local invalid-state view contract so stale profiles do not collapse the whole setup panel into `loadError`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - `/applications` loads `pages/applications/index.vue`, which renders `ApplicationCard.vue` for each catalog entry from `applicationStore`.
- Current execution flow:
  1. `applicationStore` queries GraphQL `ApplicationFields`, which includes both business-facing fields and internal identifiers.
  2. `ApplicationCard.vue` renders name/description plus a secondary metadata row containing `packageId` and a setup summary.
  3. Selecting a card navigates to `ApplicationShell.vue`, which starts in a setup phase.
  4. `ApplicationShell.vue` renders a setup hero with user-facing name/description but also a details card containing internal metadata (`packageId`, `localApplicationId`, raw bundle resource mapping, `writable`).
  5. `ApplicationLaunchSetupPanel.vue` loads saved slot config and available resources over REST, owns per-slot drafts, and delegates slot default editing to `ApplicationLaunchDefaultsFields.vue`.
  6. `ApplicationLaunchDefaultsFields.vue` exposes a locked-on tool execution note, duplicated runtime selector, duplicated model selector, and a raw text input for `workspaceRootPath`.
  7. `buildLaunchSetupGateState()` blocks entry while loading/saving/error/dirty/missing resource/missing model, but does not understand team member override readiness or mixed-runtime incompatibilities.
  8. After entry, `ApplicationImmersiveControlPanel.vue` reuses the same details block and the same `ApplicationLaunchSetupPanel.vue`, so the internal metadata leak and weak config UX continue inside the app.
- Ownership or boundary observations:
  - `ApplicationLaunchSetupPanel.vue` is the authoritative UI owner for application setup across setup-phase and immersive configure panel, which is good and should be preserved.
  - `ApplicationLaunchDefaultsFields.vue` is a duplicated app-specific defaults editor that overlaps with shared runtime/model/workspace owners.
  - `ApplicationResourceConfigurationService` is the authoritative persistence/validation owner for host-managed application slot config, but its launch-default shape is too generic/flat for team member overrides.
  - `ApplicationRunBindingLaunchService` and `TeamRunService` already know how to launch richer team member configs, so the main architecture gap is upstream persistence and UI modeling, not downstream runtime capability.
- Current behavior summary:
  - The host already has the right high-level flow (setup first, explicit entry, one reused setup panel), but the information hierarchy and configuration model are still shaped around internal platform details and a flattened launch-default contract.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/pages/applications/index.vue` | Catalog page entrypoint | Simply renders card grid and refresh behavior. | Card redesign can stay localized if store/query shape remains compatible. |
| `autobyteus-web/components/applications/ApplicationCard.vue` | Primary application card UI | Shows `packageId` directly on the card. | Card should become summary-first and drop internal metadata from default view. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Setup-phase hero, pre-entry gate, immersive shell composition | Computes `detailItems` from internal metadata and reuses them in immersive details. | Need a new user-facing summary/details model and likely a separate explicit diagnostics owner if internal data must remain reachable. |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | Immersive host chrome and disclosure panel | Panel shell itself is fine; problem comes from the reused details/configure content. | Fix underlying detail/setup owners rather than redesigning the panel shell. |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Authoritative application setup load/save/reset UI | Good single-owner reuse across setup and immersive phases, but uses generic per-slot drafts and weak readiness semantics. | Keep it as the shell/orchestrator owner, but replace/upgrade the editor and draft/readiness model underneath. |
| `autobyteus-web/components/applications/ApplicationLaunchDefaultsFields.vue` | App-specific launch-default field editor | Duplicates runtime/model/workspace controls and only supports flat defaults. | Strong candidate for replacement with shared primitives and resource-kind-aware editors. |
| `autobyteus-web/utils/application/applicationLaunchSetup.ts` | Slot draft helpers, summaries, save payload building, gate/readiness logic | Flat `SlotDraft`, flat `ApplicationConfiguredLaunchDefaults`, no team-member modeling, no team readiness evaluation. | Needs redesign into richer resource-kind-aware draft/model helpers. |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Strong team config UX | Already supports global runtime/model, workspace selection, and member overrides. | Reference owner/pattern for application team slot UX. |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Strong agent config UX | Already reuses shared runtime/model/workspace selectors. | Reference owner/pattern for application agent slot UX. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Shared runtime/model/config selector | Centralizes runtime/model/config behavior already used elsewhere. | Application flow should reuse/extend this rather than duplicating it. |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Workspace selection UX | Good existing/new/browse/manual-path interaction model, but returns workspace IDs. | Useful pattern to adapt into a workspace-root-path selector for applications. |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Per-member team override UX | Already solves mixed-runtime model-compatibility UX. | Candidate for reuse in application team slot editor. |
| `autobyteus-web/utils/teamRunLaunchReadiness.ts` | Team mixed-runtime readiness logic | Detects unresolved inherited models and runtime catalog problems. | Candidate to power application setup gating for team-backed slots. |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Builds explicit team member configs | Converts team config + members into launch-ready member configs. | Strong reuse candidate if application slot drafts adopt a team-config-compatible shape. |
| `autobyteus-web/stores/applicationStore.ts` / `graphql/queries/applicationQueries.ts` | Frontend application data contract | Catalog/detail queries expose internal fields to all consumers. | May need thinner user-facing projection or separate summary/detail shapes. |
| `autobyteus-server-ts/src/api/graphql/types/application.ts` | Server GraphQL application type | One GraphQL type mixes public app summary and internal metadata. | GraphQL contract may need separation or reduced default exposure. |
| `autobyteus-server-ts/src/application-orchestration/services/application-runtime-resource-resolver.ts` | Available-resource summary builder | Bundle resource summary `name` is just `localId`. | Must resolve friendly names from the underlying definition or bundle metadata. |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | Persistence/validation owner for slot config | Validates well but only persists flat launch defaults. | Likely owner for richer per-slot persisted launch profile. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | SQLite persistence for slot config | Persists `launch_defaults_json` blob per slot. | Storage is flexible enough for a richer JSON shape if contract changes. |
| `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | Shared application runtime-resource config contract | Flat `ApplicationConfiguredLaunchDefaults` shape cannot encode team member overrides. | Shared contract evolution likely required. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Starts agent/team run bindings for apps | Already supports `mode: "memberConfigs"`. | Downstream launch path can already consume richer team config once upstream setup preserves it. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Builds preset-based or explicit team runs | `buildMemberConfigsFromLaunchPreset()` intentionally fans one preset to all members. | Flattening is expected for preset mode; application setup must not rely on preset mode when user configured a mixed team. |
| `applications/brief-studio/backend-src/services/brief-run-launch-service.ts` | Real imported app runtime-launch usage | Reads `getConfiguredResource()` but normalizes only flat defaults and launches with `mode: "preset"`. | Sample app must participate if the ticket preserves mixed-runtime team config end to end. |
| `autobyteus-web/localization/messages/en/applications.ts`; `.../zh-CN/...`; generated counterparts | Application localization | Contains stale keys for removed launch modal/session flows. | Touched cleanup should remove obsolete keys and reduce localization drift. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-24 | Repro | User-provided screenshots and narrative | Catalog card shows `PACKAGE`; setup hero/details show `PACKAGE`, `LOCAL APPLICATION ID`, raw `BUNDLE RESOURCES`, and `WRITABLE SOURCE`; setup form shows raw workspace string field; immersive screen includes a control button that reopens the same setup pattern. | Confirms the reported UX problem is user-visible and not just an implementation smell. |
| 2026-04-24 | Probe | `rg -n "ApplicationLaunchConfigModal|launchAgain|stopSession|sessionLabel|bindingResultLabel|runtimeTargetId|runIdLabel|requestedSessionReattachedNotice|requestedSessionMissingNotice" autobyteus-web/...` | Search found localization keys for removed application launch modal and old session-oriented shell behavior without matching live component owners. | Supports dead-code / stale-localization cleanup in the touched area. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: This investigation remained repo-local; the key contracts are owned in this repo (`autobyteus-application-sdk-contracts`, server REST/GraphQL types, frontend components).
- Why it matters: No external dependency forced the current UX shape; the cleanup can be designed around local code ownership and existing local runtime capabilities.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None required for initial source investigation; user screenshots plus code/test review were sufficient to establish the issue and architecture gap.
- Required config, feature flags, env vars, or accounts: None for this investigation phase.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/application-runtime-configuration-ux-cleanup ... origin/personal`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

- The current application flow already has one strong structural decision worth preserving: one authoritative setup panel reused before entry and from inside the immersive control panel.
- The default information hierarchy is wrong for end users because primary application surfaces directly surface host/bootstrap/package identifiers.
- There is an architecture mismatch between application setup and the stronger native run-config UX: applications built a parallel flat form stack instead of reusing shared runtime/model/workspace/team-override owners.
- The current application setup persistence is the real architecture blocker for mixed-runtime teams. UI parity alone is insufficient because the saved application config cannot preserve the richer team shape.
- Downstream runtime launch already supports explicit per-member configs, so the missing capability is upstream modeling/persistence, not runtime execution.
- Bundle resource naming is currently too technical because available-resource summaries are derived from bundle `localId` instead of resolved agent/team definition names.
- Documentation intent and current implementation are already drifting apart: docs describe business-facing setup summary, but code still leaks internal identifiers.
- Localization drift confirms previous refactors left stale application UX artifacts behind.

## Constraints / Dependencies / Compatibility Facts

- `ApplicationSurface.vue` still needs `packageId` and `localApplicationId` for the iframe bootstrap envelope, so internal identifiers remain part of transport/bootstrap state even if they should disappear from the user-facing default surfaces.
- `ApplicationResourceConfigurationStore` already stores JSON blobs per slot, so richer persisted launch data is feasible without changing the overall persistence mechanism.
- `ApplicationRunBindingLaunchService` already supports explicit team member configs, which reduces implementation risk for the runtime side of a richer application team setup model.
- Shared run-config utilities/components already exist for runtime/model selection, workspace selection, team overrides, readiness evaluation, and member-config building; reuse is a dependency for a clean implementation.
- Brief Studio currently consumes only flat defaults and preset launch mode, so preserving mixed-runtime team config end to end likely requires sample-app-side launch consumption updates in addition to host UX work.

## Open Unknowns / Risks

- Need design-level decision on whether debug metadata remains available behind an explicit diagnostics drawer/section or is removed entirely from the application shell.
- Need design-level decision on the cleanest contract evolution for application team launch configuration so saved mixed-runtime state can round-trip through host setup and be consumed by app backends.
- Need to avoid over-coupling the application UX to standalone run-config stores or form wrappers that assume workspace IDs or run-entity ownership not present in app-managed setup, because the user explicitly reported a past sharing regression that removed runtime fields from normal agent/team forms.
- Schema/query changes to reduce internal metadata leakage may trigger generated GraphQL refreshes and snapshot/spec updates.

## Notes For Architect Reviewer

- The final design should explicitly distinguish between internal identifiers that remain necessary for iframe/bootstrap transport and the user-facing information hierarchy that should no longer expose those identifiers by default.
- The most important architecture decision is not cosmetic; it is how to replace the flat application launch-default model with a resource-kind-aware model that preserves team mixed-runtime/member-override state while still fitting the application runtime-control boundary cleanly.
- The application setup panel should remain the single reusable owner across setup and immersive configure surfaces; the cleanup should replace the underlying draft/editor/readiness model rather than reintroducing multiple setup implementations.
