# Sandboxes

A **sandbox** is a disposable AutoByteus node that a host node creates for an agent (autobyteus-581): one container
from the host node's own release image, paired with the host as a normal peer, relayed through the host (no
credential is ever inside it), with fresh workspace and run-memory folders on the host computer, read-only shared
folders, the requested agent packages imported, and an expiry. An evaluator agent uses it to run an agent package in
a sealed node, reads the results and transcripts from the folders, and removes it.

## TS Source

- `src/sandboxes/`
  - `sandbox-manager.ts`: `SandboxManager`, the one owner of a sandbox's lifecycle: create (checks, the serialized
    limit check and `starting` write, start, pairing, package import, `ready`), run a command, destroy, expiry, and
    the start sweep;
  - `sandbox-docker.ts`: the only owner of Docker calls (`docker run`, `exec`, `cp`, `rm -f -v`, `ps` by label), each
    an argument list; container environment values go by name, never in a command line;
  - `sandbox-pairing.ts`: the sandbox node's setup code over `docker exec`, its owner credential (memory only), the
    pairing under node keys (a grant made on the sandbox, then `PeerPairing.pair`, saved marked `sandbox`), and the
    package import;
  - `sandbox-records-store.ts`: `<app-data-dir>/sandboxes/sandboxes.json` (C6);
  - `sandbox-folders.ts`: the folder layout inside a sandbox and the rule for folders an agent gives it;
  - `sandbox-platform.ts`: the supported hosts (macOS with Docker Desktop);
  - `sandbox-settings.ts`: the image setting and the limits;
  - `sandbox-process-binding.ts`: the studio's manager for the tools.
- `src/agent-tools/sandboxes/`: the three tools' contract, manifest and native tools; the Agent Tools MCP adapter is
  `src/agent-tools/mcp/providers/sandbox-tools-mcp-adapter-provider.ts`.
- `src/compositions/sandbox-composition.ts`: composed after remote collaboration; starts the start sweep.

## Tools

Opt-in per agent through its definition's tool list (`create_sandbox`, `run_in_sandbox`, `destroy_sandbox`), on
every runtime (native tools, Agent Tools MCP for the others). Only the creating run may use or
remove a sandbox.

```jsonc
create_sandbox {
  "agentPackages":  ["/abs/path/package"],                         // required, ≥1: copied into the sandbox, imported
  "sharedFolders":  [{ "path": "/abs/path/data", "name": "articles" }], // optional: read-only at /home/autobyteus/shared/<name>
  "lifetimeMinutes": 120                                           // optional: default 120, 1..480
}
→ { "sandboxId", "peerName", "nodeId", "workspaceFolder", "runMemoryFolder",
    "sharedFolders": [{ "name", "pathInSandbox" }], "agents": [{ "name", "address" }], "teams": [{ "name", "address" }],
    "image", "expiresAt" }
run_in_sandbox { "sandboxId", "argv": ["…"], "timeoutSeconds": 60 } → { "exitCode", "stdout", "stderr", "truncated" }
destroy_sandbox { "sandboxId" } → { "removed": true, "foldersKept": true }
```

A refusal is the tool's error `{ "error": { "code", "message" } }`: `SANDBOX_DOCKER_UNAVAILABLE`,
`SANDBOX_PLATFORM_NOT_SUPPORTED`, `SANDBOX_LIMIT_REACHED`,
`SANDBOX_IMAGE_UNKNOWN`, `SANDBOX_PACKAGE_INVALID`, `SANDBOX_SHARED_FOLDER_INVALID`, `SANDBOX_START_FAILED`,
`SANDBOX_NOT_FOUND`, `SANDBOX_NOT_YOURS`, `SANDBOX_NOT_READY`, `SANDBOX_ARGUMENT_INVALID` (a missing,
wrong-typed or unknown argument). Any other error a tool raises is reported as `SANDBOX_TOOL_FAILED` with its message
(`sandboxToolError`). A refused or failed creation leaves nothing behind. A tool result leaves out empty fields, so a
creation that imported no team has no `teams`, and one given no shared folder has no `sharedFolders`.

## Creation

1. Checks: the platform (macOS with Docker Desktop; other
   hosts refuse `SANDBOX_PLATFORM_NOT_SUPPORTED`, FU-581-02), Docker answering, the image known, and each given
   folder: absolute, an existing directory, links resolved, and neither the user's home folder (or a parent of it)
   nor in or around `~/.ssh`, `~/.claude`, `~/.codex`, `~/.grok`, `~/.config`, `~/.aws`, `~/.gnupg`, `~/.docker`,
   `~/.kube`, `~/.netrc`, `~/Library`, `~/.autobyteus*`, the node's data folder or the test vault.
2. At most 4 sandboxes per host (checked and recorded `starting` in one step).
3. Folders `<app-data-dir>/sandboxes/<sandboxId>/workspace` and `…/run-memory`.
4. One container (`autobyteus-<sandboxId>`), labelled `autobyteus.sandbox=<sandboxId>` and
   `autobyteus.sandbox.host=<host node ID>`, on Docker's default network (full network, DEC-110), published on
   `127.0.0.1:<free port>`, 6 GiB and 4 CPUs, with the folders mounted (`/home/autobyteus/workspace` is its runs'
   workspace; the run-memory folder is bound at `/home/autobyteus/data/memory`, the sandbox node's own memory folder
   inside its data volume, so its runs' memory (`agents/<runId>/…`, and its indexes and semantic memory) is on the
   host; shared folders read-only) and fresh anonymous volumes for its data, `/root` and server packages. Its environment: the relay settings (`AUTOBYTEUS_PROVIDER_RELAY_PEER` = the
   host, and the relays and login-token runtimes the host offers now),
   `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, `AUTOBYTEUS_SERVER_HOST`; never a key, token or credential.
5. Its setup code over `docker exec`; once its published port answers `GET /rest/health` (the node hands out codes a
   moment before its HTTP server takes connections), the code is exchanged once for an owner credential kept in memory
   for the creation only.
6. Pairing under node keys (autobyteus-661 AR-001), the host driving both sides: with the owner credential, the host
   has the sandbox make a pairing grant (`createPairingGrant(relation: own, forNodeId: <host>, nameForAsker: "host")`), then sends
   `POST /rest/remote/pair` with the grant and its addresses. The sandbox keeps the first that answers with the host's
   node ID from inside its container (`host.docker.internal:<port>`, the host's loopback listener; the host sees it as
   `127.0.0.1`). The sandbox stores the host
   (`own`, named `host`); the host stores the sandbox (`own`, named the `sandboxId`, `sandbox: true`). A sandbox from
   before a restart is removed by the start sweep, so no sandbox pair outlives its host's run of it.
7. Each package folder copied in (`docker cp`) and imported; the result lists the agents and teams the imports
   added, as the host addresses them over the peer channel.

The image is `AUTOBYTEUS_SANDBOX_IMAGE` when set, else `autobyteus/autobyteus-server:<release>` from
`AUTOBYTEUS_RELEASE_VERSION`, which the desktop app gives its embedded server (DESIGN rule 9); a development build
without either refuses `SANDBOX_IMAGE_UNKNOWN`.

## Removal

Destroy, expiry, and the host node's start (DS-006): `removing` → `docker rm -f -v` (container and its anonymous
volumes) → the peer removed (record and mark) → the C6 entry deleted. The folders stay for their results. The start
sweep removes every listed sandbox, every container labelled with this host, and every peer marked `sandbox`.

## Reading results

Files a sandbox wrote are owned by the user on the host. A sandbox can plant a symbolic link in a mapped folder that
points to a host file, so the evaluator opens only regular files whose resolved path stays inside the sandbox's
folders (REQ-015); the public skill `autobyteus-sandboxes` says so.

## A sandbox is a normal peer

The host treats a sandbox as any paired peer (DEC-111): an agent under evaluation can start or message agents on the
host through the normal collaboration tools. The `sandbox` mark only labels it on the Nodes page and lets the host
remove it. A restricted mode is a follow-up (FU-581-06).
