# Docs Sync Report — autobyteus-305, build step 2 (starter and server-packages volume)

This report holds the latest delivery round (DR-002, step 2). The step-1 report (DR-001) is in git at `77fb8bf2d1`.

## Scope

- Ticket: autobyteus-305, Docker nodes update their server in place (`docker-node-in-place-server-update`). Delivers **build step 2 of 5**.
- Trigger: code reviewer CRR-004 (`Not Applicable`, no durable test changed) after API-REV-002 Pass (94.7%), CRR-003 Pass (9.5/10), IR-002, ARCH-REV-003.
- Bootstrap base reference for this step: `origin/personal` @ `77fb8bf2d1` (step 1 merged as `eec6522b27`)
- Integrated base reference used for docs sync: `origin/personal` @ `77fb8bf2d1`. It had not moved, so the branch was already current.
- Post-integration verification reference: `evidence/DEL-03-step2-delivery-checks.log`

## Why Docs Were Updated

- Summary: implementation documented the starter, its package choice, `cli.mjs status`, the `<node>-server-packages` volume (Docker README, root README, server README) and the starter test layer (TESTING.md, own commit `82e2e7f931`). Delivery found one long-lived doc that the new REST route made incomplete: the remote-access route list.
- Why this should live in long-lived project docs: the route list in `remote_access.md` is the reference for which routes refuse phone credentials. A route missing there hides that `GET /rest/node-update` is owner-only.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/README.md` | Starter, selection, `NEEDS_NEW_IMAGE`, `cli.mjs status`, new volume, `test:starter` | No change | Accurate against API-12 and IMP2-08 |
| `README.md` (root), `autobyteus-server-ts/README.md` | Launcher volume lists (step 1 deferred the new volume to step 2) | No change | Both list `<node>-server-packages` |
| `TESTING.md` | Docker starter test layer; test-node package choice | No change | Matches IMP2-01 and the probes |
| `autobyteus-server-ts/docs/features/remote_access.md` | Lists the trusted-network owner routes | Updated | Added `GET /rest/node-update` |
| `GLOSSARY.md` | "Starter" defined in step 1 | No change | Still accurate |
| `DESIGN.md` | Rule 9 exception names C1 `/rest/node-update` | No change | — |
| `RELEASE.md` | Release assets, level check | No change | Step 2 adds no release asset; the starter sits after the system-part marker (level unchanged, DEL-03) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/features/remote_access.md` | Route list | `GET /rest/node-update` under trusted-network owner routes, with what it returns on servers without a starter | New route in `remote-access-route-policy.ts` (route class `TRUSTED_NETWORK_OWNER`) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Starter package choice | Installed package if it fits and is not older than built-in; else built-in unless older than the newest version that ran; else `NEEDS_NEW_IMAGE` with no server | design-spec DS-003 | Docker README (implementation) |
| Starter status | `docker exec <c> node /opt/autobyteus/starter/cli.mjs status`; starter log lines in the supervisord log | design-spec DS-007 | Docker README (implementation) |
| C1 route class | `/rest/node-update` refuses phones | AC-009 | `remote_access.md` (delivery) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| supervisord program `node dist/app.js` in the built-in package | supervisord runs the starter, which runs the chosen package | Docker README |
| Launcher config hash `v6` | `v7` (adds the server-packages volume) | Launcher code; Docker README volume list |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, then repository finalization into `personal` (no release).
- Notes: CR-N1's code side (step 1) was done in step 2 (`release-server-docker.yml` prints `-f publish_zh=true` for zh; IMP2-02).
