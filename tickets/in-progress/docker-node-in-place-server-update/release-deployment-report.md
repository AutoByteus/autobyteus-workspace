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

- Ticket branch commit result: `Completed`: `d5a9024922` (delivery records), after checkpoint `fed31bb5fb` and base merge `f0b2b43dbc`
- Ticket branch push result: `Completed` (Secret Gate PASS before the push)
- Finalization target remote / branch: `origin` / `personal`
- Target advanced after verification: `No` (`a8d7c87564` at both fetches)
- Merge into target result: `Completed`: `--no-ff` merge `0a223aa397`; Secret Gate PASS on the merged state; tree equal to the verified ticket branch
- Push target branch result: `Completed`: `a8d7c87564..0a223aa397`
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `Yes` (the user asked for a beta)
- Method: `Project Release Guide` (RELEASE.md: checks before tagging, release smoke, build-only run, `scripts/desktop-release.sh beta --branch finalize/… --no-push`, push `personal` and the tag, watch the four workflows together)
- Checks before tagging, on the state tagged (`f6a5c85175`), `evidence/DEL-09-pretag-checks-and-release-smoke-run2.log`: licensing consistent; hygiene passed; `scripts/check_secrets.sh v1.5.11-beta.5..HEAD` PASS (95 commits).
- **Release smoke and the user's Grok waiver:**
  - Run 1 on `0a223aa397` (`evidence/DEL-06-release-smoke-run1.log`): Claude 3/3, Codex 3/3, Antigravity 2/2, AutoByteus 2/2 PASS; Grok 2/3, with "different same-named skill" refused by Grok's quota (`429 … subscription:free-usage-exhausted … tokens (actual/limit): 604934/600000`).
  - The user waived Grok for this beta ("waive grok", 2026-10-30). Reason: the free tier's rolling 24-hour quota was used up by the day's earlier releases; it is not a product failure.
  - Run 2 on `f6a5c85175`: the same PASS set; all three Grok scenarios hit the same quota refusal (6× `free-usage-exhausted`), covered by the waiver.
- **Build-only release run:**
  - Run 1, `41121610105` on `0a223aa397`, failed (`evidence/DEL-07-build-only-run-1.log`). Both macOS jobs were cancelled by GitHub's scheduled `macos-14` brownout (the image retires 2026-11-02). Windows got `npm 404` for `tslib-2.9.1.tgz`, published 3 minutes before the build while its tarball propagated (transient; HTTP 200 at 20:25 UTC).
  - The user then instructed delivery to fix the CI pipeline ("We should update our Mac build, the CI pipeline … It belongs to you"). Delivery moved both desktop macOS jobs to `macos-15` (still Apple silicon; the x64 app was and is cross-built), with the target list in `autobyteus-web/docs/github-actions-tag-build.md`: commit `3359d828b1` on `codex/release-desktop-macos-15`, merged `--no-ff` into `personal` as `f6a5c85175`, with the Secret Gate passed. This resolves FU-007.
  - Run 2, `41124044082` on `f6a5c85175`: **success**, all five desktop targets incl. the macOS signing-policy and node-pty validations (`evidence/DEL-08-build-only-run-2.log`).
- Version / tag / release commit: `chore(release): bump workspace release version to 1.5.11-beta.6` `35d33852ef`, annotated tag `v1.5.11-beta.6`; `personal` re-fetched (still `f6a5c85175`) and pushed `f6a5c85175..35d33852ef`; tag pushed 21:01:52 UTC.
- Pipelines triggered and their results (`evidence/DEL-10-beta-rollout-and-package-checks.log`), all **success**:
  - Desktop Release `41127864410`: all five builds and Publish.
  - Android APK Release `41127864415`.
  - iOS App Store Connect Release `41127864440`: build, test, archive and TestFlight upload.
  - Server Docker Release `41127864490`: image, plus **Publish Server Package** for `linux/amd64` and `linux/arm64`.
- Published artifacts checked against what the release should produce:
  - GitHub release `v1.5.11-beta.6`: pre-release, not draft, **23/23 assets**, including the six `autobyteus-server-1.5.11-beta.6-linux-{arm64,x64}.{tar.gz,json,json.sig}`. GitHub "Latest" remains `v1.5.10`.
  - Docker Hub: `:1.5.11-beta.6` and `:beta` = `sha256:68965197f9b2…`; `:latest` unchanged (`sha256:a1c22e2e4186…`).
  - **AC-011 GitHub part, proven:**
    - both descriptions verify with the committed production public key;
    - the arm64 archive's SHA-256 matches its description;
    - a tampered description is rejected;
    - the unpacked arm64 archive is byte-identical (45,360 entries: files, links, modes) to `/opt/autobyteus/server-package` in the published image;
    - the package job neither timed out nor failed on the key pair.
  - Published image starter against the real GitHub releases: `update --track beta` → `NOT_NEWER` (this release found as newest beta); `--track stable` → `NOT_NEWER` (1.5.10).
- Release notes handoff result: `Used`. GitHub generated notes, as RELEASE.md says for betas, with the ticket's `release-notes.md` added above them by `gh release edit` after all four workflows had finished. Assets and tag were untouched (see the deviation).
- Release/publication/deployment result: `Completed`
- Not provable yet: the first real in-place update needs a release newer than this one (it is from 1.5.11-beta.6 to the next).

## Post-Finalization Cleanup

- Worktree and ticket branch: `Not required` (kept for steps 4–5). Local `finalize/…` branch deleted. Branch `codex/release-desktop-macos-15` (merged) left on the remote, like the ticket branch.
- Delivery's test images, containers and volumes (DEL-05 and the release checks), the pulled `autobyteus/autobyteus-server:1.5.11-beta.6` tag and the temporary download folders: removed. The user's nodes `autobyteus-server-0/1/2` were not touched.

## Release Notes Summary

- Release notes artifact: `release-notes.md` (written before finalization). Use: added to the beta's GitHub release body (see the deviation above).

## Environment Or Persisted-Data Transition Notes

- Step 3: `Not Affected` for data formats; DEC-005 copy and restore during an update. The beta also carries autobyteus-343's app-data migration, whose rollback statement is in that ticket's own release notes (`tickets/done/stored-runtime-names/release-notes.md`).

## Final Status

- Verification complete: `Yes` (from the evidence)
- Repository finalization complete: `Yes` (`personal` @ `0a223aa397`, then the CI fix `f6a5c85175` and the release commit `35d33852ef`)
- Applicable release complete: `Yes`: beta `v1.5.11-beta.6`, 4/4 workflows, 23/23 assets
- Applicable safe cleanup complete or not required: `Yes`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`

## Rollback Criteria

- RELEASE.md rollback rules. A Docker node moved to an image older than a version it ran refuses with `NEEDS_NEW_IMAGE`; downgrades are not supported.
