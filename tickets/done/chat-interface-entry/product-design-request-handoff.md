# Product Design Request — chat-interface-entry

- Result classification: `Product Design Requested`
- Purpose: `New Request`
- Package identifier: `chat-interface-entry`
- Current solution revision: `SR-001`
- Requirements status: `Draft` (not approved; the user wants the Product conversation before requirements become clear)
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-09-28

## User's Requested Outcome (user's own terms)

> "On top of the agents, there is, let's say, another menu, maybe chat, user can click a new chat. And when they click the new chat … by default, it's using the temp workspace, and they can also change the workspace. And the important thing is, for the chat interface, how can we make selecting of the runtime and model easier? Because we support different runtime model … I don't know what the UI will look like … I need to talk to product prototype … to design some user interface, then I'm able to get it clear."

The user wants to talk directly with Product Prototyper to work out the UI before the requirements are finalized.

## Why This Matters (the user's workflow)

The user's normal journey starts in chat: use a general wrapper agent (e.g. `Daily Assistant` or `Codex` from their imported agent package) to discuss, discover or update skills; configure the agent with those skills; and once the skills work well, turn that setup into a persistent Agent, Agent Team or Agent Org. Today AutoByteus opens on Agents / Agent Teams / Agent Orgs / Skills and has no chat entry. Comparable products are chat-first. Even as a chat, it is still one normal AutoByteus agent run, wrapped in a chat interface.

## Focused Decisions / Experience To Explore

1. **Primary:** An easy runtime + model selection experience for chat across multiple runtimes (DEC-001).
2. The Chat entry above Agents and the "New chat" flow, including default temp workspace and changing workspace (REQ-001, REQ-002, REQ-004).
3. Supporting questions the user may want to settle in the same conversation (Product and user decide what to cover):
   - DEC-002: Which agent backs a new chat (user-selected wrapper such as Daily Assistant/Codex, a configured default, or a platform assistant)?
   - DEC-003: How chat relates to "graduating" a proven setup into an Agent/Team/Org — in this ticket, later, or only kept in mind.
   - DEC-004: Where past chats live (Chat list vs existing Workspaces tree).
   - DEC-005: Whether app launch should land on Chat.
   - DEC-006: Whether runtime/model can change mid-chat (today run config locks after the first message).
   - DEC-007: Chat view density — simplified chat vs the current workspace view with Files/Team/Terminal/Activity right tabs.

## Requirements Context (Draft IDs)

- REQ-001 Chat entry above Agents; REQ-002 New chat → one agent in chat UI; REQ-003 chat is a normal agent run; REQ-004 temp workspace default, changeable; REQ-005 easier runtime/model selection respecting availability and per-runtime catalogs; REQ-006 backing agent per DEC-002; REQ-007 Agents/Teams/Orgs flows preserved.
- Scenarios: SCN-001 start general chat; SCN-002 pick runtime/model quickly; SCN-003 change workspace; SCN-004 graduate chat setup to Agent/Team/Org (`Unclear`).

## Established Constraints And Non-Goals

- Chat is one normal agent run (history, streaming, tools, skills) — not a separate non-agent chat runtime.
- Agents / Agent Teams / Agent Orgs flows remain.
- Only enabled runtimes are selectable; disabled runtimes carry a reason. Model catalogs are per runtime, grouped by provider, loaded on demand (loading/error states exist). Some models expose extra config such as thinking level.

## Existing Product Context (evidence)

- Current runtimes: AutoByteus (`autobyteus`, default), Codex App Server, Claude Agent SDK, Antigravity CLI, Grok Build.
- Current selection UX: runtime dropdown → searchable model list for that runtime (grouped by provider) → model config section (`autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`).
- Agent definitions may carry a per-definition `defaultLaunchConfig`; no global "last used" or chat-default runtime/model exists.
- Temp workspace `temp_ws_default` exists and is proposed by the workspace selector.
- Primary nav today: Agents, Agent Teams, Agent Orgs, Applications, Skills, Memory, Nodes, Projects (`autobyteus-web/composables/useShellPrimaryNavigation.ts`); `/` redirects to `/agents`.
- Wrapper agents: `/Users/normy/autobyteus_org/autobyteus-agents/agents/codex` (minimal "You are Codex") and `/Users/normy/autobyteus_org/autobyteus-agents/agents/daily-assistant` (general agent); both have `defaultLaunchConfig: null`.
- User screenshot (2026-09-28): desktop app with left panel (Agents, Agent Teams, Agent Orgs, Applications; Workspaces tree with team runs), center conversation, right tabs Files/Team/Terminal/Activity.
- Historical reference only (not an approved basis): an earlier unfinished ticket `general-chat-entry` (May 2026, branch `codex/general-chat-entry`, never merged) explored a `/chat` launch composer with compact Runtime/Model/Workspace pills; see `/Users/normy/autobyteus_org/autobyteus-worktrees/general-chat-entry/tickets/general-chat-entry/chat-start-ui-design.md`. The user has not yet decided whether any of it carries forward (DEC-008).

## Canonical Artifacts

- Requirements (Draft): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry` (branch `codex/chat-interface-entry`, base `origin/personal@fcd3e83a4`, finalization target `personal`)
- Design spec: N/A — not started (requires approved requirements)

## Expected Output

A Product Design result from the conversation with the user (whatever form Product Prototyper chooses), with the user's decisions and, where applicable, user-confirmed UI/UX references, returned to Solution Designer for integration into the requirements and approval.

## Open Risks

- RSK-001: A unified cross-runtime model picker may need several catalogs loaded at once (latency).
- RSK-002: Overlap with the unfinished `codex/general-chat-entry` branch.

## Next Expected Action

Product Prototyper engages the user on the chat UI, especially runtime/model selection, and returns the result to Solution Designer.

## Applied Handoff Route

- Matching rule: "Product Design Requested because the user explicitly … asks Product Team to help" → `/product_team/product_prototyper`.
- No other rule matches (requirements not approved; no architecture package; no delivery receipt; no marketing need).
