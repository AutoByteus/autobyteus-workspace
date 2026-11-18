# Implementation Revision Record — phone-text-size-home-525

> Case ID: the Largest sweep was MSP-67 until the merge with autobyteus-522 (which owns MSP-67…72); it is MSP-74 from IR-003 on. Evidence files of earlier rounds keep their `MSP-67-*` names.

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | `SR-001` | Implemented; unit, guards, typecheck and phone probe MSP-66/60/67 pass |
| IR-002 | Solution Designer, `handoff.md` SR-002 (after API/E2E round 1 and CRR-001), round 2 | API-10, CR-001 | `Design Impact` (resolved upstream by SR-002) | `SR-002`, `CRR-001`, `API-REV-001` | VNC Viewer Control-mode Keyboard/Clipboard in the status row; 32/32 bar layouts clean |
| IR-003 | Delivery Engineer, `delivery-revision-record.md` DR-001, round 3 | DR-001 | `Local Fix` | `DR-001`, `API-REV-002` | `origin/personal` @ `3f19d41aa7` merged (6 conflicts resolved as DR-001 asks); Largest sweep renumbered MSP-74; full web unit suite, both typechecks, guards, builds and probe (10 cases incl. 522's and 448's) pass |

## Revision Entries

### IR-001 — One phone-wide Text size on the run list

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/phone-text-size-home-525/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation commit `7c7f3d2e79` on `codex/phone-text-size-home-525`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the SR-001 design.
- Approved behavior or requirement IDs affected: BEH-001…004; REQ-001…009; AC-001…008; QR-001, QR-002.
- Implementation delta: `appFontSizeStore` gains the phone Text size source (`initializePhoneTextSize`, `setPhoneTextSize`, `phoneTextSizeStep`), chosen once by plugin 06 by runtime; new `display/fontSize/phoneTextSizeSteps.ts` (steps, metrics 16 px × step/17 root and 14 px × step/17 code, storage of `autobyteus.phone.textSize`); `applyPhoneTextSizeToDocument` writes the metrics and `data-phone-text-size`; new `MobileOnThisPhoneMenu.vue` on the run list header; Text size removed from `MobileRunMenu.vue`; conversation at `1.0625rem`; `AgentEventMonitor` loses its step wiring; run row rails/indent in rem; `phone-text-size.css` for `text-[11px]` on the phone; catalogs `mobile.onThisPhone.*` (en, zh-CN), `mobile.settings.textSize*` removed; `usePhoneTextSize.ts` removed; probe MSP-60 rewritten, MSP-66 reads the root step, new MSP-74 (every phone screen at Largest).
- Changed files or areas: see `implementation-handoff.md` "Key Files Or Areas".
- Local validation and result: IMP-01…IMP-04 in `implementation-handoff.md`, all Pass.
- Next recipient or routing: from `get_handoff_rules` (direct route, Medium/Low).
- Remaining limitations or risks: Android emulator check, Standard-vs-base screenshot comparison and VNC Viewer at Largest not run here (see the handoff); RSK-002 merge overlap with autobyteus-522.

### IR-002 — VNC Viewer Control-mode bar (DEC-008)

- Triggering role, report path, and round: Solution Designer, `handoff.md` "SR-002", after API/E2E round 1 (`api-e2e-execution-coverage-report.md`, API-10 Fail) and failure-origin review `code-review-report.md` (CRR-001); round 2
- Triggering finding IDs: API-10, CR-001
- Classification: `Design Impact` (the design was revised as SR-002; this round implements it)
- Prior authoritative result: IR-001 (`7c7f3d2e79`): Keyboard, Clipboard, the mode switch and full screen in the VNC Viewer's top bar; at 360 px Control mode the full-screen button went past the edge and the title collapsed (API-10)
- Current authoritative result: `12ecf1bf29`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why recorded: implementation of DEC-008.
- Approved behavior or requirement IDs affected: REQ-005, REQ-007, AC-005, AC-006 (amended for this screen), DEC-008; FU-002 folded in.
- Implementation delta: the two `v-if="mode === 'control' && isConnected"` buttons (`mobile-node-desktop-keyboard`, `mobile-node-desktop-clipboard-open`) moved, unchanged, from `MobileScreenBar`'s `#actions` slot to the end of `mobile-node-desktop-status-bar`, after the status text; comment on why. Spec: new case asserting the order of each row in Control mode and the status text's truncate classes.
- Changed files or areas: `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue`, `autobyteus-web/components/mobile/views/__tests__/MobileNodeDesktop.spec.ts`
- Local validation and result: IMP-05 (32/32 clean), IMP-06 (153 tests), IMP-07 (typecheck PASS).
- Next recipient or routing: from `get_handoff_rules` (direct route, Medium/Low) → API/E2E reruns API-10.
- Remaining limitations or risks: no live node desktop; API-10's script needs the new markup.

### IR-003 — Merge of the refreshed base (autobyteus-522, autobyteus-448 part 2)

- Triggering role, report path, and round: Delivery Engineer, `delivery-revision-record.md` DR-001 (base refresh blocked), round 3
- Triggering finding IDs: DR-001
- Classification: `Local Fix` (no requirement or design change; DEC-001…008 stand)
- Prior authoritative result: `12ecf1bf29` on base `ff13782f36`
- Current authoritative result: merge `65d67674a9` (parents `a7d066626a`, `origin/personal` `3f19d41aa7`) and probe commit `6abbcc7bef`
- Related solution revision IDs: `SR-002` (unchanged)
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001` (unchanged)
- Related API/E2E revision IDs: `API-REV-002` (the Pass delivery started from)
- Related delivery revision IDs: `DR-001`
- Why recorded: integrate the new base so delivery can restart.
- Approved behavior or requirement IDs affected: none changed; REQ-003 (run menu without Text size) kept against 522's menu.
- Implementation delta:
  - `MobileRunMenu.vue`: 522's removal of `showSettings` (Settings after Activity for every run) and this ticket's removal of the Text size block; header comment names 458, 522, 525.
  - `MobileRunMenu.spec.ts` (add/add): one file with 522's `it.each` of entries and this ticket's case (no Text size, `max-w-[calc(100vw-1rem)]`); the `showSettings` prop and the "no Settings entry" case are gone (522 made them untrue).
  - `MobileRunMenu.textSize.spec.ts` (modify/delete): deleted.
  - `localization/messages/{en,zh-CN}/mobileSettings.ts`: 522's `mobile.settings.remoteRun` kept; `mobile.settings.textSize*` dropped (now `mobile.onThisPhone.*`).
  - `mobile-shell-probe.mjs`: this ticket's wider `runRunSettingsCases` arguments (`openPhone`, `pairingFor`, `phoneOrigin`) and 522's `runEveryRunSettingsCases(...)`; each cases file gets the helpers it reads.
  - Probe ID: this ticket's Largest sweep MSP-67 → MSP-74 (522 owns MSP-67…72, 448 MSP-73) in the cases file, the probe's header and the ticket documents; old-round evidence keeps its names.
  - MSP-74 now also covers, at Largest at 412 and 360 px, a remote run's Settings (522's sentence) and a run idle with a background task, its row and run screen (448).
- Changed files or areas: the files above; `tests/e2e/mobile-run-settings-cases.mjs`.
- Local validation and result: IMP-08a…f in `implementation-handoff.md`, all Pass (no fix needed at Largest on the merged screens).
- Next recipient or routing: `get_handoff_rules` → direct route (Medium/Low) → API/E2E (merged-base rerun).
- Remaining limitations or risks: `autobyteus-web/docs/remote_access.md:26` still names `usePhoneTextSize` (delivery's docs sync, not changed here).
