# Solution Revision Record — mcp-run-session-cleanup

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task `autobyteus-193`, 2026-10-19 | F-1…F-4 | N/A | Requirements Approved; Design Ready | BEH-001..004, REQ-001..005, AC-001..008, DEC-001..005 | Architecture Design Complete; Small / Low |

## Revision Entries

### SR-001 — Baseline

- Trigger: Task `autobyteus-193` from `/project_task_manager` (follow-up 3 of the autobyteus-181 round 2).
- Findings:
  - F-1: instances of non-native runs are never closed;
  - F-2: native runs close only in their shutdown step;
  - F-3: a wake during a close can reuse the closing instance;
  - F-4: instances are per run and the gateway's are shared.
- Key evidence: every runtime keys instances by the AgentRun `runId`, and `release()` is the single removal path.
- Approval: Solution Designer within the direction; user informed 2026-10-19.
- Classification: `Small` / `Low`. Prerequisites: none.
- Next action: direct implementation.
