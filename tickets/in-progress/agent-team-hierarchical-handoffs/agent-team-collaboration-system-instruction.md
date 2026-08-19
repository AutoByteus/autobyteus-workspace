# AgentTeam Collaboration System Instruction

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md`
- Type: Exact implementation-copy and provider-injection contract
- Scope: Every Team-bound AgentRun across AutoByteus, Codex App Server, and Claude Agent SDK
- Status: `Refined — SR-025 user-approved two-section implementation copy; no architecture impact`
- Approval applicability: The user explicitly approved the concise two-section flow: explain the general filesystem-like AgentTeam address model first, locate the current Agent within that model second, and then explain how the Agent uses addresses for communication, delegation, and completion handoffs. The user directed this exact copy to implementation without another architecture-review round.
- Related requirements: R-012–R-014, R-021
- Related acceptance criteria: AC-013, AC-019, AC-043

## 1. Authority

This file is the authoritative wording for the two sibling AgentTeam system-instruction sections. Other solution artifacts define behavior and ownership but must not maintain a second copy of the complete rendered prose.

Implementation shall use one shared renderer and replace only `{{member_address}}` with the calling Agent's canonical absolute `AgentTeamAddress`. The prompt composer shall insert the rendered sections after the optional authored Team instruction and before the working-environment section. It shall not wrap them in a vague `## Team Runtime` heading. Provider adapters may apply their required outer message/container representation and line-ending normalization, but must not paraphrase, reorder, weaken, or selectively omit either section.

## 2. Exact Renderer Template

```text
## AgentTeam Addressing

AgentTeams use filesystem-like logical addresses. Think of an AgentTeam as a directory, an Agent inside it as a file, and a nested AgentTeam as a subdirectory. This analogy describes the Team structure and addressing model only; the addresses are not real filesystem paths.

An address beginning with `/` starts from the root AgentTeam. An address beginning with `./` starts from your immediate AgentTeam—the Team that directly contains you. Bare names, `../`, and backslashes are invalid.

Within this structure, your address is:

{{member_address}}

For example:

- `./architecture_reviewer` identifies an Agent in your immediate AgentTeam.
- `./implementation_team` identifies a nested AgentTeam in your immediate AgentTeam.
- `/requirements_engineering/requirements_lead` identifies an Agent using an absolute address from the root AgentTeam.

An AgentTeam address identifies the Team itself. Sending a message to that address delivers it to the Team's configured coordinator.

## AgentTeam Collaboration

Use `send_message_to` with `recipient_address` to send a message to an Agent or AgentTeam.

`delegate_task` uses the same address format, but its recipient must be a direct Agent or AgentTeam child of your immediate AgentTeam. Message delivery may address deeper or cross-branch recipients.

When you finish your work or are blocked, call `get_handoff_rules`. If a returned rule applies, notify its `recipient_address` using `send_message_to`. Combine applicable reasons for the same recipient and follow distinct recipients in their returned order. If no rule applies, finish normally.

Do not claim that a handoff was completed unless `send_message_to` confirms delivery.
```

## 3. Provider Injection Contract

| Runtime | Required injection seam | Required outcome |
| --- | --- | --- |
| AutoByteus | Server-owned Team-member system-prompt composition before AgentRun execution | Both rendered sections are part of the Team member's system instruction. |
| Codex App Server | Team-member thread bootstrap `baseInstructions` seam | Both rendered sections are present before task/user content and retain the exact wording. |
| Claude Agent SDK | Team-member query/session `systemPrompt` seam | Both rendered sections are system guidance, not user task content, and retain the exact wording. |

The same contract applies to persistent, restored, task-Agent, and task-AgentTeam member executions whenever they carry a Team collaboration binding. A standalone non-Team Agent does not receive this block merely because it uses one of these runtimes.

## 4. Composition And Exclusions

1. Team runtime intrinsically exposes `get_handoff_rules`, `send_message_to`, and `delegate_task` before the provider consumes these sections; the instruction must never advertise unavailable Team tools.
2. Render `{{member_address}}` from the exact caller collaboration context. Do not reconstruct it from a name, route key, member path, task label, or provider session.
3. Do not inject the full rooted topology, a flat member roster, `allowedRecipientNames`, synthetic Team representatives, or the natural-language handoff set.
4. `get_handoff_rules` remains the only Agent-facing source of the caller's ordered configured handoff choices.
5. The illustrative addresses teach syntax only. They do not assert that those members exist in every TeamRun.
6. Do not append legacy `recipient_name`, `recipient_path`, bare-name, `../`, or representative instructions.
7. Keep exact-run `target_agent_run_id` guidance operation-specific and separate; it must not change or dilute this logical-address/handoff block.

## 5. Verification Seams

Durable provider coverage must prove:

- exact rendered-text parity across AutoByteus, Codex App Server, and Claude Agent SDK after substituting the same `member_address`;
- exactly one `## AgentTeam Addressing` section followed by one `## AgentTeam Collaboration` section per Team-bound provider instruction composition, with no `## Team Runtime` wrapper or duplicate copy;
- correct caller address for persistent, restored, task-Agent, and task-AgentTeam members;
- intrinsic availability of all three named Team tools wherever the sections are present;
- absence from standalone non-Team Agents;
- absence of a full roster/topology/rule-set injection and all removed selector language; and
- the completion and blocked cases both retrieve rules, apply distinct destinations once in returned order, combine same-recipient reasons, finish normally on an empty/non-applicable set, and claim delivery only after an accepted `send_message_to` result.
