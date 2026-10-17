# AutoByteus NFS

A standalone, app-independent service for sharing **one chosen project folder**
between trusted computers. It does not sync, copy or back up projects.

**Release status:** this source increment has bounded command-only Linux filesystem
validation, not full product or platform qualification. No qualified public
NFS installer/command is published. The Nodes NFS Guide intentionally disables
command copy/download. Do not substitute a prototype command or invent a release
URL. `packaging/release-lock.json` contains architecture-reference pins, not a
claim that this product has passed the physical/runtime matrix.

## Validation boundary

The delivered validation increment uses Linux commands in two generic Docker
containers bound to a proven real host NFS mount in **one Ubuntu VM**. Native
Linux and Docker-on-Linux storage are exercised sequentially against the same
original source. This proves the tested file operations, healthy fresh-open
visibility, concurrency and safety controls at that boundary. Both containers
share the host kernel/cache; this is not independent NFS-client or multi-host
qualification. Visibility observations are not throughput/scalability benchmarks.

The user selected command-only acceptance for this increment: application UI,
editor and API journeys are not its acceptance dependency. Repository regression
checks remain supplementary. Independent-kernel/physical/Mac/cross-OS/external
join, authenticated-agent and publication qualification remain deferred or
unproven; product targets below are not a qualified-support list. The live editor
continuation was not completed, and no broader approval is implied. See the
[archived delivery evidence](../tickets/done/shared-network-workspaces/handoff-summary.md)
for fresh-versus-carried proof and known limitations. Publication still follows
[packaging/RELEASE.md](packaging/RELEASE.md); the Guide remains unavailable.

## Supported design and qualification targets

| Storage computer | Export engine | Source | Protocol |
| --- | --- | --- | --- |
| Native Mac | Apple system nfsd | local APFS | NFSv3/TCP |
| Native Ubuntu 24.04 | corrected Ganesha 4.3/VFS | local ext4 | NFSv4.1/TCP |
| Docker on a Linux computer | same Ganesha/VFS image, host networking | explicitly selected ext4 bind | NFSv4.1/TCP |

Native Mac/Linux clients and **managed Docker agent clients on both Mac and
Linux** are included. Docker Desktop on Mac is not a storage-server option; use
native Mac hosting instead. Windows, public/multi-tenant service, offline sync,
HA, automatic remote notifications and arbitrary custom Docker nodes are not
included. Release metadata advertises only independently qualified CPU/OS targets;
compilation for a target is not qualification.

Linux engine delivery uses the reviewed Noble backport `4.3-8ubuntu1+autobyteus1`,
not unpatched stock4.3. The matching packages are embedded in Linux release
binaries and shared with the Docker image; users need no compiler/PPA or extra
package command. This distribution path is still under validation.

## Intended first-use journey

A published, versioned bootstrap will download a checksum-verified archive and
manifest, validate archive members and the binary's embedded release metadata,
then execute the installed binary immediately. It needs no Go, Node or Python on
the participant. It reads prompts from `/dev/tty` even when piped to Bash. The
bootstrap does not change the invoking shell's PATH; it installs the user CLI at
`~/.local/bin/autobyteus-nfs` and invokes its absolute versioned path.

The command offers **Create** or **Connect**. Create asks for the ordinary source
folder, deployment and selected private hosts/subnet. Existing files remain in
place. Connect consumes bounded JSON printed by the storage computer, not shell
commands or an access token. Both flows select local launcher-managed Docker
nodes and display their exact interruption/preservation plan before applying it.
Necessary administrator and drain approvals are part of that invocation.

The default project root is `/Volumes/autobyteus-shared` on both operating systems.
A nonempty or writable unmounted target is refused, not hidden or emptied; choose
an explicit empty alternative. Setup prints the actual root. Select a project
beneath it as an ordinary AutoByteus workspace. Each other computer still runs its
own connection flow. Closing AutoByteus does not stop this service.

Installed commands: `create`, `connect`, `status`, `reconnect`, `detach`, `version`.
No arguments selects first-use setup or configured status/actions. Noninteractive
setup requires explicit inputs, administration consent (`--yes`) and, when nodes
are selected, explicit `--drained`. Connection input is never evaluated as shell.

## Data, trust and limitations

- The source contains a persistent `.autobyteus-nfs/storage.json` UUID and an owned
  health directory. Mac APFS volume UUID + directory inode (Linux device + inode),
  actual mount source/protocol, marker and
  nonroot synced-write/read/remove checks distinguish an attachment from a same-
  named local directory. No Git repository is created as a health check.
- NFS uses **unencrypted AUTH_SYS, coarse host trust**. An allowed subnet trusts
  every computer in it; a host allowlist is narrower. NAT identifies the computer,
  not individual containers. All writes, including client-root writes, map to the
  selected nonroot source identity. No root export or recursive chmod/chown is
  used. Do not expose these ports to the public internet.
- No firewall/router/UPnP rules are changed automatically. An existing network
  policy must permit the displayed private participants. Ganesha uses TCP2049;
  Apple also needs RPC111/mountd20048. Conflicting existing Apple/global engine
  settings are refused rather than disabling another export.
- Hard mounts protect normal write semantics but can **stall file operations,
  previews, agent startup/terminal work and unrelated application work** during
  storage loss. Status itself can wait. Restore storage/network connectivity
  before retrying. There is no local mirror, soft mount, forced unmount, guaranteed
  cancellation deadline or v1 outage-isolation guarantee.
- Deliberately reload/reopen to observe remote changes. Do not rely on remote
  filesystem watcher events. Healthy media, HTML/relative assets and completed
  artifact previews keep the existing streaming endpoints and policies.
- Coordinate same-file edits and Git index/branch operations. Different-file
  work is supported, not merged by the service. NFSv4 uses server locking; the
  selected Apple NFSv3 path uses local-only advisory locks, not distributed lock
  coordination. APFS case/Unicode behavior remains the source's behavior.
- Back up the source independently. Configuration rollback is never data rollback.

## Private state and lifecycle

Private configuration/receipts are root-owned under
`/Library/Application Support/AutoByteusNFS` or `/var/lib/autobyteus-nfs`.
The separately traversable root-owned executable is at
`/Library/AutoByteusNFS/libexec/autobyteus-nfs` or
`/usr/libexec/autobyteus-nfs/autobyteus-nfs`; nonroot probe children must be able to
execute it without opening private configuration. Fixed launchd/systemd jobs do
not read user-writable shell state or depend on the desktop application.

`/etc/autobyteus-nfs/attachment.json` is a nonsecret descriptor, directory-bound
read-only into selected nodes. Per-node opt-in references under `nodes/` are
published only after apply and consumed by the Docker launcher's desired config
and recreation arguments. Unselected local-only Docker sharing stays unchanged.

The service uses the local Docker API, not launcher `start_node`: no node image
pull, port reassignment, private-volume deletion or credential replacement. It
retains the exact original stopped container until replacement is verified. It
keeps image identity, Config, HostConfig, private/anonymous mounts, ports, restart
policy, requested network addresses and meaningful aliases. Unsupported startup/
network configurations fail before stopping. A fresh image probe has no user
private/auth mounts or published ports.

A pre-start failure can restore the original configuration. Once replacement
startup may have accepted work, the receipt is retained and a **new operator drain**
is required; automatic rollback is forbidden. Pending setup is explicit, not a
persisted READY flag. Healthy repeat/reconnect preserves the source UUID. Safe
detach retains source/marker, named volumes and private recovery evidence; busy
unmounts fail without force/lazy unmount.

Owned native Linux and Linux Docker Ganesha exports set
`Attr_Expiration_Time = 0` at EXPORT level so fresh source attributes are not
hidden behind the server's default cache window. Client hard NFSv4.1 mounts keep
`actimeo=1`; Apple exports are unchanged. The healthy acceptance target is a
fresh open seeing a synced/closed source write of up to 1 MiB within 5 seconds,
not instant watcher notification or visibility through an already-open handle.

Status verifies the hosted Ganesha configuration before reporting host readiness;
it does not rewrite configuration or restart an engine. Detach checks an existing
configuration before touching nodes, mounts, jobs or engines. Different or
unreadable bytes are retained and refused. Missing configuration permits retry
of an already-partial owned detach, but never readiness. Exact unit/container
ownership checks and source/marker/recovery preservation still apply.

There is no live configuration migration or hot-reload promise. For disposable
older test setups, drain and detach with their matching candidate **before**
installing the corrected candidate, then set up again against the preserved
source and marker. Do not overwrite a different config or delete the source to
get past refusal. Matching disk bytes alone do not prove a running daemon loaded
a changed policy. Reuse of retained supported deployments would require a
separately established transition, not this test-fixture procedure.

Configured shared-workspace skills for Claude/Codex/Grok use execution-private
**directory links**, not snapshots. Closing a peer removes only its own wrappers/
links after native process close. Existing user-confirmed source Update/Remove
remains independent and can make links unavailable. AGY keeps its existing capsule
manifest and missing-source warn/skip restore. Ordinary local materialization and
runtime tool permissions are unchanged.

### Mac source identity and interrupted setup

Native Mac captures the actual open source directory's APFS volume UUID with the
trusted system `diskutil info -plist` command. Raw device numbers can change at
boot and are not saved as Mac identity. A different volume or directory is
refused even if its marker and project bytes were copied; there is no identity
refresh, marker fallback or automatic repair. APFS UUIDs are not cryptographic
proof against a privileged clone/spoof of a volume.

A newly created source is bound and saved to the existing pending intent before
marker/handle/export work. An interrupted setup needs a fresh displayed plan and
consent; a complete binding is reused, never reselected from the current path.
Status does not repair identity, and detach does not require a live source.

No supported released device-only Mac predecessor has been established for this
unqualified package. Known owned test setups using that old binding must be
**drained/detached with their matching old CLI before replacing it**, then freshly
created on the preserved source/marker/storage UUID. The current CLI refuses an
old or incomplete Apple binding; never hand-edit it or infer its original UUID
from today's path. Evidence of an actual supported retained installation requires
a concrete transition assessment, not this disposable-fixture procedure.

## Developer checks (not live-resource authorization)

From this directory, with the pinned CI Go toolchain:

```sh
go test -race ./...
go vet ./...
go build ./cmd/autobyteus-nfs
```

Source identity tests cover strict plist/variant parsing, descriptor correlation
and closure, bind-before-failure, bound retry/refusal and unchanged Linux identity
shape. One Mac test reads installed diskutil metadata for its own directory; this
is not whole-host reboot or mounted NFS qualification.

Unit tests use temporary owned files and fake Docker HTTP responses; they do not
mount/export/recreate real nodes. Cross-compilation and `version` smoke do not
prove native NFS or installer behavior. Root `TESTING.md` applies. The bounded command-only
increment above is distinct from broader product and publication qualification:
clean-machine installation, healthy application previews and native skill tool
reads/peer-stop/restore, independent physical Mac/Linux/Docker topology and
explicit publication user verification are not established by those checks.
They are not additional acceptance gates for the user-selected command-only
increment; the publication guide's gates remain unchanged. Do not run privileged setup
or provider calls merely because a design review passed.

See [packaging/RELEASE.md](packaging/RELEASE.md) for distribution gates and
[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for backend/runtime notices.

### Selected Docker clients after an ordinary host restart

The existing reconnect service completes only a recognized pre-process NFS
connection-refused start failure on a currently selected, attached client with
current `unless-stopped` or `always` policy. After fresh daemon-side UUID/access
proof it starts the **same container ID**, once per failed process incarnation,
then checks its actual API/shared binding. It does not recreate, pull, change
policy or restart an unhealthy running process. Unknown startup diagnostics stay
incomplete. Status does not start clients. A confirmed public `reconnect` (or
`--yes`) can retry a consumed eligible attempt; background ticks cannot.

A normal Stop of a successfully running `unless-stopped` node remains stopped.
Docker Stop on an **already-failed, non-running** node (including through the
launcher) is a no-op and supplies no new stop intent. To durably veto pending
failed-start completion in that case use `docker update --restart=no <node>`.
Reconnect never overrides this policy. Docker `always` retains its own restart
semantics. No private stop-veto file or Docker-private state is used.
