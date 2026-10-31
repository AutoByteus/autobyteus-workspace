# Design Review Report — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

Latest complete result: round 4 (`ARCH-REV-004`). Rounds 1 (Fail), 2 (Pass) and 3 (Fail) are in `architecture-review-revision-record.md`. Verdicts that round 4 did not touch keep their earlier evidence and are marked "unchanged".

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-004, `Approved`; REQ-010 amended and REQ-014, AC-010 added in round 3; no change in round 4)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-41)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-004 notes 1–16)
- Reviewed Design Spec: `design-spec.md` (status `Needs Review`; the user's go for the build of 2026-10-31 stands, the design approval is not pending), mainly "Activation Sequence" (Bounded Local / Internal Spines), Dependency Rules, Interface Boundary Mapping and the file mapping
- Supplemental Task Artifacts Reviewed: `run-runtime-switch-contract.md` (data only now: §3.1–3.7, I-1…I-11), `code-review-report.md` (CRR-002), `follow-ups.md`, `solution-designer-handoff.md` (Round 4)
- Relevant Solution Revision IDs: SR-004 (notes 14, 15, 16)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: revision after `ARCH-REV-003` (Fail, ARCH-F-007), plus the Solution Designer's own data-model review (the contract holds data only; the hand-over is derived from the raw traces instead of registered)
- Prior Review Round Reviewed: round 3 (`ARCH-REV-003`, Fail)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, documents `9a6e4dee30` (`ca4c82b050` plus the `switchId` addendum, SR-004 note 16; production code `3521ae05f1`; the new library methods do not exist yet, so they were judged from the design and from the code they wrap). Opened in code this round, besides the round-3 set: `autobyteus-ts` `run-memory-file-store.ts` (`archiveAndRewriteActive`, `removeActiveRawTracesArchivedByBoundary`, `findActiveRawTraceByCorrelationId`, `recordSystemInstructionSupply`), `raw-trace-archive-manager.ts` (`archiveRecords`, pending segments), `agent-run-activation-operation.ts` (prepare's own cleanup, `releasePrivate`, `inspect`), `standalone-agent-run-lifecycle-service.ts` (`activateSwitched`, `abortForRetry`, `resolveInsideTransition`), `agent-run-platform-notices.ts`, `skill-update-notice-service.ts` (a source's publication semantics), `agent-run-input-preface-dispatch.ts` (settle rules), `runtime-memory-event-accumulator.ts` (`recordForwardedUserMessage`: when a `user` record is written), `agent-memory/store/memory-file-store.ts` (`readJsonl`, `readRawTracesActive*`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged; round 4 removes one port and one lifecycle call and adds two small library methods.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The design spec does not show the user's design approval as `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: unchanged from round 3 (REQ-002 once per switch; REQ-010 one raw-trace file never holds two runtimes, including the new session's own records; a failed attempt leaves no marker; REQ-014 the chat after a reload).
- Relevant existing behavior and evidence confirmed: the three-call port matches the code it wraps; the derived hand-over rests on `recordForwardedUserMessage` (a `user` record is appended when a non-notice-only input is forwarded and the result has a turn id) and on `AgentRunPlatformNotices` (first notice wins; sources also follow run lifetimes).
- Scope guardrail confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: not applicable; no blocking finding.
- Remaining material ambiguity, if any: none.
- Statements about existing code the design relies on, opened at their cited lines: all hold (the system-instruction dedupe, the archive manager's idempotence by key, the `abortForRetry` and `prepare` cleanup behavior, the settle rules, the accumulator).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed (unchanged) | None |
| BEH-002 | System | Pass | Pass | Pass: first attempt, failed start then retry, failed commit then retry, interrupted rewrite, and a restart before the first input are all traced | Confirmed | Clarifications in ARCH-F-008 |
| BEH-005 | User | Pass | Pass | Pass (one chat reader, unchanged from round 3) | Confirmed | None |
| BEH-007 | System | Pass | Pass | Pass | Confirmed (unchanged) | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `run-runtime-switch-contract.md` v2 | Pass: data only (layout, fields, identity, archive rules, case table, invariants); sequences and failure rules moved to the design spec, which removes the duplication behind earlier stale text | Pass | Pass | Pass, apart from the stale sentences listed in ARCH-F-008 item 4 (all in the design spec) | Pass | None blocking |
| `follow-ups.md`, `code-review-report.md` | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged | None |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The derived hand-over is a net removal (one port, one lifecycle call, the in-memory state, the lost-on-crash edge) | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Dependency Rules, mapping rows, Risks | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings save | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-002 | First message | Pass | Pass: `begin → prepare → validate → record → persistAndPublish → publish`; on a failure before `record` succeeds: abort, then `discard`; the lifecycle drives every call itself | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Journal per-file runtime | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-004 | Chat reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-005 | Hand-over to the first input: publication → `takePreface` (derive once from the raw traces) → notice + user text → `prefaceDelivered` → live marker; the user record then ends the hand-over | Pass | Pass | N/A | Pass | Pass: the notice service owns the derivation, the journal facts and the text; the lifecycle takes no part | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunMemoryFileStore` (library) | Pass: `rotateActiveRawTracesForRuntimeSwitch`, `removeActiveRawTracesAfter` and the last-record read are the only new entries on the file's one owner | Pass | Pass | Pass | Guard wording needs fixing (ARCH-F-008 item 1) |
| `RuntimeSwitchRecorder` / port `RuntimeSwitchMemory { begin, record, discard }` | Pass | Pass | Pass | Pass | Plain-value ticket `{switch, watermarkTraceId \| null}` keeps the port stateless |
| `RuntimeHandoverNoticeService` | Pass: an `AgentRunPlatformNoticeSource` that reads the raw traces through `agent-memory` and the journal through `WorkJournalService`; the lifecycle no longer calls it | Pass | Pass | Pass | |
| Chat reader | Pass (unchanged) | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` → one port; `runtime-handover-notices` → `agent-memory`, `WorkJournalService`; recorder and notice service independent | Pass | Pass | Pass | Pass | The previous second port and the lifecycle → notice call are gone, which removes a coupling |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `begin` / `record` / `discard` | Pass | Pass: read the watermark; make the switch; take back an attempt that did not reach the marker | Pass | Low | Pass; the smallest shape that makes a failed attempt leave nothing (the alternative, remembering the watermark, would store state) |
| `rotateActiveRawTracesForRuntimeSwitch` | Pass | Pass: three rules stated (segment exists → watermark ignored; otherwise archive through the watermark; marker only if absent, always first), marker id derived from the key | Pass | Low | Pass |
| `removeActiveRawTracesAfter(traceId \| null)` | Pass | Pass | Pass | Low | Pass with the guard wording of ARCH-F-008 item 1 |
| `hasPendingRuntimeHandover(runId)` | Pass | Pass | Pass | Low | Pass with ARCH-F-008 item 2 |
| `AgentRunPlatformNoticeSource` implementation | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Take back a failed attempt | Pass: the library's private archive/rewrite and its remove-by-boundary helper | Pass | Pass | Pass | |
| Hand-over pending | Pass: derived from data the run already owns, using the existing preface route and publication callbacks | Pass | Pass | Pass | Net removal |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unchanged set | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Marker identity (`rt_runtime_switch_` + first 24 hex of SHA-256 of the key) | Pass: one derivation, used by the archive step, the retry and I-3 | Pass | Pass | Pass | Name the one function that derives it |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ticket `{switch, watermarkTraceId \| null}` (plain value) | Pass | Pass | Pass | N/A | Pass | |
| "Hand-over pending" | Pass: one fact with one derivation, no stored flag; a cached copy per publication is the only copy | Pass | Pass | N/A | Pass | I-11 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (readers of the active file classified in round 3; the new first-record read is the notice service's only raw-trace read). Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Library store (two additions), memory store/service (`hasPendingRuntimeHandover`, chat reader), notice service, port file `runtime-switch-memory-port.ts`, supervisor, composition | Pass | Pass | N/A | Pass | `runtime-switch-ports.ts` is replaced by `runtime-switch-memory-port.ts`; the composition entry file of the notice subsystem stays conditional |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and changed paths | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The `RuntimeHandoverNotices` port and `register`, the notice service's in-memory pending state, the second port file, the first rotation order | Pass | Pass | Pass | Pass | Confirm at implementation that no `register`/port reference or test double remains |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| All | No | Pass | Pass | |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| The three stores | Unchanged decisions | Pass | Pass | N/A | Pass | The contract now states, for every case, what the active file and the manifest hold (first attempt, failed start then retry, failed commit then retry, interrupted rewrite). Derived hand-over adds no stored data |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps and tests ("Added by ARCH-F-007") | Pass: includes a native start throwing after its instruction, an abandoned attempt, the library cases, a restart before the first input, native → other → native chat | Pass | Pass | Pass (add the second-switch discard test, ARCH-F-008 item 1) |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Active file and manifest per case | Yes | Pass: the case table in contract §3.3 | Pass | Pass | |

## Material Premise Validation (Only When Needed)

### `MP-3` — A native or Grok target's start fails after the candidate wrote its own record, and the user sends again (round 3, now answered)

- Reachability: `Reachable` as a designed supported scenario (activation fails and is sent again).
- Review consequence / proportionate response: answered by `discard` (a failed attempt leaves nothing behind), archive rule 1 (a retry after a failed commit ignores the watermark) and the case table. Checked by walking each case against `archiveRecords` and `recordSystemInstructionSupply`:
  - failed start then retry: the candidate's record is removed after the abort, the next `begin` reads the original tail, the candidate's instruction is written fresh after the marker;
  - failed commit then retry: the marker is in the file, so `discard` is a no-op and the retry's watermark is ignored; the instruction is not written twice;
  - `record` failing after the segment completed but before the rewrite: the marker is not in the file, so `discard` removes the candidate's record; the retry finds the segment (rule 1), removes the archived ids and puts the marker first with the same id;
  - an abandoned attempt (undo or a third runtime) leaves the previous file as it was.

### `MP-4` — The first input is forwarded but no `user` record is written, so the derived hand-over reads as still pending after a restart

- Related approved requirement or established contract: REQ-002 (once per switch).
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: a first input forwarded before the runtime reported its turn id (`forwardedTurnId` null; `recordForwardedUserMessage` returns without a record when the result has no turn id), then a server restart.
- Support evidence: `agent-run-input-preface-dispatch.ts` (null turn id is a supported settle outcome); `runtime-memory-event-accumulator.ts` (`if (!turnId) return;`).
- Forward current or approved target production caller/event path: forward → `prefaceDelivered` (cached done for this publication) → no `user` record → restart → new publication → derivation: marker first, no `user` record → the notice is carried once more with the next input.
- Lifecycle preconditions and material consequence at the claimed point: a second copy of a facts-and-pointers notice, once, after a restart. Harmless.
- Reachability: `Reachable`, low consequence, and the same outcome the design already states for a dispatch that ends before the record is written.
- Review consequence / proportionate response: no mechanism; say it in the notice-service row (ARCH-F-008 item 3).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

### ARCH-F-007 — Resolved (see the revision record)

### ARCH-F-008 — Clarifications for the new library methods, the derived hand-over and stale text (Low, non-blocking, `Design Impact`, Within Approved Scope)

Approved authority protected: REQ-010, AC-009, I-7 (items 1), REQ-002 (items 2, 3), Principle 14 (item 4). No re-review needed; the Solution Designer may fold these into the documents while the implementation engineer starts.

1. **Guard and edge rules of `discard` / `removeActiveRawTracesAfter`.** The operation deletes records from authoritative data, so state its rules exactly:
   - The guard is "a record with *this switch's key* as correlation id is in the active file", not "a hand-over marker is in the file": after a first switch the active file begins with an earlier switch's marker, so an unkeyed guard would make `discard` a no-op on every later switch and ARCH-F-007 would come back.
   - A non-null watermark id that is not in the active file removes nothing (and is reported); a null watermark removes everything after the start of an empty-at-`begin` file.
   - The lifecycle calls `discard` only when the failed candidate's release is confirmed (`released`): when prepare throws the lifecycle has no candidate and must hold the activation operation to ask its `inspect()`; when the cleanup is `quarantined` or `pending` it does not discard (the candidate may still write; the run is quarantined until restart or the release is joined, as the existing activation code does).
   - Add the test: a failed attempt on a run that already switched once.
2. **Bounded, read-only reads.** The hand-over derivation (`hasPendingRuntimeHandover`) must stop at the first `user` record and, for a run that never switched, at its first record, and must not use the whole-file readers (`MemoryFileStore.readJsonl` reads the entire file; `RunMemoryFileStore.readMemoryDicts` also cuts a damaged end, which is a write). Same for the last-record read of `begin` ("writes nothing"). The derivation should return the marker (the live notice's one-line presentation is its content), not only a boolean.
3. **Notice-service semantics to state.** The hand-over is "pending" until a `user` record exists, which is written only when an input is forwarded with a turn id; if a first input is forwarded without a turn id and the process restarts, the notice is carried once more (`MP-4`, harmless). Say what counts as the input record (a `user` record from any sender, including agent-to-agent messages), and keep the hand-over source first in `AgentRunPlatformNotices`.
4. **Stale text in `design-spec.md`:** Ownership Boundaries still says "lifecycle → … notice service (notice text)"; the paragraph after Dependency Rules says the `RuntimeSwitch` value is "handed to both ports" (there is one port now; the notice service reads the marker record instead); the Design Principles Check rows (P1, P9 and others) still mention the second port or "marker is written before either records anything"; name the single function that derives the marker id.

## Classification

`Pass`. No Design Impact, Requirement Gap or Unclear blocks implementation.

## Recommended Recipient

Primary pass: `/software_engineering_team/implementation_engineer`. Informational notice: `/software_engineering_team/solution_designer`.

## Recommendations (non-blocking)

- Chat after a compaction in the new era loses the marker on reload (stated in contract §3.7; REQ-014 keeps compaction's view). The marker was the user's own request (DEC-3, REQ-011): tell him at the approval request; keeping it would be his requirement decision.
- Add the chat test native → other → native (two native eras restart turn ids at `turn_0001`).
- The real run asserts I-7 on each runtime pair tried and, for a native or Grok target, includes one failed start followed by a retry if it can be produced.

## Residual Risks

- A hand-over notice is carried twice in the rare no-turn-id-then-restart case (`MP-4`); no loss case remains (the derivation survives a restart).
- A failed activation followed by an undo after the marker was written leaves a marker for a switch that did not happen (stated; the failure is a metadata write error).
- If the previous era's latest `system_instruction` equals the candidate's, the new era has no instruction record of its own (stated as `Unclear`; no consequence for the chat or the journal).
- Native writer holding the active file across rotation (escalation trigger; none known). The first derivation of the hand-over for every published run costs one bounded read of the start of its active file, cached per publication.
- The marker is not shown on reload after a compaction in the new era (above).

## Addendum reviewed in round 4 — `switchId` replaces `requestedAt` (SR-004 note 16)

`pendingRuntimeSwitch {switchId, from}`: the id is a UUID made at the first pending save, kept by later saves of the same switch, and new after an undo; the key is `runtime_switch:<runId>:<switchId>`; the time of the request had no reader and is dropped. Checked: contract §3.1, §3.3 identity and the stored before/after example, the design-spec commit function `commitAgentRunRuntimeSwitch({ metadata, selection, switchId })` and the tightness table, and REQ-001 ("its identity and the previous binding") are consistent, and no `requestedAt` remains in the design documents. The change is sound: a timestamp doubling as an identity was one field with two meanings; the retry of a failed activation reads the stored `switchId`, so the key, the segment and the derived marker id stay stable across attempts; an undo followed by a new switch gets a new id, so keys never repeat; the commit function stays pure (the updater makes the id). Notes for implementation: the built code and tests still use `requestedAt` (`agent-run-pending-runtime-switch.ts`, `agent-run-runtime-switch-commit.ts`, `agent-run-metadata-types.ts`, `runtime-switch.ts`, `agent-run-history-catalog-service.ts`): rename as a clean cut with no alias; a pending field written by the earlier build (isolated test data only, nothing released) would fail its parse and affect that run only (DESIGN rule 7). No finding.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: ARCH-F-007 is resolved: each failed-attempt and retry case was walked against the code (`archiveRecords`' idempotence by key, the instruction dedupe, the activation operation's cleanup) and holds, with `discard` as a small third call on the same port. The Solution Designer's own simplification (the hand-over derived from the raw traces; the contract holding data only) is sound and removes a port, a lifecycle coupling and a lost-on-crash edge. One Low clarification set (ARCH-F-008) concerns the exact guard of the new deleting method, bounded read-only reads and stale text.
