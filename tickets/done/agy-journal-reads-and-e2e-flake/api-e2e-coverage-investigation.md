# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..007, AC-001..AC-010); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md` (D-1..D-6); Supplemental: `solution-designer-handoff.md`, `follow-ups.md`
- Design / Architecture / Code Review reports: `N/A — not applicable` (Medium / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..06); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round 1; Trigger: implementation engineer's direct-route handoff, code `806cb45831`, tip `209e029e5a` (documents only after the code commit); Prior investigation: none

## Current Requirement And Design Basis

Three changes. (1) The Antigravity journal translation renders `read_file {Path, StartLine, EndLine}` like `view_file` (`Command: cat …` / `sed -n 'a,bp' …`, size-only results, skill loads). (2) Antigravity's "output was truncated … file://<path> … Here is a preview with the middle of the output truncated:" result text becomes the preview then `…[full output was saved outside the raw trace: <path>]` (matched at the start of the text only); the later read of the saved file stays an ordinary read. `WORK_JOURNAL_RENDERER_REVISION` 3 → 4. (3) `studio-runtime-test-server.ts` sets the 60 s hook timeout at module load, so every file importing it gets it; D-6: reproduce the discovery timeout with a deterministic main-thread stall and let the result decide (branch B: no change, evidence printed on recurrence, follow-up kept). The implementer left to API/E2E: the TESTING.md edit, a built-server case of a spill, a sample of other in-process-server files, and memory search after the bump.

## Supported Scenarios And Real Usage

- SCN-001 (read_file), SCN-002 (a long output), SCN-003 (the later read), SCN-004 (a gated suite on a busy host), SCN-005 (discovery under a stalled loop). Real triggers: an Antigravity agent's turn through the real server and journal service; the suites run on this host, which is itself under heavy load (load average 60-127, swap full).
- Not tested: none recorded as unsupported.

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage |
| --- | --- | --- | --- |
| `read_file` reads like `view_file` | Changed | AC-001, AC-002 | renderer unit (IMP); real-server JR-01 |
| Spill sentence → preview + marker; later read ordinary | Changed | AC-003..005 | renderer unit; JR-01 |
| Revision 3 → 4 re-render | Changed | AC-006 | service unit; JR-02 |
| Hook timeout owned by the helper | Changed | AC-007, AC-008 | unit (effective value), implementer's 20 solo runs, my reruns, five other files |
| Discovery timeout under a stalled loop | Investigated | AC-009 | the stall rerun |
| A failed or result-less `read_file` is now `Command: cat` | Changed (560 assertions updated) | | unit |

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | journal renderer, normalizer | journal unit folder (256 passed) | the records Antigravity's runtime really writes through the real server | Real server, scripted CLI |
| Persisted-data transition | Yes (`Discard or Rebuild`: a derived journal and manifest revision) | journal files | service unit | an old-revision journal on a real server | JR-02 |
| Test infrastructure / process | Yes | vitest hook timeout of 119 files, the probe bound | helper unit tests, implementer solo runs | files whose assertions rely on a short hook limit; the stall | spot checks; stall rerun |
| Other surfaces | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake` (branch `codex/agy-journal-reads-and-e2e-flake`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake/TESTING.md` ("When this file may be updated", "File watching on a busy Mac", "Runtimes without a model", Rule 9); `DESIGN.md`; `AGENTS.md`. Conflicts: none. Secrets: none.
- Components: in-process studio runtime server with an owned data dir (`startStudioE2eRuntimeServer`), scripted AGY CLI; cleanup in `afterAll`. Synthetic paths only (`/home/user/...`).

## Existing Durable Coverage Inventory

| Path / Test | Intent | Decision | Action |
| --- | --- | --- | --- |
| `tests/agent-work-journal/rendering/antigravity-read-file-and-spills.test.ts`, `services/work-journal-agy-read-file-and-spills.test.ts`, `tests/unit/e2e-helpers/*` | AC-001..007 | Still Valid (new, written first against the base: 9 of 12 fail there) | rerun |
| `work-journal-agy-schema-reads-scripted-agy.e2e.test.ts` (560), `work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts` | scripted Antigravity journals | Still Valid (two 560 assertions changed meaning, unit-level) | rerun |
| Other in-process-server e2e files (119 import the helper) | their own behavior | Still Valid | sample five that prove something does not happen or wait on events |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-02/03/04/05 | AC-001..008 | unit, typecheck, solo runs, hook proof | Reused | implementation checks IMP-02..05 | code unchanged since `806cb45831`; IMP-04 is the load run I cannot cheaply repeat 20 times |
| UNIT | AC-001..007 | unit | Existing Test | journal, e2e-helper, memory-search folders | independent rerun |
| API-01 (JR-01..02) | AC-001, 003, 005, 006 | real server + scripted AGY | Durable | read_file with a range, a spilled run_command, a read of the saved file, an old-revision journal re-rendered | the path the unit tests cannot show |
| API-02 | same | base-source probe | Temporary Probe | production `agent-work-journal` at the parent of the code commit | the case fails without the change |
| API-03 | AC-007, 008 | the two earlier scripted-AGY files, twice each, at load | Existing Test | solo runs | independent check of the hook limit |
| API-04 | AC-007 | five other in-process-server files | Existing Test | solo runs | the longer hook limit changes nothing for them |
| API-05 | AC-009 | stall reproduction | Existing Test (the implementer's scratch file, rerun) | six stalls | independent confirmation of branch B |
| API-06 | all | typecheck | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | new test files |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/work-journal-agy-read-file-spill-scripted-agy.e2e.test.ts` and a `journal_reads` case in `tests/fixtures/agy-failure-cli.mjs` (env `AGY_FAKE_SPILL_PATH`) | the built path, with the spill and the later read |

Update / remove: none. TESTING.md gets one rule edit (the helper owns the hook timeout), committed on its own.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? |
| --- | --- | --- | --- |
| A live Antigravity run | no real account used | the real step shapes were measured upstream (investigation F-01..F-06), not re-run | No |
| Memory search catch-up after the bump | its fingerprint includes the renderer revision (`rawTraceFingerprint`), unit-covered; same as the 560 ticket | low | No |
| The cause of the discovery timeout | not established by branch B | an occasional load-only failure remains possible in scripted-Antigravity files | No (follow-up FU-3) |
| The founder's journals | not read, by constraint; they re-render at their next turn or memory pass | | Yes (the user's data) |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
