# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - Primary implementation is localized to one UI component (`ServerSettingsManager.vue`) and its unit test (`ServerSettingsManager.spec.ts`).
  - No backend API/schema/storage changes; GraphQL contract remains `updateServerSetting(key, value)`.
  - UI behavior changes are substantial but contained to settings presentation and client-side serialization/parsing.
- Workflow Depth:
  - `Small` -> implementation plan -> code-stack analysis/review -> implementation.
  - `Medium/Large` -> proposed design doc -> design-based runtime call stack -> runtime call stack review -> implementation.
  - Note: for this ticket, implementation plan is treated as a supplemental execution checklist, not a design gate.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes:
  - Design-first workflow in effect: proposed design created first, call stack and review validated against it, then implementation proceeds.

## Solution Sketch (Optional For `Medium/Large`)

- Use Cases In Scope:
  - Quick Setup provider cards support endpoint row add/edit/remove and per-card save.
  - Quick Setup per-provider save serializes endpoint rows back into existing server setting strings.
  - Advanced mode removes redundant "Developer Tools" heading while preserving segmented control (`All Settings` / `Server Status & Logs`) and raw table behavior.
  - Basics visual cleanup reduces border density without changing interactions or save boundaries.
- Touched Files/Modules:
  - `components/settings/ServerSettingsManager.vue`
  - `components/settings/__tests__/ServerSettingsManager.spec.ts`
- API/Behavior Delta:
  - Quick setup no longer exposes one free-form text input per provider.
  - Quick setup now exposes structured row editors and converts row data to existing comma-separated storage format at save boundaries.
  - Advanced mode top block simplified: helper text + segmented control (no duplicate heading).
- Key Assumptions:
  - Backend must continue receiving the same string values per setting key.
  - Host and port are the primary required fields for endpoint rows.
  - VNC setting remains host:port based (no protocol persisted in saved string).
- Known Risks:
  - Parser/serializer mismatch could mutate existing settings unexpectedly.
  - Existing tests expecting direct text input fields will require refactor.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Quick Setup endpoint row editing | `tickets/server-settings-ui-improvements/design-based-runtime-call-stack.md` | `tickets/server-settings-ui-improvements/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Quick Setup save serialization | `tickets/server-settings-ui-improvements/design-based-runtime-call-stack.md` | `tickets/server-settings-ui-improvements/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Advanced header simplification | `tickets/server-settings-ui-improvements/design-based-runtime-call-stack.md` | `tickets/server-settings-ui-improvements/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Basics visual de-noising | `tickets/server-settings-ui-improvements/design-based-runtime-call-stack.md` | `tickets/server-settings-ui-improvements/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`

## Principles

- Bottom-up: implement row parsing/serialization helpers first, then wire template.
- Test-driven: update component tests alongside behavior changes.
- Mandatory modernization rule: remove legacy quick-setup text-input UI path entirely; no compatibility dual-UI rendering.
- One file at a time default applies.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `components/settings/ServerSettingsManager.vue` | Existing store contract | Core behavior and UI transformation live here. |
| 2 | `components/settings/__tests__/ServerSettingsManager.spec.ts` | Updated component behavior/selectors | Tests must validate new UI contract and prevent regressions. |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-001 | Yes | Component unit tests + manual quick setup sanity check |
| C-002 | Modify | T-002 | Yes | Component unit tests for advanced top section text/controls |
| C-003 | Modify | T-003 | No | Updated spec assertions pass |
| C-004 | Remove | T-001 | Yes | Diff + tests confirm legacy free-form quick input path removed |
| C-005 | Modify | T-004 | No | Targeted settings tests + visual check for lower border density |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Quick setup raw text input controls | `Remove` | Delete template/input controls and related assumptions tied to free-form comma strings. | Test expectations must be updated. |
| T-DEL-002 | Advanced header text `Developer Tools` | `Remove` | Replace with concise helper row + segmented control grouping. | Must retain visual clarity after removal. |

## Step-By-Step Plan

1. T-001: Refactor quick field model into endpoint-row configuration with parser/serializer helpers per provider type and remove legacy free-form quick input rendering path.
2. T-002: Simplify advanced panel top section by removing redundant heading and preserving segmented panel controls.
3. T-003: Update `ServerSettingsManager.spec.ts` for row-based quick setup behavior and advanced top section assertions.
4. T-004: Flatten Basics container chrome from many bordered cards to one soft section container with subtle dividers and lighter control surfaces.
5. Run targeted unit tests.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `components/settings/ServerSettingsManager.vue` | Quick setup uses structured endpoint rows; save actions persist serialized strings; advanced header simplified; basics visual noise reduced with softer container/divider treatment. | Covered by `ServerSettingsManager.spec.ts` for quick setup rendering and advanced tab behavior. | N/A | Preserve existing store/mutation contract. |
| `components/settings/__tests__/ServerSettingsManager.spec.ts` | Assertions reflect new structured quick setup and unchanged advanced/server-status navigation behavior. | Spec passes in targeted run. | N/A | Replace brittle text-input assumptions with row-based selectors/assertions. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None identified in planning | `ServerSettingsManager.vue` + component spec | N/A | N/A | Pending |

## Test Strategy

- Unit tests:
  - `components/settings/__tests__/ServerSettingsManager.spec.ts`
- Integration tests:
  - N/A for this localized component refactor.
- Test data / fixtures:
  - Existing mocked store settings values for LM/Ollama/AutoByteus LLM/VNC keys.
