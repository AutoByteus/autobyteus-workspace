# Release Notes: AgentTeam message and delegation semantics

## Breaking Collaboration Result Change

- `send_message_to` no longer returns the always-null generic `result` field. Accepted calls now return the exact existing AgentRun that accepted the message as flat `target_agent_run_id`; rejected calls return `target_agent_run_id: null`.
- Consumers that parse the removed `{ accepted, code, message, result }` shape must update before adopting this change. No compatibility alias or dual result projection is provided.

## Clarified Task Delegation

- `delegate_task` is explicitly the creation and assignment step for one fresh task Agent or fresh task AgentTeam execution. An active result includes the new task ingress as `target_agent_run_id`; `not_started` omits that field because no contactable task execution exists.
- The same assignment must not be resent through `send_message_to`. Genuinely new clarification may be sent to the returned exact active task ingress.
- Formal result and review transitions remain owned exclusively by `submit_task_result` and `review_task_result`; ordinary message wording has no lifecycle effect.

## Cross-Runtime And MCP Alignment

- Native AutoByteus, Codex, Claude, and Agent Tools MCP use one provider-shared collaboration contract and the same identity field names.
- MCP `2025-06-18` and `2025-11-25` advertise object-root output schemas for the message/delegation result contracts. MCP text JSON and structured content represent the same validated object; MCP `2025-03-26` continues to omit `outputSchema`.

## Operational Notes

- Persisted data: `Not Affected`; no migration, rebuild, or compatibility reader/writer is required.
- Configuration: no new flag, provider-specific classifier, task lifecycle, routing service, persistence owner, or UI surface was added.
- Rollback: revert the final ticket merge if message consumers cannot handle flat `target_agent_run_id`, delegated work is delivered twice, a mounted Team message returns the wrong existing coordinator, task Team delegation returns a configured/TeamRun identity instead of the fresh coordinator AgentRun, or MCP text/structured results diverge.
- Release status: the user verified finalization and explicitly requested no new release version on `2026-08-30`. No version bump, tag, publication, or deployment will be performed; these notes remain available for future aggregation.
