# Docs Sync Report

## Scope

- Ticket: `shell-command-time-limits-483` (Project Task `autobyteus-483`), `task_size: Medium`, `architectural_risk: Low`, route: direct low-risk (no independent architecture or code review; test-code review `Not Required`).
- Trigger: API/E2E `API-REV-001` Pass (final confidence 95.1%), handoff to delivery on SR-001 / IR-001.
- Bootstrap base reference: `origin/personal` @ `4cbf9e7881`.
- Integrated base reference used for docs sync: `origin/personal` @ `895cf3992d` (autobyteus-448 part 1 and its delivery record, 18 commits), merged into the ticket branch as `f76275a530` before any delivery edit. The only conflict was `GLOSSARY.md` (both sides added an entry: this ticket's "End reason" and 448's "Restart reminder" and "Busy run"); both kept.
- Post-integration verification reference: ticket branch `f76275a530` (docs edits on top of it): `pnpm -C autobyteus-server-ts typecheck` PASS (production 0 errors; test files 1012 = baseline), `pnpm -C autobyteus-web typecheck` PASS (production 0; test files 87 = baseline), and 56 server test files / 629 tests PASS over the code both tickets touch (see `release-deployment-report.md`, Initial Delivery Integration Refresh).

## Why Docs Were Updated

- Summary: Claude runs now start with two-hour shell limits; every ended background task carries an end reason and exit code that the desktop panel and the phone show as one line; the desktop panel has a no-run state; every runtime's system prompt ends with a Long-Running Commands section. Five long-lived docs described the old behavior (no shell time variables set, a four-field task payload, native `exit code N` summaries, AGY stops without a reason, no such prompt section, the phone's exit-code-only line).
- Why this should live in long-lived project docs: the payload fields, the producer mapping, the limits per runtime and the prompt section are contracts that the next change to a runtime backend, the panel or the prompt must respect; the ticket folder is archived.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules (rule 9 clean cut, no compatibility paths; rule 12 build steps) | No change | The ticket follows rule 9 (new fields always present, null when unknown). No new design rule and no design case came out of the ticket. |
| `TESTING.md` | Gated suites, rerun by impact, fresh-start build, test vault | No change | The new gated suite (`long-command-time-limits-live.e2e.test.ts`, gate `RUN_LONG_COMMAND_LIMITS_E2E`) is found through its file header, as TESTING.md says gated suites are. The fresh-start build and the phone probe followed the existing rules. The ticket's reports record no command that no longer works. |
| `RELEASE.md` | Finalization target, Secret Gate, checks before tagging | No change | Followed as written; no deviation (see `release-deployment-report.md`). |
| `GLOSSARY.md` | New term "End reason" (added by implementation) | No change | Confirmed against the final code; the merge keeps 448's entries beside it. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Named by the implementation handoff: Claude process and shell limits; Claude registry ends; `BACKGROUND_TASK_UPDATED` field list; native Publication; view fields | Updated | See Docs Updated. |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Named by the implementation handoff: AGY monitor exit code and `stopAll` | Updated | See Docs Updated. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Owner of the Carpenter prompt sections | Updated | The Long-Running Commands section was not listed anywhere. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Describes the Claude spawn environment composition (auth policy, one-hour cache) | Updated | One sentence: the composition now also sets the two shell limits. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical web architecture: `BACKGROUND_TASK_UPDATED` row and the live background tasks section | Updated | End line, no-run state, fields. |
| `autobyteus-web/docs/remote_access.md` | Describes the phone's Activity background-task rows | Updated | The ended-row line was "for example exit code 1" only. |
| `autobyteus-web/docs/settings.md` | Holds a stale duplicate of the architecture doc's Level 1-3 sections, including the panel bullets | Needs follow-up | `FU-005`. The duplicate was already wrong before this ticket (autobyteus-473); the canonical doc is synced. |
| `autobyteus-ts/docs/terminal_tools.md` | Native `run_bash` background tasks and their ends | No change | Describes the `autobyteus-ts` tool and manager; this ticket changed only the server's reporter that reads the manager. |
| `autobyteus-server-ts/docs/modules/restart_resume.md`, `agent_team_execution.md` | Arrived with the autobyteus-448 merge; they speak of background tasks and the restart reminder | No change | They do not describe the payload, limits or end lines. |
| Package `AGENTS.md` / READMEs | Package instructions that mention the panel, probe or Claude environment | No change | None of them names the changed behavior (searched `docs`, `README`, `AGENTS` files for `BACKGROUND_TASK_UPDATED`, `BASH_*_TIMEOUT_MS`, the panel's old texts). |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior correction | (1) The Claude process paragraph no longer says AutoByteus sets no timeout variables: it states the two-hour defaults, the four limits they set in Claude Code 2.1.325, that an explicit value (server environment, Claude settings `env`) is kept, that other runtimes' limits are unchanged and verified, and the new gated live suite. (2) Claude registry paragraph: `run_ended` on process close, and how the end reason and exit code are read from the notification (`claude-background-task-end.ts`). (3) `BACKGROUND_TASK_UPDATED` field list now has `end_reason` and `exit_code` (always present, null when unknown) with the three reasons. (4) Native Publication: exit code is a field, no `exit code N` summary, `markRunEnding()` and `run_ended`. (5) The view's `AgentBackgroundTask` fields. | The doc described the old payload and the old native summary (implementation handoff). |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior correction | The monitor keeps the exit code, `stopAll` marks `run_ended` (also after a user Stop of one turn), and AGY runs no clock on a long command. | Old paragraph said tasks became plain `stopped`. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | New section | A `Long-Running Commands` row in the section-ownership table, the section order, a `Long-Running Commands Section` subsection (habit, per-runtime text and mechanism table, required composer input), the source list and the native composition order. | The prompt gained a section for every runtime. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Behavior correction | The Claude spawn environment composition also applies the two-hour shell limits. | Same function, new step. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior correction | `BACKGROUND_TASK_UPDATED` row names the new fields; the panel bullets describe the no-run state and the one end line (`describeBackgroundTaskEnd`: reason, else exit code, else summary) with the three reason texts. | The panel changed. |
| `autobyteus-web/docs/remote_access.md` | Behavior correction | The phone's ended-task line lists the four lines it can show. | The phone changed. |
| `tickets/in-progress/shell-command-time-limits-483/follow-ups.md` | Follow-ups | `FU-004` (Grok completion sentence unverified), `FU-005` (stale duplicate in `settings.md`). | Problems outside this ticket (ticket-scope.md). |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude shell limits | Four Claude Code limits derive from two variables; AutoByteus fills only a missing one; no AutoByteus setting; per-call `timeout` still shortens a command; the wording of the stop is read in one file. | `requirements-doc.md` (REQ-001/002, DEC-001/002), `investigation-notes.md`, `design-spec.md`, ASM-001 proven by `evidence/API-01-env/` | `agent_execution.md` |
| Other runtimes' limits | None stops a long command on a clock; verified live per runtime and re-checkable with the gated suite after a CLI upgrade. | `requirements-doc.md` (REQ-008, DEC-004), execution report (API-01) | `agent_execution.md`, `antigravity_cli_runtime.md` |
| End reason and exit code | Runtime-neutral, always present, null when unknown; producers per runtime; the views never read summary text for a reason. | `design-spec.md`, `implementation-handoff.md` | `agent_execution.md`, `agent_execution_architecture.md`, `remote_access.md` |
| Long-job habit | One prompt section per runtime in that runtime's terms; required composer input; change the text when a runtime's mechanism or limit changes. | `requirements-doc.md` (REQ-007, DEC-005) | `prompt_engineering.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "AutoByteus sets no background-task or Bash timeout environment variables" (Claude CLI defaults apply) | Two-hour defaults for both variables, explicit values kept | `agent_execution.md` (Claude paragraph) |
| Native task summary `exit code N` | `exitCode` field; summary stays for signals and errors | `agent_execution.md` (Native background task notices) |
| Panel paragraph `background-task-exit` and the phone's exit-code-only branch | One end line from the end reason or exit code | `agent_execution_architecture.md`, `remote_access.md` |
| Panel "Checking…" with no run selected | The `no-run` state | `agent_execution_architecture.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not used. Docs impact: `Updated` (six long-lived docs). `DESIGN.md`, `TESTING.md`, `RELEASE.md` reviewed: no change, reasons in the table above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence (done, see `release-deployment-report.md`), archive, finalization onto `origin/personal`, no release.
- Notes: the Grok section's wording about completion notices is an unverified sentence, recorded as `FU-004` for the Solution Designer; it does not make any doc untruthful (the docs state the section's text and the live finding as observed).
