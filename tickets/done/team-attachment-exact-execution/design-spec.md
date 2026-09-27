# Design D2 — Team Attachment Migration: Scoped Current Admission

## Solution And Approval Basis
Package docker-image-http400-20260926 / team-attachment-exact-execution. SR-004,
R2 Approved; D2 Ready for independent review. User clarification verified in
API chat 01a0def0-27cd-7b23-bc09-6749275134d9; subsequent direct user instructions
require one renamed **Data Migration Guideline**, production examples and
existing-thread handoff. Current requirement authority: requirements-doc.md.
Canonical evidence: investigation-notes.md and api-e2e-evidence/startup-incident.
R1 exact-ID runtime remains approved. D1 startup clean-success policy is
superseded; D1 is retained only as recovery-evidence/design-D1-superseded.md.
ARCH-REV-001/IR-001/CRR-001/002/API-REV-001/DR-004 describe the old basis,
not recovery passes. API-REV-002 FAIL is the current validation result.

## Current-State Read
Released v1.4.87 converter reads every discovered Team tree unconditionally;
predecessor Team V2 deliberately retains missing-tree sources, and Org-family
conversion can complete with warnings for them. Both new entrypoint guards
require SUCCEEDED and run before strict package admission. One missing tree
therefore prevents app startup. RootRunPackageReadinessIndex already validates
current Team/Org trees + sidecars, excludes incomplete packages, and feeds
catalogs/location services. Aggregate migration status is not admission.

Exact-ID DTO, locator, resolver, draft lifecycle and files are otherwise the
reviewed R1 implementation. No runtime fallback or identity redesign required.

## Task Size And Architectural Risk
**task_size=Medium; architectural_risk=High; Reviewed route required.** Bounded
migration/current-admission correction plus regression tests and guideline/skill
prevention, within existing owners. High because released upgrade and current
admission semantics change and retained data must be preserved. Reclassify if
implementation needs a general import/sync redesign, broad history migration or
new product policy; none is silently authorized. Separate agent-definition repo
change is 27-line workflow documentation, not application architecture expansion.

## Architecture Investigation Evidence
| Evidence | Exact production owner | Finding / decision |
|---|---|---|
| E4-01 / API-REV-002 | installed release JS, log, ledger, copied actual memory | missing-tree failure reproduced; cannot claim full startup from converter success |
| E4-02 | TeamRun V2 migrateRoot; Org history candidate planner/result | SKIPPED_MISSING and explicit preserved warnings are supported source states |
| E4-03 | RootRunPackageReadinessIndex; Team/Org package catalogs; collaboration history core | reuse strict current validation and filtering; validate admission independently |
| E4-04 | TeamContextFileLocatorTransition + TransitionJournal + migration entry | whole-source preflight currently all-or-nothing; isolate package dispositions and normal retry |
| E4-05 | token-usage-migration-readiness.ts; studio/standalone startup | actual current owners distinguish schema-critical vs capability degraded |
| E4-06 | Data Migration Guideline (renamed canonical document) + authoritative skill symlink target | existing narrow-gate rule missed; add concrete examples and mandatory design check |

## Intended Change
Replace the blanket migration-status startup gate with independently validated
current run admission. Migrate proven sources; preserve/exclude incomplete
historical packages; classify unresolved typed references at their dependent
package boundary; keep independently valid runs and new unrelated work available.
Do not just catch ENOENT, accept any warning enum, or ignore all migration errors.

## Relevant Behavior And Production-Path Map
| Behavior | Requirement / AC | Trigger | Target path |
|---|---|---|---|
| BEH-001..004 | REQ-002..006 / AC-002..007 | existing exact selected attachment send/read/draft | DS-001/002 unchanged R1 runtime; current admission prerequisites corrected |
| BEH-005 | REQ-007,009 / AC-008,010 | actual released upgrade/restart with retained missing trees | DS-004 discovery → dispositions → current admission → usable app |
| BEH-006 | REQ-008 / AC-009 | package reference depends on unavailable owner | DS-004/005 bounded dependent package exclusion, independent roots available |
| BEH-007 | REQ-010 / AC-011 | future migration design | mandatory guideline → predecessor/current-owner evidence → scoped design review |

## Supplemental Task Artifacts
Original cumulative artifacts retained. API-REV-002 incident report/probes and
inventory are mandatory evidence (not fixed-build pass). R1/D1 historical copies
explicitly non-authoritative. Companion skill diff/worktree in recovery-evidence/
workflow-prevention.md is part of requested delivery scope. Product UI/prototype
N/A — not applicable. No permission to repair live data or publish a release here.

## Task Design Health Assessment
Posture Bug Fix / Design Recovery. Issue Yes: Boundary Or Ownership Issue and
incorrect source postcondition. Refactor needed now Yes: migration discovery
conflates directory enumeration with admission, and entrypoints conflate one
migration label with global health. Response: explicit source classification,
package-scoped conversion/dispositions and current-only admission validation.
The prior bespoke global journal policy is not expanded. Preserve already
released backups/manifests while reducing new work to deterministic package
plans and ordinary retry; do not add a second recovery protocol.

## Terminology / Design Reading Order
Source group = smallest coherent current run package: Team root, Org root or
standalone AgentRun. Team/Org root is necessary where shared sidecars/tree tie
members together; do not blanket-exclude an unrelated root. Root candidate is
not an admitted run. Warning disposition is an explicit completed exclusion,
not success of the skipped transformation. Read evidence → disposition table →
admission/transition → file ownership → verification.

## Legacy Removal Policy / Removal Plan
Remove both `attachmentMigration.status !== 'SUCCEEDED'` fatal guards. Remove
unconditional read-tree-for-every-directory discovery. Remove global all-source
preflight coupling in the migration's normal attempt. Replace tests asserting
whole-app failure for one unresolved package with scoped exclusion/coexistence.
No old DTO/URL runtime reader returns. Preserve all historic source directories,
original backup bytes, execution IDs, and released evidence. Do not delete
failed ledger rows or set success manually. Update obsolete operational docs
that currently prescribe a universal clean-success gate.

## Dispositions And Admission Contract (Authoritative)
| Observed source/final fact | Migration item / aggregate contribution | Current operation |
|---|---|---|
| missing execution tree; directory still exists (empty or nonempty) | PRESERVED_MISSING_TREE, explicit nonfatal warning; zero source writes | not an owner candidate; existing package validation excludes run |
| missing/invalid required current sidecars/tree or family conflict, attributable to root | PRESERVED_INVALID_PACKAGE, bounded nonfatal exclusion only when current index proves exclusion | not listed/loadable/restorable; independent packages proceed |
| valid package, no Team locator changes needed | ALREADY_CURRENT with current typed-reference validation | admitted if all current requirements validate |
| valid package, references have exact provable transform | CONVERTED; validate before admission | same files/history and exact IDs usable |
| valid structure but reference owner absent/excluded, missing blob, ambiguous proof or malformed app-owned locator | REFERENCE_UNAVAILABLE for source group; preserve this group's preflight originals, complete bounded exclusion → warning | source group not usable for history/restore while unresolved; independent groups usable |
| A refers to excluded B; C independent | A gets explicit DEPENDENCY_UNAVAILABLE; B preserved; C processed | no guessed owner; dependency closure excludes A, not C |
| actual read/write/commit/manifest attempt failure, cannot prove group target | FAILED_ATTEMPT (not disguised as a data warning); aggregate FAILED | independently validated groups may be admitted; affected group stays unavailable; ordinary runner retry |
| real current core platform/schema/vault invariant missing | retain existing core fatal classification | existing platform startup failure, not newly weakened |

Warnings mean the required target is the *validated admitted subset plus explicit
preserved exclusions*, not all directories converted. No ratio/count threshold.
Use aggregate reason counts with at most 5 sample IDs/reasons per disposition,
no full transcript/row dump in status summary. Keep runner summary convention.
Unexpected exceptions are FAILED attempt diagnostics, not SKIPPED_MISSING.

## Persisted Data / State Transition Decision
Files/blobs/tree identities remain **Directly Usable — No Migration** where
valid. Already transformed exact locators remain current, no rollback. Proven
historical typed references still **Migration Required**, but per source-group
classification; incomplete roots **preserved-excluded**, never discarded.
No new DB schema, persisted denylist, quarantine directory, or parallel status
store. Current admission is rederived from current disk facts on every startup,
not trusted from migration label/log/manifest. No changed ledger success semantics
in generic runner.

### Migration Plan And Released Retry
Keep migration ID `20260926_team_context_file_execution_locators_v1`: deployed
FAILED attempts are naturally retried by existing runner. Do not force rerun
terminal SUCCEEDED/WARNINGS; those outcomes do not bypass current validation.
A new converter version/id is not needed just to retry this known FAILED case.
Any further upgrade requirement for previously terminal unresolved data must be
reported rather than resetting ledger state. Prerequisite warnings are allowed
under existing runner semantics; inspect current facts, not predecessor label.

1. Enumerate candidates and classify strict current structure without starting
   agents. Reuse the same current package-validation owner as readiness, not a
   second permissive tree parser. Keep excluded root reason facts available
   when resolving references; never silently remove them from discovery first.
   Standalone source directories require current metadata identity; absence
   yields preserved exclusion, not invented run IDs.
2. Group typed sources by owning root/run. Parse only existing typed attachment
   fields/archives/sidecars. Prove old-reference mapping within migration only,
   using validated exact tree identity, immediate containing Team and existing
   physical/provenance proof. A source trace is not automatic ownership proof
   when it references a different group. Validate current exact references too.
3. Preflight per group and derive dependency edges from references to actual
   referenced owners. Determine excluded dependent groups to a fixed point
   before committing their plans. Preserve excluded groups without writes;
   do not prevent independent groups from converting. Cycles of valid exact
   packages are not errors; unresolved dependency in a cycle excludes that
   dependent component. This graph is bounded migration data, not a service.
4. Reuse current atomic file writer/typed walker and the released backup/manifest
   format for existing unfinished plans. Honor originalHash/targetHash and
   existing `.original` bytes; never overwrite an original with a partially
   migrated file. Group journal work by validated plan ownership. Old manifest
   entries are reconciled to their source group; excluded/noncurrent entries
   remain preserved and cannot set group admission. Manifest parsing and
   original-state reconciliation stay migration-owned, not runtime readers.
   No second journal, OS-failure protocol or automatic original restoration.
5. Complete each group via existing bounded file commit and strict reread.
   Normal interrupted run retries through runner and deterministic transform.
   If existing manifest cannot be safely reconciled, record FAILED for that
   group; do not let `manifest.complete` mean global run validity. `complete`
   means every attempted conversion plan reached a truthful disposition, not
   that unsupported historical roots were converted. Capped diagnostics
   explain exclusions separately from commit progress. Already-complete
   release manifests/backups remain valid original evidence and are not rewritten
   merely for representational cleanliness.
6. Return SUCCEEDED if all current candidates validate with no warnings;
   SUCCEEDED_WITH_WARNINGS when only explicit safe preserved exclusions remain;
   FAILED for unfinished/unvalidated attempts. Startup then independently builds
   current admission, regardless of these aggregate labels. No live mutation in
   this phase; stopped-writer disposable data copy for testing, matching build.

Normal retry/relaunch and original backup preservation are the existing approved
AC-006 contract. Retain released evidence; do not add speculative recovery
formats. Rollback/install/publication remain Delivery-owned and separately
verified; never restore over newer writes.

## Current-Only Admission Design
Extend existing package-readiness authority, not the migration-status API, to
include current attachment-reference validity for affected packages. Two phases
within one rebuild: (a) structural current candidate map; (b) current-reference
validation and dependency closure; publish only the coherent admitted snapshot.
Avoid querying already-filtered location catalogs while building the same index
(circular authority). Pass validated identity/physical-scope facts to a bounded
current attachment validator. It knows current final descriptor/route contracts,
not old selector transforms. An unsupported app-owned locator is unavailable;
no decoding into guessed legacy ownership. Non-app external URLs and legitimate
local file paths retain existing meaning and are not rebound to this node.

Extend source-group identity explicitly to standalone AgentRun for typed
cross-root referrers. Use existing metadata store to validate standalone
identity; integrate the same scoped readiness result into standalone history
catalog/projection and restore entrypoint rather than hiding one row while
allowing direct restore. No whole-standalone capability block from one invalid
AgentRun. Team/Org consumers already use catalogs; verify direct loaders and
file reads cannot bypass current admission. Fresh runs with valid metadata and
no old references are admitted. New current writes keep validated target IDs;
import/refresh/rebuild follows current validation, never migration fallback.
`admitCurrent` must not clear a known unresolved-reference exclusion merely
because a caller republishes a structurally valid tree; use current validation
at the publishing/rebuild boundary. Do not persist a second denylist.

Missing-tree packages are rejected by structural validation without traversing
private history. Reference-bearing valid packages are validated file-bounded;
reuse the typed walker in validation/no-rewrite mode. Do not re-read every archive
on each HTTP GET; use coherent startup/refresh snapshot and current typed-write
invariants. File read still verifies exact owner/file as now. Unknown global
filesystem failure may gate history discovery, but must not pretend individual
roots valid; distinguish from confirmed missing core platform requirements.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope | Owner / chain | Why |
|---|---|---|---|
| DS-001 | Primary / preserved | composer → captured AgentRun → exact finalize → runtime send | R1 invariant unchanged |
| DS-002 | Primary / preserved | history → exact locator → read service → exact owner → file bytes | no legacy fallback |
| DS-004 | Primary / revised | upgrade → candidate classification → group conversion/dispositions → current readiness → app/listeners | unrelated valid work starts |
| DS-005 | Bounded local | readiness structural facts → current reference checks → dependency closure → coherent admitted snapshot | no success-label or direct-load bypass |
| DS-006 | Return | scoped diagnostic → existing migration log/status and unavailable run result | truthful bounded feedback, no new UI design |

## Spine Narratives / Actors / Ownership Map
Startup runs registered migrations, logs truthful attempt status and builds
strict current admission before serving run operations; it no longer throws
only because this migration isn't SUCCEEDED. Converter owns old-shape knowledge
and deterministic file transforms. Current readiness owns usable package
identity/reference invariants. Catalogs/read/load/restore consume that one
boundary. Atomic writer owns physical commit; runner owns lifecycle/retry.
The platform still enforces actual schema/vault gates. Migration warning is not
permission for runtime to parse old files.

## Thin Facades / Ownership Boundaries / Encapsulation
Startup entrypoints sequence runner + readiness only, no old-shape policy.
History/restore entrypoints ask readiness; do not query both a filtered catalog
and raw package files to re-admit a rejected root. Current attachment validator
accepts validated structural facts instead of invoking active agents/index
rebuilds. Migration may reuse the structural classifier but not bypass current
admission after transformation. Generic runner must not gain special-case IDs.

## Off-Spine Concerns / Dependency Rules
Typed record walker and atomic writer are reused. Existing ledger/log owns
status. Existing metadata/tree/sidecar readers own current structure. Released
journal owns unfinished original/target evidence; no runtime depends on it.
Current validator and migration converter must not share historic selector
parsing. Cross-root edge list is per rebuild/attempt, not persistent service.

## Interface Boundary Mapping / Checks
- Classify current root: explicit family + root ID + path → validated structure
  or bounded diagnostic; no arbitrary path owner inference.
- Plan conversion: current structural source group + typed files → proof-backed
  per-group plan/dependencies or exclusion; migration-only historic shapes.
- Check current attachments: structural owner map + sources → current validity
  and exact dependency facts; no writes, no legacy decoding.
- Readiness isAdmitted/assert/load/list: one subject identity, one authority;
  align sync/async consumers. Current published snapshot cannot contain
  reference dependencies on excluded owners.
All singular responsibilities; ambiguity risk controlled by explicit IDs.

## Existing Capability Reuse / Subsystem Allocation / File Mapping
Paths relative to recovery worktree; concrete names for new files may be refined
without changing ownership. No new framework or database table.
| File / group | Action / responsibility |
|---|---|
| src/app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-locator-transition.ts | classify/group candidates and references; stop unconditional reads |
| same/team-context-file-execution-locators-v1-app-data-migration.ts | aggregate explicit dispositions and attempt failures truthfully |
| same/team-context-file-transition-journal.ts | adapt existing evidence/commit unit to group plans; retain released originals/format, no parallel journal |
| src/run-history/services/root-run-package-readiness-index.ts | structural + current-reference snapshot, scoped admission, standalone subject extension |
| src/run-history/services/root-run-package-current-validator.ts (new extraction if needed) | existing strict current tree/sidecar/metadata validation reusable by migration/readiness, no old codec |
| src/context-files/services/context-file-current-reference-validator.ts (new bounded concern) | validate current typed reference ownership/dependencies, no transform |
| src/run-history/services/agent-run-history-catalog-service.ts; agent-run-view-projection-service.ts; src/agent-execution/services/standalone-agent-run-lifecycle-service.ts | consume scoped standalone admission for cross-root dependencies; no raw bypass |
| src/run-history/services/team-run-package-catalog.ts; agent-org-run-package-catalog.ts; Team/Org direct load/restore entrypoints | verify/use same readiness; smallest required changes only |
| src/server-runtime.ts; src/standalone-application-host/start-standalone-application-host.ts | remove global attachment status guard, build validated admission before consumers; retain real platform gates |
| src/context-files/services/context-file-record-locators.ts | reuse typed field walk/archives; no prose rewriting |
| tests/unit/app-data-migrations/team-context-file-execution-locators-v1.test.ts; readiness/catalog/startup tests | retained residue and scoped disposition regressions |
| tests/e2e/runtime/context-file-storage-runtime.e2e.test.ts; tests/e2e/helpers/context-file-process-fixture.ts | replace universal fatal expectation; actual both entrypoints, repeat/startup/dependency/failed-ledger proof |
| docs/design/data_migration_guideline.md | renamed canonical policy plus production examples and required worksheet |
| README.md; docs/modules/README.md; docs/modules/token_usage.md; docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md | update canonical link and remove obsolete global-gate operations guidance |
| web docs/settings.md and docs/agent_execution_architecture.md if they assert universal gate | align operational statement, no UI code redesign |
| companion autobyteus-agents Solution Designer SKILL.md + references/architecture-design.md | mandatory guideline inspection; separate isolated repo, explicit delivery scope |
Server paths above begin autobyteus-server-ts/. No runtime source edits by designer.

## Draft/Final Responsibility And Shared Structure Checks
Reuse current readiness state, discriminated subject identity and existing
store contracts; extract strict validation only to avoid migration/readiness
policy duplication. Do not create optional ID/name fallbacks or a migration
status-driven denylist. The current reference checker is a concrete shared
readiness concern, not an alternate migration engine. Final file mapping above
is the tightened draft allocation. Existing transport/service/store layout
suffices; no folder moves outside new named current validators.

## Applied Patterns / Folder Boundary Check / Derived Layering
Current-package admission index + migration-only deterministic conversion.
Transport → readiness/use-case owners → strict current stores; migration →
current classifier + historical transform → atomic writer. No circular lookup
into an index under construction. No generic workflow engine.

## Concrete Examples / Compatibility Rejection
Empty old Team directory: warning/excluded, app starts. Nonempty missing tree:
same disposition, bytes untouched. Valid C next to it: usable. A→invalid B:
preserve A's unresolved source; scoped A/B unavailable, C usable. Valid A↔B:
both validate, cycle alone not failure. Unknown write failure: FAILED attempt,
not catch-all warning; no unsafe current admission. Invalid core DB table:
existing real startup failure remains. No address fallback, manual ledger patch,
retagging, delete-on-missing-tree, or return-success-on-exception.

## Change / Refactor Sequence
1. Snapshot cumulative incident evidence/approval; independent review of R2/D2
   and the canonical guideline/skill changes.
2. Add source-state regression cases before repair. Correct candidate/group
   classification, reference dependencies and current admission; adapt existing
   journal without losing released retry evidence.
3. Remove both blanket guards only with scoped consumers enforced. Update
   stale global-fatal tests/docs. Validate original exact-ID behaviors unchanged.
4. Execute both real startup entrypoints, repeat startup, cross-root cases and
   a disposable actual installed-data copy (include eight missing-tree roots,
   do not pre-exclude them). Desktop startup proof required for this incident.
5. Independent code review + API/E2E review and user verification; Delivery
   handles eventual hotfix version/publication/install separately. No claimed
   recovery until corrected app startup proof.

## Key Tradeoffs / Risks
A root package rather than individual message is the coherent boundary for
shared Team/Org sidecars; this intentionally excludes dependent unsafe runs
without blanketing unrelated ones. Standalone admission extension is limited
to affected current attachment invariants, not a history redesign. Full current
reference validation costs bounded startup/refresh I/O; avoid per-request
archive scans. Preserved unsupported history remains unavailable, not erased.
Existing absolute manifest paths/backups require truthful retry classification,
not copy-path guesswork. Live data never used as write target during validation.

## Guidance For Implementation / Verification
AC-008..011 are mandatory alongside AC-002..007. Need fresh fixture, real
predecessor warning+missing residue, valid/invalid coexistence, nonexistent and
excluded cross-root owners (old/exact), sidecar refs, valid cycles, failure
isolation, direct-load bypass, second startup, FAILED .87 retry and already
SUCCEEDED .87 current validation, released incomplete manifest preservation.
One normal interrupted-attempt/relaunch category suffices; no broad storage
fault matrix. No 95.9% or other confidence claim substitutes for startup proof.
API owns executable evidence and truthful limits. Source reviewers challenge
admission ownership and warning definitions; returned findings cite R2/R1.


## D2 Interpretation Clarification — SR-005
User confirmed warning completion for incomplete historical data and application
availability even with zero usable historical runs (requirements clarification
records exact messages). The existing D2 source-disposition algorithm and
independent admission apply without any minimum admitted-root count. A fully
classified all-excluded historical corpus returns SUCCEEDED_WITH_WARNINGS;
current platform/new-run readiness remains independently checked. Add that case
to AC-008/009 startup/new-work checks, not a new runtime subsystem. Actual
failed commits remain FAILED audit outcomes, not blanket startup gates.
The existing core exception means a proven prerequisite of application/new-work
operation, never a missing old run or an empty history list. No changes to
unrelated schema/vault guards are authorized or required by this clarification.
Canonical guideline now states availability-first explicitly. ARCH-REV-002
remains the review of R2/D2 structure; this explanatory addendum is not claimed
as an additional independently reviewed result.
