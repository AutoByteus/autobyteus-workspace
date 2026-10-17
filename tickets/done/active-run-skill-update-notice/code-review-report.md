# Code Review Report — `active-run-skill-update-notice`

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5, delivery re-entry: IR-004 / DR-001). Earlier rounds are kept below for history.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved SR-003; Solution Designer within the direction, user informed)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `follow-up-tasks.md` (FT-1…FT-3); `implementation-evidence/` (rendered checks)
- Relevant Solution Revision IDs: SR-001…SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003 Pass; N-1; residuals R-1, R-4, R-5, compaction-recovery identification)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001…ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: 5
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): IR-004 (`f977849b2`) changes only `seen-skill-versions-store.ts`, `run-skill-tracker.ts`, `skill-update-notices.ts` (close order), the module doc and the notice tests. No port, spine or shared contract changed; the `AgentRun` side is untouched.
- Delivery Revision Record Reviewed: `delivery-revision-record.md` (DR-001); `release-deployment-report.md` § Escalation / Reroute
- Relevant Delivery Revision IDs: DR-001
- Trigger: IR-004 local fix for DR-001 (a seen-versions write outliving release/close and re-creating a deleted run's memory folder; flaky integration teardown `ENOTEMPTY`) from `/software_engineering_team/implementation_engineer` (`f977849b2`, `141268a74` on delivery head `98360b8a3`)
- Prior Review Round Reviewed: 4 (CRR-004, Pass); test review CRR-005 Pass
- Latest Authoritative Round: 5
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record: N/A
- Failing Scenario IDs: APE-001 (QR-002, REQ-012, AC-008 handle release, DS-001 run end → watch set re-synced)
- Exact Failing Commands / Execution Mode: `node ../tickets/in-progress/active-run-skill-update-notice/api-e2e-evidence/ape-001-unwatch-probe.mjs $PWD/dist` from `autobyteus-server-ts` (temp folder only). Desktop isolated instance with the user's 5 skill sources registered read-only (72 skills).
- Failure Evidence Paths: `api-e2e-evidence/ape-001-unwatch-probe-output.json`, `api-e2e-evidence/desktop/meas-001-fd-samples.txt`
- Branch / commits reviewed: `codex/active-run-skill-update-notice` at `4bd93a32f` (round 2 delta `d32e55270`; round 1 at `31b609fca`) (base `origin/personal@6473e2694`; `5718c1301` autobyteus-ts, `02c1d8b92` server, `28fdf1d36` web, `31b609fca` ticket docs)
- Project design guidance applied: root `DESIGN.md` (Mandatory Rule 3: justify critical-path dependencies); `TESTING.md`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change touches `AgentRun` dispatch (every input of every runtime), adds a new watcher lifecycle and per-run persisted state, and spans the native core, server and web.

## Review Scope

- Changed implementation and behavior reviewed:
  - **autobyteus-ts:** `platform-input-preface-metadata.ts`, `memory-ingest-input-processor.ts`, `memory-manager.ts`, `agent-turn.ts`, `llm-request-assembler.ts`, `llm-phase.ts`.
  - **Server `agent-execution`:** `agent-run.ts`, `agent-run-input-preface.ts`, `agent-run-input-preface-dispatch.ts`, `agent-run-lifecycle-observer.ts`, `system-task-notification-senders.ts`, `agent-run-manager.ts`, `agent-run-activation-operation.ts`, `agent-run-resource-manager.ts`, `general-process-run-supervisor.ts`.
  - **Server `src/skill-update-notices/**`:** the service, tracker, builder, diff, watcher, snapshotter, ignore rules, store and composition.
  - **Elsewhere on the server:** `runtime-memory-event-accumulator.ts`; the studio and standalone compositions.
  - **Web:** `SystemTaskNotificationSegment.vue` and localization.
- Files / areas reviewed: as above. The application execution scope kernel builder was read to check the activation-point premise.
- Reruns:
  - autobyteus-ts `tests/unit/agent/platform-input-preface-memory.test.ts`: 5/5.
  - Server `agent-run-input-preface`, `skill-update-notices`, `agent-run-manager`, `agent-run-resource-manager` and `runtime-memory-system-task-notification` unit tests, plus `tests/integration/skill-update-notices`: 8 files, 75 tests pass.
  - Server `typecheck`: clean.
- Explicit exclusions: the gated live E2E suites (not rerun; reported passing), the AC-010 desktop journey and ACP/Grok live (left to API/E2E).

## Round 5 — DR-001 Delta Verification (IR-004)

- **Store:** `SeenSkillVersionsStore.write(owner, versions, shouldContinue)` returns `written | folder_missing | aborted`.
  - It never creates the memory folder: the `mkdir` is removed, the folder is checked with `stat`, and the temp file is opened with `wx`, so ENOENT gives `folder_missing`.
  - `shouldContinue` is checked before the folder check, before the temp write and before the rename.
  - The temp file is always removed (`finally`).
- **Tracker:**
  - A run's writes are serialized (`chain`).
  - `folder_missing` is retried while the run is tracked (1 s, 5 s, 15 s, then every 60 s; injectable). The reason is sound: external runtimes create the folder with their first trace, which can be after tracking.
  - `untrackRun` makes `isCurrent` false, cancels the retry and drops the run's write state, so an in-flight write aborts before its next step.
  - `close()` cancels retries and awaits every held promise.
  - Tracking now matches on the run object (`tracking: runId → {run, promise}`), so an older tracking cannot install a stale run after release and re-track.
  - `loadRun` no longer awaits the first write (`void persist`). `whenTracked` therefore resolves on the known state, and later records stay ordered through the chain.
- **Composition:** `close()` closes the watcher, then the service, then awaits the tracker.
- **Docs:** `docs/modules/skill_update_notices.md` states the no-create / retry / release rule and the awaited close, matching the code.
- **Candidate C-08, rejected:** a run-history delete (`rm` of the memory folder) running during the same in-flight temp-file write syscall right after release. The timing is artificial, since a user terminates a run and deletes it seconds apart, and every step after the syscall re-checks the guard and removes the temp file.
- **Accepted limitation:** a run whose memory folder never appears while tracked has no record; on restore it is treated as "no record" (the approved acceptable loss).
- **Reruns (round 5):**
  - Server `vitest run tests/unit/skill-update-notices tests/integration/skill-update-notices` **×5 consecutive**: 37/37 each time (the DR-001 flake did not reproduce).
  - Server `typecheck`: clean.
  - Sizes: `run-skill-tracker.ts` 233 and `seen-skill-versions-store.ts` 111 effective lines.

## Round 4 — CR-005 Delta Verification (IR-003)

- **CR-005, resolved.** `SkillFolderWatcher` now keeps one watch per skill folder (`WatchedFolder {ignore, watch}`), created by `SkillFolderWatchFactory(skillDir, {ignored})` (production: `chokidar.watch(skillDir, …)`).
  - `syncWatchedFolders` closes the watch of every folder that left the set and drops its pending change. Folders still in use keep their watch, so there is no gap.
  - `unwatch` is no longer used.
  - Events from a just-closed watch are dropped, because the folder is no longer in `watched`.
  - `close()` closes every watch and awaits all pending closes.
  - The doc comment explains why (chokidar's `unwatch` only mutes nested watches).
  - The `ignored` callback falls back to the folder's own rule while the folder is being registered.
- **Tests:**
  - **unit, fake factory:** a watch per folder, a removed folder's watch closed, pending dropped, re-watch creates a new watch, `close` closes all;
  - **unit, real chokidar:** two folders; macOS asserts descriptor release (removing one folder frees at least 20; the empty set returns to baseline); the kept and re-watched folders still report changes. Per the handoff, it fails on the IR-002 watcher.
  - **integration:** AC-008 and R-5 assert that each folder's watch closes when its last run ends.
- **Reruns (round 4):**
  - Server `vitest run tests/unit/skill-update-notices tests/integration/skill-update-notices`: 4 files, 33 tests pass, including the real-chokidar descriptor test on macOS.
  - Server `typecheck`: clean.
  - The implementer's probe output on a build of `53074d2ac` (`implementation-evidence/cr-005-unwatch-probe-output.json`): `afterWatch 31 → afterSyncEmpty 0 → afterRewatch 31 → afterSecondSyncEmpty 0 → afterClose 0`. The local `dist` predates the fix, so I did not rerun the probe; the unit test covers the same assertion. API/E2E reruns APE-001, including desktop handle samples.
- Linux: the real-chokidar test asserts closed watches rather than descriptors (inotify uses one descriptor per process). Linux inotify-watch release is left for API/E2E, if a Linux run is available.

## API/E2E Failure-Origin Review (Round 3) — APE-001

### Failure context

- Approved behavior still represented: **Yes**.
  - QR-002: "handles released when no run uses a skill".
  - REQ-012: watching starts and stops as runs start, restore and end.
  - AC-008: "`X` watching stops after its last run ends".
  - DS-001: run end → `untrackRun` → watch set re-synced.
  - The watcher's own doc comment: "Handles are released when a folder is no longer used".
- Supported scenario: runs end routinely (a terminated chat, a delegated copy shut down after idle, team/org teardown), so this is a Supported Normal Scenario. The trigger is real: the API/E2E desktop journey terminated a real `ALL_INSTALLED` chat.

### Reproduction (reviewer)

- I ran the probe against the built `dist`; the watcher source is unchanged since IR-001.
- Result: `{"before":0,"afterWatch":31,"watched":1,"afterSyncEmpty":31,"watchedAfterSync":0,"afterRewatch":31,"afterSecondSyncEmpty":31,"afterClose":0}`.
- The logical registry empties, but all 31 OS handles stay open until `close()`.

### Origin

- **Implementation defect (Local Fix).**
  - `SkillFolderWatcher.syncWatchedFolders` (`monitor/skill-folder-watcher.ts:68–82`) releases removed folders with chokidar `unwatch(removed)` on a single shared chokidar instance.
  - In chokidar 4 (`node_modules/chokidar/index.js:365–389, 746–760`), `unwatch(path)` calls `_closePath(path)`. That closes only the closers registered for **that exact path**; descendant directory and file watchers are just added to `_ignoredPaths`, recursively.
  - So every nested `fs.watch` handle stays open, and events are suppressed rather than released.
  - Re-adding the same folder clears the ignore entry (`add` → `_removeIgnoredPath`) and reuses the existing handles, so events resume correctly. The defect is only the missing release.
- **Consequence:**
  - Open handles accumulate up to the union of skill folders used during the process lifetime: about 1 per non-ignored entry, and inotify watches on Linux.
  - Desktop evidence: one `ALL_INSTALLED` chat added +703 handles, and 1,005 were still held 60 s after it was terminated.
  - It is bounded, because re-watching adds nothing, but it contradicts QR-002, and each `ALL_INSTALLED` run pins every installed skill folder for the rest of the process.
- **Not the origin:** the design (it states release), the requirements, the test or the environment. The probe touches only its own temp folder.

### Earlier review gap

- Limited. Rounds 1–2 accepted "unwatches folders no longer used" from the `unwatch` call. The release depends on undocumented runtime behavior of the dependency, which source review alone does not reveal.
- However, the available evidence did not prove release:
  - R-5 measured handle release only on `close()`;
  - the AC-008 test checks the logical registry only.
- Review should have flagged that missing OS-level release evidence.
- Affected round-2 score rationale: **Runtime Correctness** (QR-002 release unmet).

## Round 2 — IR-002 Delta Verification

- **CR-001, resolved.**
  - `SkillUpdateNoticeService.runPublished` adds `restore` / `platform_restore` runs (keyed by the run object) to `restoring`, and clears them when tracking settles (`finally`) or on close.
  - `takePreface` awaits tracking only for runs in `restoring`. Otherwise it reads `getTrackedRun` directly and returns only an already pending notice. A new run's first input is never delayed.
  - A restored run's dirty marking happens in the tracking `then`, before the `finally` deletion, so its first input still carries the notice.
  - Tests: "a new run's first input is dispatched at once, while its skills are still being scanned" and "a restored run's first input waits for its check…" (gated snapshotter, real `AgentRun`).
- **CR-002, resolved.**
  - `RunUsedSkillsResolver` now returns a `RunSkillSource` bound once, at tracking, to the definition read then (`skill-update-notices.ts`).
  - `refreshSkillDirs` resolves that definition through the current catalog (now synchronous). "Removed" therefore means the name no longer resolves to an installed skill, independent of later definition edits or deletes.
  - Test "CR-002: an active run keeps the definition it was activated with…" covers both an edit (skill dropped) and a delete; neither reports "no longer available", and the folders stay watched. Per the handoff, it fails if the per-refresh definition read is restored.
- **CR-003, resolved.** `ingestSystemTaskNotification` is removed and the ingest processor uses the existing public `appendRawTrace`. `memory-manager.ts` is 495 effective lines (base 494).
- **CR-004, resolved.** The `settlePreface` call and the misleading comment are removed from `reconcileUncertainDispatch`.
- **Reruns (round 2):**
  - autobyteus-ts `platform-input-preface-memory.test.ts`: 5/5.
  - Server `agent-run-input-preface`, `skill-update-notices` unit, `agent-run-manager`, `runtime-memory-system-task-notification` and `tests/integration/skill-update-notices`: 7 files, 74 tests pass.
  - Server `typecheck`: clean.
- **New observation R-1 (non-blocking):** `SkillUpdateNotices` now also exposes `tracker`, and only the integration test uses it (`world.subsystem.tracker.whenTracked`). It is a test-only field on the subsystem's public shape. No production caller bypasses the service, so it does not block. Prefer awaiting through the service or a test helper and dropping the field in a later cleanup.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-003; DEC-001…DEC-011).
- Design-spec behavior map verified against the implementation:
  - DS-001…DS-004 are implemented.
  - DS-002's re-resolution deviates from DEC-011 (CR-002).
  - DS-003 adds an unjustified wait on new runs (CR-001).
- Design review report and round confirmed: ARCH-REV-003 Pass.
  - **N-1 honored:** `MemoryIngestInputProcessor` records the trace IDs on `AgentTurn`, and `llm-phase` passes `turn.inputRawTraceIds` to `LLMRequestAssembler`. They are not recomputed; the unit test passes.
  - **Compaction recovery:** identified by `ClaimedInputDispatch.recovery` and excluded in `canCarryPreface`.
- Behavior-basis status: `Confirmed`. Defects CR-001 and CR-002 are implementation deviations; the basis itself is not contradicted.
- Changed or newly discovered behavior: None (see C-06 on application execution scopes).
- Remaining material ambiguity: None blocking.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed (defect CR-002) | Watcher (used folders only, ignore list plus `.gitignore`, 1000/3000 ms) → `onSkillFoldersChanged` → `runsWithSkillsAt` → `refreshSkillDirs` → `computeNotice` (snapshot plus digest diff). Re-resolution reads the run's **current** agent definition (CR-002) | — |
| BEH-002 | Confirmed | `deliverIfBusy` (`status === "running"`) → `postUserMessage(SYSTEM notice)` → lifecycle `forwarded` → event plus `recordSeen`; failed/cancelled/not accepted → pending | — |
| BEH-003 | Confirmed (defect CR-001) | `executeInputDispatch` → `canCarryPreface` → `takePreface` → `combinePreface` → backend → `settle` (forwarded → delivered plus event; otherwise returned). Restore: `runPublished(kind)` marks every used name dirty and the stored record is diffed. New runs: the first input awaits full tracking (CR-001) | — |
| BEH-004 | Confirmed | `SYSTEM_TASK_NOTIFICATION` (sender `system.skill_update_notifier`). External history: the forwarded observer carries the admitted original (composed at admission), and the accumulator allow-lists the sender and skips notice-only user traces. Native: separate `system_task_notification` trace plus the original user trace. Web label "Skill updated" | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-006 / SCN-002 (new delegated copy) | REQ-005, DESIGN.md Rule 3 | User/System | PTM `delegate_task` | Spawn a copy and give it work | Activation → publish → first input dispatch | Normal | `beginActivation` → `onPublished` → `runPublished` → `trackRun` (resolve plus snapshot of every used skill plus persist) ‖ first input → `executeInputDispatch` → `takePreface` → `await whenTracked` | First input dispatched without waiting on unrelated work; a new run has no pending notice | Requirements SCN-006; `skill-update-notice-service.ts:90–96`; `run-skill-tracker.ts:120–140` | Supported Normal Scenario | Use (CR-001) |
| SCN-001 plus an agent definition edit or delete during the run | REQ-009, DEC-011; preserved boundary (agent-package-auto-refresh: running runs keep their definition) | User/System | Agent Package Creator / user | Improve packages (agents and skills) while runs are active | Definition file edited/removed (supported by agent-package-auto-refresh REQ-012/AC-008), later a used skill folder changes | Normal | `onSkillFoldersChanged` → `refreshSkillDirs` → `resolveUsedSkills` → `getAgentDefinitionById(current)` → `resolveConfiguredSkillsForAgent` (null definition → `[]`; edited → fewer names) → name → null → `diffSkillVersion(seen, null)` → "removed" | Notice only for real changes; "no longer available" only when the name no longer resolves to an installed skill | `skill-update-notices.ts:39–44`; `run-skill-tracker.ts:86–100`; `skill-service.ts:244–263` (null → `[]`) | Supported Normal Scenario | Use (CR-002) |
| SCN-001…005 | REQ-001…013 | System | — | As approved | As approved | Normal/Edge | As traced above | As approved | Requirements | Supported | Use |
| Application execution scope run using a skill | REQ-001, REQ-011 | System | Application backend | Application agent run | `ApplicationExecutionScope` builds its own `AgentRunManager` without the ports | — | Not tracked | — | Shipped applications configure `skillNames: []`; the default `skillScope` is `CONFIGURED`; requirements list standalone/team/org/delegated runs | Technically Possible but Unsupported (no current evidence) | Reject (follow-up note C-06) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Every new run's first external input waits for full skill tracking | DESIGN.md Mandatory Rule 3; SCN-006 | Any new run receiving its first input (delegation, chat, team member) | `takePreface` awaits `whenTracked` (`service:93`). For a new run that is `loadRun`: resolve the definition, then **sequentially read and SHA-256 every non-ignored file of every used skill** (cold cache), then write `seen_skill_versions.json`. A new run never has a pending notice (state is created only by a later change or by restore). The added latency scales with used-skill file volume; `ALL_INSTALLED` runs hash every installed skill | Code read | Promote | CR-001: wait only when the run has a pending check (restore/platform_restore) or existing state |
| C-02 | Re-resolution of a run's skills uses its current agent definition | REQ-009, DEC-011, preserved agent-package-auto-refresh behavior | Agent definition edited or deleted while the run is active, then any change in one of its skill folders (both steps part of the self-improvement loop) | False "no longer available" for still-installed skills (all skills if the definition was deleted), and the real update is not reported | Code read; `resolveConfiguredSkillBindingsForAgent(null)` returns `[]` | Promote | CR-002: re-resolve the tracked names independently of later definition edits (DEC-011: re-resolve the name) |
| C-03 | `memory-manager.ts` crosses the 500-line hard limit (494 → 512 effective lines); the handoff states all files stayed within guardrails | Source-size rule (changed implementation source) | — | — | Line count at base and head | Promote | CR-003 (Low) |
| C-04 | `reconcileUncertainDispatch` settles a preface, and a comment claims a preface stays in flight until reconciliation, yet only recovery dispatches become uncertain and they never carry a preface | Core Principle 7 | — | Unreachable branch plus misleading comment | `agent-run.ts` uncertain path guarded by `input.recovery`; `canCarryPreface` excludes recovery | Promote | CR-004 (Low) |
| C-05 | Busy notice tagged notice-only (`original_content: null`); no `turn_id` on AutoByteus events | BEH-004, REQ-007 | — | Keeps history at one system notice on every runtime; `turn_id` is unused by web and native history | Code; handoff Known Risks 1–2 | Reject (accepted) | Consistent with the generic convention; no consumer harmed |
| C-06 | Application execution scope runs are not tracked (separate `AgentRunManager`) | REQ-001/011 | Application agent run with skills | Not notified | Kernel builder builds its own manager without ports | Reject (as finding) | No supported evidence that application runs use skills today. Recorded as a follow-up note for the Solution Designer, because the design's "single activation point" premise holds per manager only |
| C-07 | Re-delivery is at least once on an uncertain non-recovery dispatch; R-4 busy race | REQ-013, R-4 | — | At most one repeat or one extra turn | Handoff Known Risks 5; design R-4 | Reject (accepted) | Bounded and accepted upstream |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | One preface port in `AgentRun`; one lifecycle observer at the publish and release points; the subsystem uses public run APIs | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None behavior-defining | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-004 map to tracker / watcher→service / `AgentRun` dispatch / event→adapters and memory | — |
| Ownership boundary preservation and clarity | Pass | `agent-execution` has no import of `skill-update-notices`; the tracker is the only seen-versions writer | — |
| Off-spine concern clarity | Pass | Ignore rules, snapshotter and builder serve their owners | — |
| Existing capability/subsystem reuse check | Pass | `postUserMessage`, the system-notice event and trace, `GitIgnoreStrategy`, the chokidar settle pattern | — |
| Reusable owned structures check | Pass | Generic `platform_input_preface` tag shared by core and server | — |
| Shared-structure/data-model tightness check | Pass | Dedicated `skill_update_notice` marker; task-delegation metadata not widened | — |
| Repeated coordination ownership check | Pass | Prefacing lives once in `AgentRun` dispatch, not in the roughly 8 producers | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Preface mechanics extracted to `agent-run-input-preface-dispatch.ts` | — |
| Ownership-driven dependency check | Pass | Allowed directions only | — |
| Authoritative Boundary Rule check | Pass | The service uses `AgentRun` public methods only | — |
| File placement check | Pass | `domain/services/providers/monitor` layout | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Port methods singular, with explicit identity | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Names say what each piece is; one misleading comment (CR-004) | CR-004 |
| No unjustified duplication of code / repeated structures in changed scope | Pass | `SKILL_UPDATE_NOTICE_SENDER_ID` and the header are duplicated as literals in the web (separate package; acceptable) | — |
| Patch-on-patch complexity control | Pass | Initial implementation | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | The unreachable preface settlement in `reconcileUncertainDispatch` | CR-004 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Unit (preface dispatch 8 cases, parts, watcher), integration (AC-004…AC-008, native history), gated E2E | Add tests with CR-001 and CR-002 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Fail | CR-002 produces wrong notices in the self-improvement loop the AC-010 journey exercises; CR-001 adds latency to every delegated copy's first input | CR-001, CR-002 |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | 512 (base 494; +18) | **Fail** | Small delta | The new method fits the owner | Pass | Size pressure | CR-003 |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | 477 | Pass | +8 | Pass | Pass | Acceptable | — |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 423 | Pass | +1 | Pass | Pass | Acceptable | — |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | 415 | Pass | +23 (mechanics extracted) | Pass | Pass | Acceptable | — |
| `skill-update-notices/services/skill-update-notice-service.ts` | about 220 (new) | Pass | New file | One owner (DS-002/003) | Pass | Acceptable | — |
| Other changed files | < 390 | Pass | Small | Pass | Pass | Acceptable | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Pure addition |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | CR-004 |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Additive `seen_skill_versions.json`; tolerant read; atomic write; file kept on release, in-memory record forgotten for runs without a memory folder |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `agent-run.ts` `reconcileUncertainDispatch` → `this.settlePreface(input, turnId)`, plus the comment "A preface stays in flight until reconciliation proves the dispatch forwarded" | `DeadCode` | Only `input.recovery` dispatches enter the uncertain path; `canCarryPreface(isRecoveryDispatch=true, …)` is always false, so `input.preface` is null there | An unreachable branch, and a comment describing behavior that cannot happen | Remove both (CR-004) |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new platform behavior (skill update notices for active runs), the new per-run file `seen_skill_versions.json`, the "Skill updated" label, and the runtime-dependent delivery (mid-turn versus next turn).
- Files or areas likely affected: server docs for agent execution and memory (or a new `skill_update_notices` module doc); web conversation docs; the skills docs.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-005 (native history) | Confirmed | Implemented per SR-004 with N-1 |
| R-1, R-4, R-5, compaction recovery | Confirmed | Per handoff; recovery guard verified in code |

### `CR-P-01` — Agent definition edited or deleted while a run that uses skills is active, followed by a skill folder change

- Origin: `New`
- Related approved requirement or established contract: REQ-009 ("no longer available only when its name no longer resolves to an installed skill"); DEC-011 (re-resolve the **name** through the skill catalog); preserved boundary: agent-package-auto-refresh (running runs keep their definition).
- Relevant behavior ID(s): BEH-001
- Coherent product goal or governing event: the self-improvement loop. The Agent Package Creator edits agent definitions (removing or adding skills, or retiring agents) and skills while runs are active.
- Scenario validity: `Supported Normal Scenario`. agent-package-auto-refresh supports definition edits and deletes with active runs (its REQ-012/AC-008), and this ticket's SCN-001/SCN-006 support skill changes with active runs.
- Initiating basis kind: `User` / `System`
- Independent trigger: a definition file is edited or deleted on disk; later a used skill folder changes.
- Forward path: `onSkillFoldersChanged` → `tracker.refreshSkillDirs(runId)` → `resolveUsedSkills(run)` → `agentDefinitionService.getAgentDefinitionById(run.config.agentDefinitionId)` (current or null) → `resolveConfiguredSkillsForAgent` (null → `[]`) → tracked name → `null` → `diffSkillVersion(seen, null)` → `removed`.
- Lifecycle preconditions and material consequence:
  - The run still has the skill advertised and installed.
  - It is told "no longer available. Do not rely on a skill that is no longer available", which contradicts REQ-009.
  - The actual content update of that skill is never reported.
  - With a deleted definition, every used skill is reported removed.
- Reachability: `Reachable`
- Review consequence: CR-002 (Local Fix).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3 (round 2)
- Overall score (`/100`): 93
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.3 | DS-001…DS-004 directly visible | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.2 | Generic ports; public run APIs only; the tracker is the sole seen writer | The test-only `tracker` field on the subsystem shape (R-1) | Drop it later |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | `RunSkillSource` makes "resolved with the activation definition" explicit | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | Unchanged | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Reuses the public `appendRawTrace` instead of a new wrapper | — | — |
| `6` | `Naming Quality and Local Readability` | 9.2 | The misleading comment is removed | — | — |
| `7` | `API/E2E Readiness` | 9.2 | Integration covers both CR fixes; the gated live Codex/Claude suites and scripted AGY are reported passing after the fixes | AC-010 desktop journey and ACP/Grok live are pending (expected) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.2 | Round 4: per-folder watches release OS handles when the last run ends (QR-002), verified by the real-chokidar descriptor test; earlier correctness unchanged | Accepted residuals R-4 and at-least-once on uncertain dispatch | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Pure addition | — | — |
| `10` | `Cleanup Completeness` | 9.2 | Dead branch removed; size back under the limit | R-1 test-only field | Optional |

## Findings

### CR-005 — Watch handles are not released when the last run using a skill ends (Medium) — **Resolved (round 4, IR-003)**

- Source: APE-001 failure-origin review (CRR-003). Contract: QR-002, REQ-012, AC-008, DS-001.
- Evidence: § API/E2E Failure-Origin Review (Round 3); `skill-folder-watcher.ts:68–82`; chokidar 4 `unwatch` / `_closePath` semantics; reviewer reproduction; desktop file-handle samples.
- Required action (Local Fix):
  - Release the OS handles of a folder that is no longer used, while keeping uninterrupted events for folders still in use.
  - **Preferred:** one chokidar instance per watched skill folder, closed when that folder leaves the watch set. This releases exactly that folder and creates no watch gap for others. 72 instances for `ALL_INSTALLED` is proportionate.
  - **Alternative:** close and recreate the single instance with the remaining folders. Writes during the recreation window are not reported, so if you choose it, state that trade-off.
  - Update the doc comment to match.
  - Add a durable test on real chokidar: after `syncWatchedFolders([])` the folder's handles are released (or the per-folder watch is closed), and a re-watched folder still reports changes.

### CR-001 — Every new run's first input waits for full skill tracking (Medium) — **Resolved (round 2)**

- Candidate: C-01. Contract: DESIGN.md Mandatory Rule 3 ("Justify critical-path dependencies and global work"); REQ-005 (the notice rides with the next input without changing it).
- Evidence:
  - `skill-update-notice-service.ts:90–96`: `takePreface` awaits `tracker.whenTracked(run.runId)` before checking for pending state.
  - `run-skill-tracker.ts:120–140`: `loadRun` resolves the definition, then reads and hashes every non-ignored file of every used skill one after another, then writes `seen_skill_versions.json`.
  - `takePreface` is called from `AgentRun.executeInputDispatch` for every external input.
  - A **new** run cannot have a pending notice: state is created only by a later folder change (tracked runs only) or by restore.
  - So every new run's first input (every delegated copy in SCN-006, every new chat and team member) waits on hashing it never needs. For `ALL_INSTALLED` runs this covers every installed skill, with a cold digest cache for the first run.
- Required action (Local Fix):
  - Wait for tracking only when the run can have a pending notice: a restore or platform-restore activation, or existing state. Otherwise return `null` at once, and let tracking finish in the background.
  - Add a unit test: with a slow snapshotter, a new run's first dispatch is not delayed, while a restored run's first input still carries its notice.

### CR-002 — Re-resolution uses the run's current agent definition: false "no longer available" and missed updates (Medium) — **Resolved (round 2)**

- Candidate: C-02; premise CR-P-01. Contract: REQ-009, DEC-011, and the preserved agent-package-auto-refresh behavior (running runs keep their definition).
- Evidence:
  - `skill-update-notices.ts:39–44` resolves a run's skills from `getAgentDefinitionById(run.config.agentDefinitionId)` (the current definition) every time.
  - `refreshSkillDirs` (`run-skill-tracker.ts:86–100`) sets every tracked name missing from that result to `null`, and `diffSkillVersion(seen, null)` then reports it removed.
  - `resolveConfiguredSkillBindingsForAgent(null)` returns `[]` (`skill-service.ts:259–263`). After a definition delete, which agent-package-auto-refresh supports for active runs, every used skill is reported "no longer available" on the next change to any of the run's skill folders.
  - After an edit that removes a skill name, that still-installed skill is reported removed instead of updated.
- Required action (Local Fix):
  - Re-resolve the run's tracked **names** independently of later definition edits. For example, keep the definition the run was tracked with (what its runtime resolved at activation) and resolve with it, or resolve the names through the skill catalog with the same precedence.
  - "Removed" must mean that the name no longer resolves to an installed skill.
  - Add an integration test: the definition is edited (skill removed from the list) or deleted while the run is active, then a used skill changes. Expect an "updated" notice with no false removal.

### CR-003 — `memory-manager.ts` crosses the 500-line hard limit (Low) — **Resolved (round 2)**

- Candidate: C-03.
- Evidence: 494 effective lines at base, 512 now (`ingestSystemTaskNotification` plus doc comments, and `ingestUserMessage` now returns the trace ID). The handoff states that changed files stayed within the guardrails.
- Required action: bring the file back to 500 lines or fewer without losing the owner's API. For example, trim the added doc comments, or record the trace through the existing public append path if appropriate. Alternatively, record a justified split decision. Correct the handoff statement.

### CR-004 — Unreachable preface settlement in uncertain-dispatch reconciliation (Low) — **Resolved (round 2)**

- Candidate: C-04. Contract: Core Principle 7.
- Evidence:
  - In `agent-run.ts`, only `input.recovery` dispatches take the uncertain path.
  - `canCarryPreface` returns false for recovery dispatches, so `input.preface` is always null in `reconcileUncertainDispatch`.
  - The `settlePreface` call there, and the comment "A preface stays in flight until reconciliation proves the dispatch forwarded", describe behavior that cannot happen.
- Required action: remove the call and the comment. The forwarded/returned settlement after the dispatch already covers every preface-carrying dispatch.

### Non-blocking notes

- **C-06 (for the Solution Designer, follow-up):**
  - Application execution scopes build their own `AgentRunManager` (`application-execution-scope-kernel-builder.ts:127`) without the ports, so their runs are not tracked.
  - The design's "single activation point" premise holds per manager only.
  - No current evidence that application agents use skills (shipped apps declare none; the default scope is `CONFIGURED`). It is already recorded by the implementer as a follow-up; confirm it is out of scope or schedule it.
- The `ALL_INSTALLED` cost (R-5) was measured on a synthetic 60-folder set. API/E2E should record the watch count and first-snapshot time against a realistic installed-skill set.

## Classification

- Round 5: N/A (Pass). DR-001 resolved.
- History:
  - round 4: Pass (CR-005);
  - round 3: failure-origin `Local Fix` (CR-005);
  - round 2: Pass;
  - round 1: `Local Fix` (CR-001…CR-004).

## Recommended Recipient

- Primary: `/software_engineering_team/api_e2e_engineer`. An implementation-owned fix returns through API/E2E: rerun the affected validation (notice integration ×N, the scripted AGY roots and transport E2E that depend on the seen record), then send any test changes for proportional review before delivery re-integration.
- Informational: `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-010 desktop journey, ACP/Grok live, and a live multi-member or delegated-restore case are left to API/E2E.
- Agent compliance with the re-read instruction is a non-goal; it was observed live on three runtimes.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, Targeted Delta Review; delivery re-entry DR-001)
- Supported Product Scenario Gate: `Pass` (release then delete of a run is a supported normal lifecycle; C-08 rejected)
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category ≥ 9.0 (round-4 scores stand; Runtime Correctness 9.2 now also covers the release/close write rule)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (primary); `/software_engineering_team/implementation_engineer` (informational)
- Notes:
  - IR-004 test changes (3 integration cases, 2 store unit cases, folder-creating fakes) need proportional test review after the API/E2E rerun.
  - R-1 and C-06 remain non-blocking.
