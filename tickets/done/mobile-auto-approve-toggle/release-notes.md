# Release Notes: Mobile Run Setup Parity

## What's New

- Mobile **Start new** for agent and team runs now exposes the existing **Auto approve tools** launch option.
- Mobile run setup can select from the paired node's workspace store, including workspaces that are not attached to a live run.
- Mobile run setup can load an unlisted workspace by absolute server-side path and select the returned workspace for the new run.

## Improvements

- The mobile setup shell now delegates run options, launch-workspace selection/loading, and setup state orchestration to explicit mobile launch owners instead of growing `MobileRunSetup.vue`.
- Android continues to use the server-served `/mobile` WebView shell for this behavior, so a refreshed mobile-web bundle delivers the new setup UI without native run-setup code.

## Notes

- **Auto approve tools** remains off by default and uses the existing `autoExecuteTools` run-config field.
- Workspace paths entered from mobile are paths on the paired AutoByteus node/container, not on the phone.
- Physical Android device/APK smoke was not run for this ticket; validation covered the served `/mobile` route, mobile bundle freshness, backend workspace GraphQL boundary, and source-confirmed Android WebView ownership.
- Do not use a stale already-running Electron/server instance from another worktree as branch sign-off for this feature; rebuild or refresh the package/server that serves `/mobile` from this branch.
