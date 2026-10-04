# API/E2E Coverage Investigation

## Investigation Meta / upstream authority
Round 1; trigger Implementation Complete IR-001; approved SR-001/AP-001 and SR-002 design. No prior API result inferred.
- requirements-doc: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/requirements-doc.md
- investigation-notes: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/investigation-notes.md
- solution-revision-record: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/solution-revision-record.md
- design-spec: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/design-spec.md
- analysis-result: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/analysis-result.md
- implementation-handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/implementation-handoff.md
- implementation-revision-record: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/implementation-revision-record.md
- Supplemental screenshot: /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_fc29bf04d2dd4d5e97eaecca7ea57653/solution_designer_4d70731a76584fceaf1bc0632d0493f8/context_files/ctx_78a7d24a8574__image.png (current-state only).
- Architecture/source review reports and revision records, Product supplements, delivery/rework: N/A — not applicable.
- Current API revision: N/A (pending first result). Canonical ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-test-case-ledger.md.

## Routing Classification
Small / Low, confirmed by unchanged single metadata owner and two-file upstream code diff. Direct Low-Risk; successful route subject to get_handoff_rules. Test-code review: Not Required — direct low-risk route.

## Current Requirement And Design Basis / scenarios
SCN-001: desktop user finds Projects directly after Agent Orgs, then opens it; optional Applications remains after Projects. SCN-002: unavailable Projects omitted. REQ-001/002 and AC-001–004 require exact remaining order, existing label/folder icon/routes/active state, expanded and compact agreement. Additional real-use variant: narrow desktop strip opens a transient drawer rather than immediately navigating; fitting collapsed desktop strip redocks and navigates. No contrived scenarios tested.
BEH-001 Changed: shared metadata order. BEH-002 Preserved: capability/mobile filter. Routes/metadata/consumer interactions preserved.

## Changed Surface And Boundary Classification
| Boundary | Affected / risk | Evidence and gap |
| --- | --- | --- |
| Frontend state and web-equivalent desktop renderer | Yes, metadata projection and both consumers | Composable tests direct; expanded tests source-only, compact mocks routes/icons; browser needed |
| Browser routing/rendering/responsiveness | Yes, preserved interactions | Real Nuxt default layout/consumers and router probe needed |
| API/transport, backend/domain, auth/session | No changes | Backend doubles acceptable for nav-only proof; no API certification claimed |
| Desktop shell/IPC, packaging, process lifecycle | No changes | No packaged application validation needed; own test-process cleanup required |
| Persisted state, worker/distributed, external integration | No changes | Not Affected; no migration or compatibility path introduced |

## Project Execution Discovery
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order; Vue/Nuxt 3, Pinia, Vitest + happy-dom; browser probes use playwright-core/Chrome.
Root guideline: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/TESTING.md; no closer TESTING guideline. Applicable /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/autobyteus-web/AGENTS.md (never git add-all, always --run); no root AGENTS found. Read root README.md setup/local dev, web README.md Testing, ARCHITECTURE.md Testing Strategy, package.json scripts/dependencies, vitest.config.mts, nuxt.config.ts and existing tests/e2e/projects-feature-probe.mjs / fresh-run-auto-approval-probe.mjs and its fixture.
Observed discovery discrepancies: config is vitest.config.mts, not .ts; skills absent in assigned worktree, templates read from main workspace skill root. No instruction conflict.
Guideline: renderer change = focused web tests then browser dev-path probe; no user app/data. Existing dependencies/contracts/Nuxt preparation reusable; no secrets, accounts, database or model calls required.

| Component/fixture | Setup/readiness | Cleanup |
| --- | --- | --- |
| Nuxt frontend | pnpm exec nuxt dev --host 127.0.0.1 --port <free>; HTTP ready then fixture DOM ready | exact owned process group, listener verification |
| Chrome | playwright-core headless with fresh context, discovered executable | browser/context closed |
| Fixture route | Copy checked-in test-only page into unique temporary pages path; refuse existing path | remove exact installed page |
| Capability/config state | page patches real capability stores; fresh browser storage; localhost API responses intercepted | context discarded; no persisted project data |
| Project reader | deterministic empty projects via mocked GraphQL, real page/router/reader | no backend/database changes |

## Persisted Data And Legacy Check
Not Affected per design/handoff. Source diff confirms no reader/writer/schema changes. Old final Projects row removed; no dual order, compatibility flag or fallback retained. No compatibility-only tests added.

## Existing Durable Coverage Inventory
| Path (relative to autobyteus-web) | Intent / AC | Decision / action |
| --- | --- | --- |
| composables/__tests__/useShellPrimaryNavigation.capabilities.spec.ts | exact Applications on/off, disabled/mobile, readiness failure and Projects resolver/active / all AC | Still Valid: upstream replaced obsolete after-Nodes assertion under approved SR-001; independently rerun |
| composables/__tests__/useShellPrimaryNavigation.spec.ts | shared Nodes policy / AC-002–004 preservation | Still Valid; rerun |
| components/__tests__/AppLeftPanel.spec.ts | source delegation/metadata/history, not rendered order | Still Valid; retain, close mock gap with browser |
| components/layout/__tests__/LeftSidebarStrip.spec.ts | mounted inventory, Nodes click, Applications, drawer/redock | Still Valid but lacks enabled Projects; browser durable addition closes gap |
| utils/__tests__/mobileFeatureGates.spec.ts; stores/__tests__/*CapabilityStore.spec.ts; middleware/__tests__/capabilityGate.global.spec.ts | eligibility/route preservation | Still Valid; broader affected regression selection |
| tests/e2e/projects-feature-probe.mjs | full backend Projects CRUD/tasks/settings | Still Valid / Out Of Scope for execution: nav order not exact, much broader data/model-independent journey than needed |

## Durable Coverage To Add / Update / Remove
Add tests/e2e/projects-primary-navigation-probe.mjs, fixtures/projects-primary-navigation.page.vue and package.json CLI script: real default layout, consumer DOM exact-order checks, browser folder SVG, normal Projects click/new-subroute active, narrow drawer and mobile omission. Durable because recurring shared renderer regression requires a real DOM/router boundary. No existing test removals/updates planned this round; upstream stale assertion already replaced, no additional obsolete assertions found.

## Repository Coverage Execution Plan
1. R-001 four upstream focused files, exact design command with --run; log api-e2e-evidence/focused.log.
2. R-002 closest mobile gate/capability middleware/capability store tests + responsive default layout coverage found during inventory; non-watch command/log recorded below before execution.
3. B-001 Applications on/off expanded and compact order; B-002 disabled omission both modes; B-003 click /projects then real /projects/new active/icon/label; B-004 narrow desktop drawer interaction; B-005 mobile runtime omission.
Ledger required: Yes, independently meaningful cases and browser startup/interruption risk; initialized before changes/execution.

## Post-Repository Confidence Scorecard
Pending execution; do not infer pass/confidence from upstream. Planned browser Required: repository mocks/source checks do not directly prove all critical ACs. Browser actual Nuxt shared layout/components/router closes this bounded gap. Expected scoped final >=95%; no shell-specific change, web surface sufficient. Not tested: broad CRUD, real backend/provider, packaged Electron, comprehensive accessibility/visual matrix; unrelated unchanged boundaries, no delivery/user verification implied.

## Live Plan / Temporary Scaffolding
Run durable browser probe with fresh output directory and optional initialized ledger. Free frontend port; backend target reserved local fixture-only endpoint and request interception, never localhost:8000/user services. Fixture state only capability inputs, not production nav arrays or routing/consumers. Screenshots support assertion evidence. Install/removal and cleanup receipts must pass. No independent temporary coverage replaces durable browser coverage; temporary page installation is harness scaffolding only.

## Ambiguities / Decision
None; Proceed Yes. Durable addition Yes; reroute required No. Confidence/results and exact commands updated after execution.

### R-002 selected command (before execution)
`pnpm -C autobyteus-web test:nuxt utils/__tests__/mobileFeatureGates.spec.ts middleware/__tests__/mobileFeatureGate.global.spec.ts middleware/__tests__/feature-flags.global.spec.ts stores/capabilities/__tests__/createBoundNodeCapabilityStore.spec.ts stores/__tests__/applicationsCapabilityStore.spec.ts layouts/__tests__/default.spec.ts layouts/__tests__/default-drawer.spec.ts --run`.
Discovered middleware actual name feature-flags.global.spec.ts rather than capabilityGate; common bound capability store exercises Projects owner factory. No projectsCapabilityStore-specific suite exists.

## Post-Repository Results And Confidence Gate
R-001 Pass 4 files/22 tests; R-002 Pass 7 files/39 tests. Commands above, logs under api-e2e-evidence. No skipped critical assertions; upstream durable assertion validated against approved behavior. Repository evidence remains mocked route/runtime/DOM and source delegation.
| Category | Score | Support / remaining gap / targeted gain |
| --- | --- | --- |
| Requirements / AC proof | 90% | exact projection/gates/routes; rendered interaction still missing → browser |
| Changed-boundary directness | 95% | actual reordered array/filter executes; consumer render unproven → browser |
| Integration realism / mock gap | 75% | mocked router/icons and source tests bypass real consumer/router → browser |
| Environment/config/fixture fidelity | 90% | Nuxt test env, real factory gates; browser/runtime viewport pending |
| Failure/edge/lifecycle/recovery | 95% | independent flags, mobile omission, readiness rejection, route gates; no new error/recovery flow |
| User surface/browser/shell | 75% | browser compact/select/subroute not yet proven; shell-specific N/A within category |
| Durable regression relevance | 95% | exact unit expectations; durable browser consumer coverage implemented, not executed yet |
Overall post-repository: 87.86% = arithmetic mean of seven categories. Critical AC-004 not fully directly proven; applicable categories below 90: integration realism, user surface. Clean gate not met. Broader validation Required, mode Browser; live Nuxt default layout and production consumers/router expected to close the gaps. No packaged shell claim.
Mobile B-005 uses a test-only top-level route with /mobile prefix and production default-layout consumers to exercise the unchanged runtime eligibility function, not the dedicated paired-phone MobileRemoteAccessShell (out of scope). Public Iconify asset hosts are permitted for real SVG rendering; other non-frontend requests are intercepted/blocked. No authentication, credentials or user backend access.

### Browser attempt 2 / harness correction before rerun
B-001/B-002 passed real DOM/order. B-003 reached actual /projects with projects-empty, then timed out waiting ProjectEditor input. Nuxt cold dependency optimization reload was logged; subsequent GetProjectsCapability/GetApplicationsCapability requests were not included in initial API fixture, so middleware could not retain enabled eligibility on new route. Preliminary origin is incomplete test fixture, not reordered metadata (route/gate sources unchanged). Added valid deterministic enabled capability GraphQL payloads and missing empty history payload; preserved failed evidence/cleanup. No assertion removed or weakened. Startup/routing failure diagnostics now capture URL/body/screenshot. Rerun will recheck same cases with fresh context/output. If failure persists with valid fixture, route as Fail for origin review rather than forcing source changes.

### Browser attempt 3 / asynchronous probe correction
B-003 now opened real /projects/new editor, asserted active expanded/compact and identical actual folder path. Last compact-click check asserted URL immediately after synchronous redock, before awaited production router push settled; observed /projects/new at that instant. This is probe timing, not an established navigation defect. Replace immediate check with bounded observable pathname wait, preserving required /projects outcome. B-004 starts from new subroute before narrowing so opening Projects performs an actual route transition; do not invent an unapproved same-route drawer-close requirement. Failed attempt retained, all resources cleaned; same case IDs rerun.

## Final Investigation Decision / API-REV-001
Broader Browser Required and completed: attempt 4 + fresh repeat, five cases Pass each, zero uncaught page errors, exact owned-process/listener/browser/page cleanup all Pass. B-001–005 final proof and repeat close initial material consumer/router/mock gaps. Earlier syntax/fixture/timing attempts retained and explained in execution report; no production defect established. Final confidence 95% (seven category scores 95, simple mean); no category below 90, all critical ACs directly proven, no material remaining broader risk. No reroute required. Durable three-path CLI/fixture/script addition commit 536e7675e6ba4322aa3767f863e6c4a97079a144. Temporary installed pages removed. Final current authoritative report: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-execution-coverage-report.md; revision: /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-revision-record.md. Small/Low direct test-code review Not Required; downstream recipient subject to rules.
Selected downstream route after final persistence: get_handoff_rules sole matching Small/Low direct Pass → /delivery_engineer.
