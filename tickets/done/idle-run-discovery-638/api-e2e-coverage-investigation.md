# API/E2E Coverage Investigation — idle-run-discovery-638 (autobyteus-638)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved); Design Spec: `design-spec.md` (SR-003); architecture review files present (the reviewer's edits stay uncommitted and untouched)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Code Review: `code-review-report.md` (CRR-001 Pass, 9.5/10)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current Revision ID: `API-REV-001`
- Round 1; Trigger: CRR-001 Pass (code `ae1e36cded`, documents to `7c1d5b056e`)
- Testing guideline: `TESTING.md` (root): built-server suites in `env -i`; runtimes without a model (scripted AGY); live Claude (vault key to the CLI child only, throwaway HOME and `CLAUDE_CONFIG_DIR`); live Codex (throwaway `CODEX_HOME` linked to the host login; `gpt-6.1-terra`); Docker server nodes (test-owned container from the same image, this worktree's server package mounted read-only, fresh volumes); real-provider runs only when the change needs them, with a small input.

## Current Requirement And Design Basis

After any restart (an update, a restart, a crash), the Agent and Team runs a person started that were running at the stop are running again, idle, without input: listed by `list_running_agents` and reachable by message (REQ-001, REQ-002). Not: archived, stopped or removed runs, delegated runs, Org units (REQ-003). A run that cannot be restored is logged and the others continue (REQ-004). The update wake and the restart reminder keep their behavior (REQ-005). `running-runs.json` has one writer (the recorder) and one reader (the restorer); a stop or crash during the restore window loses no run (walk 4b, AR-001). Persisted data: a new small record file only.

## Supported Scenarios And Real Usage

- UC-001 (graceful stop, kill), UC-002 (runs that must stay unloaded).
- Added from real use: RU-1, the incident's restart kind, a Docker node stopped and started (`docker stop`/`start`) or killed; RU-2, runs on the external runtimes a person uses (Claude, Codex, Antigravity), whose own sessions must survive the restart; RU-3, a stop or crash while the restore is still bringing runs back (walk 4b).

## Changed Surface And Boundary Classification

| Surface | Affected | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- |
| Process lifecycle (start, graceful stop, kill) | Yes | unit (recorder, restorer, startup order); built-server RUN-01/02 (native runtime) | external runtimes' own sessions; Docker's stop and kill; a stop during the restore | built server with each runtime; a test-owned Docker node; RUN-03/04 |
| External runtimes (Claude SDK, Codex app-server, AGY CLI) | Yes (their sessions are restored) | unit (fakes) | the real CLIs' session resume | live Claude, Codex without inference, scripted AGY on the built server |
| Persisted data (`restart-resume/running-runs.json`) | Yes (new file) | unit | its content at a real stop, kill and stop-during-restore | built server and Docker |
| Restart reminder / update wake | Preserved | RR suite (IMP-06; RR-10 FU-001) | that the reminded run is also running idle | RR-01 extended |

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` (RUN-01/02) | Still Valid | add RUN-03/04 (walk 4b) |
| `tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Still Valid (RR-10 red before this ticket, FU-001) | RR-01 gains AC-005's "running idle before any input" |
| unit and integration suites | Still Valid | Reused (IMP-02 whole unit, IMP-03 whole integration, IMP-01 typecheck) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command Or Steps |
| --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003 | built server, native runtime | Existing Test (rerun with the new cases) | `RUN_RUNNING_RUNS_E2E=1 … running-runs-built-server.e2e.test.ts` (RUN-01/02) |
| API-02 | AR-001 walk 4b | built server, a stop and a kill during the restore | Durable (new): RUN-03/04 | same file |
| API-03 | AC-001, AC-002 on external runtimes | built server with the real Claude CLI, the real Codex app-server, the scripted AGY | Durable (new, gated): `running-runs-external-runtimes.e2e.test.ts` | per runtime gate |
| API-04 | AC-001, AC-002 on a Docker node | test-owned container, `docker stop`/`start`, `docker kill`/`start` | Durable (new, gated): `running-runs-docker-node.e2e.test.ts` | build the server package; gate |
| API-05 | AC-005 | RR-01 extended | Durable (updated) | `RUN_RESTART_REMINDER_E2E=1 … -t RR-01` |
| API-06 | — | whole ungated server E2E | Existing Test | `env -i … pnpm test:e2e` |
| API-07 | AC-005 (the rest) | restart-reminder suite | Reused (IMP-06, same code; RR-10 FU-001) | — |
| API-08 | — | typecheck after the new tests | Existing Test | server typecheck |
| API-09 | — | tracked imports | Existing Test | checker |
| Reused | AC-003, AC-004, AC-006 | unit, integration | Reused | IMP-01, IMP-02, IMP-03, IMP-07 |

## Not Tested / Infeasible / Deferred (planned)

| Behavior | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| A Codex run's conversation continuing after a restart (inference) | The host's Codex login has hit its usage limit until 2026-11-27 ("You've hit your usage limit…"). Codex's restore without inference is proven (RUN-X-CODEX-READY-*), and conversation continuity across a restart is proven on Claude | low: the same restorer path; Codex resumes a saved thread through its own app-server call | the cases stay in the suite (`RUN-X-CODEX-TERM/KILL`) |
| A Docker node's external runtimes signed in | Signed-in CLIs in a test container need the user's credentials; the Docker case uses the scripted AGY | low: the runtime part is proven on the built server (API-03) | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes`. Reroute: `No`.
