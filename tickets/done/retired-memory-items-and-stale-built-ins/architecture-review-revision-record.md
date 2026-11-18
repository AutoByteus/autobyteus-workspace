# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of the Solution Designer's handoff (2026-11-18) | SR-002 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2: SR-003 resubmission (2026-11-18) | SR-003 | Fail | Pass | AR-001 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: the migration is ready; the removal must include the one-value type dispatch

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-review.md` (Medium / High)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A
- Relevant solution revision IDs: SR-002
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline.
  - The behavior basis is confirmed.
  - The migration (Part 2) passes: isolated owner, registry paths, retried without blocking startup, idempotent.
  - MP-001 (the compactor's runs becoming visible) is Not Reachable: the definition was never internal.
  - The Part 1 removal leaves a one-value `MemoryType`/`MemoryItem` dispatch (AR-001).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium)
- Material classification changes: none. `task_size=Medium` and `architectural_risk=High` are confirmed.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: R-1 (user-made team definitions that list a retired agent); N-2 (the exception list for tests)

### ARCH-REV-002 — SR-003 removes the one-value type dispatch; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-003 resubmission (`handoff-architecture-review.md`, SR-003 section)
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-001); AR-001
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed:
  - `MemoryType`, `MemoryItem` and `RawTraceItem.memoryType` are removed.
  - The stores' `add` is typed on `RawTraceItem`.
  - `getFilePath` and `readMemoryDicts` give way to `getRawTracesPath()` and a private raw-trace read.
  - `appendRawTrace` stays for its server caller.
  - The tests are listed.
  - N-2 is adopted in Dependency Rules; R-1 is recorded in Risks.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-003; design-spec removal plan rows 177-187, Key Tradeoffs, rejection log line 312 | `appendRawTrace` → `add([item])` (`run-memory-file-store.ts:130-132`), and its server caller (`external-runtime-memory-writer.ts:32`), are kept; `FileMemoryStore` is the only `MemoryStore` subclass (`file-store.ts:11`); all 13 test and harness files that use the removed API are in the plan, as is the only `readMemoryDicts` test caller (`run-memory-file-store-damaged-end.test.ts:136`); `toDict` writes no memory-type field |

- New or remaining finding IDs: none. Implementation note: the private raw-trace read keeps the end repair and the verified-path marking.
- Material classification changes: none (`Medium` / `High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: R-1 (user-made team or org definitions that list a retired agent, on other machines)
