# Release Notes — Clearer "Skill updated" Notices

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Improved
- The **Skill updated** notice now names the skill package that changed and shows its folder once.
- It lists exactly the files that changed, one per line, each marked **changed**, **added** or **removed**.
- `SKILL.md` is listed only when it actually changed. A notice about edited reference files no longer reads as if `SKILL.md` changed.
- The agent is asked to re-read the updated files, and it is told when listed files were removed.
- When several skills change at once, each gets its own block. A skill that was uninstalled says it is no longer available.

## Notes
- When and how notices arrive is unchanged: one notice per change, inside the current turn or with the next message.
- File names that contain Markdown characters (for example `__init__.py`) can still display with formatting in the notice card. The agent receives the exact text.
