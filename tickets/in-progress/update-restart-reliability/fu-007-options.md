# FU-007 — What "Install update and restart" does after an incomplete shutdown (working notes for DEC-001)

Read on 2026-10-31 at `origin/personal` @ `a977b2c1bc`.

## Today (desktop, `Read`)
1. The user, or the auto-check flow, clicks **Install update and restart**. `appUpdater.ts:262-280` sets the state
   to `installing`, then calls `prepareForInstall()` = `ElectronApplication.stop()` (`electronApplication.ts:73-75`).
2. `stop()` is the memoized `ApplicationShutdown.stop()` (≤ 30 s). It runs `stopResources()`: `stopServer()`, then
   the browser runtime (`electronApplication.ts:405-411`).
3. `stopServer()` → `stopManagedBackend` (`managedBackendStop.ts`) throws `ShutdownIncompleteError` in two cases:
   - the server exited with a code other than 0. That happens when its cleanup failed, its 10 s bound expired, or its
     sweep was unconfirmed (autobyteus-284);
   - the server did not exit within 20 s and had to be forced (284's tree force, then a 2 s confirmation).
4. On that error `prepareForInstall` rejects:
   - `handleError('Failed to install update and restart.')` runs, and `quitAndInstall` is not called;
   - the server is already stopped;
   - the rejected stop stays memoized, so the app stays open without its server;
   - the next quit prevents `will-quit`, gets the same rejection, and ends through `app.exit(1)`.
5. Install-on-quit (`autoInstallOnAppQuit = true`, `appUpdater.ts:97`):
   - **Windows and Linux** (`electron-updater` 6.8.9, `BaseUpdater.addQuitHandler`, `BaseUpdater.js:69-89`): "Update
     will be not installed on quit because application is quitting with exit code" ≠ 0. So `app.exit(1)` also skips
     the install.
   - **macOS**: Squirrel.Mac installs natively; whether it installs after `app.exit(1)` is not established (U-2).

## The other update path, for comparison (Docker node in-place update, autobyteus-305, `Read`)
`docker/starter/update-run.mjs:123-159`:
- the old server is stopped with SIGTERM, up to 120 s, then SIGKILL of its whole group;
- the update **continues whatever the exit code**, and adds "(<old> did not stop in time and was stopped by force.)"
  to its result message;
- proven live on 2026-10-31 (beta.6 → beta.7, `DEL-14`).

## Options for the user
| | A. Install anyway once the server is gone (recommended) | B. Do not install; keep the app usable | C. Retry the stop, then decide |
| --- | --- | --- | --- |
| Behavior | If the server process and its tree are **confirmed gone**, the update installs and the app restarts. The log and the next start's notice say the previous shutdown was incomplete. If the server's exit cannot be confirmed (very rare), do not install: restart the server and show the error | Restart the embedded server so the app works again, and show "The update was not installed because the server did not stop cleanly. Try again." | Restart the server, wait, and try the whole install once more; if it fails again, act as A or B |
| Unattended update and resume (285) | Works with no human | Needs a human every time | Works, but slower and more complex |
| Data risk | Same as a power cut or force-quit, which run restore already repairs (torn memory-log ends; SQLite WAL is crash-safe). The busy turns were already interrupted | None from the install; a busy turn may continue on the old version | As A on the second failure |
| Consistency | Matches the Docker in-place update (autobyteus-305) | Matches today's desktop rule (an incomplete cleanup is never success, backend-port-conflict) | New behavior |
| Cost | Small: one rule in the install path | Small: restart the server after a failed install | Larger |

Recommendation: **A**.
- The update should not be blocked by one stuck runtime, because the server's tree is already gone by then.
- It matches the Docker path.
- An incomplete stop is reported honestly (log and notice), not hidden as success.
- The rare "exit not confirmed" case falls back to B, so the app is never left without a server.
