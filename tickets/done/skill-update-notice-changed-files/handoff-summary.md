# Handoff Summary — skill-update-notice-changed-files

## User Verification

- Verified by the user on 2026-10-18: "now finalize and release a new beta".
- Decisions:
  1. **Accepted as done.**
  2. **Release: beta.** It becomes `v1.5.6-beta.2`, because another ticket released `v1.5.6-beta.1` after the verification request.
  3. **OBS-001:** not answered, so no follow-up Task was created. It stays an open recommendation (see Residual Risks).

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files`. Branch: `codex/skill-update-notice-changed-files` (local only, not pushed).
  - `a059e210fc`: implementation (source, tests, module doc).
  - `95a490ff10`: implementation records.
  - `e74bb1cb06`: API/E2E web test.
  - `1edb5ecbea`: delivery checkpoint of the API-REV-001 records and evidence.
  - `3d92d95545`: docs sync (`skills.md`).
  - The delivery documents and `delivery-evidence/dr-001/` are not committed yet; they will be committed at finalization.
- Base and finalization target: `origin/personal` @ `cba5563a5d`. It has not advanced, so the branch is already current and no merge was needed.
- Classification: `task_size=Small`, `architectural_risk=Low`. **Direct route**: architecture review, source review and test-code review are `Not Applicable`.

## What Changed

- The **Skill updated** notice now reads, per skill package:
  ```
  [Platform notice — skill updated]

  Your skill package `code-review` has been updated (/…/skills/code-review).

  Changed files:
  - references/checklist.md (changed)
  - references/new.md (added)

  Re-read the updated files before continuing work that relies on this skill.
  ```
- `SKILL.md` is listed only when it changed, and then first. At most 10 files are listed, then "- …and N more files".
- "Removed files are no longer available." appears when a listed file was removed. An uninstalled skill gets its own "is no longer available" block.
- The header is unchanged, so the web still labels the card **Skill updated**. Delivery timing (busy, idle, restored) is unchanged.
- Docs:
  - `skill_update_notices.md` updated by the implementation;
  - `skills.md` updated by delivery;
  - see `docs-sync-report.md`.

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture, source and test-code review | Not Applicable (direct route) |
| API/E2E | **API-REV-001 Pass (95%)**:<br>• server typecheck clean;<br>• notice integration 21/21;<br>• server unit 715 files;<br>• web segments 60/60;<br>• scripted AGY E2E 5/5;<br>• live Claude 2/2.<br>Isolated desktop (recorded, `api-e2e-evidence/desktop/desk-001-ac005.mp4`): a Claude busy run with reference-only changes showed one card in the new layout without `SKILL.md`, and the agent re-read the listed files. An AutoByteus idle run with mixed statuses got one combined turn. An updated skill plus a removed skill produced two blocks. |
| Delivery (branch head, base current) | Notice unit and integration 42/42; web segments 60/60 (`delivery-evidence/dr-001/`). No base advance, so no further rerun was needed |

## How To Verify (AC-005)

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files
pnpm --silent isolated-app start --build
```

1. Give a Claude (or AutoByteus) agent a skill whose folder you can edit, and start a longer task.
2. While it works, edit only a file under the skill's `references/` folder and save.
3. Expected: one **Skill updated** card showing:
   - "Your skill package `<name>` has been updated (<folder>)";
   - "Changed files:" with that file marked `(changed)`;
   - no `SKILL.md` line.

   The agent re-reads the listed file.
4. Optional: edit `SKILL.md`, add one file and delete another. The card lists all three, `SKILL.md` first, plus "Removed files are no longer available."
5. Stop the app with `pnpm --silent isolated-app stop <instanceId>`.

## Decisions Needed At Verification

1. **Accept as done?**
2. **Release:** finalize only (the default per `RELEASE.md`), a beta `v1.5.6-beta.1`, or a stable version? The current version is `v1.5.5`.
3. **OBS-001 follow-up:** file names containing Markdown characters render altered in the card (`references/__init__.py` shows as bold "init.py"; `*draft*_notes.md` shows in italics). The agent's text is exact. This predates this ticket and is out of its scope. Ask the Project Task Manager for a follow-up Task?

## Residual Risks (non-blocking)

- Codex and Grok were not run (no Codex quota). Live Claude and an isolated-desktop AutoByteus run cover the text change on the external and native paths.
- OBS-001 (above).
