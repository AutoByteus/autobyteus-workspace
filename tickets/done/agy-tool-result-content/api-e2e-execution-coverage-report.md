# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-tool-result-content/tickets/in-progress/agy-tool-result-content/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `7069972efe`, IR-001; SR-001 and SR-002)
- Prior round reviewed: none; Deviations from the plan: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-tool-result-content/tickets/in-progress/agy-tool-result-content/evidence/api-e2e/

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `dbfae1e493` (code identical to `7069972efe`; the new live e2e file committed with this round) | macOS arm64 | Node v22.23.1, vitest 4.1.12; server built with `pnpm build` (exit 0); in-process real server with the scripted Antigravity CLI | `env -i`, private HOME; host load average 39-45 |
| ENV-2 | same | same | BUILT server (`dist/app.js`), test-owned data root and database, REAL `agy` 1.5.15 | real HOME/USER/LOGNAME (host login: the installed agy keeps no separate token file); synthetic scratch workspace; the runs add synthetic conversations to the user's `agy` history |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-02..06 | all | typecheck, unit suite, scripted e2e group | implementation checks (`Reused`) | | Pass (reused) | implementation handoff rows | per those rows | code unchanged since `7069972efe` (`git diff 7069972efe dbfae1e493 -- . ':!tickets'` is empty); the full unit suite (8991) and the 20-file group are not repeated; I reran a subset (API-04) |
| API-01 | AC-001, 002, 007, 013, 014, 015 | scripted CLI on a rebuilt server | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-native-tool-result-content-scripted-agy.e2e.test.ts tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-scripted-rerun.log` | `Tests  8 passed (8)`; `NR-01 FULL`, `NR-02 PARALLEL`, `NR-03 NO_TRANSCRIPT`, `NR-03 GAP`, `E-002b` ✓ | warning on a missing transcript and a gap, none on success (per the file's assertions) |
| API-02 | AC-001, 002, 013 | base-source probe | the same command with `src` checked out from `7cc04d768c`, then restored | ENV-1 | Fail (expected) | `API-02-scripted-base-fails.log` | `Tests  5 failed | 3 passed (8)` (E-002b, NR-01, NR-02, NR-03 x2) | status clean after restore |
| API-03 | AC-001, 005, 008, 012, 013, 014, 015 | LIVE built server, real agy | `autobyteus-server-ts`: `env -i PATH HOME USER LOGNAME TMPDIR RUN_AGY_RESULT_CONTENT_LIVE_E2E=1 AGY_RESULT_CONTENT_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/runtime/agy-native-tool-result-content-live.e2e.test.ts --no-watch` (two runs) | ENV-2 | Pass (2 of 2 runs) | `API-03-live-agy-results.log`, `API-03-live-run1/`, `API-03-live-run2/`, `API-03-live-parallel-match.txt` | `Tests  4 passed (4)` and `Tests  5 passed (5)`; `LN-02 steps=60 recovered=60 summaryOnly=0 warnings=0` in both; `run1 f-file results matching their own call: 60 mismatching: 0` | LN-01: ranged `read_file` (lines 5-9) recorded as the five lines (with the CLI's header, once doubled), journal `Command: sed -n '5,9p' …/notes.txt → ok` with the `cat -n` lines, no header or wrapper, no `content not recorded`. LN-02: 60 live read steps per run in two turns of 30 parallel reads: every one recovered (120 in all), none missed, no warning, each result names its own call's file (D-6 and the identification, live). LN-03: three calls asked in one response (two `write_file`, one `edit_file`): the raw trace holds the full arguments (`Content`, `Target`, `Replacement`), the journal `Write file: …alpha.txt (2 lines) → ok`, `Write file: …beta.txt (1 lines) → ok`, `Edit file: …notes.txt (+1 −1) → ok`. LN-04: `run_command` exit 3: journal `Command: sh -c 'echo before-exit; exit 3' → exit 3` with `before-exit`, no wrapper lines. LN-05: a whole 2,400-line file recorded as 46,474 bytes (the CLI's own bound), under the cap. Lag: the row was readable at the DONE event for every one of the 120 steps (no re-read needed or logged); with the implementer's 123 steps (IMP-01) that is 243 live steps with 1 late row, within 5 ms |
| API-03b | AC-001, 015 | live base probe | the live file with `-t "LN-01\|LN-04"` against `src` from `7cc04d768c` (built), then restored and rebuilt | ENV-2 | Fail (expected) | `API-03b-live-base-fails.log` | `expected '40 lines, 1462 bytes' not to match /^\d+ lines, \d+ bytes$/`; LN-04 no `→ exit 3` | shows the live cases can fail |
| API-03c | AC-002, AC-012 (grep, find) | live, real agy | the live file, LN-06: asked to use find_by_name, grep_search and view_file | ENV-2 | Not Tested (the tools are not offered; accepted as unverified risk, DEC-10) | `API-03c-live-search-tools.log`, `API-03c-live-run3/` | `LN-06 toolsUsed=run_command,read_file` | the real agy 1.5.15 never called those tools; it searched with `run_command` (a `find … && grep -rn`), whose result the stream carries. Evidence decision DEC-10 accepted this as unverified risk |
| API-01b | AC-002 | scripted case after the DEC-10 fixture correction | `vitest run tests/e2e/runtime/agy-native-tool-result-content-scripted-agy.e2e.test.ts` and the arguments transport; unit folders | ENV-1 | Pass | (run output) | `Tests  4 passed (4)` twice; `Tests  648 passed | 8 skipped (656)` | the fixture's `view_file` and `find_by_name` rows follow the stored shapes |
| API-04 | all | unit, typecheck, scripted e2e | `vitest run tests/unit/agent-execution/backends/antigravity tests/agent-work-journal`; `pnpm typecheck`; five scripted e2e files (schema-reads, read-file-spill, neutral-vocabulary, linked-skills-transport, mcp-tool-call-transport) | ENV-1 | Pass | `API-04-unit-typecheck-regression.log` | `Tests  648 passed | 8 skipped (656)`; `test-file errors: 972 in 299 files (baseline 972 in 299 files)`; `Tests  14 passed (14)` | includes my new test file in the typecheck |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only / evidence decision |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, API-03 (LN-01), unit | Proven | |
| AC-002 | Yes | API-01 (scripted grep/find rows, now in the stored shapes), unit | Accepted Unverified Risk (DEC-10) for the real-CLI rows of `grep_search`, `find_by_name`, `view_file`; proven by scripted and unit evidence | DEC-10: agy 1.5.15 does not offer the tools, so no live row can exist; a different real shape makes the reader log `AGY_TOOL_RESULT_UNRECOVERED` and keep the stream result |
| AC-003 | Yes | unit, scripted NR-01 (a stream result is kept), LIVE LN-04 (`run_command` unchanged) | Proven | |
| AC-004 | Yes | unit (reader tests), scripted NR-03 | Proven | |
| AC-005 | Yes | unit, LIVE LN-02 (30 parallel reads, each its own row) | Proven | |
| AC-006 | No | unit (300 KiB and 3 MiB), LIVE LN-05 (46 KB recorded) | Proven (unit for the cap) | |
| AC-007 | Yes | scripted NR-03 NO_TRANSCRIPT, unit | Proven | |
| AC-008..010 | Yes | renderer unit, LIVE LN-01 | Proven | |
| AC-011 | Yes | service unit (revision 4 to 5, raw bytes identical) | Proven | the founder's journals not read |
| AC-012 | Yes | LIVE LN-01, LN-02 (120 steps; 243 with IMP-01) for read; lag measured | Proven for `read_file`, `write_file`, `edit_file`, `run_command`; grep and find: Accepted Unverified Risk (DEC-10) | DEC-10 |
| AC-013 | Yes | unit, scripted NR-02/E-002b, LIVE LN-02, LN-03 | Proven | |
| AC-014 | Yes | renderer unit, LIVE LN-03 (`Write file`, `Edit file`); `read_url_content`, `search_web` unit only | Proven (the web tools by unit only: no live web call made) | |
| AC-015 | Yes | renderer unit, LIVE LN-04 (`→ exit 3`) | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 90% | API-01..04 | AC-002/012 grep and find unproven live | a CLI that offers them, or the Solution Designer's decision |
| Changed-boundary execution directness | 96% | 96% | LIVE LN-01..05 on the built server | | |
| Cross-boundary integration realism and mock gap | 90% | 94% | 243 real steps, parallel batches, real exit code | grep/find/view_file rows only synthetic | as above |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | ENV-2 real agy 1.5.15 | one CLI version; the layout is undocumented | rerun on the next agy version |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | NR-03, unit reasons, API-02/03b | no live broken transcript | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface changed (Activity tab shows the same result field) | | |
| Durable regression coverage quality and relevance | 92% | 94% | LN-01..06 (gated), NR-01..03 | live file costs credits | |

- Overall post-repository confidence: 92%; overall final confidence: 93%
- Calculation method: simple average of six applicable categories (final: 90+96+94+93+92+94 = 559/6 = 93.2%)
- Every critical acceptance criterion directly proven, apart from parts only the user can check or the part accepted as unverified risk (DEC-10): `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (93%)
- Confidence-limiting residual risks: the real row shape of `grep_search`/`find_by_name`/`view_file` is unobserved with this CLI.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (built server, real agy)
- Gap addressed: the transcript layout, row timing and parallel batches of the real CLI, which no scripted run can show
- Browser validation: not needed

## Persisted-Data Transition Checks

- Approved decision: `Discard or Rebuild` (derived journal); stored raw traces untouched (service unit); followed without a migration: `Yes`; version-specific fallback observed: `No`; residual: the founder's journals not read.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-result-content-live.e2e.test.ts` | Added (gated by `RUN_AGY_RESULT_CONTENT_LIVE_E2E=1`) | API-03, API-03c |

- Attached for test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (API-01, 02, 04) | scripted `agy-failure-cli.mjs` (`native_tool_results`) | deterministic | real layout not exercised there; API-03 uses the real one |
| grep_search / find_by_name / view_file rows | synthetic, shaped from the investigation's measurement | the real CLI does not offer them | the real shape unobserved |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| test-owned data roots, databases, built servers | Yes | `removeOwnedTestRuntime`, `server.stop()` | removed |
| Base-source probes (API-02, API-03b) | Yes | `git checkout HEAD -- src`, index reset, `git clean` of `src`; `dist/` rebuilt from the fix | clean |
| Synthetic conversations in the user's `agy` history (the live runs) | Yes | not removable by me | remain; disclosed |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass` at 93%, with the accepted scope of DEC-10 (Solution Designer, `requirements-doc.md`, SR-003)
- Accepted Unverified Risk (DEC-10): AC-002 and the grep/find part of AC-012: the real-CLI transcript rows of `grep_search`, `find_by_name` and `view_file` were not observed live because agy 1.5.15 no longer offers these tools. Proven instead by 243 live read-class steps (no miss, 120 of 120 parallel results matched), unit tests and the scripted case, whose rows I checked against the stored shapes DEC-10 lists and corrected (below). A different real shape makes the reader return a reason, log `AGY_TOOL_RESULT_UNRECOVERED` and keep the stream result.
- Fixture check (DEC-10): `view_file` now says `Showing lines 1 to 3` (it said `1-3 of 3`, the `read_file` wording); `find_by_name` now has `Found 1 results` before the paths; `grep_search` (timestamp header, then match lines) already matched. The CLI's own truncation marker on 14 stored `grep_search` rows is not in the fixture (its text is unknown to me). The scripted and unit tests still pass after the fixture change (NR-01..03, 4 of 4; the journal and Antigravity unit folders 648 passed).
- Next recipient: `delivery_engineer`
- Notes: the live runs used the real HOME and the host `agy` login and added synthetic conversations to the user's history.
