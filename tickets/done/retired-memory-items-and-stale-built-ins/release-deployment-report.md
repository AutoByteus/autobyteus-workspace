# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `retired-memory-items-and-stale-built-ins` (autobyteus-491): the retired compactor's memory item model removed from `autobyteus-ts`, and the retired built-in Skill Self-Evolver and Memory Compactor agents removed at startup by `20261118_remove_retired_built_in_agents`. Repository finalization into `origin/personal`; no release, publication or deployment (the founder has not said to release; RELEASE.md's default is no release). `task_size` Medium, `architectural_risk` High, reviewed route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` @ `75048cbaf4` (the worktree's copy after the base merge; the base advance did not change it).
- Deviations from the guide and why: `None`. The finalization steps ran in the ticket worktree, not in the main checkout. The ticket branch is pushed first, as earlier tickets did (the repository keeps pushed `codex/*` branches).
- Proposed guide fixes, and whether the user agreed: `None` for `RELEASE.md`. One proposal for `TESTING.md` (not delivery's document): name `LMSTUDIO_HOSTS` as the LM Studio gate in the Core library tests row (`follow-ups.md` FU-005). It is not changed here.

## Handoff Summary

- Handoff summary artifact: `tickets/done/retired-memory-items-and-stale-built-ins/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/retired-memory-items-and-stale-built-ins/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the integration refresh and the post-integration checks, against the merged state `45b410675c`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `2e9ac1e65b`
- Latest tracked remote base reference checked: `origin/personal` @ `75048cbaf4` (`git fetch origin personal` at the start of delivery, 2026-11-18, and again after the checks; both found `75048cbaf4`)
- Base advanced since bootstrap or previous refresh: `Yes` (67 commits: restored-run turn IDs (`autobyteus-ts` `turn-tracker.ts`, `memory-manager.ts`, `raw-trace-item.ts`), the Antigravity background-task view, the phone's text size, native follow-ups, the v1.5.13 release record; 45 server source files, web components and tests, contract-package sources, `TESTING.md`; no lockfile, dependency, `tsconfig`, script or workflow change; build-input changes only in two contract packages' sources and the web package's version string)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`7fcda317fa`: the code reviewer's three documents, `code-review-report.md`, `code-review-revision-record.md` and `api-e2e-test-review-report.md`, which were uncommitted in the worktree)
- Integration method: `Merge` (`git merge --no-ff origin/personal`, merge commit `45b410675c`; no conflict; four files changed on both sides and merged cleanly: `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/memory/models/raw-trace-item.ts`, `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-web/docs/settings.md`; each keeps both sides' edits)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. Plan by TESTING.md "Rerun by impact": validated commit `984e04707f` (tests) / `91ee1603a5` (product code); the base changed `autobyteus-ts` memory source (a shared foundation, rule 4) and the server's agent-memory writers, so every memory-related case is marked **Rerun**: both typechecks and the server build (rule 5); the whole `autobyteus-ts` suite (the branch and the base both edit `memory-manager.ts` and `raw-trace-item.ts`); the server's migration, agent-memory, built-in-agent and architecture unit files; the Memory page specs; the startup E2E files (`remove-retired-built-in-agents`, `remove-skill-improvement-data`, `task-agent-own-run`) and `agent-semantic-memory`; the live memory flows; and the AC-001 grep. **Not rerun** (each, and why): the whole-suite server integration and E2E runs (`API-09`, `API-10`) answer whether this ticket's change regresses anything, and their failures were already explained (host load, or failing on the base); a rerun on the merged state would test the 67 other commits, which their own tickets validated. The browser probe SIR-002 (`API-08`): the base changed no Agents-page component and no agent-catalog source; its only agent-definition changes are two E2E test files, one of them, `agent-semantic-memory`, rerun in `DEL-07`. The fresh-clone desktop build (`API-11`): the build input this branch changed, `typecheck-baseline.json`, was built fresh there and its count is unchanged by the merge (both typechecks pass at 1011 and 87 on the merged state). The base advance changed other build inputs, the sources of two contract packages (`autobyteus-agent-presentation-contracts`, `autobyteus-team-stream-contracts`) and the web package's version (`1.5.13-beta.10` → `1.5.13`), which the base's own v1.5.13 release built; the merged typechecks build the contract packages first and the server build passes (`DEL-01…DEL-03`). A fresh-clone build of the merged state was not repeated (RELEASE.md: delivery audits, it does not redo). The gated OpenAI live test (`API-12b`, a paid provider call): the changed read path it reaches is exercised on the merged state by the LM Studio memory flows (`DEL-10`) and the memory unit suite (`DEL-04`).

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | PASS: 0 production errors; 1011 test-file errors in 316 files = baseline | `evidence/DEL-01-server-typecheck.log` |
| Web typecheck | `pnpm -C autobyteus-web typecheck` (after the server typecheck, not alongside) | PASS: 0 production errors; 87 in 37 files = baseline | `evidence/DEL-02-web-typecheck.log` |
| Server build | `pnpm -C autobyteus-server-ts build` | exit 0 (`Sanitized built-module/bootstrap smoke passed without DATABASE_URL.`) | `evidence/DEL-03-server-build.log` |
| `autobyteus-ts` suite | `pnpm -C autobyteus-ts test` | 4 failed, 2495 passed, 107 skipped; the 4 are LM Studio live tests (cause below) | `evidence/DEL-04-autobyteus-ts-suite.log` |
| Server unit files | `pnpm exec vitest run tests/app-data-migrations tests/unit/app-data-migrations tests/unit/agent-memory tests/unit/built-in-agents tests/architecture tests/unit/server-runtime-app-data-migration-gate.test.ts` | 111 files; 913 passed | `evidence/DEL-05-server-units.log` |
| Memory page specs | `pnpm -C autobyteus-web test:nuxt run components/memory/__tests__` | 9 files; 41 passed | `evidence/DEL-06-memory-page-spec.log` |
| Startup and memory E2E | `env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run` the RRB, SID and TAU startup files and `agent-semantic-memory` | 4 files; 16 passed, 2 failed (RRB-3, TAU-3; causes below) | `evidence/DEL-07-startup-e2e.log` |
| The two failing files, alone | same command, the RRB and TAU files only | 2 files; 6 passed, including RRB-3 and TAU-3 | `evidence/DEL-09-rerun-e2e.log` |
| Live memory flows | `LMSTUDIO_TARGET_TEXT_MODEL=qwen/qwen3.6-35b-a3b pnpm exec vitest run tests/integration/agent/memory-llm-flow.test.ts tests/integration/agent/memory-tool-call-flow.test.ts --testTimeout=300000` against the model already loaded in LM Studio (nothing loaded or unloaded by this run) | 2 files; 2 passed (20.7 s and 26.9 s; real model round trips, no "request failed" warning) | `evidence/DEL-10-live-memory-flows.log` |
| AC-001 grep | API-01's command and pattern | 37 hits, the same files and counts as API-01 | `evidence/DEL-08-ac001-grep-merged.log` |

The first check run was interrupted by an application update (restart at 13:19 UTC) during the server typecheck, before it printed a result. Its partial log was discarded and the whole script was rerun from the top. The results above are that rerun's.

Failures on the merged-state run, each with its cause (TESTING.md Rule 9). None is caused by this change; none was closed on a rerun alone:

| Failed Test | Classification | Cause (and how it was found) | Action | Result |
| --- | --- | --- | --- | --- |
| `remove-retired-built-in-agents-startup` RRB-3 | Environment | `AgyDiscoveryError: Antigravity model discovery timed out` (`DEL-07` line 116). The Antigravity capability runs the scripted CLI twice, `--help` bounded at 3 s and `models` at 15 s, each also bounded by the caller's deadline (`src/runtime-management/antigravity-cli-capability.ts:7-8,108-111`); a bound that elapses gives this error. Which bound fired was not captured. Three built-server E2E files had started together at a host load of about 120. API/E2E recorded the same error in its own run 2 | Reran the file alone with the same gate | Passes: RRB-3 calls `list_available_agents` after the upgrade start and its answer names neither retired agent (`DEL-09`) |
| `task-agent-own-run-startup` TAU-3 | Test-helper race, in code this ticket did not change | `ENOENT … memory/episodic/index.md.3353af6b0373.tmp` from `snapshot` in `tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts:167` at test line 403, right after the second start. The helper lists a data folder and then reads each file while a live server runs; the episodic catalog writes `<file>.<12 hex>.tmp` and renames it (`src/agent-episodic-catalog/store/episodic-catalog-store.ts:50-53`). The catalog was already in this ticket's base `2e9ac1e65b`, so this is not a result of the 67 new commits. This ticket changes one list entry in the TAU test and uses the shared fixtures as they are. The race can only fail a test, never pass one falsely | Reran the file alone | Passes (`DEL-09`). Follow-up `follow-ups.md` FU-004 (the helpers need one tolerant, shared `snapshot`); RRB-1 and SID-1…3, which use the same kind of helper, passed in every run |
| `memory-llm-flow`, `agent-dual-flow`, `agent-single-flow`, `lmstudio-single-agent-run-bash-flow` | Environment: a gate open in this shell | `LMSTUDIO_HOSTS` is exported here, which is the LM Studio tests' gate (`tests/integration/helpers/lmstudio-llm-helper.ts:12-14`), so the default suite ran them. In the implementation's full run (IMP-03, no model loaded) the same files recorded no failure and no LM Studio output: `memory-llm-flow` returns at once when it finds no model (`if (!llm) return;`), so those were passes without a model call. The helper's default target `qwen/qwen3.5-35b-a3b` is not loaded; it fell back to the first loaded text model, another run's `qwen/qwen3.6-35b-a3b` (a 35B reasoning model). Measured: one "respond with pong" request took 47 s (216 tokens, 826 characters of reasoning) at a host load of 80–110, against `memory-llm-flow`'s 20 s test timeout (`Test timed out in 20000ms`) and the other three's 20 s `waitForFile` for a file the model must create through a tool call | Reran the two memory flows (the ones this ticket's read-path change reaches) against the same loaded model with a 300 s test timeout; the other three have fixed 20 s waits that this model cannot meet and no file in them is touched by this ticket | `memory-llm-flow` and `memory-tool-call-flow` pass in 20.7 s and 26.9 s (`DEL-10`). Follow-up FU-005 |

- Post-integration verification result: `Passed`, with the failures above explained and resolved by the reruns
- No-rerun rationale: N/A (new base commits were integrated and checks reran)
- Delivery edits started only after integrated state was current: `Yes` (the first delivery edit came after merge `45b410675c`)
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` @ `75048cbaf4`; re-checked before the pushes, see Repository Finalization)
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, scorecard: final 95%, seven applicable categories, none below 90%), the evidence files named below (opened), `implementation-handoff.md` Checks Run (IMP-01…IMP-08), the three review reports (`design-review-report.md` `Pass`, `code-review-report.md` CRR-001 `Pass`, `api-e2e-test-review-report.md` CRR-002 `Pass`; no open finding) and delivery's merged-state checks (`DEL-01…DEL-10`).

| Acceptance-Criteria ID | Cases And Files Checked | What I Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (no live source, test-support or doc file names the retired items, except frozen or released migration code and "retired" doc notes) | API-01 `API-01-ac001-grep.log`; delivery's `DEL-08-ac001-grep-merged.log`; the doc diffs of the branch | The same 37 hits in the same 16 files on the branch and on the merged state: 8 doc notes that say "retired" or "unread, kept", 12 in frozen or released migration code, 17 in tests that use the old file names only as kept or ignored data; no unclassified group. The deleted files (`episodic-item.ts`, `semantic-item.ts`, `memory-types.ts`, `retriever.ts`, `memory-bundle.ts`, `retriever.test.ts`) are gone | Proven |
| AC-002 (typechecks, builds and the memory, compaction and Memory page suites pass) | API-02…API-05, API-09…API-13, API-11; `DEL-01…DEL-06`, `DEL-10` | Both typechecks at baseline, server build exit 0 and the fresh-clone desktop build exit 0 with the `node-pty` probe; the `autobyteus-ts` suite 2495 passed, its 4 failures explained (live LM Studio tests, `FU-005`) and the memory flows passing; server units 913 passed; Memory page specs 41 passed. The whole-suite server failures are host load or fail on the base too (`FU-002`, `FU-003`) | Proven: no regression from this change |
| AC-003 (a start on test-owned data removes exactly the stale folders; every other agent folder and every run is byte-identical; a second start does nothing) | API-06 `API-06-07-startup-e2e.log`; `DEL-07`, `DEL-09`; the test `remove-retired-built-in-agents-startup.e2e.test.ts` read | RRB-1 asserts the migration record `SUCCEEDED`, `attempts: 1`, summary `Scanned 2; migrated 2; skipped 0; failed 0.`, both folders gone, every other pre-existing file byte-identical (`keptNow(snapshot) toEqual expected`), a second start `SUCCEEDED` with no change; RRB-2 a folder that never had them starts cleanly (both skipped); SID-1…3 and TAU-1…3 pass; API-08 (SIR-002) did the same around real runs on the desktop-like stack. `✓` on every case in three runs | Proven |
| AC-004 (`list_available_agents` and the Agents page no longer show the removed agents) | API-07 `API-07-rrb3-list-available-agents.json`; API-08 `delegated-launch-defaults-evidence.json`, `SIR-002-agents-page-1280.png`; API-06's GraphQL catalog; `DEL-09` | The tool's `structuredContent` is `{"agents":[{"name":"My Agent","kind":"agent","address":"/my_agent"}]}` (no Skill Self-Evolver, no Memory Compactor, no `/memory_compactor`); the probe reports `"agentsPage": {"selfEvolver": 0, "memoryCompactor": 0}`, `"stillThere": []`, `"changed": []`; the screenshot shows "15 agents", neither retired one among them; RRB-3 passes again on the merged state | Proven |
| AC-005 (run folders with `episodic.jsonl`/`semantic.jsonl` and the old compactor runs are byte-identical) | API-06 RRB-1; the test's `expected` set | The old item run's `episodic.jsonl` and `semantic.jsonl` and both compactor runs' `raw_traces_active.jsonl` are asserted present in `expected`, so they are part of the byte-identity check, and the compactor runs are asserted still listed in history | Proven |
| REQ-007 (the founder's approval and a backup before the first start on his node; release only on his word) | The Task and the requirements | A delivery gate, not behavior: nothing has run on his data or a copy of it (TESTING.md forbids it). The merge starts nothing on his node and no release is made | User gate, recorded (handoff summary R-1) |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No` for this finalization. The one thing only the founder can do, his approval and backup before the first start on his own node, is a gate on deploying and releasing, not on merging. Delivery finalizes and carries it to him.
- User check reference, when needed: N/A for the merge
- Re-verification after later re-integration: `Not needed`: `origin/personal` did not advance before the push (see Repository Finalization)

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md's default (the user did not ask for a release) and the founder's direction in the Task, "release only on his word", which has not been given. A release is available: a beta or stable release would carry this change; `release-notes.md` holds the notes, with a `## What you need to do` section. The founder's backup (R-1) applies before any release by any ticket.

## Docs Sync Result

- Docs sync artifact: `tickets/done/retired-memory-items-and-stale-built-ins/docs-sync-report.md`
- Docs sync result: `Updated` (by the implementation, in `ef0e56caf3`; verified by delivery against the merged state; delivery made no docs edit)
- Docs updated: `GLOSSARY.md`, `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-server-ts/docs/modules/agent_definition.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-web/docs/settings.md`
- No-impact rationale (if applicable): `DESIGN.md`, `TESTING.md` and `RELEASE.md` are `No change` (reasons in the docs sync report; the `TESTING.md` proposal is `follow-ups.md` FU-005)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`, in the final commit
- Archived ticket path: `tickets/done/retired-memory-items-and-stale-built-ins`

## Version / Tag / Release Commit

None: no release, no version bump, no tag.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin`, `personal`; ticket branch `codex/<ticket-name>`; merge `--no-ff` from a `finalize/` branch in the ticket worktree) and the ticket's bootstrap (base `origin/personal` @ `2e9ac1e65b`).
- Ticket branch: `codex/retired-memory-items-and-stale-built-ins`
- Ticket branch commit result: `ba73af3286` (delivery docs sync, handoff summary, release notes, follow-ups, verification records, archive to `tickets/done/`), on top of the base-refresh merge `45b410675c`, the reviewer-documents checkpoint `7fcda317fa`, API/E2E `da95a6105c`, its test commits and the implementation commits up to `91ee1603a5`.
- Ticket branch push result: `origin/codex/retired-memory-items-and-stale-built-ins` created (new branch) at `ba73af3286`. Secret Gate on `origin/personal..HEAD` (15 commits) `PASS` before the push; artifact hygiene `PASS` and licensing `PASS` (this ticket's evidence files have no `:` or other Windows-hostile character in their names; the longest committed path in the ticket is 126 characters).
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`: `origin/personal` was `75048cbaf4` at the start of delivery, after the checks, before the ticket's final commit, before the ticket push, before the finalize merge, after the merged-state gates and immediately before the target push.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed` (the verified state is the merged state)
- Target branch update result: `finalize/retired-memory-items-and-stale-built-ins` created from `origin/personal` @ `75048cbaf4` in the ticket worktree (not in the main checkout).
- Merge into target result: `--no-ff` merge `e58377895b`; its tree equals the ticket branch's `ba73af3286` (`git diff --stat codex/retired-memory-items-and-stale-built-ins HEAD` empty). Secret Gate on the merged state (16 commits) `PASS`; licensing `PASS`; artifact hygiene `PASS` (99003 tracked files).
- Push target branch result: `75048cbaf4..e58377895b  HEAD -> personal`. This record commit follows it (fast-forward), and the ticket branch is fast-forwarded to it.
- User's checkout of the target branch (`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to e58377895b` after the merge push: it was on `personal` at `75048cbaf4` with no commit the remote lacks, `git fetch` then `git merge --ff-only origin/personal`, no stash, reset, checkout or commit; its 6 uncommitted files (other tickets' `tickets/done/` reports) are untouched. After this record's push the same fast-forward is repeated for the record commit; its result is in the terminal message.
- Repository finalization status: `Completed`
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

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`
- Worktree cleanup result, worktree prune result, local branch cleanup result: run after this record's push and the second update of the user's checkout (`git worktree remove` from the main checkout once the worktree's untracked and ignored files are confirmed to be build output and test data only and everything committed is pushed; `git worktree prune`; delete the local `codex/retired-memory-items-and-stale-built-ins` and the temporary `finalize/retired-memory-items-and-stale-built-ins`, both merged into `origin/personal`). The results are in the terminal message.
- Remote branch cleanup result: `Not required` (the repository keeps pushed `codex/*` branches)
- Blocker (if applicable): None

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/retired-memory-items-and-stale-built-ins/release-notes.md` (archived with the ticket)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`, with a `## What you need to do` section: a user-made team or organization that lists one of the two retired agents needs a replacement member before updating, and a backup of the agents folder is advised because the removal keeps no copy. The release notes say a rollback cannot restore the folders (RELEASE.md "Rollback", app-data migrations).

## Deployment Steps

None. This repository deploys no hosted service (RELEASE.md, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Migration Required` (removal of the two installed agent folders, by the registered startup migration `20261118_remove_retired_built_in_agents`); `Not Affected` for every run file (the old item files and the old Memory Compactor runs are kept: the user's decisions DEC-004 and DEC-006)
- Delivery action required: `Migration Required`, carried out by the server at the first start of the released version, not by delivery. The migration makes no backup (the precedent, `20261006`); the founder's own backup precedes his first start (REQ-007)
- Result and evidence: `API-06` RRB-1/RRB-2 (the built Studio start on released shapes, `DEL-07`, `DEL-09`), `API-08` (SIR-002 around real runs on the desktop-like stack), the migration unit test (`DEL-05`). Completion marker: the framework's ledger; idempotent (a second start finds nothing); a failed removal returns `FAILED` and the next start retries. Recovery: restore the two folders from a backup; the ledger records the migration as done (RRB-1: `attempts: 1` after a second start), so it does not delete them again. Not run on any real data (TESTING.md)

## Verification Checks

Listed in Verification and Initial Delivery Integration Refresh above.

## Rollback Criteria

Revert the merge commit on `personal` (RELEASE.md, Rollback). A revert restores no data: a machine that has run the migration has already lost the two folders and the migration keeps no copy, so nothing can be rolled back there; fix forward, or restore from the user's backup. Before any release carries it, revert if a start fails or a retired agent reappears in the catalog; otherwise fix forward.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes` (REQ-007 is the founder's gate on his node, carried to him, not a verification gap)
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `Yes` after the steps above; the terminal message states the result
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: `Yes`, after this record's push, the update of the user's checkout and the cleanup
- Terminal message/reference: the `Delivery Completed` message to `/solution_designer` that follows this record
