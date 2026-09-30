# Implementation Handoff — chat-composer-menus-open-upward

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review not applicable (Small/Low). Received from Solution Designer as `Architecture Design Complete`, SR-004.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/requirements-doc.md` (Approved, user "approve" 2026-09-30)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/design-spec.md`
- Supplemental task artifacts:
  - Product UI/UX spec (behavior-defining, user-confirmed): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`
  - Final visual references VIS-001–010: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/visual-references/`
  - Prototype behavior matrix and validation script (evidence): `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-behavior-test-matrix.md`, `/Users/normy/autobyteus_org/autobyteus-web-prototype/prototype/scripts/validate-chat-composer-menus-open-upward.mjs`
  - Design handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/handoff-architecture-design-complete.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: `N/A`

## Current Implementation Summary

On the new-chat page at ≥640px wide, the `@`, `/`, Workspace, Model and Thinking menus always open upward and shrink to the space above instead of flipping down. The Model runtime flyout is bottom-aligned with its runtime row and grows upward. The new-chat column padding is `pt-[14vh] pb-10`. The <640px bottom sheet and the running-conversation `/` menu are untouched.

- `useAnchoredPopover` has a typed opt-in option `{ placement: 'above' }`. The default `auto` keeps the previous algorithm (only the literals `16` and `220` became named constants).
- Under `above`, the height is `max(0, min(preferred, floor(box.top − 6 − 16)))`, where `box` is the menu's containing block: the root when it is positioned, otherwise `root.offsetParent`.
- The four new-chat consumers opt in and apply `maxHeight` on the non-narrow branch.
- `flyoutOffset` and its downward-overflow math are removed.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 8 source files changed (75 insertions, 27 deletions), all inside `autobyteus-web/components/chat/` plus the one composable. The option is additive and its default is unchanged. `grep useAnchoredPopover` still shows exactly the 4 chat components plus `useSkillTagMenu`, and `ChatComposer` is mounted only by `ChatNewSurface`, so no consumer outside the new-chat page was opted in. No contract, persistence, security, concurrency or deployment impact.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 / AC-001 | `@` and `/` open above the composer card | `ChatMessageInput.vue` → `useAnchoredPopover(rootRef, textareaRef, 300, { placement: 'above' })`; wide wrapper `absolute left-2 flex flex-col bottom-full mb-1.5` + `maxHeight`; `ChatTargetMenu.vue` / `ChatSkillMenu.vue` root and list `min-h-0` | Done. The root is static, so the composable measures from `offsetParent` (the composer card). Rendered: menu bottom 475.6 vs card top 480.6 at 1512x952 (VIS-002: 476 / 481). |
| BEH-001 / REQ-001 / AC-002 | Workspace, Model and Thinking open above their trigger | `ChatWorkspaceMenu.vue` (420), `ChatModelMenu.vue` (360), `ChatThinkingControl.vue` (240), each with `{ placement: 'above' }` and a non-narrow `maxHeight` style | Done. The Model menu root has no `overflow` class, so the flyout is not clipped. Thinking gets `overflow-y-auto` on the wide branch only. |
| BEH-001 / REQ-001 / AC-002 | Runtime flyout bottom-aligned, growing upward | `ChatModelMenu.vue` → `bottom: -5px`; `flyoutListMaxHeight = max(0, min(320, floor(rowBottom + 5 − 12 − 10)))` computed in `openSubmenu` | Done. `flyoutOffset` removed. Left/right side logic unchanged. |
| BEH-002 / REQ-002 / AC-003 | Column padding `pt-[14vh] pb-10`, still flex-centered | `ChatNewSurface.vue:3` | Done. Rendered heading top 378.6 at 1512x952 (spec ~379), 246.4 at 1280x720 (VIS-007: 246). |
| REQ-003 / AC-004 | Never flip; shrink and scroll; header/footer visible | `useAnchoredPopover.ts` `measureAbove` | Done. Rendered `@` menu 17.4–229.4 at 1024x520 (VIS-008: 17–229) and 166px max at 1024x440 (spec: 166). |
| BEH-003 / REQ-004 / AC-005 | <640px bottom sheet unchanged | Narrow branches in all four components | Preserved. Narrow class strings are byte-identical to base and no inline `maxHeight` is set on the sheet. |
| BEH-004 / REQ-004 / AC-005 | Running-conversation `/` menu unchanged | `composables/agentInput/useSkillTagMenu.ts` (default `auto`) | Preserved. No file under `agentInput` changed; `auto` is covered by regression unit tests. Not re-rendered locally (see limitations). |
| REQ-004 | Hint line stays under the composer and is not covered | No change to the hint; menus open upward | Rendered check: no menu or flyout overlaps the hint at any wide viewport. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source (all under `autobyteus-web/`):

- `composables/popover/useAnchoredPopover.ts`
- `components/chat/ChatMessageInput.vue`, `ChatTargetMenu.vue`, `ChatSkillMenu.vue`
- `components/chat/ChatWorkspaceMenu.vue`, `ChatModelMenu.vue`, `ChatThinkingControl.vue`
- `components/chat/ChatNewSurface.vue`

Tests (all under `autobyteus-web/`):

- New: `composables/popover/__tests__/useAnchoredPopover.spec.ts` (10), `components/chat/__tests__/ChatMessageInput.spec.ts` (3), `components/chat/__tests__/ChatModelMenu.spec.ts` (5)
- Extended: `components/chat/__tests__/ChatWorkspaceMenu.spec.ts` (+3), `components/chat/__tests__/ChatThinkingControl.spec.ts` (+3)

## Important Assumptions

- "6px above the composer card" means 6px above the card's padding edge, which is what `bottom-full mb-1.5` gives. The card has a 1px border, so the menu bottom is 5px above the card's outer top. This matches VIS-002 (476 vs 481) and VIS-008 (229 vs 234).
- The height rule measures from the containing block's outer top (`getBoundingClientRect().top`), as the design states. With the 1px border this leaves a 17px top margin for `@`/`/` (VIS-008 shows the same 17px).
- The four components keep the `placement === 'above' ? … : 'top-full mt-1.5'` class binding, as in the design and prototype. The composable remains the single owner of the placement decision; under `above` the `top-full` branch is never taken.

## Known Risks

- **Existing probe T06 is now stale.** `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` case T06 asserts a `6vh` bottom padding and compares against a `14vh` baseline. It will fail against `pt-[14vh] pb-10`. I did not change it because browser probes belong to API/E2E. It needs updating or replacing there.
- `docs/chat.md:91` still mentions `pb-[6vh]` (Delivery docs sync, already noted in the design).
- Observed, not introduced here: at 1024px wide the Model flyout opens to the left and its left part sits under the app sidebar (`implementation-checks/rendered/1024x440-model-flyout.png`). The left/right side choice is unchanged by this ticket and the spec says "left or right side as today", so I left it. Flagging it in case it should become a follow-up.
- Measurement is on open only; resizing while a menu is open is not re-measured (explicitly out of scope).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: additive opt-in policy on the existing popover owner; no new module
- Reviewed root-cause classification: implicit "auto by space" placement; the new-chat surface needs a deterministic policy owned by the composable
- Reviewed refactor decision: `No Refactor Needed` beyond removing `flyoutOffset`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the height math lives only in `useAnchoredPopover.ts`; components only pass the policy and apply `placement`/`maxHeight`. The flyout list height stays in `ChatModelMenu.vue` per the ownership map.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: `flyoutOffset` and the fixed `max-h-[20rem]` flyout class are removed. `auto` is live policy for `useSkillTagMenu`, not legacy. Largest changed file is `ChatModelMenu.vue` at 310 lines; largest per-file delta is 54 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` → "Persisted Data / State Transition Decision" (N/A, presentational only)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `N/A`
- Migration implementation and focused checks, only when `Migration Required`: `N/A`
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`; I ran `pnpm install --frozen-lockfile --prefer-offline` and `pnpm exec nuxt prepare` in `autobyteus-web`.
- For the rendered check I ran `pnpm -C autobyteus-server-ts build`. It left untracked `dist/` folders in `autobyteus-application-backend-sdk` and `autobyteus-application-sdk-contracts`; I deleted those two afterwards, so API/E2E will need to rebuild before running a probe.
- No dependency was added or changed.

## Local Implementation Checks Run

Commands were run from `autobyteus-web/` in the worktree.

| Check | Command | Result |
| --- | --- | --- |
| Focused unit/component tests | `NUXT_TEST=true pnpm exec vitest run components/chat composables/popover composables/agentInput components/agentInput --no-watch` | 13 files, 82 tests passed |
| New tests fail on base source | Same chat/popover run with the 8 source files stashed | 15 of the new tests failed as expected, then changes restored |
| Full web unit suite | `NUXT_TEST=true pnpm exec vitest run --no-watch` | 3398 passed, 4 failed, 4 skipped. The 4 failures are in 4 unrelated files and fail identically with my source changes stashed: `WorkspaceAgentRunsTreePanel.regressions.spec.ts` (2), `org-definition-navigation.spec.ts` (1), `app-font-size-fixed-px-audit.integration.test.ts` (1, token-usage files), `electron/server/__tests__/StartupDelayLifecycle.spec.ts` (suite load error) |
| Repo guards | `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` | All passed |
| Typecheck | `pnpm exec nuxt typecheck`; then `vue-tsc --noEmit` via `pnpm dlx` (2.2.12 and 3.1.4) | **Not obtained.** `nuxt typecheck` crashes because `vue-tsc` is not a project dependency and the npx-resolved copy is incompatible. `vue-tsc` run directly stops at syntax errors it reports in two unrelated files (`pages/agent-orgs.vue`, `components/agentTeams/form/AgentTeamLibraryPanel.vue`), so no semantic diagnostics were produced for the changed files. The changed files compile under Vitest and Nuxt dev. |
| Lint | — | No lint script exists in `autobyteus-web/package.json` |

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: new-chat surface `/chat`; UXJ-001–UXJ-004; the five composer menus and the runtime flyout.
- Approved UI/UX, interaction, requirement, or design references: `ui-ux-spec.md`, VIS-001–VIS-009, REQ-001–004.
- Existing design system, shared components, and adjacent product surfaces reviewed: the existing menu components and their narrow/wide branches; `ChatComposer.vue` (the positioned card); `useSkillTagMenu.ts` (left unchanged).
- Testing guideline or development / preview instructions and rendered surface used: root `TESTING.md` ("Renderer UI → web unit tests + a browser dev-path probe"; never the user's running app). I used headless Chrome (playwright-core) against an owned Nuxt dev server and an owned backend (`dist/app.js`) on free ports with a temp data root and sanitized environment, the same way the existing chat probe boots. Script: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/implementation-checks/rendered-check.mjs`. Fixtures: 9 agents and 14 workspaces created through GraphQL; models from the real AutoByteus runtime catalog (33 models).
- States, layouts, viewports, and interactions inspected:
  - 1512x952, 1280x720, 1024x520, 1024x440: idle layout (padding, order, hint under composer, no page overflow); `@`, `/`, Workspace, Model, runtime flyout (hover) and Thinking. For each menu: `bottom-full` and not `top-full`, 6px gap to the containing block's padding edge, inline `max-height` equal to the rule, top ≥16px, not covering the hint, header/footer rows inside the menu.
  - `@` is positioned against `[data-test="chat-composer"]`. ArrowDown moves the highlight and Escape closes. Workspace search is focused on open.
  - Flyout: `bottom: -5px`, bottom edge = row bottom + 5, top ≥12px, list `max-height` equal to the rule (320 / 317 / 203 / 157px at the four viewports) and the list scrolls (33 rows).
  - 390x844: `@`, Workspace and Model render as the bottom sheet (8px insets, backdrop, no inline max-height).
  - Result: 39/39 checks passed, with no page errors. I also looked at the screenshots directly.
- Visual or interaction issues found and corrected:
  - I first put `flex flex-col` on the `@`/`/` wrapper for both branches (as the prototype did). I moved it to the wide branch only, so the bottom sheet's classes are identical to base.
  - My first gap assertion measured to the card's outer top and reported 5px. The product was right (6px to the padding edge, matching VIS-002); I corrected the check.
- Supporting evidence and remaining unverified states or limitations:
  - Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward/implementation-checks/rendered/results.json` and 27 screenshots in the same folder.
  - **Not rendered:** the running-conversation `/` menu (VIS-010). It needs a real run, which means sending a message to a live model; I left that to API/E2E. Its code path is unchanged and the `auto` policy has regression unit tests.
  - **Not rendered:** a Thinking menu taller than its limit. The real menu was 190px against limits of 240px, so its scroll path was not exercised; the class and style are asserted in unit tests.
  - **Not exercised:** the Model menu's search-results list shrinking in a short window, and keyboard navigation inside the Model/Thinking menus (code untouched).
  - Pixel comparison against the VIS images was by measured geometry, not image diff. The real app has a different sidebar and catalog than the prototype, so horizontal positions differ (e.g. the flyout opens to the right at 1512 wide here and to the left in VIS-005), which the spec permits.

## Downstream Coverage Hints / Suggested Scenarios

- Update or replace T06 in `tests/e2e/chat-composer-polish-probe.mjs` (see Known Risks). Its "menus inside viewport" part is still valid; the `6vh` and "lower than 14vh" assertions are not.
- VIS-010: open a running conversation at 1512x952, type `/`, confirm the skill menu still opens above the run composer.
- AC-004 at 1024x520 and 1024x440 for all five menus, with a long agent list and many workspaces.
- A model with many thinking parameters in a short window, to exercise the Thinking menu's scroll.
- Model search results in a short window.
- `rendered-check.mjs` can be reused as a starting point; it accepts an existing frontend URL as its first argument.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All API/E2E and broader executable validation is still required and owned by `api_e2e_engineer`. Nothing in this handoff is API/E2E sign-off. In particular: AC-001–AC-005 through a browser probe, VIS-010 on a real run, and the stale T06 probe case.
