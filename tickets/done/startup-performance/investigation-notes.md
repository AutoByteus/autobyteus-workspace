# Startup performance investigation
## Bootstrap 2026-09-27
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance
Branch codex/startup-performance; refreshed origin/personal base
8bffda04575eaa7198fae186856699011ad5c04b; finalization target personal.
Managed worktree tools unavailable; native git worktree add used. Shared dirty
checkout untouched. Prior recovery worktrees cleaned; no suitable active task
checkout found. No commit/push/source change/live data change.
Prior task read-only durable receipt:
/Users/normy/autobyteus_org/delivery-records/team-attachment-exact-execution/recovery-handoff.md
and startup-performance-followup.md. DR-009 closes availability fix; this NEW
ticket does not reopen that accepted scope. Current user expands investigation
explicitly to earlier migration copy/hash/compare cost, not repeat startup alone.
Evidence and diagnosis remain separate from proposed behavior and future design.

## Starting evidence
DR-007 live-startup-investigation.md: active migration attempt3 during initial
recovery launch; copies/hash callbacks sampled; 170 files committed at05:03:08.
DR-009 installed-startup-timeline.log:33.846s terminal-migration repeat readiness;
Prisma0.818s with none pending; roughly30s before server construction. No phase
profiler, so exact readiness/vault/runner shares not established.
Read-only archived evidence only initially; no restart or mutation of installed app.


## E1 — Earlier migration latency and copy/hash rationale
Recorded production attempt3 lasted154.845s, computed from accepted ledger
started_at1790485286025/completed_at1790485440870. Actual-copy packaged first
startup195.140s and repeat36.491s are separate observations, not interchangeable
phase measurements. Installed release repeat33.846s skipped terminal migration.
Read-only backup manifest/stat confirms363committed changed record plans,
363original files totaling757,312,942bytes (722.23MiB), complete=true.
No attachment image/blob relocation: these are whole history record files whose
typed attachment locators changed. Even one URL requires rewriting/backing up the
whole JSON/JSONL file under the released file-level design. API preservation
report confirms763mapped locator values changed in363record files.

### Source-confirmed work (base8bffda045 / released runtime unchanged)
app-data-migrations/migrations/team-context-file-execution-locators-v1/
team-context-file-execution-locators-v1-app-data-migration.ts first transforms
all sources to prove ownership/dependencies, then journal.preflight plans them.
team-context-file-transition-journal.ts execute plans again; fresh changed files
are read/hashed for original backup, originals atomically written; current source
is re-read/hashed before commit, target rebuilt from backup and hashed, target
atomically written, reread/hashed/transformed again, then whole group checked.
Full manifest serialized and atomically saved before writes and after each file,
plus group completion. This is repeated full-file work, not a simple ID edit.
On ordinary fresh changed-file path: six transform passes inside migration
(initial validation, preflight plan, execute plan, target build, postwrite
validation, final group validation), then separate current-readiness validation.
Retry paths differ; no exact universal pass-count claim for every source.
AtomicRunPackageFileCommitWriter syncs temporary file, renames, syncs containing
directory for originals, targets AND manifest saves. Extra durability operations
are sequential. Source confirms them; no timing share established.
Context-file-record-locators parses every nonempty JSONL line, splits/rejoins full
text even for no-op transforms. Unchanged groups still get multiple planning
passes. RootRunPackageReadinessIndex scans/validates again before listener.

### Why added versus what remains unproven
Historical D1 explicitly required originals + source/target hashes + progress
for no-loss interruption/retry and avoiding restoration over newer writes.
Backup protects original bytes. Hash distinguishes planned original, completed
target, and unexpected change. Reread verifies target; durable manifest tracks
progress. These are purposes, not proof every repeated pass was necessary.
Released D2 preserved existing journal evidence rather than invalidating originals.
Concrete excess/repeated work warrants simplification investigation; claiming
hashing alone caused154.845s or all safeguards are unnecessary is unsupported.
Designer owns earlier mechanism choice; no blame assigned to implementation for
following it. Initial design did not demonstrate performance proportionality on
actual corpus before mandating that repeated work.

## Next investigation, no implementation approval yet
Measure source discovery/ownership validation, transform/parse, hashing,
backup/write/sync, manifest persistence, and final readiness separately using an
owned faithful copy. Compare first conversion, failed-ledger retry and terminal
repeat, count files/bytes/pass counts. Do not replay on production or clear ledger.
Current logs + sample show file/crypto work but do not distinguish phase shares.
User performance target remains open; present evidence-based simplification and
requirements for approval before architecture/implementation. No fix proposed
as authoritative yet. Shared data and restored work untouched.


## E2 — historical practice and critical anti-pattern review / SR-002
Inventory evidence/historical-migration-practices.md covers22registered app-data
entrypoints and selected persistence helpers;69source files inventoried with
hashes.26Prisma SQL files counted but not claimed as fully audited. No claim every
historical Git version/helper line was read. Relevant final ticket revisions
read: canonical identity SR-011/012/013, token usage SR-004/005/006, migration
startup scope recovery (final timeout-only), Org history latency cold-rebuild
recovery, and summary/log ownership. Rejected hash/phase/recovery designs must not
be reused as precedents. Some actual migrations make bounded metadata backups;
others use transactions/renames/atomic writes without custom progress journals.
Read the entire current779-line guideline again at the user's explicit request;
then added prominent critical historical-data-lockout rule and business rationale,
strengthened review checklist and actualv1.4.87 example, and narrowed residual
platform-failure recovery wording so it cannot excuse historical-data lockout.
Commercial harm is documented as foreseeable risk, not claimed measured loss.
Guide update stays in isolated worktree; no installed data or runtime source edits.


## Recovery-path consequence — 2026-09-27
User explicitly emphasizes that historical-data startup lockout can also deny access to in-app upgrade, leaving the user unable to obtain a published correction through normal product flows. Added that consequence and mandatory recovery-path review. Wording distinguishes updater implementations: this is a dependency risk, not an unverified assertion that every updater waits for backend readiness.


## SR-004 — complete guideline consolidation
User expressly requested full read/consistency/staleness/duplicate review. Same
canonical guideline reduced862→352lines,7163→3004words. Consolidated repeated
availability/admission/examples/checklists, retained all distinct operational
contracts, clarified file-vs-SQL recovery and warning-vs-log sizing, and labeled
v1.4.87 as historical with recoveredv1.4.88 receipt references. Full mapping and
checks: guideline-consolidation-report.md and evidence/guideline-consolidation-check.json.
Documentation-only; no runtime design/implementation or backup-removal approval
inferred. Earlier snapshots/history remain non-authoritative evidence.


## E3 — measured installed readiness / SR-005
Readiness probe successful:24.640s rebuild,0.455s structure,24.179s references
(98.13%). Reference phase instrumented reads7,158operations/6,390,427,013bytes;
1,073,318JSON parses. Zero blocked runtime writes. The current recovery change
6beda63e6 added full-history typed-reference validation before readiness. Source
and isolated timing now establish the main repeated readiness bottleneck; not a
new full-app start or precise old/new release benchmark. See evidence/readiness-profile-analysis.md,readiness-profile.json,
readiness-profile.mjs,readiness-profile-provenance.json and recovery-readiness-delta.diff.
These are Solution Designer investigation supplements for REQ-001/002/003,
SC-001/002/003; factual evidence, not behavior-defining approval supplements.
Current terminal conversion stays skipped. Converter-only edits cannot fix the
repeat startup path. Source also identifies admitCurrent's global rebuild; no live
new-run operation exercised. Converter subphase shares remain unknown.
Full352-line consolidated guideline reread; clarified normative-vs-implemented
status, stale-cache-vs-valid-same-process reuse and skipped-converter limitation.
No policy weakening, runtime source edit, production restart or ledger replay.


## E4 / SR-006 — user rejects global startup history audit
Direct user removal instruction applies to the measured pre-readiness reference
scan. Explained original rationale (reference/dependency validity) separately from
mistaken global startup prerequisite. Same guideline adds one specific recurring
anti-pattern example and corrects section4 so it cannot be read as requiring that
scan. Earlier examples remain linked,not duplicated. Approval for removal captured
in REQ-006/AC-006; actual runtime source unchanged. Backup/journal simplification is
not implicitly approved. No replacement global background audit/cache authorized.


## SR-008 — explanation of converter backup/hash/journal rationale
User asks why deterministic conversion needs whole-file backups,hashes,repeated
transformation and journals. Reread current entrypoint and transition-journal.ts.
Source confirms original/target SHA256 serve byte-state recognition on retry,
backup integrity and changed-source detection; path SHA256 is only backup naming.
Hashes do not prove semantic correctness or correct ownership. Originals preserve
whole changed JSON/JSONL records because the implementation commits at whole-file
granularity; they are not copies of image blobs or a requirement of URL conversion.
Custom manifest stores source,hashes,mappings,committed flags and is saved after each
file; distinct from the required runner audit record. Multiple passes reconstruct
and check the same target. These mechanisms implement the earlier design's extra
recovery contract,not an inherent prerequisite of a fixed source→target mapping.
No demonstrated need establishes the entire mechanism as proportionate; ordinary
atomic replacement plus deterministic old/current recognition is the simpler
candidate,subject to supported partial-state analysis. Atomic replacement of one
file is not a transaction across files and does not prove semantic correctness.
Do not remove existing originals or disregard already-released partial journals.
No exact converter phase timing claimed; total154.845s is not hashing time.
Evidence-only explanation; no runtime or approval-policy change. Team handoff
lookup unavailable in exposed tools; no specialist handoff claimed.


## E5 / SR-009 — approved simplification architecture investigation
Latest user instruction resolves backup/hash/journal removal approval;R1 Approved.
Reread transition,journal,entrypoint,current structural validator,atomic writer,
Team V2 historical migration,context-file owner/read/local-path/layout services.
Transition already recognizes old/current URIs;only record references change,
not source execution trees/context blobs. Atomic writer commits per file and
reports pre-rename vs post-rename-finalization failure. Existing manifest never
held unique conversion inputs unavailable from source/tree;retaining it inert
supports simple old/current retry without restoring historical bytes.
Source finding: actual async file read uses stat,sync local resolver uses exists;
physical containment was checked by global scan. D1 must retain that check at
actual use,not assume existing access was already equivalent. D1 therefore moves
small existing physical check semantics,not a new historical audit.
D1 removes cross-package history dependency closure in favor of explicitly
approved operation-scoped failure. Structural admission remains as existing
current-data protection. Independent review required by High risk classification;
no runtime source edited by Solution Designer. Further tests/after timings belong
to Implementation/API-E2E/Delivery. Available tool inventory contains no team
get_handoff_rules/send_message_to;do not substitute Codex thread collaboration.
Supplement inventory updated: requirements-before-r1.md is historical only;
readiness profile/analysis/provenance,diff,historical-migration-practices.md and
initial-cost-evidence.json support R1/D1;guideline is normative and user-approved.


## SR-012 — full guideline validity audit
User asks reread complete guide against historical migrations and remove obsolete
claims. Full411-line pre-edit guide read;22registered entrypoints reconciled to
prior study;relevant mechanism/runner/test/final decision paths rechecked. Corrected
false NONE-for-all-warning claim and manual-execution guarantee;scoped token numeric
restrictions to their actual domain;relabelled historical backup mechanisms as
examples,not default prescriptions. Other sections remain evidence-supported;
no blanket delete-valid-guidance-to-match-old-defects. Full audit and static checks:
guideline-validity-audit.md,evidence/guideline-sr012-check.json. R1/D1 unchanged;
documentation-only;git diff --check passed. Routing tools unavailable,no handoff.


## User-requested candidate startup confirmation — 2026-09-27
Read DR-001 handoff and reports;user independently launched fresh local candidate.
Read-only identity/log/ledger/health check confirms worktree appPID68792,backend
69702,normal production profile29695.07:59:54.878→58.685UTC internal startup3.807s;
HTTP200. Same migration attempt3/status/timestamps unchanged;normal terminal skip.
Bundled readiness has structural scan only;no live scan instrumentation rerun.
Nonblocking stderr notices/missing historical trace warnings disclosed. Full result:
user-startup-log-check.md and evidence/solution-designer/live-startup-check.json.
No runtime edit/restart/replay or release approval inferred. Rules:no matching
handoff for evidence-only result;return requested observation to user.
