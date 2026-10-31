# Design Review Report — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

Latest complete result: round 3 (`ARCH-REV-003`). Rounds 1 (Fail) and 2 (Pass) are in `architecture-review-revision-record.md`. Verdicts that round 3 did not touch keep their round-2 evidence and are marked "unchanged".

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-004, `Approved`; REQ-010 amended, REQ-014 and AC-010 added)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-41)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-004 notes 1–14)
- Reviewed Design Spec: `design-spec.md` (status `Needs Review`; the user's go for the build of 2026-10-31 stands, the design approval is not pending)
- Supplemental Task Artifacts Reviewed: `run-runtime-switch-contract.md` (§3.3, §3.7, I-7, I-10), `code-review-report.md` (CRR-002, F-1…F-3), `follow-ups.md`, `solution-designer-handoff.md` (Round 3); `api-e2e-execution-coverage-report.md` and the red test RS-01 as cited by CRR-002 (not re-run)
- Relevant Solution Revision IDs: SR-004 (note 14)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: failure-origin review CRR-002 of the built system: two reviewed premises measured wrong (F-1, F-2, Design Impact), one Local Fix (F-3)
- Prior Review Round Reviewed: round 2 (`ARCH-REV-002`, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, documents `69426cd284` (production code `3521ae05f1`, so the new library method does not exist yet and was judged from the design and from the code it wraps). Opened in code: `autobyteus-ts/src/memory/store/run-memory-file-store.ts` (`recordSystemInstructionSupply`, `rotateActiveRawTracesBeforeBoundary`, `archiveAndRewriteActive`, `removeActiveRawTracesArchivedByBoundary`, `findActiveRawTraceByCorrelationId`), `raw-trace-archive-manager.ts` (`archiveRecords`, pending-segment handling), `agent/bootstrap-steps/*` (order: MCP prewarming, system prompt, snapshot restore), `system-prompt-processing-step.ts`, `acp-agent-run-backend-factory.ts` (`captureInstructions`), `agent-run-activation-operation.ts` (prepare/cleanup/abort), `standalone-agent-run-lifecycle-service.ts` (`activateSwitched`, `abortForRetry`), `local-memory-run-view-projection-provider.ts` (`buildProjection`, `buildActiveTracePage`), `agent-memory/store/memory-file-store.ts` (`readRawTracesActiveSnapshot`, `readRawTraceManifestGeneration`), `agent-memory-service.ts`, `agent-conversation-activity-inspector.ts`, and a grep of every reader of the active raw-trace file.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged; the revision adds one library method and one chat reader inside existing owners.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The design spec does not show the design approval as `Pending` (the user's go for the build stands).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`, with BEH-002 `Needs Correction` for the retry path (ARCH-F-007)
- Approved requirements / intended behavior understood: REQ-010 now says one raw-trace file never holds records of two runtimes, including the records the new agent's own session writes while it starts; a failure before the new session exists writes no marker and archives nothing; a retry never writes two markers; a user who gives up a failed attempt leaves no marker behind. REQ-014: after a reload the chat shows the earlier conversation, the marker and the new agent's records, in order, with paging on the same sequence; a never-switched run and compaction's latest-segment view unchanged.
- Relevant existing behavior and evidence confirmed: CRR-002's two premises are confirmed in code. (1) A native candidate writes while it prepares: bootstrap step 2 `SystemPromptProcessingStep` calls `recordSystemInstructionSupply`, which appends to the active file (`run-memory-file-store.ts:128-152`); Grok's `captureInstructions` runs at backend creation (`acp-agent-run-backend-factory.ts:115,180`). (2) The chat reads the active file only (`buildProjection` with `includeArchive: false`, `local-memory-run-view-projection-provider.ts:41-45`; `buildActiveTracePage` via `getActiveRawTraceSnapshot`).
- Scope guardrail confirmed: yes.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (ARCH-F-007: REQ-010, AC-009, AC-002, I-7).
- Remaining material ambiguity, if any: none in the requirements.
- Statements about existing code the design relies on, opened at their cited lines: all hold except the failure-behavior sentence (see ARCH-F-007): "the next prepare's identical instruction is not written twice by `recordSystemInstructionSupply`" is true (`:140-146` scans back to the last system-instruction record in the active file) and is the cause of the problem, not a mitigation.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed (unchanged) | None (F-3's context rule is a sound local fix) |
| BEH-002 | System | Pass | Pass | Fail on the retry path of a native or Grok target: the retry's watermark absorbs the failed candidate's own record into the previous agent's segment | Needs Correction | ARCH-F-007 |
| BEH-005 | User | Pass | Pass (F-2 confirmed) | Pass: one chat reader serves both projection methods | Confirmed | None |
| BEH-007 | System | Pass | Pass | Pass | Confirmed (unchanged) | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `run-runtime-switch-contract.md` v2 | Pass | Pass | Fail on §3.3 failure behavior (the accepted residue contradicts REQ-010) | Fail on the same point; I-7 as written holds only for the first attempt | Pass | ARCH-F-007 |
| `follow-ups.md`, `code-review-report.md` | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged; "Premise corrected (CRR-002 F-1)" recorded | None |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings save | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-002 | First message | Pass | Pass: `begin (watermark) -> prepare -> validate -> record -> persistAndPublish -> register`, lifecycle drives each mechanism in order | N/A | Pass | Pass for the first attempt; the retry's `begin` re-reads the tail of a file the failed attempt already changed | Pass | Fail until ARCH-F-007 |
| DS-003 | Journal per-file runtime | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-004 (new in substance) | Chat reload: `getRunProjection` / paging → `buildProjection` / `buildActiveTracePage` → `AgentMemoryService.getChatRawTraceSnapshot` → `MemoryFileStore.readChatRawTraces` (switch segments in index order, then the active file) → replay events → projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunMemoryFileStore` (library) | Pass: one new public method on the one owner of the active file; built on the private `archiveAndRewriteActive` | Pass | Pass | Pass | |
| `RuntimeSwitchRecorder` / `RuntimeSwitchMemory` | Pass | Pass: the lifecycle never touches the file | Pass | Pass | |
| Chat reader (`AgentMemoryService.getChatRawTraceSnapshot` → `MemoryFileStore.readChatRawTraces`) | Pass: both projection methods use it | Pass | Pass: readers of the active file were grepped and each classified: `AgentConversationActivityInspector` already reads the active file then all archived segments (unaffected); `RawTraceFileSourceService` is the journal's reader (per file); `getRunMemoryView` / GraphQL `memory-view` is the raw-trace viewer with its own `includeArchive` option (not "the chat"); compaction code uses the library | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Ports owned by `agent-execution`; recorder → library; projection → memory service | Pass | Pass | Pass | Pass | |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RuntimeSwitchMemory.begin(runtimeSwitch)` → ticket, `.record(ticket)` | Pass | Pass: `begin` reads the watermark and writes nothing; `record` is one library call | Pass | Low | Pass in shape; a failure-path counterpart is missing (ARCH-F-007) |
| `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch({ boundary, marker, throughTraceId })` | Pass | Pass | Pass | Low | Pass in shape; three rules must be stated (ARCH-F-007) |
| `readChatRawTraces` / `getChatRawTraceSnapshot` | Pass | Pass | Pass | Low | Pass |
| `selectionContextFor` (no current model while a switch is pending) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Archive through a point, marker first | Pass: the third wrapper of `archiveAndRewriteActive` | Pass | N/A | Pass | `archiveAndRewriteActive` returns null on an empty move set and, for an existing segment, only removes the archived ids; neither branch writes a marker, so the new method must (see ARCH-F-007 item 3) |
| Chat across files | Pass: extends the memory store/service pair | Pass | N/A | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` store, `agent-memory`, run-history projection, `agent-execution` | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unchanged; the chat reader is one function used twice | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ticket (opaque; holds the watermark) | Pass | Pass | Pass | N/A | Pass | Should be a plain value (watermark id or null plus the switch), not a handle, so a retry can rebuild it |
| Chat cursor generation | Pass: device and inode of the active file plus the latest complete segment of any type (`readRawTraceManifestGeneration`); every switch or compaction changes at least one of them | Pass | Pass | N/A | Pass | |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (readers of the active file classified above). Each domain word keeps one meaning (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mapping rows for the library method, `memory-file-store.ts`, `agent-memory-service.ts`, the projection provider | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and changed paths | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The first order (marker appended, then `rotateActiveRawTracesBeforeBoundary` for a switch) | Pass: superseded; the probe's order is marked superseded | Pass | Pass | Pass | Confirm at implementation that the switch no longer calls the before-boundary rotation and that no helper remains only for it |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Chat reader | No: a run that never switched reads the active file only because it has no switch segment, not through a second path | Pass | Pass | |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All three stores | Unchanged decisions | Pass | Pass | N/A | Pass | The new method writes the existing manifest and active-file shapes; the `runtime_switch` boundary type is the only new value. Marker identity across attempts is open (ARCH-F-007 item 2) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Test list ("Added by CRR-002") | Pass; add the retry after a failed native start (ARCH-F-007) | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The active file before and after `record`, with a candidate record and with a retry | Yes | Fail: no before/after file shape for the new method, and none for the retry case | N/A | Fail | A three-line before/after of the active file and the manifest entry for: first attempt, retry after a failed start, retry after a failed commit |

## Material Premise Validation (Only When Needed)

### `MP-3` — A native or Grok target's start fails after the candidate has written its own record, and the user sends again

- Related approved requirement or established contract: REQ-010 (amended), AC-009 ("a retry"), AC-002; contract §3.3 failure behavior (the supported scenario "an activation that fails and is sent again, the existing retry of `activateOnce`").
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the user sends a message to a run with a saved switch (the designed trigger), the activation throws before `record` completes, and the user sends again. The design lists these failures as supported: a throw from prepare, from `validateCandidateOrAbort`, from `record` (`activateSwitched` catches it and calls `abortForRetry`), and the existing retry of `activateOnce`.
- Support evidence: exposed surface and action: the chat input of a stopped run after the settings save. A native candidate writes its `system_instruction` record in bootstrap step 2 (`system-prompt-processing-step.ts:39`), before the later step `WorkingContextSnapshotRestoreStep` and before `markPrepared`, validation, and `record`; any later throw leaves that record in the active file. Grok writes at backend creation.
- Forward current or approved target production caller/event path: attempt 1: `begin` (watermark = last record `L`) → `prepare` writes `S1` after `L` → a later step throws → `abortForRetry`/cleanup releases the candidate, which deletes no record → attempt 2: `begin` reads the tail again: watermark = `S1` → `prepare`: `recordSystemInstructionSupply` finds `S1` as the last system-instruction record with the same content and writes nothing (`:140-146`) → `record(ticket)` archives "through the watermark", that is, through `S1`.
- Lifecycle preconditions and material consequence at the claimed point: `S1`, the new agent's own record, ends up in the previous agent's `runtime_switch` segment, and the new agent's active file ([marker, …]) has no system instruction of its own: I-7 and REQ-010 are violated on the retry path with the same symptom as CRR-002 F-1. A failure that is then abandoned (undo, or a third runtime) leaves `S1` at the tail of the previous agent's active file, which also contradicts "one raw-trace file never holds records of two runtimes". The design accepts this residue in §3.3 ("as for any failed native start"), but a failed native start in an ordinary restore leaves the record in the same agent's era, which is not the same case.
- Reachability: `Reachable` as a designed supported scenario (the failure injection AC-009 and the failure tests in the design call for exactly this retry). How often a native bootstrap step fails after the system-prompt step is not measured; the design does not rely on it being rare.
- Review consequence / proportionate response: ARCH-F-007.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| The retry's watermark | Breaks I-7 for native and Grok targets on the supported retry path | ARCH-F-007 | Open |

## Review Decision

`Fail`

## Findings

### ARCH-F-007 — A retry re-reads the watermark and absorbs the failed attempt's candidate record into the previous agent's segment

- Type: `Design Impact`
- Severity: Medium (blocking)
- Approved requirement / acceptance criterion protected: REQ-010 (amended: one raw-trace file never holds records of two runtimes, including the new session's own records; a user who gives up a failed attempt leaves no marker behind; a retry never writes two markers), AC-009, AC-002, contract I-7; BEH-002.
- Scope status: `Within Approved Scope`
- Required update changes approved behavior: `No`
- Affected behavior: the retry path of the switch activation for a target that writes during prepare (native, Grok).
- Evidence: see `MP-3`. In short: the failure guarantee "a failed start writes no marker and archives nothing" holds, but the candidate's own record from the failed attempt stays in the file, `begin` of the next attempt sets the watermark after it, the instruction dedupe writes nothing new, and `record` archives it as the previous agent's. The design text records the residue and the dedupe as harmless; they are the cause.
- Material-premise validation: `MP-3` (`Reachable`).
- Required update (lifecycle drives the order; the choice of mechanism is the Solution Designer's — the smallest I see is the first):
  1. Make "a failed attempt leaves nothing behind" literally true for the candidate's records. For example, add a third call on the same port, `RuntimeSwitchMemory.discard(ticket)`, that the lifecycle calls after the candidate's abort has completed (so nothing is still writing) in each branch that ends an attempt before `record` succeeds (prepare failure, validation failure, `record` failure), and that removes exactly the records written after the ticket's watermark. The next attempt then starts from the original tail, and an abandoned attempt leaves no record of the new runtime in the previous agent's file. Alternatively remember the first attempt's watermark (for example by storing it with the switch key) so a retry reuses it; state which, and what it costs in persisted state.
  2. State the rules the new library method needs for the retry and crash cases (all three are possible readings of "idempotent by boundary key and marker correlation id"): (a) if the marker is already in the active file, the watermark is ignored and nothing more is archived (a retry's watermark points after the marker); (b) the marker's trace id is the same on every attempt and equals the segment's `boundary_trace_id` (I-3): derive it from the switch key, or take it from the existing segment; (c) when there are no records through the watermark, or the segment already exists, the method still ensures the marker is the first record (`archiveAndRewriteActive` writes nothing in the first case and only removes archived ids in the second).
  3. Replace the §3.3 sentence that accepts the residue, restate I-7 for the retry, and add a before/after shape of the active file and the manifest entry for: first attempt, retry after a failed start, retry after a failed commit.
  4. Tests: retry after a native start that throws after its system instruction was written (archived segment holds only the previous agent's records; the new file holds the marker then the candidate's instruction exactly once); a failed attempt then abandoned; the library method's empty-watermark, repeated-call and interrupted-rewrite cases (already planned).
  5. Say, for the instruction dedupe across eras: if the previous era's last system-instruction record has the same content as the candidate's, `recordSystemInstructionSupply` writes nothing and the new era has none of its own. Whether that can happen for a native or Grok target (their prompts are composed differently, not shown here) was not established; state the answer or the consequence (reachability is `Unclear`; no mechanism is required for it).
- Why proportionate: it closes the exact invariant this revision exists to guarantee on the one supported path it misses, with one call on an existing port or one remembered value, and three stated rules for a method that does not exist yet.
- Recommended recipient: Solution Designer.

## Classification

`Design Impact`

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Recommendations (non-blocking)

- Ticket shape: make it a plain value (the watermark id or null, plus the switch), so a retry rebuilds it and the port stays stateless.
- Chat tests: add a run that switched native → other → native (two native eras; native turn ids restart at `turn_0001` per construction), in addition to once and twice and compaction before and after.
- After a compaction in the new era the marker (the first record of the active file) moves into a compaction segment that the chat does not read, so on reload the marker disappears and the new era shows only its post-compaction records. §3.7 states this and REQ-014 keeps compaction's view; the marker was the user's own request (DEC-3, REQ-011). Tell the user at the approval request; if he wants the marker kept, that is a requirement decision for him.

## Residual Risks

- Hand-over notice held in memory (restart loses it); a failed activation then undone leaves a marker (accepted).
- Reading the switch segments on every chat open and page: bounded by the previous era's active file, which compaction keeps small; larger than before for a switched run.
- Native writer holding the active file across rotation (escalation trigger; none known). Scripted runtimes cannot show every real backend; the real run asserts I-7 on each runtime pair.
- Process crash remains unsupported by the design; the interrupted-rewrite completion is still specified because the library method is tested for it.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` (MP-3 is a designed supported scenario and `Reachable`; the machinery asked for rests on it)
- Notes: The two corrections CRR-002 asked for are sound: the watermark order fixes the first attempt for native and Grok targets, and one chat reader for `buildProjection` and `buildActiveTracePage` is the right size (the cursor generation still changes on every switch and compaction, and no other reader treats the active file as the chat). The Fail is for one defect on the retry path of the same invariant (ARCH-F-007), with a small fix; I expect a Pass after it, with no structural change.
