# Refactoring Proposal — token statistics follow-ups (from code review)

- Author: Code Reviewer (`/software_engineering_team/code_reviewer`)
- Date: 2026-10-11
- Trigger: explicit user request after review. The user asked me to propose refactoring for the parts I had called "less clean", using the design principles, and send it to the Solution Designer.
- Basis: `design-principles.md` (Core Principles 3, 6 and 7; Derived Checks; Structural Triggers) and repository `DESIGN.md`. Code was checked on branch `codex/token-meter-accuracy`, HEAD `f3245cdb0`, after DR-001 integration.
- Status of the ticket: integrated and docs-synced (DR-001). User verification (AC-010) and the release decision are pending.
- Nature of this proposal: these are recommendations, not review findings. None of them changes approved behavior, and none blocks the current release. The Solution Designer owns the scoping decision: fold some items into this ticket before finalization, or open a follow-up ticket.

## Why these were not blocking in review

The review gate blocks only on a defect against approved behavior or an established contract, or on a category scored below 9.0. These items scored at or above 9.0 and were recorded as non-blocking notes or follow-ups. On reflection, R-1 deserved a stronger stance in review. Core Principle 7 requires removing dead code in the modules a change touches, and I accepted the design's deferral of it too easily.

## Proposed Refactorings

### R-1 — Remove the dormant partial-stream text path in the Claude session module (Core Principle 7: No Dead Code)

- **Recommendation:** Do it.
- **Evidence that nothing reaches it:**
  - `ClaudeSession.handleFrame` (`claude-session.ts:398-402`) returns for every `stream_event` frame before `turnTracker.observe`.
  - The turn tracker's `turnContent` / `turnResult` callbacks → `projectTurnFrame` (`:425-427, :459-475`) are the only route to `ClaudeTextSegmentProjector.processChunk`.
  - So the `stream_event` branch of `processChunk` can never run. That branch is `processPartialStreamEvent` (`claude-text-segment-projector.ts:167` and the `processPartialContentBlock*` / `finishPartialMessage` helpers it calls).
  - `"stream_event"` in `CONTENT_FRAME_KINDS` (`claude-turn-tracker.ts:55`) is likewise unreachable.
  - A repository search finds no other caller. The only remaining references are in `tests/unit/.../claude-turn-tracker.test.ts`, and that is code only its own tests call.
- **Scope:**
  - Remove `processPartialStreamEvent`, the partial content-block methods, `activePartialSegmentIdsByIndex` / `activePartialMessageIdentity`, and the partial loop in `finishTurn`.
  - Remove `"stream_event"` from `CONTENT_FRAME_KINDS`.
  - Update or remove the tests that exercise only this path.
  - This is about 90 lines in the module this ticket touched (`backends/claude/session/`).
- **Out of scope:** the `extractGenericStreamDelta` / string-chunk path. I have no evidence either way about whether real frames reach it, so it should not be removed without its own reachability proof.
- **Behavior impact:** none. R-001 transcript equality already proves that partial frames never reach projection.

### R-2 — One owned token-usage event-details structure and one wire projector (Reusable Owned Structures; Shared-Structure Tightness)

- **Recommendation:** Do it.
- **Evidence:**
  - `TeamTokenUsageDetails` (`agent-team-execution/domain/team-agent-event.ts:35-85`) and `AgentPresentationTokenUsageDetails` (`agent-collaboration/execution/events/agent-presentation-event.ts:48-98`) are two identical ~50-field types. The only difference is that `runSummaryAfterEvent` carries `root_team_run_id`.
  - The team type is produced from the presentation type by spreading it and adding that one field (`team-agent-event-adapter.ts:29-38`).
  - The 50-field camelCase → snake_case `tokenPayload` mapper is written out twice: `team-agent-event-websocket-projector.ts:17-70` and `agent-presentation-message-projector.ts:4-34`.
  - Concrete cost in this ticket: `contextCompactionThresholdTokens` and `reportsModelCall` had to be added by hand at four sites (two types, two mappers). A missed site would silently drop a field on one live path. ARCH-F-003 was the same class of risk at the contract level.
- **Scope:**
  - Define the team type by composition: `Omit<AgentPresentationTokenUsageDetails, "runSummaryAfterEvent"> & { runSummaryAfterEvent: TokenUsageRunSummaryPayload | null }`. Alternatively, have both types use one owned base type in the module that owns presentation events.
  - Extract one `toTokenUsageWirePayload(details)` mapper beside that type. The team projector prepends `change_sequence` / `agent_run_id`.
  - No contract or wire change: the strict DTO schemas stay as they are.
- **Behavior impact:** none. The existing transport and contract tests cover it.
- **Explicitly not proposed:** collapsing the camelCase internal layer, or re-shaping the flat snake_case contract. That was an approved design decision, and changing it is a larger question.

### R-3 — Extract the web live-partial team aggregate merge from the meter store (File responsibility; Responsibility-overload trigger; 500-line guardrail)

- **Recommendation:** Do it, before the next change to this store.
- **Evidence:**
  - `autobyteus-web/stores/tokenUsageMeterStore.ts` has 499 effective lines against a 500 limit.
  - Its lines 97–218 are pure summary arithmetic for the transient live-partial team aggregate: `rate`, `addCost`, `normalizedStatus`, `mergeStatus`, `mergeCurrency`, `mergeCacheState`, `mergeUniqueStrings`, `applyPersistedEventToPartialTeamAggregate` and its unit-price merge.
  - That is a separate concern from the store's real responsibility: state, the `revision` freshness guards, hydration and fetch.
  - The next feature touching the store cannot land without splitting it.
- **Scope:**
  - Move the pure merge functions into one owned module, for example `autobyteus-web/stores/tokenUsage/teamLivePartialAggregate.ts` (name by concern; follow local store conventions).
  - Give that module focused unit tests. The store keeps state, guards and fetch.
- **Behavior impact:** none. The existing store specs must pass unchanged.

### R-4 — The fold result states whether an observation contributes (Core Principle 3: Authoritative Boundary Rule)

- **Recommendation:** Optional and small. Bundle it with R-1 or R-2.
- **Evidence:**
  - `TokenUsageRunAccumulator` depends on the fold boundary (`foldTokenUsageObservation`).
  - It also imports a fold internal, `tokenUsageObservationContributes` from `token-usage-run-record-state.ts` (`token-usage-run-accumulator.ts:6, 54`), to recompute a decision the fold already made.
- **Scope:** add `contributes: boolean` to `TokenUsageRunFoldResult`. The accumulator gates the facet write on it and drops the record-state import.
- **Behavior impact:** none.

## Considered And Not Proposed

| Item | Why no refactoring |
| --- | --- |
| Claude reconciler density (`claude-sdk-model-usage-reconciler.ts`, 258 lines) | The complexity is required by approved behavior. SDK compaction calls appear only in the cumulative `modelUsage` (REQ-004, P3). It is one cohesive owner under the size limit. Splitting its private state codec from its rules would be artificial fragmentation (Flat-vs-over-split; Empty indirection) |
| `revision` = Σ record revisions relies on records never being deleted | The invariant holds and is documented in the code and in `token_usage.md`. Adding guards for a deletion path that does not exist is speculative machinery (Core Principle 6; DESIGN.md Rule 1). Revisit only if record deletion is ever designed |
| `autobyteus-web/generated/graphql.ts` stale against the server schema | Codegen hygiene, not a design issue. Regenerate it as a separate cleanup task; the drift (Projects / run-group fields) predates this ticket |
| Flat snake_case context-reading group | Approved design decision (design spec § Reusable Owned Structures); not reopened |

## Suggested Handling

- **Option A (recommended):** a separate follow-up refactoring ticket for R-1–R-4 after AC-010 and finalization. The validated package does not restart review and E2E, and the follow-up gets its own small design, review and validation. Classification would likely be Medium / Low.
- **Option B:** fold R-1 and R-4 into this ticket before finalization. They are small and in touched modules. This requires a targeted code review and an affected-scope API/E2E rerun before delivery resumes.
- In either case, R-2 and R-3 fit better as a follow-up, since they touch files beyond this change's core scope.

The final scoping decision belongs to the Solution Designer, together with the user.
