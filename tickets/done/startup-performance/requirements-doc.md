# Startup and migration performance — R1 Approved
Package: startup-performance-20260927. Solution revision: SR-009.

## Approval basis
The user explicitly requested removing the measured startup-wide history validation
(SR-006/007), then explicitly rejected hashes,whole-file backups,repeated transforms
and custom journals and instructed: "fix the last migration ... a lot of users
haven't upgraded ... fix this ... and release a new version" (current turn).
This resolves the earlier backup-policy approval hold. No repeated approval question
is needed for these changes. Existing data/backups remain preserved; no permission
to delete originals or forcibly replay terminal migrations. Prior Draft retained as
non-authoritative evidence/requirements-before-r1.md. Product supplements N/A.

## Scope and workspace
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance;
branch codex/startup-performance; base origin/personal
8bffda04575eaa7198fae186856699011ad5c04b; finalization target personal.
Correct existing app-data migration20260926_team_context_file_execution_locators_v1
for pending/failed users; remove recurring exhaustive reference scans for completed
users and unrelated new work; update guideline; validate and deliver a new release
through normal specialist gates. Release version selection belongs to Delivery;
no already-published tag retargeting authorized. No installed-data replay/restart,
ledger reset,SQL history rewrite,new migration ID,background audit or persistent
cache framework. Previous Docker pipeline monitoring stays user-owned.

## Supported scenarios and preserved outcomes
| Scenario / behavior | Trigger,goal and sequence | Outcome / alternates |
| --- | --- | --- |
| SC-001 / BEH-001 Normal upgrade | User installs correction before this conversion ran; existing runner selects migration; old references become exact execution references. | Preserve unrelated content; unavailable/ambiguous historical references stay intact with diagnostics,not guessed ownership or app lockout. |
| SC-002 / BEH-002 Normal reopening | User already completed conversion; launches corrected app. | Terminal migration skipped; no exhaustive history revalidation under another name. |
| SC-003 / BEH-003 Normal new work | User creates unrelated conversation/Team/Org with retained history. | No history-wide trace audit; exact attachment routing still works. |
| SC-004 / BEH-004 Normal historical access | User opens/uses a historical attachment. | Exact execution and file checks at requested access; unavailable attachment does not block unrelated work. Whole-package proactive reference exclusion is replaced by operation-scoped failure. |
| SC-005 / BEH-005 Supported edge retry | Quit/interruption or failed attempt left old/current files and possibly released backup/journal residue; restart selects nonterminal migration. | Convert remaining supported old data,leave current data alone,preserve residue without trusting or restoring from it. |

## Requirements and acceptance criteria
REQ-001 / AC-001 (SC-001/002): retain distinct migration and repeat-startup evidence;
compare before/after on equivalent disposable representative data and entrypoints.
Do not claim isolated class timings are full-app startup or hashing's exact share.
REQ-002 / AC-002 (SC-001/005): no converter content hashes,new whole-file originals,
or custom per-file progress journal. Per successful file one conversion pass and
one atomic replacement only if changed; normal runner status/logging retained.
Check call counts and semantic preservation,not merely runtime elapsed time.
REQ-003 / AC-003 (all): preserve current-only runtime,exact execution identity,
non-target bytes/records and unrelated availability. Reject unsupported/ambiguous
ownership without guessing. Missing/all-missing historical trees do not lock startup.
REQ-004 / AC-004: guideline documents critical startup/updater lockout,commercial
risk and actual historical mistakes without claiming measured financial loss.
REQ-005 / AC-005 (SC-001/002/005): same migration ID; old/current mixed retry works
without new journal; successful/warning terminal ledger is not reset or replayed.
Existing originals/journal files untouched; newer current writes not overwritten.
REQ-006 / AC-006 (SC-002/003/004): no exhaustive historical attachment-reference
scan on startup or unrelated new-run admission. Historical operation-scoped exact
identity/containment checks remain; no name fallback or cross-owner file reads.
REQ-007 / AC-007: same guideline lists recurring history-audit and hash/journal
anti-patterns,their rationale/errors and simpler historical practices.
REQ-008 / AC-008 (all): prepare and validate corrected release,including ordinary
first upgrade,retry,terminal repeat and real desktop readiness boundary. Independent
review/validation,explicit user verification and Delivery release gates still apply.
No claim of release until publication evidence exists.

## Constraints / verification
Single migration writer with stopped normal writers,as existing migration contract.
Per-file atomic commit,not a promised multi-file transaction. Unsupported files
remain unchanged; previously committed valid files need not roll back when another
file fails. Diagnostic aggregates remain bounded and truthful. Existing backups
are inert retained evidence,not required runtime authorities.
Performance is measured on the same representative corpus; no invented universal
seconds SLA. Structural proof of removal (zero hashes/backups/journal writes and
zero repeat-startup trace audit) is mandatory alongside comparative timings.
Physical corruption/manual repair,hostile concurrent writers,new backup deletion,
and overhaul of unrelated historical migrations are out of scope.

## Current state
Requirements approved; D1 design follows. No production source change,tests or
new release completed by Solution Designer. Earlier investigation-only limitations
are historical,not current refusal to proceed. Tooling may block dispatch separately
from user approval; approval is not the blocker.
