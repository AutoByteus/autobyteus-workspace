# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-387: DeepSeek Harness (dsh) as an ACP runtime through the credential proxy's provider relay.
- Classification: `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`.
- Finalization target: `origin/personal`. No release requested.
- Status (DR-002): verified, archived and finalized. DR-001 was blocked by a ticket-originated architecture test failure, fixed in IR-003.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` from `origin/personal` (last changed `d6bcff577b`), read in the ticket worktree after integration.
- Deviations from the guide and why: `None`.
  - The guide says delivery audits and does not redo. The DR-002 reruns are those the guide allows: one relevant check per new base merge, plus what the handoff named (the server unit suite, which was DR-001's blocker, and the dsh scripted-provider E2E).
- Proposed guide fixes, and whether the user agreed: the release smoke check's runtime list lacks DeepSeek Harness. Recorded as FU-003 for the user's decision; not changed.

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-002`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `3ef5e33eec`.
- Refresh 1 (DR-001):
  - Base `d6bcff577b` (39 commits: autobyteus-385, autobyteus-390, `1.5.12-beta.2`, RELEASE.md).
  - Checkpoint `ad14d15d1f`; merge `7c1117e209`, no conflicts.
- Refresh 2 (DR-002):
  - Base `b7bb94beba` (autobyteus-388: web left panel and Projects view; unused `CreateAgentRun` document removed; docs).
  - Checkpoint `9165b9898b` (the code reviewer's CRR-006 files, committed as found); merge `2f85bdd672`, no conflicts.
  - Overlaps with this ticket: `generated/graphql.ts`, workspace localization, and three docs this delivery edited (different paragraphs).
- Base advanced since bootstrap or previous refresh: `Yes` (both times).
- New base commits integrated into the ticket branch: `Yes`.
- Local checkpoint commit result: `Completed`.
- Integration method: `Merge`.
- Integration result: `Completed`.
- Post-integration executable checks rerun: `Yes`.
- Post-integration verification result: `Passed` (DR-002). DR-001's run had one failure, analyzed in DR-001.

| Check | State | Command | Result | Evidence |
| --- | --- | --- | --- | --- |
| DEL-00 | `7c1117e209` | `pnpm install --frozen-lockfile && pnpm -C autobyteus-server-ts prebuild` | Pass | `evidence/delivery/DEL-00-install-prebuild.log` |
| DEL-01 | `7c1117e209` | `pnpm -C autobyteus-server-ts typecheck` | Pass (production 0; tests 1182 = baseline) | `DEL-01-server-typecheck.log` |
| DEL-02 | `7c1117e209` | `pnpm -C autobyteus-server-ts test:unit` | Fail, 1 test (DR-001; from `cb132711f6`; fixed by IR-003 `ee6739fe7f`) | `DEL-02-server-unit.log`, `DEL-02-server-unit-excerpt.log` |
| DEL-03 | `7c1117e209` | web `codegen:check`, `typecheck`, guards, localization audit | Pass | `DEL-03-web-codegen-typecheck-guards.log` |
| DEL-04 | `7c1117e209` | 10 web spec files (ticket and autobyteus-385/390) | Pass, 62 tests | `DEL-04-web-specs.log` |
| DEL-05 | `2f85bdd672` | `pnpm -C autobyteus-server-ts test:unit` | Pass: `Test Files  932 passed \| 5 skipped (937)`, `Tests  7942 passed \| 9 skipped (7951)` | `DEL-05-server-unit.log` |
| DEL-06 | `2f85bdd672` | web `codegen:check`, `typecheck`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass: `generated/graphql.ts is current.`; `test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; guards `Passed.` | `DEL-06-web-codegen-typecheck-guards.log` |
| DEL-07 | `2f85bdd672` | 17 web spec files: this ticket's Agent Runtimes, presentation and system-instruction specs, plus every spec autobyteus-388 changed (left panel, RunSectionPanel, stores, layouts) | Pass: `Test Files  17 passed (17)`, `Tests  165 passed (165)` | `DEL-07-web-specs.log` |
| DEL-08 | `2f85bdd672` | `env -i PATH HOME=<temp> TMPDIR RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E=1 DEEPSEEK_HARNESS_COMMAND=<dsh 0.2.2-rc.1> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/deepseek-harness-scripted-provider.e2e.test.ts` | Pass: `Tests  6 passed (6)`; `NO_KEY … RELAY_KEY_NOT_SET`, `KEY_REMOVED_TURN` relay text, `RESTORE_NO_KEY`, `COMPACTION_REFUSED … HTTP 400`, `KEEPALIVE` 15098 ms, `STALL ACP_TURN_IDLE_TIMEOUT` 6037 ms, `MEMORY {"processes":3,"rssMb":[325,347,345]}`; no dsh process left | `DEL-08-dsh-scripted-provider.log` |

- Rerun plan for refresh 2, following TESTING.md "Rerun by impact":
  - autobyteus-388 changed no server source, dependency, lockfile, schema, `autobyteus-ts`, contract package or harness. Its build-input change is `autobyteus-web/generated/graphql.ts`, proven current by DEL-06, with the web typecheck at its baseline.
  - It adds no new cross-package import and no build step, so no fresh-start build was redone (RELEASE.md: delivery does not redo clean clones). API-35's fresh-start macOS build stands for this ticket's build inputs.
  - The build-only release run is a pre-tag check; there is no tag.
- Delivery edits started only after integrated state was current: `Yes`.
- Handoff state current with latest tracked remote base: `Yes` (`b7bb94beba`, fetched again after verification; unchanged).

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - The API-REV-003 execution report: 95%, every category ≥ 95%, every critical AC directly proven.
  - Round 3 audited: IMP-10 `Test Files  932 passed`; `API-06-web-test-nuxt-r3.log` `Test Files  703 passed (703)`; `API-09-web-typecheck-r3.log` `[typecheck] PASS`.
  - The DR-002 reruns above.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-007, AC-008, AC-011 | API-05 → `evidence/implementation/IMP-08-live-dsh-e2e.log` | Turn with `"tools":["run_bash","read"]` and `hi from dsh`; skill turn `SKILLCODE-…`, with the unconfigured skill `NOT-AVAILABLE`; `list_available_agent_runtimes` called; `TURN1 {"usageCalls":3,"relayCalls":3}`; `Tests  5 passed (5)` | Proven |
| AC-002, AC-003 | IMP-08 | Escalation "first attempt was denied… escalated retry succeeded"; rejection `DENIED`; `"stopLatencyMs":119` | Proven |
| AC-004 | IMP-08; API-20 rerun log | "after a restart" turn answers the first marker; `TEAM_RESTORE` same session IDs before and after, reply `PING-TO-PONG-8a5530ac` | Proven |
| AC-005 | IMP-08; API-08; API-02 | `DSH_LIVE MODELS ["deepseek-v4-flash","deepseek-v4-pro","deepseek-flash"]`; `set_config_option` by unit | Proven |
| AC-006 | IMP-08; `deepseek-harness-live.e2e.test.ts:273` | Rule token followed after create, reopen and restore; literal `{probe}` | Proven for instructions the product can produce. The `{{name}}` precondition cannot be produced (requirement-basis note) |
| AC-009, QR-001 | API-10/11 and DEL-08; API-KEYSCAN; IMP-08 `KEY_SCAN` | `RELAY_KEY_NOT_SET: … Save it in Settings → API Keys.` at create and restore; removed key fails the turn with the relay's text; key scan `"hits":[]` | Proven. "Removed later" was driven through the vault service; no product surface removes a built-in key (requirement-basis note) |
| AC-010 | API-12/13 and DEL-08 | `compaction:true` calls → `compacting`/`compacted`; refused → `failed` "HTTP 400", turns completed | Proven |
| AC-012 | API-14/15 and DEL-08 | Keep-alive turn completes after 15 s under a 6 s idle timeout; stall → `ACP_TURN_IDLE_TIMEOUT` | Proven |
| AC-013 | API-30 rows and screenshots | A "API key set"; B "API key not set" + pointer, GraphQL `SIGNED_OUT`; C "Not installed" + install link | Proven |
| AC-014 | API-22 rerun log | Segments dsh → antigravity; journals dsh/agy/dsh; dsh names `created-by-dsh-f3b52647.txt` | Proven |
| AC-015 | IMP-08; test `:403-419` | Subagent, workflow, goal and plugin-manager tool IDs absent from the owned home; `~/.dsh` mtime unchanged | Proven |
| AC-016, AC-017 | API-02/03/04; DEL-05 | Grok and credential-proxy suites pass on the merged state | Proven |
| DEC-020 | API-25 r2 | `PROVIDER_RELAY_UNAVAILABLE`, `"dshStarts":[]`, `"dshDataFiles":[]` | Proven |

- More evidence requested: `None`.
- User check needed: `No`. Signing, notarization and the non-macOS builds happen only on the release runners (RELEASE.md: local builds are never signed); there is no release.
- Re-verification after later re-integration: the base did not move after verification.

## Release Decision

- Decision: `No release`. A release is available on request; the change ships with the next beta or stable.
- Decided by: RELEASE.md "Release Decision" default; the user did not ask for a release.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `TESTING.md`, `deepseek_harness_runtime.md`, `agent_execution.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md`, `prompt_engineering.md`, `token_usage.md`, `agent_memory.md`, `run_history.md`, `llm_management.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md`. Implementation's (`3514947952`) and IR-003's (`14fe5959bf`) doc changes were checked.

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/deepseek-dsh-runtime-investigation/`

## Version / Tag / Release Commit

Not applicable (no release; `autobyteus-web/package.json` stays `1.5.12-beta.2` from the base).

## Repository Finalization

- Bootstrap context source: the handoff (branch `codex/deepseek-dsh-runtime-investigation`, base `origin/personal`) and RELEASE.md "Finalization Target".
- Pre-commit checks:
  - `python3 scripts/check_repository_artifact_hygiene.py` passed (84,764 tracked files; longest path 200, from another ticket; the archive move shortens this ticket's paths).
  - `scripts/check_secrets.sh origin/personal..HEAD` passed before the first push (rerun after the archive commit).
- Ticket branch, finalization target and results: see "Finalization Record" below. It is written after the push, in the delivery record commit.

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`

## Escalation / Reroute

- None open. DR-001's Local Fix was resolved by IR-003 and CRR-005.

## Release Notes Summary

- Release notes status: `Not required`. No release; RELEASE.md requires `release-notes.md` only for a stable release, and this ticket asks no action of users beyond installing dsh to use it.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none needed. dsh keeps its data under `<appData>/runtimes/deepseek-harness/`, and no app-data migration was added.
- Delivery action required: `None`

## Rollback Criteria

Revert the merge on `personal` (RELEASE.md Rollback). There is no app-data migration. An existing dsh run's folder under `<appData>/runtimes/deepseek-harness/` is ignored by an older build.

## Finalization Record

- Ticket branch: `codex/deepseek-dsh-runtime-investigation` at `b64b9a72e7` (archive commit).
  - Secret Gate `origin/personal..HEAD`: PASS (29 commits).
  - Pushed to `origin/codex/deepseek-dsh-runtime-investigation` (new branch).
- Finalization target: `origin/personal`, unchanged at `b7bb94beba` after verification.
  - Delivery-owned edits protection: `Not needed`. Re-integration: `Not needed`.
- Merge: `finalize/deepseek-dsh-runtime-investigation` from `origin/personal`; `git merge --no-ff` → `8136e251c2`.
  - Its tree is identical to the verified ticket head (`git diff` empty).
  - Secret Gate on the merged state: PASS (30 commits).
- Push: `origin/personal` fetched again and still `b7bb94beba`; `git push origin HEAD:personal` → `b7bb94beba..8136e251c2`.
- Repository finalization status: `Completed`.
- This record is a follow-up `docs(delivery)` commit on `personal`, as earlier deliveries did.

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/deepseek-dsh-runtime-investigation`.
- Cleanup, right after this record is pushed:
  - Remove and prune the ticket worktree. Its untracked files are only the workspace packages' build output (`*/dist/`).
  - Delete the local `codex/` and `finalize/` branches; both are contained in `origin/personal`.
  - Keep `origin/codex/deepseek-dsh-runtime-investigation`, as earlier deliveries did.
  - Leave the main checkout untouched.
  - The terminal message confirms the results.
- API/E2E's temporary dsh install (`/tmp/ab387-ext`, `/tmp/ab387-dsh-bin`) is outside the repository and is not this delivery's; it is left in place.

## Final Status

- Verification complete (from the evidence): `Yes`
- Repository finalization complete: `Yes`
- Applicable release/deployment/rollout complete or not required: `Not required` (no release)
- Applicable safe cleanup complete or not required: performed right after this record is pushed (above)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: right after the cleanup
