# Design Spec — phone-text-size-three-steps-534

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (adds Settings last in the run's ⋮, the founder's request)
- Approved requirements: `requirements-doc.md` at SR-001, Solution Designer within the direction, user informed 2026-11-18
- Supplements: None
- User approval of the design: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/tickets/in-progress/phone-text-size-three-steps-534/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), read in this conversation for autobyteus-525 (2026-11-17), unchanged on the base; 525's design spec (`tickets/done/phone-text-size-home-525/design-spec.md`) as the owner map
- Conflicts / discrepancies: None

## Current-State Read

525's owner map holds (`tickets/done/phone-text-size-home-525/design-spec.md`): `display/fontSize/phoneTextSizeSteps.ts` owns the step list, validity (`isPhoneTextSizeStep`), metrics and storage; `stores/appFontSizeStore.ts` applies them; `MobileOnThisPhoneMenu.vue` is the control. The step list is the only place that names the steps in production code (investigation notes, Source Log); the store, the DOM writer, the plugin, `phone-text-size.css` and every screen work from the step's px.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small` — one data list, one component, two catalogs, their tests, one probe case, docs.
- Architectural risk: `Low` — no owner, contract, persistence format or screen change; the stored key keeps its remaining values and the existing tolerant reader covers the removed one.
- Escalation trigger: any screen change at Standard/Large/Largest, or a need to touch the store/CSS → `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision |
| --- | --- | --- | --- |
| Code | `display/fontSize/phoneTextSizeSteps.ts:7-12, 24-42` | List + validity + reader fallback to Standard for any non-step value | Remove `small`; nothing else in the reader (DEC-001) |
| Code | `components/mobile/runList/MobileOnThisPhoneMenu.vue:20-49, 61` | Heading `<p>` with id used by `aria-labelledby`; label `<p>`; `grid-cols-4`; `13 + index * 3` px | Remove heading; label → header; `aria-label` on the menu; `grid-cols-3`; `16 + index * 3` |
| Code | `localization/messages/{en,zh-CN}/mobileOnThisPhone.ts` | `.textSize.small` key; `title` key | Remove `.small`; keep `title` (aria only) |

## Intended Change

Three steps; no visible "On this phone"; a saved Small reads as Standard.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Files below.
- Derived consumers of `PHONE_TEXT_SIZE_STEPS` (Principle 11): `MobileOnThisPhoneMenu.vue` (renders the list → 3 buttons); `isPhoneTextSizeStep` → reader (saved `small` → Standard); `phoneTextSizeMetrics` (unchanged for the three); `PhoneTextSizeStep` type (narrows: TypeScript flags any remaining `'small'` use); `data-phone-text-size` attribute (never `small` again; no CSS selects it).
- Deliberately left alone: store, DOM writer, plugin 06, `phone-text-size.css`, `phone-conversation.css`, every phone screen, the desktop, the menu's ⋮ button and behavior, the component name `MobileOnThisPhoneMenu` and the `mobile.onThisPhone.*` namespace (still the menu of this phone's preferences; the founder removed the visible words, not the concept).
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | Kind | REQ / AC | Trigger | Change / Preserved | Path |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, 002; AC-001, 004 | Run list ⋮ | Header "Text size", three steps | DS-001 (525) unchanged except the list and the menu markup |
| BEH-002 | User | REQ-003; AC-002 | Page start, `small` saved | Standard | DS-002 (525): plugin 06 → `initializePhoneTextSize` → `readStoredPhoneTextSizeStep` → not a step → Standard |
| BEH-003 | User | REQ-004; AC-003 | Any screen | Preserved | Unchanged |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `No`
- Structural triggers: Legacy cleanup (Principle 8) — considered: an explicit `small → standard` read branch would be a fallback kept only for an old value; rejected, the generic tolerant reader covers it (DESIGN.md "prefer tolerant readers"). Persisted-data transition (Principle 5) — below. Behavior by absence (Principle 13) — the reader's "not a step → Standard" is the existing explicit rule of the reader for unreadable/unknown values (default), not a new absence-driven behavior; REQ-003 asks exactly that outcome. Vocabulary (Principle 15) — "On this phone" stays the menu's name in code and as its accessible name; no visible second name. Others: not hit (no new owner, interface, shared structure, folder).
- Deliberate deviations: None.
- Root cause classification: `No Design Issue Found` — 525's single step list absorbs the change.
- Refactor needed now: `No`.
- Design response: edit the list and the menu.
- Deferrals: None.

## Terminology

- Text size step: now `standard | large | largest`.

## Legacy Removal Policy (Mandatory)

- Obsolete: the `small` step entry; `mobile.onThisPhone.textSize.small` (en, zh-CN); the visible heading `<p data-testid="mobile-on-this-phone-title">` and its `headingId`; Small in tests, probe MSP-60 and phone docs.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Subject: `localStorage['autobyteus.phone.textSize']` (one string per phone).
- Change: `small` stops being a valid step.
- Reader: `readStoredPhoneTextSizeStep` returns Standard for any non-step value and writes nothing (`phoneTextSizeSteps.ts:34-42`); other keys are never read or written by it.
- Decision: `Directly Usable — No Migration`. A saved `small` is shown as Standard (REQ-003); it stays stored until the next choice overwrites it, which has no visible effect.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | Tap a step | Every phone screen at the step | `appFontSizeStore` (525, unchanged) |
| DS-002 | Primary | Page start | Saved step (or Standard) applied | plugin 06 → `appFontSizeStore` (525, unchanged) |

## Primary Execution Spine(s)

As 525: `MobileOnThisPhoneMenu -> appFontSizeStore.setPhoneTextSize -> phoneTextSizeSteps -> applyPhoneTextSizeToDocument -> screens`; `plugin 06 -> initializePhoneTextSize -> readStoredPhoneTextSizeStep -> apply`.

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | Unchanged; the menu offers three steps | `appFontSizeStore` |
| DS-002 | A saved `small` fails `isPhoneTextSizeStep`; the reader returns Standard; the page starts at Standard | plugin 06 / store |

## Spine Actors / Main-Line Nodes

Unchanged (525).

## Ownership Map

Unchanged (525). The steps module remains the only owner of the step list.

## Thin Entry Facades / Public Wrappers

None.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By |
| --- | --- | --- |
| `{ step: 'small', px: 15 }` in `PHONE_TEXT_SIZE_STEPS` | REQ-001 | — |
| `mobile.onThisPhone.textSize.small` in en and zh-CN catalogs | REQ-001; dead once the button is gone | — |
| Heading `<p :id="headingId" … data-testid="mobile-on-this-phone-title">`, `headingId`, `aria-labelledby` | REQ-002 | Menu `:aria-label="t('mobile.onThisPhone.title')"` |
| Small cases in `phoneTextSizeSteps.spec.ts`, `appFontSizeStore.phoneTextSize.spec.ts`, `MobileOnThisPhoneMenu.spec.ts`, `mobileSettingsCatalog.spec.ts`; heading assertions in `MobileOnThisPhoneMenu.spec.ts` and probe MSP-60 | Behavior removed (tests follow the code) | Three-step and saved-`small` cases |

## Return Or Event Spine(s) / Bounded Local Spines

N/A.

## Off-Spine Concerns Around The Spine

None new.

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules

Unchanged (525). No new dependency, singleton or lookup.

## Interface Boundary Mapping / Check

Unchanged; `PhoneTextSizeStep` narrows to three values.

## Main Domain Subject Naming Check

| Subject | Name | OK |
| --- | --- | --- |
| Menu | `MobileOnThisPhoneMenu`, `mobile.onThisPhone.*` | Yes (concept unchanged; only its visible heading removed) |

## Existing Capability / Subsystem Reuse Check

Reuse the 525 owners as they are.

## Subsystem Allocation / File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-web/display/fontSize/phoneTextSizeSteps.ts` | Remove `small`; doc comment: three steps, Standard is the smallest and the default |
| `autobyteus-web/components/mobile/runList/MobileOnThisPhoneMenu.vue` | Remove the heading `<p>` and `headingId`; menu `aria-label` = `t('mobile.onThisPhone.title')`; the group's label becomes the visible header (`text-sm font-semibold text-slate-900`, top padding of the removed heading, e.g. `px-4 pt-3 pb-3` block with `mb-2` under the header); `grid-cols-3`; preview `16 + index * 3` px (Standard 16, Large 19, Largest 22, as today); comment: a later Language group sits below with its own header-label |
| `autobyteus-web/localization/messages/en/mobileOnThisPhone.ts`, `zh-CN/mobileOnThisPhone.ts` | Remove `.textSize.small`; comments |
| `autobyteus-web/display/fontSize/__tests__/phoneTextSizeSteps.spec.ts` | Three steps; `readStoredPhoneTextSizeStep()` with `small` saved → `standard`, storage untouched |
| `autobyteus-web/stores/__tests__/appFontSizeStore.phoneTextSize.spec.ts` | Replace the Small case (e.g. Large); add: `small` saved + another key saved → `initializePhoneTextSize()` → step `standard`, root `100%`, `data-phone-text-size="standard"`, no throw, the other key and the stored `small` unchanged |
| `autobyteus-web/components/mobile/runList/__tests__/MobileOnThisPhoneMenu.spec.ts` | No "On this phone" text in the menu; header "Text size"; three buttons Standard/Large/Largest; menu has an accessible name; saved `small` → Standard pressed |
| `autobyteus-web/components/mobile/runList/__tests__/MobileRunList.spec.ts` | Comment only if it names the heading (the button's aria-label stays) |
| `autobyteus-web/localization/messages/__tests__/mobileSettingsCatalog.spec.ts` | Key list without `.small` |
| `autobyteus-web/tests/e2e/mobile-run-settings-cases.mjs` MSP-60; `mobile-shell-probe.mjs` header comment | Steps `large`, `largest`; assert no `mobile-on-this-phone-title` and no "On this phone" text in the menu, header "Text size", three buttons; screenshots of the open menu and the run list at Standard, Large, Largest; a start with `small` saved (set before reload) → root 16, Standard pressed, no page error |

## Reusable Owned Structures / Tightness

N/A (list shrinks).

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping / Folder Boundary Check

Existing files only; no new folder.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Saved Small | `readStoredPhoneTextSizeStep()` unchanged; test: `localStorage.setItem(KEY, 'small')` → `'standard'` | `if (stored === 'small') return 'standard'` |
| Menu | `<div role="menu" :aria-label="t('mobile.onThisPhone.title')"><div role="group" :aria-label="t('mobile.onThisPhone.textSize')"><p class="mb-2 text-sm font-semibold text-slate-900">Text size</p><div class="grid grid-cols-3 …">` | Keeping a hidden-but-rendered "On this phone" paragraph |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Explicit `small → standard` read branch | Rejected | Generic reader rule |
| Rewrite saved `small` to `standard` at start | Rejected | Next choice overwrites |
| Keep the `.small` key | Rejected | Removed |

## Change / Refactor Sequence

1. Steps list; catalogs; menu markup. 2. Unit tests. 3. Probe MSP-60; run MSP-60 and MSP-74 on the phone bundle (`pnpm -C autobyteus-web test:e2e:mobile-shell`, TESTING.md l.65–67). 4. Screenshots of the control and the run list at Standard, Large, Largest.

## Run Menu Order (SR-002)

- Owner: `components/mobile/runScreen/MobileRunMenu.vue` (the only place that orders the run's ⋮ entries; read: script l.10–23).
- Change: build the entries as `VIEWS` filtered by their show rules (Artifacts, Files, Messages, Activity, VNC Viewer), then Settings appended last for every run. Remove the "insert after Activity" branch; update the template comment and the JSDoc ("…; Settings last, for every run (autobyteus-522, autobyteus-534)").
- Tests: `MobileRunMenu.spec.ts` (three prop cases: Settings last; with VNC: `[…, 'Activity', 'VNC Viewer', 'Settings']`), `MobileRunScreen.spec.ts` l.137 (VNC case), any probe expectation with VNC Viewer before/after Settings (`mobile-shell-probe.mjs` l.1443/1450 already end with Settings; check `mobile-every-run-settings-cases.mjs` and the 407/VNC probe cases); MSP-60 run-menu assertion unaffected.
- Docs (delivery): `autobyteus-web/docs/remote_access.md` l.24–25 "right after Activity" → "the last entry".
- No other owner, screen or route changes; the open-view handling is by id, not by position.

## Key Tradeoffs

- Stale `small` stays in storage until the next choice: no visible effect; avoids a write at every start.

## Risks

- None material. The other copies of the phone surface (522, 448 already merged) do not list steps.

## Guidance For Implementation

- Reproduction: None. Start from the saved-`small` unit test.
- Docs (`autobyteus-web/docs/remote_access.md` l.22, 26; `docs/content_rendering.md` l.212) are delivery's docs sync; l.26 must lose "Small 15" and "four step buttons", and l.22 the visible "On this phone" heading.
- Release only on the founder's word.
