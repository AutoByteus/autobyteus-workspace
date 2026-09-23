# Solution Revision Record — Anthropic API key save failure

## Revision Index
| Revision ID | Phase | Trigger | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements/Evidence | User investigation request and screenshot, 2026-09-23 | N/A | Draft; investigation findings recorded, exact failure origin open | BEH-001, BEH-002, SCN-001, REQ-001, REQ-002, AC-001, AC-002 | Not implementation-ready; request redacted failing response and refreshed status. |
| SR-002 | Evidence/Requirements | User requested actual frontend save reproduction | Draft | Ready for Approval; exact matching failure reproduced | BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004 | GraphQL commits; frontend store read-only mutation throws; proposed repair awaits approval. |
| SR-003 | Requirements | User message “approve” following repair proposal, 2026-09-23 | Ready for Approval | Approved | BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004 | Exact SR-002 repair intent approved; architecture design can begin. |
| SR-004 | Design | Approved-scope architecture investigation/design | Approved requirements; no design | Approved requirements; design Ready | BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004 | Small/Low local frontend store correction; no migration. |

## SR-001 — Initial diagnostic baseline
- Classification: Initial Baseline / Unclear root cause.
- Trigger: User reports generic Anthropic Save Key error and requests investigation.
- Prior authoritative requirements/design status: N/A / N/A.
- Current authoritative requirements/design status: Draft / N/A.
- Scenario validity: Settings save is a Supported Normal Scenario; synthetic mutation only tests the technical path and does not prove the user's failure origin.
- Why recorded: Code, current read-only server status, logs, and safe isolated mutation narrow the issue but do not establish the failing response.
- Canonical sections changed: initial requirements and investigation notes.
- Supplemental/Product artifacts: N/A.
- Intended behavior changed: No; repair behavior remains provisional and unapproved.
- Approval impact: No user approval; architecture and implementation cannot proceed.
- Design/review/routing impact: N/A until exact failure and approved repair scope exist.
- Remaining gaps: DEC-001, DEC-002 / UNK-001–003.
- Applied handoff-rule outcome: No matching rule for Draft/Blocked diagnosis; result returned to user. See `handoff-result.md`.
- Next action: Ask user whether refresh shows Configured and for the redacted Console/Network `SaveProviderApiKey` error if failure persists. Do not request the API key.


## SR-002 — Frontend reproduction and repair-intent refinement
- Phase and classification: Evidence/Requirements refinement; exact matching root cause established.
- Trigger: User explicitly directed a frontend + backend dummy-key reproduction.
- Prior authoritative requirements/design status: Draft / N/A.
- Current authoritative requirements/design status: Ready for Approval / N/A.
- Affected IDs: BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004, DEC-001.
- Scenario basis: SCN-001 remains a Supported Normal Scenario; now has actual browser/isolated-server evidence.
- Evidence: UI showed failure after backend HTTP 200/configured=true; Console threw from `applyCredentialSetting`; refresh showed Configured. See ticket `evidence/ui-probe-summary.json` and screenshots.
- Canonical sections changed: problem, current/desired behavior, scope, proposed requirements/ACs, decisions, readiness; investigation notes extended.
- Supplemental artifacts: Browser probe summary and screenshots are supporting diagnostic evidence, not behavior-defining Product Design artifacts. Product package N/A.
- Intended behavior changed: Proposed repair intent clarified; not yet approved. No existing approval invalidated.
- Approval impact: Explicit user approval required before architecture design and implementation.
- Design/review/routing impact: N/A before approval. No implementation handoff.
- Remaining gap: DEC-001 approval decision. The user's specific key timing/identity is unknowable from value-free status but does not block fixing this reproduced defect.
- Applied handoff-rule outcome: No matching rule for requirements approval hold; result returned to user. See `handoff-result.md`.
- Next action: Present proposed repair outcome and ask for approval.


## SR-003 — Explicit requirements approval
- Phase and classification: Requirements approval capture, no new intended behavior.
- Trigger: User message “approve” on 2026-09-23 directly responding to the proposed repair behavior in the preceding Solution Designer message.
- Prior authoritative requirements/design status: Ready for Approval / N/A.
- Current authoritative requirements/design status: Approved / N/A pending design.
- Affected IDs: BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004, DEC-001.
- Scenario basis: SCN-001 remains Supported Normal Scenario; no validity change.
- Canonical sections changed: requirements approval state/reference, approved wording and traceability; investigation evidence unchanged at approval capture.
- Intended behavior changed: No; user approved the SR-002 proposed repair outcome.
- Approval basis: User message “approve” following the exact proposal “a successful save immediately shows Configured, displays success, and clears the input, while genuine save failures still show an error,” together with the preserved write-only/value-free scope and shared-store regression boundary in `requirements-doc.md`.
- Behavior-defining supplements: N/A.
- Design/review/routing impact: Architecture phase may begin; no direct implementation before completed design/classification.
- Remaining gaps: None material to approved behavior. DEC-002 is historical key-identity uncertainty, not a repair blocker.
- Next action: Complete architecture investigation/design, classify task size/risk, then route by current handoff rules.

## SR-004 — Completed local frontend architecture design
- Phase and classification: Design / completed approved-scope solution.
- Trigger: SR-003 explicit approval and architecture-level source/test investigation.
- Prior authoritative requirements/design status: Approved / N/A.
- Current authoritative requirements/design status: Approved / Ready.
- Affected IDs: BEH-001, BEH-002, SCN-001, REQ-001–004, AC-001–004; intended behavior unchanged.
- Canonical sections changed: extended `investigation-notes.md` architecture evidence; created `design-spec.md` with target owner, return path, collection invariant, removal plan, data transition and tests. Requirements approval basis unchanged.
- Supplemental artifacts: Existing diagnostic browser probe summary/screenshots/logs remain relevant evidence; no Product UI/UX or behavior-defining supplement.
- Root cause/design response: Pinia credential state aliases an Apollo read-only array; store later mutates it after backend save. Establish store-owned array at read boundary and replace-list upsert in shared store owner. No backend/API change.
- Approval impact: None; design realizes approved SR-002 intent under user message “approve” (2026-09-23).
- Persisted-data decision: Not Affected by frontend-only design; no migration or data rewrite.
- Post-design classification: `task_size=Small`, `architectural_risk=Low`. One existing frontend store plus focused regression/browser validation; no material API, persistence, security, concurrency, deployment or ownership-boundary impact.
- Review/routing impact: Current configured handoff rules determine direct implementation or review. Do not infer a recipient before rule lookup.
- Remaining gaps: None material. User-specific real-key identity remains unknowable from value-free status but is not needed for repair.
- Next action: Persist cumulative handoff result and apply current rules.
