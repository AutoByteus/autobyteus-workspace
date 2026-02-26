# Requirements

## Status

- Current Status: `Design-ready`
- Updated On: `2026-02-21`

## Goal / Problem Statement

Add backend e2e verification that team terminate/continue and memory restore behavior works with a real LM Studio provider and no LLM/manager mocks.

## Scope Classification

- Classification: `Small`
- Rationale:
  - Single test-file update.
  - No production runtime code changes.
  - Adds one new env-gated test path plus helper logic.

## In-Scope Use Cases

- UC-001: Real LM Studio test is skipped cleanly when LM Studio config is absent.
- UC-002: Real LM Studio flow creates team, writes memory artifacts, terminates team, continues team, and receives post-continue assistant response.
- UC-003: Continued response demonstrates prior-context recall from pre-terminate turn.

## Acceptance Criteria

1. No-mock rule
- New real-provider test uses no `vi.spyOn` for `LLMFactory`, provider resolution, or team instance manager behavior.

2. LM Studio provider resolution
- Test resolves model identifier from `LMSTUDIO_MODEL_ID` or runtime model discovery (`LLMRuntime.LMSTUDIO`).

3. Restore behavior proof
- Test verifies persistence artifacts exist before terminate.
- After continue, projection shows recall prompt and increased token mention count proving post-continue recall output.

4. Backward safety
- Existing deterministic mocked tests remain intact and passing.

## Constraints / Dependencies

- Requires reachable LM Studio host for real-provider execution.
- Requires local model capable of short recall instruction-following.

## Assumptions

- `LMSTUDIO_HOSTS=http://127.0.0.1:1234` is valid for local testing unless overridden.
- Existing GraphQL schema contracts for `sendMessageToTeam` and run-history queries remain unchanged.

## Open Questions / Risks

1. Flakiness risk
- Real LLM behavior can vary by selected model quality.

2. Runtime availability risk
- Test is env-gated and skipped when LM Studio is not configured.
