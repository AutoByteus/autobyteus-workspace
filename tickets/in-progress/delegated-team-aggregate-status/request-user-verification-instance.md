# Request — isolated test instance for AC-011 user verification

- Date: 2026-10-11
- From: user, relayed by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). The user's words: "setup the test copy for me".
- Package: `delegated-team-aggregate-status` (Project Task `project_task_7a42fa46-b24f-4a0f-abc0-abedd11acb56`)
- Owner: `/software_engineering_team/delivery_engineer` (owns explicit user verification and cleanup for this ticket; finalization is currently blocked only on AC-011 per `release-deployment-report.md`)
- Branch / worktree: `codex/delegated-team-aggregate-status` at current head (`2b7648350`, merged with `origin/personal` @ `bd45af839`), `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-team-aggregate-status`

## What is requested

1. Start an **isolated desktop instance** built from this branch's current head (`pnpm --silent isolated-app start --build` per `TESTING.md` and `docs/isolated-app-instances.md`), with its own ports and data. Never use the user's installed app or `~/.autobyteus`. Record the `instanceId` and `controlPort`.
2. Prepare it so the check is easy:
   - Import the public agents package, so the user has ready Agents/Teams.
   - Provision credentials only through the importer (`pnpm secrets:import …` into the instance's database, then `isolated-app restart`) if a real model is needed. Ask the user for the source if none is available; never edit `.env` files.
   - Have a **delegated Team copy** available under an Agent run (e.g. an agent that delegates a Team with `delegate_task`/`@`), so the user can see the Team row turn **blue** while a member works, **green** when idle, and **gray** when stopped. If useful, also have a standalone Team run under TEAMS and an Org with a Team, so the run row, group row and Org Team row can be checked.
3. Send the user, and `/project_task_manager`, short steps:
   - how to open/focus the instance;
   - what to do (open the Agent run, send a task that makes the delegated Team work, wait for idle, Stop);
   - what they should see for each colour. Blue (pulsing) = a member is running or starting. Red = error. Green = idle. Gray = offline/stopped. The dot sits before the slate people-group icon, stays visible when the Team is collapsed, and a TEAMS group row shows the highest status of its runs.
4. Keep the instance running until the user has verified, then stop exactly that instance (`pnpm --silent isolated-app stop <instanceId>`) as part of cleanup, and record the result.

## Acceptance being verified (requirements-doc.md, R2 / AP-001)

AC-011: in the desktop app (worktree build), a delegated Team with a running member is blue; an idle standalone run is green; a stopped run is gray. The other ACs were covered by API/E2E (API-REV-001).

## Known limits to mention to the user (not defects of this ticket)

- A Team dot is as fresh as the agent statuses the app has. Delegated Teams under an Agent run are live once that run has been selected in the session. Teams inside an Org are live once the Org has been opened (investigation-notes R-002 / ASM-001).
- The Projects board still shows a starting Team copy as amber (server shared fold; out of scope in R2).

## Artifacts

- Requirements: `…/tickets/in-progress/delegated-team-aggregate-status/requirements-doc.md`
- Design: `…/design-spec.md`
- Release/deployment report (current delivery state): `…/release-deployment-report.md`
- Release notes (user-facing wording): `…/release-notes.md`

## Expected reply

Tell `/project_task_manager` and the Solution Designer when the instance is ready (instanceId, how to open it, steps), and later the verification and cleanup result.
