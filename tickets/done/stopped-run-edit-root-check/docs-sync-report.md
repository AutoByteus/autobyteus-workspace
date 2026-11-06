# Docs Sync Report — stopped-run-edit-root-check (FU-008 of autobyteus-348)

## Scope
- Ticket `stopped-run-edit-root-check` (Small, Low, direct route). Base `origin/personal` @ `dc4e0880ac` (merged). Verification: `evidence/DEL-01-post-integration-checks.md`.

## Why Docs Were Updated
A saved edit of a stopped standalone Agent run now reaches the registered root of that run (`refreshInheritedLaunch`), so catalog copies delegated afterwards carry the saved launch. The root's lifecycle-port description did not say so (the implementation handoff left it to docs sync).

## Long-Lived Docs Reviewed
| Doc | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Updated | Ownership > Ports: `refreshInheritedLaunch`, what the root hands to copies, copies already started keep theirs, no root registered changes nothing, a failed follow never fails the edit, a registered root does not block the edit of a stopped host |
| `autobyteus-server-ts/docs/modules/run_history.md` | Updated | one sentence after the selection paragraph pointing to the root doc |
| `DESIGN.md` | No change | rule 12 (fresh runner) and the others are not touched by a server-source change; no design discrepancy recorded by the ticket's reports |
| `TESTING.md` | No change | the Fresh-start build rule does not apply (no build input changed); no command in it is made wrong by this ticket; the gated built-server case follows the existing `RUN_AGY_FAILURE_E2E` pattern |
| `RELEASE.md` | No change | no release step or rule touched; the version on `personal` changed under it (v1.5.12-beta.2 record, merged) |

## Docs Updated
`standalone_agent_run_root.md` (8 lines), `run_history.md` (2 lines). No release notes: no release; the effect is internal to delegation after a host crash.

## Durable Knowledge Promoted
| Topic | Target |
| --- | --- |
| The root hands the host's saved launch to later copies; registered root does not block a stopped host's edit | `standalone_agent_run_root.md` |

## Removed / Replaced Components Recorded
| Old | Replaced by | Documented |
| --- | --- | --- |
| root option `rootLaunchConfiguration` (a launch fixed when the root was created) | `inheritedLaunch()` read per viewer, set by `setInheritedLaunch` | `standalone_agent_run_root.md` |

## Delivery Continuation
Result `Pass`. FU-1 (the root file is at the 500-line guardrail) recorded.
