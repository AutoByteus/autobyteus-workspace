# Docs Sync Report

## Scope

- Ticket: `codex-agent-spawn-ebadf-root-cause`
- Latest delivery trigger: implementation Round 18 resolved the latest `origin/personal` merge conflict and asked delivery to resume latest-base confirmation, docs sync, and final delivery checks.
- User request in scope: read the README, ensure the ticket branch is based on the latest remote `origin/personal`, and build Electron.
- Bootstrap base reference: not explicitly recorded in upstream artifacts; delivery uses the ticket branch's tracked/finalization target requested by the user: `origin/personal`.
- Integrated base reference used for docs sync: `origin/personal@03d7880b45afd2b032de6e842e41429fad0a2cb0`.
- Integrated source state before delivery docs edits: `c86684e43c8abdf49f992451ce6fdb3711c52b57` (`merge: integrate latest personal for round 18`).
- Branch relation at the Round 18 delivery refresh: behind `0`, ahead `21` relative to `origin/personal`.
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round18-integrated-state-check-20260524073654.log` and `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round18-frontend-mobile-remote-access-shell-20260524073706.log`.

## Why Docs Were Updated

- Summary: Round 10 API/E2E and Round 17 code review added durable Terminal FD lifecycle knowledge after earlier docs sync. After Round 18 latest-base integration, delivery promoted the final integrated Terminal runtime behavior into long-lived server and shared package docs, and adjusted frontend cross-references to avoid preserving obsolete workspace-scoped wording.
- Why this should live in long-lived project docs: the macOS isolated PTY backend, root-path Terminal WebSocket behavior, close-before-connect cleanup, and packaged `node-pty` `spawn-helper` repair are runtime invariants that future code changes, packaging work, and validation should preserve.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/README.md` | User explicitly asked delivery to read the README before building Electron. | No change | README documents `pnpm build:electron:mac`, output in `electron-dist`, and the local verbose/no-notarization command pattern used by delivery. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Earlier API/E2E notes identified stale stream method/watcher behavior risk. | Updated | Verified no stale `subscribeToWorkspaceChanges`, `connectToFileSystemChanges`, or `disconnectFromFileSystemChanges` API docs remain; adjusted Terminal related-doc wording. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/file_explorer.md` | Backend watcher lease/resource invariants are durable runtime knowledge from root-cause and validation work. | No change | Existing doc already describes snapshot/watcher separation, lease cleanup, and watcher-free search/file APIs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Latest-base mobile behavior and Terminal root-path frontend behavior needed final integrated verification. | Updated | Added backend lifecycle note and links to server/shared Terminal docs; existing mobile Phone Access no-Terminal/VNC behavior remained accurate. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/terminal.md` | Existing doc was stale/minimal and still described Terminal sessions as workspace-scoped. | Updated | Rewritten to document root-path WebSocket sessions, cleanup, isolated macOS PTY backend, and validation expectations. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/docs/terminal_tools.md` | Shared package owns the interactive terminal session abstractions and platform backend selection. | Updated | Clarified separation between agent `run_bash` and server/web interactive Terminal backends; added `IsolatedPtySession` and `node-pty` helper cleanup details. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-server-ts/docs/modules/terminal.md` | Runtime architecture update | Replaced stale workspace-scoped note with root-path WebSocket lifecycle, cleanup guarantees, platform backend selection, macOS isolated PTY helper behavior, protocol summary, and validation expectations. | Promotes Round 17/Round 10 Terminal FD lifecycle fixes into canonical server docs. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-ts/docs/terminal_tools.md` | Shared package architecture update | Added current interactive backend tree, `session-factory.ts` selection table, macOS `IsolatedPtySession` lifecycle, and clarified that non-interactive agent `run_bash` does not use the PTY backend. | Future changes need to preserve the separation between stateless agent commands and interactive server/web Terminal sessions. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/terminal.md` | Frontend/backend cross-reference update | Added backend runtime notes for root-path connection, invalid-cwd rejection, and macOS isolated PTY cleanup. | Keeps frontend Terminal docs aligned with final integrated backend behavior. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/autobyteus-web/docs/file_explorer.md` | Cross-reference cleanup | Replaced a stale related-doc sentence that implied active-workspace Terminal context with explicit cwd/root-path separation from File Explorer state. | Avoids reintroducing the old assumption that Terminal materializes workspace/file-explorer state. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Terminal root-path lifecycle | Terminal WebSockets use an explicit cwd/root path, reject unavailable paths before PTY creation, and are separate from file-explorer tree/watch state. | `api-e2e-validation-report.md`, `review-report.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-web/docs/terminal.md` |
| macOS isolated PTY backend | Darwin server/web Terminal sessions use `IsolatedPtySession`; a helper child owns `node-pty`, the PTY, shell, and descriptors so server FD use remains bounded after churn. | `terminal-server-e2e-failure-analysis-20260524.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-ts/docs/terminal_tools.md` |
| Close-before-connect cleanup | Early WebSocket close aborts startup, closes partial/late sessions, clears pending messages, and prevents PTY/child residue. | `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-server-ts/docs/modules/terminal.md` |
| Packaged `node-pty` helper repair | Startup repairs packaged `node-pty` `spawn-helper` executable permission before starting the bridge. | `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-ts/docs/terminal_tools.md`, `autobyteus-server-ts/docs/modules/terminal.md` |
| Visible file-explorer live sessions | Watchers are acquired only while visible file-explorer consumers exist; snapshot/search/file APIs remain watcher-free. | `design-spec.md`, `root-cause-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/file_explorer.md`, `autobyteus-server-ts/docs/modules/file_explorer.md` |
| Mobile Phone Access terminal removal | Latest integrated base has no mobile Phone Access Terminal/VNC page; Terminal remains desktop/workspace UI. | `implementation-handoff.md`, `delivery-blocker-round18-latest-personal-merge-conflict.md` | `autobyteus-web/docs/terminal.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Terminal sessions described as workspace-scoped server sessions. | Explicit root-path/cwd Terminal WebSocket sessions grouped by resolved root path. | `autobyteus-server-ts/docs/modules/terminal.md`, `autobyteus-web/docs/terminal.md` |
| Parent-process `node-pty` as the default macOS server/web Terminal backend. | `IsolatedPtySession` helper process owns `node-pty` and PTY descriptors on macOS. | `autobyteus-ts/docs/terminal_tools.md`, `autobyteus-server-ts/docs/modules/terminal.md` |
| Terminal/File Explorer coupling through workspace materialization assumptions. | Terminal uses cwd/root path; File Explorer owns tree/search/watch state and visible watcher leases. | `autobyteus-web/docs/terminal.md`, `autobyteus-web/docs/file_explorer.md` |
| Mobile Phone Access Terminal/VNC page (`MobileTools.vue`). | No mobile Phone Access Terminal/VNC page in the latest integrated base. | `autobyteus-web/docs/terminal.md` |


## Round 19 Latest-Base Docs Decision — 2026-05-28

- Latest integrated base for this delivery pass: `origin/personal@56c6d4bfa27ced68678e4d21dccd4acbcb31aa76`.
- Integrated source HEAD before delivery evidence updates: `49deb55080027afcb7c1d3841caa84091e914ca3`.
- Delivery reviewed the README Electron build instructions and rebuilt Electron v1.3.31.
- Additional long-lived docs edits by delivery: none. The latest base already brought mobile artifacts/run setup documentation, and the ticket's Terminal/File Explorer docs remain accurate for the rebuilt integrated state.
- Delivery evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round19-integrated-state-check-20260528150411.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round19-latest-personal-20260528150411.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round19-latest-personal-dmg-verify-20260528150411.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round19-latest-personal-artifacts-20260528150411.txt`.


## Round 20 Latest-Base Docs Decision — 2026-05-28

- Latest integrated base for this delivery pass: `origin/personal@d1f92730caea25e8b9c39cf4384dc665491e768a`.
- Integrated source HEAD before delivery evidence updates: `2a4667a27149c7a3dbaa53e7b4b5c5350ca25663`.
- Delivery reviewed the README Electron build instructions and rebuilt Electron v1.3.32.
- Additional long-lived docs edits by delivery: none. The latest base brought mobile file/reference controls documentation/finalization updates, and the ticket's Terminal/File Explorer docs remain accurate for the rebuilt integrated state.
- Delivery evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-round20-integrated-state-check-20260528181849.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round20-latest-personal-20260528181849.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round20-latest-personal-dmg-verify-20260528181849.log`, `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/delivery-electron-build-mac-round20-latest-personal-artifacts-20260528181849.txt`.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete against the Round 18 latest-base integrated state. Current macOS Electron build for version `1.3.30` passed and the DMG was verified. Repository finalization, push/merge, release publication, deployment, ticket archival, and cleanup remain intentionally paused pending explicit user verification.

## Blocked Or Escalated Follow-Up

- Classification: not applicable.
- Recommended recipient: not applicable.
- Why docs could not be finalized truthfully: not applicable.
