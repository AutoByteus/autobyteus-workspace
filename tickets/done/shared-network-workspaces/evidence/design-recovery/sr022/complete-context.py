from pathlib import Path
import json,datetime
E=Path(__file__).resolve().parent;T=E.parents[2];R=T.parents[2];r=json.loads((E/'prototype-result.json').read_text());assert r['result'].startswith('Pass controlled')
assert json.loads((E/'cleanup.json').read_text())['result']=='Complete'
rows=[]
for p in r['phases']:
 for c in p['cases']:
  v=['not observed (6s window)' if x is None else f'{x:.3f}s' for x in c['firstExact']]
  rows.append(f"| {p['phase']} | {c['name']} | {v[0]} | {v[1]} | {c['withinFiveSeconds']} |")
table='\n'.join(rows)
result=f'''\n## Executed result — controlled policy comparison complete

One new owned Ubuntu24.04.5/ext4/aarch64/kernel7.0.0-38 guest, defaultdirectorydelegationsY;
actual CLI SHA0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c and
Ganesha/VFS4.3-8ubuntu1+autobyteus1. Public initial create had no engine preinstallation;
config edits were explicitly diagnostic AFTER that baseline, not a product fix.
Source `{r['source']}`; source/mount storage UUID `{r['connection']['storageId']}`.
Two same-kernel hard4.1 native mounts, second nosharecache; real1000:109/clearedgroups.

| Policy phase | Unique warmed case | Native mount1 first exact | Native mount2 first exact | Both <=5s |
| --- | --- | --- | --- | --- |
{table}

Default-negative phases deliberately observed6s rather than spending another minute
repeating API004's61s observation. These are reproduced5s violations, not6s exact
convergence times. Each phase warmed unique old bytes before source write, so restarted
engine/cold cache alone does not explain candidate success. Candidate source writes
were successfully fsynced/closed before the recorded timer; per-reader end times include
fresh read/hash. All paths retained nonempty preexisting bytes, source identity/mode,
nonroot mapping and source/mount UUID. No kernel setting or cache flush. Extra phase
startup/NFS grace time is outside the post-close measurement and recorded in commands.

This controlled default->zero->default comparison supports the server-attribute policy
as a causal lever for the reproduced native reference failure; it does not establish
that all possible stale reads have one cause. No managed-node HTTP, Docker STORAGE,
Mac/independent peer/physical, production-source patch or corrected public reconnect
was exercised. Raw commands/results in prototype-result.json, phase JSON and console.
Public reconnect and drained detach ran only AFTER restoring exact baseline config;
source/marker preserved. Cleanup.json confirms exact owned VM/process/private cache and
scratch disposal. First download timeout is retained separately as harness/infrastructure
incompleteness, not a product failure. Existing15 artifacts and all incoming evidence
are separately integrity-audited. CR006/API-F004 stays open until independent correction
validation; API004 Fail and CRR010 Fail remain unchanged.
'''
f=E/'freshness-investigation.md';s=f.read_text().replace('Subject to the controlled dependency observation below, select export-level','Select export-level').replace('Pending execution: run-prototype.py / guest-visibility.py','Executed: run-prototype.py / guest-visibility.py');f.write_text(s+result)
# Prepend a current factual inventory while preserving previous evidence chronologically.
p=T/'investigation-notes.md';s=p.read_text();a=s.index('---\n# Investigation Notes');historical=s[a+4:].replace('## Current SR021 —','## Historical SR021 —',1)
current=f'''# Investigation Notes — Shared Network Workspaces

## Current SR022 — CR006 / API-F004 healthy committed-file freshness

2026-10-15; **Architecture Design Complete / Ready SR022**, **Large/High**, unchanged
**Approved SR018**. Incoming CRR010 review1240527c804b291ae99c69d6f6cb58f4cba0a09c and
receipt2cd8d35cebafccec6c937a83957f136ce05d0b8b read before action. Production remains
d318bd9db935affdf16d141ef4e88a6c0e4939b5. No requirement/approval/specialist/source edits.
Authorities read and exact production path, supported scenario, primary contracts,
migration investigation and alternative assessment are in
[evidence/design-recovery/sr022/freshness-investigation.md](evidence/design-recovery/sr022/freshness-investigation.md).

- Fact: API004 two healthy source fsync/close trials returned old bytes through fresh
  native and managed-node HTTP reads until~61s, violating existing5s AC003. Code Reviewer
  audited243 rows. Client actimeo1 does not bound server attr cache; generated Ganesha
  config omitted the default60s expiry. Exact selected engine source personally re-audited.
- New bounded experiment: default/expiry0/restored-default on one new private native
  Ubuntu guest, exact retained IR007 CLI/engine, original nonempty source/two native
  mount instances. Default cases miss5s; all four zero-policy cases pass5s; restored
  default fails again. Detailed timings below. This is dependency feasibility, not a
  corrected public-product/managedDocker/physical Pass.
- Design: existing Ganesha generator emits EXPORT Attr_Expiration_Time0; preserve
  hard4.1/client1s/security/source/kernel/packages. Existing exact Write/Verify refusal
  remains; add thin hosted-config verification before Status readiness and before
  Detach side effects. No live migration/reload, read retries or new coherence owner.
  No released predecessor exists; old disposable test templates are retired by their
  matching candidate's drained detach before new install, preserving source/UUID.
- Prior CR005/API-F003 now independently scoped resolved by API004 two real whole-host
  reboots without manual repair plus stop/policy/replacement/detach controls. Keep that
  fix; this is a separate normal-coherence case, not an IR007 regression.
- Requirements/approval018 unchanged; no five-second relaxation, platform/writer
  narrowing, new user decision or outage expansion. ARCH005 covers SR021, not SR022.
  CRR010 Fail / API004 Fail57.14% / broader Required stay authoritative; new design
  requires configured architecture review before dependent implementation/source/API.

### SR022 supplement inventory (Solution Designer owned; evidence only)

| Path under evidence/design-recovery/sr022 | Purpose / applicability / status |
| --- | --- |
| freshness-investigation.md; engine-source-check.json; versioned primary text files | Path, default/zero mechanism, config lifecycle and no-migration evidence; complete, not intended-behavior authority |
| prepare-prototype.py; resume-prepare.py; resource/download/boot and download-attempt-1 | Exact owned disposable resource and first download-timeout record, complete |
| run-prototype.py; guest-visibility.py; prototype-result.json; three phase JSONs; console | Native A/B/A dependency experiment, limited scope above |
| cleanup-prototype.py; cleanup.json; attempts.md | Exact owned guest/process/private cache disposal and harness limits, Complete |
| input-audit.json; final-audit.json; package-index.json; routing.json |1003 incoming references, protected-authority/15retained-artifact checks and complete handoff routing |

{table}

Detailed table headers/units and raw data are in the evidence report; native mount1/2
are same-kernel instances, not independent physical computers. All prior experiments,
failed attempts, API histories and remaining full-matrix restrictions remain below and
in the cumulative index. No merge/push/tag/release/TaskDone/user-verification claim.

---
'''
# Avoid a headerless second table: exact same table with its header.
current=current.replace(table,'| Policy phase | Case | Mount1 first exact | Mount2 first exact | Both <=5s |\n| --- | --- | --- | --- | --- |\n'+table)
p.write_text(current+historical)
# Cumulative history is append only.
history=f'''

## SR-022 — CR006 / API-F004 healthy freshness design recovery (2026-10-15)

- Trigger: CRR010 Fail/Design Impact, CR006 P1 and API004 Fail57.14%/broader Required;
  review1240527c804b291ae99c69d6f6cb58f4cba0a09c, receipt2cd8d35cebafccec6c937a83957f136ce05d0b8b.
  Prior Ready SR021/ARCH005/IR007 remains history; production d318bd9 unchanged.
- Impact: **Design only**, Approved SR018/approval018 retained unchanged. Affected
  SCN002, BEH002/003, REQ004, AC003, QR001; preserved AC009/017 and SR021 lifecycle.
  Healthy direct-source writes and5s fresh-open bound stay fixed, no approval reopening.
- Evidence: selected engine source default60 plus production generator/client trace;
  personally re-audited exact source and A/B/A native dependency comparison. Default
  misses5s, export expiry0 passes four unique1KiB/1MiB/in-place/atomic/new-file cases,
  restored default misses5s. All limits/commands/hashes/first-download timeout retained
  in evidence/design-recovery/sr022; exact owned guest/private cache cleanup Complete.
- Revised canonical sections: design approval/current state/evidence, DS002 freshness
  policy and existing config lifecycle, persisted-generated-config disposition, concrete
  files and API-F004-first validation; investigation inventory and complete handoff.
  Minimal shared generator change plus current verifier calls in status/pre-detach.
  No engine replacement/rebuild, new migration owner, read retry/watchers/proxy or outage
  subsystem. No source/marker format change; different existing config bytes stay refused.
- Previous issue **CR005/API-F003 scoped resolved** independently in API004 two ordinary
  whole-host boots without manual Start/reconnect and separate normal-stop/policy/
  replacement/detach controls; not reopened. CR001–004 scopes retained.
- Result **Architecture Design Complete / Ready SR022**, task_size **Large** and
  architectural_risk **High** for the unchanged full privileged multi-platform package.
  Existing owners suffice; no new design spine. Independent review needed for affected
  delta; ARCH005 does not approve it. Routing to be recorded after fresh rule lookup.
- Still open: independent implementation/source/API closure of CR006; full bothOSnative/
  managedclients/LinuxnativeDockerstorage, independent peers/physical/native actualtools+
  unreadassets/peerclose/restore/Standalone-Team-Org/healthy previews/completed artifact,
  hostedworkflow/signing/amd64engine/publicbootstrap/docs/user/finalization/authorized
  release. Successful test-code review still awaits passed API package. D001/DEC015
  deferred/notfixed; IMP-D001/FUP001/peerNAT/accessquestions unchanged. No TaskDone,
  merge/push/tag/release/user verification or delegation.
'''
p=T/'solution-revision-record.md';p.write_text(p.read_text()+history)
# Preserve the complete old handoff as immutable historical context.
p=T/'solution-design-handoff.md';(E/'prior-solution-design-handoff-sr021.md').write_bytes(p.read_bytes())
handoff=f'''# Solution Design Handoff — SR022 / Architecture Design Complete

## Current request and classification

**shared-network-workspaces / AutoByteus NFS**, Task
`project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`. Solution Designer
`/software_engineering_team/solution_designer`; original requester `/project_task_manager`,
AgentRun `project_task_manager_a5f6d9d306e54970bafdad895bdf731d`.
**Ready SR022 / unchanged Approved SR018 / Large / High / Reviewed route.**
Narrow recovery of **CRR010 / CR006 P1 / API-F004**; no delegation or new Task.
Request independent architecture review of the affected freshness/config-lifecycle delta
before dependent implementation, not another full requirements negotiation or duplicate
API/implementation dispatch. All work personal. No new question is waiting on the user.

Original outcome: one easy install/start command per computer creates or joins one
persistent shared filesystem. Native Mac/Linux and selected managed Docker agent nodes
use ordinary file/CLI/project IO against the actual chosen source folder, not a copy/proxy.
Common root `/Volumes/autobyteus-shared`, `/project` below it. Persistent restart/status/
reconnect/safe detach, source/node/private-data preservation, Nodes NFS Guide matching
Docker Guide pattern, healthy preview and native runtime/private-skill behavior remain.
Git is a compatibility workload, not a sharing mechanism.

## Incoming authority and finding

Read before work: canonical code-review-report/history and E10 execution/source/contracts/
limits, API004 evidence, current requirements/approval/design/history/supplements.
Review1240527c804b291ae99c69d6f6cb58f4cba0a09c, receipt2cd8d35cebafccec6c937a83957f136ce05d0b8b;
API receiptb5167131bfb4e93fc2a8d8216e83ac791d207cc7/evidence41af4e7f82f1c2d9b4b58074b758540391674a4f;
API buildinput902638e584d8e669b632cf81bcc0a95074892403; production
**d318bd9db935affdf16d141ef4e88a6c0e4939b5 unchanged**.

Existing SCN002/BEH002–003/REQ004/AC003/QR001 require a healthy source write that
successfully flushes/fsyncs/closes <=1MiB to be visible on other fresh opens within5s.
Two API004 unique1024byte trials returned old bytes on fresh native and actual managed
HTTP readers until~61s; same source inode/UUID, updatedmtime, no outage/heldFD. Native
reads rule out renderer-only diagnosis. Current common Ganesha generator omits server
Attr_Expiration_Time, inheriting60s while client attributes are1s. The policy gap is
Design Impact, not a changed requirement or an IR007 regression.

## Chosen smallest correction

- Existing common backend.GaneshaConfig writes **EXPORT Attr_Expiration_Time=0** for
  nativeLinux and DockerLinux storage. Retain client actimeo1/hard4.1, original source/
  UUID/permissions, all-squash/allowlist, kernel and exact corrected4.3 engine pair.
  No rebuild/replacement, watcher/proxy/readretry or new data-plane owner. Apple unchanged.
- Current Write/Verify exact guards stay. Fresh apply activates corrected bytes; same-
  current repeat/reconnect reuse them. Add only existing-verifier calls before hosted
  Status declares HostReady and before Detach starts node/mount/job/engine side effects.
  Missing config supports partial-detach retry; different existing config is retained
  with error, not overwritten or partly torn down. Connect-only/Apple unaffected.
- No automatic predecessor migration: feature is unreleased/unqualified; known old
  runtime fixtures are cleaned. Old disposable test configurations must be drained/
  detached by their matching candidate before installing new candidate, then recreate
  on preserved source/UUID. Current different bytes remain refused. No new end-user
  install step or source deletion. If a real supported retained installation is found,
  return concrete evidence rather than invent a legacy reader/migrator. Atomic live
  replacement/SIGHUP is not claimed to update existing cached expiry or Docker file bind.
- Change Scope: generator, thin setup status/lifecycle validation, nearest backend/setup
  tests and NFS documentation. No node-recovery/restart-intent/image/port/private-source/
  mount-option/runtime-profile/REST/UI change. Packaging regenerates source metadata using
  retained exact engine packages; qualification stays empty until actual release gates.

Canonical design gives rationale, state dispositions, files, ordered validation and
rejected alternatives. Requirements/approval unchanged; no relaxed5s/platform/writer
scope or renewed approval needed. Extra backing metadata calls are the explicit
correctness-first cost; no throughput benchmark claim.

## Evidence, identity and limits

Personal exact-source audit checked six retained archive members and versioned primary
contracts. New private Ubuntu24.04.5/ext4/kernel7.0.0-38/aarch64/defaultY guest, public
initial create with exact retained IR007 CLI0036ccef… and no manualenginepreinstall.
A/B/A same-engine config-only comparison, unique warmed source files and two same-kernel
native mount instances: default misses5s; zero passes1KiB/1MiB in-place, atomic replace,
new-file after negative lookup; restored default misses5s again. Exact per-reader times,
commands/config/identities are in evidence/design-recovery/sr022/prototype-result.json
and freshness-investigation.md. No cache flush or timing-bound relaxation.

**This is dependency feasibility, not a patched public-command/managedHTTP/DockerSTORAGE/
Mac/physical qualification.** Diagnostic config editing is not finished behavior.
Public reconnect/drained detach ran only after exact baseline restoration; source/marker
preserved. Exact own VM/process/private cache/scratch disposed (cleanup Complete).
First clone download timeout, resumed own cache and pre-execution script correction
are retained in attempts.md; no product failure attributed to those harness events.
All15 retained IR005/IR007 candidate artifacts remain unchanged. Default production
aggregate **968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764**.
Complete1003 incoming refs preserved plus this round, package-index.json/final-audit.json.

## Prior resolutions and remaining gates

**CR005/API-F003 scoped resolved** by API004 fresh selected Docker-storage setup and
TWO ordinary wholeLinuxhost reboots WITHOUT manual Start/reconnect. SameID/image/config/
private/source/API preserved. NormalhealthyStop/currentpolicy=no veto/alreadyfailedraw
Stopno-op/actuallauncherreplacement/draineddetach controls passed independently. Do not
reopen reboot correction or infer a60s SLA. CR001/002/003/004 retain scoped resolutions;
API-F002 resolved at API003 freshnativeUbuntu scope. API004 nativeMac freshsetup/boot
is not a fullclient/physicalmatrix result. **CRR010 Fail and API004 Fail57.14% / broader
Required remain authoritative.** ARCH005 covers SR021; CRR009100 source-only is historical.
No source/API/Delivery Pass here; successful af9f23 REST test-code review still pending
passed API package. Independent review artifacts retained, not overwritten by designer.

After architecture acceptance: implementation -> independent source review -> API/E2E,
**API-F004 FIRST** through corrected public setup/reconnect, unique synced/closed source
edits/freshnative+actualmanagedHTTP, actualcache/CLI/package/image/mount/sourceUUID proof,
no manual config/dropcache/remount/workaround; then the full remaining matrix. Preserve
normalboot/Stop/unselected/private guards. Full bothOSnative+managedDockerCLIENTS,
LinuxnativeDockerSTORAGE, independentpeers/physicalMac+Linux+Docker, actualnativetools+
unreadcurrentlinkedassets/peerclose/restore/Standalone-Team-Org/completedartifact+
healthy previews, hostedworkflow/signing/nativeamd64engine/publicbootstrap/docs/user
verification/finalization/authorized release all remain. Only MacDocker STORAGE deferred.

DEC012/013/014/015 and source/native-runtime boundaries retained. TrustedprivateLAN
plaintext requires actual consent/allowlist; no security bypass. D001/DEC015 outage
isolation deferred **NOT fixed**. IMP-D001 current private links/independent Source
UpdateRemove/AGYlocal unchanged, no pin/copy/refcount/retirement. FUP001 remains PMcustody,
no duplicatefollowup. PeerNAT/access/profile/inference/privateLAN questions unanswered,
no permission inferred. Parked cross-node communication remains out of scope.

## Workspace and package paths

Worktree `{R}`, branch `codex/shared-network-workspaces`,
base `origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468`, finalization `origin/personal`.
Main checkout and five prior untracked dist trees untouched/unstaged; no byteidentity
claim across prior API builds. No host mount/root/network/provider/usernode change,
merge/push/tag/release/TaskDone/userverification claim.

- Requirements: `{T}/requirements-doc.md`; approval-record-sr018.md (and prior records).
- Design: `{T}/design-spec.md` — Ready SR022.
- Investigation: `{T}/investigation-notes.md`; current report `{E}/freshness-investigation.md`.
- Cumulative solution history: `{T}/solution-revision-record.md`.
- Complete evidence/source/specialist/supplement list: `{E}/package-index.json`.
- Historical full SR021 handoff preserved: `{E}/prior-solution-design-handoff-sr021.md`.
- Current independent reports: `{T}/code-review-report.md`, api-e2e-execution-coverage-report.md;
  design-review-report.md still ARCH005/SR021, not a new pass. Delivery **N/A — not yet**.
- Product-owned supplement **N/A — not requested/applicable**.

## Routing

Pending fresh get_handoff_rules after persisting this complete result. Select the single
most-specific matching rule; no duplicate implementation/API/PM notification or delegation.
'''
p.write_text(handoff)
print('Canonical SR022 context persisted')
