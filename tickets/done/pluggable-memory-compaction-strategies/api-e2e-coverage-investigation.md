# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/design-spec.md`
- Supplemental Solution Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/working-context-compaction-domain-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/working-context-compaction-strategy-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/compaction-strategy-settings-ui-ux-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/code-review-report.md`
- Current Investigation Round: `4`
- Trigger: Source Review Round 11 Pass at working HEAD `df7ade6ea461eec32aff37cdd8084be7b8c51d10`, score 94/100, no open findings. `CR-PMCS-010`, `CR-PMCS-011`, and `CR-PMCS-012` are resolved in source; fresh API/E2E must recheck the two prior browser failures plus initial-read Retry recovery.
- Prior Investigation Reviewed: Round 3 / Execution Round 2 Fail, including PMCS-E2E-013 and PMCS-E2E-014 evidence. Earlier revision-fenced plans remain obsolete and non-authoritative.
- Latest Authoritative Investigation: `Round 4`

## Current Requirement And Design Basis

The reviewed current spine is: one pending tool-safe operation resolves the process-global strategy at operation time; a detached `WorkingContext` is transformed; framework validation rejects invalid head/message/tool/alias output before installation; `MemoryManager` installs and persists only an accepted complete context; and the next provider request renders the replacement. `structured-json` / `Structured JSON` is the sole production registration and invokes only the fixed built-in `autobyteus-memory-compactor`, preserving parent runtime/model fallback and truthful failure. Real tool execution, two sequential projection replacements, exact construction inputs/private retrieval limits, lifecycle failure, provider rendering, and schema-v4 superset direct use remain critical executable behavior.

The server exposes a registry-backed `{id,name}` catalog and a separate runtime-effective strategy ID. Absent/blank configuration reads as `structured-json` without writing; explicit unknown values remain explicit for recovery. The normal desktop user journey remains the actual product lifecycle: Node Manager opens or focuses one separate Electron window for the chosen node; window bootstrap binds it once; the Compaction card loads that node's catalog/effective settings; the card builds only changed valid fields and sequentially awaits the existing `ServerSettingsStore.updateServerSetting(key,value)` action. Each successful key persists and reloads authoritative settings without allowing shared mutation loading/error state to replace the loaded card. The first same-node failure stops later writes, retains failed/unsent drafts, exposes the concrete local error, and never claims rollback or whole-card success. Initial settings/effective-read failure is a separate manager-owned state with a localized accessible Retry that reuses the authoritative initial load and mounts the real card on recovery.

No Compaction write-session revision parameter, captured client, batch/patch DTO, confirmed/unconfirmed result, rebind classification, or previous-node presentation is allowed. Generic binding-aware catalog/settings reads and mobile-session safeguards remain separate existing behavior. The clean-cut removal and `Directly Usable — No Migration` persisted-data decision remain mandatory.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Context-to-context compaction, tool-safe continuation, next render | Preserved current behavior behind new boundary | REQ-PMCS-001-010, 022-024; AC-PMCS-001-006, 018-022 | Freshly run real tool lifecycle, sequential strategy, validator/failure, and provider suites. |
| Process-global strategy setting and operation-time reselection | Added/preserved | REQ-PMCS-019, 021; AC-PMCS-014, 017 | Re-run durable GraphQL `.env`/process/existing-runtime E2E and live HTTP. |
| Registry catalog and effective-ID GraphQL reads | Added | REQ-PMCS-025, 029; AC-PMCS-023, 028 | Re-run durable schema-level query/no-write scenario and live HTTP/browser reads. |
| Fixed built-in Memory Compactor | Changed | REQ-PMCS-026; AC-PMCS-024, 027 | Re-run fixed resolver, bootstrap, runner, and visible parent-fallback integration; check stale removed key is inert. |
| Strategy-first Compaction card | Changed | REQ-PMCS-027; AC-PMCS-023, 025-026, 028 | Re-run component/catalog/store suites and actual browser DOM/Apollo journey. |
| Simple node-window sequential save | Changed after CR-PMCS-009 | REQ-PMCS-030; AC-PMCS-029; UXJ-PMCS-007 | Re-run NodeManager/nodeStore/card coverage; browser proves full same-node save and fault-injected later-key stop while first real write remains. |
| Loaded-card mutation recovery | Fixed after PMCS-E2E-013 / CR-PMCS-010 | REQ-PMCS-030; AC-PMCS-029 | Real browser must prove card/drafts/error survive a later failure and retry sends only remaining keys. |
| Initial settings/effective-read recovery | Added after CR-PMCS-012 | REQ-PMCS-027; AC-PMCS-025-026 | Real browser faults the first settings read, proves localized accessible Retry, then successful authoritative card mount. |
| Narrow responsive settings composition | Fixed after PMCS-E2E-014 / CR-PMCS-011 | REQ-PMCS-027; UI/UX Responsive and Accessibility | Real 390x844 browser must prove usable navigation and full-width card/controls; desktop md row remains. |
| Compaction-specific write-fence/session state | Removed | REQ-PMCS-030; AC-PMCS-029 | Static checks must reject removed types/actions/rebind copy/tests; do not restore old coverage. |
| Schema-v4 superset restore and contracted next write | Preserved | REQ-PMCS-014; AC-PMCS-008 | Re-run physical restore/continue/write lifecycle test. |
| Electron package consumer | Indirectly affected | implementation handoff and repository distribution path | Build supported macOS package and inspect current web/server artifacts and removed symbols. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | strategy/resolver/validator/current algorithm/manager | extensive core unit/integration | external model output is deterministic-emulated | focused and broader repository execution |
| API / transport / contract | Yes | catalog/effective queries and existing setting mutation | resolver/service units and GraphQL E2E | actual built HTTP and browser Apollo transport | Live API + Browser |
| Frontend component / state | Yes | card/catalog/effective read/sequential save | joined ten-file current web suite | real DOM plus actual backend reloads | Browser |
| Browser integration / user journey | Yes | fixed-node window equivalent Settings -> Basics -> Compaction | component tests only | proxy, Apollo, actual inputs/save/reload | Browser |
| Authentication / session / permissions | No | local node settings auth unchanged | existing local architecture | none ticket-specific | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used in Electron | browser-equivalent source/tests | actual renderer/server join | Browser + package build |
| Desktop shell / Electron-specific integration | Bounded | existing `openNodeWindow` and one-window-per-node lifecycle; main shell source unchanged | NodeManager/nodeStore delegation tests; Electron compile/package | actual separate-window focus not directly launched | package integrity; no app launch unless evidence exposes shell risk |
| Process / lifecycle | Yes | process-global setting and restart persistence | durable GraphQL/runtime tests | built process and physical `.env` restart | Live API + Lifecycle |
| Persisted-data transition | Yes | v4 superset reader/current writer | physical restore integration | freshness only | repository lifecycle rerun |
| Worker / queue / distributed coordination | Bounded | visible child compactor run | server parent-fallback integration | true paid LLM event stream | deterministic real composition |
| External integration | Bounded | provider APIs unchanged | renderer/request payload suites | live provider network/model compliance | Not required; residual recorded |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies`
- Project type and runtime stack: pnpm 10 workspace, Node.js 22, TypeScript, Vitest, Fastify/TypeGraphQL, Nuxt 3, Electron 42, Prisma/SQLite, macOS ARM64.
- Conflicting, missing, or unclear project instructions: None. Server and web instructions require one-shot test runs. Browser development is the preferred proof for web-equivalent desktop behavior. Actual Electron execution remains last resort because no preload/IPC/window implementation changed.
- Required environment variables or secrets available: No secret is required. External model keys are not needed or printed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| root `README.md` and package manifests | workspace build/runtime | use workspace package scripts; no release/finalization actions |
| `autobyteus-server-ts/AGENTS.md`, `README.md` | server tests/live execution | one-shot Vitest; build then run `dist/app.js --data-dir <isolated> --host 127.0.0.1 --port <owned>` |
| `autobyteus-web/AGENTS.md`, `README.md` | Nuxt/browser/Electron | one-shot Nuxt Vitest; `pnpm dev` normal browser path; `pnpm build:electron:mac` supported package path |
| `autobyteus-web/nuxt.config.ts` | dev backend routing | set `BACKEND_NODE_BASE_URL`; Vite proxies `/graphql` and `/rest` |
| `autobyteus-web/package.json` | available harnesses | `playwright-core` installed; system Google Chrome available; no repository Playwright E2E command/harness |
| core/server/web Vitest configs | test runner setup | Node core, forked server/Prisma, happy-dom Nuxt component tests |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated built server | worktree root | build; temp `.env`; run `autobyteus-server-ts/dist/app.js` on owned loopback port | isolated DB/config/memory only | `/rest/health` and GraphQL | terminate recorded PID; remove temp data |
| Nuxt development frontend | `autobyteus-web` | `BACKEND_NODE_BASE_URL=<isolated> pnpm dev -- --host 127.0.0.1 --port <owned>` | owned port/process | HTTP page and semantic DOM | terminate recorded PID |
| Browser | Playwright Core + installed Chrome | headless isolated context | no user Chrome profile | DOM/network assertions | close browser/context |
| Electron package | `autobyteus-web` | `pnpm build:electron:mac` | generated ignored app/DMG/ZIP | build result and artifact inspection | no installed/running app touched |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Absent/default settings node | isolated server temp `.env` | seed only required server host and stale removed worker key | remove temp directory |
| Full browser save | edit ratio/override/log through real card | same isolated node; no user data | restart/cleanup temp node |
| Later-key failure | route-intercept only the second GraphQL mutation after allowing first real mutation | verifies UI sequencing; server remains isolated | clear route/context |
| Existing runtime reselection | durable GraphQL E2E fixture | temp FileMemoryStore and test-only registry ID | test teardown |
| Real tool lifecycle/current restore | committed temp fixtures | no network/user data | test teardown |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design persisted-data decision; implementation `Persisted Data Transition Check`; REQ-PMCS-014/026; AC-PMCS-008/024.
- Representative existing-data setup and required behavior: schema-v4 snapshot with current messages plus obsolete epoch/timestamp keys restores normally; the next ordinary turn writes the current contracted schema. A stale removed compactor-agent environment key remains an inert custom extra.
- Evidence planned: fresh physical restore/continue/write integration; live server started with stale removed key; package/source checks prove only fixed built-in launch authority.
- Migration-specific completion/recovery scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | schema catalog/effective default/no-write; mutation persists strategy and changes existing runtime's next operation | AC-PMCS-014, 017, 023, 028 | Still Valid | direct GraphQL schema/service/process/filesystem/runtime boundary | fresh whole-file run |
| `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | deterministic changed-key order, clean default, unknown/error/validation, full success, first/later failure and retry | AC-PMCS-023, 025-026, 028-029 | Still Valid | approved current same-node flow | fresh run; browser supplement |
| `autobyteus-web/components/settings/__tests__/ServerSettingsCompactionFailure.spec.ts` | real-Pinia joined later-key failure/remaining-key retry and initial read Retry recovery | AC-PMCS-025-026, 029 | Still Valid | directly targets CR-PMCS-010/012 with real store behavior | fresh run; browser recheck |
| `autobyteus-web/components/settings/__tests__/ServerSettingsManager.spec.ts` | distinct initial loading/error/Retry and loaded mutation state | AC-PMCS-025-026, 029 | Still Valid | manager ownership matches reviewed fix | fresh run |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | narrow stacked/full-width and md sidebar row contract | REQ-PMCS-027; AC-PMCS-026 | Still Valid | directly targets CR-PMCS-011 | fresh run; 390x844 browser recheck |
| `autobyteus-web/tests/stores/serverSettingsStore.test.ts` | generic reads plus one-key mutation/authoritative reload | AC-PMCS-029 | Still Valid | correct existing one-key authority | fresh run |
| `autobyteus-web/tests/stores/workingContextCompactionStrategyCatalogStore.test.ts` | catalog mapping/empty/retry/stale read invalidation | AC-PMCS-023, 025 | Still Valid | generic read invalidation remains approved | fresh run |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` and `stores/__tests__/nodeStore.spec.ts` | each selected node delegates to `openNodeWindow`; upsert opens node window | AC-PMCS-029 / DS-PMCS-007 | Still Valid | actual desktop journey entrypoint contract | fresh run |
| `autobyteus-server-ts/tests/integration/agent-execution/compaction/compaction-agent-parent-fallback.integration.test.ts` | real backend composition, fixed built-in fallback, visible run, compaction, next request | AC-PMCS-002, 011, 018, 027 | Still Valid | current fixed resolver composition | fresh run |
| fixed worker/service/catalog unit tests | exact built-in ID/fallback/failure and effective read/registry projection | AC-PMCS-023-024, 027-028 | Still Valid | direct owning boundaries | fresh server suite |
| `autobyteus-ts/tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts` | real registered tool -> result -> compaction -> complete render | AC-PMCS-002-003 | Still Valid | durable cross-boundary proof | fresh run |
| structured strategy/validator/executor suites | sequential projection, exact construction, durable effects, invalid-output failed-only semantics | AC-PMCS-001-006, 013-022 | Still Valid | direct current boundaries | fresh broader core run |
| `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts` | v4 superset restore and contracted next write | AC-PMCS-008 | Still Valid | physical lifecycle proof | fresh run |
| provider renderer/request suites | complete supported native tool history/payloads | AC-PMCS-002-003 | Still Valid | direct render adapters | fresh run |
| removed Compaction revision-fence/rebind save tests and old arbitrary worker setting test | obsolete rejected behavior | REQ-PMCS-026, 030; AC-PMCS-024, 029 | Stale / Remove (already removed) | architecture/code review explicitly reject these subjects | do not restore; static absence proof |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| removed Compaction save-session/rebind tests | desktop save owns expected revision/captured client/partial prior-node classification | real desktop uses a separate window per node and existing one-key action | REQ-PMCS-030; AC-PMCS-029; CR-PMCS-009 | NodeManager/nodeStore + current full/first/later same-node save tests | compatibility with rejected candidate is prohibited |
| removed arbitrary compactor-agent GraphQL scenario | arbitrary agent setting is predefined and redirects worker | current strategy uses fixed built-in only | REQ-PMCS-026; AC-PMCS-024, 027 | fixed resolver/runner/bootstrap and live/static inertness proof | subject no longer exists |

## Durable Coverage To Add

None. The previously added schema-level catalog/effective default/no-write scenario remains in the current reviewed GraphQL E2E file and closes the material API durability gap.

## Durable Coverage To Update

None planned. Current repository tests represent the approved Round 11 behavior.

## Durable Coverage To Remove

None in this stage; obsolete implementation-owned tests are already absent.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | one-shot Vitest over 38 mapped core memory/tool/restore files | `autobyteus-ts`; current worktree | PMCS-E2E-002/004/005/006/007, including real registered tool -> result -> compaction -> next provider request, two sequential compactions, validator/failure semantics, and schema-v4 physical restore/write | Pass — 38 files / 158 tests | `validation-evidence/round4-core.log` |
| 2 | one-shot Vitest over 8 server fixed-worker/settings/GraphQL files | `autobyteus-server-ts`; current worktree | PMCS-E2E-001/003/008/011, including catalog/effective default/no-write, persisted mutation, operation-time reselection, fixed built-in parent fallback, bootstrap, and runner | Pass — 8 files / 92 tests | `validation-evidence/round4-server.log` |
| 3 | one-shot Vitest over two provider request/renderer files | `autobyteus-ts`; current worktree | complete supported provider render after compaction/tool continuation | Pass — 2 files / 20 tests | `validation-evidence/round4-provider.log` |
| 4 | one-shot Vitest over ten joined settings/catalog/window web files | `autobyteus-web`; `NUXT_TEST=true` | PMCS-E2E-012/013/014/016, current real-Pinia failure/retry, initial Retry, responsive contract, NodeManager/node/window binding | Pass — 10 files / 84 tests | `validation-evidence/round4-web-targeted.log` |
| 5 | Electron preload/node registry contract Vitest | launched from `autobyteus-web` | bounded unchanged shell bridge/store contract | Pass — 2 files / 5 tests | `validation-evidence/round4-electron-contract.log` |
| 6 | core/server/web builds, server bootstrap smoke, boundary/localization guards and audit | package-specific documented commands | current production compilation, runtime dependency/bootstrap and `/settings` prerender integrity | Pass | `validation-evidence/round4-builds.log` |
| 7 | scoped diff/rejected-machinery/registration/responsive/initial-vs-local-error static checks | worktree root | PMCS-E2E-009/010 and source boundary invariants | Pass | `validation-evidence/round4-static.log` |

An accidentally over-broad `pnpm run test:nuxt -- ...` invocation ran the entire web suite rather than the intended file list. It produced 353 passed files, one skipped file, and four failing files (1,861 passed / 4 failed tests). The four assertions are invalid as ticket-gating evidence: all three involved source/test pairs are unchanged from base `fdb370d...`, and the zh-CN deprecated glossary string exists exactly in that base while this ticket changes only Compaction localization. This does not override the correctly invoked current-boundary ten-file pass, but is preserved rather than hidden. Evidence: `validation-evidence/round4-web.log` and `validation-evidence/round4-web-full-suite-validity.log`.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | all mapped core/server/web repository scenarios pass, including real tool compression/continuation, sequential compaction, fixed worker, GraphQL, restore and the three current rework journeys | live transport/UI freshness remains | execute isolated live journey |
| Changed-boundary execution directness | 96% | direct owner tests plus real runtime/GraphQL/real-Pinia joined tests execute the changed code | browser/Apollo boundary not yet rechecked | Live API + Browser |
| Cross-boundary integration realism and mock gap | 93% | real tool/runtime, physical store, GraphQL and joined frontend state are covered | actual browser Apollo/backend proxy join remains | Browser |
| Environment, configuration, identity, and fixture fidelity | 93% | current builds, server bootstrap, SQLite/temp fixtures and Electron contracts pass | physical isolated `.env` restart and fresh package remain | lifecycle/package |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | invalid output, runtime failure, later-key retry, initial Retry, schema restore, unknown/default and partial durable effects pass | real route faults and restart remain | browser route faults + lifecycle |
| User-surface, browser, and desktop-shell confidence | 88% | ten-file web pass, responsive DOM contract, shell contracts and production build pass | prior real-browser failures require direct confirmation; package is not yet rebuilt | browser/package |
| Durable regression coverage quality and relevance | 97% | current tests directly target CR-PMCS-010/011/012 and full core/API lifecycle | incidental unrelated baseline suite assertions remain stale | no ticket coverage change; preserve classification evidence |

- Overall post-repository confidence: `94.4%` (`661 / 7`).
- Calculation method: arithmetic mean of seven applicable categories.
- Every critical acceptance criterion directly proven: `No — the current browser/restart/package recheck is still required because PMCS-E2E-013/014 previously failed there.`
- Any applicable category below `90%`: `Yes — user-surface/browser/desktop-shell is 88%.`
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: actual Apollo/backend state transitions for first-read recovery and later-key retry, current narrow browser layout, physical restart, fresh package inclusion, plus approved non-transactional memory/settings effects, process-local convergence, provider session/native compaction, and external-model output.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API + Browser + Lifecycle + Project Desktop Validation`
- Specific confidence gap or residual risk addressed: actual GraphQL/physical `.env`, initial-read failure/Retry/recovery, fixed-node Compaction DOM/Apollo load and save, truthful later-key stop plus dirty retention/remaining-key retry after one real write, responsive 390x844 layout, restart persistence, and supported Electron package inclusion.
- Why the selected mode can materially improve confidence: repository frontend tests mock store/transport; browser plus isolated server exercises the real join. Package build proves the web/server changes ship together.
- Expected confidence after selected validation: at least 95% overall with no category below 90%.
- Browser-specific decision and rationale: Required for the changed web-equivalent desktop journey. Use semantic DOM/network assertions and supporting screenshots.
- If Not Required: N/A.
- If Blocked: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron 42 with Nuxt renderer and bundled server.
- Relevant README or development instructions: `autobyteus-web/README.md`, `AGENTS.md`, `package.json` and prepare-server/build scripts.
- Web-equivalent behavior: catalog/effective reads and same-node sequential Compaction save; validate in browser.
- Shell-specific or lifecycle behavior: Node Manager delegates to existing `openNodeWindow`; main-process window implementation is unchanged. Validate repository delegation tests, Electron compilation, and package integrity.
- Chosen validation approach and why it fits the project: browser plus supported macOS package build. Do not launch/install the desktop app unless package or repository evidence reveals a shell-specific uncertainty; actual launch could collide with the user's fixed embedded port/application state without adding direct changed-source evidence.
- Server/frontend setup when browser validation is used: isolated built server, Vite proxy, owned Nuxt port, isolated Chrome context.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven and confidence consequence: physical multi-window focus is not manually exercised; bounded residual because Electron main lifecycle is unchanged and direct delegation/package compile are covered.

## Live Environment And Fixture Plan

- Startup order and commands: use fresh built outputs; create isolated data `.env`; start built server with a clean environment; query default/no-write live API; restart with an explicit unknown strategy; start Nuxt with isolated backend; launch headless Chrome; fault the first settings read then Retry; perform full save; perform later-key fault/remaining-key retry; verify responsive desktop/narrow layouts; restart verification; package build/inspection.
- Environment choices: owned loopback ports, temp app data, stale removed worker key, no default user data, English locale, desktop and narrow viewports.
- Health / readiness checks: `/rest/health`, GraphQL catalog/effective query, Nuxt HTTP, semantic DOM.
- Seed data / fixtures: absent strategy/default controls; then full changed universal save; separate clean restart for fault scenario.
- Test identities/authentication/permissions/session: local unauthenticated development node and fresh browser context.
- Requirement-linked journeys: PMCS-E2E-008 live API; PMCS-E2E-012 full browser save; PMCS-E2E-013 later-key failure/dirty retention/remaining-key retry; PMCS-E2E-014 responsive/accessibility/node-window equivalent; PMCS-E2E-015 package integrity; PMCS-E2E-016 initial-read error/Retry/recovery.
- Evidence to capture: API JSON, `.env`, process logs, mutation order/count/payloads, DOM values/save busy/error/dirty state, screenshot, package hashes/symbol searches.
- Owned processes and temporary state to clean up: server/Nuxt PIDs, Chrome, ports, temp app data/profile.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PMCS-E2E-012 | Playwright Core with normal Nuxt dev and isolated built server | actual catalog/effective load and changed-key full save/reload | repository has no Playwright E2E harness; component tests own durability |
| PMCS-E2E-013 | browser route fault on second GraphQL mutation after first real success | stop remaining calls, earlier value persists, error/dirty state remains | deterministic component test already owns this failure; temporary probe adds transport realism |
| PMCS-E2E-014 | browser desktop/narrow viewports and semantic assertions | responsive/accessibility/browser-equivalent node-window surface | screenshot/viewport check is supplemental |
| PMCS-E2E-015 | Electron mac package build and artifact inspection | current server/web files included and rejected/obsolete symbols absent | generated platform artifact is not a source fixture |
| PMCS-E2E-016 | browser faults first `GetServerSettings`, then allows Retry | initial localized accessible recovery mounts the authoritative real card | joined durable tests own regression; browser adds transport realism |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| True multi-process setting convergence | explicitly out of scope | approved residual | none |
| Live paid compactor/model output | nondeterministic provider boundary unchanged; deterministic visible-run integration is stronger for architecture | small model-compliance residual | no gate |
| Provider-session reconciliation/native compaction | explicitly out of scope | approved residual | none |
| Actual installed Electron app/multi-window manual run | shell implementation unchanged; fixed port/user app collision risk; repository/package/browser evidence is proportionate | bounded focus/window residual | run only if current evidence exposes shell defect |
| Simultaneous independent human actions | outside authoritative one-window journey | bounded race | none |

## Prior Failure Recheck Plan

- `PMCS-E2E-013`: first real ratio write -> forced override rejection -> card remains -> local error visible -> override/log drafts remain -> Save enabled -> retry sends only override/log -> clean authoritative card.
- `PMCS-E2E-014`: 390x844 page stacks navigation/content, card remains at a usable near-full viewport width, labels/controls remain usable; 1440px preserves the desktop row and 256px navigation.
- `PMCS-E2E-016`: first real settings/effective query rejection -> visible localized Retry with accessible name -> retry succeeds -> real Compaction card shows authoritative strategy/ratio/override/log values.

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Source Review Round 11 and current requirements align on all three targeted journeys | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No additional API/E2E-authored change`; the current reviewed GraphQL E2E file already contains the catalog/effective no-write scenario. The three implementation-owned Round 11 frontend rework test paths are identified in the execution report for the separate proportional review.
- Post-repository confidence: `94.4%`; broader validation remains required because user-surface/browser confidence is 88%.
- Broader validation decision: `Required — Live API + Browser + Lifecycle + Project Desktop Validation`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 4 supersedes the Round 3 failure outcome for planning purposes but preserves its scenario IDs and evidence. No test or validation may reintroduce rejected write-session behavior.

## Broader Validation Execution Outcome

- Execution status: `Completed — Pass`
- Canonical execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/pluggable-memory-compaction-strategies/tickets/done/pluggable-memory-compaction-strategies/api-e2e-execution-coverage-report.md`
- Final confidence: `98.3%`; no category below 90%; every critical acceptance criterion directly proven.
- PMCS-E2E-013: `Pass` — the first ratio write persisted, the forced override failure left the loaded card/local error and failed/unsent drafts intact, and retry sent only override/log.
- PMCS-E2E-014: `Pass` — desktop remains a row with 256px navigation; 390x844 stacks at full content width with a 318px card, 268px input, and no horizontal overflow.
- PMCS-E2E-016: `Pass` — first real settings-read fault showed localized accessible Retry; retry mounted authoritative unknown/80/blank/false values.
- Live API/lifecycle: `Pass` — default no-write, explicit unknown, physical sequential writes and final restart persistence all matched; stale removed worker key was inert.
- Supported package: `Pass` — fresh macOS ARM64 app/DMG/ZIP built; compiled/deployed/packaged server hashes matched; required renderer/main/preload and current authorities were present; rejected machinery was absent.
- Cleanup: `Pass` — owned processes stopped, ports freed, browser closed, temporary harness/state and isolated app data removed. Ignored package artifacts were retained as evidence without installing or launching the app.
- Durable-test handoff: no API/E2E-authored durable test change. The current implementation-owned `ServerSettingsCompactionFailure.spec.ts`, `ServerSettingsManager.spec.ts`, and `pages/__tests__/settings.spec.ts` are the proportional review paths.
