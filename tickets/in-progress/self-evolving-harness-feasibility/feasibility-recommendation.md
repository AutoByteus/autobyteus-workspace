# Self-Evolving Harness Feasibility Recommendation

## Decision

**Yes, AutoByteus can support self-evolving agents, but the safe target is reviewed harness evolution rather than autonomous self-modifying code or model-parameter evolution.**

The system should let an evolver propose changes to durable harness artifacts from execution evidence, then validate and review those proposals before applying them through existing AutoByteus owner services.

## How the Paper Works

The paper models an agent as:

- a frozen task-solving model/backbone, and
- an editable external harness: prompts, skills, memories, and tools.

The evolution loop is:

1. A task-solving agent runs a batch of tasks with its current harness.
2. The system records execution evidence: trajectories, outputs, scores, failures, and relevant traces.
3. An evolver model receives prior harness state plus evidence.
4. The evolver edits allowed harness artifacts.
5. The next task-solving cycle runs with the updated harness.
6. Evaluation separates update quality from the task agent's ability to exploit those updates.

The paper's key distinction:

- **Harness-updating** = the evolver's ability to create useful persistent updates.
- **Harness-benefit** = the task-solving agent's ability to use the updated harness.

The main finding is not "bigger evolver always wins." Updating capability is relatively flat across model tiers, while benefit depends heavily on the task agent's ability to activate and follow the harness. Weak agents often fail to load the right artifact or fail to adhere to it over long trajectories.

## Mapping to AutoByteus

| Paper Harness Surface | AutoByteus Candidate Surface | Feasibility |
| --- | --- | --- |
| Prompts | `AgentDefinition.instructions`, `AgentTeamDefinition.instructions`, runtime system-prompt processors | Feasible, but approval/versioning needed |
| Skills | `SkillService`, `SkillDiscovery`, configured skill resolver, runtime `load_skill`, workspace skill materializers | Strong MVP candidate |
| Memories | run memory, raw traces, semantic/episodic memory, working context snapshots | Feasible as evidence; durable lesson writes need strict redaction/provenance |
| Tools | tool registry, MCP tool registrar, MCP config service, configured `toolNames` | Proposal-only in MVP; risky to auto-apply |
| Execution evidence | run history projection, raw trace stores, runtime memory recorder/accumulator | Strong evidence substrate |
| Versioning/rollback | skill versioning exists; git/versioning not uniformly present for definitions/memory | Partial; add proposal provenance and rollback pointers |

## Recommended AutoByteus MVP

Create a server-side `SelfEvolutionService` or `HarnessEvolutionOrchestrator` with this spine:

```text
completed run(s)
  -> evidence extractor + redactor
  -> evolver agent/model
  -> typed proposal store
  -> validation gates
  -> human approval
  -> apply via existing owner services
  -> provenance + rollback pointer
  -> next run observes updated harness
```

### MVP Artifact Scope

1. **Skills**
   - Best first target.
   - Propose new or updated `SKILL.md` content.
   - Validate frontmatter/body, name collisions, readonly flags, and configured-agent applicability.
   - Apply through `SkillService`; create versions through `SkillVersioningService`.

2. **Agent/team instructions**
   - Start with diff proposals only.
   - Validate `agent.md` / team config parseability and ownership scope.
   - Apply through `AgentDefinitionService` / `AgentTeamDefinitionService` only after review.
   - Add version/provenance support if not already available.

3. **Memory lessons**
   - Use run memory primarily as evidence.
   - Allow durable lesson append only for explicit scoped targets after redaction.
   - Never copy raw user/project traces into shared prompts/skills without consent.

4. **Tools/MCP**
   - Allow recommendations such as "this agent should add tool X".
   - Do not let an evolver create/register tools or mutate MCP config automatically in MVP.

## Required Safety Gates

- **Scope gate**: proposal target must be an allowed artifact and ownership scope.
- **Evidence gate**: summarize/redact run evidence before evolver access.
- **Parser/schema gate**: generated artifacts must load successfully.
- **Runtime dry-run gate**: affected agent config must assemble successfully.
- **Privacy gate**: block secrets, credentials, sensitive user data, and over-specific run details in shared artifacts.
- **Provenance gate**: store source run IDs, evidence summary/hash, evolver model, target artifact, diff, approver, timestamp, validation results, and rollback pointer.
- **Human approval gate**: no durable apply without approval for MVP.
- **Rollback gate**: every applied update must be reversible.

## Metrics to Track

To avoid confusing "the evolver wrote something" with "the agent improved," track both sides:

- proposal accepted/rejected counts,
- validation failure reasons,
- next-run task success deltas,
- skill activation rate (`load_skill` usage or preloaded-skill coverage),
- adherence heuristics against evolved instructions/skills,
- rollback rate,
- user satisfaction or explicit evaluator feedback.

## Recommended Design Direction

- Put capability budget into the task-solving model and harness activation/adherence mechanics, not only into a powerful evolver.
- Prefer `PRELOADED_ONLY` or explicit configured-skill attachment for critical evolved skills so the task agent reliably sees them.
- Use global discovery for optional skills, but treat activation failure as an observable metric.
- Keep tool/MCP mutation behind manual review because tool changes alter external side effects.
- Build a typed proposal model rather than granting the evolver broad filesystem write access.

## Non-Goals

- No base-model fine-tuning.
- No autonomous repository edits.
- No silent mutation of shared/global skills or team definitions.
- No automatic MCP/tool registration.
- No bypass of existing definition/skill/memory/tool service owners.

## User Refinement: Skill-First Interpretation

For AutoByteus, the self-evolution feature should be designed primarily as **skill evolution**. The system prompt is small by design, and tools are few/business-defined. Therefore the most important adaptive surface is how skills are written, split, merged, selected, and attached to agents.

A skill-first evolution service should analyze historical runs and propose changes such as:

- create a new skill for a repeated failure pattern,
- revise an existing skill that produced bad guidance,
- split an overloaded skill,
- merge duplicate/overlapping skills,
- add activation guidance so the agent knows when to use a skill,
- attach an existing skill to an agent's configured `skillNames`,
- retire or disable a harmful/stale skill after review.

## Product Framing: Evolver as Reflective Agent/Team

The evolver should be implemented as an agent or agent team. The target agent performs work and leaves traces; the evolver reviews those traces later and distills repeated experience into strategy. In AutoByteus terms, traces are episodic experience and skills are durable procedural strategy.

A natural evolver team shape:

1. Trace curator: selects relevant runs and compresses them safely.
2. Pattern analyst: finds repeated failures, corrections, inefficiencies, or successes.
3. Skill architect: decides whether to create, update, split, merge, attach, or retire skills.
4. Validator: checks skill syntax, scope, privacy, generality, and activation guidance.
5. Reviewer/applier: routes approved proposals through the skill service/versioning layer.

This preserves an agent-driven product architecture while keeping durable self-evolution explicit, auditable, and reversible.
