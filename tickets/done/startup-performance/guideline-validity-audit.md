# Full guideline validity audit — SR-012

## Scope and evidence boundary
Read all 411 lines of the pre-edit canonical guideline. Reconciled all22registered
app-data entrypoint paths with the existing22-entry historical practices inventory;
re-read affected source paths,runner,tests and governing final ticket decisions.
This is a documentation validity review,not execution/certification of all migration
code,all helper lines,all deleted Git revisions or all26Prisma SQL migrations.
No runtime tests were run; static evidence suffices for these documentation fixes.
Only the named summary SQL migration was reread fully in this round.

## Findings and edits
1. **Incorrect recovery generalization, corrected (section7).** Previous NONE row
   included all terminal warnings. AppDataMigrationRunner.classifyRecoveryAction
   returns MANUAL_RETRY for ANYTIME warning records,while STARTUP_ONLY warning
   records return NONE. runPending skips both kinds on ordinary startup. Unit test
   publicRecovery explicitly expects anytime-warning:manual/startup-warning:none.
   Removed the incorrect statement;separated automatic completion from manual
   retry eligibility. No new retry behavior or permission added.
2. **Overstated action guarantee, corrected (section7).** MANUAL_RETRY does not prove
   prerequisites allow immediate execution. assertPrerequisites can reject the
   attempt. Reworded actions as policy eligibility subject to existing guards.
3. **Domain-specific prohibition generalized too far, corrected (section6).**
   Negative/fraction/exponent rejection belongs to the token integer domain,not
   all migration data. Historical SR007/legacy-token-usage-row.ts justify strict
   tagged integer transport. Kept real-adapter/type/range lesson;removed blanket
   numeric restriction and universal-looking driver inference wording.
4. **Historical mechanism could read as a recommendation, clarified (section9).**
   Renamed Practices worth reusing to Historical examples:lessons,not templates.
   Existing backups in older JSON migrations are factual,not evidence a new backup
   is required. Team V1 promoter retains selected predecessor files;number of files
   is bounded but source does not establish a universal small-byte bound. Clarified
   that distinction instead of claiming every historical backup was cheap.

## Full-section disposition
| Section | Decision / evidence |
| --- | --- |
| 1 availability | Keep. Latest user authority and released missing-tree incident support scoped failure;business harm remains risk,not measured loss. |
| 2 scope/assumptions | Keep. Canonical-identity SR011..013 and token SR004..007 reject speculative recovery;no automatic hash/journal mandate remains. |
| 3 current-only runtime | Keep. Current registered historical converters still supply source-shape knowledge;schema retirement ordering remains material. |
| 4 outcomes/residue | Keep. Nested-team-history-restart-hydration SR004 explicitly accepts sync-visible residue;it is not obsolete merely because it is narrow. Earlier migrations' mixed-outcome heuristics are not reasons to restore majority-success policy. |
| 5 persistence/completion | Keep;clarify manual-vs-automatic retry distinction. User-approved simple same-ID correction and historical atomic/transaction patterns remain valid. |
| 6 database types | Correct overgeneralization as above;real-driver regression remains valid. |
| 7 audit/recovery | Correct warning/manual/prerequisite statements;formatter and summary SQL validate current compact text contract. Do not revive superseded token-specific JSON audit compaction or runtime old-summary parser from historical ticket drafts. |
| 8 performance/acceptance | Keep. Tiny/warm-only tests missed installed incidents;measured read-only profile is accurately qualified. |
| 9 historical examples | Clarify selective lessons;retain actual old/new examples and approved-not-implemented status. API-REV003/DR009 exist at cited done-ticket paths. |
| 10 checklist | Keep as concise review index,not duplicate detailed rules. |

## Sources rechecked
Paths below relative to isolated worktree:
- autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts
- autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts
- autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts
- autobyteus-server-ts/src/app-data-migrations/domain/app-data-migration-summary-formatter.ts
- autobyteus-server-ts/src/app-data-migrations/repositories/app-data-migration-record-repository.ts
- autobyteus-server-ts/prisma/migrations/20260820090000_redesign_app_data_migration_summary/migration.sql
- autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-run-records-v1/{token-usage-run-records-v1-app-data-migration,legacy-token-usage-row,legacy-token-usage-consolidation-repository}.ts
- autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-v1-package-promoter.ts
- Relevant persistence/status paths in raw-trace,metadata,index,provider,snapshot and removal definitions;22-entry inventory in evidence/historical-migration-practices.md.
- tickets/done/nested-team-history-restart-hydration/{solution-revision-record,design-spec}.md
- tickets/done/token-usage-one-row-per-agent-run/solution-revision-record.md (SR007 driver evidence;later summary history compared against current SQL/repository,not blindly copied).
- tickets/done/team-attachment-exact-execution/{delivery-revision-record,api-e2e-revision-record,solution-revision-record}.md

## Unchanged scope
No runtime source change,production access,restart,ledger edit or release. R1/D1
startup-performance design unchanged:its converter is STARTUP_ONLY,so no new manual
retry route. Normative availability/current-only/semantic correctness constraints
were not removed simply because some old code violates them.
