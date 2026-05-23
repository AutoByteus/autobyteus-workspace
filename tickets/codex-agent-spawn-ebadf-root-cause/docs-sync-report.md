# Docs Sync Report

## Scope

- Ticket: `codex-agent-spawn-ebadf-root-cause`
- Latest delivery trigger: API/E2E Round 8 passed after the user's explicit browser-level frontend/backend validation request; delivery resumed from the already code-reviewed Round 15 source state.
- User delivery request still in scope: read the README, keep the branch based on latest remote `origin/personal`, and provide the Electron build.
- Bootstrap base reference: not explicitly recorded in upstream artifacts; delivery inferred the tracked base/finalization target from the ticket branch and user request: `origin/personal`.
- Latest tracked base refreshed by delivery: `origin/personal@74218467a2f7786c82f3e97b9190058d2cb83bd2`.
- Merge base at the latest refresh: `74218467a2f7786c82f3e97b9190058d2cb83bd2`.
- Branch relation at the latest refresh before Round 8 delivery-owned report/artifact updates: `16 0` (ahead/behind relative to `origin/personal`).
- Current source-affecting reviewed Electron build source: `044a0caf1c7c8e2bbb65a598377a36a1cd3976bd`.
- Current delivery evidence checkpoint before Round 8 evidence: `dd3dcaadee2471b2757348428dc4781c067668a1`.

## Latest Delivery Status — 2026-05-23 After API/E2E Round 8

- Result: `Pass` for docs sync against the latest reviewed, latest-base branch state.
- Round 8 API/E2E added browser-level executable evidence only; it updated the ticket validation report and ticket-local validation artifacts/screenshots.
- No repository-resident production code or durable validation code changed after the Round 15 code-review pass, so no additional code-review loop is required.
- Delivery fetched `origin/personal`; it remained `74218467a2f7786c82f3e97b9190058d2cb83bd2`, branch behind count remained `0`.
- No Electron rebuild was required after Round 8 because non-ticket source files are unchanged since the reviewed Round 15 Electron build source `044a0caf1c7c8e2bbb65a598377a36a1cd3976bd`.
- The existing Round 15 macOS Electron artifact therefore remains the current build for the reviewed source state.
- Repository finalization, ticket archival, push/merge, release publication, deployment, and cleanup remain paused pending explicit user verification per delivery workflow.

## Integrated-State Check

- Delivery integrated-state log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round8-post-browser-integrated-state-20260523163019.log`
- `HEAD` when the check ran: `dd3dcaadee2471b2757348428dc4781c067668a1`
- `origin/personal`: `74218467a2f7786c82f3e97b9190058d2cb83bd2`
- `merge_base`: `74218467a2f7786c82f3e97b9190058d2cb83bd2`
- `ahead_behind`: `16 0`
- Non-ticket changes since build source `044a0caf1c7c8e2bbb65a598377a36a1cd3976bd`: none.
- Current non-ticket dirty files at check time: none.
- API/E2E report `git diff --check`: pass.
- Port cleanup check: pass, no listeners remained on ports `3000` or `8000`.
- Electron rebuild decision: no rebuild after Round 8 because only ticket-local validation evidence changed.

## Round 8 Browser-Level Evidence Added

- API/E2E Round 8 validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/api-e2e-validation-report.md`
- Browser scenario JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.json`
- Browser scenario log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-workspace-file-explorer-20260523.log`
- Backend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-backend-20260523.log`
- Frontend log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-frontend-20260523.log`
- Stack launcher: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-start-stack-20260523.sh`
- Stack metadata: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-stack-20260523.json`
- Report diff/cleanup check: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-report-diff-check-20260523.log`
- Delivery integrated-state check: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round8-post-browser-integrated-state-20260523163019.log`
- Screenshots:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-01-agents-list-20260523.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-02-run-config-no-files-20260523.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-03-files-visible-tree-20260523.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-04-readme-open-20260523.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-05-search-results-20260523.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round8-browser-06-right-panel-collapsed-20260523.png`

Round 8 result summary:

- Backend `autobyteus-server-ts/dist/app.js` ran on `127.0.0.1:8000`; Nuxt dev frontend ran on `127.0.0.1:3000` with README/development configuration.
- The in-app Browser runtime was unavailable to API/E2E, so API/E2E used headless Google Chrome via Playwright as the closest executable browser-level substitute.
- The agents list rendered and run-config/runtime/model surfaces were visible.
- No `/ws/file-explorer` socket existed on the agents list before workspace UI.
- Files visibility opened one temp stream, loading the custom workspace replaced it, and only one custom stream remained while Files/search was visible.
- README open and `search-target` search worked through the real UI.
- Collapsing the right panel released the stream and dropped backend FD count; reopening Files reacquired one stream; navigating away released it again.
- FD sample sequence recorded by API/E2E: `33 -> 36 -> 37 -> 41 -> 41 -> 36 -> 41 -> 36`.
- API/E2E explicitly did not submit a live Codex/GPT-5.5 provider prompt/run to avoid paid or side-effectful execution; the browser pass targeted workspace/file-explorer lifecycle behavior.
- Delivery excluded transient untracked runtime data/workspace directories from versioned evidence; the start-stack script recreates them and the durable evidence is in logs, JSON, screenshots, and the updated validation report.

## Why Long-Lived Docs Were Updated Or Verified

- Summary: earlier delivery and implementation work updated long-lived file-explorer and terminal docs. Round 8 added browser-level validation evidence but no product behavior change, no source change, and no durable-validation source change.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` remains the current frontend reference for visible-consumer live sessions, `acquireFileExplorerLiveSession` / `releaseFileExplorerLiveSession`, watcher-light snapshot APIs, and WebSocket-owned watcher leases.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` remains the backend reference for watcher lease ownership, snapshot/search watcher-free behavior, and durable E2E expectations.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` remains the current terminal/mobile reference for root-path desktop/workspace Terminal behavior via `TerminalTarget` and `/ws/terminal/{sessionId}?cwd=...`, and for the absence of a mobile Phone Access Terminal/VNC page after the latest base merge.
- Round 8 validates the existing file-explorer docs in a real browser/frontend/backend flow and does not require additional long-lived doc edits.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | API/E2E reiterated earlier delivery concern about old stream method names/watcher behavior. | Updated earlier; verified current after Round 8 | Grep/inspection confirms current docs describe visible live sessions and watcher-light snapshot APIs, not old component-facing stream methods. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Backend watcher lease/resource invariants are durable runtime knowledge from root-cause and validation work. | Updated earlier; verified current after Round 8 | Existing server doc captures snapshot/watcher separation and lease cleanup expectations. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Terminal FD lifecycle and latest-base mobile behavior were part of prior API/E2E/review evidence. | Updated earlier; no Round 8 change | Round 8 did not change terminal behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/README.md` | User explicitly asked delivery to read the README before building Electron. | No change | README already documents `pnpm build:electron:mac`, output in `electron-dist`, and the local macOS verbose/no-notarization command pattern used by delivery. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Behavioral architecture update | Earlier delivery replaced obsolete stream/watcher documentation with visible-consumer live sessions, snapshot refresh, backend watcher lease lifecycle, workspace-scoped store usage, and echo suppression. | Promotes the reviewed and API/E2E-validated watcher lifecycle into canonical frontend docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Durable backend runtime note | Earlier delivery added snapshot/watcher separation, WebSocket watcher lease lifecycle, resource-safety invariants, Codex spawn descriptor-pressure diagnostics, and durable E2E references. | Promotes root-cause and validation knowledge into canonical server docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Terminal/mobile behavior reconciliation | Round 13 implementation reconciled the doc with latest base: desktop/workspace terminal targets use root paths; mobile Phone Access no longer exposes Terminal/VNC pages. | Required after latest-base mobile/terminal merge conflicts. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Visible file-explorer live sessions | Watchers are acquired only while visible file-explorer consumers exist; multiple consumers share one frontend stream and final release disconnects it. Browser Round 8 revalidated this through the real frontend/backend UI. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, Round 8 browser artifacts | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` |
| Backend watcher lease ownership | WebSocket sessions own watcher leases; `LocalFileExplorer` starts the watcher on first lease and stops it after final release, including early-close cleanup. | `root-cause-report.md`, `review-report.md`, `api-e2e-validation-report.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` |
| Snapshot/search operations are watcher-free | GraphQL workspace, folder, content, mutation, and search APIs must not retain watchers; search index refresh is snapshot traversal based. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` |
| Terminal PTY/FD lifecycle | Terminal WebSocket sessions are rooted by cwd/root path, reject unavailable cwd before PTY creation, and release PTYs/child processes after close and close-before-connect churn. | `api-e2e-validation-report.md`, `review-report.md`, `implementation-handoff.md` | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md`, durable E2E source |
| Mobile Phone Access terminal removal | Latest `origin/personal` removes the mobile Tools/Terminal/VNC page; mobile Phone Access focuses on current supported mobile flows. | `implementation-handoff.md`, Round 13 merge resolution | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` |
| Round 15 run-history durable validation cleanup | Agent-run service integration coverage now uses current `historyCatalogService` prepared/start/terminate boundaries and no longer carries stale `historyIndexService` mocks. | `review-report.md`, `implementation-handoff.md` | Durable test source only; no long-lived docs update required. |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Old frontend docs for `subscribeToWorkspaceChanges`, `connectToFileSystemChanges`, and `disconnectFromFileSystemChanges` as component-facing stream APIs. | `acquireFileExplorerLiveSession(workspaceId, consumerId)` / `releaseFileExplorerLiveSession(workspaceId, consumerId)` with internal stream management. | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` |
| Workspace-load or search-driven persistent watcher assumptions. | Request/response snapshot operations that do not start live watchers. | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` |
| Always-on watcher lifetime tied to cached workspace/file explorer objects. | Session-owned watcher leases tied to live WebSocket lifecycle and visible frontend consumers. | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` |
| Mobile Phone Access Terminal/VNC page (`MobileTools.vue`). | No mobile Phone Access Terminal/VNC page in the latest integrated base. | `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md`; source deletion of `autobyteus-web/components/mobile/MobileTools.vue`. |
| Stale run-history durable-validation mocks (`historyIndexService`, `recordRunCreated`, `recordRunRestored`). | Current `historyCatalogService` test harness with `recordPreparedRun`, `recordRunStarted`, and `recordRunTerminated` assertions. | `autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts`; no long-lived docs update required. |

## No-Impact Decision

- Docs impact for the Round 8 resumed delivery pass: `No additional long-lived docs edits by delivery`.
- Rationale: Round 8 changed only ticket-local API/E2E report and validation artifacts. It validated existing file-explorer lifecycle docs through a real browser/frontend/backend scenario and did not alter source behavior.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against latest-base checked branch state. Current macOS Electron artifacts for version `1.3.29` were rebuilt and DMG-verified in Round 15 from source `044a0caf1c7c8e2bbb65a598377a36a1cd3976bd`; Round 8 did not require a rebuild. Repository finalization remains intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: not applicable.
- Recommended recipient: not applicable.
- Why docs could not be finalized truthfully: not applicable.
