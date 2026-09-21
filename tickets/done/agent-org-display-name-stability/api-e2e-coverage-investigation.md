# API/E2E Coverage Investigation — Agent Org Display-Name Stability

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/requirements-doc.md` (`SR-004` approved baseline; package `SR-005`)
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/investigation-notes.md`
- Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/solution-revision-record.md`
- Design Spec (required on every route): `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/design-spec.md`
- Supplemental Task Artifacts: current-state screenshots and implementation render evidence under `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/evidence/`; evidence only, no behavior-defining supplement
- Design Review Report: `N/A — not applicable` (independent architecture review was not selected for the `Medium`/`Low` package)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/implementation-revision-record.md` (`IR-002`)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-002` (`M-014` localization-literal package gate)
- API/E2E Revision Record (created after the first completed result): `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/api-e2e-revision-record.md` (`API-REV-001`)
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2 — focused direct-route Local Fix revalidation
- Trigger: Implementation Engineer handoff for `IR-002`, commit `2761befdb`, resolving Delivery `DR-002` / `M-014`
- Prior Investigation Reviewed: `Yes` — round 1 investigation/report, `API-REV-001` Pass / 95.0%, ledger, and the Delivery `DR-002` failure evidence were read before selecting this delta plan
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved behavior makes local role identity authoritative on Agent Org browsing surfaces. List and direct-detail labels must be the enclosing Org member's casing-preserving, separator-humanized `memberName`; Team coordinator and nested endpoint labels must be Team-local roles from the admitted endpoint catalog. Reference definition names and opaque refs must never occupy those label positions. The list must make zero per-member exact Agent/Team reads. Reload, reference completion/failure, route retirement, and backend-binding retirement must not rename an unchanged membership. Read-only detail may make one aggregate endpoint-catalog read only when mounted Team topology is needed. Create/edit, Org-return Team detail, run configuration, and launch readiness must retain the existing exact ID/scope/owner/Team-child validator. Search, list/detail navigation, Run, Team View/Back, edit/delete, handoffs, ordering/types, ownership policy, persistence, and package bytes remain unchanged. Persisted data is `Not Affected`; no compatibility path or migration is permitted.

### Round 2 Local Fix Delta

Delivery `DR-002` did not produce or launch an Electron package because the mandatory localization-literal audit stopped on the constructed English error `Incomplete Agent Org endpoint catalog response.` (`M-014`). `IR-002` changes only the incomplete-but-structurally-valid detail catalog branch: after the existing stale-request retirement guard, it sets the existing localized `detailTopologyUnavailable` state directly rather than throwing a hard-coded message into the common catch. The complete-catalog, transport-error, stale-response, list, authoring, launch, API, persistence, and shell boundaries are unchanged. Focused revalidation must therefore recheck the audit first, prove both transport-error and incomplete-catalog browser states through `AORG-E2E-005`, rerun the direct detail lifecycle suite, and confirm the production web build. Full Electron packaging/launch remains Delivery-owned after API/E2E returns.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / list membership labels | Changed | `REQ-001`, `REQ-003`, `REQ-004`; `DS-001`, `DS-004`; `IR-001` | Prove first-frame and settled visible/accessible labels use roles; prove Reload/search remain; prove browsing issues no exact reference operations. |
| Shallow list display-name hydration, chip watcher, refresh token | Removed | Design removal plan; implementation legacy-removal check | Former exact-name assertions are stale. Durable replacement must fail if exact reference operations reappear. |
| `BEH-002` / direct detail labels | Changed | `REQ-002`, `REQ-003`, `REQ-005`; `DS-002` | Prove direct rows render before topology settles and never show refs/definition names. |
| Team coordinator/nested endpoint presentation | Changed | `REQ-002`, `REQ-005`; `DS-003` | Prove one live aggregate catalog produces Team-local coordinator/handoff roles and mounted address separation. |
| Detail topology pending/failure/stale lifecycle | Changed | `REQ-003`, `REQ-005`; `DS-003` | Prove loading/unavailable output is truthful and ID-free; component coverage must prove late route/binding responses retire. |
| `IR-002` incomplete detail catalog localization branch | Changed | Delivery `DR-002` / `M-014`; `IR-002` | Recheck localization guards/audit, the new focused component assertion, and a durable browser interception that returns live response data with incomplete topology while retaining role labels and hiding identities. |
| Full exact reference validation and authoring/launch consumers | Preserved | `REQ-005`, `REQ-006`; `DS-005`; implementation handoff | Re-run full-reader, authoring, Team-return, run-config, launch, and action regressions; in browser, prove edit is the only Agent Org experience route that activates authoring catalog/reference operations. |
| API schema, backend resolver, persistence, ownership, deployment | Preserved | `SR-005`; design/implementation transition checks | No backend source change. Use live GraphQL/admission/persisted packages to prove the reused contract, not a schema migration. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Existing admission and endpoint-catalog projection reused unchanged | Existing server suites and frontend adapter contract specs | Actual persisted definition topology may differ from controlled component fixtures | Live API through isolated built server |
| API / transport / contract | Yes, consumer only | New frontend adapter calls existing `agentOrgEndpointCatalog(id)` with `network-only` | Adapter spec validates operation, variables, DTO rejection | Mocked Apollo does not prove live schema/admission/serialization | Live GraphQL plus browser network ledger |
| Frontend component / state | Yes | Chips are transport-free; detail retains membership; route-specific watchers split | Focused Vitest component suites | Real app shell/store/router timing and DOM could diverge | Browser |
| Browser integration / user journey | Yes | `/agent-orgs` list/detail/edit navigation, reload/search, live Apollo traffic | Implementation-only intercepted Chromium evidence | No real backend or persisted definitions in upstream browser run | Browser against real isolated backend |
| Authentication / session / permissions | No | Local catalog surfaces are unauthenticated in the documented local runtime | Project runtime contract | None material to this change | None |
| Desktop renderer / web-equivalent UI | Yes | Electron renderer shares Nuxt route and GraphQL behavior | Browser-capable production components | Shell itself is not involved | Browser development path preferred |
| Desktop shell / Electron-specific integration | No | No preload, IPC, window, packaging, or updater change | Source classification and successful Nuxt build | None material | None; actual desktop would not improve scoped evidence |
| Process / lifecycle | Yes, view-local | Reload, route changes, backend-binding generation, stale response retirement | Component deferred-response coverage | Live request timing and navigation remain | Browser with delayed live response; component binding test |
| Persisted-data transition | No | Existing current definition package readers only | `Not Affected` design/implementation checks | Need representative current packages through normal reader | Isolated real server data root |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | No | None | N/A | None | None |

## Project Execution Discovery

- Assigned task worktree: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability`
- Project type and runtime stack: pnpm monorepo; Nuxt 3/Vue/Pinia/Apollo frontend; Fastify/TypeGraphQL Node backend; Vitest; Playwright Core with system Chromium
- Conflicting, missing, or unclear project instructions: none material. Root `pnpm dev` is the canonical persistent development stack; durable browser probes may instead use an owned temporary data root and free ports, matching existing self-starting project probe patterns and avoiding shared development state.
- Required environment variables or secrets available: `N/A` — local definition catalog/list/detail requires no provider credentials or login

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Closest frontend instructions | Colocated tests; `pnpm test:nuxt ... --run`; never use watch mode for validation. |
| `autobyteus-web/README.md` | Web dev/test/desktop strategy | Browser dev uses `BACKEND_NODE_BASE_URL`; browser preferred for web-equivalent Electron UI; actual packaged Electron reserved for shell-specific behavior. |
| `autobyteus-server-ts/AGENTS.md` | Closest backend instructions | Use `vitest run ... --no-watch` for focused server checks. |
| `README.md`, “Local full-stack development” | Canonical full-stack runtime | Built backend at loopback plus Nuxt; local catalog needs no credentials; deterministic tests must own isolated state. |
| `autobyteus-server-ts/README.md`, “Tests” and “Build and run” | Server environment contract | Built server accepts `--data-dir`, host, port; SQLite/database and application state can live under an owned root. |
| Root and web `package.json` | Script authority | Root `test:e2e`; web `test:nuxt`, `build`, and existing self-starting `tests/e2e/*-probe.mjs` patterns. |
| `autobyteus-web/tests/e2e/token-statistics-ui-probe.mjs` | Repository precedent | Select free ports; build server; create temp data root; migrate DB; start owned backend/Nuxt; capture Playwright GraphQL/DOM evidence; terminate process groups; delete root. |
| Agent/Team/Org provider/config sources | Fixture contract | Current markdown + JSON definition packages under `<data-root>/{agents,agent-teams,agent-orgs}` are normal persisted inputs; exact roles/refs/scopes are admitted before API projection. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Shared/contracts + web generated config | worktree | `corepack pnpm -C autobyteus-web exec nuxi prepare` and relevant package build if required | Existing dependencies already installed | command exit 0 | No process; remove only generated untracked outputs if created by this round |
| Backend | worktree/server | durable probe builds server unless `--skip-server-build`, migrates owned SQLite, starts `node dist/app.js --data-dir <owned>` | Free loopback port; temp root; current persisted definition fixture | `/rest/health` 2xx | Signal owned detached process group, verify exit |
| Frontend | `autobyteus-web` | `corepack pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL=<owned backend>` | Free loopback port; no user `.env` | target route returns 2xx | Signal owned detached process group, verify exit |
| Browser | probe | Playwright Core Chromium | system `/usr/bin/chromium` if present; isolated contexts/local storage | page/DOM assertions | close contexts/browser |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Direct Agent whose definition name differs from Org role | Current `agent.md` + `agent-config.json` package | Write only below probe-owned temp data root | Delete owned root after run; retain fixture description/result JSON |
| Shared Team with Team-local coordinator role differing from Agent definition name | Current Team and Team-local Agent package formats | Exact shared/Team-local refs; admitted through real service | Delete owned root |
| Two Orgs with distinct mounted roles/coordinators | Current Org package format | Enables real route/stale response checks; no user catalog mutation | Delete owned root |
| English and Simplified Chinese browser state | Localization preference in isolated browser context | No account/session | Context close |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- References: `design-spec.md`, “Persisted Data / State Transition Decision”; `implementation-handoff.md`, “Persisted Data Transition Check”
- Representative existing-data setup and required behavior: current-format Agent, Team, Team-local Agent, and Org packages are read unchanged from a probe-owned data root; Org roles/ref/type/scope and Team coordinator/nodes must project through normal admission/API into the frontend.
- Evidence planned: before/after fixture tree hashes; live `GetAgentOrgDefinitions` and `GetAgentOrgEndpointCatalog` responses; browser list/detail assertions; no migration/version fallback.
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `components/agentOrgs/__tests__/AgentOrgCatalogNames.spec.ts` | Stable role/aria labels, zero exact/catalog queries, Reload/search/actions, refreshed memberName, localized fallback | AC-001, AC-003, AC-005; DS-001/004 | Still Valid | Assertions match approved `memberName` policy | Execute narrowly and in affected component set |
| `components/agentOrgs/__tests__/AgentOrgDetailRoleLabels.spec.ts` | Direct roles during deferred aggregate topology, coordinator role, failure, route/binding stale retirement, no-Team no-query | AC-002–004; DS-002/003 | Still Valid | Direct deferred state and lifecycle assertions are requirement-linked | Execute narrowly; supplement with live browser/backend |
| `services/agentOrgDefinition/__tests__/agentOrgEndpointCatalog.spec.ts` | Existing operation, `network-only`, typed response rejection, request isolation | AC-002–004; DS-003 | Still Valid | Adapter changed and uses mocked Apollo appropriately | Execute narrowly |
| `utils/collaboration/__tests__/memberRoleLabel.spec.ts` | Separator runs, trimming, case preservation, unusable input | AC-001–003; QR-001 | Still Valid | Pure boundary exact policy | Execute narrowly |
| `services/agentOrgDefinition/__tests__/agentOrgDefinitionReferences.spec.ts` | Full exact ID/scope/owner/Team-child validation | AC-004/005; DS-005 | Still Valid | Retained structural service and updated absence of shallow branch | Execute broader regression |
| `AgentOrgExperience.spec.ts`, `AgentOrgOwnedAuthoring.spec.ts`, `AgentOrgExperienceApolloEdit.spec.ts`, `AgentOrgAuthoringActions.spec.ts` | list/detail/create/edit/action/authored-owned flows | AC-004/005; DS-005 | Still Valid | Preserved path uses production components with controlled stores/transport | Execute broader regression |
| Agent Team Org-return specs and workspace Agent Org run-config/launch specs | Team View/Back, exact refs, launch configuration consumers | AC-004/005; REQ-006 | Still Valid | Explicit preserved consumers | Execute focused affected regression |
| Historical definition-name substitution assertions previously in `AgentOrgCatalogNames.spec.ts` and shallow-loader specs | Pending role then exact definition name | Superseded by SR-004 and removal plan | Stale / Remove (already removed by implementation) | Git diff shows obsolete assertions/service branch deleted | Record replacement; no API-owned additional removal |
| Existing `autobyteus-web/tests/e2e/*.mjs` | Other UI journeys | No direct Agent Org label scenario | Out Of Scope | Search found no Agent Org role-label probe | Add one narrow durable self-starting probe |
| Server definition/admission suites | Current package readers, identity/scope/owner/topology | AC-004/005 preserved | Still Valid but backend unchanged | Existing boundary authority | Do not run entire backend suite; live probe exercises admitted packages and focused frontend structural suite covers client validation |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior version of `AgentOrgCatalogNames.spec.ts` | Role is pending fallback; exact definition name is settled catalog label; Reload triggers reread | The approved identity is now Org-local role and the extra lookup is forbidden | SR-004; REQ-001/003/004; design removal plan | Current stable-role, zero-query cases in the same file plus planned browser network ledger | N/A |
| Removed shallow cases in `agentOrgDefinitionReferences.spec.ts` | `loadAgentOrgMemberReferences` resolves display names | Display hydration boundary is deliberately deleted | DS-001/004; implementation legacy-removal check | Presentational chip tests plus full-reader preservation tests | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `AORG-E2E-003` | Real persisted packages → admission → live GraphQL → list/search/Reload visible and accessible role labels; zero browse exact reads | REQ-001/003/004/006; AC-001/003/005; DS-001/004 | `autobyteus-web/tests/e2e/agent-org-role-labels-probe.mjs` and package script | Existing browser evidence intercepted GraphQL and cannot detect real transport/schema/admission regressions. |
| `AORG-E2E-004` | Live delayed endpoint catalog; direct roles before settlement; Team-local coordinator/handoff after settlement; no refs/definition names | REQ-002/003/005; AC-002/003/005; DS-002/003 | Same durable probe | Exercises actual cross-boundary timing and endpoint projection. |
| `AORG-E2E-005` | Inject endpoint failure over real page; direct roles retained, localized unavailable alert, no raw ID | REQ-003/005; AC-002/004 | Same durable probe | Browser-level failure presentation is material and currently only component-covered. |
| `AORG-E2E-006` | Route retirement and authoring separation: stale catalog cannot leak; edit activates exact structural reads and retains definition names in selectors | REQ-003/005/006; AC-003–005; DS-003/005 | Same durable probe | Proves mixed list/detail/authoring lifecycle separation in the production router/store. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `AORG-E2E-007` | `autobyteus-web/package.json`, `autobyteus-web/README.md` E2E catalog | Add discoverable script and short setup/evidence description | Project durable-execution convention | No production behavior change |
| `AORG-E2E-005` / round 2 | `autobyteus-web/tests/e2e/agent-org-role-labels-probe.mjs` failure scenario | Retain the existing transport-error state and add a second page that starts from the real endpoint response, removes required topology, and proves the localized ID-free unavailable state | `IR-002`; `DR-002` / `M-014`; REQ-003/005; AC-002/004 | Directly exercises the changed incomplete-catalog control-flow rather than treating the new unit assertion as sufficient authority |

## Durable Coverage To Remove

No API/E2E-owned removal is planned. Obsolete assertions were already removed in implementation revision `IR-001` and will be recorded as upstream coverage replacement.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `corepack pnpm -C autobyteus-web test:nuxt` on the 4 formatter/adapter/catalog/detail files with `--run --reporter=verbose` | worktree | `AORG-E2E-001`: direct changed units/components and deferred lifecycle | Pass — 4 files / 19 tests | `evidence/api-e2e/repository-focused.log` |
| 2 | Same runner on 12 affected authoring/actions/full-reference/Team-return/run-config/launch/store/localization files | worktree | `AORG-E2E-002`: preserved exact validation and supported consumers | Pass — 12 files / 90 tests | `evidence/api-e2e/repository-regression.log` |
| 3 | `corepack pnpm -C autobyteus-web test:e2e:agent-org-role-labels --skip-server-build --scenario <list|detail|failure|lifecycle>` | worktree / owned temp backend+Nuxt+Chromium | `AORG-E2E-003`–`006`: live transport, persisted definitions, list/detail/failure/stale/authoring | Pass — all 4 live scenarios | `evidence/api-e2e/browser/*/agent-org-role-labels-result.json` |
| 4 | `corepack pnpm -C autobyteus-web build`; probe syntax/manifest, successful built-server evidence, `git diff --check`, status/cleanup audit | worktree | `AORG-E2E-007`: integration/build and repository hygiene | Pass — 16 routes prerendered; audit clean | `evidence/api-e2e/build.log`, `evidence/api-e2e/final-audit.log`, `evidence/api-e2e/browser/list/server-build.log` |

### Round 2 Focused Revalidation Plan And Results

| Order | Reused Case ID | Command / Entry Point | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `AORG-E2E-007` | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | Recheck Delivery `M-014` first; unresolved product literal count must be zero | Pass — all guards; zero unresolved literals | `evidence/api-e2e/round-2/localization-guards.log` |
| 2 | `AORG-E2E-001` | Focused formatter/adapter/list/detail Nuxt suite, including the new incomplete catalog assertion | Direct component/adapter regression for `IR-002` and unchanged role/lifecycle behavior | Pass — 4 files / 20 tests | `evidence/api-e2e/round-2/repository-focused.log` |
| 3 | `AORG-E2E-005` | Updated durable failure probe with real-backend transport-error and incomplete-catalog pages | Browser-localized failure semantics, ID/definition absence, direct roles, zero exact reads | Pass — both pages; 0 exact reads; clean owned cleanup | `evidence/api-e2e/round-2/browser/failure/agent-org-role-labels-result.json` |
| 4 | `AORG-E2E-007` | Current Nuxt production build, probe syntax, diff/status/generated-output audit | Current source compiles and remains repository-clean; Electron packaging intentionally returns to Delivery | Pass — 16 routes; clean final audit | `evidence/api-e2e/round-2/build.log`, `final-audit.log` |

Round 2 begins from the prior authoritative `API-REV-001` Pass / 95.0%, but that confidence is not automatically carried over as a current result. The Local Fix affects one already-covered failure branch, so no untouched list/success/lifecycle case is rerun in the live browser unless focused evidence exposes a regression.

## Test-Case Ledger Plan

- Ledger required: `Yes` — multiple independently meaningful repository, live API/browser, failure, lifecycle, and build cases plus long-running server build/startup create interruption risk.
- Canonical ledger path: `/home/autobyteus/workspace/.codex/worktrees/agent-org-display-name-stability/tickets/in-progress/agent-org-display-name-stability/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one meaningful coverage group or live journey, not each assertion

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| `AORG-E2E-001` | Narrow changed formatter/adapter/list/detail lifecycle coverage | REQ-001–005 / AC-001–004 | Vitest unit/component | focused `test:nuxt ... --run` | 1 | exact file/test counts and log |
| `AORG-E2E-002` | Preserved authoring, exact reference validation, Team return, actions, run config/launch | REQ-005/006 / AC-004/005 | Vitest affected regression | broader focused file list | 2 | exact file/test counts and log |
| `AORG-E2E-003` | Live list first/settled/Reload/search/accessibility/network ledger | REQ-001/003/004/006 / AC-001/003/005 | Real Chromium→Nuxt→GraphQL→persisted packages | durable probe | 3 | JSON, screenshots, operation ledger, fixture hashes |
| `AORG-E2E-004` | Live detail delayed topology, Team-local roles/handoffs/actions | REQ-002/003/005/006 / AC-002/003/005 | Real browser/live API | durable probe | 4 | DOM snapshots, real endpoint response, screenshot |
| `AORG-E2E-005` | Detail endpoint failure remains role-based and ID-free | REQ-003/005 / AC-002/004 | Browser failure injection over live stack | durable probe | 5 | alert/DOM/network evidence |
| `AORG-E2E-006` | Late route result retirement and authoring-only exact reads/selectors | REQ-003/005/006 / AC-003–005 | Production router/store/browser | durable probe | 6 | operation/route/DOM evidence |
| `AORG-E2E-007` | Production build and final hygiene | REQ-006 / AC-005 | Nuxt production build, diff guard | build/audit commands | 7 | logs and exit status |

### Investigation Plan Refinement From Initial Execution

The live list case asserts that the admitted Org card retains an enabled Run control, while the already-passing production component test proves the exact `/workspace` router payload. A full live Run navigation is not part of this role-label boundary because the global workspace middleware requires an unrelated configured workspace and returned the isolated no-workspace fixture to the catalog. No acceptance criterion requires provider/runtime activation for this presentation change.

### Execution-Driven Probe Refinements

Initial live attempts exposed only API/E2E-owned harness assumptions: Corepack shims were needed for a nested bare `pnpm`; fixture assertions needed scoping away from server-managed built-ins; the Run navigation was narrowed away from unrelated no-workspace middleware while retaining its enabled control and existing exact-router component proof; fixture immutability was narrowed to the pre-start fixture set; and semantic locators were corrected for a glyph-bearing accessible name and legitimate duplicate authoring identity text. Each checkpoint and preserved result is recorded in the ledger. None contradicted the implementation or approved behavior.

### Round 1 Historical Post-Repository Confidence Scorecard

This checkpoint reflects `AORG-E2E-001` and `AORG-E2E-002` after the durable probe was added but before its live browser/API execution. It intentionally does not award live-boundary confidence from unexecuted code.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 109 requirement-linked unit/component/regression assertions passed | Critical live catalog/browser paths were still indirect or mocked | Execute persisted-package live browser journeys |
| Changed-boundary execution directness | 95% | Formatter, adapter, list chips, detail topology, stale-binding, and structural readers ran directly | Production router/transport sequence remained unexecuted | Live Chromium through Nuxt/GraphQL |
| Cross-boundary integration realism and mock gap | 75% | Component/store integration was substantial | Apollo, backend admission, and serialization were mocked | Real built backend and GraphQL proxy |
| Environment, configuration, identity, and fixture fidelity | 75% | Tests used representative DTOs and roles | No current packages had yet crossed normal server readers | Isolated current-format persisted fixture |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Deferred settlement, failure, route/binding retirement, exact-validation failures all passed | Failure injection and late response were not yet observed in a browser | Browser failure/lifecycle cases |
| User-surface, browser, and desktop-shell confidence | 75% | Production components and accessible output were component-tested; shell was unchanged | No independent browser execution yet | Chromium on the web-equivalent renderer path |
| Durable regression coverage quality and relevance | 90% | Existing focused coverage was current and the durable live probe was requirement-linked and syntactically valid | New durable probe had not yet produced a passing execution | Execute each probe scenario and build |

- Overall post-repository confidence: `84.3%`
- Calculation method: simple average of seven applicable categories: `(90 + 95 + 75 + 75 + 90 + 75 + 90) / 7`
- Every critical acceptance criterion directly proven: `No` — real catalog transport/admission for AC-002 and browser lifecycle/network behavior for AC-003/005 still required broader execution
- Any applicable category below `90%`: `Yes` — cross-boundary integration realism; environment/fixture fidelity; user-surface/browser confidence
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real GraphQL serialization/admission, current persisted packages, browser first/settled state, app-shell operation selection, and live route/failure lifecycle were not yet independently exercised.

### Round 1 Historical Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` plus live API/process evidence
- Specific gap: repository/component tests mock Apollo/store boundaries; upstream Chromium intercepted GraphQL. Real endpoint catalog serialization/admission, app-shell operation selection, and persisted current-format definitions remain unproven.
- Why selected mode improves confidence: an isolated built backend, Nuxt proxy, normal persisted definition readers, and Chromium exercise every material changed boundary without touching user state or invoking provider/runtime work.
- Expected confidence: at least 95%, with no category below 90%, if all critical scenarios pass.
- Browser-specific rationale: this is web-equivalent renderer UI; browser is the project-preferred surface. Electron shell behavior is unchanged and actual desktop execution would add cost without closing a material gap.

## Post-Repository Confidence Scorecard

This round-2 checkpoint follows the three mandatory localization/boundary guards and the direct four-file suite. It preserves prior live evidence only for untouched paths and does not treat it as proof of the new incomplete-catalog branch.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Zero unresolved literals and 20 direct formatter/adapter/list/detail assertions, including the new localized incomplete response | Browser output for the new branch is not yet observed | Targeted failure browser scenario |
| Changed-boundary execution directness | 95% | The exact `IR-002` branch executed in the component test; complete, error, incomplete, stale, and no-Team cases passed | No production-router browser entry into incomplete state yet | Chromium incomplete-response page |
| Cross-boundary integration realism and mock gap | 90% | Prior real backend/Nuxt/GraphQL evidence remains valid for unchanged catalog success/error boundaries | New incomplete response is only mocked in Vitest | Alter a response fetched from the live endpoint |
| Environment, configuration, identity, and fixture fidelity | 90% | Prior isolated current-format fixture remains current and source contracts are unchanged | Current `IR-002` source has not yet run in that environment | Reuse durable full-stack probe |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Direct tests cover transport failure, incomplete response, stale route/binding, and direct-only detail | New incomplete state lacks browser evidence | Run transport-error plus incomplete browser pages |
| User-surface, browser, and desktop-shell confidence | 90% | Prior Chromium directly proved the unchanged renderer; the new component DOM shows role labels and localized alert | Current branch not yet browser-rendered; package remains Delivery-owned | Targeted Chromium; Delivery retries Electron build |
| Durable regression coverage quality and relevance | 90% | Existing self-starting probe is valid and all prior scenarios passed | Failure scenario currently covers only GraphQL error | Update and execute `AORG-E2E-005` |

- Overall post-repository confidence: `91.4%`
- Calculation method: simple average of `(95 + 95 + 90 + 90 + 90 + 90 + 90) / 7`
- Every critical acceptance criterion directly proven: `Yes` at the focused component/API boundary; browser directness for the changed failure branch remains the confidence gap
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: the changed incomplete-catalog branch has not yet been exercised through the real app shell/router/GraphQL client, and the durable failure probe does not yet protect it.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: targeted `Browser` plus live API/process evidence
- Specific confidence gap: the round-1 durable failure probe injects a GraphQL transport error and therefore does not execute `IR-002`'s incomplete-but-structurally-valid response branch.
- Why selected mode improves confidence: modifying a response obtained from the real endpoint retains real admission/transport shape while directly entering the changed branch in the production router/component.
- Expected confidence: restore at least 95%, with no category below 90%, if the audit, focused suite, targeted browser case, and production build pass.
- Browser-specific rationale: the delta is web-equivalent renderer control flow. Actual Electron packaging is not needed to prove it and is explicitly retained by Delivery after revalidation.
- Execution result: `Pass` — the updated durable failure scenario exercised both the existing transport-error state and the `IR-002` incomplete-catalog state against the live stack; final confidence returned to 95.0%.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer
- Relevant instructions: `autobyteus-web/README.md`, “Server Modes”, “Development”, and “Packaged Electron E2E Launches”
- Web-equivalent behavior: all changed routes/components/Apollo requests/accessible labels
- Shell-specific behavior: none changed (no IPC/preload/window/packaging/lifecycle boundary)
- Chosen validation: real browser against isolated backend/Nuxt
- Effect on any already-running desktop application: `None`
- Behavior not directly proven: Electron shell rendering itself; no confidence deduction below target because no changed shell dependency exists.

## Live Environment And Fixture Plan

- Startup: build the current server/runtime dependencies; create temp root and migrate owned SQLite; write current-format definition packages; start built backend on a free loopback port; start Nuxt with `BACKEND_NODE_BASE_URL` on another free port; start isolated Chromium.
- Environment: `APP_ENV=development`, owned `DATABASE_URL` and app-data paths, English isolated browser contexts, UTC, system Chromium.
- Readiness: backend `/rest/health`, frontend route 2xx, admitted Org card visible.
- Fixtures: reuse the round-1 two-Agent/two-Team/two-Org catalog; the Alpha catalog must contain required live source topology before the test removes it. No provider credentials or activation.
- Journeys: one GraphQL-error detail and one incomplete-catalog detail derived from the real endpoint response; both must retain direct role labels, expose no refs/definition names, render the existing localized alert, make one aggregate request and zero exact reads.
- Evidence: terminal result JSON with GraphQL requests/responses, screenshots for both failure pages, server/frontend/build logs, definition hashes, and process cleanup.
- Cleanup: close contexts/browser; stop only owned detached process groups; remove owned temp data root; retain non-secret ticket evidence.

## Temporary Executable Validation Plan

None. The material browser/live boundary belongs in durable repository coverage and will be added as one project-style probe.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual Electron shell/packaged artifact | No changed shell boundary; browser directly exercises shared renderer and transport behavior | Negligible scoped risk | None unless browser exposes shell-only discrepancy |
| Provider-backed Agent/Team execution after Run | Labels/reference reads do not change provider runtime; launch readiness is covered by focused client tests | Low and out of scope | None |
| Production/user persisted data | Safety: use isolated current-format representative packages | Finite fixture/platform risk only | Report as residual, not blocker |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Approved artifacts fully decide label authority and structural-reader boundary | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update the existing durable `AORG-E2E-005` failure scenario for incomplete-catalog coverage; remove none
- Post-repository confidence: `91.4%`
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: round 2 completed: audit, focused tests, targeted live browser evidence, and production build passed. `API-REV-002` and the current execution report are authoritative; Delivery retains the Electron package/launch retry.
