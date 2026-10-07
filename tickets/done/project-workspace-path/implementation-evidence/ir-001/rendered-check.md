# IR-001 frontend implementation feedback loop

Implementation self-validation only, not API/E2E sign-off or final user verification.

## Target and scope

- Current worktree built server (`prebuild.log`, `server-build.log`), Nuxt dev renderer; source subsequently committed as `9dad89bae`. Final rebuild is separately recorded in `server-build-final.log`.
- `preview.mjs` is a ticket-local bring-up receipt patterned on the TESTING.md Projects browser probe's built-server/free-port/owned-data surface, not a new E2E test. It started one backend and one frontend with a disposable SQLite/data root, no external model or desktop app.
- Actual Chrome interaction through CUA, default 1512×862 and temporary 390×844 viewport. Target ports 58330/58331; addresses/data/pid in `preview-target.json`.
- Existing editor, entry, detail/panel/row, shared localization, route/back/notice and slate/blue components retained. No normative Product supplement applies.

## Observed interactions

1. New Project name/description, picker `registered-folder` → first root; manual absolute nonexistent `nonexistent #? 文件夹` → second root. Save succeeded; detail showed both descriptions with AVAILABLE vs UNREGISTERED presentation. Sidebar gained no registered root.
2. Special-character row's Edit navigated with encoded `workspacePath`; actual active element was `workspace-description-1` containing the manual row's description. Changed to `Edited by path`; Save and reload preserved the rows/order/description.
3. At 390 px both rows and all actions fit. DOM measured `documentElement.scrollWidth === innerWidth === 390`. Editor inputs/toggles/actions fit at 390 px; manual and picker use the same draft path.
4. Relative path Save produced localized absolute-path message, no navigation. Canonical duplicate `registered-folder/../registered-folder` produced duplicate message, no navigation. Cancel preserved original two links and descriptions.
5. After fix, failed Save focused the alert and scrolled it into view (`role=alert`, correct message). Switching unmatched manual input back to picker cleared the invisible value; Save stayed in editor, showed “Choose a workspace…” and focused `workspace-choice-1`.
6. Direct Unlink of the special-character reference removed only that row; reload retained only picker root. Disk inspection confirmed exact `{workspaceRootPath, description}` entry, original registry unchanged, manual directory still absent, registered directory intact (`preview-persistence.json`).

## Corrections from inspection

- Replaced obsolete “Registered workspaces…” description with folder-path copy in en/zh-CN; updated unavailable help to “Register this folder…” (a never-registered reference is valid).
- Narrow Save error was above the scrolled form. Focus the existing alert on failure, preserving existing name-error focus.
- A single-path draft must not silently save a manual value hidden by an empty select. Mode switch to picker now clears unmatched path; no second draft state or path/ID fallback. Component regressions cover both polish changes.

## Evidence and limitations

- `paths-wide.png`, `paths-narrow.png`, `editor-narrow-error-focused.png` show final rendered state. `editor-narrow-error.png` retains the pre-polish scrolled view.
- One Chrome control timeout during reload/viewport capture; same tab recovered via fresh state, subsequent capture succeeded. No product failure inferred from that tool timeout.
- `browser-warnings.json` was empty at the final read; this is not exhaustive console/network collection (reload resets observation scope).
- No native Windows path/browser, packaged Electron, actual model, whole-application restart, real upgrade, multiplayer feed/reconnect, zh-CN rendered walkthrough or full keyboard/screen-reader certification. Unit catalogs and error mappings ran; registration fixture was owned setup, not proof of the independent registration UI.
- Broader Projects browser/API probe not run or reauthored here: API/E2E owner must adapt its old ID/registration assumptions. No full-product claim.
- Viewport restored, owned browser tab closed, both child servers exited, ports released and owned data removed; `preview-cleanup.json`. No user-running app/data touched.
