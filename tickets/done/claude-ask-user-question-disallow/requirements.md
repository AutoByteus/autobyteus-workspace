# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Prevent Claude Agent SDK runs launched by AutoByteus from exposing Claude Code's built-in `AskUserQuestion` tool, because it causes interruptive structured clarification-question UI/tool calls in user sessions. The change should hide that built-in tool from Claude's context without weakening or enumerating the rest of AutoByteus' existing Claude tool surface.

## Investigation Findings

- Official Claude Agent SDK documentation distinguishes tool availability from permission/pre-approval.
- A bare `disallowedTools` entry, such as `"AskUserQuestion"`, removes a built-in tool from Claude's context. Scoped `disallowedTools` rules only deny matching calls and leave the tool visible.
- The Agent SDK `tools` option can also restrict built-in availability, but using it would require enumerating all desired Claude built-ins and risks accidentally omitting built-ins AutoByteus wants to preserve.
- The docs state MCP tools are unaffected by the built-in `tools` availability list; AutoByteus MCP tools such as `mcp__autobyteus_team__send_message_to` are supplied through `mcpServers` and pre-approved through `allowedTools`.
- Current AutoByteus Claude launch code passes `allowedTools` and `mcpServers`, but does not pass `tools` or `disallowedTools`.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): No
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: `ClaudeSdkClient.buildQueryOptions` already owns Claude SDK launch options. `resolveClaudeSessionToolingOptions` already owns AutoByteus allowed tool pre-approval names. The missing behavior is a single SDK launch option that hides one vendor built-in tool globally.
- Requirement or scope impact: Keep this as a narrow Claude SDK configuration change. Do not introduce a new product setting unless future users need a toggle.

## Recommendations

Add a bare `disallowedTools: ["AskUserQuestion"]` entry to the Claude Agent SDK query options produced by AutoByteus. Keep existing `allowedTools` and `mcpServers` behavior unchanged.

## Scope Classification (`Small`/`Medium`/`Large`)

Small

## In-Scope Use Cases

- UC-001: A normal Claude Agent SDK run should no longer show/use the `AskUserQuestion` built-in clarification tool.
- UC-002: Claude team/member runs should retain AutoByteus MCP tools, including `send_message_to`, browser tools, media tools, task delegation, and published artifacts when configured.
- UC-003: Existing `allowedTools` pre-approval behavior should continue to work.

## Out of Scope

- Adding a user-facing toggle for `AskUserQuestion`.
- Replacing Claude plan mode or changing Anthropic model prompting.
- Enumerating every Claude built-in via `tools`.
- Changing AutoByteus/Codex tool exposure.

## Functional Requirements

- REQ-001: AutoByteus Claude Agent SDK query options MUST include a bare `disallowedTools` entry for `AskUserQuestion`.
- REQ-002: The change MUST NOT replace the existing `allowedTools` or `mcpServers` option construction.
- REQ-003: The implementation MUST preserve existing configured AutoByteus MCP tool availability and pre-approval names.
- REQ-004: The behavior MUST be covered by unit test expectations around Claude SDK query option construction.

## Acceptance Criteria

- AC-001: A unit test verifies `startQueryTurn` passes `disallowedTools: ["AskUserQuestion"]` to the SDK `query` call.
- AC-002: Existing tests that assert `allowedTools` includes AutoByteus tool names such as `send_message_to` and `mcp__autobyteus_team__send_message_to` still pass.
- AC-003: No code path introduces a restrictive `tools` allowlist for Claude built-ins as part of this change.
- AC-004: The implementation remains localized to the Claude SDK launch/configuration path plus tests.

## Constraints / Dependencies

- Depends on Anthropic Claude Agent SDK support for `disallowedTools` bare-name availability control.
- `AskUserQuestion` must be spelled exactly as the Claude built-in tool name.
- AutoByteus MCP tools are separate from Claude built-ins and should remain controlled by `mcpServers` plus `allowedTools`.

## Assumptions

- AutoByteus product policy should disable `AskUserQuestion` globally for Claude Agent SDK runs rather than make it user-configurable in this ticket.
- The local SDK version accepts `disallowedTools` in query options as documented by Anthropic.

## Risks / Open Questions

- Risk: If an older installed SDK version ignores `disallowedTools`, the option may be harmless but ineffective. The existing dependency is `@anthropic-ai/claude-agent-sdk` and should be validated by tests/compile where possible.
- Open question: None blocking.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001 |
| REQ-002 | UC-002, UC-003 |
| REQ-003 | UC-002, UC-003 |
| REQ-004 | UC-001, UC-002, UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves the built-in is hidden at SDK launch. |
| AC-002 | Proves AutoByteus tools are not accidentally removed. |
| AC-003 | Guards against the risky full built-in allowlist approach. |
| AC-004 | Keeps the implementation proportionate to the simple configuration change. |

## Approval Status

User explicitly confirmed the desired approach on 2026-06-06: disallow `AskUserQuestion` so it does not appear in Claude context, and requested the task be kicked off.
