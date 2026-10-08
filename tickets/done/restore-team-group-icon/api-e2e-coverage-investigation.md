# API/E2E Coverage Investigation — restore-team-group-icon

## Meta / authorities
Round 1, 2026-10-08; initial IR-001 request. Current authoritative investigation; no prior result. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-team-group-icon`, branch `codex/restore-team-group-icon`, intake HEAD f0e913507; source d27880bf7. All paths below relative to that worktree unless absolute.

Read complete ticket package: `requirements-doc.md` R1/AP-001, `investigation-notes.md`, `design-spec.md` D1, `solution-revision-record.md` SR-001/002, `solution-design-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md` IR-001 and `evidence/source-history.txt`. Ticket prefix: `tickets/in-progress/restore-team-group-icon/`. Implementation legacy/data checks agree with four literal/two comment diff: no legacy retention, no persistence change. Independent architecture/source reviews and their revision records: N/A — not applicable. Delivery/rework artifacts: N/A. Canonical API artifacts alongside: `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (on completed result), `api-e2e-test-case-ledger.md`.

Classification confirmed Small/Low, Direct Low-Risk; test-code review **Not Required — direct low-risk route**. Expected successful route Delivery, subject to rule lookup.

## Approved basis / boundaries
SCN-001: recognize configured, collaborator and delegated Teams under Agent/Team/Org roots, expand and select members. SCN-002: recognize Team Task workers and configured/task/nested Memory groups; retain non-openable states/member inspection. SCN-003: source chronology with explicit unknown installed timing. No contrived or newly invented product scenarios.

| Behavior | Change / evidence | Coverage consequence |
| --- | --- | --- |
| BEH-001 / AC-001,003 | Four-owner D1; two workspace glyph replacements | Both role projections, parent tree behavior, actual group SVG and geometry |
| BEH-002 / AC-002,003 | Task/Memory glyph replacements | Both densities, closed/failed/Agent distinction, real SVG, grouping/action |
| BEH-003 / AC-004 | Preserved source investigation | Verify pinned metadata/diff; Delivery retains explanation |
| REQ-005 / AC-005 | Isolated validation evidence | Durable regression, fresh-source browser, cleanup, truthful limits |

Affected: frontend components, browser rendering, web-equivalent desktop renderer. Preserved state/selection/disclosure is tested, not changed. Unchanged and out of scope: backend/domain, HTTP contract, auth, Electron/preload, workers/models, persistence/migration, release. Iconify asset loading is existing external integration and needs real SVG proof; no upgrade or new pipeline. No data reader/migration tests warranted (Not Affected).

## Discovery / setup
Read root `AGENTS.md`, `DESIGN.md`, full `TESTING.md`; web `AGENTS.md`, `README.md#testing`, `ARCHITECTURE.md#testing-strategy`; root `README.md#local-full-stack-development`; web `package.json`, `vitest.config.mts`; existing browser probe/fixture headers and implementation preview. No closer TESTING/AGENTS found. Root shell safety and narrow `--run` Nuxt tests govern. Real full product journeys require isolated desktop; this task proves renderer only. No instruction conflict. Vitest uses Nuxt/happy-dom; Icon stubs prove choice, not shape. Workspace name is `autobyteus`, not directory name. Serialize all builds/tests/Nuxt dev to avoid shared-output invalidation.

Dependencies installed already; rebuild `pnpm --filter 'autobyteus^...' build`, then `pnpm -C autobyteus-web exec nuxt prepare`. No secrets/database/accounts required. Browser probe follows existing `tests/e2e/` pattern: ephemeral Nuxt route, free loopback frontend/backend-target ports, fresh headless Chrome, controlled health/GraphQL, actual Iconify network/SVG. No user app/data or concurrent Archive worktree. Refuse existing route/evidence, cleanup exact child process group/browser/page, check released port. Retain output and source identity in ticket evidence. Early overly broad read-only find of sibling worktrees was stopped (owned PIDs 31500/29813); subsequent discovery bounded to task web tree.

## Coverage inventory / validity decisions
| Existing coverage | Decision | Reason / boundary |
| --- | --- | --- |
| WorkspaceTransientExecutionRow.spec.ts | Still Valid | Updated group choice + Agent initials/status, class and keys |
| WorkspaceAgentOrgDelegatedRows.spec.ts | Still Valid | Real Org projector configured/collaborator/copy, exact disclosure/selection |
| WorkspaceHistoryWorkspaceSection.spec.ts | Still Valid | Parent Team hierarchy, stable group and avatar image/missing/broken preservation |
| ProjectTaskWorkers.spec.ts | Still Valid | New density/state glyph assertions + navigation intent (navigation mocked) |
| CollaborationMemoryDetail.spec.ts | Still Valid | Group exact team IDs, role decorations, inspection and loading/error |
| runHistoryTeamExecutionRows[Closure], runHistoryTeamRows specs | Still Valid | Real sidebar projection, stable/task identity/filtering |
| agentRunCollaborationStore[Closure], agentRunCollaborationContext/Closure specs | Still Valid | Collaborator and delegated sources -> same task-team presentation, selection |
| agentSourceSelectors.spec.ts | Still Valid | Team collaborator events + catalog delegated Team source mapping |
| History/Projects/Memory colocated suites | Still Valid | Broader affected component regressions |
| Existing nested-team/Org disclosure browser probes | Still Valid but insufficient alone | Markers are not SVG path identity; no Task/Memory proof |
| Implementation preview | Temporary evidence only | Not registered regression, parent Agent/Team mounted as shared rows |
| Backend/provider/native/packaging suites | Out Of Scope | No changed boundary |

No stale tests removed. Previous bolt assertions already replaced by IR-001 against AP-001. Durable addition planned: `tests/e2e/team-group-icon-probe.mjs` + `fixtures/team-group-icon.page.vue`, package script + TESTING entry. Reuse implementation preview base with robust lifecycle/evidence and independently reviewed assertions; add real Agent parent/context and Team tree fixture coverage rather than claim full product navigation. Existing suite proves source projection and avatar preservation; browser fixture uses supported execution shapes. All remaining rendering gaps warrant durable coverage, not only temporary probe. No production source changes planned.

## Repository execution plan
All commands from worktree root. Log prefix `tickets/in-progress/restore-team-group-icon/evidence/api-e2e/`.
1. Prerequisites as above -> `setup.log`.
2. R01: exact five focused specs from handoff -> `focused.log`.
3. R02: history/Projects/Memory component directories plus listed projection/collaboration suites -> `regression.log`.
4. R03: clean `pnpm -C autobyteus-web build` with no installed probe page -> `build.log`.
5. A01: exact production diff/non-Team bolt and source chronology audit -> `audit.txt`.
Results: Planned; update before confidence gate. Ledger required: multiple independent cases, long build/browser execution.

## Broader validation decision / fixture plan
Provisionally **Required — Browser**: repository Icon stubs/happy-dom do not prove actual shape, responsive CSS, keyboard focus. Expected gain to >=95%, every category >=90%. Desktop shell inapplicable; browser cannot certify Electron, live delegation/backend, full worker/page navigation, physical mobile or explicit user acceptance. Those untouched boundaries do not lower glyph-only confidence.

Planned B01 Agent/Team Workspace parent + leaf and stable identities at 1440/768px, pointer/Enter/Space/focus; B02 Org configured/collaborator/delegated projector, disclosure/selection; B03 Task row/detail/closed/failed/Agent SVG/size/openability; B04 Memory configured/task/nested actual group paths, wrapper/group/member intent. Seed test-only fixtures, minimal run history for worker listing, real row/projection/components. Network health/bootstrap GraphQL controlled, fixture publication is not real server evidence. Capture per-case JSON, screenshots, console/page/HTTP errors, exact source diff and cleanup. Browser optional `--ledger-file` appends immediately per case. No production fixture page retained.

## Post-repository confidence scorecard
Pending execution; no score/pass inferred yet. Mandatory categories to fill: requirements, changed-boundary directness, integration/mock gap, environment/fixture fidelity, edge/recovery, user surface, durable regression. Critical rendering proof missing until browser completes. No reroute trigger; proceed to coverage changes and execution.

## Repository checkpoint / broader gate — before browser
Prerequisite build/prepare Pass (`setup.log`). R01 Pass: 5 files / 42 tests; R02 Pass: 41 files / 308 tests (includes R01, not 350 unique tests). R03 Pass: clean Nuxt 20-route production build, no fixture route; warnings only (Browserslist age/chunk size). A01 Pass: exact four executable glyph substitutions, all non-comment bytes otherwise unchanged, model bolt byte-identical; pinned chronology verified. `node --check` durable probe Pass. Commands exactly as planned; R02 complete command retained at log start.

Parent investigation: AgentRunTaskRows consumes real store.taskRows/context.listTaskRows combining collaborator + delegated executions; selects context index coordinator. Team execution rows derive context.view.listNavigationRows (collaborator task_team + catalog copy), then WorkspaceTeamExecutionTree selects stable/transient renderer. Existing projector/source-selector tests directly execute these conversions; Workspace section covers Team headers/image-first/missing/broken avatars. Browser adds real Agent context/store parent and Team public-row parent, not transport or full History page. No invalid existing assertions encountered, no source change needed.

| Mandatory confidence category | Post-repository | Evidence / remaining gap / next gain |
| --- | --- | --- |
| Requirements / AC proof | 90% | Focused choice/interaction/history proven; real current browser glyph still pending |
| Changed-boundary directness | 90% | Actual component templates but Icon stubs; browser resolves actual SVG |
| Integration realism / mock gap | 90% | Real source projection + parent suites; browser integration pending |
| Environment/configuration/identity/fixture fidelity | 95% | Current isolated dependency/production build, supported IDs/shapes; not exact user dataset |
| Edge/lifecycle/recovery | 95% | Leaf, closed/failed/unavailable worker, image-error fallback, memory loading/error and disclosure; no changed lifecycle |
| User surface / browser / shell | 75% | Happy-dom cannot prove CSS/rendered shape/focus; browser required. Shell unchanged/inapplicable |
| Durable regression quality | 95% | Relevant existing 308 cases + registered four-case renderer regression (execution pending) |

Overall **90.00%**, simple mean of seven applicable categories. Target not met; user-surface category below90; critical rendered AC-001/002 not independently proven yet. Broader validation **Required — Browser**, B01..B04 as planned; expected >=95%. Not blocked, no reroute. Real backend/provider/desktop/full navigation remain outside this glyph-only evidence claim, not waived failures.

### Browser authoring attempt 01
B01 reached real SVG/size checks and Agent coordinator selection, then failed Playwright strict locator: both Team row and disclosure button carry `data-member-address`. API-owned test correction only: qualify Team selection with `[role="treeitem"]`, matching intended pointer/key target; no assertion waived or source change. B02..04 unstarted. Failed `browser-01/result.json`/logs/screenshots retained; cleanup all passed. Nuxt printed transient `#app-manifest` pre-transform diagnostics during startup but reached readiness and rendered fixture; classify based on captured browser errors, not assumption of build overlap (no overlap in this round). Rerun exact registered command with fresh browser-02 output after correction.

### Browser authoring attempt 02 investigation
B01 now Pass. B02 count wait includes configured Org disclosure chevron as well as group: the configured selector used all direct `svg.iconify--heroicons` whereas task selectors already exclude their labelled chevrons. Inspected production template confirms configured identity is the existing direct `svg.h-4.w-4`, distinct from 14px chevron. Narrow selector to that identity container and retain exact path/16px assertions (not expected-path filtering). Add bounded 10-second count diagnostic showing expected versus actual rather than generic 120-second wait. API-owned test-only local correction; no behavior assertion or product contract weakened. Await owned attempt cleanup, retain result, then fresh browser-03 rerun.

## Final investigation disposition
**API-REV-001 / Pass**, final confidence **95.71%**, after Required browser validation completed. No production changes at API stage. Durable regression commit `792e17de2bbfdc86841ec33ca7cb0294806a1b08` contains the exact tested probe/fixture bytes (SHA-256 receipt verified after commit). R01/R02/R03/A01 Pass; browser-03 B01..04 Pass, zero browser events/errors; all 18 selected Team identity SVGs matched the nonempty group path. Eight Workspace glyphs checked at both 1440/768px; all surface screenshots retained at both widths. Final screenshot inspection: group silhouettes/alignment, gray Agent initials/status, Org building, Memory role boxes and keyboard focus intact; no in-scope defect. Browser-01/02 authoring failures retained and resolved by strict target selectors, not production edits or waived assertions.

Final scores (same category order): 95/100/95/95/95/95/95%; mean 670/7=95.71%. Direct proof for all critical API-stage ACs; no category below90 or material broader-validation gap for glyph-only scope. Full product/desktop/model, exact installed timing and explicit user acceptance are not claimed. See canonical execution report for confidence rationale, evidence and Delivery actions.

All three attempts closed own browser, exact Nuxt group and temporary route, released both recorded ports. Final PID63880 exited0; ports56317/56318 free. Generated untracked SDK-contract dist created by prerequisite build removed after checks; other ignored worktree dependencies/build outputs retained. **Rebuild `pnpm --filter 'autobyteus^...' build` before later checks.** No user app/data or other worktree touched. Ledger reconciled. A01 repeated through retained `evidence/api-e2e/audit.py`, Pass. No removed durable coverage, no reroute.

## User-requested Electron session — 2026-10-08
After API pass/DR-001 routine verification hold, user explicitly requested: start test Electron for their own testing and import the public agent package after launch. This authorizes isolated manual-test setup, not final acceptance/merge/push/release or installed-app change. Prior API-REV-001 confidence/result remains authoritative; supplemental setup is not a new full-product certification.

Plan: ME-001 build current worktree with documented `pnpm --silent isolated-app start --build --keep`, fresh owned data/free ports, verify health/control endpoint. ME-002 import public `https://github.com/AutoByteus/autobyteus-agents` via actual Settings > Agent Packages UI, then verify installed package/catalog and leave app open for user. Repository identity confirmed by read-only sibling public repository origin, not private agent source. No model turns/credentials/user data copying. Read isolated lifecycle guide/skill and existing Electron probe CDP setup; no concurrent worktree process found; list initially empty. Preserve uncommitted Delivery docs/reports. Build/package/import evidence under `evidence/manual-electron/`; record exact instance ID and stop command for later authorized cleanup. User explicitly wants app retained; do not auto-stop after setup. No durable test/source change needed for requested manual environment provisioning.

### Supplemental disposition — API-REV-002
ME-001/ME-002 Pass: actual current packaged Electron launched with isolated backend/data; real UI public-package import and catalog confirmed. Evidence in execution report/ledger/manual-electron directory. Screenshot inspection agrees with semantic receipts. No additional durable coverage/source edit; user-requested provisioning is one-off, existing glyph regression unchanged. Confidence stays95.71%, not full-product certification. App iso-57073-e937 deliberately retained for manual testing, no auto-cleanup; earlier all-processes-clean statements apply to API-REV-001 only. Delivery remains owner of user acceptance/finalization. No installed-app/user data changes.
