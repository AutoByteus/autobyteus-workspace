# API/E2E Coverage Investigation — AGY compaction detection and raw-trace rotation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/requirements-doc.md (SR-002, Approved)
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/investigation-notes.md (A01–A20)
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/probes/; solution-handoff.md
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-revision-record.md (IR-001, f615e5d06)
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: tickets/in-progress/agy-compaction-analysis/api-e2e-revision-record.md
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: tickets/in-progress/agy-compaction-analysis/api-e2e-test-case-ledger.md
- Current Investigation Round: 1
- Trigger: implementation_engineer "Implementation Complete" (IR-001)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

On AGY ≥ 1.2.16, each `step_update{step_type:"checkpoint", state:"DONE"}` must become exactly one rotation-eligible COMPACTION_STATUS (status `compacted`, provider `antigravity`, provider_event_id `checkpoint:<step>`, duration_ms), one marker and one archive segment (REQ-A01–A03). Detection is off below 1.2.16 or when the version is unreadable (REQ-A04). Other steps and runtimes are unchanged, and a duplicate step is idempotent (REQ-A05). Reopened history shows work since the latest compaction (BEH-A4). No migration; old AGY traces are untouched. `/compact` is unchanged (DEC-A01). Production path: design "Relevant Behavior And Production-Path Map".

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-A1 (auto compaction in a turn), SCN-A2 (multiple compactions), SCN-A3 (duplicate step, defensive), SCN-A4 (older/unknown version).
- Added real-use scenarios:
  - RU-1: the user reopens the run after a compaction (GraphQL history / app reopen).
  - RU-2: the run is terminated and restored after a compaction (new AGY process, same conversation), then continues. Converter state is fresh, so the next real step indices must not collide, and no spurious compaction may appear.
  - RU-3: the user watches the run in the app. AGY sends only a completed event, with no started phase, so the web must show one completed row.
- Unsupported/contrived: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-A1 / REQ-A01 checkpoint → boundary + rotation | Added | A15, A17 | replay unit; scripted E2E; live E2E (1 and 2 compactions) |
| BEH-A2 / REQ-A02/A03 one completed activity with duration | Added | design event spine | websocket payload (scripted + live); web spec + app journey |
| BEH-A3 / REQ-A04 version gate | Added | DEC-A04 | unit (capability, factory, converter); end-to-end gate-off through the real server (new) |
| BEH-A4 reopened history | Preserved reader, new consequence | — | scripted E2E; live GraphQL projection (new); app reopen |
| REQ-A05 others unchanged / duplicate idempotent | Preserved | — | AGY scripted suites; sweep vs base; duplicate unit tests |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | converter checkpoint branch; payload; version gate | unit tests | — | — |
| API / transport / contract | Yes | websocket COMPACTION_STATUS; GraphQL memory/history | scripted E2E (fake CLI) | real AGY stream timing | live E2E |
| Frontend component / state | No code change | single-phase provider payload consumed | existing web specs (Codex completed-only case) | AGY shape not in web specs | web spec + desktop |
| Process / lifecycle | Yes | version probe per launch; restore → new converter | factory unit | real restore | live restore |
| Persisted-data transition | Additive | new markers/archives for AGY | accumulator unit, scripted E2E | — | — |
| External integration | Yes | real `agy` 1.2.16 stream | recorded fixtures | live variance (turn of compaction, 2nd checkpoint) | live E2E |
| Browser / auth / desktop shell / workers | No | — | — | — | — |

## Project Execution Discovery

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis (f615e5d06).
- Testing guideline: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/TESTING.md (updated by this change with the AGY compaction fake/live rows). No closer TESTING*.md.
- Learned commands:
  - Server single file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`.
  - AGY fake: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
  - Live: one RUN_AGY_*=1 variable per file (`RUN_AGY_COMPACTION_E2E=1`).
  - Desktop: `pnpm --silent isolated-app start --build`; never the user's app or data.
- Secrets: the local `agy` login (operator AGY CLI at /Users/normy/.local/bin/agy, 1.2.16). AGY writes its own conversation data under ~/.gemini/antigravity-cli, as in the investigation probes. No AutoByteus user data is used.
- Pre-existing environment issue: the server `typecheck` script rootDir error; use `tsc -p tsconfig.build.json --noEmit`.

## Persisted Data Transition Coverage Basis

- Approved decision: no migration (design). Old AGY raw traces untouched. Evidence: the unchanged reader on new markers (scripted + live), and existing history suites at HEAD vs base.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Requirement | Validity | Action |
| --- | --- | --- | --- | --- |
| tests/unit/agent-execution/backends/antigravity/agy-compaction-checkpoint.test.ts (9) | real-frame replay, payload, gate off, duplicate, non-DONE | REQ-A01–A05 | Still Valid | run |
| tests/unit/runtime-management/antigravity-cli-capability.test.ts | version parse/compare, cache, unreadable | REQ-A04 | Still Valid | run |
| tests/unit/agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts | create/restore wiring on/off | REQ-A04 | Still Valid | run |
| tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts | AGY boundary rotates once; duplicate no-op | REQ-A01/A05 | Still Valid | run |
| tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts | scripted: websocket, 1 segment, history | AC-A01b, BEH-A4 | Still Valid | run |
| tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts | live ≥1 checkpoint, segments = checkpoints | AC-A01c | Needs Update | add live history (BEH-A4), restore (RU-2), optional 2-checkpoint target (SCN-A2) |
| other tests/e2e/runtime/agy-*-transport.e2e.test.ts + fixture | existing AGY behavior with the shared fixture | REQ-A05 | Still Valid | run |
| autobyteus-web agentStatusHandler.spec.ts | provider completed-only pairing (Codex) | BEH-A2 web | Still Valid | add AGY single-phase case |

## Durable Coverage To Add

| Case ID | Behavior | Evidence | Planned Path | Why |
| --- | --- | --- | --- | --- |
| E2E-G1 | Gate off end to end: fake CLI reports 1.2.15 and streams the checkpoint → no COMPACTION_STATUS, no marker, no segment, history keeps both replies | REQ-A04, AC-A04, SCN-A4 | tests/e2e/runtime/agy-compaction-gate-off-transport.e2e.test.ts (separate file: the version is cached per server process); fixture env `AGY_FAKE_VERSION` override | proves the probe → factory → backend → converter chain together |
| WEB-1 | AGY single-phase compacted payload → one completed row with duration source | BEH-A2 | autobyteus-web agentStatusHandler.spec.ts | the web had no AGY-shaped case |

## Durable Coverage To Update

| Case ID | Existing Path | Update | Evidence |
| --- | --- | --- | --- |
| E2E-L1 | agy-compaction-rotation-live.e2e.test.ts | after compaction: GraphQL history excludes pre-compaction work; terminate + restoreAgentRun, then a short turn completes with no new compaction and no error; optional `AGY_COMPACTION_E2E_CHECKPOINTS=2` to require a second checkpoint | BEH-A4, RU-2, SCN-A2 |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

Results are recorded in the ledger and the execution report.

| Order | Command | Scope | Result |
| --- | --- | --- | --- |
| 1 | vitest units (antigravity backend, capability, factory, accumulator) | REQ-A01–A05 | Pass (352 / 5 skipped) |
| 2 | `tsc -p tsconfig.build.json --noEmit` (+ full tsconfig filtered for TS6059: tests clean) | src types | Pass |
| 3 | all `tests/e2e/runtime/agy-*-transport.e2e.test.ts` + agy-native-image-step-output with the fake CLI (+ new gate-off file) | AC-A01b, AC-A04, REQ-A05 | Pass (45 / 1 pre-existing skip) |
| 4 | broad sweep HEAD vs base worktree (517409d40) | REQ-A05 | Pass (same 66 pre-existing failures; 2 first-run TEST_SERVER_BUILD_REQUIRED pass on rerun) |
| 5 | web specs (after `nuxt prepare`) | BEH-A2 web | Pass (29/29) |
| 6 | live E2E (`RUN_AGY_COMPACTION_E2E=1`), incl. 2-checkpoint run | AC-A01c, SCN-A2, BEH-A4, RU-2 | Pass (run 1; 2-checkpoint run 3 after a test-assertion fix) |

## Test-Case Ledger Decision

- Ledger required: `Yes` (multiple live and long-running cases). Path: api-e2e-test-case-ledger.md.

## Post-Repository Confidence Scorecard

Scored after repository and scripted checks, before live and desktop runs: requirements 90 %, directness 92 %, integration 90 %, environment 90 %, failure/lifecycle 90 %, user surface 85 %, durable coverage 95 %. Overall 90.3 %. User surface below 90 % → broader validation required. Final scores are in the execution report (95.0 %).

## Broader Validation Decision

- Decision: `Required` — executed: live AGY through the real server (1 and 2 checkpoints, history, restore), and a packaged desktop journey (isolated instance, AGY runtime: live row, reopen after restart, continue). Final 95.0 %.

## Temporary Executable Validation Plan

None planned beyond the desktop journey (driven via browser automation; durable automation of a quota-consuming desktop journey is out of proportion).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk |
| --- | --- | --- |
| AGY < 1.2.16 real binary | no older binary available (U04) | covered by the gate (fake CLI) |
| AGY compaction failure | not observable/triggerable (A16) | safe: no DONE → no rotation |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`; durable coverage added/updated: `Yes`; reroute: `No`.
