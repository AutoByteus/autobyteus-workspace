# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source/architecture review passed commit `49f6c107`; API/E2E and broader executable validation requested.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

Future Codex App Server runs must normalize every adjacent non-empty reasoning item in one turn to one allocator-owned reasoning block until a transcript-producing item, assistant text, turn lifecycle boundary, or terminal error occurs. Maintenance/status/progress/compaction and unknown ignored notifications must preserve the block. Content must occur exactly once and in source order, completed provider items must be separated by one blank line, and post-boundary reasoning must use a fresh collision-safe normalized ID even when provider identity is absent or repeated. The same normalized facts must persist as one trace per block, project through GraphQL, and hydrate to the same number/order of Thinking blocks. Pre-fix history and `item/reasoning/summaryTextDelta` modernization are explicitly excluded. A current live GPT-5.6-Sol run must be observed for duplicate completed snapshots or a content gap; either observation is design impact rather than test-stage reconciliation.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Provider item ID versus normalized reasoning identity | Changed | `REQ-CTB-002`, `REQ-CTB-008`; reviewed design allocator invariants | Prove several adjacent provider IDs yield one normalized ID. |
| Completed-fragment joining | Changed | `REQ-CTB-005`; UI spec | Prove exact-once ordered content with `\n\n` only between completed provider items. |
| Transcript/lifecycle boundary disposition | Changed | `REQ-CTB-003`; design event-family matrix | Prove tool/text/approval/raw-output/turn/error clear and maintenance/status/progress preserve. |
| Memory, GraphQL, and hydration consumers | Preserved | `REQ-CTB-004`–`005`; implementation handoff | Prove unchanged consumers expose future corrected normalized facts one-to-one. |
| Pre-fix history | Preserved out of scope | Approved requirements and handoff | Do not add remediation or compatibility coverage. |
| `summaryTextDelta` handling | Preserved out of scope | Requirements and code review residual risk | Observe live cadence only; reroute if completed snapshots duplicate or content is missing. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Codex raw-event normalization state and IDs | Tracker/converter unit suites | Installed current runtime cadence | Live API/CLI |
| API / transport / contract | Indirectly | GraphQL consumes corrected persisted facts; schema unchanged | Existing GraphQL projection E2E uses synthetic normalized events | Actual converter -> persistence -> GraphQL chain for adjacent items | Durable GraphQL E2E |
| Frontend component / state | Indirectly | Generic live handler/hydrator consume one ID/row | Changed handler test; existing hydration tests | Browser DOM is not the changed authority | Repository web tests; browser not required if contract evidence is direct |
| Browser integration / user journey | No production change | Web-equivalent display follows segment/projection identity | Nuxt unit coverage | No browser-specific API, routing, storage, or style change | None unless repository evidence fails |
| Authentication / session / permissions | No | N/A | N/A | None | None |
| Desktop renderer / web-equivalent UI | Indirectly | Same Vue consumer as browser | Nuxt handler/hydration tests | Actual Electron shell adds no semantic boundary | None |
| Desktop shell / Electron-specific integration | No | N/A | N/A | None | None |
| Process / lifecycle | Yes | Turn/error clear and converter-instance namespace | Converter matrix and tracker tests | Real Codex process notification cadence | Live Codex app-server |
| Persisted-data transition | No migration; future writes affected | Existing writer receives corrected IDs | Accumulator unit and projection integration coverage | Full converter -> writer -> GraphQL future path | Durable GraphQL E2E |
| Worker / queue / distributed coordination | No | Recorder queue only, unchanged | Recorder idle/persistence tests | None material | None |
| External integration | Yes | Installed/authenticated Codex CLI/app-server | Env-gated live suites exist | Current GPT-5.6-Sol adjacent-item and snapshot cadence | Live API/CLI |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks`
- Project type and runtime stack: pnpm monorepo; TypeScript Fastify/GraphQL/WebSocket server; Nuxt/Vue frontend and Electron wrapper; Vitest.
- Conflicting, missing, or unclear project instructions: server `typecheck` has a known pre-existing `TS6059` test-tree/rootDir mismatch; production TypeScript is validated with `tsconfig.build.json`. No conflict for selected suites.
- Required environment variables or secrets available: `Yes` — authenticated Codex CLI is present; no secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`. |
| `autobyteus-server-ts/README.md` | Server run/E2E environment | `RUN_CODEX_E2E=1` enables live suites; live suites use temporary app-data; build/run commands and `.env` requirements documented. |
| `autobyteus-web/AGENTS.md` | Closest frontend instruction | Prefer `pnpm test:nuxt ... --run`; frontend trusts backend segment identity. |
| `autobyteus-web/README.md` | Browser/Electron development and testing | Browser dev mode is available, but shell execution is only relevant for shell-specific behavior; use Nuxt tests for generic renderer state. |
| `autobyteus-server-ts/package.json`, `autobyteus-web/package.json` | Authoritative scripts | Server Vitest/build scripts; Nuxt test and build scripts. |
| `autobyteus-server-ts/vitest.config.ts` | Test environment | `.env.test`, test setup, and repository include rules. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Repository server tests | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Uses repository dependencies and temporary test state | Vitest exit code | Vitest exits; test hooks remove temp dirs |
| Frontend tests | `autobyteus-web` | `pnpm test:nuxt --run ...` | Nuxt generated state is ignored | Vitest exit code | Vitest exits |
| Codex app-server | Spawned by live Vitest | `RUN_CODEX_E2E=1 CODEX_MEMORY_E2E_MODEL=gpt-5.6-sol ... vitest run ...` | Installed `codex-cli 0.144.1`; existing ChatGPT login; test-owned workspace/memory temp dirs | Backend startup promise and turn completion | Test hook terminates threads, closes client, removes temp dirs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Future standalone run memory | `mkdtemp`, `AgentRunMemoryRecorder`, `RunMemoryWriter` | Never touches default `~/.autobyteus` history | Test hook removes temp dirs |
| GraphQL run metadata | `AgentRunMetadataStore` in test app-data | Isolated custom app-data directory | E2E suite removes directory |
| Current GPT-5.6-Sol identity | Codex model catalog plus `CODEX_MEMORY_E2E_MODEL` | Uses existing authenticated local Codex account; no credentials copied | Ephemeral test thread terminated |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design section “Persisted Data / State Transition Decision”; handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: no old-data migration. A future run generated from corrected normalized events must write one reasoning trace per contiguous block and be directly readable by unchanged projection/hydration consumers.
- Evidence planned: actual converter events recorded through the unchanged accumulator and read through the GraphQL schema; live test-owned memory inspected after a real current Codex turn.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/.../codex-reasoning-block-tracker.test.ts` | Allocation, adjacency, separators, clear, missing ID, instance namespace, eviction | `AC-CTB-002`, `004`, `008`, `009` | Still Valid | Reviewed implementation test | Execute. |
| `tests/unit/.../codex-reasoning-block-converter.test.ts` | Supported reasoning families and complete clear/preserve matrix | `AC-CTB-002`–`004`, `007`, `009` | Still Valid | Reviewed matrix matches design | Execute. |
| `tests/unit/.../codex-thread-event-converter.test.ts` | Broad existing Codex event regression behavior | `AC-CTB-007` | Still Valid | Existing durable suite | Execute affected file. |
| `tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | One trace for repeated normalized ID; boundary trace split; compaction behavior | `AC-CTB-005`–`009` | Still Valid | Changed focused test plus existing lifecycle tests | Execute. |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Recorder -> raw trace -> local projection order | `AC-CTB-005`, `007`, `008` | Still Valid | Real file persistence with synthetic normalized events | Execute, but does not itself drive raw Codex conversion. |
| `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Runtime writes -> GraphQL projection preserves reasoning/tool/text order | `AC-CTB-005`, `006` | Needs Update | Current setup starts at normalized events and lacks adjacent provider items | Add one actual converter -> persistence -> GraphQL scenario. |
| `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Real Codex turn persists raw traces/snapshot | `AC-CTB-003`, `005`, `008` | Needs Update | Existing prompt proves persistence but not raw/provider versus normalized reasoning identity | Add gated cadence/one-ID/one-trace observations and exact model selection. |
| `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Repeated same-ID reasoning events create one ThinkSegment | `AC-CTB-003`, `006` | Still Valid | Generic consumer contract | Execute. |
| `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Projection reasoning rows hydrate to ThinkSegments | `AC-CTB-005`, `006` | Still Valid | Generic reload contract | Execute. |
| Pre-fix history fixtures | Preserve historical rows as stored | Explicit out-of-scope decision | Out Of Scope | Requirements/handoff | Do not change. |

## Stale Or Obsolete Coverage Decisions

None. The implementation already removed the obsolete provider-ID tracker test with its source. No API/E2E coverage asserts pre-fix remediation or invalid compatibility behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `CTB-E2E-01` | Three adjacent provider reasoning items -> one normalized block -> one raw trace -> one GraphQL row; compaction preserves; tool boundary -> fresh second block | `REQ-CTB-002`–`005`, `008`; `AC-CTB-003`–`006`, `008`, `009` | `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | Closes the current mock gap between raw converter behavior and unchanged API/reload consumers. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `CTB-LIVE-01` | `tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Capture raw completed reasoning item IDs and normalized reasoning events; assert a no-tool turn has one normalized ID/trace and exact-once concatenated content; emit reproducible cadence evidence | `AC-CTB-003`, `005`, `008`; live residual risk from code review | Remains env-gated; assertions do not require a stochastic minimum provider-item count. Exact run uses `gpt-5.6-sol`. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-tracker.test.ts tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts --no-watch` | Worktree root | Changed normalization, lifecycle matrix, recorder/projection integration | Pass — 6 files / 121 tests | `evidence/focused-server-and-persistence.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts --no-watch --reporter=verbose` | Worktree root | `CTB-E2E-01`: provider events -> converter -> persistence -> GraphQL | Pass — 1 file / 6 tests | `evidence/ctb-e2e-01-graphql.log` |
| 3 | `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/runHydration/__tests__/runProjectionConversation.spec.ts` | `autobyteus-web` | Generic live one-ID state and reload hydration | Pass — 2 files / 29 tests | `evidence/frontend-live-hydration.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts --no-watch` | Worktree root | Run/team-member converter-instance and turn isolation | Pass — 1 file / 37 tests | `evidence/isolation-regression.log` |
| 5 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex tests/unit/agent-memory tests/unit/run-history tests/integration/agent-memory tests/integration/run-history tests/e2e/run-history --no-watch` | Worktree root | Broader affected Codex, memory, run-history, integration, and API regressions | Pass — 54 files / 367 tests | `evidence/broader-affected-server.log` |
| 6 | `git diff --check` | Worktree root | Test/artifact patch hygiene | Pass | Command output recorded in stage notes |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Every AC has mapped repository evidence; `CTB-E2E-01` closes future persistence/GraphQL semantics | Current external cadence not yet included at this checkpoint | Live exact-model run |
| Changed-boundary execution directness | 95% | Direct converter/tracker/matrix execution and actual converter-to-GraphQL test | Installed provider process not yet included at this checkpoint | Live exact-model run |
| Cross-boundary integration realism and mock gap | 93% | Real files, accumulator, GraphQL schema, and frontend state/hydration execute | Provider payloads are fixtures in repository API scenario | Live exact-model run |
| Environment, configuration, identity, and fixture fidelity | 92% | Isolated temp app-data and real repository services | External exact-model process not yet included at this checkpoint | Live exact-model run |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Complete clear/preserve matrix, missing/repeated IDs, error/lifecycle, compaction and 367-test broader run | No material changed-path gap | None material |
| User-surface, browser, and desktop-shell confidence | 95% | 29 direct generic live-state/hydration tests; no UI or shell production change | Visual screenshot not rerun | None material; browser would be redundant |
| Durable regression coverage quality and relevance | 97% | Narrow requirement-linked additions plus broad regression pass | Proportional test-code review remains downstream | Code review |

- Overall post-repository confidence: `95.0%`
- Calculation method: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `Not yet — current provider cadence remained the selected broader-validation gate`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes numerically, but broader validation remained required by the explicit current-runtime risk`
- Material residual risks: current GPT-5.6-Sol duplicate completed snapshots or content gap; whether the installed runtime still emits adjacent provider items.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` / `CLI` through the repository's env-gated real Codex E2E.
- Specific confidence gap or residual risk addressed: installed GPT-5.6-Sol raw completed-item cadence versus normalized IDs/content and real memory writes.
- Why the selected mode can materially improve confidence: it exercises the actual authenticated `codex app-server` process and converter rather than a payload fixture.
- Expected confidence after the selected validation: at least `95%` if no content gap/duplication is observed.
- Browser-specific decision and rationale: browser validation is not initially required. No frontend production, DOM, routing, browser API, or Electron boundary changed; direct generic handler/hydration tests exercise the unchanged consumer contract. Browser execution would add little evidence beyond those deterministic state assertions.
- If Blocked: `N/A` at investigation time.

### Broader Validation Execution Update

- Exact command: `RUN_CODEX_E2E=1 CODEX_MEMORY_E2E_MODEL=gpt-5.6-sol CODEX_MEMORY_E2E_REASONING_EFFORT=max CODEX_MEMORY_E2E_ASSERT_REASONING=1 CODEX_MEMORY_E2E_TIMEOUT_MS=300000 CODEX_MEMORY_E2E_EVENT_TIMEOUT_MS=300000 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts --no-watch --reporter=verbose`
- Result: `Pass — 1 file / 1 live test` in 36.71 seconds.
- Current cadence observed: two adjacent completed provider reasoning items with distinct `rs_*` IDs.
- Corrected normalized result: two reasoning content events shared one allocator-owned `reasoning-block:*:1` ID.
- Content result: expected raw summary content length `223`; normalized content length `223`; exact equality assertion passed, so no content gap, duplication, or reorder was observed.
- Persistence result: one future reasoning trace with the exact combined content.
- Evidence: `evidence/ctb-live-01-gpt-5.6-sol.log`.
- Design-impact trigger: not activated; the installed current cadence did not expose duplicate snapshots or a content gap.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron-wrapped Nuxt.
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`.
- Web-equivalent behavior: renderer creates one Thinking segment per normalized live ID or projected reasoning row.
- Shell-specific or lifecycle behavior: none changed.
- Chosen validation approach and why it fits the project: repository Nuxt tests for generic state, server live/API tests for the authoritative changed boundary; do not disrupt a running desktop instance.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: visual screenshot appearance is not re-proven because card styling/rendering is unchanged and semantic count is directly asserted.

## Live Environment And Fixture Plan

- Startup order and commands: run focused repository suites; run env-gated live memory test with `RUN_CODEX_E2E=1 CODEX_MEMORY_E2E_MODEL=gpt-5.6-sol`.
- Environment choices: existing Codex CLI `0.144.1`, authenticated account, reasoning effort `max` for cadence probe, isolated temporary workspace and memory directory.
- Health / readiness checks: `codex --version`, login status, model catalog contains exact model, thread startup-ready, turn reaches idle/completed.
- Seed data / fixtures: sanitized explanatory prompt matching the exact historic reproduction's no-tool reasoning shape; unique response token where needed.
- Test identities/authentication/permissions: test run UUID; existing local Codex identity; no auth material copied.
- Requirement-linked journeys: `CTB-LIVE-01`; `CTB-E2E-01`; focused boundary/isolation regressions.
- Evidence: raw completed reasoning item IDs/count; normalized reasoning event IDs/deltas; persisted reasoning trace IDs/content; GraphQL rows; exact commands and exit codes.
- Cleanup: terminate created Codex thread/client; remove test temp dirs; no default history modification.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `CTB-PROBE-01` | If the durable live test does not expose enough cadence detail, use a ticket-local/log-only exact-prompt invocation around the existing live harness | Current provider item count/method sequence and duplicate snapshot/content-gap audit | Cadence is stochastic and diagnostic detail is version-specific; stable invariant remains in the gated durable test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pre-fix history remediation | Explicitly out of scope | Old runs remain fragmented | None |
| New `summaryTextDelta` support | Explicitly out of scope | Streaming depends on completed snapshots | If live completed snapshots duplicate or omit content, classify Design Impact |
| Electron shell | No shell-specific change | Negligible | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Duplicate completed snapshot or missing reasoning content in current live cadence | Design Impact | Live raw/normalized/persisted comparison | `solution_designer` after failure-origin review routing |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — add one GraphQL pipeline scenario and update one env-gated live test; remove none`
- Post-repository confidence: `95.0%`
- Broader validation decision: `Required — completed successfully through live Codex API/CLI`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Final confidence after broader validation is `97.3%`. The chosen additions close actual converter-to-projection and current-runtime gaps without adding historical remediation, frontend provider logic, or protocol modernization.
