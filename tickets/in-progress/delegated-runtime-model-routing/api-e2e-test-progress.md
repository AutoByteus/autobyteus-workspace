# API/E2E Test Progress — autobyteus-32

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 10-26T16:45 | MR-01…08 | Started | — | model-routing-delegation.e2e.test.ts, scripted AGY router |
| 10-26T17:12 | MR-01…08 | Completed | Pass | 8/8 twice; receipt values checked |
| 10-26T17:15 | API-09 | Started | — | 56 scripted-AGY E2E files, background |
| 10-26T18:20 | RC-39…41 | Started | — | two-server file with routing cases (build 18:17) |
| 10-26T18:24 | API-12 LR-3 | Started | — | live, Codex router held busy |
| 10-26T18:27 | API-12 LR-3 | Checkpoint | — | run 1 harness: router model from catalog (gpt-5.5 not offered); fixed to the report |
| 10-26T18:41 | RC-39…41 | Completed | Fail | 20/41: RC-39…41 pass; older cases fail on intended contract changes → expectations updated |
| 10-26T18:45 | API-09 | Completed | Fail | 10 failed in 5 files → triage (base comparison) |
| 10-26T19:10 | RC-01…41 | Completed | Pass | 41/41 after updates |
| 10-26T19:15 | API-12 LR-3 | Checkpoint | — | clean env: Codex/Claude/AGY pass; Grok harness (first event, timing) fixed |
| 10-26T19:22 | API-12 LR-3 | Checkpoint | — | Grok pass |
| 10-26T19:35 | API-09 | Completed | Pass (triaged) | pre-existing on base: FU-007/008/009; load: EXC-E2E-004; stale IA-01 updated, 5/5 |
| 10-26T19:43 | L-01, L-03, L-04, L-02 | Started | — | router-live-probe.mjs, real CLIs |
| 10-26T19:48 | API-13 | Started | — | docker-peer-probe.mjs |
| 10-26T19:52 | L-01, L-03, L-04 | Completed | L-01 Pass (files) / L-03 Pass / L-04 Pass (recovers) | L-02 not exercised (model refused) |
| 10-26T19:55 | API-13 | Checkpoint | — | run 1: fixture mount harness error; D-3 "busy" after failed turn noted (F-3) |
| 10-26T19:58 | API-13 | Completed | Pass | D-1…D-4 |
| 10-26T20:00 | MR-09 | Started | — | crash / throw router modes |
| 10-26T20:02 | MR-09 | Completed | Observation | crash recovers; throw → every later routing "busy" 40 s (F-3) |
| 10-26T20:04 | L-02 | Completed | Fail | workspace .codex/config.toml present at Codex start → writable_roots ["/"], write outside succeeded (F-1) |
| 10-26T20:08 | L-01 | Completed | Fail | session init tools include claude.ai Claude Docs connector + Skill (F-2); writes confined |
| 10-26T20:20 | MR-01…09 | Completed | Pass | 9/9 final run |
| 10-26T20:30 | API-12 LR-3 | Started | — | final test version, all four runtimes, one clean run |
| 10-26T20:40 | API-12 LR-3 | Completed | Pass | final version, 4/4 runtimes in one clean run |
