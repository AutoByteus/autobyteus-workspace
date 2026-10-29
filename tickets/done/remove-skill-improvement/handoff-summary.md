# Handoff Summary: remove-skill-improvement

## Ticket

- Package `remove-skill-improvement`, Project Task `autobyteus-205`.
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed (architecture review; source review CRR-001 and CRR-003 for the merge; API/E2E API-REV-001..003; test-code review CRR-002, and CRR-004 N/A).
- Delivery revisions: DR-001..DR-003.

## What Changed

- **Skill Improvement is removed** from server and web: records, the Retrospective Skill Improver built-in agent, the manual trigger, the Settings card, the chat "Improve skills" button, the `server_helper` launch purpose and the direct-message grants. `send_message_to` by run ID keeps its result codes.
- **Startup migration `20261020_remove_skill_improvement_data`** deletes the feature's data once:
  - `memory/skill_improvement/` and `memory/self_evolution/`;
  - the per-run feature subfolders;
  - the improver's definition and its runs (folders and history entries);
  - the three retired `.env` keys.

  Everything else stays byte-identical. A second start changes nothing, and a failed step leaves startup working. The Skill Self-Evolver agent is kept.
- **Retired settings** are refused on write.
- **Docs:** the implementation removed the feature's docs; see `docs-sync-report.md`.

## Integration

- DR-001 blocked on INT-001: conflicts with base's Update Notifications in `schema.ts`, `server-settings-service.ts` and `ServerSettingsBasicsPanel.vue`.
- IR-002 resolved them in merge `5cfccd66c7`, keeping base's additions and this ticket's removals, and added the Secret Gate allowlist entry `bda3731947` for the retired-setting text. CRR-003 passed both.
- Merged-state checks, all Pass:
  - IMP-14 typecheck;
  - server unit 6314, integration 421, build and smoke;
  - startup e2e;
  - web unit 4617 and guards;
  - AC-001 sweep;
  - SIR-001/002;
  - Secret Gate.
- API-REV-002 reran the edited server e2e (19/19) and the browser regression.
- `origin/personal` is still `3b2c86ca9e`.

## Verification

- Judged from the evidence. AC-001..AC-004 are proven; AC-005 is the approved release notes. Details are in `release-deployment-report.md`.
- The DR-002 question about FU-005 is settled (API-REV-003, API-18). The Org save failure also occurs on base without this ticket: 4/12 on base vs 3/12 with the ticket, with the same reconnect and stale re-read sequence. It is a follow-up.
- User check: the last part of AC-004. After his backup and upgrade, the user checks that his 4 records, the Retrospective Skill Improver and its 3 runs are gone, and that the Skill Self-Evolver and his other runs remain.

## Accepted Residual

- R-3: a team definition that included the improver loses that member.

## Release

- Beta, decided in advance by the user. See `release-deployment-report.md`.
- `release-notes.md` (approved text) is kept for the next stable; a beta uses generated notes.

## Follow-ups

`follow-ups.md`, FU-001..FU-006, none sent. The Solution Designer sends them when the ticket leaves the team. FU-005 is user-visible: an Org Settings save of a stopped delegated run can show "could not be refreshed" although it was saved. It is pre-existing on base.
