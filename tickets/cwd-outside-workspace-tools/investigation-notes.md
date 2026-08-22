# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete. A dedicated clean ticket worktree was created from refreshed `origin/personal` before deeper investigation.
- Current Status: Architecture review Round 1 returned one blocking Design Impact (`ARCH-DI-001`). Requirements remain Design-ready; the design, evidence, and supplement now define resolver-owned inaccessible-cwd preflight/error mapping and no-spawn coverage and are ready for re-review.
- Investigation Goal: Determine why explicit terminal `cwd` values outside the configured workspace fail in `autobyteus-ts`, enumerate affected production paths, establish whether the issue is local or cross-cutting, and define a safe, testable target contract.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`.
- Scope Classification Rationale: Two agent-facing tools and one resolver are localized, but the change alters a filesystem-related policy boundary and must preserve relative/default behavior, process metadata, platform handling, and unrelated path policies.
- Scope Summary: Design external absolute cwd support for non-interactive `run_bash` and `start_background_process`; sandbox and cross-category security work are separate.
- Primary Questions To Resolve:
  1. Which current tools actually enforce workspace-contained cwd?
  2. What default and relative-path semantics must remain?
  3. Is the workspace check a real security boundary or only a cwd usability restriction?
  4. What other terminal/runtime boundaries must not be widened?
  5. What security and sandbox work must remain explicitly outside this ticket?

## Request Context

The user reports that `run_bash` and other basic tools accept `cwd` parameters but reject cwd values outside the current workspace, calling this a major limitation. The investigation focuses on the actual `autobyteus-ts` agent-facing tools rather than assuming every repository occurrence of the field named `cwd` has the same policy.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` super-repository containing `autobyteus-ts` as a regular directory (no `.gitmodules`).
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools`.
- Current Branch: `codex/cwd-outside-workspace-tools`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools`.
- Bootstrap Base Branch: `origin/personal` at `8ef282ba77705180d985e7000d801f0e0068cdc1` after refresh.
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-08-22; remote HEAD resolves to `origin/personal`.
- Task Branch: `codex/cwd-outside-workspace-tools`.
- Expected Base Branch (if known): `personal` / `origin/personal`.
- Expected Finalization Target (if known): `personal`, subject to downstream delivery workflow.
- Bootstrap Blockers: None for investigation. `autobyteus-ts/node_modules` is absent in the clean worktree, so package test/build execution is deferred until a downstream execution stage provisions dependencies.
- Notes For Downstream Agents: Requirements are Design-ready. Sandbox implementation is explicitly out of scope. Relative cwd remains workspace-anchored and traversal-contained; only explicit absolute cwd may leave the workspace.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/terminal-cwd-policy.md` | Operation matrix, anchoring/default rules, invariants, trusted-local posture, and non-goals for agent terminal cwd | Intended target semantics and explicit policy boundary | Requirements, later design spec | REQ-001–REQ-010; AC-001–AC-010 | User-approved | Intended behavior; architecture approval required | No upstream approval follow-up; architecture review may assess implementation shape. |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-22 | Command | `git status --short --branch; git remote -v; git ls-remote --symref origin HEAD; git fetch origin --prune` | Resolve repository mode, base, and clean task isolation | Super-repo is on `personal`; remote HEAD is `personal`; dedicated branch/worktree created from refreshed `origin/personal`. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Identify cwd owner and exact restriction | Explicit cwd requires `workspaceRootPath`, resolves relative input beneath it, applies lexical and physical containment, then validates directory. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Trace foreground tool entrypoint and schema | `runBash` calls `resolveExecutionCwd`; schema says absolute paths are allowed but does not say they must remain inside the workspace. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | Trace background tool entrypoint and schema | `startBackgroundProcess` calls the same resolver before `BackgroundProcessManager.startCommand`; it has the same external-cwd failure. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/register-tools.ts` | Enumerate agent-facing tools | The only registered agent-facing tools with a `cwd` parameter are `run_bash` and `start_background_process`; background query/stop tools use PID, not cwd. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts` | Verify platform execution boundary | Resolved cwd is passed to POSIX shell spawn or converted for Windows WSL; no second workspace containment check exists there. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` and `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | Verify result/lifecycle implications | Both preserve the resolved cwd as `effectiveCwd`; background records and adopted descendants inherit the invocation cwd. | No |
| 2026-08-22 | Code/Test | `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` and `autobyteus-ts/tests/integration/tools/terminal/terminal-tools.test.ts` | Confirm current contract is durable | Unit test explicitly expects external run_bash cwd rejection; integration test explicitly expects external start-background cwd rejection. | Update after approval/implementation. |
| 2026-08-22 | Doc | `autobyteus-ts/docs/terminal_tools.md` | Check declared product contract | Docs explicitly say terminal cwd remains workspace-contained, while tool descriptions say absolute paths are allowed and server/web terminal docs support external roots. | Update after approval/implementation. |
| 2026-08-22 | Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` and `autobyteus-server-ts/src/workspaces/workspace-path-utils.ts` | Compare interactive terminal boundary | Server/web explicit `cwd`/`rootPath` is canonicalized with `path.resolve`, checked for directory existence, and is not checked against agent workspace containment. | No; preserve as separate boundary. |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/file/workspace-path-utils.ts` and prior `tickets/done/file-tool-authorized-root/*` artifacts | Ensure the issue is not the already-resolved file-tool policy | Generic file tools have a separate trusted-local path resolver and protected-path deny list; terminal cwd no longer imports it. Prior ticket explicitly preserved terminal containment, confirming this is a distinct follow-up. | No |
| 2026-08-22 | History | `git show 4cb3167a2 -- autobyteus-ts/src/tools/terminal/execution-cwd.ts ...` and `git show 240d72207 -- ...` | Establish regression/policy origin | Workspace/physical containment was added to terminal cwd during file/secret authorization work; the current resolver is a deliberate but overly broad cwd boundary for the requested trusted-local workflow. | No |
| 2026-08-22 | Code | `autobyteus-ts/src/tools/mcp/types.ts` and `src/tools/mcp/server/stdio-managed-mcp-server.ts` | Enumerate other cwd fields without conflating them | MCP stdio server config has its own cwd and passes it directly to `spawn`; it is configuration-owned, not an LLM-facing basic terminal tool, and is out of scope. | No |
| 2026-08-22 | Command | `find autobyteus-ts -name node_modules; node --version; pnpm --version` | Assess runtime probe availability | Node `v22.23.1`, pnpm `10.28.2`, but clean worktree has no node_modules; focused Vitest/build could not be run during investigation without provisioning. | Downstream setup. |
| 2026-08-22 | Review | Architecture Review Round 1 (`design-review-report.md`, `ARCH-DI-001`, `MP-001`) | Validate implementation readiness | Approved behavior and architecture pass except the design did not define pre-spawn accessibility validation/error mapping for an existing but inaccessible cwd or no-spawn coverage for both tools. | Revise requirements/design/supplement and re-review. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Agent LLM invokes registered `run_bash` with an explicit `cwd`. | Tool call -> `runBash` -> `resolveExecutionCwd` -> `ShellCommandExecutor` -> `NonInteractiveShellResolver` -> POSIX shell/WSL process -> `TerminalResult`. | External absolute cwd fails before spawn with `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT`; in-workspace cwd runs and returns `effectiveCwd`. | `run-bash.ts`; `execution-cwd.ts`; `shell-command-executor.ts`; unit/integration tests. |
| BEH-002 | Contract | Agent LLM invokes registered `start_background_process` with an explicit `cwd`. | Tool call -> `startBackgroundProcess` -> `resolveExecutionCwd` -> `BackgroundProcessManager.startCommand` -> shell process -> PID-keyed record/result. | External absolute cwd fails before spawn; in-workspace cwd starts and records the resolved cwd for output/status/stop. | `start-background-process.ts`; `background-process-manager.ts`; integration tests. |
| BEH-003 | Contract | Agent LLM invokes either cwd tool with relative cwd and a configured workspace. | Tool call -> resolver joins relative cwd to workspace root -> physical normalization -> shell/background process. | Relative cwd is workspace-root-relative and does not persist. | `execution-cwd.ts`; terminal tool schemas; tests. |
| BEH-004 | Contract | Agent LLM invokes either cwd tool without cwd, with or without a workspace. | Tool call -> resolver chooses workspace root or `os.tmpdir()` -> directory validation -> process. | Omitted cwd defaults are stable; no shell state persists between `run_bash` calls. | `execution-cwd.ts`; terminal unit/integration tests; `docs/terminal_tools.md`. |
| BEH-005 | System | Agent LLM supplies a missing, non-directory, inaccessible, or symlinked cwd to either cwd-bearing tool. | Tool call -> `resolveExecutionCwd` -> physical path/type/access validation -> foreground/background process owner. | Current resolver checks physical path and directory type, but an existing directory whose cwd access is denied can reach the downstream spawn boundary; no explicit access-error mapping or symmetric no-spawn coverage is defined. | `execution-cwd.ts`; `run-bash.ts`; `start-background-process.ts`; current validation tests. |
| BEH-006 | Contract | Agent LLM receives native terminal tool descriptions and native AutoByteus working-environment guidance. | Prompt/schema composition -> model chooses cwd -> tool resolver. | Current docs/schema/prompt are inconsistent: schema says absolute allowed, docs say workspace-contained, prompt says explicit working directory changes only command location. | `run-bash.ts`; `start-background-process.ts`; `autobyteus-ts/docs/terminal_tools.md`; `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`. |
| BEH-007 | Contract | Server/web terminal client supplies `cwd` or `rootPath` to terminal websocket. | Websocket request -> server canonicalizes explicit path -> directory validation -> terminal handler -> selected PTY backend. | Explicit absolute external roots are accepted by this separate interactive path; agent workspace is not used as its containment root. | `autobyteus-server-ts/src/api/websocket/terminal.ts`; server workspace path utility; terminal docs. |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change` / `Bug Fix`.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`.
- Refactor posture evidence summary: the resolver is already terminal-specific and is the single owner for explicit cwd normalization for both affected tools. It should remain that owner; the correction is to separate “workspace default/relative anchor” from “absolute path authorization,” not to add another manager or change the agent context model.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `execution-cwd.ts` | Workspace root is required for all explicit cwd values and is checked lexically and physically. | The default/anchor and authorization responsibilities are conflated. | Remove only the incorrect absolute containment role after approval. |
| `run-bash.ts` and `start-background-process.ts` | Both tools have the same resolver dependency and no independent cwd policy. | A single resolver change gives symmetric behavior; no duplicated policy refactor is needed. | Add symmetric coverage. |
| `ShellCommandExecutor` and `BackgroundProcessManager` | Resolved cwd is passed directly to process spawn and returned as effective metadata. | Downstream execution ownership is healthy; do not change shell/process lifecycle code. | Verify external cwd through existing lifecycle tests. |
| Shell command contract | Command text can include `cd /external && ...` even when initial cwd is workspace-contained. | Current restriction is not a complete filesystem sandbox. | Document trusted-local posture; do not claim a security sandbox. |
| Server interactive terminal | Explicit external roots are already accepted by another terminal boundary. | External local terminal roots are an existing product precedent. | Preserve separate transport boundary. |
| Existing file-tool authorization ticket | Terminal containment was intentionally preserved there as a separate boundary. | This is a follow-up behavior decision, not accidental file-tool coupling. | Preserve separate file and terminal policies; sandbox remains separate. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Resolve/default/validate cwd for agent non-interactive terminal tools | Owns workspace default, relative anchor, absolute path resolution, physical containment, and directory checks; current code does not explicitly preflight cwd accessibility or map access failures. | Retain as authoritative terminal cwd resolver; remove workspace containment for explicit absolute paths, keep anchor/default/validation rules, and add host accessibility preflight/error mapping before spawn. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | LLM-facing foreground command tool and schema | Calls resolver; description currently underspecifies containment. | Update schema text only; keep execution ownership in resolver/executor. |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | LLM-facing background command tool and schema | Calls same resolver; description currently underspecifies containment. | Update schema text only; keep lifecycle ownership in background manager. |
| `autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver.ts` | Select POSIX/WSL shell and translate cwd | No workspace policy. | No behavior change; accept a host-validated normalized external cwd from authoritative resolver and retain WSL translation as an execution adapter. |
| `autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor.ts` | Foreground spawn, output, timeout, adoption | Uses resolved cwd and returns it as effective metadata. | No structural change. |
| `autobyteus-ts/src/tools/terminal/background-process-manager.ts` | Background spawn, PID/output/status/stop | Uses resolved cwd for process and record metadata. | No structural change. |
| `autobyteus-ts/docs/terminal_tools.md` | Durable terminal contract and testing guide | Explicitly states agent cwd remains workspace-contained, contradicting desired workflow and tool text. | Update terminal policy section and examples. |
| `autobyteus-server-ts/src/api/websocket/terminal.ts` | Interactive websocket cwd/rootPath resolution | Already accepts explicit external absolute roots; separate from agent tool resolver. | Preserve; no mixed-level dependency or shared policy change. |
| `autobyteus-ts/src/tools/file/workspace-path-utils.ts` | Generic file-tool path resolution and protected deny paths | Separate trusted-local file policy; not imported by terminal cwd now. | Preserve unchanged for this scope. |
| `autobyteus-ts/src/tools/mcp/*` | Configuration-owned MCP stdio cwd | Has a different config lifecycle and direct spawn path. | Out of scope; do not conflate with LLM-facing cwd tools. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-22 | Trace | Read `execution-cwd.ts`, `run-bash.ts`, `start-background-process.ts`, `non-interactive-shell-resolver.ts`, `shell-command-executor.ts`, and `background-process-manager.ts` | Explicit cwd is rejected before shell/background spawn; accepted cwd is passed directly to process spawn and preserved in result/process metadata. | The fix can be localized to resolution and schemas; shell/process lifecycle code should not change. |
| 2026-08-22 | Test inspection | Read `tests/unit/tools/terminal/run-bash.test.ts` and `tests/integration/tools/terminal/terminal-tools.test.ts` | Tests explicitly encode external cwd rejection for run_bash and start_background_process. | These are stale expectations under the proposed behavior and require coverage investigation/update downstream. |
| 2026-08-22 | Contract comparison | Read `autobyteus-ts/docs/terminal_tools.md` and server interactive terminal source/docs | Agent docs say workspace-contained; interactive server path accepts external root; source tool descriptions say absolute allowed. | Product contract is inconsistent across terminal surfaces. |
| 2026-08-22 | Shell semantics analysis | Read shell executor and run-bash statelessness test; inspect command handling (no command parser/rewriter) | `run_bash` passes arbitrary command text to `bash -lc`/`sh -c`; command can change directory independently. | Workspace cwd check is not a complete filesystem authorization boundary; trusted-local policy must be named accurately. |
| 2026-08-22 | Setup | `find autobyteus-ts -name node_modules; node --version; pnpm --version` | No dependencies in clean worktree; Node `v22.23.1`, pnpm `10.28.2`. | No runtime tests were run in this investigation; downstream setup is required. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted; the relevant behavior is fully evidenced in the local repository.
- Version / tag / commit / freshness: Local `origin/personal` at `8ef282ba77705180d985e7000d801f0e0068cdc1`.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: No external contract is needed to establish the current local behavior or target gap.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated worktree creation from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: No temporary repository setup created; dedicated worktree is the authoritative task workspace.

## Findings From Code / Docs / Data / Logs

1. **Affected agent-facing surface is narrow.** `registerTools()` registers `run_bash` and `start_background_process` as the only LLM-facing tools with a `cwd` parameter in `autobyteus-ts`. `get_background_processes`, `get_process_output`, and `stop_background_process` use PID identity and are not cwd selectors.
2. **The failure is before execution.** `resolveExecutionCwd` requires a non-empty workspace for any explicit cwd, computes a lexical candidate, rejects lexical escape, resolves physical ancestors, rejects physical escape, then checks the directory. External absolute paths therefore fail before `ShellCommandExecutor` or `BackgroundProcessManager` can spawn anything.
3. **The requested change is not a file-tool widening.** Generic file tools have their own trusted-local resolver and protected-path deny list. `execution-cwd.ts` is terminal-specific in the current source. No file-tool import needs to be removed as part of this follow-up.
4. **Current shell access already crosses the boundary by command text.** Because the shell receives arbitrary command text, a command such as `cd /tmp/external && pwd` runs outside the workspace even when `cwd` is omitted. The current restriction mainly blocks direct cwd semantics, external relative command behavior, and correct effective cwd/process metadata.
5. **Workspace identity should remain stable.** The prompt defines the agent workspace as the run's working environment. An explicit cwd should not cause artifact, relative file, skill, or history paths to silently switch roots. The policy supplement makes this invariant explicit.
6. **No persisted data transition exists.** Cwd is an invocation/process parameter; no stored schema or durable data meaning changes.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: N/A; cwd is transient invocation/process state.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal readers and writers, including unknown/extra-field behavior: N/A.
- Representative direct-read or compatibility evidence: N/A.
- Required semantics and invariants preserved by direct use: `Yes` — no persisted subject is changed.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Built package/runtime freshness matters; no migration or storage operation.
- Concrete benefit, cost, and risk of migration if it remains a candidate: N/A.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- `workspaceRootPath` remains required for relative cwd resolution and the omitted-cwd default when configured; it must not be used as a process-cwd fallback for a relative path when absent.
- `resolveExecutionCwd` must continue to return a directory path suitable for POSIX shell spawn and Windows WSL conversion.
- Existing physical normalization is useful for stable `effectiveCwd` and symlink behavior even after containment checks are removed.
- The current error token `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT` is specifically a workspace containment error. External absolute cwd success should remove its use for explicit absolute terminal paths; whether the error is retained for relative traversal/no-workspace cases must be made actionable and testable rather than silently generalized.
- Tool descriptions, docs, and tests are part of the behavior contract; updating source only would leave the model instructed incorrectly.
- No backward-compatibility wrapper or dual terminal cwd path is needed. Change the canonical resolver cleanly and remove the obsolete external rejection expectation.

## Open Unknowns / Risks

- **User policy decision:** approved external absolute cwd for project/worktree roots and the current two-tool change. No new terminal deny policy or sandbox is included; application-data protection remains a separate security concern.
- **Security semantics:** a cwd-only allow/deny rule does not sandbox arbitrary shell text. Avoid claiming that external cwd support either creates or removes a complete filesystem security boundary.
- **Windows/WSL behavior:** external Windows drive paths should be checked with platform-specific tests; the non-interactive resolver already owns conversion after cwd resolution.
- **Architecture review correction:** an existing but inaccessible cwd is a reachable contract case (`MP-001`). Resolver-owned preflight must verify cwd usability before target process creation, map failure to the working-directory validation class, state the host/Windows-WSL boundary, and have no-spawn coverage for both cwd-bearing tools.
- **No dependency-backed runtime evidence yet:** install/build/test evidence must be produced downstream in the implementation/API-E2E stages.
- **Scope drift risk:** do not widen generic file tools, multimedia, file explorer, MCP, or provider runtime behavior under this ticket.

## Notes For Architecture Reviewer

The requirements basis is user-approved and Design-ready. Architecture Review Round 1 (`ARCH-DI-001`) found one blocking in-scope design gap: the package must define resolver-owned pre-spawn accessibility validation and working-directory error mapping for existing but inaccessible directories, including the host/Windows-WSL boundary, and add no-spawn coverage for both tools. The revised package addresses that without changing the trusted-local behavior or adding sandbox/security machinery.

The recommended design is to retain `execution-cwd.ts` as the single terminal cwd owner, remove workspace containment only for absolute explicit paths, retain workspace anchoring and containment for relative paths, preserve directory/physical normalization, and update the two schemas plus terminal docs.

## User Clarification — Sandbox Is Separate Scope

On 2026-08-22 the user clarified that sandbox implementation should not be included in this cwd investigation/ticket. The `run_bash -> sandbox backend -> Bash process` shape discussed conversationally is future architecture guidance only, not a proposed implementation for the current external-cwd change.

Tool categories are registry metadata, not security boundaries. A future sandbox review must separately inventory `SYSTEM` process launch, `FILE_SYSTEM` direct Node filesystem access, `WEB` network/browser access, `MULTIMEDIA` filesystem/network access, and `MCP` external-server execution. The current ticket remains limited to the explicit cwd behavior of `run_bash` and `start_background_process`, with no sandbox changes.

The user then approved proceeding with the two-tool cwd change: explicit absolute cwd may point to external project/worktree roots; relative cwd remains anchored to and contained by the configured workspace; sandbox work remains a separate ticket.
