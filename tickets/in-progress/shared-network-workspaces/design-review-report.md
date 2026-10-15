# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, **Approved SR018**; approval017/018 and DEC015 unchanged.
- Upstream Investigation Notes: `investigation-notes.md`, current SR023 supplement inventory.
- Upstream Solution Revision Record: `solution-revision-record.md`, **SR023**; previous history retained.
- Reviewed Design Spec: `design-spec.md`, **Ready SR023**, commit **a4be96c45d4e9799c3dc18fc6b690b7edf579477**.
- Supplemental Task Artifacts Reviewed: current handoff; CRR012 report/source trace/mac evidence and API005 raw Mac receipts; SR023 identity investigation, primary contracts/installed manuals, persisted-state evidence, probe source/build/harness/results/attempts/cleanup; prior resolution reports and raw API005 Linux freshness receipts. Full1346-reference input `evidence/design-recovery/sr023/package-index.json` preserves all1302 incoming references. Prior IR001–008/ARCH001–006/CRR001–012/API001–005 remain at their recorded scopes, not wholly reexecuted.
- Relevant Solution Revision IDs: SR023 correction; ApprovedSR018 and SR019–022 policies preserved.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-007**; round **7**, 2026-10-15.
- Trigger: **CRR012 Fail / Design Impact CR007 P1 / API-F005**, ordinary native-Mac boot rejects the same source.
- Prior Review Round Reviewed: ARCH006 Pass on SR022, not approval of SR023; prior dispositions rechecked first.
- Latest Authoritative Round: this architecture report only. **CRR012 Fail and API005 Fail57.14% / broader Required remain current at their boundaries.**
- Ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`. Ticket links below are relative; production paths are worktree-relative.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; finalization `origin/personal`.
- Current-State Evidence Basis: personal source/contract/raw-receipt review and `architecture-review-evidence/arch-rev-007/review-audit.py` / `review-checks.json`.1346 existing unique refs;1342 manifest and1296 protected hashes checked excluding two reviewer authorities;286 old dist files unchanged. Current designer authorities compared to input commit; production d65aeda24fc4b9a534a3941b194dd4a55b88c00c unchanged; approved basis byte-identical to prior review.11 dependency observations,9 incoming Mac failure observations and80 prior freshness checks re-evaluated. Root DESIGN/TESTING, migration guideline, shared principles, Example9 and full28-section template applied; no closer NFS/ticket AGENTS. **No reviewer build, suite, VM, mount, Docker, app or provider execution.**

## Routing Classification Review

- Task size **Large**, architectural risk **High**; independent architecture review required **Yes**.
- Cumulative privileged multiplatform storage/client/runtime integration remains Large. This bounded delta spans a few files but changes persisted source identity and retry admission: High independently of evidence volume. No new subsystem or broad reaudit justified.
- No classification correction or renewed behavior approval required. Fresh handoff rules govern routing.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**.
- Approved SCN009/012/013, BEH001/004/005, REQ014/017/019 and AC007/014/017/018/019 require healthy same-source restart/retry without manual mounting, while preserving original bytes and refusing replacement. DEC015 does not defer ordinary healthy boot.
- Current path: public create -> Plan/SourceIdentity -> Apply/hosted and pending records -> launchd RunAtLoad -> serial supervisor/admin lock -> Reconnect/CheckConfiguration/CheckSource -> Apple Ensure/mount/nonroot proof. Raw st_dev+inode is currently durable on both OSes. API005 shows changed raw device with unchanged APFS volume/inode/source; the guard fails before backend/mount. Status separately sees no matching mount. This is not an IR008 regression or nfsd-start failure.
- Target: Mac APFS volumeUuid+inode, Linux device+inode unchanged; platform captures, config validates shape, setup binds/persists once. Trusted actual-device diskutil observation, not guessed device or marker-only fallback. Existing supervisor/consent/order remains.
- Scope Guardrail: UC001–007 retained; affected source/identity/pending wiring/tests/docs only. No source/marker/private-data migration, runtime/REST/UI, engine, mount-policy or restart-policy expansion. Only Mac Docker STORAGE is deferred; native Mac and both-OS clients remain required. New product/migration/security obligations require upstream approval, not reviewer invention.
- Every prospective blocking Design Impact traceable to approved authority: **Yes; no new blocker accepted**. Remaining ambiguity blocking implementation: **None**. Public corrected lifecycle remains unverified.

| Behavior ID | Kind | Design Alignment | Trigger / Current Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH001 | Operational | Pass | Pass — public create and chosen-source contract | Pass — DS001 captures correct identity before export | Confirmed | Current public Mac create proof |
| BEH002 | User/System | Pass | Pass — workspace/run/native tools | Pass — DS003 unchanged | Confirmed | Retain private-link/tool matrix |
| BEH003 | Contract | Pass | Pass — healthy shared IO, API005 Linux freshness | Pass — DS002 unchanged | Confirmed | Preserve scoped resolution and remaining modes |
| BEH004 | Operational | Pass | Pass — ordinary boot/reconnect, MP011 | Pass — DS001/006 stable binding before effects | Confirmed | Automatic mounted nonroot RW first |
| BEH005 | Operational/Contract | Pass | Pass — retry/source preservation, MP012 | Pass — bound pending reused, detach exact-owned | Confirmed | Bind-once/refusal/partial-retry checks |
| BEH006 | User/System | Pass | Pass — normal previews/completed artifacts | Pass — DS004 unchanged | Confirmed | Healthy current-product coverage remains |
| BEH007 | User/Interaction | Pass | Pass — Guide/release availability | Pass — DS005 unchanged | Confirmed | No qualification/publication claim |

**Prior findings:** CR006/API-F004 independently resolved by API005 at Linux native+Docker STORAGE/native+actual managedHTTP scope:40 unique1KiB/1MiB fixtures,80 reads, all<=5s. Recomputed maxima native storage0.927933s/native and0.934914s/HTTP; Docker storage0.827498s/native and0.839105s/HTTP. Not full AC003. CR005 retains API004/005 normalboots and separate Stop/policy/replacement/detach controls; recorded DNS null->[] normalization is not raw HostConfig equality. CR001–004 retain exact scopes. D001 deferred/not repaired; IMP-D001 current-source links/independent Source Update-Remove/AGY policy unchanged. **CR007 design accepted, not product closure.** Earlier raw-device selection lacked cross-boot evidence; the existing comparison faithfully exposed that design limitation.

## Supplemental Artifact Coherence Verdict

| Artifact | Scope Clear? | Linked To Core? | Complete At Scope? | Consistent? | Status/Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Requirements/approval/scope feedback | Pass | Pass | Pass | Pass | Pass | No new approval inferred |
| SR023 design/investigation/history/handoff | Pass | Pass | Pass | Pass | Pass | Current API-F005-first sequence supersedes historical orders |
| CRR012/API005 failure and prior-resolution evidence | Pass | Pass | Pass | Pass | Pass | Preserve current Fail and scoped independent closures |
| SR023 probe/contracts/state/cleanup | Pass | Pass | Pass | Pass | Pass | Dependency feasibility only, not public product |
| Earlier cumulative supplements | Pass | Pass | Pass | Pass | Pass | Reuse unaffected evidence, do not repeat whole audit |
| Reviewer audit/attempt note | Pass | Pass | Pass | Pass | Pass | Receipt checks only; no runtime signoff |

Four designer canonical documents and evidence changed; production, requirements and specialist authorities did not. External Product specification **N/A — not applicable**; Delivery **N/A — not performed**. Actual helper rejects symlinks/permission failure; replacement “refusal” is harness comparison of captured values, not a product command. The design states that distinction correctly.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture assessed | Pass | SR023 health paragraph and exact current-source trace | None |
| Root classification supported | Pass | Missing invariant/shared-model lifetime mismatch; rawdev changes on ordinary boot | Do not label local IR008 regression |
| Refactor/no-refactor explicit | Pass | Small OS-specific extraction, strict binding validation and existing pending sequencing | No broad source/supervision owner |
| Concrete design supports decision | Pass | Identity variants, fd mapping, state dispositions, file map and tests | Implement bounded correction only |

## Spine Inventory Verdict

| Spine | Scope | Readable? | Narrative Clear? | Facade/Owner Clear? | Naming Clear? | Ownership Clear? | Off-Spine Appropriate? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | Command -> plan/consent -> bind/persist -> engine/mount -> usable path; retry/detach | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Original source write -> engine/VFS -> client -> fresh peer read | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | Workspace/run -> binding/private exposure -> runtime/native tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | Preview/content request -> existing REST/OS reader -> stream -> UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS005 | Nodes Guide -> release descriptor -> user's terminal -> DS001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS006 / DS006-L | Boot/job -> host proof -> selected failure eligibility/probe/consume/same-ID Start -> API | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

SR023 adds detail inside DS001 and the host-proof portion of DS006, not another primary owner. Bounded local capture is canonical-path/fd observation -> actual volume query -> correlation -> persistent identity/error. Bound/unbound pending sequencing remains within SetupService. Return errors propagate without exporting, rebinding or false readiness.

## Boundary Encapsulation Verdict

| Boundary | Entry Clear? | Internals Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| CLI -> SetupService | Pass | Pass | Pass | Pass | Consent/admin lock and lifecycle stay authoritative |
| Setup -> platform source | Pass | Pass | Pass | Pass | Capture/comparison below platform; no per-caller diskutil policy |
| Config -> current Identity validation | Pass | Pass | Pass | Pass | Metadata versus complete binding explicit |
| Platform -> Commands / OS | Pass | Pass | Pass | Pass | Fixed trusted executable, clean environment, actual fd mount mapping |
| Backend/runtime/HTTP | Pass | Pass | Pass | Pass | No identity repair or alternate reader |

## Dependency Direction / Forbidden Shortcut Verdict

| Boundary | Allowed Dependencies Clear? | Shortcuts Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Setup -> config/platform/backend | Pass | Pass | Pass | Pass | Persist binding before later source/export effects |
| Platform -> fixed system command | Pass | Pass | Pass | Pass | No shell/PATH lookup/guessed disk/all-disk enumeration |
| Supervisor -> Reconnect | Pass | Pass | Pass | Pass | No duplicate capture policy or pending recreation |
| Current reader -> current binding | Pass | Pass | Pass | Pass | No old-pair fallback, marker-only match or mismatch rewrite |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular Responsibility? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| SourceIdentity / CheckSource with existing Runner | Pass | Pass | Pass | Low | Pass |
| Identity validation selected by Hosted.Backend | Pass | Pass | Pass | Low | Pass |
| Plan / Apply / PendingPlan / SaveIntent | Pass | Pass | Pass | Low | Pass |
| CheckConfiguration / Reconnect / Status / Detach | Pass | Pass | Pass | Low | Pass |

OS capture seams belong at platform, not independently injectable per-caller policy. Status reports errors without repair; Detach does not gain a live-source-availability dependency. No new public setup command or durable selector.

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Area Checked? | Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Persistent source observation | Pass | Pass | Pass | Pass | OS-specific files within existing platform |
| Trusted commands | Pass | Pass | N/A | Pass | Reuse Commands; no runner framework overhaul |
| Current binding shape | Pass | Pass | Pass | Pass | Config extraction optional and cohesive |
| Retry persistence | Pass | Pass | N/A | Pass | Existing atomic Store/SaveIntent/admin lock |
| Nonroot/source marker proof | Pass | Pass | N/A | Pass | Separate existing checks retained |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear? | Reuse/Extend Sound? | Correct Spine Owner? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| platform | Pass | Pass | Pass | Pass | Observation/correlation/comparison |
| config | Pass | Pass | Pass | Pass | Shape and private exact persistence |
| setup | Pass | Pass | Pass | Pass | Binding moment, consented retry, ordered effects |
| service/backend/docker | Pass | Pass | Pass | Pass | Existing lifecycle/data plane, no new policy |
| tests/docs/packaging | Pass | Pass | Pass | Pass | Boundary coverage/current CLI metadata, retained engine |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated? | File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| config.Identity | Pass | Pass | Pass | Pass | Tight backend-selected variants, no schema version |
| Common source path/correlation checks | Pass | Pass | Pass | Pass | Existing platform source owner, OS capture split |
| Pending plan/hosted records | Pass | Pass | Pass | Pass | No second journal/READY cache/history |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning? | Redundancy Controlled? | Overlap Controlled? | Core/Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Apple Identity | Pass | Pass | Pass | Pass | Pass | Canonical nonzero volumeUuid + nonzero inode; Device absent/zero |
| Linux Identity | Pass | Pass | Pass | Pass | Pass | Positive device/inode; no volumeUuid; existing semantics |
| Unbound new-source intent | Pass | Pass | Pass | Pass | Pass | All-zero only before first binding; not partial or old Apple state |
| Raw mount observation | Pass | Pass | Pass | Pass | Pass | Capture-local device/fsid/mount mapping, not durable equality |
| Marker / attachment / runtime data | Pass | Pass | Pass | Pass | Pass | Storage UUID remains separate; unchanged meaning |

Adding volumeUuid does not reinterpret Device. Mixed/partial bindings refuse; a complete binding wins over stale NewSource. No duplicated platform tag, magic sentinel, schemaVersion or fallback representation.

## File Responsibility Mapping Verdict

| File | Clear Responsibility? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| internal/platform/source.go | Pass | Pass | Pass | Pass | Common path checks and binding comparison |
| internal/platform/source_darwin.go / source_linux.go | Pass | Pass | Pass | Pass | Darwin fd/diskutil observation; Linux current pair |
| internal/config/state.go; optional source_identity.go | Pass | Pass | Pass | Pass | Typed binding validation, not command execution |
| internal/setup/plan.go / apply.go / pending.go | Pass | Pass | Pass | Pass | Initial/resumed binding and save-before-effects |
| internal/setup/lifecycle.go / CheckConfiguration owner | Pass | Pass | Pass | Pass | Complete current validation/check before backend/mount |
| Adjacent tests / NFS README | Pass | Pass | N/A | Pass | Actual variants/lifecycle and fixture-cutover instructions |
| Engine/REST/UI/runtime/release workflow | Pass | Pass | N/A | Pass | Unchanged, not correction targets |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Matches Owner? | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| platform OS source files | Pass | Pass | Low | Pass | Build-selected capture, not new subsystem |
| config binding validator | Pass | Pass | Low | Pass | Optional extraction justified by cohesive invariant |
| setup and adjacent tests | Pass | Pass | Low | Pass | Existing sequencing owner, no generic recovery folder |

## Removal / Decommission Completeness Verdict

| Item | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cross-OS durable device equality | Pass | Pass | Pass | Pass | Remove on Mac, retain Linux pair semantics |
| Bound pending recapture on NewSource | Pass | Pass | Pass | Pass | Compare/reuse complete binding; distinguish true zero intent |
| Legacy Apple acceptance/refresh branch | Pass | Pass | Pass | Pass | Not introduced; old bound fixtures explicitly disposed |
| Existing source/marker/permission/reconnect machinery | Pass | N/A | Pass | Pass | Reachable and preserved, not dead code |

No additional dead source established. Remove imports/helpers/tests actually made unreachable by this correction; no broad cleanup of reachable platform/backend code. No new unrelated follow-up; FUP001 remains PM-owned.

## Legacy / Backward-Compatibility Verdict

| Area | Legacy/Dual Path? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Current identity reader | No | Pass | Pass | Strict current backend variant; no old Apple fallback |
| Linux pair | No | Pass | Pass | Current platform variant, not legacy compatibility |
| Plist extra fields | No | Pass | Pass | Ignore irrelevant typed content, reject ambiguous required values |
| Owned unqualified fixture rebuild | No | Pass | Pass | Matching old candidate detach before new install; no runtime migration |

## Persisted-Data Transition Verdict (When Applicable)

| Subject | Decision | Reader/Semantic Evidence? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Current Apple bound hosted/pending | Directly usable | Pass | Pass | N/A | Pass | UUID+inode survives observed device reassignment |
| Current Linux bound state | Directly usable unchanged | Pass | Pass | N/A | Pass | No new UUID requirement |
| Truly zero NewSource intent, no hosted record | First binding on consented retry | Pass | Pass | N/A | Pass | Not an established source identity; absence retains intent |
| Partial/old bound Apple / hosted-unbound inconsistency | Preserve/refuse; owned fixture rebuild only | Pass | Pass | N/A | Pass | Cannot infer original UUID from current path |
| Project/marker/attachment/node/private/runtime state | Directly usable unchanged | Pass | Pass | N/A | Pass | No source deletion/copy/relocation/UUID regeneration |
| Actual supported retained installation, if discovered | Return concrete transition evidence before cutover | Pass | Pass | N/A | Pass | No unsupported claim of universal deployment absence |

Local origin/personal tree, containing-tag search, release lock with empty qualification and known installed API fixture/cleanup evidence support no established released predecessor here. Old Apple bytes do not contain the missing historical volume fact. A tolerant reader cannot safely invent it. Matching-old-candidate drained detach precedes replacing the command; fresh current create reuses preserved source/marker for exact-owned unqualified fixtures. New readers retain unsupported records with an actionable error, not silent conversion or deletion. No server migration/startup owner is added. The narrow unavailable storage capability must not become application-wide history/startup gating.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Config variant + platform capture | Pass | Pass | Pass | Pass |
| Plan/new Apply/pending bind-once persistence | Pass | Pass | Pass | Pass |
| Current validation before reconnect effects | Pass | Pass | Pass | Pass |
| Exact old fixture teardown then current public setup | Pass | Pass | Pass | Pass |
| Source review -> API-F005 first -> remaining gates | Pass | Pass | Pass | Pass |

No cross-resource atomicity claim. Save failure stops before export. Existing supervisor still refuses pending setup; consented retry, not automatic rebind, owns it. No engine rebuild or temporary dual-runtime identity path.

## Example Adequacy Verdict

| Topic | Needed? | Clear Example? | Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Mac versus Linux identity | Yes | Pass | Pass | Pass | volumeUuid/inode versus device/inode |
| Complete/stale-flag versus unbound pending | Yes | Pass | Pass | Pass | Complete reused, all-zero may bind; partial/hosted inconsistency refuses |
| Real replacement control | Yes | Pass | Pass | Pass | Same inode/rawdev/copied marker but different volume UUID |
| Dependency versus product acceptance | Yes | Pass | Pass | Pass | Helper boots/comparison do not prove automatic public mounted RW |

## Material Premise Validation (Only When Needed)

### MP-011 — Same original APFS source after ordinary machine restart

- Authority/behaviors: SCN009/012/013, BEH001/004/005, REQ014/017/019; AC007/014/017/018/019. Reuses CRR012 premise ID.
- Initiating basis: **Operational / Supported Normal Scenario**. Owner completes public native-Mac create on a supported nonempty APFS source, ordinarily reboots the same host, then resumes shared work. Approved restart contract exists independently of the proposed identity mechanism.
- Forward witness: create -> Plan/SourceIdentity -> Apply saved pair -> OS launchd service -> locked serial Reconnect -> CheckConfiguration/CheckSource -> pair mismatch before Apple Ensure/mount. Public reconnect reaches the same guard; Status observes no mount.
- Preconditions/consequence: original source remains available; raw device16777228 becomes30/27/30 across three boots, inode506781/501:20/755 and bytes/marker/saved record unchanged. Third-boot actual-device plist confirms same APFS VolumeUUID. Nine second/third-boot observations and two explicit reconnect failures corroborate the deterministic predicate, not a210s SLA. No manual hidden-state edit establishes reachability.
- Reachability: **Reachable**. Corrected capture must survive reassignment without accepting a different directory/volume.
- Response: platform observes persistent volume UUID+inode; existing config/setup persist and validate it. No retry escalation, marker bypass or identity rewrite. Eleven designer dependency observations support feasibility; current public correction still required.

### MP-012 — Retry must preserve an already-established source binding

- Authority/behaviors: REQ014/017, AC014/017, SCN009/012, BEH001/005; supported partial-setup retry and same-source preservation contract.
- Initiating basis: **Contract exercised by public consented create/reconnect**. User creates a new source through guided setup; a later setup step does not complete, then user reviews and retries the same intended configuration. Approved partial retry, not an invented corrupt-record workflow, supplies the basis.
- Forward witness: Apply saves NewSource intent -> nonroot CreateSource -> capture -> existing marker/handle/hosted work -> SaveIntent currently retains NewSource -> later mount/node/job step may leave pending setup under the explicitly supported incomplete-setup contract -> interactive PendingPlan currently recaptures when that flag is true. Service refuses pending setup, so it cannot be an automatic recreation owner.
- Preconditions/consequence: an identity can already be bound while the old flag says new. Recapture would discard the evidence that retry must compare; genuinely zero initial intent has no such evidence. Same-source refusal applies at this boundary without inventing hostile timing or a new security promise.
- Reachability: **Reachable governing retry/preservation contract**. Failed-step fixtures exercise this actual sequence, not proof of arbitrary corruption support.
- Response: bind once, clear NewSource and atomically save before later source effects; complete pending identity reused/compared regardless of stale flag. True zero intent may establish first binding only through fresh plan/consent; old/partial/mixed and hosted-unbound inconsistency refuse. Reuse existing Store/lock, not a second journal.

Apple's pinned [XNU mount header](https://raw.githubusercontent.com/apple-oss-distributions/xnu/xnu-12377.1.9/bsd/sys/mount.h) supplies mount-observation fields and local flag. Retained installed diskutil(8)/statfs(2) manuals document device info-plist and fd filesystem observation. Actual SR023 plists validate the selected field names; `Mounted` is absent. The older [getattrlist manual](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/getattrlist.2.html) distinguishes device/object attributes but is not a modern APFS lifetime guarantee. UUID+inode stability is an evidence-supported inference from actual boots/replacements, not an anti-clone guarantee or all-platform certification.

MP001/002 remain reachable outage IO explicitly deferred DEC015; MP003/004 independent source deletion/current links unchanged. MP005 dependency fix, MP006 reboot fix and MP009 freshness now retain their independent scoped closures; MP007/008 Stop distinctions and MP010 exact-owned config lifecycle remain. No unsupported/Not-Reachable premise drives new machinery. Hypothetical supported old deployments are not established by schema existence; no migrator is selected. Evidence of an actual retained supported install must resolve its transition before that cutover, rather than being guessed safe.

## Unresolved Approved-Behavior Or Current-State Gaps

**None blocking architecture handoff.** Public corrected Mac lifecycle and remaining qualification are downstream implementation/validation obligations, not ambiguous approved intent. If actual deployment evidence or current-product failure contradicts this choice, return it to Solution Designer; do not silently weaken replacement protection or narrow the platform. FUP001/access prerequisites unchanged.

## Review Decision

**Pass — ARCH-REV-007 / Ready SR023 / unchanged Approved SR018.** Bounded persistent identity, trusted capture and bind-once lifecycle design is implementation-ready. This does **not** close CR007/API-F005 or replace CRR012/API005 verdicts.

## Findings

**No new blocking findings.**

- CR007/API-F005: design recovery accepted; implementation/source/API closure pending.
- CR006/API-F004: independently resolved at API005 Linux native+Docker STORAGE/native+managedHTTP scope only.
- CR005/API-F003 and CR001–004: retain independently recorded scopes, no reopening.
- D001: deferred/not repaired. IMP-D001: current-source/private-profile/AGY policy preserved.

Prior-finding resolutions are in ARCH-REV-007; no renumbering or downstream report rewrite.

## Classification

**Pass**, Large/High retained. No new Design Impact, Requirement Gap or Unclear blocker; no new behavior/security/migration obligation.

## Recommended Recipient

Exact primary implementation recipient from fresh rules, with complete cumulative package. Personal work only; no delegation/spawning or duplicate API dispatch. Informational Solution Designer notice only under the applicable post-primary-success rule; not duplicate forwarding authority.

## Residual Risks

- **API-F005 FIRST after implementation and selected source review:** current PUBLIC nativeMac create, >=2 ordinary whole-host boots (more if needed to witness actual raw-device change), automatic mounted nonroot RW before any manual reconnect/repair; separately public reconnect and real directory/volume replacement refusal. Retain original bytes/marker/identity/modes/private config and actual installed CLI/job/export/mount proof. No synthetic identity edits, manual repair or helper substitution.
- Prototype is no-cgo arm64 dependency execution on one Mac26.6.2/25G83 guest. amd64 compile is not execution; same-volume public clones do not establish global UUID uniqueness. Replacement and symlink controls are limited to their actual helper/comparison scope. Private/OS-permission refusal still needs product coverage.
- Implement the specified parser, not a blind probe copy: complete single plist/dict, unique typed keys, bounded accepted input, trailing-data refusal, valid nonzero UUID and exact device/mount/filesystem correlation; recheck observation and close fd on every exit. Probe success is not adversarial parser coverage. The1MiB accepted-payload bound is not a newly promised global process memory/time deadline for existing Commands.
- One trusted diskutil query per capture adds observed0.0788–0.7405s dependency cost, not a restart SLA. No cache/global enumeration/runner overhaul or hostile administrator atomic-mount guarantee justified.
- Focused durable tests must cover existing/new/unbound/complete/stale-flag/partial/old binding, save-before-later-failure, no stored mutation on mismatch, no backend/mount effects after refusal, plus Linux pair/path/nonroot regressions and fd/parser controls. Current Apple strict variants cannot silently adopt old bound state.
- Preserve proportionate Linux freshness and ordinary reboot/Stop/policy-no/unselected/replacement/detach regressions. Keep full remaining bothOSnative+managedclients/LinuxnativeDockerstorage/independentphysical/nativeactualtools+unreadlinkedassets+peerclose+restore/Standalone-Team-Org/completedartifact+healthy previews gates. af9f23 successful test-code review still awaits a passed API package.
- Nativeamd64 engine/hostedworkflow/signing/publicbootstrap/docs/userverification/finalization/authorizedrelease remain unqualified. Empty release qualification/Guide unavailable stay truthful. D001/DEC015, IMP-D001, FUP001 PMcustody, trusted-LAN/privateLAN/peerNAT/profile/inference prerequisites unchanged. No release/merge/push/tag/TaskDone/user-verification claim.
- No reviewer live resource requires cleanup; upstream exact-owned cleanup Complete, five old dist trees untouched. Reviewer audit timestamp assertion correction is recorded, not hidden as product evidence.

## Latest Authoritative Result

- Review Decision: **Pass — ARCH-REV-007 / Ready SR023 / Approved SR018**.
- Material-Premise Gate: **Pass** — supported ordinary boot and established retry/source-preservation contracts ground the correction.
- Notes: CR007 design accepted, corrected public product unproved. **CRR012 Fail / API005 Fail57.14% remain authoritative.** Reviewer changes only report/history/evidence; no source execution or release claim.
