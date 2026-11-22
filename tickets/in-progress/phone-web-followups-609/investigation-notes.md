# Investigation Notes

## Investigation Meta

- Package identifier: `phone-web-followups-609`
- Request / ticket: autobyteus-609 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`. It bundles autobyteus-590's FU-001…FU-007 and, by the PM's comment of 2026-11-22, absorbs autobyteus-575 (autobyteus-572's FU-003, FU-004, FU-005).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`
- Repository mode: `Git`
- Task worktree / branch: the worktree above, branch `codex/phone-web-followups-609` (no upstream)
- Resolved base remote / branch / revision: `origin/personal` @ `f2c0d2a902` (fetched 2026-11-22)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created; `pnpm install --frozen-lockfile` passed (`/tmp/sd609-install.log`)
- Bootstrap blocker: None
- Current solution revision ID: SR-001
- Authorities read (requirements reading gate, 2026-11-22):
  - `references/requirements-engineering.md`
  - `references/ticket-scope.md`
  - `references/finding-the-cause.md`
  - `AGENTS.md`, plus the TESTING.md and DESIGN.md sections cited below
- Investigation status: complete for requirements and architecture (see Architecture Investigation Findings in `design-spec.md`'s evidence table).

## Initial Request And Clarifications

- Original request: the Task's ten items (A–J below). Constraints: follow DESIGN.md and TESTING.md; no release without the founder's word.
- Clarifications received: none needed so far.

The items, as referred to in these notes:

| Item | Source | Short name |
| --- | --- | --- |
| A | 590 FU-001 | The node's own `contextText` |
| B | 590 FU-002 | Stale tracked `dist/` of the team-stream contracts |
| C | 590 FU-003 | Windows `.server-packaging-stage/` leftover |
| D | 590 FU-004 | An interrupted tool call reads "Unknown" |
| E | 590 FU-005 | Event monitor page cards miss summary keys |
| F | 590 FU-006 | MSP-44/45 stale since autobyteus-576 |
| G | 590 FU-007 | MSP-55 allowlist lacks `ERR_SOCKET_NOT_CONNECTED` |
| H | 572 FU-003 | Relative file paths in chat are not file links |
| I | 572 FU-004 | MSP-59: the phone keeps "running" after the run ends, under load |
| J | 572 FU-005 | A run's folder answers 404 right after a node restart |

## Source Log And Findings

### A. The node's `contextText` (Read)

- Writers:
  - `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts:68,101` (`resolveContextText`)
  - `providers/codex-run-view-projection-provider.ts:146,190` (a second copy of the same rule)
  - It is carried by `historical-replay-event-types.ts:55`, `run-projection-types.ts:61` and `transformers/historical-replay-events-to-activities.ts:26`.
- Its only reader on the node is `run-projection-dedupe.ts:238`. That code counts how many of an entry's fields have a value (a "richness" score) to choose which duplicate to keep. `contextText` always has a value (it falls back to the tool name), so it adds 1 to every tool entry and never changes a comparison.
  - So it is not a dedupe key.
  - Removing it changes no dedupe result: both sides lose the same 1.
- Wire: projection `activities` are `GraphQLJSON` (`api/graphql/types/run-history.ts:178`, `team-run-history.ts:54`, `agent-run-collaboration.ts:32`, `agent-org-run.ts:68`). No typed GraphQL field is involved.
- Readers outside the node:
  - `git grep contextText` outside tickets and build output shows no web or other-package reader. autobyteus-590 removed it from the web.
  - `autobyteus-web/services/runHydration/__tests__/runProjectionActivityHydration.spec.ts:6-31` feeds a node `contextText` and asserts the web drops it.
  - The node test fixture `tests/unit/run-history/projection/event-monitor-active-trace-page-projection.test.ts:26` sets it.
- Mixed versions: an older web reading a newer node is not supported (DESIGN.md rule 9, one-version deployment), and the current web ignores the field anyway.

### B. Stale `autobyteus-team-stream-contracts/dist/` (Reproduced)

- Command: `pnpm -C <each contract package> build` on base `f2c0d2a902`. `git status` then shows `autobyteus-team-stream-contracts/dist/team-stream-server-message.d.ts` and `.d.ts.map` modified: `leaving: z.ZodOptional<z.ZodLiteral<true>>` added in 4 places. The diff is kept at `/tmp/sd609/fu002-dist-drift.diff`, and the files were restored.
- Cause:
  - `d005fa2a5b` (2026-11-21) added `leaving` to `autobyteus-collaboration-stream-contracts/src` and rebuilt that package's `dist/`.
  - `autobyteus-team-stream-contracts` re-exports zod schemas that include collaboration's run-tree DTO. Its emitted `.d.ts` therefore changes when collaboration's source changes, even though team-stream's own `src/` does not.
  - Nobody rebuilt it.
- Rule gap: TESTING.md (Build outputs) says "After changing their source, rebuild with `pnpm -C <package> build` and commit the `dist/` changes too". It names only the changed package, not the contract packages that depend on it.
- Dependency order:
  - agent-presentation has no workspace dependency.
  - collaboration depends on agent-presentation.
  - team-stream depends on both (its `package.json` lists them).
- Contradiction (existing, not caused here): RELEASE.md:95 says "Never commit build output: `*/dist/`", while TESTING.md:344-347 makes the three contract packages an exception. A docs-sync item.
- No CI runs on pull requests or pushes: `.github/workflows/` holds only the four release workflows. A "dist matches src" check can therefore only be a local command that a gate or a role runs.

### C. Windows `.server-packaging-stage/` (Read)

- `autobyteus-web/scripts/prepare-server.mjs:24` stages into `autobyteus-web/.server-packaging-stage`. `publishStageToTarget` (`:538-541`) removes the target and copies the stage to it; nothing removes the stage afterwards.
- `autobyteus-web/.gitignore` does not list it. autobyteus-590 added `../.server-packaging-stage/**` to the Nuxt type project's excludes.
- `prepare-server.mjs` is run by `prepare-server:windows` and by `prepare-server-dispatch.mjs` on Windows. macOS and Linux use `prepare-server.sh`, which writes `resources/server` directly.

### D. "Unknown" for an interrupted tool call (Read)

- `autobyteus-web/utils/activity/toolActivityPresentation.ts`: `toolActivityStatusPresentation` has no `interrupted` case, so it falls to `default` → `{label:'Unknown', tone:'neutral', icon:'heroicons:wrench-screwdriver-solid'}`.
- `interrupted` is a real status: `types/segments.ts:25`. It is set by:
  - `toolLifecycleHandler.ts:470`
  - `toolLifecycleState.ts:105`
  - `segmentHandler.ts:453`
  - `agentStatusHandler.ts:290,305` (a run stopped while a call ran)
  - hydration (`runProjectionActivityHydration.ts:93`)
- Both desktop (`ToolActivityItem.vue:160`) and phone (`MobileRunActivityItem.vue:102`, `MobileActivityDetail.vue:113`) read it.
- The conversation tool card (`utils/toolCardPresentation.ts:44-49`) maps `interrupted` to `default`. The event monitor page card (node `event-monitor-active-trace-page-projection.ts` `statusKey`) does the same.
- The status labels are English literals in the shared builder (the desktop's words, kept by autobyteus-590 D-3). The phone's section titles are localized.
- Existing product words for a run-caused stop: "Stopped" (`runSettings.status.stopped`, `BackgroundTaskPanel.end.runEnded` "Stopped: the run ended").

### E. Event monitor page cards' summary keys (Read)

- Node: `run-history/projection/event-monitor-active-trace-page-types.ts:15-32` and `api/graphql/types/event-monitor-active-trace-page.ts:11-29` list 16 keys (path, file_path, filepath, filename, target_path, command, cmd, script, query, prompt, url, message, text, title, name, raw). `event-monitor-active-trace-page-projection.ts:16-21,34-46` copies those keys from the call's arguments.
- Web: `utils/toolDisplaySummary.ts:16-25` reads more keys:
  - files: `Path`, `AbsolutePath`, `TargetFile`, `DirectoryPath`
  - commands: `CommandLine`
  - `recipient_address`, `task_id`
  - text: `Query`, `Pattern`
- So a page card loaded from the node (earlier trace) shows less than a live card for the same call. It is a second copy of the web's key list, already out of date.

### F. MSP-44/45 stale (Read; failure Reproduced by autobyteus-590 API/E2E)

- `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs:41-42`: `NO_FOLLOW = ['#no-such-heading-480', 'other.md', 'other.md#x', '/x.md', './x.md']`. MSP-44 (desktop Files panel and phone viewer) and MSP-45 (Skills page) assert that clicking each does nothing (`followNothing`, `:162`).
- Since `8c3810df95` (autobyteus-576), a relative link in a workspace file's Markdown preview opens the linked file. `/x.md` and links out of the root still open nothing, and the phone viewer is a workspace file too.
- Evidence: autobyteus-590's `evidence/api-e2e/MSP-44-45-alone/` (both fail alone).

### G. MSP-55's allowlist (Read)

- `autobyteus-web/tests/e2e/mobile-context-file-size-cases.mjs:145` accepts only `net::ERR_CONNECTION_RESET` for MSP-55's deliberate link cut.
- `mobile-live-reconnect-cases.mjs:197-200` documents that Chrome ends such a refused connection either in the handshake (`ERR_CONNECTION_RESET`) or before it (`ERR_SOCKET_NOT_CONNECTED`).
- Seen in autobyteus-590 R2-WS-1 (`evidence/api-e2e/R2-WS-1-whole-mobile-shell/mobile-shell-probe.json`, MSP-55 `browserErrors`).

### H. Relative file paths in chat (Read)

- `components/conversation/segments/renderer/MarkdownRenderer.vue:154-162`: since autobyteus-576, a scheme-less link click is prevented and emitted as `relative-link` (raw href). Only `fileExplorer/viewers/MarkdownPreviewer.vue` listens. In a conversation (`AIMessage.vue`, `ThinkSegment.vue`, `SystemTaskNotificationSegment.vue`, `AgentConversationFeed.vue`, `EventMonitorBrowseAssistantRow.vue` → `AgentEventMonitor.vue`) nothing listens, so a tap on `[clip](media/clip.mp4)` does nothing on desktop and phone.
- Absolute paths:
  - They become file actions (`utils/eventMonitorFilePaths/absoluteFilePathAction.ts`) in links, prose and code, and open through `composables/useEventMonitorFilePreview.ts` `openPath`.
  - On desktop they open as a workspace-relative preview when inside the run's root (`activeWorkspaceTarget.workspaceRootPath`), otherwise as a node file.
  - On the phone they open through `composables/mobile/mobileFileOpening.ts` `openMobileFilePath`: inside the run's root as a workspace file, otherwise as a node file.
  - A run on another node answers "on node X".
- Both surfaces already know the run's folder (`activeContextStore.activeWorkspaceTarget.workspaceRootPath`; for a team member, that member's own target).
- The rule for relative references in a workspace document already exists: `utils/fileExplorer/workspaceResourceUrl.ts` `resolveWorkspaceRelativeReference` (autobyteus-576). It drops the fragment and query, decodes segments, resolves against a base folder, and refuses anything outside the workspace root.
- 572 DEC-003 left relative paths out of that ticket, as FU-003.

### I. MSP-59 under load (Read; see Runtime findings)

- autobyteus-572's round 1 whole probe (`tickets/done/chat-media-path-playback/evidence/api-e2e/API-05-mobile-shell-round1/mobile-shell-probe.json` `cases["MSP-59"]`):
  - `terminated: {success:true}`, but the phone's row stayed `running` for 30 s. The machine load was 60–70.
  - Reruns alone pass (`API-05b`), as does the round 2 whole probe.
- Node path (`agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts:320-366`): `terminate()` runs, in order:
  1. `markRunEnding()`
  2. `removeAgent(...)`. This stops the commands; `BackgroundProcessManager.stopAllForRunEnd()` records each end synchronously, and `AutoByteusBackgroundTaskReporter.publish` queues a `BACKGROUND_TASK_UPDATED` on its `delivery` promise chain.
  3. lifecycle `terminated`
  4. stream close and drain
  5. `reporter.stop()` (unsubscribes from the manager)
  6. `disposeSession`
- `deliverToSourceListeners` iterates the live `sourceListeners` set when the queued delivery runs. A listener removed before that moment never gets the event.
- Phone stream: `/ws/agent-collaboration/<runId>` (the probe's server log shows the phone's socket for the failing run). The web applies `BACKGROUND_TASK_UPDATED` in `services/agentStreaming/agentStreamMessageProjector.ts:198`.

### J. 404 right after a restart (Read; symptom Measured by autobyteus-572)

- `autobyteus-server-ts/src/api/rest/workspaces.ts:25,79`: both `GET /workspaces/:id/content` and `/workspaces/:id/static/*` look the workspace up with `getWorkspaceManager().getWorkspaceById(id)`. That reads only the in-memory `activeWorkspaces` map (`workspaces/workspace-manager.ts:315`).
- `getOrCreateWorkspace(id)` (`workspace-manager.ts:111-150`) is the restoring lookup. It returns the in-memory entry, the temp workspace, an on-demand skill workspace, the semantic-memory workspace, or a filesystem workspace from the persisted registry (`workspaceRegistryStore.getRootPathByWorkspaceId`). Otherwise it throws "not found".
- Every filesystem workspace is upserted into that registry when created (`createWorkspace`).
- Measured by 572 API-03r2 (`cases["MSP-91"].details.inside.readsAfterRestart`): `[[5,404],[2525,200]]`. The read failed until something else re-registered the workspace in memory.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| `pnpm -C <contract pkg> build` ×3, `git status` | B | team-stream `dist/` drifts, 2 files | Reproduced | Rebuild and commit, and add a check | `/tmp/sd609/fu002-dist-drift.diff` |
| `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-59` ×3 (Node 22.23.1, load 22–33 on 10 cores) | I | Pass 3/3, 4.2 s each | Measured | Not reproduced at this load | `/tmp/sd609/msp59-r{1,2,3}/` |
| Same, with a temporary delay before the native reporter's end delivery (1.5 s, then 8 s) | I | Pass (4.2 s, 4.1 s): the probe's runs use Antigravity (`mobile-shell-probe.mjs:436` `...agy`; task IDs `<uuid>/task-N`), not the native reporter | Reproduced | The native-runtime hypothesis does not apply | `/tmp/sd609/msp59-delay*/` |
| Read: Antigravity `terminate()` (`agy-agent-run-backend.ts:180-188`) awaits its event queue after `stopAll()`; `StandaloneAgentRunRoot.stop()` (`standalone-agent-run-root.ts:291-312`) publishes the root's lifecycle end before the agent's terminate; the phone's background task list in `event-stream` mode updates only from live events and never re-reads (`useBackgroundTaskPanelView.ts:56-90`) | I | Candidates: a live update missed during a stream gap (the list's first read and the stream's binding are separate), or ordering at the stop. Not distinguished. | Read | REQ-I is met by re-reading when the run stops (DEC-007); the hop stays unknown (FU-001) | — |

- Temporary diagnostics: a 1.5 s, then 8 s, delay added to the built `autobyteus-server-ts/dist/agent-execution/backends/autobyteus/autobyteus-background-task-reporter.js` (`publish`'s delivery), only in this worktree's build, to test whether a late end delivery is lost. Restored from `/tmp/sd609/reporter.js.orig` afterwards (`grep -c 'setTimeout(r' … = 0`). Never committed.
- Reproductions for implementation to start from:
  - B: the command above.
  - F: `--cases=MSP-44,MSP-45` (fail on base, per autobyteus-590).
  - I: the new MSP-99 that drops the live task update (design D-I).

## Requirement Implications

- A, B, C, F and G are fixes with one clear outcome each.
- D needs a word and an icon. The product already says "Stopped" for a stop the run caused.
- E: the page card should show what a live card shows. The node's key list should not be a second hand-kept copy.
- H: which forms become file links, and what they resolve against.
- I: the cause decides the fix.
- J: the content routes should use the restoring lookup.
