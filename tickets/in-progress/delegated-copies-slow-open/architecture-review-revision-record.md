# Architecture Review Revision Record — delegated-copies-slow-open

The latest `design-review-report.md` remains authoritative. This record keeps the concise history of review rounds.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-003) | SR-001, SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / Revised Architecture Design Complete (SR-004) | SR-004 | Fail (Design Impact) | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: in-flight child hydration vs republication

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/design-review-report.md`
- Review round and trigger: round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer` (handoff `handoff-architecture-design-complete.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-003; no prior findings.
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` — `Design Impact`
- Baseline established:
  - Behavior basis confirmed (BEH-001..BEH-005), and classification `Medium`/`High` confirmed.
  - Server scoping (D-3), the structure-only publication (D-1), the removal plan and the `Not Affected` persisted-data decision pass.
  - One blocking issue: the specified in-flight dedupe is per retained `AgentContext`, and its commit check is bound to the captured collaboration context. Combined with D-4/D-5 republication, the selected copy can be left unloaded on the ordinary path "click a copy row of a non-selected hub" (MP-001, Reachable).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High, blocking), AR-002 (Low, non-blocking: redundant pending-submission guard)
- Material classification changes: none
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: R-A (probe output missing the hub-own-projection line), R-B (live hub children's artifacts become active-sourced, intended), R-C (possible double load on first open), R-D (FU-1 duplication), R-E (loading state = empty/old conversation), U-001, R-002.

### ARCH-REV-002 — Re-review: supersession and dedupe defined; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-slow-open/tickets/in-progress/delegated-copies-slow-open/design-review-report.md`
- Review round and trigger: round 2; revised `Architecture Design Complete` from `/software_engineering_team/solution_designer` (SR-004).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` at SR-004; AR-001, AR-002.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` — `Design Impact` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Behavior basis reconfirmed; requirements unchanged at SR-002.
  - BEH-003/BEH-004 target-path coherence, DS-002/DS-004/DS-005, the child-hydration interface and the store example now pass.
  - Unaffected verdicts are kept from round 1.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High, blocking) | Resolved | SR-004; design-spec D-2, D-4, D-5, DS-005, example, test (b) | Load bound to (published context, child). `isPublished` is checked after the fetch and right before the synchronous commit. Superseded loads end with no retry and no commit. Dedupe has one owner (the store), with a `WeakMap<context, Map<child, Promise>>` key. A fresh load starts after each publication. Checked against `prepareLocalContextAdoption` (same `AgentContext` handed to the new context) and the store's `setContext`. |
| AR-002 | Open (Low) | Resolved | SR-004; D-2 | Pending-submission guard removed. The presentation revision is bumped by `commitRecentEventMonitorEffect` STRUCTURAL when a local message is shown. |

- New or remaining finding IDs: none
- Material classification changes: none (`Medium`/`High`)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - R-A: resolved.
  - R-B: live artifacts for children of a running hub; intended and in the docs scope.
  - R-C: accepted as R-004.
  - R-D: FU-1 duplication.
  - R-E: the loading state is an empty or old conversation until loaded.
  - U-001 and R-002 remain validation items.
