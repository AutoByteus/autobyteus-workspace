# Handoff Summary

## Summary Meta

- Ticket: `follow-ups-448-final` (Project Task `autobyteus-526`, part of `autobyteus-530`), **round 2**. The user approved the round in the Solution Designer conversation. Round 1 was `restored-run-turn-ids` (`tickets/done/restored-run-turn-ids/`). FU-004 is parked by the user. The round ends with cleanup and a record copy (the founder's direction), so its folder is archived as `tickets/done/follow-ups-448-final/`.
- Date: `2026-11-20`
- Classification: `task_size: Small`, `architectural_risk: Low`, direct route.
  - Architecture review, code review and test-code review: `Not Applicable` (not selected on this route).
  - SR-002 changed the FU-001 approach after IR-001 hit its escalation trigger.
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/follow-ups-448-final`, base `origin/personal` @ `8f2d209b2c`. Integrated by merge of `01ebb4ddce` (a delivery record only) as `f68268060d`. Code tested at `03d3ff8e04`.

## Delivery Summary

- FU-007: the unmounted running-team panel is removed:
  - `RunningTeamGroup.vue`, `RunningTeamRow.vue`, `TeamActivityDot.vue`, their specs, their 8 localization keys (en, zh-CN) and the panel's part of the team-activity fixture and probe.
  - `TeamMemberRow.vue` stays. The Workspaces tree's universal Team status is unchanged.
- FU-008: the two remaining browser probes pass again.
  - `agent-org-draft-retention` follows the app's current setup (`c443fa09c1`).
  - `background-contention` BG-BROWSER-004 reads the Team's tree as the app builds it now (`7caf3f866c`).
- FU-001 (SR-002): `agent-package-folder-watcher.test.ts` keeps its real folder operations and delivers each event through the watcher's injected event sources, so it no longer waits for macOS FSEvents. Real OS delivery stays covered by `package-auto-refresh.integration.test.ts`.
- Docs: the paragraph about the removed surface was removed from `autobyteus-web/docs/agent_execution_architecture.md` (implementation). Delivery confirmed that no doc names the removed components or selectors, and proposes a TESTING.md watcher-test rule to its owner (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery; no user check needed. AC-001..AC-003 are directly proven (`release-deployment-report.md`, Verification):
  - no code reference or `data-test` selector of the removed panel is left;
  - web typecheck 86/36 at baseline, the three guards exit 0, server typecheck 1006/315 at baseline;
  - probes pass: team-activity SR006-BR-001..004, team-status-live TS-001..009, background-contention BG-BROWSER-000..007 (including 004), Org draft-retention API-E2E-003-A..E, each `failures: []`;
  - the watcher unit test passes 10/10 at load ~65 with `fseventsd` ~157% CPU, 22/22 tests each. A reverted mutation without fake events failed 16 of 22, which shows the fakes drive the cases.
- Final confidence: 93%, no category below 90%. The gap is the unchanged real-OS integration test (AC-012 timed out while `fseventsd` dropped 3 of 8 plain `fs.watch` events), which is outside this round.
- Web unit suite: 780 of 781 files pass. The one failure, `ServerSettingsBasicsPanel.spec.ts`, fails identically on the base; it is FU-001 in this round's `follow-ups.md`.
- Secret Gate PASS on the ticket commits and the merged state; artifact hygiene PASS.

## Residual Risks For The User

- `package-auto-refresh.integration.test.ts` (real OS events) still times out when `fseventsd` is saturated (TESTING.md "File watching on a busy Mac").
- Linux not run.
- FU-004 of autobyteus-448 (native commands left running after a crash) is parked by the user.

## Follow-ups

- `follow-ups.md` FU-001: `ServerSettingsBasicsPanel.spec.ts` fails on the base (the auto-update card's "GitHub" text against autobyteus-337's spec). Not urgent.

## Release

- No release: the founder releases only on his word (handoff file), and that is RELEASE.md's default. No release notes: the round changes no user-facing behavior. It removes an unmounted panel and repairs tests.
