# Requirements: Browser Empty Tab Strip Cleanup

Status: Design-ready

## User Intent
When the Browser side tab has no open browser tabs, remove the visually awkward empty tab-strip row that currently only contains the maximize/zen button. The Browser empty state should feel intentional and compact.

## Functional Requirements
1. Zero-tab Browser chrome must not render the browser tab-strip row.
2. Zero-tab Browser chrome must keep the URL/open-tab toolbar visible directly below the main right-panel tab header.
3. The maximize/zen button must remain visible in the tab-strip row when one or more Browser tabs exist.
4. The address input must still open a new browser tab when a URL is submitted and there is no active tab.
5. Active-tab controls (refresh, device emulation, close) remain disabled when there is no active tab.
6. The empty Browser content message remains visible when Browser is available and `sessions.length === 0`.

## Non-Functional Requirements
- Keep the change localized to Browser panel presentation logic unless tests require direct coverage updates.
- Preserve existing Browser shell store and Electron IPC behavior.
- Preserve current localization keys; no copy change is required for this improvement.
- Do not introduce hidden legacy paths or duplicate Browser chrome structures.

## Acceptance Criteria
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AC1 | Browser is available and `sessions.length === 0` | No `Maximize Browser view` button is rendered; no empty tab row appears. |
| AC2 | Browser is available and `sessions.length === 0` | URL input and open-new-tab button are visible and usable. |
| AC3 | Browser has one or more sessions | Session tabs render and the `Maximize Browser view` button is available. |
| AC4 | User enters a URL in zero-tab state and submits | Browser shell opens a new tab using the normalized URL. |
| AC5 | Browser returns to zero tabs after closing the active tab | Empty-state message is visible and the empty tab strip/maximize row is not shown. |

## Coverage Map
- AC1, AC2: BrowserPanel component test for empty-state chrome.
- AC3: BrowserPanel component test for session chrome/full-view affordance.
- AC4: Existing BrowserPanel open-tab tests.
- AC5: BrowserPanel close-active-tab regression assertion.
