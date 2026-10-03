# API/E2E Test Case Ledger
Round 1, initialized before execution. Expected cases:
| Case | Expected | Initial status |
| --- | --- | --- |
| R-001 | four focused files pass | Not Tested |
| R-002 | affected eligibility/layout suites pass | Not Tested |
| B-001 | exact enabled order in expanded/compact, Applications on/off | Not Tested |
| B-002 | Projects omitted, remaining order unchanged both modes | Not Tested |
| B-003 | Projects click /projects, /projects/new active, localized label and folder SVG | Not Tested |
| B-004 | narrow desktop strip opens drawer, Projects click navigates/closes | Not Tested |
| B-005 | mobile runtime excludes Projects/Applications/Nodes | Not Tested |

## Execution events
- R-001 result exit=0; focused.log (independent rerun).
- R-002 result exit=0; affected.log.

- Browser attempt 1: harness syntax error before service/case execution; no product failure or acceptance result. Fixed quote in generated mobile route metadata; log retained.
- B-001: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-2/evidence.json
- B-002: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-2/evidence.json
- B-003: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-2/evidence.json
- B-001: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-3/evidence.json
- B-002: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-3/evidence.json
- B-003: Fail; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-3/evidence.json

- Attempt 3: B-003 probe premature URL assertion after redock; actual editor and both active/icon checks reached. Added bounded route-settlement wait, no expected destination weakened. B-004/005 not started. Cleanup passed.
- B-001: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-4/evidence.json
- B-002: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-4/evidence.json
- B-003: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-4/evidence.json
- B-004: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-4/evidence.json
- B-005: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-attempt-4/evidence.json
- B-001: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-repeat/evidence.json
- B-002: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-repeat/evidence.json
- B-003: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-repeat/evidence.json
- B-004: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-repeat/evidence.json
- B-005: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/projects-primary-nav-order/tickets/in-progress/projects-primary-nav-order/api-e2e-evidence/browser-repeat/evidence.json

## Final reconciliation — API-REV-001
R-001 Pass 4 files/22 tests; R-002 Pass 7 files/39 tests. B-001–005 each Pass in attempt 4 and fresh repeat. Earlier attempts preserved, no unresolved case; all final cleanup receipts Pass. Current round Pass /95%.
