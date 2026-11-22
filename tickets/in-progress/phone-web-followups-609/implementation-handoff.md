# Implementation Handoff — autobyteus-609 (phone-web-followups-609, absorbs autobyteus-575)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review applied (Large / High). ARCH-REV-002 Pass on SR-002. After implementation → Code Review (`get_handoff_rules`: Large or High).
- Requirements doc: `requirements-doc.md` (SR-003; DEC-009 added during this round)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003)
- Supplemental task artifacts: `handoff-architecture-design-complete.md`, `handoff-design-revised-sr-002.md`; `follow-ups.md` (FU-001, FU-002 from design; FU-003 from ARCH-REV-002 N-2; FU-004 from SR-003; FU-005, FU-006 from this round)
- Design review report: `design-review-report.md` and `architecture-review-revision-record.md` (the Architecture Reviewer's; untracked in the worktree, left as they are)
- Triggering rework report, revision record, or evidence: N/A (first round)
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609/tickets/in-progress/phone-web-followups-609`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`, `codex/phone-web-followups-609`, pushed to origin. Base `origin/personal` `f2c0d2a902`. Code commits, in the design's order:
  - B: `6ed56306aa` (team-stream `dist/` rebuilt), `faa2013d51` (`check:contract-dist`), `2b2c5c3509` (`docs(testing):`), `8f69917cc0` (`docs(release):`);
  - E: `bf8d8048aa` (shared key list and its `dist/`), `315f74b8e9` (web summary), `3182626365` (node projection, GraphQL JSON, codegen);
  - A: `6de1e1a4e1`; D: `856be60664`; J: `eda09baf4e`; H: `358d9fca5f`; I: `995b8ff6c2`; C: `44d6f81818`;
  - probe cases: `80322a5145` (F), `6fcefdd19a` (G), `1fcd548bf4` (MSP-99), `ab72e00e7a` (MSP-100);
  - documents: `d4af72998f` (FU-005) and the commit carrying this handoff. `fcef02f7f3` is the Solution Designer's SR-003.

## Current Implementation Summary

- Implementation cycle: `Initial Baseline`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related revision IDs: architecture `ARCH-REV-001`, `ARCH-REV-002`; code review, API/E2E, delivery `N/A`
- Triggering finding IDs: N/A

**B (REQ-B1, REQ-B2).**
- The team-stream contract `dist/` was stale since 590 added `leaving`: rebuilt and committed (`team-stream-server-message.d.ts` and its map).
- New `scripts/check-contract-dist.mjs`, run as `pnpm check:contract-dist`:
  1. finds every `autobyteus-*-contracts` folder with tracked files in `dist/` (today three);
  2. builds them in one `pnpm --filter … run build`, which runs in workspace dependency order;
  3. fails when `git status --porcelain --untracked-files=all` shows a changed or new file under any of those `dist/` folders, naming each one.
- TESTING.md "Build outputs" requires the check for a contract-package change, and committing every `dist/` it names (its own `docs(testing):` commit). RELEASE.md's never-commit-`dist/` rule names the contract packages as the exception.
- IMP-01: the check fails on the base, naming the two files, and passes on the branch and on HEAD.

**E (REQ-E).**
- New `autobyteus-agent-presentation-contracts/src/tool-summary-argument-keys.ts`: `TOOL_SUMMARY_ARGUMENT_KEYS`, frozen, by kind:
  - `file`: `path`, `file_path`, `filepath`, `filename`, `target_path`, `Path`, `AbsolutePath`, `TargetFile`, `DirectoryPath`;
  - `command`: `command`, `cmd`, `script`, `CommandLine`;
  - `recipient`: `recipient_address`;
  - `task`: `task_id`;
  - `text`: `query`, `Query`, `Pattern`, `prompt`, `url`, `message`, `text`, `title`, `name`, `raw`.

  It also exports the types `ToolSummaryArgumentKind` and `ToolSummaryArgumentKey`, and has a package test. Its `dist/` is committed.
- The web's `getToolDisplaySummary` reads it (its own arrays removed). The summary rules are unchanged.
- The node's page projection copies every key the summary reads, by tool kind: write/edit cards copy the file keys, terminal cards the command keys, and other cards all keys. Values are strings, as before. The node's `SUMMARY_KEYS`, `FILE_KEYS` and `COMMAND_KEYS` are removed.
- GraphQL `EventMonitorToolCard.summaryArgs` is now `GraphQLJSON` (clean cut, DESIGN.md rule 9). The `EventMonitorToolSummaryArgs` object type is removed. The node keeps a TS alias of that name, `Partial<Record<ToolSummaryArgumentKey, string>>`.
- The web query selects `summaryArgs` whole; `generated/graphql.ts` is regenerated (`codegen:local`).
- Tests:
  - a server unit `it.each` over `send_message_to`, `get_project_task`, AGY `run_command` (`CommandLine`), `view_file`, `write_to_file`, and `list_tabs` → `{}`;
  - the GraphQL e2e expects exactly `{ query: 'cats' }`;
  - a web test compares page cards with live cards for the same calls.

**A (REQ-A).** `contextText` is removed from:
- the node's replay and projection types;
- the dedupe's score term (the choice of entry is otherwise unchanged; the existing dedupe tests pass unchanged);
- the Codex provider and the raw-trace transformer (both `resolveContextText` copies);
- the activities builder, one node test fixture, and the web hydration spec.

`rg contextText autobyteus-server-ts/src` finds nothing.

**D (REQ-D).**
- `toolActivityStatusPresentation('interrupted')` → label "Stopped", tone neutral, `heroicons:stop-circle-solid`, not running. The `default` branch is removed, so every status is explicit.
- `ToolCardStatusPresentationKey` gains `interrupted`. `ToolCallIndicator` shows the stop icon from the shared builder, and its classes treat `interrupted` as the default tone.
- The earlier-trace reader's `STATUS_KEYS` includes `interrupted`, and so do the node's `EventMonitorToolStatusKey` and `statusKey()`.
- MSP-96 (`mobile-activity-details-cases.mjs`) now expects "Stopped".

**J (REQ-J).**
- `api/rest/workspaces.ts` resolves the workspace with `findWorkspace`, then `getOrCreateWorkspace` (the registry restore the GraphQL Files path uses), in a try/catch. Any failure answers 404 "Workspace not found" and logs a line.
- Route permissions, path rules and the access gate are unchanged.
- New `tests/integration/api/rest/workspace-content-after-restart.integration.test.ts`:
  - real config, manager and routes, re-imported with `vi.resetModules()` to act as a restart;
  - after the restart, both content and static reads answer 200;
  - an unknown ID answers 404, and `../outside.md` is refused;
  - it fails on the base with 404 (IMP-02).

**H (REQ-H1, REQ-H2).**
- `AbsoluteFilePathAction` gains `kind: 'absolute'`. New `RunRelativeFileLink { kind: 'run-relative'; href }` and the union `ConversationFileLink`.
- `MarkdownRenderer`, with file actions on, emits `file-path-action` with a run-relative link for an href with no scheme, not `#…`, not `//…` and no leading `/`. Otherwise it emits `relative-link`, as before. The pass-through emits are typed with the union (AIMessage, ThinkSegment, SystemTaskNotificationSegment, TextSegment, InterAgentMessageSegment, AgentConversationFeed, EventMonitorBrowseAssistantRow, AgentEventMonitor).
- New `utils/eventMonitorFilePaths/runRelativeFileLink.ts`, `resolveRunRelativeFileLink(href, runRootPath)`. It normalizes the root, resolves the href with the workspace reference resolver (dropping `#fragment`, refusing anything that leaves the root), and builds the same absolute action an absolute path inside the folder gives.
- `useEventMonitorFilePreview.openPath(link)` keeps its origin and other-node checks first ("on node X"). It then resolves a run-relative link against the run's folder; a link out of the folder or a run with no folder fails with the existing "could not be opened" message. It then continues through the existing absolute flow: on the desktop the Files panel, read-only; on the phone the Files screen.
- A missing file opens the viewer's existing not-found state. That state shows the node's raw `{"error":"File not found: <path>"}`, which predates this ticket and is now FU-005.

**I (REQ-I).**
- `agentBackgroundTaskStore.endRunningTasksForRunEnd(runId)`: every running row of that run becomes `stopped`, with `endReason: 'run_ended'` and `exitCode: null`. Ended rows keep their end.
- `useBackgroundTaskPanelView(runId, expanded, runStopped)` watches `[runId, runStopped]` synchronously:
  - for the same run, a `false → true` change of `runStopped` clears the 2 s timer and ends the running rows;
  - a `true → false` change re-reads the list once;
  - a run switch and the first status never count.
- The 2 s re-read is scheduled only while the run is not stopped.
- Callers pass the run's liveness from the same context as its run ID: `BackgroundTaskPanel.vue` (`activeAgentContext.state.currentStatus === Offline`) and `MobileActivity.vue` (`target.context.state.currentStatus`).
- Unit: 4 cases. Probe MSP-99 drops the live end update in the page; it passes on the branch and fails on a build without D-I (IMP-04).

**C (REQ-C).**
- `prepare-server.mjs` `run()` wraps stage, copy and publish in `try { … } finally { rm(stageDir, { recursive: true, force: true }) }`. The native rebuild runs after it, on the published bundle.
- `autobyteus-web/.gitignore` adds `.server-packaging-stage`.
- On macOS the Windows preparation stages and then stops at its Windows-only no-symlinks check. The branch leaves no stage folder; the base leaves 454 MB (IMP-03). The successful run is Windows-only: the release run's Windows job passed (IMP-09).

**F, G (REQ-F, REQ-G).**
- MSP-44/45 (`mobile-heading-links-cases.mjs`) expect autobyteus-576's links:
  - `other.md`, `other.md#x` and `./x.md` open the file beside it, asserted on the desktop Files viewer and the Skills page;
  - `#no-such-heading-480`, `/x.md` and `../../out.md` open nothing.
  - The fixture writes `other.md`, `x.md` and the skill's `references/`.
  - The phone's file-link results are recorded, not asserted. The case comment cites DEC-009 and FU-004, as the Solution Designer asked.
- `../../out.md`, not `../out.md`: `../out.md` resolves inside the probe's root, so it was not a link out of the root.
- MSP-46 now follows only `#no-such-heading-480`; the Solution Designer agreed.
- MSP-55 (`mobile-context-file-size-cases.mjs`) accepts `net::ERR_SOCKET_NOT_CONNECTED` as well as `net::ERR_CONNECTION_RESET` from its own link cut. Any other unknown error still fails it.

**MSP-100 (AC-H1, AC-H2), `mobile-heading-links-cases.mjs`.** On the desktop and the phone, a run's reply holds four links:
- `docs-609/a.md#x` and `media-609/clip-609.txt` open their files;
- `../outside-609.md` says "The file preview could not be opened." and shows nothing of the file;
- `docs-609/gone-609.md` shows the viewer's not-found state.

### Implementation decisions and deviations (please check)

- **H, the run folder for a run-relative link (deviation from the design's text).** The design names `resolveWorkspaceMetadataForTarget` for the folder fallback. That function returns `null` whenever the target has no `workspaceRootPath` (`activeContextStore.ts:130,139`), so it could never be the fallback. The root is therefore `target.workspaceRootPath`, else the run's projected `target.context.config.workspaceMetadata?.workspaceRootPath`: the same metadata the absolute flow reads later, and the same folder. Unit: `useEventMonitorFilePreview.runRelative.spec.ts` "a target without its folder uses its run's workspace metadata folder".
- **N-2 (ARCH-REV-002, non-blocking, my call): declined.** The panel view stays the one owner of the "run stopped → tasks end" rule, and the reported case (MSP-59) has the list open. Ending rows wherever a live status turns Offline is FU-003.
- **REQ-F's phone part:** my question to the Solution Designer; the answer is DEC-009 (b), FU-004, cited in the case comment.
- **MSP-99's dropped update is done in the page,** by wrapping `window.WebSocket` and stopping `BACKGROUND_TASK_UPDATED` on `/ws/agent/<run>`. Playwright's `routeWebSocket` + `connectToServer` never connected: the probe maps the phone host `192.168.77.x` to 127.0.0.1 only inside Chrome (host-resolver-rules), so the routed socket had no server to reach.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`. No escalation trigger was hit: route permissions and the access model are unchanged, nothing persisted, the summary rules are unchanged, and C did not fail on Windows.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: N/A (reviewed route)
- New design impact or escalation trigger: `None` blocking. The H fallback above is a deviation within REQ-H1; please confirm or route back.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-A / AC-A | No `contextText` on the node; the dedupe's choice is unchanged | run-history projection types, dedupe, Codex provider, raw-trace transformer, activities builder | `rg` finds nothing; server unit suite (projection, dedupe, Codex provider) passes unchanged (IMP-07) |
| REQ-B1, REQ-B2 / AC-B | Tracked contract `dist/` matches source; one check; TESTING.md names it | `scripts/check-contract-dist.mjs`, `package.json`, `TESTING.md`, `RELEASE.md` | IMP-01: base fails naming `team-stream-server-message.d.ts(.map)`; branch and HEAD pass |
| REQ-C / AC-C | No stage folder after success or failure; git-ignored | `autobyteus-web/scripts/prepare-server.mjs`, `autobyteus-web/.gitignore` | IMP-03 (failure half on macOS: none left vs. base 454M; check-ignore); IMP-09 (Windows job Pass) |
| REQ-D / AC-D | "Stopped" + stop icon on the desktop panel, the phone row and detail, the conversation card and the earlier-trace card | `toolActivityPresentation.ts`, `toolCardPresentation.ts`, `ToolCallIndicator.vue`, `eventMonitorActiveTraceBrowsePresentation.ts`, node `event-monitor-active-trace-page-*` | Unit: `toolActivityPresentation.spec`, `ToolCallIndicator.spec`, `MobileRunActivityItem.spec`, `toolCardPresentation.spec`; probe MSP-96 Pass (IMP-08) |
| REQ-E / AC-E | Page card summary = live card summary for every key; no keys → no summary | contracts `tool-summary-argument-keys.ts`; web `toolDisplaySummary.ts`; node page projection; GraphQL JSON | Server unit `it.each` and GraphQL e2e (IMP-02); web page-versus-live test (IMP-07) |
| REQ-F / AC-F | MSP-44/45 with 576's expectations; phone recorded (DEC-009) | `tests/e2e/mobile-heading-links-cases.mjs` | IMP-05; IMP-08 (MSP-44, 45, 46 Pass) |
| REQ-G / AC-G | MSP-55 accepts either code | `tests/e2e/mobile-context-file-size-cases.mjs` | IMP-08 (MSP-55 Pass) |
| REQ-H1 / AC-H1 | A run-relative link opens the run's file, as an absolute path inside the folder | `MarkdownRenderer.vue`, `runRelativeFileLink.ts`, `useEventMonitorFilePreview.ts`, pass-through emits | Unit: `runRelativeFileLink.spec` (13), `useEventMonitorFilePreview.runRelative.spec` (9), `MarkdownRenderer.spec`; probe MSP-100 desktop and phone (IMP-06, IMP-08). A team member run: unit (the target's own folder); its probe is left to API/E2E |
| REQ-H2 / AC-H2 | Out of folder / no folder → "could not open"; other node → "on node X"; missing → viewer not-found; nothing outside read | as above | Unit (each case); MSP-100 (outside and missing, desktop and phone) |
| REQ-I / AC-I | Within 10 s of the stop, "Stopped: the run ended", even with the update lost; MSP-59 still passes | `agentBackgroundTaskStore.ts`, `useBackgroundTaskPanelView.ts`, `BackgroundTaskPanel.vue`, `MobileActivity.vue` | Unit (4 cases); MSP-99 branch Pass at 74 ms, base Fail (IMP-04); MSP-59 Pass |
| REQ-J / AC-J | First read after a restart → 200; unknown → 404; paths unchanged | `autobyteus-server-ts/src/api/rest/workspaces.ts` | Integration test: base Fail 404, branch Pass (IMP-02); MSP-91 `readsAfterRestart` [[4, 200]] (IMP-08) |

- Changes stayed within the requirements doc's Scope Guardrail and the design's Change Scope: `Yes`. Problems found outside it are follow-ups: FU-005 (raw not-found text) and FU-006 (MSP-61).

## Key Files Or Areas

- Root: `scripts/check-contract-dist.mjs` (new), `package.json`, `TESTING.md`, `RELEASE.md`.
- Contracts:
  - `autobyteus-agent-presentation-contracts/src/{tool-summary-argument-keys.ts (new), index.ts}`, its `dist/`, and `tests/tool-summary-argument-keys.test.mjs` (new);
  - `autobyteus-team-stream-contracts/dist/team-stream-server-message.d.ts(.map)`.
- Server:
  - `src/api/rest/workspaces.ts`;
  - `src/api/graphql/types/event-monitor-active-trace-page.ts`;
  - `src/run-history/projection/{event-monitor-active-trace-page-projection,event-monitor-active-trace-page-types,historical-replay-event-types,run-projection-dedupe,run-projection-types}.ts`;
  - `providers/codex-run-view-projection-provider.ts`;
  - `transformers/{historical-replay-events-to-activities,raw-trace-to-historical-replay-events}.ts`.
  - Tests: the new integration test; `tests/unit/api/rest/workspaces.test.ts`; `tests/unit/run-history/projection/event-monitor-active-trace-page-projection.test.ts`; `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts`.
- Web:
  - New: `utils/eventMonitorFilePaths/runRelativeFileLink.ts`.
  - Modified:
    - utils: `utils/eventMonitorFilePaths/absoluteFilePathAction.ts`, `utils/toolDisplaySummary.ts`, `utils/toolCardPresentation.ts`, `utils/activity/toolActivityPresentation.ts`;
    - services and stores: `services/eventMonitor/eventMonitorActiveTraceBrowsePresentation.ts`, `stores/agentBackgroundTaskStore.ts`;
    - composables: `composables/{useBackgroundTaskPanelView,useEventMonitorFilePreview}.ts`;
    - components: `components/conversation/{AIMessage,ToolCallIndicator}.vue`, `components/conversation/segments/{InterAgentMessageSegment,SystemTaskNotificationSegment,TextSegment,ThinkSegment}.vue`, `components/conversation/segments/renderer/MarkdownRenderer.vue`, `components/workspace/agent/{AgentConversationFeed,AgentEventMonitor,EventMonitorBrowseAssistantRow}.vue`, `components/progress/BackgroundTaskPanel.vue`, `components/mobile/views/MobileActivity.vue`;
    - GraphQL: `graphql/queries/runHistoryQueries.ts`, `generated/graphql.ts`;
    - packaging: `scripts/prepare-server.mjs`, `.gitignore`.
  - Probe cases: `tests/e2e/{mobile-heading-links-cases,mobile-background-tasks-cases,mobile-context-file-size-cases,mobile-activity-details-cases}.mjs`.
  - Tests:
    - new `composables/__tests__/{useBackgroundTaskPanelView,useEventMonitorFilePreview.runRelative}.spec.ts` and `utils/eventMonitorFilePaths/__tests__/runRelativeFileLink.spec.ts`;
    - cases added to `MarkdownRenderer.spec`, `ToolCallIndicator.spec`, `toolCardPresentation.spec`, `eventMonitorActiveTraceBrowsePresentation.spec`;
    - `kind: 'absolute'` added to literals in six specs;
    - `contextText` dropped from `runProjectionActivityHydration.spec`.

## Important Assumptions

- ASM-1 (design): every streaming runtime's run turns Offline when it stops; D-I derives the tasks' end from that.
- The page projection's values stay strings; the web already reads `summaryArgs` as a record.

## Known Risks

- C: the successful Windows run is proven only by the release run's Windows job; the job's log does not list the folder after the step (the `finally` runs on both paths, and the failure path is proven on macOS).
- I (design Risks): a wrong live → Offline transition would end a running row on the web. The initial Offline never counts.
- J (design Risks): a URL read after a restart can now create an on-demand skill workspace, as the GraphQL Files path already does.
- FU-003: a list mounted after the stop does not end rows whose end update was lost.
- FU-005: the viewer's not-found state shows the node's raw text and path.
- FU-006: the whole phone probe stays red on MSP-61 until the probe waits for Grok's model list (outside this ticket; red on the base).
- No physical phone.

## Task Design Health Assessment Implementation Check

- Implementation matched the reviewed assessment: `Yes`.
  - One owner per fact: the summary keys (contracts), the status presentation (`toolActivityStatusPresentation`), the run folder resolution (`resolveRunRelativeFileLink`), and the task end rule (`useBackgroundTaskPanelView` + the store's `endRunningTasksForRunEnd`).
  - The panel view stays the one owner of the run-stop rule (N-2 declined).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The GraphQL `summaryArgs` change is a clean cut (the web and node ship together).
- Dead code removed: `Yes`:
  - `contextText`, and both `resolveContextText` copies;
  - the node's `SUMMARY_KEYS`, `FILE_KEYS` and `COMMAND_KEYS`;
  - the GraphQL `EventMonitorToolSummaryArgs` object type;
  - the web's key arrays;
  - `getWorkspaceById` from the REST routes (the method stays for its three other callers);
  - the status builder's `default` branch.
- Changed source files within size guardrails: `Yes`. The largest are `MarkdownRenderer.vue` (283), `toolDisplaySummary.ts` (182) and `useEventMonitorFilePreview.ts` (162). `prepare-server.mjs` (593) changed by 10 added and 4 removed lines (the `try`/`finally`). The probe case file `mobile-heading-links-cases.mjs` is 513.

## Persisted Data Transition Check (When Applicable)

- `Not Affected` (both fields are computed at read time; the workspace registry is only read).

## Environment Or Dependency Notes

- macOS arm64, Node v22.23.1, Chrome headless. The machine was busy during the probe runs (load average 6–9 on 10 cores, `mediaanalysisd` at 160% CPU).
- Heavy runs went one at a time. Paths in evidence are replaced by `<worktree>` / `<tmp>` / `~`.

## Checks Run

Evidence: `tickets/in-progress/phone-web-followups-609/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm check:contract-dist` on base (script applied), branch, HEAD | `f2c0d2a902`; `6ed56306aa`+; `d4af72998f` | macOS, Node 22 | B | AC-B | Pass | `IMP-01-b-contract-dist-check.log` | base `FAIL … (2 files)`; `PASS: … 3 contract packages` |
| IMP-02 | J integration test on base and HEAD; the ticket's server unit, e2e and contract tests by file | base; `d4af72998f` | macOS, Node 22 | J, E | AC-J, AC-E | Pass | `IMP-02-server-tests-by-file.log` | base `expected 404 to be 200`; HEAD `4 passed (4)`, `29 passed (29)`; contracts `# pass 23` |
| IMP-03 | `pnpm prepare-server:windows` on branch and with base `prepare-server.mjs`; `git check-ignore` | `d4af72998f`; base file | macOS arm64 | C | AC-C | Pass | `IMP-03-c-packaging-stage.log` | `stage left: none` vs `stage left: 454M` |
| IMP-04 | `--cases=MSP-59,MSP-99`; MSP-99 on a build with the D-I files from before D-I | `995b8ff6c2` (+ case); pre-D-I files | Chrome 390x844 | I | AC-I | Pass (base Fail as expected) | `IMP-04-msp-99-end-lost-branch/`, `IMP-04-msp-99-end-lost-base/` | `shownStoppedAfterMs: 74`; base `shownStoppedAfterMs: null` |
| IMP-05 | `--cases=MSP-44,MSP-45` | tree = `80322a5145` | Chrome desktop and phone | F | AC-F | Pass | `IMP-05-msp-44-45-heading-links/` | opens `true` on desktop and Skills; phone `false` (recorded, FU-004) |
| IMP-06 | `--cases=MSP-100` | tree = `ab72e00e7a` | Chrome desktop and phone | H | AC-H1, AC-H2 | Pass | `IMP-06-msp-100-run-relative-links/` | `opened: true` ×2; "could not be opened"; not-found |
| IMP-07 | whole web suite; server `test:unit`; both typechecks; three guards; `check:contract-dist` | `d4af72998f` | macOS, Node 22 | everything | all (unit) | Pass | `IMP-07-suites-typechecks-guards.log` | `799 passed (799)`; `1068 passed`; `86 in 36`; `1000 in 313` |
| IMP-08 | the whole phone probe (design step 10) | `d4af72998f` | Chrome, loopback nodes | everything on the phone and desktop probes | AC-D, F, G, H, I, J | 97/98 Pass; MSP-61 Fail, red on base (FU-006) | `IMP-08-whole-phone-probe/` (README, run.log, summary JSON, msp-61-cause.log) | `unknownBrowserErrors 0`; MSP-61 cause: 3.1–3.2 s on base and branch |
| IMP-09 | build-only Desktop Release (`publish_release=false`) | `d4af72998f` (pushed) | GitHub runners | all builds; C on Windows | AC-C, Rule 12 | Pass | `IMP-09-release-build-only-run.log` | every Build job `success`; Windows `.exe` built |
| IMP-10 | Fresh-start build (TESTING.md): fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, the job's two verify steps | `d4af72998f` | macOS arm64 (unsigned) | Rule 12: everything the runner builds from a clean clone | — | Pass | `IMP-10-fresh-start-build.log` | `build exit=0`; `prisma verify: ok`; `ok: node-pty spawn probe`; `stage left in the clone: none` |

- Not run, and why:
  - A physical phone.
  - Signing, notarization and the other operating systems locally (the release run built them).
  - A team member or delegated run's run-relative link on the probe (unit covers the target's own folder; see the hints).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys:
  - the desktop and phone conversation (run-relative links);
  - the Activity's interrupted rows and the tool cards ("Stopped");
  - the phone Activity and desktop Background Tasks after a stop;
  - the Files viewer's and Skills page's Markdown links.
- Approved references: the requirements' AC rows; no new visual design. "Stopped" reuses the neutral tone and an existing heroicon (in the phone icon bundle).
- Rendered surface used: the production phone bundle and the desktop web on built nodes, headless Chrome (390x844 touch; 1280x900).
- States inspected (screenshots in IMP-04…IMP-06):
  - a lost end update turning "Stopped: the run ended";
  - run-relative files opened on the desktop and the phone;
  - the "could not be opened" message;
  - the not-found viewer;
  - the Markdown links on the desktop, the phone and the Skills page.
- Visual or interaction issues found and corrected: none in this ticket's changes. Found and recorded: the raw not-found text (FU-005).
- Remaining unverified: a physical device.

## Downstream Coverage Hints / Suggested Scenarios

- A team member's and a delegated run's run-relative link (AC-H1 "that run's own folder"), on the desktop and the phone.
- A real runtime stopped mid-tool-call: "Stopped" on the desktop panel, the phone row and detail, the conversation card, and after reload on the earlier-trace card.
- A real restart of a node with a registered folder, then a phone file read.
- The whole probe after FU-006, or with MSP-61 excluded.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: as above, after code review.
