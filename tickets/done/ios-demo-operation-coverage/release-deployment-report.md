# Delivery / Release / Deployment Report — autobyteus-584 (ios-demo-operation-coverage)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`. No release, publication or deployment: this ticket is the prerequisite for `v1.5.14-beta.5`, which waits for the founder's word, and `RELEASE.md` makes no release the default.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (it equals `origin/personal` `726c5beaf9`; the ticket branch never changed it). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery audited and reran only what the guide names after a new base commit (both typechecks and one relevant check), plus the Secret Gate.
- Proposed guide fixes, and whether the user agreed: `None`. The failure this ticket answers is one an earlier stage can reproduce (a GraphQL document the demo does not cover), so the check went into `TESTING.md` and not into a release step, as RELEASE.md's Recovery and `project-documents.md` say.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the branch held the latest integrated base and the checks on it had run.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `90c4958a35`
- Latest tracked remote base reference checked: `origin/personal` `726c5beaf9` (`git fetch origin personal`, 2026-11-21, at the start of delivery)
- Base advanced since bootstrap or previous refresh: `Yes` (one commit, `726c5beaf9`: the `v1.5.14-beta.4` partial-release record; six files, all under `tickets/done/release-v1.5.14-beta.4/`)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the tree held only the reviewed commits)
- Integration method: `Merge` (`git merge origin/personal`), merge commit `44deff6562`; no conflict.
- Integration result: `Completed`
- Overlap with the ticket's files: none (the base commit touches no file outside `tickets/`). That commit records the failure this ticket fixes: run `44877725696`, step "Build the bundled demo", `build-mobile-web.mjs:82`, the four unlisted memory operations and the stale `ListAgentRunsWithMemory`, classified "ours". Delivery compared the failed step's log with the ticket's list change and found the same five names.
- Post-integration executable checks rerun: `Yes` (RELEASE.md: one relevant check on the merged state and both typechecks). The base commit changes no code, so this confirms the merge; commands and results (`evidence/delivery/`):

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` the one relevant check | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run scripts/__tests__/mobileBuildChecks.spec.ts` | `Test Files 1 passed`, `Tests 8 passed (8)` |
| `DEL-02` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`, `PASS` |
| `DEL-02` web typecheck, first run | `pnpm -C autobyteus-web typecheck` | `FAIL`: `the compiler ended by signal SIGABRT (FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory)`. Cause (Rule 9): the worktree held `autobyteus-web/dist-mobile-demo/` (13 MB, git-ignored build output from the demo builds API/E2E and implementation ran), which the Nuxt type project reads. This is FU-001 |
| `DEL-02` web typecheck, rerun | the same command after `mv autobyteus-web/dist-mobile-demo /tmp/…` (as the new TESTING.md row says) | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-03` the iOS build-only run, read from GitHub by delivery | `gh run view 44881140728 --json conclusion,headSha,jobs` | `success`, head `929976f818` (the code under test: `git diff --name-only 929976f818 HEAD -- . ':!tickets'` lists only `TESTING.md`), `Build And Test iOS App: success`, the two publish jobs `skipped`; `git ls-remote origin refs/tags/v1.5.14-beta.5` empty |
| Build-input rule | `git diff --name-only 90c4958a35 59bdc1e8ec` against TESTING.md's Fresh-start build list | `autobyteus-web/scripts/**` (three files) matches: API/E2E ran the fresh-clone build (`API-03`, below); no `package.json`, lockfile, tsconfig, workflow or Docker file changed and no workspace-package import was added |
| Hygiene, lockfile | `python3 scripts/check_repository_artifact_hygiene.py`; `pnpm install --frozen-lockfile --lockfile-only` | passed (102 236 tracked files); consistent |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | `PASS` (6 commits) before delivery's push. The commits through `929976f818` were pushed earlier by API/E2E for the build-only run, before the gate ran; the gate now covers the whole range and found nothing, so nothing exposed needs rotation |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (a base commit was integrated). The demo build and the fresh-start build were not rerun: the integrated base commit changes no code and nothing but `TESTING.md` changed in the code since the commit they ran on.
- Delivery edits started only after integrated state was current: `Yes` (the merge and the spec and typecheck runs came first; the one docs edit, `remote_access.md`, was made after they were complete)
- Handoff state current with latest tracked remote base: `Yes` at `726c5beaf9`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-001: Acceptance-Criteria Proof, 96.5 % final confidence, target met, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `evidence/implementation/` IMP-01…IMP-04, and the integrated-state rerun above.
- What was mocked or not tested: nothing is mocked; the build-only run uses the real workflow and runner. Not tested: the App Store Connect upload (skipped by design in a build-only run), signing and notarization, and the x64, Linux and Windows desktop targets (they need the release runners; RELEASE.md's accepted trade-off).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (the demo build passes, no unanswered / stale / unexplained) | `API-02-ios-build-only-run.log`; run `44881140728` read by delivery (`DEL-03`); `IMP-04-prepare-demo-web-build.log` | `The demo answers all 252 compiled operations (handled or listed as unreachable).` on the runner and locally; the run `success` at head `929976f818` | Proven |
| AC-002 (the local check fails on the base list naming the five, passes now, needs no build) | `API-01-spec-and-detection.log`; `IMP-01-source-coverage-before-list.log`; `DEL-01` | with the base list: `"stale": ["ListAgentRunsWithMemory"]`, `"unanswered"` the four memory operations, `1 failed \| 7 passed`; with the new list `Tests 8 passed (8)` in 2 s (reran on the merged tree); with a temporary `query ProbeOnlyOperation584`: `"unanswered": ["ProbeOnlyOperation584"]`, `1 failed \| 7 passed`, and `git status` clean after | Proven |
| AC-003 (the testing rule exists, owner API/E2E) | `TESTING.md` line 87, commit `9b7e1af380` | the row names the spec command, `prepare-demo-web.sh --build` as the authority and the `dist-mobile-demo/` warning; each fact checked in the code (docs-sync report). Committed on its own | Proven |
| AC-004 (the build-only iOS run passes) | run `44881140728`, `API-02`, `DEL-03` | `workflow_dispatch`, `release_ref` the ticket branch, `Build the bundled demo: success`, `Generate, build, and run implementation checks: success` (`** BUILD SUCCEEDED **`, `** TEST SUCCEEDED **`, `Executed 56 tests, with 0 failures`), `Validate iOS Publish Secrets` and `Archive And Upload To App Store Connect` skipped, no tag | Proven |
| Fresh-start build (TESTING.md; a build input changed) | `API-03-desktop-fresh-start-build.log` | fresh `git clone --no-local` at `929976f818`, `pnpm install --frozen-lockfile` exit 0, `[guard:web-boundary] Passed.`, `[typecheck] PASS` at baseline, `build:mobile-web` (the changed script) ran, `Build completed` with `AutoByteus_personal_macos-arm64-1.5.14-beta.4.dmg` and the zip, `engines ok`, `client ok`, `[terminal-runtime] ok` ×4, `verify exit 0` | Proven for macOS ARM64 |

- Open points weighed: (1) The build-only release run for a build step or gate (RELEASE.md, DESIGN.md rule 12): the gate this ticket changes runs in the iOS workflow, and that workflow's build-only run was executed and passed (AC-004). `pnpm release:test` (the Desktop Release) was not run: no desktop workflow, packaging file or desktop-only path changed, the changed script's demo branch is not reached by the desktop's `build:mobile-web` (the non-demo path is a pure signature change, covered by the fresh-start macOS build, `API-03`), and the script is platform-independent JavaScript, so a Windows or Linux difference is not expected; the accepted trade-off in RELEASE.md covers the rest. (2) FU-001 was met by delivery as well (above); it is outside this ticket's Change Scope (`nuxt.config.ts`) and is recorded urgent for the Solution Designer. (3) Confidence 96.5 % meets the target.
- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default, and the task: `v1.5.14-beta.5` waits for the founder's word. A release is available once the founder asks.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md`; `TESTING.md` (by API/E2E, verified)
- No-impact rationale (if applicable): `DESIGN.md`, `RELEASE.md`, `AGENTS.md`: no change (docs-sync report).

## Ticket State Transition

- Ticket moved to `tickets/done/ios-demo-operation-coverage`: `Yes`, in the commit that precedes the merge
- Archived ticket path: `tickets/done/ios-demo-operation-coverage/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage`, branch `codex/ios-demo-operation-coverage`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/ios-demo-operation-coverage` (its upstream is `origin/personal`; delivery pushes only with explicit refspecs, never a bare `git push`, as API/E2E warned).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/ios-demo-operation-coverage` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push. Merge `f3e47fc6da` on `origin/personal`.

## Release / Publication / Deployment

- Applicable: `No`
- Method: none
- Pipelines triggered and their results: none by delivery (no tag pushed). API/E2E's build-only iOS run `44881140728` is verification evidence (success).
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`. No `release-notes.md` was written: the change is internal (a build gate, a coverage list and a testing rule) and no user-visible behavior changes (the iOS demo's screens are untouched; RELEASE.md says release notes are user-facing and functional). The iOS TestFlight line that beta.4's notes dropped belongs to the next beta's notes (the release ticket's), as `handoff-summary.md` says.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: no stored data, wire schema or migration changed; no app-data migration, so the release's `RELEASED` set is unaffected.

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the merge commit on `personal` (`git revert -m 1 <merge>`). Nothing persistent changes. A revert would bring back the failing demo coverage, so the next iOS release would fail again at "Build the bundled demo".

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

- Ticket branch `codex/ios-demo-operation-coverage`: committed (tip `18ce6f6e7a`) and pushed to `origin` with the explicit refspec `HEAD:refs/heads/codex/ios-demo-operation-coverage` (`929976f818..18ce6f6e7a`, a fast-forward of the tip API/E2E had pushed for the build-only run). The branch's configured upstream is `origin/personal`, so no bare `git push` was used. Secret Gate on `origin/personal..codex/ios-demo-operation-coverage`: `PASS`, 7 commits.
- Target refreshed before the merge and again before the push: `git fetch origin personal` showed `726c5beaf9` both times, which the ticket branch already contained (merge `44deff6562`); no re-integration and no re-verification were needed.
- Merge: on `finalize/ios-demo-operation-coverage` (from `origin/personal` `726c5beaf9`), `git merge --no-ff codex/ios-demo-operation-coverage` = `f3e47fc6da` (parents `726c5beaf9` and `18ce6f6e7a`; the merged tree equals the ticket branch's tree). Secret Gate on the merged state: `PASS`, 8 commits. Hygiene check on the archived tree: passed (102 246 tracked files).
- Push: `git push origin HEAD:personal` `726c5beaf9..f3e47fc6da`; `origin/personal` = `f3e47fc6da` afterwards.
- Release: none (no tag, no version bump, no pipeline).
- This record: committed on `finalize/ios-demo-operation-coverage` and pushed to `origin/personal` as the commit that follows `f3e47fc6da`.
- The user's checkout (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`, on `personal`): `git fetch`, then `git merge --ff-only origin/personal` after this record's push, only if it is on `personal` with no local commits and git accepts it; nothing is stashed, reset or checked out there. The result (commit, or why not) is in the terminal message.
- Cleanup, after this record's push: `git worktree remove --force /Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage` (only git-ignored and untracked build output remains), `git worktree prune`, delete the local branches `finalize/ios-demo-operation-coverage` and `codex/ios-demo-operation-coverage`. Remote branch: `Not required` (the repository keeps pushed `codex/*` branches). The result is in the terminal message.
