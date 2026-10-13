# Implementation Handoff — `active-run-skill-update-notice`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High). ARCH-REV-003 **Pass** (SR-004) with mandatory note N-1 and residuals R-1, R-4, R-5 and compaction-recovery identification. Route after implementation: source review (Large/High), then API/E2E. Exact recipient from `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/solution-revision-record.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/solution-handoff.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-spec.md` (SR-004)
- Supplemental task artifacts: `follow-up-tasks.md` (FT-1…FT-3, user-requested); rendered-check screenshots in `implementation-evidence/`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `code-review-report.md` and `code-review-revision-record.md` (CRR-001, Fail — Local Fix: CR-001…CR-004), resolved in IR-002.

## Current Implementation Summary

- Implementation cycle: `Local Fix` (CRR-001)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 baseline; IR-002 CRR-001 local fixes)
- Related solution revision IDs: `SR-001`…`SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`…`ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`; API/E2E / delivery: `N/A`
- Triggering finding IDs: `CR-001`, `CR-002`, `CR-003`, `CR-004` (review note N-1 and residuals R-1, R-4, R-5 still honored)

## CRR-001 Resolution (IR-002)

| Finding | Fix | Test / evidence |
| --- | --- | --- |
| CR-001 (Medium) — a new run's first input waited for full skill tracking | `SkillUpdateNoticeService` waits for tracking only for a run published as `restore` / `platform_restore` (a `restoring` set keyed by the run object, cleared when its tracking settles). Any other input takes only a notice already pending, so a new run's first input never waits; its tracking finishes in the background | Integration, gated snapshotter + real `AgentRun`: a new run's first input is dispatched unchanged while its skills are still being scanned; a restored run's first input waits for its check and carries the notice. The new-run test fails when the unconditional wait is restored (checked) |
| CR-002 (Medium) — re-resolution read the run's current agent definition | The tracker binds each run to a `RunSkillSource` when it is tracked: the agent definition read at tracking (a copy), resolved through the **current** catalog on every re-resolution. Editing or deleting the definition no longer changes what an active run uses; "removed" now means the name no longer resolves to an installed skill. A restored run is tracked with the definition it is restored with | Integration: drop a skill from the definition, then delete the definition, while the run is active → both later changes are reported as updated, never "no longer available", and both folders stay watched. Fails when re-resolution re-reads the definition (checked). The integration world now separates definitions (names) from the catalog (installed folders); AC-005 moves and uninstalls through the catalog |
| CR-003 (Low) — `memory-manager.ts` over 500 effective lines | `ingestSystemTaskNotification` removed; the ingest processor uses the existing public `appendRawTrace`. `memory-manager.ts` is 495 non-blank lines (494 at base) | autobyteus-ts unit 299 files / 2023 tests pass |
| CR-004 (Low) — dead preface settlement on the uncertain path | The `settlePreface` call in `reconcileUncertainDispatch` and the comment are removed (only recovery dispatches become uncertain, and they never carry a preface) | Preface and `AgentRun` unit tests pass |
- Branch / commits: `codex/active-run-skill-update-notice` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`) on `origin/personal@6473e2694`; commits listed in the revision record (IR-001).

What exists now:

- **`autobyteus-ts` (generic preface convention, no skill knowledge):**
  - `agent/message/platform-input-preface-metadata.ts`:
    - the `platform_input_preface {content, sender_id, original_content}` tag;
    - `readPlatformInputPreface`, which validates the tag;
    - `stripPlatformInputPreface`.
  - `MemoryIngestInputProcessor`: for a tagged input it writes a separate `system_task_notification` trace (through the public `MemoryManager.appendRawTrace`), then the user trace with the original content.
    - A notice-only input (`original_content: null`) writes only the system trace.
    - The trace IDs are recorded on the `AgentTurn` (`recordInputRawTraceIds`).
  - `llm-phase` passes `turn.inputRawTraceIds` to `LLMRequestAssembler.prepareRequest`. The working-context user entry keeps the combined content, linked to both traces through explicit `rawTraceIds` (N-1; not recomputed).
  - `MemoryManager.ingestUserMessage` now returns the trace ID.
- **Server: `agent-execution` (generic ports; no import of `skill-update-notices`):**
  - `domain/agent-run-input-preface.ts`: the `AgentRunInputPreface` port (`takePreface` / `prefaceDelivered` / `prefaceReturned`; `AgentRunPreface {id, text, presentation}`).
  - `domain/agent-run-lifecycle-observer.ts`: `runPublished(run, kind)` / `runReleased(run)`.
  - `domain/agent-run-input-preface-dispatch.ts`:
    - `canCarryPreface`: only external inputs carry a notice; never the compaction-recovery dispatch (`ClaimedInputDispatch.recovery !== null`), a TOOL continuation, or a message that already is or carries a notice.
    - `combinePreface`: one provider message, the notice + `\n\n` + the input unchanged (sender, context files, recording attachments, metadata), tagged with `original_content`.
    - `AgentRunInputPrefaceDispatch`: take and settle; a failing port never affects the input; on delivery it publishes `SYSTEM_TASK_NOTIFICATION {sender_id, content, turn_id}`.
  - `domain/agent-run.ts`: in `executeInputDispatch`, after normalization, a preface is taken and combined into the same dispatch (one dispatch, one turn).
    - It is settled delivered only when the dispatch is forwarded; any other outcome (not forwarded, failed, uncertain, `undeliveredRetryAsStart`) returns it to pending. Recovery dispatches, the only ones reconciled after an uncertain result, never carry a preface.
    - Admission state and backend contract are unchanged.
  - `AgentRunManager`: options `inputPreface` and `lifecycleObserver`. `runPublished(run, request.kind)` is reported from the single activation point (`beginAgentRunActivation` `onPublished`, after `registry.publish`).
  - `AgentRunResourceManager`: `lifecycleObserver.runReleased(run)` after a successful release; every removal path goes through it.
  - `GeneralProcessRunSupervisor`: input `platformInputNotices`, passed to both.
  - `SKILL_UPDATE_NOTICE_SENDER_ID = "system.skill_update_notifier"`.
- **Server: `src/skill-update-notices/` (new):**
  - `providers/skill-folder-ignore.ts`: the REQ-010 list (`.git`, `node_modules`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `dist`, `build`, `.DS_Store`, `*.swp`, `*~`, `.#*`) plus the skill folder's own `.gitignore`.
  - `providers/skill-folder-snapshotter.ts`: relative path → SHA-256, with a size+mtime cache.
  - `providers/seen-skill-versions-store.ts`: `<memoryDir>/seen_skill_versions.json` in the design's shape; atomic write; a missing or invalid file reads as none; in memory for `memoryDir: null`.
  - `services/skill-version-diff.ts`: changed, added and removed files with SKILL.md first; skill removed; same files in a moved folder → none.
  - `services/skill-update-notice-builder.ts`: text per REQ-008 (10 files, then "and N more"; the current SKILL.md path; re-read line; a removal line); the busy-run SYSTEM message; the event.
  - `monitor/skill-folder-watcher.ts`: chokidar, used folders only, 1000 ms quiet / 3000 ms cap, injectable; reports a deleted folder as that folder.
  - `services/run-skill-tracker.ts`: per-run used skills by name, resolved exactly as the runtimes resolve them (`getAgentDefinitionById(config.agentDefinitionId)` → `resolveConfiguredSkillsForAgent`, `ALL_INSTALLED` and application bundles included).
    - Each run is bound to a `RunSkillSource` when tracked: the definition read then, resolved through the current catalog (CR-002).
    - Re-resolution when a folder changes covers a new GitHub source generation (moved) and uninstalled skills (no longer resolves); later definition edits do not affect an active run.
    - Seen versions: a new run records current files; a restore uses the stored record plus newly used names; a missing record is re-created without a retroactive notice.
  - `services/skill-update-notice-service.ts`: implements both ports.
    - **Busy** (`status === "running"`): one `postUserMessage(notice)` with agent-message semantics; forwarded → event + record seen; failed/cancelled/not accepted → pending again (REQ-013).
    - **Idle/restored:** marked and handed to the next input through `takePreface`. Only a restored run's first input waits for its tracking; a new run's inputs never wait (CR-001).
    - **Restore:** all used names are checked against the stored record.
  - `skill-update-notices.ts`: `createSkillUpdateNotices(...)` → `{service, watcher, tracker, close}`; `SkillService` is looked up lazily at first resolution.
- **Compositions:** `build-studio-server.ts` and `start-standalone-application-host.ts` create the subsystem and pass `platformInputNotices`. Close order: notices (watcher → service) before the run supervisor.
- **History:** the `RuntimeMemoryEventAccumulator` records the skill sender's system notices (external runtimes). A forwarded notice-only input (`original_content: null`) is not recorded as a user message. The native runtime records its own traces (above).
- **Web:**
  - `SystemTaskNotificationSegment.vue` shows a "Skill updated" label and aria-label when the sender is `system.skill_update_notifier` or the content starts with the notice header (replayed history).
  - Localization key `workspace.components.conversation.segments.SystemTaskNotificationSegment.skillUpdated` (en "Skill updated", zh-CN "技能已更新").

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The change touches `AgentRun` input dispatch (every input of every runtime), a new watcher lifecycle and new per-run persisted state, as designed.
  - No escalation trigger fired:
    - both append runtimes accepted a SYSTEM input mid-turn;
    - no input path bypasses `postUserMessage` / `reserveUserMessage`;
    - no run metadata or execution-tree schema changed;
    - watch cost is within QR-002 (measured, see R-5).
  - Compaction-recovery inputs are distinguishable at dispatch (`ClaimedInputDispatch.recovery`), so no Design Impact.
- Selected route: `Code Review` (Large/High; targeted delta for CRR-001), then API/E2E. Exact recipient from `get_handoff_rules`.
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Two implementation decisions extend the approved mechanism without changing ownership or contracts; they are listed under Known Risks (items 1 and 2) for the reviewer.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Changes in used skill folders are detected, settled and batched; one notice per run per burst | `SkillFolderWatcher` → `SkillUpdateNoticeService.onSkillFoldersChanged` → `RunSkillTracker.runsWithSkillsAt` / `refreshSkillDirs` → `computeNotice` (`SkillFolderSnapshotter` + `diffSkillVersion`) | Implemented. Unit, integration (AC-004/005/006/007/008) and live E2E pass. |
| BEH-002 | A busy run gets the notice through the agent-message path (append on Codex/Claude; next turn elsewhere) | `deliverIfBusy` → `AgentRun.postUserMessage(buildSkillUpdateNoticeMessage)` → lifecycle `forwarded` → `SYSTEM_TASK_NOTIFICATION` + `recordSeen` | Implemented. Live: Codex and Claude append inside the busy turn (same `turn_id`); AutoByteus next turn; AGY (scripted) next turn. |
| BEH-003 | Idle and shut-down runs are not woken; the notice rides with the next external input in one turn | `AgentRun.executeInputDispatch` → `AgentRunInputPrefaceDispatch.take` → `combinePreface` → backend → `settle`; restore via `runPublished(run, "restore")` and the stored seen record | Implemented. Unit (8 cases including recovery, failure, requeue, reserved), integration (real `AgentRun`), live idle and AGY restore (AC-003), dev-stack restart check. |
| BEH-004 | The notice is a platform system notice in the web and in history, never a user or agent message | `SYSTEM_TASK_NOTIFICATION` (sender `system.skill_update_notifier`) → existing segment + "Skill updated" label. History: accumulator allow-list (external), native `system_task_notification` trace (AutoByteus); the user message is recorded as typed | Implemented. Live projections on 4 runtimes: notices as system notices, user messages as typed; rendered on the dev stack (label, list, replay after restart). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes` (one out-of-scope gap recorded as a follow-up, Known Risks item 3).

## Key Files Or Areas

- `autobyteus-ts`: `src/agent/message/platform-input-preface-metadata.ts` (new), `src/agent/input-processor/memory-ingest-input-processor.ts`, `src/memory/memory-manager.ts`, `src/agent/agent-turn.ts`, `src/agent/llm-request-assembler.ts`, `src/agent/loop/llm-phase.ts`; test `tests/unit/agent/platform-input-preface-memory.test.ts`.
- Server source:
  - `src/agent-execution/domain/{agent-run.ts, agent-run-input-preface.ts, agent-run-input-preface-dispatch.ts, agent-run-lifecycle-observer.ts, system-task-notification-senders.ts}`;
  - `src/agent-execution/services/{agent-run-manager.ts, agent-run-activation-operation.ts, agent-run-resource-manager.ts}`;
  - `src/agent-execution/runtime/general-process-run-supervisor.ts`;
  - `src/skill-update-notices/**` (new);
  - `src/agent-memory/services/runtime-memory-event-accumulator.ts`;
  - `src/compositions/build-studio-server.ts`, `src/standalone-application-host/start-standalone-application-host.ts`.
- Server tests:
  - unit: `tests/unit/agent-execution/agent-run-input-preface.test.ts`, `tests/unit/skill-update-notices/{skill-update-notice-parts,skill-folder-watcher}.test.ts`, additions in `agent-run-manager.test.ts`, `agent-run-resource-manager.test.ts`, `agent-memory/runtime-memory-system-task-notification.test.ts`, and the updated expectation in `standalone-application-host-lifecycle.test.ts`;
  - integration: `tests/integration/skill-update-notices/{skill-update-notice-service,native-skill-notice-history}.integration.test.ts`;
  - E2E (gated): `tests/e2e/runtime/skill-update-notice-live.e2e.test.ts`, `tests/e2e/runtime/agy-skill-update-notice-transport.e2e.test.ts`;
  - fixture: `tests/fixtures/agy-failure-cli.mjs` (`interrupt_resend` gains `HOLD_MS:<n>`, a turn that ends on its own).
- Web: `components/conversation/segments/SystemTaskNotificationSegment.vue` and its spec; `localization/messages/{en,zh-CN}/workspace.ts`.

## Important Assumptions

- "Busy" is `run.getStatusSnapshot().status === "running"` (as designed; R-4 accepted).
- A run's used skills are re-resolved through its own agent definition, so application-owned agents keep their own bundle precedence and disabled skills stay excluded under `ALL_INSTALLED`.
- Team members, org members and delegated copies are activated through the same `AgentRunManager.beginActivation` (`configured-agent-activation-planner.ts`), so they are covered with standalone runs.

## Known Risks

1. **Busy-run notice is tagged as a notice-only preface (extension of the approved mechanism).**
   - The busy-run SYSTEM message carries `platform_input_preface` with `original_content: null`.
   - Without it, DS-004 history would be wrong:
     - native AutoByteus would record the notice as a user trace;
     - external runtimes would record a user message (from the forwarded-input observer) plus the system notice.
   - With it, native writes one `system_task_notification` trace and the accumulator skips the user trace.
   - The same tag makes `canCarryPreface` refuse to put a notice in front of a notice.
2. **AutoByteus notice events have no `turn_id`.**
   - The native backend forwards before its turn starts (`turnId: null`), so the `SYSTEM_TASK_NOTIFICATION` published on delivery omits `turn_id` on AutoByteus. Codex, Claude, AGY and ACP (Grok) return a turn ID; verified live and with the scripted AGY.
   - Effect: none observed. The web attaches the segment to the current AI message without using `turn_id`, and native history records the notice in the native turn itself.
   - Associating it later (`turn_associated`) would need a new hook in the admission state; not done.
3. **Application execution scope runs get no notices (follow-up, out of Change Scope).**
   - `application-platform/execution/application-execution-scope-kernel-builder.ts` builds its own `AgentRunManager` and resource manager. Runs inside an application execution scope are therefore not tracked.
   - Wiring them means threading the subsystem through `buildApplicationPlatformRuntime`. The design's Change Scope lists only the studio and standalone compositions, so it is recorded as a follow-up.
4. **AGY interrupt** stops the AGY process and takes the run offline. A notice queued behind the interrupted turn is cancelled by admission and returns to pending; it goes out with the next message (live scripted E2E). This is REQ-013 behavior, not a loss.
5. **Re-delivery is at-least-once.** A non-recovery dispatch that ends `uncertain` returns the notice to pending; if the provider did get it, the next input repeats it. Accepted, bounded to one repeat per uncertain dispatch.
6. **macOS FSEvents** can report a write made just before a folder was watched. It only triggers a re-check: the digest diff finds nothing, so no notice is sent.
7. **Pre-existing failures** (same on base): integration `agent-status-websocket` (2). `native-root-termination` failed once in the full parallel run and passed alone (6/6), so it is load-sensitive, not caused here.

## Residuals From Architecture Review

- **N-1:** honored. `MemoryIngestInputProcessor` records the trace IDs on `AgentTurn`, and `llm-phase` passes them to `LLMRequestAssembler` (explicit `rawTraceIds`, not recomputed). The autobyteus-ts unit test asserts the working-context entry links both trace IDs and fails when they are not passed (checked).
- **R-1 (re-read path):** verified live.
  - Codex and Claude read the absolute source `SKILL.md` from the notice and answered the new codeword, as did AutoByteus (`read_file`).
  - No link refresh was needed: the notice always gives the current source path (as designed).
- **R-4 (busy-check race):** accepted, unchanged.
- **R-5 (`ALL_INSTALLED` watch count):** measured on macOS with the real watcher: 60 skill folders × 5 files → +300 open handles (about 1 per non-ignored entry), all released on close (back to baseline). There is one chokidar instance for all runs (integration test: 3 `ALL_INSTALLED` runs, 60 folders, 1 watch). Ignored folders are never entered.
- **Compaction recovery:** identified at dispatch by `ClaimedInputDispatch.recovery`. The unit test fails if the guard is removed (checked).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one preface port in `AgentRun`; one lifecycle observer at the single activation point and the single release point; the notice service uses public run APIs only; `agent-execution` does not import `skill-update-notices` (the compositions create it).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`; nothing became dead.
- Shared structures remain tight: `Yes`. The preface tag is a small generic marker; the skill marker `skill_update_notice` is dedicated (task-delegation metadata not widened).
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (IR-002, CR-003; IR-001 wrongly claimed this while `memory-manager.ts` had 512 effective lines).
  - `memory-manager.ts`: 495 non-blank lines (494 at base).
  - The preface mechanics were moved out of `agent-run.ts` (449 lines; base 428).
  - The largest new file is `skill-update-notice-service.ts` (about 260 lines).

## Persisted Data Transition Check

- Approved decision: `Not Affected` for existing data; a new additive file per run.
- Implementation follows the approved decision: `Yes`.
  - The file is `<memoryDir>/seen_skill_versions.json`, `{ "skills": { name: { skillDir, skillMdPath, files } } }`, written atomically.
  - A missing or invalid file reads as none and is re-created from current files.
  - It is deleted with the run's memory folder.
  - Runs with a null `memoryDir` keep the record in memory only.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- No new dependencies (chokidar 4 is already a server dependency).
- The server resolves `autobyteus-ts` from its built `dist`: run `pnpm -C autobyteus-ts build` (or `pnpm -C autobyteus-server-ts prepare:shared`) before server tests.

## Local Implementation Checks Run

IR-002 (CRR-001 fixes):

- autobyteus-ts: build typecheck clean; `pnpm build` (dist rebuilt for the server); unit **299 files / 2023 tests pass**.
- Server: typecheck clean; `tests/unit/{agent-execution,skill-update-notices,standalone-application-host,compositions,agent-memory,agent-collaboration}` plus `tests/integration/{skill-update-notices,run-history}`: **176 files / 1908 tests pass** (4 files skipped). New tests: CR-001 (2), CR-002 (1); both fixes mutation-checked.
- Scripted AGY E2E: 2/2 pass (new run, busy, stop, idle, restore).
- Live Codex + Claude E2E: see the revision record (IR-002).

IR-001:

- `autobyteus-ts`:
  - `tsc -p tsconfig.build.json` clean;
  - full `tsconfig.json` has 273 pre-existing errors in untouched test files, the same count as base;
  - `vitest run tests/unit`: **299 files / 2023 tests pass**.
- Server:
  - `pnpm -C autobyteus-server-ts typecheck` clean;
  - `vitest run tests/unit`: **687 files; 682 pass, 4 skipped, 1 failed** (5387 tests pass). The failing file was `standalone-application-host-lifecycle.test.ts`: its exact-arguments expectation needed the new `platformInputNotices` input. Updated; 17/17 now pass. Touched areas re-run after the last edits.
  - `vitest run tests/integration`: **73 passed**, 18 skipped. Failures: `agent-status-websocket` (2, pre-existing); `native-root-termination` (load-sensitive; passes alone).
  - New tests: unit 9 + 5 + 8, integration 12 + 2, all pass.
- Gated live E2E (`RUN_SKILL_NOTICE_E2E=1`; one case per runtime, about 45–65 s each):
  - Codex (`CODEX_HOME` = temp folder with only a symlink to `~/.codex/auth.json`) and Claude (operator's Claude CLI login, as the other Claude suites): pass, also re-run after the last E2E edits;
  - AutoByteus (`env -i` with a temp HOME and `OPENAI_API_KEY` saved into the test-owned vault, model `gpt-5.5`): pass.
- Scripted AGY E2E (`RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`): 2 cases pass (busy → next turn; stop keeps the notice pending; idle → one combined turn; AC-003 stop → change → continue). The existing `agy-interrupt-resend-transport` still passes 3/3 with the fixture change.
- Web:
  - `test:nuxt`: **610 files / 4259 tests pass**;
  - `guard:localization-boundary`, `audit:localization-literals` and `guard:web-boundary` pass.

## Frontend Rendered-Result Check

- Approved UI/UX reference: REQ-007 and DS-004: the notice is shown as a system notice, labeled, distinct from user and agent messages.
- Where: development stack (`pnpm dev`, worktree build, launched with `env -i`, a temp HOME and the scripted AGY CLI; development state removed afterwards).
- Checked:
  - a busy-run notice;
  - a server restart → stopped run continued → one combined turn, with the earlier notice replayed from history.
- Result:
  - The "Skill updated" label and aria-label are shown on both live and replayed notices.
  - The user message is shown as typed; the notice is never a user bubble (queued system entries are not projected as pending user messages).
- Issue found and corrected: the "Re-read …" line rendered inside the last list item (Markdown lazy continuation). A blank line now ends the list in the notice text (also clearer for the agent).
- Evidence: `implementation-evidence/rendered-busy-notice-before-list-fix.png` and `implementation-evidence/rendered-restore-notice-after-restart.png`.

## Downstream Coverage Hints / Suggested Scenarios

- AC-010 desktop journey with real models: the Agent Package Creator's PR merged while the PTM runs and a delegated copy is idle.
  - In an isolated desktop instance, model access requires a user-provided key file (isolated-app skill, TESTING.md rule 4).
  - Codex/Claude inside the instance would use the user's CLI folders.
  - I therefore did not run it; the dev-stack rendered check and the live E2E above cover the mechanics.
- A team member and a delegated copy (shut down after idle, restored by a message) in one live run. The activation path is shared and covered, but there is no live multi-member case yet.
- A GitHub skill-source update (new generation folder) in a live run. Covered by integration (AC-005) with real folders.
- A long `git merge` burst (QR-001 timing ≤ 5 s after the last write). The settle window is 1 s quiet / 3 s cap; not timed live.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-010 (desktop, real journey, user verification).
- ACP/Grok live delivery (next-turn class; same path as AGY and AutoByteus).
- An application-scope run is not covered (Known Risks item 3).
