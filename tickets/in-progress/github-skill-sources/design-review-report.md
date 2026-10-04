# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (Approved SR-006, USER-APPROVAL-006).
- Upstream Investigation Notes: `investigation-notes.md` (cumulative through SR-008; earlier pending statements are historical).
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md` SR-008.
- Supplemental Task Artifacts Reviewed: `approved-requirements-sr006.md`, `approval-request.md`, `architecture-handoff.md`, original screenshot E-001 (viewed).
- Relevant Solution Revision IDs: SR-006 approval; SR-008 correction of SR-007 architecture; SR-002–005 preserved-policy clarification.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-002**.
- Current Review Round / Latest Authoritative Round: **2**, 2026-10-04.
- Trigger: Solution Designer requests re-review of SR-008 addressing AR-001.
- Prior Review Round Reviewed: ARCH-REV-001 Fail, AR-001; verified against current canonical design before closing.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`, branch `codex/github-skill-sources`, reviewed HEAD `b91524d42` (initial authored package `ba24cd4ff`, prior review `56356b688`). Ticket-relative links in this report refer to `tickets/in-progress/github-skill-sources/`; source paths are workspace-relative.
- Current-State Evidence Basis: independent static reads of catalog/discovery/service/loader, disabled settings, package installer/service, source and catalog frontend stores, transient workspaces, configured skill resolution, and the Codex runtime materializer/bootstrap/cleanup path. No implementation, tests, live import or production-data mutation performed.
- Round 2 evidence: independently re-read complete shared materializer/link owner, Codex/Claude/Grok profile composition, Claude bootstrap, Grok-backed ACP preparation, existing holder/collision tests and header ＋. Source code and unchanged design sections remain at the prior baseline; prior valid evidence is reused. Only readiness metadata changed in requirements; approval snapshot hash rechecked unchanged. Tests were read, not executed.
- Guidelines: architecture-reviewer shared design principles/template and Example 9; project `SOLUTION_DESIGN_BEST_PRACTICES.md`, root/package AGENTS.md, `TESTING.md`, and server `docs/design/data_migration_guideline.md`. No guideline conflict found.

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**.
- Classification rationale reviewed: justified by new persisted source authority, publication, archive safety and API boundaries plus catalog/UI/workspace and bounded runtime-holder integration, not payload volume.
- Independent Architecture Review required by classification: **Yes**.
- Classification evidence or correction required: none; preserve Large/High on return.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. SR-008 repairs the target-path assumption without changing approved intent.
- Approved intent: public root-URL/default-branch imports, bounded discovery, check-on-open/manual check, confirmed whole-source updates/removal, unchanged ordinary-conflict/runtime-default policy, existing local support and future-run consumption.
- Existing behavior confirmed: synchronous catalog and local source publication; name-based disabled choices; ordinary conflicts versus runtime-default notices; package bundles and application-owned exception; cached file workspaces; runtime skill links have a separate lifecycle.
- Scope guardrail: UC-001–004, exclusions, preserved boundary and technical-review authority confirmed. No request to add private auth, arbitrary layouts, migration, live-run refresh or new duplicate policy.
- Every prospective blocking Design Impact finding traces approved authority: **Yes**; no open blockers. Closed AR-001 protects REQ-005/007, BEH-003/004, UC-004.
- Remaining material intended-behavior ambiguity: none. No stop-runs restriction, snapshot isolation, or active-context refresh promise introduced.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass — Sources import, REQ-001/002/004/008 | Pass — DS-001 | Confirmed | None |
| BEH-002 | System/User | Pass | Pass — Sources open/recheck, REQ-003 | Pass — DS-002 | Confirmed | None |
| BEH-003 | User | Pass | Pass — confirmed update, REQ-005 | Pass — DS-003/006/008 cover both reference owners | Confirmed | None |
| BEH-004 | User/Contract | Pass | Pass — existing local/selection/new-chat surfaces, REQ-004/006/007 | Pass — exact managed identity authorizes future-run transfer | Confirmed | None |

AR-001 was rechecked first: DS-008 now distinguishes logical managed identity from physical root, transfers only the owned link, carries occurrence holders, and returns effective preparation results. Current release uses entry.sourceRootPath rather than the historical descriptor root, supporting the proposed bounded extension. Prior-finding resolution is recorded in ARCH-REV-002. No new finding was identified.

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
| Decision reflected in concrete sections | Pass | Exact files, forbidden shortcuts and old-path removals | None — DS-008 extends the existing owner |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Import, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Check, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Update, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Remove, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | UI/file-workspace return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Future run, primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Publication, bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Managed runtime transfer, bounded local | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source lifecycle | Pass | Pass | Pass | Pass | Resolvers use source owner, not installer/store writes |
| Catalog/content | Pass | Pass | Pass | Pass | One existing name validator; read-only installed-source projection is expressly public |
| Transient WorkspaceManager | Pass | Pass | Pass | Pass | Public close/rebind, not internal map writes |
| Runtime materialized skill links | Pass | Pass | Pass | Pass | Existing owner gains DS-008; source lifecycle cannot mutate runtime maps |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| UI/API/source/catalog | Pass | Pass | Pass | Pass | Source mutation and catalog policy remain separate authorities |
| GitHub integration | Pass | Pass | Pass | Pass | Neutral transport serves two real consumers, no skills → agent installer dependency |
| Runtime consumer transition | Pass | Pass | Pass | Pass | Catalog resolver injected through profile composition; effective results flow outward |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Sources snapshot + registry diagnostic | Pass | Pass | Pass | Low | Pass |
| Local add/remove path commands | Pass | Pass | Pass | Low | Pass |
| GitHub import URL; check/update/remove IDs | Pass | Pass | Pass | Low | Pass |
| inspectSkillSource / own-source exclusion | Pass | Pass | Pass | Low | Pass |
| Active-source read projection | Pass | Pass | Pass | Low | Pass |
| Catalog root → runtime materializer | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Discovery/name/permissions/disabled choices | Pass | Pass | Pass | Pass | New repository layout, same policy and loader |
| Metadata/download | Pass | Pass | Pass | Pass | Reuse metadata only; agent extraction excluded |
| Small atomic persistence | Pass | Pass | Pass | Pass | Sync commit fits current catalog, network remains async |
| Runtime binding | Pass | Pass | Pass | Pass | A-012–014 independently checked; holder tokens reused, no second registry |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skills lifecycle/catalog and filesystem adapter | Pass | Pass | Pass | Pass | Concrete concerns, no parallel precedence owner |
| Integration/persistence/API/frontend/workspace | Pass | Pass | Pass | Pass | Narrow reusable boundaries |
| Runtime transition | Pass | Pass | Pass | Pass | Existing materializer owns transfer and cleanup; SkillService owns selection |

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
| Managed provenance / effective requests / holder tokens | Pass | Pass | Pass | Pass | Pass | Exact source ID and name authorize; generation selects root; tokens retain occurrence identity, not cleanup authority |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner/Boundary? | Responsibilities Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Proposed skill-source service/domain/store/repository files | Pass | Pass | Pass | Pass | Lifecycle, shape, persistence, filesystem preparation separate |
| skill-service/catalog/discovery | Pass | Pass | Pass | Pass | Source orchestration removed; no policy duplication |
| integrations/github and atomic-json-sync | Pass | Pass | Pass | Pass | Two-consumer transport and small persistence primitive |
| GraphQL, web stores/modal/loader/localization | Pass | Pass | Pass | Pass | Complete fragment and transient file-view refresh mapped |
| Runtime consumer files | Pass | Pass | Pass | Pass | Shared owner/link adapter, profile wiring and all active bootstrap call sites mapped |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Proposed production file map | Pass | Pass | Low | Pass | Fits existing skills, integration, persistence, API and frontend folders |
| Runtime transition response | Pass | Pass | Low | Pass | Existing backend/shared boundary; no new coordinator |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Named? | Replacement Owner / Structure Clear? | Removal / Decommission Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source methods and old GitHub import locations | Pass | Pass | Pass | Pass | Move callers, no forwarding wrappers/re-exports |
| Retired generations | Pass | Pass | Pass | Pass | Retirement independent of holder invalidation; DS-008 works with old tree present or absent |

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
| Generation-root references | Replacement, no stored-data migration | Pass | Pass | N/A | Pass | Transient workspace rebind plus runtime logical-identity transfer; provenance not persisted into runs |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Transport/catalog/source/API/UI slices | Pass | Pass | Pass | Pass |
| Update → future-run transition | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Example Present And Clear? | Avoided Shape Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Generation publication, conflicts, URL scope, transient workspace | Yes | Pass | Pass | Pass | Concrete examples 1–4 are useful |
| Future run after source update | Yes | Pass | Pass | Pass | Concrete A/g1 → update → B/g2 → both release sequence; generic different-source collision retained |

## Material Premise Validation (Only When Needed)

### MP-001 — A new run uses an updated skill while a previous same-workspace run retains its materialization

- Related approved authority: REQ-005/007, BEH-003/004, UC-004; imported skills available to future runs, update visible without restart; no live active-run refresh promised.
- Initiating basis kind: **User**.
- Independent supported trigger: user starts another conversation for the same project/agent after updating its skill source, leaving the prior run available. The existing run header **＋** explicitly starts New chat preset to that agent/workspace (`AgentWorkspaceView.vue:69–78`). `chatDraftStore.startNewChat:125–145` creates a draft, does not close the old server run. The ordinary workspace picker also exposes existing workspaces, not only unused ones. This is a coherent normal project workflow, not two artificially timed requests.
- Forward production path: initial New chat Send → `chatLaunchService.ts:105–126` → `agentRunStore.sendUserInputAndSubscribe` → PrepareAgentRun then WebSocket SEND_MESSAGE → command coordinator / standalone run lifecycle → `AgentRunManager` → `CodexAgentRunBackendFactory.createBackend` → bootstrap configured-name resolution → `prepareWorkspaceSkills` → process-wide `WorkspaceSkillMaterializer`. For imported skill `writer`, run A holds workspace `.codex/skills/writer` with source g1. Approved Sources Update then commits g2 and retires g1. User presses ＋ and sends in new run B with Codex and the same configured skill/workspace. Bootstrap resolves g2; materializer uses the same workspace key but sees g1 in its existing holder record.
- Lifecycle evidence: `codex-workspace-skill-materializer.ts` caches one process-wide owner; `workspace-skill-materializer.ts:143–155` throws whenever an existing entry's sourceRootPath differs, before filesystem reconciliation and regardless of collision policy. `CodexThreadCleanup` releases holders on thread resource cleanup; `codex-thread-manager.ts:80–101` closes those resources on thread closure, not on navigating to Sources/New chat. Transient `skill_ws_*` eviction cannot change this registry.
- Prior-design preconditions/consequence: run A has not closed; the upstream update retains `writer` but changes the generation root. B's startup fails with source collision rather than using the updated skill. Deleting g1 successfully does **not** fix the in-memory mismatch. No cleanup failure, tampered files, parallel server writers or millisecond race is required.
- Scenario validity: **Supported Normal Scenario**. Reachability: **Reachable**, by static forward trace; not runtime-reproduced in this review.
- Verified SR-008 response: DS-008 obtains current winning managed source/name through SkillService, gates the transfer on trusted exact identity and verified link ownership, and completes the link/entry update without an await gap. A retains h1, B receives h2; last-holder cleanup follows the current entry root. Effective requests prevent stale Claude configuration and stale Codex native-discovery decisions. Generic collisions stay intact. This resolves the prior-design consequence; implementation must prove it. No distributed locks, global history scans, live-run refresh or stop-runs restriction is required.

### MP-002 — Two server processes mutate the same data directory

- Related scope: design explicitly excludes multi-process shared-data writers; REQ-007 only promises ordinary restart persistence.
- Initiating basis kind: Operational.
- Independent supported trigger: none established for concurrent writers. Ordinary restart is not evidence of two supported simultaneous owners.
- Forward path/lifecycle: the supported single-process service path contains no second writer; manually starting a second process against that directory is not an approved product action here.
- Scenario validity: Technically Possible but Unsupported/Contrived. Reachability: **Not Reachable within the supported contract**.
- Review consequence: no distributed locking or multi-writer recovery finding/machinery required. This does not dismiss same-process normal lifecycle MP-001.

Other guards are already tied to the approved basis: untrusted extraction to REQ-008/AC-008; staged update/failure retention to REQ-005; truthful owned removal to REQ-006; narrow malformed-registry admission to the cited project data guideline. They do not authorize arbitrary corruption repair.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

**Pass.** SR-008 is ready for implementation against Approved SR-006. AR-001 is resolved at the design boundary; this is not a claim of implemented or tested correctness.

## Findings

None open. AR-001 resolution and verification evidence are in ARCH-REV-002. No new finding IDs.

## Classification

**Pass — no failure classification.** Prior Design Impact AR-001 is resolved. Large/High retained; requirements and acceptance criteria unchanged.

## Recommended Recipient

Primary implementation-ready route: **/implementation_engineer**, using the exact returned handoff recipient after persisting this result. No duplicate implementation forwarding through Solution Designer.

## Residual Risks

- Archive safety remains implementation evidence: strict effective-entry validation, deferred internal links, platform path behavior, and direct patched dependency. Maintainer documentation supports the extraction primitives; the [PAX NUL advisory](https://github.com/isaacs/node-tar/security/advisories/GHSA-gvwx-54wh-qm9j) confirms <=7.5.16 affected and 7.5.17 patched. This is not a blanket assertion that any dependency version is vulnerability-free. [node-tar documentation](https://github.com/isaacs/node-tar) and [GitHub archive endpoint](https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar) rechecked during round 1; unchanged external contract reused in round 2.
- DS-008 must prove trusted provenance, exact-name identity, current-catalog revalidation, link ownership, transfer failure/retry, waiting caller settlement, reverse release order and effective result propagation. Include all three active materialization call sites: Codex bootstrap, Claude bootstrap, and `acp/backend/acp-agent-run-backend-factory.ts` used by Grok. The design’s all-production-call-sites instruction includes this ACP adapter; updating profile factories alone is insufficient.
- No-await publication, exact previous-source exclusion, operation serialization, before/after-commit results, and REMOVING retry need executable evidence. Existing agent-package transient replacement remains outside this ticket's rewrite scope; no generic concurrent package-update protocol is prescribed here.
- UI source-row states, stale file-view clearing, shared transport regression and platform cleanup require implementation/API-E2E evidence; no tests claimed run.
- Successful destructive update/removal does not promise old-generation availability to active runs. A later acquisition can retarget the shared owned link, so an old run reading that path may see current bytes. Existing links already expose mutable source bytes; this is not an active prompt/context refresh or snapshot-isolation promise. AR-001 concerns successful preparation of the new run.

## Latest Authoritative Result

- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — DS-008 addresses independently supported MP-001; MP-002 drives no machinery.
- Notes: **ARCH-REV-002 / SR-008**; AR-001 resolved, no open findings. Requirements remain Approved SR-006; Large/High preserved. No executable tests or implementation performed by this review.
