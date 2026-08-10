# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined for SR-017` — the endpoint/key journey remains approved and implemented. The user's DR-009 hands-on feedback adds one presentation clarification: live Qwen catalog rows use their friendly names across AutoByteus model-selection surfaces, while collision-safe `qwen:...` selectors remain internal.

## UX Goal

Let a user configure the single native Qwen connection using the Base URL and API key copied together from Alibaba, without creating a custom provider and without exposing the secret after save. When browsing or selecting Qwen models, present readable catalog names rather than internal collision-avoidance keys.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-005`–`REQ-008`, `REQ-010`–`REQ-012`, `REQ-016`
- Acceptance criteria: `AC-007`–`AC-014`, `AC-020`, `AC-021`

## Users / Personas / Contexts

- Existing Qwen user with a saved API key and the historical default pay-as-you-go endpoint.
- Token Plan, pay-as-you-go, or regional Alibaba user with a plan-specific/workspace-specific Base URL and matching key.
- Any user browsing or selecting a Qwen-served model that duplicates a direct-provider model value.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | New Qwen user | No key; effective default URL visible | Configure endpoint/key pair | Provider configured; entered key cleared/masked | REQ-005; AC-007, AC-008 |
| UXJ-002 | Existing key-only user | Key configured; server status reports `endpointSource=DEFAULT` | Continue or replace default route | Default remains usable until successful replacement | REQ-006, REQ-010, REQ-012; AC-011, AC-012, AC-014 |
| UXJ-003 | Configured regional/plan user | Saved URL and key | Replace endpoint/key pair | New pair active after successful probe | REQ-005, REQ-008; AC-008, AC-012 |
| UXJ-004 | Qwen model user | Live Qwen catalog includes prefixed duplicate selectors and friendly names | Recognize and select the intended Qwen-routed model without seeing internal routing syntax | Friendly name visible; exact prefixed selector selected/stored; exact unprefixed value sent | REQ-007, REQ-016; AC-010, AC-020, AC-021 |

## Journey Details

### UXJ-001 — Configure Qwen

1. Select `Qwen` in Settings > provider management.
2. The configuration panel shows an editable Base URL and a masked API-key input.
3. Paste the Alibaba Base URL and its matching API key.
4. Select `Save configuration`.
5. The form enters a saving/testing state and disables repeat submission.
6. The server normalizes the URL and tests `GET {baseUrl}/models` with the submitted key.
7. The server replaces the key and durably commits the URL; it returns success only after both commits complete.
8. On success, the form shows a success message, clears the plaintext key field, retains the effective Base URL, shows `Configured endpoint`, and refreshes provider settings/models.
9. On probe/new-key failure, or on durable-URL failure followed by successful key restoration, the inputs remain editable, an actionable error says the previous configuration is still active, and the old pair remains authoritative.
10. If bounded key compensation also fails, the form shows a repair-required error and instructs the user to save a valid pair again; it does not claim the old configuration is active.

### UXJ-002 — Existing key-only state

- Read `effectiveBaseUrl` and `endpointSource` from the Qwen setup status. Show the effective historical default URL in the Base URL field with a `Using default endpoint` indicator.
- Show `API key configured` without returning the secret.
- Do not determine the indicator by comparing URL strings; an explicitly configured URL equal to the historical default must show `Configured endpoint`.
- Leaving the screen makes no change.
- Replacing the route requires both a Base URL and a newly entered matching key.

### UXJ-004 — Browse and select Qwen-served duplicates

1. Open Settings > Qwen or any live catalog-backed AutoByteus model selector.
2. Display `DeepSeek V4 Pro (Qwen)`, `DeepSeek V4 Flash 0731 (Qwen)`, and `GLM-5.2 (Qwen)` from the catalog `name`; do not display their `qwen:...` selectors as the live label.
3. Keep option identity bound to `modelIdentifier`, so choosing the friendly row selects `qwen:deepseek-v4-pro`, `qwen:deepseek-v4-flash-0731`, or `qwen:glm-5.2` respectively.
4. After selection, the selected-value presentation remains friendly and provider-qualified through the existing shared label owner.
5. Runtime factory lookup uses the selected prefixed identifier, while the provider request sends the exact unprefixed catalog `value`.
6. If a persisted selector is absent from the live catalog, show its raw identifier in the existing unavailable/current-value state; do not invent a friendly name or clear it.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `ProviderAPIKeyManager.vue` Qwen branch | Select Qwen-specific setup instead of generic key-only editor | Selected provider is `QWEN` | Loading, ready, saving/testing, success, error | Save or navigate away |
| `QwenSetupForm.vue` | Own two-field form and local validation | Qwen setup status loaded | Default endpoint, configured endpoint, dirty, submitting, prior-restored error, repair-required error | Emit one save command |
| Notification surface | Summarize save result | Mutation completes | Success/error | Auto-dismiss or user continues |
| `ProviderModelBrowser.vue` | Show configured provider's live models in Settings | Qwen catalog loaded | Friendly live labels, loading, empty, reload | Select another provider or reload |
| Shared runtime/binding model selectors | Choose an exact catalog model for agent, team, application/member, or channel launch configuration | AutoByteus catalog row available | Friendly option and selected labels; raw missing current selector | Persist exact model identifier |
| `modelSelectionLabel.ts` | Govern live option/selected-label presentation | Catalog `ModelInfo` is available | Qwen friendly name; custom friendly name; generic built-in identifier; missing handled by caller | Return display string only |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Initial unconfigured | Select Qwen | Form appears; default URL may be prefilled | Key empty; save disabled | None | Enter URL/key |
| Existing configured | Select Qwen | Effective URL and configured indicator appear | Secret is never populated | None | Enter replacement key and edit URL |
| Invalid/missing URL | Edit fields | Inline validation | Save disabled or validation message | None | Correct URL |
| Submit | Click save | Spinner; inputs/button disabled | Testing/saving | One GraphQL command | Wait |
| Probe failure | Server rejects pair | Actionable error | Inputs preserved; old config remains active | No commit | Edit/retry |
| New-key failure | Secret vault rejects replacement | Previous configuration remains message | Inputs preserved; old status retained | URL not touched | Edit/retry |
| Durable URL failure, compensation succeeds | Strict AppConfig commit fails | `Could not save Qwen configuration. Your previous configuration is still active.` | Inputs preserved; old status retained | Previous key restored or new key removed | Edit/retry |
| Compensation failure | Key restoration/removal also fails | `Qwen configuration needs repair. Save a valid Base URL and API key again before using Qwen.` | Repair-required error; no success state | Server returned `QWEN_CONFIGURATION_REPAIR_REQUIRED` | Resubmit valid pair |
| Success | Server commits pair | Success notification | Key cleared; URL retained; `endpointSource=CONFIGURED` | Qwen status/provider catalog refresh | Use Qwen models |
| Live Qwen duplicate catalog row | Catalog renders | Friendly Qwen name appears | No `qwen:` prefix in card/option/selected label | No mutation | Select model |
| Friendly Qwen row selected | User chooses row | Selected label remains friendly | Exact `modelIdentifier` is the form/store value | Existing selection persistence/routing | Launch/save |
| Stored Qwen selector missing from catalog | Catalog refresh cannot resolve row | Existing unavailable/current-value treatment shows raw selector | No friendly-name guess; no clearing/fallback | No mutation until user acts | Reconfigure/reselect |

## Markdown Wireframes / Visual Structure

```text
Qwen configuration
Use the Base URL and API key supplied together by Alibaba.

Base URL
[ https://.../compatible-mode/v1                         ]
[ Using default endpoint | Configured endpoint ]

API key                                      [show/hide]
[ •••••••••••••••••••••••••••••••••••••••••••••••••• ]
API key configured                           [Save configuration]

(error or validation message)
```

## Non-Happy-Path States

### Loading

- Provider settings load uses the existing settings loading state.
- During submit, disable both inputs and the submit button and show a spinner.

### Empty

- No empty panel: show the setup fields even when unconfigured.
- The default historical Base URL may be prefilled, but `endpointSource=DEFAULT` must identify it as the effective default rather than proof of a saved custom endpoint.

### Error And Recovery

- Required URL/key: `Enter both the Qwen Base URL and API key.`
- Invalid URL: `Enter an absolute HTTP or HTTPS Base URL.`
- Probe failure: show the sanitized server error; do not display authorization headers or raw payloads.
- Durable failure with successful compensation: show that the previous configuration remains active.
- Repair-required compensation failure: instruct the user to save a valid pair again; do not display or guess which key is stored.
- The user can correct either field and retry without losing the input.

### Disabled / Unavailable

- Save is disabled when either field is blank or while a request is active.
- Do not disable model browsing after a probe/new-key failure or a durable-URL failure whose compensation succeeded; those outcomes explicitly preserve the prior configuration. A repair-required double failure must not claim that Qwen execution is healthy or that the prior key remains active.

### Permission / Authentication

- No new permission model.
- The secret is write-only from the browser's perspective and is masked by default.

## Responsive And Platform Behavior

- Use the existing single-column provider configuration width and responsive behavior.
- Long Base URLs wrap or scroll within the input without overflowing the settings panel.
- Behavior is identical in browser-equivalent and Electron surfaces.

## Accessibility And Keyboard Behavior

- Labels are programmatically associated with inputs.
- Show/hide key is a keyboard-focusable button with an accessible label.
- Enter may submit only when the form is valid and not already submitting.
- Error text is associated with the relevant field and announced through the existing notification/error pattern.

## Content, Labels, And Validation Messages

- Heading: `Qwen configuration`
- Supporting text: `Use the Base URL and API key supplied together by Alibaba.`
- Fields: `Base URL`, `API key`
- Submit: `Save configuration`
- Configured indicator: `API key configured`
- Endpoint-source indicators: `Using default endpoint`, `Configured endpoint`
- Live Qwen duplicate model labels: `DeepSeek V4 Pro (Qwen)`, `DeepSeek V4 Flash 0731 (Qwen)`, `GLM-5.2 (Qwen)`
- Internal selectors such as `qwen:deepseek-v4-pro` are not copy for a live model card or selection option. They may remain visible only when a stored selector has no live catalog row or in diagnostic/API contexts.
- No plan or region dropdown is introduced.

## Data And API Dependencies

- `qwenSetupStatus` returns `{ effectiveBaseUrl, endpointSource: DEFAULT | CONFIGURED, apiKeyConfigured }`.
- `saveQwenConfiguration(input: { baseUrl, apiKey })` returns the same updated setup status only after both values commit.
- Sanitized GraphQL errors distinguish previous-restored save failure from repair-required compensation failure through `extensions.code`; the UI maps only `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED` and `QWEN_CONFIGURATION_REPAIR_REQUIRED` to the specified messages and does not render an internal cause.
- Successful save refreshes provider settings and the Qwen model catalog view.
- Existing `ModelInfo` fields are sufficient: `name` is presentation, `modelIdentifier` is selection/routing identity, `value` is provider wire identity, and `providerType=QWEN` selects the narrow friendly-label policy.
- Active Settings/runtime/binding catalog surfaces use the shared `getModelSelectionOptionLabel` / `getModelSelectionSelectedLabel` owner; do not add component-local Qwen label formatting.

## Out Of Scope

- Multiple Qwen endpoints, endpoint history, plan/region selectors, model enable/disable controls, per-model metadata editing, displaying the saved API key, renaming catalog definitions, changing stored identifiers/wire values, or applying friendly-name presentation globally to unrelated built-in providers.

## Open Decisions / Risks

- AppConfig and the secret vault are separate persistence owners. `SR-011` uses a strict atomic AppConfig write plus bounded old-secret restoration rather than a generalized transaction system. A double failure is surfaced as repair-required and must never be presented as success or as confirmed rollback.
- A future catalog-backed selection surface could bypass the shared label owner and re-expose internal selectors. Code review should keep the shared owner as the presentation invariant for live AutoByteus model choices.

## Approval Status

Endpoint/key and exact-model scope was approved through the user's 2026-08-06 instructions and passed architecture review. The friendly-label addition is based on the user's DR-009 hands-on objection to visible internal prefixes and is pending fresh SR-017 architecture review.
