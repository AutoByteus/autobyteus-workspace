# Solution Designer Handoff — backend-port-taken-by-agent-dev-server

- Package identifier: `backend-port-taken-by-agent-dev-server`
- Result classification: `Architecture Design Complete`
- `task_size`: Small; `architectural_risk`: Low (rationale: `design-spec.md` § Task Size And Architectural Risk)
- Current SR: `SR-001`
- Status: requirements Approved (Solution Designer within the direction; user informed 2026-11-06); design Ready

## Original request

Project Task `autobyteus-restart-reliability-3` (Project `project_0b3edda8-91b4-4c0c-8a11-afed3bea2a05`), requested by `/project_task_manager` (run id `project_task_manager_b9bdef7e859e4da781c68d8fa4a79061`): desktop 1.5.12-beta.2 opens to "Backend port 29695 is already in use"; Restart Server cannot recover. Fix the root cause (AutoByteus's `PORT`/`SERVER_PORT` leaking into agent and tool-shell environments so agent-started dev servers bind 29695), with regression coverage for the leak and for the conflict/recovery path; S1/S2 if cheap; candidates not taken recorded as follow-ups. Finalize and merge on the base branch, verified, with cleanup. No release.

## Goals / what to build (summary; design spec is authoritative)

1. `buildServerProcessEnv` stops adding `PORT`/`SERVER_PORT`; remove the now-unused `port` input and its caller argument. The server already gets its port from `--port`; nothing reads the two variables (investigation E3).
2. `ServerStatusManager.checkServerHealth`: in ERROR answer `{ status: 'error', message: 'Server is not running' }` instead of `'starting'`.
3. `serverStore`: fallback poller calls health only in STARTING/RESTARTING (clears on RUNNING as today); entering ERROR clears the stale `healthCheckStatus`.
4. `scripts/verify-packaged-server-startup.mjs` and `docs/electron_packaging.md`: drop `PORT`/`SERVER_PORT`.
5. Tests: see design spec § Guidance For Implementation (composition without the keys; platform launch assertions; `[::]`-holder conflict + recovery; ERROR health; store polling with fake timers).

## Constraints

- Do not touch the user's installed app, port 29695, their dev servers, or server data; all holders/instances in tests are test-owned (QR-002).
- Backend port, bind address and all other launch variables unchanged (REQ-002, QR-001). No-kill policy unchanged.
- Follow `DESIGN.md`, `TESTING.md`, `RELEASE.md`, `autobyteus-web/AGENTS.md` (never `git add .`/`-A`). No release.

## Workspace

- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-taken-by-agent-dev-server`
- Branch: `task/backend-port-taken-by-agent-dev-server`
- Base: `origin/personal` at `666b881b5`; finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-taken-by-agent-dev-server/tickets/in-progress/backend-port-taken-by-agent-dev-server/`
- Solution documents committed on the task branch (see git log); no source changes yet. No `node_modules` installed in the worktree yet.

## Evidence

- `bug-report.md`, `evidence/app.log`, `evidence/server-last-session.log`, `evidence/port-holder-snapshot.txt`
- Probes P1–P3 (investigation notes § Runtime findings): `PORT` unset → Nuxt HMR picks 24678; on macOS an `[::]` listen coexists with the backend's `0.0.0.0` bind and then blocks it.

## Open risks

- R-001 transitional holders started by older builds; R-003 hypothetical out-of-repo `PORT` consumer (escalation trigger in design spec).

## Follow-ups (not in this ticket)

- FU-001 dual-stack bind exclusivity; FU-002 actionable conflict screen for AutoByteus-started holders (`follow-ups.md`). Not yet sent; the Solution Designer sends them when the ticket leaves the team.

## Next expected action

Implementation Engineer implements per `design-spec.md` on the direct route (no independent architecture review: Small/Low), then the normal downstream flow.

## Route

- Handoff rule applied (2026-11-06): "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.
