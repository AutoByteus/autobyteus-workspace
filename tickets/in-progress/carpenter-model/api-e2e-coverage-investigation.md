# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/system-prompt-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/agent-identity-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/working-environment-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/bash-operating-practice-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/file-and-directory-practice-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/team-and-runtime-prompt-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/prompt-value-binding-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/system-skill-decision.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/classroom-simulation-composed-system-prompt.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: `CRR-002` source-review Pass for `IR-002` at commit `cc8817fee1047504fea5c87bd69bb48ede287d88`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 completed disposition and execution result

## Current Requirement And Design Basis

Every supported native AutoByteus, Codex, and Claude run must receive one shared carpenter semantic prompt through its actual high-authority instruction boundary. The prompt owns ordered Agent Identity, optional Team Instruction, optional Team Runtime, Working Environment, exact Bash Operating Practice, exact File And Directory Practice, and—only for native when valid configured skills resolve—a terminal metadata/path-only `## Skills` catalog. Optional identity/team values omit cleanly, authored headings remain contained even around exact fenced-Markdown edge cases, required invalid values fail before provider invocation, and final provider payloads contain no unresolved double-brace tokens. Provider-native tools remain out of band. Valid team contexts automatically add and deduplicate exactly `send_message_to` and `delegate_task` across native/Codex/Claude; standalone exposure remains configured-only. The exact workspace is distinct from skill roots and remains the default shell cwd. Historical JSON supersets are directly usable without migration: the retired processor field is ignored and current writes omit it. No generic prompt-mutator pipeline, compatibility path, skill taxonomy, text tool catalog, or provider lifecycle redesign is valid.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001`, `004`, `007`, `009`, `010` / cross-runtime prompt | Changed | `R-001`, `R-004`, `R-009`, `R-011`, `R-012`; `DS-001` | Recheck exact shared composition plus each actual provider projection; add active native evidence at the GraphQL/runtime boundary. |
| `BEH-002`, `006` / configured skills | Preserved/refactored | `R-002`, `R-008`; `DS-003`, `DS-005` | Preserve lazy bodies and source-neutral resolution; prove native terminal catalog still names an external manifest without redefining workspace. |
| `BEH-003`, `011` / team protocol and tools | Changed | `R-003`, `R-013`; `DS-002`, `DS-006` | Prove standalone preservation, team automatic union/deduplication, provider-native projection, and no Available Tools prompt catalog. |
| `BEH-005` / workspace versus skill root | Changed | `R-007`, `AC-007` | Expand active native E2E to bind different `W`/`S`, inspect prompt, run default and nested shell cwd, and verify the skill package is not modified. |
| `BEH-008`, `012` / closed composition and validation | Changed/removed | `R-010`, `R-014`; `SR-004`, `CRR-002` | Re-run focused containment/final-payload suites and search public/current surfaces; stale processor-field persistence coverage needs an explicit negative current-write assertion. |
| Agent-definition API/UI persistence | Removed field | `AC-005`, `AC-010`; `IR-002` | Validate current GraphQL-backed file writer omits `systemPromptProcessorNames`; retain current other processor-array contract. |
| Historical snapshots/sessions | Preserved | Directly Usable — No Migration | Preserve exact historical context/session behavior; do not add migration or compatibility coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Shared composer, team renderer, automatic tool exposure, native final step | Focused server/core unit and integration suites | Active GraphQL-created definition/skill through real native backend/tool context | In-process lifecycle E2E |
| API / transport / contract | Yes | GraphQL authoring omits retired field; MCP session input renamed to runtime exposure | JSON persistence E2E and MCP route integration exist | Inherited negative persistence edit has no explicit absence assertion; MCP suite is stale | GraphQL/file E2E plus route integration |
| Frontend component / state | Yes | Obsolete processor option/detail/payload removed | Mounted form/store/integration tests | Live layout only; no new UI or interaction | Focused mounted DOM; browser only if repository evidence is insufficient |
| Browser integration / user journey | No material new journey | Existing form loses one obsolete control | Mounted component tests | Browser bundling/typecheck has documented toolchain blocker | None expected |
| Authentication / session / permissions | No semantic auth change | Provider tool/session transport preserved | MCP route auth/secret-leak integration | Stale runtime-exposure fixture prevents execution | Route integration after update |
| Desktop renderer / web-equivalent UI | No material renderer change | Removed control only | Mounted Vue DOM | Responsive/focus rendering of a deleted control is negligible | None expected |
| Desktop shell / Electron-specific integration | No | No IPC/window/package change | N/A | None | None |
| Process / lifecycle | Yes | Claude system prompt every query; native append/validate/configure; sessions unchanged | Claude websocket and session suites, native factory/core bootstrap | Three lifecycle suites use retired setup names | Update and re-run deterministic paths; live provider remains optional |
| Persisted-data transition | Yes, preserved decision | Current file projection ignores historical supersets and writer omits field | JSON persistence E2E plus file-provider/source units | Removed assertion alone does not prove omission | Add explicit negative writer assertion |
| Worker / queue / distributed coordination | No | Team context only; no worker/queue change | Team renderer/exposure units | None | None |
| External integration | Preserved | Codex/Claude provider channels and MCP lifecycle | Non-network unit/integration plus gated live suites | Stochastic provider compliance and local credentials/binaries | Not required unless deterministic boundary evidence fails |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model`
- Project type and runtime stack: pnpm TypeScript monorepo; Vitest; Fastify/GraphQL/WebSocket/MCP; Prisma/SQLite test setup; native core runtime; Codex app-server and Claude Agent SDK adapters; Nuxt/Vue web client
- Conflicting, missing, or unclear project instructions: None. Server instructions require `vitest run ... --no-watch`; web instructions require `--run`. Full server and Nuxt typechecks have documented repository/toolchain blockers, so source-only server checking, core build, and executable suites are the truthful substitutes rather than inferred success.
- Required environment variables or secrets available: N/A for selected deterministic coverage. Live LM Studio/Codex/Claude suites require explicit gates/runtimes/credentials and are not required to execute deterministic changed boundaries.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch`. |
| `autobyteus-web/AGENTS.md` | Closest web test instruction | Prefer `pnpm test:nuxt ... --run`; do not enter watch mode. |
| root `package.json` | Workspace scripts | `test:e2e` routes to server Vitest; live E2E has a separate preflight/runner and is not the normal deterministic path. |
| `autobyteus-server-ts/package.json` and Vitest config | Server execution | Direct Vitest uses repository Prisma test setup; source-only `tsc -p tsconfig.build.json --noEmit` avoids known test-root blocker. |
| `autobyteus-ts/package.json` | Core execution | Direct Vitest for focused suites; `pnpm build` compiles production and verifies runtime dependencies. |
| implementation handoff environment notes | Known limitations | Dependencies installed frozen; Prisma generated; server full typecheck and Nuxt typecheck blockers are pre-existing/documented. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server Vitest/Prisma | Worktree root | Direct `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Isolated SQLite setup; in-process GraphQL/Fastify where required | Passing suite startup/setup | Project test teardown |
| Native active-backend fixture | Server E2E | Existing configured-skill lifecycle fixture | Temp app data/workspace/memory; deterministic no-network LLM; real registry/services/backend/core AgentFactory | Backend `isActive()` and tool/prompt assertions | Terminate backend/LLM, restore registry/singletons, remove temp root |
| MCP route integration | Server integration | Existing Fastify loopback fixture | Ephemeral loopback port and capability session | `app.ready()` / MCP SDK connection | Close SDK client and Fastify app |
| Web mounted DOM | Web package | Focused `test:nuxt ... --run` | Happy DOM/Nuxt test harness | Passing component/store assertions | Test-managed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/skill current writer | Actual GraphQL schema and services | Isolated test app-data | Test cleanup removes created agent/skill directories |
| Workspace `W` and skill root `S` | Temp workspace plus GraphQL-created skill under isolated app-data | Different directory roots, no shared user data | Recursive temp-root cleanup |
| Historical JSON superset | Existing generic file projection and current writer contract | No migration or destructive rewrite | Fixture-only; current writer output retained only during assertion |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` → Persisted Data / State Transition Decision; `implementation-handoff.md` → Persisted Data Transition Check
- Representative existing-data setup and required behavior: Historical JSON may contain an unrecognized retired key; current normalizers project only recognized fields, runtime never executes retired processors, and current GraphQL/file writers omit the key.
- Evidence planned for the approved outcome: Strengthen the inherited JSON persistence E2E with explicit absence of `systemPromptProcessorNames`, re-run current provider/service/public-surface tests, and retain residual source search evidence. No bulk rewrite is asserted.
- Migration-specific completion/recovery scenarios: N/A
- Upstream ambiguity or reroute required: No

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts` | GraphQL writes `agent.md` and current `agent-config.json`; inherited revision removed the retired-field positive assertion | `AC-005`, `AC-010`; direct-use decision | **Needs Update** | Simply deleting a positive assertion stops protecting the approved current-writer omission. | Add explicit `not.toHaveProperty("systemPromptProcessorNames")`; re-run. |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Live Claude create/restore/tool lifecycle | `AC-004`; provider lifecycle preserved | **Needs Update** | Scenario remains supported, but imports/constructs removed configured-exposure/context fields. | Rename fixture to runtime exposure and provide carpenter prompt; load/skip unless live gate is available. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Real loopback MCP listing/calling/auth/error/secret isolation | `AC-003`, `AC-004`; `DS-006` | **Needs Update** | Boundary remains authoritative, but every session fixture uses retired `configuredExposure`. | Replace with runtime exposure names/field; execute fully. |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Deterministic WebSocket → Claude SDK create/resume lifecycle plus gated live cases | `AC-004`, `AC-014`; Claude create/resume risk | **Needs Update** | Scenario is valuable, but its direct context fixture uses removed exposure fields and omits the new required carpenter prompt. | Use current runtime exposure, compose a real carpenter prompt, and assert identical SDK `systemPrompt` plus raw user prompt across turns. |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Actual GraphQL skill/agent → active native backend → explicit reader → filesystem freshness | `AC-002`, `AC-007`, `AC-008`; `DS-001`, `DS-003`, `DS-005` | **Needs Update** | It crosses the strongest native boundary but does not yet assert carpenter order/workspace or default/nested shell cwd. | Expand narrowly with carpenter/workspace/no-body assertions and explicit `run_bash` cwd checks while retaining external skill-root non-modification evidence. |
| `carpenter-prompt-composer.test.ts` and containment cases | Exact order, omission, binding failures, team rendering, fenced heading containment | `AC-001`, `009`–`014`; `DS-001`, `DS-004` | **Still Valid** | Direct pure-owner coverage matches approved exact contract and `CRR-002`. | Re-run unchanged. |
| `runtime-agent-tool-exposure.test.ts`, native resolver/factory, Codex bootstrap, Claude bootstrap/tool-gating | Standalone configured set; team union/dedup; provider projections | `AC-003`, `AC-004`, `AC-013`, `AC-014`; `DS-006` | **Still Valid** | These are the actual shared/provider request owners and contain no compatibility behavior. | Re-run unchanged. |
| Core `system-prompt-processing-step`, direct catalog, AgentConfig, AgentFactory skill integration, public-surface suites | One direct append, final rejection, lazy catalog, removed generic surface | `AC-002`, `AC-008`, `AC-010`, `AC-014`; `DS-005` | **Still Valid** | `CRR-002` confirms a real registered skill and clean public boundary. | Re-run unchanged. |
| Web Agent Definition form/store/integration suites | Removed obsolete input/detail/payload; current fields remain | `AC-005`, `AC-010` | **Still Valid** | Mounted DOM/state tests exercise the affected surface directly. | Re-run unchanged; no browser journey planned unless failures expose integration risk. |
| Gated all-runtime/team communication and real Claude/Codex suites | Live provider compliance and delivery | `AC-003`, `AC-004`, `AC-013` | **Still Valid but not selected** | They remain meaningful but require external gates and are stochastic; deterministic provider-boundary tests prove the changed implementation. | Do not modify solely to force local execution; record as not run. |
| Historical snapshot/session tests | Exact stored context and provider sessions remain historical | persisted-data decision | **Still Valid** | Approved no-migration contract explicitly preserves history rather than recomposing it. | Re-run representative unchanged lifecycle/snapshot coverage where included. |

## Stale Or Obsolete Coverage Decisions

No durable test file is obsolete or selected for removal. The three pre-revision suites have stale fixtures/imports, not obsolete scenario intent. The inherited persistence scenario remains useful and requires a stronger negative assertion rather than removal.

## Durable Coverage To Add

None planned as a new file. The strongest existing active native and Claude WebSocket scenarios already own the required lifecycle boundaries and will be expanded in place.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-E2E-001` | `json-file-persistence-contract.e2e.test.ts` | Explicitly assert current `agent-config.json` omits the retired processor field | `AC-005`, `AC-010`; Directly Usable — No Migration | Inherited durable edit disposition: **Needs Update**, not pre-approved. |
| `API-E2E-002` | `claude-session-manager.integration.test.ts` | Current runtime exposure/context fixture names plus carpenter prompt | `AC-004`; preserved session lifecycle | Live-gated scenario remains valid. |
| `API-E2E-003` | `agent-tools-mcp-routes.integration.test.ts` | Current runtime exposure import and `runtimeExposure` session input | `AC-003`, `AC-004`; `DS-006` | Fully executable deterministic route integration. |
| `API-E2E-004` | `claude-agent-websocket-interrupt-resume.e2e.test.ts` | Current context fields; real composed carpenter prompt; assert stable separate SDK system prompt and raw user prompts across create/resume | `AC-004`, `AC-010`, `AC-014` | Deterministic fake SDK still crosses actual WebSocket/session/client projection. |
| `API-E2E-005` | `configured-skill-on-demand-loading.e2e.test.ts` | Assert carpenter sections/order, `W` versus `S`, terminal metadata/no body, default and nested `run_bash` cwd, and no skill-package mutation | `AC-001`, `AC-002`, `AC-007`, `AC-008`, `AC-011`, `AC-012` | Uses actual GraphQL/services/native backend/core tools/filesystem. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Changed Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- |
| 1 | Server Vitest: five updated E2E/integration files | `API-E2E-001`–`005`: current persistence omission, current runtime exposure, loopback MCP, Claude create/resume projection, active native carpenter/workspace/skill/shell behavior | **Pass** — 4 files passed, 1 live-gated file skipped; 17 tests passed, 9 gated tests skipped | `api-e2e-execution.log` |
| 2 | Server Vitest: nine composer/exposure/native/Codex/Claude/team suites | Exact composition/containment, provider projection, configured resolution, automatic team tools, invalid/failure boundaries | **Pass** — 9 files / 84 tests | `api-e2e-execution.log` |
| 3 | Core Vitest: five final-payload/catalog/config/AgentFactory/public-surface suites | Closed native append/validate/configure boundary, lazy skill metadata, removed public mutator surface | **Pass** — 5 files / 48 tests | `api-e2e-execution.log` |
| 4 | Nuxt Vitest: five Agent Definition component/store/integration suites | Retired user/API payload surface absent while current definition behavior remains | **Pass** — 5 files / 16 tests | `api-e2e-execution.log` |
| 5 | Server source-only TypeScript check | Production server source type integrity | **Pass** | `api-e2e-execution.log` |
| 6 | Core build plus runtime-dependency verifier | Production core compile and distributable dependency closure | **Pass** | `api-e2e-execution.log` |
| 7 | Retired-current-source-surface search and `git diff --check` | Clean cut in current source and patch hygiene | **Pass** — no current-source matches; no whitespace errors | `api-e2e-execution.log` |

The final authoritative execution at commit `cc8817fee1047504fea5c87bd69bb48ede287d88` passed 165 deterministic tests across 23 passing files; one live Claude file containing eight tests and one live subcase were skipped by their explicit external-provider gates. Skips are not counted as passes.

## Execution-Time Coverage Decision Revisions

- `json-file-persistence-contract.e2e.test.ts`: final disposition **Needs Update → Updated and Valid**. The inherited removal is now protected by an explicit current-write absence assertion; its real GraphQL/file scenario passed.
- `claude-session-manager.integration.test.ts`: final disposition **Needs Update → Updated; Valid but gated**. Its current runtime-exposure/context fixture loads successfully; eight live Claude tests remained gated because external provider execution was not selected.
- `agent-tools-mcp-routes.integration.test.ts`: final disposition **Needs Update → Updated and Valid**. Eleven real loopback MCP tests passed. Execution exposed the fixture's stale `emitLocalEvent` method; current production context requires async `publishEvent`, so the fixture was corrected locally and rerun.
- `claude-agent-websocket-interrupt-resume.e2e.test.ts`: final disposition **Needs Update → Updated and Valid**. Four deterministic WebSocket/session/SDK scenarios passed, including exact raw user prompts and one stable Carpenter system prompt across create/resume; one live subcase stayed gated.
- `configured-skill-on-demand-loading.e2e.test.ts`: final disposition **Needs Update → Updated and Valid**. The real active native lifecycle passed. Initial development execution exposed macOS `/var` versus `/private/var` temp-path canonicalization in the test fixture; the fixture now supplies the authoritative canonical workspace path via `realpath`, then passed without production changes.
- No durable coverage was added or removed. Five existing files were updated. No failure required upstream rerouting.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | Direct executable mapping covers `AC-001`–`AC-005` and `AC-007`–`AC-014`; `AC-006` is delivery-owned documentation work | Delivery has not yet completed documentation sync |
| Changed-boundary execution directness | 98% | Real GraphQL/file services, active native backend/core tools, loopback MCP, WebSocket/session/client projections, mounted Vue | External model text compliance is not an implementation boundary |
| Cross-boundary integration realism and mock gap | 96% | Production registries/services/storage/backends/transports are used; only external model/provider response generation is controlled or gated | No paid/stochastic provider call |
| Environment, configuration, identity, and fixture fidelity | 97% | Isolated real app-data/workspace/skill roots, canonical filesystem paths, real provider config owners, loopback networking | Single macOS/arm64 host |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Optional/invalid binding, fence containment, final-payload rejection, create/resume/interrupt, persistence and two-read freshness all pass | Live provider reconnect/compliance not rerun |
| User-surface, browser, and desktop-shell confidence | 95% | Five mounted Nuxt component/store/integration files prove retired UI/payload absence; no new interaction, layout, IPC, or shell behavior exists | No browser/desktop pixel inspection |
| Durable regression coverage quality and relevance | 97% | Five narrow updates in existing boundary-owning suites; 165 deterministic tests pass; no compatibility tests retained | Proportional test-code review pending |

- Overall post-repository confidence: **97%** (rounded simple average: `96.57%`)
- Every critical acceptance criterion directly proven: **Yes** for executable implementation criteria; delivery-owned `AC-006` remains explicitly outside this round
- Any applicable category below `90%`: **No**
- Default clean-confidence target of `95%` met: **Yes**
- Material residual risks: live external-provider compliance remains stochastic/gated; full server and Nuxt typechecks retain documented pre-existing blockers; external source-authored skill cleanup is out of repository scope; proportional review of changed durable coverage is pending.

## Broader Validation Decision

- Decision: **Not Required**
- Selected execution mode completed: deterministic lifecycle/API execution using real in-process GraphQL/file services, active native backend/core tools/filesystem, real loopback MCP, actual WebSocket/session/client projections with a deterministic Claude SDK adapter, provider bootstrap owners, and mounted Nuxt DOM/store integration.
- Direct evidence making additional browser/desktop/live-provider execution unnecessary: the changed user surface is deletion of an obsolete control and payload field, directly proven by mounted UI/store tests and the real current writer; no layout, IPC, window, packaging, or desktop-shell path changed. The high-authority provider payload mappings are directly asserted before external transport. Actual model prose compliance would be stochastic and would not improve changed-boundary proof.
- Confidence after repository execution: **97%**, with every applicable category at least 95%.
- Browser-specific decision: not required for a removed control with direct mounted DOM and persistence evidence.
- External live-provider decision: not required; eight live Claude tests and one live WebSocket subcase remained honestly gated.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron-wrapped Nuxt web app
- Web-equivalent behavior: the Agent Definition form/detail/payload no longer exposes the retired processor selection
- Validation executed: focused mounted Nuxt/Vue component, store, and integration tests — 5 files / 16 tests passed
- Shell-specific or lifecycle behavior: none changed
- Effect on any already-running desktop application: none
- Behavior not directly proven: pixel-level browser/desktop rendering; negligible confidence consequence because the affected control is removed and no layout/interaction contract was added

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Eight live Claude session-manager tests and one live WebSocket subcase | Explicit external binary/credential/provider gate; deterministic production projection and lifecycle boundaries passed | Low | None unless delivery policy separately requires live provider smoke |
| Full server `tsconfig.json` typecheck | Documented repository `TS6059` root/include issue | Known tooling limitation; source-only TypeScript check and affected Vitest suites passed | Do not claim full typecheck |
| Nuxt typecheck | Documented current `vue-tsc`/TypeScript export incompatibility | Known tooling limitation; affected mounted tests passed | Do not claim Nuxt typecheck |
| External authored-skill body cleanup | Explicitly outside repository/ticket implementation | Authored content can still duplicate foundations | External package owners |
| Durable documentation `AC-006` | Delivery-owned integrated-state synchronization | Docs incomplete until delivery | Delivery engineer must update or record no-impact |

## Investigation Decision

- Proceed To API/E2E Execution: **Completed**
- Repository-Resident Durable Coverage Added / Updated / Removed: **0 added / 5 updated / 0 removed**
- Final confidence: **97%**
- Broader validation decision: **Not Required** after direct deterministic lifecycle evidence
- Latest authoritative result: **Pass**
- Reroute Required: **Yes — changed durable coverage must receive proportional `code_reviewer` review before delivery**
- Recommended Recipient: `code_reviewer`
- Notes: Mandatory investigation preceded every durable edit and final execution. Initial stale-suite and inherited-edit decisions are preserved above; execution evidence changed them only from planned updates to validated updates.
