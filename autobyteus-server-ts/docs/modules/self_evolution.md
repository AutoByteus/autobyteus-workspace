# Self-Evolution (TypeScript)

## Scope

`src/self-evolution` owns the manual, skill-first self-evolution workflow for AutoByteus runs. It is a runtime/run capability: it can launch a visible helper agent to improve configured skill packages from anonymized work history, but it does not train a model, mutate agent/team definitions, run a post-edit audit service, or claim downstream benefit.

## Capability Gate And Settings

Self-evolution is disabled by default for every server node.

- `SelfEvolutionCapabilityService` reads and writes the `ENABLE_SELF_EVOLUTION` server setting.
- If the setting is missing, the capability initializes disabled and records the source as `INITIALIZED_DISABLED`.
- Every manual start mutation checks the capability gate before target resolution.
- `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` selects the helper agent definition. Server startup syncs the product-managed built-in `autobyteus-skill-evolver` through the built-in-agent bootstrap path and selects it only when the setting is blank.
- The selected evolver definition must include `run_bash` and
  `send_message_to`. Blank runtime/model defaults fall back to the target run's
  runtime/model/config.

Executable MVP strategies are intentionally narrow: `manual_only` trigger and `single_agent` evolver are implemented; `scheduled`, `signal_based`, and `agent_team` are catalog-visible `not_implemented` placeholders only.

## Run-Owned Configuration And Snapshots

Self-evolution eligibility is run-launch owned, not definition-owned.

- Standalone launch APIs accept `AgentRunConfig.selfEvolution` and snapshot the resolved effective config into `AgentRunMetadata.selfEvolutionEffective`.
- Team launch APIs accept `TeamRunConfig.selfEvolution`; supported member launch overrides may also carry `selfEvolution`. `TeamRunService` snapshots the result into each member's `TeamRunAgentMemberMetadata.selfEvolutionEffective`.
- Agent/team definitions, `agent-config.json`, and `team-config.json` do not own self-evolution settings.
- Old runs or members with no `selfEvolutionEffective` snapshot are ineligible.
- Manual start mutations accept only target identity at the API boundary; they do not accept self-evolution config overrides. Internal requester attribution, when available, stays separate from config.

## GraphQL Surface

`src/api/graphql/types/self-evolution.ts` exposes the typed API boundary:

- `selfEvolutionCapability`
- `setSelfEvolutionEnabled(enabled)`
- `selfEvolutionStrategyCatalog`
- `getAgentRunSelfEvolutionEligibility(runId)`
- `getTeamMemberSelfEvolutionEligibility(teamRunId, memberRunId)`
- `startAgentRunSelfEvolution(input)`
- `startTeamMemberSelfEvolution(input)`
- `getSelfEvolutionRunRecord(evolutionRunId)`

The schema exposes `selfEvolution` only on run-launch inputs. Agent/team definition create and update inputs must not accept it.

## Manual Lifecycle

1. Eligibility queries confirm the global capability, run/member metadata snapshot, implemented strategies, and configured writable skill targets.
2. `ManualTriggerStrategy` converts the explicit user/API request into a canonical self-evolution request.
3. `SelfEvolutionTargetContextResolver` loads target run/member metadata and target identity, and the service requires that target `AgentRun` to be active before helper launch.
4. `SelfEvolutionSkillTargetResolver` resolves the target's currently configured skills to exact skill roots and primary `SKILL.md` files.
5. `SelfEvolutionEvidenceBuilder` and `SelfEvolutionWorkHistoryProjector` build anonymized, human-readable work-history evidence without retaining raw trace file paths in the evidence package or record.
6. `SingleAgentEvolverStrategy` launches a separate visible helper `AgentRun` in the target workspace with `autoExecuteTools: true` and a task prompt listing exact editable skill root directories plus primary `SKILL.md` paths.
7. The strategy registers a narrow direct-message grant for the helper: one accepted `self_evolution_outcome` message, only to the original active target run id, with `reference_files` limited to editable skill roots.
8. At the end of meaningful work, the helper should call `send_message_to({ target_agent_run_id, message_type: "self_evolution_outcome", ... })` exactly once. The shared agent-communication router re-checks that the target run is still active before delivery.
9. `SelfEvolutionRunStore` persists minimal provenance: source run IDs, target identity, visible evolver run ID/status, target skill roots, evidence hash, timestamps, errors, and the helper-authored outcome delivery summary.

The evolver is never inserted into the target's ordinary business team roster.
Team-member manual starts are member-scoped: the request/record target is
`team_member_run` with both `teamRunId` and `memberRunId`, and source run ids are
recorded for the selected member run rather than for the whole team container.

## Direct-Edit Scope

The MVP permits direct edits by the helper agent under prompt/tool-contract constraints.

- Editable targets are exact absolute skill root directories resolved from configured skills.
- `SKILL.md` is the primary guidance file, but supporting files inside the same listed skill root may be updated when a durable reusable improvement needs them.
- The helper prompt forbids editing agent/team definitions, MCP/tool config, source code, run memory, sibling skills, or files outside listed skill roots.
- The product service does not compute changed paths, diff stats, off-target policy violations, or Git audit summaries in MVP.
- Git-backed manual inspection/revert remains the testing and rollback workflow outside the product service boundary.

## Evidence And Privacy

Prompt-facing evidence is an anonymized work-history digest, not raw trace JSON.

- The projector keeps useful conversation facts, tool outcomes, corrections, review feedback, and reusable improvement signals.
- Explicit durable-skill update markers such as `DURABLE_SKILL_UPDATE:` / `SKILL_UPDATE:` are classified as high-signal feedback for the helper prompt, while ordinary one-off exact-answer task instructions must not be inflated into durable update requests.
- It omits/redacts bookkeeping IDs, raw trace IDs, raw trace paths, provider event IDs, private home paths, credentials, tokens, private messages, and long raw tool payloads.
- Exact editable skill root paths remain unredacted because the helper needs them to edit.
- Evolution records store an evidence hash and source run IDs, not raw trace file paths.

## Metrics And Benefit Reporting

Harness-updating and harness-benefit remain useful future concepts, but there is no MVP metrics/reporting service and no `getSelfEvolutionMetricsReport` API.

The UI exposes manual starts through the concise composer-adjacent **Self
improve** CTA for the selected eligible source run/member, not through
run-history row controls. Ineligible, old, or pre-snapshot runs hide that CTA by
default. After start, the UI may show only a short transient toast/status. It
must not render a persistent composer card, evolution record id, or helper-run
open button, and it must not state that helper completion proves file changes,
quality improvement, or downstream benefit. Completion communication is
helper-authored when meaningful: the evolver may send one direct
`self_evolution_outcome` message to the still-active target run through
`send_message_to(target_agent_run_id=...)`. Records distinguish sent, rejected,
target-inactive, and not-attempted outcomes. The MVP does not post a
`SenderType.SYSTEM` runtime message merely to render a completion notification;
active runtime/model skill refresh is a separate future/gated concern. Future
measurement should be added as a separate design after the manual loop proves
useful.

## MVP Limitations To Preserve

- Only manual trigger plus single-agent evolver is executable.
- No scheduled, signal-based, or evolver-team execution is implemented.
- Exact historical skill binding/path snapshots are deferred; current configured skill roots are resolved at evolution time and recorded as an MVP limitation.
- Direct editing remains instruction-constrained and manually reviewable, not service-audited.
- Team-member live reload remains next-run-only in the MVP; helper-authored
  `self_evolution_outcome` messages may still be delivered to an active selected
  member run by exact `memberRunId`, but they do not create Team Communication
  projection.
