# Requirements Doc — Background Agent Renderer Contention

## Status (`Approved — Design Input`)

Investigation is complete enough to lock the intended behavior. Current runtime and focused-test evidence identifies synchronous frontend projection amplification, multiplied by redundant UI-facing status frames, as the dominant supported cause. The user approved the shared agent/team presentation-egress direction on 2026-08-09 and required its control composition to make additional bounded outbound controls easy to add.

## Goal / Problem Statement

Keep the application responsive while many agents or team members run concurrently, even when their conversations are not focused. Preserve exact ordered background state and immediate semantic lifecycle changes, but stop semantically redundant stream frames from repeatedly scanning conversations and rebuilding the complete workspace/team navigation tree.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | While another agent works, foreground microphone startup can remain in “Starting microphone…”. Source tracing shows the click handler already ran; later startup work still competes on the renderer event loop and also includes device/audio-worklet latency. | Background stream processing adds no material delay to the focused microphone interaction; the Starting state appears promptly and fake-device startup stays near its idle baseline. | Permission handling, selected-device behavior, recording, transcription, cancellation, and error states remain correct. | FR-004 / AC-005 |
| BEH-002 | Context-image paste/upload and unrelated file/panel interactions can become slow while a hidden agent streams. An attachment placeholder is created synchronously before upload, so a late placeholder indicates renderer scheduling delay rather than network latency. | Paste creates visible upload progress promptly, and file/panel actions remain responsive under representative aggregate background load. | Attachment bytes, ownership, preview, upload/finalization, removal, file contents, and authorization remain exact. | FR-004 / AC-004, AC-006 |
| BEH-003 | Every history item marked active is recovered and subscribed independently of selection. Hidden transcripts are not richly rendered, but every delivered event is still parsed and projected into reactive state. | All active runs continue receiving exact events in the background, while cost is proportional to the affected run and actual visible summaries—not to every workspace, team, and member in the history tree. | Background execution, reconnect/hydration, ordered content, tools, lifecycle, and later selection remain complete. | FR-002, FR-003, FR-005 / AC-002, AC-003, AC-007 |
| BEH-004 | Both generic stream dispatchers update `conversation.updatedAt` for every message. The navigation projection reads that property, so status, content, token, connection, and tool frames invalidate global navigation even when no navigation field changed. | Stream dispatch distinguishes conversation/event-monitor effects from navigation effects. Content and non-navigation frames do not invalidate navigation; actual status transitions and bounded activity-summary changes do. | Authoritative conversation timestamps and activity meaning remain correct; navigation continues showing accurate run/team identity, status, summary, and useful relative activity. | FR-002, FR-003 / AC-002, AC-003 |
| BEH-005 | Every generic message captures a complete recent Event Monitor witness, enforces the bounded window, captures another witness, and compares them—even for repeated status and other messages that cannot alter the presentation. A 100-item lower-bound probe measured about `0.55 ms` of transaction overhead versus `0.00175 ms` for the already-running handler alone. | Event Monitor work is driven by explicit mutation effects: no-presentation messages do no presentation scan/revision; content-only mutations revise presentation without structural retention work; structural mutations enforce the window once. | The latest-100 semantics, ordering, deduplication, mutable-event behavior, compaction/activity integration, and earlier-events indicator remain exact. | FR-002 / AC-003, AC-007 |
| BEH-006 | One reactive activity invalidation causes one full team projection per workspace row plus another unscoped reveal projection. The current exact probe measured 27 complete team projections per frame with 26 workspaces. | One relevant navigation change builds/indexes the complete navigation projection at most once, and unchanged workspace/team arrays remain referentially stable. Selection reveal depends on topology/identity, not stream activity. | Existing workspace grouping, team/member hierarchy, focus, counts, status dots, selection reveal, archive/delete/terminate actions, and relative-time display remain correct. | FR-003 / AC-002, AC-007 |
| BEH-007 | The canonical lifecycle pipeline emits `running` before each non-terminal event. The WebSocket egress keeps these companions immediate and therefore sends repeated identical UI statuses even though the raw runtime/trace stream is authoritative elsewhere. | The UI-facing WebSocket projection sends the initial status and every actual status/payload transition immediately, while suppressing exact redundant status projections per stream identity. | Canonical internal events, trace/persistence evidence, meaningful status transitions, error/idle completion ordering, and content flush semantics remain unchanged. | FR-001, FR-005 / AC-001, AC-007 |
| BEH-008 | The released server content cadence is configurable with a 500 ms default, and the focused conversation progressively renders rich Markdown. One background run at this cadence stayed near the idle UI baseline; aggregate per-frame work remains the scaling defect. | Keep the 500 ms default/configuration and progressive focused Markdown while removing the aggregate projection multiplier. | Wire content shape, no-loss concatenation, semantic flushing, settings behavior, and progressive rich presentation remain unchanged. | FR-005 / AC-007, AC-008 |
| BEH-009 | Standalone and team sessions already share `AgentStreamWebSocketEgress`, but its `send` branch directly combines content classification, buffering, flush ordering, serialization, and delivery. A new outbound presentation control would currently expand that coordinator or duplicate policy. | Both standalone and team sessions use one ordered presentation-egress control pipeline. Each control has a narrow typed contract, isolated per-connection state, deterministic order, and one composition point so another bounded control can be added without editing lifecycle owners, message mappers, transport handlers, or existing control implementations. | Exact team/member/task identity enrichment remains upstream of controls; no generic third-party plugin system or hypothetical control behavior is introduced. | FR-007 / AC-010 |

## Investigation Findings

- Earlier exact Electron/native-runtime evidence reproduced renderer saturation above one CPU core, 14–52 second foreground actions, and a hidden active stream while the selected member was idle. Backend health remained about 1–2 ms.
- Current v1.4.45 live probing confirmed the backend remains healthy and the renderer remains bursty. Sparse real traffic showed 13 status frames versus two content frames in the observed team interval.
- A current-source exact-dispatch probe used the real team-member dispatcher, 26 workspaces, and 38 team runs. Every redundant background `running` frame triggered 27 complete team projections: 26 workspace prop evaluations plus one reveal dependency.
- At an aggregate equivalent of twenty 500 ms streams, exact status-plus-content dispatch produced 520 dispatcher calls and 7,074 full team projections in 6.5 seconds; foreground tab p95 increased from 65 ms to 120 ms even though no single task crossed the 50 ms long-task threshold.
- Reassigning only the already-equal status without the unconditional activity timestamp did not cause the amplification. The timestamp/navigation dependency is the invalidation trigger; the per-message Event Monitor transaction is an independent additive cost.
- Detailed evidence and limitations are authoritative in `performance-evidence.md`.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Status | Approval Applicability | Related IDs |
| --- | --- | --- | --- | --- |
| `performance-evidence.md` | Retains exact prior/current runtime results, controlled probe results, causal classification, limitations, and raw-evidence paths. | Current | `N/A — evidence only` | All behaviors, FR-001–FR-006, AC-001–AC-009 |
| `probe-evidence/` | Retains the concise raw current-source/live measurements summarized by `performance-evidence.md`. | Current | `N/A — evidence only` | FR-006 / AC-002–AC-006, AC-009 |

## Design Health Assessment (Mandatory)

- Change posture: `Performance bug plus boundary/refactor correction`
- Design issue signal: `Confirmed`
- Root cause classification: `Boundary/ownership issue, duplicated coarse-grained coordination, and derived-read-model amplification`
- Refactor posture: `Refactor required now`
- Evidence basis:
  - stream dispatch owns unrelated Event Monitor, activity timestamp, and handler work as one blanket transaction;
  - conversation internals implicitly drive global navigation;
  - an uncached all-team builder is called once per workspace render and again for reveal;
  - the UI WebSocket adapter forwards duplicate status snapshots that have no new presentation meaning.
- Requirement/scope impact: A local timer, larger server interval, Markdown downgrade, or Web Worker would not remove the proven multiplier. The correction must make stream mutation effects explicit, separate navigation presentation from conversation mutation, index navigation once, and suppress redundant status only at the UI egress boundary.

## Recommendations

1. Treat the UI-facing WebSocket presentation boundary—not the canonical runtime pipeline or raw transport—as owner of redundant status suppression. Keep the identity-aware transition policy separable from content coalescing and socket serialization.
2. Make frontend handlers/dispatch return or declare explicit mutation effects rather than discovering changes with two whole-presentation witnesses.
3. Give workspace/run navigation a cached/indexed read model driven only by navigation-relevant revisions.
4. Keep all active streams connected; do not hide the cost by disconnecting background agents and risking state loss.
5. Do not add a Web Worker unless post-correction profiling separately proves JSON parsing remains material.
6. Keep one shared standalone/team presentation-egress pipeline with three narrow roles—ordered filters, one scheduling owner, and non-mutating observers—and a single composition root; do not create a generic plugin framework or separate team fork.

## Scope Classification (`Medium–Large`)

The behavior crosses the shared server WebSocket egress, standalone/team frontend dispatch, Event Monitor mutation ownership, live run/team navigation projection, workspace sidebar rendering, and realistic responsiveness validation. It does not require protocol-envelope or persisted-schema changes.

## In-Scope Use Cases

- UC-001: Start microphone recording in an idle focused conversation while one or many other runs stream.
- UC-002: Paste/upload one or more images into the focused conversation while background runs stream.
- UC-003: Open/switch files and right-side panels while background runs stream.
- UC-004: Observe accurate workspace/team/member status and activity while many runs execute.
- UC-005: Select a previously background member and see its complete ordered current conversation and tools.
- UC-006: Connect/reconnect to standalone and team streams and receive a correct initial status followed by meaningful transitions.
- UC-007: Add a future evidence-backed outbound presentation control at the shared composition point without changing canonical lifecycle, standalone/team handlers, message mappers, raw transport, or existing controls.

## Out of Scope

- Reverting or weakening progressive rich Markdown.
- Raising the default 500 ms server cadence merely to mask frontend work.
- Moving WebSocket parsing to a Web Worker before post-correction evidence requires it.
- Disconnecting, pausing, or dropping events from unfocused active runs.
- Changing canonical runtime events, raw traces, persistence, or introducing a batch-envelope wire protocol.
- Transcript virtualization or broad Markdown renderer optimization unrelated to background projection.
- Replacing the current Event Monitor latest-100 product behavior.
- Building a third-party/dynamic plugin framework or implementing speculative production controls beyond status transition filtering and the existing content cadence/ordering behavior. The observer seam may be proven without inventing a new metrics product.

## Functional Requirements

- **FR-001 — Semantic status projection:** The UI-facing standalone/team WebSocket projection must suppress only exact redundant status projections per exact stream identity, while sending the initial snapshot and every meaningful payload/status transition immediately and preserving canonical internal events.
- **FR-002 — Explicit stream mutation effects:** Frontend dispatch must execute only the Event Monitor, navigation, activity, and conversation work indicated by the handled event's actual mutation effects; semantically unchanged inputs must remain no-ops.
- **FR-003 — Bounded navigation projection:** Workspace/run/team/member navigation must be built/indexed once per relevant navigation change, reuse stable results, and never rebuild because background content or an unchanged status arrived.
- **FR-004 — Foreground responsiveness:** Voice, attachment placeholder, file, and panel interactions must remain within the evidence-backed targets below under representative aggregate background delivery.
- **FR-005 — Exact background correctness and released-contract preservation:** Keep all active background streams exact and selectable; preserve content cadence/configuration, ordering, semantic flush behavior, progressive rich Markdown, and lifecycle/error/completion semantics.
- **FR-006 — Executable evidence:** Retain deterministic event-count/projection-count coverage and browser/Electron responsiveness evidence sufficient to distinguish code, environment, backend, and device-origin failures.
- **FR-007 — Composable presentation-egress controls:** Standalone and team sessions must share one ordered, typed presentation-egress pipeline with narrow roles: filters may only forward/suppress, exactly one scheduler owns buffering/flush/forward ordering, and observers may inspect lifecycle outcomes but cannot alter delivery. A new bounded filter or observer must be independently testable and registrable at one composition point without modifying canonical lifecycle, message mappers, WebSocket handlers, raw transport, or other controls; a scheduling change must replace/extend the one scheduler rather than stack competing buffering owners. State and reset/disposal remain per connection.

## Acceptance Criteria

- **AC-001 — Status transition contract:** For standalone and team streams, the first status for an identity is delivered; an exact repeated status payload for that identity is not delivered again; any status or other status-payload field change is delivered immediately. Team members/task agents/task-team leaves are isolated by exact stream identity. Raw `AgentRun`/`TeamRun` subscribers and trace evidence retain all canonical events.
- **AC-002 — Navigation invalidation bound:** A background content frame, `CONNECTED`, token update, or exact repeated status causes zero complete workspace/team navigation builds. A real navigation-relevant change causes at most one complete team projection/index rebuild, independent of workspace count. Reveal topology is not recomputed for activity/status-only changes.
- **AC-003 — Event Monitor work bound:** A message that cannot change Event Monitor presentation performs zero full witness/flatten/selection passes and does not increment its presentation revision. A content-only mutation performs no retention scan; a structural visual mutation enforces the latest-100 window once and preserves all existing retention invariants.
- **AC-004 — File/panel responsiveness:** In the retained current-source aggregate-load scenario equivalent to twenty background runs producing one status plus one shaped content update per 500 ms window, warmed foreground file/panel interaction p95 is `<= 100 ms` and `<= 1.5×` its same-run idle p95. Stream projection introduces no individual `>= 50 ms` long task.
- **AC-005 — Voice responsiveness:** Under the same aggregate load, click-to-visible “Starting microphone…” p95 is `<= 100 ms`; with a controlled fake media device, the background-load click-to-Recording p95 is `<= 1.5×` idle and adds no more than `50 ms`. Actual Electron validation confirms no application-origin multi-second delay; permission/device failures remain distinguishable.
- **AC-006 — Attachment responsiveness:** With upload completion intentionally delayed, paste-to-visible upload placeholder p95 is `<= 100 ms` and `<= 1.5×` idle under aggregate load. Upload/finalization can complete later without corruption, duplication, or loss.
- **AC-007 — Background correctness:** After sustained background status/content/tool traffic, selecting the member yields exact ordered accumulated content, current tools/lifecycle/status, latest-100 Event Monitor semantics, correct sidebar identity/hierarchy, and no missing transition.
- **AC-008 — Released contracts unchanged:** The configurable server cadence remains default `500 ms`; content uses the existing message shape and lossless concatenation/flush rules; focused text/reasoning remains progressive rich Markdown.
- **AC-009 — Coverage/evidence:** Durable coverage includes standalone and nested team identities, reconnect/initial snapshot, interleaved identities, no-op effects, structural retention, projection-count bounds, one-run and aggregate-load browser cases, paste placeholder, and final Electron voice/file smoke evidence.
- **AC-010 — Shared control extensibility:** Standalone and team handlers instantiate the same presentation-egress pipeline. Status transition filtering is an ordered filter; content cadence plus semantic flush ordering has exactly one scheduler owner; observers cannot change delivery. A test filter and test observer can each be added by implementing their narrow contract and registering once, with no existing control, lifecycle, mapper, handler, or transport source changes. Tests prove deterministic order, identity isolation, scheduler flush behavior, observer non-authority, and per-connection disposal/reset.

## Constraints / Dependencies

- Authoritative work remains on `codex/background-agent-renderer-contention`, based on refreshed `origin/personal` v1.4.45.
- Status suppression must be scoped to each WebSocket egress connection and exact identity; it must not alter upstream publishers or non-WebSocket consumers.
- The UI remains single-threaded for reactive state/DOM work; improvements must reduce/scope main-thread work rather than rely on hiding it.
- Presentation controls must receive already-mapped, identity-enriched messages through one shared agent/team composition boundary; controls must not reach back into `AgentRun`/`TeamRun` or invent a second lifecycle authority.
- Latency probes must separate cold file setup, upload/network completion, permission prompts, and hardware latency from renderer scheduling.
- Synthetic aggregate-load probes must be followed by real Electron checks; neither alone substitutes for the other.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Run history, conversations/traces, settings, and context attachments.
- Required outcome: `Directly Usable — No Migration`.
- Existing data to preserve: All current data; target changes are UI egress filtering and in-memory derived presentation/read-model ownership.
- Unacceptable data loss or corruption: Dropped/reordered content, missing semantic status transition, lost tool state, incorrect history hierarchy, or attachment corruption.
- Availability/rollout constraints: Existing clients continue using the current WebSocket message shapes; no compatibility wrapper or data rewrite is needed.
- Related IDs: FR-001–FR-005 / AC-001–AC-008.

## Assumptions

- “Twenty-run equivalent” is the representative supported stress target for this ticket; the structural projection bounds also prevent workspace-count multiplication at higher counts.
- The status payload contains stable agent/team/task identity sufficient for exact per-connection deduplication.
- Navigation relative time does not require token-by-token precision; its visible resolution and meaningful activity semantics can be preserved without binding it to every stream frame.

## Risks / Open Questions

- Design must enumerate conditional handler effects carefully so no Event Monitor/tool mutation is under-reported.
- Initial snapshot and reconnection must reset status-dedup state per connection; stale state must not suppress the first current status.
- Task-agent and nested task-team identities require exact keying; an agent-id-only shortcut is forbidden.
- Cached/indexed navigation results must remain correct across add/remove/hydrate/archive/terminate/workspace changes, not only live status.
- A generic `any` middleware chain would make ordering, buffering, and identity conflicts implicit; the design must use narrow filter/scheduler/observer contracts and reject multiple buffering owners.
- Final real-device microphone timing can vary externally; acceptance separates application-added delay from device/permission behavior.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-001 | UC-004, UC-005, UC-006 |
| FR-002 | UC-001, UC-002, UC-003, UC-004, UC-005 |
| FR-003 | UC-001, UC-002, UC-003, UC-004 |
| FR-004 | UC-001, UC-002, UC-003 |
| FR-005 | UC-004, UC-005, UC-006 |
| FR-006 | UC-001, UC-002, UC-003, UC-004, UC-005, UC-006 |
| FR-007 | UC-006, UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Prove that UI status traffic represents state transitions, not canonical-event frequency, without changing raw evidence. |
| AC-002 | Prove that hidden content/no-op status cannot rebuild the global tree and one real change cannot multiply by workspace count. |
| AC-003 | Replace blanket witness scans with exact effect-driven Event Monitor work while preserving retention. |
| AC-004 | Measure a deterministic foreground file/panel action under twenty-run aggregate load. |
| AC-005 | Separate renderer scheduling from real microphone/device startup and reject application-origin stalls. |
| AC-006 | Measure paste dispatch-to-placeholder independently of upload completion. |
| AC-007 | Detect any optimization that loses background state or corrupts navigation/Event Monitor semantics. |
| AC-008 | Prevent regression of the two recently released streaming UX contracts. |
| AC-009 | Require durable structural, browser, and final Electron evidence. |
| AC-010 | Prove one shared agent/team control composition point and bounded add-without-modification extensibility without creating a generic plugin framework. |

## Approval Status

- Investigation authorization: `Approved` by user on 2026-08-08.
- Requirements basis: `Approved` by user on 2026-08-09 through explicit agreement with the shared presentation-egress proposal, the typed filter/scheduler/observer balance, and instruction to proceed with design without overcomplication.
- Intended-behavior supplements: None; `performance-evidence.md` is evidence-only (`N/A`).
