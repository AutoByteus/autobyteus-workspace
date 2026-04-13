# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/proposed-design.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/future-state-runtime-call-stack-review.md`

## What Changed

- Removed canonical replay ownership from `agent-memory` by deleting `MemoryConversationEntry`, removing `AgentMemoryView.conversation`, and dropping the `includeConversation` / `conversationLimit` memory path.
- Added `run-history`-owned replay bundle types so `RunProjection` now carries sibling `conversation` and `activities` read models owned by `run-history`.
- Added one normalized `HistoricalReplayEvent` layer inside `run-history` and split bundle construction into separate conversation and activity builders.
- Reworked the local AutoByteus provider to build replay from raw traces inside `run-history`, not from a memory-owned conversation DTO.
- Moved the team-member local replay reader into `run-history` and removed the old `agent-memory` helper that returned `RunProjection`.
- Updated Codex and Claude providers to emit the run-history-owned bundle contract, including explicit activity detail levels.
- Updated run-history GraphQL payloads and frontend reopen hydration so historical activities are hydrated from `projection.activities`, independently of conversation hydration.
- Updated the Codex provider and replay event model so separate runtime `reasoning` items remain first-class historical replay entries instead of being flattened into assistant text.
- Updated historical conversation hydration so adjacent assistant-side replay entries are grouped into one reopened AI message with ordered `think`, tool, and text segments until the next user boundary.
- Removed stale tests and the dead `autobyteus-web/graphql/queries/agentRunQueries.ts` query that was blocking codegen, then regenerated `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/generated/graphql.ts`.

## Key Files Or Areas

- Server raw-memory boundary:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/agent-memory/domain/models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`
- Server replay bundle ownership and builders:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/run-projection-types.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-conversation.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts`
- Server provider/service layer:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/providers/claude-run-view-projection-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/services/agent-run-view-projection-service.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/services/team-member-local-run-projection-reader.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
- API and frontend hydration:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/api/graphql/types/run-history.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/runContextHydrationService.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/runProjectionConversation.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/runProjectionActivityHydration.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`

## Important Assumptions

- The correct spine remains `raw memory data -> run-history projection -> frontend UI hydration`.
- Memory inspector consumers do not need the historical replay DTO.
- GraphQL replay payloads may remain JSON-shaped in this ticket as long as the owning contract moved to `run-history`.
- Historical activity fidelity is source-dependent; local raw traces do not provide full live lifecycle/log parity.
- Codex runtime reasoning is optional in `thread/read`; the implementation must preserve it when present and omit it when absent.

## Known Risks

- `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` now owns the widest provider-specific normalization surface; it stays below the size/delta gates, but future Codex item-shape growth may justify extracting a provider-local parser module.
- Historical activity replay is intentionally `source_limited` on raw-trace-backed or reduced provider histories; product/UI work must not overstate parity with live streaming.
- Historical reopen is still one-shot hydration, not timed playback; the fidelity goal in this ticket is structural parity of reconstructed segments, not serial re-emission of live events.
- The live Codex runtime still emits external warnings from the local Codex state DB and plugin metadata; they did not block replay validation, but they remain environment noise outside this refactor.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Removed the memory-owned replay transformer and the old team-member replay helper under `agent-memory`.
  - Removed the dead `agentRunQueries.ts` query and stale memory-owned replay tests during the refactor instead of carrying them forward.

## Environment Or Dependency Notes

- Validation and codegen were run from the dedicated ticket worktree:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor`
- Web codegen uses the ticket-local schema snapshot:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-projection-layer-refactor/tickets/done/memory-projection-layer-refactor/generated-schema.graphql`
- Server `typecheck` is currently blocked by a pre-existing repo configuration issue in `tsconfig.json` (`tests` included outside `rootDir=src`); this refactor did not introduce that failure.

## Validation Hints / Suggested Scenarios

- Re-run the targeted server regression bundle covering raw memory, replay builders, provider normalization, projection arbitration, and team-member replay ownership.
- Re-run web historical activity hydration and GraphQL codegen to confirm the client contract stays aligned.
- Re-run the live Codex E2E scenario:
  - `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`
  - test name: `serves run history and projection after terminate, restore, and continue`
- On manual UI validation, reopen both standalone and team-member histories and verify the middle pane plus right-side activity pane both hydrate from historical projection payloads.

## What Needs Validation

- Historical replay contract ownership:
  - `agent-memory` must stay memory-only.
  - `run-history` must stay the only owner of the replay bundle.
- Provider convergence:
  - AutoByteus, Codex, and Claude paths must all materialize the run-history bundle contract.
- Right-pane historical hydration:
  - reopen must populate `agentActivityStore` from `projection.activities`, not from reconstructed conversation segments.
- Codex runtime materialization:
  - reasoning/text/tool separation must still project into stable `conversation` plus `activities` after terminate, restore, and continue.
  - when Codex history contains a separate `reasoning` item, historical reopen should surface a `think` segment instead of folding it into assistant text.
  - when Codex history omits a separate `reasoning` item, historical reopen should not invent one.
