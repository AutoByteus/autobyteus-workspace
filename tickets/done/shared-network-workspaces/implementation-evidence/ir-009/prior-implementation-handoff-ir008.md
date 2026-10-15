# Implementation Handoff — IR-008

## Current result and authority

**Implementation Complete — SR022 bounded healthy source-write freshness/config-
lifecycle correction; independent source review required. Large / High confirmed.**
Source commit **d65aeda24fc4b9a534a3941b194dd4a55b88c00c**, eight scoped source/test/docs
paths. All implementation/checks personal; no delegation/spawning. See IR008 in
implementation-revision-record.md for the delta, not an inferred prior result.

The common owned Ganesha EXPORT now sets Attr_Expiration_Time=0. Status verifies
hosted native/Docker config before readiness; Detach preflights existing config
before selected-node/mount/job/engine effects. Missing config permits partial
owned teardown retry, never readiness. Existing strict writer/verifier, exact
removal and all other ownership checks remain. No engine rebuild, migration,
runtime reader workaround or selected-start-policy change.

**This is not CR006 product closure or a measured five-second freshness Pass.**
CRR010 Fail / CR006 P1 and API004 Fail57.14% / broader Required / API-F004 remain
current until their owners supersede them. **CR005/API-F003 is independently
scoped resolved by API004**; its two ordinary host reboots and separate Stop/
policy/replacement/detach controls remain preserved, not reopened.

## Upstream package

Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces;
branch codex/shared-network-workspaces; finalization origin/personal.
Task project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63.
Ticket /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces.
Ticket references below are relative to that root; code paths worktree-relative.

- requirements-doc.md **Approved SR018**, approval-record-sr018.md, retained
  approvals/scope feedback; unchanged intended behavior.
- investigation-notes.md, solution-revision-record.md, solution-design-handoff.md,
  design-spec.md **Ready SR022**, reviewed design4c66567ccacf6552e0f21af5c4e7f177c312f5c4.
- design-review-report.md / architecture-review-revision-record.md:
  **ARCH-REV006 Pass**, review9d0ff246a71988c911cddbd4148fcec16f89db3f.
  Actual input391d65a993fbb0ca891e043d6a7eea5e4981eebc adds coordinator receipt only.
- code-review-report.md / code-review-revision-record.md / crr-010:
  CR006 Design Impact accepted in SR022, not an independent source/product Pass.
- API report/investigation/ledger/history and api-rev-004 raw public runtime,
  freshness, reboot/control, preview and cleanup evidence; earlier API001–003
  evidence retained without relabeling it current.
- Full1041-reference input architecture-review-evidence/arch-rev-006/package-index.json;
  current complete cumulative implementation-evidence/ir-008/package-index.json
  includes all inputs, unchanged earlier evidence and this round's files.
- IR001–007 history retained. Exact prior IR007 handoff snapshot:
  implementation-evidence/ir-008/prior-implementation-handoff-ir007.md.
- SR022 exact-source and diagnostic A/B/A supplements remain feasibility evidence;
  NOT corrected-public-command/managedHTTP/Docker-storage/Mac/physical proof.
- External Product spec N/A — not applicable. DR/delivery N/A — not performed.
  Independent architecture and source review apply; neither is marked N/A.

Cycle **Rework / architecture-reviewed recovery**. Related SR022 / ApprovedSR018,
ARCH006, CRR010, API-REV004; earlier SR019/020/021 and IR001–007 dispositions retained.
Trigger CR006(P1)/API-F004. No requirements changes.

## Classification and design health

Task size **Large**; architectural risk **High**, confirmed from design-spec
classification/Change Scope and this completed implementation. Small local delta
does not downgrade privileged multi-platform consistency/configuration risk.
Selected route **Code Review** via fresh handoff rules recorded in ir-008/routing.json.
Direct-route lightweight review N/A; scoped source self-review completed.
New Design Impact/Requirement Gap: **None**.

Reviewed posture/root cause: missing server-side freshness invariant, not an IR007
regression or a renderer-only problem. **No Refactor Needed**; the existing export
generator, verifier and setup sequencing owners suffice. Implementation matches
the assessment. No cross-layer bypass, extra cache/service/registry or fallback.
Four changed production files stay within500 nonempty lines and220 changed-line
guardrails (source-audit.json). No dead code found in touched paths; no new outside
dead-code follow-up. Shared structures remain unchanged/tight. Root DESIGN/TESTING,
NFS README checks and shared design principles reapplied; no closer NFS AGENTS/
TESTING file or guideline conflict found.

## Behavior implementation trace

| Behavior / requirement | Current production path | Outcome / limit |
| --- | --- | --- |
| BEH001, public create/reconnect | setup/apply.go -> backend.GaneshaConfig / WriteGanesha / InstallGanesha; lifecycle.Reconnect -> existing Verify/Ensure | Fresh activation consumes export-level zero expiry for nativeLinux/DockerLinux; strict repeated-current reuse. Writer/activation bodies unchanged |
| BEH003, SCN002, REQ004/AC003/QR001 | source fsync/close -> Ganesha/VFS export -> unchanged hard4.1/actimeo1 native or managed-client mount -> fresh reader | Missing server policy implemented; five-second current-product native+HTTP visibility still requires API-F004 |
| BEH004, configuration not falsely ready | setup/status.go -> backend.VerifyGanesha before mount/probe/HostReady | Read-only config verification; missing/different/unreadable config cannot pass. No config write or lifecycle restart from Status; existing health probe IO unchanged |
| BEH005, REQ010/AC009/017 preservation | lifecycle.Detach -> backend.VerifyGaneshaForDetach -> existing detachNodes/unmount/job/engine -> existing exact config removal | Present mismatch fails before effects. Absent config allows partial retry, not bypass of remaining exact unit/container/source checks |
| BEH002/006, native tools and healthy previews | existing runtime/workspace/REST/preview paths unchanged | No retry/proxy/cache-flush/UI workaround; full native-tools, linked-assets and healthy-preview proof still downstream |
| BEH007, truthful release Guide | existing qualification gates and Guide unchanged | Empty qualifiedTargets remains unavailable; no release/qualification claim |

Scope Guardrail / Change Scope followed: **Yes**. Source/UUID, all-squash/allowlist,
kernel/protocol, mounts/volume options, engine pair, runtime profiles/REST/UI,
node image/ports/private data and SR021 immutable-ID recovery remain unchanged.
Apple and connect-only config paths bypass the new hosted Ganesha verification.

## Generated-state disposition and assumptions

Design SR022 section "Generated-state disposition": fresh current generation,
**no evidenced released predecessor migration**. User/project/source/marker/
attachment formats **Not Affected**. Old disposable test setup **Discard or Rebuild**
only through its matching candidate's public drained detach BEFORE reinstall on
preserved source/marker. Existing current exact bytes directly reusable; different
bytes retained/refused. No compatibility wrapper, dual read/write, version field,
unconditional overwrite, hot reload, source deletion or retained-engine rebuild.

An externally edited matching disk file does not prove the daemon loaded a new
policy. No hot update is implemented/claimed. If a real supported retained deployment
is evidenced, return it to Solution Designer for a concrete transition. No such
new evidence found here. Extra VFS metadata calls are the accepted correctness-
first tradeoff; no performance/throughput benchmark claim.

## Local implementation evidence

implementation-evidence/ir-008/checks-and-limits.md and checks-result.json contain
commands, expected exits and scope. Personal final results:
- Go race: seven packages,56 top-level/140 first-level subcases pass; vet pass.
- Backend/setup current/missing/malformed/different/old config, saved/pending
  teardown ordering, exact removal/recovery retry, Apple/connect-only controls.
  Positive setup preflight stops at mount observation; no full public teardown.
- Python packaging/installer/launcher/workflow18 tests:17 pass, one standalone
  Go-child skip (child exercised via Go parent); shell syntax pass.
- Four plain compile targets Darwin/Linux arm64/amd64, native version pass.
- Seven copied mutation controls fail intended tests; not compilation failures.
- Empty-qualification publication check refuses as required.
- Initial race-only environment failure retained: owned /tmp TMPDIR inherited
  wheelGID0, violating existing Probe nonroot identity. Corrected own scratch
  group20 and reran; no source/test guard weakening. attempts.md / attempt-1.
- Source audit: eight scoped files,1083 other protected input paths unchanged;
  all15 IR005/007 candidate files and286 files across five prior dist trees
  unchanged; all1041 incoming references retained. Strict Write/Verify/Ensure/
  RemoveGaneshaConfiguration function bodies byte-identical.

No new VM/real Docker/root/mount/physical/provider/public-bootstrap/API/E2E work.
Frontend rendered-result check **Not Applicable**: no frontend code/interaction
delta. No rendered-quality or current public freshness Pass claimed.

## Build and dependency provenance

Source-default aggregate:
ae8e023775c9f7ab060e469cc9770a34ccc1321a8ae9d338a95a70ae0cd15076.
With unchanged retained IR005 engine manifest:
a6ef7dee582e9b4ba0edd7449bac4d292acfb944073502f0fb63bd8356653342.

Actual current-source Linux/Darwin arm64 CLI and release.json retained ignored at
autobyteus-nfs/out/ir008-local-candidate; full four-file SHA/size inventory and exact
commands in ir-008/build-result.json. Linux CLI SHA32772499817bccc6dc8c8bd01b15a457457848e17321af6053544adf53803a64;
Darwin CLI SHA5908c8229010102d7a1708c65e50b8674766a6c8356c4362588c0fed36167a57.
Embedded metadata bytes verified in both binaries; native version verified.
Only copied-source changes for packaging: release.json + exact two .debs.
Pinned Go1.27.2 archive digest verified. No engine rebuild. Exact4.3-8ubuntu1+
autobyteus1 engine pair/corresponding source/notices remain in ir005-local-candidate;
prior IR007 candidate remains intact. No new Docker image identity assigned.
All candidates unqualified/unpublished; actual amd64-engine qualification remains.

Owned scratch/toolchain/copies/plain cross-builds removed (cleanup.json); retained
only new four-file candidate and existing15 historical files. No live user resources,
installed config, credentials or the five old dist trees modified.

## Downstream sequence and remaining limits

1. Independent source review of this bounded delta and cumulative package; no
   duplicate direct API dispatch.
2. After source Pass, **API-F004 FIRST**: fresh corrected public setup/reconnect;
   prime real native + actual managedHTTP readers, unique repeated1KiB/1MiB direct
   source in-place writes with sync/close, fresh opens -> exact bytes within5s.
   Include atomic/new-file cases; record actual generated/loaded activation policy,
   client cache/mount, CLI/engine package/image, source/UUID/private identities.
   No manual config edit, cacheflush, remount or read-retry workaround.
3. Preserve API004 independently resolved CR005/API-F003 ordinary two-boot and
   separate normal Stop/policy-disabled/unselected/replacement/detach regression.
   Same ID/Image/Config; HostConfig permits only already documented empty-DNS
   null->[] normalization, not raw byte equality.
4. Full remaining current-product bothOS native+managedclients; Linux native/Docker
   STORAGE; independent physical peers; native actual tools/unread linked assets/
   peer close/restore/Standalone-Team-Org; completed artifact + healthy previews;
   amd64 engine; hosted workflow/signing/public bootstrap; docs/user verification/
   finalization/authorized release. Successful af9f23 REST test-code review still
   waits for passed API package. No forced-outage gate or150s SLA invented.

CR001–004 scoped resolutions retained; API-F002 fresh no-preinstall nativeUbuntu
scope remains resolved, not full qualification. D001/DEC015 outage isolation deferred
**not fixed**. IMP-D001 private current-source links, independent source Update/Remove,
unchanged AGY/local policy retained. FUP001 remains PM custody (no duplicate task).
PeerNAT/access limits separate. Only MacDocker STORAGE deferred, not Mac clients.
No merge/push/tag/release/TaskDone/user-verification authorization or claim.
