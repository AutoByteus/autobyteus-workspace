# Requirements — Disable Artifact Auto-Focus

Status: Design-ready

## Problem Statement

The right-side workspace tab shell currently switches to the Artifacts tab whenever the active run receives a newly visible file-change/artifact signal. During active runs that emit many file changes, this repeatedly steals focus from whatever tab the user intentionally selected, making Files, Team, Terminal, Activity, Browser, and other right-side tabs difficult or impossible to use.

## Goals

- Stop automatic right-side tab focus changes caused only by new artifact/file-change visibility.
- Preserve artifact ingestion, listing, previewing, and latest-row selection when the user manually opens the Artifacts tab.
- Keep unrelated right-side tab behavior unchanged.
- Provide executable regression coverage for the no-focus-stealing behavior.
- Update durable documentation that currently describes Artifacts auto-focus.

## Non-Goals

- Do not remove the Artifacts tab.
- Do not remove `RunFileChangesStore` latest-visible artifact tracking; it is still useful inside `ArtifactsTab.vue` for row selection/refresh.
- Do not change backend `FILE_CHANGE` emission or run-file-change storage.
- Do not alter generic file explorer WebSocket handling.
- Do not introduce a preference toggle unless a future requirement asks for configurable auto-focus.

## Acceptance Criteria

| ID | Acceptance Criterion |
| --- | --- |
| AC1 | While any non-Artifacts right-side tab is active, a newly visible artifact signal must not call `setActiveTab('artifacts')` or otherwise change the right-side active tab. |
| AC2 | Repeated artifact signals must not trap the user on Artifacts or prevent manual use of other right-side tabs. |
| AC3 | Artifact rows must still be ingested into `RunFileChangesStore` from live `FILE_CHANGE` events. |
| AC4 | When the user manually opens Artifacts, `ArtifactsTab.vue` must still select/show the newest artifact using existing latest-visible signal behavior. |
| AC5 | Existing intentional tab switching for selected profile type, visible-tab validity, todo population, file-open behavior, and browser open-tab behavior must remain unchanged. |
| AC6 | Tests must cover that `RightSideTabs.vue` ignores newly visible artifact signals for focus switching. |
| AC7 | Durable architecture/docs references must no longer claim that latest-visible artifacts auto-focus the Artifacts tab. |

## Proposed Scope Classification

Small frontend behavior change. The root cause is localized to `RightSideTabs.vue` plus its component test and one documentation statement. No backend, protocol, or data model change is required.
