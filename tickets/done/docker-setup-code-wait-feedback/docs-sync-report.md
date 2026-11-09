# Docs Sync Report — autobyteus-workspace-3

## Scope

- Ticket: `docker-setup-code-wait-feedback` (Project Task `autobyteus-workspace-3`). `autobyteus-docker setup-code` and `new-container` show every step they take and bound their wait.
- Trigger: delivery DR-001, after API/E2E's Pass on the IR-002 Local Fix (`API-REV-002`, 96.0%). Direct route (`task_size` Small, `architectural_risk` Low); no architecture, code or test-code review.
- Bootstrap base reference: `origin/personal` `4da745ac473681862d0d6430a806936efe74b018`
- Integrated base reference used for docs sync: the same. `origin/personal` had not advanced when delivery started, when delivery resumed after IR-002 (0 behind, 8 ahead, `2f6a9f86d`), or before finalization. Nothing to integrate.
- Post-integration verification reference: `release-deployment-report.md` (no new base commits, so the evidence's own runs on `63365f010` and the API/E2E reruns stand)

## Why Docs Were Updated

- Summary:
  - `setup-code` now announces the image check and Docker's pull progress, a recreate or start, and a wait with elapsed time, on standard error. Its standard output holds only the code lines.
  - One request to the node's socket ends after 5 seconds, and the whole wait is a 90-second wall-clock deadline.
  - The README's `setup-code` entry described only "recreates a node made by an older launcher first", which no longer covers what the command shows or does.
- Why this should live in long-lived project docs: the stream split (progress on standard error, code on standard output) and the two bounds are the command's contract. Users and scripts rely on the split, and the next launcher change needs the bounds stated.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | Management Commands, `setup-code` and `new-container` entries; quick-start text | Updated | `setup-code` entry now states the image check, the start/recreate step, the standard-error progress, the waiting message and its 10 s cadence, the 90 s limit, the 5 s request bound, and that standard output holds only the code. `new-container` shares the waiting message. The quick-start paragraph (lines 56 and 73-75) stays accurate |
| `autobyteus-server-ts/docs/design/node_access_model.md` | NA-5, NAS-03/32/34 name `setup-code` | No change | They describe who gets a credential and when the container is recreated; neither the decision (NAS-34) nor the code's privacy (NAS-32) changed |
| `autobyteus-server-ts/README.md`, `GLOSSARY.md`, `docs/android_mobile_access.md` | Mention `setup-code` | No change | They say only that it prints a code |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` help text | The `Access:` paragraph describes `setup-code` | No change | Still accurate (it applies the launcher configuration first). Code, not a doc; left as verified |
| `DESIGN.md` | Project design rules | No change | No new rule in this ticket. A PowerShell convention the IR-002 finding teaches is proposed to its owner in FU-002 |
| `TESTING.md` | Testing guideline | No change | Its one change (the Test layers row for the offline launcher suite) was committed with the implementation. The `scripts/**` Fresh-start trigger discrepancy API/E2E recorded is a rule the project set, so it is proposed, not edited (FU-003) |
| `RELEASE.md` | Release guide | No change | Its steps matched this finalize-only delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | Rewrite of one list entry | `setup-code`'s Management Commands bullet: checks the node's image first (pull progress shown), starts a stopped node and recreates a changed one keeping volumes and port, announces each step on standard error, prints a waiting message then an elapsed-time update every 10 s for up to 90 s, bounds one request to 5 s, keeps standard output to the code lines; `new-container` shows the same waiting message | The command's user-visible behavior and output contract changed |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| `setup-code` output contract | Progress on standard error, the code lines alone on standard output (NAS-32 holds for every message), waiting message after the first failed attempt then every 10 s, 90 s wall-clock budget, 5 s per request | `requirements-doc.md` REQ-001..REQ-007; `design-spec.md` | `autobyteus-server-ts/docker/README.md` |
| Launcher offline test layer | How the launcher's bash and PowerShell commands are tested against a fake Docker, with a real `node` client against a real Unix socket | `design-spec.md`, implementation handoff | `TESTING.md` Test layers (row added by the ticket) |
| PowerShell native stderr under `Stop` | Capturing a native command's stderr with `2>&1` under `$ErrorActionPreference = 'Stop'` needs a `Continue` scope on Windows PowerShell 5.1 | IR-002, `evidence/API-09-pwsh7-guard-vs-unguarded-comparison.log` | Proposed for `DESIGN.md` through FU-002 (owner: Solution Designer); the code carries the reason in a comment and the AC-006 test guards its shape |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `setup-code` discarding `start_node`'s output (`>/dev/null`, `\| Out-Null`) | Progress on standard error (PowerShell: host output), no URL block | README `setup-code` entry |
| An attempt-count wait (`seq 1 90`, `for $attempt`) | A 90-second wall-clock deadline with waiting messages and the last error | README `setup-code` entry |
| "Image changed … recreating the managed container", "Refreshing …; existing container predates launcher config tracking", "Launcher config changed … recreating …" | "Recreating the container of `<node>`: `<reason>`. Its named volumes are kept." (one vocabulary, DEC-004) | The code and its tests; the README names the recreate reasons |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, then finalization (Secret Gate, ticket archive, commit, push, merge, cleanup).
- Notes: a problem found outside this ticket is in `follow-ups.md`: FU-002 (the same `2>&1`-under-`Stop` pattern at two failure-path call sites in `DockerRuntime.ps1`, and the missing convention) and FU-003 (the `TESTING.md` `scripts/**` trigger). FU-001 (does `setup-code` upgrade the image) is the Solution Designer's own, from before delivery. All three are for the Solution Designer to send now that the ticket leaves the team.
