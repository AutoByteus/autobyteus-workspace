# Handoff Summary — active-run-skill-update-notice

Current for delivery round **DR-002**, after the DR-001 Local Fix.

## User Verification

- Verified by the user on 2026-10-17: "verified, go ahead".
- Decisions:
  1. **Accepted as done.**
  2. **Release: beta** `v1.5.5-beta.2`. The user said on 2026-10-17: "we could release a beta for this".
- Re-integration after verification (DR-003): `origin/personal` advanced 18 commits (agent-loop-structure-refactor, `5e19addc1d`, "no behavior change"). It was merged as `9703a38fff`.
  - One conflict, in `autobyteus-ts/src/agent/loop/llm-phase.ts`. It was resolved by taking the refactored file and re-applying this ticket's single change there: passing `inputRawTraceIds: turn.inputRawTraceIds` to `prepareRequest`.
  - `agent-turn.ts` merged cleanly.
  - The checks were re-run (`release-deployment-report.md`).
  - Renewed verification: not needed, because the user-facing behavior is unchanged.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`. Branch: `codex/active-run-skill-update-notice` (local only, not pushed).
  - Implementation and test commits run through `f181b9b13`:
    - IR-001…IR-003;
    - API/E2E `c9e100778`.
  - `da89733330`: delivery checkpoint of the uncommitted ticket package (review and API/E2E records, evidence).
  - `fdb592830c`: merge of `origin/personal` @ `a609de982` (8 commits, the Agent/Org mutation cache fix; web only). No conflicts, and no overlap with this ticket's files.
  - `82b741629e`: docs sync.
  - `98360b8a3b`: DR-001 delivery records (blocked on the seen-versions write race).
  - **DR-001 fix:**
    - `f977849b29` (IR-004): never write a seen-versions record after release or close;
    - `141268a74d`: implementation records;
    - `06c4a62f16`: live restore/delete E2E case.
  - `de6b28d3fe`: DR-002 checkpoint of the API-REV-003 and CRR-006/007 records and the round-3 evidence.
  - `0be06dea6b`: merge of `origin/personal` @ `c2e366806` (300 commits, up to v1.5.5-beta.1). No textual conflicts. Files changed on both sides merged cleanly: `agent-run-manager.ts`, `general-process-run-supervisor.ts`, `build-studio-server.ts`, `llm-phase.ts` and four docs. The base's private runtime skill profiles symlink to the real skill folders, so the notices stay correct.
  - `480d9f4aa4`: doc note on the accepted no-memory-folder limitation.
  - The DR-002 delivery documents and `delivery-evidence/dr-002/` are not committed yet; they will be committed at finalization.
- Base and finalization target: `origin/personal` (`investigation-notes.md`, `RELEASE.md`).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not committed: the untracked `*/dist/` folders.

## What Changed

- **Server: `src/skill-update-notices/` (new).**
  - It tracks the skills each active or restored run uses and watches only those skill folders, one watch per folder, released when no run uses it.
  - After a change settles (1 s quiet, 3 s cap), each affected run gets **one** notice: the skill, its changed files and the current `SKILL.md` path, plus a re-read instruction.
  - **Busy runs:** agent-message semantics. The notice arrives inside the current turn on Codex and Claude, and as the next turn on AutoByteus, Antigravity, ACP and Grok.
  - **Idle runs** are never woken; the notice is combined with the next input in one turn.
  - **Stopped or restored runs**, including after an app restart, get it with their first input, from `<memoryDir>/seen_skill_versions.json`.
  - That record is written only into the run's existing memory folder, retried while the run is tracked, and never after the run is released. A deleted run's folder is never re-created (DR-001 fix).
  - "No longer available" is reported only when the skill is uninstalled.
  - Noise is ignored: `.git`, `node_modules`, virtual environments, caches, `dist`/`build`, `.gitignore` entries, temp files and identical saves.
- **Execution core:** generic `AgentRunInputPreface` and `AgentRunLifecycleObserver` ports. `agent-execution` holds no skill knowledge.
- **`autobyteus-ts`:** a generic `platform_input_preface` tag. Native memory records one system notice plus the user's original message.
- **History:** on every runtime, one system notice plus the user's message unchanged.
- **Web:** the notice is labelled "Skill updated" (en, zh-CN).
- **Docs:**
  - new `autobyteus-server-ts/docs/modules/skill_update_notices.md`;
  - server `agent_execution.md` (new port section, plus a stale recording statement fixed), `agent_memory.md`, `skills.md`, `agent_package_definitions.md`, `modules/README.md`;
  - core `agent_memory_design.md`;
  - web `agent_execution_architecture.md`.

  `TESTING.md` is unchanged: the gated commands are in the three E2E file headers, as `TESTING.md` requires. See `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass (SR-004) |
| Code review | CRR-004 Pass (9.3/10); CR-001…CR-005 resolved (IR-002, IR-003). CRR-006 Pass on the DR-001 fix (IR-004). Test-code review: CRR-005 and CRR-007 Pass, no findings |
| API/E2E | **API-REV-003 Pass (96%)** on the fix:<br>• notices unit and integration 37/37 ×5, with no `ENOTEMPTY`;<br>• scripted roots and transport 5/5 ×2;<br>• live Codex and Claude 4/4, including restore-and-delete;<br>• desktop AutoByteus: a notice after restore, and a deleted run's folder not re-created within 75 s.<br>The Codex budget is now exhausted, so live work continues on Claude and AutoByteus.<br><br>Earlier, API-REV-002 Pass (96%). Highlights:<br>• AC-010: the real PR-merge journey on the desktop with real Codex (recorded, `api-e2e-evidence/desktop/ac010-human-journey.mp4`).<br>• App restart.<br>• Live Codex, Claude, AutoByteus and Grok.<br>• Scripted Antigravity roots and transport E2E.<br>• APE-001 handle release: macOS probe 31 → 0, Linux inotify 68 → 34 → 0, desktop back to baseline after terminate. |
| DR-001 delivery (`fdb592830c`) | Skill-notice integration tests were flaky (`ENOTEMPTY`, seen-versions write race). Routed as a Local Fix and resolved by IR-004 |
| DR-002 delivery, on the merged code (`0be06dea6b`) | • Core unit: 300 files / 2031 tests pass.<br>• Server typecheck: clean.<br>• Server unit: 708 files / 5716 tests pass.<br>• Skill-notice unit and integration: 37/37 in **5 of 5** consecutive runs (the DR-001 flake is gone).<br>• Scripted AGY roots and transport E2E: 5/5.<br>• Web: 627 of 628 files pass. The one failure, `components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` (`retains A while canonical B metadata fails; prior consumers mounted: true`), is a **new base failure** in the File Explorer and right-panel area:<br>&nbsp;&nbsp;– it fails 5/5 alone;<br>&nbsp;&nbsp;– it still fails with this ticket's web files swapped back to `origin/personal`'s versions;<br>&nbsp;&nbsp;– it passed in the DR-001 run on `a609de982`.<br>&nbsp;&nbsp;It is reported per `TESTING.md` rule 9 and does not block this ticket.<br>• Repository hygiene and licensing checks: pass.<br>• Logs: `delivery-evidence/dr-002/` |

## How To Verify

Start an isolated app built from this worktree. It has its own data and does not touch your running AutoByteus:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice
pnpm --silent isolated-app start --build
```

1. Pick or add a skill whose folder you can edit (a copy is fine), and configure an agent to use it.
2. **Busy run:** start a long task on a Claude (or Codex) agent, then edit the skill's `SKILL.md` and save. Within a few seconds, the conversation shows one **Skill updated** notice listing `SKILL.md`, inside the running turn. On AutoByteus, Antigravity or Grok it arrives as the next turn.
3. **Idle run:** let the run finish, edit the skill again, and wait a minute. Nothing happens. Then send a message: the notice and your message go together in one turn, and your message is shown exactly as you typed it.
4. **Noise:** add a file under the skill's `node_modules/` or `.git/`, or save `SKILL.md` without changes. No notice.
5. **Restart:** stop the app, edit the skill, start it again and continue the run. The notice comes with your first message.
6. Optional: reopen the run's history; it shows the notice once and your message unchanged.
7. Stop the app with `pnpm --silent isolated-app stop <instanceId>`.

You can also watch the recorded journey at `api-e2e-evidence/desktop/ac010-human-journey.mp4`.

## Decisions Needed At Verification

1. **Accept as done?**
2. **Release: beta**. The user said on 2026-10-17: "we could release a beta for this". The next beta is `v1.5.5-beta.2` (current `v1.5.5-beta.1`).

## Residual Risks And Follow-ups (non-blocking)

- Linux evidence comes from a container probe only.
- New base failure (not this ticket): `RightSideTabs.workspaceTarget.spec.ts` > `retains A while canonical B metadata fails; prior consumers mounted: true`. It expects `FileExplorerTabs.fileContent` to be `'dirty-C-not-saved'` but gets `undefined`. It fails on `origin/personal` @ `c2e366806` web code, and it was introduced somewhere in the 300 commits after `a609de982`. Candidates are the 2026-10-15 File Explorer draft and Save changes (`a3f65bfe6e`, `50f25f68d9`) and the 2026-10-13 right-panel change (`1262714f64`); a folder-only bisect was not reliable. It should go to the owner of those changes.
- Accepted limitation: a run whose memory folder never appears while it is tracked has no stored record.
- The 60 s retry steady state is exercised only with injected delays.
- Grok was not rerun after the fix.
- **Accepted behaviors:**
  - delivery is at least once, so an uncertain dispatch can re-deliver a notice;
  - R-4: a run turning busy just as a change settles may get the idle path;
  - AutoByteus notice events carry no `turn_id`.
- **Follow-ups:**
  - FT-1…FT-3 (`follow-up-tasks.md`): mid-turn input for AutoByteus, Antigravity and Grok/ACP;
  - C-06: runs inside application execution scopes are not tracked;
  - R-1 (optional): drop the test-only `SkillUpdateNotices.tracker` field;
  - TN-1 and TN-2 (optional test cleanups).
