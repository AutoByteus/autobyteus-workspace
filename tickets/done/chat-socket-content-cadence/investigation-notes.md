# Investigation Notes

## Investigation Meta

- Package identifier: `chat-socket-content-cadence` (Project Task autobyteus-139)
- Request / ticket: one content cadence for every chat socket (verify first, then fix); follow-up of PB-001 (autobyteus-86)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-socket-content-cadence`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/chat-socket-content-cadence`
- Resolved base remote / branch / revision: `origin/personal` @ `f3124db10fb0448e72c01be20920930670bac277` (fetched 2026-10-18; includes the PB-001 fix)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` exit 0
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-18, this conversation): `references/requirements-engineering.md`, `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-server-ts/docs/modules/agent_streaming.md`, `tickets/done/runtime-streaming-performance-followup/requirements.md` (origin of the cadence)
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: Task autobyteus-139 from `/project_task_manager`. Verify on current `origin/personal`; if valid, give every chat socket the same egress and cadence with unchanged ordering rules; one cadence integration case per socket; update the stale docs (FU-003); real-app check with a Team, an Org and a delegated-agent chat; beta; user's check.
- Decision already made: DEC-004 of PB-001. Every chat surface follows "Live response streaming". Made by the Solution Designer under the user's explicit delegation ("I trust that you can make a reasonable decision for me", 2026-10-18).
- Initial ambiguity: whether "the same egress" can be applied as is. It cannot (see the sequence contract below).

## Product And Domain Understanding

- Origin and purpose of the cadence (`runtime-streaming-performance-followup`, 2026-08-06): severe renderer slowdown during streaming (renderer up to 85.8% CPU while the backend was below 1%; 17,439 content messages at 31/s in one run). The user confirmed that "timed batching belongs solely to configurable server WebSocket egress". The ticket explicitly covered standalone **and Team** streaming, including background members (BEH-004, UC-002, FR-003, AC-003). The client-side timer was removed in that ticket.
- Chat sockets today:
  - `/ws/agent/:runId`: standalone Agent's own chat (web `AgentStreamingService`).
  - `/ws/agent-team/:teamRunId`: Agent Team (web `TeamStreamingService`).
  - `/ws/agent-org/:orgRunId`: Agent Organization (web `agentOrgStreamingService`).
  - `/ws/agent-collaboration/:hostRunId`: delegated task agents of a standalone run (web `AgentRunCollaborationStreamingService`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 | Code | `src/api/websocket/agent.ts` L39, L100, L161, L182 | Endpoints | 4 chat sockets | — |
| 2026-10-18 | Code | `agent-org-stream-handler.ts` L49-101; `agent-collaboration-stream-handler.ts` L69-106 | Egress | Every message is sent with `connection.send` directly; no `AgentStreamWebSocketEgress` | — |
| 2026-10-18 | Code | `agent-team-stream-handler.ts` L73 | Egress | Uses the shared egress | — |
| 2026-10-18 | Code/Contract | `stream-content-coalescing.ts` L10-18; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts` L13-26; `agent-presentation-message-dtos.ts` L92 | Team coalescing | Coalescer requires `payload.id`; team content has `segment_id`, plus `change_sequence` and `agent_run_id`. Even with `id`, `change_sequence` differs per frame, so "all fields except delta equal" never holds | — |
| 2026-10-18 | Contract | `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` L203-223 | Org/collab wire | `ROOT_EXECUTION_EVENT {root_subject_kind, root_run_id, change_sequence, event}`; `event.kind = agent_presentation` carries the presentation message | — |
| 2026-10-18 | Code | web `agentOrgExecutionContext.ts` L206-211; `agentRunCollaborationContext.ts` L123-127; `teamExecutionViewState.ts` L359-360, L425-427; `TeamStreamingService.ts` L329; `teamRunContextHydrationService.ts` L351-357 | Client sequence contract | **Every client requires a gap-free `change_sequence`** (next = previous + 1). A gap means reopen/reject. The Team client also compares the socket snapshot base with the GraphQL inspection base | Coalescing must not create gaps |
| 2026-10-18 | Code | `agent-collaboration/execution/services/root-event-publisher.ts` | Sequence owner | One synchronous per-root publisher assigns `changeSequence` to every root event and owns the snapshot barrier (`openSnapshotConnection`: base sequence + queued events) | — |
| 2026-10-18 | Code | `grep subscribeToEvents/openPackageSnapshotConnection` | Root subscribers | Besides the sockets, root events feed applications (`application-agent-stream-runtime-source.ts` L39, Team roots), the Team lifecycle observer (`team-run-service.ts` L227) and manager inspections (`agent-org-run-manager.ts` L184, `standalone-agent-run-root-manager.ts` L227) | The cadence must not sit before the root publisher (it would delay application output, which the protocol doc forbids) |
| 2026-10-18 | Code | `lifecycle-status-event-transformer.ts` L50-52; `collaboration-agent-presentation-adapter.ts` L318-324; `agent-org-run.ts` L285-295 | Status companions | The canonical pipeline emits `AGENT_STATUS` (running) before every non-terminal event. The collaboration adapter forwards each one, and the roots publish each with its own sequence. On `/ws/agent` the per-connection status filter suppresses the repeats; on sequenced sockets they cannot be suppressed without creating a gap | Read from code; not measured live |
| 2026-10-18 | Code | `agent-status-transition-filter.ts` | Team status filter | Inert on Team: team status payloads carry `change_sequence`, so no two are equal (no accidental gap today) | — |
| 2026-10-18 | Code | `agent-stream-content-cadence-scheduler.ts` | Safe companions | `TOKEN_USAGE_UPDATED` and `AGENT_STATUS` running are forwarded without flushing. On a sequenced stream that would overtake pending content and create an out-of-order sequence | A sequenced stream must never let a message overtake pending content |
| 2026-10-18 | Doc | `docs/android_mobile_access.md` L37-38; protocol doc "reject without compatibility repair" | Version skew | The desktop app can attach remote (e.g. Docker) nodes; stream DTOs are strict, and unknown fields are already rejected | No new skew promise; follows existing policy |
| 2026-10-18 | Git | `57ab99fcc4` (2026-08-11) "refactor(team): close execution projection boundaries" | When Team broke | Introduced the strict Team execution projection (`segment_id`, `change_sequence`) five days after the cadence | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User watches a standalone Agent answer | `/ws/agent` egress coalesces | 30 deltas → 1 frame after the window | probe | High |
| BEH-002 | User | User watches a Team member answer | Team egress; content not coalescible | 30 deltas → 30 frames immediately | probe | High |
| BEH-003 | User | User watches an Org member answer | No egress | 30 deltas → 30 frames, sequences 1..30 | probe | High |
| BEH-004 | User | User watches a delegated task agent of a standalone run | No egress | 30 deltas → 30 frames | probe | High |
| BEH-005 | Contract | Team/Org/collaboration client | Gap-free `change_sequence` from snapshot base | Gap → reopen/reject | client code | High |
| BEH-006 | System | Applications and lifecycle observers subscribe to root events | Unthrottled | Must stay unthrottled | protocol doc; subscribers | High |
| BEH-007 | System | Ordering boundaries | Lifecycle/tool/error/terminal/non-running status flush earlier content first | Preserved | scheduler | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `AgentStreamWebSocketEgress` + `AgentStreamContentCadenceScheduler` | Per-connection filters + cadence | Reuse for all sockets | Needs a mode for sequenced streams |
| `RootEventPublisher` | Domain order + snapshot barrier | Unchanged | Coalescing after it means a frame must cover several sequences |
| Collaboration/Team DTOs | One `change_sequence` per frame | A coalesced frame must say which sequences it covers | Contract field |
| Web contexts | `next = seq + 1` | Accept a covered range | 3 contexts |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `ROOT_EXECUTION_EVENT` (org, agent, agent_team variants) and Team agent messages: wire DTOs in `autobyteus-collaboration-stream-contracts` and `autobyteus-team-stream-contracts`.

### Structural Surfaces

- Server: egress (`websocket-egress/`), org and collaboration stream handlers, Team stream handler.
- Contracts: 2 packages.
- Web: 3 stream contexts (Org, collaboration, Team view state).

### Potential Structural Impacts To Investigate

- API or external-contract change: **Present.** A covered-range field on sequenced frames.
- Persistence schema or invariant change: Absent (all in-memory streams).
- Security or privacy boundary change: Absent.
- Concurrency or lifecycle change: **Present.** Per-connection timers on three more sockets; flush and dispose at session close and root termination.
- Deployment, migration, ownership-boundary change: Absent (no migration); remote-node skew follows the existing strict-DTO policy.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Temporary vitest probe (deleted after the run): 30 SEGMENT_CONTENT deltas through the real egress (`/ws/agent` shape, Team shape) and the real `AgentOrgStreamHandler` / `AgentCollaborationStreamHandler` with a real `RootEventPublisher`, 500 ms window | BEH-001..004 | standalone **1** frame, 0 within 350 ms; Team **30**, all within 350 ms; Org **30**, all within 350 ms, sequences 1..30; collaboration **30**, all within 350 ms | **Valid**: 3 of 4 chat sockets do not batch | `evidence/validity-probe.log`, source `evidence/validity-probe.test.ts.txt` |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (2026-08-06) | Timed batching belongs to server WebSocket egress | Direct (approved requirement of the cadence ticket) | Server-side, per connection | None |
| User via DEC-004 (2026-10-18) | Every chat follows the setting | Delegated decision | Scope | None |
| User (2026-10-18) | Likes a single regulator downstream ("pressure control") | Direct | One shared egress for all sockets | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| `@autobyteus/collaboration-stream-contracts`, `@autobyteus/team-stream-contracts` | workspace | Strict DTOs, gap-free sequences | source | Remote-node version skew (existing policy: none promised) |

## Persisted Data And State Facts

- Not affected: streams and sequences are in-memory per live root.

## Product Design Request Context

- Not stated.

## Product Design Findings

- N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/validity-probe.log`, `evidence/validity-probe.test.ts.txt` | Solution Designer | Validity reproduction | BEH-001..004 | REQ-001 | Final | Evidence only; probe removed from the tree |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Live measurement of interleaved `AGENT_STATUS` (running) between deltas on sequenced sockets (read from code only) | Without absorbing them, they would split every content group | Design absorbs identical repeats into the covered range; API/E2E measures live | Open → validation |
| RSK-001 | Risk | A coalesced frame that skips sequences breaks every client | Reopen loops | Covered-range contract plus client acceptance | Design |
| RSK-002 | Risk | A safe companion overtaking pending content on a sequenced stream | Out-of-order sequence | Sequenced mode: nothing overtakes pending content | Design |
| RSK-003 | Risk | Remote node and desktop of different versions | Strict DTO rejection | Existing policy; no new promise; noted in release notes | Delivery |

## Architecture Investigation Findings

- Placement options considered:
  - (1) Cadence before the root publisher: no wire change, but it delays application output and the Team lifecycle observer (BEH-006) → **rejected**.
  - (2) A second, presentation-only publisher with its own sequence space: clients unchanged, but the GraphQL inspection base and the socket snapshot base would come from different sequence spaces (`teamRunContextHydrationService`) → rejected as higher risk.
  - (3) **Per-connection egress, as on `/ws/agent`, with a sequenced mode.** A coalesced frame covers a contiguous sequence range; nothing overtakes pending content; identical repeated status companions inside the window are absorbed into the range. The domain stream, snapshot barrier and inspection bases stay unchanged → chosen.

## Requirement Implications

- Valid; proceed. Needs a small wire-contract addition and client acceptance, so it is larger than "attach the egress".

## Notes For Architecture Design

- Scenarios SCN-001..SCN-004; constraints BEH-005..BEH-007.
