# System Skill Decision Analysis

## Status

Selected direction — no first-class system/operating skill kind. The concise Bash operating convention is system-prompt content; ordinary configured skills remain one lazy model.

## Decision Question

Does AutoByteus need a first-class `system` skill kind, or can it keep one ordinary lazy skill model while the system prompt contains only necessary non-inferable run facts?

## Options

| Option | Shape | Benefits | Costs / Risks |
| --- | --- | --- | --- |
| A. First-class system skills | Trusted server provider registers `kind: system`; ordinary sources default to task | Explicit catalogs and ownership; supports validated task-to-system dependencies | New model/provider/configuration concepts, dependency semantics, collision rules, exposure policy, UI/API/coverage work; risks promoting generic advice into a privileged category |
| B. Put foundational skill bodies in the system prompt | Eagerly embed content such as `shell-first-operating-practice` | Always available; no lazy activation decision | Large immutable prompt, token cost, stale content, conflicts with task skills and provider/tool guidance, repeats model-trained behavior, violates the approved minimal-prompt principle |
| C. One ordinary lazy skill model | Keep all skill packages as `skill`; descriptions determine applicability; multiple configured skills may cooperate | No new taxonomy; preserves lazy updates; cross-domain operating skills can already accompany domain skills; simplest ownership | No explicit “system” label or dependency graph; composition is instruction-led rather than type-enforced |

## Recommendation

Choose **Option C**. Do not introduce a first-class system- or operating-skill kind in this ticket.

The prior lazy-skill contract already supports the behavior:

- A domain skill applies to the domain task.
- A cross-domain operating skill can also apply to the same task.
- Each applicable skill is read when its governed work is needed.
- No special kind is necessary for the agent to use more than one skill.

## `shell-first-operating-practice` Assessment

Source inspected:

- `/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice/SKILL.md`
- `/Users/normy/autobyteus_org/autobyteus-skills/shell-first-operating-practice/optimization-analysis.md`

The package is cross-domain, but its complete body should not be embedded in the system prompt:

- It is long and eagerly binding.
- Much of it restates general model behavior: understand, inspect, plan, verify, report, keep work scoped, and use common shell command families.
- Some rules are preferences rather than universal platform facts, such as preferring shell edits over dedicated file tools.
- Some rules can conflict with domain workflows, such as “do not create branches unless explicitly requested” when a software workflow requires automatic worktree isolation.
- Its mandatory first `pwd` action is unnecessary after the runtime explicitly supplies the workspace and can reinforce the workspace/skill-folder confusion instead of solving it.

Recommended ownership by content:

| Content | Owner |
| --- | --- |
| Configured workspace identity and workspace-versus-skill-package separation | Working Environment system-prompt section |
| Exact `cwd`, `base_dir`, authorization, and tool invocation behavior | Tool schemas/runtime |
| Bash-first interface selection plus concise deterministic, non-interactive, composable, and project-native command conventions | Always-present Bash Operating Practice system-prompt section |
| Intent-led discovery, bounded/format-aware inspection, narrow editing, guarded filesystem mutation, and fitting verification | Always-present File And Directory Practice system-prompt section |
| Task- or repository-specific command recipes and operating techniques beyond those fixed practices | Applicable ordinary configured skill |
| Repository/worktree/branch behavior for software delivery | Applicable software task skill |
| Generic reasoning and common command knowledge already learned by the model | Omit |

## Consequence For Structured Prompt

Selected consequence:

- Do not create separate `## System Skills` or `## Operating Skills` sections.
- Use one conditional `## Skills` catalog or provider-native equivalent. Do not render an `Available Tools` section; current runtimes expose tool schemas out-of-band.
- Keep skill entries as name, description, and exact manifest path.
- Preserve the existing rule that multiple applicable configured skills may be used and read lazily.

The logical order becomes:

1. Agent Identity.
2. Optional Team Instruction.
3. Optional Team Runtime.
4. Working Environment.
5. Bash Operating Practice.
6. File And Directory Practice.
7. Optional Skills or provider-native equivalent.

## Trigger For Reconsidering A System Kind

Revisit a first-class system-skill kind only when an evidenced requirement needs at least one of:

- server-enforced task-to-technique dependencies;
- privileged platform ownership that ordinary packages must not claim;
- different authorization, lifecycle, or distribution semantics from ordinary skills;
- reliable behavior that cannot be expressed by configuring multiple ordinary lazy skills.
