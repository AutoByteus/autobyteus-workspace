# External Messaging As Run-Attached Integrations — Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — revised proposed requirements basis awaiting user approval. No target design or implementation is authorized yet.

## Goal / Problem Statement

Replace the current external-messaging “channel-to-agent binding” with an integration model in which agents and teams start through their normal lifecycle and may opt into external inputs and capabilities when their run is launched.

The correct ownership direction is:

```text
configure provider/MCP integration and discover its sources
  -> start agent or team normally
  -> the run explicitly attaches allowed sources and a delivery policy
  -> new source events are pushed to that already-running run
  -> selected events may become external-human turn inputs
  -> the agent uses explicit integration tools to read more context or send/reply
```

It is not:

```text
bind channel to agent/team definition plus launch preset
  -> channel message creates/restores execution
  -> generic run output is automatically mirrored to channel
```

An MCP tool by itself is only an action/retrieval surface and cannot initiate an agent turn. A complete integration has two complementary sides:

1. **Push input:** provider webhook/polling or an MCP resource subscription reports new messages to the AutoByteus host, which routes them only to active runs that opted in.
2. **Agent capabilities:** MCP resources/tools expose history and actions such as list/read/send/reply/react/moderate.

The external message may ultimately start a normal agent turn, but only after an already-running run has explicitly selected the source and a delivery mode that makes the event turn-starting. Event arrival must never provision, restore, or independently start an agent/team run.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | A provider route stores an agent/team target, launch preset, cached run identity, and output policy. | A provider/MCP integration stores credentials, transport capability, and discoverable sources but no agent target or launch preset. | Durable transport, retry, idempotency, provider clients, and gateway supervision remain reusable. | `R-001`, `R-002`, `R-007`; `AC-001`, `AC-002`, `AC-010` |
| `BEH-002` | An accepted external message resolves a binding and lazily creates/reuses its target run before posting a user message. | Agent/team execution starts normally. At launch, the run may create a run-owned `ExternalInputAttachment` selecting source(s), actor/filter rules, backlog policy, and delivery mode. Provider traffic never creates or restores execution. | Normal run preparation/activation and native UI input continue to work without any integration attachment. | `R-003`, `R-005`; `AC-003`, `AC-004`, `AC-006`, `AC-013` |
| `BEH-003` | Non-mentioned group messages are blocked. Mentioned/DM events are flattened into generic user-style input. | Authorized events are normalized and durably accepted. An active attachment decides whether each event is context-only, batched, mention/direct-only, or an immediate external-human turn trigger. Author/source/reply facts are preserved. | Provider visibility and privacy constraints remain authoritative. | `R-004`–`R-006`; `AC-005`–`AC-009` |
| `BEH-004` | Shared envelopes lack required author/reply/edit/delete semantics. | A canonical `ExternalMessageEvent` preserves source, event/message, author, timestamps, reply/thread, mention/addressing, edit/delete, media, and bot/self semantics. | Raw provider parsing stays adapter-owned. | `R-004`, `R-007`; `AC-005`, `AC-007`, `AC-010` |
| `BEH-005` | Current AutoByteus MCP integration discovers and calls tools; it does not consume MCP resources or resource-update subscriptions as agent inputs. | An MCP-backed messaging integration may expose group history as resources and notify the host through resource subscriptions, while tools expose explicit actions. The host—not the MCP server—applies run attachment and turn-delivery policy. | Existing MCP tool selection and per-agent tool execution remain useful for the action side. | `R-007`; `AC-010` |
| `BEH-006` | Eligible bound-run completions are automatically published to the provider route, including some later coordinator output. | Only explicit integration send/reply actions cross to the provider. Generic final answers, native turns, autonomous work, and internal team output are not automatically mirrored. | Provider outbox, retry, rate-limit, idempotency, and delivery evidence can be reused below the explicit action. | `R-008`; `AC-011` |
| `BEH-007` | Settings configures “Channel Binding” and repeats runtime/model/workspace launch fields per peer. | Settings configures integrations/connectors and discovers sources. The normal run-launch flow optionally attaches selected sources and delivery modes. Team launch names one external-input owner. | Existing agent/team launch choices remain the lifecycle authority. | `R-001`–`R-003`, `R-009`, `R-010`; `AC-001`–`AC-004`, `AC-012`, `AC-013` |

## Investigation Findings

1. The user’s latest brainstorm resolves the ambiguity between “context only” and “message input”: a new external message really may notify an already-running agent and become a turn, but it must not own the agent lifecycle.
2. Some association is unavoidable for push routing. The healthy association is an active run attaching to an allowed source; the unhealthy association is a channel record owning an agent definition, launch preset, and cached execution.
3. Tools alone are pull/action-oriented. Under the current MCP specification, resources are application-controlled and may support `resources/subscribe` plus `notifications/resources/updated`; tools are model-controlled. This maps naturally to group history/notification versus send/reply actions.
4. An MCP resource update notification only tells the host that a resource changed. AutoByteus must still decide which active run subscribed, fetch/normalize the event data, and whether it starts a turn.
5. Current AutoByteus MCP support is tool-centric: it discovers tools, registers tool names on agent definitions, creates MCP server instances keyed by agent ID, and calls tools. Its managed client interface has no resource list/read/subscribe or notification-to-runtime path.
6. Current agent definitions already select tool names. Therefore a “WeChat Group Manager” agent can receive read/send/reply MCP capabilities through normal tool selection, while actual group access should be authorized at run launch.
7. Current agent workers are long-lived after start and queue turn-start events, which supports push into an active run. The runtime currently recognizes only user and inter-agent turn triggers, so it needs a distinct external-human trigger or rigorously preserved external metadata.
8. Current binding ingress performs exactly the lifecycle coupling that must disappear: binding resolution leads to lazy run launch/reuse and `postUserMessage`/team posting.
9. Current output delivery is an open route-to-run subscription, not merely a direct response. It must not be retained as the outbound model.
10. No representative real legacy binding file was found locally, but disablement must preserve possible deployed data and avoid semantic migration.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/product-model-analysis.md` | Product/domain analysis of the integration, MCP resource/tool split, run-owned input attachment, push delivery, and explicit outbound behavior | `R-001`–`R-010` | `AC-001`–`AC-013` | Revised proposal; requires approval with requirements | Explains why this is neither a channel binding nor merely one more MCP tool. |

## Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` (primary), with `Shared Structure Looseness`, `Duplicated Policy Or Coordination`, and `Legacy Or Compatibility Pressure` secondary.
- Refactor posture: `Likely Needed`
- Evidence basis: `ChannelBinding` owns provider route, target definition, launch preset, cached execution, team target, and automatic output policy. The MCP subsystem only owns tool discovery/calls, while the agent runtime only owns user/inter-agent turn inputs. No healthy integration-event boundary exists.
- Requirement or scope impact: Replace binding-owned lifecycle with integration/source ownership plus run-owned attachments. Extend MCP/integration ingress and agent runtime for typed pushed external messages. Decommission binding-driven run launch and automatic output mirroring.

## Recommendations

1. Treat WeChat/Slack/Telegram/Discord as **integrations**, potentially MCP-backed, rather than remote-control channel bindings.
2. Split each integration into **inputs/resources** and **tools/actions**:
   - resources/events: groups, history, new-message updates;
   - tools: read/query, send, reply, react, moderate, manage.
3. Keep integration configuration server-owned and target-free. Credentials and group discovery should not mention an agent or team.
4. Put the choice on normal agent/team launch: “Allow external inputs,” select integration/source(s), sender permissions, backlog, and delivery mode.
5. Make that association run-owned and lifecycle-scoped. It is an `ExternalInputAttachment` or subscription, not a source-owned binding and not a run factory.
6. Support explicit delivery modes rather than one universal behavior:
   - `EVERY_MESSAGE` for a dedicated group manager/auto-reply agent;
   - `ADDRESSED_ONLY` for mention/DM/reply behavior;
   - `BATCHED` for high-volume discussion;
   - `CONTEXT_ONLY` when messages should be queryable but not turn-starting.
7. Normalize a selected event to a typed `ExternalHumanMessageReceived` turn trigger. It may enter normal user-turn processing, but must preserve source/author/reply identity and must never activate a stopped run.
8. Require explicit send/reply tools for outbound messages; do not infer send intent from final assistant text.
9. For teams, attach the source to the team run and route selected external inputs through the configured manager/entry member. Do not attach independently to every member.
10. Disable legacy binding behavior coherently and avoid automatically converting old records.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large`

## In-Scope Use Cases

- `UC-001`: Coherently disable legacy binding setup, binding-driven run launch/input, and open run-output publication without deleting legacy data.
- `UC-002`: Configure a WeChat/Slack/Telegram/Discord-style connector or MCP server independently from any agent/team target.
- `UC-003`: Discover external groups/channels/DM sources and verify their receive/send capabilities.
- `UC-004`: Start an agent/team normally with no external inputs and preserve existing behavior.
- `UC-005`: At normal run launch, explicitly attach selected external sources, authorized actors, backlog policy, and delivery mode.
- `UC-006`: Push a new provider message to an already-running subscribed agent and start exactly one external-human turn when the selected delivery policy requires it.
- `UC-007`: Retain/deduplicate an event when no eligible run is active without creating/restoring execution; apply the next launch’s explicit backlog policy.
- `UC-008`: Queue selected external inputs while the agent is busy without duplicate turns.
- `UC-009`: Use MCP resources/tools or equivalent integration capabilities to read more history/context and explicitly send/reply/react.
- `UC-010`: Use `EVERY_MESSAGE`, `ADDRESSED_ONLY`, `BATCHED`, or `CONTEXT_ONLY` policy according to the agent’s role.
- `UC-011`: Attach an external source to a team run through one designated manager/entry owner while keeping internal team communication private.
- `UC-012`: Surface active attachments, visibility capability, delivery mode, backlog/cursor health, and outbound permission truthfully.

## Out of Scope

- Implementing before the requirements basis is approved.
- Allowing provider traffic to create, restore, or independently start an agent/team run.
- Keeping a persistent source record whose target is an agent definition plus launch preset.
- Assuming that assigning an MCP tool automatically creates push notification behavior.
- Automatically exposing every integration source to every agent that has the send/read tool.
- Automatically mirroring generic final answers or internal output to a provider.
- Circumventing provider privacy modes, scopes, terms, or API restrictions.
- Shipping every provider in the first implementation slice.
- Automatically migrating legacy bindings into active integration attachments.

## Functional Requirements

- `R-001` — **Legacy disablement:** Binding CRUD, binding-driven run preparation/restoration/input dispatch, and open bound-run output publication must be disabled coherently without deleting or rewriting legacy binding data.
- `R-002` — **Target-free integration:** Integration/connector configuration must own provider or MCP credentials, connection health, capabilities, and discoverable external sources. It must not store an agent/team target, run ID, launch preset, model, workspace, or runtime kind.
- `R-003` — **Run-owned external input attachment:** Normal agent/team launch must optionally accept external-input configuration naming authorized integration source(s), actor/filter policy, backlog policy, and delivery mode. The created attachment belongs to the run/team-run lifecycle and cannot create or choose that lifecycle.
- `R-004` — **Canonical event and durable ingress:** Authorized provider events must be normalized, deduplicated, ordered, and durably recorded with integration/source, event/message, author, provider/ingest time, reply/thread, addressed, edit/delete, media, and bot/self facts.
- `R-005` — **No lifecycle trigger:** External traffic must never call agent/team prepare, create, restore, or activate operations. Only an already-active eligible attachment may receive a pushed notification. Stopped/unattached handling must follow explicit retention/backlog policy.
- `R-006` — **Policy-controlled turn delivery:** Each active attachment must select `EVERY_MESSAGE`, `ADDRESSED_ONLY`, `BATCHED`, or `CONTEXT_ONLY`. A selected immediate/batched event may create an external-human turn in the already-running run; ignored/context-only events may not. Delivery must be idempotent and queue safely behind an active turn.
- `R-007` — **Integration resource/tool split:** An integration may use MCP resources and resource subscriptions, an equivalent native event adapter, or both for inputs/context; it may expose MCP tools for read/query/send/reply/react/moderation actions. AutoByteus host policy remains authoritative for run routing and turn creation.
- `R-008` — **Explicit outbound action:** Provider sends/replies must occur only through an explicit authorized integration tool/action naming the source and reply/thread target where applicable. Generic assistant output and internal team events have no implicit external send authority.
- `R-009` — **Team ingress owner:** A team-run attachment must name one manager/entry member as the external-input owner. The selected event starts at most one team ingress turn and is not fanned out independently to every member.
- `R-010` — **Authorization, visibility, and product surface:** Integration setup and run launch must expose source visibility, actor restrictions, delivery policy, backlog behavior, active attachment health, and outbound permissions. Tool possession alone must not grant source input or send authorization.

## Acceptance Criteria

- `AC-001` — With legacy messaging disabled, binding CRUD is explicitly unavailable, provider traffic cannot launch/message through the legacy binding path, bound-run output cannot publish, and existing binding files remain unchanged.
- `AC-002` — A configured integration and discovered group contain no agent/team definition ID, run ID, model/workspace/runtime launch configuration, or automatic output target.
- `AC-003` — An agent/team launched without external-input attachments behaves as before and receives no integration message merely because it has an MCP read/send tool.
- `AC-004` — A normally started run can explicitly attach one or more allowed sources. Removing/stopping that run unregisters live delivery without deleting integration/source configuration.
- `AC-005` — With an active `EVERY_MESSAGE` attachment, one accepted new human message creates exactly one external-human turn on the already-running run with source, author, and reply/thread identity preserved.
- `AC-006` — With no eligible active run, a provider event creates/restores/starts zero agent or team runs and creates zero turns. The event is retained or expired only according to configured source/backlog policy.
- `AC-007` — With `ADDRESSED_ONLY`, ambient group events remain available as context but create zero turns; a valid mention/DM/reply creates exactly one external-human turn without any lifecycle activation.
- `AC-008` — With `CONTEXT_ONLY`, accepted events are retrievable through the source/resource interface and create zero turns. With `BATCHED`, a configured window produces one bounded author-attributed batch turn rather than one turn per message.
- `AC-009` — If the run is busy, selected events remain ordered/idempotent in the runtime/integration inbox and start no duplicate turns after the active turn settles.
- `AC-010` — An MCP-backed proof can expose a group resource, receive a resource-update notification over a maintained host session, normalize the changed message, and route it only to eligible active attachments. A tool-only agent assignment does not create that subscription.
- `AC-011` — A native UI turn, autonomous task, or integration-triggered turn sends no provider message unless the agent invokes an authorized send/reply action; retries are idempotent and delivery outcome is recorded.
- `AC-012` — A team attachment routes one selected external input to its configured manager/entry owner, does not create parallel member turns, and does not expose internal delegation without an explicit external action.
- `AC-013` — Restoring the same previously configured run restores its attachment only from its run metadata and current authorization; launching a different run creates no attachment unless explicitly selected. Legacy bindings create none.

## Constraints / Dependencies

- Current MCP clients support tool discovery/call only; resources, subscriptions, and notification handling require extension.
- Official MCP resources are application-controlled, tools are model-controlled, and resource subscriptions notify the client that a URI changed; AutoByteus must own routing and turn policy.
- Current agent runtime turn triggers are user and inter-agent events only; an external-human trigger or equally explicit typed source preservation is required.
- Current MCP tool instances are keyed by agent ID and may be created lazily. Always-on provider ingestion may require a server-owned integration session separate from per-agent tool instances.
- Provider rules determine available messages, authors, edits/deletions, reply handles, and visibility.
- External human messages are untrusted input and may be multi-party; source/actor authorization and prompt-injection defenses are mandatory design concerns.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Legacy channel bindings at `<appDataDir>/external-channel/bindings.json`.
- Required outcome: `Discard or Rebuild` as active configuration.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Keep files dormant and unchanged during disablement. Users explicitly configure integrations and select run attachments; old bindings create neither.
- Unacceptable data loss or corruption: Disablement may not silently delete/rewrite legacy data. Replacement may not silently grant input/send permission or start runs from old bindings.
- Relevant availability, maintenance-window, or rollout constraints: UI/API/ingress/output disablement must be coherent; integration proof must not coexist with active legacy execution semantics.
- Related requirement and acceptance-criteria IDs: `R-001`–`R-003`, `R-010`; `AC-001`–`AC-004`, `AC-013`.

## Assumptions

- “Started by itself” means the normal user/application/team launch path remains the sole agent/team lifecycle authority.
- A specialized “WeChat Group Manager” agent definition may preselect relevant MCP tool names and recommended delivery defaults, but concrete connector/group authorization occurs at run launch.
- A pushed selected message may start a turn on an active run and can be processed as human input, provided its external source and author identity are preserved.
- Outbound communication is explicit tool/action use, not implicit final-answer delivery.
- The first provider proof may be native-adapter-backed or MCP-backed; the run attachment contract remains provider-independent.

## Risks / Open Questions

- Whether the product default should be `ADDRESSED_ONLY` or `CONTEXT_ONLY`; a dedicated group-manager preset can default to `EVERY_MESSAGE`.
- Whether events received while no run is attached should be retained by the integration by default, and for how long.
- Exact batching/debounce and unread-cursor semantics.
- Whether MCP resource subscription is sufficiently expressive for incremental high-volume group messages or a native/custom event stream is needed underneath while retaining MCP resources/tools for access/actions.
- Whether the first delivery should only disable legacy behavior or also include one integration/run-attachment proof.
- First provider sequencing and connector security model.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `R-001` | `UC-001` |
| `R-002` | `UC-002`, `UC-003` |
| `R-003` | `UC-004`, `UC-005`, `UC-011`, `UC-012` |
| `R-004` | `UC-006`–`UC-010`, `UC-012` |
| `R-005` | `UC-004`–`UC-008` |
| `R-006` | `UC-006`–`UC-008`, `UC-010` |
| `R-007` | `UC-002`, `UC-003`, `UC-006`, `UC-009` |
| `R-008` | `UC-009`, `UC-011` |
| `R-009` | `UC-011` |
| `R-010` | `UC-002`, `UC-003`, `UC-005`, `UC-010`–`UC-012` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Disable the complete legacy execution path without deleting data. |
| `AC-002` | Prove integration configuration is target-free. |
| `AC-003` | Prove tools do not implicitly subscribe a run to inputs. |
| `AC-004` | Prove launch-owned attachment lifecycle. |
| `AC-005` | Prove push-to-turn behavior on an already-running `EVERY_MESSAGE` agent. |
| `AC-006` | Prove external events never activate execution. |
| `AC-007` | Prove addressed-only filtering without lifecycle coupling. |
| `AC-008` | Prove context-only and batched modes. |
| `AC-009` | Prove busy-run queueing and idempotency. |
| `AC-010` | Prove MCP resource notification and tool assignment remain distinct. |
| `AC-011` | Prove explicit outbound authority. |
| `AC-012` | Prove team ingress ownership and privacy. |
| `AC-013` | Prove restore/new-run/legacy attachment semantics. |

## Approval Status

- User approval: `Pending`.
- Approval applies to this requirements doc and `product-model-analysis.md` together.
- Design must not begin until the user confirms the hybrid integration model, run-owned launch attachment, optional policy-controlled message-to-turn behavior, and explicit outbound tool/action model.
