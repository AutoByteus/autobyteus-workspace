# API/E2E Test Progress

My progress log while tests run. Only rows are added; earlier rows are never changed.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 06:15Z | setup | Completed | Pass | Server build and phone bundle built (/tmp/aee-23/server-build.log, mobile-build.log); durable test changes written (not yet committed) |
| 06:15Z | API-01 | Started | | renderer/composable specs + font-size audit, vitest in autobyteus-web |
| 06:16Z | API-01 | Completed | Pass | 9 files, 63 tests passed |
| 06:16Z | MSP-44,45,46,50,51,52 | Started | | test:e2e:mobile-shell --output-dir=/tmp/aee-23/probe-1 (background) |
| 06:21Z | MSP-44,45,46 | Completed | Pass | probe-1 (/tmp/aee-23/probe-1) |
| 06:21Z | MSP-50 | Checkpoint | | probe-1: all wrap/copy/table/math/host checks pass at 1280 and 700 (answer + inter-agent); only "no file-action link beside the path block" failed |
| 06:21Z | MSP-51,52 | Checkpoint | | probe-1: could not open the file (no file-action link). Cause: my fixture; fenced-code actions need a whole line that is a path (findAbsoluteFilePathCodeCandidates trims each line). Fixture fixed (path on its own line); screenshots per region |
| 06:21Z | MSP-50,51,52 | Started | | probe-2: --cases=MSP-50,MSP-51,MSP-52 --output-dir=/tmp/aee-23/probe-2 |
| 06:25Z | MSP-50 | Checkpoint | | probe-2: Pass (answer + inter-agent, 1280 and 700) |
| 06:25Z | MSP-51,52 | Checkpoint | | probe-2: wrapping/copy/math all pass; failures are test-side: reachability check required a cell wider than its box to fit (fixed: right edge only); CDP synthesizeScrollGesture does not scroll in headless (fixed: dispatchTouchEvent swipe, verified 474 px in /tmp/aee-23/touch); Files viewer 167 px at 1280 and folded at 700 (now: panel, Maximize view, strip Files button). Finding: inline path overflows the Files viewer by 143-159 px (FU-002) |
| 06:25Z | harness | Checkpoint | | browser listeners moved after the cold nuxt dev warm-up in mobile-code-wrap-cases.mjs and mobile-heading-links-cases.mjs (probe-1 unknown errors were all warm-up: 504 Outdated Optimize Dep) |
| 06:25Z | MSP-44,45,46,50,51,52 | Started | | probe-3: final test code, --output-dir=/tmp/aee-23/probe-3 |
| 06:30Z | MSP-44,45,46,50,52 | Completed | Pass | probe-3 (final test code); no unknown browser errors; cleanup clean |
| 06:30Z | MSP-51 | Checkpoint | | probe-3: 1280 panel + maximized measured; 700 strip button selector wrong (parent's data-test overrides the strip's own). Fixed to [data-test="workspace-right-tool-strip"] |
| 06:30Z | MSP-51 | Started | | probe-4: --cases=MSP-51 --output-dir=/tmp/aee-23/probe-4 |
| 06:34Z | MSP-51 | Completed | Pass | probe-4: panel 167 px, maximized 1248 px, 700 drawer 418 px all pass; probe result Pass, no unknown browser errors, cleanup clean |
| 06:34Z | commit | Completed | | test commits 07b3abcd4 (baseline fix), 27245624a (MSP-50…52 + REPLY_FILE); evidence copied to evidence/api-e2e/; next: report, revision record, docs commit, handoff |
| 06:36Z | handoff | Completed | Pass | report, revision record written; /tmp/aee-23 removed; docs+evidence commit next |
