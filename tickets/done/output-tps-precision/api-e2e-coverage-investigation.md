# API/E2E Coverage Investigation — output-tps-precision

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md` (R3 / SR-004, user-approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md` (D3.1 / SR-005)
- Supplemental Task Artifacts: Task screenshots and the user's card screenshot (evidence only; paths in the requirements doc); implementation browser probe `evidence/implementation/browser-probe-1791963756/`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/implementation-revision-record.md` (IR-001)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md` (CRR-001, Pass 9.4)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-revision-record.md`
- Delivery Revision Record: N/A — not applicable (no delivery re-entry)
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-revision-record.md`
- Current API/E2E Revision ID: API-REV-002
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: code_reviewer pass CRR-001 (round 1), with four requested coverage items (RSK-002 Codex live timeline; AC-010 matrix + scripted AGY transport; AGY cadence and thinking sample; isolated desktop journeys for AC-005/AC-006)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: Large
- Architectural risk: High
- Input route: Reviewed
- Successful-output route: Code Review (proportional test-code review of changed durable test code)
- Proportional test-code review decision: Required

## Current Requirement And Design Basis

Each completed model call of the selected AgentRun with a usable output count and timing carries a TPS reading (`output_throughput { method, output_tokens, duration_ms }`) on its own canonical `TOKEN_USAGE_UPDATED` event. The runtime adapter measures on the server clock and chooses the method per DEC-002. The run-side `acceptModelCallThroughput` keeps only well-formed samples with at least 20 tokens and 250 ms. The web records the newest value per exact run after seen-key de-duplication. The card shows "TPS", the value, the model, the end-to-end qualifier only for `end_to_end` readings, and one collapsed help. Nothing is stored: after reload or for history the card shows "—". Accounting and persistence are unchanged.

Code review accepted two DS-003 boundary refinements:

- C-001: Codex freezes the request boundary at a non-input `item/started`, tool items included.
- C-002: ACP does not freeze at `tool_call`; a terminal `tool_call_update` moves the boundary.

C-001 holds one premise for this stage's evidence: does Codex emit the tool-calling call's `thread/tokenUsage/updated` before or after a long tool's `item/completed`?

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (single-call plain-text turn, every runtime), SCN-002 (multi-call tool turns), SCN-003 (runtime-reported call, method per DEC-002), SCN-004 (Team/Org member, delegated copy), SCN-005 (idle, reload, history).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a Codex turn whose tool runs about 3 s. Real trigger: the user asks a Codex agent to run a slow shell command. This is RSK-002 / C-001.
  - SCN-A2: an AGY long answer. Real trigger: the user asks for a long text, so `text_delta` updates stream over seconds. This checks the cadence premise behind generation speed (RSK-005 note).
  - SCN-A3: an AGY call with thinking > 0. Real trigger: a thinking-capable AGY model on a non-trivial prompt (RSK-005).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 card content and help | Changed | REQ-006/007, AC-007/008 | Component specs + browser probe (fixture and live server) + desktop screenshot |
| BEH-002 per-call TPS from runtime timing | Changed (estimator removed) | REQ-001–003, AC-001–004 | Adapter unit tables (recorded fixtures) + scripted transport + live runs per runtime |
| BEH-003 exact-run attribution / de-dup | Preserved, new field on all routes | REQ-004, AC-005 | Transport/store tests + desktop Team/Org/delegated journeys |
| BEH-004 real-time only, "—" after reload/history | Changed (copy) / Preserved (no persistence) | REQ-005, AC-006 | Store/component specs + browser probe reload + desktop reload/history |
| Accounting/persistence unchanged | Preserved | REQ-008, AC-009 | Full server unit/integration suites; persisted-record test; transport e2e persisted totals |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Acceptance check, payload builder, five adapters' timing | Unit tables with injected clocks and recorded fixtures | Real event cadence and ordering of current CLI versions | Live API (gated live suite) |
| API / transport / contract | Yes | `output_throughput` on strict presentation/Team DTOs and projectors | Transport unit tests; contract tests | Real WS framing end to end | Scripted transport e2e (real server + WS + browser) |
| Frontend component / state | Yes | Meter store map, scope, card, locales | Web specs | Rendering with real stream | Browser probe |
| Browser integration / user journey | Yes | Card in the Token tab | Browser probe (fixture) | Real product selection flows | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer | Browser probe | Team/Org/delegated selection in the real app | Isolated desktop instance |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | — |
| Process / lifecycle | Yes (renderer reload) | Session-only map | Probe reload case | Real app reload and history reopen | Isolated desktop instance |
| Persisted-data transition | No (Not Affected) | — | Persisted-record test | — | Full suites |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude, Codex, AGY, Grok CLIs; native provider stream | Recorded fixtures | Current CLI versions (Claude 2.1.296, codex-cli 0.162.1, agy 1.3.5, grok 1.0.52) | Live runs |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`, branch `codex/output-tps-precision`, base `origin/personal@1ea74caa2d`; uncommitted changes.
- Project type: pnpm monorepo. Node/TypeScript server (Fastify, GraphQL, WS, Prisma/SQLite), Nuxt web renderer inside Electron, `autobyteus-ts` core library, contract packages.
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/TESTING.md` (root; no closer `TESTING*.md` in changed packages).
- Conflicting, missing or unclear instructions:
  - TESTING.md says to isolate `agy` by copying only `antigravity-oauth-token` into a throwaway `HOME`. That file does not exist for agy 1.3.5 on this machine. With an empty throwaway `HOME`, `agy models` reports "Please sign in" (checked 2026-10-14). The sign-in apparently lives in other state, and copying unknown user state is riskier. Live AGY cases therefore use the local `agy` login with the real `HOME`, as the existing live AGY suites (`agy-context-files-live.e2e.test.ts`, etc.) do. Each run adds only its own conversations to the user's agy history. Recorded as a TESTING.md discrepancy for delivery.
  - Secrets import requires a user-given key source file. None was given, so native AutoByteus is run against local LM Studio (`qwen/qwen3.6-35b-a3b`, which TESTING.md recommends) instead of DeepSeek. AC-001 allows "DeepSeek Flash or a scripted native provider".
- Required environment variables or secrets available:
  - Claude, Grok and AGY: through each CLI's own login.
  - Codex: through a throwaway `CODEX_HOME` with a symlinked `auth.json`.
  - LM Studio: local, no key.
  - DeepSeek: No.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers and commands; clean env for E2E/live; gates; CLI isolation; LM Studio one-at-a-time; isolated desktop rules; evidence in ticket |
| `AGENTS.md` (root) | Repo instructions | Follow DESIGN.md / TESTING.md |
| `docs/isolated-app-instances.md` | Desktop instance lifecycle | `pnpm --silent isolated-app start --build`; control port; `stop <id>`; only `CODEX_HOME` passes to embedded server |
| `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts` header | Scripted transport | `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-tps-cli.mjs RUN_TOKEN_TPS_E2E=1 TEST_TPS_OUTPUT_DIR=<dir>`; Chromium needed |
| `autobyteus-web/tests/e2e/token-meter-tps-probe.mjs` header | Browser probe | `pnpm -C autobyteus-web test:e2e:token-meter-tps --output-dir <fresh>`; `--browser-executable` on macOS |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`, `grok-build-live-runtime.e2e.test.ts`, `agy-context-files-live.e2e.test.ts` | Live suite precedents | Studio server helper, GraphQL create run, agent WS send; Claude/Grok/AGY use host CLI login |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts` | Codex launch | `CODEX_APP_SERVER_COMMAND` overrides the binary, used for a wire-stamping wrapper |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (e2e) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside vitest | Test-owned temp data dir and test DB | GraphQL responds | `app.close()`, temp dir removal, test rows deleted |
| Probe Nuxt + Chromium | `autobyteus-web` | Probe-owned | Free ports | Probe receipt | Probe cleanup receipt |
| LM Studio | host | Already running (user's) | Shared compute; one run at a time | `/v1/models` lists qwen3.6 | Unload only a model this run loaded |
| Isolated desktop instance | worktree root | `pnpm --silent isolated-app start --build` with `CODEX_HOME=<temp>` | Own ports, data root | `start` JSON ok | `pnpm --silent isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definitions/runs (e2e) | GraphQL `createAgentDefinition` / `createAgentRun` | Test-owned DB/data dir | Deleted in afterAll |
| Codex login | Throwaway `CODEX_HOME` with `auth.json` symlink and minimal `config.toml` | User's `~/.codex` is not edited | Temp dir removed |
| Desktop agents/team | Created through the UI | Isolated data root | Instance stop removes the auto data root |

## Persisted Data Transition Coverage Basis

- Approved decision: Not Affected
- References: design-spec § Persisted Data / State Transition Decision; implementation-handoff § Persisted Data Transition Check
- Representative existing-data setup: N/A (nothing persisted changes)
- Evidence planned:
  - `model-call-throughput.test.ts` persisted-record case (no TPS in the record);
  - the transport e2e persisted summary (1,211 output tokens, 3 reports);
  - full server unit and integration suites unchanged.
- Upstream ambiguity: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server tests/unit/agent-execution/domain/model-call-throughput.test.ts` | Acceptance table, builder, survival through enrichment/fold/persistence failure; no TPS persisted | REQ-002/005/008, DS-004 | Still Valid | Code review; reads match design | Run |
| `server .../shared/model-call-request-boundary.test.ts` | Freeze/complete/reset | DS-003 | Still Valid | — | Run |
| `server .../claude/session/claude-call-usage-tracker-throughput.test.ts` | Generation from frame receipt; stamp before context read | AC-002 | Still Valid | — | Run |
| `server .../codex/thread/codex-model-call-timing.test.ts` | P5/P6 replay, end-to-end, `last` output | AC-003/004, C-001 | Still Valid | — | Run; complemented live |
| `server .../antigravity/agy-call-throughput.test.ts` | Generation vs provider duration; IC-1 rounding | AC-003/004 | Still Valid | — | Run; complemented live |
| `server .../acp/acp-call-throughput.test.ts` | Grok prompt/mcp replay; C-002 | AC-004 | Still Valid | — | Run; complemented live |
| `server tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts` | Team/collaboration strict DTO pass-through | AC-005 | Still Valid | — | Run |
| `server tests/unit/token-usage/projections/token-usage-model-call-fold.test.ts` | Fold unchanged with new input | AC-009 | Still Valid | — | Run |
| `autobyteus-ts tests/unit/agent/loop/llm-call-throughput.test.ts` | Native timing table and LlmPhase single-call | AC-001/003 | Still Valid | — | Run |
| Web `tokenUsageThroughput.spec.ts`, `tokenUsageMeterStore.spec.ts`, `useTokenUsageWorkspaceScope.spec.ts`, `TokenUsageThroughputCard.spec.ts`, `TokenUsageMeterPanel.spec.ts` | Newest-TPS map, intakes after seen key, scope, card, AC-006 sequence | AC-005–008 | Still Valid | — | Run |
| Contract tests (presentation, Team, collaboration) | Strict DTO accepts nullable field | AC-005 | Still Valid | — | Run |
| `server tests/e2e/runtime/token-meter-tps-transport.e2e.test.ts` + `tests/fixtures/agy-tps-cli.mjs` | Scripted AGY → real server → WS → browser card | AC-001,004,006,007,010 | Still Valid | Rewritten in IR-001 | Execute (gated) |
| `autobyteus-web/tests/e2e/token-meter-tps-probe.mjs` + fixture page | Browser card states | AC-006–008 | Still Valid | — | Execute (fixture mode; live mode via the transport e2e) |
| `server tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Live accounting per runtime | AC-009 (accounting) | Out Of Scope (does not assert TPS; accounting unchanged) | — | Not run (paid; accounting unchanged and covered by unit suites) |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-L01–L07 | Live per-call TPS on each runtime through the real server and agent WebSocket: method per DEC-002, numerator = the call's own output, duration bounded by wall time | REQ-001–004, REQ-009, AC-001–004, AC-010 | `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts` (gated `RUN_TOKEN_TPS_LIVE_E2E=1`, runtime selection by env) | No repository suite exercises real runtime cadence for TPS. Future CLI changes (framing, ordering) need a repeatable live check, and AC-010 asks for retained commands |

## Durable Coverage To Update

None planned. Existing durable coverage matches approved behavior.

## Durable Coverage To Remove

None. The estimator tests were already removed in IR-001, and code review verified that.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R01 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | Production type policy | Pass | `evidence/api-e2e/repo/R01-server-typecheck.log` |
| R02 | targeted 8 server TPS unit files (`vitest run … --no-watch`) | worktree root | DS-002–004, adapters, transport | Pass (8 files) | `evidence/api-e2e/repo/R02-server-tps-unit.log` |
| R03 | `pnpm -C autobyteus-server-ts test:unit` | worktree root | Regression (AC-009) | Pass (693 files, 4 skipped) | `evidence/api-e2e/repo/R03-server-unit.log` |
| R04 | `pnpm -C autobyteus-server-ts test:integration` | after `test:integration:prepare` | Regression | Pass except the 2 TESTING.md baseline cases (72 files pass, 1 failed file = the known `agent-status-websocket` content-cadence cases) | `evidence/api-e2e/repo/R04-server-integration.log` |
| R05 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | worktree root | Native timing | Pass (299 files) | `evidence/api-e2e/repo/R05-ts-unit.log` |
| R06 | `pnpm -C autobyteus-web test:nuxt`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | worktree root | Web store/scope/card; guards | Pass (4,394 tests; guards pass) | `evidence/api-e2e/repo/R06*.log` |
| R07 | `pnpm -C <contract> test` ×3 | worktree root | Strict DTOs | Pass (18/16/27) | `evidence/api-e2e/repo/R07*.log` |

## Test-Case Ledger Decision

- Ledger required: Yes. There are many independent cases, including long live runs, and the desktop journeys can be interrupted.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | Unit tables per adapter, store/card specs, transport tests all pass | Real runtime cadence and ordering (AC-004, AC-010) unproven | Live runs per runtime |
| Changed-boundary execution directness | 75% | Recorded fixtures replayed with injected clocks | Current CLI versions may order events differently (RSK-002) | Live + wire stamps |
| Cross-boundary integration realism | 80% | In-process transport tests, strict DTOs | No real WS → browser in repository suites | Transport e2e, desktop |
| Environment / identity / fixture fidelity | 80% | Clean test isolation | No real runtimes | Live suites, isolated desktop |
| Failure, edge-case, lifecycle, recovery | 80% | Tiny call, reload, de-dup in specs | Real reload/history in the app | Desktop |
| User surface / browser / desktop | 80% | Component specs; implementation probe | Real app selection flows | Desktop |
| Durable regression coverage | 90% | Broad new unit coverage | No durable live check | Gated live suite |

- Overall post-repository confidence: 81% (simple average)
- Every critical AC directly proven: No (AC-004/005/010 need live/desktop)
- Categories below 90%: six of seven
- 95% target met: No
- Material residual risks: RSK-002 (Codex ordering), RSK-005, AGY cadence, real Team/delegated selection.

## Broader Validation Decision

- Decision: Required (decided before the repository results, because AC-010, RSK-002, RSK-005 and AC-005/006 explicitly need live, scripted-transport and desktop evidence that repository suites cannot give).
- Selected execution modes:
  - **Live API:** a gated live suite through the real server and WS, plus wire-stamping wrappers for Codex and AGY.
  - **Scripted transport + browser:** the transport e2e.
  - **Project Desktop Validation:** an isolated desktop instance of a worktree build.
- Specific gaps addressed:
  - real runtime cadence/ordering per runtime (AC-001–004, AC-010);
  - the Codex long-tool ordering (C-001 residual / RSK-002);
  - AGY cadence and thinking count (RSK-005);
  - real product selection of Team/Org/delegated runs and reload/history (AC-005/006).
- Expected confidence after: ≥ 95% if the live readings match DEC-002 and the desktop journeys pass.
- Browser-specific decision: the browser probe re-runs in fixture mode and in live mode inside the transport e2e. Desktop journeys use the real app.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer, with an embedded server.
- Guidance used: TESTING.md, `docs/isolated-app-instances.md`.
- Web-equivalent behavior: the card, store, scope and stream intake (all renderer).
- Shell-specific behavior: none changed.
- Approach: an isolated instance of this worktree's build (`isolated-app start --build`) with `CODEX_HOME=<temp>`. It is driven through the control port with the AutoByteus browser tools. Runtimes in the instance: Codex (via `CODEX_HOME`); LM Studio native if the provider is reachable.
- Effect on any already-running desktop application: none. The other recorded instances (`iso-55100-137c` and others) are not mine and stay untouched.

## Live Environment And Fixture Plan

- Startup order:
  1. Repository checks.
  2. Server build (`pnpm -C autobyteus-server-ts build`) for the transport e2e.
  3. Scripted transport e2e.
  4. Live suite, one runtime per invocation, LM Studio alone.
  5. Isolated desktop build and journeys.
- Environment: clean env (`env -i PATH HOME TMPDIR …`) for E2E/live.
  - Codex: throwaway `CODEX_HOME`, plus `CODEX_APP_SERVER_COMMAND=<wire-stamp wrapper>`.
  - AGY: `ANTIGRAVITY_CLI_COMMAND=<wire-stamp wrapper around agy>` on the real-HOME login (see discrepancy).
- Evidence:
  - each live case's WS `TOKEN_USAGE_UPDATED` payloads with receipt times;
  - raw Codex/AGY wire lines with ms stamps;
  - desktop DOM assertions and screenshots.
- Cleanup: test-owned server, data dirs and DB rows, throwaway homes and the isolated instance. LM Studio is left as found.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| API-L04, API-L05 | `evidence/api-e2e/probes/stdout-stamp-wrapper.mjs`: wraps the real CLI and stamps each stdout line in ms | Raw Codex notification order; AGY `text_delta` cadence | Diagnostic evidence for one premise. The durable live suite asserts the observable TPS outcome |
| API-D01–D03 | Isolated desktop instance driven by browser tools | Real product journeys | TESTING.md: ticket-owned journeys need no global command |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Native AutoByteus with DeepSeek Flash | No key source file given; secrets import needs one | Low: native timing is provider-agnostic in LlmPhase. LM Studio proves the same path | No | None |
| Org member selection in the desktop | Time-boxed to Team + delegated copy this round; the Org intake and collaboration projection have repository tests | Low | No | Add on the rerun round |
| Codex approval-wait variant | Same ordering mechanism as API-L04 (approval precedes `item/completed`) | Covered by the L04 finding | No | Recheck after the fix |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Codex: `thread/tokenUsage/updated` for a tool-calling call arrives after the tool's `item/completed`, so the DS-003 call end (the usage update) includes tool time (API-L04, reproduced twice) | Design Impact (preliminary) | `evidence/api-e2e/live/codex/`, `live/codex-repeat/`; execution report § Failure Detail | Solution Designer, via failure-origin review |

Not tested in this round, to add on the rerun:
- an Org member selection in the desktop (repository route coverage exists);
- the Codex approval-wait variant (same mechanism as L04).

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added: Yes (`token-meter-tps-live.e2e.test.ts`)
- Post-repository confidence: 81%; final after broader validation: 88.6% (see the execution report)
- Result: Fail (API-L04)
- Broader validation decision: Required
- Reroute Required Before Validation Execution: No


## Round 2 Update (IR-002 / CRR-003)

- Trigger: code_reviewer CRR-003 pass on IR-002 (Codex call ends at `rawResponse/completed`; reading paired with the matching usage update; only reasoning/agentMessage freeze; approval replies are boundaries).
- Prior failure recheck first: API-L04 re-run live with wire stamps → Pass. API-L03 re-run → Pass.
- Added coverage decisions:
  - API-L08 (Codex approval held ~6 s, using the server's `CODEX_APP_SERVER_APPROVAL_POLICY=untrusted` for its own run): Add Durable Coverage (live suite).
  - API-L09 (native DeepSeek): Add Durable Coverage, with an external-server mode (`AUTOBYTEUS_TEST_SERVER_URL`), because the in-process vitest database is reset by `prisma migrate reset` on every run and cannot hold imported keys.
  - API-D03 (Org direct agent and Org team member): temporary desktop journey.
- User directions during the round:
  - "i dont have tokens for Codex now. try other models": desktop journeys moved to native DeepSeek.
  - "use pnpm to import the test env /Users/normy/.autobyteus/server-data/.env": imported into the isolated instance's database and the persistent test database `autobyteus-server-ts/db/test.db`; `pnpm test:e2e:real:preflight` reports READY.
- Repository rerun scope: the server only (IR-002 touches only server Codex files). autobyteus-ts, contracts and web results carry over from round 1.
- Runtimes unchanged since CRR-001 (Claude, AGY, Grok, LM Studio native) were not re-run live.
- Not Tested / Infeasible: the Codex desktop journey on the IR-002 build (no Codex tokens). Risk: low; the server path is proven live.
- Post-round confidence: 95% (see the execution report). Ambiguities or reroutes: none.
