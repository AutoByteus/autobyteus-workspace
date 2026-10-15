from pathlib import Path
E=Path(__file__).resolve().parent;T=E.parents[2]
p=T/'investigation-notes.md';s=p.read_text();assert s.startswith('# Investigation Notes — Shared Network Workspaces\n');s=s.replace('## Current SR022 —','## Historical SR022 —',1)
intro='''
## Current SR023 — CR007 / API-F005 Mac source identity across ordinary boots

2026-10-15; **Architecture Design Complete / Ready SR023 / Large / High**, unchanged
**Approved SR018**. Read current CRR012 before work; review342572f01969a2253785281df3764f3add6ffa7c,
receiptb562a3a8a1d9fcbff024ba039363f3db15f7f08a, API005190e130290ca74307430fac6b28f0bc736766033.
Productiond65aeda24fc4b9a534a3941b194dd4a55b88c00c unchanged. Full authorities, exact
production trace, supported scenario, primary contracts, state evidence and alternatives:
[evidence/design-recovery/sr023/source-identity-investigation.md](evidence/design-recovery/sr023/source-identity-investigation.md).

- Fact: API005 public nativeMac create succeeds, then three ordinary boots assign different
  raw st_dev to the SAME APFS volume/directory; saved full-pair guard rejects before backend/
  mount. No false-ready/data loss reported. This is inadequate identity lifetime design,
  not IR008 regression, outage, unsupported filesystem or requirements gap.
- New personal experiment: one isolated Mac VM, no product installed, no-cgo Go dependency
  probe through actual Fstatfs + system diskutil. Three normal boots change raw dev29->30->30->28
  but keep volumeUUID/inode507377/bytes/mode; same-path replacement directory changes inode;
  two actual different APFS volumes share raw dev16777241/inode2/marker/bytes but different UUID.
  Candidate distinguishes replacements; helper refuses symlink/ancestor/unreadable controls.
  All11 observations retained, exact own VM/process/compiler scratch cleanup Complete. This
  is NOT corrected public lifecycle/mount/API/physical evidence.
- Decision: existing platform/config/setup owners persist Mac VolumeUUID+inode; Linux pair
  unchanged. Raw dev is capture-local correlation only, not silently ignored from old state.
  Bound pending identity reused/compared, not recaptured via stale NewSource; complete binding
  saved before later apply effects. No marker-only, mismatch rebind, generic retries or new owner.
- Data investigation: no supported released predecessor established; local source/tag/release
  and actual known installed fixture evidence retained. Old bound Apple device-only records
  cannot safely infer their original volume UUID. Matching-old-candidate drain/detach before
  fixture rebuild on preserved source/marker; no automatic migration or global absence claim.
  Current Apple and unchanged Linux records directly reusable; truly unbound intents distinct.
- Current independent verdicts remain CRR012 Fail / API005 Fail57.14% / broader Required.
  CR006/API-F004 now scoped resolved at API005 bothLinuxstorage/native+realmanagedHTTP80checks;
  CR005/API-F003 scoped reboot/stop controls and CR001–004 resolutions remain. ARCH006 applies
  SR022, not this delta. Selected architecture/source review and API-F005-first product proof
  required before remaining full matrix. Requirements/approval/specialist/source untouched.
- D001/DEC015 deferred NOT fixed; IMP-D001 private current links/current source Update/Remove/
  AGY local unchanged; FUP001 PM custody. Only Mac Docker STORAGE deferred, not Mac native
  boots or Docker clients. Existing physical/profile/inference/privateLAN/peerNAT limits remain;
  no new permission/waiver, TaskDone, release, user-verification or duplicate dispatch.

### SR023 supplement inventory (Solution Designer owned, evidence only)

| Path under evidence/design-recovery/sr023 | Purpose / status / applicability |
| --- | --- |
| source-identity-investigation.md; primary-contracts.md; retained Apple manuals/header | Exact production/model boundary and primary source basis; complete, not intended-behavior authority |
| persisted-state-evidence.json | Actual source/release/known fixture basis for explicit hosted/pending dispositions; no universal deployment absence |
| prepare/resume/build/run scripts, resource/toolchain/probe-build, identity-probe.go, prototype-result/console | Personal no-cgo identity feasibility across real Mac boots and replacements; dependency scope ONLY |
| cleanup-prototype.py; complete-cleanup.py; cleanup.json; attempts and failed-attempt directories | Exact owned cleanup Complete, failed harness attempts retained |
| prior-* snapshots; complete-design.py; complete-context.py | Authored derivation/history preservation, not competing live authorities |
| input-audit.json; audit-package.py; final-audit.json; package-index.json; routing.json | Cumulative1302 input refs/protected authorities/old dist/history, complete handoff context and fresh rule result |

Earlier sections below retain their historical state; current status/ordering above governs.
'''
s=s.replace('# Investigation Notes — Shared Network Workspaces\n','# Investigation Notes — Shared Network Workspaces\n'+intro,1);p.write_text(s)
p=T/'solution-revision-record.md';s=p.read_text();old=(E/'prior-solution-revision-record.md').read_text();assert s==old
s+='''

## SR023 — CR007 / API-F005 ordinary Mac restart source-identity recovery — 2026-10-15

- Trigger CRR012 Fail/Design Impact CR007(P1), API005-F005 confirmed nativeMac ordinary-boot
  refusal; review342572f01969a2253785281df3764f3add6ffa7c / API005190e130290ca74307430fac6b28f0bc736766033.
  Prior ReadySR022 / ARCH006 / IR008; productiond65aeda24fc4b9a534a3941b194dd4a55b88c00c unchanged.
- Same original APFS volume/directory loses availability because persisted raw st_dev changes
  across normal boots. Supported SCN009/012/013, BEH001/004/005, REQ014/017/019,
  AC007/014/017/018/019 unchanged; no Requirement Gap or altered restart/data/privacy guarantee.
  Approval-record-sr018 continues; no new approval/behavior supplement or Product request.
- Authorities reread, exact platform/config/setup/launchd production path and pending recapture
  traced; repository migration guideline/predecessor and actual released/installed evidence
  investigated before transition choice. Primary source contracts/limits retained in E23.
- Personal isolated no-cgo dependency experiment: three ordinary Mac boots keep UUID+inode
  through observed raw-device changes; copied marker/content cannot disguise replaced
  directory or two actual APFS volumes with SAME raw dev+inode. Symlink/ancestor/nonroot
  permission refusals retained.11 observations; both Darwin architectures compile, only
  arm64 executes. Exact-owned cleanup Complete; failed prepare/build/cleanup assertions
  preserved. Not production implementation, public lifecycle/API/physical Pass.
- Canonical design now ReadySR023: Mac APFS VolumeUUID+inode from descriptor-correlated
  trusted diskutil machine output; Linux pair unchanged; complete variant validation;
  existing pending/apply binding established once and persisted before later effects.
  No raw-device fallback, marker-only identity, mismatch refresh, migration-by-schema,
  cgo/engine/proxy/watcher/retry/supervision subsystem. Existing guards/safeguards preserved.
- Explicit data dispositions: source/marker/attachment/private/session untouched; Linux and
  current Apple bound state reusable; true unbound intent may bind initially; old bound
  Apple device-only fixtures not inferable, drain/detach matching candidate before fresh
  current setup preserving source UUID. No supported released predecessor established,
  not universal absence. Actual supported retained data -> return evidence before cutover.
- Canonical sections changed: design approval/current-state/evidence/health/identity/config/
  persisted transition/legacy/file-map/sequence; investigation current section and supplements;
  full handoff. Requirements/approval and specialist authorities unedited.1302 incoming refs
  preserved cumulatively; previous solution history is an unchanged byte prefix.
- **Architecture Design Complete / ReadySR023 / task_size Large / architectural_risk High.**
  Bounded shared-model/lifecycle delta reuses existing owners; full privilege/multiplatform
  scope retains route classification independent of note volume. ARCH006 is historical
  approval of SR022, not approval of SR023; re-review the affected identity/state rationale.
- CR006/API-F004 now independently scoped resolved API005:40fixtures80native+managedHTTP
  reads<=5s on Linux native+Docker storage. CR005/API-F003 scoped normalboot/Stop/policy/
  replacement/detach and CR001–004 scopes retained. CRR012 Fail/API005 Fail57.14% remain.
- Next after review: implementation -> selected source review -> API-F005 corrected public
  nativeMac create/ordinaryboots/automatic mounted nonroot RW FIRST, then reconnect/real
  replacement controls, proportionate Linux regressions and remaining full matrix. No
  synthetic identity edit/public probe substitute. Successful af9f23 REST test-code review
  still awaits passed API package. D001/DEC015 deferred NOTfixed; IMP-D001/FUP001/access
  limits unchanged. No release/TaskDone/merge/push/tag/user-verification or duplicate API route.
- Routing recorded after fresh rules below. Personal execution; no delegated copies.
''';p.write_text(s)
print('Updated investigation and cumulative solution history')
