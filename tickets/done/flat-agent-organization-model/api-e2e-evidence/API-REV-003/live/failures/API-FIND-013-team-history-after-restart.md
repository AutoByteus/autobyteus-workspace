# API-FIND-013 — standalone Team history disappears after process restart

## Scenario and expected behavior

- Scenario: `TEAM-RST-003`; `SCN-005/006/010`; `AC-007`, `AC-009`, `AC-011`,
  `AC-013`, `AC-020`.
- Mode: two real standalone Team V2 runs created in the production browser; one
  includes ordinary messaging and the other a supported task submission,
  revision, resubmission, and acceptance. Both roots were stopped. The backend
  then received real `SIGTERM`, exited cleanly, and restarted on the same
  isolated data root.
- Expected: Refresh exposes inactive Team history rows; the user can Restore a
  Team, see exact prior messages/task history, and continue the conversation.

## Observed boundary facts

- Both Team V2 directories and `team_run_history_index.json` entries remain on
  disk after restart.
- Generic `listCollaborationRootHistory` still returns both Team root IDs and
  the AgentOrg root with explicit `root_subject_kind`.
- The production UI's refreshed workspace history displays
  `No task history in this workspace.` and exposes no inactive Team row.
- The exact post-restart `workspaceRunHistory` response contains
  `teamDefinitions: []` and `agentDefinitions: []` for the persisted workspace.
- AgentOrg history in the same process/data root remains visible and Restores
  successfully, controlling for browser, server, data root, and workspace.
- Therefore the real user cannot Restore or resume either persisted standalone
  Team through the normal Team history surface.

## Evidence

- `../graphql-history-after-route-release.json`
- `../graphql-team-workspace-history-after-restart.json`
- `../screenshots/TEAM-HISTORY-MISSING-AFTER-RESTART-390x844.png`
- `../persistence/team/task_delegation_records-before-restart.json`
- `../persistence/team/team_run_execution_tree-before-restart.json`
- `../server-data/memory/team_run_history_index.json`
- retained Team V2 packages under `../server-data/memory/agent_teams/`

## Preliminary classification

`Unclear — likely implementation Team workspace-history projection/read-model
startup boundary.` Focused failure-origin review is required.
