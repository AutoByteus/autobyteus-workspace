## What's New
- Agent, team, and messaging launch setup no longer asks users to choose a **Skill Access** mode.

## Improvements
- Runs now consistently use the skills configured on each agent definition; broad/orchestrator agents should be configured with the full set of allowed skills up front.
- SDK and GraphQL contracts now expose only configured-skill launch behavior (`PRELOADED_ONLY`) and explicit no-skill suppression (`NONE`).

## Fixes
- Removed the legacy **All installed skills** / `GLOBAL_DISCOVERY` mode so agents with no configured skills no longer fall back to every installed skill.
- Added startup migration for older run/team/channel metadata that still stored `GLOBAL_DISCOVERY`, rewriting those records to configured-only behavior.
