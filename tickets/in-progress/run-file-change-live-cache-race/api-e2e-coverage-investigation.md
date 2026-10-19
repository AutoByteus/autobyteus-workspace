# API/E2E Coverage Investigation — run-file-change-live-cache-race (autobyteus-180)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results and confidence go in the execution coverage report.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002, `Ready`, `Small` / `Low`)
- Supplemental Task Artifacts: `probes/race-disk-probe.test.ts.txt`, `probes/race-disk-probe-run1.txt`; the original FU-C probe (autobyteus-153 evidence `API-08-run-file-change-cache-race.probe.test.ts`)
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route) from `/software_engineering_team/implementation_engineer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/` unless written in full.

## Current Requirement And Design Basis

`RunFileChangeService.load` fills an attached run's live cache after its stored read only if the cache is still empty; otherwise it returns the newer cache; a run detached meanwhile is not cached (DEC-001). Result:
- A first read that overlaps a run's first FILE_CHANGE no longer hides the file from later live reads (REQ-001, AC-001).
- The next FILE_CHANGE no longer persists a stale projection, so `file_changes.json` keeps every entry, also after the run stops (REQ-002, AC-002).
- The owner-scoped E2E reads live without its stored-record wait and stays green over at least 10 runs (REQ-003, AC-003).
- Non-overlapping reads, events and detach behave as before (REQ-004, AC-004).
- Reads never wait for the event queue (QR-001).

Persisted data: `Directly Usable — No Migration` (shape and reader unchanged; past losses not repaired, DEC-002).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003.
- Real-use scenarios added: SCN-001 through the browser stack — the probe's seed now reads each running agent's owner list live while the agent records its first file (the same overlap a hydrating Artifacts tab produces), then the desktop and mobile journeys open those files.
- Contrived (not tested): R-001, a run detached and re-attached within one disk read (accepted in the design).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 live list after an overlapping first read | Changed | DEC-001; IMP-01 red on base | Unit (reused), original FU-C probe on the fix, real-server E2E loop |
| BEH-002 saved record after the next file change | Changed | DEC-002 | Unit AC-002 (reused); E2E checks the saved lists after stop |
| BEH-003 non-overlapping reads | Preserved | — | Unit/integration (reused); other gated E2E files; browser probe |
| BEH-004 detach | Preserved | — | Unit (reused) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `RunFileChangeService.load` | IMP-01, IMP-03 (gated store read, real service) | Real event timing | Gated E2E loop |
| API / transport / contract | No (unchanged surfaces; behavior behind them changes) | GraphQL/REST reads of running agents | IMP-06 | Live reads of real running roots | Gated E2E |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Indirect | Lists the Artifacts tab hydrates | — | Files missing in the UI | Browser probe (owner-scoped-file-reads) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Indirect | as above | — | — | Browser probe |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Attached vs detached run (stop) | Unit detach tests | Real stop after overlap | Gated E2E (stops roots) |
| Persisted-data transition | Yes (protected from future loss) | `file_changes.json` writes | Unit AC-002 | Real write path | Gated E2E saved lists after stop |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race`, branch `codex/run-file-change-live-cache-race`
- Project type and runtime stack: pnpm monorepo; server Node 22/Fastify; web Nuxt 3
- Project testing guideline path(s): `TESTING.md` (root; no closer `TESTING*.md`)
- Conflicting, missing, or unclear project instructions: none
- Required environment variables or secrets available: `N/A` (scripted AGY runtime)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Layers, environments, rules | Server E2E under `env -i`; worktree `dist`; browser probe owns its stack; rerun by impact; Rule 9 |
| Gated E2E headers | Gate and command | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch` |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` header | Probe usage | `--seed-to <dir> --unrelated N`, then `--from-seed <dir> --output-dir <dir>` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` (done, exit 0) | — | exit 0 | — |
| Nuxt types | worktree | `pnpm -C autobyteus-web exec nuxt prepare` (done, exit 0) | — | exit 0 | — |
| In-process E2E servers | worktree | vitest harness | own temp HOME/data | harness | harness `close()` |
| Probe stack | worktree | probe | own ports, data root, HOME | probe readiness checks | probe cleanup receipt |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Running Team/Org/hub roots that write files | Harness + scripted AGY (`GENERATE_IMAGE:`, `WRITE_FILE_HOLD:`) | Test-owned | Harness |
| Probe seed | Probe `--seed-to` through public APIs | Under `/tmp/rflcr-api/` | Removed after the run |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- References: design spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: the reader is unchanged; existing records are read by the same normalizer (IMP-06 reads pre-written `file_changes.json` files; the probe reads records written while runs ran and after they stopped)
- Evidence planned: IMP-06 (reused), API-03 saved lists after stop, API-05 journeys on stopped runs
- Migration-specific scenarios: N/A
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts` (3 new + existing) | Overlap, second change, concurrent first reads; detach and non-overlap cases | AC-001, AC-002, AC-004 | Still Valid | IMP-01 red on base, IMP-03 green | Reuse |
| `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` | Owner reads of running/stopped members, now without the stored-record wait | AC-003 | Still Valid | Diff read; IMP-04/IMP-05 | Run my own loop (API-03) |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | Standalone/team reads incl. the active-run live regression | AC-004 | Still Valid | IMP-06 | Reuse |
| `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` | Copy live/stored lists and content | BEH-003 (live reads of a running hub's copy) | Still Valid | Read | Run (API-04) |
| `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` | Containment | BEH-003 (reads of stopped runs) | Still Valid | Read | Run (API-04) |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Seed waits for the stored record before reading live (FU-C workaround, comment names the race) | REQ-003 spirit; SCN-001 through a browser stack | Needs Update | Lines 188-233 | Remove the stored-record wait; read the owner list live as the agent writes (API-05) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-004, QR-001 (unit/integration), typecheck | Server unit, integration, typecheck | Reused | IMP-01, IMP-02, IMP-03, IMP-06 | Ran on `c2bd6991b0` (IMP-01 on base src + new tests); `e44a2de1b1` adds only ticket docs |
| API-02 | AC-001 (independent) | `RunFileChangeService` | Temporary Probe | The original FU-C probe (autobyteus-153 API-08) unchanged except its last assertion inverted to the fixed expectation, run on `c2bd6991b0` | The probe the defect was filed with; durable equivalents exist (IMP-01) |
| API-03 | AC-003, REQ-001, REQ-002 (real server) | Real HTTP/GraphQL, running then stopped roots | Existing Test (loop) | `owner-scoped-member-file-changes.e2e.test.ts` × 10 consecutive runs, `env -i`, fresh temp HOME per run | Independent AC-003 evidence |
| API-04 | AC-004 / BEH-003 | Real HTTP/GraphQL | Existing Test | `agent-run-collaboration-member-file-changes.e2e.test.ts`, `standalone-unreadable-tree-containment.e2e.test.ts` | Other real-server reads through the changed service |
| API-05 | SCN-001 through the browser stack; BEH-003 | Probe-owned real stack | Durable (update) + run | Probe seed reads live (no stored-record wait), then T-API + B-001..B-007 on a small seed | Removes the last FU-C workaround; proves user-visible lists and files |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-05 | `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Seed: drop `storedPathsOf` and the stored-record wait; wait on the owner's live list (the race the fix covers) | Same as the E2E change in `c2bd6991b0` |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (not affected).
- Testing guideline: TESTING.md "Choosing the path".
- Web-equivalent behavior: the Artifacts lists the server returns; checked with the browser probe.
- Shell-specific behavior: none.
- Approach: browser probe on a probe-owned stack.
- How the run avoids disturbing a running desktop app: own ports, data root and HOME.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| A browser hydration that overlaps the first file change in the same millisecond | Not forceable through the UI; the overlap is forced deterministically in unit tests (IMP-01) and occurs naturally in the server E2E and probe seed (live reads while writing) | Low | No | None |
| R-001 re-attach within one disk read | Contrived (design) | — | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (probe update)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: none
