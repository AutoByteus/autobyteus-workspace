# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `stale-runtime-session-recovery` (autobyteus-599): a run whose runtime has lost its saved session continues in a fresh session from the work journal, on every external agent runtime and every composition. Repository finalization into `origin/personal`; no release, publication or deployment (nobody asked for one; RELEASE.md's default is no release). `task_size` Large, `architectural_risk` High, reviewed route (source review and test-code review ran; both passed).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as in the worktree after the base refresh; the Finalization Target and Secret Gate sections apply, "Desktop signing readiness" gates tagging only.
- Deviations from the guide and why: `None`. The finalization steps run in the ticket worktree, not in the main checkout. The ticket branch is pushed first, as earlier tickets did (the repository keeps pushed `codex/*` branches). Delivery reran more than the guide's minimum after the base refresh (one relevant check and both typechecks): it also ran the whole server unit suite and the AGY, switch and Grok E2E families, because the branch is Large / High and the base's 39 commits changed the shared AGY fixture and the Grok / ACP area beside the ticket's restore branch.
- Proposed guide fixes, and whether the user agreed: `None` for `RELEASE.md`. One proposal for `TESTING.md`, the API/E2E engineer's document: write how a Claude test gets its own home (`follow-ups.md` FU-003). It is not changed here.

## Handoff Summary

- Handoff summary artifact: `tickets/done/stale-runtime-session-recovery/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/stale-runtime-session-recovery/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written against the branch as API/E2E tested it (code `1df7771aac`, tests `03e5d4b4b1`, `f23f0dc834`, reports `b7906c8617`) and as the code reviewer passed it (`CRR-003`), plus delivery's merged-state reruns.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `0da6bfbfc1`
- Latest tracked remote base reference checked: `origin/personal` @ `d25b0c6983` (`git fetch origin personal`, 2026-11-22: at the start of delivery, again after the checks, and before each push)
- Base advanced since bootstrap or previous refresh: `Yes` (39 commits)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`18a0eebc85`: the code reviewer's uncommitted `CRR-003` records, `code-review-report.md`, `code-review-revision-record.md` and `api-e2e-test-review-report.md`, committed before integrating)
- Integration method: `Merge` (`612e426e09`). The only file both sides changed is `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (the ticket added `AGY_FAKE_LOST_CONVERSATIONS_FILE`; the base added `label` to `BACKGROUND_STEP`): separate hunks, a clean merge; the merged file parses (`node --check`) and carries both. The base's other changes are the Grok and ACP short-process timeouts and discovery (autobyteus-551), the phone Activity details in the web app (autobyteus-590), `TESTING.md`, and a TF-04 test fix (602); none touches this ticket's restore recognition, activation owners, Claude session or compositions.
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Passed`. On `612e426e09` (`evidence/DEL-02…DEL-08`, each log with its command and commit): server typecheck `production errors: 0; test-file errors: 1000 in 313 files (baseline 1000 in 313 files)`; web typecheck `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`; server build exit 0 with `Sanitized built-module/bootstrap smoke passed`; whole server unit suite `Test Files  1068 passed | 5 skipped (1073)`, `Tests  8915 passed | 9 skipped (8924)`; built-server lost-session E2E (scripted AGY, `RUN_AGY_FAILURE_E2E=1`) `Test Files  1 passed (1)`, `Tests  3 passed (3)` (LS-01, LS-02, LS-03); AGY and switch families (`agy-switch-back-built-server`, `agy-failure-transport`, `agy-linked-skills-transport`, `runtime-switch-members-built-server`, `runtime-switch-members-extended-built-server`, `runtime-switch-native-built-server`) `Test Files  6 passed (6)`, `Tests  56 passed | 1 skipped (57)` (the one skip is `agy-failure-transport`'s own, as in API/E2E's and the implementation's runs); Grok runtime and compaction replays `Test Files  2 passed (2)`, `Tests  14 passed (14)`. The host was quiet (load 8 to 20, swap about 1 GB of 2 GB at the start) and nothing failed.
- No-rerun rationale (only if no new base commits were integrated): not applicable. Not rerun, with reasons: the live Claude and Codex cases (LC-01…LC-03: real CLIs and paid tokens; nothing the base changed reaches the Claude session, the Codex client or the activation owners, and API/E2E ran them on a quiet host on the tested code); the gated real-Claude resume-shape integration test and the server integration suite (the same reason; the base touched no integration test of these areas).
- Delivery edits started only after integrated state was current: `Yes` (the docs edits and the documents came after `612e426e09`)
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` @ `d25b0c6983` is an ancestor of the branch; re-checked before each push, see Repository Finalization)
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, scorecard: final 95.5%, six applicable categories, none below 90%), `api-e2e-test-review-report.md` (`CRR-003` `Pass`, no findings), `code-review-report.md` (`CRR-001` `Fail`, `CRR-002` `Pass`), the evidence files named below (opened), `implementation-handoff.md` Checks Run (IMP-01…IMP-14), delivery's merged-state reruns (`DEL-02…DEL-08`), and delivery's reading of the changed source (`claude-session-resume-check.ts`, `claude-agent-run-backend-factory.ts`, `claude-session-process.ts`, `codex-missing-thread.ts`, the ACP launcher and the Grok and DeepSeek profiles' matchers, `runtime-switch.ts` `buildSessionRenewal`, `errors.ts`, `standalone-agent-run-lifecycle-service.ts` `renewLostSession` / `activateInFreshSession`, `application-execution-scope-kernel-builder.ts`, the live test's assertions).

| Acceptance-Criteria ID | Cases And Files Checked | What I Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (a stopped Claude run whose saved session is missing: a new session ID, the REQ-004 line, the agent answers, the first input begins with the hand-over notice) | API-02 `LC-01-claude.json`, `API-02-04-live-claude.log`; IMP-06 (real CLI shape); IMP-04/IMP-13/`DEL-06` (LS-01 on the built server); the Claude resume check source | `✓ LC-01`; `lost` `31026634-…` ≠ `fresh` `98d3faf4-…`, model unchanged; marker content `The saved Claude Agent SDK session of this run was no longer available, so a new session continues from the work journal.`, correlation `session_renewal:<run>:<lost ID>`, sender `system.runtime_handover`; `firstInputStart` begins `[System: runtime hand-over]`; `answerRecallsCodeword: true` (era 1's codeword, held only by the journal). The matcher is the exact SDK text for the requested ID (`isMissingClaudeSession`); IMP-06 `Tests  2 passed (2)`, its control `1 failed \| 1 passed`; LS-01 `✓` on the merged state | Proven |
| AC-002 (the same for Codex, Antigravity, Grok, DeepSeek) | API-05 `LC-03-codex.json`; IMP-04/`DEL-06` (AGY LS-01, LS-02); IMP-03 NC-01…NC-05; IMP-07 (Grok N-1 probe); the matchers' source | Codex live `✓ LC-03`: new thread, marker `The saved Codex App Server session of this run was no longer available…`, the last `turn/start` carries the notice. AGY on the built server `Tests  3 passed (3)`; its control (built without the recognition): LS-01/LS-02 fail with `AGY_CONVERSATION_ID_CONFLICT`. Grok and DeepSeek recognition on their probed shapes in unit tests, each control failing (NC-02, NC-03, NC-04); the Grok probe: a present session whose folder was removed resumes, only a missing session gives `FS_NOT_FOUND` | Proven (Grok and DeepSeek at unit level on probed shapes, no live run: handoff summary R-1) |
| AC-003 (another failure fails as today: no fresh session, no marker, metadata unchanged) | API-03 inside `LC-01-claude.json`; LS-03 (`DEL-06`); IMP-03 NC-13; the matchers' source | Live: `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`, then the test asserts no second marker, no second segment, the renewed session kept and the earlier records byte-unchanged; LS-03 (a different conversation without the warning) `✓`, the message fails and nothing changes; NC-13 (any typed error renews) fails 3 tests. The recognizers compare the exact text or code for the saved session and nothing else | Proven |
| AC-004 (safe to repeat: one marker and one segment; failure before the marker changes nothing) | `standalone-session-renewal.test.ts` (failure after the marker before the commit; failure before the marker), `member-session-renewal.test.ts` (a commit that does not land; a fresh session that fails to start), `runtime-switch-session-renewal.test.ts` (the real switch memory: a retry writes neither twice); `DEL-05` | Those tests exist and pass in the merged unit run (`Tests  8915 passed`); the key holds the lost session's ID (`session_renewal:<runId>:<lost ID>`), so a retry finds its marker and segment | Proven |
| AC-005 (Team member, Org member, delegated copy recover; other members unchanged; the tree holds the new session; a later re-activation restores it) | LS-02 (`DEL-06`, IMP-04); `member-session-renewal.test.ts` (real Team and Org roots, three placements; the compare-and-set); `standalone-session-renewal.test.ts` (the delegated copy with its member context) | LS-02 `✓` on the built server: a Team member is renewed through the Team root and a later activation resumes the renewed session; the unit file's tests `continues in a fresh session behind the lost-session marker, committed as a compare-and-set of the lost ID`, `a later re-activation restores the renewed session: no second marker, no second fresh session`, `the root's compare-and-set refuses a renewal whose lost ID is no longer the stored one` pass | Proven |
| AC-006 (later messages go to the new session with no second notice; a reopened chat shows the earlier conversation, the line, then the new conversation) | `LC-01-claude.json` and the live test; LS-01 (restart restore) | The reopened chat's stream contains the line after the earlier conversation (the codeword comes before the marker); a later message resumes the renewed session with no second notice (`resumedProcesses` none carries the notice start); LS-01 restores the renewed session after a server restart | Proven |
| AC-007 (a real Claude session made unavailable on an isolated root: the run recovers and answers) | API-02 `LC-01`; the test's isolation (own `HOME` and `CLAUDE_CONFIG_DIR`, api-key mode with the test vault, a recorder that must answer `--version` before the server starts) | As AC-001: the session file the run itself created, in the test's own config folder (`sessionFiles` has length 1 before removal), removed; the run continued and answered. The test-code review checked the isolation; nothing was written to the founder's `~/.claude` (API/E2E checked: the only newer file there was its own conversation's transcript) | Proven |
| AC-008 (a renewal on each composition: the fresh session's first input begins with the notice; none renews without it; none keeps the dead end) | IMP-12 (kernel builder, host start, general supervisor; negative controls NC-R2-01…03, 02c), IMP-13 / `DEL-06` (studio standalone and Team member with the notice, control `the first input begins with the hand-over notice (AC-008): expected false to be true`), `application-scope-session-renewal.test.ts`, `host-session-renewal-wiring.test.ts`, `standalone-application-host-lifecycle.test.ts`; LC-01 (studio, live) | One test per composition on its real wiring; each control removes a piece (the input preface, the switch memory, both lifecycle observers) and fails; studio standalone and member E2E pass on the merged state with the notice asserted | Proven (the application host without a built-host E2E: handoff summary R-2) |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`: the live paths ran on test-owned runtime homes with the test vault, and the one thing only the founder can decide, whether to keep Claude's sessions longer (FU-001), is a policy decision, not a check of this change
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed`: `origin/personal` did not advance before the push (see Repository Finalization)

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md's default (the user did not ask for a release). A release is available: `release-notes.md` holds the notes.

## Docs Sync Result

- Docs sync artifact: `tickets/done/stale-runtime-session-recovery/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/agent_execution.md`, `codex_integration.md`, `grok_build_runtime.md`, `deepseek_harness_runtime.md`, `antigravity_cli_runtime.md`. The implementation had updated `GLOSSARY.md`, `agent_execution.md` and `run_history.md`; the Solution Designer added `docs/design-cases.md` Cases 26 and 27
- No-impact rationale (if applicable): `DESIGN.md`, `TESTING.md` and `RELEASE.md` are `No change` by delivery (reasons in the docs sync report); `TESTING.md` has a gap proposed as FU-003

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`, in the final ticket commit
- Archived ticket path: `tickets/done/stale-runtime-session-recovery`

## Version / Tag / Release Commit

None: no release, no version bump, no tag.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin`, `personal`; ticket branch `codex/<ticket-name>`; merge `--no-ff` from a `finalize/` branch in the ticket worktree) and the ticket's bootstrap (base `origin/personal` @ `0da6bfbfc1`).
- Ticket branch: `codex/stale-runtime-session-recovery-599`
- Ticket branch commit result: `PENDING-TICKET-COMMIT`
- Ticket branch push result: `PENDING-TICKET-PUSH`
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `PENDING-ADVANCED`
- Delivery-owned edits protected before re-integration: `Not needed` (the reviewer's records were committed as the checkpoint before the one integration; no re-integration followed)
- Re-integration before final merge result: `PENDING-REINTEGRATION`
- Target branch update result: `PENDING-TARGET-UPDATE`
- Merge into target result: `PENDING-MERGE`
- Push target branch result: `PENDING-PUSH`
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `PENDING-CHECKOUT`
- Repository finalization status: `PENDING-STATUS`
- Blocker (if applicable): None

## Release / Publication / Deployment

- Applicable: `No`
- Method: N/A
- Method reference / command: N/A
- Pipelines triggered and their results: none (no tag pushed). The Secret Gate, licensing and hygiene checks recorded under Repository Finalization are the pre-merge checks RELEASE.md asks for.

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (written for the next release)
- Blocker (if applicable): None

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599`
- Worktree cleanup result, worktree prune result, local branch cleanup result: run after this record's push and the second update of the user's checkout (`git worktree remove` from the main checkout once the worktree's untracked and ignored files are confirmed to be build output and test data only and everything committed is pushed; `git worktree prune`; delete the local `codex/stale-runtime-session-recovery-599` and the temporary `finalize/stale-runtime-session-recovery-599`, both merged into `origin/personal`). The results are in the terminal message.
- Remote branch cleanup result: `Not required` (the repository keeps pushed `codex/*` branches)
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used by delivery. (Earlier in the ticket the source review's `CRR-001` `Fail` went to the Solution Designer as `Design Impact` and was answered by SR-003, DEC-007 and `ARCH-REV-003`; that is resolved.)

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/stale-runtime-session-recovery/release-notes.md` (archived with the ticket)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`. No `## What you need to do` section: nothing is needed from users. The notes say that a Claude restore now opens its process at activation and that a restore failing for another reason shows its failure then.

## Deployment Steps

None. This repository deploys no hosted service (RELEASE.md, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`. A renewal writes existing shapes only (a `runtime_switch` segment, the `system.runtime_handover` marker, the new session ID in metadata or the tree) and only when a message is sent to a run whose session was lost; no migration, no new field
- Delivery action required: `None`
- Result and evidence: the design spec's persisted-data decision; `API-REV-001` (LC-01 reads the shapes back through the reopened chat and the next restore)

## Verification Checks

Listed in Verification and Initial Delivery Integration Refresh above.

## Rollback Criteria

Revert the merge commit on `personal` (RELEASE.md, Rollback). The change converts no data, so a revert needs no data step; a run that was renewed keeps its new session ID and its closed segment (stored in the shape of a runtime-switch segment). Revert if a run that has its saved session starts a fresh session, if a restore fails that the old code completed (the Claude restore now opens its process at activation), or if a renewed run's first input lacks the hand-over notice; fix forward otherwise.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: `PENDING-FINAL-FINALIZATION`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `PENDING-FINAL-CLEANUP`
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `PENDING-ELIGIBLE`
- Terminal package sent to the Solution Designer: `PENDING-SENT`
- Terminal message/reference: `PENDING-MESSAGE`
