# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `native-tool-search-515` (autobyteus-515): tool search on the AutoByteus native runtime. Repository finalization into `origin/personal`; no release, publication or deployment (the founder has not said to release). `task_size` Medium, `architectural_risk` High, reviewed route.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, as on `origin/personal` @ `3722dbb1d8` (read from the main checkout, which is at that commit, and compared with `git show origin/personal:RELEASE.md`: identical).
- Deviations from the guide and why: `None`. The guide's finalization steps run in the ticket worktree. The ticket branch is pushed first, as earlier tickets did (the repository keeps pushed `codex/*` branches).
- Proposed guide fixes, and whether the user agreed: `None`. RELEASE.md was accurate for every step this delivery ran.

## Handoff Summary

- Handoff summary artifact: `tickets/done/native-tool-search-515/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/native-tool-search-515/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: written after the integration refresh and the post-integration checks, against `bf5250aef3`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `4cbf9e7881`
- Latest tracked remote base reference checked: `origin/personal` @ `3722dbb1d8` (`git fetch origin personal`, 2026-11-17, at the start of delivery and again before the Secret Gate)
- Base advanced since bootstrap or previous refresh: `Yes` (76 commits: phone run settings and conversation UI, restart reminders and background-task notices, the Claude SDK binary packaging, the Server Docker Release building each architecture natively, contract DTO changes, release records)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`e63a77ad66`: the code reviewer's two uncommitted ticket files, CRR-002, so the merge could not lose them)
- Integration method: `Merge` (`git merge origin/personal`, merge commit `bf5250aef3`; no conflict; files both sides changed: `GLOSSARY.md`, `TESTING.md`, `autobyteus-agent-run-backend-factory.test.ts`, all merged automatically and read after the merge)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`. Plan by TESTING.md "Rerun by impact": the base changed no `autobyteus-ts` source, no lockfile and no dependency; it changed contract-package sources, the native backend and its background-task reporter, and the prompt composer. Marked Rerun: both typechecks (step 5), the factory unit test (changed on both sides), the new server E2E, and the gated native background-task suite (the base changed the reporter and that suite). Marked Still valid: the live-provider cases (API-07…API-13), the evaluation (API-08) and the web handler case (API-14): nothing they exercise changed (the base brought no `autobyteus-ts` change and no web handler change).

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Server typecheck | `pnpm -C autobyteus-server-ts typecheck` | PASS: 0 production errors; test-file errors 1012 in 316 files = baseline | `evidence/DEL-01-server-typecheck.log` |
| Web typecheck | `pnpm -C autobyteus-web typecheck` | PASS: 0 production errors; 87 test-file errors in 37 files = baseline. The first attempt, started at the same time as the server typecheck, ended at once with exit 1 and empty output (both rebuild the shared packages: delivery broke TESTING.md's "one heavy run at a time"); the rerun alone passed | `evidence/DEL-02-web-typecheck.log` |
| Native backend and prompt unit tests, including `autobyteus-agent-run-backend-factory.test.ts` | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus tests/unit/agent-execution/prompt --no-watch` | 13 files, 162 tests passed | `evidence/DEL-03-post-integration-checks.log` |
| New server E2E (API-04's file) | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts --no-watch` | 1 passed (`NTS-E2E-001…005`) | `evidence/DEL-03-post-integration-checks.log` |
| Gated native background-task suite | `env -i … RUN_NATIVE_BACKGROUND_TASK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts --no-watch` (twice), then `-t BGT-01` | Run 1: 1 failed, 8 passed (unhandled `Command failed: ps -axo …` in a `run_bash` start). Run 2: BGT-01 failed (`Command control deadline exceeded`), BGT-02…BGT-09 passed (BGT-09 failed on both builds before). BGT-01 alone: passed. Cause: FU-003's 1.5 s launch deadline under load (load average 53–90, `fseventsd` at 112 % CPU); no failure involved tool search | `evidence/DEL-04-native-background-task-suite.log` |

- Post-integration verification result: `Passed`
- No-rerun rationale: N/A (new base commits were integrated and checks reran)
- Delivery edits started only after integrated state was current: `Yes` (the first delivery edit came after merge `bf5250aef3`)
- Handoff state current with latest tracked remote base: `Yes` (`origin/personal` @ `3722dbb1d8`; re-checked before the push, see Repository Finalization)
- Blocker (if applicable): None

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, scorecard: final 94.9%, no category below 90%), its evidence files named below, the code and test-code reviews (CRR-001 Pass 9.5/10, CRR-002 Pass), and delivery's merged-state checks (`DEL-01…DEL-04`).

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (request holds the base tools, search and call; none other) | API-04 `API-04-native-tool-search-server-e2e.log` and `API-04-native-tool-search-e2e.json`; API-13 `API-13-upgrade-restore.log`; API-07 | 9 requests, `distinct tool sets: 1`, tools `run_bash,read_file,edit_file,write_file,search_tools,call_tool`; the mutation (server passes `null`) fails the same test; after restore `firstRequestTools` are the same six | Proven |
| AC-002 (search returns full definitions; none says so) | API-04 request 2 (the `search_tools` result holds `list_projects`' full definition); API-11 history | `Found 1 tool. Call one with call_tool: …` followed by the name, description and parameters; a search after removal no longer returns the removed tool | Proven |
| AC-003 (call through `call_tool` is the real tool's: approval, events, card, history; errors) | API-04 `approvals`, `segment END tool_name`, `history tool_call names`; API-14 `API-14-web-call-tool-card.log`; API-12 | approvals and END names `["search_tools","list_projects","list_projects","list_project_tasks","list_projects"]`; history never names `call_tool`; web case 23 passed with the card named after the real tool; the refusal, malformed-argument and invalid-argument cases are unit cases (IMP-02, 2480-test library run) | Proven |
| AC-004 (search then call on each reachable provider) | API-07 `API-07-live-tool-search-all-providers.log` | `Tests 7 passed \| 1 skipped`; seven `"outcome":"called_correctly"` lines with `"identicalTools":true` (DeepSeek V4 Flash and Pro, Gemini 3.8 Flash, GLM 5.3, Grok 4.7, GPT-5.4 mini, Claude Sonnet 5.5); Kimi `quota_or_billing_blocked` and Gemini AI Studio `invalid_or_missing_credentials` recorded with their reasons, as the criterion allows | Proven for every provider the vault reaches; unreachable providers recorded |
| AC-005 (add/remove a tool: next request byte-identical; notice; search and call; removed refused) | API-04; API-11 `API-11-live-tool-list-native-deepseek.log` | `tools bytes/system bytes … ["9471/4449"]` on all 9 requests across add, remove and restore; live turn 2 finds and calls the added tool, turn 3's search lists the changed set | Proven |
| AC-006 (identical `tools` and system around a search and call; cache reads) | API-04; API-07 usages; API-09 `API-09-anthropic-prompt-caching-live.log`; API-10 | DeepSeek `cacheRead` per request 640, 896, 1152 (never below the previous prompt rounded down); APC-E2E-004 `"toolsChanged":false` with the thinking blocks kept and `cache_read` 38,432; CCR-E2E-002 accepted by the strict harness | Proven |
| AC-007 (search and call after compaction) | IMP-02 (scripted compaction then search and call); API-10 `API-10-compaction-cache-reuse-live.log` | `Tests 4 passed (4)`, CCR-E2E-002 `"toolsChanged":false`, thinking kept, cache share 0.9565 | Proven |
| AC-008 (≥ 5,000 fewer first-request prompt tokens, PM and DA) | API-08 `API-08-evaluation-old-vs-new.log` and the two JSON files | `pm first-request saving 5096`, `da first-request saving 5722`; minimum per conversation 5080 and 5714 (both above 5,000); mean per request, cache reads and requests per task reported old against new | Proven |
| AC-009 (every task that succeeds old succeeds new) | API-08 | 6 PM tasks 11/11 on both builds; DA tasks 11/11 except `da-download`, which failed on both builds because the evaluation's stub wrote `logo` without an extension where the real tool adds one (the log shows the old build's `download_media({"filename":"logo",…})` failing too); with the stub fixed `da-download` 4/4 on each build | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`. Everything that matters was reached by real providers, the real server and the base-vs-branch builds. The founder's word is needed for a release, not for a check of the behavior.
- User check reference, when needed: N/A
- Re-verification after later re-integration: `Not needed` unless `origin/personal` advances before the push (see Repository Finalization)

## Release Decision

- Decision: `No release`
- Decided by: RELEASE.md's default (the user did not ask for a release) and the ticket's direction, "release only on the founder's word" (`handoff-architecture.md`, `requirements-doc.md` stakeholder table). A release is available: a beta or a stable release would carry this change; `release-notes.md` holds the notes.

## Docs Sync Result

- Docs sync artifact: `tickets/done/native-tool-search-515/docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `GLOSSARY.md`, `autobyteus-ts/docs/tool_schema_and_configuration.md`, `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-ts/docs/agent_memory_design.md`, `TESTING.md`
- No-impact rationale (if applicable): `DESIGN.md` and `RELEASE.md` are `No change` (reasons in the docs sync report)

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `Yes`
- Archived ticket path: `tickets/done/native-tool-search-515`

## Version / Tag / Release Commit

None: no release, no version bump, no tag.

## Repository Finalization

- Bootstrap context source: `RELEASE.md` Finalization Target (`origin`, `personal`; ticket branch `codex/<ticket-name>`; merge `--no-ff` from a `finalize/` branch in the ticket worktree) and the ticket's `handoff-architecture.md`.
- Ticket branch: `codex/native-tool-search-515`
- Ticket branch commit result: (filled in after the commit)
- Ticket branch push result: (filled in after the push)
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: (filled in)
- Delivery-owned edits protected before re-integration: (filled in)
- Re-integration before final merge result: (filled in)
- Target branch update result: (filled in)
- Merge into target result: (filled in)
- Push target branch result: (filled in)
- User's checkout of the target branch (path): (filled in)
- Repository finalization status: (filled in)
- Blocker (if applicable): (filled in)

Pre-push checks run on the ticket branch before delivery's own commit (`origin/personal..HEAD`, 10 commits): Secret Gate `PASS (no secrets found)`; `python3 scripts/check_licensing.py` `Licensing is consistent`; `python3 scripts/check_repository_artifact_hygiene.py` `passed` (97231 tracked files; the evidence files this ticket adds have no `:` or other Windows-hostile character in their names and none is near the 200-character limit).

## Release / Publication / Deployment

- Applicable: `No`
- Method: N/A
- Method reference / command: N/A
- Pipelines triggered and their results: none (no tag pushed). The Secret Gate, licensing and hygiene checks above are the pre-merge checks RELEASE.md asks for.

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action (rerun, or handed to whom) | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: N/A
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (written for the next release)
- Blocker (if applicable): None

## Post-Finalization Cleanup

(filled in after the cleanup)

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

Not used.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: `tickets/in-progress/native-tool-search-515/release-notes.md` (archived with the ticket)
- Archived release notes artifact used for release/publication: N/A (no release)
- Release notes status: `Updated`. No `## What you need to do` section: persisted data is `Directly Usable - No Migration`, and the only user-visible change in behavior (a second approval when reviewing non-base tool calls) is described in the notes.

## Deployment Steps

None. This repository deploys no hosted service (RELEASE.md, Deployment).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable - No Migration`
- Delivery action required: `None`
- Result and evidence: `evidence/API-13-upgrade-restore.log` (a run written by the base build, restored by the new build on DeepSeek V4 Flash, Gemini 3.8 Flash and Claude Sonnet 5.5, `"success":{"rename":true,"start":true}`, raw traces without `called_through` read as before); `API-R02` (`fromDict` without the key).

## Verification Checks

Listed in Verification and Initial Delivery Integration Refresh above.

## Rollback Criteria

Revert the merge commit on `personal` (RELEASE.md, Rollback). The change converts no data, so a revert needs no data step. The reverse direction, a run created with tool search and restored by a build without it (its working context then holds `call_tool` calls the older agent has no tool for), was not tested: the persisted-data decision and API-13 cover old data on the new build only. RELEASE.md says other changes need no rollback compatibility. Revert if a provider fails on `call_tool` in use; fix forward otherwise.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes`
- Repository finalization complete: (filled in)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: (filled in)
- Unresolved blocker: (filled in)
- Successful terminal package eligible for return: (filled in)
- Terminal package sent to the Solution Designer: (filled in)
- Terminal message/reference: (filled in)
