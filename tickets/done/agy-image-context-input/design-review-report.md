# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/requirements-doc.md` (SR-003, Approved; DEC-001 A, DEC-002 A, DEC-003 A)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/investigation-notes.md` (incl. "SR-003 Architecture Investigation")
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/design-spec.md` ("SR-003 Revision" section governs where it differs)
- Supplemental Task Artifacts Reviewed: `solution-handoff.md` (SR-003 Update), `probe-evidence/` (evidence only), `code-review-report.md` + `code-review-revision-record.md` (CRR-001), `implementation-handoff.md` (IR-001), `api-e2e-evidence/e2e-cf-transport.log` (lines 288, 378)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: First independent architecture review after SR-003 reclassification to `Medium` / `High` (CRR-001 Requirement Gap resolved by DEC-003 A)
- Prior Review Round Reviewed: None
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/agy-image-context-input` (base `048ea6cec` + IR-001 `8139c6b12`). Code read for this review:
  - `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts`
  - `domain/agent-run.ts:171-230,324-335`
  - `input/agent-run-provider-input-normalizer.ts`
  - `services/agent-streaming/agent-stream-handler.ts:340-362`
  - `backends/codex/thread/codex-user-input-mapper.ts`
  - `backends/claude/session/claude-user-message-builder.ts`, `claude-session.ts:211-213`
  - `backends/acp/input/acp-prompt-builder.ts`
  - `services/agent-run-command-coordinator.ts:100`
  - `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:178-191`
  - `autobyteus-ts/src/agent/message/{multimodal-message-builder,context-file-reference-section,agent-input-user-message}.ts`
  - `autobyteus-ts/src/llm/user-message.ts:43-44`
  - `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts:103-128`
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`
  - `autobyteus-ts/src/memory/raw-trace-ingestion.ts:142-160`
  - `autobyteus-web/composables/useContextAttachmentComposer.ts:149-157,207-235`
  - `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue:370-376`

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: The change alters the runtime-independent AgentRun input admission contract, which gates input for every runtime. The evidence supports this.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Contradicted` (one sub-case of BEH-007 / REQ-004; see AR-001)
- Approved requirements / intended behavior understood: Yes.
  - SR-001 (AGY path-text delivery) is approved and implemented.
  - DEC-003 A widens admission to "text or ≥1 context file" on every runtime.
  - A message with neither text nor attachments is still rejected.
  - Displayed and stored user messages are unchanged (REQ-006).
  - Attach-only messages replay with their attachments and no placeholder text (REQ-007).
- Relevant existing behavior and evidence confirmed:
  - `admit` and `reserve` both reject on `requiredString(message.content)` (lines 87-93 and 114-120).
  - `AgentRun.postUserMessage` calls `admit`, and `reserveUserMessage` calls `reserve`.
  - The stream handler passes `content: ""` through and sets `context_files` to `null` or to a non-empty list.
  - The normalizer runs after admission and preserves the file count.
  - The Chat composer enables attach-only Send.
- Scope guardrail confirmed:
  - In scope: UC-001..UC-005.
  - Out of scope: the ACP/Grok web-URL-only no-text residual, team-composer text requirement, history rendering, and frontend.
  - Preserved: BEH-004, BEH-005, REQ-006.
  - Review authority: as stated in the requirements doc.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. No blocking `Design Impact` finding is raised; AR-001 and AR-002 are `Requirement Gap`s.
- Remaining material ambiguity:
  - **AR-001:** REQ-004 says attach-only sends are delivered "on every runtime" and carves out only ACP/Grok web-URL-only. Claude and native also fail a reachable attach-only send whose only attachments are web URLs to non-image files. The design records "None" (no change) for both.
  - **AR-002:** The AC-011 "no placeholder text" outcome is not established for native runs, whose stored user trace carries the `Reference files:` section.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (revised DS-001 now includes admission) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (DS-002 same backend; team composer still requires text) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (delegation/inter-agent surfaces keep their own content checks; admission widening only accepts more) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass (with-text mappings unchanged; Codex guard only affects the empty-text case) | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Fail (sub-case) | Pass (Chat composer attach-only Send; `e2e-cf-transport.log:288,378`) | Fail for Claude/native web-URL-only non-image sub-case (AR-001); Unclear for native AC-011 display (AR-002); Pass otherwise | Needs Correction | Resolve AR-001, AR-002 upstream |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probe-evidence/` | Pass | Pass | Pass | Pass | Pass | — |
| `solution-handoff.md` (SR-003 Update) | Pass | Pass | Pass | Pass | Pass | — |
| `code-review-report.md` (CRR-001) | Pass | Pass | Pass | Pass | Pass | — (triggering evidence) |
| API/E2E artifacts (uncommitted) | Pass | Pass | Pass | Pass | Pass | — (E2E-CF-002 to be re-run; handoff says so) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec "Design health (SR-003)" | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`: the right owner (`AgentRunInputAdmissionState`) encodes "deliverable input" too narrowly as "non-empty content". Confirmed at lines 87-93 and 114-120. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No refactor; one predicate collapses the duplicated check in `admit`/`reserve` | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File-change table and removal section | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 (revised) | Standalone AGY send incl. admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | AGY team member | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Attach-only on Claude/Codex/native/ACP/Grok | Pass | Pass | N/A | Pass | Pass | Pass | Pass (per-runtime table incomplete for one sub-case → AR-001) |

Note (non-blocking): DS-003 and BEH-007 appear only in the "SR-003 Revision" section. The main spine-inventory and behavior-map tables were not updated. The section explicitly supersedes the earlier ones, so this is readable, but folding them in would help.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunInputAdmissionState` via `AgentRun.postUserMessage` / `reserveUserMessage` | Pass | Pass (private predicate) | Pass ("Do not move this rule into callers") | Pass | — |
| Runtime input mappers (per backend) | Pass | Pass | Pass | Pass | "Runtime builders must not assume non-empty content" is the right rule |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Admission / callers | Pass | Pass (no pre-validation in stream handlers, coordinator, or GraphQL) | Pass | Pass | — |
| AGY builder (IR-001) | Pass | Pass | Pass | Pass | Unchanged from SR-002 |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `admit` / `reserve` (rejection code unchanged `AGENT_RUN_INPUT_INVALID`, new message) | Pass | Pass | Pass | Low | Pass |
| `toCodexUserInput` | Pass | Pass | Pass | Low | Pass |
| `buildAgyUserMessageText` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Deliverable-input invariant | Pass | Pass (extend existing owner) | N/A | Pass | — |
| Empty-text handling per runtime | Pass | Pass (Claude/native/ACP already guard; Codex gets a local guard) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/input` | Pass | Pass | Pass | Pass | — |
| `backends/codex/thread` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicate content check in `admit`/`reserve` | Pass | N/A (one private predicate in the same file) | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

N/A: no shared type or schema changes. `AgentInputUserMessage` is unchanged and already allows `content: ""` with `contextFiles`.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-input-admission-state.ts` | Pass | Pass | N/A | Pass | — |
| `codex-user-input-mapper.ts` | Pass | Pass | N/A | Pass | — |
| Test files (admission, Codex, Claude, ACP, native builder, raw-trace replay) | Pass | Pass | N/A | Pass | Non-blocking: `tests/unit/agent-execution/agent-run.test.ts` also asserts the old rejection message "AgentRun input content must be a non-empty string." Add it to the file list. |
| `docs/modules/agent_execution.md` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All SR-003 files (existing paths) | Pass | Pass | Low | Pass | No new files |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Content-only admission checks (87-93, 114-120) | Pass | Pass | Pass | Pass | `requiredString` is still used elsewhere in the file (`applyDispatchResult`, `pendingSnapshot`), so it stays, as the design anticipates. |
| Raw content send in AGY backend (IR-001) | Pass | Pass | Pass | Pass | Done |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Admission rule | No | Pass | Pass | No flag or fallback |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| User raw traces (empty content + attachments) | Not Affected | Pass (replay at `raw-trace-to-historical-replay-events.ts:178-191` has no empty-content filter; `run-history-service-helpers.ts:69` and summary ignore empty) | Pass | N/A | Pass | AR-002 concerns native display semantics, not data transition |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| SR-003 change sequence | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Admission predicate | No | N/A | N/A | Pass | The rule text plus AC-009 (a)(b)(c) suffices |
| Per-runtime empty-text behavior | Yes | Pass (table) | N/A | Pass | Table incomplete for one sub-case (AR-001) |

## Material Premise Validation (Only When Needed)

### `MP-001`: An attach-only send whose only attachments are web URLs to non-image files reaches Claude and native backends after the SR-003 widening

- Related approved requirement or established contract:
  - REQ-004 (Must): delivered "on every runtime".
  - Out-of-scope carve-out names only ACP/Grok web-URL-only.
  - SCN-006 accepts pasted remote-URL locators as a Supported Explicit Edge.
- Relevant behavior ID(s): BEH-007 (SCN-007)
- Initiating basis kind: `User`
- Independent product-supported initiating trigger:
  - The user pastes a URL line (e.g. `https://example.com/report.pdf`) into the Chat/standalone composer's context-file area.
  - Then the user presses Send with no typed text.
- Support evidence:
  - `ContextFilePathInputArea.vue:370-376` (`onPaste` → `appendLocatorAttachments(pastedText.split(...))`).
  - `useContextAttachmentComposer.ts:207-235` hydrates every non-empty line as a locator attachment.
  - Attach-only Send is enabled (`agentPrimaryAction.ts:55-60`).
  - SCN-006 already treats pasted remote-URL locators as supported.
- Forward target production path:
  - `SEND_MESSAGE{content:"", context_file_paths:[url]}` → `agent-stream-handler.ts:348-361` (`ContextFile(url)`, non-image type).
  - → `AgentRun.postUserMessage` → widened admission **accepts** (≥1 context file).
  - → normalizer (URL unchanged) → backend:
    - **Claude:** `describeClaudeUserMessageText` drops non-local URLs, so the text is `""` and there is no image. `hasClaudeUserMessageContent` is false, so `claude-session.ts:211-213` returns `CLAUDE_INPUT_EMPTY`.
    - **Native:** `buildLLMUserMessage` produces content `""` and no media. `LLMUserMessage` throws ("must have either content or at least one media URL", `user-message.ts:43-44`). The throw happens inside the turn's input pipeline (`agent-input-pipeline.ts:127`), so it becomes a turn error. Memory ingest also fails there, but that failure is caught and logged.
    - **Codex and AGY:** deliver a `Context file: <uri>` line, as designed.
    - **ACP/Grok:** `ACP_PROMPT_EMPTY`, the approved residual.
- Lifecycle preconditions and material consequence: Admission now accepts the message, but on Claude and native it then fails visibly instead of being delivered. This contradicts REQ-004 "every runtime" for a sub-case that is not covered by the approved carve-out. The design's per-runtime table records "None" for both runtimes, without this case.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-001 (`Requirement Gap`). The approved carve-out must be extended (user acknowledgment), or a Claude/native mapping change must be approved. A general `Context file:` line would change those runtimes' with-text input, which REQ-006 preserves. No new machinery is required either way.

### `MP-002`: Native attach-only history replays the `Reference files:` section as the user message text

- Related approved requirement: REQ-007 / AC-011 ("no placeholder text"); REQ-006 / out-of-scope "history rendering" unchanged.
- Relevant behavior ID(s): BEH-007
- Initiating basis kind: `User`
- Independent trigger: Attach-only Send with a local image or file on a native (AutoByteus) standalone run, then reopen the run (supported Chat composer and run-history surfaces).
- Support evidence: SCN-007 (approved); reopen of a run is a normal history action.
- Forward path:
  - `memory-ingest-input-processor.ts:41-44` → `buildLLMUserMessage` → content = `Reference files:\n- <abs path>` (all local files, images included) → `buildNativeUserMessageTrace` stores `content: llmUserMessage.content` (`raw-trace-ingestion.ts:149`).
  - → `raw-trace-to-historical-replay-events.ts:178-191` replays `content` verbatim.
  - The design's AC-011 evidence (`RuntimeMemoryEventAccumulator`, which writes `content: ""`) covers Codex and Claude only. `docs/modules/agent_execution.md:132` says native runs skip that recorder.
- Lifecycle consequence: On native reopen, the attach-only user message probably shows the reference-section text. This is the same pre-existing native rendering as with-text messages, not a new placeholder. Whether it meets AC-011's "no placeholder text" outcome is not stated. Inferred from code; not executed.
- Reachability: `Reachable` (path); acceptance under AC-011: `Unclear`
- Review consequence: AR-002. Clarify AC-011's expected native outcome. No new machinery is implied.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AR-001 | REQ-004 vs. Claude/native behavior for web-URL-only non-image attach-only sends | Solution Designer decides with the user: extend the carve-out, or approve a minimal mapping change | Open |
| AR-002 | AC-011 expected outcome for native runs | Solution Designer states the native expectation (likely "pre-existing reference-section text, unchanged") and gets user acknowledgment if needed | Open |

## Review Decision

- `Fail`: the design is structurally sound, but the approved basis it realizes is inconsistent with current code for one reachable REQ-004 sub-case (AR-001). AC-011's native outcome is also unestablished (AR-002). Both need a quick upstream decision before implementation.

## Findings

### AR-001: REQ-004 "every runtime" is not met for web-URL-only non-image attach-only sends on Claude and native

- Type: `Requirement Gap`
- Severity: Medium. Blocking until decided; the fix is cheap.
- Protected requirement: REQ-004 (Must), REQ-006 (preserved Claude/native with-text input), out-of-scope carve-out (ACP/Grok web-URL-only).
- Scope status: `Requirement Gap — User Approval Required`
- Changes approved behavior: Yes if the carve-out is extended (narrows REQ-004). It is a design-only change if a minimal empty-text-only mapping is chosen, but that conditional mapping is awkward and touches REQ-006's "unchanged" boundary. User approval status: not yet sought.
- Affected behavior: BEH-007 / SCN-007 on Claude and native.
- Evidence: MP-001. Key lines:
  - `claude-user-message-builder.ts:87-95`
  - `claude-session.ts:211-213`
  - `multimodal-message-builder.ts:24-32`
  - `user-message.ts:43-44`
  - `agent-input-pipeline.ts:127`
  - design-spec SR-003 per-runtime table: Claude "None", Native "None".
- Material-premise validation: MP-001 (Reachable).
- Required update:
  1. Complete the per-runtime table for non-local non-image attachments with no text: Codex and AGY deliver; ACP/Grok, Claude and native fail visibly. Claude fails with `CLAUDE_INPUT_EMPTY` (an input rejection). Native fails with a turn error.
  2. Decide with the user whether to extend the accepted residual from "ACP/Grok" to "Claude, native, ACP/Grok". Recommended, consistent with DEC-003's acceptance of the ACP case. Alternatively, approve a minimal mapping change.
  3. Reflect the decision in REQ-004 / out-of-scope / AC-010. AC-010's alternate outcome should list each runtime's visible failure, and a unit case locks native's failure surface.
- Why proportionate: There is no new machinery, only an accurate per-runtime record and a scope statement that matches reachable behavior. Passing would hand implementation a Must requirement that the design knowingly does not meet.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-002: AC-011 "no placeholder text" outcome is unestablished for native runs

- Type: `Requirement Gap` (clarification)
- Severity: Low
- Protected requirement: REQ-007 / AC-011; REQ-006 / out-of-scope "history rendering".
- Scope status: `Requirement Gap — User Approval Required` (only if the expectation differs from pre-existing native rendering)
- Changes approved behavior: No, if the clarification states that native keeps its pre-existing reference-section rendering.
- Evidence: MP-002. AC-011's design evidence covers only the `RuntimeMemoryEventAccumulator` path. Native traces store LLM content that includes the reference section.
- Required update:
  - State AC-011's expected native outcome. It is likely "the user message shows the pre-existing `Reference files:` text plus attachments; no synthesized placeholder".
  - Point the AC-011 test or user verification at it.
  - If the user considers that text a placeholder, it becomes a scope change to native history rendering, which is currently out of scope.
- Why proportionate: This is a one-line clarification with no machinery. It prevents a surprise failure in user verification.
- Recommended recipient: `/software_engineering_team/solution_designer`

### Non-blocking notes

- N-1: Add `tests/unit/agent-execution/agent-run.test.ts` to the SR-003 file list; it asserts the old rejection message.
- N-2: Fold BEH-007 and DS-003 into the main behavior-map and spine-inventory tables, or keep the explicit supersede note as is.

## Classification

- `Requirement Gap` (AR-001, AR-002). The SR-003 design structure (admission owner, single predicate, no caller pre-validation, Codex guard, persisted-data decision) passes and needs no structural rework.

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- Provider acceptance of image-only turns (Codex `localImage`/`image` with no text item for remote-URL-only). The design already plans one live Codex attach-only validation.
- ACP/Grok (and, pending AR-001, Claude/native) web-URL-only visible failures.
- Claude-in-AGY still unprobed (quota).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Fail`. MP-001 is reachable and contradicts the approved REQ-004 scope statement. MP-002 acceptance is unclear.
- Notes: Structural review passes. Once AR-001 and AR-002 are resolved upstream (expected to be a requirements/scope wording update plus test-list additions), re-review should be limited to those deltas.
