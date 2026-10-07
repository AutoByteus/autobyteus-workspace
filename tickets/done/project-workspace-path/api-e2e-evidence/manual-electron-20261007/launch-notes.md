# User-requested isolated Electron launch

2026-10-07: user asked "start the test electron so i could test" after API-REV-001. Purpose is manual verification setup, not a new API validation Pass or user acceptance.
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path
Source HEAD on entry: 8448cd18af3fb08b13cb8d47291c9ba89794b9d3 (Delivery integrated base). Existing uncommitted Delivery docs/evidence left untouched. No concurrent build/runtime observed for this worktree. Existing unrelated isolated records are not ours and will not be changed.
Instructions read: current root TESTING.md and docs/isolated-app-instances.md, skills/autobyteus-isolated-app/SKILL.md, package build/lifecycle configuration. Plan: build current worktree macOS package using supported local NO_TIMESTAMP=1/empty APPLE_TEAM_ID, launch via isolated-app with private fresh data and free ports; readiness must prove backend and renderer. Keep running for user's requested manual testing, preserve test data with --keep. No user app/data/credentials touched. Record exact instance/ports/logs when ready. Do not claim functional/user verification from launch alone.

## Launch and import result

- Standard isolated-app build/start succeeded (`start.json`, `build.log`); current-worktree macOS arm64 packaged Electron 1.4.96.
- Running instance `iso-63742-da32`, PID 28162, backend `http://127.0.0.1:63743`, control `http://127.0.0.1:63742`. Fresh isolated root: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-isolated-root-QcUOVN`.
- Backend `/rest/health` returned status `ok`. CUA selected the exact worktree `.app` path; renderer accessibility URL confirmed the project-workspace-path packaged app, and Settings confirmed the isolated storage path.
- Follow-up user request: "please import the public agent package so i could test". Imported `https://github.com/AutoByteus/autobyteus-agents` through Settings > Agent Packages. UI confirmed `Agent package imported.`, `Up to date.`, 7 shared agents, 47 team-local agents, 14 teams, 0 applications. See `manual-setup-receipt.json`.
- Left this instance running and data preserved for user testing. No model run started, no credentials copied/configured, no normal app/data changed. No explicit user acceptance received. This setup evidence does not retroactively alter API-REV-001 or claim complete packaged feature validation.
- Stop only this instance when requested: from the repository root, `pnpm --silent isolated-app stop iso-63742-da32 --keep`.

## User-requested shutdown

User said "shut down it, i tested it". Stopped only `iso-63742-da32` using the repository-root lifecycle command with `--keep`. `stop.json` confirms graceful stop, both control and server ports released, and isolated data retained. No normal app touched. User reported having tested; no explicit feature pass/fail verdict inferred. An initial list command from the web subdirectory exited 254 because the lifecycle script is root-owned; the corrected root command succeeded.
