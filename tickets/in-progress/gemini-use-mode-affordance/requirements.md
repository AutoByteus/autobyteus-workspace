# Requirements — Gemini “Use this mode” affordance

## Status

`Design-ready` — refined against current frontend source, tests, repository icon conventions, and the existing Gemini UI/UX contract.

## Request

In Settings → API Key Management → Gemini, the icon-only `Use this mode` action currently looks like an empty circular control. It is not an intuitive affordance for selecting the configured Gemini mode. Replace it with a clearer symbol while preserving the explicit activation behavior.

## Scope

- In scope: the configured, non-active Gemini option action in `GeminiConfigurationOptionCard.vue`, its accessible naming/tooltip, and durable component tests.
- In scope: visual states for idle, hover/focus, disabled, and activating.
- Out of scope: Gemini setup persistence, GraphQL contracts, active-mode rules, labels, save actions, or any other provider controls.

## Use cases

| Use case ID | User goal | Expected outcome |
|---|---|---|
| `UC-001` | Recognize how to make a configured Gemini mode active | The non-active configured row presents a familiar selection/confirmation symbol; existing tooltip and accessible name still identify the action. |
| `UC-002` | Activate a configured non-active mode | Clicking the affordance emits the same `activate` event for the same mode and preserves pending/disabled behavior. |
| `UC-003` | Understand the active mode state | The active row continues to use its existing active marker and does not show a redundant activation action. |

## Behavior basis

| Behavior ID | Current supported behavior | Desired behavior | Must remain unchanged |
|---|---|---|---|
| `BEH-001` | `GeminiConfigurationOptionCard` renders the activation button only when `configured && !active`; its title/ARIA label are localized `Use this mode: <option>`, and click emits `activate`. | Keep the same condition, action, labels, and event; replace only the idle visual symbol with a clearer activation/selection symbol. | Configured/active distinction, click target, operation serialization, and telemetry/test IDs. |
| `BEH-002` | While activating, the symbol becomes a spinner; disabled states use existing opacity/cursor styles. | Keep the spinner, focus ring, disabled behavior, and 44px hit area. | No change to runtime or persistence. |
| `BEH-003` | Active rows show a blue radio-like marker and no activate button. | Keep the active marker unchanged. | Exactly one explicit active mode. |

## Requirements

| Requirement ID | Requirement |
|---|---|
| `REQ-001` | The idle `Use this mode` control must use a check-in-circle/confirmation symbol rather than an empty circle, so it communicates “select/apply this mode” without implying cycling. The symbol must be visually consistent with the existing Iconify/heroicons settings icon style. |
| `REQ-002` | The activation control must remain a real button with the existing localized title and accessible name, `data-testid`, event payload, disabled semantics, focus ring, hover treatment, spinner, and minimum 44×44px target. |
| `REQ-003` | The active mode marker and all adjacent configured/not-configured status indicators must remain unchanged. |
| `REQ-004` | No API, state, localization-key, persistence, or non-Gemini UI behavior may change. |

## Acceptance criteria

| Acceptance criteria ID | Verifiable outcome | Scenario intent |
|---|---|---|
| `AC-001` | For every configured non-active option, the idle activation button renders a recognizable check-in-circle symbol; it no longer renders the empty circular ring. | `GeminiSetupForm` configured non-active option render. |
| `AC-002` | The button retains `aria-label="Use this mode: <option>"`, the localized title, `data-testid="gemini-activate-<option>"`, and emits the same option on click. | Existing activation interaction. |
| `AC-003` | When `activating` is true, the spinner remains rendered and the button remains disabled; no check symbol is shown during the operation. | Pending activation. |
| `AC-004` | Active options still show the existing active marker and no activation button; other status/action states remain unchanged. | Active/non-active contrast. |
| `AC-005` | Focus/hover styling and button hit area remain accessible and visually consistent. | Keyboard/focus and responsive control regression. |
| `AC-006` | Focused Nuxt/Vitest component tests pass, and repository localization/web-boundary guards pass if required by the changed files. | Local implementation validation. |

## Persisted data

`Directly Usable — No Migration.` This is presentation-only; no persisted data or contracts change.

## Approval / readiness

The user’s request authorizes this narrow visual change. The requirements basis is refined from repository evidence in the investigation notes and is implementation-ready once the design spec readiness checks pass.
