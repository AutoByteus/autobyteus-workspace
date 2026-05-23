# Docs Sync Report


## Latest Delivery Status — Blocked On Latest-Base Merge (2026-05-23)

Delivery attempted the post API/E2E Round 7 integrated-state refresh against latest `origin/personal@74218467a2f7786c82f3e97b9190058d2cb83bd2`. A local safety checkpoint of the Round 12-reviewed / Round 7 API/E2E-passed candidate was created at `8d2cda4ed85d529802ed7caf66aa010b0e65f303`, then `git merge --no-edit origin/personal` produced conflicts in mobile/terminal source, mobile tests, and `autobyteus-web/docs/terminal.md`. The merge was aborted to preserve the reviewed candidate cleanly. Delivery is blocked until implementation resolves the latest-base merge conflicts.

Blocker artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/delivery-blocker-round13-latest-personal-merge-conflicts.md`

## Scope

- Ticket: `codex-agent-spawn-ebadf-root-cause`
- Trigger: API/E2E round 5 passed, repository-resident durable validation was re-reviewed by code review round 9, delivery was asked to read the Electron README and produce a macOS Electron build, and a delivery-discovered localization Local Fix was returned by implementation.
- Bootstrap base reference: not explicitly recorded in upstream artifacts; delivery inferred the tracked base/finalization target from the ticket branch upstream, `origin/personal`.
- Latest tracked base used for the current delivery refresh: `origin/personal@5875b06d87d3c92b80c0dfa3675eea844324cb7c`.
- Integrated branch reference used for docs sync and build verification: `916e90349d4719638930ad3eae5a92c768a6ab95` after confirming latest `origin/personal` and committing the round-9 localization Local Fix checkpoint.
- Current delivery status: docs remain synchronized with the round-9-reviewed implementation plus the narrow localization Local Fix; the requested Electron artifacts were built and verified locally; repository finalization remains paused pending explicit user verification.


## Latest Delivery Refresh — 2026-05-23

- Remote base advanced after the prior delivery handoff. Delivery fetched and merged `origin/personal@5875b06d87d3c92b80c0dfa3675eea844324cb7c` into the ticket branch.
- Integrated build-source HEAD: `03f093c73e25070f560f11dbf486cf5bd0ee1d8a`.
- Post-merge durable validation passed: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-post-latest-personal-integrated-checks-20260523061140.log`.
- Current macOS Electron build passed for version `1.3.28`, and DMG verification passed. Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-latest-personal-20260523061215.log`.
- Docs impact from the latest base refresh and rebuild: no additional long-lived docs changes required for this ticket; existing file-explorer watcher-lifecycle docs remain applicable.

## Why Docs Were Updated

- Summary: delivery updated `autobyteus-web/docs/file_explorer.md` because it still described old stream method names and implied workspace/subscription-driven watcher behavior. The doc now records the integrated implementation: visible file explorer consumers acquire/release live sessions, one frontend WebSocket stream is shared per workspace, GraphQL snapshot/search/file operations stay watcher-free, backend watcher leases are owned by WebSocket sessions, and mutation echoes are filtered. Delivery also expanded `autobyteus-server-ts/docs/modules/file_explorer.md` from a stub into backend watcher/resource invariants and durable E2E coverage.
- Round 9 re-check: API/E2E round 5 added or updated durable validation for `workspaceReference(rootPath:)` and current `TeamRunHistoryCatalogService` boundaries; code review round 9 passed that durable validation. Those validation updates did not require additional long-lived docs edits beyond this report/handoff metadata because the product-facing file-explorer/watcher contract was already documented.
- Localization Local Fix re-check: implementation replaced the hard-coded Terminal retry label with localized catalog keys. This only corrected a localization audit failure in the Electron build path and did not change the documented file-explorer or watcher behavior.
- Why this should live in long-lived project docs: future file-explorer, workspace, and Codex app-server runtime changes need the watcher-lifecycle contract to avoid reintroducing leaked chokidar watchers, descriptor pressure, or stale frontend stream ownership assumptions.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Explicit API/E2E delivery note said it documented old stream method names and old watcher behavior. | Updated | Replaced stale live-sync documentation with visible-consumer live sessions, snapshot refresh, watcher lease lifecycle, backend files, and current workspace-scoped store usage. Rechecked after round-9 durable validation and localization Local Fix. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Backend watcher lease/resource invariants were durable runtime knowledge but the doc was only a short source index. | Updated | Added snapshot operation contract, WebSocket lease lifecycle, resource-safety invariants, Codex spawn diagnostics, and durable E2E reference. Rechecked after round-9 durable validation and localization Local Fix. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/content_rendering.md` | Related from file explorer doc for file-content rendering behavior. | No change | Rendering behavior was not changed by this ticket. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Related active-workspace doc from file explorer page and touched by the localization Local Fix. | No change | Terminal runtime behavior did not change; the Local Fix only localized an existing retry label. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/README.md` | User explicitly asked delivery to read the README before building Electron. | No change | README already documents `pnpm build:electron:mac`, `electron-dist`, and the local macOS verbose/no-notarization command pattern. |

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
| Round 9 durable validation coverage | `workspaceReference(rootPath:)` is covered without workspace initialization, later create reuses deterministic identity, and team-run history catalog assertions reflect the current service boundary. | `review-report.md`, `api-e2e-validation-report.md` | Durable test source only; no long-lived behavioral docs change required. |
| High-churn descriptor/Codex activation evidence | Embedded backend high-churn validation showed watcher-light snapshot APIs, no open/close leak, successful child-process spawn, and Codex app-server provider activation after churn. | `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/file_explorer.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Old frontend docs for `subscribeToWorkspaceChanges`, `connectToFileSystemChanges`, and `disconnectFromFileSystemChanges` as component-facing stream APIs. | `acquireFileExplorerLiveSession(workspaceId, consumerId)` / `releaseFileExplorerLiveSession(workspaceId, consumerId)` with internal `connectFileExplorerLiveStream` / `disconnectFileExplorerLiveStream`. | `autobyteus-web/docs/file_explorer.md` |
| Workspace-load or search-driven persistent watcher assumptions. | Request/response snapshot operations that do not start live watchers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Always-on watcher lifetime tied to cached workspace/file explorer objects. | Session-owned watcher leases tied to live WebSocket lifecycle and visible frontend consumers. | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Hard-coded Terminal retry label found by the delivery Electron build. | Localized `$t('workspace.components.workspace.tools.Terminal.retry_workspace_load')` with English and Chinese catalog entries. | Source/localization catalogs; no long-lived docs update required. |

## No-Impact Decision

- Docs impact after code review round 9 and the localization Local Fix: no additional long-lived docs edits were needed.
- Rationale: round 9 changed durable validation coverage, and the later Local Fix changed only localization wiring for an existing Terminal retry label. Neither changed the file-explorer watcher lifecycle, workspace reference behavior, team-run history behavior, or Electron build instructions already documented.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Documentation sync is complete against latest-base checked branch state `916e90349d4719638930ad3eae5a92c768a6ab95`; current macOS Electron artifacts were built and DMG-verified; repository finalization is intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: not applicable.
- Recommended recipient: not applicable.
- Why docs could not be finalized truthfully: not applicable.
