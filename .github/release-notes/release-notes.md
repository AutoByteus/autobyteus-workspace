# AutoByteus v1.4.92 — General Agent and collaboration

## What's new
- **General Agent is the default Chat agent.** The built-in general-purpose agent has a clearer identity and practical-work prompt. It can discover accessible specialist agents and teams when appropriate, use relevant available skills, or work directly with its tools.
- **Collaborators in live runs.** Agents, Teams and Orgs can bring in accessible agents or teams, address them with `@`, and show hosted collaborators in the execution tree. Agent-to-agent deliveries identify their sender; helper copies keep their own run identity.
- **Projects and Tasks foundations.** With Projects enabled, manage project workspaces and durable Task text/context on a continuous three-column board. Refresh is explicit; the agent task tools support discovery and updates. Projects remains an optional capability.

## Improvements and fixes included since v1.4.91
- Chat composer improvements include upward-opening menus, workspace search, clearer inline mention discovery, and thinking-effort selection.
- Background Tasks replace the former run To-Do panel.
- Skill loading is definition-owned; the run-level skill-access-mode setting has been removed.
- Context compaction uses a direct summary with bounded compression and held-input recovery.
- Antigravity improvements include linked run-capsule skills, canonical tool-call presentation, and corrected embedded-browser `open_tab` results. Antigravity always auto-approves its runtime tools.
- Gemini speech uses Gemini 3.8 TTS, exact voice identifiers and per-turn styles, with malformed WAV output rejected.

## Upgrade notes
- This is a **stable release**, not a beta; it is published to the stable desktop update feed.
- General Agent remains the same `autobyteus-daily-assistant` default definition. This identity update introduces no history reset, saved-address rewrite or data migration; historical captured names may still say Daily Assistant.
- **Correction to the previous stable notes:** the built-in default agent is platform-owned. Normal server startup replaces its prompt/configuration from the shipped template; edits to that built-in do not survive restart. Use a separate user-owned agent for persistent customization.
- Specialist discovery follows existing context and eligibility rules. Discovering a specialist does not make its skills available to General Agent, and delegation is not required for every request.

## Validation notes
- The General Agent change passed focused API/E2E validation and proportional test-code review, plus an isolated worktree-built desktop default Chat/reply/restart/history check and explicit user testing.
- Scoped validation is not an exhaustive provider/model matrix, and model routing remains judgment-based. The known package-wide TS6059 typecheck limitation remains disclosed; production build compilation passed.
