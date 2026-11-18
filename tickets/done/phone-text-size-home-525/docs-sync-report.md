# Docs Sync Report — phone-text-size-home-525 (autobyteus-525)

## Scope

- Ticket: `phone-text-size-home-525` (Project Task `autobyteus-525`): one phone-wide Text size, chosen in "On this phone" on the run list; the VNC Viewer's Control-mode bar fits at every step (DEC-008).
- Trigger: API/E2E handoff after the merged-base rerun (API-REV-003, `Pass`, final confidence 95%); direct route (`Medium` / `Low`, test-code review Not Required).
- Bootstrap base reference: `origin/personal` @ `ff13782f36`.
- Integrated base reference used for docs sync: `origin/personal` @ `93f3b9cde8` (merge `537fba6d9e`). The ticket branch had already merged `3f19d41aa7` (`65d67674a9`, IR-003) after delivery DR-001 blocked on six conflicts with autobyteus-522 and autobyteus-448 part 2.
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (both typechecks and a phone-probe smoke on the merged state).

## Why Docs Were Updated

- Summary: the phone's Text size moved from the run's ⋮ menu to the run list's "On this phone" menu and became the source of the whole page's font sizes. `usePhoneTextSize` no longer exists, the phone page's font owner is `appFontSizeStore` fed by the phone step, and the VNC Viewer's Keyboard and Clipboard buttons moved into its status row. `autobyteus-web/docs/remote_access.md` still described the old control and the old owner.
- Why this should live in long-lived project docs: a developer who changes a phone screen needs to know that text must follow the root size (rem, or a rule in `phone-text-size.css` for fixed px), that the phone and the desktop read different sources, and where the control and the stored key are.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | the phone's screens, Text size, the VNC Viewer's controls | Updated | below |
| `autobyteus-web/docs/content_rendering.md` | "App-Wide Readability / Display Settings": the viewer follows the app font owner | Updated | one bullet: the phone's source |
| `autobyteus-web/docs/terminal.md` | follows the Display preset's `terminalFontPx` | No change | the terminal is not a phone surface; the desktop path is unchanged (`initialize`, `setPreset`, `resetToDefault`) |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` | "text size" appears only for token counts | No change | unrelated |
| `DESIGN.md` | the project's design rules | No change | the change follows them (one owner, no mostly-optional parameter, no behavior by absence); it adds no rule |
| `TESTING.md` | phone bundle rule and Android emulators | No change | the checks used the rules as written (phone probe, own AVD). No case list lives in it |
| `RELEASE.md` | finalization and release | No change | read on the merged state; no step was wrong or missing for this delivery |
| `GLOSSARY.md` | terms | No change | no new term (design-spec check) |
| `autobyteus-web/localization` docs | catalogs | No change | no doc names the `mobileSettings` or `mobileOnThisPhone` catalogs |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` (Run list) | Added | the ⋮ at the right end of the run list's top bar opens "On this phone" (`MobileOnThisPhoneMenu`) | the control's new place |
| `autobyteus-web/docs/remote_access.md` (⋮ views) | Removed | "the menu also holds Text size" | the run's ⋮ has no Text size |
| `autobyteus-web/docs/remote_access.md` (Text size) | Rewritten | the four steps, where it is chosen, the stored key and that an earlier value is read as it is, applies from the first screen, step/17 scaling through the root size, the app font owner and plugin 06 as the source, Monaco's size, `phone-text-size.css`, the desktop never reads the phone step, one-line ellipsis and 44 px targets; `usePhoneTextSize` removed | the old text named a composable that no longer exists and a menu that no longer holds it |
| `autobyteus-web/docs/remote_access.md` (conversation) | Edited | 17 px at Standard is `1.0625rem`: 15, 17, 19, 21 px at the four steps | exact sizes |
| `autobyteus-web/docs/remote_access.md` (VNC Viewer, Control) | Added | Keyboard and Clipboard sit at the right end of the status row, after the shortening status text; the bar keeps ←, the title, Fit, the switch and full screen (DEC-008) | the SR-002 layout |
| `autobyteus-web/docs/content_rendering.md` | Added | on the phone page the app font owner takes the phone's Text size as its source (root and Monaco sizes), never reads Settings → Display; the desktop never reads the phone step | the viewer's font source is now one of two |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One font owner, two sources | `appFontSizeStore` has an explicit `source` (`displayPreset` or `phoneTextSize`); plugin 06 chooses once with `isMobileRemoteAccessRuntime()`; one writer sets the root size for both | `design-spec.md`, `implementation-handoff.md` | `remote_access.md` (Text size), `content_rendering.md` |
| Fixed-px text on the phone | a shared component that sets text in px does not follow the step; `phone-text-size.css` gives it a rem size on the phone only (`html[data-phone-text-size]`) | `design-spec.md` | `remote_access.md` (Text size) |
| VNC Viewer Control-mode layout | Keyboard and Clipboard live in the status row so the bar fits at every step on 360 px | `design-spec.md` "VNC Viewer Control-Mode Bar (SR-002)", `requirements-doc.md` DEC-008 | `remote_access.md` (Node desktop on the phone) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `composables/mobile/usePhoneTextSize.ts` and the run ⋮ menu's Text size block | `appFontSizeStore` (phone source) and `MobileOnThisPhoneMenu.vue` on the run list | `remote_access.md` (Run list, Text size) |
| conversation-only `--pc-size` / `data-text-size` on the monitor, `mobile.settings.textSize*` keys | the root size and `mobile.onThisPhone.*` keys | `remote_access.md` (Text size, conversation) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence (done in `release-deployment-report.md`), archive, finalize.
- Notes: nothing here is a follow-up. `follow-ups.md` keeps FU-001 (desktop fixed-px text) for the Solution Designer; FU-002 is resolved by DEC-008.
