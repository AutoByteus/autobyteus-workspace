# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md` (SR-001) and `handoff-design-revised-sr-002.md` (SR-002), direct route | N/A | `Initial Baseline` | SR-001, SR-002; ARCH N/A; CRR N/A; API-REV N/A; DR N/A | Implemented and validated; to API/E2E |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (failure origin of API-REV-001) | F-1, F-2 | `Local Fix` | SR-002; CRR-001; API-REV-001 | AGY TargetFile/DirectoryPath/Query/Pattern; TESTING.md commit split (history rewritten, hash map in the handoff); to API/E2E |

## Revision Entries

### IR-001 — 586 first; the phone Activity's rows, details and background tasks on shared builders

- Triggering role, report path, and round: Solution Designer; SR-001, then SR-002 (the user's DEC-006…DEC-008) while 586 was under way.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: commits `767cb3b61a`, `2a71fcb003`, `60ee161388`, `d45d74fa91`, `597f2dc6d6` on `codex/phone-activity-details`; see `implementation-handoff.md`.
- Related solution revision IDs: SR-001, SR-002.
- Related architecture-review, code-review, API/E2E and delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation round.
- Approved behavior or requirement IDs affected: REQ-001…REQ-009; AC-001…AC-007.
- Implementation delta:
  - D-1: excludes (plus the Windows staging folder) and the TESTING.md sentence.
  - D-2a: recipient and Task keys, the `cd` rule, and AGY's `CommandLine` / `Path` / `AbsolutePath` (implementation decision, within REQ-001).
  - D-2: `contextText` removed.
  - D-3, D-4: shared builders; the desktop renders the same HTML.
  - D-5…D-7: phone row, detail screen and `activityItem` route key, background task expand (title included).
  - Phone probe MSP-94…96.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: IMP-01…IMP-06, all Pass.
- Next recipient or routing: API/E2E (Medium / Low, direct).
- Remaining limitations or risks: FU-002…FU-005; no physical device; the Logs growth on the phone is unit-only (AGY streams no tool logs).

### IR-002 — Antigravity's file writes, listings and searches get their summary; TESTING.md in its own commit

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-001: the failure origin of API-REV-001 (MSP-97 failed) is an implementation defect, a Local Fix.
- Triggering finding IDs: F-1, F-2.
- Classification: `Local Fix`.
- Prior authoritative result: IR-001. AGY's `write_to_file` and `replace_file_content` rows showed no file (`TargetFile` was no summary key). The handoff's claim about AGY argument names was wrong. `767cb3b61a` mixed TESTING.md with code.
- Current authoritative result: `70f7040ee1` (F-1 and the search/list decision); the branch rewritten (F-2) with `7a2a62dcee` + `37ed9cdf00` in place of `767cb3b61a`; see `implementation-handoff.md` (hash map).
- Related solution revision IDs: SR-002.
- Related code-review revision IDs: CRR-001.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Approved behavior or requirement IDs affected: REQ-001 / AC-001.
- Implementation delta:
  - `utils/toolDisplaySummary.ts`: file keys gain `TargetFile` and `DirectoryPath`; text keys gain `Query` and `Pattern`. `SearchPath` and `SearchDirectory` are deliberately not keys.
  - The spec gains 6 cases.
- Changed files or areas: `autobyteus-web/utils/toolDisplaySummary.ts`, `autobyteus-web/utils/__tests__/toolDisplaySummary.spec.ts`.
- Local validation and result: IMP-07. MSP-94…MSP-97 pass; web suite 796/796; typecheck at baseline.
- Next recipient or routing: API/E2E (Medium / Low, direct): rerun MSP-97 and the whole phone suite, MSP-98 with its gate, FS-1, U-1.
- Remaining limitations or risks: as IR-001; a search with only a folder shows its name only.

