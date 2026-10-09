# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Project Task `project_task_ad5f497a-6825-41f1-ab99-5c67b4a619f0` | N/A | N/A | Ready for Approval → Approved (2026-10-08) | BEH-001..006, REQ-001..006, AC-001..008 | Approved with DEC-001 A, DEC-002 A |
| SR-002 | Design | Architecture design after approval | N/A | Requirements Approved; no design | Design Ready | BEH-001..006 (no requirement change) | design-spec.md; Small / Low |
| SR-003 | Mixed | Code review failure-origin CRR-001 (API-REV-001, E2E-CF-002) | CAND-001, CAND-005 | Requirements Approved; Design Ready | Requirements Approved (SR-003, DEC-003 A); Design Ready (revised) | REQ-004 (revised), REQ-007 (new), AC-003 (revised), AC-006 (extended), AC-009..011 (new), BEH-007, UC-005, SCN-007 | Medium / High → architecture review |
| SR-004 | Requirements | Architecture review ARCH-REV-001 Fail (Requirement Gap) | AR-001, AR-002, N-1, N-2 | Requirements Approved (SR-003); Design Ready | Requirements Approved (SR-004, DEC-006); Design Ready (SR-004 revision) | REQ-004 (replaced), REQ-007 + AC-009..011 (withdrawn), AC-003 (replaced), BEH-007, UC-005, SCN-001, SCN-007 | Small / Low → direct implementation |

## Revision Entries

### SR-001 — AGY drops all context files; deliver images via path + `view_file`

- Phase and classification: Requirements — Initial Baseline
- Triggering evidence: user report + screenshot; code (`agy-agent-run-backend.ts:76` sends text only); AGY headless docs (text-only input); live probes A–C (`probe-evidence/`).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001..006, UC-001..004, REQ-001..006, AC-001..008, SCN-001..006, DEC-001, DEC-002
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline for user approval.
- Canonical sections changed: all (new).
- Supplemental artifacts: `probe-evidence/` added (evidence only).
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: Pending explicit user approval of SR-001 and DEC-001/DEC-002.
- Behavior-defining supplements: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A — approval hold in requirements conversation.
- Downstream impact: N/A
- Remaining gaps: DEC-001, DEC-002.
- Next action: Obtain user approval, then architecture design.

Approval note for SR-001 (appended factually): the user approved SR-001 on 2026-10-08 ("Okay, go ahead, approved."), accepting DEC-001 = A and DEC-002 = A.

### SR-002 — Architecture design: AGY input text builder

- Phase and classification: Design — Refinement (initial design)
- Triggering evidence: User approval of SR-001; architecture investigation; probe D (`probe-evidence/probeD-*.out`).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Requirements Approved (SR-001); design N/A
- Current authoritative requirements/design status: Requirements Approved (SR-001, unchanged); `design-spec.md` Ready
- IDs affected: BEH-001..006, REQ-001..006, AC-001..008 (mapped, unchanged)
- Scenario-basis changes: None
- Why recorded: Design completed.
- Canonical sections changed: requirements-doc.md approval fields/decisions; investigation-notes.md probe D + architecture findings; design-spec.md created.
- Supplemental artifacts: probe D outputs added to `probe-evidence/`.
- Product design evidence: N/A
- Intended behavior changed: No
- Approval impact: None (design realizes approved SR-001)
- Behavior-defining supplements: None
- Affected design/review basis: N/A (first design)
- Post-design task-size/risk classification: `task_size=Small`, `architectural_risk=Low` (one new pure builder file in AGY backend + one call-site change; text-only wire contract unchanged; no persistence/security/concurrency change)
- Applied handoff-rule outcome: see `solution-handoff.md`
- Downstream and architecture-review impact: per handoff rules
- Remaining gaps: Claude-in-AGY not live-probed (quota); user verification in desktop app pending downstream.
- Next action: Hand off per rules.

### SR-003 — Requirement Gap: shared admission rejects attach-only sends

- Phase and classification: Mixed — Requirement Gap (+ contributing design-premise miss)
- Triggering evidence: `code-review-report.md` (CRR-001), API/E2E API-REV-001 E2E-CF-002, `api-e2e-evidence/e2e-cf-transport.log:288,378`; verified `agent-run-input-admission-state.ts:87-93,114-120`; attach-only Send introduced in `797d49d6a` (2026-09-28); content check since `1e7837929` (2026-08-13).
- Triggering finding IDs: CAND-001 (requirement gap), CAND-005 (DS-001 omitted the AgentRun admission step; AC-003 verified only at unit level)
- Prior status: Requirements Approved (SR-001); Design Ready (SR-002)
- Current status: Requirements `Ready for Approval` for the REQ-004 delta only; design `Needs Revision` for REQ-004/AC-003; IR-001 builder remains valid
- IDs affected: REQ-004, AC-003, SCN-001, BEH-001, BEH-002; scope guardrail (other runtimes' admission) if DEC-003 = a
- Intended behavior changed: Proposed (scope widening under option a)
- Approval impact: Renewed explicit user approval required for DEC-003 before design/implementation of REQ-004 proceeds
- Downstream impact: Reclassification required after design revision (option a touches a shared contract for all runtimes)
- Remaining gaps: DEC-003
- Next action: Ask user to choose DEC-003

Resolution note for SR-003 (appended factually): the user approved option (a) within this ticket on 2026-10-08 ("agree. go ahead"). Requirements set to `Approved` on the SR-003 basis; design revised ("SR-003 Revision" section of `design-spec.md`); design status `Ready`. Post-design classification changed from `Small`/`Low` to `Medium`/`High` because the runtime-independent AgentRun input admission contract (all runtimes) is now modified. IR-001 (AGY builder, commit `8139c6b12`) remains valid. Applied handoff-rule outcome: `solution-handoff.md` (SR-003 section) → architecture review.

### SR-004 — Requirement Gap: web-link-only attach-only on Claude/native; native history text

- Phase and classification: Requirements — Requirement Gap
- Triggering evidence: `design-review-report.md` / `architecture-review-revision-record.md` (ARCH-REV-001); verified `claude-session.ts:211-213`, `autobyteus-ts/src/llm/user-message.ts:43-44`, `autobyteus-ts/src/memory/raw-trace-ingestion.ts:142-158`.
- Triggering finding IDs: AR-001 (Medium), AR-002 (Low); N-1, N-2 (non-blocking design notes)
- Prior status: Requirements Approved (SR-003); Design Ready
- Current status: Requirements Ready for Approval (proposed delta only); Design Needs Revision for AR-001/AR-002 text and N-1/N-2
- IDs affected: REQ-004, REQ-007, AC-010, AC-011, out-of-scope list
- Intended behavior changed: Proposed (narrows REQ-004's "every runtime" claim for a web-link-only edge; clarifies AC-011 for native)
- Approval impact: Renewed user approval required (DEC-004, DEC-005)
- Next action: Ask user

Resolution note for SR-004 (appended factually): instead of DEC-004/DEC-005, the user decided on 2026-10-09 ("just do not allow user to send when there is only context file, but no text … then the behavior is consistent") — DEC-006, replacing DEC-003 A. Requirements `Approved` on SR-004: REQ-004 replaced (text or skill tag required to send; attachment-only drafts cannot be sent in any composer; server admission unchanged); REQ-007, AC-009, AC-010, AC-011 withdrawn; AC-003 replaced with composer Send-availability checks. Design: "SR-004 Revision" in `design-spec.md` (frontend `hasSendableDraft` rule; SR-003 revision superseded). ARCH-REV-001 findings AR-001/AR-002/N-1 are moot under SR-004; N-2 addressed by superseding the SR-003 section. Classification back to `Small`/`Low` (no shared server contract change). Applied handoff rule: direct implementation (`solution-handoff.md`, SR-004 Update).
