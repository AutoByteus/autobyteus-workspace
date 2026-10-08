# Docs Sync Report

## Scope

- Ticket: `idle-shutdown-background-tasks` (SR-003 hybrid)
- Trigger: post-API/E2E test-code review pass (CRR-004) from `/software_engineering_team/code_reviewer`
- Classification (preserved, not reclassified): `task_size=Medium`, `architectural_risk=High`; route: reviewed (ARCH-REV-002 → IR-003 → CRR-003 → API-REV-001 → CRR-004)
- Bootstrap base reference: `origin/personal` @ `3a2496c95`
- Integrated base reference used for docs sync: `origin/personal` @ `3a2496c95` (fetched 2026-10-08; base had not advanced: `git log 3a2496c95..origin/personal` is empty)
- Post-integration verification reference: focused unit smoke on checkpoint `d08b6c5e9`: 7 files and 152 tests passed (see `release-deployment-report.md`, Verification Checks)

## Why Docs Were Updated

- Summary: idle shutdown of delegated copies now skips a copy while its runtime reports a running background task (Claude `run_in_background`, AGY daemon step). There is no time limit. The grace period re-arms when the task ends. DONE, root stop and server stop are unchanged. The server module docs, the web Agent Teams doc and the agent-facing LLM collaboration contract all state this rule (REQ-005). TESTING.md lists the new gated E2Es.
- Why this should live in long-lived project docs: agents and operators rely on the background-wait rule. Without it, a long `run_in_background` task looks like it will be killed after 10 minutes, which was the original defect.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Owns "Delegated Child Lifecycle" / idle shutdown | Updated (c304485d9) | Quiet predicate includes `hasRunningBackgroundTasks()`, no time limit, re-arm through `onAgentBackgroundTaskEnded`, DONE/root stop unchanged |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Claude session / background-task registry | Updated (c304485d9) | Background task blocks idle shutdown |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | AGY background-task monitor | Updated (c304485d9) | `hasRunningTasks()`; the terminal snapshot re-arms the grace period |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` lifecycle text | Updated (c304485d9) | "but not while it has a running background task" |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Mirrors LLM collaboration contract | Updated (c304485d9) | Matches `agent-team-collaboration-llm-contract.ts` |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Agent-facing contract (REQ-005) | Updated (c304485d9) | Parity tests updated |
| `autobyteus-web/docs/agent_teams.md` | User-facing delegated child status | Updated (c304485d9) | One sentence |
| `TESTING.md` | Validation surfaces | Updated (API/E2E, checkpoint d08b6c5e9) | Delegated background-task live E2E row; scripted hybrid E2E section (about 3 minutes) |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Mentions idle shutdown of Org task copies | No change | Generic "idle shutdown after the grace period" remains true; lifecycle detail is linked from agent_team_execution |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Mixed task delegation E2E text | No change | Codex reports no background tasks; behavior unchanged |
| `autobyteus-web/docs/agent_orgs.md`, `agent_execution_architecture.md`, `settings.md` | Offline rows after idle shutdown | No change | Row/offline projection is unchanged |
| Server setting description (`server-settings-service.ts`, grace setting) | User-visible setting text | No change | "may stay quiet before it is shut down": a copy with a running background task is not quiet, so the text stays accurate |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| Seven docs/contract files above | Behavior rule | Background-task exception to idle shutdown | REQ-005 (implementation commit c304485d9) |
| `TESTING.md` | Validation surface | New gated E2E rows and section | API/E2E durable coverage |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (header comment) | Editorial (delivery) | "About 5 minutes" → "About 3 minutes" | Measured passing runs took 177.0 s and 176.9 s (`evidence/api-e2e/r2-e2e-idle-2/3.log`); now matches TESTING.md (CRR-004 nit) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Background-task-aware quiet predicate | `AgentRunBackend.hasRunningBackgroundTasks()` is the per-runtime signal. Claude and AGY report tasks; Codex, AutoByteus and ACP report none. There is no time limit. | design-spec.md, requirements-doc.md (DEC-005/006) | agent_team_execution.md |
| Re-arm on task end | AGY starts no turn after a daemon exit, so the root re-arms the grace period on the terminal `BACKGROUND_TASK_UPDATED` | design-spec.md, ASM-002 | agent_team_execution.md, antigravity_cli_runtime.md |
| Stop authorities unchanged | DONE, root stop and server stop do not consult background tasks | requirements-doc.md REQ-004 | agent_team_execution.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| SR-002 "remove idle shutdown" branch commits (28afa0884, bf5889d03) | Reverted outside `tickets/` in a1dc499e4, then the hybrid in c304485d9 | Net diff `git diff 3a2496c95 HEAD -- . ':!tickets'` contains only the hybrid. The SR-002 history stays in the ticket's solution-revision-record.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, user-verification hold
- Notes: none
