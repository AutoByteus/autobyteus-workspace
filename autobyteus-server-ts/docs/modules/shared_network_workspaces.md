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

## Configured skills

Skill exposure does not depend on the filesystem or on how a workspace is
stored. Claude, Codex and Grok expose configured skills the same way on every
workspace: the shared `WorkspaceSkillMaterializer` links each skill into
`<workspace>/.claude/skills`, `.codex/skills` or `.grok/skills`. It reuses an
existing link to the same skill, repairs broken links and removes the links it
holds when the run ends. Codex first checks `skills/list`. A configured-skill
run refuses a different workspace-owned entry with the same name;
`ALL_INSTALLED` prefers it. Run preparation does not need the run's memory
folder. AGY keeps its private capsule. See [Skills](./skills.md) (Codex and
Claude; Workspace collision policy).

There is no NFS-specific or execution-private skill profile. Folders left under
`<memory>/runtime-skill-profiles/` by v1.5.6-beta.2 and beta.3 runs are inert
and may be deleted.

## Git and ordinary operations

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
