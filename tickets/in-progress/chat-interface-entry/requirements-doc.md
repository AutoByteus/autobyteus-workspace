# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006` (editorial cleanup only since SR-003/SR-004; no intended-behavior change)
- Package identifier: `chat-interface-entry`
- Request / ticket: User request 2026-09-28 — Chat entry ("New chat") above Agents with easy runtime/model selection; Product ticket `chat-interface-entry` (prototype repository)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-28
- Approval state and reference: Approved by user 2026-09-28 in the Solution Designer conversation (final message: "Yes, I think that's more consistent design … chat just adds features to it"), after decisions DEC-005, DEC-008–DEC-014 were answered in the same conversation.
- Exact approved requirements baseline / solution revision: `SR-003` intended behavior; `SR-004` integrates the user-confirmed R2 supplement without changing intended behavior
- Behavior-defining supplements and their approved versions: Product UI/UX spec `ui-ux-spec.md` **revision R2** + VIS-001–VIS-025 (VIS-020 superseded/removed; 24 files) at `autobyteus-web-prototype` `origin/personal@8ac6cad` (R2 package commit `af5b6b0`, ticket done `efa5a97`). User confirmations: R1 2026-09-28 (PC-035); R2 2026-09-28 ("I think now the chat box looks good", after PC-036–PC-041). Solution Designer verified 24/24 SHA-256 against `manifest.json`.

## Problem And Desired Outcome

- Problem: AutoByteus opens on a definition-first catalog with no chat entry. The user's real workflow starts in a chat with a general agent (discover/try skills), later promoting a proven setup into an Agent/Team/Org. Choosing runtime and model across several runtimes is a multi-step form, and the message box differs between surfaces.
- Affected actors: AutoByteus desktop/web users; the product owner as primary power user.
- Desired outcome: A first-class Chat (first nav item, pencil = New chat) where the user types and sends to Daily Assistant by default, addresses another agent or team with `@`, tags skills with `/`, picks runtime+model from one compact menu with a separate thinking control, uses the temp workspace by default, and gets the same message box in chat and existing run views. Chats are normal agent runs in the Workspaces tree.
- Observable definition of success: From any page, Chat → type → Enter starts a normal agent run without a configuration form; runtime + model are selected from one menu (a new chat starts with the last-used runtime + model); the run appears in the Workspaces tree and reopens in the chat view.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | `/` redirects to `/agents` | `Chat` is the first nav item with a New chat pencil; landing route per DEC-005 | Agents/Teams/Orgs catalogs | `pages/index.vue`, `useShellPrimaryNavigation.ts` |
| BEH-003 | User | SCN-002 | Runtime dropdown → runtime-scoped model search → model config section | One compact menu: search across enabled runtimes, runtime rows → that runtime's models (submenu; drill-in on narrow), loading/error/not-installed states; no Recent list; separate thinking control | Only enabled runtimes selectable; per-runtime catalogs | `RuntimeModelConfigFields.vue`; UIS-003/004; DEC-011 |
| BEH-004 | User | SCN-003 | Temp workspace offered by selector | New chat defaults to Temp workspace; pick existing workspace or open a folder before the first message; fixed after | Existing workspaces | `WorkspaceSelector.vue`; UIS-005 |
| BEH-005 | User | SCN-001 | No current supported behavior | Chat: New chat page → first send starts a normal agent run shown in the chat view | Normal run lifecycle | UIS-001, UIS-008 |
| BEH-006 | User | — | No current supported behavior | Out of scope (DEC-003: no "Save setup as agent") | — | Product PC log |
| BEH-007 | User | SCN-004 | Skills bound by name per agent definition; no chat skill tagging | `/` tags one or more of the addressed agent's skills; sent text prefixed with a "use these skills" instruction; chips remain on the message with "sent as" tooltip | All skills stay available | UXJ-004 |
| BEH-008 | User | SCN-005, SCN-006 | Agents/teams launched from catalogs only | `@` in a New chat addresses an agent or team; `+` on an agent in the tree starts a New chat preset to that agent and workspace | Catalog launch forms unchanged | UXJ-005, UXJ-006 |
| BEH-009 | User | SCN-006 | Team launch requires the team launch form | Team quick path: one runtime/model/thinking, one shared workspace, one approval setting for all members; first message to the coordinator; opens existing Team view | Agent Teams launch form unchanged; Agent Orgs not addressable from Chat | UXJ-006 |
| BEH-010 | User | SCN-007 | Model config editability governed by server `runModelConfigEditability` (not editable while run active/archived); UI surfaces vary | Footer model/thinking locked (🔒, inert, tooltip) while run live; editable before first message or when Offline; runtime never changes; settings apply when the next message resumes the run | Server rule unchanged | `run-history/domain/run-model-config.ts`; UXJ-007 |
| BEH-011 | User | SCN-008 | Single-agent runs open in the workspace view with right tabs | Single-agent runs (incl. chats) open in the chat view with the product right tool strip collapsed by default; team/org runs keep their existing view | Team/org views; RightSideTabs content | UXJ-009, UXJ-011; DEC-007 |
| BEH-012 | User | SCN-009 | Run-view message box: always-visible "Context Files (N)" area (drag, paste, upload) + textarea + mic + send | Chat box = the same box and the same Context Files area/styling, plus Chat-only features: footer (workspace on New chat, auto-approve, runtime/model, thinking), `/` skill tags, `@` addressing | Agent-team and org run views' message box completely unchanged; model changes there via the existing settings (gear) editor | `AgentUserInputForm.vue`, `ContextFilePathInputArea.vue`, `ExistingRunConfigEditor.vue`; DEC-013, DEC-014 |
| BEH-013 | User | SCN-001 | Auto-execute tools configured per run config | New chats (any workspace) default to Auto-approve; visible toggle to "Ask first" before the first message; header shows the mode | Catalog launch forms keep their own setting | UXJ-008 |
| BEH-014 | User | SCN-008 | Runs listed in Workspaces tree | Chats are normal runs under workspace → agent, normal product ordering; open/terminate/archive/delete via existing row actions; no separate Chats list | Existing tree ordering and actions | UXJ-011; DEC-004 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Everyday user | Ask/do something quickly | Start chatting with minimal setup | No agent config knowledge needed |
| Power user (product owner) | Experiment with skills; use specific agents/teams quickly | `/` skills, `@` agents/teams, fast runtime/model pick | Full per-member setup stays on Agent Teams form |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
- UC-001: Open Chat (nav item or pencil) and start a New chat with Daily Assistant.
- UC-002: Select runtime + model (and thinking) from the compact menu.
- UC-003: Use Temp workspace by default or choose another workspace/folder before sending.
- UC-004: Tag skills with `/`.
- UC-005: Address another agent with `@` or tree `+`.
- UC-006: Start an agent team quickly from Chat via `@`.
- UC-007: Change model/thinking of an existing chat when it is Offline.
- UC-008: Attach files, dictate, and choose Auto-approve / Ask first.
- UC-009: Use workspace tools from the chat view's right strip.
- UC-011: Reopen, terminate, archive, delete chats from the Workspaces tree.

### Out Of Scope
- "Save setup as agent" / converting chat into Agent/Team/Org (DEC-003).
- Agent Orgs addressed from Chat; per-member team configuration from Chat.
- A separate Chats list; `/` and `@` in run views; per-reply model provenance.
- Changes to Agents / Agent Teams / Agent Orgs catalogs and launch forms.
- A non-agent chat runtime.
- Reuse of the removed `codex/general-chat-entry` implementation (DEC-008; branch deleted).

### Non-Goals
- Any change to team-member / org-member run views, including their message box (DEC-013).

### Preserved Behavior Boundary
- Normal agent/team/org run lifecycle, history, streaming (BEH-002 in SR-001); server `runModelConfigEditability` rule; catalog launch forms; Workspaces tree ordering and existing row actions; context-file upload ownership; Voice Input extension rules.

### Review Authority
- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- New product behavior, policy or compatibility promises are `Requirement Gap`s requiring explicit user approval.
- Adjacent concerns are non-blocking risks or separate-ticket candidates.
- Reviewer comments do not amend this basis without Solution Designer update and renewed user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Primary navigation shows `Chat` as the first item (above Agents) with a New chat (pencil) control; Chat stays active on all chat routes. | BEH-001 | High | User request | User; UIS-012 |
| REQ-002 | New chat page per UIS-001: heading, subtitle, large message box, hint line; first send starts the run and shows it in the chat view. | BEH-005 | High | User request | UIS-001, UXJ-001 |
| REQ-003 | Every chat is a normal agent (or team) run using existing run lifecycle, history and streaming. | BEH-005 | High | "just one agent wrapped in chat" | User |
| REQ-004 | New chat defaults to Temp workspace; user can choose another workspace or open a folder (absolute-path validation) before the first message; workspace is fixed afterwards and shown in the header. | BEH-004 | High | User request | UXJ-003 |
| REQ-005 | Runtime + model selection via one compact menu: search across enabled runtimes (results labelled by runtime), runtime rows opening that runtime's models (side submenu; drill-in on narrow), loading / error+Retry / Not installed states. No Recent list. | BEH-003 | High | Core request | DEC-001, DEC-011; UXJ-002 |
| REQ-006 | Thinking is a separate control, shown only when the selected model supports it; its options follow the selected runtime/model config schema (see DEC-009). Choosing a model applies that model's default thinking. | BEH-003 | High | Core request | UIS-004; OPEN-001 |
| REQ-007 | Chat defaults to Daily Assistant: an internal agent shipped in the platform Built-in agent package, with general tools and access to all installed skills without manual list maintenance; visible and configurable like any agent (Agents list, Workspaces tree). | BEH-005 | High | DEC-002 | Product decision 2 |
| REQ-008 | `/` in a Chat message box lists the addressed agent's skills (Daily Assistant: all), ranked; multiple tags allowed; a message may be tags only; sent text is prefixed with "Use the <skill> skill for this request." / "Use these skills for this request: a, b." followed by the user text; chips stay on the sent message with a "SENT TO THE AGENT AS" tooltip. | BEH-007 | High | New user decision | UXJ-004; OPEN-005 |
| REQ-009 | `@` (before the first message of a New chat) addresses an agent or agent team; `+` on an agent in the tree starts a New chat preset to that agent and workspace; `×` returns to Daily Assistant. | BEH-008 | High | New user decision | UXJ-005 |
| REQ-010 | Team quick path: a team addressed from Chat launches with one runtime/model/thinking, one shared workspace and one approval setting for all members; first message goes to the coordinator; the run opens in the existing Team view. Agent Orgs are not addressable. | BEH-009 | High | New user decision | UXJ-006 |
| REQ-011 | Model/thinking in footers are editable only before the first message or while the run is Offline; locked (lock icon, inert, tooltip) while live, per server `runModelConfigEditability`; runtime never changes for a run; changed settings apply when the next message resumes the run. | BEH-010 | High | DEC-006 | UXJ-007 |
| REQ-012 | Single-agent runs (including chats) open in the chat view (UIS-008) with the product right tool strip collapsed by default and opening RightSideTabs on click; team/org runs keep their existing view. | BEH-011 | High | DEC-007 | UXJ-009, UXJ-011 |
| REQ-013 | The Chat message box (New chat page and chat view) uses the same box and the same Context Files area (styling and drag/paste/upload behavior) as the existing run-view box, and adds only Chat features: footer controls (workspace on New chat, auto-approve, runtime/model, thinking), `/` skill tags and `@` addressing; mic follows the Voice Input extension. Team-member and org-member run views are unchanged. | BEH-012 | High | User decisions | DEC-013, DEC-014 |
| REQ-014 | New chats in any workspace default to Auto-approve tools; a visible toggle switches to "Ask first" before the first message (applies to all team members on the quick path); the header shows the mode. | BEH-013 | High | New user decision | UXJ-008 |
| REQ-015 | Chats appear as normal runs under workspace → agent in the Workspaces tree with normal ordering; reopen, terminate, archive and delete use existing row actions and confirmations; an unknown chat id shows "This chat no longer exists" + New chat. | BEH-014 | High | DEC-004 | UXJ-011 |
| REQ-016 | Chat header shows title (from first message, ≤42 chars), status Running / Idle / Offline, and agent · workspace · approval; the conversation shows messages only (no divider notes). | BEH-005, BEH-010 | Medium | Product decision 12 | UIS-008 |
| REQ-017 | Agents / Agent Teams / Agent Orgs catalogs and launch forms remain unchanged. | — | High | Preservation | Investigation |
| REQ-018 | Visible design, copy and states match the approved R2 UI/UX spec and visual references (VIS-020 superseded) except explicitly illustrative content; responsive behavior at 390px per spec. | All UI | High | Approved supplement | ui-ux-spec.md R2 |
| REQ-019 | A New chat preselects the last-used runtime + model (one value remembered on this device); if none, Daily Assistant's default launch config; otherwise the runtime default. | BEH-003 | Medium | DEC-011 | User 2026-09-28 |
| REQ-020 | When the application starts (desktop, `/`), the user lands on the Chat screen (New chat); Agents remains reachable from navigation. | BEH-001 | Medium | OPEN-002 | — |

## Acceptance Criteria

| AC ID | Related REQ | Scenario | Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Open app | `Chat` first in nav with pencil; active on `/chat*` | — | UI test |
| AC-002 | REQ-002, REQ-003, REQ-007 | SCN-001 | New chat, type, Enter | Normal Daily Assistant run is created, streams in the chat view, row appears selected under workspace → Daily Assistant | Runtime unavailable → send disabled with reason | E2E |
| AC-003 | REQ-004 | SCN-003 | Send without choosing workspace / after choosing folder | Run bound to Temp workspace / chosen folder; relative path rejected with "Enter an absolute folder path." | — | E2E + UI test |
| AC-004 | REQ-005 | SCN-002 | Open model menu | Search field; runtime rows open that runtime's models; search results labelled by runtime; no Recent section | Loading row; error + Retry reloads; disabled runtime shows "Not installed" and cannot open; no-match message | UI test |
| AC-005 | REQ-006 | SCN-002 | Select model with/without thinking support | Thinking control appears only when supported, options follow the model schema, default applied on model change | — | UI test |
| AC-006 | REQ-008 | SCN-004 | Type `/`, add two skills, send | Chips shown; agent receives "Use these skills for this request: a, b." + blank line + text; sent message shows chips + user text with tooltip of exact sent text | Bare `/` lists all; "No skills match" | E2E |
| AC-007 | REQ-009 | SCN-005 | `@codex`, send | Run created for Codex; `/` lists only Codex's skills; tree `+` presets agent and workspace | `×` returns to Daily Assistant | E2E |
| AC-008 | REQ-010 | SCN-006 | `@<team>`, send | Team run created with shared runtime/model/thinking, workspace and approval for all members; first message to coordinator; Team view opens coordinator-focused | Orgs not listed in `@` | E2E |
| AC-009 | REQ-011 | SCN-007 | Live chat; terminate from tree; change model; send | Locked while live (tooltip); unlocked when Offline; menu lists only the run's runtime with "Runtime fixed · <Runtime>"; next message resumes with new model | Server rejects edits while active | E2E |
| AC-010 | REQ-012 | SCN-008 | Open single-agent run / team run from tree | Single-agent → chat view with strip collapsed; team/org → existing view | — | UI test |
| AC-011 | REQ-013 | SCN-009 | Attach via Context Files area in Chat; open a team-member view | Chat shows the same Context Files area as run views, uploads complete per existing ownership, plus Chat footer and `/`/`@`; team/org views unchanged (no footer model, no `/`/`@`) | Mic only when Voice Input extension enabled | E2E + UI test |
| AC-012 | REQ-014 | SCN-001 | New chat default; toggle; send | Default Auto-approve; Ask first applies to the run (and all team members); header shows mode | — | E2E |
| AC-013 | REQ-015 | SCN-008 | Archive/delete/terminate a chat; open unknown id | Existing confirmation/toasts; "This chat no longer exists" + New chat | — | UI test |
| AC-014 | REQ-017 | — | Launch from Agents/Teams/Orgs catalogs | Unchanged | — | Regression |
| AC-015 | REQ-018 | All | Visual comparison at 1440×900 and 390×844 | Matches VIS-001–VIS-025 except illustrative content | — | Visual verification |
| AC-016 | REQ-019 | SCN-002 | Pick Codex/gpt-5.5, send; later (after app restart) open New chat | New chat preselects Codex/gpt-5.5 | First run: Daily Assistant default launch config or runtime default | UI test |
| AC-017 | REQ-020 | SCN-001 | Launch app at `/` | Chat New chat screen is shown (not the Agents list) | — | UI test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Any user | Start a general chat | Chat / pencil | App open | Type, send | Daily Assistant run streams in chat view | Runtime unavailable | Supported Normal | User; UXJ-001 | REQ-001–004, 007, 014 |
| SCN-002 | User | Any user | Pick runtime/model/thinking | Model button | New chat or Offline run | Search / runtime submenu / model | Button shows model + runtime | Loading/error/not installed | Supported Normal | UXJ-002 | REQ-005, 006, 019 |
| SCN-003 | User | Any user | Work in a folder | Workspace button | New chat | Choose workspace/folder | Run bound to it | Invalid path | Supported Normal | UXJ-003 | REQ-004 |
| SCN-004 | User | Power user | Point agent at skills | `/` | Chat box | Add chips, send | Instruction prefixed | No match | Supported Normal | UXJ-004 | REQ-008 |
| SCN-005 | User | Power user | Chat with a specific agent | `@` / tree `+` | New chat | Choose agent | Agent run | — | Supported Normal | UXJ-005 | REQ-009 |
| SCN-006 | User | Power user | Start a team quickly | `@team` | New chat | Choose team, send | Team run in Team view | — | Supported Normal | UXJ-006 | REQ-010 |
| SCN-007 | User | Any user | Change model of existing chat | Terminate then model menu | Live chat | Terminate, change, send | Resumes with new model | Locked while live | Supported Normal | UXJ-007 | REQ-011 |
| SCN-008 | User | Any user | Revisit/manage chats | Tree | Chats exist | Open/terminate/archive/delete | Chat view / removed | Missing chat | Supported Normal | UXJ-011 | REQ-012, 015 |
| SCN-009 | User | Any user | Attach/dictate in any run | Message box | Chat or run view | 📎/drop/paste, mic | Chips; transcript | Upload failure per existing rules | Supported Normal | UXJ-008, UXJ-010 | REQ-013 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` (Approved, normative)
- Runnable prototype / repository: `/Users/normy/autobyteus_org/autobyteus-web-prototype` (branch `personal`), route `/chat`; runbook `…/tickets/done/chat-interface-entry/prototype-runbook.md`
- Product prototype ticket record and folder (externally owned): `…/tickets/done/chat-interface-entry/prototype-ticket.md`
- Prototype revision: R2 — `origin/personal@8ac6cad` (R2 implementation `86fd269`/`883751c`, final package `af5b6b0`, ticket done `efa5a97`); R1 was `1579886`; source pin `origin/personal@fcd3e83a4`
- UI/UX user-confirmation reference: R1 user message 2026-09-28 (PC-035); R2 user message 2026-09-28 "Do you have any more questions? I think now the chat box looks good." (after PC-036–PC-041)
- Approved visual-reference baseline: R2 `…/visual-references/` VIS-001–VIS-025 except VIS-020 (superseded) + `manifest.json` (24/24 SHA-256 verified 2026-09-28)
- Normative details: per spec "Implementation Fidelity Boundary"
- Illustrative content / permitted variation: names, descriptions, reply text, timestamps, counts, installed runtimes, thinking level names/set; footer wrap positions on narrow widths; mic presence by extension availability
- Required screens/states: UIS-001–UIS-012 and State Behavior table in spec
- Unresolved product decisions: None (Product reports none open; RSK-001 is engineering risk). R2 user change: send/stop sits at the end of the footer row.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, AC-004 | Performance | Opening the model menu is immediate; per-runtime catalogs load on demand with visible loading state; cross-runtime search shows "Searching all runtimes…" until loaded | Enabled runtimes only | UI test |
| QR-002 | REQ-018 | Accessibility | Keyboard and ARIA behavior per spec "Accessibility And Keyboard Behavior" | All menus | UI test |
| QR-003 | REQ-018 | Compatibility | No horizontal overflow at 390×844 | Narrow | Visual verification |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (small): the built-in Daily Assistant agent folder (DEC-010), the optional agent-config `skillScope` field (design D-11), and one device-local last-used runtime + model value (DEC-011).
- Must be preserved: existing run history, agent definitions (including the user's package `daily-assistant`), settings.
- Acceptable loss: none for existing data; the last-used model value may start empty (defaults apply).
- Unknowns: DEC-010 / DEC-011 outcomes.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Runtime availability + per-runtime model catalogs | Enabled runtimes; catalogs per runtime | `runtimeAvailabilityStore.ts` | RSK-001 cross-runtime search loads several catalogs |
| `runModelConfigEditability` | Edits rejected while run active/archived | `run-history/domain/run-model-config.ts` | — |
| Skill binding | Today per-definition `skillNames`; `SkillAccessMode` = `PRELOADED_ONLY`/`NONE` only | `configured-agent-skill-resolver.ts`, `skill-access-mode.ts` | "All installed skills" for Daily Assistant is new backend behavior |
| Model thinking schema | Per runtime/model config schema | `utils/llmThinkingConfigAdapter.ts`, `ModelConfigSection.vue` | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-ux-spec.md` | Normative UI/UX spec | REQ-001–REQ-020 | Approved (Product-owned) | User-confirmed 2026-09-28 |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/visual-references/` | Normative visuals VIS-001–025 | REQ-018 | Approved | Same |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/ui-behavior-test-matrix.md` | Behavior test matrix | ACs | Supporting | Same package |
| `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/prototype-change-log.md` | Decision history PC-001–035 | All | Supporting | — |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/product-design-request-handoff.md` | Product request (SR-001) | — | Historical | Not behavior-defining |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Chats reuse existing agent/team run lifecycle | REQ-003 | Architecture | Open |
| ASM-002 | Team quick path can be expressed with existing team launch configuration (shared values for all members) | REQ-010 | Architecture | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Runtime/model picker | Core | Resolved: compact model-first menu (UIS-003) | User via Product | Resolved |
| DEC-002 | Backing agent | Launch | Resolved: Daily Assistant default; `@`/tree `+` for others | User via Product | Resolved |
| DEC-003 | Convert chat → agent | Scope | Resolved: out of scope | User | Resolved |
| DEC-004 | Where chats live | Nav | Resolved: Workspaces tree | User | Resolved |
| DEC-005 (OPEN-002) | Land on Chat instead of Agents? | First impression | User decision 2026-09-28: yes — when the application starts, the user lands on the Chat screen (New chat), "the most easy screen that the user can use" | User | Resolved |
| DEC-006 | Mid-chat model change | Lock | Resolved: server rule; editable only Offline | User | Resolved |
| DEC-007 | Chat view density | Layout | Resolved: Option B | User | Resolved |
| DEC-008 | Old `codex/general-chat-entry` branch | Duplication | User decision 2026-09-28: remove completely. Done 2026-09-28 by Solution Designer: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/general-chat-entry` force-removed (20 uncommitted changes discarded per user), local branch deleted (was `11865cf85`); never existed on origin | User | Resolved (executed) |
| DEC-009 (OPEN-001) | Thinking control content | REQ-006 | User decision 2026-09-28: yes — schema-driven; show only the parameters the selected model exposes; hide the control when none | User | Resolved |
| DEC-010 (OPEN-003) | Daily Assistant provisioning and "all skills" | REQ-007 | User decision 2026-09-28: internal agent in the platform Built-in agent package, sees all installed skills, visible and configurable like any agent | User | Resolved |
| DEC-013 | Unified message box in team/org run views? | REQ-013 | User decision 2026-09-28: no — team-member/org-member views unchanged; model via existing gear editor. UXJ-010/UIS-010/VIS-020 out of scope (user: no Product request needed for the unchanged part) | User | Resolved |
| DEC-014 | Chat box attachment area and styling | REQ-013 | User decision 2026-09-28: Chat box looks like the existing box and reuses the Context Files area; Chat only adds features. Supersedes chip/thumbnail attachments in VIS-001/VIS-011 | User | Resolved |
| DEC-011 (OPEN-004) | Recent list and persistence | REQ-005, REQ-019 | User decision 2026-09-28: no Recent list; New chat starts with last-used runtime+model (one value on this device). Supersedes VIS-002/VIS-022 Recent section | User | Resolved |
| DEC-012 (OPEN-005) | Skill instruction wording | REQ-008 | User decision 2026-09-28: accept "Use the <skill> skill for this request." / "Use these skills for this request: a, b." in front of the user text. User expects it to be synthesized server-side; placement (client vs server) decided in architecture, meaning unchanged | User | Resolved |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | UIS-012, VIS-001 |
| REQ-002 | UC-001 | BEH-005 | AC-002 | SCN-001 | UIS-001, VIS-001 |
| REQ-003 | UC-001 | BEH-005 | AC-002 | SCN-001 | — |
| REQ-004 | UC-003 | BEH-004 | AC-003 | SCN-003 | UIS-005, VIS-009 |
| REQ-005 | UC-002 | BEH-003 | AC-004 | SCN-002 | UIS-003, VIS-002–007, 022, 024 |
| REQ-006 | UC-002 | BEH-003 | AC-005 | SCN-002 | UIS-004, VIS-008 |
| REQ-007 | UC-001 | BEH-005 | AC-002 | SCN-001 | DEC-010 |
| REQ-008 | UC-004 | BEH-007 | AC-006 | SCN-004 | UIS-006, VIS-010, 011, 016 |
| REQ-009 | UC-005 | BEH-008 | AC-007 | SCN-005 | UIS-007, VIS-012, 014 |
| REQ-010 | UC-006 | BEH-009 | AC-008 | SCN-006 | VIS-013 (Team view itself unchanged) |
| REQ-011 | UC-007 | BEH-010 | AC-009 | SCN-007 | VIS-015, 017 |
| REQ-012 | UC-009 | BEH-011 | AC-010 | SCN-008 | UIS-008/009, VIS-018, 019 |
| REQ-013 | UC-008 | BEH-012 | AC-011 | SCN-009 | DEC-013, DEC-014; R2 VIS-001, VIS-011, VIS-015, VIS-025 |
| REQ-014 | UC-008 | BEH-013 | AC-012 | SCN-001 | VIS-011 |
| REQ-015 | UC-011 | BEH-014 | AC-013 | SCN-008 | UIS-011, VIS-021 |
| REQ-016 | UC-001 | BEH-005, BEH-010 | AC-002, AC-009 | SCN-001 | VIS-015 |
| REQ-017 | — | — | AC-014 | — | — |
| REQ-018 | All | All UI | AC-015 | All | VIS-001–025 |
| REQ-019 | UC-002 | BEH-003 | AC-016 | SCN-002 | DEC-011 |
| REQ-020 | UC-001 | BEH-001 | AC-017 | SCN-001 | DEC-005 |

## Architecture Phase Input

- Scenarios to map: SCN-001–SCN-009.
- Constraints: chats are normal runs; server `runModelConfigEditability`; catalog launch forms unchanged; existing upload/voice ownership.
- Deferred to architecture: Daily Assistant seeding and all-skills access mechanism; skill-instruction prefix placement (sent text vs stored display); team quick-path launch config; last-used model storage; chat view vs existing run view routing; unified message box component ownership; cross-runtime catalog loading (RSK-001).
- Technical facts to verify: how each runtime exposes large skill sets (lazy/progressive loading); team launch with uniform member config; `/chat?id=` route ↔ existing workspace selection.
- Known risks: RSK-001; scope size (unified message box touches all run views).

## Readiness Check

### Content Ready For Approval
- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design
- User approval received: `Yes` (2026-09-28)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-003 requirements; R2 supplement user-confirmed)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
