# Requirements Doc

## Status

`Refined — User-Approved Direction; Architecture Round 1 Safety Clarifications Applied`

## Goal / Problem Statement

Fix the AutoByteus behavior that renders several adjacent `Thinking` cards for one contiguous reasoning phase when Codex App Server team agents use GPT-5.6-Sol. Determine upstream versus AutoByteus responsibility, then make future live runs—and reloads of those future runs—render one card for adjacent reasoning fragments while preserving real tool/text/turn boundaries.

## Investigation Findings

The behavior is an **AutoByteus normalization bug**, not a frontend CSS duplication and not solely a model bug.

- The exact screenshot reproduction was located in team run `software_engineering_team_15eb25f9280f4cc0910708e1495c53a4`, member run `solution_designer_4209b1ca0cdd48858d859c641b86ad34`, turn `019f4f1e-8e8f-70b3-9c83-19854d25258c`.
- The Codex rollout contains five distinct consecutive provider `reasoning` response items with summary-part counts `3, 3, 3, 3, 2`, followed by the assistant message, with no tool or assistant item between them.
- A direct `codex app-server` `thread/read(includeTurns=true)` call for the same thread/turn returns only `userMessage -> reasoning(14 summary parts) -> agentMessage`. Codex therefore folds those provider response items into one logical reasoning item in its canonical history view.
- The running AutoByteus GraphQL projection returns `user -> reasoning -> reasoning -> reasoning -> reasoning -> reasoning -> assistant` for the same turn, exactly matching the five UI cards.
- `CodexReasoningSegmentTracker` currently prefers each stable provider item ID before consulting its per-turn active reasoning block. Each completed provider item therefore becomes a distinct normalized segment ID.
- The frontend correctly follows the current backend identity contract: `segmentHandler.ts` creates one `ThinkSegment` for each unseen `(segment_type, id)`, `runProjectionConversation.ts` creates one for each reasoning history row, and `AIMessage.vue` renders each segment. The frontend is not duplicating one object.
- Current direct probing also showed Codex CLI `0.144.1` emits `item/reasoning/summaryTextDelta`; the current adapter relies on completed snapshots for this path. That streaming-cadence mismatch is recorded as a separate residual risk because it does not cause the five-card segmentation.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/consecutive-thinking-blocks/tickets/in-progress/consecutive-thinking-blocks/thinking-block-grouping-ui-spec.md` | UI/interaction specification for contiguous block boundaries, joining, live/replay parity, and non-happy states | `REQ-CTB-002`–`REQ-CTB-005`, `REQ-CTB-008` | `AC-CTB-003`–`AC-CTB-007`, `AC-CTB-009` | Approved user direction; Round 1 safety clarification applied | Clarifies the observable behavior here; does not replace these requirements or `design-spec.md` |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Local Implementation Defect` plus bounded `File Placement Or Responsibility Drift` around the reasoning parser/tracker API
- Refactor posture: `Likely Needed` — bounded to the Codex reasoning normalizer/tracker naming and singular update contract
- Evidence basis: The correct Codex adapter boundary and per-turn state already exist, but the ID-only tracker and parser-only facade names/APIs cannot coherently own provider-item transitions plus content joining. The bounded refactor keeps authority in the same subsystem while making one singular block-update contract. Pre-fix historical runs are explicitly outside the approved scope and may retain their existing fragmented presentation.
- Requirement or scope impact: Correct the Codex live identity rule for future runs; do not add provider-specific grouping logic to the Vue renderer or remediation logic for pre-fix history.

## Recommendations

- Keep the Codex adapter as the authoritative live segment-identity owner.
- Reuse one active reasoning segment ID for consecutive reasoning provider items in the same turn until a transcript-producing non-reasoning/tool event, assistant text, or turn lifecycle boundary clears it.
- Allocate normalized reasoning block IDs independently from provider item/event IDs so every new block is distinct even when provider identity is missing or repeated.
- Keep frontend handlers simple and runtime-agnostic; add regression coverage proving future live output and reload of the newly persisted run remain equivalent.
- Treat current `summaryTextDelta` protocol coverage as a separate follow-up unless implementation reveals it must change to satisfy non-duplication.

## Scope Classification

`Medium` — the production defect and refactor are localized to Codex event normalization. The corrected normalized output then flows through the existing memory, history, and frontend consumers without production changes in those subsystems.

## In-Scope Use Cases

- Live Codex App Server agent and team-member turns with reasoning enabled.
- Multiple provider reasoning response items with no intervening normalized boundary event.
- Reasoning separated in the Codex event stream by assistant text, a transcript-producing tool/non-reasoning item, or a turn lifecycle boundary.
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
- General protocol modernization for `item/reasoning/summaryTextDelta`, except if strictly necessary to prevent duplication in the in-scope grouping fix.
- Correcting, migrating, re-projecting, or otherwise changing pre-fix historical runs and traces.

## Functional Requirements

- `REQ-CTB-001` Preserve durable evidence identifying the upstream event sequence, AutoByteus normalized/history sequence, and responsible code boundary for the reported reproduction.
- `REQ-CTB-002` Adjacent non-empty reasoning fragments in the same agent run and turn with no intervening normalized transcript boundary (transcript-producing tool/non-reasoning event, assistant text, or turn lifecycle boundary) shall form one contiguous thinking block regardless of provider response-item IDs or transport chunk boundaries.
- `REQ-CTB-003` A transcript-producing tool/non-reasoning event, assistant-text event, turn start/completion, or terminal runtime error shall end the current thinking block; later reasoning shall start a new block. Provider maintenance/status/progress events that emit no transcript content—including compaction—shall not end the block.
- `REQ-CTB-004` For runs produced after this fix, live streaming and reloaded/history views shall apply equivalent grouping semantics.
- `REQ-CTB-005` Grouping shall preserve all reasoning summary content exactly once, in source order, with a semantic separator between completed provider summary fragments and no artificial separator between deltas of the same fragment.
- `REQ-CTB-006` The frontend shall remain runtime-agnostic and continue to trust normalized segment/projection semantics rather than detecting Codex item IDs or event names.
- `REQ-CTB-007` Empty reasoning events shall remain invisible and existing non-reasoning rendering/lifecycle behavior shall remain unchanged.
- `REQ-CTB-008` Every newly created normalized reasoning block shall receive a distinct collision-safe ID within and across converter instances; only the currently active block may reuse its ID, and provider item/event IDs shall be correlation inputs rather than normalized block identity.

## Acceptance Criteria

- `AC-CTB-001` Investigation evidence documents that the exact reported turn contains five consecutive Codex provider reasoning response items, one canonical `thread/read` reasoning item, five AutoByteus projection reasoning entries, and five current UI cards.
- `AC-CTB-002` Unit coverage proves that two or more consecutive Codex reasoning items with different stable provider item IDs resolve to one normalized reasoning segment identity until a boundary occurs.
- `AC-CTB-003` Given three adjacent reasoning fragments in one turn, live conversation state contains/renders exactly one `Thinking` block whose content contains each fragment once and in order.
- `AC-CTB-004` Given reasoning, then any transcript-producing Codex tool/non-reasoning or assistant-text boundary path, then reasoning in the same turn, live conversation state contains/renders two `Thinking` blocks with different normalized IDs in correct order. This remains true when provider item/event identity is absent or repeats.
- `AC-CTB-005` A run produced after the fix persists one reasoning trace for one contiguous reasoning block, and its GraphQL projection/hydrated conversation renders one `Thinking` block after reload.
- `AC-CTB-006` The same newly produced run has equivalent thinking-block boundaries before and after reload/history hydration.
- `AC-CTB-007` Empty reasoning, tool-call/result, assistant-message, media, error, notification, inter-agent-message, and turn-boundary behavior passes existing regression coverage unchanged.
- `AC-CTB-008` No reasoning content is dropped, duplicated, reordered, or merged across agent runs, team members, or turns.
- `AC-CTB-009` Event-family sequence coverage proves: reasoning lifecycle events preserve/append the active block; transcript-producing item/tool/text and lifecycle-terminal events clear it; compaction/status/progress and ignored notifications have no active-block effect; a boundary without a turn ID clears conservatively rather than permitting cross-boundary reuse.

## Constraints / Dependencies

- Codex App Server protocol behavior is an upstream fact; `thread/read` is useful corroboration but AutoByteus owns its normalized live/replay contract.
- Existing frontend architecture states that provider adapters own semantically correct segment IDs and frontend handlers trust them.
- Stored raw traces are audit evidence and must not be rewritten for presentation cleanup.
- The implementation must not log or expose non-summary hidden reasoning.
- Tests may use sanitized summary text and identifiers; no production reasoning content belongs in fixtures.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Future agent/team member `raw_traces*.jsonl` written from normalized live events.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: None in scope. Pre-fix historical runs remain untouched and may retain fragmented reasoning rows.
- Unacceptable data loss or corruption: For future runs, dropping, duplicating, reordering, or cross-turn merging content.
- Relevant availability, maintenance-window, or rollout constraints: None; the storage schema and reader remain unchanged, while corrected live segment identity naturally writes one reasoning trace per contiguous block.
- Related requirement and acceptance-criteria IDs: `REQ-CTB-004`, `REQ-CTB-005`, `REQ-CTB-008`, `AC-CTB-005`, `AC-CTB-006`, `AC-CTB-008`, `AC-CTB-009`.

## Assumptions

- A transcript-producing Codex tool/non-reasoning event, assistant-text event, turn lifecycle boundary, or terminal runtime error—not an upstream reasoning response-item ID alone—ends the active normalized reasoning block.
- Provider compaction, status, token-usage, diff, task-progress, and ignored notifications do not create transcript content and therefore do not split a Thinking block.
- Existing join convention of a blank line between completed reasoning summaries is acceptable and readable.
- The exact reported run remains representative of GPT-5.6-Sol behavior.

## Risks / Open Questions

- The current converter clears ordinary item/text/turn paths but distributes that policy across early returns. The revised design must centralize an explicit event-family decision and cover compaction, approval/local-tool, raw tool-output, ignored, and lifecycle paths.
- Current Codex reasoning delta method names differ from part of the adapter enum. This may affect streaming cadence but is not the demonstrated cause of segmentation.
- A focused implementation test must prove that completion snapshots do not duplicate already streamed content if protocol delta support is touched.
- Pre-fix historical runs will continue to show their prior segmentation; this is explicitly accepted by the user and is not residual in-scope work.

## Requirement-To-Use-Case Coverage

- Exact diagnosis: `REQ-CTB-001`.
- Live adjacent grouping: `REQ-CTB-002`, `REQ-CTB-005`, `REQ-CTB-006`, `REQ-CTB-007`.
- Boundary preservation: `REQ-CTB-003`, `REQ-CTB-007`.
- Collision-safe normalized identity: `REQ-CTB-008`.
- Future live/reload parity: `REQ-CTB-004`, `REQ-CTB-005`.

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

## Approval Status

Requirements direction and the future-runs-only scope were approved by the user on 2026-07-11. Architecture Round 1 safety clarifications make ID allocation and existing boundary intent executable without expanding historical, frontend, or `summaryTextDelta` scope.
