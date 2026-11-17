# Implementation Handoff — autobyteus-522 (phone Settings for every run)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522`, branch `codex/phone-settings-every-run-522`, base `origin/personal` @ `3722dbb1d8`.

| Commit | What |
| --- | --- |
| `ce61209db1` | The change, its specs and the phone probe cases MSP-67…72 |
| `4e9d7c4067` | R-002: the run menu's entry assertions in their own `MobileRunMenu.spec.ts` (coordination with autobyteus-525) |
| docs commit | This handoff, the revision record and check evidence |

**Coordination with autobyteus-525 (R-002).** 525 removes the menu's Text size block, deletes `MobileRunMenu.textSize.spec.ts` and moves the `mobile.settings.textSize*` keys.

- **This ticket's menu assertions** are in `components/mobile/runScreen/__tests__/MobileRunMenu.spec.ts`. The Text size spec only drops the removed `showSettings` prop and its stale case.
- **The probe cases** are in their own module. `mobile-shell-probe.mjs` gains one import, one call and one header entry.
- **Rebase:** `origin/personal` did not have 525 at `4e9d7c4067` (fetched 2026-11-17), so no rebase was needed. Whichever merges second keeps both: Settings after Activity for every run plus `mobile.settings.remoteRun`; no Text size in the run menu.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Small / Low); no architecture review. The rule "implementation complete … Small or Medium and Low … direct API/E2E validation" gives `/api_e2e_engineer`.
- Requirements doc: `tickets/in-progress/phone-settings-every-run-522/requirements-doc.md` (REQ-001…006, AC-001…007, BEH-001…006, DEC-001…004)
- Investigation notes: `tickets/in-progress/phone-settings-every-run-522/investigation-notes.md` (R1, R2, U-002)
- Solution revision record: `tickets/in-progress/phone-settings-every-run-522/solution-revision-record.md` (SR-001)
- Design spec: `tickets/in-progress/phone-settings-every-run-522/design-spec.md`
- Supplemental task artifacts:
  - `evidence/investigation/mobile-settings-every-run-repro-cases.mjs`, the reproduction the probe cases came from;
  - the 506/458 phone specification (UIS-003).
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial handoff)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/phone-settings-every-run-522/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

The phone's Settings is now decided by the run that holds the opened agent (`target.browse`), not by the kind of run. Every run's ⋮ menu has Settings after Activity, covering:

- standalone agents;
- standalone Team members;
- an Org's own agents and Org Team members;
- task agents and task-team members under an agent, a Team or an Org;
- runs on another node.

A run of this node is loaded, edited, saved and stopped as its own run (or its own address in its Team or Org run), with 458's screen, store and stop. A run on another node shows its name, its status line and "This run is on {node}. Its runtime and model can be changed only on that node.", with no rows, no Save and no stop.

The BEH-005 defect is fixed. Before, a task agent opened under a standalone Team's member loaded and saved the Team member; now it loads, saves and stops its own run.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: phone shell only (one utility, the Settings screen, the run screen and menu, one catalog key); no server, store, stop action or contract change. Every delegated kind the node served in the probe answered as R1 found (`RUN_ACTIVE` live, editable when stopped, saves change that run or member only). No escalation trigger fired.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 (BEH-001…005) | Settings for every run, after Activity | `MobileRunMenu.vue` (Settings after Activity always; `showSettings` prop removed); `MobileRunTargetView.vue` (no condition) | Done. Specs: the menu for each kind, a remote run included. Probe: MSP-67 (task team member), 68 (task agent), 70 (Org's task agent and task team member), 72 (peer run) |
| REQ-002 / DS-001 | The opened agent's own runtime and model in the run that holds it | `utils/mobile/mobileRunSettingsScope.ts` maps `browse`: `run` → agent, `teamMember` → team at the member's address, `agentOrgMember` → agent_org at the member's address, `peerRun` → remote; `MobileRunSettings.vue` loads, edits and saves by the scope (458) | Done. Probe: MSP-67 (only the member changes, the other member as it was; Settings again shows it; a message continues), MSP-68, MSP-70 (task agent; task team lead, mate unchanged, the Org's own members unchanged), MSP-71 (an Org Team member) |
| REQ-003 / DS-002 | A live run's stop stops the run that holds the agent | `stopSubject` from the scope (458), `useRunStopAction` unchanged | Done. MSP-67 (task team stopped, the PTM run as it was), MSP-68 (task agent only), MSP-70 (task agent and task team stopped, the Org still active) |
| REQ-004 / DS-003 | A run on another node: the sentence, no rows, no Save | `MobileRunSettings.vue`: `scope.kind === 'remote'` → `store.clear()`; `mobile-run-settings-remote` with the node from `useTargetConversation().remoteView.remote`; rows and Save bar not rendered; stop subject null | Done. MSP-72: "This run is on beta-node. Its runtime and model can be changed only on that node."; no rows, no Save, no stop; ← back to the conversation |
| REQ-005 (BEH-005) | A Team member's task agent saves its own settings | `browse = run(helper)` → scope `agent` | Done. MSP-69 on the base: the lead changed, the task agent did not. With the change: the task agent changed, the lead as it was. Spec for the mixed target |
| REQ-006 | Catalog keys | `mobile.settings.remoteRun` in `localization/messages/{en,zh-CN}/mobileSettings.ts` | Done. Written `{{node}}`, the catalogs' interpolation syntax (the design writes `{node}`). Catalog spec and literals audit |
| AC-007 | Preserved | — | 458's phone cases MSP-60…66 pass; full web suite |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Code:
  - `autobyteus-web/utils/mobile/mobileRunSettingsScope.ts`
  - `autobyteus-web/components/mobile/views/MobileRunSettings.vue`
  - `autobyteus-web/components/mobile/runScreen/MobileRunTargetView.vue`
  - `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue`
  - `autobyteus-web/localization/messages/{en,zh-CN}/mobileSettings.ts`
- Specs:
  - `components/mobile/runScreen/__tests__/MobileRunMenu.spec.ts` (new, R-002)
  - `utils/mobile/__tests__/mobileRunSettingsScope.spec.ts`
  - `components/mobile/views/__tests__/MobileRunSettings.spec.ts`
  - `components/mobile/runScreen/__tests__/MobileRunMenu.textSize.spec.ts`
  - `components/mobile/runScreen/__tests__/MobileRunScreen.spec.ts`
- Probe: `tests/e2e/mobile-every-run-settings-cases.mjs` (MSP-67…72), wired in `tests/e2e/mobile-shell-probe.mjs` after 458's cases and before MSP-13

## Important Assumptions

- **The remote sentence** takes the node's name from `remoteView.remote`, the run screen's chip source. When the peer row has not arrived, the name is empty; the run screen would show no chip either (design R-001).
- **A remote run's screen clears the store**, so nothing from an earlier run's draft shows.
- **The 458 test** "reads the run again only for another run" now switches runs by `browse`, as the real target builders do. Changing only `context` no longer means another run.

## Known Risks

- **U-002, answered.** Inside an Org, `/docs_review_team` is "not the address of an available agent or agent team": the Org already holds that Team as its squad. MSP-70 therefore delegates `/delivery_team` as the Org's task team. The phone path is the same for any task team.
- **The full phone probe** (all MSP cases) is left to API/E2E. MSP-67…72 create runs of their own and run before MSP-13, after 458's cases.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` (a second, kind-based derivation of the owning run)
- Reviewed refactor decision: `Refactor Needed Now` (small: the scope reads `browse`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the switch is exhaustive over `AgentRunReadSubject`, so a new read-subject kind fails the type check. No `default`, no `null`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed: the kind switch and its `null`; `showSettings` (computed, prop and the `mobileRunSettingsScope` import in `MobileRunTargetView`); the `!open` null checks in `MobileRunSettings`; the spec asserting delegated kinds get `null`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`MobileRunSettingsScope` gains one variant, `remote`)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. All are small; the largest is `MobileRunSettings.vue`, about 150 effective lines.
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The phone probe needs `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`.
- The branch is 13 commits behind `origin/personal`, the base the Solution Designer set; not merged here.
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build output; not committed.

## Checks Run

Evidence folder: `tickets/in-progress/phone-settings-every-run-522/evidence/implementation/`. Each `.log` begins with its id, command, commit, environment and date.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-522-repro-before | The base's product sources (`git stash` of the six product files) → `build:mobile-web`; `test:e2e:mobile-shell --cases=MSP-67,…,MSP-72` | 3722dbb1d8 bundle + the new cases | probe-owned alpha/beta, scripted Antigravity and Grok Build, Chrome | the base's Settings decision | AC-001…006 before | Fail as expected | `IMP-522-repro-before.log`, `.json` | MSP-67/68/72 "no Settings in the ⋮ menu of this run"; MSP-69 `after.lead.runtimeKind: grok_build`, `after.helper.runtimeKind: antigravity_cli` (BEH-005); MSP-71 Pass |
| IMP-522-phone-probe-cases | `test:e2e:mobile-shell --cases=MSP-60,…,MSP-72` | ce61209db1 | as above | 458's and 522's phone cases | AC-001…007 | Pass (attempt 2; attempt 1 stopped in setup on the scripted CLI's model-discovery timeout, load average about 160: `IMP-522-phone-probe-cases-attempt1-setup-timeout.log`) | `IMP-522-phone-probe-cases.log`, `.json` | `mobile-shell probe: Pass`; 13 cases `Pass`; `browserErrors: []` |
| IMP-522-guards | `pnpm guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | ce61209db1 | macOS, Node, clean env | web sources, catalogs | REQ-006, AC-007 | Pass | `IMP-522-guard-web-boundary.log`, `IMP-522-guard-localization-boundary.log`, `IMP-522-audit-localization-literals.log` | `# exit: 0` |
| IMP-522-typecheck | `pnpm typecheck` | ce61209db1 | same | autobyteus-web (the exhaustive switch) | all | Pass | `IMP-522-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-522-web-unit | `pnpm exec cross-env NUXT_TEST=true vitest run` | ce61209db1 | same | full web suite | AC-001…007 (unit parts) | Pass, with one load timeout: `Tests  1 failed \| 5738 passed \| 2 skipped`; the one failure is `CollaborationMessagesOrgRoot.integration.spec.ts` "reveals and opens the last reference…", `Test timed out in 5000ms` at load average about 160. It passes alone (next row). Not touched by this ticket | `IMP-522-web-unit.log` | `Test Files  1 failed \| 761 passed (762)` |
| IMP-522-web-unit-rerun-org-messages | `pnpm exec cross-env NUXT_TEST=true vitest run components/workspace/collaboration/__tests__/CollaborationMessagesOrgRoot.integration.spec.ts` | ce61209db1 | same | the timed-out spec | AC-007 | Pass | `IMP-522-web-unit-rerun-org-messages.log` | `Tests  3 passed (3)`; the case in 1407 ms |
| IMP-522-run-menu-specs | `pnpm exec cross-env NUXT_TEST=true vitest run components/mobile/runScreen` | 4e9d7c4067 | same | the run screen, its menu (new `MobileRunMenu.spec.ts`), Text size | REQ-001, AC-007 | Pass | this table (focused run) | `Test Files  3 passed (3)`, `Tests  26 passed (26)` |

- **Rendered results** were inspected in the probe screenshots: MSP-67 (task team member, live, stop icon), MSP-69 (the lead's task agent, its own values), MSP-72 (the remote sentence).
- **Not run, and why:**
  1. **The full `test:e2e:mobile-shell`,** left to API/E2E.
  2. **The Android emulator journey of the founder's case** (AC-001), left to API/E2E as the handoff says.
  3. **Desktop probes:** the desktop is untouched (no shared file changed).

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** the run screen's ⋮ menu; the phone Settings screen for every kind of run, and its remote state.
- **Approved references:** UIS-003 (458/506) and REQ-004's sentence.
- **Reviewed for consistency:** 458's Settings screen and subject line; the run screen's remote chip (`RemoteNodeChip`, the same node-name source).
- **Testing guideline and rendered surface:** TESTING.md's phone-bundle probe at 390×844, `isMobile`, touch.
- **States inspected:** the menu on each kind; a live task-team member (stop icon, rows disabled); stopped after the stop (rows open); a changed selection; saved and reopened; the lead's task agent, stopped; a peer run's remote state; ← from it.
- **Issues found and corrected:** none in the product. In the probe:
  - the row lookup follows list order and depth (task-team members are keyed beside their team row);
  - older runs are reached through "Show older";
  - a missing Settings entry closes the menu and fails clearly.
- **Remaining limitations:** not exercised on a device or emulator here.

## Downstream Coverage Hints / Suggested Scenarios

- **The founder's case on the Android emulator** (AC-001): the PTM's task team member, live → stop → change → Save → a message.
- **A task team under a standalone Team's member** (the design's table row "A task team's member opened in a standalone Team's tree"). Not in the probe cases.
- **The Org's task team via another recipient,** if the Docs Review Team must be the one (U-002: inside the Org it is the Org's own squad).
- **A peer run whose node row has not arrived yet** (the sentence without a node name).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent API/E2E validation of AC-001…007, including:

- the emulator journey;
- the full phone probe;
- the desktop unchanged.

Isolated nodes and scripted runtimes only; no provider keys; no secrets in logs. Release only on the founder's word.
