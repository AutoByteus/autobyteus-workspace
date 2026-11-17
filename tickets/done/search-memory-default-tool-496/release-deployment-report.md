# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

Ticket `search-memory-default-tool-496` (Project Task `autobyteus-496`): every agent run has `search_memory` from the platform (SR-004). Route: `task_size=Small`, `architectural_risk=Low`, direct low-risk route (architecture review and source code review `N/A — not applicable`). Finalization into `origin/personal`. No release (see Release Decision).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at `origin/personal` `e4f4b3e176` (read in the ticket worktree after the base was integrated; unchanged by this ticket)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: the two review records the architecture reviewer left uncommitted (ARCH-REV-002, for the withdrawn SR-003 design) were committed unchanged as the checkpoint `a22e87aa40`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `a781007713`
- Latest tracked remote base reference checked: `origin/personal` @ `e4f4b3e176` (fetched 2026-11-17 before any delivery edit)
- Base advanced since bootstrap or previous refresh: `Yes` (two commits: `f52767c74a`, `e4f4b3e176`; both only `tickets/done/delegated-copies-outlive-delegator-461/*` records)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`a22e87aa40`, the two uncommitted review records; the validated code was already committed)
- Integration method: `Merge` (`26c2bc2528`, clean, no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Passed` (`evidence/DEL-01-post-integration-checks.log`):
  - `pnpm -C autobyteus-server-ts typecheck`: production errors 0; test-file errors 1012 in 316 files (baseline 1012 in 316 files); PASS
  - `pnpm -C autobyteus-web typecheck`: production errors 0; test-file errors 87 in 37 files (baseline 87 in 37 files); PASS
  - `pnpm -C autobyteus-server-ts exec vitest run <the 12 unit test files changed since base> --no-watch`: 12 files, 186 tests passed. These are the one relevant check by impact: they hold the new exposure, native-resolver and MCP `tools/list` cases and every changed exact-name expectation.
  - Rerun-by-impact plan: the base commits changed no file outside `tickets/`, so no case's code changed; the typechecks are the guide's required merge check (TESTING.md "Rerun by impact" step 5). No build output is used by the rerun cases.
- No-rerun rationale: not applicable (base commits integrated)
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` at `e4f4b3e176`; checked again before the merge (see Repository Finalization)
- Blocker: none

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on: `api-e2e-execution-coverage-report.md` (Acceptance-Criteria Proof, Cases, scorecard: final confidence 95%, every category 95%, target 95% met; Live API on a real in-process Studio server; mocked: only the embedding model and the previous build's seen-tool-names record, both recorded); the implementation handoff's Checks Run for reused cases (IMP-01, IMP-02, IMP-05); delivery's own rerun on the merged state (DEL-01). The code under test is unchanged: `git diff --name-only 5cdd6faf81 HEAD -- autobyteus-server-ts/src autobyteus-web autobyteus-ts` is empty.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (every run has `search_memory`; once when listed) | API-05, API-05N, API-07, API-08, API-09 (opened `evidence/API-05-search-memory-agy.json`, `API-05N-agy-negative-control.log`, `API-07-…autobyteus.json`, `API-08-…claude.json`, `API-09-…codex.json`); API-01/API-02 via IMP-02 and IMP-05 logs | Every live JSON has `"definitionToolNames": []` and a successful `search_memory` call (`"toolError": null`). AGY `tools/list`: `list-plain` → `["send_message_to","delegate_task","search_memory"]`; `list-listing` (definition lists it) → `search_memory` once. Negative control: `Tests  3 failed (3)`, `expected [] to deeply equal [ 'search_memory' ]`. IMP-02: `Tests  186 passed (186)`; IMP-05: `Tests  32 passed \| 8 skipped (40)` (the 8 are the `RUN_CLAUDE_E2E` cases, covered by API-08) | Proven |
| AC-002 (the tool works as it does for a listed tool) | API-03 (IMP-01/IMP-02), the live JSONs | The result and its fields are the tool's own: `agent`, `runId`, `workspace`, `matches` with `matchedBy: "text"`, in all four runtimes. The tool and `src/memory-search` are unchanged (no `src/` diff outside the exposure file). Native and Claude and Codex results name the earlier run and not the asking run, on both the first and the second search (the asking run's own turn indexed in between) | Proven |
| AC-003 (restore: tool + one notice, prompts unchanged) | API-02 (IMP-05's tool-list-update integration case), API-06 (`API-05-search-memory-agy.json` `cases.upgrade`) | `seenBefore` lacks `search_memory`; `firstInput` = `…Your tools changed. Now available: search_memory.…`; `secondInput` has no notice and `secondNotices: []`; `seenAfter.toolNames` includes `search_memory`; the call returns `CALLED:`. No prompt change: no prompt file is touched | Proven |
| AC-004 (a real native run and a real Claude or Codex run call it) | API-07 (native, `deepseek-v4-flash`), API-08 (Claude `haiku`), API-09 (Codex `gpt-6.1-terra`), API-05 (AGY scripted) | The reply of each live run is `SEARCHED <earlier run id>`; the log lines `✓ SM-autobyteus … leaves itself out`, `✓ SM-claude …`, `✓ SM-codex …` (each `Tests  1 passed | 2 skipped (3)`: the other two cases are the AGY ones, gated off); the native log line `Secret vault: test vault /Users/normy/.autobyteus-test/vault (read-only)` shows the keys came from the test vault | Proven |

- More evidence requested (from whom, what, result): `None`
- User check needed: `No`. Nothing is unreachable without the user: the real runtimes ran on the host's logins and the test vault. Grok live (API-10, quota 429) and DeepSeek Harness (`dsh` not installed) are not required by any criterion; AC-004 asks for native plus Claude or Codex, and both are proven. The behavior was decided by the user himself (SR-004), so there is no visible behavior left to check.
- Re-verification after later re-integration: `Not needed` unless the target advances again before the merge; see Repository Finalization.

## Release Decision

- Round 1 (DR-001) decision: `No release`, decided by the release guide's default (RELEASE.md "Release Decision": finalize only when the user does not ask for a release); the delegated request did not ask for one.
- **Round 2 (DR-002) decision: `Beta`**, decided by the user after the round-1 terminal package was prepared: "If everything is good please Release beta version. And I waive for grok, because I have no more usage limits." (2026-11-17, in the delivery engineer's conversation). The user also **waived Grok** in the release smoke check, for this release. Details: "Round 2" at the end of this report.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/modules/{memory_search,agent_tools_mcp_server,tool_list_updates,agent_tools,prompt_engineering}.md`, `TESTING.md`
- No-impact rationale: not applicable

## Ticket State Transition

- Ticket moved to `tickets/done/search-memory-default-tool-496`: `Yes` (before the final commit)
- Archived ticket path: `tickets/done/search-memory-default-tool-496/`

## Version / Tag / Release Commit

Round 1: not applicable (no release). Round 2: beta `v1.5.13-beta.8`; see "Round 2" below. The migration record in `app-data-migration-registry-order.test.ts` (`RELEASED`) needs no change: no migration was added since `v1.5.13-beta.7` (the registry-order test passes).

## Repository Finalization

- Bootstrap context source: `handoff-implementation.md` (finalization target `origin/personal`) and `RELEASE.md` "Finalization Target"
- Ticket branch: `codex/search-memory-default-tool-496`
- Ticket branch commit result: `Completed`. Final ticket-branch commit `d991426e58` (docs sync, handoff summary, release report, archive to `tickets/done/`). Only intended paths were staged; the untracked `*/dist/` build outputs were not committed.
- Ticket branch push result: `Completed`. `codex/search-memory-default-tool-496` pushed (new branch). Secret Gate on `origin/personal..codex/search-memory-default-tool-496` (14 commits): PASS.
- Finalization target remote: `origin`
- Finalization target branch: `personal`
- Target advanced after verification / acceptance: `No`. `origin/personal` was `e4f4b3e176` when verified and again just before the merge and the push.
- Delivery-owned edits protected before re-integration: `Not needed`
- Re-integration before final merge result: `Not needed`
- Target branch update result: `Completed`. `finalize/search-memory-default-tool-496` created from `origin/personal` `e4f4b3e176`, in the ticket worktree (not the main checkout), as RELEASE.md says.
- Merge into target result: `Completed`. `git merge --no-ff codex/search-memory-default-tool-496` → `1b23ba29e2` (first parent `e4f4b3e176`); its tree is identical to the ticket branch's. Secret Gate on the merged state (15 commits): PASS. `python3 scripts/check_repository_artifact_hygiene.py` on the staged state: passed (95,427 tracked files; longest path 200 characters, within the threshold; no colon or other Windows-hostile names in the files added).
- Push target branch result: `Completed`. `e4f4b3e176..1b23ba29e2  HEAD -> personal`. This record was then pushed as a fast-forward record commit on top of `1b23ba29e2` (see Final Status).
- User's checkout of the target branch (path `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`): `Updated to 1b23ba29e2` by `git merge --ff-only origin/personal` (it was on `personal`, no local commits, 15 behind). None of the 46 paths it had modified or untracked (other tickets' record edits, `*/dist/`, `computer-tools/`, and the like) is in the 58 files the update touched, so git kept them as they were. Nothing was stashed, reset or committed there. After the record commit below it is brought to that commit the same way.
- Repository finalization status: `Completed`
- Blocker: none

## Release / Publication / Deployment

- Applicable: round 1 `No`; round 2 `Yes` (beta `v1.5.13-beta.8`, see "Round 2" below)
- Method (round 1): none
- Pipelines triggered and their results (round 1): none (no tag, no push of a `v*` tag, so none of the four release workflows ran)

| Failed Run And Job | Classification | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

- Published artifacts checked against what the release should produce: not applicable
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required`
- Blocker: none

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-memory-default-tool-496`
- Worktree cleanup result: performed right after the record commit below was pushed, with `git worktree remove --force` (only untracked build outputs remain in it: `*/dist/`, `.nuxt`, `node_modules`); the result is in the terminal message, since the worktree that holds this file is the one removed
- Worktree prune result: same step (`git worktree prune`)
- Local ticket branch cleanup result: same step: local `codex/search-memory-default-tool-496` and `finalize/search-memory-default-tool-496` deleted after confirming both are contained in `origin/personal`
- Remote branch cleanup result: `Not required`. `origin/codex/search-memory-default-tool-496` is kept, as the repository keeps its other 463 `codex/*` branches; everything on it is in `personal`.
- Stashes in the shared repository (`stash@{0}`…, other tickets') are not this ticket's and were left alone.
- Blocker: none

## Escalation / Reroute

Not used.

## Release Notes Summary

- Release notes artifact created before verification / acceptance: none
- Archived release notes artifact used for release/publication: none
- Release notes status: `Not required`. Round 1: no release. Round 2: a beta, whose notes are GitHub-generated (RELEASE.md "Workflow Reference"); the three tickets in it (496, 507, 508) have no `release-notes.md` and no `## What you need to do` section, so nothing is added above the generated notes.

## Deployment Steps

None: the repository deploys no hosted service (RELEASE.md "Deployment"). The change reaches users with the next release.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: the per-run seen-tool-names record is rewritten by its existing writer at the first restore after the upgrade (API-06 `seenAfter`). No migration, no version-specific code.

## Verification Checks

Listed in Verification and Initial Delivery Integration Refresh above. Before the merge on the merged state: `scripts/check_secrets.sh` and `python3 scripts/check_repository_artifact_hygiene.py` (results in the final record).

## Rollback Criteria

Revert the merge on `personal` (RELEASE.md "Rollback"). No release exists to roll back. Reverting removes the platform-given tool; runs restored afterwards would get a "No longer available: search_memory" notice once, through the same path. No data was converted.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `Yes` (from the evidence)
- Repository finalization complete: `Yes` (`1b23ba29e2` on `origin/personal`)
- Applicable release/deployment/rollout complete or not required: `Yes` (not required: no release)
- Applicable safe cleanup complete or not required: `Yes` (see Post-Finalization Cleanup; the step's result is stated in the terminal message)
- Unresolved blocker: `None`
- Successful terminal package eligible for return: `Yes`
- Terminal package sent to the Solution Designer: sent after the cleanup step; see the terminal message
- Terminal message/reference: the `send_message_to` message to the Solution Designer after this record commit and the cleanup

## Final Record

- Merge commit on `personal`: `1b23ba29e2`. This record: one further commit on `personal` (a fast-forward from `1b23ba29e2`), the last commit of the delivery.
- Ticket archive: `tickets/done/search-memory-default-tool-496/`.

## Round 2 (DR-002): Beta `v1.5.13-beta.8`

### Request and decision

- Trigger: the user's decision above (Beta, Grok waived). Release guide: `RELEASE.md` at `origin/personal` `9695d310c5` (unchanged by this release; read in the release worktree). Deviations: none, except that API/E2E committed the test fix on the release branch (the 461 delivery did the same).
- Release worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.13-beta.8`, branch `finalize/release-v1.5.13-beta.8`, created from `origin/personal` `a8ac226e65` (the main checkout is never used, as RELEASE.md says).
- Version: `1.5.13-beta.8` (`python3 scripts/release_versions.py next-beta`; previous release `v1.5.13-beta.7`).
- What the beta ships: everything on `personal` since `v1.5.13-beta.7`: three tickets, `autobyteus-496` (this one), `autobyteus-507` (screenshots of tabs not shown on screen work; typed tab and screenshot errors) and `autobyteus-508` (the 461 conversion keeps a Settings edit's runtime). The 507 and 508 tickets finalized before this beta was requested and were not part of the user's request; a beta carries them by design.

### Failure before tagging, triaged first (RELEASE.md "Recovery")

`python3 scripts/release_smoke.py` on `a8ac226e65`:

| Failed Run And Job | Classification (`Platform`/`Ours`) | Log Lines That Show The Cause | Action | Result |
| --- | --- | --- | --- | --- |
| Smoke, `other`: `configured-skill-on-demand-loading.e2e.test.ts` "keeps ordinary native tools and configured skill reads explicit in the same active run" | **Ours** | `AssertionError: expected [ 'run_bash', 'read_file', …(3) ] to deeply equal [ 'run_bash', 'read_file', …(2) ]`; diff `+ "search_memory"`; log line `LLM instance 'DeterministicLLM' and 5 tools prepared` | Not tagged. Handed to API/E2E with the log lines (reproduce from a fresh start; fix; prevention in the stage that let it through). API/E2E round 2 (API-REV-002, 95%): reproduced (API-11); found two more stale exact tool lists, `project-task-boundaries.e2e` (its `beforeAll` failed, so 18 cases were skipped) and `autobyteus-agent-run-backend-factory.integration`; fixed all three (`6aa25d9191`, each spreads `PLATFORM_GIVEN_TOOL_NAMES`); added the prevention to TESTING.md "Choosing the path" (`8af6082a52`): a change to the tools a run gets runs the whole unit, integration and server E2E suites plus a search of the gated suites for exact tool lists. No release-guide step was added. | Fixed and verified (API-13, API-17, API-18; this delivery's smoke below) |
| Smoke, Grok live (3 cases) | **Platform** (the Grok account's free-usage quota) | `ACP_PROMPT_FAILED … Rate limited: API error (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for model grok-4.7 for now` | **Waived by the user for this release** (RELEASE.md allows a named runtime to be waived at the release decision) | Waiver recorded; Grok's other coverage: API-10 of this ticket was also `Not Tested` for the same quota |

API/E2E's own smoke runs under heavy machine load (load average 49–300) failed AGY cases that passed alone, and varied from run to run (API-17, API-18). They are load timing, not code: API-17A (AGY alone, 10/10) and this delivery's run below.

### Integration refresh before the tag

- `origin/personal` advanced from `a8ac226e65` to `9695d310c5` while API/E2E worked (tickets 507 and 508; docs, the Electron browser code, the server browser bridge, and a fix inside the released `delegated-runs-own-runs-v1` conversion). Merged into the release branch (not rebased, so the commit hashes in API/E2E's evidence stay valid): `daa47dc70e`, clean.
- Checks on `daa47dc70e` (`evidence/DEL-02-beta8-pre-tag-checks.log`):
  - `python3 scripts/check_licensing.py`: pass; `python3 scripts/check_repository_artifact_hygiene.py`: pass; `scripts/check_secrets.sh v1.5.13-beta.7..HEAD` (42 commits): PASS;
  - `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`: pass;
  - `pnpm -C autobyteus-server-ts typecheck`: production errors 0, test-file errors 1012 in 316 files (baseline); `pnpm -C autobyteus-web typecheck`: production errors 0, test-file errors 87 in 37 files (baseline);
  - registry-order test: 3/3 (`RELEASED` unchanged).
- `python3 scripts/release_smoke.py` on `daa47dc70e` (machine load average about 60; it did not fall below 40 in a 15-minute wait): claude 3/3 PASS, codex 3/3 PASS, antigravity 2/2 PASS, autobyteus 2/2 PASS, no `other` failure; **grok 0/3 FAIL (429 quota), waived by the user**. The tool's own verdict line reads `FAIL` only because of the three Grok rows. Models: claude `haiku`, codex `gpt-5.6-luna`, grok `grok-4.7` (offered, quota exhausted).

### Tag and rollout

(Written after the tag: see the section "Round 2 tag and rollout" below.)
