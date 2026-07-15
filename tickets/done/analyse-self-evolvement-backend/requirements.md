# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Refined — user review in progress. Do not send the updated design for downstream review until the user explicitly asks.

## Goal / Problem Statement
Design the next backend self-evolution direction where Self Improve / Self Evolve behaves as an activated companion subsystem for a target agent or team member run. The subsystem must transform backend raw traces into self-evolver-readable work trace files, keep those work traces current after activation, and deliver small trigger messages to a live self-evolver companion agent or future agent team. The self-evolver must consume work trace paths/files, not raw trace JSONL and not large inlined prompt payloads.

## Investigation Findings
- Current backend self-evolution is implemented under `autobyteus-server-ts/src/self-evolution` as a manual, one-shot, skill-first flow: GraphQL mutation -> `SelfEvolutionService` -> context/skill/evidence resolution -> `SingleAgentEvolverStrategy` creates a helper run -> inlines a bounded readable work-history digest into the helper user message -> waits for completion -> terminates the helper run.
- Current readable conversion lives in `SelfEvolutionWorkHistoryProjector`. It is useful but prompt-digest oriented: grouped sections, recent limits (`MAX_CONVERSATION_ITEMS = 14`, `MAX_ACTIVITY_ITEMS = 12`, `MAX_SIGNAL_ITEMS = 8`), no rendered timestamps, and inline prompt delivery.
- Current run projection already reads complete raw trace corpus through `LocalMemoryRunViewProjectionProvider` using `includeArchive: true`; archive + active raw traces are available through memory/run-history APIs.
- Raw traces are application/internal records. They include fields such as `turn_id`, `seq`, `source_event`, `correlation_id`, `tool_call_id`, and provider/replay metadata. Some are useful to backend behavior, but they should not be the self-evolver-facing format.
- Raw trace tool calls and tool results are currently separate records but `buildHistoricalReplayEvents` already merges matching tool call/result pairs into a single tool event for projection. This should be reused for work trace rendering.
- User clarified the desired work trace principle: converted work traces should be semantically lossless for self-evolution, but not raw-structure-lossless. Preserve user/worker messages, meaningful tool names, arguments, results/errors, retries, corrections, and timestamps; hide backend-only IDs/protocol fields.
- User clarified preferred lifecycle: first Self Improve click activates/attaches the self-evolution subsystem. After activation, work traces should be maintained automatically or near-automatically. Later clicks send another trigger to the same live companion, which can focus on new work while retaining its own continuity.
- User clarified that separate per-run/per-team-run `selfEvolution` launch configuration and stored `selfEvolutionEffective` snapshots should be removed from the manual Self Improve eligibility path. Manual clicks should use current global self-evolution settings plus current target state.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Refactor
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: `SelfEvolutionService` currently owns one-shot request execution and delegates to `SelfEvolutionEvidenceBuilder` / `SingleAgentEvolverStrategy`; `SelfEvolutionEvidencePackage` is prompt-string shaped; `SingleAgentEvolverStrategy` creates and terminates one helper run; `SelfEvolutionWorkHistoryProjector` is bounded digest output; raw trace corpus and projection APIs already own raw trace reading/merging.
- Requirement or scope impact: The design must introduce a clear work-trace projection owner and evolver session lifecycle/trigger owner, rather than stretching the current evidence builder/one-shot strategy into a mixed concern.

## Recommendations
- Treat `raw trace` as backend-internal execution storage and `self-evolution work trace` as the self-evolver-facing coaching record.
- Replace prompt-inlined evidence delivery with durable work trace files plus small trigger messages.
- Keep conversion backend-owned; do not let the self-evolver parse raw trace JSONL directly.
- Activate the self-evolution subsystem on first click, backfill work traces, then maintain them through idempotent catch-up/projection.
- Prefer dirty/catch-up or polling projection over synchronous heavy conversion inside each raw trace append.
- Keep visible work trace format simple: timestamped `user:` and `worker:` blocks; include tool arguments/results nested in worker blocks; hide backend-only fields.

## Scope Classification (`Small`/`Medium`/`Large`)
Large

## In-Scope Use Cases
- UC-001: First Self Improve click activates a companion self-evolution subsystem for a target agent run or team member run.
- UC-002: Existing raw trace archive segments and active raw trace content are converted into self-evolution work trace files.
- UC-003: After activation, new raw trace content is converted into updated work traces automatically/near-automatically or at least guaranteed current before each trigger.
- UC-004: Later Self Improve clicks deliver a small trigger message to the same live companion agent/team instead of creating a memoryless one-shot worker.
- UC-005: The self-evolver reads work trace paths/files and reasons over the content itself.
- UC-006: Tool arguments/results remain available in work traces because wrong arguments and failed results are important improvement signals.

## Out of Scope
- Autonomous self-evolution without user click. Self-improve remains user-triggered.
- Model fine-tuning or source-code self-modification by the evolver.
- Replacing raw trace storage itself.
- Durable agent/team definition editing unless separately requested; current allowed edit scope remains durable skill packages.
- Cross-run long-term coach identity across multiple target runs; this design focuses on one activated target run/member run, with records shaped so cross-run continuity can be added later.
- Per-run or per-member self-evolution launch overrides for manual self-improve.

## Functional Requirements
- REQ-001: The backend must maintain a self-evolution work trace projection derived from raw trace storage for an activated target.
- REQ-002: Work traces must be stored as readable files and referenced by path/manifest in self-evolver trigger messages.
- REQ-003: Work traces must preserve semantically relevant self-evolution information: user messages, worker messages, tool names, tool arguments, tool results/errors, retries/corrections, and timestamps.
- REQ-004: Work traces must hide backend-only raw trace fields by default, including `turn_id`, `seq`, `source_event`, `correlation_id`, `tool_call_id`, provider IDs, and raw JSON envelopes.
- REQ-005: First click must backfill the complete current raw trace corpus into work traces before sending the trigger message.
- REQ-006: Later clicks must ensure work traces are current and send a small trigger message to the existing self-evolver session when its run/team is still live.
- REQ-007: The self-evolver session lifecycle must persist `evolver_session.json` under the target memory directory so later clicks can reuse the live evolver run/team, resume it when the runtime supports resume, or create a replacement evolver with continuity when the old run/team is unavailable.
- REQ-008: Raw trace parsing/segment discovery must remain behind a backend memory/run-history boundary; the self-evolution subsystem must not duplicate unsafe raw-file layout assumptions in the agent prompt.
- REQ-009: The system must continue enforcing editable skill-root restrictions and target notification grants for each self-evolution request.
- REQ-010: The implementation must support the future `agent_team` evolver strategy shape without requiring every team member to be messaged directly by the backend.
- REQ-011: Manual Self Improve eligibility must be resolved at click time from global self-evolution settings and current target state, not from target run launch configuration or stored `selfEvolutionEffective` snapshots.
- REQ-012: Agent run, team run, and team member launch inputs/metadata must not carry self-evolution configuration for the manual-click companion model.
- REQ-013: Existing persisted agent run/team member metadata must be cleaned with an app-data migration that removes obsolete `selfEvolutionEffective` fields from standalone run metadata and recursive team member metadata.
- REQ-014: Self-evolution work trace and evolver session state paths must be target-memory-scoped and flat under `<memoryDir>/self_evolution/`; they must not add a redundant `targets/<targetKey>` directory when `memoryDir` already identifies the target run/member.

## Acceptance Criteria
- AC-001: A first self-improve request produces a work trace root with manifest and converted readable work trace files from current archived + active raw traces.
- AC-002: A later self-improve request does not duplicate the full corpus; it catches up changed/new work trace files and posts a new trigger to the companion.
- AC-003: A converted tool call/result appears under a worker block with meaningful arguments and result/error, not as raw separate protocol records.
- AC-004: Converted work trace content includes timestamp markers and does not expose `source_event`, `correlation_id`, `turn_id`, `seq`, or `tool_call_id` as visible coaching fields.
- AC-005: The self-evolver trigger message contains the work trace manifest/root path and edit scope, not the full work trace body.
- AC-006: If the recorded evolver run/team is active, subsequent clicks reuse it; if it is inactive but resumable, the backend resumes it; if it cannot be resumed, the backend creates a replacement evolver run/team, records the old id in prior-run state, and sends the new evolver a continuity trigger pointing at the current work trace manifest.
- AC-007: Existing tests for raw trace archive/projection/self-evolution are updated or expanded to cover work trace generation, manifest updates, and trigger-message path delivery.
- AC-008: A target run launched before self-evolution was enabled can still be manually self-improved after global self-evolution is enabled, provided the target is active and has writable skill roots.
- AC-009: GraphQL/create-run inputs and run metadata no longer expose or persist per-run/per-member self-evolution launch overrides for the manual-click model.
- AC-010: Running pending app-data migrations removes stale `selfEvolutionEffective` fields from existing `run_metadata.json` and `team_run_metadata.json` files while backing up changed files and reporting migrated/skipped/failed counts.
- AC-011: For a standalone or team-member target, generated work traces are stored at `<memoryDir>/self_evolution/work_traces/` and evolver session state at `<memoryDir>/self_evolution/evolver_session.json`, with no `targets/` folder or hash-suffixed target-key path segment.
- AC-012: The backend only restores/resumes/replaces the self-evolver session in response to a user-triggered Self Improve request; it must not autonomously restart the evolver merely because the prior evolver run stopped.

## Required Self-Evolution Storage Structure

Self-evolution has two storage scopes:

1. **Target-scoped evolver-session/work-trace state** lives under the target run/member `memoryDir`.
2. **Global request audit records** live under the application memory root and are not the self-evolver-facing work-trace corpus.

For a standalone agent run, the required target-scoped structure is:

```txt
<memory-root>/agents/<agentRunId>/
  raw_traces.jsonl                         # existing backend raw trace storage
  ...                                      # existing memory/run metadata files
  self_evolution/
    evolver_session.json                         # live/recoverable evolver session state for this target
    work_traces/
      work_traces_manifest.json            # ordered work-trace manifest passed by path
      work_trace_000001.md                 # converted immutable archived raw trace segment
      work_trace_000002.md                 # converted immutable archived raw trace segment, if present
      work_trace_active.md                 # regenerated projection of current active raw trace
```

Example:

```txt
/data/memory/agents/agent_run_abc123/self_evolution/
  evolver_session.json
  work_traces/
    work_traces_manifest.json
    work_trace_000001.md
    work_trace_active.md
```

For an agent team member target, the required target-scoped structure is the same, but rooted at that member run's memory directory:

```txt
<memory-root>/agent_teams/<rootTeamRunId>/<teamRunPath...>/<memberRunId>/
  raw_traces.jsonl
  ...                                      # existing member memory files
  self_evolution/
    evolver_session.json
    work_traces/
      work_traces_manifest.json
      work_trace_000001.md
      work_trace_active.md
```

Example for a root-team member:

```txt
/data/memory/agent_teams/team_run_root456/member_run_worker789/self_evolution/
  evolver_session.json
  work_traces/
    work_traces_manifest.json
    work_trace_000001.md
    work_trace_active.md
```

The required structure deliberately does **not** include:

```txt
<memoryDir>/self_evolution/targets/<targetKey>/...
```

The target identity is already present in the surrounding memory path and remains available as structured metadata in `evolver_session.json`, `work_traces_manifest.json`, and request audit records.

`evolver_session.json` is backend session state, not work trace content and not the evolver's whole memory. It is used on each Self Improve click to decide how to continue the same target-scoped self-evolution relationship:

```txt
Self Improve click
  -> read <memoryDir>/self_evolution/evolver_session.json if present
  -> ensure <memoryDir>/self_evolution/work_traces/ is current
  -> if no session exists, create the first evolver run/team
  -> if the recorded evolver is active, reuse it
  -> if the recorded evolver is inactive but resumable, resume it
  -> if it cannot be resumed, create a replacement evolver and record prior ids
  -> post a small trigger message containing the manifest path and edit scope
  -> update evolver_session.json with the latest request/session state
```

Minimum single-agent session-state shape:

```json
{
  "schemaVersion": 1,
  "target": { "kind": "agent_run", "runId": "agent_run_abc123" },
  "status": "active",
  "evolver": {
    "strategy": "single_agent",
    "runId": "evolver_run_xyz789",
    "agentDefinitionId": "self_evolver_agent"
  },
  "priorEvolverRunIds": [],
  "workTraces": {
    "rootPath": "/data/memory/agents/agent_run_abc123/self_evolution/work_traces",
    "manifestPath": "/data/memory/agents/agent_run_abc123/self_evolution/work_traces/work_traces_manifest.json",
    "lastSummaryHash": "..."
  },
  "lastRequest": {
    "evolutionRunId": "self_evolution_run_001",
    "requestedAt": "2026-06-23T20:00:00.000Z",
    "postedAt": "2026-06-23T20:00:02.000Z"
  },
  "updatedAt": "2026-06-23T20:00:02.000Z"
}
```

For the future `agent_team` evolver strategy, the same file records the evolver team/root identity instead of a single evolver agent run:

```json
{
  "schemaVersion": 1,
  "target": {
    "kind": "team_member_run",
    "teamRunId": "team_run_root456",
    "memberRunId": "member_run_worker789"
  },
  "status": "active",
  "evolver": {
    "strategy": "agent_team",
    "teamRunId": "evolver_team_run_001",
    "rootAgentRunId": "evolver_coordinator_run_001"
  },
  "priorEvolverRunIds": [],
  "workTraces": {
    "manifestPath": "/data/memory/agent_teams/team_run_root456/member_run_worker789/self_evolution/work_traces/work_traces_manifest.json"
  }
}
```

The global self-evolution request audit structure remains separate:

```txt
<memory-root>/self_evolution/
  index.json
  evolution_runs/
    <evolutionRunId>/
      record.json
```

## Constraints / Dependencies
- Authoritative task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend`.
- Current base verified on 2026-06-23: `codex/analyse-self-evolvement-backend` reset to latest `origin/personal` at `167584a056b8a81b066e10a435fb81d7e75f7b4b`; ahead/behind `0/0` at verification time.
- Existing raw trace storage layout and archive rotation must remain authoritative.
- App-data migration framework under `autobyteus-server-ts/src/app-data-migrations` should be used for persisted metadata cleanup.
- Existing self-evolution enablement/config/eligibility behavior should be preserved unless explicitly redesigned.
- User requires design review by user before any architecture-review handoff.

## Assumptions
- The first implementation can use on-trigger catch-up plus optional activated-target polling rather than a synchronous raw-trace append hook.
- The companion agent can read files through its available tool surface; a purpose-built work-trace read tool can be added later if access control or UX requires it.
- The visible term should be `work trace`, not `evidence`, for the self-evolver-facing files.

## Risks / Open Questions
- Very large tool results may need redaction/noise controls without losing semantically important mistake information.
- If background projection is implemented, lifecycle cleanup must avoid orphan workers after target run termination.
- Work trace file access may need stricter read-only tooling if `run_bash` path access is considered too broad.

## Requirement-To-Use-Case Coverage
- REQ-001 -> UC-001, UC-002, UC-003
- REQ-002 -> UC-004, UC-005
- REQ-003 -> UC-005, UC-006
- REQ-004 -> UC-005
- REQ-005 -> UC-001, UC-002
- REQ-006 -> UC-003, UC-004
- REQ-007 -> UC-004
- REQ-008 -> UC-002, UC-003
- REQ-009 -> UC-004, UC-006
- REQ-010 -> UC-004
- REQ-011 -> UC-001, UC-004
- REQ-012 -> UC-001
- REQ-013 -> UC-001
- REQ-014 -> UC-002, UC-003, UC-004

## Acceptance-Criteria-To-Scenario Intent
- AC-001 -> First-click activation/backfill scenario.
- AC-002 -> Second-click incremental/catch-up scenario.
- AC-003 -> Tool argument/result preservation scenario.
- AC-004 -> Backend-internal field hiding scenario.
- AC-005 -> Path-based trigger message scenario.
- AC-006 -> Live companion continuity/recovery scenario.
- AC-007 -> Durable validation coverage scenario.
- AC-008 -> Dynamic click-time eligibility scenario.
- AC-009 -> Run/team metadata simplification scenario.
- AC-010 -> Existing app data cleanup scenario.
- AC-011 -> Self-evolution storage layout scenario.
- AC-012 -> User-triggered session restore/replacement scenario.

## Approval Status
Previously approved for architecture review by the user on 2026-06-23. Follow-up user review on 2026-06-24 refined the storage/session naming and inactive-evolver recovery behavior. Do not send this updated package for downstream review until the user explicitly asks.
