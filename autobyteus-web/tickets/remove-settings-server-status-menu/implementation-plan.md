# Implementation Plan

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Change is localized to settings navigation/state resolution and related page tests.
  - No backend/API/schema changes.
  - Existing server diagnostics surface already exists inside `ServerSettingsManager` advanced panel.
- Workflow Depth:
  - `Small` -> draft implementation plan (solution sketch) -> design-based runtime call stack -> runtime call stack review -> refine until review-pass -> progress tracking.

## Plan Maturity

- Current Status: `Call-Stack-Review-Validated`
- Notes:
  - This plan removes the redundant top-level `Server Status` settings section and keeps diagnostics inside `Server Settings -> Advanced / Developer`.

## Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - Embedded window settings navigation no longer shows a separate `Server Status` menu item.
  - Embedded window default section selection for non-running server points to `server-settings`.
  - Query parameter handling for legacy `section=server-status` is normalized to `server-settings` (embedded) or `api-keys` (remote).
- Touched Files/Modules:
  - `pages/settings.vue` (menu, section rendering, mount-time section resolution)
  - `pages/__tests__/settings.spec.ts` (updated expectations and route/default-section tests)
- API/Behavior Delta:
  - Remove standalone settings-section key/path `server-status` from the page-level sidebar and content switch.
  - Keep server diagnostics available via `components/settings/ServerSettingsManager.vue` advanced panel (`server-status` advanced sub-panel unchanged).
- Key Assumptions:
  - Product decision is to consolidate diagnostics under Server Settings and remove duplicate entry points.
  - No external hard dependency requires page-level `section=server-status` semantics.
- Known Risks:
  - Existing deep links/bookmarks using `section=server-status` could land on an unexpected tab if not normalized.
  - Removing top-level status indicator icon may reduce quick visibility; this is accepted by consolidation decision.

## Runtime Call Stack Review Gate (Required Before Implementation)

| Use Case | Call Stack Location | Review Location | Business Flow Completeness | Structure & SoC Check | Dependency Flow Smells | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Consolidated embedded settings navigation | `tickets/remove-settings-server-status-menu/design-based-runtime-call-stack.md` | `tickets/remove-settings-server-status-menu/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Initial section resolution on mount | `tickets/remove-settings-server-status-menu/design-based-runtime-call-stack.md` | `tickets/remove-settings-server-status-menu/runtime-call-stack-review.md` | Pass | Pass | None | Pass |
| Remote window sanitization | `tickets/remove-settings-server-status-menu/design-based-runtime-call-stack.md` | `tickets/remove-settings-server-status-menu/runtime-call-stack-review.md` | Pass | Pass | None | Pass |

## Go / No-Go Decision

- Decision: `Go`
- If `No-Go`, required refinement target:
  - `Small`: refine implementation plan, regenerate call stack, and re-run review.

## Principles

- Bottom-up: adjust section resolution rules before template rendering dependencies.
- Test-driven: update/add page tests for section normalization and defaults alongside implementation.
- Default modernization rule: no legacy UI surface retention for the removed top-level menu.
- One file at a time default applies.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `pages/settings.vue` | Existing `ServerSettingsManager` advanced diagnostics surface | Core behavior changes happen here (menu removal and section state mapping). |
| 2 | `pages/__tests__/settings.spec.ts` | `pages/settings.vue` behavior | Assertions must match new consolidated navigation semantics. |

## Design Delta Traceability (Required For `Medium/Large`)

- Not required for `Small` scope.

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Top-level settings menu entry `Server Status` | `Remove` | Delete sidebar button markup and icon/status badge logic. | Minimal UI regression risk; intentional UX simplification. |
| T-DEL-002 | Top-level content route `activeSection === 'server-status'` | `Remove` | Remove page-level `ServerMonitor` render branch and import if no longer needed. | Must keep diagnostics reachable inside `ServerSettingsManager`. |
| T-DEL-003 | Mount-time default `non-running -> server-status` | `Rename` | Replace with `non-running -> server-settings`; normalize legacy query section value. | Deep-link behavior changes; verify in tests. |

## Compatibility Exception Register (Only If Explicitly Required)

| Exception ID | Legacy Surface To Keep Temporarily | Rationale | Expiration/Removal Condition | Planned Cleanup Task |
| --- | --- | --- | --- | --- |
| EX-001 | Query normalization for `section=server-status` to `server-settings` | Avoid broken bookmarks while removing redundant UI path. | Remove once no inbound links rely on old query value. | Optional follow-up after telemetry/manual verification. |

## Step-By-Step Plan

1. Update `pages/settings.vue` to remove the standalone `Server Status` sidebar menu item and page-level `ServerMonitor` branch.
2. Refactor mount-time section resolution to use `server-settings` as the embedded non-running default and normalize legacy `server-status` query values.
3. Update `pages/__tests__/settings.spec.ts` to assert consolidated behavior and remove obsolete standalone-status assumptions.
4. Run targeted test command: `pnpm test:nuxt pages/__tests__/settings.spec.ts --run`.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `pages/settings.vue` | No standalone `server-status` menu section or content switch; mount logic routes to valid consolidated section. | Covered by page spec assertions on `activeSection` and rendered menu labels. | N/A | Ensure remote-window fallback remains intact. |
| `pages/__tests__/settings.spec.ts` | Tests reflect consolidated flow and pass. | `settings.spec.ts` passes with updated expectations. | N/A | Keep stubs minimal and aligned with actual imports. |

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | `Not Needed` | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None identified in planning | `pages/settings.vue`, `components/settings/ServerSettingsManager.vue` | N/A | N/A | Pending |

## Test Strategy

- Unit tests:
  - `pages/__tests__/settings.spec.ts` route-section and default-section assertions.
- Integration tests:
  - N/A for this localized UI/menu consolidation.
- Test data / fixtures:
  - Existing mocked route/server/window-context stores in `settings.spec.ts`.
