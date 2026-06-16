# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/streamable-mcp-runtime-tools/tickets/in-progress/streamable-mcp-runtime-tools/design-spec.md`
- Current Review Round: 3
- Trigger: Round 3 architecture review request after Round 2 left one narrow AR-001 precision issue.
- Prior Review Round Reviewed: Round 2 in this same report path.
- Latest Authoritative Round: 3
- Current-State Evidence Basis:
  - Current branch/worktree state checked: `HEAD == origin/personal == 08078c265902955e5a570721e03763c5f39398f6`; ticket artifacts are untracked.
  - Current code anchors from prior rounds remain applicable: `server-runtime.ts`, `server-runtime-endpoints.ts`, `AgentRunManager`, `MixedAgentMemberHandle`, configured exposure resolver, `SendMessageToDispatcher`, send-message contract/schema, Codex dynamic tool registration, and Claude MCP server builder paths.
  - Revised artifacts inspected: requirements doc, investigation notes, revised design spec, previous design review report, `design-rework-response-round-1.md`, and `design-rework-response-round-2.md`.
  - Shared design basis explicitly applied this round:
    - `architecture-reviewer/design-principles.md`
    - `solution-designer/references/design-examples.md`, especially the agent-runtime and team-run examples for stretched spines, thin facade vs governing owner, bounded local flows, and explicit identity shape.
  - External protocol basis rechecked against current official MCP docs on 2026-06-13:
    - `https://modelcontextprotocol.io/specification/2025-11-25/basic/transports`
    - `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`
    - `https://modelcontextprotocol.io/specification/2025-11-25/schema`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review request from `solution_designer` | N/A | 3 | Fail | No | Main direction was sound, but protocol/auth/error matrix, secret descriptor lifecycle, and session lifecycle semantics needed design rework. |
| 2 | Re-review after Round 1 rework | AR-001, AR-002, AR-003 | 0 new IDs; AR-001 remained partially unresolved | Fail | No | AR-002 and AR-003 resolved. AR-001 still needed exact DS-007 unsupported-method, unknown/unconfigured tool, and invalid-envelope behavior. |
| 3 | Re-review after Round 2 DS-007 precision rework | AR-001 | 0 | Pass | Yes | AR-001 resolved. Design is ready for implementation. |

## Reviewed Design Spec

The revised design introduces a generic AutoByteus Agent Tools MCP Server with session-scoped Streamable HTTP route, server-side session/catalog authority, secret/redacted descriptor handling, explicit DS-007 protocol/auth/status matrix, explicit DS-008 session lifecycle policy, DS-010 schema projection providers, and DS-011 per-tool adapters that delegate to existing owning services/dispatchers. V1 scope remains MCP infrastructure plus `send_message_to` through `SendMessageToDispatcher`; production runtime materializers are deferred unless the ticket expands.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as feature/enabling infrastructure plus targeted refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership issue plus duplicated policy/coordination risk is tied to current runtime-specific tool surfaces and the existing shared `SendMessageToDispatcher` seam. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Route/session/catalog/redaction and `send_message_to` adapter are in-scope; future production runtime materializers and non-send-message adapters are deferred unless scope expands. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-001..DS-011, file mapping, migration sequence, and requirements REQ-MCP-018..021 reflect the targeted refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 / 2 | AR-001 | High then Medium | Resolved | DS-007 now authenticates unsupported HTTP methods before 405, pins unknown/unconfigured tools to `200 application/json` JSON-RPC `-32602` with no MCP tool result/domain dispatch, and pins malformed JSON/gross envelope/method-invalid-param stage behavior. AC-MCP-015 now requires these exact choices. | No remaining AR-001 design impact. |
| 1 | AR-002 | High | Resolved | DS-009 marks `AgentToolMcpDescriptor` secret-bearing/runtime-only, defines `RedactedAgentToolMcpDescriptor`, forbids raw descriptor persistence/logging/events, and defines materializer cleanup/redaction rules. | No further design action. |
| 1 | AR-003 | Medium | Resolved | DS-008 defines per external runtime run/member session granularity, no turn-end revoke by default, run/member cleanup revoke, TTL/restart/restore outcomes, stale config denial, and authenticated DELETE 405 without app-session revoke. | No further design action. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Standalone external-process runtime MCP materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Mixed-team member external-process runtime MCP materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | MCP tool list generation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | MCP `send_message_to` tool call | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Unauthorized / unconfigured request denial | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Tool lifecycle/event projection | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Streamable HTTP dispatch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Session lifecycle | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Runtime MCP config materialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Tool definition / schema projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | Existing tool call adapter refactor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Notes: The design follows the design-examples benchmark: primary spines DS-001/DS-002 are stretched from run/team creation to runtime launch, DS-007/DS-008/DS-009 are bounded local spines under clear parent owners, and DS-006 is an explicit return/event spine rather than hidden behavior.

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP Server | Pass | Pass | Pass | Pass | Correct new owner for server-hosted MCP route/session/catalog/protocol/redaction. |
| Agent Communication | Pass | Pass | Pass | Pass | `SendMessageToDispatcher` remains authoritative for `send_message_to`. |
| Agent execution configured exposure | Pass | Pass | Pass | Pass | Existing configured-tool exposure resolver remains the right source. |
| Runtime MCP config materializers | Pass | Pass | Pass | Pass | Correct runtime-local conversion/cleanup owners; no registry/catalog bypass. |
| Fastify server runtime | Pass | Pass | Pass | Pass | Existing app bootstrap is the correct route registration owner. |
| `mcp-server-management/**` | Pass | Pass | Pass | Pass | Correctly not reused as server-hosted MCP owner because it manages external MCP servers consumed by AutoByteus. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Canonical runtime-only, secret-bearing descriptor. |
| `RedactedAgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Correct safe diagnostics/event/log view. |
| Session identity/token/context | Pass | Pass | Pass | Pass | App session, bearer token hash, owner identity, sender context, expiry/revocation are singular. |
| Configured-and-supported tool resolution | Pass | Pass | Pass | Pass | Server-side authority over exposure is clear. |
| Supported tool definition provider contract | Pass | Pass | Pass | Pass | Clean DS-010 seam; avoids runtime-wrapper introspection. |
| MCP result/schema mapping | Pass | Pass | Pass | Pass | Protocol mappers stay transport-only and do not own business behavior. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSession` | Pass | Pass | Pass | Pass | Pass | Separates app session state from optional MCP transport session state. |
| `AgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Pass | Secret-bearing but semantically tight. |
| `RedactedAgentToolMcpDescriptor` | Pass | Pass | Pass | Pass | Pass | Safe view is intentionally non-runtime. |
| `AgentToolMcpSupportedToolDefinition` | Pass | Pass | Pass | Pass | Pass | Tool definition fields have singular schema/list meaning. |
| MCP JSON-RPC/tool error shape | Pass | Pass | Pass | N/A | Pass | DS-007 now cleanly separates HTTP gate errors, JSON-RPC method/protocol errors, and MCP tool `isError` semantic failures. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `/mcp/runtime-tools/*` naming | Pass | Pass | Pass | Pass | Clean-cut rejection remains. |
| Unauthenticated global MCP endpoint | Pass | Pass | Pass | Pass | OPTIONS-only unauthenticated exception is now coherent; unsupported methods are authenticated/session-resolved before 405. |
| MCP route calling runtime wrappers | Pass | Pass | Pass | Pass | Correctly rejected. |
| Schema discovery by wrapper introspection | Pass | Pass | Pass | Pass | Correctly rejected. |
| Persistent session storage for v1 | Pass | Pass | Pass | Pass | V1 memory-only plus restore/rematerialize is explicit. |
| Raw descriptor persistence/logging | Pass | Pass | Pass | Pass | Correctly rejected. |
| Client DELETE as app-session revoke | Pass | Pass | Pass | Pass | Correctly rejected for v1. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-session.ts` | Pass | Pass | Pass | Pass | App session, secret descriptor, redacted descriptor, and token-validation types are one session/descriptor subject. |
| `agent-tool-mcp-session-registry.ts` | Pass | Pass | Pass | Pass | Memory lifecycle, token hash, expiry/revocation, owner-based revoke. |
| `agent-tool-mcp-session-service.ts` | Pass | Pass | Pass | Pass | Runtime-adapter entrypoint for secret descriptor and redacted view. |
| `agent-tool-mcp-catalog.ts` | Pass | Pass | Pass | Pass | Supported definitions and configured-session filtering. |
| `agent-tool-mcp-definition-provider.ts` and providers | Pass | Pass | Pass | Pass | DS-010 schema projection seam. |
| `agent-tool-mcp-tool-executor.ts` | Pass | Pass | Pass | Pass | Thin adapter to owning dispatchers/services. |
| `agent-tools-mcp-routes.ts` | Pass | Pass | Pass | Pass | DS-007 route gate matrix is now exact enough. |
| `agent-tools-mcp-method-dispatcher.ts` | Pass | Pass | Pass | Pass | JSON-RPC method/notification/error handling is bounded to protocol. |
| `agent-tools-mcp-result-mapper.ts` | Pass | Pass | Pass | Pass | Protocol-vs-tool-execution error mapping is pinned. |
| `agent-tools-mcp-schema-mapper.ts` | Pass | Pass | Pass | Pass | Schema mapping stays protocol-only. |
| Runtime-specific materializer files | Pass | Pass | Pass | Pass | Future files belong under runtime backends, not the MCP server subsystem. |
| `server-runtime.ts` | Pass | Pass | Pass | Pass | Existing app bootstrap owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime materializers -> session service/descriptor | Pass | Pass | Pass | Pass | Materializers consume descriptor only and own runtime-native config safety. |
| MCP route/method dispatcher -> registry/catalog/executor | Pass | Pass | Pass | Pass | Route gate/session/catalog/tool execution boundaries are clear. |
| Tool executor -> `SendMessageToDispatcher` | Pass | Pass | Pass | Pass | Correct authoritative communication boundary. |
| Catalog -> definition providers/contracts | Pass | Pass | Pass | Pass | No wrapper introspection. |
| `mcp-server-management/**` | Pass | Pass | Pass | Pass | Excluded from server-hosted MCP ownership. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpSessionService` | Pass | Pass | Pass | Pass | Runtime backends use service, not registry internals. |
| `AgentToolMcpSessionRegistry` | Pass | Pass | Pass | Pass | Route resolves sessions through registry/service APIs. |
| `AgentToolMcpCatalog` | Pass | Pass | Pass | Pass | Server-side list/call allowlist is authoritative. |
| Per-tool definition provider | Pass | Pass | Pass | Pass | Schema projection only. |
| `SendMessageToDispatcher` | Pass | Pass | Pass | Pass | Owns `send_message_to` parse/validate/route/delivery/result semantics. |
| Runtime materializer boundary | Pass | Pass | Pass | Pass | Runtime config/process cleanup stays runtime-local. |
| MCP transport session vs AutoByteus app session | Pass | Pass | Pass | Pass | No-v1-`MCP-Session-Id` decision is clear and explicit. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `createAgentToolMcpSession(input)` | Pass | Pass | Pass | Low | Pass |
| `resolveAgentToolMcpSession(request)` | Pass | Pass | Pass | Medium | Pass |
| `listMcpToolsForSession(session)` | Pass | Pass | Pass | Low | Pass |
| Definition provider method | Pass | Pass | Pass | Low | Pass |
| `executeAgentToolMcpCall(input)` | Pass | Pass | Pass | Medium | Pass |
| `SendMessageToDispatcher.dispatch(input)` | Pass | Pass | Pass | Low | Pass |
| Runtime materializer interfaces | Pass | Pass | Pass | Medium | Pass |
| `revokeAgentToolMcpSession(sessionId)` / owner revoke | Pass | Pass | Pass | Medium | Pass |
| DS-007 route/method matrix | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Pass | Pass | Medium | Pass | Mixed transport/session/catalog folder is justified because all files serve one server-hosted Agent Tools MCP surface. |
| Runtime backend materializer files | Pass | Pass | Medium | Pass | Correct future runtime-local placement. |
| `agent-communication/` | Pass | Pass | Low | Pass | Correct authority for `send_message_to`. |
| `mcp-server-management/**` | Pass | Pass | Medium | Pass | Correctly not reused. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Fastify route registration | Pass | Pass | N/A | Pass | Good. |
| Loopback server URL | Pass | Pass | N/A | Pass | Good reuse of internal server base URL facility. |
| Configured tool exposure | Pass | Pass | N/A | Pass | Good reuse. |
| `send_message_to` execution | Pass | Pass | N/A | Pass | Good reuse of latest dispatcher. |
| Tool schema sources | Pass | Pass | N/A | Pass | Provider/extract-if-needed policy is sound. |
| External MCP client management | Pass | Pass | Pass | Pass | Correctly separate direction. |
| Server-hosted MCP sessions/transport | Pass | Pass | Pass | Pass | New subsystem justified. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Route naming | No | Pass | Pass | Rejects `runtime-tools`. |
| Unauthenticated URL-only MCP | No | Pass | Pass | Rejected. |
| Runtime-wrapper execution | No | Pass | Pass | Rejects MCP route calling BaseTool/Codex/Claude wrappers. |
| Durable project config as universal default | No | Pass | Pass | Correctly rejected. |
| MCP transport session in v1 | No | Pass | Pass | No-v1-`MCP-Session-Id` decision is clean. |
| Client DELETE revokes app session | No | Pass | Pass | Correctly rejected for v1. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| MCP subsystem creation | Pass | Pass | Pass | Pass |
| Protocol/route compliance | Pass | Pass | Pass | Pass |
| Secret-bearing descriptor handling | Pass | Pass | Pass | Pass |
| Session lifecycle/revocation/restore | Pass | Pass | Pass | Pass |
| `send_message_to` adapter | Pass | Pass | Pass | Pass |
| Future materializers | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool allowlist | Yes | Pass | Pass | Pass | Good. |
| Tool schema projection | Yes | Pass | Pass | Pass | Good. |
| Session auth / route gate | Yes | Pass | Pass | Pass | Good. |
| Secret descriptor | Yes | Pass | Pass | Pass | Good. |
| DELETE semantics | Yes | Pass | Pass | Pass | Good. |
| `send_message_to` execution | Yes | Pass | Pass | Pass | Good. |
| Runtime materialization | Yes | Pass | Pass | Pass | Good. |
| SSE posture | Yes | Pass | Pass | Pass | Good. |
| Design-examples alignment | Yes | Pass | Pass | Pass | Design follows the examples' strong shapes: stretched primary spines, bounded local route/session/materializer spines, clear off-spine concerns, and explicit identity boundaries. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None blocking | N/A | N/A | Closed for implementation readiness. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no open findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Manual Streamable HTTP implementation remains more protocol-risky than using the official MCP SDK server transport. Implementation and API/E2E coverage should exercise the full DS-007 matrix, including MCP SDK client compatibility.
- Future browser/media/task-delegation/publish-artifacts adapters require per-family schema/contract extraction review when added.
- Secret redaction, no raw-token persistence/logging, and run/member lifecycle revocation are high-value implementation/code-review checks.
- Production runtime materializers remain deferred unless scope expands; if they are added, they must stay runtime-local and consume only the secret descriptor/redaction helper, not registry/catalog internals.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: AR-001, AR-002, and AR-003 are resolved. The design satisfies the shared design principles and the design-examples benchmark: spines are stretched and explicit, ownership boundaries are clear, off-spine concerns serve named owners, reusable structures are tight, legacy/compatibility shortcuts are rejected, file placement follows ownership, and interface identity shapes are explicit. Proceed to implementation.
