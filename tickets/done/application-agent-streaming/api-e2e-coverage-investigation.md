# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-agent-communication-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-backend-websocket-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/application-communication-boundaries.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/socratic-math-live-journey.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/code-review-report.md`
- Prior API/E2E Test Review: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming/tickets/in-progress/application-agent-streaming/api-e2e-test-review-report.md`
- Current Investigation Round: `4`
- Trigger: source-review round 11 Pass for `CR-008` completion commit `46d14542a023f06e44a4e5af4375fed2fbcfbbf8` at handoff HEAD `b2615e1661d5a1351c292f247e6e432af2669517`.
- Prior Investigation Reviewed: rounds 1–3. Round 3 produced the real `ASE-018-LIVE` failure at the superseded event contract and is the mandatory historical comparison case.
- Latest Authoritative Investigation: `Round 4`

## Investigation Round History

| Round | Scope / Trigger | Decision / Result | Current Authority |
| --- | --- | --- | --- |
| 1 | original framework streaming scope | Pass at 96.7% | Historical baseline only. |
| 2 | pre-builder Socratic preparation | stopped when architecture authorization was retracted; no paid turn | Superseded preparation only. |
| 3 | builder scope plus first real mounted Socratic/Codex journey | `AC-019` passed; `ASE-018-LIVE` failed because the then-public stream exposed tool events but no text/completion | Historical failure and direct comparison case. |
| 4 | revised five-event stream, Socratic live/durable join/admission, and monotonic close fix | Pass at 97.7%; required live journey and cleanup completed | Latest authority. |

## Current Requirement And Design Basis

`AC-019` remains the canonical builder/package requirement: three pure backend-SDK target-address builders must preserve exact validation, fresh/nonmutating output, normal package exports, generated Brief/Socratic mirrors, Socratic `tutor` member projection, direct binding-ID one-shot follow-up/hint DTOs, and Orchestration-owned use-time authorization.

`AC-018` now uses the approved minimal five-event stream. Canonical provider adapters already emit internal `AgentRunEvent`; `ApplicationAgentStreamEventProjector` must expose only `TURN_STARTED`, exact nonempty `TEXT_DELTA`, `TURN_COMPLETED`, `TURN_INTERRUPTED`, and safe `ERROR`. Thinking, tool, provider/native, segment-structure, coordination, and whole-response events are private/dropped and consume no public sequence.

The generated mounted Socratic UI must start its team without launch-time input, return the builder-backed `AGENT_TEAM_MEMBER/tutor` address, connect/await READY, reserve one local tutor turn, and send `Solve 3x + 5 = 20` exactly once. Its private reducer must visibly append ordered `TEXT_DELTA`, complete on `TURN_COMPLETED`, and join that live path with the independently arriving durable artifact/notification transcript in either order without duplicate presentation or resend. Sequential admission must reject re-entry while unresolved. Close remains usable, invalidates active work, terminates once, and must converge monotonically to closed even if a close-era notification refresh settles late.

The exact live tutor remains `codex_app_server`, `gpt-5.6-sol`, `reasoning_effort: high`, with no service tier, fallback, or API-key substitution. The live response bound is 180 seconds plus 30 seconds for durable convergence. Deterministic application failures are not retried; at most one clean new-run retry is allowed only for an identified transient external Codex failure or completed qualitative noncompliance. Credentials, hidden reasoning, raw provider payloads, and shared identifiers must not be retained.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-005`, `REQ-001`, `AC-004/008` minimal application stream | Changed | requirements, design `DS-005/012`, `CR-007` resolution | Rerun contracts/validator/projector/runtime source/subscription/real standard WS and prove exact five-event closure/drop/sequence behavior. |
| `BEH-011`, `REQ-018`, `AC-018` Socratic consumption/join | Changed | live-journey supplement, design `DS-017/018` | Rerun session/renderer/mounted permutations, then recheck the prior real failure through the mounted generated UI. |
| sequential follow-up/hint admission | Added | `REQ-018`, architecture rounds 15–17 | Prove one claim/send, disabled controls, uncertain outcome, saved re-enable, and no stale send. |
| monotonic close-era convergence (`CR-008`) | Changed | source review round 11 | Run exact late-notification-detail-after-final-close regression and exercise real close/terminal cleanup after the live turn. |
| `AC-019` builders/package/adoption | Preserved | requirements `REQ-019`, source review | Proportionate focused tests/build/import/mirror inventory; no need to redesign coverage. |
| exact Codex config/provider/artifact path | Preserved | `REQ-018`, supplement §§2–6 | Fresh preflight and one paid mounted turn remain mandatory. |
| persistence/compatibility | Preserved | `REQ-017` | Use fresh current stores; inventory no ticket schema/migration/compatibility machinery. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | Yes | canonical projector and Socratic business projection/admission | focused unit/integration | live Codex canonical events through projector | Live API/worker |
| API/transport/contract | Yes | exact five-event SDK/wire contract | contract/validator/standard WS tests | current generated UI receiving real text/turn events | Live WebSocket/browser |
| Frontend component/state | Yes | live/durable join, sequential admission, close claim | JSDOM session/renderer/mounted lifecycle | natural notification/live/close timing | Browser |
| Browser integration/user journey | Yes | generated mounted Socratic flow | deterministic mounted DOM tests | actual HTTP/WS/provider/artifact chain | Chrome |
| Authentication/session/permissions | Yes | current Codex entitlement; target authorization | package/authorization tests | paid live use | CLI/catalog + live |
| Desktop renderer/web-equivalent UI | Yes | iframe application UI | generated UI/JSDOM | full mounted generated package | Chrome |
| Desktop shell/Electron | No | no preload/IPC/window/package boundary changed | source review | none material | do not disrupt Electron |
| Process/lifecycle | Yes | server/app worker/Engine/Codex/browser/binding/close | lifecycle tests | real child/process cleanup and late returns | Process lifecycle |
| Persisted-data transition | No schema change | current lesson/binding/artifact rows | storage/artifact tests and inventory | actual current durable transcript | isolated current stores |
| Worker/queue/distributed | Yes | projector/subscription over real runtime/Communication | unit/integration worker tests | live canonical provider flow | local real workers |
| External integration | Yes | exact Codex App Server turn | preflight plus deterministic fixtures | successful current real turn | serial paid journey |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-agent-streaming`
- Stack: Node 22/pnpm/TypeScript/Vitest, Fastify HTTP/GraphQL/WebSockets, Prisma/SQLite, child Engine/Application workers, generated iframe application, Chrome, Codex App Server.
- Conflicting/missing instructions: none. Server `AGENTS.md` requires `vitest run ... --no-watch`; web `AGENTS.md` requires `--run` for focused Nuxt tests.
- Required authenticated Codex session: must be rechecked immediately before the paid turn; do not record credentials.

| Instruction / Configuration | Authority / Constraint |
| --- | --- |
| `autobyteus-server-ts/AGENTS.md` | use one-shot Vitest commands; no watch mode |
| `autobyteus-web/AGENTS.md` | focused Nuxt tests use `--run`; browser is preferred for web-equivalent flow |
| package manifests for contracts/frontend/backend SDK/server/Socratic/Brief/web | authoritative build/test scripts |
| `socratic-math-live-journey.md` §§3–6 | exact model/prompt/timing/retry/redaction/cleanup contract |
| existing REST/GraphQL/package integration fixtures | public package import/config/start/query/close mechanisms |

| Component | Setup / Start | Readiness | Cleanup |
| --- | --- | --- | --- |
| deterministic packages/server/web | package scripts and focused Vitest | command exit/test summaries | test teardown; remove only task-owned outputs |
| isolated server | compiled `dist/app.js` with task-owned data root and loopback port; shared data env unset | HTTP application listing/GraphQL responds | close lesson, SIGINT, verify descendants/listeners absent |
| generated Socratic package | build owner then copy/import fresh importable package | catalog entry and execution slot `READY` | remove owned package/data root |
| Chrome host | task-owned persistent profile and ephemeral loopback host | v4 bootstrap and Socratic ready DOM | close context/host; verify profile process absent |
| Codex | current CLI login/model catalog; app-server child from configured team | exact effective resume metadata and live turn | binding termination/server shutdown; verify child absent |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Representative data: current binding/address, lesson/message, published-artifact metadata, and transient live state in fresh current platform/application SQLite stores.
- Planned proof: builder-backed current address use; durable transcript/artifact read through normal current readers; close/terminal projection; no task Prisma/schema/migration/compatibility diff.
- Migration completion/recovery: `N/A`.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Intent | Related Requirement | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| SDK contracts/frontend validator tests | exact closed five-event union and malformed/removed-shape rejection | `AC-004/008/018` | Still Valid | run full package tests |
| `application-agent-stream-event-projector.test.ts`, runtime-source, subscription tests | canonical type/delta mapping, drops, attribution, sequence/bounds | `AC-008/013/014/015/018` | Still Valid | run focused set |
| standard Communication WS and backend observer integrations | direct transport and observer parity | `AC-004/009/018` | Still Valid | run focused/affected regressions |
| Socratic tutor session/renderer tests | live/durable permutations, no tool presentation, admission states | `AC-018` | Still Valid | run all cases |
| `socratic-runtime-lifecycle.test.ts` | mounted start ownership, selection/disposal, close claim and late response fencing | `AC-018`, `CR-008` | Still Valid | run exact 12-case file and combined focused set |
| target-address SDK/projection/correlation tests | builders, member adoption, direct one-shot path | `AC-019` | Still Valid | proportionate rerun |
| package/artifact/Brief/current storage regressions | generated import, preserved notification/artifact/business planes | `AC-011/012/016/017/018/019` | Still Valid | affected broader rerun |
| prior round-3 live harness | old broad public event expectations | superseded by revised `AC-018` | Replace as execution harness, not durable coverage | copy/adapt temporary round-4 harness to `TEXT_DELTA`/`TURN_COMPLETED` and current DOM/join/close behavior |

## Stale Or Obsolete Coverage Decisions

No repository-resident durable coverage will be removed by API/E2E. The historical round-3 temporary harness is not a durable test; its environment/bootstrap/target/config/artifact mechanics remain useful, but its old `SEGMENT_CONTENT`/tool/`AGENT_RESPONSE_COMPLETED` success condition is obsolete and must not be reused as authority.

## Durable Coverage To Add / Update / Remove

- Add: none initially. The source-reviewed package already contains focused durable coverage for the stable revised invariants, including the exact `CR-008` ordering.
- Update: none initially.
- Remove: none.
- Execution rule: add a narrow durable regression only if fresh evidence exposes a stable uncovered invariant. Do not turn the authenticated paid qualitative journey into a default deterministic suite.

## Repository Coverage Execution Plan And Results

| Order | Command / Mode | Working Directory | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | contracts, frontend SDK, backend SDK full package tests/builds | package roots | five-event contract/validator and `AC-019` builders | Pass | `evidence/ac018-ac019-round4/01-contracts-sdks.log` — contracts 6/6, frontend SDK 12/12 plus type test, backend SDK 2 files/9 tests and build. |
| 2 | focused projector/runtime-source/subscription/standard WS/backend observer plus Socratic session/renderer/mounted lifecycle | server | revised stream, prior failure origin, join/admission, `CR-008` close convergence | Pass | `02-focused-revised-stream.log` — 8 files/49 tests; mounted lifecycle 12/12. |
| 3 | server production build; Socratic/Brief typecheck/build; normal-import/generated-mirror/hash/config inventories | worktree | production/package propagation and `AC-019` preservation | Pass | `03-builds-generated.log`, `03a-corrected-probes.log` — builds/typechecks passed; 706-file second-build hash stable; five builder entrypoints and exact configs passed. Two temporary post-build probes initially used stale field/fixture assumptions and passed immediately after correction; no product command failed. |
| 4 | affected package/authorization/artifact/REST/WS/Codex/host regressions | server/web | preserved cross-boundary behavior | Pass | `04-affected-regressions.log` — 26 files/169 tests; `05-web-host-regressions.log` — 5 files/12 tests. |
| 5 | exact Codex CLI/login/model/high preflight | isolated worktree cwd | current external prerequisite | Pass | `06-codex-preflight.log`, `06a-corrected-catalog-probe.log` — installed `codex-cli 0.145.0`, ChatGPT login, exact `gpt-5.6-sol`, and `high` support passed. The first catalog-only probe read the superseded `parameter_schema` field and exited before any paid turn; the corrected production-catalog probe read `config_schema.parameters`. |
| 6 | fresh generated package + exact slot + mounted Chrome + one real Codex turn + live/durable join + real close | isolated roots/loopback | critical `ASE-018-LIVE` recheck and `CR-008` lifecycle | Pass | `07-live-environment-redacted.json`, `08-live-saved-config-redacted.json`, `09-live-harness.log`, `10-live-journey-redacted.json`, `11-live-process-state.log` — one paid turn, no retry; exact effective config/target; READY before one input/acceptance; 45 `TEXT_DELTA` plus `TURN_COMPLETED`; visible streaming; durable transcript/artifact join; Socratic relevance; mounted close, terminal binding, one socket close, no reconnect/resend. |
| 7 | final old-token/generated/schema/migration/source and cleanup inventories | worktree/process table | no drift/compatibility/leaks | Pass | `12-final-inventories.log`, `13-cleanup.log` — inventories and exact owned-resource cleanup passed. |

## Post-Repository Confidence Scorecard

These scores use only fresh execution at `b2615e1661d5a1351c292f247e6e432af2669517`. They do not copy the historical 96.7% or the failed round-3 final score. The revised implementation has strong direct deterministic proof, but the exact real boundary that failed previously still requires the mounted journey.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 86% | exact five-event contracts/projector, Socratic join/admission/close, builders, and preserved planes pass | critical current Codex `TEXT_DELTA`/`TURN_COMPLETED` mounted proof absent | real mounted turn |
| Changed-boundary execution directness | 93% | production projector/subscription/standard WS and generated runtime owners executed directly | actual canonical Codex events have not crossed this revision's standard app connection | live worker/provider path |
| Cross-boundary integration realism and mock gap | 88% | real socket/worker integrations and imported-package regressions pass | generated Socratic → Codex → projector → browser → durable join remains mocked in pieces | live browser/process chain |
| Environment/configuration/identity/fixture fidelity | 82% | production builds, exact configs, generated packages, current SQLite fixtures pass | current login/catalog/effective live config not yet rechecked | fresh preflight and resume metadata |
| Failure/edge/lifecycle/recovery evidence | 96% | 49 focused and 169 affected tests include the exact late close refresh and terminal/error/drop/bounds paths | real close after natural live/durable convergence not yet run | live close/cleanup |
| User-surface/browser/desktop confidence | 86% | mounted JSDOM lifecycle 12/12 and web host 5 files/12 tests pass | no real generated UI turn on the revised event contract | installed Chrome journey |
| Durable regression quality/relevance | 98% | narrow current contract/projector/session/renderer/lifecycle regressions and broad affected suites all pass | proportional downstream review applies only if API/E2E changes durable tests | no new durable coverage indicated |

- Overall post-repository confidence: `89.9%` (`629 / 7`, rounded to one decimal place).
- Calculation method: simple average of seven applicable categories; critical live proof remains a hard gate regardless of average.
- Every critical acceptance criterion directly proven: `No`.
- Any applicable category below 90%: `Yes` — requirement proof, cross-boundary realism, environment fidelity, and browser/user surface.
- Default clean-confidence target met: `No`.
- Material residual risk: whether real current Codex canonical text/turn events now become public `TEXT_DELTA`/`TURN_COMPLETED`, join with the independently arriving durable transcript without duplicate presentation, and close monotonically in the actual mounted process chain.

## Broader Validation Decision

- Decision: `Required`.
- Selected mode: Browser + Live API + Worker/Process Lifecycle + external Codex App Server.
- Gap: the prior real journey failed exactly at the public text/completion boundary. Repository tests cannot independently prove that the revised canonical projector delivers current Codex `TEXT_DELTA`/`TURN_COMPLETED` to the generated UI and joins durable state naturally.
- Expected confidence: at least 95% with no category below 90% only if the prior live failure is resolved and all cleanup/critical assertions pass.
- Browser rationale: Chrome executes the exact web-equivalent generated hosted UI without disrupting Electron; no shell-specific source changed.

## Final Confidence After Broader Validation

The required broader validation passed at the same reviewed HEAD. It directly rechecked and resolved the historical round-3 `ASE-018-LIVE` failure: current canonical Codex text and turn completion crossed the standard selected-member connection as the approved minimal events, were visibly rendered, joined the independently durable result, and closed monotonically.

| Confidence Category | Final Score | Final Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 97% | `AC-018` exact live journey and `AC-019` package/adoption both pass; deterministic order/admission/error matrices also pass | one paid qualitative turn by design; stable permutations remain deterministic |
| Changed-boundary execution directness | 98% | actual generated UI, SDK, HTTP/GraphQL/WS, application worker, Engine, Codex, projector, notification, artifact, and close path executed | none material |
| Cross-boundary integration realism and mock gap | 98% | critical path used no provider or transport mock and correlated public, UI, durable, and artifact observations | unrelated live applications not exercised |
| Environment/configuration/identity/fixture fidelity | 98% | fresh generated import, isolated current SQLite/data/workspace/profile/ports, current ChatGPT login/catalog, exact saved and effective config | shared user data intentionally excluded |
| Failure/edge/lifecycle/recovery evidence | 98% | focused 49-test set, affected 169-test set, exact late-close ordering, real terminal binding/socket/process cleanup, and final inventories pass | natural live run sampled one success ordering; other orderings are deterministic |
| User-surface/browser/desktop confidence | 97% | mounted generated Socratic UI visibly streamed and converged to saved/closed in installed Chrome; semantic state transitions were captured | Electron-only shell behavior is inapplicable; harness host produced one harmless missing-favicon 404 |
| Durable regression quality/relevance | 98% | current narrow contracts/projector/session/renderer/mounted lifecycle plus broad affected suites pass | authenticated paid journey correctly remains a temporary acceptance harness |

- Overall final confidence: `97.7%` (`684 / 7`, rounded to one decimal place).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default clean-confidence target met: `Yes`.
- Material residual risk: `None`. Bounded residuals are the intentional one-paid-turn cost limit and inapplicable Electron-shell behavior.
- Broader-validation result: `Pass`.

## Live Environment And Fixture Plan

- Create a fresh isolated root containing application data/current SQLite, copied generated package, tutor workspace, browser profile, and loopback listeners; explicitly unset shared data/database/runtime override variables.
- Import the fresh Socratic package and save `lessonTutorTeam` with exact Codex runtime/model/workspace. Prove the effective tutor member has `codex_app_server`, `gpt-5.6-sol`, `{ reasoning_effort: "high" }`, and no service tier.
- Mount the generated UI through exact v4 bootstrap. Enter the exact prompt, start once, and instrument only safe standard WS metadata/current public event union plus backend notifications.
- Assert READY before one input/acceptance; exact member target; increasing sequence; nonempty exact `TEXT_DELTA`; `TURN_COMPLETED`; no public tool/thinking/provider/native/obsolete event; visible live text while open; durable notification/GraphQL/artifact convergence; single authoritative saved presentation; relevant Socratic output.
- Exercise Close through the mounted UI after saved convergence. Assert final closed detail/actions, terminal binding, one connection close, no reconnect/second input, and exact process/listener/browser/workspace/data cleanup.
- One paid turn initially. No retry for deterministic failure. A clean new-run retry is allowed only under the supplement's explicit external/qualitative category.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness | Behavior Proven | Why Not Durable Default Coverage |
| --- | --- | --- | --- |
| `ASE-019-PKG` | normal imports and mirror/hash inventories | current builder/package propagation | build-time release evidence |
| `ASE-018-PRE` | current Codex login/model catalog | exact external prerequisite | environment/entitlement-specific |
| `ASE-018-LIVE` | isolated server/generated UI/Chrome/real Codex turn | revised critical mounted journey and prior failure recheck | paid/authenticated/external/qualitative acceptance |
| `ASE-018-CLOSE` | mounted Close after live/durable join | final closed monotonic UI/binding/process cleanup | natural live timing complement to durable regression |
| `ASE-018-INV` | source/generated/migration/process inventories | no drift/legacy/leak | execution hygiene |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk / Follow-up |
| --- | --- | --- |
| actual Electron shell | no shell boundary changed; Chrome proves web-equivalent application flow | negligible; only test shell if browser cannot exercise bootstrap |
| multiple paid tutor turns | cost contract bounds the journey; deterministic admission matrix is durable | low |
| richer generic chat/correlation/whole-response accumulation | explicitly excluded by approved design | none |
| unrelated live-provider applications | outside revised scope | none |

## Ambiguities Or Reroute Triggers

- No pre-execution requirement/design ambiguity.
- A deterministic product failure routes to `code_reviewer` for focused origin review with exact scenario evidence.
- A missing external prerequisite after safe preflight is `Blocked` to the user.
- Only an identified transient external Codex failure or completed qualitative noncompliance permits one clean retry.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — Pass`.
- Repository-resident durable coverage added/updated/removed by API/E2E: `No`.
- Post-repository confidence: `89.9%`.
- Final confidence after required broader validation: `97.7%`.
- Broader validation: `Required — executed and passed`.
- Reroute required before execution: `No`.
- Notes: the round-3 live failure is resolved at current HEAD. The fresh real path emitted 45 nonempty `TEXT_DELTA` events followed by `TURN_COMPLETED`; public tool events and `AGENT_RESPONSE_COMPLETED` were absent as required. No retry or durable test change occurred, and cleanup passed.
