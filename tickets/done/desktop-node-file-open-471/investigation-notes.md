# Investigation Notes — desktop-node-file-open-471 (autobyteus-471)

## Investigation Meta

- Package: `desktop-node-file-open-471`; Project Task `autobyteus-471`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471`, `codex/desktop-node-file-open-471`; base `origin/personal` @ `827f1e68dc` (fetched 2026-11-11); finalization target `origin/personal`
- Authorities read: `references/requirements-engineering.md`, `ticket-scope.md`, `finding-the-cause.md`, `handoff.md` (this conversation); the Task with its comment
- Status: requirements investigation complete; one user decision open (DEC-001)

## Request

- The user (2026-11-11, desktop screenshot and phone case): node docker-8001, run "research supervisor", path `/home/autobyteus/workspace/semflow-research/study/research-map.md` (130,475 characters). Desktop shows "This file is available only on the host workspace."; the phone opens it but says "This file is too large to show on the phone." His word: "if it's only done on the phone, then we should fix the desktop as well, because currently it's authenticated."

## Source Log

| Source | Finding | Established |
| --- | --- | --- |
| `autobyteus-web/composables/useEventMonitorFilePreview.ts:66-118` | Desktop: only the embedded window with trusted local-file capability opens any absolute path (`local-absolute`); every other window maps the path into the run's workspace (`mapAbsolutePathToWorkspaceRelative`) and otherwise returns `file_available_on_host` | Read |
| `autobyteus-web/stores/fileExplorerContentActions.ts:61-128` | The desktop Files panel loads an absolute path locally only in the embedded window; otherwise it treats the path as a workspace path (GraphQL `fileContent`) | Read |
| `autobyteus-web/composables/mobile/mobileFileOpening.ts` (436, 450) | Phone: inside the run's folder → workspace file; elsewhere → node file (`/rest/node-files/content`); a run that another node runs → `unavailable`, worded with `file_available_on_host` (`useEventMonitorFilePreview.ts:49-58`, `useMobileAttachmentOpening.ts:30-36`) | Read |
| `autobyteus-server-ts/src/api/security/node-route-permissions.ts`; 436 | `/rest/node-files/content` serves owner and phone credentials; the desktop window's requests to a node carry its owner credential (437 PROBE-03, NA-8) | Read |
| `autobyteus-web/components/mobile/views/MobileFileViewer.vue:30,46` | `MOBILE_FILE_VIEW_MAX_CHARS = 120_000`; Text above it shows "This file is too large to show on the phone." | Read |
| `git log -S MOBILE_FILE_VIEW_MAX_CHARS` → `e37b35b496` (2026-05-28, "feat(mobile): support file and reference controls") | The limit was introduced with the first phone file viewer, earlier `MOBILE_FILE_PREVIEW_MAX_CHARS = 120_000`; no measurement or reason recorded | Read |
| `grep -rn "MAX_CHARS\|too large" components/fileExplorer` | The desktop viewer has no size limit | Read |
| `grep -rln file_available_on_host autobyteus-web` | Used only by `useEventMonitorFilePreview.ts`, `useMobileAttachmentOpening.ts`, their tests and the two locale files | Read |

## Behaviors

| ID | Current | Evidence |
| --- | --- | --- |
| BEH-001 | Desktop window of a Docker/remote node: a path outside the run's folder shows "available only on the host workspace" | above |
| BEH-002 | Desktop embedded window: any local path opens (local file) | above |
| BEH-003 | Phone: any path on the run's node opens read-only (436) | above |
| BEH-004 | A run another node runs (remote run): both clients say "available only on the host workspace", which is not true (the file is on that other node) | `mobileFileOpening.ts:28` |
| BEH-005 | Phone: a text file over 120,000 characters shows only "too large" | `MobileFileViewer.vue` |

## Unknowns

- How long the phone takes to render a Markdown file of several hundred thousand characters (not measured; DEC-001 option A does not depend on it).
