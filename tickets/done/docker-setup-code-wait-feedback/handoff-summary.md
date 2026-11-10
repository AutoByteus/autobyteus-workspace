# Handoff Summary — autobyteus-workspace-3

## Summary Meta

- Ticket: `docker-setup-code-wait-feedback` (Project Task `autobyteus-workspace-3`). `autobyteus-docker setup-code` (and `new-container`, which shares the wait) show every step they take and bound their wait.
- Date: `2026-11-09`
- Current status: `Complete`. Verified from the evidence and finalized into `origin/personal` (DR-001; the merge and push are in `release-deployment-report.md`). No release.
- Routing: `task_size` `Small`, `architectural_risk` `Low`, route `Direct` (no architecture, code or test-code review, by the team's rules). SR-001; IR-001 and IR-002; API-REV-001 and API-REV-002 (Pass, final confidence 96.0%).
- Archived ticket folder: `tickets/done/docker-setup-code-wait-feedback/`

## Delivery Summary

- **What the user saw (2026-11-09):** `setup-code` printed nothing for about 10 seconds while it pulled a newer image, recreated the container and waited for the node. The investigation showed the silence was the command's own work, not a warm-up. One request to the node's socket also had no time limit.
- **Visible steps (`004ec143b`):** the image check and Docker's pull progress, "Recreating the container of `<node>`: `<reason>`. Its named volumes are kept." (one vocabulary for `upgrade`, `workspace apply` and `setup-code`), "Started `<node>`.", and a wait message. All on standard error (PowerShell: host output); `setup-code`'s standard output is still only the code lines, and its URL block is gone.
- **The wait:** "Waiting for `<node>` to start (up to 90 seconds)..." after the first failed attempt, then "Still waiting … (N s)..." every 10 seconds, nothing when the first attempt answers; a 90-second wall-clock deadline instead of 90 attempts; the failure names the node, the last attempt's error and `autobyteus-docker logs --name <node>`.
- **The bound:** the client run inside the container gives up after 5 seconds (bash and PowerShell client JS).
- **PowerShell twin (IR-002, `0b0195dec`):** delivery found that the wait loop's new `docker exec … 2>&1` runs under the launcher's `$ErrorActionPreference = 'Stop'`, where Windows PowerShell 5.1 would end the loop on the first failed attempt. The call now runs inside a `Continue` scope that is restored right after; the AC-006 test guards its shape.
- **Durable tests:** `scripts/tests/test_public_docker_launcher_setup_code.py` (new, AC-001..AC-008: bash by execution against a fake Docker, the 5 s bound by the real client against a real Unix socket, PowerShell by text contract plus a real `pwsh` parse); two wording assertions updated in place in `test_public_docker_launcher_shared_workspace.py`; one Test layers row in `TESTING.md`.
- **Docs:** `autobyteus-server-ts/docker/README.md` (`setup-code` entry). See `docs-sync-report.md`.

## Verification

- Verified from the evidence; no user check needed. Final confidence 96.0% (Round 2), no category below 94%. Round 1's real-Docker evidence (API-05..API-08) is carried forward because IR-002 touched only `Commands.ps1` and one test.

| AC | Proven by | Result |
| --- | --- | --- |
| AC-001 | API-01/02/10/11 (`test_ac001`); API-05, API-07 on a real Docker daemon | Image check, pull output, recreate or start line and "Started" on standard error, the code on standard output, no URL block. Opened `API-07`: stderr has the real pull, `Started autobyteus-server-1.`, then the waiting line |
| AC-002 | `test_ac002` (first failure, 10 s cadence); API-05, API-07 real | One waiting line after the first failed attempt, with the node's name and the 90 s limit |
| AC-003 | `test_ac003`; API-06 real | Opened `API-06`: standard output is exactly the two code lines; no waiting line; no URL block |
| AC-004 | `test_ac004`; probe `API-03` (the real client against a real Unix socket) | `BOUNDED: the attempt ended after 5s … the node did not answer within 5 seconds`; before the fix `UNBOUNDED … still waiting after 15s` (`IMP-01`) |
| AC-005 | `test_ac005` | With a 6 s budget and 5 s silent attempts, at most 2 attempts; the error names the node, the last attempt's error and the `logs` command |
| AC-006 | `test_ac006` (text contract plus the IR-002 guard-shape regex); both PowerShell parse tests with real `pwsh` 7.6.9; `API-09`, `API-12` | Proven by contract and parse. PowerShell execution against Docker, and the IR-002 guard under Windows PowerShell 5.1 itself, are not proven by execution anywhere (no 5.1 here) |
| AC-007 | negative assertions in each test; API-08 greps the 3 real codes against the real stderr logs | `not found (good)` three times |
| AC-008 | `test_ac008` | `new-container` shows the same waiting line and keeps its other output |

- Opened and checked by delivery: `API-05..API-12` and `IMP-01`, the new test file's assertions, the code diff against `origin/personal` (`git diff origin/personal...HEAD`).

## Integration

- The branch already contained `origin/personal` `4da745ac4`, the base the evidence was tested on, at delivery start, after IR-002, and before finalization. Nothing to integrate and no rerun needed: the evidence ran on the same base, and API/E2E reran the offline suites on `63365f010` (`API-10`, `API-11`).
- Gates run by delivery on the branch: Secret Gate (`scripts/check_secrets.sh origin/personal..codex/docker-setup-code-wait-feedback`, PASS, repeated on the final state and on the merged state) and `python3 scripts/check_repository_artifact_hygiene.py` (PASS).

## Accepted Residual Risks

- RSK-001: `docker exec` or the Docker daemon itself hanging is not bounded (out of scope, unchanged).
- Windows PowerShell 5.1 execution is unproven: no 5.1 or Windows runtime is available to the team. The guard is proven by its shape, the `pwsh` 7 comparison and PowerShell's own change record (PR #13361).
- The evidence logs hold three one-time setup codes of test nodes that were destroyed together with their volumes. They are inert and the Secret Gate passes.

## Notes For The Solution Designer

- **No release was requested and `RELEASE.md` defaults to none.** The launcher is not part of a release artifact: users get it by running the launcher's install command, which downloads it from the `personal` branch. So the change is available to them as soon as it is merged. `release-notes.md` is written for the next release's notes.
- **FU-002 and FU-003 are new**, and **FU-001** is the Solution Designer's own: all three are in `follow-ups.md` for you to send now that the ticket leaves the team.
- **FU-002 proposes a `DESIGN.md` rule** (PowerShell launcher: capture native stderr with `2>&1` only inside a `Continue` scope); the Solution Designer owns that document.

## Follow-ups

`follow-ups.md`: FU-001 (does `setup-code` upgrade the image at all), FU-002 (PowerShell `2>&1` under `Stop` at `DockerRuntime.ps1:218` and `:283`, and the convention), FU-003 (`TESTING.md`'s `scripts/**` Fresh-start trigger). None urgent.

## Release

None. Release only on the user's word, and `RELEASE.md` defaults to none. A release is available (beta or stable); the launcher change itself needs none to reach users.
