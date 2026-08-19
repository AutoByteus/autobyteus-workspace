# Ticket Request

The authoritative incoming request for this ticket is copied verbatim from:

`/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix-electron-test/tickets/done/codex-runtime-thread-resume-fix/follow-up-ticket-description-canonical-identity-startup-blocker.md`

---

## Later User Scope Clarification — 2026-08-18

The original request below is retained as the incoming baseline. The user later clarified that the ticket is specifically the production upgrade from `origin/personal` to `origin/codex/agent-team-universal-task-delegation`. On 2026-08-18 the user approved consolidating the two development-only Team migrations into one final release-facing `20260814_team_run_execution_tree_v1` migration because neither exists on `origin/personal` and both were created during the same unreleased refactor. External channels and general migration/history frameworks are not part of the ticket. Successful migration must let supported existing Team runs remain discoverable, openable, and continuable.

The user then added and later reaffirmed the foundational production-availability invariant: **no migration failure may make the application unable to start**. The implementation should completely cover the investigated released formats; any conversion, promotion, token, or history migration problem must be reported as `SUCCEEDED_WITH_WARNINGS` while independently valid current data, new Agent/AgentTeam work, unaffected history, Electron/server health, and the ability to install a later product fix remain available. Pre-mutation problems preserve their source; after a mutation-stage problem the affected root is admitted only if its complete current package independently validates and is otherwise excluded without a false preservation claim. Only a non-migration platform condition under which the current application itself cannot operate may remain fatal. The design may rely on normal single-writer process, filesystem, power, and SQLite guarantees and must not become exhaustive defensive engineering for every hypothetical infrastructure failure. This supersedes the original request's global fail-closed/quarantine-oriented wording and every intermediate fatal-migration draft where they conflict. The current authoritative boundary is the approved `requirements.md`; the original request below is historical evidence only.

The user additionally requested that these general production-data-migration prerequisites and practices be written into the project README so future migration tasks can reuse them. The guidance is explicitly broader than database migration: this ticket transforms persisted data in both database rows and filesystem/application-data files. During delivery, the existing **Database migrations** section in `autobyteus-server-ts/README.md` must therefore be renamed/expanded as **Production data migrations**, retaining its database and application-data execution guidance and adding the reusable practice boundary for both storage families. The durable documentation edit is delivery-owned and should be made against the integrated implementation state; it does not create another runtime migration or expand the Team data subjects in scope.

---

# Ticket Title

Canonical identity migration blocks Electron startup on released legacy/orphan TeamRun state

## Base Branch

Create this ticket from `origin/codex/agent-team-universal-task-delegation` (observed finalized head `f78df7feb241df28086c251a79c6d9f0f888fd81` on 2026-08-18).

## Problem

AutoByteus Electron `1.4.52` launches its packaged server against the normal user profile, completes all Prisma migrations, and then intentionally halts before listening because required app-data migration `20260801_team_canonical_identity` cannot preflight all existing TeamRun roots. The server exits cleanly, while Electron continues polling and eventually reports only `Server failed to start within 100 seconds`.

The migration reports nine incompatible TeamRun roots plus the blocked token dependency. Since preflight is cohort-wide, one incompatible historical root blocks conversion and startup for every otherwise-valid root.

This was reproduced with real released user state. It is separate from the finalized Codex/Claude/native runtime-continuity ticket and exists on its base branch.

## Observed Historical Shapes

1. **Nested task-Team addresses with multiple member segments**
   - Two predecessor task records use the released shape `member(parent Team member) -> task_team(nested run) -> member(nested member)`.
   - `normalizePredecessorTeamExecutionAddress` permits ordered task-Team segments but rejects the second member segment with `receiverAddress has more than one member segment`.

2. **Authority-less root directories**
   - Five failed Classroom Simulation roots are empty/orphan directory shells.
   - One Software Engineering Team root lacks recognized root authority but contains member agent-memory files.
   - The current classifier marks both cases `INVALID`; they need distinct, non-destructive dispositions.

3. **Missing or contradictory nested Team identity fields**
   - A Northstar predecessor tree contains four nested Team members with `memberRunId` but no `teamRunId`.
   - A fifth nested Team member has both values, but they disagree.
   - The converter requires `teamRunId` and exact equality with `memberRunId`. Identity must not be guessed.

## Root Cause

The required migration combines strict identity validation with a global all-root preflight, but its accepted evidence model and recovery policy do not cover all TeamRun shapes produced or left behind by released builds. `server-runtime.ts` requires exact migration success, so any such root blocks the entire server. Electron then obscures the terminal migration reason by treating the clean embedded-server exit as a prolonged health timeout.

The Prisma version/upgrade message is not causal: all 21 SQL migrations completed and there were no pending Prisma migrations.

## Required Outcome

Provide a deterministic, evidence-based, non-destructive migration/recovery path for these released states so valid data can become usable without weakening canonical identity safety or requiring users to delete/reset their profile. Surface any terminal migration blocker directly in Electron.

## Acceptance Criteria

### Canonical identity safety

- Preserve fail-closed canonical identity semantics. Never fabricate, randomly generate, or copy an identity merely to make migration pass.
- Convert a missing or contradictory nested `teamRunId` only when a defined authoritative source uniquely proves the canonical identity and the complete tree remains internally consistent.
- When identity cannot be proven, preserve the bytes and produce an explicit quarantine/repair disposition with root, field, reason, and evidence; do not silently accept or discard the state.
- Define precedence and contradiction rules for predecessor metadata, current V1 packages, historical manifests/backups, task/message evidence, and member memory.

### Released nested-address compatibility

- Support the observed predecessor route containing parent member, ordered nested task-Team ancestry, and nested member segments.
- Preserve exact root Team, task-Team lineage, member identity, task-Agent identity when present, and sender/receiver semantics.
- Reject ambiguous, malformed, duplicate, root-mismatched, or structurally contradictory routes with item-level evidence and no partial mutation.

### Authority-less roots and recovery

- Distinguish at minimum: truly empty orphan shells, content-bearing authority-less roots, valid historical residue, partial current packages, and unsafe filesystem objects.
- Empty orphans may be resolved only through an explicit auditable policy; content-bearing roots must never be silently deleted or treated as empty.
- Provide a non-destructive recovery/quarantine mechanism with backups and an actionable report so an unrecoverable root does not make unrelated valid roots unusable, without misrepresenting the quarantined root as migrated.
- Do not require manual directory deletion, production-database reset, or direct migration-record editing as the supported user remediation.

### Atomicity, retry, and ledger integrity

- Preflight failures remain byte-stable: no Team root, token ledger, binding, or migration authority is partly rewritten.
- Applied conversions are backed up, atomic per defined cohort/transaction boundary, and idempotent across interruption and relaunch.
- A profile whose migration record is already `FAILED` with multiple attempts can succeed after the repaired implementation/recovery flow without manually resetting that record.
- Token-ledger planning/mutation starts only after Team identity disposition is safe, remains transactional, and does not duplicate rows, keys, amounts, or attribution facts.
- Complete valid current V1 packages remain validated no-ops on later startup.

### Startup behavior

- After safely resolving or explicitly quarantining supported residue, the packaged server reaches `/rest/health` using the retained valid profile state.
- If migration still cannot proceed, Electron surfaces the migration ID, terminal status, actionable summary, and log path promptly instead of continuing health polling until a generic timeout.
- Decide and document whether a required-migration block should exit nonzero or use a structured IPC/status channel; the desktop process must reliably recognize it as terminal.

### Durable coverage

- Add fixtures matching all three observed families: multi-member nested task-Team route, empty and content-bearing authority-less roots, and missing/contradictory nested Team identity.
- Cover a mixed cohort containing valid V1, valid predecessor, recoverable legacy, quarantined/ambiguous, and malformed roots.
- Prove byte stability on failed preflight, backup/rollback behavior, successful retry from an existing failed migration record, idempotent relaunch, and token-ledger fact preservation.
- Add a packaged Electron/full-process smoke using a disposable copy of these data shapes; prove either healthy startup after safe recovery or immediate actionable terminal error.

## Out Of Scope / Constraints

- Do not reopen or attribute this to the finalized runtime thread/session resume change unless new evidence directly connects them.
- Do not solve the issue by weakening exact identity validation globally.
- Do not mutate or delete the reporter's profile during investigation; reproduce from a disposable copy.
- Do not expose raw user content in committed fixtures. Create minimized synthetic equivalents that preserve only the failing structures.

## Reproduction / Evidence

1. Build Electron from the base branch following `autobyteus-web/README.md`.
2. Launch the packaged app against a disposable copy of an affected released profile.
3. Observe Prisma succeed, then `Canonical identity migration did not complete successfully; startup halted` for `20260801_team_canonical_identity`.
4. Inspect the migration detail report for the three TeamRun failure families above and the dependent token-planning failure.
5. Observe the server exit before listening and Electron continue health polling until its generic 100-second timeout.

Reporter-side evidence (read-only; do not commit raw profile data):

- `/Users/normy/.autobyteus/logs/app.log`
- `/Users/normy/.autobyteus/server-data/logs/app-data-migrations/20260801_team_canonical_identity-2026-08-18T03-15-07-853Z.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-thread-resume-fix-electron-test/tickets/done/codex-runtime-thread-resume-fix/electron-startup-failure-investigation.md`

## Data-Safety Note

The original investigation was read-only. No production/user database row, migration status, TeamRun folder, token entry, or application setting was changed. Preserve that constraint until a reviewed backup/recovery design exists.
