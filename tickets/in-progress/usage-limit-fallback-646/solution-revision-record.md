# Solution Revision Record — autobyteus-646

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial investigation and options report | N/A | N/A | Ready for Approval | BEH-001..004, REQ-001..008, DEC-001..007 | Sent to the founder for DEC-002..006 |

| SR-002 | Mixed | Founder direction 2026-11-25: run events (telemetry) + the Model Router chooses and learns | N/A | Ready for Approval | Ready for Approval (contract review) | DEC-001, DEC-004, REQ-004, REQ-005, REQ-009, REQ-010 | Data contract and policy drafted for the founder |
| SR-003 | Mixed | Founder's contract review (2026-11-27) and design completion | N/A | Ready for Approval | Approved; design Ready | C-1/C-2 trimmed, C-7, C-8, hub rules; DEC-002/003/005/006 accepted | Large / High; to architecture review |
| SR-004 | Design | ARCH-REV-001 Fail | AR-001..AR-005, residuals | design Ready (SR-003) | design Ready (SR-004) | REQ-005, REQ-008, REQ-009, AC-003, BEH-002 | Revisions R-1..R-6; to ARCH-REV-002 |
| SR-005 | Design | Implementation question IQ-001 (two rows vs REQ-006) | IQ-001 | design Ready (SR-004) | design Ready (SR-005) | REQ-006, C-5 | `PendingRuntimeSwitch.cause` (structured); one row |
| SR-006 | Design | Implementation question IQ-002 (history layer's origin) | IQ-002 | design Ready (SR-005) | design Ready (SR-006) | REQ-003, C-2, R-7 | New origin `agent_history` everywhere |
| SR-007 | Requirements + Design | Implementation question IQ-003 (no hidden input path) | IQ-003 | Approved SR-004; design SR-006 | Approved SR-007; design SR-007 | REQ-006, R-7, R-9 | Continue message = labelled system notice row; FU-646-02 |
## Revision Entries

### SR-001 — Investigation and options

- Phase and classification: Requirements, Initial Baseline
- Trigger: autobyteus-646 from `/project_task_manager`
- Finding: the delegation picked exhausted Codex because the existing "blocked" launch check runs only while Model Routing is on, and it was never on on this Mac (investigation-notes §1). Live usage limits, the runtime switch and the hand-over already exist; what's missing is classifying the failure, remembering it, choosing a fallback and switching automatically
- Needs user: DEC-002..DEC-006
- Next: the founder's decisions, then the design with the data contract shown to him first

### SR-002 — Run events and the Model Router

- Trigger: the founder, 2026-11-25. A usage limit should be published as agent telemetry; the Model Router agent is notified, finds the next usable runtime, the system reconfigures the run and sends it "continue". The router learns over time
- Changes:
  - DEC-001 and DEC-004 decided: router first, history as the safety net;
  - REQ-004 rewritten; REQ-005: a continue message, no re-sent input;
  - new REQ-009 (run events, listeners) and REQ-010 (learning);
  - DEC-002/003/005/006 carry recommendations to confirm with the contract.
- design-spec.md: data contract and policy (C-1..C-6, Policy 1–7) for the founder's review, as the Task requires before implementation
- Next: the founder's answer; then the rest of the design and the architecture review

### SR-003 — Contract reviewed, design complete

- Trigger: the founder's review, 2026-11-26/27.
  - He accepted the recommendations ("Of course …").
  - He asked why `rootRunId` and `agentRunId` are both in the event (the fields were removed: no reader).
  - He asked what `blockedModels` does (explained; kept: it is read by the exhaustion view).
  - He asked what the existing event types are (two systems exist, per-run streams and platform notices; the hub is the new node-level layer).
  - He asked how the hub is represented (in-process `RunEventHub` + log, wired at startup).
  - He set the cost budget out of scope (FU-646-01).
- Changes: C-1 trimmed to `at, kind, agentRunId, data`; C-2 without `eventId`/`rootRunId`; hub rules C-1b; new C-7 (router switch request + tool + template text), C-8 (launch history); spines, owners and files; lesson L5 recorded
- Pending the founder: the exact router template text (C-7, lesson L1). It is shown to him in the same message; it does not block the architecture review
- Classification: Large / High
- Next: architecture review

### SR-004 — Architecture review round 1

- Trigger: ARCH-REV-001 (Fail).
- **AR-001:** the switch of a live run is specified per root kind (R-1). Only two kinds exist, because Org units are own runs (CM-3). The Team member path is built from existing primitives: quiet stop of the handle, a new `TeamMemberRuntimeSwitchCommitter` on `commitExecutionTreeMutation`, `replaceSelection`, `post_message`, and the existing member switch at activation. Restart consistency and failures are stated.
- **AR-002:** the order is preserved. Exhaustion is checked on every layer, and the history layer is used only after an exhausted skip (R-2). No Requirement Gap, because it stays within REQ-003.
- **AR-003:** one publish per `(agentRunId, turn_id)` and one switch in flight per run (R-3).
- **AR-004:** attach on `runPublished`; all work runs detached (R-4).
- **AR-005:** AC-003 fixed (continue notice; no re-send); basis line updated.
- **Residuals:** exhaustion rebuild window (R-5), router template gate (R-6), debug log of unrelated reads (R-4).
- Intended behavior changed: No.
- Next: ARCH-REV-002.

### SR-005 — One notice row (implementation question)

- Trigger: the implementation engineer.
  - Every switch already shows the hand-over marker row, and the C-5 row would be a second one.
  - `PendingRuntimeSwitch` is `{switchId, from}`.
- Decision, within REQ-006:
  - an optional structured `cause {kind, resetAt, chosenBy, reason}` on the pending switch, rendered in the marker;
  - the continue input publishes no row of its own.
  - Not the stored sentence the implementer's option (a) proposed: structured facts, per the project's rule.
- Contract change: one optional field on an existing stored record. Existing data is directly usable. It is small and follows the founder-reviewed policy (one row), so the founder is informed with the next result rather than asked.
- Intended behavior: unchanged (REQ-006 holds). No re-review is needed for this local contract addition; the code review checks it.

### SR-006 — The history layer's launch origin (implementation question)

- Trigger: the implementation engineer. The history layer had no recorded launch source; the origin is persisted vocabulary.
- Decision: a new origin `agent_history` in every place the vocabulary lives. C-2 `chosenBy` and R-7 `cause.chosenBy` use the same value (was `history`): one word, one meaning. No compatibility with older servers (DESIGN rule 9).
- Intended behavior: unchanged.

### SR-007 — The continue message is shown as a system notice

- Trigger: the implementation engineer's built-server E2E. Every posted input is shown and recorded, so R-7's "no row of its own" can't hold without a hidden-input mechanism.
- Decision, by the Solution Designer within the founder's direction ("show a clear platform notice row explaining the switch"):
  - the continue message is a labelled platform notice row (the restart notice's pattern);
  - REQ-006 now reads "one row explaining the switch, plus the continue instruction as a labelled system notice; nothing hidden";
  - a hidden input was rejected for transparency and cost.
- Founder informed in this conversation. Pre-existing native extra row: FU-646-02.
- Intended behavior changed: yes, slightly (two labelled rows instead of one). Approval: Solution Designer within the direction; the founder is told.
