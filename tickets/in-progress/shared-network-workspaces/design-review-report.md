# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, **Approved SR018**, with `approval-record-sr018.md`; SR017 hosting/access/physical-sequencing approval retained.
- Upstream Investigation Notes: `investigation-notes.md`, current SR019 inventory and preserved empirical history.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-019 (design-only correction; Approved SR018 retained).
- Reviewed Design Spec: `design-spec.md`, **Ready SR019**, commit `4c28e7865bba16218c721c60874f774837283e54`.
- Supplemental Task Artifacts Reviewed: cumulative solution handoff, IR-001 implementation handoff/revision record, IMP-D001 and source-audit.json, SR019 artifact audit, current skills module contract and referenced source/test paths, raw FR014/020 scripts; retained prior approved package/evidence at its original scope. No historical experiment rerun or retroactive product qualification.
- Relevant Solution Revision IDs: **SR-019** design; **SR-018** approved requirements, unchanged; SR-017 and earlier evidence/approval history as applicable. Triggering implementation revision **IR-001 / IMP-D001**.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-003**.
- Current Review Round: **3**, 2026-10-13.
- Trigger: Implementation IR-001 / IMP-D001 disproved the source-generation lease reuse premise; Solution Designer requests SR019 re-review.
- Prior Review Round Reviewed: ARCH-REV-002 **Pass on SR018**, plus IR-001 Design Impact. That Pass incorrectly accepted a source-lease reuse premise; this review corrects that assessment without rewriting the prior result. ARCH-REV-001 / D-001 remains deferred history. Prior-finding disposition checked before new findings.
- Latest Authoritative Round: this report / ARCH-REV-003. Prior Pass and Fail remain their actual historical results; neither supplies an automatic Pass on SR019.
- Canonical ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
- Source paths below are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
- Current-State Evidence Basis: independently traced Skills Sources confirmation -> store -> GraphQL -> source update/removal and repository cleanup, catalog lookup, workspace link-holder release and AGY linker/restore; inspected existing public-API runtime matrix and FR014/020 fixture construction. Independently rehashed all 11 IR001 audited source files: all match. Requirements and approvals018/017 are byte-identical to reviewed 5251ab48bc; `git diff --name-only d27df8ff65 HEAD` contains only ticket artifacts. Revalidated affected SR019 lifecycle/interface/file/transition/removal/validation decisions; retained unaffected ARCH-REV-001/002 evidence rather than repeating unrelated review. Applied current reviewer workflow/template/principles, repository DESIGN/TESTING and package instructions. No builds, product tests, mounts, Docker mutations, credentials or provider calls in this round.

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**.
- Classification rationale reviewed: new Go service/distribution, native Mac/Linux privilege and persistent storage configuration, selected Docker recreation, private runtime profiles and UI/launcher integration still span significant boundaries despite the narrow design-only correction; classification applies to the whole still-unimplemented package, not document volume.
- Independent Architecture Review required: **Yes**.
- Classification correction required: **None**. On Pass use the configured implementation handoff; do not send the designer a duplicate-forwarding task.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved intended behavior: working normal connected create/connect/share/use first. DEC015 explicitly defers per-action outage isolation, bounded diagnosis/cancellation and unrelated-local responsiveness during lost storage. It does not waive normal correctness, source/node/private-state preservation, ordinary consent or final physical/user verification.
- Relevant current behavior confirmed: source catalog lookup and materialized-link holders do not retain source bytes. Confirmed Sources Update/Remove independently retires bytes; AGY already uses unleased private links and warn/skip missing-source restore. Private profile/process lifetime is separate from source lifetime. Ordinary mounted-file/preview paths and their disclosed outage stalls remain unchanged; peer-stop cleanup is still normal-use work.
- Scope guardrail confirmed: UC001–007 remain with narrower UC004; no public security/SDK, Windows, offline merge, automatic remote notifications, shared private state or parked collaboration work. No live mutation/release authority inferred.
- Approved change/preservation/outside scope understood: private linked Claude/Codex/Grok profiles, current-source lookup, exact wrapper/link cleanup only; no snapshots, copy fallback, source pin/refcount/retirement queue, Update/Remove change or AGY rebuild-to-current-source. No per-turn/file probe, outage worker or cwd trampoline. Preserve ordinary local behavior and existing authorization/collision policies.
- Every prospective blocking Design Impact traceable to approved authority: **Yes; none accepted in this round**.
- Remaining material ambiguity: **None**. The current contract has no retained-source guarantee to approve or implement. Native linked-asset compatibility remains an explicit downstream test obligation, not a claimed test pass. No renewed user questionnaire required.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass — user create/connect/repeat/restart; launcher and component evidence | Pass — DS001/002 preserve chosen source and exact selected nodes | Confirmed | Normal current-build setup validation downstream |
| BEH-002 | User/System | Pass | Pass — workspace/run/restore -> native runtime; current catalog lookup, link holders and separate source cleanup | Pass — DS003 binding check, private linked profiles/exact process cleanup; unchanged AGY restore | Confirmed | Native linked discovery/assets, peer-stop/restore and source-policy regression tests |
| BEH-003 | Contract | Pass | Pass — write/sync/close -> peer open, FR026/028/039 | Pass — DS002 same backing storage, documented concurrency/locks | Confirmed | Full approved healthy mode matrix |
| BEH-004 | Operational | Pass | Pass — approved SR018 REQ007/008, AC006/007, SCN004/QR002 revision | Pass — setup/new-run known-state checks; outage limitation explicit | Confirmed | No reinstatement of deferred outage gate |
| BEH-005 | Operational | Pass | Pass — chosen source/selected Docker/disruption and preservation contract; private skill bytes remain with source owner | Pass — DS001 privilege, consent, exact recreation/rollback; profile cleanup cannot delete source bytes | Confirmed | Actual source/node preservation validation |
| BEH-006 | User/System | Pass | Pass — FileItem/content actions, HTML and artifact viewers/REST routes | Pass — DS004 ordinary healthy reads, existing errors/auth/MIME/streams retained | Confirmed | Real healthy mounted previews and local regressions |
| BEH-007 | User/Interaction | Pass | Pass — existing Nodes/guide/copy pattern | Pass — DS005 informational guide with truthful release availability | Confirmed | Current-build guide and release-link checks |

**Prior-finding check first:** D-001 is **obsolete as a blocking finding under approved DEC015**, not technically fixed. Requirements and design now agree about the residual stall and remove both the requested REST extension and the broader previously proposed outage subsystem. No partial deletion leaves the old response-time guarantee active. REQ011/AC010 retain healthy previews; REQ009/010 retain preservation/security limits. ARCH-REV-002 recorded that scope-based disposition; SR019 leaves it intact, not a fabricated implementation fix.

**IMP-D001 recheck:** Confirmed as a prior design error, now **resolved in SR019 design only**. SkillService lookup is not a lease; profile cleanup owns generated wrappers/links, and source Update/Remove retains deletion authority. The former instruction is withdrawn rather than implemented as new retention machinery. AGY keeps its existing capsule restore. REQ003/010 and preserved BEH002/005 require normal behavior/private-state preservation, not snapshots of removed skills.

Independent current evidence (worktree-relative): `SkillSourcesModal.vue:233–247` -> `skillSourcesStore.ts:122–145` -> server `api/graphql/types/skills.ts:327–332`; `skill-source-service.ts:154–219` -> `github-skill-repository.ts:63–89`; `skill-service.ts:170–173`; `workspace-skill-materializer.ts:195–267,392–399,447–489`; AGY `agy-configured-skill-linker.ts:38–109` and `agy-run-capsule.ts:85–110`. Current `docs/modules/skills.md` describes retirement/no snapshot; inspected E2E `github-skill-sources-graphql.e2e.test.ts:187–213` corroborates it, but was not run. Raw `fr-014/private-plugin-experiment.py:31` and `fr-020/codex-private-experiment.py:13` copy fixtures, so prior private-input evidence must not be called private-symlink/retention proof.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Core Artifacts? | Status/Approval Applicability Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| User scope feedback + approval018 + SR018 record | Pass | Pass | Pass | Pass | Pass | None; exact direction incorporated rather than merely referenced |
| Current handoff/investigation and SR019 artifact audit | Pass | Pass | Pass | Pass | Pass | Rehashed source/basis independently; authoring audit is not product validation |
| IR001 handoff/revision/IMP-D001/source audit | Pass | Pass | Pass | Pass | Pass | Accurate triggering prior-basis result, not implemented code; correction independently verified |
| Prior review/revision history | Pass | Pass | Pass | Pass | Pass | Current SR019 result supersedes prior basis; wrong source-lease premise explicitly corrected |
| Selection/native-folder/backend/private-runtime/readiness reports and raw ledger | Pass | Pass | Pass | Pass | Pass | Retain failures and single-host/prior-build limits; copied FR014/020 fixtures do not prove private-link discovery |
| Historical approvals/intake/UI-reference inventory | Pass | Pass | Pass | Pass | Pass | Do not inherit superseded blockers or Windows scope |

Implementation artifacts exist as **IR-001 Design Impact / no production change** and are active review inputs. Code-review/API-E2E/delivery artifacts remain **N/A — not yet produced**; external Product-owned spec **N/A — not requested**. No downstream result is fabricated.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for current posture | Pass | Larger Requirement; SR019 corrects ownership reuse under unchanged SR018 scope | None |
| Root cause explicit/evidence-backed | Pass | FR011 peer-stop plus confirmed IMP-D001 false source-lease assumption; other prior roots unchanged | None |
| Refactor/defer decision explicit | Pass | Narrow binding/private-linked-profile/selected-node changes; no new source retention owner | None |
| Decision reflected in concrete design | Pass | Profile vs source lifetimes and unchanged AGY policy reflected across interface/file/transition/removal/validation maps | None |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Domain Naming Clear? | Ownership Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | Command -> plan/consent -> apply -> OS service -> verify -> usable path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Native tool -> mounted client -> NFS/source -> peer reopen | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | New-run/restore -> binding check -> private skills -> native runtime/tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | Existing UI/tool -> explorer or content/static/artifact route -> OS IO -> result/stream -> UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS005 | Nodes guide -> descriptor -> display/copy -> terminal -> DS001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Normal supervisor reconciliation, selected-node apply/rollback and exact runtime profile acquire/close/release are bounded local lifecycles explained under their owners. Independent confirmed Sources Update -> publish -> repository cleanup and Remove -> retire -> repository cleanup remain existing, preserved paths off DS003, not profile cleanup. Their forward evidence is recorded above and in MP-003/004. Existing watcher/runtime streams and HTTP returns remain explicit. No new outage dispatcher/worker spine is required after DEC015.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Entry Clear? | Internals Stay Internal? | Caller Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SetupService/platform/backend | Pass | Pass | Pass | Pass | No renderer admin, shell-evaluated metadata or user-writable root job |
| SharedWorkspaceBinding.checkForRun | Pass | Pass | Pass | Pass | New-run/restore only, no competing per-action authority |
| Existing explorer/REST/core/PTY | Pass | Pass | Pass | Pass | Separate healthy consumers explicitly inventoried; no nonexistent universal IO owner to bypass |
| RuntimeSkillProfile/existing process leases | Pass | Pass | Pass | Pass | Exact process owns profile; SkillService selects current source, independent source owner deletes bytes |
| DockerNodeAttachment | Pass | Pass | Pass | Pass | Exact selected recreation, no general start_node shortcut |
| Guide | Pass | Pass | Pass | Pass | Display/clipboard only |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Go service -> owned OS/backend/Docker adapters | Pass | Pass | Pass | Pass | No app data plane or runtime ownership |
| Server binding -> local descriptor/OS observation | Pass | Pass | Pass | Pass | No startup audit, mount administration or core-to-server import |
| Runtime preparation -> current catalog lookup -> private profile -> exact existing process | Pass | Pass | Pass | Pass | No source release token/callback, retention registry, copying fallback or global Codex root mutation |
| Healthy content UI -> current REST/explorer reader | Pass | Pass | Pass | Pass | Preservation, not a required outage-boundary bypass |
| Scoped Git environment -> runtime/terminal child | Pass | Pass | Pass | Pass | No global Git trust/parent env mutation; preserve existing entries |

## Interface Boundary Verdict

| Interface / API | Subject Clear? | Singular Responsibility? | Identity Shape Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| SetupService.plan/apply | Pass | Pass | Pass | Low | Pass |
| SharedWorkspaceBinding.checkForRun(expected path) | Pass | Pass | Pass | Low | Pass |
| Existing content/static/run-content APIs | Pass | Pass | Pass | Low | Pass |
| RuntimeSkillProfile.acquire / exposure (profile identity only) | Pass | Pass | Pass | Low | Pass |
| SkillService current source lookup / independent SkillSourceService Update/Remove | Pass | Pass | Pass | Low | Pass |
| DockerNodeAttachment.apply exact plan | Pass | Pass | Pass | Low | Pass |
| Guide descriptor / scoped child Git environment | Pass | Pass | Pass | Low | Pass |

Run-content entries may be tracked absolute paths as well as workspace-relative; no new confinement policy is introduced by this review. Optional terminal child environment is a narrow extension of the current owner, not a second launch API.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Checked? | Reuse/Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Network storage setup | Pass | Pass | Pass | Pass | Native engines reused; missing administration capability supplied |
| Known new-run binding | Pass | Pass | Pass | Pass | Small server owner, registry still metadata-only |
| Files/preview/PTY | Pass | Pass | N/A | Pass | Existing normal implementation retained |
| Configured skills | Pass | Pass | Pass | Pass | Catalog lookup/collision and exact process owners reused; false source-lease reuse removed; AGY unchanged |
| Docker/guide/distribution | Pass | Pass | Pass | Pass | Safe selected adapter and existing UI/release conventions |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Clear? | Reuse/Extend/Create Decision Sound? | Supports Right Spine? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Go setup/config/service/platform/backend/Docker | Pass | Pass | Pass | Pass | Control plane only |
| Server binding and runtime profiles | Pass | Pass | Pass | Pass | Actual missing invariants; no broad file service |
| Existing filesystem/REST/core/terminal | Pass | Pass | Pass | Pass | Healthy path preserved; narrow child environment support |
| Launcher/release/guide | Pass | Pass | Pass | Pass | Opt-in state, publishing and interaction responsibilities distinct |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Binding/observation | Pass | Pass | Pass | Pass | Server subject, Go JSON fixtures; no cross-language framework |
| Runtime exposure/name map | Pass | Pass | Pass | Pass | Generated wrapper/link/name contract, runtime-specific exposure; source observations are not leases |
| Scoped project Git environment | Pass | Pass | Pass | Pass | One narrow child-environment transformation |
| DockerApplyReceipt | Pass | Pass | Pass | Pass | Private exact resources, not parallel node catalog |
| Per-action worker/stream structures | Pass | N/A | N/A | Pass | Not introduced; withdrawn scope does not justify them |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundancy Controlled? | Overlapping Representations Controlled? | Core Vs Variant Decision Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| HostedFilesystem/ClientAttachment/marker | Pass | Pass | Pass | Pass | Pass | Source and expected mount; UUID not workspace path ID |
| SharedMountBinding/MountObservation | Pass | Pass | Pass | Pass | Pass | Known observation, not durable READY or promised deadline |
| RuntimeSkillExposure | Pass | Pass | Pass | Pass | Pass | Logical/native names distinct; executionGeneration/profileId are not source-generation holds |
| Docker receipt | Pass | Pass | Pass | Pass | Pass | Private config can contain secrets; 0600/no logging |

## File Responsibility Mapping Verdict

| File / Group | Responsibility Singular/Clear? | Matches Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-nfs internal groups | Pass | Pass | Pass | Pass | Concrete setup/config/platform/backend/node concerns |
| server workspaces/shared-workspace-binding.ts and preparation callers | Pass | Pass | Pass | Pass | Check once per requested execution generation; no global scan |
| runtime profile/exposure/bootstrap/client/ACP files | Pass | Pass | Pass | Pass | New private links, exact cleanup only; native discovery/name/asset tests explicit |
| skill-service/source-service/repository and AGY capsule/linker (preserved) | Pass | Pass | N/A | Pass | Source deletion/lookup and existing AGY missing-source restore remain unchanged; docs explain distinction |
| scoped-project-git-environment.ts / optional terminal env support | Pass | Pass | Pass | Pass | Child-only env; no broad cwd rewrite |
| REST workspaces/run-file-changes and UI viewers | Pass | Pass | N/A | Pass | Explicitly preserved; healthy tests may uncover scoped normal-use fixes |
| launcher/release/guide/tests/docs | Pass | Pass | Pass | Pass | Mapping reflects reduced scope |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Folder Matches Owner? | Mixed-Layer/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-nfs/ | Pass | Pass | Low | Pass | Standalone service control package |
| server workspaces and runtime-management/backends | Pass | Pass | Low | Pass | Small binding and runtime-owned profiles |
| core terminal optional environment input | Pass | Pass | Low | Pass | Core remains independent of server |
| existing content routes/UI | Pass | Pass | Low | Pass | No unnecessary new subsystem |
| Nodes guide/util/localization | Pass | Pass | Low | Pass | Existing pattern |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Configured shared temp/cwd fallback | Pass | Pass | Pass | Pass | Known binding error retains intended path |
| Shared generated skill publisher/cwd-only profile pooling | Pass | Pass | Pass | Pass | Private profiles and compound Codex client identity |
| False source-lease/pinned-byte design instruction | Pass | N/A | Pass | Pass | Withdrawn, not existing code to remove; no replacement retention subsystem |
| Proposed action probes/workers/stream leases/trampoline | Pass | N/A | Pass | Pass | Design-only proposal removed, not source deletion to implement |
| Existing parent reads, local-only sharing | Pass | N/A | Pass | Pass | Reachable preserved behavior, not dead code |
| General launcher attach shortcut / UNFS prototype promotion | Pass | Pass | Pass | Pass | Rejected |
| Newly unreachable pieces in touched modules | Pass | Pass | Pass | Pass | Explicit cutover cleanup; no additional dead code established by review |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper/Dual-Path/Legacy Retention? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Shared runtime publication/fallback | No target fallback | Pass | Pass | Local path is preserved separate behavior |
| Persisted readers | No version-specific target branch | Pass | Pass | Known-field readers, no new schemaVersion |
| Ambiguous existing project links | No automatic migration claimed | Pass | Pass | Preserve/report rather than delete another node's data |
| Healthy REST/core IO | No compatibility wrapper | Pass | Pass | Deliberate scope-preserving reuse, not obsolete fallback |

## Persisted-Data Transition Verdict (When Applicable)

| Stored Subject | Decision | Reader/Semantic/Invariant Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace registry | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Root/ID semantics unchanged |
| Run/definition/native session references | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Claude/Codex/Grok reconstruct current profile; AGY uses its existing capsule restore |
| Generated private profile | Discard/Rebuild after exact release | Pass | Pass | N/A | Pass | Wrappers/links only, never uncertain live profile or linked source; no source snapshots |
| Managed source registry/generations and AGY capsule manifest | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Unchanged readers/writers/deletion and warn/skip restore; no new source holder fields |
| New hosted/attachment/marker subjects | New subject, no historical migration | Pass | Pass | N/A | Pass | Atomic current writers; persistent source UUID |
| Launcher opt-in reference | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Missing opt-in keeps existing local behavior |
| Existing project skill links | Preserve, no automatic migration | Pass | Pass | N/A | Pass | No durable cross-node deletion authority |

Unaffected transition evidence is retained; SR019 independently rechecked source generation readers/writers and AGY restore. It adds no stored format change or guarantee of reconstructing deleted source bytes. No project migration, recursive rewrite, startup-history audit or new migration framework is required.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup/Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Service/config/install/supervisor | Pass | Pass | Pass | Pass |
| Selected Docker apply/rollback and launcher opt-in | Pass | Pass | Pass | Pass |
| New-run binding + preserve ordinary readers | Pass | Pass | Pass | Pass |
| Private profiles/exact release/Git env | Pass | Pass | Pass | Pass |
| Guide and downstream normal-path validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present/Clear? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Same storage vs matching directory strings | Yes | Pass | Pass | Pass | Daemon volume -> same source UUID |
| Profile acquire/spawn/close/release | Yes | Pass | Pass | Pass | Timeout is not release proof; profile lifetime is not source lifetime |
| Source update/removal versus peer stop | Yes | Pass | Pass | Pass | Normal peer stop removes own wrapper only; confirmed source operation may delete linked bytes |
| Typed join metadata | Yes | Pass | Pass | Pass | No eval shell |
| Healthy media/static/artifact read paths | Yes | Pass | Pass | Pass | Actual UI -> existing route/projection -> mounted bytes; no outage-stream rewrite |
| Child cwd trampoline/stream-worker lifecycle | No | N/A | N/A | Pass | Explicitly removed from v1 |

## Material Premise Validation (Only When Needed)

### MP-001 — Workspace preview parent IO can stall when hard-mounted storage is unavailable

- Prior authority: SR017 REQ007/008/011, AC006/010. Current authority: **SR018 DEC015/REQ008** discloses this risk and defers isolation; REQ011/AC010 cover healthy previews.
- Relevant behaviors: BEH004/006. Initiating basis: user opens a workspace media preview; operational storage loss is the separately identified outage condition.
- Forward witness retained: FileItem click -> fileExplorerContentActions -> workspaceResourceUrl -> `api/rest/workspaces.ts:24–39` -> metadata/lexical path -> parent existsSync/statSync/createReadStream. HTML uses HtmlPreviewer -> static sibling, route lines70–85.
- Preconditions/consequence: registered shared workspace, uncached IO during storage loss can stall the parent and unrelated work. FR028/029 support the underlying NFS limitation, not an executed REST outage test.
- Reachability: **Reachable**, unchanged. Scenario scope: **explicitly deferred v1 edge**, not Not Reachable and not a normal healthy-preview defect.
- Review consequence: no blocker/worker requirement. Preserve healthy behavior and disclose the limitation; D-001 scope disposition below.

### MP-002 — Completed agent artifact preview uses direct parent IO into the shared project

- Prior authority: SR017 outage promise; current authority: SR018 DEC015/REQ008 plus healthy REQ011/AC010.
- Relevant behaviors: BEH002/004/006. Initiating basis: user selects completed agent output to inspect it; storage loss is the independently identified deferred condition.
- Forward witness retained: ArtifactContentViewer lines128–142 -> run-file-change-content -> RunFileChangeProjectionService.resolveEntry -> `api/rest/run-file-changes.ts:28–50` -> parent checks/stream. Recorded absolute paths and workspace-relative paths remain supported; pending buffered UI is distinct.
- Preconditions/consequence: normal recorded output on shared storage; lost storage can block later physical access despite earlier run success. Private history does not relocate file bytes.
- Reachability: **Reachable**; outage isolation is explicitly deferred, not technically repaired.
- Review consequence: no new stream owner or general file API. Keep current healthy authorization/content/error semantics and verify them downstream.

### MP-003 — Confirmed changed-revision source Update retires bytes independently of profiles

- Authority: preserved configured-skill/local behavior (BEH002/005, REQ003/010); current skills module source-lifecycle contract, not a new availability guarantee.
- Initiating basis: **User**; Skills -> Sources -> Update -> confirmation, to install a new managed repository revision. **Supported Normal Scenario**. No fabricated mid-acquisition race is needed.
- Forward witness: `SkillSourcesModal.confirmAction` -> `skillSourcesStore.githubOperation(update)` -> GraphQL update -> `SkillSourceService.updateGitHubSkillSource:154–187` -> publish new generation -> `afterPublication:213–219` -> repository `cleanup:63–89` deletes all retired generations. Source owner does not enumerate/stop active runs (documented contract).
- Preconditions/consequence: an installed source has a changed valid revision. A previously created link to retired bytes gains no protection from a runtime holder; subsequent access can be unavailable. New profile resolves the current matching catalog source. Exact private profile release cannot release/preserve source bytes.
- Reachability: **Reachable**. Source owner's independent deletion authority is confirmed; no transactional concurrent-update guarantee or snapshot is inferred from two actions being possible.
- Review consequence: IMP-D001 correction is proportionate: keep current source policy, remove nonexistent source-lease reuse; no new source coordination, copies or retained-generation machinery.

### MP-004 — Confirmed managed-source Remove deletes bytes without profile release

- Authority/behaviors: same preserved source contract and BEH002/005; distinct removal operation, not aggregation with Update or filesystem corruption.
- Initiating basis: **User**; Skills -> Sources -> Remove -> confirmation, to uninstall an imported source. **Supported Normal Scenario**.
- Forward witness: same exposed confirmation/store -> GraphQL remove -> `SkillSourceService.removeGitHubSkillSource:190–198` marks REMOVING, invalidates transient workspaces -> `GitHubSkillRepository.cleanup(id)` removes owned generations/source -> removes registry entry. Local-folder unregister is a different non-deletion action and stays unchanged.
- Preconditions/consequence: installed managed source, confirmed removal. Existing private link can dangle; AGY later normal restore checks its recorded manifest/path, removes only dangling private link and warns/skips (`agy-run-capsule.ts:100–107`). This does not rebuild from another catalog generation or recover deleted bytes.
- Reachability: **Reachable**; existing supported removal and restore policy, not an arbitrary file-deletion test premise.
- Review consequence: preserve source deletion and AGY restore. New profile wrappers are rebuilt only from available current sources under current runtime warning/error policy; no snapshots, migration or source-restoration machinery.

Private linked native discovery/support-asset reads are the ordinary BEH002 target, not an edge scenario. Their native compatibility still requires implementation validation. No retained-byte promise is necessary for the separate FR011 peer-stop fix.

## Unresolved Approved-Behavior Or Current-State Gaps

**None blocking implementation on Ready SR019 / Approved SR018.** Physical and changed-product validation are still required downstream and are not represented as completed review evidence.

## Review Decision

**Pass — SR019 is ready for implementation against unchanged Approved SR018.** IMP-D001 is corrected at the design boundary: current-source private links, exact profile cleanup, independent source deletion and unchanged AGY restore. This is design approval, not product validation, deployment or release authorization.

## Findings

**No new or remaining blocking findings.**

D-001: **Deferred / obsolete as a v1 blocker by approved DEC015**, not fixed. Exact user direction, approval018, REQ007/008/011, AC006/007/010, SCN004, QR002, and revised design allocation/removal/validation sections verify the disposition. Keep the outage limitation in docs and task follow-ups; do not re-add it as a v1 delivery gate. Disposition retained in ARCH-REV-003.

IMP-D001: **Resolved in design; production implementation remains pending.** The prior review accepted incorrect source-lease reuse. Current source tracing confirms the implementation finding; SR019 now withdraws the premise in lifecycle/interfaces/ownership/file/transition/removal/validation sections. No new reviewer finding ID or retention requirement is needed. Resolution evidence and retained limitations are recorded in ARCH-REV-003.

## Classification

**Pass.** Task size **Large**, architectural risk **High**. No current Design Impact, Requirement Gap or Unclear blocker.

## Recommended Recipient

Primary: configured implementation recipient from fresh handoff rules. After that succeeds, configured informational Solution Designer recipient; **no duplicate forwarding action**.

## Residual Risks

- Unavailable hard mounts can stall tools, previews, startup/status checks or unrelated work in the same process. No v1 bounded diagnosis/cancellation/automatic recovery claim. This accepted deferral is not evidence of a healthy preview failure.
- Native private-link discovery, canonical discovered paths, previously unread support assets, peer-stop and restore require current-build tests. FR014/020 copied fixtures and do not prove the linked form. A disproved normal-use mechanism returns to Solution Designer; no silent source copy, lease, skill disablement or shared publisher fallback.
- Linked source bytes can disappear after confirmed Update/Remove; this is the preserved no-snapshot policy, not peer-stop damage. AGY keeps its existing warn/skip restore. No product test was run by this review.
- Scoped Git trust, selected Docker preservation, source ownership, OS consent and clean install/restart remain mandatory implementation/validation work, not deferred outage work.
- Prior single-physical-host/native-VM/old-release experiments support selection only. Current-build healthy mode/preview/native-agent tests and independent physical Mac/Linux plus Mac Docker, explicit user verification and merge remain delivery gates.
- Plaintext/coarse trusted-network access, Mac-v3 local advisory locking, case/ownership limitations and qualified platform/version scope must remain truthful. No silent security relaxation or invented compatibility guarantee.
- Working install commands/download links require actual built/published assets under release policy; no live user data/network/mount/container mutation is authorized by this review.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — source operation witnesses confirm independent ownership without authorizing new retention machinery; deferred outage cases remain non-blocking.
- Notes: **ARCH-REV-003 / Ready SR-019 / Approved SR-018; IMP-D001 design corrected; D-001 deferred, not repaired.** Proceed through configured implementation/validation/delivery route. No source or upstream artifact changed by reviewer; no product tests claimed.
