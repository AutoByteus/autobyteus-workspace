# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/journal-omit-agy-schema-reads/tickets/in-progress/journal-omit-agy-schema-reads/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `383bbf6ea5`, IR-001)
- Prior round reviewed: none; Deviations from the plan: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/journal-omit-agy-schema-reads/tickets/in-progress/journal-omit-agy-schema-reads/evidence/api-e2e/

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `f0901fa9b6` (code identical to `383bbf6ea5`; the new e2e file and one fixture line committed with this round) | macOS arm64 | Node v22.23.1, pnpm 10.28.2, vitest 4.1.12; in-process real server, owned temp data dir; `dist/` built for the e2e files that start a built server | `env -i`, private HOME; scripted Antigravity CLI (case `mcp_calls`) |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-03 | all | unit, typecheck | implementation check IMP-03 (`Reused`) | | Pass (reused) | implementation handoff row | per that row | code unchanged since `383bbf6ea5` (`git diff 383bbf6ea5 f0901fa9b6 -- . ':!tickets'` is empty) |
| UNIT | AC-001..006 | unit | `autobyteus-server-ts`: `pnpm exec vitest run tests/unit/memory-search tests/agent-work-journal --no-watch` | ENV-1 | Pass | (run output, not saved) | `Tests  263 passed | 2 skipped (265)` | independent rerun of the journal folder and the memory-search fingerprint units |
| API-01 | AC-001, AC-004, AC-005, AC-006 | real server + scripted AGY | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-agy-schema-reads-scripted-agy.e2e.test.ts --no-watch` | ENV-1 | Pass (5 of 5 runs) | `API-01-scripted-agy-schema-reads.log` | `✓ JS-01..03: a real-shaped schema read is omitted and the raw trace keeps it; another path is kept; an old-revision journal is re-rendered` | JS-01: the scripted CLI opens `/home/user/.gemini/antigravity-cli/mcp/autobyteus_agent_tools/delegate_task.json` with `view_file` then calls `delegate_task`: the journal has `Delegate task to /researcher` and no `Command: cat`, `view_file` or `.gemini` text; the raw file holds the read's `tool_call` and its `tool_result` (paired by id); the manifest's `source_record_count` equals the raw line count and its revision is current. JS-03 (same run): the journal is rewritten with the read as a line and revision 2; the next turn re-renders it: the line is gone and the manifest says the current revision; the raw file only grew. JS-02 (second run): the read of `/agy/mcp/...` (outside `.gemini/antigravity*`) stays: `Command: cat /agy/mcp/autobyteus_agent_tools/delegate_task.json` |
| API-02 | AC-001 | base-source probe | the same command with `src/agent-work-journal` checked out from `383bbf6ea5^`, then restored | ENV-1 | Fail (expected) | `API-02-base-fails.log` | `AssertionError: no line for the schema read: expected '# Work Journal — run work_journal_neu…' not to match /Command: cat|view_file|\.gemini/` (2 of 3 runs) | the third run failed earlier on an unrelated Antigravity model-discovery timeout (`Antigravity model discovery timed out`), which recurs under no particular pattern; restored with `git checkout HEAD`, `git status` clean |
| API-03 | regression | e2e | `vitest run tests/e2e/runtime/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts tests/e2e/memory tests/agent-work-journal`; then `pnpm build` and `tests/e2e/memory/episodic-catalog.e2e.test.ts` with `work-journal-restore-transport.e2e.test.ts` | ENV-1 | Pass (see Notes) | `API-03-regression-journal-memory-e2e.log` | after the build: `Test Files  2 passed (2)`, `Tests  8 passed (8)` | the first, parallel run (31 files) had 4 failures with causes found: EC-05, EC-06, EC-07 `Cannot find module .../dist/app.js` (I had not built `dist/`: my miss); EC-03 and the restore-transport hook `AGY exact background ownership discovery remains unconfirmed` / `Hook timed out in 10000ms`, an Antigravity process-discovery timeout under that load; both pass alone on the same code. Not related to the journal renderer |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (JS-01), API-02, IMP renderer unit | Proven | |
| AC-002 | No | IMP renderer unit (every read shape), UNIT | Proven (unit only; the real-server case uses `view_file`) | |
| AC-003 | Yes | IMP renderer unit (failed, non-DONE, result-less) | Proven (unit only: the scripted CLI emits no failed schema read in this case) | |
| AC-004 | Yes | API-01 (JS-02, a path outside `.gemini/antigravity*`), IMP renderer unit (repository mcp folder, spill read, skill file, two-file cat, other runtimes) | Proven | |
| AC-005 | Yes | API-01 (JS-01), IMP service unit | Proven | |
| AC-006 | No | API-01 (JS-03, open file), IMP service unit (closed file, unaffected file byte-identical), memory-search fingerprint unit | Proven | The founder's own journals were not read; they are re-rendered at their next turn or memory pass |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 94% | API-01, API-02, UNIT | AC-002/003 unit only | |
| Changed-boundary execution directness | 94% | 96% | API-01 through the real server and journal service | | |
| Cross-boundary integration realism and mock gap | 88% | 90% | API-01 | scripted Antigravity; the real CLI's step shapes for a schema read were measured upstream (investigation F-01/F-02), not re-run | a live run |
| Environment, configuration, identity, and fixture fidelity | 90% | 92% | synthetic paths in an owned data dir | | |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | JS-02, JS-03, API-02 | failed schema read not on a real server; startup catch-up unit only | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface changed | | |
| Durable regression coverage quality and relevance | 93% | 94% | JS-01..03, the unit cases that fail on the base | the Antigravity discovery timeout makes the new file occasionally flaky (1 in about 9 runs) | |

- Overall post-repository confidence: 92%; overall final confidence: 93%
- Calculation method: simple average of six applicable categories (final: 94+96+90+92+92+94 = 558/6 = 93.0%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (93%): the real Antigravity CLI and a failed read on a real server were not exercised
- Confidence-limiting residual risks: as above

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (real server, scripted CLI)
- Gap addressed: the unit tests render hand-built records; the real-server case proves the records the Antigravity runtime actually writes are matched and the revision re-render works in a running server
- Browser validation: not needed

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`; existing data used: a synthetic open journal written by the previous revision (JS-03) and a closed one (service unit); followed without a migration: `Yes`; version-specific branch or fallback observed: `No`; residual: none beyond the founder's own journals, not read.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-agy-schema-reads-scripted-agy.e2e.test.ts` | Added (gated by `RUN_AGY_FAILURE_E2E=1`) | API-01 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: one env line `AGY_FAKE_MCP_SCHEMA_PATH` for the `mcp_calls` view_file path (default unchanged; the neutral-vocabulary e2e still passes) | API-01 |

- Attached for test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`mcp_calls`) | deterministic, no account | the real stream not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| temp data dirs and the in-process server | Yes | `afterAll` | removed |
| Base-source probe (API-02) | Yes | `git checkout HEAD -- src/agent-work-journal`, index reset, `git clean` of `src` | clean (`git status`: only my fixture line and new test file) |
| `dist/` built for API-03 | Yes | kept (untracked build output) | |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or user-only parts: `None`; the founder's journals were deliberately not read
- Next recipient: `delivery_engineer`
- Notes: an Antigravity model-discovery timeout fails the new e2e file about once in nine runs and also appeared on a base run and under a 31-file parallel run; it is the scripted-AGY environment, not the journal, and is not attributed further.
