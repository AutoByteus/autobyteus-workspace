# Delivery / Release / Deployment Report — claude-anthropic-effort-control

## Release / Publication / Deployment Scope

Repository finalization only: merge `codex/claude-anthropic-effort-control` into `origin/personal`. No release, tag or deployment.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` (last changed `32eac0292`), read in the ticket worktree after integrating `5fb7f2918`.
- Deviations from the guide and why: none. gitleaks was not installed on this machine (Secret Gate exit 2 = blocked), so delivery installed gitleaks v8.30.1 (linux arm64, checksum verified against the release's `checksums.txt`) into `~/.local/bin` and ran the gate as written.
- Proposed guide fixes: the install hint `brew install gitleaks` does not apply to Linux delivery hosts. Suggest adding "or the official release binary from github.com/gitleaks/gitleaks/releases, checksum-verified". Not changed: the user has not agreed and this ticket is not about the guide.

## Handoff Summary

- Handoff summary artifact: `tickets/done/claude-anthropic-effort-control/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/claude-anthropic-effort-control/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `e82d03b0f`
- Latest tracked remote base reference checked: `origin/personal` @ `5fb7f2918`
- Base advanced since bootstrap or previous refresh: `Yes` (40 commits: live-tool-list-updates autobyteus-324 and the v1.5.11-beta.2 release)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`, `0f02c6119` (the reviewers' uncommitted documents: code-review-report, code-review-revision-record, api-e2e-test-review-report, design-review-report, architecture-review-revision-record)
- Integration method: `Merge` (`257c1b9ea`), no conflicts
- Overlap check: base and ticket share one non-ticket file, `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`. The base only registers the tool-list cases there, which is unrelated to this ticket. The base touches no LLM, Anthropic, model-config, launch or validator source (its only `llm` path is `autobyteus-ts/src/agent/loop/llm-phase-tools.ts`).
- Post-integration executable checks rerun: `Yes`
  - `autobyteus-ts`: `corepack pnpm exec vitest run` on the 9 ticket unit files (anthropic-llm, claude-5-5, request policy, supported-model-definitions, provider-native payloads, metadata resolver, summary output limit, nonstreaming finish, compaction transport): 9 files, 192 tests passed
  - `autobyteus-server-ts` unit: launch-usability-check, `tests/unit/llm-management`, org run model selection, `tests/unit/agent-collaboration/collaborators`, remote delegation receiver, standalone root collaborator port, token price config, claude session event converter: 30 files, 248 tests passed
  - `autobyteus-server-ts` e2e: `stopped-run-model-config-graphql`, `stopped-org-workspace-graphql`: 2 files, 3 tests passed
  - `autobyteus-web`: ChatThinkingControl, chatThinkingMenu, ModelConfigSection, chatDraftStore, llmConfigSchema, llmThinkingConfigAdapter: 6 files, 101 tests passed
  - Typecheck: `autobyteus-ts` `tsc -p tsconfig.build.json --noEmit` exit 0; server `tsc -p tsconfig.build.json --noEmit` exit 0; web `pnpm typecheck` PASS (production errors 0; test-file errors 298, the same as the baseline)
- Post-integration verification result: `Passed`
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (rechecked before the push; see Repository Finalization)

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: api-e2e-execution-coverage-report.md (round 2, API-REV-002, final confidence 95%, no category below 90%, no user-only parts), implementation-handoff Checks Run (IMP rows), the evidence files below, and the integrated-state rerun above.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-009 | API-01 (IMP-05, IMP-11) `IMP-05-live-effort-per-model.log`, `IMP-11-live-off-and-stored-config.log` | Live: Anthropic accepts the effort on all 7 remaining Claude models (fable-5-1, fable-5, opus-5, opus-5-5, sonnet-5-5, sonnet-5, haiku-5-5), with thinking on and off; 12/12 + 7/7 pass | Proven |
| AC-002, AC-003, AC-004 | API-01, API-07 `API-07-claude-5-5-live.log` | `Tests 6 passed (6)` live on Sonnet/Haiku 5.5; integrated rerun of the adapter unit tests passes | Proven |
| AC-005, AC-006 | API-06, IMP-12 screenshots `IMP-12-composer-opus55-effort-list.png`, `IMP-12-composer-fable5-one-list.png`, `API-06-definition-opus55-effort.png` | Screenshot files present (1510×777); the report describes one list with no display row; web specs rerun pass | Proven |
| AC-007 | API-05 `API-05-r2-removed-model-run-settings.png`, API-08 grep audit | "No longer offered" state; no src/web/docs hits. Delivery re-grepped the docs: clean | Proven |
| AC-008, AC-010 | API-07 `-calls-summary.json`, `-case-results.json`; API-07b | 0 occurrences of `"display"`; caching suite `7 passed` | Proven |
| AC-011 | API-02/03 `API-02-03-r2-resume-team-org-synthetic.log` + R1 live log | Restore of agent/team/Org runs passes; requests carry no stale key; 4/4 in R2 synthetic and R1 live | Proven |
| AC-012 | API-06, API-09, API-10 `API-r2-browser-journeys.txt` + screenshots; IMP-17 log `5 passed` | "Saved. Changes apply when this run resumes."; stored `{'reasoning_effort': 'high'}`; untouched Org scopes keep their stored config; opening changes no bytes (sha `8aa7a0a2b59e539c` before and after); invalid `ultra` → `VALIDATION_FAILED`; server e2e rerun on the integrated state passes | Proven |
| AC-013 | IMP-17 (a)/(b), IMP-19, IMP-20, API-11 | Validated launch paths drop the key; app launch replies "LYCHEE" with no error | Proven for the design's validated paths; the standalone residual is FU-005 (accepted by design SR-005) |

- More evidence requested: `None`
- User check needed: `No`. Everything was proven through real surfaces (browser, live Anthropic); nothing needs the user's own accounts.
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the RELEASE.md default ("No release … the default when the user does not ask for one"). The request and the requirements ask for no release. A beta or stable release is available on request.

## Docs Sync Result

- Docs sync artifact: `tickets/done/claude-anthropic-effort-control/docs-sync-report.md`
- Docs sync result: `Updated` (by implementation IR-001/IR-002; delivery verified them and made no edits)
- Docs updated: `autobyteus-ts/docs/provider_model_catalogs.md`, `llm_module_design.md`, `llm_module_design_nodejs.md`; `autobyteus-server-ts/docs/modules/llm_management.md`, `run_history.md`; `autobyteus-web/docs/chat.md`, `settings.md`

## Ticket State Transition

- Ticket moved to `tickets/done/claude-anthropic-effort-control`: `Yes`
- Archived ticket path: `tickets/done/claude-anthropic-effort-control/`

## Version / Tag / Release Commit

Not applicable (no release).

## Repository Finalization

- Bootstrap context source: ticket `handoff.md` (finalization target `origin/personal`) and RELEASE.md "Finalization Target"
- Ticket branch: `codex/claude-anthropic-effort-control`
- Ticket branch commit result: see the Final Status addendum
- Ticket branch push result: see the Final Status addendum
- Finalization target remote / branch: `origin` / `personal`
- Merge method: `finalize/claude-anthropic-effort-control` from `origin/personal`, `git merge --no-ff`, Secret Gate before the first push and again on the merged state, fetch-before-push check
- Results: see the Final Status addendum

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required` (No release decision)
- Release notes handoff result: `Not required`

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control`
- Results: see the Final Status addendum

## Release Notes Summary

- Release notes status: `Not required` (no release; the change ships with the next release, whose notes come from that release's delivery)

## Deployment Steps

None. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Directly Usable — No Migration` (DEC-011)
- Delivery action required: `None`
- Result and evidence: stored `thinking_display` keys are ignored at request time (AC-011) and left out on the next real save (AC-012); untouched data is not rewritten (API-09, API-10).

## Verification Checks

Checks before merge (on `257c1b9ea` plus the delivery commit): `python3 scripts/check_repository_artifact_hygiene.py` exit 0, `python3 scripts/check_licensing.py` "Licensing is consistent.", `scripts/check_secrets.sh origin/personal..HEAD` PASS (15 commits before the archive commit; rerun before the push, see addendum).

## Rollback Criteria

Revert the merge on `personal` and cut a new release if Claude runs fail with effort-related 400s or if stopped-run edits fail. This ticket has no data migration. Runs saved on this build may hold Claude `reasoning_effort`, which older builds do not declare. Per RELEASE.md "Rollback", no rollback compatibility is kept for that: an older build's validator would refuse such a key on edit, and its adapter does not send effort.

## Final Status

(Completed in the addendum below, after finalization.)
