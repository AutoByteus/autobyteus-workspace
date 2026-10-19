# Solution Revision Record — output-tps-precision

## Revision Index

| Revision | Phase | Trigger | Findings | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task 6e115ebc + user card message 2026-10-14 | N/A | N/A | Approved | BEH-001–004, REQ-001–009, AC-001–010, DEC-001–006 | R1 approved within direction, user informed |
| SR-002 | Design | Architecture investigation after R1 | N/A | N/A (no design) | Design Ready | All REQ; DS-001–004 | design-spec.md; Large / High |
| SR-003 | Mixed | User direction 2026-10-14 (run-owned, not stored, "latest TPS") | N/A | R1 Approved; D1 Ready (sent for review, review put on hold) | R2 Approved (user); D2 Ready | BEH-004, REQ-005, AC-006, SCN-005, DEC-006; DS-002, DS-005 | D1 superseded before review; Large / High |
| SR-004 | Mixed | User 2026-10-14: TPS is real time, reload not needed | N/A | R2 Approved; D2 Ready (review put on hold) | R3 Approved (user); D3 Ready | BEH-004, REQ-005, AC-006, SCN-005, DEC-006; DS-002, DS-004 (DS-005 removed) | D2 superseded before review; Large / High |
| SR-005 | Design | User asked whether the further simplification belongs in this ticket; Solution Designer decided yes | N/A | R3 Approved; D3 Ready (sent for review) | R3 Approved (unchanged); D3.1 Ready | DS-003, DS-004 (no REQ/AC change) | Adapters report the method; central rule shrinks to an acceptance check; Large / High |
| SR-006 | Mixed (Design Impact + AC wording alignment) | Code review failure-origin CR-F01 / CRR-002; API/E2E API-REV-001 API-L04 | CR-F01 | R3 Approved; D3.1 passed ARCH-REV-002 and implemented | R3 Approved (intent unchanged; AC-004/DEC-002 Codex wording aligned); D3.2 Ready | REQ-003, SCN-002, AC-004, DEC-002; DS-003 Codex row | Codex call ends at rawResponse/completed; Large / High |

## Revision Entries

### SR-001 — Per-call TPS requirements baseline (R1)

- Phase and classification: Requirements, Initial Baseline. This is a follow-up to the delivered ticket `token-meter-tps` (its R1/SR-001–002 remain historical at `tickets/done/token-meter-tps/`).
- Trigger: Project Task `project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94` from `/project_task_manager`, plus the user's message in this conversation on 2026-10-14 asking to simplify the card ("just TPS"; no "Selected agent only", timestamp, "Estimated", "Last reported").
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements Approved
- Affected IDs: BEH-001–004; UC-001–004; REQ-001–009; AC-001–010; SCN-001–005; DEC-001–006
- Scenario-basis changes: SCN-001 now covers single-call turns as normal.
- Why recorded: first coherent baseline.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md`.
- Supplements: none (screenshots are evidence only).
- Product design evidence: N/A
- Intended behavior changed: Yes, relative to the delivered token-meter-tps behavior (report-interval method replaced; card simplified).
- Approval: R1 approved by Solution Designer within the direction (Task + the user's explicit card direction); no `Needs user` decisions. Reference: my conversation notice to the user on 2026-10-14: "I approved the requirements myself, since they stay within your direction and the Task's … **What TPS means:** output tokens of each model call ÷ that call's own measured time … **Method per runtime:** … **Card:** just "TPS", the value, the model, and a short "incl. time to first token" note only when relevant … **Small calls:** calls under 20 tokens or 0.25 s don't replace the shown value. **Persistence:** none."
- Behavior-defining supplement versions: none.
- Design/review basis invalidated: N/A (new package).
- Classification changes: N/A
- Handoff: none at this stage.
- Downstream impact: architecture design to follow.
- Remaining gaps: RSK-002 (Codex), RSK-005 (AGY thinking count). Both non-blocking.
- Next action: architecture design.

### SR-002 — Architecture design D1

- Phase and classification: Design, Refinement
- Trigger: completed architecture investigation after R1 approval.
- Findings: N/A
- Prior status: requirements Approved; design N/A
- Current status: requirements Approved (R1 unchanged); design Ready
- Affected IDs: all REQ/AC; DS-001–004
- Scenario changes: none
- Why recorded: design completed.
- Sections changed: `design-spec.md` created; `investigation-notes.md` architecture findings added.
- Supplements: none
- Intended behavior changed: No
- Approval impact: none; R1 remains the basis.
- Classification: task_size Large; architectural_risk High (ownership move of the metric to runtimes/server; additive field on two shared stream contracts).
- Handoff: see `solution-handoff.md`.
- Downstream impact: applicable review per handoff rules.
- Remaining gaps: RSK-002, RSK-005 (validation evidence).
- Next action: route per handoff rules.

### SR-003 — Run-owned, in-memory latest TPS (R2 / D2)

- Phase and classification: Mixed. User change to intended behavior (Requirement Gap resolved by user direction) plus design revision.
- Trigger: user messages in this conversation on 2026-10-14:
  - "agent-run itself is the agent … status and TPS token usage … all belong to … this agent-run";
  - extensibility concern ("maybe in the future you even have more like statistics about this agent run");
  - "it's better not to store it … because it's a runtime data";
  - "You can call it latest TPS";
  - "great the big direction is set now then you can continue".
- Findings: N/A
- Prior status: R1 Approved (Solution Designer within direction); D1 Ready, sent to `/software_engineering_team/architecture_reviewer` and then put on hold by my message (no review result requested for SR-002).
- Current status: R2 Approved (User); D2 Ready.
- Affected IDs: BEH-004, REQ-005, AC-006, SCN-005 (now Supported Normal Scenario), DEC-006, Out Of Scope (unified run-data model follow-up); design DS-002 changed, DS-005 added; Change Scope, Removal Plan, file mapping, sequence, risks.
- Scenario changes: SCN-005 covers reload/reconnect of an active run (value restored from the live run) and server restart/history ("—").
- Why recorded: the user set the ownership model (the agent run owns its latest TPS as runtime data) and decided no persistence.
- Sections changed:
  - `requirements-doc.md`: Document Status, BEH-004, Out Of Scope, REQ-005, AC-006, SCN-005, Data Continuity, DEC-006, Architecture Phase Input, Readiness.
  - `investigation-notes.md`: "SR-003 findings".
  - `design-spec.md`: rewritten as D2.
- Supplements: none.
- Intended behavior changed: Yes. Latest TPS is owned by the live server agent run, survives page reload/reconnect while the run is active, and is never stored.
- Approval: R2 approved by the User (quotes above). The unchanged R1 decisions stay approved by Solution Designer within the direction.
- Design/review basis: D1 (SR-002) superseded before any review result. The architecture review must cover D2.
- Classification: task_size Large; architectural_risk High (ownership move to runtimes/server/`AgentRun`; additive event field on two shared contracts; new run-scoped query).
- Handoff: `solution-handoff.md` (updated for SR-003) → `/software_engineering_team/architecture_reviewer`.
- Downstream impact: review D2; the follow-up (unified agent-run data model) is to be sent to the Project Task Manager at delivery receipt with the other follow-ups.
- Remaining gaps: RSK-002, RSK-005; verifying every member kind is reachable through `getActiveRun`.
- Next action: architecture review of D2.

### SR-004 — Real-time TPS event per model call (R3 / D3)

- Phase and classification: Mixed. A user change to intended behavior, plus a design revision.
- Trigger: user messages on 2026-10-14:
  - asked my judgement of D2's ownership; I found split authority (accounting computes, `AgentRun` copies, the web copies) and coupling to accounting;
  - asked whether it beats D1;
  - "I don't care about reload, for TPS … TPS is normally real time. Why do we care about reload then?"
- Findings: self-assessment of D2 (ownership split; TPS lost if accounting persistence fails; two delivery paths needing race handling).
- Prior status: R2 Approved (User); D2 Ready, sent to the architecture reviewer and then put on hold. No review result was requested.
- Current status: R3 Approved (User); D3 Ready.
- Affected IDs: BEH-004, REQ-005, AC-006, SCN-005, DEC-006, and Architecture Phase Input; in the design, DS-005 is removed, DS-002 and DS-004 are revised, and the whole design-spec is rewritten.
- Scenario changes: SCN-005. Idle keeps the last received TPS. Reload and history show "—" until the next model call.
- Why recorded:
  - The user removed reload support, so server-held state and the load query lose their only purpose.
  - TPS becomes a per-model-call fact of the run's event, decided by one run-side rule when the event is created, before and independent of accounting.
- Sections changed:
  - `requirements-doc.md`: Document Status, BEH-004, REQ-005, AC-006, SCN-005, Data Continuity, DEC-006, Architecture Phase Input, Readiness.
  - `design-spec.md`: D3.
  - `investigation-notes.md`: SR-004 note.
- Supplements: none.
- Intended behavior changed: Yes. There is no reload restoration, and TPS survives accounting persistence failures.
- Approval: R3 approved by the User (quote above). The ownership principle and no-persistence decisions from R2 still apply. The unchanged R1 decisions remain approved by Solution Designer within the direction.
- Design/review basis: D1 and D2 were superseded before any review result. The review must cover D3.
- Classification: task_size Large; architectural_risk High (metric authority moves to runtimes and the run event; additive field on two shared contracts). Smaller than D2: no server state, no new API, no accounting changes.
- Handoff: `solution-handoff.md` (SR-004) → `/software_engineering_team/architecture_reviewer`.
- Downstream impact: review D3. Follow-ups are unchanged (unified run-data model; AGY; Codex).
- Remaining gaps: RSK-002, RSK-005.
- Next action: architecture review of D3.

### SR-005 — D3.1: adapters decide the method; central acceptance check only

- Phase and classification: Design, Refinement. Intended behavior is unchanged.
- Trigger: the user asked whether the simplification I proposed should happen in this ticket or a future one (2026-10-14). I decided this ticket, because no code exists yet and deferring would mean reworking freshly written code in five adapters.
- Findings: N/A
- Prior status: R3 Approved; D3 Ready (sent to the architecture reviewer as SR-004).
- Current status: R3 Approved (unchanged); D3.1 Ready.
- Affected IDs: DS-003 and DS-004. The REQ, AC, BEH and DEC IDs are unchanged; DEC-002's per-runtime methods are still exactly what the adapters implement.
- Why recorded: removes the five-field measurement structure and the generic priority list. Each adapter reports `output_throughput` with the method it chose under the documented principle. The central code keeps only shape validation and the minimum sample (`acceptModelCallThroughput`, shared constants).
- Sections changed: `design-spec.md` (Intended Change, Ownership Map, Terminology, DS-003 table, DS-004, boundaries, dependencies, interfaces, tightness, file mapping, sequence).
- Supplements: none.
- Intended behavior changed: No.
- Approval impact: none; R3 remains the basis.
- Design/review basis: D3 is refined in place. The reviewer is told to review D3.1.
- Classification: Large / High (unchanged rationale).
- Handoff: message to `/software_engineering_team/architecture_reviewer`; `solution-handoff.md` updated.
- Remaining gaps: RSK-002, RSK-005.
- Next action: architecture review of D3.1.

## Review Record

- 2026-10-14: architecture review **Pass**, ARCH-REV-002, covering D3.1 / SR-005. Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`.
  - The reviewer forwarded the package to `/software_engineering_team/implementation_engineer`.
  - It is bound by IC-1: the AGY adapter rounds `duration_seconds × 1000` to integer ms.
  - Recommendations R-2 to R-4 go to implementation.
  - D3 / SR-004 also passed (ARCH-REV-001) but was not forwarded, because SR-005 superseded it.
  - Informational only: no design revision, and no duplicate forwarding by Solution Designer.

### SR-006 — Codex call end at `rawResponse/completed` (D3.2)

- Phase and classification: Design Impact, plus an acceptance-criterion wording alignment with no change of intent.
- Trigger: `/software_engineering_team/code_reviewer` failure-origin review CR-F01 (CRR-002) of API/E2E failure API-REV-001 / API-L04 (AC-004, REQ-002/003, SCN-002), received 2026-10-14. Report: `code-review-report.md`. Evidence: `evidence/api-e2e/live/codex{,-repeat}/codex-wire.jsonl`, `API-L04-codex-tool.json`.
- Finding IDs: CR-F01.
- Prior status: R3 Approved; D3.1 passed architecture review (ARCH-REV-002) and was implemented.
- Current status: R3 Approved (intent unchanged); D3.2 Ready.
- What failed:
  - For a Codex call that ends in a tool call, the usage update arrives after the tool. D3.1 ended the call at the usage update, so readings included about 2.9 s of tool time (22.0 / 25.0 tok/s versus real 59.5 / 75.8).
  - The premise was wrong in my design: DS-003's Codex row assumed the usage update marks the call end. I verified the live wire order myself (investigation notes, "SR-006 findings").
- Affected IDs: REQ-003 and SCN-002 (unchanged; this restores conformance), AC-004 and DEC-002 (Codex wording), DS-003 Codex row, and the new Codex pairing rule. The other runtimes are unaffected: their call ends precede tools.
- Approval impact: AC-004 and DEC-002 encoded the failed technical premise ("to its usage update"). REQ-003 (end-to-end = request → end of the call) and SCN-002 (tool time never included) already state the approved intent, so the correction aligns wording with approved behavior and does not change it. No renewed user approval is required, and the user is informed in conversation.
- Sections changed:
  - `requirements-doc.md`: Document Status, AC-004, External Contracts (Codex row), DEC-002 Codex text.
  - `investigation-notes.md`: "SR-006 findings".
  - `design-spec.md`: title/status, DS-003 Codex row, Codex pairing rule, file mapping, sequence, examples.
- Supplements: none.
- Intended behavior changed: No.
- Design/review basis: D3.1's review (ARCH-REV-002) covered the superseded Codex premise. D3.2 needs re-review of the changed Codex section per the handoff rules.
- Classification: Large / High (unchanged).
- Handoff: `solution-handoff.md` (SR-006) → per `get_handoff_rules`.
- Downstream impact (from the code reviewer): reimplementation of the Codex timing → source review → API/E2E rerun of API-L04 (Org desktop selection and DeepSeek native are already planned). Everything else from CRR-001 stands. C-004 (stale `autobyteus-web/README.md` lines 64–68) remains a delivery docs item.
- Remaining gaps: RSK-002 (generation upgrade still not evidenced), RSK-005; approval-wait behaviour not yet sampled live.
- Next action: re-review of D3.2, then reimplementation.
- 2026-10-14: architecture re-review **Pass**, ARCH-REV-003, covering D3.2 / SR-006 (`design-review-report.md` "Round 3 Summary").
  - The reviewer independently confirmed the Codex wire order and that the AC-004/DEC-002 alignment changes no intent.
  - It forwarded the package to `/software_engineering_team/implementation_engineer` (Codex reimplementation → source review → API-L04 rerun).
  - Binding constraint IC-2: retire implementation choice C-001. Freezing the boundary on a tool's `item/started` would put tool time into the next call (traced 31 vs 72.7 tok/s). The DS-003 Codex row already lists only reasoning/agentMessage outputs. Optional restatement R-5 is not taken.
  - Informational only: no design revision and no duplicate forwarding.
