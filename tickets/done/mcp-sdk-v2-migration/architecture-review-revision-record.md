# Architecture Review Revision Record — mcp-sdk-v2-migration

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / SR-004 re-review | SR-002, SR-004 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the v2 client migration design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer's Architecture Design Complete (`handoff-sr-003.md`), `task_size=Medium`, `architectural_risk=High`
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` (SR-003); N/A
- Relevant solution revision IDs: SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- Baseline established: Classification confirmed. Behavior basis confirmed except for target-path accuracy on BEH-008 and BEH-009. Structure, ownership, dependency rules, examples and validation plan pass.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Medium): DS-002 evidence. The real routes answer the v2 `auto` probe with HTTP 400/`-32600`, not `-32601`. The client source shows a legacy fallback for that reply.
  - AR-002 (Low): name `callSdkFunction` and `asObject` in the O-002 removal plan, and make the AC-008 check precise, since it currently matches an unrelated test helper.
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - RR-001: v2 rejects draft-04 output-schema dialects (MP-001, reachability unclear).
  - Comment hits in the AC-001 grep.
  - FU-003: stale `autobyteus-ts/pnpm-lock.yaml`.
  - R-002/R-003 are settled by validation.

### ARCH-REV-002 — Re-review after SR-004 corrections

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/design-review-report.md`
- Review round and trigger: Round 2; Solution Designer's SR-004 (`handoff-sr-004.md`), the re-review of AR-001 and AR-002
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-004; AR-001, AR-002
- Relevant solution revision IDs: SR-002 (approved basis, unchanged), SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed:
  - DS-002 now describes the real route path.
  - The O-002 Removal Plan and the AC-008 check are precise.
  - The non-blocking items were taken: RR-001 into R-003, the AC-001 comment and root-lockfile notes, and FU-003.
  - Round-1 error corrected: the `asObject` import stays in use (L478).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium) | Resolved | SR-004; design-spec L48, L66, L139, L147, L272-273; investigation notes L38, L171-172 | Route constants re-read (default 2025-03-26, supported set, 400/`-32600`). The new probe mirrors them; its output shows the `auto` fallback to legacy 2025-11-25 with list and call working. AC-007 rows require the real routes. |
| AR-002 | Open (Low) | Resolved, with the `asObject` part withdrawn | SR-004; design-spec L168-171, L330; requirements-doc AC-008 | `callSdkFunction` named (only caller L345). `asObject` used at L478, so my round-1 claim was wrong. Today the narrowed greps match only removal targets. The AC-008 wording change alters only the check, not behavior. |

- New or remaining finding IDs: none
- Material classification changes: none (`Medium`/`High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty:
  - R-002/R-003 (including RR-001), settled by parity validation.
  - AC-007 on the real routes: if it fails, the design returns to the Solution Designer.
  - REQ-013 re-entry if a protocol-era failure appears.
