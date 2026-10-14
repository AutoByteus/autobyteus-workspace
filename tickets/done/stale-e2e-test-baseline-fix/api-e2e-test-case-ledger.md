# API/E2E Test Case Ledger — stale-e2e-test-baseline-fix

Base `origin/personal@50b7436229`. Command: `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch`.

| ID | Scenario | Before | After |
| --- | --- | --- | --- |
| TDG-001 | Team create → files → update with revision → default kept when omitted → invalid handoff refused with nothing written → default cleared → templates → delete | Fail | Pass |
| TDG-002 | File-authored Team with a team-local member; save swaps team-local and shared members | Fail | Pass |
| TDG-003 | Flat contract: `TeamMember`/`TeamMemberInput` have only memberName/ref/refScope; update requires `expectedRevision` | Pass (old shape) | Pass (new shape) |
| TDG-004 | Coordinator not among members → "Coordinator member name must match…" | Fail | Pass |
| TDG-005 | A Team member naming a Team (`refType`) is refused; nothing written | — (new) | Pass |
| TDG-006 | Org of an Agent and a Team: create → update with revision (default saved) → stale revision conflict → delete | — (new) | Pass |
| (removed) | Nested Team in GraphQL / team-local sub-Teams / company departments | Fail (feature removed by `37d05c7f71`) | Dropped |
| PSK-1 | Codex: imported single/multi private skills materialized as workspace symlinks | Fail | Pass |
| PSK-2 | AutoByteus: imported private skill paths reach the runtime config | Fail | Pass |
| PSK-3, PSK-4 | Catalog visibility; team-local and team-shared skills | Pass | Pass (unchanged) |

Mutation checks (`evidence/mutation-checks.log`; sources reverted):
- an omitted default cleared instead of kept → TDG-001 fails;
- coordinator check skipped → TDG-004 fails;
- Org service revision check skipped → still passes, because the package transaction independently rejects a stale revision (two guards; the case asserts the end result).
