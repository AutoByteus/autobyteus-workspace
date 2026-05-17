# Command API Clean-Cut Design Rework Note

## Status

Design decision recorded after code review Round 20; implementation should not continue until architecture review accepts the revised command contract.

## Problem

Round 20 code review found that the current requirements/protocol docs still treated scalar command fields as supported API edge aliases:

- `target_member_name`
- `target_agent_name`
- command-side `agent_name`
- command-side `agent_id`
- camelCase equivalents

At the same time, the user clarified a no-backward-compatibility policy and the current worktree contains uncommitted implementation edits that reject/remove those aliases. This created an unsettled API contract.

## Decision

Use the clean-cut no-legacy command API.

Team member command targets and tool approvals must use structured path/route identity only. The public/domain `TeamMemberSelector` has only `path` and `route_key` variants; `top_level_name`, `selectorFromMemberName`, and `selectorFromOptionalTargetName` must be deleted or replaced with path/route-only helpers. Scalar name/id target aliases are invalid command input and should be rejected at WebSocket/GraphQL edges with clear invalid-target errors.

Valid team send targets:

```text
target_member_path / targetMemberPath
target_member_route_key / targetMemberRouteKey
```

Valid team approval/denial targets:

```text
source_path / sourcePath
member_path / memberPath
target_member_path / targetMemberPath
source_route_key / sourceRouteKey
member_route_key / memberRouteKey
target_member_route_key / targetMemberRouteKey
```

Invalid command target aliases:

```text
target_member_name / targetMemberName
target_agent_name / targetAgentName
agent_name / agentName
agent_id / agentId
member_name / memberName as a command target
```

`send_message_to.recipient_name` remains valid because it is an LLM tool roster argument resolved through `MemberTeamContext.communicationRecipients`, not a public runtime command target alias.

Outbound event/display aliases, if emitted, are non-authoritative display metadata and must not be accepted back as command targets.

## Artifact Updates

- Requirements: `REQ-003`, `REQ-015`, `REQ-019`, `REQ-027`, new `REQ-041`, new `AC-033`.
- Design: new `CR-007a`, new `DS-024`, updated interface mapping, dependency rules, removal table, and sequencing.
- Docs: `agent_team_execution.md`, `agent_streaming.md`, and `agent_websocket_streaming_protocol.md` now require structured route/path command targets and reject scalar aliases.

## Downstream Implementation Expectations

- Update WebSocket/GraphQL handlers and `team-member-selector-payload-adapter.ts` to reject scalar aliases.
- Update frontend protocol send methods and types to send path/route selector fields only.
- Update runtime E2E helpers and tests that still use `target_member_name` or name/id approval fallbacks.
- Add positive coverage for route/path fields and negative coverage for scalar alias rejection.

## Round 13 Architecture Review Cleanup

Architecture review Round 13 accepted the clean-cut command API direction but found stale wording that could still be read as permitting unambiguous bare-name command selectors. The authoritative correction is:

- Public/domain `TeamMemberSelector` is path/route only: `{ path }` or `{ route_key }`.
- `top_level_name` is not a selector variant. If mixed runtime dispatch needs the top-level executable handle, it derives that internal segment from `memberPath[0]` or the first `memberRouteKey` segment after the path/route selector has already been accepted.
- `selectorFromMemberName` and `selectorFromOptionalTargetName` must be deleted or replaced for public/domain command paths; no WebSocket, GraphQL, TeamRun, TeamRunBackend, TeamManager, or approval command boundary may call them to accept a scalar name.
- Edge adapters parse only explicit path/route payload fields and reject scalar string/name/id payloads unconditionally, including top-level or otherwise unambiguous names.
- The launch-config risk is scoped outside runtime command/approval APIs; it cannot reintroduce command target aliases.
- The only remaining bare-name-like value is `send_message_to.recipient_name`, a scoped LLM roster label resolved through `communicationRecipients` before delivery.
