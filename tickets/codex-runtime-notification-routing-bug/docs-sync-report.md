# Docs Sync Report

## Scope

- Ticket: `codex-runtime-notification-routing-bug`
- Trigger: API/E2E validation passed for the Codex runtime notification routing/client reuse bug; delivery workflow required latest-base integration refresh and docs synchronization on the integrated state.
- Bootstrap base reference: `codex/mixed-team-manager-simplification-analysis` / `origin/codex/mixed-team-manager-simplification-analysis` at `c88b63b26d87d1f6d973c362ab8ade1d92f8a6b5`
- Integrated base reference used for docs sync: `origin/codex/mixed-team-manager-simplification-analysis` at `c88b63b26d87d1f6d973c362ab8ade1d92f8a6b5`
- Post-integration verification reference: local checkpoint `244392836936c44e9a0fe6670a849a8b8e65bbce`; delivery logs under `/Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis/tickets/codex-runtime-notification-routing-bug/validation-logs/delivery/`

## Why Docs Were Updated

- Summary: Delivery promoted the implemented Codex App Server client-boundary invariant into the long-lived Codex integration docs: Codex clients are keyed by canonical workspace `cwd`, team/thread identity lives above that shared-client boundary, known client-global notifications are skipped instead of projected as team-chat runtime errors, and other unrouteable shared-client messages remain server-side/transport diagnostics.
- Why this should live in long-lived project docs: Future Codex/team-runtime changes need to preserve canonical-cwd client reuse and the router-owned global-vs-thread-scoped classification boundary, and must not reintroduce empty cohort/client-scope indirection or user-visible runtime-error fan-out for account/MCP telemetry.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical Codex runtime architecture, team-member runtime bridge, Codex App Server client/router ownership | Updated | Added the canonical-cwd client reuse and router notification classification contract. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | General direct-runtime `AgentRunManager` ownership and sidecar/runtime guidance | No change | Existing content remains accurate; Codex-specific shared-client routing detail belongs in the Codex module doc. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Server-owned mixed team runtime and member execution boundary | No change | Existing content already states Codex members are standalone `AgentRun`s under `MixedTeamManager`; no additional team-level doc change was needed for a Codex adapter/router fix. |
| `README.md` | Top-level Codex testing/runtime configuration guidance | No change | User-facing runtime settings/testing docs do not describe internal shared-client routing and remain accurate. |
| `autobyteus-server-ts/README.md` | Backend setup/testing guidance including Codex E2E gates | No change | Existing testing guidance remains accurate; no new command or environment variable was introduced. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime architecture / router boundary | Documented canonical-workspace-`cwd` Codex App Server client reuse, team identity above the client boundary, `CodexClientThreadRouter` classification of routeable thread/turn messages, skipping known client-global account/MCP notifications, and server-side-only diagnostics for unrouteable shared-client messages. | Prevent future changes from treating global app-server telemetry as team-thread runtime errors or from reintroducing unused cohort/client-scope ownership. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Canonical-cwd Codex client reuse | Same-workspace standalone/Codex team-member runs share one `CodexAppServerClient`; team identity and turn routing are above the shared client, not in a per-team/per-run client scope. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Global-vs-thread-scoped Codex notification boundary | Account/MCP startup telemetry such as `account/rateLimits/updated`, `mcpServer/startupStatus/updated`, and `mcp/startupComplete` are client-global and skipped by default instead of emitted to member chats. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Server-side diagnostics for missing identity | Route-required no-identity messages in multi-thread shared-client scenarios must not call per-thread `emitRuntimeError(...)`; unrouteable server requests receive one transport-level error response. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `CodexTeamThreadCohortCoordinator` / `codex-team-thread-cohort-coordinator.ts` | Canonical-cwd `CodexAppServerClientManager` reuse plus `CodexClientThreadRouter` registrations for thread/turn routing | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| `ClaudeTeamSessionCohortCoordinator` / `claude-team-session-cohort-coordinator.ts` | No replacement needed; Claude session management remains owned by `ClaudeSessionManager` without registry-only cohort indirection | This removal is recorded in ticket artifacts; no long-lived Claude doc described the removed no-op coordinator. |
| `TeamRuntimeCohortIdentity` and `clientScopeKey`/`scopeKey` client-keying concept | Codex client key is the normalized/canonical working directory only | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Chat-visible `CODEX_AMBIGUOUS_TEAM_THREAD_EVENT` fan-out for unscoped Codex app-server messages | Known global notifications are skipped; other unrouteable messages are server-side diagnostics/transport errors only | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Latest tracked remote base was already current before delivery-owned edits. A local checkpoint commit protects source/tests/docs at `244392836936c44e9a0fe6670a849a8b8e65bbce`. Delivery post-integration checks passed; repository push/archive/finalization remains on hold pending explicit user verification.
