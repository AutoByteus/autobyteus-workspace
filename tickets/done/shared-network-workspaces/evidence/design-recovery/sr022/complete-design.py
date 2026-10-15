"""Persist design-only recovery once dependency experiment and owned cleanup finish."""
from pathlib import Path
import json
E=Path(__file__).resolve().parent;T=E.parents[2];R=T.parents[2]
r=json.loads((E/'prototype-result.json').read_text());assert r['result'].startswith('Pass controlled')
assert json.loads((E/'cleanup.json').read_text())['result']=='Complete'
p=T/'design-spec.md';s=p.read_text()
s=s.replace('current revision **SR-021**; status **Ready — Architecture Design Complete (selected Docker startup recovery; re-review required)**','current revision **SR-022**; status **Ready — Architecture Design Complete (healthy source-to-client freshness; re-review required)**',1)
s=s.replace('SR021 changes no requirements/ACs.','SR022 changes no requirements/ACs. REQ004/AC003/QR001 retain healthy source-folder writes and <=5s fresh-client visibility; no platform/writer narrowing. SR021 selected-client restart design remains implemented and scoped independently validated by API004.',1)
a=s.index('- Canonical evidence:');b=s.index('\n- Authorities read',a)
s=s[:a]+'''- Canonical evidence: investigation-notes.md and evidence/design-recovery/sr022/. Incoming CRR010/CR006/API-F004 is the current Design Impact; API004 remains Fail57.14%/broader Required. ARCH005 passed SR021; IR007/source d318bd9db935affdf16d141ef4e88a6c0e4939b5 implements its selected-client recovery. API004 independently resolves CR005/API-F003 with two ordinary whole-host boots without manual repair and separate normal-stop/policy/replacement/detach controls. Do not reopen that correction. CR001/002/003/004 retain their actual scopes; API003 fresh native-Ubuntu setup and API004 fresh nativeMac setup/boot evidence do not establish full platform/client qualification. CRR009 source Pass is historical, not a current product Pass. Cumulative incoming CRR010 index contains1003 references. Requirements/approval and specialist artifacts unedited; D001 deferred, IMP-D001 unchanged. Personal SR022 exact-source audit and controlled A/B/A native dependency experiment support expiry0; they are not a corrected public-command/API/managed-Docker/physical Pass.''' + s[b:]
s=s.replace('and recovery2026-10-14:', 'and recovery2026-10-14/15:',1).replace('(reread for SR021)','(reread for SR021/SR022)',1)
s=s.replace('current IR002–006 production implements','current IR002–007 production implements',1)
s=s.replace('API003 resolves CR003 at public native-Ubuntu setup scope, but CR005 exposes a missing selected-client startup completion boundary.','API003 resolves CR003 at public native-Ubuntu setup scope; API004 resolves the subsequently implemented CR005 selected-client completion. CR006 now exposes a server/client freshness-policy gap for direct source writes.',1)
a=s.index('SR021 current path:');b=s.index('\nAdd **one standalone',a)
s=s[:a]+'''SR022 current path: public setup generates a Ganesha/VFS export without Attr_Expiration_Time, inheriting server metadata expiry60. Native and Docker clients already use actimeo1; those clients can revalidate against stale server attributes. API004 demonstrates ~61s fresh-read staleness after healthy source fsync/close. Explicit export expiry0 removes that server metadata validity window while retaining client policy and the direct filesystem data path. Existing Apply/Write/Verify owners remain; no separate coherence service. SR021's bounded exact-ID completion remains unchanged and independently passed its API004 reboot/stop controls.''' + s[b:]
s=s.replace('Concrete files below.','SR022 changes only the owned Ganesha export policy, two small hosted-config verification entry points, their focused tests and documentation. It does not change runtime/REST readers, retry behavior or release gates. Concrete files below.',1)
row='| code-review-evidence/crr-008/package-index.json;'
a=s.index(row);b=s.index('\n',a)
s=s[:a]+'''| code-review-evidence/crr-010/package-index.json; evidence/api-e2e/api-rev-004/package-index.json; evidence/design-recovery/sr022/freshness-investigation.md and prototype-result.json | Normal healthy source-write failure; exact engine cache contract; controlled default/zero/restored-default comparison; generated-config disposition | Native same-kernel dependency prototype only, not implemented public behavior/managed HTTP/Docker storage/physical qualification. Independent API-F004 closure required |
| evidence/design-recovery/sr021/lifecycle-investigation.md; API004 two-reboots and control receipts | Bounded SR021 exact-ID recovery and current stop policy | Prior CR005 is scoped resolved, retained unchanged |''' + s[b:]
a=s.index('Independent review history preserved:');b=s.index('\n\n## Relevant Behavior',a)
s=s[:a]+'''Independent review history preserved: ARCH001–005, IR001–007, CRR001–010 and API001–004. Current **CRR010 Fail/Design Impact** and **API004 Fail57.14%/broader Required** remain independent authorities. CR001–005 resolutions retain actual scopes, not a full product Pass. Complete raw/history references remain indexed by CRR010/API004 and the SR022 cumulative index. No specialist artifact edited. Delivery/finalization **N/A — not yet performed**; external Product specification **N/A — not requested/applicable**.''' + s[b:]
# Update client-only policy in its authoritative paragraph, preserving other contracts.
needle='actimeo=1'
print('actimeo locations',[(i+1,l[:140]) for i,l in enumerate(s.splitlines()) if needle in l])
section='''### SR022 — end-to-end healthy freshness and owned-config lifecycle

**Decision/owner.** In existing `backend.GaneshaConfig`, emit `Attr_Expiration_Time = 0;`
at the owned **EXPORT** level for native Linux and Docker-on-Linux storage. No CLIENT
override, global/unrelated export change, extra policy registry or user setting.
Retain existing native/Docker `hard,tcp,vers=4.1,actimeo=1` (Docker nosharecache),
all-squash/allowlist, source path/UUID, corrected4.3 package pair, kernel and protocol.
Apple nfsd configuration is unchanged. The native and Docker clients on BOTH OSes
remain required; shared generator reuse is not evidence every mode passed.

**Why.** Exact4.3 source defaults server attrs to60s. Client1s alone cannot discover
an original-source write when the server returns old change attributes. Expiry0
forces the server's attribute path to refresh from VFS; this avoids an additional
server TTL/delegation validity window. The controlled SR022 A/B/A experiment on exact
retained packages supports this choice on native Linux: unique warmed fixtures stay
stale with default policy, become current within5s with zero, and stay stale again
with restored default. Candidate covers1KiB/1MiB in-place, atomic replacement and
negative-lookup creation. See raw timings/limits, not a blanket eventual-consistency
or performance claim. Extra backing metadata calls are the explicit correctness-first
tradeoff. No byte proxy, cache flush, app read retries, watcher or new runtime owner.

**Current public lifecycle.** Fresh Apply writes the corrected generated bytes before
engine activation using current WriteGanesha/InstallGanesha; current exact repeat is
a no-op. Reconnect/service continue exact VerifyGanesha before existing EnsureGanesha
or EnsureEngine and then the same mount/nonroot/selected-node checks. Status adds an
existing-owner VerifyGanesha check for a hosted native/Docker Ganesha configuration
before HostReady; status never writes config or restarts. Connect-only and Apple paths
remain unchanged. Detach preflights an **existing** hosted Ganesha config with the same
verifier before detachNodes/unmount/job/engine mutation; absent config is allowed for
safe retry of already-partial owned teardown. Existing exact unit/container/removal
checks still apply. Different/malformed existing config is retained with error and no
teardown; no unconditional overwrite or late mismatch after teardown has begun.

**Generated-state disposition.** This unreleased first delivery has no evidenced
published NFS predecessor: qualification/release fields remain empty, known old runtime
fixtures were cleaned up, retained files are unqualified test candidates. No persisted
source/marker/attachment/project/session format changes. Current different config bytes
(including old test templates omitting expiry0) remain refused by Write/Verify, not
silently called an upgrade. Dispose/recreate owned old candidate fixtures by public
drained detach with their matching old candidate **before** installing the new one,
then create against the same preserved nonempty source/marker. Do not automatically
rewrite a user's file or delete source/recovery data. If an actual retained supported
deployment is discovered, return concrete transition evidence to Solution Designer;
do not invent a compatibility reader or migrator. Same-current repeat/restart remains
automatic as approved; no extra end-user first-install step is introduced.

**No hot update.** Merely replacing generated bytes is insufficient: Docker has a
read-only single-file bind and existing Ganesha cache entries retain their expiry.
This revision does not implement live config migration/SIGHUP/restart orchestration.
Fresh engine activation consumes the current template; existing exact current configs
are reusable. An externally changed file is not authority to silently reconfigure a
running service or claim loaded-policy verification.

**Files and clean-cut boundary.** Change `internal/backend/ganesha.go` (the one generator),
`internal/setup/status.go` and `internal/setup/lifecycle.go` (thin calls to current
verification owner), nearest backend/setup tests, and NFS README/operator/test guidance.
If missing-vs-present preflight needs a small helper, keep it with existing backend
config ownership, not a new cross-layer framework. Keep WriteGanesha/VerifyGanesha
strict byte comparison and0700/0600 policies. No change to Docker node recovery,
restart intent, daemon config, node images/ports/private data, mounts/volumes, source
identity, native runtime profiles, REST handlers, frontend or engine build recipe.
Normal source-hash/release metadata regeneration belongs to implementation packaging;
reuse exact engine packages, do not rebuild the engine for a config-only change.

**Verification and sequencing.** Selected architecture review -> implementation ->
independent source review -> API/E2E. First independent API case is API-F004 on fresh
public native storage: prime two actual readers with old bytes, direct source unique
in-place write/fsync/close, then fresh native and actual managed-node HTTP opens;
record per-reader elapsed time and exact bytes for repeated1KiB and1MiB fixtures under
unchanged5s, no manual config edit/dropcache/remount/retry workaround. Capture generated
and actually used config/engine invocation, package/CLI/image/mount identities, source
inode/device/owner/mode/UUID and private preservation. Then atomic replace/new/delete/
rename/directory/symlink and client-to-client directions under existing ACs; validate
both Linux STORAGE forms and both OS native/managed clients and healthy previews.
Retain API004 negative evidence rather than require an unsafe user downgrade.

Focused implementation tests: native/Docker templates each contain exactly the export
option; absent/current/different config Write/Verify outcomes; Status mismatch never
HostReady; Detach mismatch produces no node/mount/job/engine mutations; missing config
supports exact-owned partial-detach retry; public current repeat/reconnect remains
idempotent. Assert unchanged source/client options/security and Apple/connect-only
behavior. Do not validate only by string matching: actual repeated source-write reads
are mandatory downstream. Preserve SR021 two-boot/normal-stop/current-policy-no/
unselected/launcher-replacement/drained-detach regressions; do not turn60s observed
reboot completion into a new SLA. Full existing physical/native-tool/preview/user/
release gates remain. No independent API or source Pass is issued by this design.

'''
pos=s.index('### Data identity, permissions and network');s=s[:pos]+section+s[pos:]
# Add state subject immediately ahead of release metadata row.
pos=s.index('| Release engine manifest and generated embedded package bytes |')
s=s[:pos]+'''| Generated owned Ganesha config | **Fresh current generation; no evidenced released predecessor migration** | SR022 export expiry0; exact current bytes reusable, different bytes retained/refused. Retire disposable old test setups with matching candidate public detach before reinstall. Status/pre-teardown validation avoids false readiness/partial mutation; no live reload or source/marker rewrite |
'''+s[pos:]
# New file responsibility row.
pos=s.index('| autobyteus-nfs/internal/backend/{apple,apple_apply,apple_startup,ganesha,ganesha_native}.go;')
s=s[:pos]+'''| autobyteus-nfs/internal/backend/ganesha.go; internal/setup/{status,lifecycle}.go; nearest backend/setup tests; NFS README | SR022 export-level expiry0 through shared generator; read-only hosted-config status and pre-teardown exact validation | Reuse existing verifier/lock; no migration or runtime data-plane owner; Apple/connect-only and SR021 recovery unchanged |
'''+s[pos:]
s=s.replace('Table every experiment with **node role/ID','SR022 API-F004-first ordering above supersedes historical API-F002/API-F003 first-case orders for this incoming correction; prior scoped resolutions remain regression evidence, not reopened failures.\n\nTable every experiment with **node role/ID',1)
p.write_text(s)
