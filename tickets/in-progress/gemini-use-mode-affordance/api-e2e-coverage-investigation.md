# API/E2E Coverage Investigation

## Current authoritative round

- Ticket: `gemini-use-mode-affordance`
- Role: `api_e2e_engineer`
- Current revision: `API-REV-004`
- Trigger: renewed source review `CRR-008` for `F-001`/`IR-005`, commit `67d047d3f`.
- Current contract: configured non-active Gemini rows expose visible localized `Activate` action text; active rows expose visible localized `Active` badge/text and no activation action; pending activation shows spinner plus visible localized `Activating` text, remains disabled, and omits idle `Activate`. Existing locale keys, event/ARIA/test IDs, gating, and provider behavior remain unchanged.
- Prior API/E2E round: `API-REV-003` validated a superseded plain-check/icon-only contract and is historical only; it is not current sign-off.
- Result of this investigation/execution: `Pass`, final confidence `95%`.

## Upstream basis and supplemental artifacts

The complete current basis was read before validation:

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/requirements.md`
- Investigation notes: this file
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/design-spec.md`
- UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/ui-ux-spec.md`
- Solution, implementation, and source-review revisions: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/solution-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/implementation-handoff.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/implementation-revision-record.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/tickets/in-progress/gemini-use-mode-affordance/code-review-revision-record.md`
- Locale source files: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/localization/messages/en/settings.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance/autobyteus-web/localization/messages/zh-CN/settings.ts`

The handoff's compatibility and persisted-data checks are clean: presentation-only scope, no migration, no legacy runtime branch.

## Changed boundaries

| Boundary | Classification | Validation need |
| --- | --- | --- |
| `GeminiConfigurationOptionCard.vue` | Frontend component/rendering | Visible idle action, pending text/spinner substitution, active/no-action branch, fixed minimum hit-area |
| Provider setup state and mutation | Frontend/API GraphQL boundary | Configured/non-active, active, unavailable gating, pending mutation behavior |
| Nuxt/browser rendering and CSS | Web-equivalent desktop renderer | Hover/focus, narrow layout, pending geometry and overflow |
| English and Simplified Chinese localization | Locale/runtime surface | Idle, active, pending labels and ARIA/title resolve through supported locale keys |
| Electron shell, persisted data, external Gemini provider | Out of scope | No shell, schema, provider-network, or migration logic changed |

## Existing durable coverage inventory and validity

| Coverage path | Existing behavior | Decision for current contract | Reason |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts` | 1 file / 7 tests covers configured, active, pending, unavailable, activation event, and semantics | `Still Valid` and rerun | Current implementation-owned assertions require visible `Activate`, pending `Activating...` plus spinner/disabled and no idle label, visible Active, event/gating, and preserved IDs/ARIA. |
| `autobyteus-web/components/settings/providerApiKey/**` plus `ProviderAPIKeyManager.spec.ts` | Provider manager and adjacent settings coverage | `Still Valid` and rerun | Guards provider integration and neighboring state/API behavior. |
| Prior API-REV-003 plain-check/icon-only assertions/evidence | Plain icon and fixed icon-only geometry | `Stale / historical` | Superseded by SR-003. Must not be reused or treated as sign-off. |
| Repository API/browser E2E harness | No durable scenario specific to this card was found | `Use Temporary Executable Probe Only` | A temporary live browser probe is sufficient for this presentation-only change; no durable API/E2E test change is justified in this round. |

No durable API/E2E test was added, updated, removed, or promoted in this round. Temporary browser evidence is not test-code change.

## Validation plan and requirement mapping

| Scenario | Requirement / acceptance | Planned evidence |
| --- | --- | --- |
| `API-GEMINI-401` | Configured non-active row visibly exposes localized `Activate`, enabled, title/ARIA/test ID and exact activation event path | Focused Vitest plus actual Chrome English and Chinese route |
| `API-GEMINI-402` | Active row visibly exposes localized Active badge/text and no activation action | Focused Vitest plus Chrome DOM inspection in both locales |
| `API-GEMINI-403` | Pending activation visibly shows localized `Activating...`, spinner, disabled state, no idle `Activate`, preserved geometry | Focused Vitest plus held GraphQL request in Chrome English and Chinese |
| `API-GEMINI-404` | Narrow layout remains usable and does not overflow | Chrome at 768px card-level viewport |
| `API-GEMINI-405` | Hover/focus affordances and accessibility metadata remain usable | Chrome computed hover/focus styles and semantic attributes |
| `API-GEMINI-406` | Unavailable/not-configured rows remain gated; provider/localization/web boundaries remain intact | Chrome row gating, provider suite, guards/audit |

## Project execution discovery

Authoritative project path used:

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance`
- Frontend package: `autobyteus-web`
- Focused test command: `pnpm test:nuxt components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts --run --reporter=verbose`
- Adjacent suite command: `pnpm test:nuxt components/settings/providerApiKey components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run --reporter=dot`
- Guard commands: `pnpm guard:localization-boundary`, `pnpm guard:web-boundary`, `pnpm audit:localization-literals`
- Broader development path: root `pnpm dev:test`, frontend `http://127.0.0.1:3000`, test backend `http://127.0.0.1:8000`.
- Runtime readiness: backend `/rest/health` returned status `ok`; GraphQL setup returned AI Studio and Vertex Express configured with Vertex Express active; frontend `/settings` returned HTTP 200; ports 3000/8000 listened.
- Browser: installed Google Chrome via Playwright Core, headless, desktop 1440x1000 and narrow 768x900 viewports; locale was changed through the app's persisted preference key for `en` and `zh-CN`.

The user-requested `pnpm dev:test` process is intentionally retained for visual inspection and must not be stopped by this stage.

## Broader-validation decision

`Required` because the pending path changed after API-REV-003 and the implementation-owned test stubs localization/browser rendering. Browser validation was needed to prove actual visible idle/pending labels, spinner/disabled substitution, narrow layout, hover/focus, and both supported locale resolutions through the running Nuxt route. The external Gemini service was not required for this presentation-only path.

## Investigation conclusion

The current focused and adjacent durable coverage remains valid and passed. The previous plain-check round is explicitly excluded. No requirement gap, design impact, or API/E2E-owned local fix was found. Proceeded with repository checks and live browser validation; current evidence supports a `Pass` at 95% confidence.
