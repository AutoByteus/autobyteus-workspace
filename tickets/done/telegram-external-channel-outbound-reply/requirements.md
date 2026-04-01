# Requirements

## Status

- Current Status: `Design-ready`
- Previous Status: `Design-ready (v1 scope, superseded by Stage 8 re-entry)`

## Goal / Problem Statement

The original Telegram repro exposed a real turn-correlation bug: inbound Telegram messages reached the bound agent run, but the accepted `turnId` was dropped before the reply bridge could bind the inbound receipt. That narrow fix remains valid, but the Stage 8 broader review showed that the external-channel subsystem still has deeper design problems:

- persisted bindings already remember cached run ids, but TEAM continuity is not restored from that durable file state after restart
- inbound message uniqueness is decided by a separate first-seen reservation before the durable receipt owner has recorded enough state, which can permanently drop retries after partial failure
- outbound callback uniqueness is also decided by a separate reservation before durable outbox enqueue, which can permanently suppress replies after partial failure
- callback HTTP failures are not classified into terminal vs retryable categories, so permanent misconfiguration/auth/client errors can retry indefinitely
- successful external dispatch can still be acknowledged even when accepted-turn reply-bridge arming failed, which means ingress can conclude `ROUTED` before reply routing is actually ready

The re-entry design must therefore keep the accepted-turn repair, but broaden the contract so the subsystem follows one coherent durability model:

- bindings remain file-backed only and own cached run ids
- all file-backed external-channel artifacts belong under one top-level `server-data/external-channel/` folder instead of being split across app-data locations
- run continuity is restored from persisted bindings when possible
- inbound message durability is owned by the receipt ledger
- outbound reply durability is owned by the callback outbox
- accepted-turn reply-bridge arming must be part of the successful dispatch contract or be durably recoverable before ingress is acknowledged as routed
- accepted external turns must remain recoverable across server restart until reply publication actually completes; in-memory bridge arming alone is not sufficient
- `turnId` remains the per-turn correlation key for replies

## Scope Classification

- Classification: `Large`
- Rationale:
  - This is no longer just a runtime-adapter fix; it spans run continuity, ingress durability, outbound durability, retry classification, and existing file-only binding cleanup.
  - The redesign affects both primary end-to-end flow and bounded local worker/state ownership.

## In-Scope Use Cases

| use_case_id | Name | Summary |
| --- | --- | --- |
| UC-001 | Agent Binding Restores Cached Run After Restart | A bound AGENT route reuses the persisted `agentRunId` from the binding file when the run can be restored. |
| UC-002 | Team Binding Restores Cached Run After Restart | A bound TEAM route reuses the persisted `teamRunId` from the binding file when the run can be restored. |
| UC-003 | Inbound External Message Is Retry-Safe | A webhook retry for the same external message is not permanently dropped because of an earlier partial failure before durable completion. |
| UC-004 | Accepted Turn Binding For Reply Routing | The runtime backend returns the accepted `turnId`, allowing the reply bridge to bind the inbound receipt to the correct assistant turn. |
| UC-005 | Outbound Reply Is Durably Enqueued Exactly Once | A completed assistant reply produces one durable callback outbox record for the original route, and retries do not lose or duplicate work. |
| UC-006 | Callback Dispatch Distinguishes Terminal And Retryable Failures | Permanent gateway callback errors fail fast, while transient/unavailable failures continue to retry with backoff. |
| UC-007 | File-Only External-Channel Persistence Folder | All file-backed external-channel artifacts live under one top-level `server-data/external-channel/` folder and stale DB binding support remains removed. |
| UC-008 | Successful Dispatch Requires Reply-Bridge Readiness | An accepted external dispatch is not acknowledged as successfully routed unless turn binding and reply completion observation are armed or explicitly recoverable. |
| UC-009 | Accepted Receipt Recovers After Restart Without Inbound Retry | If the server restarts after runtime acceptance but before reply publication, the accepted receipt is reloaded and recovery resumes without reposting the original user message. |

## Out Of Scope / Non-Goals

- No redesign of Telegram/business-API transport semantics beyond the server-side routing and durability model.
- No token-level streaming reply delivery to Telegram; outbound external replies remain turn-level/final-message oriented.
- No requirement to expose raw `agentRunId` / `teamRunId` as a new public gateway contract in this change.
- No compatibility wrapper that keeps separate old and new durability owners active in parallel.

## Requirements

| requirement_id | Requirement | Expected Outcome | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | `ChannelBindingRunLauncher` must treat persisted binding run ids as the durable continuity source for both AGENT and TEAM targets. If the cached run can be restored, the same run id is reused; if restore is impossible, a fresh run is created and persisted back to the binding file. | Restart continuity becomes binding-owned and symmetric across agent/team routes instead of being partially memory-owned. | UC-001, UC-002 |
| R-002 | Inbound external-message uniqueness and retry safety must be owned by the durable receipt ledger rather than a separate first-seen reservation. | A retry after partial failure can resume or complete routing instead of being suppressed as a duplicate with no durable routed result. | UC-003 |
| R-003 | Runtime backends used by external-channel agent dispatch must propagate the accepted `turnId` through `AgentOperationResult`. | The reply bridge receives the real accepted turn id needed for turn-level routing. | UC-004 |
| R-004 | Outbound assistant-reply uniqueness and durability must be owned by the callback outbox keyed by `callbackIdempotencyKey`, not by a separate pre-enqueue callback reservation. | A reply cannot be permanently lost in the gap between duplicate detection and durable enqueue. | UC-005 |
| R-005 | Delivery-event persistence must remain observational/off-spine and must not be a prerequisite for durable outbound work existence. | Missing or late delivery-event writes do not suppress callback enqueue, and later sent/failed updates can still converge by callback key. | UC-005 |
| R-006 | Gateway callback publishing must classify terminal vs retryable failures explicitly so the worker can dead-letter permanent errors and retry transient ones. | Misconfiguration/auth/client errors fail fast; timeouts, gateway unavailability, and retryable server-side failures continue with backoff. | UC-006 |
| R-007 | All file-backed external-channel artifacts must live under one top-level `server-data/external-channel/` folder, and DB-backed binding schema/support must stay removed. | The durable external-channel persistence surface is one file-owned folder and does not regress to dual-path, SQL-backed binding storage, or `memory/persistence` nesting. | UC-007 |
| R-008 | Focused validation must cover restart continuity, retry-safe ingress, turn binding, durable outbound enqueue, callback retry classification, and file-only binding persistence. | Stage 7 can prove the broader durability model rather than only the original Telegram symptom. | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| R-009 | Successful external dispatch must not be acknowledged as `ROUTED` unless accepted-turn reply-bridge arming succeeded or the system has an explicit durable recovery path that guarantees equivalent reply-routing readiness. | Ingress success cannot outrun reply-routing readiness, and bridge-arming failure cannot silently strand a routed receipt without a reply path. | UC-008 |
| R-010 | Accepted receipts must remain durably recoverable across process restart until the assistant reply is actually published to the callback outbox or otherwise resolved terminally. | A restart after runtime acceptance cannot strand the outbound reply or require a second inbound webhook retry to resume the same accepted turn. | UC-009 |

## Acceptance Criteria

| acceptance_criteria_id | Requirement ID(s) | Acceptance Criterion | Expected Measurable Outcome |
| --- | --- | --- | --- |
| AC-001 | R-001 | A bound AGENT route with a persisted `agentRunId` restores that same run after restart when its metadata/runtime state is restorable. | The launcher returns the cached `agentRunId` instead of creating a fresh run. |
| AC-002 | R-001 | A bound TEAM route with a persisted `teamRunId` restores that same run after restart when its metadata/runtime state is restorable. | The launcher returns the cached `teamRunId` instead of creating a fresh team run. |
| AC-003 | R-002 | If inbound handling fails after durable ingress receipt creation but before successful routing completion, a retry for the same external message can complete routing instead of being discarded as a duplicate. | The same external message identity is resumable until it reaches a terminal routed/unbound state. |
| AC-004 | R-003 | A runtime backend used by external-channel dispatch returns a non-null accepted `turnId` for an accepted turn. | The reply bridge receives and persists `turnId` for the corresponding receipt. |
| AC-005 | R-004, R-005 | Publishing the same assistant reply twice with the same callback idempotency key does not create duplicate durable work and does not lose work before enqueue. | The outbox contains one durable record for that callback key, and duplicate calls observe the same durable work item. |
| AC-006 | R-006 | Permanent gateway callback failures are marked non-retryable on first terminal classification, while retryable failures continue through the retry path. | Worker behavior differs by structured failure type rather than by generic `Error`. |
| AC-007 | R-007 | Bindings, receipts, delivery events, and callback outbox files persist under `server-data/external-channel/`, and the supported schema/runtime surface no longer treats `channel_bindings` as active binding storage. | Runtime reads/writes only the top-level external-channel folder and schema/runtime cleanup remains in effect. |
| AC-008 | R-008 | Stage 7 scenarios explicitly cover continuity, ingress durability, turn binding, outbound outbox durability, retry classification, and file-only binding persistence. | The validation plan maps every broadened requirement to at least one executable or runtime-backed scenario. |
| AC-009 | R-009 | If reply-bridge arming fails after runtime acceptance, external ingress does not settle the message as a successful routed dispatch unless a durable equivalent recovery path is established. | A bridge-arming failure cannot leave a terminal `ROUTED` receipt with no guaranteed outbound reply path. |
| AC-010 | R-010 | If the server restarts after runtime acceptance and before reply publication, startup recovery resumes the accepted receipt and either re-arms live observation or publishes the exact persisted reply without reposting the original inbound message. | The accepted receipt survives restart as unfinished work until reply publication completes. |

## Constraints / Dependencies

- Work in the isolated ticket worktree:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/telegram-external-channel-outbound-reply`
- Do not disturb unrelated user changes in the primary worktree.
- Preserve the already-correct turn-level reply-correlation model; restart continuity does not replace `turnId`.
- Reuse existing agent/team restore capabilities instead of inventing a second continuity system.
- Prefer collapsing duplicated invariants onto one durable owner over adding more coordination layers.
- Do not reintroduce DB-backed binding persistence or dual file/DB compatibility behavior.
- Do not split file-backed external-channel artifacts between the app-data root and `memory/persistence`; the external-channel folder is the single file-backed storage surface.
- Do not treat reply-bridge arming failure as a warning-only path if the system still intends to acknowledge successful routed ingress for that accepted message.
- Do not let an in-memory-only watcher be the sole owner of an accepted receipt that still needs outbound reply publication.

## Assumptions

- The binding file remains the authoritative durable owner for cached route-to-run continuity.
- It is acceptable for the receipt subsystem to expand from passive source-context persistence into an ingress lifecycle ledger, because it already owns the external-message identity shape.
- It is acceptable for the callback outbox to become the single durable owner of outbound uniqueness because it already keys records by `callbackIdempotencyKey`.
- Delivery events are secondary observability records and do not need to own work existence.

## Open Questions / Risks

1. Should the receipt ledger treat `UNBOUND` as a terminal disposition for duplicate detection, or should later retries be allowed to re-check newly added bindings for the same external message?
2. What is the cleanest receipt-ledger state shape that preserves retry safety without overfitting one persistence provider?
3. Which exact HTTP status set should be marked terminal in the publisher layer? The current design expectation is “most permanent 4xx, except explicitly retryable cases such as timeout/rate-limit style responses.”
4. Is any future opaque conversation token worth adding later for gateway-side continuity hints, or can the binding file remain the sole continuity authority for now?
5. Should the external ingress HTTP disposition continue reporting `ROUTED` once durable accepted-receipt recovery is registered even if the receipt row itself remains `ACCEPTED` until callback publication?

## Requirement Coverage Map

| requirement_id | Covered By Use Case IDs |
| --- | --- |
| R-001 | UC-001, UC-002 |
| R-002 | UC-003 |
| R-003 | UC-004 |
| R-004 | UC-005 |
| R-005 | UC-005 |
| R-006 | UC-006 |
| R-007 | UC-007 |
| R-008 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006, UC-007 |
| R-009 | UC-008 |
| R-010 | UC-009 |

## Acceptance-Criteria Coverage Map To Stage 7 Scenarios

| acceptance_criteria_id | Planned Stage 7 Scenario IDs |
| --- | --- |
| AC-001 | S-001 |
| AC-002 | S-002 |
| AC-003 | S-003 |
| AC-004 | S-004 |
| AC-005 | S-005 |
| AC-006 | S-006 |
| AC-007 | S-007 |
| AC-008 | S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-008 |
| AC-009 | S-008 |
| AC-010 | S-009 |

## Planned Stage 7 Scenario Index

| scenario_id | Scenario | Maps To AC |
| --- | --- | --- |
| S-001 | Persisted AGENT binding restores the cached `agentRunId` after restart instead of creating a fresh run. | AC-001, AC-008 |
| S-002 | Persisted TEAM binding restores the cached `teamRunId` after restart instead of creating a fresh team run. | AC-002, AC-008 |
| S-003 | An inbound external message can be retried safely after a partial failure before durable routing completion. | AC-003, AC-008 |
| S-004 | External-channel dispatch returns the accepted `turnId` and binds the inbound receipt to that turn. | AC-004, AC-008 |
| S-005 | Publishing the same assistant reply twice produces one durable callback outbox record and does not lose outbound work before enqueue. | AC-005, AC-008 |
| S-006 | Gateway callback dispatch distinguishes terminal vs retryable failures and routes them to dead-letter vs retry behavior correctly. | AC-006, AC-008 |
| S-007 | All file-backed external-channel artifacts persist under one top-level external-channel folder and the supported schema/runtime surface does not regress to DB-backed binding storage. | AC-007, AC-008 |
| S-008 | Successful external dispatch does not conclude `ROUTED` unless accepted-turn reply-bridge arming is guaranteed or durably recoverable. | AC-008, AC-009 |
| S-009 | After a server restart, previously accepted receipts resume reply recovery and publish without reposting the original inbound message. | AC-010 |
