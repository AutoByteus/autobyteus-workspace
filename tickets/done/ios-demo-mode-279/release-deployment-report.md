# Delivery / Release / Deployment Report — ios-demo-mode-279 (autobyteus-279)

Status: **finalized on `personal`; no release from this ticket** (the release team cuts v1.5.14-beta.3 from `personal` after the merge; its iOS run takes this build to TestFlight on the founder's word).

## Release / Publication / Deployment Scope

- Ticket `ios-demo-mode-279` (Project Task `autobyteus-279`), `task_size: Large`, `architectural_risk: High`, reviewed route (`handoff-summary.md`).
- Scope: base refresh, docs sync, verification from evidence, the build-only release run (NT-01), finalization onto `personal` when the founder says so, the archive and cleanup. No release from this ticket. Nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word (REQ-014).

## The Founder's Words

- On the push and the build-only run (relayed verbatim by the Solution Designer, 2026-11-20): **"Ok run it"**. He was told it is the build-only run with `publish_app_store_connect=false`: simulator build and test only, no signing, no upload, no contact with Apple, about 11 minutes.
- On the merge into `personal` (relayed verbatim by the PM through the Solution Designer, 2026-11-20): **"If the iOS demo mode is finished we should release"**. The Solution Designer's GO followed with both conditions met: (a) its App Reviewer sweep passed, (b) v1.5.14-beta.2 is published (a pre-release; `origin/personal` @ `568f9ae032`). His word covers the TestFlight upload by the next beta's iOS run; delivery cuts no tag and submits nothing to Apple.
- Before that, on the merge: The Solution Designer's recommendation to him: merge after (a) its own App Reviewer sweep on the built app passes and (b) beta v1.5.14-beta.2 is out; the next beta then takes the demo to TestFlight. Why it needs his word: `release-ios.yml` runs on every `v*` tag push and a tag run publishes (beta.1's iOS run 44358782422 ran "Archive And Upload To App Store Connect"), so once this is on `personal` the next release uploads this build.

## Project Release Guide

- `RELEASE.md` at `origin/personal` @ `422a2955c5`.
- Followed: the build-only release run on the ticket branch before the merge, for a change to `.github/workflows/release-ios.yml` (§ Build-only release run; DESIGN.md rule 12); hygiene and the Secret Gate before the push.
- Deviations: none. Proposed guide fixes: none.

## Initial Delivery Integration Refresh

- Bootstrap base: `origin/personal` @ `8430d9ef12` (autobyteus-540's record; 540 and 500/533 were already in it).
- Latest base checked: `422a2955c5` (2026-11-19), and again before the push on 2026-11-20 (unchanged).
- Base advanced: `Yes`, 60 commits: autobyteus-5 (protected Ubuntu AppImage start, authenticated managed updates: `autobyteus-web/electron`, `linux-install`, desktop packaging, the update notifications UI, `release-desktop.yml`) and autobyteus-560 (the server's Work Journal rendering). No file changed on both sides; no protocol or phone code in the base change.
- Checkpoint: `7a88198a2b` (the package's uncommitted documents and Product evidence, without the App Store Connect screenshot, see below).
- Integration: `Merge`, `0e58926e03`, no conflicts.
- Post-integration checks (`evidence/delivery/`):

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 (`DEL-01`) |
| `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`, PASS (`DEL-02`) |
| `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, PASS (`DEL-02`) |
| Web unit tests: the ticket's specs (mobile connection, run list, run screen, conversation feed, artifact viewer, split layout, own-send follow, `demo/`, `scripts/__tests__`, `utils/remoteAccess`) and the base's (`components/notifications`, `appUpdateStore`, `components/settings`) | `Test Files 1 failed \| 102 passed (103)`, `Tests 1 failed \| 717 passed (718)` (`DEL-03`). The failure, `ServerSettingsBasicsPanel.spec.ts` "composes only current endpoint and focused Basics cards", fails the same way on a clean checkout of `origin/personal` @ `422a2955c5` (`DEL-03b`): pre-existing, FU-006 |
| `autobyteus-ios/scripts/prepare-demo-web.sh --build` | exit 0; "The demo answers all 252 compiled operations"; DemoWeb 13 MB (`DEL-04`) |

- Not rerun after the merge, and why: the iOS app and the phone screens are untouched by the base; the iOS build and tests ran on the runner from the merged state (NT-01, below).

## Second Delivery Integration Refresh

- `origin/personal` moved to `568f9ae032` (v1.5.14-beta.2: `a728fbcad3` the version bump and the released-migration order, `568f9ae032` its record). Shared file: `autobyteus-web/package.json` (the version line; the ticket changed scripts), merged cleanly.
- Merge `a1147ba90f`, no conflicts; outside `tickets/` it brings only `autobyteus-web/package.json` (version) and `autobyteus-server-ts/src/app-data-migrations/released-migration-order.json`.
- Rerun: both typechecks PASS at their baselines (server 1006 in 315, web 87 in 37) (`DEL-06-typechecks-refresh2.log`). Nothing else rerun: no code the ticket uses changed.

## Verification From Evidence

- Judgement: the evidence proves the change works on iOS simulators with a real node; the parts only the founder can check come after his word (REQ-014). Details and the files relied on: `handoff-summary.md` § Verification Summary.
- No user check is needed before the merge; the device and TestFlight checks (AC-002 camera, AC-003 airplane mode, AC-009, AC-010) are the founder's, on his word, after a TestFlight build exists.

## The Push And The Build-Only Run (NT-01)

- Hygiene: `check_repository_artifact_hygiene.py` exit 0.
- Secret Gate `origin/personal..codex/ios-demo-mode-279`: first **BLOCKED** on one `generic-api-key` finding in `evidence/api-e2e/ios/API-02x-explore-safari.log` line 1 (commit `49e69c9887`). Checked by shape and context without printing it: the value is the XCTest name `ApiE2E279UITests/testExploreSafari` after the label "API-02x-explore-safari:". Allowlisted in `.gitleaks.toml` for exactly that value, the generic rule only and that file only (`a46471f61a`), in the form the file asks for. Then **PASS**.
- Also scanned the tracked ticket files for pairing codes, `mra_` credentials, `access_token=` values and bearer tokens: none.
- Not committed: `evidence/apple-review/app-store-connect-review-message.jpg` (the App Store Connect page shows the account holder's name and the provider number, which appear nowhere on `personal`; the repository is public). Kept in the private delivery record.
- Pushed `codex/ios-demo-mode-279` @ `a46471f61a` (2026-11-20).
- `gh workflow run release-ios.yml --ref codex/ios-demo-mode-279 -f publish_app_store_connect=false` → run **44683214480**, **success** (05:46–06:05Z) (`DEL-05-NT01-build-only-run.txt`):
  - Build And Test iOS App: success. Xcode 26.3, iPhoneOS SDK 26.2; "Build the bundled demo" from `pnpm install`: "The demo answers all 252 compiled operations", DemoWeb 13 MB; core tests `Executed 56 tests, with 0 failures`; iPhone smoke `Executed 8 tests, with 0 failures`, "executed and passed without skips"; the release contract check passed.
  - Validate iOS Publish Secrets and Archive And Upload To App Store Connect: **skipped**; "Publish requested: false". Nothing was signed or uploaded; nothing reached Apple.
  - Artifact `ios-build-test-artifacts` (id 14605478916, expires 2026-12-04): the simulator app `AutoByteus_personal_ios-ci-341-simulator-app.zip` (Debug, with `DemoWeb/`), logs and result bundles.

## The Solution Designer's App Reviewer Sweep On The Built App (merge condition (a))

- Verdict: **pass** (2026-11-20), `evidence/build-sweep/verdict.md` (copied from `/Users/normy/autobyteus_org/autobyteus-worktrees/_solution-designer-reports/ios-demo-279-build-sweep/` with its scripts, run summaries and screens).
  - Web: the demo bundle `dist-mobile-demo/public` from the integrated state, served as the app's scheme handler serves it, at 440×956, 1180×820 and 820×1180: 40 rows each, 0 findings, 0 console errors, 0 external requests; sheets, attach and VNC Control clean.
  - Native: a Release simulator build of the worktree; `DemoUITests` and `DemoIPadUITests` on its own iPhone 17 Pro Max and iPad Air simulators pass, except the kept-share test once in 9 runs (the first run on a newly created simulator, 97 s on the start screen; the other 8 runs, 3 on freshly erased simulators, pass in about 10 s).
- Residual risks it records (not blocking): R-1 the kept share at the first launch (for the real-iPhone check: share the demo link from Safari, then open the app); R-2 what simulators cannot prove (camera scan of the printed QR, the Camera app's link, airplane mode, the review notes on a device).
- Its note on copy: the build's "press Show QR code" is right; the Product specification is out of date (FU-007).
- Condition (b): v1.5.14-beta.2 published (2026-11-20). The founder's word: above.

## Finalization

- Archive to `tickets/done/ios-demo-mode-279/`; hygiene; Secret Gate; `finalize/ios-demo-mode-279` from `origin/personal`, `git merge --no-ff codex/ios-demo-mode-279`, push to `origin/personal`. Commits, the user's checkout and cleanup: in the record commit after the merge (§ Finalization Result).

## Finalization Result

- Ticket branch `codex/ios-demo-mode-279` @ `5e4643ef99` pushed; hygiene exit 0; Secret Gate PASS over `origin/personal..codex/ios-demo-mode-279` and over the merge.
- Merge commit **`f7b24c8622`** (`--no-ff`, from `finalize/ios-demo-mode-279` on `origin/personal` @ `568f9ae032`) pushed to `origin/personal` at 10:18Z (2026-11-20). This record commit follows it.
- The user's checkout: fast-forwarded with `git merge --ff-only origin/personal` only (result in the Delivery Completed message).
- Cleanup: the worktree, the local and remote `codex/ios-demo-mode-279`, the local `finalize/ios-demo-mode-279` and `/tmp/dlv-279` (after the private record copy).

## Release / Deployment

- Release: `None` from this ticket. Deployment: `None`.
