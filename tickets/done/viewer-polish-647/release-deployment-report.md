# Delivery / Release / Deployment Report — autobyteus-647 (viewer-polish-647)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`, without a release. API/E2E's handoff names no release, no other document of the ticket asks for one, and `RELEASE.md` makes none the default, so none was made. A release is available: `release-notes.md` holds the user-facing notes.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (`origin/personal` `2bdfea0444`; the ticket never changed it). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery reran more than the guide's minimum after new base commits (one relevant check and both typechecks): the whole web suite, fifteen phone cases, both rebuilds, and a build-only iOS release run on the final head, because the ticket changes iOS Swift that only the release runner's Xcode builds and a build input (`pdfjs-dist` as a direct dependency).
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: `docs-sync-report.md` is current.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `bc4351cad7` (the release record of `v1.5.15-beta.1`)
- Latest tracked remote base reference checked: `origin/personal` `2bdfea0444` (`git fetch origin personal`, 2026-11-25, at the start of delivery and again before the final merge)
- Base advanced since bootstrap or previous refresh: `Yes` (autobyteus-649, a system prompt section removed: 30 non-ticket files, `autobyteus-server-ts` tests 18, src 9, docs 2 and `TESTING.md`; no file in common with the ticket's 25)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the worktree was clean; API/E2E's two commits `e931df7eb9` and `890f92bbb7` were already committed locally and are pushed with the branch)
- Integration method: `Merge` (`git merge --no-ff origin/personal`), merge commit `694896a154`; no conflict
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (commands and results below; evidence in `evidence/delivery/`)

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01` web typecheck | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02` contract `dist/` | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.` |
| `DEL-03` whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `Test Files 810 passed (810)`, `Tests 6264 passed \| 2 skipped (6266)` (implementation's IMP-001: the same 6264) |
| `DEL-04` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each; "The /mobile build holds no demo code." |
| `DEL-05` this ticket's phone cases and those sharing its viewers | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-89…92,MSP-108…118` | `mobile-shell probe: Pass`, fifteen cases `Pass`, `unknownBrowserErrors: 0`, cleanup `serversLeft: 0` (the 25 `failedRequests` are aborts, MSP-91's deliberate connection cuts and MSP-115's expected `ERR_REQUEST_RANGE_NOT_SATISFIABLE`). MSP-92, which API/E2E found to fail by chance (FU-002), passed |
| `DEL-06` build-only iOS release run on the final head | `gh workflow run release-ios.yml --ref codex/viewer-polish-647 -f publish_app_store_connect=false -f release_ref=codex/viewer-polish-647` | run `45619979408` on `694896a154`: `Resolve iOS Release Metadata` success, `Build And Test iOS App` success (Xcode 27 on the runner; 29 min 14 s; runs `AutoByteusMobileCoreTests` and `ios-simulator-smoke.sh`), `Validate iOS Publish Secrets` and `Archive And Upload` skipped; nothing published |
| Build-input rule (TESTING.md "Fresh-start build") | `git diff --name-only bc4351cad7...HEAD` | matches `autobyteus-web/package.json` and `pnpm-lock.yaml` (`pdfjs-dist` 4.10.38 as a direct dependency, the same version as `vue-pdf-embed`'s bundled copy). Proven from fresh clones by API/E2E at `812760b2ec` and `adcff4d2b2` (`--no-local`, `pnpm install --frozen-lockfile`, the release job's `build:electron:mac -- --arm64`: `build exit 0`, `[typecheck] PASS`, Prisma and terminal-runtime verify steps ok; the job's signing-policy step needs the runner's identity) and by the build-only Desktop Release run `45584353228` (implementation's IMP-007: five build jobs success, signing and publish skipped). No build input changed after `da70e7f049`, the commit that run built, and the base's new commits touch none |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | `PASS` (15 commits) before the first push; repeated on the merged state in the Finalization Record |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (new base commits were integrated). Not rerun by delivery: the server unit and integration suites (the ticket changes no server file, the base's new server commits have their own delivery, and the merged tree's server typecheck and build pass); the fresh-start build and the desktop build-only run (above); the iOS, Android and packaged-window journeys (API/E2E ran them).
- Delivery edits started only after integrated state was current: `Yes` (the merge came first)
- Handoff state current with latest tracked remote base: `Yes` at `2bdfea0444`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-002: Acceptance-Criteria Proof, 95 % final confidence, the default target met, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001, the failure-origin review of API-REV-001's AC-002 failure: `Design Impact` and `Requirement Gap`, resolved by SR-003 and IR-002), and the integrated-state rerun above. The direct low-risk route has no source review and no test-code review after the fix, as API/E2E's report says.
- What was mocked or not tested: the agent is a scripted runtime; iOS simulator (iOS 26.1) and Android emulator (API 35), no physical phone, so a device's Ring/Silent switch was not exercised (autobyteus-642's known limit); the apps' empty-reference screen was not rerun on IR-002's bundle (below); the packaged desktop's signing, notarization and the release job's signing-policy step need the release runner.
- Accepted unverified risk (`DEC-*`): none. The requirements doc's DEC-001 to DEC-003 are design decisions with no untested part, and no evidence decision accepted an untested criterion.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (no line numbers; a 6 px margin; editing works) | API-010, API-020, API-033, API-040; `API-020-packaged-window/packaged-window-result.json`; delivery's rerun of MSP-108 to 110 | packaged window 1440×900, a JSON file: `lineNumbers: 0`, `foldControls: 0`, `glyphMarginWidth: 0`, `marginWidth: 6`, first character `{` at offset 6; after typing and saving the file on disk ends `}\n}\n` then `\nEDITED-647.` (delivery read it with `od -c`; the result file's `savedIsOriginalPlusEdit: false` is API/E2E's own comparison, which trims the original's final newline, and MSP-110's `savedEqualsExpected` is `true`); delivery's run: `lineNumbers: 0`, `marginWidth: 6`, `firstCharOffset: 6`, desktop panel 444 px and maximized 1434 px, phone; iOS WKWebView and Android WebView per API-033 and API-040 | Proven |
| AC-002 (a zero-byte reference reaches the media viewer, no fetch error; a deleted one is unavailable) | API-011 r3, API-021, API-031 testF, API-040; `MSP-115-r3.json`, `packaged-remote-reference-result.json`, `packaged-remote-empty-reference.png`; delivery's rerun of MSP-115; delivery read the IR-002 diff | dev desktop and the phone page: `This video could not be played. Retry`, no "Failed to fetch"; packaged `file://` window on a remote node's Team reference (`windowContext … remote-api647-…`): the probe `bytes=0-0` answered `416 bytes */0`, the viewer shows "This video could not be played." with Retry (the screenshot), the deleted reference "Reference file unavailable"; delivery's run: the same on desktop and phone. **The apps' leg** (iOS testF, Android) ran on IR-001's code and was not rerun on IR-002's: IR-002 changed `emptyMedia` from `status === 416 && Content-Range === "bytes */0"` to `status === 416`, a strict superset, on a probe (`bytes=0-0`) that only an empty file can make unsatisfiable, and the apps' page is same-origin to the node, where the old check already matched; the phone page on IR-002's bundle (API-011 r3, delivery's MSP-115) is the same page code the apps load | Proven (the apps' leg by the superset argument and the same page code, not by a rerun) |
| AC-003 (iOS's own player screen, no app bar, every close path ends playback and the session, landscape for wide video, 574/642 classes pass) | API-030 to API-033; `video-wide-landscape-controls-shown.png`, `fake-node-class-diagnostics.txt`, `media-class-result.txt`; delivery's build-only iOS run | the screenshot (delivery opened it): landscape, iOS's ✕ and AirPlay at the top, the file's name and the scrubber at the bottom, no bar of the app; fake-node class 4 of 4, real-node media class 10 of 10, video class 8 of 8; the temporary diagnostics (removed) show for each close path (iOS close, swipe down, Back after a failure, the app replacing its screen) `host teardown runs` and `session end: deactivated=1`; the runner's iOS Core tests and smoke script pass on the final head | Proven (simulator only: a device's Ring/Silent switch not exercised) |
| AC-004 (the queue label names media) | API-003 | `DispatchQueue(label: "org.autobyteus.media-loader")` in `AuthorizedMediaLoader.swift:35` | Proven |
| AC-005 (one pdf.js worker for every PDF) | API-020, API-012, API-033, API-040; delivery's rerun of MSP-117 | packaged window: five rounds of three PDFs and five switches, `workers: [{scheme: blob, type: module}]`, `jsBlobs: 1`, `workerPort: false`, `workerSrc: ""`, no worker errors; delivery's phone run: three rounds, one module worker, one `text/javascript` blob; WKWebView and Android WebView draw the PDFs (Android `jsBlobs: 1`) | Proven |
| AC-006 (the status line clears on a run switch) | API-013, MSP-118; delivery's rerun | the line is shown in run A, absent in run B and when back in A; delivery's run: `MSP-118` `Pass` | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (no release was asked for in the handoff or the ticket). A release is available.
- Note for whoever releases: `v1.5.15-beta.1` already holds autobyteus-574 and autobyteus-642 (a tag contains both merges; delivery checked). This ticket sits on top of that beta, and its release note says what changed since it. The iOS player change reaches users only with a new iPhone app build; the page changes (no line numbers, the empty reference, the shared PDF worker, the status line) reach every client with the node and the desktop app.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/content_rendering.md` (the editor's gutter, the status line, the new PDF Worker section), `autobyteus-web/docs/agent_artifacts.md` (the empty reference), `autobyteus-web/docs/remote_access.md` (the iOS player's full screen), and a correction in `docs/design-cases.md`; kept from the ticket: `docs/design-cases.md` (three cases), `docs/ios_mobile_access.md`
- No-impact rationale (if applicable): n/a

## Ticket State Transition

- Ticket moved to `tickets/done/viewer-polish-647`: `Yes` (before the first push of the final commit)
- Archived ticket path: `tickets/done/viewer-polish-647`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/viewer-polish-647`, branch `codex/viewer-polish-647`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/viewer-polish-647` (delivery pushes with the explicit refspec; the branch was pushed once before the build-only run).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/viewer-polish-647` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push.

## Release / Publication / Deployment

- Applicable: `No`
- Method: `None` (no release was asked for)
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` for this finalization; `release-notes.md` is archived with the ticket for the next release (no `## What you need to do`).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (no stored field, no migration, no server change)
- Delivery action required: `None`
- Result and evidence: n/a

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the finalization merge on `personal`. Nothing persisted changes shape: the editor returns to line numbers, the empty reference to the fetch error, the iPhone player to the app's own bar, the PDF viewer to a worker per document. The iPhone player is in the app: a build made before the revert keeps the new player screen.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes` (Finalization Record below)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: run after the record commit's push (Finalization Record, last two bullets); its result is in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: by `send_message_to` after the record commit's push and the cleanup
- Terminal message/reference: the `send_message_to` message to the Solution Designer, address from `get_handoff_rules`

## Finalization Record

Written after the push of the merge, the way earlier tickets recorded theirs.

- Ticket branch `codex/viewer-polish-647`: committed (tip `93114ccd77`) and pushed to `origin` with the explicit refspec `HEAD:refs/heads/codex/viewer-polish-647` (`694896a154..93114ccd77`, a fast-forward of the tip pushed earlier for the build-only iOS run; the branch had been pushed by implementation up to `adcff4d2b2`, and API/E2E's commits `e931df7eb9` and `890f92bbb7` went up with delivery's first push). Secret Gate on `origin/personal..HEAD` before the push: `PASS`, 16 commits.
- Target refreshed before the merge: `git fetch origin personal` showed `2bdfea0444`, which the ticket branch already contained (merge `694896a154`); no re-integration and no re-verification were needed.
- Merge: on `finalize/viewer-polish-647` (from `origin/personal` `2bdfea0444`), `git merge --no-ff codex/viewer-polish-647` = `91cb17b06d` (parents `2bdfea0444` and `93114ccd77`; the merged tree equals the ticket branch's tree, `46683aa14c`). Secret Gate on the merged state: `PASS`, 17 commits. Hygiene check (`scripts/check_repository_artifact_hygiene.py`) on the archived tree: passed (105 565 tracked files).
- Push: `git push origin HEAD:personal` `2bdfea0444..91cb17b06d`; `origin/personal` = `91cb17b06d` afterwards.
- Release: none (no tag, no version bump, no pipeline beyond the one build-only iOS run, which published nothing).
- This record: committed on `finalize/viewer-polish-647` and pushed to `origin/personal` as the commit that follows `91cb17b06d`.
- The user's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, on `personal`): `git fetch`, then `git merge --ff-only origin/personal` after this record's push, only if it is on `personal` with no local commits and git accepts it; nothing is stashed, reset or checked out there. The result (commit, or why not) is in the terminal message.
- Cleanup, after this record's push: `git worktree remove --force /Users/normy/autobyteus_org/autobyteus-worktrees/viewer-polish-647` (only git-ignored and untracked build output remains), `git worktree prune`, delete the local branches `finalize/viewer-polish-647` and `codex/viewer-polish-647`, and delete delivery's own `/tmp/del647` and `/tmp/del647-*.txt`. Remote branch: `Not required` (the repository keeps pushed `codex/*` branches). API/E2E keeps `/tmp/api647` (and its simulator `api647-iPhone17`) until the Solution Designer asks. The result is in the terminal message.
