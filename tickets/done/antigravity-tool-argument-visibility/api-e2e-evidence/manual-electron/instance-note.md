# Manual Electron test instance
User requested starting the Electron test app, not acceptance/finalization.

- Ready instance: `iso-59458-20b6` / PID3654
- Built current task worktree using `pnpm --silent isolated-app start --build --keep`; build/launch succeeded.
- Backend: http://127.0.0.1:59459 / health HTTP200. Control port59458.
- App: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus
- Isolated data: /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-isolated-root-jfar4P (kept for manual test continuity). No production app/data copied, no credentials imported.
- Launch receipt/build log/readiness: launch.json, build.log, ready.json.
- Left running for the user's hands-on testing. This is not Delivery Completed or a new API validation Pass; no score changed.
- Stop only this instance when the user is finished: `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-tool-argument-visibility isolated-app stop iso-59458-20b6`. Its data is preserved by --keep; never stop unrelated recorded instances.
