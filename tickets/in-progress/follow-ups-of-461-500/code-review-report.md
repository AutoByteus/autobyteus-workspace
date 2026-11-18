# Code Review Report: follow-ups-of-461-500 (autobyteus-500)

The latest result is round 9, **CRR-017: Pass** (IR-009, the eighth base refresh, `53b72018ad`: 491 and 492). It comes first, then round 8 (CRR-015) and the earlier rounds. The test reviews CRR-005, CRR-006, CRR-009, CRR-012, CRR-014 and CRR-016 are in `api-e2e-test-review-report.md`.

## Round 9: Merge Review Of IR-009, The Base `53b72018ad` (CRR-017)

- **Scope:**
  - `Targeted Delta Review` of the merge `5eb8246076` (parents `04d44b5cd0` and `53b72018ad`; `origin/personal` is the second parent) and `8e8c21c2c4`.
  - 18 conflicts; `git show --remerge-diff` lists 31 files.
  - The merge commit was amended before any push, to include unstaged resolution edits. The implementer diffed the rebuilt tree against the old tip plus those edits, and the type gate passes on the committed state.
- **1. Migration order: correct.**
  - 491's `20261118_remove_retired_built_in_agents` is unreleased: the commit that adds it (`25a7ad3940`) is in no tag. The newest tag is still v1.5.13, which shipped beta.7's 45 migrations.
  - So `released-migration-order.json` is unchanged, and the registry is: the 45 released IDs, then this ticket's two `20261117` migrations, then 491's `20261118`. That is append-only and in date order, so the order test's rules hold.
  - **No interaction:** this ticket's migrations rewrite only raw-trace files under `memory/`, and 491's deletes two definition folders under `agents/` and keeps their runs, so neither is the other's late predecessor. The registry comment says so.
  - **Tests:** the three 461-era order tests list all three; `8e8c21c2c4` makes this ticket's registration test assert that the pair sits right after the last 461 migration, with only 491's after it.
- **2. 492's DEC-001 supersedes FU-030's SIR-001: correct to take 492's side.**
  - Runs no Task relates are now delivered while the receiver runs (`deliverUnrelated`), so this ticket's refusal text `otherTaskRefusal` and its router branch are gone.
  - `cross-run-message-delivery.ts`, `global-agent-run-message-router.ts`, their tests, `result-catalogue`, `contract-states.json` and `collaboration-prompt-wording.e2e` take the base's side.
  - **Docs alignment for the Solution Designer and delivery at closure:** the FU-030 table's SIR-001 row (handoff, `requirements-doc.md` D-4 / AC-004 scope) no longer applies. It is superseded by 492's DEC-001, not a regression.
- **3. 492's running agents, with this ticket's names (N2) and owners (FU-011): correct.**
  - `RunningAgents` reads `RunAgentAccess.runAgentStatuses` / `RunAgentStatusEntry`. `remote-message-receiver`, the remote composition and `standalone-root-message-delivery` use `runAgents`, `isRunAgent` and `agentIdentity()`, with 492's `liveRoot`.
  - **`list_running_agents`** had used `findProcessPeerDiscoveryChannel()`, which FU-011 removed. It now takes the host's `PeerDiscoveryAccess` like the other two discovery tools:
    - `listRunningAgentsFor(context, args, discovery, { listing? })`;
    - the native tool through `boundPeerDiscovery` (which refuses an unbound tool before reading the binding);
    - `ListRunningAgentsMcpAdapterProvider(peerDiscovery)` from the default providers and the tool resolver;
    - `REMOTE_COLLABORATION_OFF_DISCOVERY.listRunningAgents` answers the "off" refusal.
  - The local listing (`getProcessRunningAgentsListing()`) is a process getter that throws when uncomposed, FU-500-02's kind and not a silent lookup.
  - `build-studio-server.ts` keeps 492's `running` with this ticket's `remote.channel`; it is at 434 lines.
- **4. Others: correct.**
  - The web `skill-improvement-removal-cases.mjs` takes the base's released-shape sessions plus this ticket's derived-files exclusion.
  - `typecheck-baseline.json` (server 1010 → 1006): against the branch's last head, nothing is raised. Against the base, the one "added" entry is this ticket's renamed `run-agent-access.test.ts`, which carries the base's paired test's 2 errors.
- **Names:** no renamed or removed name comes back (PairedAgent\*, transient\*, `ensureHostReady`, `findProcess*Channel`, `OTHER_TASK_REFUSAL`, `isHost(`, `Copy*`).
- **Sizes against `53b72018ad`:** the member handle 500 (at the limit), the AutoByteus backend factory 496, the studio 434.
- **Checks:** I didn't rerun IMP-026.
  - Type gates at their baselines (server 1006 in 315; web 87 in 37).
  - Server 8937 passed. The nine remaining failures are OS file-event waits with their labels; the registration test is fixed (8/8).
  - Web: 5780 passed.
- **Findings:** none.
- **Routing:** `Pass`, to `/api_e2e_engineer` for the round delivery asked for: messaging (492's unrelated-run delivery and `list_running_agents`, local, peer and with remote off) and the migration order (all three new migrations on one first start, and the order test), then the test review, then delivery.

---

## Round 8: Merge Review Of IR-008, The Base `75048cbaf4` (CRR-015)

- **Scope:** `Targeted Delta Review` of the merge `bb42531c7d` (parents `50faf1c629` and `75048cbaf4`). The base adds the v1.5.13 release records and 517's FU-002 / FU-003 (shared OS-latency limits for tests). Delivery's earlier clean merge (`f5a7d789c9`) needed no resolution.
- **Released order:**
  - `src/app-data-migrations` is identical between beta.7's base `9695d310c5` and `75048cbaf4`, which holds the tag `v1.5.13`. So v1.5.13 shipped beta.7's 45 migrations, and `released-migration-order.json` still records the released list.
  - G-1's recorder isn't on personal yet, which is why those releases didn't write it.
- **Remerge diff:** only `file-system-watcher.integration.test.ts` (one conflict, 19 hunks) and `TESTING.md`.
- **The watcher test: a deliberate combination, correct.**
  - **500's structure stays:** outcome waits under one guard per test (`guardEndsAt`), the sentinel "no event" checks (11 uses), and the raw `fs.watch` probe's ENVIRONMENT / INCONCLUSIVE labels. AC-005 rests on these.
  - 517's quiet windows aren't taken. No 800 ms or quiet-window wait remains; the sentinel proves "no event" without one.
  - **517's shared limits set the numbers,** as its `TESTING.md` rule requires: the guard is `OS_FILE_EVENT_WAIT_MS` (30 s); all 14 tests take `{ timeout: FILE_EVENT_TEST_TIMEOUT_MS + ENVIRONMENT_PROBE_MS }` (55 s), so the probe still labels before the test times out; the start and close hooks take `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS`.
  - **Deviation, and its reason holds:** the guard is 30 s rather than SR-013's 60 s. The project's newer test rule (517, `TESTING.md`) sets it, and no wait got longer (SR-013's "no longer waits").
    - What changes is that an event arriving after 30 s is labelled rather than awaited. AC-005's proof stays "5/5 where the OS delivers events", and Linux shows events in milliseconds.
    - **For the Solution Designer at closure:** `design-spec.md`'s FU-021 text ("the guard stays at 60 s") should name the project limit. That's documentation alignment, not a design question.
- **`TESTING.md`:** the busy-Mac rule now names the sentinel alternative next to the quiet window, says what ENVIRONMENT and INCONCLUSIVE mean ("neither is a product verdict"), and gives the proof ("a run where the OS delivers events, such as Linux in a container from the worktree"). Accurate, and the right place for it.
- **Evidence:**
  - IMP-024, AC-005 on the merged commit: Docker `node:22-bookworm`, Linux 6.12 aarch64, a `git archive` of the commit, a frozen install, `test:integration:prepare`, then 5 runs. Each was "Tests 14 passed (14)" with 0 labels.
  - IMP-025, on the Mac: type gates at baseline; units 7769 passed, with 3 failures in the untouched package-folder watcher. The loaded-Mac watcher runs were all labelled, none unlabelled (evidence only).
- **For delivery:** `origin/personal` has moved again since this merge (`be11a62449`).
- **Findings:** none.
- **Routing:** `Pass`, to `/api_e2e_engineer` for its Linux watcher run on the merged state, then the test review, then delivery.

---

## Round 7: Merge Review Of IR-007, The Base `24d438fa31` (CRR-013)

- **Scope:** `Targeted Delta Review` of the merge `eecb228bd6` (parents `92780698b9` and `24d438fa31`, no rebase). The base adds v1.5.13-beta.10, 517, 524 round 2 and 526.
- **Released order:**
  - `src/app-data-migrations` is identical between beta.7's base `9695d310c5` and the tag `v1.5.13-beta.10`, so beta.8 … beta.10 shipped no migration;
  - `released-migration-order.json` (45 IDs) is still the released list;
  - the base adds no migration.
- **Remerge diff:** only the two conflict files.
  - **`restart-resumer.ts`:** 526's whole-message observer, `restartNoticeLifecycleObserver(…, message)`, whose signature takes `Pick<AgentInputUserMessage, "content" | "metadata">` (`restart-notice.ts:88-91`), with this ticket's `readyAgent`. Correct.
  - **`build-studio-server.ts`:** two removals shown as one hunk, and both stay removed.
    - 524 moved `closeStudioProcessResources` to `studio-process-resources.ts`, and that file is identical to the base (`git diff 24d438fa31 HEAD` is empty);
    - this ticket's `createStudioPackageServices` stays moved;
    - 524's `stopStudioFileWatchesForProcessExit` came in through the auto-merge;
    - none of the lookups this ticket removed reappear in either file.
    - The stray `};` the type gate caught was amended into the merge.
- **Sizes against `24d438fa31`:** the member handle 500 (the base has 494; at the limit, not over), the AutoByteus backend factory 496, the studio 428.
- **Checks:** I didn't rerun IMP-023, which ran on the merged tree.
  - Type gates at their baselines; web 5776 passed.
  - Server 8880 passed. The 16 failures are file-event waits, and the implementer's raw `fs.watch` probe got no event in 3 of 5 tries. package-auto-refresh is base code, unchanged.
- **For delivery:** `origin/personal` has moved again since this merge (`0ce426bc9f`, 534's phone text size), so whether to refresh once more is delivery's call.
- **Findings:** none.
- **Routing:** `Pass`, to `/api_e2e_engineer`: a built server's stop (524's moved close and file-watch stop) and restart resume with its notice (526's message), then the test review, then delivery.

---

## API/E2E Failure-Origin Review Of API-REV-004, F-4 (CRR-011)

- **Failing scenario:** `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` OT-2, "reading the trees wrote nothing" (`:247`), and OT-3, which needs OT-2's run.
- **Code:** the third merged state `44fec882bc` (merge `e93671cce0`). API/E2E saw the branch fail on the Mac and in Linux, and base `0570c47fd9` pass once (Mac alone).
- **My method:** a temporary probe copy of the file, untracked and removed afterwards. It logged `memory/episodic/` before OT-2's start and after its reads, and ran once on each worktree at load around 100.
  - **Branch:** before, only `episodic/index.md`; after, `index.md` changed and `ot-writer`, `ot-researcher`, `ot-manager` and `ot-checker` `catalog.md` are new.
  - **Base `0570c47fd9`:** exactly the same, with the same two failures: "reading the trees wrote nothing: expected { …(122) } to deeply equal { …(118) }", then OT-3's "the temporary Task's record: expected '' to be truthy". A first base attempt failed earlier, in OT-1, on an AGY discovery timeout from the load.
- **Cause, from the code** (`agent-episodic-catalog/services/episodic-catalog.ts`, 493, unchanged by this merge):
  - every server start runs `startPass` (a full discovery, writing the catalogs);
  - between starts, a journal change asks for a refresh 5 s later (at most 30 s);
  - `stop()` drops a pending refresh.
  - OT-1 creates its runs and stops its server; when it stops before a refresh has run, which depends on timing and load, the runs' catalogs aren't written until OT-2's start, inside OT-2's "a read writes nothing" window.
  - That is 493's designed behavior: the catalog is derived data, rebuilt at start. The test's fingerprint covers all of `memory/`, derived catalogs included.
- **Not caused by this ticket:** the branch and base behave the same under load. The catalog's wiring is the same on both sides (API/E2E checked), and discovery (`run-folder-discovery.ts`) is unchanged by the merge. The branch reproduced more readily, probably from timing (G-5's check adds a read at activation), but the failure mechanism is base's.
- **Classification: test-side, and also present on base.**
  - The required change matches the one API/E2E already made for SIR-002 in this round: OT-2's fingerprint leaves out `memory/episodic/` (derived, rewritten at start), as it would the run history index. That applies at `:247` and at the later `after` fingerprint (`:292`) if it compares beyond the own files.
  - It is a small fix to a test in this ticket's gate, so do it here. Record the base-side flakiness (it fails on `0570c47fd9` under load) as a follow-up for 493's area.
- **This round's test changes (`696acc408c`) are sound:**
  - TS-009 drives a real scripted background step in an Org run, asserts both rows ("Background task running", the active dot that doesn't pulse) and their return to Idle, and keeps details on failure;
  - SIR-002 leaves out the derived `memory/episodic/` with its reason.
  - They'll be finalized in the test review after the round passes.
- **Routing:** to `/api_e2e_engineer`: fix OT-2's fingerprint, rerun OT-1 … OT-3, then the proportional test-code review, then delivery. Source is unaffected; CRR-010 stands.

---

## Round 6: Merge Review Of IR-006, The Base `0570c47fd9` (CRR-010)

- **Scope:** `Targeted Delta Review` of the merge `e93671cce0` (parents `0af5a64677` and `0570c47fd9`, no rebase; `origin/personal` is an ancestor) and `4db98c6d1a`.
- **Method:** `git show --remerge-diff e93671cce0` shows 17 files beyond git's automatic merge, which are the 13 conflicts and their renames. The base (522, 524, 448 part 2, 493, 525) adds no app-data migration and no release, so the released order stays beta.7's.
- **Resolutions: correct.** Each keeps both sides.
  - **448 part 2's background-task count goes into 500's run-agent names (N2).**
    - `RunAgentStatusEntry` gains `backgroundTasksRunning`.
    - `runAgentStatusFrame(status, backgroundTasksRunning)` writes it.
    - The base's new `peer-run-calls.ts` and `remote-run-observation.ts` use `RunAgentStatusEntry`.
    - `TeamRunAgentAccess` sends `("offline", 0)` on idle shutdown.
    - `RemoteRunViewProvider` passes `live?.backgroundTasksRunning ?? 0`.
    - `run-status-service.ts` keeps 448's `answerOfFrame` / `answerOf(status, count)` with 500's `observeRunAgents` / `runAgentStatuses`. I read the merged lines; they match the base's logic.
  - **The modify/delete:** `standalone-paired-agent-access.ts` stays deleted, and 448's change (the run's `background_tasks_running` in its status entry) is applied in `standalone-run-agent-access.ts`.
  - **Web:** `AgentOrgRunMemberTree.vue` keeps 448's `backgroundTasksRunning` on both rows with 500's `delegatedRun: null`. 448's new `WorkspaceRowsBackgroundTasks.spec.ts` follows N5.
  - **493:**
    - `agent-memory-layout.ts` keeps 493's `definitionFolderName`. `AGENT_RUN_COLLABORATION_DIR_NAME` stays removed (N6); nothing outside the frozen layout reads it.
    - `build-studio-server.ts` keeps 493's `episodicCatalog` with this ticket's `remote.channel`. The process lookup this ticket removed doesn't come back.
- **`4db98c6d1a`: correct.** 493 made `episodicCatalog` a required supervisor input, so the FU-011 test's complete input includes it.
- **Names:** the implementer's grep (PairedAgent\*, transient\*, host names, `execution_tree.host`) finds nothing outside frozen code.
- **Sizes against `0570c47fd9`:**
  - `build-studio-server.ts` 492;
  - `configured-agent-execution-handle.ts` 500, at the limit and not over;
  - the AutoByteus backend factory 496.
  - The member handle's next change needs a split. That is already recorded as a residual risk.
- **Checks:** I didn't rerun IMP-022, which ran on `4db98c6d1a`.
  - Type gates at their baselines.
  - Server units, work journal, app-data migrations, architecture and integration: 8876 passed. The 7 failures are watcher timing, with the D-13b labels.
  - Web: 5767 passed.
- **Findings:** none.
- **Routing:** `Pass`, to `/api_e2e_engineer` for round 4 on the merged state (requested by delivery), then the test review, then delivery.

---

## Round 5: Recheck Of IR-005 (CRR-008)

- **Scope:** `Targeted Delta Review` of `a462aa6fe7..460b12a673`. The code is `eb741a097e`.
- **CR-500-007: Resolved.**
  - `createStudioPackageServices` moves unchanged to `compositions/studio-package-services.ts`, with the six imports only it used. Every removed line appears unchanged in the new file.
  - `build-studio-server.ts` is at 485 effective lines.
  - The package registry and bundle services are a coherent concern of their own.
- **Why that function and not this ticket's wiring:** this ticket's own wiring (`createStudioApplicationServices`, with the remote and G-5 inputs) can't move. The architecture tests require `buildApplicationPlatformRuntime({` in `build-studio-server.ts`. So a split of another owned concern is the right response under the size rule ("a split only if that is not possible").
- **Recount against `ff13782f36`:** no changed source file is over 500. The member handle is at 499, the AutoByteus backend factory at 496 and the studio composition at 485.
- **Checks:** I didn't rerun them; they ran on `eb741a097e`.
  - Type gate: production 0, tests at the 1010 baseline.
  - Architecture, compositions, restart resume, application platform, application packages and llm-management: 378/378.
- **Scorecard:** as round 3, with SoC & File Placement back to 9.3. Overall 9.4.
- **Findings:** none open.
- **Routing:** `Pass`. The package was already through API/E2E (API-REV-002) and the test review (CRR-006), and this round is the delivery base refresh, so it goes back to `/delivery_engineer`. Delivery runs the merged state's checks (`pnpm release:test --ref <branch>`, and the e2e suites as delivery and API/E2E decide).

---

## Round 4: Merge Review Of IR-004, The Base `ff13782f36` (CRR-007)

- **Scope:** `Targeted Delta Review` of `642737b97a..a462aa6fe7`:
  - the merge `39325a1e50` (parents `2f8a463a11` and `ff13782f36`, no rebase; `origin/personal` is an ancestor);
  - `bfeea63612`, a test fix.
- **Method:** `git show --remerge-diff 39325a1e50` shows only the four conflict files beyond git's automatic merge. `git diff 9695d310c5 ff13782f36` covers the base's changes (beta.8 and beta.9, plus 448 part 1, 483, 458, 514, 515 and 508).
- **The conflict resolutions: correct.**
  - `restart-notice.ts` and `restart_resume.md`: 448's wording ("The wake after an update", claim and settle) with 500's names ("a run's own agent", `ensureAgentReady` / `postAgentUserMessage`).
  - `restart-resumer.ts`: 448's comment with 500's `readyAgent` / `ensureAgentReady`. 448's claim and settle flow below it auto-merged on `readyAgent`.
  - `claude-live-agent-harness.ts`: both imports.
- **The base against this ticket:**
  - No app-data migration in the base (`src/app-data-migrations` is unchanged between the two bases), so `released-migration-order.json` (beta.7) stays the released list.
  - No name this ticket removed comes back: the completion grep over server source and the hosting names finds nothing.
  - 515's tool search finds and calls the tools the agent already holds, so the discovery tools are still built by 500's resolver with the host's `PeerDiscoveryAccess`.
  - 508's `run-file-conversion` rewrites launch fields, not traces, so FU-020's migrations don't interact with it, as the handoff shows.
- **`bfeea63612`: correct.** Three 461-era registration-order tests list the exact IDs after them, and FU-020's two migrations are now among them. They had failed since `a954ae5300`, because IR-001's runs didn't include `tests/app-data-migrations`. That was the implementation's coverage gap, now closed.
- **CR-500-007 (Local Fix): `build-studio-server.ts` is over 500 lines on the merged base.**
  - It has 502 effective lines. The new base has 492; this ticket adds 10; 448 grew the base from 488 to 492.
  - The rule: the change takes the file over 500 on the base it merges into, so the excess is this ticket's.
  - The handoff's size line ("498") predates the merge.
  - **Required:** move part of this ticket's wiring into an owned file, for example the G-5 or `storedModelChecks` assembly, or more of the remote binding's use, into `remote-collaboration-composition.ts` or a G-5 composition helper. Don't compress lines. Then recount every changed file against `ff13782f36`. The member handle is at 499 and the AutoByteus backend factory at 496, both under the limit.
- **Checks:** I didn't rerun IMP-020, which ran on the merged tree.
  - Type gates: server production 0 and tests at 1010; web at its baseline.
  - Restart resume: 58/58.
  - Server units, work journal, app-data migrations and architecture: 8322 passed. Fourteen load timeouts, the non-watcher ones pass on rerun.
  - Web: 5730 passed, with two load timeouts that pass alone.
- **Findings:** CR-500-007.
- **Routing:** `Fail`, Local Fix, to `/implementation_engineer`. After the move, a quick recheck here. Then delivery's merged-state checks (`pnpm release:test --ref <branch>`, and the e2e suites as delivery and API/E2E decide).

---

## Round 3: Review Of IR-003, The G-5 Revision (CRR-004)

- **Scope:**
  - `Targeted Delta Review` of `cc8dbce099..c22af3b892`. The code is `7eb78a701b`: 13 source files and its tests.
  - The delta stays within G-5's owners (the availability service, the selection service, the start checks on both paths and the two hosts' wiring) and the inherited-layer refusal.
  - No other spine changed. The new shape `StoredModelStartChecks` is G-5's own, so a Full Re-Audit isn't needed.
  - Upstream: SR-015, SR-016; ARCH-REV-008/009 Pass.
- **CR-500-003: Resolved.**
  - `ModelAvailabilityService.loadOnDemandModel` loads an on-demand AutoByteus model's provider the way a start does. It shares `loadProviderCatalog` with `ensureModelAvailable`, so there is one load step.
  - It answers `unreadable` when the provider can't be resolved, the load throws, or any source unit failed (SR-016, AR-003).
  - `storedModelOffer` runs that load, then the list read, inside the same 8 s race (`run-model-selection-service.ts`). So a model of a provider loaded on demand is `offered` after a restart, and a provider that couldn't be read starts as before. A provider that was read but lacks the model is still a true `not_offered`.
  - `listOptions` applies the same rule, so Settings shows "unavailable" rather than a false note (the web already maps `modelListReadable: false`).
  - The deviation (`ensureModelAvailable` keeps base's errors through the shared private step) is recorded, and its reason holds.
  - `on-demand-stored-model.test.ts` uses the real services over a catalog that lists models only after a load. It covers 14 cases: the three provider kinds, missing models, a host down, two hosts, an unconfigured host, a removed endpoint, the budget, and static and external models unchanged.
- **CR-500-004: Resolved.**
  - `storedModelStartRefusal` reads the definition first. A missing definition, or a failed read, returns null, so the path's own not-found answers.
  - Both hosts pass `{ agentDefinitions, storedModels }` (the supervisor and the application kernel builder). The application scope passes the same definition service its runtime uses (`application-execution-scope-kernel-builder.ts:133,158,180,270`), so G-5 and the start agree on which agents exist.
  - The tests cover a retired agent on both paths.
- **CR-500-005: Resolved.**
  - `inheritedLayerRefusal` (`collaborator-launch-resolver.ts`) reads: "{A} can't be delegated to: it would use this run's model '{m}', which {R} no longer offers. Set a model for {A} in its settings, or change this run's model, then delegate again." That is FR-1 … FR-3.
  - The verdict carries `modelNoLongerOffered`, so no text is matched.
  - Other inherited reasons keep their own words, with the same next step.
  - The resolver test, the DLP-005 e2e (IMP-015, with the scripted AGY CLI) and the probe assert the text, and the FU-030 table has the row.
- **Checks:** I didn't rerun them; they ran on `7eb78a701b`.
  - Type gate: production 0, tests at the 1010 baseline.
  - Units: 7551 passed. The standalone-application-host mocks were fixed and pass 28/28. The remaining failures are folder-watcher timing and load.
  - Integration and architecture: 183 passed.
- **For API/E2E:** `team-stream-clients-wait-for-connected.test.ts` flags API/E2E's own FU-036 e2e (`run-stream-early-command.e2e.test.ts`, `c0770ea7b0`), which sends early on purpose. That is test-side and API/E2E's to settle, for example with an explicit exemption in the check.
- **Sizes:** the member handle is at 499 and `build-studio-server.ts` at 498.
- **Scorecard:** Runtime Correctness is back to 9.4; every category is at 9.3 or above, and the overall is 9.4.
- **Findings:** none open.
- **Routing:** `Pass`, to `/api_e2e_engineer`. The Implementation Engineer is informed.

---

## API/E2E Failure-Origin Review Of API-REV-001 (CRR-003)

- Entry point: `API/E2E Failure-Origin Review`. Code tested: `cc8dbce099`; API/E2E's commits are `c0770ea7b0` and `718a359cab`.
- Failing scenarios:
  - F-1: E-002, `remove-built-in-project-task-manager-startup`;
  - F-2: `delegated-launch-config-defaults` "Agent root: with the root's model retired …", and probe DLP-005;
  - F-3: SCP-E2E-006, `get-project-task-worker-scope`.
- Evidence: `evidence/api-e2e/API-r1-runs.txt` §3; `/tmp/api500/r1/scp006-diag2.log`.

### F-3: the origin is G-5. It falsely refuses an AutoByteus run whose model comes from a provider loaded on demand (CR-500-003, Design Impact)

- **The observation is corrected.** API/E2E saw "no answer, no error frame", but the diagnostic run's frames hold one for the mate: `ERROR RUN_MODEL_NOT_OFFERED`, "mate can't start: its saved model 'scope-fixture:lmstudio@127.0.0.1:52905' is not offered by AutoByteus now…" (`scp006-diag2.log`, the frames after the send). The test helper waits for a tool result, so it timed out instead of reporting the error.
- **The cause, from the code:**
  - On the AutoByteus runtime, models from dynamic providers (Ollama, LM Studio and custom OpenAI-compatible endpoints) are loaded into `LLMFactory` on demand.
  - The start path calls `ModelAvailabilityService.ensureModelAvailable`, from `available-llm-construction.ts:14`. That loads the provider's catalog when the model isn't registered (`model-availability-service.ts:52-63`, `ensureProviderModelCatalog`), and only then checks it.
  - G-5's `storedModelOffer` reads `runtimeModelSelectionCatalog("autobyteus")`, which is `LLMFactory.listAvailableModels()` (`model-catalog-service.ts:205`), with no such load.
  - After a server restart, the LM Studio model isn't loaded yet, so the read answers `not_offered`, and the member is refused before its runtime would have loaded and used the model. At base it starts: 2/2 with 6/6 tests; the branch fails 0/6.
- **Scenario:** a supported normal one. A user with Ollama, LM Studio or a custom provider restarts the app and messages an existing run, or restores it. Every such run is refused, with text telling them to choose another model.
- **Why Design Impact:** design G-5 states "it reads the runtime's list through the same `readCatalog` and answers from `offeredModels` only". For the AutoByteus runtime, that list isn't the authority before its dynamic providers are loaded. The owner of "is this AutoByteus model available" is `ModelAvailabilityService` (load on demand, then check the registration and the configured endpoint). The fix is a design decision:
  - G-5 asks the availability owner for the AutoByteus runtime;
  - or the offer check loads the provider catalog first;
  - and, either way, decide what "unreadable" means when a local host is down.
  - The 8 s bound and the external CLI runtimes are unaffected: their empty or failed lists already throw and count as `list_unreadable`.
- **My own review gap:** in CRR-001 I rejected C-7, the AutoByteus runtime with an offline local provider, on the premise "today that start fails anyway". I didn't trace `ensureModelAvailable`'s on-demand load, which makes the start work at base. The premise was wrong, and the consequence is broader than C-7: every dynamic-provider model after a restart, not only an offline host.

### F-1: the origin is G-5 again, the order against a missing agent definition (CR-500-004, Design Impact)

- `restoreStarted` asks G-5 before anything else (`standalone-agent-run-lifecycle-service.ts:322-324`). The missing definition is found only later, in the runtime backend's `prepare()` (`autobyteus-agent-run-backend-factory.ts:297`, "AgentDefinition with ID … not found"). The lifecycle service has no access to the definition.
- **Result:**
  - a run of a retired agent (the built-in Project Task Manager, removed by a migration: a supported released scenario, E-002) is answered "can't start: its saved model … is not offered … choose a runtime and model in Settings";
  - that repair can't help, because the agent no longer exists. Base answers `RUN_NOT_FOUND`.
- In this fixture the model is also LM Studio's, so CR-500-003 makes the G-5 answer false as well. The ordering question stands on its own, though: a deleted agent whose model is also gone gets the wrong refusal.
- **Design Impact:** design G-5 placed the check "before `buildConfig`", and making "not found" win needs a rule for which refusal comes first, plus either a definition read in the lifecycle service or the check moved to where the definition is resolved. The member path (`prepareActivation`) needs the same decision for a member whose definition is gone.

### F-2: the origin is the implementation. The inherited-layer delegation refusal lost its next step (CR-500-005, Local Fix)

- **At base:** the refusal for an agent that needs the inherited layer, when the delegator's model is retired, was "{name} cannot be delegated to: '{m}' is not offered by {R} now. Refresh the model list and choose again." Its next step lived in the model check's own detail.
- **The change:**
  - FU-030 changed that detail to "'{m}' is no longer offered by {R}." and added a next step only to the agent's own default layer (`noUsableLayer`, `collaborator-launch-resolver.ts:328`);
  - the inherited path (`:173`, `throw new CollaboratorAddError(plan.name, verdicts.inherited.detail)`) now has no next step;
  - that is a regression against REQ-007 and FR-3.
- **The test makes it worse:** the implementation rewrote the test to expect the default-layer text ("its default model cannot be used … Choose another model for … in its settings"), while the test's own title says "today's text, nothing added". The test therefore expects a text this path can't give, and that is wrong for the inherited case anyway: the retired model is the delegator's, not the agent's default.
- **Required:**
  - give the inherited-layer refusal a next step that fits it, following FR-1 … FR-4. For example: set a model in {name}'s own settings, or change this run's model;
  - make the test and probe DLP-005 assert that text;
  - add the row to the handoff's FU-030 table.
- **Classification:** Local Fix, because FU-030 owns the wording and its style is decided.

### What passed, kept as evidence

- AC-005: Linux 5/5.
- AC-006: RSE-1, nothing dropped.
- AC-008: ALM-1 byte-identical, with backups, the removed route answering 404 and a second start a no-op.
- AC-010: LTI-1.
- AC-012's browser cases: G5-001/002/003, where the stored model really is gone.
- The FU-030 texts DLP-003/004, DCP-004, SIR-002, RC-04/RC-17 and the composer probe.
- C-6 is measured: 14.3 s plus 12.3 s in the same first start, on 8.66 GB, warm. Accepted as a one-time cost and recorded for the release notes.

### Classification and routing

- **CR-500-003 and CR-500-004:** `Design Impact`, to `/solution_designer`, which revises G-5: the AutoByteus availability source, and the order against a missing definition on both paths.
- **CR-500-005:** `Local Fix`. It goes to the implementation with the revised package, in the same round.
- **Next:** after the revision, the implementation round comes to me, then API/E2E reruns F-1 … F-3, LE-F1 and the AutoByteus cases.

---

## Round 2: Targeted Delta Review Of IR-002 (CRR-002)

- Scope:
  - `Targeted Delta Review` of `941355e258..cc8dbce099`. The code is `7eb6f94b9f` only: 23 server files, all renames within CR-500-001's files and their tests, plus the doc line.
  - `GLOSSARY.md` changed.
  - No spine, interface or data shape changed.
- **CR-500-001: Resolved.**
  - Every identifier listed is renamed: `DelegatedRunRouterState`, `TaskDelegatedRunPlacementLaunchNotes`, `buildExistingDelegatedRunTaskMessage`, `assertDelegatedRunAssignable`, the parser's schemas, `parseExistingDelegatedRunInput` and `EXISTING_DELEGATED_RUN_TASK_ID`.
  - The `copy` field is now `delegatedRun` in `AssignToExistingDelegatedRunInput` and `TaskDelegationOutcome`. Both are internal types. The tool result still uses its `target_*` names, so nothing on the wire or in storage changed.
  - The hosting comment at `message-recipient-resolution.ts:31` is rewritten.
  - I reran the completion grep (`Copy[A-Z]|[a-z]Copy\b|assertCopy|CopyRouter|copy:` over `src`, migrations excluded). It finds no identifier, only comment wording in modules this ticket doesn't otherwise touch. The implementer recorded those as **FU-500-08**, which is proportionate.
- **CR-500-002: Resolved.** The stale doc line is gone (`agent-run-command-coordinator.ts:44-53`).
- **Suggestions:** the glossary now lists FU-500-07's visible "Delegated copy" under Known leftovers. The `CollaboratorAddError` method was not taken, which is fine.
- **Checks:** I didn't rerun them; they ran on `7eb6f94b9f`.
  - Type gate: production 0, tests at the 1010 baseline.
  - Units over the affected folders and `tests/architecture`: 3737 passed.
- **Scorecard:** as round 1, with Naming 8.8 → 9.4 and Cleanup 9.1 → 9.4. Overall 9.4, and every category is at 9.3 or above.
- **Findings:** none open.
- **IDs:** IR-002 is this Local Fix; FU-035's round becomes IR-003 (recorded in the handoff).
- **Routing:** `Pass`, to `/api_e2e_engineer`. The Implementation Engineer is informed.

---

## Round 1 (CRR-001): Fail, Local Fix (history)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-014)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as cited by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 … SR-014)
- Design Spec Reviewed As Context: `design-spec.md`: delivery 1 (SR-006/SR-008), delivery 2 (G-1 … G-4), G-5 (SR-011/SR-012), FU-021 (SR-013/SR-014)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-500-01 … -07), `source-follow-ups-461.md` (leads)
- Relevant Solution Revision IDs: SR-006 … SR-014
- Design Review Report Reviewed As Context: `design-review-report.md` (uncommitted, the reviewer's)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003, -005, -006, -007
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: IR-001 ready for source review (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Branch / head: `codex/follow-ups-of-461-500` at `941355e258`. Merge base with `origin/personal` is `9695d310c5`; the handoff's "on `d8dbeaa9ba`" is the 508 line the branch also contains. Diff from the merge base: 466 non-ticket files, +3864 / −2679.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Both confirmed: a user-data migration with backups, public contract changes (GraphQL `runId`, `execution_tree.agent`, `RUN_MODEL_NOT_OFFERED`, the removed attachment route), and composition rewiring in two hosts.
- Selected route: `Implementation Review`. Independent source review required: `Yes`.

## Review Scope

- **Changed implementation reviewed, by step:**
  - names (N2, N3, N5);
  - FU-036, `api/websocket/agent.ts`;
  - FU-011 / FU-018, both compositions, the ports, the Task service and the discovery tools;
  - FU-013, the token resolver;
  - FU-020, the owner kind's removal and the migration with its follow-up;
  - FU-030, the texts and `CollaboratorAddError.nextStep`;
  - FU-022 / FU-023;
  - FU-021, the watcher test;
  - G-1, the recorder, `desktop-release.sh` and the order test;
  - G-2, `existing-team-row-repair.ts`;
  - G-3;
  - G-5, the offer check, the refusal helper, both start paths and the web member note;
  - the two late fixes, `1eed3c4aff` and `d8ffc77c8b`;
  - docs (`GLOSSARY.md` Code Names).
- **Explicit exclusions:**
  - FU-035 (IR-002, D-14);
  - AC-005's watcher proof (API/E2E, D-13b);
  - live and probe runs (API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements understood: REQ-001 … REQ-016 (REQ-003 and REQ-015 dropped), with D-1 … D-14.
- Design review: ARCH-REV-003/005/006/007 Pass.
- Behavior-basis status: `Confirmed`.

| Behavior ID | Status | Implementation path and lifecycle evidence |
| --- | --- | --- |
| B-1 | Confirmed | Host kind gone from server and web (`git grep agent_collaboration_member\|DelegatedChildLocations\|agent-collaborations/…/context-files` finds nothing outside migrations). The kept references route (`agent-collaboration-references.ts:34`) serves messages, not attachments. |
| B-2 | Confirmed | Migration targets are `/rest/runs/{child}/…` and `/rest/team-runs/{team}/agent-runs/{child}/…` (`attachment-link-conversion.ts` `targetOf`), the current routes. A test checks the target resolves through the current layout ("each target is the current code's own link", S-2). |
| B-3 / B-4 | Confirmed | `delegated-run-own-attachment-links-app-data-migration.ts`: pre-check → frozen transform → backup (`COPYFILE_EXCL`, fsync, kept on retry) → temp + fsync + rename → re-read check. The follow-up has prerequisites `[20261017_task_agent_own_run_v1, ours]`. |
| B-5 | Confirmed | One `attachRunStream` for the four streams. Listeners are attached at once, `connecting` → `SESSION_NOT_READY`, and an early close disconnects the late session (`agent.ts:45-79`). The handlers are required parameters. |
| B-6 | Confirmed | `AgentRunService.standaloneRuns` and `TaskExecutionResourceRelease.request` are required. The application scope passes `APPLICATION_HOST_STANDALONE_RUNS` (`application-execution-scope-kernel-builder.ts:287`). |
| B-7 | Confirmed | Discovery takes `PeerDiscoveryAccess` from the composition. The studio passes its late binding; the application host passes `REMOTE_COLLABORATION_OFF_DISCOVERY` (`start-standalone-application-host.ts:227,277`). |
| B-8 | Confirmed | `token-usage-stats.ts`: `createTeamRootExecutionIdentity(teamRunId)` only. |
| B-9 | Confirmed | The FU-030 table in the handoff; outcomes and codes unchanged. A peer's refusal no longer gets this node's next step (`collaborator-errors.ts` `nextStep`). |
| G-1 | Confirmed | `released-migration-order.json` (45 IDs, beta.7). The recorder refuses a reordering and writes nothing; `desktop-release.sh` commits the file with the version. |
| G-2 | Confirmed | `repairExistingTeamRows` keeps, rebuilds or removes rows by folder, and every row goes through `TeamRunHistoryIndexStore.writeIndex`. Teams without metadata (`record.skipped`, 461's delegated teams) are no longer silently dropped. |
| G-5 | Confirmed | `storedModelOffer` reads one runtime's list within `MODEL_LIST_READ_MS` (8 s, raced). An external runtime's empty list throws (`model-catalog-service.ts:186`), so it counts as `list_unreadable`. Both start paths call `storedModelStartRefusal`. |
| FU-021 | Confirmed | Outcome waits, one 60 s guard per test, ENVIRONMENT / INCONCLUSIVE labels, no skip or retry. The watcher source is unchanged (`src/file-explorer` has no diff). |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Related | Kind | Initiator / goal | Entry | Shape | Forward path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-1 | B-2/B-3 | Operational | First start of the release over the founder-shaped data | startup migration runner | Normal | runner → migration → per-file convert | old attachments open by the run's own link | design M-1…M-10, IMP-005 scan | Supported Normal | Use |
| SC-2 | B-5 | Contract | A client sends before CONNECTED | `/ws/agent-org`, `/ws/agent-collaboration` | Explicit Edge | attach → `connecting` → refusal | `SESSION_NOT_READY` | D-3, FU-036 | Supported Explicit Edge | Use |
| SC-3 | AC-001 | Contract | The code's names follow the glossary | source | Normal | — | no "copy" for a delegated run | AC-001, N3, `GLOSSARY.md:17` | Contract | Use |
| SC-4 | G-5 | User | A user opens a run whose stored model its runtime dropped | Settings / send message | Normal | restore / member activation → offer check | refused with the D-12 text; unreadable list starts | D-12, AC-012 | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| ID | Observation | Scenario / contract | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- |
| C-1 | Server identifiers still name a delegated run "copy" (list in CR-500-001); `task-delegation-tool-input-parsers.ts` is half renamed | SC-3, AC-001, N3, the glossary line this change adds | **Promote** | This ticket | AC-001 names "copy"; the design's N3 rule says "copy goes for a delegated run". The completion grep only checked the design's own list, so these slipped. |
| C-2 | `agent-run-command-coordinator.ts:51` keeps the old doc line "defaults to the process port" above the new one | engineering contract (truthful docs on a changed parameter; Principle 7/8 cleanup) | **Promote** | This ticket | The fallback it describes was removed by this change, so the line is now false. |
| C-3 | The delegation refusal text (`… can't be delegated to: {reason}. {nextStep}`) is assembled in two places (`catalog-delegation.ts`, `delegator-catalog.ts`) | Principle 11 | Reject as finding (suggestion) | — | Two copies of a one-line template; a `CollaboratorAddError` method would give it one owner, but it causes no drift today. |
| C-4 | The glossary says a delegated run is never a "copy" in "UI rows", while visible Settings text keeps "Delegated copy" (FU-500-07) | Principle 15 | Reject as finding (suggestion) | — | FU-500-07 records it. Listing it under the glossary's Known leftovers would keep the glossary truthful. |
| C-5 | A team member folder holding only archived traces (no top-level raw trace) would not be found by `teamMemberFolders` | SC-1 | Reject | — | No evidence such a folder exists; a run with traces keeps its active file. No supported path produces it. |
| C-6 | On a normal install, the follow-up migration runs in the same first start (its predecessor succeeded long ago): a second 8.6 GB pre-check pass | SC-1, M-6 | Hold (note for API/E2E) | — | Correct and idempotent, but M-6's "one pass" understates the first-start cost. API/E2E's cold measurement should time both. |
| C-7 | G-5 on the AutoByteus runtime: a model whose local provider (Ollama, LM Studio) was offline at startup is missing from the list, so it is refused "not offered" | SC-4 | Reject | — | Today that start fails anyway, with an opaque error; the refusal is clearer and its next step works. The design decided this rule (D-12). |
| C-8 | Standalone restore names the agent by `address`'s last segment, else `agentDefinitionId` | SC-4, FR-1 | Reject | — | Definition IDs are slugs of the agent's name (`file-agent-definition-provider.ts` `slugify`), so the text stays readable. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Design health assessment present and preserved | Pass | As the design; FU-021's premise revised upstream (SR-014) | — |
| Matches approved supplements | Pass | FU-030 table; G-1 … G-5 per design | — |
| Data-flow spines | Pass | S-1 … S-8 traced as above | — |
| Ownership boundaries | Pass | Discovery, channel, standalone runs and the Task service's ports are now passed by each host | — |
| Off-spine concerns | Pass | G-2 repair beside its migration; link conversion and folder listing split from the migration's sequence | — |
| Capability reuse | Pass | Frozen locator transform and store reused; `read-deadline.ts` owns the budget (`d8ffc77c8b`) | — |
| Reusable owned structures | Pass | One `storedModelStartRefusal` for both start paths (`1eed3c4aff`) | (C-3 suggestion) |
| Shared-structure tightness | Pass | `LinkOwnerFolder`, `LinkConversion` and the stream state union are tight | — |
| Repeated coordination ownership | Pass | One attach function replaces two (FU-036) | — |
| Empty indirection | Pass | `APPLICATION_HOST_STANDALONE_RUNS` is a host's explicit answer, not a forwarder (design DR-2); the late binding solves a real startup order | — |
| SoC / file responsibility | Pass | `existing-team-row-repair.ts` keeps the migration at 470 lines | — |
| Dependency direction | Pass | `llm-management` no longer imports `available-agent-runtimes` (`d8ffc77c8b`) | — |
| Visible dependencies (P16) | Pass — deviation recorded, reason holds | Studio late binding (`createLateRemoteCollaborationBinding`): everything that can call it is composed before `bind`, but restart resume, the Task side and the routes come after it (`build-studio-server.ts:309-385`). An early read throws; there is no cycle in ownership. The handoff records it. `getProjectTaskService()` now throws before composition. | — |
| Authoritative boundary | Pass | No caller takes both an owner and its internals in the changed code | — |
| File placement | Pass | The migration folder follows the guideline layout | — |
| Flat vs over-split | Pass | — | — |
| Interface boundary clarity | Pass | Team total names its kind (FU-013); `storedModelOffer` answers a three-valued result | — |
| Naming (P15) | **Fail** | CR-500-001 | Finish N3 |
| Duplication | Pass | (C-3 suggestion) | — |
| Patch-on-patch | Pass | Late fixes are moves, not layers | — |
| Dead code | **Fail** (minor) | CR-500-002: a stale doc line for the removed fallback | Remove it |
| Test scenarios clear | Pass | Migration F-1 … F-9, retry, second start, follow-up, predecessor classification; AC-006 both streams; G-5 budget with fake timers; AC-009 cases | — |
| Test structure | Pass | — | — |
| No stale tests | Pass | Tests follow FU-011/013/020 (`d4e36d4831`) | — |
| API/E2E readiness | Pass | After the two fixes | — |

## Source File Size And Structure Audit

| Source File | Before | After | >500 | Notes |
| --- | --- | --- | --- | --- |
| `configured-agent-execution-handle.ts` | 493 | 500 | Pass (at the limit) | `1eed3c4aff` moved the G-5 check to the shared helper; one comment joined to its line. The next addition here needs a split. |
| `build-studio-server.ts` | 488 | 498 | Pass | Late binding moved to `remote-collaboration-composition.ts` |
| `autobyteus-agent-run-backend-factory.ts` | 484 | 491 | Pass | — |
| `team-run-history-index-v2-migration.ts` | 478 | 470 | Pass | Repair in its own file |
| `standalone-agent-run-lifecycle-service.ts` | 448 | 462 | Pass | — |
| Every other changed source file | — | ≤ 460 | Pass | Scanned all 198 changed source files |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No compatibility mechanisms | Pass | The old link shape has no reader in current code; only the migration knows it |
| No legacy retention | Pass | Host kind, route, `DelegatedChildLocations`, MCP singletons and the process `bind/find` lookups removed |
| Dead code removed | Fail (minor) | CR-500-002 |
| Persisted-data decision followed | Pass | `Migration Required` (D-8), isolated, frozen helpers only, backup per file |
| No dual reads / request-time fallback | Pass | — |
| Migration mechanics match the design | Pass | M-1 … M-9; G-2 same-ID repair per §7 |

## Docs-Impact Verdict

- Docs impact: `Yes`. The glossary, collaboration model and module docs follow the change (`6b4ee1f128`).
- `RELEASE.md` needs the G-1 line in "Cutting The Release". That's the Delivery Engineer's.

## Review Scorecard

- Overall: **9.3 / 10** (simple average; not the decision rule).

| # | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine | 9.5 | Each FU's spine is traceable end to end; FU-036's four streams share one attach | — | — |
| 2 | Ownership & Boundaries | 9.5 | Hosts pass owners; "off" and "not eligible" are explicit values | GraphQL getters stay (FU-500-02, decided) | — |
| 3 | API / Interface Clarity | 9.4 | Team total names its kind; the offer check is three-valued; the refusal's next step is kept apart | — | — |
| 4 | SoC & File Placement | 9.3 | Splits keep files under 500 | Member handle at exactly 500 | Split before its next addition |
| 5 | Shared Structures | 9.3 | One refusal helper for both paths | Refusal template in two places (C-3) | Optional |
| 6 | Naming & Readability | **8.8** | N2 and N5 are complete | N3 incomplete in server code (CR-500-001) | Finish the rename |
| 7 | API/E2E Readiness | 9.3 | Tests and evidence ready; probe and e2e text updates listed | — | — |
| 8 | Runtime Correctness | 9.4 | Migration safe on retry, with backups; G-5 bounded; early stream close handled | — | — |
| 9 | No Legacy Retention | 9.5 | Clean cut on the attachment owner | — | — |
| 10 | Cleanup Completeness | 9.1 | Removals are thorough | Stale doc line (CR-500-002) | Remove it |

## Findings

### CR-500-001 (Local Fix): the N3 rename is incomplete in server code

- **Contract:**
  - AC-001: "No current name in web or server source implies hosting (… 'copy' …)".
  - Design N3: "copy goes for a delegated run".
  - This change's own glossary line: "Delegated run (code and UI rows): never a 'copy'".
- **Still named "copy" for a delegated run:**
  - `agent-tools/task-delegation/task-delegation-tool-input-parsers.ts`: `EXISTING_COPY_TASK_ID`, `ExistingTeamCopyInputSchema`, `ExistingAgentCopyInputSchema`, `parseExistingCopyInput`, and the `copy:` field of the input it builds. The same file already returns `subject: "existing_delegated_run"`, so the file is half renamed. The `copy` field belongs to `AssignToExistingDelegatedRunInput`; rename it at its type and readers.
  - `projects/services/task-assignment-eligibility.ts:63` `assertCopyAssignable`, with its callers at `project-task-service.ts:329,339`.
  - `agent-collaboration/execution/task/task-execution-input.ts:95` `buildExistingCopyTaskMessage`, and its use at `task-delegation.ts:20,392`.
  - `agent-collaboration/execution/task/task-delegation-command.ts:22` `TaskCopyPlacementLaunchNotes`.
  - `agent-collaboration/collaborators/collaborator-errors.ts:39` `CopyRouterState`, with its uses in `collaborator-launch-resolver.ts` and `remote-delegation-receiver.ts`.
  - The present-tense hosting comment at `message-recipient-resolution.ts:31` ("never a task copy hosted by the instance"), which falls under N6.
- **Problem:** the delegated run keeps two names in code, against the glossary entry this change adds, and the half-renamed parser misleads readers about which is current.
- **Excluded:**
  - comments that cite base's behavior ("as base's hosted copy …");
  - the routing-decision fields (`copyAddress` / `copyKind`, web `decisionCopy`, FU-500-04);
  - the visible UI copy (FU-500-07);
  - clipboard and UI-text "copy".
- **Required action:** rename these names, then rerun the type gate and the affected unit tests. Widen the completion grep beyond the design's list, for example `git grep -E 'Copy[A-Z]|[a-z]Copy\b|assertCopy|CopyRouter' -- autobyteus-server-ts/src`.

### CR-500-002 (Local Fix): a stale doc line for a removed fallback

- **Where:** `agent-execution/services/agent-run-command-coordinator.ts:51`. The old line "The owner of eligible standalone runs; defaults to the process port." sits above the new one.
- **Problem:** this change removed that default, so the line is false.
- **Required action:** delete the old line.

## Follow-ups

- Follow-ups this review added: None. C-3 and C-4 are suggestions; C-6 is a note for API/E2E.

## Classification

- `Local Fix` (CR-500-001, CR-500-002). No design or requirement change.

## Recommended Recipient

- `/implementation_engineer`.
- The fix returns here as a Targeted Delta Review, then goes to API/E2E.

## Residual Risks (for API/E2E and delivery)

- **FU-035:** IR-002, with its own review (D-14).
- **AC-005:** the watcher proof is API/E2E's: 5 of 5 on Linux inotify (D-13b).
- **C-6:** time M-6 cold for both passes of the first start (the migration and its follow-up).
- **Delivery's base refresh:** `origin/personal` has 8 new commits (beta.8). Confirm beta.8 shipped no app-data migration, so `released-migration-order.json` (45 IDs, beta.7) is still the released list. Also add `RELEASE.md`'s G-1 line.
- **Not run by implementation:** e2e and probe text assertions, the G-5 browser render, the migration on a copy of real data.
- **Member handle at 500 lines:** the next addition to it needs a split.

## Latest Authoritative Result

- Review Decision: **Fail**
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3 overall. Naming 8.8 and Cleanup 9.1 are below 9.2; every other category is at 9.3 or above.
- Recommended Recipient: `/implementation_engineer`
- Notes: the architecture holds. The two findings are local and small.
