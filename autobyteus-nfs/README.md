# AutoByteus NFS

A standalone, app-independent service for sharing **one chosen project folder**
between trusted computers. It does not sync, copy or back up projects.

**Release status:** source implementation is under validation. No qualified public
NFS installer/command is published. The Nodes NFS Guide intentionally disables
command copy/download. Do not substitute a prototype command or invent a release
URL. `packaging/release-lock.json` contains architecture-reference pins, not a
claim that this product has passed the physical/runtime matrix.

## Supported design and qualification targets

| Storage computer | Export engine | Source | Protocol |
| --- | --- | --- | --- |
| Native Mac | Apple system nfsd | local APFS | NFSv3/TCP |
| Native Ubuntu 24.04 | Ganesha 4.3/VFS | local ext4 | NFSv4.1/TCP |
| Docker on a Linux computer | same Ganesha/VFS image, host networking | explicitly selected ext4 bind | NFSv4.1/TCP |

Native Mac/Linux clients and **managed Docker agent clients on both Mac and
Linux** are included. Docker Desktop on Mac is not a storage-server option; use
native Mac hosting instead. Windows, public/multi-tenant service, offline sync,
HA, automatic remote notifications and arbitrary custom Docker nodes are not
included. Release metadata advertises only independently qualified CPU/OS targets;
compilation for a target is not qualification.

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
  health directory. Source inode/device, actual mount source/protocol, marker and
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

Configured shared-workspace skills for Claude/Codex/Grok use execution-private
**directory links**, not snapshots. Closing a peer removes only its own wrappers/
links after native process close. Existing user-confirmed source Update/Remove
remains independent and can make links unavailable. AGY keeps its existing capsule
manifest and missing-source warn/skip restore. Ordinary local materialization and
runtime tool permissions are unchanged.

## Developer checks (not live-resource authorization)

From this directory, with the pinned CI Go toolchain:

```sh
go test -race ./...
go vet ./...
go build ./cmd/autobyteus-nfs
```

Unit tests use temporary owned files and fake Docker HTTP responses; they do not
mount/export/recreate real nodes. Cross-compilation and `version` smoke do not
prove native NFS or installer behavior. Root `TESTING.md` applies. Current-build
mode tests, clean-machine installation, healthy previews and native skill tool
reads/peer-stop/restore, independent physical Mac/Linux/Docker topology and
explicit user verification remain downstream gates. Do not run privileged setup
or provider calls merely because a design review passed.

See [packaging/RELEASE.md](packaging/RELEASE.md) for distribution gates and
[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES) for backend/runtime notices.
