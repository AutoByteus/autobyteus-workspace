# Investigation Notes — phone-text-size-three-steps-534

## Investigation Meta

- Package identifier: `phone-text-size-three-steps-534`
- Request / ticket: autobyteus-534 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (follow-up of the closed autobyteus-525)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534`, `codex/phone-text-size-three-steps-534`
- Resolved base: `origin/personal` @ `bd2053ee51` (fetched 2026-11-18); contains 525's merge `b91eb0ddaa`, released in `v1.5.13-beta.10`
- Finalization target: `origin/personal`
- Bootstrap result: worktree created; Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements gate): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (read in this conversation, 2026-11-17, for autobyteus-525; unchanged since)
- Investigation status: Complete

## Initial Request And Clarifications

- The founder (2026-11-18, voice, three phone screenshots 10:53–10:54, read by the PM): (1) the smallest text size is way too small, he has suffered from it a lot; remove it; the second one is the default and the smallest. (2) "On this phone" above "Text size" is redundant: show only the "Text size" header and then the sizes.
- PM's reading: three steps Standard 17 (default, now the smallest), Large 19, Largest 21; default stays 17 (ask in one line only if he meant a larger default). His phone has Large selected.
- Direction: remove Small everywhere the steps are listed; a saved Small maps to Standard silently; no "On this phone" text; leave room for a Language row (509) without a header; check every phone screen at the three steps; desktop untouched; tests (stored-value mapping, 525 probe cases, screenshots of the control and the run list at three steps); release only on his word.

## Source Log

| Date | Type | Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Code | `autobyteus-web/display/fontSize/phoneTextSizeSteps.ts` | The step list | `PHONE_TEXT_SIZE_STEPS` small 15 / standard 17 / large 19 / largest 21; `readStoredPhoneTextSizeStep()` returns Standard for any value `isPhoneTextSizeStep` rejects (l.34–42) | Removing `small` from the list makes a saved `small` read as Standard with no new code |
| 2026-11-18 | Code | `components/mobile/runList/MobileOnThisPhoneMenu.vue` l.27–49 | The control | Visible heading `<p data-testid="mobile-on-this-phone-title">` "On this phone" (`text-sm font-semibold text-slate-900`), then group label "Text size" (`text-xs font-medium text-slate-500`), `grid-cols-4`, preview letter `13 + index*3` px; menu `aria-labelledby` the heading; button `aria-label` "On this phone" | Remove the heading; Text size becomes the header; 3 columns; letters keep their step's size |
| 2026-11-18 | Code | `stores/appFontSizeStore.ts` l.24–112 | Owner | Uses the steps module only; no step names | No change |
| 2026-11-18 | Code | `localization/messages/{en,zh-CN}/mobileOnThisPhone.ts`; `__tests__/mobileSettingsCatalog.spec.ts` | Keys | `mobile.onThisPhone.textSize.small` ("Small" / "小"); `mobile.onThisPhone.title` used for the heading and the button's aria-label | Remove the `.small` key; keep `title` for the aria-labels only |
| 2026-11-18 | Code | `stores/__tests__/appFontSizeStore.phoneTextSize.spec.ts` l.46–51; `display/fontSize/__tests__/phoneTextSizeSteps.spec.ts` l.19, 33, 50; `components/mobile/runList/__tests__/MobileOnThisPhoneMenu.spec.ts` l.31–45; `MobileRunList.spec.ts` l.48–52 | Tests listing Small or the heading | Rewrite to three steps; add the saved-`small` case |
| 2026-11-18 | Code | `tests/e2e/mobile-run-settings-cases.mjs` MSP-60 (l.11–14, 232–290); `tests/e2e/mobile-shell-probe.mjs` l.165 | Probe | MSP-60 clicks `small`, asserts `menu.title === 'On this phone'` and Small's root/run-name sizes | Rewrite for three steps, no heading, plus a saved-`small` start |
| 2026-11-18 | Doc | `autobyteus-web/docs/remote_access.md` l.22, 26; `docs/content_rendering.md` l.212 | Docs | l.26 lists "Small 15…" and "The four step buttons"; l.22/212 name "On this phone" as the menu | Delivery docs sync |
| 2026-11-18 | Command | grep `[data-phone-text-size="small"]` in `assets/css`, `components/mobile` | Step-specific styles | None | Nothing else depends on `small` |

## Relevant Existing Behavior

| ID | Kind | Trigger | Current | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Run list ⋮ | Menu: "On this phone" heading, "Text size" label, four "A" (Small, Standard, Large, Largest) | `MobileOnThisPhoneMenu.vue` | High (Read) |
| BEH-002 | User | Phone page start with a saved step | The saved step applies from the first screen; an unknown value → Standard | `phoneTextSizeSteps.ts:34-42` | High (Read; 525 API-06 measured carry-over) |
| BEH-003 | User | Any phone screen | Scales by step/17 | 525 evidence | High (Measured in 525) |
| BEH-004 | User | Run ⋮ | Entries Artifacts, Files, [Messages], Activity, Settings, [VNC Viewer]: `MobileRunMenu.vue` `VIEWS` + Settings inserted right after Activity (autobyteus-522) | `components/mobile/runScreen/MobileRunMenu.vue` script l.10–23; the founder's screenshot 2026-11-18 11:33 | High (Read) |

## Persisted Data And State Facts

- `localStorage['autobyteus.phone.textSize']` on the phone: `small | standard | large | largest`. After this change `small` is no longer a step: the existing reader returns Standard and does not touch storage or any other key; the next choice overwrites it.
- Decision input: no migration needed (tolerant reader already in place).

## Runtime, Probe, Or Reproduction Findings

- None run for requirements: the reader's fallback is read from source and covered by its existing unit test of an unknown value (`phoneTextSizeSteps.spec.ts`). A dedicated saved-`small` unit test and probe start are planned.
- Temporary diagnostics: None. Reproduction for implementation: None (new behavior).

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether the founder also wants a larger default | His words: "the second one is the default and the smallest" → default stays 17; PM: he will say otherwise | Closed (no question needed) |
| RSK-001 | Risk | A phone screen at Standard/Large/Largest changes | Steps that remain are unchanged; 525 measured them clean; MSP-74 rerun | Low |

## Architecture Investigation Findings

- The only owners touched: the steps module (list), the menu component, two catalogs. The store, DOM writer, plugin, CSS and every screen are unchanged: they compute from the step's px, and Standard/Large/Largest keep their px.
- `isPhoneTextSizeStep` is the single validity rule; removing `small` from the list is enough for the reader. An explicit `small → standard` branch would keep a removed step's name in current code (Principle 8; DESIGN.md "prefer tolerant readers").
- Menu accessibility: with the visible heading gone, the menu takes `aria-label` from `mobile.onThisPhone.title` (not shown); the button keeps it. The group stays a `role="group"` labelled "Text size", now visibly its header, so a Language group can be added below it with its own header-label and no menu heading.

### SR-002 — Settings last in the run's ⋮ (2026-11-18)

- The founder (direct, in the Solution Designer's conversation, with a screenshot of a Team member's ⋮: Artifacts, Files, Messages, Activity, Settings, VNC Viewer): put Settings at the bottom, below VNC Viewer; settings normally sit below the other entries.
- Read: `MobileRunMenu.vue` builds the list from `VIEWS` and inserts Settings after Activity (comment "Settings for every run (autobyteus-522)").
- Tests/probes asserting the current order: `components/mobile/runScreen/__tests__/MobileRunMenu.spec.ts` l.19–21; `MobileRunScreen.spec.ts` l.121, 137; `tests/e2e/mobile-shell-probe.mjs` l.1443, 1450 (no VNC there: Settings already last); `tests/e2e/mobile-every-run-settings-cases.mjs` (entries read by test id; check its expectations). Docs: `autobyteus-web/docs/remote_access.md` l.24–25 ("right after Activity").

## Requirement Implications

- Three steps; default Standard; saved Small → Standard silently; one visible header "Text size".

## Notes For Architecture Design

- Change only the list, the menu, the keys, tests, probe and docs; no store/CSS/screen change.
