# Docs Sync Report — autobyteus-305, build step 3 (in-place update by command)

This report holds the latest delivery round (DR-003, step 3). Earlier rounds are in git: DR-001 (step 1) at `77fb8bf2d1`, DR-002 (step 2) at `6b34f900b6`.

## Scope

- Ticket: autobyteus-305 (`docker-node-in-place-server-update`), **build step 3 of 5**.
- Trigger: code reviewer CRR-006 (`Not Applicable`, no durable test changed) after API-REV-003 Pass (94.7%), CRR-005 Pass (9.5/10), IR-003, ARCH-REV-004, SR-009/SR-010.
- Bootstrap base reference for this step: `origin/personal` @ `6b34f900b6`
- Integrated base reference used for docs sync: `origin/personal` @ `a8d7c87564` (autobyteus-343, stored runtime names, with a new app-data migration), merged as `f0b2b43dbc`
- Post-integration verification reference: `evidence/DEL-04-step3-post-integration-checks.log`, `evidence/DEL-05-integrated-image-github-source.log`

## Why Docs Were Updated

- Summary: implementation documented the `update` command, tracks, refusals, `NO_PACKAGES_VOLUME` and the reinstall (Docker README, root README), the starter's `update` subcommand and test source (Docker README), and the new rollout path (RELEASE.md Deployment). Delivery checked these against the integrated state and found nothing to change. The user-facing summary is the ticket's `release-notes.md`, written for the beta that ships steps 1–3.
- Why this should live in long-lived project docs: `update` is a new user command, and the reinstall is a one-time user action.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | `update`, tracks, refusals, `status`, `NO_PACKAGES_VOLUME` + reinstall, `cli.mjs update`, test source | No change | Matches API-31..API-36 |
| `README.md` (root) | `autobyteus-docker update` usage | No change | — |
| `RELEASE.md` | Deployment section now names in-place updates; 23 assets (step 1) | No change | Accurate; the first-release checks are in this delivery's report |
| `autobyteus-server-ts/docs/features/remote_access.md` | Owner route `GET /rest/node-update` (added in DR-002) | No change | Step 3 adds the `updateBlocker` field, not a route |
| `GLOSSARY.md` | "In-place update", "Starter", "Server package" | No change | Still accurate |
| `TESTING.md` | Starter test layer | No change | `test:starter` now runs 48 tests; the rule is unchanged |

## Docs Updated

None in long-lived docs. Ticket artifact added: `release-notes.md` (user-facing, for the release that ships step 3).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| In-place update by command | Tracks per saved tag, verification order, rollback on the pre-update data, refusal codes | design-spec DS-005/DS-006 | Docker README (implementation) |
| Old-launcher nodes | `NO_PACKAGES_VOLUME`; reinstall the launcher, then `upgrade --all` | RU-23 | Docker README (implementation), release notes (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Moving a node to a newer server only by a new image | `autobyteus-docker update` (in place); `upgrade --all` stays for new images | Docker README, root README, RELEASE.md Deployment |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification, finalization into `personal`, then the beta the user asked for (RELEASE.md).
