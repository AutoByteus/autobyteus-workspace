# Investigation Notes — mention-candidates-in-run

## Bootstrap
- Package: `mention-candidates-in-run`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run`, branch `codex/mention-candidates-in-run`
- Base: `origin/personal` @ `f48dbfbf3` (includes mention-delegation-dismissal, v1.4.95-beta.6); finalization target `origin/personal`
- Predecessor: `tickets/done/mention-delegation-dismissal/` (SR-003 preserved "@ candidates unchanged", BEH-001; handoff residual "UI copy is unchanged")

## Request (2026-10-06, relayed by /tutorial_video_producer)
User cannot find Agent Package Creator in the `@` menu of the Tutorial Video Producer chat, although `send_message_to("/agent_package_creator")`
from that run returned DELIVERED. Also: menu copy still says "Bring into this run" / "{agent} ... brings them into this run".

## Evidence
| ID | Source | Observation |
| --- | --- | --- |
| E-01 | user screenshot (relayed) | Menu "Bring into this run @" lists Memory Compactor, Skill Self-Evolver, Professor, Student…; focused agent: tutorial video producer. |
| E-02 | read-only: `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_eeb082dd8d3f473d8958261cc1fcf88d/team_run_execution_tree.json` | Root team `collaborators`: `/agent_package_creator` (run `agent_package_creator_4506122f…`, `addedViaAgentRunId` = api_e2e_engineer_73ce3a13…) and `/tutorial_video_producer` (added via delivery_engineer_56c738c3…). `taskExecutions: []`. |
| E-03 | same | Agent Package Creator is **already in the run** as a collaborator, added earlier by the API/E2E engineer's agent-initiated `send_message_to`. The producer's later `send_message_to` reached that same instance (same run ID) — no second copy. |
| E-04 | `server src/agent-collaboration/collaborators/collaborator-candidate-policy.ts:137-145` | `@` candidates skip every definition already in the run (root's own, configured placements, collaborators, collaborator-Team members). `requireAdmissible` (166-177) rejects in-run definitions ("is already in this run") unless they have a collaborator entry. |
| E-05 | web `docs/chat.md` §`@` In A Live Run | "Shared Agents …, then shared Agent Teams, minus what is already in the run." |
| E-06 | `autobyteus-web/localization/messages/en/chat.ts:7,83,84,86` | `chat.new.subtitleDefaultAfterAt` "to bring in an agent or team."; `chat.mentions.headerPrefix` "Bring into this run"; `listAria` "Agents and teams you can bring into this run"; `footerRelay` "{{agent}} gets your message and brings them into this run". |

## Analysis
- Not an availability defect: the exclusion is the designed policy. It made sense when `@` *added* a collaborator (adding an agent
  that is already present is pointless). Since mention-delegation-dismissal, `@` asks the focused agent to delegate a fresh closable copy,
  so excluding in-run definitions now hides valid targets — every configured team member and every collaborator. The predecessor kept the
  candidate list unchanged on purpose (BEH-001 preserved), so this is a requirement gap from that change, not an implementation bug.
- The menu copy describes the old behavior (E-06).

## Open Questions
- Q-1 Offer in-run definitions in `@`? If yes, what should the note tell the agent for them (message the existing instance vs. delegate a fresh copy)?
- Q-2 New menu wording (en + zh-CN).
