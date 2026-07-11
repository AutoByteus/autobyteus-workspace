# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/design-spec.md`
- Supplemental Solution Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/user-verification-failure-analysis.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/design-review-report.md` (Round 4 authoritative)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/code-review-report.md` (Implementation Review Round 2 authoritative)
- Current Investigation Round: `2 — fresh Round 4 candidate validation`
- Trigger: Source/architecture review passed implementation commit `c016730b`; all prior API/E2E and package results were invalidated as current evidence by the packaged user-verification failure.
- Prior Investigation Reviewed: `Yes, only to identify stale coverage assumptions and the unresolved exact packaged sequence.`
- Latest Authoritative Investigation: `Round 2`

## Current Requirement And Design Basis

The reviewed invariant is ordered-card grouping, not provider-item grouping. Adjacent non-empty completed reasoning snapshots in the same run and turn share one normalized block until a new ordered conversation card, assistant text, turn boundary, or terminal error occurs. A matching lifecycle update to an already-positioned tool card preserves the open reasoning block and open reasoning trace. A result-first or identity-missing lifecycle event creates or infers a new ordered tool card and therefore clears/flushes before it. Current `item/reasoning/summaryTextDelta`, legacy `item/reasoning/delta`, and `item/reasoning/summaryPartAdded` are permanent state-free no-ops; completed snapshots are the only content source. Future raw traces, GraphQL projection, and frontend hydration must retain the same grouping. Pre-fix history remediation and delta modernization remain out of scope.

The exact former packaged failure is the critical regression:

`tool start -> completed reasoning A -> matching result -> completed reasoning B -> next tool start`

Expected: one live normalized A+B ID/card, one future A+B reasoning trace, one GraphQL A+B row, and one hydrated ThinkSegment. The next tool starts a new block; result-first creates a boundary.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Matching update to an existing tool card | Changed | `REQ-CTB-002`, `003`, `009`; `AC-CTB-009`, `010`; failure supplement | Prove same normalized ID and one open persisted A+B trace across matching success/failure/denial/approval/local-MCP/file/raw-output updates. |
| Result-first or missing-identity tool lifecycle | Clarified | `REQ-CTB-003`, `009`; `AC-CTB-004`, `009`, `010` | Prove a new ordered-card boundary and persistence order. |
| Invocation correlation by turn and invocation ID | Added | Reviewed Round 4 design | Prove approval-to-start and terminal/log aliases correlate; lifecycle clearing and eviction remain bounded. |
| Reasoning content source | Changed | `REQ-CTB-005`, `010`; `AC-CTB-011` | Prove all three delta/part methods produce no output/state mutation and repeated completion is idempotent. |
| Future persistence/projection/hydration | Preserved with corrected facts | `REQ-CTB-004`–`006`, `009`; `AC-CTB-005`, `006`, `010` | Exercise real converter -> accumulator -> files -> GraphQL plus exact frontend fixture. |
| Frontend runtime agnosticism | Preserved | `REQ-CTB-006` | No provider-specific client logic; use generic segment/hydration tests. |
| Replacement Electron candidate | Required | User failure supplement and current handoff | Build from `c016730b`, inspect bundled runtime, and execute its server/modules; do not reuse the old package report. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Reasoning identity/content and ordered-tool boundary classification | Tracker/converter/accumulator tests | Current provider cadence and packaged deployment | Live Codex + packaged runtime |
| API / transport / contract | Indirectly | GraphQL consumes corrected future raw facts; schema unchanged | Existing GraphQL E2E | Exact failed tool-update sequence | Durable GraphQL E2E |
| Frontend component / state | Indirectly | Generic hydration consumes one A+B row | Handler/hydrator tests | Exact corrected projection fixture | Nuxt test |
| Browser integration / user journey | Indirectly | Count/order of generic Thinking segments | No UI production change | Replacement package visual use remains downstream | Deterministic hydration now; downstream user verification |
| Authentication / session / permissions | Yes for provider approval surfaces | Approval/start/result identity aliases | Converter fixture matrix | Not every alias can be induced safely in one live turn | Live provider cadence plus deterministic alias matrix |
| Desktop renderer / web-equivalent UI | Indirectly | Unchanged generic renderer | Nuxt tests | None beyond package freshness | Package build/inspection |
| Desktop shell / Electron-specific integration | No source change | Bundled server deployment | Build system | Current commit/package execution | Fresh package and bundled-server probe |
| Process / lifecycle | Yes | Turn/error reset, unscoped clear, eviction | Focused lifecycle tests | Installed exact-model process | Live Codex E2E |
| Persisted-data transition | Schema not affected | Writer flush timing for future facts | Accumulator/integration tests | End-to-end exact ordering | Durable GraphQL E2E + packaged probe |
| Worker / queue / distributed coordination | No | Recorder queue unchanged | Integration regression | None material | None |
| External integration | Yes | Codex app-server protocol cadence | Env-gated live test | Model stochasticity | Exact `gpt-5.6-sol` live run |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks`
- Branch/reviewed commit: `codex/consecutive-thinking-blocks` / `c016730b7743f12d3e3b16f114d7bb5f48651b58`
- Stack: pnpm; TypeScript/Fastify/GraphQL server; Vitest; Nuxt/Vue renderer; Electron package.
- Required secrets available: `Yes` — existing authenticated Codex CLI identity; no secret value recorded.
- Conflict: another user-owned AutoByteus instance from another worktree owns fixed embedded port `29695` (Electron PID `57127`, server PID `57731`). It was not stopped, modified, or reused. Full parallel Electron launch is unsafe because the endpoint is fixed. A fresh package can still be built and its bundled server run on alternate port `29795` with isolated test data.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server test instructions | Use Vitest `run`/`--no-watch`; narrow before broad. |
| `autobyteus-server-ts/README.md` | Live Codex E2E | Use `RUN_CODEX_E2E=1`; suite owns temp workspace/memory and cleanup. |
| `autobyteus-web/AGENTS.md` | Frontend test instructions | Use `pnpm test:nuxt --run ...`. |
| `autobyteus-web/README.md` | Build/development path | `pnpm build:electron:mac`. |
| `autobyteus-web/docs/electron_packaging.md` | Package architecture | Server is bundled under `Contents/Resources/server`. |
| `autobyteus-web/package.json`, `build/scripts/build.ts` | Build authority | `AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac`. |
| `autobyteus-web/shared/embeddedServerConfig.ts` | Desktop endpoint | Fixed `127.0.0.1:29695`; no safe full-app parallel override. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server tests | Worktree root | `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch` | Test-owned SQLite/temp dirs | Vitest exit | Hooks/process exit |
| Frontend tests | `autobyteus-web` | `pnpm test:nuxt --run ...` | jsdom/Nuxt | Vitest exit | Process exit |
| Live Codex | Server live suite | `RUN_CODEX_E2E=1 ... vitest run ...` | Exact model, authenticated existing identity, temp data | Turn idle + recorder idle | Suite terminates client/removes temp data |
| Electron package | Worktree root | documented macOS build command | Generated ignored outputs | Build exit + archive inspection | Retain for downstream verification |
| Packaged bundled server | Fresh app bundle | Electron executable as Node, `dist/app.js --port 29795 --data-dir <temp>` | Explicit clean SQLite env and isolated temp data | Listener/GraphQL response | Ctrl-C owned process; remove temp dir |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Exact deterministic tool/reasoning sequence | Provider-shaped payloads through actual production converter/accumulator | Unique run IDs and test dirs | Test hooks remove; logs retained |
| Live exact-model cadence | Existing env-gated Codex suite | Auth identity reused; prompt sanitized; no secret/reasoning content retained | Client/thread/temp data cleaned |
| Packaged-server sequence | Temporary `.mjs` probe importing fresh packaged modules and HTTP GraphQL | Alternate port, clean isolated SQLite, no user data | Process/data removed; probe/log retained |
| Replacement artifacts | electron-builder | Local non-notarized personal build | DMG/ZIP/app retained for downstream user verification |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: design spec “Persisted Data / State Transition Decision” and implementation handoff “Persisted Data Transition Check”.
- Representative setup: future test-owned run written through actual converter and accumulator, read through the current raw-trace reader/GraphQL schema, and consumed by the current frontend hydrator.
- Required behavior: matching result does not flush the open reasoning trace; result-first writes the inferred call and flushes before it.
- Migration/recovery: `N/A`; pre-fix rows are neither rewritten nor compatibility-routed.
- Upstream ambiguity/reroute: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `codex-reasoning-block-tracker.test.ts` | Snapshot joining, idempotency, clear, namespace, eviction | `AC-CTB-002`, `008`, `011` | Still Valid | Current reviewed invariant | Execute |
| `codex-ordered-tool-boundary-tracker.test.ts` | Matching update/result-first, lifecycle clear, eviction | `AC-CTB-009`, `010` | Still Valid | Direct new owner | Execute |
| `codex-reasoning-block-converter.test.ts` | All delta no-ops; ordered-card/update matrix; exact long sequence; isolation | `AC-CTB-003`, `004`, `007`–`011` | Still Valid | Covers approval/start/success/failure/denial/local-MCP/file/raw output, suppressed/ignored/maintenance, resets and isolation | Execute |
| `runtime-memory-event-accumulator.test.ts` | Matching success/failure/denial preservation and result-first ordering | `REQ-CTB-009`; `AC-CTB-010` | Still Valid | Direct writer facts | Execute |
| `cross-runtime-memory-persistence.integration.test.ts` | Real files/projection/compaction | `AC-CTB-005`–`010` | Still Valid | Narrow cross-owner integration | Execute |
| `run-projection-toolcalls-graphql.e2e.test.ts` old contiguous case | Adjacent reasoning and projection | `AC-CTB-005`, `006` | Needs Update | Did not reproduce matching-result sequence | Replace scenario body with exact failure + result-first companion |
| `codex-live-memory-persistence.e2e.test.ts` | Exact current model completed reasoning and persistence | `AC-CTB-003`, `005`, `008`, `011` | Needs Update | Did not count/assert all current/legacy delta methods | Add method counts and exact snapshot-only assertions |
| `segmentHandler.spec.ts` | One normalized ID produces one live ThinkSegment | `AC-CTB-003`, `006` | Still Valid | Provider-agnostic client contract | Execute |
| `runProjectionConversation.spec.ts` | Projection rows hydrate ordered segments | `AC-CTB-005`, `006`, `010` | Needs Update | No exact A+B fixture after a matching result | Add exact tool/A+B/tool fixture |
| Historical API/E2E and package reports | Former candidate pass/package | Failed candidate | Stale / Replace as current evidence | User verification disproved completeness | Rewrite canonical reports; build fresh package |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior canonical API/E2E pass | Adjacent reasoning alone was sufficient | It omitted the matching-result update that caused the packaged split | Failure supplement | Fresh exact-sequence GraphQL/package scenarios | N/A |
| Historical Electron build as current proof | Package contained the pre-Round-4 candidate | Current source is `c016730b` | Current code review/handoff | Fresh build, hashes, bundled marker scan, bundled-server probe | N/A |

No durable test file was removed.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `CTB-R4-HYDRATE-01` | `tool1 -> A+B -> tool2` projects to one hydrated ThinkSegment | `AC-CTB-005`, `006`, `010` | `autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts` | Prevents reload/client regression of the exact corrected shape |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC | Notes |
| --- | --- | --- | --- | --- |
| `CTB-R4-E2E-01` | `run-projection-toolcalls-graphql.e2e.test.ts` | Actual converter -> accumulator -> files -> GraphQL exact matching-result sequence, ignored deltas, repeated completion, next tool, and result-first | `REQ-CTB-002`–`005`, `009`, `010`; `AC-CTB-003`–`006`, `010`, `011` | One durable cross-boundary scenario |
| `CTB-R4-LIVE-01` | `codex-live-memory-persistence.e2e.test.ts` | Count three delta/part methods and assert completed-snapshot-only normalized/persisted equality | `REQ-CTB-005`, `010`; `AC-CTB-003`, `005`, `008`, `011` | Assertion remains env-gated for reasoning-worthy model output |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run` seven focused files `--no-watch` | Worktree root | Tracker, invocation matrix, converter, accumulator, file integration | Pass — 7 files / 140 tests | `tickets/in-progress/consecutive-thinking-blocks/evidence/round-2/focused-server.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts --no-watch` | Worktree root | Exact packaged sequence + result-first through GraphQL | Pass — 1 file / 6 tests | `evidence/round-2/graphql-exact-sequence.log` |
| 3 | `pnpm test:nuxt --run services/runHydration/__tests__/runProjectionConversation.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | `autobyteus-web` | Exact reload hydration and generic live one-ID card | Pass — 2 files / 30 tests | `evidence/round-2/frontend-hydration.log` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex tests/unit/agent-memory tests/unit/run-history tests/integration/agent-memory tests/integration/run-history tests/e2e/run-history --no-watch` | Worktree root | Broader affected regressions | Pass — 55 files / 385 tests | `evidence/round-2/broader-server.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC matrix plus exact API/hydration and all lifecycle variants pass | Current exact-model cadence and fresh package not yet observed | Live and package execution |
| Changed-boundary execution directness | 98% | Exact failed sequence runs through production converter/writer/schema | Provider cadence/package deployment | Live and packaged probe |
| Cross-boundary integration realism and mock gap | 96% | Real files and GraphQL schema, generic frontend hydrator | Provider is fixture-driven in API test | Live provider + packaged modules |
| Environment, configuration, identity, and fixture fidelity | 91% | Repository tests use actual stack and realistic provider payloads | Authenticated installed model/package not yet exercised | Live Codex and package |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Success/failure/denial/result-first, maintenance, resets, clear-all, eviction, run/team/turn isolation all pass | None material | No additional mode required |
| User-surface, browser, and desktop-shell confidence | 92% | Unchanged generic live/hydration state is directly asserted | Fresh package and full window not yet exercised | Package build/probe; downstream user verification |
| Durable regression coverage quality and relevance | 97% | Three narrow requirement-linked durable test updates and broad pass | Proportional review remains downstream | Code reviewer review |

- Overall post-repository confidence: `95.3%`
- Calculation: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven at repository level: `Yes`, except current external/package fidelity remained a material validation risk rather than a missing deterministic criterion.
- Any applicable category below 90%: `No`
- Default clean-confidence target met: `Numerically yes, but broader validation remained required because the same boundary had failed only in a package and current provider cadence was externally variable.`
- Material residual risks: fresh package may omit current semantics; current GPT-5.6-Sol delta/snapshot cadence could expose duplicate/gap behavior; full package window cannot launch safely alongside the user-owned fixed-port app.

## Broader Validation Decision

- Decision: `Required`
- Selected modes: `Live API/CLI`, `Project Desktop Validation` (build/packaged server), and temporary packaged process probe.
- Confidence gaps: exact current model cadence/content source and current implementation inside an executable replacement package.
- Expected final confidence: `>=95% with no category below 90% if both pass.`
- Browser decision: no standalone browser run. No DOM, browser API, routing, or frontend production code changed; semantic live/reload behavior is directly asserted in Nuxt. Browser execution would not prove the provider/tool/persistence boundary better.
- Desktop decision: build and execute the bundled server and current modules. Do not launch a second full Electron window while another user-owned package owns fixed port `29695`. Actual replacement-window user verification remains a downstream delivery gate.

## Live Environment And Fixture Plan

- Live command: exact `gpt-5.6-sol`, reasoning effort `max`, `RUN_CODEX_E2E=1`, `CODEX_MEMORY_E2E_ASSERT_REASONING=1`, five-minute timeouts.
- Health/readiness: Codex app-server thread ready/idle; recorder idle; Vitest pass.
- Identity/authentication: existing authenticated Codex CLI; no values recorded.
- Evidence: raw completed item count/IDs, all delta/part method counts, normalized event count/IDs, persisted trace count, exact completed-snapshot/normalized length equality.
- Package: fresh personal macOS ARM64 build; archive checks/hashes; bundled markers; isolated server with clean SQLite on `29795`; temporary exact-sequence probe and HTTP GraphQL.
- Cleanup: close only test-owned Codex/package processes and remove their temporary data; preserve the unrelated listener at `29695`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `CTB-R4-PACKAGE-01` | Fresh package executable as Node, bundled server on `29795`, packaged converter/accumulator/writer plus HTTP GraphQL | Built artifact contains and executes one live normalized A+B ID and one persisted/projected A+B row | Deployment-content check is tied to a generated local package; durable semantic coverage already exists in repository tests |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Pre-fix history repair | Explicitly out of scope | Historical runs remain fragmented | None |
| Delta support | Explicit permanent non-support | None while no-effect remains covered | None |
| Full replacement Electron window | User-owned package occupies the fixed port and must not be disrupted | Window/startup and final visual use remain unverified for this candidate, though shell code is unchanged and bundle/server are tested | Delivery retains explicit user-verification gate after the other app is quit |
| Every provider lifecycle alias induced live in one turn | Approval/failure/denial/local-MCP/file/raw-output surfaces are not safely deterministic from one live model prompt | Bounded alias-shape uncertainty | Production converter matrix directly covers real payload forms; actual live cadence covers external protocol/content source |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Duplicate completed snapshots or completed-snapshot content gap in current live cadence | Design Impact | Live exact-model comparison | `solution_designer` through required workflow reroute |
| Exact sequence splits in API/package | Local Fix unless contract mismatch appears | GraphQL/package probe | `code_reviewer` for failure-origin review |
| Delta/part event emits or mutates state | Local Fix | Durable/live evidence | `code_reviewer` for failure-origin review |
| Fresh package omits current semantics | Local Fix (packaging) | Marker/probe evidence | `code_reviewer` for failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`
- Repository-resident durable coverage added/updated/removed: `Yes — three updated files, none removed`
- Post-repository confidence: `95.3%`
- Broader validation decision: `Required — live exact model and fresh packaged runtime completed successfully; final outcomes are in the execution report.`
- Reroute required: `No`
- Historical pass reusable as current evidence: `No`
