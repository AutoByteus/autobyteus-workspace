# Solution Revision Record — clean-runner-build-order

## Revision Index

| Revision ID | Phase | Trigger / Round | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (requirements, evidence, design) | The beta v1.5.11-beta.11 build-only run failed (run 41416112093); the user asked for a design rule (relayed by delivery) | N/A | N/A | Requirements Approved; design Ready | REQ-001…003, AC-001…005, DEC-1…3 | Small / Low; direct route |

## Revision Entries

### SR-001 — The web gate prepares what it reads; a design rule for release-runner build order

- Classification: Initial Baseline (requirements, evidence and design in one round; Small / Low).
- Trigger: delivery engineer's Blocked report and the user's request (see the requirements doc).
- Evidence: reproduced on a clean install (F-04), both halves of the fix shown (F-05, F-06).
- Intended behavior changed: `No` for the product; a project guide rule is added at the user's request.
- Approval: Solution Designer within the direction; the user is informed in the Solution Designer's conversation (2026-11-02).
- Decisions: DEC-1 (one prepare owner), DEC-2 (rule 12 plus pointers), DEC-3 (the CI guard is a follow-up, `FU-1`).
- Design/review impact: Small / Low; no independent review; implementation (direct route), API/E2E (executable validation of the clean-clone checks), delivery (build-only run on the branch, merge, then the release resumes).
- Documents written by the Solution Designer in this round: DESIGN.md rule 12, checklist item and anti-pattern; docs/design-cases.md Case 15; pointers in TESTING.md and RELEASE.md; RELEASE.md case study.
- Next action: implementation.
