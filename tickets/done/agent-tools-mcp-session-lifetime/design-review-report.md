# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after user-approved Option A requirements.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream artifacts and independently inspected current code in `autobyteus-server-ts/src/agent-tools/mcp/`, `autobyteus-server-ts/src/agent-execution/backends/{codex,claude}/`, `autobyteus-server-ts/src/agent-execution/services/`, `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/`, and the focused tests named by the design. Verified the current TTL fields/checks, Claude expiry cache, public termination bypass, existing manager/member cleanup, and route denial behavior described by the design.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 0 | Pass | Yes | Design is implementation-ready with residual test-environment and passive-orphan risks recorded. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-session-lifetime/tickets/done/agent-tools-mcp-session-lifetime/design-spec.md` as the authoritative target design, with requirements and investigation notes as supporting context.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design lines 52-73 classify the change as behavior change plus shared infrastructure refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies missing invariant, boundary/ownership issue, and legacy compatibility pressure, backed by TTL registry, session model, Claude cache, and termination bypass evidence. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor needed now is explicit; OAuth metadata and passive orphan cleanup are intentionally deferred. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping, boundary map, dependency rules, and migration sequence all implement the refactor decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Start/restore/resume descriptor materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | MCP request auth/session/dispatch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Standalone termination cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Mixed member cleanup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Restart/reset old-descriptor rejection and fresh restore | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Registry local validity state | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Claude live descriptor cache | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP Server | Pass | Pass | Pass | Pass | Correctly keeps session validity in registry/service and route dispatch in MCP route. |
| Standalone Agent Run Lifecycle | Pass | Pass | Pass | Pass | Correctly makes `AgentRunManager` the cleanup boundary while `AgentRunService` keeps metadata/history workflow. |
| Codex Runtime Backend | Pass | Pass | Pass | Pass | Reuse/type fallout is appropriate; restore path already rematerializes descriptors. |
| Claude Runtime Backend | Pass | Pass | Pass | Pass | Cache change belongs in Claude descriptor state; no registry responsibility leaks into Claude. |
| Mixed Team Runtime | Pass | Pass | Pass | Pass | Member-scoped revoke is correctly retained and tested as idempotent with run cleanup. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Session validity model | Pass | Pass | Pass | Pass | Tightening existing session model and registry is better than adding a new abstraction. |
| Owner identity matching | Pass | Pass | Pass | Pass | Existing registry owner helpers remain the right shared point. |
| Descriptor redaction | Pass | Pass | Pass | Pass | Existing redaction helper remains the shared owned projection. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSession` | Pass | Pass | Pass | N/A | Pass | Target shape removes `expiresAt`; `createdAt` and `revokedAt` retain singular lifecycle meaning. |
| `AgentToolMcpCreateSessionInput` | Pass | Pass | Pass | N/A | Pass | Removing `ttlMillis` prevents runtime callers from owning active expiry. |
| `AgentToolMcpSessionResolveFailureReason` | Pass | Pass | Pass | N/A | Pass | Removing `expired` prevents hidden TTL compatibility behavior. |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | N/A | Pass | Descriptor remains runtime-facing secret capability; no active expiry is added. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DEFAULT_SESSION_TTL_MILLIS` / `normalizeTtlMillis` | Pass | Pass | Pass | Pass | Replaced by memory presence + revoke + token match. |
| `ttlMillis` input | Pass | Pass | Pass | Pass | No compatibility shim retained. |
| Required `expiresAt` | Pass | Pass | Pass | Pass | Correctly removed from active session model. |
| `expired` resolve reason and expiry branch | Pass | Pass | Pass | Pass | Route keeps redacted denial for all unresolved sessions. |
| `purgeExpiredSessions()` | Pass | Pass | Pass | Pass | Future orphan GC is explicitly out-of-scope and must not drive active validity. |
| Claude descriptor expiry cache | Pass | Pass | Pass | Pass | Replaced by live `ClaudeSession`-scoped descriptor state. |
| Expiry-focused tests/fixtures | Pass | Pass | Pass | Pass | Design requires removal/update, not skipping. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/agent-tools/mcp/agent-tool-mcp-session.ts` | Pass | Pass | Pass | Pass | Model remains the canonical type/redaction owner. |
| `src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Pass | Pass | Pass | Pass | Registry owns memory/token/revoke, not HTTP or runtime config. |
| `src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Pass | Pass | Pass | Pass | Runtime-facing descriptor/revoke boundary remains coherent. |
| `src/agent-tools/mcp/agent-tools-mcp-http-gate.ts` | Pass | Pass | N/A | Pass | Transport gate remains transport-only. |
| `src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Pass | Pass | N/A | Pass | Route resolves session before dispatch and keeps denial redaction. |
| `src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Pass | Pass | Pass | Pass | Live descriptor cache is a bounded local owner. |
| `src/agent-execution/services/agent-run-service.ts` | Pass | Pass | N/A | Pass | Public workflow owner; cleanup bypass must be removed. |
| `src/agent-execution/services/agent-run-manager.ts` | Pass | Pass | N/A | Pass | Active run cleanup authority; no metadata/history ownership added. |
| Focused test files | Pass | Pass | N/A | Pass | Test placement follows existing focused coverage structure. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime bootstrappers/materializers | Pass | Pass | Pass | Pass | May call session service; may not synthesize session IDs/tokens or persist raw descriptors for restart reuse. |
| MCP route/gate | Pass | Pass | Pass | Pass | May call registry resolve; may not dispatch before auth/session. |
| `AgentRunService` | Pass | Pass | Pass | Pass | Must delegate accepted termination to manager, not call `activeRun.terminate()` directly. |
| `AgentRunManager` | Pass | Pass | Pass | Pass | May revoke run-scoped sessions during unregister; should not absorb metadata/history persistence. |
| `MixedAgentMemberHandle` | Pass | Pass | Pass | Pass | May revoke member-scoped sessions; registry internals stay encapsulated. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Pass | Pass | Pass | Pass | Runtime descriptor creation stays behind service. |
| `AgentToolMcpSessionRegistry.resolveSession` | Pass | Pass | Pass | Pass | Route remains a caller, not a duplicate state owner. |
| `AgentRunManager.terminateAgentRun` | Pass | Pass | Pass | Pass | Design directly fixes current service bypass. |
| `MixedAgentMemberHandle.dispose` | Pass | Pass | Pass | Pass | Member lifecycle cleanup stays owned by handle. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionRegistry.createSession(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionRegistry.resolveSession({ sessionId, bearerToken })` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionRegistry.revokeSession(sessionId)` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionRegistry.revokeSessionsForOwner(ownerPartial)` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionService.createAgentToolMcpSession(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.terminateAgentRun(runId)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunService.restoreAgentRun(runId)` | Pass | Pass | Pass | Low | Pass |
| `MixedAgentMemberHandle.ensureReady()` | Pass | Pass | Pass | Low | Pass |
| `ClaudeAgentToolsMcpSessionState.ensureDescriptor(runContext)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Pass | Pass | Low | Pass | Existing capability area is appropriate for shared MCP session/route logic. |
| `autobyteus-server-ts/src/agent-execution/services/` | Pass | Pass | Low | Pass | Service/manager split remains meaningful. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/` | Pass | Pass | Low | Pass | Runtime config projection only. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/` | Pass | Pass | Low | Pass | Claude cache/materialization only. |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/` | Pass | Pass | Low | Pass | Existing member lifecycle owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Session validity and bearer auth | Pass | Pass | N/A | Pass | Existing registry is the correct owner. |
| Runtime descriptor creation | Pass | Pass | N/A | Pass | Existing service remains correct. |
| Run-scoped cleanup | Pass | Pass | N/A | Pass | Existing manager cleanup boundary is reused. |
| Member-scoped cleanup | Pass | Pass | N/A | Pass | Existing handle cleanup is reused. |
| Codex restore descriptor materialization | Pass | Pass | N/A | Pass | Existing bootstrapper path is sufficient with updated tests. |
| Claude restore descriptor materialization | Pass | Pass | N/A | Pass | Existing new-session state object provides fresh descriptor behavior after cache change. |
| Route denial behavior | Pass | Pass | N/A | Pass | Current bearer/redacted denial behavior is preserved. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Active session TTL | No | Pass | Pass | Design rejects nullable/ignored `expiresAt`, unused `ttlMillis`, and longer TTL. |
| Descriptor refresh-by-expiry | No | Pass | Pass | Design replaces expiry refresh with live-session cache. |
| Durable old descriptor restoration | No | Pass | Pass | Old descriptors intentionally fail after registry reset/restart. |
| Route fallback for missing registry sessions | No | Pass | Pass | Missing sessions remain redacted unavailable. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Session model and registry TTL removal | Pass | Pass | Pass | Pass |
| Route/gate type fallout | Pass | Pass | Pass | Pass |
| Claude live cache change | Pass | Pass | Pass | Pass |
| Public termination boundary fix | Pass | Pass | Pass | Pass |
| Restore/start path verification | Pass | Pass | Pass | Pass |
| Focused tests and leftover search | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active session validity | Yes | Pass | Pass | Pass | Good/bad chains make TTL removal unambiguous. |
| Restart/resume semantics | Yes | Pass | Pass | Pass | Clear old descriptor failure and fresh descriptor path. |
| Standalone termination boundary | Yes | Pass | Pass | Pass | Correctly shows manager boundary vs service bypass. |
| Claude live cache | Yes | Pass | Pass | Pass | Clear cache-by-live-session behavior. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Restore/resume coverage level | Prevents regressions in Codex, Claude, and mixed member fresh descriptor materialization without forcing brittle full-stack tests. | Accept design guidance: generic route/reset behavior should be route/integration level; runtime restore/materialization can be unit-level or narrow integration where existing harnesses make it practical. | Resolved for design; implementation/API-E2E can refine execution shape. |
| OAuth protected-resource metadata / `WWW-Authenticate` discovery | Could matter for future remote OAuth-compliant MCP exposure, but it is not necessary to remove active TTL semantics. | Keep as follow-up, not this ticket. | Resolved for design. |
| Test runner dependency blocker (`vitest` not found) | Implementation needs executable evidence. | Implementation must resolve dependency setup or record blocker before handoff. | Residual implementation risk, not design blocker. |
| Passive inactive runs not observed until later manager lookup | Could leave sessions in memory after backend dies without explicit lifecycle path. | Keep as named residual risk/follow-up; do not reintroduce TTL. | Accepted residual risk. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking design findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Implementation must preserve `AgentRunService` metadata/history/platform-ID behavior while delegating accepted termination through `AgentRunManager` and avoiding double `activeRun.terminate()`.
- Test execution is currently environment-blocked by missing `vitest`; implementation must establish a valid test invocation before claiming executable evidence.
- Passive orphaned sessions may remain in memory until explicit cleanup, manager lookup, or process restart. This is intentionally not solved with active TTL in this ticket.
- Full OAuth protected-resource metadata and `WWW-Authenticate` discovery remain a separate authorization-compliance concern.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design satisfies the required spine, ownership, removal, boundary-encapsulation, and migration-safety checks. Proceed to implementation using the reviewed artifacts.
