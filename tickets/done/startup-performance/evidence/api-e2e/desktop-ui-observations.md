# Actual desktop observation — 2026-09-27, API-REV-001

CUA bound the full candidate .app path (not ambiguous installed app name).
Accessibility initially omitted web content; raising the selected test window exposed
its exact renderer URL:
`file:///Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/app.asar/dist/renderer/index.html#/agents`.
Screenshot and AX show populated Agents page,6individual agents,search/Reload/Create controls; no startup-error screen. This supplements backend health, not a timed first-paint measurement.

The E2E profile disables updater IPC; an `Update failed` notice appeared with
`No handler registered for app-update:get-state` in baseline/candidate app output.
Dismissed notice through its UI button; no update/check/install performed. Not a
migration lockout, and no claim that signed production updating is validated here.

Clicked Agent Teams: route `#/agent-teams?view=team-list`, search/Create Team and
empty definition catalog visible (external package roots disabled in fixture).
Expanded retained `autobyteus-workspace-superrepo` workspace: Software Engineering
Team(36),Article Writing Team(4),AutoByteus Org(3),Software Development Department(1)
listed through real renderer/backend. No historical tasks resumed or runtime messages
sent from this copied desktop; new-run admission was measured separately via real API,
and deterministic real-process tests execute new work with all old trees missing.

Actual desktop terminal-reopen executable→health: baseline30.918s,candidate8.621s.
These are not first-paint timings or desktop-first-conversion timings. First/retry
conversion is proven through ordinary real backend processes and separately packaged
entrypoint lifecycle. Test instance stopped via owned harness sentinel/process-tree
cleanup; production app/profile never restarted or altered.
