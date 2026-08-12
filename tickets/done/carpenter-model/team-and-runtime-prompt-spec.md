# Team Instruction And Team Runtime Prompt Specification

## Status

Approved intended-behavior authority — approved with `requirements.md` on 2026-08-12, including the same-day automatic team-tool clarification.

## Decision

There is no open-ended `## Runtime Instruction` bucket in the carpenter model.

The current runtime-generated instruction content is specifically about an agent's execution inside a team. Name that section `## Team Runtime` and restrict it to framework-derived team membership, communication, and task-delegation facts.

The two optional sections have different owners:

- `## Team Instruction` is authored team policy from the selected team definition.
- `## Team Runtime` is generated current-run state and protocol from validated `MemberTeamContext`.

Neither section may be used as a miscellaneous place for provider documentation, tool schemas, workspace facts, skill instructions, task packets, or generic behavioral advice.

## Team Instruction

### Exact Shape

```md
## Team Instruction

{{team_instruction_body}}
```

### Source And Rendering

- `{{team_instruction_body}}` is exactly the non-blank `AgentTeamDefinition.instructions` value parsed from the body of the selected `team.md`.
- Render the section only for a team run whose selected team definition has a non-blank instruction body.
- Trim surrounding blank space once; preserve authored content while applying the deterministic heading-containment rule in `prompt-value-binding-spec.md` so authored headings remain beneath Team Instruction.
- A confirmed blank body omits the section. Failure to resolve the selected team definition is a bootstrap error, not evidence of a blank body.
- Render the body once. Do not prepend the team name or description and do not copy team configuration into it.
- Team frontmatter name is runtime identity used by the team roster. Team description and category remain definition/catalog metadata and are not automatically injected.
- Standalone agent runs have no Team Instruction section.

### Content Boundary For Authors

The `team.md` body may define only stable team-wide coordination policy, such as:

- the shared outcome owned by the team;
- ordering or handoff constraints among members;
- team-wide artifact and review responsibilities;
- stable boundaries that apply to every run of that team.

It must not contain current member names derived from a run, current recipient availability, generated rosters, active run IDs, tool schemas, workspace paths, or task-instance payloads. Those facts are generated elsewhere.

## Team Runtime

### Exact Outer Shape

```md
## Team Runtime

Current team member: {{member_name}}
```

Render `## Team Runtime` for every team member run and omit it for standalone runs. After the current-member line, append the fixed communication contract/roster and fixed task-assignment contract/target roster below. These names are collaboration protocol text, not an Available Tools catalog. Runtime provisioning separately guarantees provider-native `send_message_to` and `delegate_task` for every valid team member context.

### Current Member

- Source: `MemberTeamContext.memberName`.
- Exact line: `Current team member: {{member_name}}`.
- This is the member's current team alias. It does not replace the agent-definition name in Agent Identity.
- Trim and require the value at the composition boundary. A blank member name fails that member's bootstrap before provider invocation.

### Team Communication Block

Render the following fixed rules for every team member run:

```md
If you use `send_message_to`, choose exactly one target selector.
Set `target_agent_run_id` to an exact currently active AgentRun id supplied by a task packet, task event, or prior message when the message must reach that exact live run.
Use `send_message_to` only for actual delivery; plain text does not deliver a teammate or exact-run message.
When sending files the recipient may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files`.
Do not claim delivery unless the tool call succeeds.
```

Insert exactly one of these two fixed sentences immediately after the first line:

1. When logical recipient delivery is enabled and at least one communication recipient exists:
   **Set `recipient_name` to one allowed roster name for a logical teammate.**
2. When logical recipient delivery is enabled but no communication recipient exists:
   **No logical `recipient_name` roster recipients are currently listed for this run.**
An invalid team context without its required message-delivery binding fails bootstrap; it does not produce an unavailable-tool warning. Reuse `buildTeamMembershipRosterManifest` as the roster data owner and render its membership/messageability portion. The exact target renderer contract is:

- Start with `Team membership roster`, then `You are: ` followed by `manifest.currentMemberName`.
- For each `manifest.teams` entry, render its ordinal and `team.teamName`, then `Your role: ` followed by `team.currentMemberRole`.
- Render each team member with `member.memberName` and only the badges already present in `member.badges`/`member.representsTeamName`.
- Render `You can message:` only for members whose renderer row is messageable and has a non-blank `recipientName`.
- Do not append the current renderer's final selector/allowlist footer. The communication contract immediately above already gives the selector rule, while each team's `You can message:` rows provide the applicable logical recipient names without repeating it.

Roster inputs come only from `MemberTeamContext.teamName`, `teamDefinitionId`, `memberName`, `memberRouteKey`, `coordinatorMemberRouteKey`, `communicationRecipients`, `allowedRecipientNames`, and parent-boundary representation data. Exact derivations and fallbacks are in `prompt-value-binding-spec.md`. Do not discover or infer extra recipients.

### Task Delegation Block

For every team member run, reuse `buildDelegationTargetRosterManifest` and `renderDelegationTargetRosterManifest` over current `MemberTeamContext.members`. The renderer starts with `You can delegate tasks with delegate_task:`. Each member row uses its `targetName` as both target and accountable owner. Each team row uses its `targetName` as target and accountable owner and its `ingressCoordinatorName`, or the literal `unresolved` when that value is absent.

Exclude the current member from member targets. If no target exists, render:

```md
You can delegate tasks with delegate_task:
- No delegate_task targets are currently available from this run.
```

Then render this fixed assignment protocol under `Task delegation protocol`:

```md
Task delegation protocol
- Use `delegate_task` to assign one bounded ready-to-run task to an explicit target object: `{ target: { kind: "member" | "team", name }, description, reference_files? }`. The `description` is task-centered content: objective, context, constraints, done conditions, expected output, and reference guidance for the task itself.
- Task-delegation `reference_files` must be absolute local file paths. Use full paths returned by file-writing tools or run `realpath <file>` before passing references; relative paths and URLs are rejected.
- Member targets are physical current-team agent members. Team targets are visible current-team teams/subteams; the team is accountable and the listed ingress coordinator receives the initial packet.
- To assign multiple independent tasks, call `delegate_task` separately for each task.
- Activated task-agent or task-team executions receive task details directly in a work packet. The framework marks them active/running internally; do not report in_progress.
```

`submit_task_result` and `review_task_result` are not part of the two always-provisioned team tools and are not described in the fixed carpenter Team Runtime. Task-execution packets/events and their existing lifecycle provisioning remain their owners.

## Explicit Exclusions

Do not place any of the following in Team Instruction or Team Runtime:

- agent-definition identity or responsibilities;
- workspace identity or skill-package path semantics;
- Bash or file/directory practices;
- tool definitions, schemas, or an Available Tools catalog;
- skill metadata or `SKILL.md` bodies;
- provider model name, permission mode, sandbox details, date, timezone, or filesystem policy unless a future approved requirement gives one of those facts its own explicit section and owner;
- user task text, task packets, inter-agent message bodies, or current conversation state.

## Provider Projection

- Native AutoByteus projects the complete carpenter Markdown through `AgentConfig.systemPrompt`; Codex projects it through `baseInstructions`.
- Claude Agent SDK projects the same complete Markdown through the query `options.systemPrompt` custom string. The user-turn `prompt` contains only the user message and context-file references, not repeated Team/Agent/Runtime wrappers.
- Provider projection may change transport placement, not section meaning, source, trigger, wording, or ordering.
- Provider tool projection remains separate: native sends schemas through its provider tool field; Codex and Claude use their existing provider-native/MCP configuration. Prompt composition neither reads nor creates an MCP descriptor.

## Related Authority

- Consolidated prompt: `system-prompt-contract.md`
- Requirements: `BEH-004`, `BEH-008`, `BEH-011`; `R-004`, `R-010`, `R-013`; `AC-004`, `AC-010`, `AC-013`
- Current evidence: `MemberTeamContext`, `composeMemberRunInstructions`, `renderTeamMembershipRosterManifest`, and `renderDelegationTargetRosterManifest` recorded in `investigation-notes.md`
- Dynamic bindings: `prompt-value-binding-spec.md`
