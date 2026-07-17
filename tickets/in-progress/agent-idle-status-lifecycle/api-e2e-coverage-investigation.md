# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/production-trace-evidence.md` (evidence only; approval applicability `N/A`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/code-review-report.md`
- Current Investigation Round: `5`
- Trigger: User refreshed the active superrepository DeepSeek credential and requested completion of live AutoByteus standalone and team validation.
- Prior Investigation Reviewed: `Round 4`
- Latest Authoritative Investigation: `Round 5`

## Current Requirement And Design Basis

The critical invariant is `live runtime + current active turn = running`; `live runtime + no active turn = idle`; a terminated runtime is offline. An authoritative start or explicit active snapshot may establish active state. Only a matching current-turn completion/interruption or valid matching terminal/global failure may close/fail identified work. Generic segment/tool/todo/inter-agent/system-task activity is content and must not open or reopen lifecycle state. Delayed content from a retired turn remains observable, while old or duplicate boundaries and mismatched terminal/error evidence cannot disturb a newer turn.

The reviewed implementation centralizes this contract in a replacement-array lifecycle transformer, serializes pipeline plus listener delivery per run, makes canonical `AGENT_STATUS` the sole backend/frontend status event, carries strict diagnostic/turn-terminal/runtime-global error evidence, and correlates accepted commands before terminal settlement. The frontend's former activity-driven `error -> running` repair is deleted. Live stream, reconnect snapshots, focused header, and team-tree presentation must therefore converge on the same backend status. Existing metadata and raw traces are directly usable without migration.

The production supplement proves the exact defect shape: a Codex turn completed and projected idle, then a delayed same-turn tool result arrived minutes later and the prior processor derived running. That exact sequence is the primary deterministic regression. Real Codex, Claude, and AutoByteus timing; restored-context isolation; mixed-team converter reuse; same-run listener sequencing; canonical error/status adjacency; and browser convergence remain the main execution risks after source review.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / canonical start authority | Changed | R-001/R-002/R-008; AC-001/AC-008; reviewed DS-001/DS-005 | Prove boundary-only fallback and real runtime start/running projection; ordinary activity alone must not open a turn. |
| BEH-002 / matching terminal and retired IDs | Changed | R-003–R-005/R-011; AC-001–AC-003/AC-011/AC-012; production trace | Prove exact `start(A) -> complete/idle(A) -> delayed tool(A)` keeps idle and preserves tool content; prove old A cannot disturb B. |
| BEH-003 / live and reconnect projection | Changed | R-005/R-007; AC-002/AC-006/AC-007/AC-010 | Add a real pipeline-to-`AgentRun`-to-WebSocket integration regression and strengthen live runtime reconnect proof. |
| BEH-004 / command/error correlation | Changed | R-006/R-010/R-011; AC-004/AC-011; design AR-002 | Execute pending/identified/anonymous command regressions, error effect mapping, fast completion, runtime-global failure, and realistic consecutive turns. |
| BEH-005 / offline distinction | Preserved | R-001/R-009; AC-005 | Execute termination/restore lifecycle coverage and confirm terminated snapshots remain offline while completed live runs are idle. |
| BEH-006 / frontend canonical status only | Changed internally; presentation preserved | R-007; AC-006; design AR-003 | Execute service/status/presentation coverage and a browser journey when safe setup can materially prove live/snapshot convergence. |
| Error payload fields | Added | Design canonical error contract; code review docs-impact verdict | Execute SDK serialization plus all adapter mappings; ensure incomplete historical errors remain content-only, not a legacy lifecycle path. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Turn state machine, canonical error evidence, `AgentRun` snapshot, command association | Extensive unit suites | Real adapter timing and listener delivery | Integration + live runtime |
| API / transport / contract | Yes | Additive error fields; WebSocket status/content ordering and ACK status | Mapper/stream/unit and existing runtime E2E | Exact late-tool stream plus reconnect through the real processing spine | Real WebSocket integration + live API |
| Frontend component / state | Yes | Activity no longer mutates lifecycle; explicit status still does | Focused Nuxt service/status tests | Actual browser store/render convergence | Browser development path |
| Browser integration / user journey | Yes | Focused header/tree consume canonical status; no UI visual redesign | happy-dom service/component coverage | Real browser subscription/reconnect timing | Browser |
| Authentication / session / permissions | No direct contract change | Existing provider CLI/session auth only enables live tests | Existing gated E2E infrastructure | Provider credentials may limit a runtime | Live API; record exact blocker if unavailable |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt status renderer used by Electron and browser development mode | Nuxt tests | Live web-equivalent status convergence | Browser preferred |
| Desktop shell / Electron-specific integration | No | No preload, IPC, native module, window, or packaging change | Electron unaffected | None material | None; do not disrupt the running app |
| Process / lifecycle | Yes | Start/complete/interrupt/error/terminate/restore semantics | Unit and env-gated runtime E2E | Real provider and restore timing | Live API/lifecycle |
| Persisted-data transition | Yes, direct-use decision | Existing metadata/raw traces unchanged; in-memory state rebuilt | Reader/source tests and historical evidence | Restored context with reused public ID | Restore E2E + focused context-isolation regression |
| Worker / queue / distributed coordination | Yes | Per-run promise queue; mixed-team member converter caches | Queue/unit/team tests | Real listener ordering and mixed-team live reuse | Integration + live mixed-team |
| External integration | Yes | Codex CLI, Claude CLI, LM Studio/AutoByteus runtimes | Gated live E2E suites | Local availability/auth/model behavior | Live API |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Project type and runtime stack: pnpm TypeScript monorepo; Fastify/GraphQL/WebSocket backend; AutoByteus SDK; Nuxt/Vue web renderer; Electron desktop wrapper.
- Conflicting, missing, or unclear project instructions: server package `typecheck` is a known repository-baseline `TS6059` failure because tests are outside `rootDir`; authoritative implementation compilation uses `tsconfig.build.json`. Web `nuxi typecheck` has known unrelated baseline failures. No repository Playwright/Cypress config exists, but `playwright-core` and local Google Chrome are available for a temporary browser journey.
- Required environment variables or secrets available: `Yes`. Local Codex CLI and Claude CLI/SDK authentication passed. The user-refreshed `DEEPSEEK_API_KEY` in the active superrepository returned HTTP 200 in round 5 and enabled live AutoByteus standalone and team execution. The key was injected only into child test processes; no secret value was printed, copied, or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `vitest run` / `--no-watch`; integration tests can be targeted by path. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/AGENTS.md` | Closest web instruction | Colocated tests; `pnpm test:nuxt ... --run`; do not use broad git staging. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/README.md` | Monorepo live-runtime authority | Codex tickets must run backend tests with `RUN_CODEX_E2E=1`; web test command is `pnpm -C autobyteus-web test`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-server-ts/README.md` | Server setup/run/test authority | Build then run `dist/app.js`; custom `--data-dir`; live Codex suites are gated; E2E uses temporary suite data. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/README.md` | Browser development authority | External backend URLs via `.env`; `pnpm dev`; browser path is web-equivalent renderer; tests use Nuxt Vitest. |
| `autobyteus-server-ts/vitest.config.ts` | Server test runner | Node/forks, file-parallelism off, Prisma test setup/global setup, `tests/**/*.test.ts`. |
| `autobyteus-web/vitest.config.mts` | Web test runner | Nuxt + happy-dom, colocated tests, test setup. |
| Root/server/web package manifests | Build and test scripts | Server `build:full`; SDK build; web `test:nuxt` and `test:electron`. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies/generated types | Worktree root | Existing offline install; Prisma/Nuxt preparation as needed | No dependency/lockfile change | builds/typecheck/tests resolve modules | No cleanup beyond ignored generated output |
| Codex live runtime | Server package | `RUN_CODEX_E2E=1 ... vitest run ...` | `codex-cli 0.144.4` found; suite owns temp app data | model catalog/start event and WebSocket response | suite teardown closes app-server manager and removes temp data |
| Claude live runtime | Server package | `RUN_CLAUDE_E2E=1 ... vitest run ...` | Claude Code `2.1.207`; refreshed CLI OAuth authenticated successfully in round 2 | model catalog/start event and WebSocket response | suite teardown and temp data cleanup |
| AutoByteus + LM Studio | Server package | `RUN_LMSTUDIO_E2E=1 ... vitest run ...` | Local `/v1/models` returned HTTP 200; choose available text model | model catalog and live response | suite teardown; LM Studio is pre-existing and will not be stopped |
| AutoByteus + DeepSeek | Server package | `RUN_LMSTUDIO_E2E=1 LMSTUDIO_MODEL_ID=deepseek-v4-flash ... vitest run ...` with the key loaded only into the child environment | User-refreshed active-superrepository credential returned HTTP 200; `deepseek-v4-flash` selected exactly | direct `/models` credential probe; standalone and two-member team GraphQL/WebSocket journeys | suite teardown; no credential file copied into worktree |
| Browser development path | Worktree | Built server on unique port with temp data; Nuxt dev on a unique port; Chrome headless through `playwright-core` | Must not touch existing AutoByteus process on port 29695 | HTTP readiness + semantic DOM/status assertions | stop only owned server/Nuxt/Chrome; remove temp data |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Runtime definitions/runs | Existing GraphQL mutations and E2E helpers | Random IDs and temp workspaces/app data | suite/browser-run teardown and recursive temp removal |
| Team/member status | Existing mixed-team creation and WebSocket E2E fixtures | Do not use historical user runs as mutable fixtures | temp team app data removed |
| Historical direct-use evidence | Existing production trace/metadata read plus restore E2E | Read-only historical evidence; no rewrite | retained upstream supplement only |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design lines 295–308; implementation handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: existing run/team metadata and raw traces remain readable; restored runtime contexts with the same public run ID must start with isolated lifecycle state; historical incomplete error payloads remain diagnostic-only content.
- Evidence planned: existing restored-context unit regression; live terminate/restore/continue runtime E2E; read-only production metadata/trace evidence; source/legacy audit proving no versioned read/write or migration path.
- Migration-specific scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/events/lifecycle-status-event-transformer.test.ts` | Exact late-tool sequence, old A/new B, fallback, diagnostics, recovery, terminal/global failure, duplicates, all statuses, restored-context isolation | AC-001–AC-003/AC-008–AC-012; DS-005 | Still Valid | Assertions match approved deterministic contract | Execute; do not weaken. |
| `.../agent-run-event-dispatch-queue.test.ts` | Same-run serialization, cross-run parallelism, rejection continuation/cleanup | DS-001; queue risk | Still Valid | Direct queue-owner coverage | Execute with broader server set. |
| `.../agent-run-command-coordinator.test.ts` and registry tests | Pending/identified/anonymous association, delayed A, fast B, diagnostics, global failure, ACK ordering | AC-004/AC-011/AC-012; DS-004 | Still Valid | Round-3 source-review regressions passed | Execute. |
| Runtime converter/session/thread tests for AutoByteus/Claude/Codex | Boundary/status ordering; diagnostic/terminal/global mappings; mismatch guards | R-002/R-003/R-010/R-011 | Still Valid | Provider-specific origin coverage | Execute complete changed runtime set. |
| SDK notifier/stream/turn-runner tests | Additive error fields and genuine failed outcome | Error contract; BEH-004 | Still Valid | Structured publisher contract remains current | Execute, plus SDK integration coverage. |
| `agent-run-lifecycle-observation`, `AgentRun`, compaction/improver/team/task/external-channel tests | Canonical status/effect consumption and no non-status hint inference | BEH-003/BEH-004 | Still Valid | Covers downstream consumers aligned during implementation | Execute changed/adjacent set. |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Real Fastify/WebSocket normalization and reconnect status snapshots using fake runs | AC-006/AC-007 transport contract | Needs Update | It currently bypasses the lifecycle transformer and real `AgentRun` | Add a real processing-spine late-tool/reconnect scenario. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` — create/restore/continue | Live AutoByteus/Codex/Claude GraphQL and WebSocket turns settle idle | AC-001/AC-004/AC-005 | Needs Update | It proves idle but does not reconnect while the completed live run remains active | Add fresh-socket idle snapshot and assert no post-terminal running before reuse. |
| Codex/Claude/AutoByteus standalone/team runtime E2E suites | Real tool, team, restore, interrupt, projection, and inter-agent paths | AC-001/AC-004–AC-007/AC-010 | Needs Update | Existing gated live infrastructure is valid; round-5 DeepSeek execution exposed one provider-specific stale forced-tool configuration | Execute targeted lifecycle-relevant scenarios; conditionally disable DeepSeek thinking only when `tool_choice: required`, then rerun. |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | All current activity categories preserve status; canonical running recovers error | R-007/R-010; AC-006 | Still Valid | Directly tests removed frontend inference boundary | Execute. |
| `autobyteus-web/services/runStatus/__tests__/agentRuntimeStatusState.spec.ts` and status handler tests | Canonical status/snapshot/overlay projection | R-007; AC-006/AC-007 | Still Valid | Approved frontend owner | Execute with presentation/team store regressions. |
| Team workspace/status visual/presentation tests | Focus/tree components consume canonical status and map idle/running colors/labels | AC-006 | Still Valid | Presentation unchanged and tested independently | Execute broader focused frontend set. |
| Repository full server/web suites | Regression safety across shared processor and frontend dispatch | Shared all-runtime change | Still Valid | Shared central boundaries have broad blast radius | Run per project instructions after focused checks. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion / Fixture | Why It Is Obsolete | Upstream Evidence | Replacement Coverage |
| --- | --- | --- | --- | --- |
| `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | A fake backend emitted status-only idle without the identified terminal boundary, expected direct raw `TURN_STARTED` delivery to synthesize status inside `AgentRun`, and expected the activation overlay to clear before the accepted result settled. | The reviewed contract closes an identified turn only on its matching terminal; processing belongs upstream of `AgentRun`; accepted-result reconciliation owns final overlay/ACK alignment. | R-003/R-006/R-008; AC-004/AC-008; design DS-001/DS-004; source-review CR-001/CR-002. | Updated the fake backend sequence to emit matching terminal + canonical idle and canonical running companion, and moved the overlay-clear assertion after accepted ACK. |
| `tests/integration/agent/agent-websocket.integration.test.ts` restore scenario | Expected ACK `initializing` even after the accepted result was positively associated with an in-flight turn, then accidentally matched that repair event when looking for a later interruptible canonical running event. | CR-001 explicitly requires reconciled ACK/status `running`; the later provider event must be selected from its own observation boundary. | AC-004/AC-007; code-review CR-001 resolution. | Updated ACK expectation to non-interruptible `running` and scoped the later canonical-running search to messages after provider emission. |
| `tests/unit/agent-team-execution/team-command-start-status.test.ts` | Delayed-create fixtures omitted now-required executable member `memoryDir` and child-team run identity, so setup rejected before the intended lifecycle assertion. | Production constructors require recordable member memory identity; the lifecycle behavior remains valid. | Current runtime contract; persisted-data direct-use decision; test failure log 22. | Added valid deterministic fixture identities; retained all initializing/running assertions. |
| `tests/unit/external-channel/runtime/channel-{agent,team}-run-facade.test.ts` | Required legacy `lastKnownStatus: ACTIVE` activity metadata. | Requirements/design remove ordinary activity lifecycle authority; current production facade intentionally records summary only. | R-002/R-004/R-008; design legacy-removal table. | Assert exact summary-only activity and explicitly assert the legacy field is absent. |
| `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` — forced `send_message_to` scenario | Applied `tool_choice: required` while leaving DeepSeek v4 thinking mode enabled. | DeepSeek rejects that combination with HTTP 400 before the intended real team/tool boundary; the repository's existing mixed-task live case already disables thinking for `deepseek-v4` forced-tool execution. This is stale provider-specific test setup, not a product lifecycle failure. | Round-5 provider response in `42-live-autobyteus-deepseek-team-message.log`; current provider-aware precedent in `mixed-task-delegation.e2e.test.ts`. | Added a narrow model-aware LLM-config helper that preserves all other models and sets `extra_params.thinking_type=disabled` only for DeepSeek v4 forced-tool execution; live rerun passed. |

## Durable Coverage To Add Or Update

| Scenario ID | Path / Scenario | Change | Requirement / Acceptance Criteria | Final Result |
| --- | --- | --- | --- | --- |
| APIE2E-LC-001 | `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` | Added real default-pipeline -> real `AgentRun` -> Fastify WebSocket late-tool/reconnect scenario. | R-003–R-007; AC-001/AC-002/AC-006/AC-007/AC-010 | Pass: final durable matrix 6 files / 38 tests; focused file 10/10. |
| APIE2E-LC-002 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` shared create/restore/continue scenario | Added active-run reconnect idle, pre-idle running proof, and bounded no-post-terminal-running assertion. | R-006/R-007/R-011; AC-001/AC-004/AC-007/AC-012 | Pass independently with live Codex, live Claude, and DeepSeek-backed AutoByteus: each targeted run passed 1 test / 19 skipped. |
| APIE2E-LC-003 | `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | Replaced stale direct-pipeline/status-only expectations with matching-terminal/canonical-status and accepted-result overlay semantics. | AC-004/AC-007/AC-008; DS-001/DS-004 | Pass: 1/1 and included in final 38/38 matrix. |
| APIE2E-LC-004 | `tests/integration/agent/agent-websocket.integration.test.ts` restore scenario | Updated restored ACK/status ordering to the reviewed running reconciliation and isolated later provider-running observation. | AC-004/AC-007; CR-001 | Pass: 7/7 and included in final 38/38 matrix. |
| APIE2E-LC-005 | `tests/unit/agent-team-execution/team-command-start-status.test.ts` | Repaired stale lifecycle fixture prerequisites. | AC-004/AC-006; team initiating overlay | Pass: 6/6 and included in final 38/38 matrix. |
| APIE2E-LC-006 | `tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts` and `channel-team-run-facade.test.ts` | Removed obsolete activity-carried `ACTIVE` expectation. | R-002/R-004/R-008; AC-009 | Pass: 14/14 and included in final 38/38 matrix. |
| APIE2E-LC-AUTOBYTEUS | `tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` forced `send_message_to` scenario | Added provider-aware DeepSeek v4 forced-tool configuration; no production source changed. | AC-004/AC-006/AC-007/AC-010; real team/listener boundary | Initial stale setup failed with provider HTTP 400; corrected live rerun passed 1/1 with 4 skipped. |

## Durable Coverage To Remove

No durable file or scenario was removed in this stage.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Focused and final durable API/E2E matrix | Real pipeline/WebSocket/reconnect, command restore/ACK, team overlay, external activity neutrality | Pass: final 6 files / 38 tests | `execution-evidence/30-api-e2e-durable-tests-final.log`; initial `01` and stale-test rechecks `22`–`29` preserve the validity investigation. |
| 2 | All implementation-changed backend tests | Transformer, command, runtime adapters, queue, team/external consumers | Pass: 18 files / 249 tests | `execution-evidence/08-server-implementation-regression.log` |
| 3 | SDK changed tests + SDK build | Structured event propagation and package compilation | Pass: 2 files / 11 tests; build OK | `execution-evidence/10-sdk-focused-and-build.log` |
| 4 | Focused Nuxt lifecycle/status/presentation set | Canonical status-only frontend, team/header status, history merge | Pass: 7 files / 65 tests | `execution-evidence/11-web-focused-lifecycle.log` |
| 5 | Server full build | Authoritative TypeScript/build/assets/bootstrap smoke | Pass | `execution-evidence/12-server-build.log` |
| 6 | Web production build | Nuxt production compile/prerender | Pass | `execution-evidence/20-web-build.log` |
| 7 | Full web test command | Broad renderer regression | Baseline-limited: 354 files / 1885 tests passed; 4 unchanged, unrelated files failed, so Electron phase did not start after Nuxt failure | `execution-evidence/14-web-full.log`; all four failing paths are unchanged from recorded base and outside the ticket surface. |
| 8 | Full server command without live gate | Broad backend regression | Baseline-limited: 450 files / 2426 tests passed; 27 unchanged files / 64 tests failed; 31 files skipped | `execution-evidence/21-server-full-nonlive.log`. No failed test file differed from the recorded base. Lifecycle-adjacent failures were investigated: six corrected valid/stale scenarios now pass 38/38; the remaining sampled failures expose unrelated stale fixtures/API drift. |
| 9 | Required full `RUN_CODEX_E2E=1` command | Broad live Codex sweep | Inconclusive/terminated: multiple live scenarios progressed, then the unrelated Codex speak MCP auto-execute case produced no output for more than three minutes; the owned run was interrupted rather than left hanging | `execution-evidence/18-server-full-codex.log`; direct ticket live scenarios passed separately. |
| 10 | Full SDK Vitest attempt | Broad SDK regression | Inconclusive/terminated after unrelated pre-existing live media/provider failures and long waits; not an authoritative documented SDK command | `execution-evidence/09-sdk-full-and-build.log`; the changed SDK tests and build passed in `10`. |

The broad suite failures are retained rather than hidden. They do not constitute ticket failures because every failing broad-suite test file is byte-identical to the recorded base, the implementation-changed suites pass, lifecycle-adjacent stale assertions were corrected and now pass, and the critical behaviors are directly covered by the new pipeline/WebSocket test plus live Codex execution.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Support | Remaining Uncertainty / Improvement |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Deterministic transformer/command matrix, real processing-spine WebSocket regression, corrected valid stale tests. | Live provider and browser evidence pending at this checkpoint. |
| Changed-boundary execution directness | 95% | Real default pipeline, real `AgentRun`, real Fastify WebSocket, reconnect, exact late tool. | No real provider timing yet. |
| Cross-boundary integration realism and mock gap | 90% | Transport and reconnect are real; focused Nuxt tests pass. | Provider callbacks and real browser pending. |
| Environment, configuration, identity, and fixture fidelity | 90% | Temp SQLite/Prisma, real package builds, random E2E identities; stale fixtures repaired. | Provider credentials/model availability pending. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 249 changed backend tests plus restore, old/new turn, duplicate, error, queue, and reconnect coverage. | Live timing pending. |
| User-surface, browser, and desktop-shell confidence | 90% | 65 focused Nuxt tests and production build; shell is inapplicable. | Real Chrome pending. |
| Durable regression coverage quality and relevance | 98% | Requirement-linked real-spine regression and shared live scenario; no production test hook. | Proportional review pending. |

- Overall post-repository confidence: `93.3%` (653 / 7).
- Calculation method: simple average; no category hidden.
- Every critical acceptance criterion directly proven at repository checkpoint: `Yes` deterministically; realistic/browser gaps remained.
- Any applicable category below `90%`: `No`.
- Default clean-confidence target met at checkpoint: `No`; broader validation remained required.

## Broader Validation Decision And Result

- Decision: `Required`
- Selected execution mode: `Live API + Browser + Lifecycle`
- Result: `Executed`
- Evidence gained:
  - Live Codex standalone create/turn/idle/no-reopen/active reconnect/terminate/restore/second turn passed: `execution-evidence/02-live-codex-lifecycle.log`.
  - Live Codex team member projection terminate/restore/continue passed through the mixed-team backend: `execution-evidence/13-live-codex-team-restore.log`.
  - Real Chrome on isolated server/Nuxt ports observed offline -> running A -> idle A -> late content with idle preserved -> running B -> idle B; both agent and team dots converged: `execution-evidence/browser-lifecycle-probe-result.json`, `browser-lifecycle-final.png`, and `17-browser-lifecycle-probe.log`.
  - Claude first returned HTTP 401 because its OAuth token was revoked: `06-live-claude-lifecycle.log`. After the user refreshed authentication, the targeted real Claude Agent SDK create/turn/running/idle/no-reopen/reconnect/terminate/restore/second-turn scenario passed 1/1 in 11.6 seconds: `31-live-claude-lifecycle-rerun.log`.
  - Existing live Claude team coverage was then executed without test-code changes. A two-member `ping`/`pong` team passed bidirectional `send_message_to`, normalized tool start/success with no failure, team-message receipt, recipient `TURN_COMPLETED`, and recipient `AGENT_STATUS idle` for both members: `35-live-claude-team-roundtrip.log`.
  - A second existing live Claude team case passed two-member projection continuity across terminate -> restore -> continue and preserved both members' pre/post-restore conversation tokens: `36-live-claude-team-restore.log`.
  - AutoByteus was attempted three ways. LM Studio catalog was reachable but the selected model could not load (HTTP 400); an Ollama model answered direct `PING`, but the integrated AutoByteus turn did not produce assistant completion within the suite's 120-second bound. Evidence: `03`–`05` and `24-provider-diagnostics.log`.
  - At the user's request, AutoByteus was first attempted with `deepseek-v4-flash`; the then-invalid key produced HTTP 401 while lifecycle still settled `running -> terminal/error -> idle`. Evidence: `37-live-autobyteus-deepseek-lifecycle.log` and `38-deepseek-credential-probe.log`.
  - After the user refreshed the active superrepository credential, the direct DeepSeek probe returned HTTP 200 without printing or copying the key: `39-deepseek-credential-recheck.log`.
  - The shared live standalone AutoByteus case then passed: assistant success, first-turn `running -> idle`, 750 ms without a synthetic post-idle `running`, fresh active-socket idle snapshot, terminate/restore, and second-turn completion/idle. Evidence: `40-live-autobyteus-deepseek-lifecycle-rerun.log`.
  - The existing two-member AutoByteus projection case passed for coordinator and reviewer: each completed and emitted `AGENT_STATUS idle`, then both retained conversation projections across terminate -> restore -> continued turns and returned idle again. Evidence: `41-live-autobyteus-deepseek-team-restore.log`.
  - The real AutoByteus `send_message_to` case initially reached the provider but DeepSeek rejected stale test setup (`tool_choice: required` with thinking enabled) with HTTP 400 while lifecycle still returned idle: `42-live-autobyteus-deepseek-team-message.log`. A narrow test-only configuration fix aligned this case with the repository's existing DeepSeek forced-tool precedent. The rerun passed coordinator tool success, team-message/reference-file projection, reviewer delivery, and assistant reply: `43-live-autobyteus-deepseek-team-message-rerun.log`.
- Criticality decision: live Codex, Claude, and AutoByteus now directly prove the shared standalone lifecycle boundary. Live teams cover restore/projection across all three runtime families, and real inter-agent delivery is directly proven for Claude and AutoByteus. No live-provider completion gap remains for this ticket.

## Desktop Application Validation Decision

- Browser development mode was used for the web-equivalent Electron renderer behavior.
- No preload, IPC, native module, packaging, or window lifecycle boundary changed, so actual Electron execution was not warranted.
- The user-owned AutoByteus process on port 29695 remained running and was neither reused nor stopped; the final round-5 audit observed PID 77867 after the user's power cycle.

## Live Environment And Fixture Result

- Isolated backend: built server on `127.0.0.1:18123`, temp app data, `APP_ENV=test`.
- Isolated renderer: Nuxt dev on `127.0.0.1:18124`, pointed at the isolated backend.
- Browser: local Google Chrome through existing `playwright-core`, 1280x720, headless.
- Cleanup: Chrome closed by probe; owned Nuxt/server sessions stopped; ports verified free; temporary page and app data removed.
- Existing provider services and user app were not stopped.

## Temporary Executable Validation

| Scenario ID | Probe | Result | Cleanup |
| --- | --- | --- | --- |
| APIE2E-LC-007 | Retained browser harness/probe under ticket evidence, temporarily copied into Nuxt pages only during execution | Pass: 13 semantic status/DOM/class/content observations | Temporary route removed; owned processes/data removed; evidence retained. |
| APIE2E-LC-008 | Long-retired-ID stress | Not run | Deterministic context-isolation tests plus bounded string-only residual were sufficient; no critical behavior depends on eviction. |

## Not Tested / Residual

| Boundary | Reason | Residual Risk |
| --- | --- | --- |
| Production-scale unbounded runtime duration / retired turn-ID retention | Finite stress cannot establish an infinite lifetime bound; state is context-owned and stores normalized strings only. | Low operational memory-growth risk, not a semantic correctness gap. |
| Actual Electron shell | No shell-specific change. | None material. |

## Final Investigation Decision

- Proceeded To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Updated eight files; removed none`
- Post-repository confidence: `93.3%`
- Broader validation: `Required and executed`
- Final result: `Pass`, including the user-requested live AutoByteus standalone and team journeys.
- Final confidence: `97.7%`
- Reroute required: `No`; the only new failure was classified as stale provider-specific test setup and fixed locally in durable E2E coverage.
- Next recipient: `code_reviewer` for proportional review of the newly updated AutoByteus team E2E test, then delivery refresh.
