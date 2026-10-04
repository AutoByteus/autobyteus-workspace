# API/E2E Test-Case Ledger
Round 1; initialized before execution. Initial status Not Tested for each case.
R-001: focused three components.
R-002: broader affected unit suites/localization guard.
B-001: project create native dictation, review/manual persistence.
B-002: project edit dictation/manual save and optional blank reload.
B-003: task create/edit native dictation, no success and attachments/manual save.
B-004: no-speech/error and successful retry.
B-005: recording cancellation/disposal.
B-006: leave editor with pending transcription, late text rejected.
PT-E2E-001–016: existing Projects real API/browser cases, each result recorded by probe.
R-001 command exit 0; evidence api-e2e-evidence/focused.log
R-002 suite exit 0; api-e2e-evidence/broader.log
R-002 localization guard exit 0

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-001: Fail; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-002: Fail; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-003: Fail; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-004: Fail; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-005: Fail; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

B-006: Fail; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-1/result.json

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

B-001: Fail; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

B-002: Fail; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

B-003: Fail; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

B-004: Fail; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

B-005: Fail; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-006: Fail; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-2/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-001: Pass; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-002: Pass; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-003: Pass; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-004: Pass; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-005: Pass; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

B-006: Pass; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-3/result.json

PT-E2E-001: Pass; Fresh node default off, guarded routes and separate-node API isolation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-002: Pass; Ordinary New Project validation/focus/Cancel and zero-link save to Tasks; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-003: Pass; Aggregate Existing/New direct rows; mode drafts, normalization/no mkdir, saved links and origin tab; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-004: Pass; Aggregate save failure retains Project; separate successful registration remains, no mkdir; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-005: Pass; Task ordinary composer validation, search-preserving Cancel, typed/file save clears search; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-006: Pass; Concise detail, HTTP download, edit Cancel then save preserves ID/status/context; inline deletion focus/Escape; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-007: Pass; External native tool commit -> physical non-deduplicated Refresh preserves search/route and moves status; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-008: Pass; Failed Refresh retains prior success and persistent actionable error, then retry; no-match and empty are distinct; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-009: Pass; Continuous divided rows and desktop/narrow container breakpoint, ordinary page wrapping; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-010: Pass; Real backend process restart preserves Tasks, context HTTP bytes, links and feature setting; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-011: Pass; All-Task Project deletion includes Done; Cancel preserves originals, explicit cascade affects only Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-012: Pass; Ordinary route read/Refresh ordering: late old Project response cannot populate another Project; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-013: Pass; 120 current Tasks: complete search/counts/no-match across statuses, no truncation or mutation; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-014: Pass; Task keyboard create/edit/inline-confirmed delete plus unknown Project/Task recovery; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-015: Pass; Normal Settings toggle invalidates nav/route without reload, retains Tasks and other settings; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

PT-E2E-016: Pass; zh-CN ordinary Project/Task forms/board/detail contain localized controls and no raw Project keys; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-001: Pass; Project create: native dictation into latest typed draft; review and explicit real save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-002: Pass; Project edit at 390px: native append/manual save, blank optional update and current reader; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-003: Pass; Task create/edit: native dictation, no success node, attachments retained and explicit save; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-004: Pass; Project no-speech/error feedback retained then successful retry clears without saving; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-005: Pass; Recording Cancel releases native tracks without insertion or persistence; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

B-006: Pass; Cancel navigation during pending transcription rejects late text in next editor; /Users/normy/autobyteus_org/autobyteus-worktrees/task-voice-success-cleanup/tickets/in-progress/task-voice-success-cleanup/api-e2e-evidence/browser-final/result.json

Final reconciliation: R-001 Pass 17/17; R-002 Pass 72/72 + guard. All 22 browser-final cases Pass. Attempts 1/2 are retained fixture failures; attempt 3 and final resolve all six voice cases. All owned listeners closed and data roots absent; cleanup-verification.json. No unresolved/unstarted case.
