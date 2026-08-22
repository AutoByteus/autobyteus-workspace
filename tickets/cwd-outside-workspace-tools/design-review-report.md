# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/terminal-cwd-policy.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cwd-outside-workspace-tools/tickets/cwd-outside-workspace-tools/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Re-review of the revised solution package for Round 1 finding `ARCH-DI-001` / `MP-001`, submitted by `solution_designer`.
- Prior Review Round Reviewed: `ARCH-REV-001` / Round 1
- Latest Authoritative Round: `ARCH-REV-002`
- Current-State Evidence Basis: Static review of the approved package plus current source in `autobyteus-ts` at branch `codex/cwd-outside-workspace-tools`, based on `origin/personal` commit `8ef282ba77705180d985e7000d801f0e0068cdc1`. No dependency-backed runtime or built-artifact evidence was available in either review round; this remains downstream validation work.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: Yes. Explicit absolute cwd may target an existing external local directory for `run_bash` and `start_background_process`; relative cwd remains workspace-root-relative and lexically/physically contained; omitted defaults, statelessness, process lifecycle, and unrelated tool boundaries remain unchanged.
- Relevant existing behavior and evidence confirmed: Yes. Both tools call `resolveExecutionCwd`; the resolver currently applies workspace containment before `ShellCommandExecutor` or `BackgroundProcessManager`; downstream owners consume one resolved cwd and preserve effective-cwd metadata.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): Yes. Sandbox/OS isolation/allowlists/cross-category policy and unrelated path policies are explicitly out of scope.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `N/A` for this passing round; the resolved prior finding `ARCH-DI-001` was traceable to `BEH-005`, `REQ-005`, and `AC-006`.
- Remaining material ambiguity, if any: None for design readiness. Host preflight, error mapping, no-spawn behavior, and the Windows/WSL adapter boundary are now explicit; runtime permission and platform evidence remains downstream.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | Contract | Pass | Pass | Pass | Confirmed | Preserve the foreground path and result/timeout/abort contract. |
| `BEH-002` | Contract | Pass | Pass | Pass | Confirmed | Preserve the background PID, output, status, stop, and effective-cwd path. |
| `BEH-003` | Contract | Pass | Pass | Pass | Confirmed | Keep workspace anchoring plus lexical/physical containment for relative input. |
| `BEH-004` | Contract | Pass | Pass | Pass | Confirmed | Keep omitted workspace/tmp defaults and per-call statelessness. |
| `BEH-005` | System | Pass | Pass | Pass | Confirmed | Resolve, type-check, preflight host cwd access, and map failures before either process owner is invoked; preserve the WSL adapter boundary. |
| `BEH-006` | Contract | Pass | Pass | Pass | Confirmed | Update schemas and terminal docs together. |
| `BEH-007` | Contract | Pass | Pass | Pass | Confirmed | Keep file, multimedia, MCP, provider, file-explorer, and interactive-terminal boundaries unchanged. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- |
| `terminal-cwd-policy.md` | Pass | Pass | Pass | Pass | Pass | None. It is user-approved intended behavior and remains subject to architecture approval. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements and design classify this as a behavior change/bug fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `workspaceRootPath` is used both as default/relative anchor and absolute authorization root in the current terminal resolver. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design retains the existing single terminal cwd owner and does not add a generic security abstraction. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership, spine, file mapping, and change sequence all keep policy in `execution-cwd.ts` and lifecycle in existing owners. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Foreground command | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Managed background command | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Return/event metadata | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-004` | Background local lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The primary spines span the tool boundary, cwd policy owner, execution/lifecycle owner, platform adapter, process, and returned/managed result. They are not limited to the edited resolver fragment.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `resolveExecutionCwd` | Pass | Pass | Pass | Pass | Both cwd-bearing tools use it; executors do not receive workspace policy. |
| `ShellCommandExecutor` | Pass | Pass | Pass | Pass | Owns foreground spawn, timeout/abort, output, and result lifecycle. |
| `BackgroundProcessManager` | Pass | Pass | Pass | Pass | Owns PID-keyed background lifecycle and effective-cwd metadata. |
| `NonInteractiveShellResolver` | Pass | Pass | Pass | Pass | Remains a platform adapter, not a second cwd policy boundary. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool wrappers -> cwd resolver/execution owners | Pass | Pass | Pass | Pass | No tool-local path joins or lifecycle registry. |
| Cwd resolver -> path/fs/context only | Pass | Pass | Pass | Pass | Must not depend on shell/process owners or unrelated path policy. |
| Execution owners -> shell adapter/process observers | Pass | Pass | Pass | Pass | Consume a validated normalized cwd. |
| Unrelated tool/runtime boundaries | Pass | Pass | Pass | Pass | No imports or policy widening are planned. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `runBash(context, command, cwd?, timeoutSeconds?, executionOptions?)` | Pass | Pass | Pass | Low | Pass |
| `startBackgroundProcess(context, command, cwd?)` | Pass | Pass | Pass | Low | Pass |
| `resolveExecutionCwd(context, cwd?)` | Pass | Pass | Pass | Low | Pass |
| `ShellCommandExecutor.execute(command, resolvedCwd, options?)` | Pass | Pass | Pass | Low | Pass |
| `BackgroundProcessManager.startCommand(command, resolvedCwd)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Cwd resolution | Pass | Pass | N/A | Pass | Extend the existing terminal-specific resolver. |
| Foreground execution | Pass | Pass | N/A | Pass | Reuse `ShellCommandExecutor`. |
| Background lifecycle | Pass | Pass | N/A | Pass | Reuse `BackgroundProcessManager`. |
| Sandbox/security isolation | Pass | Pass | N/A | Pass | Correctly deferred; no new support piece is required in this ticket. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent terminal tool contracts | Pass | Pass | Pass | Pass | Update the two existing schemas/descriptions. |
| Terminal cwd resolution | Pass | Pass | Pass | Pass | Single owner for defaults, anchoring, containment, normalization, and validation. |
| Terminal foreground execution | Pass | Pass | Pass | Pass | No lifecycle redesign. |
| Terminal background processes | Pass | Pass | Pass | Pass | No cwd-based identity or second registry. |
| Terminal docs/tests | Pass | Pass | Pass | Pass | Existing focused surfaces are the correct durable locations. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared cwd policy for both tools | Pass | Pass | Pass | Pass | Existing `execution-cwd.ts` remains the one policy owner. |
| Shared result/process effective-cwd fields | Pass | N/A | Pass | Pass | Existing result contracts already express the needed metadata. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentContextLike.workspaceRootPath` | Pass | Pass | Pass | N/A | Pass | Remains workspace identity/default/relative anchor, not absolute-cwd authority. |
| `TerminalResult.effectiveCwd` | Pass | Pass | Pass | N/A | Pass | Reports the normalized cwd used by foreground execution. |
| `BackgroundProcessInfo.effectiveCwd` | Pass | Pass | Pass | N/A | Pass | Reports process-start cwd while PID remains lifecycle identity. |
| `cwd` parameter | Pass | Pass | Pass | N/A | Pass | Same absolute/relative/default semantics for both affected tools. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Pass | Pass | Pass | Pass | Canonical cwd resolution and validation only. |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Pass | Pass | N/A | Pass | Foreground entrypoint/schema/delegation only. |
| `autobyteus-ts/src/tools/terminal/tools/start-background-process.ts` | Pass | Pass | N/A | Pass | Background entrypoint/schema/delegation only. |
| `autobyteus-ts/docs/terminal_tools.md` | Pass | Pass | N/A | Pass | Durable contract and testing guidance. |
| Focused unit/integration terminal tests | Pass | Pass | N/A | Pass | Boundary and lifecycle evidence, not a new runtime owner. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/` | Pass | Pass | Low | Pass | Existing terminal capability area; no restructuring needed. |
| `autobyteus-ts/src/tools/terminal/tools/` | Pass | Pass | Low | Pass | LLM-facing tool wrappers. |
| `autobyteus-ts/src/tools/terminal/command-execution/` | Pass | Pass | Low | Pass | Execution/platform adapter boundary. |
| Terminal unit/integration test folders | Pass | Pass | Low | Pass | Existing focused verification locations. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Absolute-cwd workspace rejection | Pass | Pass | Pass | Pass | Remove only for explicit absolute input; retain relative traversal rejection. |
| Stale external-cwd rejection tests | Pass | Pass | Pass | Pass | Replace with external success and preserved-boundary coverage. |
| Stale workspace-contained documentation | Pass | Pass | Pass | Pass | Replace with the approved explicit policy. |
| Sandbox/root-registration machinery | Pass | Pass | Pass | Pass | Correctly rejected/deferred, not introduced. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Agent terminal cwd | No | Pass | Pass | No feature flag, alternate tool, dual resolver, or retained absolute rejection. |
| Unrelated path policies | No | Pass | Pass | No compatibility behavior is changed or added. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Invocation cwd / process metadata | `Not Affected` | Pass | Pass | N/A | Pass | Cwd is transient; no durable schema or stored subject changes. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Resolver and contract change | Pass | Pass | Pass | Pass |
| Test/documentation refresh | Pass | Pass | Pass | Pass |
| Package/build/downstream validation | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| External absolute cwd | Yes | Pass | Pass | Pass | The worktree example shows direct absolute resolution and execution. |
| Relative cwd / no-workspace behavior | Yes | Pass | Pass | Pass | Examples distinguish workspace anchoring from process-cwd fallback. |
| Boundary ownership / sandbox scope | Yes | Pass | Pass | Pass | Avoided shape is a tool-local sandbox or duplicate path policy. |

## Material Premise Validation (Only When Needed)

### `MP-001` — Existing but inaccessible cwd must fail before process creation

- Related approved requirement or established contract: `REQ-005` / `AC-006`, preserved directory-validation contract in `BEH-005`.
- Relevant behavior ID(s): `BEH-005`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: The exposed `cwd` parameter of the registered `run_bash` and `start_background_process` tools accepts a caller-supplied local directory; the approved contract explicitly governs existing but inaccessible targets.
- Support evidence: `run_bash` and `start_background_process` are registered agent-facing surfaces. Current source performs pre-spawn existence/type checks; the revised package adds the missing access preflight at the same resolver boundary.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Agent tool call with cwd -> runBash/startBackgroundProcess -> resolveExecutionCwd -> physical-path resolution and directory check -> ShellCommandExecutor/BackgroundProcessManager spawn boundary`.
- Lifecycle preconditions and material consequence at the claimed point: The target exists and is a directory but lacks the access required for the process cwd. The current `ensureDirectoryExists` uses `statSync` and `isDirectory`; on platforms where stat succeeds despite insufficient cwd/search permission, the resolver can return the path and the downstream spawn owns the failure. That does not satisfy the approved pre-spawn working-directory validation/error contract.
- Reachability: `Reachable`.
- Review consequence / proportionate response: The initial design required the resolver-owned accessibility/preflight contract. `SR-002` now defines that check, error mapping, host/WSL ordering, and no-spawn coverage without adding sandbox or authorization machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The Round 1 finding `ARCH-DI-001` is resolved by `SR-002`; the revised package does not introduce a new approved-behavior or current-state gap.

## Review Decision

`Pass` — the approved behavior basis is confirmed, the revised resolver contract is actionable, and the design is ready for implementation. The remaining runtime, package/build, and supported-platform checks are downstream validation responsibilities, not architecture blockers.

## Findings

None.

## Classification

No unresolved architecture finding. The prior `Design Impact` finding `ARCH-DI-001` is resolved and is recorded in `ARCH-REV-002`.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- No dependency-backed runtime evidence was available in the clean worktree; downstream implementation/API-E2E work must validate external cwd, symlink normalization, relative containment, inaccessible-cwd no-spawn behavior, and built/package artifacts on supported platforms.
- Host accessibility preflight is inherently subject to TOCTOU changes and cannot guarantee that a later spawn will succeed; later OS or WSL adapter failures remain runtime errors, not evidence that a sandbox exists.
- On Windows, the host path preflight intentionally precedes WSL conversion. WSL availability, drive mounting, conversion, and runtime failures remain owned by the existing execution adapter and require platform tests.
- The approved behavior is trusted-local terminal cwd semantics, not a sandbox. A future sandbox/security ticket must cover all relevant host-accessing categories and must not be added to this change.
- External cwd makes wrong-checkout operations easier; truthful schema wording and `effectiveCwd` reporting are the approved mitigation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — `MP-001` remains a reachable approved contract case, and `SR-002` now defines resolver-owned host access preflight, validation error mapping, no-spawn behavior, and the host/Windows-WSL boundary.
- Notes: `ARCH-DI-001` is resolved. Ownership, spine inventory, interface boundaries, persisted-data reasoning, removal scope, and sandbox deferral remain coherent. No new finding was identified.
