# Architecture Review Revision Record — agent-tool-results-omit-empty (autobyteus-260)

The latest `design-review-report.md` is authoritative. This record is its concise history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer `Architecture Design Complete` (Large / High) | SR-006, SR-007 | N/A | Pass | AR-001, AR-002, AR-003, AR-004 (non-blocking) |
| ARCH-REV-002 | Round 2 / SR-008 delta (ARCH-REV-001 residual taken into the ticket) | SR-008 | Pass | Pass | AR-005 (new, non-blocking); AR-002 extended |
| ARCH-REV-003 | Round 3 / SR-009–SR-010 delta (`get_project_task`, worker scope, first-message Task line, no `task_ids`) | SR-009, SR-010 | Pass | Pass | AR-006, AR-007, AR-008 (new, non-blocking); AR-004 partly obsolete |

## Revision Entries

### ARCH-REV-001 — Initial review of the one result rule, the stored Task title and short/full lists

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/design-review-report.md`
- Review round and trigger: round 1; the Solution Designer's handoff of 2026-10-25 (`handoff-solution-designer.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (SR-007); no prior findings.
- Relevant solution revision IDs: SR-006 (approved requirements), SR-007 (design).
- Prior authoritative decision: N/A
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - Basis confirmed for BEH-001 to BEH-005 against base `origin/personal@fc06a7355d`. Every cited serialization point, the two MCP output schemas, the native renderer, the store reader and writer, both service update paths, the registry position, the runner's prerequisite handling and the search exact tier were opened and match the design.
  - Persisted-data decision `Migration Required` accepted: a 4-shape inventory, keys-v1 precedent, frozen classifier, atomic per-file replace, re-read validation, dispositions, release-note rollback.
  - One material premise recorded: MP-001, a keys-v1 failure holding titles back globally. Not Reachable; no machinery.
  - Four non-blocking findings recorded as implementation guidance (AR-001 to AR-004).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (update_task ack `title` / `TaskAcknowledgementView`), AR-002 (tool texts and comments stating `null` / `summary`), AR-003 (guard test rule and allow-list), AR-004 (`omitEmptyToolResultFields` return type; `task_ids: []`). All non-blocking.
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: implementation engineer (primary); Solution Designer informed.
- Remaining risks or uncertainty: ASM-001 hidden consumer; AGY/Grok copy handling; MP-001; rollback hides Tasks an older build saves; ack `{storedFilename, displayName}` vs list `{name, path}` (possible follow-up); service at the 500-line limit; `projects.md` anchor used by two web docs.

### ARCH-REV-002 — SR-008 delta: context files named `{name, path}` in acknowledgements

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's SR-008 delta (`handoff-solution-designer.md`, section "SR-008 delta").
- Triggering role, report path, and finding IDs: Solution Designer; design-spec and requirements-doc at SR-008; the ARCH-REV-001 residual on vocabulary.
- Relevant solution revision IDs: SR-008 (REQ-013, AC-011, DEC-019).
- Prior authoritative decision: `Pass` (ARCH-REV-001, SR-007)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Verified that the SR-008 delta changes nothing else in SR-007. The changed rows are the BEH-005 map row, the tightness row, the manifest file row, the ack example, and REQ-013 / AC-011 / DEC-019 with the Preserved Behavior Boundary line.
  - DEC-019 accepted as within the approved direction (DEC-004 reasoning; a second name this change would introduce). Consumers of the ack's `attachedContextFiles` are tool texts and docs only; no agent tool takes a stored filename.
  - New non-blocking AR-005: on `update_task`, the `path` for attached files must be resolved by `ProjectTaskService` (its views), with `TaskAcknowledgementView.attachedContextFiles` as `ProjectTaskContextFileView[]`. The manifest maps both forms with one `contextFileEntry` and never reaches the context store. AR-002 extended to the `create_task` text at `project-task-tool-contract.ts:16`.
  - The residual on the vocabulary pair is resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (non-blocking guidance) | Open (non-blocking guidance) | SR-008 unchanged here | `TaskAcknowledgementView` also gains the context-file view (AR-005) |
| AR-002 | Open (non-blocking guidance) | Open, extended | SR-008 | `project-task-tool-contract.ts:16` added |
| AR-003 | Open (non-blocking guidance) | Open (non-blocking guidance) | — | Unchanged by SR-008 |
| AR-004 | Open (non-blocking guidance) | Open (non-blocking guidance) | — | Unchanged by SR-008 |
| Residual: ack/list context-file names | Residual risk | Resolved | SR-008 / DEC-019 | design-spec tightness row, manifest row and ack example |

- New or remaining finding IDs: AR-005 (new), AR-001–AR-004 (remaining guidance).
- Material classification changes: none (Large / High).
- Recommended recipient: implementation engineer (primary); Solution Designer informed.
- Remaining risks or uncertainty: as in ARCH-REV-001, minus the resolved vocabulary residual.

### ARCH-REV-003 — SR-010 delta: `get_project_task`, worker read scope, first-message Task line

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tool-results-omit-empty/tickets/in-progress/agent-tool-results-omit-empty/design-review-report.md`
- Review round and trigger: round 3; the Solution Designer's SR-009/SR-010 delta (handoff section "SR-009 / SR-010 delta"). The user stopped implementation pending this review.
- Triggering role, report path, and finding IDs: Solution Designer; requirements-doc and design-spec at SR-010.
- Relevant solution revision IDs: SR-009, SR-010 (REQ-007 changed; REQ-014–REQ-017; AC-006 changed; AC-012–AC-015; DEC-020–DEC-024).
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Basis confirmed for BEH-003 (changed), BEH-005 and BEH-006 against the code. The scope follows the existing `ownerOf` rule (current Task, containment chain, fail-closed when data is damaged). Described sub-work shares the worker's Task. Exposure is opt-in. Keys resolve within the Project.
  - New non-blocking findings:
    - AR-006 (Unclear): a copy with several open Tasks reads only its current one. Approved through DEC-022 (`ownerOf`), but not stated; the Solution Designer records it, and implementation tests it.
    - AR-007: the existing-copy message is built by `buildExistingCopyTaskMessage`, not `buildTaskWorkText`. One Task-line helper serves both builders.
    - AR-008: the scope fails closed. An `ownedTaskOf` error is a refusal, never `any`; the native bound branch comes before the generic `createTool`, with no plain-class registration.
  - Material premises MP-002 (peer-node sub-work agent; reachable, low consequence, no machinery) and MP-003 (damaged resource data; reachable, AR-008) recorded.
  - AR-004's `task_ids: []` item is obsolete (DEC-021).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (guidance) | Open (guidance) | — | Unchanged by SR-010 |
| AR-002 | Open (guidance), extended | Open (guidance) | SR-010 | The list text now also drops any full-form mention; `get_project_task` text added by the design |
| AR-003 | Open (guidance) | Open (guidance) | — | The guard also covers the new manifest path |
| AR-004 | Open (guidance) | Partly obsolete | SR-010 / DEC-021 | `task_ids` removed; the return-type item remains |
| AR-005 | Open (guidance) | Open (guidance) | — | Unchanged by SR-010 |

- New or remaining finding IDs: AR-006, AR-007, AR-008 (new); AR-001–AR-005 (remaining guidance).
- Material classification changes: none (Large / High).
- Recommended recipient: implementation engineer (primary); Solution Designer informed and asked to record AR-006.
- Remaining risks or uncertainty: as before, plus MP-002 and the unscoped short reads through list/search (approved).
