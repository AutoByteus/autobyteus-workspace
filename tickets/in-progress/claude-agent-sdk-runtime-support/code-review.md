# Code Review

- Stage: `8`
- Date: `2026-03-04`
- Decision: `Pass`

## Review Scope

- Runtime registration/capability/model-catalog changes for `claude_agent_sdk`
- Runtime-neutral streaming and command-ingress decoupling
- Team external-member runtime orchestration and routing
- Run-history/projection updates and web runtime option wiring
- External runtime websocket listener lifecycle continuity across terminate/continue restore boundaries
- Claude team metadata normalization and teammate-aware `send_message_to` prompt guidance

## Findings

### Resolved During Verification

1. `getAgentStreamHandler` was constructing with an undefined codex runtime dependency instead of the external runtime event source registry.
   - Fixed in: `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts`
2. Team relay unit tests used member bindings without `runtimeKind`, which hid the new relay guard behavior.
   - Fixed in: `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
3. `TeamRunHistoryService` introduced external-member active checks but singleton wiring did not inject orchestrator by default.
   - Fixed in: `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
   - Guarded by test: `autobyteus-server-ts/tests/unit/run-history/team-run-history-service.test.ts`
4. Full backend-suite re-run exposed stale fixture shape in `team-run-continuation-service` unit test (missing canonical team/member runtime fields), causing incorrect branch selection.
   - Fixed in: `autobyteus-server-ts/tests/unit/run-history/team-run-continuation-service.test.ts`
5. Claude runtime stream delta normalization trimmed whitespace, collapsing tokenized output (`"Hello "` + `"world"` -> `"Helloworld"`).
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
   - Guarded by test: `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
6. Claude runtime query resume option previously used boolean `true`, which causes Claude CLI transport exit code 1 on live runs.
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts` (first turn no resume, second turn resume uses session id string)
     - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts` (live send/terminate pass)
7. Team external-member session restoration treated placeholder `memberRunId` as a completed turn, causing first send to incorrectly resume Claude with an invalid session id.
   - Fixed in: `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts` (`restoreRunSession` completed-turn detection tightened)
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
8. Team member orchestrator did not persist refreshed external runtime references after member sends, risking stale continuation pointers.
   - Fixed in: `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
9. External runtime websocket listeners could be dropped after session close/restore in GraphQL continuation paths, causing accepted sends with no received runtime events.
   - Fixed in:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
     - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
     - `autobyteus-server-ts/tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
10. Claude team responses could still present as standalone assistant behavior when asked about team tooling, reducing reliability of explicit `send_message_to` delegation guidance.
   - Fixed in:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.ts`
   - Guarded by tests:
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.test.ts`
     - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`

### Open Findings

- None.

## Required Checks

- Decoupling boundary check: `Pass` (external-runtime abstractions introduced and consumed across stream/ingress paths)
- No backward-compatibility dead paths introduced: `Pass` (compat wrappers remain intentional and thin)
- No legacy retention in new integration path: `Pass`
- Codex-vs-Claude live E2E parity gate: `Pass` (`13` Codex tests == `13` Claude tests)

## Re-Review Round (2026-03-03)

- Scope:
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-transcript-store.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-scheduler.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
- Review focus:
  - Layering and separation of concerns inside Claude runtime execution path
  - Runtime event payload completeness for downstream run-history projection
  - E2E run-history validation depth for terminate/continue lifecycle

### Findings

1. `Resolved`: transcript persistence/merge logic was embedded in the runtime orchestrator service.
   - Change: extracted to dedicated transcript layer.
   - Files:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-transcript-store.ts`
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
2. `Resolved`: turn scheduling policy and run-level idle waiting were embedded in service flow control.
   - Change: extracted to dedicated scheduler layer.
   - Files:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-scheduler.ts`
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
3. `Resolved`: Claude runtime event payloads lacked `sessionId` on core turn/text events, weakening run-history runtime-reference updates.
   - Change: added `sessionId` to `turn/started`, `item/outputText/delta`, `item/outputText/completed`, `turn/completed`.
   - File:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
4. `Resolved`: no integrated Claude live E2E that validates history growth through terminate and continue lifecycle.
   - Change: added/validated history-focused live scenario.
   - File:
     - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`

### Decision

- `Pass with residual size risk`: runtime service effective non-empty lines reduced to ~570 with explicit split boundaries for transcript and scheduling concerns, but still above 500; further split candidates remain (listener hub / session lifecycle coordinator) for future reduction.

## Re-Review Round (2026-03-04)

- Scope:
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts`
  - `autobyteus-server-ts/src/runtime-execution/runtime-event-listener-hub.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
  - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`
- Review focus:
  - Prompt wrapper naming neutrality and prompt-schema readability
  - Cross-runtime listener lifecycle duplication and boundary consistency
  - Claude auto-approve E2E robustness against runtime-equivalent event shapes

### Findings

1. `Resolved`: Claude turn preamble used vendor-specific XML tag naming (`autobyteus_team_context`) that was semantically noisy and reduced portability of prompt framing.
   - Change: replaced wrapper with neutral `team_context` tags.
   - Files:
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts`
     - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts`
2. `Resolved`: listener continuity behavior was duplicated across Claude/Codex runtime services and had already diverged in tests through private-method coupling.
   - Change: consolidated listener subscribe/rebind/defer/emit logic into shared `runtime-event-listener-hub`.
   - Files:
     - `autobyteus-server-ts/src/runtime-execution/runtime-event-listener-hub.ts`
     - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
     - `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`
     - `autobyteus-server-ts/tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts`
3. `Resolved`: Claude auto-approve E2E assertion was overly strict (`commandExecution`-only lifecycle), causing false failures when valid file-change lifecycle events were emitted.
   - Change: widened accepted lifecycle evidence while preserving strict no-approval-request requirement and filesystem side-effect verification.
   - File:
     - `autobyteus-server-ts/tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts`

### Validation

- Unit:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts`
- Live E2E (Claude + Codex):
  - `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- Build:
  - `pnpm -C autobyteus-server-ts run build:full`

### Decision

- `Pass with one structural follow-up`: behavior and parity gates are green; remaining architectural risk is Claude runtime service length (`~923` lines) still over the strict `<=500` guideline and should be addressed in a dedicated split round.

## Re-Review Round (2026-03-04, streaming cadence)

- Scope:
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-message-normalizers.ts`
  - `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.ts`
  - `autobyteus-server-ts/tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
- Review focus:
  - Claude delta extraction completeness for SDK `stream_event` payloads
  - Duplicate full-snapshot fallback suppression after streaming starts
  - Separation-of-concerns adherence (runtime-specific logic stays in Claude boundary)

### Findings

1. `Resolved`: Claude stream normalization did not parse `stream_event` text-delta payloads, reducing future compatibility with partial event surfaces.
   - Change: added explicit `stream_event` extraction path in normalizer.
2. `Resolved`: once streaming deltas are present, assistant/result fallback snapshots could be re-emitted as duplicate full-buffer content.
   - Change: added delta-priority reconciliation in runtime service (`resolveIncrementalDelta`) and preserved suffix-only catch-up behavior when snapshot extends partial output.
3. `Investigated limitation (non-blocking)`: current Claude SDK V2 session implementation hardcodes `includePartialMessages: false` in constructor path (`sdk.mjs` class `SQ`), so token-level partials are often unavailable from `session.stream()`.
   - Outcome: treated as upstream SDK behavior; runtime now handles available chunks deterministically without synthetic client-hack chunking.

### Validation

- Unit:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.test.ts`
- Live E2E matrix (Claude + Codex + run-history):
  - `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-graphql.e2e.test.ts tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`

### Decision

- `Pass`: no new architectural coupling introduced; streaming-cadence handling is safer and deterministic for currently available SDK event shapes. Residual user-visible “all-at-once” behavior can still occur when upstream V2 emits only full assistant snapshots.

## Re-Review Round (2026-03-04, team-member run-history completeness)

- Scope:
  - `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`
  - `autobyteus-server-ts/src/run-history/services/team-member-run-projection-service.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
  - `autobyteus-server-ts/tests/unit/run-history/team-run-history-service.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/team-member-run-projection-service.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- Review focus:
  - Correct layering between active runtime binding state and persisted run-history manifests
  - Deterministic projection arbitration for external runtimes when local projection is partial
  - Real live API/E2E validation of two-turn terminate/reload history behavior

### Findings

1. `Resolved`: team-member runtime reference/session updates were held only in in-memory binding registry and not persisted into team-run history manifests during active turns.
   - Impact: post-terminate projection queries could resolve with stale runtime references and return incomplete conversation history.
   - Change: `TeamRunHistoryService.onTeamEvent/onTeamTerminated` now refreshes manifest bindings from active orchestrator bindings and rewrites manifest + member manifests.
2. `Resolved`: team-member projection arbitration only attempted runtime projection fallback when local projection was empty/error.
   - Impact: non-empty but partial local projections masked richer runtime projections and caused first-message-only restore behavior.
   - Change: always attempt runtime projection for external runtimes and deterministically prefer richer/newer projection.
3. `Resolved`: no live Claude team E2E test existed for two-turn terminate/reload projection completeness.
   - Change: added real live test asserting `>=4` conversation entries and both turn markers after terminate + projection query.

### Validation

- Unit:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/run-history/team-run-history-service.test.ts tests/unit/run-history/team-member-run-projection-service.test.ts`
- Live E2E:
  - `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- Build:
  - `pnpm -C autobyteus-server-ts build`

### Decision

- `Pass`: layering and separation are improved (runtime-binding state remains in orchestrator layer; persistence responsibility remains in run-history service), and real live E2E now covers the previously missing terminate/reload team-member history contract.

## Re-Review Round (2026-03-04, orchestrator separation-of-concerns tightening)

- Scope:
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts`
  - `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-relay-service.ts`
  - `autobyteus-server-ts/tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
- Review focus:
  - Orchestrator responsibility boundaries and service layering
  - Runtime-neutral relay policy centralization
  - Regression risk on live Claude team send/history flows

### Findings

1. `Resolved`: `TeamMemberRuntimeOrchestrator` still embedded relay argument parsing and inter-agent routing policy, increasing policy coupling inside orchestration class.
   - Change: extracted relay policy into `TeamMemberRuntimeRelayService` and converted orchestrator relay methods to delegation-only.
2. `Resolved`: runtime-reference refresh-on-relay behavior was coupled to orchestration flow and not encapsulated as a dedicated relay concern.
   - Change: moved refresh update logic into relay service to keep lifecycle/session orchestration and relay policy independent.

### Validation

- Unit:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/team-member-runtime-orchestrator.test.ts`
- Build:
  - `pnpm -C autobyteus-server-ts build`
- Live E2E:
  - `RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_ENABLED=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-team-external-runtime.e2e.test.ts`
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`

### Decision

- `Pass`: orchestrator layering is improved with clearer separation between session lifecycle/state orchestration and relay policy, and live Claude team behavior remains green (`5/5`).
