# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Fix the provider API-key save flow so built-in providers (including Gemini and standard fixed providers like OpenAI/Anthropic) do not show a failure toast after a successful backend save.

## Investigation Findings

- The live embedded backend at `http://127.0.0.1:29695/graphql` returns successful mutation payloads for both `setLlmProviderApiKey` and `setGeminiSetupConfig`.
- The built-in provider save path and Gemini save path both mutate hydrated provider query result objects in place after the successful mutation returns.
- The custom OpenAI-compatible provider flow does not mutate hydrated provider rows in place; it reloads provider data after save, which matches the user observation that custom provider save behaves correctly.
- The fix scope is frontend-only for the current bug: replace in-place provider-row mutation with immutable store updates and remove the redundant Gemini runtime row mutation.

## Recommendations

- Keep the authoritative save boundary in `autobyteus-web/stores/llmProviderConfig.ts`.
- Replace nested in-place provider-row mutation with immutable row replacement helper(s).
- Remove the Gemini runtime’s direct provider-row mutation and let the store own configured-state synchronization.
- Add focused regression tests that use immutable/frozen provider rows so this class of bug cannot regress silently.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- Saving a built-in provider API key (for example OpenAI) shows a success toast when the backend save succeeds.
- Saving Gemini setup shows a success toast when the backend save succeeds.
- Custom provider save behavior remains unchanged.
- Focused regression tests cover immutable provider-row scenarios.

## Out of Scope

- Redesigning GraphQL mutation result contracts.
- Reworking the broader provider settings UX.
- Changing custom-provider creation behavior beyond non-regression.

## Functional Requirements

- `REQ-001` Built-in provider save success must not be turned into a frontend failure by post-save state synchronization.
- `REQ-002` Gemini save success must not be turned into a frontend failure by post-save state synchronization.
- `REQ-003` Provider configured-state synchronization for this flow must be owned immutably by the provider-config store rather than by in-place mutation of hydrated provider rows.
- `REQ-004` Focused regression coverage must protect against save-path failures caused by immutable/frozen hydrated provider rows.

## Acceptance Criteria

- `AC-001` Given `setLlmProviderApiKey` returns a successful mutation result, saving OpenAI through the settings UI shows the success toast and not the failure toast.
- `AC-002` Given `setGeminiSetupConfig` returns a successful mutation result, saving Gemini setup through the settings UI shows the success toast and not the failure toast.
- `AC-003` Custom provider save still succeeds unchanged.
- `AC-004` Focused frontend tests covering immutable/frozen provider rows pass.

## Constraints / Dependencies

- The fix should preserve the existing GraphQL mutation contracts.
- The save boundary should stay centered in the provider-config store.

## Assumptions

- The user-reported failure is triggered after backend persistence succeeds.
- Hydrated provider rows can be immutable enough that in-place mutation is unsafe in the actual app runtime.

## Risks / Open Questions

- The exact immutability source can vary by runtime/cache behavior, but the in-place mutation itself is still unsafe and unnecessary.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> built-in provider success, `AC-001`
- `REQ-002` -> Gemini success, `AC-002`
- `REQ-003` -> shared fixed-provider state sync, `AC-001`, `AC-002`
- `REQ-004` -> regression protection, `AC-004`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> built-in provider success path stays success-only
- `AC-002` -> Gemini success path stays success-only
- `AC-003` -> custom provider non-regression
- `AC-004` -> immutable hydrated-row regression coverage

## Approval Status

Refined from investigation; ready for implementation and validation.
