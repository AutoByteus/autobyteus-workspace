# Investigation Notes

## Investigation Status

- **Bootstrap Status:** Complete. Dedicated ticket worktree and branch created from refreshed tracked remote base.
- **Current Status:** Initial implementation review failed on CR-F-001, but the
  user's convention challenge exposed that MP-CR-001 did not pass the mandatory
  Product-Reachability Gate. SR-014 rejected that premise. SR-015 then audited
  the complete persisted-data design against the canonical production data-
  migration convention and server README. The result is `Pass`: existing rows
  are directly usable current data, no migration or backfill is truthful, the
  current runtime remains forward-only, and no speculative recovery is allowed.
  The audit added explicit mapping for the existing snapshot-v5 migration's
  caller-only API rename, current-model terminology, and isolated-fixture
  validation; it changed no product behavior. CR-F-002/003 remain bounded
  implementation fixes; API/E2E remains blocked until source review passes.
- **Investigation Goal:** Determine what Activity and Event Monitor currently own; locate the truthful native/Claude/Codex system-instruction boundaries; and identify the narrow reusable trajectory foundation required to add system instructions first without prematurely implementing other activity kinds.
- **Scope Classification:** Large.
- **Scope Classification Rationale:** The request crosses frontend history loading, run-history GraphQL projections, raw-trace storage, Activity state/rendering, native/Claude/Codex runtime boundaries, persistence, privacy, and coverage.
- **Scope Summary:** Preserve Event Monitor; refactor Activity's closed tool/compaction contract into an extensible typed trajectory foundation; add durable, truthful system instructions as the only new visible kind; defer archive browsing and all other trajectory kinds.
- **Primary Questions Resolved For Design:** (1) what “system prompt” truth is observable per runtime, (2) its accepted active-only lifecycle, (3) how it participates in Activity without a prompt-specific side channel, (4) how provider events are normalized before Activity, (5) how startup capture reaches listeners without claiming a second durable event store, (6) how a run-scoped record stays out of turn/working-context consumers, and (7) whether the additive data model preserves existing runs.

## Request Context

The user supplied screenshots of the desktop UI. They show a center agent conversation and a right-side Activity panel populated by tool cards. The broader request asks whether the Event Monitor currently only shows recent/current trace material, why upward scrolling cannot reach the original user message, whether one-at-a-time trace loading is safe, and whether Activity should expose system prompts, user input, and agent-facing execution events.

On 2026-08-20 the user clarified the product intuition: Activity should act as the agent's trajectory/internal-activity log, not remain a tool-call-only list. It should be able to show the constructed/application-supplied system instructions and user input, while acknowledging that Claude and Codex do not expose the provider's complete system context. The user also explicitly questioned the remaining responsibility of Event Monitor if Activity becomes a fuller trajectory, and requested codebase investigation before further solution claims.

The user then prioritized the immediate delivery: system-prompt visibility is
the necessary first new Activity kind. The latest clarification preserves the
larger trajectory intent as an architectural requirement—future logs and
activity kinds should be addable—but does not approve implementing those kinds
now. The correct refinement is therefore **prompt-first, trajectory-ready**:
one typed Activity entry model, specialized kind payloads/renderers, and no
generic JSON bag or fixed prompt-only header.

The user subsequently asked whether Activity should remain event-based and
provider-neutral. Current-code tracing confirms that this is the right model
with one important distinction: Activity should be an **event-fed projection**,
not a raw event monitor. Provider-specific adapters normalize source events;
common semantic lifecycle events are then folded into stable Activity entries.
The new prompt capability should extend that seam rather than expose Claude,
Codex, or native protocols to the frontend.

The user then proposed recording system-instruction Activity in raw traces so it
survives restart. This matches the current historical ownership direction:
normal Activity hydration is derived from raw traces. The code adds an important
constraint, however. Normal projection reads only the active raw-trace file and
then selects the latest 100 replay events. A normal chronological prompt record
can therefore remain on disk yet disappear from the default Activity projection
after rotation or a long run. A retained lookup was initially proposed, but the
user later explicitly accepted the existing active-only bounded behavior.

The user then challenged speculative persisted fields and requested a
field-by-field audit. The resulting minimum removes `runtime_kind` and
`instruction_boundary` from the trace as well as the previously rejected
`snapshot_id` and `fidelity`: the owning run metadata already supplies runtime,
and there is one approved instruction source per runtime. The real schema gap is
instead that current raw traces require a turn while Codex supplies
`baseInstructions` during thread start/resume before any turn exists. Because
the product subject is a run instruction version rather than a turn message,
the provider-neutral trace is run-scoped for all runtimes and stores no
`turn_id` or per-turn `seq`.

A final native-provider audit corrected an earlier overstatement. There is no
single provider-neutral “actual outbound native system prompt” after request
assembly: Anthropic concatenates every system-role working-context message,
whereas Gemini omits those messages from rendered history and sends the LLM
instance's configured `systemMessage`. The exact common subject matching the
user's wording (“what we have added” / “constructed system prompt”) is therefore
the final AutoByteus-owned instruction value supplied/configured at each runtime
handoff. For Native that is `currentSystemPrompt` passed to
`llmInstance.configureSystemPrompt`, not a claim about the provider's complete
effective request context.

The user then asked where the event itself is persisted. The exact answer is a
current/proposed distinction: `SYSTEM_INSTRUCTIONS_SUPPLIED` does not exist and
is persisted nowhere today. In the proposed feature, its durable representation
is the five-field JSONL record in the selected run's
`raw_traces_active.jsonl`; rotation can move that same row to a numbered
`raw_traces_NNNNNN.jsonl` segment catalogued by `raw_traces_manifest.json`.
The live `AgentRunEvent`/WebSocket message is not another event store. It is
published after trace commit and carries the same trace ID.

The user next requested one general mental model covering current Activity,
future extensibility, raw-trace semantics, and restart restoration. Current
Activity has two paths into the same in-memory Pinia store: live WebSocket
lifecycle messages are folded by frontend handlers into tool/compaction rows,
while reopening a run calls the run-projection API, which reads only active raw
traces, normalizes them to replay events, selects the latest 100, projects tool/
compaction activities, and replaces the store state. Desktop renders the full
resident store window; mobile currently renders at most ten rows. Activity is
therefore an event-fed projection, not the provider event stream itself.

“Raw trace” also needs a precise definition. It is raw relative to derived
conversation, Activity, episodic, and semantic projections: it retains selected
normalized replay/audit facts before those projections. It is not an exhaustive
or untouched log of every internal/runtime/provider event. A future trajectory
kind should enter raw traces only when its exact fact must survive restart or
support replay/audit. Transient chunk/status events may instead update an
existing projected entry without becoming one trace row per event.

The user has now explicitly simplified retention: the system-instruction event
must be written to `raw_traces_active.jsonl` and displayed in Activity, but it
does not need to remain visible after current recent-window trimming or
compaction/rotation. The accepted slice therefore uses the existing active-only
projection, adds no pinned row, performs no archive scan, creates no retained
landmark/index, and shows no placeholder when the record is absent.

Implementation review later proposed a missing prepared-run retry boundary.
The user correctly challenged its production basis. Normal composer Send reaches
the defensive `recordRunStarted` branch, but reachability requires an independent
supported cause of the write failure—not merely a caller that would observe one.
Repository conventions allow normal filesystem behavior, writable storage, and
a stable process; arbitrary syscall/storage failure is outside scope absent a
separate operational contract. Supported cancel and stale-prepared cleanup are
blocked while the command is outstanding and cannot produce the claimed
unchanged-present state. A mocked `recordRunStarted -> null` test demonstrates
branch behavior only. MP-CR-001 is therefore `Not Reachable`, and its proposed
unconditional `created:false` publication rule is not product authority.

The screenshots are retained context references:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b49c9266f232468a8882048860fca281/solution_designer_d4027f1b516441b2b70cc8dec46af456/context_files/ctx_107b73703c9e__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b49c9266f232468a8882048860fca281/context_files/ctx_07bca76af517__image.png`

## Environment Discovery / Bootstrap Context

- **Project Type:** Git.
- **Task Workspace Root:** `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency`.
- **Task Artifact Folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency`.
- **Current Branch:** `codex/event-monitor-history-transparency`.
- **Current Worktree / Working Directory:** `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency`.
- **Bootstrap Base Branch:** `personal` resolved through `origin/HEAD`.
- **Remote Refresh Result:** `git fetch origin --prune` succeeded before worktree creation; the reused task worktree was refreshed to `origin/personal`. The architecture design read was performed at commit `d147e5262060665a3b8ecc292c4600155e99335f`. Immediately before handoff the task branch was fast-forwarded to `3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`; the intervening commit changed only completed-ticket delivery evidence and no production, test, dependency, or task source used by this design.
- **Task Branch:** `codex/event-monitor-history-transparency`.
- **Expected Base Branch:** `origin/personal`.
- **Expected Finalization Target:** `personal` after downstream review and delivery process.
- **Bootstrap Blockers:** None.
- **Notes For Downstream Agents:** IR-001 implementation is present in this
  worktree and failed CRR-001 source review. Preserve it for bounded rework; do
  not treat it as approved or advance to API/E2E. Requirements, the prompt
  Activity UX supplement, and the five-field raw-trace schema supplement remain
  approved. `data-migration-conventions-audit.md` is the SR-015 evidence audit.
  `activity-transparency-ux-spec.md` remains deferred context only.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-prompt-activity-ux-spec.md` | Governing prompt-first trajectory UI behavior | First-class trajectory participation, truthful runtime labels, disclosure, active-only restart/trimming, responsive, and accessibility states | Requirements; design spec | REQ-SP-001–REQ-SP-009; AC-SP-001–AC-SP-011 | Approved design input; SR-014 restores approved presentation authority | Approved product presentation unchanged | Implement the approved row/disclosure states; no failure-specific UI |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/system-instruction-raw-trace-schema.md` | Governing persisted-field audit | Exact required fields, rejected redundancies, runtime capture sources, run-scoped trace constraint, folding, and active-only lifecycle | Requirements; design spec | REQ-SP-002, REQ-SP-003, REQ-SP-008, REQ-SP-009; AC-SP-001–AC-SP-004, AC-SP-010–AC-SP-011 | Approved minimal schema; exact fields unchanged in SR-014 | Approved exact-attribute basis unchanged | Implement first-capture persistence/publication without fabricated turn or delivery metadata |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/data-migration-conventions-audit.md` | Evidence audit against canonical production data-migration conventions and README | Supported released/current source and fixed target, transition classification, forward-only runtime, reachability, proportionality, existing snapshot-v5 migration caller, isolated validation | Requirements; investigation notes; design spec | REQ-SP-003, REQ-SP-004, REQ-SP-009; AC-SP-004–AC-SP-006, AC-SP-011 | SR-015 evidence supplement | N/A — evidence/context, no product behavior authority | Architecture reviewer confirms audit result; implementation preserves caller-only migration update and disposable-fixture rule |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/activity-transparency-ux-spec.md` | Deferred broader Activity/Event Monitor concept | Investigated possible future kinds and archive boundary | Investigation context only | Deferred; former IDs not authoritative | Deferred | Not governing the prompt-first slice | Revisit only under a separately approved broader scope |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-15 | Skill | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/SKILL.md` | Establish workflow and artifact obligations | Requirements precede locked design; dedicated worktree and cumulative handoff are required | No |
| 2026-08-15 | Command | `git fetch origin --prune` | Refresh base refs before worktree creation | Succeeded; `origin/HEAD` resolves to `personal` | No |
| 2026-08-15 | Command | `git worktree add -b codex/event-monitor-history-transparency /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency origin/personal` | Isolate task changes | Dedicated clean worktree created from current `origin/personal` | No |
| 2026-08-15 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`, `AgentConversationFeed.vue` | Verify center Event Monitor behavior | Latest bounded mode, deliberate active-trace upward paging, anchor preservation, browse window, jump-to-latest | No |
| 2026-08-15 | Code | `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Verify latest resident limit | `RECENT_EVENT_MONITOR_VISUAL_LIMIT = 100`, completion-aware trimming | No |
| 2026-08-15 | Code | `autobyteus-web/services/eventMonitor/eventMonitorActiveTracePageService.ts`, `eventMonitorActiveTraceBrowse.ts` | Verify active paging semantics | 50-event pages, cursor/generation handling, bounded browse state; no archive fallback | No |
| 2026-08-15 | Code | `autobyteus-server-ts/src/run-history/projection/active-trace-event-page-policy.ts` | Verify backend page policy | `ACTIVE_TRACE_EARLIER_PAGE_SIZE = 50`, latest window 100, opaque active-generation cursor | No |
| 2026-08-15 | Code | `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Verify physical page implementation | Full active snapshot is read/replayed before selecting a bounded page; response bound is not file-read bound | No |
| 2026-08-15 | Code | `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Verify raw-trace storage | Active and archive JSONL; current `readJsonl()` reads complete files; corpus listing reads all segments | Large-file/index design follow-up needed |
| 2026-08-15 | Code | `autobyteus-server-ts/src/api/graphql/types/event-monitor-active-trace-page.ts`, `run-history.ts`, `team-run-history.ts` | Verify API contract and team parity | Typed central visual union; agent and team-member active page queries; no system/request transparency types | Design API owner needed |
| 2026-08-15 | Code | `autobyteus-web/components/progress/ActivityFeed.vue`, `ToolActivityItem.vue`, `CompactionActivityItem.vue` | Verify Activity UI | Renders tool and compaction activities only; auto-scrolls and highlights | No |
| 2026-08-15 | Code | `autobyteus-web/stores/agentActivityStore.ts`, `runProjectionActivityHydration.ts` | Verify Activity data model/hydration | Activity union contains only tool/compaction; retained 100 recent activities | New typed contract needed |
| 2026-08-15 | Code | `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts`, `historical-replay-events-to-activities.ts`, `transformers/raw-trace-to-historical-replay-events.ts` | Verify replay and activity projection | Raw trace replay normalizes message/reasoning/tool/compaction; activities project tool/compaction only | Prompt/request events absent |
| 2026-08-15 | Code | `autobyteus-server-ts/src/agent-memory/domain/models.ts`, `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Verify persisted raw trace fields | No system prompt or LLM request field; tool/media/message data only | Do not overload generic fields |
| 2026-08-15 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts`, `autobyteus-ts/src/agent/llm-request-assembler.ts` | Locate native request boundary | `RequestPackage` contains canonical/outbound/rendered request representations; no transparency observer | Add boundary hook in design |
| 2026-08-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`, `runtime-management/claude/client/claude-sdk-client.ts` | Locate Claude request boundary | `startQueryTurn` receives prompt/systemPrompt and SDK options | Add provider-specific adapter in design |
| 2026-08-15 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts`, `codex-thread-manager.ts` | Locate Codex request boundary | `thread/start`/resume carries developer instructions; `turn/start` carries mapped user input; context can be provider-managed | Exactness must be labeled |
| 2026-08-15 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`, `runtime-memory-event-accumulator.ts` | Verify runtime event vocabulary/persistence | No LLM-request/system-prompt event; accepted user/tool/compaction events are recorded | New event family or store required |
| 2026-08-15 | Doc | `autobyteus-server-ts/docs/modules/agent_memory.md` | Verify ownership semantics | Raw traces support storage/replay; run history owns conversation/activity DTOs; working context is distinct | Keep transparency projection separate |
| 2026-08-15 | Doc | `tickets/done/agent-run-history-performance/requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `history-window-ui-ux-spec.md` | Check prior approved bounded-history work | Current 100/50/300 and no archive auto-load are intentional prior outcomes | Preserve unless superseded |
| 2026-08-15 | Adjacent Repo Artifact | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-raw-trace-usefulness-analysis/tickets/in-progress/raw-trace-usefulness-analysis/trace-field-analysis.md` | Compare prior raw-trace semantics analysis | Raw traces are normalized replay/audit records; system prompt is not a raw-trace field; working context is continuation authority | Adjacent context only; not modified |
| 2026-08-15 | Test | `pnpm --dir autobyteus-web test:nuxt services/eventMonitor/__tests__/eventMonitorActiveTraceBrowse.spec.ts components/progress/__tests__/ActivityFeed.spec.ts --run` | Probe targeted frontend coverage | Could not start: `cross-env: command not found`; worktree dependencies are absent | Runtime setup needed downstream |
| 2026-08-20 | Command | `git fetch origin --prune`; `git merge --ff-only origin/personal` in the existing task worktree | Reuse the matching isolated task while refreshing current code | Worktree fast-forwarded from `cd2420c60` to `1f5663ddb`; task artifacts remained isolated and untracked | No |
| 2026-08-20 | Screenshot | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_b49c9266f232468a8882048860fca281/solution_designer_d4027f1b516441b2b70cc8dec46af456/context_files/ctx_107b73703c9e__image.png` | Re-check the concrete UI behind the user's wording | Center shows Thinking and compact tool steps; right Activity shows the same tools with Arguments/Result detail. This is intentional semantic overlap but currently leaves Activity tool-dominated. | No |
| 2026-08-20 | Code | `autobyteus-web/components/progress/ProgressPanel.vue`, `ActivityFeed.vue`, `stores/agentActivityStore.ts`, `components/mobile/MobileRunActivityList.vue` | Re-verify current Activity semantics after branch refresh | `RunActivity` remains a strict union of `tool` and `compaction`; desktop and mobile render no input/instruction/request category | No |
| 2026-08-20 | Code | `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`, `AgentConversationFeed.vue`, `docs/agent_execution_architecture.md` | Determine what Event Monitor actually owns | It is a bounded readable user/assistant/reasoning/tool/compaction presentation, explicitly documented as a recent operational view, not a raw protocol-event inspector | No |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`, `carpenter-prompt-sections.ts`, `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts`, `autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts` | Trace constructed native instructions | Native composes agent/team/workspace/practice sections, then appends configured skill catalog to the processed system prompt | No |
| 2026-08-20 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts`, `autobyteus-ts/src/agent/loop/llm-phase.ts` | Locate native model-request observability boundary | Locally observable values include processed system prompt, canonical messages, sanitized outbound messages, rendered payload, tool schemas, turn id, and request id before `streamMessages` | No |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`, `session/claude-session.ts`, `runtime-management/claude/client/claude-sdk-client.ts` | Locate Claude instruction/request boundary | AutoByteus composes agent/team instructions and passes them as Claude SDK `systemPrompt`; user content is `prompt`. Skills are workspace-materialized, and provider-owned prompt/context remains unobservable | No |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `thread/codex-thread-manager.ts`, `thread/codex-thread.ts` | Locate Codex instruction/request boundary | AutoByteus passes composed agent/team instructions as `baseInstructions` on thread start/resume and user input separately on turn start. Skills are workspace-materialized; provider-managed context remains unobservable | No |
| 2026-08-20 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`, `src/run-history/projection/historical-replay-event-types.ts`, `transformers/historical-replay-events-to-activities.ts`, `autobyteus-ts/src/memory/models/raw-trace-item.ts` | Verify event/persistence gap | Runtime event vocabulary and raw trace schema have no system-instruction/request event; replay includes messages/reasoning/tools/compaction, while Activity mapper intentionally selects only tool/compaction | No |
| 2026-08-20 | Data | Python field/type-only inspection of `.../solution_designer_d4027f1b516441b2b70cc8dec46af456/raw_traces_active.jsonl` and `raw_traces_000001.jsonl` | Validate the gap on a representative current Codex-backed run without exposing content | Active: 25 rows / 98,504 bytes (`user` 2, `reasoning` 8, `assistant` 2, `tool_call` 6, `tool_result` 6, boundary 1). Archive: 94 rows / 1,463,413 bytes (`user` 1, `reasoning` 30, calls 31, results 31, boundary 1). Neither file has system/prompt/request fields | No |
| 2026-08-20 | User clarification + code synthesis | Latest Activity trajectory clarification compared with `ActivityFeed.vue`, `MobileRunActivityList.vue`, and `agentActivityStore.ts` | Decide whether system instructions should be a one-off view or the first reusable trajectory kind | User wants future activity/log kinds to be addable; current strict union and direct component branches would make a prompt-only patch preserve the wrong boundary | Require a typed common trajectory base with specialized variants; implement only system instructions now |
| 2026-08-20 | Code synthesis | `agent-run-event.ts`; AutoByteus, Claude, and Codex event converters; `agentStreamMessageProjector.ts`; `toolActivityProjection.ts`; `run-projection-types.ts`; `historical-replay-events-to-activities.ts` | Determine whether Activity is event-based and provider-neutral today | Provider adapters normalize source protocols into shared `AgentRunEventType` events; live handlers fold tool lifecycle events into stable Activity objects; historical replay separately projects normalized tool/compaction entries | Preserve the provider-neutral event-to-projection architecture and add a typed instruction event/entry rather than forwarding raw provider events |
| 2026-08-20 | Code synthesis | `local-memory-run-view-projection-provider.ts`; `recent-run-projection-policy.ts`; `raw-trace-item.ts`; `runtime-memory-event-accumulator.ts`; `raw-trace-to-historical-replay-events.ts` | Verify whether raw-trace persistence alone guarantees post-restart Activity visibility | Restart hydration reads active raw traces with `includeArchive: false`, converts them to historical replay, and selects the latest 100; raw-trace schema/accumulator/transformer have no instruction kind | Initially motivated retained discovery; later superseded by the user's explicit acceptance of active-only bounded visibility |
| 2026-08-20 | User scope decision | Direct clarification accepting active-only raw-trace display and disappearance after compaction | Resolve retained lookup/pinning scope | The user wants the event stored in active raw trace and displayed, but does not require visibility after compaction/rotation | Remove retained lookup, archive scan, pinning, and unavailable placeholder from the prompt-first slice |
| 2026-08-20 | Code field audit | `raw-trace-item.ts`; `memory-recording-models.ts`; `external-runtime-memory-writer.ts`; `agent-run-metadata-types.ts`; Native `system-prompt-processing-step.ts`; Claude `claude-session.ts`; Codex `codex-thread-manager.ts` | Validate every proposed instruction-trace attribute and reject redundant or false identities | Raw trace/run metadata already provide ID, time, run, and runtime; Codex supplies base instructions at thread start/resume before a turn exists; the Activity subject is a run instruction version, not a turn message; one instruction source exists per runtime | Use one five-field run-scoped semantic record for all runtimes; do not store turn/seq, runtime, boundary, snapshot, fidelity, hash, or provider IDs |
| 2026-08-20 | Native provider serialization audit | `memory-manager.ts`; `llm-request-assembler.ts`; `llm-phase.ts`; `anthropic-llm.ts`; `gemini-llm.ts`; `gemini-prompt-renderer.ts`; `base.ts` | Test whether “actual outbound native system prompt” is one exact provider-neutral value | Anthropic joins all system-role messages; an interruption recovery note can add a later system-role message; Gemini ignores system-role working-context messages and uses configured `llmInstance.systemMessage`; other adapters own their own serialization | Define this slice as the exact AutoByteus-constructed/configured prompt. Provider-effective request inspection is a separate provider-level feature |
| 2026-08-20 | Live/reload identity audit | `agent-run-event.ts`; `services/agent-streaming/models.ts`; `agentActivityStore.ts`; run projection activity types/hydration | Verify whether the five stored fields are sufficient for identical live and restart Activity identity | Existing live events have no envelope event ID; Activity requires `activityId`; projected history can use raw-trace `id` | The semantic event must carry the same raw-trace ID as `trace_id`; this is transport reuse of persisted `id`, not a second persisted snapshot ID |
| 2026-08-20 | Raw-trace physical-location audit | `memory-file-names.ts`; `run-memory-file-store.ts`; `raw-trace-archive-manager.ts`; `raw-trace-archive-manifest.ts` | Answer where the proposed semantic event is durably stored | Active records are JSONL lines in `raw_traces_active.jsonl`; rotation writes numbered `raw_traces_NNNNNN.jsonl` segments and catalogs them in `raw_traces_manifest.json` | Treat the raw-trace row as the only durable instruction authority; publish live notification after commit |
| 2026-08-20 | Architecture code trace | `agent-run-manager.ts`; `standalone-agent-run-activation-service.ts`; `agent-run-command-coordinator.ts`; `agent-stream-handler.ts`; `agent-run.ts` | Establish the real activation/listener/input order for startup capture | Runtime preparation can capture before an `AgentRun` and browser listener exist. On the supported first-send path, `onActiveRunReady` binds the WebSocket session before `AgentRun.postUserMessage` dispatches to the backend | Native/Codex startup capture remains durable at preparation; stage a newly committed semantic event and publish it after listener binding before first backend input |
| 2026-08-20 | Architecture code trace | `agent-run-event-pipeline.ts`; `default-agent-run-event-pipeline.ts`; `agent-run-memory-recorder.ts`; `runtime-memory-event-accumulator.ts` | Locate semantic-event processing and avoid duplicate persistence | The canonical pipeline fans provider-neutral events outward. The separate run memory recorder records only external runtimes and only selected turn/tool/compaction events; a new system event would otherwise be ignored rather than durably owned | Use one capture/persistence owner before publication; do not add a second accumulator write for the same system record |
| 2026-08-20 | Architecture code trace | Native `agent-factory.ts`, `agent-runtime-state.ts`, `system-prompt-processing-step.ts`, `autobyteus-agent-run-backend-factory.ts`, and `autobyteus-agent-run-backend.ts` | Verify native memory availability and event timing | `MemoryManager` exists before bootstrap; the exact processed prompt can be committed after successful `configureSystemPrompt`. The server's `AgentEventStream` subscribes only after bootstrap, so a bootstrap-only runtime event would be lost | Persist in the core bootstrap step, retain only the transient capture outcome, and let the backend publish a staged semantic event after the `AgentRun` listener exists |
| 2026-08-20 | Architecture code trace | Claude `claude-session.ts`; `claude-session-event-name.ts`; `claude-session-event-converter.ts`; `claude-session-state-input.ts` | Place capture relative to the SDK call | `startQueryTurn` is invoked while the backend listener already exists. Its exact `systemPrompt` and invocation timestamp are locally available | Record after the SDK call is successfully established, then emit the provider-neutral session event; failed SDK setup must not leave a supplied record |
| 2026-08-20 | Architecture code trace | Codex `codex-thread-manager.ts`; `codex-thread.ts`; `codex-agent-run-backend.ts` | Place capture relative to thread start/resume and startup readiness | `baseInstructions` is sent during `thread/start` or `thread/resume` before backend listeners exist; thread startup is not marked ready until a provider thread ID is returned | Capture the invocation timestamp, commit only after a successful response, stage a newly created capture on the thread/backend, and publish it before first input |
| 2026-08-20 | Architecture code trace | `raw-trace-item.ts`; `base-store.ts`; `file-store.ts`; `run-memory-file-store.ts`; `memory-manager.ts`; `memory-manager-tool-protocol-safety.ts` | Determine the type impact of a run-scoped record | Current typed raw-trace lists assume every row is `RawTraceItem` and fabricate turn/sequence values through `fromDict`. Working-context, tool-lifecycle, and compaction logic are turn-scoped consumers | Add a strict system record variant, keep shape-neutral JSONL readers, and rename/narrow turn-only typed list APIs rather than allowing the new record into LLM/tool consumers |
| 2026-08-20 | Architecture code trace | `accepted-compaction-committer.ts`; `run-memory-file-store.ts`; provider compaction rotation | Verify active/archive behavior across runtimes | External provider rotation moves all physical rows before its boundary. Native compaction archives only selected turn-trace IDs, so a run-scoped instruction record would otherwise be left behind even when it precedes the compacted region | Extend the native compaction-owned archive operation to include earlier/equal run-scoped instruction rows without including their content in compaction inputs or semantic counts |
| 2026-08-20 | Architecture code trace | `raw-trace-record-normalizer.ts`; `historical-replay-event-types.ts`; `raw-trace-to-historical-replay-events.ts`; `local-memory-run-view-projection-provider.ts`; `event-monitor-active-trace-page-projection.ts` | Preserve Event Monitor while extending Activity history | One replay array currently drives recent conversation, Activity, active-page cursors, and Event Monitor visuals. An unknown new replay kind would be treated as compaction by the Event Monitor projector, and simple slicing would displace existing central events | Add a typed run-scoped replay event, explicitly exclude it from Event Monitor selection/cursors, and merge it only into the bounded Activity projection horizon |
| 2026-08-20 | Architecture code trace | `memory-view.ts`; `memory-view-converter.ts`; web `types/memory.ts`; `RawTracesTab.vue` | Check existing raw-trace inspection against a no-turn record | GraphQL and the inspector require `turnId`/`seq` and would display manufactured values | Make those fields nullable for run-scoped traces, update generated contracts, and display run scope without inventing a turn or sequence |
| 2026-08-20 | Architecture code trace | `agentActivityStore.ts`; `runProjectionActivityHydration.ts`; `ActivityFeed.vue`; `MobileRunActivityList.vue`; `recentEventMonitorCompletion.ts` | Define a durable Activity extension seam | Activity types live inside the store, desktop/mobile repeat closed kind branches, and Activity's 100-row/completion policy imports Event Monitor-owned utilities | Move the activity union and presentation policy under an Activity-owned type/service boundary, add exhaustive dispatch components, derive summary/detail/runtime copy from authoritative state, and preserve the existing 100-row and mobile-ten-row behavior |
| 2026-08-20 | Architecture code trace | `team-agent-event.ts`; `team-agent-event-adapter.ts`; `team-agent-event-websocket-projector.ts`; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`; web `teamStreamDtoAdapters.ts` | Verify team-member parity | Team member events have their own typed admission, Zod transport, projection, and browser adapter; standalone-only mapping would not reach team Activity | Add the same semantic event through every team boundary, carrying only execution routing plus `trace_id`, `content`, and `ts` |
| 2026-08-20 | Security/logging trace | Native `system-prompt-processing-step.ts`; `agent-stream-handler.ts` raw-event debug path | Prevent new disclosure outside the selected run UI | Native currently logs the full processed prompt, and enabled raw-event debug serializes an entire event payload | Remove the native full-prompt log and redact `content` from debug serialization for the new event while retaining IDs, type, timestamp, and content length |
| 2026-08-20 | User approval | Prompt-first clarification sequence ending with explicit `continue` | Lock the requirements basis and supplements for design | User accepted the active-only lifecycle, exact five stored fields, no turn/seq or redundant metadata, provider-neutral semantics, and chronological collapsed Activity presentation | Produce and submit the design package |
| 2026-08-20 | Command | `git log --oneline HEAD..origin/personal`; `git diff --name-status HEAD..origin/personal`; `git merge --ff-only origin/personal` | Refresh the task branch immediately before handoff and assess design impact | Fast-forwarded from `d147e5262` to `3b81b5ebd`; the sole intervening commit modified only `tickets/done/electron-e2e-runtime-isolation` delivery evidence | No design/source rework required |
| 2026-08-20 | Design authority | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer/design-principles.md` | Validate the final spine, ownership, persisted-data, reachability, removal, dependency, and shared-shape design | The design uses complete supported production-path witnesses, one persistence authority, explicit primary/event/local spines, clean-cut removal, directly usable old data, and tight specialized variants | No |
| 2026-08-20 | Script/Command | Python artifact-structure, stable-ID, table-shape, and exact-five-field validation; `git diff --check` | Verify the cumulative package before architecture handoff | All mandatory headings/artifacts, requirement and acceptance-criterion definition counts, Markdown table shapes, approved statuses, and exact serialized fields passed; no whitespace errors | No |
| 2026-08-20 | Review report | `code-review-report.md` CR-F-001/MP-CR-001 and `code-review-revision-record.md` CRR-001 | Investigate the failed source review and distinguish design impact from bounded implementation corrections | CRR-001 classified the unchanged-prepared metadata-failure premise as reachable Design Impact; CR-F-002/003 are implementation-owned logging/type fixes | Recheck MP-CR-001 against the mandatory reachability gate before accepting its design consequence |
| 2026-08-20 | Code/production-path trace | `AgentUserInputTextArea` send path; `agent-run-command-coordinator.ts`; `standalone-agent-run-activation-service.ts`; `agent-run-activation-candidate.ts`; `agent-run-manager.ts` | Test the claimed abort/retry lifecycle mechanically | If `recordRunStarted` fails while unchanged prepared metadata remains, the defensive branch aborts and a later Send can retry; this establishes the downstream branch only, not an independent supported cause of the failure state | Apply the reachability gate rather than treating the branch as its own contract |
| 2026-08-20 | Code/implementation trace | `system-prompt-processing-step.ts`; `codex-thread-manager.ts`; `system-instruction-trace.ts`; `run-memory-file-store.ts`; `pending-system-instruction-event.ts`; Native/Codex backend dispatch | Evaluate the proposed unconditional publication repair | Current Native/Codex code stages only a newly created row. Staging every reused row could address the synthetic retry but would broaden behavior on ordinary restore/reconstruction without an approved trigger | Do not adopt the repair unless the premise is independently reachable |
| 2026-08-20 | Script/Command | Python mandatory-heading, stable-definition-ID, cross-artifact behavior-ID, exact-five-field, Markdown-table, supplement-path, revision-sequence, and whitespace validation; targeted stale-term scan; `git diff --check` | Validate the superseded SR-013 package before its proposed architecture re-review | The package was structurally consistent, but structural validation did not validate MP-CR-001's initiating premise | Superseded by the SR-014 reachability correction; do not use SR-013 as current authority |
| 2026-08-20 | User correction + design authority | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; shared `design-principles.md` Product-Reachability Gate; code-reviewer/architecture-reviewer skill rules | Determine whether an ordinary Send plus a hypothetical storage failure is a complete product witness | Normal operating assumptions include a stable process, writable storage, and normal filesystem behavior. Infrastructure failure is outside scope absent an independent contract. A fallback branch or synthetic test cannot establish its own initiating trigger | Classify MP-CR-001 `Not Reachable`; withdraw SR-013 |
| 2026-08-20 | Metadata-writer and supported-action audit | `agent-run-history-catalog-service.ts`; `agent-run-metadata-store.ts`; `atomic-json-file-writer.ts`; `agent-run-provisioning-service.ts`; cancellation/stale-cleanup guards | Look for a normal supported path to unchanged-present metadata after start-write failure | Normal write reads current metadata, atomically replaces it, and returns the target. Cancel/stale cleanup refuse while a command is outstanding. Missing metadata yields missing/indeterminate state, not exact unchanged-present retry. Only arbitrary I/O/process faults, unsupported concurrent mutation, or the mocked test produce the premise found | MP-CR-001 is `Not Reachable`; retain original first-capture design |
| 2026-08-20 | Canonical convention + README audit | `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; `autobyteus-server-ts/README.md` Production migration practice; shared design principles | Audit the entire persisted-data design rather than only CR-F-001 | The conventions require an evidence-backed transition choice, one forward-only current model, normal storage assumptions, no guessed historical facts, no speculative recovery, and isolated fixtures. Transform/status/cleanup/recovery-action rules are N/A when no migration runs | Record the durable checklist in `data-migration-conventions-audit.md` and align design terminology/evidence |
| 2026-08-20 | Persisted source/target and existing-migration caller audit | `raw-trace-item.ts`; `run-memory-file-store.ts`; representative active/archive field inspection; `migrate-native-working-context-snapshots-v5-migration.ts`; `raw-trace-record-normalizer.ts` | Verify `Directly Usable — No Migration` and forward-only runtime at code level | Released turn rows remain valid current event rows; absence of a system event is valid current meaning. The new row is additive. The existing snapshot-v5 migration changes only to the explicit current turn-reader API; its ID, historical converter, source/target mapping, status, cleanup, and recovery behavior remain unchanged | Add the migration caller to design mapping/sequence; do not register a new migration or runtime compatibility path |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-SP-001 | User/System | Activity panel opens or projection updates | `ProgressPanel.vue` → `ActivityFeed.vue` → `agentActivityStore` → tool/compaction item components | Activity has only tool/compaction entries and a resident 100 bound | Activity feed/store/components |
| BEH-SP-002 | System | Native bootstrap processes its prompt | Prompt composition/skill catalog → `SystemPromptProcessingStep` → `llmInstance.configureSystemPrompt` | Exact configured string is observable; there was no durable/live transparency path before this change | Native prompt/bootstrap and LLM configuration files |
| BEH-SP-003 | System | Claude starts a query turn | `ClaudeSession.executeTurn` → `ClaudeSdkClient.startQueryTurn(systemPrompt)` | Exact AutoByteus SDK argument is observable; provider-owned context is not | Claude session/client/materializer files |
| BEH-SP-004 | System | Codex starts/resumes a thread | `CodexThreadManager` → `thread/start` or `thread/resume(baseInstructions)` | Exact AutoByteus argument is observable before a Codex turn; provider-managed context is not | Codex manager/thread/materializer files |
| BEH-SP-005 | System | Activity/recent projection admits additional entries | Server recent selection and `agentActivityStore._enforceRecentWindow` | Existing projection/store windows are bounded; no prompt pin exists | Recent projection policy and Activity store |
| BEH-SP-006 | Operational | Existing/compacted run is opened | Active raw trace → replay/projection; old data has no system row | Old runs remain readable and cannot truthfully reconstruct historical prompts | Local provider, raw store, hydration |
| BEH-SP-007 | User/System | Event Monitor loads latest or earlier active events | Active replay selection/page/cursor → Event Monitor projection | Bounded user/assistant/reasoning/tool/compaction narrative; no Activity instruction subject | Event Monitor server/web policies and components |
| BEH-SP-008 | Contract | Activity types/projectors/renderers admit entries | Closed store-local union plus duplicated desktop/mobile branches | No typed extension seam beyond tool/compaction | Activity store/hydration/desktop/mobile files |
| BEH-SP-009 | Contract | Tool/compaction lifecycle is observed live or reloaded | Runtime adapters → provider-neutral `AgentRunEvent`; raw replay → Activity mapping | Activity is already an event-fed projection, not a raw provider-event dump | Event domain, transports, replay and Activity handlers |
| BEH-SP-010 | Operational | Run is reopened/restarted | `includeArchive:false` active raw read → replay → recent 100 → Activity hydration | Active-only restart authority; archives are not scanned by normal Activity | Local memory projection provider and hydration |

## Design Health Assessment Evidence

- **Change posture:** Focused visible feature with a cross-boundary Activity-subsystem foundation refactor.
- **Candidate root cause classification:** Boundary Or Ownership Issue and Shared Structure Looseness. The previously investigated archive-performance issue is deferred from the current slice.
- **Refactor posture evidence summary:**

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Active Event Monitor page policy | Cursor is intentionally active-generation scoped and stops at active-trace start | Current boundary is healthy for “recent active trace,” but insufficient for archive history | Design explicit archive/history owner; do not silently broaden active cursor |
| Local provider and JSONL store | Page selection happens after complete active snapshot/read | Response-level pagination can still cause large physical reads | Investigate offset/indexed file paging before promising large-history performance |
| Activity store, desktop/mobile feeds, and mapper | Only tool/compaction types exist and render branches are closed over those kinds | A prompt-only header/feed would meet the immediate visual need while preserving branch growth and ambiguous ownership | Introduce a narrow common trajectory base with explicit tool, compaction, and system-instruction variants and specialized renderers |
| Runtime event converters and frontend projectors | Native, Claude, and Codex source events are normalized before common tool/compaction Activity projection | Provider neutrality already exists at the semantic event/projection boundary and should be preserved | Add one typed `SYSTEM_INSTRUCTIONS_SUPPLIED` semantic event/record emitted by provider-specific boundary adapters; do not send raw provider payloads to Activity |
| Local run projection and recent policy | Normal projection uses active raw traces only, then keeps the latest 100 replay events | The user accepts this bounded lifecycle for system instructions | Extend the existing active-only projection; do not add a landmark, archive lookup, or pinning policy |
| Raw trace typed readers | All typed records and `MemoryTraceEvent` currently require turn identity and sequence | A run-scoped instruction row would be coerced into false values or leak into LLM/tool consumers | Add one strict run-scoped variant and narrow/rename all turn-only typed list APIs in this change |
| Native/Claude/Codex paths | Different request assembly/call shapes and listener timing, with provider-managed context remaining opaque | Shared semantics need exact capture placement and a startup event-staging seam | Use one five-field persisted fact and one typed semantic event; keep runtime timing inside adapters |
| Existing memory inspector | Selected raw-trace files are already inspectable but its DTO requires turn/sequence | The new row is valid raw evidence and must not manufacture a turn when inspected | Make turn/sequence nullable for run scope; no new archive browser is part of this slice |
| Native exact-ID compaction | Archives only working-context-selected turn records | A preceding run-scoped instruction would be accidentally pinned in active storage | Replace the compaction-owned archive operation with one that also moves earlier/equal system-instruction rows, without adding them to the compaction prompt/count |
| Startup activation and listeners | Native/Codex capture happens before browser/team listeners, while first command binding occurs before backend input dispatch | Emitting only during bootstrap loses the live semantic event; adding a second store is unnecessary | Stage the newly created trace and publish it once immediately before first backend input |
| MP-CR-001 reachability audit | Ordinary Send reaches a defensive retry branch, but normal storage behavior does not produce its required unchanged-present failure state; supported cancel/cleanup cannot race an outstanding command into it | The branch/test cannot establish a product contract, and unconditional reused-row publication would be unsupported machinery | Classify `Not Reachable`; keep fallback behavior outside this feature's required design/coverage |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Center conversation rendering and scroll interaction | Owns active browse state, anchor preservation, jump-to-latest | Preserve as Event Monitor interaction owner; do not add provider transparency semantics here |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Latest resident window policy | 100 central-visual bound and completion-aware trimming | Preserve; extend only through reviewed history boundary |
| `autobyteus-server-ts/src/run-history/projection/active-trace-event-page-policy.ts` | Active page size/cursor policy | 50-event page; active generation only | Keep active policy separate from archive cursor policy |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Builds conversation/activity projections and active page | Full active snapshot before page selection | Candidate owner for projection composition, not storage-level large-file paging |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | JSONL raw-trace file persistence/read | Whole-file reads for active/archive segments | Storage owner for offset/indexed page read if needed |
| `autobyteus-web/components/progress/ActivityFeed.vue` and `components/mobile/MobileRunActivityList.vue` | Desktop/mobile Activity timeline | Directly branch over tool/compaction kinds; desktop auto-follows and highlights | Present all Activity kinds through shared trajectory semantics and kind-specific renderers; avoid a prompt-only fixed region outside the feed contract |
| `autobyteus-web/stores/agentActivityStore.ts` | Client recent activity state | Closed tool/compaction union, bounded 100, and imports Event Monitor completion/limit policy | Move the union/presentation policy into Activity-owned files and keep the store focused on run-keyed identity/folding/window state |
| `autobyteus-server-ts/src/run-history/projection/transformers/historical-replay-events-to-activities.ts` | Historical activity conversion | Emits only tool/compaction | Extend it with the typed system-instruction replay variant while keeping Event Monitor conversion separate |
| `autobyteus-server-ts/src/run-history/projection/historical-replay-event-types.ts` | Historical replay semantic union | No prompt/request event kinds and all current variants are turn-grouped | Add one explicit run-scoped system-instruction replay variant without a fabricated turn group; filter it before Event Monitor policy/projection |
| `autobyteus-server-ts/src/agent-memory/domain/models.ts` and `services/raw-trace-record-normalizer.ts` | Normalize raw JSONL for Memory Inspector and history replay | Every event requires `turnId` and `seq`; missing values become `""` and `0` | Introduce turn-scoped/run-scoped normalized variants and strict prompt-row admission; omit only malformed prompt rows with a diagnostic |
| `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` and web `RawTracesTab.vue` | Expose and inspect selected raw files | Turn/sequence are non-null and always rendered | Make turn/sequence nullable and present the system record as run-scoped, not as turn zero |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | Native final prompt construction/configuration | Exact `currentSystemPrompt` is passed to `llmInstance.configureSystemPrompt` after configured-skill catalog assembly | Native instruction-transparency capture boundary |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` and native LLM adapters | Native request assembly and provider-specific serialization | Working-context system messages are available, but adapters do not produce one shared effective-system-prompt value | Not the provider-neutral capture boundary for this slice; future provider-request transparency would require adapter-level semantics |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude turn orchestration | Prompt/systemPrompt passed to SDK boundary | Natural Claude instrumentation boundary |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` and `codex-thread-manager.ts` | Codex input/thread calls | Request inputs split across thread and turn calls; startup completes before backend listeners exist | Capture after successful thread start/resume, stage a newly created record, and publish before first input while marking provider context opaque |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-activation-service.ts`, `agent-run-activation-candidate.ts`, `agent-run-manager.ts`, `agent-run-command-coordinator.ts` | Prepared-run activation and defensive candidate lifecycle | Contains an unchanged-prepared failure branch, but no independent supported trigger for its storage-failure premise was found | Do not expand this feature or its coverage for the fallback-only state; preserve existing activation code unchanged |
| `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts` | Run summary/last activity derivation | Not a prompt transparency owner | Do not overload summary derivation with detailed transparency |
| `autobyteus-web/components/memory/MemoryInspector.vue` and raw trace tabs | Existing selected-file memory inspection | Already exposes raw file selection separately from Event Monitor | Candidate reuse/reference for explicit older-history path |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-15 | Code trace | Read `AgentConversationFeed.vue` scroll handlers and browse props | Earlier loading is triggered by trusted user intent, not every scroll event; page prepending anchors the prior first item | Existing active browse is deliberate and should be preserved |
| 2026-08-15 | Code trace | Read `local-memory-run-view-projection-provider.ts` active page path | Active snapshot is loaded and replayed before 50-event slice selection | Need storage-level investigation before claiming a page is cheap |
| 2026-08-15 | Code trace | Read `run-memory-file-store.ts` `readJsonl()` and archive readers | Complete JSONL files are read into memory | One-file-at-a-time does not bound memory for a 30–40 MB file |
| 2026-08-15 | Code trace | Read ActivityFeed/store/hydration and activity mapper | Only tool/compaction data is typed and hydrated | “Show system prompt/input” requires a new event family and API/hydration path |
| 2026-08-15 | Code trace | Read native/Claude/Codex request boundaries | No common request observer; provider boundaries differ | Use provider-neutral semantic envelope with truth labels |
| 2026-08-15 | Test probe | `pnpm --dir autobyteus-web test:nuxt ... --run` | Test command did not start because `cross-env` is unavailable and dependencies are missing in the dedicated worktree | Downstream must set up dependencies before coverage execution |
| 2026-08-20 | Product-reachability audit | CR-F-001 / MP-CR-001 code, docs, normal storage assumptions, supported cancel/cleanup actions, and mocked test | Composer Send reaches the defensive branch, but no independent supported trigger produces its required metadata-write failure/unchanged-present state | Classify `Not Reachable`; do not change design or require dedicated coverage for it |

## External / Public Source Findings

- No external/public source was required for this analysis. The task is governed by the repository’s current implementation and the supplied screenshots.

## Reproduction / Environment Setup

- **Required services, mocks, emulators, or fixtures:** None for static investigation.
- **Required config, feature flags, env vars, or accounts:** None.
- **External repos, samples, or artifacts cloned/downloaded:** None.
- **Setup commands that materially affected investigation:** `git fetch origin --prune`; dedicated worktree creation.
- **Cleanup notes:** No temporary runtime setup was created.

## Findings From Code / Docs / Data / Logs

### What the user meant

The investigation supports the following interpretation:

1. The request is for **agent execution transparency**, not a larger tool list and not a raw JSON event viewer.
2. Activity should answer: **What input was accepted? What instructions did AutoByteus apply? What observable request/context boundary was sent? What tools/compaction happened? What was the request outcome?**
3. Event Monitor should continue to answer: **What happened in the readable interaction, in order?** It owns the full user/assistant narrative, existing Thinking presentation, and compact inline actions needed to understand that narrative.
4. User messages and tool actions may appear in both surfaces without being the same UI. Event Monitor shows content and narrative continuity; Activity shows source, turn/request identity, lifecycle, payload/detail, and observability status.
5. “System prompt” must be labeled by truth boundary. For native AutoByteus this
   slice can show the exact final processed prompt passed to
   `llmInstance.configureSystemPrompt`; for Claude it can show the exact
   `systemPrompt` argument supplied by AutoByteus; and for Codex the exact
   normalized `baseInstructions` supplied by AutoByteus. None is labeled as the
   provider's complete effective prompt/context.
6. Configured skills and tool availability are part of the runtime trajectory but are not always prompt text. Claude/Codex materialize skills into runtime-specific workspace directories; native AutoByteus appends a skill catalog to its prompt. The Activity model must preserve that distinction.
7. The immediate scope is **not** the complete timeline described above. System instructions are the first new visible kind, while the shared typed trajectory seam is the enabling structural work. Future input/request/status/capability kinds remain deferred.

### Event Monitor

The user’s suspicion is partly correct but needs a boundary distinction. The default view is the latest bounded presentation, and the deliberate upward loader already exists for the current active trace. It is not a general “scroll to the beginning of the run” mechanism. Once the active trace has rotated, the original message may be in an archive segment that the active cursor intentionally does not traverse.

The center history problem is therefore not best solved by raising the latest limit. It needs an explicit older-history boundary. A raw-trace file selector or archive browser can be a separate mode, possibly reusing concepts from Memory Inspector, while the center remains bounded and readable.

### Activity

The screenshots accurately show the current Activity meaning: tool calls with expandable Arguments/Result (and related logs/errors), plus compaction entries. It is not currently an end-to-end record of the model request. The user’s proposed conceptual distinction is sound: Activity can become a trace of the agent runtime, while Event Monitor remains the conversation/result surface.

The Activity contract should be semantically typed. A raw trace row is too low-level and lacks system prompt/request information. The current store union and direct desktop/mobile branches also show that bolting on a fixed prompt header would not create the extension seam the user wants. The prompt-first slice should establish stable common trajectory metadata with specialized variants, add `system_instruction` beside the existing tool/compaction variants, and leave future input/request/status/capability variants unimplemented.

The current duplicate tool appearance is not automatically wrong. The center tool card preserves conversational causality between Thinking/text segments; the right card supplies lifecycle, arguments, logs, result, error, and highlighting. The missing piece is that the right trajectory begins only at tools instead of at accepted input/instructions/request dispatch.

### Event-based versus event-dump

Activity is currently event-fed, but its rows are projections rather than raw
events. For example, tool approval, start, log, success, failure, and interrupt
events update one stable tool Activity entry keyed by invocation identity.
Compaction lifecycle events similarly upsert one entry. On reload, normalized
historical replay records are projected into the same two UI concepts.

That separation is the appropriate architecture:

1. provider/native adapters understand external event shapes and invocation
   boundaries;
2. a provider-neutral semantic event contract describes what happened;
3. persistence records enough semantic evidence for honest reload;
4. an Activity projector folds lifecycle events into typed trajectory entries;
5. desktop/mobile renderers depend on entry kinds, never provider protocols.

The same two-path model should remain explicit for every future durable kind:

```text
runtime-specific observation
  -> provider-neutral semantic fact
  -> persist typed raw-trace record
  -> publish live notification with the same identity
  -> project/fold to a typed Activity trajectory entry

server/browser restart
  -> read the active selected raw-trace window
  -> run the equivalent projection/folding rule
  -> restore the same typed Activity entry and identity if still present
```

Adding a kind is therefore not “send arbitrary JSON to Activity.” It requires a
named truth boundary, a decision whether the fact is durable, a discriminated
raw-trace variant when durable, a stable identity/folding policy, a typed
trajectory-entry variant, a specialized renderer, a retention/discoverability
policy, and live-versus-reload equivalence coverage.

System instructions should follow the same path even though the relevant fact
is observed at an AutoByteus-owned runtime handoff rather than emitted back by
the provider. Each adapter can publish the same semantic
`SYSTEM_INSTRUCTIONS_SUPPLIED` event with the exact captured content. `Supplied`
is the supported claim: AutoByteus can prove which value it configured/passed
at that boundary, but it cannot prove network delivery or how a provider
preserved, merged, transformed, or supplemented it. The runtime-specific code
point is essential implementation evidence but does not need to be duplicated
as an `instruction_boundary` field. The live event carries the resulting raw-
trace ID so live and hydrated Activity reuse one identity; that transport value
does not add a second persisted ID.

### Raw trace as restart authority

The user's intuition is correct: current post-restart Activity is ultimately
rehydrated from raw-trace-derived run projections, so a system-instruction trace
is the natural durable audit/replay record. Raw trace is not literally every
internal event today—the accumulator deliberately records selected replay-worthy
message, reasoning, tool, and compaction semantics—but the exact instruction
boundary belongs in that replay/audit category.

The accepted pattern is **active raw trace as the Activity reload source**:

1. the canonical supplied event writes a dedicated typed
   `system_instruction` raw-trace record containing exact content and explicit
   source-event provenance;
2. the normal run projection maps it into a provider-neutral instruction
   Activity entry;
3. after restart, Activity restores it only if the record remains in the active
   trace and current recent selection;
4. trimming or compaction/rotation may remove it from Activity;
5. no archive lookup, retained index, placeholder, or reconstructed text is
   introduced.

The raw record can continue to exist in a numbered archive segment after
rotation, but archive Activity display is explicitly out of scope.

### What we can truthfully show

There are four different useful truths:

1. **Application-constructed instructions/capabilities:** prompt sections and separately materialized runtime capabilities owned by AutoByteus.
2. **Canonical application request:** what AutoByteus assembled before provider formatting (fully available only in the native request assembler today).
3. **Provider invocation boundary:** the arguments AutoByteus passed to Claude/Codex/native provider code.
4. **Provider wire/context reality:** what the provider ultimately serialized, added, or retained server-side.

The first boundary and its concrete runtime handoff are the scope of this
slice. Native also exposes the second boundary in request assembly, but the
system portion of the third boundary is provider-adapter-specific rather than
one shared value. The fourth is not generally observable. The UI must label the
first-boundary content as AutoByteus-supplied/configured instructions, not as a
complete effective provider prompt.

### Performance

The proposed “load one raw trace at a time” approach is directionally safer than loading the whole corpus but insufficient as a guarantee because the current file reader loads a complete physical segment. The design must separate:

- bounded **transport/UI page size**;
- bounded **resident UI window**; and
- bounded **physical storage read cost**.

Only the first two are currently addressed by the Event Monitor implementation.

## Persisted Data Transition Evidence (When Applicable)

- **Current stored subject, location, representative shape, and approximate volume:** Raw traces are JSONL in an active file plus rotated archive segments under the run memory directory. Released rows are turn-scoped and carry the seven common fields plus type-specific optional media/tool/correlation fields. A representative active file was 25 rows / 98,504 bytes and an archive was 94 rows / 1,463,413 bytes; the user reports 30–40 MB loads for some runs. The current code reads complete files. Existing run-history projections derive conversation and tool/compaction activity from these records.
- **Relevant code-model, serialization, semantic, or physical-store change:** The current raw trace model has no run-scoped prompt event. This slice adds one typed five-field row to the existing active JSONL file; it does not add a second file or event store.
- **Normal readers and writers, including unknown/extra-field behavior:** Shape-neutral JSONL readers already preserve record dictionaries. Current typed readers wrongly assume every record is turn-scoped, so they must be narrowed for LLM/tool consumers and extended with a strict run-scoped variant for replay/inspection. Existing conversation projections ignore the new kind; Activity explicitly admits it.
- **Representative direct-read or compatibility evidence:** The normal provider can build existing views without any new prompt/request data; therefore older runs remain directly usable with transparency entries absent. This is not an old-schema compatibility branch: released turn rows remain part of the one current event-log model, and absence means “not recorded.”
- **Required semantics and invariants preserved by direct use:** `Yes` for existing data. Existing raw traces, archive segments, working context, conversation, tools, and compaction semantics must remain intact.
- **Physical storage, privacy/security, disposal, rebuild, or operational constraints:** Prompt content may include internal instructions and paths. It remains under the selected run's existing authorization boundary; this slice does not introduce telemetry/export or a redacted-content variant.
- **Concrete benefit, cost, and risk of migration if it remains a candidate:** Historical migration cannot recreate prompts that were not recorded; rewriting would add cost and risk without truthful source evidence. No migration is recommended.
- **Existing migration framework or lifecycle constraints:** No migration is required for existing data under the additive model. The registered native snapshot-v5 migration must update only its current raw-reader call to `listTurnRawTracesOrdered`; it does not gain a new ID, historical decoder, transform, status, cleanup, or recovery branch. Persisted-data tests use isolated disposable fixtures, never a live user profile.

## Constraints / Dependencies / Compatibility Facts

- Existing active-trace cursors are generation-bound. Archive browsing should use a distinct cursor identity and not silently reinterpret an active cursor.
- Team-member GraphQL path delegates to member run projection; new contracts need standalone/member identity parity.
- `working_context_snapshot.json` is the authoritative native continuation state, not raw traces alone. Transparency must not replace it.
- Existing Activity resident cap and auto-follow behavior should remain unless explicitly superseded.
- The `AgentRunEvent` is only the live semantic envelope. A system-instruction event must never be separately persisted by `RuntimeMemoryEventAccumulator`; the already-committed raw row is its durable authority.
- Initial Native/Codex publication must use the proven command lifecycle: the command coordinator binds the stream/team listener before backend input dispatch. No bootstrap-time emission may be assumed observable.
- Event Monitor active paging, generation identity, `hasEarlierActiveTraceEvents`, and recent conversation selection must be calculated from the pre-existing non-system replay set.
- The frontend targeted test command cannot run until dependencies are installed in the dedicated worktree.
- No new app-data migration is registered. The existing native snapshot-v5 migration's caller-only rename preserves its supported released-source result and keeps historical snapshot interpretation inside its existing converter.
- Persisted-data validation must use isolated temporary/disposable fixtures and must never read or mutate a user's live run directory.

## Open Unknowns / Risks

- The active-only lifecycle is resolved: the instruction is a normal typed
  trajectory row and may be evicted by existing recent-window or trace-rotation
  behavior. No special reachability mechanism remains to design.
- Exact prompt records can contain sensitive internal instructions and paths;
  the current proposal relies on the selected run's existing authorization
  boundary and explicit expansion. A stronger permission policy would require a
  separate product decision; no redacted-content schema is proposed here.
- Multiple runtime handoffs can repeat the same large prompt. The approved
  version policy records only the first supply in a consecutive active-trace
  sequence whose content is equal under direct string comparison, records every
  changed value, and records a
  later reversion as a new version. If rotation removes the latest active
  instruction row, the folding comparison resets rather than scanning archives.
- Prompt content is intentionally projected in full to the selected run UI.
  Native's current full-prompt console log and the generic raw-event debug dump
  would create unnecessary parallel disclosure and must be removed/redacted in
  this change.
- The active JSONL append/rewrite APIs are synchronous and no in-process
  concurrent capture path was found for one run. The design relies on existing
  per-run activation/input serialization; it does not introduce cross-process
  locking or a new transactional log.
- Event Monitor archive placement, storage-level JSONL paging, user-input
  trajectory entries, and any new reasoning exposure are explicitly deferred,
  not unresolved dependencies of the prompt-first slice.
- MP-CR-001 is `Not Reachable` under repository conventions and cannot require
  design or coverage machinery. CR-F-001 should be withdrawn rather than
  “fixed.” CR-F-002/003 remain local implementation corrections.

## Notes For Architecture Reviewer

The requirements basis and governing supplements are approved and the design
package is ready for architecture re-review. SR-015 additionally provides a
line-by-line convention audit with a `Pass` result. Review should focus on: (1)
the SR-014 `Not Reachable` classification and withdrawal of CR-F-001, (2) the
SR-015 `Directly Usable — No Migration`/forward-only-runtime audit and bounded
existing snapshot-v5 migration caller update, (3) one
durable five-field record and no duplicate persistence, (4) capture placement
at each successful runtime handoff, (5) startup event staging relative to the
real listener order, (6) strict run-scoped versus turn-scoped trace boundaries,
(7) complete exclusion from Event Monitor and LLM working context, (8) native
compaction archive behavior, and (9) standalone/team plus desktop/mobile parity.
CR-F-002/003 are implementation corrections, not design alternatives.
