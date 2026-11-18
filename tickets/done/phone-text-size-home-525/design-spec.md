# Design Spec — phone-text-size-home-525

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (SR-001 baseline; SR-002 adds the VNC Viewer Control-mode bar layout after CRR-001 CR-001)
- Approved requirements baseline: `requirements-doc.md` at SR-002 (DEC-008, AC-006 amended), approved by the Solution Designer within the Task's direction (user informed 2026-11-17)
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the Task leaves the small design to the team; the founder sees the result on a phone-size page before release)
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/DESIGN.md`, `GLOSSARY.md` (no font/text-size terms), `TESTING.md` (phone bundle rule l.61–67; Android emulators l.402–420)
- Project design-principle conflicts / discrepancies: None

## Current-State Read

- The phone page (`/mobile`, or the mobile web build; gate `isMobileRemoteAccessRuntime()`, `utils/remoteAccess/mobileRuntime.ts:35`) shares the web app's plugins. Plugin `plugins/06.appFontSize.client.ts` initializes `stores/appFontSizeStore.ts` on every page, which writes the document root font size and `--app-*` vars through `display/fontSize/appFontSizeDom.ts:3-21` and exposes `resolvedMetrics` (root %, editor px, terminal px). Its source is the desktop Display preset (`appFontSizePresets.ts`: 100/112.5/125 %). On the phone it resolves to 100 % (no preset stored there).
- The phone Text size is a separate module-level ref (`composables/mobile/usePhoneTextSize.ts`) with the four steps and key `autobyteus.phone.textSize`. Two readers: `MobileRunMenu.vue` (the control, l.33–49) and `AgentEventMonitor.vue` (l.5–7, 98: `--pc-size: <px>px`, `data-text-size`). Only `.phone-conversation .conv-feed` uses it (`assets/css/phone-conversation.css:18`).
- Phone screens are built with Tailwind rem classes, so they already follow the root font size. Exceptions (notes, "Relevant Codebase"): `MobileRunRow.vue` rails/indent inline px (l.15, 20, 79–80); `text-[11px]` in `CompactionStatusRow.vue:14` (conversation) and `SystemInstructionActivityItem.vue:28,35` (Activity); Monaco's px font (`MonacoEditor.vue:57-76,135`, from `appFontSizeStore.resolvedMetrics.editorFontPx`); popups with fixed rem widths (`MobileRunMenu.vue:20` `w-72`).
- Constraint: the desktop's path (preset → store → root, Monaco, terminal) must behave exactly as today.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: one subsystem (the web frontend's phone surface and its font-size owner); about 14 source/style/catalog files plus their unit tests and the phone probe case; no server, API or Android change.
- Architectural risk: `Low`
- Risk rationale: no contract, persistence format, security, concurrency or deployment change; the stored key and values stay. The one ownership change is local: the existing app-font owner gains the phone step as its source on the phone, and the phone's own composable is removed. Visual blast radius is limited to the phone page and is checked screen by screen at Largest (AC-005); the desktop branch is unchanged code.
- Escalation trigger: a phone screen that cannot be made clean at Largest without a layout redesign (not a sizing fix), or any change needed in the desktop path, returns to the Solution Designer as `Design Impact`.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `stores/appFontSizeStore.ts`, `display/fontSize/*`, `plugins/06.appFontSize.client.ts` | One owner already writes the root font size and the editor px | Extend this owner with the phone source (no second root writer) | None |
| Code | `composables/mobile/usePhoneTextSize.ts`, `AgentEventMonitor.vue:5-7,98`, `phone-conversation.css:18` | The step reaches only the conversation | Conversation follows the root (`1.0625rem` = step px when root = 16 × step/17) | Float rounding of computed px (sub-0.01 px) |
| Code | `MonacoEditor.vue:57-76` | Watches `resolvedMetrics.editorFontPx` and updates the editor live | Phone metrics carry a scaled editor px; Monaco unchanged | None |
| Code | `MobileRunRow.vue:15,20,79-80` | Rails/indent in px; avatar in rem | Convert geometry to rem | None |
| Code | grep `text-\[11px\]` | Two shared components on phone screens | Phone-only CSS rule; desktop untouched | Other px found by the rendered check go the same way |
| Code | `nuxt.config.ts:109` `ssr: false`; plugin order 05 → 06 → … → 21 | The root size is set in a client plugin before the app mounts | No size jump at start (QR-001) | Confirm in the probe/emulator |
| Diff | 522 worktree `git diff origin/personal...HEAD` | 522 edits `MobileRunMenu.vue`, its textSize spec, `mobileSettings.ts`, `mobile-shell-probe.mjs` | Merge-order note (Risks) | — |

## Intended Change

Make the phone Text size the source of the app's font metrics on the phone (root font size and editor px), so every rem-based phone screen and the conversation follow one setting; move its control to an "On this phone" menu on the run list's header; remove it from the run's ⋮ menu; make the few fixed-pixel phone elements follow.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: the app font-size owner (store, presets/steps, plugin), the phone run list header and its new menu, the run's ⋮ menu (removal), the phone conversation stylesheet and event monitor wiring, the run row geometry, a phone-only stylesheet for fixed-px text, popup widths, en/zh-CN catalogs, unit tests, the phone probe case MSP-60 and new Largest screenshot cases.
- Derived consumers of `resolvedMetrics` (Principle 11): `MonacoEditor.vue` — follows (phone editor px); `Terminal.vue` — not on the phone, unchanged; `DisplaySettingsManager.vue` — desktop only, unchanged; `applyAppFontSizeToDocument` — writes the phone metrics on the phone.
- VNC Viewer Control-mode bar (SR-002, DEC-008): Keyboard and Clipboard move from the top bar to the status row, at every step; see "VNC Viewer Control-Mode Bar (SR-002)" below.
- Deliberately left alone: the desktop Display font size and every desktop screen; the VNC full-screen strip; the shared desktop components' `text-[11px]` classes themselves (FU-001); images/PDF/VNC picture zoom; the run row's one-line ellipsis (DEC-004); the run's other menu entries and 522's Settings change; phone strings that are still literal English (autobyteus-509).
- Follow-ups: FU-001. FU-002 is folded into this ticket by SR-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…004, REQ-009; AC-001, 002, 004, 008 | Run list header → On this phone → Text size step | Control in the run ⋮ menu | Control on the home screen; run menu without it; same key/values | DS-001 |
| BEH-002 | User | REQ-005…007; AC-003, 005, 006 | Any phone screen | Only the conversation follows | Root scales by step/17; conversation exact px; fixed px follow | DS-001, DS-002 |
| BEH-003 | User | REQ-006; AC-005 | Open a text/code file on the phone | 14 px | round(14 × step/17) | DS-001 (Monaco reads `resolvedMetrics`) |
| BEH-004 | User | REQ-008; AC-007 | Desktop | Preset → root | Unchanged | DS-003 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Derived data / two owners of one fact** (Principle 11): "how big this device's text is" is owned twice on the phone — `appFontSizeStore` (root, editor px; fixed at 100 % there) and `usePhoneTextSize` (conversation only). Response: one owner, `appFontSizeStore`, whose source on the phone is the phone step; `usePhoneTextSize` is removed.
  - **Several kinds or forms** (Principle 1): the app's text size has two sources — the desktop Display preset and the phone Text size step. Each is traced: desktop DS-003 unchanged; phone DS-001.
  - **Split sequence / rules branching on the side** (Principle 13): the store now serves both runtimes. Response: the source is chosen once, explicitly, at the composition root (plugin 06), not re-decided in consumers; see the deviation below.
  - **Example clarity** (Principle 14): examples below.
  - Ruled out: Persisted-data transition (same key and values; notes "Persisted Data"); Hidden dependency (the store is a Pinia store read by components as today; no new lookup); Empty indirection (no new wrapper — the phone composable is removed rather than kept as a forwarder); Shared folder (the new stylesheet is phone-scoped and imported by the phone shell).
- Deliberate deviations: Principle 13 ("a component whose rules branch on which side it runs in holds two roles"). The store holds two sources (desktop preset, phone step). Instead of two owners, one owner with an explicit source set once by the composition root. Reason: the outputs are one fact of the same shape (`ResolvedAppFontMetrics`) consumed by Monaco and the one DOM writer; two owners would push the "which runtime am I" branch into every consumer (Monaco, the DOM writer) — the problem the principle prevents. The store has no per-call runtime check; each source has its own entry action.
- Root cause classification: `Boundary Or Ownership Issue` (the phone's size bypassed the app font owner and was applied locally in one screen).
- Refactor needed now: `Yes` (small): fold the phone step into the app font owner; remove `usePhoneTextSize`.
- Evidence: investigation notes, "Architecture Investigation Findings".
- Design response: below.
- Refactor rationale: without it, the root scaling would be a second root writer racing plugin 06 on the phone, and Monaco would not follow.
- Intentional deferrals: FU-001 (desktop's own fixed-px chips).

## Terminology

- **Text size step**: one of `small | standard | large | largest` (15/17/19/21 px conversation size). UI word "Text size" (existing).
- **On this phone**: the run list's menu of phone-only preferences; Text size now, Language later (509). UI heading.
- **Phone scale factor**: step px ÷ 17. Root font size = 16 px × factor.
- No project glossary entries affected (UI words only; `GLOSSARY.md` has no font terms).

## Legacy Removal Policy (Mandatory)

- Obsolete: `composables/mobile/usePhoneTextSize.ts`; the Text size block in `MobileRunMenu.vue`; `--pc-size` / `data-text-size` wiring in `AgentEventMonitor.vue`; the `mobile.settings.textSize*` keys (moved to the new catalog namespace).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: `localStorage['autobyteus.phone.textSize']` on the phone; one string.
- Change: reader/writer moves from the composable to the app-font owner; same key, same values, same default.
- Decision: `Directly Usable — No Migration`.
- Rationale: identical format and meaning; beta.9 choices carry over (AC-004).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…003 | Tap a step in On this phone | Every phone screen and the editor re-render at the step | `appFontSizeStore` | The one path of the setting |
| DS-002 | Primary End-to-End | BEH-001, AC-004 | Phone page start | Stored step applied before mount | plugin 06 → `appFontSizeStore` | No jump; persistence |
| DS-003 | Primary End-to-End | BEH-004 | Desktop page start / Display setting | Desktop preset applied | `appFontSizeStore` | Preserved unchanged |

## Primary Execution Spine(s)

- DS-001: `MobileOnThisPhoneMenu (step button) -> appFontSizeStore.setPhoneTextSize(step) -> phoneTextSizeSteps (metrics for step; storage write) -> applyAppFontSizeToDocument (root %, --app-* vars, data-phone-text-size) -> rem layout of every phone screen + .phone-conversation feed (1.0625rem) + MonacoEditor (watches resolvedMetrics.editorFontPx)`
- DS-002: `plugin 06.appFontSize (isMobileRemoteAccessRuntime) -> appFontSizeStore.initializePhoneTextSize() -> read stored step -> applyAppFontSizeToDocument -> app mounts`
- DS-003: `plugin 06.appFontSize (desktop) -> appFontSizeStore.initialize() -> preset -> applyAppFontSizeToDocument` (unchanged)

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The founder taps Largest; the store records the step, stores it on the phone, derives the metrics (root 123.53 %, editor 17 px) and writes them on the document root. Every rem size reflows; the conversation's `1.0625rem` becomes 21 px; Monaco updates its font option. | menu, store, DOM writer | `appFontSizeStore` | step definitions + storage; phone-only CSS for fixed px |
| DS-002 | On phone page start, plugin 06 sees the phone runtime and initializes the store from the stored step before the app mounts. | plugin, store | plugin 06 (composition root) chooses the source; store applies | storage read |
| DS-003 | Desktop unchanged. | plugin, store | `appFontSizeStore` | presets, storage |

## Spine Actors / Main-Line Nodes

`MobileOnThisPhoneMenu`, `appFontSizeStore`, `applyAppFontSizeToDocument`, plugin `06.appFontSize.client.ts`.

## Ownership Map

- `appFontSizeStore`: owns the applied app font metrics of this page and its source — the desktop preset (desktop) or the phone Text size step (phone); applies them to the document; persists the choice through its storage helpers. Public actions: desktop `initialize`, `setPreset`, `resetToDefault` (unchanged); phone `initializePhoneTextSize`, `setPhoneTextSize(step)`; state `phoneTextSizeStep` (readonly; set by `initializePhoneTextSize`, which runs only on the phone page, before mount).
- `display/fontSize/phoneTextSizeSteps.ts` (new; replaces the composable's data part): the four steps, `isPhoneTextSizeStep`, `phoneTextSizeMetrics(step)` → `{ rootPercent: px/17*100, editorFontPx: Math.round(14*px/17), terminalFontPx: same }`, storage read/write of `autobyteus.phone.textSize` (default `standard`; storage errors keep the in-memory choice).
- `plugins/06.appFontSize.client.ts`: the composition root: picks the source once by `isMobileRemoteAccessRuntime()`.
- `MobileOnThisPhoneMenu.vue` (new): the header ⋮ button and the "On this phone" menu; renders the Text size row from the store.
- `applyAppFontSizeToDocument`: writes metrics; on the phone also sets `data-phone-text-size="<step>"` on the root (used by the phone-only CSS and the probe). Desktop attributes unchanged.

## Thin Entry Facades / Public Wrappers

None.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `composables/mobile/usePhoneTextSize.ts` | The step moves into the app font owner | `appFontSizeStore` + `display/fontSize/phoneTextSizeSteps.ts` | Its tests move to the store/steps tests |
| Text size block, `PHONE_TEXT_SIZE_STEPS`/`usePhoneTextSize`/`useLocalization`-for-text-size imports in `MobileRunMenu.vue` | REQ-003 | `MobileOnThisPhoneMenu.vue` | Keep `t` if 522's Settings label still uses it |
| `AgentEventMonitor.vue` l.6–7 `--pc-size` style and `data-text-size`, l.57 import, l.98 `phoneTextSize` | The feed follows the root | `phone-conversation.css` `.conv-feed { font-size: 1.0625rem }` | Keep the `phone-conversation` class, now gated by `isMobileRemoteAccessRuntime()` directly |
| `MobileRunMenu.textSize.spec.ts` | Control moved | `MobileOnThisPhoneMenu.spec.ts`; the run-menu entry assertions stay in a run-menu spec | Coordinate with 522's edit of this file |
| `mobile.settings.textSize*` keys in `localization/messages/{en,zh-CN}/mobileSettings.ts` | Not run Settings; vocabulary | `mobile.onThisPhone.*` in new `mobileOnThisPhone.ts` (en, zh-CN), registered in each `index.ts` | — |

## Return Or Event Spine(s)

N/A — synchronous reactive update.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Step definitions, metrics, storage (`phoneTextSizeSteps.ts`) | DS-001/002 | store | Pure data + storage I/O | Mirrors `appFontSizePresets.ts` / `appFontSizePreferenceStorage.ts` | Store bloat |
| Phone fixed-px stylesheet (`assets/css/phone-text-size.css`) | DS-001 | phone screens | `html[data-phone-text-size] .text-\[11px\] { font-size: 0.6875rem }` (and any further fixed-px text class the rendered check finds on phone screens) | Scales shared desktop components only on the phone | Editing shared components would change the desktop at its Large presets |
| Run row geometry in rem (`MobileRunRow.vue`) | DS-001 | run list | Rails/indent follow the avatar | AC-005 | — |

## Ownership Boundaries

`appFontSizeStore` is the only writer of the document root font size and `--app-*` vars, on both runtimes. Components read the store; none writes the root or keeps a step of its own.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `appFontSizeStore` | `applyAppFontSizeToDocument`, presets, phone steps storage | plugin 06, `MobileOnThisPhoneMenu`, `MonacoEditor`, `DisplaySettingsManager`, `Terminal` | A component writing `document.documentElement.style.fontSize` or reading/writing `autobyteus.phone.textSize` itself | Add a store action |

## Dependency Rules

- Phone components → `appFontSizeStore` (Pinia, as `MonacoEditor` does today). The store → `display/fontSize/*`. `display/fontSize/*` depends on nothing in components/stores.
- Plugin 06 → `isMobileRemoteAccessRuntime` and the store.
- Forbidden: `AgentEventMonitor` or any phone screen reading the step to size itself (it follows the root); the store calling `isMobileRemoteAccessRuntime()` (the plugin decides).
- Process-wide singletons used: the existing Pinia store (the same access `MonacoEditor` uses). Principle 16 conditions: plugin 06 initializes the phone source before the app mounts (client plugins run before mount, `ssr: false`), so the menu cannot use it earlier; `setPhoneTextSize` before `initializePhoneTextSize` throws (loud, never a silent default); no cycle (the store depends only on `display/fontSize/*`). No new registry or binding.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `appFontSizeStore.initializePhoneTextSize()` | phone source | read stored step, apply | — | Called by plugin 06 only |
| `appFontSizeStore.setPhoneTextSize(step)` | phone step | set, store, apply | `PhoneTextSizeStep` | Called by the menu |
| `appFontSizeStore.phoneTextSizeStep` | phone step | current choice | — | readonly |
| `phoneTextSizeMetrics(step)` | metrics | derive | step | pure |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| store phone actions | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| phone step | `PhoneTextSizeStep` (kept) | Yes | Yes | Low | — |
| menu | `MobileOnThisPhoneMenu` / keys `mobile.onThisPhone.*` | Yes | Yes | Low | Moves text-size keys out of `mobile.settings.*` (run Settings) |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Root font size on the phone | `appFontSizeStore` + `appFontSizeDom` | Extend | Already the owner |
| Menu popup UI | `MobileRunMenu` popup pattern | Reuse the pattern (classes), not the component | Different contents |
| Step storage | `usePhoneTextSize` storage | Move to `display/fontSize/phoneTextSizeSteps.ts` | Next to the preset storage |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `display/fontSize` + `stores/appFontSizeStore` | app font metrics, both sources | DS-001…003 | Extend |
| `components/mobile/runList` | the home-screen control | DS-001 | Extend |
| `assets/css` | phone-only fixed-px scaling; conversation | DS-001 | Extend |

## Draft File Responsibility Mapping / Final File Responsibility Mapping

| File | Owner | Concern |
| --- | --- | --- |
| `autobyteus-web/display/fontSize/phoneTextSizeSteps.ts` (Add) | app font | Steps, `isPhoneTextSizeStep`, `phoneTextSizeMetrics`, read/write `autobyteus.phone.textSize` |
| `autobyteus-web/stores/appFontSizeStore.ts` (Modify) | app font | Phone source actions/state; `resolvedMetrics` from the active source |
| `autobyteus-web/display/fontSize/appFontSizeDom.ts` (Modify) | app font | Optional phone step attribute `data-phone-text-size` |
| `autobyteus-web/plugins/06.appFontSize.client.ts` (Modify) | composition root | Phone runtime → `initializePhoneTextSize()`, else `initialize()` |
| `autobyteus-web/components/mobile/runList/MobileOnThisPhoneMenu.vue` (Add) | home control | ⋮ button (≥ 48 px), popup `role="menu"` with heading "On this phone", group "Text size" of four `aria-pressed` buttons (the existing "A" previews), stays open on choice, closes on outside tap/Esc with focus back to the button; width `w-72 max-w-[calc(100vw-1rem)]` |
| `autobyteus-web/components/mobile/runList/MobileRunList.vue` (Modify) | home screen | Header: node button left (shrinks/truncates), `MobileOnThisPhoneMenu` right (`ml-auto`) |
| `autobyteus-web/components/mobile/runList/MobileRunRow.vue` (Modify) | run row | `railLeft`/`contentLeft` in rem (34 px → 2.125rem, +21 px → +1.3125rem per level, 16 px → 1rem, +9 px → +0.5625rem) |
| `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue` (Modify) | run menu | Remove the Text size block and its imports; `max-w-[calc(100vw-1rem)]` on the popup |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` (Modify) | monitor | Drop the step wiring; keep `phone-conversation` class on the phone |
| `autobyteus-web/assets/css/phone-conversation.css` (Modify) | conversation | `.conv-feed { font-size: 1.0625rem }`; header comment updated |
| `autobyteus-web/assets/css/phone-text-size.css` (Add) | phone screens | Phone-only rem replacements of fixed-px text classes on phone screens; imported by `MobileRemoteAccessShell.vue` |
| `autobyteus-web/composables/mobile/usePhoneTextSize.ts` (Remove) | — | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/mobileOnThisPhone.ts` (Add) + `index.ts` (Modify) + `mobileSettings.ts` (Modify: remove text-size keys) | catalogs | `mobile.onThisPhone.title` ("On this phone" / "本机设置"), `mobile.onThisPhone.textSize` ("Text size" / existing zh), `.small/.standard/.large/.largest` (existing texts) |
| Tests (Modify/Add/Remove): `stores/__tests__/appFontSizeStore*.spec.ts`, `display/fontSize/__tests__/phoneTextSizeSteps.spec.ts`, `MobileOnThisPhoneMenu.spec.ts`, `MobileRunMenu.textSize.spec.ts` (remove; keep its run-menu entry assertions in a run-menu spec), `AgentEventMonitor.phoneConversation.spec.ts`, `MobileRunRow` geometry, `tests/e2e/mobile-run-settings-cases.mjs` MSP-60 (rewrite) + new Largest screen cases | tests | — |

## Reusable Owned Structures Check / Shared Structure Tightness Check

`ResolvedAppFontMetrics` is reused unchanged for the phone source (one meaning per field: root %, editor px, terminal px). No new shared type.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As in the file table; no new folders. `phoneTextSizeSteps.ts` sits beside `appFontSizePresets.ts` because both are sources of the same metrics.

## Folder Boundary Check

| Path | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `display/fontSize/` | Off-spine (data + storage) | Yes | Low | Existing folder |
| `components/mobile/runList/` | UI | Yes | Low | Existing |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Source selection | `// plugin 06` `isMobileRemoteAccessRuntime() ? store.initializePhoneTextSize() : store.initialize()` | `store.initialize()` calling `isMobileRemoteAccessRuntime()` inside, or a phone composable writing `document.documentElement.style.fontSize` after the desktop store did | One explicit choice at the root; one writer |
| Conversation size | `.phone-conversation .conv-feed { font-size: 1.0625rem; }` | `--pc-size: ${px}px` set by the monitor | No second reader of the step |
| Numbers | Largest: root `123.529%` (19.76 px); feed 21 px; run name `0.9375rem` → 18.5 px; Monaco 17 px. Small: root `88.235%`; feed 15 px; Monaco 12 px | — | Verification targets |
| Phone-only px fix | `html[data-phone-text-size] .text-\[11px\] { font-size: 0.6875rem; }` | Changing `text-[11px]` to `text-[0.6875rem]` in `CompactionStatusRow.vue` | The desktop would change at its Large/Extra-large presets |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `usePhoneTextSize` as a wrapper over the store | Fewer call-site edits | Rejected | Callers use the store; composable removed |
| Keep a Text size link in the run menu | PM's option | Rejected (DEC-002) | Home menu only |
| Keep `mobile.settings.textSize*` keys | Fewer edits | Rejected | `mobile.onThisPhone.*` |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add `phoneTextSizeSteps.ts`; extend the store and DOM writer; switch plugin 06; unit tests for both sources (desktop tests unchanged and green).
2. Conversation follows the root; remove the monitor wiring; remove `usePhoneTextSize`.
3. Add `MobileOnThisPhoneMenu` + catalogs; place it in the run list header; remove the run-menu block and the old keys.
4. Fixed px: run-row rem geometry; `phone-text-size.css`; popup max widths.
5. Rendered check of every phone screen (REQ-005 list) at Largest at 360 and 412 px, plus Standard against the base (AC-006); fix sizing issues found (rem conversions, wrapping, max widths). A screen needing a redesign → `Design Impact`.
6. Probe: rewrite MSP-60 (home control, four steps measured: root font size and feed px, persistence after reload, run menu without Text size); add Largest screenshot cases; Android emulator at four steps on the home screen and the conversation (Task).

## VNC Viewer Control-Mode Bar (SR-002)

- Evidence: CRR-001 CR-001 (`code-review-report.md` C-02, C-03), `evidence/api-e2e/vnc/API-10-vnc-bar.json`; source `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` l.11–59 (top-bar actions), l.62–74 (status row), l.181 (`barButtonClass`); `MobileScreenBar.vue` l.4–15. The four Control-mode actions need ≈ 21.75 rem; a 360 px phone has 18.2 rem at Largest. No sizing-only fix exists.
- Decision (DEC-008): in Control mode, while connected, Keyboard and Clipboard render at the right end of the status row (after the status text, which is `min-w-0 flex-1 truncate` and gives way with an ellipsis), not in the top bar. The top bar keeps back, title, the Fit button (View only, zoomed), the Control/View only switch and full screen. Same layout at every step. The Connect offer button (shown only while not connected) and Keyboard/Clipboard (only while connected in Control) never appear together.
- Shape: the two buttons keep their test ids (`mobile-node-desktop-keyboard`, `mobile-node-desktop-clipboard-open`), labels and handlers; they use a row-sized class (h-9, `px-3`, `text-sm font-medium`, the bar buttons' colours; tap target ≥ 36 px as today's bar buttons). Status row `gap-2` stays. No new component: the block moves inside `MobileNodeDesktop.vue`.
- Expected widths (Largest, root 19.76 px, en): top bar ≈ back 59 + Control ≈ 97 + full screen 59 + paddings ≈ 225 px, leaving ≈ 115 px for "VNC Viewer" at 360 px; status row ≈ dot + Keyboard ≈ 106 + Clipboard ≈ 115 + paddings, leaving ≈ 55–60 px for the status text at 360 px (ellipsis; at 412 px ≈ 110 px). zh-CN labels are shorter.
- Verification: API-10 rerun at the four steps × 360/412, both modes, en and zh-CN: full-screen button inside the screen, title not cut to its padding, no overlap; the status text may shorten with an ellipsis. Unit: `MobileNodeDesktop.spec.ts` asserts Keyboard/Clipboard are in the status row in Control mode. A live node desktop check when available.
- Files: `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` (Modify), `components/mobile/views/__tests__/MobileNodeDesktop.spec.ts` (Modify), the API-10 probe script.

## Key Tradeoffs

- One owner with two explicit sources vs. two owners: chosen for single root writer and unchanged Monaco (deviation recorded).
- Phone-only CSS override of shared fixed-px classes vs. editing shared components: protects the desktop (REQ-008); cost: an override file that must list each such class found on phone screens.
- Proportional scaling of layout (heights, paddings scale with rem) vs. text-only scaling: rem is what Tailwind uses throughout; scaling the whole layout keeps proportions and tap targets; cost: narrower usable width at Largest (checked by AC-005).

## Risks

- RSK-001 (phone screens at Largest): mitigated by step 5 and the probe screenshots.
- RSK-002 (autobyteus-522 overlap): both tickets edit `MobileRunMenu.vue`, `MobileRunMenu.textSize.spec.ts`, `mobileSettings.ts`, `mobile-shell-probe.mjs`. Whichever merges second rebases on `personal` and keeps both changes: 522's prop removal/Settings-for-every-run and this ticket's removal of the Text size block; 522's `mobile.settings.remoteRun` key stays in `mobileSettings.ts`; 522's "Settings after Activity" assertion moves into the surviving run-menu spec. The PM is told.
- Fractional root size rendering (19.76 px) in Android WebView: standard behavior; seen in the emulator check.

## Guidance For Implementation

- Reproduction to start from: `None` (new behavior). Start from the unit tests for the store's phone source and MSP-60.
- Keep Standard pixel-identical to today on every phone screen (AC-006): compare probe screenshots with the base.
- Do not touch desktop components' classes; add any further phone-only fixed-px replacements to `phone-text-size.css` with a comment naming the component.
- Run `pnpm -C autobyteus-web test:e2e:mobile-shell` on the phone bundle (TESTING.md l.65–67); own headless AVD for the emulator check (TESTING.md l.402+).
- The founder sees the result on a phone-size page before any release; release only on his word.
