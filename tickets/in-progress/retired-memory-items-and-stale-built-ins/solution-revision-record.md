# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-491 dispatched 2026-11-18 | N/A | N/A | Ready for Approval | BEH-001…005, REQ-001…007, AC-001…005, DEC-001…006 | Waiting for the user's answers to DEC-004, DEC-005, DEC-006 |
| SR-002 | Mixed | The user's answers (2026-11-18) and the founder's words relayed by the PM | N/A | Ready for Approval | Requirements Approved; Design Ready | BEH-004, BEH-005, REQ-001, REQ-004, REQ-005, AC-005, DEC-004…006 | Architecture Design Complete, Medium / High |
| SR-003 | Design | ARCH-REV-001 `Fail` | AR-001 (R-1, N-2) | Design Ready; review Fail | Design Ready | REQ-001, AC-001 (no requirement change) | Architecture Design Complete, Medium / High |

## Revision Entries

### SR-001 — Baseline

- Phase and classification: `Initial Baseline`
- Trigger: Project Task autobyteus-491 (description, part 2 comment of 2026-11-14, dispatch comment of 2026-11-18)
- Current status: requirements `Ready for Approval`; design not started
- Approval: pending; the questions were asked in the Solution Designer's conversation on 2026-11-18
- Next action: record the user's answers, approve, then design

### SR-002 — Approved with the user's data decisions; design

- Phase: `Mixed` (requirements approval + design)
- Trigger: the user in the Solution Designer's conversation, 2026-11-18: "the memory compactor agents data leave it if it doesn't influence us … 104 old memory compactor runs if it doesn't hurt us … if it's just data doesn't hurt us"; the PM relaying the founder: "let's remove the dead code, we should do that now".
- Decisions:
  - DEC-004: keep the 12 old files.
  - DEC-005: remove the Memory Compactor definition, by his rule "leave it if it doesn't influence us", because it is listed to every agent (INV-16); the user was informed and may keep it.
  - DEC-006: leave the 104 old compactor runs.
- Approval: `User` (his words above); exact baseline: requirements-doc.md at SR-002.
- Design: design-spec.md: removal plan for `autobyteus-ts/src/memory`; new startup migration `20261118_remove_retired_built_in_agents` for the two folders; test and doc rewrites.
- Classification: `task_size=Medium`, `architectural_risk=High` (a startup migration deleting data on every machine; removed public exports of a shared foundation).
- Next action: architecture review.

### SR-003 — The one-value type dispatch goes too (ARCH-REV-001)

- Phase: `Design Impact` (AR-001); requirements unchanged, no renewed approval.
- Change: remove `MemoryType` and `MemoryItem` (`memory-types.ts`), `RawTraceItem.memoryType`, `MemoryStore.list`. The stores' `add` is typed on `RawTraceItem` and appends to the raw-trace file; `appendRawTrace` stays. `getFilePath(memoryType)` and `readMemoryDicts(memoryType)` are replaced by `getRawTracesPath()` and a private raw-trace read. Tests read through the stores' existing raw-trace reads (list in design-spec).
- N-2: the ids' test, script and fixture exceptions are listed in Dependency Rules.
- R-1: recorded; the user is told; on the founder's node no team, org or package names the retired ids.
- Classification: `task_size=Medium`, `architectural_risk=High` (unchanged).
- Next action: architecture re-review.
- ARCH-REV-002 (informational `Pass` on SR-003): AR-001 resolved; package delivered to `/implementation_engineer`. Implementation note: the private raw-trace read keeps `readMemoryDicts`' damaged-end repair and `verifiedEndPaths` marking.
