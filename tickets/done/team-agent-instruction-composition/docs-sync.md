# Docs Sync

- Ticket: `team-agent-instruction-composition`
- Decision: `No Public Docs Update Required`
- Last Updated: `2026-03-09`

## Rationale

- The change is internal to member-runtime bootstrap metadata and runtime adapter prompt wiring.
- The prompt-format refinement only changed internal section labels (`team`, `agent`, `runtime`) at the runtime edge, and the later Codex stabilization merge plus Claude live-validation pass only adjusted runtime/session handling and verification artifacts.
- The latest user-reported fix only adjusts internal frontend streaming/rendering behavior so placeholder tool names (`unknown_tool`) are upgraded consistently when richer lifecycle metadata arrives.
- The latest runtime prompt refinement only changes internal wording so `send_message_to` guidance is conditional and non-conflicting with agent-authored collaboration policy.
- The latest user-requested live Codex and live Claude rerun was validation-only and did not change any API shape, schema, or public runtime contract.
- No user-facing API shape, GraphQL schema, or public configuration contract changed.
- Planning and implementation artifacts for this ticket were updated under `tickets/done/team-agent-instruction-composition/`, which is sufficient documentation for the scoped change.
