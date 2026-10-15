# Implementation Handoff — IR-009

## Current result and authority

**Implementation Complete — bounded SR023 Mac source-identity/bind-once recovery;
independent source review required. Large / High confirmed.** Personal work only;
no delegation/spawning. Source commit **d3c88f37c30ee74a89a95a4f6906992667c9b875**, 19 source/test/docs paths.
Current code and this handoff are authoritative; IR001–009 history is cumulative.

Mac APFS source identity is now volume UUID + directory inode, not durable raw
device. Descriptor-correlated actual-device diskutil capture, complete bounded
XML/typed mapping validation and post-command correlation fail closed. Linux
retains device + inode. New source binding is saved before marker/handle/export
work; complete pending binding is reused even with stale NewSource. No migration,
rebind fallback, engine rebuild, mount/runtime/UI or restart-policy change.

**Not CR007 product closure. CRR012 Fail / API005 Fail57.14% / broader Required
remain authoritative.** The corrected public Mac ordinary-boot path has NOT been
executed in this implementation round. ARCH007 accepts design, not implementation
or product acceptance. CR006/API-F004 is independently scoped **RESOLVED by API005**
(Linux native + Docker STORAGE, native + actual managed HTTP, 40 fixtures/80 reads
within5s). Do not reopen it as IR008/IR009 regression. Prior CR005/API-F003 ordinary
boots and separate Stop/policy/replacement/detach controls remain scoped resolved.

## Upstream artifact package

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`;
branch `codex/shared-network-workspaces`; finalization `origin/personal`.
Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`.
Ticket `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces`.
Artifact links below are ticket-relative; production paths are worktree-relative.

- `requirements-doc.md` **Approved SR018**, approval017/018, unchanged scope/DEC015.
- `investigation-notes.md`, `solution-revision-record.md`, `solution-design-handoff.md`,
  `design-spec.md` **Ready SR023**, design a4be96c45d4e9799c3dc18fc6b690b7edf579477.
- `design-review-report.md`, `architecture-review-revision-record.md`: **ARCH007
  Pass**, review ca0ac77b16d5f88074a8d45df16a4c04aea517fa; actual implementation
  input7b2db1b07beedfeac473b9e7ef367b7176338fde adds only coordinator informational
  receipt to solution-revision-record.md. No omitted review artifacts.
- `code-review-report.md`, `code-review-revision-record.md`, CRR012 source trace /
  API005 raw Mac failure + Linux freshness/prior-resolution receipts.
- Full1351 input refs in `architecture-review-evidence/arch-rev-007/package-index.json`;
  all retained by `implementation-evidence/ir-009/package-index.json` with this delta.
- SR023 installed manuals, primary contracts, persisted-state investigation and
  disposable probe/results/attempts/cleanup remain dependency feasibility ONLY.
  Not public mounted RW, whole-host product boot, managed client or physical proof.
- Exact prior IR008 handoff snapshot: `implementation-evidence/ir-009/prior-implementation-handoff-ir008.md`.
  Earlier specialist histories/evidence retained without relabeling their scopes.
- External Product spec **N/A — not applicable**; DR/delivery **N/A — not performed**.

Cycle **Rework**, IR009 / SR023 / ARCH-REV007 / CRR012 / API-REV005 / DR N/A.
Trigger **CR007(P1)/API-F005**. ApprovedSR018 and SR019–022 policies retained.

## Routing classification and design health

Task size **Large**; architectural risk **High**, confirmed from SR023 classification
and completed persistence/privileged lifecycle delta. No silent downgrade.
Selected route **Code Review**; fresh rule receipt in `ir-009/routing.json` controls
recipient. Direct-route lightweight review **N/A**; implementation self-review done.
New Design Impact/Requirement Gap **None**.

Reviewed root cause: source identity's lifetime mismatch/missing invariant, not
IR008 or Apple startup regression. Small OS-specific capture/config validation
extraction and pending sequencing within existing owners; no broad refactor/new
command runner, supervision owner, cache or version framework. Matches reviewed
health assessment. Shared principles/root DESIGN/TESTING and migration policy
reapplied; no closer NFS/package guideline found. No scope expansion.

## Reviewed behavior implementation trace

| Behavior / approved contract | Actual path | Outcome / limit |
| --- | --- | --- |
| BEH001, SCN009/012, REQ014/017, AC007/014/017 | CLI -> Setup.Plan -> platform.SourceIdentity; config.Identity / ValidateBound; metadata Validate still supports unbound planning | Existing source captured, absent source's canonical parent qualified; same marker/storage UUID policy retained |
| BEH004, SCN013, REQ019, AC018/019 | launchd/supervisor or public reconnect -> CheckConfiguration -> CheckSource -> existing Apple Ensure/mount | Apple canonical nonzero lowercase VolumeUUID + inode; no durable Device or refresh; Linux positive device/inode unchanged. Local tests only; public reboot acceptance pending |
| BEH005, retry/preservation | PendingPlan / validateSourceIntent / Apply / bindSource / SaveIntent | Complete binding checked/reused despite stale NewSource; true zero + NewSource only unbound; old/partial/mixed/hosted-unbound refused. Atomic binding save before later effects, final hosted-before-export order retained |
| BEH005, status/detach | complete config validation; pending detach shape validation; existing exact teardown | Status no repair. Detach no live-source capture requirement; missing-source valid current binding reaches existing mount boundary |
| BEH003 and BEH002/006/007 preserved | Ganesha expiry0, Docker restart safeguards, runtime/private links, REST/previews, Guide/release owners untouched | Scoped prior resolutions and remaining full-product gates retained; no new qualification |

Changes stayed within requirements Scope Guardrail and design Change Scope: **Yes**.

## Key implementation owners and self-review

- `internal/config/state.go`, `source_identity.go`: one backend-selected Identity,
  no schema/platform selector. `Validate` remains metadata-only for planning/backend
  renderers; `ValidateBound` is mandatory at completed setup/current-source boundaries.
  Linux JSON device/inode fields retain meaning/shape. Mixed/zero/old Apple refused.
- `internal/platform/source.go`, `source_darwin.go`, `source_linux.go`, existing
  `filesystem_darwin.go`: canonical real-directory checks, O_DIRECTORY/O_NOFOLLOW/
  CLOEXEC fd, Fstat/Fstatfs local APFS mounted device, fixed trusted Runner command,
  before/after path/fd raw-pair and mount/fsid correlation; defer close on every
  post-open exit. Raw device only local observation. QualifyFilesystem is still
  reached by Darwin handle qualification; not dead code.
- `volume_plist.go`, `volume_identity.go`: <=1MiB accepted complete plist/dict,
  bounded nested values, duplicate keys rejected (including unrelated keys), typed
  required strings, strict system prolog/root, malformed/trailing refusal. Actual
  DeviceNode/MountPoint/FilesystemType/VolumeUUID only. No Mounted/DiskUUID fallback.
- `setup/plan.go`, `apply.go`, `pending.go`, `lifecycle.go`: existing Store/admin lock,
  fresh consent, supervisor pending refusal and final hosted-before-export order
  unchanged. Apply normalizes complete stale-flag plans before effects; newly
  created source calls bindSource immediately after CreateSource, before probe.
  Failure after a successful binding save retains the selected identity.
- Adjacent config/platform/setup tests, metadata-complete IR008 hosted config test
  fixtures, and narrow NFS README update. Backend/engine/workflow/REST/runtime/UI
  production bytes unchanged.

Compatibility mechanisms **None**; old cross-OS raw-pair comparison and stale-flag
pending recapture removed. Dead in-scope code **removed/replaced**; none newly
unreachable found elsewhere. Tight shared variant **Yes**; meaningful helpers in
existing owners, no bypass. All production files <=210 effective nonempty lines;
all production deltas <=220 lines (largest new plist parser189 physical/183
nonempty). Tests outside source-size limit. Full path/hash/delta audit retained.

## Persisted-data disposition

Follows SR023 `Persisted Data / State Transition Decision` without deviation:
- Current Apple UUID+inode / Linux device+inode, source bytes/marker/storageUUID,
  attachments/private data: directly usable; no migration/meaning change.
- Truly all-zero NewSource without hosted state: unbound first capture only.
- Old bound device-only Apple fixtures: not convertible by guessing today's UUID.
  Drain/detach using **matching OLD candidate BEFORE replacing it**, then fresh
  create on preserved source/marker/storageUUID. New reader supplies actionable
  unsupported-binding error; no automatic deletion, rebind or startup migration.
- No supported released predecessor established by evidence, **not universal absence**.
  Actual supported retained installation evidence must return for concrete transition
  assessment before cutover. No manual identity edits for acceptance.

## Local implementation checks and environment

See `ir-009/checks-and-limits.md`, raw logs, attempts.md, checks-result.json,
mutation-result.json, source-audit.json and build-result.json.

- Pinned checksum-verified Go1.27.2 darwin/arm64, clean owned HOME/TMPDIR (group20).
  Final race: seven packages, **70 top-level passes / 212 first-level subcases**;
  one standalone installer-child skip (parent executes the child mode). Vet passes.
- Strict plist/variant/FD/error/mapping/path-change/permission tests; installed
  diskutil read-only integration on owned APFS directory. Complete pending/stale
  NewSource/unbound/old/partial/hosted-conflict/mismatch no-effects tests.
- New-created-source binding test starts at actual Apply helper immediately AFTER
  nonroot creation, then actual Apply fails at missing trusted probe executable.
  It proves persisted binding before later effects, **not privileged CreateSource
  execution or public mounted setup**. Plan tests stop after capture at backend
  selection, before NFS config/port work. Detach success fixture stops at mount query.
- Python packaging:18 tests,17pass/1 standalone Go-child skip; shell syntax;
  empty-qualification publication expected refusal. Four CLI cross-builds,
  native version; all test packages cross-compile Darwin amd64/Linux arm64+amd64.
  **Linux-specific tests compile, not execute**; common Linux identity/config,
  backend/expiry and Docker recovery unit regressions execute on Darwin.
- Ten copied-source mutations fail intended tests: missing FD close, post-query
  correlation, duplicate/trailing/mapping checks, pending comparison, binding save/
  flag clearing, hosted-unbound and complete-config validation.
- First compile exposed nonexported MNT_LOCAL; corrected using retained OS-header
  constant. Candidate-1/check-directory rerun issue preserved; final14 checks complete.
  No erased failures, guard weakening or API/E2E environment bring-up.

## Current CLI candidate / retained inputs

Ignored `autobyteus-nfs/out/ir009-local-candidate` contains Linuxarm64 and Darwinarm64
CLIs plus current release.json and README; exact hashes/sizes in build-result.json.
Uses identical retained **IR005 arm64 engine pair** and source/notices. No engine
rebuild, Docker image assignment, signing, publication or qualification.
Actual-source default hash **cc3556ce850bf20281e6b7e0411a6b01359ea863cac6cb22104808e9dc225354**;
retained-engine metadata source hash **f0d71675d3d9b70d89969a8071b8de03287cff0676669ddab295f14568041c88**.
Both binaries contain the exact generated metadata bytes; native version smoke
only proves executable/version, not source identity or mounted functionality.
All19 prior IR005/007/008 artifacts and286 old dist files unchanged; five preexisting
dist trees untouched. 1379 protected input paths unchanged except this delta and
our two canonical implementation authorities. Scratch/copied mutations removed;
only inventoried new candidate intentionally retained. No live resource mutation.

## Frontend rendered-result check

**Not Applicable** — backend/config/lifecycle-only delta plus documentation; no
rendered UI/interaction changed. Prior healthy-preview evidence is not new proof.

## Required downstream gates

1. Fresh configured **independent source review** of IR009. Do not dispatch API in
   parallel or duplicate a reviewer's primary handoff.
2. After source Pass: **API-F005 FIRST**, current public native Mac fresh create;
   >=2 ordinary whole-host boots (more if required to witness ACTUAL raw-device
   change), automatic mounted nonroot RW BEFORE manual reconnect/repair. Separately
   public reconnect; actual same-path directory and real APFS volume replacement
   refusal with copied marker/bytes. No synthetic identity edits/helper substitute.
   Record installed CLI/metadata, distinct boots, observed device, UUID/inode,
   unchanged saved binding/source/marker/modes/private state and job/export/mount.
3. Preserve CR006's Linux native/Docker storage + native/actual managed HTTP80 reads
   <=5s resolution and CR005 normalboots/Stop/policy/replacement/detach controls.
   Same ID/Image/Config; documented empty-DNS null->[] HostConfig normalization is
   not raw byte equality. CR001–004 scoped resolutions retained, not entire-suite Pass.
4. Remaining bothOS native+managed clients / LinuxnativeDockerstorage / independent
   physical topology / actual native tools + unread linked assets + peer-close +
   restore / Standalone-Team-Org / completed artifacts + healthy previews / amd64
   engine / hosted-workflow/signing/public-bootstrap/docs/user/finalization/authorized
   release gates remain. Successful af9f23 REST test-code review awaits Passed API package.

D001/DEC015 deferred **notfixed**; IMP-D001 current-source links, independent Source
Update/Remove and AGY/local policy unchanged. FUP001 PMcustody; physical/profile/
inference/privateLAN/peerNAT prerequisites unchanged. Only MacDocker **STORAGE**
deferral, not clients. Empty qualification/unavailable Guide honest. No merge,
push, tag, release, TaskDone, deployment or user-verification claim.
