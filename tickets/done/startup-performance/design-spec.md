# Design Spec — D1: simple same-ID conversion, no startup history audit

## Solution And Approval Basis
Package startup-performance-20260927 / SR-009. R1 requirements Approved by the
user's explicit removal and current same-migration correction/release instructions.
Design status Ready for applicable independent review; not implemented.
Canonical authorities are siblings requirements-doc.md,investigation-notes.md and
solution-revision-record.md in
/Users/normy/autobyteus_org/autobyteus-worktrees/startup-performance/tickets/in-progress/startup-performance.
Product supplements N/A — not applicable. Prior attachment-ticket design/reviews
are historical evidence only; they do not approve D1.

## Current-State Read / Architecture Investigation Evidence
E1/E3/E5 in investigation-notes.md own the source/probe evidence. The migration
entrypoint validates all sources,preflights a journal,then replans,backs up,hashes,
reconstructs targets,commits,rechecks and repeatedly saves a full manifest.
The readiness index independently runs a whole-history reference pass before
server readiness and on admitCurrent. Installed probe:24.640s,of which24.179s is
reference validation;6.39GB instrumented reads. One-time attempt154.845s,363originals
722.23MiB. These are different measurements,not hashing's isolated time.
Inspection after approval confirms transform already recognizes legacy members
and current agent-runs routes. Trees and context blobs are not changed by this
migration,so file-local old/current recognition remains possible after a partial
commit without a journal. Current access owners already resolve exact execution
IDs; async reader uses stat and sync resolver uses exists,so physical containment
must remain enforced at access when the global reference scan is removed.

## Intended Change / Task Design Health Assessment
Performance correction and bounded refactor. Design issue Yes: duplicated proof
and misplaced global validation,plus bespoke recovery machinery. Refactor needed
now: remove the journal and repeated passes; keep conversion owned by the existing
migration and actual-use validation owned by context-file services. No framework,
background replacement audit,persistent cache or new migration. This is removal
of unnecessary mechanisms,not weakening exact identity or deleting history.

## Relevant Behavior And Production-Path Map
| Behavior | R1 criteria | Trigger / desired outcome | Production path |
| --- | --- | --- | --- |
| BEH-001 | AC-001/002/003/005 | Pending upgrade converts old locators once | DS-001 |
| BEH-005 | AC-002/003/005 | Interrupted/failed upgrade recognizes old/current files | DS-001 |
| BEH-002 | AC-001/005/006 | Completed migration stays skipped;no trace audit | DS-002 |
| BEH-003 | AC-003/006 | Unrelated new work does not audit old traces | DS-003 |
| BEH-004 | AC-003/006 | Requested exact attachment works or fails locally | DS-004 |
| Documentation/release | AC-004/007/008 | Durable lessons and verified corrected release | Specialist delivery after validation |

## Terminology / Reading Order
"Journal" means the bespoke manifest/originalHash/targetHash/committed system,not
the existing migration runner's audit record. "Current" is the exact execution-ID
locator,not proof every future read will succeed. Read intended change,transition,
spines,ownership/file map,then verification.

## Legacy Removal Policy / Removal And Decommission Plan
No backward-compatibility runtime readers or retained legacy flow. Historical
selector interpretation remains only in the existing registered converter.
Remove TeamContextFileTransitionJournal and its imports,manifest schema,path/content
hashes,original-copy logic and mapping/progress collection. Remove trace-wide
validate(group) from runtime readiness and its reference dependency graph/closure.
Remove now-unused converter dependency bookkeeping if only used for preflight/global
closure. Keep necessary individual-locator parsing/owner/containment checks.
Do not delete any user's already-written originals/manifests. They become inert
outside memory discovery; no loader,hash verifier,restoration or reconciliation
branch for them. Normal runner records/logs remain authoritative for attempt status.

## Persisted Data / State Transition Decision
Migration Required for pending supported legacy locators; SAME definition/ID:
20260926_team_context_file_execution_locators_v1. Already-current installations
are Directly Usable — No New Migration. No SQL changes. No new persisted format.
Stored subjects: typed media/file-reference fields in active/rotated/archive JSONL
and task/message sidecars. Exact execution-ID target unchanged. Prose,external URLs,
non-target fields,unchanged line bytes/terminators and attachment blobs preserved.
Whole-file temporary replacement is still necessary with the existing writer;
that is NOT a retained whole-file backup.

### Migration plan and bounded local algorithm (DS-001)
1. Existing runner selects only eligible nonterminal attempt; retain registration,
   prerequisites and startup-only execution policy. Discover structural owners once.
2. Per discovered group enumerate supported record sources with existing discovery.
   Preserve missing/invalid roots and report bounded diagnostics as before.
3. For each source: assert containment,read once,transform once with the existing
   semantic ownership rules. Pass the current group explicitly into the transform
   rather than finding it through a global per-locator source search. Do not collect
   mappings/dependency graphs solely for removed journal/global preflight purposes.
4. The conversion callback recognizes current locators and preserves them; old
   selectors become exact execution locators only with the existing unique physical
   owner/source-trace evidence. Never infer owner from the referring author alone.
   Ambiguous/missing/invalid references throw before replacement: retain that whole
   source file and report unavailable. Continue independent files/groups.
5. If target === source,do not write. Otherwise call existing
   AtomicRunPackageFileCommitWriter.writeSerializedText once with that computed
   target. No target recomputation,hash,backup,manifest,postwrite transform or global
   final pass. The converter establishes semantic correctness while constructing
   the target; fixture tests establish algorithm correctness.
6. Writer committed → count conversion. not_renamed or
   renamed_finalization_indeterminate → truthful failed attempt diagnostic; do not
   immediately reread/reconvert or assert success. On normal retry the atomic file
   is recognized as old or current. Preserve prior successful file commits.
7. Aggregate bounded outcomes through the existing runner interface. Missing trees/
   unresolved historical references are preserved warnings; true I/O/commit failures
   stay failures. Do not promote every exception to warning. Do not turn either
   status into a blanket application startup gate.

Restart safety: fixed source→target shape recognition with per-file atomic commits;
not a multi-file transaction. A mixed old/current corpus is supported. Current
records with later appended content are never replaced by old backup contents.
Released partial journal presence/absence/content does not govern execution; source
files and unchanged owner trees contain the conversion inputs. No global closure
promise that all history is simultaneously accessible after one failed file.
Single migration writer and stopped normal writers remain the operational contract.
No forced ledger reset,terminal replay or rollout backup deletion. Retain this
migration definition for supported skip-version upgrades. Delivery ships a new
version after validation; do not modify existing published release tags.

## Data-Flow Spine Inventory / Primary Execution Spines / Narratives
| ID | Scope and chain | Governing owner / effect |
| --- | --- | --- |
| DS-001 | Startup → runner selection → existing converter → semantic transform → atomic writer → runner outcome | Converter owns transition;writer owns per-file commit;runner owns completion audit. Local loop is above. |
| DS-002 | Desktop/server bootstrap → runner skips terminal → structural readiness → HTTP listen → usable app | Existing runtime/readiness owners;no reference scan before listen. |
| DS-003 | New-run request → existing run owner publishes structure → admitCurrent → structural readiness → usable run | Retain current orchestration;no full-history trace enumeration. |
| DS-004 | Attachment request/local provider read → context-file service → exact owner resolver → contained-file check → file or scoped failure | Context-file boundary preserves exact identity and physical safety for that actual request. |
Return/event spine: existing runner result/status and existing request errors only;
no new events,queues,async lifecycle or background work.

## Ownership Map / Off-Spine Concerns / Boundary Encapsulation
Runner owns selection/ledger/log;converter owns legacy source recognition and target
construction;writer owns atomic file replacement;readiness owns current structural
admission;context-file services own access. Reuse these owners,do not create a new
coordinator. Existing execution location service remains the exact-owner authority.
Shared URI/content parsing serves the converter. Physical path validation serves
both conversion and access; it cannot trigger a history scan. APIs must go through
context-file services rather than inspecting migration records or raw backing paths.
No new entry facades needed. No transport handlers acquire migration knowledge.

## Runtime Removal / Interface And Dependency Rules
RootRunPackageReadinessIndex.rebuild uses RootRunPackageCurrentValidator.scan only;
publish admitted structural groups and diagnostics. Remove reference scanner imports,
reference dependency state and closure. excludeCurrent excludes the requested
structural package; unrelated roots are unaffected. Retain initialization,promise
coalescing and mutationRevision behavior. admitCurrent may retain its structural
rebuild in this minimal correction; it must not enumerate/parse trace history.
Do not alter public isAdmitted/awaitReady/assertAdmitted/list method contracts.
A structurally valid package may now be listed despite an inaccessible historical
attachment. That attachment fails at use; no legacy fallback. This is the explicitly
approved operation-scoped behavior replacing proactive whole-package exclusion.

Async getFinalFilePath and synchronous resolveExistingFinalPath retain exact owner
lookup and safe filename handling. At actual final-file use apply the physical
containment/regular-file check previously performed by the global scanner,using
the configured memory root. Share existing realpath/lstat semantics in a small
context-file-path-validation.ts (async and sync variants). Layout can expose its
configured memory root to those services; do not infer it by walking up paths.
Missing/invalid files return the existing scoped null/error behavior; no all-history
validation. Do not widen this change into new draft retention/upload policies.

All identity interfaces remain explicit {kind,teamRunId/orgRunId/runId,agentRunId}
with no display-name or address fallback in runtime. Interface singularity and
naming check: existing domain names remain accurate; no new generic manager/type.

## Subsystem Reuse / Draft To Final File Responsibilities / Folder Map
Draft map: migration deletes journal;readiness deletes scan;access retains targeted
checks. Shared-structure review: LocatorMapping/FilePlan/Manifest become redundant;
remove them rather than extract a new shared schema. Only physical path checking
has real shared callers;extract existing semantics,not a validation framework.
Final paths below are relative to autobyteus-server-ts in the isolated worktree.
| Path under src/ | Action and single responsibility |
| --- | --- |
| app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-execution-locators-v1-app-data-migration.ts | Modify: one file-local conversion/commit loop and bounded outcomes;drop unused appDataDir constructor input and update registry/tests. |
| app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-locator-transition.ts | Modify: preserve semantic conversion,explicit group context,remove journal mapping/dependency-only fields. |
| app-data-migrations/migrations/team-context-file-execution-locators-v1/team-context-file-transition-journal.ts | Delete:no replacement journal. |
| run-history/services/root-run-package-readiness-index.ts | Modify: structural admission only. |
| context-files/services/context-file-current-reference-validator.ts | Remove group-wide validate/unused closure;retain individual locator semantics needed by converter,or move those into migration folder if no current caller remains. No runtime scan. |
| context-files/services/context-file-path-validation.ts | Extract contained regular-file check plus sync equivalent for actual access. |
| context-files/services/context-file-read-service.ts | Apply one requested final-file check. |
| context-files/services/context-file-local-path-resolver.ts | Apply synchronous equivalent;never initialize a trace scan. |
| context-files/store/context-file-layout.ts | Retain configured memory root for the access containment boundary. |
| context-files/services/context-file-record-locators.ts | Existing typed transform retained;no new parser/cache framework. |
Other callers only update removed constructor/type signatures. Folder boundary
remains existing migration/control,context-file service and storage ownership;
compact helper extraction prevents duplicated path policy without a new subsystem.
Atomic writer and runner need no behavioral redesign.

## Concrete Examples / Compatibility Rejection
Old /rest/team-runs/T/members/selector/context-files/f → same supported target
/rest/team-runs/T/agent-runs/E/context-files/f,only after unique ownership proof.
Already-current target remains byte-identical. Old+current files after interruption
are processed independently;stale manifest is ignored and retained,not restored.
Rejected: runtime old-route fallback,hash-to-prove-correctness,new migration ID,
new cache/index format,background corpus audit,preflight plus execute reconversion,
whole-corpus target buffering and automated rollback from saved originals.
Applied patterns: existing deterministic converter and atomic writer only.
Derived layering N/A — existing owner graph suffices.

## Change Sequence / Verification And Risks
1. Review D1 against R1;no new approval hold for the removal already requested.
2. Implement converter deletion/simplification,then readiness removal and access
   check relocation. Update affected tests to operation-scoped reference failures.
3. Test fresh conversion,mixed old/current retry,failed/indeterminate commit boundary,
   stale released journal ignored,terminal skip,and current later writes preserved.
   Assert one transform per processed source,no hashes/backups/journal writes and
   no whole-corpus buffering. Keep runner logs/status tests.
4. Test duplicate execution addresses,ambiguous ownership,missing physical file,
   cross-root attachment failure,independent new work,all-history-excluded startup,
   REST and synchronous reads including uncontained files. No regression to names.
5. API/E2E owns disposable released-shape data and first/retry/repeat measurements;
   include enough history to detect trace scans,not tiny warm-only tests. Instrument
   startup/new-run calls to prove zero exhaustive reference scans. Compare semantic
   non-target preservation,first-conversion times and real desktop readiness.
6. Delivery integrates,obtains explicit verification and publishes new version;
   no production replay as a measurement shortcut. Keep versions/client-server
   contracts coordinated and preserve existing artifacts. Do not copy current
   code into /Applications or edit live ledger from this task.
Residual: actual after timings are not known until implemented;disk whole-file
replacement still costs I/O. Partial malformed history can remain unavailable.
Moving containment checks requires async/sync coverage. Admission semantics change
from proactive package reference exclusion to requested-operation failure;review
must use new R1 rather than reinstating the removed global audit as a safeguard.

## Task Size And Architectural Risk
Task size Medium: bounded converter/readiness/context-file changes within existing
owners,plus tests/docs. Architectural risk High: released-data retry and admission/
physical-access safety boundaries change. Content volume alone is not the reason.
Escalate any need for new persisted format,lossy cleanup,external writer support,
new runtime legacy reader or wider release changes as requirement/design impact.
D1 is not independently reviewed yet. Applicable review artifacts: N/A — not yet
produced;prior passes apply only to the prior release,not this correction.
