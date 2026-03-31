# Proposed Design Document

## Design Version

- Current Version: `v5`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Propagate accepted turn ids from runtime backends, move binding persistence to a root-level file with one-time legacy file migration, and remove stale SQL binding schema support. | 1 |
| v2 | Stage 8 design-impact re-entry | Preserve the accepted-turn repair, but redesign the subsystem around three durable owners: binding-owned run continuity, receipt-owned ingress lifecycle, and outbox-owned outbound reply durability. Also remove redundant ingress/callback idempotency owners and add structured callback retry classification. | 2 |
| v3 | Stage 8 design-impact re-entry (round 3) | Move accepted-turn binding into the receipt ledger, add an explicit `ACCEPTED` receipt state, split runtime acceptance from reply-routing readiness, and require turn-scoped persisted reply recovery before `ROUTED` can be acknowledged. | Pending |
| v4 | Stage 6 requirement-gap re-entry | Keep the receipt-owned accepted state, but make restart safety explicit: accepted receipts remain unfinished until reply publication completes, a boot-time accepted-receipt recovery runtime owns restart catch-up, and AutoByteus-only processor duplication is removed from the external-channel spine. | Pending |
| v5 | Live app storage-surface refinement | Preserve the v4 durability model, but collapse every file-backed external-channel artifact into one top-level `server-data/external-channel/` folder instead of splitting state between the app-data root and `memory/persistence`. | Pending |

## Artifact Basis

- Investigation Notes: `tickets/done/telegram-external-channel-outbound-reply/investigation-notes.md`
- Requirements: `tickets/done/telegram-external-channel-outbound-reply/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

Keep the v2/v3 durable-owner model, but finish the storage boundary correctly as well:

- one top-level `server-data/external-channel/` folder owns the file-backed external-channel storage surface
- the binding file inside that folder still owns cached route-to-run continuity
- the receipt ledger owns inbound identity, lifecycle, and accepted-turn metadata
- a new accepted-receipt recovery runtime owns unfinished accepted receipts across process lifetime and process restart
- the reply bridges own only live observation and hand completed replies into the callback path
- the callback outbox still owns outbound reply durability and uniqueness

The key v4 change is that an accepted receipt is no longer considered finished just because an in-memory watcher was armed. The accepted receipt remains durable unfinished work until reply publication completes:

1. runtime accepts the user input and returns accepted metadata
2. ingress persists that metadata in the receipt ledger as `ACCEPTED`
3. ingress registers the accepted receipt with the recovery runtime, which survives restart by reloading `ACCEPTED` receipts from disk on boot
4. the recovery runtime either publishes the exact persisted turn reply or re-arms live observation
5. only reply publication (or another explicit terminal resolution) moves the receipt to terminal `ROUTED`

This closes the restart-after-arming gap without reposting the user message.

## Goal / Intended Change

- Preserve turn-level external reply routing by keeping accepted `turnId` correlation.
- Keep file-backed binding-owned continuity for both AGENT and TEAM routes inside one top-level external-channel folder.
- Keep inbound retry safety in the receipt ledger and outbound durability in the callback outbox.
- Move accepted-turn persistence into the receipt ledger immediately after runtime acceptance.
- Add one shared accepted-receipt recovery runtime that reloads unfinished accepted receipts on process boot.
- Keep `ACCEPTED` as the durable outstanding state until reply publication completes.
- Make `ROUTED` mean `durable outbound reply work exists or the accepted receipt is otherwise terminally resolved`, not merely `runtime accepted the input` or `an in-memory watcher was armed`.
- Require turn-scoped persisted reply recovery instead of generic run-level “last assistant message” fallback.
- Remove processor-based duplicate external-channel turn binding / reply publication ownership once the shared receipt-recovery path becomes authoritative.
- Keep all file-backed external-channel artifacts under `server-data/external-channel/` and keep stale DB binding support removed.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - do not keep separate ingress/callback idempotency owners alongside receipt/outbox durability
  - do not keep best-effort reply-bridge arming after runtime acceptance
  - do not keep receipt turn binding inside the reply bridges
  - do not let `ACCEPTED -> ROUTED` depend only on an in-memory watcher
  - do not keep projection-only run-level fallback for accepted-turn recovery where turn identity matters
  - do not keep AutoByteus-only external-channel processor ownership in parallel with the shared external-channel runtime path
  - do not keep DB-backed `channel_bindings`
  - do not split file-backed external-channel artifacts between multiple app-data roots
- Gate rule: design fails if any durable identity still has parallel owners or if `ROUTED` can still be reached before reply readiness is established.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Binding-owned run ids must drive continuity for AGENT and TEAM routes. | AC-001, AC-002 | Cached `agentRunId` / `teamRunId` is restored when possible, otherwise replaced by a fresh persisted run id. | UC-001, UC-002 |
| R-002 | Inbound message lifecycle must be receipt-ledger owned instead of first-seen-reservation owned. | AC-003 | Retries can resume incomplete work until the receipt reaches a terminal state. | UC-003 |
| R-003 | Runtime backends used by external-channel agent dispatch must propagate accepted `turnId`. | AC-004 | Direct AGENT reply routing receives real accepted turn identity. | UC-004 |
| R-004 | Outbound reply durability must be outbox-owned instead of reservation-owned. | AC-005 | One durable outbox record exists per callback key and retries do not lose work. | UC-005 |
| R-005 | Delivery events must remain observational. | AC-005 | Missing pending-event writes do not suppress durable enqueue. | UC-005 |
| R-006 | Callback failures must be classified into terminal vs retryable. | AC-006 | Worker dead-letters permanent failures and retries transient ones. | UC-006 |
| R-007 | All file-backed external-channel artifacts remain under one top-level folder and stale DB binding support remains removed. | AC-007 | External-channel persistence stays folder-owned and file-only. | UC-007 |
| R-008 | Validation must cover the broadened continuity and durability model. | AC-008 | Stage 7 scenarios cover all broadened requirements. | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007, UC-008 |
| R-009 | Successful external dispatch must not be acknowledged as `ROUTED` unless reply routing is armed or durably recovered from accepted metadata without reposting the message. | AC-009 | Bridge-arming failure cannot strand a terminal routed receipt with no reply path. | UC-008 |
| R-010 | Accepted receipts must remain durably recoverable across restart until reply publication completes. | AC-010 | Restart after acceptance cannot strand an accepted turn or require reposting the original inbound message. | UC-009 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | The current main line still ends too early: runtime acceptance can be treated as successful routing even if reply observation never armed, and a later restart still drops that in-memory observation. | `channel-ingress-service.ts`, `channel-agent-run-facade.ts`, `channel-team-run-facade.ts`, `app.ts` | None that block the v4 direction. |
| Current Ownership Boundaries | Receipts already own inbound identity; reply bridges currently mix reply observation with receipt turn binding; outbox already owns outbound uniqueness; no shared runtime owns unfinished accepted receipts across restart. | `channel-message-receipt-service.ts`, `channel-agent-run-reply-bridge.ts`, `channel-team-run-reply-bridge.ts`, `gateway-callback-outbox-store.ts`, `app.ts` | Exact accepted metadata shape to persist for team recovery. |
| Current Coupling / Fragmentation Problems | The same accepted-turn handoff both mutates receipt state and tries to arm live observation, so failure leaves no durable resume point before `ROUTED`. AutoByteus-only processors also create a second reply path that is not shared by Codex/Claude. | `channel-agent-run-facade.ts`, `channel-team-run-facade.ts`, `channel-agent-run-reply-bridge.ts`, `agent-customization-loader.ts` | Whether any team route needs more than `teamRunId + member hints + optional turnId` for deterministic recovery. |
| Existing Constraints / Compatibility Facts | Raw traces carry `turn_id`, but generic run projections do not; direct AGENT reply routing therefore needs accepted `turnId` and persisted turn-scoped recovery. | `agent-memory-service.ts`, `run-projection-types.ts`, `autobyteus-agent-run-backend.ts`, `agent-operation-result.ts` | How much of the turn-scoped resolver can be shared between direct-agent and team-member runs. |
| Relevant Files / Components | v4 lives inside the existing external-channel, run-history, and agent-memory capability areas; no new top-level subsystem is required. | investigation notes source log | Final schema delta details remain implementation-stage work. |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | inbound external envelope | receipt reaches terminal `ROUTED` or `UNBOUND` | `ChannelIngressService` orchestrating around `ChannelMessageReceiptService` | This is the inbound contract boundary. Runtime acceptance is no longer enough; unfinished accepted work stays durable until reply publication completes. |
| DS-002 | Bounded Local | persisted binding with cached run id | active/restored run id returned or replacement persisted | `ChannelBindingRunLauncher` | This remains the continuity spine for both AGENT and TEAM. |
| DS-003 | Return-Event | accepted dispatch metadata persisted as `ACCEPTED` | accepted receipt is registered, resumed after restart, and eventually published or terminally resolved | accepted-receipt recovery runtime plus turn-scoped persisted reply resolver | This is the v4 accepted-work spine. It survives process restart and keeps `ACCEPTED` durable until publication. |
| DS-004 | Return-Event | assistant reply publication request | callback outbox durably owns one reply work item | `ReplyCallbackService` serving `GatewayCallbackOutboxService` | Outbound durability remains outbox-owned. |
| DS-005 | Bounded Local | leased callback outbox record | sent / retry / dead-letter state written back | `GatewayCallbackDispatchWorker` | This bounded worker spine still owns delivery retry policy. |
| DS-006 | Bounded Local | process boot | accepted receipts reloaded into live recovery ownership | accepted-receipt recovery runtime | Startup recovery is now part of the main correctness story, not an afterthought. |
| DS-007 | Bounded Local | binding/receipt/schema bootstrap | top-level external-channel folder and cleaned schema surface selected | persistence owners | The external-channel file-backed surface must be one explicit owner directory under server-data. |

## Target Spine Arrow Chains

- DS-001:
  - `inbound envelope -> thread lock -> receipt begin/resume -> binding resolve -> dispatch lease -> runtime accepted dispatch -> receipt ACCEPTED -> accepted-receipt recovery registration -> receipt ROUTED/UNBOUND later`
- DS-002:
  - `binding lookup -> cached run id -> active check or restore -> fresh-create fallback -> binding file update`
- DS-003:
  - `accepted receipt -> recovery runtime register/reload -> live bridge arm or turn-scoped persisted reply recovery -> reply callback service -> outbox enqueue -> receipt ROUTED`
- DS-004:
  - `reply publish request -> source lookup by (agentRunId, turnId) -> binding validation -> outbox enqueue -> optional delivery-event pending write`
- DS-005:
  - `leased outbox record -> HTTP callback publish -> classify result -> mark sent or retry or dead-letter`
- DS-006:
  - `process boot -> list ACCEPTED receipts -> recovery runtime register accepted receipt -> bridge arm or persisted reply recovery`
- DS-007:
  - `process bootstrap -> external-channel storage dir resolve -> bindings/receipts/delivery-events/outbox file paths resolve -> cleaned schema surface selected`

## Ownership Map

| Node / Concern | Owns | Why This Owner Is Correct |
| --- | --- | --- |
| Top-level external-channel folder + file providers | file-backed external-channel storage surface (`bindings.json`, `message-receipts.json`, `delivery-events.json`, `gateway-callback-outbox.json`) | One explicit folder under server-data is the clean ownership boundary for file-backed external-channel state and matches the user-visible persistence model. |
| `bindings.json` + `FileChannelBindingProvider` | route-to-target binding record and cached `agentRunId` / `teamRunId` | The binding file already persists continuity state and remains the durable source for restart continuity inside the external-channel folder. |
| `ChannelBindingRunLauncher` | continuity policy (`reuse active -> restore cached -> create replacement`) | Continuity is a runtime-launch policy, not a provider or registry concern. |
| `ChannelMessageReceiptService` + receipt providers | inbound external-message identity, lifecycle state, accepted-turn metadata, dispatch lease invariants | The receipt ledger is the natural durable owner of the inbound message and its accepted dispatch. |
| `ChannelRunFacade` + per-target facades | runtime dispatch translation and accepted-dispatch result shaping | Posting to AGENT vs TEAM already varies here, and accepted metadata comes from that boundary. |
| Accepted-receipt recovery runtime | live ownership of unfinished accepted receipts, startup reload, immediate recovery attempts, and bridge registration | This is the missing shared owner that turns a persisted accepted receipt into restart-safe in-process work. |
| Agent/team reply bridges | live event subscription and final reply publication trigger from accepted metadata | These classes already own streaming observation and should stay focused on reply observation, not receipt persistence or boot recovery. |
| Turn-scoped persisted reply resolver under existing memory/history capability | exact assistant reply lookup for `(runId, turnId)` or `(teamRunId, memberRunId, turnId)` | Turn-scoped recovery belongs where raw traces and projections already live, not in external-channel ad hoc helpers. |
| `ReplyCallbackService` | route validation and durable callback enqueue | It already owns the outbound envelope build and outbox handoff. |
| `GatewayCallbackPublisher` + worker | HTTP publish boundary and retry classification application | Publisher sees concrete transport failures; worker owns retry/dead-letter policy. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Frontend live-message mirroring | run facade / ingress | Publish inbound user content to the UI | Yes |
| Run metadata refresh | continuity owner | Keep restored/created run metadata current | Yes |
| Delivery-event upserts | reply/outbox owners | Observability keyed by callback idempotency key | Yes |
| Turn-scoped reply parsing from raw traces | reply-readiness owner | Recover final assistant reply without live events | No |
| Immediate in-process recovery nudges from ingress | accepted-receipt recovery runtime | Reduce latency before the periodic/startup recovery path runs | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Run restore behavior | agent/team runtime services | Reuse | Restore support already exists. | N/A |
| Accepted dispatch durability | message receipt providers | Extend | Receipt rows already own the inbound identity and dispatch target. | N/A |
| Accepted receipt restart recovery | external-channel runtime | Extend | The runtime layer already owns long-lived delivery workers and is the correct place for a shared accepted-receipt recovery loop. | N/A |
| Live reply observation | existing reply bridges | Extend | The bridges already subscribe to AGENT/TEAM runtime events. | N/A |
| Persisted turn-scoped reply recovery | agent-memory / run-history | Extend | Raw traces and member projections already live there. | N/A |
| Outbound durable uniqueness | callback outbox store | Reuse | The outbox already deduplicates by callback key. | N/A |
| Failure classification | gateway callback publisher | Extend | HTTP response classification belongs at the publisher boundary. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `external-channel/runtime` | continuity orchestration, runtime accepted-dispatch translation, accepted-receipt recovery, live reply observation | DS-001, DS-002, DS-003, DS-005, DS-006 | ingress and reply-recovery owners | Extend | Keep flat within the existing subsystem. |
| `external-channel/services` | receipt-ledger subject API, binding subject API, reply enqueue subject API | DS-001, DS-003, DS-004 | durable subject owners | Extend | Subject APIs stay explicit. |
| `external-channel/providers` | top-level external-channel file-path resolution, binding file, receipt persistence, delivery-event persistence | DS-001, DS-007 | durable storage owners | Extend | No new provider family. |
| `agent-memory` / `run-history` | turn-scoped persisted reply lookup | DS-003 | reply-readiness owner | Extend | Use existing raw trace and team-member memory surfaces. |
| `prisma` | receipt schema truth and stale-table removal | DS-007 | schema truth | Extend | Add accepted-state metadata and keep obsolete tables removed. |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `ChannelIngressService -> ChannelMessageReceiptService`
  - `ChannelIngressService -> ChannelBindingService -> ChannelBindingRunLauncher`
  - `ChannelIngressService -> ChannelRunFacade`
  - `ChannelIngressService -> AcceptedReceiptRecoveryRuntime`
  - accepted-receipt recovery runtime -> per-target reply bridges
  - reply bridge -> turn-scoped persisted reply resolver
  - `ReplyCallbackService -> ChannelMessageReceiptService`
  - `ReplyCallbackService -> GatewayCallbackOutboxService`
  - worker -> publisher
  - publisher -> HTTP boundary only
  - binding provider -> storage helpers
- Forbidden shortcuts:
  - marking a receipt `ROUTED` before accepted metadata is durably persisted and outbound reply publication actually succeeds
  - reply bridges writing accepted-turn metadata into the receipt ledger
  - ingress retry reposting the user message when the receipt is already `ACCEPTED`
  - recovery path using generic run-level “last assistant message” lookup for a multi-turn accepted receipt
  - direct AGENT external dispatch accepting a runtime result that still lacks required `turnId`
  - relying on AutoByteus-only external-channel processors as a second source of turn-binding/reply-publication truth

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Modify` the existing receipt-ledger API, run facades, reply bridges, and memory/history query surface; `Add` one accepted-receipt recovery runtime; `Remove` the old receipt-binding-in-bridge and processor-owned duplicate behavior.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - Complexity decreases because one shared runtime owns accepted-receipt recovery instead of scattering reply readiness between ingress, bridges, and AutoByteus-only processors.
  - Testability improves because restart-after-accept scenarios become explicit and can be exercised without duplicate posting.
  - Operability improves because `ACCEPTED` remains a visible non-terminal state until reply publication is real, not merely armed in memory.
  - Evolution cost decreases because the exact-turn recovery path becomes explicit rather than depending on incidental live timing or runtime-specific processors.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Modify`, `Split`, `Remove`

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Accepted-turn persistence and live observation are currently bundled in bridge calls from both facades. | Split receipt ownership from bridge ownership |
| Responsibility overload exists in one file or one optional module grouping | Yes | Reply bridges currently own both receipt mutation and live streaming concerns. | Remove receipt binding from the bridges |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Receipt `ACCEPTED` state, accepted-receipt recovery runtime, and reply publication each own distinct invariants. | Keep the split explicit |
| Every off-spine concern has a clear owner on the spine | Yes | UI streaming, delivery events, migration, and persisted reply lookup each serve a named owner | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | raw traces, projections, restore services, outbox, and receipt providers already exist | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | accepted-dispatch result shape and turn-scoped reply lookup become explicit owned boundaries | Keep subject-local |
| Current structure can remain unchanged without spine/ownership degradation | No | warning-only bridge arming still leaves `ROUTED` on the wrong side of reply readiness | Change |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/external-channel/domain/models.ts` | same | Add explicit `ACCEPTED` receipt lifecycle state and tighten accepted-dispatch metadata shape. | receipt ledger | Keep the identity explicit, not generic |
| C-002 | Modify | `autobyteus-server-ts/src/external-channel/runtime/channel-run-dispatch-result.ts` | same or renamed accepted-dispatch type file | Replace the bare run-id result with accepted-dispatch variants that carry the metadata required for recovery. | runtime dispatch boundary | Prefer explicit agent/team variants |
| C-003 | Modify | `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts` and receipt providers | same | Persist accepted metadata as `ACCEPTED`, expose listing/query helpers for unfinished accepted receipts, and mark terminal `ROUTED` only when publication completes. | receipt ledger | Receipt owns accepted-turn durability now |
| C-004 | Add | `autobyteus-server-ts/src/external-channel/runtime/*` | new accepted-receipt recovery runtime file(s) under the same subsystem | Reload unfinished accepted receipts on process boot, register live observation, and retry persisted reply recovery. | accepted-work runtime ownership | No new top-level subsystem |
| C-005 | Modify | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | same | Persist accepted work, register it with the recovery runtime, and stop treating bridge arming as the terminal boundary. | ingress | Receipt may remain `ACCEPTED` after the HTTP response |
| C-006 | Modify | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `channel-team-run-facade.ts`, `channel-run-facade.ts` | same | Return accepted-dispatch metadata first and let the recovery runtime own unfinished accepted work. | runtime dispatch boundary | No best-effort bridge ownership in facades |
| C-007 | Modify | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`, `channel-team-run-reply-bridge.ts` | same | Remove receipt binding, support recovery-runtime registration, and keep bridges focused on live observation/publish. | live reply observation | Bridge stays focused on observation/publish |
| C-008 | Modify | `autobyteus-server-ts/src/agent-memory/services/*`, `autobyteus-server-ts/src/run-history/*` | same | Add turn-scoped persisted reply lookup keyed by accepted metadata. | persisted recovery | Reuse raw traces and team-member memory |
| C-009 | Modify | `autobyteus-server-ts/src/agent-execution/backends/*` and team backends where needed | same | Keep direct AGENT accepted-turn contract explicit and reject unsupported direct-agent reply routing if `turnId` is unavailable. | runtime boundary | Aligns with R-003 |
| C-010 | Modify | `autobyteus-server-ts/src/startup/agent-customization-loader.ts`, external-channel processor files | same or removed | Remove duplicate AutoByteus-only external-channel processor ownership once the shared runtime path is authoritative. | duplicate ownership cleanup | Keep processor removal explicit |
| C-011 | Keep/Modify | v2 outbox/publisher/worker files | same | Preserve v2 outbox ownership and callback retry classification. | outbound durability | No new queue needed |

## Concrete Example

Good shape:

```text
Telegram inbound E1
-> receipt PENDING
-> runtime accepts direct-agent turn { agentRunId=A1, turnId=T1 }
-> receipt ACCEPTED(agentRunId=A1, turnId=T1)
-> accepted-receipt recovery runtime registers E1
-> process restarts before assistant completion
-> app boot reloads ACCEPTED receipts and re-registers E1
-> reply recovery resumes:
   - if turn T1 is already complete in persisted traces, publish exact T1 reply
   - else restore/lookup run A1 and arm live bridge for T1 again
-> receipt ROUTED
```

Bad shape:

```text
Telegram inbound E1
-> runtime accepts turn T1
-> bridge arming throws
-> log warning
-> receipt ROUTED anyway
-> later retry is treated as duplicate
-> no durable path remains to publish the reply
```

## Migration / Refactor Sequence

1. Tighten the accepted-dispatch contract and receipt model (`ACCEPTED` plus required metadata).
2. Move accepted-turn persistence out of the reply bridges and into the receipt service/provider layer.
3. Add the accepted-receipt recovery runtime and boot-time reload path.
4. Add turn-scoped persisted reply lookup under the existing memory/history capability area.
5. Remove processor-owned duplicate external-channel reply ownership once the shared recovery path is authoritative.
6. Update facade/bridge/runtime tests to make restart recovery and bridge failure resumable instead of warning-only.
7. Re-run Stage 7 and Stage 8 on the v4 scope.

## Final File Responsibility Mapping

| File / Area | Responsibility In v4 | Why Here |
| --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | inbound orchestration and receipt-state transitions | This is the end-to-end ingress owner |
| `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts` | accepted-turn durability and ingress lifecycle API | Receipt subject owner |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-facade.ts` | target-type routing for runtime dispatch and recovery-runtime handoff | Runtime adaptation boundary |
| `autobyteus-server-ts/src/external-channel/runtime/*accepted*` | shared accepted-receipt recovery and boot reload | One owner for unfinished accepted work |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | direct-agent accepted-dispatch translation | AGENT-specific runtime boundary |
| `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | team accepted-dispatch translation | TEAM-specific runtime boundary |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts` | direct-agent live observation and accepted-turn resume | AGENT reply observation owner |
| `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-reply-bridge.ts` | team-member live observation and accepted-turn resume | TEAM reply observation owner |
| `autobyteus-server-ts/src/agent-memory/services/*` / `autobyteus-server-ts/src/run-history/*` | turn-scoped persisted reply lookup | Existing owner of raw traces and projections |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | validated outbound enqueue | Outbound reply owner |
| `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts` | structured HTTP failure classification | Delivery boundary owner |
