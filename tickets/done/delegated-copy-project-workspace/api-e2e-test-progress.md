# API/E2E Test Progress — delegated-copy-project-workspace

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-02T07:10Z | API-R01/R02 | Completed | Pass | Reused IMP-01/02/03/05/06 (git diff 8959bc507a..HEAD outside tickets/ empty) |
| 2026-11-02T07:10Z | API-01 | Started |  | build, then scripted cases of the new suite |
| 2026-11-02T07:11Z | API-01 | Completed | Pass | scripted DCF-01..08 8/8 |
| 2026-11-02T07:11Z | API-02 | Started |  | live DCF-L1 Codex, DCF-L2 Claude |
| 2026-11-02T07:12Z | API-02 | Checkpoint |  | attempt 1: DCF-L1 Codex Pass; DCF-L2 not started (second harness in one file); live cases moved to their own file, rerun |
| 2026-11-02T07:12Z | API-02 | Completed | Pass | Codex and Claude copies wrote pwd = F; nothing in G |
| 2026-11-02T07:12Z | API-03 | Started |  | gated folders projects, agent-team-runs, agent-org-runs, agent, run-history, remote-collaboration (background) |
| 2026-11-02T07:39Z | API-03 | Completed | Pass (after a test update + prepare) | 245/246 + one file prerequisite; project-change-feed updated for REQ-005 (refusal then folder created); both files rerun 48/48 |
| 2026-11-02T07:39Z | API-04 | Started |  | isolated-app start --build --data-root /tmp/97-iso-root |
| 2026-11-02T07:52Z | API-04 | Completed | Pass | packaged: Agent copy and Team member Files+pwd = F (Projects mode), Agent copy Files = F (Workspaces), manager control = G; P 'No runs yet'; new Workspaces row for F; 4 driver-only fixes; instance stopped; our instances gone from list |
