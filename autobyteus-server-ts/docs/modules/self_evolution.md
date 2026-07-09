# Self-Evolution (TypeScript)

## Scope

`src/self-evolution` is the current source/API module for the manual, skill-first Skill Improvement workflow for
AutoByteus runs. It is a runtime/run capability: a user can activate a visible
Retrospective Skill Improver for an active standalone run or selected team member run.
The backend uses the shared Agent Work Trace Projection capability to convert
that target's raw trace corpus into readable work trace files, keeps those files
current before every manual trigger, and asks the Retrospective Skill Improver to inspect the work
trace paths and improve configured skill packages when a reusable improvement is
warranted.

Skill Improvement does not train a model, mutate agent/team definitions, run a
post-edit audit service, automatically edit source code, or claim downstream
benefit. Skill edits remain prompt/tool-contract constrained and manually
reviewable.

## Capability Gate And Settings

Skill Improvement is disabled by default for every server node; the current setting names retain their `SELF_EVOLUTION` spelling until a separate source/API rename is approved.

- `SelfEvolutionCapabilityService` reads and writes the `ENABLE_SELF_EVOLUTION`
  server setting.
- If the setting is missing, the capability initializes disabled and records the
  source as `INITIALIZED_DISABLED`.
- Every eligibility query and manual start mutation checks the capability gate.
- `AUTOBYTEUS_SKILL_EVOLVER_AGENT_DEFINITION_ID` selects the improver agent
  definition. Server startup syncs the product-managed built-in
  `autobyteus-skill-evolver` through the built-in-agent bootstrap path and
  selects it only when the setting is blank.
- The selected improver definition must include `run_bash` and
  `send_message_to`. Blank runtime/model defaults fall back to the target run's
  runtime/model/config.

Executable MVP strategies remain intentionally narrow: `manual_only` trigger and
`single_agent` evolver are implemented; `scheduled`, `signal_based`, and
`agent_team` are catalog-visible `not_implemented` placeholders only.

## Click-Time Configuration, Launch Inputs, And Migration

Manual Skill Improvement eligibility is resolved at click time from the current
global Skill Improvement settings and the current live target state. It is not
resolved from launch-time run overrides.

- Standalone run, team run, and team member launch APIs do not accept
  `selfEvolution` overrides for the manual-click model.
- Run metadata and team member metadata do not persist
  `selfEvolutionEffective` launch snapshots for new runs.
- Agent/team definitions, `agent-config.json`, `team-config.json`, and persisted
  definition launch preferences do not own Skill Improvement eligibility.
- Manual start mutations accept only target identity plus requester attribution;
  they do not accept Skill Improvement config overrides.
- `SelfEvolutionRunRecord.effectiveConfig` still stores the click-time settings
  used for that individual request as audit provenance.
- Required startup app-data migration
  `20260623_remove_self_evolution_run_metadata` removes obsolete
  `selfEvolutionEffective` fields from existing standalone `run_metadata.json`
  files and recursive team member metadata entries. Changed files are backed up
  as `<metadata>.backup-<timestamp>`, rewritten atomically, and reported with
  scanned/migrated/skipped/failed item counts through the app-data migration
  runner.

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

Run/team launch input types no longer expose `selfEvolution`. Agent/team
definition create and update inputs must not accept it.

## Work Trace Projection

Raw trace storage remains backend-internal. The Retrospective Skill Improver-facing format is a
shared Agent Work Trace package, not raw JSONL and not a large inline prompt
digest.

- `AgentWorkTraceProjectionService.ensureCurrent({ target, memoryDir, targetDisplayName })`
  is the correctness path. Every manual Skill Improvement request calls it before
  Retrospective Skill Improver messaging, passing the resolved target agent display name as metadata only. Work-trace
  body labels remain canonical `user`, `assistant`, `tool`, and `trace_event`.
- The shared `agent-work-traces` capability reads authoritative archived and
  active raw trace sources through `RawTraceFileSourceService` and the
  agent-memory/run-history boundary. Self-evolution does not own the projection
  source reader, renderer, redactor, store, or manifest policy.
- The first request for a target backfills the current archived and active raw
  traces into work trace files. Later requests regenerate current work trace files and rewrite the manifest; there is no generated-file compatibility cache keyed by renderer or source fingerprints.
- Work traces are stored under `<target memoryDir>/work_traces/` with a
  `work_traces_manifest.json`, numbered archive files such as
  `work_trace_000001.md`, and `work_trace_active.md` for the active segment.
- The former generated cache root
  `<target memoryDir>/self_evolution/work_traces/` is obsolete. Runtime does not
  dual-write or fallback-read that path because work traces are derived from
  canonical raw traces and can be regenerated on demand.
- Work trace content is readable, timestamped, and semantically complete for
  evidence replay: visible user messages, visible assistant messages, tool calls,
  arguments, results/errors, retries, corrections, feedback signals, and neutral
  trace events are preserved. Separate assistant/internal reasoning records are omitted.
- Backend-only/protocol fields are hidden from the visible evidence content by
  default, including raw trace ids, `turn_id`, `seq`, `source_event`,
  `correlation_id`, `tool_call_id`, provider ids, raw JSON envelopes, and raw
  trace paths.

A background projection worker is not part of this pass. Freshness is guaranteed
on trigger by the shared `ensureCurrent()` call. See
`agent_work_traces.md` for the shared projection contract.

## Prompt And Static Guidance Separation

Skill Improvement separates dynamic request facts from stable Retrospective Skill Improver guidance.

- Runtime task packet: `SelfEvolutionCompanionTriggerMessageBuilder` (current source name) supplies the
  work trace manifest/root/files, optional prior improver/evolver run ids, editable skill
  package roots, bounded relative package trees, target AgentRun id, and final
  message type.
- Package tree rendering: `SelfEvolutionSkillPackageTreeRenderer` lists each
  editable skill root once, marks `SKILL.md` as `[entry]`, uses relative tree
  lines below that root, excludes hidden/cache/generated/dependency/binary-heavy
  paths, does not follow symlinks, and applies fixed depth/entry caps with
  omission notes.
- Thin built-in agent definition: the product-managed Retrospective Skill Improver
  `agent.md` owns identity, retrospective role, hard edit boundaries, the task
  message authority rule, and final-notification conditions.
- Private improvement skill: the configured agent-private
  `retrospective-skill-improver` skill owns trace-reading workflow, high-signal
  evidence patterns, package-improvement playbook, examples, and no-change
  criteria. Server startup mirrors the built-in template `retrospective-skill-improver/skills/` directory into
  the product-managed app-data built-in agent directory so normal agent-private
  skill resolution can load it.
- Service-level grants: `SelfEvolutionCompanionSessionService` (current source name) registers the
  direct-message grant and the shared router enforces target id, message type,
  allowed reference roots, one accepted delivery, expiry, and target liveness.

Runtime task packets intentionally do not carry a `Rules:` section, improvement
examples, implementation rationale, backend protocol explanations, or raw trace
file-pattern warnings. Those concerns belong in static guidance, private skill
content, docs, and grant enforcement respectively.

## Improver Lifecycle

The manual action activates or reuses a target-scoped improver session.

1. Eligibility queries confirm the global capability, current click-time
   settings, implemented strategies, a live target run, and configured writable
   skill targets.
2. `ManualTriggerStrategy` converts the explicit user/API request into a
   canonical Skill Improvement request.
3. `SelfEvolutionTargetContextResolver` loads target run/member identity,
   workspace, memory directory, runtime/model context, and requires that the
   target `AgentRun` is active before improver activation.
4. `SelfEvolutionSkillTargetResolver` resolves the target's currently configured
   skills to exact writable skill roots and `SKILL.md` entry files.
5. `AgentWorkTraceProjectionService.ensureCurrent()` produces the shared work
   trace package and manifest under `<target memoryDir>/work_traces/`.
6. `SelfEvolutionCompanionSessionService` (current source name) loads target-scoped improver/evolver session
   state from `<target memoryDir>/self_evolution/evolver_session.json`.
   If the recorded improver run is active, it is reused. If it is unavailable,
   the service attempts runtime restore/resume when available. If restore is
   unavailable or unsuccessful, the state is marked unavailable/replaced, prior
   evolver run ids are retained, and a replacement improver run is launched with
   continuity metadata.
7. `SelfEvolutionCompanionTriggerMessageBuilder` (current source name) sends a concise runtime task
   packet to the Retrospective Skill Improver. The packet lists the work trace manifest path, work
   trace root path, individual work trace file paths, editable skill roots,
   bounded package trees with `SKILL.md [entry]`, target run id, message type,
   and continuity context when prior improver/evolver runs exist. It does not inline the
   work trace body and does not repeat stable improvement policy or backend-rationale
   wording.
8. The Retrospective Skill Improver may inspect work trace files and edit only the listed skill
   roots. After meaningful durable skill package file changes, it may call
   `send_message_to({ target_agent_run_id, message_type: "skill_update", ... })`
   exactly once. The shared agent-communication router re-checks grant scope,
   reference paths, target liveness, and delivery limits.
9. `SelfEvolutionRunStore` persists request provenance: source run ids, target
   identity, improver/evolver run id/status, target skill roots, click-time
   effective config, work-trace summary hash stored in the legacy
   `evidenceSummaryHash` field, timestamps, errors, and improver-authored
   skill-update delivery summary.

The improver/evolver run is never inserted into the target's ordinary business team roster.
Team-member manual starts are member-scoped: the request/record target is
`team_member_run` with both `teamRunId` and `memberRunId`, and source run ids are
recorded for the selected member run rather than for the whole team container.

## Direct-Edit Scope

The MVP permits direct edits by the Retrospective Skill Improver under prompt/tool-contract
constraints.

- Editable targets are exact absolute skill root directories resolved from
  configured skills.
- `SKILL.md` is the package entry file; supporting files inside the same listed
  skill root may be updated when durable reusable improvement needs them.
- The built-in Retrospective Skill Improver static guidance and private improvement skill own
  the stable edit boundaries: no agent/team definitions, MCP/tool config, source
  code, run memory, sibling skills, files outside listed roots, or symlink/path
  alias writes outside a listed root.
- The product service does not compute changed paths, diff stats, off-target
  policy violations, or Git audit summaries in MVP.
- Git-backed manual inspection/revert remains the testing and rollback workflow
  outside the product service boundary.

## Work Trace Privacy And Records

Work trace files are purpose-built improvement records. They are derived from raw
traces but are not raw traces.

- The renderer preserves useful conversation facts, tool outcomes, corrections,
  review feedback, and reusable improvement signals.
- Explicit durable-skill update markers such as `DURABLE_SKILL_UPDATE:` /
  `SKILL_UPDATE:` remain high-signal feedback for the Retrospective Skill Improver, while ordinary
  one-off exact-answer task instructions must not be inflated into durable
  update requests.
- Raw bookkeeping fields, provider event ids, private home paths, credentials,
  tokens, private messages, and raw trace envelopes are omitted or redacted.
- Exact editable skill root paths and work trace file paths remain visible
  because the Retrospective Skill Improver needs them to read evidence and edit allowed skills.
- Evolution records store source run ids, click-time effective config, and a
  work-trace summary hash; they do not expose raw trace JSONL as prompt content.

## Metrics And Benefit Reporting

Harness-updating and harness-benefit remain useful future concepts, but there is
no MVP metrics/reporting service and no `getSelfEvolutionMetricsReport` API.

The UI exposes manual starts through the concise composer-adjacent **Skill Improvement** CTA for the selected eligible active source run/member, not through
run-history row controls or launch-time eligibility controls. After start, the UI
may show only a short transient toast/status. It must not render a persistent
composer card, evolution record id, or improver-run open button, and it must not
state that Retrospective Skill Improver completion proves file changes, quality improvement, or
downstream benefit. Completion communication is improver-authored only after
meaningful durable skill package file changes through a grant-scoped direct
`skill_update` message. Records distinguish sent, rejected, target-inactive, and
not-attempted outcomes. Active runtime/model skill refresh is a separate
future/gated concern. Future measurement should be added as a separate design
after the manual loop proves useful.

## MVP Limitations To Preserve

- Only manual trigger plus single-agent Retrospective Skill Improver execution is implemented.
- No scheduled, signal-based, or evolver-team execution is implemented.
- Work trace freshness is guaranteed on trigger; continuous background work
  trace projection is not implemented.
- Direct editing remains instruction-constrained and manually reviewable, not
  service-audited.
- The Retrospective Skill Improver reads work trace files through existing file/tool capability; a
  dedicated read-only work-trace tool remains future hardening.
- Team-member live reload remains next-run-only in the MVP; improver-authored
  `skill_update` messages may still be delivered to an active selected member
  run by exact `memberRunId`, but they do not create Team Communication
  projection.
