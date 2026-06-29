# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/claude-code-process-start-failure/tickets/done/claude-code-process-start-failure/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/claude-code-process-start-failure/tickets/done/claude-code-process-start-failure/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/claude-code-process-start-failure/tickets/done/claude-code-process-start-failure/design-spec.md`
- Current Review Round: 1
- Trigger: Revised design package after 2026-06-29 user clarification requiring `permissionMode: "default"` plus complete inside/outside-workspace permission coverage.
- Prior Review Round Reviewed: None; no prior canonical architecture review report existed in the task artifact folder.
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Requirements/investigation/design package; current source at `/home/autobyteus/workspace/.codex/worktrees/claude-code-process-start-failure` commit `4938681a487331349cb04936c7977350b25d222d`; spot-check of current code showing `resolveClaudePermissionMode(true) => "bypassPermissions"`, `ClaudeAgentRunContext.autoExecuteTools` derived from provider mode, `ClaudeSession` bypass branch, terminal-result helper treating all `type: "result"` chunks as terminal, and `ClaudeSdkClient` defaulting provider permission mode to `default`; official Claude docs spot-check for root/sudo bypass refusal, sandbox default false, and `canUseTool` permission callback semantics.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Revised design package with user-approved default-mode solution and expanded permission coverage | N/A | No blocking findings | Pass | Yes | Design is implementation-ready; residual risks are test-execution/auth/environment risks, not design blockers. |

## Reviewed Design Spec

Reviewed `/home/autobyteus/workspace/.codex/worktrees/claude-code-process-start-failure/tickets/done/claude-code-process-start-failure/design-spec.md` as the authoritative design. The design correctly treats the reported failure as a boundary/ownership issue: AutoByteus `autoExecuteTools` is a run-level approval policy, while Claude SDK `permissionMode` is provider process policy. The design removes the unsafe implicit mapping to `bypassPermissions`, preserves approval through `ClaudeSessionToolUseCoordinator`/SDK `canUseTool`, adds process/terminal diagnostics, and records the newly clarified permission coverage requirements.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design lines 21-31 identify bug-fix posture, design issue, root-cause class, refactor need, and sandbox boundary. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classified as `Boundary Or Ownership Issue`; evidence ties current `claude-session-config.ts`, Docker/root probe, and coordinator ownership to the defect. Current code confirms the mapping and bypass branch. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now for policy separation and defers only a future explicit provider-permission setting. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, boundary map, dependency rules, and migration sequence all implement the refactor; no root-only compatibility branch is retained. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No prior canonical review report existed. | This is the first authoritative architecture-reviewer artifact for this task. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end launch/config/process path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Bounded permission-callback approval path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Return/error diagnostics and terminal-result path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded validation harness for inside/outside workspace permission behavior | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime session | Pass | Pass | Pass | Pass | Correct owner for turn lifecycle, explicit auto approval state, permission callback routing, and terminal classification. |
| Claude SDK client/runtime management | Pass | Pass | Pass | Pass | Correct owner for SDK query options and stderr callback wiring; must not take over run/team approval policy. |
| Agent/team execution | Pass | Pass | Pass | Pass | Correctly limited to carrying `autoExecuteTools` through `AgentRunConfig`; no provider permission knowledge added. |
| Documentation | Pass | Pass | Pass | Pass | Docs impact is named for delivery sync without blocking implementation. |
| Durable tests / API-E2E coverage | Pass | Pass | Pass | Pass | Expanded validation requirement is correctly placed in coverage artifacts/execution, with implementation adding durable coverage where appropriate. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude process diagnostic buffering/redaction | Pass | Pass | Pass | Pass | Design allows a small owned helper or local class; scope is bounded and not prematurely cross-runtime. |
| Terminal Claude error extraction | Pass | Pass | Pass | Pass | Existing `claude-session-output-events.ts` is the right owner for raw chunk helper logic. |
| Permission coverage harness scratch-path setup | Pass | Pass | Pass | Pass | Kept under tests/API-E2E coverage, not production runtime code. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ClaudeSessionConfig.autoExecuteTools` | Pass | Pass | Pass | N/A | Pass | New field has one meaning: AutoByteus auto approval only. |
| `ClaudeSessionConfig.permissionMode` | Pass | Pass | Pass | N/A | Pass | Target meaning is provider permission mode only; no longer source of AutoByteus approval state. |
| Diagnostic summary | Pass | Pass | Pass | N/A | Pass | Bounded/redacted summary avoids raw secret sink and avoids duplicating raw process state. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autoExecuteTools=true -> "bypassPermissions"` resolver mapping | Pass | Pass | Pass | Pass | Clean-cut removal/redefinition is required; no root-only branch. |
| `ClaudeAgentRunContext.autoExecuteTools` derived from provider mode | Pass | Pass | Pass | Pass | Replaced by explicit runtime-context/session-config field. |
| Success treatment for all `type: "result"` chunks | Pass | Pass | Pass | Pass | Replaced by terminal error classifier and `ERROR` event path. |
| Generic-only process exit message | Pass | Pass | Pass | Pass | Replaced by bounded stderr diagnostics through SDK/session boundary. |
| Stale docs/tests teaching bypass as normal path | Pass | Pass | Pass | Pass | Implementation updates tests; delivery handles docs sync/no-impact against integrated state. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-config.ts` | Pass | Pass | N/A | Pass | Config shape and safe provider default/invariant belong here. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-context.ts` | Pass | Pass | N/A | Pass | Runtime context is correct place to expose explicit auto approval policy. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Pass | Pass | N/A | Pass | Correct translation boundary from generic run config to Claude runtime context. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Pass | Pass | N/A | Pass | Restore path needs the same explicit policy and safe provider default. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Pass | Pass | Pass | Pass | Turn owner correctly routes permission callback, diagnostics, and terminal classification. |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Pass | Pass | N/A | Pass | SDK client owns option construction/stderr callback, not run/team policy. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts` | Pass | Pass | N/A | Pass | Existing helper owner for terminal/result chunk classification. |
| Unit/integration/API-E2E tests | Pass | Pass | N/A | Pass | Coverage mapping is concrete enough for implementation/API-E2E ownership split. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team/agent launch -> `AgentRunConfig` | Pass | Pass | Pass | Pass | May pass `autoExecuteTools`; must not know Claude provider permission modes. |
| `ClaudeSessionBootstrapper` -> runtime context | Pass | Pass | Pass | Pass | May translate run config; must not collapse auto approval and provider mode. |
| `ClaudeSession` -> coordinator/SDK client | Pass | Pass | Pass | Pass | Session calls authoritative approval and SDK boundaries rather than bypassing one with the other. |
| `ClaudeSessionToolUseCoordinator` -> runtime policy | Pass | Pass | Pass | Pass | Reads explicit auto policy, not provider permission mode. |
| Frontend/websocket -> normalized runtime events | Pass | Pass | Pass | Pass | Frontend must not parse raw SDK stderr/result chunks. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ClaudeSessionToolUseCoordinator` | Pass | Pass | Pass | Pass | Design removes the current bypass shape and uses callback for auto/manual. |
| `ClaudeSdkClient` | Pass | Pass | Pass | Pass | Session passes typed options/callbacks; no direct CLI construction above SDK boundary. |
| `ClaudeSession` | Pass | Pass | Pass | Pass | Terminal result classification occurs before memory/UI treat a turn as complete. |
| Test/API-E2E harness | Pass | Pass | Pass | Pass | Scratch-path behavior remains validation-only, not production shortcut logic. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `buildClaudeSessionConfig(input)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeAgentRunContext.autoExecuteTools` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSdkClient.startQueryTurn(options)` | Pass | Pass | Pass | Low | Pass |
| `ClaudeSessionToolUseCoordinator.handleToolPermissionCheck(...)` | Pass | Pass | Pass | Low | Pass |
| `isClaudeTurnTerminalChunk` / new error helper | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/claude/session` | Pass | Pass | Low | Pass | Session lifecycle, output helpers, and approval coordination already live here. |
| `runtime-management/claude/client` | Pass | Pass | Low | Pass | Provider adapter boundary for SDK options and stderr callback. |
| `agent-execution/services` | Pass | Pass | Low | Pass | Restore context construction remains in the existing run-manager owner. |
| Test paths under existing unit/integration/API-E2E areas | Pass | Pass | Low | Pass | Design avoids creating production helpers for coverage-only scratch behavior. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Auto approve Claude tool permissions | Pass | Pass | N/A | Pass | Existing coordinator already owns manual and auto branches. |
| SDK process option construction | Pass | Pass | N/A | Pass | Existing SDK client remains the correct adapter. |
| Runtime error event emission | Pass | Pass | N/A | Pass | Existing session/event-converter path already maps to user-visible runtime error. |
| Redacted stderr buffering | Pass | Pass | Pass | Pass | New small helper/local class is justified if needed; keep Claude-scoped. |
| Inside/outside workspace permission coverage | Pass | Pass | N/A | Pass | Extend existing tests/API-E2E coverage; safe scratch behavior is validation concern. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Auto approval mapped to provider bypass | No target compatibility path | Pass | Pass | Root-only compatibility and non-root bypass retention are explicitly rejected. |
| Auth error treated as successful assistant result | No target compatibility path | Pass | Pass | Terminal error result must become runtime `ERROR`. |
| Stale docs/tests asserting bypass | No target compatibility path | Pass | Pass | Update/remove rather than preserve. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Config/context/bootstrap/restore refactor | Pass | Pass | Pass | Pass |
| Session permission callback routing | Pass | Pass | Pass | Pass |
| SDK stderr diagnostics | Pass | Pass | Pass | Pass |
| Terminal error-result classification | Pass | Pass | Pass | Pass |
| Tests/docs cleanup | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Auto approval vs provider mode | Yes | Pass | Pass | Pass | Good/bad examples directly prevent recurrence of the bug. |
| Auth error classification | Yes | Pass | Pass | Pass | Example makes `is_error` handling concrete. |
| Process diagnostics | Yes | Pass | Pass | Pass | Example explains sanitized enrichment of generic process exits. |
| Complete permission coverage | Yes | Pass | Pass | Pass | Example names safe `/tmp` scratch style and avoids workspace-only validation. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Live Claude success still requires auth | Missing auth can still prevent a successful live turn after the process-start bug is fixed. | Implementation/API-E2E should classify live auth absence as environment/setup failure and verify mocked behavior durably. | Residual risk; not a design blocker. |
| Future explicit Claude provider permission setting | Some users may eventually want `bypassPermissions` in non-root isolated environments. | Defer to a separate requirement with root/sudo preflight and warning; do not reuse `autoExecuteTools`. | Explicitly deferred. |
| Direct `ClaudeSdkClient.autoExecuteTools` fallback | Low-level direct SDK client can still synthesize an allow callback if no explicit callback is supplied. | Standard `ClaudeSession` path must pass coordinator callback; preserve fallback only as lower-level SDK option helper/tests, not run/team policy. | Residual implementation review point; not a design blocker. |
| Outside-workspace tests can be destructive if poorly chosen | User explicitly required safe coverage. | Use disposable test-created scratch paths and never sensitive server/home/data/repo-control/production mounts. | Addressed by requirements/design; verify in implementation/API-E2E. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking `Design Impact`, `Requirement Gap`, or `Unclear` findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Live Claude end-to-end validation may be blocked by missing container auth; this should be reported as an environment/setup issue while durable mocked/controlled coverage remains required.
- Claude SDK/Claude Code permission semantics may change in later versions; diagnostic capture should remain best-effort and tests should lock the current AutoByteus boundary invariants.
- The implementation must ensure the standard `ClaudeSession` path always routes through `ClaudeSessionToolUseCoordinator`; direct SDK-client auto-allow fallback should not become a parallel run/team approval policy.
- The expanded outside-workspace validation is safety-sensitive; test paths must be disposable scratch directories and cleaned up.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The revised design cleanly removes the erroneous AutoByteus auto-approval to Claude `bypassPermissions` mapping, preserves auto/manual approval through the existing coordinator, keeps SDK option/diagnostic ownership at the provider boundary, classifies terminal provider/auth errors in the session owner, and incorporates the 2026-06-29 user-required inside/outside workspace permission coverage without enabling Claude sandboxing implicitly.
