# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/code-review-revision-record.md`
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: Created after the first completed result
- Current API/E2E Revision ID: `N/A` (initial investigation before completed execution)
- Current Investigation Round: `1`
- Trigger: CRR-002 source-review Pass after IR-002 documentation-artifact hygiene correction
- Prior Investigation Reviewed: `N/A` — no API/E2E revision record or completed API/E2E result exists for this ticket
- Latest Authoritative Investigation: This initial investigation

## Current Requirement And Design Basis

The reviewed refactor splits Carpenter prompt composition into an explicit shared entrypoint and a native AutoByteus entrypoint. Native AutoByteus must receive Agent Identity, optional Team Instruction, optional Team Collaboration, Working Environment, Bash Operating Practice, and File And Directory Practice in that order before the native configured-skills append. Claude and Codex must receive only the approved shared identity/team context through their existing SDK `systemPrompt` and Codex `baseInstructions` fields; native-only workspace, Bash, and file-operation guidance must not leak into either external prompt. Team context must survive standalone and mixed team/task-agent create and restore paths. Runtime tool exposure, provider approval/sandbox/path behavior, and persisted definitions/settings must remain unchanged.

The implementation handoff records persisted data as `Not Affected`, no migration, no compatibility alias/fallback, and no provider/tool bootstrap change. CRR-002 confirms the source review passes after the range diff hygiene correction; the corrected delta contains only ticket artifacts, so the previously reviewed production and test behavior remains authoritative.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BE-001 / server prompt composition | Changed | Requirements REQ-001/002; design DS-001 | Prove shared/native output ownership, ordering, validation, and no native suffix in external output |
| BE-002 / provider injection seams | Preserved at field boundary; composed content changed | Requirements REQ-003/007; design DS-002/004/006 | Exercise native `AgentConfig.systemPrompt`, Claude SDK `systemPrompt`, and Codex `baseInstructions` through bootstrap tests and available live create/restore paths |
| BE-003 / capability-consistent prompt wording | Changed | Requirements REQ-002/004; design BE-003 | Assert external prompts omit native-only guidance while provider-native and team MCP/tool behavior remains intact |
| BE-004 / ownership and clean rename | Changed | Requirements REQ-005; design shared/native ownership and `Team Collaboration` terminology | Recheck scoped source/tests/docs and prompt-output assertions; no old scoped symbol or heading should be required |
| BE-005 / native behavior and external isolation | Preserved/Changed | Requirements REQ-006; design DS-005 | Fresh native standalone/team create/restore and external-gated characterization are required |
| BE-006 / mixed team/task-agent context | Preserved | Requirements REQ-001/003/007; design DS-003/005/007 | Recheck existing mixed-team integration and live E2E where safe; record provider-gated mixed paths as Not Tested when flags are unavailable |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Prompt composition and runtime backend bootstrap inputs | Focused prompt, native factory, Claude bootstrap, and Codex bootstrap unit tests | Real provider/native bootstrap lifecycle may still differ from unit doubles | Live API / lifecycle |
| API / transport / contract | Yes | Existing GraphQL/WebSocket create/restore paths receive the scoped prompt indirectly | Existing `agent-runtime-graphql` and team runtime E2E suites | Provider-wire prompt projection is gated for Claude/Codex | Live API |
| Frontend component / state | No | No frontend files or rendered state changed | N/A | None in scope | None |
| Browser integration / user journey | No | No browser/UI contract changed | N/A | None in scope | Not Required |
| Authentication / session / permissions | Indirectly | Claude/Codex session/thread injection fields remain existing seams | Bootstrap/session unit tests and gated live integrations | Live credentials/provider sessions unavailable unless explicitly enabled | Live provider integration |
| Desktop renderer / web-equivalent UI | No | No renderer or web UI changed | N/A | None in scope | Not Required |
| Desktop shell / Electron-specific integration | No | No shell/preload/IPC code changed | N/A | None in scope | Not Required |
| Process / lifecycle | Yes | Native, Claude, and Codex create/restore bootstrap paths | Integration and runtime E2E fixtures exist | Full live external lifecycle may be unavailable | Lifecycle / Live API |
| Persisted-data transition | No | Prompt strings are transient; definitions/settings remain unchanged | Handoff/design explicitly say `Not Affected`; existing create/restore tests | No migration evidence needed | Not Required |
| Worker / queue / distributed coordination | Indirectly | Mixed team context reaches selected runtime bootstrap | Mixed team integration and runtime E2E suites | Fully live mixed external provider path may be gated | Worker/team lifecycle |
| External integration | Yes | Claude SDK and Codex App Server consume shared prompt through existing fields | Provider unit tests and provider-gated integration/E2E suites | Live Claude/Codex wire projection depends on explicit flags/auth | Provider-gated live execution |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts`
- Project type and runtime stack: TypeScript Node server, Vitest, Prisma SQLite test harness, GraphQL/Fastify/WebSocket runtime, native LM Studio, Claude Agent SDK/CLI, and Codex App Server/CLI adapters.
- Conflicting, missing, or unclear project instructions: None found. `AGENTS.md` is authoritative for Vitest commands; package scripts and `vitest.config.ts` define build/typecheck/test setup.
- Required environment variables or secrets available: `Partial`. LM Studio is installed and local models are available; Claude/Codex binaries are installed, but live flags are unset and provider credential readiness is not claimed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/AGENTS.md` | Repository test instructions | Use `pnpm ... exec vitest run ... --no-watch`; integration tests under `tests/integration` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/package.json` | Build/typecheck/test scripts | `prepare:shared` before build/typecheck/test; build-scoped check uses `tsconfig.build.json` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/vitest.config.ts` | Test runner setup | Node environment, forks, Prisma setup/global setup, repository_prisma inline transform |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/.env.example` | Runtime defaults | LM Studio target model is documented; no provider secrets recorded |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/README.md` | Server setup/data policy | SQLite test/production data, startup migrations, no prompt persistence/migration |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docker/README.md` | Optional container/provider auth guidance | Claude/Codex auth is explicit; container path is not needed for this backend-only run |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Shared packages | Worktree parent | `pnpm prepare:shared` or package-native build | Required before server checks | Build exit 0 | No persistent process |
| Prisma test database | Server worktree | Vitest global setup/reset | Isolated `tests/.tmp` SQLite per suite | Vitest migration/reset output | Suite teardown; no shared DB stop |
| LM Studio local model | Host-owned local service | `lms load <model> --ttl 1800 -y` only if needed | Validation owns only the selected model load | `lms ps` and live test discovery | `lms unload <same model>`; verify `lms ps` empty |
| Claude CLI / SDK | Host | No start unless explicit live gate is set | Provider auth and flag required | `claude --version` is not auth/readiness proof | Test teardown; do not alter shared auth |
| Codex CLI/App Server | Host | No start unless explicit live gate is set | Provider auth and flag required | `codex --version` is not auth/readiness proof | Test teardown/client manager close |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Native standalone agent/run | Existing GraphQL runtime E2E fixture | Unique temp app data/workspace and Prisma reset | Suite termination and temporary-directory cleanup |
| Native team member/run | Existing AutoByteus team GraphQL E2E fixture | Unique team definition, team run, member workspace; no shared data | Socket/app close, run termination, temp cleanup |
| Claude/Codex provider runs | Existing gated integration/E2E fixtures | Do not enable without explicit safe flags/auth; binaries alone are insufficient | Existing suite teardown if run |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` Persisted Data / State Transition Decision and `implementation-handoff.md` Persisted Data Transition Check
- Representative existing-data setup and required behavior: Existing agent/team definitions, tool names, runtime configuration, and provider settings remain readable and unchanged; prompt strings are assembled transiently at create/restore.
- Evidence planned: native and external create/restore paths use existing definitions/configuration; repository checks inspect no schema/migration/runtime-data changes.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts` | Exact native order/content, shared-only output, workspace omission, placeholder validation, heading normalization | REQ-001/002/004/006; AC-002/003/004/005 | Still Valid | CRR-002 reviewed 5-file/56-test suite | Re-run unchanged |
| `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Native factory injects native prompt and preserves team/tool behavior | REQ-001/003/006/007; AC-003/006/007 | Still Valid | Source review and implementation checks | Re-run unchanged |
| `tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts` | Claude bootstrap/session permission behavior with shared prompt boundary | REQ-003/006/007; AC-004/007 | Still Valid | CRR-002 package | Re-run unchanged |
| `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Claude shared prompt plus team/MCP gating without native tool assumptions | REQ-003/004/006; AC-004/006 | Still Valid | Existing targeted assertions | Re-run unchanged |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Codex `baseInstructions`, create/restore, team context, and native-section absence | REQ-003/006/007; AC-004/007 | Still Valid | Existing create/restore assertions | Re-run unchanged |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Runtime GraphQL/WebSocket standalone create/restore, native prompt-reaching run, plus gated Claude/Codex suites | DS-002/004/006; AC-003/004/007 | Still Valid | Existing durable runtime E2E with explicit gates | Run native focused journeys; characterize external gates |
| `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Native team create/restore, team context and tool lifecycle over WebSocket | DS-003; AC-003/007 | Still Valid | Existing live LM Studio team suite | Run focused create/restore scenario |
| `tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | AutoByteus + Codex mixed team delivery and restore | DS-003/007; AC-007 | Still Valid | Explicit LM Studio+Codex gate | Run only if safe flags/auth exist; otherwise Not Tested |
| `tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | AutoByteus+Codex+Claude nested team context and restore | DS-003/005/007; AC-007 | Still Valid | Explicit all-provider gate | Characterize gate; no unapproved live setup |
| `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Claude shared prompt injection and provider session interrupt/resume, with fake and gated live cases | REQ-003/007; AC-004/007 | Still Valid | Existing fake executable coverage and live gate | Re-run fake coverage; characterize live gate |
| `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | Native factory DummyLLM create/restore lifecycle and prompt injection | DS-002; AC-003/007 | Still Valid | Existing deterministic integration | Re-run unchanged |
| `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` | Real native backend create/restore and tool/prompt consequence | DS-002; AC-003/006/007 | Still Valid | Explicit LM Studio gate | Run if local model is safely available |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | Live Claude create/restore/provider tool paths | DS-004/005; AC-004/007 | Still Valid | Explicit Claude gate and CLI readiness | Characterize gate; run only with explicit enablement |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Live Codex create/restore/provider tool paths | DS-006/007; AC-004/007 | Still Valid | Explicit Codex gate and CLI readiness | Characterize gate; run only with explicit enablement |
| `tests/integration/agent-execution/agent-run-manager.integration.test.ts` and `tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts` | Runtime selection, lifecycle, and mixed team context hydration | DS-002–DS-007; AC-001/007 | Still Valid | Existing integration contracts | Re-run unchanged |

## Stale Or Obsolete Coverage Decisions

None. The old composer and `Team Runtime` contract were intentionally removed by the reviewed implementation; no durable test asserting them remains in the scoped changed paths. The explicitly historical `autobyteus-ts` document is outside this change and is not current runtime coverage.

## Durable Coverage To Add

None planned. Existing unit, integration, and runtime E2E coverage already maps to the approved shared/native boundary and create/restore spines. A new durable test would duplicate current scenarios without covering a missing requirement.

## Durable Coverage To Update

None planned before execution. The implementation's durable test edits are already review-passed; API/E2E will not modify repository tests unless fresh execution proves a current assertion stale or insufficient. Any later durable change requires a new investigation update and proportional review.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts --no-watch` | Server worktree; Prisma setup | Shared/native prompt output, native injection, Claude/Codex isolation, team/provider preservation | Planned | `/tmp/runtime-specific-carpenter-prompt-focused-vitest.log` |
| 2 | `pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts tests/integration/agent-execution/agent-run-manager.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend-factory.integration.test.ts --no-watch` | Server worktree; Prisma reset | Native lifecycle, runtime selection, mixed team context | Planned | `/tmp/runtime-specific-carpenter-prompt-integration.log` |
| 3 | `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Server worktree | Build-scoped source type boundary | Planned | `/tmp/runtime-specific-carpenter-prompt-build-typecheck.log` |
| 4 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --no-watch -t 'AutoByteus creates a run, restores it, and continues streaming on the same websocket'` | `RUN_LMSTUDIO_E2E=1`, owned local model | Native standalone GraphQL/WebSocket create/restore | Planned | `/tmp/runtime-specific-carpenter-prompt-native-restore.log` |
| 5 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --no-watch -t 'AutoByteus materializes the native write_file baseline when the persisted definition omits it'` | `RUN_LMSTUDIO_E2E=1`, owned local model | Native prompt/tool materialization boundary and persisted empty definition | Planned | `/tmp/runtime-specific-carpenter-prompt-native-write.log` |
| 6 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts --no-watch -t 'creates a real team, approves a tool call, restores it, and continues on the same websocket'` | `RUN_LMSTUDIO_E2E=1`, owned local model | Native team/member context create/restore over GraphQL/WebSocket | Planned | `/tmp/runtime-specific-carpenter-prompt-team-restore.log` |
| 7 | Provider-gated Claude/Codex integration and mixed E2E characterization with flags unset | No live provider enablement without explicit safe credentials | External isolation status and available evidence | Planned | `/tmp/runtime-specific-carpenter-prompt-provider-gates.log` |
| 8 | `git diff --check origin/personal...HEAD` and changed-artifact whitespace scan | Server worktree | Range patch hygiene after review fix | Planned | `/tmp/runtime-specific-carpenter-prompt-diff-check.log` |

## Post-Repository Confidence Scorecard

Initial pre-execution estimate after the investigation and reviewed repository coverage:

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 91% | Focused tests directly assert shared/native output, injection fields, order, and external native-section absence | Real provider/native create/restore and mixed context are not yet executed | Live native and provider-gated lifecycle |
| Changed-boundary execution directness | 78% | Unit/bootstrap tests cover exact prompt fields and current call sites | API/WebSocket and provider session consequences are not yet fresh evidence | Native GraphQL and available provider live journeys |
| Cross-boundary integration realism and mock gap | 80% | Deterministic native integration and existing E2E fixtures are available | Provider-wire paths and full mixed team are gated | LM Studio plus safe Claude/Codex execution |
| Environment, configuration, identity, and fixture fidelity | 85% | Project setup, isolated Prisma harness, unique temp workspaces, and local runtimes are documented | External auth/flags and model readiness are not yet exercised | Owned LM Studio run; provider readiness characterization |
| Failure, edge-case, lifecycle, and recovery evidence | 84% | Existing create/restore and interrupt/resume coverage is broad | Fresh execution and live restore evidence are pending | Native restore/team restore and provider lifecycle |
| User-surface, browser, and desktop-shell confidence | `N/A` | Backend prompt/bootstrap refactor; no UI or Electron boundary | None in scope | Not applicable |
| Durable regression coverage quality and relevance | 94% | Existing 5-file/56-test prompt/bootstrap suite and durable runtime lifecycle tests are narrow and requirement-linked | Proportional review of any API/E2E edits would be downstream; none planned | Fresh execution only; no new durable coverage needed |

- Overall post-repository confidence: `85%` (simple average of applicable scores; N/A excluded)
- Calculation method: Simple average; N/A excluded
- Every critical acceptance criterion directly proven: `No` — live create/restore and provider-wire consequences remain pending
- Any applicable category below 90%: `Yes` — changed-boundary execution directness, integration realism, environment fidelity, and lifecycle evidence are pre-execution gaps
- Default clean-confidence target of 95% met: `No`
- Material residual risks: provider prompt projection could still differ at live runtime boundaries; native and mixed team create/restore need realistic execution.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API`, `Lifecycle`, and `Worker or Distributed` for native standalone/team paths; provider-gated integration characterization for Claude/Codex
- Specific confidence gap: unit tests do not prove the final GraphQL/WebSocket bootstrap consequence, native restore, team context propagation, or external provider wire projection
- Why selected mode materially improves confidence: existing project E2E harnesses exercise real GraphQL/WebSocket/runtime factories with isolated SQLite/temp workspace state and can use an owned LM Studio model; external provider suites already provide safe explicit gates
- Expected confidence after selected validation: `92–95%` if native journeys pass; external live isolation remains a clearly scored Not Tested limitation when gates are unavailable
- Browser-specific decision and rationale: `Not Required`; no frontend, browser, or Electron behavior changed

## Desktop Application Validation Decision

- Desktop framework / shell: None applicable
- Relevant README or development instructions: server `AGENTS.md` and `README.md`
- Web-equivalent behavior: None; changed boundary is backend prompt/bootstrap/runtime lifecycle
- Shell-specific or lifecycle behavior: No shell-specific behavior changed
- Chosen validation approach: repository/live API/lifecycle checks only
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: provider live wire projection if gates remain unset

## Live Environment And Fixture Plan

- Startup order: run repository checks; inspect provider binaries/flags; load only one owned LM Studio model if needed; execute native standalone then native team scenarios; run provider-gated tests without enabling absent flags; unload and verify model state.
- Environment choices: use isolated Vitest Prisma test database/app-data directories, unique temporary workspaces, explicit `RUN_LMSTUDIO_E2E=1`, and `LMSTUDIO_MODEL_ID` selected from `lms ls`/runtime discovery. Never record secret values.
- Readiness checks: `lms ps`, `lms ls`, `claude --version`, `codex --version`, and test harness provider discovery; binaries do not count as live auth readiness.
- Seed data / fixtures: existing GraphQL agent/team definition fixtures; no shared persisted data.
- Test identities/session state: generated agent/team/run IDs, temp workspaces, test Prisma state, no user auth dependency.
- Requirement-linked journeys: native standalone create/restore; native team member create/restore; provider prompt injection/gating characterization; mixed context where safe.
- Evidence: Vitest output, GraphQL/WebSocket lifecycle events, prompt/tool assertions, provider gate counts, cleanup/model state.
- Owned cleanup: selected LM Studio model, test app/runtime temp directories, sockets, runs, and any generated definitions/workspaces created by the suites.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `API-NATIVE-RESTORE-001` | Existing live `agent-runtime-graphql.e2e.test.ts` targeted test with LM Studio | Native prompt reaches real run through create/restore/WebSocket | Already durable project coverage; no temporary probe needed |
| `API-NATIVE-TEAM-RESTORE-001` | Existing live AutoByteus team GraphQL E2E targeted test | Member team context and native prompt reach team create/restore | Already durable project coverage; no temporary probe needed |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Claude wire prompt projection | `RUN_CLAUDE_E2E` unset; no safe explicit provider enablement claimed | Shared prompt could differ only at live SDK boundary, despite unit/fake coverage | Record Not Tested; rerun with explicit safe gate/auth if user supplies it |
| Live Codex wire prompt projection | `RUN_CODEX_E2E` unset; no safe explicit provider enablement claimed | Shared prompt could differ only at live App Server boundary | Record Not Tested; rerun with explicit safe gate/auth if user supplies it |
| Full mixed/nested all-provider team journey | Requires LM Studio + Codex + Claude flags/auth | Team context across all three runtime adapters remains less direct | Run only when all explicit safe gates are available; do not fabricate Pass |
| Browser/desktop shell | No changed UI/shell boundary | None material to this ticket | Not Required |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| No current ambiguity identified; existing prompt and runtime contracts are explicit after CRR-002 | N/A | Requirements/design/handoff/code review align | None |
| Any fresh failure in existing durable tests must be classified before a fixture edit | Local Fix / Design Impact / Requirement Gap / Unclear as evidence dictates | Skill-required failure-origin routing | `code_reviewer` |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `85%` pre-execution estimate
- Broader validation decision: `Required` — live native API/lifecycle/team execution; provider-gated characterization
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `code_reviewer` only if execution fails or durable coverage changes
- Notes: This initial investigation predates any API/E2E result. It creates the canonical investigation before final execution; `API-REV-001` will be recorded only after the completed result.

## Fresh Execution Failure-Origin Update (API-REV-001)

- Date: 2026-08-15
- Fresh execution status: `Fail` in the optional broader native backend-factory LM Studio integration; the native GraphQL standalone restore, native write-file materialization, native team create/restore, repository unit/integration checks, and fake Claude WebSocket coverage passed.
- Initial environment failure: running `autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` with an explicit `LMSTUDIO_MODEL_ID=qwen/qwen3.6-35b-a3b` failed before the changed path with `LLMFactory` model-not-found. This was an environment/model-identifier mismatch, not a source failure.
- Safe rerun: the same integration command was rerun with `LMSTUDIO_MODEL_ID` unset so the fixture discovered the active LM Studio identifier. Model discovery and native backend materialization then succeeded, proving the previous error was not the implementation issue.
- Remaining failure-origin classification: `Local Fix` owned by `api_e2e_engineer`, pending focused `code_reviewer` failure-origin review. The durable fixture `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` calls retired `backend.subscribeToEvents()` at lines 252, 340, and 402; the current `AgentRunBackend` contract uses source-event batches. Its publish-artifact assertion also expects a relative path while the current projection returns the absolute workspace path. These failures occur in an existing durable fixture after backend creation and before any prompt assertion; the reviewed implementation does not change the backend event contract or publish-artifact path behavior.
- Forbidden action before review: do not add production aliases, change AgentRun/backend boundaries, alter prompt composition, or make further durable fixture edits until `code_reviewer` confirms the failure origin and bounded correction.
- Fresh evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio.log` (explicit model mismatch) and `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-rerun.log` (fixture contract/path failures).
- Cleanup evidence: `/tmp/runtime-specific-carpenter-prompt-lms-unload.log` and `/tmp/runtime-specific-carpenter-prompt-lms-ps-after.log`; the owned model was unloaded and no models remain loaded.
- Failure route: update the canonical execution report and revision record, then send the cumulative package to `code_reviewer` with `api_e2e_failure_origin_review`. Do not claim a broad Pass while this fixture failure remains unresolved.

## Repository And Broader Execution Update

- Focused repository suite: `Pass` — 5 files / 56 tests (`/tmp/runtime-specific-carpenter-prompt-focused-vitest.log`).
- Deterministic integration suite: `Pass` — 3 files / 19 tests (`/tmp/runtime-specific-carpenter-prompt-integration.log`). Native DummyLLM create/restore, AgentRunManager runtime selection, and mixed team context hydration passed.
- Build-scoped TypeScript: `Pass` — exit 0 (`/tmp/runtime-specific-carpenter-prompt-build-typecheck.log`). Package typecheck reproduced the pre-existing `TS6059` tests-under-`rootDir: src` limitation (`/tmp/runtime-specific-carpenter-prompt-package-typecheck.log`).
- Provider/fake characterization: `Pass` as gated — 4 fake Claude WebSocket tests passed and 21 Claude/Codex live/provider tests skipped because explicit flags were unset (`/tmp/runtime-specific-carpenter-prompt-provider-gates.log`).
- Native live API: `Pass` — standalone create/restore, native write-file materialization, and native team create/restore passed with an owned LM Studio model (`/tmp/runtime-specific-carpenter-prompt-native-restore.log`, `/tmp/runtime-specific-carpenter-prompt-native-write.log`, `/tmp/runtime-specific-carpenter-prompt-team-restore.log`).
- Broader fixture failure: `NATIVE-FACTORY-LIVE-001` failed on the safe model-discovery rerun. Model discovery and 4-tool native materialization succeeded; the existing fixture then called missing `backend.subscribeToEvents()` and expected a relative artifact path where the projection returned an absolute workspace path (`/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-rerun.log`). This is preliminarily a durable fixture Local Fix, not a source failure.
- Patch hygiene: range diff and investigation whitespace scan passed (`/tmp/runtime-specific-carpenter-prompt-diff-check.log`).
- Post-repository confidence after completed repository checks: `85%`; final execution confidence: `87%` because the stale live factory fixture failed and external provider wire execution remains Not Tested.
- Investigation decision update: no durable coverage edit is authorized before `code_reviewer` failure-origin review. The cumulative result is `Fail` pending that review; route the complete package with `api_e2e_failure_origin_review`.

## Authorized Durable Fixture Correction Before API-REV-002

- Date: 2026-08-15
- Failure-origin decision: `code_reviewer` CRR-003 classified `NATIVE-FACTORY-LIVE-001` as `Local Fix` owned by `api_e2e_engineer`; the reviewed Carpenter prompt source is not implicated.
- Authorized scope: update only `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` to use the current `AgentRunBackend` source-event-batch subscription and lifecycle snapshot contracts, while preserving the `AgentRun` wrapper subscriptions/status calls.
- Exact edits authorized: replace the three direct-backend `subscribeToEvents` calls with `subscribeToSourceEventBatches` and flatten each readonly batch into the existing event array; replace the three direct-backend status polls with `getLifecycleSnapshot().phase === "idle"`; retain the wrapper calls unchanged; assert the publish-artifact projection against the canonical absolute real path while retaining the relative tool input.
- Explicitly prohibited: production aliases, fallback methods, compatibility wrappers, prompt changes, AgentRun/backend boundary changes, altered tool or approval behavior, or broadened fixture auto-approval.
- Execution gate: rerun the exact focused LM Studio fixture after the bounded edit, update the canonical API/E2E reports, and route the changed durable fixture through proportional `code_reviewer` review before delivery.

## API-REV-002 Focused Rerun Failure-Origin Update

- Date: 2026-08-15
- Durable correction applied: the three direct-backend subscriptions now use `subscribeToSourceEventBatches` with batch flattening; the three direct-backend idle polls now use `getLifecycleSnapshot().phase`; the publish-artifact projection now expects `await fsPromises.realpath(artifactAbsolutePath)`. The `AgentRun` wrapper `subscribeToEvents` and `getStatusSnapshot` calls were preserved.
- Exact rerun: `env -u LMSTUDIO_MODEL_ID RUN_LMSTUDIO_E2E=1 pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts --no-watch`.
- Fresh result: `Fail`, 3/4 tests passed. Denied approval, auto-execution, and publish-artifact paths passed. The approval-path test reached native backend materialization, received and approved a `write_file` request, emitted `TOOL_EXECUTION_STARTED`, then emitted `TOOL_EXECUTION_FAILED`; it timed out waiting for `TOOL_EXECUTION_SUCCEEDED` at fixture line 294.
- Preliminary classification: `Unclear`, requiring focused `code_reviewer` failure-origin review. The stale fixture contract issue is resolved; this remaining failure could be model/tool-input behavior, environment/runtime execution behavior, or a source defect. No source cause is inferred from the log alone.
- Forbidden action before review: do not make another durable fixture edit, alter write_file/tool execution production behavior, add aliases/fallbacks, or change AgentRun/backend boundaries until `code_reviewer` classifies the new failure.
- Fresh evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api002.log`; setup evidence `/tmp/runtime-specific-carpenter-prompt-lms-load-api002.log` and `/tmp/runtime-specific-carpenter-prompt-lms-ps-before-api002.log`.
- Routing: update the canonical execution report and `api-e2e-revision-record.md`, then send the full cumulative package to `code_reviewer` with `api_e2e_failure_origin_review`. Proportional durable-test review remains deferred until a successful rerun.

## CRR-004 Authorized One-Run Diagnostic Probe Before API-REV-003

- Date: 2026-08-15
- Authorization: `solution_designer` forwarded CRR-004 / API-REV-002 as an `Unclear` workflow-progression reroute and authorized exactly one non-production diagnostic rerun or temporary reverted probe for the native LM Studio approval-path case.
- Probe scope: temporarily log the converted `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_FAILED`, `TOOL_LOG`, and `ERROR` event payloads from the existing source-event-batch subscription, including tool invocation arguments and error/details; restore the fixture byte-for-byte after the single targeted run.
- Prohibited: production changes, prompt/refactor changes, compatibility aliases/fallbacks, auto-approval changes, additional durable fixture corrections, or boundary changes. A durable correction is permitted only if the captured arguments prove invalid.
- Required evidence: invocation `path`, `base_dir`, and `content`; failed-event error/details; and the corresponding `AGENT_ERROR_OUTPUT_GENERATION` projection or `[TOOL_EXCEPTION]` source message.
- Rerun target: only `converts approval and tool lifecycle events through the backend event stream`; no full-suite rerun is authorized in this diagnostic step.

## CRR-004 Diagnostic Result And Bounded Fixture Correction

- Diagnostic evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api003-diagnostic.log` captured the exact converted events. `TOOL_EXECUTION_STARTED` contained `tool_name: "write_file"`, `arguments.path: "approval-flow-test.txt"`, `arguments.content: "line one\\nline two"`, and no `arguments.base_dir`. The subsequent `TOOL_LOG` contained `[TOOL_EXCEPTION]` stating that relative paths require an explicit absolute `base_dir`; the projected `ERROR` had source `ToolExecution.Exception.write_file`, matching details; `TOOL_EXECUTION_FAILED` carried the same error.
- Classification: `Local Fix` owned by `api_e2e_engineer`. The captured model arguments are invalid under the authoritative write_file contract: a relative path without `base_dir` must fail. This is not evidence of a production regression in the reviewed Carpenter prompt source or the file-tool path guard.
- Bounded durable correction applied: only the first approval-path test prompt in `tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` now explicitly supplies the required relative `path`, absolute `base_dir` (`workspaceDir`), and exact `content`. No production source, prompt composer, compatibility behavior, approval behavior, or runtime boundary changed.
- Temporary probe cleanup: the fixture was restored automatically after the one targeted diagnostic run; only the CRR-003-authorized durable fixture changes plus this bounded test-prompt correction remain.
- Diagnostic result: `Fail` for the one targeted test, with invalid model arguments proven. The other three tests were intentionally skipped in this exact-one-run diagnostic.
- Next route: send the cumulative package and changed fixture to `code_reviewer` for proportional durable-test review. Do not claim the corrected prompt path is green until a later explicitly authorized validation rerun.

## API-REV-004 Authorized Focused Rerun

- Date: 2026-08-15
- Authorization: `code_reviewer` CRR-005 proportional durable-test review passed the bounded first approval-path prompt correction and authorized the later focused rerun.
- Rerun scope: execute the current durable LM Studio factory fixture without diagnostic instrumentation; preserve the CRR-003 contract corrections and CRR-004 explicit absolute `base_dir` prompt correction.
- Exact command: `env -u LMSTUDIO_MODEL_ID RUN_LMSTUDIO_E2E=1 pnpm --filter autobyteus-server-ts exec vitest run tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts --no-watch`.
- Required evidence: fresh 4-test result, native backend/tool materialization, approval/write_file success and side-effect assertions, denied/auto-exec/publish lifecycle paths, teardown, and model cleanup. Do not reuse API-REV-002 or API-REV-003 as final rerun evidence.
- Failure route: if this rerun fails, classify the new origin and route through focused failure-origin review; if it passes, update API/E2E artifacts and complete delivery handoff with CRR-005 test-review Pass.

## API-REV-004 Result — Authorized Focused Rerun Passed

- Date: 2026-08-15
- Fresh execution: `Pass` — the exact authorized LM Studio factory command completed 4/4 tests with no diagnostic instrumentation.
- Evidence: `/tmp/runtime-specific-carpenter-prompt-native-factory-lmstudio-api004.log`. The run created the native backend, materialized four tools, completed the corrected approval/write_file path, and passed denied-approval, auto-execution, and publish-artifact lifecycle paths.
- Approval/write_file proof: the corrected first approval scenario supplied the relative path, absolute `workspaceDir` base directory, and exact two-line content; approval, execution success, side-effect, event conversion, completion, and idle assertions passed.
- Create/restore/materialization proof: the direct native factory fixture passed its create lifecycle and restore/follow-up cases with the current source-event-batch and lifecycle snapshot contracts; four native tools were prepared during the live run.
- Failure-origin status: no new failure occurred. The prior CRR-004 invalid-model-argument classification remains resolved by the CRR-005-reviewed bounded durable prompt correction. No production source, compatibility behavior, prompt composer, or runtime boundary changed.
- Cleanup: `/tmp/runtime-specific-carpenter-prompt-lms-unload-api004.log` confirms the owned model was unloaded; `/tmp/runtime-specific-carpenter-prompt-lms-ps-after-api004.log` confirms no models remain loaded. The live fixture teardown closed runs/sockets and cleaned isolated test state.
- External-runtime isolation: live Claude/Codex wire execution remains `Not Tested` because the explicit provider gates/authentication were unavailable; fake Claude characterization and provider gating remain recorded separately.
- Durable-test review: `code_reviewer` CRR-005 proportional review passed the bounded fixture correction before this rerun; no additional durable test edit was made after that review.
- Decision: API/E2E execution is complete for the safely executable native scope. Hand off the cumulative package to `delivery_engineer`; retain live Claude/Codex as an explicit residual risk rather than claiming coverage.
