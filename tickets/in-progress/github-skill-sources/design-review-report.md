# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (Approved SR-006, USER-APPROVAL-006).
- Upstream Investigation Notes: `investigation-notes.md` (cumulative through SR-007; earlier pending statements are historical).
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md` SR-007.
- Supplemental Task Artifacts Reviewed: `approved-requirements-sr006.md`, `approval-request.md`, `architecture-handoff.md`, original screenshot E-001 (viewed).
- Relevant Solution Revision IDs: SR-006 approval; SR-007 architecture; SR-002–005 preserved-policy clarification.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-001**.
- Current Review Round / Latest Authoritative Round: **1**, 2026-10-04.
- Trigger: Solution Designer requests independent review of Large/High package.
- Prior Review Round Reviewed: None; no prior result inferred.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`, branch `codex/github-skill-sources`, reviewed HEAD `33cd78131` (authored package `ba24cd4ff`). Ticket-relative links in this report refer to `tickets/in-progress/github-skill-sources/`; source paths are workspace-relative.
- Current-State Evidence Basis: independent static reads of catalog/discovery/service/loader, disabled settings, package installer/service, source and catalog frontend stores, transient workspaces, configured skill resolution, and the Codex runtime materializer/bootstrap/cleanup path. No implementation, tests, live import or production-data mutation performed.
- Guidelines: architecture-reviewer shared design principles/template and Example 9; project `SOLUTION_DESIGN_BEST_PRACTICES.md`, root/package AGENTS.md, `TESTING.md`, and server `docs/design/data_migration_guideline.md`. No guideline conflict found.

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**.
- Classification rationale reviewed: justified by new persisted source authority, publication, archive safety and API boundaries plus catalog/UI/workspace integration, not payload volume.
- Independent Architecture Review required by classification: **Yes**.
- Classification evidence or correction required: none; preserve Large/High on return.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Contradicted — one target-path assumption**, not ambiguous approval.
- Approved intent: public root-URL/default-branch imports, bounded discovery, check-on-open/manual check, confirmed whole-source updates/removal, unchanged ordinary-conflict/runtime-default policy, existing local support and future-run consumption.
- Existing behavior confirmed: synchronous catalog and local source publication; name-based disabled choices; ordinary conflicts versus runtime-default notices; package bundles and application-owned exception; cached file workspaces; runtime skill links have a separate lifecycle.
- Scope guardrail: UC-001–004, exclusions, preserved boundary and technical-review authority confirmed. No request to add private auth, arbitrary layouts, migration, live-run refresh or new duplicate policy.
- Every prospective blocking Design Impact finding traces approved authority: **Yes**, AR-001 → REQ-005/007, BEH-003/004, UC-004.
- Remaining material intended-behavior ambiguity: none needed to demonstrate AR-001. Any proposed restriction on future-run/update availability must return for approval; this report does not authorize one.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass — Sources import, REQ-001/002/004/008 | Pass — DS-001 | Confirmed | None |
| BEH-002 | System/User | Pass | Pass — Sources open/recheck, REQ-003 | Pass — DS-002 | Confirmed | None |
| BEH-003 | User | Pass | Pass — confirmed update, REQ-005 | Fail — DS-003 changes roots without a complete DS-006 consumer transition | Needs Correction | AR-001 |
| BEH-004 | User/Contract | Pass | Pass — existing local/selection/new-chat surfaces, REQ-004/006/007 | Fail — same-workspace future run can reject the new root | Needs Correction | AR-001 |

The structural review below proceeds with approved intent/current behavior established; the contradictory target path is the finding, not an invented requirement.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Approved snapshot | Pass | Pass | Pass | Pass | Pass | SHA256 independently matches `65035d7ba2b63e33eef2e8c8bbd72066cfb0f4148eb129fc798aec004d4dccb8`; diff is approval/readiness metadata, not changed normative behavior |
| Approval log and handoff | Pass | Pass | Pass | Pass | Pass | Historical pending labels explicitly superseded; current approval not inferred from them |
| Screenshot E-001 | Pass | Pass | Pass | Pass | Pass | Supporting existing-state evidence only; no target visual contract |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current posture | Pass | Feature with bounded refactor | None |
| Root-cause classification explicit/evidence-backed | Pass | Source config in SkillService; HTTP in agent installer | None |
| Refactor decision explicit | Pass | Separate source lifecycle; extract neutral metadata transport | None |
| Decision reflected in concrete sections | Pass | Exact files, forbidden shortcuts and old-path removals | Extend consumer transition for AR-001, not a wholesale redesign |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Import, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Check, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Update, primary | Pass | Fail | Pass | Pass | Fail | Pass | Fail — incomplete runtime-root consequence, AR-001 |
| DS-004 | Remove, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | UI/file-workspace return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Future run, primary | Pass | Fail | Pass | Pass | Fail | Pass | Fail — materializer is named but its source identity invariant is not addressed |
| DS-007 | Publication, bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source lifecycle | Pass | Pass | Pass | Pass | Resolvers use source owner, not installer/store writes |
| Catalog/content | Pass | Pass | Pass | Pass | One existing name validator; read-only installed-source projection is expressly public |
| Transient WorkspaceManager | Pass | Pass | Pass | Pass | Public close/rebind, not internal map writes |
| Runtime materialized skill links | Fail | Pass | Pass | Fail | No transition contract between generation publication and live source-root holders; AR-001 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| UI/API/source/catalog | Pass | Pass | Pass | Pass | Source mutation and catalog policy remain separate authorities |
| GitHub integration | Pass | Pass | Pass | Pass | Neutral transport serves two real consumers, no skills → agent installer dependency |
| Runtime consumer transition | Fail | Pass | Fail | Fail | Leaving bootstrap/materialization unchanged is not sufficient for changing source identities; AR-001 |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Sources snapshot + registry diagnostic | Pass | Pass | Pass | Low | Pass |
| Local add/remove path commands | Pass | Pass | Pass | Low | Pass |
| GitHub import URL; check/update/remove IDs | Pass | Pass | Pass | Low | Pass |
| inspectSkillSource / own-source exclusion | Pass | Pass | Pass | Low | Pass |
| Active-source read projection | Pass | Pass | Pass | Low | Pass |
| Catalog root → runtime materializer | Pass | Pass | Fail | Medium | Fail — generation identity differs from retained source identity, AR-001 |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Discovery/name/permissions/disabled choices | Pass | Pass | Pass | Pass | New repository layout, same policy and loader |
| Metadata/download | Pass | Pass | Pass | Pass | Reuse metadata only; agent extraction excluded |
| Small atomic persistence | Pass | Pass | Pass | Pass | Sync commit fits current catalog, network remains async |
| Runtime binding | Fail | Fail | N/A | Fail | A-001/A-006 do not cover live materializer source identity; independent reads expose AR-001 |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills lifecycle/catalog and filesystem adapter | Pass | Pass | Pass | Pass | Concrete concerns, no parallel precedence owner |
| Integration/persistence/API/frontend/workspace | Pass | Pass | Pass | Pass | Narrow reusable boundaries |
| Runtime transition | Fail | Fail | Fail | Fail | Needs explicit bounded disposition at existing owner or revised publication design; AR-001 |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| GitHub identity/metadata | Pass | Pass | Pass | Pass | Domain-neutral integration; old imports removed |
| Source record/row/operation result | Pass | Pass | Pass | Pass | Domain types with transport mapping, not generic package base |
| Name validation | Pass | Pass | Pass | Pass | Existing validator reused, precise old-source exclusion |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Managed registry record | Pass | Pass | Pass | Pass | Pass | Installed revision distinct from latest observation; URL/root derived |
| Source DTO | Pass | Pass | Pass | Pass | Pass | Nullable GitHub specialization, client in-flight state not persisted |
| ACTIVE/REMOVING | Pass | Pass | Pass | Pass | Pass | Removed root not catalog-admitted; deletion retry does not claim success |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Proposed skill-source service/domain/store/repository files | Pass | Pass | Pass | Pass | Lifecycle, shape, persistence, filesystem preparation separate |
| skill-service/catalog/discovery | Pass | Pass | Pass | Pass | Source orchestration removed; no policy duplication |
| integrations/github and atomic-json-sync | Pass | Pass | Pass | Pass | Two-consumer transport and small persistence primitive |
| GraphQL, web stores/modal/loader/localization | Pass | Pass | Pass | Pass | Complete fragment and transient file-view refresh mapped |
| Runtime consumer files | Fail | Fail | N/A | Fail | Missing change/disposition mapping for AR-001 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Proposed production file map | Pass | Pass | Low | Pass | Fits existing skills, integration, persistence, API and frontend folders |
| Runtime transition response | Fail | Fail | Medium | Fail | Owner/file map must follow chosen AR-001 correction |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Named? | Replacement Owner / Structure Clear? | Removal / Decommission Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source methods and old GitHub import locations | Pass | Pass | Pass | Pass | Move callers, no forwarding wrappers/re-exports |
| Retired generations | Pass | Fail | Pass | Fail | Files retired explicitly, but runtime references omitted; AR-001 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Source settings/registry and moved APIs | No | Pass | Pass | Local support is current behavior, not legacy; no dual registration |
| JSON current-field projection | No | Pass | Pass | Unknown-field tolerance is not historical decoding |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Reader / Semantic / Invariant Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Local paths/disabled names | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Same config meaning and string-name reader; A-004/A-009 |
| Agent package/definition/history data | Not Affected | Pass | Pass | N/A | Pass | No rewrite or historical gate justified |
| New GitHub registry | Additive current-only subject | Pass | Pass | N/A | Pass | Atomic metadata, exact writer and narrow error admission; no predecessor schema |
| Generation-root references | Replacement, no stored-data migration proposed | Fail | Fail | N/A | Fail | Transient file workspace covered; live runtime references not covered, AR-001. Do not infer a migration requirement |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Transport/catalog/source/API/UI slices | Pass | Pass | Pass | Pass |
| Update → future-run transition | Fail | Fail | Fail | Fail — add consumer decision and test slice, AR-001 |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Example Present And Clear? | Avoided Shape Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Generation publication, conflicts, URL scope, transient workspace | Yes | Pass | Pass | Pass | Concrete examples 1–4 are useful |
| Future run after source update | Yes | Fail | N/A | Fail | DS-006 hides source-holder incompatibility; AR-001 |

## Material Premise Validation (Only When Needed)

### MP-001 — A new run uses an updated skill while a previous same-workspace run retains its materialization

- Related approved authority: REQ-005/007, BEH-003/004, UC-004; imported skills available to future runs, update visible without restart; no live active-run refresh promised.
- Initiating basis kind: **User**.
- Independent supported trigger: user starts another conversation for the same project/agent after updating its skill source, leaving the prior run available. The existing run header **＋** explicitly starts New chat preset to that agent/workspace (`AgentWorkspaceView.vue:69–78`). `chatDraftStore.startNewChat:125–145` creates a draft, does not close the old server run. The ordinary workspace picker also exposes existing workspaces, not only unused ones. This is a coherent normal project workflow, not two artificially timed requests.
- Forward production path: initial New chat Send → `chatLaunchService.ts:105–126` → `agentRunStore.sendUserInputAndSubscribe` → PrepareAgentRun then WebSocket SEND_MESSAGE → command coordinator / standalone run lifecycle → `AgentRunManager` → `CodexAgentRunBackendFactory.createBackend` → bootstrap configured-name resolution → `prepareWorkspaceSkills` → process-wide `WorkspaceSkillMaterializer`. For imported skill `writer`, run A holds workspace `.codex/skills/writer` with source g1. Approved Sources Update then commits g2 and retires g1. User presses ＋ and sends in new run B with Codex and the same configured skill/workspace. Bootstrap resolves g2; materializer uses the same workspace key but sees g1 in its existing holder record.
- Lifecycle evidence: `codex-workspace-skill-materializer.ts` caches one process-wide owner; `workspace-skill-materializer.ts:143–155` throws whenever an existing entry's sourceRootPath differs, before filesystem reconciliation and regardless of collision policy. `CodexThreadCleanup` releases holders on thread resource cleanup; `codex-thread-manager.ts:80–101` closes those resources on thread closure, not on navigating to Sources/New chat. Transient `skill_ws_*` eviction cannot change this registry.
- Preconditions/consequence: run A has not closed; the upstream update retains `writer` but changes the generation root. B's startup fails with source collision rather than using the updated skill. Deleting g1 successfully does **not** fix the in-memory mismatch. No cleanup failure, tampered files, parallel server writers or millisecond race is required.
- Scenario validity: **Supported Normal Scenario**. Reachability: **Reachable**, by static forward trace; not runtime-reproduced in this review.
- Proportionate response: address the normal consumer transition in DS-003/006. Do not prescribe distributed locks, global history scans, live-run refresh or an unapproved “stop all runs first” policy.

### MP-002 — Two server processes mutate the same data directory

- Related scope: design explicitly excludes multi-process shared-data writers; REQ-007 only promises ordinary restart persistence.
- Initiating basis kind: Operational.
- Independent supported trigger: none established for concurrent writers. Ordinary restart is not evidence of two supported simultaneous owners.
- Forward path/lifecycle: the supported single-process service path contains no second writer; manually starting a second process against that directory is not an approved product action here.
- Scenario validity: Technically Possible but Unsupported/Contrived. Reachability: **Not Reachable within the supported contract**.
- Review consequence: no distributed locking or multi-writer recovery finding/machinery required. This does not dismiss same-process normal lifecycle MP-001.

Other guards are already tied to the approved basis: untrusted extraction to REQ-008/AC-008; staged update/failure retention to REQ-005; truthful owned removal to REQ-006; narrow malformed-registry admission to the cited project data guideline. They do not authorize arbitrary corruption repair.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| DS-006 root-identity transition | New roots violate a current runtime-holder invariant on MP-001 | Revise design/consumer evidence and validation mapping | Open — AR-001 |

## Review Decision

**Fail — Design Impact.** Most structural decisions are proportionate, but the generation-root transition is not implementation-ready across the complete approved future-run path.

## Findings

### AR-001 — Managed generation changes conflict with retained runtime skill holders

- Type / severity: **Design Impact / High (blocking)**.
- Protected authority: **REQ-005, REQ-007; BEH-003/004; UC-004**, future-run use after a successful update without restart. AC-001/005/007 provide associated selection/integration regression coverage.
- Scope status: **Within Approved Scope**.
- Required update changes approved behavior: **No**. If the proposed resolution limits existing new-chat/update behavior, renewed approval is required; this review does not approve that alternative.
- Evidence: design “Commit, interruption and removal” retires g1 after publishing g2; DS-006 and Dependency Rules retain runtime bootstrapping unchanged; file map addresses only transient WorkspaceManager/SkillWorkspaceLoader. Current materializer holds sourceRootPath across runs and rejects g2 against g1 (`workspace-skill-materializer.ts:143–155`). See MP-001 for the independent UI trigger and full forward witness.
- Consequence: a future same-workspace Codex run fails to start after a valid source update while another run remains alive. This is **not** a request to live-refresh the prior run. The declared no-live-refresh exclusion does not resolve the new-run failure.
- Required update: investigate the source-root/lifetime contract at the existing runtime owner, then revise publication/reference transition, DS-003/006, owner/file mapping and test plan so the approved future-run outcome is achievable. Document how retained holders and generation retirement interact. Recheck affected runtime consumers rather than assuming file-explorer eviction covers them. Preserve current collision/ownership guarantees; do not simply suppress the mismatch or rewrite unrelated workspace entries.
- Verification expectation: normal product/API sequence import → start A with configured imported skill in workspace W → successful update retaining that name → start B in W while A is still live; verify chosen updated skill and successful B startup, plus unchanged current ownership behavior. Disposable fixtures/runtime doubles may reproduce this independently established path. No live provider call is necessary to prove the holder mismatch.
- Proportionality: one concrete supported lifecycle crossing needs a design decision, not a general concurrency or recovery framework. No migration or active-run refresh is demanded.
- Recommended recipient: **/solution_designer**.

## Classification

**Design Impact.** No requirement change requested by the reviewer. If resolving AR-001 requires a product restriction or new lifecycle promise, route that proposed behavior for approval before treating it as authoritative.

## Recommended Recipient

**/solution_designer** under the Fail/Blocked upstream-revision rule. Do not forward to implementation.

## Residual Risks

- Archive safety remains implementation evidence: strict effective-entry validation, deferred internal links, platform path behavior, and direct patched dependency. Maintainer documentation supports the extraction primitives; the [PAX NUL advisory](https://github.com/isaacs/node-tar/security/advisories/GHSA-gvwx-54wh-qm9j) confirms <=7.5.16 affected and 7.5.17 patched. This is not a blanket assertion that any dependency version is vulnerability-free. [node-tar documentation](https://github.com/isaacs/node-tar) and [GitHub archive endpoint](https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar) rechecked during review.
- No-await publication, exact previous-source exclusion, operation serialization, before/after-commit results, and REMOVING retry need executable evidence. Existing agent-package transient replacement remains outside this ticket's rewrite scope; no generic concurrent package-update protocol is prescribed here.
- UI source-row states, stale file-view clearing, shared transport regression and platform cleanup require implementation/API-E2E evidence; no tests claimed run.
- Successful destructive update/removal does not promise old-generation availability to active runs. This review makes no additional preservation guarantee for those runs; AR-001 concerns a new run.

## Latest Authoritative Result

- Review Decision: **Fail**.
- Material-Premise Gate: **Pass** — AR-001 has supported, independently initiated MP-001; MP-002 drives no machinery.
- Notes: ARCH-REV-001 / SR-007; one open blocking finding AR-001. Requirements remain Approved SR-006; Large/High preserved. No implementation handoff.
