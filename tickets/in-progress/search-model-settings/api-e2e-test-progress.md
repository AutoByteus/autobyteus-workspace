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
| 14:27 | (round 2) | Checkpoint | — | round 2 started for IR-003/IR-004 (8c283c6acc); plan in the investigation § Round 2 Rerun Plan |
| 14:27 | API-R06 | Started | — | probe on 8c283c6acc |
| 14:28 | API-R06 | Completed | Pass | probe 8/8 on 8c283c6acc; EMB-006 AC-015 in 3.3 s |
| 14:36 | API-L11 | Started | — | Docker: seeding with no model on disk (AC-015 alternate) |
| 14:52 | API-L11 | Checkpoint | — | Docker: 20,038 writes with no model on disk → no embeddings folder (alternate holds) |
| 14:52 | API-L02 | Started | — | Docker DEC-012 timings |
| 14:55 | API-L02 | Checkpoint | — | Docker: refresh median 8–9 ms; first load 1.76–2.11 s vs Projects list 1.44–2.71 s (load avg 92–108) |
| 14:55 | API-L01 | Started | — | Docker browser open (fresh, no model) |
| 14:56 | API-L01 | Completed | Pass | Docker open 409–536 ms; nothing starts |
| 14:56 | API-L03/API-L05 | Started | — | O-1 failed download folder; O-4/O-2 node stopped |
| 14:56 | API-L03/API-L05 | Completed | Pass | O-1 no folder left; O-4 'Couldn’t reach the server.'; O-2 buttons enabled at once |
| 14:56 | API-L04 | Started | — | Docker Unavailable + Retry (Granite) |
| 14:57 | API-L04 | Completed | Pass | Unavailable + Retry → Ready 7.7 s |
| 14:57 | API-L11 | Started | — | Docker AC-015: create in Alpha, edit in Beta, no search |
| 14:58 | API-L11 | Completed | Pass | Docker: saves 14–70 ms; server Ready 3.8 s after writes (run starts ~3.2 s); open panel shows it at its next idle poll (11.2 s) |
| 14:58 | API-L12 | Started | — | Docker CR-003: restart, dependency-only write, memory/threads; control description edit |
| 14:59 | API-L12 | Completed | Pass | Docker: dependency-only write → no worker (threads 23→22); control description edit → threads 26; AC-013 Active · Ready |
| 14:59 | API-L06 | Started | — | Docker: Index now on Load 1 (1,000), leave/return, Rebuild Beta |
| 15:03 | API-L06 | Completed | Pass | Index now 1,000 Tasks with leave/return; Rebuild Beta |
| 15:04 | (process) | Checkpoint | — | Docker part done: frontend, Chrome, container and image removed |
| 15:04 | API-L07 | Started | — | round 2 isolated-app start --build |
| 15:10 | API-L07 | Completed | Pass | desktop fresh: Active · Not downloaded; no embeddings folder |
| 15:10 | API-L02b | Started | — | desktop: seeding 20 × 1,000 + small Project with no model on disk |
| 15:44 | (process) | Checkpoint | — | power-off during API-L02b: instance, its data root and /tmp/sms-api2 lost; API-L02b incomplete (partial file discarded); resume: start --from-worktree (build of 8c283c6acc), reseed, rerun API-L02b and the remaining desktop cases |
| 15:44 | API-L02b | Started | — | resumed: iso-50179-e4cd (from-worktree, build of 8c283c6acc); reseeding with no model on disk |
| 15:59 | API-L02b | Completed | Pass | desktop: refresh median 4 ms; first load 849–997 ms cold, 617–1,204 ms after Projects (15/16 ≤ 1 s) |
| 15:59 | API-L11 | Started | — | desktop: Granite prepare; AC-015 through the UI |
| 16:00 | API-L11 | Completed | Pass | desktop UI saves 84/107 ms; Ready 3.4 s after the edit, no search; meaning finds both |
| 16:00 | API-L12 | Started | — | desktop CR-003 after restart |
| 16:01 | API-L12 | Completed | Pass | desktop: dependency-only write → threads 27→26, footprint 433 MB flat; control description edit → 30 threads, 684 MB; AC-013 Active · Ready |
| 16:01 | API-R07 | Completed | Pass | round 2 licensing + hygiene |
| 16:01 | (process) | Checkpoint | — | round 2 cleanup: instance stopped + data root removed; /tmp/sms-api2 removed; no containers/images left |
| 16:04 | (process) | Completed | Pass | round 2 report rewritten, API-REV-002 recorded; F-001 resolved by DEC-012; O-5 noted; final confidence 95% |
