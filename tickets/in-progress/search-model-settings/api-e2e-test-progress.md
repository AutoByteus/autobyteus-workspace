# API/E2E Test Progress

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 12:19 | (setup) | Started | — | Docker image build ab-sms-validation:d2bcb95d3a (background) |
| 12:20 | API-R03 | Started | — | GraphQL E2E projects + server-settings, clean env |
| 12:22 | API-R03 | Checkpoint | — | 7 files pass; projects-graphql API-007 fails: stale name filter vs the approved index mutations → API-D01 (Needs Update) |
| 12:23 | API-D01 | Completed | Pass | projects-graphql API-007 updated; 11/11 |
| 12:23 | API-R03 | Completed | Pass | 7 other files pass; projects-graphql passes after API-D01 |
| 12:23 | API-R06 | Started | — | browser probe on d2bcb95d3a (builds the server) |
| 12:25 | API-R06 | Completed | Pass | probe 8/8, no browser errors, cleanup complete |
| 12:25 | API-L01 | Started | — | Docker node + Nuxt dev bound to it + headless Chrome |
| 12:26 | API-L01 | Completed | Pass | fresh root: Active · Not downloaded, nothing downloads, no embeddings folder |
| 12:26 | API-L03 | Started | — | Docker: huggingface.co blocked, Download ahead LEAF-IR, restore, Retry |
| 12:27 | API-L03 | Completed | Pass | failed with huggingface.co reason + Retry; no files; Retry → Downloaded |
| 12:27 | API-L04 | Started | — | Docker: blocked, Download on the Active row (Granite) → Unavailable; restore; Retry |
| 12:27 | API-L04 | Completed | Pass | Unavailable + Retry → Preparing → Ready, no board search |
| 12:27 | API-L06 | Started | — | Docker: Index all + leave/return, Rebuild, Needs update → Index now |
| 12:28 | API-L06 | Completed | Pass | Index all + leave/return, Rebuild, Needs update → Index now |
| 12:28 | API-L05 | Started | — | Docker: node stopped, action pressed; node started; next action |
| 12:28 | API-L05 | Completed | Pass | node stopped → red alert 'Failed to fetch'; next action cleared it; Gemma download + Cancel removed folder |
| 12:28 | API-L02 | Started | — | Docker: seeding 20 × 1,000 Tasks (background, 4 parallel) |
| 12:46 | API-L02 | Checkpoint | — | Docker QR-001: status median 2017 ms, p90 3550 ms; browser 2.2–2.5 s (budget 1 s) → characterize |
| 12:48 | API-R04 | Started | — | gated QR-001 load test on the host |
| 12:55 | API-R04 | Completed | Pass | host gated load: one poll within 1 s at 20 × 1,000 |
| 12:55 | API-L02 | Completed | Fail | Docker QR-001: status 1.8–2.0 s median (projects list alone 1.8 s); host passes |
| 12:55 | API-L07 | Started | — | isolated-app start --build (background) |
| 13:01 | API-L07 | Completed | Pass | desktop fresh root: Active · Not downloaded; nothing downloaded |
| 13:01 | API-L08 | Started | — | desktop: Granite ready + index; Gemma download ahead; switch via Advanced during it; board; Remove |
| 13:05 | API-L08 | Completed | Pass | R-9 via Advanced during Gemma download ahead; AC-003 files kept/vectors replaced; AC-004 board exact then meaning; Remove |
| 13:05 | API-L10 | Completed | Pass | restart → Active · Ready; Project Ready kept |
| 13:05 | (process) | Checkpoint | — | cleanup: instance stopped + data root removed; container and image removed; Chrome stopped; /tmp/sms-api removed |
| 13:07 | API-R07 | Completed | Pass | licensing + hygiene |
| 13:07 | (round 1) | Completed | Fail | report and revision record written; committing; handoff for failure-origin review |
