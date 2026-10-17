# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (2026-10-13) | N/A | N/A | Approved (Solution Designer within the direction; user informed) | BEH-001–004; REQ-001–013; AC-001–010; DEC-001–008 | Requirements approved; design starts |
| SR-002 | Design (+ Evidence) | Architecture investigation and design (2026-10-13) | N/A | Approved / no design | Approved / Design Ready | All BEH/REQ mapped | Design complete; Large / High |
| SR-003 | Mixed (Requirements + Design) | ARCH-REV-001 Fail (AR-001 Requirement Gap; AR-002, AR-003 Design Impact; R-1…R-5) | AR-001…AR-003 | Approved / Design Ready | Approved (within the direction, user informed) / Design Ready | REQ-004, 005, 008, 009, 010; AC-001, 002, 005; QR-003; DEC-009–011 | Agent-message semantics per runtime; combine at dispatch; name-keyed skills; explicit ignore list |
| SR-004 | Design | ARCH-REV-002 Fail (AR-004) | AR-004 | Design Ready (SR-003) | Design Ready | REQ-005, REQ-007 (unchanged; native history now honors them) | Generic `platform_input_preface` tag; native history = original input plus a separate system notice trace |

## Revision Entries

### SR-001 — Skill-update notices for active runs: requirements baseline

- Phase and classification: Requirements — Initial Baseline
- Trigger: Project Task `project_task_0e330de1-…` plus the user's clarification (deliver like agent messages, mid-turn is fine, reuse the existing path)
- Prior status: N/A → Current: Approved
- IDs: BEH-001–004, UC-001–005, REQ-001–013, AC-001–010, SCN-001–006, DEC-001–008
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction (no `Needs user` decision). The user was informed in the Solution Designer conversation on 2026-10-13.
- Next action: architecture reading gate, investigation and design

### SR-002 — Architecture design complete

- Phase: Design plus Evidence (no requirement change).
- User input after SR-001: the user restated the intent (the notice makes the agent re-read). DEC-001 was explained to the user with an invitation to override; no override.
- Evidence: investigation notes, "Architecture Investigation Findings":
  - single activation point;
  - two admission methods;
  - the system-notice event, trace and segment pipeline;
  - the memory-dir file tolerance;
  - ignore rules;
  - one `ALL_INSTALLED` agent.
- Design (`design-spec.md`):
  - new `src/skill-update-notices/` (tracker, seen-versions store in `<memoryDir>/seen_skill_versions.json`, snapshotter, watcher, notice service and builder);
  - a generic `AgentRunInputPreface` port in `AgentRun`, wired at `AgentRunManager.beginActivation`;
  - busy runs get the notice via `postUserMessage` plus the `SYSTEM_TASK_NOTIFICATION` event; idle and restored runs get it as a preface to their next input;
  - the history trace sender allow-list is extended;
  - a web label.
- Persisted data: Not Affected (additive, disposable file).
- Classification: Large / High.
- Next action: handoff rules.

### SR-003 — Revision after ARCH-REV-001

- Phase: Mixed (Requirements + Design).
- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-001 Fail (`design-review-report.md`).
- Evidence verified independently:
  - `agent-run-input-admission-state.ts:184` appends only when `activeTurnAppend === "supported"`; Codex and Claude declare `supported`, AutoByteus, AGY and ACP declare `unsupported`;
  - `claimNext` dispatches one FIFO entry per `start_turn`;
  - `composeAgentRunInputObserver` captures the original admitted message for memory;
  - `executeInputDispatch` normalizes the claimed dispatch before `backend.dispatchUserInput`.
- Resolutions:
  - **AR-001 (Requirement Gap) → DEC-009:** busy-run delivery follows agent-message semantics per runtime capability: append on Codex/Claude, next turn on the other four. This follows the user's explicit "same as agent messages" direction literally, so it is approved within the direction; the user was informed. REQ-004, AC-001 and QR-003 were updated.
  - **AR-002 → DEC-010:** the pending notice is combined into the provider message of the next external input at dispatch (one turn). Delivery is confirmed only on `forwarded`; every other outcome returns it to pending. Admission state and backend contract are unchanged. REQ-005 and AC-002 updated; DS-003 and the bounded spine, port contract, file mapping and step-2 tests revised.
  - **AR-003 → DEC-011:** skills are keyed by name and re-resolved on change; a generation swap is "updated" with the new path. REQ-008, REQ-009 and AC-005 updated; DS-001/002 and an example added.
  - **R-2:** the notice trace carries the dispatch turn ID.
  - **R-3:** a dedicated ignore list (REQ-010 made explicit).
  - **R-1, R-4, R-5:** recorded in Risks.
- Intended behavior changed: Yes (REQ-004 corrected to runtime reality; REQ-005 mechanism-neutral outcome kept; REQ-009 refined). Approved by the Solution Designer within the direction; user informed 2026-10-13.
- Classification: Large / High (unchanged).
- Next: handoff rules → architecture re-review (ARCH-REV-002).

### SR-004 — Native history for combined dispatches (ARCH-REV-002 AR-004)

- Phase: Design (no requirement change).
- Trigger: ARCH-REV-002 AR-004. Evidence verified:
  - `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` ingests the processed (combined) content as the user trace;
  - `MemoryManager.ingestUserMessage` writes raw traces only; the working context is appended separately by `llm-request-assembler.ts:69` with a content-matched `rawTraceIds` lookup;
  - raw trace `traceType` is a string;
  - the server replay maps `system_task_notification`;
  - the server recorder records only external runtimes.
- Resolution:
  - `AgentRun` tags every combined dispatch with generic metadata `platform_input_preface {content, sender_id, original_content}`;
  - native memory ingest writes a separate `system_task_notification` trace and a user trace with the original content;
  - the working context keeps the combined content with explicit trace IDs;
  - a native history test was added;
  - the residual (uncertain-then-forwarded reconcile marks the notice delivered) is adopted.
- Approval impact: None (REQ-005/007 unchanged; the design now satisfies them for native).
- Classification: Large / High (unchanged).
- Next: handoff rules → ARCH-REV-003 (limited to AR-004).
