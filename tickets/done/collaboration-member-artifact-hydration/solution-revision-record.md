# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-003 | Mixed | User: principles recheck ("follow the design principles for refactoring assessment"); "works on your ticket" | RF-1, RF-2, DF-1..DF-7 | Requirements Approved (incl. unapproved REQ-005/006); Design Ready (SR-002) | Requirements Approved (REQ-001..004 only); Design Ready (SR-003) | REQ-005 (withdrawn), REQ-006 (pending), AC-007, AC-008; DS-001..005 | Shared member-run state owner; Medium / High |
| SR-002 | Design | DI-001 (implementation_engineer) | DI-001 | Design Ready (SR-001) | Design Ready (SR-002); requirements unchanged | BEH-001/002; REQ-001, REQ-004 | Team open staging path added (DS-005) |
| SR-001 | Mixed | Follow-up from `run-file-change-live-projection-ownership` SR-002 + user bootstrap request (2026-10-06) | Predecessor API-REV-001 B-003/B-004 | N/A | Requirements Approved; Design Ready | BEH-001..006; REQ-001..006 | Architecture Design Complete (Medium / Low) |

## Revision Entries

### SR-001 — Collaboration-member Artifacts hydration (Team, Org, standalone collaborators)

- Phase and classification: `Initial Baseline` (requirements + design).
- Trigger: predecessor SR-002 split decision; user: "lets bootstrap the team-member Artifacts ticket … does agent org has the same issue? if it has the same issue lets fix it here as well".
- Prior status: N/A.
- Current status: requirements `Approved`; design `Ready`.
- IDs: BEH-001..006, REQ-001..006, AC-001..008, SCN-001..006.
- Intended behavior changed: new behavior (consistency with standalone), approved.
- Approval: predecessor exchange ("i guess stay consistant?" → "agreed…") plus the bootstrap message above. The Agent Org gap was confirmed, bringing Orgs into scope. REQ-006 (standalone collaborators) was found by investigation and included under the same instruction; it is flagged to the user for veto.
- Design: shared fetch helper; merge at the members' existing commit points; `commitActivities` → `commit`. Root cause: `Duplicated Policy Or Coordination`, small refactor now.
- Classification: `task_size=Medium`, `architectural_risk=Low`.
- Handoff: see solution-handoff.md.
- Remaining gaps: AC-008 server resolution of collaborator runIds is code-evident only; pre-existing failing server integration test (predecessor note); predecessor RSK-001 wording.
- Next action: route per handoff rules.

### SR-002 — DI-001: Team open staging path

- Phase and classification: `Design Impact`
- Trigger: implementation_engineer DI-001, before any source change. Team open/reload/historical paths (`teamRunOpenCoordinator.ts:50,112`; `agentTeamRunStore.ts:379`) stage all members via `teamRunContextHydrationService` and mark them authoritative (`teamRunHydrationCommit.ts:16-21`). So the SR-001 lazy-only Team design would not satisfy AC-001/AC-002.
- Verified by Solution Designer on `db39803d4` (code read of `teamRunContextHydrationService.ts:240-300`, `teamRunHydrationCommit.ts`, call-site grep).
- Prior status: design `Ready` (SR-001). Current status: design `Ready` (SR-002). Requirements are `Approved` and unchanged, so no renewed approval is needed.
- Changes:
  - design-spec Current-State Read, Intended Change 1 and 3a, behavior map, DS-005, final file mapping, removal plan, change sequence and size rationale.
  - The standalone missing payload stays `[]` (REQ-004 preservation, per the implementation engineer's note).
  - The `commitActivities` rename includes 6 spec files.
- Classification: `task_size=Medium` (about 13 files), `architectural_risk=Low`, unchanged. The work stays within existing hydration owners and commit points, with the same merge semantics.
- Investigation gap acknowledged: the SR-001 notes missed the Team open staging owner; an addendum was added.
- Handoff: solution-handoff.md §SR-002 Routing → `/implementation_engineer`.

### SR-003 — Principles/standards recheck: shared member-run state owner; approved basis corrected

- Phase and classification: `Mixed` (requirements correction + `Design Impact`)
- Trigger: the user found that `design-principles.md` and `requirements-engineering.md` had not been read. They asked for the refactoring assessment to follow the principles, paused implementation, then instructed "works on your ticket" while two decisions were pending.
- Findings: design-principles-recheck.md (RF-1..4, DF-1..7).
- Requirements:
  - REQ-006 / UC-004 / SCN-006 / AC-008 had been marked approved "subject to veto". They were moved to §Unapproved Items (pending explicit decision) and are out of scope.
  - REQ-005 was withdrawn: it was never approved and diverged from existing policy.
  - AC-007 is restated as preserved behavior (artifacts follow the member projection's failure policy).
  - No new intended behavior was added, so no new approval is required for the remaining basis (REQ-001..004).
- Design:
  - Root cause: `Duplicated Policy Or Coordination`, with the repeated-coordination, shared-structure-tightness and empty-indirection triggers firing.
  - Refactor now: new owner `memberRunStateHydration` (fetch + commit) used by Team open, Team lazy and Org; one `MemberRunStateCommit` record; renames `commitTeamRunHydration` and Org `commit`.
  - Standalone commit deferred (REQ-004); collaborators untouched pending REQ-006.
- Classification: `task_size=Medium`, `architectural_risk=High` (new shared owner and commit-sequencing contract across member paths). This changes the route from direct implementation to architecture review.
- Implementation impact: the paused work in progress (SR-002 shape, uncommitted) must be reworked; collaborator edits reverted.
- Remaining: REQ-006 user decision; deferred standalone commit copies.
- Handoff: solution-handoff.md §SR-003 Routing.

## Review Notifications (Informational)

| Date | Review ID | Basis | Verdict | Report | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | ARCH-REV-001 | SR-003 | Pass | `design-review-report.md` (this folder) | The reviewer handed off to `/implementation_engineer`. Advisory DOC-001 (stale pre-SR-003 requirements text; REQ-005 decision wording) was fixed as factual corrections in requirements-doc.md and design-principles-recheck.md. No solution revision required. |
