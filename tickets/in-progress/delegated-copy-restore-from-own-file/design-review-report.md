# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/delegated-copy-restore-from-own-file/requirements-doc.md` (Approved; SR-001, SR-002 wording; SR-003 adds REQ-012, AC-011, DEC-010, approved by the user; SR-004 makes AC-007 explicit for team copies; SR-005..SR-007 leave requirements untouched)
- Upstream Investigation Notes: `tickets/in-progress/delegated-copy-restore-from-own-file/investigation-notes.md` (incl. "Review Evidence (ARCH-REV-001)")
- Upstream Solution Revision Record: `tickets/in-progress/delegated-copy-restore-from-own-file/solution-revision-record.md` (SR-001..SR-007)
- Reviewed Design Spec: `tickets/in-progress/delegated-copy-restore-from-own-file/design-spec.md` (SR-007, status `Ready`; D-8 added for DI-001; §2 checklist and shape inventory added in SR-006, mirrored rows corrected in SR-007)
- Supplemental Task Artifacts Reviewed: `implementation-design-impact-DI-001.md` (implementation escalation, input to SR-005)
- Relevant Solution Revision IDs: SR-001..SR-007
- Architecture Review Revision Record: `tickets/in-progress/delegated-copy-restore-from-own-file/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-006`
- Current Review Round: 6
- Trigger: SR-007 re-review from `/software_engineering_team/solution_designer` (AR-006 correction: the mirrored-copy rows and checklist item 8)
- Prior Review Round Reviewed: 5 (`ARCH-REV-005`, Fail)
- Latest Authoritative Round: 6
- Current-State Evidence Basis: as in round 1, plus:
  - `collaborator-entry-builder.ts:31-52` and `collaborator-launch-resolver.ts:105-126` (how catalog members record launch and launch source);
  - `launch-configuration-source.ts`;
  - the released 10-17 migration tests: `tests/unit/app-data-migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.test.ts:105-124,200-215` and `tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged. SR-003 widens the persisted-shape change to the members of all 82 team copies and to the shared member DTO in both contracts.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: as in round 1, plus REQ-012 (user decision DEC-010):
  - every team-copy member records its complete launch and an explicit `followsTeam`;
  - restore never borrows the team's launch for a member;
  - existing copies keep each member's settings and follower set.
- Relevant existing behavior and evidence confirmed:
  - **Catalog members:** a member records `launchConfiguration` only when it runs on its own default (`collaborator-launch-resolver.ts:123`).
  - **A member whose own default was skipped:** it records **no** launch but **does** record a `launchSource` (`{origin: <team origin>, fallbacks: [own.fallback]}`, `collaborator-launch-resolver.ts:125`). Today `effectiveMemberLaunchSource` returns `member.launchSource ?? team.defaultLaunchSource`, so that member shows its own skipped-default note.
- Scope guardrail confirmed: yes. Out of Scope is narrowed: catalog copies' start/restore is unchanged, but their recorded member shape changes (REQ-012).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain open). Round-2 findings and the authority each protected:
  - AR-003 → REQ-007 ("recorded launch provenance"), REQ-012;
  - AR-004 → REQ-008, AC-007;
  - AR-005 → AC-009, REQ-010.
- Remaining material ambiguity: none in the basis.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass (AR-001 resolved) | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | User | Pass (AR-001, AR-002, AR-003 resolved) | Pass | Pass | Confirmed | — |
| BEH-008 | Operational | Pass (AR-004, AR-005 resolved) | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged | — |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | D-5 widened by the user's choice; F-1 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-5, M2, M4, Removal Plan, file mapping | — |

## Spine Inventory Verdict

Unchanged from round 1: DS-001..DS-005 all `Pass`. SR-003 changes the payload on DS-001, DS-002 and DS-004, not their shape.

## Boundary Encapsulation Verdict

Unchanged: `Pass`. The follower fact now lives in the record (`member.followsTeam`). No reader infers it.

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime → migration/legacy | Pass | Pass | Pass | Pass | — |
| D-8: the four released migrations (`20260731` ×2, `20260926`, `20260905`) reach current indexes and validators through `asSourceIndependentIndexInput` | Pass | Pass | Pass | Pass | Verified in the worktree: the constructors of `TeamExecutionIndex`, `AgentOrgExecutionIndex` and `StandaloneRootExecutionIndex` (`visitRoot` / `visitTask` / `addAgent` / `addTeam`) and every method called at the 4 call sites never read a copy's `source`. Neither do the current `validateTeamRunStatePackage` / `validateAgentOrgStatePackage` (constructor + `requireAgent`) or `projectAgentOrgRunHistoryRow`. The only `source` read is `instanceCoordinatorAddress`, reached only through `memberOfInstance`, which no call site uses. The bridge is confined to the legacy folder; option B (freezing about 914 lines) would be disproportionate under guideline §7 and §9 |
| Repointed 10-17 migration | Pass | Pass | Pass | Pass | Runtime `readBack` only requires a readable tree, so L5 unavailability is tolerated. Its **tests** are a separate matter: AR-005 |
| Web → task DTO `source` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `DelegationPlacement.source` (required) | Pass | Pass | Pass | Low | Pass |
| `configuredPlacementSource(node, treeHandoffs)` (members: complete launch + `followsTeam` by the configured rule) | Pass | Pass | Pass | Low | Pass |
| Team-copy member (`TaskTeamExecutionSourceMember`, `TaskAgentTeamMemberNode`, member DTOs): `launchConfiguration` and `followsTeam` required | Pass | Pass | Pass | Low | Pass |
| `effectiveMemberLaunchSource` (unchanged: `member.launchSource ?? team.defaultLaunchSource`) | Pass | Pass | Pass | Low | Pass (AR-003 resolved) |
| `locatedExecutionSource`; web `teamAgentSourceAt`; stream DTO `source` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Unchanged: `Pass`.

## Subsystem / Capability-Area Allocation Verdict

Unchanged: `Pass`. SR-003 adds the catalog snapshot builders (`collaborator-entry-builder`, `collaborator-admission`, `launch-configuration-notes`) inside the same area.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured → snapshot rule (runtime vs migration) | Pass | Pass | Pass | Pass | Both now state the 5-key projection (AR-002 resolved) |
| Released own-file shape | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TaskAgentExecution.source` / `TaskTeamExecution.source` | Pass | Pass | Pass | N/A | Pass | — |
| `TaskAgentRunMetadata` | Pass | Pass | Pass | N/A | Pass | — |
| `TaskTeamExecutionSource.handoffs` | Pass | Pass | Pass | N/A | Pass | — |
| Team-copy member `launchConfiguration` + `followsTeam` | Pass | Pass | Pass | Pass | Pass | AR-001 resolved: presence no longer carries meaning |
| Team-copy member `launchSource` | Pass | Pass | Pass | N/A | Pass | Spec lines 262 and 377: today's presence rule, independent of `followsTeam`; display provenance only (AR-003 resolved) |

## File Responsibility Mapping Verdict

`Pass`. The SR-003 additions are mapped: the member-shape files, the catalog snapshot builders and `launch-configuration-notes`.

## Subsystem / Folder / File Placement Verdict

Unchanged: `Pass`.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `origin`, configured branches, `resolvePlace`/`handoffs` shape members | Pass | Pass | Pass | Pass | — |
| 3 task-source resolvers, `readTaskSource` port | Pass | Pass | Pass | Pass | — |
| `configuredTeamFollowerAddresses`, `memberFollowsTeam({kind:"configured"})` | Pass | Pass | Pass | Pass | Replaced by `member.followsTeam` (spec line 261; AR-004 resolved) |
| `effectiveMemberLaunchConfiguration`, presence-based recorded rule, `recordedFollowerAddresses`, contract and web member helpers | Pass | Pass | Pass | Pass | — |
| Configured-first view sites (server + web) | Pass | Pass | Pass | Pass | R-1 stays as F-1 |

## Legacy / Backward-Compatibility Verdict

`Pass`. No fallback or dual path. Old member shapes are read only by migration-owned code.

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent copy own files | Migration Required | Pass | Pass | Pass | Pass | — |
| Team copy own trees (M2 catalog member completion, M4) | Migration Required | Pass | Pass | Pass | Pass | AR-002 resolved: M4 projects to 5 keys, the evidence was computed on 5 keys, and `skillAccessMode` fixtures are added. M2 preserves restore (member own ?? default) and followers (had no own launch). `launchSource` is unchanged |
| §2 checklist and shape inventory (SR-006, SR-007) | — | Pass | Pass | Pass | Pass | The checklist and the non-mirrored rows are coherent (round 5). The mirrored rows are split: 9 catalog agent copies readable (F-X3); 2 configured-place agent copies (F-X3b) and 11 catalog team copies (F-X3c) not shown until `docker-node-1` updates. 9 + 2 + 11 = 22. Item 8 now says 13 of 22 are hidden, with 175 mirrored run folders unaffected. F-X3c requires byte-identity, reporting the copy unavailable, and continued listing of the source's other runs (rule 7). The coverage decision (S26 and the user's rule; user informed) is recorded in SR-007 (AR-006 resolved) |
| Admission after migration | — | Pass | Pass | Pass | Pass | Spec lines 197-200: a preserved team copy is rejected by the current validator, reported unavailable and not loaded, with the file untouched. AC-007 covers agent and team copies (AR-004 resolved) |
| Released 10-17 migration evidence | — | Pass | Pass | Pass | Pass | Change Sequence step 1 (spec lines 464-468) and Guidance line 527 give the 4-part plan (AR-005 resolved) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Freeze → types → snapshot at birth → one path → views → migration → docs → sweep | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

`Pass`. The D-5 example was updated to the explicit-member shape.

## Material Premise Validation

### `MP-001` — A configured team member keeps the team's model but has its own auto-approve

Round 1 record stands (`Reachable`). It is now handled by D-5 and REQ-012: `followsTeam` is set by today's configured rule.

### `MP-002` — Slot launch objects carry `skillAccessMode`

Round 1 record stands (`Reachable`). The investigation now confirms `skillAccessMode: "PRELOADED_ONLY"` on both sides in the 2 team copies. It is handled by the M4 projection.

### `MP-003` — A catalog team member whose own agent default is skipped records its own `launchSource` and follows the team

- Related requirement: REQ-007 (preserve "recorded launch provenance"), REQ-012
- Relevant behavior ID(s): BEH-007, BEH-004
- Initiating basis kind: `System`
- Trigger: a coordinating agent delegates to a catalog team whose member's own agent default names a runtime or model that is unavailable, or settings that are invalid (`LaunchConfigurationFallbackReason`).
- Support evidence: `collaborator-launch-resolver.ts:125`: `own ? { ...layout, launchSource: source(teamLevel.source.origin, [own.fallback]) } : layout`. There is no `launchConfiguration`, so the member follows the team.
- Forward path: catalog delegation → the plan member has its own `launchSource` with the skipped fallback → the own tree records it → today `effectiveMemberLaunchSource` returns the member's source → the delegated launch rows show the skipped-default note.
- Consequence: if the target derives a follower's provenance from `followsTeam` (spec lines 262 and 377), the member's own fallback note is replaced by the team's, and recorded provenance is no longer shown as recorded.
- Reachability: `Reachable`
- Review consequence: AR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None.


## Review Decision

`Pass`. AR-006 is resolved. Every prior finding (AR-001..AR-006) is resolved in the current canonical artifacts, and DI-001 is resolved by D-8. No in-scope machinery depends on an unsupported premise. The design, including the F-* migration test plan, is ready for implementation.

## Findings

None open. Resolution of the prior findings is recorded in `architecture-review-revision-record.md` (ARCH-REV-002..ARCH-REV-006).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- R-1: `configuredPlacement` stays populated for copies, so memory targets and skill improvement still read the slot. Tracked as follow-up F-1.
- R-2: the D-7 display-name rule must give the same result as the old rule, including for `/` and non-task rows. Cover this in the AC-004 web tests.
- R-4: M0 reads non-copy `run_metadata.json` files to detect `taskAgent`; negligible cost, recorded in checklist item 7.
- R-5: M2 rewrites the members of all 80 catalog team copies. The delivery check should include one catalog team copy with a mixed follower set.
- R-6 (bookkeeping): the requirements header still reads SR-003.
- R-7 (D-8): complete the bridge's method list with `listChildAgents` and the index constructors, and keep a source-less fixture in one of the four suites.
- R-8: 13 mirrored copies from `docker-node-1` are not shown until that node runs this build and syncs. The user has been informed (SR-007). The delivery verification should mention this so the user is not surprised.
- RSK-001: a missed configured-first site. Mitigated by the step 8 grep sweep and the per-root AC-004 tests.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-006`; SR-001..SR-007. Classification Large / High is preserved. Next: `/software_engineering_team/implementation_engineer`. Implementation continues. The F-A1..F-X3c fixture list in the design spec is the migration test plan.
