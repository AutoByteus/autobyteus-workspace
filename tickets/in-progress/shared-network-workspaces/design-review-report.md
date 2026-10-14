# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md`, **Approved SR018**, approvals018/017 unchanged; scope feedback and DEC015 retained.
- Upstream Investigation Notes: `investigation-notes.md`, current SR020 plus canonical cumulative supplement inventory.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-020.
- Reviewed Design Spec: `design-spec.md`, **Ready SR020**, commit `957b052f4b222b7ddb14e148fd5439ba10122379`.
- Supplemental Task Artifacts Reviewed: cumulative solution handoff; current IR004, CRR005 and API002 reports/history; CR003/API-F002 origin evidence and primary contracts; SR020 compatibility report, all three attempt scripts/results/cleanup and audits. Complete incoming chain: `evidence/design-recovery/sr020/package-index.json` (328 existing references). Historical feasibility remains scoped evidence, not current qualification.
- Relevant Solution Revision IDs: SR-020 technical recovery; Approved SR-018; SR-019 source/profile ownership preserved. Trigger: **CRR-005 / CR-003 / API-F002**, after implemented IR002–004 and API-REV-002.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-004**.
- Current Review Round: **4**, 2026-10-14.
- Prior Review Round Reviewed: ARCH-REV-003 Pass on SR019; prior D-001 and IMP-D001 dispositions rechecked first. No prior Pass is carried automatically to SR020.
- Latest Authoritative Round: this report / ARCH-REV-004 for architecture only. CRR005 Fail/Design Impact and API002 Fail/57.14%/broader Required remain their owners' latest results.
- Canonical ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
- Worktree/branch/finalization: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, `codex/shared-network-workspaces`, `origin/personal`. Source paths below are worktree-relative; ticket paths are relative to the canonical ticket root.
- Current-State Evidence Basis: independently traced actual Go setup/install/probe/reconnect and release metadata/workflow/Docker paths; checked authoritative upstream correction, existing V4.3 handler and Ubuntu source identities; reviewed raw prototype outcomes and limitations. Recomputed production aggregate **497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da**; SR020 changes ticket artifacts only. Requirements/approvals remain byte-identical to5251ab48bc. Input checks are in `architecture-review-evidence/arch-rev-004/review-checks.json`. Applied reviewer skill/template/shared principles and unchanged root DESIGN/TESTING/package instructions. Five preexisting untracked dist trees left untouched. **No reviewer build/product test/VM/provider/live-resource execution.**

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**; independent review required: **Yes**.
- Whole-package scope remains substantial across privileged native/Docker storage, runtime/private state, launcher and distribution. The recovery itself is narrower: accepted dependency backport and exact package delivery, not reimplementation of IR002–004.
- Backport provenance, privileged package installation and release identity still warrant independent review. No classification correction or route downgrade. On Pass send the cumulative reviewed package to the configured implementation recipient, then informational notice only to Solution Designer.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: **Confirmed**. This confirms intended behavior and the corrected target path, not that current production passes Linux qualification.
- Approved intent: one-command healthy create/connect/reconnect of ordinary shared projects, same source/UUID, nonroot mapping, private-state and selected-node preservation. Native Linux and Docker-on-Linux storage, native/managed-Docker clients on both OSes remain required; only Mac-Docker storage hosting is deferred.
- Current behavior: implemented stock Noble Ganesha4.3 path mounts successfully but can fail ordinary directory traversal during the exact nonroot readiness check. CRR005 reproduces outside Go; current source truthfully refuses READY. This is a supported normal workflow, not DEC015's deferred outage case.
- Scope guardrail/preservation: REQ001/003/004/006/014/017/018/019, AC012/018/019, SCN001/011/013, BEH001/004/005 support compatibility recovery. Keep confinement, identity, allowlists, squash, hard4.1, current Ubuntu/kernel and selected deployment roles. No new security policy, kernel ceiling or requirement is introduced.
- Every prospective blocking Design Impact traceable to approved authority: **Yes; no new blocker accepted**. Remaining material ambiguity: **None preventing this design handoff**. Clean package installation, other architectures/storage modes and the broader product remain unqualified, explicitly downstream.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH001 | Operational | Pass | Pass — public native create, API002 failures and SR020 candidate creates | Pass — DS001 replaces exact dependency bytes, retains setup/probe | Confirmed | Fresh new public install/create without manual engine preinstallation |
| BEH002 | User/System | Pass | Pass — existing workspace/runtime/private-skill path; IR/CR/API scope retained | Pass — DS003 unaffected by dependency delivery | Confirmed | Retain current native/runtime/linked-asset qualification obligations |
| BEH003 | Contract | Pass | Pass — ordinary NFS write/open; scoped candidate operations, prior evidence | Pass — DS002 direct NFS, no reader shim/data proxy | Confirmed | Both-mode/peer/lock/Git/visibility tests remain |
| BEH004 | Operational | Pass | Pass — failure is reported incomplete; candidate reconnect succeeds at scope | Pass — existing known-state checks, no implicit package upgrade on normal reconnect | Confirmed | Fresh API-F002 create/reconnect first; outage limitation unchanged |
| BEH005 | Operational | Pass | Pass — actual source/UUID/nonroot/modes preserved at recorded scope | Pass — exact trusted embedded payload, current consent/mask owner and staging cleanup | Confirmed | Package mutation/mask/staging and broader preservation tests |
| BEH006 | User/System | Pass | Pass — inherited normal preview routes; API fixture evidence not mounted desktop proof | Pass — DS004 unchanged; no outage machinery | Confirmed | Healthy current mounted desktop previews still required |
| BEH007 | User/Interaction | Pass | Pass — implemented guide/release availability boundary | Pass — DS005 same one-command UX; no extra package setup | Confirmed | Actual release/guide linkage and qualification gates retained |

**Prior findings first:** D-001 remains deferred, not fixed; IMP-D001 remains resolved in design through independent source-byte ownership/private links. CR001 modes and CR002/API-F001 native-Mac cold-create are resolved at their recorded downstream scopes; do not reopen or inflate them. **CR-003/API-F002 design recovery is adequate**, but the product failure is not closed by prototype evidence or this review. No current source/API result is rewritten.

Independent source trace: public CLI/elevation -> `internal/cli/install.go` fixed root binary -> typed consented `internal/setup/apply.go:Apply` -> `internal/backend/ubuntu_packages.go:InstallUbuntuPackages` -> source/engine setup -> mount -> `internal/service/probe.go:NonrootProbe/Probe` -> `internal/config/source-marker.go:ReadMarker`. `internal/setup/lifecycle.go:Reconnect` reuses saved source/engine/mount/probe; completed reconnect is not a package updater. Bootstrap manifest equality is owned by `internal/cli/verify-release.go`; package and image inputs currently originate in `packaging/release.py`, `release-lock.json`, `Dockerfile` and `.github/workflows/release-nfs.yml`. SR020 names their exact replacements/extensions without moving readiness or privilege ownership.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope Clear? | Linked To Core? | Complete At Stated Scope? | Consistent With Core? | Status/Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Approved018/approvals017–018 and user scope feedback | Pass | Pass | Pass | Pass | Pass | Unchanged intended behavior |
| Current handoff/investigation/SR020 history | Pass | Pass | Pass | Pass | Pass | Recovery only; no duplicate original implementation |
| CRR005/API002 reports, histories and raw indices | Pass | Pass | Pass | Pass | Pass | Preserve Fail and missing packet/peer-environment limits |
| SR020 compatibility report/three attempts/raw/audits | Pass | Pass | Pass | Pass | Pass | Preinstalled dependency prototype, not clean installer qualification |
| IR001–004 and original feasibility/runtime/selection chain | Pass | Pass | Pass | Pass | Pass | Retain actual historical scope, source-policy corrections and failures |
| Current reviewer input audit | Pass | Pass | Pass | Pass | Pass | Static/receipt audit only, not new product execution |

Attempt1 lacks fakeroot before build; Attempt2 create succeeds but later UUID-count harness assertion fails; Attempt3 completes scoped checks. All remain visible. No clean installer, amd64, Docker, peer/physical/native-agent/UI proof is inferred. Delivery/finalization: **N/A — not performed**; external Product spec: **N/A — not requested/applicable**. Implementation/source/API artifacts exist and are not N/A.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Current posture assessed | Pass | Normal reference compatibility failure after implementation, not speculative hardening | None |
| Root classification evidence-backed | Pass | API public failures + outside-Go Y/N/Y diagnosis; selected dependency boundary | Exact historical wire cause remains inference |
| Refactor/no-refactor explicit | Pass | Keep reader/config/probe; bounded package provenance and installation change | None |
| Concrete design reflects decision | Pass | SR020 distribution steps, typed manifest, exact file/removal map, validation order | Implement this delta only |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade/Owner Clear? | Domain Naming Clear? | Ownership Clear? | Off-Spine Concerns Appropriate? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS001 | Bootstrap -> trusted binary -> plan/consent -> package owner -> source/engine/mount/probe -> ready | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS002 | Tool -> OS NFS client -> backend/source -> peer reopen | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS003 | Workspace/run -> binding -> private profile -> existing runtime/tools | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS004 | UI/tool -> existing content/explorer/PTY -> OS IO -> result/stream | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS005 | Nodes guide -> release descriptor -> copy/download -> terminal -> DS001 | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

SR020 also narrates the necessary build/distribution path: verified distro sources + exact upstream patch -> per-architecture package build -> immutable manifest/pair -> matching native binary and Docker image -> candidate qualification -> existing permitted publication. It is release-owned supply to DS001, not a second data plane. Bounded local install lifecycle: validate -> exact private staging -> owned mask/APT/requery -> exact cleanup; incomplete failures do not become READY.

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Packaging engine recipe/manifest | Pass | Pass | Pass | Pass | Owns source/patch/package identity, not host setup policy |
| InstallUbuntuPackages + cohesive bundle reader | Pass | Pass | Pass | Pass | Only expected embedded pair; no arbitrary caller path/URL/package |
| Setup / root binary / existing mask receipt | Pass | Pass | Pass | Pass | Consent/lock/privilege sequencing stays existing owner |
| Source/marker/nonroot probe and normal reconnect | Pass | Pass | Pass | Pass | Unchanged checks; no kernel/read retry shortcut |
| Runtime/preview/guide/selected-node owners | Pass | Pass | Pass | Pass | Unaffected architecture decisions retained |

## Dependency Direction / Forbidden Shortcut Verdict

| Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Clear? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Release -> locked source recipe -> artifacts | Pass | Pass | Pass | Pass | No host compiler/PPA/general package subsystem |
| CLI typed release -> setup -> package owner | Pass | Pass | Pass | Pass | Embedded bytes cross existing trusted-binary handoff; no privileged sidecar |
| Package owner -> local APT pair + distro dependencies | Pass | Pass | Pass | Pass | Stock-engine fallback removed, client/runtime dependency path retained |
| Docker build -> same release pair | Pass | Pass | Pass | Pass | No independent engine build provenance or extra FSAL installation |
| Runtime/core/server/UI | Pass | Pass | Pass | Pass | Prior directions and no shared private-state/global trust shortcuts retained |

## Interface Boundary Verdict

| Interface / API | Subject Clear? | Singular Responsibility? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Release engine manifest / per-arch fixed main+VFS pair | Pass | Pass | Pass | Low | Pass |
| Embedded bundle validation/extraction | Pass | Pass | Pass | Low | Pass |
| Existing InstallUbuntuPackages / typed setup.Release | Pass | Pass | Pass | Low | Pass |
| Existing VerifyRelease equality / qualification | Pass | Pass | Pass | Low | Pass |
| Existing setup/binding/profile/content/guide interfaces | Pass | Pass | Pass | Low | Pass |

Source/patch identity, architecture, name, distinct version, digest and size have explicit meanings. Complete manifest equality remains coherent across downloaded and embedded metadata. Build-only metadata without a matching bundle must fail truthfully, not fetch stock hosting packages.

## Existing Capability / Subsystem Reuse Verdict

| Need | Existing Capability Checked? | Reuse Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Dependency compatibility | Pass | Pass | Pass | Pass | Existing V4.3 NOTSUPP handler; accepted two-field upstream correction |
| One-command package install | Pass | Pass | Pass | Pass | Current backend APT/mask owner; new immutable payload reader only |
| Distribution/qualification | Pass | Pass | Pass | Pass | Existing release workflow/metadata/installer bound; narrow engine recipe |
| Filesystem/readiness/runtime/UI | Pass | Pass | N/A | Pass | Existing owners preserved rather than compensating for dependency defect |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Clear? | Reuse/Extend/Create Sound? | Right Spine Owner? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| packaging/engine and release workflow | Pass | Pass | Pass | Pass | Build/provenance/immutable artifact delivery |
| backend package bundle/install | Pass | Pass | Pass | Pass | Payload validation and exact owned installation |
| Setup/platform/service/config | Pass | Pass | Pass | Pass | Preserve runtime sequencing, source identity and confinement |
| Remaining implemented runtime/launcher/guide | Pass | Pass | Pass | Pass | No reimplementation or new ownership layer |

## Reusable Owned Structures Verdict

| Structure | Extraction Evaluated? | File Choice Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-architecture main/VFS identity pair | Pass | Pass | Pass | Pass | One release-owned manifest used by native and Docker |
| Generated embedded payload | Pass | Pass | Pass | Pass | Build output, not checked-in binaries or user-data state |
| Existing binding/profile/Git/node receipts | Pass | Pass | Pass | Pass | Inherited target responsibilities unaffected |

## Shared Structure / Data Model Tightness Verdict

| Structure | Singular Fields? | Redundancy Controlled? | Overlap Controlled? | Core/Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Engine manifest | Pass | Pass | Pass | Pass | Pass | Byte identity/provenance distinct from qualification and image digest |
| Typed Release | Pass | Pass | Pass | Pass | Pass | Carries metadata, not package lifecycle registry |
| Existing storage/profile/node types | Pass | Pass | Pass | Pass | Pass | No format/meaning changes in SR020 |

## File Responsibility Mapping Verdict

| File / Group | Responsibility Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| packaging/engine source-lock/recipe/upstream patch | Pass | Pass | Pass | Pass | Verified source build and provenance, not runtime administration |
| packaging release-lock/release.py/RELEASE.md/notices/workflow | Pass | Pass | Pass | Pass | Hash closure, corresponding-source delivery and gates |
| backend ubuntu_packages.go/engine_bundle.go/generated assets | Pass | Pass | Pass | Pass | Exact payload/install owner; no stock fallback |
| setup service.go/apply.go and cli verify-release.go | Pass | Pass | Pass | Pass | Typed manifest plumbing only, no second package installer |
| packaging Dockerfile | Pass | Pass | Pass | Pass | Identical corrected pair, existing image runtime boundaries |
| config/probe/mount/Apple/runtime/UI files | Pass | Pass | N/A | Pass | Explicitly preserved by recovery |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Owning Boundary Match? | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| packaging/engine | Pass | Pass | Low | Pass | Cohesive dependency build inputs, not generic utilities |
| backend bundle reader/assets | Pass | Pass | Low | Pass | Adjacent to actual install owner |
| Existing setup/cli/release files | Pass | Pass | Low | Pass | Extend typed boundaries without new layers |
| Remaining application modules | Pass | Pass | Low | Pass | Unchanged prior allocation |

## Removal / Decommission Completeness Verdict

| Item | Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native stock Ganesha install/pins | Pass | Pass | Pass | Pass | Replace only hosting engine with validated bundled pair |
| Docker stock engine APT path | Pass | Pass | Pass | Pass | Same release pair, no parallel stock fallback |
| Distro nfs-common/runtime dependencies | Pass | N/A | Pass | Pass | Still reached and required; do not delete |
| Prototype packages/auto-generated quilt template | Pass | Pass | Pass | Pass | Evidence only; production recipe/provenance authored explicitly |
| Existing confinement/kernel/probe/source state | Pass | N/A | Pass | Pass | Preserve, not obsolete code to bypass |
| Prior shared publisher/fallback cleanup | Pass | Pass | Pass | Pass | Earlier implementation/review scope retained; no new dead code identified here |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper/Dual Path/Legacy Retention? | Clean Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Hosting engine selection | No target stock fallback | Pass | Pass | One corrected family/pair, not generic runtime compatibility branching |
| Distro source patches/rules | No runtime old-schema path | Pass | Pass | Deliberate narrow dependency backport, not obsolete app compatibility machinery |
| Application/storage state | No new old-version reader | Pass | Pass | Unchanged ordinary local/shared behavior |

## Persisted-Data Transition Verdict (When Applicable)

| Stored Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Release manifest/generated packages | Build artifact, no user-data migration | Pass | Pass | N/A | Pass | New immutable recipe/byte identities, not application state |
| Hosted/attachment/marker/recovery state | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Source UUID/config semantics unchanged; do not remove data to replace engine |
| Existing package-mask receipt | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing exact ownership/uncertain-cleanup semantics |
| Workspace/run/source registry/AGY state | Not Affected by SR020 | Pass | Pass | N/A | Pass | Prior SR019 decisions and independent source deletion retained |
| Profile rebuild / existing project links | Not Affected by SR020 | Pass | Pass | N/A | Pass | Exact owned rebuild only; no ambiguous link cleanup |

No released pre-backport NFS product state is claimed. Normal reconnect/service startup is not an implicit dependency upgrade; existing incomplete-setup retry/consent still governs interrupted installation. Detach does not purge dependencies or user source/recovery bytes. No migration ledger or global package registry is justified.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup/Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Locked source/patch -> per-arch build -> immutable pair | Pass | Pass | Pass | Pass |
| Embed/manifest -> trusted binary -> private staging/install | Pass | Pass | Pass | Pass |
| Same pair -> Docker image/inventory | Pass | Pass | Pass | Pass |
| Source review -> clean public create/reconnect -> remaining matrix | Pass | Pass | Pass | Pass |
| Existing IR002–004 code preservation | Pass | Pass | Pass | Pass |

Qualification binds actual bytes; changed package hashes invalidate the prior candidate's qualification. Prototype package hashes and generated attribution are not release-lock inputs. The existing 100MiB binary and archive/member bounds must be checked with embedded artifacts. These are explicit implementation checks, not missing design choices.

## Example Adequacy Verdict

| Topic | Needed? | Present/Clear? | Avoided Shape Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Package build/native/Docker path | Yes | Pass | Pass | Pass | Single immutable pair, no PPA/user compiler/sidecar |
| Native create/readiness proof | Yes | Pass | Pass | Pass | Actual node/source/mount/command and preinstallation limit |
| Source/profile and normal preview lifetimes | Yes | Pass | Pass | Pass | Prior design distinctions retained |
| Broad kernel/fallback/compatibility framework | No | N/A | Pass | Pass | Rejected, not necessary for demonstrated defect |

## Material Premise Validation (Only When Needed)

### MP-005 — Supported native Linux first create reaches directory-access failure

- Authority/behaviors: Approved018 REQ001/003/004/006/014/017/018/019, AC012/018/019, SCN001/011/013, BEH001/004/005.
- Initiating kind/trigger: **User / Supported Normal Scenario**. An owner invokes public `autobyteus-nfs create` for a nonempty ext4 project on the selected Ubuntu24 reference and consents to setup, expecting a usable shared path. This precedes and independently justifies readiness checks and the package correction.
- Forward production witness: CLI create/elevation -> consented Apply -> exact stock distro package install -> nonroot original-source marker/handle checks -> native engine -> hard TCP4.1 self-mount -> exact nonroot probe -> confined directory traversal -> EREMOTEIO -> truthful incomplete state. API002 supplies two fresh public failures and reconnect failures; peer routing and storage outage are not preconditions.
- Preconditions/consequence: Ubuntu24.04.5/kernel7.0.0-38, Ganesha/VFS4.3-8ubuntu1, default delegation Y; source/nonroot/mount otherwise succeed. User cannot complete required normal first use; ordinary mounted file reads can still work. Do not equate this with all IO failing.
- Reachability: **Reachable**, independently demonstrated by public API-owner execution. CRR005 Python control supports interoperability and rejects Go as a necessary cause. Exact original wire-op attribution remains **inference**, not captured fact.
- Review consequence: an evidence-backed dependency correction is proportionate. SR020 keeps client/kernel/protocol/reader/policies, substitutes accepted upstream dispatch handling and preserves the public setup contract. No outage worker, blind retry or global toggle is required.

Independent primary corroboration: the [accepted upstream change](https://github.com/nfs-ganesha/nfs-ganesha/commit/98eb77c4fd94effa6882b214698a77752ec79f6e) changes the recognized optional operation's handler and cleanup entry to NOTSUPP. The [V4.3 handler](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/Protocols/NFS/nfs4_op_illegal.c) already preserves the requested operation number in that response. [Ubuntu source publication](https://launchpad.net/ubuntu/+source/nfs-ganesha/4.3-8ubuntu1) corroborates the exact three source hashes recorded by SR020. This supports a narrow backport, not proof of the unrecorded historical packets or all-platform compatibility.

Candidate evidence checked independently from raw receipts: two separate create successes (1.207s, 1.154s); final attempt has two reconnects (0.445s, 0.619s) with the same UUID, defaultY/hard4.1 and 60 nonroot directory replay iterations plus ordinary operations. **Designer executed; reviewer inspected only.** Manual prior package installation and guest build dependencies prevent clean-installer/runtime-dependency qualification. Same-host arm64 self-mounts do not prove Docker, amd64, peers, independent physical topology or native agents.

### Retained premises MP-001–004 — unchanged disposition

- MP-001/002: exposed workspace media/HTML and completed-artifact preview actions -> existing REST parent filesystem reads; lost hard-mounted storage can stall them. **Reachable**, but explicitly deferred edge scope under DEC015; not a healthy-preview failure or reason to restore workers.
- MP-003: supported Skills -> Sources -> confirmed changed-revision Update -> source service publication/repository cleanup deletes retired bytes. **Reachable**; private link holders never pin those bytes, and no source-retention contract follows.
- MP-004: supported Skills -> Sources -> confirmed Remove -> REMOVING/deletion -> later AGY restore sees missing source and warns/skips only its private dangling link. **Reachable**; preserve source deletion/AGY policy, not snapshot/rebuild machinery.
- Complete prior witnesses and source locations were independently established in ARCH-REV-003; affected policies remain unchanged in SR020. No new finding depends on an unsupported concurrency, outage or data-transition premise.

## Unresolved Approved-Behavior Or Current-State Gaps

**None blocking this design handoff.** CR003/API-F002 still requires implemented corrected distribution and independent public revalidation. API002's remaining matrix and separate peer-NAT environment limitation are not resolved by design or self-mount prototypes. FUP001 remains in PM custody; no duplicate follow-up or scope expansion.

## Review Decision

**Pass — Ready SR020 on unchanged Approved SR018.** CR003's dependency-selection and delivery design obligation is adequately addressed with bounded ownership and evidence. This authorizes implementation routing only, not product qualification, published availability, live resource changes or release.

## Findings

**No new blocking findings.**

- **CR-003/API-F002:** design recovery accepted; **production closure pending**. Implement the exact corrected pair/provenance/bundle/native-install/image path; source review and fresh public create/reconnect without manual engine preinstallation must replace the failed outcome before broader validation can finish.
- **D-001:** remains deferred/not repaired under DEC015.
- **IMP-D001:** prior source/profile separation preserved, no new source lease/snapshot claim.
- **CR001/CR002/API-F001:** recorded downstream resolution retained at its actual scope, not reopened or expanded.

Prior-finding resolution is indexed in ARCH-REV-004; no renumbering of incoming findings, synthetic score or edits to downstream authoritative reports.

## Classification

**Pass**, Large/High retained. No new Design Impact, Requirement Gap or Unclear blocker. Backport/distribution maintenance is acknowledged technical scope, not new approved product behavior.

## Recommended Recipient

Primary: exact implementation recipient returned by fresh handoff rules, with the complete cumulative package including CRR/API/IR triggering evidence. After confirmed primary delivery, informational Solution Designer notice only — **no duplicate forwarding action**.

## Residual Risks

- Backport/source distribution must be productized with correct provenance/notices and corresponding modified source, exact packages/architecture/hash/size and locked build inputs. Prototype hashes/template authorship cannot be promoted. Bit reproducibility is not proved; candidate byte identity is mandatory.
- Fresh no-preinstall native setup, runtime-only dependencies, Docker package parity, amd64/arm64, mask/staging failures and installer size/manifest boundaries remain validation work. No kernel/protocol/confinement/identity shortcut is approved.
- API002 remains Fail57.14%/broader Required; actual native linked assets/peer-stop/restore/Standalone-Team-Org, healthy mounted desktop previews, all storage/client/peer/restart/detach/preservation modes and independent physical Mac/Linux/Docker/user verification remain gates. Preserve separate peer-network limitations and FUP001 custody.
- Hard-NFS outage stalls, trusted-LAN plaintext/coarse host trust and Mac-v3 local advisory lock limits remain disclosed; no new guarantees.
- No working public command, tag, release, merge, provider or user-resource permission follows from this review.

## Latest Authoritative Result

- Review Decision: **Pass — ARCH-REV-004 / Ready SR020 / Approved SR018**.
- Material-Premise Gate: **Pass** — demonstrated normal-path compatibility failure justifies the bounded dependency correction; historical wire attribution remains inference.
- Notes: CR003/API-F002 design recovery accepted, product closure pending. Current specialist results unchanged. Reviewer changed only its report/revision/evidence artifacts; no product execution or source change claimed.
