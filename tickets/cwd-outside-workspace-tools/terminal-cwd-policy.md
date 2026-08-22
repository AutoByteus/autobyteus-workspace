# Terminal CWD Policy

## Status

User-approved intended-behavior supplement; architecture approval is required after the design package is produced.

## Purpose

Define the explicit `cwd` contract for the two agent-facing non-interactive terminal tools in `autobyteus-ts`: `run_bash` and `start_background_process`.

## Operation Matrix

| Input / context | Expected result |
| --- | --- |
| Omitted/null `cwd` + configured workspace | Run in the configured workspace root. |
| Omitted/null `cwd` + no configured workspace | Run in `os.tmpdir()` as today. |
| Absolute existing directory inside workspace | Allow; report normalized physical `effectiveCwd`. |
| Absolute existing directory outside workspace | Allow; report normalized physical `effectiveCwd`. |
| Absolute existing directory + no workspace | Allow; the absolute path is self-anchored. |
| Relative existing directory + configured workspace | Resolve under workspace root and allow. |
| Relative lexical or physical traversal outside configured workspace | Reject; workspace anchoring does not become an escape route. |
| Relative cwd + no workspace | Reject; require an absolute cwd or configured workspace. |
| Missing cwd path | Reject before spawn with the existing working-directory-not-found class of error. |
| Regular file or non-directory cwd | Reject before spawn with the existing non-directory class of error. |
| Existing but inaccessible cwd | Reject before target process creation with `Working directory '<path>' is not accessible.` or the platform-equivalent existing working-directory validation message. |
| Symlink to an existing accessible directory | Allow and normalize to the physical directory used by the process. |

## Invariants

- `cwd` is per `run_bash` invocation or per newly started background process.
- `cwd` never mutates `workspaceRootPath`, agent state, process cwd for later calls, or interactive terminal session state.
- Workspace root is a default and a relative-path anchor, not an authorization root for explicit absolute terminal cwd.
- Workspace lexical and physical containment remains enforced for relative workspace-anchored cwd input.
- Resolver-owned preflight checks must verify the access required to use the resolved directory as a process cwd before `ShellCommandExecutor` or `BackgroundProcessManager` creates the target process.
- On Windows, host-path existence/type/accessibility is checked before `windowsPathToWsl` conversion. The WSL adapter owns path translation and runtime availability, not a second cwd authorization policy; host-preflight failures use the working-directory validation class.
- A failed preflight must not invoke the target shell/background spawn path.
- The result's `effectiveCwd` is the location to use for interpreting the command/process and should be surfaced unchanged through existing result types.
- The shell command remains stateless; `cd` in one `run_bash` call does not affect the next call.
- Shell selection and platform conversion remain unchanged after cwd resolution.

## Trusted-Local Security Posture

This policy intentionally allows any absolute local directory accessible to the AutoByteus process. It is not a host-filesystem sandbox. A shell command can already execute arbitrary shell text, including `cd /outside && ...`, from a workspace-started shell; removing the cwd containment check primarily fixes explicit process cwd, relative command behavior, background-process location, and location metadata.

This policy does not add a terminal-specific deny list for AutoByteus application data, secrets, or databases. If those paths must remain blocked for terminal commands, that is a separate security requirement that needs a real command/file authorization boundary; a cwd-only deny list would not prevent `cd` from command text.

## Explicit Non-Goals

- No persistent shell `cd`.
- No process-wide working-directory mutation.
- No file-tool, media-tool, file-explorer, artifact, MCP, or provider-runtime policy changes.
- No new approval prompts, root registration, capability profile, command allowlist, or OS sandbox.
- No change to interactive server/web terminal routing; it already accepts explicit external roots through its own boundary.
