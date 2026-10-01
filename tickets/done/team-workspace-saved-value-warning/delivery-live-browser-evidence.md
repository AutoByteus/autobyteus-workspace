# DR-002 live-browser verification — saved Team Workspace Directory

- Time: 2026-09-26 12:56 UTC.
- Candidate: `codex/team-workspace-saved-value-warning@89e3a2d309338f1c103241888883a7ce45fa09e4`, with delivery documentation edits only; browser ran the worktree's changed frontend, not the installed app's older frontend.
- Frontend: isolated Nuxt dev server `http://127.0.0.1:3012/` started from this worktree with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695` and matching Agent/Team/GraphQL WebSocket endpoints. The port 3012 preview did not replace the user's other port 3000 frontend.
- Backend: already-running `/Applications/AutoByteus.app/.../server/dist/app.js --port 29695 --data-dir /Users/normy/.autobyteus/server-data` (PID 84984). The candidate frontend's development GraphQL proxy targets that Electron-started backend. HTTP 200 checks for both frontend and backend passed. No separate backend or fixture route was started.
- Browser: visible Google Chrome tab at `http://127.0.0.1:3012/workspace`, controlled through CUA. The tab is retained as a handoff for user verification.
- Actual saved run: expanded `autobyteus-workspace-superrepo` → Software Engineering Team → the run beginning “I'm opening the setting from one existing software engineering team…” → `solution_designer` → **Edit Config** → **Team Members Override (6)**. This is `software_engineering_team_de5090a558f04a2bafc6b12317eeb046`, active at test time. No Save, launch, terminate, archive, delete, or workspace edit was performed.

## Observations

1. Real backend `GetTeamRunResumeConfig` read returned no GraphQL errors and the exact root path `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; all six configured members carried that same exact `workspace_root_path` in their saved launch configurations.
2. The changed frontend rendered seven `FixedWorkspacePath` fields (root + six members), each with exactly one copy of the canonical path, `role=textbox`, `aria-readonly=true`, and no nested input/select/button. The root and a member were inspected visibly in Chrome. The displayed neutral context was “Workspace is fixed for existing runs.”
3. No “Saved value is unavailable in current options.” leaf and no `Workspace: ...` duplicate leaf appeared. The fixed-path components contained no Existing/New selector text. Clicking a member's path and pressing `x` left every displayed path unchanged.
4. The member disclosure rendered the saved member path with the same fixed presentation. In the active run, Save was locked, so no real-backend model mutation was attempted. `API-REV-001`'s fixture-routed browser Save and targeted store/component tests remain the authority for AC-003 mutation preservation.

## Result and boundary

**Pass for AC-001/AC-002 on the updated frontend against a real saved Team and the already-running Electron backend.** This removes the prior fixture-only backend gap for the read-only root/member presentation. It is not a claim that the installed Electron frontend was updated, that a stopped run's real-backend model Save was exercised, or that the physical directory exists. The user-verification/finalization gate remains open.

## Preview cleanup after user acceptance
After the user accepted the browser outcome and requested branch-only finalization, the agent-created Chrome tab was closed and the isolated port 3012 Nuxt dev server was stopped. The already-running Electron backend was left untouched.
