# Handoff — Architecture Design Complete (direct implementation)

- Package: `docker-setup-code-wait-feedback`, Project Task `autobyteus-workspace-3` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`)
- Requested by: `/project_task_manager` (run `project_task_manager_b9bdef7e859e4da781c68d8fa4a79061`), for the user
- Solution revision: SR-001
- Status: `Architecture Design Complete`; `task_size=Small`, `architectural_risk=Low` → direct implementation (handoff rule for Small/Medium + Low)
- Approval basis: requirements approved by the Solution Designer within the Task's direction, user informed (2026-11-09); no `Needs user` decisions; design approval not required by the direction
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback`
- Branch: `codex/docker-setup-code-wait-feedback`, from `origin/personal` @ `4da745ac473681862d0d6430a806936efe74b018`
- Finalization target: `origin` / `personal` (RELEASE.md)
- Ticket folder: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/docker-setup-code-wait-feedback/tickets/in-progress/docker-setup-code-wait-feedback/` — the solution documents are written there and not yet committed; commit them with the implementation on the ticket branch.

## Original request (short)

The user ran `autobyteus-docker setup-code autobyteus-server-0`, saw no output for a while, then got a valid code. Confirm the mechanism from the node's own logs/timing; make `setup-code` visibly busy instead of silent (the user asked for a progress message, for example "rebuilding container..." for the recreate and something for the wait), and bound each socket attempt. Regression coverage. Do not disrupt the user's node.

## What the investigation established (details: investigation-notes.md)

- `setup-code` itself, via `start_node` (output sent to `/dev/null`), pulled a new `:beta` image (done 15:11:11Z), removed the old container and created a new one (15:11:12–14), then asked the socket 5 times until the node answered (15:11:19). The Task's "socket warms up after HTTP" hypothesis is ruled out: the control socket opens before the HTTP listen.
- One attempt to a socket that accepts but never answers never ends today (reproduced with the launcher's real client).

## What to build (design-spec.md)

1. Client JS (bash and PowerShell): 5 s socket timeout.
2. `start_node` / `Start-Node`: optional switch to skip the URL block; recreate messages reworded to "Recreating the container of <node>: <reason>. Its named volumes are kept."; PowerShell `docker pull … | Out-Host`.
3. `setup-code`: `start_node … 0 >&2` (bash) / `Start-Node … -NoUrls` (PowerShell); stdout keeps only the code lines.
4. Wait loop (both): 90-second wall-clock deadline, "Waiting for <node> to start (up to 90 seconds)..." after the first failed attempt, an update with elapsed seconds at least every 10 s, last attempt's error in the failure message.
5. Tests: new `scripts/tests/test_public_docker_launcher_setup_code.py` (AC-001..AC-008); update the two old-wording assertions in `test_public_docker_launcher_shared_workspace.py` (:346, :423) in place; add the launcher-tests row to TESTING.md's Test layers (TESTING.md is API/E2E-owned; flagged there too).

## Start from

`bash tickets/in-progress/docker-setup-code-wait-feedback/probes/silent-socket-attempt.sh "$PWD" 15` → `UNBOUNDED` today; must print `BOUNDED` after the client change.

## Constraints and preserved behavior

NAS-32 (code only on stdout, nowhere else), NAS-34 recreate decision unchanged, exit codes, `new-container` output, 90 s budget, `logs` hint. Do not test against the user's node (TESTING.md, Docker server nodes); the offline fake-Docker tests need no daemon. Keep `docker-runtime.sh` under 500 lines; add nothing to the 1347-line shared test file beyond the two in-place assertion edits.

## Open risks

RSK-001 `docker exec` / Docker daemon hang is not bounded (limitation). RSK-002 no `pwsh` on this machine: PowerShell checked by text contract (and `pwsh` parse where available).

## Follow-ups

FU-001 (`follow-ups.md`): `setup-code` also upgrades the node's image; whether it should is a separate product decision. Sent by the Solution Designer when the ticket leaves the team.

## Expected output

Implementation and `implementation-handoff.md` per the implementation engineer's workflow, then the team's normal route (API/E2E validation, delivery).

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `probes/silent-socket-attempt.sh` in the ticket folder above.

## Route record

- Handoff rules applied 2026-11-09: Small + Low → `/software_engineering_team/implementation_engineer`.
