# Implementation Revision Record — autobyteus-458 (with the build items of autobyteus-506)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer: Architecture Design Complete (SR-003); the founder's correction (SR-004); the stop prerequisite taken in as step 0 (SR-005, SR-006) | N/A | `Initial Baseline` | SR-003…SR-006 | Built; ready for direct API/E2E |
| IR-002 | Code reviewer, `code-review-report.md`, CRR-001 (failure-origin review of API-REV-001) | CR-001 (API/E2E F-1) | `Local Fix` | CRR-001, API-REV-001 | Fixed; back to direct API/E2E |

## Revision Entries

### IR-001 — The readable phone conversation, Text size, Settings for a run's runtime and model, and the shared stop's ownership rule

- Triggering role, report path, and round: Solution Designer, `design-spec.md`. SR-003 is the Architecture Design Complete for the direct route. SR-004 (another agent's message as on the desktop) arrived during the build. SR-005 (my Requirement Gap, prerequisite PRE-001) was taken into this ticket as step 0 by SR-006.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: built through `ec5b81f912`; implementation-scoped checks and the phone and desktop probe cases pass (see the handoff's Checks Run)
- Related solution revision IDs: SR-003, SR-004, SR-005, SR-006
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation of the approved package, with the two requirement changes that arrived before any handoff
- Approved behavior or requirement IDs affected: REQ-001…011 (REQ-010 has no code), AC-001…009
- Implementation delta:
  - `36091eee0a`: phone conversation stylesheet and phone-only markup; Text size; composer corner; Settings screen, route and menu entry; the shared subject-line builder; catalogs; unit tests.
  - `eee06b47ab`, three changes:
    - SR-004: the phone keeps another agent's arrow, type line and padding.
    - Settings keeps one scope object per open run and member. A rebuilt scope had re-read the run during Save, which discarded the Save's result, and had hidden a failed stop's message.
    - Phone probe cases MSP-59…64.
  - `679bf2e4b4`: FU-001.
  - `ec5b81f912` (step 0, REQ-011): `sameRunInstance` in `utils/runInstanceOwnership.ts`, used by `agentRunStore.terminateRun` and `agentTeamRunStore.terminateTeamRun`. An input instance unknown when the stop began is not another run. Unit tests cover an agent and a Team.
- Changed files or areas: `autobyteus-web`. The files are listed in the handoff's Key Files.
- Local validation and result:
  - guards, typecheck and the full web suite (handoff Checks Run);
  - phone probe MSP-59…64: Pass;
  - desktop DCP-001, DCP-003, AFS-001: Pass;
  - the new store tests fail before step 0 and pass after.
- Next recipient or routing: `/api_e2e_engineer` (direct route)
- Remaining limitations or risks:
  - The emulator journey and the full phone probe are left to API/E2E.
  - AC-005's "model not offered" is covered by unit test only.
  - The status line can lag the stop icon in the refused state.
  - FU-001.

### IR-002 — An Org stop from the phone's Settings keeps the phone where it is

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/phone-run-model-runtime-458/code-review-report.md`, CRR-001, a failure-origin review of API/E2E round 1 (`api-e2e-execution-coverage-report.md`, API-REV-001)
- Triggering finding IDs: CR-001 (API/E2E F-1)
- Classification: `Local Fix`
- Prior authoritative result: IR-001, built through `ec5b81f912`. A live Org member's stop from the phone's Settings stopped the Org run, then left Settings for the desktop route ("Unsupported on phone"); 3/3 and MSP-65.
- Current authoritative result: `6ddf9bb8f5`. The Org stop writes no route on the phone shell, so Settings stays, the rows open and the target resolves. The desktop is unchanged.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the phone's Settings is the first phone caller of the Org stop. `useWorkspaceHistorySubjectActions`' stop wrote `/workspace` (`mode: 'history'`) whenever the route showed that Org. Its shell rule covered open, select and inspect only.
- Approved behavior or requirement IDs affected: REQ-008 (AC-006, VIS-017)
- Implementation delta:
  - `useWorkspaceHistorySubjectActions`: the stop's route write runs only off the phone shell (`setup.shell !== 'mobile'`), the same rule as the other actions. Doc comment updated.
  - `useRunStopAction`: takes the caller's `shell` and passes it on (the desktop passes none).
  - `MobileRunSettings`: passes `shell: 'mobile'`.
  - Tests:
    - the phone shell's Org stop writes no route, and still stops whether or not its final read fails;
    - `useRunStopAction` passes the shell, the desktop by default;
    - Settings uses the phone shell.
    - The desktop stop test (`/workspace`, history mode) is unchanged and passes.
- Changed files or areas: `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts`, `composables/runSettings/useRunStopAction.ts`, `components/mobile/views/MobileRunSettings.vue`, their three specs
- Local validation and result:
  - the four new tests fail before the fix and pass after;
  - related specs pass (49 files, 486 tests);
  - phone probe MSP-59…65: Pass;
  - desktop AFS-002 (Org, running and stopped, its Settings): Pass;
  - guards, typecheck and the full suite: see the handoff's Checks Run.
- Next recipient or routing: `/api_e2e_engineer` (direct route, Medium / Low unchanged)
- Remaining limitations or risks: as IR-001. The phone's Org route keeps `mode=active` after a stop; the target resolves either way.
