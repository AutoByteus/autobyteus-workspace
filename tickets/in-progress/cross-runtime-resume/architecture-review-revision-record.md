# Architecture Review Revision Record — autobyteus-316

The latest `design-review-report.md` remains authoritative. This record holds the baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff "Architecture Design Complete" (Large / High) | SR-004 (notes 1–7) | N/A | Fail | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004, ARCH-F-005 |

## Revision Entries

### ARCH-REV-001 — Baseline: sound architecture, one success-path defect in the activation commit, incomplete trace of the first-message path

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff (`solution-designer-handoff.md`), requested by the user's design-principles re-audit (SR-004 note 7)
- Triggering role, report path, and finding IDs: Solution Designer (`/software_engineering_team/solution_designer`); handoff above; no prior findings
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact; one Requirement Gap needing the user's decision)
- What changed in the review result or what baseline was established: baseline established. Confirmed in code: the two existing activation cases and the retry predicate being prepared-run-only; the preface route and its one-notice-per-input rule; the one-runtime-per-run journal; the library store appending by path; run rows holding no runtime; the journals step re-ensuring only runs whose raw-trace fingerprint changed. Found: `recordRunStarted` cannot clear the pending field, so the success path of every switch would end in a quarantine (ARCH-F-001); the first-message spine omits the root hop, a second caller of the changed input, the second construction site of the lifecycle service and the root's launch base (ARCH-F-002); the open file's runtime is wrong while a switch is pending (ARCH-F-003); the permanent label mapping needs the user's explicit decision under DESIGN rule 10 (ARCH-F-004); small vocabulary and citation corrections (ARCH-F-005).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-F-001 (High, blocking), ARCH-F-002 (Medium, blocking), ARCH-F-003 (Low), ARCH-F-004 (Requirement Gap — User Approval Required), ARCH-F-005 (Low)
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: `MP-1` (can a root of a switched run still be registered when its host is offline) is `Unclear` and needs only a statement from the code; the in-memory hand-over notice is lost on a restart (accepted by the design).
