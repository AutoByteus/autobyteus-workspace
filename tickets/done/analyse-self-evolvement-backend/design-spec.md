# Design Spec

## Current-State Read

Current self-evolution is a manual one-shot skill improvement flow.

Current primary path:
`GraphQL Self Improve mutation -> SelfEvolutionService -> SelfEvolutionEvidenceBuilder -> SelfEvolutionWorkHistoryProjector -> SingleAgentEvolverStrategy -> temporary Skill Self-Evolver run -> skill files / send_message_to -> SelfEvolutionRunStore`

Key current facts:
- `SelfEvolutionService` is the current use-case boundary. It validates enablement/config, resolves target context, checks the target run is live, resolves writable skill targets, builds evidence, launches the evolver strategy, and writes a run record.
- `SelfEvolutionEvidenceBuilder` produces a `SelfEvolutionEvidencePackage` with one `anonymizedWorkHistory` string.
- `SelfEvolutionWorkHistoryProjector` renders a recent, grouped digest. It is not a full chronological work trace file format.
- `SingleAgentEvolverStrategy` creates a fresh helper run, posts one task message containing the whole digest, waits for completion, and terminates the helper run.
- Raw trace storage already supports complete corpus reads: archived `raw_traces_000001.jsonl` style files plus active `raw_traces.jsonl` are merged by the memory/run-history path.
- `buildHistoricalReplayEvents` already performs one important transformation needed for work traces: matching `tool_call` and `tool_result` records are merged into one tool event containing tool name, arguments, result/error, status, and timestamp.

The repository already has an app-data migration framework under `autobyteus-server-ts/src/app-data-migrations` for persisted memory metadata/layout changes. Existing required-on-startup migrations scan metadata files, create backups, rewrite atomically, and record migrated/skipped/failed counts.

Current design mismatch with the target direction:
- The self-evolver-facing data is an inline prompt digest, not durable work trace files.
- The helper lifecycle is one-shot, not a companion session.
- The current projector intentionally loses most earlier history through recent-item limits.
- Raw trace internals are correctly backend-owned, but there is no durable self-evolution projection that exposes only coach-useful content.

## Intended Change

Introduce an activated self-evolution companion subsystem:

1. First Self Improve click activates self-evolution for the target run/member.
2. Backend backfills raw trace history into self-evolution work trace files.
3. Backend starts maintaining the work trace projection automatically/near-automatically for that activated target.
4. Backend starts or reuses a live self-evolver companion agent, and later an agent-team variant.
5. Each Self Improve click sends a small trigger message to the companion containing work trace paths and edit scope, not the work trace content itself.
6. The companion reads work trace files and reasons by itself.

Terminology:
- `raw trace`: backend/internal execution record.
- `self-evolution work trace`: readable coaching record derived from raw trace, semantically complete for self-evolution but stripped of backend-only protocol fields.


### Configuration / Eligibility Simplification

Manual self-improve must not depend on a `selfEvolutionEffective` snapshot stored when the target agent/team run was launched. In the companion model, the user click is the trigger, so eligibility is computed at click time from current global self-evolution capability/settings plus current target state. Per-run/per-member `selfEvolution` launch overrides are removed from the manual Self Improve model.

Manual-click eligibility should check:
1. global self-evolution capability is enabled,
2. target run/member is active and addressable,
3. target agent has writable skill targets,
4. current selected evolver strategy is implemented/available,
5. companion can be created or reused.

The effective settings used for a request should be recorded in `SelfEvolutionRunRecord` for audit, but they should not be pre-stored in target run metadata as a prerequisite for clicking Self Improve. Per-run launch overrides and `selfEvolutionEffective` snapshots should be removed from the manual self-improve path. If future autonomous scheduled/signal triggers need per-run policy, they should have a separate explicit policy owner rather than overloading manual-click eligibility.

Target run metadata simplification:
- remove `selfEvolution` from agent run/team run/team member launch input shapes for this manual-click model,
- remove `selfEvolutionEffective` from agent run/team member metadata as an eligibility source,
- remove launch-time resolver calls that compute self-evolution config during normal run/team creation,
- keep effective settings in `SelfEvolutionRunRecord` only for actual self-evolution requests.

A real app-data migration is required for this removal because existing `run_metadata.json` and `team_run_metadata.json` files may already contain `selfEvolutionEffective`. The migration must remove those obsolete fields from persisted metadata while leaving self-evolution request audit records intact.

### Storage Layout Simplification

Self-evolution work trace and evolver session state storage is rooted at the target run/member `memoryDir`. Because that directory already identifies the target, the design must not add `targets/<targetKey>` beneath it. The target-scoped layout is:

```txt
<memoryDir>/self_evolution/evolver_session.json
<memoryDir>/self_evolution/work_traces/work_traces_manifest.json
<memoryDir>/self_evolution/work_traces/work_trace_000001.md
<memoryDir>/self_evolution/work_traces/work_trace_active.md
```

The structured `target` object remains in manifest/state records for audit. Hash-based safe target keys are not path segments in this layout. If an internal summary hash needs target identity, hash the structured `target` object privately rather than exposing a `agent_run_<run-id>_<hash>` directory.

Standalone agent example:

```txt
/data/memory/agents/agent_run_abc123/
  raw_traces.jsonl
  run_metadata.json
  self_evolution/
    evolver_session.json
    work_traces/
      work_traces_manifest.json
      work_trace_000001.md
      work_trace_active.md
```

Team-member target example:

```txt
/data/memory/agent_teams/team_run_root456/member_run_worker789/
  raw_traces.jsonl
  self_evolution/
    evolver_session.json
    work_traces/
      work_traces_manifest.json
      work_trace_000001.md
      work_trace_active.md
```

`evolver_session.json` is backend session/checkpoint state. It is not the work trace corpus and not the self-evolver's whole memory. It records enough identity and request state to continue the same target-scoped self-evolution relationship across multiple user clicks.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change / Refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Shared Structure Looseness
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes for this feature
- Evidence:
  - `SelfEvolutionEvidencePackage` is shaped around `anonymizedWorkHistory: string`, which encourages prompt inlining.
  - `SelfEvolutionWorkHistoryProjector` is bounded and grouped, not a durable full work-trace projection.
  - `SingleAgentEvolverStrategy` terminates the helper run in `finally`, preventing same-companion click #2/#3 semantics.
  - Raw trace storage/projection already owns the raw data and tool call/result merge; self-evolution should reuse that boundary rather than duplicate raw parsing in agent prompts.
- Design response:
  - Keep `SelfEvolutionService` as the public use-case boundary, but split work trace projection and companion session lifecycle into explicit owners.
  - Replace prompt-inlined evidence with durable work trace files and path-based trigger messages.
  - Replace one-shot helper lifecycle with an activated companion session for `single_agent`; keep the interface compatible with future `agent_team` companion behavior. Simplify manual-click eligibility so it uses current global self-evolution settings, not run-launch snapshots.
- Refactor rationale:
  - Stretching the existing evidence builder and strategy would create a mixed owner that both converts raw traces, writes files, manages companion lifecycle, and sends requests.
  - The design needs clear boundaries: raw trace source reading, work trace projection, companion lifecycle, and self-evolution request records.
- Intentional deferrals and residual risk, if any:
  - A purpose-built `read_work_trace` tool is deferred; first design can pass file paths to the companion. Risk: file access control relies on existing tool capability.
  - Cross-run coach identity is deferred; target-run companion continuity is in scope. Risk: long-term agent-level learning across runs remains future work.

## Terminology

- `Subsystem` / `capability area`: self-evolution remains the capability area; work trace projection and companion sessions are owned parts inside it.
- `Module`: optional grouping such as `work-traces/` or `companion/` under `src/self-evolution/services/` when it improves readability.
- `Folder` / `directory`: physical grouping only after ownership is clear.
- `File`: concrete owner of one concern.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. file responsibilities and reusable structures
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: the one-shot inline prompt digest path should be replaced for self-evolution task delivery. The old bounded projector can remain only if renamed/re-scoped as an optional summary renderer, not as the authoritative source for companion work traces.
- No dual-path delivery where some requests inline work history while others use work trace paths for the same strategy.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Self Improve click / GraphQL mutation | Companion receives trigger message | `SelfEvolutionService` | Main user-triggered activation/request path |
| DS-002 | Primary End-to-End | Raw trace corpus | Work trace files + manifest | `SelfEvolutionWorkTraceProjectionService` | Converts backend memory into self-evolver-readable files |
| DS-003 | Primary End-to-End | Companion trigger | Durable skill update / no-op outcome | `SelfEvolutionCompanionSessionService` | Governs live companion reuse and request delivery |
| DS-004 | Return-Event | Companion final outcome / send_message_to usage | Self-evolution run record + target notification | `SelfEvolutionRecordLifecycle` | Preserves audit/provenance and target update delivery |
| DS-005 | Bounded Local | Activated target dirty/source revision check | New published work trace snapshot generation | `SelfEvolutionWorkTraceUpdateWorker` | Keeps work traces current after activation without raw writer coupling |

## Primary Execution Spine(s)

Activation/request spine:
`GraphQL mutation -> SelfEvolutionService -> Target/skill/context resolvers -> SelfEvolutionWorkTraceProjectionService.ensureCurrent -> SelfEvolutionCompanionSessionService.activateOrGet -> Companion run/team postUserMessage`

Work trace projection spine:
`Raw trace storage -> RawTraceWorkTraceSourceReader -> HistoricalReplayEvent merge -> SelfEvolutionWorkTraceRenderer -> SelfEvolutionWorkTraceStore -> flat work_trace_*.md files + work_traces_manifest.json`

Companion improvement spine:
`Trigger message -> Live self-evolver companion -> Work trace files + skill roots -> skill package edits or no-op -> send_message_to / final response -> SelfEvolutionRunRecord`


### Detailed Companion Activation / Reuse Spine

The companion may not exist when the user first clicks Self Improve. `SelfEvolutionCompanionSessionService` owns that creation/reuse decision. It should use a strategy/adapter selected from `effectiveConfig.evolverStrategy`. Current implemented strategy is `single_agent`; future strategy is `agent_team`.

First-click single-agent flow:

`SelfEvolutionService -> SelfEvolutionCompanionSessionService.activateOrGet(targetContext) -> EvolverSessionStore.load(context.memoryDir self_evolution state) -> no active session -> SelfEvolverAgentSettingsResolver.resolve(...) -> SingleAgentCompanionStrategy.createSession(...) -> AgentRunService.createAgentRun(...) -> EvolverSessionStore.write(active companionRunId) -> return companion session`

Later-click single-agent flow:

`SelfEvolutionService -> SelfEvolutionCompanionSessionService.activateOrGet(targetContext) -> EvolverSessionStore.load(context.memoryDir self_evolution state) -> AgentRunService.getAgentRun(companionRunId) -> active -> return existing companion session`

Inactive-session recovery flow:

`stored evolver inactive -> if runtime can resume, resume same evolver run/team -> else mark old runtime unavailable -> create replacement evolver run/team -> preserve prior evolver ids -> include current manifest path and continuity note in trigger message -> persist new current evolver identity in evolver_session.json`

This recovery is still user-triggered. The backend must not autonomously restart the evolver merely because the previous evolver stopped; restore/resume/replacement happens when the user clicks Self Improve again and target eligibility still passes.

Future agent-team flow:

`SelfEvolutionService -> SelfEvolutionCompanionSessionService.activateOrGet(targetContext) -> AgentTeamCompanionStrategy.createOrReuseSession(...) -> team-run creation/reuse boundary -> post trigger to team root/coordinator`

The backend should send one trigger to the companion team root/coordinator, not to every future team member. The team owns its own internal coordination.

Per-click trigger delivery after activation/reuse:

`SelfEvolutionService -> WorkTraceProjectionService.ensureCurrent(...) -> CompanionSessionService.postSelfImproveRequest(session, workTracePackage, request) -> register DirectAgentRunMessageGrant(sender=companionRunId, allowedTarget=targetRunId, messageType=skill_update, fileRoots=editableSkillRoots) -> companionRun.postUserMessage(trigger message)`

This means creation/reuse is strategy-owned behind the companion session boundary, while each user click is still a separate request message delivered to the current companion session.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user click enters through GraphQL and the self-evolution service validates whether the target can be self-improved, then ensures work traces are current before notifying the companion. | GraphQL resolver, `SelfEvolutionService`, target context, skill targets, companion session | `SelfEvolutionService` | capability gate, eligibility, record lifecycle |
| DS-002 | The projection owner reads raw trace sources through a memory/run-history boundary, converts immutable numbered raw trace sources once/reuses them by fingerprint, regenerates the active work trace when active raw traces change, and updates a flat manifest after files are written. | raw trace source, historical replay events, renderer, store | `SelfEvolutionWorkTraceProjectionService` | redaction, source fingerprinting, file IO |
| DS-003 | A live companion is created or reused, and each click becomes a new small user message containing work trace paths, edit roots, and request metadata. | companion session, agent/team run, trigger message | `SelfEvolutionCompanionSessionService` | direct-message grant, companion settings, recovery policy |
| DS-004 | The companion's outcome is recorded and target-facing update is delivered only through allowed `send_message_to` grants when durable files changed. | outcome watcher, grant registry, run record | `SelfEvolutionRecordLifecycle` | target notification, index update |
| DS-005 | After activation, a worker/catch-up loop detects changed raw trace sources and refreshes work trace files without blocking raw trace writes. | activated target state, source revision, projection call | `SelfEvolutionWorkTraceUpdateWorker` | polling cadence, lifecycle cleanup |

## Spine Actors / Main-Line Nodes

- `SelfEvolutionResolver`: GraphQL entry wrapper.
- `SelfEvolutionService`: authoritative self-evolution use-case owner.
- `SelfEvolutionWorkTraceProjectionService`: authoritative work trace projection owner.
- `RawTraceWorkTraceSourceReader`: memory/run-history boundary for raw trace source files/records.
- `SelfEvolutionWorkTraceRenderer`: turns merged events into simple visible work trace blocks.
- `SelfEvolutionWorkTraceStore`: owns work trace paths, manifest, atomic writes.
- `SelfEvolutionCompanionSessionService`: owns live companion agent/team lifecycle and request dispatch.
- `SelfEvolutionRecordLifecycle`: owns run record status and finalization.

## Ownership Map

| Node | Owns |
| --- | --- |
| `SelfEvolutionService` | use-case sequencing, eligibility/config enforcement, context/skill target resolution, activation orchestration, record lifecycle handoff |
| `SelfEvolutionWorkTraceProjectionService` | when/how raw trace sources become self-evolution work traces, idempotent backfill/catch-up, source fingerprint comparison |
| `RawTraceWorkTraceSourceReader` | raw trace file/segment discovery behind memory/run-history boundary; callers do not know raw layout details |
| `SelfEvolutionWorkTraceRenderer` | visible coaching format, timestamp rendering, user/worker block shape, tool call/result nesting, redaction integration |
| `SelfEvolutionWorkTraceStore` | target-memory-scoped filesystem layout, manifest schema, atomic file writes |
| `SelfEvolutionCompanionSessionService` | companion activation/reuse/recreation, per-click trigger message, live run/team identity |
| `SelfEvolutionWorkTraceUpdateWorker` | background or scheduled catch-up for activated targets |
| `SelfEvolutionRunStore` / new evolver session store | durable request and target evolver session state persistence |

The GraphQL resolver remains a thin entry facade and must not own conversion, lifecycle, or raw trace details.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SelfEvolutionResolver` | `SelfEvolutionService` | GraphQL transport | eligibility, projection, companion lifecycle |
| existing GraphQL converters | `SelfEvolutionService` / stores | DTO shaping | business state transitions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Inline `anonymizedWorkHistory` prompt delivery for `single_agent` | Full work history should be file-based and path-delivered | `SelfEvolutionWorkTraceProjectionService` + path trigger message | In This Change | Do not keep dual behavior for same strategy |
| One-shot helper termination in `SingleAgentEvolverStrategy` | Companion should be reused across clicks | `SelfEvolutionCompanionSessionService` | In This Change | Terminate only on target end/manual cleanup/failure policy |
| `SelfEvolutionEvidencePackage` as main delivery shape | It is prompt-string shaped | `SelfEvolutionWorkTracePackage` / manifest path fields | In This Change | May keep a summary hash field only if tied to manifest generation |
| Bounded digest projector as authoritative history | Recent limits lose history | `SelfEvolutionWorkTraceRenderer` | In This Change | Existing redaction logic can be extracted/reused |
| `evidence` naming in prompt-facing files | User-facing concept is work trace | `work trace` domain names | In This Change | Internal tests may still use evidence only if concept remains internal |
| Per-run `selfEvolution` launch overrides / `selfEvolutionEffective` as manual eligibility authority | Manual click should use current global settings and target state | Dynamic click-time eligibility + request-record audit | In This Change | Future autonomous triggers need separate policy owner if revived |
| Persisted `selfEvolutionEffective` fields in existing metadata files | Stale fields would contradict the simplified manual-click model | Required app-data migration removing fields from run/team metadata | In This Change | Keep self-evolution request records intact |
| Redundant `self_evolution/targets/<targetKey>/...` directory under target `memoryDir` | `memoryDir` already scopes the target, so the extra target key repeats run identity and adds a needless hash | `<memoryDir>/self_evolution/work_traces/` and `<memoryDir>/self_evolution/evolver_session.json` | In This Change | Update implementation/tests/docs/API-E2E expectations |

## Return Or Event Spine(s) (If Applicable)

Outcome spine:
`Companion assistant completion / send_message_to grant usage -> Companion session service outcome collector -> SelfEvolutionRecordLifecycle -> SelfEvolutionRunStore index/record -> GraphQL result / target update`

Target update remains grant-scoped: the companion may send `message_type: "skill_update"` to the target only for the current request, and only with reference files from changed/relevant skill roots.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `SelfEvolutionWorkTraceUpdateWorker`

`Activated target registry -> read source revisions -> if dirty call projection.ensureCurrent -> reuse/render source files -> write flat work_traces_manifest.json -> sleep/reschedule`

This is intentionally bounded under the projection/update owner. It does not replace the click-triggered primary spine. Each click must still call `ensureCurrent` before sending the companion message, so trigger correctness does not depend only on a background loop.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Redaction/sanitization | DS-002 | `SelfEvolutionWorkTraceRenderer` | Hide secrets, backend IDs, private paths where needed | Prevents durable leakage | Main projection owner becomes hard to reason about if regexes are scattered |
| Source fingerprinting | DS-002, DS-005 | `SelfEvolutionWorkTraceProjectionService` | Reuse immutable numbered conversions and decide whether active work trace regeneration/manifest update is needed | Avoid unnecessary numbered rewrites while staying correct | Wasted work or stale traces |
| Atomic file writing | DS-002 | `SelfEvolutionWorkTraceStore` | Safe manifest/file writes | Avoid partial reads by companion | Projection logic becomes filesystem blob |
| Companion settings resolution | DS-003 | `SelfEvolutionCompanionSessionService` | Resolve evolver agent/team/runtime/model | Existing setting policy reuse | Strategy class becomes mixed config/lifecycle owner |
| Direct-message grant | DS-003, DS-004 | `SelfEvolutionCompanionSessionService` | Grant target notification per request | Safety boundary | Companion could message wrong target or with wrong files |
| Target lifecycle cleanup | DS-003, DS-005 | `SelfEvolutionCompanionSessionService` / update worker | Stop/update active records when target ends | Prevents orphan companion/worker | Background loop leaks |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Raw trace storage/layout | `autobyteus-ts` memory store + server `agent-memory` | Reuse/Extend | Already authoritative for active/archive corpus | N/A |
| Raw trace -> merged tool events | `run-history/projection` transformers | Reuse | Already merges tool call/result | N/A |
| Self-evolution request records | `SelfEvolutionRunStore` | Extend | Existing storage root and records | N/A |
| Companion target state | self-evolution persistence | Create New inside self-evolution | Existing run records are per request, not per activated target companion | Needs target-scoped state |
| Work trace file projection | self-evolution subsystem | Create New | Existing work-history projector is inline digest only | Needs file manifest, idempotent update, full history |
| Agent/team run lifecycle | agent execution services | Reuse | Existing run creation/post message APIs | N/A |
| Persisted metadata cleanup | `app-data-migrations` | Extend | Existing required-on-startup migration framework handles memory metadata rewrites | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `self-evolution` | activation, companion sessions, work trace projection, request records | DS-001, DS-002, DS-003, DS-004, DS-005 | `SelfEvolutionService` | Extend | Main area for the new feature |
| `agent-memory` / memory store | raw trace source access | DS-002 | `RawTraceWorkTraceSourceReader` | Extend | Add a stable source reader instead of direct raw file parsing in self-evolution |
| `run-history/projection` | historical event normalization and tool merge | DS-002 | work trace renderer | Reuse | Keep raw trace semantics centralized |
| `agent-communication` | grant-scoped messaging | DS-004 | companion session | Reuse | Existing safety boundary |
| `agent-execution` | live run/team creation and lookup | DS-003 | companion session | Reuse | No duplicated runtime ownership |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `self-evolution/domain/work-traces.ts` | self-evolution | work trace model | Structured target identity, manifest, source descriptor, package metadata | Shared model for renderer/store/service | Yes |
| `self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | self-evolution | projection owner | Backfill/catch-up and idempotency | Main projection use-case | Yes |
| `self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | self-evolution | renderer | User/worker block rendering and tool nesting | Keeps display format separate | Yes |
| `self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | self-evolution | persistence | Work trace root, manifest, atomic writes | File IO concern | Yes |
| `self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | self-evolution | redaction | Reusable sanitization | Existing projector redaction should not remain private duplicated regex | Yes |
| `agent-memory/services/raw-trace-work-trace-source-reader.ts` | agent-memory | raw trace source boundary | Provides raw archive segment/active records with fingerprints | Prevents raw layout duplication | Yes |
| `self-evolution/services/companion/self-evolution-companion-session-service.ts` | self-evolution | companion lifecycle | Activate/reuse/recreate companion and post triggers | Lifecycle owner | Yes |
| `self-evolution/services/companion/self-evolution-evolver-session-store.ts` | self-evolution | target-scoped persistence | Evolver session state per target, persisted as `evolver_session.json` | Separate from per-request records | Yes |
| `self-evolution/services/work-traces/self-evolution-work-trace-update-worker.ts` | self-evolution | bounded local worker | Activated target catch-up loop | Optional local loop owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Target identity in records | `domain/work-traces.ts` | self-evolution | Needed for manifest/state audit | Yes | Yes | Path key or duplicated run-id/hash folder |
| Redaction regexes | `self-evolution-work-trace-redactor.ts` | self-evolution | Existing projector and renderer need same sanitization | Yes | Yes | General security sanitizer for all app outputs |
| Work trace manifest model | `domain/work-traces.ts` | self-evolution | Store/projection/trigger need same shape | Yes | Yes | Raw trace manifest clone |
| Trigger message payload metadata | `domain/evolver-session.ts` | self-evolution | Companion session service and tests need exact shape | Yes | Yes | Kitchen-sink prompt bag |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `SelfEvolutionTargetRef` in work trace records | Yes | Yes | Low | Use structured target identity in manifest/state; do not derive a path key under target memoryDir |
| `SelfEvolutionWorkTraceManifest` | Yes | Yes | Medium | Keep manifest about derived work trace files only, not raw replay details |
| `SelfEvolutionWorkTraceSource` | Yes | Yes | Low | Expose source kind/index/fingerprint/records through memory boundary |
| `SelfEvolutionEvolverSessionState` | Yes | Yes | Medium | Separate target evolver session state from request run records |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts` | self-evolution | domain model | Work trace manifest, file descriptor, projection result, structured target identity | One model subject: work traces | N/A |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | self-evolution | domain model | Evolver session state, trigger request metadata | One model subject: target-scoped evolver session | N/A |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | agent-memory | raw trace source boundary | List archive/active raw sources for projection with fingerprints | Keeps raw layout behind memory | Reuses raw store |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts` | self-evolution | redaction | Sanitizes visible work trace content | Reusable by renderer and any summary | N/A |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts` | self-evolution | renderer | Renders chronological timestamped `user:` / `worker:` blocks and nested tools | One output format owner | Reuses replay events |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts` | self-evolution | persistence | Work trace directories, manifest read/write, atomic writes | One persistence boundary | Reuses manifest model |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts` | self-evolution | projection owner | Backfill/catch-up from raw sources into work trace files | Main work trace use-case | Reuses reader/renderer/store |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-update-worker.ts` | self-evolution | bounded worker | Activated-target polling/catch-up | Local loop owner | Reuses projection/store |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-evolver-session-store.ts` | self-evolution | target-scoped persistence | Evolver session state at `<memoryDir>/self_evolution/evolver_session.json` | Separate from request records | Uses target `memoryDir`; no target key path |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-session-service.ts` | self-evolution | companion lifecycle | Activate/reuse companion and post trigger message | Main companion owner | Reuses store/work trace package |
| `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts` | self-evolution | use-case boundary | Orchestrate request using new projection, click-time settings, and companion services | Existing public owner | Reuses new services |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | agent execution | run provisioning | Remove manual self-evolution launch snapshot resolution/plumbing | Run creation should not own manual self-evolution policy | N/A |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | team execution | team run provisioning | Remove team/member self-evolution launch overrides/effective snapshots for manual model | Team creation should not own manual self-evolution policy | N/A |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-self-evolution-run-metadata-migration.ts` | app-data migrations | persisted metadata migration | Remove obsolete `selfEvolutionEffective` from standalone run metadata and recursive team agent-member metadata | Real data cleanup belongs in migration framework | N/A |
| `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts` | self-evolution | strategy adapter | Either removed or reduced to adapter over companion service | Avoid mixed lifecycle/projection | Reuses companion service |

## Ownership Boundaries

- `SelfEvolutionService` remains the authoritative boundary for a self-improvement request. GraphQL callers must use it.
- `SelfEvolutionWorkTraceProjectionService` is the authoritative boundary for converting raw trace data to work trace files. Companion code must not read raw trace JSONL directly.
- `RawTraceWorkTraceSourceReader` is the authoritative raw trace source boundary. Self-evolution should not know active/archive path rules except through source descriptors.
- `SelfEvolutionCompanionSessionService` is the authoritative boundary for companion lifecycle and trigger delivery. Strategy adapters should not create/terminate agent runs directly outside it.
- `SelfEvolutionWorkTraceStore` owns file paths and manifests; renderers/services should not construct paths ad hoc.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SelfEvolutionService` | resolvers, projection service, companion service, record lifecycle | GraphQL resolver, future trigger strategies | Resolver calls projection/companion directly | Add service method |
| `SelfEvolutionWorkTraceProjectionService` | source reader, event merge, renderer, store | `SelfEvolutionService`, update worker | Companion prompt points at raw traces | Add projection output fields |
| `RawTraceWorkTraceSourceReader` | raw trace manifest/active path reading | work trace projection | Self-evolution manually parses raw trace folders | Extend reader descriptors |
| `SelfEvolutionCompanionSessionService` | agent/team run creation, reuse, trigger post, grants | `SelfEvolutionService` | strategy creates and terminates runs itself | Add companion lifecycle API |
| `SelfEvolutionWorkTraceStore` | filesystem layout, manifest, atomic writes | projection service, companion service for paths | services build memory paths manually | Add store method |

## Dependency Rules

Allowed:
- GraphQL resolver -> `SelfEvolutionService`.
- `SelfEvolutionService` -> context/skill/config resolvers, work trace projection, companion session, record lifecycle.
- Work trace projection -> raw trace source reader, run-history transformer, renderer, store. Projection should maintain a flat work trace file set that mirrors raw trace structure: stable numbered work trace files for numbered raw traces, plus a regenerated active work trace file. It should publish/update a flat manifest after writes complete.
- Companion session -> agent execution service, direct-message grant registry, evolver session store, work trace package metadata.
- Update worker -> evolver session store / projection service.

Forbidden:
- Do not place `targets/<targetKey>` under a target-specific memoryDir.
- Metadata removal must happen through app-data migration framework, not opportunistic silent cleanup during ordinary metadata reads.
- Self-evolver companion agent/team reading `raw_traces*.jsonl` directly.
- GraphQL resolver calling work trace projection or companion session directly.
- Raw trace writer importing self-evolution services.
- Target context resolver reading manual self-evolution eligibility from run metadata snapshots.
- Work trace renderer reading files or managing companion lifecycle.
- Companion session constructing work trace paths without `SelfEvolutionWorkTraceStore`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `startForAgentRun({ runId })` | agent run self-evolution request | Public self-improve request | `runId` | Existing boundary preserved |
| `startForTeamMember({ teamRunId, memberRunId })` | team member self-evolution request | Public self-improve request | `teamRunId + memberRunId` | Existing explicit identity preserved |
| `ensureCurrent(targetContext)` | work trace projection | Backfill/catch-up work traces | `SelfEvolutionTargetContext` | Returns manifest/root/generation |
| `listSources(targetContext)` | raw trace sources | Raw archive/active source discovery | explicit target context with memory dir | No ambiguous run ID |
| `activateOrGet(targetContext, skillTargets)` | companion session | Create/reuse companion | explicit target ref/context | Strategy-neutral |
| `postSelfImproveRequest(session, workTracePackage, request)` | companion request | Send trigger message | session + work trace package + request record | One message per click |
| `resolveCurrentManualSelfEvolutionSettings()` | self-evolution settings | Resolve click-time strategy/evolver config | none or current user/admin context | Replaces run-launch snapshots |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `startForAgentRun` | Yes | Yes | Low | Keep |
| `startForTeamMember` | Yes | Yes | Low | Keep |
| `ensureCurrent` | Yes | Yes via context | Low | Do not accept generic ID |
| `listSources` | Yes | Yes via context/memory dir | Medium | Keep in agent-memory boundary |
| `activateOrGet` | Yes | Yes | Low | Store by target memory directory in `evolver_session.json`; do not store by target key path |
| `postSelfImproveRequest` | Yes | Yes | Low | Per-click grant/request metadata |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| self-evolver-readable trace files | `SelfEvolutionWorkTrace` | Yes | Low | Prefer over `evidence` |
| work trace conversion owner | `SelfEvolutionWorkTraceProjectionService` | Yes | Low | Avoid generic `EvidenceBuilder` for files |
| live coach/session | `SelfEvolutionEvolverSession` / `SelfEvolutionCompanionSessionService` | Yes | Medium | Use `evolver_session.json` for persisted backend state; reserve companion wording for the runtime relationship |
| request audit | `SelfEvolutionRunRecord` | Yes | Low | Keep per request |
| source reader | `RawTraceWorkTraceSourceReader` | Yes | Medium | It is intentionally a memory boundary for work-trace projection only |

## Applied Patterns (If Any)

- Projection: raw trace corpus -> self-evolution work trace files. Owner: `SelfEvolutionWorkTraceProjectionService`.
- Repository/store: work trace files/manifests and evolver session state. Owners: `SelfEvolutionWorkTraceStore`, `SelfEvolutionEvolverSessionStore`.
- Worker loop: activated-target catch-up. Owner: `SelfEvolutionWorkTraceUpdateWorker`.
- Strategy adapter: `single_agent` and future `agent_team` companion launch/use behind `SelfEvolutionCompanionSessionService`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts` | File | work trace domain | Manifest/types/structured target identity | Self-evolution-facing domain | Raw trace DTO kitchen sink |
| `autobyteus-server-ts/src/self-evolution/domain/evolver-session.ts` | File | evolver session domain | Session/trigger types | Persisted session state and trigger metadata have one subject | Work trace rendering logic |
| `autobyteus-server-ts/src/self-evolution/services/work-traces/` | Folder | work trace projection | Renderer/store/projection/update worker | Clear sub-owner under self-evolution | Companion lifecycle |
| `autobyteus-server-ts/src/self-evolution/services/companion/` | Folder | companion lifecycle | Session service/store/trigger builder | Clear sub-owner under self-evolution | Raw trace parsing |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts` | File | raw trace memory boundary | Source descriptors/records/fingerprints | Memory owns raw layout | Self-evolution prompting |
| `<memoryDir>/self_evolution/work_traces/` | Folder | work trace store | Flat `work_trace_*.md`, `work_trace_active.md`, and `work_traces_manifest.json` | Mirrors raw trace layout under the target memory directory | Raw JSONL traces |
| `<memoryDir>/self_evolution/evolver_session.json` | File | evolver session store | Live evolver session state | Target memory directory already scopes the target | Per-request audit fields that belong in run records |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `self-evolution/services/work-traces` | Main-Line Domain-Control + persistence sub-concerns | Yes | Low | Work trace projection is a substantial owner |
| `self-evolution/services/companion` | Main-Line Domain-Control | Yes | Low | Companion lifecycle is separate from projection |
| `agent-memory/services` source reader | Persistence-provider boundary | Yes | Medium | Must avoid self-evolution behavior; only source data access |
| `self-evolution/services` current flat files | Mixed | Partly | Medium | New folders prevent flat mixed-layer growth |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Work trace block | `[2026-06-23T08:12:03Z] user:\n...\n\n[2026-06-23T08:12:30Z] worker:\n...\n\ntool: run_bash\narguments:\n  command: rg ...\nresult:\n  ...` | raw JSONL row with `turn_id`, `seq`, `source_event`, `correlation_id` | Shows semantic preservation without raw internals |
| Trigger message | `Self Improve requested. Work trace manifest: /.../manifest.json. Editable skill roots: ... Read work traces as needed.` | Inlining all work trace content into user message | Preserves companion autonomy and context budget |
| Update model | `ensureCurrent()` maintains flat files: `work_trace_000001.md` etc. reused for immutable numbered raw traces, plus regenerated `work_trace_active.md`, then writes `work_traces_manifest.json` | Appending ad hoc text from raw writer directly into long-lived visible work trace files | Avoids raw writer coupling and duplicate entries |
| Companion lifecycle | `activateOrGet` returns existing companion run/team for click #2 | `createAgentRun` then `terminateAgentRun` per click | Implements coach/companion semantics |

Candidate work trace file format:

```text
# Self-Evolution Work Trace 000001

[2026-06-23T08:12:03Z] user:
Could you analyze the raw trace schema?

[2026-06-23T08:12:40Z] worker:
I inspected the raw trace model and searched for usage of source_event and correlation_id.

tool: run_bash
arguments:
  command: rg -n "source_event|correlation_id" autobyteus-server-ts/src autobyteus-ts/src
result:
  Found source_event used for memory API/provenance and correlation_id used for compaction/recovery idempotency.

[2026-06-23T08:15:10Z] user:
I mean whether those fields are useful in the application, not just self-evolver.
```

Visible fields intentionally excluded: `turn_id`, `seq`, `source_event`, `correlation_id`, `tool_call_id`, provider event ids, raw JSON envelopes.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep inline digest for `single_agent` and add work traces for only future `agent_team` | Minimizes changes | Rejected | `single_agent` should also use work trace files/path messages |
| Let companion read raw trace JSONL directly | Avoids conversion work | Rejected | Backend-owned work trace projection |
| Keep one-shot create/terminate run per click | Current implementation already works | Rejected for target design | Companion session service reuses live run/team |
| Add raw trace writer -> self-evolution direct import hook | Most immediate updates | Rejected initially | Dirty/catch-up or polling projection to avoid reverse dependency |

## Derived Layering (If Useful)

- Transport: GraphQL resolver.
- Use-case control: `SelfEvolutionService`.
- Domain-control sub-owners: work trace projection, companion session.
- Persistence/provider boundaries: raw trace source reader, work trace store, evolver session store, run store.
- Runtime/communication adapters: agent execution service, direct-message grant registry.

## Migration / Refactor Sequence

This section includes both code refactor sequencing and real app-data migration work. The removal of persisted `selfEvolutionEffective` fields requires a registered app-data migration.

1. Add domain types for work traces and evolver session state; avoid path-level safe target keys because `memoryDir` is already target-scoped.
2. Add a required-on-startup app-data migration to remove existing persisted `selfEvolutionEffective` fields from standalone run metadata and recursive team agent-member metadata, with backups and atomic rewrites.
3. Remove run/team launch-time self-evolution config plumbing from manual-click path: GraphQL create inputs, run config objects, run/team metadata types/schema, provisioning/team-run snapshot resolution, target context resolver dependence on metadata snapshots.
4. Extract redaction logic from `SelfEvolutionWorkHistoryProjector` into a reusable self-evolution redactor.
5. Add `RawTraceWorkTraceSourceReader` under `agent-memory/services` to expose archive/active raw trace sources with fingerprints through a stable boundary.
6. Add `SelfEvolutionWorkTraceRenderer` using historical replay events so tool calls/results are merged and rendered under worker blocks.
7. Add `SelfEvolutionWorkTraceStore` and manifest/file layout under `<memoryDir>/self_evolution/work_traces/`.
8. Add `SelfEvolutionWorkTraceProjectionService.ensureCurrent()`; first implement deterministic on-trigger flat-file publication from authoritative raw trace sources: convert/reuse immutable numbered raw trace files, regenerate the active work trace when changed, then atomically write `work_traces_manifest.json`.
9. Add `SelfEvolutionEvolverSessionStore` and `SelfEvolutionCompanionSessionService` for live companion activation/reuse and per-click trigger posting.
10. Modify `SelfEvolutionService.startFromEvolutionRequest()` to call `ensureCurrent()` then companion trigger delivery instead of building inline evidence and launching a one-shot strategy.
11. Replace/decommission one-shot behavior in `SingleAgentEvolverStrategy`; either convert it into a thin adapter or remove it in favor of the companion service.
12. Add optional `SelfEvolutionWorkTraceUpdateWorker` for activated-target polling after the on-trigger path is stable.
13. Update built-in `Skill Self-Evolver` instructions to read provided work trace paths and avoid raw trace files.
14. Update tests: work trace rendering, manifest catch-up, second-click companion reuse, trigger-message path content, hidden raw fields, tool argument/result preservation.
15. Remove obsolete tests/assertions that expect inlined `anonymizedWorkHistory` as the main task payload.

## Key Tradeoffs

- File-based work traces vs inline prompt: file-based keeps context small and supports full history, but requires manifest/store/projection logic.
- On-trigger catch-up vs synchronous raw-write conversion: on-trigger is simpler and safe; background polling adds freshness after activation without coupling raw writer to self-evolution.
- Live companion vs fresh run per click: live companion matches user mental model, but requires lifecycle cleanup and recovery handling.
- Full semantic preservation vs huge outputs: preserve meaningful arguments/results by default; redact/separate non-semantic noise rather than blindly truncating everything.

## Risks

- A live companion may die or be terminated unexpectedly; evolver session state and run records must support clear recreate/fail policy.
- Background update workers can leak if target lifecycle cleanup is not connected.
- Work trace files can grow large; the companion has file access but still must reason selectively.
- Tool results may contain sensitive data; redaction must be applied consistently.
- If work trace paths are accessible through `run_bash`, future access-control review may require a purpose-built read-only work trace tool.

## Guidance For Implementation

- Do not expose raw trace files in prompt messages.
- Do not include raw IDs/protocol fields in visible work trace blocks.
- Keep timestamp in each visible block.
- Prefer flat manifest publication for `ensureCurrent()`; reuse immutable numbered conversions, regenerate the active work trace, and avoid incremental append state as the correctness basis, especially across compaction/rotation.
- Preserve tool arguments and result/error because argument mistakes are self-evolution signals.
- Use run-history transformer reuse for tool call/result merge.
- Keep `SelfEvolutionService` as the top-level use-case boundary; add owned services under it rather than pushing logic into GraphQL or the companion prompt.
- Implement on-trigger `ensureCurrent()` first even if a background worker is also planned; every click should guarantee fresh work traces before messaging the companion.
- Implement and register the app-data migration for stale `selfEvolutionEffective` metadata removal; do not rely only on parsers ignoring unknown fields.
- Use `<memoryDir>/self_evolution/work_traces` and `<memoryDir>/self_evolution/evolver_session.json`; do not use `targets/<targetKey>` or hash-suffixed directory names under target memory.
