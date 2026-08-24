# Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, `design-spec.md`, and the evidence supplements remain authoritative. This record is only the durable solution-round index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial baseline after explicit user approval, 2026-08-23 | N/A | `Initial Baseline` | Design package established for architecture review |
| SR-002 | User-directed migration-convention audit and rework after SR-001 handoff, 2026-08-23 | MIG-CONV-001, MIG-CONV-002, MIG-CONV-003 | `Design Impact` | Migration design simplified and requirements refined for renewed architecture review |
| SR-003 | User clarification and architecture-reviewer consistency notice after SR-002, 2026-08-23 | MIG-RETRY-001, MIG-STATUS-001, PKG-CONSISTENCY-001 | `Design Impact` | Non-blocking required-on-startup `ANYTIME` migration with truthful status and existing clickable retry; stable superseding package |
| SR-004 | Architecture review `ARCH-REV-001` plus explicit user approval, 2026-08-23 | ARCH-RG-001, MP-001, MP-002 | `Requirement Gap` resolved | Preserve simple migration; explicitly accept/document Memory Sync v1 sync-visible no-delete residue; no sync production redesign |
| SR-005 | Code review `CRR-002` after API/E2E `API-REV-001`, 2026-08-23 | CR-001, MP-003, NTH-BR-001 | `Design Impact` | Add purpose-aware historical navigation/exact-focus spine for settled delegated executions; preserve live task semantics and all SR-004 migration/Memory Sync decisions |
| SR-006 | Post-round user directive recorded by API/E2E and code-review addendum, 2026-08-23 | NTH-LIVE-002A, NTH-LIVE-002B | `User-Directed Coverage Refinement` | Require independent ordinary nested communication and delegated-task live/cold scenarios; no result or production-design change |
| SR-007 | Superseding post-round user directive recorded by API/E2E and code-review addendum, 2026-08-23 | NTH-LIVE-002A, NTH-LIVE-002B, NTH-LIVE-002C | `User-Directed Coverage Refinement` | Replace SR-006's two flows with three independent real cold-restart-and-continuation flows; no result or production-design change |

## Revision Entries

### SR-001 — Topology-reflecting TeamRun memory scope and restart repair baseline

- Triggering role, report path, and round: Solution designer; initial solution round; no prior review report.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready requirements, complete investigation/reproduction evidence, and an implementation-actionable target design are aligned and ready for architecture review.
- Why this baseline or revision entry is recorded: The Docker restart defect was reproduced for existing Codex/GPT-5.6 and controlled AutoByteus/DeepSeek nested executions. Evidence proved a writer/cold-reader physical-scope mismatch introduced during the 2026-08-15 universal-delegation refactor, plus affected durable data requiring safe migration.
- Resolution: Establish one immutable topology-reflecting `TeamRunPhysicalScope` across live context and V1 index boundaries; make direct AgentRuns consume their containing context; remove duplicated ancestry derivations and the flat-current writer; relocate unambiguous complete member directories in a gated, startup-only, rerun-safe migration without runtime fallback.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-007; AC-001–AC-012.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — approved Design-ready basis.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — complete current-state/runtime/history/migration evidence and architecture read.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — initial complete target design, migration plan, ownership, file mapping, removal plan, and test guidance.
- Supplemental artifacts updated, added, or removed: Added the reproduction evidence package and three retained browser screenshots under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-evidence/`; four original user screenshots remain catalogued in the investigation notes. No intended-behavior supplement was required.
- Downstream and architecture-review impact: Architecture review should decide whether the proposed live scope owner, single index query, configured/task child propagation, planner/relocator migration boundary, startup readiness gate, and no-fallback transition are structurally ready for implementation.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: No unresolved requirement gap. Review should scrutinize task handoff/application-binding preservation, migration warning-versus-retry severity, source/target overlap safety, prerequisite ordering, and the explicit single-process volume assumption.

### SR-002 — Convention-aligned deterministic directory migration

- Triggering role, report path, and round: User direction after the initial architecture-review handoff; repository authority `autobyteus-server-ts/README.md` section `Production migration practice` and `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; solution round 2.
- Triggering finding IDs:
  - `MIG-CONV-001`: SR-001 modeled directory `fsync`, post-rename indeterminacy, and mechanical interruption states that the canonical convention treats as unsupported/speculative under a stable normal attempt.
  - `MIG-CONV-002`: SR-001 proposed a migration-specific global listener gate instead of reusing the existing startup-only runner/status/recovery contract.
  - `MIG-CONV-003`: SR-001's per-candidate detail posture was not explicit enough about aggregate counts and capped warning examples.
- Prior authoritative result: SR-001 topology-scope design plus a four-file planner/relocator migration, typed pre/post-rename outcomes, directory sync, and explicit server-runtime readiness gate.
- Current authoritative result: The live/cold topology-scope repair is unchanged. The migration is now one cohesive registered definition that performs a deterministic target-absent whole-directory rename under documented normal operating assumptions, validates the resulting current physical state, relies on the existing runner for ordinary restart retry, and emits exact counters with capped reason examples.
- Why this baseline or revision entry is recorded: The user correctly identified a repository-specific governing convention that had not been read before SR-001. Auditing the initial proposal against that authority showed the data move was over-designed relative to its reachable source/target states.
- Resolution:
  - Refined the approved requirements basis with AC-013 and the convention's one-writer/stable-attempt/normal-filesystem assumptions.
  - Removed the proposed planner/relocator folder split, directory `fsync`, post-rename-indeterminate result, global `server-runtime.ts` gate, backup/rollback protocol, and exhaustive shutdown/kernel/device/syscall coverage.
  - Kept one atomic same-filesystem rename, target/source validation, one ordinary rerun/idempotence scenario, and current-runtime no-fallback rule.
  - Classified source plus real canonical target as a bounded warning only because exact current owners independently use the canonical target and do not enumerate the preserved flat residue; missing/invalid required target remains `FAILED`.
  - Made diagnostics cardinality-bounded: authoritative numeric totals plus at most five sorted relative-path examples per reason.
- Approved behavior or requirement IDs affected: BEH-005; REQ-005, REQ-007; AC-005, AC-006, AC-008, AC-009, AC-012, AC-013. BEH-001–BEH-004 and the live scope design are preserved.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — status refined; findings, REQ-005, AC-008, AC-013, constraints, assumptions, risks, and approval state.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — convention source audit, supersession rationale, bounded-reporting/framework evidence, and reviewer notes.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — complete SR-002 migration replacement, file mapping, sequencing, compatibility rejection, risks, and guidance.
- Supplemental artifacts updated, added, or removed: No evidence supplements changed; the existing reproduction package and screenshots remain authoritative context.
- Downstream and architecture-review impact: The architecture reviewer must disregard SR-001-only migration mechanics and review the simpler SR-002 transition against the canonical migration convention. No implementation work should start from the superseded readiness-gate/planner-relocator design.
- Next recipient or routing: `/architecture_reviewer` for renewed review with the full cumulative package.
- Remaining gaps or risks: No requirement gap remains. Review should confirm that a real canonical directory is sufficient independent validation of the layout migration's current target, that flat conflict residue is inert to all normal runtime owners, and that downstream prerequisite ordering remains correct without resetting successful records.

### SR-003 — Non-blocking manual retry with truthful migration status

- Triggering role, report path, and round: User clarification after SR-002 plus architecture reviewer message dated 2026-08-23 identifying an unstable mixed SR-002/SR-003 package; solution round 3. No architecture result had been issued.
- Triggering finding IDs:
  - `MIG-RETRY-001`: The user requires a folder-move failure not to prevent application startup and requires the existing Settings Retry control to execute the migration again.
  - `MIG-STATUS-001`: The user's proposed success-with-warning label conflicts with the governing convention when the required canonical target is still missing. The convention separates capability availability from record truth: missing required current result is `FAILED`; warnings require an independently valid current target and only bounded nonfatal residue.
  - `PKG-CONSISTENCY-001`: The canonical requirements, investigation notes, and design had begun reflecting the new manual-retry choice while the revision record and one guidance line still described SR-002 `STARTUP_ONLY` / restart-only recovery.
- Prior authoritative result: SR-002's deterministic one-file rename migration with `STARTUP_ONLY`, ordinary restart retry, and no clickable manual action.
- Current authoritative result: Keep `requiredOnStartup: true` for the automatic attempt and set `executionPolicy: "ANYTIME"`. An item-level move failure is capability-scoped and does not abort unrelated application startup; the record is truthfully `FAILED` when the canonical target was not established; the current runner publishes `MANUAL_RETRY` / `canRetry: true`; and the existing Settings Retry button reruns the same idempotent migration. `SUCCEEDED_WITH_WARNINGS` remains limited to a real, independently valid canonical target plus inert bounded residue.
- Why this revision entry is recorded: Startup availability, migration result status, and public recovery action are separate contracts. The existing runner/UI already provide the exact non-blocking clickable retry requested by the user, so no framework, GraphQL, store, Settings, localization, or server-runtime change is needed. The formal revision also freezes a consistent package for review.
- Resolution:
  - Added AC-014 and aligned BEH-005, REQ-005, AC-008, AC-013, constraints, risks, and migration guidance to the non-blocking manual-retry outcome.
  - Replaced SR-002 `STARTUP_ONLY` / `RESTART_TO_RETRY` with required-on-startup `ANYTIME` / `MANUAL_RETRY`.
  - Kept move failure as `FAILED` when no valid canonical target exists; application startup continues independently.
  - Kept warning status only for source plus an independently valid canonical target where the flat residue is inert to current exact-path owners.
  - Reused the existing runner recovery classification, GraphQL mutation, client store, and Settings action unchanged.
  - Preserved migration prerequisite ordering: a failed layout attempt leaves not-yet-run dependents prerequisite-blocked; after successful retry, they remain runnable through their existing generic recovery/startup paths.
- Approved behavior or requirement IDs affected: BEH-005; REQ-005; AC-008, AC-013, AC-014. BEH-001–BEH-004, REQ-001–REQ-004, REQ-006–REQ-007, and the live scope design are preserved.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — BEH-005, REQ-005, AC-008, AC-013, new AC-014, constraints, persisted-data availability, risks, approval status, and coverage map.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — runner/API/UI evidence, convention status distinction, framework reuse, risks, and reviewer guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — SR-003 compliance check, DS-006/DS-007 retry spine, registration, result table, dependencies, file mapping, sequence, tradeoffs, risks, and implementation guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md` — this formal superseding revision.
- Supplemental artifacts updated, added, or removed: None. The existing reproduction evidence and screenshots remain current and still relevant.
- Downstream and architecture-review impact: The architecture reviewer must disregard SR-002's recovery scheduling and review only this stable SR-003 package. No implementation may use `STARTUP_ONLY`, invent success for a missing target, add a server gate, or add new frontend recovery behavior.
- Next recipient or routing: `/architecture_reviewer` for a fresh architecture result against SR-003 and the full cumulative package.
- Remaining gaps or risks: No requirement gap remains. Review should confirm the `ANYTIME` definition's existing recovery mapping, truthful final-state classification, non-blocking application availability, idempotent manual rerun, and dependent-migration prerequisite behavior.

### SR-004 — Approved Memory Sync v1 retention without migration over-engineering

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-review-report.md`; `ARCH-REV-001`; architecture review round 1; followed by explicit user approval of the solution designer's recommended disposition.
- Triggering finding IDs:
  - `ARCH-RG-001`: SR-003 called source-plus-valid-target residue inert because exact history readers ignore it, but the supported Memory Sync scanner recursively observes and exports it.
  - `MP-001`: Nodes -> Memory Sync -> Sync now can export both local physical paths in the admitted conflict state.
  - `MP-002`: A pre-upgrade flat import can remain beside the later canonical import because v1 sends replace operations but no deletes.
- Prior authoritative result: SR-003's live/cold scope, one-file deterministic migration, `ANYTIME` manual retry, and source-plus-valid-target warning based on an incomplete current-owner inventory.
- Current authoritative result: The user explicitly approved preserving the simple migration and the existing Memory Sync v1 replace-only/no-delete behavior. A real canonical target plus sync-visible flat residue remains `SUCCEEDED_WITH_WARNINGS`; application startup and Memory Sync continue; local/imported semantic readers use only the canonical V1 target; and the hub may retain both physical paths. A missing/invalid canonical target remains `FAILED` with existing manual retry.
- Why this revision entry is recorded: The reviewer correctly identified real production paths omitted from SR-003, but those paths do not require a technical repair once the product disposition is approved. The user expressly rejected over-engineering and approved documentation of the bounded v1 retention limitation instead of scanner filtering, tombstones, remote cleanup, or a migration-status sync gate.
- Resolution:
  - Added BEH-006, REQ-008, UC-006, AC-015, and AC-016 to make MP-001/MP-002 authoritative and verifiable.
  - Replaced every claim that conflict residue is physically inert with the exact distinction: Memory Sync can observe/retain it, while semantic local/imported readers remain canonical.
  - Kept the migration algorithm unchanged and simple: validate V1 identity, classify source/target, whole-directory rename only when target is absent, bounded warning when a valid target already exists, truthful failed result when no valid target can be established.
  - Added DS-008 only as an inventory of existing production behavior; it adds no new production node, API, protocol, filter, cleanup, gate, or UI.
  - Mapped proportionate coverage to the two reachable paths: both-path replace eligibility, no-delete remote retention, and canonical imported semantic selection. No mechanical-failure matrix is authorized.
  - Mapped durable documentation to the migration convention/README and Memory Sync docs so the approved limitation is explicit.
- Approved behavior or requirement IDs affected: BEH-005, new BEH-006; REQ-005, REQ-007, new REQ-008; AC-008, AC-013–AC-016. BEH-001–BEH-004, REQ-001–REQ-004, REQ-006, and the otherwise-passing architecture remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — current/desired behavior, findings, scope, requirements, ACs, persisted-data outcome, risks, coverage, and explicit approval.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — source log, production paths, current-owner inventory, files, persisted-data evidence, constraints, risks, and reviewer direction.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — SR-004 convention disposition, state table, DS-008, ownership/boundaries, subsystem/file/test mapping, sequence, tradeoffs, risks, and implementation guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md` — this formal superseding revision.
- Supplemental artifacts updated, added, or removed: None. Existing reproduction evidence remains authoritative for the original defect; `design-review-report.md` and `architecture-review-revision-record.md` are included as triggering review artifacts.
- Downstream and architecture-review impact: Review `ARCH-RG-001` as resolved by explicit user approval. The review must retain the simple migration and must not prescribe filtering, delete/tombstone propagation, remote cleanup, sync gating, or speculative mechanical recovery. It should verify the exact MP-001/MP-002 production path and the singular canonical semantic-reader result.
- Next recipient or routing: `/architecture_reviewer` for renewed review of stable SR-004 with the cumulative package and prior review artifacts.
- Remaining gaps or risks: No requirement gap remains. Accepted residual risk is bounded duplicate physical storage on a trusted Memory Sync hub under documented v1 no-delete behavior; imported semantic reads remain canonical. Any future delete propagation or cleanup is a separate product change.

### SR-005 — Historical settled-task navigation and exact focus after cold recovery

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/code-review-report.md`; `CRR-002` API/E2E failure-origin review after `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md` `API-REV-001` / `NTH-BR-001`.
- Triggering finding IDs:
  - `CR-001`: Normal workspace history cannot expose or focus a settled delegated task execution after cold recovery even though the exact backend projection is non-empty.
  - `MP-003`: The supported server/container restart plus persisted-Team/member selection independently reaches this state through normal cold task repair and the exposed workspace surface.
  - `NTH-BR-001`: The real Nested Classroom/DeepSeek/Chrome journey found zero historical task rows and an exact-focus rejection after restart.
- Prior authoritative result: SR-004 and `ARCH-REV-002` allocated Web as unchanged reuse and ended DS-004 at generic hydration. `IR-001` correctly implemented the approved backend scope/migration design, but the incomplete frontend allocation remained. `CRR-002` supersedes the prior source-review pass for this production path.
- Current authoritative result: The approved requirements remain unchanged and unambiguous. SR-005 preserves the complete SR-004 backend, simple migration, retry, and Memory Sync design, and adds one narrow frontend spine: `TeamExecutionViewState` derives `LIVE_EXECUTION` versus `HISTORICAL_INSPECTION` navigation purpose from its existing authoritative `rootActive`; `projectNavigationRows` excludes settled task subtrees only for live execution and includes them recursively for inactive historical inspection; list, focus, and focus repair consume the same purpose-correct projection.
- Why this revision entry is recorded: Real post-implementation evidence proved backend correctness but exposed a design-review gap. Cold recovery normally marks formerly active/awaiting delegated tasks `interrupted` with `settledAt`; the shared navigation selector treated that live-only lifecycle fact as a universal discoverability rule. The correction must be architecture-approved before frontend source changes because it contradicts the prior “Web reuse unchanged” design.
- Resolution:
  - Added DS-009 covering the complete user path from workspace history selection through exact cold hydration, inactive execution-view construction, historical row projection/indexing, exact AgentRun focus, and existing conversation/Activity/Event Monitor rendering.
  - Defined the ownership boundary: `TeamExecutionViewState` owns root lifecycle/navigation purpose/exact focus; `projectNavigationRows` owns pure purpose-aware row eligibility; history stores/coordinators/components remain unchanged consumers.
  - Preserved live-only semantics: active views still omit settled task Agent/task-Team subtrees, settlement still repairs live focus, `collectLiveExecutionAgents()` and snapshot/status membership remain unchanged, and no task recovery/resumption/stream behavior changes.
  - Defined historical semantics: inactive views include settled task Agents, task Teams, their members, and recursive nested task executions already in the V1 tree and hydrated context; selection is read-only inspection, not resumption.
  - Mapped the two production source files and focused regression surfaces: `teamExecutionTreeSelectors.ts`, `teamExecutionViewState.ts`, owner-level active/inactive tests, workspace row/index tests, and exact normal-open focus tests.
  - Removed the prior guidance that no frontend production change was expected. GraphQL DTOs, hydration, open coordinators, stores, components, renderers, migration, and Memory Sync production paths remain unchanged unless a concrete new contradiction is rerouted.
- Approved behavior or requirement IDs affected: BEH-001; UC-002, UC-003; REQ-002, REQ-007; AC-002, AC-012. BEH-002–BEH-006, REQ-001/REQ-003–REQ-006/REQ-008, AC-001/AC-003–AC-011/AC-013–AC-016, and the approved Memory Sync disposition are preserved. Requirements approval remains current because no intended product behavior was added.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — evidence/inventory and approval note only; intended behavior unchanged.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — CRR-002/API/E2E evidence, full frontend production path, owners, constraints, risks, and reviewer guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — current-state correction, DS-009, ownership/boundaries/interfaces/subsystems/files/tests/sequence/risks/guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md` — this superseding revision.
- Supplemental artifacts updated, added, or removed: Added the already-produced `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-evidence/real-classroom/cold-task-browser-failure-analysis.md` to the evidence inventory. Its linked browser/API/byte/log artifacts remain relevant cumulative evidence. No intended-behavior supplement was added.
- Downstream and architecture-review impact: Architecture review must review SR-005 as a Design Impact delta over the otherwise-preserved SR-004/`ARCH-REV-002` architecture. On Pass, implementation must add the bounded two-file frontend correction and focused tests, then return through code review and full API/E2E. The durable API/E2E server-test edits still require proportional review after a future API/E2E Pass. Delivery remains blocked.
- Next recipient or routing: `/architecture_reviewer` with the complete cumulative package, including prior architecture, implementation, code-review, API/E2E, and failure-evidence artifacts.
- Remaining gaps or risks: Configured nested browser AC-001 remains unproven and must run with the repaired task-Team Chrome journey. The implementation must include entire settled task-Team subtrees recursively, keep active settlement exclusion/focus repair, and avoid a second stored history flag or any change to task lifecycle/stream membership. No migration or Memory Sync rework is authorized by this finding.

### SR-006 — Independent ordinary communication and delegated-task live coverage

- Triggering role, report path, and round: Post-round explicit user directive recorded by `api_e2e_engineer` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-coverage-investigation.md` (“Next-Round User-Mandated Live Communication Coverage”) and `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md` (Evidence / Notes), then delivered as a `code_reviewer` addendum after `CRR-002`.
- Triggering finding/scenario IDs:
  - `NTH-LIVE-002A`: Ordinary Teacher `send_message_to` to `/StudentStudyGroup` or at minimum `/StudentStudyGroup/student_one`, with recipient receipt and exact live/cold Team Communication evidence. `delegate_task` cannot substitute.
  - `NTH-LIVE-002B`: Separate Teacher `delegate_task` to `/StudentStudyGroup`, preserving task lifecycle and cold historical task-member navigation. `send_message_to` cannot substitute.
- Prior authoritative result: SR-005 resolved `CR-001` structurally and was delivered for architecture review, but its coverage map did not yet carry the later user-mandated independent communication/delegation split.
- Current authoritative result: SR-006 supersedes SR-005 as the stable architecture-review package. The SR-005 two-file frontend production correction and every SR-004 backend/migration/Memory Sync decision are unchanged. REQ-004/REQ-007 and new AC-017 now make the next-round independent live scenarios explicit and verifiable.
- Why this revision entry is recorded: The directive is future coverage authority, not retroactive evidence. Without canonical incorporation, a later combined prompt or delegated task could incorrectly stand in for ordinary nested communication, leaving exact routing/receipt/Team Communication persistence unproven.
- Resolution:
  - Extended BEH-004 and DS-005 from a cold query-only control to the complete ordinary Teacher `send_message_to` path: exact nested routing/receipt, root-scoped live message, restart, and exact cold Team Communication projection.
  - Added AC-017 and a dedicated design Coverage Scenario Map for `NTH-LIVE-002A/B`, configured nested AC-001, and preserved controls.
  - Required separate root TeamRun IDs, separate prompts, disjoint markers, exact tool-call evidence, and independently keyed live/cold artifacts. One correctly configured restart may cover both roots without merging evidence.
  - For A, require exact sender/recipient/content/order/timestamp/reference assertions and recipient receipt; no task record can substitute. For B, require delegation/task-Team lifecycle plus exact post-restart settled task-member selection/render; ordinary messages cannot substitute.
  - Mapped the user-authorized fixture-only boundary under `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-teams/nested-classroom-test`: Teacher/team instructions and fixture-owned handoff rules may be clarified while all agents remain independently addressable. Production routing/delegation behavior cannot change merely for test accommodation.
  - Recorded that any durable fixture/coverage edit returns through code review after API/E2E under the team artifact rule.
- Approved behavior or requirement IDs affected: BEH-004; REQ-004, REQ-007; AC-004, AC-012, new AC-017. BEH-001–BEH-003/BEH-005–BEH-006, the SR-005 Design Impact resolution, and all migration/Memory Sync behavior remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — BEH-004, investigation finding, supplement inventory, design-health alignment, UC-005/out-of-scope, REQ-004/REQ-007, AC-017, constraints, scenario mapping, and approval status.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — user directive, fixture boundary/source read, behavior/evidence/owner map, constraints, risks, and reviewer guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — intended change, BEH-004/DS-005, interfaces/owners/files, Coverage Scenario Map, sequence, risks, and implementation/API-E2E guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md` — this superseding revision.
- Supplemental artifacts updated, added, or removed: Added the existing `api-e2e-coverage-investigation.md` as an explicitly user-approved intended-coverage supplement. No new production artifact was added.
- Downstream and architecture-review impact: Architecture review should disregard SR-005 as a complete handoff basis and review stable SR-006. The structural frontend decision is unchanged; verify only that the expanded DS-005/coverage map preserves owner separation and does not authorize production test accommodation. On Pass, implementation proceeds with the SR-005 frontend delta; API/E2E later owns A/B execution and any fixture changes, followed by code review when durable repository files change.
- Next recipient or routing: `/architecture_reviewer` with the full cumulative package and code-review addendum context.
- Remaining gaps or risks: Real-provider tool choice may require clearer dedicated-fixture instructions; tool traces must still prove the mandated tool. Configured nested AC-001 remains independently required. `API-REV-001` stays `Fail` and `CRR-002` stays Design Impact; neither is retroactively changed by this future coverage directive.

### SR-007 — Three independent real cold-restart and continuation flows

- Triggering role, report path, and round: Superseding explicit user directive recorded by `api_e2e_engineer` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-coverage-investigation.md` lines 204–217 and `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/api-e2e-execution-coverage-report.md` Evidence / Notes, then delivered by `code_reviewer` as a superseding addendum after `CRR-002`.
- Triggering finding/scenario IDs:
  - `NTH-LIVE-002A`: Teacher ordinary `send_message_to` specifically to `/StudentStudyGroup`; direct-member messaging and delegation cannot substitute.
  - `NTH-LIVE-002B`: Separate Teacher ordinary `send_message_to` directly to `/StudentStudyGroup/student_one`; team-address messaging and delegation cannot substitute.
  - `NTH-LIVE-002C`: Third Teacher `delegate_task` to `/StudentStudyGroup`; neither message route can substitute.
- Prior authoritative result: SR-006 carried an earlier two-flow note that allowed either nested team or direct-member messaging as A and assigned delegation to B. The user's superseding directive makes both message routes separately mandatory, renumbers delegation to C, and adds cold-restart continuation to every flow.
- Current authoritative result: SR-007 supersedes SR-006 as the stable architecture-review package. The SR-005 two-file frontend production correction, SR-004 backend/migration/Memory Sync architecture, `API-REV-001`, and `CRR-002` are unchanged.
- Why this revision entry is recorded: The final directive is intended-coverage authority. Keeping the prior map would wrongly allow one ordinary-message route to stand for the other and would prove only retained history, not that each supported route/tool remains usable after restart.
- Resolution:
  - Refined BEH-004, REQ-004/REQ-007, and AC-017 so A, B, and C have separate root TeamRun IDs, prompts, route/tool calls, and disjoint pre/post-restart markers.
  - Required every flow to stop and cold-restart the real server, reload its exact relevant history, and then execute a new supported interaction through the same route/tool.
  - For A and B, required exact Team Communication sender, recipient, content, order, timestamp, and reference evidence before and after restart, plus exact appended post-restart interaction evidence.
  - For C, retained task-Team creation/execution/submission/review/task-record and exact historical member navigation/render assertions, then required a new post-restart delegated task. The settled/interrupted historical task remains read-only and is never resumed or mutated.
  - Preserved the user-authorized fixture boundary: Teacher/agent instructions and fixture-owned handoff rules may be updated freely while every agent remains independently addressable; production behavior cannot change merely for test accommodation.
- Approved behavior or requirement IDs affected: BEH-004; REQ-004, REQ-007; AC-004, AC-012, AC-017. BEH-001–BEH-003/BEH-005–BEH-006, the SR-005 Design Impact resolution, and all migration/Memory Sync behavior remain unchanged.
- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/requirements.md` — BEH-004, finding/supplement inventory, UC-005, REQ-004/REQ-007, AC-017, constraints, scenario mapping, and approval status.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/investigation-notes.md` — stable status, supplement/source log, BEH-004 path, design-health evidence, constraints, risks, and reviewer guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/design-spec.md` — intended change, BEH-004/DS-005, interfaces/owners/files, superseding Coverage Scenario Map, examples/rejection log, sequence, and API/E2E guidance.
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/nested-team-history-restart-hydration/solution-revision-record.md` — this superseding revision.
- Supplemental artifacts updated, added, or removed: The existing user-approved `api-e2e-coverage-investigation.md` was updated downstream with its final three-flow authority; no new supplement or production artifact was added.
- Downstream and architecture-review impact: Architecture review should disregard SR-006 as a complete handoff basis and review stable SR-007. Production architecture is unchanged; verify that the three-flow map preserves route/lifecycle ownership, treats continuation as existing supported behavior rather than settled-task resumption, and forbids production test accommodation. On Pass, implementation proceeds with the SR-005 two-file frontend delta; API/E2E owns A/B/C execution and fixture edits, followed by code review when durable repository files change.
- Next recipient or routing: `/architecture_reviewer` with the full cumulative package and superseding code-review addendum context.
- Remaining gaps or risks: Real-provider route/tool choice and post-restart continuation may require stronger fixture instructions, but evidence must prove the actual route/tool. A failed continuation is routed to its real production owner rather than hidden by fixture or production accommodations. Configured nested AC-001 remains independently required. `API-REV-001` stays `Fail` and `CRR-002` stays Design Impact.
