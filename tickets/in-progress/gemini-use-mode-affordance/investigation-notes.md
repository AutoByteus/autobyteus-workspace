# Investigation Notes — Gemini “Use this mode” affordance

## Bootstrap

- Repository: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-use-mode-affordance`
- Branch: `codex/gemini-use-mode-affordance`
- Base: `origin/personal`, refreshed with `git fetch origin personal` on 2026-07-28; worktree created from the refreshed remote-tracking state.
- Original shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was dirty with unrelated delivery artifacts, so it was not used for authoritative work.
- Repository mode: git monorepo; affected product surface is the Nuxt web frontend under `autobyteus-web`.
- Expected finalization target: recorded base branch `personal` via the downstream delivery flow.

## Source / commands consulted

- User-provided screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_9b6d1ec946e4474e935f7b1804444b71/solution_designer_efb56117daf54e35b1a6265173a3aa30/context_files/ctx_ac26f8a835f8__image.png`.
- `cat .../solution-designer/SKILL.md` — workflow and artifact requirements.
- Shared design-principles/template paths referenced by the skill were not present in the installed skill directory; this artifact follows the skill’s required content structure and records the absence rather than inventing a repository-local authority.
- `grep -RIn ... "Use this mode" autobyteus-web` — entrypoints, tests, localization, and generated GraphQL references.
- `sed -n ... autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue` — current activation control implementation.
- `sed -n ... GeminiSetupForm.vue`, `settings.ts`, and `GeminiSetupForm.spec.ts` — surrounding UI and durable test behavior.
- `grep -RIn ... Icon ... autobyteus-web` and `nuxt.config.ts` — existing Iconify/heroicons usage and frontend conventions.
- `tickets/done/secure-centralized-secret-provisioning/gemini-setup-ui-ux-spec.md` — approved existing Gemini journey and accessibility constraints.

## Stable behavior inventory

| Behavior ID | Supported trigger / path | Observed current behavior | Evidence |
|---|---|---|---|
| `BEH-001` | Settings → API Key Management → Gemini → configured non-active option | `GeminiConfigurationOptionCard.vue` renders an icon-only `<button>` with an empty `<span class="h-5 w-5 rounded-full border-2 border-current">`; title/ARIA label say `Use this mode`, click emits `activate`. | `autobyteus-web/components/settings/providerApiKey/GeminiConfigurationOptionCard.vue:70-91` |
| `BEH-002` | Activation pending | `activating` swaps the empty ring for a CSS spinner; actions are disabled through `actionsDisabled`. | `GeminiConfigurationOptionCard.vue:73-80, 184-185` |
| `BEH-003` | Active configured option | The activation button is not rendered; the existing active marker is a blue outlined circle with a blue center dot. | `GeminiConfigurationOptionCard.vue:51-66` |
| `BEH-004` | Component test activation | Durable test verifies accessible label and event emission for activation, and verifies pending disablement. | `autobyteus-web/components/settings/providerApiKey/__tests__/GeminiSetupForm.spec.ts:76-84, 104-131` |
| `BEH-005` | Icon convention | Settings components import `{ Icon }` from `@iconify/vue` and use `heroicons:*` names, including `heroicons:check` and `heroicons:check-circle-solid`. | `FeaturedCatalogItemsCard.vue:20,56`; `ArtifactItem.vue:40` |

## Root-cause / design-health assessment

- Change posture: narrow UI affordance bug / usability improvement, not a runtime feature or refactor.
- Root cause: local presentation defect — the activation control’s visual glyph is an empty circle, which is visually ambiguous with a radio/cycle control and does not reinforce the already explicit `Use this mode` label.
- No ownership, boundary, API, persistence, or data-shape issue found. The component already owns the control and the activation event remains the correct boundary.
- Refactor decision: no refactor needed. A local icon substitution preserves the healthy component boundary, API, state model, and file placement.
- Recommended symbol: Iconify `heroicons:check-circle` (outline check-in-circle). It communicates confirmation/selection and is already aligned with the project’s heroicons naming convention. Do not use a circular-arrow/refresh symbol because that suggests cycling or reload, not activation.

## Evidence-backed scope constraints

- Keep the button’s text alternatives (`title` and `aria-label`) because the icon alone must not carry the action meaning.
- Keep `data-testid`, event emission, pending spinner, disabled state, focus-visible ring, hover style, and 44px target.
- Keep the active marker unchanged to preserve a clear selected-vs-selectable contrast.
- No localization update is needed; existing labels remain accurate.
- No persisted data transition; no migration, backend, GraphQL, generated-code, or desktop-specific change.

## Supplemental artifact inventory

| Path | Purpose / scope | Status | Supports | Approval applicability |
|---|---|---|---|---|
| `tickets/in-progress/gemini-use-mode-affordance/ui-ux-spec.md` | Focused visual and interaction specification for the activation affordance and contrast states. | Refined | `REQ-001`–`REQ-003`, `AC-001`–`AC-005` | Intended behavior; included in requirements basis. |

## Downstream rendered-surface finding and scope revision

- Triggering report: `implementation_engineer` Design Impact / Requirement Gap message, with live Settings screenshot `/Users/normy/.autobyteus/browser-artifacts/526f15-1785227527287.png` and DOM inspection of `http://127.0.0.1:3000/settings` (tab `526f15`).
- The first implementation (`a00dc0ee2`, check-circle glyph) was inspected in the actual Settings surface. It improved the empty-ring glyph but did not resolve the broader ambiguity: non-active rows showed a green configured dot, a blue check-circle activation action, and an edit icon, while the active row showed a blue radio-like circle with center dot plus edit. The two circular controls still made action vs current state visually similar.
- Revised clarity direction: make the non-active activation action a visible text button using the existing `Use this mode` localization, and replace the active radio-like visual with visible `Active` text/badge while retaining accessible names, test hooks, and active row styling. Leave the configured status dot and edit/configure control unchanged.
- Product decision recorded here: use `Use this mode` rather than `Make active` so no new copy/translation is needed and the existing command language remains stable. Do not add a new icon to carry the meaning; visible text is the authoritative affordance.

## Open unknowns / residual risks

- The referenced shared `design-principles.md` and template files are absent from the installed agent-skill directory. No blocking design ambiguity resulted because this is a local icon-only change and existing repository conventions provide direct evidence.
- Browser/live validation is proportional and can remain downstream; the symbol is a static frontend render with existing component coverage.
- The final badge treatment (compact blue `Active` text badge) should be validated at narrow card widths; the design explicitly allows wrapping while retaining a 44px minimum action height.
