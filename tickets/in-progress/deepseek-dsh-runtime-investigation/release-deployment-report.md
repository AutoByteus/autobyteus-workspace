# Delivery / Release / Deployment Report

## Release / Publication / Deployment Scope

autobyteus-387, DeepSeek Harness (dsh) as an ACP runtime through the credential proxy's provider relay. `task_size` `Large`, `architectural_risk` `High`, route `Reviewed`. Finalization target `origin/personal`. No release was requested.

**Status: Blocked (DR-001).** The post-integration server unit suite fails one architecture test. The failure comes from this ticket's CR-001 refactor, not from the base merge. It is a code `Local Fix` for the implementation engineer.

## Project Release Guide

- Release guide path and revision: `RELEASE.md`, read from `origin/personal` `d6bcff577b` (in the ticket worktree after integration).
- Deviations from the guide and why: `None` so far (finalization not reached).
- Proposed guide fixes, and whether the user agreed: the release smoke check's runtime list does not include DeepSeek Harness. Recorded as FU-003 for the user's decision, not changed.

## Handoff Summary

- Handoff summary artifact: not written yet. The skill writes it only after the integrated state is verified.
- Handoff summary status: `Blocked`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001`
- Notes: —

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `3ef5e33eec`
- Latest tracked remote base reference checked: `origin/personal` `d6bcff577b` (fetched 2026-11-06)
- Base advanced since bootstrap or previous refresh: `Yes` (39 commits: autobyteus-385 workspace-tree-vs-chooser, autobyteus-390 run-expand-motion, `1.5.12-beta.2` version bump, RELEASE.md update)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed`. `ad14d15d1f` holds the code reviewer's uncommitted CRR-004 updates and the Solution Designer's uncommitted ARCH-REV-003 outcome line in `handoff-architecture-design-complete.md`, committed as found. That line was written at 07:32, with the ARCH-REV-003 records committed in `6c755b2826`, and matches them.
- Integration method: `Merge` (`7c1117e209`, no conflicts). Auto-merged overlaps: `GLOSSARY.md`, `TESTING.md`, `autobyteus-web/generated/graphql.ts` and `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` (different keys).
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes`
- Post-integration verification result: `Blocked`
- Rerun plan (TESTING.md "Rerun by impact"). No shared foundation changed in the base: no lockfile or dependency change (`autobyteus-web/package.json`: version and probe scripts only), no schema, `autobyteus-ts`, contract packages or harness. Overlaps are the generated GraphQL file and localization. Rerun: typechecks, the full server unit suite (the base changed run-history services; the suite also holds the generated-GraphQL and tracked-imports architecture tests), web codegen check, guards and the ticket's and base's affected specs. The dsh scripted-provider E2E is planned for after the fix.

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| DEL-00 | `pnpm install --frozen-lockfile && pnpm -C autobyteus-server-ts prebuild` | Pass | `evidence/delivery/DEL-00-install-prebuild.log` |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass (`production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)`) | `DEL-01-server-typecheck.log` |
| DEL-02 | `pnpm -C autobyteus-server-ts test:unit` | **Fail**: `Test Files  1 failed \| 931 passed \| 5 skipped (937)`; `Tests  1 failed \| 7941 passed \| 9 skipped (7951)` | `DEL-02-server-unit.log`, `DEL-02-server-unit-excerpt.log` |
| DEL-03 | web `codegen:check`, `typecheck`, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Pass (`generated/graphql.ts is current.`; `[typecheck] PASS`; guards `Passed.`) | `DEL-03-web-codegen-typecheck-guards.log` |
| DEL-04 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run components/settings/agent-runtimes utils/__tests__/deepseekHarnessRuntimePresentation.spec.ts utils/__tests__/grokBuildRuntimePresentation.spec.ts components/settings/model-routing services/activity components/runList components/progress/__tests__/SystemInstructionActivityItem.spec.ts` | Pass (`Test Files  10 passed (10)`, `Tests  62 passed (62)`) | `DEL-04-web-specs.log` |

- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` (as of `d6bcff577b`; to be checked again before finalization)
- Blocker: DEL-02, below.

### The DEL-02 failure

- Test: `tests/architecture/agent-provider-composition-boundaries.test.ts` › "creates one frozen context path value per host and shares it across both roots" (`:700`). It expects `src/agent-execution/runtime/general-process-run-supervisor.ts` to contain `contextFilePathEnvironment: ContextFilePathEnvironment`.
- Cause: `cb132711f6` (CR-001, "supervisor input in its own file") moved the supervisor's input type to `general-process-run-supervisor-input.ts:21`. The string is in the supervisor at `3ef5e33eec` and `9dd599dfe3`, and absent at `fddcff0f13`, `1eb5ac6723` (the pre-merge ticket head) and `7c1117e209`. The base changed neither file. The ticket head therefore fails this test without the merge.
- Why earlier stages did not see it: IMP-02 (full unit suite) ran at `9dd599dfe3`, before CR-001. IMP-09's CR-001 recheck ran the supervisor tests, standalone-host tests and `tracked-imports.test.ts`, not this architecture test. API-02 reused IMP-02 on the reasoning that only the supervisor input move happened since. But architecture tests read source files, so a file move is exactly what they exercise.
- Classification: `Local Fix` (code/test, introduced by this ticket). Recipient: implementation engineer.
- Suggested fix (the implementer decides): point the assertion at the file that now owns the type (`general-process-run-supervisor-input.ts`), keeping the supervisor's `not.toMatch(/AppConfig|…/)` check on both files. Then rerun the full server unit suite, not only this file.
- Proposed check for the stage that let it through (project-documents.md, "When a later stage catches a problem"): TESTING.md "Rerun by impact" step 3 could say that a moved or renamed source file marks the architecture tests (`tests/architecture/`) Rerun, because they read source text. For the implementation/API-E2E owners to adopt with the fix.

## Verification

- Evidence judged: `Sufficient` for the change's behavior. Verification is not final until the integrated state passes the server unit suite after the fix.
- Evidence relied on: execution report API-REV-002 (final confidence 95%, every category ≥ 95%, every critical AC directly proven) and the CRR-004 test-code review. I opened the files below and checked the named lines.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-007, AC-008, AC-011 | API-05 → `evidence/implementation/IMP-08-live-dsh-e2e.log` | Turn with `"tools":["run_bash","read"]` and `hi from dsh`; skill turn `SKILLCODE-…` with the unconfigured skill `NOT-AVAILABLE`; `list_available_agent_runtimes` called; `TURN1 {"usageCalls":3,"relayCalls":3}`; `Tests  5 passed (5)` | Proven |
| AC-002, AC-003 | IMP-08 | Escalation turn "first attempt was denied… escalated retry succeeded", rejection turn `DENIED`; `"stopLatencyMs":119` | Proven |
| AC-004 | IMP-08; API-20 `API-20-22-collaboration-live-rerun-api20-api22.log` | "after a restart" turn answers `MARK-7528a90e`; `TEAM_RESTORE` same session IDs before/after, reply `PING-TO-PONG-8a5530ac` | Proven |
| AC-005 | IMP-08; API-08 | `DSH_LIVE MODELS ["deepseek-v4-flash","deepseek-v4-pro","deepseek-flash"]`; `set_config_option` by unit (API-02) | Proven |
| AC-006 | IMP-08; test source `deepseek-harness-live.e2e.test.ts:273` | Rule token `PELICAN-…` followed after create, reopen and restore; instructions carry a literal `{probe}` | Proven for producible instructions; the `{{name}}` precondition cannot be produced (shared composer refuses it). Requirement-basis note for the Solution Designer |
| AC-009, QR-001 | API-10/11 `API-10-16-scripted-provider.log`; API-KEYSCAN; IMP-08 `KEY_SCAN` | `NO_KEY` → `RELAY_KEY_NOT_SET: … Save it in Settings → API Keys.`; `KEY_REMOVED_TURN` ERROR with the relay's text; `RESTORE_NO_KEY` refused; key scan `"hits":[]` | Proven. "Key removed later" was driven through the vault service because no product surface removes a built-in key (note for the Solution Designer) |
| AC-010 | API-12/13 same log | Compaction calls `"compaction":true`, statuses `compacting`/`compacted`; refused → `["failed","DeepSeek did not complete the compaction call (HTTP 400)."]`, turns completed | Proven |
| AC-012 | API-14/15 same log | `KEEPALIVE` `TURN_COMPLETED` after 15160 ms under a 6 s idle timeout; `STALL` `ACP_TURN_IDLE_TIMEOUT` at 6054 ms | Proven |
| AC-013 | API-30 `API-30-state-{a,b,c}-row.json`, `API-30-state-b-installed-key-not-set.png` | A `"signin":"API key set"`; B "API key not set" + "Save its API key in Settings → API Keys.", GraphQL `SIGNED_OUT`; C "Not installed" + install link; screenshot matches the other rows | Proven |
| AC-014 | API-22 rerun log | `SWITCH` segments dsh → antigravity, journals dsh/agy/dsh; dsh continues naming `created-by-dsh-f3b52647.txt` | Proven |
| AC-015 | IMP-08; test source `:403-419` | Test asserts the subagent/workflow/goal/plugin-manager tool IDs absent from the owned home and `~/.dsh` mtime unchanged; passed | Proven |
| AC-016, AC-017 | API-02/03/04 (IMP-02/03/04/09) | Grok and proxy suites pass; DEL-02 on the integrated state passes all of them | Proven |
| DEC-020 | API-25 `API-25-standalone-host-r2.log` | `"launch":{"started":false,"error":"PROVIDER_RELAY_UNAVAILABLE: …"}`, `"dshStarts":[]`, `"dshDataFiles":[]` | Proven |

- First-run failures in API-10…16 and API-20…22 were test bugs. The report discloses them, and the reruns pass with the cited lines.
- More evidence requested: `None` (the blocker is a code fix, not missing evidence).
- User check needed: `No`. Signed x64/notarized builds can be proven only on the release runner; no release is requested.
- Re-verification after later re-integration: pending the fix.

## Release Decision

- Decision: `No release` (finalize only; a release is available on request).
- Decided by: the release guide's default (RELEASE.md "Release Decision": no release when the user does not ask). No release was requested.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `TESTING.md`, `deepseek_harness_runtime.md`, `agent_execution.md`, `agent_team_execution.md`, `agent_tools_mcp_server.md`, `prompt_engineering.md`, `token_usage.md`, `agent_memory.md`, `run_history.md`, `llm_management.md`, `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md`

## Ticket State Transition

- Ticket moved to `tickets/done/<ticket-name>`: `No` (blocked before verification completed)

## Version / Tag / Release Commit

Not applicable (no release).

## Repository Finalization

- Bootstrap context source: the handoff (`codex/deepseek-dsh-runtime-investigation`, base `origin/personal`) and RELEASE.md Finalization Target
- Ticket branch: `codex/deepseek-dsh-runtime-investigation`; local commits only, nothing pushed
- Repository finalization status: `Blocked`
- Blocker: DEL-02

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`

## Post-Finalization Cleanup

- Not started (blocked).

## Escalation / Reroute

- Classification: `Local Fix`
- Recommended recipient: implementation engineer (`/software_engineering_team/implementation_engineer`)
- Why final handoff could not complete: the integrated ticket branch fails `tests/architecture/agent-provider-composition-boundaries.test.ts:700`. The ticket's own `cb132711f6` introduced it, and the server unit suite is kept green (TESTING.md "Green server suites").

## Release Notes Summary

- Release notes status: `Not required` (no release; RELEASE.md requires `release-notes.md` only for a stable release).

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: none needed. dsh data lives in its own `<appData>/runtimes/deepseek-harness/`, and no migration was added.
- Delivery action required: `None`

## Rollback Criteria

Revert the merge on `personal` (RELEASE.md Rollback). No app-data migration, so nothing to roll back in data.

## Final Status

- Verification complete: `No` (pending the fix and rerun)
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `Not required`
- Applicable safe cleanup complete or not required: `No`
- Unresolved blocker: DEL-02 Local Fix (implementation engineer)
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
