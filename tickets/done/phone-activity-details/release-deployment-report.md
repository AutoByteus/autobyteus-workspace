# Delivery / Release / Deployment Report — autobyteus-590 (phone-activity-details, absorbs autobyteus-586)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`. No release, publication or deployment: the user did not ask for one and `RELEASE.md` makes none the default (a release is available; `release-notes.md` is ready).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (it equals `origin/personal` `20b627960c`; the ticket branch never changed it). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery audited and reran only what the guide names after new base commits (both typechecks and one relevant check), plus the Secret Gate. The guide's "Build-only release run" section names this ticket's kind of change (a build step or gate, DESIGN.md rule 12); API/E2E ran it before the merge (RR-1) and delivery read it (below).
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the branch held the latest integrated base and the checks on it had run.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `0da6bfbfc1`
- Latest tracked remote base reference checked: `origin/personal` `20b627960c` (`git fetch origin personal`, 2026-11-22, at the start of delivery)
- Base advanced since bootstrap or previous refresh: `Yes` (18 commits; the non-ticket files are 4 `autobyteus-server-ts/src` Grok/ACP start-up files, 6 server test files and 2 server module docs, from autobyteus-551 (Grok start-up) and autobyteus-602 (a team interrupt test), with their ticket records)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the tree held only the reviewed commits)
- Integration method: `Merge` (`git merge origin/personal`), merge commit `e08e5c1939`; no conflict.
- Integration result: `Completed`
- Overlap with the ticket's files: none (`comm` of the two file lists is empty); the base touches no web file and no build input. The base's runtime start-up changes are exercised by the phone probe, which starts probe-owned nodes on the rebuilt server.
- Post-integration executable checks rerun: `Yes` (RELEASE.md: one relevant check on the merged state and both typechecks). Commands and results (`evidence/delivery/`):

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1000 in 313 files (baseline 1000 in 313 files)`, `PASS` |
| `DEL-01` web typecheck, with `autobyteus-web/dist-mobile-demo/` (13 MB) present | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS`. This is AC-007 on the merged tree: before this ticket the same state ran the compiler out of heap |
| `DEL-03` the ticket's web specs | `NUXT_TEST=true vitest run components/mobile components/progress components/conversation services/runHydration stores/__tests__/agentActivityStore.spec.ts stores/__tests__/retainedActivityTermination.spec.ts utils/__tests__/toolCardPresentation.spec.ts utils/__tests__/toolDisplaySummary.spec.ts utils/activity utils/compactionActivityPresentation scripts/__tests__/mobileBuildChecks.spec.ts` | `Test Files 58 passed`, `Tests 560 passed` (includes the demo coverage spec of autobyteus-584, since the ticket edits `demo/**`) |
| `DEL-02` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | both `build exit 0` |
| `DEL-02` the one relevant real-stack check | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-94,MSP-95,MSP-96,MSP-97 --output-dir <dir>` (phone bundle of the merged tree, probe-owned nodes, scripted Antigravity) | `"result": "Pass"`, four cases Pass, no `(duplicate)` entry, `unknownBrowserErrors` none, cleanup `serversLeft: 0, rootRemoved: true` |
| Build-input rule | `git diff --name-only 0da6bfbfc1 2e34a2e25a` against TESTING.md's Fresh-start build list | `autobyteus-web/nuxt.config.ts` matches: API/E2E ran the fresh-clone build (FS-1) and, because the change edits what the typecheck gate reads (DESIGN.md rule 12), the build-only Desktop Release run (RR-1), both below. No `package.json`, lockfile, workflow or Docker file changed and no workspace-package import was added; none of the base's 18 commits touches a build input |
| Hygiene, lockfile | `python3 scripts/check_repository_artifact_hygiene.py`; `pnpm install --frozen-lockfile --lockfile-only` | passed (103 366 tracked files); consistent |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | `PASS` (18 commits) before delivery's push. API/E2E ran it on the 16 commits it pushed for the build-only run and pushed with the explicit refspec, so no bare `git push` reached `personal` |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (new base commits were integrated). FS-1 and RR-1 were not rerun: the base's commits touch no build input, so the commit they ran on (`648a8e0299`) and the merged tree differ only by server runtime start-up code that neither check reads.
- Delivery edits started only after integrated state was current: `Yes` (the merge came first; the docs edits followed, and docs are not a build input)
- Handoff state current with latest tracked remote base: `Yes` at `20b627960c`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-002: Acceptance-Criteria Proof, 95.4 % final confidence, target met, no category below 90 %, every critical criterion `Proven` or accepted by `DEC-005`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001, the failure-origin review of round 1's failure), and the integrated-state rerun above.
- What was mocked or not tested: Antigravity is a scripted CLI replaying recorded step shapes (a real binary was not used); Codex's `TOOL_LOG` timing is not exercised; MSP-98 uses a real native run with `gpt-5.4-mini` from the test vault; the phone is headless Chrome at 390×844 with touch on the production bundle; signing and notarization need the release runners.
- Accepted unverified risk: **DEC-005 (a physical phone)**. The requirements doc's DEC-005, decided by the Solution Designer, uses the production phone bundle in `test:e2e:mobile-shell` as the phone evidence and accepts "a physical device's WebView rendering of ordinary HTML/CSS from the same bundle" as untested. That is the only thing not tested on the phone, so the decision covers it.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (summaries, no name twice; the conversation's cards show them) | `R2-WS-1-whole-mobile-shell/mobile-shell-probe.json` MSP-94, MSP-97; `CR-1-agy-argument-names.md`; `R2-U-1/summary.log`; merged-state `DEL-02` rerun | MSP-94: `delegate_task` → `→ /researcher`, `open_tab` → `about:blank`, `view_file` → `autobyteus_agent_tools/delegate_task.json`, a tool with nothing to summarize `summary: null`. MSP-97 (after the CRR-001 fix): `write_to_file` and `replace_file_content` → `workspace/marker.txt`, `grep_search` → `AFTER`, `find_by_name` → `*.txt`, `list_dir` → `kappa/workspace`, `run_command` → `printf NATIVE_ARGUMENTS_PREFIX_VERIFIED`; the same on the merged tree. Round 1 had failed exactly these rows (`"summary": null`), and `70f7040ee1` fixed them | Proven |
| AC-002 (status without color alone) | MSP-94, MSP-97 rows | every success `statusWord: ""` with `statusLabel: "Success"` (icon only); failed rows `statusWord: "Failed"`; the detail screen's status word `Failed` / `Success` | Proven |
| AC-003 (details with sections, live, Back at the same place) | MSP-94 `failedDetails`, `jsonDetails`, `scrollBefore` / `scrollAfter`; `R2-MSP-98-live-tool-logs/mobile-shell-probe.json` | sections `arguments`, `result`, `error` (the error `PROBE-FAILURE-9920: deliberate failure`), `overflowX: 0`; scroll `top: 70` before and after Back; zh-CN titles 参数 / 结果 / 错误; MSP-98 with a real model: `runningStatus` `Running` with 2 log lines, `endStatus` `Success` with the full output (`tick 1`…`LOGS-590-DONE`), details open throughout | Proven |
| AC-004 (compaction rows; failed call's full error) | MSP-95; MSP-94 `failedDetails` | MSP-95: the row `Memory compaction … completed`, the details rows `Turn … Provider antigravity Boundary …`, no overflow; the failed call's Error section | Proven |
| AC-005 (background task's full command and end summary) | MSP-96 | `label` the full `pnpm --filter … --coverage` command; the title's `clamped: true` (height 45) becomes `clamped: false` (height 113) on a tap (decision 2); the open details of a running call (`sleep 600 # HOLD_TURN`) read `Running`, then change in place to `Unknown` when the run is terminated (the interrupted-call word, FU-004) | Proven |
| AC-006 (desktop parity; one builder; no `contextText`) | `R2-U-1/summary.log`; round 1 `CR-2`; the files that read the builders | the whole web suite `Test Files 796 passed (796)`, `Tests 6046 passed (6046)` and the three guards `Passed`; `contextText` is in no web source file but a hydration spec asserting its absence (re-searched by delivery); `toolCardPresentation.ts` and `MobileRunActivityItem.vue` call `getToolDisplaySummary`, `ToolActivityItem.vue` and the phone call `toolActivityStatusPresentation` | Proven |
| AC-007 (typecheck with `dist-mobile-demo/` present; TESTING.md sentence gone) | `TC-1-typecheck-with-demo-build.log` (round 1); `DEL-01` web typecheck; `FS-1-fresh-start-build.log`; `RR-1-release-run.txt`; commit `37ed9cdf00` | baseline `86 in 36 files` with the 13 MB folder present, in round 1 and again on the merged tree; fresh clone at `648a8e0299`: `test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `build exit 0`, `verify prisma exit 0`, DMG and zip built; run 45029500186 (read from GitHub by delivery): `success`, head `648a8e0299`, `workflow_dispatch`, `Build macOS Intel x64`, `Build macOS ARM64`, `Build Linux ARM64`, `Build Windows x64`, `Build Linux x64` all `success`, signing and publish `skipped`; `37ed9cdf00` holds only `TESTING.md` | Proven |
| DEC-005 (physical phone) | requirements doc DEC-005 | not tested; the decision accepts the physical device's WebView rendering of the same bundle's HTML/CSS | Accepted Risk (DEC-005) |

- Open points weighed: (1) The whole phone probe's verdict (`R2-WS-1`) is `Fail` on MSP-44 and MSP-45 only (FU-006: they assert that a relative link in a Markdown preview does nothing, which autobyteus-576 changed; they fail the same way alone and the diff touches neither the renderer nor the previewer). Accepted as outside this ticket. (2) MSP-55 passes but logged one unknown browser error, `net::ERR_SOCKET_NOT_CONNECTED`, from its own deliberate link cut; recorded as FU-007 (a pre-existing allowlist gap, the file is untouched here). (3) Round 1's failure (F-1: Antigravity's own tool rows showed no file) is fixed and its case (MSP-97) now asserts every one of those rows. (4) The fresh-start build and the build-only release run ran on `648a8e0299`, before the merge; the merge adds no build input (above). (5) Confidence 95.4 % meets the target.
- More evidence requested (from whom, what, result): `None`
- User check needed: `No`
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default (the user did not ask for a release in the request or later). A release is available.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/agent_execution_architecture.md`; `TESTING.md` (by the ticket, verified)
- No-impact rationale (if applicable): `DESIGN.md`, `RELEASE.md`, `AGENTS.md`, `docs/design-cases.md`, the server docs: no change (docs-sync report).

## Ticket State Transition

- Ticket moved to `tickets/done/phone-activity-details`: `Yes`, in the commit that precedes the merge
- Archived ticket path: `tickets/done/phone-activity-details/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-activity-details`, branch `codex/phone-activity-details`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/phone-activity-details` (its configured upstream is `origin/personal`; delivery pushes only with explicit refspecs, never a bare `git push`, as API/E2E warned).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/phone-activity-details` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push.

## Release / Publication / Deployment

- Applicable: `No`
- Method: none
- Pipelines triggered and their results: none by delivery (no tag pushed). API/E2E's build-only Desktop Release run 45029500186 is verification evidence (success; it published nothing).
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (`release-notes.md` is ready for a later release; it has no `## What you need to do` section)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: no stored data, wire schema or migration changed (the node's `contextText` stays, FU-001); no app-data migration, so the release's `RELEASED` set is unaffected.

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the merge commit on `personal` (`git revert -m 1 <merge>`). Nothing persistent changes. A revert brings back the phone's repeated tool names and, for a developer with a demo build present, the web typecheck's heap exhaustion.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: see the Finalization Record
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: see the Finalization Record
- Unresolved blocker: `None`
- Successful terminal package eligible for return: after the Finalization Record
- Terminal package sent to the Solution Designer: see the Finalization Record
- Terminal message/reference: see the Finalization Record
