# Handoff Summary

## Summary Meta

- Ticket: `run-bash-background` (Project Task `autobyteus-338`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Date: `2026-11-10`
- Classification: `task_size: Large`, `architectural_risk: High`, route: independent architecture review, source code review (CRR-001 Local Fix CR-001 → CRR-002 Pass), API/E2E (API-REV-001 Pass, final confidence 95%), test-code review (CRR-003 Pass).
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/run-bash-background`. Base `origin/personal` @ `374e35a60e` at bootstrap. Integrated by merge at delivery: `origin/personal` @ `c8f303af70` (105 commits) → `052be30619`; post-integration checks DEL-01..03 pass. Finalized: `--no-ff` merge `bd45d07aa2` pushed to `origin/personal`.
- Product code final at `ddd594d07b`.

## Delivery Summary

- Delivered scope:
  - Every `run_bash` call runs through one command wrapper (macOS bash 3.2, Linux bash 5.2, `sh` fallback).
  - `run_bash` with `run_in_background` returns at once with pid, effective cwd and an output file; `&` jobs still running when the foreground part ends become background tasks too (`cmd & disown` stays untracked).
  - Each background task's end is reported once: in the agent's own `run_bash` result (`backgroundTasksEnded`, e.g. its `kill <pid>`) or in one batched SYSTEM notice (exit code or signal, duration, last lines, output file, still-running list) that wakes an idle run.
  - Native runs publish `BACKGROUND_TASK_UPDATED`: the Background Tasks panel shows native tasks, and the idle-shutdown quiet check keeps a copy with a running task alive.
  - Run end (Terminate, delete, Task release, root stop, idle shutdown, standalone host close) stops the run's commands and removes their output files; Stop (interrupt) leaves them running.
  - Retired tools: `start_background_process`, `get_background_processes`, `get_process_output`, `stop_background_process`. Stored definitions that list them start normally; the names are skipped with a warning; old journals still render.
  - The built-in Daily Assistant template uses `run_bash` background commands.
- Docs: `autobyteus-ts/docs/terminal_tools.md`; server module docs `agent_execution`, `agent_team_execution`, `agent_tools`, `agent_work_journal`, `tool_list_updates`, `skill_update_notices`; `GLOSSARY.md`; at delivery also `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` and `autobyteus-web/docs/agent_execution_architecture.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed for any acceptance criterion). AC-001…AC-013 are directly proven; the critical ones (AC-001, 002, 003, 005, 006, 010, 013) were opened in their evidence files (`release-deployment-report.md`, Verification).
- Key evidence:
  - `evidence/API-04-12-transport/BGT-01..09.json`: real server, native runtime, scripted model, real processes.
  - `evidence/API-13-live/BGT-LIVE-{ANTHROPIC,OPENAI}.json`: two real models start two builds, read with `tail`, get one notice, report both results.
  - `evidence/API-15-desktop-panel/04-panel-completed-notice.png`: the real desktop app's panel row Completed / exit code 0, the notice and the woken reply.
  - `evidence/API-03-native-standalone-shutdown/native-standalone-host-result.json`: run end stopped its commands in 757 ms.
  - Integrated state: `evidence/DEL-post-integration/` (server typecheck PASS at baseline; targeted server suites 2237 passed; background-task transport E2E BGT-01..09, 9 passed, on the merged state).
- Secret Gate PASS on the ticket commits and on the merged state; artifact hygiene PASS.

## Residual Risks For The User

- WSL not tested (no Windows host). Linux bash 5.2 runs the same wrapper (IMP-08, API-14). To check on Windows: run `pnpm -C autobyteus-ts exec vitest run tests/integration/tools/terminal/run-bash-wrapper.test.ts` under WSL, and check that a detached `cmd >/dev/null 2>&1 & disown` does not keep the bridge alive (steps in `api-e2e-execution-coverage-report.md`).
- Start under heavy CPU load can miss its budget (FU-003 of autobyteus-333; out of scope by DEC-005). A failed start now names its reason.
- Agent package files still name the retired tools; runs skip them with a warning. They go to a separate Agent Package Creator ticket after a stable release (DEC-008; `agents-package-files-naming-background-tools.txt`).
- After an app restart the background commands are gone; telling idle agents about it is autobyteus-448.

## Follow-ups

- `follow-ups.md` FU-001: `autobyteus-web/docs/settings.md` is a stale duplicate of the execution-architecture doc (not urgent).

## Release

- No release (the user did not ask; RELEASE.md's default). The change ships with the next beta or stable; `release-notes.md` holds user-facing notes for it.
