# Requirements Doc

- Ticket: `disable-broken-messaging-providers`
- Status: `Refined`
- Last Updated: `2026-06-06`

## Goal / Problem Statement

The Settings > Messaging page presents WhatsApp Business and WeCom App as provider choices even though the current product direction is that users should not see or use those messaging providers. Hide/remove WhatsApp Business and WeCom App from the normal Messaging setup UI, while keeping the Messaging section itself and the currently useful provider choices available.

The clarified user intent is intentionally simple: this is not a request for migration, cleanup, defensive stale-config handling, or a broad messaging redesign. No one has used these providers yet, so the goal is to stop showing WhatsApp/WeCom to ordinary users now.

## Investigation Findings

- The reference image shows the managed gateway running with `supportedProviders = WHATSAPP, WECOM, DISCORD, TELEGRAM`, `excludedProviders = WECHAT`, and selectable cards for WhatsApp Business, WeCom App, Discord Bot, and Telegram Bot.
- Frontend provider cards are driven by `useMessagingProviderScopeStore.options`, initialized from `useGatewayCapabilityStore.loadCapabilities()`.
- `useGatewayCapabilityStore.loadCapabilities()` currently treats every provider in `managedStatus.supportedProviders` as available and ignores `managedStatus.excludedProviders`.
- Backend `ManagedMessagingGatewayService.getStatus()` currently returns static `MANAGED_MESSAGING_SUPPORTED_PROVIDERS` and `MANAGED_MESSAGING_EXCLUDED_PROVIDERS` values, with WhatsApp and WeCom in the supported list and only WeChat excluded.
- The existing top-level `Disable` button in `ManagedGatewayRuntimeCard.vue` disables the whole shared managed gateway. That remains out of scope for provider hiding and must not be repurposed.
- User clarified there are no existing WhatsApp/WeCom users/configs to migrate or defensively protect.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`, narrowly scoped
- Evidence basis: provider availability is already exposed as `supportedProviders` plus `excludedProviders`, but the frontend capability store ignores exclusions and backend status currently does not exclude WhatsApp/WeCom.
- Requirement or scope impact: the fix should be small and visibility-focused: update managed provider availability/status and frontend provider-card derivation. Do not add migration/cleanup or extra stale-config defensive machinery.

## Recommendations

- Treat WhatsApp Business and WeCom App as excluded/unavailable in the managed gateway status for the current distribution.
- Render selectable provider cards from active providers only: `supportedProviders - excludedProviders`.
- Preserve the Settings > Messaging section and the whole-gateway lifecycle controls.
- Preserve Discord Bot and Telegram Bot as visible provider choices.
- Do not implement cleanup scripts, config migration, or additional defensive runtime programs for WhatsApp/WeCom stale config in this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

`Small-to-Medium`.

Rationale: the desired behavior is small user-visible provider hiding. It touches both backend provider availability/status metadata and frontend capability/card derivation, but it should avoid broader runtime hardening or migration work.

## In-Scope Use Cases

- `UC-001` User opens Settings > Messaging in the current default distribution.
  - Expected: WhatsApp Business and WeCom App are not shown as selectable provider cards.
- `UC-002` User configures currently available messaging providers.
  - Expected: Discord Bot and Telegram Bot remain visible, selectable, and configurable.
- `UC-003` User/operator wants to turn the whole managed messaging gateway off.
  - Expected: the gateway-level `Disable` action remains visible when applicable and still disables the shared gateway, not individual providers.

## Out of Scope

- Making WhatsApp Business or WeCom integrations functional.
- Adding a user-facing toggle to re-enable unsupported providers.
- Removing the entire Messaging settings section.
- Removing WhatsApp/WECOM/WECHAT domain model support from external-channel parsing or historical binding records.
- Changing Discord or Telegram provider behavior except where tests/fixtures must reflect active-provider derivation.
- Adding cleanup scripts, data migration, stale-config deletion, or extra runtime-defense paths for unused WhatsApp/WeCom configs.
- Redesigning the whole messaging setup wizard.

## Functional Requirements

- `REQ-001` The managed gateway status/metadata for the current distribution must mark WhatsApp Business and WeCom App as excluded or otherwise unavailable for normal setup selection.
- `REQ-002` The frontend messaging capability derivation must treat selectable providers as active providers, not merely every provider listed in `supportedProviders`; excluded providers must not become provider-scope options.
- `REQ-003` Settings > Messaging must not render WhatsApp Business or WeCom App as selectable provider cards in the default current app/runtime state.
- `REQ-004` Discord Bot and Telegram Bot must remain selectable and configurable when reported active by the managed gateway status.
- `REQ-005` The gateway-level `Disable` action must remain present and continue to disable the shared managed gateway lifecycle only.
- `REQ-006` The UI must avoid a transient initialized-default state that briefly presents WhatsApp Business as the selected/available provider before managed capability bootstrap completes.
- `REQ-007` Documentation/release metadata that describes default managed messaging providers must not continue claiming WhatsApp Business and WeCom App are normal default setup choices.

## Acceptance Criteria

- `AC-001` A default managed messaging status no longer makes WhatsApp Business and WeCom App active/selectable provider choices; they are either present in `excludedProviders` or omitted from the active provider set used by the UI.
- `AC-002` `useGatewayCapabilityStore.loadCapabilities()` derives `whatsappBusinessEnabled=false` and `wecomAppEnabled=false` when status excludes `WHATSAPP` and `WECOM`, while keeping Discord/Telegram enabled when supported and not excluded.
- `AC-003` Settings > Messaging renders provider-scope cards for Discord Bot and Telegram Bot in the default current distribution; WhatsApp Business and WeCom App are absent from selectable cards.
- `AC-004` Selecting/saving Discord or Telegram configuration is not blocked by the provider-hiding change.
- `AC-005` The gateway-level `Disable` button remains wired to `disableManagedMessagingGateway` behavior and is not repurposed as provider-level disablement.
- `AC-006` Tests or executable validation cover provider-card derivation/rendering so WhatsApp/WeCom are not reintroduced as visible default choices.
- `AC-007` Documentation/release metadata no longer presents WhatsApp Business and WeCom App as normal default setup choices.

## Constraints / Dependencies

- The Messaging settings section remains useful and must remain visible.
- The managed messaging gateway is a shared runtime for all providers; provider hiding must not stop the runtime when Discord/Telegram remain usable.
- Existing external-channel domain types include WhatsApp, WeCom, WeChat, Discord, and Telegram; this change must not delete the domain enum or parsing support.
- The current GraphQL shape already exposes `supportedProviders`, `excludedProviders`, and `providerStatusByProvider`; avoid a breaking schema change if behavior can be fixed through existing fields.
- Avoid manual local-file edits as the user-facing solution.

## Assumptions

- WhatsApp Business and WeCom App have no real users/configs in current environments, so migration and stale-config defense are unnecessary for this ticket.
- Discord and Telegram remain intended visible providers.
- If WhatsApp/WeCom become production-ready later, a separate ticket can remove them from exclusion and add validation for re-enabled flows.

## Risks / Open Questions

- `RISK-001` Existing docs/tests may assume WhatsApp or WeCom are available by default; update only managed setup availability tests/docs, not generic external-channel compatibility.
- `RISK-002` Release-manifest metadata and backend constants currently duplicate provider lists; implementation should update both or choose one small source of truth to prevent future UI drift.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> `UC-001`
- `REQ-002` -> `UC-001`, `UC-002`
- `REQ-003` -> `UC-001`
- `REQ-004` -> `UC-002`
- `REQ-005` -> `UC-003`
- `REQ-006` -> `UC-001`
- `REQ-007` -> `UC-001`, `UC-002`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> Backend status/metadata scenario for provider availability source.
- `AC-002` -> Frontend gateway capability store unit scenario.
- `AC-003` -> Settings/Messaging setup component render scenario.
- `AC-004` -> Gateway connection/provider config regression scenario for Discord/Telegram.
- `AC-005` -> Managed gateway runtime card render/action regression scenario.
- `AC-006` -> Required validation matrix for implementation and API/E2E stages.
- `AC-007` -> Delivery docs/release metadata sync scenario.

## Approval Status

- `Refined after user clarification on 2026-06-06.`
- Product decision: users should simply not see WhatsApp Business or WeCom App as normal Messaging setup choices. No cleanup/migration/stale-config defensive work is required in this ticket.
