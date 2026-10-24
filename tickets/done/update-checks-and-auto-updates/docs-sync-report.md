# Docs Sync Report — update-checks-and-auto-updates

## Scope

- Ticket: `update-checks-and-auto-updates` (Project Task `autobyteus-210`), `task_size=Large`, `architectural_risk=High`. Reviewed route: architecture review, code review CRR-002, API/E2E API-REV-001 and test-code review CRR-003.
- Trigger: delivery DR-001, resumed after the prerequisite autobyteus-282 (PRQ-001) landed
- Bootstrap base reference: `origin/personal` `d2820672c3`
- Integrated base reference used for docs sync: `origin/personal` `bf087d3166`, merged into the ticket branch as `f72210da3e`
- Post-integration verification reference: `evidence/DEL-11..17` (`handoff-summary.md`, Integration)

## Why Docs Were Updated

- Summary: the ticket changes how and how often updates are found, and lets the user opt into automatic updates. Specifically:
  - quota-free head reads of the git endpoint;
  - per-kind intervals, 15 min to 24 h;
  - agent runtimes as a notification kind;
  - opt-in automatic updates for packages, skill sources and runtimes;
  - the app's periodic check with its own switch and interval.

  The implementation updated six long-lived docs, and code review found them consistent with the code. Delivery re-read them on the integrated state and found no statement left from the old behavior: no "6 hours" and no "only at launch" in any doc or string catalog. No delivery edit was needed.
- Why this should live in long-lived project docs:
  - the network calls and their limits are a privacy and rate-limit statement;
  - the automatic-update rules decide when the node changes the user's packages, skills and runtimes without asking;
  - future kinds and settings build on the scheduler and record rules.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/update_notifications.md` | Pass, intervals, head read, gate (`api`/`web`), automatic outcomes, runtime kind | Updated (by implementation) | Sections Background Pass, Network Calls, GitHub Rate Limits, Settings, Automatic outcomes match the code |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Runtime checks in the background pass; update refusal while agents run | Updated (by implementation) | — |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Head-read check, automatic update | Updated (by implementation) | — |
| `autobyteus-server-ts/docs/modules/skills.md` | Head-read check, automatic update replacing local changes | Updated (by implementation) | — |
| `autobyteus-web/docs/settings.md` | Update checks card (intervals, switches, wait banner), panel switches, runtime rows | Updated (by implementation) | — |
| `autobyteus-web/docs/electron_packaging.md` | App periodic check, its switch and interval, busy/offline skip | Updated (by implementation) | — |
| `RELEASE.md`, `TESTING.md`, `data_migration_guideline.md` (changed on base by autobyteus-280/282) | Delivery rules after the merge | No change | The hygiene check now includes tracked imports; it was used in this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none in delivery) | — | — | The implementation's doc changes describe the final integrated behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Quota-free checks | A source check is one `git-upload-pack` `ls-refs` head read on github.com; it does not use the REST quota | `design-spec.md`, investigation AF-08 | `update_notifications.md` (Network Calls) |
| Per-kind intervals | Packages, skill sources and runtimes each have an interval of 15 min to 24 h, default 30 min (runtimes 60). A change applies to the next pass of that kind | REQ-001, AC-002 | `update_notifications.md` (Settings), `settings.md` |
| GitHub wait | The gate keeps separate `api` and `web` waits learned from 403/429/503, persisted across restarts and shown on the card | REQ-004, AC-004 | `update_notifications.md` (GitHub Rate Limits), `settings.md` |
| Automatic updates | Off by default per kind, with a one-time confirmation. They replace local changes, are announced as notifications, retry at most once per interval, and never update the app | REQ-005..009, AC-006..011 | `update_notifications.md` (Automatic outcomes), `skills.md`, `agent_packages.md` |
| Runtime updates | Only on the desktop's embedded node, never while agents of that runtime run; automatic ones wait | REQ-021/022, DEC-020 | `agent_runtimes.md`, `update_notifications.md` |
| App periodic check | Launch check plus a periodic check at the configured interval; skipped while busy or offline; can be turned off | REQ-012..015 | `electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Fixed 6-hour background check of packages and skill sources | Per-kind configurable intervals | `update_notifications.md`, `settings.md` |
| REST API latest-commit request per source check | Quota-free head read on github.com | `update_notifications.md` (Network Calls) |
| App update check only at launch | Launch plus periodic check, with its own switch | `electron_packaging.md` |
| Codex newest version from `api.github.com/.../releases/latest` | The github.com `releases/latest` redirect through the GitHub transport and gate | `agent_runtimes.md` |

## No-Impact Decision

- Not applicable. The docs were changed by the implementation, and they are verified here.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization
- Notes: FU-001 (the VIS-037 contact line on remote nodes) is recorded by the Solution Designer in `follow-ups.md`. Delivery found no further docs problems.
