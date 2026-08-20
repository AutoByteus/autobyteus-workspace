# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-test-review-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/docs-sync-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/electron-test-build-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/handoff-summary.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/release-deployment-report.md` (historical stopped-delivery package, preserved for cumulative visibility).
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`, `DR-002`, `DR-003` (historical; delivery remains stopped until proportional durable-test review passes).
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003` (completed)
- Current Investigation Round: `3`
- Trigger: `CRR-004` renewed source-review Pass for `IR-002` commit `0ce9d17b75195b0142abadc4593f6fea47893be0`, which explicitly narrows the production run-summary projection after `API-REV-002` reproduced strict Team transport rejection.
- Prior Investigation Reviewed: `API-REV-002`, Fail with 98.0% failure-origin confidence. Its real-provider failure and successful fresh-process persistence evidence were retained as the pre-fix differential baseline and are superseded for current disposition by the completed Round-3 Pass.
- Latest Authoritative Investigation: Round 3 completed successfully on 2026-08-20. `LIVE-BROWSER-TS-008`, `LIVE-BROWSER-TS-010`, and `LIVE-BROWSER-TS-009` all passed through real `open_tab` browser journeys, external runtimes, live WebSocket/GraphQL, and a fresh built-backend process. Result: **Pass at 98.3% validation confidence**; no red strict token-event rejection was observed.

## Current Requirement And Design Basis

The right-side workspace Token tab must use the existing SQLite current run record as the durable cumulative authority for the exact selected standalone run or focused team member. A fresh frontend lifecycle, backend restart, history reopen, or live event received before the Token tab opens must not leave the surface displaying only process-local deltas. The implementation carries the server's post-persist `run_summary_after_event` through standalone and strict team transports, maps it once, and makes individual frontend caches record-backed only. Exact run or compound team/member identity and higher-only `usageReportCount` admission resolve stale GraphQL/live ordering. Team totals remain backend-owned and move through `live_partial`, `refresh_required`, and `record_backed` states, with one coalesced sequential aggregate request loop until a response spans a quiet live generation.

Critical proof obligations are AC-001 through AC-009, with emphasis on: direct current-record reuse after a real server-process restart; complete token/cost/unit-price/model/runtime/prompt/context/report fidelity; standalone and focused-member live-before-open convergence; live-before/during/after ordering without loss or duplication; exact compound team identity; and maximum one in-flight team aggregate request while persisted member traffic continues. No schema, migration, pricing, accounting, or Token Meter presentation redesign is approved.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / current-record persistence and GraphQL readers | Preserved | Requirements REQ-001/004 and AC-001/002/009; design DS-001; implementation transition check | Existing API/integration assertions remain valid; add one process-restart HTTP GraphQL lifecycle because existing token E2E uses an in-process schema and does not reopen the same database in a fresh server process. |
| BEH-002 / standalone live summary and readiness | Changed | REQ-001/002/003; AC-003/005/006; design DS-002/DS-004; CRR-001 | Retain focused store/component regressions and execute a browser-equivalent frontend against a real GraphQL server for fresh-store, live-before, during, and after behavior. |
| BEH-003 / focused team-member transport, identity, and readiness | Changed | REQ-001 through REQ-005; AC-004 through AC-007; design DS-003/DS-004; CRR-001 | Retain exact strict-contract/server transport and compound-store/component coverage; include real HTTP member reads for two distinct team identities and browser-equivalent member hydration. |
| BEH-004 / team aggregate convergence | Changed/tightened | REQ-003/005; AC-006/007; design DS-005 | Retain deterministic store race coverage and execute multiple concurrent browser callers plus traffic during an actual HTTP GraphQL request, measuring maximum active aggregate requests and stable follow-up. |
| BEH-005 / Token Meter rendering | Preserved presentation, changed data authority | REQ-004/006; AC-002/005/008 | Existing component coverage remains valid; browser evidence should confirm the unchanged rendered hierarchy receives cumulative server fields in the web-equivalent desktop renderer. |
| BEH-006 / event and hydration ordering | Changed | REQ-003; AC-006; design DS-004/DS-005 | Existing deterministic race tests are necessary but mocked. Broader browser/live-API execution is required to close the request timing and renderer integration gap. |
| Delta-only individual caches, raw presence guards, generic upsert, duplicate member cache | Removed | Design Legacy Removal Policy and implementation/code-review removal checks | Do not restore or preserve compatibility-only tests. Searches and the focused suites will recheck that obsolete behavior remains absent. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes, narrowly | Team event adapter identity validation and preservation of the already-produced cumulative summary | New server transport unit tests; existing token current-store integration and ledger E2E | Fresh built-server process reopening the same SQLite data | Process lifecycle + live HTTP GraphQL |
| API / transport / contract | Yes | Exact shared nested summary DTO, team event projection, existing run/team/member GraphQL reads | Shared contract tests, server transport tests, token ledger GraphQL E2E | Strict transport plus real frontend GraphQL use are not jointly exercised | Live API and browser |
| Frontend component / state | Yes | Pinia admission/readiness/generation state and workspace hydration orchestration | Store and Token Meter component tests | Real Apollo/network timing, reload, and backend restart | Browser against real GraphQL |
| Browser integration / user journey | Yes | Token-tab data convergence in the Nuxt renderer | Component tests and implementation-only rendered inspection | Fresh renderer store, actual HTTP, delayed requests, and reload are not directly proven | Browser |
| Authentication / session / permissions | No | Token usage summary endpoints and local workspace route do not add auth/session changes | N/A | None in approved scope | None |
| Desktop renderer / web-equivalent UI | Yes | The Electron renderer uses the same Nuxt/store/GraphQL logic | Nuxt component tests and prior browser self-inspection | Full supported renderer behavior across a real network boundary | Browser-first web-equivalent validation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or native lifecycle code changed | Unchanged Electron boundary | None material to this fix | None; actual desktop launch would add no useful evidence and may disrupt the user's application |
| Process / lifecycle | Yes | Fresh frontend state and backend restart must reacquire the same persisted record | Existing in-process DB/API tests and mocked component restart sequence | Same database reopened by a new built server process | Lifecycle E2E |
| Persisted-data transition | Yes, direct-use only | Existing `token_usage_run_records` rows are read unchanged | Current-store integration, ledger GraphQL E2E, upstream direct production probe | Explicit fresh-process direct-use evidence in isolated data | Lifecycle E2E; no migration fixture |
| Worker / queue / distributed coordination | No | Per-run persistence serialization is unchanged; client request coalescing is local | Store race coverage | No multi-node behavior is introduced | None |
| External integration | No | No provider execution, catalog, billing policy, or external service changed | N/A | Real provider traffic would add cost/variability without testing the changed boundary | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence`
- Project type and runtime stack: Git/pnpm monorepo; Node.js/TypeScript Fastify backend; Prisma/SQLite; GraphQL and WebSocket transports; Nuxt/Vue/Pinia/Apollo frontend; Electron desktop wrapper; Vitest, Node test runner, and Playwright Core browser probes.
- Conflicting, missing, or unclear project instructions: No conflicts. The server package-wide `typecheck` is known to fail because `tsconfig.json` includes tests outside `rootDir: src`; use `tsconfig.build.json` and builds for source TypeScript evidence while recording, not hiding, the package limitation. Repository-wide frontend `vue-tsc` has an upstream 304-error baseline; changed-path suites, boundary guards, and Nuxt build are authoritative for this scope.
- Required environment variables or secrets available: `N/A`. Deterministic token records can be created with existing current-record test fixtures in an isolated SQLite database. No provider secret or live model is required or appropriate.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/AGENTS.md` | Closest server test instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; integration suites live under `tests/integration`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/AGENTS.md` | Closest web test instruction | Prefer Nuxt tests; always use `--run`; browser and Electron concerns are distinct. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/README.md` | Canonical full-stack and E2E workflow | `pnpm dev` starts the real built backend on 8000 and Nuxt on 3000 with worktree-local development data; `pnpm test:e2e` runs isolated deterministic server E2E. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/README.md` | Server setup, run, data, and test authority | Install via root pnpm; build with `pnpm -C autobyteus-server-ts build`; run built server with `--data-dir`; SQLite defaults and data directories are explicit; test data must not use development/production state. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/README.md` | Browser dev and test authority | Nuxt dev uses `BACKEND_NODE_BASE_URL`; web-equivalent desktop behavior should use browser development mode; Playwright Core probes may use discovered Chrome/Chromium. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-server-ts/vitest.config.ts` | Server runner configuration | Node environment, fork pool, serial files, Prisma global setup, `tests/**/*.test.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/test-support/live-e2e/test-runtime-bootstrap.mjs` | Existing built-server lifecycle harness | Provides safe loopback port reservation, isolated runtime/database materialization, built server start/stop, HTTP GraphQL execution, and owned cleanup. Reuse rather than invent another server lifecycle. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/autobyteus-web/tests/e2e/*.mjs` | Project browser-probe precedent | Self-started or externally targeted Playwright Core probes own their processes, assert PIDs/readiness, capture DOM/screenshot evidence, and clean temporary routes/resources. |
| Package manifests at workspace root, `autobyteus-server-ts`, `autobyteus-web`, and `autobyteus-team-stream-contracts` | Authoritative scripts | Contract `test` builds and runs Node tests; server `test` is Vitest; web focused command is `pnpm --filter autobyteus exec vitest run ...`; web build and boundary guards are available. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Dependencies | Worktree root | Existing `pnpm install --frozen-lockfile` state from implementation; rerun only if needed | Lockfile must not change | Required package binaries resolve | No process; preserve install state |
| Shared contract checks | Worktree root | `pnpm --filter @autobyteus/team-stream-contracts test` | Rebuilds tracked dist; source/dist diff must remain clean | Exit 0 and 2 tests | Process exits |
| Server repository tests | Worktree root | `pnpm --filter autobyteus-server-ts exec vitest run <paths> --no-watch` | Isolated Prisma test runtime; file parallelism already disabled | Vitest exit status | Test teardown and process exit |
| Built lifecycle server | Worktree root/test harness | Build, then `startBuiltTestServer({ runtimeRoot, databaseUrlOverride })` | Loopback-only, unique database below server test DB root, unique runtime below `tests/.tmp` | Existing `Server listening on host:port` marker and HTTP GraphQL response | Harness `stop()` then `removeOwnedTestRuntime()` |
| Nuxt browser renderer | `autobyteus-web` | Owned `pnpm dev --port <free>` with `BACKEND_NODE_BASE_URL=<owned server>` | Temporary, ticket-scoped fixture route only; dynamic loopback port; no Electron launch | HTTP 200 plus fixture readiness DOM marker | SIGTERM/SIGKILL only owned process; remove temporary route |
| Browser | Ticket probe | Playwright Core with discovered Chrome/Chromium | Headless, isolated browser context; no user browser profile | Page navigation and semantic DOM assertions | Close context/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Priced standalone current record | `createCurrentTokenUsageTestHarness` and `buildCurrentTokenUsagePayload` against a unique test SQLite URL | Fixed totals/costs/model/runtime/prompt/context/report count; never touch `~/.autobyteus` or development data | Delete owned DB/runtime after execution |
| Two distinct team roots and members | Same current-record fixture with exact `rootTeamRunId` and unique member run IDs | Compound identities are deterministic and non-overlapping | Delete owned DB/runtime |
| Live-before/during/after snapshots | Use the exact DTO shape derived from seeded GraphQL records; null snapshot represents unavailable persistence only where explicitly tested | Do not fabricate pricing; snapshot values copy the seeded authoritative summary | Browser context and temporary route removed |
| Team aggregate traffic | Persist additional deterministic observations through the same current-record store, then deliver corresponding persisted-event snapshots to the renderer | Single process/test database; no external worker or provider | Delete owned DB/runtime and close Prisma |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md`, “Persisted Data / State Transition Decision”; `implementation-handoff.md`, “Persisted Data Transition Check”; REQ-001/003/004 and AC-001/002/006/009.
- Representative existing-data setup and required behavior: Seed priced standalone and team-member current rows, stop the owning built server, start a fresh built server against the identical SQLite URL and data directory, and require byte-for-meaning-equivalent GraphQL run/member/team summaries. No row may be deleted, rewritten, backfilled, or reassigned.
- Evidence obtained for the approved direct-use outcome: The durable process-lifecycle E2E passed with direct record-count/identity checks and identical real HTTP GraphQL responses before and after restart; the browser probe independently reopened the same standalone record after restarting the built backend.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs` / exact nested summary and safe generation | Strict team DTO preserves the full cumulative snapshot and rejects unsafe report generation | REQ-003/004; AC-002/006; DS-003/DS-004 | Still Valid | New implementation coverage; CRR-001 rerun passed 2/2 | Retain and rerun |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts` / preserve, null, mismatch | Adapter/projector preserve complete snapshot, admit explicit null, and reject wrong team identity | REQ-002/003/005; AC-004/006/007 | Still Valid | New implementation coverage; CRR-001 rerun passed 3/3 | Retain and rerun |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` / run/member admission, stale GraphQL, compound identity, aggregate single-flight | Record-only individual caches; higher-only generations; exact team/member identity; no blind aggregate delta; one active request with dirty follow-up | REQ-001/002/003/005; AC-003/004/006/007 | Still Valid | New/updated implementation coverage; CRR-001 rerun included it in 20/20 | Retain and rerun; treat as deterministic race oracle, not real-network proof |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` / post-restart standalone and focused member | Two null-snapshot post-restart events do not suppress GraphQL hydration; durable fields render; focused member remains primary; partial team total hydrates | REQ-001/004/005/006; AC-002/003/004/005/007/008 | Still Valid | New/updated implementation coverage; CRR-001 rerun included it in 20/20 | Retain and rerun; supplement with browser/live API |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Current rows preserve exact components/cost/context/count and exact team-member identity; no synthetic team row | REQ-001/004/005; AC-001/002/007/009 | Still Valid | Existing current-record owner coverage | Retain and rerun |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | In-process GraphQL exposes full run/team/member/statistics projections from stored records | REQ-001/004/005; AC-001/002/007/009 | Still Valid | Existing broad API projection coverage | Retain and run the directly relevant expanded-summary scenario/file; it does not replace process-restart evidence |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | Hydrated run/team/member/aggregate summaries expose display-safe unit prices | REQ-004; AC-002 | Still Valid | Existing full unit-price API coverage | Retain and rerun |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Currency/status and safe-integer GraphQL semantics remain truthful | REQ-004/006; AC-002/008 | Still Valid | Existing API edge coverage | Retain relevant safe-integer/provider semantics checks if broader token suite remains practical |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Real provider turns persist and expose token usage | Provider/runtime pipeline, not required for this frontend readiness fix | Out Of Scope | Requires external runtime/model and does not materially improve cache/readiness evidence | Do not run or claim |
| Settings token statistics component/store tests | Separate Settings > Token Statistics surface | Explicit requirements out-of-scope boundary | Out Of Scope | Different selection and rendering contract | Do not change or run solely for this ticket |

## Stale Or Obsolete Coverage Decisions

None. The implementation already replaced delta-only individual-cache assertions and removed obsolete cache/readiness seams. No remaining relevant durable scenario was found asserting the removed behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Artifact / Result | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-TS-006` | Built-server stop/start reopens the same standalone/member current rows and returns exact full GraphQL summaries for exact identities without data transition | REQ-001/004/005; AC-001/002/007/009; DS-001; approved `Directly Usable — No Migration` | Added `autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts`; final run passed 1/1 | Existing token GraphQL tests build an in-process schema and do not prove a fresh server process against the same SQLite database. The process-lifecycle guarantee is explicit and stable enough to deserve regression coverage. |

## Durable Coverage To Update

None planned. Existing contract, transport, store, component, integration, and GraphQL assertions represent approved current behavior.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --filter @autobyteus/team-stream-contracts test` | Worktree root | `API-TS-001`: exact DTO, full fields, safe generation | Pass — 2/2 | `tickets/token-statistics-persistence/evidence/api-ts-001-contract.log` |
| 2 | `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts --no-watch` | Worktree root | `API-TS-002`: team adapter/projector strict transport and identity | Pass — 3/3 | `tickets/token-statistics-persistence/evidence/api-ts-002-server-transport.log` |
| 3 | `pnpm --filter autobyteus exec vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Worktree root | `API-TS-003` through `API-TS-005`: deterministic run/member restart, live/GraphQL ordering, team coalescing, rendered field fidelity | Pass — 20/20 | `tickets/token-statistics-persistence/evidence/api-ts-003-005-web-focused.log` |
| 4 | `pnpm --filter autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/token-usage-store.integration.test.ts --no-watch` | Worktree root | Current-record identity and full persisted meaning | Pass — 3/3 | `tickets/token-statistics-persistence/evidence/api-current-store-integration.log` |
| 5 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts --no-watch` | Worktree root | Existing real repository DB/GraphQL projections, provider/safe-integer semantics, and unit-price fidelity | Pass — 8/8 | `tickets/token-statistics-persistence/evidence/api-graphql-existing.log` |
| 6 | `pnpm --filter autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts --no-watch` | Worktree root after durable test addition | `API-TS-006`: built-process restart and direct-use identity/fidelity | Pass — 1/1 | `tickets/token-statistics-persistence/evidence/api-ts-006-restart-e2e-final.log` |
| 7 | `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; web boundary/localization guards and localization audit; `pnpm --filter autobyteus build`; `git diff --check` | Worktree root | Changed-surface type/build constraints, boundary integrity, production Nuxt build, and patch hygiene | Pass | `tickets/token-statistics-persistence/evidence/server-build-typecheck.log`, `web-boundary-guards.log`, `web-localization-guards.log`, `web-localization-audit.log`, `web-build.log`, `git-diff-check.log` |

## Post-Repository Confidence Scorecard (Mandatory)

All planned repository checks passed. The post-repository result remained below the clean target because the deterministic frontend suites mock Apollo and the repository GraphQL suites do not run through a fresh Nuxt renderer against a built HTTP server.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Requirement-linked contract, transport, state, component, current-store, GraphQL, and fresh-process tests all passed | Actual browser/network orchestration remained unexecuted at this gate | Run the selected browser/live journey |
| Changed-boundary execution directness | 95% | Every changed source boundary ran in a focused suite; the new built-server restart test crossed the process/API boundary | Nuxt/Apollo was still represented by mocks | Exercise production store/composable through Nuxt/Apollo |
| Cross-boundary integration realism and mock gap | 91% | Real SQLite and built HTTP GraphQL restart evidence complements in-process API suites | Renderer-to-GraphQL timing and request concurrency remained mocked | Browser against real GraphQL |
| Environment, configuration, identity, and fixture fidelity | 96% | Isolated migrated SQLite, built server, fixed priced records, and distinct team roots were exercised | Browser environment not yet included | Start owned Nuxt/Chrome against the same fixture method |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Null snapshots, identity mismatch, stale generation, single-flight, and actual backend restart all passed | Real network timing during live traffic remained unproven | Delay actual GraphQL and persist traffic around it |
| User-surface, browser, and desktop-shell confidence | 90% | Production component tests rendered the required field hierarchy; Electron shell is unchanged | No real browser/Apollo rendering result yet | Browser validation; Electron launch not needed |
| Durable regression coverage quality and relevance | 97% | Narrow requirement-linked suites plus a deterministic built-process restart E2E now protect the stable invariants | New durable test still needs the mandatory proportional code review | Route the added test after final execution |

- Overall post-repository confidence: **94.1%** (`659 / 7`).
- Calculation method: Simple average of seven applicable category scores; desktop shell is evaluated within the user-surface category as unchanged/not requiring a direct Electron launch.
- Every critical acceptance criterion directly proven: Not yet at this gate; browser-visible real-network orchestration for AC-003 through AC-007 remained indirect.
- Any applicable category below `90%`: No; user-surface confidence was exactly 90%.
- Default clean-confidence target of `95%` met: No.
- Material residual risks: Real Apollo/request timing, fresh renderer lifecycle, and continuous team traffic remained beyond repository-only checks, making broader validation required.

## Broader Validation Decision (Mandatory)

- Decision: `Required` — completed successfully.
- Selected execution mode: `Browser` + `Live API` + `Lifecycle`
- Specific confidence gap or residual risk addressed: Fresh Nuxt store against actual HTTP GraphQL; backend restart while preserving rows; live snapshots before, during, and after a query; exact team/member identities; and one active team aggregate request with a stable follow-up after traffic quiets.
- Why the selected mode can materially improve confidence: It replaces Apollo mocks with the supported Nuxt browser path and a built loopback backend using isolated persisted records, while observing actual request concurrency and DOM-visible cumulative values.
- Expected confidence after the selected validation: At least 95% overall with no category below 90%; achieved 97.3% after all seven browser/lifecycle scenarios passed and cleanup succeeded.
- Browser-specific decision and rationale: Required because frontend state/orchestration and the web-equivalent Electron renderer are changed. Browser mode is the documented development surface and directly exercises the same Nuxt/Pinia/Apollo logic without touching the user's running desktop application.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`.
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`; Playwright Core and local Chrome were available.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the Nuxt renderer with an integrated loopback backend.
- Relevant README or development instructions: `autobyteus-web/README.md` Web Development, Server Modes, Testing, and browser probe sections; root README Local full-stack development.
- Web-equivalent behavior: Token-tab store, workspace composable, Apollo GraphQL, event admission, and rendered Token Meter fields.
- Shell-specific or lifecycle behavior: No preload/IPC/window/package/server-manager code changed. The required backend restart can be proven with the built server lifecycle harness independently of Electron.
- Chosen validation approach and why it fits the project: Browser Nuxt renderer plus built isolated backend. This directly targets changed behavior and avoids disrupting the user's desktop application.
- Server/frontend setup when browser validation is used: Unique built-server runtime/database and dynamic loopback port; owned Nuxt dev server configured by `BACKEND_NODE_BASE_URL`; temporary fixture route; headless Playwright context.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron-only IPC/window lifecycle is not tested because it is unchanged and does not govern Token Meter readiness; no material confidence deduction beyond a negligible unchanged-shell residual.

## Live Environment And Fixture Plan

- Startup order and commands: Build server; create unique runtime/database; start built server with existing lifecycle harness; seed deterministic records through the current-record fixture; start owned Nuxt dev server pointing at the owned backend; launch Playwright; after repository/browser scenarios, restart only the owned backend against the same data.
- Environment choices that materially affect the run: `APP_ENV=test`, SQLite file below the project test DB root, loopback-only random ports, no provider credentials, headless isolated browser context, fixed English locale/Europe-Berlin host timezone unless browser override is needed.
- Health / readiness checks: Built-server log marker plus GraphQL response; Nuxt HTTP 200 and fixture DOM readiness marker; browser console/page error capture.
- Seed data / fixtures: Priced standalone record and two exact member records under separate team roots; all required token/cost/unit-price/model/runtime/prompt/context/report/update fields populated; later deterministic observations for race/aggregate refresh.
- Test identities, authentication, permissions, or session state: Unique run/team/member IDs; no authentication required on loopback test GraphQL; no user profile reuse.
- Requirement-linked journeys or scenarios: `API-TS-006` process restart; `BROWSER-TS-001` fresh standalone live-before hydration and rendered field fidelity; `BROWSER-TS-002` focused member, team total, and cross-team identity; `BROWSER-TS-003` stale response vs newer live snapshot; `BROWSER-TS-004` live-after hydration; `BROWSER-TS-005` continuous team traffic and maximum one in-flight aggregate request; `BROWSER-TS-006` fresh renderer after a real backend restart; `BROWSER-TS-007` narrow-viewport containment.
- DOM, screenshot, log, API, process, or other evidence to capture: Semantic DOM JSON, request timeline/max concurrency, GraphQL responses, backend/Nuxt logs, page console/errors, full-page screenshots at desktop and narrow width, and direct record counts/identities before/after restart.
- Owned processes and temporary state to clean up: Built backend, Nuxt server, Playwright browser/context, Prisma connection, unique runtime/database and sidecars, temporary fixture route and generated probe state.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `BROWSER-TS-001` through `BROWSER-TS-007` | Ticket-scoped Playwright/Nuxt fixture using the production store/composable/Token Meter and a real isolated GraphQL backend; request interception only controlled response timing while response data continued to originate from actual backend GraphQL | Fresh renderer, real Apollo boundary, before/during/after ordering, compound identity, team single-flight, backend restart/reopen, DOM field fidelity, and narrow layout containment | The repository has no general Token Meter browser fixture/seeding API. Retaining a product route or direct database seeding UI solely for this one run would create test-only product surface and maintenance burden. Durable contract/store/component/lifecycle tests cover deterministic invariants; the temporary browser probe closes the current integration-confidence gap. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron shell launch | No shell-specific code or API changed; browser exercises the same renderer/store/Apollo behavior and the process harness covers backend restart | Negligible unchanged-shell uncertainty | None unless browser evidence reveals an Electron-only dependency |
| Live external model/provider token production | Would add credentials, cost, nondeterminism, and no material evidence for the changed cache/readiness boundary | None material; persistence/enrichment is unchanged | None |
| Mobile/PWA Settings token statistics | Explicitly outside the approved right-side workspace Token-tab scope | None for this ticket | Separate task if requested |

## Ambiguities Or Reroute Triggers

None at investigation time. A mismatch between the built-server GraphQL result and the approved current-record meaning will be recorded as a failing scenario and routed through code review for failure-origin determination rather than guessed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added `autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts`; no durable coverage was updated or removed.
- Post-repository confidence: `94.1%`; below the 95% clean target because the live Nuxt/Apollo boundary had not yet executed.
- Broader validation decision: `Required` — Browser + Live API + Lifecycle; completed with seven passing scenarios and final confidence `97.3%`.
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The investigation was written before durable coverage edits and final execution, then updated with actual repository evidence and the final broader-validation result. Existing validity decisions did not change. The sole durable addition passed and requires proportional test-code review before delivery.

## Round 2 Real-Provider Browser Re-entry — Initial Investigation

- Current Investigation Round: 2
- Trigger: The user rejected the round-1 confidence basis and supplied an actual Electron screenshot at /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ed927d6552be4ee296cf135ccac0b128/api_e2e_engineer_298b6d2eecbc4050a84da14d0638dbcc/context_files/ctx_b9e7abb3ba81__image.png. The screenshot shows a running team member receiving a visible error: Rejected TOKEN_USAGE_UPDATED because observed_runtime_kinds, observed_model_identifiers, and observed_model_providers are unrecognized keys.
- Prior Round Reviewed: API-REV-001, prior Pass at 97.3%.
- Prior unresolved failure recheck: Round 1 had no recorded failure. The user evidence creates new scenario LIVE-BROWSER-TS-008 and invalidates the earlier conclusion that external runtime generation had no material value for this change.
- Coverage investigation completed before round-2 real execution: Yes.
- Existing coverage validity revision:
  - The strict contract test remains useful but is insufficient because its summary fixture is manually schema-shaped.
  - The server team transport test remains useful but is insufficient because its summary fixture is also manually schema-shaped and never consumes buildTokenUsageRunSummaryFromRecords output.
  - The round-1 browser probe remains truthful for seeded GraphQL/store behavior but does not cover a real runtime token observation traversing the persistence builder and strict team WebSocket projector.
  - The restart GraphQL E2E remains valid for persistence/reopen but does not cover live team transport.
- Source-to-runtime risk found during investigation: buildTokenUsageRunSummaryFromRecords spreads buildTokenUsageRunAggregate output. That aggregate includes observed_runtime_kinds, observed_model_identifiers, and observed_model_providers, while TokenUsageRunSummaryPayload and tokenUsageRunSummaryDtoSchema do not admit those fields. The strict team event adapter/projector therefore has a plausible real-data rejection path matching the screenshot.
- Durable coverage decision for this round: Do not edit durable coverage before failure-origin review. If the real run reproduces the mismatch, record the missing builder-to-strict-projector regression seam and route the failure package to /code_reviewer.
- Environment plan:
  - Use an isolated ticket-owned runtime and SQLite database, not the user's active Electron state.
  - Import credential assignments with pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url <isolated file URL>. Never print secret values.
  - Import /Users/normy/autobyteus_org/autobyteus-agents as a LOCAL_PATH agent package through the normal GraphQL mutation.
  - Start the built server on a ticket-owned loopback port and start the real Nuxt development frontend on a separate ticket-owned loopback port. The canonical fixed ports 8000 and 3000 are already occupied by unrelated, non-owned processes and will not be stopped.
  - Launch Google Chrome through Playwright against the dev frontend; use the actual Agent Teams UI to select Classroom Simulation Team.
  - Configure Professor as runtime autobyteus with model deepseek-v4-flash and Student as runtime codex with model gpt-5.6-luna.
  - Start the team in a ticket-owned workspace, send a concise classroom exercise that requires professor-to-student communication, observe both runtime turns, the Team conversation, browser console/page/request errors, strict TOKEN_USAGE_UPDATED errors, and the Token tab.
- New scenario: LIVE-BROWSER-TS-008 — real Classroom Simulation Team with mixed AutoByteus/DeepSeek and Codex/gpt-5.6-luna members must run through real provider/runtime token events without strict transport rejection; the Token tab must converge to persisted cumulative usage.
- Broader validation decision: Required by explicit user request and new production evidence. Selected mode is Browser + Live external runtimes + Live WebSocket/GraphQL + Process lifecycle.
- Round-2 confidence before execution: Below 90%. The supplied screenshot and source-path mismatch contradict the round-1 Pass for the actual team-runtime boundary.

## Round 2 Real-Provider Browser Re-entry — Completed Investigation

### Existing Coverage Validity Decision After Execution

| Coverage / Evidence | Updated Validity | Real-Execution Finding | Required Action |
| --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs` | Still Valid but Incomplete | The strict DTO correctly rejects unknown fields, but its manually shaped fixture never receives the real summary builder output. | Retain. After the source fix, add a builder-to-strict-contract regression instead of weakening strictness without a reviewed design decision. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts` | Still Valid but Incomplete | Its manually shaped summary passes, while the live `buildTokenUsageRunSummaryFromRecords` result fails at `tokenUsageRunSummaryDtoSchema.parse`. | Retain and expand after failure-origin review so the adapter consumes a real built summary. |
| Focused web store/component coverage | Still Valid | Persisted GraphQL summaries and the Token Meter rendered correctly even while live team events were rejected. | Retain; these tests protect hydration/readiness but cannot substitute for live transport admission. |
| `token-usage-record-restart-graphql.e2e.test.ts` | Still Valid | The real provider record and two communication messages survived terminate, fresh backend process, and fresh `open_tab` reopen with unchanged totals. | Retain. It proves persistence, not the failing live team event transport. |
| Round-1 browser probe | Still Valid for its seeded scenarios, no longer sufficient for release confidence | Seeded GraphQL/store journeys did not traverse the runtime summary builder through the strict Team WebSocket adapter. | Keep as deterministic race evidence; supersede its overall Pass with `API-REV-002` Fail. |

### Executed Environment And Boundary

- Credential assignments were imported into an isolated ticket database through the real `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env ...` flow. Dry-run and confirmed import both passed; nine configured assignments were reported and no secret values were recorded.
- `/Users/normy/autobyteus_org/autobyteus-agents` was loaded as the agent package root. The built server discovered 9 agent definitions and 20 team definitions, including `Classroom Simulation Team`.
- The real built backend ran at `127.0.0.1:52967` against a migrated isolated SQLite database. The real Nuxt development frontend ran at `127.0.0.1:52968`. Fixed ports 8000 and 3000 were occupied by unrelated processes and were not touched.
- At the user's explicit direction, the authoritative browser surface was `mcp__autobyteus_agent_tools__open_tab`, not the initially planned Playwright driver.
- The browser configured `/professor` as `autobyteus` + `deepseek-v4-flash` and `/student` as `codex_app_server` + `gpt-5.6-luna`, with tool auto-approval enabled.
- The persisted execution manifest independently confirmed those exact runtime/model bindings. The real exchange completed Professor -> Student -> Professor, returned `42`, persisted two communication messages, and recorded 214,148 aggregate tokens across 14 usage reports.

### Reproduced Failure And Source Seam

`LIVE-BROWSER-TS-008` failed the expected live-transport behavior. Every provider token observation was persisted and the Token Meter updated, but the event monitor rendered repeated red `An Error Occurred` cards with:

```text
Rejected TOKEN_USAGE_UPDATED: unrecognized keys
observed_runtime_kinds
observed_model_identifiers
observed_model_providers
```

The source path matches the user evidence:

1. `autobyteus-server-ts/src/token-usage/projections/token-usage-run-aggregate.ts:118-120` adds the three `observed_*` arrays to `TokenUsageCostSummaryAggregate`.
2. `buildTokenUsageRunSummaryFromRecords` spreads that aggregate into a value typed as `TokenUsageRunSummaryPayload` at lines 124-145.
3. `autobyteus-server-ts/src/agent-team-execution/services/team-agent-event-adapter.ts:141-155` parses `run_summary_after_event` through the strict shared schema.
4. `autobyteus-team-stream-contracts/src/token-usage-run-summary-dto.ts:33-88` does not admit the three arrays and is `.strict()`.

This is a product-source contract-composition defect, not a credential, provider, browser, database, or fixture failure. TypeScript structural typing allowed the excess properties to cross the builder return boundary; the runtime strict parser exposed the mismatch.

### Fresh-Process Reopen Result

`LIVE-BROWSER-TS-009` passed the persistence/reopen portion:

- Terminating the team returned `success: true`.
- A fresh built backend process reopened the same isolated SQLite database.
- A fresh `open_tab` instance selected the exact historical team run and hydrated its final Professor response, two communication messages, and Token Meter.
- Totals remained Professor 44,254 / 6 reports, Student 169,894 / 8 reports, Team 214,148 / 14 reports.
- The hydrated historical event projection did not recreate the rejected diagnostic cards. This does not clear the live failure; it shows that the red rejection cards are live diagnostics rather than persisted token ledger corruption.

### Round 2 Coverage Decision

- Repository-resident durable coverage changed in Round 2: **No**.
- Durable coverage removal: **None**.
- Missing durable seam: one post-fix server regression must build a summary with `buildTokenUsageRunSummaryFromRecords`, place it in a real `TOKEN_USAGE_UPDATED` payload, and require the Team adapter/projector plus shared strict parser to admit and serialize it without unknown keys.
- Do not add that regression or alter the contract before the code reviewer decides the correct source ownership: strip aggregate-only observation fields from the run summary, explicitly map allowed fields, or intentionally revise the contract with design approval.

### Round 2 Investigation Decision

- Proceeded to real execution: **Yes**.
- Authoritative result: **Fail**.
- Failure-origin confidence: **98.0%**.
- Reroute required: **Yes — `/code_reviewer`** for focused failure-origin review. Delivery must not proceed.
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence`.

## Round 3 Corrected-Commit Real-Browser Revalidation — Initial Investigation

### Trigger, Prior Failure, And Corrected Boundary

- Current investigation round: **3**; planned revision: **API-REV-003**.
- Reviewed implementation/source state: `IR-002` commit `0ce9d17b75195b0142abadc4593f6fea47893be0`; `CRR-004` is Pass at 96.2/100 with no open finding.
- Prior result rechecked first: `API-REV-002` is the latest completed result and remains **Fail** with 98.0% failure-origin confidence until `LIVE-BROWSER-TS-008` passes. The failure was repeated red `Rejected TOKEN_USAGE_UPDATED` cards for the three statistics-only `observed_*` keys during valid mixed-runtime Team traffic.
- Corrected production seam: `buildTokenUsageRunSummaryFromRecords` now explicitly projects only approved `TokenUsageRunSummaryPayload` fields. The wider statistics aggregate still owns `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers`; they must not enter standalone or Team strict live payloads.
- Required linked lifecycle recheck: after the live Team run, `LIVE-BROWSER-TS-009` must stop the owned backend, start a fresh built backend against the exact same isolated SQLite database/runtime, open a **fresh** `open_tab`, and confirm exact persisted Team/member/message convergence without live rejection artifacts.
- Proportionate independent-agent recheck: because the same production builder feeds standalone events, add `LIVE-BROWSER-TS-010` for a real AutoByteus `deepseek-v4-flash` standalone run. It must receive a real response, admit live token updates without a red rejection card, show a nonzero cumulative Token Meter, and agree with its GraphQL current-run summary.

### Coverage Validity And Durable-Coverage Decision

| Coverage / Evidence | Round-3 Decision | Basis | Action Before Final Result |
| --- | --- | --- | --- |
| `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs` | Still Valid | The strict DTO should continue rejecting genuinely unknown fields; `IR-002` does not weaken the contract. | Rerun 2/2. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts` | Updated by IR-002; valid and directly relevant | The regression now uses real observation -> production fold -> real `TokenUsageRunRecord` -> real builder -> real `TOKEN_USAGE_UPDATED` -> Team adapter -> projector -> strict parser. It asserts exact published equality, nested prices, aggregate observation retention, and no leaked aggregate-only keys. | Rerun with the affected fold and accumulator suites; do not replace with a manually shaped fixture. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-record-restart-graphql.e2e.test.ts` | Still Valid | Directly protects fresh built-process reuse of current records but does not exercise real external runtimes or strict live event admission. | Retain; linked real-browser restart supplies the missing runtime/UI evidence. |
| Existing focused web store/component race coverage | Still Valid | Cache admission, strict generation, compound identity, and single-flight aggregate requests are unchanged by IR-002. | Reuse the prior passing evidence; no frontend source changed. |
| Round-2 real-provider evidence | Still Valid as failure baseline | It is the direct pre-fix observation and supplies exact differential expectations, models, flow, totals/messages, and screenshots. | Recreate the same mixed-runtime journey on the corrected commit; never overwrite round-2 evidence. |

- Repository-resident durable coverage planned in API/E2E round 3: **none**. The implementation-owned durable Team regression already covers the stable source seam. API/E2E will preserve it, rerun it, and route the successful cumulative package through `/code_reviewer` for the required proportional durable-test review.
- Durable coverage removals: **none**.
- Temporary executable coverage is appropriate for the paid/external-provider journeys because credentials, catalog availability, token totals, and provider latency are nondeterministic and the repository does not provide stable provider fixtures. The durable source seam is already covered without relying on external services.

### Planned Repository And Real-System Execution

| Order | Scenario / Command | Boundary And Expected Evidence |
| --- | --- | --- |
| 1 | Confirm exact HEAD and inspect the explicit projection plus strict DTO key set | The correction must precede both Team and standalone emission and contain no aggregate spread. |
| 2 | `pnpm --filter @autobyteus/team-stream-contracts test` | Strict contract remains exact; 2/2 expected. |
| 3 | `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts tests/unit/token-usage/projections/token-usage-run-fold.test.ts tests/unit/token-usage/services/token-usage-run-accumulator.test.ts --no-watch` | Builder-to-Team strict transport and adjacent fold/accumulator behavior; 14/14 expected. |
| 4 | `pnpm --filter autobyteus-server-ts build` | Production-built server and sanitized bootstrap must remain executable. |
| 5 | Isolated `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env`; load `/Users/normy/autobyteus_org/autobyteus-agents`; built backend + Nuxt dev on owned dynamic loopback ports | Real provider/catalog/runtime/package/configuration fidelity without touching fixed ports 8000/3000 or the user's desktop data. Secret values must never enter evidence. |
| 6 | `LIVE-BROWSER-TS-008` via actual `mcp__autobyteus_agent_tools__open_tab` | Classroom Simulation Team: Professor `autobyteus` + `deepseek-v4-flash`, Student `codex_app_server` + `gpt-5.6-luna`; real Professor -> Student -> Professor flow; no red `Rejected TOKEN_USAGE_UPDATED`; live Team/member Token Meter converges to GraphQL. |
| 7 | `LIVE-BROWSER-TS-010` via actual `open_tab` | Standalone AutoByteus/`deepseek-v4-flash` response; no red strict-admission error; nonzero live Token Meter equals the exact GraphQL run summary. |
| 8 | `LIVE-BROWSER-TS-009` after owned backend stop/start and a fresh `open_tab` | Exact historical Team/member/message totals survive a fresh process and renderer; no persisted red rejection card. |

### Isolation, Evidence, Cleanup, And Decision Gate

- Evidence root for this round: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003`. Round-2 evidence remains immutable at its existing path.
- Runtime/data isolation: unique ticket-owned `tests/.tmp` runtime, unique SQLite file and sidecars, unique workspace, and loopback-only dynamic ports. The canonical user ports 8000/3000 and `/Users/normy/.autobyteus/server-data` remain untouched except read-only secret source access.
- Browser evidence: semantic DOM snapshots/queries, exact rejection-string counts, screenshots of Team live completion, each relevant Token Meter, standalone response/Token Meter, and fresh-process Team reopen; correlate with GraphQL JSON and backend/frontend logs.
- Cleanup: terminate owned Team/standalone runs where supported, close only tabs opened for this round, stop only owned frontend/backend PIDs, and remove only the unique runtime/database/workspace created for API-REV-003. Verify listeners are gone.
- Broader validation decision: **Required** — Browser + Live external runtimes + Live WebSocket/GraphQL + Process lifecycle. Repository results alone cannot close the exact previously failing real stream and visible error-card boundary.
- Pre-execution confidence: **below 90% for release disposition** while the prior critical failure remains unresolved, regardless of the passing source regression.
- Pass gate: all three live scenarios pass; exact prior failure absent; live and restart values converge; no critical browser/backend errors; cleanup succeeds; final overall confidence at least 95% with no category below 90%.
- Failure gate: any repeat of the strict rejection, missing live convergence, persisted-data mismatch, provider/runtime misbinding, or unclean owned lifecycle produces a new Fail and focused reroute through `/code_reviewer`; it may not be averaged away by other passing checks.

## Round 3 Corrected-Commit Real-Browser Revalidation — Completed Investigation

### Repository Evidence And Post-Repository Gate

| Check | Result | Direct Boundary Proven | Evidence |
| --- | --- | --- | --- |
| Exact source projection inspection | Pass | Commit is `0ce9d17b75195b0142abadc4593f6fea47893be0`; the run-summary builder contains no `...aggregate` spread and the strict DTO contains no `observed_*` keys. | `real-provider-evidence-api-rev-003/source-boundary-inspection.log` |
| Shared Team summary contract | Pass — 2/2 | Strict exact DTO and safe generation remain enforced. | `shared-contract.log` |
| Affected builder/fold/accumulator/Team transport suites | Pass — 14/14 across 3 files | A real production-built summary reaches the Team adapter/projector and strict parser without leaking statistics-only keys; adjacent persistence folding remains correct. | `affected-server-suites.log` |
| Production server build and sanitized bootstrap smoke | Pass | Corrected source is executable as built output; built-in/bootstrap behavior remains healthy. | `server-build.log` |
| Diff hygiene | Pass | Existing shared worktree changes contain no whitespace error. | `git-diff-check.log` |

The post-repository evidence directly closes the source seam but cannot by itself supersede the prior critical real-stream failure. Therefore broader validation remained required.

| Confidence Category | Post-Repository Score | Supporting Evidence | Remaining Gap Before Browser Execution |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Exact corrected seam plus the retained requirement-linked persistence/store/browser baseline | Prior real failure not yet rechecked |
| Changed-boundary execution directness | 96% | Real fold/record/builder/event/adapter/projector/parser regression | External runtime and live browser not yet included |
| Cross-boundary integration realism and mock gap | 85% | Production server modules executed together in Vitest/build | Real WebSocket/Nuxt/provider stream still missing |
| Environment, configuration, identity, and fixture fidelity | 90% | Built source and isolated test database paths | Requested credentials/package/runtime bindings not yet exercised |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Strict malformed rejection and retained restart/race evidence | Exact prior failure and corrected restart still open |
| User-surface, browser, and desktop-shell confidence | 75% | Retained historical browser evidence only | Previous release-equivalent browser journey failed and must be rerun |
| Durable regression coverage quality and relevance | 97% | IR-002 added the missing real builder-to-strict-Team seam | Proportional test-code review remains required after successful execution |

- Overall post-repository confidence: **89.0%** (`623 / 7`).
- Any category below 90%: Yes.
- Critical failure unresolved at this gate: Yes — `LIVE-BROWSER-TS-008`.
- Broader validation decision: **Required**, as planned.

### Real Environment And Browser Boundary Executed

- Secrets: the exact `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<isolated-db>` workflow passed dry-run and confirmed import; nine assignments were configured. Evidence records secret names/status only, never values.
- Agent package: `/Users/normy/autobyteus_org/autobyteus-agents` loaded through `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`; the built server discovered 9 agent and 20 Team definitions, including Classroom Simulation Team and Daily Assistant.
- Services: built `autobyteus-server-ts/dist/app.js` at `127.0.0.1:55972` and real Nuxt 3.21.1 dev frontend at `127.0.0.1:55973` against one isolated migrated SQLite database/runtime.
- Isolation: existing listeners on fixed ports 8000 and 3000 were recorded and untouched. Only the owned dynamic ports and unique runtime/database/key/workspace were used and later removed.
- Browser: actual `mcp__autobyteus_agent_tools__open_tab` tabs, not a scripted substitute, were used for live Team, standalone, and fresh-process journeys. Screenshots were inspected during execution.
- Optional catalog warning: local Ollama discovery at `localhost:11434` was unavailable, but it was not selected; the server loaded 46 models and the requested DeepSeek/Codex models executed successfully.

### Final Scenario Results

| Scenario | Required Observable | Actual Evidence | Result |
| --- | --- | --- | --- |
| `LIVE-BROWSER-TS-008` | Classroom Simulation Team runs Professor AutoByteus/`deepseek-v4-flash` -> Student Codex App Server/`gpt-5.6-luna` -> Professor; no red strict token rejection; live Token Meter equals GraphQL. | Exact persisted launch configuration; two delivered communication messages; answer `42`; Professor 52,132 tokens/7 reports; Student 84,231/6; Team 136,363/13. Browser counts were zero for `Rejected TOKEN_USAGE_UPDATED`, all three `observed_*` names, and `An Error Occurred`. Backend/Nuxt rejection scan was also zero. | **Pass** |
| `LIVE-BROWSER-TS-010` | Standalone production builder path admits a real live update without red rejection and converges to GraphQL. | Daily Assistant AutoByteus/`deepseek-v4-flash` replied `standalone token check complete.` Browser Token Meter and GraphQL agreed at 6,137 total tokens/1 report, with zero rejection/error counts. | **Pass** |
| `LIVE-BROWSER-TS-009` | After termination, a fresh built backend and fresh `open_tab` restore exact Team/member/message state without rejection artifacts. | Professor, Student, Team, and two messages were exact-equal to pre-restart JSON; all pre-captured standalone summary fields also matched. The fresh history showed `42`; Professor/Student/Team Token Meter values and model/runtime labels were unchanged; rejection/error counts remained zero. | **Pass** |

### Prior-Failure Resolution

`API-REV-002` established a direct pre-fix baseline: valid token observations persisted, but the real Team strict projector rejected the over-wide builder result and rendered repeated red cards. `API-REV-003` used the same package, Team, model/runtime pair, communication direction, visible Token Meter, and restart boundary on the corrected commit. The only material behavioral delta at the prior failure seam was:

- pre-fix: repeated strict rejections for `observed_runtime_kinds`, `observed_model_identifiers`, and `observed_model_providers`;
- corrected: zero visible rejections, zero corresponding backend/frontend log signatures, live member/team totals admitted and rendered, and exact totals survived a fresh process.

This differential, the direct durable production-builder regression, and the unchanged strict DTO resolve the prior implementation-source failure without weakening validation.

### Final Confidence Scorecard

| Confidence Category | Final Score | Direct Supporting Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 98% | Retained full requirement matrix plus corrected real Team, standalone, restart, exact identities/messages, and Token Meter fidelity | No material acceptance criterion remains open |
| Changed-boundary execution directness | 99% | Real observation/fold/record/builder/strict projector plus real external runtime/browser paths | None material |
| Cross-boundary integration realism and mock gap | 99% | Built backend, migrated SQLite, provider calls, Team communication, WebSocket, GraphQL, Nuxt, and DOM executed together | Electron-only window/preload wrapper unchanged and not launched |
| Environment, configuration, identity, and fixture fidelity | 99% | Exact requested secret import, agent package, models/runtimes, persisted launch manifest, isolated owned resources | Provider latency/token totals are naturally nondeterministic but identities were exact |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Exact pre-fix symptom recheck, strict negative coverage, standalone admission, terminate/restart/fresh-tab exact equality, and retained race/single-flight evidence | Abrupt OS crash during a provider call is outside changed scope |
| User-surface, browser, and desktop-shell confidence | 98% | Actual `open_tab`, semantic rejection counts, inspected live/restart screenshots, real visible Token Meters | Electron shell itself is unchanged; user screenshot independently established shell manifestation of the old renderer error |
| Durable regression coverage quality and relevance | 97% | Exact production builder-to-strict-Team regression plus retained restart/race/API coverage | Required proportional test-code review follows this Pass handoff |

- Overall final confidence: **98.3%** (`688 / 7`, rounded to one decimal).
- Default clean target met: Yes; overall is at least 95%, every applicable category is at least 90%, and every critical scenario passed.
- Repository-resident durable coverage changed by API/E2E Round 3: **No**.
- Durable coverage changed by IR-002 and executed here: `autobyteus-server-ts/tests/unit/agent-team-execution/team-agent-token-usage-event-transport.test.ts`; proportional review remains the next workflow step.
- Cleanup: all three owned browser tabs closed; both owned server processes stopped; listeners 55972/55973 absent; unique runtime, workspace, SQLite database, vault key, and sidecars removed; fixed ports/user data untouched.
- Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/probes/api-e2e/real-provider-evidence-api-rev-003`.

### Round 3 Investigation Decision

- Authoritative result: **Pass**.
- Final validation confidence: **98.3%**.
- Prior failure resolved: **Yes**.
- New/remaining failure IDs: None.
- Required next recipient: `/code_reviewer` for proportional review of the implementation-owned durable regression and then delivery routing if that review passes.
