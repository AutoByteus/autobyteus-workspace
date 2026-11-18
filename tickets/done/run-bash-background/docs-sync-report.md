# Docs Sync Report

## Scope

- Ticket: `run-bash-background` (Project Task `autobyteus-338`); `task_size: Large`, `architectural_risk: High`, route: independent architecture review → implementation → code review (CRR-002 Pass) → API/E2E (API-REV-001 Pass) → test-code review (CRR-003 Pass) → delivery.
- Trigger: code reviewer handoff "ready for delivery" after CRR-003, 2026-11-10.
- Bootstrap base reference: `origin/personal` @ `374e35a60e`.
- Integrated base reference used for docs sync: `origin/personal` @ `c8f303af70` (105 commits), merged into the ticket branch as `052be30619`.
- Post-integration verification reference: `evidence/DEL-post-integration/` (DEL-01 server typecheck, DEL-02 targeted server suites, DEL-03 background-task transport E2E), recorded in `release-deployment-report.md`.

## Why Docs Were Updated

- Summary: the change already updated the terminal tool doc, six server module docs and the glossary (implementation commits). Delivery confirmed them against the integrated code and fixed two long-lived docs that still described the background-task stream as Claude/Antigravity only, which this change makes incomplete (native AutoByteus runs now publish `BACKGROUND_TASK_UPDATED` and fill the same store and panel).
- Why this should live in long-lived project docs: which runtimes feed the Background Tasks panel and the idle-shutdown check, and how `run_bash` background commands start, report and stop, is standing behavior every later runtime or panel change builds on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/terminal_tools.md` | owner doc of `run_bash`, its `run_in_background` option, result fields, output files, the wrapper, stop with `kill <pid>` | No change (updated by implementation) | checked against `tools/run-bash.ts`, `types.ts`, `background-output-log.ts`: parameter, `backgroundTasksStarted`/`backgroundTasksEnded`, `autobyteus-background-tasks/<agent id>/` all match |
| `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md` | names `BackgroundProcessManager` | No change (updated by implementation) | `background-process-manager.ts` still exists and owns the process groups |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | native background tasks, notices, run-end stop | No change (updated by implementation) | consistent with merged base (autobyteus-448 reference kept) |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | idle-shutdown quiet check; also changed by the base | No change (updated by implementation; merged cleanly) | native `run_bash` background command or `&` job now counts; "Codex and ACP report none" |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | retired tool names; also changed by the base | No change (updated by implementation; merged cleanly) | retired names removed from the list |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | journal rendering of retired tools | No change (updated by implementation) | retired names kept only as historical rows (AC-011) |
| `autobyteus-server-ts/docs/modules/tool_list_updates.md`, `skill_update_notices.md` | shared platform notice sources | No change (updated by implementation) | — |
| `GLOSSARY.md` | Background task, Background task notice, Background process; also changed by the base | No change (updated by implementation; merged cleanly) | — |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | "Background inspection is not a stream lifecycle" named only Claude/Antigravity as stream users | Updated | — |
| `autobyteus-web/docs/agent_execution_architecture.md` | `agentBackgroundTaskStore` listed only Claude and Antigravity tasks | Updated | — |
| `autobyteus-web/docs/settings.md` | repeats the same store paragraph | Needs follow-up | the file is a stale duplicate of `agent_execution_architecture.md`, not a settings doc: `follow-ups.md` FU-001 |
| `autobyteus-web/docs/terminal.md`, `agent_teams.md` | Background Tasks panel, idle shutdown with a running task | No change | runtime-neutral wording, still accurate |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | background-command view | No change | Codex-only; unaffected |
| `DESIGN.md` | project design rules | No change | no rule or component description this change alters; the change follows rules 10/11 as the design spec records |
| `TESTING.md` | testing guideline | No change | the two new suites follow the existing gated-suite pattern (`RUN_<GATE>=1`, test vault for the live one); no ticket report recorded a discrepancy |
| `RELEASE.md` | release guide | No change | finalization followed it without deviation |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | correction | Claude, Antigravity and AutoByteus (native `run_bash` background commands and `&` jobs) use the background-task stream (`BACKGROUND_TASK_UPDATED`) and its store | native runs publish it since this change (BGT-01 view `AgentBackgroundTaskEventStream`, API-15 panel) |
| `autobyteus-web/docs/agent_execution_architecture.md` | correction | the store's task kinds now include AutoByteus `run_bash` background commands and `&` jobs | same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| `run_bash` background commands | one command wrapper for every call; `run_in_background` and `&` jobs become background tasks; output file; end reported once (in a `run_bash` result or one batched notice); stop with `kill <pid>`; run end stops them | `design-spec.md`, `implementation-handoff.md` | `autobyteus-ts/docs/terminal_tools.md` (implementation) |
| native background task notices and panel | `BACKGROUND_TASK_UPDATED` from native runs; notices wake an idle run; idle-shutdown quiet check counts native tasks | `design-spec.md` | server `agent_execution.md`, `agent_team_execution.md`; web `agent_execution_architecture.md`; streaming protocol design doc |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| tools `start_background_process`, `get_background_processes`, `get_process_output`, `stop_background_process` | `run_bash` with `run_in_background` (start), its output file read with `tail` (output), `kill <pid>` (stop), notices and the panel (list/status) | `terminal_tools.md`, `agent_tools.md`; journal history rows in `agent_work_journal.md` |
| in-memory 1 MB output buffer | per-call output file under the OS temp area | `terminal_tools.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, finalization per `RELEASE.md`.
- Notes: agent package files that still name the retired tools are out of scope by DEC-008 (separate Agent Package Creator ticket after a stable release; list in `agents-package-files-naming-background-tools.txt`).
