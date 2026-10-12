# API/E2E Coverage Investigation — token-meter-accuracy

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/requirements-doc.md` (Approved, SR-003 basis)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/solution-revision-record.md` (SR-001–SR-006)
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-spec.md` (SR-005, D-1–D-10)
- Supplemental Task Artifacts: `probes/` (P1–P9), `solution-handoff.md`, `user-16-running-member-zero.png`, `user-17-latest-prompt-97.png`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-revision-record.md` (created after the first completed result)
- Current API/E2E Revision ID: `API-REV-001` (in progress)
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code reviewer CRR-002 Pass (Implementation Review, round 2), HEAD `f78921e5f`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of changed durable tests)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Every runtime adapter reports one model call per observation, with the runtime's own per-call usage and context reading. Two explicit contract facts carry this: `reports_model_call` and the reading group (`latest_prompt_tokens`, window, percent, and the new `context_compaction_threshold_tokens`). The fold applies the D-4 rules:
- It counts a call only for model-call observations.
- It updates the latest model and runtime only from model-call observations.
- It updates the reading from any observation that carries one.

`revision` increases on every save (D-9), and the web store orders summaries by `revision`. Runtime by runtime:

- **Claude SDK:** per-call `claude_sdk_call` observations come from `message_delta` and are paired with the SDK `getContextUsage` reading. The emission is awaited before `result` is processed (D-10). The turn-end `claude_sdk_result` is reconciliation only: it adds the clamped remainder `modelUsage[selected] delta − live sums` and carries no reading.
- **AGY:** per-step usage with `base_excludes_cache`; gross = input + cache read.
- **Codex:** latest prompt = `last.totalTokens`, and a reading-only save after compaction.
- **Grok:** latest prompt = input + cache read + cache write.
- **Native:** reports its compaction threshold.

DEC-005 (a) clears pre-fix Claude readings at both migration boundaries: the Prisma SQL migration and the ledger-era consolidation (CR-F-001). Lifetime totals must equal each runtime's own cumulative totals with no double counting (REQ-004, AC-009).

Critical acceptance criteria for API/E2E: AC-001, AC-002, AC-003 (all run kinds), AC-004, AC-005, AC-006, AC-008, AC-009 and the DEC-005 transition. AC-007 (Grok) is `Should` and is covered by unit tests. AC-010 is explicit user verification (delivery).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004.
- Real-use scenarios added from the implementation, each with its real trigger:
  - **SCN-API-01 — real released-desktop upgrade.** A user on the installed release (1.4.99-beta.8) with Claude SDK and other runs installs this build. Trigger: desktop startup on the same data root → Prisma `migrate deploy`, then app-data migrations. DEC-005 path 1.
  - **SCN-API-02 — ledger-era direct upgrade.** Ledger rows from v1.3.77–v1.4.52 are consolidated through the registered `token-usage-run-records-v1` migration (CR-F-001 / SCN-CR-01). DEC-005 path 2.
  - **SCN-API-03 — continued Claude run after upgrade.** A pre-fix Claude run, cleared by the migration, receives a new turn. Its reading refreshes from the SDK and its totals continue additively.
  - **SCN-API-04 — Claude resume after process restart.** A restored Claude session reopens with `resume`. The series restart re-anchors and admits nothing on the result, while the live calls are still counted (the existing lifecycle E2E path).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none in the requirements. Code review rejected C-03 (Codex update without `last`) and C-05 (unpaired `message_delta`) as unreachable at the pinned versions. They are not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Claude reading from the SDK after each call | Changed | D-1, P1–P4 | Unit fixture tests exist; live proof needs a real Claude multi-call turn (server live E2E + desktop) |
| BEH-002 Claude per-call + remainder | Changed | D-2, D-3, D-10, P2–P4 | Unit/session tests exist; live lifecycle E2E (rewritten) + auto-compaction live; durable SQL/GraphQL case replacing the obsolete selected-model E2E |
| BEH-003 AGY per-step, base excludes cache | Changed | D-5, P8, P9 | Unit tests exist; live AGY run needed |
| BEH-004 Codex `last.totalTokens`, reading-only save | Changed | D-6, P6 | Unit tests exist; live Codex compaction reading needed |
| BEH-005 native unchanged + threshold | Changed (additive) | D-4, D-8 | Unit tests; desktop native threshold optional |
| BEH-006 Grok latest prompt | Changed | REQ-007 | Unit tests (Should) |
| BEH-007 attribution + live within one call for every run kind | Preserved + Changed (live freshness by `revision`) | D-9, contracts | Contract/store tests; live team/delegated/Org mid-turn proof needed (desktop) |
| BEH-008 only genuine overflow, marked; pre-fix readings cleared | Changed | DEC-005, migration | Unit migration tests; real released-app upgrade needed |
| Observation contract `reports_model_call` | Added | D-4 | Existing direct-payload E2E fixtures that omit it now fold as non-calls; they need updating |
| Claude `claude_sdk_main_loop_usage`, read-time Claude percent derivation | Removed | Removal plan | E2E cases asserting them are stale |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | fold, reconciler, record state, analytics | Unit suites (fixtures from probes) | Real SDK frame mix and timing | Live API (real Claude/Codex/AGY) |
| API / transport / contract | Yes | GraphQL fields, strict team/presentation DTOs, WS `TOKEN_USAGE_UPDATED` | Contract tests, deterministic GraphQL E2E | Team/collaboration live projection with a real runtime | Live API + desktop |
| Frontend component / state | Yes | store `revision` guard, panel threshold/overflow | Store/panel specs | Real live sequence of summaries | Desktop |
| Browser integration / user journey | Yes | Token tab for a running member | None end-to-end | Whole path | Project Desktop Validation |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Token Meter panel | Component specs; implementation-time preview page | Real data in real app | Project Desktop Validation |
| Desktop shell / Electron-specific integration | Indirect | Embedded server startup runs the Prisma migration | Migration unit test | Real released-app upgrade on the same data root | Project Desktop Validation (isolated instance on a released data root) |
| Process / lifecycle | Yes | Claude process resume / series restart; awaited emission | Session unit tests | Real CLI resume | Live lifecycle E2E |
| Persisted-data transition | Yes | Prisma migration + ledger consolidation | Unit migration tests | Actual startup on a released profile | Desktop upgrade + deterministic E2E |
| Worker / queue / distributed coordination | Yes (per-run serialization) | dispatch queue + `serializeRun` order | D-10 session test | Real timing | Live lifecycle E2E |
| External integration | Yes | Claude SDK 0.3.280, Codex 0.161.0, AGY 1.3.2 | Probes P1–P9 | Current CLI behavior | Live API |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy` (branch `codex/token-meter-accuracy`, HEAD `f78921e5f`)
- Base comparison worktree (owned by this validation, detached at `927796780`): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy-api-e2e-base`
- Project type and runtime stack: pnpm monorepo. Node/TypeScript server (Fastify, GraphQL, Prisma/SQLite), `autobyteus-ts` core, Nuxt/Electron web.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/TESTING.md` (no closer `TESTING*.md` for the changed packages)
- Conflicting, missing, or unclear project instructions: `pnpm test:e2e` runs `pnpm --filter autobyteus-server-ts test --run tests/e2e`; the scoped equivalent used here is `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/<dir> --no-watch`. `RUN_RUNTIME_TOKEN_USAGE_E2E` (the gate of `token-usage-runtime-graphql.e2e.test.ts`) is not listed in TESTING.md.
- Required environment variables or secrets available: `Yes` for Claude (logged-in `claude` 2.1.295 through the macOS keychain), Codex (`codex-cli 0.161.0`, `~/.codex/auth.json`) and AGY (`agy 1.3.2`). No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Workspace testing guideline | Layers and commands. Rule 1: test on a worktree build. Rule 2: never use the user's app or data. Rule 9: explain base failures. Known exception: content-cadence cases |
| `autobyteus-server-ts/AGENTS.md` | Server test commands | `vitest run <path> --no-watch`; prepare before integration |
| `docs/isolated-app-instances.md` | Isolated desktop | `pnpm --silent isolated-app start --build` / `--app` / `--data-root`, `stop <id>`; HOME is kept, so the CLI logins are available; control via CDP port |
| `package.json` (root) | E2E entry | `test:e2e`, `test:e2e:real` |
| `tests/e2e/runtime/*.e2e.test.ts` headers | Live gates | `RUN_CLAUDE_E2E`, `RUN_CLAUDE_AUTO_COMPACTION_E2E`, `RUN_RUNTIME_TOKEN_USAGE_E2E`, `RUN_CODEX_E2E`, `RUN_AGY_E2E` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Built-entrypoint E2E needs current `dist` | `dist/app.js` timestamp after HEAD | n/a |
| Isolated desktop (worktree build) | worktree | `pnpm --silent isolated-app start --build [--data-root <owned>]` | Own ports and data root | `start` JSON `ok` | `pnpm --silent isolated-app stop <id>` |
| Isolated desktop (installed release 1.4.99-beta.8) | worktree | `pnpm --silent isolated-app start --app /Applications/AutoByteus.app --data-root <owned>` | Released-shape profile producer; does not touch the user's running app | `start` JSON `ok` | `stop <id>` (owned root is kept) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Deterministic token rows | Test-owned SQLite (`tests/.tmp`, `DATABASE_URL` from the e2e setup) and existing fixtures | No user data | The tests delete their own rows |
| Claude multi-call frames | `tests/fixtures/claude-sdk-usage/claude-sdk-probe-frames.ts` (P2/P3/P4) | Captured probe shapes | n/a |
| Released-shape profile | Owned data root produced by the installed release in an isolated instance | Never the user's `~/.autobyteus` | Removed after the run; evidence summary kept in the ticket |
| Model quota | Claude subscription, Codex, AGY | Small prompts; Claude auto-compaction ~300K haiku input tokens (opt-in documented case) | n/a |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (pre-fix Claude SDK readings). `Directly Usable — No Migration` for the new column and the reconciler state.
- Design-spec and implementation-handoff references: design § Persisted Data / State Transition Decision (1)(2); handoff § Persisted Data Transition Check.
- Representative existing-data setup and required behavior: a released 1.4.99-beta.8 profile with a Claude SDK multi-call run and a non-Claude run. After upgrade, Claude latest prompt, window and percent are null; totals, costs and counts are intact; the non-Claude reading is intact; the app serves the run; a continued Claude turn writes a fresh SDK reading. Ledger era: a consolidated Claude ledger row has null readings and exact totals.
- Evidence planned: (1) real released-desktop upgrade on an owned data root (DESK-003); (2) deterministic E2E through the real `TokenUsageRunRecordsV1AppDataMigration` and GraphQL (E2E-003); (3) existing unit migration tests rerun.
- Migration-specific completion/recovery: completion through the `_prisma_migrations` ledger; relaunch is a no-op (checked on restart in DESK-003). Prisma owns rollback, so no separate recovery case is needed.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/token-usage/astra-fable-token-usage-accounting-graphql.e2e.test.ts` (4) | Pricing tiers/costs through GraphQL; latest model shown | AC-009, D-4 | Needs Update | Direct payloads omit `reports_model_call` → fold correctly treats them as non-calls (latest model null). Base passes | Add `reports_model_call: true` (each fixture is one model call) |
| `tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` (6) | Same for GPT-5.6 | AC-009, D-4 | Needs Update | Same cause | Same |
| `tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` (1) | Run/team/member summaries | AC-009, D-4 | Needs Update | latestRuntimeKind/model null, count 0 | Same |
| `tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` (3) | Provider semantics, safe-integer aggregates, consolidation | AC-009, D-4 | Needs Update | Count 0 / provider null | Same; add the DEC-005 ledger Claude row (E2E-003) |
| `tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` (1) | Display-safe unit prices incl. zero-token churn | AC-009 | Needs Update | Zero-token non-call is now (correctly) not saved, so the churn row the assertion targets never lands | Mark fixtures as model calls; intent preserved |
| `tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` case 1 | Result-only Claude turn: exact split from the main-loop field avoids the 1h flag; count 2 | BEH-002, D-3 | Replace | `claude_sdk_main_loop_usage` removed; the result is reconciliation-only | Replace with per-call + remainder through the real tracker, accumulator, SQL and GraphQL (E2E-002) |
| same, case 2 | Result carries latest prompt 22,135 (turn sum); read-time percent derivation for a null stored percent | BEH-001, BEH-008, removal plan | Replace | Both behaviors were removed by design | Replace with the SDK reading kept across the result, threshold through GraphQL, and stored values projected without derivation (E2E-002) |
| `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts` | Analytics ranges and facets | AC-009, facet gating | Still Valid | Passed on rerun on branch and base. The first run of both failed (cross-run residue in the shared test DB) | Rerun to confirm stability |
| `tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts` and the startup backfill / model-list suites | Record restart, backfills | AC-009 | Still Valid | Pass | Rerun |
| `tests/e2e/app-data-migrations/agent-org-token-continuation.e2e.test.ts` (2) | Org continuation after migration | BEH-007 | Unclear → base failure | Fails identically on base `927796780` (`post_message` not accepted) | Investigate cause (Rule 9); not caused by this change |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (3) | TeamRun V1 → V2 startup upgrade | — | Unclear → base failure | Fails identically on base | Investigate cause (Rule 9) |
| `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` | Startup migration | Out of scope | Still Valid | Pass on branch | — |
| `tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` "counts every completed turn's usage exactly once…" | Per-call + remainder + restart across process generations | AC-003, AC-004, D-10 | Still Valid (rewritten by implementation) | Not yet run | Run live (LIVE-001) |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real turn persists usage; Claude expects `claude_sdk_result` | AC-001, AC-003, AC-006 | Needs Update | Claude now emits `claude_sdk_call`; cleanup deletes legacy ledger rows, not run records | Update the Claude and Codex specs for the new contract (LIVE-002) |
| `tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts` (auto case) | Compaction boundary and rotation | SCN-003 | Out Of Scope for usage assertions | It asserts no token usage | Use as the driver for a temporary usage probe or a durable assertion (LIVE-003) |
| `tests/unit/**` token-usage, Claude, AGY, Codex, migrations; `autobyteus-web` store/panel specs; contract package tests | Unit coverage per the handoff | all | Still Valid | Rerun by implementation and code review | Rerun as a regression gate |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-002 | Claude per-call → result remainder → SQL record → GraphQL summary (calls counted, totals = `modelUsage`, Haiku hidden, reading and threshold kept across the result, no 1h assumption when the remainder is 0, compaction remainder, stored values projected without derivation) | AC-001, AC-002, AC-004, AC-008, D-3, D-4, D-10 | `tests/e2e/token-usage/claude-sdk-selected-model-graphql.e2e.test.ts` (replaced cases) | Proves the new Claude accounting at the SQL/GraphQL boundary, which unit tests do not cross |
| E2E-003 | Ledger-era Claude row consolidated through the real migration → null readings, exact totals; non-Claude reading intact | DEC-005 (a), CR-F-001 | `tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` (consolidation case) | Public GraphQL proof of the second disposition point |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-001 | astra-fable, gpt56, ledger-graphql, ledger-provider-semantics, unit-prices E2E | Mark direct model-call fixtures `reports_model_call: true` | D-4; Interface Boundary Mapping ("explicit elsewhere") | Assertions unchanged |
| LIVE-002 | `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Claude expects `claude_sdk_call` with `reports_model_call` and an SDK reading before the turn ends. Codex expects latest prompt = `last` total (reading ≥ input + output of that update). Cleanup deletes run records | AC-001, AC-003, AC-006, D-6 | The LM Studio spec is not run (no LM Studio) |

## Durable Coverage To Remove

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `claude-sdk-selected-model-graphql.e2e.test.ts` "persists configured selected Opus estimate, hides Haiku, and marks a later 1h assumption" | Exact cache split taken from the removed `claude_sdk_main_loop_usage`; the result counted as a call | Removal plan (main-loop field), D-3, D-4 | E2E-002 per-call + remainder case |
| same, "projects known Claude context and derives a stored null percent without mutation" | The result's turn-sum latest prompt (the Fix A defect) and the removed Claude read-time percent derivation | BEH-001, removal plan (aggregate Claude branch), backward-compatibility rejection log | E2E-002 reading/threshold case |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `vitest run tests/e2e/token-usage tests/e2e/app-data-migrations` | branch, before test changes | Initial E2E state | Fail (22 after rebuild: 17 token-usage fixture/stale + 5 base) | `api-e2e-evidence/logs/e2e-initial-branch.log` |
| R-02 | same | base `927796780` worktree, built | Baseline | Fail (5 app-data-migration cases, identical messages) | `api-e2e-evidence/logs/e2e-initial-base.log` |
| R-03 | same, after E2E-001/002/003 | branch | Updated deterministic E2E | Pass (39/44; the 5 remaining are base failures) | `api-e2e-evidence/logs/R03-e2e-token-usage-migrations.log` |
| R-04 | `vitest run tests/unit/{token-usage,agent-execution/backends/{claude,antigravity,codex,autobyteus,grok},app-data-migrations,startup,services,agent-collaboration,api}`; `pnpm -C autobyteus-server-ts typecheck` | branch | Regression gate | Pass (2,135 pass / 6 skipped; typecheck clean) | `logs/R04-*.log` |
| R-05 | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage` | branch | Integration | Pass (24/24) | `logs/R05-integration-token-usage.log` |
| R-06 | `NUXT_TEST=true vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage services/agentStreaming`; `pnpm -C autobyteus-{agent-presentation,team-stream}-contracts test` | branch | Frontend/contract regression | Pass (web 220/220; contracts 17/17, 10/10; rebuilt `dist` unchanged) | `logs/R06-*.log` |
| R-03b | Baseline fixes: analytics shuffle seeds 1–4; Org continuation on base copy + branch | branch, base | Rule 9 | Pass | ledger events 4, 7 |
| R-07 | Final deterministic gate on HEAD `e7f9da408` | branch | All changed E2E | Pass except the 3 base TeamRun V1 cases | `logs/R07-final-e2e-gate.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. The run has many independent cases, several long-running live cases (Claude auto-compaction, desktop builds) and a real interruption risk.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Every AC has unit/fixture or deterministic E2E proof (E2E-001..003) | Real SDK/CLI behavior, live per-call publication, UI | Live runtimes + desktop |
| Changed-boundary execution directness | 75% | Real tracker/fold/SQL/GraphQL in E2E-002 | CLI frames, transports and store are mocked or fixtured | Live API |
| Cross-boundary integration realism and mock gap | 70% | Contract tests on fixtures | Strict DTO parsing of real frames; WS delivery | Live API with contract parsing |
| Environment, configuration, identity, and fixture fidelity | 80% | Probe-derived fixtures, released-shape SQL fixtures | Real released profile | Released-app upgrade |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Restart/replay/clamp unit tests; P3 fixtures | Real resume and compaction | Live lifecycle and compaction suites |
| User-surface, browser, and desktop-shell confidence | 60% | Panel/store specs | Real meter with live data for every run kind | Isolated desktop |
| Durable regression coverage quality and relevance | 90% | Stale E2E replaced; mutation-checked | Live suites stale | Repair live suites |

- Overall post-repository confidence: 76%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (live and UI proof pending)
- Any applicable category below `90%`: `Yes` — all except durable regression
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real frame mix (R-001), D-10 timing, live freshness for all run kinds, released-profile migration.

## Broader Validation Decision (Mandatory)

- Decision: `Required`. The changed boundaries are real SDK/CLI frame streams, live transport for every run kind, the rendered meter and a real released-profile upgrade. Repository tests prove these only through captured fixtures and mocks.
- Selected execution modes:
  - `Live API`: LIVE-001 Claude lifecycle; LIVE-002 Claude/Codex runtime GraphQL; LIVE-003 Claude auto-compaction usage; LIVE-004 Codex compaction reading; LIVE-005 AGY per-step.
  - `Project Desktop Validation`: DESK-001 standalone Claude meter; DESK-002 team member / delegated copy / Org member mid-turn; DESK-003 released 1.4.99-beta.8 profile upgrade.
- Gaps addressed: AC-001/AC-003/AC-004/AC-005/AC-006/AC-008 against real runtimes and the real UI; REQ-008 for all run kinds; DEC-005 on actual startup.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron with an embedded server.
- Guidance used: TESTING.md "Choosing the path" (full real-product journey → isolated desktop instance of a worktree build), `docs/isolated-app-instances.md`.
- Web-equivalent behavior: Token Meter panel, store freshness, live transports.
- Shell-specific or lifecycle behavior: the embedded server applies the Prisma migration at startup on an existing data root.
- Chosen approach: isolated instances only. One runs the installed release to produce a released-shape profile on an owned data root. The worktree build then starts on that root.
- Effect on any already-running desktop application: none. Separate ports, data root and process group; the user's running app and `~/.autobyteus` are not touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| LM Studio native spec in the runtime GraphQL suite | No LM Studio server | Low (native unchanged; unit tests) | Native threshold spot-check on desktop if a native model is available |
| Grok live usage | REQ-007 is `Should`; unit tests cover it | Low | — |

## Ambiguities Or Reroute Triggers

None at this point.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (see the execution report § Durable Coverage Changed)
- Post-repository confidence: 76%. Final, after broader validation: 95% (execution report).
- Broader validation decision: `Required`; executed: LIVE-001..005, DESK-001..003 (+ DESK-002b).
- Reroute Required Before Validation Execution: `No`
- Notes (Rule 9 outcome):
  - Fixed as baseline commits: analytics isolation (`7f27bbbf5`), Org continuation fixture (`97e46624c`), live Claude harness (`ccb52b171`).
  - Reported, not fixed: TeamRun V1 upgrade E2E drift (Org-family migration) and the stale Codex interrupted-compaction suite.

## Execution Revisions To This Plan

- `token-usage-runtime-graphql.e2e.test.ts` needed more than a contract update. It could not create definitions ("Studio application API services are not configured"), so it moved to the real Studio server (`9b4ad5d4d`).
- LIVE-003 has durable assertions added to the auto-compaction case (`81703b021`), instead of a temporary probe.
- LIVE-004 uses a new durable suite, `codex-compaction-token-reading.e2e.test.ts` (`e7f9da408`), because `codex-interrupted-compaction.e2e.test.ts` is stale on base.
- DESK-002b added a second desktop build so the Org member and the delegated copy could be watched mid-turn in the UI.

## Round 2 — IR-004 (D-12 revert, D-13 "Compacted" note, D-9 roll-up refetch fix)

- Trigger: code reviewer CRR-005 Pass (round 4), HEAD `fdf44f205` (artifacts `352ba13ee`). Base: the unpushed integration merge `168900db7` (origin/personal @ `beb6b3b49`, including upstream compaction-prompt-cache-reuse).
- Withdrawn and not validated: D-11 (IR-003, `5b48c2b47`), reverted by `2cd590603`.
- Current basis:
  - AC-011 (SR-010): a native compaction summary call is a model call with tokens and cost; it carries no reading, so "Latest prompt" keeps its value until the agent's next call.
  - AC-012 / REQ-012 (SR-011, D-13): after a newly completed compaction on native or Claude SDK, the value is muted with "Compacted — updates on the next model call". The run's next exact-run revision clears it. Failed or stopped compaction: no note. Codex and AGY: no note.
  - D-9 fix: the standalone roll-up refetches on the host's exact `revision`.
- Changed boundaries:
  - **Web only:** status handler → compaction marks → panel; scope composable.
  - **Server:** a revert to the API-REV-001 fold (D-4).
  - **Integration:** the merged base brings upstream native compaction (`autobyteus_compaction` usage), so the native compaction path is new to this ticket's validation.
- Material risk not covered by unit specs: the real order of the native `autobyteus_compaction` usage event vs `COMPACTION_STATUS completed`. If the summary call's save arrives after the completed status, the call's own revision clears the note at once. The same applies to the Claude remainder (accepted RR-7).
- Also needed: proof on real data that the reading is kept across a real native compaction, and the panel behaviour in the packaged app (standalone, roll-up, team member).

### Round 2 Existing Coverage Decisions

| Path / Test | Decision | Evidence | Action |
| --- | --- | --- | --- |
| All API-REV-001 durable E2E paths | Still Valid | The D-12 revert restores the API-REV-001 fold; IR-004 changes no server contract | Rerun on the merged base |
| `tests/unit/token-usage/projections/token-usage-compaction-ingestion.test.ts` (upstream, adapted by IR-004) | Still Valid | Reading kept, 2 calls, totals and cost | Rerun |
| `autobyteus-compaction-cache-reuse-live.e2e.test.ts` (upstream) | Out Of Scope (paid provider keys) | Needs ANTHROPIC/VERTEX keys | Not run; LM Studio covers the native path |
| Web store/panel/status-handler specs (IR-004) | Still Valid | Reviewer reran 68 | Rerun as part of the web gate |

### Round 2 Planned Cases

- **R2-GATE** (repository, merged base):
  - E2E: `tests/e2e/token-usage` and `tests/e2e/app-data-migrations`.
  - Server: unit (token-usage, backends, app-data-migrations, startup) and token-usage integration; typecheck.
  - Web: token-meter, compaction and scope specs; contract packages.
- **LIVE-006** (new): native AutoByteus run on local LM Studio through the Studio server (free, no secrets), with Settings lowering the compaction trigger.
  - Asserts the real `autobyteus_compaction` call is counted with its tokens.
  - The reading is kept across it; the next agent call shows a smaller reading.
  - Records the frame order of the compaction usage vs `COMPACTION_STATUS`.
  - Durable if stable.
- **LIVE-R2** (regression on the merged base): LIVE-001 usage case, LIVE-002 (Claude, Codex, multi-call), LIVE-004 Codex compaction.
- **DESK-004** (isolated desktop build of HEAD; temporary `CODEX_HOME` with a lowered limit, allowlisted by `serverRuntimeEnv.ts`):
  - (a) Native standalone compaction: note shown, value kept and muted, cleared by the next call. Includes the roll-up view.
  - (b) Native team member compaction: note shown.
  - (c) Claude SDK `/compact`: note shown, cleared by the next call.
  - (d) Codex compaction: no note; the roll-up refetches and shows the post-compaction reading with an unchanged call count (D-9).
  - (e) AGY regression spot check on the merged base.
  - (f) Stopped compaction (best effort): no note.
- **Not planned:** failed native compaction in the desktop (hard to induce), covered by the status-handler spec; paid-key upstream suites.

### Round 2 Outcome

- Executed as planned, with one adjustment: LIVE-006 ran on DeepSeek instead of LM Studio, because the user removed the LM Studio model mid-run.
- Result: `Fail` (90%), with the failure F-API-002-01: the AC-012 note never appears after a completed Claude SDK manual `/compact`.
- Classification: `Design Impact`. The D-13 clear rule and the RR-7 "rare" premise do not hold.
- Everything else passes. Details are in `api-e2e-execution-coverage-report.md` § Round 2.

## Round 3 — IR-006 (SR-014: per-run "Compacted" mark cleared only by the run's next live model call)

- Trigger: code reviewer CRR-008 Pass (round 7), HEAD `3205b12f6` (artifacts `3c1d99922`). Code commit `c0f1b9a80` (frontend only). The server, core and contracts are unchanged since round 2 (`git diff 352ba13ee HEAD` is empty for them).
- Prior failure to recheck first: F-API-002-01 (DESK-004d).
- Changed boundary:
  - `tokenUsageCompactionMarks.ts`: a per-run boolean.
  - Clear calls in `applyTokenUsageUpdated` and `applyTeamTokenUsage`.
  - Panel markup unchanged.
- Risk read from the code: the clear happens only in those two live entry points. Org members reach the store through `agentStreamMessageProjector` → `handleTokenUsageUpdated` → `applyTokenUsageUpdated`; confirm live that an Org member's note clears.
- Planned cases (isolated desktop build of `3c1d99922`, temporary `CODEX_HOME`, DeepSeek key imported into the instance vault):
  - **DESK-005a (recheck F-API-002-01):** Claude manual `/compact` in a session with earlier calls. Note after "compacted", kept through the remainder, cleared by the next message's first call.
  - **DESK-005b (CR-F-002):** an existing Claude standalone run reopened after an app restart, with only the roll-up loaded; `/compact` as the first action. Same expectation.
  - **DESK-005c (child's calls):** a Claude standalone host with a delegated task copy still running. The host's note survives the copy's calls; the host's own next call clears it.
  - **DESK-005d (re-confirm):**
    - native standalone and team member note, set and cleared;
    - failed `/compact`: no note;
    - stopped native compaction: no note;
    - Codex compaction: no note.
  - **DESK-005e (extra):** an Org member's note sets and clears.
- **R3-GATE:** full web suite.

### Round 3 Outcome

- Executed as planned.
- Result: `Pass` (94%). F-API-002-01 is resolved.
- Two test artifacts were investigated and controlled: the panel switching tab on delegation, and an unattached UI after a restart.
- One pre-existing observation: the standalone roll-up does not refresh live on a copy's calls.
- Details are in `api-e2e-execution-coverage-report.md` § Round 3.
