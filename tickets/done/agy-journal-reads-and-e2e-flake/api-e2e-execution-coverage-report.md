# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake/tickets/in-progress/agy-journal-reads-and-e2e-flake/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation engineer's direct-route handoff (code `806cb45831`, IR-001)
- Prior round reviewed: none; Deviations from the plan: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake/tickets/in-progress/agy-journal-reads-and-e2e-flake/evidence/api-e2e/

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `209e029e5a` (code identical to `806cb45831`; the new e2e file, one fixture case and TESTING.md committed with this round) | macOS arm64 | Node v22.23.1, pnpm 10.28.2, vitest 4.1.12; in-process real server, owned temp data dir | `env -i`, private HOME; scripted Antigravity CLI; the host was loaded throughout (load average 60-127, swap nearly full), the condition the ticket is about |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-02..05 | AC-001..008 | unit, solo runs at load, hook proof | implementation checks IMP-02, IMP-03, IMP-04, IMP-05 (`Reused`) | | Pass (reused) | implementation handoff rows | per those rows (`hookTimeouts=0` in all 20 lines of IMP-04) | code unchanged since `806cb45831` (`git diff 806cb45831 209e029e5a -- . ':!tickets'` is empty); IMP-04's 20 runs at load 62-127 are not repeated; my own reruns below add to them |
| UNIT | AC-001..007 | unit | `autobyteus-server-ts`: `pnpm exec vitest run tests/agent-work-journal tests/unit/e2e-helpers tests/unit/memory-search --no-watch` | ENV-1 | Pass | `API-03-unit-and-scripted-agy-reruns.log` | `Tests  288 passed | 2 skipped (290)` | |
| API-01 | AC-001, AC-003, AC-005, AC-006 | real server + scripted AGY | `autobyteus-server-ts`: `env -i PATH HOME=<fresh> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-agy-read-file-spill-scripted-agy.e2e.test.ts --no-watch` | ENV-1 | Pass (4 of 4 runs) | `API-01-scripted-agy-read-file-and-spill.log` | `✓ JR-01..02: read_file reads like view_file, a spilled output shows the preview and the marker, the later read is ordinary, an old-revision journal is re-rendered` | JR-01: the journal has `Command: sed -n '1,40p' /home/user/project/src/index.ts → ok` with `content not recorded: 40 lines, 1234 bytes`; the `ls -R` command's preview, `…[120 lines not recorded]`, then `…[full output was saved outside the raw trace: /home/user/.gemini/antigravity-cli/brain/abc/.system_generated/steps/2/output.txt]`; neither runtime sentence nor `file://`; the later read of the saved file as `Command: cat <path> → ok`; no line mentions `read_file`; the raw file still holds the recorded sentence and both `read_file` calls; the manifest counts the raw records. JR-02: the journal is rewritten as revision 3 wrote it (a `Tool: read_file …` line and the runtime sentence, revision 3 in the manifest); the next turn re-renders it, the stale lines are gone, the manifest says revision 4 |
| API-02 | AC-001, AC-003 | base-source probe | the same command with `src/agent-work-journal` checked out from `806cb45831^`, then restored | ENV-1 | Fail (expected) | `API-02-base-fails.log` | `AssertionError: the range read reads like view_file: expected '# Work Journal — run work_journal_neu…' to contain 'Command: sed -n \'1,40p\' /home/user/…'` (2 of 2 runs) | restored with `git checkout HEAD`; `git status` clean |
| API-03 | AC-007, AC-008 | two earlier scripted-AGY e2e files | each file solo, two runs: `work-journal-agy-schema-reads-scripted-agy`, `work-journal-neutral-vocabulary-scripted-agy` | ENV-1 | Pass (4 of 4) | `API-03-unit-and-scripted-agy-reruns.log` | `Tests  1 passed (1)` each | load average 64-78; no hook timeout and no discovery timeout; the 560 case still passes with its two changed assertions |
| API-04 | AC-007 | five other in-process-server files | solo: `task-copy-idle-lifetime`, `delegated-team-lazy-member-activation`, `project-change-feed`, `node-files`, `project-task-search` (e2e) | ENV-1 | Pass | `API-04-other-in-process-server-files.log` | `Tests  1 passed (1)`, `2 passed | 1 skipped (3)`, `7 passed (7)`, `5 passed (5)`, `4 passed (4)` | the files chosen prove that something does not happen or wait on events; the longer hook limit changed nothing for them |
| API-05 | AC-009 | stall reproduction | the implementer's scratch file (`evidence/D6-stall-reproduction.scratch.e2e.test.ts.txt`) copied to `tests/e2e/runtime/`, run once, deleted: a main-thread stall of 5, 9 and 12 s starting when the `--help` or `models` probe child is seen running | ENV-1 | Pass | `API-05-D6-stall-rerun.log` | six lines `run start {'success': True, 'message': 'Agent run created successfully.'}` and `RUNTIME_PROBE_TIMED_OUT lines: 0`, including a 12 s stall over the 10 s `--help` bound | I reproduce branch B: this stall mechanism makes no false timeout; the cause of the discovery timeout seen in other runs is not established (FU-3) |
| API-06 | all | typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-06-typecheck.log` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`, `[typecheck] PASS` | includes my new test file |
| AC-010 case | AC-010 | unit of the probe | not applicable: branch B, no false timeout, so no probe change | | Not Tested | | | the existing `probe-time-bound.test.ts` is inside the runtime-management folder, unchanged and not part of my reruns |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-02, renderer unit (IMP-01/02) | Proven | |
| AC-002 | No | renderer unit (skill read, failed read) | Proven (unit only) | |
| AC-003 | Yes | API-01, API-02, renderer unit | Proven | |
| AC-004 | No | renderer unit (error text, other wording, a preview with its own "Here is a preview" line, JSON-escaped, other runtimes) | Proven (unit only) | |
| AC-005 | Yes | API-01 (the later read of the saved file), renderer unit | Proven | |
| AC-006 | Yes | API-01 (JR-02, open file), service unit (closed file, raw bytes identical) | Proven | The founder's journals were not read; they re-render at their next turn or memory pass |
| AC-007 | Yes | helper unit tests (effective value 60000 vs 10000), IMP-05, API-03, API-04 | Proven | |
| AC-008 | No | IMP-04 (20 of 20 at load 62-127), API-03 (4 of 4 at load 64-78) | Proven | |
| AC-009 | No | API-05, IMP-06 | Proven: branch B | The discovery timeout's cause remains unestablished (REQ-006's open part, FU-3) |
| AC-010 | No | not applicable (branch B) | Not Applicable | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 93% | API-01..05, UNIT, IMP-02..05 | REQ-006's cause not established (a branch the design allows); AC-002/004 unit only | a recurrence with the probe line (FU-3) |
| Changed-boundary execution directness | 94% | 96% | API-01 through the real server; API-03/04 through the changed helper | | |
| Cross-boundary integration realism and mock gap | 88% | 90% | API-01 | scripted Antigravity; real step shapes measured upstream, not re-run | a live run |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | ENV-1 under real host load | | |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 92% | JR-02, API-02, API-05 | the discovery timeout can still recur | FU-3 |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface changed | | |
| Durable regression coverage quality and relevance | 92% | 94% | JR-01..02, the unit cases that fail on the base | | |

- Overall post-repository confidence: 91%; overall final confidence: 93%
- Calculation method: simple average of six applicable categories (final: 93+96+90+93+92+94 = 558/6 = 93.0%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (93%): the real Antigravity CLI was not run and the discovery timeout's cause is open
- Confidence-limiting residual risks: as above

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Live API` (real server, scripted CLI) and `Lifecycle` (the hook limit on a loaded host)
- Gap addressed: unit tests render hand-built records and cannot show the hook limit; the real-server case and the host-load reruns can
- Browser validation: not needed

## Persisted-Data Transition Checks

- Approved decision: `Discard or Rebuild` (a derived journal and its manifest revision); existing data used: a synthetic revision-3 open journal (JR-02) and a closed one (service unit); followed without a migration: `Yes`; version-specific branch or fallback observed: `No`; residual: the founder's journals, not read.

## Compatibility / Legacy Scope Check

- Backward compatibility in scope or observed: `No`; compatibility-only coverage: `No`

## Durable Coverage Changed In The Codebase

- Added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-agy-read-file-spill-scripted-agy.e2e.test.ts` | Added (gated by `RUN_AGY_FAILURE_E2E=1`) | API-01 |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated: case `journal_reads` (env `AGY_FAKE_SPILL_PATH`); other cases unchanged | API-01 |
| `TESTING.md` (committed on its own) | Updated: the in-process server helper owns the hook timeout | |

- Attached for test-code review: `Not Applicable`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted `agy-failure-cli.mjs` (`journal_reads`) | deterministic, no account | the real stream not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup | Result |
| --- | --- | --- | --- |
| temp data dirs and in-process servers | Yes | `afterAll` | removed |
| Base-source probe (API-02) | Yes | `git checkout HEAD -- src/agent-work-journal`, index reset, `git clean` of `src` | clean |
| Scratch stall file `tests/e2e/runtime/zz-d6-stall-scratch.e2e.test.ts` | Yes | deleted after the run | gone (`git status` shows only my fixture case and new test file before commit) |
| `/tmp/d6-stall-results.jsonl` (shared with the implementer's earlier run) | Partly | left in place | |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or user-only parts: `None`; REQ-006's cause remains open by the design's branch B (follow-up FU-3); the founder's journals were not read
- Next recipient: `delivery_engineer`
- Notes: TESTING.md edited as asked (commit `4a9c825ca4`). Delivery tells the user that the discovery timeout's cause is not established and FU-3 stays open.
