# Docs Sync Report

## Scope

- Ticket: background-task-shell-command
- Trigger: API/E2E Pass (API-REV-001, round 1, 96%), direct route. Classification `task_size=Medium`, `architectural_risk=Low`, unchanged.
- Bootstrap base reference: origin/personal @ 4dee901d6163ca7053916fa1edc295afbfd7a6da
- Integrated base reference used for docs sync: origin/personal @ ac479a26034c77259b7d3a5e9f846d38d6fbd642, merged into the ticket branch as f8e3eca53
- Post-integration verification reference: release-deployment-report.md, section "Initial Delivery Integration Refresh"

## Why Docs Were Updated

- Summary: the implementation commit already documented the `command` field, the Claude tool_use correlation, the AGY mapping and the web row rendering. API/E2E then found a second Claude frame order (UNK-001: auto-backgrounded foreground Bash) and proved that the command is kept on failed and stopped snapshots. The server module doc only described the explicit-background order. A live E2E suite also needed a TESTING.md entry.
- Why this should live in long-lived project docs: the CLI frames are undocumented (RSK-001). Future maintainers need the observed orders, the retention rule and the tool coverage boundary to diagnose regressions on CLI upgrades.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_execution.md | Claude registry and `BACKGROUND_TASK_UPDATED` contract | Updated | Implementation text kept. Delivery added the auto-background order, the retention rule and the Monitor note |
| autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md | AGY `command` mapping | No change | Already accurate (`command` and description both from `CommandLine`, null when absent), matching live AGY evidence |
| autobyteus-web/docs/agent_execution_architecture.md | Row rendering of the command | No change | Already accurate: monospace, truncated, tooltip, `aria-expanded` toggle, hidden when it equals the title, filled in by a later snapshot. Matches the desktop journey (DJ-1) and the browser probe |
| TESTING.md | Live validation commands | Updated | Added the Claude background-task live E2E row |
| autobyteus-agent-presentation-contracts (src + tracked dist) | Contract doc comments | No change | Updated and rebuilt in the implementation commit |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_execution.md | Runtime behavior | The two observed frame orders: explicit `run_in_background` (first snapshot usually `command: null`, filled in at once) and CLI auto-background (`task_started` fg → `background_tasks_changed` → `task_updated`, command present from the first snapshot, CLI 2.1.283). The command is kept on completed/failed/stopped snapshots. No tool-name filtering; only `Bash` reaches it today because `Monitor` is not enabled | UNK-001 and the lifecycle retention were proven only during API/E2E |
| TESTING.md | Validation command | New row "Claude background-task live E2E" with the `RUN_CLAUDE_E2E=1` command for both files. The test sets the auto-background env for that case itself | Durable live coverage guards RSK-001 on every installed CLI |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude background-task frame orders | Two orders exist, and the registry handles both via the in-flight tool_use map | api-e2e-execution-coverage-report.md (TP-1, AE-U1, AE-L5), api-e2e-evidence/probe-auto-bg-env.log | agent_execution.md |
| Command retention | The command persists through terminal snapshots, including Stop and crash | api-e2e-execution-coverage-report.md (lifecycle cases), stop-probe.jsonl | agent_execution.md |
| Monitor reachability | The registry does not filter by tool, but `Monitor` is not in `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS` | API/E2E observation; claude-sdk-client.ts:92-94 | agent_execution.md |
| Live validation entry point | How to rerun the live background-task suites | api-e2e-execution-coverage-report.md | TESTING.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The `BACKGROUND_TASK_UPDATED` snapshot without `command` | Required nullable `command` (clean cut, no legacy variant) | agent_execution.md, agent_execution_architecture.md, contracts |
| The statement that the first snapshot always lacks the command | The order-dependent description | agent_execution.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold
- Notes: docs edits remain uncommitted in the worktree together with the API/E2E durable tests and the ticket folder until finalization.
