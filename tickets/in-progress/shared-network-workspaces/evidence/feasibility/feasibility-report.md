# Feasibility Experiments — SR-005

## Result And Scope

**Partial working component candidate; not implementation-ready.** Latest FR-006 has 14 passed local component cases, one watcher observation and one blocked native Mac case; runner exit2 intentionally records incomplete platform proof. No real separate Linux computer or actual Codex/Claude agent run tested. All Linux clients were disposable containers/native kernel mounts inside this Mac's Docker Desktop Linux VM, not another physical computer.

Approved requirements intent: SR-004, approval-record-sr004.md; current evidence revision SR-005. Product implementation/design-complete routing is still behind REQ-016/AC-016.

## Environment And Candidate

- Mac26.5.2 arm64, uid501; Docker Desktop context desktop-linux, local Unix socket, client/server29.0.1; Linux VM kernel6.12.54-linuxkit.
- Task-built official Ubuntu24.04 base resolved to sha256:534baea6a22c03a63003dbc8dbe78fe34bc0d7e595d9a9dc9834884ff530eb55; NFS-Ganesha4.3 (4.3-8ubuntu1), nfs-common1:2.6.4-3ubuntu5.1. Exact build output in fr-001/image-build.log. Not a selected production version.
- Candidate: Ganesha/VFS service exporting a private task-owned Docker data volume; NFSv4.1 native Linux client; Docker local-driver NFS volumes at /Volumes/autobyteus-shared for nodes A/B. No Mac host-file bridge or FUSE involved in these Docker client mounts.
- A/B had UID/GID10001 and CapEff=0; setup was done by the Docker daemon, not mount commands in those clients. Native Linux client C had SYS_ADMIN only for this owned mount experiment. Server had DAC_READ_SEARCH for VFS file handles.
- Prototype permissions: export default None, explicit client allowlist and All_Squash to dedicated UID/GID10001, data directory0770; sec=sys. This is evidence of coarse trusted-host sharing only, not selected production user authentication/tenant isolation. Kerberos/keytab warnings retained; no Kerberos/TLS claim.
- Published server port bound only to127.0.0.1. No LAN/public exposure or user Docker-node recreation.

## What Worked In FR-006

- Two unprivileged Docker clients opened the same NFS export at the same ordinary path, without configuring/mounting the filesystem inside their containers.
- Completed text write A -> read/modify B -> read A; one-MiB binary exact equality/hash.
- Direct native Linux NFS mount C read/modified the same files, observed by A.
- mkdir, atomic-rename/replace operation, relative symlinks, exclusive-create rejection and chmod/execute.
- Concurrent different-file writers produced40 exact completed files accessible to C.
- Reachable client outside the export allowlist could not mount the same export that C could read; it was hidden with ENOENT, not necessarily EACCES. Read-only client got EROFS on writes.
- Advisory flock exclusion, explicit LOCK_UN acknowledgement and post-exit lock cleanup timing; in the corrected30s lease/grace run, post-exit acquisition had0 retries. An earlier run failed an immediate release assertion; see limitations below.
- Sequential Git init/add/commit then update/add/commit on another client, verified on C.
- Server/container restart retained underlying data and existing clients reconnected. Recorded restart+checks21.559s; not instant recovery.
- Pause caused a fresh write to stall; unpause completed it. This is backend IO behavior, not proof of AutoByteus's not-yet-implemented <=10s admission/diagnostic behavior.

## Observed Limitations And Failed Rounds

| Round | Actual outcome | Investigation/correction |
| --- | --- | --- |
| FR-001 | Service was not usable; Docker mount connection refused | Ganesha startup RPC registration failed without rpcbind/DBus. PID existence was insufficient readiness. FR-002 initializes dependencies and validates real IO. |
| FR-002 | 9 local cases passed; native Mac blocked | NoUI NetFS mount returned errno1/EPERM. No cached sudo/admin access, no UI/credentials solicited automatically. |
| FR-003 | Four cases passed, then harness network configuration failed | Docker static IPs require an explicitly configured subnet. Fresh later owned network is recreated with its observed, non-conflicting subnet; no user network altered. |
| FR-004 | Five passed; denial assertion failed on unexpected ENOENT | Test expected only permission-denied text. Ganesha hides an unauthorized export. FR-005 also proves TCP reachability, authorized access to the same path and absence of a denied-client NFS mount; accepts the supported denial outcome, not arbitrary failure. |
| FR-005 | Eight passed; immediate post-process-exit flock acquisition failed; Mac blocked | Short5s lease/grace and implicit exit timing must not be advertised as immediate release. FR-006 uses30s lease/grace, acknowledges explicit unlock and separately measures implicit release. Earlier failure remains evidence; root cause is not conclusively isolated and requires more realistic/repeated tests. |
| FR-006 | 14 pass, one observation, native Mac still blocked; exit2 | No complete Mac/cross-machine/product setup claim. All recorded owned resources removed. |

Linux native inotify probe returned events=0 for a change written through another NFS client, while ordinary fresh reads found the file/content. Thus filesystem accessibility works in the probe without a native remote change event. Do not advertise automatic explorer notifications; product refresh behavior needs deliberate handling/validation under REQ-011.

## Remaining Mandatory Evidence

1. Approved temporary native Mac mount experiment and ordinary UID501 Mac file operations with the same service. Existing NoUI attempts returned EPERM; do not substitute API reads or Docker-only Linux success.
2. A real separate Linux computer/private-network target and permission to use disposable test resources there. An async question requests OS/version/access method; no passwords requested.
3. Real production-path design/integration including common-storage readiness/no fallback, Desktop/managed-container setup and cancellation/restart, safe recreation/image pinning, runtime skill-link collision/cleanup, explorer refresh and sandbox compatibility.
4. Actual CLI runtime coverage and final product setup workflow. Current probes invoke Python/git/OS filesystem calls, not AutoByteus live nodes, paid providers, installed product binaries or an implemented setup command.
5. Permission/security/reference deployment approval implications, actual Mac/linux client/version consistency, repeated lock release and outage/remount proof. Current coarse allowlist/squashing is not silently promoted to the final policy.

The user authorized feasibility experimentation before implementation, not arbitrary live storage, exports or node changes. A second async question requests consent for a disposable Mac mount under /private/tmp/ab-shared-workspace-feasibility-* with OS administrator approval and cleanup. It is pending, not automatically granted by a preselected UI option.

## Commands, Durability And Cleanup

- Image: docker build --progress=plain -t autobyteus-shared-feasibility:fr-001 evidence/feasibility/fr-001/image (run from ticket; actual invocation path recorded in log).
- Each experiment: python3 tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-00N/run-probe.py, with stdout/stderr tee'd to that fresh round's probe-console.log. Exact commands, timing, configuration and outputs in probe-result.json; use experiment-index.json.
- Early runner rc0 must NOT be interpreted as a green test: fatal/blocked states are in its ledger. Latest FR-006 deliberately exits2 when native Mac coverage remains blocked.
- Exact-resource audit: cleanup-audit.json. All recorded containers/volumes/networks absent, no owned Mac mounts, compiled temporary NetFS probe removed. Exact task image removed after matching its OCI manifest-list digest to original build output. Shared Docker build cache was not globally pruned; no user volumes/images/nodes removed.
- Wholesale upstream Apple source scratch removed; primary URL/hash/consulted lines and SDK authority recorded in fr-001/source-references.json. Probe source is owned experiment code, not product implementation or final API/E2E coverage.
