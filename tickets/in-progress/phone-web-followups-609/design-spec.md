# Design Spec

## Solution And Approval Basis

- Current solution revision ID: SR-002 (D-I revised after ARCH-REV-001 AR-001; N-1 and the E consumers added)
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction; user informed in conversation 2026-11-22.
- Behavior-defining supplements: none
- User approval of the design: Not required (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation notes: `tickets/in-progress/phone-web-followups-609/investigation-notes.md`
- Authorities read (2026-11-22):
  - `references/architecture-design.md`
  - `references/design-principles.md`
  - `DESIGN.md`: rules 7, 9, 11 and 12, and the Node Access Model pointer
  - `docs/design-cases.md`: Cases 2, 3, 5, 21 and 26 (the new interrupted status key), and 27
- Conflicts or discrepancies:
  - RELEASE.md:95 says "Never commit build output: `*/dist/`", which contradicts TESTING.md:344-347 (the contract packages track `dist/`). Resolved in this ticket (D-B3), because the ticket is about that rule.
  - No conflict between the project's principles and the general ones.

## Current-State Read

Ten independent defects. Each has a correct existing owner except two:

- E: the node keeps a second, hand-written copy of the web's summary key list, so it drifted.
- J: two parallel paths serve workspace file reads with different lookups. The GraphQL Files path restores a workspace from the registry (`api/graphql/types/file-explorer.ts:29` → `getOrCreateWorkspace`); the REST content routes read only memory (`api/rest/workspaces.ts:25,79` → `getWorkspaceById`).

Evidence for every item is in the investigation notes, sections A–J.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale:
  - Ten items across six subsystems:
    - the node's run-history projection (A, E)
    - a contract package and its build check (B, E)
    - the Windows packaging script (C)
    - the web's activity presentation and tool cards (D)
    - conversation file links on desktop and phone (H)
    - background task lists (I)
    - the node's REST workspace routes (J)
    - three probe case files (F, G, I)
  - About 35 source and test files.
- Architectural risk: `High`
- Risk rationale:
  - The GraphQL contract `EventMonitorToolCard.summaryArgs` changes shape: a typed object becomes a JSON object (a clean cut, DESIGN.md rule 9).
  - A shared contract package gains an export.
  - The node's file routes gain registry restoration. It is the path that serves the phone, behind the node access gate (security-adjacent; route permissions unchanged).
  - Build inputs change: `scripts/**`, contract `dist/`, and `autobyteus-web/generated/**`, so DESIGN.md rule 12 and the fresh-start build apply.
- Escalation trigger:
  - Any change to route permissions or the node access model.
  - Any persisted data.
  - A need to change the summary rules themselves.
  - A Windows-only failure of C that macOS cannot reproduce.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision | Uncertainty |
| --- | --- | --- | --- | --- |
| Read | `run-projection-dedupe.ts:229-239` | `contextText` only counts toward a richness score | D-A: remove | — |
| Reproduced | `/tmp/sd609/fu002-dist-drift.diff` | team-stream `dist/` drifts on rebuild (seen twice, on two separate builds) | D-B1, D-B2 | — |
| Read | `autobyteus-web/scripts/prepare-server.mjs:24,538-575` | The stage is never removed; the run order is build → stage → publish → rebuild native | D-C | Windows-only paths (`:131`, `:303`) |
| Read | `utils/activity/toolActivityPresentation.ts:19-30`; `utils/toolCardPresentation.ts:44-49`; `components/conversation/ToolCallIndicator.vue:14-20,89-100`; node `event-monitor-active-trace-page-projection.ts:48-54`; GraphQL `statusKey: String` (`api/graphql/types/event-monitor-active-trace-page.ts:75`) | `interrupted` falls to "Unknown" or the card's wrench | D-D | — |
| Read | `utils/toolDisplaySummary.ts:16-25`; node `event-monitor-active-trace-page-types.ts:15-32`, `-projection.ts:16-46`; GraphQL class `:11-29`; web query `graphql/queries/runHistoryQueries.ts:200`; reader `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts:71` → `toolCardPresentation.ts:67` | Three hand-kept key lists | D-E | — |
| Read | `autobyteus-web/package.json:173`, `autobyteus-server-ts/package.json:37` | Both depend on `@autobyteus/agent-presentation-contracts` | D-E places the key list there | — |
| Read | `MarkdownRenderer.vue:118-126,154-162`; `composables/useEventMonitorFilePreview.ts:62-140`; `composables/mobile/mobileFileOpening.ts:21-44`; `utils/fileExplorer/workspaceResourceUrl.ts:39-46,66-110` | A relative link emits `relative-link` with no conversation listener. Both openers use `activeWorkspaceTarget.workspaceRootPath`. 576's resolver resolves against a document path; `''` gives the root. | D-H | — |
| Read + Reproduced | `composables/useBackgroundTaskPanelView.ts:36-90`; `stores/agentRunStore.ts:68`; MSP-59 ×3 Pass at load ~30; native-reporter delay of 1.5 s and 8 s: Pass (irrelevant, the probe uses Antigravity, `mobile-shell-probe.mjs:436`) | In `event-stream` mode the list never re-reads; only live events update it | D-I | Which hop lost the update in 572's run (FU-001) |
| Read | Antigravity `agy-agent-run-backend.ts:180-188`, monitor `stopAll`/`list()` (`agy-background-task-monitor.ts:78-88`); `standalone-agent-run-root.ts:291-312` (root lifecycle published before the agent's terminate); `agent-stream-handler.ts:234-246` (the session sends AGENT_STATUS after the run's sequence ends) | The node's task view is correct once the agent has stopped; the phone's status turns Offline after that | D-I re-reads on the status transition and re-reads while a task still shows running | — |
| Read (ARCH-REV-001 AR-001) | `api/graphql/types/agent-background-task-view.ts:94-101`; `useBackgroundTaskPanelView.ts:27-32,78`; `agentBackgroundTaskStore.ts:36-46`; Claude `claude-background-task-registry.ts:249`, native `autobyteus-background-task-reporter.ts:21`, Antigravity `agy-background-task-monitor.ts:82-88`; `agentRuntimeStatusState.ts:66,74` | The task view answers `unavailable/inactive` for a stopped run, so SR-001's re-read could never show the end, and the existing `finally` re-reads a stopped run every 2 s without bound. Every streaming runtime ends running tasks with `run_ended` at run end, and the web already zeroes the running count on Offline. | D-I (SR-002): end the rows on the observed stop; no polling while stopped | — |
| Read | `api/rest/workspaces.ts:25,79`; `workspace-manager.ts:111-150,315`; `api/graphql/types/file-explorer.ts:29`; `skill-workspace.ts:17-30` (a skill ID resolves through `SkillService.getSkill`, not a path) | The REST path lacks the restore the GraphQL path has | D-J | — |
| Read | `playwright-core ^1.48.0` (`autobyteus-web/package.json:210`); `page.routeWebSocket` used in `agent-org-task-team-disclosure-probe.mjs:212-216` | Frames can be intercepted per page | AC-I probe | — |

## Intended Change

Ten bounded fixes, D-A … D-J below. Each uses its existing owner. Two consolidations: one summary key list for web and node (E), and one workspace lookup for both read paths (J).

## Change Scope (Mandatory)

- In scope: UC-A … UC-J.
- Derived consumers:

  | Changed structure | Consumers and decision |
  | --- | --- |
  | `RunProjectionToolActivityEntry.contextText` / `HistoricalReplayToolEvent.contextText` (removed) | The Codex provider and the raw-trace transformer stop writing it. The activities builder stops copying it. The dedupe richness score drops the term; equal on both sides, so the decision is unchanged. The node fixture `event-monitor-active-trace-page-projection.test.ts:26` drops it. The web hydration spec `runProjectionActivityHydration.spec.ts:6-31` changes to "the node sends no `contextText`" (the assertion that the web strips it becomes moot; remove that case). |
  | Tool status keys gain `interrupted` | Web `ToolCardStatusPresentationKey` and `getToolCardStatusPresentationKey`; `ToolCallIndicator.vue` (icon chain `:14-20`, `statusClasses` `:89-100`); node `EventMonitorToolStatusKey` and `statusKey()`. Web parsing of a page card's `statusKey` string: implementation lists every `switch`/`===` on the key (Case 26) and decides each. `toolActivityStatusPresentation` gets the case. |
  | Summary key list (new shared constant) | Web `toolDisplaySummary.ts` (its five key arrays are replaced). Node page projection `summaryArgs()` (its `SUMMARY_KEYS`, `FILE_KEYS` and `COMMAND_KEYS` are replaced). The node TS type `EventMonitorToolSummaryArgs` becomes `Partial<Record<ToolSummaryArgumentKey, string>>`. The GraphQL `summaryArgs` field becomes JSON and its object type is removed. The web query selects `summaryArgs` without subfields, `generated/graphql.ts` is regenerated, and the reader (`eventMonitorActiveTraceBrowsePresentation.ts:71`) is unchanged. The server e2e `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts:77,915` selects `summaryArgs { path command query }` and asserts its shape: rewritten to the JSON field. The web e2e fixture `tests/e2e/fixtures/codex-command-failure-detail.page.vue:179` builds `summaryArgs: { command, cwd }`: kept (an object of strings, still valid), checked against the new type. |
  | Background task panel view gains a run-liveness input | Its two callers, `BackgroundTaskPanel.vue:135` and `MobileActivity.vue:46`. |
  | Workspace REST lookup | Both routes (`content`, `static/*`). |

- Deliberately left alone:
  - the summary rules (order, the `cd` rule);
  - the card's other icons (they differ from the Activity panel's icons: FU-002);
  - plain-text and code relative paths (DEC-002);
  - route permissions;
  - the workspace registry format;
  - `relative-link` handling in `MarkdownPreviewer` (576);
  - which hop lost MSP-59's update (FU-001).
- Follow-ups: FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing (evidence) | Change | Target path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-A | Contract | REQ-A / AC-A | Stored-run read | Notes A | Field removed | DS-A |
| BEH-B | Operational | REQ-B1/B2 / AC-B | Contract change, then the check | Notes B | Rebuild; check command | DS-B |
| BEH-C | Operational | REQ-C / AC-C | Windows preparation | Notes C | Stage removed in `finally`; ignored | DS-C |
| BEH-D | User | REQ-D / AC-D | Run stopped mid-call | Notes D | "Stopped" + stop icon | DS-D |
| BEH-E | User | REQ-E / AC-E | Earlier trace page | Notes E | One key list; JSON field | DS-E |
| BEH-F/G | Operational | REQ-F/G / AC-F/G | Probe | Notes F, G | Case edits | — |
| BEH-H | User | REQ-H1/H2 / AC-H1/H2 | Tap a relative link | Notes H | Relative file link → run-folder file | DS-H |
| BEH-I | User | REQ-I / AC-I | Run stops | Notes I | End running rows on the observed stop; no read | DS-I |
| BEH-J | User/System | REQ-J / AC-J | Read after restart | Notes J | Restoring lookup | DS-J |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix and Cleanup (A, B, C, F, G, J); Behavior Change (D, H, I); E is a Bug Fix.
- Current design issue found: Yes (E, J); No for the rest.
- Structural triggers that fire:
  - Derived data (E): a fact (which argument keys summarize a call) kept in three lists. Response: one owned list (D-E).
  - Several kinds or forms (J; H): two read paths for workspace files with different lookups. Response: one lookup (D-J). H serves desktop and phone, and agent, team-member and delegated runs; each is traced through `activeWorkspaceTarget` (notes H).
  - A new kind in a union (D, Case 26): `interrupted` added to the card status key. Response: consumer list above.
  - Capability-area reuse (I): the panel view is already "the only refresh owner" (`useBackgroundTaskPanelView.ts:15`). Response: extend it, no new owner.
  - Hidden dependency: none added. The new liveness input is passed in by the callers.
  - Behavior by absence: D-I's rule is explicit ("the run went from live to Offline, and every streaming runtime ends its tasks at run end", ASM-1), applied on an observed status transition, not on a missing event.
- Deliberate deviations: `None`.
- Root cause classification: E is `Duplicated Policy Or Coordination`; J is `Boundary Or Ownership Issue` (parallel path); A is dead data; B is `Missing Invariant` (no check); the rest are `Local Implementation Defect`.
- Refactor needed now: Yes for E and J (the consolidations above); No for the rest.
- Evidence: the investigation evidence table above.
- Intentional deferrals: FU-001 (the unknown hop; the user-visible outcome is met by D-I).

## Terminology

- **Summary argument keys**: the call-argument names whose value gives a tool call's one-line summary, grouped by kind (file, command, recipient, task, text).
- **Run-relative file link**: a Markdown link in a run's conversation whose destination has no scheme and no leading `/` or `#`.
- No project glossary change: "Stopped" is already the product's word for a stop the run caused.

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - node `contextText` and its two `resolveContextText` copies;
  - node `SUMMARY_KEYS`, `FILE_KEYS` and `COMMAND_KEYS`;
  - the GraphQL `EventMonitorToolSummaryArgs` object type;
  - the web key arrays in `toolDisplaySummary.ts`;
  - `getWorkspaceById` in the REST routes (the method stays: `file-change-payload-builder.ts:78`, `agent-run-provisioning-service.ts:312` and `run-file-change-runtime.ts:26` still call it).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

`Not Affected`:
- `contextText` and `summaryArgs` are computed at read time from stored traces.
- The workspace registry is only read.
- Contract `dist/` is a tracked build output, not app data.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-A | Primary | BEH-A | History read | Activities JSON to the web | Run projection (`historical-replay-events-to-activities.ts`) | Where the field leaves |
| DS-B | Operational | BEH-B | Developer or role runs the check | Pass/fail with files | Root check script | REQ-B2 |
| DS-C | Operational | BEH-C | `prepare-server.mjs run()` | Bundle published, stage gone | `prepare-server.mjs` | REQ-C |
| DS-D | Primary | BEH-D | `interrupted` status | Word/icon on each surface | `toolActivityStatusPresentation` (Activity); `getToolCardStatusPresentationKey` (cards) | REQ-D |
| DS-E | Primary | BEH-E | Earlier page request | Card summary | Node page projection → web `toolCardPresentation` → `getToolDisplaySummary` | REQ-E |
| DS-H | Primary | BEH-H | Tap | File viewer | `useEventMonitorFilePreview.openPath` | REQ-H1/H2 |
| DS-I | Return-Event | BEH-I | Run status live → Offline | List shows the end | `useBackgroundTaskPanelView` (trigger) and `agentBackgroundTaskStore` (rows) | REQ-I |
| DS-J | Primary | BEH-J | `GET /workspaces/:id/content` | File bytes | `WorkspaceManager.getOrCreateWorkspace` | REQ-J |

## Primary Execution Spine(s)

- DS-E: `Event Monitor (earlier page) -> GraphQL eventMonitorActiveTracePage -> page projection summaryArgs(event) [reads TOOL_SUMMARY_ARGUMENT_KEYS] -> wire JSON -> eventMonitorActiveTraceBrowsePresentation -> buildEventMonitorPageToolCardPresentation -> getToolDisplaySummary [reads the same keys] -> ToolCallIndicator`
- DS-H: `Tap link -> MarkdownRenderer.handleLinkClick -> emit file-path-action {kind:'run-relative', href} -> (AIMessage/… pass-through) -> AgentEventMonitor.handleFilePathAction -> useEventMonitorFilePreview.openPath -> resolve against activeWorkspaceTarget.workspaceRootPath (resolveWorkspaceRelativeReference(href, '')) -> absolute action -> existing desktop or phone open`
- DS-I: `Node stops run -> AGENT_STATUS offline (agent-stream-handler unbindStoppedRun) or a history/run-status snapshot -> context.state.currentStatus = Offline -> caller's runStopped computed true -> useBackgroundTaskPanelView sees false→true -> agentBackgroundTaskStore.endRunningTasksForRunEnd(runId) -> each running row becomes {status:'stopped', endReason:'run_ended'} -> row reads Stopped / "Stopped: the run ended"`
- DS-J: `Phone GET /workspaces/:id/content -> registerWorkspaceRoutes -> WorkspaceManager.getOrCreateWorkspace(id) [memory, else registry, else error] -> workspace.resolveReadablePath -> sendUserFile`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-A | The projection builds activities without the field; the dedupe compares the remaining fields | Transformer, Codex provider, activities builder, dedupe | Run projection | — |
| DS-B | The script builds each contract package in dependency order and diffs every tracked `dist/` file | Build, diff | Root script | git |
| DS-C | `run()` wraps staging and publishing in `try/finally`; `finally` removes the stage | run, publishStageToTarget | `prepare-server.mjs` | `.gitignore` |
| DS-D | The status maps to "Stopped", stop icon, neutral tone; cards map `interrupted` to their own key and render the same icon | Presentation builders | Two builders | — |
| DS-E | Both sides read one key list; the page projection copies those keys' string values into a JSON object | Projection, card builder | Shared list | Codegen |
| DS-H | A relative link becomes a file action carrying its href. The opener resolves it against the run's folder and continues as an absolute path. Escape or no folder → `failed()`. Remote run → "on node X". | Renderer, opener | `openPath` | 576 resolver |
| DS-I | The panel view watches `runStopped`. On false→true (an observed stop; the initial value never counts) it asks the store to end the run's running rows as `run_ended`. While stopped it schedules no 2 s re-read; on true→false (the run is live again) it reads once. | Panel view, task store | Panel view (trigger); store (rows) | — |
| DS-J | The route asks the manager's restoring lookup; a thrown "not found" maps to 404 | Route, manager | Manager | Registry store |

## Spine Actors / Main-Line Nodes

The nodes named in the Primary Execution Spines.

## Ownership Map

- `TOOL_SUMMARY_ARGUMENT_KEYS` (agent-presentation-contracts) owns which argument keys summarize a call, by kind. The web's `getToolDisplaySummary` owns how a summary is built from them. The node's page projection owns which keys travel to the page card. It filters by activity type, as today: file keys for write/edit, command keys for terminal.
- `toolActivityStatusPresentation` owns the Activity status words and icons. `getToolCardStatusPresentationKey` plus `ToolCallIndicator` own the card's. The card takes the stop icon name from `toolActivityStatusPresentation('interrupted').icon`, so the new icon has one source.
- `useEventMonitorFilePreview.openPath` owns turning a run-relative link into a file of the run.
- `useBackgroundTaskPanelView` owns when the list re-reads and when a stop is applied. `agentBackgroundTaskStore` owns the rows and the shape of a run-end (`stopped`, `run_ended`, no exit code).
- `WorkspaceManager.getOrCreateWorkspace` owns resolving a workspace ID.

## Thin Entry Facades / Public Wrappers

| Facade | Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| REST `registerWorkspaceRoutes` | `WorkspaceManager` | Fastify route | Workspace lookup rules |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `contextText` in `run-projection-types.ts:61`, `historical-replay-event-types.ts:55`, `historical-replay-events-to-activities.ts:26`, `raw-trace-to-historical-replay-events.ts:68-73,101`, `codex-run-view-projection-provider.ts:146-159,190`, `run-projection-dedupe.ts:238` | No reader (notes A) | — | Remove both `resolveContextText` functions |
| Node `SUMMARY_KEYS`, `FILE_KEYS`, `COMMAND_KEYS` (`event-monitor-active-trace-page-projection.ts:16-21`) | Second copy | Shared list | — |
| GraphQL `EventMonitorToolSummaryArgsObject` (`event-monitor-active-trace-page.ts:11-29`) | Field becomes JSON | `GraphQLJSON` | Regenerate the web types |
| Web `FILE_ARG_KEYS` … `TEXT_ARG_KEYS` (`toolDisplaySummary.ts:19-25`) | Moved | Shared list | Keep the comment on Antigravity names with the list |
| `runProjectionActivityHydration.spec.ts` case that feeds a node `contextText` | The node sends none | — | Rule 11 |

## Return Or Event Spine(s)

DS-I above.

## Bounded Local / Internal Spines

DS-I inside `useBackgroundTaskPanelView`:
`watch(runStopped): false→true -> store.endRunningTasksForRunEnd(runId)`; `true→false -> refresh()`; `finally` of `refresh()`: schedule the 2 s re-read only when `mode !== 'event-stream'` **and** the run is not stopped (today it is scheduled for any non-event-stream answer, including `unavailable/inactive` for a stopped run, without bound: `useBackgroundTaskPanelView.ts:78`).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk |
| --- | --- | --- | --- | --- | --- |
| Run-end shape | DS-I | Panel view | `endRunningTasksForRunEnd(runId)` in `agentBackgroundTaskStore`: each `running` row becomes `stopped`, `endReason: 'run_ended'`, `exitCode: null`; ended rows untouched | The store owns rows; the node's own run-end shape (ASM-1) | A second copy of the end shape in a component |
| 576 `resolveWorkspaceRelativeReference` | DS-H | `openPath` | Confinement and decoding | Reuse | Re-implementing traversal checks |
| Codegen | DS-E | Web | `generated/graphql.ts` | Field type changed | Stale types |

## Ownership Boundaries

- The web never builds summaries from a key list of its own, and the node never keeps one.
- REST routes never read `activeWorkspaces` directly.
- The renderer never resolves paths: it hands the href to the opener.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden | Fix if thin |
| --- | --- | --- | --- | --- |
| `WorkspaceManager.getOrCreateWorkspace` | `activeWorkspaces`, the registry store, on-demand skill and semantic workspaces | REST routes, GraphQL Files | A route reading the map or the registry itself | — |
| `openPath` | Run folder resolution, remote check, desktop/phone branch | `AgentEventMonitor` | The renderer resolving against a root | — |

## Dependency Rules

- web → `@autobyteus/agent-presentation-contracts` (existing); node → the same (existing). No new package dependency.
- The panel view receives `runStopped: Ref<boolean>` (the run's `currentStatus === AgentStatus.Offline`) from its callers (call argument). No lookup is added. `Error` does not count as stopped: a run with a recoverable block can be Error with its agent and tasks alive.
- No process-wide binding is added. `getWorkspaceManager()` is the existing lookup the routes already use; it is unchanged (Principle 16: it is used, not added).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `TOOL_SUMMARY_ARGUMENT_KEYS: Readonly<{ file; command; recipient; task; text }>` and the type `ToolSummaryArgumentKey` | Summary keys | One list by kind | — | Plain data; not a port |
| `useBackgroundTaskPanelView(runId, expanded, runStopped)` | One run's task list | Plus apply an observed stop; no polling while stopped | `runId` | — |
| `file-path-action` payload: `AbsoluteFilePathAction \| RunRelativeFileLink { kind: 'run-relative'; href: string }` | A file link in a conversation | One channel for both forms | Discriminated by `kind` (`AbsoluteFilePathAction` gains `kind: 'absolute'`) | The existing pass-through emits change only in their types |
| GraphQL `EventMonitorToolCard.summaryArgs: JSON` | One card's summary inputs | Object of key → string | — | Clean cut |

## Interface Boundary Check

| Interface | Singular | Explicit | Risk | Action |
| --- | --- | --- | --- | --- |
| All four above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same everywhere | Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Summary keys | `TOOL_SUMMARY_ARGUMENT_KEYS` | Yes | Yes ("summary" as in `getToolDisplaySummary`, `summaryArgs`) | Low | — |
| Relative link | `RunRelativeFileLink` | Yes | Yes | Low | — |
| Status word | "Stopped" | Yes | Yes (`runSettings.status.stopped`, "Stopped: the run ended") | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Relative path confinement | 576 resolver | Reuse | Same rule |
| Workspace restore | `getOrCreateWorkspace` | Reuse | Same lookup as GraphQL |
| Re-read the task list | Panel view `refresh()` | Extend | It is the refresh owner |
| Run-end of rows | `agentBackgroundTaskStore` | Extend (`endRunningTasksForRunEnd`) | It owns the rows |
| Summary keys location | agent-presentation-contracts | Extend | Both sides import it already |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Decision |
| --- | --- | --- |
| agent-presentation-contracts | Summary key list | Extend |
| Node run-history projection | A, E | Extend |
| Node REST workspaces | J | Extend |
| Web activity / tool cards | D, E | Extend |
| Web conversation file links | H | Extend |
| Web background tasks | I | Extend |
| Build scripts | B, C | Extend / Create (one script) |
| Phone probe cases | F, G, I | Extend |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-agent-presentation-contracts/src/tool-summary-argument-keys.ts` | Add | The key list by kind and its type; exported from `src/index.ts`; `dist/` rebuilt and committed |
| `autobyteus-collaboration-stream-contracts/dist/**`, `autobyteus-team-stream-contracts/dist/**` | Modify | Rebuilt (B; any change E causes) |
| `scripts/check-contract-dist.mjs` | Add | DS-B. Find `autobyteus-*-contracts` packages with tracked `dist/` files (`git ls-files`), build each in workspace dependency order (`pnpm --filter <pkgs> run build`, which runs topologically), then fail on `git status --porcelain -- <pkg>/dist` output, naming the files |
| `package.json` (root) | Modify | Script `check:contract-dist` |
| `TESTING.md` (Build outputs, `:342-347`) | Modify | After changing any contract package's source, run `pnpm check:contract-dist` and commit the `dist/` changes of every contract package it names (dependents included) |
| `RELEASE.md:95` | Modify | Name the exception: the three contract packages' tracked `dist/` (TESTING.md Build outputs) |
| `autobyteus-web/scripts/prepare-server.mjs` | Modify | `run()`: `try { stage…publish… } finally { await rm(stageDir, {recursive:true, force:true}) }`, after `publishStageToTarget` and before or around `rebuildNativeModulesForElectron` (it works on `targetDir`) |
| `autobyteus-web/.gitignore` | Modify | `.server-packaging-stage` |
| `autobyteus-web/utils/activity/toolActivityPresentation.ts` | Modify | `case 'interrupted': { label: 'Stopped', tone: 'neutral', icon: 'heroicons:stop-circle-solid', isRunning: false }`. The `default` stays for an unrecognized status (the `ToolInvocationStatus` union is closed; implementation checks whether `default` is then dead and removes it if the switch becomes exhaustive) |
| `autobyteus-web/utils/toolCardPresentation.ts`, `components/conversation/ToolCallIndicator.vue` | Modify | `interrupted` key; icon from the activity presentation; border class as `default` |
| Node `event-monitor-active-trace-page-types.ts`, `-projection.ts` | Modify | `interrupted` status key; `summaryArgs` from the shared list; TS type from the list |
| Node `api/graphql/types/event-monitor-active-trace-page.ts` | Modify | `summaryArgs` as `GraphQLJSON`; object type removed |
| Web `graphql/queries/runHistoryQueries.ts:200`, `generated/graphql.ts` | Modify | Select `summaryArgs`; regenerate |
| Web `utils/toolDisplaySummary.ts` | Modify | Read the shared list |
| Node `run-history/projection/*` (A) | Modify | Remove `contextText` |
| Web `utils/eventMonitorFilePaths/absoluteFilePathAction.ts` | Modify | `kind: 'absolute'` on the action, and the `RunRelativeFileLink` type plus the union type |
| Web `components/conversation/segments/renderer/MarkdownRenderer.vue` | Modify | With `enableEventMonitorFileActions`, a relative href emits `file-path-action` `{kind:'run-relative', href}`. Otherwise `relative-link` as today (MarkdownPreviewer) |
| Web pass-through emit types (`AIMessage.vue`, `ThinkSegment.vue`, `SystemTaskNotificationSegment.vue`, `AgentConversationFeed.vue`, `EventMonitorBrowseAssistantRow.vue`) | Modify | Payload type only |
| Web `composables/useEventMonitorFilePreview.ts` | Modify | `openPath`: remote check first (as today), then for `run-relative`: root = `activeContextStore.activeWorkspaceTarget?.workspaceRootPath`, or, when it is empty, the root from `activeContextStore.resolveWorkspaceMetadataForTarget(target)` as the absolute flow does (`useEventMonitorFilePreview.ts:91-97`, with its `isCurrent()` check); still none → `failed()`; `resolveWorkspaceRelativeReference(href, '')` blocked → `failed()`; else build the absolute path with the existing path utilities (`absoluteWorkspacePathMapping.ts`'s join or equivalent; Windows roots included) and continue as an absolute action |
| Web `composables/useBackgroundTaskPanelView.ts` | Modify | `runStopped` input; the DS-I watch; the re-read scheduled only while not stopped |
| Web `stores/agentBackgroundTaskStore.ts` | Modify | `endRunningTasksForRunEnd(runId)` |
| Web `components/progress/BackgroundTaskPanel.vue`, `components/mobile/views/MobileActivity.vue` | Modify | Pass `runStopped` from their context's `currentStatus === AgentStatus.Offline` |
| Node `api/rest/workspaces.ts` | Modify | `await getWorkspaceManager().getOrCreateWorkspace(id)` in `try`; its "not found" error (and a skill/semantic open failure) → 404 `Workspace not found`, with the same log line |
| Web `tests/e2e/mobile-heading-links-cases.mjs` | Modify | MSP-44/45: `other.md` opens `other.md`; `./x.md` opens `x.md` if present (else the viewer's not-found); `#no-such-heading-480`, `/x.md` and `../out.md` follow nothing. The fixture creates `other.md` |
| Web `tests/e2e/mobile-context-file-size-cases.mjs:145` | Modify | Accept both codes for MSP-55 |
| Web `tests/e2e/mobile-background-tasks-cases.mjs` | Modify | New case MSP-99 (AC-I): `page.routeWebSocket` on the phone's agent stream forwards every frame except `BACKGROUND_TASK_UPDATED`; terminate; expect Stopped within 10 s |
| Web specs and server tests | Add/Modify | Per AC |
| `autobyteus-web/docs/*`, server docs | Modify | Delivery's docs sync |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Shared keys | `export const TOOL_SUMMARY_ARGUMENT_KEYS = { file: ['path','file_path','filepath','filename','target_path','Path','AbsolutePath','TargetFile','DirectoryPath'], command: ['command','cmd','script','CommandLine'], recipient: ['recipient_address'], task: ['task_id'], text: ['query','Query','Pattern','prompt','url','message','text','title','name','raw'] } as const;` | Adding the five missing names to the node's and GraphQL's lists by hand | Third drift |
| Relative link | `{kind:'run-relative', href:'media/clip.mp4'}` → root `/w/run` → `/w/run/media/clip.mp4` → existing absolute flow | The renderer resolving against a root it does not own | Owner |
| DS-I trigger | `watch(runStopped, (stopped, was) => { if (stopped && was === false) store.endRunningTasksForRunEnd(runId.value); else if (!stopped && was) void refresh() })` | Re-reading the node's view after the stop (it answers `inactive`, AR-001); polling every 2 s while stopped | REQ-I, QR-1 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Plan |
| --- | --- | --- | --- |
| Keep `contextText` "for older clients" | Older web | Rejected (rule 9) | Remove |
| Keep the typed GraphQL object and add JSON | Smooth migration | Rejected (rule 9) | Clean cut to JSON |

## Change / Refactor Sequence

1. B: rebuild the contract `dist/`, then add the check script, TESTING.md and RELEASE.md (the check passes after).
2. E: shared key list (rebuild and commit contract `dist/`; the check passes) → web summary → node projection → GraphQL → codegen.
3. A.
4. D (with E's card files).
5. J.
6. H.
7. I (the composable plus callers, then MSP-99).
8. C.
9. F, G.
10. Run the whole phone probe once.

## Key Tradeoffs

- E uses a JSON field and loses GraphQL field typing, in exchange for one list instead of three. Values stay strings, and the web reads them as `Record<string, unknown>` already.
- I is correct by construction rather than a proven root-cause fix (DEC-007). It derives the end on the web from the run's stop, which every streaming runtime guarantees (ASM-1), instead of keeping a stopped run's list on the node. No read is added; a stopped run's 2 s polling is removed.
- H covers links only (DEC-002).

## Risks

- I: a wrong live→Offline transition would end a running row on the web, and the store never replaces an ended row with a running one (`agentBackgroundTaskStore.ts:36-42`). The web already trusts the same status for the running count (`agentRuntimeStatusState.ts:66,74`). The initial status (`DEFAULT_AGENT_STATUS = Offline`) never counts, because only a `false→true` change of `runStopped` applies.
- J: an on-demand skill workspace is now created by a URL read after a restart. That is the same behavior as the GraphQL Files path (`file-explorer.ts:29`). A skill ID resolves by name through `SkillService.getSkill` (`skill-workspace.ts:24`), not by path.
- C: Windows-specific behavior is proven only by the build-only release run's Windows job.

## Guidance For Implementation

- Reproductions to start from:
  - B: `pnpm -C autobyteus-agent-presentation-contracts build && pnpm -C autobyteus-collaboration-stream-contracts build && pnpm -C autobyteus-team-stream-contracts build && git status --short` (2 files change on base `f2c0d2a902`).
  - F: `--cases=MSP-44,MSP-45` (fail on base).
  - I: MSP-99 fails on base. Add a unit case of `useBackgroundTaskPanelView`: live → Offline with a running row ends it as `run_ended`; initial Offline ends nothing; Offline schedules no re-read.
- Build inputs touched (B, C, E): run the fresh-start build (TESTING.md) and the build-only Desktop Release run on the ticket branch (DESIGN.md rule 12, RELEASE.md). The Windows job proves C.
- Run Node 22.
