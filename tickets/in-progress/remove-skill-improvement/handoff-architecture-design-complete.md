# Handoff: Architecture Design Complete: remove-skill-improvement (autobyteus-205)

- Result: `Architecture Design Complete`, task_size `Large`, architectural_risk `High`
- Package: `remove-skill-improvement`; Project Task autobyteus-205; requested by `/project_task_manager` on the user's decision of 2026-10-20 ("let's remove it for now, because I have never used it")
- Revision: SR-003
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`, base `origin/personal`, finalization target `origin/personal`. No release unless the user asks.

## Goal

Remove Skill Improvement completely (server, web, docs, tests) with no shim or dead remainder. Delete its data once at upgrade on every install, as the user decided.

## Approval

- DEC-001 C, by the user (2026-10-20): "regarding the old data for self-improvements, let's just remove them".
- The rest is approved within the direction, with the user informed:
  - the Work Journal is kept (DEC-005);
  - the grant mechanism and `launchPurpose` are removed (DEC-002);
  - FU-001 is a separate decision (DEC-003).

## Key points for review

- **Leaf feature.** Two mechanisms only it uses are removed: direct-message grants (`send_message_to` loses its grant check) and `launchPurpose: server_helper`.
- **Settings.** Three keys are retired through the existing `retiredSettingNames` policy, which deletes them from `.env` at startup.
- **Migration** `20261020_remove_skill_improvement_data`:
  - collects helper run ids;
  - removes their history rows and folders;
  - removes the per-run session folders, the root records (`skill_improvement`, `self_evolution`) and the built-in improver folder.

  It has an ordering guard, never blocks startup, and leaves Memory Sync mirrors and unrelated data byte-identical.
- **Shape inventory.** Every shape maps to a fixture (F-1..F-8b), including shapes not present in the user's data.

## Risks

The router change on the shared `send_message_to` path; generated GraphQL drift in the web.

## Follow-ups

FU-001 (`follow-ups.md`), not sent yet.

## Route

`get_handoff_rules` → the Large/High rule → `/software_engineering_team/architecture_reviewer`.
