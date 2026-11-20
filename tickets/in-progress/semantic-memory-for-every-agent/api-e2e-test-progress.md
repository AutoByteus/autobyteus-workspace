# API/E2E Test Progress

Read first whenever the run is picked back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event (`Started`/`Checkpoint`/`Completed`) | Result (`Pass`/`Fail`/`Blocked`/`Not Tested`) | Note (what is running and where, what to do next) |
| --- | --- | --- | --- | --- |
| 2026-11-20 14:45 | API-00 | Started | | server build on HEAD (code cd26f4d913) |
| 2026-11-20 15:00 | API-00 | Completed | Pass | build |
| 2026-11-20 15:01 | API-05 | Started | | agent-semantic-memory, internal-agents, memory-explorer-graphql with RUN_AGY_FAILURE_E2E |
| 2026-11-20 15:40 | API-05 | Completed | Pass | SM 9/9 on the whole-file rerun (first run: SM-04 AgyDiscovery timeout under load; IA-02 5 s timeout, passes alone); IA 5/5; explorer 3/3 |
| 2026-11-20 15:50 | API-06 | Completed | Pass (observation) | semantic id with blank root refused at the API (workspaceRootPath is required); the semantic folder PATH as root makes an ordinary filesystem workspace (observation) |
| 2026-11-20 15:51 | API-07 | Started | | rendered probe with SMV-090/091 |
| 2026-11-20 16:00 | API-07 | Completed | Pass | 35/35 incl. SMV-090/091 (same document; menu only temp). Negative control on the cff2a6596a component: SMV-091 fails, menu lists semantic_ws_probe-researcher "Research Assistant". Component restored |
| 2026-11-20 16:10 | API-12 | Completed | Pass (pre-existing) | imported docker-node-1: 113 team folders, 0 team cards on BASE and on branch; 0 org folders. Not this change; follow-up |
| 2026-11-20 16:11 | API-03 | Started | | server test:unit |
| 2026-11-20 16:40 | API-03 | Completed | Pass for this change (agent-package watcher 2 failed, load) | 8515 passed; its closure holds only agent-definition/domain/models.ts (field removal) |
| 2026-11-20 16:41 | API-09 | Started | | integration prepare + suite |
| 2026-11-20 17:40 | API-09 | Completed | Pass for this change | 505 passed / 9 failed: 4 tests in 3 files used stale workspace doubles (no getOrCreateRunWorkspace / getRegisteredWorkspaceRootPath): made untrue by this change, doubles updated, 17/17 pass (API-09b); file-system-watcher INCONCLUSIVE under load: base fails alike (API-09c), the 3 branch-only ones pass 2/3 here and fail 2/3 on base (API-09d) |
| 2026-11-20 17:41 | API-10 | Started | | whole server E2E, clean env |
| 2026-11-20 19:20 | API-10 | Checkpoint | | whole E2E: 114 passed / 14 failed. PRODUCT FAILURE: ENAMETOOLONG mkdir semantic/<encoded bundled team-local id> (439 bytes) fails Brief Studio launches (RA-04, IC-01, likely RE-05). Stale tests made untrue by this change: agent-package-private-skills, configured-skill-on-demand-loading (doubles), memory-sync-multiprocess (removed memory field), memory-sync-api (catalog binding). Rerunning the load-suspected files alone |
| 2026-11-20 16:57 | — | Note | | Clock correction: rows from 16:00 to 19:20 above carry estimated times that ran ahead of the clock; their order is right. The evidence files carry exact UTC start times |
| 2026-11-20 16:57 | API-10 | Completed | Fail | 14 files classified. Product: RA-04, IC-01, RE-05 (ENAMETOOLONG, API-10d prints RE-05's launch error). Stale (Next Round, after the fix): private-skills, configured-skill-on-demand-loading, memory-sync-multiprocess, memory-sync-api. Load: live-refresh, integrations-graphql, peer-host-refused, request-origin, embedding-settings, project-task-boundaries (API-10b/10c). Pre-existing: package-personal-settings teardown timeout, branch 2/2 and base 1/2 (API-10e, FU-005) |
| 2026-11-20 16:57 | API-02b | Completed | Pass | server typecheck with the double edits: 1006 in 315, at baseline |
| 2026-11-20 16:57 | API-08, API-11 | Not Run | Next Round | the fix changes prepareForRun and server code |
| 2026-11-20 16:57 | Round 1 | Closed | Fail | report and API-REV-001 written; failure-origin review requested from code_reviewer |
