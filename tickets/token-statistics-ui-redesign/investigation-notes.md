# Token Statistics UI Redesign — Requirements Investigation Notes

## Investigation Meta

- Request / ticket: Improve the professionalism and usability of Settings > Token Statistics
- Package ID: `REQPKG-TSUI-001`
- Workspace root: `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements`
- Repository mode: `Git`
- Task worktree / branch: Dedicated worktree on `requirements/token-statistics-ui-redesign`
- Base or reference revision: Explicitly reset to `origin/personal` at `9d0fd7c570d58da1af2c7a40279327c8a20a8093`
- Bootstrap result: Success. `personal` and `origin/personal` resolved to the same commit when the worktree was created; after the user clarification, the task branch was explicitly hard-reset to `origin/personal` and verified clean.
- Bootstrap blocker: None
- Current requirements revision ID: `RER-009`
- Investigation status: RV-007 focused direction is user-confirmed; DEC-001–DEC-009 are resolved, including the later explicit CSV-export removal; exact Final Prototype handoff is ready

## Initial Request And Clarifications

- Original request: “the current token statistics page looks so ugly. its very unprofessional. here we need better ui” with two current-state screenshots.
- Clarifications received: The user confirmed `origin/personal`; selected focused Analytics and light Run-details unification; selected six equal summary columns (Total tokens, Uncached input, Cached input, Output, Estimated API cost, Cache hit rate); removed Input/Output ratio, prior comparison, contributor/driver presentation, point stems/top chart ceiling, and Export CSV; selected the open-top point-marked line with explicit axes/one midpoint guide; kept `Detailed usage` visibly present with visible grouping; and requested final UI/UX plus final screenshots.
- User-supplied facts and constraints: The current visible result is unacceptable on visual/professional-quality grounds. Cache rate is especially important to the price-sensitive use case. No proposed UI fact may be invented outside the current source-pin data contracts.
- Initial ambiguity: No behavior-defining decision remains. Final Prototype artifacts, validation, and final user confirmation remain process gates.

## Product And Domain Understanding

- Product area: AutoByteus web/Electron Settings > Token Statistics.
- Affected actors or systems: Token-usage viewers, evidence-oriented users, run investigators, frontend presentation, localization/accessibility behavior.
- Existing user or operational purpose: Explain monthly/daily observed token use or estimated spend, expose cache-aware token composition and exact on-page evidence, and retain a distinct creation-time/lifetime Run-details investigation workflow. Runtime/model identity is secondary; visible contributor/driver, prior-period comparison, Input/Output ratio, and CSV export are removed.
- Relevant terminology:
  - **Analytics:** Observation-time calendar-period projection and comparison.
  - **Run details:** Runs selected by creation time (or established fallback), displaying lifetime totals.
  - **Coverage:** Whether analytical tracking fully or partially covers the selected UTC period.
  - **Cost quality:** Complete, partial, missing, local/no-bill, or mixed-currency evidence.
  - **Primary exact facts:** Total tokens/spend, total input, standard input, cached-read input, cache hit rate/state, output, cost/coverage quality, and daily buckets.
  - **Uncached input:** User-selected visible label for current `standardInputTokens`, the component charged at the standard/cache-miss rate; excludes cached reads and cache-write components.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-29 | User | Original request and two supplied images | Establish dissatisfaction and visible current state | Current populated Analytics is explicitly rejected as ugly/unprofessional | Resolve target via visualization |
| 2026-08-29 | User | “make sure bootstrap from origin/personal okay?” | Establish source baseline | Product/requirements bootstrap must use `origin/personal` | Include exact pin in Product handoff |
| 2026-08-29 | Command | `git rev-parse personal origin/personal`; `git reset --hard origin/personal`; `git status --short --branch` | Verify task isolation and approved baseline | Both refs resolve to `9d0fd7c57…`; dedicated worktree is clean | Preserve branch/worktree paths |
| 2026-08-29 | Code | `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Inspect page shell and tabs | Analytics is default; Run details is secondary; no content title | Preserve semantics and prior header decision |
| 2026-08-29 | Code | `autobyteus-web/components/settings/token-usage/analytics/*.vue` | Inspect current controls, summaries, charts, coverage, breakdown, table, and states | Tailwind card stack; four equal summary cards; two equal charts; large empty pace state; 12-column min-width exact table | Translate observations into UI requirements |
| 2026-08-29 | Code | `autobyteus-web/stores/tokenUsageAnalytics.ts`; `types/tokenUsageAnalytics.ts` | Verify selection/query behavior | Presets and filters feed one network-only result; metric/grouping are presentation state | Preserve query coherence; no backend change indicated |
| 2026-08-29 | Code | `TokenUsageRunDetailsView.vue`, task/model table components | Check sibling workflow | Different gray visual language; distinct creation-time/lifetime semantics and extensive evidence | Include visual coherence, preserve semantics |
| 2026-08-29 | Test | Analytics and Token Statistics component specs | Identify supported state/action contracts | Tests cover accessible controls, validation, loading/error, uncovered/empty/partial states, chart evidence, tabs, and horizontal table containment | Future design must retain/update durable coverage |
| 2026-08-29 | Doc | `autobyteus-server-ts/docs/modules/token_usage.md`; web docs | Verify governing analytics/Run-details semantics | Docs require coherent analytics, truthful coverage/cost, deterministic local CSV, and preserved Run details | Treat as preserved contract |
| 2026-08-29 | Prior artifact | `tickets/done/token-statistics-analytics/{requirements.md,ui-ux-spec.md,token-usage-analytics-data-contract.md}` | Recover prior approved behavior and visual baseline | Current implementation closely follows earlier question-first card dashboard; user now reopens/rejects its visual treatment, not its data semantics | Mark visual baseline superseded, semantics preserved |
| 2026-08-29 | Prior artifact | `tickets/done/token-statistics-remove-header/requirements.md`; `tickets/done/token-statistics-full-width/{requirements.md,ui-ux-spec.md}` | Identify explicit layout decisions to preserve | No redundant content title; Settings navigation resize stays wholly manual | Include scope guardrail |
| 2026-08-29 | Runtime evidence | Supplied screenshots inspected at original resolution | Examine actual populated rendering | Excess chrome/whitespace, weak prioritization, raw-looking precision, empty comparison prominence, and table scan/overflow issues are visible at a large desktop viewport | Use as current-state prototype baseline |
| 2026-08-29 | Product artifact | `requirements-visualization-review.md`, RV-002 visual references, and Product return message | Evaluate exploratory future-state evidence | Two clean product-only directions cover partial/comparable/filter/evidence/Run-details/narrow states; 15/15 Chromium checks passed; no approval claimed | Ask user to select A/B/hybrid and clarify DEC-001–DEC-004 |
| 2026-08-29 | Product repository evidence | Updated `prototype-ticket.md` and Product correction message | Verify the user-requested bootstrap lineage | Accepted baseline implementation `6ba98942…` is durably integrated by fast-forward at prototype `origin/personal` tip `16638137…`; exploratory commits remain only on the ticket branch | Preserve exact repo/revision distinction in requirements |
| 2026-08-29 | Product feasibility audit | `implementation-feasibility-audit.md`; `validation/contract-feasibility-audit.txt`; RV-003 review record | Prove proposed facts/actions exist in the current source-pin contracts | Audit maps remaining UI to current analytics/Run-details fields and derivations; unsupported Run-details model `Runs` count was removed; contract audit PASS and browser validation 16/16 | Preserve audit as supporting evidence; forbid invented fields |
| 2026-08-29 | User / Product visualization | User preference relayed with RV-004 review/validation | Resolve the within-month trend form | User prefers a line/curve with visible point markers instead of vertical bars for daily usage within a month; RV-004 renders 29 points, no bars/fill, and complete accessible bucket text; browser validation 17/17 | Incorporate as REQ-015/AC-015; overall direction remains open |
| 2026-08-29 | Product requirement impact / user feedback | `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirement-impact.md` (`RI-001`) | Reconcile the user's real primary questions with RV-004 requirements | Contributor/driver ranking is unintuitive and non-primary; cache-aware composition and monthly/daily Tokens/Cost are primary; prior comparison is questionable | Revise affected Draft requirements and ask DEC-005–DEC-008 before RV-005 |
| 2026-08-29 | Code / Contract | `token-usage-component-basis.ts`; `token-usage-cost-summary-aggregate.ts`; generated analytics fields; current cost-breakdown UI | Define cache/input terms without invention | `standardInputTokens` is the standard/cache-miss-rate component; gross input includes standard, cache-read, and applicable cache-write components; cache hit rate is cache-read/gross input; cache states distinguish positive/zero/not-reported/unsupported/unknown | Recommend precise `Standard input` label and truthful cache-state text |
| 2026-08-29 | Product RV-005 / exact user decisions | `requirements-visualization-review.md`; `requirement-impact.md`; RV-005 commits `fc6bace6…` and `25a7d5c…`; `validation/browser-validation.json` | Reconcile RI-001 and verify the revised presentation | Both directions remove all prior/comparison callouts, standalone contributor presentation, and visible `driver` terms; exact identity remains secondary under `Detailed usage`; 18/18 Chromium checks pass, including 29-point-line and forbidden-term checks | Canonically resolve DEC-005/006; ask only DEC-007/008 before the next focused Product revision |
| 2026-08-29 | Product RV-006 / user chart feedback | `requirements-visualization-review.md`; RV-006 commits `0e4a0778…` and `3bd5300a…`; `validation/browser-validation.json` | Make the daily line's scale obvious and remove confusing dotted-looking marks | Both directions add explicit X/Y axis lines, a Tokens/Cost (USD) Y title, three Y labels, and five aligned UTC ticks while preserving 29 points/one line; all short vertical point stems are removed; 18/18 checks pass | Incorporate axis/unit/no-stem behavior into REQ-015/AC-015; no new contract or RI conflict |
| 2026-08-29 | Product RV-007 / explicit user confirmation | `requirements-visualization-review.md`; RV-007 commits `726f414a…` and `578efc4e…`; focused `VIS-001/003/004/005/007/008`; validation | Close the clarification loop and determine Final Prototype readiness | User selects Uncached input, six equal summary columns, no Input/Output ratio, visible Detailed usage/grouping, open-top plot with one midpoint guide, focused filters, light Run-details unification; 18/18 passes; user calls the complete page final and requests final UI/UX/screenshots | Resolve DEC-001–DEC-008 and classify `Prototype Needed` |
| 2026-08-29 | User | “I actually also want to delete this export to CSV functionality as well.” | Resolve whether the previously preserved local export remains | Remove the visible Export CSV control and its local CSV preparation/download functionality; do not add a replacement workflow | Record DEC-009; require Final Prototype to differ from RV-007 by omitting export |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Production Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Select Settings > Token Statistics | `settings.vue` mounts `TokenUsageStatistics.vue`; local `activeView` selects Analytics or Run details | Analytics default, semantic tabs, no repeated page heading | Code/tests | High |
| BEH-002 | User | Change preset/custom/filter or metric | Controls update store selection; supported fetch triggers query the analytics GraphQL result; metric remains client presentation | One coherent result supplies all analytics; UTC and active context remain explicit | Store/component/tests/docs | High |
| BEH-003 | User | Inspect populated Analytics | Result renders coverage, summaries, trend, pace, ranked breakdown, and exact rows | Charts complement rather than replace exact data; unsafe cost values omitted | Components/tests/prior contract | High |
| BEH-004 | System | Loading/error/coverage/pricing/result state changes | `TokenUsageAnalyticsView` and Coverage branch on store/result states | Truthful distinct states with retry/empty guidance | Code/tests | High |
| BEH-005 | User | Switch to Run details | Existing Run-details store query; local Task/Model selection; table components render result | Creation-time selection and lifetime totals remain intentionally different from Analytics | Code/tests/docs | High |
| BEH-006 | Contract | Format and expose exact result values | `Intl` formatters for visual surfaces; exact rows and the current CSV serializer expose result fields | Compact visual values and exact evidence coexist; cost quality prevents fake zero; user now removes the CSV path | Code/tests/data contract/user DEC-009 | High; active-locale linkage needs downstream confirmation |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `autobyteus-web/pages/settings.vue` | Resizable Settings navigation and content host | Redesign must tolerate variable content width and not change navigation policy | None at visualization stage |
| `components/settings/TokenUsageStatistics.vue` | Analytics/Run-details shell and view tabs | Cohesive shell can be redesigned without changing view meaning | Whether approved polish should use a local/shared presentation primitive is downstream-owned |
| `analytics/TokenUsageAnalyticsControls.vue` | Range/filter/metric/context/export | Adopt focused range/filter/metric/context controls and remove Export CSV behavior | Downstream owns component structure after prototype approval |
| `analytics/TokenUsageAnalyticsView.vue` | Result-state composition | Allows presentation recomposition while preserving result branches | Downstream validates state ownership and focus/live behavior |
| Summary/Trend/Pace/Breakdown components | Purpose-specific rendering from one result | Visual composition/chart/table changes appear feasible within existing contract | Chart/table reuse or refactor is downstream-owned |
| `stores/tokenUsageAnalytics.ts` | Selection, fetch sequencing, stale-result prevention | No data contract change required; preserve fetch triggers | Confirm presentation-only state does not cause new requests |
| `TokenUsageRunDetailsView.vue` and tables | Secondary lifetime evidence workflow | Apply user-selected light shell/control/table unification while preserving all behavior | Downstream owns implementation structure |
| Localization catalog and formatter utilities | Labels and number/cost formatting | Professional formatting and locale checks are in scope | Active-locale integration details are downstream-owned |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: Translation catalogs; analytics GraphQL result fields; component fixtures; current CSV output/serializer slated for removal from the user flow; user screenshots; prior UI/UX/data-contract artifacts.
- Existing readers, writers, or contracts that consume them: Analytics store/components; Run-details store/components; current CSV serializer/tests; localization runtime; component/E2E tests.
- Evidence paths: Requirements document Supplemental Artifacts and Codebase Facts tables.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Existing Settings page shell, Token Statistics component boundary, purpose-owned analytics components, local Pinia store, generated GraphQL type/query, Chart.js rendering, localization runtime. No backend/persistence/security/deployment surface is currently authorized to change.
- Existing structural surfaces that can support the approved behavior: Current page already separates shell, controls, state composition, summaries, charts, breakdown, exact table, Run details, store, types, and CSV logic; the final experience removes the CSV control/behavior without changing the server contract.
- Evidence paths: `autobyteus-web/components/settings/token-usage/**`, `stores/tokenUsageAnalytics.ts`, `types/tokenUsageAnalytics.ts`, current tests.

### Potential Architecture-Design Triggers

- API or external-contract change: Currently absent from proposed scope.
- Persistence schema or invariant change: Currently absent.
- Security or privacy boundary change: Currently absent.
- Concurrency or lifecycle change: Currently absent; fetch sequencing must be preserved.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: No such change is required by the approved direction; final frontend structure still requires post-prototype routing assessment.
- Confirmed absent, present, or unknown: `Unknown for final routing`; likely presentation-local, but assessment is not permitted until approval.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Original-resolution inspection of capture 1 | Populated current month, partial coverage, no prior comparison | Large control card and four equal summary cards precede equal chart cards; absence gets primary-card and large chart footprints; $333-scale cost displays four fractional digits | Rebalance hierarchy, compact controls, proportional unavailable state, restrained precision | User capture `ctx_7a228aa2bc49__image.png` |
| Original-resolution inspection of capture 2 | Ranked drivers plus exact breakdown | Chart reserves substantial space for a zero-value category; 12-column exact table is visually dense and secondary metadata pushes beyond the immediate scan area | Use space efficiently and prioritize primary evidence while retaining exact details | User capture `ctx_38f329cd9412__image.png` |
| Source/test inspection (no local dependency install) | Supported component states | Current tests document behaviors but do not establish future visual quality | Product visualization plus later visual/accessibility regression evidence is required | Test paths in Source Log |

No live product server was launched in this requirements round. The user supplied representative populated runtime captures, and source/tests/docs were sufficient to establish current supported behavior and the material visual questions. Product Design should bootstrap the actual frontend from the pinned baseline for interactive future-state evidence.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Current Token Statistics looks ugly/unprofessional; RV-007 focused direction is satisfying/final; Export CSV should also be deleted | Direct, decisive | Produce the final user-confirmed focused experience with the explicit post-RV-007 export removal | Final prototype confirmation only |
| User | Bootstrap from `origin/personal` | Direct, explicit | Product bootstrap must use the pinned ref | None |
| Prior user approvals | No redundant page title; Settings navigation resizing remains manual; analytics semantics truthful | Explicit archived approval | Preserve unless explicitly superseded | Confirm during final approval |
| Existing tests/docs | Current actions/states/data meanings are supported contracts | Strong implementation/product evidence | Redesign must preserve behavior and update regression coverage | None material |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Token analytics GraphQL/data contract | Repository baseline at pinned revision; prior approved artifact | One coherent result, UTC ranges, coverage/pricing truthfulness, exact on-page breakdown; returned comparison may be unused | Generated type/store/docs/data contract | No server-contract change authorized; CSV is client-side removal |
| Run-details behavior contract | Repository tests/docs | Creation-time selected runs with lifetime totals and hierarchy/cost evidence | Run-details tests/docs | Visual restyle must not blur semantics |
| WCAG 2.1 AA | Requirements quality target | Contrast, keyboard, names, focus, non-color cues | Prior UI/UX accessibility requirements | Manual/automated verification mix downstream |
| Chart.js | Current package | Trend, pace, and ranked visuals | Component imports/configs | Canvas accessibility relies on text/table equivalents |
| `Intl` and localization runtime | Browser/Electron platform plus app catalog | Locale-aware numbers/dates/currency without misleading precision | Current formatter calls | Current use of environment default versus active app locale needs verification |

## Persisted Data And State Facts

- Affected stored or external subject: No stored data change is authorized.
- Location and representative shape: Existing run records and daily analytical projection, accessed through current backend/GraphQL contracts.
- Approximate volume: User capture shows hundreds of millions of tokens; exact row count in representative capture is small. Requirements must remain safe for more categories/rows supported by current contract.
- Current readers and writers: Existing token accounting backend, analytics query/store/components, Run-details query/store/components, plus current client CSV serializer/tests slated for removal or deactivation from the supported UI path.
- Current unknown/extra-field behavior: Not relevant to presentation scope.
- Required semantics or data that must be preserved: Exact values; coverage; cost quality/currency/status; identity; selected/comparison ranges; filter options; task hierarchy/lifetime semantics.
- Acceptable loss, reset, rebuild, or regeneration: No data loss/reset; only transient presentational state may reset as today.
- Privacy, retention, compliance, downtime, or operational constraints: No new upload/telemetry/share/persistence.
- Remaining evidence gap: Final Product-owned prototype/specification/screenshots must demonstrate the approved RV-007 direction plus DEC-009 and every retained state; routing follows their user confirmation.

## Product Prototype Decision

- Prototype needed: `Yes — Final Prototype`
- Decision rationale: The user confirmed RV-007's focused Analytics and light Run-details treatment as the final direction, resolved every visualization choice, requested the final UI/UX specification and screenshots, and then explicitly removed CSV export. A production-oriented runnable final package is now required to make those decisions normative and exercise the retained state/interaction contract.
- Requirement / behavior IDs involved: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-016`; `AC-001`–`AC-016`; resolved `DEC-001`–`DEC-009`.
- Product decisions or uncertainties to resolve: None. Product must implement/specify the approved decisions without reopening them; any infeasible or conflicting finding returns as Requirement Impact.
- Critical journey and states: Open focused populated current month; read six equal summary columns; use focused filters; switch Tokens/Cost on the open-top daily line; inspect cache truth states; use visible Detailed usage grouping/row evidence; verify absence of ratio/comparison/driver/export; switch to lightly unified Run details and exercise Task/Model; check loading/empty/error/local/mixed/partial/full coverage and narrow widths.
- Known constraints and non-goals: Preserve analytics/Run-details server contracts, truthfulness, accessibility, no redundant page title, manual Settings navigation; remove CSV UI/functionality; no backend/new-feature/replacement-export work.
- Alternative evidence path / next action when no prototype is used: Not recommended; static prose would not resolve the user's visual-quality judgment.
- Prototype request artifact / message reference: RV-007 user-confirmed review at content commit `726f414a4f1acf2e32e859c7b6e8a90584d1b6d6`, metadata commit `578efc4e3d4929fcce55e1c130f1c6092fda7f44`, plus explicit post-review `DEC-009`. Requirements Engineering outcome: `Prototype Needed`, Mode `Final Prototype`.
- Established separate prototype repository/root and ticket reference, when applicable: Canonical repository `/home/autobyteus/workspace/autobyteus-web-prototype`; Product worktree `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001`; ticket `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/prototype-ticket.md`; ticket branch `prototype/reqpkg-tsui-001`.

## Prototype Findings

- Prototype package path: `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001`
- Approved UI/UX specification path: `N/A — exploratory Requirements Visualization mode; no final ui-ux-spec.md`
- Review URL: User-selected Direction A `http://127.0.0.1:3262/?direction=focus`; dense Direction B is rejected historical comparison; deterministic scenes may append `&scene=comparable`, `filters`, `evidence`, `runs`, or `narrow`.
- Explicit user-confirmation reference: On 2026-08-29 the user stated they were satisfied with Analytics and Run details, called focused RV-007 the final direction to implement, requested final UI/UX plus final screenshots, then explicitly removed Export CSV. Final Prototype itself is not yet approved because it does not yet exist.
- Journeys and scenarios validated: RV-007 validates partial/full, comparable/no-comparison presentation, filters, exact evidence, Run details, constrained desktop, actual 390×844, historical export feedback, and keyboard navigation/resizing. Final Prototype must add a negative CSV/export assertion and broader retained-state evidence.
- Final visual-reference paths: `N/A — VIS-001–VIS-008 are exploratory only`; directory `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/visual-references`.
- Product decisions supported by evidence: RV-003 proves current-contract feasibility; RV-004 selects the daily point-marked line; RV-005 removes comparison/contributor/driver presentation; RV-006 adds conventional axes and removes stems; RV-007 selects six equal cache-aware columns, `Uncached input`, no ratio/top ceiling, visible Detailed usage/grouping, focused filters, and light Run-details unification. DEC-009 then removes CSV.
- Alternatives rejected or still open: Rejected: RV-001 review chrome, dense Direction B, unsupported `Runs` count, bars/fill, floating Y labels, stems/top ceiling, prior comparison, contributor/driver terms, Input/Output ratio, oversized Total column, collapsed Detailed usage, full Run-details restructuring, and Export CSV/replacement workflow. No product choice remains open.
- Mocked boundaries and production gaps: Synthetic totals, costs, coverage/pricing, filters, detailed rows, runs, CSV feedback, and navigation width; no backend, persistence, production services/data, or file-writing export. Final Prototype must replace exploratory coverage with normative UI/UX, final screenshots, retained-state validation, and explicit CSV absence.
- Requirements sections affected: Entire UI approval basis; BEH-002/003/005/006; REQ-002/003/006/008/012/013/015/016; AC-001/002/005/006/008/010–012/015/016; scenarios; decisions; readiness; revision history.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_71b4437ade9940c4912d2d7a39ea7186/requirements_engineering_team_a245406e04604ce28e52af265218b458/requirements_engineer_9dd659bd74f940469dd4932c55ebf19d/context_files/ctx_7a228aa2bc49__image.png` | User | Current populated Analytics evidence | Rejected top/mid layout | REQ-001–REQ-005, AC-001–AC-004 | Current-state evidence | Not a desired-state approval |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_71b4437ade9940c4912d2d7a39ea7186/requirements_engineering_team_a245406e04604ce28e52af265218b458/requirements_engineer_9dd659bd74f940469dd4932c55ebf19d/context_files/ctx_38f329cd9412__image.png` | User | Current breakdown/table evidence | Rejected data-density layout | REQ-006–REQ-009, AC-005–AC-008 | Current-state evidence | Not a desired-state approval |
| `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/ui-ux-spec.md` | Prior project | Preserve behavior semantics and document current visual baseline | Analytics | REQ-002–REQ-012 | Visual treatment superseded | Semantics remain approved |
| `/home/autobyteus/workspace/autobyteus-workspace-token-statistics-ui-requirements/tickets/done/token-statistics-analytics/token-usage-analytics-data-contract.md` | Prior project | Truthful field/source contract | Analytics evidence | REQ-005, REQ-006, REQ-008, REQ-010, REQ-012 | Partially superseded | Data meanings preserved; CSV presentation/export superseded by DEC-009 |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/prototype-ticket.md` | Product Design & Prototyping | Ticket, repository lineage, revisions, user confirmation, and Final Prototype request state | RV-007 / Prototype Needed | REQ-001–REQ-016 | In Progress | External Product artifact; final package pending |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirements-visualization-review.md` | Product Design & Prototyping | User-confirmed focused direction, state coverage, validation, limitations, and Final Prototype request | RV-007 | REQ-001–REQ-016; DEC-001–DEC-008 | User Confirmed — Final Prototype Requested | Exploratory direction evidence; DEC-009 added afterward |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/validation/browser-validation.json` | Product Design & Prototyping | Equal-column, cache-coherence, open-top-line, responsive, Run-details, and forbidden-term assertions | RV-007 | REQ-002–REQ-016 | PASS 18/18 | Supporting direction evidence; no DEC-009 assertion yet |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/visual-references` | Product Design & Prototyping | Focused and historical dense direction/state evidence | VIS-001–VIS-008 / RV-007 | REQ-001–REQ-016 | Focus user-confirmed; retained exploratory evidence | Non-normative until Final Prototype; DEC-009 delta required |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/implementation-feasibility-audit.md` | Product Design & Prototyping | Map every remaining proposed fact/action to current contracts and record unsupported-field correction | FA-001 / RV-003 | REQ-002–REQ-013 | PASS | Supporting evidence; not a final implementation design |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/validation/contract-feasibility-audit.txt` | Product Design & Prototyping | Machine-readable source-pin contract checks | RV-003 | REQ-002–REQ-013 | PASS | Supporting evidence |
| `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirement-impact.md` | Product Design & Prototyping | RI-001 conflict and feasible cache-composition mapping | RI-001 / RV-005–RV-007 | REQ-002, REQ-004–REQ-006, REQ-012, REQ-016 | Resolved | Retained traceability evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | Scope includes light visual coherence for Run details, with Analytics primary. | Avoids a split-quality page but affects size. | Visualization review / user | Confirmed — RV-007 |
| ASM-002 | Assumption | Functional/data semantics remain unchanged except explicit visible/CSV removals. | Prevents UI work from becoming an unapproved analytics feature expansion. | Requirements approval / user | Confirmed — RV-007 and DEC-009 |
| UNK-001 | Unknown | Preferred filter disclosure, Detailed-usage placement, and Run-details restyle among credible alternatives. | Determines the final interaction density and package scope. | Product visualizer + user | Resolved — focused RV-007 |
| RSK-001 | Risk | Over-simplification could hide coverage/pricing evidence. | Trustworthiness is the existing feature's main invariant. | Requirements/Product/validation | Active |
| RSK-002 | Risk | A polished primary view could leave Run details visibly legacy or expand scope excessively. | Light unification must remain visual and preserve behavior. | Final Prototype validation | Mitigated by DEC-004; verify |
| RSK-003 | Risk | Formatter cleanup could round an exact evidence surface or mismatch active locale. | Could reduce trust while improving appearance. | Downstream verification | Active |
| RSK-004 | Risk | A responsive exact table may reintroduce inaccessible hidden data. | Exact evidence must remain exhaustive and keyboard/touch reachable. | Product Design/downstream validation | Active |
| UNK-002 | Unknown | Final standard-input label and Detailed-usage placement. | Prevents misleading terminology/hierarchy. | User / Requirements Engineering | Resolved — DEC-007/DEC-008 |
| RSK-005 | Risk | `Uncached input` may imply inclusion of cache-write tokens, which `standardInputTokens` excludes. | Price-sensitive composition must reconcile truthfully. | Mandatory supporting definition and contract fixtures | Active verification risk |
| RSK-006 | Risk | Removing the visible Export button without removing its supported behavior/tests—or removing shared analytics behavior accidentally—would leave an inconsistent contract. | DEC-009 requires complete client-path removal with no backend/query regression. | Final Prototype/downstream validation | Active |

## Requirement Implications

- The work is not a greenfield analytics dashboard: the current behavior and data contract are mature and heavily constrained. The redesign must operate within those semantics.
- The user's concern is a hierarchy/density/system-cohesion problem and a clarification of which existing facts are primary, not a request for new analytics fields.
- Absence states are currently truthful but visually over-weighted; future treatment must preserve text while reducing dead space.
- The exact table is both an accessibility/evidence surface and a visual-density problem. The redesign may prioritize or disclose secondary columns, but cannot delete their information.
- Prior user decisions about the page title and manual Settings navigation remain constraints.
- User-confirmed exploratory evidence is complete; a separate final normative prototype/specification/screenshot package is now required before the requirements package can be approved.
- Monthly/daily Tokens/Cost and cache-aware composition replace contributor ranking as the primary hierarchy. Exact identity remains secondary under `Detailed usage`; returned comparison data is not rendered.
- CSV export is no longer a preserved capability; exact evidence remains available on-page.

## Notes For Downstream Architecture Design Or Direct Implementation

- Current evidence suggests the approved change may fit existing frontend ownership: page shell, purpose-owned analytics components, store, localization, chart rendering, and existing tests. This is not a final routing assessment.
- Preserve one-result coherence, fetch sequencing, cost/coverage decisions, and exact on-page data. Remove CSV without splitting the result across independently timed queries or affecting analytics selection behavior.
- Confirm any presentation-state interactions (metric, grouping, disclosure, view changes) do not create unapproved network calls or reset selections.
- Verify locale-aware formatter ownership before changing behavior; exact on-page evidence and compact summaries have intentionally different precision requirements.
- The final route will be assessed after visualization, any final prototype, and explicit user approval. Do not infer a direct route from the Draft package.
