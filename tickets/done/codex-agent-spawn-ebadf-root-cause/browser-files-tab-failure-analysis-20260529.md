# Browser Files Tab Failure Analysis — 2026-05-29

## Classification

- **Result:** Fail
- **Failure ID:** `E2E-BROWSER-FILES-001`
- **Classification:** Local Fix
- **Recommended owner:** `implementation_engineer`
- **Why not design/requirements:** The reviewed behavior requires browser-level workspace/FileExplorer runtime to remain usable. The observed failure is a concrete frontend initialization/runtime ordering bug in `FileExplorerTabs.vue`, not an ambiguous requirement or design decision.

## User-reported symptom

The user reported that in the Electron application, clicking the Files tab shows a Nuxt error page:

- `Error 500`
- `Cannot access 'ee' before initialization`

## Independent reproduction setup

I did **not** validate against the user's currently running Electron backend. I read the repository READMEs and started the backend and frontend myself from the current worktree.

### Backend startup from README/dev flow

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause`
- Backend build: `pnpm -C autobyteus-server-ts build:full`
- Backend runtime: `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port 8000 --data-dir <isolated data dir>`
- Backend URL: `http://127.0.0.1:8000`
- Isolated data dir: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-server-data-20260529` (removed during cleanup after logs/screenshots were captured)

### Frontend startup from README/dev flow

- Frontend runtime: `pnpm -C autobyteus-web exec nuxt dev --host 127.0.0.1 --port 3000`
- Frontend URL: `http://127.0.0.1:3000`
- Backend environment:
  - `NUXT_PUBLIC_GRAPHQL_BASE_URL=http://127.0.0.1:8000/graphql`
  - `NUXT_PUBLIC_REST_BASE_URL=http://127.0.0.1:8000/rest`
  - `NUXT_PUBLIC_WS_BASE_URL=ws://127.0.0.1:8000/graphql`
  - `BACKEND_NODE_BASE_URL=http://127.0.0.1:8000`

## Browser reproduction steps

1. Opened `http://127.0.0.1:3000/agents?view=list`.
2. Confirmed the Agents list rendered and showed `Daily Assistant`.
3. Clicked `Run` on `Daily Assistant`.
4. Browser navigated to `/workspace`.
5. The workspace/FileExplorer surface crashed before normal workspace configuration could be used.

The failure also reproduced in a standalone headless Chrome Playwright run against the same self-started frontend/backend.

## Observed failure

Final URL:

- `http://127.0.0.1:3000/workspace`

Visible error page:

- `Error 500`
- `Cannot access 'handleKeydown' before initialization`

Stack excerpt from the browser page:

```text
ReferenceError: Cannot access 'handleKeydown' before initialization
    at attachGlobalListeners (http://127.0.0.1:3000/_nuxt/components/fileExplorer/FileExplorerTabs.vue:108:42)
    at syncGlobalListeners (http://127.0.0.1:3000/_nuxt/components/fileExplorer/FileExplorerTabs.vue:118:9)
    at watch.immediate (http://127.0.0.1:3000/_nuxt/components/fileExplorer/FileExplorerTabs.vue:128:7)
```

Standalone browser reproduction JSON captured the same failure:

```json
{
  "result": "reproduced_failure",
  "finalUrl": "http://127.0.0.1:3000/workspace"
}
```

## Source-level localization

The stack maps to `autobyteus-web/components/fileExplorer/FileExplorerTabs.vue`.

Relevant current ordering:

- `attachGlobalListeners()` references `handleKeydown`.
- `watch(() => props.active, ..., { immediate: true })` calls `syncGlobalListeners(true)` during setup.
- `syncGlobalListeners(true)` calls `attachGlobalListeners()`.
- `handleKeydown` is declared later as a `const handleKeydown = async (...) => { ... }`.

Because the immediate watcher runs before the later `const handleKeydown` initializer executes, `attachGlobalListeners()` hits the JavaScript temporal dead zone. In the user's packaged/minified Electron screenshot, this appears as `Cannot access 'ee' before initialization`; in the dev frontend it appears as `Cannot access 'handleKeydown' before initialization`.

## Evidence artifacts

- Backend build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-backend-build-full-20260529.log`
- Backend runtime log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-backend-20260529.log`
- Frontend runtime log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-frontend-20260529.log`
- Runtime log tail: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-runtime-log-tail-20260529.log`
- In-app browser screenshot before run: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-agents-list-before-run-20260529.png`
- In-app browser error screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-files-tab-error-20260529.png`
- Standalone browser reproduction script: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-files-tab-reproduction-20260529.mjs`
- Standalone browser reproduction JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-files-tab-reproduction-20260529.json`
- Standalone browser reproduction log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-files-tab-reproduction-20260529.log`
- Standalone browser run log: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-browser-files-tab-reproduction-20260529.run.log`
- Standalone browser screenshot before run: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-script-agents-list-before-run-20260529.png`
- Standalone browser error screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts/api-e2e-round13-script-files-tab-error-20260529.png`

## Required action

Implement a local frontend fix so `FileExplorerTabs.vue` never attaches global listeners before `handleKeydown` is initialized. Acceptable fix patterns include moving `handleKeydown` above `attachGlobalListeners()` and the immediate watcher, using a hoisted function declaration, or otherwise deferring listener attachment until all referenced handlers are initialized.

After the fix, rerun browser-level validation against a self-started backend/frontend and verify that opening workspace/Files no longer produces the Error 500 page.
