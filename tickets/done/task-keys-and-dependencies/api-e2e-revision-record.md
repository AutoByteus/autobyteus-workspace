# API/E2E Revision Record — task-keys-and-dependencies

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer CRR-002 Pass, round 1 | SR-001–SR-003, ARCH-REV-003, IR-003, CRR-002 | N/A | Pass / 95.6% |
| API-REV-002 | Code reviewer CRR-004 Pass after DR-001 → IR-004 (merge of `origin/personal@66429d6f31`), round 2 | IR-004, CRR-004, DR-001 | Pass / 95.6% | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: server, runtime, browser, desktop and real-model validation

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002), API/E2E round 1
- Triggering finding or case IDs: open coverage from the implementation handoff (AC-021, agent tool journeys, AC-025, AC-026, gated suites)
- Related revision IDs: SR-003, ARCH-REV-003, IR-003, CRR-002
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added TKD-API-001 (`project-task-boundaries.e2e.test.ts`), TKD-AGY-001 (`task-existing-copy-assignment.e2e.test.ts`) and PT-E2E-017 (`projects-feature-probe.mjs`).
  - Updated outdated assertions to the approved behavior in `ad-hoc-task-delegation.e2e.test.ts`, `collaboration-prompt-wording.e2e.test.ts` (CPW-R3), `projects-feature-probe.mjs` (PT-E2E-006/007/009), `project-manager-ux-probe.mjs` (PMU-015) and `project-manager-ux-task-locator-cases.mjs` (PMU-020/021/024/025).
- Cases added, changed, removed, or rechecked: as above; temporary DSK-001..006 and LIVE-001
- Commands, environment, fixture, or broader-validation delta:
  - Isolated desktop: the installed 1.5.5-beta.1 wrote the upgrade data; the worktree packaged build upgraded it.
  - Scripted AGY runtime for the gated suites and probes.
  - LIVE-001 used the Claude Agent SDK with Claude Haiku 5.5 at the user's instruction (no ChatGPT/Codex).
  - Timing suites that failed under host load were compared base vs. ticket in a temporary base worktree: equal results.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test-case ledger (all sections)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.6%
- New or remaining failure IDs: none in scope. Follow-ups: FU-API-001 (stale RightSideTabs spec), FU-API-002 (team-run v1 upgrade E2E), FU-API-003 (PMU-008 stale step).
- Recommended owner: Code Reviewer, for proportional review of the changed durable test code
- Remaining risks, blocked evidence, or untested scope:
  - Migration I/O fault not reproduced on the desktop (MP-001).
  - The real model was checked on one model and one prompt.
  - OBS-001–004 (non-blocking).

### API-REV-002 — Integrated state revalidation (rerun by impact)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-004, round 3), API/E2E round 2
- Triggering finding or case IDs: DR-001 (Local Fix → IR-004: two merges, the contract conflict resolution, baseline fixes `fa49138794`, `9eeb58fb9d`, `361eea070d`)
- Related revision IDs: IR-004, CRR-004, DR-001
- Why recorded: the integrated state changed shared foundations (contract packages, `autobyteus-ts`, E2E harness and fixtures, the agent-tool contract), so every case was rerun (TESTING.md "Rerun by impact").
- Coverage decisions or durable test paths changed: none by API/E2E. Validated the implementation's baseline fixes `fa49138794` (ledger rows derived from the migrations that ran; check passes when reached) and `361eea070d` (probe layout wait; PT-E2E-001..017 Pass).
- Cases added, changed, removed, or rechecked:
  - all round-1 cases rerun at `c95e0138e8`;
  - LIVE-001 extended with `create_project` / `update_project` (the model renames the Project; the next Task keeps the `live-keys` prefix);
  - new cause analyses for `task-copy-idle-lifetime` (base vs ticket series) and `team-run-v1-production-upgrade` (temporary reverted probe).
- Commands, environment, fixture, or broader-validation delta:
  - packaged app 1.5.5-beta.2 rebuilt from HEAD;
  - desktop upgrade again from data the installed 1.5.5-beta.1 wrote;
  - a temporary base worktree at `66429d6f31` for the idle-lifetime comparison (removed).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| FU-API-001 `RightSideTabs.workspaceTarget` | Out of scope, cause `a3f65bfe6e` | Fixed on base `66c61595d2`; passes at HEAD | `evidence/logs/r2-web-unit.log` |
| FU-API-002 `team-run-v1-production-upgrade` | Out of scope | Ledger part fixed (`fa49138794`, verified); 3/4 remain, cause confirmed: `20260901_agent_org_flat_team_families_v1` converts the released Team to an AgentOrg run | `evidence/logs/r2-server-e2e-team-run-v1-production-upgrade.log`, ledger R2-12 |
| FU-API-003 PMU-008 | Out of scope | Passes on the merged base | `evidence/browser/project-manager-ux-r2/` |

- Canonical artifacts and sections updated: execution report (meta, round-2 plan, causes, cleanup, result), ledger ("Round 2 (API-REV-002)"), this record, the coverage investigation (round-2 note)
- Prior result and confidence: Pass, 95.6%
- Current result and confidence: Pass, 95.6%
- New or remaining failure IDs: none in scope. Out of scope with cause: FU-API-002 (3/4), FU-API-004 (PMU-021 reload / WebSocket console error), FU-API-005 (`task-copy-idle-lifetime` timing).
- Recommended owner: Code Reviewer, for proportional review of `fa49138794` and `361eea070d`
- Remaining risks: as in round 1. Additionally, `task-copy-idle-lifetime` stays intermittent under load until its owners fix the timers and probe limits.
