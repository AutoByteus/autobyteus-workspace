# Messaging Integration Product Model Analysis

## Status And Authority

- Status: `Proposed behavior-defining supplement — SR-003, pending user approval together with requirements.md`
- Package: `external-messaging-agent-participant-redesign`
- `requirements.md` is authoritative for verifiable behavior and acceptance criteria. This file explains the model and why it was chosen.
- The unapproved SR-002 "run-attached integration" analysis is archived at `history/sr-002-product-model-analysis.md`.

## One-Sentence Conclusion

**A messaging bot is an agent's instrument, not the agent.** A Discord or Telegram integration should be a configured connection that gives agents tools (plus usage guidance as a skill) to post and read messages. It must not decide which agent runs, start runs, or turn agent output into chat replies automatically.

## The Human Analogy

An agent works like an employee. The employee has a company Slack/Discord/Telegram account. While working on something, the employee decides to post in the support channel, reads the replies, and maybe answers. The messaging app never "becomes" the employee. It also never hires a new employee because someone sent a message.

| Question | Current AutoByteus model | Proposed model |
| --- | --- | --- |
| What is the bot? | The bot is the agent's remote chat UI. A chat is bound to one agent/team definition. | The bot is a platform account that agents can use through tools. |
| What does an incoming message do? | Finds the binding, creates/restores the bound run, and posts the message as a user turn. | Nothing happens to agents. The message can be recorded so an agent can read it later with a tool. |
| How does a message get sent? | Any eligible assistant output of the bound run is mirrored to the chat automatically. | Only when an agent explicitly calls a send tool with a destination and text. |
| Who chooses the agent/model/workspace? | The channel binding stores an agent definition plus a launch preset (model, workspace, runtime). | Normal agent/team launch, exactly as for any other run. The integration stores no agent target. |
| How does an agent get the capability? | Implicitly, by being the bound target. | Normal agent definition tool/skill selection, like MCP tools. |
| How many agents can use one bot? | One binding target per chat. | Any agent that has the tools. |
| How many platforms can one agent use? | One agent run per binding. | Any integrations whose tools it has. |

## Why The Current Design Is Wrong (Evidence-Based)

1. **Wrong owner of the agent lifecycle.** `ChannelBinding` (`autobyteus-server-ts/src/external-channel/domain/models.ts`) stores the provider route, the target agent/team definition, a full launch preset (workspace, model, runtime, tool approval, skill access), and the cached run ID. `ChannelBindingRunLauncher` calls `prepareAgentRun`, `restoreTeamRun`, and `createTeamRunFromRootConfig`. Transport configuration therefore creates and owns agent runs.
2. **The bot is fused with the agent's identity.** `ChannelIngressService.handleInboundMessage` resolves the binding and dispatches the platform message as `postUserMessage`. The chat acts as a lower-quality version of the native AutoByteus chat UI.
3. **Output is sent without the agent choosing to send it.** `ChannelRunOutputDeliveryRuntime` keeps an open route-to-run link and publishes eligible assistant text to the chat, including later coordinator output that no chat message triggered. The agent never decides whether, where, or what to post.
4. **Run configuration is duplicated.** Launch presets per binding copy what the normal run-launch flow already owns.
5. **It blocks the useful scenario.** An agent doing other work cannot post an update to a Discord channel or check replies, because messaging is only reachable through the binding path.
6. **The coupling is large and cross-cutting.** Server `external-channel` (~6.3k lines), binding GraphQL and ingress REST (~0.9k), gateway (~10.5k), shared envelope contracts (~0.8k), Settings messaging UI/stores (~5.2k), plus a special "external user message" streaming path in server and web.

## What The Integration Should Be

### Integration = connection + tools + skill

1. **Connection.** The user configures a Discord bot token or Telegram bot token once. AutoByteus keeps the connection healthy and reports status. The configuration contains no agent, team, run, model, or workspace.
2. **Tools.** The integration adds platform tools to the tool catalog, for example:
   - `list destinations`: channels, groups, and DMs the bot can currently reach, with readable names.
   - `send message`: post text to a destination, optionally as a reply to a specific message or in a thread.
   - `read recent messages`: recent messages in a destination, with author, time, text, message ID, and reply relation.
3. **Skill.** A short usage skill explains how an agent should use those tools: find a destination, avoid spamming, when to reply, and how to quote a message.

Agents get the tools and skill through the normal agent-definition editor, the same way they get MCP tools and skills today. Teams need nothing special: a team member with the tools can use them.

### What an incoming platform message does

In the proposed model, an incoming message **never starts, restores, or messages an agent run**, and nothing replies automatically. When reading is supported, the message is only recorded so that an agent can read it with a tool.

That gives us a clear consequence to decide on (DEC-101): **a real-time "auto-answer" support bot is not provided by messaging alone.** Somebody has to wake an agent: a user, another agent, or a schedule. The in-progress Automation Schedule feature (`autonomous-scheduled-agent-runs`) can wake an agent periodically to check a channel. If you later want "wake an agent when a message arrives", that should be a **generic Automation trigger**, not something built into messaging. That keeps messaging decoupled.

## Why Not Just "Add A Community MCP Server"?

Today a user can already add a third-party Telegram or Discord MCP server in Settings → MCP Servers and assign its tools to an agent. That proves the model works with existing primitives. A first-party integration still adds value:

- a guided setup (paste a token, see status and destinations);
- credentials held by AutoByteus instead of being exposed in agent-visible files or prompts;
- an always-on receiver where the platform requires one (see below);
- consistent tool names and behavior across supported runtimes;
- a bundled usage skill.

## Platform Facts That Constrain The Design

| Platform | Send | Read history | List destinations | Implication |
| --- | --- | --- | --- | --- |
| Telegram Bot API | Stateless HTTP call with the bot token. | **No history API.** Bots only receive new updates (`getUpdates`/webhook). Unconfirmed updates are kept for at most 24 hours, and calling `getUpdates` with a higher offset confirms (consumes) them. | No enumeration API. Chats become known only after they send the bot an update. | Reading and discovery need an always-on receiver that stores messages as they arrive. Messages arriving while nothing receives them for more than 24 hours are lost. |
| Discord Bot | Stateless REST call with the bot token. | REST can fetch channel history if the bot has permission and the privileged **Message Content** intent. Without that intent, content is empty except in DMs, mentions, and the bot's own messages. | Guilds and channels can be listed by REST. | Reading can be on demand. The Message Content intent must be enabled in the Discord developer portal for full reading. |

A pure "skill with a script" approach works well for **sending**. It works badly for **Telegram reading/discovery**, because a stateless script would consume updates that nobody else can see again. That suggests keeping a long-running connection host, which the existing managed messaging gateway already is. The architecture phase decides this.

## What We Keep And What We Remove

### Keep (reuse)

- Managed gateway runtime supervision: install, start, stop, version, status.
- Provider clients: Discord gateway/REST client, Telegram polling/Bot API client.
- The durable outbound queue with retry, dead-letter handling, and idempotency.
- Provider credential configuration (existing Discord/Telegram tokens should keep working).
- Existing tool, skill, and MCP assignment on agent definitions and the runtime tool bridges.

### Remove (clean cut, no compatibility mode)

- Channel Binding setup UI/API and binding storage as active configuration.
- Binding-driven run creation, restoration, and input dispatch.
- Open run-output delivery back to chats.
- The group "mention required or drop" gate as the deciding authority for forwarding.
- The server "external user message" streaming projection that exists only for bound runs.
- The setup "Verify" step, which checks binding readiness.

## Comparison With The Earlier (SR-002) Proposal

SR-002 proposed a hybrid: integrations plus a run-owned "input attachment" at launch, with delivery modes (`EVERY_MESSAGE`, `ADDRESSED_ONLY`, `BATCHED`, `CONTEXT_ONLY`) that could start turns on already-running agents. It was never approved.

The current request is simpler and more consistent with "agents are working humans". Messaging becomes tools only. The push/turn-trigger part is removed from this scope, and it could return later as a generic Automation trigger. SR-003 therefore reduces scope substantially: no launch attachments, no delivery modes, no new agent turn-trigger type, and no MCP resource subscriptions.

## Recommended Answers To Open Decisions

See `requirements.md` → Open Decisions for the authoritative list.

- DEC-101 Inbound handling: tools only (pull). No push to agents in this ticket.
- DEC-102 Reading in v1: yes for Discord and Telegram, limited to messages visible to the bot and, for Telegram, received after the integration is running.
- DEC-103 Destination restriction: any destination the bot can reach, plus the normal tool-approval setting. No extra allowlist in v1.
- DEC-104 Usage skill: ship one small bundled skill per integration.
- DEC-105 Message retention for reading: local and bounded.
- DEC-106 Legacy binding data: leave the files untouched and ignore them. No migration.
- DEC-107 Content: text messages only in v1.
