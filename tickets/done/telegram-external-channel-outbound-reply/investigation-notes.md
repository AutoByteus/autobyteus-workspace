# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Large`
- Triage Rationale:
  - The earlier live Telegram repro was real and the accepted-`turnId` loss in the Codex runtime boundary is still a valid defect, but Stage 8 showed that the subsystem has broader ownership gaps beyond that one adapter bug.
  - The re-entry scope now spans three durable-ownership areas: binding-owned run continuity, ingress message durability, and outbound callback durability.
  - The design must stay aligned with the shared design principles: spine-first modeling, one clear owner for each invariant, explicit removal of redundant legacy/duplicate paths, and no new compatibility wrappers.
- Investigation Goal:
  - Reframe the ticket from a narrow outbound Telegram repair into a coherent external-channel architecture update that preserves turn correlation, restores persisted run continuity, and makes ingress/outbound delivery retry-safe.
- Primary Questions To Resolve:
  - Which owner should reuse persisted `agentRunId` / `teamRunId` from the binding file after restart?
  - Which durable owner should decide whether an inbound external message is new, resumable, or already completed?
  - Which durable owner should decide whether an outbound assistant reply has already been enqueued?
  - Where should callback retryability be classified so terminal gateway failures do not loop forever?
  - Which already-completed v1 work remains correct and should be preserved in the broader redesign?
  - Where should the accepted-turn reply-bridge arming boundary sit so ingress cannot report a successful routed result before reply routing is actually ready or recoverable?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts` | Confirm the accepted-turn handoff expected by reply routing. | The facade still depends on `AgentOperationResult.turnId` and binds replies by accepted turn, which remains the correct turn-level correlation design. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Reconfirm the original runtime-boundary bug and whether it is subsystem-wide. | The thread/session layer already produces accepted `turnId`; the backend adapter layer is the correct owner for propagating it into `AgentOperationResult`. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts` | Verify whether the bridge should change for the broader redesign. | The bridge is correctly strict: it binds by real `turnId` and should not invent one. The broader redesign should keep this contract. | No |
| 2026-03-31 | Data | `jq '.' /Users/normy/.autobyteus/server-data/channel-bindings.json` and legacy-path inspection | Confirm whether bindings and cached run ids are already persisted on disk. | The binding file is the durable source for route ownership and cached run ids; the user’s expectation that restart continuity should load from file is valid. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/channel-binding-storage.ts`, `autobyteus-server-ts/src/external-channel/domain/models.ts` | Verify what durable state a binding already owns. | Bindings already persist `agentRunId` / `teamRunId`; run continuity should therefore be binding-owned, not registry-owned. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | Identify why persisted team bindings do not preserve continuity across restart. | Agent bindings attempt `restoreAgentRun(cachedAgentRunId)` even after restart, but team bindings only reuse `teamRunId` when the in-memory registry still owns it. If memory is empty, the launcher skips restore and creates a fresh team run. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`, `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`, `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Verify whether restore support already exists in the runtime subsystems. | Both agent and team runtime services already support restore from persisted metadata/history. The missing piece is consistent launcher ownership, not missing restore capability. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | Inspect the current inbound durability decision point. | Ingress reserves idempotency before binding resolution, dispatch, and durable receipt persistence, which creates a permanent-drop window after partial failure. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | Check whether an existing durable owner already models inbound external-message identity. | The receipt store already keys on `(provider, transport, accountId, peerId, threadId, externalMessageId)` and already persists run ids plus `turnId`; it is the natural durable owner for ingress lifecycle state. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/services/channel-idempotency-service.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-idempotency-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/sql-channel-idempotency-provider.ts` | Determine whether the current ingress idempotency owner is redundant. | The dedicated idempotency store duplicates the same external-message identity already owned by receipts, but with less state and weaker recovery semantics. | Yes |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts` | Inspect current outbound enqueue ownership. | `ReplyCallbackService` currently reserves a callback idempotency key before durable outbox enqueue; the runtime wiring makes the outbox and a second idempotency owner compete for the same invariant. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-service.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts`, `autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts` | Verify which component already owns durable outbound work and which one is observational only. | The outbox already deduplicates on `callbackIdempotencyKey` and is the natural durable owner of outbound reply work; delivery events are status/observability records keyed by the same callback key. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts` | Inspect retry classification ownership. | The worker already owns retry policy, but the publisher does not emit structured retryability, so permanent HTTP failures are treated as transient. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts`, `autobyteus-server-ts/prisma/schema.prisma`, `autobyteus-server-ts/prisma/migrations/*channel_bindings*` | Reconfirm the binding persistence contract and stale DB support. | Runtime binding resolution is file-backed only; Prisma `channel_bindings` remains stale schema baggage and should stay on the removal path. | No |
| 2026-03-31 | Log | `rg -n "accepted turnId is missing|skipping agent reply bridge" /Users/normy/.autobyteus/server-data/logs/server.log` | Preserve the original live repro evidence. | The live repro still proves that turn correlation is turn-level and that the earlier v1 bug fix belongs at the runtime boundary. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts`, `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-team-run-facade.test.ts` | Investigate the Stage 8 round 3 blocker after the v2 implementation. | Both facades still catch reply-bridge arming failures, log warnings, and continue returning a successful dispatch result. The unit tests explicitly codify this behavior. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`, `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`, `autobyteus-server-ts/src/agent-memory/services/team-member-memory-projection-reader.ts` | Check whether a durable accepted-turn recovery path can safely reconstruct the correct reply after bridge-arming failure or restart. | Raw traces preserve `turn_id`, but the generic run projection strips turn identity and only exposes flattened conversation entries. A durable recovery path therefore cannot rely on “latest assistant message in the run”; it needs a turn-scoped persisted reply resolver. | No |
| 2026-03-31 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/domain/agent-operation-result.ts` | Verify whether all external-channel-capable runtimes already satisfy the accepted-turn contract required by direct reply routing. | The AutoByteus backends still return bare accepted results without immediate `turnId`; Codex and Claude now propagate accepted turn metadata. Direct AGENT external-channel routing therefore needs an explicit contract that accepted-turn correlation is mandatory rather than warning-only. | Yes |
| 2026-03-31 | Code | `autobyteus-server-ts/src/app.ts`, `autobyteus-server-ts/src/startup/agent-customization-loader.ts`, `autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`, `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts` | Check whether any existing boot/runtime hook already owns accepted-receipt recovery across restart. | The server only boots the callback-outbox worker today; there is no accepted-receipt recovery runtime. The AutoByteus-only processors duplicate turn-binding/reply-publication concerns, but they do not provide restart-safe ownership for the external-channel reply path. | Yes |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-reply-bridge.ts`
  - `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts`
- Execution boundaries:
  - Binding persistence is already durable and file-backed.
  - Run restoration already exists in agent/team runtime subsystems.
  - Inbound uniqueness and outbound uniqueness are currently decided before the durable owners have recorded enough state.
  - `turnId` remains a turn-level correlation key, not a run-level key.
- Owning subsystems / capability areas:
  - `external-channel`
  - `agent-execution`
  - `agent-team-execution`
  - `run-history`
  - `prisma` schema/migrations

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts` | `resolveOrStartAgentRun()` / `resolveOrStartTeamRun()` | Resolve or create bound runs for external-channel dispatch. | Agent continuity is binding-owned and restart-capable; team continuity is still registry-gated and restart-fragile. | Launcher should own one symmetric restore-or-create policy for both target types. |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts` | `FileChannelBindingProvider` | Durable route binding plus cached run ids. | Bindings already persist the run ids that continuity needs. | Binding file remains the durable source of route-to-run continuity. |
| `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts` | `handleInboundMessage()` | Route inbound external messages. | Current first-seen reservation happens too early and can permanently suppress retries. | Inbound decision ownership should move to the durable receipt ledger path. |
| `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts` | receipt API | Persist source route and turn bindings. | Current shape already owns external-message identity and dispatch target, but not lifecycle/disposition. | Receipt subsystem should expand into an ingress ledger instead of staying a passive append/update store. |
| `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts` | `publishAssistantReplyByTurn()` | Resolve route and enqueue outbound reply work. | Current pre-enqueue callback reservation duplicates the outbox invariant and opens a loss window. | Durable enqueue ownership should move fully to the outbox. |
| `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | outbox record store | Durable callback work queue keyed by callback idempotency key. | Already deduplicates on `callbackIdempotencyKey`; this is the correct durable owner for outbound uniqueness. | Callback idempotency should collapse into the outbox spine. |
| `autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts` | delivery status recorder | Upsert pending/sent/failed callback event rows. | Delivery events are observability/status, not durable work ownership. | Keep off the main-line durability decision path. |
| `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts` | `publish()` | Execute the HTTP callback to the gateway. | Emits only generic `Error`, so the worker cannot distinguish terminal misconfiguration/auth/client failures from retryable failures. | Publisher should own failure classification; worker should own retry policy. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-agent-run-facade.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-team-run-facade.ts` | accepted-turn handoff into the reply bridge | Convert successful runtime acceptance into external-channel routed dispatch. | Reply-bridge arming is still treated as best-effort, so ingress can be marked `ROUTED` even when turn binding or completion subscription was never armed. | The acceptance boundary is still on the wrong side of a required durability step and must move. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`, `autobyteus-server-ts/src/run-history/projection/*` | persisted reply lookup | Resolve a completed assistant reply after restart or after reply-bridge arming failure. | Current projection fallback is run-scoped, not turn-scoped, because `RunProjection` conversation entries do not carry `turnId`. | Recovery design must use a turn-scoped persisted reply resolver instead of a generic “last assistant message” lookup. |
| `autobyteus-server-ts/src/app.ts`, `autobyteus-server-ts/src/startup/agent-customization-loader.ts`, `autobyteus-server-ts/src/agent-customization/processors/persistence/external-channel-turn-receipt-binding-processor.ts`, `autobyteus-server-ts/src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts` | boot/runtime recovery ownership | Restore accepted receipts after server restart and avoid duplicate external-channel reply owners. | The app only starts the gateway callback outbox worker. There is no boot-time accepted-receipt recovery loop, and the AutoByteus-only processors create a second external-channel ownership path that is not shared by Codex/Claude. | The v4 fix needs one runtime-owned accepted-receipt recovery loop and should remove processor-based duplicate ownership where the bridge/runtime path becomes authoritative. |
| `/Users/normy/.autobyteus/server-data`, `autobyteus-server-ts/src/external-channel/providers/file-channel-binding-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`, `autobyteus-server-ts/src/external-channel/providers/file-delivery-event-provider.ts`, `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-outbox-store.ts` | live app storage-surface inspection | Reconcile the running Electron app data layout with the v4 worktree design after the user launched the app. | The running app stores external-channel files under `server-data/memory/persistence/external-channel/`. The v4 worktree already removed DB-backed bindings, but it still splits bindings into a root `channel-bindings.json` and keeps the remaining external-channel files under `memory/persistence/external-channel/`. | The persistence surface should collapse into one top-level `server-data/external-channel/` folder with no compatibility path. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-31 | Probe | Live binding-file inspection under `/Users/normy/.autobyteus/server-data` | The binding file already persists cached run ids. | User expectation about file-owned continuity is already consistent with product state. |
| 2026-03-31 | Probe | Static comparison of `resolveOrStartAgentRun()` vs `resolveOrStartTeamRun()` | Agent restore path exists; team restore path is inconsistent after restart. | The broader fix is not “invent run persistence”; it is “make run continuity ownership consistent.” |
| 2026-03-31 | Probe | Static comparison of ingress idempotency store vs message receipt store | The same inbound identity exists in two durable stores with different semantics. | Collapse the invariant onto one owner instead of preserving parallel representations. |
| 2026-03-31 | Probe | Static comparison of callback idempotency service vs callback outbox store | The same outbound uniqueness invariant exists in two places. | The outbox should become the single durable owner of callback uniqueness. |
| 2026-03-31 | Probe | Static trace of publisher -> worker retry flow | Retry decisions are made without structured failure types. | Failure classification must be explicit at the publisher boundary. |
| 2026-03-31 | Test | `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts` | Validate whether reply-bridge arming failure is treated as fatal or best-effort in the current implementation. | The facade and bridge suites pass, and the facade tests confirm the current contract intentionally continues after bridge-arming failure. | No |

### External Code / Dependency Findings

- Upstream repo / package / sample examined: `None`
- Version / tag / commit / release: `N/A`
- Files, endpoints, or examples examined: `N/A`
- Relevant behavior, contract, or constraint learned: `N/A`
- Confidence and freshness: `N/A`

## Constraints

- Technical constraints:
  - `turnId` remains mandatory for outbound turn correlation. Run continuity does not replace turn correlation.
  - Bindings remain file-backed only and continue to persist cached run ids at the root app-data level.
  - Retry safety should be achieved by durable owner changes, not by adding new wrapper retries around already-fragile pre-reservation logic.
- Environment constraints:
  - The product can run with file-backed or SQL-backed receipt/delivery-event providers, so ingress-ledger changes must work with both provider families.
  - Existing run restore capabilities should be reused instead of replaced.
- Third-party / API constraints:
  - Gateway callback delivery is asynchronous and HTTP-based, so terminal-vs-retryable classification must remain explicit.

## Unknowns / Open Questions

- Unknown:
  - Whether future gateway contracts should also carry an opaque server-issued conversation token in addition to route identity.
- Why it matters:
  - It could improve future continuity hints, but it is not required to fix the current restart/durability ownership problems.
- Planned follow-up:
  - Keep tokenized gateway continuity as follow-up scope, not as a blocker for this re-entry design.

## Implications

### Requirements Implications

- Requirements should expand beyond the narrow Codex outbound defect and explicitly cover:
  - binding-owned run continuity across restart for both AGENT and TEAM targets
  - durable inbound message lifecycle ownership
  - durable outbound callback ownership
  - structured callback retry classification
  - preservation of turn-level reply correlation
  - file-only binding persistence and SQL binding cleanup

### Design Implications

- The clean design should:
  - keep the accepted-`turnId` repair and reply-bridge contract
  - keep the external-channel folder as one top-level file-backed owner surface, with bindings remaining the durable owner of cached run ids inside that folder
  - make `ChannelBindingRunLauncher` the single continuity policy owner for both agent and team bindings
  - move ingress uniqueness/durability ownership into the receipt subsystem instead of a separate first-seen key store
  - move outbound uniqueness/durability ownership into the callback outbox instead of a second reservation service
  - move accepted-turn binding into the receipt ledger immediately after runtime acceptance so the bridge no longer owns receipt persistence
  - add a boot-time accepted-receipt recovery runtime so an accepted receipt remains recoverable after server restart without waiting for another inbound retry
  - keep the receipt in `ACCEPTED` until the callback path has actually published durable outbound work, rather than treating in-memory bridge arming as a terminal receipt state
  - move the external dispatch success boundary so accepted-turn reply recovery is durably registered before ingress can conclude with a successful routed result
  - use turn-scoped persisted reply recovery for accepted-turn catch-up instead of a generic run-level projection fallback
  - keep delivery events as observability, not as the durable source of truth for work existence
  - let the publisher classify retryability and the worker apply retry policy
  - remove AutoByteus-only external-channel processor duplication once the unified receipt-recovery path owns turn binding and reply publication across runtimes
  - remove the split persistence surface between a root binding file and `memory/persistence/external-channel`; all file-backed external-channel state belongs under `server-data/external-channel/`

### Implementation / Placement Implications

- Likely implementation files after Stage 5:
  - `autobyteus-server-ts/src/external-channel/runtime/channel-binding-run-launcher.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-ingress-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`
  - `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts`
  - `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts`
  - `autobyteus-server-ts/src/external-channel/services/reply-callback-service.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-delivery-runtime.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-publisher.ts`
  - `autobyteus-server-ts/src/external-channel/runtime/gateway-callback-dispatch-worker.ts`
- Candidate removals/decommissions if Stage 3 confirms the ownership shift:
  - dedicated ingress idempotency flow from `ChannelIngressService`
  - dedicated callback idempotency flow from `ReplyCallbackService`
  - stale SQL `channel_bindings` schema/model support

## Re-Entry Additions

### 2026-03-31 Re-Entry Update

- Trigger:
  - Stage 8 broader subsystem review failed with design-impact findings, and the user explicitly asked to continue on the workflow re-entry path using the design principles and common design best practices.
- User-design input accepted into investigation:
  - Persisted binding files should own cached run ids, and restart continuity should load from that durable file state instead of depending on memory.
- Investigation conclusion:
  - The user’s continuity intuition is correct.
  - The current system already proves that idea for AGENT bindings, but TEAM bindings, ingress durability, and outbound durability are still inconsistent and need one broader redesign pass.

### 2026-03-31 Re-Entry Update (Round 3)

- Trigger:
  - Stage 8 review round 3 failed after the v2 implementation landed.
- New finding captured in investigation:
  - The subsystem still allows `ChannelAgentRunFacade` and `ChannelTeamRunFacade` to acknowledge successful external dispatch after runtime acceptance even when reply-bridge arming failed.
  - This leaves the receipt ledger with a terminal `ROUTED` record while the accepted turn might never receive turn binding or completion monitoring for outbound callback publication.
- Investigation conclusion:
  - The remaining problem is no longer about duplicate durable owners.
  - The remaining problem is the acceptance boundary itself: successful external dispatch still outruns reply-routing readiness.

### 2026-03-31 Re-Entry Update (Round 4)

- Trigger:
  - Stage 6 analysis on the v3 implementation plan found that the design still lets the receipt become terminal after only in-memory reply observation is armed.
- New finding captured in investigation:
  - If the server restarts after that in-memory watcher is armed but before the assistant reply is published, no boot-time owner reloads the accepted work, so the reply can still be stranded without a new inbound retry.
  - The existing AutoByteus-only processors are not a valid durable owner for the subsystem because Codex and Claude do not use them, and the app does not boot any shared accepted-receipt recovery runtime.
- Investigation conclusion:
  - The requirement gap is now explicit: accepted external turns must remain durably recoverable across restart until reply publication completes.
  - The v4 design therefore needs one shared accepted-receipt recovery runtime, receipt-terminal semantics tied to actual reply publication, and removal of duplicate processor-owned external-channel reply state where the shared runtime path takes over.

### 2026-03-31 Re-Entry Update (Round 5)

- Trigger:
  - Live app verification showed that the current running Electron build still stores external-channel files under `server-data/memory/persistence/external-channel/`, and the user explicitly requested one top-level external-channel folder directly under the server-data root.
- New finding captured in investigation:
  - The broader durability model is sound, but the file-backed persistence surface is still mechanically split across two app-data locations in the worktree design: a root binding file plus a nested `memory/persistence/external-channel/` folder for the rest.
  - That split weakens ownership clarity and does not match the user-visible storage mental model.
- Investigation conclusion:
  - The file-backed external-channel surface should be one explicit folder owner: `server-data/external-channel/`.
  - The implementation should move bindings, receipts, delivery events, and callback outbox files into that one folder with no compatibility shim or legacy path support.
