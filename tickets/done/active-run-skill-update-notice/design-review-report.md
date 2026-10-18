# Design Review Report — `active-run-skill-update-notice`

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/requirements-doc.md` (Approved SR-003, by the Solution Designer within the direction; user informed)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed: None
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3 (limited to AR-004)
- Trigger: `Revised Architecture Design Complete` (SR-004) from `/software_engineering_team/solution_designer`
- Prior Review Round Reviewed: 2 (ARCH-REV-002, `Fail`: AR-004). Round 1: ARCH-REV-001, `Fail`, AR-001…AR-003, resolved in round 2.
- Latest Authoritative Round: 3
- Round-3 evidence:
  - `autobyteus-ts/src/memory/memory-manager.ts:231–237`: `appendWorkingContextUserMessage` uses `options.rawTraceIds ?? findRecentRawTraceIds(…, 'user', message.content)`, so a combined content needs explicit IDs.
  - `autobyteus-ts/src/agent/llm-request-assembler.ts:67–72`: the working-context append.
  - `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:204–213`: any `system_task_notification` trace with content becomes a replay event, whatever its sender.
- Current-State Evidence Basis: base `6473e2694` (no source changes). Round-1 reads still hold. Additional files read in round 2:
  - `agent-execution/input/agent-run-provider-input-normalizer.ts` (copies the claimed message for the provider);
  - `agent-memory/services/agent-run-memory-recorder.ts` (`attachToRun` / `onUserMessageForwarded`; it records only external-provider runtimes);
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` and `memory/memory-manager.ts` `ingestUserMessage`. Native AutoByteus records `buildLLMUserMessage(message)`, the **processed** content it received, as the user trace.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`. Confirmed and unchanged.
- Independent Architecture Review required by the classification: `Yes`.
- Approval basis: The SR-003 requirement changes are approved by the Solution Designer within the direction, with the user informed.
  - DEC-009 follows the user's literal "send the agent message … the same way" direction.
  - DEC-010 and DEC-011 are mechanism and identity decisions that keep the approved outcomes.
  - Accepted.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - REQ-004 now states agent-message semantics per runtime capability.
  - REQ-005 combines the notice with the next external input in one provider input; the input keeps its own sender and presentation, and the notice is presented separately (REQ-007).
  - REQ-008/009 are name-keyed.
  - REQ-010 has an explicit ignore list.
- Relevant existing behavior and evidence confirmed: Yes.
  - The corrected REQ-004 matches `claimNext` and the backends' `inputCapabilities`.
  - DEC-010 combines on the already-claimed, normalized dispatch, so admission order and the backend contract are untouched.
  - External-runtime memory records the admitted original (`onUserMessageForwarded`).
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass (name-keyed re-resolution; watch re-sync) | Confirmed | — |
| BEH-002 | Contract | Pass | Pass | Pass (agent-message semantics per capability) | Confirmed | — |
| BEH-003 | Contract | Pass | Pass | Pass for the live turn (one dispatch on every runtime) | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass. Native: the `platform_input_preface` tag → `ingestSystemTaskNotification` trace plus the user trace with `original_content`; replay maps it. External: the server recorder (sender allow-listed, turn ID). | Confirmed | N-1 |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | `Feature`; one port in `AgentRun` dispatch | — |
| Root-cause classification evidence-backed | Pass | — | — |
| Refactor decision explicit | Pass | `No`; the admission state and backend contract are deliberately unchanged | — |
| Supported by concrete sections | Pass | DS-003, the bounded spine, the port contract and the file mapping are revised consistently | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Naming | Ownership | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Track used skills (by name) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Change → busy post / idle mark | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Next external input → combined dispatch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Presentation / history | Pass | Pass (SR-004 covers native and external separately) | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun` dispatch + `AgentRunInputPreface` (`takePreface` / `prefaceDelivered` / `prefaceReturned`) | Pass | Pass | Pass | Pass | `takePreface` moves the notice to in-flight atomically; the busy post skips in-flight runs |
| `SkillUpdateNoticeService` | Pass | Pass | Pass | Pass | — |
| Tracker / store | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` ↔ `skill-update-notices` | Pass | Pass | Pass | Pass | — |
| Native core (`autobyteus-ts`) | Pass | N/A | Pass | Pass | AR-004 may need a narrow, generic marker handled in native memory ingest, which keeps the direction (no skill knowledge in the core) |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunInputPreface` (revised) | Pass | Pass | Pass | Low | Pass |
| `SkillFolderWatcher` / `onSkillFoldersChanged` (dirs → names re-resolved) | Pass | Pass | Pass | Low | Pass |
| `SeenSkillVersionsStore` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Busy delivery (`postUserMessage`) | Pass | Pass | N/A | Pass | DEC-009 |
| Combined dispatch | Pass | Pass | Pass | Pass | Done on the normalized copy; admission is unchanged |
| System-notice event, segment and external trace | Pass | Pass | N/A | Pass | Turn ID included (R-2) |
| Native history recording | Pass | Pass (generic tag; existing trace type and replay mapping) | Pass | Pass | No skill knowledge enters `autobyteus-ts` |
| Ignore rules | Pass | Pass (dedicated list per REQ-010) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Supports Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/skill-update-notices/` | Pass | Pass | Pass | Pass | — |
| `agent-execution` | Pass | Pass | Pass | Pass | — |
| `agent-memory` / native memory ingest (`autobyteus-ts`) | Pass | Pass | Pass | Pass | SR-004 |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Choice Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Notice types, seen versions, sender ID | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap Controlled | Core/Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunPreface {id, text, presentation}` | Pass | Pass | Pass | N/A | Pass | — |
| Generic tag `platform_input_preface {content, sender_id, original_content}` | Pass | Pass | Pass | N/A | Pass | Replaces the skill-specific marker; consumed by native ingest |
| `seen_skill_versions.json` (by name) | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-update-notices/**` | Pass | Pass | Pass | Pass | — |
| `agent-run.ts` (`executeInputDispatch`) | Pass | Pass | N/A | Pass | — |
| Admission state and backend contract (unchanged) | Pass | Pass | N/A | Pass | — |
| `autobyteus-ts` `memory-ingest-input-processor.ts`, `memory-manager.ts`, `llm-request-assembler.ts`, new `platform-input-preface-metadata.ts` | Pass | Pass | N/A | Pass | SR-004; N-1 |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/skill-update-notices/{domain,services,providers,monitor}` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None (pure addition) | Pass | N/A | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Exists | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| All | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Existing run memory and metadata | `Not Affected` | Pass | Pass | N/A | Pass | — |
| New `seen_skill_versions.json` (keyed by name) | Additive, disposable | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass (the native history test is in step 2) |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape Shown | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Busy run per capability class; idle combined dispatch; restore; GitHub generation swap; content-identical save | Yes | Pass | Pass | Pass | — |
| Reopened history of a native run that received a combined notice | Yes | Pass (test added) | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

P-001…P-003 (ARCH-REV-001) are resolved by DEC-009, DEC-010 and DEC-011.

### `P-005` — A native AutoByteus run receives a combined notice and is later reopened

- Related requirement: REQ-005 ("the input keeps its own sender and presentation; the notice is presented separately"), REQ-007 ("shown in the web conversation as a system notice, distinct from user and agent messages")
- Behavior IDs: BEH-003, BEH-004
- Initiating basis kind: `User`. A user or agent sends the next message to an idle AutoByteus-runtime run after a used skill changed (SCN-002; the idle copy in SCN-006). The user later reopens that run's conversation, an existing product surface.
- Forward path:
  1. `AgentRun.executeInputDispatch` sends the combined content (notice block plus input) to `AutoByteusAgentRunBackend.dispatchUserInput`.
  2. The native input pipeline's `MemoryIngestInputProcessor` → `memoryManager.ingestUserMessage(buildLLMUserMessage(message), …)` records the **combined** content as that turn's user trace.
  3. The server's `AgentRunMemoryRecorder` is skipped for native runs (`isRecordable` covers external-provider runtimes only), so no separate `system_task_notification` trace exists for native.
  4. History replay of the native run is built from its own raw traces.
- Consequence: In reopened history, the user's (or the sending agent's) message shows the platform-notice block inside it, and there is no separate system notice. The live conversation is correct, because the server publishes the event. The design states "the combined provider message is not recorded as the user trace: the recorder already captures the original message at admission", which holds only for the five external runtimes.
- Reachability: `Reachable`
- Review consequence: AR-004, resolved in SR-004 (ARCH-REV-003).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 3). SR-004 resolves AR-004:
- the generic `platform_input_preface` tag set by `AgentRun` on every combined dispatch;
- native ingest writes a separate `system_task_notification` trace and then the user trace with the original content;
- the working context keeps the combined content (what the model saw) with explicit raw trace IDs;
- untagged messages are unchanged;
- the existing replay mapping renders the notice.

The design is ready for implementation, subject to N-1.

Round 2 (`Fail`) recorded that the revision resolves AR-001…AR-003 soundly:
- per-capability agent-message semantics (DEC-009);
- combining at dispatch on the normalized copy, with forwarded-only delivery and return-to-pending (DEC-010);
- name-keyed re-resolution (DEC-011);
- a dedicated ignore list.

That round's one remaining gap, native AutoByteus history (AR-004), is resolved in round 3.

## Findings

None blocking.

Implementation note:
- **N-1:** The trace IDs that `MemoryIngestInputProcessor` obtains (the notice trace plus the user trace) must reach `LlmRequestAssembler` for the same input, for example on per-turn state or the processed message, and not be recomputed. `findRecentRawTraceIds` matches by content and cannot match the combined content. Cover this in the native unit test: working-context entry → both trace IDs.

### AR-004 — Native AutoByteus history records the combined notice inside the input and has no separate notice trace (Resolved, SR-004)

- Type: `Design Impact`. Severity: Medium (resolved).
- Protects: REQ-005 (the input keeps its own presentation; the notice is presented separately), REQ-007, BEH-004.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - `autobyteus-ts` `MemoryIngestInputProcessor` ingests `buildLLMUserMessage(message)`, the received combined content, as the user trace.
  - `AgentRunMemoryRecorder.isRecordable` excludes native runs, so DS-004's server trace is never written for them.
  - The design's DS-004 claim covers only external runtimes.
- Material premise: P-005 (Reachable).
- Required update: Specify the native recording path. For example, a generic preface marker in the combined message's metadata carries the original content boundary (or the original content) and the notice text. The native memory ingest records the user trace as the original input and records the notice as a separate `system_task_notification` trace with the same turn ID and the skill-notice sender, without skill knowledge in the core.

  Alternatively, show that native history replay already separates them. Add the file to the mapping and a test: native combined dispatch → reopened history shows the user message unchanged plus one system notice.
- Why proportionate: A small, generic recording rule in one runtime's memory ingest. No change to delivery or admission.
- Recommended recipient: `/software_engineering_team/solution_designer`

## Classification

N/A (Pass)

## Recommended Recipient

Primary: `/software_engineering_team/implementation_engineer`. Informational: `/software_engineering_team/solution_designer`.

## Residual Risks

These are non-blocking:

- **Uncertain dispatch outcome.** Adopted in SR-004: an uncertain dispatch later reconciled as forwarded marks the preface delivered.
- **R-1:** the re-read path permissions for the absolute source `SKILL.md` (Claude/Codex) and link refresh for managed sources. E2E.
- **R-4:** the busy-check race. Accepted.
- **R-5:** the `ALL_INSTALLED` watch count. Measure it.
- **Compaction-recovery inputs.** They must be distinguishable from external inputs at dispatch. The design's escalation trigger is recorded.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-003)
- Material-Premise Gate: `Pass`
- Notes: Implementation must honor N-1. Residuals R-1, R-4 and R-5 and compaction-recovery identification are tracked for implementation and E2E.
