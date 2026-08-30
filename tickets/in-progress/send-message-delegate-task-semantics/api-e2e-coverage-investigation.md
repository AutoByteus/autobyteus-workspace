# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-doc.md` (`RER-013`, Approved)
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/investigation-notes.md`
- Requirements Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/requirements-revision-record.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/design-spec.md` (`AD-REV-001`)
- Supplemental Task Artifacts: approved `agent-team-collaboration-contract.md` (`ATC-001`), approved `orchestration-decision-table.md`, `requirements-visualization-brief.md`, and the externally owned Product `prototype-ticket.md`, `requirements-visualization-review.md`, `validation-evidence.md`, and `visual-references/README.md`
- Architecture Design Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/architecture-design-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/code-review-revision-record.md` (`CRR-002`; `CRR-001` implementation-source Pass remains unchanged)
- Triggering Test Review Report: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-test-review-report.md` (`TEST-001`, Local Fix)
- Delivery Revision Record (delivery re-entry only): `N/A — Code Reviewer Local Fix re-entry`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics/tickets/in-progress/send-message-delegate-task-semantics/api-e2e-revision-record.md` (`API-REV-002`)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `CRR-002` proportional durable-test review Fail, finding `TEST-001`, at commit `716efbf53`; `CRR-001` source-review Pass remains unchanged
- Prior Investigation Reviewed: `API-REV-001 — Pass / 97.7%`
- Latest Authoritative Investigation: This file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` — API-REV-002 changes one of the two cumulative durable E2E files and must return through Code Reviewer

## Current Requirement And Design Basis

ATC-001 requires one provider-shared two-mode contract: ordinary communication contacts an existing mounted AgentRun, while delegation creates and fully instructs one fresh tracked task execution. One work packet must not be dispatched through both operations. Logical AgentTeam messaging must identify the mounted Team coordinator; AgentTeam delegation must materialize a full fresh task Team and return its new coordinator AgentRun. Successful message results replace the obsolete `result` field with flat `target_agent_run_id`; rejection uses null. Delegation preserves strict `active` and `not_started` branches, with the latter omitting target identity. Native JSON, MCP text, MCP structured content, and post-2025-03 output schemas must agree. Formal result/review transitions remain exclusive to `submit_task_result` and `review_task_result`. The reviewed design requires configured AutoByteus, Codex, and Claude evaluation based on collaboration intent and observable task/message counts, not only exact-copy assertions.

The implementation and code review report a clean legacy removal and a `Not Affected` persisted-data decision. Those answers are internally consistent with the changed files: message/task persistence, task states, routing inputs, and stored record shapes are unchanged. API/E2E must not add compatibility-only coverage or infer that the public break is backward compatible.

Round 2 rechecked the complete prior package plus `CRR-002`. `TEST-001` correctly identified that the live Codex helper treated MCP `structuredContent` as optional, so API-SCN-004 could pass when the supported response omitted the structured projection. The bounded correction must require record-valued structured content, compare it exactly with the parsed text object for both active and inactive calls, and rerun that real Codex App Server -> Agent Tools MCP -> message-router path. No implementation-source, requirement, design, environment, or confidence finding was introduced.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / REQ-001–003,012,017 | Changed | ATC-001 exact prompt/tool copy; AD-REV-001 DS-001 | Pin exact copy and run intent-only configured-runtime choice scenarios. |
| BEH-002, BEH-008 / REQ-014 | Changed | Flat public message identity contract | Prove logical Agent, logical AgentTeam, exact active-run, and rejected/inactive outcomes at the real operation/transport boundary. |
| BEH-003 / REQ-002,006,007,013,015,016 | Preserved + strengthened public schema | Existing TaskDelegationService plus strict result schema | Prove fresh Agent and full Team ingress identity, active/not-started omission, and one packet/one task. |
| BEH-004 / REQ-004 | Preserved with clarified choice | DEC-001 Option A | Prove genuine clarification uses the returned exact active run, creates no second task, and does not message the logical placement. |
| BEH-005 / REQ-005 | Preserved | Existing submit/review lifecycle | Prove message wording is lifecycle-neutral and formal tools alone mutate task state. |
| BEH-006 / REQ-008,016,017 | Changed projection | Shared AutoByteus/native and Codex/Claude MCP catalog paths | Prove provider prompt/tool parity plus native/MCP text/structured/schema parity. |
| MCP negotiated definitions | Added | Design steps 5–6 | Prove `2025-03-26` omission and legal object-root schemas for `2025-06-18` and `2025-11-25`. |
| Old message `result:null` envelope | Removed | Legacy Removal Policy; IR-001 | Retain only a strict-schema negative assertion; do not preserve an old producer or compatibility consumer. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Exact accepted-run invariant and strict operation results | Unit and integration suites | Actual configured recipient/task identity across providers | Configured runtime E2E |
| API / transport / contract | Yes | Native JSON; MCP tool definition and text/structured result | Unit + Fastify/MCP integration | Real Codex/Claude MCP client transport and event projection | Live MCP/configured runtime |
| Frontend component / state | No | N/A | N/A | None | None |
| Browser integration / user journey | No | N/A — no product UI changed | N/A | None | None |
| Authentication / session / permissions | Yes, bounded | Team-member capability and active exact-run session eligibility | MCP/session and router tests | Live CLI-backed session behavior | Configured runtime E2E |
| Desktop renderer / web-equivalent UI | No | N/A | N/A | None | None |
| Desktop shell / Electron-specific integration | No | N/A | N/A | None | None |
| Process / lifecycle | Yes | Active/inactive run eligibility and formal task lifecycle separation | Router/lifecycle tests | Real task execution, clarification, and event ordering | Lifecycle/configured runtime |
| Persisted-data transition | No | Transient tool output only | Source diff and unchanged stores | None; no migration authorized | None |
| Worker / queue / distributed coordination | Yes, bounded | Fresh task Agent/full Team activation across runtime processes | Task lifecycle integration and existing live mixed-task E2E | Actual multi-runtime model choice and duplicate-event risk | Configured runtime E2E |
| External integration | Yes | LM Studio plus installed Codex and Claude CLI runtimes | Existing gated runtime suites | Availability/auth/model compliance | Safe isolated live E2E |

## Project Execution Discovery

- Assigned task worktree: `/home/autobyteus/workspace/.codex/worktrees/send-message-delegate-task-semantics`
- Branch / current reviewed HEAD: `codex/send-message-delegate-task-semantics` / `59bf1f39e`
- Project type and runtime stack: pnpm monorepo; Node.js 22; TypeScript; Fastify; GraphQL/WebSocket; Vitest; Zod/Ajv; MCP SDK 1.30.0; SQLite/Prisma; AutoByteus LLM runtime plus Codex App Server and Claude Agent SDK/CLI.
- Conflicting, missing, or unclear project instructions: General server `tsconfig.json` has the upstream-recorded `rootDir`/test include mismatch; use `tsconfig.build.json` and `build:full`. No closer test instruction conflicts were found. Existing production server PID 54 and its child Codex processes are not owned by this validation and will not be stopped or reused.
- Required environment variables or secrets available: `Yes, proportionately` — `LMSTUDIO_HOSTS` is reachable with the required Qwen model; installed `codex` and `claude` binaries are available. CLI authentication will be verified by the gated suites. No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest repository test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; narrow before broad. |
| `autobyteus-server-ts/README.md` | Server setup/run authority | Node 18+; build from workspace; optional isolated `--data-dir`; credentials are Settings/vault-owned; do not use plaintext `.env` as production credential authority. |
| root `package.json`, `pnpm-workspace.yaml` | Workspace scripts/dependencies | pnpm 10.28.2; shared packages must build; live-E2E harness exists but its provider-capability scenario set is adjacent rather than sufficient for collaboration semantics. |
| `autobyteus-server-ts/package.json` | Supported build/test path | `prepare:shared`, Prisma generation, `build:full`, Vitest. |
| `autobyteus-server-ts/.env.test` | Fixed test template | Test/SQLite configuration only; tracked file must remain unchanged. |
| `tests/e2e/helpers/studio-runtime-test-server.ts` | Runtime E2E setup | Build in-process studio server and MCP host on random loopback ports; caller owns close. |
| `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | Live runtime credential isolation | Initialize an isolated configured database and import only allowed ambient aliases; reset after suite. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Safe live setup reference | Use loopback/random ports, isolated runtime root, safe DB location, sanitized environment, readiness and cleanup. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Shared workspace packages | Worktree root | `pnpm --filter ... build` via server scripts | Already installed; frozen lock unchanged | command exit 0 | No process |
| Server repository checks | `autobyteus-server-ts` | targeted `pnpm exec vitest run ... --no-watch`; `tsc -p tsconfig.build.json --noEmit`; `pnpm run build:full` | No production server reuse | exit 0/log | Test-owned teardown |
| Live studio runtime | In-process Vitest suite | `RUN_LMSTUDIO_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 ... vitest run <focused file>` | Random loopback ports; temp app-data/workspaces; owned isolated SQLite URL | CONNECTED event, catalog models, tool events | suite `afterAll`/`afterEach`; verify no owned residue/process |
| LM Studio | External configured host | Existing service; no start command owned | Reachable at configured origin; Qwen model catalog contains required model | `/v1/models` 200 | Do not stop |
| Codex / Claude | Test-launched child runtimes | Existing runtime factories via focused E2E | Installed CLI binaries; user production server children are not reused | `--version`, model catalog, first successful turn | terminate test runs; manager/server close |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions and runs | GraphQL mutations in runtime E2E | Unique UUID names under temp app-data | terminate runs; delete definitions; remove temp root |
| SQLite/vault | Owned `DATABASE_URL_TEST` under ticket evidence/temp location | Never point at production/user DB | remove DB/key/WAL/SHM after evidence capture |
| Workspaces | `mkdtemp` | Unique per suite/row | recursive removal |
| Model identities | GraphQL provider catalog; explicit preferred overrides | Record model IDs, not credentials | None |
| Task/message evidence | Team WebSocket events and focused retained log | Redact session tokens/credentials; assert no provider secret leakage | Retain value-free evidence log |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design/handoff references: design `Persisted Data / State Transition Decision`; implementation `Persisted Data Transition Check`
- Representative existing-data setup and required behavior: Existing task/message record formats and their normal stores remain unchanged while new transient results are projected.
- Evidence planned: source/diff audit plus existing task lifecycle integration that writes/reads current task records; no migration, rebuild, historical-shape reader, or version-specific business fallback is appropriate.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts` | Exact approved prompt/tool/field copy and hashes | AC-001,009,012,015,017 | Still Valid | Direct production constants | Run unchanged |
| `tests/unit/agent-team-execution/member-collaboration-instruction-provider-parity.test.ts` plus provider composer/gating tests | One shared block and intrinsic tools across runtimes | AC-009,017 | Still Valid | Shared prompt composition | Run unchanged |
| `tests/unit/agent-tools/team-communication/send-message-to.test.ts` | Native logical/exact success, rejection null, native/MCP parity | AC-014,016 | Still Valid | Operation boundary, mocked logical delivery | Run unchanged |
| `tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Active exact identity and inactive/rejected no identity | AC-004,014 | Still Valid | Real router logic with mocked run owner | Run unchanged |
| `tests/unit/agent-tools/team-communication/collaboration-result-contracts.test.ts` | Strict message/delegate unions; legal schemas for three protocol versions | AC-014,016 | Still Valid | Zod + MCP SDK + Ajv | Run unchanged |
| `tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Delegate descriptions and MCP active/not-started text/structured parity | AC-007,016,017 | Still Valid | Manifest/adapters | Run unchanged |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Real Fastify tools/list protocol gating | AC-016 | Still Valid | HTTP MCP route | Run unchanged |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Fresh Agent/full Team identities; submit/review lifecycle; current persisted records | AC-003,006,008,013 | Still Valid | RootTeamRun/task service/current stores | Run unchanged; add only if a gap cannot be proven elsewhere |
| `tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Real AutoByteus/Codex/Claude logical Agent messaging | AC-002,009,014 | Still Valid | Its existing cross-runtime delivery assertions remain valid, but probabilistic recipient prose/tool turns made it unsuitable as the identity oracle for this round | Leave unchanged; use deterministic native/integration identity coverage plus retained exact-Codex and three-provider intent live evidence |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live task Agent and full task Team activation plus lifecycle | AC-003,005,006,008,013 | Still Valid | API-REV-001 added and passed result/identity/count plus intent-only three-provider choice assertions | Retain unchanged in API-REV-002 |
| `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Real exact active-run success and post-termination rejection | AC-004,014,016 | Still Valid — corrected in API-REV-002 | Real Codex/MCP helper now rejects absent/non-record structured content and asserts exact equality with parsed text before either branch asserts its public identity | Retain and rerun live |
| Product VIS-R04 browser checks | Deterministic explanatory motion/UI | Requirements visualization only | Out Of Scope | Explicitly mocked; no production runtime | Do not rerun as production evidence |

## Stale Or Obsolete Coverage Decisions

No durable scenario will be removed. The single old-shape occurrence in `collaboration-result-contracts.test.ts` is a deliberate strict-schema rejection assertion and remains valid. No compatibility producer/consumer test is retained.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-SCN-010 | AutoByteus, Codex, and Claude choose one delegation for intent-only bounded work, create one task, and send no duplicate logical message | AC-003,005,009,012,015,017; QR-002/005 | `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Existing live tests name the tool and exact arguments; they do not evaluate the new decision interface. |
| API-SCN-011 | Genuine new clarification uses returned exact task ingress, creates no second task, and leaves lifecycle active even when content contains lifecycle words | AC-004,006 | Same file | Directly closes DEC-001 and lifecycle-separation confidence gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| API-SCN-002 | `mixed-task-delegation.e2e.test.ts` Agent task | Assert delegate success result task ID/run ID equals activation | AC-003,013,016 | Also count no logical send. |
| API-SCN-003 | `mixed-task-delegation.e2e.test.ts` Team task | Assert delegate result target is fresh task Team coordinator, not TeamRun/configured coordinator | AC-008,013–016 | Existing activation provides comparison identities. |
| API-SCN-004 | `codex-standalone-send-message-global-routing.e2e.test.ts` | Assert active exact ID, inactive null, typed error, no legacy field, and mandatory record-valued MCP structured content exactly equal to parsed text for both calls | AC-004,014,016 | API-REV-002 closes `TEST-001` on the suite's safe live exact-route lifecycle. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts run prepare:shared` | Worktree root | Required shared package build | Pass | `api-e2e-evidence/api-rev-001/repository/prepare-shared.log` |
| 2 | Focused Vitest run across 14 contract, MCP, routing, prompt, and lifecycle files | `autobyteus-server-ts`; Vitest 4.0.18, isolated SQLite | Exact copy, native/MCP parity, protocol schemas, logical/exact identity, active/not-started, formal lifecycle | Pass — 14 files / 109 tests | `.../repository/focused-contract-and-lifecycle-final.log` |
| 3 | `pnpm ... vitest run` for the two changed E2E files with gates disabled | Same | Durable E2E collection/import and default skip behavior | Pass — 2 files / 4 intentionally skipped tests | `.../repository/changed-e2e-collection-final.log` |
| 4 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Same | Supported source-build typecheck | Pass | `.../repository/typecheck.log` |
| 5 | `pnpm -C autobyteus-server-ts run build:full` | Same | Production TypeScript build, managed messaging assets, sanitized bootstrap smoke | Pass | `.../repository/build-full.log` |
| 6 | `pnpm -C autobyteus-server-ts run prepare:shared` | API-REV-002 Local Fix; worktree root | Recreate required shared package build output after API-REV-001 cleanup | Pass | `api-e2e-evidence/api-rev-002/repository/prepare-shared.log` |
| 7 | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts --no-watch` | API-REV-002; real Codex App Server and Agent Tools MCP | API-SCN-004 active/inactive text plus mandatory structured parity and exact/null identities | Pass — 1 file / 1 test | `api-e2e-evidence/api-rev-002/live/codex-exact-routing.log` |
| 8 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | API-REV-002; supported build config | Corrected durable helper type and source-build type safety | Pass | `api-e2e-evidence/api-rev-002/repository/typecheck.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 109 focused tests directly cover exact copy, schemas, identity branches, and lifecycle | Configured providers had not yet chosen between the two operations from intent | Three-provider intent run |
| Changed-boundary execution directness | 93% | Real native operation, router, Fastify MCP, and RootTeamRun/task service boundaries executed | Exact real Codex route and live fresh-Team result still pending | Standalone Codex + mixed live E2E |
| Cross-boundary integration realism and mock gap | 90% | Fastify/MCP plus task lifecycle integration crosses operation/service/store boundaries | Actual LM Studio/Codex/Claude model decisions and events pending | Configured live runtimes |
| Environment, configuration, identity, and fixture fidelity | 92% | Isolated current SQLite, real catalog composition, current runtime factories | Provider model/auth readiness not yet proven together | Live provider run |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Rejection/null, not-started omission, strict invalid schema, submit/review lifecycle all pass | Live inactive exact target pending | Codex exact-route termination run |
| User-surface, browser, and desktop-shell confidence | N/A | No UI, browser, renderer, IPC, or shell surface changed | None | N/A |
| Durable regression coverage quality and relevance | 96% | Narrow exact-copy/contract/integration coverage and two requirement-linked live E2E updates | New live scenarios not yet executed | Execute gated files |

- Overall post-repository confidence: `93.3%`
- Calculation method: Simple average of the six applicable categories; UI/browser/desktop is genuinely inapplicable.
- Every critical acceptance criterion directly proven: `No — configured provider choice and live exact/fresh identities still pending at this gate`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: actual provider choice/duplicate dispatch and real exact/fresh runtime identity projection; approved public break consumer/release verification remains Delivery-owned.

## Final Confidence After Broader Validation

| Confidence Category | Final Score | Broader Evidence Gain | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | All three configured providers chose one delegation, created one task, sent zero duplicate logical assignment messages, and used the returned exact ingress for clarification | Only unknown external consumers, outside API/E2E ownership |
| Changed-boundary execution directness | 98% | Real Codex MCP active/inactive calls plus live fresh Agent/Team public-result identities | Negligible probabilistic model variance outside asserted scenarios |
| Cross-boundary integration realism and mock gap | 97% | LM Studio, Codex App Server, Claude SDK, MCP host, GraphQL, WebSocket events, task service, and SQLite exercised | No multi-node deployment topology, not material to this change |
| Environment, configuration, identity, and fixture fidelity | 98% | Current provider catalogs/models, isolated app data, exact configured and fresh IDs, owned workspaces | Production user data intentionally not used |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Inactive exact rejection/null, not-started omission, lifecycle-looking message neutrality, and formal lifecycle tests | No unrelated process-crash recovery scenario |
| User-surface, browser, and desktop-shell confidence | N/A | No applicable surface | None |
| Durable regression coverage quality and relevance | 98% | Both cumulative changed E2E files passed live; API-REV-002 additionally makes API-SCN-004 fail on absent/non-record structured content and requires exact text/structured equality | Probabilistic provider tests remain gated by design |

- Overall final confidence: `97.7%`
- API-REV-002 confidence treatment: `Unchanged, not rescored` — CRR-002 did not question execution confidence; the targeted correction strengthens the retained live assertion and its focused real-runtime rerun passed.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Final residual risks: broader consumer/release verification for the approved public break; unrelated corrupt loose Git object maintenance. Both remain downstream/Delivery-owned.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `Worker or Distributed` + real configured provider runtime
- Specific confidence gap: Existing deterministic copy tests and forced-tool live tests do not prove the approved prompt changes actual AutoByteus/Codex/Claude operation selection or prevent duplicate logical-address work delivery. Real exact-run/result projection also remains only partly asserted.
- Why selected mode improves confidence: It observes actual provider tool calls, public results, task activation events, communication events, exact target identities, and lifecycle non-effects across the changed boundaries.
- Expected confidence after selected validation: `>=95% overall`, no applicable category below 90%, assuming all critical scenarios pass.
- Browser-specific decision: `Not selected`; no UI/web-equivalent desktop surface changed, and browser execution would bypass rather than improve the runtime/MCP/task evidence.
- If Not Required / Blocked: `N/A`

## Desktop Application Validation Decision

- Desktop framework / shell: Electron exists elsewhere in the product, but this change is server/runtime only.
- Relevant README/development instructions: server README and runtime E2E helpers.
- Web-equivalent behavior: None.
- Shell-specific behavior: None.
- Chosen approach: Server/configured runtime E2E; do not launch or disturb the user's desktop application.
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: No desktop behavior is claimed.

## Live Environment And Fixture Plan

- Startup order: verify CLI/model availability -> create isolated DB and temp app-data/workspaces -> in-process studio server/MCP host on random loopback ports -> create unique definitions/team run -> connect Team WebSocket -> run provider scenarios.
- Environment choices: owned `DATABASE_URL_TEST`; no production server reuse; `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, `RUN_CLAUDE_E2E=1`; preferred stable models from catalog.
- Health/readiness: binary versions, LM Studio `/v1/models`, GraphQL catalog, WebSocket `CONNECTED`, first provider lifecycle event.
- Seed data: unique coordinator/worker definitions and one Team run; no user data.
- Identities/session: exact configured member run IDs from resume config; fresh task ingress from task event/tool result.
- Journeys: logical message identity matrix; bounded-task intent; fresh Agent and Team activation identity; exact clarification; inactive exact rejection; formal lifecycle separation.
- Evidence: retained value-free Vitest logs plus event-count summary; no screenshots because no UI.
- Cleanup: close sockets/server/managers, terminate Team/Agent runs, delete definitions, remove temp workspaces/app-data/DB/key, and verify tracked `.env.test`/production PID 54 are unchanged.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| API-SCN-012 | Static exact-copy comparison and legacy/source scan written to evidence | No copy drift/legacy producer | Diagnostic audit supplements durable tests; no production value as a new test file. |
| API-SCN-013 | Environment/process ownership and cleanup audit | No collision or residue | Host-specific validation evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| Unknown external consumers of removed `result:null` | Consumer inventory and release communication are Delivery-owned; no compatibility is allowed | Public break may affect uninspected consumers | Delivery docs/release/consumer verification |
| Production user database/process | Unsafe and unnecessary; isolated current-store evidence is direct for scope | None for transient output change | Do not test against user data |
| Browser/Electron | No changed surface | None | N/A |
| Corrupt loose Git object repair | Unrelated to validation and requires reachability/safe repository maintenance | Could affect later integration/GC | Delivery/repository maintenance before final integration |

## Ambiguities Or Reroute Triggers

None at investigation time. Any discovered mismatch in public result identity, provider result parity, task/message event count, lifecycle state, or approved exact copy will be classified from execution evidence rather than forced into a test expectation.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — API-REV-002 Local Fix Pass`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — API-REV-002 updates one file; the cumulative API/E2E package updates two files; removes none`
- Post-repository confidence: `93.3%`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The API-REV-001 investigation preceded its durable edits, and the canonical package plus CRR-002 were re-read before the bounded API-REV-002 correction. The focused live Codex rerun now enforces mandatory record-valued `structuredContent` and exact text/structured equality in both response branches. Final confidence remains the upstream-reviewed `97.7%`; the authoritative execution report records the completed Local Fix Pass.
