# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning: Frontend behavior adjustment with targeted test updates across four files; no schema/storage or cross-service changes.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking (proposed design doc optional)

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: A proposed design doc is included to satisfy requested rigor although scope is small.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Remote node windows can open/manage Server Settings.
  - Embedded windows preserve existing startup routing and diagnostics behavior.
  - Remote windows do not expose embedded process diagnostics controls.
- Touched Files/Modules:
  - `pages/settings.vue`
  - `components/settings/ServerSettingsManager.vue`
  - `pages/__tests__/settings.spec.ts`
  - `components/settings/__tests__/ServerSettingsManager.spec.ts`
- API/Behavior Delta:
  - Remove remote denial of Server Settings section.
  - Keep embedded-only monitor controls in advanced panel.
- Key Assumptions:
  - Remote nodes support existing settings GraphQL operations.
- Known Risks:
  - Tests may be tightly coupled to prior embedded-only assumptions.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Remote window edits server settings | `tickets/remote-server-settings-remote-window/design-based-runtime-call-stack.md` | `tickets/remote-server-settings-remote-window/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Embedded startup default behavior preserved | `tickets/remote-server-settings-remote-window/design-based-runtime-call-stack.md` | `tickets/remote-server-settings-remote-window/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Remote advanced diagnostics remains hidden | `tickets/remote-server-settings-remote-window/design-based-runtime-call-stack.md` | `tickets/remote-server-settings-remote-window/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan (and add design notes if needed), then regenerate call stack and re-review.

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: update/add tests with implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- One file at a time is the default.
- Update progress after each meaningful status change.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `pages/settings.vue` | none | Top-level route/menu gating change |
| 2 | `components/settings/ServerSettingsManager.vue` | none | Section internals + diagnostics boundary |
| 3 | `pages/__tests__/settings.spec.ts` | 1 | Validate routing/menu behavior |
| 4 | `components/settings/__tests__/ServerSettingsManager.spec.ts` | 2 | Validate remote and embedded advanced panel behavior |

## Step-By-Step Plan

1. Remove embedded-only gate for server-settings menu/section in `pages/settings.vue` and keep embedded startup default logic only.
2. Remove remote-deny wrapper in `ServerSettingsManager.vue`; keep embedded-only diagnostics (server-status tab) gated.
3. Update settings page tests to assert server settings visibility/route behavior in remote windows.
4. Add/update manager tests for remote rendering and diagnostics gating.
5. Run targeted Vitest suites and update progress tracker with results.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `pages/settings.vue` | Server settings visible/selectable in all windows | `pages/__tests__/settings.spec.ts` updated and passing | N/A | Preserve embedded startup default |
| `components/settings/ServerSettingsManager.vue` | Remote loads settings, diagnostics button hidden for remote | `components/settings/__tests__/ServerSettingsManager.spec.ts` passing | N/A | Keep monitor boundary embedded-only |
| `pages/__tests__/settings.spec.ts` | New expectations for remote server settings | Passing | N/A | Remove obsolete embedded-only assertions |
| `components/settings/__tests__/ServerSettingsManager.spec.ts` | Covers remote behavior | Passing | N/A | Include diagnostic visibility assertions |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | N/A | `Not Needed` | Codex |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Pending |

## Test Strategy

- Unit tests:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web exec vitest --run pages/__tests__/settings.spec.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-web exec vitest --run components/settings/__tests__/ServerSettingsManager.spec.ts`
- Integration tests: N/A.
- Test data / fixtures: existing component test stubs and testing pinia fixtures.
