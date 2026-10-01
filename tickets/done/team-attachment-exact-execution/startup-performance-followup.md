# New-ticket request: v1.4.88 startup performance

User explicitly requests Solution Designer bootstrap a NEW ticket to investigate slow startup, separate from the accepted/released availability recovery. Do not reopen/expand this finished fix by silently disabling validation. User suspects over-engineering; this is a hypothesis, not an established finding.

## Verified observations
Installed GitHub release v1.4.88, commit98d83c12ff57deb9eeed2847c43e186a4b71542a, normal production profile. Application continues running from /Applications/AutoByteus.app.
- Electron starts internal server05:30:04.615UTC; ready05:30:38.461UTC:33.846seconds.
- Prisma schema migration phase05:30:06.631–07.449:0.818seconds, no pending schema changes.
- Prisma pool at07.615; next server-construction logging37.708; listener38.314. Roughly30seconds lie before server construction/listen; logs alone do NOT separate vault, migration runner and readiness scan time.
- Attachment migration remained SUCCEEDED_WITH_WARNINGS attempt3 with same completed_at1790485440870 on this launch. The previous one-time migration/722MiB backup work did not repeat.
- API earlier actual-copy packaged repeat startup36.491seconds supports that repeat startup remains slow.

## Source-based suspect, requiring profiling
server-runtime.ts awaits RootRunPackageReadinessIndex.rebuild() before HTTP listen (line200 at release revision). It builds no persisted cross-process cache. root-run-package-readiness-index.ts scans structural packages then validates every admitted candidate's references sequentially. context-file-current-reference-validator.ts lists and reads full history record sources. context-file-record-locators.ts includes active/rotated/archive traces, splits and JSON-parses every nonempty line, and rejoins whole text even when validating without changing locators. Each referenced attachment also performs owner-array filtering and filesystem containment checks. This makes readiness depend on accumulated history volume, not just current application prerequisites. admitCurrent() can trigger the same full rebuild on new-run admission; investigate that cost too.

## Investigation boundary
No new profile run or code change by Delivery, no restart of running installed app, no historical-data cleanup. Start by measuring phase timings, file/byte counts, repeated parsing and filesystem checks, using read-only profiling or a faithful owned copy. Separate one-time migration cost from repeat-startup admission. Determine whether incremental/indexed/package-lazy validation can preserve exact ownership, dependency exclusion and non-loss behavior. Do not simply trust terminal migration status or bypass safeguards. Agree a startup performance target with user before design/implementation; follow normal requirements approval and review routing.

## Requested owner
Solution Designer: bootstrap a new ticket/worktree from current personal and conduct evidence-led investigation. Existing dirty shared checkouts contain other work; do not reset them. Delivery's task worktrees are cleaned. Complete cumulative recovery evidence remains in this archived package; durable handoff snapshot location appears in handoff-summary.md.
