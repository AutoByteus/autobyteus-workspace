# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/code-review-report.md`
- Implementation Live Visual Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/implementation-live-visual-report.md`
- Current Investigation Round: `3`
- Trigger: Code-review Round 5 pass for branch `codex/frontend-responsive-ux-audit`; the current implementation-source gate re-confirmed the reviewed responsive source at HEAD `f614a42cb`, so API/E2E must re-investigate and re-execute against this current worktree state.
- Prior Investigation Reviewed: `Round 1` historical API/E2E investigation in this same file path. Round 1 added/updated durable coverage and was later reviewed, but it is superseded as sign-off by implementation-owned Round 4 visual/source/probe changes.
- Latest Authoritative Investigation: `Round 3`

## Current Requirement And Design Basis

The approved behavior remains a single adaptive standard `/workspace` route rather than a route-level desktop/mobile split. Standard `/workspace` must render visible workspace content and controls across the comprehensive responsive family; must eliminate the blank `640-767px` band; must remove the legacy `<640px` standard-route `Running / Agent` mobile-tab model; must preserve a practical center workspace at constrained width/short height by changing left/right presentations; must expose primary controls in `Work -> Runs -> Files -> Tools` order; must keep right tools in canonical `Files -> Team(if applicable) -> Terminal -> Activity -> Artifacts -> Browser -> VNC` order; and must preserve `/mobile` as the independent `MobileRemoteAccessShell` phone/PWA route.

The implementation handoff's `Legacy / Compatibility Removal Check` was read before finalizing this investigation. It reports a clean replacement of the old standard-route desktop/mobile split, no backward-compatibility wrappers, and no retained legacy fallback behavior. Current static inspection confirms the active standard `/workspace` route imports `WorkspaceAdaptiveLayout` only, and live-source search found old `WorkspaceMobileLayout` / `WorkspaceDesktopLayout` names only in generated localization catalogs, historical ticket docs, explicit negative tests, and the responsive probe's legacy-regression selectors.

Code review Round 4 is the latest authority. It passed the current implementation after additional live visual/source/probe updates: compact right-side tabs, phone drawer close/top offset, stacked phone drawer file layout, hidden redundant drawer toggle, and additional durable probe assertions for clipped docked/drawer tabs. The existing ticket API/E2E artifacts before this update are historical and not current sign-off.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Standard `/workspace` route always mounts the adaptive layout | Changed | FR-001/FR-002/FR-006; design migration; `pages/workspace.vue` now imports `WorkspaceAdaptiveLayout` | Re-run browser matrix and focused tests against current code, asserting adaptive root and center shell are visible. |
| Blank `640-767px` standard workspace band | Removed | AC-001, AC-009, AC-015; investigation P0 failure model | Probe must validate `640x700`, `700x700`, and `767x700` are not blank and have visible adaptive workspace content. |
| Legacy `<640px` standard workspace `Running / Agent` model | Removed | FR-005/FR-006; AC-005/AC-011; implementation removal of old route branch and `useMobilePanels` | Probe and tests must verify canonical standard workspace controls instead of legacy `Running / Agent` main navigation. |
| 768-1024 constrained widths | Changed | AC-003/AC-004; CR-001 remains resolved in Round 4 | Probe must validate center width and reachable `Runs`/right tools, including the 1024 left-strip plus right-docked band. |
| Short-height windows | Changed | FR-008; AC-006; design short-height mode | Probe must include `500x420`, `800x420`, and `1024x480` and assert recoverable primary controls without unrecoverable full docks. |
| Right-side tabs fit in docked and drawer presentations | Changed in Round 4 | Implementation live visual report finding 1; Round 4 code review scope/results | Existing durable probe now includes docked/drawer tab clipping checks and should be executed unchanged. |
| Phone-width drawer close/top offset and right drawer file layout | Changed in Round 4 | Implementation live visual report findings 2-4; `RightSideTabs` drawer mode and `FileExplorerLayout` stacked layout | Focused component tests plus browser probe interactions must validate shell-level drawer reachability/tab fit. |
| Canonical primary and right-tool ordering | Added/Changed | FR-012/FR-013/FR-014; AC-011/AC-012/AC-013 | Execute order catalog/component tests and observe browser controls where visible. |
| Wide desktop material behavior | Preserved | FR-003; AC-002 | Probe must verify `1280x800` and `1440x900` keep docked left/right with practical center width. |
| `/mobile` phone/PWA route | Preserved | FR-007; AC-007; design DS-005; Round 4 code review | Browser probe must assert `/mobile` renders `MobileRemoteAccessShell` and not `WorkspaceAdaptiveLayout`; mobile tests remain valid. |
| Docs for local startup and responsive layout/probe | Changed | FR-011; AC-010; implementation handoff docs section | API/E2E records runtime env used; delivery owns integrated docs sync/final branch refresh. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` | Browser-level matrix for `/workspace` across 17 viewports plus `/mobile`; checks adaptive root, non-blank center, center width, primary order, right tool order, drawer/right-tab fit, legacy model absence, and `/mobile` isolation | UC-009; FR-015; AC-001 through AC-007, AC-009, AC-011, AC-012, AC-014, AC-015 | Still Valid | Round 4 code review passed current probe edits; `node --check` passes; source inspection shows added docked/drawer tab fit assertions and current matrix. | Execute as current durable E2E coverage; no source edit planned. |
| `autobyteus-web/package.json` script `test:e2e:workspace-responsive` | Exposes the durable probe through package script | FR-015; AC-014/AC-015 | Still Valid | Script points to `node tests/e2e/workspace-responsive-probe.mjs`; Round 4 code review passed. | Execute script against live local runtime. |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Pure responsive policy tests for dock/strip/drawer boundaries, `639/640/700/767`, `768/800`, `1024`, wide, short-height, center minimum, and right presentation | FR-001/FR-002/FR-004/FR-008/FR-009/FR-010; AC-001/AC-003/AC-004/AC-006/AC-008 | Still Valid | Source inspection shows assertions target current shared policy and 1024 left-strip/right-docked state. | Execute focused Nuxt suite. |
| `autobyteus-web/utils/layout/__tests__/workspaceSurfaceOrder.spec.ts` | Canonical primary surface and right-tool order catalogs | FR-012/FR-013; AC-011/AC-012 | Still Valid | Source inspection shows `work/runs/files/tools` and canonical tool sequence with contextual filtering. | Execute focused Nuxt suite. |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Adaptive layout renders active center, shrink-safe center/right split, clipped center shell, narrow primary controls, 1024 Runs access, constrained right-tool presentation | FR-001/FR-005/FR-006/FR-009/FR-012; AC-001/AC-003/AC-004/AC-005/AC-011 | Still Valid | Source inspection shows tests target current adaptive owner and no old desktop/mobile branch. | Execute focused Nuxt suite. |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | Right tab content shell, compact density, mobile-tools filtering, drawer stacked file layout, hidden drawer toggle, and files/tab behavior | FR-013; AC-012 plus Round 4 visual polish | Still Valid | Round 4 edits are represented by compact density, stacked file layout, and hidden drawer toggle assertions. | Execute focused Nuxt suite. |
| `autobyteus-web/components/tabs/__tests__/TabList.spec.ts` | TabList forwards comfortable/compact density to tabs | Round 4 right-tab fit polish; AC-012 support | Still Valid | Source inspection confirms compact density test aligns with Round 4 clipped-tab fix. | Execute focused Nuxt suite. |
| `autobyteus-web/composables/__tests__/useRightPanel.spec.ts` | Right-panel preferred width, center-minimum clamping, and temporary narrow clamp behavior | FR-009; AC-003/AC-004; CR-002 | Still Valid | Code review Round 4 records CR-002 resolved; source tests match current clamp behavior. | Execute focused Nuxt suite. |
| `autobyteus-web/composables/__tests__/useRightSideTabs.spec.ts` | Browser tab remains visible when Browser shell is available without sessions | AC-012 supporting right-tool catalog behavior | Still Valid | Supports right-tool availability; unchanged by Round 4. | Execute if included in focused suite; not required for browser sign-off if time constrained. |
| `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`, `pages/__tests__/mobile-root*.spec.ts`, `utils/__tests__/mobileFeatureGates.spec.ts`, `middleware/__tests__/mobileFeatureGate.global.spec.ts` | `/mobile` phone/PWA shell, mobile feature gates, no desktop workspace imports/links | FR-007; AC-007 | Still Valid | Existing tests assert `MobileRemoteAccessShell` boundaries and no stale desktop workspace routing; browser probe also covers `/mobile`. | Execute core mobile shell test and browser `/mobile`; broader mobile route/gate tests are supporting coverage if needed. |
| `autobyteus-web/layouts/__tests__/default.spec.ts` | App shell shrink, immersive shell suppression, route menu close behavior | FR-004/FR-010; AC-003/AC-004/AC-006 plus pre-existing host-shell invariants | Still Valid | Historical Round 1 updated stale assertion; Round 4 code review reran/passed the current file. | Execute focused Nuxt suite. |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` and `autobyteus-web/components/__tests__/AppLeftPanel_v2.spec.ts` | Left-panel navigation/running-panel hooks and source policy ownership | FR-010; AC-003/AC-004/AC-006 support | Still Valid | Code review Round 4 included them in prior focused checks; still aligned with shell-left behavior. | Execute focused Nuxt suite. |
| `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts` | Old desktop layout tests | Legacy `WorkspaceDesktopLayout` no longer owns standard workspace | Stale / Remove | File was removed before current code-review pass; no current repository-resident test remains. | No API/E2E action; record as already cleaned. |
| `tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs` and `current-responsive-ui-results.json` | Pre-fix investigation baseline failures | UC-009; AC-014/AC-015 baseline only | Replace | These files intentionally describe old failure classes and old selectors; not current validation. | Keep as historical evidence; use current `tests/e2e/workspace-responsive-probe.mjs` and fresh `probes/api-e2e/` output for sign-off. |
| Historical `tickets/frontend-responsive-ux-audit/probes/api-e2e/*` results | Round 1 API/E2E output from an earlier implementation state | AC-014/AC-015 | Replace | Code review Round 4 says historical API/E2E artifacts are superseded by later implementation changes. | Overwrite/recreate canonical API/E2E probe output from the current Round 4 state. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/layout/__tests__/WorkspaceDesktopLayout.spec.ts` | Old `WorkspaceDesktopLayout` is the standard workspace layout owner | Reviewed implementation replaces old split with `WorkspaceAdaptiveLayout`; old file/test already removed | Requirements FR-002/FR-006, design legacy removal policy, implementation handoff, code-review Round 4 pass | `WorkspaceAdaptiveLayout.spec.ts`, policy tests, and browser responsive probe | N/A |
| `tickets/frontend-responsive-ux-audit/probes/comprehensive/probe-current-responsive-ui.mjs` as final validation | Old selectors/failure baseline for pre-fix state | It is investigation evidence, not current expected behavior | Comprehensive report and requirements AC-014/AC-015 say the matrix should become current validation | Durable `autobyteus-web/tests/e2e/workspace-responsive-probe.mjs` and fresh `probes/api-e2e/` results | N/A |
| Historical Round 1 `tickets/frontend-responsive-ux-audit/probes/api-e2e/*` as final sign-off | Earlier API/E2E pass before implementation-owned Round 4 visual/source/probe changes | Current code review explicitly supersedes that state | Code-review Round 4 timeline note | Fresh Round 2 execution output in the same canonical evidence folder | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `N/A` | No new repository-resident durable coverage is planned in this Round 2 investigation. | Round 4 code review already passed the current durable probe and component/policy coverage. | `N/A` | Current durable coverage is adequate for the shell-level requirements; API/E2E will execute it. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `N/A` | No repository-resident durable coverage update is planned before execution. | `N/A` | `N/A` | If current execution exposes stale or missing durable coverage, this investigation will be updated before any edit and routing will return through `code_reviewer`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `N/A` | No API/E2E removal planned. | `N/A` | `N/A` |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `RESP-E2E-RUNTIME-001` | Start built backend with isolated SQLite data dir on `127.0.0.1:13001`; start `autobyteus-web` Nuxt dev server on `127.0.0.1:13002` with `BACKEND_*` env; run `pnpm -C autobyteus-web test:e2e:workspace-responsive -- --base-url http://127.0.0.1:13002 --output-dir ../tickets/frontend-responsive-ux-audit/probes/api-e2e`. | End-to-end browser rendering of current standard `/workspace` and `/mobile` route boundary in a live local frontend/backend runtime. | Runtime processes, isolated data dir, logs, screenshots, and JSON are task evidence. The reusable probe script is already durable coverage and will remain in the repo. |
| `RESP-E2E-SUPPORT-001` | Focused Nuxt/component/source tests plus guards/build run from the current worktree. | Current durable policy/component/mobile/shell coverage and project-level static/build sanity. | Logs are task evidence; tests themselves already exist as repository coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Deep internal responsive UX of every Terminal, Browser, VNC, Artifacts, and Files panel state | Approved requirements and code-review residual risk scope this ticket to shell-level reachability, ordering, center sizing, drawer/docked fit, and `/mobile` isolation; the probe opens/observes shell controls but does not exhaust every internal tool workflow. | A particular tool's internal content may still need later responsive polish even though the shell makes it reachable. | Record as residual risk; no reroute unless execution reveals an unrecoverable shell-level defect. |
| Packaged Electron/native desktop rendering | Changed boundary is Nuxt/web responsive shell; production build and web browser execution cover current acceptance criteria. | A packaged-only CSS/runtime issue is possible but outside current criteria. | Delivery/release can add packaged smoke only if release scope later requires it. |
| Production deployment | Not part of this API/E2E stage. | Deployment configuration drift is possible but not indicated. | Delivery owns final integrated-state docs/release checks. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `N/A` | `N/A` | No ambiguity or compatibility/legacy reroute trigger identified before execution. | `N/A` |

## Execution Plan

1. Preserve the current repository-resident durable coverage unchanged unless execution produces new validity evidence.
2. Recreate the canonical API/E2E evidence folder for the current Round 4 state: `tickets/frontend-responsive-ux-audit/probes/api-e2e/`.
3. Start backend from `autobyteus-server-ts/dist/app.js` on `127.0.0.1:13001` with an isolated API/E2E SQLite data directory.
4. Start `autobyteus-web` Nuxt dev server on `127.0.0.1:13002` with explicit `BACKEND_*` endpoints pointing to the local backend.
5. Execute `pnpm -C autobyteus-web test:e2e:workspace-responsive -- --base-url http://127.0.0.1:13002 --output-dir ../tickets/frontend-responsive-ux-audit/probes/api-e2e` and save a command log under `tickets/frontend-responsive-ux-audit/evidence/`.
6. Execute focused durable source/component coverage for the current scope: responsive policy, workspace surface order, `WorkspaceAdaptiveLayout`, `RightSideTabs`, `TabList`, `useRightPanel`, mobile shell, default shell, and left-panel tests.
7. Execute sanity/static checks: `git diff --check`, `node --check` for the probe, `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, and `pnpm -C autobyteus-web build`.
8. Stop runtime processes, verify API/E2E ports are not listening, and write the canonical execution coverage report.
9. If all current coverage passes and no repository-resident durable coverage is changed by API/E2E in this round, route the cumulative package to `delivery_engineer`. If API/E2E changes durable coverage, route back to `code_reviewer` first.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Round 2 investigation supersedes historical Round 1 sign-off. The current durable probe and focused tests are valid for the Round 4 implementation state and will be executed unchanged. No durable coverage edits are planned; successful execution should proceed to delivery.

## Round 3 Current-State Addendum

- Investigation date: `2026-07-15`.
- Current branch / HEAD: `codex/frontend-responsive-ux-audit` / `f614a42cba6b9c88342388036339e7264e13629a`.
- Upstream gate: implementation-source code review Round 5 `Pass` at `/Users/normy/autobyteus_org/autobyteus-worktrees/frontend-responsive-ux-audit/tickets/frontend-responsive-ux-audit/code-review-report.md`.
- Scope recheck: the active responsive production source under `autobyteus-web` remains unchanged from the reviewed implementation checkpoint; no API/E2E-owned durable test file is modified in the current worktree.
- Existing durable coverage decision remains `Still Valid` for the responsive browser probe, responsive policy/order tests, adaptive layout/right-tabs/tab-list/right-panel tests, mobile shell, default shell, and left-panel tests. No durable coverage is added, updated, or removed in this round.
- Required broader validation decision: `Required`. The change is user-surface responsive behavior with route, viewport, drawer/strip, ordering, and browser-rendering risk; repository tests alone are indirect for these boundaries.
- Planned real surface: isolated local Node backend plus Nuxt browser development server, headless Google Chrome, current durable probe across all 17 approved `/workspace` viewports plus `/mobile`, then focused repository checks, build, and cleanup.
- Environment constraints recorded before execution: backend requires a data-dir `.env`; the final run explicitly set `AUTOBYTEUS_SERVER_HOST`, `DATABASE_URL`, `APP_ENV=test`, and SQLite paths to keep the server isolated from the user's running desktop backend.
- No requirement gap, design impact, unclear validity decision, compatibility wrapper, persisted-data transition, or API/E2E local fix was discovered.
- Authoritative execution evidence is recorded in `api-e2e-execution-coverage-report.md` and `probes/api-e2e/`. Earlier startup attempts with an incorrect health readiness predicate, a post-build run without the backend, and one command launched from the superrepo root are setup-control evidence only; they are not product failures and were followed by a clean final run.
