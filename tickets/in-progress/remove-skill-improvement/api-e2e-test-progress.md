# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-20T15:29:15Z | API-01..API-12 | Completed | Pass | Reused IMP-01..IMP-12 (see investigation) |
| 2026-10-20T15:29:15Z | API-13 | Started | | 8 fixture probes sequentially (background); outputs /tmp/ab205e2e/api13-<name> |
| 2026-10-20T15:41:04Z | API-13 | Completed | Fail (pre-existing, out of scope) | 2 Pass (composer-mention-discoverability, workspaces-sidebar-dock); 6 Fail, causes pinned to stale fixtures in code this ticket does not touch (agent-org-draft-retention: listWorkspaceRunHistory fixture fields + ws 404, also cold reloads on run 1; agent-org-task-team-disclosure: source.coordinatorAddress (197); fresh-run-auto-approval B04: member seeding 10-12; standalone-agent-error-stop: ws/agent-package-definitions 404; task-agent-monitor-visibility: recoverableBlock; task-agent-peer-sidebar: getTeamMemberFileChanges). No removed-query traffic in any. → follow-up |
| 2026-10-20T15:41:04Z | API-14 | Started | | projects-feature-probe --skip-server-build |
| 2026-10-20T15:42:30Z | API-14 | Completed | Pass | PT-E2E-001..017 Pass; exit 0 |
| 2026-10-20T15:56:45Z | API-15..API-17 | Started | | full probe incl. SIR-001..002 (background); output /tmp/ab205e2e/probe-full-1, ledger /tmp/ab205e2e/probe-full-1.ledger.md. Trial runs sir-try1..5 brought the SIR cases up (probe-side fixes only) |
| 2026-10-20T16:26:00Z | API-15 | Completed | Pass except DCP-003 (out of scope, FU-005) | full probe 19 Pass 1 Fail (DCP-003 "Timed out waiting for saved": post-save Org re-read failed); 3 reproduction runs Pass (rep1 alone, rep2 DLP-004/DCP-002/DCP-003 with temp diagnostics, rep3 full order with temp diagnostics); diagnostics removed |
| 2026-10-20T16:26:00Z | API-16 | Completed | Pass | SIR-001 in the full run |
| 2026-10-20T16:26:00Z | API-17 | Completed | Pass | SIR-002 in the full run |
| 2026-10-20T17:05:03Z | round 2 | Checkpoint | | Trigger CRR-003 (INT-001 merge 5cfccd66c7 + Secret Gate bda3731947; head 2147206408). Diff vs 4b12567b9a: base's update notifications (server, web settings Basics, layout, notifications, websocket, Electron updater), skills/github, version bump; no lockfile, autobyteus-ts, contracts or migration change. Reuse IMP-14..IMP-22 on 5cfccd66c7 (head adds only .gitleaks.toml) for API-01..API-12 and SIR (IMP-22); rerun browser cases API-13, API-14, API-15..17 on the merged build |
| 2026-10-20T17:05:03Z | API-13..API-17 | Started | | round 2 sequential batch (background): /tmp/ab205e2e/r2-* |
| 2026-10-20T17:40:32Z | API-13..API-17 | Completed | see report | batch: API-13 2 Pass (+standalone-agent-error-stop now Pass: 3), API-14 PT-E2E-013 Fail (meaning search), full probe 18 Pass 2 Fail (DCP-003, DCR-003 stale Org re-read). Org loop with temporary diagnostics: 3 of 6 reproduced; cause = stream reconnect snapshot during post-save AgentOrgRunConfig read; diagnostics removed |
| 2026-10-20T17:40:32Z | API-07 | Started | | IMP-07 suites on merged dist |
| 2026-10-20T17:42:28Z | API-07 | Completed | Pass | 19 passed; exit 0 |
