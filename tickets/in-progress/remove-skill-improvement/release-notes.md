## Before You Update
- **Back up your data first.** On the first start, this update deletes the data of the removed Skill Improvement feature (see Upgrade Notes). To back up, quit AutoByteus and copy the `~/.autobyteus/server-data` folder (on a Docker node, the server's data volume).

## Changes
- **Skill Improvement has been removed.** The **Skill Improvement** card in Server Settings and the **Improve skills** button in agent and team chats are gone. It may return later in a different form. To improve a skill today, you can ask an agent to read a run's Work Journal and update the skill.

## Upgrade Notes
- **What the first start deletes:** the earlier skill-improvement and self-evolution records, the built-in **Retrospective Skill Improver** agent and all of its runs (they disappear from your run history), and the settings `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` and `ENABLE_SELF_EVOLUTION`. The **Skill Self-Evolver** agent, if you have it, is kept, but the runs that the old self-evolution feature started with it are deleted too. Nothing else is changed. If something can't be deleted, the app still starts normally and tries again on the next start.
- Going back to an earlier version can't restore the deleted data. Restore it from your backup if you need it.
