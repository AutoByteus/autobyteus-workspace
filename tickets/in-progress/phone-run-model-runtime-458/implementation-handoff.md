# Implementation Handoff — autobyteus-458 (with the build items of autobyteus-506)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458`, branch `codex/phone-run-model-runtime-458`, base `origin/personal` @ `3b59ef0be1`.

Commits:

| Commit | What |
| --- | --- |
| `36091eee0a` | The build: phone conversation, Text size, composer corner, Settings, catalogs, unit tests |
| `eee06b47ab` | SR-004; stable Settings scope; probe cases MSP-59…64 |
| `679bf2e4b4` | FU-001 |
| `ec5b81f912` | Step 0, REQ-011: the shared stop's ownership rule |
| `075c7274f0` | IR-001 handoff, revision record and check evidence |
| `cdb3ad0025`, `1054deb132`, `41638611b4` | API/E2E's test commits (round 1, MSP-65) |
| `6ddf9bb8f5` | IR-002, CR-001: an Org stop from the phone's Settings keeps the phone where it is |
| docs commit | IR-002 handoff and evidence |

Step 0 is in its own commit as the design asks. It sits after the build in the history, because the PM took it in after the build was done. No commit depends on its order.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Medium / Low). No architecture review. The rule "implementation complete … Small or Medium and Low … direct API/E2E validation" gives `/api_e2e_engineer`.
- Requirements doc: `tickets/in-progress/phone-run-model-runtime-458/requirements-doc.md` (REQ-001…011, AC-001…009, UC-001…006, PRE-001 taken in)
- Investigation notes: `tickets/in-progress/phone-run-model-runtime-458/investigation-notes.md`
- Solution revision record: `tickets/in-progress/phone-run-model-runtime-458/solution-revision-record.md` (SR-001…006)
- Design spec: `tickets/in-progress/phone-run-model-runtime-458/design-spec.md`
- Supplemental task artifacts:
  - UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md` (VIS-001…019). SR-004 overrides its decision 6, DC-005 and VIS-004 for another agent's message.
  - Runnable reference: `/Users/normy/autobyteus_org/autobyteus-web-design` (personal `fc68a7a4d2`).
  - `handoff-implementation.md`, the Solution Designer's handoff to me.
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence:
  - `code-review-report.md` / `code-review-revision-record.md` (CRR-001, failure-origin review of API-REV-001): CR-001, Local Fix.
  - `api-e2e-execution-coverage-report.md` (API-REV-001, F-1), `evidence/api-e2e/api-03b-msp65.log`.
  - The SR-005 evidence is `evidence/implementation/stop-ownership-diagnostic.json`.
- The Solution Designer's latest edits to requirements-doc.md, design-spec.md, handoff-implementation.md and solution-revision-record.md are uncommitted in the worktree; they are his files.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `tickets/in-progress/phone-run-model-runtime-458/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (IR-001 the baseline)
- Related solution revision IDs: SR-003, SR-004, SR-005, SR-006
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` (API/E2E F-1)

The phone (phone runtime only, `isMobileRemoteAccessRuntime()`) now has the following.

- **The specification's readable conversation**
  - 12 px margins and a text column of width − 24 px.
  - One 22 px avatar and the speaker's name per turn.
  - 17 px / 1.5 text, plus the specification's markdown, code, table, card, think, error and media values.
  - Another agent's message unchanged from the desktop: arrow and `agent_message` line (SR-004).
- **A four-step Text size** in the ⋮ menu (15/17/19/21 px), phone-wide, kept in `localStorage` `autobyteus.phone.textSize`.
- **Settings in the ⋮ menu** for an agent run, a Team member or an Org member:
  - the subject row and New run's Runtime and Model rows, on the desktop's `useExistingRunConfigStore`;
  - Save returns to the conversation, and a refusal shows in a red card;
  - a live run shows the red stop icon (`useRunStopAction`), one tap.
- **The composer's lower corners** (`rounded-b-[11px]`) on desktop and phone, with 8 px below the composer on the phone.
- **Step 0:** a stop reports success when the node stopped the run, for an agent and a Team. Desktop and phone share the store.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - Web only; no server, contract, persistence or security change.
  - Settings reuses the desktop owners (store, stop action, New run rows).
  - Step 0 is a one-line rule in two shared stores, behind one helper. It only widens what counts as the same run when the start instance was unknown. A known instance that changed still refuses the local stop (unit tests).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-001 / DS-001 | Phone conversation layout and type | `AgentEventMonitor.vue` (class `phone-conversation`, `--pc-size`, `data-text-size`) → `assets/css/phone-conversation.css`; phone-only markup `conv-turn`/`conv-avatar`/`conv-speaker`/`conv-body` in `AIMessage.vue`, `UserMessage.vue`, `EventMonitorBrowseAssistantRow.vue`; `conv-feed`/`conv-row`/`data-speaker` in `AgentConversationFeed.vue`. `.conv-speaker` hidden everywhere outside `.phone-conversation` | Done. MSP-59 at 412 and 360 px: bodies at x = 12, width 388 / 336; 17 px / 25.5 px; 22 px avatars; one speaker line per turn |
| REQ-002 / DS-002 | Text size | `composables/mobile/usePhoneTextSize.ts` (one module state, `localStorage` key, invalid → Standard); `MobileRunMenu.vue` Text size group (`mobile-text-size-<step>`, `aria-pressed`) | Done. MSP-60: 15/19/21 px at once; Largest kept over a reload |
| REQ-003 (SR-004) | Another agent's message as on the desktop | No phone rule touches `InterAgentMessageSegment` (hiding and padding rules removed in `eee06b47ab`) | Done. MSP-59: the arrow visible inside the 12 px column (the message box at x = 12, width 388); a tap shows `agent_message` |
| REQ-004 | Composer corner, 8 px below | `AgentUserInputTextArea.vue` root `rounded-b-[11px]` (desktop and phone); `.phone-conversation` padding-bottom 8 px | Done. MSP-59 composerGap 8 at both widths; unit test for the class |
| REQ-005 / DS-003 | Settings entry and screen | `MobileRunMenu.vue` (`showSettings`, after Activity); `MobileRunTargetView.vue` (`mobileRunSettingsScope(target) !== null && !remote`); `useMobileNavigation.ts` (`settings` screen); `MobilePairedShell.vue` → `components/mobile/views/MobileRunSettings.vue`; status line from `utils/mobile/mobileRunSubjectLine.ts` (shared with the run screen) | Done. MSP-61: "lead / Stopped · in Delivery Team", Antigravity CLI / Gemini test, Save disabled |
| REQ-006 / DS-003 | Change and Save a stopped run | `MobileRunSettings.vue` `change()` → `updateAgentModelConfig` / `updateTeamScopeModelConfig` / `updateAgentOrgScopeModelConfig`; `canSave` = a model and `store.canSave`; `save()` → `store.save()` → emit back | Done. MSP-61: Grok Build clears the model ("Choose"); Grok 4.7 enables Save; Save → conversation; the node holds `grok_build`/`grok-4.7`; Settings again shows it; a phone message makes the Team run active on Grok. The scope stays one object per run (`eee06b47ab`) |
| REQ-007 | Refusal in a red card, screen stays | `refusal` = the store's error feedback (else a failed stop's message) → `mobile-run-settings-error` `role="alert"` | Done. MSP-62: the run woken on the node before Save; the card shows the store's message for that refusal; nothing changed on the node. "Model not offered" covered by unit test only (see Known Risks) |
| REQ-008 / DS-004 | Live run: stop icon, rows disabled, one tap | `live` = `draft.isActive`; button `mobile-run-settings-stop` (`aria-label`/`title` "Stop run", no text) → `useRunStopAction(stopSubject, { onStopped: reloadCanonical })` | Done. MSP-63 (idle) and MSP-64 (working): the icon; rows and Save disabled; one tap stops; the run is read again ~5 ms after the node answers; rows open; MSP-63 then saves Grok. IR-002 (CR-001): `useRunStopAction(…, { shell: 'mobile' })` → `useWorkspaceHistorySubjectActions({ shell })`; an Org stop writes no route on the phone shell (as open, select and inspect already did). MSP-65: a live Org member stops its Org; Settings stays at `/mobile/?…&screen=settings` with the rows open. The desktop (no shell) still writes `/workspace` in history mode |
| REQ-009 | Catalog keys | `localization/messages/{en,zh-CN}/mobileSettings.ts` registered in both `index.ts` | Done. The rows keep New run's own labels ("Runtime", "Model"), so no `mobile.settings.runtime`/`model` keys were added |
| REQ-010 | No code (DEC-001) | — | — |
| REQ-011 / UC-006 (step 0) | A stop reports success when the node stopped the run | `utils/runInstanceOwnership.ts` `sameRunInstance(atStart, current)`; `agentRunStore.terminateRun` `ownsRequest`; `agentTeamRunStore.terminateTeamRun` members check | Done. Unit tests (agent, Team) fail before and pass after; desktop DCP-001, DCP-003, AFS-001 pass; MSP-64 passes |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Phone conversation: `autobyteus-web/assets/css/phone-conversation.css`, `components/workspace/agent/AgentEventMonitor.vue`, `AgentConversationFeed.vue`, `EventMonitorBrowseAssistantRow.vue`, `components/conversation/AIMessage.vue`, `UserMessage.vue`
- Composer: `components/agentInput/AgentUserInputTextArea.vue`
- Text size: `composables/mobile/usePhoneTextSize.ts`, `components/mobile/runScreen/MobileRunMenu.vue`
- Settings: `components/mobile/views/MobileRunSettings.vue`, `utils/mobile/mobileRunSettingsScope.ts`, `utils/mobile/mobileRunSubjectLine.ts`, `components/mobile/runScreen/MobileRunTargetView.vue`, `components/mobile/MobilePairedShell.vue`, `composables/mobile/useMobileNavigation.ts`
- Catalogs: `localization/messages/{en,zh-CN}/mobileSettings.ts`, both `index.ts`
- Step 0: `utils/runInstanceOwnership.ts`, `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts`
- Tests:
  - Unit specs: `components/mobile/views/__tests__/MobileRunSettings.spec.ts`, `components/mobile/runScreen/__tests__/MobileRunMenu.textSize.spec.ts`, `MobileRunScreen.spec.ts` (stale menu cases rewritten), `utils/mobile/__tests__/mobileRunSettingsScope.spec.ts`, `localization/messages/__tests__/mobileSettingsCatalog.spec.ts`, `components/workspace/agent/__tests__/AgentEventMonitor.phoneConversation.spec.ts`, `AgentUserInputTextArea.spec.ts`, `stores/__tests__/agentRunStore.spec.ts`, `stores/__tests__/agentTeamRunStore.spec.ts`
  - Phone probe: `tests/e2e/mobile-run-settings-cases.mjs` (MSP-59…64), wired in `tests/e2e/mobile-shell-probe.mjs` before MSP-13

## Important Assumptions

1. **Delegated copies have no Settings entry on the phone.** These are task agents and task-team members (`mobileRunSettingsScope` → null). The design's Settings serves agent runs, Team members and Org members. The desktop edits copies through `useDelegatedLaunchDraftStore`, a different owner. Remote runs (on a peer node) have no entry either.
2. **The refusal card shows the store's feedback message**, the same text the desktop editor shows for that refusal. For example, after a run is woken: "This run became active through another connected workflow. Stop it, reopen Settings, and try again." A node message the store passes through, such as a model not offered, shows as the node words it.
3. **No `mobile.settings.runtime`/`model` keys.** The rows are New run's component with its own labels, so Settings and New run name them the same.
4. **A Team member's stop stops its Team run**, and an Org member's its Org run, as on the desktop.
5. **On the phone, an Org stop leaves the route as it is** (`mode=active` stays). `activeWorkspaceTarget` resolves the Org from either `mode`, so the Settings target still resolves (MSP-65: rows open, status "Stopped · in Delivery Org"). The phone writes no Org route of its own for a stop.

## Known Risks

- **Status line in the refused state.** The status line (from the phone's copy of the run) can lag the stop icon (from the node's answer) when the run was woken by another client. In MSP-62 the line said "Stopped" next to the stop icon until the next history read.
- **AC-005's "model not offered" case.** The rows let only offered models reach Save, and the scripted runtimes' model lists are fixed when the node starts. So the phone probe produces the run-active refusal; the model-not-offered message is covered by a unit test with that node message.
- **FU-001 (existing behaviour, not this ticket).** After a reload on a run screen, ← goes to the pairing-link history entry and shows the pairing screen. MSP-60 therefore starts MSP-61 from a fresh `/mobile/` load.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`. The shared stop's guard was routed as a Requirement Gap naming a prerequisite (SR-005); the PM took it in as step 0 (SR-006).
- Evidence / notes:
  - One builder: the status line is shared by the run screen and Settings (`mobileRunSubjectLine`), and the instance rule by the two stores (`sameRunInstance`).
  - Settings builds no list of its own: the rows and stores are the desktop's and New run's.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. `MobileRunTargetView` no longer imports `mobileRunStatusLabel`/`agentStatusDotClass` directly; the temporary probe diagnostics were removed.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. `MobileRunSettingsScope` is a three-kind union; no shared base was widened.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `AgentConversationFeed.vue` has 500 effective lines, as before (+2 / −2, not grown). The largest other changed file is `agentTeamRunStore.ts` at 486. The only file with a >220 changed-line delta is the new `MobileRunSettings.vue` (138 effective lines).
- Notes: SR-004 removed the phone variant of another agent's message entirely, with no leftover rule.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (the one new stored value, the phone's `autobyteus.phone.textSize`, is new; an unknown value reads as Standard)
- Design-spec decision reference: design-spec.md (DS-002)
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- **A fresh worktree needs the shared packages built before the full web suite.** Without them, `UserMessageStoredUploadNames.spec` fails to resolve `autobyteus-ts/agent/message/context-file.js`. `pnpm typecheck` builds them first, and the check runner runs it before the suite.
- **The phone probe needs** `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`.
- **Under machine load,** setup once timed out in the scripted Antigravity CLI's model discovery (load average 74 from processes not of this ticket). A retry passed.
- **TESTING.md discrepancy:** none found.

## Checks Run

Evidence folder: `tickets/in-progress/phone-run-model-runtime-458/evidence/implementation/`. Each `.log` begins with its id, command, commit, environment and date.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-458-guard-web-boundary | `pnpm guard:web-boundary` (autobyteus-web) | ec5b81f912 | macOS, Node, clean env | all web sources | AC-008 | Pass | `IMP-458-guard-web-boundary.log` | `# exit: 0` |
| IMP-458-guard-localization-boundary | `pnpm guard:localization-boundary` | ec5b81f912 | same | catalogs, components | AC-007 | Pass | `IMP-458-guard-localization-boundary.log` | `# exit: 0` |
| IMP-458-audit-localization-literals | `pnpm audit:localization-literals` | ec5b81f912 | same | phone components | AC-007 | Pass | `IMP-458-audit-localization-literals.log` | `# exit: 0` |
| IMP-458-typecheck | `pnpm typecheck` | ec5b81f912 | same | autobyteus-web | all | Pass | `IMP-458-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS` |
| IMP-458-web-unit | `pnpm exec cross-env NUXT_TEST=true vitest run` | ec5b81f912 | same | full web suite | AC-001…009 (unit parts), AC-008 | Pass | `IMP-458-web-unit.log` | `Test Files  760 passed (760)`, `Tests  5701 passed \| 2 skipped (5703)` |
| IMP-458-desktop-stops | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases DCP-001,DCP-003,AFS-001 --output-dir <fresh>` | ec5b81f912 | probe-owned isolated server, scripted AGY and Grok, desktop `nuxt dev` from the worktree | desktop sidebar stop, Settings-row stop, Settings header stop on running runs | AC-009 (desktop), AC-008 | Pass | `IMP-458-desktop-stops.log`, `IMP-458-desktop-stops.json` | `Summary: 3 Pass, 0 Fail` |
| IMP-458-phone-probe-cases | `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-59,MSP-60,MSP-61,MSP-62,MSP-63,MSP-64` | ec5b81f912 | probe-owned alpha/beta nodes, scripted Antigravity and Grok Build, phone bundle from the worktree, Chrome | phone conversation, Text size, Settings, stop | AC-001, 002, 004, 005, 006, 009 (phone) | Pass | `IMP-458-phone-probe-cases.log`, `IMP-458-phone-probe-cases.json` | `mobile-shell probe: Pass`; MSP-64 `afterStop`: `GetAgentRunResumeConfig` right after `TerminateAgentRun`; `browserErrors: []` |
| IMP-458-stop-diagnostic | The SR-005 reproduction (temporary diagnostic, removed) | eee06b47ab + uncommitted | as above | `terminateRun` ownership | AC-006, AC-009 | Fail (the evidence that led to step 0) | `stop-ownership-diagnostic.json` | `instanceBefore: null`, `instanceAfter: "1a8bbca2-…"` |
| IMP-458-unit-repro | New store tests run before the step-0 fix, then after | ec5b81f912 (before: the same tests on eee06b47ab's stores) | Node, vitest | `terminateRun`, `terminateTeamRun` | AC-009 | Pass after (2 failed before) | this table (focused runs) | "a stop that starts with no input instance…" |
| IMP-458-r2-guards | `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals` | 6ddf9bb8f5 | macOS, Node, clean env | all web sources | AC-007, AC-008 | Pass | `IMP-458-r2-guard-web-boundary.log`, `IMP-458-r2-guard-localization-boundary.log`, `IMP-458-r2-audit-localization-literals.log` | `# exit: 0` (each) |
| IMP-458-r2-typecheck | `pnpm typecheck` | 6ddf9bb8f5 | same | autobyteus-web | all | Pass | `IMP-458-r2-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-458-r2-web-unit | `pnpm exec cross-env NUXT_TEST=true vitest run` | 6ddf9bb8f5 | same | full web suite, with the CR-001 tests | AC-001…009 (unit parts), AC-008 | Pass | `IMP-458-r2-web-unit.log` | `Test Files  760 passed (760)`, `Tests  5704 passed \| 2 skipped (5706)` |
| IMP-458-r2-phone-probe-cases | `pnpm -C autobyteus-web build:mobile-web`; `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-59,MSP-60,MSP-61,MSP-62,MSP-63,MSP-64,MSP-65` | 6ddf9bb8f5 | as IMP-458-phone-probe-cases | phone conversation, Text size, Settings, agent, Team and Org stops | AC-001, 002, 004, 005, 006, 009; CR-001 | Pass | `IMP-458-r2-phone-probe-cases.log`, `IMP-458-r2-phone-probe-cases.json` | `mobile-shell probe: Pass`; MSP-65 `url` `/mobile/?…&screen=settings`, `stopped.runtimeDisabled: false`, `nodeAfterStop: false`; `browserErrors: []` |
| IMP-458-r2-desktop-org-stop | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases AFS-002 --output-dir <fresh>` | 6ddf9bb8f5 | as IMP-458-desktop-stops | the desktop Org Settings (running: locks and stops; stopped: edits and saves) | AC-008; CR-001 (desktop unchanged) | Pass | `IMP-458-r2-desktop-org-stop.log` | `Summary: 1 Pass, 0 Fail` |
| IMP-458-r2-unit-repro | The four CR-001 tests run before the fix, then after | 6ddf9bb8f5 (before: the same tests on 41638611b4) | Node, vitest | `useWorkspaceHistorySubjectActions` stop, `useRunStopAction`, `MobileRunSettings` | CR-001 | Pass after (4 failed before) | this table (focused runs) | "stop stops the Org shown on the phone and writes no route" |

- **Rendered results** were inspected in the probe screenshots (`/tmp/458-probe-13/*.png`; the probe's output folder, not committed).
- **Not run, and why:**
  1. **The full `test:e2e:mobile-shell`** (all MSP cases, about 25 minutes), left to API/E2E. Only MSP-59…64 ran. Their module runs before MSP-13 and adds runs of its own; existing cases that count rows run earlier.
  2. **The Android emulator journey** (AC-004, AC-006 on a device), left to API/E2E. The probe exercises the same bundle in Chrome with a phone viewport and touch.
  3. **The Electron suite** (`test:electron`): nothing under `electron/` changed.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** the phone conversation; the ⋮ menu (Settings, Text size); the phone Settings screen; the composer box (desktop and phone).
- **Approved references:** UI/UX spec VIS-001…019 with SR-004's exception; requirements AC-001…009.
- **Reviewed for consistency:** New run's `MobileRuntimeModelRows` and `MobileChoiceSheet`; `MobileScreenBar`; the run screen's status line; the desktop `ExistingRunConfigEditor` (same store, same stop action); `InterAgentMessageSegment`.
- **Testing guideline and rendered surface:** TESTING.md's phone-bundle probe (alpha serves `/mobile`), at 412×915, 360×780 and 390×844, `isMobile`, touch, deviceScaleFactor 2.
- **States, layouts and interactions inspected:**
  - the conversation at 412 and 360 px;
  - another agent's message, before and after the arrow tap;
  - Text size Small, Large and Largest, and the reload;
  - Settings stopped (Team member), runtime changed (model "Choose"), model chosen, saved and reopened;
  - Settings refused;
  - live idle and working, with the stop icon, after the stop, and saved after the stop.
- **Issues found and corrected:**
  - Save stayed on screen though the node saved; the stop's failure message was hidden. Fixed with the stable scope.
  - The stop reported failure for a run it stopped. Fixed in step 0.
  - The phone variant of another agent's message, removed (SR-004).
- **Remaining limitations:**
  - Not exercised on the device or emulator here.
  - The Org member's Settings is covered by unit test only.
  - The status line in the refused state (Known Risks).

## Downstream Coverage Hints / Suggested Scenarios

- **Org member's Settings** on the phone: an Org's direct agent and an Org Team member. Change and Save; the stop stops the Org run.
- **AC-005 "model not offered":** start a node whose scripted runtime offers an extra model (`AGY_FAKE_EXTRA_MODELS`), choose it on the phone, then restart the node without it before Save. The card should show the node's words.
- **Android emulator:** AC-004 and AC-006, with Text size kept across app restarts.
- **The full `test:e2e:mobile-shell`:** check that MSP-59…64, placed before MSP-13, leave the later cases unaffected.
- **Desktop Team stop** for a working Team run from the run tree. Unit-tested; the desktop probe covered agent copies and an Org copy.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent API/E2E validation of AC-001…AC-009, including:

- the emulator journey;
- the full phone probe;
- the desktop unchanged except the composer corner (AC-008).

Isolated nodes and scripted runtimes only; no real provider quotas; no secrets in logs. No release without the founder's word.
