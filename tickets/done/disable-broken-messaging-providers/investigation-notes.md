# Investigation Notes

- Ticket: `disable-broken-messaging-providers`
- Date: `2026-06-06`

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Investigation complete; requirements/design refined after user scope clarification`
- Investigation Goal: Determine how Settings > Messaging obtains provider support/availability and design a clean disable path for currently non-working WhatsApp Business and WeCom providers without disabling the entire gateway or working providers.
- Scope Classification (`Small`/`Medium`/`Large`): `Small-to-Medium`
- Scope Classification Rationale: Correct behavior crosses backend managed-gateway status/runtime env, frontend capability derivation/provider rendering, tests, and docs/release metadata.
- Scope Summary: Hide/remove WhatsApp Business and WeCom from Settings > Messaging provider choices; preserve gateway lifecycle controls and Discord/Telegram provider flows. No cleanup, migration, or stale-config runtime-defense work is required.
- Primary Questions Resolved:
  - Provider cards are rendered by `ProviderSetupScopeCard.vue` from `useMessagingProviderScopeStore.options`.
  - Provider scope options are initialized from `useGatewayCapabilityStore.loadCapabilities()`.
  - Gateway capabilities are currently derived from `managedStatus.supportedProviders` and ignore `managedStatus.excludedProviders`.
  - Backend managed-gateway status currently hardcodes supported/excluded provider lists and excludes only `WECHAT`.
  - The existing `Disable` UI action is gateway-wide and already exists; provider-specific disablement should not repurpose it.

## Request Context

User provided a screenshot of the app Settings > Messaging page and reported that WhatsApp Business and WeCom are currently not working. They asked whether these can be disabled or simply disabled. The screenshot shows:

- Managed Messaging Gateway status: `RUNNING`
- Runtime endpoint: `127.0.0.1:8010`
- Supported providers: `WHATSAPP, WECOM, DISCORD, TELEGRAM`
- Excluded providers: `WECHAT`
- Provider cards: `WhatsApp Business`, `WeCom App`, `Discord Bot`, `Telegram Bot`
- Top-level gateway actions: `Restart Gateway`, `Refresh Status`, `Update Runtime`, `Disable`

Reference image path: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_4f0efd24/solution_designer_03818722893a1a32/context_files/ctx_7e9d90736d1e__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers/tickets/in-progress/disable-broken-messaging-providers`
- Current Branch: `codex/disable-broken-messaging-providers`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on `2026-06-06`
- Task Branch: `codex/disable-broken-messaging-providers`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: Work must remain in the dedicated task worktree/branch, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref --short refs/remotes/origin/HEAD` | Bootstrap environment discovery | Original checkout is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` on branch `personal`, tracking `origin/personal`. | No |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Succeeded. | No |
| 2026-06-06 | Command | `git worktree add -b codex/disable-broken-messaging-providers /Users/normy/autobyteus_org/autobyteus-worktrees/disable-broken-messaging-providers origin/personal` | Create dedicated ticket worktree/branch | Succeeded; branch tracks `origin/personal`; HEAD `74c0fd59 chore(release): bump workspace release version to 1.3.44`. | No |
| 2026-06-06 | Other | User screenshot reference image | Understand visible current behavior | Messaging page presents WhatsApp Business and WeCom as selectable provider cards while user reports they are not working; gateway already has a top-level `Disable` action. | No |
| 2026-06-06 | Command | `rg -n "Managed Messaging Gateway|WhatsApp Business|WeCom App|supportedProviders|excludedProviders|WHATSAPP|WECOM" autobyteus-web autobyteus-server-ts` | Locate affected source paths | Found frontend messaging setup components/stores and backend managed gateway service/types. | No |
| 2026-06-06 | Code | `autobyteus-web/components/settings/MessagingSetupManager.vue` | Identify page composition | Page renders `ManagedGatewayRuntimeCard`, `ProviderSetupScopeCard`, `GatewayConnectionCard`, then provider-specific setup flow. Non-Discord/WeCom/WeChat falls through to `WhatsAppSetupFlow`. | Yes: implementation should avoid default unavailable selection/fallthrough. |
| 2026-06-06 | Code | `autobyteus-web/components/settings/messaging/ProviderSetupScopeCard.vue` | Identify provider cards | Cards are rendered with `v-for="option in providerScopeStore.options"`; click calls `providerScopeStore.setSelectedProvider(option.provider)`. | No |
| 2026-06-06 | Code | `autobyteus-web/stores/messagingProviderScopeStore.ts` | Identify provider-option owner | `resolveAvailableProviders()` builds options from `GatewayCapabilitiesModel`; initial state is `selectedProvider: 'WHATSAPP'`, `availableProviders: ['WHATSAPP']`; `setSelectedProvider` refuses providers not in `availableProviders`. | Yes: initial state can transiently show WhatsApp before bootstrap; should be corrected. |
| 2026-06-06 | Code | `autobyteus-web/stores/gatewayCapabilityStore.ts` | Identify gateway-to-provider capability mapping | `loadCapabilities()` reads `managedStatus.supportedProviders` and maps membership to `whatsappBusinessEnabled`, `wecomAppEnabled`, `discordEnabled`, `telegramEnabled`; it ignores `excludedProviders`. | Yes: use active provider set = supported - excluded. |
| 2026-06-06 | Code | `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue` | Identify provider config behavior | Selected provider controls provider config form; excluded providers are only displayed as text, not used to block config. Save path always includes full provider config. | Yes: provider-specific config card should only render for initialized/active selected providers. |
| 2026-06-06 | Code | `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue` | Identify whole-gateway lifecycle action | `Disable` button calls `gatewayStore.disableManagedGateway()` and is gateway-wide; supported/excluded labels are shown from managed status. | No: preserve behavior. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts` | Identify backend provider constants/default config | `MANAGED_MESSAGING_SUPPORTED_PROVIDERS` includes `WHATSAPP`, `WECOM`, `DISCORD`, `TELEGRAM`; `MANAGED_MESSAGING_EXCLUDED_PROVIDERS` is `['WECHAT']`; default/normalized config force non-WeChat provider enable flags true. | Yes: update canonical availability/exclusion. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Identify status owner | `getStatus()` returns static supported/excluded constants and provider statuses from `buildManagedMessagingProviderStatuses(providerConfig)`. | Yes: status should return WhatsApp/WECOM exclusions and provider statuses should enforce them. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | Identify API boundary | GraphQL status exposes existing fields `supportedProviders`, `excludedProviders`, and `providerStatusByProvider`; no schema change is necessary. | No |
| 2026-06-06 | Code | `autobyteus-message-gateway/scripts/release-manifest.mjs` | Identify release metadata source | Generated release manifest currently emits `supportedProviders: [WHATSAPP,WECOM,DISCORD,TELEGRAM]` and `excludedProviders: [WECHAT]`. | Yes: update to prevent metadata drift. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` | Identify checked-in default manifest | Default manifest for `v1.3.44` mirrors generated provider lists and excludes only `WECHAT`. | Yes: update metadata. |
| 2026-06-06 | Code | `autobyteus-server-ts/src/external-channel/services/channel-binding-constraint-service.ts` | Determine whether domain support should be removed | External-channel binding constraints accept several pairs including `WHATSAPP:BUSINESS_API`, `WHATSAPP:PERSONAL_SESSION`, `WECOM:BUSINESS_API`, `WECHAT:PERSONAL_SESSION`, `DISCORD:BUSINESS_API`, `TELEGRAM:BUSINESS_API`. | No: generic domain compatibility is out of scope; do not remove enums/pairs unless product asks. |
| 2026-06-06 | Code | Frontend/backend messaging unit tests under `autobyteus-web/stores/__tests__`, `autobyteus-web/components/settings/**/__tests__`, `autobyteus-server-ts/tests/unit/managed-capabilities/messaging-gateway` | Identify likely validation surfaces | Existing tests model provider capabilities, provider scope initialization, gateway status normalization, runtime card rendering, and runtime env callbacks. | Yes: add/update targeted tests. |
| 2026-06-06 | Other | User scope clarification after initial design | Clarify whether runtime-level defensive disablement is required | User said Messaging settings itself remains useful, but users should not see WhatsApp/WeCom; no extra defensive programs are needed because no one has used/configured those providers. | Update requirements/design and resend review package |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Settings > Messaging (`MessagingSetupManager.vue`).
- Current execution flow:
  1. `MessagingSetupManager.vue` mounts and calls `useMessagingSetupBootstrap()`.
  2. Bootstrap calls `gatewayStore.refreshManagedGatewayStatus()` to query `managedMessagingGatewayStatus`.
  3. Bootstrap calls `capabilityStore.loadCapabilities()`.
  4. `gatewayCapabilityStore.loadCapabilities()` reads `managedStatus.supportedProviders` and maps provider membership into `GatewayCapabilitiesModel` booleans.
  5. `providerScopeStore.initialize(capabilities)` maps those booleans into `availableProviders`.
  6. `ProviderSetupScopeCard.vue` renders a button/card per `providerScopeStore.options`.
  7. `GatewayConnectionCard.vue` and provider-specific setup flow render based on `providerScopeStore.selectedProvider`.
- Backend status flow:
  1. GraphQL resolver `managedMessagingGatewayStatus()` calls `ManagedMessagingGatewayService.getStatus()`.
  2. Service reads state/config, reconciles runtime, builds provider statuses with `buildManagedMessagingProviderStatuses(providerConfig)`, and returns supported/excluded provider constants.
  3. GraphQL maps `providerStatuses` into `providerStatusByProvider` JSON.
- Runtime enablement flow:
  - Out of scope after user clarification; no stale-config runtime-defense requirement because these providers have not been used/configured.
- Ownership or boundary observations:
  - Backend managed-gateway status is the correct authoritative boundary for provider availability.
  - Frontend should consume backend status and not hardcode its own availability decisions beyond derived presentation.
  - External-channel binding constraints are a broader domain compatibility boundary and should not be used as the Settings provider availability owner.
- Current behavior summary: WhatsApp and WeCom are considered supported, not excluded, available in the provider scope card, selectable, and configurable.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor posture evidence summary: Narrow refactor required: provider availability/exclusion should be reflected in managed-gateway status/metadata and consumed by frontend capability derivation. User clarified there is no need for cleanup, migration, or stale-config runtime-defense work.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `gatewayCapabilityStore.ts` | Uses `supportedProviders` only and ignores `excludedProviders`. | Missing invariant: excluded providers are not removed from selectable capabilities. | Update active-provider derivation. |
| `types.ts` + `managed-messaging-gateway-service.ts` | Backend static exclusion list excludes only `WECHAT`. | Need current distribution availability source to exclude WhatsApp/WECOM. | Update provider availability/exclusion source. |
| `messagingProviderScopeStore.ts` | Initial state defaults to `WHATSAPP` before bootstrap. | UI can briefly present a now-unavailable provider; selected provider should be bootstrap-safe. | Initialize empty/safe and gate rendering. |
| `ManagedGatewayRuntimeCard.vue` | `Disable` button already disables the whole gateway. | No new gateway-disable mechanism required; preserve action semantics. | Regression test/action mapping. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts` | Managed messaging provider constants, persisted state/config types/defaults/normalizers | Supported/excluded provider constants live here; non-WeChat provider enable flags normalize true. | Add/adjust provider availability source; keep config fields but ensure availability controls effective enablement. |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Authoritative managed gateway lifecycle/status service | `getStatus()` returns supported/excluded lists and provider statuses. | Service should expose updated exclusion status and provider statuses derived from availability. |
| `autobyteus-server-ts/src/api/graphql/types/managed-messaging-gateway.ts` | GraphQL managed gateway API boundary | Existing schema already returns needed fields. | No schema change expected; status field values change. |
| `autobyteus-message-gateway/scripts/release-manifest.mjs` | Build-time release manifest metadata | Emits WhatsApp/WeCom as supported and only WeChat excluded. | Update metadata to match default availability. |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` | Checked-in default release manifest | Mirrors old provider metadata. | Update default manifest. |
| `autobyteus-web/stores/gatewayCapabilityStore.ts` | Frontend mapping from managed gateway status to provider capability model | Ignores `excludedProviders`. | Compute active provider set from `supportedProviders - excludedProviders`. |
| `autobyteus-web/stores/messagingProviderScopeStore.ts` | Owns selected/available messaging provider scope | Defaults to WhatsApp and turns capabilities into provider options. | Prevent unavailable default selection; preserve safe selection fallback among active providers. |
| `autobyteus-web/components/settings/MessagingSetupManager.vue` | Settings messaging page composition | Renders provider-dependent cards/flows unconditionally; non-special provider falls to WhatsApp. | Gate provider-dependent cards/flows on initialized active provider availability. |
| `autobyteus-web/components/settings/messaging/ProviderSetupScopeCard.vue` | Provider card list rendering | Renders whatever `options` returns. | Should require no provider-specific hardcode beyond active options and empty state if no providers. |
| `autobyteus-web/components/settings/messaging/GatewayConnectionCard.vue` | Selected-provider config card | Renders config form based on selected provider. | Should only receive active/initialized selected provider. |
| `autobyteus-web/components/settings/messaging/ManagedGatewayRuntimeCard.vue` | Gateway lifecycle/status card | Whole-gateway disable already exists. | Preserve action semantics and labels. |
| `autobyteus-server-ts/src/external-channel/services/channel-binding-constraint-service.ts` | External-channel binding compatibility | Accepts several provider/transport pairs including WhatsApp and WeCom. | Out of scope; provider availability is not the same as domain compatibility. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Setup | Dedicated worktree creation | Worktree ready for investigation artifacts and downstream implementation. | No bootstrap blocker. |
| 2026-06-06 | Source trace | Static source read across Settings > Messaging and managed gateway service | Current source path explains screenshot: status reports WhatsApp/WeCom supported and frontend maps supported provider membership directly to cards. | Root cause has high confidence without needing a live repro run. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `None used`
- Version / tag / commit / freshness: `N/A`
- Relevant contract, behavior, or constraint learned: `N/A`
- Why it matters: task is local repository behavior; no external standard lookup required.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: For implementation validation, targeted unit/component tests should be enough for provider availability derivation; an optional browser check can verify the Settings page if local app startup is already available.
- Required config, feature flags, env vars, or accounts: No provider accounts should be required; stale-config runtime env behavior can be tested with synthetic config.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: None yet.

## Findings From Code / Docs / Data / Logs

1. The app already has a concept of excluded providers, but the frontend provider-card path does not consume it.
2. The backend exposes `excludedProviders` but currently excludes only `WECHAT`, so WhatsApp/WeCom are advertised to the UI as normal choices.
3. The existing whole-gateway disable control is functional by design and must stay separate from provider-specific unavailability.
4. The desired current behavior is to hide WhatsApp/WeCom from selectable provider cards and keep any exclusion/status messaging lightweight.
5. Removing external-channel provider enum support or accepted provider/transport pairs would be broader and unnecessary for this user request.

## Constraints / Dependencies / Compatibility Facts

- No GraphQL schema change should be necessary; field semantics change only.
- User clarified no existing WhatsApp/WeCom configs need migration or defensive handling.
- Release metadata generation must be updated to avoid reintroducing old provider lists during future release-manifest sync.
- Existing tests that are about generic external-channel parsing/compatibility should not be rewritten to remove WhatsApp/WeCom domain support.

## Open Unknowns / Risks

- Whether product wants disabled cards with explanatory copy instead of hidden cards. This design selects hidden cards plus gateway status exclusion list because the existing UI already models excluded providers as not part of provider setup.
- How future re-enablement of WhatsApp/WeCom should be governed. This is intentionally out of scope and should be a future product-ready-provider ticket.
- Some docs may describe WhatsApp/WeCom setup in detail; delivery must update or mark no-impact based on final integrated state.

## Notes For Architect Reviewer

- Key design point: avoid a component-only filter that leaves backend status advertising WhatsApp/WeCom as default choices. However, do not add cleanup/migration/stale-config defensive programs because the clarified goal is simple user-visible hiding.
- Keep external-channel domain compatibility out of scope; managed-gateway provider availability is a narrower product/distribution capability.
- The design should include a small refactor/centralization of provider availability so `supportedProviders`, `excludedProviders`, provider statuses, and env flags cannot drift.
