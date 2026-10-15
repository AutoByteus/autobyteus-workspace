# Code Review Report — Shared Network Workspaces

## Latest authoritative result

**CRR-010 — Fail / Design Impact. CR006 (P1), API-F004: healthy committed-file
visibility violates AC-003.** The selected Linux storage integration returns old
bytes on fresh native NFS and actual managed-node HTTP reads for about61s instead
of the approved5s. The reviewed end-to-end freshness policy is incomplete; the
server's inherited60s attribute expiry is a strong source-backed explanation,
**not yet a proven sole cause or validated repair**.

**CR005 / API-F003 is resolved at API004's independently tested Linux arm64
Docker-storage/managed-client reboot scope.** Do not reopen it because the
separate healthy-coherence scenario fails. API004 remains **Fail57.14% / broader
Required**. CRR009's source Pass100 is historical, not the current result or a
product/release Pass.

## Review meta and scope

- Entry: **API/E2E Failure-Origin Review**; round10; source Review Scope **N/A**.
  No repeat full structural audit, source-size thresholds or full scorecard.
- Task `shared-network-workspaces` /
  `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; **Large / High / Reviewed**
  retained. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`;
  branch `codex/shared-network-workspaces`; finalization `origin/personal`.
- Input `b5167131bfb4e93fc2a8d8216e83ac791d207cc7` includes API evidence
  `41af4e7f82f1c2d9b4b58074b758540391674a4f`. API build input
  `902638e584d8e669b632cf81bcc0a95074892403`; production unchanged at
  `d318bd9db935affdf16d141ef4e88a6c0e4939b5`. No post-review implementation change.
- Requirements/investigation/solution context: [Approved SR018](requirements-doc.md),
  [approval](approval-record-sr018.md), [investigation](investigation-notes.md),
  [solution history](solution-revision-record.md), [Ready SR021 design](design-spec.md),
  [handoff](solution-design-handoff.md). Relevant DS002, BEH002/003, SCN002,
  REQ004/AC003/QR001 and preserved source-folder/healthy preview behavior.
- Independent design context: [ARCH-REV005](design-review-report.md) and
  [architecture history](architecture-review-revision-record.md); IR007
  [handoff](implementation-handoff.md) and [history](implementation-revision-record.md).
  Prior review CRR009 and all CRR001–009 retained in
  [code-review-revision-record](code-review-revision-record.md) and Git history.
- Failure context: [API004 report](api-e2e-execution-coverage-report.md),
  [investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md),
  [API history](api-e2e-revision-record.md). Earlier investigation headings are
  historical; appended API004 section and canonical API report govern.
- **E4** = `evidence/api-e2e/api-rev-004/`; **E10** = `code-review-evidence/crr-010/`.
  Complete992 incoming references preserved by the E10 cumulative package index.
  Relevant supplements/raw histories remain linked, not rewritten.
- Trigger: API-F004 healthy source close -> fresh client read. Exact inherited
  commands are in E4 `run-preview-external-change.py`, `reproduce-visibility.py`
  and their JSON receipts (including executed guest argv). Failure summary,
  identity corrections and source clues reviewed. No new live repro this round.
- Reviewed minimum paths: common Ganesha generator/install/verify, setup apply/
  reconnect callers, native/Docker mount options, real REST content reader and
  exact retained engine cache sources. Excludes unrelated runtime/UI/source
  changes and general test-suite review. Successful durable-test review still
  awaits a passed package; unchanged af9f23 REST coverage is not signed off here.
- Delivery/release revision: **N/A — not performed**. Product-owned specification:
  **N/A — not applicable**. Personal work only; no delegation/spawning.

## Supported behavior and candidate gate

Intended behavior is clear and unchanged. No requirement gap, new behavior ID,
concurrent conflicting-write promise or broader latency SLA is introduced.

| Basis | Actor / independent trigger / goal | Supported entry and forward path / lifecycle | Expected consequence / evidence | Validity and use |
| --- | --- | --- | --- | --- |
| SCN002; BEH002/003; REQ004 AC003 QR001 | User/native tool publishes a small changed ordinary project file for another participating reader | Original source-folder write -> successful flush/fsync/close -> healthy selected native Ganesha/VFS export -> distinct native or managed Docker NFS mount -> new open; HTTP additionally resolves workspace path then createReadStream | Exact committed bytes within5s for<=1MiB; requirements AC003 explicitly tests host/container directions, design DS002 and source-folder contract | **Supported Normal Scenario / Reachable / Use**. Source-first publishing is ordinary use, not a test-created concurrency premise |
| SCN009/013; BEH004/005; prior CR005 | Normal whole-host reboot after selected attachment; preserve ordinary operator Stop/veto | Existing SR021 reconnect and daemon lifecycle; first two boots unmodified, later controls separate | Actual API/mounted bytes and identity/private preservation; E4 two-reboots and controls | **Supported Normal Scenario / Reachable / Use** only to verify prior resolution |

| Candidate | Observation / independent basis / consequence | Evidence | Disposition and proportional response |
| --- | --- | --- | --- |
| **CAND010** | Approved source publisher closes before each reader reopens, but current selected storage path retains old data past5s; client actimeo1 alone does not establish end-to-end freshness | E4 two unique fixtures, actual native config/findmnt/packages/CLI; E10 raw-observation audit and engine source trace; design filesystem-semantics paragraph | **Promote — this ticket -> CR006/P1.** In-scope AC failure; return narrowly to Solution Designer for selected backend freshness-policy recovery. Not an unrelated dependency follow-up |
| CAND010 mechanism limit | A particular Attr_Expiration_Time value alone fixes every supported operation/mode | Default/inheritance/validity source supports investigation, but no cache instrumentation or controlled repair experiment | **Hold for Evidence — repair hypothesis only.** No finding/deduction or mandatory config value based on this claim. This does not hold the independently proven failure or its policy-gap classification |
| Rejected extensions | Renderer-only defect, outage hardening, instantaneous open-FD updates, all-mode Docker STORAGE reproduction from common code, automatic watcher or new read-retry framework | Native fresh reads fail without renderer; no outage/heldFD; only native storage reproduced here | **Reject** as attribution/prescription from this evidence. No new UI finding or machinery |

Behavior basis **Confirmed**; observed BEH003/AC003 outcome **Contradicted**.
No approval change is needed to retain the5s requirement. Any proposed narrowing
of source writers, platforms, safety or that bound needs renewed approval.

## Failure evidence and origin

E4's native storage was created through public setup, then admitted the actual
selected managed node through normal detach/create. Installed native CLI SHA
`0036ccef0bbb2a2510064f2e882b692687a2288eb25563d89f9c4ac9150c860c` and actual package
requery identify Ganesha/VFS `4.3-8ubuntu1+autobyteus1`, Ubuntu24.04.5/ext4/
kernel7.0.0-38/aarch64, directorydelegationsY. Source and mounted UUID
`982e2025-961c-4b25-ab83-24ff06debcfa`; selected node
`c40d2221e0c821ea1a2c44cc9eba5c0fdf3a67179adeca98046ba7687a62a487` is running.
Source directory `/home/admin/ab-nfs-api004-linux-9591ce1a-native-source`,
original identity `64769:2359328:1000:109:755`. Actual engine/service active,
HTTP successful, native mount hardTCP4.1 with all attribute bounds1s.

| Unique1024-byte fixture | Observation count | Old bytes after5s | Last old observation | First exact new observation (native / HTTP) |
| --- | ---: | ---: | ---: | --- |
| visibility-d3f108eedd3f48ebb44f9b86c3155066.bin |122|5.053s|60.644s|61.149s /61.149s|
| visibility-930e44580b2c41aeaf35874512eec797.bin |121|5.051s|60.467s|60.975s /60.975s|

All pre-fresh rows return old SHA `785b0751fc2c53dc14a4ce3d800e69ef9ce1009eb327ccf458afe09c242c26c9`.
Source-after and eventual readers match new SHA
`3af6dbef8362452d2b45ad97deb9e43180fb90aac309860e26e123860cce62a7`.
Same inode; mtimeNs changes. Initial135-byte PNG also remains old through5.010s.
The script closes each writer/read context; the timer starts after sync/close.
Timestamps follow both serial reads, sampled about0.5s; they are not exact separate
per-reader event times. Many stale observations far beyond5s remove threshold
sampling ambiguity. Later freshness does not turn this into Pass.

**Origin established:** selected native-Linux storage/data-plane coherence,
not renderer-only, HTTP-only, stale source build, uncommitted writer, unsupported
race, API-F003 recurrence or deferred outage. There is no production/durable-test
delta since source review. API's helper-envelope and dpkg-guard mistakes are
explicitly corrected; they do not invalidate actual installed-hash/config/raw
read observations. No fresh package-absence proof is credited here.

**Mechanism investigated independently:** `backend/ganesha.go:38–54` emits no
server attribute-expiry bound; the live native config agrees. `mounts.go:67–79`
and `docker/volume.go:17–18` specify only client actimeo1. The exact retained
source defaults export attribute expiry to60, inherits it into cached entries,
and `mdcache_getattrs` can return those attributes without refreshing while
`mdcache_is_attrs_valid` succeeds. Versioned upstream documents the same
[export default/inheritance](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/doc/man/ganesha-export-config.rst).
Full member hashes, line spans and inference limits are in
[E10 primary contracts](code-review-evidence/crr-010/primary-contracts.md) and
[engine source audit](code-review-evidence/crr-010/engine-source-audit.json).

That mechanism is consistent with ~61s and explains why client1s is not by
itself an end-to-end5s guarantee. **No packet trace, live cache instrumentation
or controlled configuration-change test proves it is the sole cause or proves
a specific setting repairs all operations.** No patch/cache drop/retry/workaround
was applied. Native hosting is directly reproduced; the shared generator makes
Docker storage a relevant correction/regression surface, not a reproduced mode.

### CR006 — selected backend freshness policy does not satisfy AC003 (P1)

- **Scope:** this ticket, CAND010, SCN002/REQ004/AC003/QR001. A core ordinary
  shared-file publication contract fails while healthy. Not performance tuning,
  an adjacent pre-existing issue, or permission to expand outage scope.
- **Classification: Design Impact**, narrow selected-engine/cache integration.
  Design DS002 assigns data semantics to OS client/backend, but the filesystem
  policy specifies client actimeo1 without resolving server-side freshness for
  supported original-source writes. Current implementation follows that incomplete
  baseline. The design's escalation contract explicitly returns discovered
  normal-connected-operation incompatibility to Solution Designer. This is not
  a requirement ambiguity or a mandate for a new owner/subsystem/engine.
- **Required outcome:** investigate and establish the smallest backend/client
  freshness policy that meets unchanged AC003 on the approved reference; revise
  only affected design/verification/owned-config lifecycle guidance, then implement
  under existing owners. A bounded generator/config correction may suffice, but
  this review does not certify one. Preserve exact ownership/external-change
  refusal, source identity/data/UUID, hard mounts, private state, default kernel
  support and the existing restart/Stop contract. A changed generated config
  must have an explicit supported apply/reconnect disposition; do not bypass
  `WriteGanesha`/`VerifyGanesha` or invent broad migration machinery.
- **Verification:** independently rerun API-F004 first after accepted correction,
  repeated unique synced/closed source edits and new native + real managed-node
  reads with actual cache configuration/identity. Then continue existing approved
  host/container directions and native/Docker-storage matrix, plus affected
  reconnect/restart/detach/preservation regressions. No client cache flushing,
  retries masking delay, changed5s criterion or source-copy proxy as test repair.

### Earlier review gap / affected rationale only

The source-visible invariant that should have been challenged is **end-to-end
freshness includes the selected server's metadata cache for direct source
writes**, not merely client actimeo1. The generator omission and dependency60s
default were available during earlier backend/dependency review. Accepting that
combination without resolving its AC003 consequence was an integration review
gap. The exact observed61s and sufficiency of any fix still require runtime
proof; they were not proven by source review. This is not a new IR007 recovery
regression, and CRR009's focused recovery checks remain valid at their scopes.

Affected rationale: Runtime Correctness/Behavioral Fidelity is now contradicted
for AC003; API/E2E readiness cannot be used as completion evidence. **No new
numeric score or full scorecard in this failure-origin-only round.** Unaffected
structural evidence remains historical, not a current blanket100/100 Pass.

## Prior findings and retained boundaries

| Finding | Current disposition / evidence |
| --- | --- |
| CR005 / API-F003 | **Scoped resolved:** audited fresh selected setup + two ordinary whole-host boots, distinct bootIDs and sameID/image/config/ports/aliases/mounts/private/source/API; normal Stop/veto/current-ref replacement/detach controls separately pass.60.879/59.991s observations are not a new SLA |
| CR003 / API-F002 | API003 fresh no-preinstall native-Ubuntu public scope retained; API004 package identity/regression is not fresh absence proof |
| CR002 / API-F001 | Prior scoped nativeMac cold-create resolution retained; API004 adds fresh nativeMac create/ordinaryboot/reconnect/detach, not all-client qualification |
| CR001 / CR004 | Mode and release-gate scoped resolutions retained; no related source delta or new counterexample |
| D001 / DEC015; IMP-D001 | Outage hardening deferred **NOT fixed**; private current-source links, independent confirmed Source Update/Remove, AGY/local policies unchanged |
| FUP001 | Existing Project Task Manager custody, no duplicate follow-up/patch/notice; historical broad non-green remains distinct |

No new out-of-scope follow-up. Do not broaden source pin/refcount/retirement or
restart machinery. Only MacDocker **storage hosting** is deferred, not clients.

## Checks, provenance, limits and routing

Personal [audit](code-review-evidence/crr-010/audit-failure-package.py) passes:
992refs exist; all15 retained candidate hashes/sizes match; source/durable tests
unchanged;243 freshness rows and scoped prior closure checked; six exact engine
source members inspected read-only. [Checks/limits](code-review-evidence/crr-010/checks-and-limits.md)
distinguishes inherited execution from personal review and records exploratory
read-only path/output errors. No source or durable-test edits, new VM/daemon/root/
mount/app/provider/physical/network operation or engine rebuild. No runtime
resources created; no reviewer cleanup outstanding. API004 cleanup Complete
retained; five old untracked dist trees untouched by this review/unstaged, without
claiming byteidentity across API builds.

Default aggregate968f6d000d4b6c2cc3c66cd3add5845cb30385cdad752fe831b564823db9b764;
retained-engine metadata51f81cd187caf269ecffa83fecc35a4f665b70942716d7858fa7d964d3b335ed.
Actual current full-server image
sha256:c4338af68b8608226655056dc7c52d76250eba7c317f25ef43b9ca8458414dfb.
E4 identity corrections govern native receipts, not inherited Docker envelopes.
Qualification remains empty; candidate build is not release qualification.

After bounded solution recovery: implementation -> selected source review ->
API-F004 FIRST -> remaining bothOS/native/managedDocker-client/Linux-storage/
independentpeer/physical/native-tools+assets+peerclose+restore/Standalone-Team-Org/
completed-artifact/healthy preview/hosted-signing-amd64-publicbootstrap/docs/user/
finalization/authorized-release gates. NAT peer limit and unanswered access/profile/
inference questions remain; no permission or waiver inferred. Separate successful
test review and Delivery follow only a passed package.

**Latest result: Fail / Design Impact / CRR-010 / CR006 OPEN.** API004 retains
independent Fail57.14%/broaderRequired. Obtain fresh handoff rules and send the
complete cumulative failure package only to the single most-specific returned
Solution Designer recipient. No duplicate forwarding, polling, delegation,
merge/push/tag/release/TaskDone.

Confirmed handoff: review1240527c804b291ae99c69d6f6cb58f4cba0a09c delivered with
1003 references to `/software_engineering_team/solution_designer`, accepted=true/
DELIVERED; exact receipt in E10/routing.json. No additional recipient notified.
