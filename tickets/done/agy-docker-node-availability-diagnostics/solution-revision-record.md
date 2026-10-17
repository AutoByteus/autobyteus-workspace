# Solution Revision Record — agy-docker-node-availability-diagnostics

## Revision Index

| Revision ID | Phase | Trigger / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after live investigation and user scope message | N/A | N/A | Approved (within direction) | BEH-001..006, REQ-001..007, AC-001..008, DEC-001..007 | Baseline with a proposed GraphQL cause field and per-cause labels |
| SR-002 | Requirements | Own pre-design architecture check: no client/server version handling | Version-skew finding | Approved (SR-001) | Approved (within direction) | REQ-002, REQ-003, AC-001..003, DEC-002, DEC-005, DEC-007, QR-004, new BEH-007 | Contract kept; neutral label + visible server reason; clearer AGY texts |
| SR-003 | Design | Architecture design completed | N/A | No design | Design Ready; Small / Low | All | Implementation-ready package |
| SR-004 | Evidence | API/E2E LIVE-006 blocked by provider quota | API-REV-001 LIVE-006 | Design Ready | Pending user decision (a/b) | AC-006 | No requirement change; user asked |
| SR-005 | Requirements | User-approved shorter sign-in wording (IR-002) | N/A | Approved (SR-002) | Approved (SR-005) | REQ-001, AC-001, AC-007, DEC-005, SCN-001 (text only) | Text "Not signed in on this node. Run `agy` to sign in." |

## Revision Entries

### SR-001 — Requirements baseline

- Phase and classification: Requirements, Initial Baseline
- Trigger:
  - Project Task (URGENT) with screenshots;
  - live investigation of Docker nodes 8001/8003;
  - user messages 2026-10-12: image-age question; Codex question; "It is installed. It's just not logged in."; "fix the agy bug now. codex is not a bug…".
- Finding IDs: N/A
- Prior status: N/A. Current status: Approved within direction.
- Affected IDs: BEH-001..006, REQ-001..007, AC-001..008, SCN-001..006, DEC-001..007
- Scenario basis: SCN-001..006 Supported Normal. Codex plan display excluded (DEC-006, user).
- Why recorded: first coherent baseline.
- Canonical sections: whole `requirements-doc.md`; `investigation-notes.md` created.
- Supplements: none
- Product design: N/A
- Intended behavior changed: N/A (baseline)
- Approval: Solution Designer within the direction, user informed. Reference: the user's scope message in this conversation, plus my message to the user describing the fix and that I am approving within the direction.
- Design/review basis: N/A
- Classification: N/A
- Handoff: none
- Remaining gaps: none

### SR-002 — Keep the API contract; visible server reason

- Phase and classification: Requirements, Refinement (decision owner: Solution Designer; within direction)
- Trigger: my own architecture-level check before design. `autobyteus-web` has no node/server version handling, and the availability query fails as a whole if it names a field the node doesn't know. That would mark every runtime unavailable on an older remote node.
- Finding IDs: investigation "Architecture Investigation Findings" — version skew
- Prior status: Approved (SR-001). Current status: Approved (SR-002).
- Affected IDs: REQ-002 (cause enum → clearer AGY texts), REQ-003 (per-cause labels → neutral "Unavailable" + visible reason), AC-001..003, QR-004, DEC-002 (reversed), DEC-005 (texts), DEC-007 (label), BEH-007 added, SCN-X1 recorded
- Scenario basis: SCN-X1 (newer app with an older node) recorded as the driver
- Why: avoid a regression the SR-001 design would introduce; smaller change (DESIGN.md rules 1 and 5)
- Canonical sections: requirements Status, Problem/Desired, Behavior table, Out of Scope, REQ/AC, UI, QR, Decisions, Traceability; investigation codebase table, structural inventory, architecture findings
- Intended behavior changed: Yes, narrowed. The user still sees the actual reason and a recovery step, but the short label is "Unavailable" instead of "Sign in required", and the reason line carries the cause.
- Approval: Solution Designer within the direction. The user is informed of the final behavior in the result summary. No `Needs user` decision.
- Design/review basis: no design yet
- Remaining gaps: none

### SR-003 — Architecture design complete

- Phase and classification: Design, Initial design
- Trigger: approved basis SR-002
- Prior status: none. Current status: `design-spec.md` Ready.
- Affected IDs: all REQ/AC mapped to DS-001..004
- Canonical sections: `design-spec.md` (new); investigation notes extended (version skew, store re-check semantics, existing tests)
- Intended behavior changed: No
- Approval: unchanged (SR-002)
- Classification: `task_size = Small`, `architectural_risk = Low`. About 4 source files, 2 locale entries, 2 docs and focused tests, all within existing owners. No API, persistence, security-boundary, concurrency or deployment change.
- Handoff: see `solution-handoff.md` (route recorded there after `get_handoff_rules`)
- Downstream impact: implementation, executable validation, delivery/release, user verification on 8003
- Remaining gaps: none
- Next action: route per handoff rules

### SR-004 — AC-006 completion leg blocked by provider quota (pending user decision)

- Phase and classification: Evidence. External blocker, not a requirement gap or design impact.
- Trigger: `/software_engineering_team/implementation_engineer` relayed the API/E2E Blocked result for IR-001 (commit `87b246c7d`). The API/E2E run is `api_e2e_engineer_c0064e01e50848a8b4e44835cadf46df`; its report is `api-e2e-execution-coverage-report.md` (API-REV-001).
- Findings:
  - LIVE-006 is Blocked. The run was created, the real `agy` 1.3.3 launched and authenticated, then the provider returned 429 "Individual quota reached… Resets in 10h4m55s" for all 5 models tried. Verified in the screenshot `api-e2e-evidence/live/run-2/LIVE-006-gemini-3.8-flash-low.png`.
  - All other ACs (AC-001..005, AC-007, AC-008) pass, both live and in the repo tests.
- Requirements/design status: unchanged (SR-002 / SR-003). Intended behavior changed: No.
- Decision needed from the user (it affects the acceptance basis and the release):
  - (a) wait for the Gemini quota reset (~2026-10-13 04:50 local), or provide an account with quota, then re-run LIVE-006 only;
  - (b) accept AC-006's "streams and completes" leg as residual risk for release, confirmed during the user's own verification on node 8003.
  
  My recommendation is (b): this change doesn't touch the run path, the run reached the provider and authenticated, and the user's verification on 8003 is already part of Done.
- Next action: record the user's answer, then send it to `/software_engineering_team/api_e2e_engineer` (run `api_e2e_engineer_c0064e01e50848a8b4e44835cadf46df`).

### SR-005 — Shorter sign-in reason (user-approved)

- Phase and classification: Requirements, Refinement (wording only)
- Trigger: the user, directly, while testing the menu (relayed by `/software_engineering_team/implementation_engineer`; recorded in `implementation-revision-record.md` IR-002, commit `56b11aeae`). User's words: the reason "looks too long … make the message cleaner". They chose option B, "Not signed in on this node. Run `agy` to sign in.", over two alternatives.
- Prior status: Approved (SR-002). Current status: Approved (SR-005).
- Affected IDs: REQ-001, AC-001, AC-007 and SCN-001 (quoted text), DEC-005 (sign-in wording); REQ-006/AC-008 docs quote the text.
- Canonical sections changed:
  - `requirements-doc.md`: Document Status (baseline and approval reference), Desired outcome, REQ-001, SCN-001, DEC-005.
  - `design-spec.md`: Concrete Examples "Row".
- Intended behavior changed: Yes, displayed text only. Classification, the other texts (not found, too old), the UI and the contract are unchanged.
- Approval: the user, directly (words above).
- Design/review impact: design unchanged apart from the quoted example. The API/E2E engineer has been asked to re-confirm the new text.
- Classification: unchanged (Small / Low).
- Remaining gaps: the SR-004 decision (AC-006 quota) is still open with the user.
