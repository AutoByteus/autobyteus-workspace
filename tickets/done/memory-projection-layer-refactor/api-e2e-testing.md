# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/proposed-design.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/future-state-runtime-call-stack-review.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/implementation-handoff.md`
- Current Validation Round: `4`
- Trigger: `Stage 8 Requirement Gap re-entry for Codex reasoning preservation and grouped historical hydration`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 7 gate after implementation completion | N/A | Yes | Fail | No | Direct Claude provider coverage exposed a stale unit test still calling the old provider input contract |
| 2 | Stage 7 Local Fix re-entry | Yes | No | Pass | Yes | Claude provider validation was aligned to the new contract and the expanded server regression bundle passed |
| 3 | Stage 8 Validation Gap re-entry | Yes | No | Pass | Yes | Direct live Codex `thread/read` payload evidence was captured and persisted after the user challenged Stage 7 completeness |
| 4 | Stage 8 Requirement Gap re-entry | Yes | No | Pass | Yes | Codex replay now preserves separate reasoning when present, stays truthful when absent, and historical hydration groups assistant-side replay into one AI message per user boundary |

## Validation Basis

- Requirements `R-001` through `R-016` were validated against the refactored spine:
  - `raw memory data -> run-history projection -> frontend UI hydration`
- Re-entry note:
  - Stage 7 reopened once during close-out because direct Claude provider coverage exposed a stale unit test that still invoked the old provider input contract. The fix path was classified as `Local Fix` and resolved in round `2`.
  - Stage 8 reopened once more because the prior validation set proved `getRunProjection` against live Codex but did not persist direct live `thread/read` payload evidence. Round `3` added a direct Codex app-server probe and stored the raw payload plus a summarized inspection artifact.
  - Stage 8 then reopened as a `Requirement Gap` because the stronger Codex reopen requirement needed explicit reasoning preservation and grouped assistant-side hydration. Round `4` validated that re-entry tranche.
- Acceptance criteria focus:
  - memory boundary cleanup
  - run-history replay ownership
  - sibling historical `conversation` and `activities`
  - team-member replay ownership
  - Codex/Claude/AutoByteus provider convergence
  - explicit source-limited activity fidelity
  - source-native Codex reasoning preservation when present
  - truthful omission of reasoning when live Codex history does not persist it
  - grouped assistant-side historical hydration into one AI message in source order
- The highest-risk runtime for this ticket was Codex because its history separates user text, reasoning, command/file changes, and web search items. Validation therefore included unit normalization, one live runtime E2E path, and one direct live raw-payload probe.

## Validation Surfaces / Modes

- Server targeted unit and integration tests
- Web targeted hydration tests
- GraphQL code generation against the ticket-local schema snapshot
- Server build verification
- Live Codex runtime E2E with terminate, restore, continue, and `getRunProjection`
- Direct live Codex app-server `thread/read` probe with persisted raw payload and summary artifacts

## Platform / Runtime Targets

- Host environment:
  - macOS worktree environment on `2026-04-11`
- Server runtime targets:
  - AutoByteus local memory-backed replay path
  - Codex app-server-backed replay path
  - Claude provider normalization path via unit coverage only
- Web target:
  - historical run hydration utilities in `autobyteus-web`

## Lifecycle / Upgrade / Restart / Migration Checks

- Prisma test DB reset and migration application during server validation: `Pass`
- Historical replay lifecycle check:
  - Codex run terminate -> restore -> continue -> historical projection query
  - Result: `Pass`
- Server build after refactor:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts build:full`
  - Result: `Pass`

## Coverage Matrix

| Scenario ID | Acceptance Criteria | Spine ID(s) | Surface / Mode | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| `AV-001` | `AC-001`, `AC-006` | `DS-001`, `DS-005` | server unit/API | Pass | `agent-memory-service.test.ts`, `memory-view-types.test.ts` |
| `AV-002` | `AC-002`, `AC-003`, `AC-008`, `AC-009` | `DS-002`, `DS-003`, `DS-006` | server unit + integration/API | Pass | `raw-trace-to-historical-replay-events.test.ts`, `autobyteus-run-view-projection-provider.test.ts`, `memory-layout-and-projection.integration.test.ts` |
| `AV-003` | `AC-004`, `AC-007`, `AC-008` | `DS-004`, `DS-006` | server unit + integration/API | Pass | `team-member-local-run-projection-reader.test.ts`, `team-member-run-view-projection-service*.test.ts`, `memory-layout-and-projection.integration.test.ts` |
| `AV-004` | `AC-005`, `AC-007`, `AC-008` | `DS-002`, `DS-003`, `DS-006` | server unit/API | Pass | `codex-run-view-projection-provider.test.ts`, `claude-run-view-projection-provider.test.ts` |
| `AV-005` | `AC-010` | `DS-003`, `DS-004` | web hydration/E2E-facing unit | Pass | `runProjectionActivityHydration.spec.ts` plus payload wiring in `runContextHydrationService.ts` and `teamRunContextHydrationService.ts` |
| `AV-006` | `AC-009`, `AC-011` | `DS-003`, `DS-006` | server unit/API | Pass | activity entries assert `detailLevel: \"source_limited\"` and no fabricated lifecycle/log parity |
| `AV-007` | `AC-005`, `AC-007`, `AC-008`, `AC-011` | `DS-002`, `DS-003` | live runtime E2E | Pass | `agent-runtime-graphql.e2e.test.ts -t 'serves run history and projection after terminate, restore, and continue'` |
| `AV-008` | `AC-005`, `AC-011` | `DS-002`, `DS-003` | live runtime executable probe | Pass | `codex-thread-read-probe.json`, `codex-thread-read-probe-summary.md` |
| `AV-009` | `AC-012`, `AC-013` | `DS-002`, `DS-006` | server unit/API | Pass | `codex-run-view-projection-provider.test.ts` reasoning entry assertions and source-order check |
| `AV-010` | `AC-014`, `AC-016` | `DS-002`, `DS-006` | web hydration unit | Pass | `runProjectionConversation.spec.ts` grouped `think` + tool + text hydration assertions |
| `AV-011` | `AC-015` | `DS-002`, `DS-006` | mixed live + durable validation | Pass | live absence evidence in `codex-thread-read-probe-summary.md` plus durable presence-path validation in `codex-run-view-projection-provider.test.ts` and `runProjectionConversation.spec.ts` |

## Test Scope

- In scope:
  - replay boundary ownership
  - local and runtime-backed projection normalization
  - standalone and team-member bundle reopening
  - right-side historical activity hydration
  - live Codex restore/reprojection
  - direct live Codex raw `thread/read` payload attestation
  - source-native reasoning preservation in Codex replay normalization
  - grouped assistant-side historical conversation hydration
- Out of scope:
  - artifact/file replay improvements
  - full browser UI rendering of reopened panes
  - exact live-parity historical lifecycle replay where historical sources do not persist those events

## Validation Setup / Environment

- Worktree:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor`
- Server test root:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts`
- Web test root:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web`
- GraphQL schema input for codegen:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/generated-schema.graphql`
- Live Codex E2E used the real Codex app server runtime path in the local environment.

## Tests Implemented Or Updated

- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/agent-memory/agent-memory-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/api/graphql/types/memory-view-types.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/projection/autobyteus-run-view-projection-provider.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/projection/claude-run-view-projection-provider.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/services/agent-run-view-projection-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/team-member-local-run-projection-reader.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.import.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts`

## Durable Validation Added To The Codebase

- Replaced the old memory-owned replay transform test with:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts`
- Replaced the old wrong-owner team-member replay test with:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/tests/unit/run-history/team-member-local-run-projection-reader.test.ts`
- Added right-pane historical hydration coverage:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts`
- Added grouped historical conversation hydration coverage:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/__tests__/runProjectionConversation.spec.ts`
- Expanded Codex provider coverage to assert historical activities, `search_web`, `detailLevel: "source_limited"`, and separate reasoning replay entries in source order.

## Other Validation Artifacts

- Generated schema snapshot used for deterministic codegen:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/generated-schema.graphql`
- Regenerated client contract:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/generated/graphql.ts`
- Live Codex raw payload artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/codex-thread-read-probe.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/codex-thread-read-probe-summary.md`

## Temporary Validation Methods / Scaffolding

- One scoped live-runtime command was used to prove real Codex restore/replay behavior:
  - `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t 'serves run history and projection after terminate, restore, and continue'`
- One direct live-runtime probe command was used to inspect the raw Codex app-server history shape:
  - `node --input-type=module` inline probe from `autobyteus-server-ts/` built runtime modules; it created one Codex thread, sent three turns on the same thread, called `thread/read`, and persisted `codex-thread-read-probe.json` plus `codex-thread-read-probe-summary.md`
- No temporary validation scaffolding was left in the repo.

## Dependencies Mocked Or Emulated

- Unit tests mock `CodexThreadHistoryReader` to isolate item-shape normalization.
- Server tests use Prisma test DB reset/migrations for isolated backend state.
- Live Codex E2E uses the real Codex app-server runtime path instead of mocks.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AV-004` / Claude provider unit test still used old `buildProjection` input shape | Local Fix | Resolved in round `2` by updating the test to use `RunProjectionProviderInput.source` and rerunning the expanded server regression bundle | `tests/unit/run-history/projection/claude-run-view-projection-provider.test.ts`, round-2 server regression command | No source implementation bug was found; the gap was stale durable validation |
| 2 | `AV-008` / Stage 7 lacked direct live Codex `thread/read` payload evidence | Validation Gap | Resolved in round `3` by running a direct Codex app-server probe and persisting the raw payload plus a summarized inspection artifact | `codex-thread-read-probe.json`, `codex-thread-read-probe-summary.md` | The prior live E2E proved replay materialization but not the raw payload shape itself |
| 3 | Stage 8 requirement gap for Codex reasoning parity and grouped hydration | Requirement Gap | Resolved in round `4` by refreshing the upstream design, implementing explicit reasoning replay entries plus grouped historical hydration, and rerunning focused executable validation | `implementation.md`, `codex-run-view-projection-provider.test.ts`, `runProjectionConversation.spec.ts`, live Codex E2E rerun | Live raw-payload evidence still proves the absence case only; presence-path behavior remains validated by durable tests against the supported payload shape |

## Scenarios Checked

- `AV-001` memory contracts stayed memory-oriented after replay ownership removal
- `AV-002` local AutoByteus replay bundle is built inside `run-history`
- `AV-003` team-member replay ownership moved out of `agent-memory`
- `AV-004` runtime-backed providers converge onto the run-history bundle contract
- `AV-005` historical activities hydrate from `projection.activities`
- `AV-006` source-limited activity fidelity stays explicit
- `AV-007` live Codex run history materializes after terminate, restore, and continue
- `AV-008` live Codex `thread/read` payload was inspected directly and persisted as raw evidence; this run emitted `userMessage`, `agentMessage`, and `commandExecution` items, with no separate `reasoning` item observed
- `AV-009` Codex replay preserves separate reasoning entries in source order when the source provides them
- `AV-010` historical reopen groups adjacent assistant-side replay entries into one AI message with ordered `think`, tool, and text segments
- `AV-011` live Codex evidence still constrains the truthful absence case for reasoning, so the implementation does not fabricate `think` segments when the persisted payload omits them

## Passed

- Expanded targeted server regression bundle:
  - command:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts exec vitest run tests/unit/agent-memory/agent-memory-service.test.ts tests/unit/api/graphql/types/memory-view-types.test.ts tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts tests/unit/run-history/projection/autobyteus-run-view-projection-provider.test.ts tests/unit/run-history/projection/claude-run-view-projection-provider.test.ts tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/unit/run-history/team-member-local-run-projection-reader.test.ts tests/unit/run-history/team-member-run-view-projection-service.import.test.ts tests/unit/run-history/team-member-run-view-projection-service.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
  - result:
    - `11` files passed
    - `36` tests passed
- Web historical activity hydration:
  - command:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web exec vitest run services/runHydration/__tests__/runProjectionActivityHydration.spec.ts`
  - result:
    - `1` file passed
    - `2` tests passed
- Web GraphQL codegen:
  - command:
    - `BACKEND_GRAPHQL_BASE_URL=/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/generated-schema.graphql pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web codegen`
  - result:
    - `Pass`
    - regenerated client types with no stale references to `MemoryConversationEntry`, `includeConversation`, `conversationLimit`, or `agentRuns`
- Server build:
  - command:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts build:full`
  - result:
    - `Pass`
- Live Codex restore/replay:
  - command:
    - `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t 'serves run history and projection after terminate, restore, and continue'`
  - result:
    - `1` file passed
    - `1` focused test passed
    - `13` unrelated tests in the file remained skipped by the filter
- Live Codex raw `thread/read` probe:
  - command:
    - `node --input-type=module` inline probe from `autobyteus-server-ts/` built runtime modules using `CodexThreadManager`, `CodexAppServerClientManager`, and one persisted thread
  - result:
    - `3` turns captured on one thread
    - item kinds observed: `userMessage`, `agentMessage`, `commandExecution`
    - user prompts were returned as `userMessage` items with nested `content[].text`
    - no separate `reasoning` item was observed in this run even with `reasoning_effort: "high"`
    - raw payload and summary were persisted in ticket artifacts
- Re-entry focused server replay regression:
  - command:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts exec vitest run tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts tests/unit/run-history/projection/autobyteus-run-view-projection-provider.test.ts tests/unit/run-history/projection/claude-run-view-projection-provider.test.ts tests/unit/run-history/projection/codex-run-view-projection-provider.test.ts tests/unit/run-history/services/agent-run-view-projection-service.test.ts tests/integration/run-history/memory-layout-and-projection.integration.test.ts`
  - result:
    - `6` files passed
    - `22` tests passed
- Re-entry web historical hydration regression:
  - command:
    - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web exec vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts services/runHydration/__tests__/runProjectionActivityHydration.spec.ts`
  - result:
    - `2` files passed
    - `5` tests passed
- Re-entry live Codex restore/replay rerun:
  - command:
    - `RUN_CODEX_E2E=1 pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t 'serves run history and projection after terminate, restore, and continue'`
  - result:
    - `1` file passed
    - `1` focused test passed
    - `13` unrelated tests in the file remained skipped by the filter

## Failed

- Round `1` only:
  - `tests/unit/run-history/projection/claude-run-view-projection-provider.test.ts`
  - failure:
    - the test still invoked the old provider input shape and crashed on `input.source.runtimeKind`
  - classification:
    - `Local Fix`
  - resolution:
    - updated the durable test to use `RunProjectionProviderInput`
    - reran the expanded server regression bundle in round `2`

## Not Tested / Out Of Scope

- Manual browser/UI verification of reopened center-pane and right-pane rendering was not run in this stage.
- Live Claude runtime validation was not pursued because the user explicitly waived it due unavailable Claude account credit in the current environment; Claude remains covered at provider-contract unit-test level only.
- Exact live-parity historical lifecycle replay was not claimed or tested because the historical sources in scope do not persist the full live lifecycle/log event stream.
- Artifact/file replay improvements were intentionally deferred to a later ticket.

## Blocked

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts typecheck`
  - result: `Blocked by pre-existing repo configuration issue`
  - evidence:
    - `tsconfig.json` includes `tests` while `rootDir` is `src`, producing widespread `TS6059` errors unrelated to this replay refactor
  - classification:
    - `N/A for this ticket gate`

## Cleanup Performed

- Removed stale replay tests that still targeted the old memory-owned transformer/helper paths.
- Removed the dead `autobyteus-web/graphql/queries/agentRunQueries.ts` query so GraphQL codegen could succeed.
- Regenerated `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/generated/graphql.ts` after schema/query cleanup.

## Classification

- `Pass` (after one resolved `Local Fix` re-entry in round `2`, one resolved `Validation Gap` re-entry in round `3`, and one resolved `Requirement Gap` re-entry in round `4`)

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

- The live Codex E2E directly addresses the highest-risk user concern:
  - materializing historical projection from a real Codex run after terminate, restore, and continue
  - proving that reasoning/text/tool separation still resolves into stable historical replay outputs
- The direct live Codex raw-payload probe now closes the earlier evidence hole:
  - the captured `thread/read` payload stored user prompts as `userMessage` items inside `thread.turns[].items[]`
  - the captured payload stored terminal execution as a separate `commandExecution` item
  - the captured payload did not include a separate `reasoning` item in this run, so exact historical reasoning-segment recovery cannot be assumed from the live Codex payload without additional evidence
- The re-entry executable validation closes the design gap without over-claiming live evidence:
  - durable provider validation now proves that separate `reasoning` items are preserved as first-class replay entries when the source provides them
  - durable frontend hydration validation now proves that adjacent assistant-side replay entries become one reopened AI message with ordered `think`, tool, and text segments
  - live Codex evidence still proves only the truthful-absence case for persisted reasoning in the current environment
- The Claude provider now has direct durable validation in the authoritative scoped server regression bundle, so `AC-005` is covered for AutoByteus, Codex, and Claude explicitly.
- Codex emitted runtime warnings during the live test, but they did not block the projection result:
  - state DB migration mismatch under `/Users/normy/.codex/state_5.sqlite`
  - repeated `codex_rollout::list` fallback warnings
  - plugin prompt-length warnings
  - one unknown feature-key warning
- The Codex provider unit test also verifies a historically materialized `search_web` tool call and marks its activity fidelity as `source_limited`, which is the intended contract.
- A broad accidental test invocation from earlier work was not used as evidence for this report; only the targeted commands above are authoritative.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes:
  - Acceptance-criteria coverage closed for the in-scope replay bundle refactor.
  - One Stage 7 `Local Fix` re-entry was required to align the Claude provider durable test with the refactored provider contract.
  - One Stage 8 `Validation Gap` re-entry was required to attest the direct live Codex `thread/read` payload shape.
  - One Stage 8 `Requirement Gap` re-entry was required to preserve explicit Codex reasoning replay and grouped historical hydration.
  - Live Codex replay validation, direct raw payload attestation, and the re-entry reasoning/hydration regression bundle all passed on `2026-04-11`.
  - Remaining `typecheck` noise is pre-existing repo configuration debt, not a refactor regression.
