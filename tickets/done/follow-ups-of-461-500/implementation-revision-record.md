# Implementation Revision Record: follow-ups-of-461-500

## IR-001 (baseline)

- **Trigger:**
  - ARCH-REV-003 Pass (the combined package);
  - ARCH-REV-005 (G-5 added, SR-011 / SR-012);
  - ARCH-REV-006 (the FU-021 environment probe, SR-013);
  - ARCH-REV-007 (SR-014: D-13b labels, D-14 FU-035 sequencing).

  Large / High.
- **Prior result:** N/A (baseline).
- **Upstream revisions:** SR-006 … SR-014; ARCH-REV-001, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006, ARCH-REV-007. CRR / API-REV / DR:
  N/A.
- **Behavior / requirements:**
  - Implemented: REQ-001, REQ-002, REQ-004 … REQ-009, REQ-011 … REQ-014 and REQ-016.
  - REQ-010 (FU-035) is not in IR-001: step 0 is blocked by the Grok usage limit (IMP-011); IR-002 per D-14.
  - REQ-008's watcher part: the D-13b labels are in (`a4e7f18e6d`; IMP-013). AC-005's proof is API/E2E's (Linux 5 of 5).
  - REQ-003 and REQ-015 were dropped by the user.
- **Code delta:** the commits in `implementation-handoff.md` "Current Implementation Summary".
  - The steps run `75ee688dad` … `4277f1945e`.
  - Then `1eed3c4aff` (two files back under 500 lines) and `d8ffc77c8b` (G-5's budget constant, for the dependency
    direction), and `a4e7f18e6d` (SR-014's INCONCLUSIVE label).
- **Focused validation:** IMP-01 … IMP-13 (handoff "Checks Run").
- **Limitations:**
  - FU-035 waits for IR-002; the watcher proof waits for API/E2E's Linux runs.
  - M-6 is not strictly cold.
  - The e2e text updates and the G-5 browser render were not run by me.

## IR-002 (Local Fix for CRR-001)

- **Trigger:** Code Reviewer, `code-review-report.md`, CRR-001: Fail, Local Fix. Findings CR-500-001 and CR-500-002.
- **Prior result:** IR-001, ready for source review. **Current result:** both findings fixed; back to source review
  (Targeted Delta Review).
- **Upstream revisions:** SR-014, ARCH-REV-007, CRR-001. API-REV / DR: N/A.
- **ID note:** D-14 named FU-035's round "IR-002". Revision IDs go in round order, so FU-035's step 0 comes in a later
  round (IR-003 went to the G-5 revision).
- **Behavior / requirements:** REQ-001 / REQ-002 (AC-001, N3): code names only. No behavior changes.
- **Code delta** (`7eb6f94b9f`):
  - **CR-500-001:**
    - The `copy` field becomes `delegatedRun` in `delegate_task`'s existing-run input (`AssignToExistingDelegatedRunInput`)
      and in the delegation outcome (`TaskDelegationOutcome`), with all their readers.
    - Renamed identifiers:
      - `DelegatedRunRouterState`;
      - `TaskDelegatedRunPlacementLaunchNotes`;
      - `buildExistingDelegatedRunTaskMessage`;
      - `assertDelegatedRunAssignable`;
      - `ExistingAgentDelegatedRunInputSchema` / `ExistingTeamDelegatedRunInputSchema`;
      - `parseExistingDelegatedRunInput`;
      - `EXISTING_DELEGATED_RUN_TASK_ID`.
    - Comments in those files now say "delegated run".
    - The hosting-era comment in `message-recipient-resolution.ts` is replaced.
    - Kept: comments that cite base's behavior, `copyAddress` / `copyKind` (FU-500-04), the visible copy (FU-500-07),
      and the released migrations' frozen code.
    - The remaining comment wording (about 200 lines in modules not otherwise touched) is recorded as **FU-500-08**.
  - **CR-500-002:** the stale "defaults to the process port" line in `agent-run-command-coordinator.ts` is removed.
  - **Optional suggestion taken:** `GLOSSARY.md` lists FU-500-07's visible copy under Known leftovers.
  - **Optional suggestion not taken:** a `CollaboratorAddError` method owning the "{name} can't be delegated to: …"
    text, to keep this round's delta to the two findings.
- **Focused validation:**
  - `pnpm -C autobyteus-server-ts typecheck`: "production errors: 0; test-file errors: 1010 in 316 files (baseline 1010
    in 316 files)", PASS.
  - Units over `tests/unit/{agent-collaboration, remote-collaboration, agent-team-execution, standalone-agent-run-root,
    agent-tools, services, agent-execution, projects, available-agent-runtimes}` and `tests/architecture`: "Test Files
    410 passed | 4 skipped (414)", "Tests 3737 passed | 6 skipped (3743)".
  - `git grep -nE 'Copy[A-Z]|[a-z]Copy\b|assertCopy|CopyRouter' -- autobyteus-server-ts/src` now finds only the
    released migrations' frozen code and `DelegatedCopyOwnFileCompleteV1AppDataMigration` (a released migration's ID).
- **Limitations:** e2e files that read the wire result (`target_agent_run_id`) are unaffected; I didn't rerun them.

## IR-003 (G-5 revision for CRR-003)

- **Trigger:**
  - Code Reviewer CRR-003 (from API/E2E API-REV-001 F-1 … F-3): CR-500-003 and CR-500-004 (Design Impact), CR-500-005
    (Local Fix).
  - Solution Designer SR-015 / SR-016; ARCH-REV-009 Pass.
- **Prior result:** IR-002, Pass (CRR-002). **Current result:** R1–R3 implemented; ready for source review.
- **Upstream revisions:** SR-015, SR-016; ARCH-REV-008, ARCH-REV-009; CRR-003; API-REV-001. DR: N/A.
- **Behavior / requirements:** REQ-016 / AC-012 (G-5), REQ-007 (FU-030's inherited-layer text).
- **Code delta** (`7eb78a701b`):
  - **R1:**
    - `model-availability-service.ts`: `loadOnDemandModel`, `OnDemandModelLoad`, the shared private
      `loadProviderCatalog`.
    - `run-model-selection-service.ts`: the `OnDemandModels` constructor argument; the load inside the 8 s race in
      `storedModelOffer` and `listOptions`.
    - Both hosts pass `getModelAvailabilityService()`.
  - **R2:**
    - `run-model-selection-refusal.ts`: `StoredModelStartChecks`, and the definition read first in
      `storedModelStartRefusal`.
    - The handle, the factory and the lifecycle service take `storedModelChecks`; the supervisor and the kernel builder
      build it.
  - **R3:**
    - `launch-usability-check.ts`: `modelNoLongerOffered` on an unusable inherited verdict.
    - `collaborator-launch-resolver.ts`: `inheritedLayerRefusal`.
  - **Tests:**
    - New: `on-demand-stored-model.test.ts`.
    - R2 cases in the lifecycle and handle tests.
    - Resolver AC-006 / FU-030 text; the DLP-005 e2e and probe.
    - Helpers `OFFERED_STORED_MODEL_CHECKS`, `EXISTING_AGENT_DEFINITIONS`, `NO_ON_DEMAND_MODELS`; the constructions that
      follow from them.
- **Deviations:**
  - `ensureModelAvailable` shares the load step rather than calling `loadOnDemandModel`, which keeps base's errors at
    start.
  - No web change (the client already shows the note only for a readable answer).
  - Inherited failures other than "no longer offered" keep their words and gain the next step.
- **Focused validation:** IMP-15 … IMP-19 (handoff "Checks Run").
- **Limitations:**
  - The DLP-005 browser probe was updated, not run (API/E2E).
  - The SCP-E2E-006 restart rerun is API/E2E's.
  - API/E2E's FU-036 e2e file trips the stream-clients guard test (handoff note).

## IR-004 (delivery base refresh)

- **Trigger:** the Delivery Engineer's blocked report (`release-deployment-report.md`, `2f8a463a11`): a Local Fix to merge
  the latest base. Four conflicts.
- **Prior result:** IR-003, Pass (CRR-004); API-REV-002 Pass. **Current result:** merged and checked; to the code
  reviewer's merge review.
- **Upstream revisions:** CRR-004 … CRR-006, API-REV-002, the delivery report. SR / ARCH-REV: unchanged.
- **Code delta:**
  - `39325a1e50`: merge of `origin/personal` `ff13782f36`. Conflicts resolved in `restart-notice.ts`,
    `restart-resumer.ts`, `docs/modules/restart_resume.md` and `claude-live-agent-harness.ts`: 448's reminder with
    500's names. Detail in the handoff, "IR-004: base refresh".
  - `bfeea63612`: three 461-era registration-order tests list FU-020's two migrations after them. They had failed since
    `a954ae5300`, because my IR-001 runs didn't cover `tests/app-data-migrations`.
- **508 vs FU-020:** no interaction. 508 changes launch fields in `run_metadata.json` and trees; FU-020's migrations
  rewrite only raw-trace files and import no launch helper. The migration tests, with 508's cases, pass on the merged
  tree.
- **Focused validation:** IMP-20.
- **Limitations:**
  - Under load average 126–150, 14 server and 2 web tests timed out in the full runs. All pass alone or with longer
    timeouts, except the folder-watcher timing cases, which this ticket doesn't touch.
  - E2E suites were not run on the merge (API/E2E, delivery).

## IR-005 (Local Fix for CRR-007)

- **Trigger:** Code Reviewer CRR-007, the IR-004 merge review: Fail, Local Fix CR-500-007.
  - `build-studio-server.ts` has 502 effective lines on the merged base: base 492, 448 added 4, this ticket 10.
- **Prior result:** IR-004, merge correct (CRR-007). **Current result:** fixed; back for the recheck.
- **Upstream revisions:** CRR-007. SR / ARCH-REV / API-REV / DR: unchanged.
- **Code delta** (`eb741a097e`):
  - `createStudioPackageServices` moves unchanged to the new `compositions/studio-package-services.ts`; the studio
    imports it. No line was compressed.
  - The first attempt moved the application-services helper as well. The architecture tests require
    `buildApplicationPlatformRuntime({` in `build-studio-server.ts`, so it was reverted.
- **Focused validation:** IMP-21.
  - The server type gate passes.
  - Architecture, composition, restart-resume, application-platform, application-packages and llm-management tests:
    378/378.
  - Recount against `ff13782f36`: no changed source file is over 500 (studio 485, handle 499, AutoByteus backend
    factory 496).
- **Limitations:** none new.

## IR-006 (third delivery base refresh)

- **Trigger:** the Delivery Engineer's "Third integration refresh" (`release-deployment-report.md`, `0af5a64677`):
  merging `origin/personal` `0570c47fd9` conflicted in 13 files. A Local Fix.
- **Prior result:** IR-005, Pass (CRR-008); API-REV-003 Pass. **Current result:** merged and checked; to the code
  reviewer's merge review, then API/E2E on the merged state.
- **Upstream revisions:** CRR-008, CRR-009, API-REV-003, the delivery report. SR / ARCH-REV: unchanged.
- **Code delta:**
  - `e93671cce0`: the merge.
    - 448 part 2's background-task count goes into 500's run-agent names.
    - The deleted `standalone-paired-agent-access.ts`: 448's change moves to `standalone-run-agent-access.ts`.
    - The base's new `peer-run-calls.ts` / `remote-run-observation.ts` and its new web spec follow 500's names.
    - 493's episodic catalog goes into 500's composition; the dead `AGENT_RUN_COLLABORATION_DIR_NAME` stays removed.
    - Detail in the handoff, "IR-006: third base refresh".
  - `4db98c6d1a`: the FU-011 host-owners test's complete supervisor input includes 493's required `episodicCatalog`.
- **Focused validation:** IMP-22.
  - Both type gates pass.
  - Server: 8876 passed; only watcher timing failed, and `file-system-watcher` labels its failures ENVIRONMENT or
    INCONCLUSIVE.
  - Web: 5767 passed.
  - No changed source file is over 500.
- **Limitations:** server E2E suites were not run on the merge; they're for API/E2E round 4, which the Delivery Engineer
  asked to target what the merge touches.

## IR-007 (fourth delivery base refresh)

- **Trigger:** the Delivery Engineer's fourth refresh (`92780698b9`): merging `origin/personal` `24d438fa31` conflicted
  in 2 files. A Local Fix.
- **Prior result:** IR-006, Pass (CRR-010); API/E2E round 4. **Current result:** merged and checked; to the code
  reviewer's merge review, then API/E2E on a built server's stop and restart resume with its notice.
- **Upstream revisions:** CRR-010 … CRR-012, API/E2E round 4, the delivery report. SR / ARCH-REV: unchanged.
- **Code delta:**
  - `eecb228bd6`: the merge.
    - `restart-resumer.ts`: 526's whole-message observer argument, with `readyAgent`.
    - `build-studio-server.ts`: 524 round 2's move of `closeStudioProcessResources` and 500's move of
      `createStudioPackageServices` both stay. 500 never changed the close function.
    - Detail in the handoff, "IR-007: fourth base refresh".
  - The first resolution left a stray `};`; it was amended into the merge commit.
- **Focused validation:** IMP-23.
  - Both type gates pass.
  - Server: 8880 passed. The 16 failures are all file-event waits; a raw `fs.watch` probe got no event in 3 of 5 tries.
  - The code under `package-auto-refresh` is the base's, unchanged by this ticket.
  - Restart-resume and composition tests pass.
  - Web: 5776 passed.
  - No changed source file is over 500 (studio 428).
- **Limitations:**
  - The file-event tests couldn't pass while the OS dropped events; they're for API/E2E's Linux / quiet-machine runs.
  - Built-server stop and restart-resume E2E are API/E2E's.

## IR-008 (seventh delivery base refresh: the watcher test after 517)

- **Trigger:** the Delivery Engineer's "Fifth and sixth integration refreshes" (`50faf1c629`): merging `origin/personal`
  `75048cbaf4` conflicted in one file, `file-system-watcher.integration.test.ts`, with 19 hunks. Both sides had
  redesigned its waits.
- **Prior result:** IR-007, Pass (CRR-013). **Current result:** merged and checked; to the merge review, then
  API/E2E's Linux watcher run.
- **Upstream revisions:** CRR-013, the delivery report. SR / ARCH-REV: unchanged; see the decision note below.
- **Code delta** (`bb42531c7d`):
  - 500's wait structure stays: outcome waits, the sentinel "no event" check, the ENVIRONMENT / INCONCLUSIVE labels.
  - Its limits come from 517's helper: the guard is `OS_FILE_EVENT_WAIT_MS` (30 s); the test timeout is
    `FILE_EVENT_TEST_TIMEOUT_MS` + 10 s; the hooks use `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS`.
  - TESTING.md's busy-Mac rule names the sentinel alternative and the labels.
- **Decision note:** the guard is 30 s instead of SR-013's 60 s, to follow the project's shared limit (TESTING.md). The
  waits aren't longer, and AC-005's gate is unaffected. If the reviewer reads it as a design choice, it goes to the
  Solution Designer.
- **Focused validation:**
  - IMP-024: Linux, 5 of 5 runs, 14/14 each, 0 labels.
  - IMP-025: both type gates pass; server units, architecture and restart-resume pass except the untouched folder
    watcher; on the loaded Mac every watcher failure is labelled.
- **Limitations:** a quiet macOS run is still "when available" (D-13b).

## IR-009 (eighth delivery base refresh: 491 and 492)

- **Trigger:** the Delivery Engineer's "Seventh integration refresh" (`04d44b5cd0`): merging `origin/personal`
  `53b72018ad` (autobyteus-491, autobyteus-492) conflicted in 18 files. A Local Fix.
- **Prior result:** IR-008, Pass (CRR-015). **Current result:** merged and checked; to the merge review, then an
  API/E2E round on messaging and the migration order.
- **Upstream revisions:** CRR-015, the delivery report. SR / ARCH-REV: unchanged.
- **Code delta:**
  - `5eb8246076`: the merge.
    - The migration order: 500's two 20261117 migrations before 491's 20261118. Nothing shared: raw traces versus
      definition folders.
    - 492 DEC-001 supersedes FU-030 SIR-001: `otherTaskRefusal` is removed and its tests and fixtures take 492's side.
    - 492's running agents use 500's run-agent names.
    - `list_running_agents` takes the host's `PeerDiscoveryAccess` (FU-011); there is no `findProcessPeerDiscoveryChannel`.
    - 492's peer-run acceptance uses 500's standalone names.
    - The baseline is shrunk by 1.
    - Detail in the handoff, "IR-009: 491 and 492".
  - `8e8c21c2c4`: the attachment-link registration test allows later-dated unreleased migrations after the pair.
- **Process note:** my first merge commit left the post-resolution edits unstaged (the renames in 492's files, the
  delivery fix, the two tests, the baseline). The checks had run on the working tree, which had them. Before anything
  was pushed, I amended them into the merge (now `5eb8246076`) and replayed the test fix and the docs on top. The rebuilt
  tree equals the old tip plus exactly those edits (diffed), and the type gate passes on the committed state.
- **Focused validation:** IMP-26.
  - Both type gates pass.
  - Server: 8937 passed. After the registration test's fix, only OS file-event waits fail; the watcher labels them.
  - Web: 5780 passed.
  - No changed source file is over 500.
- **Limitations:**
  - E2E suites for messaging (local and peer, by run id) and for the startup migration order on the merge are API/E2E's
    next round.
  - FU-500-02 still covers `getProcessRunningAgentsListing`, a throwing process getter.

## IR-010 (SR-017 / D-15: migration IDs after v1.5.14-beta.1)

- **Trigger:** the Delivery Engineer's Design Impact (`ab212b4fb1`): v1.5.14-beta.1 released 491's
  `20261118_remove_retired_built_in_agents` ahead of this ticket's two unreleased migrations. Solution Designer SR-017
  (D-15), ARCH-REV-010 Pass.
- **Prior result:** IR-009, Pass (CRR-017 / CRR-018); API-REV-007 Pass. **Current result:** implemented; to source
  review, then API/E2E MO-1 in the users' order.
- **Upstream revisions:** SR-017, ARCH-REV-010. CRR / API-REV / DR: as before.
- **Code delta:**
  - `8a9b1a0aec`: the merge of `origin/personal` after beta.1.
    - The registry-order test resolves to the JSON-reading test, and the hand list is removed.
    - `released-migration-order.json` holds beta.1's 46 IDs.
  - `686f715446`: the two migrations are renamed `20261119_*` and appended after 491's.
    - The follow-up's prerequisite names the new main ID; the backup folder follows the ID.
    - The late-predecessor table lists 491's as `none`.
    - The tests, the startup e2e and the module doc follow.
- **Focused validation:** IMP-27.
  - Both type gates pass.
  - Migration and order tests: 89 passed.
  - Server units, migrations, architecture and release: 8479 passed, 0 failed.
  - Web: 5822 passed.
- **Limitations:** the gated startup e2e and MO-1 in the users' order (491 first, then ours) are API/E2E's.
