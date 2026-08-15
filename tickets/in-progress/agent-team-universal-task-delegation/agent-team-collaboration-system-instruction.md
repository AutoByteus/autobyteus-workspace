# AgentTeam Collaboration System Instruction

## Artifact Metadata

- Type: Exact implementation-copy and provider-injection contract
- Scope: Every Team-bound AgentRun across AutoByteus, Codex App Server, and Claude Agent SDK
- Status: `User Approved — Exact Copy Unchanged By SR-009`
- Related requirements: R-013–R-014, R-022, R-027
- Related acceptance criteria: AC-019–AC-022, AC-028

## 1. Authority

This file is the authoritative wording for the AgentTeam collaboration system-instruction block. Other solution artifacts may describe its behavior but shall not maintain another complete copy.

One shared renderer replaces only `{{member_address}}` with the calling Agent's canonical absolute `AgentTeamAddress`. Prompt composition inserts the rendered block after any authored Team instruction and before working-environment guidance. Provider adapters may apply their required outer message/container representation and line-ending normalization, but shall not paraphrase, reorder, or selectively omit the block.

## 2. Exact Renderer Template

```text
## AgentTeam Addressing

AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.

Every Agent and nested AgentTeam is identified by one canonical absolute address beginning with `/` at the root AgentTeam. Copy that exact address when a tool asks for `recipient_address`. Relative addresses, bare names, `../`, backslashes, and the structural root `/` itself are not valid recipients.

Your Agent address is:

{{member_address}}

For example, `/requirements_engineering/requirements_lead` identifies one Agent, while `/requirements_engineering` identifies that AgentTeam. Sending a message to an AgentTeam address delivers it through that Team's configured coordinator.

## AgentTeam Collaboration

Use `send_message_to` with `recipient_address` to contact any mounted Agent or AgentTeam in your rooted AgentTeam. When you know an exact active AgentRun ID, you may instead use `target_agent_run_id` to contact that execution directly.

Use `delegate_task` with `recipient_address` to create a fresh dedicated task execution for any mounted Agent or AgentTeam in your rooted AgentTeam, except your own exact Agent address. An AgentTeam task starts a fresh Team execution through its configured coordinator.

When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.

Do not claim that a message or handoff was delivered unless `send_message_to` confirms delivery. Use `submit_task_result` and `review_task_result`—not ordinary message wording—for formal task lifecycle changes.
```

## 3. Provider Injection Contract

| Runtime | Injection seam | Required outcome |
| --- | --- | --- |
| AutoByteus | Server-owned Team-member system prompt composition | Rendered block is present before task/user content. |
| Codex App Server | Team-member thread bootstrap `baseInstructions` | Same rendered block and exact address. |
| Claude Agent SDK | Team-member query/session `systemPrompt` | Same rendered block as system guidance, not user content. |

The contract applies to persistent, restored, task-Agent, and task-Team member executions with a Team collaboration binding. Standalone non-Team Agents do not receive it.

## 4. Composition And Exclusions

1. Team runtime intrinsically exposes `get_handoff_rules`, `send_message_to`, and `delegate_task` before the provider consumes this copy.
2. Render the current address from `MemberTeamContext`; never reconstruct it from name, path array, route key, task label, or provider session.
3. Do not inject the full topology, flat roster, synthetic representatives, or natural-language handoff set.
4. `get_handoff_rules` remains the only Agent-facing source of ordered configured handoff choices.
5. Examples teach syntax only; they do not assert that those nodes exist in every TeamRun.
6. Do not append legacy relative, bare-name, `recipient_name`, `recipient_path`, direct-child, or representative instructions.
7. Exact-run messaging remains live-only and does not change logical recipient resolution or task state.

## 5. Verification Seams

Durable coverage shall prove:

- exact rendered-text parity across all three providers for the same member address;
- exactly one addressing section followed by one collaboration section;
- correct address for persistent, restored, task-Agent, and task-Team Agent contexts;
- absence from standalone Agents;
- absence of relative/direct-child and full-roster copy;
- tool availability wherever the block is injected; and
- correct empty/applicable/multiple handoff behavior without treating handoffs as authorization.
