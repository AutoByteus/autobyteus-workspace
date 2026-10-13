# Shared network workspaces

AutoByteus NFS is an independent OS service; see [the service guide](../../../autobyteus-nfs/README.md).
Workspace registration remains metadata-only and does not mount storage or enumerate
network directories at application startup.

`SharedWorkspaceBinding` lazily reads the nonsecret host attachment descriptor. New
run/restore preparation checks actual source/protocol, storage UUID and project access
once. Missing descriptors keep ordinary local behavior. A known configured shared
path is never deliberately replaced with a temp/cwd workspace. The service owns all
mount/export administration. Normal explorer, file tools, PTY and REST streams are
unchanged. Hard NFS outages can stall these calls and unrelated work; this version
does **not** implement bounded outage isolation or per-action probes.

Claude/Codex/Grok configured skills for these paths are linked into an exact owned
node-private profile registered before awaited preparation. Native discovery validates
the real logical name/manifest path, including canonical source paths. Only observed
native process/client close permits profile cleanup; a rejected close is not proof.
The profile removes only its own wrappers/links, never source bytes or a peer profile.
Codex's client key includes both project cwd and profile identity. Claude uses its
skills-only plugin; Grok uses its supported private plugin argument/ACP discovery.
None relocates provider authentication or changes normal permissions.

Managed catalog lookup selects the current matching source; it is not acquisition of
a retained generation. Skills source Update/Remove retains its independent cleanup,
so linked bytes may disappear. There is no copying, source pin, holder refcount,
retirement queue or live profile retarget. AGY retains its existing private capsule,
manifest identity and missing-source warn/skip restore rather than rebuilding from a
new catalog winner. Ordinary local workspace materialization/collision policy remains.

Exact-project Git trust is appended only in relevant runtime/terminal **child**
environments, preserving inherited `GIT_CONFIG_*` entries. No global gitconfig or
`process.env` trust mutation occurs. No shared project link publication is introduced.

Healthy file/media/HTML/relative-asset/completed-artifact previews use the existing
REST authorization/path/projection/MIME/error/stream contracts. Local unit fixtures
and source inspection are not current-product shared-mount or physical LAN proof.
