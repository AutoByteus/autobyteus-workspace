# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / ARCH-REV-001 pass on SR-003 | N/A (advisory IMPL-NOTE-001 applied) | `Initial Baseline` | `SR-003` (history `SR-001`, `SR-002`), `ARCH-REV-001`, CRR N/A, API-REV N/A, DR N/A | Implemented; ready for code review |

## Revision Entries

### IR-001 — Shared member-run state owner for Team and AgentOrg member artifacts

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-001 pass on SR-003.
- Triggering finding IDs: N/A. Advisory IMPL-NOTE-001 (keep a failed best-effort member's projection `null`; revert the collaborator edits) was applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`. No implementation round was completed before this one:
  - SR-001 stopped at the design read with Design Impact DI-001.
  - SR-002 work was paused uncommitted at the Solution Designer's request and then reworked here.
- Current authoritative result: implemented; local checks show no new failures against base.
- Related solution revision IDs: `SR-003` (history `SR-001`, `SR-002`)
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: the initial implementation of the approved SR-003 design.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003 (changed); REQ-004 (preserved); AC-001..AC-007.
- Implementation delta:
  - New `memberRunStateHydration.ts` owner (`fetchMemberRunState`, `MemberRunStateCommit`, `commitMemberRunStates`).
  - `fetchRunFileChanges`.
  - Team open staging through the owner, with `memberRunStates` replacing `activityReplacements` and `commitTeamRunHydration` replacing `commitTeamRunHydrationActivities` (4 call sites).
  - Team lazy path through the owner.
  - Org staging through the owner, with the staged callback `commitActivities` renamed `commit` (2 caller files).
  - Standalone path reuses the shared fetch.
  - SR-002 work-in-progress shapes removed and collaborator edits reverted.
- Changed files or areas: 10 modified production files plus 1 new one, new and extended specs, and the test harnesses for the new query (see the handoff, Key Files).
- Local validation and result: see the handoff, Local Implementation Checks. The related suites and the full web unit suite show no new failures against base, and the new AC-001..AC-004 tests fail on base.
- Next recipient or routing: `/code_reviewer` (Medium + High).
- Remaining limitations or risks:
  - Browser E2E for AC-001..AC-004 is owned by API/E2E.
  - The stricter artifact failure coupling noted in the design Risks.
  - Pre-existing base test failures.
