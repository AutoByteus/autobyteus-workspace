# Design Owner Recheck Note

## Status

Confirmed with revisions.

## Trigger

Architecture review was paused and routed back to the solution/design owner for confirmation before implementation proceeds.

## Decisions Confirmed

1. **Nested definitions route to Mixed:** Any newly launched team definition containing `agent_team` nodes should route to `TeamBackendKind.MIXED`, even when all leaf agents use one runtime kind. The previous flatten-to-leaf behavior is current/legacy behavior only, not a preserved execution mode for new nested launches.
2. **Child team runs are parent-owned internals:** A subteam member is backed by an internal child `TeamRun` created by mixed runtime code, not by registering a separate top-level run through `AgentTeamRunManager`. Child runtime IDs are stored recursively under the parent run metadata/history record. A team definition explicitly launched by the user still creates a normal top-level run.
3. **Canonical metadata only / no backward compatibility:** New nested-capable runs write the canonical recursive `TeamRunMetadata` shape. Do not introduce a version-suffixed metadata type and do not keep `runVersion`. Use `memberTree: TeamRunMemberMetadata[]`, not `TeamRunMemberMetadataNode[]`. Do not migrate, recover, or fallback-read previous flat team metadata; unsupported historical metadata must fail fast with an explicit unsupported legacy-metadata/topology-lost error.
4. **`sourcePath` is canonical event identity:** Domain events use `TeamRunEvent.sourcePath` as the single canonical runtime-source identity. Route keys, `source_route_key`, `sub_team_node_name`, and display names are derived at transport/projection edges only.
5. **Nested commands and tool approval need path/route selectors:** GraphQL, WebSocket, and approval commands must accept path/route selectors and reject ambiguous bare names. Tool approval request events must include enough `sourcePath`/derived route identity for the client to approve the exact nested leaf.
6. **Naming update:** Use `TeamMemberNode` / `TeamMemberTreeNode` for frontend or definition tree data, and `MixedTeamMemberHandle` for backend live lifecycle/command adapters. Avoid `TeamRuntimeNode`.

## Artifact Changes Made

- Requirements status changed from `Design-ready` to `Refined`.
- Requirements added explicit `REQ-014` through `REQ-016` for canonical `sourcePath`, path-aware transport/tool approval, and canonical recursive metadata restore.
- Acceptance criteria added nested tool approval and child-run ownership checks (`AC-011`, `AC-012`).
- Design spec added a `Design-Owner Recheck Decisions` section and tightened legacy-flattening, child-run ownership, canonical metadata naming, event identity, and command selector guidance.
- Investigation notes appended a design recheck addendum with exact code sources inspected during the recheck.

## Files

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/design-spec.md`
- Pause note: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-nested-agent-team/tickets/done/mixed-team-nested-agent-team/architecture-review-pause-note.md`

## Validation State

No code implementation or executable validation was run in this recheck. The worktree still lacks installed dependencies for TypeScript/Vitest validation.
