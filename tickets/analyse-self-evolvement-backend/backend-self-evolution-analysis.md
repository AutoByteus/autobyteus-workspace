# Backend Self-Evolution / “Self Improve” Analysis

## Summary

Backend self-improvement is implemented as a **manual, skill-first self-evolution workflow**. It does not fine-tune a model and does not mutate agent/team definitions. When enabled, a user can start **Self improve** for an eligible active standalone run or selected team member run. The backend launches a separate visible **Skill Self-Evolver** helper agent, gives it anonymized work-history evidence plus exact writable skill roots, and instructs it to edit only durable skill package files when a reusable improvement is warranted.

Core implementation owner: `autobyteus-server-ts/src/self-evolution`.

## What It Evolves

- In scope: configured skill packages for the target agent, primarily `SKILL.md`, plus supporting files inside the same exact skill root when needed.
- Out of scope: model weights, source code, agent/team definitions, MCP/tool config, run memory, sibling skills, and files outside listed skill roots.

## Capability And Configuration Model

- Global gate: `ENABLE_SELF_EVOLUTION`, controlled by `SelfEvolutionCapabilityService` and persisted via `ServerSettingsService`.
- Disabled-by-default behavior: if the setting is missing, capability initializes disabled.
- Run-owned launch config: `AgentRunConfig.selfEvolution`, `TeamRunConfig.selfEvolution`, and team member overrides are accepted only at run launch.
- Snapshot: `SelfEvolutionEffectiveConfigResolver` resolves defaults plus launch overrides into `selfEvolutionEffective` stored on standalone run metadata or team member metadata.
- Agent/team definitions do not own eligibility. Old runs without `selfEvolutionEffective` are intentionally ineligible.

## API Surface

`autobyteus-server-ts/src/api/graphql/types/self-evolution.ts` exposes:

- `selfEvolutionCapability`
- `setSelfEvolutionEnabled(enabled)`
- `selfEvolutionStrategyCatalog`
- `getAgentRunSelfEvolutionEligibility(runId)`
- `getTeamMemberSelfEvolutionEligibility(teamRunId, memberRunId)`
- `startAgentRunSelfEvolution(input)`
- `startTeamMemberSelfEvolution(input)`
- `getSelfEvolutionRunRecord(evolutionRunId)`

Run-launch GraphQL inputs accept `selfEvolution`; definition create/update inputs do not.

## Main Flow

```text
Composer Self improve CTA
-> GraphQL startAgentRunSelfEvolution / startTeamMemberSelfEvolution
-> SelfEvolutionService
-> target metadata/context resolution
-> live target check
-> launch snapshot eligibility check
-> configured skill-root resolution
-> anonymized evidence build
-> SingleAgentEvolverStrategy
-> AgentRunService creates visible Skill Self-Evolver run
-> direct-message grant registered for exactly one skill_update message
-> helper edits listed skill roots with run_bash if warranted
-> helper optionally sends send_message_to(target_agent_run_id, message_type=skill_update)
-> SelfEvolutionRunStore records minimal provenance and outcome
```

## Important Owners

| Owner/File | Responsibility |
| --- | --- |
| `SelfEvolutionService` | Orchestrates eligibility/start, target resolution, evidence, evolver launch, and run record lifecycle. |
| `SelfEvolutionCapabilityService` | Owns global disabled/enabled gate. |
| `SelfEvolutionEffectiveConfigResolver` | Resolves launch-time snapshot from defaults and overrides. |
| `SelfEvolutionEligibilityEvaluator` | Explains whether a target is eligible; checks global gate, snapshot, strategy support, writable skills, and evolver config. |
| `SelfEvolutionTargetContextResolver` | Loads standalone/team-member metadata, definition, workspace, memory path, runtime/model fallback, and self-evolution snapshot. |
| `SelfEvolutionSkillTargetResolver` | Converts target agent configured skills into exact absolute skill roots and `SKILL.md` paths; checks writability. |
| `SelfEvolutionEvidenceBuilder` / `SelfEvolutionWorkHistoryProjector` | Turns run-history projections into anonymized digest, feedback signals, privacy warnings, and evidence hash. |
| `SingleAgentEvolverStrategy` | Launches the visible helper run with `autoExecuteTools: true`, constructs the task prompt, registers direct-message grant, waits for completion, and terminates helper run. |
| `SelfEvolutionRunStore` | Persists minimal provenance under `memory/self_evolution`. |
| `DirectAgentRunMessageGrantRegistry` / `GlobalAgentRunMessageRouter` | Constrain helper-authored final `send_message_to` delivery to the exact target run, `skill_update` type, one accepted delivery, and allowed reference roots. |
| `BuiltInAgentBootstrapper` + `skill-evolver` template | Seeds normal built-in `autobyteus-skill-evolver` agent definition with `run_bash` and `send_message_to`. |

## Evidence / Privacy Model

- Evidence comes from run-history projections, not raw trace JSON.
- The projector keeps useful summary, conversation snippets, tool outcomes, correction signals, and explicit durable update markers like `DURABLE_SKILL_UPDATE:` / `SKILL_UPDATE:`.
- It redacts tokens, API keys, credentials, emails, private paths, UUID-like IDs, raw trace/tool/run IDs, and long payload details.
- Exact editable skill root paths remain unredacted because the helper needs them to edit.
- Records store `evidenceSummaryHash`, not raw trace paths or full evidence text.

## Helper Agent Design

The default helper is `autobyteus-skill-evolver`, display name **Skill Self-Evolver**.

Template files:

- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md`
- `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent-config.json`

The agent config includes only:

- `run_bash`
- `send_message_to`

The task message is deliberately stronger than the static agent prompt: it lists editable roots, primary `SKILL.md` paths, anonymized evidence, explicit durable-correction rules, and final `send_message_to` instructions.

## Persistence

`SelfEvolutionRunStore` writes:

- Record path: `<memoryDir>/self_evolution/evolution_runs/<evolutionRunId>/record.json`
- Index path: `<memoryDir>/self_evolution/index.json`

The record includes source run ids, target identity, status, requested/completed times, strategy names, effective config, evolver agent/run ids, runtime/model, workspace root, skill targets, evidence hash, notification/direct-message outcome, and errors.

## Strategy Scope

Implemented:

- Trigger: `manual_only`
- Evolver: `single_agent`

Catalog-visible but not implemented:

- Triggers: `scheduled`, `signal_based`
- Evolver: `agent_team`

## Key Safeguards

- Global capability disabled by default.
- Eligibility is based on launch snapshot, not mutable definitions.
- Manual start requires target run/member to still be active before helper launch.
- At least one writable configured `SKILL.md` is required.
- Helper edits are instruction-scoped to exact skill roots.
- Helper’s final message is grant-scoped to one exact active target run, one `skill_update` message type, max one accepted delivery, and `reference_files` inside editable roots.
- Backend records outcome but does not claim that completion proves downstream improvement.

## MVP Limitations / Risks

- The backend does not service-audit changed paths, diffs, policy violations, or semantic correctness after helper edits.
- Direct editing relies on prompt/tool constraints and Git/manual review for rollback.
- Exact historical skill-root snapshots are deferred: current configured skill roots are resolved at evolution time.
- Active runtime skill reload is not implemented; next-run correctness is the baseline.
- Team-member active notification remains `next_run_only` in MVP.
- Scheduled/signal/team evolver strategies are placeholders only.

## Validation Observed In Repository

Backend tests exist under `autobyteus-server-ts/tests/self-evolution/` for config resolution, GraphQL converters/resolver, record lifecycle, service integration, notification service, work-history projection, and single-agent evolver strategy.

The completed ticket `tickets/done/self-evolving-harness-feasibility/api-e2e-validation-report.md` records a live browser/API validation pass for the current MVP behavior, including global enablement, launch snapshot, composer CTA, durable skill update, redaction, visible helper run, next-run improvement, and team/member identity handling.
