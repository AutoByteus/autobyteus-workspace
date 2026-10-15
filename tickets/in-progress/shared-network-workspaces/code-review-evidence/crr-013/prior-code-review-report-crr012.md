# Code Review Report — CRR-012

## Latest authoritative result

**Fail — Design Impact.** Focused API-REV005 failure-origin review confirms new
**CR007 (P1) / API-F005**: native Mac ordinary restart rejects the unchanged APFS
source because a saved `st_dev` value is treated as durable source identity.
The reviewed design explicitly persists dev+inode but does not reconcile that
representation with healthy cross-boot reuse. Return to Solution Designer for a
bounded identity/lifecycle and persisted-data disposition decision.

**CR006/API-F004 is independently resolved at API005's executed Linux native and
Docker-storage/native+managedHTTP scope.** That closure is not full AC003 or
cross-platform qualification. API005 remains **Fail57.14%, broaderRequired**.
No successful test-code review, source fix, new full scorecard or release approval.

## Review meta, scope and authority

- Entry: API/E2E Failure-Origin Review, round12 / CRR-012, 2026-10-15.
- Trigger: API005 V01-MAC-IDENTITY; initial classification Unclear is resolved here.
  Smallest relevant path: source identity acquisition/persistence -> normal Mac
  launchd reconciliation -> source check -> missing mount/status; relevant original
  requirements/design, failure scripts and raw receipts. Prior CR006 closure checked
  proportionately; no general test-suite or unrelated source re-audit.
- Input HEAD190e130290ca74307430fac6b28f0bc736766033; unchanged production
  d65aeda24fc4b9a534a3941b194dd4a55b88c00c. Previous source review CRR011
  da124edf1230a0cd4da2780766497c48f7a9723b plus receiptd963097b6e3d0cf80e3bf4e86d900173b671fd26.
- ApprovedSR018 / ReadySR022 / ARCH-REV006 / IR008 / API-REV005. Requirements,
  approval, investigation, solution history/design/handoff, architecture report/history,
  implementation handoff/history and all API authorities remain unchanged.
  Prior source Pass100/100 remains historical at its recorded scope, not current
  whole-product acceptance. Delivery and external Product artifacts N/A—not applicable.
- Task shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63;
  **Large / High / Reviewed**, unchanged. Worktree
  `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`;
  branch `codex/shared-network-workspaces`, finalization `origin/personal`.
- E5=`evidence/api-e2e/api-rev-005`; E12=`code-review-evidence/crr-012`, relative
  to this ticket. E12/package-index.json preserves all1285 incoming references.
  CRR001–011 retained in cumulative history; prior canonical report snapshot in E12.
- Root AGENTS/DESIGN/TESTING, applicable NFS guidance, shared scenario gate/Example9
  and failure-origin template applied. No closer NFS/ticket AGENTS or rule conflict.

## Supported scenario and candidate gate

### MP011 — same original APFS source after ordinary machine restart (new premise)

- Basis: **Operational/User, Supported Normal Scenario, Reachable**. Storage owner
  completes native Mac creation using a nonempty supported local folder, exits the
  terminal, then ordinarily restarts the same computer and continues using the same
  available project. SCN009/012/013, REQ014/017/019 and AC007/014/017/018/019 establish
  this independently of tests. UC001/004/005 and Change Scope include it; DEC015
  defers forced-outage hardening, not healthy boot reuse.
- Entry/path: public create -> plan/source check -> private hosted descriptor ->
  launchd RunAtLoad service -> serial supervisor -> Reconnect -> CheckSource -> Apple
  Ensure/mount/nonroot readiness if valid. Public reconnect uses the same guard.
- State/consequence: source was valid and exported before reboot; same APFS volume,
  directory inode/owner/mode, original bytes and marker survive. Runtime device
  numbering changes, saved pair does not. Reconciliation stops before mounting;
  normal use remains unready. No contradictory concurrent action is assumed.
- Evidence: requirements/design references above; source-trace.md; E5 initial public
  success and three boot receipts; E12/mac-evidence-review.json parsed raw proof.
  No new deadline, generic outage recovery or replacement workflow is invented.

| Candidate | Independent basis / evidence | Disposition / proportionate response |
| --- | --- | --- |
| CAND013 / CR007 | MP011; saved full-pair equality at source.go:58–59; actual changed device with same APFS UUID/source and repeated refusal | **Promote**, P1 Design Impact. Define/verify reboot-stable source identity within existing owner and explicit persisted-state disposition, preserving real replacement refusal |
| CAND014 | Proposal to accept marker alone, ignore device unconditionally, rewrite saved identity on mismatch or add automatic repair/retry | **Reject as required machinery**. Same-source restart is supported, but no evidence establishes those bypasses preserve REQ017 anti-replacement. No such implementation is prescribed |

MP011 is confirmed by current execution. MP003/004 concern independent skill-source
Update/Remove and remain unchanged; they are not this storage-identity premise.
Existing MP009 freshness is now supported by independent current-product evidence.
No unsupported/Not-Reachable candidate affects findings or rationale.

## Forward source trace and observed evidence

1. `setup/plan.go:56,102` captures identity for existing source; Apply captures new
   source after creation. `platform/source.go:35–51` checks real/canonical directory
   then stores syscall.Stat_t.Dev/Ino; `config/state.go:9–12` persists the pair.
   `setup/apply.go:59–71` checks/probes and writes hosted-filesystem.json before export.
2. Whole-host restart invokes `platform/jobs.go` launchd service -> `cli/run.go:78–89`
   -> `service/supervisor.go:18–31` -> `setup/lifecycle.go:25–28`. `CheckSource`
   compares the complete pair **before** EnsureApple, EnsureMount or node work.
3. E5 fresh current nativeMac create under077 succeeds with original/mounted bytes,
   UUID, installed CLI and running launchd. Source is
   `/Users/admin/ab-nfs-api005-mac-59bba374-source`; storage UUID
   `7d29fab2-7ce0-47cb-9183-73a810590a07`. Initial source tuple is
   **16777228:506781:501:20:755**. Three ordinary boots observe device
   **16777230 ->16777227 ->16777230**, while inode/UID/GID/mode remain unchanged.
4. The saved descriptor continues device16777228/inode506781; its SHA remains
   `a9148db38d10a1eb3694846c990cac97dc9df9c857a73220c767a0d558a8c5de`.
   Original bytes SHA924b88c26e48449a10b52dc755f1888b994389d1cf2b34812de55f5bfba2ec7d
   and marker SHA629c7f5cd6d4b1d27f0b84e8ec3d9ac5d96f363e5e1ed87f81de349373b4e393
   remain unchanged. **Valid third-boot** diskutil proof maps `/dev/disk2s5` to
   `/System/Volumes/Data`, APFS VolumeUUID/DiskUUID
   **A19FE379-BE62-4297-9A39-3934CC88214B** before/after device27->30.
5. Source locally readable, nfsd enabled/running, launchd logs repeated
   `selected source device/inode changed; no replacement will be exported`.
   Status truthfully reports no matching mount/hostReady=false. Both separately
   labelled diagnostic public reconnects exit1 at the same source guard. This is
   persistent identity rejection, **not a failure to meet a 210-second SLA**.
6. Current Mac CLI SHA5908c8229010102d7a1708c65e50b8674766a6c8356c4362588c0fed36167a57
   matches IR008; no production/durable-test changes after source review. Source.go
   originated in this ticket's c57ab71c90, unchanged by IR008 Linux cache delta.
   No config/identity/source edit, manual mount, engine/job restart or forced outage
   was used to create this failure. Earlier invalid diagnostic commands are excluded
   from proof. Mac safe detach is preservation/cleanup, not recovery success.

Apple's [stat documentation](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/stat.2.html)
describes a containing device ID, not this application's cross-boot guarantee;
Apple separately documents a [persistent volume UUID](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumeuuidstring)
that may be unavailable. Current APFS receipts, not an assumed universal OS rule,
prove the mismatch here. E12/primary-contracts.md distinguishes contract context
from evidence and does not prescribe an API or UUID-only replacement.

## Finding and failure-origin classification

### CR007 — P1: durable source identity rejects the unchanged Mac source after boot

**Design Impact**, linked to CAND013/MP011. Location:
`autobyteus-nfs/internal/platform/source.go:50–59`, persisted shape
`internal/config/state.go:9–12`, design-spec.md:248,252–256.

The implementation follows the reviewed dev+inode representation. That design's
cross-boot invariant is insufficient for supported APFS: a changed current device
number does not prove source replacement. Normal reboot loses a usable mounted
project despite intact available source. This is inherent to the ticket's promised
native-Mac lifecycle, not an out-of-scope pre-existing app bug, invalid stale test,
unsupported filesystem, remote peer NAT failure or first-use/IR008 regression.
No data loss, wrong-source export or false readiness was observed.

**Required outcome, not a prescribed mechanism:** Solution Designer should establish
and experimentally verify a platform-appropriate same-source identity across normal
restart, preserving true source/volume replacement, symlink/privacy and permission
refusal. Keep the existing platform/config/setup ownership. Explicitly decide the
impact on hosted/pending persisted records and retained candidates using actual
installed/released-data evidence. Do not silently reinterpret `device`, rebind on
mismatch, weaken to marker-only, mandate migration, or add generic retries/supervision.
A small correct representation/check may suffice; architectural size of repair is
not pre-decided. Approved intended behavior is clear; no Requirement Gap is asserted.
Any change of intended guarantees requires renewed approval before design revision.

**Earlier review gap:** the original source/design review should have established
that the serialized Dev/Ino pair remains a valid same-source witness for the promised
Mac restart lifecycle. The exact missed invariant is `SourceIdentity`'s raw `st_dev`
plus persistence plus unconditional later full-pair equality—not the absence of an
arbitrary stress test. A same-number successful boot cannot establish stability.
The particular reassignment pattern required runtime observation; its frequency is
not inferable from source and not claimed. CRR011's bounded Linux-policy review did
not introduce this defect; current evidence nonetheless supersedes package acceptance.

Only affected rationale is updated: **shared data-model/lifecycle correctness,
Runtime Correctness and API/E2E Readiness** now have unresolved CR007. No new numeric
score or full structural checklist is issued for this failure-origin-only round.
Historical CRR011100/100 is not today's overall Pass.

## Prior findings and validation reconciliation

- **CR006/API-F004 resolved at executed scope:** E12 independently recomputes E5's
  40 unique1KiB/1MiB fixtures,80 native/real managedHTTP checks. Per storage mode:
  12 warmed in-place,4atomic,4new across fresh public setup and normal reconnect.
  Every exact-byte result<=5s; maxima native storage native0.927933/HTTP0.934914s,
  Docker storage native0.827498/HTTP0.839105s. Writer flush/fsync/close precedes timing;
  observer polling is not a product workaround. Actual fresh activation/export0,
  process/image/CLI/packages/mount/source/UUID/private proofs retained. Same source
  survives public drained native detach before Docker storage creation. No engine
  rebuild, manual config/cacheflush/remount or LLM timing. Not full bothOS/physical AC003.
- **CR005/API-F003** resolution retained; current Linux first two whole-host boots
  without manual Start/reconnect pass, separately tested Stop/policy/replacement/
  detach controls. Observed71.368/62.573s are not SLA. HostConfig equivalence only
  includes documented empty-DNS null->[] normalization, not raw-byte equality.
- **CR001–004/API-F001/F002** scoped resolutions retained. NativeMac cold-create
  remains successful; new same-source reboot rejection is separate, not relabelled
  loss of first-use permission/mount fix. FUP001 remains PM custody, no duplicate.
- API005 Go/Python/current local Guide and mounted API/file-operation evidence is
  upstream validation at recorded scope, not personally rerun. Prepared unexecuted
  lock script isn't Pass; carried E3/E4 media/scripted/native-tool limits unchanged.
  Cumulative af9f23 successful REST test-code review still awaits passed API package.

## Checks, residual limits and next step

E12 audit verifies1285 references/1283 manifest hashes/sizes,19 retained candidate
files and286 old-dist files; raw9Mac observations/valid4plist records and80 reader
comparisons parsed. No production/durable-test edit or runtime reexecution. Source
and previous evidence preserved; only canonical review report/history updated.
Own resources N/A; API005 exact owned-resource cleanup independently reported by API.
No reviewer root/VM/Docker/mount/provider/user-app operation or delegation.

Next: bounded design recovery, required independent architecture route as configured,
implementation, independent source review, then **API-F005-first current public Mac
create/ordinary reboot/reconnect** with actual original source/volume/marker identity,
automatic usable mount and nonroot file access, plus supported replacement-refusal
controls and preservation. No forced device edit or identity bypass may substitute
for actual boot proof. Retain scoped CR006/CR005 closure and proportionate regressions;
complete remaining approved matrix afterward, not successful-test review now.

Remaining: bothOS native+managedDocker CLIENTS, Linux native+Docker STORAGE,
independent physical/peer, actual native tools/unread linked assets/peer-close/restore/
Standalone-Team-Org, completed artifacts and healthy previews, amd64 engine,
hosted signing/public bootstrap/docs/user verification/finalization/authorized release.
Only MacDocker STORAGE deferred. D001/DEC015 NOTfixed; IMP-D001 current private links,
independent Source Update/Remove and unchanged AGY-local policy; FUP001/peerNAT/access
limits remain. No permission/waiver inferred from unanswered dependency questions.

**Classification: Design Impact.** Fresh configured most-specific rule selects
`/software_engineering_team/solution_designer`; E12/routing.json records the rule.
Single cumulative handoff only; no duplicate
API/implementation notification. No merge/push/tag/release/TaskDone claim.
