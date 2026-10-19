# Skill Improvement (TypeScript)

## Scope

`src/skill-improvement` is the current source/API module for the manual, skill-first Skill Improvement workflow for
AutoByteus runs. It is a runtime/run capability: a user can activate a visible
Retrospective Skill Improver for an active standalone run or selected team member run.
The backend uses the target's Work Journal (readable, runtime-neutral Markdown
rendered from its raw traces), makes it current before every manual trigger, and
asks the Retrospective Skill Improver to read the journal files and improve
configured skill packages when a reusable improvement is warranted.

Skill Improvement does not train a model, mutate agent/team definitions, run a
post-edit audit service, automatically edit source code, or claim downstream
benefit. Skill edits remain prompt/tool-contract constrained and manually
reviewable.

## Capability Gate And Settings

Skill Improvement is disabled by default for every server node; the clean-state setting names use the `SKILL_IMPROVEMENT` spelling.

- `SkillImprovementCapabilityService` reads and writes the `ENABLE_SKILL_IMPROVEMENT`
  server setting through `ServerSettingsService.getBooleanSetting` /
  `setBooleanSetting`.
- If the setting is missing, the capability initializes disabled and records the
  source as `INITIALIZED_DISABLED`.
- Every eligibility query and manual start mutation checks the capability gate.
- `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` selects the improver agent
  definition. Server startup syncs the product-managed built-in
  `autobyteus-retrospective-skill-improver` through the built-in-agent bootstrap path and
  selects it only when the setting is blank.
- The selected improver definition must include `run_bash` and
  `send_message_to`. Blank runtime/model defaults fall back to the target run's
  runtime/model/config.

Executable MVP strategies remain intentionally narrow: `manual_only` trigger and
`single_agent` improver are implemented; `scheduled`, `signal_based`, and
`agent_team` are catalog-visible `not_implemented` placeholders only.

## Click-Time Configuration, Launch Inputs, And Migration

Manual Skill Improvement eligibility is resolved at click time from the current
global Skill Improvement settings and the current live target state. It is not
resolved from launch-time run overrides.

- Standalone run, team run, and team member launch APIs do not accept
  `skillImprovement` overrides for the manual-click model.
- Run metadata and team member metadata do not persist
  `skillImprovementEffective` launch snapshots for new runs.
- Agent/team definitions, `agent-config.json`, `team-config.json`, and persisted
  definition launch preferences do not own Skill Improvement eligibility.
- Manual start mutations accept only target identity plus requester attribution;
  they do not accept Skill Improvement config overrides.
- `SkillImprovementRunRecord.effectiveConfig` still stores the click-time settings
  used for that individual request as audit provenance.
- Required startup app-data migration
  `20260623_remove_self_evolution_run_metadata` removes obsolete
  `skillImprovementEffective` fields from existing standalone `run_metadata.json`
  files and recursive team member metadata entries. Changed files are backed up
  as `<metadata>.backup-<timestamp>`, rewritten atomically, and reported with
  scanned/migrated/skipped/failed item counts through the app-data migration
  runner.

## GraphQL Surface

`src/api/graphql/types/skill-improvement.ts` exposes the typed API boundary:

- `skillImprovementCapability`
- `setSkillImprovementEnabled(enabled)`
- `skillImprovementStrategyCatalog`
- `getAgentRunSkillImprovementEligibility(runId)`
- `getTeamMemberSkillImprovementEligibility(teamRunId, memberRunId)`
- `startAgentRunSkillImprovement(input)`
- `startTeamMemberSkillImprovement(input)`
- `getSkillImprovementRunRecord(improvementRunId)`

Run/team launch input types no longer expose `skillImprovement`. Agent/team
definition create and update inputs must not accept it.

## Work Journal Evidence

Raw trace storage remains backend-internal. The Retrospective Skill Improver-facing format is the
target run's Work Journal package, not raw JSONL and not a large inline prompt
digest. See [agent_work_journal.md](./agent_work_journal.md) for the journal itself.

- `getWorkJournalService().ensureCurrent({ runId, memoryDir, runtimeKind })` is
  the correctness path. Every manual Skill Improvement request calls it before
  Retrospective Skill Improver messaging. `runtimeKind` is the live target
  AgentRun's runtime, which selects the journal's built-in tool translation.
- Skill Improvement does not own the journal's source reading, rendering, store
  or manifest. The journal of a live run is also kept current at every turn end
  by `WorkJournalRunUpdater`; the request call adds any file still missing (for
  example the closed files of an older run).
- The journal lives under `<target memoryDir>/work_journal/`:
  `work_journal_manifest.json`, one `work_journal_NNNNNN.md` per closed raw
  segment, and `work_journal_active.md` for the open raw file.
- Journal entries are plain actions with outcomes and output (`User:`,
  `Message from <sender>:`, `Agent:`, `Command:`, `Write file:`, `Edit file:`,
  `Search web:`, `Tool:`, `Notice:`), each linked to its raw record. Model
  reasoning is omitted; long output is shortened visibly with a link to the raw
  record.

## Prompt And Static Guidance Separation

Skill Improvement separates dynamic request facts from stable Retrospective Skill Improver guidance.

- Runtime task packet: `SkillImprovementImproverTriggerMessageBuilder` (source boundary) supplies the
  Work Journal manifest/root/files, optional prior improver run ids, editable skill
  package roots, bounded relative package trees, target AgentRun id, and final
  message type.
- Package tree rendering: `SkillImprovementSkillPackageTreeRenderer` lists each
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
- Service-level grants: `SkillImprovementImproverSessionService` (source boundary) registers the
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
3. `SkillImprovementTargetContextResolver` loads target run/member identity,
   workspace, memory directory, runtime/model context, and requires that the
   target `AgentRun` is active before improver activation.
4. `SkillImprovementSkillTargetResolver` resolves the target's currently configured
   skills to exact writable skill roots and `SKILL.md` entry files.
5. `WorkJournalService.ensureCurrent()` makes the target's Work Journal current
   under `<target memoryDir>/work_journal/` and returns its package (file paths
   and evidence hash).
6. `SkillImprovementImproverSessionService` (source boundary) loads target-scoped improver session
   state from `<target memoryDir>/skill_improvement/improver_session.json`.
   If the recorded improver run is active, it is reused. If it is unavailable,
   the service attempts runtime restore/resume when available. If restore is
   unavailable or unsuccessful, the state is marked unavailable/replaced, prior
   improver run ids are retained, and a replacement improver run is launched with
   continuity metadata.
7. `SkillImprovementImproverTriggerMessageBuilder` (source boundary) sends a concise runtime task
   packet to the Retrospective Skill Improver. The packet says "Use the listed Work Journal files as
   the evidence package" and lists the Work Journal manifest path, root path,
   individual journal file paths, editable skill roots,
   bounded package trees with `SKILL.md [entry]`, target run id, message type,
   and continuity context when prior improver runs exist. It does not inline the
   journal body and does not repeat stable improvement policy or backend-rationale
   wording.
8. The Retrospective Skill Improver may read the Work Journal files and edit only the listed skill
   roots. After meaningful durable skill package file changes, it may call
   `send_message_to({ target_agent_run_id, message_type: "skill_update", ... })`
   exactly once. The shared agent-communication router re-checks grant scope,
   reference paths, target liveness, and delivery limits.
9. `SkillImprovementRunStore` persists request provenance: source run ids, target
   identity, improver run id/status, target skill roots, click-time
   effective config, the Work Journal evidence hash in the
   `evidenceSummaryHash` field, timestamps, errors, and improver-authored
   skill-update delivery summary.

The improver run is never inserted into the target's ordinary business team roster.
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

## Work Journal Contents And Records

Work Journal files are derived from raw traces but are not raw traces.

- The journal shows conversation facts, tool outcomes, corrections, review
  feedback and reusable improvement signals as plain actions. Explicit
  durable-skill update markers such as `DURABLE_SKILL_UPDATE:` /
  `SKILL_UPDATE:` remain high-signal feedback for the Retrospective Skill
  Improver, while ordinary one-off exact-answer task instructions must not be
  inflated into durable update requests.
- Runtime result envelopes and bookkeeping fields are removed; media data is
  never reproduced (a marker such as `[image image/png, 2.9 KB, not reproduced]`
  stands for it). The journal does not redact text: it shows what the raw traces
  recorded.
- Each entry links to its raw record (`[↗](../raw_traces_….jsonl#<id>)`) so the
  full evidence can be checked; the trigger message lists only journal paths.
- Improvement records store source run ids, click-time effective config, and the
  journal's evidence hash; they do not expose raw trace JSONL as prompt content.

## Metrics And Benefit Reporting

Harness-updating and harness-benefit remain useful future concepts, but there is
no MVP metrics/reporting service and no `getSkillImprovementMetricsReport` API.

The UI exposes manual starts through the concise composer-adjacent **Skill Improvement** CTA for the selected eligible active source run/member, not through
run-history row controls or launch-time eligibility controls. After start, the UI
may show only a short transient toast/status. It must not render a persistent
composer card, improvement record id, or improver-run open button, and it must not
state that Retrospective Skill Improver completion proves file changes, quality improvement, or
downstream benefit. Completion communication is improver-authored only after
meaningful durable skill package file changes through a grant-scoped direct
`skill_update` message. Records distinguish sent, rejected, target-inactive, and
not-attempted outcomes. Active runtime/model skill refresh is a separate
future/gated concern. Future measurement should be added as a separate design
after the manual loop proves useful.

## MVP Limitations To Preserve

- Only manual trigger plus single-agent Retrospective Skill Improver execution is implemented.
- No scheduled, signal-based, or improver-team execution is implemented.
- Work Journal freshness is guaranteed on trigger and kept at each turn end of a
  live run.
- Direct editing remains instruction-constrained and manually reviewable, not
  service-audited.
- The Retrospective Skill Improver reads Work Journal files through existing file/tool capability; a
  dedicated read-only journal tool remains future hardening.
- Team-member live reload remains next-run-only in the MVP; improver-authored
  `skill_update` messages may still be delivered to an active selected member
  run by exact `memberRunId`, but they do not create Team Communication
  projection.
