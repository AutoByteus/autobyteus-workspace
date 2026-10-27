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
| 10-26T21:00 | R2: MR-01…09, RC-01…41, API-09 | Started | — | round 2 on 424e9bdd62 (build 21:00); background chain |
| 10-26T21:33 | API-14 | Started | — | model-routing-decisions-probe.mjs |
| 10-26T21:41 | API-14 | Completed | Pass | run 4 (runs 1–3: probe assertions on display names / filter, fixed) |
| 10-26T21:41 | API-13 | Started | — | R2 docker peer |
| 10-26T21:43 | API-13 | Completed | Pass | D-1…D-4 |
| 10-26T21:43 | API-12 LR-3 | Started | — | R2 live, four runtimes |
| 10-27T04:35 | API-12 LR-3 | Completed | Pass | Codex/AGY/Grok in the 4-runtime run; Claude rerun alone (first attempt: no unblocked Claude model in that report read) |
| 10-27T04:35 | API-09 | Started | — | R2 regression, alone |
| 10-27T04:54 | API-09 | Completed | Pass (triaged) | 3 failed files = FU-007/008/009 only |
| 10-27T04:55 | API-15 | Started | — | isolated-app start --build |
| 10-27T05:06 | API-15 | Completed | Pass (prepared) | instance built, smoke on/off, stopped; L-03/L-04 R2 Pass |
| 10-27T06:00 | R3: MR, RC, API-09 | Started | — | round 3 on 7541be3e6d (merged base 50e93c2108 + IR-004); serialized chain |
| 10-27T06:32 | R3: MR, RC, API-09 | Completed | Pass | MR 9/9, RC 41/41, regression = FU-007/008/009 only |
| 10-27T06:32 | API-13 | Started | — | R3, all workspace dists mounted |
| 10-27T06:34 | API-13 | Completed | Pass | D-1…D-4 |
| 10-27T06:34 | L-05 | Started | — | R3 live, five router runtimes |
| 10-27T06:43 | L-05 | Completed | Pass (4/5) | Grok: account free usage exhausted (429), routing fell back with the reason; Claude/Codex/AGY/AutoByteus pass |
| 10-27T06:43 | API-12 LR-3 | Started | — | R3 live Codex/Claude/AGY (Grok usage exhausted) |
| 10-27T06:47 | API-12 LR-3 | Completed | Pass | Codex 40219, Claude 40133, AGY 43383 ms |
| 10-27T06:47 | API-14 | Started | — | R3 with MRD-08 |
| 10-27T06:49 | API-14 | Completed | Pass | MRD-01…08 |
| 10-27T06:49 | WEB-FULL | Started | — | test:nuxt full suite (memory.spec cause, Rule 9) |
| 10-27T06:55 | WEB-FULL | Completed | Pass (triaged) | memory.spec 17/17 in 100 ms; failures = clean-base ones (FU-006, port specs) |
| 10-27T06:55 | API-15 | Started | — | R3 rebuild + smoke |
| 10-27T07:02 | API-15 | Completed | Pass (prepared) | final build smoke; stopped |
