# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the user approved removing the current-workspace limitation for the cwd-bearing terminal tools, with sandbox implementation explicitly deferred to a separate ticket.

## Goal / Problem Statement

Allow the agent-facing terminal tools in `autobyteus-ts` to start commands in an existing local directory outside the configured agent workspace. Today `run_bash` and `start_background_process` accept an explicit `cwd` syntactically, but `execution-cwd.ts` rejects every explicit path that leaves `workspaceRootPath`. This prevents normal worktree, sibling-project, generated-output, and external-scratch-directory workflows even though shell commands can already navigate outside the workspace in their command text.

The proposed target is a trusted-local `cwd` contract: an explicit absolute directory is accepted anywhere the local process can access it; a relative directory remains anchored to the configured workspace because no other relative anchor is defined. The configured workspace remains the default location and the agent identity; an explicit `cwd` changes only the command/process working directory for that invocation.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `run_bash` sends an explicit `cwd` through `resolveExecutionCwd`, which requires a workspace and rejects lexical or physical paths outside it with `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT`. | `run_bash` accepts an existing absolute directory outside `workspaceRootPath` and executes with that directory as the process cwd. | Command execution, output capture, timeout, abort, exit-code, and result-shape behavior remain unchanged. | REQ-001, REQ-005, REQ-008; AC-001, AC-007 |
| BEH-002 | `start_background_process` uses the same resolver and rejects an external absolute `cwd` before spawning. | `start_background_process` accepts an existing absolute external directory and records that directory as `effectiveCwd` for the managed process. | PID identity, output capture, lifecycle, stop, and status behavior remain unchanged. | REQ-002, REQ-005, REQ-008; AC-002, AC-007 |
| BEH-003 | A relative explicit `cwd` is resolved from the workspace root when a workspace exists; without a workspace, every explicit cwd currently fails because the resolver requires an authorized workspace. | A relative explicit `cwd` continues to resolve from `workspaceRootPath`; if no workspace exists, a relative cwd remains invalid and returns an actionable absolute-path/ workspace-anchor error. | Relative paths do not resolve from process cwd or prior shell state. | REQ-003, REQ-006; AC-003, AC-004 |
| BEH-004 | Omitted `cwd` uses the workspace root when configured, otherwise `os.tmpdir()`. | The omitted-cwd defaults remain unchanged. | The default location remains distinct from an explicit external target. | REQ-004; AC-005 |
| BEH-005 | Physical containment checks reject symlinked or traversal-resolved directories outside the workspace, even when the requested target is an intentional external directory. Existing but inaccessible directories can reach the downstream spawn boundary because the current preflight checks stat/type but do not explicitly verify cwd access. | No workspace lexical/physical containment check rejects an absolute external target. The target is normalized, verified to exist, be a directory, and be accessible for use as a process cwd before process creation; symlink targets are valid when they resolve to an accessible directory. Existing inaccessible targets map to the existing working-directory validation error class. | Invalid, missing, non-directory, and inaccessible cwd errors remain fail-fast and do not spawn a target process. | REQ-005, REQ-008; AC-006, AC-007 |
| BEH-006 | Tool schemas and `docs/terminal_tools.md` say absolute paths are allowed but simultaneously document that terminal cwd remains workspace-contained. Runtime prompt guidance says an explicit working directory changes command location, creating a contract inconsistency. | LLM-facing schemas and terminal documentation accurately state: absolute cwd may be outside the workspace; relative cwd is workspace-root-relative when a workspace exists; omitted cwd uses the documented default; and explicit cwd does not redefine workspace identity or persist across calls. | Stateless `run_bash` behavior and the separate interactive server/web terminal boundary remain distinct. | REQ-007, REQ-009; AC-008, AC-009 |
| BEH-007 | Interactive server/web terminal root selection already canonicalizes and validates an explicit absolute directory without applying the agent workspace containment resolver. | The agent-facing non-interactive tools become consistent with the existing local terminal-root behavior for explicit external directories. | Interactive terminal transport, websocket authorization, and file-explorer workspace containment are not changed by this task. | REQ-010; AC-010 |

## Investigation Findings

- The restriction is localized to `autobyteus-ts/src/tools/terminal/execution-cwd.ts`; both agent-facing cwd tools depend on it.
- The current terminal-specific resolver was introduced/reworked alongside the file-tool authorization changes and now contains a workspace authorization boundary. The file-tool resolver is no longer imported by terminal cwd, so widening this resolver will not widen generic file-tool path behavior.
- Shell commands are already arbitrary shell text. A command can execute `cd /external/path && ...` from a workspace-started shell, so the current cwd restriction is primarily a usability, relative-path, process-cwd, and metadata limitation rather than a complete filesystem sandbox.
- The server/web interactive terminal already accepts an explicit absolute filesystem root outside the agent workspace through its own canonicalization path.
- The requested change therefore looks like a bounded terminal contract correction, not a new workspace model, persisted-data change, or broad file-access policy change.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/terminal-cwd-policy.md` | Intended terminal cwd operation matrix, anchoring rules, security posture, and explicit non-goals | REQ-001–REQ-010 | AC-001–AC-010 | User-approved intended behavior; architecture approval required | Makes the boundary and precedence rules reviewable without hiding them in implementation notes. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change` / `Bug Fix`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: the terminal cwd resolver uses `workspaceRootPath` both as the omitted-cwd default/relative-path anchor and as a hard authorization root. Those are different responsibilities. The current owner is already terminal-specific and is used by exactly the two affected agent-facing tools; the change can remove the incorrect containment role without introducing a new abstraction. The command path itself already permits `cd` outside the workspace, and the server/web terminal has an external-root precedent.
- Requirement or scope impact: the user approved the trusted-local external absolute-directory contract for project/worktree roots. No terminal-specific deny policy or sandbox is added; application-data protection remains a separate security requirement because no such deny path is currently enforced by this resolver.

## Recommendations

1. Change the terminal cwd resolver so absolute explicit paths are anchored directly and do not require `workspaceRootPath`.
2. Keep relative explicit paths workspace-root-relative; reject them without a workspace rather than silently using process cwd.
3. Keep omitted-cwd defaults, directory validation, physical normalization, shell execution, timeout, and background-process lifecycle unchanged.
4. Update both tool schemas and `docs/terminal_tools.md`; remove the false “terminal cwd remains workspace-contained” claim.
5. Add focused unit and integration coverage for external absolute `run_bash` and `start_background_process`, external symlink directories, no-workspace absolute cwd, relative anchoring, invalid directories, existing-but-inaccessible absolute and workspace-relative cwd values, and unchanged defaults/statelessness; inaccessible-cwd cases must prove no target process is spawned for either tool.
6. Do not change file-tool, media-tool, file-explorer, MCP config, interactive websocket terminal, or provider-runtime path policies in this task.
7. Do not describe this as a host-filesystem sandbox improvement: shell command text already has process-level filesystem reach. If a true sandbox is required, it needs a separate OS/command/file authorization design.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — source ownership is localized to the terminal cwd resolver and two tool contracts, but this changes a filesystem-related policy boundary and needs package/runtime regression evidence.

## Scope Guardrail (Mandatory)

This ticket changes the explicit cwd contract for the two agent-facing non-interactive terminal tools only. It does not change what the agent workspace is, does not add persistent shell state, and does not widen unrelated path policies.

### In-Scope Use Cases

- `UC-001`: Run a foreground command in an external absolute project/worktree directory through `run_bash`.
- `UC-002`: Start and manage a long-running process in an external absolute directory through `start_background_process`.
- `UC-003`: Use a relative cwd under the configured workspace with existing workspace-relative semantics.
- `UC-004`: Use an absolute cwd when no workspace is configured, provided the directory exists and is accessible.
- `UC-005`: Confirm the effective cwd and background-process cwd metadata identify the requested normalized directory.

### Out of Scope

- Generic file-tool absolute/relative path policy, including `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`.
- Multimedia, file-explorer, artifact publication, MCP configuration, or provider-native runtime path policy.
- Interactive server/web terminal websocket routing or its existing external-root behavior.
- Persistent `cd`, environment, or shell-session state for stateless agent tools.
- OS sandboxing, command allowlists, per-directory approvals, or a new capability/permission profile.
- A new deny list for AutoByteus application data or secrets in terminal cwd; if required, that is a separate security requirement and must be explicitly approved.

### Preserved Behavior Boundary

Preserve BEH-003 through BEH-005 and BEH-007. The workspace remains the omitted-cwd default and relative anchor; `run_bash` remains stateless; invalid cwd values fail before spawn; result and process lifecycle contracts remain unchanged; interactive terminal and unrelated path boundaries remain untouched.

### Review Authority

- Blocking downstream findings must cite REQ-* / AC-* or BEH-* in this requirements basis.
- A demand for terminal secret denial, command authorization, OS sandboxing, persistent cwd, or changes to unrelated tools is a `Requirement Gap` until explicitly approved.
- The intended trusted-local terminal cwd behavior in `terminal-cwd-policy.md` is user-approved; architecture approval is required for the complete solution package.

## Functional Requirements

- **REQ-001 — External absolute cwd for foreground commands:** `run_bash` shall accept an explicit absolute cwd outside `workspaceRootPath` when it resolves to an existing accessible directory.
- **REQ-002 — External absolute cwd for background commands:** `start_background_process` shall accept an explicit absolute cwd outside `workspaceRootPath` when it resolves to an existing accessible directory.
- **REQ-003 — Relative cwd anchoring:** A relative explicit cwd shall resolve against `workspaceRootPath` when configured. Relative lexical or physical traversal outside that workspace shall remain rejected. It shall not resolve against process cwd or prior shell state. Without a workspace root, a relative explicit cwd shall fail with an actionable error requiring an absolute cwd or configured workspace.
- **REQ-004 — Omitted cwd defaults:** An omitted/null cwd shall continue to resolve to the configured workspace root when present, otherwise `os.tmpdir()`.
- **REQ-005 — Directory, accessibility, and physical-path validation:** The resolver shall normalize the candidate, follow valid symlink resolution as needed for process execution/effectiveCwd reporting, require an existing directory, and preflight the access required to use it as a process cwd before the target shell/background process is created. Missing, non-directory, and inaccessible targets shall map to the existing working-directory validation error class. No workspace containment check shall reject an absolute target solely because it is external; workspace lexical/physical containment remains applicable to relative workspace-anchored input. On Windows, host-path accessibility is validated before host-to-WSL conversion; WSL runtime conversion remains an execution adapter and must not introduce a second authorization policy.
- **REQ-006 — No persistent workspace mutation:** An explicit cwd shall affect only that command or newly started background process. It shall not update `workspaceRootPath`, agent state, process cwd for later invocations, or interactive terminal session state.
- **REQ-007 — Schema clarity:** The `cwd` parameter schema for both affected tools shall accurately describe absolute external paths, workspace-relative relative paths, omitted defaults, and per-call semantics.
- **REQ-008 — Execution contract preservation:** Shell selection, POSIX/WSL behavior, timeout, abort, output capture, background adoption, PID identity, status, and stop behavior shall remain unchanged.
- **REQ-009 — Durable documentation alignment:** `autobyteus-ts/docs/terminal_tools.md` shall describe the new cwd policy and shall not call agent `run_bash` cwd workspace-contained. It shall distinguish the non-interactive agent path from interactive server/web terminal backends.
- **REQ-010 — Boundary isolation:** No file-tool, media-tool, file-explorer, MCP, or provider-runtime path behavior shall change as a consequence of this resolver update.

## Acceptance Criteria

- **AC-001:** With `workspaceRootPath=/workspace` and an existing `/external/project`, `run_bash(context, 'pwd', '/external/project')` succeeds, reports exit code 0, prints the external project directory, and returns the normalized external directory as `effectiveCwd`.
- **AC-002:** With a workspace and an existing external directory, `start_background_process` starts successfully with that external cwd; its returned `effectiveCwd` is external, and the process can be queried and stopped through the existing PID lifecycle.
- **AC-003:** With a configured workspace and `cwd='packages/api'`, both affected tools continue to resolve to `<workspace>/packages/api`; no external interpretation is introduced for relative input.
- **AC-004:** With no workspace configured, an explicit absolute existing directory succeeds, while an explicit relative cwd fails with an actionable error that names the need for an absolute cwd or configured workspace.
- **AC-005:** With cwd omitted, `run_bash` continues to use the workspace root when configured and `os.tmpdir()` otherwise; two stateless calls do not inherit a prior command's `cd`.
- **AC-006:** Missing paths, regular files, and inaccessible/non-directory targets fail before target process creation with the existing working-directory validation error class; an existing but inaccessible directory maps to `Working directory '<path>' is not accessible.` (or the platform-equivalent existing working-directory validation message); a symlink to an existing external directory is accepted and reports its normalized physical directory; relative lexical or physical traversal outside the workspace remains rejected.
- **AC-007:** Both `run_bash` and `start_background_process` have no-spawn coverage proving that an existing but inaccessible cwd is rejected by the resolver before `ShellCommandExecutor`/`BackgroundProcessManager` reaches target process creation. Existing timeout, abort, foreground output, ordinary shell-background adoption, managed background output, PID identity, stop, and status tests remain green with external cwd coverage added.
- **AC-008:** Serialized tool schemas and source descriptions for `run_bash` and `start_background_process` state that absolute cwd may be outside the workspace, relative cwd uses workspace root when configured, omitted cwd uses the documented default, and cwd is per invocation/process.
- **AC-009:** `docs/terminal_tools.md` no longer claims the agent terminal cwd is workspace-contained and clearly distinguishes the agent non-interactive path from interactive server/web terminal sessions.
- **AC-010:** Focused regression checks show no change to generic file-tool path resolution, multimedia workspace rules, server file-explorer containment, MCP stdio cwd handling, or interactive terminal websocket routing.

## Constraints / Dependencies

- `resolveExecutionCwd` is called by `run-bash.ts` and `start-background-process.ts`; its behavior must remain compatible with `AgentContextLike` and platform-specific `NonInteractiveShellResolver` handling.
- The package is TypeScript source plus built `dist`; source changes require a package build and downstream runtime/package verification before delivery.
- The clean task worktree currently has no `autobyteus-ts/node_modules`; dependency provisioning is a downstream implementation/API-E2E concern.
- Workspace-relative behavior must remain explicit and deterministic; using process cwd as a fallback would make tool calls depend on server launch location.
- Any special protection for AutoByteus-owned application paths is not currently implemented by this terminal cwd resolver. Adding it requires an approved requirement and a separately evidenced policy.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: N/A.
- Required outcome: `Not Affected`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: None.
- Unacceptable data loss or corruption: None introduced by changing process cwd resolution.
- Relevant availability, maintenance-window, or rollout constraints: Built package/runtime must be refreshed before verification.
- Related requirement and acceptance-criteria IDs: REQ-008–REQ-010, AC-007–AC-010.

## Assumptions

- “Outside the workspace” means an absolute local directory accessible to the AutoByteus process, including sibling checkouts and temporary/project directories.
- The user wants trusted-local terminal cwd semantics, not a stronger sandbox. Tool approval remains the product-level execution gate.
- Relative cwd without a workspace should remain invalid rather than silently becoming relative to the server process.
- Existing OS permissions, platform shell availability, WSL path conversion, and process lifecycle behavior remain the governing runtime constraints.

## Risks / Open Questions

1. **Security boundary:** The user approved external project/worktree cwd support. No new terminal deny list is included; current implementation has no terminal deny-list mechanism, and shell command text already permits `cd` outside the workspace. Application-data protection and real sandboxing remain separate work.
2. External cwd makes the trusted-local posture more visible and may increase accidental operations in the wrong checkout. The schema and result's `effectiveCwd` should make location explicit.
3. WSL conversion and Windows drive semantics need platform-specific implementation/test confirmation even though the resolver already accepts a normalized path before platform dispatch.
4. Package `dist` and the packaged Electron/server runtime can remain stale if only source tests are run.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 external foreground command | REQ-001, REQ-005, REQ-007, REQ-008 |
| UC-002 external background process | REQ-002, REQ-005, REQ-007, REQ-008 |
| UC-003 workspace-relative cwd | REQ-003, REQ-004, REQ-006 |
| UC-004 external cwd without workspace | REQ-001, REQ-002, REQ-003, REQ-005 |
| UC-005 cwd identity/statelessness | REQ-004, REQ-006, REQ-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Foreground external absolute cwd through `run_bash`. |
| AC-002 | External background process start, query, output, and stop. |
| AC-003–AC-005 | Relative anchor, no-workspace absolute behavior, omitted defaults, and statelessness. |
| AC-006 | Validation, symlink normalization, and no-spawn failures. |
| AC-007 | Existing execution/lifecycle regression matrix. |
| AC-008–AC-009 | Tool schema and durable documentation contract. |
| AC-010 | Boundary regression outside the changed terminal resolver. |

## Approval Status

`User-approved external absolute cwd behavior for run_bash and start_background_process, including external project/worktree roots. Relative cwd remains workspace-anchored and traversal-contained. Sandbox implementation, OS isolation, and cross-category security policy are explicitly deferred to a separate ticket. Architecture review is now pending.`

## Scope Clarification — Sandbox Deferred

Sandbox implementation is explicitly deferred to a separate ticket. The current `SYSTEM` tool cwd change must not introduce a sandbox backend, OS isolation, command allowlist, network policy, or cross-category security architecture. Tool categories are descriptive registry metadata, not sandbox boundaries. A future sandbox ticket must assess `SYSTEM`, `FILE_SYSTEM`, `WEB`, `MULTIMEDIA`, and `MCP` execution/access paths together before claiming host protection.
