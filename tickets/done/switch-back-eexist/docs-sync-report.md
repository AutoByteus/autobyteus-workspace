# Docs Sync Report — switch-back-eexist (Task autobyteus-440)

## Scope
- Ticket `switch-back-eexist` (Small, Low, direct route). Base `origin/personal` @ `34ea6e36bb` (merged; it also edits `DESIGN.md` and `TESTING.md`, which this ticket's rule 10 coexists with). Verification: `evidence/DEL-01-post-integration-checks.md`.

## Why Docs Were Updated
A new Antigravity start now replaces the capsule of any earlier era or failed start, so a run can switch back to Antigravity. The runtime doc said a new run creates a capsule but not what happens when one already exists.

## Long-Lived Docs Reviewed
| Doc | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Updated | Run-owned project and workspace: a new start begins on an empty capsule (`createAgyRunCapsule` removes the run's `agy-project` first; skill links are removed without following, so skill folders and the workspace are untouched); why (A → B → A, a retry after a failed start); a restore never creates a capsule |
| `TESTING.md` | No change by delivery | the ticket added rule 10 "Test a runtime switch there and back" (A → B → A, each member kind with its own start path, a restart before the return); checked against the added tests: SB-01..03 and the live case cover it |
| `DESIGN.md` | No change | no design rule or case touched; the fix is one removal in a server file |
| `RELEASE.md` | No change | no release step touched |
| `agent_execution.md`, `agent_orgs.md`, `agent_team_execution.md`, `run_history.md` | No change | they refer to the capsule or the switch without describing creation on an existing folder |

## Docs Updated
`antigravity_cli_runtime.md` (7 lines). No release notes: no release requested; user-visible effect (a switched-back run works again) is stated in the handoff summary.

## Removed / Replaced
None. The exclusive writes inside the capsule stay as a correctness guard.

## Delivery Continuation
Result `Pass`. FU-1 (DCM-009 failed once, unexplained) is in `follow-ups.md`.
