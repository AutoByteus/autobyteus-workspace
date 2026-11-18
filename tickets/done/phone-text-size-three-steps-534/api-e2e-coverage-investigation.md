# API/E2E Coverage Investigation — phone-text-size-three-steps-534 (autobyteus-534)

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/tickets/in-progress/phone-text-size-three-steps-534/requirements-doc.md` (SR-001; SR-002 adds REQ-005/AC-005: Settings last in the run's ⋮)
- Investigation Notes: `…/phone-text-size-three-steps-534/investigation-notes.md`
- Solution Revision Record: `…/phone-text-size-three-steps-534/solution-revision-record.md`
- Design Spec: `…/phone-text-size-three-steps-534/design-spec.md` (`Small` / `Low`)
- Supplemental Task Artifacts: None
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `…/phone-text-size-three-steps-534/implementation-handoff.md` (IR-001, code `d4a14666a4`; IR-002 for SR-002, code `a8f2680e2a`, evidence `6df3a5c12f`)
- Implementation Revision Record: `…/phone-text-size-three-steps-534/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `…/phone-text-size-three-steps-534/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 on the direct route
- Prior Investigation Reviewed: None; the predecessor ticket autobyteus-525's API/E2E (in `tickets/done/phone-text-size-home-525/`) supplies the harness reused here
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Three phone Text size steps (Standard 17 px default and smallest, Large 19, Largest 21); Small removed everywhere it is listed (REQ-001, AC-004). The run list's ⋮ menu shows only the "Text size" header and three "A" buttons; "On this phone" is only the menu's accessible name (REQ-002, AC-001; zh-CN 文字大小, 标准/大/特大, no 本机设置 text). A phone that saved Small opens at Standard on every screen, Standard marked, no error, other stored settings unchanged; the stored `small` stays until the next choice (REQ-003, AC-002; `Directly Usable — No Migration`, the existing tolerant reader, no explicit mapping). Standard, Large, Largest and the desktop render as in autobyteus-525 (REQ-004, AC-003).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (pick a size), SCN-002 (a phone with Small saved, after the update), SCN-003 (every screen as today).
- Real-use scenario added: SCN-A1 — SCN-002 entered through its real trigger: a phone on the released page (base `bd2053ee51`, four steps) chooses Small on the run list's ⋮, then the node's phone bundle is updated to this ticket's and the phone reloads (the upgrade a beta.10 user goes through), rather than a value written into storage by a test.
- Contrived scenarios: None.

## Changed Behavior Summary

| Behavior | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 three steps, header "Text size", no visible "On this phone" | Changed | REQ-001/002 | unit (IMP-01), MSP-60 (IMP-04), zh-CN menu (API-06) |
| BEH-002 saved Small → Standard | Changed (data no longer valid) | REQ-003, DEC-001 | unit (IMP-01), MSP-60 saved-`small` start (IMP-04), real upgrade from the base page (API-05) |
| BEH-003 every screen and the desktop as in 525 | Preserved | REQ-004 | MSP-74 (IMP-04); base vs head walks at Standard and Largest (API-07); desktop specs (IMP-01), full suite (API-02) |
| Small step, `.small` keys, visible heading | Removed | Legacy removal | grep (done: only absence assertions and the saved-`small` scenario remain), typecheck (IMP-03), full suite (API-02) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | step list, menu, catalogs | IMP-01 (subset; one unrelated file failed to load in the batch under load) | specs outside the subset | full `test:nuxt` (API-02) |
| Browser integration / user journey | Yes | the phone menu and page start | IMP-04 (MSP-60, MSP-74) | the real upgrade path from the released page; zh-CN | API-05, API-06 |
| Desktop renderer | Preserved | — | desktop specs | — | — (525's API-09 path; nothing in the desktop branch changed) |
| Persisted-data transition | Yes | a stored `small` | unit, MSP-60 (written by the test) | a value written by the released page's own control | API-05 |
| Process / lifecycle, shell, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534`; Nuxt phone bundle served by a probe-owned node
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/TESTING.md` (§ Test layers, § Choosing the path, § Browser probes, § Android emulators)
- Changed build-input paths (`git diff --name-only bd2053ee51...HEAD`): None — no fresh-start build
- Secrets: N/A (scripted runtimes)
- Setup: the probe `--hold` stack; the base bundle `bd2053ee51` built in `/tmp/abtest534/base`; alpha's `dist/public` switched by `swap.sh` (alpha reads it per request); host Chrome phone through a proxy at origin `http://10.0.2.2:<port>`, paired with the stack's own link. Harness copied from autobyteus-525 (`evidence/api-e2e/scripts/`), paths adjusted.

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration` (design "Persisted Data / State Transition Decision")
- Representative existing data: `autobyteus.phone.textSize = small`, written by the released page when its user taps Small
- Evidence: API-05 (start at Standard from the first screen, Standard marked, stored value and every other key unchanged, no console error)

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `phoneTextSizeSteps.spec.ts`, `appFontSizeStore.phoneTextSize.spec.ts`, `MobileOnThisPhoneMenu.spec.ts`, `mobileSettingsCatalog.spec.ts` (updated) | three steps; saved `small` → Standard; header; no `.small` | AC-001, 002, 004 | Still Valid | reuse (IMP-01) |
| `mobile-run-settings-cases.mjs` MSP-60 (rewritten), MSP-74 | menu, three steps, saved `small` start; 40 screens at Largest | AC-001…003 | Still Valid | reuse (IMP-04) |
| other web specs | — | — | Unclear until run | API-02 |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004 | unit, guards, typecheck | Reused | IMP-01, IMP-01b, IMP-02, IMP-03 | ran on `d4a14666a4`; HEAD `7aef58aac3` adds only ticket docs |
| API-02 | AC-003, AC-004 | whole web unit suite | Existing Test | `pnpm -C autobyteus-web test:nuxt --run` | IMP-01 ran a subset, and one file failed to load in its batch under load; a clean full run also finds tests the narrowed type made untrue |
| API-03 | — | server typecheck | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | TESTING.md: both typechecks for a TS change |
| API-04 | AC-001…003 | production phone bundle | Reused | IMP-04 (MSP-60, MSP-74) | same commit and bundle |
| API-05 | AC-002 (SCN-A1) | upgrade from the released page | Temporary Probe | held stack; base served: run list ⋮ → Small; `swap.sh head`; reload; run list, menu, conversation; storage before/after | needs the old bundle and its control |
| API-06 | AC-001 (zh-CN) | menu labels | Temporary Probe | zh-CN preference; menu at Standard 412 px and Largest 360 px: header, aria labels, no 本机设置 text, menu inside the screen | MSP-60 runs in English |
| API-07 | AC-003 | base vs head, every walked screen | Temporary Probe | `screens.mjs walk` base and head at Standard and at Largest; `compare.mjs same`; `pixeldiff.py` | "as in 525": only the menu may differ |

- Test progress log needed: `Yes`
- Android emulator: not planned. The change is the step list, the menu's labels and grid, and the reader's existing fallback; nothing reaches WebView-specific behaviour (no layout rule, no font-size mechanism, no shell change), and 525 proved the size mechanism on the device. The real upgrade path (API-05) runs in the production bundle; WebView `localStorage` reads the same value.

## Durable Coverage To Add / Update / Remove

None (the implementation updated the specs and MSP-60).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The menu on the Android app | not planned (above) | Low | No | — |
| The founder's view of the three steps | his phone and taste | Low | Yes | delivery |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md:22,26`, `docs/content_rendering.md:212` still list Small / On this phone | docs sync (AC-004 "phone docs") | grep; implementation handoff | delivery engineer |

## Status After The First Cases (SR-002 Arrived)

- While API-02 ran, SR-002 (the founder's request: Settings last in the run's ⋮, below VNC Viewer) was committed to this branch (`087f800237`, `a8f2680e2a`). The solution revision record routes it to implementation and asks API/E2E to cover SR-001 and SR-002 together after that round. This round is paused until the IR-002 handoff.
- Completed on IR-001 (`d4a14666a4`) and expected to stay valid (they never open the run's ⋮): API-05 (Pass), API-06 (Pass); API-03 (Pass, server untouched).
- To run on IR-002: API-02 (the run on 11:28–11:45 read a mixed state of `MobileRunMenu.vue` and its spec; discarded), API-07 (its run-menu screen changes by SR-002), the reuse of the implementation's checks for IR-002, and a case for the run menu's order (REQ-005/AC-005 of SR-002) with and without VNC Viewer and Messages.

## Plan On IR-002 (SR-001 + SR-002 together)

- `git diff --name-only d4a14666a4 a8f2680e2a`: `MobileRunMenu.vue`, `MobileRunMenu.spec.ts`, `MobileRunScreen.spec.ts`, the probe (`mobile-every-run-settings-cases.mjs`, `mobile-shell-probe.mjs`). API-05/06 still valid (never open the run's ⋮); API-07 still valid for every screen but the run menu, whose order is the change itself.

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 (IR-002) | AC-005 | unit, typecheck, probe | Reused | IMP-05, IMP-06, IMP-07 (MSP-08, MSP-60, MSP-67) | ran on `a8f2680e2a` |
| API-02 | AC-003, 004, 005 | whole web unit suite | Existing Test | rerun on IR-002 | the first run read a mixed state |
| API-08 | AC-005 (REQ-005, SCN-004) | the run's ⋮ on a node with a node desktop | Temporary Probe | `node-534.mjs` (this worktree's server with `AUTOBYTEUS_STARTER_SOCKET`; test-owned container `abtest534-desktop` for Xvnc on 127.0.0.1:5900; an agent run and a Team run) + `menu-order.mjs`: the agent run's and the Team lead's ⋮ at Standard 412 and Largest 360; open Settings and VNC Viewer from it | the probe's alpha has no node desktop: VNC Viewer + Settings order only in unit tests; the founder's screenshot was a Team member's ⋮ with VNC Viewer |
| API-09 | AC-001, 003, 005 | the Android app | Journey | own AVD `apie2e534_api35`; the branch APK; node-534 + container; real taps: three steps, run ⋮ of the agent run and the Team lead | the founder's device: the three-button menu and the new order in the WebView (added after the confidence check, 94.7 % without it) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable Coverage Added / Updated / Removed: `No`
- Reroute Required: `No`
