# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/remove-skill-access-mode/requirements-doc.md` (Approved; unchanged in SR-004)
- Upstream Investigation Notes: `tickets/in-progress/remove-skill-access-mode/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/remove-skill-access-mode/solution-revision-record.md`
- Reviewed Design Spec: `tickets/in-progress/remove-skill-access-mode/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: `implementation-design-impact-DI-001.md` (triggering downstream evidence); `solution-handoff.md` read as routing context
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004, SR-005
- Architecture Review Revision Record: `tickets/in-progress/remove-skill-access-mode/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: revised package SR-005 from `/solution_designer` after implementation `DI-001`
- Prior Review Round Reviewed: 2 (`ARCH-REV-002`, Pass on SR-004)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode` @ `57df63f07` (source read directly; nothing executed). Round 2 re-read the revised `design-spec.md`, `investigation-notes.md` (AF-003, AF-005) and `solution-revision-record.md` (SR-004); source unchanged since round 1. Round 3 additionally read `agent-team-execution/domain/team-run-config.ts`, `migrations/team-run-execution-tree-v1/{predecessor-team-run-planner,team-run-execution-tree-v1-builder}.ts`, `agent-org-flat-team-families-v1/agent-org-runtime-tree-target.ts`, and scanned every import of current `agent-team-execution`, `run-history`, `agent-org-execution` and `agent-collaboration` code under `app-data-migrations/`. Files read: `app-data-migration-registry.ts`, `migrations/team-run-execution-tree-v2-app-data-migration.ts`, `migrations/agent-org-flat-team-families-v1/{agent-org-history-candidate-plan,released-team-run-v2-schema}.ts`, `legacy/released-run-package-shapes/{run-execution-tree-shared-record-schemas-v2,team-run-execution-tree-v2-schema,agent-org-run-execution-tree-v1-schema}.ts` + `README.md`, `run-history/store/{run-execution-tree-shared-record-schemas,team-run-execution-tree-schema}.ts`, `agent-team-execution/domain/team-run-execution-tree.ts`, `application-run-binding-launch-service.ts`, `application-backend-sdk/src/launch-profile.ts`, `api/graphql/types/agent-run.ts`, `built-in-agents/*`, web `chatDraftStore.ts`, `docs/design/data_migration_guideline.md` (full), `tickets/done/task-delegation-resource-lifecycle/design-spec.md` (lines 780–835).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Yes — ~90 production files over 8 packages; shared-contract removals; persisted reader/writer change; released-migration repointing.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Production-file inventory reproduced by grep (server ~48, web ~25, contracts 5, autobyteus-ts 5).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: remove the run-level mode everywhere; the agent definition is the only skill authority; old stored values are ignored and new records do not write the field; Daily Assistant gains `read_file` and becomes overwrite-on-startup.
- Relevant existing behavior and evidence confirmed: `NONE` is only compared, never produced; `skillMode()` and the SDK normalizer default to `PRELOADED_ONLY`; current tree reader `requireKeys` + projection; agent metadata reader `?? null`; bootstrapper has two policies with `seedIfMissing` used once.
- Scope guardrail confirmed: Yes. "Already-applied migration logic beyond what is needed to compile" is explicitly out of scope — relevant to AR-001.
- Approved change, preserved behavior, and outside scope understood: Yes. Chat last-used model is stored separately from the agent definition (`readChatLastModel()` in `chatDraftStore.ts`), so overwrite does not touch it.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (no open findings).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Cleanup` + small `Behavior Change` | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated authority vs. `SkillService`; planner rule `flat-team-topology-planner.ts:177` guards a value that never varies | — |
| Refactor needed now / no refactor / deferred decision is explicit | Pass | "Yes — the removal itself" ; editor read-only flag deferred with user-accepted risk | — |
| Refactor decision is supported by the concrete design sections | Pass | Removal plan covers every area found by grep | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Subject Naming | Ownership | Off-Spine Stays Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `SkillService` | Pass | Pass | Pass | Pass | Sole skill authority after removal |
| `app-data-migrations/legacy` | Pass | Pass | Pass | Pass | Released launch/node types are standalone copies; import, intersection and extension of current types are forbidden |
| `BuiltInAgentBootstrapper` | Pass | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Deps Clear | Forbidden Shortcuts Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Backends → `SkillService` | Pass | Pass | Pass | Pass | |
| Released migrations → `legacy/` frozen shapes | Pass | Pass | Pass | Pass | |
| Current runtime ↛ `legacy/` | Pass | Pass | Pass | Pass | |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL run inputs/outputs (agent, team, org, run-history) | Pass | Pass | Pass | Low | Pass |
| Application SDK launch/preset contracts | Pass | Pass | Pass | Low | Pass |
| Stream DTOs (collaboration, team) | Pass | Pass | Pass | Low | Pass |
| `AgentConfig` constructor | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Area Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frozen historical shapes | Pass | Pass | Pass | Pass | One new file for the frozen literal; extends `released-run-package-shapes` |
| Built-in sync | Pass | Pass | N/A | Pass | Existing overwrite path |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts context / system-prompt | Pass | Pass | Pass | Pass | |
| server execution / team / org / collaboration / application-orchestration | Pass | Pass | Pass | Pass | |
| server run-history + streaming | Pass | Pass | Pass | Pass | |
| server app-data-migrations/legacy | Pass | Pass | Pass | Pass | Frozen validators unchanged in accept/reject behavior |
| server built-in-agents | Pass | Pass | Pass | Pass | |
| contracts packages, web | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated | File Choice Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frozen mode literal + guard (`legacy/released-skill-access-mode.ts`) | Pass | Pass | Pass | Pass | Replaces 6 enum imports |
| `ReleasedAgentLaunchConfiguration` | Pass | Pass | Pass | Pass | Standalone; defined once in `legacy/released-team-run-config.ts` |
| Released team-run config aggregate (`ReleasedTeamRunConfig`, node types, clone functions) | Pass | Pass | Pass | Pass | SR-005. One frozen copy of shape and construction checks for the V1 planner and builder |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundancy Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentLaunchConfiguration` (current) | Pass | Pass | Pass | N/A | Pass | |
| `ReleasedAgentLaunchConfiguration` | Pass | N/A | Pass | Pass | Pass | Standalone |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| NEW `legacy/released-skill-access-mode.ts` | Pass | Pass | N/A | Pass | |
| NEW `legacy/released-team-run-config.ts` | Pass | Pass | Pass | Pass | SR-005. Copied from `team-run-config.ts` @ `57df63f07` before the field is removed there |
| `migrations/team-run-execution-tree-v1/{predecessor-team-run-planner,team-run-execution-tree-v1-builder}.ts` | Pass | Pass | N/A | Pass | SR-005. Use `ReleasedTeamRunConfig`; no import of current `team-run-config.ts` |
| `legacy/released-run-package-shapes/run-execution-tree-shared-records-v2.ts` | Pass | Pass | Pass | Pass | |
| `legacy/released-run-package-shapes/run-execution-tree-shared-record-schemas-v2.ts` | Pass | Pass | N/A | Pass | Exact released key set kept; only the enum import is swapped |
| `legacy/team-run-metadata-{schema,types}.ts` | Pass | Pass | N/A | Pass | |
| `migrations/team-run-execution-tree-v2-app-data-migration.ts` | Pass | Pass | N/A | Pass | AF-004 confirmed (below) |
| run-history stores, built-in-agents files | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `app-data-migrations/legacy/` | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts enum, `AgentConfig` field, catalog branch | Pass | Pass | Pass | Pass | |
| Server fields, `NONE` branches, planner rule, `skillMode()` | Pass | N/A | Pass | Pass | Matches grep inventory |
| GraphQL enum + fields, stream DTOs, SDK contracts | Pass | N/A | Pass | Pass | |
| Web types/stores/services/query | Pass | N/A | Pass | Pass | |
| `BuiltInAgentSyncPolicy`, seed helpers | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Wrapper / Dual Path Exists | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Current readers/writers | No | Pass | Pass | Projection reader, not a compatibility branch |
| Contracts (GraphQL / SDK / DTO) | No | Pass | Pass | |
| Frozen launch-configuration validator | No | Pass | Pass | Migration-owned historical schema, isolated from runtime |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Evidence Sufficient | Choice Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent run metadata JSON | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Reader already projects; guideline §3 |
| Team / agent-org execution trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | `requireKeys` + projection: old superset loads once the key is dropped from the required list |
| Released migration `20260824` output | Frozen (keeps writing the field) | Pass | Pass | N/A | Pass | AF-004 confirmed: output is validated by the frozen strict V2 schema, so it must keep the field; §4 repoint before changing the current type |
| Released migration `20260814` (V1 tree) | Frozen aggregate copy | Pass | Pass | N/A | Pass | AF-015 confirmed: `predecessor-team-run-planner.ts:109` constructs the current `TeamRunConfig`; `cloneTeamRunNode` / `cloneAgentLaunchConfiguration` rebuild from a named key list; builder line 24 reads `node.skillAccessMode`; V1 schema requires it |
| Released classifier `20260901` | Not changed | Pass | Pass | N/A | Pass | Repair removed in SR-004 |
| Daily Assistant app-data files | Discard or Rebuild | Pass | Pass | N/A | Pass | User-approved loss (DEC-002) |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Freeze legacy first, then remove (steps 1–9) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present And Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Current reader key set | Yes | Pass | Pass | Pass | |
| Runtime backend | Yes | Pass | Pass | Pass | |
| V2 migration output typing | Yes | Pass | Pass | Pass | |
| Frozen validator | Yes | Pass | Pass | Pass | |
| Frozen type | Yes | Pass | Pass | Pass | Added in SR-004 |
| Released migration using a current class as a value | Yes | Pass | Pass | Pass | Added in SR-005 |
| Registry shape | Yes | Pass | Pass | Pass | |

## Material Premise Validation

Recorded in round 1; retained as a rejected premise.

### MP-001 — A tree written by the new runtime (no `skillAccessMode`) is classified `flat` by `20260901` once the frozen launch-configuration validator accepts the missing key (AF-005)

- Related approved requirement or established contract: REQ-003 / AC-004; guideline §3 ("released migrations keep strict classifiers"), §7 ("Correcting a released migration").
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `System`
- Independent initiating trigger: server startup runs a pending or failed `20260901_agent_org_flat_team_families_v1` on an install that already holds team trees written by the current runtime.
- Support evidence: guideline §1 permits new work while a migration is `FAILED`, so such trees can exist before a retry.
- Forward path: `AgentOrgHistoryCandidatePlanner.plan()` → `validateTeamRunExecutionTreePayload` (frozen, `team-run-execution-tree-v2-schema.ts`) → `assertExactKeys(payload, ["schemaVersion","createdAt","archivedAt","applicationBinding","handoffs","rootTeam"])` and `payload.schemaVersion !== 2` → throws. `validateLaunchConfiguration` is reached only after this check passes.
- Lifecycle preconditions and consequence: the current writer has emitted no `schemaVersion` since `a7bd0548d` (in v1.4.91; `TeamRunExecutionTreeFile` has no such member, and the tolerant reader projects it away on any re-save). Every tree that lacks `skillAccessMode` is written by that same projection writer and therefore also lacks `schemaVersion`. No product path produces a tree with `schemaVersion: 2` and without `skillAccessMode`. The same holds for Org trees (`agent-org-run-execution-tree-v1-schema.ts` requires `schemaVersion === 1`).
- Reachability of the state in which the repair changes an outcome: `Not Reachable`.
- Review consequence: the repair cannot alter any classification. Round 2: the repair was removed in SR-004; no in-scope machinery depends on this premise any longer.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None.

Round 3 note: `DI-001` is a gap that rounds 1 and 2 of this review did not catch. Those rounds checked type and enum imports of released migrations but not value use of the current `TeamRunConfig` class. Round 3 closed that by scanning every import of current runtime code under `app-data-migrations/`:

- `team-run-config.ts` is used as a value only by the V1 planner and builder (now covered by the frozen copy). All other imports of it are type-only and are repointed by the design.
- The other current readers, stores and validators imported as values (`RootRunPackageCurrentValidator`, `AgentOrgRunExecutionTreeStore.read`, `validateAgentOrgStatePackage`, `AgentOrgExecutionIndex`) belong to migrations registered after `20260901` that read current-shape data tolerantly; they neither require nor emit the field, so their behavior does not change.
- `agent-org-runtime-tree-target.ts` passes the released launch configuration through unchanged and validates with the frozen Org v1 schema.

DI-001 option 2 (carry the field around the current class) is correctly rejected: it would leave a released migration dependent on current validation, against guideline §4.

## Classification

N/A — Pass.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Implementation note, non-blocking: a verbatim copy of `TeamRunConfig` keeps the `teamBackendKind` member and `RuntimeKind`-typed fields. The design's allowed-import sentence names only the address/handoff helpers. Importing the `TeamBackendKind` and `RuntimeKind` enums is consistent with the existing frozen files (the frozen V2 shared schema already imports `RuntimeKind`; the planner already imports `TeamBackendKind`) and neither carries the removed field. If the engineer reads the sentence as excluding them, that is a wording question for the designer, not a design change.
- Out-of-scope observation (not caused by this ticket, recorded in design-spec and SR-004): since v1.4.91 a team tree written by the current runtime would be rejected by the `20260901` classifiers on the missing `schemaVersion` if that migration runs while such trees exist. Reachability was not investigated. Separate-ticket candidate for the user.
- R-3 (externally built application bundle still sending the field): confirmed as ignored by reading `application-run-binding-launch-service.ts`; the planned test remains appropriate.
- GraphQL removal is breaking for a client/server version mix. The design relies on web and server shipping together; no contrary evidence was found, and none was searched for beyond the web client.
- Daily Assistant edits, including an editor-set `defaultLaunchConfig` and any agent-local `skills/`, revert at restart (user-accepted, DEC-002).
- The import scan was by reading import statements, not by running the migrations. The design's equivalence tests (V1 planner output still carries the field and passes the V1 schema; structural rejections still reject; V2 output validates under the frozen V2 schema) are the executable proof.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Covers SR-005. The frozen aggregate copy is the proportionate response to AF-015 and follows the existing `legacy/` precedent. No new machinery depends on an unsupported premise: the affected path is the released `20260814` migration on a supported skip-version upgrade.
