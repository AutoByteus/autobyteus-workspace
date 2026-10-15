# Solution Design Handoff — SR022 / Architecture Design Complete

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

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`, branch `codex/shared-network-workspaces`,
base `origin/personal@f13bdd0eb79aacc63dffa5995b9c86f359001468`, finalization `origin/personal`.
Main checkout and five prior untracked dist trees untouched/unstaged; no byteidentity
claim across prior API builds. No host mount/root/network/provider/usernode change,
merge/push/tag/release/TaskDone/userverification claim.

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/requirements-doc.md`; approval-record-sr018.md (and prior records).
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/design-spec.md` — Ready SR022.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/investigation-notes.md`; current report `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/design-recovery/sr022/freshness-investigation.md`.
- Cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/solution-revision-record.md`.
- Complete evidence/source/specialist/supplement list: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/design-recovery/sr022/package-index.json`.
- Historical full SR021 handoff preserved: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/evidence/design-recovery/sr022/prior-solution-design-handoff-sr021.md`.
- Current independent reports: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces/tickets/in-progress/shared-network-workspaces/code-review-report.md`, api-e2e-execution-coverage-report.md;
  design-review-report.md still ARCH005/SR021, not a new pass. Delivery **N/A — not yet**.
- Product-owned supplement **N/A — not requested/applicable**.

## Routing

Fresh rules retrieved2026-10-15 after the full result was persisted. The single most-
specific match is Architecture Design Complete with Large OR High:
**/software_engineering_team/architecture_reviewer**. Small/Medium+Low direct route
does not apply; no DeliveryCompleted receipt. Send this exact absolute handoff file
and complete cumulative indexed references only to that reviewer. No duplicate
implementation/API/PM message, delegation/spawning or approval routing. Expected output:
independent affected-delta review; on Pass reviewer owns its configured primary
implementation handoff. Existing ARCH005 remains history, not approval of SR022.
Route receipt in evidence/design-recovery/sr022/routing.json. Stop after confirmed delivery.
