# Implementation Revision Record: autobyteus-273

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-solution-designer.md`, initial | N/A | Initial Baseline | SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass; ready for direct API/E2E |

## Revision Entries

### IR-001 — Claude runtime one-hour prompt cache default, card and split cache-write rows

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-prompt-cache-ttl/tickets/in-progress/claude-prompt-cache-ttl/handoff-solution-designer.md`, initial implementation.
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: implemented on `codex/claude-prompt-cache-ttl` at `abac5953ba` (feature) + `08a012f9d6` (dead-text cleanup) + `cece5ce05b` (baseline fix of an unrelated timing test, TESTING.md rule 9); handoff evidence commit follows.
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A (not selected)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved SR-002 package.
- Approved behavior or requirement IDs affected: BEH-001/REQ-001, BEH-002/REQ-002, BEH-003/REQ-003, BEH-004/REQ-004, REQ-005, BEH-006/REQ-006.
- Implementation delta:
  - New `runtime-management/claude/claude-prompt-cache-setting.ts` (key, values, absent = on, `ENABLE_PROMPT_CACHING_1H=1` unless set).
  - `client/claude-sdk-auth-environment.ts` renamed to `claude-sdk-spawn-environment.ts`; auth policy moved into `applyClaudeSdkAuthPolicy`; builder has one exit and applies the cache default in every mode.
  - Predefined setting registered with `allowedValues ["true","false"]`, `trimBeforePersist`.
  - New `ClaudeRuntimeCard.vue` after `CodexFullAccessCard` in the Basics panel; en/zh-CN texts.
  - `TokenUsageCostBreakdown.vue`: 5m/1h cache-write rows; unsplit "Cache writes" row for writes outside the split, priced as the cache-write cost minus the split costs.
  - Removed two unreferenced Codex card texts (`save`, `unsavedChanges`) from the touched localization files.
  - Baseline fix: `tests/unit/projects/project-task-index-status.test.ts` burst window 40 ms -> 400 ms (failed under full-suite load; cause in the handoff Checks Run).
  - Docs: `llm_management.md`, `token_usage.md`, web `settings.md`, web `agent_execution_architecture.md`.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: IMP-01, IMP-02, IMP-04, IMP-05, IMP-07 Pass; IMP-06 Pass on run 2 after the baseline fix (IMP-03 unused). See handoff Checks Run.
- Next recipient or routing: direct API/E2E (Small/Low), per `get_handoff_rules`.
- Remaining limitations or risks: the API-billed two-turn proof and the rendered Token Statistics split rows on real usage are left to API/E2E; FU-004 recorded.
