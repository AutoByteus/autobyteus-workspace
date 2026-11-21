# Requirements Document — agy-journal-reads-and-e2e-flake

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-journal-reads-and-e2e-flake`
- Request / ticket: Project Task `autobyteus-561` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): the three follow-ups of autobyteus-560 merged at the founder's request ("merge them into one ticket please and ask a solution designer to design a nice solution"): FU-1 `read_file` neutral rendering, FU-2 spilled-output reads, FU-3 the scripted-Antigravity E2E flake under load (autobyteus-562 merged in).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: Solution Designer within the direction (the Task states the intended behavior of each item); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: (1) Antigravity's current read tool `read_file` renders as a generic `Tool: read_file Path=… StartLine=… → ok` line while its predecessor `view_file` and every other runtime render a neutral `Command: cat -n …` line; (2) Antigravity's long tool outputs are recorded with a runtime sentence (and a private file path) as the result's text, and the agent's later reading of that file is an ordinary read line the journal cannot connect to anything; (3) two scripted-Antigravity E2E files fail intermittently under machine load with a 10 s hook timeout (and, in some runs, an Antigravity model-discovery timeout) for reasons that are not in the code under test (`investigation-notes.md` F-01…F-13).
- Desired outcome: (1) a read looks the same in the journal whichever Antigravity tool name recorded it; (2) a long output's journal entry says, in the neutral vocabulary Claude already uses, that the full output was saved outside the raw trace and where, and nothing real is dropped; (3) those E2E files stop failing for host-load reasons, by a rule that also protects the other server-starting test files.
- Observable success: a synthetic Antigravity trace with `read_file` renders as `Command: cat -n <path>`; a synthetic spilled `run_command` result renders its preview plus `…[full output was saved outside the raw trace: <path>]` and no runtime sentence; the two scripted-Antigravity files pass repeatedly under the load that failed them before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `read_file` is a generic tool line | The same converted line as `view_file`, including a range and "content not recorded: N lines, M bytes"; a read of a skill file is `Load skill` as on every runtime | Every other tool line; the 560 omission of MCP schema reads | F-01, F-02 |
| BEH-002 | System | SCN-002 | The result text is Antigravity's runtime sentence naming the spill file, then "Here is a preview…" | The preview, then one neutral marker naming the saved file; the runtime sentences are gone | Other result texts, outcome, `<truncated N lines>` handling | F-03, F-06 |
| BEH-003 | System | SCN-003 | A later read of the spill file is an ordinary read line | Unchanged (an ordinary read line, now neutral through BEH-001); a shell read keeps its recorded content | No read is hidden, no content dropped | F-04, F-05 |
| BEH-004 | Operational | SCN-004 | A file importing the in-process server helper keeps vitest's 10 s hook timeout; teardown takes up to 16.6 s on a busy host | Such a file's hooks may take as long as the in-process server's start and close take on a busy host (60 s, the project's constant) | Tests that prove something does not happen keep their own short windows; other files keep the defaults | F-07…F-12 |
| BEH-005 | Operational | SCN-005 | An Antigravity discovery timeout occurs rarely under load, cause unknown | The cause is established deterministically and handled by the rule that fits it (no retry, no fixed elapsed-time comparison) | The probe bounds and the diagnostics | F-13 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| Founder, agents using `search_memory` | A journal that records the work in one vocabulary | One read line, one long-output marker | Nothing real is hidden |
| The team (API/E2E, delivery) | Reliable gated suites | No load-only failures | No weakened assertions |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The Antigravity translation renders `read_file` and long-output results in the neutral vocabulary | SCN-001…003 |
| UC-002 | In-process-server test files and the scripted-Antigravity discovery path are reliable under host load | SCN-004, SCN-005 |

### Out Of Scope
Raw traces; other runtimes' tables; the 560 omission rule; Antigravity's wrapper lines in previews (`Created At`, `Completed At`, `Command exited…`); the `grep_search` result-file shape; the `.system_generated` read lines themselves (kept); the production probe bounds; the 119 files' own per-file timeouts that already use the constant; the host's load, swap and `fseventsd`; release.

### Non-Goals
Hiding spill reads; linking a read back to its originating call; changing vitest's defaults for files that do not start a server.

### Preserved Behavior Boundary
BEH-003; the 560 omission; the 331 lookup order; TESTING.md's file-watching rule.

### Prerequisites
None.

### Review Authority
As the template.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | `read_file` (`Path`, `StartLine`, `EndLine`) renders in the Antigravity journal exactly as `view_file` does (`Command: cat …` or `sed -n 'a,bp' …`, size-only results as "content not recorded: N lines, M bytes", a skill read as `Load skill`). | BEH-001 | Medium | F-01, F-02 | Same converter; shapes measured | FU-1 |
| REQ-002 | A recorded Antigravity result whose text is the "output was truncated … full output in a file at file://<path> … Here is a preview with the middle of the output truncated:" form renders as the preview followed by `…[full output was saved outside the raw trace: <path>]`; the two runtime sentences do not appear. A result in another wording is unchanged. | BEH-002 | Medium | F-03, F-06 | The Claude rule is the precedent; shape measured on 163 lines | FU-2, DEC-1 |
| REQ-003 | A read of a spill file stays visible as an ordinary read, with any recorded content. | BEH-003 | High | F-04, F-05 | Read | FU-2 ("cannot be hidden"), DEC-1 |
| REQ-004 | `WORK_JOURNAL_RENDERER_REVISION` is raised (3 → 4) so existing journals render again; raw traces are untouched. | BEH-001, 002 | Medium | 331 and 560 precedent | Read | DEC-2 |
| REQ-005 | Every test file that starts the in-process server through `startStudioE2eRuntimeServer` gets the project's in-process-server hook timeout without each file having to remember it. | BEH-004 | High | F-07…F-12 | Probe F-12 | FU-3, DEC-3 |
| REQ-006 | The cause of the Antigravity model-discovery timeout under load is established by a deterministic reproduction (not a rerun count); the fix, if any, is the one that cause calls for; no retry of a failed discovery and no comparison of elapsed time with a fixed bound is added. | BEH-005 | Medium | F-13; TESTING.md Rule 9 | Open (U-1) | FU-3, DEC-4 |
| REQ-007 | Raw traces are not altered. | BEH-001…003 | High | The Task | Read | The Task |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Synthetic Antigravity records: `read_file {Path, StartLine, EndLine}` with a size-only DONE result; and one with only `Path` | `Command: sed -n 'a,bp' <path> → ok (content not recorded: …)` and `Command: cat <path> → ok (…)`; the same lines `view_file` gives | Renderer unit tests; the existing `view_file` tests stay green |
| AC-002 | REQ-001 | SCN-001 | `read_file` of a path ending `skills/<name>/SKILL.md`; a failed `read_file` | `Load skill: <name>`; the failure line with its error | Unit tests |
| AC-003 | REQ-002 | SCN-002 | Synthetic spilled `run_command` result (the measured shape, synthetic path and preview) | The preview, then `…[full output was saved outside the raw trace: <synthetic path>]`; neither runtime sentence appears; outcome ok | Unit test |
| AC-004 | REQ-002 | SCN-002 | The same sentence in a failing result's error text; a result in another wording that mentions a path; a preview that itself contains a line starting `Here is a preview` | Error text normalized the same way; the other wording and the later line unchanged | Unit tests |
| AC-005 | REQ-003 | SCN-003 | The spilled call, then `read_file` and a shell `cat` of the same path | Both reads render as ordinary read lines; the shell read keeps its recorded content | Unit test |
| AC-006 | REQ-004, 007 | SCN-001 | A closed journal written by revision 3 on a synthetic run | It is rendered again by revision 4; the raw file is byte-identical | Service test (as 560's AC-006) |
| AC-007 | REQ-005 | SCN-004 | A test file that imports `startStudioE2eRuntimeServer` and has an `afterAll` taking longer than 10 s and shorter than 60 s | The hook passes; a file that does not import the helper keeps 10 s | A unit/architecture test of the helper's rule |
| AC-008 | REQ-005 | SCN-004 | The two scripted-Antigravity files (`work-journal-agy-schema-reads-…`, `work-journal-neutral-vocabulary-…`), each 10 runs solo at the same kind of load (load average ≥ 35, `fseventsd` busy) | No hook timeout. Report the load and the teardown times | Executed; evidence in the implementation handoff |
| AC-009 | REQ-006 | SCN-005 | A deterministic main-thread stall (a test-side `Atomics.wait` of 5, 9 and 12 s) during the run start's discovery | Which probe and bound fires is recorded; the result decides the fix (D-6) | Executed; report |
| AC-010 | REQ-006 | SCN-005 | If the stall produces a false `AGY_MODEL_DISCOVERY_TIMEOUT` for a child that answered | The probe returns the answer; a unit test of the probe with a stalled loop fails before and passes after | Unit test |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Antigravity agent | Read a file | `read_file` | An Antigravity run | read | A neutral read line | Supported Normal Scenario (measured) |
| SCN-002 | System | Antigravity agent | Run a command with long output | A long output | Same | run | Preview and marker | Supported Normal Scenario (163 lines measured) |
| SCN-003 | System | Antigravity agent | Read the full output | `read_file` or `cat` of the saved file | After SCN-002 | read | An ordinary read | Supported Normal Scenario |
| SCN-004 | Operational | Test runner | A gated suite on a busy host | Server start and close in hooks | Host load high | run | No hook timeout | Supported Normal Scenario (reproduced, F-07) |
| SCN-005 | Operational | Test runner | Same, discovery step | A run start | A stalled event loop | start | The answer, not a false timeout | Unclear until AC-009 (F-13) |

## UI, Interaction, And Experience Requirements
N/A — not applicable.

## Quality And Non-Functional Requirements
The rendering rules are pure (no I/O), as the renderer.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (derived): journal files and the manifest `renderer_revision`. Preserved: raw traces and everything else. Acceptable: one re-render and a re-index of the changed files (Antigravity journals with `read_file` or spill sentences; on the founder's node the spill sentence is in 46 files and `read_file` lines in a similar range of the 4,443 runs: counts only). No migration.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Antigravity CLI's spill sentence and `read_file` argument names | As measured (2026-11-20, CLI 1.x) | Not documented | A different wording leaves the text as today (U-2) |
| vitest `vi.setConfig({ hookTimeout })` at module load | Applies to later-registered hooks in the importing file | Probe F-12 (vitest 4.1.12) | A vitest upgrade could change it: AC-007 guards it |

## Supplemental Artifacts
`evidence/INV-01…INV-04` (scratch measurements).

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The founder's journals are representative of the spill wording on other nodes | One user's data | AC-004 keeps unmatched wording unchanged | Noted |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | How are spilled outputs shown? | (a) normalize the originating result to the Claude marker and leave the later read as an ordinary read; (b) label the later read "Output of step N"; (c) pair the later read with the originating call and render a link; (d) hide size-only spill reads as plumbing | (a): the sentence is the runtime text and the path in it is the only link between the preview and the later read; Claude's translation already does this, so one marker means one thing on every runtime (principle 11). (b) the step number is Antigravity-internal and appears nowhere else; (c) needs cross-entry state in a pure per-record renderer and fails across journal files; (d) hides the agent's real action and F-04 shows shell reads carry content, and the Task says real content cannot be hidden. Nothing is lost by (a): the preview stays, the later read stays | Solution Designer | Decided |
| DEC-2 | Raise the renderer revision again? | Without it, existing Antigravity journals keep the generic read lines and the runtime sentence until a user presses Rebuild | Raise it (3 → 4): the documented cache key for exactly this; one pass re-renders all runs and re-indexes only the files whose text changes (Antigravity files with these lines) | Solution Designer | Decided |
| DEC-3 | Where does the hook timeout live? | (a) the constant in each of the 115 files; (b) a global `hookTimeout` in `vitest.config.ts`; (c) the in-process server helper sets it for the files that import it | (c): the helper is the one start path of in-process servers (kept so by `tests/architecture/e2e-node-credential-paths.test.ts`), the rule is about exactly its start and close, one owner cannot be forgotten, the probe F-12 shows it works per file; (a) is 115 edits and recurs; (b) changes files that start no server, contrary to TESTING.md ("every other test keeps vitest's defaults"). The constant's doc is updated, and TESTING.md's sentence names the helper as the owner | Solution Designer | Decided |
| DEC-4 | The discovery timeouts | (a) add a retry; (b) raise the production bounds; (c) reproduce deterministically, then fix the cause | (c): TESTING.md Rule 9 and finding-the-cause: a rerun count is not a cause. (a) hides real failures; (b) changes product behavior without a cause. Design D-6 gives the two branches | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 002 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-003, 004 | SCN-002 |
| REQ-003 | UC-001 | BEH-003 | AC-005 | SCN-003 |
| REQ-004, 007 | UC-001 | BEH-001, 002 | AC-006 | SCN-001 |
| REQ-005 | UC-002 | BEH-004 | AC-007, 008 | SCN-004 |
| REQ-006 | UC-002 | BEH-005 | AC-009, 010 | SCN-005 |

## Architecture Phase Input
Preserve the 331 lookup order and the 560 omission; verify AC-009 first for REQ-006; the helper rule is proven (F-12).

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
