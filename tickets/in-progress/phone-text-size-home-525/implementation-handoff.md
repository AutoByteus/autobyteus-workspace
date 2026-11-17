# Implementation Handoff — phone-text-size-home-525 (autobyteus-525)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review not selected (`Medium` / `Low`, direct implementation, Solution Designer's `handoff.md`)
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/design-spec.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md` (same folder)
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch `codex/phone-text-size-home-525`; implementation commit `7c7f3d2e79` (on base `origin/personal` @ `ff13782f36`); this handoff and the evidence are in the commit after it.

On the phone page the app font owner `appFontSizeStore` takes the phone Text size step as its source (chosen once by plugin `06.appFontSize.client.ts` with `isMobileRemoteAccessRuntime()`): root font size 16 px × step/17, editor/terminal px 14 × step/17 rounded, written by `applyPhoneTextSizeToDocument` with `data-phone-text-size="<step>"` on `<html>`. Every rem-based phone screen follows; the conversation is `1.0625rem` (exactly 15/17/19/21 px); Monaco follows through `resolvedMetrics` unchanged. The control is the new `MobileOnThisPhoneMenu.vue` (⋮ on the right of the run list header; menu headed "On this phone" with the Text size group). The run's ⋮ has no Text size. The desktop path (`initialize`, `setPreset`, `resetToDefault`, `applyAppFontSizeToDocument`) is unchanged.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 14 source/style/catalog files in the web frontend, one existing owner extended, no contract, persistence format, server, Android or deployment change; desktop functions unchanged in code (desktop unit tests unchanged and green, IMP-01). No phone screen needed a redesign at Largest (IMP-02 MSP-67), so the escalation trigger did not fire.
- Selected route: `Direct API/E2E` (per `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (below, "Self-review")
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Text size on the run list in "On this phone"; run ⋮ without it; same key/values/default | `MobileRunList.vue` header → `MobileOnThisPhoneMenu.vue` → `appFontSizeStore.setPhoneTextSize` → `phoneTextSizeSteps.writeStoredPhoneTextSizeStep` (`autobyteus.phone.textSize`); `MobileRunMenu.vue` block removed | MSP-60: menu "On this phone"/"Text size", each step at once with the menu open, Esc → focus on ⋮, run ⋮ entries Artifacts…Settings with no Text size, kept over reload |
| BEH-002 | Every phone screen scales by step/17; conversation exact px; fixed px follow | plugin 06 → `initializePhoneTextSize` → `applyPhoneTextSizeToDocument` (root %); `phone-conversation.css` `.conv-feed { font-size: 1.0625rem }`; `MobileRunRow.vue` rails/indent in rem; `phone-text-size.css` (`html[data-phone-text-size] .text-\[11px\]`) imported by `MobileRemoteAccessShell.vue` | MSP-60: root 14.12/16/17.88/19.76 px, run name 13.24/15/16.76/18.53 px, feed 21 px at Largest; first screen after reload already at 19.76 px (QR-001); MSP-67: 34 screens clean at Largest |
| BEH-003 | Code in the phone file viewer follows | `phoneTextSizeMetrics` editor px → `resolvedMetrics.editorFontPx` → `MonacoEditor.vue` (unchanged) | MSP-67: `src/app.ts` at 17 px at Largest; unit: 12/14/16/17 |
| BEH-004 | Desktop unchanged | `initialize`/`setPreset`/`resetToDefault`/`applyAppFontSizeToDocument` unchanged; plugin calls `initialize()` off the phone; `setPhoneTextSize` throws off the phone | Desktop specs `appFontSizeStore.spec.ts`, `DisplaySettingsManager.spec.ts`, `MonacoEditor.spec.ts`, `Terminal.spec.ts` unchanged and green (IMP-01) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Added: `autobyteus-web/display/fontSize/phoneTextSizeSteps.ts`; `components/mobile/runList/MobileOnThisPhoneMenu.vue`; `assets/css/phone-text-size.css`; `localization/messages/{en,zh-CN}/mobileOnThisPhone.ts`.
- Modified: `stores/appFontSizeStore.ts`; `display/fontSize/appFontSizeDom.ts`; `plugins/06.appFontSize.client.ts`; `components/mobile/runList/MobileRunList.vue`, `MobileRunRow.vue`; `components/mobile/runScreen/MobileRunMenu.vue`; `components/mobile/MobileRemoteAccessShell.vue`; `components/workspace/agent/AgentEventMonitor.vue`; `assets/css/phone-conversation.css`; `localization/messages/{en,zh-CN}/{index,mobileSettings}.ts`.
- Removed: `composables/mobile/usePhoneTextSize.ts`; `components/mobile/runScreen/__tests__/MobileRunMenu.textSize.spec.ts`.
- Tests: new `display/fontSize/__tests__/phoneTextSizeSteps.spec.ts`, `stores/__tests__/appFontSizeStore.phoneTextSize.spec.ts`, `components/mobile/runList/__tests__/MobileOnThisPhoneMenu.spec.ts`, `components/mobile/runScreen/__tests__/MobileRunMenu.spec.ts`; updated `MobileRunList.spec.ts` (rem rails, header ⋮), `AgentEventMonitor.phoneConversation.spec.ts`, `mobileSettingsCatalog.spec.ts`; probe `tests/e2e/mobile-run-settings-cases.mjs` (MSP-60 rewritten, MSP-66 reads the root step, new MSP-67) and the probe's case list/helpers in `mobile-shell-probe.mjs`.

## Important Assumptions

- ASM-001 (requirements): the phone never shows the desktop Display setting, so on the phone the step is the only source.

## Known Risks

- RSK-002: autobyteus-522 edits `MobileRunMenu.vue`, the removed `MobileRunMenu.textSize.spec.ts`, `mobileSettings.ts` and `mobile-shell-probe.mjs`. Whichever merges second rebases: keep 522's prop/Settings change and `mobile.settings.remoteRun` key, and this ticket's removal of the Text size block and keys; 522's "Settings after Activity" assertion belongs in the new `MobileRunMenu.spec.ts`.
- The conversation's avatar (22 px) and side margins (12 px) are fixed px in `phone-conversation.css` and do not scale (design: stays unless a problem is seen); at Largest the avatar looks a little small next to 21 px text but nothing overlaps (screenshot `MSP-67-412-conversation.png`).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Refactor Needed Now` (fold the phone step into the app font owner; remove `usePhoneTextSize`)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: one root writer (`writeMetrics` in `appFontSizeDom.ts`) for both sources; no component reads the step to size itself; the store does not call `isMobileRemoteAccessRuntime()` (plugin 06 does).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`usePhoneTextSize.ts`, its spec, the monitor's `--pc-size`/`data-text-size`, `mobile.settings.textSize*` keys; grep finds no remaining reference)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`ResolvedAppFontMetrics` reused unchanged)
- Canonical shared design guidance reapplied: `Yes`
- Deviations decided during implementation:
  - Design: "`applyAppFontSizeToDocument` (Modify): optional phone step attribute". Implemented as two functions sharing one private metrics writer (`applyAppFontSizeToDocument(presetId, …)` unchanged, `applyPhoneTextSizeToDocument(step, …)`), instead of an optional parameter: each source writes its own attribute, the desktop function's behavior stays byte-identical, and there is still one writer of the root size (Principle 11: no mostly-optional parameter).
  - The store keeps an explicit `source` (`'displayPreset' | 'phoneTextSize'`) rather than inferring the source from a null step (Principle 13: no behavior by absence).
  - One more catalog key than listed: `mobile.onThisPhone.close` ("Close menu" / "关闭菜单") for the menu's outside-tap button label (REQ-009).
  - Header padding `pr-3` → `pr-1` with `gap-1`, so the ⋮ sits where the run screen's ⋮ sits (`MobileRunTargetView.vue` header `pr-1`).
  - QR-002 at Small: the ⋮ and the four step buttons carry `min-h-[44px]` (and `min-w-[44px]` for ⋮) so tap targets stay ≥ 44 px when rem sizes shrink.
- Size guardrails: `Yes` (largest changed source: `appFontSizeStore.ts` 114 lines, `AgentEventMonitor.vue` 126, `MobileRunList.vue` 150; no source file over 500; no delta > 220; the probe cases file grew by ~170 lines, a test file)
- Notes: none.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows it: `Yes` — same key `autobyteus.phone.textSize`, same four values, default `standard`; unknown or unreadable → `standard`; write failure keeps the in-memory choice.
- Direct-use evidence: `phoneTextSizeSteps.spec.ts` (a stored `largest` is read back); MSP-60 reload.
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `nuxi prepare` were needed in the fresh worktree before unit tests.
- Probe prerequisites: `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` on the tested commit.

## Checks Run

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web test:nuxt --run components/mobile components/workspace/agent localization display stores components/fileExplorer/__tests__/MonacoEditor.spec.ts components/settings/__tests__/DisplaySettingsManager.spec.ts components/workspace/tools/__tests__/Terminal.spec.ts pages layouts` | `7c7f3d2e79` | macOS, Node v22.23.1 | store (both sources), steps, DOM writer, new menu, run menu, run list/rows, monitor, catalogs, desktop font consumers, all phone components | BEH-001…004, AC-001, 002, 004, 007, 008, QR-002 | Pass | `IMP-01-unit.log` | `Test Files  191 passed (191)`, `Tests  1606 passed (1606)` |
| IMP-02 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-66,MSP-60,MSP-67` (after server build and `build:mobile-web` on the commit) | `7c7f3d2e79` | macOS, headless Chrome, production phone bundle served by a probe-owned node | the whole phone page: plugin 06, store, menu, every phone screen at Largest, Monaco | AC-001…006, QR-001, REQ-006, REQ-007 | Pass | `IMP-02-probe/IMP-02-probe-run.log`, `IMP-02-probe/IMP-02-probe-cases.json`, `IMP-02-probe/MSP-*.png` | `mobile-shell probe: Pass`; MSP-60 `steps.largest.root` 19.7647, `conversation.feed` 21, `afterReload.firstScreen.root` "19.7647px", `runMenu.textSize` 0; MSP-67 `monacoPx` 17, 34 screens each `sideways:false, past:[], cut:[]`; `cleanup` `serversLeft: 0, rootRemoved: true` |
| IMP-03 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `7c7f3d2e79` | macOS | web boundaries, catalogs, literals | AC-008 | Pass | `IMP-03-guards.log` | `Passed with zero unresolved findings.` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` | `7c7f3d2e79` | macOS, Node v22.23.1 | Nuxt app, Electron main, tests | — | Pass | `IMP-04-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS` |

- Not run, and why:
  - Android emulator at the four steps on the home screen and the conversation (Task, design step 6): environment bring-up beyond implementation checks; left to API/E2E (TESTING.md "Android emulators": own headless AVD).
  - Standard screenshot comparison with the base bundle (AC-006): not run; Standard is checked by measurement instead (MSP-60 `before`: root 16 px, run name 15 px; MSP-66: feed 17 px, 22 px avatars, 12 px margins, composer 8 px). The only intended Standard difference is the new ⋮ on the run list header.
  - VNC Viewer and its clipboard at Largest: alpha has no node desktop in the probe; rem-based like the other screens.
  - Activity with background tasks and the `text-[11px]` chips (compaction chip, system-instruction item) rendered: the probe's runs have none; the rule is in `phone-text-size.css`, not observed rendered.
  - Run list banners (not reachable, Phone access off), fold, empty/error/loading states at Largest: not in the sweep.
  - Full `test:nuxt` (only the 191 related files) and other MSP cases.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: run list header and the new "On this phone" menu; every phone screen at the four steps (REQ-005 list); the run's ⋮.
- References: requirements DEC-001…007, REQ-001…007, QR-001/002; design "Concrete Examples" numbers.
- Existing design reviewed: `MobileRunMenu.vue` popup (menu classes reused), `MobileRunTargetView.vue` header (⋮ placement), `MobileBottomSheet.vue`.
- Surface used: the phone probe on the production phone bundle (TESTING.md l.65–67), Chrome mobile emulation at 412×915 and 360×780, deviceScaleFactor 2.
- States inspected: menu closed/open, each step marked, Esc/outside close, focus return; Largest: run list, menu, connection sheet, unpair confirmation, New run and its agent sheet, conversation, run ⋮, Artifacts, Files, `app.ts` in the viewer, Messages, Activity (empty), Settings, setup page, pairing link page, "Connected to …"; reload at Largest.
- Issues found and corrected: none in the product UI. Probe-side fixes during the rounds: closing New run's sheet before closing New run; ← of the topmost bar; the fit check now ignores 1 px screen-reader labels and an element Monaco parks off-screen at −19746 px.
- Observations reviewed by eye (screenshots in `IMP-02-probe/`): run names/subtitles end with an ellipsis at 360 px (DEC-004); the composer's "Context Files (0) (drag, paste, or upload)" wraps to two lines at 360 px without being cut; the file viewer scrolls sideways by design; the + button covers the end of the last visible row, as at Standard (the list has bottom padding).
- Remaining unverified: see "Not run".

## Self-review (direct route)

- Spine DS-001/002/003 as designed; one root writer; plugin is the only place choosing the source; `setPhoneTextSize` before `initializePhoneTextSize` throws.
- No leftover references: `grep usePhoneTextSize|pc-size|data-text-size|mobile.settings.textSize` in `autobyteus-web` finds only the four test assertions that they are gone (`AgentEventMonitor.phoneConversation.spec.ts`, `mobileSettingsCatalog.spec.ts`).
- Translation: all new visible strings and labels from `mobile.onThisPhone.*` (en, zh-CN).
- Accessibility: ⋮ `aria-haspopup="menu"`, `aria-expanded`, translated label; menu `aria-labelledby` the heading; steps `aria-pressed` with translated labels; ≥ 44 px at every step.

## Downstream Coverage Hints / Suggested Scenarios

- Android emulator (own headless AVD): pick each step on the run list; check the run list and a conversation at each; restart the app and check the step is kept from the first screen.
- A phone that had chosen a step in beta.9 (`autobyteus.phone.textSize` set before upgrade) opens at that step everywhere.
- Desktop window: Display font size Large/Extra large unchanged; no ⋮ "On this phone" anywhere on the desktop.
- Activity with a system-instruction item and a conversation with a compaction chip at Largest (the `text-[11px]` rule).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Android emulator check at four steps (Task requirement).
- AC-006 Standard-vs-base comparison if API/E2E judges measurement insufficient.
- VNC Viewer controls at Largest on a node with a desktop.
- The founder's phone-size page review before release (release only on his word).
