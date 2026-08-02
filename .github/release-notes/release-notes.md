## What's New

- Native AutoByteus agents now receive a concise catalog of their configured skills and read the current `SKILL.md` instructions from the advertised path when needed.

## Improvements

- Skill instruction updates can be observed on the next direct read in an active native run without restarting it.
- Launch-time prompts stay smaller by carrying skill names, descriptions, and paths instead of complete instruction bodies.
- File and shell access remains explicitly controlled by each agent definition rather than being granted automatically with a skill.

## Fixes

- Removed stale launch-time skill-body copies and the redundant dedicated skill-loading tool group.
- Prevented unconfigured or unresolved skills from being advertised to native agents.
