# Implementation Handoff: follow-ups-of-461-500 (delivery 1 + 2)

Status: **IR-009 (the eighth delivery base refresh: `origin/personal` `53b72018ad`, autobyteus-491 and -492, merged in
`5eb8246076`) ready for the code reviewer's merge review, then an API/E2E round on messaging and the migration order.**
See "IR-009: 491 and 492" below; IR-008 was the watcher-test refresh. Decided earlier at SR-014 (ARCH-REV-007):
- **FU-035 step 0 (REQ-010, AC-007), D-14:** not in this package. It runs as a later implementation round once Grok's
  24-hour usage window resets, with branch A or B and its own code review. Nothing is waived; FU-035 stays open.
- **FU-021 (REQ-008, AC-005), D-13b:** done. A hang guard whose probe got nothing is ENVIRONMENT; one whose probe got
  its event is INCONCLUSIVE, never a product failure. AC-005's proof is the API/E2E engineer's: 5 of 5 on Linux
  inotify (Docker from the worktree), and a quiet macOS when available.

## Upstream Artifact Package

- Upstream review:
  - ARCH-REV-003 Pass, the combined package.
  - ARCH-REV-005 Pass, G-5 (SR-011 / SR-012).
  - ARCH-REV-006 Pass, the FU-021 probe (SR-013 / D-13).
  - ARCH-REV-007 Pass, SR-014 (D-13b labels, D-14 FU-035 sequencing).
  - Large / High. The handoff rule for Large / High is the code reviewer.
- Requirements doc: `tickets/in-progress/follow-ups-of-461-500/requirements-doc.md`. It covers REQ-001 … REQ-016:
  - REQ-003 and REQ-015 were dropped by the user;
  - status Approved (SR-014).
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-001 … SR-014)
- Design spec: `design-spec.md`:
  - delivery 1 at SR-006 / SR-008;
  - delivery 2 at G-1 … G-4;
  - G-5 at SR-011 / SR-012;
  - FU-021's environment probe at SR-013, its labels at SR-014.
- Supplemental: `source-follow-ups-461.md`, `follow-ups.md` (FU-500-01 … FU-500-07)
- Design review report and architecture review revision record: `design-review-report.md` and
  `architecture-review-revision-record.md`. Both are the reviewer's, uncommitted in the worktree; I left them as they are.

## Current Implementation Summary

- Implementation cycle: `Rework` (CRR-001 Local Fix)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-009` (deltas in `implementation-revision-record.md`; IR-001 is the baseline)
- Related solution revision IDs: SR-006 … SR-014
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006, ARCH-REV-007
- Related code-review revision IDs: CRR-001 (CR-500-001, CR-500-002), CRR-002 (Pass), CRR-003 (CR-500-003 … CR-500-005),
  CRR-004 (Pass), CRR-005 / CRR-006 (API/E2E test code), CRR-007 (IR-004 merge review: CR-500-007), CRR-008 (Pass),
  CRR-009 (API-REV-003 test code), CRR-010 (IR-006 Pass), CRR-011 / CRR-012 (recorded by delivery). API/E2E: API-REV-003
  (round 3, Pass), round 4 on IR-006.
- Related API/E2E revision IDs: API-REV-001 (F-1 … F-3), API-REV-002 (Pass).
- Delivery: the Delivery Engineer's blocked report (`release-deployment-report.md`, `2f8a463a11`), a Local Fix to integrate
  the latest base.
- Related solution / architecture revisions for IR-003: SR-015, SR-016; ARCH-REV-008, ARCH-REV-009.
- Branch: `codex/follow-ups-of-461-500`, with `origin/personal` `ff13782f36` merged in `39325a1e50` (IR-004) and
  `0570c47fd9` in `e93671cce0` (IR-006), `24d438fa31` in `eecb228bd6` (IR-007), `f7b4d68711` in `f5a7d789c9` (delivery)
  and `75048cbaf4` in `bb42531c7d` (IR-008), and `53b72018ad` in `5eb8246076` (IR-009).

Commits, oldest first, by the design's Change Sequence:

| Step | Commit | What |
| --- | --- | --- |
| 1 | `75ee688dad` | Names (N2, N3, N5, SR-008 additions): a standalone run's agent, delegated run, `RunAgent*`, `TASK_DELEGATED_RUN_NOT_ASSIGNABLE`, GraphQL `runId`, `execution_tree.agent`, web delegated-run rows |
| 2 | `377e4bd319` | FU-036: one attach function for the four run streams; early messages get `SESSION_NOT_READY`; early close ends the late session |
| 3 | `6107590026` | FU-011 / FU-018: hosts pass their owners (channel, discovery, remote services, command coordinator, Task service); required collaborators; explicit "off" / "not eligible" values |
| 4 | `36b190e490` | FU-013: the team total asks for team runs only |
| 3-4 fix | `d4e36d4831` | owner checks ordered after the complete-input check; tests follow FU-011, FU-013, FU-020 |
| 5a | `51ec3b3469` | FU-020 removal: the host-scoped owner kind, its route, `DelegatedChildLocations`; N6 dead code removed |
| 5b | `a954ae5300`, `461ae7e472` | `20261117_delegated_run_own_attachment_links` and its follow-up after `20261017_task_agent_own_run_v1`; M-7 classification test |
| 6 | `e2b6928c9e`, `95bdf2af0f` | FU-030: the five collected refusals (DLP-003/004/005, SIR-001, DCP-004); a delegation refusal's next step kept apart from its reason |
| 7 | `18f9b0c038` | FU-022 (runtime-names test), FU-023 (Nuxt ignore). FU-016 had already shipped in 461 |
| 7 / FU-021 | `fb52bd332c`, `4277f1945e`, `a4e7f18e6d` | the watcher test asserts outcomes; the SR-013 environment probe; a per-test 60 s guard; named waits; the sentinel's delete is awaited; SR-014's ENVIRONMENT / INCONCLUSIVE labels |
| G-1 | `d4b632e61b` | the release records the migration order; the order test reads the file |
| G-3 | `310ba45351` | SIR-002's session names the server helper run |
| G-2 | `63fa6cf978` | same-ID repair of `20260521_team_run_history_index_v2` |
| G-5 | `8e2d3b76c0` | stored model not offered: `storedModelOffer`, `RUN_MODEL_NOT_OFFERED`, both start paths, web per-member note |
| 9 | `6b4ee1f128` | docs: glossary (Code Names, Known leftovers), collaboration model, module docs, guideline §10 lesson line |
| size | `1eed3c4aff` | `build-studio-server.ts` 511 → 498 and `configured-agent-execution-handle.ts` 507 → 500 (see Legacy / size check) |
| G-5 fix | `d8ffc77c8b` | the 8 s model-list budget is `MODEL_LIST_READ_MS` in `read-deadline.ts`; `llm-management` no longer imports `available-agent-runtimes` (found by the full unit run) |
| 8 | evidence only | FU-035 step 0: blocked by the Grok usage limit (IMP-011); a later round per D-14 |
| IR-004 merge | `39325a1e50` | `origin/personal` `ff13782f36` merged (beta.8, beta.9, 448 part 1, 483, 458, 514, 515, 508); 4 conflicts resolved |
| IR-009 merge | `5eb8246076` | `origin/personal` `53b72018ad` merged (491 migration, 492 running agents and run-id messaging); 18 conflicts |
| IR-008 merge | `bb42531c7d` | `origin/personal` `75048cbaf4` merged (v1.5.13 records, 517 FU-002 / FU-003); the watcher test's two wait designs combined; TESTING.md's rule names the sentinel check |
| IR-007 merge | `eecb228bd6` | `origin/personal` `24d438fa31` merged (beta.10, 517, 524 round 2, 526); 2 conflicts resolved |
| IR-006 merge | `e93671cce0` | `origin/personal` `0570c47fd9` merged (522, 524, 448 part 2, 493, 525); 13 conflicts resolved |
| IR-006 fix | `4db98c6d1a` | the FU-011 host-owners test's complete supervisor input includes 493's `episodicCatalog` |
| IR-005 | `eb741a097e` | CR-500-007: `createStudioPackageServices` moves to `compositions/studio-package-services.ts`; `build-studio-server.ts` 502 → 485 on the merged base |
| IR-004 fix | `bfeea63612` | three 461-era registration-order tests list FU-020's two migrations (missed in IR-001) |
| CRR-003 | `7eb78a701b` | IR-003: G-5 R1 (on-demand AutoByteus models), R2 (definition first), R3 (inherited-layer refusal) |
| CRR-001 | `7eb6f94b9f` | IR-002: the server's delegated-run code names (no "copy"); the stale coordinator doc line; FU-500-07 in the glossary's Known leftovers |

## Routing Classification (Mandatory)

- Task size: `Large`. Architecture risk: `High` (design-spec "Task Size And Architectural Risk", "Delivery 2 classification").
- Classification: `Confirmed`. Reasons: a persisted-data migration, public contract changes (GraphQL `runId`,
  `execution_tree.agent`, `RUN_MODEL_NOT_OFFERED`), and composition rewiring in two hosts.
- Selected route: `Code Review`.
- New design impact: `None` open. FU-021's classification was raised and decided at SR-014 (D-13b); FU-035's
  sequencing at D-14.

## Reviewed Behavior Implementation Trace

| Behavior ID | Change / Preserved Outcome | Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| B-1 | New attachments name the run's own owner (preserved); host kind removed | web `useComposerTarget` unchanged; server `context-file-owner-types.ts` | Done (5a) |
| B-2 | Old attachments open through the run's own link after the migration | migration targets = `buildFinalContextFileLocator` output; `context-file-owner-resolver.ts` | Done; live resolve left to API/E2E |
| B-3 / B-4 | Migration with backup; follow-up after `20261017_task_agent_own_run_v1` | `app-data-migrations/migrations/delegated-run-own-attachment-links/` | Done (5b) |
| B-5 | `SESSION_NOT_READY` on org and collaboration streams | `api/websocket/agent.ts` `attachRunStream` | Done (2); AC-006 test `run-stream-not-ready.integration.test.ts` |
| B-6 | Task closure stop explicit per host | `AgentRunService.standaloneRuns` required; `APPLICATION_HOST_STANDALONE_RUNS` | Done (3) |
| B-7 | Discovery tools: off refusal from an explicit value | `REMOTE_COLLABORATION_OFF_DISCOVERY`; `PeerDiscoveryAccess` to MCP providers and native tools | Done (3) |
| B-8 | Team total asks the team kind | `api/graphql/types/token-usage-stats.ts` | Done (4) |
| B-9 | Refusal texts FR-1 … FR-4 | see "FU-030 texts" | Done for the five collected cases (6) |
| B-10 | Grok refused tool call | — | **Not in this package** (D-14): step 0 blocked by the Grok usage limit (IMP-011); a later round |
| G-1 | The release records the migration order | `scripts/desktop-release.sh` → `pnpm migrations:record-released`; `released-migration-order.json` | Done |
| G-2 | A late team index v2 keeps every team run with a current tree | `team-run-history-index-v2/existing-team-row-repair.ts` | Done |
| G-3 | SIR-002's session names the server helper run | `skill-improvement-removal-cases.mjs` | Done |
| G-5 | A stored model that is no longer offered is refused at start; Settings marks the member | `run-model-selection-service.ts` `storedModelOffer`; `run-model-selection-refusal.ts` `storedModelStartRefusal`; `standalone-agent-run-lifecycle-service.ts` `restoreStarted`; `configured-agent-execution-handle.ts` `prepareActivation`; web `ExistingRunConfigEditor.vue` → `RunMemberRow` | Done; rendered check limited (see Frontend) |
| FU-021 | The watcher test asserts outcomes; ENVIRONMENT or INCONCLUSIVE at a hang guard, never a product failure | `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Done (IMP-012, IMP-013); AC-005's proof is API/E2E's (Linux 5 of 5) |

- Changes stayed within the Scope Guardrail: `Yes`.

## FU-030 texts (old → new; codes and outcomes unchanged)

| Case | Old | New |
| --- | --- | --- |
| DLP-005 | "{A} cannot be delegated to: '{m}' is not offered by {R} now. Refresh the model list and choose again." | "{A} can't be delegated to: its default model cannot be used: '{m}' is no longer offered by {R}. Choose another model for {A} in its settings, or delegate to another agent." |
| DLP-003 note | "{A}: its agent default {R} / {m} could not be used ('{m}' is not offered by {R} now. Refresh …); it runs on {T} ({origin})." | "{A}: '{m}' is no longer offered by {R}, so it runs on {T} ({origin}). Choose another model in {A}'s settings to change it." |
| DLP-004 Settings row | "… was not used: '{m}' is not offered by {R} now. Refresh the model list and choose again." | "… was not used: '{m}' is no longer offered by {R}." (the row shows what runs instead) |
| SIR-001 | "You can't message this agent: it works on a different Task." | "You can't message {run}: it isn't part of your Task. Only runs that work on the same Task can message each other by run id." |
| DCP-004 | "{name} is running. Stop it, then save again." | "{name} is running, so its settings can't be saved now. Stop it, then save again." |
| 4004 close (web) | "This run cannot host delegated copies." | "This run has no delegation view: it is application- or system-owned, so it cannot delegate." |
| `launchBase` | "This run cannot host delegated copies." | "This run cannot delegate: it is application- or system-owned." |
| Inherited layer (SR-015 R3) | "{A} can't be delegated to: '{m}' is no longer offered by {R}." (IR-001, no next step; base: "… is not offered by {R} now. Refresh the model list and choose again.") | "{A} can't be delegated to: it would use this run's model '{m}', which {R} no longer offers. Set a model for {A} in its settings, or change this run's model, then delegate again." Other inherited reasons keep their own words, with the same next step. |
| G-5 (new) | an opaque runtime error | "{agent} can't start: its saved model '{m}' is not offered by {R} now. Stop it, then choose a runtime and model for {agent} in Settings." (`RUN_MODEL_NOT_OFFERED`) |

A peer's refusal keeps only the peer's reason ("its default model cannot be used: …, and Model Routing is off on node …").
Its next step names the peer's settings, so `CollaboratorAddError.nextStep` is added only by this node's own refusals.

Not reworded this round: the other `send_message_to` / `delegate_task` results, in:
- `cross-run-message-delivery.ts`;
- `remote-refusal-codes.ts`;
- `collaborator-errors.ts`.

I reviewed them: their texts already say what happened and what to do, which `refusal-texts-vocabulary.test.ts` and
`result-catalogue.test.ts` check. The Save refusal (`run-model-selection-refusal.ts`, "Refresh the model list and choose
again. Saved settings were not changed.") is kept, because in the Settings it already names the next step.

## IR-009: 491 and 492 (eighth base refresh)

- **Merge:** `git merge --no-ff origin/personal` (`53b72018ad`), commit `5eb8246076`. 18 conflicts.
- **App-data migration order** (`app-data-migration-registry.ts` and the three 461-era order tests): the 45 released
  entries, then 500's two unreleased `20261117_delegated_run_own_attachment_links` and its follow-up, then 491's
  unreleased `20261118_remove_retired_built_in_agents`, in date order. `released-migration-order.json` is unchanged.
  - **Shared stored shapes:** none. 500's migrations read and rewrite only raw-trace files under `memory/`. 491's
    deletes two installed definition folders under `agents/` (`autobyteus-skill-evolver`,
    `autobyteus-memory-compactor`) and leaves their runs. Neither writes or reads what the other converts, so the
    late-predecessor rule doesn't apply.
- **492 DEC-001 supersedes FU-030's SIR-001.** The run id is the address: a message between runs no Task relates is
  delivered while the receiver runs (`deliverUnrelated`), not refused.
  - This ticket's refusal text (`otherTaskRefusal`, "You can't message {run}: it isn't part of your Task…") had no
    other use, so it is removed.
  - `cross-run-message-delivery.ts`, `global-agent-run-message-router.ts`, their unit tests, `result-catalogue.test.ts`
    (M-06 withdrawn), `contract-states.json` and the `collaboration-prompt-wording` e2e take 492's side.
  - Diffed: this ticket's only changes to the two source files were that text.
- **492's running agents with 500's names (N2) and owners (FU-011):**
  - `running-agents.ts`, `running-agents-composition.ts` and their tests: `RunAgentAccess`, `RunAgentStatusEntry`,
    `runAgentStatuses`, `runAgents`.
  - `remote-message-receiver.ts` and `remote-collaboration-composition.ts`: 500's `runAgents` with 492's `liveRoot`.
  - **`list_running_agents`** used `findProcessPeerDiscoveryChannel()`, the process lookup FU-011 removed. It now takes
    the host's `PeerDiscoveryAccess` like `list_available_agents` and `list_peer_nodes`:
    - `listRunningAgentsFor(context, args, discovery, { listing? })`;
    - `createBoundListRunningAgentsTool(ctx, peerDiscovery)` and `ListRunningAgentsMcpAdapterProvider(peerDiscovery)`;
    - the default providers pass `input.peerDiscovery`; the AutoByteus tool resolver passes `input.peerDiscovery` to
      all three discovery tools;
    - `REMOTE_COLLABORATION_OFF_DISCOVERY` answers `listRunningAgents` with the off refusal.

    492's local listing stays `getProcessRunningAgentsListing()`, which throws loudly when not composed. That's the
    FU-500-02 kind of getter, not a silent lookup.
  - `standalone-root-message-delivery.ts`, 492's new `acceptPeerRunMessage`: `isRunAgent`, `options.agent`,
    `agentIdentity()`.
  - The tests `list-running-agents-tool.test.ts` and `running-agents-messaging.test.ts` follow: the passed-in
    discovery, `agentServices` / `activateRunAgent` / `terminateRunAgent`, `remoteChannel`.
  - `build-studio-server.ts`: 492's `running` with 500's `remote.channel`. It is 434 effective lines.
- **Web `skill-improvement-removal-cases.mjs`:** the base's released-shape sessions (`fx.session`) and 500's
  derived-files exclusion (`memory/episodic/` and `restart-resume/`).
- **`typecheck-baseline.json`:** `standalone-remote-delegation.test.ts` at 3, via `typecheck:update-baseline`;
  `run-agent-access.test.ts` kept.
- **No renamed or removed name returns.** That covers `PairedAgent*`, `transient_execution`, `ensureHostReady`,
  `findProcessPeerDiscoveryChannel`, `findProcessRemoteRunChannel`, `OTHER_TASK_REFUSAL`, `isHost(`,
  `hostIdentity(` and the `Copy*` identifiers.
- **After the merge** (`8e8c21c2c4`): this ticket's attachment-link registration test had asserted its pair are the
  registry's last two entries. It now asserts they're adjacent, right after the last 461 migration, with only 491's
  after them.

## IR-008: the watcher test after 517 (seventh base refresh)

- **Merge:** `git merge --no-ff origin/personal` (`75048cbaf4`), commit `bb42531c7d`. One conflict, 19 hunks, in
  `tests/integration/file-explorer/file-system-watcher.integration.test.ts`, which both sides had redesigned.
  - 500 (FU-021, SR-013/014, D-13/13b): outcome waits under one hang guard per test, a sentinel check for "no event",
    and the raw `fs.watch` probe's ENVIRONMENT / INCONCLUSIVE labels.
  - 517 (`b55ce60b5e`, FU-002): event waits take the shared `OS_FILE_EVENT_WAIT_MS` from
    `tests/helpers/os-latency-under-load.ts`; "no event" checks keep their short windows. TESTING.md ("File watching on
    a busy Mac") now requires a test that waits for an OS file event to take its limits from that helper.
- **Resolution, a deliberate combination:**
  - 500's structure stays. AC-005 rests on it, and the sentinel check proves "no event" without a quiet window, so
    517's 800 ms windows aren't taken.
  - Its numbers come from 517's helper, as TESTING.md requires:
    - the per-test guard: `OS_FILE_EVENT_WAIT_MS`, 30 s (was 60 s);
    - the test timeout: `FILE_EVENT_TEST_TIMEOUT_MS` plus the 10 s environment probe, 55 s (was 90 s), so the probe
      still labels a failure before vitest's timeout;
    - the watcher start/close hooks: `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS`.
  - The first try used the helper's test timeout alone (45 s). On the loaded Mac (load 137) one test passed 45 s
    unlabelled: guard, probe, and slow file operations together. Adding the probe's own 10 s fixed it, and every
    loaded-Mac failure is labelled again (IMP-025).
- **TESTING.md:** the busy-Mac rule now names the alternative to a quiet window: a sentinel change after the ignored
  one, as this file does. It also says what its ENVIRONMENT / INCONCLUSIVE labels mean, and that its proof is a run
  where the OS delivers events.
- **Decision note:** the guard went from SR-013's 60 s to the project's shared 30 s. The waits are not longer
  (SR-013: "no longer waits"), and on Linux events arrive in milliseconds, so AC-005's gate is unaffected (IMP-024
  5/5). If the reviewer reads this as a design choice, it goes to the Solution Designer.
- **AC-005 gate on the merged commit (IMP-024):** Linux (Docker `node:22-bookworm`, linuxkit 6.12 aarch64, 10 vCPU),
  `test:integration:prepare`, then the file 5 times. Each run: "Tests 14 passed (14)", 0 ENVIRONMENT / INCONCLUSIVE
  lines.

## IR-007: fourth base refresh (delivery Local Fix)

- **Merge:** `git merge --no-ff origin/personal` (`24d438fa31`: `v1.5.13-beta.10`, 517, 524 round 2, 526), commit
  `eecb228bd6`. No rebase. The base added no app-data migration (the Delivery Engineer's check).
- **`restart-resume/restart-resumer.ts`:** 526 (`6517199e36`, one notice ID on every copy) passes the whole notice
  `message` to `restartNoticeLifecycleObserver`. Its merged signature takes `Pick<AgentInputUserMessage, "content" |
  "metadata">`. Kept with 500's `readyAgent`: `restartNoticeLifecycleObserver(() => readyAgent ??
  this.dependencies.liveRuns.getActiveRun(entry.agentRunId), message)`.
- **`compositions/build-studio-server.ts`:** a paired removal.
  - 524 round 2 (`2e5b0198e2`) moved `closeStudioProcessResources` unchanged into `studio-process-resources.ts`, next
    to its new process-exit stop of the file watches.
  - 500 (IR-005, CR-500-007) had moved `createStudioPackageServices` into `studio-package-services.ts`.
  - Git showed the two removed blocks as one hunk. 500 never changed the close function: its text at `0570c47fd9` and
    on this branch is identical (diffed). So both stay moved and the hunk is dropped. 524's process-exit path
    (`stopFileWatchesForProcessExit`) came in by the auto-merge.
  - My first resolution left a stray `};` (TS1128, 2 production errors). I caught it at the type gate and amended it
    into the merge commit before anything else ran on it.
  - Now 428 effective lines.
- **No renamed name returns.** The merged tree has no `PairedAgent*`, `transient_execution`, `ensureHostReady`,
  `findProcessRemoteRunChannel`, …

## IR-006: third base refresh (delivery Local Fix)

- **Merge:** `git merge --no-ff origin/personal` (`0570c47fd9`), commit `e93671cce0`, with the Delivery Engineer's
  records up to `0af5a64677`. No rebase.
- **448 part 2 (background task count) with 500's run-agent names (N2, FU-006 / FU-010).** 448 extended the status
  shape this ticket renamed (`PairedAgentStatus` / `pairedAgentStatusFrame` / `pairedAgentStatuses` /
  `observePairedAgents` → `RunAgentStatusEntry` / `runAgentStatusFrame` / `runAgentStatuses` / `observeRunAgents`).
  - `run-agent-access.ts`: `RunAgentStatusEntry` gains `backgroundTasksRunning`; `runAgentStatusFrame(status,
    backgroundTasksRunning)` writes `background_tasks_running`.
  - `remote-run-channel.ts`; the base's new `peer-run-calls.ts` and `remote-run-observation.ts`: `RunAgentStatusEntry`
    from `./run-agent-access.js`.
  - `team-run-agent-access.ts`, `remote-run-view-provider.ts`, `run-status-service.ts`: 500's methods with 448's count.
  - `standalone-paired-agent-access.ts` (modify/delete): this ticket had replaced it with `standalone-run-agent-access.ts`.
    448's change, the run's `background_tasks_running` in its status entry, is applied to `runAgentStatuses` there;
    the old file stays deleted.
  - Web `AgentOrgRunMemberTree.vue`: 448's `backgroundTasksRunning` on both rows, with 500's `delegatedRun: null`
    (N5).
  - 448's new `WorkspaceRowsBackgroundTasks.spec.ts` follows N5: `WorkspaceDelegatedRunRow`,
    `RunHistoryDelegatedRunRow`, `'delegated_run'`, `delegatedRunKind`.
  - Tests `run-status-service.test.ts` and `remote-run-view-provider.test.ts`: 500's names with 448's count.
- **493 (per-agent episodic catalog) with 500's composition:**
  - `agent-memory-layout.ts`: 493's `definitionFolderName` is kept. `AGENT_RUN_COLLABORATION_DIR_NAME`, which the
    base still declared, stays removed (N6: no current reader; the frozen layout keeps its own).
  - `build-studio-server.ts`: 493's `episodicCatalog` and its `start` with 500's `remote.channel` (no
    `findProcessRemoteRunChannel`, FU-011). It is now 492 effective lines (CR-500-007).
  - `e2e-run-history-services.ts`, `agent-org-run-service-model-selection.test.ts`: both sides' helpers
    (`noEpisodicCatalog`, `NO_PEER_CHANNEL`, `NO_ON_DEMAND_MODELS`).
- **After the merge** (`4db98c6d1a`): 493 made `episodicCatalog` a required supervisor input, so this ticket's FU-011
  test `required-host-owners.test.ts` adds it to its complete input.
- **No renamed name returns.** A grep of the merged tree and of the base's changed docs, probes and Vue files for
  `PairedAgent*`, `observePairedAgents`, `transient_execution`, `TransientExecution`, `transientKind`,
  `ensureHostReady`, `postHostUserMessage`, `activeHostRun`, `execution_tree.host` and a stray `hostRunId` finds none
  outside the frozen migration code.
- **Released order:** unchanged. Nothing under `src/app-data-migrations/` changed in the base (the Delivery Engineer's
  check).

## IR-004: base refresh (delivery Local Fix)

- **Merge:** `git merge --no-ff origin/personal` (`ff13782f36`), commit `39325a1e50`. No rebase.
- **Conflicts and resolutions** (448's restart reminder and 500's names both hold):
  - `restart-resume/restart-notice.ts`: 448's doc ("The wake after an update"), with "the resumer (a run's own agent)".
  - `restart-resume/restart-resumer.ts`: 448's comment ("a member starts on the reminder itself") with 500's
    `readyAgent` / `ensureAgentReady`. The rest of 448's claim / settle flow auto-merged and already uses `readyAgent`.
  - `docs/modules/restart_resume.md`: 448's steps (claim, settle), with `ensureAgentReady` / `postAgentUserMessage`, and
    "standalone runs' agents" in its intro.
  - `tests/e2e/helpers/claude-live-agent-harness.ts`: both imports (500's `NO_ELIGIBLE_STANDALONE_RUNS`, 483's
    `lazyAgentStreamSequences`).
- **Renamed names the base might reintroduce:** none. A grep of the merged tree for `execution_tree.host`,
  `transient_execution`, `ensureHostReady`, `postHostUserMessage`, `TASK_COPY_NOT_ASSIGNABLE`,
  `agent_collaboration_member_draft` and a stray `hostRunId` finds only the 461 base-shape test's explanatory comment
  and the kept `TaskExecutionHostIdentity`.
- **508's change to the released `20261111` conversion** (`run-file-conversion.ts`, `e0b58997f3`) does not interact
  with FU-020's migrations.
  - 508 rewrites launch fields (`runtimeKind`, `llmModelIdentifier`, `llmConfig`, `launchSource`) in
    `run_metadata.json` and trees.
  - `20261117_delegated_run_own_attachment_links` and its follow-up read and rewrite only raw-trace files
    (`raw_traces_active.jsonl`, `raw_traces_{n}.jsonl`) and import no launch helper (frozen `context-file-owner-types`
    only).
  - Both still run after every 461 migration. On the merged tree, `tests/app-data-migrations` (with 508's AC-001 …
    AC-006 cases) passes, after the order-test fix below.
- **Released order:** unchanged. The Delivery Engineer checked that beta.8 / beta.9 shipped no app-data migration, so
  `released-migration-order.json` (45 IDs) holds.
- **Found on the merged tree, not caused by the merge:** three registration-order tests of 461-era migrations
  (`collaborators-to-delegated-runs-v1`, `delegated-copy-own-file-complete-v1`, `remove-skill-improvement-data`)
  assert the exact IDs after them, and FU-020 had appended its two. They failed since `a954ae5300`; my IR-001 runs
  didn't cover `tests/app-data-migrations`. Fixed in `bfeea63612`.

## IR-003: the G-5 revision (SR-015, SR-016)

- **R1, on-demand AutoByteus models (CR-500-003):**
  - `ModelAvailabilityService.loadOnDemandModel(identifier)` answers `not_on_demand`, `loaded` or `unreadable`.
    - `not_on_demand`: the identifier is neither a custom endpoint nor host-scoped.
    - `unreadable`: the provider can't be resolved (host or endpoint not configured); `ensureProviderModelCatalog`
      throws; or its source reports any failed unit (`failedUnitCount > 0`) or a failed state (`ERROR`, `STALE_ERROR`).
    - `loaded`: otherwise.
  - `ensureModelAvailable` shares the same private load step (`loadProviderCatalog`) and keeps its own errors, so a
    start still fails with base's error when a local host is down. That's the one deviation from "uses it too": calling
    the classifying method would have replaced base's error with a generic one.
  - `RunModelSelectionService` takes the loader (`OnDemandModels`) from the host: the studio and the standalone
    application host pass `getModelAvailabilityService()`, the same catalog singleton.
    - `storedModelOffer` (autobyteus): load step, then the list, both inside the `MODEL_LIST_READ_MS` race.
      `unreadable` or the deadline means `list_unreadable`.
    - `listOptions`: the same load step inside the same budget. `unreadable` gives `modelListReadable: false`, with the
      existing unreadable text.
  - **Web: no change was needed.** The client already maps `modelListReadable: false` to the `unavailable` state, and the
    note shows only for a `ready` state (`ExistingRunConfigEditor.vue:396-406`; savedSnapshot spec "never for a list the
    server could not read"). The server now answers `false` where it used to answer a readable list without the model.
- **R2, definition first (CR-500-004):**
  - `storedModelStartRefusal(checks, input)` takes `StoredModelStartChecks` = `{ agentDefinitions:
    Pick<AgentDefinitionService, "getAgentDefinitionById">, storedModels }`.
  - It reads `input.agentDefinitionId` first. A missing definition or a failed read returns null, so G-5 is skipped and
    the path's own not-found answers.
  - Both paths pass it: the lifecycle service's `storedModelChecks` and the member handle's `storedModelChecks`.
  - The supervisor and the application kernel builder build it from their `agentDefinitionService` and
    `modelSelectionValidator`.
- **R3, inherited-layer refusal (CR-500-005):**
  - `collaborator-launch-resolver.ts` `inheritedLayerRefusal` gives the text in the FU-030 table, with
    `CollaboratorAddError.nextStep`.
  - `InheritedLaunchVerdict` (false) gains `modelNoLongerOffered`, so the refusal can say it in its own words without
    reading the detail text.
  - The resolver unit test, the DLP-005 e2e and the probe assert it.
- **Sizes:** `configured-agent-execution-handle.ts` 499 (effective lines). `build-studio-server.ts` was 498 before the
  merge and 502 after it; IR-005 brings it to 485.

## The two items decided at SR-014

### FU-035 step 0: blocked by the Grok usage limit (REQ-010, AC-007), a later round per D-14

- **Probe:** a throwaway live probe, kept as evidence (IMP-011): a real Studio server and the host's `grok` 1.0.88 with
  `grok-4.7`. It records three things:
  - the executor's MCP result;
  - each raw ACP tool-call snapshot, with its projection;
  - the model's verbatim account of the tool's text.

  The case is a standalone Grok agent calling `send_message_to` with an unreachable `target_agent_run_id`.
- **Attempts:**
  - **11:49 and 11:56:** model discovery timed out 5 of 5 times. The CLI's ACP `initialize` gave no answer in 40 s at
    load about 146.
  - **12:16:** the turn reached Grok and was refused before any tool call: `ACP_PROMPT_FAILED` "Rate limited: API error
    (status 429 Too Many Requests): subscription:free-usage-exhausted: You've used all the included free usage for
    model grok-4.7 for now. Usage resets over a rolling 24-hour window — tokens (actual/limit): 609708/600000".
- **What this means:** no executor result, snapshot or model reply exists yet, so neither branch A nor branch B can be
  chosen. Per the founder's Grok rule, only his own words waive a Grok case that fails on a usage limit. I waived
  nothing and changed no product code for FU-035.
- **D-14:** step 0 runs after the window resets, as a later round (D-14 named it IR-002; that ID went to the CRR-001 Local Fix and IR-003 to the G-5 revision), with branch A or B and its own code review. The probe is
  ready, and the run takes about 2 minutes.

### FU-021: the labels (REQ-008, AC-005), D-13b

- **Built as reviewed** (`4277f1945e`). At a hang guard, a raw `fs.watch` probe runs: a fresh temp dir, one write,
  10 s. No event gives "ENVIRONMENT: …"; an event keeps the product message. There are no retries, no skips and no
  longer waits, and the watcher code is unchanged.
- **Corrections in the test, to keep the classification truthful.** The first loaded run showed 2 test defects and 1
  unlabelled timeout:
  - **One 60 s guard per test, shared by its waits:** two waits in sequence had reached the 90 s test timeout before
    the probe could label the failure.
  - **Named waits:** each wait names the change it expects (`isAddOf(name)`). One wait had taken the sentinel's ADD as
    `main.ts`'s.
  - **The sentinel's delete is awaited:** a late DELETE of the previous sentinel reached the next subscriber and was
    reported as an ignored path's change.
  - **Fixed deadlines removed:** the 4 s and 12 s deadlines are gone.
- **Result** (IMP-012). Three runs at ambient load 67–118: 18 of 42 cases fail, all at the guard:

  | Run | Failed | ENVIRONMENT | Product label | Assertions or timeouts |
  | --- | --- | --- | --- | --- |
  | 1 | 5 of 14 | 1 | 4 | 0 |
  | 2 | 6 of 14 | 3 | 3 | 0 |
  | 3 | 7 of 14 | 2 | 5 | 0 |

  All 12 product-labelled failures saw no change at all from the watcher (`changes before the guard: []`). The
  `__pycache__` case alone, right after, passed 1 of 3, so it fails intermittently, not deterministically.
- **Why the label changed (D-13b):** the investigation ("FU-021, continued") shows raw `fs.watch` itself missing
  events on 2 of 8 fresh streams at this load. So the probe's fresh stream getting its event does not show that the
  watcher's stream got its own.
- **SR-014 implementation** (`a4e7f18e6d`): when the probe gets its event, the case fails with "INCONCLUSIVE: the
  watcher saw no change; a fresh fs.watch stream did. Under load the OS can drop one stream's events (FU-500-06); rerun
  where the OS delivers events." The ENVIRONMENT message is unchanged. The case's diagnostics ("Changes before the
  guard: …") follow on a new line. It still fails: no skip, no retry.
- **One run after the change** (IMP-013, load 120–190): 7 of 14 failed, 1 ENVIRONMENT and 6 INCONCLUSIVE, with no other
  failure. Loaded-macOS runs are evidence only.
- **The proof is API/E2E's** (D-13b): 5 of 5 on Linux inotify, in a Docker container from the worktree after
  `pnpm test:integration:prepare`, and on a quiet macOS when one is available. This machine was never quiet (load average
  67–200 from other worktrees' suites, `fseventsd` at about 150% CPU). Note: `design-spec.md` "To prove it" (lines
  469–471) still says a loaded run "fails only with ENVIRONMENT cases"; D-13b (ENVIRONMENT or INCONCLUSIVE) and AC-005
  govern, and the Solution Designer is aligning the text.

## Key decisions taken in implementation (deviations, with reasons)

- **Discovery reaches the native autobyteus tools too** (the design named the MCP providers). The same silent lookup
  served `list-peer-nodes-tool.ts` / `list-available-agents-tool.ts`; both now take the host's `PeerDiscoveryAccess`.
- **Late binding in the studio:** remote collaboration is composed after the run services and the MCP host.
  - The studio passes `remote.channel` / `remote.discovery` from `createLateRemoteCollaborationBinding()`
    (`remote-collaboration-composition.ts`, `1eed3c4aff`). It throws if used before `bind`; there is no process-wide
    lookup.
  - The application host passes `() => null` / the off discovery.
- **The MCP catalog and executor singletons are removed.** With the discovery required, a default catalog would be the
  same silent "off", so the host passes its providers.
- **`execution_tree.host` → `execution_tree.agent`** in the stream contracts (N2, for the run's agent). The 461
  base-shape test maps the renamed key explicitly.
- **N3 visible wording kept:** "Delegated copy", "Stop this copy …", "Select a copy …" and "Host run" are normative UI
  copy (the run-settings UI/UX spec). Only their i18n keys were renamed. Recorded as **FU-500-07**.
- **The migration's pre-check marker** is `/agent-collaborations/` (not `"/rest/agent-collaborations/`), so draft and
  absolute-URL forms are reported as warnings. Strings without `/context-files/` (the kept references route) are not
  links.
- **The G-1 recorder runs through vitest** (`tests/release/record-released-migration-order.test.ts`, skipped unless
  `RECORD_RELEASED_MIGRATION_ORDER=1`).
  - Why: the workspace has no TypeScript script runner, and adding `tsx` re-resolved vite/vitest/nuxt peers across the
    lockfile, a release risk (rule 12).
  - The step runs in `release` and `beta`.
  - The `RELEASE.md` "Cutting The Release" line for it is the Delivery Engineer's.
- **G-2 lives in `existing-team-row-repair.ts`.** The migration file stays under 500 lines (470 effective lines).
- **G-5's budget constant:** the 8 s model-list budget moved to `MODEL_LIST_READ_MS` (`runtime-management/read-deadline.ts`).
  It keeps the dependency direction of SR-007 decision 5, and the runtimes report uses the same constant.
- **G-5, one refusal helper:** both start paths ask `storedModelStartRefusal(storedModels, …)`:
  - the standalone restore throws `AgentRunActivationError(RUN_MODEL_NOT_OFFERED, …)`;
  - the member's `prepareActivation` throws `StoredModelNotOfferedError`.
- **FU-021 test corrections** beyond the reviewed probe (above): a per-test guard, named waits, the awaited sentinel
  delete. They are test-only, with the same 60 s ceiling, and kept at SR-014.

## Known Risks

- **FU-035** stays open until a live run shows the cause (a later round).
- **FU-021:** the watcher test still fails on a loaded macOS, now as ENVIRONMENT or INCONCLUSIVE. Whether it passes
  where the OS delivers events is API/E2E's Linux proof.
- **M-6 cold:** not strictly cold, because there is no sudo for `purge`. IMP-005 has a first pass of 13.0 s and a warm
  one of 10.5 s over 7523 files / 8.67 GB.
- **E2E tests and probes touched for text changes, not run by me** (API/E2E):
  - `delegated-launch-config-defaults.e2e` and `collaboration-prompt-wording.e2e`;
  - `agent-initiated-collaborators.e2e`;
  - `delegated-launch-defaults-probe.mjs`, `composer-context-file-removal-probe.mjs` and
    `skill-improvement-removal-cases.mjs`;
  - the contract fixture `contract-states.json`, including whether the story binder maps the run id inside the refusal
    text.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: clean-cut renames and removal of hosting-era behavior; explicit composition; one migration.
- Reviewed root-cause classification: as in the design spec (naming drift; silent process lookups; FU-021 OS event loss per SR-013).
- Reviewed refactor decision: `Refactor Needed Now` for the composition owners (FU-011 / FU-018). Other owners are
  deferred as FU-500-02.
- Implementation matched the reviewed assessment: `Yes`. FU-021's classification premise was challenged and revised at SR-014.
- If challenged, routed as `Design Impact`: `Yes` (FU-021 → SR-014 / D-13b).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The old attachment link shape is converted by the isolated
  migration only, with no old-shape reader in current code.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes`. That covers the N6 collaboration-directory helpers, the
  host-scoped owner kind and route, `DelegatedChildLocations`, the MCP catalog / executor singletons, and the
  `findProcessRemoteRunChannel` users.
- Dead code found elsewhere, added to `follow-ups.md`: None new. FU-500-02 (remaining throwing process getters) was the
  designer's. Naming leftovers in comments: FU-500-08 (IR-002).
- Shared structures remain tight: `Yes`.
- Canonical shared design guidance reapplied: `Yes`.
- Deviations from a design principle: `None`.
- Source files and the 500-line limit: `Yes`. Against the merge base `9695d310c5`, no changed source file is over 500
  effective non-empty lines.
  - `build-studio-server.ts` had gone to 511 and `configured-agent-execution-handle.ts` to 507. They are now 498 and 500
    (`1eed3c4aff`).
  - No change grew a file that was already over 500.
  - **Recounted against the merged base `ff13782f36` (IR-005):** no changed source file is over 500. The closest are
    `configured-agent-execution-handle.ts` (493 → 499), `autobyteus-agent-run-backend-factory.ts` (489 → 496) and
    `build-studio-server.ts` (492 → 485). After the merge the studio file had 502 (448 added 4, this ticket 10), and
    IR-004's handoff missed it (CR-500-007).

## Persisted Data Transition Check

- Decision: `Migration Required` (FU-020, D-8), implemented in the isolated migration folder:
  - frozen helpers only, with no old-shape reader in current code;
  - a backup per file before any rewrite (the founder's rule).
- **Not run on the founder's data** (only the read-only M-6 scan).
- G-2: same-ID repair of a released migration (guideline §7), using the frozen store only.
- Browser storage check (Naming): `'transient_execution'` is not persisted, so there is no client migration.
  - localStorage holds only fixed keys.
  - The mobile route holds a server row key.
- N6: nothing writes or reads `agents/{run}/collaboration/` in current code. Removed, so FU-500-03 closes as not needed.
- G-5: reads only, nothing stored.

## Environment Or Dependency Notes

- macOS Darwin 25.5.0, 10 cores, Node v22, pnpm workspace. The load average was 60–200 throughout from other worktrees'
  suites (`shell-command-time-limits-483`, a background worktree), with `fseventsd` at about 150% CPU. This affected
  FU-021 and Grok discovery.
- Provider keys: only `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` was set. Grok Build uses the host CLI's own login;
  no keys were read from `.env` or the environment.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `d8ffc77c8b` | macOS, Node 22 | server src + tests | all | Pass | console | "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)" |
| IMP-02 | `node autobyteus-web/scripts/typecheck.mjs` from a fresh `.nuxt` | `18f9b0c038`; G-5 web re-checked at `8e2d3b76c0` | macOS | web | FU-023, G-5 | Pass | `IMP-006-web-typecheck-fresh-nuxt.log` | "production errors: 0; test-file errors: 87 in 37 files" |
| IMP-03 | `cd autobyteus-server-ts && npx vitest run tests/unit tests/agent-work-journal` | `4277f1945e`; the one product failure re-run at `d8ffc77c8b` | macOS, load 70–90 | all server units | all | Pass, except the folder-watcher timing case (untouched by this ticket) | console | "Tests 6 failed \| 7548 passed \| 9 skipped (7563)": 5 in `agent-package-folder-watcher.test.ts` (FSEvents timing, file unchanged since the merge base), 1 in `available-agent-runtimes-dependencies.test.ts` (fixed in `d8ffc77c8b`; then `tests/unit/available-agent-runtimes tests/unit/llm-management`: "Tests 144 passed (144)") |
| IMP-04 | `cd autobyteus-web && npx vitest run` | `4277f1945e` | macOS | all web units | names, G-5 | Pass | console | "Test Files 755 passed (755)"; "Tests 5675 passed \| 2 skipped (5677)" |
| IMP-05 | M-6 read-only first-start scan | branch head 10:01 | the founder's data, read-only | migration folder listing + pre-check | B-3 | Done | `IMP-005-m6-first-start-scan.md` / `.mts` | 7523 files, 8.67 GB, 13.0 s / 10.5 s, 155 candidates |
| IMP-06 | focused server runs after the size fix: `tests/unit/{agent-collaboration,agent-execution,compositions,llm-management,standalone-agent-run-root}`, `tests/architecture`, two integration files | `1eed3c4aff` | macOS | G-5 both paths, compositions | G-5, B-6, B-7 | Pass | console | "Test Files 259 passed \| 4 skipped (263)"; "Tests 2498 passed \| 6 skipped" |
| IMP-07 | `pnpm migrations:record-released` with a reordered record | `d4b632e61b` | macOS | G-1 recorder | G-1 | Pass (refuses) | `IMP-007-record-released-order-refusal.log` | exit 1, nothing written |
| IMP-08 | watcher test before SR-013 (60 s and 180 s guards) | `fb52bd332c` | macOS, load 55–70 | FU-021 | FU-021 | Fail (led to SR-013) | `IMP-008-*.log` | no event for over 3 minutes |
| IMP-09 | `python3 -m unittest discover -s scripts/tests` | `d4b632e61b` | macOS | release scripts | G-1 | Pass | console | "Ran 228 tests … OK (skipped=3)" |
| IMP-10 | focused runs per step (stream not-ready, migration, team index repair, compositions, collaboration texts, G-5 offer) | each step | macOS | as named | B-5, B-3, G-2, B-9, G-5 | Pass | console | `run-stream-not-ready` 9/9; attachment-links 8/8; team-index 4/4; `stored-model-offer` 5/5 |
| IMP-11 | FU-035 live probe (`RUN_GROK_E2E=1`, vault set) | `6b4ee1f128` | grok 1.0.88, grok-4.7 | Grok projection + executor | B-10 / AC-007 | **Blocked** (usage limit) | `IMP-011-fu035-grok-live-attempt.log`, `IMP-011-fu035-grok-refused-tool-probe.e2e.test.ts.txt` | "subscription:free-usage-exhausted … 609708/600000" |
| IMP-12 | watcher test, 3 runs, plus the `__pycache__` case alone ×3 | `4277f1945e` | macOS, load 67–118 | FU-021 test + probe | FU-021 / AC-005 | Fail (led to SR-014) | `IMP-012-watcher-three-runs-ambient-load.log`, `IMP-012-watcher-run-{1,2,3}.full.log` | "env=1 product=4", "env=3 product=3", "env=2 product=5"; "other=0" |
| IMP-14 | IR-002: `pnpm -C autobyteus-server-ts typecheck`; units over `tests/unit/{agent-collaboration,remote-collaboration,agent-team-execution,standalone-agent-run-root,agent-tools,services,agent-execution,projects,available-agent-runtimes}` and `tests/architecture` | `7eb6f94b9f` | macOS, Node 22 | the renamed delegation types and their readers | AC-001 (N3), CR-500-001/002 | Pass | console | "production errors: 0; test-file errors: 1010 in 316 files"; "Tests 3737 passed \| 6 skipped (3743)" |
| IMP-16 | IR-003: `pnpm -C autobyteus-server-ts typecheck` | `7eb78a701b` | macOS, Node 22 | server src + tests | G-5 R1–R3 | Pass | console | "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)" |
| IMP-17 | IR-003: `npx vitest run tests/unit/llm-management/on-demand-stored-model.test.ts` (LM Studio, Ollama, a custom endpoint: present after a load, loaded but missing, host down, two Ollama hosts with the model's down (AR-003), failed source, unconfigured host, removed endpoint, the 8 s budget, static/external unchanged; R2 skip) | `7eb78a701b` | macOS | `ModelAvailabilityService` + `RunModelSelectionService` (real), `storedModelStartRefusal`, `listOptions` | AC-012, CR-500-003/004 | Pass | console | 14 tests ✓ |
| IMP-18 | IR-003: server units `tests/unit tests/agent-work-journal` | `7eb78a701b` (host mocks fixed after the run, rerun Pass) | macOS, load high | all server units | all | Pass, except as noted | console | "Tests 19 failed \| 7551 passed": 14 in `standalone-application-host/*` (mocks lacked `loadOnDemandModel`; fixed, then "Tests 28 passed (28)"); 3 folder-watcher timing (untouched); `project-store-task-keys` (passes alone; timing); 1 in `team-stream-clients-wait-for-connected.test.ts` that names API/E2E's `tests/e2e/agent/run-stream-early-command.e2e.test.ts` (`c0770ea7b0`), see the note below |
| IMP-19 | IR-003: integration `tests/integration/{agent-execution,agent-collaboration,run-history,agent-team-execution,collaboration-definition-admission}` + `tests/architecture` | `7eb78a701b` | macOS | both start paths' wiring | G-5 | Pass | console | "Test Files 34 passed \| 4 skipped (38)"; "Tests 183 passed \| 35 skipped (218)" |
| IMP-15 | IR-003: DLP-005 e2e (scripted AGY), `-t "inherited layer"` | `7eb78a701b` | macOS, scripted AGY CLI | the inherited-layer refusal through the real server | CR-500-005, AC-006 | Pass | `IMP-015-dlp005-inherited-refusal-e2e.log` | "Tests 1 passed \| 2 skipped (3)" |
| IMP-20 | IR-004 on the merged state: server and web type gates; restart-resume tests; `npx vitest run tests/unit tests/agent-work-journal tests/app-data-migrations tests/architecture` (server); `npx vitest run` (web) | `bfeea63612` | macOS, load 126–150 | everything, with the base | all | Pass, except timeouts under load | `IMP-020-merged-state-checks.log` | server type gate "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)"; web type gate "production errors: 0; test-file errors: 87 in 37 files"; restart-resume 58/58; server "Tests 14 failed \| 8322 passed", all timeouts or folder-watcher timing, the rest pass rerun (with 60 s timeouts for three); web "Tests 2 failed \| 5730 passed", two 5 s timeouts, 3/3 alone |
| IMP-21 | IR-005: `pnpm -C autobyteus-server-ts typecheck`; `npx vitest run --testTimeout=60000 tests/architecture tests/unit/compositions <restart-resume tests> tests/unit/application-platform tests/unit/application-packages tests/unit/llm-management`; size recount against `ff13782f36` | `eb741a097e` | macOS | the studio composition | CR-500-007 | Pass | console | "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)"; "Test Files 57 passed (57)", "Tests 378 passed (378)"; `build-studio-server.ts` 485 |
| IMP-22 | IR-006 on the merged state: server and web type gates; `npx vitest run --testTimeout=60000 --hookTimeout=60000 tests/unit tests/agent-work-journal tests/app-data-migrations tests/architecture tests/integration` (server); `npx vitest run` (web); size recount against `0570c47fd9` | `4db98c6d1a` | macOS, load 27–55 | everything, with the base | all | Pass, except watcher timing | `IMP-022-third-merge-checks.log` | server type gate "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010 in 316 files)"; web type gate 87 in 37 = baseline; server "Tests 7 failed \| 8876 passed": `file-system-watcher` 1 ENVIRONMENT + 4 INCONCLUSIVE (D-13b) and the two untouched folder watchers; web "Tests 5767 passed"; no changed source file over 500 (studio 492) |
| IMP-23 | IR-007 on the merged state: server and web type gates; `npx vitest run --testTimeout=60000 --hookTimeout=60000 tests/unit tests/agent-work-journal tests/app-data-migrations tests/architecture tests/integration` (server); restart-resume, compositions and package-auto-refresh rerun; a raw `fs.watch` probe; `npx vitest run` (web); size recount against `24d438fa31` | `eecb228bd6` | macOS, load 80–158 | everything, with the base | all | Pass, except file-event tests while the OS delivered no events | `IMP-023-fourth-merge-checks.log` | server type gate "production errors: 0; test-file errors: 1010 in 316 files (baseline …)"; web 87 in 37; server "Tests 16 failed \| 8880 passed", all file-event waits (file-system-watcher 4 ENVIRONMENT + 5 INCONCLUSIVE, folder watcher, package-auto-refresh); raw probe "[7889,3925,null,null,null]"; restart-resume and compositions pass; web "Tests 5776 passed"; studio 428 |
| IMP-24 | IR-008 AC-005 gate: Docker `node:22-bookworm` Linux, git archive of `bb42531c7d`, frozen install, `test:integration:prepare`, the watcher file ×5 | `bb42531c7d` | Linux 6.12 linuxkit aarch64, 10 vCPU | FU-021 test after the merge | AC-005 | Pass | `IMP-024-watcher-linux-5of5.log`, `IMP-024-watcher-linux-run{1..5}.log` | "Tests 14 passed (14)" ×5; labels=0 ×5 |
| IMP-25 | IR-008 Mac: server and web type gates; `tests/unit tests/agent-work-journal tests/architecture` + restart-resume; the watcher file once (evidence only) | `bb42531c7d` | macOS, load 34–137 | everything, with the base | all | Pass, except the untouched folder watcher | `IMP-025-seventh-merge-mac-checks.log` | type gates at baseline; "Tests 3 failed \| 7769 passed", 3 in `agent-package-folder-watcher`; watcher file: 8 ENVIRONMENT + 2 INCONCLUSIVE, none unlabelled |
| IMP-26 | IR-009 on the merged state: both type gates (baseline shrunk by 1); `npx vitest run --testTimeout=60000 --hookTimeout=60000 tests/unit tests/agent-work-journal tests/app-data-migrations tests/architecture tests/integration tests/release` (server); `npx vitest run` (web); size recount against `53b72018ad` | `5eb8246076` (+ `8e8c21c2c4`) | macOS, load 59–98 | everything with 491 / 492 | all | Pass, except file-event waits | `IMP-026-eighth-merge-checks.log` | server type gate "production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)"; web 87 in 37; server "Tests 10 failed \| 8937 passed": 1 this ticket's registration test (fixed, 8/8), the rest OS file events (watcher 1 ENVIRONMENT + 6 INCONCLUSIVE); web "Tests 5780 passed" |
| IMP-13 | watcher test after the D-13b labels, 1 run | `a4e7f18e6d` | macOS, load 120–190 | FU-021 labels | FU-021 / D-13b | Fails as designed under load: labels only | `IMP-013-watcher-sr014-labels.log`, `IMP-013-watcher-sr014.full.log` | "env=1 inconclusive=6 other=0"; no "Timed out waiting for event (hang guard)" line |

- Note for API/E2E (IMP-18): `tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts` fails on API/E2E's
  FU-036 test `tests/e2e/agent/run-stream-early-command.e2e.test.ts` ("opens a Team or Org stream and sends a command
  without waiting for CONNECTED"), which sends early on purpose. That guard needs an exemption for this file, or the
  test needs another shape. It's API/E2E's test code, so I left it.
- Not run, and why:
  - E2E suites and browser probes are left to API/E2E (see Known Risks).
  - `pnpm release:test --ref <branch>` (FU-023, rule 12) is the Delivery Engineer's before the merge.
  - The migration has not been run on the founder's data (it needs his approval).

## Frontend Rendered-Result Check

- **Affected surfaces:** the run Settings panel (existing run). G-5's per-member note reuses the root card's existing
  note, `RunSettingsCard` `data-test="run-setting-model-unavailable"`, which is unchanged markup. It is now passed per
  member (`RunMemberRow` → `RunSubjectCard` → `RunSettingsCard`).
  - The other web changes are names (no visual change), the removed attachment routes, and refusal texts.
- **References:** the run-settings UI/UX spec; design-spec G-5.
- **Inspected:** a unit mount (`RunMemberRow.runtime.spec.ts`). The member card gets `modelUnavailable=true` only for
  its own key.
- **Rendered in a browser: not done.**
  - `existing-run-model-config-probe.mjs` (the Nuxt fixture page) has no not-offered state.
  - Starting a Nuxt dev server at load 100+ would also have added FSEvents load during the watcher runs.
  - Remaining uncertainty: low. It is the same paragraph and styling as the root card's note, which is already shown
    today.
  - Suggested downstream: a not-offered member case in that probe.

## Downstream Coverage Hints / Suggested Scenarios

- **G-5:**
  - A team whose member's saved model is gone: the Settings member row shows the note; sending a message gives the
    `RUN_MODEL_NOT_OFFERED` text and starts no runtime.
  - A standalone restore behaves the same way.
  - An unreadable list (CLI signed out) proceeds as today.
- **FU-020:** the migration on a copy of real data (backups written, links converted, attachments open), and a second
  start that changes nothing.
- **FU-036:** a command sent to an org or collaboration stream before it is ready gets `SESSION_NOT_READY`.
- **FU-030:** the e2e and probe text assertions listed in Known Risks.
- **FU-021 (AC-005, D-13b), required:** after `pnpm test:integration:prepare`, run
  `tests/integration/file-explorer/file-system-watcher.integration.test.ts` 5 of 5 on Linux (inotify) in a Docker
  container from the worktree, and on a quiet macOS when one is available. A failure there is labelled ENVIRONMENT or
  INCONCLUSIVE only when the OS dropped events; loaded-macOS runs (IMP-012, IMP-013) are evidence only.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The live and real-stack journeys above, and the e2e suites and probes whose texts changed.
- **AC-005's watcher proof** (D-13b): 5 of 5 on Linux inotify (Docker from the worktree) and a quiet macOS when available.
- FU-035 is not part of this package: a later round (D-14) brings it with its own code review.
