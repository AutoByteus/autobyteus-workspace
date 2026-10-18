# Investigation Notes

## Investigation Meta

- Package identifier: `skill-update-notice-changed-files`
- Request / ticket: Project Task `autobyteus-136` from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-17. User feedback on the notices from Task autobyteus-76 (`active-run-skill-update-notice`, released in `v1.5.5-beta.2`).
- Workspace root / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files`, branch `codex/skill-update-notice-changed-files`
- Base: `origin/personal` @ `cba5563a5d7949449bab76a6369a868c25319757` (fetched 2026-10-17; contains the notice feature merge `2d730b5b12`). Finalization target: `origin/personal`.
- Bootstrap: dedicated worktree; no blocker.
- Current solution revision ID: `SR-001`
- Authorities read:
  - `SKILL.md` (updated 2026-10-16, re-read 2026-10-17);
  - `references/requirements-engineering.md` (re-read 2026-10-17);
  - `references/handoff-references.md` (new, read 2026-10-17);
  - `references/architecture-design.md` (read 2026-10-13; last content commit `fca3ff1` on 2026-10-12);
  - `references/design-principles.md` (read 2026-10-10; last content commit `fca9894` on 2026-10-10; later file dates are copies, verified with `git log` in the skills repository);
  - root `DESIGN.md`, `TESTING.md` (read earlier in this conversation).
- Investigation status: complete.

## Initial Request And Clarifications

- **Request (user via PM):** "the location is perfect, but is it possible to give a list of the updated files? Currently it only mentions SKILL.md… your skill package has been updated, the following files have been updated." Plus a suggested closing line: re-read the updated files before continuing work that relies on this skill.
- **Screenshot:** `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_c4fb5717-51e1-48f5-a905-a98569974c98/context/ctx_f99386db6da3__58.png`. The "SKILL UPDATED" card in the Agent Package Creator's chat shows:
  - "The following skills you use changed on disk since you last read them";
  - a bullet `agent-package-creation (/…/skills/agent-package-creation/SKILL.md): references/package-anti-patterns.md, references/result-and-handoff-contract.md`, where the `SKILL.md` path renders as a link;
  - "Re-read the updated SKILL.md (and any files it points to)…".

  `SKILL.md` did not change; two reference files did.
- **Direction:**
  - one sentence naming the skill package with its folder shown once;
  - an explicit one-per-line list of changed files relative to the skill folder, each marked changed/added/removed;
  - a closing line "re-read the updated files…";
  - long lists are capped with a count, and several skills get one block each;
  - keep one notice per run per change, the platform-notice marking and every runtime.

## Source Log

| Date | Source | Finding | Implication |
| --- | --- | --- | --- |
| 2026-10-17 | `autobyteus-server-ts/src/skill-update-notices/services/skill-update-notice-builder.ts` | `buildSkillUpdateNoticeText` writes the header; "The following skills you use changed on disk…"; per skill `- name (skillMdPath): file1, file2` (max 10, "and N more"); and "Re-read the updated SKILL.md (and any files it points to)…". Removed skills: `- name: no longer available` plus "Do not rely on a skill that is no longer available." | The single owner of the wording; the misleading parts are the `SKILL.md` path as the skill's label and the "updated SKILL.md" closing line |
| 2026-10-17 | `…/services/skill-version-diff.ts` | `diffSkillVersion` already distinguishes changed (digest differs), added (not in seen) and removed (not in current) files, but merges them into one sorted `changedFiles` list | Carry the per-file status; no new detection needed |
| 2026-10-17 | `…/domain/skill-update-notice-types.ts:13–15` | `SkillChange` `updated` = `{skillName, skillMdPath, changedFiles: string[]}`; `removed` = `{skillName}` | Type change: per-file status and the skill folder |
| 2026-10-17 | `skill-update-notice-service.ts:232` | The text is built once per run from the changes and used for both delivery paths (busy post and preface) | No delivery change |
| 2026-10-17 | `autobyteus-web/components/conversation/segments/SystemTaskNotificationSegment.vue:31–46` | The web labels the card "Skill updated" by sender ID or by the text starting with `[Platform notice — skill updated]` (replayed history); the content renders as Markdown | Keep the header byte-identical; use Markdown-friendly blocks (blank lines around lists) |
| 2026-10-17 | Tests pinning the wording: `tests/unit/skill-update-notices/skill-update-notice-parts.test.ts:98–107`; `tests/integration/skill-update-notices/skill-update-notice-service.integration.test.ts:198–201, 345–346, 365–373, 434`; `tests/e2e/runtime/agy-skill-update-notice-roots.e2e.test.ts:390` | These assert the old phrases | Update with the new wording |
| 2026-10-17 | `autobyteus-server-ts/docs/modules/skill_update_notices.md:70–74` | Documents the old example | Docs sync |
| 2026-10-17 | `seen_skill_versions.json` (per run) | Stores snapshots (file → digest), not notice text | No persisted-data impact |

## Relevant Existing Behavior

| Behavior ID | Current | Evidence |
| --- | --- | --- |
| BEH-001 | The notice labels each skill with its `SKILL.md` path and lists changed files inline after a colon, without a per-file status. The closing line says "Re-read the updated SKILL.md", even when `SKILL.md` did not change. | Builder; screenshot |
| BEH-002 | One notice per run per change, marked as a platform notice, delivered on all runtimes; the web card is labelled "Skill updated" | Feature `2d730b5b12`; web segment |

## Persisted Data And State Facts

Not affected (text only).

## Product Design Request Context

Not requested. Wording direction comes from the user and the PM.

## Supplemental Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| User screenshot (path above) | Shows today's card | Evidence (external, read-only) |

## Assumptions, Unknowns, And Risks

- R-001: the old header must stay identical for the web label and history detection. Covered by DEC-005.

## Architecture Investigation Findings

The source log covers it. The builder, diff and type are the only owners. No delivery, watcher or web code change is required.
