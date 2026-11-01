# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | `SR-002`, `ARCH-REV-002` | Steps 1–6, 8 done; step 7 misses QR-004 → `Design Impact` to the Solution Designer |
| IR-002 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-003 (Pass), after IR-001's Design Impact | IR-001 QR-004 | `Design Impact Rework` | `SR-003`, `ARCH-REV-003` | DS-007 done; QR-004 met; ready for code review |

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

### IR-002 — DS-007: cheap shaping of very long unbroken runs (QR-004)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (Pass) on SR-003, after IR-001's Design Impact.
- Triggering finding IDs: IR-001's QR-004 escalation.
- Classification: `Design Impact Rework`.
- Prior authoritative result: IR-001 at `3a1b4efb9a` (QR-004 missed: 85.9 s).
- Current authoritative result: `b58a3106c3`, plus the IR-002 records commit.
- Related solution revision IDs: `SR-003`. Architecture review: `ARCH-REV-003`. Code review, API/E2E, delivery: `N/A`.
- Approved behaviour or requirement IDs affected: REQ-005, AC-007, QR-004; DEC-004.
- Implementation delta:
  - `utils/text/longUnbrokenRun.ts`: `hasLongUnbrokenRun`, one linear scan for a run of at least 1,000 non-whitespace characters, using the Unicode whitespace set.
  - A global `long-unbroken-text` class in `app.vue` with all four designed properties; they were not measured one by one.
  - The class is bound in `UserMessage.vue` (message text), the `MarkdownRenderer.vue` html segment, `InterAgentMessageSegment.vue` (content wrapper) and the Team-tab row in `CollaborationMessagesPanel.vue`. DS-006 is kept.
- Implementation-time correction: the class was first placed in `assets/css/main.css`, which the app never loads; L-010 stayed at 86.8 s. Moved to `app.vue`, the same run gave 199 ms. The unused file is FU-002.
- Tests: helper unit spec (3); a component test in `UserMessage.spec.ts` and one in `MarkdownRenderer.spec.ts` (a long-token block gets the class, a prose block does not, the text is unchanged).
- Local validation and result: L-010 unbroken 199 ms, words 294 ms (`evidence/IMP-L010-ds007.log`). Web typecheck passes; the three guards each pass; related specs 101 passed. Suites from a clean clone: `evidence/IMP-clean-clone.log`.
- Next recipient or routing: `get_handoff_rules` → code review (Large/High).
- Remaining limitations or risks: tool-call and reasoning renderers not measured with long tokens (the reviewer's recommendation); M-151 browser measurement left to API/E2E; FU-001, FU-002.

