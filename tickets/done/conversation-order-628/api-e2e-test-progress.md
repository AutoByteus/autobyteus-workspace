# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-24 02:52 | B-1 | Completed | Pass | server build, phone bundle (tree `a9e22b4ea4`) |
| 2026-11-24 02:55 | MSP-106, MSP-107 | Completed | Fail (harness) | pairing waited for the tree on an empty node |
| 2026-11-24 03:05 | MSP-106, MSP-107 | Completed | Fail (harness) | order checks all Pass; time reader: `ts` is seconds, and a Team member's state sits behind the view's accessor |
| 2026-11-24 03:13 | MSP-106, MSP-107 | Completed | Pass | Claude haiku 3 rounds, native gpt-5.4-mini 2 rounds; state times within 0–6 ms of the node's, phone ±2 s |
| 2026-11-24 03:15 | SI-1, SE-1 | Started | — | `test:integration:prepare`, `test:integration`, `pnpm test:e2e` → /tmp/api628 |
| 2026-11-24 03:22 | SI-1, SE-1 | Completed | Pass; Fail (outside) | integration 92 passed; e2e 125 passed, RRB-1/SID-2 (609 FU-007; short TMPDIR) |
| 2026-11-24 04:15 | WS-1 | Completed | Pass for this ticket | 103 cases, 97 Pass; the 6 failing as on the base (FU-002, FU-006) |
| 2026-11-24 04:21 | FS-1 | Completed | Pass | fresh clone `ea6505c3eb`; the packaged app holds this commit's node (`stampForDelivery`) and web (the refusal text in `app.asar`) |
| 2026-11-24 05:50 | — | Checkpoint | — | Round 2 (CRR-004 on IR-003, merged tree `2d3f46b223`): server build, phone bundle (exit 0) |
| 2026-11-24 05:52 | R2-CS-1 | Completed | Pass | contract suites: agent-presentation `# pass 24`, collaboration-stream `# pass 39`, team-stream `# pass 14`; `# fail 0` each |
| 2026-11-24 05:55 | R2-MSP-105…107 | Checkpoint | — | the first run was stopped by the application's restart (no result recorded); started again |
| 2026-11-24 06:10 | R2-MSP-105…107 | Completed | Pass | MSP-105 Pass; MSP-106 (Claude) and MSP-107 (native): order live and reopened in every round; state times within 3–11 ms of the stored write times live, equal reopened |
| 2026-11-24 06:11 | R2-SI-1, R2-SE-1 | Started | — | → <tmp>/r2-* |
| 2026-11-24 06:19 | R2-SI-1, R2-SE-1 | Completed | Pass; Fail (outside) | integration 92 passed; e2e 125 passed, only RRB-1/SID-2 (609 FU-007) |
| 2026-11-24 07:12 | R2-WS-1 | Completed | Pass for this ticket | 103 cases, 97 Pass; the same 6 as round 1 (FU-002, FU-006) |
| 2026-11-24 07:19 | R2-FS-1 | Completed | Pass | new clone of `2d3f46b223`: build, verify steps, packaged app holds this commit's node and web |
