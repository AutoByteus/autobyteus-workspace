# Delivery / Release / Deployment Report — stable-release-v1.5.11 (autobyteus-375)

## Release / Publication / Deployment Scope

- **Release Requested:** stable `v1.5.11` from beta `v1.5.11-beta.12`. The work is already merged; there is no software change. The handoff is `handoff.md`, from the Solution Designer, 2026-11-02.
- Contents since `v1.5.10` (2026-10-29): 37 ticket merges on `personal`, listed in the notes' sections.
- Docs sync, handoff summary and Verify From Evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide: `RELEASE.md` read from `origin/personal` @ `c4788d81b5`.
- Deviations from the guide and why: none. The waiver below is the guide's own exception, decided by the user.
- Proposed guide fixes: `None`.

## The User's Decisions

- **Release smoke waiver: Grok.** The user, 2026-11-02, verbatim: "Waive grok please release the stable version". Reason: Grok's free quota was exhausted (`429 … free-usage-exhausted`, rolling 24 h) by the same day's beta smoke checks.
- **No Codex waiver.** Codex must pass.
- **The paid live suites that autobyteus-318 repaired:** not requested, so not run (per the handoff: "Run them only if he says so").

## Checks Before Tagging

| Check | Result |
| --- | --- |
| `python3 scripts/check_licensing.py` | Pass |
| `python3 scripts/check_repository_artifact_hygiene.py` | Pass |
| Secret Gate `v1.5.10..origin/personal` (753 commits) and the ticket branch | Pass (`evidence/REL-01-pretag-checks.log`) |
| Build-only release run `41473349105` on `personal` @ `c4788d81b5` | Pass on attempt 1: all five desktop targets (`evidence/REL-03-build-only-run.log`) |
| Release smoke check `python3 scripts/release_smoke.py` | SMOKE_RESULT |

## Release Notes

- Curated, user-facing notes: `tickets/done/stable-release-v1.5.11/release-notes.md`, copied by the release script to `.github/release-notes/release-notes.md`.
- They cover the handoff's points:
  - the first update from 1.5.10 does not resume busy agents;
  - update Docker nodes together with the desktop, including reinstalling the launcher once, since 1.5.10 images cannot update in place;
  - GitHub through the Integrations page;
  - the automatic update switch, off by default, with about 36 s on macOS;
  - rollback.
- **Rollback wording differs from the handoff; reported to the Solution Designer.** The only startup migration added since `v1.5.10` is `raw-trace-manifest-runtime-names`, which makes no backup and whose ticket says rolling back works. No vault migration was added in this range; the vault migration and its backups date from 1.5.9. So the notes say:
  - rolling back to 1.5.10 is possible;
  - removed empty never-started runs are not restored;
  - a runtime-switched run has not been tested on 1.5.10.
  They keep the 1.5.10 notes' backup and unsupported-rollback warning for users coming from before 1.5.9.

## Release

RELEASE_SECTION

## Repository Finalization

FINALIZATION_SECTION

## Post-Release Cleanup

CLEANUP_SECTION

## What The User Should Check After Updating

- The app shows **1.5.11** (Settings → Updates), and **Update automatically** is off unless turned on.
- Docker nodes: after reinstalling the launcher and `autobyteus-docker upgrade --all`, each node in **Nodes → Manage Nodes** shows server `1.5.11` and no "Not reachable.".
- GitHub, if connected in a 1.5.11 beta: the Integrations page shows it connected after importing `https://github.com/AutoByteus/autobyteus-integrations`.
- The next update after this one is the first in which busy agents continue by themselves.

## Rollback Criteria

- Never move or delete the published tag. Fix forward with `1.5.12`.
- Rolling back to 1.5.10 is possible, with the caveats in the notes. The desktop never downgrades by itself; Docker users pin `:1.5.10`.

## Final Status

FINAL_STATUS_SECTION
