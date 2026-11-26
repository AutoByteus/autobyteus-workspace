# Delivery / Release / Deployment Report — autobyteus-516 Stage 1

## Release / Publication / Deployment Scope

Stage 1 of AutoByteus Extensions: the extension foundation on every node, proven by moving Voice Input onto it. Repository finalization into `personal` of this repository. No release, tag, publication or deployment (see Release Decision). The second repository, `autobyteus-extensions`, is local only and was not published.

- `task_size`: `Large`; `architectural_risk`: `High`; route: reviewed (architecture review ARCH-REV-002 Pass, source review CRR-002 Pass after CRR-001 Local Fix, API/E2E API-REV-001 Pass, test-code review CRR-003 Pass).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from `origin/personal` @ `fdde5406fa` (in the ticket worktree, not the main checkout). Delivery added two sections to it in commit `3f2e359943` (below).
- Deviations from the guide and why: `None`. The guide's "delivery audits; it does not redo" applied: the evidence was audited, no suite was rerun (the base had not advanced). Delivery ran `scripts/check_repository_artifact_hygiene.py` (path rules before the final commit) and the Secret Gate twice.
- Proposed guide fixes, and whether the user agreed: two additions, written by delivery from what the founder decided (releases only on his word; the empty catalog key is a blocker) as relayed by the Solution Designer and the code reviewer. They add, and change no existing rule. The founder has not confirmed them; he can reword or drop them:
  - **Extensions catalog check** (under Checks Before Tagging): before every beta and stable tag the built-in `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` must be non-empty and equal the extensions repository's `catalog-public-key.pem`, and the fixed release `catalog` must hold the catalog and its `.sig` and list `voice-input`. A failure is a blocker, not a waiver.
  - **AutoByteus Extensions** (Workflow Reference): the independent repository, its two workflows, the signing secret `EXTENSIONS_CATALOG_SIGNING_KEY`, key changes as a coordinated change.

## Handoff Summary

- Handoff summary artifact: `tickets/done/autobyteus-516-extensions/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/autobyteus-516-extensions/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the integration refresh (the branch was already current).

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `fdde5406fa`
- Latest tracked remote base reference checked: `origin/personal` @ `fdde5406fa` (fetched at the start of delivery, before the ticket push, before the merge and before the target push)
- Base advanced since bootstrap or previous refresh: `No`
- New base commits integrated into the ticket branch: `No`
- Local checkpoint commit result: `Not needed`
- Integration method: `Already current`
- Integration result: `Completed`
- Post-integration executable checks rerun: `No`
- Post-integration verification result: `Passed` (nothing to integrate; the reviewed and validated head `9002db14e6` is the state delivery started from)
- No-rerun rationale: no new base commits, so the integrated state is the validated state. `RELEASE.md` asks for one relevant check and both typechecks only when new base commits come in.
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes`
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: the API/E2E execution report (`api-e2e-execution-coverage-report.md`: cases API-R1…R7 reused, API-01…API-15, acceptance-criteria proof, final confidence 95% with scores 96/96/95/95/96/95/95, no category below 90%), the files its Look For column names, the code review and test-code review reports, and the implementation handoff's checks. All paths are under `tickets/done/autobyteus-516-extensions/evidence/`.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement (`Proven`/`Not Proven`/`User Check`/`Accepted Risk (DEC-*)`) |
| --- | --- | --- | --- |
| AC-001 | API-04 (`API-04-evidence.json` result Pass, 10 cases), API-08 (`API-08-start2-extensions.json`), API-10 (`API-10-install.json`), API-12 screenshot `API-12-docker-extensions.png` | Cards with name, version, state and description for the window's node; node line "Extensions of Docker Test Node · 127.0.0.1:57499" on the Docker window | Proven |
| AC-002 | API-10 `API-10-install.json`, `API-10-page-check.json`, `API-10-test.json`; API-04 | Install 101 s with phases "Downloading Voice Input 1.0.0" → "Preparing the speech model…" → "On: Installed and on"; `refused: []`; page frame `sandbox="allow-scripts"` on `…/rest/extensions/voice-input/ui/index.html`, language saved `en`; Test 360 ms with the expected transcript; refusals for download or checksum failures are in the unit suite (IMP-01) and the negative controls (IMP-04, 10/10 caught) | Proven |
| AC-003 | API-11 `API-11-update-1.0.1.json`, `API-11-update-1.0.2.json`, `API-11-test-after-failed-1.0.2.json`, `API-11-voice-input-extension.log`; API-04 U1/U2 | Update to 1.0.1 while On, one worker, Test ok; 1.0.2 failed with "Update to 1.0.2 failed: Could not download …v0.3.99/voice-input-runtime-manifest.json: HTTP 404", the version stays 1.0.1, the log says "the installed version stays" then "worker ready (mlx)", the Test after the failure transcribes in 332 ms | Proven |
| AC-004 | API-12 `API-12-docker-extensions.json` and `.png` (opened); `API-12-hello-page.json` | Docker linux-arm64 node: cards `hello-node`, `no-arm-build` ("There is no build for this computer, Linux (ARM). Offered for macOS (Apple silicon), Linux (x64)."), `broken-status`; no `voice-input` card; voice note shown. The voice asset's own "not available" on the desktop's own node needs a desktop platform without a voice build, so it is unit and component level (as the report states) | Proven |
| AC-005 | API-10 `API-10-log-lines.json`, API-12 `API-12-install-broken.json`, `API-12-docker-node.log` | Failed card with the message; the log shows "EXTENSION_FAILED: broken-status: the status probe of Broken Status failed on purpose" | Proven |
| AC-006 | Unit suite (IMP-01: NAS-42/43), `API-12-docker-node.log`; the report's API-10 notes | The real Docker node's log: "Node request refused NODE_CREDENTIAL_REQUIRED /rest/extensions/hello-node/ui/index.html" and "…/rest/extensions/voice-input/actions/transcribe", both `statusCode` 401. The embedded node's no-credential results (401 on the page, the action and `/graphql`) are in the report's API-10 notes; delivery found no file for them and relies on the route-table unit tests and the Docker log. The phone-credential refusal is unit level (NAS-43), as the report states | Proven |
| AC-007 | API-02 (7/7), API-03 (run 5: PT-E2E-001…017, B-001…006), API-04 (R4, R5), API-10, API-13 | Dictation inserts the transcript and does not send on the composer, Project and Task description, and Memory search surfaces; `API-13-docker-window-dictate.json` `inserted` holds the transcript | Proven |
| AC-008 | API-08/09 `API-08-09-packaged-start-logs.log`, `API-08-old-install-before.txt`, `API-08-start2-extensions.json` | Start 1: "Removed the old desktop Voice Input install /private/tmp/516-api-iso-a/extensions; Voice Input is installed again from Settings → Extensions."; start 2: no "old desktop" line, card Not installed with Install; locked root: "Could not remove the old desktop Voice Input install … EACCES …", the start continues (health 200), the next start removes it | Proven |
| AC-009 | API-13 `API-13-docker-window-dictate.json`, `API-13-focus-reread.log`, `API-13-stale-button-press.json` | Dictation in the Docker window went to `http://127.0.0.1:56339/rest/extensions/voice-input/actions/transcribe` (the embedded node), not the Docker node; with Voice Input Off, a focus event moved `readGeneration` 9 → 10, `enabled` false, `micButtons` 1 → 0; a stale press answers 409 `EXTENSION_OFF`. Real OS focus delivery could not be driven in the isolated instance and was replaced by the packaged renderer's own listener plus two real triggers (named in the report) | Proven (the OS focus event itself not driven; see Residual Risks) |
| AC-010 | API-12 (JSON and screenshots), `API-12-hello-page.json`, `API-12-removed.json` | The Docker node window lists and acts on that node: Install Hello Node (its page answers from the container: hostname `5586d8d241bc`, `"platform":"linux-arm64"`, `dir` `/home/autobyteus/data/extensions/hello-node/data`); after Remove, Hello Node is Not installed and Broken Status is still listed | Proven |
| AC-011 | API-12 `API-12-hello-page-beside-broken.json`, `API-12-docker-after-restart.json` | Broken Status Failed with its reason; Hello Node still On and answering; after `docker restart` the same states and health 200; nothing deleted | Proven |
| AC-012 | `GLOSSARY.md`, `modules/extensions.md`; delivery's docs sync | Both exist and match the code (spot-checked: bounds, codes, routes, folder) | Proven (review and docs sync) |
| QR-001 / QR-002 | IMP-04 (negative controls), API-14 `API-14-qr002-warm-transcription.log` | 10 of 10 guards caught; warm median before 202 ms, after 218 ms, +16 ms (limit +500 ms) | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: not applicable
- Re-verification after later re-integration: `Not needed` (the target did not advance)
- Judgement on gaps the report names: the release-blocking empty catalog key is not an acceptance criterion and is the Solution Designer's and the founder's; no `DEC-*` accepted any unverified risk.

## Release Decision

- Decision: `No release`
- Decided by: `RELEASE.md` (no release is the default when the user does not ask for one) and the founder's standing rule that releases happen only on his word, relayed by the code reviewer's handoff ("Releases happen only on the founder's word"). No release was asked for. A release is available only after the blocker below is cleared.
- Blocker for any release: `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts`) is empty until the founder creates the catalog key. Without it every node shows `unverified` and nothing installs, and the app's first start deletes the old Voice Input install. The second repository also needs `catalog-public-key.pem`, the secret `EXTENSIONS_CATALOG_SIGNING_KEY`, the first voice-input package release and then the catalog release (its README holds the order). The new "Extensions catalog check" in `RELEASE.md` makes this a pre-tag check.

## Docs Sync Result

- Docs sync artifact: `tickets/done/autobyteus-516-extensions/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/electron_packaging.md`, `autobyteus-web/docs/projects.md`, `DESIGN.md` (rule 13's example), `RELEASE.md` (two sections), `design-spec.md` (line 241)
- No-impact rationale (if applicable): not applicable

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/autobyteus-516-extensions` (in the repository after the merge; a copy under `/Users/normy/autobyteus_org/autobyteus-delivery-records/autobyteus-516-extensions-autobyteus-516-20261126/`)

## Version / Tag / Release Commit

None. No version bump, release commit or tag.

## Repository Finalization

- Bootstrap context source: the code reviewer's handoff message and the ticket's bootstrap (`origin/personal` @ `fdde5406fa`); the finalization target from `RELEASE.md` (remote `origin`, branch `personal`).
- Ticket branch: `codex/autobyteus-516-extensions`
- Ticket branch commit result: `Completed`: `3f2e359943` (docs sync, release notes, handoff summary, the reviewers' reports, ticket moved to `tickets/done/`), on top of the reviewed head `9002db14e6`.
- Ticket branch push result: `Completed`: `9002db14e6..3f2e359943` to `origin/codex/autobyteus-516-extensions`. Secret Gate on `origin/personal..HEAD` (13 commits): `PASS (no secrets found)`.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No` (`origin/personal` was `fdde5406fa` at each fetch: before the ticket push, before the merge and before the target push)
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `finalize/autobyteus-516-extensions` created from `origin/personal` @ `fdde5406fa`.
- Merge into target result: `Completed`: `git merge --no-ff` gave `1d2e9a7e75`; `git diff HEAD codex/autobyteus-516-extensions --quiet` shows the merged tree equals the ticket branch's tree.
- Push target branch result: `Completed`: `fdde5406fa..1d2e9a7e75` to `origin/personal`, after a second Secret Gate on `origin/personal..HEAD` (14 commits): `PASS`. A separate record commit follows this report (its hash is in the terminal message).
- User's checkout of the target branch (path): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`: `Updated to 1d2e9a7e75` with `git fetch origin personal` then `git merge --ff-only origin/personal` (it was on `personal` @ `fdde5406fa`, no local commits). It showed 46 uncommitted lines before and after, so nothing of the user's was touched. It is updated once more to the record commit; the terminal message names the final commit.
- Repository finalization status: `Completed`
- Blocker (if applicable): None
- Second repository: `/Users/normy/autobyteus_org/autobyteus-extensions` (`main` @ `4d00904`, clean, local only). Not pushed or published: `AutoByteus/autobyteus-extensions` does not exist on GitHub yet, and the founder creates it and releases from it.

## Release / Publication / Deployment

- Applicable: `No`
- Method: not applicable (`No release`, above)
- Method reference / command: none
- Pipelines triggered and their results: none (no tag was pushed; the push to `personal` triggers no release workflow). The build-only Desktop Release run for this branch (API-15, run 45869596069, on `75eab7845a`) succeeded earlier and published nothing.

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: not applicable
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (the curated notes are archived in `release-notes.md` for the release that includes this change)
- Blocker (if applicable): None for finalization. The release blocker above stands for any later release.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions`
- Worktree cleanup result: recorded in the terminal message after the worktree is removed (the record commit is made from it)
- Worktree prune result: recorded in the terminal message
- Local ticket branch cleanup result: recorded in the terminal message (`codex/autobyteus-516-extensions` and `finalize/autobyteus-516-extensions`)
- Remote branch cleanup result: `Not required` (`origin/codex/autobyteus-516-extensions` stays, as with earlier tickets; the guide does not ask for its deletion)
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/autobyteus-516-extensions/release-notes.md` (moved with the ticket)
- Archived release notes artifact used for release/publication: `tickets/done/autobyteus-516-extensions/release-notes.md` (not used: no release)
- Release notes status: `Updated`. It has a `## What you need to do` section (install Voice Input again after the update; language and microphone are chosen again). The old Voice Input shipped in stable releases since `v1.2.25`, the newest stable being `v1.5.14`, so users of those releases are affected.

## Deployment Steps

Not applicable. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Discard or Rebuild` (DEC-016): the old desktop Voice Input install (`<base data folder>/extensions`) is deleted once at the first start after the update; `<server data>/extensions` is new data (`Not Affected`).
- Delivery action required: `None` (the sealed client-data step does it at start; no migration)
- Result and evidence: API-08 (deleted once, the second start does nothing, Install works) and API-09 (a locked file is logged, the start continues, the next start removes it), `API-08-09-packaged-start-logs.log`.
- Migration completion, validation, recovery, and rollout evidence, only when `Migration Required`: not applicable

## Verification Checks

- Delivery opened the evidence files named in the table above (JSON, logs and two screenshots) and the reports' summary lines: API-01 "Tests 575 passed", no `×`; API-05 "[typecheck] PASS", build `exit 0`; API-06 "[electron-launch-profile-probe] passed"; API-15 "status completed conclusion success" for all five desktop builds.
- `pnpm -C autobyteus-web audit:localization-literals`: "Passed with zero unresolved findings."
- `python3 scripts/check_repository_artifact_hygiene.py`: passed (before and after the ticket move; the longest ticket path is 123 characters, no forbidden characters).
- `scripts/check_secrets.sh origin/personal..HEAD`: PASS on the ticket branch (13 commits) and on the merged state (14).
- Release-only checks (`check_licensing.py`, the release smoke check, `check_secrets.sh <previous-release-tag>..HEAD`) were not run: no tag.

## Rollback Criteria

- Revert merge `1d2e9a7e75` on `personal` (nothing is released). After a release that included it, rolling back is not clean: the first start of the new app deletes the old desktop Voice Input install, so an older app shows Voice Input as not installed and the user installs it there again (the release notes say so). Fix forward with a newer release otherwise.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required: no release decision)
- Applicable safe cleanup complete or not required: `Yes` (see the terminal message for the worktree and branch results)
- Unresolved blocker: `None` for this delivery. Open for any release: the empty catalog key and the second repository's setup (with the Solution Designer and the founder).
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes` (sent after this report was committed)
- Terminal message/reference: the `Delivery Completed` message to `/solution_designer` after cleanup, naming the record copy `/Users/normy/autobyteus_org/autobyteus-delivery-records/autobyteus-516-extensions-autobyteus-516-20261126/`
