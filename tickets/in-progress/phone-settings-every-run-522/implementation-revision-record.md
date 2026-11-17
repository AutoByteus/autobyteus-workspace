# Implementation Revision Record — autobyteus-522 (phone Settings for every run)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, Architecture Design Complete (SR-001), direct route | N/A | `Initial Baseline` | SR-001 | Built; ready for direct API/E2E |

## Revision Entries

### IR-001 — Settings decided by the run that holds the opened agent

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/phone-settings-every-run-522/design-spec.md` (SR-001, Architecture Design Complete, Small / Low, direct route)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: `ce61209db1`, plus `4e9d7c4067` (R-002: the menu assertions in their own run-menu spec)
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the initial implementation of the approved package
- Approved behavior or requirement IDs affected: REQ-001…006 (BEH-001…005), AC-001…007
- Implementation delta:
  - `mobileRunSettingsScope` maps `target.browse` and never returns null; a peer run is `remote`.
  - The ⋮ menu always offers Settings after Activity (`showSettings` removed).
  - `MobileRunSettings` has a remote state: the sentence `mobile.settings.remoteRun`, no rows, no Save, no stop, the store cleared.
  - Specs rewritten to the new rule.
  - Phone probe cases MSP-67…72.
- Changed files or areas: `autobyteus-web/utils/mobile/mobileRunSettingsScope.ts`, `components/mobile/views/MobileRunSettings.vue`, `components/mobile/runScreen/MobileRunTargetView.vue`, `components/mobile/runScreen/MobileRunMenu.vue`, `localization/messages/{en,zh-CN}/mobileSettings.ts`, four specs, `tests/e2e/mobile-every-run-settings-cases.mjs`, `tests/e2e/mobile-shell-probe.mjs`
- Local validation and result:
  - MSP-67…72 on the base bundle fail: no Settings entry on MSP-67, 68 and 72; BEH-005 on MSP-69 (the lead changed, the task agent did not). MSP-71 passes (preserved).
  - With the change, MSP-60…72 pass.
  - Guards, typecheck and the full suite: see the handoff.
- Next recipient or routing: `/api_e2e_engineer` (direct route)
- Remaining limitations or risks:
  - The Android emulator journey (AC-001) is left to API/E2E.
  - U-002 is answered: inside the Org, `/docs_review_team` is the Org's own squad and not a delegation address. The Org's task team in MSP-70 is the Delivery Team.
