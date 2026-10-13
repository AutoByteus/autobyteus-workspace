# Implementation Revision Record — `active-run-skill-update-notice`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-003 Pass | N/A (note N-1 and residuals R-1, R-4, R-5 and compaction-recovery identification honored) | `Initial Baseline` | SR-004, ARCH-REV-003; CRR/API-REV/DR `N/A` | Implementation complete; ready for source review |
| IR-002 | Code Reviewer / `code-review-report.md` / CRR-001 round 1 (Fail — Local Fix) | CR-001, CR-002, CR-003, CR-004 | `Local Fix` | SR-004, ARCH-REV-003, CRR-001; API-REV/DR `N/A` | All four fixed; ready for targeted source review, then API/E2E |

## Revision Entries

### IR-001 — Skill update notices for active runs: input preface port, notice subsystem, history, web label

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/design-review-report.md`, ARCH-REV-003 (Pass).
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result:
  - Implemented per `design-spec.md` SR-004 Change / Refactor Sequence steps 1–5, plus a dev-stack rendered check for step 6.
  - Branch `codex/active-run-skill-update-notice` on `origin/personal@6473e2694`, commits:
    - `5718c1301` feat(autobyteus-ts): record platform input prefaces as system notices;
    - `02c1d8b92` feat(server): tell active runs when a skill they use changes on disk;
    - `28fdf1d36` feat(web): label skill update notices in the conversation.
- Related solution revision IDs: `SR-001`…`SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`…`ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected:
  - BEH-001…BEH-004;
  - REQ-001…REQ-013;
  - AC-001…AC-009 implementation paths (AC-010 left to API/E2E and user verification);
  - DEC-009, DEC-010, DEC-011;
  - note N-1.
- Implementation delta:
  - **autobyteus-ts:** the generic `platform_input_preface` convention. Native ingest writes a separate system trace and the user's original content; the trace IDs flow to the request assembler (N-1).
  - **Server agent-execution:**
    - the `AgentRunInputPreface` port and `AgentRunInputPrefaceDispatch`, which combines the notice into the next external input at dispatch and settles it on the dispatch outcome;
    - the `AgentRunLifecycleObserver`, reported from `beginAgentRunActivation` (published) and `AgentRunResourceManager.release` (released);
    - the supervisor input `platformInputNotices`.
  - **New `src/skill-update-notices/`:** ignore rules, snapshotter, seen-versions store, diff, builder, watcher, run skill tracker and notice service. Composed in the studio server and the standalone host.
  - **Memory accumulator:** skill sender allow-listed; a notice-only input is not a user message.
  - **Web:** the "Skill updated" label plus localization.
  - **Test fixture:** the scripted AGY CLI's `interrupt_resend` case gains `HOLD_MS:<n>`.
  - **Implementation decisions beyond the spec text (no ownership or contract change; flagged in the handoff Known Risks 1–2):**
    - the busy-run notice is tagged as a notice-only preface (`original_content: null`) so history keeps it as one system notice on every runtime;
    - on AutoByteus the published notice event has no `turn_id` (the backend forwards before its turn starts).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas (7 autobyteus-ts files, 34 server files, 4 web files).
- Local validation and result:
  - **autobyteus-ts:** build typecheck clean; unit 299 files / 2023 tests pass.
  - **Server:**
    - typecheck clean;
    - unit 687 files (the one failing file was an exact-argument expectation, updated; touched areas re-run: 173 files / 1895 tests pass);
    - integration 73 files pass; failures only in `agent-status-websocket` (2, pre-existing) and `native-root-termination` (load-sensitive, passes alone).
  - **Gated live E2E:** Codex, Claude and AutoByteus pass (busy notice, re-read of the absolute SKILL.md, idle combined turn, history).
  - **Scripted AGY E2E:** 2 cases pass (next-turn delivery, interrupt keeps the notice pending, idle combined turn, AC-003 stop/change/continue).
  - **Web:** `test:nuxt` 610 files / 4259 tests pass; localization and web guards pass.
  - **Dev-stack rendered check:** label, list rendering (one defect found and fixed), replay after a server restart.
  - **R-5 measured:** 60 folders / 300 files → +300 handles on macOS, all released on close.
- Next recipient or routing: source review (Large/High) per `get_handoff_rules`.
- Remaining limitations or risks:
  - application execution scope runs are not wired (out of Change Scope; follow-up);
  - AC-010 desktop journey with real models not run (needs a user-provided key file for an isolated instance);
  - no live team member or delegated-copy restore case (shared activation path covered);
  - ACP/Grok not run live.

### IR-002 — CRR-001 local fixes: no tracking wait for new runs, activation-time skill source, size limit, dead branch

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice/tickets/in-progress/active-run-skill-update-notice/code-review-report.md`, CRR-001 (round 1).
- Triggering finding IDs: CR-001 (Medium), CR-002 (Medium), CR-003 (Low), CR-004 (Low).
- Classification: `Local Fix`
- Prior authoritative result: IR-001 (`5718c1301`, `02c1d8b92`, `28fdf1d36`).
- Current authoritative result: commit `d32e55270` on `codex/active-run-skill-update-notice`.
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Approved behavior or requirement IDs affected: BEH-001 (REQ-009, DEC-011: re-resolution by name independent of later definition edits), BEH-003 (REQ-005: a new run's input never waits), DESIGN.md Rule 3.
- Implementation delta:
  - **CR-001:** `SkillUpdateNoticeService.takePreface` waits for tracking only for a run published as `restore` / `platform_restore` (a `restoring` set keyed by the run object, cleared when its tracking settles and on close). Otherwise it reads the tracked run directly and returns any pending notice; a new run's first input is dispatched at once.
  - **CR-002:** `RunUsedSkillsResolver` now returns a `RunSkillSource` bound at tracking (the definition read then, a copy); `TrackedRun.skillSource.resolve()` resolves it through the current catalog on every re-resolution (`refreshSkillDirs` is synchronous). `createSkillUpdateNotices` also returns `tracker`.
  - **CR-003:** `MemoryManager.ingestSystemTaskNotification` removed; the ingest processor calls the public `appendRawTrace`. `memory-manager.ts`: 495 non-blank lines (494 at base).
  - **CR-004:** the `settlePreface` call in `reconcileUncertainDispatch` and the in-flight comment removed.
  - **Tests:** integration world split into definitions (names) and catalog (folders); new CR-002 case (definition edited, then deleted, during an active run); new CR-001 cases with a gated snapshotter and a real `AgentRun` (new run dispatched unchanged while scanning; restored run waits and carries the notice); the real-`AgentRun` test uses a shared helper. Both fixes mutation-checked: the tests fail with the old behavior.
- Changed files or areas: `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts`, `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`, `autobyteus-server-ts/src/skill-update-notices/{skill-update-notices.ts, services/run-skill-tracker.ts, services/skill-update-notice-service.ts}`, `autobyteus-server-ts/tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts`.
- Local validation and result:
  - autobyteus-ts: build typecheck clean; dist rebuilt; unit 299 files / 2023 tests pass.
  - Server: typecheck clean; affected unit areas plus `tests/integration/{skill-update-notices,run-history}`: 176 files / 1908 tests pass (4 skipped).
  - Scripted AGY E2E: 2/2 pass. Live Codex + Claude E2E (throwaway `CODEX_HOME`; operator's Claude login): 2/2 pass.
- Next recipient or routing: targeted source review (Large/High) per `get_handoff_rules`, then API/E2E.
- Remaining limitations or risks: unchanged from IR-001 (application execution scope runs not wired, recorded by the reviewer as a note for the Solution Designer; AC-010 desktop journey; live team-member/delegated-copy restore; ACP/Grok live).

