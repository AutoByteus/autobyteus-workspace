# Requirements

## Status

- Current Status: `Refined`
- Previous Status: `Refined`

## Goal / Problem Statement

The messaging setup currently allows the user to bind an external messaging app such as Telegram to an individual agent, but not to an agent team.

The requested outcome is to investigate and, if realistic, add agent-team support to the messaging-app setup flow so a user can choose either:

- an individual agent, or
- an agent team

when configuring an external messaging channel target.

The investigation must answer two product/runtime questions before implementation proceeds:

1. How realistic is agent-team support in the current architecture?
2. When Telegram is bound to an agent team, should Telegram receive only the coordinator/final response, or all member responses?

The initial user preference is to avoid chaotic external-channel fan-out and likely return only the coordinator response unless there is a clear reason to expose more.

## Investigation-Based Direction

- The limitation is currently in the user-facing setup flow and GraphQL mutation, not in the core binding model.
- Team definitions are a valid primary target, but they still need an explicit launch preset because team creation requires runtime/model/workspace inputs in addition to the definition id.
- The updated phase-2 direction is to support `TEAM` as a definition-bound messaging target with a persisted team launch preset and an internally cached `teamRunId`.
- The clarified lifecycle rule is that `TEAM` bindings should mirror the bot-owned lifecycle of `AGENT` bindings: reuse only the binding's cached run when that exact run is both bot-owned for the current backend process and still active; do not adopt a merely resumable or history-reopened run after restart.
- The recommended Telegram behavior is a single externally visible reply stream from the team coordinator or bound entry node.
- Fan-out of every internal member response to Telegram is explicitly out of scope for this round.
- Manual restart testing also exposed a frontend websocket reconnect gap for already selected live contexts; this reliability gap is in scope because it affects workspace-page verification of the messaging flow.
- Repeated live-state regressions also exposed a deeper architecture issue: persisted history loading is currently coupled to active-run recovery and websocket subscription ownership.
- The redesign direction is to keep history loading read-only and move liveness plus websocket subscription ownership behind a dedicated backend active-runtime source and one explicit frontend subscription manager.
- Run-history projection is already runtime-aware, but the broader history metadata and resume path is not cleanly runtime-aware enough; the next architecture should extend runtime awareness into a dedicated backend history-source boundary rather than relying on generic local-memory assumptions.

## Scope Classification

- Classification: `Medium`
- Rationale:
  - The change appears cross-layer across settings UI, server-side external-channel binding/runtime dispatch, and outbound reply policy.
  - The primary deliverable for this round is feasibility analysis plus requirements clarification, not immediate source implementation.

## In-Scope Use Cases

- `UC-000`: Bootstrap a dedicated ticket/worktree and investigate the current external messaging setup for agent-only targeting.
- `UC-001`: Determine where the messaging settings flow currently limits target selection to agents and excludes agent teams.
- `UC-002`: Determine whether the external-channel server runtime can already route inbound messages to an agent team or whether it is agent-only.
- `UC-003`: Determine how outbound replies are currently selected and published back to Telegram.
- `UC-004`: Evaluate feasible product behavior for agent-team replies on Telegram, including coordinator-only vs all-member output.
- `UC-005`: Produce a realistic implementation assessment and recommended next slices.
- `UC-006`: Define the clean target model for direct team-definition messaging bindings.
- `UC-007`: Save a `TEAM` binding by selecting a team definition plus a team launch preset, without requiring a pre-existing team run.
- `UC-008`: On first inbound message, auto-create a team run from the bound team definition and launch preset, then reuse or resume it for subsequent messages.
- `UC-009`: After backend restart, an inbound Telegram message for a `TEAM` binding creates a fresh team run unless that binding's cached `teamRunId` is already both bot-owned in the current backend process and active.
- `UC-010`: After backend restart, selected live agent/team streams continue reconnect attempts across repeated failed reconnect closes instead of stopping after the first failed retry.
- `UC-011`: Selecting a member row for an already-open live team run changes focus within that live team context instead of reopening the run from persisted history and resetting live status.
- `UC-012`: When one run emits multiple reasoning bursts in the same turn, especially around `run_bash` or other tool activity, each later burst renders as a new visible think segment instead of appending into the first burst.
- `UC-013`: When a Telegram-bound coordinator sends or receives teammate messages through `send_message_to`, later coordinator replies that are causally descended from that Telegram-origin conversation are still sent back to Telegram, while unrelated UI-only turns are not.
- `UC-014`: Background history refresh updates persisted tree rows only and does not itself reconnect agent/team websockets or reopen live contexts.
- `UC-015`: Active/inactive status for agents and teams comes from a dedicated backend active-runtime source rather than being inferred through history-refresh side effects.
- `UC-016`: When product policy is "all active runs stay connected", websocket attachment and detachment are reconciled from one desired subscribed set so repeated history refreshes do not reattach already connected runs.
- `UC-017`: Standalone run projection and resume metadata are resolved through a runtime-aware backend history-source boundary so Codex/Claude-backed runs do not leak native local-memory assumptions.
- `UC-018`: Team-member projection is resolved through the same runtime-aware history boundary so team-member history does not probe standalone run-manifest or local-memory paths incorrectly.

## Out Of Scope / Non-Goals

- No multi-member Telegram fan-out. Internal member chatter remains internal.
- No requirement in this round for selecting a non-coordinator entry node from the settings UI.
- No requirement in this round for exposing full per-member runtime override editing in messaging settings if a shared/global team launch preset is sufficient.
- No release/finalization work until the user explicitly confirms completion.

## Initial Acceptance Criteria

1. A dedicated ticket/worktree exists for the investigation.
2. The current frontend, server, and gateway paths relevant to messaging target selection are identified.
3. The investigation states clearly whether current bindings/runtime dispatch already support agent teams, partially support them, or would require new architecture.
4. The investigation recommends a concrete external-channel reply policy for Telegram when the target is an agent team.
5. The recommendation explains the tradeoff between coordinator-only replies and multi-member fan-out.

## Refined Acceptance Criteria For Definition-Bound Team Support

1. Messaging setup can save either an `AGENT` binding or a `TEAM` binding.
2. A `TEAM` binding is definition-bound: it persists `targetTeamDefinitionId` plus `teamLaunchPreset`, not a user-selected `teamRunId`.
3. `teamRunId` may still be persisted internally on the binding as a cached execution pointer, but it is resolved or created by runtime dispatch rather than selected by the user in setup.
4. When a `TEAM` binding has no cached run, the first inbound external message auto-creates a team run from the bound team definition and launch preset.
5. When a cached `teamRunId` exists and is still bot-owned plus active for that binding in the current backend process, inbound messages reuse that team run instead of creating a new one.
6. When a cached `teamRunId` exists but is inactive after restart, inbound messages create a fresh team run rather than reviving the inactive cached run.
7. Reopening a team run from workspace history after restart does not cause a messaging binding to adopt that run; the binding only considers its own cached `teamRunId` when that cached run is still bot-owned in the current backend process.
8. When the bound team definition or team launch preset changes, any cached `teamRunId` is cleared so future messages start a fresh team run for the new configuration.
9. When a `TEAM` binding has no explicit target member, inbound external messages are delivered to the coordinator or entry node for that team.
10. Telegram exposes one externally visible reply stream per inbound team message thread; internal member discussion is not sent back to Telegram.
11. Existing agent binding behavior, including agent auto-start via launch preset, remains unchanged.
12. Team bindings work for native AutoByteus teams and for member-runtime teams across `autobyteus`, `codex_app_server`, and `claude_agent_sdk`.
13. Messaging verification and binding summary UI render correct readiness/labels for both `AGENT` and `TEAM` bindings.
14. Frontend agent/team websocket streams continue reconnect attempts across backend restarts until the configured retry budget is exhausted; a single failed reconnect attempt is not terminal.
15. Selecting `Professor`/`Student` rows in the left tree for an already subscribed live team run preserves the live in-memory team context, keeps current live status/tool activity intact, and only changes focused member.
16. Reopening a non-live or unsubscribed team context from the left tree still refreshes from persisted projection so historical content is not left stale.
17. For TEAM bindings, external callback routing propagates across inter-agent `send_message_to` hops only when the sender turn is already bound to an external source; unrelated manual/UI turns remain internal and are not echoed to Telegram.
18. Background history refresh is side-effect free with respect to runtime liveness and does not itself reconnect agent/team websocket streams.
19. Frontend active/inactive indicators for agent runs and team runs are derived from a dedicated backend active-runtime source instead of from run-history refresh side effects.
20. If all active runs remain live-connected, websocket subscription ownership is centralized in one frontend subscription manager that diffs desired active subscriptions against current live subscriptions and does not repeatedly reattach already connected runs.
21. The backend active standalone-agent snapshot excludes agent runs that belong to team members, so the frontend never tries to reopen a team member through the standalone `getRunResumeConfig(...)` path.
22. The backend active team snapshot is runtime-aware and reports both native-team runs and member-runtime team runs as active teams when appropriate.

## Acceptance Criteria IDs

- `AC-001`: The messaging setup flow exposes `AGENT` and `TEAM` target types for Telegram and other supported provider/transport pairs.
- `AC-002`: Saving an `AGENT` binding still requires `targetAgentDefinitionId` and `launchPreset`, and existing agent behavior remains unchanged.
- `AC-003`: Saving a `TEAM` binding requires a valid `targetTeamDefinitionId` selected from bindable team definitions and a valid `teamLaunchPreset`.
- `AC-004`: External inbound messages for a `TEAM` binding lazily create a team run when needed, cache or reuse the resolved `teamRunId`, route to the coordinator or entry node, and publish a single external reply stream only.
- `AC-005`: External inbound messages reuse a `TEAM` binding's cached `teamRunId` only when that exact cached run is both bot-owned in the current backend process and active; inactive, merely resumable, or history-reopened cached runs are replaced by a fresh team run for messaging dispatch.
- `AC-006`: Updating a `TEAM` binding resets any incompatible cached `teamRunId` when the team definition or team launch preset changes.
- `AC-007`: `TEAM` bindings dispatch successfully for native AutoByteus teams and resumable member-runtime teams backed by Codex or Claude.
- `AC-008`: Messaging verification and saved-binding UI clearly distinguish `AGENT` vs `TEAM` targets and validate the correct target-specific prerequisites.
- `AC-009`: Frontend agent/team websocket streams continue reconnect attempts across backend restarts instead of stopping after the first failed reconnect close.
- `AC-010`: Team member selection from the left tree reuses an already subscribed live team context instead of reopening that live team from persisted history; non-live team contexts still reopen from history.
- `AC-011`: Repeated reasoning bursts within a single turn are rendered as separate think segments when the runtime returns to reasoning after tool or text boundaries, and distinct reasoning item ids are never collapsed into the first burst for the whole turn.
- `AC-012`: TEAM callback routing propagates across inter-agent `send_message_to` hops only when the sender turn is already externally bound, so later coordinator replies in the same bot-origin conversation are still published back to Telegram while unrelated UI-only turns remain internal.
- `AC-013`: History refresh is read-only and does not itself reconnect live agent/team websocket streams.
- `AC-014`: The frontend receives active agent/team liveness from a dedicated backend source and uses that source, not history refresh, to decide which runs should currently hold websocket subscriptions.
- `AC-015`: When multiple active runs and teams are configured to stay live-connected, repeated history refreshes do not create repeated websocket attach churn for runs that are already connected.
- `AC-016`: `agentRuns()` does not expose team-member runs as standalone active agents, so active-runtime synchronization never requests standalone resume configs for `professor_*`/`student_*` member ids.
- `AC-017`: `agentTeamRuns()` exposes member-runtime team runs as active teams, so Telegram-triggered or otherwise active member-runtime teams render with live status instead of falling back to `Offline`.
- `AC-018`: Standalone history queries resolve projection and resume metadata through a runtime-aware backend history-source boundary, so Codex/Claude-backed runs do not emit misleading native local-manifest or local-memory errors during normal history access.
- `AC-019`: Team-member history queries resolve through the member binding's runtime-aware history source and never probe standalone agent-history paths for team-member ids.

## Constraints / Dependencies

- Work from a dedicated branch/worktree created from the latest local `personal` branch.
- Do not disturb unrelated uncommitted changes in the original `personal` worktree.
- Follow the ticket workflow under `tickets/in-progress/`.

## Assumptions

- Telegram is the primary provider to reason about because it is the user’s main messaging app.
- A sane first product behavior may be to surface only one externally visible reply stream per inbound message thread.
- A realistic MVP should reuse existing team-run infrastructure instead of introducing a parallel team-only runtime subsystem.
- A shared/global team launch preset is sufficient for this round unless implementation proves that member-specific overrides are required for basic viability.

## Open Questions / Risks

1. Advanced non-coordinator entry-node targeting is deferred; the user-facing flow should default to coordinator-only behavior.
2. Team-definition options must exclude broken or deleted definitions from setup selection.
3. Nested team definitions require recursive leaf-agent config expansion when creating member configs from a team launch preset.
4. Member-runtime team resume must preserve external-source metadata so Telegram callback routing still resolves against the entry member run.
5. TEAM reuse parity must be implemented against the binding's cached `teamRunId` plus current-process bot ownership, not against any arbitrary team that happens to be opened from history after restart.

## Requirement IDs

- `R-000`: Bootstrap and investigate the current messaging-target selection path before implementation.
- `R-001`: Identify the current product/runtime constraint that limits external messaging targets to agents.
- `R-002`: Determine the minimum viable product behavior for binding Telegram to an agent team.
- `R-003`: Recommend an external reply policy that avoids chaotic message fan-out.
- `R-004`: Support definition-bound `TEAM` bindings so users do not need to manually start a team run before configuring messaging.
- `R-005`: Persist a team launch preset with each `TEAM` binding and use it to create a team run on first inbound message.
- `R-006`: Cache and reuse a resolved `teamRunId` for a `TEAM` binding only when that exact cached run is still bot-owned in the current backend process and active.
- `R-007`: Default team-targeted Telegram replies to coordinator-only or entry-node-only output.
- `R-008`: Frontend live agent/team streaming must continue reconnect attempts across backend restarts until the configured retry budget is exhausted.
- `R-009`: Left-tree member selection for an already subscribed live team run must preserve the live in-memory team context and only retarget focus, while inactive or unsubscribed team contexts continue using the persisted-history reopen path.
- `R-010`: Streaming identity for reasoning segments must preserve distinct reasoning bursts within one turn so post-tool thinking is rendered as a new segment instead of being appended into the first burst.
- `R-011`: External callback routing for TEAM bindings must propagate selectively across inter-agent `send_message_to` hops so later coordinator replies within the same bot-origin conversation still publish to Telegram without falling back to a run-wide latest-source rule.
- `R-012`: Persisted history loading must be side-effect free with respect to runtime recovery and websocket subscription management.
- `R-013`: Active agent/team liveness and websocket subscription ownership must be driven from a dedicated backend active-runtime source and one explicit frontend subscription manager.
- `R-014`: The backend active-runtime source must be runtime-aware: it must exclude team-member agent runs from the standalone active-agent snapshot and include member-runtime teams in the active-team snapshot.
- `R-015`: Run-history projection, summary, and resume metadata must be owned by a runtime-aware backend history-source boundary rather than by generic local-memory assumptions.
- `R-016`: Frontend history loading and rendering must stay runtime-agnostic and consume only normalized run/team history contracts from the backend.

## Requirement Coverage Map

| Requirement ID | Current Answer / Direction | Evidence |
| --- | --- | --- |
| `R-000` | Dedicated worktree/ticket and draft-to-refined requirements are in place. | `tickets/in-progress/messaging-agent-team-support/workflow-state.md`, `tickets/in-progress/messaging-agent-team-support/requirements.md` |
| `R-001` | The constraint is primarily in web setup policy and GraphQL setup mutation, not the domain model. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-002` | The minimum viable team behavior is definition-bound team setup plus lazy team creation from a persisted launch preset. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-003` | Telegram should expose one external reply stream rather than all member chatter. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-004` | Users should select a team definition directly rather than a pre-existing team run. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-005` | A persisted team launch preset is required because team definitions alone do not contain runtime/model/workspace launch inputs. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-006` | `teamRunId` should remain an internal cache that can be reset on binding changes; only current-process bot-owned active cached runs are reused after restart, not merely reopened history runs. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-007` | Default reply policy should be coordinator-only or entry-node-only. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-008` | Frontend live streams must keep retrying reconnect after repeated failed restart-time closes until the configured retry budget is exhausted. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-009` | Live team member selection must keep the subscribed in-memory team context instead of reopening from persisted projection; only non-live contexts should reopen from history. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-010` | Repeated reasoning bursts in one turn must remain visually distinct; stable reasoning item ids must not be overridden by whole-turn coalescing and fallback turn coalescing must reset across tool or text boundaries. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-011` | TEAM callback routing must stay scoped to turns descended from an externally bound turn by propagating source context across `send_message_to` hops rather than by broadcasting every later coordinator reply to Telegram. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-012` | Persisted history refresh must not own runtime recovery or websocket subscription side effects. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-013` | Active-run liveness and stream subscription ownership should come from a dedicated backend active-runtime source and one frontend subscription manager. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-014` | The backend active-runtime source must be runtime-aware so team-member runs are not surfaced as standalone agents and member-runtime teams are not hidden from the team snapshot. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-015` | Run-history projection and resume semantics should move behind a broader runtime-aware backend history-source boundary. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |
| `R-016` | Frontend history loading should remain runtime-agnostic and consume only normalized backend contracts. | `tickets/in-progress/messaging-agent-team-support/investigation-notes.md` |

## Design-Ready Coverage Matrix

| Requirement ID | Acceptance Criteria IDs | Planned Use Cases |
| --- | --- | --- |
| `R-000` | `AC-001`, `AC-007` | `UC-001`, `UC-004` |
| `R-001` | `AC-001`, `AC-003` | `UC-002`, `UC-007` |
| `R-002` | `AC-003`, `AC-004`, `AC-006` | `UC-006`, `UC-007`, `UC-008` |
| `R-003` | `AC-004` | `UC-003`, `UC-008` |
| `R-004` | `AC-003` | `UC-006`, `UC-007` |
| `R-005` | `AC-003`, `AC-004` | `UC-006`, `UC-008` |
| `R-006` | `AC-004`, `AC-005`, `AC-006` | `UC-008`, `UC-009` |
| `R-007` | `AC-004`, `AC-007`, `AC-008` | `UC-003`, `UC-008`, `UC-009` |
| `R-008` | `AC-009` | `UC-010` |
| `R-009` | `AC-010` | `UC-011` |
| `R-010` | `AC-011` | `UC-012` |
| `R-011` | `AC-012` | `UC-013` |
| `R-012` | `AC-013` | `UC-014` |
| `R-013` | `AC-014`, `AC-015` | `UC-015`, `UC-016` |
| `R-014` | `AC-016`, `AC-017` | `UC-015`, `UC-016` |
| `R-015` | `AC-018`, `AC-019` | `UC-017`, `UC-018` |
| `R-016` | `AC-018`, `AC-019` | `UC-017`, `UC-018` |
