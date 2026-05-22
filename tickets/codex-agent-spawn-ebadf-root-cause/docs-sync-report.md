# Docs Sync Report

## Scope

- Ticket: `codex-agent-spawn-ebadf-root-cause`
- Trigger: API/E2E validation passed, repository-resident durable validation was re-reviewed by code review round 5, and delivery was asked to ensure the ticket branch is based on the latest `origin/personal` before producing a macOS Electron build.
- Bootstrap base reference: not explicitly recorded in upstream artifacts; delivery inferred the tracked base/finalization target from the ticket branch upstream, `origin/personal`.
- Latest tracked base used for the current delivery refresh: `origin/personal@fcf435ec1894de13fad54002cd70e62d59dd12b8`.
- Integrated branch reference used for docs sync: `717b6719616887bce70a4e0c7158432420bb834c` after merging latest `origin/personal`.
- Current delivery status: docs remain synchronized with the round-5-reviewed implementation and latest-base integrated state; finalization remains paused pending explicit user verification.

## Why Docs Were Updated

- Summary: delivery updated `autobyteus-web/docs/file_explorer.md` because it still described old stream method names and implied workspace/subscription-driven watcher behavior. The doc now records the integrated implementation: visible file explorer consumers acquire/release live sessions, one frontend WebSocket stream is shared per workspace, GraphQL snapshot/search/file operations stay watcher-free, backend watcher leases are owned by WebSocket sessions, and mutation echoes are filtered. Delivery also expanded `autobyteus-server-ts/docs/modules/file_explorer.md` from a stub into backend watcher/resource invariants and durable E2E coverage.
- Round 5 re-check: code review round 5 changed durable validation only; no product behavior or public docs semantics changed. Delivery rechecked the docs after merging latest `origin/personal@fcf435ec1894de13fad54002cd70e62d59dd12b8` and no additional docs edits were needed beyond refreshing this report/handoff metadata.
- Why this should live in long-lived project docs: future file-explorer, workspace, and Codex app-server runtime changes need the watcher-lifecycle contract to avoid reintroducing leaked chokidar watchers, descriptor pressure, or stale frontend stream ownership assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Explicit API/E2E delivery note said it documented old stream method names and old watcher behavior. | Updated | Replaced stale live-sync documentation with visible-consumer live sessions, snapshot refresh, watcher lease lifecycle, backend files, and current workspace-scoped store usage. Rechecked after the round-5 validation-only change and latest-base merge. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Backend watcher lease/resource invariants were durable runtime knowledge but the doc was only a short source index. | Updated | Added snapshot operation contract, WebSocket lease lifecycle, resource-safety invariants, Codex spawn diagnostics, and durable E2E reference. Rechecked after the round-5 validation-only change and latest-base merge. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/content_rendering.md` | Related from file explorer doc for file-content rendering behavior. | No change | Rendering behavior was not changed by this ticket. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Related active-workspace doc from file explorer page. | No change | Terminal behavior was not changed by this ticket. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Behavioral architecture update | Documented `acquireFileExplorerLiveSession` / `releaseFileExplorerLiveSession`, one stream per workspace with multiple visible consumers, snapshot refresh on acquisition, backend watcher lease ownership, current search debounce/search strategy details, workspace-scoped store call signatures, and echo suppression. | Replaces obsolete stream method names and old watcher assumptions with the final integrated implementation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Durable backend runtime note | Added snapshot/watcher separation, WebSocket watcher lease lifecycle, resource-safety invariants, Codex spawn descriptor-pressure diagnostics, and durable E2E regression path. | Promotes root-cause and validation knowledge into canonical server docs rather than leaving it only in ticket artifacts. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Visible-consumer live sessions | Watchers are acquired only while visible file explorer consumers exist; multiple consumers share one frontend stream and the final release disconnects it. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/file_explorer.md` |
| Backend watcher lease ownership | WebSocket sessions own watcher leases; `LocalFileExplorer` starts the watcher on first lease and stops it after final release, including early-close cleanup. | `root-cause-report.md`, `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Snapshot/search operations are watcher-free | GraphQL workspace, folder, content, mutation, and search APIs must not retain watchers; search index refresh is snapshot traversal based. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Mutation echo filtering | Frontend applies mutation results immediately and filters later stream echoes; text saves use modify-echo suppression. | `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/file_explorer.md` |
| Descriptor-pressure diagnostics | Codex app-server spawn failures now include runtime command/cwd/args/error/open-fd diagnostics and descriptor-pressure hints for `EBADF`/`EMFILE`/`ENFILE`. | `root-cause-report.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Round 5 durable validation tightening | Expanded E2E now requires explicit non-empty write/delete change events instead of allowing empty `changes` arrays. | `review-report.md`, `api-e2e-validation-report.md` | Durable test source only; no long-lived behavioral docs change required. |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Old frontend docs for `subscribeToWorkspaceChanges`, `connectToFileSystemChanges`, and `disconnectFromFileSystemChanges` as component-facing stream APIs. | `acquireFileExplorerLiveSession(workspaceId, consumerId)` / `releaseFileExplorerLiveSession(workspaceId, consumerId)` with internal `connectFileExplorerLiveStream` / `disconnectFileExplorerLiveStream`. | `autobyteus-web/docs/file_explorer.md` |
| Workspace-load or search-driven persistent watcher assumptions. | Request/response snapshot operations that do not start live watchers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Always-on watcher lifetime tied to cached workspace/file explorer objects. | Session-owned watcher leases tied to live WebSocket lifecycle and visible frontend consumers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |

## No-Impact Decision

- Docs impact after code review round 5: no additional long-lived docs edits were needed.
- Rationale: round 5 tightened repository-resident durable validation expectations for GraphQL file operation change events and did not alter product behavior or the file-explorer runtime contract already documented.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Documentation sync is complete against integrated branch state `717b6719616887bce70a4e0c7158432420bb834c`; repository finalization is intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: not applicable.
- Recommended recipient: not applicable.
- Why docs could not be finalized truthfully: not applicable.
