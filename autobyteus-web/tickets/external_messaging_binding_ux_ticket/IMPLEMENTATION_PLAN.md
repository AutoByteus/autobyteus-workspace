# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Cross-component UX restructure for external messaging setup.
  - New store introduced for provider scope source-of-truth.
  - Existing readiness and binding flows adjusted by provider scope.
- Workflow Depth:
  - `Medium/Large` -> design doc -> runtime simulation -> implementation plan -> progress tracking.

## Plan Maturity

- Current Status: `Simulation-Validated`
- Notes:
  - Runtime simulation validated against provider-scoped setup design.
  - Implementation covers scope-selection UX + provider-aware gating.

## Use Case Simulation Gate (Required Before Implementation)

| Use Case | Simulation Location | Primary Path Covered | Fallback/Error Covered (If Relevant) | Gaps | Status |
| --- | --- | --- | --- | --- | --- |
| Bootstrap provider-scoped setup state | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |
| Select setup provider scope | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |
| WeCom path without personal session | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |
| Peer discovery readiness gate | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |
| Save binding with derived provider/transport | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |
| Setup verification provider-awareness | `tickets/external_messaging_binding_ux_ticket/EXTERNAL_MESSAGING_BINDING_UX_RUNTIME_SIMULATION.md` | Yes | Yes | None | Passed |

## Go / No-Go Decision

- Decision: `Go`

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `stores/externalMessagingProviderScopeStore.ts` | gateway capability model | Establish provider source-of-truth and derived transport early. |
| 2 | `components/settings/externalMessaging/ProviderSetupScopeCard.vue` | provider scope store | Add explicit provider selection UX before setup sections. |
| 3 | `components/settings/ExternalMessagingManager.vue` | provider scope card + store | Bootstrap and propagate provider scope to setup flow. |
| 4 | `components/settings/externalMessaging/PersonalSessionSetupCard.vue` | provider scope store + gateway session store | Make session UX conditional by provider requirement. |
| 5 | `components/settings/externalMessaging/ChannelBindingSetupCard.vue` | provider scope store + binding/option stores | Derive provider/transport and enforce discovery guards. |
| 6 | `stores/externalMessagingSetupStore.ts` | provider scope + gateway/binding readiness | Keep checklist and verification aligned with selected provider. |
| 7 | Targeted tests | all above | Verify behavior and prevent regression. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Add | T-001 | No | provider scope store tests |
| C-002 | Add | T-002 | No | provider scope card render in manager tests |
| C-003 | Modify | T-003 | No | personal session card tests |
| C-004 | Modify | T-004 | No | binding card tests |
| C-005 | Modify | T-005 | No | setup verification store tests |

## Step-By-Step Plan

1. Add provider scope store and expose derived provider/transport behavior.
2. Add provider scope card and wire manager bootstrap to initialize scope.
3. Update personal session card for provider-aware behavior.
4. Update binding card to derive provider/transport and discovery gates from scope.
5. Update setup verification store to skip personal-session blockers for WeCom.
6. Add/extend targeted unit/component tests for new behavior.
