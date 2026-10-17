# SR021 — selected Docker NFS failed-start recovery investigation

2026-10-14. Designer evidence and decision rationale, NOT implementation or a
fresh API/VM run. Package shared-network-workspaces; CRR008 / CR005 / API-F003.
Approved SR018 unchanged. Authoritative technical contract is design-spec.md.

## Supported trigger and observed failure

SCN009/013, REQ014/019, AC007/014/018/019 require a successful selected-node setup
to remain usable across ordinary healthy restart. AC009/017 constrain preservation.
The independently supported event is an ordinary reboot, not an injected outage.

| Owner / node | Paths / command | Actual inherited result |
| --- | --- | --- |
| API003 Ubuntu24.04.5 arm64 VM `ab-nfs-api003-linux-b7497a85`, kernel7.0.0-38, Docker29.1.3, Docker storage | Source `/home/admin/ab-nfs-api003-linux-b7497a85-docker-source`; native/container root `/Volumes/autobyteus-shared`; `sudo -n systemctl reboot` twice | Selected client attempts volume mount before engine ready; connection refused; host later ready, client remains stopped |
| Selected current full-image client `689c89e631dd82ef0f57b454332f3a57d45806e898dc5c3e00f1c3240e7c0a38` | `/Volumes/autobyteus-shared/project`; image `sha256:dd986b8ae47f0947516d1b708df200161d28a33706eb177b59b1afa70be937b4`; current public launcher; unless-stopped | Two normal boots fail; original ID/config/private data unchanged. Public reconnect does not start it |
| Same selected client, diagnostic ONLY | `sudo -n docker start` same exact ID after saved failure evidence | Current API/status and same UUID restored; NOT automatic recovery proof |
| Unselected stopped client | Existing private volume/config fixtures | Preserved/stopped; not a recovery target |
| Designer SR021 | Read-only source/raw artifacts and versioned upstream fetch | No new node, mount, source, runtime, UI or suite execution; no repaired product claim |

Second journal refusal07:46:57.935220; engine starts07:46:57.940143044; daemon init
ends07:46:57.962894.15 observations through148.599s, host ready from21.53s. This
is observation, not a new deadline. Source identity64769:787680:1000:109:0755;
UUID71887d49-17ec-4e6f-a734-03ebd3abaafd; original bytes/hash preserved. Exact
commands/observations in API003 managed-lifecycle-result.json,
managed-reboot-diagnostic.json, managed-reboot-repro-result.json and harness.
CRR008 independently audited these; this recovery read their raw state/config.

## Current forward ownership trace

First-use CLI -> setup.Apply -> engine/host mount/nonroot probe -> Docker volume
probe -> exact recreation/start/VerifyStarted -> persisted node reference/job.
This orders FIRST use only.

Boot -> platform.JobDefinition -> cli.Run(service) -> serial service.Supervise
with admin lock -> setup.Reconnect -> check source/ensure engine -> host mount ->
nonroot identity/access. It ends there. Independently Docker restore attempts
selected client local-driver NFS mount before any application process; failed
mount leaves State.Error and no app process. Status correctly reports stopped.
No owner finishes the failed start after dependency readiness.

Read sources: internal/{cli/run,service/supervisor,setup/lifecycle,setup/apply,
setup/status,setup/service,platform/jobs,config/state}.go;
internal/docker/{client,ownership,snapshot,attachment,recreate,recovery,exec,
engine}.go; scripts/public/docker/autobyteus-docker.d/bash/commands.sh stop_nodes.
Existing Recreate receipt is initial apply/rollback history, NOT current run
intent. Existing Recover requires renewed drain and remains separate; do not use
it from background service. Read-only status must not become mutating.

## Dependency contracts, independently inspected

Primary source links/fetch hashes in primary-sources.json, pinned docker-v29.1.3:
- daemon/daemon.go restore does one eligible start task; no NFS-readiness retry.
- daemon/start.go sets State.Error/checkpoints on failed start; setupMounts precedes
  process creation. Successful start clears error through State.setRunning.
- daemon/container/state.go Error is a last lifecycle diagnostic, NOT a generic
  desired-running boolean. Never interpret every Error or exit255 as NFS failure.
- daemon/kill.go and container restart policy use internal HasBeenManuallyStopped;
  the current public inspect projection doesn't expose that internal flag. Do NOT
  invent an inspect field or read Docker's private on-disk database (also not
  available to native Mac controller through Docker Desktop).
- daemon/stop.go returns NotModified for an already stopped container, without
  changing state or publishing a stop. Thus a no-op stop on a failed-start node
  cannot be distinguished from no request through inspect/events. An event
  watcher does not solve this absence. Do not promise it can.
- Normal stop of a successfully running node has no owned-volume startup error
  (success cleared it); a previously intentionally stopped unless-stopped node
  is not boot-started by Docker. Both are negative recovery cases.
- Docker docs https://docs.docker.com/engine/containers/start-containers-automatically/
  caution against competing process managers. Keep Docker's runtime restart
  ownership, policy and manual-stop behavior; only complete the demonstrated
  pre-process NFS start failure after fresh positive dependency proof.

Source interpretation is not a claim that every Docker distribution/version is
byte-identical. Error grammar/version changes need qualified adapter evidence;
unknown diagnostics stay stopped/incomplete. No broad string/exit-code retries.

## Selected smallest correction / alternatives

Extend existing SetupService reconnect lifecycle with selected-client failed-start
completion after storage readiness. Resolve current selected reference/daemon,
exact current client and exact NFS volume. Recover ONLY an exited previously-started
selected client with current automatic boot policy and the recognized exact-owned
volume connection-refused startup diagnostic, after a fresh daemon-side current
image/UUID/nonroot-mapping/read-write probe. Reinspect before mutation; start SAME
ID once; verify current API/shared binding. No recreation, image pull, settings
change, all-stopped-node start, active process supervision or application retry.
The live failed-start diagnostic plus current policy is the narrow eligibility
basis, not old setup running state. A small consumed-failure record prevents the
30-second supervisor from repeatedly issuing Start for one failed attempt.

Intentionally stopped is not inferred from `Running=false` alone. A completed
normal stop (before reboot or after recovery), policy disabled/changed to no or
on-failure, never-started, paused/dead/restarting, missing/ambiguous selection,
foreign volume/error, pending recreation, changed fingerprint or consumed attempt
is ineligible. No automatic policy rewrite. Existing `docker update --restart=no`
is an explicit current-policy veto even for an already-failed start. The control
must expose this distinction in recovery diagnostics/docs; a no-op `docker stop`
against an already failed, non-running container supplies no new Docker intent.
This is a dependency observability limit, not a claim that all stopped nodes may
start. The current product launcher stop_nodes also forwards that no-op. Its guidance
must not equate this with a durable policy veto. A proposed private stop-veto file
was considered and rejected: Docker restore can still start the container on a
later boot while its policy remains unchanged. No such misleading mechanism or
new privileged Stop command is selected; current-policy=no is the real veto. Race-free coordination of contradictory concurrent Docker commands is not
added; serial normal stop/start controls must be validated downstream.

Rejected:
- fixed sleep or After=docker.service alone: daemon up != NFS export ready;
  Docker storage itself needs Docker, so global Before=docker introduces a cycle;
- engine/client legacy links: only process ordering, not export readiness;
- app entrypoint wait: volume mount fails before entrypoint can run;
- replacement volume plugin/proxy or general run-intent framework: new backend,
  privilege and state ownership far larger than observed gap;
- rewrite restart policies/always-restart every stopped node: violates preserved
  current operator control and unrelated node boundaries;
- daemon journal parsing/event replay/private HasBeenManuallyStopped reads: not a
  portable authoritative public control contract; cannot observe no-op stops;
- host bind copy, client/kernel downgrade, backend switch: unrelated mechanism.

## Approval, confidence and downstream work

Design-only correction within existing normal restart + preservation; no changed
REQ/AC/hosting/security/product UX or new mandatory setup command. No new approval
question. Canonical SR021 defines exact eligibility/attempt/owner/file/state/test
contracts. If current-version implementation cannot distinguish the documented
signature or normal stop controls do not hold, return concrete design impact,
not a heuristic broader retry.

No fresh prototype claimed: two current API normal boots + same-ID diagnostic
repair demonstrate mechanism; personally traced public dependency/current source
establish feasible owner. Negative-state derivation still needs implemented
unit/public runtime verification. First downstream API check is fresh public
selected-client setup -> normal reboot twice -> automatic same-ID API+mounted
bytes ready, without manual start/reconnect, with stopped controls/preservation.
Full remaining approved matrix and original source retention/user/release gates
remain. API003 Fail57.14% and CRR008 Fail remain until independently superseded.
