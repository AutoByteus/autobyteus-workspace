# Delivery / Release / Deployment Report — autobyteus-305, build step 3 (in-place update by command) and beta v1.5.11-beta.6

This report holds the latest delivery round (DR-003, step 3). Earlier reports are in git: DR-001 at `77fb8bf2d1`, DR-002 at `6b34f900b6`.

## Release / Publication / Deployment Scope

Repository finalization of build step 3 of 5 into `personal`, then the **beta release the user asked for** ("if everything is fine after your auditing. lets release a new beta", 2026-10-30). The beta carries steps 1–3 and everything else merged into `personal` since v1.5.11-beta.5.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `a8d7c87564`, read in the ticket worktree after integration. This step's change to it (Deployment section) is part of the merge.
- Deviations from the guide and why:
  - **The pre-release body gets one added section.** RELEASE.md says beta releases use GitHub generated notes. This beta is the first that needs a user action (reinstall the launcher, then `upgrade --all`, or in-place updates are refused with `NO_PACKAGES_VOLUME`). So after all four workflows finish, the ticket's `release-notes.md` is added above the generated notes with `gh release edit`. The generated notes are kept, and no asset or tag changes.
  - **From the generic delivery steps, as in DR-001/DR-002:** the ticket folder is not moved to `tickets/done/`, and the worktree and branch are kept for steps 4–5.
- Proposed guide fix (needs the user's agreement): RELEASE.md could say that a beta whose change needs a user action adds that action to the generated notes. Not changed.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md` (`Updated`)
- Delivery revision record: `delivery-revision-record.md`, current `DR-003`
- `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`. Classification unchanged by delivery.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `6b34f900b6`
- Latest tracked remote base reference checked: `origin/personal` @ `a8d7c87564`
- Base advanced: `Yes` (autobyteus-343: stored runtime names, a new app-data migration `raw-trace-manifest-runtime-names`)
- Local checkpoint commit result: `Completed`: `fed31bb5fb`
- Integration method / result: `Merge` → `f0b2b43dbc`, no conflicts, no file changed on both sides
- Post-integration executable checks rerun: `Yes`
  - DEL-04 (`evidence/DEL-04-step3-post-integration-checks.log`):
    - `test:starter` `# pass 48 / # fail 0`;
    - script tests `Ran 184 tests … OK (skipped=2)`;
    - `vitest run tests/unit/node-update tests/unit/remote-access tests/architecture` `Tests 123 passed`;
    - server `typecheck exit 0`;
    - level 1 unchanged; actionlint clean; `shellcheck -s bash node-update.sh` clean;
    - licensing, hygiene, Secret Gate PASS.
  - DEL-05 (`evidence/DEL-05-integrated-image-github-source.log`, `…-build-excerpt.log`): an arm64 image from the merged tree, `server-package.json … 62 migrations` (the base's migration included).
    - Health `ok` in 8 s; image public key `cmp` equal to the committed pem; no source override.
    - With a test-owned server-packages volume, against the **real GitHub releases**: `update --track beta` → `{"refused":"NOT_NEWER","message":"This node runs 1.5.11-beta.5; 1.5.11-beta.5 is not newer."}` (newest GitHub beta resolved); `update --version 1.5.11-beta.99` → `NO_PACKAGE_FOR_VERSION … autobyteus-server-1.5.11-beta.99-linux-arm64.json is missing from the release.`
    - Server pid 103 unchanged. Container, volume and image removed.
- Post-integration verification result: `Passed`
- Delivery edits started only after the integrated state was current: `Yes`

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on: the execution report (API-REV-003) and its Cases, IMP3-01..10, the API-31..36 log opened below, DEL-04 and DEL-05.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-002 (update by command, track or version; same container and image) | API-31, API-36 (`API-3x-launcher-update.log`) | `autobyteus-server-0: Updated to 1.5.13.`, `same container and same image after the update`, C1 `"version":"1.5.13"`; `update --all` per track and pin; PowerShell `Updated to 1.5.13.` | Proven |
| AC-003 (altered or wrongly signed → refused, nothing changes) | API-32 | `ARCHIVE_MISMATCH`, `DESCRIPTION_MISMATCH`, `SIGNATURE_INVALID: The package description for 1.5.18 is not signed by AutoByteus.`, each with the same starter pid and state | Proven (test key); the production key is proven by the first published package plus this beta's own verification in the package job |
| AC-004 (fails after switch → old version on pre-update data, no retry) | API-32, IMP3-07/08 | `FAILED_AFTER_SWITCH: 1.5.14 did not come up …; 1.5.11-beta.5 runs again on the data as it was before the update.`, `the 1.5.14 migration is gone (data restored)`, `90 s later: same update record`, `exactly one update request for 1.5.14` | Proven |
| AC-005 (needs a newer system layer) | API-32 | `NEEDS_NEW_IMAGE: … needs system level 99, this image provides 1. Get it with: autobyteus-docker upgrade --all --tag 1.5.15` | Proven |
| AC-006 (image older keeps the installed version; newer runs the image's) | API-31 | `node 0 keeps the installed 1.5.13 (built-in 1.5.11-beta.5 is older)`, `node 0 runs the image's 1.5.21 (built-in)` | Proven |
| AC-008 (not newer → refused) | API-31/32/36, DEL-05 | `NOT_NEWER` (also against real GitHub) | Proven |
| AC-012 (no secrets in logs) | API-32 | `no 'PRIVATE KEY' and no line of the test private key in the node's logs` | Proven |
| AC-013 (no package published) | API-32, DEL-05 | `NO_PACKAGE_FOR_VERSION` for 1.5.19 and, against real GitHub, 1.5.11-beta.99 | Proven |
| RU-23 (`NO_PACKAGES_VOLUME`, fix by reinstall + `upgrade --all`) | API-33 | `refused (NO_PACKAGES_VOLUME): … Reinstall the launcher, then run: autobyteus-docker upgrade --all`; after it, `server-packages volume mounted` | Proven |
| AC-001, AC-009 request part, AC-010; AC-007 | — | Steps 4 and 5 | Not in step 3 |

- The log's `CHECK FAILURES: 2` expected step lines that the launcher's 2 s polling can skip (`checking`, `restarting`); the target and result printed every time. They come from the check's expectation, not from a defect.
- Confidence 94.7%, no category below 90%; the gap is FU-006's pre-existing PowerShell coverage (accepted as in DR-002).
- More evidence requested: `None`. User check needed: `No`.
- CR3-N1 (imprecise self-check failure message) is not taken in delivery; it is for implementation with step 4. It refuses safely as is.

## Release Decision

- Decision: `Beta`
- Decided by: the user, 2026-10-30: "if everything is fine after your auditing. lets release a new beta".

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`. Result: no long-lived doc change needed; `release-notes.md` written.

## Ticket State Transition

- Ticket moved to `tickets/done/`: `No` (steps 4–5 remain)

## Repository Finalization

To be completed in the DR-003 Finalization Record.

## Release / Publication / Deployment

To be completed after the release.

## Post-Finalization Cleanup

- Worktree and branch: `Not required` (kept for steps 4–5). Delivery's image, container and volume for DEL-05: removed.

## Release Notes Summary

- Release notes artifact: `release-notes.md` (written before finalization). Use: added to the beta's GitHub release body (see the deviation above).

## Environment Or Persisted-Data Transition Notes

- Step 3: `Not Affected` for data formats; DEC-005 copy and restore during an update. The beta also carries autobyteus-343's app-data migration, whose rollback statement is in that ticket's own release notes (`tickets/done/stored-runtime-names/release-notes.md`).

## Rollback Criteria

- RELEASE.md rollback rules. A Docker node moved to an image older than a version it ran refuses with `NEEDS_NEW_IMAGE`; downgrades are not supported.
