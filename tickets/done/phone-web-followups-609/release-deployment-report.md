# Delivery / Release / Deployment Report — autobyteus-609 (phone-web-followups-609, absorbs autobyteus-575)

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`. No release, publication or deployment: the user did not ask for one and `RELEASE.md` makes none the default (a release is available; `release-notes.md` is ready).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (it equals `origin/personal` `1956c232c8` plus the ticket's item-B edit, which names the contract packages' tracked `dist/` as the exception to "never commit `*/dist/`" and `pnpm check:contract-dist`). Not created by this delivery.
- Deviations from the guide and why: `None`. Delivery audited and reran what the guide names after new base commits (both typechecks and a relevant check), and, because the merge showed two defects, more: the whole web suite, the two projection E2E files and the phone cases of both sides (below). The guide's "Build-only release run" section names this ticket's kind of change (a build step: `prepare-server.mjs`); API/E2E ran it (IMP-15) and delivery read it.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the branch held the latest integrated base and the checks on it had run.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `f2c0d2a902`
- Latest tracked remote base reference checked: `origin/personal` `1956c232c8` (`git fetch origin personal`, 2026-11-23, at the start of delivery)
- Base advanced since bootstrap or previous refresh: `Yes` (93 commits; 308 non-ticket files, mostly `autobyteus-server-ts` src (128) and tests (133), `autobyteus-web` components (11), services (6), docs and probes)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`cf14487554`): the architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` were untracked in the worktree (the Code Reviewer's housekeeping note); committed before the merge so the archive holds them
- Integration method: `Merge` (`git merge origin/personal`), merge commit `fecee4ad82`
- Integration result: `Completed`, with one conflict and three integration problems found by delivery (all fixed, below)
- **Conflict:** `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, the import lines. The base (autobyteus-585) removed the per-message usage text from the template (it lives in the new `EventMonitorLatestRow.vue`) and no longer imports `getRecentEventMonitorMessageUsageText`; this ticket changed the file-link type to `ConversationFileLink`. Resolution: the base's usage import and this ticket's type import; the auto-merged template already had no use of the removed function.
- **Problem 1, a type break found by the web typecheck (`DEL-01`):** `EventMonitorLatestRow.vue`, a file the base added, typed its `file-path-action` emit as `AbsoluteFilePathAction` and forwarded the `ConversationFileLink` union that `AIMessage` and `SystemTaskNotificationSegment` now emit: 4 production errors. It only passes the event on, and the consumers (`AgentConversationFeed`, `AgentEventMonitor`) already take the union, so its type is now `ConversationFileLink` (commit `c0f4469672`). No overlap was visible to git: the file is new on the base.
- **Problem 2, a case-ID collision (`DEL-05`):** the base's autobyteus-585 took `MSP-99` (`mobile-restored-run-cases.mjs`, a platform notice as its own row); this ticket's `MSP-99` (`mobile-background-tasks-cases.mjs`, AC-I) collided. The probe's own static check refused to start (`mobile-shell probe: duplicate case IDs MSP-99`). Delivery renumbered this ticket's case to `MSP-104` (the comment, the `runCase` and the screenshot name; `MSP-104` is free in the base and the branch; commit `7b58c4c684`, with Problem 3's test edits). API/E2E's reports and evidence keep the old ID (their `MSP-99` is now `MSP-104`; the base's `MSP-99` is the notice case).
- **Problem 3, a stale assertion after autobyteus-579 (`DEL-05`):** autobyteus-579 (merged in the base, "the file viewer's refusals") fixed what this ticket recorded as FU-005: a missing workspace file no longer shows the node's raw JSON. MSP-100's AC-H2 step ("a missing file opens the viewer's existing error state") asserted `File not found` in both viewers; on the merged build the desktop viewer reads `Error!File not found: <path>` and the phone's reads `Couldn’t open this file. Retry`. The assertion now accepts that state (desktop `File not found`, phone `Couldn’t open this file`), and the console line the case provokes on purpose (`Failed to fetch file content ApolloError: File not found`, logged by the web before it shows the error state) is registered as expected in the heading-links collector, as other cases register theirs. FU-005 is marked resolved by autobyteus-579 in `follow-ups.md`.
- Post-integration executable checks rerun: `Yes`. Commands and results (`evidence/delivery/`):

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01` web typecheck, first run | `pnpm -C autobyteus-web typecheck` | `FAIL`: 4 production errors, `EventMonitorLatestRow.vue(11,53)` and `(24,49)`: `Argument of type 'ConversationFileLink' is not assignable to parameter of type 'AbsoluteFilePathAction'` (Problem 1) |
| `DEL-01` web typecheck, after the fix | same | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02` contract `dist/` (item B, on the merged tree) | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.`; `git status` unchanged afterwards |
| `DEL-03` server unit | `vitest run` the ticket's five existing unit files (`workspaces`, `tool-result-interruption`, `stopped-tool-call-read-back`, `event-monitor-active-trace-page-projection`, `agy-failure-cli-routing`; the removed Codex tests are gone with their sources) | `Test Files 5 passed`, `Tests 52 passed` |
| `DEL-03` server integration (AC-J) | `pnpm -C autobyteus-server-ts test:integration:prepare`; `vitest run tests/integration/api/rest/workspace-content-after-restart.integration.test.ts` | `Test Files 1 passed`, `Tests 1 passed` |
| `DEL-03` server E2E (items A, D2, E on a built server) | `vitest run tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | `Test Files 2 passed`, `Tests 15 passed` |
| `DEL-04` whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt` | `Test Files 800 passed (800)`, `Tests 6104 passed \| 2 skipped (6106)` (run on the tree with all three fixes) |
| `DEL-04` guards | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | all `Passed` |
| `DEL-05` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` (twice: after the merge and after the fixes) | `build exit 0` each |
| `DEL-05` phone and desktop cases, first run | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-44,MSP-45,MSP-55,MSP-59,MSP-91,MSP-96,MSP-99,MSP-100,MSP-101,MSP-102,MSP-103` | refused to start: `duplicate case IDs MSP-99 (mobile-restored-run-cases.mjs, mobile-background-tasks-cases.mjs)` (Problem 2) |
| `DEL-05` phone and desktop cases, after the fixes | `… --cases=MSP-44,MSP-45,MSP-55,MSP-59,MSP-75,MSP-76,MSP-77,MSP-91,MSP-96,MSP-99,MSP-100,MSP-101,MSP-102,MSP-103,MSP-104` (this ticket's cases and the base's `MSP-75…77`, `MSP-99`, together) | `"result": "Pass"`, all 15 Pass, no `(duplicate)` entry, `unknown browser errors: none`, cleanup `serversLeft: 0, rootRemoved: true`. An earlier run of the same set failed only MSP-100 (Problem 3); the other 14 were already Pass |
| Build-input rule | `git diff --name-only f2c0d2a902 d5b1cac327` against TESTING.md's Fresh-start build list | matches: `autobyteus-web/scripts/prepare-server.mjs`, `autobyteus-web/generated/graphql.ts`, the contract packages' `src/` and `dist/`, `autobyteus-server-ts/typecheck-baseline.json`, root `package.json`. API/E2E ran the fresh-clone build (FS-1, on the final code) and, for the build step (DESIGN.md rule 12), the build-only Desktop Release run (IMP-15); the base's own build-input change is one `package.json` script line, `test:e2e:notice-row-presentation` |
| Hygiene, lockfile | `python3 scripts/check_repository_artifact_hygiene.py`; `pnpm install --frozen-lockfile --lockfile-only` | passed (104 137 tracked files); consistent |
| Secret Gate | `scripts/check_secrets.sh origin/personal..HEAD` | recorded in the Finalization Record |

- Post-integration verification result: `Passed`
- No-rerun rationale: not applicable (new base commits were integrated). FS-1 and IMP-15 were read, not rerun: they ran on the ticket's final code, and the merge adds no build input of its own that they would read.
- Delivery edits started only after integrated state was current: `Yes` (the merge came first; the integration fixes and docs followed)
- Handoff state current with latest tracked remote base: `Yes` at `1956c232c8`; checked again before the final merge (Repository Finalization).
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-002: Acceptance-Criteria Proof, 95.6 % final confidence, target met, no category below 90 %, every critical criterion `Proven`), the evidence files its Cases table names (opened below), `code-review-report.md` (CRR-001…CRR-003) and `api-e2e-test-review-report.md` (CRR-004), and the integrated-state rerun above.
- What was mocked or not tested: Antigravity is a scripted CLI replaying recorded step shapes (`AGENT_TOOL_STEPS`, `HOLD_TURN`); native and Codex stopped calls are proven at the writer level (IMP-11's unit test), not by a live probe; the phone is headless Chrome at 390×844 with touch on the production bundle; a Windows runner built the staging change only in the release run; signing and notarization need the runners.
- Accepted unverified risk (`DEC-*`): none. The requirements doc has no evidence decision accepting an untested criterion; a physical phone was not asked for.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-A (no `contextText`) | R1 CS-1, R2-SI-1, R2-SE-1; delivery's `DEL-03` | `rg contextText autobyteus-server-ts/src`: 0 files; integration `Test Files 91 passed \| 21 skipped (112)`, `Tests 518 passed`; whole server E2E 2 failed (the base's FU-007) of 288, `Tests 573 passed`; the two projection E2E files pass on the merged tree | Proven |
| AC-B (contract `dist/`) | `CD-1/branch.log`, `CD-1/base-f2c0d2a902.log`; `DEL-02` | base: `FAIL … (2 files):` `M autobyteus-team-stream-contracts/dist/team-stream-server-message.d.ts` (and `.map`); branch and merged tree: `PASS: the tracked dist/ of 3 contract packages matches their source.` and a clean `git status`; TESTING.md and RELEASE.md name it | Proven |
| AC-C (no staging folder) | IMP-03 (a forced failure), IMP-09/IMP-15 (release run), `FS-1-fresh-start-build.log` | FS-1 `stage left: none`, `build exit 0`, `verify prisma exit 0`, `[terminal-runtime] ok: node-pty spawn probe`, DMG built; run 45094535212 read from GitHub by delivery: `success`, head `e78a539dfe`, `Build Windows x64`, `Build Linux ARM64`, `Build Linux x64`, `Build macOS Intel x64`, `Build macOS ARM64` all `success`, signing and publish `skipped` | Proven |
| AC-D (a stopped call reads "Stopped", live and read back) | `R2-WS-whole-phone-probe/mobile-shell-probe.json` MSP-102, MSP-103; `DEL-05` rerun | MSP-102: `phoneRow {"status":"interrupted","word":"Stopped"}`, `phoneDetail "Stopped"`, desktop Activity chips `Success` then `Stopped`, `browseHeld.stopped: true` after 110 page events and a reload; MSP-103 (Team member): `phoneLive` and `phoneReadBack` both `interrupted`/`Stopped`, `deskCard.stopped: true`, `conflicts: []`, `deskErrors: []`; both pass again on the merged tree; round 1's failure (`Failed` after a re-read) is gone | Proven |
| AC-E (page card = live card summary) | MSP-102; R2-SE-1 `recent-run-projection-graphql`; `DEL-03` | the four page summaries equal the live ones (`→ /release_notes_writer`, `autobyteus-609`, `ls -la docs`, `docs/notes-609.md`); the page's `summaryArgs` is JSON; the E2E files pass on the merged tree | Proven |
| AC-F (MSP-44/45) | `R2-WS-whole-phone-probe` MSP-44, MSP-45; `DEL-05` | Pass in round 2 and on the merged tree | Proven |
| AC-G (MSP-55) | MSP-55; `DEL-05` | Pass; `unknown browser errors: none` | Proven |
| AC-H1 (run-relative links open the run's own file) | MSP-100, MSP-101; `DEL-05` | MSP-101: Team member `ownShown: true` for `MATE-609-BODY`, delegated `HOST-609-BODY` (the host's folder), `othersShown: []`, desktop and phone; MSP-100: `docs-609/a.md#x` and `media-609/clip-609.txt` `opened: true` on both; both pass on the merged tree | Proven |
| AC-H2 (outside, no folder, other node, missing) | MSP-100; unit specs; `DEL-05` | `../` → `The file preview could not be opened.`, `outsideShown: false`, nothing opened on the phone; missing file → the viewer's error state (desktop `File not found: <path>`, phone `Couldn’t open this file. Retry`, since autobyteus-579); unit specs for the no-folder and other-node outcomes (whole web suite) | Proven |
| AC-I (lost task end update still ends) | MSP-99 (now MSP-104), MSP-59; `DEL-05` | `listed` row `running`, then after the run is terminated `ended` `stopped` with `Stopped: the run ended` (74 ms in IMP-04; the base without D-I never); Pass on the merged tree as MSP-104 beside the base's MSP-99 | Proven |
| AC-J (reads right after a restart) | `MSP-89-91-restart-read/`, R2-WS MSP-91; `DEL-03` integration | `readsAfterRestart: [[5, 200]]`, `unknownFolderWithKey: 404`, `climbingWithKey: 400`, `workspaceNoKey: 401`; integration `workspace-content-after-restart` passes on the merged tree; MSP-91 passes on the merged build | Proven |

- Open points weighed: (1) The whole phone probe's verdict in round 2 was `Fail` on MSP-61 only (FU-006: it reads the model row after a fixed `sleep(500)`, red on the base and not touched by this diff); the delivery run did not select it. (2) The whole server E2E has two failures (FU-007), the same two on the base, with their cause recorded (the tests' `snapshot()` reads a Unix socket). (3) Round 1's F-1 (a stopped call read back as "Failed") is fixed by D-D2 and proven for the phone, the desktop, a Team member and the earlier-trace page. (4) MSP-100 asserts the viewer's *existing* error state, so it follows the base's autobyteus-579 change; that is a test-only adaptation, and the product behavior it proves (the missing file opens an error state, nothing outside the folder is read) did not change. (5) Confidence 95.6 % meets the target.
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
- Docs updated: `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docs/modules/{codex_integration,run_history,workspaces}.md`, `autobyteus-web/docs/{file_explorer,remote_access,agent_execution_architecture,chat,electron_packaging}.md`; `TESTING.md` and `RELEASE.md` (by the ticket, verified)
- No-impact rationale (if applicable): `DESIGN.md`, `AGENTS.md`, `GLOSSARY.md`, `docs/design-cases.md`: no change (docs-sync report).

## Ticket State Transition

- Ticket moved to `tickets/done/phone-web-followups-609`: `Yes`, in the commit that precedes the merge
- Archived ticket path: `tickets/done/phone-web-followups-609/`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`, branch `codex/phone-web-followups-609`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch: `codex/phone-web-followups-609` (no upstream is configured; delivery pushes with the explicit refspec).
- Finalization target remote / branch: `origin` / `personal`, `--no-ff` merge from a `finalize/phone-web-followups-609` branch (RELEASE.md).
- The outcome (commits, push, the user's checkout, cleanup) is in the "Finalization Record" at the end of this report, written after the push.

## Release / Publication / Deployment

- Applicable: `No`
- Method: none
- Pipelines triggered and their results: none by delivery (no tag pushed). The build-only Desktop Release run 45094535212 (IMP-15) is verification evidence (success; it published nothing).
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (`release-notes.md` is ready for a later release; it has no `## What you need to do` section)

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: no stored data or migration changed. A stopped call is read from what its writers already store (`isInterruptedToolResult`), so old and new runs read alike; the wire changes (`summaryArgs` as JSON, the conversation entry's `toolStatus`, the page card's `statusKey` value `interrupted`, the removed `contextText`) are clean cuts under `DESIGN.md` rule 9: the web and the node ship from one release. No app-data migration, so the release's `RELEASED` set is unaffected.

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Revert the merge commit on `personal` (`git revert -m 1 <merge>`). Nothing persistent changes. A revert brings back the "Failed" reading of a stopped call after a reread, the unlinked relative links, the 404 after a restart and the removed Codex files.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: see the Finalization Record
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: see the Finalization Record
- Unresolved blocker: `None`
- Successful terminal package eligible for return: after the Finalization Record
- Terminal package sent to the Solution Designer: see the Finalization Record
- Terminal message/reference: see the Finalization Record
