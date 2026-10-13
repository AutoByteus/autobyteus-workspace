# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, **Approved SR-017**; decision authority verified against `approval-record-sr017.md`.
- Upstream Investigation Notes: `investigation-notes.md`.
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md`, Ready SR-017 at `f22e8aeaa7e7b68e301c68446ac862d9c555f857`.
- Supplemental Task Artifacts Reviewed: current `solution-design-handoff.md`; approval SR017; selection, native-folder, backend-correctness, private-runtime-skill and native-private-readiness reports; retained experiment ledger and sampled raw FR014/020/026/028/029/033/039/057 receipts. Historical report assertions are accepted only at their recorded component/revision scope, not as current-product validation.
- Relevant Solution Revision IDs: **SR-017**, with SR009–016 evidence/history retained.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-001**.
- Current Review Round: **1**, 2026-10-13.
- Trigger: Solution Designer's Architecture Design Complete / Large / High handoff.
- Prior Review Round Reviewed: **None**; neither canonical review artifact previously existed. No prior Pass inferred.
- Latest Authoritative Round: this report / ARCH-REV-001.
- Canonical ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
- Source paths below are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
- Current-State Evidence Basis: independent read-only source traces of workspace metadata/provisioning/restore, core file/terminal physical resolution, Claude exact process owner and synchronous cwd handling, Codex client leases, skill collision policy, Docker launcher state/recreation, Nodes tabs, and **workspace/agent-artifact content delivery**. Read root DESIGN/TESTING, applicable AGENTS, migration/startup/terminal policies and architecture-reviewer principles/template/Example 9. No builds, live mounts, Docker actions, credentials, provider calls or runtime validation were performed in this review.

## Routing Classification Review

- Task size: **Large**.
- Architectural risk: **High**.
- Classification rationale reviewed: justified by new privileged service/distribution and multi-platform storage lifecycle, selected-node preservation, core/server runtime/file/terminal changes, and UI integration. Not inflated by the 57 experiment rounds.
- Independent Architecture Review required: **Yes**.
- Classification correction required: **None**. Return the design finding to Solution Designer; no implementation handoff.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Contradicted in target-path completeness**, not blocked on intended behavior. Approved behavior and current paths are sufficiently established to complete this review; BEH-004/006 lack a complete target allocation for existing content-serving paths.
- Approved intended behavior understood: one persistent install/create/connect experience; native Mac and native/Docker Linux hosting; native and Docker clients on both OSes; ordinary shared projects; trusted-LAN plaintext/coarse host access; preserved private state; bounded diagnostics and unrelated local responsiveness; Nodes guide.
- Relevant existing behavior confirmed: metadata-only workspaces and path IDs are not storage readiness; native runtime resolvers contain temp/cwd fallback; configured project links have process-local lifetime; physical file/cwd checks exist in parent processes. Additionally, media/static previews and run-artifact reads bypass the explorer facade and perform parent filesystem work directly.
- Scope guardrail confirmed: UC001–007 in scope; no public security platform, Windows, offline merge, shared private state, automatic agent notification or parked collaboration work. Local workspaces, runtime policies and existing previews remain supported.
- Approval interpretation: accept the designer's recorded SR017 choices under explicit user delegation. Do not reopen the hosting/plaintext/hardware-sequencing questionnaire. Independent physical proof remains a delivery gate, not the present finding.
- Every prospective blocking Design Impact is traceable to approved authority: **Yes**, D-001 protects REQ007/008/011, AC006/010 and BEH004/006 (preserving BEH001 local work).
- Remaining material ambiguity in approved intent: **None**. The gap is technical coverage, not a request for new policy.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass — guided create/connect/repeat; launcher local bind/config evidence | Pass — DS001/002, persistent service and selected-node plan | Confirmed | Retain current-build mode/lifecycle validation |
| BEH-002 | User/System | Pass | Pass — workspace selection -> standalone/Team/Org -> native runtime; provisioning/lifecycle/resolver sources | Pass — DS003; no shared fallback, private profiles, existing process owners | Confirmed | Validate all named runtime integrations downstream |
| BEH-003 | Contract | Pass | Pass — native write/sync/close -> peer open; FR026/028/039 | Pass — DS002; common storage, scoped Git, explicit lock limitations | Confirmed | Do not generalize component successes to all modes |
| BEH-004 | Operational | Pass | Pass — SCN004 expressly supports storage outage while requesting shared work | **Fail** — REST content paths bypass the specified DS004 action boundary | Needs Correction | D-001 |
| BEH-005 | Operational | Pass | Pass — chosen source, selected managed node, repeat/detach; launcher and FR033 evidence | Pass — consent, nonroot mapping, private receipts, preserved rollback/source | Confirmed | Validate actual OS consent and preservation before delivery |
| BEH-006 | User/System | Pass | Pass — explorer open/preview/reload uses both GraphQL and REST, not just explorer methods | **Fail** — shared media/static and artifact content lifecycle not allocated | Needs Correction | D-001 |
| BEH-007 | User/Interaction | Pass | Pass — existing NodeManagerTabs/guide pattern | Pass — DS005, truthful release availability and clipboard-only action | Confirmed | Current-build UI/actual asset linkage tests |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Approval SR017 / solution revision SR017 / current handoff | Pass | Pass | Pass | Pass | Pass | None; historical pending choices are explicitly superseded |
| SR017 selection report / experiment ledger / sampled raw rounds | Pass | Pass | Pass | Pass | Pass | Retain failures, single-physical-host and prior-build limits |
| Native folder / backend correctness reports | Pass | Pass | Pass | Pass | Pass | Historical UNFS results are not the selected engine or parity proof |
| Private runtime / native readiness reports | Pass | Pass | Pass | Pass | Pass | Capabilities do not prove production profile/child integration |
| Prior approval/intake/feasibility checkpoints and UI reference inventory | Pass | Pass | Pass | Pass | Pass | Historical context, not competing current requirements |
| Independent implementation/API-E2E/delivery artifacts; external Product spec | N/A | N/A | N/A | N/A | Pass | Not yet produced; external Product support not requested |

No supplement changes approved behavior. Current canonical inventory distinguishes evidence, history and authority. D-001 corrects the core source/path inventory; it does not invalidate the retained experiments.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present for current posture | Pass | Larger Requirement, missing invariant/ownership issue | None |
| Root cause explicit and evidence-backed | Pass | Shared link cleanup FR011; parent physical IO and runtime fallback; general launcher recreation | None |
| Refactor decision explicit | Pass | Narrow shared boundaries; retain existing registry/lifecycle owners | None |
| Decision reflected in concrete design | **Fail** | Physical-IO refactor mapped to explorer/tools/terminal/runtime but not existing REST reads | D-001: finish consumer/owner allocation |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | First use, repeat, service reconciliation, selected-node attach/detach | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Native OS IO -> source -> peer fresh open | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | Run/create/restore/turn -> admission/profile -> native process/tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | Requested shared file/terminal work and result | **Fail** | Pass for named paths | **Fail** | Pass | **Fail** | Pass | **Fail — D-001** |
| DS005 | Nodes guide -> copy -> terminal -> service | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Service reconciliation, exact-child completion, runtime streams and watcher returns are described in the lifecycle sections even where not assigned separate IDs. The material inventory omission is the existing UI -> REST -> parent filesystem -> response path, not merely formatting of the spine table.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SetupService / platform / backend | Pass | Pass | Pass | Pass | User plan/consent, fixed privileged executable, no renderer admin authority |
| SharedMountAccess | Pass | Pass | **Fail** | **Fail** | Metadata getWorkspaceById/getAbsolutePath is still a separate REST access route; D-001 |
| SharedWorkspaceOperationOwner | **Fail** | Pass for explorer | **Fail** | **Fail** | Missing binary/streaming consumer contract and lifecycle; D-001 |
| Core file and existing terminal owners | Pass | Pass | Pass | Pass | Lexical vs physical split, child owns shared calls |
| RuntimeSkillProfile / existing exact process leases | Pass | Pass | Pass | Pass | No second process/catalog owner, no shared generated link fallback |
| DockerNodeAttachment | Pass | Pass | Pass | Pass | Explicitly rejects launcher start_node shortcut |
| Nodes guide | Pass | Pass | Pass | Pass | Display/clipboard only |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Go service -> platform/backend/Docker | Pass | Pass | Pass | Pass | No TypeScript admin or app-owned storage shutdown |
| Core read-only shared access -> server consumers | Pass | Pass | Pass | Pass | No core import of server/database |
| Runtime bootstrap -> profile/source lease -> existing process owner | Pass | Pass | Pass | Pass | No cwd-only pooling for per-generation Codex roots |
| UI content -> REST -> shared IO owner | **Fail** | **Fail** | **Fail** | **Fail** | Blanket thin-route statement does not allocate the actual direct-read consumers; D-001 |
| Guide -> release descriptor | Pass | Pass | Pass | Pass | No browser mount execution |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| SetupService.plan/apply and typed connection metadata | Pass | Pass | Pass | Low | Pass |
| SharedMountAccess.classify/verify | Pass | Pass | Pass | Low | Pass |
| SharedWorkspaceOperationOwner.invoke for existing REST content delivery | Pass | **Fail** | **Fail** | Medium | **Fail — missing stream/result ownership, D-001** |
| RuntimeSkillProfile.acquire / RuntimeSkillExposure | Pass | Pass | Pass | Low | Pass |
| DockerNodeAttachment.apply exact plan | Pass | Pass | Pass | Low | Pass |
| Guide release/command descriptor | Pass | Pass | Pass | Low | Pass |

A streamed response need not become a generic worker API or buffer an entire file. The designer must choose a bounded owned contract that preserves existing content semantics and keeps shared filesystem descriptors out of the parent.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| OS storage provisioning | Pass | Pass | Pass | Pass | No existing cross-computer setup owner; native engines reused |
| Workspace metadata/admission | Pass | Pass | Pass | Pass | Registry stays metadata; separate opt-in attachment |
| Explorer/tools/terminal physical IO | Pass | Pass | Pass | Pass | Child isolation grounded in actual outage contract |
| REST workspace/artifact content | **Fail** | **Fail** | N/A | **Fail** | Existing supported consumers missed by current allocation; D-001 |
| Runtime configured skills | Pass | Pass | Pass | Pass | Reuse catalog, collision policy, source generations, exact leases, AGY capsule |
| Selected Docker lifecycle and guide | Pass | Pass | Pass | Pass | General recreation not reused destructively; existing UI pattern reused |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New Go service/config/platform/backend/Docker | Pass | Pass | Pass | Pass | Control plane only, native NFS data plane |
| Core shared mount and native tools | Pass | Pass | Pass | Pass | Shared read-only contract, no admin/database dependence |
| Server content access | **Fail** | **Fail** | **Fail** | **Fail** | Explorer action owner does not yet cover REST content; D-001 |
| Runtime profiles/native adapters | Pass | Pass | Pass | Pass | Capability-specific adapters, not a second catalog |
| Launcher/release/web guide | Pass | Pass | Pass | Pass | Clear opt-in/publishing/display roles |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mount binding and observation | Pass | Pass | Pass | Pass | Shared core plus Go JSON fixtures; no framework |
| Private runtime exposure and logical/native name mapping | Pass | Pass | Pass | Pass | Runtime capability owns types; adapters preserve exact leases |
| Docker preservation receipt | Pass | Pass | Pass | Pass | Private exact old/new resource state, not parallel catalog |
| Shared content operation lifecycle | **Fail** | **Fail** | **Fail** | **Fail** | Resolve REST/explorer reuse rather than keep direct fs bypass; D-001 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| HostedFilesystem / ClientAttachment / marker | Pass | Pass | Pass | Pass | Pass | Source vs expected mount; UUID distinct from path-hash workspace ID |
| MountObservation / SharedMountBinding | Pass | Pass | Pass | Pass | Pass | Observation not durable readiness; exact child disposition |
| RuntimeSkillExposure | Pass | Pass | Pass | Pass | Pass | Logical/native names are distinct meanings |
| DockerApplyReceipt | Pass | Pass | Pass | Pass | Pass | Private config includes secrets; 0600/no logs |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches Intended Owner? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-nfs internal setup/config/service/platform/backend/docker groups | Pass | Pass | Pass | Pass | Coherent named concerns, no custom data plane |
| core shared-mount and shared file operation owner/worker | Pass | Pass | Pass | Pass | Cross-server/core concern with concrete lifetime |
| server file-explorer facade/shared operation files | Pass | **Fail** | **Fail** | **Fail** | Consumer mapping incomplete; D-001 |
| **server src/api/rest/workspaces.ts and run-file-changes.ts** | **Fail** | **Fail** | **Fail** | **Fail** | Not allocated in final file map despite reachable physical reads |
| runtime profile/bootstrap/client/ACP/AGY files | Pass | Pass | Pass | Pass | Existing owners retained with narrow adapters |
| launcher, release workflow, web guide/localization/tests | Pass | Pass | Pass | Pass | Scoped operational and interaction concerns |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-nfs/ | Pass | Pass | Low | Pass | App-independent control package |
| core workspace-filesystem/shared-mount and tools | Pass | Pass | Low | Pass | No server dependency |
| server file-explorer/shared and runtime-management/backends | Pass | Pass | Low | Pass | Concrete IO/profile concerns |
| REST shared-content delegation | **Fail** | **Fail** | Medium | **Fail** | Target owner/placement missing, D-001 |
| Nodes component/util/localization | Pass | Pass | Low | Pass | Existing pattern |

## Removal / Decommission Completeness Verdict

| Item / Area | Obsolete Piece Named? | Replacement Owner Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared temp/cwd fallback and generated project-skill publication | Pass | Pass | Pass | Pass | Local branches preserved as separate behavior |
| Parent shared physical checks in tools/terminal/Claude | Pass | Pass | Pass | Pass | Child owners replace physical calls |
| Parent shared REST stat/read/stream paths | **Fail** | **Fail** | **Fail** | **Fail** | Missing from cutover/removal map, D-001 |
| UNFS prototype promotion / general launcher recreation shortcut | Pass | Pass | Pass | Pass | Explicitly rejected, not shipping code |
| Dead code in touched modules | Pass | Pass | Pass | Pass | No independently established additional dead code; implementation must remove newly unreachable pieces with evidence, not broad cleanup |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Shared runtime fallback/publisher | No target fallback | Pass | Pass | Local workspace path is preserved behavior, not shared failure fallback |
| Existing persisted readers | No version-specific target branch | Pass | Pass | Known-field readers; no schema version addition |
| Existing ambiguous project links | No owned migration claimed | Pass | Pass | Preserve/report without deleting another node's data |
| REST parent IO | Not a compatibility issue | **Fail** | **Fail** | Reachable omission, not dead/legacy code; D-001 |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| workspaces.json | Directly Usable — No Migration | Pass | Pass | N/A | Pass | WorkspaceRegistryStore retains rootPath identity/semantics; separate attachment |
| Run/definition/native session references | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing scope and session ID reconstruct profile; no stored profile-path authority |
| Generated private profile | Discard or Rebuild after exact release | Pass | Pass | N/A | Pass | Uncertain live profiles not deleted at startup |
| Hosted config / attachment / source marker | New subject | Pass | Pass | N/A | Pass | Atomic exact writes and owned resource receipts; no historical transformation |
| Launcher state plus opt-in reference | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Missing opt-in leaves local behavior; parser must not source user state as root |
| Existing project skill links | Preserve; no automatic migration | Pass | Pass | N/A | Pass | No durable cross-node ownership proof; current collision policy applies |

No project move, recursive rewrite, startup history audit or migration framework is warranted. The finding does not change this transition decision.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Service source/config/install/supervisor | Pass | Pass | Pass | Pass |
| Selected Docker preservation/rollback and launcher opt-in | Pass | Pass | Pass | Pass |
| Shared physical IO cutover | **Fail** | **Fail** | **Fail** | **Fail — D-001 must be covered before enabling shared work** |
| Runtime private profiles and exact release | Pass | Pass | Pass | Pass |
| Guide, validation, delivery | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Bad / Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Same backing storage vs matching names | Yes | Pass | Pass | Pass | Container -> daemon NFS -> source mapping |
| Exact process release vs deadline | Yes | Pass | Pass | Pass | Profile acquire/spawn/observed-close/release |
| Private child cwd and argv | Yes | Pass | Pass | Pass | Fixed trampoline; no interpolated user shell text |
| Shared HTTP content response lifecycle | Yes | **Fail** | **Fail** | **Fail** | Complete consumer-to-child-to-response example needed, D-001 |

## Material Premise Validation (Only When Needed)

### MP-001 — Normal workspace media preview can perform shared IO on the server parent during an approved outage

- Approved authority: REQ007/008/011, AC006/010; BEH004/006, SCN004/006.
- Initiating basis kind: **User**, with the independently approved SCN004 storage-loss contract.
- Supported trigger: user clicks a project image/media file in File Explorer to view it. This is ordinary browsing, not calling a hidden endpoint or modifying internal state.
- Forward current path: `FileItem.vue:141–148` -> `fileExplorerContentActions.ts:47–163` -> `buildWorkspaceContentUrl` in `utils/fileExplorer/workspaceResourceUrl.ts:48–54` -> `GET /workspaces/:workspaceId/content` -> metadata-only `getWorkspaceById` / `getAbsolutePath` -> `fs.existsSync/statSync` and parent `createReadStream` (`server src/api/rest/workspaces.ts:24–39`). HTML preview independently uses the same route owner's `/static/*` sibling (`HtmlPreviewer.vue:30–38`; route lines70–85).
- Lifecycle preconditions/consequence: workspace is already registered; selected hard-mounted storage becomes unavailable as explicitly covered by SCN004. An uncached physical check/read needs the NFS server. Parent synchronous calls can prevent the <=10s response and unrelated local operations; later parent streams also bypass the proposed retained action child. FR028/029 prove the underlying stall/check-use limitation, not that this REST route was experimentally exercised.
- Scenario validity: **Supported Explicit Edge Scenario** over a supported normal UI action.
- Reachability: **Reachable**, by current caller trace plus approved operational contract. No hostile filesystem mutation or artificial concurrency required.
- Review consequence: D-001; allocate these existing reads to bounded shared IO ownership. Do not add a new general filesystem proxy/security platform.

### MP-002 — Viewing an agent's completed shared-project artifact uses a second direct-read path

- Approved authority: REQ007/008 and preserved BEH002/006; AC006; SCN002/004.
- Initiating basis kind: **User**, with SCN004's supported unavailable-storage contract.
- Supported trigger: after an agent writes a shared-project output, the user selects its artifact/content preview. `ArtifactContentViewer.vue:128–142` uses live buffered content only while pending/streaming; a completed artifact resolves the run-content URL.
- Forward path: ArtifactContentViewer -> `/runs/:runId/file-change-content` -> `RunFileChangeProjectionService.resolveEntry` (run-history service lines71–80 resolves actual workspace path from existing run metadata/projection) -> parent `existsSync/statSync/createReadStream` (`src/api/rest/run-file-changes.ts:28–50`). This does not acquire WorkspaceFileExplorer or its proposed action owner.
- Lifecycle consequence: with the shared mount unavailable, the same parent blocking/lifetime bypass occurs despite an earlier successful run-admission check. Private run history does not make the referenced project bytes local. No resumption, corrupted history or manufactured file is needed.
- Scenario validity: **Supported Explicit Edge Scenario** over normal result inspection.
- Reachability: **Reachable**.
- Review consequence: same D-001 boundary completion; preserve existing run-entry authorization, pending/deleted semantics and local content behavior.

No finding or new mechanism is based on automatic remote notifications, malicious trusted hosts, arbitrary force-unmounts, or other excluded scenarios.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Existing REST content consumers omitted from target IO ownership | Ordinary supported views bypass shared admission/isolation and can block unrelated local use | D-001; update current/target path map, bounded content contract, file/removal map and tests | Open — Design Impact |

## Review Decision

**Fail — one blocking Design Impact (D-001).** The design is otherwise substantially actionable and its approved scope/engine selection is not reopened. This is not Blocked on hardware, permissions, product choices or a speculative recovery requirement.

## Findings

### D-001 — Complete shared-content admission and child ownership for existing REST readers

- Type: **Design Impact**.
- Severity: **High / blocking**: an ordinary shared-file preview can retain the parent synchronous-NFS path and thereby violate unrelated local responsiveness.
- Approved authority protected: **REQ007, REQ008, REQ011; AC006/010; BEH004/006 and preserved local BEH001**.
- Scope status: **Within Approved Scope**.
- Changes approved behavior: **No**. No renewed product decision is requested.
- Affected journey: existing workspace media/static previews and agent-artifact result inspection on a configured shared project, including the explicitly supported storage outage.
- Evidence: source paths/line ranges in MP-001/002. Design `Application Admission, File Actions And Child CWD` (lines154–175), boundary table (198–205), removal table (227–233), final file map (254–259), and validation obligations (282) allocate explorer/core/terminal/runtime work but omit the direct REST consumers and their content-return lifetime. `getWorkspaceById` (`workspace-manager.ts:280–282`) is only a cache lookup; `getAbsolutePath` (`filesystem-workspace.ts:75–80`) is lexical. Keeping these metadata-only is correct, but it means guarding provisioning or the explorer facade does not intercept these reads.
- Material premises: **MP-001, MP-002 — Reachable**. A component readiness Pass is not a permit for a later direct parent syscall, and a Promise deadline cannot free a parent blocked in synchronous IO.
- Required update: trace the supported workspace/media/static and run-artifact readers; choose their authoritative shared-content access boundary, reusing the proposed bounded IO owner where appropriate. Specify how physical validation/read/stream work stays in an exact child, how response completion/disconnection/deadline retains/releases that child truthfully, and how existing binary/content and authorization/error semantics remain intact. Add the concrete REST consumer files to the integration/removal map. Include current-build route/UI outage checks with local responsiveness and no-fallback assertions, as well as healthy binary/static/artifact content checks. Do not merely add a preflight before the same parent `stat`/stream calls or buffer arbitrarily large files as a shortcut.
- Proportionality: closes already-exposed in-scope consumers using the already-justified child boundary. Does not require a new distributed service, general worker framework, new threat model, or exhaustive scan of unrelated private file routes.
- Recommended recipient: **/software_engineering_team/solution_designer** for design revision and re-review.

## Classification

**Design Impact**. Large/High retained. No Requirement Gap or unsupported premise is used to block progression.

## Recommended Recipient

**/software_engineering_team/solution_designer**, subject to the fresh configured handoff rule. No implementation handoff on this result.

## Residual Risks

- Current-source installer, actual OS approval, native Linux/bind-source packaging, selected Docker rollback and restart, runtime skill/cwd integration and UI are downstream validation obligations, not proven by historical prototypes.
- Independent physical Mac/Linux/private-LAN plus Mac Docker and explicit user verification remain mandatory before delivery. No physical target or live-mutation authority is inferred.
- Exact child/process retention is appropriate for approved hard-NFS outages; it does not promise deadlines for every native syscall or durable in-flight writes.
- Backend qualification must retain local-only Mac-v3 advisory-lock limits, case/ownership constraints and Linux-v4 cross-client lock evidence. Apple's documented `mapall` behavior covers all client UIDs and export conflicts must be handled without overwriting unrelated exports; this supports the selected design boundary, not final-version qualification. [Apple exports reference](https://raw.githubusercontent.com/apple-oss-distributions/NFS/main/nfsd/exports.5)
- Docker volume options are interpreted by the daemon's mount path, consistent with verifying daemon reachability separately from host mounting. Historical and official support do not replace actual installer preservation tests. [Docker volumes](https://docs.docker.com/engine/storage/volumes/)
- No encryption/accounts, Mac-Docker storage hosting, auto-notifications, arbitrary data migration or unrelated private-route refactor is required by this review.

## Latest Authoritative Result

- Review Decision: **Fail**.
- Material-Premise Gate: **Pass** — the sole finding has independent supported triggers and forward production traces; no speculative machinery requested.
- Notes: **ARCH-REV-001 / SR-017 / D-001 open**. Persisted baseline established; no production source or upstream artifact changed. A targeted solution revision and re-review are required before implementation routing.
