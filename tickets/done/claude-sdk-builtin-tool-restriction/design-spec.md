# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline: `requirements-doc.md` SR-001 basis (REQ-001..006, AC-001..007). User approval 2026-09-24 ("sounds good. i approved your proposed plan. lets do it."). SR-002 is an evidence-only refinement (DEC-003).
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/investigation-notes.md`

## Current-State Read

Every normal Claude turn flows `ClaudeSession.executeTurn` → `ClaudeSdkClient.startQueryTurn` → `ClaudeSdkClient.buildQueryOptions` → SDK `query({prompt, options})`. `buildQueryOptions` is the single owner of the provider launch-option object. It already holds the AutoByteus built-in-tool policy as the local constant `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS = ["AskUserQuestion"]` and emits `disallowedTools`. It emits no `tools`, so Claude Code falls back to its default preset. That preset contains the native multi-agent tools (investigation P-2/P-3/P-5). The model-discovery path (`resolveContextCapacities`) builds its own options with `tools: []` and is unaffected. There is no structural problem: the policy already has the right owner and only its content and shape change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one source file (two local constants plus one emitted option), one unit-test file (three assertions updated or extended) and one docs paragraph. No new modules, types or call sites.
- Architectural risk: `Low`
- Risk rationale: the change is internal to the existing provider-option owner. There is no shared contract, persistence, API, concurrency, deployment or ownership-boundary change. It reduces the tool surface. Runtime behavior was verified against the real Claude Code CLI on the pinned SDK 0.3.280 and on 0.3.281 (P-3..P-5), including MCP tool execution and skills. The residual risk is a future SDK tool rename (R-001).
- Escalation trigger: return a `Design Impact` if implementation or validation finds (a) a server/web feature that depends on an excluded built-in, (b) that the `tools` option filters AutoByteus MCP tools or skills in some configuration, or (c) a mismatch between the pinned SDK's tool names and the list.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| SDK typings | `sdk.d.ts` `Options.tools` / `disallowedTools` | `tools` sets the base built-in set. `disallowedTools` removes from context and blocks execution, including internal calls. | Use both | None |
| Probe P-3/P-5 | `probe-evidence/v280-*.json`, `v281-*.json` | The explicit list yields exactly 10 built-ins + all MCP tools, with no agent listing | REQ-001/003/004 realized by `tools` | None |
| Probe P-4/P-5 | `v280-approved-aliases.json`, `v281-approved.json` | Blocked names error on call | REQ-002/003 | None |
| Code grep | `file-change-tool-semantics.ts`, `claude-session-tooling-options.ts` | Only `Write`/`Edit`/`MultiEdit`/`NotebookEdit`/`Skill` are special-cased | Safe exclusion list | `MultiEdit` is not in the SDK tool set; the mapping stays harmless |
| Prior ticket | `tickets/done/claude-ask-user-question-disallow/*` | Rejected an allowlist for that ticket's scope | Superseded (DEC-004); update test + docs | None |

## Intended Change

In `ClaudeSdkClient`, replace the implicit "default preset minus `AskUserQuestion`" with an explicit built-in policy:

```ts
/** Claude Code built-in tools exposed to AutoByteus Claude turns. AutoByteus MCP tools are unaffected. */
const CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS = [
  "Bash", "Read", "Edit", "Write", "Glob", "Grep",
  "NotebookEdit", "WebFetch", "WebSearch", "Skill",
] as const;

/** Safety net: stay hidden even if the enabled list is widened. Native multi-agent tools are replaced by AutoByteus delegate_task/send_message_to. */
const CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS = [
  "AskUserQuestion", "Agent", "Task", "Workflow", "SendMessage", "ListAgents",
] as const;
```

`buildQueryOptions` emits `tools: [...CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS]` next to the existing `disallowedTools: [...CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS]`. Nothing else changes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing Behavior / Evidence | Approved Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-002 / AC-001, AC-002, AC-003 | Any normal Claude turn | Default preset minus `AskUserQuestion` (P-3) | Explicit 10 built-ins + safety-net disallow list | DS-001 at `buildQueryOptions` |
| BEH-002 | Contract | REQ-003 / AC-003 | Same | Agent listing present | Absent (follows from `Agent` being unavailable) | DS-001 |
| BEH-003 | System | REQ-003 / AC-003 | Model emits a native multi-agent tool_use | Executes | Errors | DS-001 (enforced by Claude Code) |
| BEH-004 | Contract | REQ-002 / AC-002 | Same as BEH-001 | `AskUserQuestion` hidden | Preserved | DS-001 |
| BEH-005 | Contract | REQ-004, REQ-005 / AC-004..006 | Same | MCP/allowedTools/skills/model discovery | Preserved | DS-001 unchanged fields; DS-002 untouched |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | REQ / AC | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probe-evidence/` | Credential-free runtime probe | AC-003..005 | Verifies the target options against the real CLI; reusable by API/E2E validation | Current, evidence only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`. The previous behavior was a deliberate policy choice (prior ticket), not a defect.
- Refactor needed now: `No`
- Evidence: `buildQueryOptions` is already the single owner of the built-in policy constant and option emission (investigation "Architecture Investigation Findings").
- Design response: extend the existing local policy with an enabled list; keep both constants local and adjacent.
- Refactor rationale: a new module or configurable service would be an empty indirection for two constants used in one place.
- Intentional deferrals and residual risk: R-001, future SDK renames. It is mitigated by the docs note and the reusable probe.

## Terminology

- Enabled built-ins: the value of the SDK `tools` option.
- Safety-net disallow list: the value of the SDK `disallowedTools` option.

## Design Reading Order

Proportionate: sections 4–9 below collapse to one bounded local change.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete items: the implicit default-preset behavior, the unit-test assertions `expect(...options).not.toHaveProperty("tools")` (test file L126, L219) and the docs guidance "Do not replace this default with a Claude SDK `tools` allowlist…" (`docs/modules/agent_execution.md` L438-446). All are removed or replaced in this change. No toggle or fallback to the default preset.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Per-turn launch options only. Existing and resumed Claude sessions get the new tool set on their next turn because every turn calls `query()` with fresh options. Older transcripts that contain past `Agent` calls stay readable; history projection does not depend on the tool being available.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BEH-001..005 | `ClaudeSdkClient.startQueryTurn` | SDK `query({prompt, options})` | `ClaudeSdkClient` | The only place normal-turn options are built |
| DS-002 | Bounded Local | BEH-005 | `ClaudeSdkClient.resolveContextCapacities` | SDK `query` (model discovery) | `ClaudeSdkClient` | Must stay `tools: []`; not touched |

## Primary Execution Spine(s)

`ClaudeSession.executeTurn -> ClaudeSdkClient.startQueryTurn -> buildQueryOptions -> SDK query() -> Claude Code CLI -> Messages API`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Subject Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The session resolves AutoByteus tooling (`allowedTools`, `mcpServers`, `canUseTool`) and calls the client. The client converts it into SDK options and now always adds the constant built-in policy (`tools` + `disallowedTools`). Claude Code enforces both. | Query options | `ClaudeSdkClient` | None new |

## Spine Actors / Main-Line Nodes

`ClaudeSession`, `ClaudeSdkClient`, Claude Code CLI (external).

## Ownership Map

- `ClaudeSdkClient.buildQueryOptions` owns the provider-level built-in tool policy (constant, product-wide) and the option object.
- `ClaudeSession` / `claude-session-tooling-options.ts` owns per-run AutoByteus tool exposure (`allowedTools`, MCP). This is unchanged, and it must not learn about the built-in policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. No facade is involved.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Implicit Claude default built-in preset | Leaks native multi-agent tools, and new SDK tools arrive silently | `tools: CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS` | In This Change | — |
| Unit assertions `not.toHaveProperty("tools")` | Contradict the new policy | Exact `tools` assertions | In This Change | test L126, L219 |
| Docs guidance rejecting a `tools` allowlist | Superseded (DEC-004) | New policy paragraph | In This Change | `agent_execution.md` L438-446 |

## Return Or Event Spine(s) (If Applicable)

N/A. Tool-result/event handling is unchanged. Blocked calls surface as ordinary failed tool results through the existing path.

## Bounded Local / Internal Spines (If Applicable)

DS-001 and DS-002 above.

## Off-Spine Concerns Around The Spine

N/A. No new off-spine concern.

## Ownership Boundaries

The built-in policy is provider-level and stays inside `ClaudeSdkClient`. `ClaudeSdkStartQueryTurnOptions` gets no new field: the policy is a product constant, not a caller input. This matches the prior ticket's accepted boundary for `disallowedTools`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn` | Built-in tool policy, SDK option shape | `ClaudeSession` | Callers passing `tools`/`disallowedTools` themselves | N/A |

## Dependency Rules

- Only `ClaudeSdkClient` references the two constants. Do not export them for session-layer use.
- The session layer must not add built-in names to `tools`. It continues to own only `allowedTools` / MCP.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient.startQueryTurn(options)` | One Claude turn | Launch a query with product policy applied | unchanged | Signature unchanged |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `startQueryTurn` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Enabled list | `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS` | Yes (mirrors the existing `..._DISALLOWED_BY_AUTOBYTEUS`) | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Built-in tool policy | `runtime-management/claude/client` (`ClaudeSdkClient`) | Extend | It already owns the policy |

## Subsystem / Capability-Area Allocation

| Subsystem | Concerns | Spine | Owner | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime Management / Claude SDK Client | Provider option policy | DS-001 | `ClaudeSdkClient` | Extend | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping. A draft pass added nothing beyond it.

## Reusable Owned Structures Check

N/A. There is no repeated structure; two local constants.

## Shared Structure / Data Model Tightness Check

N/A. No shared structure.

## Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude SDK Client | `ClaudeSdkClient` | Add the enabled constant, extend the disallowed constant, emit `tools` in `buildQueryOptions` | Existing option owner | No |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Tests | SDK client contract | Replace `not.toHaveProperty("tools")` (L126, L219) with exact `tools` expectations; update the `disallowedTools` expectation (L204) to the new list | Existing contract test | No |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Docs | — | Rewrite the L438-446 paragraph: explicit enabled built-ins, safety-net list, rationale (AutoByteus replaces native subagents/team messaging), MCP unaffected, re-verify names on SDK upgrade | Existing doc section | No |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `src/runtime-management/claude/client/claude-sdk-client.ts` | File | `ClaudeSdkClient` | Built-in tool policy + option emission | Existing owner | Per-run AutoByteus tool exposure logic |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `runtime-management/claude/client` | Persistence-Provider (provider adapter) | Yes | Low | Unchanged placement |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Where the policy lives | Constants + emission in `buildQueryOptions` | New `startQueryTurn` option field, or adding built-ins inside `resolveAllowedToolNames` | `allowedTools` is auto-approval, not visibility; the policy is a product constant |
| Blocking | `tools` list + bare `disallowedTools` names | Denying in `canUseTool` | `canUseTool` fires after the model already knows about and chose the tool |
| Test | `expect(options.tools).toEqual([...10 names])`, `expect(options.disallowedTools).toEqual([...6 names])` | `arrayContaining` for `tools` | Exactness is the requirement (REQ-001) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Env/config toggle to restore the default preset | Possible user need for extra built-ins | Rejected | Widen the constant in a future approved change |
| Keeping the old `not.toHaveProperty("tools")` test | Prior ticket guard | Rejected | Exact assertions |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. `claude-sdk-client.ts`: add `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS`; extend `CLAUDE_BUILT_IN_TOOLS_DISALLOWED_BY_AUTOBYTEUS` to `["AskUserQuestion","Agent","Task","Workflow","SendMessage","ListAgents"]`; emit `tools: [...ENABLED]` in `buildQueryOptions` (only there; leave `resolveContextCapacities` `tools: []` as is). Add short comments giving the rationale.
2. Update the unit tests (L126, L204, L219 and any other `buildQueryOptions` expectations). Confirm the model-discovery test still asserts `tools: []`.
3. Rewrite the docs paragraph.
4. Run `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude --no-watch`, then the Claude session unit tests and a typecheck/build.

## Key Tradeoffs

- An explicit list excludes future SDK built-ins by default, which is intended: `ListAgents` appeared in 0.3.280 and was excluded automatically. The cost is that deliberately adding a new built-in later requires a code change.
- The safety-net `disallowedTools` is redundant while `tools` is present. It is kept on purpose because the user approved it as a guard against future widening.

## Risks

- R-001: SDK renames a listed tool, so it silently disappears. Mitigations: the docs note, and the reusable probe in `probe-evidence/` for SDK upgrades.
- ASM-001: static description text still mentions "the Agent tool" in Bash/Glob/Grep. The user accepted this.

## Guidance For Implementation

- Keep the change minimal and local. Do not touch `claude-session-tooling-options.ts`, `allowedTools` or the MCP config.
- Order in `tools` does not affect behavior; keep the order listed above for readable tests.
- Validation can reuse `probe-evidence/probe3.mjs` / `probe4.mjs` (no credentials). Point `PROBE_NM` at the worktree's installed `node_modules`, and pass the exact option values produced by `buildQueryOptions`.
