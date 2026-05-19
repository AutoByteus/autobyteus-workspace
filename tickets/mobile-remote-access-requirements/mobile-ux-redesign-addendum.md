# Mobile UX Redesign Addendum

## Status

Approved by user as same-ticket rework after PWA validation on phone showed the technical remote-access flow works but the mobile layout is not product-usable. Refreshed on 2026-05-19 after Round 3 API/E2E and user clarification: mobile must cover practical desktop-web journeys from a phone, while the normal desktop/web journey must remain unchanged. Refreshed again after Round 4 API/E2E: functional paths mostly work, but mobile delivery readiness requires final journey simplification and risk reduction. Branch-currency corrected after Round 10 API/E2E: the shared single-agent command-identity finding was not a mobile-only UX fix, and latest `origin/personal` `98cfdc24` already contains the shared fix; no separate command-identity ticket remains. Round 10 non-WebSocket UX findings are captured as polish/design follow-up, not new immediate blockers.


## 2026-05-19 Functional Parity Refresh

Round 3 validation proved the phone-first shell exists, but the mobile product is still incomplete because key desktop-web-equivalent journeys are missing or ambiguous: readable real-data work selection, new agent/team run launch, file preview/attach, and activity/team-message/tool history. The updated scope is therefore not only navigation cleanup; it is a mobile functional parity pass for the MVP journeys listed below.

Desktop/web non-regression is equally mandatory. The desktop workspace remains the desktop workspace. Mobile work must be isolated to `/mobile`, mobile components, mobile route gates, and shared domain/content owners that are safe for both shells.

## Desktop/Web Non-Regression Contract

- `/workspace` and normal desktop web routes keep the desktop left panel, center workspace, and right-side team/tool/activity surfaces.
- Mobile feature gates must not redirect, restyle, or remove desktop routes.
- Shared stores/services may be refactored only toward clearer authoritative ownership; they must not encode mobile navigation assumptions into desktop flows.
- If a shared store currently mixes domain selection with desktop view navigation, split or adapter-isolate that side effect before using it as a mobile owner.
- Desktop regression tests or focused spot-checks are required for any shared run/team/file/activity refactor.

## Legacy / Refactor Rule

Do not preserve compressed desktop-on-phone behavior as a compatibility option. Remove or bypass it from the mobile runtime. In particular, mobile must not keep desktop left tree navigation, stacked top tabs, duplicate Team labels, right panels, placeholder run setup, placeholder file preview, or enabled no-op activity controls as the steady state.

Use shared domain/content components only when they do not own desktop shell navigation. If a desktop component owns both content rendering and desktop panel behavior, extract a shared content owner or build a mobile wrapper against the same store/service instead of importing the desktop panel wholesale.

## Mobile Functional Parity Matrix

| Journey | MVP Decision | Mobile Required Behavior |
| --- | --- | --- |
| Continue existing agent run | Must work | Open run, show conversation/composer, send message. |
| Continue existing team run | Must work | Open team run, show focused/team conversation/composer, send message where desktop supports it. |
| Start new agent run | Must work | Intentionally select/confirm agent/workspace with mobile pickers, show launch summary, enter prompt, launch, land in Chat/Runs, and show any post-launch runtime/provider error normally. Full live single-agent stream execution should be revalidated after the mobile branch includes `origin/personal` `98cfdc24` or newer, where the shared command-identity fix already exists. |
| Start new team run | Must work | Intentionally select/confirm team/workspace/defaults with mobile pickers, show launch summary, enter prompt, launch, land in team Chat/Runs, and show any post-launch runtime/provider error normally. |
| Work/context switching | Must work | Recent / Agents / Teams / Workspaces picker with readable rows. |
| File browse/preview | Must work, simplified | Browse/search folders; preview text/code/markdown through authorized API with size/error/unsupported states, sticky breadcrumb, type/recent/attached filters, and explicit deep search. |
| Attach context file | Must work | Visible composer context item/count and removal; context included in next send/launch. |
| Activity/task/team/tool history | Must work, read-oriented | Compact task plan, team message, run event, and tool-call summaries with filters and expansion/detail; no enabled no-op controls. |
| Terminal/tool/browser panes | Unsupported unless safe viewer exists | Disabled/unsupported notice; relevant terminal-command/tool outputs still visible as activity/history where available. |
| Settings/troubleshooting/unpair | Must work | Status, retry/copy-safe diagnostics, unpair local phone. |
| Normal desktop/web | Must remain unchanged | Desktop shell and workflows unaffected by mobile redesign. |

## 2026-05-19 Round 4 UX Refinement

Round 4 browser validation confirms the Round 3 functional gaps are mostly closed: rows are readable, existing run continuation works, new agent/team launch reaches backend creation, file preview/attach works, Activity opens team messages/tool history, workspace context isolation works, and desktop `/workspace` remains desktop.

The remaining same-ticket work is final mobile journey refinement, not a return to desktop parity scope expansion. The phone UI should now reduce wrong-action risk and scanning burden:

- status must distinguish true desktop/network unreachable from status endpoint/version mismatch when other APIs succeed;
- Run Setup must avoid arbitrary first-choice defaults and large native selects;
- Launch must show target/workspace/model-or-default/context summary, but must not add mobile-only API-key/provider preflight that changes desktop launch behavior;
- Activity must default to compact summaries with detail expansion, not long inline messages/logs;
- Files must support large-folder discovery with sticky breadcrumbs, recent/attached/type filters, and explicit deep search;
- context files must remain visible next to the composer send or launch button that will consume them.

Desktop/web no-regression remains mandatory: these refinements stay in the mobile shell or shared content owners that are safe for both shells. User clarification: missing API-key/provider errors after launch are normal desktop-equivalent runtime errors and should not be solved or preflighted as part of this ticket.



## 2026-05-19 Round 10 Non-WebSocket UX Findings Triage

API/E2E also captured non-WebSocket mobile UX polish findings in:

`/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/mobile-ux-validation-findings-round10.md`

Design decision: these are valid product polish items, but they do not supersede the MVP boundary or create a new immediate blocker if the current implementation is functionally usable.

- Runtime/model: mobile MVP may remain simplified and use existing desktop/agent defaults. The launch summary should show the resolved runtime/model when available, or clearly say it uses the agent's desktop default runtime/model. Full runtime/model editing from phone is a later product decision, not required in this ticket unless explicitly re-scoped.
- Activity density: keep compact rows, filters/chips, error priority, and drill-in details as the target polish direction.
- Files: keep sticky folder context, recent/attached/type filters, and explicit deep search as the target polish direction for large workspaces.
- Context visibility: keep selected files/count next to the send or launch action and avoid conflicting duplicate indicators.
- Target selection: keep Recent/Favorites/Current context emphasis and no arbitrary first-item defaults.

## 2026-05-19 Latest-Base Command Identity Refresh

Round 10 real Codex/GPT-5.5 validation exposed a shared single-agent command-identity failure from a worktree that was behind `origin/personal`. API/E2E and implementation rechecked the evidence after the user clarified that general/shared issues should not be fixed inside this mobile UX ticket.

Decision: this finding was **not mobile-only** and is already fixed on latest base. Direct WebSocket evidence showed the same mobile-created Codex/GPT-5.5 run responds when identity is present. Branch refresh on 2026-05-19 showed latest `origin/personal` `98cfdc24` already contains the shared single-agent command-identity and ACK rejection fix.

Mobile UX ticket boundary:

- Do not add a mobile-only WebSocket sender or hidden mobile-only dedupe scheme.
- Do not patch shared single-agent streaming inside this mobile UX ticket.
- Branch refresh completed via merge commit `26a17e0a`; final validation should run on `origin/personal` `98cfdc24` or newer.
- Continue to validate phone-specific shell, setup, files, activity, status, context visibility, live single-agent send on the refreshed base, and desktop no-regression.

No separate command-identity ticket remains. If the missing identity failure reappears after refresh, treat it as a shared-base regression rather than adding a mobile workaround.

## Why This Stays In The Same Ticket

The original ticket goal is not only to expose `/mobile` and pair a phone; it is to make AutoByteus usable from a phone over a private network. User validation showed the backend/PWA/auth foundation works, but the current post-pairing workspace experience is a compressed desktop layout with too many panels and nested navigation layers. That fails the mobile usability intent of the same Remote Access MVP.

This rework should therefore be completed on top of the current mobile remote-access ticket before treating the PWA as delivered.

## Scope Characterization

Mostly frontend / UX implementation.

Expected areas:

- `autobyteus-web/components/mobile/*`
- `autobyteus-web/pages/mobile.vue`
- mobile runtime routing/middleware under `autobyteus-web/utils/remoteAccess/*`
- mobile workspace shell/layout components
- mobile run setup/launch adapter or refactored shared launch owner
- mobile file preview/context attachment integration over existing file/context owners
- mobile activity/team-message/tool-history detail views
- small shared reusable presentational pieces if needed
- tests for mobile navigation, functional journeys, Round 4 UX refinement behavior, feature-gating behavior, and desktop/web no-regression

Backend changes are not expected unless a frontend flow exposes a missing API capability. Pairing/auth/route policy should remain as implemented. If shared run/team/file/activity stores contain desktop-shell coupling, refactor the ownership boundary rather than coding around it in mobile.

## Non-Negotiable Product Direction

The mobile UI must not be a squeezed desktop UI.

Desktop stays:

- left navigation panel
- center chat/workspace panel
- right tools/activity panel

Mobile becomes:

- mobile home
- phone-first work shell
- one task visible at a time
- bottom navigation
- context switching by sheet/picker

## Core Mobile Navigation Model

After pairing, the phone has these main screens:

1. `MobileHome`
   - connection status
   - continue latest run
   - start/choose work
   - recent work
   - troubleshoot/unpair as secondary actions

2. `MobileWorkShell`
   - compact header with current context
   - bottom nav: `Chat | Runs | Files | Activity`
   - no desktop left tree by default

3. `MobileContextSwitcher`
   - opened by tapping current context or Switch Work
   - Recent / Agents / Teams / Workspaces
   - search
   - replaces the desktop left drawer on phone

4. `MobileChat`
   - primary mobile task
   - conversation messages
   - sticky composer
   - add context action

5. `MobileRuns`
   - active/recent/completed runs
   - start new run
   - run setup only when explicitly requested

6. `MobileFiles`
   - simple search + drill-in file list
   - full-screen file viewer
   - attach-to-chat path when launched from composer

7. `MobileActivity`
   - task plan
   - team messages
   - run events
   - terminal/tool status or unsupported notices

## Required Removals / Replacements From Mobile Runtime

- Do not use the desktop `AppLeftPanel` as the primary mobile navigation.
- Do not show the full workspace/team tree by default.
- Replace top tabs `Running | Files | Team | Tools` with phone-intent navigation.
- Remove nested global tab bars from the default mobile work flow.
- Do not show duplicate `Team` concepts at different navigation levels.
- Do not keep run configuration permanently visible; show it only for start/edit flows.
- Treat desktop right-panel content as `Activity` or sheets, not as a right panel.

## UX Acceptance Criteria

- A paired phone user can identify the current node, current work context, and primary next action within 3 seconds.
- User can reach an active/latest chat in one tap from Mobile Home when a recent run exists.
- User can switch work context without seeing the full desktop left tree by default.
- Only one persistent navigation model is visible at a time.
- There are no more than four persistent task tabs.
- Chat/composer is discoverable within one tap after selecting/continuing/starting work.
- Home status does not claim the desktop is unreachable when other authorized APIs prove the node is reachable.
- New agent and team run setup can be completed from phone without returning to the desktop shell.
- Run Setup requires intentional target/workspace selection unless a context-derived default is being confirmed.
- Run Setup shows a launch summary adjacent to the launch button, displays resolved runtime/model or clear desktop-default source copy, and preserves desktop-equivalent post-launch runtime/API-key error behavior.
- File preview shows real supported text/code/markdown content or a concrete unsupported/error state, not placeholder copy.
- Attach-to-chat adds visible composer context and the next send includes that context.
- Activity team messages and task/tool history actions produce visible states; no enabled no-op controls.
- Activity defaults to compact summaries with expansion/detail for long messages, commands, and logs.
- File browsing provides sticky folder context and mobile discovery aids for large workspaces.
- Attached context remains visible next to send/launch decisions and does not have duplicate/conflicting indicators.
- Real-data list rows keep the work title readable before metadata.
- Desktop/web `/workspace` and normal desktop journeys remain unchanged.
- Empty states have one primary action.
- Error states have one recovery action.
- Unsupported desktop features show explicit mobile notices rather than broken UI.
- Desktop layout and behavior remain unchanged.

## Canonical Journey Artifact

Detailed screen-by-screen journey and transitions:

`/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/ui-prototypes/mobile-pwa-navigation/experience-story.md`

Implementation should follow that artifact as the behavioral source of truth for mobile navigation.
