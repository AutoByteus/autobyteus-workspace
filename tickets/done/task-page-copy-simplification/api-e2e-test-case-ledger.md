# API/E2E Test-Case Ledger

Round 1 / API-REV-001 planned; initialized before execution. Expected all cases Pass. Probe appends events after every attempt; latest event supersedes initial planned state.

| Case | Planned intent | Initial state |
| --- | --- | --- |
| REPO-001 | Focused copy/components | Not Tested (planned) |
| REPO-002 | Store/summary/context preservation | Not Tested (planned) |
| PT-E2E-001 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-002 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-003 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-004 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-005 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-006 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-007 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-008 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-009 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-010 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-011 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-012 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-013 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-014 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-015 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| PT-E2E-016 | Existing Projects ordinary journey, including updated copy/layout/ARIA for 005/006 | Not Tested (planned) |
| B-001 | Optional native-browser voice preservation | Not Tested (planned) |
| B-002 | Optional native-browser voice preservation | Not Tested (planned) |
| B-003 | Optional native-browser voice preservation | Not Tested (planned) |
| B-004 | Optional native-browser voice preservation | Not Tested (planned) |
| B-005 | Optional native-browser voice preservation | Not Tested (planned) |
| B-006 | Optional native-browser voice preservation | Not Tested (planned) |

REPO-001: exit 0; focused component/catalog suite; evidence/api-unit.log

REPO-002: exit 0; store/summary/context preservation; evidence/api-preservation.log

REPO-001: Pass; 10 files / 66 tests; evidence/api-unit.log
REPO-002: Pass; 5 files / 37 tests; evidence/api-preservation.log
Probe setup checkpoint: independent unit checks complete; full --voice-input current-server-build run starting with fresh output evidence/api-projects-01.

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-005: Fail; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-006: Fail; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-007: Fail; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-008: Fail; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-010: Fail; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-011: Fail; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-001: Pass; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-002: Pass; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-003: Pass; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-004: Pass; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-005: Pass; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

B-006: Pass; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-01/result.json

Attempt 01 completed: PT-005 test sequencing resets transient search during locale reload; 006/007/008/010/011 cascade. No product failure conclusion; API/E2E-owned correction documented in investigation before edits/rerun. All six voice cases Pass, cleanup complete. Rechecking same IDs with fresh api-projects-02; only skip already-successful unchanged server build.

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-001: Pass; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-002: Pass; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-003: Pass; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-004: Pass; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-005: Pass; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

B-006: Pass; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-02/result.json

Attempt 02 completed: 22/22 Pass, browserErrors empty, all owned resources cleaned. Final criterion audit adds explicit file-upload failure/retry to PT-005 for AC-004; final current code execution pending api-projects-03, same IDs.

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-001: Pass; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-002: Pass; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-003: Pass; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-004: Pass; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-005: Pass; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

B-006: Pass; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-page-copy-simplification/tickets/in-progress/task-page-copy-simplification/evidence/api-projects-03/result.json

Final round reconciliation: API-REV-001, Pass / 95%. Final current-code attempt api-projects-03: all 22 browser/API/voice cases Pass; REPO-001/002 Pass; no page errors, no unresolved case. api-cleanup-receipt.json confirms owned PIDs/ports/root cleaned; SDK untracked build dirs removed. No user app/data touched.
