# Round 20 Actual-Browser Settings And Terminal Journey

## Execution Identity

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Reviewed HEAD: `1931d6ec3366d1d5c1ec8dcb93be9848fe7f48cd`
- Backend: built server on `http://127.0.0.1:58120`
- Frontend: Nuxt development frontend on `http://127.0.0.1:33120`
- First task-owned runtime:
  `autobyteus-server-ts/tests/.tmp/round20-browser-runtime`
- First task-owned database:
  `autobyteus-server-ts/db/round20-browser.db`
- Fresh Save-and-use runtime:
  `autobyteus-server-ts/tests/.tmp/round20-browser-save-use-runtime`
- Fresh Save-and-use database:
  `autobyteus-server-ts/db/round20-browser-save-use.db`
- Runtime logs:
  `316-round20-isolated-browser-runtime.log` and
  `319-round20-gemini-save-use-runtime.log`

The backend and frontend were started from this worktree using the documented
test-runtime materialization and development-server paths. Browser interaction
used the actual AutoByteus browser tool (`open_tab`, semantic `run_script`,
supporting screenshots, and `close_tab`), not Playwright, a direct GraphQL
substitute, or the user's installed Electron application.

## SCSP-E2E-BROWSER-SETTINGS-001

1. Opened the real Settings page against the isolated backend.
2. Selected OpenAI. The initial UI showed `Not Configured`.
3. Entered a synthetic formatted credential and used the visible Save action.
   The UI changed to `Configured`, cleared the password field, and rendered the
   success notification.
4. Entered a different synthetic credential and saved again. The UI remained
   `Configured`, proving create-or-overwrite behavior.
5. Inspected the rendered action surface. No ordinary-provider Remove or Delete
   control was present.

Result: **Pass**.

Supporting screenshot:
`317-round20-browser-settings.png`.

## SCSP-E2E-BROWSER-GEMINI-001

On the first isolated database:

1. Saved AI Studio with `Save option`; it became `Configured` without being
   selected.
2. Used `Use this mode`; AI Studio became active.
3. Saved Vertex Express independently while AI Studio remained active and
   configured.
4. Used `Use this mode` for Vertex Express; Vertex Express became active while
   AI Studio remained configured.
5. No standalone Gemini removal action was rendered.

On a second fresh isolated database:

1. Opened AI Studio and confirmed the first-time
   `Save and use this mode` action was enabled.
2. Entered a synthetic credential and invoked that exact action.
3. The UI rendered AI Studio as both `Active` and `Configured`.
4. No standalone removal action was rendered.

Result: **Pass**.

Supporting screenshot:
`320-round20-browser-gemini-save-use.png`.

## SCSP-E2E-BROWSER-TERMINAL-001

1. Navigated through the real frontend to Terminal.
2. Opened the terminal and waited for the backend PTY session to attach.
3. Entered a harmless unique sentinel command followed by `pwd`.
4. Observed the sentinel, `/Users/normy`, and the returned prompt in the
   rendered terminal.
5. The correlated backend runtime log records terminal session creation,
   WebSocket attachment, and session closure.

Result: **Pass**.

Supporting screenshot:
`318-round20-browser-terminal.png`.

## Runtime Notes And Cleanup

- Nuxt logged a transient development-only `#app-manifest` pre-transform
  diagnostic while the application still compiled and rendered. The actual
  journeys completed, and the current production web/Electron build completed
  separately.
- No credential value from the configured real-provider vault was queried,
  displayed, or copied in these browser journeys. All browser mutations used
  task-local synthetic values.
- Both browser tabs were closed. Both task-owned backend/frontend stacks were
  stopped. Their task-owned database, key, runtime, and generated environment
  artifacts were removed. Ports `58120` and `33120` were free afterward.
- The user's installed Electron process and profile were not used or stopped.

