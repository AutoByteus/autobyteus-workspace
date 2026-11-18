# API/E2E Test Progress

Read first whenever the run is picked back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-18 08:00 | API-00 | Started | | build of HEAD (code 91ee1603a5) + RRB-3 and SIR-002 test edits |
| 2026-11-18 08:20 | API-00 | Completed | Pass | build |
| 2026-11-18 08:21 | API-06, API-07 | Started | | RRB (incl. RRB-3 gated), SID, TAU startup E2E files |
| 2026-11-18 08:50 | API-06, API-07 | Completed | Fail (test) | run 1: RRB-1/2, SID, TAU pass; RRB-3 used my-agent, whose config does not enable list_available_agents (`AGY_TURN_ERROR: Tool is not enabled for this session`; opt-in per definition). RRB-3 now runs the built-in Daily Assistant (its config enables it) and reports frames/conversation on timeout. `evidence/API-06-07-run1-rrb3-tool-not-enabled.log` |
| 2026-11-18 09:05 | API-06, API-07 | Started | | run 2, final test code |
| 2026-11-18 09:20 | API-06, API-07 | Completed | Not Tested (environment) for RRB-3 | run 2: RRB-1/2, SID-1..3, TAU-1..3 pass; RRB-3 stopped at createAgentRun: `AgyDiscoveryError: Antigravity model discovery timed out` (host load ~100). Rerun. |
| 2026-11-18 09:21 | API-06, API-07 | Started | | run 3 |
| 2026-11-18 09:45 | API-06, API-07 | Completed | Pass | run 3: 9/9 (RRB-1..3, SID-1..3, TAU-1..3). `evidence/API-06-07-startup-e2e.log`, `API-07-rrb3-list-available-agents.json` |
| 2026-11-18 09:46 | API-08 | Started | | web probe SIR-001,SIR-002 (output evidence/API-08-sir-probe/) |
| 2026-11-18 10:10 | API-08 | Completed | Fail (stale probe, pre-existing) | run 1: SIR-001 TASK_AGENT_RESOURCE_CONFLICT (461 admission rule; probe predates it; not this change, follow-up). SIR-002 helper_run_5555 not deleted: probe sessions name no helper run, 20261020 takes helper runs only from improver sessions since 9b013fcc09 (autobyteus-280) after the probe d21842c77b. Baseline fix: sessions in released shapes (fx.session). `evidence/API-08-run1-*` |
| 2026-11-18 10:12 | API-08 | Started | | run 2: SIR-002 only |
| 2026-11-18 10:30 | API-08 | Completed | Fail (stale probe, pre-existing) | run 2: feature paths gone now; memory/episodic/index.md differs (autobyteus-493 derived catalog, rewritten when runs change); probe check predates it. Baseline fix: leave memory/episodic/ out of the byte check |
| 2026-11-18 10:31 | API-08 | Started | | run 3: SIR-002 |
| 2026-11-18 10:45 | API-08 | Completed | Pass | run 3: SIR-002 Pass (Agents page selfEvolver 0, memoryCompactor 0). Baseline fix committed cbdf02f15a. SIR-001 not run again: stale since 461 (follow-up) |
| 2026-11-18 10:46 | API-02 | Started | | server typecheck (RRB-3 edit) |
| 2026-11-18 10:55 | API-02 | Completed | Pass | baseline 1011 in 316 |
| 2026-11-18 10:56 | API-09 | Started | | test:integration:prepare + test:integration |
| 2026-11-18 11:20 | API-09 | Completed | Pass for this change (watcher failures, load) | 495 passed / 11 failed in file-system-watcher (no changed file in closure) and package-auto-refresh (no run, no memory code executed); alone: 8 failed, a different set. `evidence/API-09-*.log` |
| 2026-11-18 11:21 | API-12 | Started | | LM Studio memory flows (google/gemma-4-26b-a4b; none loaded before) |
| 2026-11-18 11:45 | API-12 | Checkpoint | | run 1 hollow: both LM Studio tests returned in 1-2 ms (helper found no model: LLMFactory.listModelsByRuntime(LMSTUDIO) returns [] while LMStudioModelProvider.getModels() finds them; neither file changed by this ticket). Rerun with LMSTUDIO_MODEL_ID=google/gemma-4-26b-a4b (the helper explicit id path) |
| 2026-11-18 12:15 | API-12 | Checkpoint | | LM Studio: both pass with real calls after baseline fixes (commit 24582b576c); model unloaded. Next: live OpenAI test |
| 2026-11-18 12:50 | API-12 | Completed | Pass | LM Studio 2/2 real calls; live OpenAI 2/2 (after baseline fixes 24582b576c and 0a7993c227: helper model reload, reasoning record allowed, live test tool search). Temporary probes and the notifier diagnostic were removed; src unchanged |
| 2026-11-18 12:55 | API-10 | Started | | whole server E2E suite, clean env, no gates |
| 2026-11-18 14:30 | API-10 | Checkpoint | | whole E2E: 99 passed / 29 failed files (41 tests) / 148 skipped; rerunning the failing files alone |
| 2026-11-18 15:40 | API-10 | Checkpoint | | rerun alone: 16-17 files still fail; running them on the base 2e9ac1e65b (own worktree ec491-api-e2e-base) |
| 2026-11-18 16:40 | API-10 | Completed | Pass for this change (29 failing files, each explained) | 13 pass alone; 11 fail on base 2e9ac1e65b too; 5 failed twice here and passed alone (4 of them failed on base in API-10d; request-origin: branch 2/2 pass, base 0/2). Base worktree removed |
| 2026-11-18 16:45 | API-11 | Started | | fresh-start build: clone of 984e04707f, frozen install, build:electron:mac --arm64, verify steps |
| 2026-11-18 17:40 | API-11 | Completed | Pass (signing Not Tested) | fresh clone of 984e04707f: frozen install, build:electron:mac --arm64 exit 0 (web typecheck at baseline), Prisma + terminal runtime verify ok, spawn probe ok; signing policy fails on the unsigned local build (needs the runner identity); server typecheck in the clone at baseline 1011 in 316. Clone removed |
| 2026-11-18 17:41 | API-13 | Started | | folder-watcher unit files |
| 2026-11-18 17:55 | API-13 | Completed | Pass for this change | agent-package watcher 4 failed under load (FU-003), skill watcher pass |
| 2026-11-18 17:56 | API-01 | Completed | Pass | 37 hits, all classified |
| 2026-11-18 18:00 | — | Completed | Pass | round 1 closed: Pass, 95%; handoff to /code_reviewer |
