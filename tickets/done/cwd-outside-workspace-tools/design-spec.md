# Design Spec

## Current-State Read

The two affected agent-facing terminal tools are both registered in the `SYSTEM` category:

- `run_bash` accepts `command`, optional `cwd`, and optional `timeout_seconds`.
- `start_background_process` accepts `command` and optional `cwd`.

Their current production paths share `autobyteus-ts/src/tools/terminal/execution-cwd.ts`:

```text
Agent tool call
  -> runBash / startBackgroundProcess
  -> resolveExecutionCwd
  -> ShellCommandExecutor / BackgroundProcessManager
  -> NonInteractiveShellResolver
  -> POSIX shell or Windows WSL shell
  -> TerminalResult / BackgroundProcessInfo
```

The reviewed implementation of `resolveExecutionCwd` uses `workspaceRootPath` for omitted-cwd defaulting and relative-cwd anchoring, while explicit absolute paths are normalized without workspace containment. Relative input is still lexically and physically contained by the workspace, and physical directory/access validation occurs before the shell or background manager is reached. The new contract retains workspace-root defaulting, removes relative input as a valid form, and preserves external absolute behavior.

The current terminal owner is otherwise healthy. Shell selection, WSL conversion, process spawning, output capture, timeout/abort, PID tracking, background adoption, and stop/status behavior already consume a resolved directory and do not re-implement workspace containment. No new manager or cross-cutting context object is needed.

The target design keeps the agent workspace as the default when cwd is omitted and treats an explicit absolute cwd as a direct local directory target. Any provided relative input is rejected before workspace resolution. Sandbox implementation, OS isolation, command authorization, and other tool categories are explicitly outside this design.

## Intended Change

Change terminal cwd resolution for `run_bash` and `start_background_process` as follows:

```text
omitted cwd
  -> workspace root when configured, otherwise os.tmpdir()

absolute cwd
  -> normalize directly, without workspace containment
  -> resolve the physical path, verify it is an existing directory, and preflight cwd access

provided relative cwd, with or without workspace
  -> reject before workspace resolution, physical resolution, or process creation
  -> return the working-directory validation error requiring an absolute path
```

## Resolver-Owned Pre-Spawn Validation Contract

`resolveExecutionCwd` remains the only owner of cwd validation for both affected
tools. After it distinguishes omitted/null input from a provided value, it must
complete this sequence before returning a cwd to an execution owner:

1. For an omitted/null value, select the configured workspace root when
   available, otherwise `os.tmpdir()`. This defaulting path does not turn the
   workspace into a relative-path anchor.
2. For a provided value, require `path.isAbsolute(value)` before any workspace
   joining or physical resolution. Reject relative values with the existing
   working-directory validation error path and the actionable message
   `Working directory must be an absolute path.` The resolver must not inspect
   or reinterpret a relative value as a workspace path.
3. For an absolute candidate, resolve the physical path using the existing
   ancestor/symlink normalization without applying workspace containment.
4. Check that the physical candidate exists and is a directory. Preserve the
   existing working-directory validation messages for missing and
   non-directory targets.
5. Check the host filesystem access required to use the physical directory as
   a process cwd. The implementation should use the Node filesystem
   accessibility primitive (`accessSync` with the platform-appropriate mode;
   POSIX uses directory search/execute access such as `X_OK`) rather than
   attempting a process-wide `chdir`. This check belongs in the resolver, not
   in either process owner.
6. Convert an access/preflight failure for an existing directory to the
   resolver's existing working-directory validation error path with the
   message `Working directory '<path>' is not accessible.` (using the
   repository's existing error class/family and platform-equivalent wording
   where required). Permission failures such as `EACCES` and `EPERM` must not
   escape as a raw filesystem or shell-spawn error.

The missing, non-directory, and inaccessible branches all return/reject before
`ShellCommandExecutor.execute`, `BackgroundProcessManager.startCommand`, or
the underlying target-shell spawn is invoked. The resolver must not create a
probe shell or any other target process merely to test accessibility. A failed
preflight therefore cannot create a foreground result, background PID, or
background record.

### Host / Windows-WSL Boundary

The accessibility decision is made against the host path while still inside
`resolveExecutionCwd`, before `NonInteractiveShellResolver` calls
`windowsPathToWsl` or otherwise constructs the WSL command. On POSIX, the
host check is the native directory search/execute check. On Windows, the host
filesystem APIs and their permission errors are authoritative; Node's
Windows-specific handling of an access mode must not be treated as evidence
that WSL can access a denied host directory. Windows tests must therefore
cover the host preflight/error mapping deterministically (using an ACL-backed
fixture where reliable or a filesystem-access mock), while WSL path conversion
tests separately verify translation of an already validated host path.

`NonInteractiveShellResolver` remains an execution adapter, not a second cwd
authorization boundary. A WSL distribution/conversion/mount failure after a
successful host preflight remains an adapter/runtime failure and is outside
the host inaccessible-directory mapping; it must not cause the resolver to
reintroduce workspace containment or a sandbox policy.

### No-Spawn Coverage Required By This Design

The focused test matrix must exercise absolute success, relative rejection, and
inaccessible absolute failure for both public tools:

| Tool | Cwd case | Required assertion |
| --- | --- | --- |
| `run_bash` | Existing absolute external directory | Command succeeds in the external directory and reports normalized `effectiveCwd`. |
| `run_bash` | Relative value | Absolute-path validation error; `ShellCommandExecutor.execute` and target spawn are not called. |
| `run_bash` | Existing inaccessible absolute directory | Working-directory accessibility error; `ShellCommandExecutor.execute` and target spawn are not called. |
| `start_background_process` | Existing absolute external directory | Process starts in the external directory and reports normalized `effectiveCwd`. |
| `start_background_process` | Relative value | Absolute-path validation error; `BackgroundProcessManager.startCommand` and target spawn are not called; no PID/record is created. |
| `start_background_process` | Existing inaccessible absolute directory | Working-directory accessibility error; `BackgroundProcessManager.startCommand` and target spawn are not called; no PID/record is created. |

On POSIX, a temporary directory with search/execute permission removed may
provide the inaccessible integration fixture. Because permission behavior
varies by root and Windows ACLs, unit coverage must also inject/mock the
resolver's host accessibility failure so the no-spawn contract is deterministic
on every supported host. Relative-value tests must prove rejection before any
workspace join or filesystem probe. The tests must not launch a probe process
and must retain the existing absolute success, missing, non-directory, symlink,
and lifecycle coverage.

## Material Premise Validation

### `MP-001` — Existing but inaccessible cwd reaches the resolver contract

- Related approved behavior and requirements: `BEH-005`, `REQ-005`,
  `AC-006`, and `AC-007`.
- Initiating basis: the registered `cwd` parameter on both `run_bash` and
  `start_background_process` accepts a caller-supplied local directory.
- Production path: `tool call with cwd -> runBash/startBackgroundProcess ->
  resolveExecutionCwd -> physical path/type/access preflight ->
  ShellCommandExecutor/BackgroundProcessManager spawn boundary`.
- Reachability: `Reachable`. The target can exist and be a directory while
  lacking the host access needed to use it as a process cwd; therefore the
  resolver contract, error mapping, and no-spawn assertions are required
  design behavior rather than a synthetic downstream state.
- Proportionate response: strengthen the existing terminal resolver only;
  do not add a deny list, sandbox, command authorization, or cross-category
  policy.

Update both LLM-facing schemas with the exact requested cwd field descriptions. Update `autobyteus-ts/docs/terminal_tools.md` and the terminal cwd cross-reference in `autobyteus-ts/docs/tool_schema_and_configuration.md` so the absolute-only provided-cwd contract and unchanged omitted defaults are explicit. In the latter file, change only that terminal cross-reference; preserve the generic file-tool `path`/`base_dir`/`edit_file` contract. Keep all process execution and lifecycle owners unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | External absolute foreground cwd; REQ-001, REQ-005, REQ-008; AC-001, AC-007 | Agent model invokes `run_bash` with an absolute project/worktree cwd. | Reviewed `run-bash.ts` -> `execution-cwd.ts` path accepts and validates external absolute cwd before `ShellCommandExecutor`. | Preserve existing external absolute acceptance and execute there; preserve command/result/timeout behavior. | `DS-001`: tool entry -> cwd resolver -> foreground executor -> shell -> result. |
| BEH-002 | Contract | External absolute background cwd; REQ-002, REQ-005, REQ-008; AC-002, AC-007 | Agent model invokes `start_background_process` with an absolute project/worktree cwd. | Reviewed `start-background-process.ts` -> `execution-cwd.ts` -> `BackgroundProcessManager` path accepts and validates external absolute cwd before spawn. | Preserve existing external absolute acceptance and retain it in managed process metadata. | `DS-002`: tool entry -> cwd resolver -> background manager -> shell -> PID record/result. |
| BEH-003 | Contract | Provided cwd must be absolute; REQ-003, REQ-006; AC-003, AC-004, AC-006 | Agent model supplies a relative cwd, with or without a configured workspace. | Current resolver joins relative input to workspace and performs lexical/physical containment. | Reject the provided relative value before workspace joining, physical resolution, or process creation; omitted cwd alone may use the workspace default. | `DS-001`, `DS-002`, `DS-003`. |
| BEH-004 | Contract | Omitted cwd defaults and statelessness; REQ-004, REQ-006; AC-005 | Agent model omits cwd or runs separate stateless commands. | Current resolver uses workspace root or `os.tmpdir()`; `run_bash` does not persist `cd`. | Preserve defaults and per-call cwd; do not mutate agent workspace or process-wide cwd. | `DS-001`, `DS-003`. |
| BEH-005 | System | Directory validation, cwd accessibility, and physical identity; REQ-005; AC-006, AC-007 | Tool call supplies a missing, non-directory, inaccessible, relative, or symlinked cwd. | Reviewed resolver normalizes absolute paths, validates directory/access state before spawn, and still accepts relative values through the old branch. | In `resolveExecutionCwd`, reject provided relative values before workspace joining or physical resolution; retain absolute validation, access error mapping, symlink normalization, and host-before-WSL ordering. | `DS-001`, `DS-002`. |
| BEH-006 | Contract | Schema/documentation alignment; REQ-007, REQ-009; AC-008, AC-009 | Model receives tool schema and terminal documentation, including the long-lived terminal cwd cross-reference in `tool_schema_and_configuration.md`. | Current cwd field descriptions and both terminal documentation surfaces describe relative workspace anchoring. | Set exact cwd field descriptions (`Optional working directory for the command.` / `Optional working directory for the process.`) and state absolute-only provided values, omitted defaults, and per-call semantics consistently across schemas and both docs. Update only the terminal cross-reference in `tool_schema_and_configuration.md`; preserve generic file-tool `path`/`base_dir`/`edit_file` behavior. | Schema/docs off-spine concerns serving `DS-001` and `DS-002`. |
| BEH-007 | Contract | Interactive server/web precedent and boundary isolation; REQ-010; AC-010 | Server/web terminal supplies an explicit `cwd`/`rootPath`, or another tool/runtime path executes independently. | The interactive server/web terminal already accepts explicit external roots through its own boundary; file, multimedia, MCP, and provider paths have separate owners. | Preserve the interactive terminal behavior and make no behavior change outside the two agent-facing cwd tools. | Separate boundaries remain outside `DS-001`/`DS-002`. |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/done/cwd-outside-workspace-tools/terminal-cwd-policy.md` | Operation matrix, anchoring/default rules, trusted-local posture, and non-goals | REQ-001–REQ-010; AC-001–AC-010 | Defines the approved behavior this design carries into the terminal resolver and schemas. | User-approved intended behavior; architecture approval required. |

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`): `Behavior Change` / `Bug Fix`
- Current design issue found (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): `No`
- Evidence: `execution-cwd.ts` is already the terminal-specific authority used by both cwd-bearing tools. It conflates workspace defaulting/relative anchoring with absolute-path authorization, and the new user contract removes relative input entirely. Downstream process owners accept a resolved cwd without duplicating that policy. The server/web interactive terminal already has a separate external-root precedent.
- Design response: retain the existing terminal cwd owner, keep workspace-root defaulting only for omitted cwd, reject provided relative values before resolution, preserve absolute physical/access validation, and leave shell/process lifecycle code unchanged.
- Refactor rationale: a new abstraction would fragment a small, already-owned policy. The correction is a bounded change to the existing resolver plus contract/tests/docs.
- Intentional deferrals and residual risk, if any: no true sandbox or command/filesystem security boundary is added. Shell commands already have process-level local access; this design must not claim otherwise. A future sandbox ticket must cover all relevant host-accessing tools, not only `SYSTEM` tools.

## Terminology

- **Explicit absolute cwd:** A cwd argument recognized by `path.isAbsolute` and resolved directly, without requiring containment under `workspaceRootPath`.
- **Provided relative cwd:** A non-absolute cwd value supplied by the caller; invalid under the approved contract and rejected before workspace resolution.
- **Effective cwd:** The normalized physical directory passed to the shell process and returned in `TerminalResult` / `BackgroundProcessInfo`.

## Design Reading Order

This design is intentionally compact because the change has one existing owner, two public tool entrypoints, and no persisted-data transition. The spine and ownership sections establish the target first; the file mapping then projects that target into the existing terminal subsystem.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the workspace-containment rejection for explicit absolute cwd from the canonical resolver.
- Remove the relative-cwd resolution, lexical-containment, and physical-containment branches from the canonical resolver; a provided relative value is rejected before path resolution.
- Remove/update tests that assert an external absolute cwd must fail.
- Replace tests that assert relative cwd succeeds or is workspace-contained with absolute-path rejection and no-spawn coverage.
- Remove the documentation claim that agent terminal cwd remains workspace-contained.
- Do not retain a compatibility flag, dual resolver, external-cwd opt-in, or fallback path that preserves the obsolete absolute rejection.
- Do not retain a compatibility path for relative cwd; the workspace remains only the omitted-cwd default.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: N/A; cwd is transient invocation/process state.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: N/A.
- Required semantics and invariants under direct use: No persisted subject is affected.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Built package/runtime freshness matters; no data migration.
- Decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected`.
- Decision rationale: the change affects only process launch cwd and returned transient metadata. It introduces no durable schema or storage transformation.
- Acceptance criteria or design constraints supported: REQ-008–REQ-010; AC-007–AC-010.

### Migration Plan (Only When Decision Is `Migration Required`)

N/A — persisted data is not affected.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003, BEH-004, BEH-005 | Agent tool invocation | `TerminalResult` returned to the agent loop | `resolveExecutionCwd` for cwd policy and pre-spawn accessibility; `ShellCommandExecutor` for foreground lifecycle | Shows the real external command path, fail-fast validation, and where cwd policy changes. |
| DS-002 | Primary End-to-End | BEH-002, BEH-003, BEH-005 | Agent tool invocation | `BackgroundProcessInfo` returned and managed by PID | `resolveExecutionCwd` for cwd policy and pre-spawn accessibility; `BackgroundProcessManager` for process lifecycle | Shows external background startup, fail-fast validation, and effective cwd retention. |
| DS-003 | Return-Event | BEH-001, BEH-004, BEH-005 | Shell output/process exit | Tool result, `effectiveCwd`, and background-process metadata | `ShellCommandExecutor` / `BackgroundProcessManager` | Ensures the target cwd remains truthful in returned results and does not become persistent state; rejected preflight has no result/PID side effect. |
| DS-004 | Bounded Local | BEH-002, BEH-005 | Background process record | Status/output/stop result | `BackgroundProcessManager` | Cwd is stored as process identity metadata while lifecycle operations remain PID-owned. |

## Primary Execution Spine(s)

### DS-001 — Foreground command

`Agent tool invocation -> runBash tool boundary -> resolveExecutionCwd (resolve/type/access preflight) -> ShellCommandExecutor -> NonInteractiveShellResolver -> POSIX/WSL shell process -> TerminalResult`

### DS-002 — Managed background command

`Agent tool invocation -> startBackgroundProcess tool boundary -> resolveExecutionCwd (resolve/type/access preflight) -> BackgroundProcessManager -> NonInteractiveShellResolver -> POSIX/WSL shell process -> BackgroundProcessInfo / managed PID lifecycle`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tool boundary receives a command and optional cwd. The terminal cwd owner selects the omitted default or rejects a provided relative value; for an absolute value it validates physical directory/access state and passes one normalized path to the foreground executor. An invalid target is rejected before execution. The executor selects the platform shell, runs the command, captures output, and returns the existing result shape with truthful `effectiveCwd`. | `runBash`, `resolveExecutionCwd`, `ShellCommandExecutor`, `NonInteractiveShellResolver` | `resolveExecutionCwd` governs cwd semantics, validation, access error mapping, and the host/WSL handoff; `ShellCommandExecutor` governs execution lifecycle. | Tool schema, prompt/docs wording, timeout/abort, result serialization, focused relative no-spawn tests. |
| DS-002 | The background tool uses the same cwd owner and passes the normalized, host-validated absolute path to the background manager. An inaccessible or provided-relative target is rejected before the manager can create a PID record. The manager starts the shell, resolves process identity, records the command and effective cwd, and exposes the existing PID-based output/status/stop behavior. | `startBackgroundProcess`, `resolveExecutionCwd`, `BackgroundProcessManager`, `NonInteractiveShellResolver` | `resolveExecutionCwd` governs cwd semantics, validation, access error mapping, and the host/WSL handoff; `BackgroundProcessManager` governs process records and lifecycle. | Tool schema, PID identity, output buffer, status refresh, stop behavior, focused no-spawn tests. |
| DS-003 | Shell output and process completion move back through the existing executor/manager result paths. The cwd is returned as metadata but never written into agent or workspace state. | `ShellCommandExecutor`, `BackgroundProcessManager`, `TerminalResult`, `BackgroundProcessInfo` | Existing execution/lifecycle owners. | Result JSON serialization and event/tool trace projections remain unchanged. |
| DS-004 | A background record retains the normalized cwd while status, output, and stop operations address the record by PID. External cwd support does not create a cwd-based process lookup or new lifecycle state. | `BackgroundProcessManager`, `BackgroundProcessRecord` | `BackgroundProcessManager`. | Process-group observation and platform-specific identity handling. |

## Spine Actors / Main-Line Nodes

- `runBash` — thin functional tool boundary for foreground commands.
- `startBackgroundProcess` — thin functional tool boundary for managed background commands.
- `resolveExecutionCwd` — authoritative cwd policy owner.
- `ShellCommandExecutor` — foreground process and output lifecycle owner.
- `BackgroundProcessManager` — background process identity, output, status, and stop owner.
- `NonInteractiveShellResolver` — platform shell adapter; it does not own cwd authorization.
- `TerminalResult` / `BackgroundProcessInfo` — existing result contracts carrying effective cwd.

## Ownership Map

| Main-line node | Ownership |
| --- | --- |
| `runBash` | Accepts the functional tool arguments and delegates; it must not resolve policy independently or mutate agent state. |
| `startBackgroundProcess` | Accepts the functional tool arguments and delegates; it must not own background lifecycle or duplicate cwd rules. |
| `resolveExecutionCwd` | Owns omitted-cwd defaults, provided-value absolute-path validation, physical normalization, directory/access preflight, host/WSL boundary ordering, and actionable working-directory errors. |
| `ShellCommandExecutor` | Owns foreground shell spawn, timeout/abort, output capture, process-group cleanup, ordinary background adoption, and `TerminalResult`. |
| `BackgroundProcessManager` | Owns detached background spawn, PID/process-group identity, output buffering, status refresh, stop, and `BackgroundProcessInfo`. |
| `NonInteractiveShellResolver` | Owns platform shell selection and Windows WSL cwd conversion after the cwd owner supplies a host-validated normalized directory; it does not re-authorize cwd. |
| `TerminalResult` / `BackgroundProcessInfo` | Own result fields and serialization; no new cwd policy is introduced here. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `runBash` / registered `run_bash` | `resolveExecutionCwd` then `ShellCommandExecutor` | LLM-facing functional tool surface and argument binding. | Workspace policy, shell selection, process lifecycle, persistent cwd. |
| `startBackgroundProcess` / registered `start_background_process` | `resolveExecutionCwd` then `BackgroundProcessManager` | LLM-facing functional tool surface and argument binding. | Workspace policy, PID registry, output/status/stop lifecycle, persistent cwd. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Absolute-cwd branch that requires workspace containment in `execution-cwd.ts` | External project/worktree cwd is approved behavior. | Direct absolute resolution inside `resolveExecutionCwd`. | In This Change | No provided relative path is accepted. |
| Relative resolution and lexical/physical containment branches in `execution-cwd.ts` | The new contract rejects every provided relative cwd before resolution. | Absolute-path validation inside `resolveExecutionCwd`. | In This Change | Keep only omitted workspace defaulting and absolute physical/access validation. |
| Unit expectation that external `run_bash` cwd rejects | It asserts the obsolete absolute-cwd contract. | External absolute cwd success and validation tests. | In This Change | Replace, do not retain as compatibility coverage. |
| Integration expectation that external background cwd rejects | It asserts the obsolete background-cwd contract. | External background cwd lifecycle test. | In This Change | Replace with start/query/output/stop coverage. |
| `docs/terminal_tools.md` relative-workspace cwd contract | It contradicts the new absolute-only provided-cwd behavior. | Explicit absolute/default cwd contract and relative rejection guidance. | In This Change | Keep interactive terminal distinction. |
| Any new sandbox or root-registration abstraction | Not needed for this approved cwd behavior. | Existing terminal cwd owner and existing process owners. | Follow-up / Rejected | Sandbox is a separate ticket. |

## Return Or Event Spine(s) (If Applicable)

`Shell stdout/stderr and exit -> ShellCommandExecutor -> TerminalResult -> tool result consumer`

`Background process output/status/exit -> BackgroundProcessManager -> BackgroundProcessInfo / BackgroundProcessOutput -> PID tool result consumer`

The return paths preserve the normalized `effectiveCwd` as metadata. No event path writes cwd into agent configuration, workspace identity, or later invocation defaults.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `BackgroundProcessManager`.
- Short arrow chain: `startCommand -> shell/process identity resolution -> BackgroundProcessRecord -> status refresh/output read/stop -> record removal or status result`.
- Why it matters: external cwd must be retained as process metadata while PID-based lifecycle behavior remains unchanged. The design must not introduce cwd-based lookup, a second process registry, or a new background state machine.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| LLM-facing parameter schemas/descriptions | DS-001, DS-002 | `runBash` / `startBackgroundProcess` | Expose the concise cwd field descriptions while tool-level wording explains absolute-only provided values, defaults, and per-call scope. | Models need an accurate contract to choose worktree roots correctly. | Schema wording would become a hidden policy authority or drift from the resolver. |
| `docs/terminal_tools.md` | DS-001, DS-002, DS-003 | Terminal subsystem maintainers | Durable human/operator contract and test guidance. | Prevents the old workspace-contained claim from returning. | Documentation would obscure rather than explain the production owner if it encoded a second policy. |
| `docs/tool_schema_and_configuration.md` terminal cwd cross-reference | DS-001, DS-002 | Tool-schema/documentation maintainers | Keep the long-lived terminal cwd statement aligned with the absolute-only provided-value contract and unchanged omitted defaults. Only the terminal cross-reference changes; generic file-tool `path`/`base_dir`/`edit_file` behavior remains unchanged. | This file is a durable cross-reference used to explain tool configuration and can otherwise reintroduce the stale relative contract. | Editing its generic file-tool section would create unrelated policy drift. |
| `NonInteractiveShellResolver` | DS-001, DS-002 | `ShellCommandExecutor` / `BackgroundProcessManager` | POSIX/WSL shell selection and path conversion after host cwd preflight. | Platform-specific execution adapter. | If it validates workspace or access policy independently, cwd ownership becomes fragmented across platform branches. |
| Result serialization | DS-001, DS-002, DS-003 | `TerminalResult` / `BackgroundProcessInfo` | Emit existing effective cwd and process metadata shape. | Allows callers to verify where commands ran. | New location fields or policy branches would create unnecessary contract drift. |
| Focused unit/integration tests | DS-001–DS-004 | All affected owners | Protect external absolute, relative rejection, default, validation, and lifecycle behavior. | Makes the boundary change durable. | Tests that only assert resolver internals would miss real shell/background behavior. |

## Ownership Boundaries

The authoritative boundary is `resolveExecutionCwd` for terminal cwd semantics. Both cwd-bearing tools call it and then depend on exactly one downstream execution owner each. Neither tool may bypass it by resolving paths independently, and downstream shell/process components must not reintroduce workspace policy.

`workspaceRootPath` remains context data used by the cwd owner for the omitted-cwd default only. It is not passed to `ShellCommandExecutor` or `BackgroundProcessManager` as an authorization or relative-path policy. The normalized directory returned by the cwd owner is the only cwd value those process owners consume.

`NonInteractiveShellResolver` is an internal platform adapter behind the execution owners. It may translate a normalized Windows path to WSL, but it must not become a second cwd authorization boundary.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `resolveExecutionCwd(context, cwd)` | omitted default, provided-value absolute validation, physical normalization, directory/access preflight, host error mapping | `runBash`, `startBackgroundProcess` | Tool calls joining paths themselves; executor/manager checking workspace or access directly; platform resolver applying a different policy. | Strengthen this resolver's absolute-only/access contract, not add caller-side exceptions. |
| `ShellCommandExecutor.execute(command, resolvedCwd, options)` | foreground spawn, timeout/abort, output and result lifecycle | `runBash` after cwd resolution | `runBash` spawning directly or managing output itself. | Extend executor options only for execution concerns, never cwd policy. |
| `BackgroundProcessManager.startCommand(command, resolvedCwd)` | detached spawn, PID/process-group record, output/status/stop lifecycle | `startBackgroundProcess` after cwd resolution | Tool creating its own background registry or process record. | Extend manager lifecycle API only when the lifecycle requirement is approved. |

## Dependency Rules

- `runBash` and `startBackgroundProcess` may depend on `resolveExecutionCwd` and their respective existing process owner.
- `resolveExecutionCwd` may depend on Node path/filesystem APIs and `AgentContextLike`; it must not depend on shell executor or process manager.
- `ShellCommandExecutor` and `BackgroundProcessManager` may depend on `NonInteractiveShellResolver` and process observers; they must consume an already-resolved cwd.
- `NonInteractiveShellResolver` must remain platform execution infrastructure and must not read `workspaceRootPath` or duplicate authorization.
- File-tool, multimedia, web, MCP, server interactive-terminal, and provider runtime path policies must not be imported into this resolver.
- No tool may mutate process-wide cwd, `workspaceRootPath`, or a persistent terminal session as a side effect of an explicit cwd.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `runBash(context, command, cwd?, timeoutSeconds?, executionOptions?)` | Foreground terminal invocation | Resolve one cwd and execute one stateless command. | `command` + optional cwd + optional timeout/options. | Public functional tool implementation; absolute cwd may be external. |
| `startBackgroundProcess(context, command, cwd?)` | Managed background terminal invocation | Resolve one cwd and create one PID-owned process record. | `command` + optional cwd. | Public functional tool implementation; absolute cwd may be external. |
| `resolveExecutionCwd(context, cwd?)` | Terminal cwd target | Apply omitted default or absolute-only provided-cwd validation, physical directory/access preflight, and working-directory error mapping. | `AgentContextLike` + optional cwd string/null. | One canonical cwd policy boundary for both tools; host validation completes before platform conversion. |
| `ShellCommandExecutor.execute(command, resolvedCwd, options?)` | Foreground process execution | Execute command and return `TerminalResult`. | Command + normalized directory + execution options. | No workspace identity or authorization input. |
| `BackgroundProcessManager.startCommand(command, resolvedCwd)` | Background process lifecycle | Spawn and register one process. | Command + normalized directory. | PID is the lifecycle identity; cwd is metadata. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `runBash(...)` | Yes | Yes | Low | Keep thin and delegate. |
| `startBackgroundProcess(...)` | Yes | Yes | Low | Keep thin and delegate. |
| `resolveExecutionCwd(...)` | Yes | Yes | Low | Make absolute-vs-relative policy explicit in one owner. |
| `ShellCommandExecutor.execute(...)` | Yes | Yes | Low | Do not add workspace policy. |
| `BackgroundProcessManager.startCommand(...)` | Yes | Yes | Low | Keep PID lifecycle ownership. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Foreground tool | `runBash` / `run_bash` | Yes | Low | Keep existing names. |
| Background tool | `startBackgroundProcess` / `start_background_process` | Yes | Low | Keep existing names. |
| Cwd policy owner | `resolveExecutionCwd` | Yes | Low | Retain existing name; update semantics/documentation. |
| Foreground process owner | `ShellCommandExecutor` | Yes | Low | Keep existing owner. |
| Background lifecycle owner | `BackgroundProcessManager` | Yes | Low | Keep existing owner. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Explicit cwd resolution and host preflight | Terminal subsystem `execution-cwd.ts` | Extend | It already owns both affected entrypoints and all current validation/default behavior; the missing accessibility invariant belongs at the same boundary. | N/A |
| Foreground shell execution | Terminal command execution subsystem | Reuse | `ShellCommandExecutor` already accepts a resolved cwd. | N/A |
| Background process lifecycle | Terminal background-process subsystem | Reuse | `BackgroundProcessManager` already records effective cwd and owns PID lifecycle. | N/A |
| LLM contract wording | Existing terminal tool schemas and terminal docs | Extend | Existing files are the canonical tool/documentation surfaces. | N/A |
| Sandbox/security isolation | None in this task | Do not create | Explicitly deferred to a separate ticket with cross-category scope. | Future ticket must establish its own owner and threat model. |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent terminal tools | LLM-facing tool contracts and argument binding | DS-001, DS-002 | `runBash`, `startBackgroundProcess` | Extend | Update cwd descriptions only. |
| Terminal cwd resolution | Omitted defaults, absolute-only provided-value validation, physical normalization, host directory/access validation, and error mapping | DS-001–DS-004 | `resolveExecutionCwd` | Extend | Absolute external paths bypass workspace containment; provided relative paths fail before resolution; all unusable candidates fail before spawn. |
| Terminal command execution | Shell selection, foreground lifecycle, output, timeout | DS-001, DS-003 | `ShellCommandExecutor`, `NonInteractiveShellResolver` | Reuse | No process lifecycle changes. |
| Terminal background processes | Detached start, PID identity, output, status, stop | DS-002–DS-004 | `BackgroundProcessManager` | Reuse | No new cwd-based registry. |
| Terminal documentation/tests | Contract evidence and durable guidance | DS-001–DS-004 | Terminal subsystem | Extend | Replace stale rejection/containment claims in both terminal documentation surfaces and add a consistency check; preserve generic file-tool guidance. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Terminal cwd resolution | `resolveExecutionCwd` | Absolute-only provided/default resolution, physical normalization, directory/access preflight, and validation error mapping | One file already owns this policy for both tools; keeping the reset invariant here avoids caller and platform drift. | Existing physical resolution and validation helpers plus Node fs access primitive; relative containment helpers become removable. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Agent terminal tools | `runBash` / registered tool | Foreground cwd schema and description | Tool contract belongs with its implementation. | Existing `ParameterSchema`. |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | Agent terminal tools | `startBackgroundProcess` / registered tool | Background cwd schema and description | Tool contract belongs with its implementation. | Existing `ParameterSchema`. |
| `autobyteus-ts/docs/terminal_tools.md` | Terminal documentation | Terminal subsystem | Durable cwd policy and distinction from interactive terminal. | Existing canonical terminal guide. | Existing result/test documentation. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Tool-schema/configuration documentation | Documentation contract boundary | Terminal cwd cross-reference only: absolute-only provided values and unchanged omitted defaults. | Existing long-lived cross-reference; it must be named so implementation does not leave a contradictory contract behind. | Generic file-tool `path`/`base_dir`/`edit_file` behavior, unrelated schema guidance, or a second terminal implementation policy. |
| `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` | Terminal tests | Resolver/foreground behavior | External absolute, no-workspace absolute, relative rejection/no-spawn, defaults, validation. | Existing unit coverage for resolver through `runBash`. | Existing temp-directory helpers. |
| `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` | Terminal tests | Foreground/background tool lifecycle | External background cwd start/query/output/stop and boundary regression. | Existing integration surface covers both registered tools. | Existing temp-dir/process lifecycle helpers. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| cwd resolution policy | Existing `execution-cwd.ts` | Terminal cwd resolution | Both cwd-bearing tools already share it. | Yes; no new context fields. | Yes; one policy remains. | A generic filesystem authorization service or sandbox abstraction. |
| cwd tool schema wording | Existing two tool files | Agent terminal tools | Each schema is serialized from its own tool definition; wording must be aligned without inventing a generic tool boundary. | Yes | Yes; same semantics, tool-specific descriptions. | A second runtime policy hidden only in prose. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentContextLike.workspaceRootPath` | Yes | Yes | Low | Retain as omitted-cwd default only; do not reinterpret it as a provided-cwd anchor or external cwd authority. |
| `TerminalResult.effectiveCwd` | Yes | Yes | Low | Keep as normalized cwd used for foreground execution. |
| `BackgroundProcessInfo.effectiveCwd` | Yes | Yes | Low | Keep as normalized cwd used for process start. |
| `cwd` tool parameter | Yes | Yes | Low | Apply identical absolute-only provided/default semantics in both tools. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Terminal cwd resolution | `resolveExecutionCwd` | Canonical cwd resolution: absolute external, provided-relative rejection, omitted default, physical normalization, host access preflight, and working-directory error mapping. | Existing authoritative owner; no split required. | Existing physical/validation helpers plus Node filesystem access primitive. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Agent terminal tools | `runBash` | Foreground schema/description and delegation. | Existing tool boundary. | `ParameterSchema`, `TerminalResult`. |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | Agent terminal tools | `startBackgroundProcess` | Background schema/description and delegation. | Existing tool boundary. | `ParameterSchema`, `BackgroundProcessInfo`. |
| `autobyteus-ts/docs/terminal_tools.md` | Terminal documentation | Terminal subsystem | External absolute cwd contract, omitted defaults, relative rejection, and interactive distinction. | Existing canonical guide. | Existing architecture/testing descriptions. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Tool-schema/configuration documentation | Documentation contract boundary | Update only the terminal cwd cross-reference: any provided cwd must be absolute, existing accessible external directories are supported, and omitted cwd retains the documented workspace/temp default; preserve generic file-tool `path`/`base_dir`/`edit_file` behavior. | Long-lived cross-reference is part of the durable contract even though the file is not terminal-owned. | Generic file-tool semantics, unrelated schema guidance, or duplicate runtime policy. |
| `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` | Terminal tests | Resolver/foreground behavior | Unit-level external and preserved boundary cases. | Existing focused test file. | Temp filesystem helpers. |
| `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` | Terminal tests | Foreground/background lifecycle | Real tool registration and process lifecycle behavior. | Existing focused integration file. | Temp process helpers. |

## Applied Patterns (If Any)

- Existing terminal-specific resolver pattern: retain one owner for cwd defaults, absolute-only validation, normalization, accessibility preflight, and validation.
- Existing non-interactive shell adapter pattern: pass one host-validated cwd into platform-specific shell selection without duplicating authorization.
- Existing PID-owned background-process pattern: store effective cwd as metadata while lifecycle identity remains PID-based.
- Existing schema-plus-documentation contract pattern: update both serialized tool descriptions and durable terminal docs together.

## Target Subsystem / Folder / File Mapping

No new folder or module is required. The existing terminal subsystem already reflects the target structural depth.

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/` | Folder | Terminal capability area | Agent terminal tools, cwd resolution, shell adapters, process lifecycle | Existing subsystem groups the complete terminal execution capability. | File-tool authorization, sandbox implementation, unrelated web/MCP policy, duplicate cwd validation. |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | File | `resolveExecutionCwd` | Canonical cwd/default/absolute-only policy, physical directory/access preflight, and working-directory error mapping. | It already owns this concern for both tools; the reset invariant remains at the same boundary. | Shell spawning, PID lifecycle, persistent agent state, WSL authorization. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | File | `runBash` | Foreground tool boundary and schema. | Existing LLM-facing entrypoint. | Direct path policy or process lifecycle. |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | File | `startBackgroundProcess` | Background tool boundary and schema. | Existing LLM-facing entrypoint. | Direct path policy or process registry. |
| `autobyteus-ts/docs/terminal_tools.md` | File | Terminal documentation | Public contract and testing guidance. | Existing terminal docs location. | A second implementation policy. |
| `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` | File | Terminal unit tests | Resolver/foreground regression matrix. | Existing focused unit location. | Broad cross-category security claims. |
| `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` | File | Terminal integration tests | Registered-tool/process lifecycle matrix. | Existing focused integration location. | Unrelated backend integration. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/` | Mixed Justified | Yes | Low | Existing terminal folder intentionally contains tool boundaries, shell adapters, sessions, and process lifecycle; this ticket changes one existing policy file and does not justify restructuring. |
| `autobyteus-ts/src/tools/terminal/tools/` | Transport/tool boundary | Yes | Low | LLM-facing tool wrappers are separated from execution owners. |
| `autobyteus-ts/src/tools/terminal/command-execution/` | Main-line execution adapter | Yes | Low | Platform shell and process-group concerns remain behind executor/manager owners. |
| `autobyteus-ts/tests/unit/tools/terminal/` and `tests/integration/tools/terminal/` | Off-spine verification | Yes | Low | Focused tests mirror existing subsystem structure. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| External worktree foreground command | `run_bash(cwd=/Users/me/worktrees/project-a, command="git status") -> resolve absolute directly -> spawn there` | Reject because `/Users/me/worktrees/project-a` is outside `workspaceRootPath` | This is the primary approved use case. |
| Relative cwd | `run_bash(cwd="packages/api") -> reject before workspace resolution` | `run_bash(cwd="packages/api")` silently resolves under the workspace | The absolute-only contract removes ambiguity and makes no-spawn behavior deterministic. |
| No workspace | `run_bash(cwd=/tmp/project, command="pwd")` succeeds; `cwd=relative/path` fails clearly | Resolve relative cwd from server process cwd or workspace root | Avoids hidden dependence on how the server was launched and keeps workspace only as the omitted default. |
| Boundary ownership | `tool -> resolveExecutionCwd -> executor/manager` | Tool joins paths and executor applies a different workspace rule | Keeps one authoritative cwd policy and prevents drift. |
| Sandbox scope | No sandbox code in this ticket | Add a sandbox backend only to `run_bash` and imply all tools are protected | Tool categories are not security boundaries; sandbox belongs in a separate cross-category design. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep external cwd rejection behind a feature flag | Could preserve old behavior for callers. | Rejected | Make the approved absolute-cwd behavior canonical; remove the stale rejection test. |
| Add a separate `run_bash_external` tool | Could avoid changing existing semantics. | Rejected | Keep one `run_bash` contract with optional cwd and absolute-only provided values. |
| Allow external only for `run_bash`, not background processes | Smaller first patch. | Rejected | Both cwd-bearing tools share the same resolver and must remain symmetric. |
| Treat `cwd` as a persistent workspace switch | Could make repeated worktree commands shorter. | Rejected | Keep cwd per invocation/process; require the model to provide it explicitly. |
| Reuse generic file-tool authorization or add a sandbox backend | Could appear to centralize security. | Rejected / Follow-up | Keep terminal cwd policy terminal-owned; defer sandbox to a separate cross-category ticket. |
| Retain workspace containment for absolute paths or add a relative compatibility exception | Could hide the behavior change. | Rejected | Remove the absolute containment branch and relative-resolution branch from the canonical resolver and align docs/schema. |

## Post-Review Contract Reset

The initial architecture, implementation, API/E2E, and delivery package approved
external absolute cwd plus workspace-relative cwd. The user subsequently
superseded only the provided-relative portion of that contract: `cwd` remains
optional, but every provided value must be absolute. This is an upstream
requirement/design change, not a local schema-wording edit.

The reset preserves external absolute directories, omitted workspace/tmp
defaults, resolver-owned physical/access validation, host-before-WSL ordering,
process lifecycle behavior, and sandbox deferral. It removes relative
workspace anchoring and containment from the target design, requires the
absolute-path rejection/no-spawn behavior, and requires these exact serialized
field descriptions:

- `run_bash.cwd`: `Optional working directory for the command.`
- `start_background_process.cwd`: `Optional working directory for the process.`

Because the reset changes approved behavior after implementation and code
review, architecture and implementation review must rerun before API/E2E and
delivery work continues.

## Derived Layering (If Useful)

The existing layers are sufficient:

```text
LLM-facing tool boundary
  -> terminal cwd policy boundary
  -> foreground/background process owner
  -> platform shell adapter
  -> OS process
```

This is explanatory only. The design does not add a new sandbox or authorization layer.

## Change / Refactor Sequence

1. Reset the requirements and supplement to record the user-approved absolute-only provided-cwd contract, concise field descriptions, and sandbox deferral; append the next solution revision entry.
2. Change `resolveExecutionCwd` so omitted cwd behavior remains unchanged; an absolute provided cwd resolves directly without workspace containment; a relative provided cwd fails before workspace joining, physical resolution, or process creation.
3. Preserve physical normalization and directory validation, then retain resolver-owned host accessibility preflight. Map access failures for existing directories to the working-directory validation path before either process owner is called; symlinked external project/worktree roots still report the actual effective directory.
4. Update the `run_bash.cwd` field description to exactly `Optional working directory for the command.` and the `start_background_process.cwd` field description to exactly `Optional working directory for the process.`; align tool-level descriptions with the absolute-only/default/per-call semantics.
5. Replace relative-success/containment unit and integration expectations with relative-rejection/no-spawn coverage, retain external absolute success and validation coverage, and preserve the background lifecycle case that starts, queries, reads output from, and stops an external-cwd process.
6. Update `autobyteus-ts/docs/terminal_tools.md` and only the terminal cwd cross-reference in `autobyteus-ts/docs/tool_schema_and_configuration.md`; state that any provided cwd must be absolute, existing accessible external directories are supported, and omitted cwd retains the documented workspace/temp default. Retain the agent/interactive distinction and preserve generic file-tool `path`/`base_dir`/`edit_file` behavior.
7. Run focused unit/integration terminal checks, package typecheck/build, and downstream runtime/package validation after dependencies are provisioned. Include a docs consistency check that compares both documentation surfaces with the serialized schemas and verifies the generic file-tool contract was not changed.
8. Remove obsolete absolute-rejection expectations and verify no file, multimedia, web, MCP, provider, or sandbox source changed.

No temporary compatibility seam is required. The final state has one canonical resolver and one behavior contract.

## Key Tradeoffs

- **Usability:** external worktrees and sibling projects can be addressed directly through `cwd`.
- **Consistency:** foreground and background tools share identical cwd semantics.
- **Input determinism:** rejecting provided relative paths avoids ambiguity about whether the workspace or process cwd should anchor them; omitted cwd remains deterministic through the existing workspace/tmp default.
- **Security posture:** this is not a sandbox. It makes explicit a trusted-local terminal capability that shell command text already largely possesses.
- **Implementation size:** the change stays local to the existing owner and contracts, avoiding a premature sandbox abstraction.

## Risks

- A model can still run commands outside the workspace through shell text; external cwd support should not be advertised as a security boundary.
- External cwd makes it easier to operate on the wrong checkout; accurate schema wording and `effectiveCwd` reporting mitigate confusion.
- Windows/WSL path conversion and host accessibility/error mapping must be validated separately: host preflight precedes conversion, while WSL translation and runtime availability remain adapter behavior.
- Preflight accessibility is inherently subject to TOCTOU changes and cannot guarantee that a later spawn will succeed; later WSL or OS failures remain possible execution errors, not evidence that a sandbox exists.
- Built `autobyteus-ts/dist` and packaged runtime artifacts can remain stale if only source tests run.
- Any future requirement to protect application data or untrusted code requires a separate sandbox/security design covering all relevant tool categories.

## Guidance For Implementation

- Keep `resolveExecutionCwd` as the sole cwd policy owner for both affected tools.
- Distinguish omitted/null input from provided input. For provided input, require `path.isAbsolute` before any workspace joining or physical resolution; do not use the workspace as a relative-path anchor.
- For absolute input, normalize and validate the target directory; allow external roots and valid symlink targets.
- After physical directory validation, perform host cwd accessibility preflight in the resolver. Map `EACCES`/`EPERM` and equivalent access failures for existing directories to `Working directory '<path>' is not accessible.` using the existing working-directory validation error family.
- Ensure absolute-path and accessibility preflight completes before `ShellCommandExecutor.execute` or `BackgroundProcessManager.startCommand`; test relative rejection and inaccessible absolute paths for both tools with no-spawn assertions.
- Preserve `os.tmpdir()` fallback when cwd is omitted and no workspace exists.
- Use an actionable absolute-path error for any provided relative cwd; do not use workspace or process cwd as a hidden anchor.
- Do not change `ShellCommandExecutor`, `BackgroundProcessManager`, result types, or process identity. `NonInteractiveShellResolver` may continue translating an already host-validated Windows path to WSL, but must not become a second cwd policy owner.
- Keep schemas and docs synchronized with implementation. Use the exact concise cwd field descriptions requested for each tool; state that provided cwd must be absolute, can target an external project/worktree, and does not change workspace identity or persist.
- Treat `autobyteus-ts/docs/tool_schema_and_configuration.md` as a long-lived contract cross-reference: update only its terminal cwd statement and verify it agrees with `docs/terminal_tools.md` and serialized schemas. Do not alter its generic file-tool `path`/`base_dir`/`edit_file` behavior.
- Do not implement sandboxing, cross-category authorization, command allowlists, or application-data deny rules in this change.
