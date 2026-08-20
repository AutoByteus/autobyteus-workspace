# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-spec.md`
- Supplemental Task Artifacts: None.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-persistence/tickets/token-statistics-persistence/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-001` implementation-source pass at commit `ec173d01be545d5df5ddecdf84b6d09393c0b62b`; code reviewer requested fresh-process standalone/team reopen, compound team/member identity, live-before/during/after GraphQL, and continuous team-traffic single-flight evidence.
- Prior Investigation Reviewed: None; no prior API/E2E artifact or result exists for this ticket.
- Latest Authoritative Investigation: Round 1 completed investigation and execution basis; repository and required broader validation passed.

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
