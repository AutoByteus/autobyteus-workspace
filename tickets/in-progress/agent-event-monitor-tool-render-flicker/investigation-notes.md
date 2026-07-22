# Agent Event Monitor Transient Tool-Rendering Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Deep investigation complete; root cause reproduced; requirements approved; design package complete and ready for architecture review`
- Investigation Goal: Reproduce and locate the first boundary that causes tool cards to disappear during live Thinking updates and explains the Thinking-heavy state exposed on selection, then define the smallest evidence-backed correction that preserves the released recent-window architecture.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The user-visible defect is in the Event Monitor, but the causal contract crosses the Codex provider adapter, generic stream segment lifecycle, frontend live state, and bounded presentation. The required code change is bounded to Codex reasoning lifecycle normalization plus focused contract coverage; no UI, GraphQL, selection, or persisted-schema redesign is indicated.
- Scope Summary: Close every Codex logical reasoning block through the existing generic `SEGMENT_END` contract when the adapter already recognizes its real ordered boundary. Preserve reasoning snapshot grouping, matching tool lifecycle updates, selection/hydration behavior, and the approved 100-visual window.
- Primary Questions Resolved:
  1. Can the selection-time Thinking-only frame be reproduced deterministically from a coherent fresh projection? `No.` Settled projections and ordinary hydrated switching were coherent. The frame is consistent with selecting a live context already degraded by the reproduced lifecycle/retention defect.
  2. Can the live tool-visible -> tool-missing sequence be reproduced deterministically? `Yes.` A disposable production-path probe reproduced it exactly: a terminal tool was the completed-first eviction when a 100th stale-mutable Think arrived.
  3. Where is the first faulty boundary? `Codex provider normalization.` The adapter knows when a grouped reasoning block closes but silently deletes its tracker identity instead of emitting `SEGMENT_END`.
  4. Is switching or team-member hydration causal? `No evidence.` Fresh GraphQL projection, full live-team hydration, cached switching, and synchronous component rendering were coherent. Switching exposes the already-mutated context; it does not need a separate workaround.
  5. Is the recent-window policy involved? `Yes as a correct downstream consumer, not the faulty owner.` It intentionally protects mutable visuals and evicts completed ones first. A reasoning block with no end is therefore protected indefinitely while terminal tools are eligible for eviction.
  6. Are tool and Thinking identities stable? `Tool identities are stable; grouped reasoning identity is stable until a real boundary.` The defect is missing completion, not identity churn.
  7. Is Vue component loading/key reuse causal? `No evidence.` Tool components are synchronous static imports; a 20 ms switch trace never showed a Thinking-only intermediate frame once both contexts were coherent. Ordinal keys are not needed to explain the deterministic canonical-state deletion.
  8. Is persisted trace data correct and directly usable? `Yes.` Final projections are fast, ordered, and tool-inclusive; raw traces contain the expected reasoning/tool records. No migration is needed.

## Request Context

The user reported a post-`v1.4.24` Event Monitor bug. When switching from the current solution designer to another solution designer, the newly selected feed initially shows many consecutive collapsed Thinking cards with no tool cards between them. Approximately 3–10 seconds later, tool/edit cards appear interleaved. During a live run, the user has also seen a tool card appear, disappear after a later Thinking segment, and then reappear. The user explicitly requested a new bug ticket, reproduction attempts, and deep investigation rather than a frontend/backend guess.

The supplied screenshots were copied byte-for-byte to `evidence/user-report/` and hashed. They establish the visible transient state and the same selected solution-designer context, but they do not themselves identify the faulty layer.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` monorepo/workspace
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker/tickets/in-progress/agent-event-monitor-tool-render-flicker`
- Current Branch: `codex/agent-event-monitor-tool-render-flicker`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-event-monitor-tool-render-flicker`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed 2026-07-22; `origin/personal` and local `personal` were both `965f97685c08569a98186b2a894243c0b3f602d3` before worktree creation.
- Task Branch: `codex/agent-event-monitor-tool-render-flicker`
- Expected Base Branch: `personal`
- Expected Finalization Target: User's tracked `personal` branch after the full reviewed delivery flow.
- Bootstrap Blockers: `None`
- Downstream Constraint: The completed `agent-run-history-performance` ticket is archived and released as stable `v1.4.24`. This is a new ticket from that released state. Do not modify the archived ticket or shared `personal` checkout. The unrelated `.article-work/` directory must remain untouched.

## Supplemental Task Artifact Inventory

None. This is a technical lifecycle-contract bug with no new user-facing UI behavior. The screenshots and sanitized runtime log are retained evidence, not requirement supplements.

## Retained Evidence Inventory

| Path | Purpose | Sensitive-Data Treatment | Approval Applicability |
| --- | --- | --- | --- |
| `evidence/user-report/01-initial-thinking-only-feed.png` | User-observed initial Thinking-heavy frame | User-supplied screenshot copied unchanged | `N/A` |
| `evidence/user-report/02-tools-eventually-rendered.png` | User-observed later tool-interleaved frame | User-supplied screenshot copied unchanged | `N/A` |
| `evidence/user-report/03-selected-solution-designer-row.png` | Confirms selected role/context | User-supplied screenshot copied unchanged | `N/A` |
| `evidence/user-report/04-live-tool-visible-after-thinking-burst.png` | Later live view with a visible tool card | User-supplied screenshot copied unchanged | `N/A` |
| `evidence/user-report/sha256.txt` | Byte-identity inventory for copied screenshots | Hashes only | `N/A` |
| `evidence/investigation/runtime-probes-20260722.txt` | Sanitized GraphQL, persisted-trace, deterministic window, unit, and browser observations | Counts/kinds/timings only; no content, arguments, or results | `N/A` |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-22 | Repo | `git fetch origin personal`; `git worktree add -b codex/agent-event-monitor-tool-render-flicker ... origin/personal` | Bootstrap isolated work | Latest base was `965f97685c08569a98186b2a894243c0b3f602d3`; dedicated worktree created | No |
| 2026-07-22 | Other | User report and four supplied screenshots | Capture both visible variants | Thinking-heavy selection frame; later interleaved tools; live tool disappearance described | Addressed by probes below |
| 2026-07-22 | Setup | `pnpm install --offline --frozen-lockfile`; `pnpm -C autobyteus-web exec nuxt prepare` | Enable isolated focused tests/browser build | 1,717 packages reused from cache; lockfile unchanged; Nuxt generated types prepared | No |
| 2026-07-22 | Trace | Three read-only `getTeamMemberRunProjection` POSTs per reported team/member against `127.0.0.1:29695/graphql` | Determine backend completeness/latency | 0.0089–0.0188 s; final projections consistently contained interleaved reasoning/tools | No backend final-projection defect found |
| 2026-07-22 | Data | Sanitized parser over the two reported runs' `raw_traces_[0-9]*.jsonl` and `raw_traces_active.jsonl` | Prove product reachability | Real turns contained 173 and 385 reasoning+tool visuals, well beyond the 100-visual live bound | No |
| 2026-07-22 | Test | Disposable web Vitest: 99 incomplete Think + terminal tool + 100th incomplete Think; spec removed after result capture | Reproduce live disappearance | Tool was present at 100 visuals, then completed-first evicted when later Think arrived; canonical state became 100 Think | Durable regression coverage belongs downstream |
| 2026-07-22 | Test | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/events/codex-reasoning-block-converter.test.ts --no-watch --reporter=verbose` | Verify current Codex boundary behavior | 48/48 passed; boundaries clear the tracker ID but tests do not require a segment-end event | Extend coverage in implementation |
| 2026-07-22 | Repro | Isolated Nuxt dev server on `127.0.0.1:3187`, installed backend on `127.0.0.1:29695`; hydrated both reported team runs; sampled B -> A switch every 20 ms for 5 s | Test selection/render hypothesis | Settled feeds were interleaved; selection changed by ~53 ms with no Thinking-only transient | Selection/UI workaround rejected |
| 2026-07-22 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Inspect reasoning conversion | `ITEM_COMPLETED` reasoning and `ITEM_REASONING_COMPLETED` produce only `SEGMENT_CONTENT`; no `SEGMENT_END` | Correct at adapter boundary |
| 2026-07-22 | Code | `codex-reasoning-block-tracker.ts`, `codex-reasoning-event-normalizer.ts`, `codex-item-event-payload-parser.ts` | Inspect grouped identity lifecycle | Active block IDs are deleted by `clearForTurn`/`clearAll`; deleted identity is not returned to any event emitter; missing-turn blocks are not tracked. A separate defensive 128-turn capacity guard can also delete state, but that branch is not reachable in the supported sequential lifecycle. | Make supported lifecycle closure explicit; retain the defensive guard unchanged |
| 2026-07-22 | Code | `codex-thread-event-converter.ts`, `codex-turn-event-converter.ts`, `codex-thread-lifecycle-event-converter.ts`, `codex-raw-response-event-converter.ts` | Map current boundary owner | Existing converter callbacks already centralize when a grouped block is cleared for user/text/first ordered tool/turn/error boundaries | Preserve boundary classification; emit before boundary event |
| 2026-07-22 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `handlers/segmentIdentity.ts` | Verify generic completion contract | `SEGMENT_END` sets `presentationComplete=true` on the exact stream segment identity | No provider-specific frontend code needed |
| 2026-07-22 | Code | `autobyteus-web/services/eventMonitor/recentEventMonitorCompletion.ts`, `recentEventMonitorSelection.ts`, `recentEventMonitorWindow.ts`, `recentEventMonitorMutationCommit.ts` | Trace retention consequence | Think/text are mutable until message completion or `presentationComplete`; terminal tools are complete; completed visuals are evicted before mutable visuals; enforcement mutates canonical live conversation | Policy is correct but receives false lifecycle state |
| 2026-07-22 | Code | `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Explain settled projection behavior | Hydrated projection AI messages are complete and then bounded, so final history remains chronologically tool-inclusive | Preserve |
| 2026-07-22 | Code | `teamRunOpenCoordinator.ts`, `teamRunContextHydrationService.ts`, `runHistorySelectionActions.ts`, `runHistoryWorkspaceHistoryActions.ts` | Evaluate delayed hydration/5 s refresh theory | New live-team open awaits member projections; subscribed live context is intentionally preserved; 5 s workspace refresh replaces tree metadata only and does not rewrite conversations | Do not add selection timer/race workaround |
| 2026-07-22 | Code | `AgentConversationFeed.vue`, `AIMessage.vue` and imports | Evaluate render-loading theory | Tool components are synchronous static imports; final feed keys are ordinal, but no async component loading explains seconds-long omission and canonical-state probe is sufficient | No UI change indicated |
| 2026-07-22 | Code | `claude-session-event-converter.ts`, `autobyteus-stream-event-converter.ts`, `agent-run-event-message-mapper.ts` | Compare provider/generic contract | Other provider/native paths carry `SEGMENT_END`; generic mapper already transports it | Reuse generic contract |
| 2026-07-22 | Code | `runtime-memory-event-accumulator.ts` and run-history projection transformers/providers | Evaluate stored-data effect | `SEGMENT_END` flushes an open reasoning segment; later tool flush becomes a no-op. Projection consumes trace meaning, not a schema version. Existing traces remain readable | Directly usable; no migration |
| 2026-07-22 | Repo | `git log --follow`, `git blame`, and `git log -S` for the Codex reasoning converter/tracker and recent-window selector | Determine whether the defect is newly introduced or pre-existing | Grouped reasoning with silent `void` clear was introduced by `49f6c1070ab536437c1f2fd647b4201f3e123a88` on 2026-07-11 and refined by `c016730b7743f12d3e3b16f114d7bb5f48651b58`; completed-first bounded Event Monitor retention arrived later in `d50cf2cc996e8e1bf63d5cf2dd3e2ef6735a92b5` on 2026-07-18 | Classify as latent lifecycle bug exposed/amplified by the later bounded-window feature |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | `User` | Select another active Codex agent/team member whose live context has accumulated a long turn | Tree/member selection -> existing subscribed context focus -> `AgentConversationFeed` presentation | Selection is immediate and faithfully exposes cached live state. Because that state can already have had completed tools destructively evicted, the selected feed can appear Thinking-heavy even though settled projection data is coherent. | User screenshots; selection source read; isolated browser switch |
| `BEH-002` | `System` | Live recent-window commit reaches more than 100 visuals | mutation baseline -> handler mutation -> `enforceRecentConversationWindow` -> completed-first selection -> canonical conversation mutation -> presentation revision | Mutable visuals are protected; completed visuals are evicted first. False-mutable Think blocks therefore displace terminal tools. This is approved retention behavior operating on invalid lifecycle input. | Window source; existing tests; exact disposable probe; real trace sizes |
| `BEH-003` | `Contract` | Codex emits grouped reasoning snapshots separated by real ordered boundaries; generic consumers require a complete segment lifecycle | Codex app-server message -> tracker/grouping -> `SEGMENT_CONTENT` -> generic handler; expected matching `SEGMENT_END` is absent when the adapter clears the block | Multiple provider snapshots intentionally share one logical Thinking block. At a boundary the tracker drops the block ID but emits no completion, leaving the frontend segment falsely mutable. | Converter/tracker source; 48 passing current tests; mapper/handler comparison with Claude/native paths |
| `BEH-004` | `System` | A completed snapshot has no usable turn, or a supported turn-start/error boundary performs global cleanup | payload parser/normalizer -> missing-turn append or `clearAll` -> tracker state deletion | Missing-turn content cannot later be correlated for closure; reachable global cleanup drops the active identity. Both can abandon content without a generic end. | Tracker/normalizer/parser and turn/thread converter source |
| `BEH-005` | `Operational` | Final GraphQL projection/hydration for active team member | raw traces/provider projection -> `getTeamMemberRunProjection` -> `buildConversationFromProjection` -> complete AI messages -> bound presentation | Settled projections are fast and tool-inclusive; existing traces are authoritative and directly usable. | Six GraphQL probes; sanitized raw-trace scan |

## Design Health Assessment Evidence

- Change posture: `Bug Fix`
- Candidate root cause classification: `Missing Invariant`
- Current design issue found: `Yes`
- Refactor posture: `Needed now, bounded`
- Refactor evidence summary: The Codex adapter owns provider-specific grouping and already decides every real boundary, but its clear API discards the only segment identity required to close the generic lifecycle. Returning/closing that identity is a small ownership correction; duplicating completion rules in the frontend would be the wrong boundary.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Codex tracker/normalizer/parser | Clear operations return `void` and silently delete active identities | Provider adapter violates generic lifecycle invariant | Make closure a first-class result |
| Generic frontend completion | Think is mutable until message complete or segment end | Frontend is correctly provider-agnostic | Do not add Codex checks in web code |
| Recent-window exact probe | False-mutable Think causes terminal tool eviction and canonical deletion | User symptom has a deterministic causal chain | Add cross-boundary regression coverage |
| Real trace scan | Long turns reach 173 and 385 visuals | Defect is reachable in ordinary supported use | Cover >100 sequence |
| Final projection/browser | Settled backend and coherent cached switch are fast | Selection delay/render loading is not the root | No timer, loader, or forced rerender |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-reasoning-block-tracker.ts` | Group completed provider reasoning snapshots into logical blocks | Owns active segment IDs but silently deletes them on supported turn/all cleanup; its defensive 128-turn capacity guard is not product-reachable | Return explicit closure identities for supported lifecycle paths; leave the defensive guard unchanged |
| `.../codex-reasoning-event-normalizer.ts` | Resolve snapshot text, provider/turn identity, and tracker operations | Clear methods erase closure information | Propagate updates and closures to the converter boundary |
| `.../codex-item-event-payload-parser.ts` | Facade over provider payload parsing/normalization | Exposes `void` clear methods | Remain thin; expose typed reasoning lifecycle transitions |
| `.../codex-thread-event-converter.ts` | Governing provider-event -> generic `AgentRunEvent[]` adapter | Dispatches sub-converters and owns event ordering | Must emit closed reasoning `SEGMENT_END` event(s) before the boundary event(s) that caused closure |
| `.../codex-item-event-converter.ts` | Item/tool/reasoning conversion and nuanced boundary classification | Correctly distinguishes first ordered-card creation from matching lifecycle updates, but clear callback has no event result | Preserve classification; route closure through converter owner |
| `.../codex-turn-event-converter.ts` | Turn lifecycle conversion | Clears blocks on turn start/completion without a generic segment end | Closure must precede turn lifecycle output |
| `.../codex-thread-lifecycle-event-converter.ts` | Thread/error lifecycle conversion | Error clears all blocks silently | Closure(s) must precede error/status output |
| `.../codex-raw-response-event-converter.ts` | Raw tool-result conversion | Result-first creation can clear reasoning | Preserve result-first boundary and emit closure first |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Apply generic segment lifecycle | Already handles matching `SEGMENT_END` correctly | Reuse unchanged |
| `autobyteus-web/services/eventMonitor/recentEventMonitorCompletion.ts` | Classify visuals complete/mutable | Correctly trusts generic lifecycle | Reuse unchanged |
| `autobyteus-web/services/eventMonitor/recentEventMonitorWindow.ts` | Enforce the latest-100 canonical live window | Correct completed-first behavior exposes bad upstream state | Reuse unchanged; add focused proof only if useful |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` | Persist normalized reasoning/tool trace meaning | Will flush reasoning on new end event; later tool-boundary flush is idempotent | No schema migration; verify no duplicate trace write |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-22 | Probe | Read-only GraphQL POST, three times per reported run | Stable projections returned in <0.02 s and contained tools/reasoning | Backend settled projection is not missing tools |
| 2026-07-22 | Script | Sanitized raw JSONL `trace_type`/turn count | Multiple ordinary turns exceed 100 visuals; largest 385 | Production reachability proved |
| 2026-07-22 | Test | Disposable exact recent-window fixture | Tool present then removed when later false-mutable Think arrives | Live symptom reproduced at canonical state boundary |
| 2026-07-22 | Test | Current Codex reasoning converter suite | 48/48 pass; no segment-end assertion | Existing tests encode grouping but omit lifecycle contract |
| 2026-07-22 | Repro | Isolated Nuxt, hydrated switch sampled every 20 ms | Coherent cached B -> A switch; no transient omission | No separate selection/render fix |

Full sanitized outputs are in `evidence/investigation/runtime-probes-20260722.txt`.

## Product Reachability Classification

| Premise ID | Classification | Supported Path / Reasoning | Design Consequence |
| --- | --- | --- | --- |
| `MP-LIVE-001` | `Reachable` | An ordinary long Codex turn emits more than 100 reasoning/tool visuals; retained raw traces contain turns with 173 and 385 such visuals. | The lifecycle/window regression is a required target and must have deterministic coverage. |
| `MP-SWITCH-001` | `Reachable` | Selecting an already-running standalone or team-member context focuses its preserved cached conversation; the user screenshots show the resulting Thinking-heavy state. | Preserve selection; prevent prior live-state degradation upstream. |
| `MP-MISSING-TURN-001` | `Contract-Reachable` | The current provider adapter accepts a completed reasoning notification without a usable turn and emits content for it, but cannot track it for a later close. | Emit adjacent content/end with one identity rather than create an uncloseable mutable segment. |
| `MP-CAP-001` | `Not Reachable` | One converter instance processes one sequential run; `TURN_STARTED` globally clears prior active blocks, and normal boundaries/turn completion close the active turn. More than 128 simultaneously active turn IDs requires synthetic or out-of-contract injection. | Retain the defensive capacity guard unchanged. Do not add closure machinery, source scope, or acceptance coverage for this branch. |
| `MP-RESTORE-001` | `Unclear` | The exact event behind the reported 3–10 second tool reappearance was not captured. A later tool lifecycle event or projection can repair presentation, but no specific trigger was reproduced. | Do not use a restoration timer or assumed repair path as a design premise. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `None required.`
- Version / tag / commit / freshness: `N/A`
- Relevant contract, behavior, or constraint learned: The defect is fully established by repository contracts and local runtime evidence.
- Why it matters: No external behavior claim is needed for the requirements or target design.

## Reproduction / Environment Setup

- Required services: Existing installed backend at `127.0.0.1:29695` for read-only projection/browser checks; repository Vitest for deterministic probes.
- Setup commands: `pnpm install --offline --frozen-lockfile`; `pnpm -C autobyteus-web exec nuxt prepare`.
- Installed application: `/Applications/AutoByteus.app` and its packaged server were observed only; neither was stopped nor modified.
- Investigation-owned runtime: Nuxt dev server on `127.0.0.1:3187`, stopped after observation.
- External repos/artifacts: None.
- Cleanup: Disposable probe spec removed; Nuxt process stopped. Repository `node_modules` remains ignored and no lockfile changed.

## Findings From Code / Docs / Data / Logs

1. **The first fault is not “slow tool rendering.”** Tool card components are synchronous. Final projections return in milliseconds. The frontend can render a coherent interleaved feed immediately when its canonical context is coherent.
2. **Codex emits content but not completion for logical Thinking blocks.** `createReasoningContentEvent` returns only `SEGMENT_CONTENT`. The tracker later recognizes real user/text/tool/turn/error boundaries but deletes the active block ID through `void` clear operations.
3. **The generic frontend contract requires completion.** A Think/text segment remains mutable until its message completes or `SEGMENT_END` marks its stream identity `presentationComplete`.
4. **The released recent-window policy makes the failure visible.** In a 100-visual window, terminal tool cards are completed while every old Codex Thinking block is falsely mutable. Completed-first eviction therefore removes tools before stale Thinking. Enforcement mutates the canonical live conversation, so the omission is real state loss rather than a paint artifact.
5. **The exact live disappearance was reproduced.** With 99 incomplete Think segments plus a terminal tool, adding the 100th incomplete Think evicted the tool (`completedEvictions=1`) and left 100 Think segments.
6. **Real runs cross the threshold.** The two reported solution designers have individual turns with 173 and 385 reasoning+tool visuals, so the 100-event condition is normal for long autonomous work.
7. **Selection exposes, rather than creates, the degraded state.** Existing active team contexts are reused and their live state preserved. A coherent hydrated switch showed no transient. The user can therefore switch onto a context whose tools were already removed by prior live commits.
8. **The exact later restoration trigger is not required to prove the defect.** A later result-first/lifecycle update can recreate a missing tool, and a later full projection can restore a coherent final window. The observed 3–10 second reappearance was not independently reproduced, so the ticket must not claim a specific timer. The 5-second workspace-tree refresh is ruled out because it does not rehydrate conversations.
9. **The correct owner is the provider adapter.** Codex grouping is provider-specific; the frontend generic lifecycle and window policy are healthy. Emit the generic end event at the same adapter boundary that already knows a block is closed.
10. **Do not end on each provider reasoning snapshot.** Several completed provider snapshots intentionally belong to one user-visible Thinking block. Prematurely ending the block would falsely classify a segment complete while later content still appends to the same ID. End only at the existing real ordered boundary, or immediately when no turn identity makes grouping impossible.
11. **No active identity on a supported path may be silently abandoned.** Missing-turn completed snapshots and reachable turn-start/error global cleanup need explicit terminal treatment. The separate 128-turn capacity branch is `Not Reachable` in the supported sequential lifecycle and remains an unchanged defensive guard rather than a design premise.
12. **Persisted history remains valid.** New segment-end events may flush future reasoning traces earlier at the same semantic boundary, but existing traces and projection shapes need no transformation. The memory accumulator's later boundary flush is idempotent once the segment is closed.
13. **This is a latent existing invariant bug with a newer visible trigger, not a purely new renderer bug.** The Codex grouped-reasoning path began silently dropping closure identities on 2026-07-11. The latest-100 completed-first window arrived on 2026-07-18 and turned that hidden bad lifecycle state into deterministic tool eviction. The new ticket is appropriate because the correction belongs to the Codex lifecycle boundary, while the completed history-performance ticket remains otherwise valid.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: Per-run `raw_traces_*.jsonl`, `raw_traces_active.jsonl`, manifests, and working-context snapshots under `/Users/normy/.autobyteus/server-data/memory/...`; the two reported runs had 16 archived / 17 total files for A and 18 archived / 19 total files for B at probe time.
- Relevant code-model, serialization, semantic, or physical-store change: No schema change. Future Codex live conversion will add `SEGMENT_END` to the normalized event lifecycle. The memory accumulator can flush the already-buffered reasoning segment at that point instead of waiting for the next tool/turn boundary.
- Normal readers and writers: `RuntimeMemoryEventAccumulator` writes reasoning traces; run-history providers/transformers read trace kind/content/order. They do not require a stored schema version or a historical segment-end record.
- Representative direct-read evidence: Current raw traces produced fast, tool-inclusive final projections for both reported runs; six queries were stable.
- Required semantics and invariants preserved by direct use: `Yes` — reasoning content, tool identities, turn order, and final projection meaning remain intact.
- Physical storage/privacy constraints: Existing user history must not be rewritten. Probes retained only counts/kinds/timing.
- Migration benefit/cost/risk: No semantic benefit. Rewriting history would add I/O and corruption risk without fixing ephemeral live lifecycle state.
- Transition Decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Preserve the approved latest-100 active window, active-only source, paging, archive exclusion, resident bounds, collapsed cards, zero-layout controls, and accessibility behavior.
- Preserve current grouped Codex reasoning: multiple completed snapshots remain one logical block until an existing real ordered boundary.
- Preserve matching lifecycle updates to an existing tool as in-place updates; they must not close/restart the reasoning block.
- Use the generic `SEGMENT_END` contract; no Codex flag, provider check, timeout, loader, forced rerender, duplicate shadow conversation, or full-history fallback in the web client.
- End events must be ordered before the event(s) that caused the block boundary.
- A boundary with no turn identity must close every affected tracked block deterministically; a completed reasoning snapshot with no correlatable turn must be content + terminal end rather than an uncloseable mutable segment.
- Existing raw traces and projections remain directly usable; no compatibility wrapper or dual history format.

## Open Unknowns / Risks

- The exact installed-session event that caused a removed tool to reappear was not captured. This is documented residual observational uncertainty, not a root-cause blocker.
- The implementation must preserve event order when a sub-converter triggers closure and returns multiple boundary events. A hidden “emit later” queue that can reorder lifecycle events would be unsafe unless its scope and flush point are explicit and tested.
- `MP-CAP-001` is deliberately excluded: defensive capacity eviction requires synthetic/out-of-contract simultaneous turn state and must not drive new lifecycle machinery. Its existing guard remains unchanged.
- New end events also reach memory accumulation. Coverage must prove one reasoning trace per logical block and no duplicate/fragmented writes across tool and turn boundaries.
- A missing turn identity needs deterministic fallback semantics so content and its immediate end address the same stream segment.

## Notes For Architecture Reviewer

The user approved the refined requirements on 2026-07-22 and the design package is ready for architecture review. The target design should be rejected if it:

- patches the Vue feed or recent-window selector with Codex-specific knowledge;
- uses a timer, loading mask, forced remount, larger window, or projection refresh to hide the state defect;
- emits `SEGMENT_END` on every provider reasoning snapshot and therefore ends a block that will still receive content;
- preserves `void`/silent tracker clearing on any supported lifecycle boundary path;
- emits the reasoning end after the tool/text/turn/error event that caused the boundary;
- rewrites stored history or introduces dual persisted formats.
