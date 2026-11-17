# Investigation Notes

## Investigation Meta

- Package identifier: `phone-text-size-home-525`
- Request / ticket: autobyteus-525 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525`, `codex/phone-text-size-home-525`
- Resolved base remote / branch / revision: `origin/personal` at `ff13782f36` (fetched 2026-11-17)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (2026-11-17); repository `AGENTS.md`, `TESTING.md` (phone and Android emulator sections)
- Investigation status: Complete for requirements and architecture

## Initial Request And Clarifications

- Original request (the founder, 2026-11-17 21:18–21:30, voice, with two phone screenshots of the run list): the text is too small on the phone's run list page too; the Text size setting should apply to the whole app, not just the event monitor (the conversation); the font setting is better on the HOME SCREEN, not only in the run's area.
- Direction from the Project Task Manager (Task autobyteus-525): one phone-wide setting applied to every phone screen, its control on the home screen (the run list); same four steps and default (17 px = Standard); stored on the phone; the run menu copy removed or kept as a link at the team's choice (PM suggests removal); leave room for the phone language setting (autobyteus-509) as one "On this phone" block; implementation lead: scale at the root; check every phone screen at Largest; fix fixed-pixel screens; phone only, desktop untouched; translation keys; show the founder the result on a phone-size page; test with the phone probe and an Android emulator at the four sizes on the home screen and the conversation; release only on his word.
- Coordination: autobyteus-522 (phone Settings for every run) is in progress in `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522` and touches the same run-menu file.

## Product And Domain Understanding

- Product area: the phone client (the `/mobile` page served by the node, also inside the Android app's WebView; or the separate mobile web build).
- Affected actor: the founder reading AutoByteus on his phone.
- Terms: "run list" = the phone's home screen (`MobileRunList`); "conversation" = the event monitor inside the run screen; "Text size" = the phone's four-step setting (autobyteus-506, built in 458).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-web/composables/mobile/usePhoneTextSize.ts` | The setting today | Steps small 15 / standard 17 / large 19 / largest 21; storage key `autobyteus.phone.textSize`; default `standard`; a module-level ref shared by all callers | Keep steps, key and default |
| 2026-11-17 | Code | `components/mobile/runScreen/MobileRunMenu.vue` | Where the control is | The ⋮ menu of a run has a "Text size" block of four "A" buttons below the views; `w-72` (18 rem) popup anchored `right-1` | Remove the block; the popup width scales with the root |
| 2026-11-17 | Code | `components/workspace/agent/AgentEventMonitor.vue` l.5–7, 98; `assets/css/phone-conversation.css` | Who follows the setting | Only the event monitor: it sets `--pc-size: <px>px` and `data-text-size`; `.phone-conversation .conv-feed { font-size: var(--pc-size) }`; feed text inside uses `em` | Conversation must keep exactly 15/17/19/21 px |
| 2026-11-17 | Code | `stores/appFontSizeStore.ts`, `plugins/06.appFontSize.client.ts`, `display/fontSize/appFontSizeDom.ts`, `appFontSizePresets.ts`, `appFontSizePreferenceStorage.ts` | Existing root font-size owner | The desktop's Display → font size preset (default 100 %, large 112.5 %, extra-large 125 %) sets `document.documentElement.style.fontSize` and `--app-*` vars, plus `editorFontPx`/`terminalFontPx` read by Monaco and the terminal. The client plugin initializes it on every page, the phone page included (phone localStorage has no preset → 100 %). | The root size already has one owner; the phone's setting must become its source on the phone, not a second writer |
| 2026-11-17 | Code | `components/fileExplorer/MonacoEditor.vue` l.57–76, 135 | Code shown in the phone file viewer | Monaco's font size is px from `appFontSizeStore.resolvedMetrics.editorFontPx` (14 at default); `FileViewer` uses Monaco for text/code, also on the phone (`MobileFileViewer` → `FileViewer`) | Root scaling alone does not reach code text; derive editor px from the phone step |
| 2026-11-17 | Code | `utils/remoteAccess/mobileRuntime.ts` | How "phone" is decided | `isMobileRemoteAccessRuntime()`: the mobile web build, or a path under `/mobile` | The phone-only gate already exists |
| 2026-11-17 | Code | `components/mobile/**/*.vue` (grep for `px`) | Fixed pixels on phone screens | Tailwind rem classes almost everywhere. Fixed px: `MobileRunRow` rails and left padding (`railLeft` 34 px + 21 px per level, `contentLeft`) inline styles; the run menu's "A" buttons (13/16/19/22 px, intentional previews) | The rails misalign at other steps because the avatar (rem) moves while the rails (px) stay |
| 2026-11-17 | Code | grep `text-\[[0-9]+px\]` in shared components reached by phone screens | Fixed-pixel text inside phone screens | `CompactionStatusRow.vue` (in the conversation feed: `text-[11px]` chip); `SystemInstructionActivityItem.vue` (in phone Activity through `MobileRunActivityItem`: `text-[11px]` ×2). Other px components (`TokenUsageMeterPanel`, agent cards, memory…) are not on any phone screen | Two shared desktop components need phone-only scaling without touching the desktop |
| 2026-11-17 | Code | `phone-conversation.css` l.28–30 | px inside the conversation | Avatar 22 px box, grid column 22 px | Follows nothing today; check at Largest |
| 2026-11-17 | Code | `tests/e2e/mobile-run-settings-cases.mjs` MSP-60, MSP-66 | Probe coverage of Text size | MSP-60 drives Text size through the run menu (`mobile-text-size-<step>`) and reads the monitor's `data-text-size` and feed font size | Rewrite MSP-60 for the home-screen control |
| 2026-11-17 | Code | `components/mobile/runScreen/__tests__/MobileRunMenu.textSize.spec.ts` | Unit coverage | Tests the run-menu block | Moves with the control |
| 2026-11-17 | Code | `localization/messages/en|zh-CN/mobileSettings.ts` | Keys | `mobile.settings.textSize[.small|.standard|.large|.largest]` exist in en and zh-CN | Reuse; add keys for the new heading/button |
| 2026-11-17 | Command | `git diff origin/personal...HEAD` in the 522 worktree | Overlap with autobyteus-522 | 522 edits `MobileRunMenu.vue` (removes `showSettings` prop, the comment), `MobileRunMenu.textSize.spec.ts`, `mobileSettings.ts` (adds `mobile.settings.remoteRun`), `mobile-shell-probe.mjs` | Small textual overlap; whichever merges second rebases |
| 2026-11-17 | Code | `autobyteus-android` grep `textZoom|fontScale` | Android WebView text zoom | None set: WebView default text zoom 100 % | No double scaling from the app |
| 2026-11-17 | Doc | `TESTING.md` l.61–67, 402–420 | Phone and emulator rules | Phone behavior is proven on the phone bundle with `test:e2e:mobile-shell`; own headless AVD on its own port | Validation route |
| 2026-11-17 | Doc | `tickets/done/phone-run-model-runtime-458/requirements-doc.md` REQ-002 | The original intent | "the choice applies at once to the whole phone and is kept on the phone" — built only for the conversation | This ticket completes the original intent |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open a run → ⋮ → Text size → tap a step | The step is stored (`autobyteus.phone.textSize`) and the conversation reflows at once | Only the conversation feed changes; survives reload | `usePhoneTextSize.ts`, `MobileRunMenu.vue`, MSP-60 | High (Read; probe exists) |
| BEH-002 | User | Look at the run list / Files / Activity / Messages / Settings / VNC controls / setup / sheets | Rendered at the default rem size (root 16 px) | Ignore the Text size step | Code read | High (Read) |
| BEH-003 | User | Open a code/text file on the phone | Monaco at 14 px | Ignores the step | `MonacoEditor.vue` | High (Read) |
| BEH-004 | User | Desktop Display font size | Root percent 100/112.5/125 on the desktop | Desktop only in practice | `appFontSizeStore.ts` | High (Read) |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Design Implication |
| --- | --- | --- | --- |
| `stores/appFontSizeStore.ts` | The single writer of the document root font size and editor/terminal px | One owner of "how big the app's text is" exists | Make the phone step its source on the phone |
| `composables/mobile/usePhoneTextSize.ts` | The phone step, storage | Keep | Becomes the phone's choice owner only; no DOM writes |
| `components/mobile/runList/MobileRunList.vue` | Home screen; header has only the node button on the left | The control goes here | Add a ⋮ button on the header's right |
| `components/mobile/runScreen/MobileRunMenu.vue` | Run views + Text size | Remove Text size | The popup pattern is reusable for the home menu |
| `components/mobile/runList/MobileRunRow.vue` | Row rails/padding in px | Must stay aligned at every step | Convert px geometry to rem |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Stored value: `localStorage['autobyteus.phone.textSize']` on the phone (one of `small|standard|large|largest`). Reader/writer: `usePhoneTextSize`.
- Desktop stored value `autobyteus.display.app-font-size` (unchanged).

### Structural Surfaces

- Document root font size and `--app-*` CSS vars, written only by `applyAppFontSizeToDocument` through `appFontSizeStore`.
- Phone runtime gate `isMobileRemoteAccessRuntime()`.

### Potential Structural Impacts To Investigate

- API or external-contract change: None.
- Persistence schema change: None (same key, same values).
- Security/privacy: None.
- Concurrency/lifecycle: the root size must be applied before first paint of the phone page to avoid a jump (client plugin order: `06.appFontSize` runs before the mobile bootstrap `21`).
- Deployment/ownership: None.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Arithmetic on the rem classes | Root = 16 px × step / 17 | Standard = 16 px (today exactly); Largest = 19.76 px (×1.235): run-row name `0.9375rem` 15 → 18.5 px, subtitle 13 → 16.1 px, `text-xs` 12 → 14.8 px, header `h-14` 56 → 69 px, run-menu `w-72` 288 → 356 px (wider than a 360 px phone's usable width with its `right-1` anchor) | Read / calculated, not rendered | Popups need a max width; rendered check at Largest is required | — |

- Temporary diagnostics: None.
- Reproduction for implementation: None needed (new behavior); MSP-60 is the existing probe to rewrite.

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open Question |
| --- | --- | --- | --- | --- |
| The founder (voice + two screenshots, 2026-11-17) | Larger text on the run list; one setting for the whole app; control on the home screen | Direct, explicit | REQ-001…REQ-004 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Relevant Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Chromium / Android WebView | Fractional root font sizes and rem layout scale; WebView textZoom default 100 % | No `setTextZoom` in `autobyteus-android` | Low |
| Monaco editor | `fontSize` option in px; `updateOptions` at runtime | `MonacoEditor.vue` watch | Low |

## Persisted Data And State Facts

- Affected subject: `autobyteus.phone.textSize` in the phone's localStorage.
- Required: the founder's current step carries over unchanged and now applies everywhere.
- Acceptable loss: none needed.

## Product Design Request Context

- Product Design request: `Not stated` (the Task says no separate Product round unless the team needs one; the team does not).

## Product Design Findings

- N/A — no Product package.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| None | | | | | | |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Some phone screen breaks at Largest (overflow, overlap, cut-off) in ways reading cannot predict | AC-005 | Rendered check of every phone screen at Largest (360 and 412 px wide) by implementation and API/E2E | Open |
| RSK-002 | Risk | Merge overlap with autobyteus-522 in `MobileRunMenu.vue`, its spec, `mobileSettings.ts`, the probe file | Clean merge | Whichever ticket merges second rebases; the PM is told | Open |
| UNK-001 | Unknown | Whether the founder wants subtitles to wrap rather than shorten at Largest | Taste | Shown on the phone-size page at verification; decided as shorten (DEC-004) | Decided, revisit on his word |

## Architecture Investigation Findings

- Root-size owner: `appFontSizeStore` (initialize in plugin `06.appFontSize.client.ts`; apply via `applyAppFontSizeToDocument`). Readers of its metrics: `MonacoEditor.vue`, `Terminal.vue` (not on the phone), `DisplaySettingsManager.vue` (desktop settings, not on the phone).
- The phone page's plugin order: `05.localization`, `06.appFontSize`, …, `21.mobileRemoteAccessBootstrap`; `isMobileRemoteAccessRuntime()` works in a client plugin (build flag or `window.location`).
- The conversation's size: `--pc-size` set inline by `AgentEventMonitor` from `usePhoneTextSize().px`. With the root at 16 × step/17 px, `1.0625rem` equals the step px exactly, so the conversation can follow the root and the monitor no longer needs its own wiring.
- Fixed px on phone screens that must follow: `MobileRunRow` rails/padding (inline px); `text-[11px]` in `CompactionStatusRow` and `SystemInstructionActivityItem` (shared with the desktop, which must not change); Monaco font px. Intentional px that stay: the "A" preview buttons (each shows its own step), the VNC picture (a remote screen image), images/PDFs (pinch zoom).
- `phone-conversation.css` avatar 22 px: decorative; stays unless the rendered check shows a problem at Largest.

## Requirement Implications

- The one phone-wide setting already exists as data; what is missing is its application (only the conversation) and its place (inside a run).
- Standard must equal today exactly, so the scale factor is step/17 against the 16 px root.

## Notes For Architecture Design

- Map SCN-001…SCN-003 to: the home-screen control → `usePhoneTextSize.set` → the app font owner applies the root, the editor px and the conversation follows.
- Keep the desktop path byte-identical in behavior (desktop presets, Monaco, terminal).
