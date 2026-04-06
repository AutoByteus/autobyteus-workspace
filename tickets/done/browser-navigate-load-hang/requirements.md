# Requirements - browser-navigate-load-hang

## Status

- Current Status: `Design-ready`
- Last Updated: `2026-04-06`

## Goal / Problem Statement

The Electron browser tool path must not leave agent `navigate_to` calls stuck in `RUNNING` when `wait_until` is `load` or `domcontentloaded`. Recent user reports show that a tab opened successfully via `open_tab`, but a later `navigate_to` never returns even though the browser session URL may change. The fix must make navigation completion and failure reporting reliable across the real navigation types Electron emits.

## In-Scope Use Cases

| Use Case ID | Description |
| --- | --- |
| UC-001 | Agent opens a browser tab and then calls `navigate_to` to a normal document navigation that completes successfully. |
| UC-002 | Agent calls `navigate_to` for a same-document or in-page navigation path that changes URL state without a full page reload. |
| UC-003 | Agent calls `navigate_to` for a navigation that fails, is cancelled, or otherwise cannot reach the requested ready state. |
| UC-004 | Maintainer needs Stage 7 handoff evidence plus a built Electron desktop artifact path so the user can validate the fix manually when direct in-session E2E confirmation is constrained. |

## Scope Classification

- Confirmed Scope: `Small`
- Why: The authoritative owner is concentrated in the Electron browser navigation helper and its direct browser tests. Current evidence does not require a broader subsystem redesign.

## Requirements

| Requirement ID | Requirement | Expected Outcome |
| --- | --- | --- |
| R-001 | `navigate_to` must settle for successful document navigations when the requested `wait_until` state is reached. | Browser bridge returns a `navigated` result instead of leaving the tool invocation open indefinitely. |
| R-002 | `navigate_to` must also settle for successful same-document or in-page navigations that update the page URL without a full reload. | Browser bridge returns success for the target tab and records the new URL instead of hanging on load-only events. |
| R-003 | Failed, cancelled, or provisional navigation failures must reject with a browser navigation error instead of hanging forever. | Agent receives a deterministic browser error payload when Electron reports navigation failure or cancellation. |
| R-004 | The navigation completion logic must use Electron signals that accurately represent the authoritative navigation lifecycle rather than a narrow subset of events. | Browser readiness wait logic remains correct across supported navigation classes and is easier to reason about during future maintenance. |
| R-005 | Stage 7 must produce a user-testable handoff path even if full local executable validation remains partially human-assisted. | Ticket artifacts include build/run instructions and the Electron app is built so the user can test the fix directly. |

## Acceptance Criteria

| Acceptance Criteria ID | Requirement ID | Scenario | Expected Result |
| --- | --- | --- | --- |
| AC-001 | R-001 | `navigate_to` targets a normal URL change that performs a full document navigation. | The browser bridge returns `{ status: "navigated" }` for the target `tab_id` and the tab summary reflects the new URL. |
| AC-002 | R-002 | `navigate_to` targets a same-document navigation path such as hash/history-driven URL mutation. | The navigation request resolves successfully without waiting forever on `did-finish-load`, and the tab URL updates to the requested URL. |
| AC-003 | R-003 | Electron reports a failed or provisional/cancelled main-frame navigation during `navigate_to`. | The request rejects with `browser_navigation_failed` instead of remaining in progress. |
| AC-004 | R-004 | Browser navigation wait logic is reviewed against Electron navigation semantics. | The implementation and ticket design artifacts identify which Electron signals are authoritative for success and failure across document and in-page navigation. |
| AC-005 | R-005 | Stage 7 reaches the user-handoff point. | `api-e2e-testing.md` records the automated evidence gathered, the manual-user validation steps, and the Electron app build command/output path used for handoff. |

## Constraints / Dependencies

- The fix lives in the Electron browser subsystem under `autobyteus-web/electron/browser/`.
- The server-side browser tool contract and bridge client must remain compatible with the existing browser tool surface.
- Direct end-to-end validation of the packaged Electron UI is constrained in-session; the user explicitly wants the Electron app built at Stage 7 so they can test it themselves.
- Scope should stay focused on the browser navigation lifecycle unless investigation proves the hang originates in a different boundary.

## Assumptions

- This ticket is likely `Small` unless investigation reveals a broader browser-session architecture gap.
- The current hang is caused by mismatched readiness/failure waiting semantics rather than by the server tool manifest or argument parsing.
- A targeted fix plus stronger browser subsystem tests should be sufficient.
- Building the Electron desktop app in Stage 7 is acceptable validation handoff evidence for the user-driven final check.

## Open Questions / Risks

- Whether `webContents.loadURL()` promise settlement alone is sufficient, or whether the implementation must also explicitly handle in-page navigation events and provisional failures.
- Whether `reload()` shares the same blind spots as `navigate_to`.
- Whether a timeout guard is required to prevent future indefinite waits even when Electron emits neither success nor failure.
- Whether existing fake-browser tests hide the bug because they do not model the relevant Electron event combinations.

## Requirement To Use Case Coverage

| Requirement ID | Covered Use Case IDs |
| --- | --- |
| R-001 | UC-001 |
| R-002 | UC-002 |
| R-003 | UC-003 |
| R-004 | UC-001, UC-002, UC-003 |
| R-005 | UC-004 |

## Requirement To Acceptance Coverage

| Requirement ID | Covered By Acceptance Criteria |
| --- | --- |
| R-001 | AC-001 |
| R-002 | AC-002 |
| R-003 | AC-003 |
| R-004 | AC-004 |
| R-005 | AC-005 |

## Acceptance Criteria To Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Prove full document navigation success completes the browser bridge call. |
| AC-002 | Prove same-document navigation no longer hangs on load-only waits. |
| AC-003 | Prove failure or cancellation surfaces a deterministic browser error. |
| AC-004 | Prove the design and implementation align with Electron navigation semantics. |
| AC-005 | Prove Stage 7 produces a build-backed user validation handoff. |
