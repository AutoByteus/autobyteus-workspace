# Agent Event Monitor Recent-Activity Performance Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — the user approved the recent-only Event Monitor behavior and removal of the conversation copy control on 2026-07-18.

## Goal / Problem Statement

Opening an agent or team-member row currently reconstructs and transports the run's complete raw-trace corpus, including every completed archive segment, and the frontend then deduplicates, retains, and mounts the resulting unbounded history. Long-running agents therefore make row selection slow and produce an unusably long Event Monitor scrollbar.

The normal Event Monitor must instead be a fast rolling window over only the active raw-trace file. It must show and retain at most 100 recent visual events, continue rolling as live events arrive, preserve still-mutable event identities when completed events are available for eviction, and never consult archived raw-trace segments for this surface. Archived files remain stored but are not exposed by a new archive-navigation experience. The unused conversation copy control must be removed.

## Investigation Findings

1. `LocalMemoryRunViewProjectionProvider` currently calls `getRunMemoryView` with `includeArchive: true` and no limit. The storage layer reads all complete archived segments plus `raw_traces_active.jsonl`, deduplicates and sorts them, and the projection layer reconstructs the whole corpus.
2. The GraphQL projection queries have no window argument; they return all `conversation[]` and `activities[]` entries. Tool arguments/results are duplicated between the two arrays.
3. A real archived `x_marketer` run returned 1,725 conversation entries plus 794 Activity entries in a 47,537,621-byte response. The current frontend conversation dedupe took about 27.9 seconds for those 1,725 entries in an exact local benchmark.
4. The conversation feed mounts every message and assistant segment; the Activity feed separately mounts every Activity record. Neither retained state nor DOM work has a duration-independent bound.
5. Source inspection confirms that successful compaction rotates the settled prefix into an archive and rewrites the active file from the compaction boundary forward. The active file is therefore the correct normal recent-activity source. It is not a formal hard size bound when compaction has not happened: the largest observed active-only file was about 5.08 MB / 988 records and projected to a 9.09 MB GraphQL response with 609 conversation entries and 379 activities. Its current frontend conversation dedupe still took about 906 ms.
6. Active team restore currently requests projections for all members, and active standalone discovery can hydrate unselected runs. Making every normal projection active-only and server-bounded prevents those background paths from reintroducing archive-scale work even before a row is focused.
7. The workspace header contains a separate `CopyButton` and eagerly constructs a full joined conversation string. The user stated that this control is unused and explicitly requested its removal.
8. Architecture review finding `AR-001` identified that a simple oldest-edge trim contradicts the requirement to evict completed events before still-mutable ones. The refined contract below defines completion by visual kind, completed-candidate eviction, and a deterministic hard-cap fallback for the reachable case of more than 100 concurrently mutable events.
9. Architecture review finding `AR-002` identified that `conversation.updatedAt` changes for non-visible protocol traffic and therefore cannot drive the unseen-activity button. The refined contract requires an explicit visible-presentation revision emitted only after an actual bounded center-feed change.
10. Implementation source review finding `CR-001` proved that a transient append can report a handler change and then be synchronously evicted by completed-first enforcement, leaving the final bounded presentation identical while the reviewed effect-OR-eviction contract still increments the revision. Revision decisions must therefore compare the net bounded presentation before the mutation with the final bounded presentation after enforcement.
11. Implementation source review finding `CR-002` found an existing team reopen path that replaces a reused member conversation without resetting the presentation baseline. Every conversation/context replacement path must reset the revision baseline unless subscribed live runtime state is intentionally preserved.
12. Architecture review finding `AR-003` proved the first witness field proposal was broader than the actual central card: tool results/logs are Activity-only, and raw argument-object replacement can leave the derived command/path/text summary unchanged. The refined witness contract is semantic and central-render-specific; these non-visible changes must remain no-ops while real card/static/media/error/inter-agent/usage/compaction changes remain detectable.

Detailed evidence is recorded in `investigation-notes.md`. Observable behavior is specified in `history-window-ui-ux-spec.md`.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md` | UI/UX specification for the rolling recent Event Monitor, scrolling behavior, and copy-control removal | `REQ-001`–`REQ-008` | `AC-001`–`AC-011` | `Refined`; user-approved 2026-07-18 | Clarifies observable UI behavior; this requirements doc remains authoritative |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Performance`, `Behavior Change`, and `Cleanup`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis: There is no shared recent-window invariant at the projection source, returned replay-event set, live conversation state, Activity state, or mounted Event Monitor. Current duplicate quadratic dedupe paths amplify the unbounded inputs.
- Requirement or scope impact: A template-only or CSS-only fix would leave archive reads, full reconstruction, transport, client memory, and live growth intact. The recent-window policy must be enforced by the run-history projection owner and by the frontend owners of historical/live Event Monitor state.

## Recommendations

1. Change the normal local replay provider to read `raw_traces_active.jsonl` only (`includeArchive: false`). Read and normalize the active file as a complete lifecycle source, build replay events, then select the newest 100 canonical replay events before building the existing projection bundle. This preserves in-file tool-call/result correlation while bounding transport and frontend hydration.
2. Keep the existing GraphQL projection shape for this focused change, but make its server result intrinsically recent-only. Do not add archive cursors, load-older controls, archive screens, or an alternate full-history path.
3. Introduce one frontend Event Monitor window policy that defines completion/mutability and enforces the 100-visual-event cap for both historical hydration and live event dispatch. Evict oldest completed candidates first; only when fewer completed candidates exist than the overflow may the hard-cap fallback evict oldest mutable candidates. Defensively apply the same candidate policy to the final mounted center feed.
4. Bound per-run Activity state to 100 recent records. No Activity-panel redesign is required.
5. Preserve existing bottom-follow behavior. Drive it from a cheap explicit visible-presentation revision based on a net pre-mutation/post-enforcement bounded-presentation witness, not `conversation.updatedAt` or a transient handler effect. When the user has scrolled upward inside the recent window, a net visible append/update/eviction must not force the viewport downward and must expose `New activity · Jump to latest` until the user returns to the bottom. Non-visible protocol traffic and an inserted event that is synchronously evicted while leaving the final presentation identical must not expose the action.
6. Remove the workspace header conversation `CopyButton` and the eager full-conversation string computation that only served it.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

Rationale: The change crosses the local run-history projection policy, standalone/team projection consumers, frontend historical and live state, Event Monitor scrolling, Activity retention, localization, and cleanup of the copy action. It intentionally avoids new storage formats, pagination APIs, archive UI, or migration.

## In-Scope Use Cases

- Select or reopen a long-running standalone agent and quickly see its latest active-file activity.
- Select a team member without reconstructing that member's archived trace segments.
- Restore/discover active runs without background archive-scale projection work.
- Follow live activity at the bottom while the Event Monitor rolls past 100 visual events.
- Scroll upward within the recent window without being pulled down, then jump to latest.
- Continue viewing existing collapsed Thinking and tool cards with no disclosure redesign.
- Use the Activity panel with recent bounded data and no new visible workflow.
- Use the workspace after the conversation copy control has been removed.

## Out of Scope

- Loading, paging, searching, exporting, or otherwise exposing archived raw-trace segments in the Event Monitor.
- A separate archive/history screen or a `Load earlier` control.
- Deleting, truncating, migrating, compressing, or changing retention of authoritative raw traces.
- Changing compaction or raw-trace rotation behavior.
- Redesigning Thinking, tool-card, Activity-panel, composer, Team Communication, Task Delegation, or Memory Inspector presentation.
- Eliminating the existing conversation/activity transport duplication or replacing the GraphQL projection contract; the new server bound makes that inefficiency finite for this scope.
- Providing a replacement full-conversation copy/export action.

## Functional Requirements

- `REQ-001` Every normal standalone and team-member run projection used by the workspace Event Monitor must read only the subject's active raw-trace file and must not open or reconstruct completed archived raw-trace segments.
- `REQ-002` The backend projection must select at most the latest 100 canonical display/replay events from the normalized active-file events before constructing the returned conversation and Activity projection arrays.
- `REQ-003` The central Event Monitor must render and retain at most 100 recent visual events per run. A user message counts as one event; each assistant text, Thinking, tool, media, task/inter-agent, or error segment counts as one event; each center-timeline compaction row counts as one event. Streaming deltas and lifecycle updates to an existing segment/card do not count as separate visual events. When mutable events are protected under `REQ-004`, the window is the protected mutable set plus the newest completed events that fit, rather than a blind chronological tail.
- `REQ-004` Live events must append or update exactly once. To enforce the hard 100-event cap, eviction must remove oldest completed candidates before any still-mutable candidate. Completion means: user/static notification/inter-agent/media/error events are complete after atomic insertion; streamed text/Thinking is complete after its `SEGMENT_END` marker or containing AI message completion; tool/file/terminal cards are complete only in terminal `success`, `error`, `denied`, or `interrupted` status; center compaction rows are complete only in `completed` or `failed` phase. If overflow remains after all completed candidates are exhausted—a reachable case such as more than 100 concurrently mutable segments—the deterministic hard-cap fallback must evict the oldest mutable candidates, preserve the maximum at 100, and allow a later update carrying that stable identity to create at most one source-limited newest-edge representation. No archive lookup or duplicate retained representation is allowed. The backend historical snapshot remains the newest 100 canonical replay events under `REQ-002`; after hydration, its projected nonterminal tool/compaction states participate in the same client completion and eviction policy as live continuation.
- `REQ-005` When the Event Monitor is at the bottom, a net bounded-presentation change must continue to follow the bottom. When the user scrolls upward, a net retained visible append, content/lifecycle change, center-compaction change, or eviction-only presentation change must not force-scroll the viewport and must expose `New activity · Jump to latest` until latest is reached. “Net change” means the ordered bounded center presentation after mutation and enforcement differs from the ordered bounded center presentation captured immediately before mutation. Protocol messages that do not alter that final presentation, and transient events synchronously removed by enforcement such that the pre/post presentations are equal, must not increment the revision or expose the action. This behavior must not use the generic conversation timestamp, deep/full-payload serialization, or a transient mutation-effect OR condition.
- `REQ-006` Thinking and tool cards must preserve their current collapsed-by-default behavior and current explicit expansion interaction.
- `REQ-007` Per-run Activity store data must be bounded to at most 100 recent activity records, without adding a new Activity navigation or archive UI.
- `REQ-008` The separate conversation copy control in the agent workspace header and its dedicated eager full-conversation text derivation must be removed, with no replacement action.
- `REQ-009` Existing active and archived raw-trace files must remain unchanged and directly usable. The optimization is a read/display policy change only and must not migrate or delete stored data.

## Acceptance Criteria

- `AC-001` Given a run directory containing both `raw_traces_active.jsonl` and one or more complete archived segments, opening its standalone or team-member projection performs no read/open of an archived segment and the result contains no archive-only event.
- `AC-002` Given more than 100 canonical display events in the active file, the projection is built from exactly the newest 100 events in deterministic chronological order; given 100 or fewer, all active-file events are eligible.
- `AC-003` A browser/component scenario with more than 100 mixed user messages, assistant text segments, Thinking segments, tool cards, and compaction rows observes no more than 100 mounted central Event Monitor visual events. With only completed events it confirms the newest 100 by stable identity/content; with a mix of completed and mutable events it confirms oldest completed candidates are evicted before an older mutable event.
- `AC-004` After at least 1,000 additional live append/update messages, the central Event Monitor remains at or below 100 visual events and the per-run Activity store remains at or below 100 activity records, with no duplicate live card/message. A deterministic 101-all-mutable scenario proves the hard-cap fallback evicts the oldest mutable event; a later update for that identity yields no more than one source-limited newest-edge representation and the bound remains 100.
- `AC-005` While pinned to the bottom, a net visible append/update leaves the latest change visible. While scrolled upward, a net retained segment/card update, center-compaction change, membership/order change, or eviction-only presentation change does not force the viewport to the bottom, increments the explicit visible-presentation revision once, displays the localized `New activity · Jump to latest` control, and activating it moves to latest and clears the control. `CONNECTED`, `TURN_STARTED`, accepted no-op command/status messages, and other non-visible protocol traffic do not increment the revision or show the control. In the `MP-CR-001` case—100 retained mutable events followed by one atomic-complete event that completed-first enforcement immediately removes—the ordered pre/post bounded-presentation witnesses are equal, the revision remains unchanged, and no jump control appears. In `MP-AR-003`, `TOOL_LOG`, tool-result-only mutation, or replacement of a tool argument object with equal rendered tool-name/summary/status/error/action values also leaves the witness equal and shows no jump control; changes to a rendered tool summary/status/error do change the witness.
- `AC-006` Existing Thinking and tool-card tests continue to prove collapsed-by-default state and explicit expansion; no eager expansion is introduced by historical hydration or live rolling.
- `AC-007` The workspace header no longer renders the conversation copy button, and the component no longer computes the joined full-conversation string that served it.
- `AC-008` Active-team restore and active standalone discovery projection calls return only their active-file recent windows; no normal background projection call opts into archive reads.
- `AC-009` The observed largest active-only fixture (or a deterministic equivalent of at least 5 MB / 600 display entries) returns no more than 100 canonical display events to the client, and an execution probe records payload, TTFB, total time, client hydration time, and browser usability evidence. Recent Event Monitor content and the composer must become usable within 2.0 seconds on the documented reference environment.
- `AC-010` Existing raw-trace fixtures with and without manifests work without a migration, rewrite, or version-specific compatibility branch; archive files remain byte-for-byte untouched by projection reads.
- `AC-011` The new jump-to-latest label is localized in English and Simplified Chinese, is a keyboard-operable button with visible focus, and does not announce each streaming token through an accessibility live region.

## Constraints / Dependencies

- Local application-owned raw traces remain the normal display authority across AutoByteus, Codex, and Claude runtimes.
- The active file may still grow when compaction has not occurred. The server must therefore bound returned canonical events even though reading the complete active file is accepted for this scope.
- Build tool interactions from the complete normalized active-file record set before selecting the latest replay events; raw-record tail slicing may split a call/result pair and is not the approved design.
- A tool call may have been archived while its result remains active. The Event Monitor must not read the archive to repair that card; source-limited active-file evidence is acceptable and must degrade safely.
- The existing GraphQL projection shape remains unchanged; server, generated-client, and transport schema changes are not required.
- Historical and live visual-event counting must share one frontend policy rather than independently guessing from message count.
- Completion/mutability classification and completed-first eviction must be shared by conversation retention, Activity retention, and final center presentation. Historical items without an active live lifecycle are treated as complete unless their projected tool/compaction status is explicitly nonterminal.
- The visible-presentation revision is ephemeral per `AgentRunState`. It starts/resets at `0` on initial historical hydration or any run/context conversation replacement, including the non-live replacement branch in `teamRunOpenCoordinator.mergeHydratedMembers`; subscribed live contexts that intentionally preserve their conversation also preserve their revision. It increments once only when a bounded lightweight pre/post presentation witness differs after enforcement, including a real eviction-only result, and does not increment for net no-op/non-visible messages. Run selection or revision reset establishes a new feed baseline and clears unseen state rather than showing the jump action.
- The witness is duration-independent and bounded by the 100-event presentation. It compares ordered visual identity plus the shallow semantic primitives actually rendered by, or used for retained interaction in, the central Event Monitor: text/Thinking content; user attachment identity/label/preview/open inputs; derived message and total token/cost text; the exact derived tool-card name, summary/path/command, status presentation, error, and approval/highlight interaction identity; static notification/inter-agent/media/error values; and the exact compaction-row primitives. It does **not** include Activity-only tool logs/results, raw argument-object identity, non-rendered source fields, generic timestamps, or payload references merely because they changed. Tool results/arguments are never recursively serialized and archived/full history is never scanned. Existing narrow render-presentation helpers must be reused so semantic replacement with equal visible/interactive values remains witness-equal.
- Exact maximum `100` is user-approved and is the acceptance bound.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Per-run `raw_traces_active.jsonl`, optional `raw_traces_<index>.jsonl` complete segments, and `raw_traces_manifest.json` under agent/team memory directories.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all active files, archived segments, and manifests unchanged. Only the normal Event Monitor read policy changes.
- Unacceptable data loss or corruption: Any write, deletion, truncation, rotation, or migration caused by this projection change; incorrect modification of active traces; nondeterministic ordering of selected recent events.
- Relevant availability, maintenance-window, or rollout constraints: No maintenance window or bulk rewrite. Existing files must work immediately after upgrade.
- Related requirement and acceptance-criteria IDs: `REQ-001`, `REQ-002`, `REQ-009`; `AC-001`, `AC-002`, `AC-010`

## Assumptions

- The user's term “rotaries” refers to accumulated raw-trace/reasoning/tool/history entries visible in the central Event Monitor.
- The user values only recent activity in this workspace surface and does not need to navigate far upward or inspect archived segments there.
- One hundred visual events is sufficient recent context for normal monitoring.
- Active-file-only source limitations at an archive boundary are preferable to archive reconstruction latency.

## Risks / Open Questions

- A single recent tool result, reasoning body, or media segment can still be large; count bounding does not impose a byte-size cap. This is a residual risk accepted for this focused scope.
- More than 100 concurrently mutable visual events is reachable but abnormal. The approved hard cap takes precedence only after completed candidates are exhausted; the specified stable-identity/source-limited fallback avoids crashes and duplicate retained cards but may omit content evicted before a later update.
- The lightweight witness relies on a complete inventory of central render/retained-interaction semantics. Missing a newly rendered value could suppress a revision, while including Activity-only/detail state could create a false jump action. Focused tests must cover every current center-rendering event kind; future render-model extensions must update the shared presentation helper/table and witness tests together.
- The existing projection duplicates tool data into conversation and Activity arrays. The duplication becomes bounded but is not eliminated here.
- Active-team restore still projects multiple member windows. Each is bounded and archive-free, but a very large team may merit separate focus-lazy work later if measured performance remains poor.
- The Event Monitor's existing token/cost total will describe the retained recent window once older items are evicted; it is not a full-run accounting surface.

## Requirement-To-Use-Case Coverage

- Open/reopen large standalone or member run: `REQ-001`, `REQ-002`, `REQ-003`, `REQ-009`
- Continue live monitoring: `REQ-003`, `REQ-004`, `REQ-005`, `REQ-007`
- Preserve current disclosure interaction: `REQ-006`
- Remove unused header action: `REQ-008`
- Preserve storage: `REQ-009`

## Acceptance-Criteria-To-Scenario Intent

- Archive exclusion and server bound: `AC-001`, `AC-002`, `AC-008`, `AC-010`
- DOM/state live rolling: `AC-003`, `AC-004`
- Scroll UX and accessibility: `AC-005`, `AC-011`
- Existing disclosure behavior: `AC-006`
- Copy-control cleanup: `AC-007`
- Large-active-file performance: `AC-009`

## Approval Status

Approved by the user on 2026-07-18. The user explicitly agreed that the visible change is a fast rolling recent-activity Event Monitor, confirmed that archived navigation is unnecessary, and requested removal of the unused copy button.
