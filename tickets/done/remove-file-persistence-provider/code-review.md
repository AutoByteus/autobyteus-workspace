# Review Report

## Review Round Meta

- Current Review Round: `3`
- Trigger: `Independent Stage 8 rerun after the Stage 8 local-fix re-entry moved Codex token-usage ownership back behind the thread boundary`
- Prior Review Round Reviewed: `2`
- Latest Authoritative Round: `3`
- Investigation Notes Reviewed As Context: `tickets/in-progress/remove-file-persistence-provider/investigation-notes.md`
- Earlier Design Artifacts Reviewed As Context:
  - `tickets/in-progress/remove-file-persistence-provider/proposed-design.md`
  - `tickets/in-progress/remove-file-persistence-provider/future-state-runtime-call-stack.md`
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial Stage 8 pass before the user-requested E2E rerun | `N/A` | `No` | `Pass` | `No` | Superseded by the Stage 7 re-entry and subsequent Codex local-fix loop. |
| `2` | Independent review after the first Codex backend local fix | `Yes` | `Yes` | `Fail` | `No` | Live runtime behavior passed, but the local fix bypassed the documented Codex raw-event authority boundary. |
| `3` | Independent review after the owner-boundary correction | `Yes` | `No` | `Pass` | `Yes` | The live behavior remains correct and the Codex backend no longer parses raw token-usage protocol details directly. |

## Review Scope

- Re-reviewed the original persistence-provider cleanup at summary level to confirm the global file-vs-sql contract removal still holds.
- Deep-reviewed the reopened Codex local-fix scope:
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
- Fresh validation evidence reviewed during this round:
  - `pnpm -C autobyteus-server-ts build`
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
  - `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "Codex current GraphQL runtime e2e creates a run, restores it, and continues streaming on the same websocket"`
  - focused Stage 8 review rerun: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `2` | `F-001` | `High` | `Resolved` | `codex-thread-notification-handler.ts` now owns raw token-usage parsing, `codex-thread-token-usage.ts` owns the raw token-usage shape mapping, `CodexThread` owns per-turn readiness state, and `CodexAgentRunBackend` now consumes only ready thread state before runtime dispatch. | The Stage 7 rerun preserved the live SQL persistence behavior after the ownership correction, so the Round 2 boundary-bypass finding is closed. |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | `179` | `Pass` | `Pass` (`59` added / `9` removed) | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | `404` | `Pass` | `Pass` (`58` added / `1` removed) | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts` | `95` | `Pass` | `Pass` (`26` added / `2` removed) | `Pass` | `Pass` | `N/A` | `Keep` |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` | `33` | `Pass` | `Pass` (`37` added / new file) | `Pass` | `Pass` | `N/A` | `Keep` |

Note:
- Round `1` source-size audits for the unchanged earlier persistence-provider cleanup files remain valid.

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Data-flow spine inventory clarity and preservation under shared principles | `Pass` | The repaired Codex return-event spine is coherent again: raw app-server notification -> `codex-thread-notification-handler.ts` -> `CodexThread` readiness state -> `CodexAgentRunBackend` persistence + normalized event dispatch. The broader ticket spine for startup/config, token-usage SQL persistence, and bootstrap cleanup remains unchanged. | None |
| Spine span sufficiency check (primary and return/event spines are long enough to expose the real business path) | `Pass` | The review covered the full business path from live Codex runtime notification through SQL persistence and GraphQL statistics, not only the local helper edits. | None |
| Ownership boundary preservation and clarity | `Pass` | Raw token-usage shape interpretation now lives under `src/agent-execution/backends/codex/thread/`, and higher runtime layers consume `CodexThread` state instead of raw protocol fields. | None |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | `Pass` | `codex-thread-token-usage.ts` is a tight raw-shape mapper serving the thread owner, while SQL persistence remains off-spine under `TokenUsageStore`. | None |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | `Pass` | The fix reuses the existing Codex thread boundary rather than introducing another runtime-side parser or a parallel token-usage subsystem. | None |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | `Pass` | The raw token-usage mapping was extracted into one owned file under the Codex thread subsystem instead of being duplicated across handlers or the backend. | None |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | `Pass` | The change continues to use the existing `TokenUsage` shape for SQL persistence and introduces no parallel token-usage DTO family. | None |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | `Pass` | Per-turn readiness policy now lives in `CodexThread`; the backend no longer repeats the raw-order coordination policy itself. | None |
| Empty indirection check (no pass-through-only boundary) | `Pass` | The new `codex-thread-token-usage.ts` file owns the raw token-usage translation, and `CodexThread` owns readiness state; neither is a pass-through wrapper. | None |
| Scope-appropriate separation of concerns and file responsibility clarity | `Pass` | `CodexAgentRunBackend` is back to orchestration plus persistence against thread-owned readiness, while thread state and raw notification handling stay inside the thread subsystem. | None |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | `Pass` | The backend no longer imports raw event names, raw JSON helpers, or turn-id resolvers; it depends on `CodexThread` and `TokenUsageStore` only at the correct level. | None |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | `Pass` | The Round 2 mixed-level dependency is removed. Higher layers now use the authoritative `CodexThread` boundary instead of mixing thread state with raw protocol internals. | None |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | `Pass` | Raw token-usage interpretation now lives in the documented `thread/` owner area, and the durable design doc was updated to match that owner model. | None |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | `Pass` | The fix adds one small owned mapper file and keeps the rest of the logic inside the existing Codex thread/backend split; it is not artificially fragmented. | None |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | `Pass` | The backend interface now depends on ready `{ turnId, usage }` pairs from `CodexThread`, not on implicit knowledge of raw `thread/tokenUsage/updated` payloads. | None |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | `Pass` | Names such as `recordTurnTokenUsage`, `getReadyTurnTokenUsages`, and `resolveCodexThreadTokenUsage` match their owners and responsibilities directly. | None |
| No unjustified duplication of code / repeated structures in changed scope | `Pass` | There is now one raw token-usage parser and one readiness owner; the earlier duplicated raw-event interpretation path in the backend is gone. | None |
| Patch-on-patch complexity control | `Pass` | The final fix removes the ad hoc raw-parser side channel from the backend instead of layering another patch over it. | None |
| Dead/obsolete code cleanup completeness in changed scope | `Pass` | The reopened Codex scope no longer contains the rejected backend raw-parsing branch, and the ticket still keeps the persistence-provider cleanup clean. | None |
| Test quality is acceptable for the changed behavior | `Pass` | Thread-owner tests cover both running-turn and late token-usage readiness, backend tests cover persistence-before-dispatch ordering, and live E2Es cover the real Codex runtime path. | None |
| Test maintainability is acceptable for the changed behavior | `Pass` | The new tests align with the owner model directly and no longer depend on a backend-only raw-event workaround. | None |
| Validation evidence sufficiency for the changed flow | `Pass` | Build, focused unit/integration tests, the live token-usage GraphQL E2E, and the live runtime-restore E2E all passed on the repaired owner model. | None |
| No backward-compatibility mechanisms (no compatibility wrappers/dual-path behavior) | `Pass` | No file-vs-sql compatibility logic or dual token-usage path was reintroduced. | None |
| No legacy code retention for old behavior | `Pass` | The ticket still cleanly removes the old persistence-provider contract and the reopened Codex scope does not retain the rejected raw-parser path. | None |

## Review Scorecard (Mandatory)

- Overall score (`/10`): `9.5`
- Overall score (`/100`): `95`
- Score calculation note: summary only; the Stage 8 gate comes from the structural checks and findings, not the average.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | `9.4` | The repaired Codex return-event spine is explicit from raw notification through thread readiness, SQL persistence, and outward runtime dispatch, while the broader persistence-provider cleanup spine remains intact. | The live protocol proof still depends on the Codex app-server contract observed in current E2Es rather than an owned in-repo protocol schema. | Keep re-running the live Codex E2E whenever raw protocol behavior changes. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | `9.7` | Raw token-usage handling is back under the Codex thread owner and the backend no longer mixes in protocol parsing. | The thread owner now carries a little more statefulness, so future additions should continue to stay tightly scoped to thread concerns. | Keep new thread state changes bounded and owner-specific. |
| `3` | `API / Interface / Query / Command Clarity` | `9.3` | The backend now consumes clear ready `{ turnId, usage }` pairs from the thread boundary instead of a raw app-server protocol contract. | The persistence step is still triggered by background runtime events rather than a separately named explicit domain event. | If this area grows again, consider a named thread-owned readiness signal rather than widening backend knowledge. |
| `4` | `Separation of Concerns and File Placement` | `9.5` | Thread notification handling, thread state, raw token-usage mapping, and backend orchestration each sit in the correct file and subsystem. | `codex-thread.ts` is still a relatively large owner file, even though it remains within the hard limit and the added concern fits there. | Continue extracting only when a new repeated or off-owner concern appears. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | `9.2` | The change reuses the existing `TokenUsage` model and adds one small owned raw mapper rather than creating overlapping data shapes. | Raw payload fields like `cachedInputTokens` and `reasoningOutputTokens` remain intentionally ignored because the current store contract only needs the aggregate counts. | Revisit the model only if downstream requirements start needing those sub-counts explicitly. |
| `6` | `Naming Quality and Local Readability` | `9.4` | File and method names now line up cleanly with the repaired owner model. | The distinction between "ready" and "persisted" is subtle enough that future changes could blur it if naming discipline slips. | Preserve the current ready/persisted naming split if the flow expands. |
| `7` | `Validation Strength` | `9.8` | The reopened scope has strong evidence: build, focused unit/integration suites, live token-usage E2E, live restore E2E, and a fresh focused review rerun. | The live Codex runtime path still depends on local environment readiness and ambient Codex access. | Keep the E2E gated but runnable as part of future regressions in this area. |
| `8` | `Runtime Correctness Under Edge Cases` | `9.2` | The owner model now covers both observed live orderings that matter here: running-turn usage before idle and late usage after completion, and the tests pin both cases. | Token-usage updates without a usable turn id are still intentionally skipped because the active live protocol includes turn ids. | If the Codex protocol starts omitting turn ids, add a new explicit design update rather than guessing at fallback behavior. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | `10.0` | The ticket remains a clean-cut removal of the old persistence-mode contract and token usage is SQL-only throughout the active code path. | None in this scope. | No change required. |
| `10` | `Cleanup Completeness` | `9.4` | The reopened Codex fix removed the rejected ad hoc parsing path and left the active persistence cleanup coherent. | Stage 9 still needs to sync the remaining long-lived docs and handoff artifacts to the final authoritative round. | Finish docs sync and handoff using this round as the authority. |

## Findings

None.

## Validation And Test Quality Verdict

| Area | Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- |
| Validation Evidence | Sufficient for changed behavior | `Pass` | Build passed; focused Codex/thread/token-usage unit+integration tests passed; live token-usage GraphQL E2E passed; live Codex runtime restore E2E passed. |
| Tests | Test quality is acceptable | `Pass` | The tests cover both the owner-level readiness behavior and the backend dispatch-ordering consequence. |
| Tests | Test maintainability is acceptable | `Pass` | The tests now align with the intended owner model and avoid backend raw-protocol coupling. |
| Tests | Main issue is `Validation Gap` rather than source/design drift | `Fail` | No validation gap remains; the prior blocker was structural and is now resolved. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | `Pass` | No file-vs-sql compatibility logic or dual token-usage path exists in the final state. |
| No legacy old-behavior retention in changed scope | `Pass` | Token usage remains SQL-only and the rejected backend raw-parser path is gone. |
| Dead/obsolete code cleanup completeness in changed scope | `Pass` | The reopened scope is clean after the owner-boundary correction. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: the durable Codex raw-event ownership note was updated during the fix, and Stage 9 should now sync the remaining long-lived docs and handoff artifacts to this authoritative review round.
- Files or areas likely affected:
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
  - `tickets/in-progress/remove-file-persistence-provider/docs-sync.md`
  - `tickets/in-progress/remove-file-persistence-provider/handoff-summary.md`

## Classification

- `N/A`

## Recommended Recipient

- `documentation_engineer`

## Residual Risks

- The live Codex token-usage path still depends on the current raw protocol continuing to include a usable `turnId` on `thread/tokenUsage/updated`; current evidence shows that contract holds.
- Android helper changes remain validated by build/script/source-scan evidence rather than a live Termux run in this environment.
- Codex E2E depends on local Codex runtime availability and ambient machine auth state.

## Latest Authoritative Result

- Review Decision: `Pass`
- Score Summary: `9.5 / 10` (`95 / 100`)
- Notes:
  - The persistence-provider simplification remains sound.
  - The reopened Codex local-fix scope is now review-clean.
  - No further Stage 6 or Stage 7 re-entry is required before Stage 9 docs sync.
