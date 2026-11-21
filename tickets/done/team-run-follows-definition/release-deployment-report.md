# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Finalize `codex/team-run-follows-definition` (Project Task `autobyteus-22`, `task_size: Large`, `architectural_risk: High`, reviewed route) into `origin/personal`. No release: the user did not ask for one, and RELEASE.md makes "No release" the default.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `ecd6d4556c` (read from `origin/personal` after the fetch; since the bootstrap base it changed only by the iOS app icon check)
- Deviations from the guide and why:
  - The main checkout here is `/home/autobyteus/workspace/autobyteus-workspace` (the guide names a macOS path); the rule "do not finalize from the main checkout" was followed.
  - `gitleaks` and `pnpm` are not on the default `PATH` here; checks ran with `~/.local/bin/gitleaks` and a `corepack pnpm` wrapper.
  - Delivery reran every case of the validation, not one relevant check: TESTING.md's "Rerun by impact" step 4 marks everything Rerun when the test harness or fixtures change, and the base changed both (below).
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/team-run-follows-definition/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/team-run-follows-definition/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `a07767f4d0`
- Latest tracked remote base reference checked: `origin/personal` @ `ecd6d4556c` (fetched 2026-11-21)
- Base advanced since bootstrap: `Yes` (77 commits: autobyteus-15/-16 managed Ubuntu restart, -561 Antigravity journal reads, -583 runtime hand-over journal read, -594 iOS icon, iOS demo coverage, betas v1.5.14-beta.4..6)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Not needed` (the validated state was committed at `55a2674215`; only untracked `*/dist/` was present)
- Integration method: `Merge` (`git merge --no-edit origin/personal` → `e87b6b9ac9`). The implementation's note that `git merge` fails on two symlinks did not apply: neither showed as modified, and the merge completed.
- Integration result: `Completed`. No conflicts; `GLOSSARY.md` and `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, changed on both sides, merged cleanly.
- Rerun plan (TESTING.md "Rerun by impact"):
  - Validated commit `55a2674215` (source `6c7af4a384`). What changed: `git diff --name-only a07767f4d0 ecd6d4556c`, 85 non-ticket files.
  - The base's product changes (`agent-work-journal`, `runtime-handover-notices`, `restart-resume`, `agent-execution/services/busy-runs.ts`; web updater, notifications, settings; iOS) touch nothing the ticket's cases exercise; the ticket's code does not use them.
  - The base changed shared foundations: the E2E harness (`tests/e2e/helpers/studio-runtime-test-server.ts` hook timeout owner, `probe-timeout-evidence.ts`), `tests/helpers/os-latency-under-load.ts`, and the fixtures (`agy-failure-cli.mjs`, a new `journal_reads` case; a work-journal fixture). Step 4: everything Rerun.
  - Step 5: both typechecks, and the built server (`pnpm -C autobyteus-server-ts build`) the E2E cases use.
  - Not rerun, with reasons: TFU-01..06 (a ticket probe of the rendered app: no web file it drives and no server code it reads changed in the base; the web typecheck and the ticket's web specs were rerun); API-FS (the base changed no build input of the ticket's; its own build changes were validated by their tickets).
- Post-integration executable checks rerun: `Yes`, after `pnpm install --frozen-lockfile` (exit 0) and the server build (exit 0). All logs in `evidence/DEL-post-integration/`:

| Check | Command | Result |
| --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | production 0; test-file errors 1005 in 314 files (baseline 1005 in 314); PASS (`tc-server.log`) |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | production 0; test-file errors 86 in 36 files (baseline 86 in 36); PASS (`tc-web.log`) |
| API-R1: ticket server tests | `vitest run` on the ticket's 65 unit/integration/architecture test files | 530 passed (`server-units.log`) |
| Ticket web specs | `vitest run` on the ticket's 3 specs and `components/workspace` | 560 passed in 67 files (`web-specs.log`) |
| TF-01..TF-12 | `env -i … RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | 12 passed (`tf.log`, `TF-json/`) |
| API-PEER (RC-51) | `… tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | 51 passed (`peer.log`) |
| API-FIX | `… tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | 7 passed, 2 skipped, as validated (`fixture-regression.log`) |
| API-REG projects | collaboration-prompt-wording, delegated-team-lazy-member-activation, unclean-shutdown-delegated-team-restore | 24 passed, 1 skipped, as validated (`reg-projects.log`) |
| API-REG memory | `tests/e2e/memory` | 39 passed, 3 skipped, 1 failed: EC-04 "Timed out waiting for write failure logged", the known root-container failure (FU-005), the same as round 3 (`reg-memory.log`) |
| API-REG run-history | `tests/e2e/run-history` | 28 passed, 2 skipped, as validated (`reg-run-history.log`) |
| TFL-01/02 | `env -i … RUN_CODEX_E2E=1 RUN_AUTOBYTEUS_TEAM_FOLLOWS_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault … vitest run tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | 2 passed with real Codex and AutoByteus (`tfl.log`, `TFL-json/`) |

- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes` (the docs edit was made while the checks ran; it changes no file a check reads)
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases), final confidence 95.4% (every category ≥ 93%, target met), the files below opened by delivery, and the integrated-state reruns above. Mocked: the AGY CLI in the deterministic suites (real runtimes in TFL and TFU-04).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 | TF-01.json; TFL-01.json; TFU-01-b-after-change.png | Lead notice "Joined: reviewer at /reviewer. Your handoff rules changed; call get_handoff_rules …"; `get_handoff_rules` lists `/reviewer`; send `DELIVERED` and the reviewer answered; real Codex lead got the review code from the new AutoByteus member; screenshot: reviewer row present (offline), writer row gone | Proven |
| AC-002 | TF-02.json | `byAddress` and `byRunId`: `COLLABORATION_TARGET_NOT_FOUND`, "writer (/writer) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules …"; `projection.ok: true` with its history | Proven |
| AC-003 | TF-03.json; TFL-02.json; TFU-03-a-leaving-tag.png | `markerWhileLeaving` = the reviewer, `markerAfterRelease: []`, refused by run ID, projection and file changes open; real Codex writer's approvals answered while leaving; screenshot: reviewer row tagged "Leaving" | Proven |
| AC-004 | TF-08.json | After reopen: "Joined: editor at /editor."; members include `/editor` | Proven |
| AC-005 | TF-09.json; API-PEER 51/51 | `copiedFrom: "team_definition"`; the copy gained `/checker` | Proven |
| AC-006 | TF-01.json | One notice per remaining member (lead: rules changed; writer: rules unchanged); `secondLeadInput` has no repeat | Proven |
| AC-007 | TF-07.json, server-output.log | Four `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: …` lines (invalid JSON twice, unknown agent, not found); members unchanged; back to following when fixed | Proven |
| AC-008 | TF-06.json | Coordinator `/scout` in the run and the snapshot | Proven |
| AC-009 | TFU-01 screenshots | Member appears and the removed one goes without a reload | Proven |
| AC-010 | TF-02.json; TFL-02.json `leadAfterRefusal` | The real Codex lead received the exact refusal text naming get_handoff_rules | Proven |

- More evidence requested: `None`
- User check needed: `No`

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md's default; neither the request nor the handoff asked for a release. A beta or stable release is available on request; `release-notes.md` is ready.

## Docs Sync Result

- Docs sync artifact: `tickets/done/team-run-follows-definition/docs-sync-report.md`
- Docs sync result: `Updated` (`autobyteus-web/docs/agent_teams.md`; the implementation's server docs and glossary checked)

## Ticket State Transition

- Ticket moved to `tickets/done/team-run-follows-definition`: `Yes`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the code reviewer's handoff (branch `codex/team-run-follows-definition`, base `origin/personal`) and `RELEASE.md` Finalization Target
- Ticket branch: `codex/team-run-follows-definition`
- Secret Gate before the first push: `scripts/check_secrets.sh origin/personal..HEAD` PASS (38 commits). Artifact hygiene PASS (exit 0).
- Ticket branch commit result: `17d7af45c3` (docs sync, delivery records, evidence, ticket archived), on top of base merge `e87b6b9ac9`
- Ticket branch push result: pushed `origin/codex/team-run-follows-definition` (new branch)
- Finalization target: `origin`, `personal`
- Target advanced after verification: `No` (`ecd6d4556c` at every fetch)
- Delivery-owned edits protected before re-integration / re-integration: `Not needed`
- Target branch update result: `finalize/team-run-follows-definition` created from `origin/personal` @ `ecd6d4556c`
- Merge into target result: `--no-ff` merge `3f75e22589`; its tree equals the ticket branch's `17d7af45c3`. Secret Gate on the merged state: PASS
- Push target branch result: `ecd6d4556c..3f75e22589  HEAD -> personal`
- User's checkout of the target branch (`/home/autobyteus/workspace/autobyteus-workspace`): on `personal` at `a07767f4d0`, no local commits, 116 behind. It is fast-forwarded with `git fetch` and `git merge --ff-only origin/personal` after this record commit's push; the result is in the terminal message.
- Repository finalization status: `Completed`

## Release / Publication / Deployment

- Applicable: `No`; result `Not required`.

## Release Notes Summary

- `tickets/done/team-run-follows-definition/release-notes.md`, user-facing, ready for the next release; not used now.

## Deployment Steps

None. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (optional `formerMembers`; its absence means no former members)
- Delivery action required: `None`

## Verification Checks

- Secret Gate on the ticket branch (38 commits) and on the merged state: PASS
- `python3 scripts/check_repository_artifact_hygiene.py`: PASS (exit 0); the ticket's file names have no `:` or other Windows-hostile characters

## Rollback Criteria

- Revert the merge on `personal` and cut a new release; desktop updates never downgrade, so a defect is normally fixed forward. There is no migration: a changed Team run's stored tree gains two optional fields (`rootTeam.formerMembers`, `copiedFrom`), and its `members`, coordinator and handoffs are rewritten to the current definition through the normal writer. Whether an older build reads a tree with these fields was not checked by any stage (RELEASE.md: a release may add stored fields without keeping compatibility for older builds), so a rollback's effect on Team runs changed after the update is unverified.

## Residual Risks

1. API-NF: the configured-placement copy and the application Team run "not followed" are proven by unit tests only.
2. A follower step that throws after a commit skips the rest of that change (declared).
3. A definite release-write failure keeps the "Leaving" tag until the next plan (designed).
4. Root container: the release job's signing-record unit tests refuse uid 0 (27 tests not proven here); EC-04 cannot pass as root (FU-005).
5. FU-004 (urgent, outside this ticket): the Linux arm64 AppImage runtime needs `libz.so`.

## Post-Finalization Cleanup

- Dedicated ticket worktree: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`
- Plan, run after the record commit's push: `git worktree remove --force` (only untracked `*/dist/` build output remains), `git worktree prune`, delete the local branches `codex/team-run-follows-definition` and `finalize/team-run-follows-definition`, remove the temp files `/tmp/tf-del`, `/tmp/tf-bin`, `/tmp/tf-*.txt`. Remote branch: kept, as for earlier tickets. The result is in the terminal message.
- Test servers and runtimes: every suite stopped its own built servers and CLIs when it ended; none was left running.

## Final Status

- Verification complete: `Yes` (from the evidence, plus every case rerun on the merged state)
- Repository finalization complete: `Yes` (`3f75e22589` on `personal`; this record commit follows it)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: run after this record's push; result in the terminal message
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: by `send_message_to` after this record's push
