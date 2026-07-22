# Agent Event Monitor Transient Tool-Rendering Bug Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — the live disappearance is reproduced, the first faulty contract boundary is identified, persisted data is proven directly usable, and the user approved this requirements basis on 2026-07-22.

## Goal / Problem Statement

The Event Monitor must remain a truthful, chronologically stable view of a running agent. A tool card that belongs to the retained recent window must not appear, disappear merely because a later Thinking block arrives, and then reappear. Switching to another active agent/member must not expose a cached feed dominated by stale Thinking blocks that incorrectly displaced intervening tools.

Investigation shows this is not slow Vue rendering or a slow final projection. Codex groups completed provider reasoning snapshots into logical Thinking blocks, but when a real boundary closes a block, the adapter drops the block identity without emitting the generic segment-completion event. The frontend therefore treats every such Thinking block as still mutable. In a full 100-visual window, completed tools are intentionally evicted before these falsely mutable Thinking blocks.

The required outcome is to complete Codex logical reasoning blocks through the existing generic lifecycle at the provider-adapter boundary, while preserving the current grouping, ordering, UI, selection behavior, recent-window bound, and stored history.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Selecting an active Codex solution designer can expose a live cached context in which prior window commits removed tools and retained many stale-mutable Thinking blocks. | A deterministic interleaved live sequence remains chronologically coherent in cached state, so switching to it does not require a later repair before intervening tools appear. | Immediate selection/focus, team-member identity, existing hydration/loading behavior, and final feed visuals remain unchanged. | `REQ-001`, `REQ-004`; `AC-001`, `AC-002` |
| `BEH-002` | A terminal tool can be visible at the window limit, then be completed-first evicted when a later Codex Thinking segment arrives because earlier Thinking blocks never became presentation-complete. | Closed Thinking blocks participate in the normal completed population. A retained tool disappears only through the ordinary deterministic oldest-event/window rule or an explicit whole-presentation reset, not because stale Thinking was falsely protected. | Latest-100 bound and completed-first protection for genuinely mutable events remain unchanged. | `REQ-001`, `REQ-003`, `REQ-004`; `AC-001`, `AC-003` |
| `BEH-003` | Several completed provider reasoning snapshots intentionally share one logical Thinking identity. Existing real user/text/first-tool/turn/error boundaries clear that identity but emit no `SEGMENT_END`. | Snapshots still group into one block. The first real boundary emits exactly one matching generic completion before its boundary event(s); matching updates for an already-created tool do not close the block. | Provider snapshot dedupe, grouping separators, tool lifecycle placement, and current boundary classification remain unchanged. | `REQ-001`, `REQ-002`; `AC-003`, `AC-004` |
| `BEH-004` | A completed reasoning snapshot with no correlatable turn, or an active block discarded by reachable turn-start/error global cleanup, can be abandoned without lifecycle completion. | Every content-bearing logical block on a supported path reaches exactly one terminal lifecycle outcome. An uncorrelatable completed snapshot is completed immediately; reachable global lifecycle cleanup returns and closes every affected active identity deterministically. | Missing/duplicate provider payload tolerance and the defensive 128-turn tracker-capacity guard remain unchanged. | `REQ-002`, `REQ-005`; `AC-004` |
| `BEH-005` | Existing raw traces and settled projections are ordered, tool-inclusive, and directly readable. | Existing and newly written history remain directly readable with the same semantic reasoning/tool order and no duplicate reasoning record. | GraphQL shape, stored schema, archive behavior, active-only source, and projection format remain unchanged. | `REQ-006`; `AC-005`, `AC-006` |

## Investigation Findings

1. The exact live failure was reproduced: with 99 incomplete Thinking segments and one terminal tool, appending the 100th incomplete Thinking segment evicted the tool (`completedEvictions=1`) and left 100 Thinking segments in the canonical frontend conversation.
2. Codex reasoning conversion emits `SEGMENT_CONTENT` only. Its tracker recognizes real boundaries but `clearForTurn`/`clearAll` return `void` and silently discard the active segment identity.
3. The generic frontend correctly marks Think/text presentation complete only when the containing message completes or a matching `SEGMENT_END` arrives.
4. Real supported runs cross the trigger threshold. The reported solution designers contained turns with 173 and 385 reasoning+tool visuals.
5. Six final GraphQL projection probes returned in under 0.02 seconds and consistently contained reasoning/tool entries. A coherent hydrated B -> A browser switch completed in about 53 ms without a Thinking-only transient.
6. The 5-second workspace-tree refresh updates tree metadata only and does not rewrite conversations. No selection timer, forced render, or delayed component-loading fix is justified.
7. Existing raw traces require no migration. The new lifecycle end can flush future reasoning at the same semantic boundary, while current readers remain version-agnostic.
8. Git history classifies this as a latent existing lifecycle bug exposed by a newer feature interaction: grouped Codex reasoning began silently dropping closure identities on 2026-07-11, while the completed-first latest-100 Event Monitor window arrived on 2026-07-18 and made the bad state visibly evict tools.

Detailed commands, code paths, counts, runtime setup, and residual uncertainty are recorded in `investigation-notes.md` and `evidence/investigation/runtime-probes-20260722.txt`.

## Relevant Supplemental Task Artifacts

None. No new UI or user-interaction specification is needed. Screenshots and sanitized probes are evidence only and are inventoried in `investigation-notes.md`.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Needed` — bounded to Codex reasoning lifecycle ownership and event ordering.
- Evidence basis: The provider adapter owns the grouped reasoning identity and already decides every real boundary, but its clear APIs discard that identity instead of completing the generic lifecycle. The frontend and window policy correctly consume the contract they receive.
- Requirement or scope impact: Correct the Codex adapter/normalizer; do not distribute provider-specific recovery across selection, hydration, Event Monitor state, or Vue rendering.

## Recommendations

1. Make closure of a Codex logical reasoning block an explicit typed lifecycle result rather than a `void` tracker clear.
2. Emit one generic `SEGMENT_END` for each closed content-bearing block before the event(s) that caused the boundary.
3. Keep multiple provider-completed reasoning snapshots mutable as one logical block until a real ordered boundary; do not end each snapshot individually.
4. Complete a missing-turn snapshot immediately because it cannot safely participate in later grouping, and make reachable turn-start/error global cleanup consume and close the active identity.
5. Preserve the generic web lifecycle/retention code without Codex-specific conditions.
6. Prove server conversion order, live recent-window stability, and memory trace non-duplication with focused durable coverage.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`. The implementation is bounded, but correctness spans provider conversion, generic lifecycle ordering, frontend retention consequence, and future trace persistence.

## In-Scope Use Cases

1. A long Codex run alternates grouped Thinking blocks and tool calls beyond the 100-visual live window.
2. A tool reaches terminal status and later reasoning arrives.
3. The user switches to an already-running standalone or team-member Codex context after long live activity.
4. Multiple completed provider reasoning snapshots belong to one logical Thinking block before the next real ordered boundary.
5. A real boundary is a user/non-reasoning item, assistant text, first creation of an ordered tool card (including result-first creation), turn completion/start, or terminal error as classified by the current adapter.
6. Matching lifecycle updates to an existing tool occur between reasoning snapshots and must not split the block.
7. A completed reasoning snapshot lacks a usable turn identity, or reachable turn-start/error global cleanup closes the active block.
8. Runtime memory persists and later projects reasoning/tool history after the new end event.

## Out of Scope

- Redesigning Thinking or tool-card visuals.
- Changing Event Monitor selection/focus UX, adding a loader, or delaying display.
- Changing the latest-100, resident-300, active-only, page-size, cursor, archive, or zero-layout contracts.
- Adding a Codex-specific frontend completion heuristic, timeout, forced remount, duplicate shadow state, or projection refresh.
- Reclassifying the existing ordered-boundary matrix without separate evidence.
- Rewriting or migrating existing raw traces, snapshots, manifests, or archives.
- Claiming a specific 3–10 second repair trigger that was not independently captured.

## Functional Requirements

- `REQ-001` The Codex provider adapter must emit the existing generic segment-completion lifecycle for every content-bearing logical reasoning block when the adapter recognizes that block's real ordered boundary.
- `REQ-002` A logical reasoning block must have exactly one terminal outcome. Multiple completed provider snapshots may append to the same identity before a boundary; after completion, no later content may append to that identity. Duplicate/no-effect boundary notifications must not emit duplicate completion.
- `REQ-003` The reasoning completion event must precede the user/text/tool/turn/error event(s) whose arrival closed the block, so generic consumers observe a valid ordered lifecycle.
- `REQ-004` With valid completion state, the existing recent-window policy must retain/evict Thinking and tools according to ordinary chronological/completion rules. A retained tool must not be removed solely because a later closed Thinking block was falsely classified mutable.
- `REQ-005` Missing-turn reasoning and reachable global lifecycle cleanup must not abandon content-bearing stream identities. Missing-turn content must receive an immediate matching completion; turn-start/error global cleanup must surface every active identity it closes for deterministic completion. The defensive tracker-capacity guard is unchanged and is not an implementation premise for this ticket.
- `REQ-006` Existing raw traces and projections must remain directly usable without migration. Future reasoning persistence must remain exactly-once per logical block and preserve tool/reasoning order.
- `REQ-007` The fix must not alter UI components, GraphQL/WebSocket message shapes, selection/hydration coordination, window limits, or provider-neutral frontend completion policy except for focused coverage required to prove the corrected existing contract.

## Acceptance Criteria

- `AC-001` A deterministic live fixture contains more than 100 interleaved Codex reasoning/tool visuals. At each committed presentation, every tool inside the ordinary retained latest window remains present in chronological position; a tool leaves only when it becomes the deterministic oldest eligible event under the unchanged bound. The pre-fix tool-visible -> later-Think -> tool-missing sequence fails before and passes after the correction.
- `AC-002` Selecting a deterministic long-running standalone Codex context and a focused Codex team-member context produces the same coherent retained order as their current canonical state without a multi-second Thinking-only intermediate state that later repairs itself. No selection timer, forced rerender, or extra projection request is introduced.
- `AC-003` For two or more completed provider reasoning snapshots in one turn before a real boundary, conversion emits content updates with one stable reasoning ID, no premature end, then exactly one `SEGMENT_END` with that ID before the boundary event. A later reasoning block receives a new ID.
- `AC-004` The current supported boundary matrix is covered: user/non-reasoning item start, assistant text, first ordered-tool creation/result-first creation, turn completion/start, and terminal error close active blocks; matching updates to an existing tool and current no-effect/preserve cases do not. Missing-turn content is immediately ended, and reachable global clear closes every active identity deterministically.
- `AC-005` Runtime memory/projection coverage proves that adding the end event writes one reasoning trace/snapshot contribution per logical block, does not duplicate or fragment it when the following tool/turn boundary is processed, and preserves reasoning/tool chronological order.
- `AC-006` Existing GraphQL projection, active-trace paging, recent-window, archive exclusion, collapsed disclosure, zero-layout control, localization/accessibility, and storage suites remain valid. No persisted-data migration or compatibility path is added.

## Constraints / Dependencies

- Repository changes must remain in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker` until delivery.
- The installed Electron application and user data are not implementation sandboxes; use generated fixtures or isolated repository environments for mutation.
- `SEGMENT_END` identity and turn attribution must match the preceding reasoning content exactly.
- Boundary emission order must be explicit and testable even when sub-converters return multiple events.
- The fix must preserve the nuanced distinction between first ordered-tool creation and later updates of the same tool.
- Sensitive conversation/tool content must not be copied into ticket evidence.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing per-run raw traces, active traces, manifests, and working-context snapshots under the server data directory.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve: All existing history files unchanged; readers continue to project them normally.
- Future write behavior: A reasoning block may flush on its explicit end rather than on the following tool/turn event, but it must preserve one logical reasoning trace and order.
- Unacceptable data loss or corruption: Any rewrite, duplicate reasoning record, fragmentation of one grouped block, tool/reasoning reorder, or archive loss.
- Availability/rollout constraints: No maintenance window or data rewrite is required.
- Related IDs: `REQ-006`; `AC-005`, `AC-006`.

## Assumptions

- “Tool card” includes collapsed run/edit/write/MCP/web-search-style rows in the central Event Monitor.
- The user's selection screenshot captured a live cached state that had already experienced the reproduced window/lifecycle interaction; the exact later repair event remains observationally unknown.
- Existing ordered-boundary classification is semantically correct; this ticket makes its lifecycle consequence explicit rather than redefining when grouping ends.

## Risks / Open Questions

- Event construction/return ordering must not create a completion event after its boundary merely because a sub-converter callback is used.
- Missing-turn content and its immediate end must share the same segment identity and compatible fallback turn attribution.
- `MP-CAP-001` is `Not Reachable` in the supported sequential converter lifecycle: reaching more than 128 simultaneously active turn IDs requires synthetic/out-of-contract injection because `TURN_STARTED` globally clears prior active blocks. Retain the defensive guard unchanged; do not add lifecycle machinery or acceptance scope for it.
- New end events reach runtime memory as well as the browser; exactly-once persistence needs explicit proof.
- The exact later tool reappearance mechanism is not captured. This does not block the correction because the destructive live disappearance and its first faulty boundary are deterministic.

## Requirement-To-Use-Case Coverage

- Long live interleaving beyond 100: `REQ-001`, `REQ-003`, `REQ-004`, `REQ-007`
- Switch to active standalone/team member: `REQ-004`, `REQ-007`
- Multi-snapshot logical Thinking block: `REQ-001`, `REQ-002`, `REQ-003`
- Matching tool lifecycle updates: `REQ-002`, `REQ-003`
- Missing-turn/reachable global cleanup: `REQ-002`, `REQ-005`
- Persist/project future history: `REQ-006`, `REQ-007`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001`: Cross-boundary long live-window disappearance regression.
- `AC-002`: Standalone and focused-team selection observation using coherent canonical state.
- `AC-003`: Core grouping -> one ordered completion -> new block converter scenario.
- `AC-004`: Supported boundary/preserve/missing-turn/reachable-clear-all contract matrix.
- `AC-005`: Runtime-memory and projection exactly-once persistence scenario.
- `AC-006`: Existing API/UI/history regression preservation.

## Approval Status

`Approved by the user on 2026-07-22.` The approval applies to this requirements doc. No behavior-defining supplemental artifact exists for this ticket.
