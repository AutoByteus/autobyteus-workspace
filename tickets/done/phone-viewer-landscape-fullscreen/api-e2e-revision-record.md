# API/E2E Revision Record — phone VNC Viewer: full screen in landscape (autobyteus-432)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001, round 1 | SR-003, IR-002, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: every AC passes on Android 15 and 14 and in the browser; CR-C-06 resolved; a durable window test is added

- Triggering role, report path, and round: code reviewer, `code-review-report.md` (CRR-001, Pass 9.4/10, CR-C-06 held for evidence), round 1
- Triggering finding or case IDs: CR-C-06; the reviewer's asks (API 34, restored page after process death, fresh-start, independent reruns, bridge regression)
- Related revision IDs: SR-003, IR-002, CRR-001
- Why this baseline was recorded: the first validation of the reviewed package
- Coverage decisions or durable test paths changed: added `autobyteus-android/app/src/androidTest/java/org/autobyteus/mobile/DesktopFullScreenWindowTest.kt` (API-12). Mutation-checked: it fails without the bars hide and without the landscape request.
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-11/12/13), API-02…API-11 run, API-12 added during execution
- Commands, environment, fixture, or broader-validation delta:
  - Test node from the beta image plus the fresh-clone server package.
  - Emulator-5554 with `autobyteus277_api35` and `autobyteus277_api34`.
  - Headless Chrome.
  - `am instrument` instead of Gradle's connected task, because of another ticket's emulator-5584.
  - No uiautomator while in landscape, because it locks the rotation.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (API-12, SCN-a note), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002, FU-003), `evidence/API-*`, `evidence/probes/`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - Vendor-skinned phones are user-only.
  - Android's first-time immersive hint is Android's own behaviour.
  - FU-002 (the viewer is not restored after process death) and FU-003 (Send sits under the keyboard in landscape) are out of scope.
