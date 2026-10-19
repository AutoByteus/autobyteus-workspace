# Implementation Revision Record

The current code (branch `codex/unclean-shutdown-delegated-run-restore`) and `implementation-handoff.md` are authoritative. This record helps locate each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-002, ARCH-REV-002 | Implementation complete at `a9b5230505`; Medium / High confirmed; to Code Review |

## Revision Entries

### IR-001 — Damaged-end tolerant restore, byte-exact repair, guarded append, synced rewrites, clear refusal

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, round 2, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: implementation of design-spec SR-002 steps 1–4 and 6 at commit `a9b5230505`. Step 5 (AC-005 server integration/E2E with a scripted runtime) is left to API/E2E (see handoff).
- Related solution revision IDs: `SR-002` (and SR-001).
- Related architecture-review revision IDs: `ARCH-REV-002` (ARCH-REV-001 findings AR-001, AR-002, R-1 resolved in the design and implemented as designed).
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-005 (BEH-006 preserved); REQ-001…REQ-006; AC-001…AC-004, AC-006…AC-008 covered by implementation-scoped tests.
- Implementation delta:
  - `autobyteus-ts`: new `jsonl-log-file.ts` (line rule on `Buffer`s, `readJsonlRecords`, `repairJsonlDamagedEnd`, `jsonlLogEndsCleanly`, `JsonlLogDamagedError`, `serializeJsonlRecords`) and `durable-file-replace.ts` (`replaceFileDurably`). `RunMemoryFileStore` reads for use through the repair, checks each file's end once per instance before the first append (`add`, `recordSystemInstructionSupply` share the same per-path state) and rewrites durably. `RawTraceArchiveManager` reads segments read-only with the shared rule and writes segments/manifest durably; `WorkingContextSnapshotStore` writes durably. Old private `readJsonl`/`writeJsonl`/`writeJson` helpers and the inline tmp+rename are removed.
  - `autobyteus-server-ts`: inspector uses `readJsonlRecords` (read-only) and maps every `indeterminate` cause to the plain-words reasons of the design's "Refusal reasons" table. New `task-execution-conversation-availability.ts` builds the refusal and logs the warning; the three adapters' `ingressAgentRunId` became `ingressMember` (address + run id) and call it. The activation planner message carries the reason.
  - Tests: new and extended unit tests (synthesized data only); two fixtures that returned the out-of-contract inspector kind `"absent"` now return `"none"`; the E2E EXC-E2E-007 assertion expects the new `none` wording.
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: IMP-01…IMP-09 in `implementation-handoff.md` (all Pass except IMP-09, an unrelated failure that is already on the base, recorded as follow-up FU-IMP-001).
- Next recipient or routing: per `get_handoff_rules` for Medium / High → Code Reviewer.
- Remaining limitations or risks: AC-005 not run here (API/E2E-owned); the append end check reads at most the last 64 KiB and falls back to a full read (refinement of the design's last-byte check, see handoff "Important Assumptions"); FU-001, FU-002 unchanged.
