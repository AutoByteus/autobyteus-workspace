# Requirements — autobyteus-526 round 2 (`follow-ups-448-final`)

- Status: `Approved` by the user, 2026-11-20; REQ-003 revised by the Solution Designer within FU-001's own direction ("make the close bounded or the test robust") after IR-001 (SR-002), user informed ("Yes agreed" to the Solution Designer's recommendation: a small final round; FU-004 parked)
- Revision `SR-001`; Project Task `autobyteus-526` (part of `autobyteus-530`), requested by `/project_task_manager` for the user
- Base `origin/personal` @ `8f2d209b2c765dd7fc6a2f07fefc5497f20bfe16`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-448-final`, branch `codex/follow-ups-448-final`; release only on the founder's word

## Re-analysis (2026-11-20, current base)

| Item | State | Evidence |
| --- | --- | --- |
| FU-002 + local time (round 1) | released in v1.5.14-beta.1..3 | `git merge-base --is-ancestor e9ee63beec v1.5.14-beta.1` |
| FU-009 | closed by autobyteus-524 round 2 | Task comment 2026-11-18 |
| FU-001 (watcher unit test close in `afterEach`) | addressed by autobyteus-517 `b55ce60b5e`: the hook timeout is `IN_PROCESS_SERVER_HOOK_TIMEOUT_MS` with the reason in a comment | `agent-package-folder-watcher.test.ts` L57-62 |
| FU-008 interrupt-result-presentation probe | fixed by autobyteus-533 `45cae5ebd2` | commit message |
| FU-008 BG-BROWSER-004 (`background-agent-renderer-contention-probe.mjs`) and `agent-org-draft-retention-probe.mjs` | not checked since 2026-11-17; both touched by autobyteus-279/540 | `git log` |
| FU-007 | narrower than written: `TeamMemberRow` is in use (`TeamTokenUsageSummary` ← `TokenUsageMeterPanel`); `RunningTeamGroup` and `RunningTeamRow` are mounted only by `tests/e2e/fixtures/team-activity-presentation.page.vue` (which also covers the live `WorkspaceHistoryWorkspaceSection`) and their specs; 8 localization keys per language | `rg` on the base |
| FU-004 | **parked by the user** (2026-11-20): the agent is told after an unexpected stop (448 DEC-008); build only if leftovers are seen in practice | conversation |

## Requirements

| ID | Requirement | AC |
| --- | --- | --- |
| REQ-001 | Remove `RunningTeamGroup.vue`, `RunningTeamRow.vue`, their specs, their 8 localization keys (en, zh-CN) and the `RunningTeamGroup` part of the team-activity-presentation fixture and probe; the probe keeps covering `WorkspaceHistoryWorkspaceSection`; `TeamMemberRow.vue` stays | AC-001: no reference to the two components remains (search); web typecheck and unit suites pass; the team-activity-presentation probe passes; the localization guards (`guard:localization-boundary`, `audit:localization-literals`) pass; `typecheck-baseline.json` updated if the fixture's count changes |
| REQ-002 | The two remaining FU-008 probes pass on this branch: run each first on the base; fix only their own test setup (fixture GraphQL operations, sockets) when they fail, and find why BG-BROWSER-004's transient Team row disclosure does not appear if it still fails | AC-002: `test:e2e:background-contention` (BG-BROWSER-000..004) and `test:e2e:agent-org-draft-retention` pass, with logs; if one already passes on the base, that is recorded and nothing changes |
| REQ-003 | (SR-002) FU-001: `agent-package-folder-watcher.test.ts` no longer waits for real OS file events: it keeps real folder operations (create, rename, replace, delete) and drives the watcher through its injected event sources (`createWatcher`, `createParentFolderWatch`), delivering each event after the operation; real OS events stay covered by `tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts`. The watcher's own code is unchanged | AC-003 (SR-002): the unit file passes 20/20 consecutive runs on this (loaded) machine, each run well inside vitest's defaults; every behavior it covered before is still asserted (case list before/after in the handoff); the integration file is unchanged |

## Scope Guardrail

- In scope: UC-001 (FU-007), UC-002 (FU-008 rest), UC-003 (FU-001 confirm).
- Out of scope: FU-004 (parked); product behavior; other probes.
- Preserved: everything users see; `TeamMemberRow` and the token usage panel.
- Prerequisites: None.
