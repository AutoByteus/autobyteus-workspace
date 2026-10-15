# CRR013 independent forward-path / structural re-audit

Source d3c88f37c30ee74a89a95a4f6906992667c9b875; input handoff2dfcffbb.
Approved SR018 / Ready SR023 / ARCH007; no production edits by reviewer.

## Independent supported basis

SCN009/012/013, REQ014/017/019, AC007/014/017/018/019: the storage owner
creates on the same nonempty supported source, exits the terminal, ordinarily
reboots and resumes shared work without manual configuration. The same-source
preservation contract separately requires refusal of a real replacement. Partial
setup/retry is explicitly supported; it is not inferred from a synthetic pending
record. MP011/012 retain these independent origins. CRR012/API005 is actual old
product evidence; SR023's dependency probe supports a choice, not product closure.

## DS001 creation / retry, DS006 automatic reconciliation

- cli/run.go:66–95 checks fixed root executable/config ancestors and owns admin
  locking; interactive path reaches Plan/consent/Apply, service path reaches locked
  Supervise -> Reconnect(false). Existing launchd RunAtLoad/KeepAlive in jobs.go,
  serial30s service/supervisor.go, no second scheduling/retry owner.
- setup/plan.go:53–104 validates selection, captures existing source or qualifies
  an absent source's parent, preserves marker storageId and backend selection.
  Config Validate is intentionally metadata-only for planned new sources and
  backend renderers; validateSourceIntent distinguishes zero-new from bound.
- setup/apply.go:20–40 refuses invalid/bound-mismatch before effectful work; stale
  NewSource on a complete binding is cleared. Preflight/selected-node checks and
  initial SaveIntent precede installation. service.CreateSource runs exact mkdir
  under the initiating nonroot uid/gid. apply.go:61–69 immediately calls bindSource;
  :205–216 captures/validates, clears NewSource and saves bound intent. Pointer
  alias h and p.Hosted is the same object, not a lost local copy. Save failure
  returns before CheckSource, nonroot marker probe, handle work or export.
- apply.go:71–92 rechecks identity, then nonroot marker/RW and handles, then writes
  hosted state and pending; attachment/public descriptor and Apple/Ganesha effects
  follow. AtomicFile uses owned temp, chmod, write/fsync, rename and parent sync.
  No cross-resource transaction is claimed.
- pending.go:13–51 validates pending, checks/reuses complete binding irrespective
  of old NewSource flag, never re-captures it. Only a true zero-new record without
  hosted state may first-capture through fresh displayed-plan/consent. Existing
  absent source stays unbound. Partial/old/mixed bindings refuse before observation.
  Plan itself does not persist; Apply saves before later effects. Service continues
  to refuse pending reconstruction; CLI interactive recovery/consent remains owner.
- CheckConfiguration apply.go:178–202 validates complete identity and attachment
  storage/installation consistency. lifecycle.go:25–49 checks actual source before
  Apple Ensure/Ganesha/host mount; final nonroot mounted proof precedes selected
  Docker completion. No saved-identity refresh on match/failure/ordinary boot.
- Status calls complete configuration validation and existing mount/marker/RW
  observation; no source repair/Start. Detach validates current shape (pending via
  validateSourceIntent) and exact-owned resource teardown, but does not need a live
  source. Old Apple device-only fixture cutover uses matching OLD CLI first.

## Platform bounded local capture and config shape

- source.go:16–33 privacy/overlap selection; :37–53 Lstat real-directory and exact
  canonical path, raw stat pair. CheckSource :55–67 validates bound representation,
  calls OS capture and compares full variant value, not marker alone.
- source_darwin.go:14–54 opens O_DIRECTORY/O_NOFOLLOW/CLOEXEC; defer Close covers
  every post-open exit. Fstat/Fstatfs validates local APFS and returns mounted
  /dev device, canonical mount and fsid. Initial raw pair must match held fd.
  Existing Commands.Run executes fixed `/usr/sbin/diskutil info -plist <actual fd
  device>` with trusted root-owned path and clean env. No shell/PATH discovery.
- volume_plist.go limits ACCEPTED reply to1MiB and depth32; complete plist/dict,
  unique keys, structured values, no extra/trailing document or entity expansion.
  Unrelated scalar numeric/date content is ignored, not used as identity. Required
  identity keys are typed strings; volume_identity.go correlates DeviceNode,
  MountPoint, FilesystemType=apfs and canonicalized valid nonzero VolumeUUID.
- Post-command sourcePath + same held fd raw pair/mount/fsid correlation must
  still agree. Persisted Apple value is UUID+inode only, raw device stays local.
  This is not hostile-admin atomic replacement/UUID anti-cloning proof. No new
  command-output streaming framework is required by this fixed trusted command;
  1MiB refers to parser acceptance, not a promise of capped Runner allocation.
- config/source_identity.go uses the existing backend discriminator: Apple requires
  canonical lowercase nonzero UUID/inode and Device0; both Linux backends require
  positive device/inode and empty UUID. No schema/platform selector or parallel
  durable truth. source_linux.go retains raw pair plus existing ext4 qualification.
- `QualifyFilesystem` is not dead on Darwin: internal-handles -> QualifyHandles ->
  QualifyFilesystem -> shared qualifyAPFS. OS-specific files selected by Go suffix.
  New parser helpers are transitively reached by SourceIdentity, not test-only code.

## Other primary/return spines rechecked, not reexecuted

- DS002: ordinary closed source write -> owned Ganesha EXPORT expiry0 -> OS client
  -> fresh peer/native/HTTP read. Ganesha renderer, exact verifier and IR005 engine
  bytes unchanged. API005's40fixtures80reads is independently scoped resolved;
  current source check is not new runtime freshness qualification.
- DS003: requested new-run/restore -> shared-run-workspace-admission ->
  SharedWorkspaceBinding -> expected public connection/mount/marker -> runtime
  private exposure -> existing native process/tools. Public descriptor does NOT
  expose privileged Hosted.Identity; no app reader needs an APFS schema migration.
  RuntimeSkillProfile remains wrapper/link owner, not source retention owner;
  source Update/Remove and AGY/local policy unchanged (IMP-D001).
- DS004 return: existing explorer/content/static/artifact/PTY -> OS filesystem ->
  response/stream/UI. No IR009 changes; previously reviewed ownership/evidence
  retained, no fabricated current full-product/native-agent/physical Pass.
- DS005: Nodes Guide -> pure nfsLauncherCommands descriptor -> displayed instructions
  -> user terminal -> DS001. Published descriptor remains null; no false availability.
- DS006-L: host proof -> current exact selected ref/failed-start eligibility -> fresh
  daemon-side proof -> reinspection -> write-ahead consumption -> one same-ID Start
  -> API verification. start_recovery.go unchanged; status never invokes Start.
  API005 ordinary boots and separate Stop/policy/replacement/detach controls retain
  their scope, including documented empty-DNS normalization, not raw byte equality.

No new boundary bypass, duplicate authority, generic journal/cache/supervisor,
old-Mac fallback or unrelated production expansion found. Full structural checklist
and ten scores rerun because shared Identity/interface/lifecycle changed. This is
not a fresh execution of unchanged server/UI/runtime suites or full repository audit.
