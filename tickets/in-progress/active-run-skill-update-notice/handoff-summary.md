# Handoff Summary — active-run-skill-update-notice

## User Verification

- Status: **BLOCKED (DR-001)**. This is a draft for the round after the Local Fix; do not use it for verification yet. Nothing is pushed or merged. See `release-deployment-report.md` § Escalation.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice`. Branch: `codex/active-run-skill-update-notice` (local only, not pushed).
  - Implementation and test commits run through `f181b9b13`:
    - IR-001…IR-003;
    - API/E2E `c9e100778`.
  - `da89733330`: delivery checkpoint of the uncommitted ticket package (review and API/E2E records, evidence).
  - `fdb592830c`: merge of `origin/personal` @ `a609de982` (8 commits, the Agent/Org mutation cache fix; web only). No conflicts, and no overlap with this ticket's files.
  - `82b741629e`: docs sync.
  - The delivery documents and `delivery-evidence/dr-001/` are not committed yet; they will be committed at finalization.
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
| Code review | CRR-004 Pass (9.3/10); CR-001…CR-005 resolved (IR-002, IR-003). Test-code review CRR-005 Pass, no findings |
| API/E2E | API-REV-002 Pass (96%). Highlights:<br>• AC-010: the real PR-merge journey on the desktop with real Codex (recorded, `api-e2e-evidence/desktop/ac010-human-journey.mp4`).<br>• App restart.<br>• Live Codex, Claude, AutoByteus and Grok.<br>• Scripted Antigravity roots and transport E2E.<br>• APE-001 handle release: macOS probe 31 → 0, Linux inotify 68 → 34 → 0, desktop back to baseline after terminate. |
| Delivery, on the merged code (`fdb592830c`) | • Core unit: 2023/2023.<br>• Server typecheck: clean.<br>• Server unit: 683 files pass.<br>• Scripted AGY E2E: 5/5.<br>• Web: 611 files pass.<br>• **Skill-notice integration tests: flaky.** They fail intermittently with `ENOTEMPTY` caused by a seen-versions write race, a Local Fix routed to the implementation engineer.<br>• Logs: `delivery-evidence/dr-001/` |

## How To Verify

Start an isolated app built from this worktree. It has its own data and does not touch your running AutoByteus:

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/active-run-skill-update-notice
pnpm --silent isolated-app start --build
```

1. Pick or add a skill whose folder you can edit (a copy is fine), and configure an agent to use it.
2. **Busy run:** start a long task on a Codex or Claude agent, then edit the skill's `SKILL.md` and save. Within a few seconds, the conversation shows one **Skill updated** notice listing `SKILL.md`, inside the running turn. On AutoByteus, Antigravity or Grok it arrives as the next turn.
3. **Idle run:** let the run finish, edit the skill again, and wait a minute. Nothing happens. Then send a message: the notice and your message go together in one turn, and your message is shown exactly as you typed it.
4. **Noise:** add a file under the skill's `node_modules/` or `.git/`, or save `SKILL.md` without changes. No notice.
5. **Restart:** stop the app, edit the skill, start it again and continue the run. The notice comes with your first message.
6. Optional: reopen the run's history; it shows the notice once and your message unchanged.
7. Stop the app with `pnpm --silent isolated-app stop <instanceId>`.

You can also watch the recorded journey at `api-e2e-evidence/desktop/ac010-human-journey.mp4`.

## Decisions Needed At Verification

1. **Accept as done?**
2. **Release:** finalize only (the default per `RELEASE.md`), a beta `v1.5.3-beta.4`, or a stable version? The current version is `v1.5.3-beta.3`.

## Residual Risks And Follow-ups (non-blocking)

- Linux evidence comes from a container probe only.
- **Accepted behaviors:**
  - delivery is at least once, so an uncertain dispatch can re-deliver a notice;
  - R-4: a run turning busy just as a change settles may get the idle path;
  - AutoByteus notice events carry no `turn_id`.
- **Follow-ups:**
  - FT-1…FT-3 (`follow-up-tasks.md`): mid-turn input for AutoByteus, Antigravity and Grok/ACP;
  - C-06: runs inside application execution scopes are not tracked;
  - R-1 (optional): drop the test-only `SkillUpdateNotices.tracker` field.
