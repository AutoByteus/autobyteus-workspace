# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-002` | Steps 1–6, 8 done; step 7 misses QR-004 → `Design Impact` to the Solution Designer |

## Revision Entries

### IR-001 — Large runs load less: participant messages, member loader, structural admission

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`. The round ends in a `Design Impact` (QR-004).
- Prior authoritative result: `N/A`.
- Current authoritative result: `codex/large-runs-load-less` from `f48bdfc0ab` to `e66b453d5b` (commit table in the handoff), plus the IR-001 records commit.
- Related solution revision IDs: `SR-002`. Architecture review: `ARCH-REV-002`. Code review, API/E2E, delivery: `N/A`.
- Why recorded: the initial implementation handoff.
- Approved behaviour or requirement IDs affected: REQ-001…REQ-005; AC-001…AC-007 (AC-007 not met).
- Implementation delta:
  - Server records owners and the `collaborationParticipantMessages` query.
  - Views and snapshots without message logs; contracts updated.
  - Structural admission and per-package `admitCurrent`.
  - Web `CollaborationParticipantMessages` and `MemberLoader`; focused-only Team and Org staging.
  - Settings via `viewFor`; settled-view reuse on selection; the per-frame feed check.
  - Removals as listed in the handoff.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Implementation-time corrections found by tests and measurements (all fixed in this round):
  - A member load whose context was replaced while its fetch failed now ends as superseded, not as an error (hub child spec).
  - The live-tool-authority check is decided at commit only. Retrying on a change caused an extra fetch (hub lazy-children spec).
  - The `MemberLoader` instance is per Pinia instance; a module singleton leaked state between tests and would not reset with the app's stores.
  - `useOncePerFrame` no longer cancels its frame on unmount. A pending frame does nothing once the component has unmounted, which avoids mismatched fake timers.
  - QR-002 was first measured at 2 view reads per click. Cause: the history row and the selection sync both read the view. `syncHost` now reuses a settled stored view (`e66b453d5b`).
- Local validation and result: `evidence/IMP-local-checks.log`; the handoff's Checks Run table.
- Next recipient or routing: `Design Impact` → `/software_engineering_team/solution_designer`. QR-004 is missed after DEC-001 (a), and the profile contradicts the DS-006 cause.
- Remaining limitations or risks: QR-004 (Design Impact); the clean-clone suites and the M-151 browser measurement are not run yet; FU-001 base test failures.
