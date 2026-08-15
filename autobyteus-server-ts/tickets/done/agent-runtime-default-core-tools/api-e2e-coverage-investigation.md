# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/runtime-tool-exposure-matrix.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/system-prompt-file-operations-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003 pending`
- Current Investigation Round: `5`
- Trigger: `IR-002` fresh API/E2E request after `CRR-007` source review of commit `20dc45738`
- Prior Investigation Reviewed: `API-REV-002` execution report and revision record; `CRR-007` source review
- Latest Authoritative Investigation: `Fresh IR-002 investigation; execution pending`

## Current Requirement And Design Basis

The reviewed behavior is a native-runtime-only effective tool invariant. Every server-managed `RuntimeKind.AUTOBYTEUS` standalone, team-member, and task-agent create/restore path must derive exactly one `run_bash`, `read_file`, `edit_file`, and `write_file` baseline before native registry materialization. Configured optional names remain additive and stale optional names remain non-blocking. Team context continues to add `send_message_to` and `delegate_task` when qualified, mixed filtering must retain the foundation names, and `AgentDefinition.toolNames` must remain byte-for-byte unchanged. Claude Agent SDK and Codex App Server must continue using the neutral exposure path and must not inherit the native tuple. The Carpenter prompt must preserve availability-aware Bash/file guidance, recent-read-before-regional-edit, reread-after-context-failure, and Bash fallback.

Critical acceptance criteria for this stage are `AC-001` through `AC-007` and `AC-010` at the native composition/materialization boundary and `AC-008`/`AC-009` at prompt composition. The implementation handoff and `CRR-007` confirm create and restore converge on `buildAgentConfig`, the native wrapper is the only default owner, registry registration and the existing `write_file` path are unchanged, persisted data is `Directly Usable — No Migration`, and no compatibility path was introduced.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BE-001` / native standalone create and restore | Changed | `requirements.md` REQ-001/003; design DS-001/003; handoff trace; CRR-007 | Existing native factory integration remains valid; fresh API create/restore with empty `toolNames` must prove the four-tool baseline and `write_file` reachability through the real websocket boundary. |
| `BE-002` / native team and task-agent exposure | Changed | `requirements.md` REQ-002; matrix; design DS-002; handoff; CRR-007 | Existing mixed/team unit coverage remains valid; fresh all-native team coverage must prove the four-tool baseline, team tools, `write_file` approval/path behavior, and restored continuation. |
| `BE-003` / Claude and Codex exposure isolation | Preserved | REQ-004/005; design DS-005; CRR-001 | Neutral helper tests are valid; live provider suites are environment-gated and provide additional non-regression evidence when credentials/transport are available. |
| `BE-004` / registry-backed materialization | Preserved at owner, changed at input | REQ-005; design DS-003/004; handoff; CRR-007 | Existing resolver and factory integration tests directly exercise the real registry and AgentFactory; fresh integration rerun must confirm four materialized native tools on create/restore. |
| `BE-005` / fixed Carpenter prompt | Changed | REQ-006; prompt contract; CRR-001 | Existing prompt-composer tests remain valid; no browser/API journey is needed because this is static backend prompt composition. |
| `AgentDefinition.toolNames` persistence | Preserved | REQ-003/005; `Directly Usable — No Migration`; implementation transition check | Existing immutability assertions remain valid; no migration test or data rewrite is appropriate. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Native backend exposure wrapper -> neutral normalization -> native resolver/registry | Focused native policy, resolver, and factory suites | API lifecycle could bypass or misroute the factory | Live API/websocket |
| API / transport / contract | Yes | GraphQL run creation/restore and agent websocket invoke the server-managed native run | Existing runtime GraphQL E2E suite; current commit adds empty-definition `write_file` approval/path journey | Live model/provider sequencing and external provider projection remain environment-dependent | Live API + websocket |
| Frontend component / state | No | No frontend source or state changed | N/A | None in scope | None |
| Browser integration / user journey | No | No browser-rendered behavior changed | N/A | None in scope | None |
| Authentication / session / permissions | Preserved | Existing approval/path/workspace policies govern the newly reachable native `write_file` | Resolver/factory tests and current standalone/team websocket approval tests | Live provider approval behavior with default exposure is not fully proven | Live API/websocket approval journey |
| Desktop renderer / web-equivalent UI | No | No desktop renderer changed | N/A | None in scope | None |
| Desktop shell / Electron-specific integration | No | No Electron/preload/IPC/lifecycle code changed | N/A | None in scope | None |
| Process / lifecycle | Yes | Native create, terminate, restore, and continued turn use the changed factory input | Native factory integration tests; runtime GraphQL E2E restore flows | Live model/provider and server process boundary | Live API lifecycle |
| Persisted-data transition | Yes (runtime read only) | Stored `AgentDefinition.toolNames` remains unchanged; effective defaults are derived | Immutability tests; implementation transition check | Representative API-created persisted definition with omitted foundation names | Live API create/restore |
| Worker / queue / distributed coordination | No | No worker/queue/distributed implementation changed | N/A | None in scope | None |
| External integration | Yes (isolation only) | Claude/Codex neutral exposure callers must not receive native defaults | Neutral tests; live provider suites are present | Provider launch availability/credentials and real wire projection | Live Claude/Codex when configured |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools`
- Project type and runtime stack: Git monorepo; Node.js/TypeScript Fastify server; GraphQL, WebSocket, Vitest, Prisma SQLite; native AutoByteus runtime plus Claude/Codex external runtimes.
- Conflicting, missing, or unclear project instructions: No conflicting instructions. The package typecheck limitation (`tsconfig.json` `rootDir: src` while including `tests`, producing TS6059) is documented upstream and is not a coverage finding.
- Required environment variables or secrets available: `Partial`. Local Claude/Codex binaries are installed and LM Studio is reachable with model catalog entries, but no model is currently loaded and no provider live-run flags or credentials are present in the inherited environment. No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/AGENTS.md` | Server test instructions | Use `pnpm -C autobyteus-server-ts exec vitest`; use `vitest run ... --no-watch`; integration path is `tests/integration`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/README.md` | Server setup/run and test constraints | `pnpm install`; build via `pnpm build`; tests use `.env.test` and isolated `tests/.tmp`; real provider capabilities must be explicit and unavailable capabilities are not passes. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/README.md` | Workspace test and live-provider workflow | `pnpm test:e2e`; real-provider preflight/execution scripts; `RUN_CODEX_E2E=1` gates Codex live suites. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/package.json` | Authoritative scripts/dependencies | `build`, `typecheck`, `test`, and `cleanup:codex-e2e-history`; `pretest` builds shared packages. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/vitest.config.ts` | Test runner | Node environment, fork pool, serial file execution, Prisma setup/global setup, `tests/**/*.test.ts`; prompt-engineering suites excluded. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/test-support/live-e2e/test-runtime-bootstrap.mjs` | Real API E2E environment | Builds server first; starts a loopback server with isolated runtime/database; sanitizes environment; checks readiness from `Server listening ...`; owned runtime can be removed safely. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server repository tests | `autobyteus-server-ts` | `pnpm exec vitest run ... --no-watch` | Prisma global setup resets `tests/.tmp/autobyteus-server-test.db` | Vitest exit status | Test process exits; preserve unrelated worktree state |
| Built API server for live E2E, if selected | worktree root | `pnpm build`; use project `test-support/live-e2e/test-runtime-bootstrap.mjs` | Isolated runtime under `autobyteus-server-ts/tests/.tmp`; loopback only | `Server listening ...` marker | Harness SIGTERM and remove owned runtime/database |
| LM Studio, if selected | External local service | Existing service; load only a model owned for this run with `lms load ...` | Current catalog is reachable at loopback; no model was loaded at investigation time | `GET http://127.0.0.1:1234/v1/models` and model load status | Unload only the model loaded by this run; do not stop shared LM Studio service |
| Claude/Codex live runtimes, if selected | `autobyteus-server-ts` | Existing env-gated integration/E2E commands | Require provider auth and explicit `RUN_CLAUDE_E2E=1` / `RUN_CODEX_E2E=1`; no credentials inferred | Binary/version plus provider model catalog/session startup | Existing suite cleanup; close Codex manager; terminate owned runs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Native agent definition with omitted foundation names | GraphQL `createAgentDefinition` with `toolNames: []` in runtime E2E, or existing `AgentDefinition` fixture in integration tests | Isolated test data/runtime; no production DB | Delete owned temp runtime after run |
| Native standalone/team run | GraphQL `createAgentRun` / `createAgentTeamRun`; existing websocket helpers | No authentication is required by the test schema; use unique IDs and temp workspace roots | Terminate runs; remove temp workspaces/runtime |
| Dummy native model | Existing `DummyLLM` integration fixture | Proves lifecycle/materialization, not provider realism | In-process fixture; no external state |
| Live provider model | LM Studio catalog or provider-specific model catalog | Only run when explicitly available; no fabricated pass for missing auth/model | Close runs/clients and release owned model load |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` persisted-data/state-transition decision; `implementation-handoff.md` Persisted Data Transition Check; `REQ-003`, `REQ-005`, `AC-007`.
- Representative existing-data setup and required behavior: Definitions with empty/omitted `toolNames` must continue reading normally, while native effective exposure adds the tuple without writing to the definition.
- Evidence planned for the approved direct-use outcome: existing policy/factory immutability assertions, native create/restore integration, and (if live environment is available) API-created empty definition through create/terminate/restore.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.test.ts` | Native exact tuple, deduplication, team additive pair, and persisted-array immutability | AC-001/002/003/007; DS-003 | Still Valid | Added with implementation and passed in CRR-001 focused run | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | Registry-backed native instances and stale-name tolerance | AC-004/006; DS-003/004 | Still Valid | CRR-001 focused run passed | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Native factory create/restore config, team/mixed filtering, actual tool instances | AC-001/002/004/006/007; DS-001/002/003 | Still Valid | CRR-001 focused run passed | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts` | Neutral helper remains configured/team-derived and does not add native defaults | AC-005; DS-005 | Still Valid | CRR-001 focused run passed | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts` | Mixed filtering preserves foundation/team tools and removes legacy task names | AC-002/004/005; DS-002/005 | Still Valid | CRR-001 focused run passed | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts` | Fixed prompt ownership, recent read/edit recovery, write selection, fallback, verification | AC-008/009; DS-006 | Still Valid | CRR-001 focused run passed | Retain and rerun |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | Real AgentFactory + DummyLLM native create/restore/terminate lifecycle | BE-001/004; DS-001/003/004 | Needs Update -> corrected and revalidated | The fixture had two stale APIs: `llmFactory` instead of `createLLM`, then backend `getStatusSnapshot()` instead of `getLifecycleSnapshot().phase`; CRR-002/003 confirmed both as Local Fix fixture issues. After bounded corrections, all 4 tests pass and logs show DummyLLM plus 3 native tools prepared during create/restore. | Retain corrected fixture and use as lifecycle integration evidence; route changed durable test through proportional code review |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Live GraphQL create/restore/terminate and websocket native runtime; current empty-definition `write_file` approval/path journey plus explicit lifecycle checks | AC-001/006/007/010 and DS-001/004 | Still Valid for IR-002 -> fresh execution required | Commit `20dc45738` adds `API-NATIVE-WRITE-DEFAULT-001`; it must be freshly executed rather than inheriting API-REV-002 evidence | Retain and rerun; proportional test-code review remains required |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Live all-native team GraphQL/websocket communication, four-tool default exposure, `write_file` approval/path, expected verification, restore, and projection | AC-002/004/006/007/010; DS-002/004 | Still Valid for IR-002 -> fresh execution required | Commit `20dc45738` contains `API-TEAM-WRITE-RESTORE-001`; current test explicitly checks the expected second `run_bash` verification and must be freshly executed | Retain and rerun; route changed durable test code through proportional review |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Live AutoByteus + Codex team runtime and restore/cross-runtime routing | AC-002/005; DS-002/005 | Still Valid | Real boundary is present but gated by LM Studio and Codex flags; native defaults are not directly asserted | Rerun only if provider setup is safe and available |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` and `codex-agent-run-backend-factory.integration.test.ts` | Live external provider lifecycle, tool projection, approval, restore | AC-005; DS-005 | Still Valid | Correct external boundary, but both are explicitly provider/binary/env gated | Run only with explicit provider readiness; skipped means not tested |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts` and team-manager integration suites | Runtime selection and create/restore orchestration | DS-001/002/005 | Needs Update -> corrected and revalidated | The manager double used retired `getStatusSnapshot()`/`subscribeToEvents()` methods; it now implements `getLifecycleSnapshot()`/`subscribeToSourceEventBatches()` with state-driven behavior. Orchestration command passes 23/23. | Retain corrected test double; route changed durable test through proportional code review |

## Stale Or Obsolete Coverage Decisions

No stale or obsolete durable coverage was found. No existing assertion requires removal: the old native omission was not protected by a durable test, and the approved persisted-data behavior is runtime-derived rather than a stored-array migration.

## Durable Coverage Required / Prepared For IR-002

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-NATIVE-WRITE-DEFAULT-001` | Real GraphQL/native websocket standalone create with empty `toolNames` materializes and executes `write_file`, including approval payload, relative path, explicit `base_dir`, side effect, success, and idle | AC-001/006/007/010; DS-001/003/004 | Prepared in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | The changed public boundary is API run creation plus websocket runtime; unit tests cannot prove routing through GraphQL/run manager and real native `write_file` approval/path behavior. Keep the journey env-gated by the existing project convention. |
| `API-TEAM-WRITE-RESTORE-001` | Real all-native team create with empty member `toolNames`, approved `write_file`, expected `run_bash cat` verification, completion, terminate/restore, and routed continuation | AC-002/006/007/010; DS-002/003/004 | Prepared in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Team exposure and restore are a separate server boundary; the fixture must reject unexpected approvals rather than broadly auto-approving. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-NATIVE-WRITE-DEFAULT-001` | `agent-runtime-graphql.e2e.test.ts` native suite | Freshly execute the committed narrow empty-definition journey that requests exactly one `write_file`, observes the real approval and exact `{path, base_dir, content}` payload, approves it, and verifies success, idle, and file contents. | AC-001/004/006/007/010; DS-001/003/004 | Do not alter existing explicit-tool tests; use the committed unique temp workspace and existing websocket/GraphQL helpers. If model/tool reliability fails, classify from the fresh log before any edit. |
| `INTEGRATION-FACTORY-001` | `autobyteus-agent-run-backend-factory.integration.test.ts` native lifecycle fixture | Replace obsolete `llmFactory` injection with the reviewed `createLLM` option and poll the returned backend through `getLifecycleSnapshot().phase`. | BE-001/004; DS-001/003/004; CRR-002/003 | This is a bounded Local Fix to stale test-only API usage; no production alias or boundary collapse is permitted. Exact integration rerun now passes 4/4. |
| `INTEGRATION-MANAGER-001` | `agent-run-manager.integration.test.ts` runtime manager fixture | Replace retired backend-double methods with `getLifecycleSnapshot()` and `subscribeToSourceEventBatches()`, preserving state-driven lifecycle behavior. | BE-001/002; DS-001/002; CRR-004 | Bounded Local Fix to stale test-only contract usage; exact orchestration rerun now passes 3 files / 23 tests. No production alias is permitted. |
| `API-TEAM-VERIFY-001` | `autobyteus-team-runtime-graphql.e2e.test.ts` native team lifecycle fixture | After the first approved `write_file` succeeds, assert the next worker approval is exactly `run_bash` verifying the created file, approve only that invocation, then require its success, assistant completion, and idle state; reject unexpected tools/commands. | BE-002/003; BE-005; AC-002/004; CRR-005 FO-004 | Bounded Local Fix to durable test behavior. Do not prohibit supported verification, auto-approve broadly, alter production, or change team/backend boundaries. |
| `API-TEAM-WRITE-RESTORE-001` | `autobyteus-team-runtime-graphql.e2e.test.ts` native team lifecycle | Freshly execute the committed team journey covering empty definitions, `write_file` approval/path, expected `run_bash` verification, success/completion/idle, terminate/restore, and worker-routed continuation. | AC-002/004/006/007/010; DS-002/003/004; CRR-005 | No further durable edit is planned before execution; any failure must be classified and routed rather than hidden with broad approval. |

## Durable Coverage To Remove

None planned.

## Historical Repository Coverage Execution (API-REV-002; Prior Context Only)

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-mixed-tool-exposure.test.ts tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts --no-watch` | Server worktree | Narrow reviewed implementation and neutral/mixed/prompt regression | Pass | 6 files / 29 tests passed; output `/tmp/agent-runtime-default-core-tools-focused-vitest.log` |
| 2 | `pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts --no-watch` | Server worktree; Prisma test setup | Real AgentFactory/DummyLLM native create/restore/lifecycle | Pass | 4 tests passed after bounded fixture corrections; output `/tmp/agent-runtime-default-core-tools-native-integration-fixed2.log` |
| 3 | `pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/agent-run-manager.integration.test.ts tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts --no-watch` | Server worktree; Prisma test setup | Runtime/team create/restore orchestration and mixed context | Pass | 3 files / 23 tests passed after bounded manager-double correction; output `/tmp/agent-runtime-default-core-tools-orchestration-integration-fixed.log` |
| 4a | `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --no-watch -t "materializes the native foundation baseline"` | Server worktree; owned LM Studio model loaded; isolated Prisma/temp workspace | `API-NATIVE-DEFAULT-001`: GraphQL empty-definition create, native default `run_bash`, approval, execution, workspace side effect, idle cleanup | Pass | 1 test passed / 20 skipped; output `/tmp/agent-runtime-default-core-tools-api-native-default.log`; model load `/tmp/agent-runtime-default-core-tools-lms-load.log` |
| 4b | `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --no-watch -t 'creates a run, restores it, and continues streaming|routes tool approval over websocket and streams the normalized tool lifecycle'` | Same isolated live API setup | Existing native GraphQL create/restore and websocket tool approval/lifecycle | Pass | 2 tests passed / 19 skipped; output `/tmp/agent-runtime-default-core-tools-api-native-lifecycle.log` |
| 4c | `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'` | Same isolated live API setup; all-native team; model loaded | Team GraphQL/websocket approval, side effect, restore and continuation | Pass | 1 test passed / 4 skipped in 24.46s after CRR-005 bounded fixture correction; output `/tmp/agent-runtime-default-core-tools-api-team-lifecycle-fixed4.log`. |
| 5 | `pnpm --filter autobyteus-server-ts typecheck` and `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Server worktree | Package/build type boundary | Partial | Package typecheck exit 2 from documented pre-existing TS6059 (`rootDir: src` includes tests); build-scoped source typecheck exit 0. Outputs `/tmp/agent-runtime-default-core-tools-typecheck.log` and `/tmp/agent-runtime-default-core-tools-build-typecheck.log` |
| 6 | `git diff --check` | Server worktree | Patch hygiene | Pass | No whitespace errors; output `/tmp/agent-runtime-default-core-tools-diff-check.log` |

## Historical Confidence Scorecard (API-REV-002; Not Current IR-002 Evidence)

This scorecard records the prior API-REV-002 result for traceability only. It is not evidence for fresh IR-002/API-REV-003 and must not be reused as the current result.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | Focused assertions cover AC-001 through AC-009; live standalone default-tool and team verification/restore journeys pass | External provider wire isolation remains untested | Provider live suites only if safe credentials/configuration become available |
| Changed-boundary execution directness | 95% | Live GraphQL/run-manager/websocket standalone and team create/approval/restore/continuation paths pass | None material for native changed boundary | None |
| Cross-boundary integration realism and mock gap | 90% | Real LM Studio model passes standalone and team native boundaries; native factory and orchestration integrations pass | Claude/Codex wire projection remains untested | Provider live suites if configured |
| Environment, configuration, identity, and fixture fidelity | 94% | Owned model, isolated Prisma/app/workspaces, explicit base_dir, websocket route key, and cleanup complete successfully | External provider credentials remain absent | Provider setup if safely available |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | Native standalone and team create/terminate/restore/follow-up pass; prior FO-004 failure is resolved; focused integrations pass | External provider lifecycle is not live | Provider lifecycle only if configured |
| User-surface, browser, and desktop-shell confidence | `N/A` | No frontend, browser, web-equivalent renderer, or desktop-shell code changed | None for scope | None |
| Durable regression coverage quality and relevance | 90% | Focused durable tests are requirement-linked; all corrected fixtures and API/team journeys pass | Four durable test paths changed and await proportional review | Route changed test code through code review |

- Overall current confidence: 93% across applicable scored categories (N/A user-surface excluded; simple average; clean target not met)
- Calculation method: Simple average of applicable categories after execution; `N/A` excluded.
- Every critical native/team acceptance criterion directly proven: Yes — external provider wire isolation remains explicitly Not Tested, not counted as a pass
- Any applicable category below `90%`: No; applicable minimum is 90% (durable review remains pending)
- Default clean-confidence target of `95%` met: No
- Material residual risks: external provider wire projection and proportional review of changed durable tests.

## Historical Broader Validation Decision (API-REV-002; Prior Context Only)

- Decision: `Required` and completed for the changed native public boundary
- Selected execution mode: `Live API` plus `Lifecycle`; standalone and team native journeys pass after FO-004 bounded fixture correction. Add `Other` only if a future provider-specific gap requires it.
- Specific confidence gap or residual risk addressed: The source change is in native runtime configuration, but the public GraphQL/run-manager/websocket path could omit or alter the effective defaults; existing live tests do not assert an empty persisted `toolNames` run calling a default foundation tool.
- Why the selected mode can materially improve confidence: It exercises the real API schema, run manager, native factory, registry, websocket approval/event path, workspace side effect, and terminate/restore boundary with an isolated data directory.
- Expected confidence after the selected validation: Native directness, environment, and lifecycle exceed 90%; overall confidence is 93% because provider isolation is unavailable and durable review is pending.
- Browser-specific decision and rationale: `Not Required`. No frontend/rendered/browser behavior changed; API/websocket is the authoritative changed public boundary.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A` because broader execution is required.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: Not applicable; LM Studio live native validation completed. Provider isolation is Not Tested, not a blocker to this native change.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: `N/A`
- Relevant README or development instructions: `N/A`
- Web-equivalent behavior: `N/A`
- Shell-specific or lifecycle behavior: `N/A`
- Chosen validation approach and why it fits the project: `N/A`
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: `None in scope`

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Run repository checks first. For live API, build the server, use the project's isolated `test-support/live-e2e/test-runtime-bootstrap.mjs` or the existing in-process E2E suite, then enable only the explicit LM Studio flag. Load one owned model only if needed.
- Environment choices that materially affect the run: `APP_ENV=test`, isolated SQLite/runtime root under `autobyteus-server-ts/tests/.tmp`, loopback server, unique temp workspace, `RUN_LMSTUDIO_E2E=1`, explicit `LMSTUDIO_MODEL_ID` if required.
- Health / readiness checks: Build exit zero; server `Server listening ...`; LM Studio `/v1/models`; model load status; GraphQL model catalog; websocket `CONNECTED`.
- Seed data / fixtures: GraphQL-created agent definition with `toolNames: []`; unique workspace and run IDs; no production DB or persistent definition files.
- Test identities, authentication, permissions, or session state: No auth in the project test schema; native approval starts with `autoExecuteTools: false`; approval is issued only for the owned run.
- Requirement-linked journeys or scenarios: `API-NATIVE-DEFAULT-001` standalone empty-config default tool; existing native create/restore and all-native team journeys; provider isolation only if provider dependencies are configured.
- DOM, screenshot, log, API, process, or other evidence to capture: Vitest output, model catalog/load output, GraphQL create response, websocket tool approval/success events with `tool_name`, workspace side effect, run restore/idle events, and server output on failure.
- Owned processes and temporary state to clean up: Vitest/server process, created run(s), temp workspaces, isolated data/runtime root, and model loaded by this run; do not stop shared LM Studio.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `API-NATIVE-DEFAULT-PROBE-001` | Temporary Vitest/API or direct factory probe only if the live durable test cannot reliably request a default tool | Confirms observed runtime tool materialization at the real boundary or isolates an environment/model issue | Durable API coverage is preferred; temporary probe is only a fallback for a provider-driven, nondeterministic setup and must be deleted after evidence capture |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Claude/Codex provider isolation | Credentials and explicit live flags are not present at investigation time | Provider wire projection could regress despite neutral tests | Attempt only if safe provider setup is available; otherwise record `Not Tested`, not pass |
| Browser/desktop shell | No affected UI or shell boundary | None in scope | None |

## Ambiguities Or Reroute Triggers

CRR-005 FO-004 is resolved. The durable team fixture now asserts the expected second `run_bash` verification, provides explicit `base_dir` for relative `write_file`, and routes the restored follow-up to worker. Focused live rerun passes. External provider isolation remains Not Tested; do not infer a source defect from unavailable provider credentials.

## Historical Investigation Decision (API-REV-002; Superseded By IR-002)

- Proceed To API/E2E Execution: `Completed for API-REV-002; superseded by fresh IR-002 execution`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — update the existing native GraphQL E2E with API-NATIVE-DEFAULT-001 after this investigation`
- Post-repository confidence: `93%` current; clean target not met due provider isolation and pending proportional review
- Broader validation decision: `Required and completed` — standalone and team native live evidence pass; external provider isolation remains Not Tested
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The team fixture correction is bounded to durable test behavior: assert and approve the expected second `run_bash` verification against the created file, fail on unexpected tools/commands, preserve supported verification behavior, provide explicit base_dir, and route restored follow-up to worker. Focused rerun passes; route the cumulative package through proportional durable-test review.

## CRR-005 Rework Update

- Failure-origin decision: `FO-004`, source not implicated; the second `run_bash` verification is approved native team behavior.
- Durable edit authorized: `API-TEAM-VERIFY-001` in `autobyteus-team-runtime-graphql.e2e.test.ts`.
- Expected second approval contract: worker `TOOL_APPROVAL_REQUESTED`, `tool_name = run_bash`, command verifies `targetAbsolutePath` created by the first `write_file`; approve that invocation only.
- Negative contract: unexpected tool names, unexpected commands, or additional approvals must fail the test rather than be auto-approved or hidden by a one-tool-only prompt prohibition.
- Rework execution note: the reruns exposed bounded fixture-contract issues only: first, a relative `write_file` omitted required `base_dir`; second, a model completed without choosing verification, so the prompt now explicitly asks for `run_bash cat targetAbsolutePath`; third, after the expected verification and restore, the existing team websocket follow-up omitted `target_member_route_key` and the current API rejected it. The fixture now provides the worker route key on the restore follow-up. Production source remains uninvolved.
- Rerun required: focused team lifecycle command, then proportional code review of all changed durable test files before delivery.

## IR-002 Fresh Investigation Update (Pre-Execution)

- Date: 2026-08-14
- Fresh revision: `API-REV-003` pending
- Request basis: fresh coverage and execution requested after `CRR-007` source review of commit `20dc45738`; API-REV-001 and API-REV-002 evidence is historical context only and will not be reused as final evidence.
- Current implementation boundary: native `AUTOBYTEUS_DEFAULT_TOOL_NAMES` is the ordered four-name tuple `run_bash`, `read_file`, `edit_file`, `write_file`; the existing native registry, `write_file` trusted-local path/approval/execution behavior, neutral external helper, and persisted definition shape remain unchanged.
- Durable coverage state: the changed durable tests are already present in the reviewed commit. No additional durable coverage edit is planned before this fresh execution. If execution fails, classify the failure from fresh output before making any fixture change. Any successful durable-test state must receive the separate proportional `code_reviewer` review before delivery.

### Fresh scenario plan

| Scenario ID | Fresh evidence planned | Current validity / decision |
| --- | --- | --- |
| `API-NATIVE-WRITE-DEFAULT-001` | Native standalone GraphQL create with persisted `toolNames: []`; websocket approval for `write_file`; exact relative `path`, `base_dir`, and content; approval, execution success, file side effect, and idle | Prepared and valid; execute the committed test fresh |
| `API-NATIVE-LIFECYCLE-002` | Native standalone create/restore and normalized approval lifecycle over GraphQL/websocket | Existing durable coverage remains valid; execute fresh as create/restore regression evidence |
| `API-TEAM-WRITE-RESTORE-001` | All-native team create with empty member definitions; `write_file` approval/path; expected `run_bash cat` verification only; success, completion, idle, terminate/restore, and worker-routed continuation | Prepared and valid; execute the committed test fresh |
| `INTEGRATION-FACTORY-001` | Native factory DummyLLM create/restore materialization and lifecycle | Corrected durable fixture is valid; execute exact integration command fresh |
| `INTEGRATION-MANAGER-001` | AgentRun manager/team orchestration and current backend lifecycle/source-event double contract | Corrected durable fixture is valid; execute exact orchestration command fresh |
| `EXT-ISOLATION-001` | Claude/Codex neutral-helper and, only if safe credentials/flags exist, live external exposure isolation | Unit/neutral evidence is executable; live provider isolation is `Not Tested` unless explicit safe setup is available |

### Fresh execution order

1. Focused native, resolver, factory, mixed, neutral, and prompt unit suites.
2. Native factory lifecycle integration.
3. Runtime/team orchestration integration.
4. Build-scoped TypeScript check and optional package typecheck characterization (the known `TS6059` package limitation must not be treated as a source failure).
5. Load one owned LM Studio model only if available, execute standalone native write/default and lifecycle journeys, then execute the native team write/restore journey.
6. Inspect environment-gated Claude/Codex capability without fabricating live-provider evidence; record `Not Tested` when explicit credentials/flags are unavailable.
7. Unload only the model owned by this run, verify no model remains loaded, run `git diff --check`, and capture fresh logs under `/tmp/agent-runtime-default-core-tools-ir002-*`.

### Fresh environment and safety decision

- The live native path is safely executable through the existing Vitest live-E2E harness with an isolated SQLite/runtime directory, unique workspaces, and the explicitly selected LM Studio model.
- Browser and desktop-shell validation are `Not Required`: the change is backend/API/WebSocket-only and no rendered or Electron boundary changed.
- Claude/Codex live isolation will be attempted only if provider-specific readiness and explicit run flags are present. Installed binaries alone are insufficient. Otherwise the result will explicitly remain `Not Tested`, while neutral-helper unit tests provide repository evidence.
- No production aliases, fallback exposure, prompt changes, auto-approval, or backend/team boundary changes are authorized by this investigation.

### Pre-execution decision

- Proceed to fresh API/E2E execution: `Yes`.
- Reroute before execution: `No`.
- Failure-origin route if a fresh check fails: update the canonical investigation/report/revision record with the exact fresh command and log, classify source versus durable fixture/environment origin, and send the cumulative package to `code_reviewer` before any unreviewed durable edit.
- Successful route: create/update `API-REV-003` artifacts from fresh logs only, then send the cumulative package to `code_reviewer` for separate proportional durable-test review.

## IR-002 Fresh Execution Update (API-REV-003 Final)

- Date: 2026-08-14
- Fresh result: `Pass` for the reviewed native API/E2E boundary, with Claude/Codex live isolation explicitly `Not Tested`.
- Fresh evidence rule: This update and the canonical execution report use only `/tmp/agent-runtime-default-core-tools-ir002-*` evidence. API-REV-001/API-REV-002 logs are historical context and were not reused as final proof.
- Repository result: focused native/neutral/mixed/prompt suites passed 6 files / 29 tests; native factory integration passed 1 file / 4 tests with DummyLLM plus 4 tools on create/restore; orchestration passed 3 files / 23 tests; build-scoped typecheck passed; package typecheck reproduced the documented pre-existing TS6059 rootDir/tests limitation; diff check passed.
- Fresh standalone result: `API-NATIVE-WRITE-DEFAULT-001` passed through GraphQL create with persisted `toolNames: []`, native `LMStudioLLM` materialization of 4 tools, exact `write_file` approval payload/path contract, successful execution, target file content, and idle cleanup.
- Fresh lifecycle result: `API-NATIVE-LIFECYCLE-002` passed both native create/restore continuation and normalized approval lifecycle tests. The log retains one non-fatal model-driven `write_file` execution failure before a later successful retry in the generic lifecycle test; the final assertion passed and no source exception resulted.
- Fresh team result: `API-TEAM-WRITE-RESTORE-001` passed with an empty-definition worker materializing 6 tools (four native defaults plus `send_message_to` and `delegate_task`), approved `write_file`, expected `run_bash cat` verification, completion/idle, terminate/restore, and worker-routed follow-up. Unexpected tools were not broadly auto-approved.
- External isolation result: provider-gated Claude/Codex integration characterization skipped 8 and 12 tests because `RUN_CLAUDE_E2E` and `RUN_CODEX_E2E` were unset. Binaries and credential-variable presence were observed but no live provider run was started without explicit gates. Neutral-helper isolation tests passed. Final live isolation status is `Not Tested`, not Pass.
- Browser/desktop result: `Not Required`; no browser-rendered, web-equivalent desktop, Electron, or shell-specific boundary changed.
- Cleanup result: owned LM Studio model unloaded; post-unload `lms ps` reported no models; live suites closed sockets, terminated runs, removed owned temporary data, and did not stop shared services.

### Fresh confidence scorecard

| Category | Score | Evidence / remaining uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | Direct fresh unit, integration, standalone, team, approval/path, materialization, persisted-name, neutral, and prompt evidence; live external wire projection remains Not Tested |
| Changed-boundary execution directness | 96% | Real GraphQL/AgentRun/TeamRun/WebSocket create, approval, execution, side effect, idle, restore, and continuation paths passed |
| Cross-boundary integration realism and mock gap | 92% | Real LM Studio model exercised native standalone/team paths; external provider transport is not live |
| Environment/configuration/identity/fixture fidelity | 95% | Isolated Prisma/runtime/workspaces, owned model, explicit model ID, approval mode, and cleanup passed; unavailable remote discovery hosts emitted warnings |
| Failure/edge-case/lifecycle/recovery evidence | 93% | Fresh create/restore/follow-up and approval lifecycle passed; one non-fatal retry and token-usage idempotency warnings remain in logs |
| User-surface/browser/desktop-shell confidence | `N/A` | No UI or desktop boundary in scope |
| Durable regression coverage quality/relevance | 90% | Changed durable tests are narrow, requirement-linked, and executed; proportional review is still pending |

- Overall final confidence: `94%` (simple average of applicable scores; exact average 93.5%, rounded).
- Default clean target: `Not met`; live Claude/Codex isolation is unavailable and proportional durable-test review remains pending.
- Applicable category below 90%: `None`.

### Fresh final decision and routing

- Proceed / reroute decision: `Proceed` with API-REV-003 result; no failure-origin reroute.
- Durable coverage change decision: retain the committed four-tool standalone/team/integration coverage; no further API/E2E durable edit is authorized by this result.
- Required next step: route the cumulative package and fresh evidence through the separate proportional durable-test review by `code_reviewer` before delivery.
- Cumulative API/E2E execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-execution-coverage-report.md`.
- Cumulative API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/api-e2e-revision-record.md`.

## TEST-IR002-001 Proportional Review Rework Update (Pre-Edit)

- Date: 2026-08-14
- Trigger: `code_reviewer` proportional durable-test review for API-REV-003, finding `TEST-IR002-001`.
- Decision: `Reroute / Local Fix` owned by `api_e2e_engineer`; this is a bounded durable team-fixture assertion gap, not a production, design, requirement, native-default, prompt, or runtime-boundary finding.
- Finding: the first worker `TOOL_APPROVAL_REQUESTED` in `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` is currently selected by `agent_name` only and approved without asserting `tool_name` or the `write_file` payload. The fresh log observed the intended request, but durable coverage did not enforce it.
- Required edit: immediately after the first approval is received, assert `payload.tool_name === "write_file"` and assert `{ path: targetRelativePath, base_dir: workspaceRootPath, content: expectedContent }`; preserve invocation-specific approval, exact `run_bash` verification, restore/follow-up, and cleanup.
- Forbidden changes: no production source, native default tuple, prompt contract, compatibility alias, auto-approval broadening, or AgentRun/backend/team boundary change.
- Existing coverage validity: the team scenario remains valid but `Needs Update` for the missing first-call invariant. Other changed durable paths passed proportional review and require no edit.
- Fresh rerun plan: rerun only `API-TEAM-WRITE-RESTORE-001` with the exact existing LM Studio live command after the bounded assertion edit, using a new evidence path `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix.log`; unload/verify the owned model, update canonical reports and revision record, then route the cumulative package back to `code_reviewer` for proportional re-review.
- Failure route: if the focused rerun fails, classify from the fresh log and route a failure-origin package before any further durable change. A passing rerun does not close the stage until proportional review returns Pass.

## TEST-IR002-001 Rework Execution Update

- Date: 2026-08-14
- Fresh revision: `API-REV-004`
- Rework result: `Pass` for the focused `API-TEAM-WRITE-RESTORE-001` scenario; proportional durable-test review remains required before delivery.
- Bounded edit completed: immediately after the first worker approval is received, the durable team fixture now asserts `tool_name === "write_file"` and exact `path === targetRelativePath`, `base_dir === workspaceRootPath`, and `content === expectedContent`. Invocation-specific approval, exact second `run_bash cat` verification, restore/follow-up routing, and cleanup are unchanged.
- Fresh focused command: `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'`.
- Fresh evidence: `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix.log` — 1 test passed, 4 provider-gated tests skipped; the log records the asserted first `write_file`, expected `run_bash` verification, successful execution, assistant completion, restore, and worker follow-up.
- Environment cleanup: the owned LM Studio model was unloaded; `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-lms-unload.log` records success and `/tmp/agent-runtime-default-core-tools-ir002-team-assertion-fix-lms-ps-after.log` reports no loaded models.
- Failure-origin classification: no fresh failure occurred; `TEST-IR002-001` was a durable assertion-coverage gap only. No production source, native default, prompt contract, compatibility behavior, approval policy, or AgentRun/backend/team boundary changed.
- Coverage decision: the team scenario is now `Valid` for the required first-call invariant, subject to fresh proportional `code_reviewer` review of the changed durable test.
- Next route: return the cumulative package and fresh focused evidence to `code_reviewer` with handoff type `api_e2e_durable_test_proportional_review`. Do not treat API-REV-004 as final delivery approval until that review passes.
