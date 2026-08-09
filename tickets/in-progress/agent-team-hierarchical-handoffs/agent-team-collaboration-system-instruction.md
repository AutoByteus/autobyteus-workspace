# AgentTeam Collaboration System Instruction

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-collaboration-system-instruction.md`
- Type: Exact implementation-copy and provider-injection contract
- Scope: Every Team-bound AgentRun across AutoByteus, Codex App Server, and Claude Agent SDK
- Status: `Refined — SR-014 user-approved implementation copy; no architecture impact`
- Approval applicability: The user explicitly requested natural Agent-facing language, approved the filesystem-like explanation-first order, and required this exact reusable block to be written to a file for implementation.
- Related requirements: R-012–R-014, R-021
- Related acceptance criteria: AC-013, AC-019, AC-043

## 1. Authority

This file is the authoritative wording for the Team collaboration system-instruction block. Other solution artifacts define behavior and ownership but must not maintain a second copy of the complete rendered prose.

Implementation shall use one shared renderer and replace only `{{member_address}}` with the calling Agent's canonical absolute `AgentTeamAddress`. Provider adapters may apply their required outer message/container representation and line-ending normalization, but must not paraphrase, reorder, weaken, or selectively omit the block.

## 2. Exact Renderer Template

```text
You are working as a member of an AgentTeam. Agents and AgentTeams use filesystem-like logical addresses to communicate. These addresses identify Team members; they are not real filesystem paths.

Your address in the AgentTeam is:

{{member_address}}

Addresses beginning with `/` start from the root AgentTeam. Addresses beginning with `./` start from your current AgentTeam, similar to relative filesystem paths.

For example:

- `./architecture_reviewer` addresses a member named `architecture_reviewer` in your current AgentTeam.
- `./implementation_team` addresses a child AgentTeam named `implementation_team`.
- `/requirements_engineering/requirements_lead` is an absolute address from the root AgentTeam.

Sending a message to an AgentTeam address delivers it to that Team's configured coordinator. Bare member names, `../`, and backslashes are not valid addresses.

When you finish your work or are blocked, call `get_handoff_rules` to check your configured handoff rules. Each returned rule tells you when a handoff applies and provides the `recipient_address` to notify.

If a rule applies, use `send_message_to` to notify that Agent or AgentTeam. If several applicable rules have the same recipient, send one message that combines the relevant reasons. Follow distinct recipients in the order they first appear. If no rule applies, finish normally.

Do not say that you completed a handoff unless `send_message_to` confirms that the message was delivered.
```

## 3. Provider Injection Contract

| Runtime | Required injection seam | Required outcome |
| --- | --- | --- |
| AutoByteus | Server-owned Team-member system-prompt composition before AgentRun execution | The rendered block is part of the Team member's system instruction. |
| Codex App Server | Team-member thread bootstrap system/developer-instruction seam | The rendered block is present before task/user content and retains the exact wording. |
| Claude Agent SDK | Established Team-member system-instruction composition seam used for each provider session/turn | The rendered block is system guidance, not user task content, and retains the exact wording. |

The same contract applies to persistent, restored, task-Agent, and task-AgentTeam member executions whenever they carry a Team collaboration binding. A standalone non-Team Agent does not receive this block merely because it uses one of these runtimes.

## 4. Composition And Exclusions

1. Team runtime intrinsically exposes `get_handoff_rules` and `send_message_to` before the provider consumes this block; the instruction must never advertise unavailable Team tools.
2. Render `{{member_address}}` from the exact caller collaboration context. Do not reconstruct it from a name, route key, member path, task label, or provider session.
3. Do not inject the full rooted topology, a flat member roster, `allowedRecipientNames`, synthetic Team representatives, or the natural-language handoff set.
4. `get_handoff_rules` remains the only Agent-facing source of the caller's ordered configured handoff choices.
5. The illustrative addresses teach syntax only. They do not assert that those members exist in every TeamRun.
6. Do not append legacy `recipient_name`, `recipient_path`, bare-name, `../`, or representative instructions.
7. Keep exact-run `target_agent_run_id` guidance operation-specific and separate; it must not change or dilute this logical-address/handoff block.

## 5. Verification Seams

Durable provider coverage must prove:

- exact rendered-text parity across AutoByteus, Codex App Server, and Claude Agent SDK after substituting the same `member_address`;
- one block per Team-bound provider instruction composition, with no duplicate copy;
- correct caller address for persistent, restored, task-Agent, and task-AgentTeam members;
- intrinsic availability of both named Team tools wherever the block is present;
- absence from standalone non-Team Agents;
- absence of a full roster/topology/rule-set injection and all removed selector language; and
- the completion and blocked cases both retrieve rules, apply distinct destinations once in returned order, combine same-recipient reasons, finish normally on an empty/non-applicable set, and claim delivery only after an accepted `send_message_to` result.
