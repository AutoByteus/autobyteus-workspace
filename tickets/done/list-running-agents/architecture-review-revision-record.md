# Architecture Review Revision Record — list-running-agents (autobyteus-492)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High); basis replaced by SR-005 during the review | SR-001 … SR-005 | N/A | Fail | AR-001, AR-003, AR-004, AR-005, AR-006 |
| ARCH-REV-002 | Round 2 / SR-006 (fixes for ARCH-REV-001; DEC-013 entry fields) | SR-006 | Fail | Fail | AR-001, AR-003, AR-004, AR-005, AR-006 resolved; AR-007 new |
| ARCH-REV-003 | Round 3 / SR-007 (fix for AR-007) | SR-007 | Fail | Pass | AR-007 resolved |
| ARCH-REV-004 | Round 4 / SR-008 (Solution Designer's walkthrough: G-1, G-2) | SR-008 | Pass | Pass | AR-008 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review (SR-005): closed-Task rule on the `node` path

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`
- Review round and trigger: round 1. Solution Designer handoff 2026-11-18 at SR-003 (`95e9e8f5f3`). During the review the Solution Designer asked for SR-005 (`322fe8ed32`) to be reviewed instead: SR-004 keeps today's team-run-ID refusal and adds `coordinator_agent_run_id`; SR-005 removes Org entries. This result covers SR-005.
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-001 … SR-005.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What baseline was established: the behavior basis is confirmed, except the paths of BEH-004/005 (closed-Task rule) and BEH-006 (the peer's coordinator source). The code citations hold. AR-002 (a team run ID across nodes) was drafted against SR-003 and withdrawn before this result, because SR-004 removed that routing. Its ID is not reused.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Design Impact, High), AR-003 (Requirement Gap — stale texts, Low), AR-004 (Design Impact, Low), AR-005 (Requirement Gap, Medium), AR-006 (Design Impact, Low).
- Material classification changes: None (`Large`/`High` confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: two-node behavior until the two-server E2E runs (UNK-001); `RunningAgents.rootOf` must use the root's own statuses, not `placeOf` alone.

### ARCH-REV-002 — SR-006 rechecked: five findings resolved; one gap remains, CLOSED without `node`

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`
- Review round and trigger: round 2. SR-006 at `159298e8a4` (Solution Designer's message, 2026-11-18).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-006; AR-001, AR-003 … AR-006.
- Relevant solution revision IDs: SR-006.
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Fail`.
- What changed in the review result: I confirmed the behavior basis again. I redrew DS-004 with `closedPeerRunRefusal` before the sender's root and `teamCoordinatorOf` after `rootOf` returns `null`. I checked the DEC-013 fields against the run files: Agent `workspaceRootPath` is required; a Team member's is optional, so the design's `workspace?` holds. One new finding, AR-007.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-006 | `design-spec.md` DS-004, Ownership Map (`closedPeerRunRefusal`, router order), interface row, entry-form row 13, sequence step 6 tests |
| AR-003 | Open (Low) | Resolved | SR-006 | `requirements-doc.md:13` and Readiness now say SR-006; REQ-002 is per kind; `design-spec.md:257` says local and peer; investigation notes' meta and last line say SR-006; RSK-001 rewritten |
| AR-004 | Open (Low) | Resolved | SR-006 | Removal plan row for `ownershipChain` (member, three builders, engine comment `:152`); the `unlinkedRunEndpoint` row has none |
| AR-005 | Open (Medium) | Resolved | SR-006 | REQ-011, AC-008 and DEC-011 state the outcome per sender node; entry-form row 14; within DEC-011's direction, with the founder informed |
| AR-006 | Open (Low) | Resolved | SR-006 | Ownership Map: `roots.resolve({agent_team})?.teamCoordinatorOf`; DS-004 placement; interface row; unit test in the sequence |
| AR-002 | Withdrawn before ARCH-REV-001 | Not used | SR-004 | — |

- New or remaining finding IDs: AR-007 (Design Impact, Low). REQ-011 and AC-008 promise CLOSED for any sender on this node "with or without `node`". The design gives a root that does not link the run `TARGET_AGENT_RUN_NOT_ACTIVE` when it sends without `node`, because the route's step "peer run? null" returns before admission (MP-004).
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: two-node behavior until the two-server E2E runs (UNK-001); `workspace` is a filesystem path sent to peers (requested by the founder).

### ARCH-REV-003 — SR-007: CLOSED without `node` too; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`
- Review round and trigger: round 3. SR-007 at `bd52ef4e15` (Solution Designer's message, 2026-11-18).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-007; AR-007.
- Relevant solution revision IDs: SR-007.
- Prior authoritative decision: `Fail` (ARCH-REV-002).
- Current authoritative decision: `Pass`.
- What changed in the review result: I redrew the bounded spine of `CrossRunMessageDelivery.route`: the peer-run branch now returns `closedPeerRunRefusal(its nodeId, target) ?? null`. I checked the rest of SR-007 against SR-006: only that point changed (design-spec bounded spine, Ownership Map, row 13, step 6 tests; requirements unchanged apart from the revision ID). The delegator's own reopen still goes by the router's own-root step (link path), before `route`, so it is unaffected.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (Low) | Resolved | SR-007 | `design-spec.md` § Bounded Local Spines (peer-run branch calls `closedPeerRunRefusal`); Ownership Map "two callers, one rule"; entry-form row 13 "P, or none"; sequence step 6 covers with and without `node` |

- New or remaining finding IDs: None.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational).
- Remaining risks or uncertainty: see the report's Residual Risks. The main ones: two-node behavior until the two-server E2E runs (UNK-001), and `workspace` paths sent to peers (the founder asked for them).

### ARCH-REV-004 — SR-008 delta: unrelated messages stay out of run views; the receiver's active root

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/list-running-agents/tickets/in-progress/list-running-agents/design-review-report.md`
- Review round and trigger: round 4. SR-008 at `111ebbc096`: the Solution Designer's per-use-case walkthrough (G-1, G-2), after ARCH-REV-003's Pass, with implementation already under way.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-008; G-1, G-2 (its own).
- Relevant solution revision IDs: SR-008.
- Prior authoritative decision: `Pass` (ARCH-REV-003).
- Current authoritative decision: `Pass`.
- What changed in the review result: I checked G-1 at HEAD. The live feed would publish an unrelated message to both views, while the Team-tab read drops it. The fix (`publishToViews` on `CrossRunAcceptInput`, false for unrelated) reaches the engine through all three roots' spread, unchanged, and DEC-014/REQ-011 state it. G-2's target is right, but its citation names `resolveActive` as existing code, while at HEAD it is uncommitted implementation work (AR-008, non-blocking). I spot-checked four more walkthrough rows; they hold. The report gained § SR-008 Delta Review.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001, AR-003 … AR-007 | Resolved | Resolved (unchanged) | SR-006, SR-007 | SR-008 changes none of their sections except DS-003's receiver lookup (G-2), which does not touch the closed-Task paths |

- New or remaining finding IDs: AR-008 (Design Impact, Low, non-blocking): the `resolveActive` citation and the missing `collaboration-root-resolver.ts` in the file mapping.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary, the SR-008 delta); Solution Designer (informational, with AR-008).
- Remaining risks or uncertainty: see the report's Residual Risks; the G-1 test is the new item.
