# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-10-24)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/tickets/in-progress/agent-tools-mcp-tool-error-result/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root, rule 9: no cross-version compatibility), `TESTING.md`
- Project design-principle conflicts or discrepancies: none

## Current-State Read

`ConfiguredMcpRegistryToolAdapter.execute` (`configured-mcp-registry-tool-adapter.ts:37-48`) runs the registry's MCP tool and lets a failure throw. `AgentToolsMcpMethodDispatcher.dispatchToolsCall` (`agent-tools-mcp-method-dispatcher.ts:142-150`) catches it and answers JSON-RPC `-32603 Internal error`. The browser and media adapters instead catch in the adapter and return an error tool result (E-03).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one adapter method, its unit test, one e2e file extended (runtime cases and header).
- Architectural risk: `Low`
- Risk rationale: the endpoint answers with the MCP tool-result shape its sibling adapters already return (E-03), as the MCP specification intends for tool execution errors. No new contract shape, persistence, concurrency or deployment change. The credential rule is the existing autobyteus-179/223 contract, asserted by tests.
- Escalation trigger: if a live runtime (Codex or Claude) mishandles `isError` results, or the failure text is found to carry a credential, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | dispatcher `:142-150` | All failures → `Internal error` | Keep the dispatcher, fix the adapter | — |
| Code | adapter `:37-48` | Throws | Catch here | — |
| Code | browser/media providers | Adapter-level error results | Same convention | — |
| SD-01/SD-02 | evidence | Reproduced; adapter result fixes AGY | Whole design | Live Codex/Claude (U-01) |
| SDK read | E-06 | No URL/headers in transport error texts | No redaction layer | R-01 |

## Intended Change

The configured-MCP adapter returns an `isError` tool result with the failure message whenever its call fails (the tool is no longer available, or its execution throws). The revoked-token e2e gains scripted AGY (mandatory) and live Codex and Claude revoked cases.

## Change Scope (Mandatory)

- In scope: UC-001. `src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` (`execute`); a unit test for it; `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (revoked case per enabled runtime, header text).
- Derived consumers: the executor observer gets `onToolComplete(accepted: false)` instead of `onToolError` for these failures (E-04). Backend event projections for Codex/Claude already present `isError` results as failed tool calls (`mcp-effective-tool-result-projector.ts` users), so no change.
- Deliberately left alone: the dispatcher (protocol errors and unexpected failures of platform adapters), other adapters, the native runtime path, error wording.
- Follow-ups: none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001…003, AC-001…003 | External-runtime tool call | `Internal error` | `isError` result with the reason | DS-001 |
| BEH-002 | Contract | preserved | Native call | Reason shown | Unchanged | — |
| BEH-003 | Contract | REQ-002, QR-001 | Any | No credentials | Holds | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts` | Reproduction | AC-001 | Its AGY revoked case moves into the permanent e2e | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers: *Several kinds or forms / two paths serve one capability* fires. Native and external runtimes reach the same configured tool through two paths, and only the native one gives the agent the reason. The fix aligns the external path. *Behavior by absence* does not fire. *Repeated coordination*: the catch-and-result convention lives in each adapter (browser, media, and now configured MCP), as established; not a shared policy to centralize here.
- Root cause classification: `Local Implementation Defect` (the configured adapter does not follow its siblings' failure convention).
- Refactor needed now: `No`
- Evidence: E-02, E-03, SD-01, SD-02.
- Design response: as Intended Change.
- Intentional deferrals: none.

## Terminology

- *Tool failure result*: an MCP `tools/call` result with `isError: true` and a text content item.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers kept: `None` (no version handling for older runtimes, DESIGN.md rule 9).

## Persisted Data / State Transition Decision

- `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | External runtime `tools/call` | Agent reads the result | `ConfiguredMcpRegistryToolAdapter` (failure → result) | The fixed path |

## Primary Execution Spine(s)

DS-001: `AGY/Codex/Claude MCP client -> Agent Tools MCP route -> AgentToolsMcpMethodDispatcher.dispatchToolsCall -> AgentToolMcpToolExecutor -> ConfiguredMcpRegistryToolAdapter.execute -> GenericMcpTool -> McpServerProxy -> managed MCP server (HTTP 401) -> [failure] adapter returns isError result -> dispatcher JSON-RPC success -> client -> model`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The external runtime calls the configured tool; its failure comes back as a tool result the model reads | dispatcher, executor, adapter, tool | adapter | result normalizer |

## Spine Actors / Main-Line Nodes

Dispatcher, executor, configured adapter, registry MCP tool.

## Ownership Map

- Adapter: executing its configured tool for the session and expressing the outcome as an MCP tool result, success or failure.
- Dispatcher: JSON-RPC protocol only.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| The e2e header's "Native only… Internal error (FU-001)" sentence | Stale after the fix | Updated header | Doc text in a test file |

## Return Or Event Spine(s)

The executor observer: `onToolComplete({ accepted: false })` for these failures (E-04). Unchanged mechanism.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `normalizeConfiguredMcpToolResult` / `toAgentToolMcpToolResult` | DS-001 | adapter | Result shape | Existing | — |

## Ownership Boundaries

The adapter is the boundary between Agent Tools MCP and the tool registry; failures are translated there, not in the dispatcher.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ConfiguredMcpRegistryToolAdapter.execute` | registry tool, proxy | executor | Dispatcher inspecting tool kinds to decide error formatting | — |

## Dependency Rules

Unchanged.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `AgentToolMcpToolAdapter.execute` | one configured tool | result for success and failure | session + args | Returns, does not throw, for call failures |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| adapter `execute` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Everywhere? | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Tool failure | `isError` result | Yes | Yes (MCP term) | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Error result shape | `toAgentToolMcpToolResult` (`agent-tool-mcp-adapter.ts`) with an MCP result `{ content: [{ type: "text", text }], isError: true }` | Reuse | Keeps the `mcp_tool_result` kind the adapter already returns. `createAgentToolsMcpErrorResult` is the operation-result form used by platform tools; either is acceptable, but stay with the adapter's own kind |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| `agent-tools/mcp/configured-mcp` | failure result | DS-001 | adapter | Extend |

## Draft File Responsibility Mapping

See target mapping.

## Reusable Owned Structures Check

None.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

As drafted.

## Applied Patterns

Adapter (existing).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.ts` | Modify | adapter | Catch the call failure; return `isError` result with `error.message` (non-Error: `String(error)`); the "no longer available" case returns the same shape | Owner | Redaction machinery, logging of argument values |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.test.ts` | Add | tests | AC-003 | Unit | — |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` | Modify | tests | Revoked-token case for each enabled runtime (AGY scripted with `CALL_TOOLS:`; Codex/Claude live with the live prompt); assertions as the native case (reason on the wire, no `DUMMY`, no turn `ERROR` for AGY); header updated | Existing test | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| existing | as existing | Yes | Low | No new folders (unit test folder may be new under `tests/unit/agent-tools/mcp/`) |

## Concrete Examples / Shape Guidance

```ts
async execute(input) {
  const failure = (message: string) =>
    toAgentToolMcpToolResult({ content: [{ type: "text", text: message }], isError: true });
  if (!this.resolveCurrentValidDefinition()) {
    return failure(`Configured MCP tool '${this.source.registeredToolName}' is no longer available for this session.`);
  }
  try {
    const result = await this.registry.createTool(this.source.registeredToolName)
      .execute({ agentId: resolveExecutionAgentId(input.session) }, input.rawArguments);
    return toAgentToolMcpToolResult(normalizeConfiguredMcpToolResult(result));
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}
```

Avoided: changing `dispatchToolsCall` to forward every adapter's exception text.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep JSON-RPC errors for older runtimes | Runtime versions | Rejected (DESIGN.md rule 9) | Clean cut |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Put the reproduction into the e2e as the AGY revoked case; see it fail.
2. Change the adapter; add the unit test.
3. Add Codex/Claude revoked cases under their gates; update the header.
4. Run: unit tests for Agent Tools MCP, the e2e with the AGY gate, server typecheck.

## Key Tradeoffs

- The external runtime's turn now continues after a failed tool call (the model decides what to do), instead of ending in an error. That is the intended outcome.

## Risks

- R-01 (remote server body text), U-01 (live runtime presentation).

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/agent-tools-mcp-tool-error-result/evidence/repro-agy-revoked-mcp-tool.e2e.test.ts`, command `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch`. It fails on base (`AGY_TURN_ERROR "Internal error"`). The permanent coverage goes into `mcp-http-auth-agent-tool-call.e2e.test.ts`; do not keep the probe file.
