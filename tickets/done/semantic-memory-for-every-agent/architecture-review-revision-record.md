# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: initial review of the Solution Designer's handoff (2026-11-19) | SR-001 | N/A | Fail (Requirement Gap + Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2: SR-002 resubmission (2026-11-19) | SR-002 | Fail | Pass | AR-001, AR-002 resolved |
| ARCH-REV-003 | Round 3: SR-007 resubmission (SR-003…SR-007; approved UI) (2026-11-20) | SR-003…SR-007 | Pass | Fail (Design Impact) | AR-003, AR-004, AR-005, AR-006 |
| ARCH-REV-004 | Round 4: SR-008 resubmission (consolidated) (2026-11-20) | SR-008 | Fail | Pass | AR-003…AR-006 resolved |
| ARCH-REV-005 | Round 5: SR-009 after CRR-003 CR-002 (2026-11-20) | SR-009 | Pass | Pass | none (notes N-12…N-14) |

## Revision Entries

### ARCH-REV-001 — Initial review: the gate and the removal are sound; the view needs two boundaries closed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/design-review-report.md`
- Review round and trigger: round 1; `handoff-architecture-review.md` (Large / High)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A
- Relevant solution revision IDs: SR-001
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline.
  - The behavior basis is confirmed.
  - DS-001 (the unconditional gate across all five runtime owners), the field removal and `Directly Usable — No Migration` pass.
  - The view lists internal agents' folders against the internal-agent rule (AR-001).
  - Its content step follows symbolic links through the node-file reader (AR-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Requirement Gap, Medium), AR-002 (Design Impact, Medium)
- Material classification changes: none. `task_size=Large` and `architectural_risk=High` are confirmed.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: N-1 (listing cost), N-2 (stale comment), N-3 (folder access in every Claude and Codex run, intended)

### ARCH-REV-002 — SR-002 closes the view's two boundaries; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-002 resubmission (`handoff-architecture-review.md`, SR-002 section)
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-001); AR-001, AR-002
- Relevant solution revision IDs: SR-002
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed:
  - DEC-008, REQ-006 and AC-008: `listFolders()` hides internal agents through `hiddenDefinitionIds()`; opening by id stays exempt.
  - DEC-009, REQ-007 and AC-006: link rows are listed from `lstat`, never entered or opened, and only `kind: "file"` calls `loadNodeFile`.
  - N-2 is in Guidance.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap, Medium) | Resolved | SR-002; DEC-008; REQ-006; AC-008; design-spec Ownership Map `listFolders()` | Applies the existing autobyteus-308 rule (`internal-agent-visibility.ts:9-14`) the same way `agent-memory-explorer-service.ts:82, 90, 132-144` does |
| AR-002 | Open (Design Impact, Medium) | Resolved | SR-002; DEC-009; REQ-007; AC-006; design-spec DS-002 narrative, data model, example, Guidance | Link rows never reach `NodeFileReader.open` (which follows `realpath`, `node-file-reader.ts:52-58`); AC-006 asserts no node-file request |

- New or remaining finding IDs: none. Implementation note N-4: skip non-regular, non-link entries.
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: N-1 (listing cost at scale)

### ARCH-REV-003 — SR-007: the core and global folder hold; the view, owner queries and document need work

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/design-review-report.md`
- Review round and trigger: round 3; the Solution Designer's SR-007 resubmission (`handoff-architecture-review.md`, SR-007 section), with the Product-owned UI/UX spec (Approved 2026-11-20)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review.md`; N/A
- Relevant solution revision IDs: SR-003…SR-007
- Prior authoritative decision: `Pass` (ARCH-REV-002, on SR-002)
- Current authoritative decision: `Fail`
- What changed:
  - The SR-002 core still holds: the gate, the field removal, tolerant readers, the internal-agent rule and links not opened.
  - SR-006 (the global folder through the same `prepareForRun`, the DEC-013 section, Claude/Codex roots) passes.
  - INV-12's claim that discovery works for imported sources holds (lazy readiness rebuild).
  - New findings:
    - AR-003: the document is not consolidated; the requirements doc has stale items.
    - AR-004: an opened semantic workspace is listed through `listVisibleWorkspaces` and can be provisioned.
    - AR-005: the watcher follows links; search behavior unstated; wrong upload citation; delegated inventory.
    - AR-006: whole-node discovery per request, not justified under DESIGN.md rule 3.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved (carried: REQ-006 hides internal agents in the Agents cards) | SR-007 REQ-006; SR-007 table `listAgentsWithMemory` | AC-008's wording is stale (part of AR-003) |
| AR-002 | Resolved | Resolved (carried into SR-004 as `WORKSPACE_LINK_NOT_OPENED` and link rows) | SR-004 §3 | Extended by AR-005 (the watcher) |

- New or remaining finding IDs: AR-003, AR-004, AR-005, AR-006 (all Medium)
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: N-5 (concurrent writes to the global folder, accepted), N-6, N-7

### ARCH-REV-004 — SR-008 consolidates the design and closes the view's gaps; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/design-review-report.md`
- Review round and trigger: round 4; the Solution Designer's SR-008 resubmission (`handoff-architecture-review.md`, SR-008 section)
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-003); AR-003…AR-006
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed:
  - The design spec is one current design: DS-001…DS-003.
  - `AgentSemanticMemory.folderState`/`globalFolderState` replace the browser.
  - Episodes use the existing selector; `TreeNode.isSymbolicLink` is a boolean; `listAgentRunsWithMemory` is replaced; the patch survivors are listed.
  - Semantic workspaces are excluded from `listVisibleWorkspaces`, and `getOrCreateRunWorkspace` refuses runs.
  - The watcher runs with `followSymlinks: false`; search is stated; the upload citation is corrected; there is a decision for each caller.
  - Local episodes come from the catalog's read API (Principle 16 binding recorded); imported sources use one discovery per request (AC-012, escalation over 3 s).
  - Requirements: AC-008, AC-011 and AC-012; DEC-004/010/011.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003 | Open (Medium) | Resolved | SR-008 design-spec (whole); requirements AC-008, DEC-004/010/011 | No overlay remains; spines, owners, interfaces, file mapping, removal plan and sequence match the approved UI; `CatalogEntry` and `AgentWithMemorySelectorInput` exist as cited (`episodic-catalog-models.ts`, `memory-explorer-schema.ts:5, 90`) |
| AR-004 | Open (Medium) | Resolved | SR-008 Ownership Map (`WorkspaceManager`), DS-003 table, Key Tradeoffs; AC-011 | Every runtime's resolver is covered (ACP and Antigravity through `ClaudeWorkspaceResolver`, `claude-session-manager.ts:156-157`; N-10); provisioning works by root path, not id (N-11) |
| AR-005 | Open (Medium) | Resolved | SR-008 Ownership Map (file explorer), DS-003 table; AC-011 | Watcher option; `rg --files` default (`ripgrep-search-strategy.ts:85`); upload corrected (`upload-file.ts:87-120`) |
| AR-006 | Open (Medium) | Resolved | SR-008 DS-002, Key Tradeoffs, Hidden dependency; AC-012 | The catalog holds entries in memory (`episodic-catalog.ts:59`) and is created in the composition root (`build-studio-server.ts:256`); the binding's conditions hold |

- New or remaining finding IDs: none. Implementation notes N-8 (filter text), N-9 (cards await the start pass), N-10 (every runtime's resolver), N-11 (provisioning by path).
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: AC-012's measurement; N-5 (concurrent global writes, accepted)

### ARCH-REV-005 — SR-009: a length-safe folder-name rule and contained preparation; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/design-review-report.md`
- Review round and trigger: round 5; the Solution Designer's SR-009 after the code reviewer's CRR-003 CR-002 (Design Impact; API/E2E RA-04, IC-01, RE-05; `evidence/API-10d-re05-launch-error.log`)
- Triggering role, report path, and finding IDs: Code Reviewer, then the Solution Designer; `code-review-report.md`; CR-002 (code review)
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: `Pass` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed:
  - DEC-016: `definitionFolderName` is the one rule: the full encoded id when ≤ 200 bytes, else a 120-byte prefix plus `#` plus 16 hex of SHA-256. It serves the semantic folder, the episodic folder and the workspace lookup, and ids that fit are unchanged.
  - DEC-015: `prepareForRun` is contained per folder and logs `SEMANTIC_MEMORY_PREPARE_FAILED`.
  - REQ-001 and REQ-010 are reworded; AC-013 and AC-014 are added.
  - The catalog store skips shortened names on read-back; the edge is accepted (MP-006 Not Reachable through a supported action).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-003…AR-006 | Resolved | Resolved (unchanged) | ARCH-REV-004 | SR-009 changes only the name rule and preparation |

- New or remaining finding IDs: none. Implementation notes N-12 (`#` in URLs), N-13 (cuts at a `%XX`), N-14 (null means "failed", not "off").
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: AC-012's measurement; N-5
