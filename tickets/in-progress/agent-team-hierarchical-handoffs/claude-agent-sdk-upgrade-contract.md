# Claude Agent SDK Upgrade And Capability Contract

## Artifact Authority

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/claude-agent-sdk-upgrade-contract.md`
- Purpose: Define the exact compatible dependency cut from Claude Agent SDK `0.2.71` to `0.3.231`, record the verified active-input capability conclusion, and map every affected production and verification spine without creating a second input owner.
- Scope: AutoByteus project manifests/lockfile, Claude runtime adapter/session, intrinsic Agent Tools MCP materialization, package/build/type/test verification, and isolated live capability proof.
- Status: `Refined — SR-028 corrects the active one-string-query interrupt spine for complete architecture re-review`
- Related requirements: `R-057`, `R-058`
- Related acceptance criteria: `AC-052`, `AC-053`
- Approval applicability: Intended-behavior and dependency-boundary authority. The user explicitly authorized upgrading the real libraries to current mutually compatible versions and using them for investigation.

## 1. Governing Decision

The project shall use this exact reproducible set, verified current on 2026-08-13:

| Package | Target | Placement | Compatibility fact |
| --- | --- | --- | --- |
| `@anthropic-ai/claude-agent-sdk` | `0.3.231` | `autobyteus-server-ts` direct dependency | Declares Claude Code parity `2.1.231`; root `query`, `getSessionMessages`, and `createSdkMcpServer` APIs used by AutoByteus remain exported. |
| `@anthropic-ai/sdk` | `0.116.0` | exact direct dependency in `autobyteus-server-ts` and `autobyteus-ts` | Satisfies Agent SDK peer `>=0.93.0`. |
| `@modelcontextprotocol/sdk` | `1.30.0` | exact direct dependency in `autobyteus-server-ts` and `autobyteus-ts` | Satisfies Agent SDK peer `^1.29.0`. |
| `zod` | existing `^4.3.6` | unchanged direct dependency | Satisfies Agent SDK peer `^4.0.0`. |

`package.json` and `pnpm-lock.yaml` are one atomic dependency change. No range is used for the three upgraded direct packages; reproducibility is preferred over resolving a later unreviewed provider boundary on install.

This upgrade does **not** make Claude an exact-active-turn append backend. Claude remains:

```ts
{ activeTurnAppend: "unsupported" }
```

The provider-neutral `AgentRunInputAdmissionState` from SR-026 remains the sole input FIFO and dispatch-policy owner. Active Claude input is accepted by AgentRun, reports public `turnId:null`, waits there, and becomes one later `start_turn` after the canonical current turn terminates.

## 2. Verified Capability Conclusion

Official current documentation and installed `0.3.231` types expose a persistent streaming-input mode with queued messages, `SDKUserMessage.priority?: "now" | "next" | "later"`, `Query.streamInput(...)`, `Query.interrupt()`, command-lifecycle frames, interrupt receipts, and queued-message cancellation. None accepts the AutoByteus canonical active turn ID or an `expectedTurnId` equivalent.

The isolated live probe confirms the distinction:

- `priority:"now"` interrupts/redirects the running Claude work, marks the prior assistant work aborted, and begins the new command. It does not append to the exact same active turn.
- `priority:"next"` queues the message for sequential later processing. It does not identify or append to the exact current turn.
- no current public input API accepts the AgentRun-owned exact active turn ID.

Therefore the latest SDK offers provider-owned interruption and later-turn queueing, not the exact same-turn mechanic represented by `append_to_active_turn(expectedTurnId)`. AutoByteus must not reinterpret either priority as exact append.

## 3. Upgrade Impact Matrix

| Upstream change | Current AutoByteus use | Target decision |
| --- | --- | --- |
| Removed deprecated V2 session APIs in `0.3.142` | Project already uses `query()` and `options.resume`; no V2 import exists. | No adapter or compatibility path. Keep the current query/resume boundary. |
| MCP servers connect in the background by default | Team-bound Claude Agents require intrinsic Agent Tools MCP tools in turn 1. | The server-owned intrinsic Agent Tools HTTP MCP entry sets `alwaysLoad:true`. Do not use the legacy environment switch. |
| Headless sessions use Task tools instead of `TodoWrite` | Project source has no Claude `TodoWrite` or Claude Task-tool-name consumer. | No product mapper is added. Existing unrelated AutoByteus `TaskUpdate` domain types are not provider dependencies. |
| Anthropic and MCP packages became peer dependencies in `0.3.143` | Both are already direct project dependencies. | Pin the exact compatible current peers in both owning packages and verify one lock resolution. |
| `Options.env` replaces rather than merges subprocess environment | Current client already builds/passes the complete effective environment, including inherited values and the trusted API-key injection. | Preserve full-environment construction; never pass a sparse override. |
| SDK uses a per-platform native Claude binary package | Current product explicitly resolves and supplies `pathToClaudeCodeExecutable`; runtime availability probes that executable. | Preserve this supported product boundary in SR-027. Verify the selected executable and record its version in live evidence; do not create a second bundled/external selection policy in this upgrade. |
| New command lifecycle / queue receipts / `priority` | SR-026 already assigns command/input lifecycle to AgentRun. | Do not route provider queue frames into AgentRun command authority and do not adopt `streamInput` or priority scheduling. Provider event conversion remains limited to established output semantics. |
| New streaming-control interrupt receipt and aborted assistant marker | Current product interruption is not a streaming-input control: `ClaudeSession` supplies `Options.abortController` to its one-string query, aborts it, waits for settlement, releases the registered query/reference through the established finalizer, and emits canonical interruption. | Do not consume the receipt or call `Query.interrupt()` in the active product-turn path. Preserve the AbortController/settlement/cleanup/canonical-event sequence; provider streaming receipts own no AutoByteus result or cancellation state. |
| Root exports and event union have expanded | Current client dynamically loads root APIs and converters normalize supported event families. | Tighten focused contract coverage around used APIs/events; ignore unrelated new event variants without raw fallthrough or guessed conversion. |

## 4. Target Runtime Contract

1. `ClaudeSdkClient.startQueryTurn()` continues to call `query({prompt:string, options})` once for one AgentRun `start_turn`.
2. A resumed AgentRun continues to pass the provider session ID through `options.resume`; no removed V2 session API is introduced.
3. The complete subprocess environment is passed through `options.env`.
4. The configured/current external Claude executable remains the single product runtime-executable boundary for this upgrade. Runtime availability and live evidence must prove it is usable; the SR-027 validation environment uses Claude Code `2.1.231`, matching the SDK's declared parity version.
5. Only the intrinsic AutoByteus Agent Tools MCP server is marked `alwaysLoad:true`, because Team collaboration/task/tool availability is a first-turn product invariant. This flag does not become a generic policy for arbitrary external MCP servers.
6. `ClaudeSession` remains one-active-turn-at-a-time. It must never receive `streamInput`, `priority`, or provider-owned queued input from AgentRun.
7. `AgentRun` remains the sole owner of accepted meaning, order, next-turn waiting, interrupt retention, and termination of undispatched input.
8. Explicit product interruption preserves the current one-string path: the query receives `Options.abortController`; `ClaudeSession` clears/flushes pending approvals, calls `AbortController.abort()`, awaits that active execution, completes established query-reference cleanup, clears active state, and emits canonical `TURN_INTERRUPTED` before AgentRun drains waiting input. It does not call `Query.interrupt()` or consume an SDK interrupt receipt.
9. No application schema, TeamRun metadata, history, communication, token, external binding, or database contract changes because of this dependency upgrade.

## 5. Data-Flow Spines

### CLAUDE-SDK-001 — Install and lock resolution

```text
exact root workspace manifests
  -> pnpm resolver
  -> one lockfile resolution for SDK + compatible peers
  -> installed root exports/platform package
  -> import/build/type verification
```

Owner: workspace package manifests and pnpm lockfile. The package manager does not choose product runtime policy.

### CLAUDE-SDK-002 — Idle AgentRun starts one Claude turn

```text
supported caller
  -> exact AgentRun.postUserMessage()
  -> AgentRunInputAdmissionState claims FIFO head as start_turn
  -> ClaudeAgentRunBackend
  -> ClaudeSession.startTurn()
  -> ClaudeSdkClient.query(prompt:string, resume/options)
  -> native Claude stream
  -> existing Claude event converter
  -> canonical AgentRun pipeline and consumers
```

Owner: AgentRun owns admission; ClaudeSession owns one provider turn; the SDK is an external mechanism.

### CLAUDE-SDK-003 — Input arrives while Claude is active

```text
send_message_to/browser/external caller
  -> exact AgentRun.postUserMessage()
  -> AgentRun FIFO admission returns accepted with turnId:null
  -> no Claude SDK input yet
  -> canonical current-turn terminal
  -> AgentRun claims the same FIFO head as start_turn
  -> one later Claude query(prompt:string)
```

Owner: AgentRun. `streamInput`, `priority:"next"`, and provider command lifecycle are deliberately absent.

### CLAUDE-SDK-004 — Interrupt with waiting AgentRun input

```text
explicit interrupt command
  -> AgentRun interruption owner
  -> Claude backend -> ClaudeSession exact active execution
  -> clear/flush pending tool-approval responses
  -> active Options.abortController.abort()
  -> await exact active query execution settlement
  -> established registered-query/reference cleanup + clear active state
  -> canonical TURN_INTERRUPTED/terminal ordering
  -> AgentRun settles forwarded entry and retains undispatched FIFO entries
  -> post-terminal drain starts the next entry exactly once
```

Owner: AgentRun owns pending entries; `ClaudeSession` alone translates product interruption. It does not call `Query.interrupt()`, consume an SDK interrupt receipt, or use streaming input. The canonical interrupted fact cannot precede active query settlement and cleanup. Any unrelated SDK-control cleanup remains outside this spine and cannot act as fallback.

### CLAUDE-SDK-005 — Resume

```text
restored AgentRun/session context
  -> ClaudeSession.startTurn()
  -> ClaudeSdkClient query options.resume
  -> latest SDK/selected Claude executable
  -> resumed provider transcript events
  -> canonical AgentRun output pipeline
```

Owner: Claude session persistence/binding remains unchanged. No V2 session adapter exists.

### CLAUDE-SDK-006 — Intrinsic Team tools are ready in turn 1

```text
Team-bound Claude Agent launch
  -> RuntimeAgentToolExposure
  -> AgentToolMcpSessionService descriptor
  -> Claude Agent Tools HTTP MCP materializer(alwaysLoad:true)
  -> query options.mcpServers
  -> latest SDK waits for this required server
  -> turn-1 get_handoff_rules/send_message_to/delegate_task availability
```

Owner: AutoByteus Agent Tools MCP materializer owns the one required flag. Claude SDK owns connection mechanics.

### CLAUDE-SDK-007 — Provider event and tool projection

```text
latest native SDK message/tool frame
  -> ClaudeSession ordered content/tool processors
  -> supported ClaudeSessionEvent
  -> canonical AgentRun segment/tool/error lifecycle
  -> Team/standalone/application transport
  -> strict browser/runtime consumer
```

Owner: existing Claude converter/session processors own provider translation. New unrelated SDK variants are ignored, not cast or defaulted into current domain events.

### CLAUDE-SDK-008 — Compatibility and package verification

```text
manifest/lock audit
  -> root import smoke
  -> autobyteus-ts build
  -> server production typecheck
  -> focused Claude/MCP unit and integration tests
  -> isolated live now/next capability probes
  -> imported Nested Classroom Claude row
```

Owner: implementation checks first; later API/E2E owns the no-skip live proof and redacted evidence.

## 6. File And Responsibility Mapping

| Change | File / area | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-server-ts/package.json` | Pin Agent SDK `0.3.231`, Anthropic SDK `0.116.0`, and MCP SDK `1.30.0`. |
| Modify | `autobyteus-ts/package.json` | Pin shared Anthropic SDK `0.116.0` and MCP SDK `1.30.0`. |
| Modify | `pnpm-lock.yaml` | Resolve the exact mutually compatible package graph and current platform package once. |
| Modify | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.ts` | Mark only the server-owned intrinsic Agent Tools HTTP MCP server `alwaysLoad:true`. |
| Preserve/verify | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Keep the wrapper stable and pass complete env/query/resume/options including `abortController`; do not expose `Query.interrupt()` or an interrupt receipt as the active product-turn mechanism. Unrelated query-control cleanup, if retained for model discovery, cannot be called by AgentRun/session interruption. |
| Preserve and verify | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` plus backend/event conversion files | Continue one query per explicit AgentRun start; preserve AbortController abort, approval flush, exact execution settlement, query-reference cleanup, active-state clear, and canonical interrupted terminal order; use no provider queue or Query-interrupt fallback. |
| Modify | focused dependency/Claude/MCP tests | Prove exact option shapes, first-turn intrinsic MCP, resume, interrupt, event admission, and no streamInput/priority policy. |
| Modify | nested-classroom live validation/evidence | Record exact SDK/peer/executable versions and prove API-F-025 through latest SDK with AgentRun-owned later-turn dispatch. |

No new generic dependency service, provider capability registry, streaming-input coordinator, provider queue mapper, or application migration file is added.

## 7. Removal And Forbidden Shortcuts

- Remove the stale `0.2.71`, `0.78.0`, and MCP `1.25.x`/`1.26.x` direct/lock resolutions from the target package graph.
- Do not call `streamInput()` from AgentRun, Claude backend, Team routing, or collaboration code.
- Do not map `priority:"now"` to `append_to_active_turn`; it interrupts the active work.
- Do not map `priority:"next"` to exact append; it is provider-owned later-turn queueing.
- Do not keep both an AgentRun FIFO and a Claude SDK user-message queue.
- Do not consume provider `command_lifecycle` as the canonical AgentRun input lifecycle.
- Do not call `Query.interrupt()` or consume an SDK interrupt receipt for the active one-string-query product path; do not add a Query-interrupt/AbortController fallback. Preserve the singular `Options.abortController` -> abort -> settlement -> established cleanup -> canonical interrupted sequence.
- Do not add version sniffing, old/new SDK adapters, event aliases, fallback parsers, or dual query modes.
- Do not restore blocking MCP behavior through `MCP_CONNECTION_NONBLOCKING=0`; set `alwaysLoad:true` at the one server-owned required MCP descriptor.
- Do not introduce application/database migration or persisted-runtime conversion for a package-only update.
- Do not broaden the ticket to unrelated new Agent SDK features.

## 8. Persisted-Data Decision

`Not Affected`.

The dependency cut changes no stored schema or durable identity. Existing provider session IDs continue through `options.resume`; AgentRun input admission remains deliberately non-persisted. No migration, compatibility reader, or data rewrite is permitted.

## 9. Verification Contract

### Package and static checks

1. Both manifests contain the exact target direct versions and `pnpm-lock.yaml` contains one compatible resolution set.
2. Installed Agent SDK metadata reports `0.3.231`, Claude Code parity `2.1.231`, and peers satisfied by exact installed direct versions.
3. Root imports of `query`, `getSessionMessages`, and `createSdkMcpServer` succeed.
4. `autobyteus-ts` build and server production TypeScript typecheck pass.
5. Source scans prove no project `TodoWrite` dependency, removed V2 session API, `streamInput`, SDK priority scheduling, second Claude input queue, or legacy MCP blocking environment switch.

### Focused runtime checks

1. Query option tests prove complete `env`, optional `resume`, selected executable, and `mcpServers` shape.
2. Agent Tools MCP materializer tests prove `alwaysLoad:true` only on the intrinsic server.
3. Session/backend tests prove one `query(prompt:string)` per AgentRun `start_turn`, no provider call for active waiting input, and the exact interrupt order: pending approval flush precedes `AbortController.abort()`; canonical `TURN_INTERRUPTED` and AgentRun drain follow active query settlement plus established registered-query/reference cleanup; `Query.interrupt()` and interrupt receipts are not called/consumed; resume remains unchanged.
4. Converter tests use representative current `0.3.231` messages and prove established segment/tool/error meaning without guessed fallthrough for unrelated new variants.
5. Isolated live probes retain redacted evidence that `now` interrupts and `next` queues, while neither accepts an exact active turn ID.
6. The imported Nested Classroom Claude row records exact dependency and selected executable versions, completes the task-peer reverse reply through AgentRun-owned later-turn dispatch, and uses the intrinsic Team tools on the first turn.

## 10. Design-Health Conclusion

- Change posture: dependency upgrade plus evidence-backed capability decision.
- Root-cause classification: `No Design Issue Found` for the SDK adapter shape; `Boundary Or Ownership Issue` remains correctly solved by SR-026 at AgentRun, not by adopting a provider queue.
- Refactor needed now: one bounded dependency/configuration cut only.
- Why: exact compatible versions, one required first-turn MCP flag, and focused adapter verification fit the existing Claude boundary. A persistent SDK input stream would duplicate AgentRun ordering and interruption ownership without providing exact-turn append.
