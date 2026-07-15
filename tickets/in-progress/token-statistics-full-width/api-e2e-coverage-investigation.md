# API/E2E Coverage Investigation

## Investigation Meta

- Current Investigation Round: `2`
- Trigger: fresh execution for the user-approved round-4 manual resizable separator at `173848dea69e5095b23f6bdf61f089ff02992325`
- Base: `9fda25eac8fc70df97599758760b47f25620cec8`
- Prior Investigation Reviewed: round 1 at rejected collapsed-header commit `530587a70`; historical evidence only
- Latest Authoritative Investigation: `Round 2`
- Upstream package: `requirements.md`, `investigation-notes.md`, `design-spec.md`, `ui-ux-spec.md`, `design-review-report.md`, `implementation-handoff.md`, and `code-review-report.md` in this ticket directory.

## Round History

| Round | Target | Decision | Status |
| --- | --- | --- | --- |
| 1 | Rejected collapsed-header UI | Browser required; one breakpoint-focus failure | Historical and not evidence for the current UI |
| 2 | Manual separator reset | Repository plus production-browser and Electron-equivalent execution required | Authoritative |

## Current Requirement And Design Basis

The current UI must be the original Settings shell at a fresh desktop width of exactly 256px, with only its existing boundary changed into a zero-layout-width, manually operable separator. Pointer and keyboard input must clamp from 0 through 256; desktop zero must keep the separator hit-testable while making the mounted navigation natively inert and absent from Tab/accessibility; every nonzero width restores interaction. Width is mount-local, survives section changes, and must not alter manager DOM/data/request/scroll state. Below 768px the original stacked navigation returns and exact bidirectional focus recovery applies. Existing routes, Server Settings modes, Back, non-happy statistics states, browser rendering, and the Electron-equivalent renderer remain unchanged.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Material Live Risk | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Backend/API contract | No | No request/schema change | Store/component tests | Request count and fixture fidelity during resize | Browser with intercepted deterministic GraphQL |
| Frontend state/component | Yes | `settings.vue` shell and `useSettingsNavigationResize` | Focused Vitest covers clamp, cleanup, focus, routes | Real geometry, native inert, browser event ordering | Browser |
| Browser user journey/accessibility | Yes | Pointer, keyboard, focus, responsive CSS/DOM/AX | jsdom is indirect | Hit testing, AX tree, Tab and breakpoint focus | Chrome production renderer |
| Desktop renderer | Yes, web-equivalent | Same Nuxt/Vue/CSS renderer | Electron Vitest/build available | Generated target parity | Browser plus Electron generation |
| Electron shell/IPC | No | No main/preload/window changes | Electron suite | Negligible; actual desktop launch adds no boundary proof | No live shell launch |
| Authentication/session | No | None | N/A | None | None |
| Persisted data | No | Width is intentionally in-memory | Source and tests | Remount reset and no storage write | Browser |
| Worker/process/external integration | No | None | N/A | None | None |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-full-width`
- Project: pnpm monorepo; Nuxt 3/Vue 3 browser renderer with Vitest; Electron wrapper.
- No secret, account, or external backend is required. The changed boundary is renderer-only.

| Instruction / Configuration | Learned command or constraint |
| --- | --- |
| `autobyteus-web/package.json` | `pnpm test:nuxt ... --run`, `pnpm test:electron --run`, `pnpm build`, `pnpm generate:electron` |
| `autobyteus-web/nuxt.config.ts`, Vitest configs | Nuxt tests are jsdom/component-level; repository has no durable browser-E2E framework |
| `implementation-handoff.md` | Focused seven-file suite is authoritative; repository typecheck has unrelated pre-existing failures |
| `design-spec.md` / `ui-ux-spec.md` | Exact coordinates, focus transitions, native accessibility, state preservation, and live browser validation are mandatory |

| Component | Setup | Readiness | Cleanup |
| --- | --- | --- | --- |
| Production renderer | `pnpm build`, then ticket-owned static server on port 3317 | HTTP `/settings/` | terminate server and verify port closed |
| Chrome | Playwright Core with local Chrome 150 | page load and semantic selectors | close contexts/browser |
| Data | deterministic GraphQL interception with task/model rows and delayed/error/empty variants | visible manager state and request counters | context destruction; no persistent writes |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Width is ephemeral with no migration or storage. Execution will prove fresh 256px, persistence only within the mounted page, 256px after reload/remount, and no storage/request mutation from resizing.
- No backward-compatible or rejected collapsed-header runtime path should remain.

## Existing Durable Coverage Inventory

| Path / Scenario | Intent | Validity | Action |
| --- | --- | --- | --- |
| `composables/__tests__/useSettingsNavigationResize.spec.ts` | exact styles, bounds, pointer identity/cleanup/body styles, keyboard, inert computed state, focus recovery | Still Valid | Execute; browser supplements native behavior |
| `pages/__tests__/settings.spec.ts` | original shell, separator DOM/ARIA, section-local width, remount reset, routes/modes | Still Valid | Execute |
| Token Statistics component/table/store specs | loading/error/empty, grouping/sort/detail/store state | Still Valid | Execute; browser verifies manager identity and requests |
| `components/__tests__/AppLeftPanel.spec.ts` | workspace shell regression after rejected icon rollback | Still Valid | Execute |
| Prior `execution-evidence/browser-validation.cjs` | rejected header/collapse scenarios | Replace as executable ticket evidence only | Create round-2 separator harness; do not treat old conclusions as current |

No current durable test is stale. The rejected-header tests were already removed during implementation. No new repository-resident browser suite is appropriate in this task because the project has no browser-E2E framework; a deterministic, retained ticket harness supplies direct evidence without introducing a new testing subsystem.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | focused seven-file `pnpm test:nuxt ... --run` | changed shell/composable/statistics contracts | Pass: 7 files / 40 tests | `execution-evidence/manual-separator-round-2/focused-vitest.log` |
| 2 | localization guard/audit; `git diff --check` | localization and patch hygiene | Pass | round-2 evidence logs |
| 3 | `pnpm test:nuxt --run` | broad frontend regression and known baseline | Changed scope Pass; baseline Fail: 354 files / 1,872 tests pass, four known unrelated failures, one skipped | `full-nuxt-vitest.log` |
| 4 | `pnpm test:electron --run` | desktop shell regression | Pass: 23 files / 97 tests; one skipped | `electron-vitest.log` |
| 5 | `pnpm build` and `pnpm generate:electron` | production/browser and Electron renderer bundling | Pass | build logs |

## Post-Repository Confidence And Broader Gate

Post-repository scores: requirement proof 90%, directness 90%, integration realism 88%, fixture fidelity 90%, edge/lifecycle 90%, browser/desktop 82%, durable coverage 95%; average `89.3%`. Critical geometry, hit testing, native AX/Tab, real pointer lifecycle, responsive focus, and mounted-manager request preservation remained indirect. Therefore browser validation was **Required**; repository evidence alone could not pass.

Final result after direct browser and Electron-equivalent execution: `Pass`, 97.1% overall with every category at least 96%; see the canonical execution report.

## Live Environment, Fixture, And Temporary Probe Plan

| Scenario ID | Probe | Direct proof |
| --- | --- | --- |
| `BROWSER-R2-001` | 1440x900 fresh/direct Token | x=256 shared boundary; x=255..256 line; x=252..260 target; unchanged vertical placement; Created Time fit |
| `BROWSER-R2-002` | real pointer drag and hit test | partial/zero/restored geometry, 0..256 clamp, z-order/hitability at x=4, no document overflow |
| `BROWSER-R2-003` | pointer-up/cancel/blur/outside/unmount | cleanup and exact body cursor/user-select restoration |
| `BROWSER-R2-004` | keyboard, DOM, CDP AX tree and Tab | ARIA, native inert, desktop-zero exclusion, any-nonzero restoration |
| `BROWSER-R2-005` | 390x844 and breakpoint transitions | original stack, separator absent, separator→Back and nav→separator focus, no unrelated theft |
| `BROWSER-R2-006` | section/reload navigation | direct Token stays 256, width session persistence, remount reset |
| `BROWSER-R2-007` | deterministic statistics fixture | same manager/table nodes, values/group/date/sort/detail/scroll and no resize-only request |
| `BROWSER-R2-008` | delayed/error/empty phases | non-happy states remain usable and no resize-only request |
| `BROWSER-R2-009` | direct routes/modes/embedded fallback/Back | unchanged route behavior |
| `BUILD-R2-001/002` | Nuxt build and Electron generate/test | browser and Electron-equivalent bundling/regression |

The script and JSON/screenshots will be retained under `execution-evidence/manual-separator-round-2/` as reproducible ticket evidence, not durable test code. Browser processes, contexts, server, and intercepted state will be cleaned up. Actual Electron launch is unnecessary because no shell-specific code changed and browser execution exercises the identical renderer boundary.

## Ambiguities Or Reroute Triggers

None before execution. Any failed critical current requirement will be recorded against its scenario/AC and routed to `code_reviewer` for focused failure-origin review.

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Durable Coverage Added / Updated / Removed: `No`
- Broader validation: `Required and completed — production browser`, plus Electron suite/generation
- Reroute Required Before Execution: `No`
