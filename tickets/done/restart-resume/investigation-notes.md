# Investigation Notes — restart-resume (autobyteus-285)

## Investigation Meta
- Package `restart-resume`. Task `autobyteus-285`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from
  `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-01, at the user's word.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restart-resume`, branch `codex/restart-resume`, created
  with `git worktree add -b` from `origin/personal` @ `efd28d5c4a` (beta.9) after `git fetch`. Target `personal`.
- Authorities read (in this conversation): the requirements gate files, the templates, `DESIGN.md`, `TESTING.md`.
- Input: autobyteus-283's investigation (`codex/agent-restart-resume-investigation` @ `8eabc72a60`:
  `investigation-notes.md` F-01..F-25, U-1..U-7; `requirements-doc.md` REQ-001..010, DEC-1..8; the report).
  Those facts are carried by reference; what changed since is below.

## What changed since autobyteus-283 (`Read`, plus earlier tickets' measurements)
| ID | Finding | Effect |
| --- | --- | --- |
| G-01 | **User decision 2026-10-30** (Task comment): after an update restart, busy agents continue automatically, no confirmation. It replaces 283's REQ-005 "ask above 5" and REQ-007/DEC-1 `ask` default for the update case; other restarts are left to this ticket and the user | Requirements |
| G-02 | 284 (merged): shutdown interrupts busy turns first, stays within 10 s, leaves nothing running; nothing is interrupted before `ServerProcessShutdown.request()` starts its cleanup (the record can be written first); shutdown never writes `terminatedAt`. 284's API-11: after a busy desktop quit, **4/4 roots (Codex and Claude standalone, a Codex Team member, a Claude Org agent) were restored and continued** on relaunch (`Measured`, 42 runs in API-04 R2 of 339) | Feasibility of restore-and-continue after a graceful stop (closes 283's U-2 for the graceful path) |
| G-03 | 339 (merged): busy quits no longer stall (41/41 clean); "Install update and restart" installs after an incomplete shutdown when the server is confirmed gone | The update restart is reliable |
| G-04 | 349 (merged): a failed run start is undone; empty never-started runs are removed at startup (`server-runtime.ts:210`) | No debris among candidates |
| G-05 | 305 steps 1–4 (merged): Docker nodes update their server in place through the starter (`docker/starter/update-run.mjs`); a real beta.6 → beta.7 update was proven on a test container (DEL-14) | A second real update path, testable on a test container |
| G-06 | **The server does not know its release version.** `autobyteus-server-ts/package.json` says `0.1.1`; the release version is in `autobyteus-web/package.json` (`1.5.11-beta.9`, `RELEASE.md:187, 347`). On Docker only the starter knows it (`node-update-routes.ts:7`: "the starter … alone knows the node's version"; `docker/starter/package-store.mjs` `state.json`). No version reaches the embedded server through its environment (`autobyteus-web/electron/server/*`) | "Was this an update restart?" needs either a build/version stamp the server can read, or the updater telling the server (design) |
| G-07 | A desktop update relaunches the app through Squirrel/electron-updater; a real install cannot be exercised on isolated data (339 API-06, 284 API-14) | Real-app proof must use another way (design: a second build stamped with another version on the same isolated data root; or the Docker in-place update on a test container) |

## Open for the user
- Which restarts resume automatically besides an update (plain quit + relaunch, Restart server, `docker stop`/start,
  crash or power loss). See requirements DEC-001.
