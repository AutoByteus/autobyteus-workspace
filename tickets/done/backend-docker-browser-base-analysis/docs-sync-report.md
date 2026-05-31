# Docs Sync Report

## Scope

- Ticket: `backend-docker-browser-base-analysis`
- Trigger: API/E2E validation passed on 2026-05-30; delivery-stage latest-base refresh and docs synchronization.
- Bootstrap base reference: `origin/personal` at `2f545609568b7cb369e4b4b086fa9268cb7fd3e8` (`chore(release): bump workspace release version to 1.3.34`)
- Integrated base reference used for docs sync: `origin/personal` at `2f545609568b7cb369e4b4b086fa9268cb7fd3e8` after `git fetch origin --prune` on 2026-05-30.
- Post-integration verification reference: `git diff --check` passed; `python3 -m unittest scripts/tests/test_public_docker_launcher_shared_workspace.py` passed (`Ran 9 tests`, `OK (skipped=1)` because `pwsh` is unavailable).

## Why Docs Were Updated

- Summary: Long-lived Docker docs now describe the new persistent Chromium profile volume mounted at `/home/vncuser/.config/chromium`, the public launcher module-install behavior after the launcher split, and the fact that `workspace apply --all` applies the current launcher volume/bind-mount set while keeping named volumes and host folders.
- Why this should live in long-lived project docs: The change affects normal user/operator Docker setup, direct `docker run` examples, public no-clone launcher installation expectations, storage inspection output, and the durable persistence model for browser cookies, local storage, and preferences.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root public launcher quickstart and managed-container persistence model. | `Updated` | Already updated before delivery to mention installed support modules, Chromium profile named volume, and current launcher volume/bind-mount set. |
| `autobyteus-server-ts/README.md` | Server package Docker-node setup section also documents launcher persistence behavior. | `Updated` | Delivery added the support-module install note, Chromium profile named volume, and current launcher volume/bind-mount wording so this doc no longer preserves the old volume model. |
| `autobyteus-server-ts/docker/README.md` | Primary server Docker guide, direct `docker run` examples, and persistence reference. | `Updated` | Already updated before delivery to include Chromium profile volume in launcher, source-helper compose, and direct-run docs. |
| `docker/README.md` | Personal all-in-one Docker guide. | `Updated` | Already updated before delivery to include `main-allinone-chromium-profile`. |
| `docs/android_mobile_access.md` | Ownership-boundary guide mentions the public Docker launcher. | `No change` | Existing text is intentionally high-level (`named volumes`) and remains accurate without enumerating all Docker volumes. |
| `autobyteus-web/docs/settings.md` | Docker Guide tab developer notes mention launcher-owned named volumes and bind mounts. | `No change` | Existing description remains accurate at the UI-guidance level and does not enumerate the old volume set. Updating visible localization copy would be product source work rather than delivery docs sync and is not required for truthful docs. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | User/operator Docker docs | Added installed support-module note, Chromium profile named volume, and generalized one-time recreate wording. | Keep root quickstart aligned with split launcher distribution and persistent browser profile behavior. |
| `autobyteus-server-ts/README.md` | User/operator Docker docs | Added installed support-module note, Chromium profile named volume at `/home/vncuser/.config/chromium`, and current launcher volume/bind-mount apply wording. | Remove stale server README understanding that only app data/root/workspace named volumes are private persistent state. |
| `autobyteus-server-ts/docker/README.md` | User/operator Docker docs | Added Chromium profile volume to launcher-managed container description, direct `docker run`, public launcher volume list, and source-helper compose volume list. | Make server Docker launch docs match the final compose/launcher behavior. |
| `docker/README.md` | User/operator Docker docs | Added persistent browser profile section for `main-allinone-chromium-profile`. | Make personal all-in-one persistence docs match `docker/compose.personal-test.yml`. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Persistent Chromium profile volume | Backend Docker containers based on `autobyteus/chrome-vnc` must mount a per-node/per-project Docker named volume at `/home/vncuser/.config/chromium` so browser profile state survives normal container recreation. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `docker/README.md` |
| Public launcher split distribution | Public launcher install writes the entry plus adjacent support modules locally; installed commands do not require a repository checkout. | `requirements.md`, `design-reentry-report.md`, `implementation-rework-handoff-cr001.md`, `review-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |
| Existing managed container recreation | `workspace apply --all` safely recreates managed containers to apply the current launcher volume/bind-mount set while keeping named volumes and host folders. | `requirements.md`, `api-e2e-validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Monolithic public Bash/PowerShell launcher implementation files as the only source payload. | Thin public entries plus adjacent Bash/PowerShell support modules that remain no-clone installable. | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, plus source files under `scripts/public/docker/autobyteus-docker.d/`. |
| Docker docs that described only app-data/root/workspace named volumes as private persistent container state. | Docs that include `<node>-chromium-profile`, `autobyteus-server-chromium-profile`, and `main-allinone-chromium-profile` at `/home/vncuser/.config/chromium`. | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md`, `docker/README.md`. |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A — docs were updated`
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete on the latest-base integrated state. Repository archival, final commit/push/merge, tag/release, server Docker publication, and cleanup remain held until explicit user verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
