# API/E2E Test Progress

- Execution coverage report: api-e2e-execution-coverage-report.md
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-29T20:22:33Z | API-01 | Started | | reuse check: diff 574aa0bd7..a2a5d0e47 |
| 2026-10-29T20:22:46Z | API-01 | Completed | Pass | only the AC-011 test file changed outside tickets/ (IMP-13 ran that version); IMP checks reused |
| 2026-10-29T20:22:46Z | API-02 | Started | | baseline run of existing AC-011 e2e (synthetic) before extending |
| 2026-10-29T20:26:43Z | API-02 | Checkpoint | | synthetic team+Org pass (4/4); mutation check fails all 4; next: live mode |
| 2026-10-29T20:28:02Z | API-02 | Completed | Pass | team synthetic+live pass; mutation sensitive |
| 2026-10-29T20:28:02Z | API-03 | Completed | Pass | Org synthetic+live pass (same run as API-02) |
| 2026-10-29T20:28:02Z | API-04 | Started | | temporary probe case in AC-011 file: stopped-run edits with stale key |
| 2026-10-29T20:42:45Z | API-04 | Completed | Fail | server refuses stopped-run Save carrying stored thinking_display (agent + team); sanitized payload saves |
| 2026-10-29T20:42:45Z | API-05 | Started | | browser + GraphQL: removed-model run and definition |
| 2026-10-29T20:42:45Z | API-05 | Completed | Pass | run card "No longer offered by AutoByteus…"; restore MODEL_IDENTIFIER_NOT_AVAILABLE; definition "selected model is unavailable"; model menu 7 Claude rows |
| 2026-10-29T20:42:45Z | API-06 | Started | | browser: definition editing Opus 5.5 / Sonnet 5.5; old-run edit Save |
| 2026-10-29T20:42:45Z | API-06 | Completed | Fail | definition surface passes; Save on old agent run and old team run refused ("Model settings are invalid." / "One or more Team model settings are invalid."); control run without stale key saves |
| 2026-10-29T20:42:45Z | API-07 | Started | | live RUN_CLAUDE_5_5_E2E=1 suite |
| 2026-10-29T20:44:58Z | API-07 | Completed | Pass | 6/6 live |
| 2026-10-29T20:44:58Z | API-07b | Started | | live RUN_ANTHROPIC_CACHE_E2E=1 Opus 5.5 |
| 2026-10-29T20:49:26Z | API-07b | Completed | Pass | 7/7 live |
| 2026-10-29T20:49:26Z | API-08 | Started | | grep audit |
| 2026-10-29T20:52:39Z | API-08 | Completed | Pass | only absence assertions in tests |
| 2026-10-29T20:52:39Z | — | Checkpoint | | round 1 complete: Fail (API-04, API-06); report written; next: commit + failure-origin review |
| 2026-10-29T22:28:21Z | — | Checkpoint | | round 2 started (IR-002 47f44c3df); plan in investigation 'Round 2 Plan' |
| 2026-10-29T22:28:29Z | API-02 | Started | | round 2 rerun synthetic (with API-03) |
| 2026-10-29T22:29:12Z | API-02 | Completed | Pass | r2 4/4 (API-03 same run) |
| 2026-10-29T22:29:12Z | API-03 | Completed | Pass | r2, same run |
| 2026-10-29T22:38:44Z | API-10 | Completed | Pass | open-only writes nothing; invalid declared value still refused |
| 2026-10-29T22:38:44Z | API-06 | Completed | Pass | r2: agent + team old-run edit saved, key dropped |
| 2026-10-29T22:38:44Z | API-09 | Completed | Pass | Org model edit + workspace-only edit saved; untouched configs not rewritten |
| 2026-10-29T22:38:44Z | API-11 | Completed | Pass | launch from stale default launch config works (LYCHEE); new run keeps inert key -> FU-005 |
| 2026-10-29T22:38:44Z | API-12 | Completed | Pass | AGY schema-less: non-null config -> canonical null |
| 2026-10-29T22:38:44Z | API-05 | Completed | Pass | r2 rerun (fixture redone after my seeding-script error) |
| 2026-10-29T22:38:44Z | API-04 | Completed | Pass | r2: covered by API-06/09 browser saves + reused IMP-17 (no separate probe) |
| 2026-10-29T22:38:44Z | API-08 | Completed | Pass | r2 audit: tests only |
| 2026-10-29T22:38:44Z | — | Checkpoint | | round 2 complete; next: report, revision record, commit, handoff |
| 2026-10-29T22:40:15Z | — | Completed | Pass | round 2 Pass 95%; committing |
