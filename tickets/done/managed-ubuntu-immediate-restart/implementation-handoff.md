# Implementation handoff — autobyteus-16

**IR-001: ready for independent API/E2E validation.** Source `2d26c0fb6a4a` on `feature/managed-ubuntu-immediate-restart`, design HEAD `526db39859`, base `9514a05a0e`, target `origin/personal`. No merge or release.

Basis: [SR-001 requirements](requirements-doc.md), [investigation](investigation-notes.md), [SR-002 design](design-spec.md), [solution revisions](solution-revision-record.md), [design handoff](handoff-implementation.md). [Implementation history](implementation-revision-record.md). Initial cycle; ARCH-REV / CRR / API-REV / DR N/A.

## Implementation and scope

| Behavior / acceptance | Current path |
|---|---|
| BEH-001 · AC-001/005 | In `managedUpdateSession.ts` the eligibility check takes the verified stage and generation in the same turn: restart channel, no conflicting intent or Quit latch, switch enabled, same channel, version not blocked. Admission claims the existing intent, emits `restarting`, then calls unchanged `finish(automatic, reopen)`. A delayed stop therefore already shows installing; it is **not** recorded as an automatic install until activation dispatch. Duplicate found/downloaded reports cannot demote that installing state. Turning on automation with a manually staged eligible release, or clearing its block, also starts once. No busy check, timer or input listener remains. |
| BEH-002 · AC-002 | Existing graceful stop, busy-run recorder, release stamp and restart resumer handle interrupting a recorded run. Only the count/query path was deleted; recorder still supplements idle snapshot-only runtimes within its original bound. Tested the built server's mid-turn + background task case. This is not evidence of a signed AppImage successor. Application-owned/system-owned recovery has not changed. |
| BEH-003 · AC-003/004 | Quit owns the ending: a ready eligible stage on ordinary quit stays closed; Quit during restart runs no second activation and does not request reopen. Quit during uncompleted verification does not admit the late receipt. No restart channel stays quit-only. Click, opt-out, channel change, independent block, confirmed old/unknown outcomes, writer and launcher untouched. No preferences or record formats changed. |
| BEH-004 · AC-005/006 | Managed-restart shares native switch text, both locales; installing row/About show the existing progress state. Kept manual-block and quit-only guidance. No native update timing or code path replaced. |

Clean cut: removed SafeRestartMoment, UserInputActivity, embeddedBusyRuns, server route, composition, both owners' count-only interfaces/functions, associated tests and three obsolete locale keys. Updated three desktop guides and the glossary. No other subsystem or follow-up opened. No release, user installation or live provider involved.

## Implementation-scoped evidence

[Commands and results](evidence/IR-001-checks.txt). Ubuntu 26.04 x64, Node 22.23.2, pnpm 10.28.2. Tests ran against the named source or source-equivalent files; only affected cases were rerun after test/duplicate-event refinements.

| ID | Evidence/result |
|---|---|
| IMP-01/02 | New immediate-stop assertion failed before change. Current session tests verify immediate single ownership, held verification, block/channel/opt-out, enabling an already staged release, Quit latched at ready or during activation. Timed-stop updater test verifies `installing` before writer activation; changed appUpdater suite 46/46, two final admission cases 2/2. Native/disabled suites and other owner cases passed in the broader run. |
| IMP-03 | 96/96 restart-resume and three architecture suites. Built-node RR-04 passed: mid-turn busy run, graceful stop, scripted inference received the update notice naming v1.5.14-beta.6. [Synthetic evidence](evidence/IMP-RR04.json). No claim about packaged Ubuntu N→N+1. |
| IMP-04 | 46/46 mounted row/Settings cases. Sandboxed Chrome preview: English and Chinese installing states in row and About; toggled switch and checked narrow layout, no page errors. [English row](evidence/IMP-en-row.png), [Chinese About](evidence/IMP-zh-CN-about.png). Controlled state, not a packaged desktop. |
| IMP-05/06 | Frozen install, server build/boot smoke, Electron transpile, web/server type gates (zero production errors, existing test baselines), locale guard/audit, diff and removal audit passed. No fresh release-build trigger. |

## Direct-route self-review and remaining gate

**Medium / Low confirmed; lightweight self-review complete → API/E2E.** Reviewed the authority path from writer receipt through stop, activation and launcher; no new owner, persistence, privilege, timing mechanism or native policy. Safety/rejection conditions remain on the same boundaries; only the approved wait is removed. Behavior change with legacy removal, no underlying design issue or broader refactor; persisted data **Not Affected**. No compatibility wrapper or new data path. Production file size pressure decreased (updater 500→498 effective lines). Deliberate risk: user typing and busy work no longer defer updates, by explicit request.

**AC-007 remains open.** Use a disposable Ubuntu 24.04 managed guest, test trust/feed, signed N→N+1 built from this branch and scripted inference. Hold a recorded agent mid-turn, verify the old session was busy at activation and the app reopens on N+1 without a click; confirm the agent actually receives an *update* notice, continues and completes a further turn. Capture installing copy, automatic notification and a separate intentional Quit that stays closed. Check manual/block/no-channel behaviors by impact. If the guest lacks the release stamp or the stop does not give the specified update notice, return to Solution Designer rather than changing restart-resume or the launcher. No production credentials, update to the user's desktop, publishing or release.
