# Requirements Document — run-settings-ui-unification

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `run-settings-ui-unification`
- Request / ticket: User request 2026-10-04: the run config forms feel cluttered compared with the chat composer
- Requirements owner: Solution Designer
- Date: 2026-10-05
- Approval state and reference: The UI/UX is user-approved with Product (SR-001 result and SR-003 revision, both 2026-10-05; see supplements). Requirements baseline **approved by the user on 2026-10-05**: "I think it's like now the requirement is clear, right? You can go ahead now. No more, I think it's clear now."
- Exact approved requirements baseline / solution revision: `SR-006` (SR-005 behavior, with REQ-022/AC-019 wording aligned to the user-confirmed Product correction). This is SR-004 (approved 2026-10-05, with its addendum) plus the REQ-022 Fast mode delta, which the user directed on 2026-10-05: "we need to enable the faster mode … you can update".
- Behavior-defining supplements and their approved versions:
  - Product UI/UX spec `ui-ux-spec.md` (UXJ-001..010, UIS-001..005, TR-001..017) and visual references VIS-001..042. Design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, `origin/personal` = `6718986` (SR-005 correction; earlier `a5b0eec`). Ticket `tickets/done/run-settings-ui-unification/` (closed). **User-approved:** SR-001 result 2026-10-05 ("Okay, I like this UI…"); SR-003 revision 2026-10-05, final after rounds 33–38 ("I'm currently satisfied with the UI now … Let's finalize now … the ticket is done."). The Org-in-chat parts of the SR-001 result are withdrawn in this revision. **Extension by user direction (SR-005):** REQ-022 adds non-thinking model settings (e.g. Codex Fast mode) to the spec's Thinking control. Product revised the spec at the user's request (`product-design-request-r3.md`; round 39; user confirmed 2026-10-05: "perfect. i checked. its great"). REQ-022 now matches that confirmed presentation.

## Problem And Desired Outcome

- **Problem:** The Agent, Agent Team and Agent Org run configuration forms show the same four launch
  decisions as the chat composer: workspace, auto-approve, model+runtime and thinking. The forms
  present them as long label/control/help-text stacks with inconsistent controls. The Team and Org
  forms also repeat a near-full form for every member. Saved-run settings use banners and
  explanatory sentences.
- **Affected actors:** users who start or adjust Agent, Team and Org runs in the desktop/web app.
- **Desired outcome:**
  - Agents and Agent Teams are configured and started in New chat; the composer's four controls are
    the run's settings. Agent Orgs (no coordinator) are started from a short Org launch page in the
    same visual language, never from chat.
  - Member customization is secondary, in a compact panel.
  - Saved-run settings use the same visual language, with no banner noise.
- **Observable definition of success:** the implemented surfaces match the approved Product UI/UX
  spec and visual references (VIS-001..019), within its
  Implementation Fidelity Boundary.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Agent Run (Agents list/detail) prepares an agent run template and opens the workspace `AgentRunConfigForm` (`useRunActions.prepareAgentRun`) | Run opens New chat addressed to the agent, with the definition's launch defaults in the four composer controls. The first message starts the run. | The agent launch path and the definition launch defaults | OBS-004; `composables/useRunActions.ts` |
| BEH-002 | User | SCN-002, SCN-006 | Team Run opens `TeamRunConfigForm`, which has root fields plus a long member override list. New chat to a team launches root-only, with no overrides (`buildChatTeamLaunchConfig`). | Team Run opens New chat for the team. A members line under the composer opens a right-side "Member settings" drawer. Member overrides are carried into the launch. | Team launch semantics; the coordinator receives the first message | OBS-010; `services/chat/chatTeamLaunchConfig.ts` |
| BEH-003 | User | SCN-003, SCN-006, SCN-008 | Org Run opens `AgentOrgRunConfigPanel` (`/workspace?…mode=configuration`), a long form. Org launch deliberately has no recipient; the workspace then asks the user to choose an exact Agent or Team (`docs/agent_orgs.md` "Launch And Focus"). Chat cannot target Orgs (`ChatTarget` = agent/team only). | Org Run opens an **Org launch page** in the new visual language: Org heading; a settings card with the chat-style controls (Workspace, Model, Thinking, Tool approval); the members line and the same Member settings drawer (placed teams with workspace, their members, direct agents); and a **Run** button (round play icon in the card) with no message box. Orgs are **not** a chat target. | Org has no coordinator, initial recipient or implicit first member. After launch the user chooses an exact Agent/Team in the workspace, as today. Org launch semantics and validation. | OBS-011/012; `stores/chatDraftStore.ts:18`; `AgentOrgExperience.vue:457`; `docs/agent_orgs.md:56,192-211` |
| BEH-004 | User | SCN-004 | Saved-run "Edit Config" shows fixed runtime/workspace as disabled fields, coloured banners, and an always-visible Save | Redesigned saved-run settings: header with a status badge (and a stop icon while running), a settings card with lock icons, a Members list, and a Save bar only when there are changes | Fixed runtime/workspace/approval; model/thinking editable only when stopped; refresh-required; historical/unavailable model handling; save path | OBS-013; `ExistingRunConfigEditor.vue` |
| BEH-005 | User | SCN-005 | Chat composer footer chips | Same controls reused on all surfaces. The model menu gains a runtime-locked mode for saved runs. | Chat composer look and behavior | OBS-001..003 |
| BEH-006 | User | SCN-007 | In New chat, `@` opens a "Chat with" menu that **switches the chat target**. In running chats, `@` inserts a collaborator mention. | `@` everywhere (New chat and running Agent/Team chats) inserts a collaborator mention ("Bring into this run"). It lists **only Agents and Agent Teams** (never Orgs), excludes the current target, and never switches the target. The first message of a new run keeps its mentions. | Running-chat mention behavior | `ChatTargetMenu.vue:11,56`; `chat.ts:78-85` |
| BEH-007 | User | SCN-008 | "+" for a new run: the tree "+" opens a preset chat with the workspace; Org "+" opens the Org configuration seeded from the source run (`sourceOrgRunId`) | "+" on a running/stored Agent or Team opens New chat prefilled from that run (workspace, approval, model+thinking, plus member overrides for Team). "+" on a running/stored Org opens the Org launch page prefilled from that run, including member overrides. | If copying fails, the surface opens with definition defaults | `useWorkspaceHistorySelectionActions.ts:122`; `AgentOrgWorkspaceView.vue:131` |
| BEH-008 | User | SCN-001..003 | New chat shows a "Files are saved in …" line; saved runs show "Kept from the saved run: …" | Both lines removed | — | Product spec "Removed copy" |
| BEH-009 | User | SCN-001..004, SCN-006 | The old run forms show every model setting from the model's config schema, including non-thinking settings such as Codex **Fast mode** (`service_tier`). The chat Thinking menu shows only thinking settings, so New chat cannot set Fast mode today. | Every in-scope model+thinking control also offers the model's non-thinking settings (e.g. Codex Fast mode) in the same menu, so they can be set per run, per member and on a stopped saved run. | Values not shown are still kept; the definition default `llmConfig` still applies | AF-012; `codex-app-server-model-normalizer.ts:55-66` |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (desktop/web) | Start and adjust runs quickly | One consistent, clean surface | Must keep every existing launch capability except the removed per-member runtime/workspace forms (see REQ-009) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Start a new Agent run from Agents (list/detail) through New chat | SCN-001 |
| UC-002 | Start a new Team run through New chat, optionally customizing members | SCN-002, SCN-006 |
| UC-003 | Start a new Org run from the Agent Orgs page (Run) or "+" on an Org run, through the Org launch page, optionally customizing placed teams / members / direct agents | SCN-003, SCN-006, SCN-008 |
| UC-004 | Review, stop, and edit the settings of a saved Agent / Team / Org run | SCN-004 |
| UC-005 | Bring a collaborator into a new or running chat with `@` | SCN-007 |
| UC-006 | Start another run like an existing one with "+" | SCN-008 |

### Out Of Scope

- Mobile paired-phone run setup (`MobileRunSetup` / `MobileLaunchRuntimeModelCard`).
- Applications launch profiles.
- Definition launch-preference editing (`DefinitionLaunchPreferencesSection`).
- The chat transcript and the workspace tree layout.
- Backend launch/run semantics and persistence formats, beyond what is needed to launch an Org from
  chat and to carry member overrides and mentions (see ASM-001).
- Changing tool approval or workspace on a saved run. These stay fixed, except the placed-team
  workspace, which is editable when stopped as the product allows today (VIS-009).

### Non-Goals

- No new run settings beyond the existing four plus member overrides.
- No app-wide unification of the Stop/Terminate verbs. Existing labels stay as they are; the saved-run stop icon reuses them (DEC-003).

### Preserved Behavior Boundary

- Preserved columns of BEH-001..007.
- Launch validation: a missing model blocks Send ("Choose a model to start.").
- The AGY/Antigravity approval lock.
- Runtime catalog loading and error handling.
- Saved-run editability reasons (active, stopped, `REFRESH_REQUIRED`, historical/unavailable model).
- `RuntimeModelConfigFields` stays available to its out-of-scope users (mobile, definition launch
  preferences).

### Review Authority

Standard rules: blocking findings must cite a REQ/AC/BEH ID. New behavior is a `Requirement Gap`
that needs user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The four launch decisions (workspace, tool approval, model+runtime, thinking) use the same chat-composer controls on every in-scope surface. Visual and interaction details (layout, spacing, typography, badges, icons, motion, responsive behavior, exact en copy and the zh-CN equivalents) follow the approved Product UI/UX spec within its Implementation Fidelity Boundary. | All | High | SR-001 REQ-001, refined by the approved supplement | `ui-ux-spec.md` |
| REQ-002 | Team New chat and the Org launch page show one members line: "All {N} members use these settings · Customize members", or "● {n} of {N} customized · Edit · Reset". It opens a right-side "Member settings" drawer. The drawer is resizable 400–960 px (the page keeps ≥360 px), the width is remembered, it is full width below `sm`, and it lists members only. | BEH-002, BEH-003 | High | DEC-002 / compactness | UXJ-004, UIS-002, TR-003..006 |
| REQ-003 | No raw internal addresses (such as `/` or `/product_team`) appear in user-facing copy. | BEH-003 | Medium | Was REQ-007 in SR-001 | OBS-012 |
| REQ-004 | Saved-run settings (Edit Config, Agent/Team/Org) follow UIS-003. Header: icon, name and a Running/Stopped badge. Settings card: fixed values carry lock icons; model and thinking are editable only when stopped. A Members list is shown. There are no banners or standing explanatory lines. | BEH-004 | High | Clean saved-run view | Product impact 6; VIS-006..009 |
| REQ-005 | Every "Run" entry point for Agents and Agent Teams (list and detail) opens New chat addressed to that definition, with the definition's launch defaults in the four composer controls. Every "Run" entry point for Agent Orgs opens the Org launch page (REQ-007) with the Org's launch defaults. | BEH-001..003, BEH-005 | High | DEC-001 = D for Agents/Teams; DEC-004 for Orgs | Product UXJ-001/002; DEC-004 |
| REQ-006 | A new Agent or Team run starts only when the user sends the first message from New chat; it cannot start without one. A new Org run starts only from the Org launch page's **Run** button (a round play-icon button in the card's lower-right corner, styled like Send), with no message. | BEH-001..003 | High | DEC-001 = D; an Org has no recipient | Product impact 1; DEC-004; round 37/38 |
| REQ-007 | Orgs are **not** a chat target: an Org is never chatted with, never receives a first message, and chat never starts an Org. The Org launch page (UIS-004) has: the Org heading (the heading switcher, REQ-019); a settings card (Workspace, Model, Thinking, Tool approval) with the chat controls and **Run** in its lower-right corner; a status line under the card; and the members line and Member settings drawer. Like New chat, it sits outside the workspace tool shell. Run starts the Org with these settings and member overrides and no focused recipient, then opens the launched Org run view, where the user chooses an exact Agent or Team, as today. States and copy follow UIS-004: blocked, preparing, launching, failed, unavailable. The page keeps the existing route `/workspace?rootSubjectKind=agent_org&definitionId=…&mode=configuration[&sourceOrgRunId=…]` (DEC-005). | BEH-003 | High | Org has no coordinator; keep chat for Agents/Teams | User 2026-10-05; DEC-004; UXJ-003 |
| REQ-008 | New chat page heading = the target name (avatar only when the definition has one), shown as the heading switcher (REQ-019). The default agent (Daily Assistant) keeps its `/` `@` hint. Placeholders follow the spec copy for Agents and Teams. The Org launch page heading is the Org name, also as the switcher. | BEH-001..003 | Medium | Identity as heading | UIS-001, UIS-004, VIS-001/002/012 |
| REQ-009 | Member overrides cover **model+runtime, thinking and tool approval**. A team placed in an Org also overrides **workspace**. Only fields that differ are stored. A customized row shows "Customized", and supports per-field Reset, row reset and "Reset all". | BEH-002, BEH-003 | High | DEC-002 | Product impact 4; TR-004/005 |
| REQ-010 | A launch applies the member overrides: Team from New chat, Org from the Org launch page. | BEH-002, BEH-003 | High | Overrides must take effect | TR-002 |
| REQ-011 | `@` in any composer (New chat and running Agent/Team chats) inserts a collaborator mention ("Bring into this run"). The menu lists **only Agents and Agent Teams**, never Orgs, and excludes the current target. It never switches the chat target. The "Chat with" target-switching mode is removed. | BEH-006 | High | Consistent `@`; an Org cannot be brought in | Product impact 3; user 2026-10-05 |
| REQ-012 | The first message of a new run keeps its `@` mentions. | BEH-006 | Medium | Mentions not lost on launch | Product impact 3 |
| REQ-013 | "+" on a running/stored Agent or Team run opens New chat for the same definition, prefilled with that run's workspace, approval and model+thinking (Team also copies member overrides). "+" on a running/stored Org run opens the Org launch page prefilled the same way, including member overrides; a placed team keeps its workspace only where it differs from the Org's. If copying fails, the surface opens with definition defaults. | BEH-007 | Medium | Consistent "+" | Product impact 5; DEC-004 |
| REQ-014 | While a saved run is running, a small red stop icon after the badge invokes the same terminate action as the workspace tree. Its label/tooltip reuses the workspace tree's existing wording for that run type: Agent "Terminate run", Team "Terminate team", Org "Stop Agent Org" (existing localization keys). Pending and failure text use the same verb: "Terminating…" / "Couldn't terminate this run. Try again." for Agent and Team; "Stopping…" / "Couldn't stop this org. Try again." for Org. Stopping shows a disabled/pulsing state. On success the badge turns Stopped and model/thinking become editable. | BEH-004 | High | Resolve "Stopped" + "Stop this run…" contradiction; wording per DEC-003 | TR-008; DEC-003 (user 2026-10-05) |
| REQ-015 | In saved-run settings, changing the team- or org-wide model updates every non-customized member, including members of placed teams. Any change shows the Save bar "Unsaved changes · they apply when this run resumes · Cancel · Save". Cancel restores the saved values. Save shows "Saving…", then "Saved. Changes apply when this run resumes." | BEH-004 | High | Edit semantics | TR-009/010 |
| REQ-016 | Saved-run special states use only the spec copy: read-only "This run's settings can't be changed."; refresh-required "Saved settings need a refresh before you can change them. Refresh"; model-unavailable "No longer offered by {runtime}. Choose another model before this run resumes." | BEH-004 | High | Preserve semantics, new copy | UIS-003 states |
| REQ-017 | The saved-run model menu matches the chat model menu: a search box, the run's runtime as a locked label ("The runtime is fixed for this run"), and only that runtime's models. | BEH-004, BEH-005 | Medium | Consistency | VIS-008 |
| REQ-018 | The superseded launch UI and its copy are removed from production: the Agent and Team launch configuration forms and their sub-forms; the old Org launch form content (`AgentOrgRunConfigForm` / the long `AgentOrgRunConfigPanel` form), replaced by the Org launch page at the same route; the draft run config editor; the pending-launch branch of the run config panel; the run-preparation composable; the "Chat with" `@` mode; New chat's "Files are saved in …" line; "Kept from the saved run: …"; and their localization keys (en and zh-CN). | BEH-001..008 | High | Single visual language; no dead code | Product impact 7; DEC-004; Fidelity Boundary |
| REQ-019 | The heading on New chat and on the Org launch page is one "what to run" switcher. Search "Search agents, teams and orgs"; sections "Agents" (Daily Assistant first), "Agent teams", "Agent orgs"; the current target is checked. Choosing an Agent or Team opens/retargets New chat; choosing an Org opens the Org launch page. Workspace, approval and model+thinking carry across switches; member overrides reset on a target change; typed text is kept between Agent/Team switches but not carried through the Org page (DEC-006). It is available only before starting and disabled while a run is starting. Orgs reached this way are still never chatted with or `@`-mentioned. | BEH-001..003, BEH-006 | High | Fast target choice without overloading `@` | User rounds 32/34; UXJ-008, TR-015, VIS-016 |
| REQ-020 | New chat and the Org launch page show one small "Show tools" icon (top-right corner). The right tools (Files, Terminal, …) are closed by default; the icon opens them docked beside the page when there is room, otherwise as the drawer. Closing brings the icon back; no icon strip is shown on these pages. The open/closed choice is remembered, holds across switches, and a run started from the page keeps the panel open. Files and Terminal use the workspace chosen on the page. | — | Medium | User need with the server in Docker: copy a folder path from the Terminal while choosing a workspace | User round 35; UXJ-009, UIS-005, TR-016, VIS-017 |
| REQ-021 | Initial settings when a start page opens. **Run on an Agent, Team or Org:** that definition's default launch config (runtime, model, model config), as today. If it has no default model or the model is unavailable, fall back to the last model used in chat, then the default runtime's first model; this replaces today's empty "Select a model". Workspace defaults to the temp workspace. Tool approval defaults to Auto-approve for Agents, Teams **and Orgs**: today the Org form defaults to off, and is aligned with the others; the Antigravity lock is unchanged. "+" (REQ-013) and the switcher (REQ-019) use the copied or carried settings instead. **Plain New chat (Chat menu):** unchanged, last chat model → Daily Assistant default → default runtime's first model. | BEH-001..003 | Medium | Keep today's definition defaults; never open empty, as chat already does; one approval default everywhere | `useDefinitionLaunchDefaults.ts` `buildAgentRunTemplate`/`buildTeamRunTemplate`; `agentOrgRunConfigStore.begin` (`autoExecuteForNewRuntimeSelection(…, false)`); `chatDraftStore.resolveDefaultModel`; user delegation 2026-10-05 |
| REQ-022 | Every in-scope model+thinking surface also offers the selected model's **other model settings**: every config-schema parameter that is not a thinking setting, labelled by its schema title, e.g. Codex **Fast mode** (`service_tier`). Each is its own small control next to Thinking, not part of the Thinking menu (Product UXJ-010/TR-017). **Message box** (New chat, every target): one chip per setting after the Thinking chip. A toggle chip is used for "Default or one value"/boolean (e.g. "⚡ Fast": off gray, on blue with a solid bolt, `aria-pressed`, "{setting}: On/Off"; icon-only below `sm`). A menu chip is used for multi-value settings (Default first). **Labelled surfaces** (Org launch card, Member settings rows, saved-run settings): a row per setting under Thinking (e.g. "Fast mode") with the same chip. Default leaves the parameter unset. A model with only other settings shows only the chip in the message box; the card keeps "Thinking: Not available for this model" and adds the row. A model without them shows nothing extra. Thinking and other settings are independent: changing either keeps the other. Choosing another model resets them. "+" copy and the switcher carry them with the model config. **Members:** a per-row "Customized" and Reset; Thinking counts as customized only when the thinking settings differ, and a member whose model config matches its parent again follows the parent. The member summary line adds each "on" setting after the model ("GPT-5.6 Sol · Codex · Fast · Auto-approve"); the Thinking summary is unchanged. **Saved runs:** locked while running (value + lock), editable when stopped with the Save bar, members follow unless customized; locked while starting or copying. | BEH-009 | High | Fast mode was settable on the old forms; the user called its absence a miss | User 2026-10-05 ("we need to enable the faster mode"); Product SR-005 correction confirmed 2026-10-05 ("perfect. i checked. its great") |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-005, REQ-008 | SCN-001..003 | Click Run on an Agent, Team or Org (list and detail) | Agent/Team: `/chat` New chat with the target-name heading and the four controls showing definition defaults. Org: the Org launch page with the Org heading and defaults. The old long forms appear nowhere. | — | Component + browser E2E |
| AC-002 | REQ-006 | SCN-001..003 | Agent/Team New chat with no message; Org launch page | Agent/Team: Send is disabled and no run is created. Org: no message box; Run (play icon, tooltip/aria "Run") starts the Org. | No model → Send / Run disabled; reason "Choose a model to start." (Org: amber line under the card and Run tooltip/aria); runtime unavailable → "{Runtime} is unavailable. Choose another runtime." | Component |
| AC-003 | REQ-006, REQ-007, REQ-010 | SCN-003 | Org launch page, member overrides set, click Run | Spinner in Run + "Starting {Org} on {runtime}…", settings locked. One Org run is created with the settings and overrides and no focused recipient. The launched Org run view opens (listed as "New - {Org}"), and the user chooses an Agent or Team, as today. Each Run creates its own run. | Failure → red "Couldn't start this Agent Org. Try again.", page and values kept, Run enabled; unavailable Org → "This Agent Org isn't available. Choose another Agent Org." + "Back to Agent Orgs"; no orphan run | Integration + browser E2E against a real server |
| AC-004 | REQ-006, REQ-010 | SCN-002 | Team New chat with one member customized, send | The Team run is created with the overrides applied to that member only; the coordinator gets the message | A failed launch keeps the draft | Integration + E2E |
| AC-005 | REQ-002 | SCN-006 | Team/Org New chat | Members line copy per state; Customize/Edit opens the drawer with focus on Close; Escape/Done closes it and returns focus; the width can be dragged/keyed within 400–960 px and persists after reload | < `sm`: full width, no resize edge | Component + browser |
| AC-006 | REQ-009 | SCN-006 | Change a member's model, thinking or approval; for an Org placed team, its workspace | The row shows "Customized"; the line updates; only differing fields are stored; Reset / row reset / Reset all restore inheritance | Antigravity model → approval locked to Auto-approve with a tooltip | Component |
| AC-007 | REQ-011, REQ-012 | SCN-007 | Type `@` in New chat or a running Agent/Team chat | The menu reads "Bring into this run"; it lists only Agents and Agent Teams (no Orgs); the current target is excluded; Enter inserts `@Name ` as one token; the target does not change; after the first send of a new run, the message text contains the mention | — | Component + E2E |
| AC-008 | REQ-013 | SCN-008 | Click "+" on a running/stored Agent, Team or Org run | Agent/Team: New chat prefilled with the run's workspace, approval and model+thinking (+ member overrides for Team). Org: the Org launch page prefilled likewise, including member overrides | Copy failure → definition defaults | Component + browser |
| AC-009 | REQ-004, REQ-014 | SCN-004 | Open Edit Config on a running run | Running badge + red stop icon; workspace/model/approval locked; thinking read-only; stop → Stopped and editable | Stop fails → "Couldn't stop this run. Try again." | Component + E2E |
| AC-010 | REQ-015 | SCN-004 | Stopped editable run, change the Org- or Team-wide model | Non-customized members (including placed-team members) show the new model; the Save bar appears; Cancel reverts; Save persists through the existing save path with the spec feedback | Save error is surfaced | Component + integration |
| AC-011 | REQ-016, REQ-017 | SCN-004 | Read-only / refresh-required / model-unavailable states; open the model menu | Exact spec copy; the model menu shows search, a locked runtime label and only that runtime's models | — | Component |
| AC-012 | REQ-018 | All | Codebase after change | Removed components, route mode, composable and localization keys are absent; en/zh-CN keys stay in parity; no dead references | — | Static check + tests |
| AC-013 | REQ-003 | SCN-003 | Org/Team validation and labels | No raw address appears in user-facing text (e.g., the old "Select a model for / before launch.") | — | Component |
| AC-014 | REQ-001 | All | Visual comparison against VIS-001..011 at 880 px and 390 px | Matches within the fidelity boundary (fixture names, counts and models may vary) | — | Browser screenshots |
| AC-015 | Preserved boundary | — | Mobile run setup, Applications launch profiles, definition launch preferences | Behavior unchanged | — | Existing tests |
| AC-016 | REQ-019 | SCN-001..003 | Click the heading on New chat or the Org launch page; search; choose | The menu lists Agents / Agent teams / Agent orgs with the current target checked. Agent/Team → New chat retargeted (heading, placeholder, members line); Org → the Org launch page. Workspace, approval and model+thinking are kept; member overrides reset; Esc returns focus. The switcher is disabled while starting. | Empty search → "Nothing matches" | Component + browser |
| AC-017 | REQ-020 | — | Click "Show tools" on New chat / the Org launch page; close; reload; start a run | Tools dock (or open as a drawer when narrow), showing the page's chosen workspace in Files/Terminal; closing restores the icon; the choice persists across reload and switches; a started run keeps the panel open | — | Component + browser |
| AC-018 | REQ-021 | SCN-001..003 | Run on a definition with / without a default launch config; plain New chat | Initial model follows the REQ-021 order for each case | The default's model is unavailable → next fallback | Component |
| AC-019 | REQ-022 | SCN-001..004, SCN-006 | A Codex model with Fast mode is selected in New chat, on the Org page, for a member, and on a stopped saved run | The "⚡ Fast" chip/row is shown. Turning it on stores `service_tier: "fast"` in that scope's model config, and the launched or saved run's model config contains it. Default/off removes it. Thinking is unchanged by the toggle and vice versa. A model with only Fast mode shows only the chip (or the row, with "Thinking: Not available for this model"). A model without other settings shows no extra control. The member row shows its own Customized/Reset, and the member summary shows "Fast". | Running saved run → locked ("⚡ Fast 🔒" / "Off 🔒") | Component + API/E2E (run model config contains `service_tier`) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Start an agent run | Agents → Run | Agent defined | Run → New chat → adjust controls → send | Agent run's chat | No model → blocked | Supported Normal | UXJ-001 | REQ-001, REQ-005, REQ-006, REQ-008 |
| SCN-002 | User | User | Start a team run | Agent Teams → Run | Team defined | Run → New chat → (customize) → send | Team run view | Launch failure keeps draft | Supported Normal | UXJ-002 | REQ-001, REQ-002, REQ-005, REQ-006, REQ-009, REQ-010 |
| SCN-003 | User | User | Start an org run | Agent Orgs → Run, "+" on an Org run, or choosing an Org in the heading switcher | Org defined | Org launch page → (customize) → Run → choose an Agent/Team in the launched Org run view | Org run view; user picks a recipient | Blocked; failed; unavailable | Supported Normal | DEC-004; UXJ-003; `docs/agent_orgs.md` | REQ-001..003, REQ-005..007, REQ-009, REQ-010, REQ-019, REQ-021 |
| SCN-004 | User | User | Review/stop/edit a saved run | Workspace → run → Edit Config | Run exists | Inspect; stop; change model/thinking; save | Saved / stopped | Read-only; refresh; model unavailable; stop failure | Supported Normal | UXJ-006 | REQ-004, REQ-014..017 |
| SCN-005 | User | User | Chat with General Agent | Chat nav | — | Type, send | Chat run | — | Supported Normal (reference) | VIS-001 | REQ-001, REQ-008 |
| SCN-006 | User | User | Customize members | Members line | Team/Org New chat | Open drawer; change/reset | Line shows the customized count | AGY lock | Supported Normal | UXJ-004 | REQ-002, REQ-009, REQ-010 |
| SCN-007 | User | User | Bring a collaborator | `@` in any composer | Composer focused | `@` → choose | Mention inserted and sent | — | Supported Normal | UXJ-007 | REQ-011, REQ-012 |
| SCN-008 | User | User | Start another run like this one | "+" on a run | Run exists | Agent/Team: "+" → New chat prefilled → send. Org: "+" → Org launch page prefilled → Run | New run with copied settings | Copy failure → defaults | Supported Normal | UXJ-005; DEC-004 | REQ-013 |
| SCN-009 | User | User | Start an Org from the chat page, or `@`-mention an Org | — | — | — | — | — | Technically Possible but Unsupported/Contrived (rejected by user 2026-10-05: an Org has no coordinator; `@` is only for Agents/Teams) | User 2026-10-05 | REQ-007, REQ-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md` (normative)
- Runnable UI reference: design repository root, `corepack pnpm dev --port 4520` (canonical checkout `origin/personal` = `6718986`)
- Product ticket record (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/product-ticket.md`
- Design repository revision: `origin/personal` = `6718986` (SR-005; SR-003 was `a5b0eec`; SR-001 was `b8ce240`). Ticket branch `design/run-settings-ui-unification`. Source pin `autobyteus-web origin/personal@10fb695`, re-checked at `fc79fad` (only the default agent display name "Daily Assistant" and a version bump changed).
- UI/UX user-confirmation reference: SR-001 result 2026-10-05, "Okay, I like this UI. It's now much cleaner right now. I'm satisfied now." (`review-round-30.md`); SR-003 revision 2026-10-05, "I'm currently satisfied with the UI now … Let's finalize now … the ticket is done." (`review-round-33-38.md`); SR-005 correction 2026-10-05, "perfect. i checked. its great" (`review-round-39.md`)
- Approved visual-reference baseline: `visual-references/VIS-001..042` (804/880 px desktop, 1512 px wide, 390 px phone); VIS-020..029 cover REQ-022, and VIS-030..042 add the states that were previously copy-only
- Normative details: the spec sections Visual Language, Journey Details, State Behavior, Content (exact copy), Responsive, Accessibility, Motion, and Implementation Fidelity Boundary
- Explicitly illustrative: agent/team/org/model/workspace names and descriptions, member counts, left navigation contents
- Not prescriptive: the UI reference's `components/run-settings/*` structure, prototype stubs, fixtures, scripted stop/save, and the Org config read path through `apolloClient`
- Unresolved product decisions: none. DEC-005 and DEC-006 were decided under user delegation; DEC-007 is out of scope. States without a dedicated screenshot (the `@` menu; Org blocked/preparing/launching; saved Agent run and its error states; member Antigravity lock / "Choose a model"; narrow tools drawer) follow the spec copy and the styles in VIS-001..019. Implementation validation captures them. DEC-003 deviates from the spec's stop copy by user decision; see REQ-014.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, REQ-011, REQ-004 | Accessibility | Keyboard operability and accessible names per the spec's Accessibility section (drawer `role="dialog"`, separator resize, aria labels, focus return, live Save bar) | All new surfaces | Component tests |
| QR-002 | REQ-001 | Compatibility | en and zh-CN localization keys stay in parity | All new/removed copy | Localization audit/tests |
| QR-003 | REQ-002 | Other (motion) | Reduced-motion disables transitions | Drawer | Visual check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` server persistence is expected to change.
  - New browser-local key: `autobyteus.chat.memberPanelWidth`.
  - Saved runs keep their existing config and save path.
- Data that must be preserved: existing runs' configs; saved-run settings the model menu does not
  show are kept on save.
- Unknowns: whether the first-message mention and the Org launch with member overrides need any server contract
  change (ASM-001).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Product UI/UX package | Visual/interaction source of truth | User approval 2026-10-05 | — |
| Org run launch (existing `agentOrgRunStore` path) | Must accept the Org launch page settings + member overrides; no recipient | Source; `docs/agent_orgs.md` | Architecture to confirm (ASM-001) |
| Team run launch (`launchTeamChat`) | Must accept member overrides (today it is root-only) | `chatTeamLaunchConfig.ts` | Extension needed |
| Terminate action (workspace tree) | Reused by the saved-run stop icon | Spec TR-008 | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `evidence/user-screenshots/*.png` | Pre-change state | BEH-001..008 | Final | Evidence only |
| `product-design-request.md` | SR-001 Product handoff | All | Sent | N/A |
| Product `ui-ux-spec.md` + `visual-references/VIS-001..011` | Normative UI | REQ-001..018 | Final | **User-approved 2026-10-05** |
| Product `product-ticket.md`, `review-round-1..30.md` | Rationale/history | — | Final | Informational |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The Org launch page (settings + overrides), Team overrides from chat, and first-message mentions can be built on existing frontend launch services and server APIs without a server contract change | Sizing/scope | Architecture investigation | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Direction | — | Decided: D (Run opens New chat) | User via Product 2026-10-05 | Closed |
| DEC-002 | Member override set | — | Decided: model+runtime, thinking, approval; placed teams + workspace | User via Product 2026-10-05 | Closed |
| DEC-005 | Route of the Org launch page | Product kept the existing route and asked whether it should move under Chat | Decided: keep `/workspace?rootSubjectKind=agent_org&definitionId=…&mode=configuration[&sourceOrgRunId=…]`. Org "+" (`sourceOrgRunId`) and workspace route selection already use it; the change is invisible to the user and avoids route churn. | Solution Designer under user delegation ("you can read our current project and give reasonable answer", 2026-10-05) | Closed |
| DEC-006 | Typed message when switching targets | Convenience | Decided: Agent↔Team switches stay in the same composer, so the typed text is kept. Switching to an Org leaves chat (the Org page has no message box), so the text is not carried back; settings are carried. This matches the approved UI reference. | Solution Designer under user delegation, 2026-10-05 | Closed |
| DEC-007 | Optional Org "entry point" (a team or agent where Run lands and the first message goes) | Would change the Org model and partly reopen DEC-004 | Discussed with Product only | User | Out of scope: separate ticket candidate |
| DEC-004 | Where Orgs are launched | An Org has no coordinator/initial recipient, so "first message starts the run" cannot apply | Decided: A — Orgs are not a chat target; Run / "+" open a short Org launch page in the new visual language (settings card + members line/drawer + Run); `@` lists only Agents and Agent Teams | User 2026-10-05: "organization can only be started from the organization page when user click run or with the plus on the running org" | Closed (the screen needs a Product revision and user UI confirmation) |
| DEC-003 | Saved-run stop wording | Consistency of verbs | Decided: reuse the workspace tree's existing labels per run type (Agent "Terminate run", Team "Terminate team", Org "Stop Agent Org"); this overrides the spec's "Stop run" / "Stopping…" / "Couldn't stop this run. Try again." | User 2026-10-05: "we use the word like earlier" | Closed |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Product Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | all | all | AC-014 | all | VIS-001..011 |
| REQ-002 | UC-002, UC-003 | BEH-002, 003 | AC-005 | SCN-006 | UIS-002, VIS-002..005, 010, 011 |
| REQ-003 | UC-003 | BEH-003 | AC-013 | SCN-003 | — |
| REQ-004 | UC-004 | BEH-004 | AC-009 | SCN-004 | VIS-006..009 |
| REQ-005 | UC-001..003 | BEH-001..003, 005 | AC-001 | SCN-001..003 | UXJ-001..003, TR-001 |
| REQ-006 | UC-001..003 | BEH-001..003 | AC-002..004 | SCN-001..003 | TR-002 |
| REQ-007 | UC-003 | BEH-003 | AC-003 | SCN-003 | UXJ-003 |
| REQ-008 | UC-001..003 | BEH-001..003 | AC-001 | SCN-001..003, 005 | VIS-001/002 |
| REQ-009 | UC-002, UC-003 | BEH-002, 003 | AC-006 | SCN-006 | TR-004/005, VIS-004/005 |
| REQ-010 | UC-002, UC-003 | BEH-002, 003 | AC-003, AC-004 | SCN-002, 003 | TR-002 |
| REQ-011 | UC-005 | BEH-006 | AC-007 | SCN-007 | UXJ-007, TR-011 |
| REQ-012 | UC-005 | BEH-006 | AC-007 | SCN-007 | UXJ-007 |
| REQ-013 | UC-006 | BEH-007 | AC-008 | SCN-008 | UXJ-005, TR-007 |
| REQ-014 | UC-004 | BEH-004 | AC-009 | SCN-004 | TR-008 |
| REQ-015 | UC-004 | BEH-004 | AC-010 | SCN-004 | TR-009/010, VIS-007 |
| REQ-016 | UC-004 | BEH-004 | AC-011 | SCN-004 | UIS-003 states |
| REQ-017 | UC-004 | BEH-004, 005 | AC-011 | SCN-004 | VIS-008 |
| REQ-018 | all | BEH-001..008 | AC-012 | all | Fidelity Boundary |
| REQ-019 | UC-001..003 | BEH-001..003, 006 | AC-016 | SCN-001..003 | UXJ-008, TR-015, VIS-016 |
| REQ-020 | UC-001..003 | — | AC-017 | SCN-001..003 | UXJ-009, UIS-005, TR-016, VIS-017 |
| REQ-021 | UC-001..003 | BEH-001..003 | AC-018 | SCN-001..003 | UXJ-003 step 2 |
| REQ-022 | UC-001..004 | BEH-009 | AC-019 | SCN-001..004, SCN-006 | Extends the UI spec's Thinking control (user direction 2026-10-05) |

## Architecture Phase Input

- Scenario paths to map: SCN-001..008.
- Constraints:
  - preserved boundary above;
  - `RuntimeModelConfigFields` is still used by mobile and definition launch preferences;
  - existing launch services remain the single launch owners.
- Decisions deferred to architecture:
  - ownership of member-override drafting in the chat draft;
  - the Org launch page owner and route (reuse of `mode=configuration` or not);
  - how the saved-run editor reuses the chat controls;
  - removal sequencing.
- Technical facts to verify:
  - Org launch API inputs;
  - whether the Team launch draft accepts overrides at creation;
  - how the first-message mention is preserved;
  - the "+" source-run copy path for Agent/Team/Org;
  - the terminate action reuse.
- Known risks:
  - a large frontend deletion surface with many specs (`workspace/config/__tests__`);
  - the Org launch page is a new surface replacing the old Org form.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Approved 2026-10-05 (SR-004). Architecture design may proceed.
