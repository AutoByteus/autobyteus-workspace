# Messaging Product Model Analysis

## Status And Authority

- Status: `Approved behavior-defining supplement` (approved with `requirements.md` on 2026-09-24, SR-014; metadata refreshed in SR-016). The "Recommended Delivery Shape" and "Input For The Separate Messaging MCP Project" sections are non-normative guidance for future work outside this ticket. `design-spec.md` owns the exact removal list.
- `requirements.md` is authoritative for verifiable behavior.
- History: `history/sr-002-product-model-analysis.md` (hybrid run-attached model, retired) and `history/sr-003-product-model-analysis.md` (first-party integration inside the platform, retired, but its platform analysis is carried forward below as input for the separate project).

## Conclusion

**A messaging bot is an agent's instrument, not the agent. The instrument lives outside the platform.**

- The AutoByteus platform knows nothing about Discord, Telegram, WhatsApp, or any other messaging platform.
- A messaging integration is its own project, typically an MCP server plus a usage skill. Users add it through the existing generic **MCP Servers** and **Skills** features and assign its tools to agents like any other tools.
- Agents, working like humans, decide when to post or read messages by calling those tools. Nothing in the platform starts an agent because a chat message arrived, and nothing mirrors agent output to a chat.

The platform already has everything this model needs: MCP server configuration (stdio with env tokens, or HTTP), tool discovery and assignment across native/Codex/Claude runtimes, and skill assignment. The platform-side work is therefore **pure removal**.

## Guiding Principle (user-confirmed direction, 2026-09-24)

**The main product is integration-agnostic.** Every external platform integration, whether Discord, Telegram, or later Google and others, is its own project that provides the integration code (normally an MCP server) and a skill. The main product only provides the generic mechanisms: MCP server configuration, skills, and tool/skill assignment to agents. Agents use the configured integration for everything on that platform: reading, sending, and any other action. This ticket applies the principle to messaging only. It does not change other existing product features.

## Why The Current Design Is Wrong

Evidence is in `investigation-notes.md`. In summary:

1. `ChannelBinding` makes the transport own agent lifecycle: it holds the target definition, a launch preset, and the cached run, and the launcher creates/restores runs.
2. Incoming chat messages become user turns. The chat becomes a second, weaker AutoByteus chat UI.
3. Outgoing messages are implicit: run output is auto-published, so the agent never decides to speak.
4. Provider-specific code permeates the platform: server module, managed gateway supervisor, APIs, streaming types, shared contracts, Settings UI, release pipelines, and Docker image.

## Removal Inventory (platform)

| Area | Items |
| --- | --- |
| Server | `src/external-channel/**`, `src/managed-capabilities/messaging-gateway/**`, GraphQL `external-channel-setup` + `managed-messaging-gateway`, REST `channel-ingress*` / `channel-delivery-event-route`, remote-access route policy entries, `services/agent-streaming` external-user-message parts, composition/startup wiring (`build-studio-server.ts`, `server-runtime.ts`), docs (`ARCHITECTURE.md`, `PROJECT_OVERVIEW.md`, `README.md`, and others that mention it), tests |
| Web | `components/settings/messaging/**`, `MessagingSetupManager.vue`, Settings navigation entry, `stores/messaging*`, `stores/gatewaySessionSetup`, `composables/*Messaging*` + `messaging-binding-flow/`, `types/messaging.ts`, `utils/messaging*`, GraphQL messaging queries/mutations, streaming `externalUserMessage*` handler/types/projector parts, localization strings, `ui-prototypes/messaging-setup-assistant/`, `docs/messaging.md` + mentions, tests |
| Shared library (`autobyteus-ts`) | `src/external-channel/**`, its export in `src/index.ts`, `agent/message/external-source-metadata.ts` and its use in `AgentInputUserMessage`, tests |
| Gateway package | **Stays** in the repo as its own project (DEC-109). Its shared message types move into it from `autobyteus-ts` (DEC-111). It is removed from the pnpm workspace and is not built, tested, or released by the main product (AC-117, SR-016). Its release workflow is deleted (DEC-112). |
| Build / release | `.github/workflows/release-messaging-gateway.yml` (deleted, DEC-112); gateway steps in `release-desktop.yml` and `release-android.yml`; `scripts/desktop-release.sh`, `scripts/android-bootstrap-termux.sh`, `scripts/personal-docker.sh`; `docker/Dockerfile.allinone`, `docker/allinone-start-gateway.sh`, `docker/supervisor-allinone.conf`, `docker/compose.personal-test.yml`, `docker/README.md`; `pnpm-workspace.yaml` membership, the `pnpm-lock.yaml` importer, and the root `onlyBuiltDependencies` entry; root `README.md` mentions |
| Stays | `tickets/done/**` history; historical Prisma migrations; published GitHub releases |

## Legacy Data (DEC-110)

Platform-owned messaging data found on the owner's machine:

- `server-data/external-channel/` with `bindings.json` (1 Telegram → `classroomsimulation` team binding, May 2026), receipts, deliveries, and the callback outbox;
- `server-data/extensions/messaging-gateway/` with 25 installed versions (5.9 GB), `config/provider-config.json` and `gateway.env` (bot tokens in plaintext), state, and runtime data;
- `server-data/download/messaging-gateway/` (1.0 GB) and `server-data/logs/messaging-gateway/`;
- orphan DB tables `channel_message_receipts` and `channel_delivery_events` (created by early migrations and absent from the current Prisma schema).

Recommendation: a one-time cleanup that deletes these and drops the orphan tables, without blocking startup. The alternative is to leave them and document the paths.

## Recommended Delivery Shape For The Messaging Project (SR-005, not this ticket)

The user asked whether the messaging gateway project should provide skills, a remote (HTTP) MCP server, or both. Recommendation: **a remote Streamable-HTTP MCP server served by the gateway, plus a companion skill.** Each has a distinct role:

| Piece | Role | Contains |
| --- | --- | --- |
| Gateway service (own repo `AutoByteus/autobyteus-message-gateway`) | Always-on owner of the bot connections | Telegram polling / Discord connection, local bounded message store (from the existing inbox), outbound queue with retry (from the existing outbox), bot tokens in its own config |
| `/mcp` endpoint on the gateway (Streamable HTTP, bearer-token protected) | The capability | Tools: `list_destinations`, `send_message`, `read_recent_messages` |
| Companion skill per platform (for example `skills/telegram-messaging/SKILL.md`) | The know-how | When and how to use the tools: find the destination, read before replying, reply-to usage, etiquette. No secrets, no scripts required. |

The user runs the gateway (Docker Compose or Node). The user then adds its URL and token in AutoByteus Settings → MCP Servers (existing Streamable HTTP support), adds the skill folder as a skill source, and assigns both to agents. The same MCP endpoint also works in other MCP clients.

Why not the alternatives:

- **Skill with scripts only:** the bot token has to be in the agent's environment, where the agent can read it. Nothing is always listening, so Telegram reading and discovery fail: there is no history API, updates last 24 hours, and `getUpdates` consumes them. It also needs a shell tool, and there is no durable retry.
- **Local stdio MCP:** AutoByteus creates stdio MCP server instances per agent (`McpServerInstanceManager.activeServers` keyed by `agentId`, cleaned up per agent). That means one bot poller per agent, which Telegram rejects when two `getUpdates` consumers run at the same time. Nothing listens while no agent runs.
- **Remote HTTP MCP without a skill:** works, but agents use the tools less well without guidance. The skill is cheap to add.

What changes in the gateway project: remove its forward-to-AutoByteus-server path (`inbound-forwarder-worker`, `autobyteus-server-client`, server-callback route, mention gate), add the `/mcp` endpoint and tools, reuse adapters/inbox/outbox, and replace server-managed config with its own env/config file.

## Input For The Separate Messaging MCP Project (not this ticket)

Carried forward from SR-003 for whoever builds Discord/Telegram MCP servers:

- Tools: `list_destinations`, `send_message` (with reply-to/thread), `read_recent_messages`. Text first.
- A usage skill per integration.
- Telegram has no history API. Unread updates are kept for at most 24 hours, and `getUpdates` with a higher offset confirms (consumes) them. There is no chat enumeration. Reading and discovery therefore need an always-on receiver with a local, bounded store, which suits a long-running MCP server (stdio or HTTP).
- Discord's REST API can read history and list channels, but general channel content needs the privileged Message Content intent.
- Keep bot tokens in the MCP server's own env/config. Never return them in tool results.
- Incoming messages never wake agents. If "wake an agent when a message arrives" is wanted later, build it as a generic Automation trigger, not as messaging code in the platform.
- The provider clients in the deleted gateway (Telegram polling client, Discord gateway/REST client, durable outbox) remain in git history for reuse.
