# Requirements Doc

## Status

`Round 3 Corrections — User Approved for Architecture Re-review`

## Goal / Problem Statement

Fix the AutoByteus behavior that renders several adjacent `Thinking` cards for one visually contiguous reasoning phase when Codex App Server team agents use GPT-5.6-Sol. Determine upstream versus AutoByteus responsibility, then make future live runs—and reloads of those future runs—render one card until a new ordered conversation card/text/turn boundary occurs. Lifecycle updates to an already-positioned tool card are not new visual boundaries.

## Investigation Findings

The behavior is an **AutoByteus normalization bug**, not a frontend CSS duplication and not solely a model bug.

- The exact screenshot reproduction was located in team run `software_engineering_team_15eb25f9280f4cc0910708e1495c53a4`, member run `solution_designer_4209b1ca0cdd48858d859c641b86ad34`, turn `019f4f1e-8e8f-70b3-9c83-19854d25258c`.
- The Codex rollout contains five distinct consecutive provider `reasoning` response items with summary-part counts `3, 3, 3, 3, 2`, followed by the assistant message, with no tool or assistant item between them.
- A direct `codex app-server` `thread/read(includeTurns=true)` call for the same thread/turn returns only `userMessage -> reasoning(14 summary parts) -> agentMessage`. Codex therefore folds those provider response items into one logical reasoning item in its canonical history view.
- The running AutoByteus GraphQL projection returns `user -> reasoning -> reasoning -> reasoning -> reasoning -> reasoning -> assistant` for the same turn, exactly matching the five UI cards.
- `CodexReasoningSegmentTracker` currently prefers each stable provider item ID before consulting its per-turn active reasoning block. Each completed provider item therefore becomes a distinct normalized segment ID.
- The frontend correctly follows the current backend identity contract: `segmentHandler.ts` creates one `ThinkSegment` for each unseen `(segment_type, id)`, `runProjectionConversation.ts` creates one for each reasoning history row, and `AIMessage.vue` renders each segment. The frontend is not duplicating one object.
- Current direct probing also showed Codex CLI `0.144.1` emits `item/reasoning/summaryTextDelta`. By explicit product decision, AutoByteus intentionally and permanently ignores that protocol surface. Completed reasoning item snapshots are the sole supported source for displayed and persisted reasoning-summary content.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | UI/interaction specification for contiguous block boundaries, joining, live/replay parity, and non-happy states | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008`–`REQ-CTB-010` | `AC-CTB-003`–`AC-CTB-007`, `AC-CTB-009`–`AC-CTB-011` | Round 3 correction user approved for architecture re-review | Clarifies the observable behavior here; does not replace these requirements or `design-spec.md` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/user-verification-failure-analysis.md` | Runtime failure analysis for the packaged Electron candidate | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-009` | `AC-CTB-003`–`AC-CTB-006`, `AC-CTB-010` | Confirmed Design Impact | Provides exact new-run/projection/raw-trace evidence for the corrected ordered-card boundary |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: original `Local Implementation Defect`; packaged-verification `Design Impact` in the tool-boundary invariant; Round 3 `Requirement Gap` for permanent unsupported-delta behavior and `Design Impact` from an incomplete formal owner/spine model
- Refactor posture: `Needed` — preserve the implemented reasoning normalizer/tracker, add bounded ordered-tool placement state in the Codex adapter, and correct matching-result flush timing in the existing memory accumulator
- Evidence basis: The packaged candidate is running the implemented allocator/grouping code, yet four adjacent UI pairs each map to an in-place result update for an earlier tool card. The implementation correctly follows the reviewed matrix; the matrix incorrectly equated every terminal tool lifecycle event with creation of a new ordered entry.
- Requirement or scope impact: Correct the Codex live identity and ordered-card boundary rules for future runs, including the current memory persistence behavior that incorrectly flushes at matching tool results; do not add provider-specific grouping logic to Vue or remediation for pre-fix history.

## Recommendations

- Keep the Codex adapter as the authoritative live segment-identity owner.
- Reuse one active reasoning segment ID until an event creates a new ordered non-reasoning/tool card, emits assistant text, or crosses a turn/terminal lifecycle boundary.
- Treat result/status/log/completion events for an already-started tool as in-place card updates that preserve the active reasoning block.
- Allocate normalized reasoning block IDs independently from provider item/event IDs so every new block is distinct even when provider identity is missing or repeated.
- Keep frontend handlers simple and runtime-agnostic; add regression coverage proving future live output and reload of the newly persisted run remain equivalent.
- Encode `item/reasoning/summaryTextDelta` as an explicit ignored/no-effect event: it emits no normalized content and does not allocate, append, clear, or otherwise mutate reasoning-block state. Do not add a fallback or future-support seam.

## Scope Classification

`Medium` — the primary defect remains in Codex event normalization, but verified live/reload parity also requires a bounded memory-accumulator correction so an in-place tool result does not flush the preserved reasoning segment. Run-history, GraphQL, and frontend production remain generic consumers.

## In-Scope Use Cases

- Live Codex App Server agent and team-member turns with reasoning enabled.
- Multiple provider reasoning response items with no intervening normalized boundary event.
- Completed reasoning item snapshots as the sole source of displayed and persisted reasoning-summary content.
- Receipt of `item/reasoning/summaryTextDelta` while a block is absent or active; both cases must remain no-effect.
- Reasoning separated by a newly created ordered tool/non-reasoning card, assistant text, or a turn lifecycle boundary.
- Reasoning before and after result/status/log/completion updates to a tool card that was created earlier in the ordered conversation.
- Result-first tool terminal events that infer/create a missing ordered tool card.
- Missing or repeated provider item/event IDs before and after a boundary.
- Codex compaction/status/progress notifications that do not produce transcript content and therefore must not create artificial Thinking boundaries.
- Approval, local-tool, tool-log, and raw tool-output notification paths that may be the first observed tool boundary.
- Reloaded/history rendering of runs produced after this fix.
- Empty reasoning lifecycle events.

## Out of Scope

- Changing model reasoning effort, summary content, or provider-internal response-item production.
- Exposing hidden chain-of-thought beyond summaries already emitted by Codex.
- Redesigning the Thinking disclosure component or unrelated work-trace cards.
- Changing token accounting.
- Supporting, modernizing, conditionally enabling, or planning future support for `item/reasoning/summaryTextDelta`; it is intentionally and permanently unsupported.
- Correcting, migrating, re-projecting, or otherwise changing pre-fix historical runs and traces.

## Functional Requirements

- `REQ-CTB-001` Preserve durable evidence identifying the upstream event sequence, AutoByteus normalized/history sequence, and responsible code boundary for the reported reproduction.
- `REQ-CTB-002` Adjacent non-empty reasoning fragments in the same agent run and turn with no intervening **new ordered conversation entry** shall form one contiguous thinking block regardless of provider response-item IDs, transport chunks, or in-place lifecycle updates to an already-positioned tool card.
- `REQ-CTB-003` Creation of a new ordered tool/non-reasoning card, assistant-text event, turn start/completion, or terminal runtime error shall end the current thinking block; later reasoning shall start a new block. Result/status/log/completion updates to an existing tool card and provider maintenance/status/progress events—including compaction—shall not end it.
- `REQ-CTB-004` For runs produced after this fix, live streaming and reloaded/history views shall apply equivalent grouping semantics.
- `REQ-CTB-005` Grouping shall preserve all supported completed reasoning-summary snapshots exactly once, in source order, with a semantic separator between completed provider summary fragments.
- `REQ-CTB-006` The frontend shall remain runtime-agnostic and continue to trust normalized segment/projection semantics rather than detecting Codex item IDs or event names.
- `REQ-CTB-007` Empty reasoning events shall remain invisible and existing non-reasoning rendering/lifecycle behavior shall remain unchanged.
- `REQ-CTB-008` Every newly created normalized reasoning block shall receive a distinct collision-safe ID within and across converter instances; only the currently active block may reuse its ID, and provider item/event IDs shall be correlation inputs rather than normalized block identity.
- `REQ-CTB-009` Future persistence shall preserve the same ordered-card boundary semantics: a matching result for an already-recorded tool call shall not flush the active reasoning trace, while a result-first event that creates an inferred tool call shall flush before that newly created ordered tool entry.
- `REQ-CTB-010` Completed reasoning item snapshots shall be the sole supported content source for displayed and persisted reasoning summaries. `item/reasoning/summaryTextDelta` shall be intentionally ignored, emit no content, and have no effect on block identity, content, boundary, or lifecycle state now or in future implementations.

## Acceptance Criteria

- `AC-CTB-001` Investigation evidence documents that the exact reported turn contains five consecutive Codex provider reasoning response items, one canonical `thread/read` reasoning item, five AutoByteus projection reasoning entries, and five current UI cards.
- `AC-CTB-002` Unit coverage proves that two or more consecutive Codex reasoning items with different stable provider item IDs resolve to one normalized reasoning segment identity until a boundary occurs.
- `AC-CTB-003` Given three adjacent reasoning fragments in one turn, live conversation state contains/renders exactly one `Thinking` block whose content contains each fragment once and in order.
- `AC-CTB-004` Given reasoning, then creation of a new Codex tool/non-reasoning card or assistant text, then reasoning in the same turn, live conversation state contains/renders two `Thinking` blocks with different normalized IDs in correct order. This remains true when provider item/event identity is absent or repeats.
- `AC-CTB-005` A run produced after the fix persists one reasoning trace for one contiguous reasoning block, and its GraphQL projection/hydrated conversation renders one `Thinking` block after reload.
- `AC-CTB-006` The same newly produced run has equivalent thinking-block boundaries before and after reload/history hydration.
- `AC-CTB-007` Empty reasoning and existing tool-card data/status/result rendering, assistant-message, media, error, notification, inter-agent-message, and turn lifecycle behavior pass regression coverage; only the reasoning grouping boundary around in-place tool updates changes.
- `AC-CTB-008` No reasoning content is dropped, duplicated, reordered, or merged across agent runs, team members, or turns.
- `AC-CTB-009` Event-family sequence coverage proves: reasoning lifecycle events preserve/append; new ordered item/tool/text and lifecycle-terminal events clear; matching tool result/status/log/completion updates preserve; compaction/status/progress and ignored notifications have no active-block effect; and an actual boundary without a turn ID clears conservatively.
- `AC-CTB-010` For `tool start -> reasoning A -> matching tool result -> reasoning B -> next ordered boundary`, live state contains one Thinking block with `A+B`; persistence contains one corresponding reasoning trace; and GraphQL projection/hydration renders the same one block. A result-first event still creates a tool-call boundary before later reasoning.
- `AC-CTB-011` Regression coverage proves that `item/reasoning/summaryTextDelta` received before, during, and after an active reasoning block emits no normalized event, contributes no displayed or persisted text, allocates no block ID, and neither clears nor otherwise changes active reasoning-block or ordered-tool state; completed reasoning item snapshots continue to provide each supported summary exactly once and in source order.

## Constraints / Dependencies

- Codex App Server protocol behavior is an upstream fact; `thread/read` is useful corroboration but AutoByteus owns its normalized live/replay contract.
- Existing frontend architecture states that provider adapters own semantically correct segment IDs and frontend handlers trust them.
- Stored raw traces are audit evidence and must not be rewritten for presentation cleanup.
- The implementation must not log or expose non-summary hidden reasoning.
- The adapter must not register a content handler, fallback, compatibility path, or feature switch for `item/reasoning/summaryTextDelta`; explicit ignored-event dispatch must leave all block state unchanged.
- Tests may use sanitized summary text and identifiers; no production reasoning content belongs in fixtures.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Future agent/team member `raw_traces*.jsonl` written from normalized live events.
- Required outcome: `Not Affected`
- Runtime writer note: a bounded flush-timing behavior change is required, but stored schema and pre-fix data remain unchanged.
- Existing data to preserve, discard/rebuild, transform, or quarantine: None in scope. Pre-fix historical runs remain untouched and may retain fragmented reasoning rows.
- Unacceptable data loss or corruption: For future runs, dropping, duplicating, reordering, or cross-turn merging content.
- Relevant availability, maintenance-window, or rollout constraints: None; the storage schema and reader remain unchanged. The writer must stop flushing open reasoning on a result for an already-recorded tool call, while retaining result-first inferred-call ordering.
- Related requirement and acceptance-criteria IDs: `REQ-CTB-004`, `REQ-CTB-005`, `REQ-CTB-008`, `REQ-CTB-009`, `REQ-CTB-010`, `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-008`, `AC-CTB-009`, `AC-CTB-010`, `AC-CTB-011`.

## Assumptions

- A new ordered conversation card/segment, assistant-text event, turn lifecycle boundary, or terminal runtime error—not every tool lifecycle update—ends the active normalized reasoning block.
- Matching tool results, statuses, and logs update the tool card at its original call position; they do not insert a new ordered card at result-arrival time.
- Provider compaction, status, token-usage, diff, task-progress, and ignored notifications do not create transcript content and therefore do not split a Thinking block.
- Existing join convention of a blank line between completed reasoning summaries is acceptable and readable.
- Completed reasoning item snapshots contain the supported user-visible summary; real-time internal-thinking streaming is not a product requirement.
- The exact reported run remains representative of GPT-5.6-Sol behavior.

## Risks / Open Questions

- The packaged candidate proves the prior event-family matrix was too broad: terminal tool updates clear the reasoning tracker and the memory accumulator even though the UI updates an earlier card in place.
- Accidental future routing of `item/reasoning/summaryTextDelta` into the content normalizer would violate the permanent product rule. Mitigation: explicit no-effect dispatch plus state/content regression coverage in `AC-CTB-011`.
- Pre-fix historical runs will continue to show their prior segmentation; this is explicitly accepted by the user and is not residual in-scope work.

## Requirement-To-Use-Case Coverage

- Exact diagnosis: `REQ-CTB-001`.
- Live adjacent grouping: `REQ-CTB-002`, `REQ-CTB-005`, `REQ-CTB-006`, `REQ-CTB-007`.
- Boundary preservation: `REQ-CTB-003`, `REQ-CTB-007`.
- Collision-safe normalized identity: `REQ-CTB-008`.
- Future live/reload parity: `REQ-CTB-004`, `REQ-CTB-005`.
- In-place tool lifecycle and persistence parity: `REQ-CTB-003`, `REQ-CTB-009`.
- Completed-snapshot-only content and permanent delta non-support: `REQ-CTB-005`, `REQ-CTB-010`.

## Acceptance-Criteria-To-Scenario Intent

- Evidence reproduction: `AC-CTB-001`.
- Adapter identity invariant: `AC-CTB-002`.
- Adjacent live merge: `AC-CTB-003`.
- Visible-boundary split: `AC-CTB-004`.
- Future persisted projection: `AC-CTB-005`.
- Future live/reload parity: `AC-CTB-006`.
- Non-reasoning/empty regressions: `AC-CTB-007`.
- Content integrity and isolation: `AC-CTB-008`.
- Collision-safe identity and complete boundary matrix: `AC-CTB-004`, `AC-CTB-009`.
- Long-running tool/result update regression: `AC-CTB-010`.
- Unsupported delta no-effect/content integrity: `AC-CTB-011`.

## Approval Status

The user rejected the packaged candidate on 2026-07-11 after observing consecutive Thinking cards in a new run. Exact evidence shows matching tool-result updates split the blocks even though they update an earlier tool card. On 2026-07-11, the user approved the corrected ordered-card boundary. Architecture Round 3 then required the package to reflect the user's permanent rejection of `summaryTextDelta` support and to refresh the formal design-health/spine model. After reviewing the implementation-complexity tradeoff, the user approved these bounded corrections and authorized architecture re-review on 2026-07-11.
