# Architecture Review Revision Record — agent-initiated-collaborators

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-004 answers ARCH-REV-001 | SR-004 | Fail | Fail | AR-001–AR-004 resolved; AR-005 new |
| ARCH-REV-003 | Round 3 / SR-005: REQ-003 narrowed (user), bindings removed | SR-005 | Fail | Pass | AR-001 obsolete, AR-005 obsolete; AR-002–AR-004 retained as resolved |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound shape; catalog addresses not bound to the listed definition

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md`
- Review round and trigger: Round 1. The Solution Designer sent SR-003 as `Architecture Design Complete` (Large/High).
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002, SR-003.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established:
  - The behavior basis was confirmed against `84224a58d`: the allocator, the policy, the root port, the gate-internal admit precedent and the `publish_artifacts` pattern.
  - The pure `CatalogAddressMap` cannot satisfy REQ-003 when a base slug is taken over by a different definition (P-001 → AR-001).
  - In-run address sourcing is undefined (AR-002).
  - Step 1 needs a no-fall-through rule (AR-003).
  - The supplement inventory is missing (AR-004).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium, blocking), AR-002 (Low), AR-003 (Low), AR-004 (Low).
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - the gate held during admission on the first message;
  - AGY/ACP live MCP exposure of the opt-in tool;
  - the REQ-007 Org change (approved);
  - downgrade (unsupported).

### ARCH-REV-002 — SR-004 resolves AR-001–AR-004; binding storage conflicts with the lazy standalone package

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md`
- Review round and trigger: Round 2. SR-004 is a revised package answering ARCH-REV-001.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `design-review-report.md` (ARCH-REV-001); AR-001–AR-004.
- Relevant solution revision IDs: SR-004 (requirements basis SR-002 unchanged).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Fail (Design Impact).
- What changed: AR-001–AR-004 were verified against the SR-004 text. A new reachable conflict comes from the AR-001 fix: the binding write in the Agent root creates the lazy package and `hasCollaboration` on listing (P-004, verified in `agent-run-collaboration-persistence-coordinator.ts:17-19`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-004; Intended Change 2, DS-001/002, Persisted Data, interface row | A catalog hit requires an issued binding and the current map to agree; otherwise "list again". Bindings are persisted and refreshed on listing. A different definition can never be reached. |
| AR-002 | Open (Low) | Resolved | SR-004; `inRunPlacementsByDefinition()` interface row; policy file row | The port operation covers configured, mounted, collaborator and collaborator-member placements; task copies are excluded. Fixed precedence with a lexicographic tie-break; one entry per definition. |
| AR-003 | Open (Low) | Resolved | SR-004; Intended Change 6; tests | Inside the sender's instance prefix there is no run-wide or catalog fall-through; a miss returns `COLLABORATION_TARGET_NOT_FOUND`. Test added. |
| AR-004 | Open (Low) | Resolved | `investigation-notes.md` § Supplement Inventory | The predecessor VIS-001–015 spec is listed as the reused normative UI. |

- New or remaining finding IDs: AR-005 (Medium, blocking).
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - the gate held during first-message admission;
  - AGY/ACP MCP exposure;
  - the REQ-007 Org change (approved);
  - downgrade (unsupported).

### ARCH-REV-003 — SR-005: narrowed REQ-003 removes the binding machinery; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-initiated-collaborators/tickets/in-progress/agent-initiated-collaborators/design-review-report.md`
- Review round and trigger: Round 3. SR-005 answers ARCH-REV-002 (AR-005).
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `design-review-report.md` (ARCH-REV-002); AR-005, with AR-001 revisited.
- Relevant solution revision IDs: SR-005. The requirements were re-approved with REQ-003/AC-003 narrowed; the user's statement is recorded in `requirements-doc.md` Document Status.
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - P-001 is reclassified from Reachable (under the old REQ-003's explicit catalog-change clause) to `Technically Possible but Unsupported/Contrived`, on the user's statement. REQ-003 is narrowed accordingly.
  - The bindings are removed and listing is read-only, so AR-005 falls away.
  - Lesson accepted: the round-1 premise relied on the requirement's explicit clause as its governing contract. Before machinery is added, the clause itself should be checked for a coherent user workflow.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (SR-004, via bindings) | Obsolete | SR-005; REQ-003/AC-003; design § Material Premise Classification | The requirement was narrowed with the user's approval; P-001 is Unsupported; the bindings were removed (Intended Change 2) |
| AR-002 | Resolved | Resolved (retained) | SR-005 policy row | In-run precedence; one entry per definition |
| AR-003 | Resolved | Resolved (retained) | SR-005 Intended Change 6 | No fall-through inside the instance prefix |
| AR-004 | Resolved | Resolved | Investigation notes inventory | — |
| AR-005 | Open (Medium, blocking) | Obsolete | SR-005 DS-001; tests | Listing never writes. Test: a run that only lists has no `collaboration/` package and no `hasCollaboration`. |

- New or remaining finding IDs: none. A non-blocking wording cleanup of the leftover "stale" phrases is forwarded to implementation.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/implementation_engineer`, then an informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - the gate held during first-message admission;
  - AGY/ACP MCP exposure;
  - the REQ-007 Org change (approved);
  - unsupported mid-run catalog reuse (accepted);
  - downgrade (unsupported).
