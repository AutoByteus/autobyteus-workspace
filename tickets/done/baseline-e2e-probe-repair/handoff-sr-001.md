# Handoff — `baseline-e2e-probe-repair` SR-001: Architecture Design Complete

- From: Solution Designer (`/software_engineering_team/solution_designer`), 2026-10-17
- To: Implementation Engineer (`/software_engineering_team/implementation_engineer`), direct route
- Classification: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low`
- Route applied: handoff rule "Small or Medium and Low → implementation_engineer". Architecture review skipped by rule (not design).

## Original Request

Project Task `6834441c` from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): fix 8 server e2e files (27 tests) and 3 web probes that fail identically on the base (reported by the collaboration-model-contract ticket). For each, find the cause and fix the test; report product defects before fixing; update or drop suites that test removed features with a stated reason; commit each fix separately as a baseline test fix (TESTING.md Rule 9); merge; no release unless the user asks.

## Goal And Result Of This Round

All 11 items reproduced on the current base `origin/personal` `db00ba16a9`, and every cause is in test code (stale API calls, payloads, fixtures or harnesses, or expectations stopping before the current end of the migration chain). **No product defect found.** Two expectation groups test removed or approved-refused behavior and are dropped with stated reasons (nested Team definitions; three-level nested history conversion).

| Item | Cause | Fix (design-spec Final File Responsibility Mapping) |
| --- | --- | --- |
| hierarchical-team-run-config-graphql (7) | `refType`/nested Teams removed | rename to `team-run-config-graphql`, flat Team rework |
| agent-command-correlated-status (1) | `AGENT_STATUS` gained `recoverableBlock` | update expectation |
| standalone-error-termination-lifecycle (2) | `prepareNewAgentRun` removed; cascade on singleton | `beginActivation(...).prepare()`; cleanup on failure |
| team-run-v1-production-upgrade (3) | asserts V2 intermediate; hard-coded ledger count | assert AgentOrg end state; ledger by migration ID |
| memory-sync-multiprocess (1) | seeds nested current Team | flat Team package |
| nested-team-history-restart (2) | three-level fixture refused (approved); flat migration is startup-only | one-level supported case, retry+restart case, refusal case |
| recent-run-projection-graphql (9) | seeded runs unadmitted/incomplete | complete packages + `admitCurrent` |
| configured-skill-on-demand-loading (2) | private `createBackend` signature | `beginPreparation(...).prepare()` |
| probe existing-run-model-config | missing GraphQL ops | add operations |
| probe interrupt-result-presentation | retired stream shapes, unserved WS, no script | current shapes, serve WS, add script |
| probe run-settings-live R03 | client readiness now disables Run first | server-only rejection or launch-request injection |

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`
- Branch: `codex/baseline-e2e-probe-repair`; base `origin/personal` `db00ba16a9`; finalization target `origin/personal` (merge, no release).
- Already done in the worktree: `pnpm install`, server `prebuild` + `build`, `nuxt prepare`. Rebuild the server only if you change server source (you should not).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair/`

## Authoritative Documents

- Requirements (Approved, SR-001): `…/requirements-doc.md`
- Investigation notes: `…/investigation-notes.md`
- Design spec (Ready): `…/design-spec.md`
- Solution revision record: `…/solution-revision-record.md`
- Base evidence: `…/evidence/base-db00ba16a9-eight-suites.plain.log`, `…/evidence/probes-base/`
- Design review artifacts: `N/A — not applicable` (direct route).

## Approval Basis

Requirements approved by the Solution Designer within the Task's direction (all items test-only; no `Needs user` decision); user informed in the Solution Designer conversation, 2026-10-17.

## Constraints

- Test-only (REQ-010): no production file changes; never weaken an assertion that still describes supported behavior.
- REQ-011: if a repaired assertion shows lost/wrong product data (watch RSK-001: the AgentOrg end state of the released cohort in UC-004/UC-006), stop that item and report it to the Solution Designer as a possible product defect.
- REQ-012: one commit per item, labelled a baseline fix naming the test and cause.
- TESTING.md: clean environments (`env -i PATH HOME=<tmp> TMPDIR`); faithful released fixtures; probes supply every boundary, fresh `--output-dir`, check cleanup; never touch the user's app or `~/.autobyteus`; stage paths explicitly.
- R03 needs the real `HOME`/`USER`/`LOGNAME` for signed-in CLIs; it makes no inference. If the environment is unavailable, report it as not run.

## Open Risks / Uncertainties

- RSK-001, RSK-002, UNK-001 (investigation notes).
- Follow-ups recorded for later (design-spec Change Scope): FU-1 `codex-interrupted-compaction` same cause (Task 0c7efc37); FU-2 opaque `executeGraphql` errors; FU-3 optional unit case for the three-level refusal.

## Expected Output

Implementation commits on the branch, implementation handoff with per-item cause, fix, commands and results (each repaired file run twice in a clean env; probes once; server `test:unit` and `typecheck` as a no-production-change check), then your configured route.

## Route Record

- `get_handoff_rules` (2026-10-17): matched "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`. No other rule matched (not Large/High; no delivery receipt).
- Ticket documents committed on the branch: `476752deda` (amended commit; the doc commit itself is followed by this route note in a separate commit).
