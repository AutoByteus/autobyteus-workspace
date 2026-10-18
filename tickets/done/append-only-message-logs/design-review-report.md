# Design Review Report — Append-Only Message Logs

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/append-only-message-logs/tickets/in-progress/append-only-message-logs/requirements-doc.md` (Approved, SR-004: REQ-003, AC-003 and DEC-008 refined within direction)
- Upstream Investigation Notes: `…/investigation-notes.md` (SR-003 evidence rows)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-005)
- Reviewed Design Spec: `…/design-spec.md` (SR-005, status `Ready`; delta after implementation Design Impact DI-001, `…/implementation-design-impact-di-001.md`)
- Supplemental Task Artifacts Reviewed: probes `cost.mjs`, `profile.py`, `validate-cost.mts`, `inventory.py` (unchanged; evidence only)
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004, SR-005
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: SR-005 re-review request from `/software_engineering_team/solution_designer` (implementation DI-001)
- Prior Review Round Reviewed: 3 (ARCH-REV-003, Pass)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: round 1 code reads (unchanged base `65cf41c6b4`), plus `team-run-migration-state-classifier.ts` (classification order: metadata → V1 authority files → manifest) and `task-agent-own-run-v1/released-coordinating-trees.ts` (`not_input` / `convertibleBy` roles).

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High` (unchanged; the repairs add released-migration changes, so the risk is still High).
- Independent Architecture Review required: `Yes`. No correction required.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. Requirements are at SR-004; the only change is REQ-003/AC-003 scoping sealed-file immutability to appends and rotation, plus DEC-008, a bounded startup-repair exception. This is a within-direction refinement with no product-visible change. The round-1 confirmation otherwise holds.
- Scope guardrail confirmed: Yes. Every prospective blocking finding is traceable to an approved ID: `Yes`.
- Remaining material ambiguity: none.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | ARCH-F-002 resolved |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | ARCH-F-005, ARCH-F-006 resolved |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

Unchanged from round 1: all four probes `Pass`.

## Task Design Health Assessment Verdict

Unchanged: `Pass` on all four areas.

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Owner? | Naming? | Ownership? | Off-Spine Off? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Message persist | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | History read | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | `MessageLog` local spine | Pass | Pass | N/A | Pass | Pass | Pass | Pass (`writeInitial` replaces, as today) |
| DS-004 | Readiness | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Migration | Pass | Pass | N/A | Pass | Pass | Pass | Pass (one gate rule; R-C exception matches REQ-003/DEC-008) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MessageLog` | Pass | Pass | Pass | Pass | — |
| Family stores | Pass | Pass | Pass | Pass | — |
| Frozen modules (JSON + append-only reader) | Pass | Pass | Pass | Pass | Own-run's current `writeTeam` target write is an explicit, fixture-backed exception (ARCH-F-003 resolved) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime → `MessageLog` | Pass | Pass | Pass | Pass | — |
| Released migrations → frozen modules | Pass | Pass | Pass | Pass | Older migrations no longer import from a newer migration's folder |

## Interface Boundary Verdict

| Interface | Subject? | Singular? | Identity? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `MessageLog(dir, baseName)` | Pass | Pass | Pass | Low | Pass |
| `MessageLog.writeInitial` | Pass | Pass | Pass | Low | Pass (replace; refuses only when sealed files exist; four callers checked) |
| `append` / `appendBatch` / `read` / `exists` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Gate classification | Pass | Pass | N/A | Pass | Reuses own-run's `input` / `not_input` / `convertibleBy` |
| Locator transform of lines | Pass | Pass | N/A | Pass | Reuses the `trace` line-by-line path in `transformContextFileRecordLocators` |
| Atomic creation, outcome contract, composition | Pass | Pass | N/A | Pass | Unchanged from round 1 |

## Subsystem / Capability-Area Allocation Verdict

Unchanged: `Pass` (`run-history/store`, `app-data-migrations` incl. `legacy/`, adapters/engine).

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated? | File Sound? | Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Physical log IO ×4 | Pass | Pass | Pass | Pass | `message-log.ts` |
| Released JSON shapes | Pass | Pass | Pass | Pass | Frozen JSON module |
| Released append-only reading (R-A/R-B/R-C) | Pass | Pass | Pass | Pass | One frozen reader under `legacy/released-run-package-shapes/` |

## Shared Structure / Data Model Tightness Verdict

Unchanged: `Pass` (a line is the 7-field message; no envelope or version).

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `message-log.ts`, stores, `TaskAgentMessageLogs`, `TaskAgentOwnFiles` | Pass | Pass | N/A | Pass | — |
| `released-message-logs-before-append-only.ts` | Pass | Pass | N/A | Pass | — |
| `released-message-log-files-from-append-only.ts` | Pass | Pass | N/A | Pass | — |
| `released-run-package-file-readers.ts`, `released-root-packages-before-task-agent-own-run.ts`, `context-file-record-locators.ts` (R-A..R-C) | Pass | Pass | N/A | Pass | Migration-only modules; FU-3 placement follow-up stands |
| `append-only-message-logs-v1/*` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/store/message-log.ts` | Pass | Pass | Low | Pass | — |
| `legacy/released-run-package-shapes/released-message-log-files-from-append-only.ts` | Pass | Pass | Low | Pass | ARCH-F-003 resolved |

## Removal / Decommission Completeness Verdict

Unchanged from round 1: all rows `Pass`. `create` is renamed to `writeInitial`. No new dead code.

## Legacy / Backward-Compatibility Verdict

| Area | Dual-Path Exists? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime reader | No | Pass | Pass | JSONL only |
| R-A..R-D (released readers read either released format) | No (migration-owned same-ID repairs, Guideline §7; isolated in frozen modules) | Pass | Pass | Not runtime compatibility code |

## Persisted-Data Transition Verdict

| Area | Decision | Evidence Sufficient? | Proportionate? | Migration Safety Complete? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Every message log | Migration Required | Pass | Pass | Pass | Pass | SR-005: an org log is also not ready while its folder holds a retired team authority. The marker equals flat-families' own `retiredTeamFiles` list (`agent-org-history-candidate-plan.ts:29-34`, which plans `partial-target` at lines 93-110). Every package it holds back is already rejected by current readiness: the team tree is removed last and is in `retiredOrgFiles`. While flat-families is pending, the log waits; flat-families' retry finishes the cleanup, then ours converts. Ours' discovery never touches the team JSON log left in an org folder. Inventory and repairs close MP-001. The gate is one rule: a not-ready log (tree `not_input`, unreadable or missing) or an unreadable JSON waits while any log-writing predecessor is pending. Tree-only converters are covered transitively: flat-families and locators-v1 declare tree-v2 as a prerequisite, and own-run stays non-terminal while any tree writer could still convert a `not_input` tree |

## Change / Refactor Safety Verdict

`Pass`. Step 1 now includes the frozen reader and repairs with their fixtures. Released tests keep their outcomes, and the repair fixtures run across two starts in real runner order.

## Example Adequacy Verdict

`Pass`. The fixture table covers each inventory row.

## Material Premise Validation

### `MP-001` — A log-touching released migration runs after ours on a converted run (round 1)

- Reachability: `Reachable` (unchanged witness: runner retry/prerequisite contract, AC-007).
- Round-2 consequence: addressed. Locators-v1 and summary-v1 now read the run's log in either released format (R-A) and admit it (R-B). Locators-v1 converts locators in the append-only files (R-C). Inventory rows were verified against the code:
  - The classifier reaches the V1 authority files only after metadata, and returns `INVALID` both before conversion (partial or V1-rejected) and after (partial). Classifier consumers skip `INVALID`.
  - Own-run's classifier exposes `convertibleBy` roles, so tree converters only see `not_input` trees, which ours keeps on JSON.
  - The address migration's shape is rejected by ours' strict JSON read.
- R-C's sealed-file rewrite is now an approved bounded exception (REQ-003, DEC-008).

### `MP-002` — Package-creation retry after `writeInitial` committed and the tree write failed (round 1)

- Reachability: `Reachable`. Resolved by replace semantics (ARCH-F-002). The sealed-file refusal cannot block a creation retry: rotation needs ≥ 4 MiB of appends, which require an existing package.

### `MP-003` — Duplicate id in one log at runtime (round 1)

- `Not Reachable`; unchanged. Drives no finding.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| REQ-003 "sealed files are never modified" vs R-C | The approved Must requirement and the design disagreed | ARCH-F-005 | Resolved (SR-004) |

### `MP-004` — flat-families retried after ours on a partial-target org (implementation DI-001)

- Related contract: REQ-007, AC-007; the runner's retry contract (same basis as MP-001).
- Initiating basis kind: `Contract` / `Operational`.
- Forward path:
  - Start N: flat-families renames a source root into `agent_orgs/<id>/`, then fails before cleanup (`FAILED_HISTORY`, `FAILED_TOKEN`).
  - Ours, registered last, runs in the same start. Before SR-005, the org tree read as own-run `input`, so ours would have converted the org log.
  - Start N+1: the flat-families retry reads `agent_org_communication_messages.json` strictly and fails with ENOENT on every start. Its dependents locators-v1 and summary-v1 then stay blocked.
- Evidence: the implementer reproduced this; the code paths were checked in this round.
- Reachability: `Reachable`. Addressed by the SR-005 marker; fixture F-GATE-FLAT-PARTIAL-TARGET.

## Review Decision

`Pass`. The behavior basis is confirmed, ARCH-F-001..006 are resolved, and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. All resolutions are recorded in `architecture-review-revision-record.md` (ARCH-REV-003).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- R-2: a permanently failed predecessor keeps ours non-terminal. Accepted.
- R-7: the same-ID repairs change three released migrations on pending installs. Their JSON-only behavior is unchanged and covered by their released tests.
- FU-4: the rollback limitation should reach the user explicitly.
- The implementer re-runs the inventory search at the base (R-5) and extends the inventory and fixtures if it finds more.
- DEC-008: on installs where locators-v1 is pending, a repaired sealed file can differ from the size limit by a few bytes, and Memory Sync uploads it once more. Accepted in the requirements.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001, MP-002 and MP-004 Reachable, addressed by the design; MP-003 Not Reachable, drives nothing)
- Notes: ARCH-REV-004; SR-005 (DI-001 resolved by the gate marker; no released-migration change); task_size `Large`, architectural_risk `High`. Non-blocking: design-spec's evidence row "Memory Sync … sealed files never change" (Architecture Investigation Evidence) is stale wording next to DEC-008. The implementer should read it with R-6.
