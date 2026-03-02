# Requirements

- Status: `Design-ready`
- Ticket: `claude-agent-sdk-runtime-support`
- Last Updated: `2026-02-28`

## Goal / Problem Statement

Add Claude Agent SDK as a first-class runtime (`claude_agent_sdk`) alongside `autobyteus` and `codex_app_server`, while reducing codex-specific coupling in shared runtime orchestration layers so external runtimes are pluggable and independently enable/disable-able.

## Scope Classification

- Classification: `Large`
- Rationale:
  - Cross-layer impact across server runtime execution, streaming, team orchestration, run-history projection, runtime capability probing, model catalog, tests, and frontend runtime configuration UI.
  - New external SDK integration (`@anthropic-ai/claude-agent-sdk`) plus decoupling refactors in currently codex-branded control flow.

## In-Scope Use Cases

- `UC-001`: User creates a new single-agent run with runtime kind `claude_agent_sdk`.
- `UC-002`: User sends turns to a Claude runtime run and receives streamed assistant/tool/status events through existing websocket protocol.
- `UC-003`: User interrupts or terminates an active Claude runtime run.
- `UC-004`: User continues a previously persisted Claude runtime run via run history/continue flow.
- `UC-005`: Run history projection returns non-empty conversation for persisted Claude runtime runs.
- `UC-006`: Team run launch with homogeneous non-autobyteus external runtime members supports Claude member runtime creation + targeted user message routing.
- `UC-007`: Runtime capabilities expose independent enable/disable state for Codex and Claude runtimes.
- `UC-008`: Runtime model catalog can list Claude runtime models by runtime kind.
- `UC-009`: Existing `autobyteus` and `codex_app_server` flows continue to work without behavior regression in covered runtime paths.
- `UC-010`: Shared orchestration layers avoid codex-branded hardcoding in generic external-runtime paths.
- `UC-011`: Claude live E2E coverage depth matches Codex live E2E coverage count baseline, with explicit assertions for both supported and intentionally unsupported Claude runtime paths.
- `UC-014`: Claude team members receive teammate-aware runtime instructions and can execute `send_message_to` to route inter-agent messages through team runtime relay.
- `UC-015`: Claude runtime turn execution and session continuation run through Claude SDK V2 session APIs only (no legacy V1 `query()` runtime-turn path).

## Out of Scope

- Mixed-runtime teams in one team run (different member runtime kinds in same launch).
- Product redesign unrelated to runtime execution.

## Design-Ready Requirements

- `R-001`: Runtime kind system must include `claude_agent_sdk` as a valid runtime kind across server and frontend runtime config types.
- `R-002`: Runtime capability service must support independent capability resolution for `codex_app_server` and `claude_agent_sdk` (per-runtime env toggle + runtime availability probe).
- `R-003`: Shared runtime orchestration for external runtimes must use runtime-kind-driven registries/interfaces instead of codex-specific hardcoded checks in generic control paths.
- `R-004`: Server runtime adapter/composition flow must create and restore Claude runtime sessions with persisted runtime reference metadata needed for continue.
- `R-005`: Claude runtime service must accept user turns and emit stream events that map into existing websocket message protocol (`SEGMENT_*`, status, errors, assistant completion where applicable).
- `R-006`: Runtime ingress interrupt/terminate commands must function for Claude runtime sessions.
- `R-007`: Runtime model catalog must expose Claude runtime LLM models via `runtimeKind='claude_agent_sdk'` queries.
- `R-008`: Run-history projection layer must return conversation projection for Claude runtime runs through runtime-kind provider resolution (no codex-only fallback special casing in shared path).
- `R-009`: Team runtime routing path must support homogeneous external-member runtime mode for Claude member sessions (create/restore/send) without requiring codex-specific mode naming.
- `R-010`: Existing Autobyteus and Codex runtime behavior remains intact for in-scope run create/send/stream/continue/terminate/model-capability paths.
- `R-011`: Decoupling boundary must be explicit: codex-specific advanced relay behavior remains isolated to codex modules and is not embedded into runtime-neutral orchestration branches.
- `R-012`: Claude live runtime/team E2E suite must match Codex live runtime/team E2E suite in test count baseline (`13`) using real live runtime execution (`RUN_CLAUDE_E2E=1`) and must include explicit negative-path assertions where Claude intentionally does not support Codex-only features.
- `R-013`: External runtime websocket subscriptions must remain event-delivery-capable across runtime session teardown/restore for the same run id (terminate/continue), independent of whether message send is triggered via GraphQL or websocket command paths.
- `R-014`: Claude runtime must support team inter-agent relay by exposing a usable `send_message_to` tool surface with teammate-aware routing context and runtime-level relay delivery (no codex-only hard gate in team relay orchestration).
- `R-015`: Claude runtime implementation must use SDK V2 session APIs (`unstable_v2_createSession` / `unstable_v2_resumeSession`) for run create/restore/send flows and must not keep V1 `query()` as the active runtime-turn execution path.
- `R-016`: Any required use of non-public V2 control capabilities (for example dynamic MCP server control) must be isolated behind a dedicated SDK interop boundary with capability detection and deterministic error handling (no broad runtime service coupling to SDK internals).
- `R-017`: Team-member awareness for Claude V2 sessions must remain deterministic without V1 `systemPrompt` options by applying runtime-owned teammate instruction injection at the turn-construction boundary.

## Acceptance Criteria

- `AC-001` (`R-001`): `isRuntimeKind('claude_agent_sdk')` returns true, normalization accepts it, and frontend runtime kind unions/options can represent it.
- `AC-002` (`R-002`): Runtime capabilities query returns a `claude_agent_sdk` row with deterministic enable/disable reasoning; codex and claude toggles can be controlled independently.
- `AC-003` (`R-003`): Single-agent and team external-runtime orchestration paths do not gate solely on `runtimeKind === 'codex_app_server'` for generic external-runtime handling.
- `AC-004` (`R-004`): Creating and restoring a Claude runtime run produces active runtime session entries with runtime reference metadata persisted to manifest.
- `AC-005` (`R-005`): Sending a Claude runtime turn produces websocket-visible streamed content/status/error events and final turn completion semantics.
- `AC-006` (`R-006`): Interrupt and terminate operations against active Claude runtime sessions return accepted results and stop ongoing turn processing.
- `AC-007` (`R-007`): `availableLlmProvidersWithModels(runtimeKind: "claude_agent_sdk")` returns a non-empty model list when Claude runtime is enabled.
- `AC-008` (`R-008`): Run projection service returns conversation entries for completed Claude runtime runs (not empty fallback when Claude runtime has persisted transcript).
- `AC-009` (`R-009`): Team run with team runtime kind set to Claude creates/restores member runtime sessions and routes targeted user messages to resolved member runtime run IDs.
- `AC-010` (`R-010`): Existing Codex and Autobyteus runtime unit/integration tests for touched modules remain passing after Claude runtime integration.
- `AC-011` (`R-011`): Codex-only relay/tooling modules remain codex-scoped; runtime-neutral interfaces do not import codex-specific relay utilities.
- `AC-012` (`R-012`): Claude live E2E suite contains `13` tests total (runtime + team), all executable under live Claude runtime flags, and CI/local execution evidence shows the full Claude suite passing without skipped parity scenarios.
- `AC-013` (`R-013`): In live external-runtime terminate->continue scenarios with existing websocket connection, post-continue sends produce observable runtime status/content events without requiring route-specific websocket bridge refresh hooks.
- `AC-014` (`R-014`): In live Claude team runtime, member prompts that instruct `send_message_to` produce observable tool-call lifecycle events and corresponding recipient `INTER_AGENT_MESSAGE` delivery with correct sender/recipient/content payload, matching Codex roundtrip contract semantics.
- `AC-015` (`R-015`): Claude runtime service source and tests show V2 session API invocation for create/restore/send (`unstable_v2_createSession`/`unstable_v2_resumeSession`) and no active V1 `query()` turn-execution path remains in Claude runtime flow.
- `AC-016` (`R-016`): A dedicated interop module gates any non-public V2 control usage (e.g., dynamic MCP registration) and emits deterministic runtime errors when control capabilities are unavailable, with unit coverage for both supported and unavailable branches.
- `AC-017` (`R-017`): Team-manifest metadata is injected through the V2 turn-construction path and live Claude team tests confirm teammate-aware `send_message_to` behavior remains available without relying on V1 `systemPrompt` option wiring.

## Constraints / Dependencies

- Must preserve separation of concerns and runtime decoupling as primary design constraint.
- Must keep runtime disablement controllable per runtime via capability service.
- Must avoid adding backward-compat wrapper branches for obsolete abstractions in touched scope.
- Claude runtime integration depends on `@anthropic-ai/claude-agent-sdk` package behavior and session persistence semantics.
- Claude relay tooling depends on Claude SDK MCP custom-tool support (`mcpServers`/`createSdkMcpServer`) and team metadata propagation into runtime options.

## Assumptions

- Claude SDK session persistence/resume works when session IDs are persisted and runtime working directory is stable.
- First delivery only needs homogeneous runtime per team run.
- Claude Agent SDK MCP custom tools are available in runtime environment and callable in non-interactive server execution mode.

## Open Questions / Risks

- Mapping fidelity risk between Claude SDK stream events and current websocket segment semantics.
- Claude resume reliability across restart boundaries if session persistence settings or working directory differ.
- Team runtime behavior risk if any codex-specific assumptions remain in member runtime orchestration.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-001` -> `UC-001`, `UC-006`, `UC-007`
- `R-002` -> `UC-007`
- `R-003` -> `UC-002`, `UC-006`, `UC-010`
- `R-004` -> `UC-001`, `UC-004`
- `R-005` -> `UC-002`
- `R-006` -> `UC-003`
- `R-007` -> `UC-008`
- `R-008` -> `UC-005`
- `R-009` -> `UC-006`
- `R-010` -> `UC-009`
- `R-011` -> `UC-010`
- `R-012` -> `UC-011`
- `R-013` -> `UC-002`, `UC-004`, `UC-006`
- `R-014` -> `UC-014`, `UC-006`, `UC-010`
- `R-015` -> `UC-015`, `UC-001`, `UC-004`
- `R-016` -> `UC-015`, `UC-014`, `UC-010`
- `R-017` -> `UC-014`, `UC-015`, `UC-006`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario)

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-003`
- `AC-004` -> `AV-004`
- `AC-005` -> `AV-005`
- `AC-006` -> `AV-006`
- `AC-007` -> `AV-007`
- `AC-008` -> `AV-008`
- `AC-009` -> `AV-009`
- `AC-010` -> `AV-010`
- `AC-011` -> `AV-011`
- `AC-012` -> `AV-012`
- `AC-013` -> `AV-013`
- `AC-014` -> `AV-014`
- `AC-015` -> `AV-015`
- `AC-016` -> `AV-016`
- `AC-017` -> `AV-017`
