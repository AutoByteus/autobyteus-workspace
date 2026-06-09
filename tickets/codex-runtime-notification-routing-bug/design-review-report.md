# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/codex-runtime-notification-routing-bug/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/codex-runtime-notification-routing-bug/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/codex-runtime-notification-routing-bug/design-spec.md`
- Current Review Round: 3
- Trigger: Latest authoritative design revision after user/design-principles clarification that empty cohort indirection must be removed, not retained as optional cleanup.
- Prior Review Round Reviewed: Round 2, no unresolved findings.
- Latest Authoritative Round: 3
- Current-State Evidence Basis:
  - Current branch/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis` on `codex/mixed-team-manager-simplification-analysis`.
  - Current branch originally introduced Codex app-server client `scopeKey` keying, Codex `CodexTeamThreadCohortCoordinator`, shared `TeamRuntimeCohortIdentity`, and router `emitAmbiguousMessageError(...)` fan-out to `CodexThread.emitRuntimeError(...)`.
  - Current source search confirms `ClaudeTeamSessionCohortCoordinator` is still only wired through `ClaudeSessionManager` register/unregister calls, and `listCohortRunIds(...)` / `resolveCohortKey(...)` have no production consumer.
  - After Codex dependency removal, `team-runtime-cohort-identity.ts` would only feed that no-op Claude registry.
  - `ClaudeSessionManager` still owns the shared/injected `ClaudeSdkClient`, session map, active query cleanup, and emitted session behavior; the cleanup target is only the empty cohort registry/injection, not Claude SDK/session lifecycle.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User clarified global/unrouteable Codex app-server messages are not Codex business/runtime errors | N/A | None | Pass | No | Approved canonical-cwd Codex client reuse and server-side-only router diagnostics. |
| 2 | User questioned whether `TeamRuntimeCohortIdentity` remains useful after Codex canonical-cwd client reuse | None | None | Pass | No | Approved deleting Codex-only cohort key indirection; Claude cleanup was left as non-required then. |
| 3 | User/design-principles clarification that empty indirection removal is first-class and not optional | None | None | Pass | Yes | Approves required in-scope removal of both Codex and Claude cohort coordinators plus `team-runtime-cohort-identity.ts`. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/codex-runtime-notification-routing-bug/design-spec.md` as the current authoritative design.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies bug fix + small corrective refactor/removal cleanup. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Codex issue is Missing Invariant + Boundary/Ownership Issue; cohort files are Empty Indirection / Shared Structure Looseness after the corrected boundaries. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design requires removing scoped Codex client keying, both empty cohort coordinators, and `team-runtime-cohort-identity.ts` in this change. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal plan, file mapping, migration sequence, and validation guidance explicitly cover Codex and Claude cleanup while preserving Claude SDK/session behavior. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No prior findings to recheck. | Round 1 recorded no findings. | N/A |
| 2 | N/A | N/A | No prior findings to recheck. | Round 2 recorded no findings. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Codex client lease | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Codex notification return routing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Router bounded local dispatch | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Claude non-regression/session behavior | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Empty cohort indirection removal | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/codex/client` | Pass | Pass | Pass | Pass | Restores canonical-cwd app-server client/process lease ownership. |
| `agent-execution/backends/codex/thread` | Pass | Pass | Pass | Pass | Router remains the active per-client thread-registration owner; delete empty Codex cohort file. |
| `agent-execution/backends/codex/backend` | Pass | Pass | Pass | Pass | Cleanup/context shape correction remains local. |
| `agent-execution/backends/claude/session` | Pass | Pass | Pass | Pass | Claude session lifecycle remains; remove only no-op cohort coordinator/injection. |
| `agent-execution/domain/team-runtime-cohort-identity.ts` | Pass | Pass | Pass | Pass | No remaining owner after both cohort coordinators are removed; delete. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Client-global Codex notification method set | Pass | Pass | Pass | Pass | Local router set is sufficient; no generic provider taxonomy. |
| Workspace client key normalization | Pass | Pass | Pass | Pass | Existing client manager private normalization is the right owner. |
| Router no-route diagnostic helper/equivalent | Pass | N/A | Pass | Pass | May remain local to router. |
| `TeamRuntimeCohortIdentity` | Pass | N/A | Pass | Pass | Delete because it has no true shared owner or consumer after cohort removals. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CodexThreadCleanupTarget` | Pass | Pass | Pass | N/A | Pass | Tight after `clientScopeKey` removal. |
| `ClientEntry` | Pass | Pass | Pass | N/A | Pass | Canonical-cwd map key/process cwd only; no run/team identity. |
| `TeamRuntimeCohortIdentity` | Pass | Pass | Pass | N/A | Pass | Corrective action is deletion, not promotion as shared structure. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex client-manager `scopeKey` parameters | Pass | Pass | Pass | Pass | Remove from API and callers. |
| Composite `normalizeClientKey(cwd, scopeKey)` behavior | Pass | Pass | Pass | Pass | Replacement is canonical `cwd`. |
| `CodexThreadManager.threadClientScopeKey(...)` | Pass | Pass | Pass | Pass | No replacement helper. |
| `clientScopeKey` cleanup target path | Pass | Pass | Pass | Pass | Includes fallback unexpected-close cleanup target. |
| `CodexTeamThreadCohortCoordinator` | Pass | Pass | Pass | Pass | Delete after scope-key removal; router owns active registrations. |
| `ClaudeTeamSessionCohortCoordinator` and injection/register/unregister calls | Pass | Pass | Pass | Pass | Delete as no-op registry; existing `ClaudeSessionManager` session map/cleanup flow remain authoritative. |
| `team-runtime-cohort-identity.ts` / `TeamRuntimeCohortIdentity` | Pass | Pass | Pass | Pass | Delete because no owner/import should remain. |
| Scoped-client tests | Pass | Pass | Pass | Pass | Replace with canonical-cwd reuse assertions. |
| `emitAmbiguousMessageError(...)` runtime-error fan-out | Pass | Pass | Pass | Pass | Replace with server-side diagnostics and global notification skip. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Pass | Pass | N/A | Pass | Workspace client lease only. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Pass | Pass | N/A | Pass | Thread lifecycle; no client/cohort key construction. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-client-thread-router.ts` | Pass | Pass | Pass | Pass | Active routing + route classification + server-side diagnostics. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | Pass | Pass | N/A | Pass | Cleanup and client release by workspace. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-context.ts` | Pass | Pass | N/A | Pass | Produces cleanup target without scope key. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-team-thread-cohort-coordinator.ts` | Pass | Pass | N/A | Pass | Delete. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Pass | Pass | N/A | Pass | Remove only no-op cohort dependency; preserve SDK/session behavior. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-team-session-cohort-coordinator.ts` | Pass | Pass | N/A | Pass | Delete. |
| `autobyteus-server-ts/src/agent-execution/domain/team-runtime-cohort-identity.ts` | Pass | Pass | N/A | Pass | Delete after imports are removed. |
| Listed Codex/Claude unit tests | Pass | Pass | N/A | Pass | Tests target the changed owners. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CodexAppServerClientManager` | Pass | Pass | Pass | Pass | No `runId`, `teamRunId`, `memberRunId`, or derived cohort key. |
| `CodexClientThreadRouter` | Pass | Pass | Pass | Pass | Uses ID resolver, local global-method classification, server-side diagnostics, and optional transport `respondError` for unrouteable server requests. |
| `CodexThread` | Pass | Pass | Pass | Pass | Receives only route-matched app-server messages; router no-route diagnostics stay out. |
| `ClaudeSessionManager` | Pass | Pass | Pass | Pass | Must not depend on no-op cohort registry; must retain SDK client/session/active-query/event behavior. |
| Frontend/team chat | Pass | Pass | Pass | Pass | No notification-method-specific UI workaround. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CodexAppServerClientManager` | Pass | Pass | Pass | Pass | Clean manager API accepts `cwd` only. |
| `CodexClientThreadRouter` | Pass | Pass | Pass | Pass | Authoritative Codex message demux/classification owner. |
| `CodexThread` | Pass | Pass | Pass | Pass | Per-thread runtime event owner only after route match. |
| `ClaudeSessionManager` | Pass | Pass | Pass | Pass | Authoritative Claude session owner; cohort registry is not needed. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CodexAppServerClientManager.getClient(cwd)` | Pass | Pass | Pass | Low | Pass |
| `CodexAppServerClientManager.acquireClient(cwd)` | Pass | Pass | Pass | Low | Pass |
| `CodexAppServerClientManager.releaseClient(cwd)` | Pass | Pass | Pass | Low | Pass |
| `CodexClientThreadRouter.registerThread({ client, thread, onThreadClientClosed })` | Pass | Pass | Pass | Low | Pass |
| `isClientGlobalCodexNotification(method)` or equivalent | Pass | Pass | Pass | Low | Pass |
| `logUnrouteableAppServerMessage(...)` or equivalent | Pass | Pass | Pass | Low | Pass |
| `CodexAppServerClient.respondError(...)` for unrouteable server requests | Pass | Pass | Pass | Low | Pass |
| `CodexAgentRunContext.toCleanupTarget()` | Pass | Pass | Pass | Low | Pass |
| `ClaudeTeamSessionCohortCoordinator` APIs | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `runtime-management/codex/client/` | Pass | Pass | Low | Pass | Provider client/process management. |
| `agent-execution/backends/codex/thread/` | Pass | Pass | Low | Pass | Thread lifecycle/router; delete empty cohort file. |
| `agent-execution/backends/codex/backend/` | Pass | Pass | Low | Pass | Runtime context/cleanup. |
| `agent-execution/backends/claude/session/` | Pass | Pass | Low | Pass | Claude session lifecycle; delete no-op coordinator. |
| `agent-execution/domain/team-runtime-cohort-identity.ts` | Pass | Pass | Low | Pass | Delete. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex client/process reuse | Pass | Pass | N/A | Pass | Correct existing manager. |
| Codex notification/request demux | Pass | Pass | N/A | Pass | Extend existing router. |
| Thread/turn ID extraction | Pass | Pass | N/A | Pass | Reuse existing resolver. |
| Router diagnostics | Pass | Pass | Pass | Pass | Local logging/equivalent is enough. |
| Codex/Claude cohort identity | Pass | Pass | N/A | Pass | Delete empty/no-consumer abstractions. |
| Global-event consumer | Pass | Pass | N/A | Pass | Out of scope until real product need exists. |
| UI suppression | Pass | Pass | N/A | Pass | Correctly rejected. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Codex client `scopeKey` overload | No target retention | Pass | Pass | Remove. |
| Codex `TeamRuntimeCohortIdentity` dependency | No target retention | Pass | Pass | Remove/delete. |
| Claude no-op cohort registry | No target retention | Pass | Pass | Remove/delete. |
| Runtime-error fan-out for router ambiguity | No target retention | Pass | Pass | Remove/replace with server-side diagnostics. |
| Broad no-id skip behavior | No | Pass | Pass | Explicit global allowlist + server-side no-route diagnostics. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Client manager API/key restoration | Pass | Pass | Pass | Pass |
| Codex caller updates | Pass | Pass | Pass | Pass |
| Cleanup/context shape update | Pass | Pass | Pass | Pass |
| Codex cohort decommission | Pass | Pass | Pass | Pass |
| Claude no-op cohort decommission | Pass | Pass | Pass | Pass |
| Router global skip/no-route diagnostic update | Pass | Pass | Pass | Pass |
| Test updates and validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex client key | Yes | Pass | Pass | Pass | Good/bad shapes are clear. |
| Global notification handling | Yes | Pass | Pass | Pass | Router-local skip/future-consumer posture is clear. |
| Route-required no-identity diagnostics | Yes | Pass | Pass | Pass | Server-side-only diagnostic target is clear. |
| Cohort cleanup | Yes | Pass | Pass | Pass | Empty-indirection rationale and deletion target are explicit. |
| Claude non-regression | Yes | Pass | Pass | Pass | Guardrail is clear: no SDK/session behavior change. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Future Codex client-global notification methods | Additional valid global methods may appear later. | Keep local method set easy to extend and use server-side diagnostics/logging for unknown multi-registration no-route messages. | Residual risk, not blocking. |
| Future explicit global-event consumer | Global events may become useful application/account/runtime signals. | Add a separate global-event consumer/status owner in a future ticket if product needs it. | Out of scope, not blocking. |
| Hidden cohort imports/consumers | Deleting files must not break real consumers. | Implementation must run repo search/typecheck/tests and ensure no production imports remain. | Guardrail, not blocking. |
| Other ticket-branch additions | Audit was high-level, not a complete architecture review of every added file. | Treat only identified cohort files as approved/removal-required in this ticket. | Not blocking. |

## Review Decision

Pass: the latest design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The explicit global-notification method set may need extension if Codex emits additional client-global notifications that AutoByteus should not route to threads.
- Implementation must keep no-route diagnostics server-side only; router diagnostics must not call `CodexThread.emitRuntimeError(...)`, set agent status `ERROR`, or create team chat content.
- Deleting the Claude no-op cohort registry must not alter `ClaudeSdkClient` reuse, Claude session IDs, active query cleanup, or emitted Claude session events.
- The broader simplification audit did not prove every ticket-branch addition is ideal; it only found the cohort files as obvious empty abstractions.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Approved for implementation with no blocking architecture findings. Current authoritative target: restore canonical-cwd Codex app-server client reuse; remove Codex run/team scope keys; delete `CodexTeamThreadCohortCoordinator`, `ClaudeTeamSessionCohortCoordinator`, and `team-runtime-cohort-identity.ts`; classify known client-global Codex notifications before routing; replace router runtime-error fan-out with server-side-only diagnostics; preserve Claude SDK client/session behavior.
