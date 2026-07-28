# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/ui-ux-spec.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/solution-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-revision-record.md`
- Prior API/E2E Coverage Investigation: This canonical file's API-REV-001 state is historical and superseded by SR-001/IR-002; it is not current sign-off.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2` (fresh validation for revised contract)
- Trigger: Implementation rework/source review pass CRR-003 for commit `38327b315`; prior icon-only contract explicitly superseded.
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The current approved contract is the revised explicit-text clarity pass. A configured, non-active Gemini row must show a visible localized `Use this mode` text button; the action must remain a real button with the existing title, `aria-label="Use this mode: <option>"`, `data-testid`, click payload, disabled semantics, focus/hover treatment, and at least 44px height. During activation it must show the existing spinner plus visible localized `Activating...` text, remain disabled, and omit idle action text. An active configured row must show visible localized `Active` badge/text, retain its active test hook/title, active row background/left accent and screen-reader status, and omit an activation action. Not-configured options and all non-Gemini/API/persistence behavior remain unchanged. The superseded Iconify/check-circle contract must not be asserted or used as current evidence.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` configured non-active action | Changed | Revised `requirements.md`, `design-spec.md`, `ui-ux-spec.md`, SR-001/IR-002, CRR-003 | Fresh tests/browser assert visible text and absence of Iconify/icon-only presentation. |
| `BEH-002` pending activation | Preserved and clarified | Revised design and implementation source | Fresh component and browser-held-mutation checks assert spinner, Activating text, disabled state, and no idle text. |
| `BEH-003` active state | Changed | Revised requirements/design and CRR-003 | Fresh DOM/browser checks assert visible Active badge/text and no activation button. |
| `BEH-004` command/accessibility/state behavior | Preserved | Revised behavior map and implementation review | Focused tests retain click payload, ARIA/title, gating, save/refresh and disabled assertions. |
| `BEH-006` responsive visual distinction | Changed | Revised requirements AC-005 and UI/UX supplement | Browser checks at 768px verify wrapped text button remains inside viewport, min-height, and no horizontal overflow. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | No | None | No backend files changed; test server serves existing contract. | None. | None. |
| API/transport/contract | No | None | Existing provider/Apollo tests; GraphQL state query used unchanged. | No contract behavior changed. | Live test server route. |
| Frontend component/state | Yes | Gemini card action and active-state presentation. | Focused 7/7 tests; provider suite; browser DOM/state assertions. | Pixel comparison baseline not formalized. | Browser. |
| Browser integration/user journey | Yes | Settings → API Keys → Gemini route. | `pnpm dev:test` test server + Nuxt frontend; Chrome route exercised. | Test-server state is deterministic/local, not production. | Browser at desktop/narrow widths. |
| Authentication/session/permissions | No | None. | No auth code changed. | N/A. | None. |
| Desktop renderer/web-equivalent UI | Yes | Nuxt/Vue DOM/CSS in renderer. | Chrome against current worktree dev server. | Electron shell not exercised. | Browser is appropriate. |
| Desktop shell/Electron integration | No | None. | No Electron files changed. | N/A. | None. |
| Process/lifecycle | No | None. | No lifecycle behavior changed. | N/A. | None. |
| Persisted-data transition | No | Presentation-only; approved `Directly Usable — No Migration`. | Requirements/handoff/IR-002. | N/A. | None. |
| Worker/queue/distributed coordination | No | None. | No such code changed. | N/A. | None. |
| External integration | No | None. | No external provider call needed for text/badge render. | No production credential required. | None. |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance`
- Stack: Nuxt 3.21.1 / Vue 3.5.28 / Vite 7.3.1 / Vitest 3.2.4 / Playwright Core with installed Chrome; root `pnpm dev:test` starts built test backend on 8000 and Nuxt frontend on 3000.
- Instructions consulted: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/README.md`, `autobyteus-web/README.md`, `autobyteus-web/AGENTS.md`, `autobyteus-web/GEMINI.md`, `autobyteus-web/package.json`, `autobyteus-web/vitest.config.mts`, and `test-support/live-e2e/run-test-dev.mjs`.
- Required secrets: `N/A`; local test runtime uses its own data directory and no credential was recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| Workspace `README.md` | Monorepo setup/project map | Use pnpm workspace; frontend is `autobyteus-web`. |
| `autobyteus-web/AGENTS.md`, `GEMINI.md` | Web testing guidance | Colocated tests; `pnpm test:nuxt ... --run`; guards are project scripts. |
| `autobyteus-web/README.md` | Dev/browser instructions | Browser dev path; explicit Chrome executable may be needed. |
| Root `package.json` | Test-dev command | `pnpm dev:test` builds server, starts test backend on 8000 and Nuxt on 3000. |
| `test-support/live-e2e/run-test-dev.mjs` | Exact environment/setup | Sanitized test runtime, backend port 8000, frontend `pnpm dev --host 127.0.0.1 --port 3000`. |

| Component / Dependency | Working Directory | Start / Setup Command | Readiness Check | Cleanup / Ownership |
| --- | --- | --- | --- | --- |
| Test backend | Worktree root | Started by `pnpm dev:test`; built server on 8000 | `/rest/health` returned `status: ok` | Started for user inspection; intentionally retained pending user request. |
| Nuxt test frontend | `autobyteus-web` | Started by `pnpm dev:test` on 3000 | `/settings` returned HTTP 200; Nuxt reported ready | Intentionally retained pending user inspection. |
| Chrome/Playwright | `autobyteus-web` | Inline temporary Node probe; installed Chrome executable | DOM, CSS, viewport and state assertions passed | Browser contexts closed after probes. |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- References: revised `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `implementation-revision-record.md`.
- Representative existing-data setup: None required; source only changes presentation.
- Evidence: focused component/runtime tests and current test server; no migration or data-shape path touched.
- Reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Current Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts` | Gemini rows, text action/active badge, event, pending, gating, save/refresh | `AC-001`–`AC-005` | Still Valid | Revised 7 tests passed. | Retain; no API/E2E durable change. |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Parent provider manager and specialized Gemini UI | `AC-004`/`AC-006` | Still Valid | Included in 26-test provider run. | Retain/rerun. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` | Gemini commands, activation state/fencing | `AC-002`/`AC-003` | Still Valid | Included in 26-test provider run. | Retain/rerun. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` | Provider transport query contract | Out of changed scope | Out Of Scope | Included and passed; existing Apollo stderr only. | Retain; no changes. |
| Prior API-REV-001 browser/component evidence | Initial check-circle contract | Superseded by SR-001/IR-002 | Stale / superseded for current sign-off | Historical only. | Do not reuse as current evidence; current reports replace it. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior `API-REV-001` icon assertions/evidence | Iconify `heroicons:check-circle` / icon-only action | Revised approved contract explicitly removes icon-only/check-circle presentation. | SR-001, revised requirements/design, CRR-003 | Revised focused text/badge assertions and fresh browser evidence. | Historical artifacts remain for traceability only. |

## Durable Coverage To Add / Update / Remove

- Add: None. The revised durable component test is already implemented and source-reviewed; no repository browser harness exists for this local UI leaf.
- Update in this API/E2E round: None; rerun existing current tests.
- Remove: None in this round. Superseded assertions were removed by IR-002 and are covered by source review.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary/Scenario | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts --run --reporter=verbose` | Direct revised Gemini states | Pass, 1 file / 7 tests | `evidence-revision-002/focused-gemini-vitest.log` |
| 2 | `pnpm test:nuxt components/settings/providerApiKey components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run --reporter=dot` | Provider API-key + parent manager | Pass, 6 files / 26 tests | `evidence-revision-002/provider-api-key-vitest.log` |
| 3 | `pnpm guard:localization-boundary` | Revised localized text usage | Pass | `evidence-revision-002/guards.log` |
| 4 | `pnpm guard:web-boundary` | Web boundary | Pass | `evidence-revision-002/guards.log` |
| 5 | `pnpm audit:localization-literals` | Localization literals | Pass, zero unresolved | `evidence-revision-002/guards.log` |
| 6 | Targeted `git diff --check` on changed source/test paths | Changed files | Pass | `evidence-revision-002/diff-check.log` |
| 7 | `pnpm dev:test` + readiness curls | Real test backend/frontend setup | Pass; ports 8000/3000 ready | `evidence-revision-002/dev-test-readiness.txt` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Support | Remaining Uncertainty | Additional Validation |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | Revised focused 7/7 plus browser desktop/narrow/pending assertions cover AC-001–AC-005. | No production credential/provider call; not required for text/badge rendering. | None material. |
| Changed-boundary execution directness | 95% | Direct component tests and compiled Nuxt route execute current text/badge source. | Browser state fixture intercepts Gemini config for deterministic configured states. | Current test server now exposes configured AI Studio + active Vertex Express state. |
| Cross-boundary integration realism/mock gap | 95% | Real test backend, GraphQL transport, provider manager route, and Vue renderer; activation mutation was held/read-only in pending check. | No external Gemini API call. | Not needed for presentation-only scope. |
| Environment/configuration/fixture fidelity | 95% | Project `pnpm dev:test`, sanitized test runtime, Chrome, 1440px and 768px viewports. | Test runtime is not production deployment. | None material. |
| Failure/edge/lifecycle/recovery evidence | 95% | Pending held mutation shows spinner/Activating/disabled; active/non-active/unavailable and focus/hover checked. | Electron shell not exercised; unchanged/out of scope. | None material. |
| User-surface/browser/desktop-shell confidence | 95% | Actual current worktree Settings route, CSS hover/focus, narrow wrapping, badge and text inspected in Chrome. | No pixel-diff baseline. | None required for narrow local text correction. |
| Durable regression coverage quality/relevance | 95% | Current focused test and adjacent provider suite pass; no durable API/E2E test changed. | Browser probe is temporary. | Keep test as component-level durable coverage. |

- Overall post-repository confidence: `95%` (simple average).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default clean target met: `Yes` after repository and browser validation.
- Residual risks: Test-server browser state is deterministic/local; 320px full Settings shell places the provider detail panel off-canvas due existing two-column ProviderModelBrowser layout, so narrow evidence uses 768px where the Gemini card is visible, wraps, stays within the viewport, and has no page overflow. This is an existing surrounding-layout concern, not introduced by the card change.

## Broader Validation Decision

- Decision: `Required` and completed.
- Mode: `Browser` with project-supported `pnpm dev:test` environment.
- Gap addressed: Actual visible text/badge rendering, no Iconify/icon-only presentation, hover/focus, pending state, and narrow wrapping.
- Rationale: Unit tests cannot prove CSS layout, rendered text positioning, or live pending transition.
- Browser approach: Real current worktree frontend/test backend on ports 3000/8000; Playwright route response for Gemini setup state and held activation mutation avoids external credentials and persistent mutation.
- Expected/final confidence: 95%.
- If blocked: Not applicable.

## Desktop Application Validation Decision

- Shell: Electron; no shell-specific code changed.
- Web-equivalent behavior: Settings/Gemini DOM and CSS; validated in Chrome.
- Shell-specific behavior: None introduced.
- Approach: Browser only, per project guidance; no desktop app disturbed.
- Behavior not directly proven: Preload/IPC/package lifecycle, not relevant to this presentation-only patch.

## Live Environment And Fixture Plan

- Startup: `pnpm dev:test` at worktree root; server build then test backend 8000 and Nuxt frontend 3000.
- Readiness: backend health 200; frontend `/settings` HTTP 200; GraphQL test state observed.
- Data/identity: No credentials; deterministic Gemini response in Playwright for configured AI Studio/non-active plus active Vertex Express. Activation mutation held and fulfilled in-memory.
- Journeys: Open Settings, select Gemini, inspect desktop text/badge, hover/focus, inspect 768px wrap, click text button and inspect pending, release mutation.
- Evidence: logs, DOM/CSS metrics, screenshots under `evidence-revision-002/`.
- Cleanup: browser contexts closed; `pnpm dev:test` intentionally retained for user inspection and must be stopped after explicit user completion.

## Temporary Executable Validation Plan

| Scenario ID | Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| `API-GEMINI-201` | Playwright + current `pnpm dev:test`, configured state | Visible Use this mode, Active badge, no icon-only action, semantics | No existing project Gemini browser fixture; component test is durable layer. |
| `API-GEMINI-202` | 768px Chrome viewport | Wrapped text action, 44px min height, no horizontal overflow | Temporary browser probe; repository has no reusable Gemini E2E harness. |
| `API-GEMINI-203` | Held `UseGeminiMode` GraphQL request | Spinner, Activating text, disabled state, no idle text | In-memory request hold is an executable probe, not a durable fixture. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-up |
| --- | --- | --- | --- |
| Production Gemini API credentials/activation | Presentation-only change; no safe credential fixture and external call unnecessary. | Low. | None. |
| Electron shell/IPC | No shell-specific code changed. | Low/out of scope. | None. |
| 320px whole Settings route detail panel | Existing ProviderModelBrowser two-column layout places the detail panel off-canvas at this viewport. | Surrounding-layout risk, not card contract defect. | If the product requires 320px full-route support, separate design/implementation ticket. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| At 320px viewport, existing ProviderModelBrowser two-column layout puts the detail panel outside the visible shell; 768px card-level narrow rendering wraps correctly and remains in viewport. | `Unclear` / out-of-scope surrounding layout | `evidence-revision-002/browser-text-contract.log` initial 320 probe; current final 768 probe and screenshot. No ProviderModelBrowser file changed. | `solution_designer` only if 320px whole Settings support is a requirement; otherwise document residual risk. |

## Investigation Decision

- Proceed to API/E2E execution: `Yes`; completed.
- Durable API/E2E coverage changes: `No`.
- Post-repository/final confidence: `95%`.
- Broader validation: `Required`, completed in Chrome.
- Reroute required before validation execution: `No`.
- Notes: API-REV-001 remains historical for the superseded check-circle contract. Current sign-off is based only on API-REV-002 and the revised text/badge requirements.
