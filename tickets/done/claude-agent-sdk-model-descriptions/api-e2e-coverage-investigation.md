# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/proposed-design.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/claude-agent-sdk-model-descriptions/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Source/architecture review passed commit `456f6bc7`; API/E2E was asked to prove the live Claude GraphQL return path and realistic responsive selector behavior.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved behavior keeps `modelIdentifier` as the only executable and persisted identity while adding one optional, live, SDK-owned plain-text description through the existing Claude SDK descriptor -> shared `ModelInfo` -> GraphQL `ModelDetail` -> frontend catalog -> `useRuntimeScopedModelSelection` -> `SearchableGroupedSelect` return spine. The open selector must render and case-insensitively search the description, wrap it without horizontal overflow or checkmark collision at desktop and narrow/mobile widths, omit blank descriptions without changing name-only consumers, retain the compact closed label, and preserve close/reopen and runtime-change behavior. Existing saved identifier-only configurations are directly usable without migration.

Critical direct-proof targets are AC-001 through AC-010. In particular, repository coverage must not substitute mocked projection for the live authenticated SDK/GraphQL boundary (AC-001/AC-002), and DOM class assertions must not substitute for real browser layout measurements (AC-005).

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Claude SDK description normalization and duplicate merge | Changed | REQ-001, REQ-009; AC-001; design DS-002 | Re-run focused normalization tests and update the existing live Claude catalog integration scenario so dynamic live descriptions, identifiers, and GraphQL projection are checked together. |
| Shared `ModelInfo` and nullable GraphQL `ModelDetail.description` | Added | REQ-002; AC-002 | Exercise the built GraphQL schema and an actual HTTP GraphQL server, not only the mapper unit. |
| Frontend GraphQL/store/composable option propagation | Changed | REQ-002/003; AC-002/003/007 | Re-run focused frontend coverage and use the real Nuxt query/store/composable path during browser validation. |
| Description rendering and mixed-case search | Added | REQ-004/005/008; AC-003/004/008 | Re-run component tests; execute real browser search against current live Claude rows plus deterministic missing/whitespace rows. |
| Wrapping/checkmark responsive layout | Changed | REQ-006; AC-005; UI/UX responsive rules | Measure scroll width, row/text/checkmark boxes, line wrapping, and screenshots at representative desktop and 390 px narrow viewports. |
| Identifier-only emission/persistence and compact closed label | Preserved | REQ-007; AC-006/010; DS-004 | Re-run component/form scenarios and observe browser selection output, close/reopen, and exact alias values. |
| Non-Claude, media, and generic name-only consumers | Preserved | REQ-008/010; AC-008/009 | Re-run relevant frontend media/store suites and include deterministic null/whitespace/non-model rows in browser validation. |
| No migration or compatibility path | Preserved | persisted-data decision; AC-010; implementation handoff checks | Inspect the selected value/output and unchanged data shapes; no migration lifecycle is warranted. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | SDK row normalization into shared catalog metadata | Normalizer unit and gated live Claude catalog integration | Existing live scenario does not yet assert description | Updated gated live integration |
| API / transport / contract | Yes | Nullable schema field and GraphQL projection | Mapper unit, generated operation/type diff | No current live Claude GraphQL description assertion or HTTP execution | Built-schema integration plus live HTTP GraphQL |
| Frontend component / state | Yes | Store type, composable projection, selector rendering/filtering | Nuxt component/form/store tests | Store-to-composable-to-real DOM path is otherwise mocked at boundaries | Nuxt browser page using the real composable |
| Browser integration / user journey | Yes | Open/search/select/close/reopen/runtime change and responsive rows | Component DOM tests | CSS layout, overflow, real focus/popover positioning, and viewport behavior | Chrome via `playwright-core` |
| Authentication / session / permissions | Yes, catalog context only | Claude CLI-auth environment used by SDK discovery | Existing env-gated live integration mechanism | Must confirm the current user-auth context actually returns the described live catalog | `RUN_CLAUDE_E2E=1` and isolated source server |
| Desktop renderer / web-equivalent UI | Yes | Shared Nuxt renderer component used by Electron and browser | Nuxt tests/build | Real Chromium layout remains unproven | Browser-preferred web-equivalent validation |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or native behavior changed | Source review and implementation build evidence | None material | None |
| Process / lifecycle | Yes, bounded | Start isolated server/Nuxt, close/reopen selector, runtime cache change | Unit watchers and documented startup | Real service readiness and close/reopen state | Local lifecycle plus browser |
| Persisted-data transition | No schema change; direct-use invariant applies | Identifier-only configuration remains current reader input | Component/form emission checks and unchanged config types | Need direct observation that description never becomes selected output | Browser output plus diff inspection |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes | Installed Claude Code + Claude Agent SDK live discovery | Gated live integration exists | Dynamic auth/account catalog | Live authenticated integration |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions`
- Project type and runtime stack: pnpm TypeScript monorepo; Fastify/TypeGraphQL server; Nuxt 3/Vue frontend and Electron wrapper; Vitest; installed `playwright-core` with system Google Chrome.
- Conflicting, missing, or unclear project instructions: The repository has no durable Playwright/Cypress browser suite or config. Browser evidence therefore uses a temporary Nuxt validation route and temporary Playwright driver, both removed after execution. Server `pnpm typecheck` has the upstream-recorded pre-existing TS6059 `rootDir`/included-test conflict; production build is the valid compiler boundary for this ticket.
- Required environment variables or secrets available: `Yes` — Claude Code `2.1.207` is installed and the existing CLI-auth context can be used without printing credentials. No secret values will be recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-agent-sdk-model-descriptions/README.md` | Monorepo setup and root validation guidance | Use pnpm workspace; Claude live tests use their env gate; browser-mode frontend talks to a separately running server. |
| `autobyteus-server-ts/AGENTS.md` | Server test authority | Use `vitest run`/`--no-watch`; focused then integration/E2E. |
| `autobyteus-server-ts/README.md` | Server build/run/environment authority | `pnpm build`; `node dist/app.js --host ... --port ... --data-dir ...`; isolated data dir may hold `.env`; tests use temporary SQLite state. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts` | Server scripts/config | `pnpm test --run ...`; shared packages build in `pretest`; tests run serially in forks with Prisma test setup. |
| `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` | Existing live Claude catalog executable coverage | Gated by `RUN_CLAUDE_E2E=1` and installed `claude`; correct durable home for dynamic authenticated catalog/GraphQL assertions. |
| `autobyteus-web/AGENTS.md` | Frontend test authority | Use `pnpm test:nuxt ... --run`; tests are colocated. |
| `autobyteus-web/README.md`, `nuxt.config.ts` | Browser dev authority | `pnpm dev`; default port 3000; `BACKEND_NODE_BASE_URL` drives Vite `/graphql` and `/rest` proxy; browser behavior is web-equivalent to Electron renderer for this change. |
| `autobyteus-web/package.json` | Frontend scripts/runtime | `pnpm test:nuxt`, build, and installed `playwright-core`; no browser test script/config exists. |
| `implementation-handoff.md`, `code-review-report.md` | Reviewed implementation evidence and residual risk | Focused units/builds/codegen passed; live GraphQL and narrow browser layout remain required. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Live Claude integration | `autobyteus-server-ts` | `RUN_CLAUDE_E2E=1 pnpm test --run tests/integration/services/claude-model-catalog.integration.test.ts` | Uses installed Claude CLI/user auth; zero-turn model discovery only | Test returns live catalog and GraphQL assertions | Query control closes in production client/test; no data fixture |
| Isolated source server | worktree root | `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port 29741 --data-dir <owned-temp-dir>` | Fresh built output, isolated SQLite/data/logs; host Claude auth remains available | HTTP GraphQL introspection/catalog request succeeds | Kill recorded owned PID; remove owned temp data dir |
| Nuxt browser dev server | `autobyteus-web` | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29741 pnpm dev --port 30741 --host 127.0.0.1` | Temporary validation-only page imports real component/composable; no Electron launch | Validation route returns 200 and live options appear | Kill recorded owned PID; remove temporary page |
| Chrome automation | worktree root / temporary evidence driver | `node <temporary-playwright-driver>` using system Chrome | Desktop 1440x900 and narrow 390x844; no user profile reuse | DOM assertions and screenshots/evidence JSON complete | Close browser; remove temporary driver |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Live Claude catalog | Installed Claude Code user auth via existing `buildClaudeSdkSpawnEnvironment()` and user setting source | Zero-turn `supportedModels()` discovery; no model turn; do not print env/secrets | No created remote data |
| Isolated server state | Temporary `--data-dir` with minimal `.env` and SQLite | Does not touch packaged app on 29695 or default user app data | Remove directory after stop |
| Deterministic long/null/whitespace/non-model rows | Validation-only browser page appends local generic rows to live groups | Does not change catalog or product persistence; proves generic selector fallback/layout independent of vendor wording | Temporary page removed; evidence JSON/screenshots retained |
| Saved identifier shape | Browser page exposes selected alias and serialized `{ runtimeKind, llmModelIdentifier }` only | Explicitly excludes description/resolved model | Page removed; evidence retained |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `proposed-design.md` section `Persisted Data / State Transition Decision`; `implementation-handoff.md` section `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: identifier-only `{ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "default" | "sonnet" | "opus" | "haiku" }` remains readable/selectable; description is rediscovered only.
- Evidence planned: focused component/form tests, browser initial `default` selection, exact alias selection output, close/reopen, and serialized identifier-only config; source/diff inspection confirms no writer/model changes.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-model-normalizer.test.ts` | Description trim/absence/dedup merge and known SDK rows | REQ-001/009; AC-001 | Still Valid | Reviewed source and code-review pass | Re-run focused and broader server suites |
| `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | `mapLlmModel` exposes description and multimedia remains nullable | REQ-002/010; AC-002/009 | Still Valid | Direct mapper unit | Re-run focused and broader server suites |
| `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` | Live Claude catalog has identifiers/reasoning schema and now compares dynamic live description/identity values with the built GraphQL schema result | REQ-001/002/007/009; AC-001/002/006/010 | Still Valid | Updated before final execution; `RUN_CLAUDE_E2E=1` passed twice against Claude Code 2.1.207 without a model turn | Retain the environment gate and dynamic assertions; send the changed test file for proportional review |
| `autobyteus-web/components/agentTeams/__tests__/SearchableGroupedSelect.spec.ts` | Plain-text secondary rendering, whitespace fallback, description search, compact label, id-only emission | REQ-004/005/006/007/008/010; AC-003/004/006/008/009 | Still Valid | Direct component DOM coverage; layout classes only | Re-run; supplement with real browser measurements |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Shared projection propagates description and runtime/model changes keep identifier semantics | REQ-003/007; AC-006/007/010 | Still Valid | Consumer/composable projection assertion | Re-run focused and affected config suites |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | GraphQL rows hydrate frontend provider/model state | REQ-002/003; AC-002/007 | Still Valid | General store contract coverage; generated type includes field | Run affected store suite |
| `autobyteus-web/components/settings/__tests__/MediaDefaultModelsCard.spec.ts` | Media catalogs and identifier-only saved defaults | REQ-010; AC-009 | Still Valid | Direct non-LLM regression coverage | Run suite |
| Member/team/application override component suites | Runtime/model override lifecycle uses shared composable and exact identifiers | REQ-003/007; AC-006/007/010 | Still Valid | Existing consumer lifecycle tests | Run relevant affected suites; browser probes shared owner rather than duplicating every surface |
| Repository browser E2E framework | None exists | REQ-004/005/006; AC-003/004/005 | Out Of Scope / Not Present | No Playwright/Cypress config or durable browser test script | Use temporary realistic Chrome execution; do not introduce an isolated one-ticket browser framework |
| Four unrelated full-Nuxt failures (`workspace-history-draft-send`, `MemoryHome`, `CodexFullAccessCard`, `zhCnGlossaryConsistency`) | Workspace fixture resolution and three stale copy/glossary expectations | None for this ticket | Out Of Scope | Full run and focused rerun reproduce all four; `git diff 456f6bc7^..456f6bc7` is empty for the failing tests and their owning source/localization paths | Do not change unrelated tests/source. Preserve evidence as pre-existing branch-suite debt; rely on the clean 54-test affected run and 1,843 passing full-suite tests for ticket regression evidence |

## Stale Or Obsolete Coverage Decisions

None. No existing assertion protects obsolete description-blind or compatibility-only behavior.

## Durable Coverage To Add

None as a new file. The existing gated live Claude integration scenario is the correct durable owner and will be updated rather than duplicated.

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-CLAUDE-001` | `autobyteus-server-ts/tests/integration/services/claude-model-catalog.integration.test.ts` / live catalog scenario | Build the real schema; query `availableLlmProvidersWithModels(runtimeKind: "claude_agent_sdk")` including description; assert known alias identifiers remain unchanged and live descriptions are nonempty, trimmed, nullable-contract values through GraphQL | REQ-001/002/007/009; AC-001/002/006/010; DS-001/002/004 | Keep env gate and dynamic assertions; do not hard-code a curated vendor description table. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test --run tests/unit/runtime-management/claude/client/claude-sdk-model-normalizer.test.ts tests/unit/api/graphql/types/llm-provider.test.ts` | `autobyteus-server-ts` | Normalizer and mapper | Pass — 2 files / 14 tests | `api-e2e-evidence/01-server-focused-units.log` |
| 2 | `RUN_CLAUDE_E2E=1 pnpm test --run tests/integration/services/claude-model-catalog.integration.test.ts` | `autobyteus-server-ts`; Claude `2.1.207` | Updated dynamic live catalog + GraphQL schema scenario | Pass — 1 file / 1 test | `api-e2e-evidence/02-server-live-claude-catalog-graphql.log` |
| 3 | `RUN_CLAUDE_E2E=1 pnpm test --run tests/unit/runtime-management/claude/client tests/unit/api/graphql/types/llm-provider.test.ts tests/unit/llm-management/llm-providers/llm-provider-service.test.ts tests/unit/llm-management/services/model-catalog-service.test.ts tests/integration/services/claude-model-catalog.integration.test.ts` | `autobyteus-server-ts`; live env gate enabled | Broader changed server owners | Pass — 7 files / 32 tests | `api-e2e-evidence/03-server-broader-affected.log` |
| 4 | `pnpm test:nuxt --run` with selector, AgentRunConfigForm, member/team/application override, store, and media paths | `autobyteus-web` | Frontend changed owner plus shared consumer/non-model regressions | Pass — 7 files / 54 tests | `api-e2e-evidence/04-frontend-affected-suites.log` |
| 5 | `pnpm test:nuxt --run` | `autobyteus-web` | Full Nuxt regression | Fail outside ticket — 4 failed / 1,843 passed / 1 skipped; all four failures reproduce alone and have zero implementation-commit path overlap | `api-e2e-evidence/05-frontend-full-nuxt.log`, `06-frontend-preexisting-failures-focused-rerun.log`, `07-full-suite-failure-origin-git-evidence.log` |
| 6 | `pnpm build` | `autobyteus-server-ts` | Production TypeScript/server/bootstrap | Pass | `api-e2e-evidence/08-server-production-build.log` |
| 7 | `pnpm build` | `autobyteus-web` | Production Nuxt bundle | Pass; existing chunk-size warning only | `api-e2e-evidence/09-frontend-production-build.log` |
| 8 | `git diff --check` | worktree root | Durable test patch hygiene | Pass | `api-e2e-evidence/16-git-diff-check.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | AC-001/002/006/008/009/010 have direct or substantial focused proof; the updated live test uses current Claude auth and the built schema | AC-003/004/005/007 still lack a real browser journey | Live HTTP + Nuxt browser execution |
| Changed-boundary execution directness | 93% | Live SDK discovery, real catalog owners, built GraphQL schema, component/form/store owners, and both production builds executed | HTTP server and browser renderer have not run together | Isolated actual HTTP server and Nuxt |
| Cross-boundary integration realism and mock gap | 85% | Live server-side spine is direct and dynamic; affected frontend suites are clean | Frontend store/composable/component tests use mocks at one or more network/component boundaries | Real Nuxt store/composable against live HTTP |
| Environment, configuration, identity, and fixture fidelity | 94% | Installed Claude Code 2.1.207 and user CLI auth returned all four required aliases/descriptions twice; test DB isolated | Actual server `--data-dir`, proxy, and browser environment not started yet | Start owned server/Nuxt and capture live response |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Trim/null/whitespace, duplicate merge, name-only, id-only, runtime change, member/team/application, and media tests pass | Real close/reopen, focus/search reset, responsive state, and runtime round trip remain | Browser lifecycle journey |
| User-surface, browser, and desktop-shell confidence | 75% | DOM and wrapping-class assertions plus successful production bundle; desktop shell is inapplicable | No real Chromium wrapping, overflow, alignment, focus, or narrow-width proof | Chrome desktop/narrow measurements |
| Durable regression coverage quality and relevance | 94% | Narrow dynamic live integration update plus 14 focused server, 32 broader server, 54 affected frontend, and 1,843 passing full-suite tests | Four unrelated pre-existing full-suite failures prevent a globally clean Nuxt run | Proportional review of changed live test; unrelated failures remain separate debt |

- Overall post-repository confidence: `89.0%`
- Calculation method: Simple average of seven applicable category scores; no category will hide an unproven critical criterion.
- Every critical acceptance criterion directly proven: `No — AC-003/004/005/007 require browser/live execution`
- Any applicable category below `90%`: `Yes — cross-boundary integration realism (85%); user-surface/browser confidence (75%)`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real HTTP/proxy/client integration; CSS wrapping/overflow/checkmark behavior; close/reopen/runtime-cache journey. Four pre-existing unrelated Nuxt failures are documented but do not intersect this ticket's implementation or affected suites.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API + Browser + Lifecycle`
- Specific confidence gap or residual risk addressed: authenticated dynamic Claude descriptions through real HTTP GraphQL; real frontend query/store/composable propagation; description-only search; responsive wrapping/checkmark/overflow; close/reopen/runtime change; exact identifier-only selection; generic name-only regression.
- Why the selected mode can materially improve confidence: Repository units and in-process schema checks cannot prove network/server configuration or Chromium layout. A temporary Nuxt route can reuse the real frontend owners without introducing a permanent browser framework, while isolated source services avoid disturbing the user's packaged app.
- Expected confidence after the selected validation: `>=95%` overall with every applicable category `>=90%`, assuming all critical scenarios pass.
- Browser-specific decision and rationale: Required because AC-005 is a real layout criterion and code review explicitly identified the component DOM mock gap. Browser is preferred over Electron because the changed component/composable/API path is web-equivalent and no shell boundary changed.
- If `Not Required`: N/A.
- If `Blocked`: N/A at planning time.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping a Nuxt renderer.
- Relevant README or development instructions: `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`, `autobyteus-web/nuxt.config.ts`.
- Web-equivalent behavior: GraphQL fetch, Pinia store, runtime-scoped option projection, Vue rendering/search/selection, focus/popover/viewport layout.
- Shell-specific or lifecycle behavior: None changed; no preload, IPC, native window, embedded-server lifecycle, or packaging behavior is implicated.
- Chosen validation approach and why it fits the project: Real Chrome against the documented Nuxt development path and isolated worktree backend.
- Server/frontend setup when browser validation is used: 127.0.0.1 ports `29741` and `30741`, with Nuxt Vite proxy targeting the isolated backend.
- Effect on any already-running desktop application: `None`; packaged port 29695 and user application state are not touched.
- Behavior not directly proven and confidence consequence: Electron-shell-only behavior is not tested and is not applicable to this renderer/API-only change.

## Live Environment And Fixture Plan

- Startup order and commands: create owned server data dir -> start built server -> verify HTTP GraphQL -> add temporary Nuxt validation page -> start Nuxt with backend proxy -> verify route -> run Playwright Chrome -> stop services -> delete temp page/data/driver.
- Environment choices that materially affect the run: host CLI-auth with API-key variables left to production `buildClaudeSdkSpawnEnvironment()` policy; APP_ENV test/isolated SQLite; loopback only; system Chrome; desktop 1440x900 and narrow 390x844.
- Health / readiness checks: GraphQL introspection/catalog curl; Nuxt route 200; live group and descriptions present in DOM.
- Seed data / fixtures: live Claude rows plus appended deterministic long, null, whitespace, and non-model generic options on the temporary page.
- Test identities, authentication, permissions, or session state: existing Claude CLI user auth; no browser login or remote credentials; local loopback owner access.
- Requirement-linked journeys or scenarios: `API-CLAUDE-001`, `BROWSER-CLAUDE-001` through `BROWSER-CLAUDE-006`, and `LIFECYCLE-CLAUDE-001` as recorded below.
- DOM, screenshot, log, API, process, or other evidence to capture: raw redacted GraphQL JSON, server/Nuxt logs, evidence JSON with computed layout metrics and selected config, desktop/narrow screenshots.
- Owned processes and temporary state to clean up: server/Nuxt PIDs, temporary data directory, temporary page, temporary Playwright driver, browser context.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `HTTP-CLAUDE-001` | Curl actual isolated server GraphQL | Real HTTP schema exposes nullable description and current live aliases/descriptions | Dynamic auth/account output and environment-specific server process are inappropriate for default CI |
| `BROWSER-CLAUDE-001` | Nuxt validation route using real `useRuntimeScopedModelSelection` and shared selector | Live default/sonnet/opus/haiku names and descriptions reach actual DOM | No established durable browser framework; route is validation scaffolding only |
| `BROWSER-CLAUDE-002` | Mixed-case description-only searches | Concrete version/use phrases filter correctly | Stable logic remains durably covered in component test; browser closes integration/layout gap |
| `BROWSER-CLAUDE-003` | Desktop and 390 px viewport DOM measurements/screenshots | Long descriptions wrap; no horizontal overflow/checkmark overlap | Visual engine evidence is environment-specific and supplements durable class assertions |
| `BROWSER-CLAUDE-004` | Deterministic null/whitespace/non-model appended rows | Name-only single row, no placeholder/duplication, generic consumer remains selectable | Durable component/media suites own stable regression; temp rows isolate browser rendering |
| `BROWSER-CLAUDE-005` | Select aliases, inspect output, close/reopen, change runtime and back | Exact id only; compact label; search reset; live descriptions survive current runtime catalog path | Product has no browser harness and no persisted store schema changed |
| `BROWSER-CLAUDE-006` | Directly render two instances from the same composable groups (primary and override labels) | Shared descriptive metadata is reusable on override/launch-equivalent surfaces | Durable consumer suites cover each form; temp route proves shared browser owner without adding per-screen fixture complexity |

### Broader Validation Completion

- Result: `Pass` for `HTTP-CLAUDE-001` and `BROWSER-CLAUDE-001` through `BROWSER-CLAUDE-006`.
- Authoritative evidence: `api-e2e-evidence/10-live-http-graphql-validation.json`, `api-e2e-evidence/11-browser-desktop-long-description.png`, `api-e2e-evidence/12-browser-narrow-long-description.png`, and `api-e2e-evidence/13-browser-validation-evidence.json`.
- The isolated HTTP response returned a nullable GraphQL `String` description and the current live `default`, `sonnet`, `opus`, and `haiku` rows with identifier/value/canonical identity preserved.
- Chrome validated live rendering, mixed-case description-only search, exact identifier-only output, compact closed labels, close/reopen, runtime round-trip, a second shared selector surface, missing/whitespace/non-model fallbacks, and responsive layout at 1440x900 and 390x844. Document, popover, row, and description scroll widths remained within client widths; selected checkmarks remained separated and inside their rows.
- All owned services and temporary validation scaffolding were removed; ports `29741` and `30741` were confirmed free. The canonical execution report contains the final confidence reassessment and complete evidence matrix.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron shell/packaged app | No shell code changed; browser proves web-equivalent renderer; launching user's desktop would add disruption without evidence gain | Negligible for ticket scope | None |
| Full keyboard/listbox semantics | Explicitly out of scope and pre-existing | Known pre-existing accessibility gap | Separate requirement if desired |
| Executing a paid Claude model turn | Catalog discovery is zero-turn and execution semantics did not change | None for description metadata | None |

## Ambiguities Or Reroute Triggers

None at initial investigation. A missing live description, identifier mismatch, schema/HTTP error, or browser layout overflow will be recorded as a failure and routed to `code_reviewer` for focused origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes — update one existing gated live integration file; no new/removal`
- Post-repository confidence: `89.0%`
- Broader validation decision: `Required — Live API + Browser + Lifecycle`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Initial investigation completed before the durable coverage update. Broader validation subsequently passed and cleanup completed; the final result and confidence are authoritative in `api-e2e-execution-coverage-report.md`. The worktree's existing untracked code-review artifact was preserved.
