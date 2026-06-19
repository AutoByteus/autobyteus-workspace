# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Draft artifacts created; deep investigation pending
- Investigation Goal: Understand current Streamable HTTP MCP backend architecture and identify what prevents it from functioning as a general MCP gateway for arbitrary MCP clients/runtimes.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires article/context review plus backend architecture/code investigation across MCP transport/session/tool routing/runtime exposure boundaries.
- Scope Summary: Analyze current agent-run-scoped Streamable HTTP MCP and propose requirements/design direction for dual-purpose agent-run-scoped and general gateway use.
- Primary Questions To Resolve:
  - How does current Streamable HTTP MCP authenticate/session-scope clients?
  - How are tools exposed and invoked today?
  - Is tool exposure bound to an already-running AgentRun, a workspace, a runtime, a user, or a server-global registry?
  - What identity shape should a general gateway session carry?
  - What needs to change to support arbitrary external MCP clients safely and flexibly?

## Request Context

User explains that the backend has Streamable HTTP MCP, which supports different runtimes such as Autobyteus, Codex, and Claude Agent SDK and provides a unified MCP gateway narrative. However, the user suspects the current server cannot yet be used as a general MCP gateway because the server requires some kind of session token/session tied to agent runs. Current Streamable MCP can scope tools based on an agent run session running inside the server, but a general gateway needs more flexible scoping.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis/tickets/done/general-mcp-gateway-analysis`
- Current Branch: `codex/general-mcp-gateway-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin` completed successfully on 2026-06-18.
- Task Branch: `codex/general-mcp-gateway-analysis`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: User-provided article artifacts live in the original superrepo checkout under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/autobyteus-mcp-gateway-technical-article/`; this dedicated worktree is based on tracked source and may not contain those untracked article files.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && git branch --show-current && git worktree list --porcelain` | Bootstrap repo/worktree/base context | Main checkout on `personal`, behind `origin/personal`; many existing ticket worktrees; no matching general MCP gateway analysis worktree. | No |
| 2026-06-18 | Command | `git fetch origin` | Refresh remote refs before task branch creation | Fetch succeeded. | No |
| 2026-06-18 | Command | `git worktree add -b codex/general-mcp-gateway-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/general-mcp-gateway-analysis origin/personal` | Create dedicated ticket worktree/branch | Worktree created at latest `origin/personal` tracked state. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Pending.
- Current execution flow: Pending.
- Ownership or boundary observations: Pending.
- Current behavior summary: Pending.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Unclear
- Refactor posture evidence summary: Pending current-state code review.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Current MCP tool exposure appears tied to an agent-run session. | Potential boundary/ownership issue if transport session and run-scoped exposure are conflated. | Verify in code. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Pending |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Pending if needed.
- Version / tag / commit / freshness: Pending.
- Relevant contract, behavior, or constraint learned: Pending.
- Why it matters: Pending.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None so far.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

Pending.

## Constraints / Dependencies / Compatibility Facts

Pending.

## Open Unknowns / Risks

- Exact session/token behavior unknown.
- Current MCP endpoint paths and identity requirements unknown.
- General gateway auth model not yet chosen.

## Notes For Architect Reviewer

Pending.
| 2026-06-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/autobyteus-mcp-gateway-technical-article/article.md` | Understand intended article/product framing | Article describes AutoByteus as native agent-team platform whose server can also act as MCP gateway for selected agent tools; explicitly says current gateway is run/session scoped. | No |
| 2026-06-18 | Doc | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/autobyteus-mcp-gateway-technical-article/understanding-notes.md` | Reuse prior code/doc investigation | Confirms two MCP responsibilities: MCP Server Management imports external servers; Agent Tools MCP exposes selected tools outward through run-scoped `autobyteus_agent_tools`. | No |
| 2026-06-18 | Doc | `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Current module contract | Current endpoint `/mcp/agent-tools/:sessionId`; descriptor is run/session scoped, bearer protected, process-memory scoped, revoked by run/member lifecycle; out-of-scope includes persisted sessions and general CLI materializers. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Inspect current session data model | `AgentToolMcpSessionOwnerIdentity` requires `runId`; session carries sender, runtime kind, configured exposure, execution context, enabled tools, configured MCP sources. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-registry.ts` | Inspect session lifecycle | Registry stores sessions in process memory, hashes bearer token, requires owner.runId, supports revocation by run/member owner. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Inspect descriptor creation | Service resolves configured exposure, creates registry session, builds descriptor URL `/mcp/agent-tools/:sessionId` with Authorization bearer header. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Inspect tool exposure | Catalog derives enabled tools from configured agent tool names and context; configured MCP-origin tools are included only if selected and registry metadata matches. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/providers/*.ts` | Inspect adapter context needs | Some adapters are run/member dependent: send_message_to uses sender, task delegation requires member team context, media uses run/workspace context, publish_artifacts publishes against owning run. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` | Inspect MCP-origin execution | MCP-origin tool calls create registry tool and pass context `{ agentId: memberRunId || runId }`; this is run identity, not gateway principal identity. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Inspect route behavior | Route requires bearer token, resolves path session id, supports initialize/tools/list/tools/call/resources/list/templates/list/ping; no public session creation from initialize. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/*`, `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/*` | Inspect runtime materialization | Codex/Claude materializers create private run-scoped descriptors and inject them into thread/session runtime config. | No |
| 2026-06-18 | Code | `autobyteus-ts/src/tools/mcp/server-instance-manager.ts`, `autobyteus-ts/src/tools/mcp/tool.ts`, `autobyteus-ts/src/tools/mcp/server/proxy.ts` | Inspect remote MCP proxy identity | MCP server instances are scoped by `agentId:serverId`; `GenericMcpTool` requires context.agentId. General gateway needs a non-run identity shape for this path. | No |
| 2026-06-18 | Spec | `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports` | Check current stable Streamable HTTP session semantics | Stable spec describes server-minted `MCP-Session-Id` after initialize for transport sessions and 404 after termination; protocol version header required on subsequent requests. | No |
| 2026-06-18 | Spec | `https://modelcontextprotocol.io/docs/tutorials/security/authorization` | Check MCP authorization framing | Official docs describe MCP HTTP authorization as transport-level authorization, commonly OAuth 2.1, for restricted servers and audit/user-specific access. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Runtime materializers in Codex/Claude create a private `autobyteus_agent_tools` descriptor, then external provider runtime calls `/mcp/agent-tools/:sessionId` with bearer auth.
- Current execution flow:
  - AgentRun starts in Codex or Claude runtime.
  - Runtime materializer resolves configured agent tool exposure.
  - `AgentToolMcpSessionService` creates a process-memory session and bearer descriptor.
  - Provider runtime uses descriptor for MCP initialize/tools/list/tools/call.
  - Route resolves the path session and bearer token before dispatch.
  - Catalog lists/calls only session-enabled tools.
  - Built-in adapter or configured MCP registry adapter executes the tool.
- Ownership or boundary observations:
  - Current Agent Tools MCP is an outward projection of an AgentRun's selected tools, not a standalone public MCP gateway.
  - MCP Server Management owns external server import/proxy; Agent Tools MCP owns runtime-facing selected tool projection.
  - Session, authorization, run identity, sender identity, exposure profile, and execution context are bundled in one run-scoped session object.
- Current behavior summary: Current implementation is correct for private provider-runtime tool projection but too run-bound and pre-provisioned to serve arbitrary MCP clients as a general gateway.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Boundary Refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Shared Structure Looseness
- Refactor posture evidence summary: The current run-scoped data model is healthy for runtime materializers but should not be generalized by making run fields optional. A distinct gateway profile/session boundary is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-mcp-session.ts` | `owner.runId` required; sender required. | Session model encodes AgentRun ownership, not general gateway principal. | Split session scope types. |
| `agent-tool-mcp-session-service.ts` | Descriptor URL is minted after server-side session creation. | External clients need a provisioning/auth path not tied to runtime materializer internals. | Add gateway descriptor/provisioning owner. |
| `agent-tool-mcp-catalog.ts` | Exposure derives from configured agent tool names. | Need gateway profile selector separate from agent definition. | Add profile exposure resolver. |
| Adapter providers | Some tools require run/member context. | General gateway cannot expose all current tools safely. | Add context-aware eligibility. |
| `GenericMcpTool` / `McpServerProxy` | MCP server instances are keyed by agentId. | General gateway needs non-run execution identity for remote MCP connection scoping. | Extend MCP proxy identity shape. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Run-scoped Agent Tools MCP descriptor/session model | Requires run owner and sender; bundles exposure and context | Do not stretch into generic profile by optional fields; introduce explicit scope variants. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` | Creates run-scoped session descriptors for materializers | Has no public create/connect/provision path | Add separate gateway session/provisioning service. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | Handles private run-scoped MCP route | Path session id + bearer auth; no initialize-minted transport session | Keep for run mode; add gateway route with spec-aligned transport/session behavior. |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Resolves tool exposure and definitions | Agent configured tool exposure is current authority | Add reusable catalog pieces plus gateway exposure resolver. |
| `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` | Manages remote MCP server instances by agentId/serverId | Current key names identity as agentId | Need principal/profile/workspace execution key for gateway calls. |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md` | Documents import/proxy side of MCP | Clear separation from Agent Tools MCP Server | General gateway should reuse this owner for external MCP execution. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-18 | Static trace | Code/doc read of runtime materializers to route to catalog/executor | All current production descriptor creation is tied to Codex/Claude run contexts. | General gateway needs new entrypoint. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Model Context Protocol 2025-11-25 Streamable HTTP transports; MCP authorization tutorial.
- Version / tag / commit / freshness: Stable spec page 2025-11-25; official docs accessed 2026-06-18.
- Relevant contract, behavior, or constraint learned: MCP transport sessions are protocol sessions (`MCP-Session-Id`) separate from HTTP authorization. Authorization for restricted HTTP MCP servers should be modeled as a separate transport-level authorization concern.
- Why it matters: AutoByteus currently uses an application capability session embedded in the URL as the descriptor authority. That is suitable for private runtime materialization but should not be the only identity model for a general gateway.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None; static architecture investigation only.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

The current architecture already has the hard part of gateway behavior for selected agent tools: registration of external MCP tools into the AutoByteus registry, a catalog that can list registered MCP-origin definitions, and a route that delegates configured MCP-origin calls back through the existing MCP proxy path. The missing piece is not Streamable HTTP itself; it is the ownership model around who creates the session, what the session represents, what tool set it authorizes, and what execution identity is used when no AgentRun exists.

## Constraints / Dependencies / Compatibility Facts

- Existing Codex and Claude runtime materialization must remain private and run-scoped.
- Current bearer descriptors are intentionally non-durable; do not persist them into project config.
- General gateway should not expose run-private tools without explicit run binding.
- MCP Server Management remains the owner of external MCP server configs and remote calls.

## Open Unknowns / Risks

- Gateway principal/profile persistence owner is undecided.
- Authorization mechanism for external clients is undecided.
- Endpoint naming and whether to support spec `MCP-Session-Id` stateful sessions vs stateless mode is undecided.
- Browser/media tools may need deeper policy review before gateway exposure.

## Notes For Architect Reviewer

If this proceeds to implementation, review should focus on avoiding a catch-all `AgentToolMcpSession` with many nullable fields. The safer design is two explicit modes: run-scoped Agent Tools MCP and general MCP Gateway profile sessions, sharing low-level JSON-RPC method/response helpers and catalog definition mapping where appropriate.


## 2026-06-19 User Refinement: Simplified Gateway Scope

The user clarified and approved a simpler design:

- External general gateway endpoint should be stable: `/mcp/gateway`.
- External clients such as Cursor and Antigravity should not use client-specific URLs like `/mcp/gateway/cursor-main`.
- The profile/token idea is unnecessary for first version except as a simple access token.
- General gateway should expose only MCP tools, i.e. registered `ToolOrigin.MCP` tools imported from configured external MCP servers.
- AutoByteus internal agent tools do not belong to the general MCP gateway category and must not be exposed there.

Design implication: the first implementation does not need gateway profiles, principal ids, run binding, or server-owned tool eligibility. `/mcp/gateway` can authenticate via a simple token and expose all current registered MCP-origin tools through the existing MCP proxy path.


## 2026-06-19 Approval Note

User confirmed the requirement is clear and asked solution designer to proceed with design. Requirements are treated as approved/refined for architecture review.


## 2026-06-19 Frontend / Minimal Backend Refinement

User refined the product and implementation scope further:

- The goal is simply to make the MCP gateway work in this version.
- Backend API should be as simple as possible: implement `/mcp/gateway`; avoid profiles, token CRUD, principal models, rotate/revoke UI, or per-client records.
- Frontend should still expose the capability visibly. The right location is Settings -> MCP Servers, but not as a mixed card above the list. Instead, use tabs similar to the Nodes page pattern.
- Desired frontend shape: Settings -> MCP Servers -> tabs: `MCP Servers` and `MCP Gateway`.
- The `MCP Servers` tab keeps existing server configuration/import/discovery/list behavior.
- The `MCP Gateway` tab shows endpoint/config guidance and registered MCP-origin exposed tools/count.

Frontend investigation:

- `autobyteus-web/pages/settings.vue` has `activeSection === 'mcp-servers'` rendering `ToolsManagementWorkspace initial-root-section="mcp-servers"`.
- `ToolsManagementWorkspace.vue` currently has root sections `local-tools` and `mcp-servers`, and the `mcp-servers` view renders `McpServerList`.
- Nodes tab pattern lives in `components/settings/NodeManager.vue` + `NodeManagerTabs.vue`: a tab header component with `role="tablist"` and panels switched by an `activeTab` ref.

Design implication: add an MCP-specific tab layer under the existing MCP Servers settings section, likely `McpManagementTabs.vue` plus `McpGatewayPanel.vue`, without creating a new Settings sidebar item.
