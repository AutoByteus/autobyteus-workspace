# Requirements — Messaging Integrations As Agent Tools

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-003`
- Package identifier: `external-messaging-agent-participant-redesign`
- Request / ticket: User request 2026-09-24. The messaging design is wrong: agents are like working humans, and messaging platforms should be integrations whose skills/tools agents use, not bots bound to agents.
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference: `Pending` — no user approval recorded yet
- Exact approved requirements baseline / solution revision: `N/A` — not yet approved
- Behavior-defining supplements and their approved versions: `product-model-analysis.md` (SR-003 revision), approval pending with this document
- ID note: SR-001/SR-002 IDs (`BEH-001`–`007`, `R-001`–`010`, `AC-001`–`013`, `UC-001`–`012`) were never approved and are retired. Their text is archived under `history/`. SR-003 uses the non-overlapping `1xx` series below.

## Problem And Desired Outcome

- Problem: Settings → Messaging binds an external chat (Discord/Telegram peer) to an agent or team definition plus a launch preset. An incoming chat message creates or restores that run and becomes a user turn. The run's output is then mirrored back to the chat automatically. The bot effectively *is* the agent. The integration owns agent lifecycle and outbound intent, and messaging is unusable as a capability during normal agent work. The feature is currently off by default (managed gateway `desiredEnabled: false`) because of this design problem.
- Affected actors or systems: AutoByteus users configuring integrations; agents and team members doing work; people on Discord/Telegram who talk to the bot; the managed messaging gateway, server, and web Settings.
- Desired outcome: A configured messaging integration gives agents tools, plus a usage skill, to list destinations, send messages, and read recent messages through the platform bot. Agents use them by their own decision during normal work. Platform traffic never starts or drives agent runs, and nothing is posted to a platform unless an agent explicitly sends it.
- Observable definition of success: A user configures a Telegram or Discord bot without choosing any agent. They assign the messaging tools to an agent definition and ask the agent to post an update to a channel; the message appears from the bot. The agent can read the channel's replies with a tool. A message sent to the bot never starts, restores, or messages any agent, and no agent output reaches a chat unless the agent called the send tool.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | User/Operational | SCN-101, SCN-108 | Settings → Messaging has gateway lifecycle, provider config, a **Channel Binding** step (select peer → agent/team definition + launch preset), and a **Verify** step. | Settings → Messaging configures only the provider connection, shows status, lists the tools/skill the integration provides and the destinations it can reach. There is no agent/team selection and no binding. | Gateway lifecycle card (install/start/update/disable). Discord/Telegram token configuration. Default-off state. WhatsApp/WeCom/WeChat excluded. | Investigation notes: Settings components, `messaging.md`, `ChannelBindingSetupCard.vue`, managed provider availability |
| BEH-102 | System | SCN-105 | Incoming message → gateway inbox → group-mention gate → server ingress → resolve binding → lazily create/restore the run → `postUserMessage`/team post. | An incoming message never creates, restores, starts, or posts input to any agent/team run. At most it is recorded for later reading (REQ-107). | Normal agent/team launch through the app is the only way runs start. | `channel-ingress-service.ts`, `channel-binding-run-launcher.ts`, `channel-agent-run-facade.ts` |
| BEH-103 | System | SCN-103, SCN-105 | Eligible assistant output of a bound run (including later coordinator output) is automatically published to the chat. | No agent/team output is ever sent to a platform automatically. Only an explicit send-tool call posts a message. | — | `channel-run-output-delivery-runtime.ts`, `messaging.md` step 15 |
| BEH-104 | User/System | SCN-102, SCN-103, SCN-104, SCN-106, SCN-109 | No current supported behavior lets an agent choose to message or read a platform during normal work. | Agents that were assigned the integration tools can list destinations, send, and read recent messages. | Existing tool/skill/MCP assignment and approval (auto-execute vs. confirm) semantics. | Tool/MCP/skill docs; agent definition tool selection |
| BEH-105 | Contract | SCN-107 | N/A: tool path does not exist. | Tool failures (not configured, gateway down, invalid token, unknown destination, platform error) return clear tool errors. The agent run continues. | — | — |
| BEH-106 | Operational | SCN-108 | Bindings persist in `<appDataDir>/external-channel/bindings.json` and drive runtime behavior. | Existing binding data has no effect and is not migrated. Stored provider tokens keep working. | Provider credentials in managed gateway `provider-config.json`. | `external-channel-storage.ts`, `managed-messaging-gateway-storage.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| AutoByteus user | Connect a bot once, then give chosen agents messaging abilities | Setup without choosing agents; tools assignable like other tools | No agent/run/model/workspace in integration config |
| Agent / team member | Communicate on a platform as part of its work | Can find a destination, send, and read replies by its own decision | Only when assigned the tools; normal tool approval applies |
| Platform user (Discord/Telegram) | Talks in a channel/DM where the bot is present | Sees bot messages sent by agents; their messages can be read by agents that check | Their messages never start agents or trigger automatic replies |
| Operator | Keep the node safe and understandable | Default off; clear status; no hidden autonomous posting | Bot tokens are never exposed to agent context |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-101` Configure a Discord or Telegram integration, with no agent target, and see its status, provided tools/skill, and reachable destinations.
- `UC-102` Assign messaging tools and the usage skill to agent definitions through the normal editor.
- `UC-103` An agent lists reachable destinations.
- `UC-104` An agent sends a text message, optionally as a reply or in a thread.
- `UC-105` An agent reads recent messages of a destination.
- `UC-106` Incoming platform messages do not affect agent runs.
- `UC-107` Remove the channel-binding model (UI, API, ingress-to-run dispatch, automatic output delivery, bound-run streaming projection).
- `UC-108` Tool errors are clear and non-fatal.

### Out Of Scope

- Waking or notifying an agent when a message arrives (push, event triggers, delivery modes, run "attachments"). This is a candidate for a separate, generic Automation-trigger ticket (DEC-101).
- Automatic reply bots.
- WhatsApp, WeCom, WeChat, Slack, or other providers (remain excluded/absent).
- Attachments, images, files, reactions, edits, deletes, and moderation actions (DEC-107).
- Migrating legacy bindings into anything.
- Per-agent bot identities, or rewriting messages to show which agent sent them.
- Changing the Automation Schedule feature (a separate in-progress ticket).

### Non-Goals

- Making a messaging app a remote chat UI for AutoByteus. The native and mobile apps own that job.
- Replacing generic MCP server support. Users may still add third-party messaging MCP servers.

### Preserved Behavior Boundary

- BEH-101 preserved column: gateway lifecycle controls, token configuration, default-off, excluded providers.
- BEH-104 preserved column: existing tool/skill assignment and tool-approval behavior.
- Normal agent/team launch, run history, and native chat are unchanged except for removing the bound-run external-message projection (REQ-101).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | The channel-binding model is removed: no product surface, API, or stored configuration associates a platform chat with an agent/team definition, launch preset, or run. This includes the Channel Binding and Verify setup steps and the bound-run external-message stream projection. | BEH-101, BEH-106 | Must | Root cause of the wrong ownership | User request 2026-09-24 |
| REQ-102 | An incoming platform message never creates, restores, starts, or posts input to any agent/team run. | BEH-102 | Must | Agents are independent workers | User request |
| REQ-103 | No agent or team output is sent to a platform unless an agent explicitly invokes the send tool. | BEH-103 | Must | Explicit communication intent | User request |
| REQ-104 | Integration configuration contains only provider connection data: credentials, account label, and provider options. Setup shows connection status, the tool names and skill the integration provides, and reachable destinations. | BEH-101 | Must | Target-free integration | User request |
| REQ-105 | **Send:** an agent assigned the send tool can post a text message to a reachable destination, optionally replying to a given message or posting in a thread where the platform supports it. The result reports success with the platform message ID, or a failure reason. One tool call results in at most one posted message. | BEH-104 | Must | Core capability | User request |
| REQ-106 | **List destinations:** an agent assigned the tool can list destinations the bot can currently reach, each with a stable ID, readable name, and type (channel/group/DM/thread). | BEH-104 | Must | Agents need addressable targets | Platform facts |
| REQ-107 | **Read recent messages:** an agent assigned the tool can read recent messages of a destination (bounded count). Each message includes message ID, author display name/ID, whether the author is the bot itself, timestamp, text, and reply-to ID when present. | BEH-104 | Must (pending DEC-102) | Conversations need replies | User request, DEC-102 |
| REQ-108 | Messaging tools and the usage skill are available to an agent only through the normal agent-definition tool/skill selection. Tools appear in the catalog only for configured integrations. | BEH-104 | Must | "Just more tools" | User request |
| REQ-109 | Each integration provides a usage skill describing when and how to use its tools. | BEH-104 | Should (pending DEC-104) | User's integration = skill + tools model | User request |
| REQ-110 | Bot tokens and other provider secrets never appear in agent-visible content: tool schemas, tool arguments/results, skill text, prompts, or run history. | BEH-104 | Must | Security | Proposed; approval needed |
| REQ-111 | Providers in scope are Discord bot and Telegram bot. WhatsApp, WeCom, and WeChat remain unavailable in setup. | BEH-101 | Must | Current managed distribution | `disable-broken-messaging-providers` |
| REQ-112 | The integration remains off until the user configures and starts it. When unconfigured or stopped, tool calls return a clear "not available" error. | BEH-101, BEH-105 | Must | Preserve default-off | Current gateway default |
| REQ-113 | Tool failures return actionable error results and never crash or stop the agent run. | BEH-105 | Must | Robust agent work | — |
| REQ-114 | Existing channel-binding data has no runtime effect and is not migrated. Existing configured Discord/Telegram credentials continue to work without re-entry. | BEH-106 | Must | Clean cut with credential continuity | DEC-106 |
| REQ-115 | Messaging tools work in every agent runtime that supports assigned registered tools today (AutoByteus native, Codex App Server, Claude Agent SDK). | BEH-104 | Should | Consistency with MCP tools | `tools_and_mcp.md` |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | REQ-101, REQ-104 | BEH-101, SCN-101 | Open Settings → Messaging | Gateway card and provider configuration are visible. No Channel Binding or Verify step. No agent/team/model/workspace field. Provided tools/skill and destinations are shown. | — | Browser/UI test |
| AC-102 | REQ-101 | BEH-101 | Inspect GraphQL/REST surface | Binding CRUD and channel-ingress-to-run endpoints no longer exist. | — | API test |
| AC-103 | REQ-102 | BEH-102, SCN-105 | Integration running; a platform user DMs the bot and posts in a group with the bot | Zero agent/team runs created, restored, or messaged. No automatic reply. | Also with legacy `bindings.json` present | E2E with fake provider |
| AC-104 | REQ-103 | BEH-103, SCN-103 | Agent with messaging tools finishes a turn without calling send | Nothing is posted to the platform. | — | E2E |
| AC-105 | REQ-105 | BEH-104, SCN-103 | Agent calls send with a valid destination and text | Exactly one message appears from the bot. The tool result includes the platform message ID. | Reply-to/thread variant posts as reply/in thread | E2E with fake provider + manual live check |
| AC-106 | REQ-105, REQ-113 | BEH-105, SCN-107 | Send retried after a transient failure | Still at most one posted message for that tool call. | Unknown destination / invalid token → error result; run continues | Integration test |
| AC-107 | REQ-106 | SCN-106 | Agent calls list destinations | Reachable destinations are returned with ID, name, and type. | Telegram: only chats that have contacted the bot since it started receiving | E2E |
| AC-108 | REQ-107 | SCN-104 | Messages exist in a destination | The tool returns up to N recent messages with the required fields, newest-last or clearly ordered. | Discord without Message Content intent: returned content explains it is unavailable | E2E |
| AC-109 | REQ-108 | SCN-102 | Agent definition without the tools | The agent cannot call messaging tools. After assignment, it can. | Tools absent from catalog when integration unconfigured | UI + runtime test |
| AC-110 | REQ-109 | SCN-102 | Integration configured | The usage skill is listed and assignable. | — | UI test |
| AC-111 | REQ-110 | — | After setup and tool use | The token string does not occur in tool schemas, results, skill files, prompts, or run history/traces. | — | Automated scan |
| AC-112 | REQ-111 | BEH-101 | Open provider selection | Only Discord and Telegram are selectable. | — | UI test |
| AC-113 | REQ-112 | SCN-107 | Integration not configured or gateway stopped | Tool call returns a clear "not available" error. | — | Integration test |
| AC-114 | REQ-114 | BEH-106, SCN-108 | Upgrade a node that has `bindings.json` and saved tokens | Bindings have no effect and remain untouched. Saved tokens work after the gateway starts. | — | Upgrade test |
| AC-115 | REQ-115 | SCN-103 | Same agent definition run on native, Codex, and Claude runtimes | The send tool works on each. | A runtime without tool support is out of scope | Runtime E2E |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-101 | User | User | Connect a bot | Settings → Messaging | Gateway off | Start gateway → choose Telegram/Discord → paste token → save | Connected. Tools/skill and destinations shown. | Invalid token → clear error | Supported Normal (proposed) | User request | REQ-104, 111, 112; AC-101, 112 |
| SCN-102 | User | User | Give an agent messaging ability | Agent definition editor | Integration configured | Select messaging tools + skill → save | Agent can use tools in new runs | — | Supported Normal (proposed) | Existing tool/skill selection | REQ-108, 109; AC-109, 110 |
| SCN-103 | System | Agent | Post an update during work | Agent decision in a normal run | Agent has tools | List destinations → send text | Bot message appears. Tool result has ID. | Error result; run continues | Supported Normal (proposed) | User request | REQ-103, 105; AC-104, 105 |
| SCN-104 | System | Agent | Check replies | Agent decision | Agent has tools | Read recent messages → optionally reply | Agent sees authors/text. Can reply to a message. | Empty result if nothing received | Supported Normal (proposed, DEC-102) | User request | REQ-107; AC-108 |
| SCN-105 | System | Platform user | Talks to the bot | Platform message | Integration running | Message arrives | Recorded for reading only. No agent effect. No auto-reply. | — | Supported Normal (proposed) | User request | REQ-102; AC-103 |
| SCN-106 | System | Agent | Find where to post | Agent decision | Agent has tools | List destinations | Destinations with names/IDs | Telegram only knows chats that contacted it | Supported Normal (proposed) | Platform facts | REQ-106; AC-107 |
| SCN-107 | Operational | Agent | Resilience | Tool call while unavailable | Unconfigured, stopped, or bad token | Call tool | Clear error. Run continues. | — | Supported Explicit Edge | Default-off state | REQ-112, 113; AC-106, 113 |
| SCN-108 | Operational | Operator | Upgrade | App update | Legacy bindings + saved tokens | Start new version | Bindings have no effect. Tokens preserved. | — | Supported Normal | Storage evidence | REQ-101, 114; AC-114 |
| SCN-109 | System | Team member | Team work uses messaging | Member decision | Member definition has tools | Same as SCN-103/104 | Same behavior as a standalone agent | — | Supported Normal (proposed) | Tool model | REQ-108 |
| SCN-110 | System | Platform user | Get an automatic real-time answer from an agent | Platform message | — | — | **Not provided by this ticket.** Future generic Automation trigger. | — | Deferred / out of scope (DEC-101) | User model | — |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (Settings → Messaging simplification)
- Linked UI/UX or interaction supplement: `N/A — not applicable`. No Product Design requested.
- Prototype fields: `N/A — not applicable`.
- Required outcomes: AC-101, AC-110, AC-112. The page shows gateway lifecycle, provider selection/configuration, connection status, provided tool names + skill, and reachable destinations. It shows no binding, target, or launch fields.
- Explicitly unresolved product decisions: exact page wording and layout, left to design.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-101 | REQ-110 / AC-111 | Security | Provider secrets are never in agent-visible content | All runtimes | Token scan |
| QR-102 | REQ-105 / AC-106 | Reliability | At most one platform message per send tool call, including retries | Transient failures | Fault-injection test |
| QR-103 | REQ-107 | Privacy | Messages stored for reading stay local to the node and are bounded (proposed: last 7 days per destination) | DEC-105 | Test retention bound |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Must be preserved: saved Discord/Telegram provider configuration and tokens (managed gateway `provider-config.json`).
- Acceptable loss/reset: legacy `bindings.json`, message receipts, and run-output delivery records become inert, left untouched and unused. Transient gateway inbox/outbox queue contents may be reset.
- Constraints: messages stored for reading are local and bounded (QR-103).
- Unknowns: whether any real installations have bindings. None found locally. Treated as inert regardless.

## External Contracts And Dependencies

| Contract / Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Telegram Bot API | No history API. Updates retained ≤24h. `getUpdates` offset confirms/consumes updates. No chat enumeration. | core.telegram.org/bots/api (fetched 2026-09-24) | Reading/discovery require an always-on receiver. Messages can be missed if it is off >24h. |
| Telegram privacy mode | In groups, the bot sees only commands/mentions/replies unless privacy is disabled or it is an admin | Prior SR-002 evidence (official docs) | Read tool shows only what the bot can see |
| Discord Message Content intent | Without the privileged intent, content is empty except DMs, mentions, and the bot's own messages, across REST and Gateway | docs.discord.com (fetched 2026-09-24) | Setup must tell users to enable the intent for reading |
| Automation Schedule (in progress) | Can periodically wake an agent that then uses read tools | `autonomous-scheduled-agent-runs` ticket | Not merged. Not a dependency of this ticket. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `product-model-analysis.md` | Model explanation, current-vs-proposed comparison, platform facts, keep/remove list | All REQ/AC | SR-003 proposal | Approval pending with this doc |
| `history/sr-002-*.md` | Archived unapproved SR-002 artifacts | Retired IDs | Historical | N/A |

## Assumptions

| ID | Assumption | Why Necessary | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-101 | One bot account per provider per node is enough for v1. Every agent that uses it posts as that bot. | Matches the "bot is an instrument" model | User confirmation | Open |
| ASM-102 | The normal tool-approval setting (auto-execute vs. confirm) is sufficient oversight for sends. | Avoids a new permission system | User confirmation (DEC-103) | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status / Recommendation |
| --- | --- | --- | --- | --- | --- |
| DEC-101 | Should an incoming message ever wake/notify an agent in this ticket? | Decides whether push machinery is in scope | (a) No, tools only. Wake-ups later via generic Automation trigger. (b) Push to running agents (SR-002 hybrid). | User | **Recommend (a)** |
| DEC-102 | Include reading in v1? | Telegram reading needs an always-on receiver + local store | (a) Send + list + read. (b) Send + list only. | User | **Recommend (a)** |
| DEC-103 | Restrict which destinations agents may post to? | Safety vs. simplicity | (a) Anything the bot can reach + normal tool approval. (b) Per-integration allowlist. | User | **Recommend (a)** |
| DEC-104 | Ship a bundled usage skill per integration? | Matches "integration = skill + tools" | (a) Yes, small skill. (b) Tool descriptions only. | User | **Recommend (a)** |
| DEC-105 | Retention for readable messages? | Privacy/storage | Proposed: local, last 7 days per destination | User | Recommend 7 days |
| DEC-106 | Legacy binding data | Clean cut | (a) Leave untouched and ignore. (b) Delete. | User | **Recommend (a)** |
| DEC-107 | Content types in v1 | Scope | (a) Text only. (b) Text + files/images. | User | **Recommend (a)** |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-101 | UC-107 | BEH-101, BEH-106 | AC-101, AC-102 | SCN-108 |
| REQ-102 | UC-106 | BEH-102 | AC-103 | SCN-105 |
| REQ-103 | UC-104, UC-107 | BEH-103 | AC-104 | SCN-103 |
| REQ-104 | UC-101 | BEH-101 | AC-101 | SCN-101 |
| REQ-105 | UC-104 | BEH-104 | AC-105, AC-106 | SCN-103 |
| REQ-106 | UC-103 | BEH-104 | AC-107 | SCN-106 |
| REQ-107 | UC-105 | BEH-104 | AC-108 | SCN-104 |
| REQ-108 | UC-102 | BEH-104 | AC-109 | SCN-102, SCN-109 |
| REQ-109 | UC-102 | BEH-104 | AC-110 | SCN-102 |
| REQ-110 | UC-101–105 | BEH-104 | AC-111 | — |
| REQ-111 | UC-101 | BEH-101 | AC-112 | SCN-101 |
| REQ-112 | UC-101, UC-108 | BEH-101, BEH-105 | AC-113 | SCN-107 |
| REQ-113 | UC-108 | BEH-105 | AC-106 | SCN-107 |
| REQ-114 | UC-107 | BEH-106 | AC-114 | SCN-108 |
| REQ-115 | UC-103–105 | BEH-104 | AC-115 | SCN-103 |

## Architecture Phase Input

- Scenario paths to map: SCN-101 to SCN-109.
- Constraints: no integration-owned agent lifecycle, no implicit outbound, secrets out of agent context, default-off, Discord/Telegram only, clean-cut removal (no dual binding path).
- Deferred to design: where tools execute (server-registered tools calling the gateway, a gateway-hosted MCP endpoint, or skill scripts); whether the managed gateway remains the connection host; the message-store mechanism; tool naming; how the skill is bundled; the exact removal set across server, web, gateway, and `autobyteus-ts`; and how to handle unused WhatsApp/WeCom/WeChat adapter code.
- Technical facts to verify: Discord's first-send gateway-connection requirement for new bots; the tool bridges for Codex/Claude; the current outbox idempotency key semantics for tool-initiated sends; and where the setup UI can surface tool names.
- Feasibility risks: Telegram's receive-only history model; the Discord privileged intent; removing the streaming `EXTERNAL_USER_MESSAGE` type across server and web.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`, subject to the user's answers on DEC-101 to DEC-107
- Remaining content blocker: user decisions DEC-101 to DEC-107

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: explicit user approval
