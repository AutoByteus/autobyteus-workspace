# Guideline consolidation — SR-004
User explicitly requested a complete read and removal of duplicates/inconsistent
or obsolete content. Full862-line source reviewed, including bounded reread of
middle portion omitted by initial output truncation. Same canonical file edited:
/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance/autobyteus-server-ts/docs/design/data_migration_guideline.md

## Result
352lines /3004words, formerly862lines /7163words (58.1%fewer words).
Ten coherent sections, one final checklist; no new competing guide. Historical
before-snapshot in evidence/ is audit only, not a normative policy.

## Consolidation map
- Critical lockout/business/updater consequence: one prominent section1; incident
  case references it instead of repeating consequences and policy.
- Determinism, operating assumptions, interruption and reachability: section2.
- Current-runtime boundaries: section3.
- Repeated availability/classification tables, missing-tree/predecessor/cross-root
  examples: one disposition/admission section4, with concise actual source cases.
- Cleanup/inert residue/mirror exception: retained once within section4.
- Persistence, backup/journal justification and same-ID correction: section5.
- Real driver/SQL transport: section6; unique rules retained.
- Audit summary/logs and retry action API: section7; unique contracts retained.
- Repeated acceptance/performance requirements: section8.
- Historical positive/negative examples + actualv1.4.87 failure: section9.
- Proportionate default/review checklist/design worksheet: one section10.

## Ambiguities / stale material corrected
SQLite rollback no longer sounds applicable to multi-file writes; file atomicity
and package admission distinguished. Bounded grouped warning summaries distinguished
from existing full attempt logs, avoiding contradictory size claims. Admission
independent of ledger is not stated as a mandate to reparse every trace at every
consumer. Terminal same-ID skip versus required new transformation kept explicit.
Historical incident no longer reads as pending recovery: referencesAPI-REV-003 /
DR-009 while leaving lifecycle status ownership in the ticket. Repeated fixed
installation counts and test totals retained only in the historical example, not
universal invariants. Misleading broad fatal-policy phrasing replaced by one
narrow independently proved current-platform prerequisite distinction.

## Preserved authorities
Critical historical-data availability and upgrade access, all-history-excluded
new work, truthful warning/failure audit, strict exact identity/dependencies,
current-only runtime, existing data/original preservation, no majority success,
ordinary retry, real adapter tests, canonical summary/recovery actions and
approved mirror exception remain intact. No behavioral redesign, runtime source
change, deployment, migration execution or live-data edit occurred.

## Checks and routing
Full final text reviewed; unique headings, critical-policy assertions and source/
ticket reference existence verified; git diff --check Pass. Structured checks:
evidence/guideline-consolidation-check.json. Documentation-only result, not
Architecture Design Complete; prior backup-reduction approval question unchanged.
Persisted before handoff-rule evaluation. Return to user if no rule matches.
