# Implementation Plan

- Ticket: `team-agent-instruction-composition`
- Status: `Approved for Stage 6`
- Scope: `Medium`
- Design Basis:
  - `tickets/done/team-agent-instruction-composition/proposed-design.md`
  - `tickets/done/team-agent-instruction-composition/future-state-runtime-call-stack.md`
  - `tickets/done/team-agent-instruction-composition/future-state-runtime-call-stack-review.md`

## Stage 6 Objective

Implement one shared member-runtime instruction contract that combines team instructions and current-agent instructions during bootstrap, then map that contract into Codex and Claude without preserving the current hard-coded prompt path as a primary fallback.

## Workstreams

### W1. Bootstrap Contract

- Thread `teamDefinitionId` into member-runtime session creation.
- Add a dedicated resolver that loads:
  - `AgentTeamDefinition.instructions`
  - `AgentDefinition.instructions`
- Persist normalized instruction sources in member runtime metadata together with existing teammate/tool facts.

### W2. Shared Composition

- Add a shared member-runtime instruction composer under `runtime-execution/member-runtime/`.
- Composer outputs:
  - canonical definition-derived instruction text
  - minimal factual runtime constraint text
  - combined Claude turn preamble text when needed

### W3. Codex Edge Mapping

- Replace adapter-owned primary prompt authorship in Codex.
- Map shared composition output into:
  - `baseInstructions`
  - `developerInstructions`
- Preserve dynamic `send_message_to` tool exposure and recipient restrictions.

### W4. Claude Edge Mapping

- Replace adapter-owned primary prompt authorship in Claude.
- Map shared composition output into Claude turn input.
- Preserve existing MCP send-message tooling boundary and recipient validation.

### W5. Verification

- Stage 6:
  - unit tests for resolver/composer/runtime mapping
  - integration-style tests for member-runtime bootstrap metadata flow
- Stage 7:
  - API/E2E coverage for acceptance criteria AC-001 through AC-006

## Touched Areas

- `autobyteus-server-ts/src/agent-team-execution/services/`
- `autobyteus-server-ts/src/runtime-execution/member-runtime/`
- `autobyteus-server-ts/src/runtime-execution/codex-app-server/`
- `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/`
- `autobyteus-server-ts/tests/unit/`
- `autobyteus-server-ts/tests/e2e/`

## Exit Criteria

- Stage 6 passes with source implementation complete and required unit/integration checks green.
- Stage 7 closes executable acceptance criteria with API/E2E evidence.
- No legacy hard-coded primary prompt path remains in Codex or Claude.
- Teammate visibility and `send_message_to` constraints remain correct.
