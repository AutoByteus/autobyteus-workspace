# API/E2E Test-Case Ledger

## Meta
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability; investigation /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-coverage-investigation.md; report /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-execution-coverage-report.md; revision /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-revision-record.md. Round 1, initialized before execution. Ledger needed for independent journeys and interruption risk.

## Planned Cases
| ID | Journey / boundary | REQ/AC | Order |
| --- | --- | --- | --- |
| C01 | Focused components/utility | REQ-001–004 / AC-001–005 | 1 |
| C02 | Store/stream/active target/submission/upload regressions | REQ-003,004 / AC-003,004 | 2 |
| C03 | Server focused delivery/admission and real storage upload | REQ-004 / AC-004 | 3 |
| C04 | Boundary/localization guards | REQ-001,002 | 4 |
| B01 | Supported capability and localized native copy | AC-001 | 5 |
| B02 | Selected identity, native edits/undo/paste | AC-002,003 | 6 |
| B03 | Keyboard/skills/upload/rejection/acceptance | AC-004 | 7 |
| B04 | Layout/scroll/resize/locale/a11y/context | AC-005 | 8 |

| C05 | Final production bundle / probe syntax / guards | REQ-001–004 | 9 |

## Execution Events
| Time | ID | Event | Result / checkpoint | Evidence |
| --- | --- | --- | --- | --- |
| 2026-10-02T11:18:02.351619+00:00 | C01 | Started | Expected all assertions pass | api-e2e-evidence/C01.log |
| 2026-10-02T11:18:10.626573+00:00 | C01 | Completed | Pass; exit 0 | api-e2e-evidence/C01.log |
| 2026-10-02T11:20:12.343770+00:00 | C02 | Started | Expected affected regressions pass | api-e2e-evidence/C02.log |
| 2026-10-02T11:20:25.335926+00:00 | C02 | Completed | Fail; exit 1 | api-e2e-evidence/C02.log |
| 2026-10-02T11:25:27.526717+00:00 | C02 | Started | Fixture correction rerun; assertions unchanged | api-e2e-evidence/C02-rerun.log |
| 2026-10-02T11:25:40.109579+00:00 | C02 | Completed | Fail; exit 1 | api-e2e-evidence/C02-rerun.log |
| 2026-10-02T11:25:51.798044+00:00 | C03 | Started | Expected real handler/admission/storage pass | api-e2e-evidence/C03.log |
| 2026-10-02T11:26:01.044260+00:00 | C03 | Completed | Fail; exit 1 | api-e2e-evidence/C03.log |
| 2026-10-02T11:26:12.665803+00:00 | C04 | Started | Expected guards pass | api-e2e-evidence/C04.log |
| 2026-10-02T11:26:14.075689+00:00 | C04 | Completed | Pass; exit 0 | api-e2e-evidence/C04.log |
| 2026-10-02T11:27:01.490236+00:00 | C02 | Started | Current valid fixtures/prerequisites rerun | api-e2e-evidence/C02-final.log |
| 2026-10-02T11:27:14.233240+00:00 | C02 | Completed | Pass; exit 0 | api-e2e-evidence/C02-final.log |
| 2026-10-02T11:27:14.233361+00:00 | C03 | Started | Current valid fixtures/prerequisites rerun | api-e2e-evidence/C03-final.log |
| 2026-10-02T11:27:25.478879+00:00 | C03 | Completed | Fail; exit 1 | api-e2e-evidence/C03-final.log |
| 2026-10-02T11:28:15.583763+00:00 | C03 | Started | Complete current backend fixture | api-e2e-evidence/C03-rerun.log |
| 2026-10-02T11:28:26.778866+00:00 | C03 | Completed | Fail; exit 1 | api-e2e-evidence/C03-rerun.log |
| 2026-10-02T11:29:27.835Z | B01 | Started | N/A: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.385Z | B01 | Completed | Pass: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.385Z | B02 | Started | N/A: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.646Z | B02 | Completed | Pass: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.647Z | B03 | Started | N/A: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.757Z | B03 | Completed | Pass: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:28.757Z | B04 | Started | N/A: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:29:29.371Z | B04 | Completed | Pass: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:30:06.325167+00:00 | C03 | Started | Current exact offline payload expectation | api-e2e-evidence/C03-current.log |
| 2026-10-02T11:30:17.385570+00:00 | C03 | Completed | Pass; exit 0 | api-e2e-evidence/C03-current.log |
| 2026-10-02T11:32:16.862Z | B01 | Started | N/A: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:17.492Z | B01 | Completed | Pass: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:17.492Z | B02 | Started | N/A: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:17.893Z | B02 | Completed | Pass: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:17.893Z | B03 | Started | N/A: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:18.008Z | B03 | Completed | Pass: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:18.008Z | B04 | Started | N/A: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:32:18.612Z | B04 | Completed | Pass: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:21.638Z | B01 | Started | N/A: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.255Z | B01 | Completed | Pass: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.256Z | B02 | Started | N/A: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.755Z | B02 | Completed | Pass: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.755Z | B03 | Started | N/A: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.974Z | B03 | Completed | Pass: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:22.974Z | B04 | Started | N/A: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:34:23.908Z | B04 | Completed | Pass: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:31.692Z | B01 | Started | N/A: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:32.293Z | B01 | Completed | Pass: capability gating and native exact copy across supported scope shapes | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:32.293Z | B02 | Started | N/A: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:32.781Z | B02 | Completed | Pass: chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:32.782Z | B03 | Started | N/A: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:33.027Z | B03 | Completed | Pass: keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:33.028Z | B04 | Started | N/A: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:36:34.048Z | B04 | Completed | Pass: layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation | /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-evidence/browser/evidence.json |
| 2026-10-02T11:37:13.138243+00:00 | C05 | Started | Expected final bundle and guards pass; fixture absent | api-e2e-evidence/C05.log |
| 2026-10-02T11:37:33.571952+00:00 | C05 | Completed | Pass; exit 0 | api-e2e-evidence/C05.log |

## Re-entry And Reconciliation
Last completed C05 Pass; all C01–05/B01–04 complete. Prior failed attempts retained; C02/C03 fixture/generated-client issues resolved before this completed round-level result. Browser reruns strengthen actual-form/visible-token/completed-upload evidence, all pass. None active/interrupted/unstarted. Reconciled Yes into /Users/normy/autobyteus_org/autobyteus-worktrees/composer-mention-discoverability/tickets/in-progress/composer-mention-discoverability/api-e2e-execution-coverage-report.md. No prior API round invented.
