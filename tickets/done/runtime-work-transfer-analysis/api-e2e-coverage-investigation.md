# API/E2E Coverage Investigation — Claude Agent SDK compaction detection and raw-trace rotation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/requirements-doc.md (SR-013, Approved 2026-10-04)
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/investigation-notes.md (E52–E70)
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/solution-revision-record.md
- Design Spec (required on every route): /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/probes/ (real frame captures and probe scripts); solution-handoff.md
- Design Review Report: `N/A — not applicable` (direct Medium/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/implementation-revision-record.md (IR-001, commit 307d0e775)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-revision-record.md
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-test-case-ledger.md
- Current Investigation Round: 1
- Trigger: implementation_engineer "Implementation Complete: ready for direct API/E2E validation" (IR-001)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

Each real Claude compaction must be one operation: one started event and one completed or failed event, sharing one `provider_event_id` (REQ-023). A successful boundary must produce one rotation-eligible marker and one raw-trace archive segment (REQ-022). The marker must carry trigger, pre/post tokens and duration (REQ-024). A failed or abandoned compaction closes as failed, with the provider error when supplied, and never rotates (REQ-025). Reopened history shows only the segment after the latest compaction (BEH-011/CONF-001). Codex, AutoByteus and native compaction stay unchanged (REQ-014). No frontend change (DEC-020); no migration and no rewrite of historical Claude files (DEC-018). Production path: design-spec "Relevant Behavior And Production-Path Map".

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-017 (auto success, with keepalives), SCN-018 (manual `/compact`), SCN-019 (provider-reported failure, auto "too_few_groups" and interrupt "Request was aborted"), SCN-020 (turn settles/process exits with an open operation), SCN-021 (boundary without status).
- Real-use scenarios added from the implemented behavior:
  - RU-1: the user keeps working after `/compact` and later reopens the run. Trigger: a normal follow-up message, then a history load through the production reader (`LocalMemoryRunViewProjectionProvider`, used for every runtime by `AgentRunViewProjectionService`).
  - RU-2: the user presses Stop (websocket `INTERRUPT_GENERATION`) while `/compact` is running, then sends another message. Trigger: the real interrupt command, not the SDK call used by the probe.
  - RU-3: one run contains a failed auto compaction and later a successful one (E65 turn 2 → turn 3), so tracker state must carry correctly across turns.
  - RU-4: both Claude CLI executables AutoByteus can launch (PATH `claude` 2.1.283 and the SDK-bundled 2.1.280).
- Designer scenarios recorded as Unsupported/Contrived: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-008 / REQ-022 boundary detection + rotation | Changed | E54, design map | Prove with real frames (unit), and live `/compact` and live auto compaction through the AutoByteus websocket and recorder |
| BEH-009 / REQ-023 one operation per compaction | Changed | E55, E68 | Unit with synthetic keepalives in the real shape; live started/terminal pairing per provider_event_id; live keepalive only if a >30 s compaction can be produced |
| BEH-010 / REQ-024 metadata | Changed | E56 | Unit fixture values; live marker fields present with plausible values |
| REQ-025 failure / abandonment | Added | E65, E66 | Unit (tracker + session); live interrupt during `/compact`; live auto failure when the CLI produces one |
| BEH-011 / CONF-001 reopened history | Preserved reader, new consequence | E60 | Live run → production history reader shows only post-compaction work and one compaction activity |
| REQ-014 Codex/AutoByteus/native unchanged | Preserved | design | Existing Codex converter/projector, accumulator, run-history and native compaction suites; recorder adds fields only when present |
| `buildClaudeProviderCompactionEvent` | Removed | design legacy-removal | Confirm no references remain; obsolete converter tests already replaced |
| Web activity pairing | Preserved | E59, DEC-020 | Existing web specs plus the live websocket payloads captured in the live E2E |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | tracker state machine, converter payload, recorder optional fields | tracker, converter, session, accumulator unit tests | none material | — |
| API / transport / contract | Yes | websocket COMPACTION_STATUS payload (status, provider_event_id, error_message, metadata) | unit converter tests; gated live E2E (websocket) | live CLI frame timing/order through real AgentRun | Live API (gated E2E) |
| Frontend component / state | No (no web change) | consumes unchanged contract | agentStatusHandler spec (Claude pairing case), hydration spec | rendered row not exercised | Web spec re-run; browser not selected (see decision) |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes | close-on-settlement (interrupt, process exit, turn end) | session unit tests with fake SDK | real interrupt race with real CLI | Live API interrupt case |
| Persisted-data transition | Yes (additive) | marker tool_result optional fields; archive rotation now occurs for Claude | accumulator/session tests on real RunMemoryFileStore | reader on real rotated Claude data | Live run + history reader |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Claude CLI frames (2 CLI versions) | recorded fixtures (CLI 2.1.283) | bundled CLI 2.1.280 shapes; keepalive live | Live API on both CLIs |

## Project Execution Discovery

- Assigned worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis (branch codex/runtime-work-transfer-analysis @ 307d0e775)
- Project type: pnpm monorepo; Node/TypeScript server (Fastify, Vitest), Nuxt web, Electron shell.
- Project testing guideline: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/TESTING.md (no closer TESTING*.md under autobyteus-server-ts or autobyteus-web).
- Conflicting/missing instructions: TESTING.md lists `RUN_CODEX_E2E` and AGY flags but not `RUN_CLAUDE_E2E`; the Claude flag is documented in the live test file headers (tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts:33). `pnpm -C autobyteus-server-ts typecheck` is broken on the base by a rootDir config issue (implementation handoff); use `tsc -p tsconfig.build.json --noEmit`.
- Required secrets: Claude CLI login of the operator (used by the CLI itself, not by AutoByteus data). No AutoByteus app data is used. `Yes` (CLI authenticated; implementation smoke passed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| TESTING.md | Root testing guideline | Backend runtimes → server tests; one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; never use the user's running app or ~/.autobyteus; artifacts in the ticket folder |
| autobyteus-server-ts/tests/e2e/runtime/claude-agent-*.e2e.test.ts | Live Claude E2E convention | `RUN_CLAUDE_E2E=1`; harness `tests/e2e/helpers/claude-live-agent-harness.ts` (real AgentRun, backend, session, SDK, CLI, Fastify websocket on port 0); `useStandaloneClaudeCli` strips parent CLAUDE_CODE_* env |
| autobyteus-server-ts/tests/helpers/claude-cli-executable-candidates.ts | CLI candidates | `path-claude` (/Users/normy/.local/bin/claude 2.1.283) and `sdk-bundled-claude` (2.1.280) |
| autobyteus-server-ts/package.json | SDK pin | @anthropic-ai/claude-agent-sdk 0.3.280 |
| autobyteus-web/package.json | Web unit tests | `pnpm -C autobyteus-web test:nuxt <spec> --run` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Live Claude harness (Fastify + AgentRun + Claude CLI) | autobyteus-server-ts | started inside the Vitest test | port 0 on 127.0.0.1; haiku model; temp root under os.tmpdir() | websocket open | test afterEach closes session/app and removes the temp root |
| Base comparison worktree (regression delta) | /tmp/rwta-base (detached 39f2dd008) | `git worktree add --detach`; node_modules symlinked from the task worktree (same lockfile) | read-only use | — | `git worktree remove --force` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Real Claude frame shapes | tests/fixtures/claude-compaction/claude-compaction-frames.ts (from ticket probes) | verbatim probe data | durable |
| Run memory folder | temp dir per live case | never ~/.autobyteus | removed by afterEach; copies of key outputs kept in the ticket evidence folder |
| Claude workspace | temp dir per live case | scratch only | removed by afterEach |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` / no migration (design "Persisted Data / State Transition Decision").
- References: design-spec.md; implementation-handoff.md "Persisted Data Transition Check".
- Representative existing data: historical Claude raw traces with uuid-per-status `claude.status_compacting` markers and no archive. Required behavior: the unchanged reader still reads them (DEC-018, no rewrite).
- Evidence planned: existing run-history replay/projection suites (reader unchanged) plus a check that new markers are read by the same reader in the live run.
- Migration scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| tests/unit/.../claude/session/claude-compaction-operation-tracker.test.ts (9) | state machine on real frames, keepalives, failure, close, boundary-only | REQ-022–025, SCN-017–021 | Still Valid | matches design table | keep |
| tests/unit/.../claude/session/claude-session.test.ts "ClaudeSession compaction (real SDK frame shapes)" (5) | real frames → session → converter → accumulator → RunMemoryFileStore | AC-022a/b, AC-023, AC-024, AC-025 | Still Valid | | keep |
| tests/unit/.../claude/events/claude-session-event-converter.test.ts (operation-id cases) | payload shape per surface | REQ-023/024/025 | Still Valid | | keep |
| tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts (optional fields; Codex unchanged; Codex mid-turn rotation) | recorder additive fields; Codex marker keys unchanged | REQ-014, REQ-024 | Still Valid | | keep |
| tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts | live `/compact`, first CLI candidate only | AC-022c | Needs Update | covers only one CLI; no history, interrupt or auto case | update (see below) |
| tests/unit/agent-execution/backends/codex/** (converter/projector) | Codex compaction started/completed | REQ-014 | Still Valid | Codex code untouched | run |
| tests/unit/run-history/**, tests/integration/run-history/memory-layout-and-projection.integration.test.ts, tests/e2e/run-history/*, tests/e2e/memory/memory-view-graphql.e2e.test.ts | history reader, archive view | BEH-011, REQ-014 | Still Valid | reader unchanged | run |
| tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts | native compaction | REQ-014 | Still Valid | | run |
| autobyteus-web agentStatusHandler.spec.ts (Claude operation pairing case at :310) | started → completed by provider_event_id | BEH-009 web | Still Valid | | run |
| autobyteus-web runProjectionActivityHydration.spec.ts | history compaction rows hydrate | BEH-011 web | Still Valid | | run |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-02 | Reopened history after live `/compact` + follow-up shows only the latest segment and one completed compaction activity | BEH-011, CONF-001, RU-1 | claude-agent-compaction-rotation.e2e.test.ts (same case as E2E-01) | the reader consequence is the user-visible effect of rotation; only proven live end to end here |
| E2E-03 | Interrupt (websocket INTERRUPT_GENERATION) during live `/compact` → one failed operation with the provider error, no archive, run continues | REQ-025, SCN-019/020, RU-2 | same file, new case | real interrupt race cannot be proven by fakes |
| E2E-04 | Live auto compaction (CLAUDE_CODE_AUTO_COMPACT_WINDOW) → per-operation pairing invariant, auto trigger, archives = completed operations | SCN-017, SCN-019 auto, RU-3 | same file, extra opt-in flag `RUN_CLAUDE_AUTO_COMPACTION_E2E=1` (more tokens) | auto path differs from manual (boundary mid-turn) |
| E2E-05 | SIGKILL of the Claude CLI during live `/compact` → failed (process_exited) before the turn ERROR, no archive, run continues | REQ-025, SCN-020 | same file | added after the post-repository scorecard to close the lifecycle gap |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-01 | claude-agent-compaction-rotation.e2e.test.ts `/compact` case | run on every CLI candidate (not only the first) | RU-4, handoff "still yours" | cost: a few cents per candidate |
| WEB-01 | autobyteus-web agentStatusHandler.spec.ts | add Claude started → failed case on the same row with the provider error | REQ-025, BEH-009 web | the web had no Claude failed-pairing case |

## Durable Coverage To Remove

None. (The 3 obsolete uuid-per-status converter tests were already replaced by the implementation; verified in the commit diff.)

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/agent-execution/backends/claude tests/unit/agent-memory tests/unit/run-history --no-watch` | autobyteus-server-ts | Claude/memory/history units | Pass (504 passed; 14 failures in 4 unrelated files, pre-existing per order 3) | console |
| 2 | `pnpm exec tsc -p tsconfig.build.json --noEmit`; grep `buildClaudeProviderCompactionEvent` | autobyteus-server-ts | src types; legacy removal | Pass; 0 references | console |
| 3 | `vitest run` sweep (unit agent-execution/agent-memory/run-history/agent-streaming, integration agent-execution/agent-memory/run-history/native-compaction-root, agent-work-traces, e2e run-history/memory*) with `--reporter=json`, at HEAD and at base worktree /tmp/rwta-base (39f2dd008) | autobyteus-server-ts | REQ-014 regression delta | Pass: HEAD 1663 passed / 68 failed; base 1649 / 66; the same 66 fail on both; 2 HEAD-only = `TEST_SERVER_BUILD_REQUIRED` during the concurrent run, 2/2 pass in isolated rerun | api-e2e-evidence/sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log |
| 4 | `pnpm -C autobyteus-web test:nuxt services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/runHydration/__tests__/runProjectionActivityHydration.spec.ts --run` | repo root | web pairing (+ new Claude started→failed case) and hydration | Pass 24/24, 4/4 | console |
| 5 | `RUN_CLAUDE_E2E=1 RUN_CLAUDE_AUTO_COMPACTION_E2E=1 pnpm exec vitest run tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts --no-watch` | autobyteus-server-ts | live E2E-01..05 | Pass 7/7 (run 3) | api-e2e-evidence/live-e2e-run3.log |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent live cases with real model calls, each long-running and costly to repeat.
- Canonical ledger path: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-test-case-ledger.md

## Post-Repository Confidence Scorecard

Scored after repository checks and the live harness E2E (runs 1–2), before the desktop journey and E2E-05.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95 % | all ACs proven in unit (real frames) and live harness on both CLIs | reopened history in product | desktop journey |
| Changed-boundary execution directness | 95 % | real CLI frames through real session/recorder | — | — |
| Cross-boundary integration realism and mock gap | 90 % | live harness uses real AgentRun/websocket/recorder/history service | harness has no GraphQL/DB/server boot | packaged app |
| Environment, configuration, identity, and fixture fidelity | 95 % | both CLI executables, pinned SDK | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90 % | live Stop and auto failure; fake-SDK process exit | process exit live; keepalive live | kill CLI during `/compact`; long compaction attempt |
| User-surface, browser, and desktop-shell confidence | 88 % | web specs with Claude payload shapes | rendered rows, reopen | desktop journey |
| Durable regression coverage quality and relevance | 95 % | live E2E on all CLIs + Stop + auto | — | — |

- Overall post-repository confidence: 92.6 %
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `Yes` — user surface 88 %
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: product UI (live and reopened) and process-exit lifecycle not proven live.

## Broader Validation Decision

- Decision: `Required` — executed.
- Selected execution mode: Live API (gated Claude E2E on both CLIs, plus new E2E-05 process exit) and Project Desktop Validation (isolated instance of the worktree build: UI-01..03).
- Specific gap addressed: rendered Activity/Event Monitor rows live and after reopen; process-exit close live; GraphQL history path.
- Why the selected mode helps: it exercises the packaged renderer, GraphQL history hydration after restart, and the real CLI lifecycle.
- Final confidence after broader validation: 95.0 % (execution report).
- Browser-specific decision: browser-only probe not selected; the packaged desktop app exercises the same renderer plus real backend.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-01 | One attempt at a long (>30 s) compaction through the same live harness (larger context, slower model) | live keepalive suppression (AC-023 live) | expensive and non-deterministic duration; synthetic keepalive coverage stays durable |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live 30 s keepalive collapse | compactions ran 10–23 s (haiku/opus, up to 170K tokens); the keepalive only arms while a turn waits on a pending precomputed compaction (CLI 2.1.283 source) | Low: synthetic real-shape replay proves suppression; source shows timer cleared in `finally` before the boundary | none |
| `turn_ended_before_boundary` close live | no known real trigger (Claude reports aborts itself, E66) | Low: safety net, fake-SDK proof | none |
| Event Monitor "browse earlier" page live | needs >100 events | Low: deterministic probe (OBS-2) | none |

## Ambiguities Or Reroute Triggers

None at investigation start.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (live E2E file; one web spec case)
- Post-repository confidence: 92.6 %; final 95.0 %
- Broader validation decision: `Required` (live Claude on both CLIs + packaged desktop journey), executed
- Reroute Required Before Validation Execution: `No`
- Notes: none
