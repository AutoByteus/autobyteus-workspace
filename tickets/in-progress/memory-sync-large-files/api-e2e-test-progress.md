# API/E2E Test Progress — memory-sync-large-files

| Time | Case ID | Event | Note |
| --- | --- | --- | --- |
| 2026-11-15 14:22:16 | API-01 | Started | unit memory-sync + 3 architecture tests at 077fa6853 |
| 2026-11-15 14:22:58 | API-01 | Completed | Pass: 90/91 first run; the 1 failure (web-generated-graphql-current) = pnpm not on PATH in env -i; rerun API-01b with shim: 1 passed |
| 2026-11-15 14:22:58 | API-02 | Started | vitest run tests/e2e/memory-sync env -i |
| 2026-11-15 14:23:49 | API-02 | Completed | Pass: 5 files, 8 tests |
| 2026-11-15 14:23:49 | API-03 | Started | agent-semantic-memory e2e |
| 2026-11-15 14:24:19 | API-03 | Completed | Pass: ungated 2 passed/7 skipped; gated RUN_AGY_FAILURE_E2E=1 9/9 incl SM-10 (edited line) |
| 2026-11-15 14:24:19 | API-05 | Started | full server test:unit (background) -> evidence/API-05-server-unit-full.log |
| 2026-11-15 14:36:23 | API-05 | Completed | Node 26: 8486 passed, 3 failed (memory-search-store RangeError, memory-search timeout 5013ms, grok-build-compaction) in files this ticket does not touch; all 3 files pass on Node 22 (release workflow node-version): 34/34 (API-05b) |
| 2026-11-15 14:36:23 | API-02N22 | Started | e2e memory-sync + unit memory-sync under Node 22 |
| 2026-11-15 14:37:24 | API-02N22 | Completed | Pass: 19 files (14 unit + 5 e2e) under Node 22.23.3 |
| 2026-11-15 14:37:24 | API-07 | Started | AC-003 measurement series (Node 22 then Node 26), background -> evidence/API-07-*.json |
| 2026-11-15 14:57:38 | API-07 | Completed | measurements done: Node 22/24/26, cold+warm, 2/4/8 GiB; evidence/API-07-*.json; AC-003 literal cold fails on Node 24/26 source (>200), passes Node 22 and all warm; size-independent to 8 GiB -> decision pending at report |
| 2026-11-15 14:57:38 | API-08 | Started | card browser probe (Nuxt dev + real source with 23 failures + Chrome, en + zh-CN) |
| 2026-11-15 15:00:07 | API-08 | Completed | Pass for AC-010 with observations: break-all splits ordinary words (next atte/mpt; 下次尝/试), reason repeats path; long path wraps without overflow; en+zh-CN ok; 20 rows + 'and 3 more' |
| 2026-11-15 15:00:07 | API-09/10/11 | Started | lifecycle probe (gate, background+Sync now, hub kill mid-upload, hub kill mid-commit) |
| 2026-11-15 15:04:07 | API-09/10/11 | Completed | Pass: 36 checks (round 3 after correcting 2 probe expectations; earlier rounds kept as evidence dirs); OBS-2 zero-byte partial on refused offset-mismatch piece |
| 2026-11-15 15:04:07 | API-06 | Started | web: card spec + NodeManager spec + guards + typecheck |
| 2026-11-15 15:06:19 | API-06 | Completed | specs pass 17/17; guards pass; typecheck FAIL: production 0; test-file errors 94 in 41 files vs baseline 93 in 40 — new file tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts (missing workspaceSkills from autobyteus-460, untouched by this ticket) -> FU-003 |
| 2026-11-15 15:06:19 | API-12 | Started | fresh clone + frozen install + build:electron:mac (Node 22), background |
| 2026-11-15 15:15:32 | API-12 | Completed | install Pass; build stops at typecheck failing identically on base (FU-003); generate:electron Pass; packaging not run |
| 2026-11-15 15:15:32 | ALL | Completed | report, revision record, follow-up FU-003, TESTING.md node rule written; result Fail on AC-003 only (Requirement Gap) -> Solution Designer |
| 2026-11-15 15:19:09 | API-07 | Rejudged | SR-005 wording: Pass on round-1 data (no code change since 077fa6853) |
| 2026-11-15 15:19:09 | API-08 | Reclassified | OBS-1 promoted to Local Fix: Fail until fix re-validated |
