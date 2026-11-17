# Handoff — phone-text-size-home-525 (autobyteus-525)

- Classification: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low` → direct implementation (no architecture review), per the team's handoff rules.
- Package: `phone-text-size-home-525`; SR-001.
- Task: autobyteus-525 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525`, branch `codex/phone-text-size-home-525`, base `origin/personal` @ `ff13782f36`; finalization target `origin/personal`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525/tickets/in-progress/phone-text-size-home-525/`

## Original request (the founder, 2026-11-17, via the Task)

The text is too small on the phone's run list too; the Text size setting should apply to the whole app, not just the conversation; the setting is better on the HOME SCREEN. Goal: one phone-wide setting, applied to every phone screen, with its control on the run list; same four steps (15/17/19/21) and default (Standard); stored on the phone; desktop untouched; translation keys; room for the phone Language setting (autobyteus-509) in one "On this phone" block; check every phone screen at Largest; test with the phone probe and an Android emulator at the four sizes (home screen and conversation); show the founder the result on a phone-size page; release only on his word (next beta).

## Approval basis

Requirements approved by the Solution Designer within the Task's direction (no decision needed the founder); user informed 2026-11-17. Design approval not required by the direction. Decisions DEC-001…007 in `requirements-doc.md` (control: a ⋮ button at the right of the run list header opening an "On this phone" menu with the Text size row; Text size removed from the run's ⋮ menu; proportional scaling step/17; one-line ellipsis kept for run names/subtitles; phone-only scaling of fixed-px text; file-viewer code follows; Small shrinks everything).

## What to build

`design-spec.md`: the app font owner (`stores/appFontSizeStore.ts`) gets the phone Text size as its source on the phone (chosen once in plugin `06.appFontSize.client.ts`); root font size = 16 px × step/17; conversation `1.0625rem`; Monaco editor px from the same metrics; new `MobileOnThisPhoneMenu.vue` on the run list header; `usePhoneTextSize.ts` and the run-menu block removed; run-row geometry in rem; `phone-text-size.css` for fixed-px text on phone screens; popup max widths; catalogs `mobile.onThisPhone.*` (en, zh-CN). Change sequence: design-spec "Change / Refactor Sequence".

## Verification expected

Unit tests (store both sources, steps, the new menu, the run menu without Text size, monitor, run-row geometry); phone bundle probe (`pnpm -C autobyteus-web test:e2e:mobile-shell`): MSP-60 rewritten for the home control + Largest screenshots of every phone screen at 360/412 px + Standard equal to base; own headless Android emulator at the four steps on the home screen and the conversation (TESTING.md l.402+). Desktop font-size tests unchanged and green.

## Risks and coordination

- RSK-001: a phone screen unclean at Largest → fix sizing; a needed redesign → `Design Impact` to the Solution Designer.
- RSK-002: autobyteus-522 (`/Users/normy/autobyteus_org/autobyteus-worktrees/phone-settings-every-run-522`, not yet merged) edits `MobileRunMenu.vue`, `MobileRunMenu.textSize.spec.ts`, `localization/messages/*/mobileSettings.ts`, `tests/e2e/mobile-shell-probe.mjs`. Whichever merges second rebases and keeps both changes (design-spec Risks). The PM is informed.
- Follow-ups: FU-001 (desktop fixed-px labels), not for this ticket.

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md` in the ticket folder.

## Route record

- `get_handoff_rules` 2026-11-17: the rule for `Architecture Design Complete` with Small/Medium and Low risk → `/implementation_engineer`. Sent there.
