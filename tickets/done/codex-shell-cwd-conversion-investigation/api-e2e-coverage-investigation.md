# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/codex-cwd-probe-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/tickets/done/codex-shell-cwd-conversion-investigation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-001` implementation source-review Pass at commit `bf8b71e285ca1bbca0d27a891ebef5f1316788d5`.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: Round 1, complete. Repository checks passed and the required broader live validation completed; final evidence/confidence are authoritative in `api-e2e-execution-coverage-report.md`.

## Current Requirement And Design Basis

The approved correction must project exact stable Codex app-server `cwd` into canonical `run_bash` arguments for live command start/completion (`AC-001`), command approval (`AC-002`), and native-history normalization (`AC-003`). Inputs without a usable stable `cwd` must remain command-only and must not accept raw model-facing `workdir` or fabricate a default (`AC-004`). Actual command execution remains owned by Codex app-server (`AC-005`). Future application-owned live traces must persist the corrected canonical argument object while old traces without `cwd` remain directly readable and are not rewritten (`AC-006`).

The reviewed implementation changes only `CodexToolPayloadParser.resolveToolArguments`: structured canonical `arguments.cwd` has precedence over top-level approval `payload.cwd`, which has precedence over nested command `item.cwd`. No executor, policy, command, trace schema, reader, or writer changed.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / Codex-owned shell execution | Preserved | Requirements, DS-001, implementation/code review, pre-fix live probe | Reconfirm with one harmless live command whose `pwd` result proves the selected per-command directory; do not invoke AutoByteus `run_bash` as an executor. |
| `BEH-002` / live lifecycle projection | Changed | `REQ-001`, `AC-001`, parser diff and converter tests | Direct durable start/completion assertions already exist; run them and a post-fix live app-server probe through the real backend event pipeline. |
| `BEH-003` / approval presentation context | Changed | `REQ-002`, `AC-002`, approval forwarding/converter tests | Run direct durable approval checks and observe a real approval event containing the exact top-level app-server `cwd` before approving it. |
| `BEH-004` / native history and trace persistence | Changed | `REQ-003`, `REQ-005`, `AC-003`, `AC-006` | Run durable history/trace-reader checks; in the live probe read the real Codex thread and persisted application trace, then read a representative old local trace with no `cwd`. |
| Missing or raw-only directory inputs | Preserved | `REQ-004`, `AC-004`, rejected compatibility log | Run the direct parser/history absence and raw-`workdir` rejection cases; no live default/fallback scenario is needed. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Provider-shape to canonical-argument parsing | Focused parser facade tests | Static fixtures do not prove a live provider item reaches this parser. | Live Codex CLI/runtime probe |
| API / transport / contract | Yes | Codex app-server command item and approval request to canonical runtime event | Converter and thread-coordinator tests; live transport suites exist | Current tests do not jointly assert post-fix raw app-server `cwd`, canonical event `cwd`, and actual execution. | Live Codex app-server through `AgentRunManager` |
| Frontend component / state | No | None; no frontend code changed | N/A | Approval-card rendering layout is unchanged; canonical event content is the backend-owned changed boundary. | None |
| Browser integration / user journey | No | None | N/A | No browser API, route, renderer state, or frontend/backend contract changed beyond an existing open argument object. | None |
| Authentication / session / permissions | No | Approval decision and Codex auth behavior are preserved | Approval forwarding tests and live approval flow | Real approval context should be observed without changing policy. | Live CLI/runtime probe |
| Desktop renderer / web-equivalent UI | No | None | N/A | No renderer code changed. | None |
| Desktop shell / Electron-specific integration | No | None | N/A | No preload, IPC, window, packaging, or lifecycle code changed. | None |
| Process / lifecycle | Yes | Existing Codex app-server process emits command start/approval/completion facts | Env-gated live Codex suites and cleanup hooks | Post-fix live sequencing and cleanup remain to be observed. | Live CLI/runtime probe |
| Persisted-data transition | Yes | Future open `tool_args` gains optional `cwd`; old records stay unchanged | Runtime sequencer/writer and local projection reader tests | One real future trace plus one representative old trace should be read through production code. | Live probe plus isolated old-trace fixture |
| Worker / queue / distributed coordination | No | None | N/A | None. | None |
| External integration | Yes | Installed/authenticated `codex-cli` app-server protocol | Version-exact pre-fix probe; env-gated integration tests | Post-fix live boundary is not yet executed. | Live Codex CLI/runtime probe |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation`
- Project type and runtime stack: pnpm 10 monorepo; TypeScript/Node backend; Vitest; Prisma SQLite test setup; external `codex-cli` app-server.
- Conflicting, missing, or unclear project instructions: Generic `pnpm typecheck` is not a usable current package gate because `tsconfig.json` includes tests while `rootDir` is `src`; use the documented focused Vitest commands and production `tsconfig.build.json`. The implementation handoff also records three broader unrelated team-member fixture-construction failures; no changed CWD path participates in those fixtures.
- Required environment variables or secrets available: `Yes` for existing local Codex authentication; `RUN_CODEX_E2E=1` explicitly enables live suites. No secret values are recorded or copied.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/autobyteus-server-ts/AGENTS.md` | Closest repository instruction | Use `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; run integration scopes explicitly. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/README.md` | Monorepo development/test authority | `RUN_CODEX_E2E=1` enables Codex live transport; deterministic E2E uses repository-owned isolated test state; external capability unavailability must be reported rather than called a pass. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/autobyteus-server-ts/README.md` | Server-specific authority | Vitest uses `.env.test` and `tests/.tmp`; live Codex tests are env-gated and isolate app data; cleanup only prefix-owned Codex E2E history. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/autobyteus-server-ts/package.json` | Package scripts | `pnpm exec tsc -p tsconfig.build.json --noEmit`; `pnpm test`; `cleanup:codex-e2e-history`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/autobyteus-server-ts/vitest.config.ts` | Test runner configuration | Fork pool, serial files, Prisma setup/global setup, `tests/**/*.test.ts` include. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-shell-cwd-conversion-investigation/autobyteus-server-ts/.env.test` | Test runtime template | Test-owned SQLite/runtime settings; must not be mutated. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Focused Vitest repository checks | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch` | Existing install and generated Prisma client are present; tests own `tests/.tmp` DB. | Vitest process exits 0 with expected counts. | Process exits; global teardown owns test DB. |
| Codex app-server live validation | `autobyteus-server-ts` via temporary Vitest probe | `RUN_CODEX_E2E=1 pnpm exec vitest run <temporary-probe> --no-watch` | Use a unique `mkdtemp` workspace, nested target, memory directory, run ID, and low reasoning effort. | Model catalog returns a supported local model; thread startup resolves. | Terminate created thread, close only the created client manager, remove owned temp directories/probe. |
| Production TypeScript | `autobyteus-server-ts` | `pnpm exec tsc -p tsconfig.build.json --noEmit` | No service process. | Exit 0. | None. |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Live workspace and per-command target | `fs.mkdtemp` plus nested directory inside it | Harmless `pwd`/single proof-file command only; no shared workspace or user data. | Recursively remove after the probe. |
| Application-owned future trace | Unique `memoryDir` with `AgentRunMemoryRecorder` | Trace belongs only to the probe; inspect before cleanup. | Retain summarized evidence in execution report; delete raw temp directory. |
| Representative old trace without `cwd` | Write isolated old-shape JSONL to a unique temp memory directory | No migration/backfill; read with the current production local projection provider. | Delete after assertion. |
| Codex identity/authentication | Existing installed CLI user session | Do not print or copy credentials. | Client process closed; no auth mutation. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `REQ-003`, `REQ-005`, `AC-003`, `AC-006`; design `Persisted Data / State Transition Decision`; implementation handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: An application raw-trace file containing a canonical `run_bash` tool call with `{command}` and no `cwd` must load through the current local-memory projection without transformation or error.
- Evidence planned for the approved direct-use outcome: Existing reader tests plus an isolated production-reader probe of the old shape; a real new Codex command must produce `tool_args` containing exact `command` and `cwd` in the existing file format.
- Migration-specific completion/recovery scenarios: `N/A` — no migration is approved.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts` / four command-argument cases | Nested item, top-level approval, canonical precedence, and raw/missing CWD behavior | `AC-001`–`AC-004`; shared parser owner | Still Valid | Exact requirement-shaped assertions added in `bf8b71e2`; code review passed. | Execute unchanged. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` / start, completion, approval | Exact canonical live event arguments and result | `AC-001`, `AC-002` | Still Valid | Exercises the public converter through the existing Codex thread harness. | Execute unchanged. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts` / present and absent CWD | Exact native-history `toolArgs`; no default | `AC-003`, `AC-004` | Still Valid | Calls the production normalizer/shared parser. | Execute unchanged. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` / terminal approval forwarding | Stable request `cwd` reaches local approval event unchanged | `AC-002`, `REQ-004` | Still Valid | Exact modified test passed in implementation and code review. | Execute unchanged. |
| `autobyteus-server-ts/tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts` | Canonical argument objects are retained on tool-call traces; terminal results do not invent args | `AC-006` | Still Valid | Production sequencer coverage already treats `tool_args` as an open record. | Execute relevant suite unchanged. |
| `autobyteus-server-ts/tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts` / command-only tool args | Existing trace with `{command}` becomes a readable activity | `AC-006`, direct-use decision | Still Valid | Normal production local reader accepts tool arguments without `cwd`. | Execute unchanged. |
| `autobyteus-server-ts/tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts` / real approval approve/deny | Real app-server approval lifecycle and execution | `AC-002`, `AC-005` preserved boundary | Still Valid | Env-gated live transport and isolated workspace; does not assert canonical CWD. | Use as supporting inventory; targeted probe closes CWD-specific gap without altering this lifecycle suite. |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` | Real backend-to-recorder trace persistence | `AC-006` persistence path | Still Valid | Uses `AgentRunManager`, real app-server, isolated memory, and production writer. | Reuse its project-approved harness pattern in a temporary CWD-specific probe; do not change this already-large unrelated suite. |

## Stale Or Obsolete Coverage Decisions

None. No relevant assertion protects the defective omission, and no test will be removed or disabled.

## Durable Coverage To Add

None planned. The changed parser, live converter, approval coordinator, native-history normalizer, non-fabrication behavior, trace sequencer, and old-trace reader already have durable requirement-linked coverage. The only missing evidence is a post-fix external-provider journey. It will use a temporary executable probe because exact model tool selection is environment/auth/model dependent, the repository already gates such live execution explicitly, and the reviewed design specifically retained the live runtime probe as evidence rather than requiring a recurring ticket-specific test.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/agent-execution/backends/codex/events/codex-item-event-payload-parser.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts --no-watch` | `autobyteus-server-ts` | Parser, canonical start/completion/approval, native history, missing/raw input | Pass — 3 files / 70 tests | `api-e2e-evidence/focused-codex-projection-tests.log` |
| 2 | `pnpm exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts --no-watch -t "stores Codex terminal approvals"` | `autobyteus-server-ts` | Stable top-level approval CWD forwarding and identity | Pass — 1 selected test / 36 skipped | `api-e2e-evidence/approval-forwarding-test.log` |
| 3 | `pnpm exec vitest run tests/unit/agent-memory/runtime-tool-trace-sequencer.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts --no-watch` | `autobyteus-server-ts` | Open argument persistence and old command-only trace readability | Pass — 2 files / 18 tests | `api-e2e-evidence/trace-persistence-reader-tests.log` |
| 4 | `pnpm exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | Production TypeScript integration | Pass | `api-e2e-evidence/production-typescript.log` (empty because the command produced no diagnostics) |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | All deterministic `AC-001`–`AC-004` shapes passed; trace writer/reader suites cover the mechanics behind `AC-006`; production TypeScript passed. | `AC-005` and transitive future-trace proof have not yet been re-observed post-fix through the live provider. | Real nested-directory command plus persisted-trace observation. |
| Changed-boundary execution directness | 90% | Production parser, converter facade, thread approval coordinator, history normalizer, sequencer, and local reader are directly executed. | App-server transport has not yet supplied this round's exact live fields to those production consumers. | Live Codex app-server execution through `AgentRunManager`. |
| Cross-boundary integration realism and mock gap | 85% | Existing repository tests cross internal event/history/persistence boundaries with real production classes. | Codex items/approval requests are fixtures and the external process is mocked/bypassed. | Correlate raw provider messages with canonical events, native history, and trace file in one live run. |
| Environment, configuration, identity, and fixture fidelity | 88% | Project Vitest/Prisma setup, current worktree install, and production TypeScript are used. | Installed CLI/auth/model, real workspace CWD, and on-request approval are not yet part of this round's executed evidence. | Use the installed CLI, real model catalog, isolated workspace, and actual approval response. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | Raw `workdir` rejection, missing CWD, precedence, success completion, approval identity, and old command-only reads all pass. | Real approval/start/completion sequencing and external cleanup have not yet run post-fix. | Execute and approve one live command, then verify idle/cleanup. |
| User-surface, browser, and desktop-shell confidence | 90% | The applicable user-facing boundary is the canonical approval/lifecycle event, which passed exact assertions; no frontend or Electron code changed. | Real approval presentation payload is still fixture-backed; browser/desktop are otherwise inapplicable. | Observe the canonical event generated from a real approval request. |
| Durable regression coverage quality and relevance | 98% | Focused exact tests cover every source/consumer, non-fabrication, trace openness, and old-read behavior without compatibility-only assertions. | External live evidence is intentionally not durable because model/provider behavior is environment-gated. | No additional durable coverage is presently justified. |

- Overall post-repository confidence: `91%` (636 / 7 = 90.86%, rounded to nearest whole percent)
- Calculation method: Simple average of the seven applicable category scores.
- Every critical acceptance criterion directly proven: `No` — `AC-005` and the live/transitive portion of `AC-006` still need post-fix external-process evidence.
- Any applicable category below `90%`: `Yes` — cross-boundary integration realism (85%); environment/configuration/identity/fixture fidelity (88%).
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: The installed app-server may supply or sequence the live item/approval differently from fixtures; future trace persistence has not yet been observed from a real corrected command.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `CLI` plus `Lifecycle` (real Codex app-server through the production backend/event/memory stack)
- Specific confidence gap or residual risk addressed: Repository fixtures do not prove that the installed Codex app-server's exact per-command `cwd` survives the live raw item, approval request, canonical event conversion, native `thread/read`, and future application trace while the command actually runs there.
- Why the selected mode can materially improve confidence: It crosses the real external process and every changed production consumer without introducing browser/Electron layers that are not affected.
- Expected confidence after the selected validation: At least `95%` overall with no applicable category below `90%`, assuming all critical scenarios pass.
- Browser-specific decision and rationale: Browser validation is not required. No browser, renderer, route, UI-state, or desktop-shell code changed; a browser would only re-display the already-canonical backend argument object and would not exercise the changed parser more directly than the selected backend lifecycle.
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`
- Execution update: The selected live mode completed successfully with `codex-cli 0.149.0` and `gpt-5.4-mini`. The installed app-server's `thread/read` legacy view returned zero `commandExecution` items for the completed turn, so `LIVE-CWD-003` normalized the exact real `item/completed.commandExecution` object rather than fabricating a history item. Deterministic native-history fixture coverage remained unchanged and passing. This deviation and the bounded residual uncertainty are recorded in the execution report.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron frontend exists, but is not affected.
- Relevant README or development instructions: Root README packaged Electron and local development sections reviewed.
- Web-equivalent behavior: Existing approval/tool cards consume canonical backend events; their layout/state implementation is unchanged.
- Shell-specific or lifecycle behavior: None in scope.
- Chosen validation approach and why it fits the project: Real backend/Codex app-server lifecycle only; this directly crosses the changed server boundary.
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`; no shared application process will be started/stopped.
- Behavior not directly proven and confidence consequence: Pixel-level display of `cwd` is not retested because no frontend source or event schema changed; negligible residual presentation risk only.

## Live Environment And Fixture Plan

- Startup order and commands: Verify `codex --version`; create a temporary Vitest probe under the worktree; run it with `RUN_CODEX_E2E=1`; the probe creates `CodexAppServerClientManager`, `CodexThreadManager`, `AgentRunManager`, and recorder in project-standard order.
- Environment choices that materially affect the run: Existing installed Codex CLI/auth; model selected from the real catalog with low reasoning effort; `autoExecuteTools=false`; `workspace-write`; unique workspace/memory/run IDs.
- Health / readiness checks: CLI version exits 0; model catalog includes a supported model; thread startup promise resolves.
- Seed data / fixtures: Unique workspace with nested target directory and a harmless proof-file command using that target as per-command workdir; separate old trace file lacking `cwd`.
- Test identities, authentication, permissions, or session state: Existing local Codex auth; on-request approval deliberately exercised and approved once.
- Requirement-linked journeys or scenarios: `LIVE-CWD-001` live start/completion and Codex-owned execution; `LIVE-CWD-002` approval context/flow; `LIVE-CWD-003` real native history; `LIVE-CWD-004` future trace; `TRACE-OLD-001` old-trace direct read.
- Evidence to capture: Raw app-server item/request JSON fields, canonical event fields, command output/proof file, normalized history args, persisted JSONL tool args, production old-trace projection, Vitest result/count, CLI/runtime version.
- Owned processes and temporary state to clean up: Created Codex thread/client process, unique workspace/memory/legacy directories, and temporary probe file only.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LIVE-CWD-001` | Real Codex app-server via production `AgentRunManager`; exact command uses nested per-command directory | Raw stable item, canonical start/completion exact CWD, result/location, Codex execution ownership | Environment/model/auth-dependent live evidence; stable mapping is already durable at parser/converter boundaries. |
| `LIVE-CWD-002` | Same run with on-request approval, capture canonical approval then approve | Exact approval `cwd` and unchanged decision flow | Provider approval heuristics/model tool selection make this unsuitable as the sole durable assertion; deterministic approval coverage already exists. |
| `LIVE-CWD-003` | Read the created native thread through `CodexThreadHistoryReader`; normalize the real completed stable `commandExecution` item because the installed legacy `thread/read` view returned no command items | Exact live provider command shape produces native-history `{command,cwd}` normalization; actual `thread/read` remains readable | Deterministic normalizer cases already exist; the live read omission is provider-owned and retaining a model-driven test would not strengthen the deterministic contract. |
| `LIVE-CWD-004` | Inspect production recorder's JSONL after idle | Future trace persists exact CWD with unchanged schema | Sequencer/writer contract already has durable coverage; this is one live transitive confirmation. |
| `TRACE-OLD-001` | Isolated old-shape JSONL through `LocalMemoryRunViewProjectionProvider` | Existing trace lacking CWD remains readable without rewrite | Existing reader already has durable command-only coverage; this is transition evidence, not a new behavior contract. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pixel-level frontend approval/tool-card rendering | No frontend code or schema changed; backend canonical event is the changed owner and browser execution would not improve boundary directness. | Negligible presentation-only risk. | None. |
| Live native `thread/read` normalization of a returned `commandExecution` item | `codex-cli 0.149.0` returned a readable completed thread whose legacy history view contained user/reasoning/assistant items but zero command items; the production normalizer was instead executed against the exact stable live completed command item. | Low provider-history-availability uncertainty only; the conditional normalization contract is directly covered with deterministic current-contract items. | No code or requirement reroute. Re-evaluate if Codex history mode begins returning command items or the stable item contract changes. |
| Historical trace backfill | Explicitly prohibited by approved no-migration decision. | Old records remain unenriched by design. | None. |

## Ambiguities Or Reroute Triggers

None identified.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `91%`.
- Broader validation decision: `Required` — real Codex CLI/lifecycle probe.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: This artifact was written before any API/E2E-owned durable coverage edit or final execution. Existing implementation-authored tests remain authoritative and will be executed unchanged.
