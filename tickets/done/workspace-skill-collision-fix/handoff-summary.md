# Handoff Summary — workspace-skill-collision-fix

## Verification

- Verified **from the evidence** by delivery on 2026-10-18. No user check was needed: API/E2E reports "Behavior only the user can check: None". Every critical acceptance criterion is proven directly on real surfaces (live server with real Claude/Codex/Grok CLIs; an isolated desktop instance of the merged build).
- Release decision: **beta `v1.5.6-beta.4`**, as requested in the Project Task (autobyteus-142, from `/project_task_manager` on the user's behalf). The decision is recorded in `investigation-notes.md` and in the SR-002 release-target note. `python3 scripts/release_versions.py next-beta` → `1.5.6-beta.4`.

## State At Handoff

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix`. Branch: `codex/workspace-skill-collision-fix`.
  - `810408bcee`: the implementation (CRR-001 Pass).
  - `c59da62e70`: merge of `origin/personal` @ `9de0828aaa` (v1.5.6-beta.3); its server changes are skill-update-notice text only.
  - `1f9aae5817`: baseline fix for stale gated live tests (test-only).
  - `1c69409a85`: new live coverage (CRR-002 Pass).
  - Delivery commit: docs sync plus the archived ticket folder.
- Base and finalization target: `origin/personal` @ `9de0828aaa`, fetched at delivery start. HEAD already contains it, so no integration merge was needed.
- Classification: `task_size=Large`, `architectural_risk=Low`. **Reviewed route**: ARCH-REV-001 Pass → CRR-001 Pass → API-REV-001 Pass (95%) → CRR-002 Pass.

## What Changed

- Claude, Codex and Grok expose configured skills exactly as in v1.5.6-beta.1, on every workspace. The shared workspace materializer links skills into `.claude/skills`, `.codex/skills` and `.grok/skills`. It reuses a same-skill link, repairs broken links and releases links at run end. Codex runs its `skills/list` preflight first.
- Fixed: a workspace with same-skill links no longer refuses the run ("Workspace skill path collision"), and brand-new runs no longer fail with `ENOENT realpath` on the memory folder.
- Removed: the NFS-only private skill profile path (`RuntimeSkillProfile`, private discovery/adapters, Codex extra-roots profile) and its tests. Antigravity, AutoByteus and the non-skill NFS extraction are unchanged.
- Known beta.1 behaviors ship unchanged (DEC-103):
  - F2: the app removes a user-created same-skill link at run end and recreates it on the next run.
  - F3: Antigravity refuses `.agents/skills/<name>`.
- Docs: `autobyteus-server-ts/docs/modules/shared_network_workspaces.md` "Configured skills" was rewritten (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-001 Pass |
| Source review | CRR-001 Pass, no findings |
| API/E2E | **API-REV-001 Pass, 95%**, all categories ≥ 95%:<br>• typecheck; unit 716 files / 5,830 tests; integration 76 files / 396 tests;<br>• live same-skill-link E2E 3/3 on each of Claude (haiku), Codex (gpt-5.6-luna) and Grok (grok-4.7): new run, restore, a brand-new team member with no memory folder, collision refusal, all-installed preference;<br>• real Codex bootstrapper 4/4; Antigravity scripted smoke 8/8; post-merge skills E2E 35/35;<br>• isolated desktop: new run and continue after an app restart on each runtime; 0 ENOENT / collision / ACTIVATION_FAILED / `runtime-skill-profiles` in the log |
| Test-code review | CRR-002 Pass, no findings |
| Delivery rerun on HEAD `1c69409a85` | `pnpm typecheck` clean; `vitest run tests/unit/agent-execution/backends` 85 files / 1,070 tests pass (`delivery-evidence/dr-001-head-typecheck-unit-backends.log`) |

## Evidence Judgement (delivery)

I opened the following files linked from the Acceptance-Criteria Proof table:
- `07/08/09-live-skill-links-*.log`. Every runtime logs the new-run, restored-run, team-member, collision and all-installed lines. The tests assert `toContain(code)`; the log only truncates the printed text to 200 characters. Before the first message, the team memory listing holds only `team_communication_messages.json` and `team_run_execution_tree.json`.
- `15-post-merge-e2e-skills.log` (35/35); `04`/`05` totals; `02-ac106-search.log` (one unrelated local variable); `16-desktop-instance-log-excerpt.txt` (all counts 0).
- Screenshots `16-desktop-05` (Grok new run → `DESKTOP-NEW-7Q4`) and `16-desktop-07` (Codex continue → `DESKTOP-CONT-9K2`).

Judgement: sufficient. AC-101..AC-107 are each directly proven.

## Residual Risks / Follow-ups (already sent to `/project_task_manager`)

- F1–F7 and the stale gated live suites. These include F2/F3 (beta.1 behaviors), F6 (add same-skill-link smoke to release checks) and F7 (Grok 1.0.62 does not list workspace `.grok/skills` natively, but agents still find the skill).
- Antigravity was proven through the scripted CLI only; its code is unchanged.
- In the Grok desktop run, the agent ran a read-only `find` over the host `~/.grok` and `~/.claude` while searching for the skill (F7 behavior). Nothing was written there.
