# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-004 (SR-003 withdrawn; its review stopped without a decision) | N/A | Fail | AR-001 |
| ARCH-REV-002 | Round 2 / SR-005 answers AR-001 | SR-005 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-003 | Round 3 / SR-006 corrects D-1 after the Implementation Engineer's Design Impact | SR-006 | Pass | Pass | None |
| ARCH-REV-004 | Round 4 / SR-007 corrects D-3 after the Implementation Engineer's second Design Impact | SR-007 | Pass | Fail | AR-002 (new) |
| ARCH-REV-005 | Round 5 / SR-008 answers AR-002 (route (b), strict) | SR-008 | Fail | Pass | AR-002 (resolved) |
| ARCH-REV-006 | Round 6 / SR-009 answers the Code Reviewer's CR-003 on D-8 | SR-009 | Pass | Pass | None |

## Revision Entries

### ARCH-REV-001 — The Task-record model (SR-004)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/tickets/in-progress/collaboration-tree-open-tasks-only-469/design-review-report.md`
- Review round and trigger: 1; Solution Designer's Architecture Design Complete for SR-004
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; N/A
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: N/A. The review of SR-003 was stopped at the Solution Designer's request; there was no decision and no report, only informal observations, which are recorded in the notes (B-4).
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established: baseline established. The model (no stored local list; tree composed from open Task entries and own files), its boundaries, the no-migration decision, closure and reopen in memory, and the readers of closed runs are confirmed. One finding: AR-001 (High). Startup admits Team/Org packages by reading their trees (`server-runtime.ts:184`; app host `:166`) before the Task records are loaded and the source is bound (`build-studio-server.ts:329`; app host `:242`). With the source throwing when unbound, every Team and Org run is not admitted (MP-001).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001
- Material classification changes: none (`Large` / `High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: U-003 … U-006 and U-008 stay implementation checks. U-004 can be settled read-only now. See the report's Residual Risks.

### ARCH-REV-002 — Startup admission reads own parts only (SR-005)

- Canonical design review report: same path as above
- Review round and trigger: 2; the Solution Designer's SR-005 (commit `6213a150f4`), answering AR-001
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-001
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - D-11 adds `readOwnParts` to the Team and Org stores, used by startup admission and the maintenance repair. Neither asks the Task side. DS-008 carries that path.
  - B-5 places all 19 construction sites before or after the binding.
  - D-12 matches today's rule (`remote-task-execution-links.ts:60-63`).
  - The requirement wording corrections change no intended behavior.
  - No new findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-005: D-11, DS-008, B-5, Guideline item 2, Key Tradeoffs; requirements AC-008 | `root-run-package-current-validator.ts:190, 216` are to use `readOwnParts` (file mapping). The repair script runs in its own process and was correctly excluded from the reordering route. Nothing between the rebuild and the Task-record load reads a tree: `build-studio-server.ts:150-329` and `start-standalone-application-host.ts:166-242` were scanned |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty:
  - U-009 can be closed by reading: both row projectors use own parts only.
  - U-003, U-005, U-006 and U-008 stay implementation checks.

### ARCH-REV-003 — D-1 candidate rule corrected (SR-006)

- Canonical design review report: same path as above
- Review round and trigger: 3; SR-006 (commit `c0201f11c6`), after the Implementation Engineer's Design Impact on D-1 (notes B-6)
- Triggering role, report path, and finding IDs: Implementation Engineer, through the Solution Designer; `handoff-architecture-design-complete.md`; no architecture-review finding
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - `openDelegatedRunsOf` now includes every open current entry, whatever its `start`. This is verified against `task-execution-resources.ts:79-104` and `root-task-dispatch.ts:59-81`.
  - The ARCH-REV-002 residual note that called the "not `starting`" rule sound is withdrawn; its premise, U-008, was disproved.
  - The view-rule form and the removal of the attachment readers from the mapping are confirmed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | SR-006 does not touch D-11 or DS-008 | Unchanged sections |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: U-005 continues during implementation.

### ARCH-REV-004 — D-3 save rule (SR-007)

- Canonical design review report: same path as above
- Review round and trigger: 4; SR-007 (commit `b6db3e1ca8`), after the Implementation Engineer's second Design Impact (notes B-7)
- Triggering role, report path, and finding IDs: Implementation Engineer, through the Solution Designer; `handoff-architecture-design-complete.md`; none from this review
- Relevant solution revision IDs: SR-007
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Accepted: keeping an entry whose run has no own file; the independence of `20261019_…` from the entries; the three U-005 findings.
  - New finding AR-002: SR-007 checks only the entry's own run ID. Released v1 can leave a full Team record whose own file exists at L1 while a nested record inside it is not migrated: post-order, `run()` continues past a per-run failure, and `reduceTree` keeps the full record. A save would then destroy the nested run's only record (MP-002).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | SR-007 does not touch D-11 or DS-008 | Unchanged sections |

- New or remaining finding IDs: AR-002
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: U-005 continues during implementation.

### ARCH-REV-005 — D-3 strict link rule (SR-008)

- Canonical design review report: same path as above
- Review round and trigger: 5; SR-008 (commit `ebe9646c12`), answering AR-002
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-002
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - D-3 leaves out only an entry with exactly the link keys whose run's own file exists at the standard place. Every other entry is kept byte-for-byte.
  - Verified that the second released migration never reads delegated-run lists, and that v1 writes own files at the standard place with the link facts.
  - No new findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Resolved | Unchanged by SR-008 | — |
| AR-002 | Open (High) | Resolved | SR-008: D-3, checklist item 4, removal plan, Legacy Removal Policy, rejection log, Guidance; AC-009 fixtures; REQ-007 | A full record is never link-shaped, so it is kept for v1 (`coordinating-run-migration.ts:193-195`). The standard place equals v1's `agentMemoryDir` / `teamDir` (`released-task-agent-own-files-with-origin.ts:483-514`). `own-file-completion.ts:76-93` reads only configured placements |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: U-005 continues during implementation.

### ARCH-REV-006 — D-8: the Team's reopened event carries records (SR-009)

- Canonical design review report: same path as above
- Review round and trigger: 6; SR-009 (commit `6e1f3cb23e`), after the Code Reviewer's failure-origin review CRR-002 (API/E2E round 1), finding CR-003
- Triggering role, report path, and finding IDs: Code Reviewer, through the Solution Designer; `code-review-report.md`; CR-003 (not an architecture-review finding)
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: `Pass` (ARCH-REV-005)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - D-8 for the Team root: the reopened event carries records and the view inserts what it lacks. Verified against the Team view's handlers and the contracts; the effects of "started" add no visible behavior.
  - The Agent-run and Org contexts are unchanged. No new findings.
  - Two implementation notes are in Residual Risks: split the reopened schema from the closed one and keep `change_sequence`; keep "closed" published before the drop.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved | Unchanged by SR-009 | — |
| AR-002 | Resolved | Resolved | Unchanged by SR-009 | — |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: U-005 continues during implementation.
