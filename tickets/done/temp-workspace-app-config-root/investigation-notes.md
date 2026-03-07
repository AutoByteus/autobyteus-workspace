# Investigation Notes

## Scope

Trace how the server decides the temp workspace root path, why the Electron UI shows a macOS `/var/folders/...` location, and whether that diverges from the intended server data model.

## Initial Evidence

- User-observed workspace path in the Electron UI:
  - `/var/folders/.../T/autobyteus/temp_workspace`
- Server-side app config contains this default temp workspace path:
  - `autobyteus-server-ts/src/config/app-config.ts`
  - `path.join(os.tmpdir(), "autobyteus", "temp_workspace")`
- Existing tests encode the same expectation:
  - `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`

## Initial Hypothesis

The current behavior is likely not a random Electron/runtime artifact. It appears to be the explicit default selected by the server app-config layer, which on macOS resolves `os.tmpdir()` into `/var/folders/.../T`.

## Confirmed Call Chain

1. Electron constructs the backend server process with `--data-dir <appDataDir>`.
2. On macOS, `appDataDir` comes from the Electron `AppDataService`, which resolves to `<baseDataPath>/server-data`.
3. Server startup applies that CLI argument through `AppConfig.setCustomAppDataDir(...)`.
4. `WorkspaceManager.getOrCreateTempWorkspace()` asks `AppConfig.getTempWorkspaceDir()` for the temp workspace root.
5. `AppConfig.getTempWorkspaceDir()` uses:
   - `AUTOBYTEUS_TEMP_WORKSPACE_DIR` if configured, relative to `dataDir` when the override is relative.
   - otherwise `path.join(os.tmpdir(), "autobyteus", "temp_workspace")`.
6. The GraphQL workspace converter returns the workspace absolute path to the UI.
7. The UI displays that backend-provided path.

## Confirmed Findings

### 1. Electron passes the server data directory correctly

- `autobyteus-web/electron/server/services/AppDataService.ts`
  - App data dir is `<baseDataPath>/server-data`.
- `autobyteus-web/electron/server/macOSServerManager.ts`
  - Backend launch includes `--data-dir ${this.appDataDir}`.

Conclusion:
- The issue is not that Electron forgot the server data directory.

### 2. Server app-config explicitly defaults temp workspace outside server data

- `autobyteus-server-ts/src/config/app-config.ts`
  - `getTempWorkspaceDir()` defaults to `path.join(os.tmpdir(), "autobyteus", "temp_workspace")`.
  - Only `AUTOBYTEUS_TEMP_WORKSPACE_DIR` causes a data-dir-relative path when a relative override is supplied.

Conclusion:
- The current `/var/folders/...` path is the intended default behavior of the present code.

### 3. Runtime env setup does not override the temp workspace location

- `autobyteus-web/electron/server/serverRuntimeEnv.ts`
  - Runtime env sets DB and host-related values, but does not set `AUTOBYTEUS_TEMP_WORKSPACE_DIR`.

Conclusion:
- There is no Electron-side runtime override moving temp workspaces into `server-data`.

### 4. Workspace creation and UI display use the backend result directly

- `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
  - Temp workspace is created from `config.getTempWorkspaceDir()`.
- `autobyteus-server-ts/src/api/graphql/converters/workspace-converter.ts`
  - `absolutePath` is the workspace base path returned to the frontend.

Conclusion:
- The UI is faithfully showing the backend-selected temp workspace root.

### 5. Implementation and tests agree with OS-temp behavior, but docs do not

- `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
  - Default expectation is `path.join(os.tmpdir(), "autobyteus", "temp_workspace")`.
- `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
  - E2E expectation also uses the same OS-temp-root path.
- `autobyteus-server-ts/README.md`
  - Claims `temp_workspace/` is created under the app data dir.

Conclusion:
- This is a real inconsistency.
- Either:
  - code/tests are wrong relative to intended behavior, or
  - README is wrong relative to intended behavior.

## Root-Cause Statement

The displayed temp workspace path is `/var/folders/...` because the server-side `AppConfig` default path for temp workspaces is hard-coded to `os.tmpdir()/autobyteus/temp_workspace` when `AUTOBYTEUS_TEMP_WORKSPACE_DIR` is unset. On macOS, `os.tmpdir()` lives under `/var/folders/.../T`, so the Electron UI ends up showing that exact path after the backend creates the temp workspace and returns its absolute path through GraphQL.

## Bug Assessment

- If the intended product behavior is "temp workspace belongs under server-data", this is a code bug in `AppConfig.getTempWorkspaceDir()` plus a test expectation bug.
- If the intended product behavior is "temp workspace should stay in OS temp for isolation/ephemerality", then the code is behaving intentionally and the bug is in the README/documentation.

## Most Likely Assessment

Given the README wording and the user's expectation, the stronger evidence points to a code-vs-doc drift where the implementation was changed to OS-temp isolation but the surrounding product/documentation model was not updated.

## Investigation Questions

1. Does the app-config layer intentionally keep temp workspaces outside the app data directory?
2. Does any Electron bootstrap or server startup code override that default in production?
3. Does server documentation claim `temp_workspace/` should live under the server data directory instead?
4. Which service creates and caches the temp workspace once app-config resolves its root?

## Files To Trace

- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/src/workspaces/workspace-manager.ts`
- `autobyteus-server-ts/src/app.ts`
- `autobyteus-web/electron/main.ts`
- `autobyteus-server-ts/README.md`
- `autobyteus-server-ts/tests/unit/config/app-config.test.ts`
- `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`

## Scope Triage

- Classification: `Small`
- Reasoning:
  - The current task is root-cause analysis on a bounded path-resolution behavior.
  - The likely outcome is either an explanation-only result or a localized config fix.
