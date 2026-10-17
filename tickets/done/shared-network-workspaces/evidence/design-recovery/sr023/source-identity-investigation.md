# SR023 source identity investigation

**Architecture Design Complete / unchanged Approved SR018 / Large / High.**
Owner Solution Designer, 2026-10-15, personal execution. Evidence is separate from intended
behavior in requirements-doc.md and selected technical decisions in design-spec.md.

## Authorities read and approval gate

solution-designer/SKILL.md; full references/requirements-engineering.md,
architecture-design.md, design-principles.md and design-spec-template.md; task root
AGENTS.md/DESIGN.md/TESTING.md; no closer NFS/ticket AGENTS or design authority found.
Current requirements, approval-record-sr018, scope feedback, cumulative solution history,
SR022 design/handoff, CRR012 report/history/source-trace/mac-evidence/primary/limits and
API005 actual evidence read before target decisions. Repository migration guideline
`autobyteus-server-ts/docs/design/data_migration_guideline.md` and actual
`remove-global-skill-discovery-mode` migration read in full before state disposition.
No new requirement or behavior supplement: normal healthy nativeMac restart and true
source replacement refusal already approved. No renewed approval needed. No Product
UI/UX change; external Product artifact N/A. No generic anti-clone/security expansion.

## Current production path and exact responsibility

- `internal/setup/plan.go` captures existing source or qualifies new-source parent via
  platform.SourceIdentity; selected source path comes through existing exclusions.
- `internal/platform/source.go` Lstat/canonical-directory checks and returns raw
  syscall.Stat_t.Dev/Ino. CheckSource compares the whole pair before filesystem qualification.
- `internal/platform/filesystem_darwin.go` requires APFS; Linux qualifier requires ext4.
- `internal/config/state.go` Identity currently contains only Device/Inode. Hosted.Validate
  validates source/IDs/nonroot/backend/allowlist, not complete source binding. Protected
  Store uses bounded known-field JSON and atomic fsync/rename under private0700/0600.
- `setup.Apply` saves initial intent, optionally creates source as nonroot, captures identity,
  checks source, probes marker/permissions, writes hosted state before exporting, then saves
  intent again. Current NewSource stays true even after identity capture.
- `setup.PendingPlan` currently recaptures/overwrites hosted identity whenever NewSource
  is true and the path exists. A complete stored binding and unbound new-source intent
  therefore need explicit distinction when changing the identity representation.
- launchd RunAtLoad -> CLI service -> existing serial supervisor/admin lock ->
  lifecycle.Reconnect -> CheckConfiguration -> CheckSource -> Apple Ensure/mount/nonroot
  proof -> selected nodes. Failure is BEFORE backend/mount; not an Apple nfsd outage.
- Status reads complete config and existing mount/marker/probe; no source repair.
  Detach uses exact-owned configuration, not CheckSource, allowing safe old-candidate
  teardown even after the old device comparison fails. Preserve that separation.
- `platform.Commands` already resolves only root-owned trusted executable paths and uses
  a fixed clean environment. Reuse its Runner for diskutil; no new command owner.
- Source.go dates to ticket commitc57ab71c90, unchanged by IR008. All production remains
  d65aeda24fc4b9a534a3941b194dd4a55b88c00c during this round. No production/durable-test fixes.

## Supported failure and prior resolution

CRR012/CR007 confirms SCN009/012/013, REQ014/017/019 and AC007/014/017/018/019.
API005 completed nativeMac public create under077; original source
`/Users/admin/ab-nfs-api005-mac-59bba374-source`, storage UUID
7d29fab2-7ce0-47cb-9183-73a810590a07. Raw device16777228 then30/27/30 across three boots,
inode506781 and original bytes/marker/UID501/GID20/mode755 unchanged. Third boot's valid
actual-device diskutil captures keep APFS VolumeUUIDA19FE379-BE62-4297-9A39-3934CC88214B.
Stored pair remains16777228/506781, record SHA
 a9148db38d10a1eb3694846c990cac97dc9df9c857a73220c767a0d558a8c5de.
Automatic service and two separately labelled reconnects refuse exact pair mismatch;
mount absent/status false, no false-ready or observed data loss. Invalid guessed-directory/
PATH/filename diagnostics excluded. Persistent predicate refusal, not210s as a new SLA.
Reviewer raw audit is retained; designer is not reissuing reviewer/API numeric verdicts.

API005 independently closes CR006/API-F004 on Linux native + Docker STORAGE, native and
actual managed HTTP:40unique1KiB/1MiB fixtures,80reader checks all<=5s; maximum native storage
native0.927933/HTTP0.934914s, Docker storage native0.827498/HTTP0.839105s. Real activated
expiry0/config/process/identity proof retained. CR005/API-F003 scoped resolved with current
Linux ordinary boots71.368/62.573s observed (not SLA) and separate Stop/policy/replacement/
detach controls. CR001–004 scoped resolutions retained. None is full bothOS/physical closure.

## New personal dependency experiment

Exact resources, commands, errors and results: resource.json, probe-build.json,
run-identity-prototype.py, identity-probe.go, prototype-result.json, cleanup.json.
Own VM `ab-nfs-sr023-8fd5ad2f`, public Mac Tahoe clone digest87f3aa5c…e187377, no host shares,
clipboard/USB/audio, credentials, user apps or product install. macOS26.6.2/25G83,
Darwin25.6.0 arm64. Root used only for ordinary guest shutdown/restart; helper/file controls
ran as admin501:20. Actual Go no-cgo helper uses fd/Fstatfs + system diskutil info-plist
and returns persistent UUID+inode, keeping raw device as observation. It is a disposable
capability probe, not an implementation or replacement public CLI.

| Observation | Raw dev | Persistent directory ID | APFS VolumeUUID |
| --- | ---: | ---: | --- |
| Before boots |16777229|507377|a19fe379-be62-4297-9a39-3934cc88214b|
| Ordinary boot1 |16777230|507377|same|
| Ordinary boot2 |16777230|507377|same|
| Ordinary boot3 |16777228|507377|same|
| Same-path different directory / copied bytes+marker |16777228|514448|same|
| Original directory restored |16777228|507377|same|
| First actual APFS volume, same owned mountpoint |16777241|2|2f51721d-414d-4bb9-9a1d-6168a7ef2330|
| Second actual APFS volume, same owned mountpoint |16777241|2|b9d424c0-6cee-4dae-bb26-91edf2dfbc62|
| First actual volume reattached |16777241|2|2f51721d-414d-4bb9-9a1d-6168a7ef2330|

11observations including permission restoration/final original; raw distinct boot times
and original hashes retained. No synthetic dev/identity edit. Both test APFS volumes had
identical inode AND raw device, marker/content and mountpoint, isolating why inode-only or
raw-device substitution is insufficient. Candidate comparison rejects both real replacement
cases; actual helper rejects leaf symlink, symlink ancestor and unreadable nonroot source.
These are probe/comparison outcomes, NOT public product refusal or mounted NFS read/write.
No private permission tree exported, no NFS mount/service/config created. Diskutil measured
0.0788–0.7405s across these observations, not a performance/restart SLA. Same-volume UUID
from cloned public baseline is not independent physical/global-unique identity evidence.

**Result Pass at dependency feasibility only.** Three ordinary boots keep candidate identity;
original project/marker restored unchanged. Cleanup Complete: both owned disk images detached,
exact own clone stopped/deleted, PID absent, own downloaded compiler/scratch removed; public
baseline/tool cache retained. No source migration, user data deletion or app/provider action.

## Alternatives and state evidence

Keep rawdev+inode: contradicted by normal API005 and new real boots. Drop device/use inode
alone: two APFS volumes above share inode2. Marker/content-only: copied control passes those
but is a different source. Auto-refresh binding on mismatch: blesses replacement. Generic
retry: cannot resolve exact persisted mismatch. Native attribute APIs are plausible but
would add unneeded raw syscall/cgo/assembly integration; the system trusted machine-readable
route compiled on both architectures and ran on actual supported APFS. No disk naming guess.

Selected design is canonical SR023: Mac VolumeUUID+inode; Linux pair unchanged; config shape
validation; platform fd-to-volume mapping; existing setup binds pending once before later
side effects. No new generic owner, source-retention, engine, watcher, proxy or retry policy.

Persisted-state-evidence.json records actual source history, local origin/personal tree,
local containing tags and empty qualification/publish refusal. Known installed old Apple
records are unqualified API fixtures, exact cleanup upstream reported; local evidence is
not universal deployment absence. Source/marker/attachment/private data unchanged. Linux and
current Apple bindings directly usable. Truly unbound new-source intent is not a binding.
Device-only Apple bound state cannot recover original volume UUID: matching-old-candidate
public drain/detach BEFORE new install, then fresh create preserving source/marker. No
automatic conversion or startup migration. Actual supported retained deployment would require
new concrete transition evidence; no silent data-loss permission or speculative migrator.

## Remaining uncertainty / verification boundary

Independent architecture review required for the persisted binding and pending sequencing.
After implementation/source review, API-F005 public corrected Mac create/boots/automatic
mounted nonroot RW first, then reconnect/replacement controls. Unit parser tests/amd64 compile
are not actual amd64 execution; prototype not product, network, managed Docker, physical or
permission/privacy matrix qualification. Remaining full gates and approved D001/DEC015,
IMP-D001/FUP001/peerNAT/physical-profile-inference-privateLAN limits are unchanged. No release,
TaskDone, merge/push/tag/user-verification or independent test-code Pass claim.
