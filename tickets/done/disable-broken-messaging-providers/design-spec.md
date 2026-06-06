# Design Spec

- Ticket: `disable-broken-messaging-providers`
- Status: `Revised for architecture review`
- Last Updated: `2026-06-06`

## Current-State Read

Settings > Messaging is composed by `MessagingSetupManager.vue`. It renders the managed gateway lifecycle card, provider scope card, selected-provider configuration card, and selected-provider setup flow. Provider cards come from `useMessagingProviderScopeStore.options`, initialized by `useGatewayCapabilityStore.loadCapabilities()`.

Current availability flow:

1. Frontend queries `managedMessagingGatewayStatus`.
2. Backend `ManagedMessagingGatewayService.getStatus()` returns `supportedProviders` and `excludedProviders`.
3. Today, backend reports `WHATSAPP`, `WECOM`, `DISCORD`, and `TELEGRAM` as supported, and only `WECHAT` as excluded.
4. `GatewayCapabilityStore.loadCapabilities()` derives available providers from `supportedProviders` and ignores `excludedProviders`.
5. `ProviderSetupScopeCard.vue` therefore renders WhatsApp Business and WeCom App as selectable cards.
6. `MessagingProviderScopeStore` starts with `availableProviders: ['WHATSAPP']`, so WhatsApp can also appear as the pre-bootstrap default.

User clarified the desired scope: the Messaging setting itself is still useful, but ordinary users should not see WhatsApp Business or WeCom App. There is no need for cleanup, migration, or extra stale-config defensive runtime programming because these providers have not been used/configured.

## Intended Change

Hide/remove WhatsApp Business and WeCom App from normal Settings > Messaging provider choices.

Target visible behavior:

- Provider cards shown by default: `Discord Bot`, `Telegram Bot`.
- Provider cards not shown by default: `WhatsApp Business`, `WeCom App`.
- Existing gateway-level `Disable` button remains a whole-gateway lifecycle action.
- Messaging section remains visible and usable.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `Yes`, narrow
- Evidence: backend status has `excludedProviders`, but backend does not exclude WhatsApp/WeCom and frontend ignores exclusions when building provider options.
- Design response: update managed provider availability/status metadata and frontend capability derivation so the UI renders only active providers. Avoid additional defensive programs outside visible-provider availability.
- Refactor rationale: direct filtering in only one component would leave provider availability semantics duplicated and keep backend status saying WhatsApp/WeCom are normal default choices.
- Intentional deferrals and residual risk, if any: runtime hardening against manually inserted stale WhatsApp/WeCom config is intentionally deferred/out of scope per user clarification; future WhatsApp/WeCom re-enablement is a separate readiness ticket.

## Terminology

- `Excluded provider`: a provider intentionally unavailable to normal Settings setup in the current distribution.
- `Active/selectable provider`: a provider that the frontend may show as a setup option.
- `Gateway lifecycle disable`: the existing whole-runtime Disable action.
- `Provider hiding`: the in-scope behavior that removes WhatsApp/WeCom from ordinary provider choices.

## Design Reading Order

1. managed provider availability/status metadata
2. frontend active-provider capability projection
3. provider-scope rendering and pre-bootstrap safety
4. validation/docs/release metadata sync

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the old behavior where WhatsApp/WeCom are presented as normal default managed setup choices.
- No compatibility toggle should keep WhatsApp/WeCom visible by default.
- No cleanup or migration path is needed because there is no used legacy config to preserve or transform.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User opens Settings > Messaging | Active provider cards/flows rendered | Managed gateway status + frontend provider scope | Main user-visible hiding behavior. |
| DS-002 | Primary End-to-End | User clicks gateway `Disable` | Shared gateway runtime disabled | Managed gateway lifecycle service | Confirms existing whole-gateway disable remains separate and unchanged. |
| DS-003 | Return-Event | Gateway status query/mutation returns | Pinia stores update UI state | Gateway session setup store | Keeps UI synchronized after status refresh or lifecycle action. |

## Primary Execution Spine(s)

- `DS-001`: `Settings Page -> Managed Gateway GraphQL Status -> Gateway Capability Store -> Provider Scope Store -> Provider Cards / Flow Host`
- `DS-002`: `Disable Button -> Gateway Session Store Mutation -> GraphQL Resolver -> ManagedMessagingGatewayService.disable -> Runtime Process Supervisor`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The Settings page fetches managed gateway status. The frontend capability store derives active providers by excluding unavailable providers. The provider scope store initializes with active providers only. The provider card/component host renders Discord/Telegram and does not render WhatsApp/WeCom. | Settings page, managed status, capability projection, provider scope, provider cards | Backend status owns availability metadata; provider scope store owns selected/available UI providers | Localization labels, icons, Discord/Telegram account hints |
| DS-002 | The existing Disable button continues to issue a whole-gateway lifecycle mutation and does not become provider-specific. | Disable button, gateway store, GraphQL resolver, gateway service | Managed gateway lifecycle service | Button loading/error state |
| DS-003 | Status/mutation results are normalized into the gateway store, then provider/capability stores render the current active provider set. | GraphQL response, gateway session store, provider scope store | Gateway session setup store | Error normalization, reliability status |

## Spine Actors / Main-Line Nodes

- `ManagedMessagingGatewayService`: authoritative server-side lifecycle/status boundary.
- Provider availability/status metadata: current distribution’s supported/excluded provider lists.
- `GatewayCapabilityStore`: frontend projection from managed gateway status into setup capabilities.
- `MessagingProviderScopeStore`: selected/available provider state for the setup UI.
- `MessagingSetupManager`: page composition and initialized/empty provider gating.
- `ManagedGatewayRuntimeCard`: existing whole-gateway lifecycle actions and status labels.

## Ownership Map

- Backend managed gateway status owns what the current distribution advertises as supported/excluded.
- Frontend `GatewayCapabilityStore` owns UI capability projection from backend status.
- `MessagingProviderScopeStore` owns selected/available provider state and must never select providers outside the active set.
- `MessagingSetupManager` owns page-level rendering gates so provider-specific cards/flows do not render before capabilities are initialized.
- `ManagedGatewayRuntimeCard` owns whole-gateway lifecycle controls and must not own provider-specific hiding logic.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL `managedMessagingGatewayStatus` | `ManagedMessagingGatewayService` | API boundary for frontend status/capability consumption | Component-specific rendering rules |
| `GatewayCapabilityStore.loadCapabilities()` | Backend managed gateway status | Frontend projection into setup booleans | Independent backend provider policy beyond active-provider derivation |
| `ManagedGatewayRuntimeCard` buttons | `GatewaySessionSetupStore` + backend lifecycle service | UI lifecycle controls | Provider-specific visibility policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Frontend supported-only provider derivation | It ignores excluded provider status and shows WhatsApp/WeCom. | Active provider derivation in `gatewayCapabilityStore.ts` | In This Change | Required. |
| Initial `availableProviders: ['WHATSAPP']` UI default | It can show WhatsApp before capability bootstrap. | Empty/uninitialized state plus page render gate | In This Change | Required. |
| Release/docs language presenting WhatsApp/WeCom as normal default setup choices | Misleads users after hiding providers. | Updated docs/release metadata | In This Change / delivery sync | Keep messaging docs focused on visible providers. |
| Runtime stale-config defense/migration | User clarified no old configs/users exist and no extra defensive programs are wanted. | N/A | Out of Scope | Do not add cleanup/migration for this ticket. |
| External-channel enum/pair removal | Managed setup visibility is narrower than domain compatibility. | N/A | Out of Scope | Do not delete provider enum support. |

## Return Or Event Spine(s) (If Applicable)

- `DS-003`: `Managed Gateway Query/Mutation Result -> normalizeManagedStatus() -> gatewaySessionSetupStore.applyManagedStatus() -> capability/provider stores initialize/refresh -> Settings UI rerender`.

## Bounded Local / Internal Spines (If Applicable)

- Provider scope selection:
  - `initialize(capabilities) -> derive availableProviders -> if selected not available choose first active provider or null-safe fallback -> mark initialized`
  - Matters because hidden providers must not remain selected.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Provider labels/localization | DS-001 | Provider card UI | Translate provider names and messages | UI copy only | Would mix copy and provider availability. |
| Provider icons | DS-001 | Provider card UI | Visual provider identification | Presentation only | Icons should not decide availability. |
| Account hints | DS-001, DS-003 | Provider scope + binding setup | Carry Discord/Telegram account IDs into binding scope | Needed for usable visible providers | If mixed into availability policy, selection and account identity blur. |
| Release/docs metadata | DS-001 | Distribution/docs | Keep described default providers aligned | Prevent user confusion | Should not be live runtime authority. |
| External-channel binding compatibility | DS-001 | Binding CRUD service | Validate generic provider/transport pairs | Broader domain capability | If used as managed setup visibility, hidden providers could leak back in. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Managed provider availability metadata | `managed-capabilities/messaging-gateway` | Extend | Existing subsystem owns status fields used by frontend. | N/A |
| UI provider capability projection | `autobyteus-web/stores/gatewayCapabilityStore.ts` | Extend | Existing projection owner maps gateway status to UI capabilities. | N/A |
| UI provider selection | `messagingProviderScopeStore.ts` | Extend | Existing owner for selected/available providers. | N/A |
| Whole-gateway disable | `ManagedGatewayRuntimeCard` + gateway session store/service | Reuse | Already exists and is not the requested provider hiding. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server managed messaging gateway | Supported/excluded provider status metadata | DS-001, DS-003 | `ManagedMessagingGatewayService` | Extend | Keep UI source aligned with backend status. |
| Web messaging setup state | Capability projection and provider selection | DS-001, DS-003 | `GatewayCapabilityStore`, `MessagingProviderScopeStore` | Extend | Hide providers by active capability. |
| Web messaging setup page/components | Render only initialized active provider cards/config/flows | DS-001 | `MessagingSetupManager` | Extend | Prevent pre-bootstrap WhatsApp visibility. |
| Release/docs | User-visible default provider description | DS-001 | Release metadata/docs | Extend | Avoid docs saying hidden providers are default choices. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts` or small adjacent provider availability file | Server managed messaging gateway | Provider availability metadata | Current supported/excluded defaults | Existing constants live here; a small adjacent file is okay if it reduces policy clutter | Yes |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Server managed messaging gateway | Status/lifecycle service | Return updated provider lists | Existing status owner | Uses provider constants/helper |
| `autobyteus-web/stores/gatewayCapabilityStore.ts` | Web messaging setup state | Capability projection | Compute active provider set from supported minus excluded | Existing projection owner | Uses status fields |
| `autobyteus-web/stores/messagingProviderScopeStore.ts` | Web messaging setup state | Provider scope owner | Empty initial availability and safe selection fallback | Existing selection owner | Uses capability booleans |
| `autobyteus-web/components/settings/MessagingSetupManager.vue` | Web messaging setup page | Page composition owner | Gate provider-specific sections until active provider exists | Existing page owner | Uses provider scope state |
| `autobyteus-message-gateway/scripts/release-manifest.mjs` and default manifest | Release tooling | Manifest metadata | Stop advertising WhatsApp/WeCom as normal default choices | Existing release metadata owner | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Backend supported/excluded provider list | Existing `types.ts` constants or `managed-messaging-provider-availability.ts` | Server managed messaging gateway | Service and release/tests need coherent defaults | Yes | Yes | A frontend hardcoded filter |
| Frontend active-provider derivation | Local helper in `gatewayCapabilityStore.ts` | Web messaging setup state | Only frontend capability projection needs it | Yes | Yes | A second product policy source |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `supportedProviders` / `excludedProviders` | Yes | N/A | Medium currently because exclusions are ignored | Define UI active set as supported minus excluded. |
| `GatewayCapabilitiesModel` booleans | Yes | N/A | Low after derivation fix | Keep as UI projection, not backend policy. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts` or `managed-messaging-provider-availability.ts` | Server managed messaging gateway | Provider availability metadata | Include `WHATSAPP`, `WECOM`, and `WECHAT` in excluded defaults for current distribution | Backend status source | N/A |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | Server managed messaging gateway | Authoritative status/lifecycle boundary | Return updated supported/excluded lists | Existing service owner | Uses provider constants/helper |
| `autobyteus-web/stores/gatewayCapabilityStore.ts` | Web messaging setup state | Capability projection | Derive capabilities from active provider set | Existing projection owner | Uses managed status fields |
| `autobyteus-web/stores/messagingProviderScopeStore.ts` | Web messaging setup state | Provider selection owner | Empty initial provider list and safe fallback | Existing provider-scope owner | Uses capability model |
| `autobyteus-web/components/settings/MessagingSetupManager.vue` | Web messaging setup page | Page composition owner | Hide provider-specific sections until initialized active provider exists | Existing page owner | Uses provider scope state |
| Targeted tests | Validation | Behavior contracts | Provider hiding and Discord/Telegram regressions | Existing test suites align with affected owners | N/A |

## Ownership Boundaries

The backend managed gateway status should no longer advertise WhatsApp/WeCom as normal default choices. The frontend consumes this through capability projection and renders active providers only.

The external-channel subsystem remains separate: it owns generic provider/transport compatibility, not current Settings provider visibility.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ManagedMessagingGatewayService.getStatus()` | provider status metadata and lifecycle state | GraphQL resolver, frontend gateway/session stores | UI hardcodes provider hiding while backend status still advertises those providers as default choices | Correct status metadata. |
| `GatewayCapabilityStore.loadCapabilities()` | active-provider projection | Provider scope store/bootstrap | Components each apply their own provider filters | Extend the projection once. |
| `MessagingProviderScopeStore` | selection and available provider state | Provider cards/config/flows | Components mutate selected provider to unavailable values | Keep guarded setter and render gates. |

## Dependency Rules

Allowed:

- GraphQL resolver -> `ManagedMessagingGatewayService`.
- Frontend `GatewayCapabilityStore` -> `GatewaySessionSetupStore.managedStatus`.
- Provider cards/config/flows -> `MessagingProviderScopeStore`.
- Tests -> affected public functions/stores/components.

Forbidden:

- Component-only `if provider !== WHATSAPP && provider !== WECOM` filters as the sole fix.
- Removing the whole Messaging settings section.
- Repurposing the gateway-level Disable button for provider-specific hiding.
- Removing external-channel enum/parsing compatibility as part of this ticket.
- Adding cleanup/migration/stale-config defense work outside the clarified scope.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `managedMessagingGatewayStatus` GraphQL query | Managed gateway status | Expose lifecycle and provider availability metadata | No input | No schema change expected. |
| `disableManagedMessagingGateway` GraphQL mutation | Managed gateway lifecycle | Disable shared gateway runtime | No input | Preserve current behavior. |
| `GatewayCapabilityStore.loadCapabilities()` | UI capabilities | Project managed status to `GatewayCapabilitiesModel` | Uses loaded status | Active providers = supported minus excluded. |
| `MessagingProviderScopeStore.setSelectedProvider(provider)` | UI provider selection | Change selected provider only if active | `MessagingProvider` | Existing guard remains important. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `managedMessagingGatewayStatus` | Yes | Yes | Low | Keep schema; adjust field values/semantics. |
| `GatewayCapabilityStore.loadCapabilities()` | Yes | Yes | Low | Normalize provider strings and subtract exclusions. |
| `MessagingSetupManager` render gate | Yes | N/A | Low | Render only when provider scope initialized and active provider exists. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Active provider derivation | `activeProviderSet` / `isProviderActive` | Yes | Low | Define as supported minus excluded. |
| Provider scope | `MessagingProviderScopeStore` | Yes | Low | Existing name remains. |
| Gateway lifecycle disable | `disableManagedMessagingGateway` | Yes | Low | Preserve semantics. |

## Applied Patterns (If Any)

- Projection store: `GatewayCapabilityStore` converts backend status into UI capability booleans.
- Guarded selection state: `MessagingProviderScopeStore.setSelectedProvider()` prevents unavailable provider selection.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/types.ts` or adjacent provider availability file | File | Managed gateway provider metadata | Current supported/excluded defaults | Existing status owner area | Frontend rendering logic |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/managed-messaging-gateway-service.ts` | File | Managed gateway lifecycle/status | Return updated provider metadata | Existing service owner | UI presentation rules |
| `autobyteus-web/stores/gatewayCapabilityStore.ts` | File | Frontend capability projection | Derive active provider booleans from status | Existing projection store | Backend policy constants beyond status fields |
| `autobyteus-web/stores/messagingProviderScopeStore.ts` | File | Provider selection state | Safe initial/selection state | Existing provider-scope store | Runtime lifecycle logic |
| `autobyteus-web/components/settings/MessagingSetupManager.vue` | File | Settings messaging composition | Render provider-specific sections only after active capabilities | Existing page owner | Provider policy duplication |
| `autobyteus-web/docs/messaging.md` and/or `autobyteus-web/README.md` | File | User docs | Remove/qualify WhatsApp/WeCom as default setup choices | Existing docs mention setup | Source logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway` | Main-Line Domain-Control | Yes | Low | Existing managed gateway capability area owns status. |
| `autobyteus-web/stores` messaging stores | Main-Line UI State | Yes | Low | Existing state owners; no new folder needed. |
| `autobyteus-web/components/settings/messaging` | UI presentation | Yes | Low | Existing components remain presentation/composition only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Active provider derivation | `active = supported.filter(p => !excludedSet.has(p))` in `GatewayCapabilityStore` | `ProviderSetupScopeCard.vue` hardcodes a local WhatsApp/WeCom filter while backend still says they are default-supported | Keeps one status-driven UI path. |
| Visible provider cards | Cards: Discord Bot, Telegram Bot | Cards: WhatsApp Business, WeCom App, Discord Bot, Telegram Bot | Matches clarified user intent. |
| Gateway disable separation | Button still calls `disableManagedMessagingGateway` | Reusing `Disable` button to mean “disable selected provider” | Avoids lifecycle/provider confusion. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep WhatsApp/WeCom visible but disabled | Could explain availability | Rejected for now | User asked simply that users do not see them. Hide provider choices. |
| User-facing toggle to re-enable WhatsApp/WeCom | Could preserve advanced access | Rejected | No default visibility until future readiness ticket. |
| Keep initial WhatsApp provider default | Avoids small store change | Rejected | Initialize without WhatsApp default and render-gate provider sections. |
| Cleanup/migration/stale-config defense | Was in initial design for robustness | Rejected for this ticket | User clarified no existing config/users; avoid extra defensive programs. |

## Derived Layering (If Useful)

- Backend status metadata: managed gateway service/provider constants.
- API boundary: existing GraphQL status/mutations.
- Frontend state projection: gateway capability store + provider scope store.
- Frontend presentation: Settings messaging components.

## Migration / Refactor Sequence

1. Update managed gateway provider metadata so WhatsApp/WeCom are excluded/unavailable in the current distribution status. This may be constants in `types.ts` or a small adjacent provider availability file if cleaner.
2. Update `ManagedMessagingGatewayService.getStatus()` and related fixtures to return the refined supported/excluded provider metadata.
3. Update release manifest generator/default manifest metadata so future generated provider metadata does not re-advertise WhatsApp/WeCom as normal setup choices.
4. Update `GatewayCapabilityStore.loadCapabilities()` to derive active providers from `supportedProviders - excludedProviders`.
5. Update `MessagingProviderScopeStore` initial state so it does not default to WhatsApp before bootstrap.
6. Update `MessagingSetupManager.vue` to render provider-specific config/flows only after provider scope is initialized and active provider exists; optionally show a small empty-state message if no active providers exist.
7. Update targeted tests:
   - backend/default provider metadata test if available;
   - frontend `gatewayCapabilityStore` active-provider derivation;
   - `messagingProviderScopeStore` no WhatsApp default/fallback behavior;
   - `MessagingSetupManager` render showing Discord/Telegram and not WhatsApp/WeCom.
8. Delivery docs sync: update Messaging docs/README where they list default setup providers.

## Key Tradeoffs

- **Hide vs disabled cards:** choose hide, because user specifically wants users not to see WhatsApp/WeCom.
- **Status-driven vs component-only filter:** status-driven is slightly broader but avoids visible inconsistencies in the gateway supported/excluded summary.
- **No runtime hardening:** keeps scope simple per user clarification; acceptable because there are no existing configs/users.
- **Keep messaging section:** avoids overcorrecting; Discord/Telegram remain available.

## Risks

- Docs and tests may still list WhatsApp/WeCom as default managed setup choices.
- Release metadata can drift if only frontend filters are updated.
- If someone manually inserts config outside the UI, this ticket does not add extra runtime defensive handling by design.

## Guidance For Implementation

- Keep the implementation small and user-visible.
- Do not delete external-channel domain support.
- Do not build cleanup/migration scripts.
- Do not repurpose the gateway-level Disable button.
- Prefer status/capability-driven hiding over ad hoc component-only filters.
- Validate that Settings > Messaging shows Discord/Telegram and not WhatsApp/WeCom by default.
