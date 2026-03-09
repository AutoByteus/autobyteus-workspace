# Investigation Notes

- Ticket: `team-agent-instruction-composition`
- Date: `2026-03-09`
- Scope Triage: `Medium`

## User Request Interpretation

The issue is not just that Codex and Claude expose `send_message_to`. The user expectation is that the effective system instruction for those member-runtime sessions should be composed from:

1. team-level instructions from the team definition, and
2. the member agent's own instruction body,

instead of relying on hard-coded runtime-specific instruction prose embedded in the adapter code.

## Current State Findings

### 1. Member-runtime metadata does not currently carry team instructions or agent instructions

- `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts`
- The runtime metadata assembled for member runtimes includes routing and teammate facts:
  - `teamRunId`
  - `memberRouteKey`
  - `memberName`
  - `sendMessageToEnabled`
  - `teamMemberManifest`
- No field currently carries:
  - `AgentTeamDefinition.instructions`
  - agent prompt body / `AgentDefinition.instructions`

### 2. Codex builds runtime-owned prompt text and passes it as `developerInstructions`

- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-send-message-tooling.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-thread-lifecycle.ts`
- `renderTeamManifestDeveloperInstructions()` generates hard-coded delegation guidance plus teammate list.
- `startSession()` calls that renderer and passes the result to Codex `thread/start` / `thread/resume` as `developerInstructions`.
- `baseInstructions` is always `null`.
- Result: Codex team-member prompt context is runtime-authored, not definition-authored.

### 3. Claude also builds runtime-owned prompt text, but via turn preamble instead of thread instructions

- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.ts`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts`
- `renderTeamManifestSystemPromptAppend()` generates hard-coded delegation guidance plus teammate list.
- `buildClaudeTurnInput()` wraps that block inside `<team_context>` and prepends it to each turn input.
- Result: Claude has the same root problem as Codex, but expressed through a different injection point.

### 4. Claude exposes `send_message_to` via MCP tooling, not only prompt text

- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-send-message-tooling.ts`
- `buildClaudeTeamMcpServers()` dynamically registers `send_message_to` with recipient validation against allowed teammate names.
- This means the eventual fix should preserve two separate concerns:
  - instruction composition
  - tool exposure / validation

### 5. Native team runtime already uses a definition-driven preparation model

- `autobyteus-ts/src/agent-team/bootstrap-steps/agent-configuration-preparation-step.ts`
- `autobyteus-ts/src/agent-team/system-prompt-processor/team-manifest-injector-processor.ts`
- Native team runtime attaches team-context-aware processors during bootstrap instead of authoring a completely separate runtime-specific prompt string.
- This is the strongest local reference point for the intended architecture direction: adapters should translate prepared context, not own the system-prompt truth.

### 6. Persisted definitions already contain both instruction sources

- `autobyteus-server-ts/src/agent-definition/domain/models.ts`
- `autobyteus-server-ts/src/agent-definition/utils/prompt-loader.ts`
- `autobyteus-server-ts/src/agent-team-definition/domain/models.ts`
- `PromptLoader` loads the agent prompt body from `agent.md`.
- `AgentTeamDefinition.instructions` loads from `team.md`.
- The required source data already exists; it is just not being carried into member-runtime prompt composition.

## Architectural Implication

The clean seam is the member-runtime bootstrap layer, not the runtime adapters themselves.

- Best current insertion point: `team-member-runtime-session-lifecycle-service.ts`
- Likely direction:
  - resolve team instructions once during member-runtime session creation/restore,
  - resolve agent instructions once during member-runtime session creation/restore,
  - place those values into runtime metadata or a shared composed-instruction structure,
  - let Codex and Claude consume that shared structure instead of generating their own hard-coded prompt prose.

## Candidate Design Direction

1. Add shared instruction-source metadata for member-runtime sessions.
2. Introduce one server-owned composition helper for "member runtime instructions".
3. Keep runtime-specific adapters responsible only for mapping that composed content into:
   - Codex `baseInstructions` / `developerInstructions`, or
   - Claude turn/session prompt injection.
4. Keep teammate manifest rendering and `send_message_to` recipient validation as separate concerns from instruction composition.

## Open Design Decisions

- Whether Codex should split agent/team content across `baseInstructions` and `developerInstructions`, or receive one precomposed string.
- Whether Claude should continue turn-level `<team_context>` wrapping after the composition contract is shared.
- Whether a minimal hard-coded runtime safety suffix is still needed for tool-usage truthfulness, and if so where that belongs.

## Suggested Next Step

Move Stage 2 requirements from `Draft` to `Design-ready`, then produce a small proposed design that chooses one shared composition contract and one responsibility split between:

- metadata assembly,
- shared instruction composer,
- Codex mapping,
- Claude mapping.
