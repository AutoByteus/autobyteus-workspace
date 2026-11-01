# API/E2E Test Progress — test-and-tooling-hygiene-318 (autobyteus-318)

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-11-01 14:25 | API-02 | Started | | fresh clone /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ab318-clone.94OVpE6TRY: install |
| 2026-11-01 14:32 | API-03 | Completed | Pass | server: new test file + baselined growth FAIL, update refuses growth (baseline unchanged), src error FAIL (counted twice: tests project compiles src); web: cross-package error FAIL; reverted |
| 2026-11-01 14:32 | API-02 | Checkpoint | | install, prebuild, build, integration prepare, both gates PASS, first test:electron PASS (1 download); next unit, integration, nuxt (background) |
| 2026-11-01 14:33 | API-04 | Completed | Pass | 6/6 probes (the full set after the merge removed the GitHub-card probe): exit 1, refusal message, folder unchanged |
| 2026-11-01 14:52 | API-02 | Completed | Pass | unit 912 files pass; integration 85 pass, only FU-004's 4 cases fail (out of scope); nuxt 682 pass |
| 2026-11-01 14:52 | API-05 | Started | | waiting for host load < 25 (another team's vitest), then env -i pnpm test:e2e from the clone |
| 2026-11-01 15:11 | API-05 | Checkpoint | | full test:e2e PASS 113 files / 110 gated skips (13 min); next gated/timing script |
| 2026-11-01 15:25 | API-05 | Completed | Pass | T-46 6/6; T-28 2/2 (windows 60028-60152 ms); QR-001 10/10; T-47 20/20; T-30/T-53 12/12; T-27 11/11 leave nothing but pnpm's node-compile-cache |
| 2026-11-01 15:25 | API-06 | Started | | projects and project-manager-ux probes from the clone |
| 2026-11-01 15:36 | API-06 | Completed | Pass | projects-feature 17/17; project-manager-ux 25/25 (run 2 kept evidence) |
| 2026-11-01 15:36 | API-07 | Started | | RUN_LMSTUDIO_E2E=1 three files; LM Studio: nothing loaded before |
| 2026-11-01 15:41 | API-07 | Completed | Pass | team runtime 5/5, backend factory 4/4, token-usage LM Studio case 1 passed (own gate added); model unloaded |
| 2026-11-01 15:42 | — | Completed | Pass | round 1 recorded (95.8%); committing |
