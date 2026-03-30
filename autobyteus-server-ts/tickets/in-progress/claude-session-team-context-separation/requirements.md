# Requirements

## Status

- Current Status: `Refined`
- Updated On: `2026-03-19`

## Goal / Problem Statement

Refactor the Claude runtime structure so individual session execution stays pure and team-specific runtime concerns move under `agent-team-execution`.
Today `ClaudeSessionContext` mixes session-owned state with team-owned state, which makes the Claude session layer know too much about team membership, teammate manifests, recipient routing, and `send_message_to` capability.

The target architecture should follow the `autobyteus-ts` pattern:
- individual agent/session context remains individual
- team context is separate and injected only when the run is actually part of a team

## Scope Classification

- Classification: `Medium`
- Rationale:
  - Cross-cutting design impact across Claude session bootstrapping, team member runtime launch, turn-input assembly, `send_message_to` tooling, and restore metadata.
  - No new product feature is added; this is an ownership and data-flow refactor.
  - Run-history/runtime-reference shape will likely need cleanup, but the primary goal is context separation and runtime-boundary clarity.

## In-Scope Use Cases

- UC-001: Single-agent Claude run bootstraps and executes with session-only context and no team context.
- UC-002: Claude team-member run bootstraps with separate `sessionContext` and `teamContext`.
- UC-003: Claude turn-input assembly composes team runtime instruction from injected team context rather than from `ClaudeSessionContext`.
- UC-004: Claude `send_message_to` tooling uses team-owned context only and does not read team fields from `ClaudeSessionContext`.
- UC-005: Restore path recomputes derived instruction/team values instead of persisting them as Claude session metadata.
- UC-006: Team-derived values such as `allowedRecipientNames` remain derived, not persisted.
- UC-007: Team-related parsing/building logic moves under `agent-team-execution/backends/claude` instead of `agent-execution/backends/claude/session`.

## Acceptance Criteria

1. Session purity
- `ClaudeSessionContext` contains only session-owned data.
- Team identity and teammate-routing data are not stored on `ClaudeSessionContext`.

2. Team ownership
- Claude team runtime context types/builders live under `agent-team-execution/backends/claude`.
- Team-only logic is not defined inside the Claude session folder.

3. Runtime behavior continuity
- Non-team Claude runs still work without requiring any team wiring.
- Team Claude runs still support teammate instruction rendering and `send_message_to`.

4. Derived-data policy
- `teamInstruction`, `allowedRecipientNames`, and teammate manifest display data are derived from definition/manifests at runtime and are not treated as Claude session identity.
- Agent instruction is derived directly from agent definition, not round-tripped through runtime metadata.

5. Persistence cleanup direction
- Claude runtime metadata no longer acts as the primary carrier for team runtime context.
- Persisted runtime metadata is narrowed toward minimum restore identity rather than derived prompt/runtime values.

## Non-Goals

- No redesign of the generic `AgentRunManager` interface in this design pass unless required by the final context-separation solution.
- No rewrite of Codex or AutoByteus runtime architecture in this ticket.
- No user-facing feature changes in run creation, streaming, or team messaging.

## Open Questions / Risks

1. Restore-source-of-truth depth
- We need to decide which minimum team identifiers must remain persisted in runtime metadata for restore, versus which values should always be recomputed from team-run manifest and definitions.

2. Bootstrap composition boundary
- We need to decide whether `ClaudeAgentRunBackendFactory` composes both contexts directly or whether team-owned Claude context assembly happens one layer above it during member-runtime creation/restore.

3. Generic runtime contracts
- If session and team contexts are fully separated, some current generic restore/bootstrap inputs may need a narrower or more explicit extension point for team-aware runtimes.
