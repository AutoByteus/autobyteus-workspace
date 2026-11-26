# Architecture Review Revision Record — autobyteus-516 Stage 1

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large / High), 2026-11-26 | SR-006, SR-007 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 / SR-008 resolution, 2026-11-26 | SR-006, SR-007, SR-008 | Fail | Pass | AR-001…AR-005 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review of the Stage 1 design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff `handoff-architecture-review.md`.
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-006 (requirements), SR-007 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`, Design Impact.
- Baseline established:
  - Behavior basis confirmed against the approved requirements and contract.
  - Code citations re-read on `origin/personal` (703 commits ahead of the base); they hold with line drift.
  - Macro structure accepted: contract first, one Extension Manager per node, the Server Part Host as the foreign-code boundary, owner-only routes, clean cut from Electron, discard of the old install.
  - Rulings that later rounds keep unless new evidence appears:
    - in-process server parts (deviation recorded; the reason holds);
    - the Manager in the GraphQL request context;
    - polling while busy;
    - discard (DEC-016).

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001: the availability of the embedded node's voice item in any window.
  - AR-002: the catalog fetch policy.
  - AR-003: `Origin: null` page loads versus the frozen §2 promise.
  - AR-004: the removal plan's missing consumers.
  - AR-005: a stable catalog URL.
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: listed under Residual Risks in the report (import cache key, stop during start, `message` precedence, catalog override variables, citation drift).

### ARCH-REV-002 — Round 2: AR-001…AR-005 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/design-review-report.md`
- Review round and trigger: round 2; Solution Designer handoff ("Round 2" in `handoff-architecture-review.md`); SR-008.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` SR-008; AR-001…AR-005.
- Relevant solution revision IDs: SR-006, SR-007, SR-008.
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - Each finding was verified in design-spec.md and extension-contract.md at `fdde5406fa` (0 behind `origin/personal`).
  - The round-1 rulings are kept.
  - No new finding.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open | Resolved | SR-008 | design-spec Ownership Map `voiceInputStore`, DS-004 (starts at `refreshAvailability`), Dependency Rules (web). `directNodeApolloClient.ts` reads another node with a 25 s bound, and the credential is attached by origin. Refresh moments are named. |
| AR-002 | Open | Resolved | SR-008 | Extension Catalog fetch policy: a background fetch after listen; page open / Try again (`refreshCatalog: true`); Install/Update must verify; 10 s bound; fetches running together are shared; every other call uses the copy in memory. |
| AR-003 | Open | Resolved | SR-008 | Contract §2 load kinds; the page CSP matches (`font-src data:`, no module scripts from files); the gate is unchanged; AC-002 adds a real-node page check. |
| AR-004 | Open | Resolved | SR-008 | Removal-plan rows added; the real-release test moves to `autobyteus-server-ts/tests/real-release/`. |
| AR-005 | Open | Resolved | SR-008 | Contract §3 and the file table: `releases/download/catalog/extensions-catalog.json` (+ `.sig`) on the fixed `catalog` tag, never marked Latest. |

- New or remaining finding IDs: none.
- Material classification changes: none (Large / High).
- Recommended recipient: `/implementation_engineer`; `/solution_designer` informational.
- Remaining risks or uncertainty:
  - one stale removal-plan reference (should be `electron/application/electronApplication.ts:38-39,68,371,398`);
  - the in-process server-part deviation;
  - a short gap while the `catalog` assets are replaced.
