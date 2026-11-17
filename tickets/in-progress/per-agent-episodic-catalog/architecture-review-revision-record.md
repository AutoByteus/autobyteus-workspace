# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of the Solution Designer's handoff (2026-11-17) | SR-001 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004, AR-005, AR-006 |
| ARCH-REV-002 | Round 2: SR-002 resubmission (2026-11-17) | SR-002 | Fail | Pass | AR-001…AR-006 resolved |
| ARCH-REV-003 | Round 3: SR-002 contract addendum (`episodic-catalog-contract.md`) | SR-002 | Pass | Fail (scoped to the contract; Requirement Gap) | AR-007 |
| ARCH-REV-004 | Round 4: contract corrected for AR-007 | SR-002 | Fail | Pass | AR-007 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review of the episodic catalog design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-review.md` (Large / High)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A
- Relevant solution revision IDs: SR-001
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline. The behavior basis is confirmed. The design's main shape is sound. Four blocking corrections (catch-up rule, construction order, Task source, attribution table) and two small ones.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High), AR-002 (High), AR-003 (Medium), AR-004 (Medium), AR-005 (Low), AR-006 (Low)
- Material classification changes: none. `task_size=Large` and `architectural_risk=High` are confirmed.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Node first-build time (AC-010)

### ARCH-REV-002 — SR-002 re-review: every finding resolved, Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-002 resubmission (`handoff-architecture-review.md`, SR-002 section)
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-001); AR-001…AR-006
- Relevant solution revision IDs: SR-002
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - SR-002 applies the user-directed slimmer entry (DEC-013): archive no longer changes the catalog; one `catalog.md`; no stored state.
  - SR-002 resolves AR-001…AR-006, each verified against the current code.
  - The behavior basis was re-confirmed against the SR-002 requirements.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002; REQ-007, REQ-010, AC-007, QR-002 revised (option b) | DS-003 reuses one `findRuns()` and lists existing folders; the store writes only changed files; nothing is stored between starts; AC-007 counts record reads |
| AR-002 | Open (High) | Resolved | SR-002; design-spec Dependency Rules | Same order in both roots, matching `build-studio-server.ts:330-376` and `start-standalone-application-host.ts:243-279`. The catalog is created after steps 1–2 and passed to step 3 (`general-process-run-supervisor.ts:317, 353`) and steps 4–8 (`collaboration-composition.ts:264`). `start({ taskTitles })` runs after `composeCollaboration` (recorded under Principle 16; the reason holds). `stop()` is in both close paths. No loader and no node id |
| AR-003 | Open (Medium) | Resolved | SR-002; REQ-004 "any role" | `DelegationIndex.currentTaskOf` (`delegation-index.ts:247-251`) → new `taskTitleOf` (title only) |
| AR-004 | Open (Medium) | Resolved | SR-002; attribution table | `agents/<id>` → AGENT with definition id from metadata, else the row, else null (matches `memory-run-discovery.ts:123-142`); `root` non-null; one uncatalogued rule |
| AR-005 | Open (Low) | Resolved | SR-002; bounded local spine | "5 s after the most recently queued request, at most 30 s after the oldest" |
| AR-006 | Open (Low) | Resolved | SR-002; removal plan | `folderRun`, `runKeyOf`, `nameFromFolder` made private or unexported; `Pick` trimmed |

- New or remaining finding IDs: none. Implementation notes N-1 (move the `MemoryRunSubject` type with discovery into agent-memory) and N-2 (header name for an agent with no runs left) are recorded under Residual Risks.
- Material classification changes: none. `task_size=Large` and `architectural_risk=High` are confirmed.
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: Node start-build time (AC-010).

### ARCH-REV-003 — Contract addendum: one inconsistency in the agent-name rule

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/design-review-report.md`
- Review round and trigger: round 3. The Solution Designer added the behavior-defining supplement `episodic-catalog-contract.md` after the ARCH-REV-002 basis and asked for confirmation and forwarding.
- Triggering role, report path, and finding IDs: Solution Designer; `episodic-catalog-contract.md`; N/A
- Relevant solution revision IDs: SR-002 (addendum)
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`, scoped to the contract (AR-007). The design's structural verdicts are unchanged.
- What changed in the review result: the contract was checked against the reviewed design and REQ-001…004, 009 and 010. It agrees on the files, write rules, entry fields, privacy exclusions, index and events. The agent-name rule (§2.3) contradicts its examples and the discovery it cites.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001…AR-006 | Resolved | Resolved (unchanged) | ARCH-REV-002 | The contract does not reopen them |

- New or remaining finding IDs: AR-007 (Requirement Gap, Medium)
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer. The contract is not yet forwarded to implementation.
- Remaining risks or uncertainty: N-5 implementation details (nullable start, same-day header expansion)

### ARCH-REV-004 — Contract confirmed; package passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog/design-review-report.md`
- Review round and trigger: round 4; the Solution Designer's AR-007 correction to `episodic-catalog-contract.md`
- Triggering role, report path, and finding IDs: Solution Designer; `episodic-catalog-contract.md`; AR-007
- Relevant solution revision IDs: SR-002 (addendum)
- Prior authoritative decision: `Fail` (scoped to the contract)
- Current authoritative decision: `Pass`
- What changed in the review result: contract §2.3 has one name rule (as discovery reports it), and §2.5 and §3 match it. N-5 is adopted (nullable `startedAt`; full dates for same-day ranges). The contract is forwarded to implementation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (Medium) | Resolved | SR-002 addendum; contract §2.3, §2.5, §3 | The rule and the examples (`solution_designer`, `Project Task Manager`) match `memory-run-discovery.ts:34, 99, 114, 136` |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: Node start-build time (AC-010); the order of the design spec's `index.md` example (the contract wins)
