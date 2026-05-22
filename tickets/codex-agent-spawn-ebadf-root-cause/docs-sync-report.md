# Docs Sync Report

## Scope

- Ticket: `codex-agent-spawn-ebadf-root-cause`
- Trigger: API/E2E validation passed after code review round 3; delivery note identified stale durable file-explorer docs.
- Bootstrap base reference: not explicitly recorded in upstream artifacts; delivery inferred the tracked base/finalization target from the ticket branch upstream, `origin/personal`.
- Integrated base reference used for docs sync: `origin/personal@e66d338f42cdbd2e8709a7a78026e35dfdb9a8f0`.
- Post-integration verification reference: ticket branch HEAD `68468456d822f5d2af74f38591935b4631c6ddbd` after merging `origin/personal`; post-integration checks logged under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/`.

## Why Docs Were Updated

- Summary: `autobyteus-web/docs/file_explorer.md` still described old stream method names and implied workspace/subscription-driven watcher behavior. Delivery updated it to the integrated implementation: visible file explorer consumers acquire/release live sessions, one frontend WebSocket stream is shared per workspace, GraphQL snapshot/search/file operations stay watcher-free, backend watcher leases are owned by WebSocket sessions, and mutation echoes are filtered. `autobyteus-server-ts/docs/modules/file_explorer.md` was expanded from a stub to record backend lease/resource invariants and durable E2E coverage.
- Why this should live in long-lived project docs: future file-explorer, workspace, and Codex app-server runtime changes need the watcher-lifecycle contract to avoid reintroducing leaked chokidar watchers, descriptor pressure, or stale frontend stream ownership assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Explicit API/E2E delivery note said it documented old stream method names and old watcher behavior. | Updated | Replaced stale live-sync documentation with visible-consumer live sessions, snapshot refresh, watcher lease lifecycle, backend files, and current workspace-scoped store usage. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Backend watcher lease/resource invariants were durable runtime knowledge but the doc was only a short source index. | Updated | Added snapshot operation contract, WebSocket lease lifecycle, resource-safety invariants, Codex spawn diagnostics, and durable E2E reference. |
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

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Old frontend docs for `subscribeToWorkspaceChanges`, `connectToFileSystemChanges`, and `disconnectFromFileSystemChanges` as component-facing stream APIs. | `acquireFileExplorerLiveSession(workspaceId, consumerId)` / `releaseFileExplorerLiveSession(workspaceId, consumerId)` with internal `connectFileExplorerLiveStream` / `disconnectFileExplorerLiveStream`. | `autobyteus-web/docs/file_explorer.md` |
| Workspace-load or search-driven persistent watcher assumptions. | Request/response snapshot operations that do not start live watchers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Always-on watcher lifetime tied to cached workspace/file explorer objects. | Session-owned watcher leases tied to live WebSocket lifecycle and visible frontend consumers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: not applicable; docs were updated.
- Rationale: not applicable.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Documentation sync is complete against integrated branch state `68468456d822f5d2af74f38591935b4631c6ddbd`; repository finalization is intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: not applicable.
- Recommended recipient: not applicable.
- Why docs could not be finalized truthfully: not applicable.
