# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md`, CRR-001 round 1 (Pass) | SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: split validated in real apps of both versions; three suite defects fixed; TESTING.md failure rule corrected

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-001 round 1
- Triggering finding or case IDs: none (pass); open items handed over: AC-006, the AC-005 real-app side, the AGY-gated E2E files, the web probes, and optionally AC-003 beyond unit level
- Related revision IDs: SR-001, SR-002, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` (`0205b9ed79`)
  - `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` (`50f228811f`)
  - `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (`dec87a3915`)
  - `TESTING.md` (`1c7eb70151`, `7af116e8de`), user-directed
- Cases added, changed, removed, or rechecked:
  - Repository: UNIT-CHG, UNIT-ALL, TYPECHECK, E2E projects (gated), WEB-PMU, WEB-TCT.
  - Temporary: AC5 module probes (release, worktree, packaged); APP-*, REAL-* and REL-* real-app journeys; AC4-OLD-TOOL-XVER.
- Commands, environment, fixture, or broader-validation delta:
  - Isolated instances of the worktree's packaged build and of the downloaded v1.5.5-beta.2 (sha512 verified).
  - LOCAL_PATH test package; scripted AGY set through `updateServerSetting`.
  - Claude Agent SDK Haiku 5.5 for real inference (user direction).
- User directions during the round:
  1. Diagnose and fix every failure on the worktree, without base-branch comparison, and correct TESTING.md.
  2. Use Claude Agent SDK Haiku 5.5 for real-model testing.

#### Prior Failure Resolution

None. This is the first round. Failures found within this round, with their resolution:

| Case / Failure | Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| `task-closure-root-visibility` 2/3 under load | test race (wait weaker than assertion) | baseline fix `0205b9ed79`; full folder 17/17 | tcrv-*.log, server-e2e-projects-agy-2.log |
| PMU-008 | stale probe fixture after `938933d8e2` | baseline fix `50f228811f` | probe-pmu-008-fixed/, probe-pmu-5/ |
| PMU-021 (full runs) | unsettled / stale center baseline | baseline fix `dec87a3915` | probe-pmu-2..5/ |
| `agent-status-websocket` integration 2/7 (former TESTING.md exception) | product defect outside scope (`AGENT_INPUT_STATE` flushes the egress cadence) | reported to `/project_task_manager`, tracked as PB-001; exception note removed | followup-agent-input-state-flushes-content-cadence.md |

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (new), test-case ledger (new), this record (new)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope; PB-001 (product, out of scope)
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - No AutoByteus-native agent was run in the app; it is covered by unit parity and the packaged-server registry probe.
  - The Codex runtime was not run live (no ChatGPT quota).
