# Agent Event Monitor Performance Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Reopened during delivery verification for validation-topology investigation` — the integrated implementation remains on explicit user-verification hold; no finalization/push/release is authorized.
- Investigation Goal: Determine whether selecting an agent/team-member reconstructs all raw-trace archives, identify the measured delay sources, verify active-file rotation assumptions, define the smallest coherent recent-activity solution, and classify the multi-minute mixed-version delivery observation without risking live data.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: Backend read/projection policy, historical/live frontend state, Event Monitor DOM/scroll behavior, Activity retention, and header cleanup change together; storage format and GraphQL schema do not.
- Scope Summary: Make normal Event Monitor projection active-file-only and latest-100, enforce a matching live rolling window, preserve disclosure behavior, add jump-to-latest when non-pinned, bound Activity data, and remove the copy control.
- Primary Questions To Resolve:
  1. Are all active and archived traces read and reconstructed today? `Yes.`
  2. Where is the delay? `Complete backend corpus work plus especially quadratic frontend dedupe/hydration and unbounded mount work.`
  3. Does compaction keep the active file modest? `Usually, but not by a hard maximum when compaction has not occurred.`
  4. Does the user require archive/history navigation? `No; recent activity only.`
  5. What visible behavior is approved? `Rolling latest 100 Event Monitor events, current collapsed cards, jump-to-latest when scrolled, and copy-button removal.`
  6. How are in-flight events handled at the hard cap? `Evict oldest completed events first; if more than 100 candidates are concurrently mutable, deterministically evict the oldest mutable as the hard-cap fallback and allow at most one source-limited stable-identity re-entry on a later update.`
  7. What triggers unseen activity? `Only inequality between bounded pre-mutation and post-enforcement presentation witnesses, recorded through the per-run revision; never generic timestamps or transient handler effects.`
  8. Is a handler mutation effect sufficient? `No. MP-CR-001 proves a changed event can be synchronously evicted, leaving identical final presentation. The revision must compare bounded pre-mutation and post-enforcement presentation witnesses.`
  9. Which replacement path was omitted? `teamRunOpenCoordinator.mergeHydratedMembers replaces reused non-live member conversations and must reset the revision baseline; subscribed live preservation must not reset.`
  10. What exactly belongs in the witness? `Only semantic primitives used by the central AgentConversationFeed render or its retained card interaction. Activity-only tool result/log state and raw argument-object reference identity are excluded; shared renderer derivations define tool summary/status, usage, and compaction equality.`
  11. Did the multi-minute delivery attempt exercise the integrated server optimization? `No. The integrated frontend was bound to the old port-8000 backend whose compiled provider still reads archives.`
  12. Does that observation prove the approved design failed? `No. It proves a mixed-version topology can retain the old bottleneck. Exact bootstrap/request/hydration markers were not captured, so corrected integrated validation is required.`
  13. How can the real dataset be tested safely? `Quiesce the sole live-data owner or use an atomic storage snapshot, copy a consistent disposable data root, then run the integrated backend on an isolated port with every data-root environment variable explicitly rebound.`
  14. Is a product design change currently required? `No. Existing requirements already demand active-only/newest-100 and <=2.0-second usability. Reopen design only if the corrected isolated-snapshot topology fails a decision gate.`

## Request Context

The user reported severe delay when clicking an agent row/team-member row, suspected reconstruction of all accumulated “rotaries”/history data, and noted that multi-day runs would create a very long scrollbar. The supplied screenshot shows the central Event Monitor with user/assistant text, collapsed Thinking cards, and collapsed tool cards. Through refinement, the user stated they never scroll far upward, only read recent content, do not want an archive-navigation solution, and never use the copy button.

Reference image: `/home/autobyteus/data/memory/agent_teams/software_engineering_team_cfa22c21dace401ba00d365fb95b57dd/solution_designer_62969670fca54e7fbe04a1f7e934be3c/context_files/ctx_1d90b429e36e__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git` monorepo/workspace checkout
- Task Workspace Root: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance`
- Task Artifact Folder: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance`
- Current Branch: `codex/agent-run-history-performance`
- Current Worktree / Working Directory: `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Bootstrap used `origin/personal@75a4c97f`; delivery later integrated `origin/personal@8c7e2c2aa591b174a3d5c90eb0d05584538bbf12` via merge `c13ba233a435eb7c1d0cbd88556b93e77f7ad657`. Latest committed validation checkpoint is `20fe710ef86f2658bc761f5e4bff4aad8603b630`; delivery-owned documentation/evidence remains intentionally uncommitted on verification hold.
- Task Branch: `codex/agent-run-history-performance`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): User's tracked `personal` branch, subject to delivery-stage refresh/finalization.
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: Use the dedicated task worktree, not the shared main checkout. Investigation probes used existing local memory data and the locally running GraphQL endpoint. Raw response bodies were deleted because they contained sensitive tool/conversation data; only aggregate metrics and benchmark scripts remain.

## Supplemental Solution Artifact Inventory

| Artifact Path | Purpose | Evidence Or Decision Captured | Related Requirement / Acceptance-Criteria IDs | Status | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/history-window-ui-ux-spec.md` | User-visible rolling Event Monitor specification | Latest-100 semantics, scrolling states, unchanged disclosures, copy removal | `REQ-001`–`REQ-008`; `AC-001`–`AC-009`, `AC-011` | `Refined`; user-approved | Architecture review |
| `/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/integrated-live-validation-plan.md` | Safe corrected live-validation topology and evidence contract | Mixed-version diagnosis, snapshot exclusivity, metric definitions, decision gates | `REQ-001`–`REQ-003`, `REQ-009`; `AC-001`–`AC-003`, `AC-008`–`AC-010` | `Design-ready`; approval `N/A` | Architecture review, then delivery/API-E2E execution as routed |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-17 | Repo | `git fetch origin personal`, branch/worktree status commands | Satisfy user's request that `personal` be latest and bootstrap safely | `personal` and task base aligned at `75a4c97f`; dedicated worktree created | Delivery must refresh again |
| 2026-07-17 | Code | `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Find normal replay projection source | Calls memory view with `includeArchive: true`, no limit | Change to active-only/bounded projection |
| 2026-07-17 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts`; `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts`; `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Trace disk reads | Archive mode reads complete corpus; active mode reads `raw_traces_active.jsonl`; normalization supports newest-tail limits | Use active mode; select after event reconstruction |
| 2026-07-17 | Code | `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` and rotation docs | Verify compaction behavior | Settled prefix moves to complete archive; active file is rewritten from boundary forward | Supports active-only recent source |
| 2026-07-17 | Code | GraphQL run/team history types and projection services | Check API bound | No limit/cursor; full conversation/activity arrays returned | Bound provider result without schema change |
| 2026-07-17 | Code | replay transformers and projection utilities | Understand lifecycle reconstruction | Complete record set builds compound tool interactions; conversation and Activity are sibling views | Build events before latest-100 selection |
| 2026-07-17 | Code | frontend run hydration services and stores | Find client cost | Semantic dedupe uses `findIndex` plus stable serialization; Activity add uses `.some`; both scale quadratically | Server bound plus shared client cap |
| 2026-07-17 | Code | `AgentConversationFeed.vue`, `AIMessage.vue`, `ActivityFeed.vue`, `AgentWorkspaceView.vue` | Find mount/scroll/copy behavior | All retained items/segments mount; feed follows bottom; no unseen indicator; copy text joins full conversation | Cap state/DOM, extend scroll state, remove copy |
| 2026-07-17 | Data/Probe | Large real `x_marketer` GraphQL projection metrics in `evidence/` | Quantify archive-scale behavior | 47.54 MB; 1,725 conversation + 794 activities; ~0.8 s TTFB; ~1.1 s total | Preserve aggregate evidence |
| 2026-07-17 | Script | `evidence/frontend-projection-dedupe-benchmark.mjs` | Measure exact current client dedupe | 27.885 s at 1,725 entries; 17.526 s at 1,200; 3.980 s at 800 | Replacement path should never receive these counts |
| 2026-07-17 | Data/Probe | Current screenshot run projection metrics | Compare normal/moderate run | 42 conversation + 21 activities; 1.487 MB; ~0.03 s request | Even few items can carry heavy duplicated payload |
| 2026-07-18 | Data/Probe | Largest observed active-only projection metrics and dedupe benchmark in `evidence/` | Test user's active-file assumption | Active-only file ~5.08 MB/988 records; projection 9.09 MB, 609 conversation + 379 activities; request ~0.167 s; dedupe ~906 ms | Active still requires returned/UI bound |
| 2026-07-18 | User decision | Conversation refinement | Resolve product scope | User reads only recent activity, wants no archive UI, wants current collapsed Thinking, approves rolling recent window, requests copy removal | Reflected in requirements/UI spec |
| 2026-07-18 | Architecture review | `design-review-report.md`, findings `AR-001`, `AR-002` | Validate target behavior before implementation | Completed-first eviction and explicit visible-change revision required; `conversation.updatedAt` is too broad | Incorporated into revised package; rerun review |
| 2026-07-18 | Code review | `code-review-report.md`, `CR-001`, `MP-CR-001` | Review implemented source before API/E2E | `effect === changed OR enforcement removed` falsely bumps when a newly inserted completed event is itself evicted and final presentation is identical | Replace commit contract with net bounded witness comparison |
| 2026-07-18 | Code review | `code-review-report.md`, `CR-002` | Audit replacement baselines | `teamRunOpenCoordinator.mergeHydratedMembers` replaces conversation without reset in non-live branch | Add reset and focused preserve-live/non-live tests |
| 2026-07-18 | Architecture review round 3 | `design-review-report.md`, `AR-003`, `MP-AR-003` | Validate revised witness equality domain | Proposed result/log/raw-args-reference slots are not equivalent to central `ToolCallIndicator`; supported `TOOL_LOG` can falsely revise an unchanged card | Preserve transaction/reset architecture; replace only pure witness token contract |
| 2026-07-18 | Code | `AgentConversationFeed.vue`; `UserMessage.vue`; `AIMessage.vue`; all `components/conversation/segments/*.vue`; `ToolCallIndicator.vue`; `CompactionStatusRow.vue`; `toolDisplaySummary.ts`; `contextAttachmentPresentation.ts`; `compactionActivityPresentation.ts`; conversation/segment/activity types | Derive complete central render/interaction field inventory for `AR-003` | Central tools render name, derived summary, semantic status, error, and approval/highlight interaction—not result/log. User attachments use `(id,kind,locator,displayName,type)`. Exact static/media/error/inter-agent, usage, and compaction inputs are now mapped | Encode table/shared-helper rule and complete tests in design |
| 2026-07-20 | Delivery observation | `delivery-live-validation-observation.md`; Electron build/start logs; remote-node screenshot | Explain multi-minute hands-on attempt | New frontend was connected to old backend on port 8000; integrated backend on 29695 used another data root | Independently verify process/artifact/data topology and define corrected validation |
| 2026-07-20 | Process/artifact inspection | `/proc/45/{cmdline,cwd,exe,environ,fd}`; `/app/autobyteus-server-ts/dist/.../local-memory-run-view-projection-provider.js`; missing `recent-run-projection-policy.js`; health probe | Verify old remote backend | PID 45 runs `dist/app.js ... --port 8000 --data-dir /home/autobyteus/data`; provider has `includeArchive:true`; policy file absent; health itself is ~1.3 ms | Mixed-version diagnosis confirmed |
| 2026-07-20 | Process/artifact inspection | `/proc/17730/{cmdline,environ,fd}`; packaged `resources/server/dist/...` provider/policy; port-29695 health | Verify integrated backend | Packaged provider has `includeArchive:false` and calls recent selector; policy exists; AppConfig/DB/log FDs use `/root/.autobyteus/server-data`; health ~0.7 ms | Did not serve representative remote dataset |
| 2026-07-20 | Safety/config inspection | `app-config.ts`, `serverRuntimeEnv.ts`, `linuxServerManager.ts`, `/proc/17730/environ` | Define isolated launch requirements | Electron child inherited stale `AUTOBYTEUS_MEMORY_DIR=/home/autobyteus/data/memory`; run-history AppConfig resolves from `--data-dir`, but proof topology must explicitly override all roots and audit FDs | Validation launcher must sanitize/rebind environment; no production change inferred yet |
| 2026-07-20 | Data scan | Read-only active/archive size scan for `marketing_team_17621f4388b8404b93fed82bda622d87` | Quantify mismatch on user's target team | 2 members; active total 658,743 bytes; 17 archives totaling 31,960,167 bytes. Active-team hydration requests every member projection concurrently | Old backend can repeat archive-scale work across the team |
| 2026-07-20 | Timestamp comparison | Renderer creation log vs screenshot mtime | Bound observed duration | 212.893 seconds from node-window creation to eventual-success screenshot | Combined upper bound only; row click/request/hydration attribution remains unknown |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Clicking/selecting a standalone run or team-member row invokes run-open/history hydration; the selected workspace eventually renders `AgentEventMonitor` / `AgentConversationFeed`.
- Current execution flow:
  - Standalone: row selection/open coordinator -> `getRunProjection(runId)` -> run projection service -> local-memory provider -> memory service -> complete raw-trace corpus -> replay events -> conversation/activity arrays -> frontend semantic dedupe -> conversation and Activity stores -> unbounded feed mount.
  - Team member: member selection/hydrator -> `getTeamMemberRunProjection(teamRunId, memberRouteKey)` -> member identity resolution -> same provider/projection/hydration path.
  - Active team restore requests all member projections in parallel. Active standalone discovery may fully hydrate discovered unselected runs lacking context.
  - Live: `AgentStreamingService.dispatchMessage` or `TeamStreamingService`/`dispatchGenericTeamMemberMessage` routes messages to handlers that mutate conversation and Activity state without a retained-window cap.
  - Both standalone and generic team dispatchers assign `conversation.updatedAt` before switching on every parsed protocol message, including `CONNECTED`, `TURN_STARTED`, and other messages that can leave the center feed unchanged.
- Ownership or boundary observations:
  - The local run-view projection provider is the single normal replay source for multiple runtimes and both standalone/team subjects; it is the correct backend policy owner.
  - GraphQL resolver/service boundaries already own identity differences and can remain thin; duplicating recent-limit arguments across callers would weaken the invariant.
  - Historical hydration and live handlers currently lack a common Event Monitor window owner.
  - `AgentConversationFeed` owns bottom-pinning and is the correct owner for the unseen/jump presentation and final mounted-list guard.
- Pre-change/old-remote behavior summary: Complete archive-inclusive replay is reconstructed by default, returned without a bound, deduped quadratically, retained indefinitely, and mounted in full.
- Integrated candidate state: The ticket implementation replaces that behavior **only when the request reaches the integrated backend**. Its provider reads active-only and returns newest-100. A new frontend bound to an older remote node still receives that node's legacy archive-inclusive response; frontend final enforcement happens after transport and full-input `dedupeProjectionEntries`.
- Delivery mismatch flow: `integrated Electron renderer -> remote-node binding http://127.0.0.1:8000 -> old /app provider includeArchive:true -> all target archives + active -> unbounded team-member responses -> new frontend full-input hydration/dedupe -> final <=100 presentation`.
- Correct validation flow: `integrated Electron renderer -> isolated integrated backend -> consistent disposable snapshot -> active-only reconstruction -> newest-100 response -> bounded hydration/render`, with bootstrap and row-selection clocks separated.

## Design Health Assessment Evidence

- Change posture: `Performance`, `Behavior Change`, `Cleanup`
- Candidate root cause classification: `Missing Invariant`
- Refactor posture evidence summary: Add a shared recent-window policy at the existing backend provider and a shared frontend rolling-window capability; remove now-obsolete full-conversation copy derivation. A wholesale GraphQL/persistence redesign is not justified by the approved scope.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Local projection provider | Hard-coded archive-inclusive read with no limit | Normal view policy is unbounded at source | Enforce active-only and recent limit here |
| Frontend dedupe benchmark | 27.9 s for a real 1,725-entry response | Quadratic code is catastrophic when upstream is unbounded | Ensure normal response is ≤100; retain defensive trim |
| Conversation/Activity components | Every retained item mounts | UI duration grows with run duration | Bound retained and final mounted events |
| Live dispatchers | Mutate state indefinitely | Fixing historical load alone would regress during long live runs | Apply same shared window after logical dispatch |
| Generic conversation timestamp | Changes for visible and non-visible protocol messages | It cannot be the unseen-activity signal | Add explicit actual-presentation mutation effect/revision |
| Copy control | Full joined conversation computed for unused header action | Unnecessary O(history) work and UI clutter | Remove control and derivation |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/run-history/projection/providers/local-memory-run-view-projection-provider.ts` | Local raw-trace replay authority | Reads archive + active, builds full bundle | Own active-only latest policy |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Reconstruct canonical replay events/tool lifecycles | Requires surrounding active records for correct tool pairing | Build all active events before tail selection |
| `autobyteus-server-ts/src/run-history/projection/run-projection-utils.ts` | Build conversation/activity bundle | Duplicates tool representation into bounded sibling views | Reuse unchanged for scope |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Compose memory view reads | Already supports `includeArchive: false` | Reuse active-only mode |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | Convert historical projection to conversation | Full-input semantic dedupe is quadratic | Input becomes bounded; apply shared trim defensively |
| `autobyteus-web/services/runHydration/runProjectionActivityHydration.ts` | Hydrate Activity store | Per-entry store dedupe is quadratic | Bound input/store; no archive path |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` | Standalone live dispatch boundary | No post-dispatch rolling invariant | Invoke shared window after message mutation |
| `autobyteus-web/services/agentStreaming/teamStreamGenericMessageDispatcher.ts` and task projection routers | Team live dispatch/projection | Multiple mutation exits | Apply shared capability at each authoritative mutation boundary, not in individual handlers |
| `autobyteus-web/services/agentStreaming/handlers/*` | Protocol-to-conversation/Activity mutations | Current `void` contracts do not distinguish effective visible changes from no-ops | Center-mutating handlers return a cheap mutation effect; no full-state serialization |
| `autobyteus-web/types/agent/AgentRunState.ts` | Ephemeral per-run execution/UI state | Has no Event Monitor presentation revision | Own revision counter/reset; pass explicitly to feed |
| `autobyteus-web/stores/agentActivityStore.ts` | Per-run Activity state | Unbounded arrays and linear scans | Cap after insert/upsert and clear stale highlight safely |
| `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue` | Merge messages/compactions and own scroll | Full mount; bottom-pin exists; no unseen control | Final latest-100 guard and jump UX live here |
| `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue` | Header and Event Monitor composition | Renders copy button and derives full text | Remove both |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-17 | Probe | Warm local GraphQL `getTeamMemberRunProjection` for real archived `x_marketer` | 47,537,621 bytes; 1,725 conversation; 794 activities; TTFB ~0.80–0.82 s, total ~1.08–1.10 s | Backend/network payload is already excessive |
| 2026-07-17 | Script | Exact copy of `dedupeProjectionEntries` against saved in-memory response during probe | 27.885 s at 1,725; 17.526 s at 1,200; 3.980 s at 800 | Principal measured click freeze is frontend CPU |
| 2026-07-17 | Probe | Current screenshot run | 1,487,xxx bytes; 42 conversation; 21 activities; ~0.03 s | Heavy tool details can dominate even small counts |
| 2026-07-18 | File scan | Search memory roots for largest `raw_traces_active.jsonl` | 5,078,533 bytes / 988 physical rows; no manifest, so it had never compacted | Active file is modest relative to archive corpus but not hard-bounded |
| 2026-07-18 | Probe | GraphQL projection for that active-only run | 9,090,919 bytes; 609 conversation; 379 activities; TTFB 0.1626 s, total 0.1668 s | Server bound still needed even with active-only source |
| 2026-07-18 | Script | Exact frontend dedupe on active-only projection | ~906 ms for 609 conversation entries | A latest-100 response avoids visible quadratic scale |
| 2026-07-20 | Read-only process/artifact probe | Inspect port-8000 and packaged port-29695 process/artifact roots | Port 8000 is old/archive-inclusive against live 304 MB data; port 29695 is integrated/active-only against separate ~6.6 MB profile data | Reported attempt is not end-to-end integrated validation |
| 2026-07-20 | Data scan | Marketing-team active/archive byte totals | 658,743 active bytes vs 31,960,167 archived bytes across two members | Old backend reads ~48x more raw-trace bytes than active-only source before projection amplification |
| 2026-07-20 | Timing bound | Window creation timestamp to screenshot mtime | 212.893 s combined upper bound | Cannot assign time to bootstrap vs row request vs hydration without new markers |

Evidence directory:
`/home/autobyteus/workspace/.codex/worktrees/agent-run-history-performance/tickets/in-progress/agent-run-history-performance/evidence`

Retained files include projection metric summaries, the standalone dedupe benchmark script/results, and active-only metric/benchmark summaries. Sensitive raw response files were removed.

## External / Public Source Findings

- Public API / spec / issue / upstream source: `Not required`; the behavior is repository-local and was established from current code, docs, local stored data, and probes.
- Version / tag / commit / freshness: Bootstrap base `75a4c97f`; delivery-integrated base `origin/personal@8c7e2c2aa591b174a3d5c90eb0d05584538bbf12`, merge `c13ba233a435eb7c1d0cbd88556b93e77f7ad657`, latest committed validation checkpoint `20fe710ef86f2658bc761f5e4bff4aad8603b630`.
- Relevant contract, behavior, or constraint learned: None beyond repository-owned contracts.
- Why it matters: No unstable external dependency is needed for the design decision.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Original investigation used the existing local GraphQL service and real local memory corpus. Corrected delivery validation must use the packaged integrated server and a consistent disposable snapshot as defined by `integrated-live-validation-plan.md`.
- Required config, feature flags, env vars, or accounts: Isolated loopback port; explicit snapshot `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_MEMORY_DIR`, `DATABASE_URL`, `AUTOBYTEUS_LOG_DIR`, and server URL/port; `AUTOBYTEUS_SKIP_SYNC=1`. Do not inherit parent data roots.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git fetch/fast-forward and dedicated worktree creation; read-only GraphQL/file/process probes. No snapshot, server stop, or corrected validation was performed by solution design.
- Cleanup notes for temporary investigation-only setup: Raw GraphQL payloads containing conversation/tool data were deleted. Aggregate metrics and non-sensitive scripts remain.

## Findings From Code / Docs / Data / Logs

1. **Archive reconstruction is real.** The provider explicitly opts into it. This is not merely frontend perception.
2. **The current API is a complete-bundle API.** Both standalone and team projection operations resolve to the same archive-inclusive provider and have no request bound.
3. **Frontend work dominates the worst case.** Exact semantic dedupe repeatedly serializes candidates and scans earlier results; Activity hydration also scans current activities per insert.
4. **DOM/state are unbounded.** Collapsed (`v-show`) Activity and disclosure content can still be mounted; collapsing a card is not list virtualization or retention.
5. **Compaction supports the user's active-only model.** Rotation makes archives settled history and active the current boundary-forward file. Absence/failure of compaction means active can still be several MB, so latest-event bounding remains necessary.
6. **Active-only fidelity can be source-limited.** A tool call in an archived segment and a terminal result in active cannot be fully reconstructed without archive access. Existing replay types already expose `source_limited`; the approved UX prefers speed/recent evidence rather than archive lookup.
7. **The smaller coherent design keeps the current GraphQL shape.** Selecting 100 replay events before bundle construction bounds transport/hydration without creating cursors, detail APIs, or archive UI the user does not want.
8. **Live and historical paths must converge on one frontend count policy.** Message count is insufficient because one `AIMessage` can contain many visual segments.
9. **Copy removal is performance and cleanup.** It removes both an unused control and the only eager joined full-conversation derivation in the header component.
10. **A blind oldest-edge trim is not lifecycle-safe.** Text/Thinking can stream, tools have nonterminal statuses, and compaction rows upsert across phases. These identities must be protected while completed candidates exist.
11. **The hard bound and mutable protection need an explicit fallback.** More than 100 distinct segments in one incomplete turn is reachable. After completed candidates are exhausted, the only coherent hard-cap behavior is deterministic oldest-mutable eviction; later stable-identity payloads may synthesize/upsert one source-limited newest-edge representation, never a duplicate.
12. **`conversation.updatedAt` is not a presentation revision.** It changes before message classification. A non-visible message would falsely show the jump control. The bounded presentation witness provides duration-independent truth without serializing history.
13. **Transient mutation effects are also insufficient.** The implemented effect-OR-enforcement contract can report a change even when completed-first selection removes the changed new event and returns to the identical bounded presentation. Only the authoritative boundary has both the pre-mutation and post-enforcement view needed for net truth.
14. **A bounded lightweight presentation witness is proportionate.** Because state is already capped, capturing at most 100 ordered descriptor tokens before and after is duration-independent. Tokens use stable visual/interaction identity plus shallow semantic primitives/direct primitive lists from the actual central render contract; raw reference comparison and recursive payload serialization are unnecessary and forbidden.
15. **Conversation replacement coverage must include team reopen merge.** A reused non-live member context receives a new `state.conversation` in `teamRunOpenCoordinator.mergeHydratedMembers`; it needs `resetEventMonitorPresentationRevision()`. The subscribed-live branch intentionally preserves both conversation and revision.
16. **The witness must model central presentation, not the broader event object.** `ToolCallIndicator` receives invocation ID, tool name, status, derived argument summary, error, and approval target. It neither receives nor renders tool `result` or `logs`; those belong to Activity/detail. Raw argument-object replacement is also non-semantic because the renderer reduces named top-level command/path/text inputs through `getToolDisplaySummary`.
17. **The exact remaining kinds are shallow and enumerable.** User text plus ordered attachment primitives, text/Thinking content, system content, inter-agent sender/content/type/recipient, ordered media type/URLs, error message/details, formatted per-message/total usage, and compaction message/phase presentation/secondary text cover the current center templates. Timestamps matter only through final selection/order; shell props and component-local disclosure/media-load state are not live-activity revisions.
18. **The delivery attempt was a mixed-version topology, not an integrated acceptance run.** The frontend artifact was current, but its selected remote node used the old archive-inclusive provider. The integrated backend binary was healthy on another port and data root, so the approved server optimization never participated in the observed row load.
19. **The old backend can preserve every original bottleneck.** It reads archived traces, constructs an unbounded duplicated bundle, transports it, and gives the new frontend full input to the still-quadratic historical dedupe before the defensive final cap. The cap is not a proxy for bounded upstream work.
20. **Active-team fan-out amplifies version skew.** The live team path uses `Promise.all` over every member projection. The user's two-member marketing team has about 31.96 MB of archives but only 0.659 MB of active traces. An old backend can repeat archive reconstruction for both before focus becomes usable.
21. **The observed 212.893 seconds is not attributable yet.** It spans node-window creation through a later screenshot, but no exact row-click, projection request, hydration-commit, or usable-content markers exist. It is evidence of poor mixed-topology UX, not evidence that node bootstrap alone or the integrated Event Monitor failed.
22. **Current requirements/design already cover the intended resolution.** `REQ-001`/`REQ-002` require the server behavior and `AC-009` requires <=2.0-second usability. Prior integrated isolated HTTP/browser evidence passed. The missing work is realistic same-candidate validation against a consistent copy of the representative dataset.
23. **Live-data exclusivity is mandatory.** `/home/autobyteus/data` is an ext4 Docker volume actively owned by PID 45, with writable SQLite/log FDs. Without a demonstrated atomic snapshot facility, ordinary copying while it runs is not a consistency proof. A coordinated stop/quiesce is required before copying; the integrated validation server then owns only the disposable snapshot.
24. **Inherited data-root environment is a validation hazard.** The packaged backend process inherited `AUTOBYTEUS_MEMORY_DIR=/home/autobyteus/data/memory`, although run-history AppConfig and observed DB/log FDs resolve to `/root/.autobyteus/server-data`. Corrected validation must explicitly rebind/unset all roots and audit FDs. This observation alone does not prove a current run-history implementation defect.
25. **Static provider evidence, response exclusion, and `/proc` FD snapshots cannot prove absence of transient archive opens.** `AC-001` needs a request-bounded path-only runtime open audit that is active before the request and covers the validation process/descendants. If that facility is unavailable, Mode R is blocked; a Mode S performance/bound run may proceed with the old owner stopped but must mark `OPEN-001` and independent no-open re-proof as not executed, cite the prior durable instrumented API/E2E evidence, and never infer no-open from the bounded response.
26. **Source integrity has two reachable ownership modes.** Quiesced source-to-snapshot equality, validation-process non-access to the live root, and snapshot raw-trace before/after equality are distinct facts. If the old owner remains stopped, live-source equality is also required. If it restarts after the snapshot, its legitimate writes make later live-source equality non-attributable, so that check is `N/A` rather than a failure gate. This resolves `AR-004` without weakening exclusive ownership.
27. **Representative execution remains API/E2E-owned and uses mandatory result routing.** After architecture pass, `api_e2e_engineer` executes. Every `Fail` returns first to `code_reviewer` for focused failure-origin classification with scenario IDs/exact context; `Pass` returns for proportional test-code review (`N/A` if no durable test changed) and then delivery; `Blocked` goes to the user with the exact missing dependency. This resolves `AR-005` and prevents the validation supplement from pre-assigning an unreviewed failure owner.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: JSONL raw traces under `/home/autobyteus/data/memory/agents/...` and `/home/autobyteus/data/memory/agent_teams/...`; active file plus optional complete segment files and manifest. Observed team memory corpus ~209 MB and standalone ~27 MB at investigation time.
- Relevant code-model, serialization, semantic, or physical-store change: None. Only which existing files the normal projection reads and how many derived replay events it returns changes.
- Normal readers and writers, including unknown/extra-field behavior: Existing memory store reads JSONL records and normalizes known fields; rotation writer continues unchanged. Projection reads are read-only.
- Representative direct-read or compatibility evidence: Runs with active-only layouts, manifested active-plus-archive layouts, and large active files all project through the same current normalizer/provider.
- Required semantics and invariants preserved by direct use: `Yes` — active traces remain deterministically normalized and replayed; archived bytes are preserved but intentionally ignored by Event Monitor projection.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Do not rewrite or leak raw payloads. No migration/downtime. Keep aggregate evidence only.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no benefit because schema compatibility is not the problem; it would add I/O and corruption risk.
- Existing migration framework or lifecycle constraints, only if migration may be required: `Not applicable`.

## Constraints / Dependencies / Compatibility Facts

- `includeArchive: false` is already supported by `AgentMemoryService` and reads the active file.
- `normalizeRawTraceRecords` sorts deterministically and can tail-limit records, but approved semantics require tail-limiting **replay events after lifecycle reconstruction**, not raw records.
- Standalone and explicit team-member identities must continue to use their existing distinct GraphQL boundaries.
- No backward-compatibility dual path is needed: the normal Event Monitor changes cleanly from complete corpus to active-only recent projection.
- Existing live handlers and task-agent/team projection routers have multiple mutation entrypoints; implementation must apply the rolling policy at authoritative dispatcher/router exits without scattering trims into every low-level handler.
- The authoritative dispatcher/submission boundary must capture the bounded center-presentation witness before mutation, run the handler and completed-first enforcement, then compare the final witness. It increments the ephemeral `AgentRunState` revision once only when witnesses differ. Generic `conversation.updatedAt` and transient handler-effect OR logic are unrelated.
- Witness capture must include conversation visual units and center-eligible compactions in their final selection/order. It compares only the table-defined central render/retained-interaction primitives and exact shared derived strings/keys. Ordered attachment/media/path lists are copied as direct primitive slots; raw object references, Activity-only tool result/log data, and generic reference/length/version tokens are forbidden. Tool arguments are observed only through the same `getToolDisplaySummary`-based card helper used by the renderer; no recursive payload serialization is allowed.
- Completion policy: user/static notification/inter-agent/media/error events are atomic-complete; streamed text/Thinking completes at segment end or message completion; tool-like cards complete only at terminal status; compaction completes only at completed/failed. An absent lifecycle marker is conservatively mutable while its AI message is incomplete.
- English and Simplified Chinese localization sources are required for the new jump label.
- A remote server must contain the integrated active-only/newest-100 provider for the performance guarantee to apply. New-frontend/old-backend version skew is not a supported acceptance topology and no client-side fallback can eliminate server archive work already performed.
- Representative live validation must obey the supplement's exclusive-owner snapshot rule. It separately proves quiesced source-to-snapshot equality, validation-process non-access to the live root, and snapshot raw-trace immutability. Live-source before/after equality is required only in stopped-owner Mode S; it is non-attributable and `N/A` after the old owner restarts in Mode R. If the live server cannot be quiesced and no atomic snapshot exists, validation is blocked rather than performed unsafely.
- The runtime archive-open gate requires a path-only syscall/audit trace that covers the target request without payload capture. If unavailable, retain response exclusion and prior durable instrumented evidence but report representative `AC-001` no-open re-proof as not executed.
- Bootstrap/catalog, projection network, hydration, usable render, and final bound are separate measures. Do not use window-creation-to-screenshot wall time as a single-cause metric.

## Open Unknowns / Risks

- Exact live task-agent/team router hook points require implementation-time tracing and tests because some team task projection messages return before the generic dispatcher. The design names the invariant and boundary rule; implementation must cover every conversation-mutating exit and prove non-visible handled branches do not bump the revision.
- A single event remains unbounded in byte size and render complexity.
- Bounded duplicate conversation/activity payload remains an accepted inefficiency.
- Very large team member counts may still create multiple bounded active-file reads during restore.
- Corrected isolated-snapshot execution has not yet been performed because it requires coordinated live-server quiescence or an atomic snapshot.
- It remains unknown whether remote-node bootstrap/catalog/workspace readiness has a separate material delay. The existing observation cannot distinguish it; `BOOT-001` in the supplement will.
- If corrected active-team `USABLE-001` exceeds 2.0 seconds because all-member fan-out dominates, the accepted residual risk becomes a demonstrated design impact and focus-first/lazy member hydration must be reconsidered.

## Notes For Architecture Reviewer

- The approved solution is intentionally narrower than an earlier archive-pagination concept. Do not require archive navigation, load-older, detail endpoints, full copy/export, or a new canonical GraphQL timeline; the user explicitly said they only read recent activity.
- Verify that the backend limit is applied after active-file lifecycle reconstruction and before projection bundle construction.
- Verify that frontend enforcement counts assistant segments, not only messages, and that center compaction rows share the final 100-item mounted invariant.
- Verify that live team task-projection early-return paths cannot bypass the rolling policy.
- Verify that `AgentWorkspaceView.vue` copy control and dedicated conversation-text derivation are removed rather than hidden.
- Recheck architecture findings `AR-001` and `AR-002`: completion classification/completed-first eviction/hard fallback and actual visible-presentation revision are now mandatory contracts, not residual risks.
- Recheck downstream findings `CR-001` and `CR-002`: the revision is now net pre/post bounded presentation truth, and `teamRunOpenCoordinator.mergeHydratedMembers` is explicitly part of the reset map.
- Recheck `AR-003`/`MP-AR-003` against the complete design table: tool log/result/raw-reference-only mutations are equal; renderer-shared summary/status/error/action and every other central kind remain detectable without recursive traversal.
- Review the delivery observation as a validation-premise question: confirm that old-backend version skew does not establish a requirement/design failure and that the isolated-snapshot plan is safe, measurable, and sufficient.
- Recheck `AR-004`: runtime archive-open evidence must be direct or explicitly deferred to prior durable proof, and Mode S/Mode R integrity gates must remain attributable.
- Recheck `AR-005`: after architecture pass, API/E2E executes; every Fail returns first to code reviewer for focused origin classification; Pass receives proportional test-code review before delivery; Blocked goes to the user with the exact missing dependency.
