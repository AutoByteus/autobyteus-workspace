# Runtime Call Stack Review (Revised v13)

## Review Basis

- Runtime Call Stack Document: `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/design-based-runtime-call-stack.md`
- Source Design Basis: `/Users/normy/autobyteus_org/autobyteus-ts/tickets/multi_tool_incremental_ui_feedback_ticket/proposed-design.md`
- Review scope for this round: `autobyteus-ts` runtime + stream + in-repo stream consumers (deep-review pass)
- Review date: 2026-02-12

## A) Design-Stack Review (Target Architecture)

| Use Case | Business Flow Completeness | Gap Findings | Structure & SoC Check | Dependency Flow Smells | No-Legacy / No-Backward-Compat Check | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Auto-execute invocation emits started then succeeded immediately | Pass | None | Pass | None | Pass | Pass |
| 2. Auto-execute invocation emits started then failed immediately | Pass | None | Pass | None | Pass | Pass |
| 3. Approval-required invocation emits `TOOL_APPROVAL_REQUESTED` | Pass | None | Pass | None | Pass | Pass |
| 4. Approve path emits `TOOL_APPROVED` then executes via unified execution handler | Pass | None | Pass | None | Pass | Pass |
| 5. Deny path emits `TOOL_DENIED` and enqueues normalized denied result | Pass | None | Pass | None | Pass | Pass |
| 6. Multi-tool turn continuation remains batch-gated | Pass | None | Pass | None | Pass | Pass |
| 7. Mixed approved+denied invocations still complete one turn | Pass | None | Pass | None | Pass | Pass |
| 8. Duplicate result does not increase settled count | Pass | None | Pass | None | Pass | Pass |
| 9. Late duplicate after cleanup is suppressed | Pass | None | Pass | None | Pass | Pass |
| 10. Queue priority processes result before pending invocation request | Pass | None | Pass | None | Pass | Pass |
| 11. Stream mapping uses explicit lifecycle event family | Pass | None | Pass | None | Pass | Pass |
| 12. Legacy `TOOL_INVOCATION_AUTO_EXECUTING` lifecycle path does not exist | Pass | None | Pass | None | Pass | Pass |
| 13. `TOOL_LOG` is diagnostics-only, not lifecycle authority | Pass | None | Pass | None | Pass | Pass |
| 14. Unknown invocation result cannot corrupt active turn | Pass | None | Pass | None | Pass | Pass |
| 15. Completed turn cleanup resets state correctly | Pass | None | Pass | None | Pass | Pass |
| 16. No denial bypass to direct `LLMUserMessageReadyEvent` | Pass | None | Pass | None | Pass | Pass |
| 17. Stale or unknown approval decision is ignored safely | Pass | None | Pass | None | Pass | Pass |
| 18. Turn-mismatched result is ignored and cannot settle active turn | Pass | None | Pass | None | Pass | Pass |
| 19. Denied invocation is terminal-without-execution-start | Pass | None | Pass | None | Pass | Pass |
| 20. Recent-settled guard stays bounded without breaking suppression | Pass | None | Pass | None | Pass | Pass |
| 21. CLI/team stream consumers use explicit lifecycle family (no legacy dependency) | Pass | None | Pass | None | Pass | Pass |

## B) Current-Code Conformance Snapshot (As-Is `autobyteus-ts`)

| Use Case | Current Code Conformance (`Pass`/`Partial`/`Fail`) | Evidence |
| --- | --- | --- |
| 1 | Fail | Start lifecycle still legacy (`AGENT_TOOL_INVOCATION_AUTO_EXECUTING`) in `/Users/normy/autobyteus_org/autobyteus-ts/src/events/event-types.ts:18` and `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts:42` |
| 2 | Fail | Failure lifecycle still inferred from tool logs in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:147` |
| 3 | Partial | Approval-request exists (`/Users/normy/autobyteus_org/autobyteus-ts/src/events/event-types.ts:17`) but explicit lifecycle family is not end-to-end |
| 4 | Fail | Approve path still routes through `ApprovedToolInvocationEvent` in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:47` |
| 5 | Fail | Denial still bypasses normalized result aggregation by enqueuing `LLMUserMessageReadyEvent` in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:71` |
| 6 | Partial | Batch gating exists but is count-based list append in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:179` |
| 7 | Fail | Mixed approve+deny invariant not guaranteed while denial bypass remains (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:71`) |
| 8 | Fail | Duplicate result can inflate completion count (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/tool-invocation.ts:45`) |
| 9 | Fail | No recent-settled suppression cache in runtime state (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/context/agent-runtime-state.ts:29`) |
| 10 | Fail | Queue order still prioritizes invocation requests before results in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts:75` |
| 11 | Fail | Stream mapping still carries legacy auto-executing event in `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts:115` |
| 12 | Fail | Legacy event types still active in `/Users/normy/autobyteus_org/autobyteus-ts/src/events/event-types.ts:18` and `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/streaming/events/stream-events.ts:26` |
| 13 | Fail | Lifecycle semantics still coupled to log stream (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:147`) |
| 14 | Fail | Invocation membership checks are incomplete under count-based settlement (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:179`) |
| 15 | Partial | Active batch cleanup exists (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:220`) but no late-duplicate suppression guard |
| 16 | Fail | Direct denial-to-LLM continuation bypass remains (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:71`) |
| 17 | Fail | Stale approval no-op contract not formalized; early return exists but no lifecycle-consistent explicit handling (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:33`) |
| 18 | Fail | Turn correlation guard for settlement not implemented (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:121`) |
| 19 | Partial | Denied path skips execution, but terminal lifecycle semantics are not explicit lifecycle events |
| 20 | Fail | No bounded cache policy (capacity+TTL) for late-duplicate suppression (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/context/agent-runtime-state.ts:29`) |
| 21 | Fail | CLI/team consumers still depend on `TOOL_INVOCATION_AUTO_EXECUTING` in `/Users/normy/autobyteus_org/autobyteus-ts/src/cli/agent/cli-display.ts:124` and `/Users/normy/autobyteus_org/autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts:183` |

## C) Deep Gap And SoC Analysis

### Critical blocking gaps (release blockers)

1. Denial bypass to LLM breaks batch barrier (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:71`).
2. Count-based completion permits duplicate distortion (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/tool-invocation.ts:45`).
3. Legacy lifecycle event model still authoritative (`/Users/normy/autobyteus_org/autobyteus-ts/src/events/event-types.ts:18`).
4. Queue priority inversion can delay result handling (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/events/agent-input-event-queue-manager.ts:75`).
5. Turn-mismatch and unknown-result guards not enforced (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:179`).
6. Stream/consumer contract still tied to legacy auto-executing event (`/Users/normy/autobyteus_org/autobyteus-ts/src/agent/streaming/events/stream-events.ts:26`, `/Users/normy/autobyteus_org/autobyteus-ts/src/cli/agent/cli-display.ts:124`).

### Separation-of-concerns smells in current code

1. Execution logic duplication across two handlers:
- `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts:31`
- `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/approved-tool-invocation-event-handler.ts:31`
2. Approval handler mixes decision logic with LLM prompt creation/continuation dispatch:
- `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-execution-approval-event-handler.ts:65`
3. Result handler blends lifecycle log emission, aggregation, ordering, and downstream prompt assembly in one unit:
- `/Users/normy/autobyteus_org/autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts:34`

### Proposed architecture vs current code conformance

| Dimension | Current Code | Proposed v13 |
| --- | --- | --- |
| Lifecycle semantics | Legacy `approval_requested + auto_executing + log inference` | Explicit lifecycle family with terminal single-shot contract |
| Denial behavior | Direct denial -> LLM bypass | Denial normalized into `ToolResultEvent` barrier |
| Turn settlement | Count-based (`results.length >= invocations.length`) | Unique settlement map keyed by invocation ID |
| Turn safety | Weak turn-correlation/unknown-result handling | Explicit membership + turn-id guard checks |
| Duplicate handling | No bounded suppression | Bounded recent-settled cache (capacity + TTL) |
| Execution ownership | Split across direct + approved handlers | Single unified execution handler |
| Queue fairness | Invocation request before result | Result before invocation request |
| Consumer contract | CLI/team tied to legacy auto-executing event | CLI/team consume explicit lifecycle family |

Conclusion: proposed v13 architecture is materially better than current conformance on correctness, UX determinism, and SoC hygiene.

## Findings History

- [F-010] Runtime design docs drifted from updated code terminology (`activeToolInvocationBatch` model) | Status: Closed in design revision v11.
- [F-011] Legacy lifecycle model remains active (`auto_executing` + log-driven terminal status) | Status: Closed in design revision v11, pending implementation.
- [F-012] Denial bypasses tool-result aggregation barrier | Status: Closed in design revision v11, pending implementation.
- [F-013] Count-based completion remains vulnerable to duplicate/unknown result distortion | Status: Closed in design revision v11, pending implementation.
- [F-014] Tool execution logic duplicated across direct/approved handlers (SoC smell) | Status: Closed in design revision v11, pending implementation.
- [F-015] Queue priority inversion (invocation request ahead of result) | Status: Closed in design revision v11, pending implementation.
- [F-016] Approval handler does not define stale/unknown decision no-op contract | Status: Closed in design revision v12, pending implementation.
- [F-017] Result settlement lacks explicit turn-correlation guard | Status: Closed in design revision v12, pending implementation.
- [F-018] Recent-settled suppression policy lacks bounded memory contract | Status: Closed in design revision v12, pending implementation.
- [F-019] In-repo stream consumers still depend on legacy auto-executing lifecycle event | Status: Closed in design revision v13, pending implementation.

## Gate Decision

- Design Stack Gate: `Pass`
- Current Code Conformance Gate: `Fail` (implementation pending)
- Implementation can start: `Yes` (from v13 design baseline)
- Release readiness: `No`

## Required Next Actions

1. Implement v13 clean-cut runtime lifecycle family and remove legacy lifecycle events.
2. Replace count-based turn aggregation with unique-invocation settlement accounting and turn-correlation checks.
3. Remove denial bypass, unify execution path, and enforce stale approval no-op behavior.
4. Add bounded `RecentSettledInvocationCache` (capacity + TTL) and verify eviction/suppression correctness.
5. Update in-repo stream consumers (`cli-display`, `focus-pane-history`, `state-store`) to explicit lifecycle family.
6. Re-run this review after implementation and close all Section B failures.
