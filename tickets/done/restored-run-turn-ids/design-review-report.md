# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids/tickets/in-progress/restored-run-turn-ids/requirements-doc.md` (Approved by the Solution Designer within the Task's direction, SR-001; unchanged at SR-002)
- Upstream Investigation Notes: `.../restored-run-turn-ids/investigation-notes.md` (U-1 resolved at SR-002)
- Upstream Solution Revision Record: `.../restored-run-turn-ids/solution-revision-record.md` (SR-002)
- Reviewed Design Spec: `.../restored-run-turn-ids/design-spec.md`, section "SR-002 — One identity per notice" (SR-001 parts are implemented and validated)
- Supplemental Task Artifacts Reviewed: `handoff.md`, `code-review-report.md` (CRR-001, CR-001), `api-e2e-execution-coverage-report.md` (F-1), `evidence/V-01-RR-10/RR-10-head-frame-order.json`, `evidence/V-04-desktop/` (README, states)
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `.../restored-run-turn-ids/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete (SR-002, Medium / High) after validation F-1 / CRR-001 Design Impact, 2026-11-18
- Prior Review Round Reviewed: N/A (SR-001 went directly to implementation)
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `codex/restored-run-turn-ids` @ `1e7eaf2573` (base `2e9ac1e65b`). Opened:
  - web: `systemTaskNotificationHandler.ts` (a notice segment has no id; always pushed), `agentStreamSnapshotApplication.ts` L19-50 (the snapshot replaces the conversation with its stored part, then replays its unconfirmed turns' frames through the same stream handlers), `AgentStreamingService.ts` L259-270, `runProjectionConversation.ts` L275-281 (hydrated notice without id);
  - server: every `SYSTEM_TASK_NOTIFICATION` producer and every `platformInputPrefaceMetadata(` caller (grep), the tool-list builder and event (L29-45), `collaboration-agent-presentation-event-adapter.ts` L45-64, `task-system-input-presentation.ts`;
  - autobyteus-ts: `agent-input-pipeline.ts` L94-101 (the native runtime's own notice emit for unsuppressed SYSTEM inputs), `memory-ingest-input-processor.ts` L54-62.

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`. One id is carried across autobyteus-ts, the server and the web, through three strict live contracts plus the projection, and every notice producer changes.
- Independent Architecture Review required: `Yes`
- Classification correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements: REQ-002 / AC-002. After two restarts, the desktop and phone conversations show every turn once: the reminder once per restart, every reply, live and after a reload. Unchanged.
- How the second card arises (confirmed against the code and V-04):
  - The web applies a stream snapshot by replacing the conversation with the snapshot's stored part, then replaying the unconfirmed turns' frames through the stream handlers (`applyAgentStreamSnapshot`).
  - A notice is in the stored part without a turn (kept by `keepsStored`) and can also be in the replayed frames of its turn. The notice handler always pushes a new segment, so both show.
  - V-04 fits this:
    - after a reload of a live run, only the newest restart's card doubles, because only its turn's frames are still unconfirmed;
    - live, the two cards sit "above You" (stored position) and "at the start of the reply" (replayed frame).
  - Base shows the same counts, so turn ids are not the cause.
- 461's contract already says notices are kept and matched by `messageId`; none carries one. The design completes that contract.
- Every prospective blocking finding traceable: `Yes` (none)
- Remaining material ambiguity: None

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — (SR-001, validated) |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — (one id per notice; the web shows a notice id once) |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — (SR-001, validated) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/V-04-desktop/`, `evidence/V-03-phone-MSP-75/` | Pass | Pass | Pass | Pass | Pass | — (reproduction; MSP-75 fails until fixed) |
| `evidence/V-01-RR-10/RR-10-head-frame-order.json` | Pass | Pass | Pass | Pass | Pass | — (one live notice frame, sender and content only) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | SR-001 assessment; SR-002 adds the second cause | — |
| Root cause explicit and evidence-backed | Pass | notices have no identity on any path (handler, hydration, wire), while 461's contract matches them by id | — |
| Refactor decision explicit | Pass | no refactor; one id carried through existing owners | — |
| Reflected in design sections | Pass | steps 1-7 table, example | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner Per Node | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 DS-001, DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (validated) |
| SR-002 notice identity (table steps 1-7: producer → preface metadata → stored trace → projection → live payloads → web segment → handler rule) | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass. The table reads as the spine in call order, and the example walks it live and on reload |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Each notice producer (makes the id) | Pass | Pass | Pass | Pass | One id per notice, used for its message metadata and its published event |
| `PlatformInputPreface` (`noticeId` required) | Pass | Pass | Pass | Pass | Required on write; tolerant read of older metadata |
| Web `systemTaskNotificationHandler` (the one "show once" rule) | Pass | Pass | Pass | Pass | Hydration replaces and replay passes the same handler, so the rule covers live and replayed frames |

## Dependency Direction / Forbidden Shortcut Verdict

`Pass`. No new lookup (Principle 16 `Pass`).

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `notice_id` in preface metadata / `message_id` on the stored notice trace | Pass | Pass | Pass | Low | Pass |
| Live `SYSTEM_TASK_NOTIFICATION` `message_id` (agent stream, collaboration presentation, team stream) | Pass | Pass | Pass | Low | Pass |
| Projection notice entry `messageId`; web `SystemTaskNotificationSegment.messageId` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass` (a field, no new layer).

## Existing Capability / Subsystem Reuse Verdict

`Pass`. Reuses `RawTraceItem.messageId`, the preface metadata, the 461 rule (match by `messageId`) and the existing user-message matching.

## Subsystem / Capability-Area Allocation Verdict

`Pass`. Kinds and forms traced: preface notices, posted notices (SYSTEM messages with preface metadata), Claude's runtime notice, live versus reload, desktop versus phone. Two more producers of `SYSTEM_TASK_NOTIFICATION` are not in the table (R-1); neither is on REQ-002's path.

## Reusable Owned Structures / Shared Structure Tightness

- One id per notice, one field name per layer (`notice_id` in input metadata, `message_id` on the trace and wire, `messageId` in TypeScript): `Pass`. `notice_id` names what it is in metadata that also holds the input's own fields; the trace and wire use the existing `message_id`.
- Derived consumers: `Pass`. Projection, three wires, web hydration and handler are listed.
- Vocabulary: `Pass`.

## File Responsibility / Placement Verdict

`Pass` (changes land in the existing owners listed in steps 1-7).

## Removal / Decommission Completeness Verdict

`N/A`: nothing becomes obsolete. The snapshot's keep rule stays, as 461 designed.

## Legacy / Backward-Compatibility Verdict

`Pass`. A stored notice without an id reads and shows as today. That is a tolerant read of an optional existing field, not a version branch, and such notices have no live copy after their run ended.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| Notice traces gain `message_id` | Directly Usable — No Migration | Pass (`RawTraceItem.messageId` exists, optional) | Pass | N/A | Pass |
| Turn ids (SR-001) | Not Affected (DEC-003) | Pass | Pass | N/A | Pass |

## Change / Refactor Safety Verdict

`Pass`. SR-001's code is kept and validated. SR-002 adds the id end to end, and MSP-75 and V-04 are the reproduction.

## Example Adequacy Verdict

`Pass`: one restart, live then reload, with the id `n1` on every copy.

## Material Premise Validation

None beyond the established path above. The premise "unique turn ids make the card show once" was disproved by validation, and the design no longer rests on it.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer.

## Residual Risks

- R-1 (record a decision; not on REQ-002's path): two `SYSTEM_TASK_NOTIFICATION` producers are not in the steps table.
  - (a) The native runtime's own emit in `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` L94-101. It fires only for SYSTEM inputs without the suppression flag. Every platform notice builder sets that flag (tool list, skill, background task, restart, model router, task delegation), so no platform notice reaches the web through it.
  - (b) The task-delegation input shown as a notice on the collaboration presentation stream (`collaboration-agent-presentation-event-adapter.ts` L57-64).

  With `message_id` added to the strict payloads, the compiler will stop at both. They should send `null` (or, for (b), the input's own message id) as a recorded decision. Their behavior is otherwise unchanged.
- R-2 (for implementation): the show-once rule relies on snapshot application replacing the conversation first and then replaying frames through `handleSystemTaskNotification`. Keep the rule in that handler, which every live and replayed frame passes; do not add a second dedupe in hydration. Test reload of a live run (V-04 step 5) and phone live after two restarts (MSP-75).
- R-3 (suggestion, not a finding): a smaller alternative would be at the snapshot owner. The stored notice trace has its turn id (`traces-turn-ids.txt`), so the projection could carry it, and `keepsStored` would then drop the notice while its turn's frames are replayed, the way it handles the turn's other entries. The design instead completes 461's established contract (notices kept and matched by `messageId`), which also covers notices outside a turn. The design works either way, so this is not required.
- R-4: notices from traces stored before this change have no id and are shown as today (accepted).
- DEC-003 (from validation): old turns of runs restored before the fix stay merged in turn-grouped views. The user is to be told.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: the cause is established and matches the evidence (stored part plus replayed frame, both id-less). The fix gives each notice one id from its producer to the web, where one handler shows it once. It is additive on stored data and needs no migration.
