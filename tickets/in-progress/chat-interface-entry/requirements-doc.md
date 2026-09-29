# Requirements Document

## Document Status

- Status: `Approved`. Baseline SR-003 + SR-011 (REQ-021) + SR-013 (R3, DEC-016) + SR-016 (one skill per name, import validation; DEC-017, approved by the user 2026-09-29)
- Current solution revision ID: `SR-018`
- Package identifier: `chat-interface-entry`
- Request / ticket: User request 2026-09-28 — Chat entry ("New chat") above Agents with easy runtime/model selection; Product ticket `chat-interface-entry` (prototype repository)
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-28
- Approval state and reference: Approved by user 2026-09-28 in the Solution Designer conversation (final message: "Yes, I think that's more consistent design … chat just adds features to it"), after decisions DEC-005, DEC-008–DEC-014 were answered in the same conversation.
- Exact approved requirements baseline / solution revision: `SR-003` intended behavior; `SR-004` integrates the user-confirmed R2 supplement without changing intended behavior
- Behavior-defining supplements and their approved versions: Product `ui-ux-spec.md` **R3** + VIS-001–VIS-027 (VIS-020 superseded; 26 files) at `autobyteus-web-prototype` `origin/personal@ef5f909`. User confirmations: R1 (PC-035), R2 ("I think now the chat box looks good"), R3 2026-09-29 ("I think it looks correct", after PC-042–PC-047). Solution Designer verified 26/26 SHA-256.

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
| BEH-010 | User | SCN-007 | Model config editability governed by server `runModelConfigEditability`; the standalone ⚙ editor | After the first message, model/thinking are changed in the run's ⚙ settings (product existing-run editor): locked while live, editable when Offline, runtime never changes (R3) | Server rule unchanged | `run-history/domain/run-model-config.ts`; UXJ-007 R3 |
| BEH-011 | User | SCN-008 | Single-agent runs open in the workspace view with right tabs | Single-agent runs (incl. chats) open in the product agent run view inside the workspace frame at `/chat?id=`, with the shared right tabs column (default open); strip clicks open the clicked tab; team/org runs keep their view (R3) | Team/org views; RightSideTabs content | UXJ-009, UXJ-011 R3 |
| BEH-012 | User | SCN-009 | Run-view message box: "Context Files (N)" area + textarea + mic + send | The New chat box adds the Chat footer + `/` + `@`; after the first message the product box is used, plus `/` tags only (R3) | Team/org run views' box unchanged | DEC-013, DEC-014, DEC-016 |
| SCN-010 | User | Any user | Keep skills unambiguous | Settings skill folders / agent packages / create skill | Skills installed | Add or update a source containing duplicate names | Rejected with a clear pop-up, or accepted if the duplicate is only in a runtime default folder | Out-of-band duplicate → Skills page warning | Supported Normal | User DEC-017 | REQ-022–024 |
| BEH-013 | User | SCN-001 | Auto-execute tools configured per run config | New chats (any workspace) default to Auto-approve; visible toggle to "Ask first" before the first message; header shows the mode | Catalog launch forms keep their own setting | UXJ-008 |
| BEH-014 | User | SCN-008 | Runs listed in Workspaces tree | Chats are normal runs under workspace → agent, normal product ordering; open/terminate/archive/delete via existing row actions; no separate Chats list | Existing tree ordering and actions | UXJ-011; DEC-004 |
| BEH-015 | User/System | SCN-010 | Duplicate skill names are silently first-found-wins in the Skills list, while agents prefer their own copy (two rules), so runs can want different paths for the same name | One copy per name via one precedence rule (runtime default folders never win); duplicates among custom sources are blocked at import; out-of-band duplicates are warned | Application-bundled skill resolution | AF-26, AF-36 |

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
| REQ-011 | Model and thinking of a persisted run are changed only in the run's ⚙ settings (the product existing-run editor: Agent Configuration, with the runtime and workspace fixed). They are locked while the run is live ("Stop this run before changing model settings.") and editable when Offline; Save applies them when the next message resumes the run. Before the first message, the New chat footer holds runtime/model/thinking (R3; supersedes the run-view footer lock) | BEH-010 | High | DEC-006, DEC-016 | UXJ-007 R3, VIS-017, VIS-026 |
| REQ-012 | Single-agent runs (including chats) open in the product agent run view inside the workspace frame: the center pane beside a full-height right tabs column. It uses the same tabs and order, resize handle, docked width, collapse control and 50 px strip as the Team/Org views. Open/collapsed is the one shared product setting (default open). Clicking a strip icon opens exactly that tab. Team/org runs keep their existing view | BEH-011 | High | DEC-007, DEC-016 | UIS-008/UIS-009 R3, VIS-015, VIS-018, VIS-019, VIS-027 |
| REQ-013 | The New chat box (before the first message) is the existing message box + Context Files area with the Chat footer (workspace, auto-approve, runtime/model, thinking, mic, send), `/` and `@`. After the first message, the run view uses the product box (Context Files + textarea with mic and send/stop inside, the same geometry as the Team view box), with no footer and no model/thinking controls; `/` skill tags remain. Team/org run views are unchanged | BEH-012 | High | DEC-013, DEC-014, DEC-016 | R3 UXJ-008/UXJ-010, VIS-015 |
| REQ-014 | New chats in any workspace default to Auto-approve, with a visible toggle to "Ask first" before the first message (applies to all team members on the quick path). After the first message, the approval mode is shown in the run's ⚙ settings ("Auto approve tools") | BEH-013 | High | User decision; DEC-016 | UXJ-008, VIS-017 |
| REQ-015 | Chats appear as normal runs under workspace → agent in the Workspaces tree with normal ordering; reopen, terminate, archive and delete use existing row actions and confirmations; an unknown chat id shows "This chat no longer exists" + New chat. | BEH-014 | High | DEC-004 | UXJ-011 |
| REQ-016 | The chat run header is the product run header: a 32 px avatar, the run title (from the first message, ≤42 chars), status Running / Idle / Offline, and the ⚙ (run settings) and ＋ (New chat preset to this agent and workspace) actions. There is no agent · workspace · approval line. The conversation shows messages only | BEH-005, BEH-010 | Medium | DEC-016 | UIS-008 R3, UIS-013, VIS-015 |
| REQ-017 | Agents / Agent Teams / Agent Orgs catalogs and launch forms remain unchanged. | — | High | Preservation | Investigation |
| REQ-018 | Visible design, copy and states match the approved R3 UI/UX spec and visual references VIS-001–VIS-027 (VIS-020 superseded), except explicitly illustrative content; responsive behavior at 390 px per the spec | All UI | High | Approved supplement | ui-ux-spec.md R3 |
| REQ-019 | A New chat preselects the last-used runtime + model (one value remembered on this device); if none, Daily Assistant's default launch config; otherwise the runtime default. | BEH-003 | Medium | DEC-011 | User 2026-09-28 |
| REQ-020 | When the application starts (desktop, `/`), the user lands on the Chat screen (New chat); Agents remains reachable from navigation. | BEH-001 | Medium | OPEN-002 | — |
| REQ-021 (SR-011) | The New chat model menu (rows, search results) and its footer trigger label models (after the first message, models appear only in the ⚙ settings, which use the same shared policy through the gear editor) with the same shared policy as the agent/team launch form. Claude Agent SDK: canonical model name as the label, display name + description as secondary text, a Recommended badge, recommended models first. Codex and other non-AutoByteus runtimes: the display name. AutoByteus: the identifier. Long labels stay on one line, truncated with the full text on hover. Search matches the identifier, canonical name, display name, description, provider and runtime. | BEH-003 | High | User verification UVF-001: bare `opus` is not intuitive next to the launch form's `claude-opus-5-5 · Opus 5.5 · Recommended` | UVF-001, DEC-015 |
| REQ-022 (SR-016) | **One skill per name.** Skill loading decides exactly one copy (one path) for every skill name, and everything uses that copy: agents with skill lists, Daily Assistant (all installed skills), and `/` tags. **Precedence** when a name exists in several places: (1) skills created in AutoByteus (its own skills folder); (2) skills inside agent, agent team and **Agent Org** packages (built-in and imported, in package order; org-owned agents and org-owned teams with their local agents behave exactly like agents and teams — SR-018); (3) added skill folders in the Settings order; (4) runtime default skill folders (`~/.codex/skills` or `$CODEX_HOME/skills`, `~/.claude/skills`, `~/.agents/skills`, `~/.grok/skills`), which **never win** against a copy in (1)–(3). A copy there is used only when the name exists nowhere else. Application packages keep resolving their own app-bundled skills (a separate, unchanged boundary). | BEH-007, BEH-015 | High | User decision DEC-017 | User 2026-09-29 |
| REQ-023 (SR-016) | **Validate at import; no duplicates enter.** Adding a skill folder, importing / updating / reloading an agent package (local or GitHub), and creating a skill in AutoByteus check every incoming skill name against the installed skills in tiers (1)–(3). On a duplicate, nothing is added or changed, and an error pop-up (overlay) lists each duplicate name with the existing path and the incoming path, asking the user to rename or remove one copy and try again. Duplicates against a runtime default folder (tier 4) are not errors: the custom copy wins, and the user is told that the default-folder copy is ignored. | BEH-015 | High | DEC-017 | User 2026-09-29 |
| REQ-024 (SR-016) | **Safety net for changes made outside the app.** If a duplicate among tiers (1)–(3) appears outside the app (e.g. a `git pull` or a Finder copy), loading still picks exactly one copy by the precedence above, logs it, and the Skills page shows a warning naming the used and ignored copies. Ignored runtime-default copies are listed there as information. | BEH-015 | Medium | DEC-017 | Design derivation of REQ-022 (import checks cannot see out-of-band changes) |

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
| AC-009 | REQ-011 | SCN-007 | Live chat → ⚙; terminate from the tree → ⚙ → change the model → Save → send | Live: model/thinking locked with "Stop this run before changing model settings." Offline: editable, runtime and workspace fixed; the next message resumes with the new model | Server rejects edits while active | E2E |
| AC-010 | REQ-012 | SCN-008 | Open a single-agent run and a team run; click the Files strip icon; collapse in the Team view, then open a chat | Single-agent → agent run view in the workspace frame (full-height right tabs column, header in the middle column, 57 px shared bottom line); Files opens Files; the collapsed state is shared; team/org views unchanged | — | UI test + visual |
| AC-011 | REQ-013 | SCN-009 | New chat: attach via Context Files + footer. Chat run view: reply with `/` tags | The New chat box shows the footer controls; the run view box equals the Team view box geometry with no footer or model controls, and offers `/`; team/org views unchanged | Mic only when the Voice Input extension is enabled | E2E + UI test |
| AC-012 | REQ-014 | SCN-001 | New chat default; toggle; send; open ⚙ | Default Auto-approve; Ask first applies to the run (and all team members); ⚙ shows the Auto approve tools state | — | E2E |
| AC-013 | REQ-015 | SCN-008 | Archive/delete/terminate a chat; open unknown id | Existing confirmation/toasts; "This chat no longer exists" + New chat | — | UI test |
| AC-014 | REQ-017 | — | Launch from Agents/Teams/Orgs catalogs | Unchanged | — | Regression |
| AC-015 | REQ-018 | All | Visual comparison at 1440×900 and 390×844 | Matches VIS-001–VIS-027 except illustrative content | — | Visual verification |
| AC-016 | REQ-019 | SCN-002 | Pick Codex/gpt-5.5, send; later (after app restart) open New chat | New chat preselects Codex/gpt-5.5 | First run: Daily Assistant default launch config or runtime default | UI test |
| AC-017 | REQ-020 | SCN-001 | Launch app at `/` | Chat New chat screen is shown (not the Agents list) | — | UI test |
| AC-018 | REQ-021 | SCN-002 | Open the New chat model menu on Claude Agent SDK and on Codex; search `opus-5-5`, `Opus 5.5`, `gpt-6`; open ⚙ on a Claude SDK chat | Claude SDK rows show `claude-opus-5-5` with "Opus 5.5 · …" secondary text and a Recommended badge, listed first; Codex rows show display names; the trigger shows the same label, truncated with a tooltip; search finds the model by canonical name, display name or identifier | AutoByteus rows still show identifiers | UI test + user verification |
| AC-019 | REQ-022 | SCN-004, SCN-010 | The same name exists in an agent package and in `~/.codex/skills`; start that agent, a Daily Assistant chat, and tag the skill with `/` | Every run and the `/` tag use the package copy (the same path); no run uses the Codex default copy; two chats in the same workspace never conflict on that name | A name only in `~/.codex/skills` is used from there | E2E |
| AC-020 | REQ-023 | SCN-010 | Add a skill folder / import or update an agent package / create a skill whose name already exists in tiers 1–3 | The operation is rejected with nothing changed; an overlay lists name + existing path + incoming path, with "rename or remove one copy, then try again" | A duplicate only against a runtime default folder succeeds, with a notice that the default copy is ignored | E2E + UI test |
| AC-021 | REQ-024 | SCN-010 | Create a duplicate outside the app, then open the Skills page | Loading uses one copy by precedence; the Skills page warns, naming the used and ignored paths | — | UI test |

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
| DEC-015 (UVF-001) | Chat model labels | REQ-021 | Proposed: (1) reuse the shared launch-form label policy; (2) one line, truncated with a hover tooltip for long names, both in rows and the trigger; (3) search also matches the canonical name, display name and description | User | Resolved — approved 2026-09-29 as recommended |
| DEC-016 (R3) | Chat run view = product agent run view | REQ-011, 012, 013, 014, 016, 018 | User decisions in the R3 review, 2026-09-29: "on the left side, we can already see it's the daily assistant … it should follow … standalone agent … the large part of the UI are completely the same"; "better to still use the same setting … because we're already on the agent's view page"; "if we remove it [model/thinking from the box after the first message], it will be much more consistent with the existing view"; "we should still be able to use a slash"; R3 confirmed: "I think it looks correct" | User | Resolved |
| DEC-017 (SR-016) | Duplicate skill names | REQ-022–024 | User decisions 2026-09-29: "the codex default one never wins … that folder is a default folder from codex … they never understand what's inside it"; "when the skills are being imported, we should already validate that … we immediately pop up error … ask the user to fix it … there's never duplicates"; "the skill loading part should already decide … if there's two duplicated ones … you still have only one"; "let's do it in these tickets … You don't have to ask … Product … It's just a pop-up … overlay" | User | Resolved — approved |
| DEC-017a (SR-018) | Agent Org skills | REQ-022–024 | User direction 2026-09-29 (via Code Reviewer CRR-012): an Agent Org private agent with its own `skills/` is a normal layout and must be supported; agents, agent teams and Agent Orgs must behave the same ("it doesn't make any sense that the agent team works but the agent org doesn't") | User | Resolved — approved |
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
