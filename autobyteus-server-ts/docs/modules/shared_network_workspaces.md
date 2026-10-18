# Filesystem workspaces and external storage

AutoByteus uses ordinary directory paths and filesystem APIs. It does not detect
mounts, identify NFS or storage UUIDs, read host attachment descriptors, invoke a
storage CLI, or perform storage admission before activation or terminal creation.
Workspace registration remains metadata-only. Selecting a registered workspace
preserves its resolution errors rather than silently substituting a temporary
folder. The existing no-selection and unknown-ID fallback policy is unchanged.

Storage is an operator concern. [AutoByteus NFS](https://github.com/AutoByteus/autobyteus-nfs)
is one independent host service; see its
[filesystem usage guide](https://github.com/AutoByteus/autobyteus-nfs/blob/main/docs/filesystem-usage.md).
The Docker launcher can use any operator-supplied directory through
`AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`: `<root>/shared` maps to the shared folder
and `<root>/nodes/<name>` to that node's workspace. The launcher retains private
settings, sign-ins and memory volumes but neither installs nor controls NFS.

## Configured skills and process ownership

Claude, Codex and Grok use exact execution-private skill profiles on every
filesystem. A profile is registered with its owner before awaited acquisition,
in valid application-private execution storage outside the project, including
symlink aliases. No configured bindings means no profile acquisition. Missing
storage or unsupported native discovery refuses preparation; it does not fall
back to project links. Configured collisions fail; ALL_INSTALLED prefers the
user-owned project entry. Other adapters' genuine materializers remain.

Native discovery checks the logical name and actual source manifest. A proven
native process/client close precedes exact profile release. Cleanup removes only
that profile's wrappers/links, never source bytes or a peer profile. Managed
catalog lookup selects the current matching source; it does not retain an old
generation. Source Update/Remove remains independent, so linked bytes can
disappear. AGY retains its separate private capsule and missing-source policy.

AutoByteus does not inject `safe.directory` into Git environments. Explicit
operator Git configuration and provider authentication remain independent.
Normal explorer, PTY, tools and REST contracts are unchanged. Filesystem outages
can stall ordinary operations; bounded outage isolation is not implemented.

## Evidence and distribution boundary

There is no paired NFS fixture or application/service protocol pin. Tests use
ordinary owned directories and independent repository inputs. Future combined
storage evidence must identify service/engine and application revisions, not
claim that a service source hash attests arbitrary app code. The disabled Guide
is informational: no qualified release or command is implied by extraction,
component checks, historical filesystem evidence or an architecture review.
