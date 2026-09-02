# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/runtime-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/tickets/done/codex-runtime-event-stream-reconnect/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `/code_reviewer` pass at implementation commit `fb65f564f`; `CRR-001`; source-review score `9.75/10`; no findings.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: Round 1, this file. This initial investigation was written before any API/E2E-owned durable coverage edit or final execution.

## Current Requirement And Design Basis

The approved change is a Codex App Server lifecycle correction, not a reconnect implementation. Exact native `willRetry === true` must become an existing canonical turn diagnostic and must preserve the active turn, open reasoning, and pending/ordered tool correlation (`BEH-001`, `REQ-001`/`REQ-002`/`REQ-006`, `AC-001`/`AC-003`). Later valid events for the same native turn must continue through the real Codex-thread owner, canonical `AgentRun` pipeline, application trace writer, wire mapping, and frontend projection until that turn becomes idle/completed (`BEH-002`, `REQ-003`/`REQ-005`, `AC-002`/`AC-006`). A matching `willRetry: false` error remains terminal, while explicitly identified terminal/completion/failed-status facts for retired turn A must be consumed before mutation/emission when turn B is active (`BEH-003`, `REQ-004`/`REQ-005`, `AC-004`/`AC-005`). Existing traces remain directly readable with no schema migration or backfill (`AC-007` and the design's persisted-data decision).

`ARCH-REV-003`, `IR-001`, and `CRR-001` are the current reviewed basis. The implementation handoff's legacy check is clean and its persisted-data decision is `Directly Usable — No Migration`; source review found no mismatch. The reported production trace proves that the same Codex turn recovered and completed after five retry diagnostics, but that retained observation predates the fix and cannot alone prove the corrected projection.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / `DS-003` native error classification | Changed | Requirements `REQ-001`/`REQ-002`; design exact-boolean rule; implementation and `CRR-001` | Exercise exact `willRetry: true` and `false`, including active state and pending correlation, without inferring retry from message text. |
| `BEH-002` / `DS-002` continuation to canonical, trace, wire, and UI | Changed outcome through preserved path | `REQ-003`; `AC-002`/`AC-003`; design return spine | Add one durable joined retry sequence because existing focused tests split native admission/conversion from wire/frontend and do not directly prove post-diagnostic durable traces plus live projection in one scenario. |
| `BEH-003` / stale A while B active | Changed containment; terminal behavior preserved | `REQ-004`/`REQ-005`; `AC-004`/`AC-005`; `SR-002`/`SR-003`; `ARCH-REV-003` | Retain direct stale error/completion/failed-status checks, exact-turn cleanup, and the current native-to-frontend A/B integration. |
| Matching terminal, runtime-global, normal success, usage, per-tool outcomes | Preserved | `REQ-004`/`REQ-005`; `AC-004`/`AC-006` | Re-run focused regressions rather than create parallel policy coverage. |
| JSONL traces and normal run-view reader | Preserved / directly usable | `AC-007`; design/implementation transition checks | Prove that admitted post-diagnostic assistant/reasoning/tool records are written with existing shapes and run existing reader/projection checks; no migration/backfill test is appropriate. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Codex thread notification admission/state and lifecycle-converter cleanup | Focused thread, converter, reasoning, tool-correlation, and backend tests | None after the planned joined scenario; exact effect selection is deterministic | Focused repository execution |
| API / transport / contract | Yes | Existing canonical `ERROR` evidence and AgentRun WebSocket mapping are reused | Generic diagnostic WebSocket integration and mapper path in joined web test | Existing joined test covers stale A but not retry diagnostic followed by continuation | Durable native-to-wire-to-frontend retry integration; selected WebSocket checks |
| Frontend component / state | Indirectly | No production frontend edit; existing error/segment/status projectors consume the corrected stream | Unit handler coverage plus native-to-live stale projection integration | Retry diagnostic and later content are not joined from native notification to frontend state | Extend durable joined integration; no visual assertion needed |
| Browser integration / user journey | No direct production change | No DOM, browser API, routing, authentication, storage, or renderer code changed | Programmatic production frontend projector is exercised | Browser would only re-prove unchanged rendering and cannot deterministically cause provider retry | None unless repository evidence fails |
| Authentication / session / permissions | No | Provider authentication is unchanged | Existing/live Codex environment can start an app-server turn | Retry inducement is not an identity concern | None |
| Desktop renderer / web-equivalent UI | Indirectly | Existing Nuxt projector used by desktop renderer | Joined web integration ends in real `AgentContext` conversation/status state | No changed renderer/DOM behavior | Browser not required if joined projector passes |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, updater, or native module change | N/A | None in approved scope | None |
| Process / lifecycle | Yes | Same Codex app-server turn survives diagnostic and later completes | Deterministic native notification sequence; existing live Codex process E2E | A real provider-stream retry is nondeterministic and cannot be safely forced by the public test surface | One focused live Codex lifecycle/persistence E2E as realistic normal-path complement |
| Persisted-data transition | Yes, semantics only | Existing raw-trace writer must receive later admitted events; schema unchanged | Existing live-memory E2E and run-view projection tests | Current joined retry coverage does not assert post-diagnostic trace output | Attach real memory recorder to joined durable retry scenario and run current reader coverage |
| Worker / queue / distributed coordination | No | No worker/queue/multi-node behavior | N/A | None | None |
| External integration | Yes | Codex App Server v2 notification contract | Installed `codex-cli 0.152.1`; retained production event/log evidence; live Codex E2E suites | Exact live retry timing is not controllable | Focused real Codex turn; deterministic injected retry sequence remains authoritative for the error branch |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect`
- Project type and runtime stack: pnpm 10.28.2 TypeScript monorepo; Node.js 22.23.1; Fastify/GraphQL/WebSocket backend with Vitest 4; Nuxt/Vue frontend with Vitest 3; Electron 42 desktop wrapper; Codex App Server CLI 0.152.1.
- Conflicting, missing, or unclear project instructions: The implementation handoff labels `tests/integration/agent/agent-status-websocket.integration.test.ts` as a web-package check, but the path and code-review correction establish that it must run from `autobyteus-server-ts`. No other conflict. Full server/web typecheck baseline limitations are already recorded upstream; the production-source server config is the relevant clean typecheck.
- Required environment variables or secrets available: `Yes` for installed/authenticated Codex CLI as established by the retained production run and to be rechecked by live execution; no secret values will be read or recorded. `RUN_CODEX_E2E=1` is required for Codex live suites. Deterministic tests require no secret.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect/README.md` | Workspace setup, deterministic/live E2E, Codex, dev and Electron guidance | `pnpm install`; `pnpm test:e2e`; Codex live suites require `RUN_CODEX_E2E=1`; `pnpm dev` owns ports 8000/3000 and `.autobyteus/development`; browser/Electron launch is unnecessary for unchanged projector behavior. |
| `autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; do not use watch mode. |
| `autobyteus-server-ts/README.md` | Server runtime, tests, isolation and cleanup | Tests use `.env.test` and temporary DB under `tests/.tmp`; live Codex suites isolate app data to per-suite temporary directories; do not use development DB; use `RUN_CODEX_E2E=1`. |
| `autobyteus-server-ts/package.json` | Authoritative scripts/prerequisites | `prepare:shared` builds `autobyteus-ts`, SDK contracts and backend SDK; `prebuild` generates Prisma; production source check is `tsc -p tsconfig.build.json --noEmit`. |
| `autobyteus-web/AGENTS.md`, `ARCHITECTURE.md`, `package.json` | Frontend test and boundary guidance | Nuxt tests need one-shot `--run`; `pnpm guard:web-boundary`; test-only server imports must not become web production dependencies. |
| `test-support/live-e2e/run-live-e2e.mjs` | Root real-provider runner | Owns a built test server and temporary evidence directory but targets provider capability scenarios, not Codex lifecycle; the narrower env-gated Codex test is more relevant here. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Shared TypeScript packages | Worktree root / server package | `pnpm -C autobyteus-server-ts prepare:shared` | Creates ignored `dist/` outputs required by source imports | Command exit 0 | Leave ignored build outputs or remove only outputs created for this run if needed |
| Prisma client | `autobyteus-server-ts` | `pnpm exec prisma generate --schema ./prisma/schema.prisma` | Generated client only; no database mutation | Command exit 0 | Generated ignored output may remain; no persistent service |
| Nuxt test aliases | `autobyteus-web` | `pnpm exec nuxi prepare` | Creates ignored `.nuxt` output | Command exit 0 | No process; ignored generated output |
| Deterministic Vitest checks | Server/web package | Exact commands in execution plan | Test-owned processes and temporary state only | Vitest result | Vitest teardown; verify no owned process remains |
| Live Codex App Server | Spawned by focused live memory E2E | `RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts ...` | Uses installed CLI and suite-owned temporary workspace/memory directory | Model catalog plus startup gate; final idle event | Test `afterEach` terminates thread/client and removes suite temp dirs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Native retry/stale notifications | Existing fake Codex client plus real `CodexThread`/backend/`AgentRun` harness | Synthetic run/turn IDs; no user data | In-process only |
| Application replay trace | `AgentRunMemoryRecorder` with `fs.mkdtemp` memory directory | Test-owned JSONL, no development or home profile | `afterEach` removes only registered temporary directories |
| Frontend projection context | Pinia plus real `dispatchAgentStreamMessage` | In-memory test context | Recreated per test |
| Live Codex identity/model | Existing Codex CLI authentication and runtime model catalog | Never print or inspect credential values; test workspace and memory are temporary | Suite closes client and removes temp directories |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”; `implementation-handoff.md` “Persisted Data Transition Check”. The handoff's stray `DS-005` label is non-authoritative because the reviewed spine inventory ends at `DS-004`; the persisted-data section itself is clear.
- Representative existing-data setup and required behavior: current-shape user, assistant, reasoning and tool JSONL records continue to load through the normal local-memory run-view provider; post-diagnostic same-turn output is written using those same shapes.
- Evidence planned for the approved direct-use outcome: attach `AgentRunMemoryRecorder` to the durable native retry integration and assert post-diagnostic reasoning/tool/assistant records; re-run existing raw-trace transformation and local-memory run-view projection suites.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`
- Upstream ambiguity or reroute required: No. Diagnostic cards are live canonical content; current raw-trace persistence intentionally records durable conversation/tool facts rather than `ERROR` events. The required persisted outcome is that later admitted work is not lost and current readers need no rewrite; no historical reconstruction is asserted.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` retry/terminal/stale cases | Exact retry keeps B active/pending MCP and admits later message/tool; exact non-retry terminates; stale A terminal/completion/failed status is suppressed | `AC-001`-`AC-005`; `DS-003` | `Still Valid` | Assertions use the reviewed exact-identity/effect contract | Re-run |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` lifecycle cases | Diagnostic preserves reasoning/tool trackers; turn terminal cleans exact turn; stale A cannot disturb B | `AC-003`-`AC-006`; `DS-004` | `Still Valid` | Directly observes canonical events and tracker continuation | Re-run |
| `codex-tool-log-correlation.test.ts` and `codex-reasoning-block-converter.test.ts` | Correlation/reasoning survive diagnostic and normal sequence | `AC-003`, `AC-006` | `Still Valid` | Narrow owner-level regressions | Re-run with focused server group |
| `codex-agent-run-backend.test.ts` | Preserved AgentRun backend lifecycle, completion and usage behavior | `AC-002`, `AC-006` | `Still Valid` | Existing preserved-path suite included in reviewed 167-test group | Re-run |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | Real `CodexThread` -> backend -> `AgentRun` -> mapper -> production frontend projector keeps one B response through stale A facts | `AC-005`, `AC-006`; `DS-002`/`DS-003` | `Needs Update` | Boundary is direct and valid, but the artifact name/scope is stale-only and it does not join retry diagnostic to continuing projection/trace | Rename to lifecycle-oriented path, retain stale scenario, add retry continuation scenario with memory recorder |
| `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` diagnostic and reconnect cases | Real server WebSocket retains running diagnostic contract and rejects retired-turn content across reconnect | `AC-001`, `AC-005`, `AC-006` | `Still Valid` | Direct network transport coverage for unchanged common boundary | Re-run only two selected cases from server package |
| `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts` normal live turn | Real Codex CLI/app-server -> backend/AgentRun -> current JSONL persistence | `AC-006`, `AC-007`; environmental complement to `AC-002` | `Still Valid` | Real process/runtime/model path; retry itself is nondeterministic | Run the smallest normal-turn persistence case as broader validation |
| `autobyteus-server-ts/tests/unit/run-history/projection/{raw-trace-to-historical-replay-events,local-memory-run-view-projection-provider}.test.ts` | Existing trace shapes are transformed and projected without migration | `AC-007`; persisted-data decision | `Still Valid` | Normal reader/transformer coverage | Re-run |
| Other Codex team/routing/title live E2E suites | Team messaging, titles, routing, restoration | Outside changed retry/error boundary | `Out Of Scope` | They cannot induce or assert the changed lifecycle condition and are expensive | Do not run |
| Electron/package/browser probe suites | Shell/window/DOM/package behavior | No approved production change | `Out Of Scope` | No shell or browser-specific boundary changed | Do not run |

## Stale Or Obsolete Coverage Decisions

No assertion is obsolete. The current stale-turn integration assertions remain valid. Its path is planned to be renamed only because the durable file will now cover both retry diagnostics and stale-turn containment; all existing assertions will be retained in the replacement path.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` path only | None; path scope becomes incomplete | Adding the approved `UC-001` retry journey makes a stale-only filename misleading | `BEH-001`/`BEH-002`, `AC-001`-`AC-003`, `DS-002` | `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts`; retains stale scenario | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-SC-001` | `turn started -> reasoning/tool -> retry diagnostic -> later tool/assistant/reasoning -> completion`, through real thread/backend/AgentRun/mapper/frontend projector and test-owned raw-trace recorder | `BEH-001`/`BEH-002`; `AC-001`-`AC-003`, `AC-007`; `DS-002`-`DS-004` | `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` | Existing durable tests split this journey across owner-level tests; this scenario directly protects the production failure outcome and verifies that later same-turn durable facts and one user response survive the diagnostic. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-SC-002` | `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` | Rename to lifecycle-oriented path and retain its existing stale A/active B assertions beside `API-SC-001` | `AC-005`/`AC-006`; `DS-002`/`DS-003` | No assertion weakening or source production edit. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` path | Path rename only after its scope expands; assertions are not removed | `AC-001`-`AC-003`, `AC-005`/`AC-006` | Replace with `codex-turn-lifecycle-native-to-live-projection.integration.test.ts`; retain stale scenario and add retry scenario |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm prepare:shared && pnpm exec prisma generate --schema ./prisma/schema.prisma`; `pnpm exec nuxi prepare` | Server, then web | Documented generated/build prerequisites | `Pass` | `api-e2e-evidence/setup.log`; shared packages built, Prisma client generated, Nuxt types prepared. A later rerun first invoked `prepare:shared` from the wrong web package; the authoritative server-package command was then used and the final test passed. |
| 2 | `pnpm exec vitest run` with the five focused server files from `IR-001` | `autobyteus-server-ts` | Native classification, cleanup, reasoning/tool correlation, preserved backend behavior | `Pass` | `api-e2e-evidence/server-focused.log`; 5 files / 167 tests passed |
| 3 | `pnpm exec vitest run tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts` | `autobyteus-web` | `API-SC-001`/`API-SC-002`: native-to-canonical-to-wire-to-UI; post-diagnostic trace writing | `Pass` | `api-e2e-evidence/web-lifecycle-integration.log`; 1 file / 2 tests passed. First authoring run exposed an invalid assertion ordering (a real tool boundary had already closed reasoning); fixture order was corrected so the diagnostic, not another boundary, is the event under test. |
| 4 | `pnpm exec vitest run tests/integration/agent/agent-status-websocket.integration.test.ts -t "preserves B|keeps diagnostic"` | `autobyteus-server-ts` | Real WebSocket lifecycle/reconnect contract | `Pass` | `api-e2e-evidence/server-websocket-selected.log`; 2 selected tests passed / 5 skipped |
| 5 | `pnpm exec vitest run tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts tests/unit/run-history/projection/local-memory-run-view-projection-provider.test.ts` | `autobyteus-server-ts` | Existing trace direct-use/read projection | `Pass` | `api-e2e-evidence/server-run-view-readers.log`; 2 files / 15 tests passed |
| 6 | `pnpm exec tsc -p tsconfig.build.json --noEmit`; `pnpm guard:web-boundary`; `git diff --check` | Server; web; root | Changed production source types, forbidden production cross-boundary imports, patch hygiene | `Pass` | `api-e2e-evidence/static-and-boundary-checks.log`; all three commands exited 0 |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `96%` | `AC-001`-`AC-007` are mapped to passing exact retry, terminal, stale, correlation, WebSocket, trace-writer and reader assertions | Real provider retry itself is not forceable | Live normal-turn lifecycle can strengthen the external-runtime half, while retained production evidence proves the retry is reachable |
| Changed-boundary execution directness | `97%` | Focused tests execute the changed thread/converter owners; joined test begins at native notifications and ends in `AgentRun`, wire, frontend, and JSONL facts | Codex binary is replaced by a fake client in the exact retry test | Real Codex normal turn |
| Cross-boundary integration realism and mock gap | `93%` | Joined production owners/projector, real JSONL recorder, and real server WebSocket paths pass | Exact retry notification is injected and WebSocket/UI halves are compositional rather than one networked browser journey | Focused live Codex process turn |
| Environment, configuration, identity, and fixture fidelity | `92%` | Documented pnpm/Prisma/Nuxt setup passes; exact turn/run IDs and isolated temp persistence are exercised | External Codex process/model/auth has not yet been re-executed in this round | Focused live Codex process turn |
| Failure, edge-case, lifecycle, and recovery evidence | `98%` | Retry, matching terminal, stale error/completion/failed status, runtime-global, identity-missing, reasoning/tool preservation, and reconnect coverage pass | No deterministic real transport failure injection | No safe higher-value addition identified |
| User-surface, browser, and desktop-shell confidence | `95%` | Real production frontend projector keeps one incomplete response through diagnostic/stale facts, renders the diagnostic segment, continues content/tool state, and ends idle | No pixel/DOM browser check; no UI code changed | Browser is not expected to add material lifecycle evidence |
| Durable regression coverage quality and relevance | `98%` | New `API-SC-001` is one deterministic requirement-linked joined scenario; `API-SC-002` is retained; no compatibility-only assertion | Proportional code review is still required | Code reviewer review after completed execution |

- Overall post-repository confidence: `95.6%`
- Calculation method: Simple average of seven applicable categories; weak categories remain visible.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: A live provider retry cannot be safely scheduled; unchanged diagnostic presentation remains visually severe; future protocol drift and historical backfill remain approved out of scope.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — executed and passed
- Selected execution mode: `Lifecycle` / real Codex App Server process
- Specific confidence gap or residual risk addressed: Deterministic repository tests inject native notifications through production owners but do not prove that the current installed Codex CLI, app-server process, model catalog, AgentRun lifecycle, and JSONL writer still operate together in this worktree.
- Why the selected mode can materially improve confidence: One focused existing live-memory test uses the real current Codex CLI and a real turn through backend/AgentRun/persistence, complementing the deterministic retry branch without pretending that a provider WebSocket failure can be forced reliably.
- Expected confidence after the selected validation: At least `95%` overall, with cross-boundary realism remaining explicitly below perfect because the live run may not retry.
- Browser-specific decision and rationale: Browser execution is `Not Required`. No DOM, frontend production code, routing, browser API, or Electron renderer behavior changed. The real production frontend projector is the changed outcome boundary and will be exercised by durable joined integration; a browser cannot deterministically create the upstream retry condition and would add no material evidence if that test passes.
- If `Not Required`, evidence proving the real changed boundary without broader execution: N/A; lifecycle broader validation is required.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: N/A.
- Execution result: `Pass` — the selected live-memory case completed one real Codex 0.152.1 / `gpt-5.6-sol` turn through startup, AgentRun idle completion, reasoning normalization, and current JSONL persistence. See `api-e2e-evidence/live-codex-memory.log`.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron 42.4.1 wrapping the Nuxt renderer.
- Relevant README or development instructions: Root `README.md` packaged Electron API/E2E section; `autobyteus-web/AGENTS.md`; `autobyteus-web/ARCHITECTURE.md` testing strategy.
- Web-equivalent behavior: Existing streamed canonical messages project into `AgentContext` conversation/status through `dispatchAgentStreamMessage`.
- Shell-specific or lifecycle behavior: None changed; no preload/IPC/window/packaging/process ownership code is on `DS-002`-`DS-004`.
- Chosen validation approach and why it fits the project: Programmatic Nuxt integration ending in the production projector plus server WebSocket integration; this directly reaches the changed meaningful state without a browser or actual desktop shell.
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: Pixel rendering of the unchanged severe-looking diagnostic card is not rechecked; no confidence deduction for lifecycle correctness, and presentation remains an approved residual risk.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Build shared prerequisites, then run one focused env-gated Vitest case from `autobyteus-server-ts`; the test itself starts/stops `codex app-server`.
- Environment choices that materially affect the run: `RUN_CODEX_E2E=1`; suite defaults to a low reasoning effort and chooses the first supported preferred current model; no sandbox escalation or auto-tool execution is needed.
- Health / readiness checks: `codex --version`; model catalog resolution; `CodexThread` startup gate; canonical idle event; raw-trace file access.
- Seed data / fixtures: Random UUID response token; `mkdtemp` workspace and memory directories.
- Test identities, authentication, permissions, or session state: Existing local Codex CLI authentication only; values are neither accessed nor reported.
- Requirement-linked journeys or scenarios: Existing normal live turn produces final assistant content and writes current JSONL shapes (`AC-006`/`AC-007`) as a realism complement to deterministic `API-SC-001`.
- DOM, screenshot, log, API, process, or other evidence to capture: Vitest result/count/duration and failure output if any; no credential-bearing raw provider log will be retained.
- Owned processes and temporary state to clean up: Test-spawned Codex client/thread and registered temporary directories; suite `afterEach` owns cleanup.

## Temporary Executable Validation Plan

No temporary source probe is planned. The existing focused live Codex E2E is a durable, project-supported realistic surface.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Deliberately forcing a real provider response-WebSocket disconnect/retry | Provider transport failure timing and fallback are externally owned and nondeterministic; sabotaging connectivity would also prevent controlled completion and would not be a stable test | Bounded mock gap between exact native retry event injection and an actual retrying provider stream | Use retained production retry/completion evidence plus exact versioned contract and deterministic full internal sequence; report residual uncertainty honestly |
| Historical reconstruction of already discarded events | Explicitly out of scope and not possible from the application trace | Previously affected run remains incomplete | Separate requirement only if desired |
| Diagnostic card visual severity/deduplication | Explicitly out of scope; no UI production change | Card may still look severe | Separate presentation ticket only |
| Future Codex protocol versions | Current contract is 0.152.1 | Later protocol may differ | Revalidate when integrated version changes |

## Ambiguities Or Reroute Triggers

None at investigation time.

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Upstream artifacts and current tests provide a coherent approved basis | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add `API-SC-001`, retain/update `API-SC-002`, and rename the lifecycle integration file.
- Post-repository confidence: `95.6%`; all applicable categories are at least `92%`.
- Broader validation decision: `Required`; completed with `Pass`. Final confidence is `96.6%` as recorded in the execution report.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: No source production edit is authorized or planned. If durable coverage exposes an implementation or upstream-behavior contradiction, stop, update this investigation, and route the evidence rather than weakening assertions.
