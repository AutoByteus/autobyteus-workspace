# Implementation Handoff — IR-005

## Current result and authority

**Implementation Complete — SR020 dependency recovery; independent source review
required.** Implementation and all checks in this round were performed personally,
without delegation. **Large / High** retained. This is not a completed product,
API/E2E Pass, physical qualification, delivery or release.

The approved Ganesha correction is now implemented in the release recipe, typed
manifest, embedded Linux package pair, existing Ubuntu install owner and Docker
image build. Actual arm64 production-recipe build, clean package-owner install and
same-pair Docker packaging checks pass. **Public NFS create/reconnect was not run
in IR005.** Source review must precede API-F002 and the remaining product matrix.

Current independent authorities remain **ARCH-REV004 Pass / Ready SR020 /
Approved SR018**, **CRR005 Fail / Design Impact CR-003**, **API-REV002
Fail /57.14% / broader Required / API-F002**. Implementation does not overwrite
those owners' findings. CRR004's prior source Pass and API002's resolution of
CR002/API-F001 nativeMac cold create remain valid only at their recorded scopes.
CR001 permissions and IMP-D001 source ownership corrections are preserved.

## Upstream artifact package

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
Branch `codex/shared-network-workspaces`; base/finalization `origin/personal`.
Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
All ticket-relative references below live at
`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
Production paths are worktree-relative. Complete absolute reference index:
`implementation-evidence/ir-005/package-index.json`.

- `requirements-doc.md`, `approval-record-sr018.md`, `approval-record-sr017.md` and
  `architecture-review-scope-feedback.md`: unchanged approved intended behavior.
- `solution-design-handoff.md`: complete cumulative package. `investigation-notes.md`
  is the full supplement/raw evidence inventory, including original requests,
  approvals, node-path tables, failed experiments and scoped evidence limitations.
- `design-spec.md`: **Ready SR020**, reviewed design957b052f4b222b7ddb14e148fd5439ba10122379.
  `solution-revision-record.md`: cumulative requirements/design history.
- `design-review-report.md`, `architecture-review-revision-record.md`,
  `architecture-review-evidence/arch-rev-004/review-checks.json`: ARCH004 Pass,
  commitc7f0376db65d09bcab93feeb3adb9288ece9d58a. Incoming receipt/input
  d1aceecc4888fe8b1d58be898337473cd4be8243. Duplicate ARCH004 delivery deduplicated.
- `code-review-report.md`, `code-review-revision-record.md` and
  `code-review-evidence/crr-001/` through `crr-005/`: current CR003 origin/review,
  all prior source findings and scoped resolutions. Not superseded by this handoff.
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`,
  `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`,
  `evidence/api-e2e/api-rev-001/` and `api-rev-002/`: current Fail and raw execution,
  negative cases, environment constraints, source identity and cleanup receipts.
- `evidence/design-recovery/sr020/`: accepted dependency selection, actual prototype
  attempts and failures; `package-index.json` supplies328 incoming references.
  Prototype manually preinstalled packages support design only. No prototype
  package hashes/attribution/timestamps are relabelled as production artifacts.
- `implementation-revision-record.md`: IR001–004 unchanged plus IR005. Prior
  `implementation-evidence/ir-001/` through `ir-004/` retained in full. IR001
  IMP-D001 was a real design finding, not an earlier implementation Pass.
- `evidence/feasibility/` reports/index/raw FR001–057, UI reference
  `evidence/ui-reference/docker-guide-user.png`, original setup/application-node/
  agent feasibility contexts and approvals remain indexed. No historical
  experiment result is current-product qualification.
- Current evidence: `implementation-evidence/ir-005/checks-and-limits.md`,
  `source-audit.json`, `final-source-check.json`, `local-checks-result.json`,
  `go-race-final.log`, `engine-build-result.json`, `built-engine-manifest.json`,
  `source-artifact-check.json`, `install-result.json`, executed scripts, all raw
  logs, cleanup receipts and `retained-candidate.json`.
- Product-owned supplemental design: **N/A — not applicable**, none requested.
  Independent architecture/source reviews apply. DR: **N/A — not yet performed**.

## Current implementation summary

- Cycle **Rework after architecture-reviewed Design Impact recovery**; IR-005;
  SR020 technical correction, unchanged Approved018 and SR019 profile policy;
  ARCH004; CRR005/CR-003; API002/API-F002; DR N/A.
- Source commit **9992ffb30d4fbaab4852b87b2495738f1b5be908**:26 source/test/docs paths.
  `packaging/engine/` locks exact Noble4.3-8ubuntu1 source/distro patches/rules plus
  accepted98eb77c two-field dispatch correction. Distinct4.3-8ubuntu1+autobyteus1
  main/VFS pair, complete corresponding modified source, notices/build inventory.
- Release manifest owns exact source/recipe/patch/name/version/architecture/SHA/size.
  Native Linux CLI embeds only matching architecture pair; Mac embeds no debs.
  Generated packages are not checked into source. Missing/mismatched bundle refuses
  before package mutation, no arbitrary user URL/path/sidecar or stock fallback.
- `backend.InstallUbuntuPackages` retains consent/apply/admin-lock/mask ownership;
  private0700 directory/0600 exact files, local APT arguments plus distro client/
  runtime dependencies, exact installed-status/version requery and cleanup.
  No new lifecycle owner or automatic package upgrade on normal reconnect.
- Docker installs the same release-owned pair, not another independent engine
  build. CI build-only produces native arm64/amd64 artifacts once; publication
  fetches an explicit previous candidate run and verifies locked identities rather
  than rebuilding engine bytes under old qualification. Changed inputs invalidate
  qualification. Existing four-member/100MiB installer limits remain.
- Entire prior IR002 feature and IR003/004 fixes retained: standalone service,
  selected-node preservation, launcher reference, lazy shared binding, scoped child
  Git environment, private current-source skill profiles and Nodes NFS Guide.
  Public guide/release remains unavailable by default, not a shipped command.

## Classification and design health

- `task_size: Large`, `architectural_risk: High` — **Confirmed**, no downgrade.
  Design classification and privileged package/release/source identity ownership
  justify independent source review despite the bounded delta.
- Selected route: **Code Review**, fresh completion rule for Large or High;
  recipient `/software_engineering_team/code_reviewer`. This is existing-role
  source review, not delegated implementation/testing or a new team.
- Direct-route lightweight review: **Not Applicable**. New design-impact or
  requirement escalation: **None identified** in this implemented recovery.
- Reviewed posture: demonstrated dependency/protocol compatibility defect in a
  supported normal path. Existing filesystem/confined reader is not the defective
  owner. Narrow release/bundle responsibility is implemented; no broad app
  refactor, new filesystem engine or runtime compatibility service. **Matches
  SR020 health assessment**. Original failed wire sequence remains inference.
- Scope Guardrail respected: **Yes**. Default directory delegationsY, reference
  kernel, hard4.1, confined nonroot marker access/squash/allowlist, source/UUID,
  selected-node/private state and consent/rollback preserved; no global tuning,
  unsafe reader, stock fallback, protocol downgrade or blind read retry.

## Reviewed behavior implementation trace

| ID | Actual production owner/path | IR005 outcome and evidence boundary |
| --- | --- | --- |
| BEH001 | `autobyteus-nfs/packaging/engine/`, `packaging/release.py`, workflow; `internal/backend/engine_bundle.go`, `engine_staging.go`, `ubuntu_packages.go`; `internal/setup/apply.go`, `service.go` | Corrected release pair delivered through existing one-command setup spine. Actual build/package installation checked; public create/reconnect not executed in this round. IR003 modes and IR004 Apple startup barrier untouched. |
| BEH002 | server `shared-run-workspace-admission.ts`, shared-workspace binding, runtime-skill-profile/private preparation/native adapters and exact process owners | Unchanged. No intentional shared local fallback. Private linked current-source discovery, support assets/normal peer close/restore and Standalone-Team-Org proof still required. |
| BEH003 | Go backend Apple/Ganesha, platform mounts/nonroot qualification; server scoped-project-git-environment and core terminal-child-environment | Direct OS NFS and scoped Git trust unchanged. Corrected dependency not a copy/sync/data proxy. Actual peer/locks/Git/full-mode semantics remain downstream. |
| BEH004 | `setup/lifecycle.go`, status/service and lazy server binding check | Untouched ordinary reconnect/service path: no package install/upgrade, no per-file/per-turn probe. Missing prerequisites/bad bundle/setup remain truthful failures; outages may stall. |
| BEH005 | existing package install/mask owner, private staging; setup plan/apply/detach, Docker snapshot/recreate/recovery/ownership, source/config/private probe | Same administrative ownership and consent. Clean package-owner helper under077 verifies exact pair/mask/staging cleanup. This is not public consent flow or real selected-node mutation/rollback proof. |
| BEH006 | existing workspace/run-artifact REST authorization/path/projection/MIME/errors/streams | Unchanged. Historical fixture results retained, not rerun. Healthy mounted desktop media/HTML/relative asset/completed-artifact previews remain mandatory. |
| BEH007 | NodeManager/NodeManagerTabs/NfsGuideCard/nfsLauncherCommands/en+zh-CN | Unchanged guide and truthful unavailable release; no new UI delta. Prior rendered evidence retained, no new UI verification claimed. |

## Key files, boundaries, compatibility and state

`source-audit.json` lists exact26 deltas and1030 unchanged paths against the reviewed
input. New runtime files are cohesive backend bundle/staging owners; release-only
recipe/manifest stays in packaging. Setup passes typed engine metadata, not a
second public extraction service or caller-selected package path.

Obsolete stock-engine package pins/install arguments removed; no in-scope legacy
fallback, dual current/old behavior, compatibility shim or dead path retained.
Existing stock-engine dependencies not silently purged on detach. No additional
out-of-scope dead-code finding. Shared structures remain tight; full release
manifest equality includes engine fields. Canonical shared/design guidance
reapplied. Changed production files below500 effective nonempty lines and per-file
deltas below220; no hard-limit exception or compensating abstraction.

Persisted state decision follows design: **Not Affected** by SR020; existing app
state/profile/source policies remain **Directly Usable — No Migration**. Engine
manifest is release metadata, not a workspace schema. No released pre-backport
product state exists to migrate; no source/attachment/UUID/data migration, schema
version compatibility branch or reconnection-triggered dependency replacement.

## Personal local implementation checks

Detailed commands/results/limits: `implementation-evidence/ir-005/checks-and-limits.md`.

- Full7 Go packages race pass; final rerun after final release-equality test pass.
  Vet pass; four OS/arch compile targets and native version smoke pass.
- Python12 enumerated:11 pass/1 standalone Go-child fixture skip; the child actually
  executes via Go parent. Three disposable mutations fail required assertions
  (digest/version requery/stock install). Unqualified publishing correctly refused.
- Actual corrected arm64 source build on owned Ubuntu24.04.5/kernel7.0.0-38 VM pass;
  full corresponding modified source/recipe/notices inspected against actual bytes.
- Separate clean VM: corrupt bundle rejected before package mutation; actual
  production install owner under077/admin lock passes16.840s, already-installed
  check0.097s. No candidate engine/compiler preinstalled. Exact mask/staging cleanup.
- Docker image built38.796s from identical pair; network-disabled container inspection
  confirms exact package identity and identical native/container engine executable.
  These are package-boundary checks: **no public create, NFS export/mount or peer**.
- No new frontend change: rendered-result check **Not Applicable**. Historical UI
  evidence is not repeated or promoted to mounted desktop qualification.
- All work personal. Both owned VMs/processes/private caches and scratch removed;
  no user mounts/nodes/private data/credentials/providers touched. Five older dist
  directories untouched. Exact unqualified local candidate deliberately retained
  under ignored `autobyteus-nfs/out/ir005-local-candidate/`, hash inventory attached.

Default source hash `302cdaf6b87e0ec4b0456376a2adba66be1b7294306c01f4f3df93ef285d4a1c`;
measured-arm64 candidate source hash
`588a8826111e970bee40f59fe62163d56c730f965d35fe15971dfe99a54e33b6` differs only through
actual locked package identities. Compiled11,033,781-byte candidate CLI SHA256
`20022a9e553ce3d898531e66e48a843d9fd10fb2fd044474f1a471ed070b219e` is retained but was
not executed as public create. No amd64 package identity or qualification invented.

## Risks, preserved limitations and downstream order

1. **Source re-review first**. CR003/API-F002 are not independently closed by this
   handoff. Then API-F002 fresh public create/reconnect on specified Ubuntu24.04.5/
   ext4/kernel7.0.0-38/defaultY, nonroot1000:109/no groups, original nonempty source,
   hard4.1, UUID/content/modes/managed job; **no manual engine preinstallation**.
   Use retained exact candidate bytes or record new build identities, not prototype.
2. Native amd64 corrected engine and both-arch release workflow/runtime dependencies,
   signed/notarized bootstrap and authorized publication remain unexecuted. Actual
   package bytes invalidate previous qualification; build-only is not release.
3. Full remaining approved native/managed Docker clients on **both Mac/Linux**, Linux
   native/Docker storage, healthy peer/network/restart/detach/preservation/lock/Git
   matrix, native skills/tool/support-assets/peer close/restore/Standalone-Team-Org,
   mounted healthy desktop previews, independent physicalMac/Linux/Docker, docs,
   finalization and explicit user verification remain. Only MacDocker **storage**
   hosting is deferred; physical proof is a delivery gate, not implementation prerequisite.
4. **D001/DEC015 deferred NOT fixed**: hard NFS outages may stall previews/file/terminal/
   unrelated work. No workers/per-action probes/stream leases/cwd trampolines/outage
   deadline or intentional shared local fallback. Trusted-LAN plaintext policy unchanged.
5. **IMP-D001**: current catalog lookup is not source acquisition. Private links and
   exact wrapper/profile cleanup only; source Update/Remove independent. No source
   pin/refcount/snapshot/copy/retirement queue. AGY capsule/manifest missing-source
   warn/skip restore and ordinary local behavior unchanged.
6. Separate peer-NAT/hardened-LAN environment limitation preserved. FUP001 remains
   PM-owned, no duplicate task/notification/patch. IR002 historical Nuxt/Electron
   non-green and candidate-only green distinction retained; not rerun here and not
   called current-source pass. All old attempts/failures remain indexed.

No merge/push/tag/release, new Task, Task closure, live user-resource authorization
or finished user verification inferred. Current code and this handoff govern;
cumulative revision/history indexes aid review but are not proof of closure.
