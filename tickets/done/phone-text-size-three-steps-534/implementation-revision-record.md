# Implementation Revision Record — phone-text-size-three-steps-534

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | `SR-001` | Three steps and the "Text size" header implemented; unit, guards, typecheck and probe MSP-60/MSP-74 pass |
| IR-002 | Solution Designer, `handoff.md` SR-002 (the founder's added requirement), round 2 | N/A | New approved requirement (SR-002) | `SR-002` | Settings last in the run's ⋮; unit, typecheck and probe MSP-08/60/67 pass |

## Revision Entries

### IR-001 — Three Text size steps, "Text size" as the menu's only header

- Triggering role, report path, and round: Solution Designer, `handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: `d4a14666a4` on `codex/phone-text-size-three-steps-534`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the SR-001 design.
- Approved behavior or requirement IDs affected: REQ-001…004, AC-001…004, QR-001.
- Implementation delta:
  - `phoneTextSizeSteps.ts`: `small` removed from `PHONE_TEXT_SIZE_STEPS`; the doc comment says there are three steps, that Standard is the default and the smallest, and that any other stored value reads as Standard. The reader is unchanged.
  - `MobileOnThisPhoneMenu.vue`: the visible "On this phone" paragraph and `headingId` are removed. The menu carries `aria-label` = `mobile.onThisPhone.title`. The group's label is now the visible header ("Text size", `text-sm font-semibold text-slate-900`, `data-testid="mobile-text-size-header"`). The grid is `grid-cols-3` and the previews are `16 + index * 3` px.
  - Catalogs (en, zh-CN): `mobile.onThisPhone.textSize.small` removed.
  - Tests:
    - Steps and store: three steps; a saved `small` reads as Standard, writes nothing, and leaves the other key untouched.
    - Menu: no visible "On this phone", header "Text size", three buttons, and a saved `small` shows Standard marked.
    - Catalog: the key list has no `.small`.
    - Probe MSP-60: rewritten for three steps, the header, the saved-`small` start, and screenshots of the menu and run list at each step.
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: IMP-01…IMP-04 in `implementation-handoff.md`, all Pass. One unrelated test file (`applicationHostStore.spec.ts`) failed to load in the batch and passes alone (IMP-01b).
- Next recipient or routing: from `get_handoff_rules` (direct route, Small/Low).
- Remaining limitations or risks: none in code; phone docs (`autobyteus-web/docs/remote_access.md` l.22, 26; `docs/content_rendering.md` l.212) are delivery's docs sync.

### IR-002 — Settings is the last entry of the run's ⋮ menu

- Triggering role, report path, and round: Solution Designer, `handoff.md` "SR-002" (REQ-005, AC-005, `design-spec.md` "Run Menu Order (SR-002)"), round 2
- Triggering finding IDs: N/A (a requirement the founder added)
- Classification: new approved requirement (SR-002), implemented on top of IR-001
- Prior authoritative result: `d4a14666a4`: Settings inserted right after Activity, VNC Viewer after it
- Current authoritative result: `a8f2680e2a`
- Related solution revision IDs: `SR-002`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Why recorded: implementation of REQ-005.
- Approved behavior or requirement IDs affected: REQ-005, AC-005 (BEH-004).
- Implementation delta: `MobileRunMenu.vue` `views` is now `[...VIEWS.filter(show rules), settings]` (the "after Activity" branch is removed); the template comment and JSDoc say Settings is last. Tests: `MobileRunMenu.spec.ts` four prop cases (adds VNC without Messages), `MobileRunScreen.spec.ts` VNC case and a comment; probe MSP-67 (`mobile-every-run-settings-cases.mjs`) asserts Settings last instead of right after Activity; a comment of MSP-08.
- Changed files or areas: `autobyteus-web/components/mobile/runScreen/MobileRunMenu.vue`, `runScreen/__tests__/MobileRunMenu.spec.ts`, `runScreen/__tests__/MobileRunScreen.spec.ts`, `tests/e2e/mobile-every-run-settings-cases.mjs`, `tests/e2e/mobile-shell-probe.mjs` (comment)
- Local validation and result: IMP-05 (211 tests), IMP-06 (typecheck PASS), IMP-07 (probe MSP-08, MSP-60, MSP-67 Pass).
- Next recipient or routing: `get_handoff_rules` → direct route (Small/Low) → API/E2E, covering SR-001 and SR-002 together.
- Remaining limitations or risks: no node desktop in the probe; the VNC-then-Settings order is proven by unit tests.
