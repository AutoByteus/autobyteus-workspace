# Implementation Handoff — IR-006

## Current result and authority

**Local Fix Complete — CR004 release-job gating; independent source re-review
required.** All implementation/testing personal, no delegation. **Large/High
confirmed**. Source commit `eb7934072a1f98832b7b6330a1bc6a7f348fd93d` changes only the
release workflow and durable nonpublishing regression. Valid existing-candidate
publication carries its deliberately skipped rebuild through explicit
cancellation-aware downstream gates; prepare/candidate/image/binary/signing
success and qualification still mandatory. No actual publication was attempted.

Current independent source authority is **CRR006 Fail / Local Fix CR-004 P2**;
API authority remains **API-REV002 Fail /57.14% / broader Required / API-F002**.
Approved SR018 / Ready SR020 / ARCH004 Pass unchanged. CRR006 accepts the CR003
engine remedy at design/source boundary, **not** public create/reconnect closure.
CR001, scoped CR002/API-F001 and IMP-D001 resolutions preserved. No product,
physical-system, API, Delivery or release Pass implied by this implementation.

Current evidence: `implementation-evidence/ir-006/checks-and-limits.md`,
`checks-result.json`, `source-audit.json`, `final-source-check.json`, executed
harnesses, baseline/fixed/mutation logs, cleanup and cumulative `package-index.json`.
Current regression/lint/packaging checks pass. Prior IR005 actual arm64 source
build/package-owner/Docker checks remain historical proof for untouched code,
not rerun. No public create/NFS export/mount/peer operation in IR006.

## Upstream artifact package

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`.
Branch `codex/shared-network-workspaces`; base/finalization `origin/personal`.
Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
All ticket-relative references below live at
`/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
Production paths are worktree-relative. Complete absolute reference index:
`implementation-evidence/ir-006/package-index.json`.

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
  `code-review-evidence/crr-001/` through `crr-006/`: current CR004 and prior CR003 origin/review,
  all prior source findings and scoped resolutions. Not superseded by this handoff.
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`,
  `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`,
  `evidence/api-e2e/api-rev-001/` and `api-rev-002/`: current Fail and raw execution,
  negative cases, environment constraints, source identity and cleanup receipts.
- `evidence/design-recovery/sr020/`: accepted dependency selection, actual prototype
  attempts and failures; `package-index.json` supplies328 incoming references.
  Prototype manually preinstalled packages support design only. No prototype
  package hashes/attribution/timestamps are relabelled as production artifacts.
- `implementation-revision-record.md`: IR001–005 unchanged plus IR006. Prior
  `implementation-evidence/ir-001/` through `ir-004/` retained in full. IR001
  IMP-D001 was a real design finding, not an earlier implementation Pass.
- `evidence/feasibility/` reports/index/raw FR001–057, UI reference
  `evidence/ui-reference/docker-guide-user.png`, original setup/application-node/
  agent feasibility contexts and approvals remain indexed. No historical
  experiment result is current-product qualification.
- Retained IR005 evidence (not rerun): `implementation-evidence/ir-005/checks-and-limits.md`,
  `source-audit.json`, `final-source-check.json`, `local-checks-result.json`,
  `go-race-final.log`, `engine-build-result.json`, `built-engine-manifest.json`,
  `source-artifact-check.json`, `install-result.json`, executed scripts, all raw
  logs, cleanup receipts and `retained-candidate.json`.
- Product-owned supplemental design: **N/A — not applicable**, none requested.
  Independent architecture/source reviews apply. DR: **N/A — not yet performed**.

## Current implementation summary

- Cycle **Implementation-owned Local Fix**; IR-006 after CRR006/CR-004 P2;
  reviewed input28775788db8d1a3d1d54b86a29ebfac34e1a463b, receipt baseline
  b1747fbdc3fe41f8aa8413f7e110a42ce9687704. ReadySR020/Approved018/SR019 profile
  policy/ARCH004 retained; API002/API-F002 still open; DR N/A.
- IR006 fix uses !cancelled() and exact applicable needs results in engine-inputs,
  engine, binaries and publish. Only publish=true accepts exactly skipped rebuild;
  failed/cancelled prerequisites never qualify. No relaxed qualification or
  immutable candidate/signing requirements. New stdlib regression runs in prepare.
  Below is the **retained cumulative IR005 implementation**, unchanged this round.
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
- Selected route: **Code Review**, fresh Large/High implementation-owned Local Fix rule;
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

| ID | Actual production owner/path | Current outcome / retained evidence boundary |
| --- | --- | --- |
| BEH001 | `.github/workflows/release-nfs.yml`; `autobyteus-nfs/packaging/engine/`, `packaging/release.py`, workflow; `internal/backend/engine_bundle.go`, `engine_staging.go`, `ubuntu_packages.go`; `internal/setup/apply.go`, `service.go` | IR006 corrects permitted release job gating, retaining all qualification prerequisites. Corrected release pair delivered through existing one-command setup spine. Actual build/package installation checked; public create/reconnect not executed in this round. IR003 modes and IR004 Apple startup barrier untouched. |
| BEH002 | server `shared-run-workspace-admission.ts`, shared-workspace binding, runtime-skill-profile/private preparation/native adapters and exact process owners | Unchanged. No intentional shared local fallback. Private linked current-source discovery, support assets/normal peer close/restore and Standalone-Team-Org proof still required. |
| BEH003 | Go backend Apple/Ganesha, platform mounts/nonroot qualification; server scoped-project-git-environment and core terminal-child-environment | Direct OS NFS and scoped Git trust unchanged. Corrected dependency not a copy/sync/data proxy. Actual peer/locks/Git/full-mode semantics remain downstream. |
| BEH004 | `setup/lifecycle.go`, status/service and lazy server binding check | Untouched ordinary reconnect/service path: no package install/upgrade, no per-file/per-turn probe. Missing prerequisites/bad bundle/setup remain truthful failures; outages may stall. |
| BEH005 | existing package install/mask owner, private staging; setup plan/apply/detach, Docker snapshot/recreate/recovery/ownership, source/config/private probe | Same administrative ownership and consent. Clean package-owner helper under077 verifies exact pair/mask/staging cleanup. This is not public consent flow or real selected-node mutation/rollback proof. |
| BEH006 | existing workspace/run-artifact REST authorization/path/projection/MIME/errors/streams | Unchanged. Historical fixture results retained, not rerun. Healthy mounted desktop media/HTML/relative asset/completed-artifact previews remain mandatory. |
| BEH007 | NodeManager/NodeManagerTabs/NfsGuideCard/nfsLauncherCommands/en+zh-CN | Unchanged guide and truthful unavailable release; no new UI delta. Prior rendered evidence retained, no new UI verification claimed. |

## Key files, boundaries, compatibility and state

IR006 `implementation-evidence/ir-006/source-audit.json`:2 delta paths,
1115 unchanged prior source/authority/history paths,11 retained IR005 candidate
files unchanged. Workflow277 ->283 nonempty lines,8 additions/2 deletions;
new regression132 nonempty lines (tests outside source limit). No Go/engine recipe/
package/installer/runtime/UI changes, new owner or persisted-data migration.
CR004 is implementation packaging, not a design gap. Failed first audit compared
against pre-receipt review commit; corrected baseline preserves reviewer receipt
(audit-attempts.md). No upstream authority edited.

Retained IR005 size and ownership assessment:

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

## Retained IR005 personal local implementation checks — not rerun in IR006

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

Historical IR005 default source hash `302cdaf6b87e0ec4b0456376a2adba66be1b7294306c01f4f3df93ef285d4a1c`;
measured-arm64 candidate source hash
`588a8826111e970bee40f59fe62163d56c730f965d35fe15971dfe99a54e33b6` differs only through
actual locked package identities. Compiled11,033,781-byte candidate CLI SHA256
`20022a9e553ce3d898531e66e48a843d9fd10fb2fd044474f1a471ed070b219e` is retained but was
not executed as public create. No amd64 package identity or qualification invented.

## Current IR006 checks and source identity

Personal `run-local-checks.py`:13 commands all expected.17 Python tests enumerated,
16 pass/1 existing Go-child-only skip; Go child **not rerun** this round.
Five focused job-gate regressions cover both success branches, all applicable
failed/skipped/cancelled prerequisites, cancellation, binary/signing result and
preserved qualification/identity gates. Baseline fails10 assertions; six negative
controls fail the intended assertions. Actionlint1.7.11 validates YAML/expressions
(shellcheck/pyflakes explicitly disabled). Default release still refuses publish.
The model evaluates actual source expressions, not GitHub-hosted job execution.
No new frontend change, rendered loop N/A. No Go/VM/Docker/runtime suites rerun;
no live resource, credentials/provider, hosted workflow or release used.
Owned temporary copies/home removed; no background process. Prior candidate and
five dist trees untouched. Exact receipts in IR006 evidence; no API signoff.

**Current** default source hash
`4568593b99bb3dff263e9824ceb7176e04a95ec90e3cd14a9f7421b4e43055ac`;
with unchanged measured arm64 engine inputs
`5563645d23aaac13aaa26948490d68dfc12fef31775bb66156185f9052ab0acc`.
Workflow participates in the aggregate: retained IR005 CLI/release metadata now
has a **prior workflow aggregate**, not fresh current-source qualification.
Unchanged engine pair/source/notices may be reused exactly, but build current
CLI/metadata with the new source hash before downstream public validation. No
engine rebuild/qualification/republishing performed or prior receipt relabelled.

## Risks, preserved limitations and downstream order

1. **Source re-review first for CR004**. API-F002 is not independently closed by this
   handoff. Then API-F002 fresh public create/reconnect on specified Ubuntu24.04.5/
   ext4/kernel7.0.0-38/defaultY, nonroot1000:109/no groups, original nonempty source,
   hard4.1, UUID/content/modes/managed job; **no manual engine preinstallation**.
   Reuse unchanged retained engine bytes with current rebuilt CLI/metadata and recorded identities, not prototype or stale workflow qualification.
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
