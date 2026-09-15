# Design spec — Complete and narrow the unreleased Org migration

## Scope / approval / status
Package ORG-TOKEN-MIGRATION-20260915-001. Design DS-001, **Ready for independent architecture review**, 2026-09-15. Requirements authority: current approved SR-003 in requirements-doc.md, U-APPROVAL-001 plus explicit corrections U-CORRECTION-003 and U-SCOPE-004. BEH/REQ/SCN-001–005, AC-001–008. No Product/UI supplement.
Canonical evidence: investigation-notes.md INV-001–007 in this ticket. Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/org-token-statistics-migration, branch codex/org-token-statistics-migration; pinned base d60f74c21e4e4cf5ee23b97cb51cfa42bed3b009, freshly fetched from origin/requirements/flat-agent-organization-model. Eventual target that same unreleased feature branch, NOT personal. No merge/release/live-profile reset authorized by design approval.

## Current-state read
Existing family migration owns filesystem/history cutover; locator component inventories all Team, Org and standalone histories before expensive per-file transforms. Flat Team zero-write classification occurs too late to avoid these reads. Subsequent cleanup and global Org-index reconstruction rediscover roots. Token state is separate: SQL current run record still carries legacy Team ownership after an Org conversion; the accumulator preserves it and Org presentation rejects it, fail-stopping the root. Existing runner successful-record skipping is correct for an unreleased migration and remains unchanged.
Use the established migration definition, exact released/current validators, execution indexes and atomic writes. Extend candidate-driven conversion; do not retrofit compatibility into runtime event adapters or auto-replay successful development profiles.

## Task size and architectural risk
- **task_size: Medium.** Bounded existing family-migration refactor plus token-attribution transform, prerequisite ordering and a narrow read-only restore guard; approximately 9–12 production files and focused tests. No new subsystem, public API, Prisma schema, UI, runtime family or migration identity.
- **architectural_risk: High.** Material persisted ownership conversion and filesystem/SQL interruption ordering; candidate/referrer boundary must preserve attachments; migration order and restore admission affected. High is not based on document count or 68 observed rows.
- Escalation: any public Org statistics schema/UI change, global startup attachment policy change, unsupported source reconstruction, cross-cohort scan, data loss, or new migration/replay protocol returns to Designer; do not silently broaden implementation.

## Architecture evidence mapping
| Evidence | Source | Decision |
| --- | --- | --- |
| INV-001/002 | exact app/Codex error, SQL tuple and presentation fail-stop | Correct stored attribution, not counts or exception suppression |
| INV-004 | token fold, snapshot/dedupe codec, analytics projection | Three-field update; no refold, no facet rebuild, checkpoint bytes preserved |
| INV-004/006 | runner successful skip and user correction | No runner/hook/version/ledger changes |
| INV-004 | legacy token materialization/prerequisites | Move existing token chain before family migration; one current-record transition |
| INV-005 | 1540 current records, 68 stale rows/12 roots, all exact tree members | Bounded SQL/metadata cohort; no full trace/DB copy; numbers are reconnaissance not validation |
| INV-007 | locator inventory, global index loop, old synthetic outside-cohort test | Shared history-source plan; exclude non-candidate histories across all phases |

## Intended change
Keep migration ID `20260901_agent_org_flat_team_families_v1`. Within its normal execute(), select history source work once, migrate only those records/files, and separately convert remaining attributable token source records. No history source is a history no-op, not a reason to skip token source work. Metadata reads are permitted; standalone and flat-Team trace/archive/attachment/sidecar reads are not.

## Behavior and production-path map
| Behavior / requirements / AC | Trigger | Target production path / lifecycle |
| --- | --- | --- |
| BEH-001, REQ-001/003, AC-001/003/006 | First feature upgrade | SP-1: startup → existing ordered migrations → family source plan → selected history + token conversion → normal readiness → same Org continuation |
| BEH-002, REQ-002, AC-002 | Ordinary same-migration retry/test invocation | SP-2: existing runner invokes execute → independent source selection → history no-op if empty → token conversion for remaining SQL source → success/failure, unchanged runner scheduling |
| BEH-003, REQ-003, AC-004 | Native Agent/flat Team/already-correct Org | SP-1 selection excludes histories; token source proof excludes rows; unchanged current runtime |
| BEH-004, REQ-004, AC-005/008 | Interrupted migration or failed candidate | SP-3 partial source remains identifiable → retry same owner → verify selected work → publish completion; SP-4 rejects incompatible Org token state before starting Agent |
| BEH-005, REQ-005, AC-007/008 | Large non-candidate corpus | SP-1 metadata-only selection → no non-candidate history I/O; unchanged separate startup validation |

## Supplements
intake-analysis-reference.md is historical bootstrap evidence only. Original archived feature and timeout-ticket investigations are linked in canonical notes, not copied as authority. Product, independent review result, implementation, executable validation and delivery artifacts: **N/A — not applicable / not yet performed**. No normative UI artifact.

## Design-health assessment
Posture: Bug Fix plus user-approved scoped scanning correction. Issue: Missing Invariant at family cutover (token ownership omitted), plus duplicated candidate discovery/responsibility overload. **Refactor needed now: Yes, locally.** One metadata source plan governs locator, root transition and index reconciliation; migration-owned SQL component owns old→current token attribution. Remove locator-global inventory and unconditional Org history rebuild. Keep existing runtime owners and shared current parsers. No refactor of general migration scheduling, pricing/analytics or global current-package scanner. Residual startup scan cost remains explicitly deferred.

## Terminology / reading order
History source candidate = released nested configured Team root, or remaining source work from its interrupted cutover. Delegated task Teams alone do not make a flat Team a candidate. Token source candidate = saved Team ownership attributable to a root that actually becomes/is an Org, proven by current metadata and exact Agent ID. “Current target metadata lookup” verifies ownership, not a special recovery mechanism or reconversion. Read scope/evidence → transition → spines → owners/files → verification.

## Legacy removal policy
No backward compatibility; remove replaced legacy paths from normal execution. Retain historical decoders only inside existing migration folders. Remove all-standalone/all-flat member collection from locator transition; remove global Org-index reconstruction/pruning from this migration. Do not remove previously released migrations or current family validation. No runtime old-root fallback, alias route or presentation-adapter catch-and-ignore.

## Persisted-data decision
**Migration Required.** Current runtime cannot use the old Team attribution for an Org; direct use has an observed root-wide failure. Discard/rebuild of usage is unacceptable because aggregate accounting and compact checkpoint state are authoritative. Shape remains existing token run record; no Prisma schema version change. Target is native Org representation: no Team root in token record, actual Org relationship remains in execution tree.
Observed local store production.db ~875MB at initial investigation; only1540 current run records and68 structural candidates found, zero legacy ledger rows. Do not migrate entire DB or assume these numbers for customers. Bounded metadata/run-record work; candidate history cost scales with selected files. No arbitrary startup deadline. Native Agent/flat Team data are Not Affected by this correction. Daily token facets have no root dimension and remain unchanged.

### Migration plan — same existing definition and ledger
1. **Prerequisite order.** Register existing custom-provider-model-value backfill, provider-name backfill and `20260819_token_usage_run_records_v1` chain before family migration. Add token-run-record migration to family's prerequisites alongside Team V2. Do not rename/add IDs or manually invoke another migration's execute. Existing token migration still owns legacy-ledger consolidation, validation and deletion; do not write a second legacy-token decoder. Preserve unrelated prerequisite order. This also handles first upgrades whose token ledger has not yet been materialized.
2. **Select history sources from metadata.** Enumerate Team root directories; read execution tree once. Use current flat schema for flat classification and released V2 classifier for nested candidates (configured Team count≥1). Flat returns a no-history-I/O disposition. Missing/invalid tree returns bounded existing-style diagnostic; never descend to guess. No standalone directory enumeration. Read lightweight Team/Org history indexes and target directory metadata only when needed for leftover source work. Cache immutable validated plan records; do not repeat expensive inventories in subphases.
3. **Partial source work.** A renamed target with retired Team authorities is pending source cleanup, not an arbitrary current Org recovery case. An exact retained Team index row with matching strict Org tree supplies an index-only source candidate. No retired files/index work means no history candidate. Both-family collision remains failure, not automatic overwrite/merge. Metadata-only inspection of Org directories for retired filenames is allowed; no arbitrary Org histories scanned. Token-only work never triggers locator traversal.
4. **Selected locator preflight/commit.** Pass only selected history plans to locator transition; retain typed-field transformations, bounded file parsing, physical ownership proof, original/target hashes, atomic writes and strict reread. Include candidate-contained configured/task/archived records and cross-candidate dependencies. Do not inspect outside-cohort references globally. Resolving a reference found within a candidate may read exact referenced-owner metadata and stat exact bytes, not enumerate the referenced non-candidate history. Native flat-Team locators remain unchanged. A true unsupported outside-cohort preservation finding returns to Designer.
5. **Selected history cutover.** Existing target validators, atomic authority writes and directory rename stay. Keep retired Team execution tree until selected current package, token phase for that root, dependency proof and index reconciliation all succeed. This existing file acts as incomplete-source evidence and prevents normal current-package admission; do not invent a new migration progress schema. Source slot before rename and target slot after rename are explicit in plan. Do not overwrite an independent destination.
6. **Token source phase, independently selected.** Query current records with non-null Team-root attribution in bounded batches/grouped roots. Resolve only exact candidate roots: newly planned nested roots or current strict Org metadata with at least one configured Team and matching root ID; reject both-family collision. Use AgentOrgExecutionIndex.listAgents() to include configured, direct task and task-Team Agents, including settled history. A flat Team root, standalone row, unrelated unknown root or already-neutral native Org is not migrated. Token-only candidates do not require any history traces or context-file traversal. Unsupported/conflicting identity in an otherwise selected root is a reported failure, not guessed attribution.
7. **Atomic token correction per selected root.** Read/revalidate matching rows inside a Prisma transaction and check all record Agent IDs belong to exact Org index; check selected members for contradictory non-null root claims too. Require source tuple `(root_team_run_id=R, root_attribution_status=single, identity.rootTeamRunIds={single,R})`. Target tuple is `(null, unknown, {unknown})`. A row already at target is zero-write; absence means no usage to fabricate. Mixed/contradictory/malformed selected attribution fails and rolls back that root. Check for selected-root SQL claims whose run ID is not in tree; do not silently drop them.
8. **Preserve all other data.** Parameterized narrow SQL/Prisma update of those THREE fields only; do not call accumulator.recordObservation or full-record upsert, and do not use Number conversion for accounting. Preserve all other identity-summary fields semantically; preserve numeric/cost fields, revision, persisted/observed timestamps, report counts, prices, flags, display metadata, snapshot_series_state_json and recent_idempotency_digests_json byte-for-byte. Reread and assert only allowed difference before transaction commits. No analytics increment or refresh. Root transaction is repeat-safe after process interruption.
9. **Selected history index completion.** Read indexes once, upsert only selected root rows, retaining original/current summary/timestamps per existing precedence; remove only their corresponding Team rows. Write Org index first, strict reread, then Team index, strict reread. No selected changes → no index writes. Preserve all unrelated rows semantically; do not filter/prune every row by global directory existence. Existing atomic whole-index files mean unrelated row ordering/format may follow store normalization when a real selected update is needed; never modify their meaning.
10. **Finalize dependencies and retire source.** Remove remaining retired authorities only after this root and referenced candidate dependencies have valid target authorities/locators, token correction and selected index completion. If one dependency fails, leave dependent roots unfinalized with explicit failure diagnostics; source markers survive so retry does not need an invented receipt. For dependency cycles, validate the whole selected dependency component before retiring any final marker; partial marker removal is safe only after all target effects have completed. Root completion counts reflect actual durable effects, not planned work.
11. **Completion/retry.** Existing runner marks same ID success only when required selected work succeeds; otherwise existing per-item failure reporting/restart retry. If SQL committed then later index write fails, rerun sees neutral SQL and only remaining history work. If no history source but token source remains, run token phase alone. Existing runner skips successful records unchanged. Development ledger reset is an explicitly separate stopped/backed-up operator test action—not code in the product, not done by Designer.

### Runtime boundary after unsuccessful migration
Studio currently continues after per-item family failures, so the original token mismatch must not start and fail-stop an Agent again. Add a **read-only current-schema assertion** at AgentOrgRunManager.restore after strict package load and before scopeBuilder.build. Through TokenUsageRunStore, validate existing token records for exact indexed Agent IDs have native Org neutral Team attribution; absent records are valid. Check current token materialization readiness through existing TokenUsageMigrationReadiness. Return a precise `AGENT_ORG_TOKEN_OWNERSHIP_NOT_READY` diagnostic with root/run and migration/restart guidance when incompatible; do not mutate/repair/suppress/resolve legacy forms at runtime. No version/build detection. This protects REQ-002/004; fresh Orgs and other families unchanged, inspection remains available, and root-wide startup is not globally blocked merely by unrelated failed items. Current event validation/fail-stop safety remains unchanged for genuine runtime inconsistencies.

### Safety / rollback / operations
No old/new process may write a shared profile during cutover. Testing uses isolated DB/memory roots and injected repositories; never default new tests to production.db. Before any later real-profile validation, Delivery obtains separate operational approval, stops all writers and makes a SQLite-consistent DB plus matching memory snapshot. No automatic downgrade, global ledger reset or statistics reset. On failure leave source/target evidence and transaction rollback for correction/retry; operators can restore paired backups if explicitly chosen. Existing per-file atomic helper is reused; no claim of one transaction across SQLite and filesystem. Historical migrations retained; no compatibility branches added to business code.

## Data-flow spine inventory
| ID | Scope | Start → end | Owner | Why |
| --- | --- | --- | --- | --- |
| SP-1 | Primary end-to-end | startup request → normal migration chain → metadata candidates → history/token cutover → current readiness → continuable Org | Existing family migration for cutover; Org manager for restore | Real upgrade outcome |
| SP-2 | Primary retry | ordinary execute invocation → independent remaining sources → selected work/no-op → existing ledger result | Existing family migration | Idempotent source→target semantics |
| SP-3 | Bounded local | candidate preflight → write/rename → SQL transaction → indexes → dependency validation → source retirement | Family migration | Partial effects remain resumable |
| SP-4 | Return/event | continue → Org restore current-record assertion → Agent/Provider token event → accumulator summary → Org adapter → UI response | Token store owns current token invariant; Org owns lifecycle | Confirm original failure is fixed |

## Primary spines / narratives / actors
SP-1: `Electron/server startup → AppDataMigrationRunner → existing token materialization → family migration/candidate plan → selected locator + run + SQL + index transitions → current readiness → Org restore`.
SP-2 uses the same chain when invoked again; each phase selects only remaining source state rather than asking whether a development build ran. Empty history plans bypass all locator/index work; SQL remains independent.
SP-3 is the family owner's internal ordered commit sequence above. No helper secretly controls migration scheduling. SP-4 follows the same conversation identity through a token event after restore; suppressed replay and genuinely advancing usage both read corrected persistent identity. Token errors are not hidden.
Main-line nodes: startup orchestrator owns order; runner owns lifecycle/locks/result; family migration owns conversion transaction sequencing and per-root success; Org manager owns runtime admission; Agent runtime and token accumulator retain existing event/accounting ownership.

## Ownership map / facades / off-spine concerns
| Concern | Owner served | Responsibility / must not own |
| --- | --- | --- |
| Metadata candidate planner | family migration, SP-1/2 | root classification, exact immutable source plans; no history/SQL writes |
| Locator transition | family migration, SP-3 | typed reference transform and ownership proof inside plans; no global inventory |
| Token attribution transition | family migration, SP-1/2/3 | source tuple classification, root-level atomic conversion via migration DB adapter; no runner or legacy ledger consolidation |
| SQL transition repository | token attribution transition | transactions, narrow parameterized update and reread; no caller-side SQL bypass |
| History index reconciliation | family migration | selected row preservation/update order; no global catalog cleanup |
| Existing indexes/validators/atomic writer | above owners | current/released schemas, identity lookups, file commit; no new global policy |
| Current token readiness assertion | Org manager, SP-4 | versionless neutral invariant; no migration or filesystem ownership discovery |
Public REST/GraphQL facade unchanged. Thin façade for token guard is TokenUsageRunStore; Org manager calls that boundary, not it and its SQL repository together.

## Removal/decommission plan
- Remove locator's autonomous all-Team/all-Org/standalone inventory; replace with supplied candidate plans and lazy exact reference metadata lookup.
- Remove flat-Team TeamExecutionIndex walk and standalone directory addition from that migration component.
- Remove independent repeated candidate discovery/global Org index rebuild/pruning; replace selected reconciliation.
- Withdraw all tentative success-verification hooks, migration revision markers and automatic ledger-reset design from INV-004. No such code was written; no file removal needed.
- Keep released schema decoders in historical migration owner, normal current validators and separate startup attachment scan unchanged.

## Ownership boundaries / encapsulation / dependency rules
Family orchestrator → candidate planner, locator transition, token transition, selected-index reconciler. No caller may combine token transition with direct calls to its SQL adapter. Token transition may depend on migration SQL and shared current token decoders; normal token/runtime services must not import migration transformers or released schemas. Org manager → TokenUsageRunStore.assertAgentOrgRecordsReady, never raw SQL. Token store → current SQL repository and shared pure current-attribution predicate. Candidate metadata uses strict tree/sidecar/index stores behind planner; locator does not independently scan them all again. No dependency from runner to feature internals; registry supplies order/prerequisites as before.

## Interface mapping / checks / natural subject names
| Boundary | Subject and shape | Responsibility / check |
| --- | --- | --- |
| HistoryCandidatePlanner.plan() | metadata-only immutable `HistoryCandidatePlan` discriminated as source-root / partial-target / index-only | one source cohort; explicit physical slot and exact root ID; no boolean soup or parallel drifting trees |
| LocatorTransition.prepareAndCommit(plans) | only history plans requiring locator work | keeps locator/dependency proof; no token-only or non-candidate root enumeration |
| OrgTokenAttributionTransition.execute(candidateMetadata) | source legacy Team-root claim R + exact current Org index | selects SQL source independently, transaction per root; no caller-selected arbitrary run list for writes |
| TokenUsageRunStore.assertAgentOrgRecordsReady({orgRunId, agentRunIds}) | current Org root and exact indexed members | read-only readiness, rejects Team-root summary before materialization; no history migration |
| HistoryIndexReconciler.commit(selectedRoots) | completed selected roots + preserved index snapshots | paired ordered atomic writes; no unrelated cleanup |
All interfaces singular and explicit, selector risk Low after validation. Shared HistoryCandidatePlan is migration-owned and separates index-only from full conversion rather than all optional fields. `TokenAttributionTuple` has one coherent meaning across three existing persisted projections; no redundant orgId column introduced. Names reflect actual root/record subject, not generic “support” or “manager helper”.

## Existing capability reuse / subsystem allocation
Reuse app-data-migrations lifecycle, existing family definition, released/current schemas, AgentOrgExecutionIndex, AtomicRunPackageFileCommitWriter, Team/Org index stores, token current codecs and Prisma transaction infrastructure. Extend only those established migration/token/Org-restore boundaries. No new capability subsystem or general migration framework. All historical conversion code belongs beneath the existing family folder; current invariant predicate belongs under token-usage. Content files/evidence remain in ticket, not runtime.

## Draft → reusable structure → final file responsibilities / path mapping
Paths below relative to autobyteus-server-ts. Names for new files are normative responsibility suggestions; rename only if equally clear and record delta.
| Action / path | Final responsibility / owner | Why here / must not contain |
| --- | --- | --- |
| Modify src/app-data-migrations/app-data-migration-registry.ts | move existing token prerequisite chain ahead of family | wiring only; no special success handling |
| Modify src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts | orchestrate one plan and selected phases, new prerequisite/results | existing main owner; no inline SQL/second global inventory |
| Add same folder/agent-org-history-candidate-plan.ts | immutable source metadata plan, pure/source classifiers and metadata discovery | migration-only; no trace contents or token writes |
| Modify same folder/agent-org-context-file-locator-transition.ts | consume plan, retained ownership/dependency checks | existing concern; no standalone/flat trace inventory |
| Add same folder/agent-org-history-index-transition.ts | selected keyed index changes, no-op detection, ordered persistence | extracts real concern from orchestrator, not empty façade |
| Add same folder/agent-org-token-attribution-transition.ts | exact legacy→native Org tuple selection/transition and reporting | migration source knowledge; no runtime invocation |
| Add same folder/agent-org-token-attribution-repository.ts | root transaction, narrow reads/writes/CAS-style preconditions, allowed-difference verification | migration SQL adapter; no pricing/refold/index ownership |
| Add src/token-usage/domain/agent-org-token-attribution.ts | pure current native Org token invariant shared by migration postcondition and runtime guard | current meaning only; no old schema coercion |
| Modify src/token-usage/providers/token-usage-run-store.ts | public read-only assertAgentOrgRecordsReady | encapsulates repository; no migration fallback |
| Modify src/token-usage/repositories/sql/token-usage-run-repository.ts | batched exact run-ID current-record read for guard | normal read API, no legacy repair method |
| Modify src/agent-org-execution/services/agent-org-run-manager.ts | inject/call current token guard before restore scope build | narrow lifecycle delta; no new global readiness scanner |
| Tests under existing tests/unit/app-data-migrations, tests/unit/token-usage, tests/unit/agent-org-execution plus isolated integration/E2E | boundaries, I/O exclusion, interruption and real restore/token path | test data only; never user's live DB |
Draft identified planner/locator/token/index duties; final extraction leaves only reused HistoryCandidatePlan and current token invariant shared. Do not create shared/common kitchen-sink types. Existing folder compactness is clear: a bounded migration pipeline with explicit files; runtime/domain and SQL remain in their own owning folders. No transport/UI layer changes. No file move or broad unrelated refactor needed.

## Applied patterns / derived layering
Metadata plan → deterministic transformation → atomic persistence follows existing locator preflight/commit practice. Candidate plan is shared owned data, not a second run registry. Root-level SQL transaction and per-file atomic commits provide explicit resumable boundaries, not a fictional cross-store transaction. Layering derives from startup orchestration → migration owner → pure plan/transition → stores, and separately Org lifecycle → token boundary → current query.

## Concrete shape examples
Source R contains a configured Team plus direct Agent A; token row A is `(R,single,{single,R})`. Result history root is Org R, Agent remains A; token tuple becomes `(null,unknown,{unknown})`, all 44931818 previously observed cumulative tokens unchanged in the representative case. Next duplicate usage remains suppressed with neutral summary; next advancing usage adds only its real delta.
A native flat Team with taskTeam executions remains flat because configured root membership contains only Agents. No trace reads there. Rerun with no Team source/index leftovers but token row A still old performs token work only. Avoid “if migration already succeeded then reset it”, “read every raw trace to find a possible URL”, or clearing just root_team_run_id.

## Backward-compatibility rejection log
| Rejected mechanism | Reason | Replacement |
| --- | --- | --- |
| New migration ID/version/completion recheck hook | user explicitly rejects released-upgrade/development-build framing | same existing migration + ordinary source candidates |
| Runtime old Team-root allowance/neutralizing adapter | hides incomplete cutover and weakens root-family invariants | persistent transition before use + read-only invariant guard |
| Full usage refold/repricing to correct ownership | authoritative totals/checkpoints at risk | narrow three-field transaction |
| Global non-candidate trace/URL scan or legacy URL fallback | violates user-approved I/O scope | candidate-only typed transformations; material contrary user scenario returns upstream |
| New Org token schema/statistics tree feature | not needed for existing native Org representation | current schema and per-Agent stats, unchanged facets |

## Change sequence / implementation guidance
1. Add isolated fixture/IO-spy boundaries and injectable DB dependencies; capture negative controls, counts and current tuple.
2. Extract candidate plan and selected index transition; route locator through plan and remove old inventory paths. Preserve per-candidate dependencies and incomplete-source markers.
3. Implement pure tuple/invariant checks, migration SQL transition and prerequisite order. Verify original legacy-token migration still precedes correction under empty/current/legacy source cases; do not broaden it.
4. Integrate correction before source retirement; cover no-history/token-only and interruption between each durable step. Add current Org restore assertion without migration imports.
5. Update exact existing tests that assumed broad synthetic cross-cohort rewrites; retain candidate archive/file-only/ambiguity coverage. Add instrumentation rather than claiming performance from unchanged file hashes.
6. Implementation self-check and applicable independent source review, API/E2E real execution and delivery follow team rules; Designer has not executed these. Docs should state this is one extended unreleased migration and scope of performance claim.

## Verification matrix
- AC-001: actual released nested fixture → token materialization if necessary → existing family migration → current Org restore/response + token presentation.
- AC-002: no source history/index work but stale SQL; zero history reads/writes; valid native token result. Successful ledger still skipped by runner regression test.
- AC-003: duplicate and advancing cumulative events after migration, unchanged snapshot/dedupe bytes; aggregate correct and no root rejection. No prior record → no invented counts.
- AC-004: flat-Team with task Team, standalone Agent, native valid Org; exact untouched tuple and accounting/display data. Candidate settled task-member statistics corrected without launch.
- AC-005/008: injected SQL rollback, atomic-file failure, rename interruption, Org-index then Team-index interruption, retirement failure and referencing candidate failure/cycle. No false success, double count or data loss. Paired indexes/remaining metadata permit retry.
- AC-006: integrated isolated restore-to-event path; include real executable backend/provider route where feasible, distinguish mocks from real response. Reproduction fix cannot be certified only by SQL assertion.
- AC-007/008: migration-scoped fs spies/counters show zero standalone enumeration; allowed flat metadata reads only; no traces/archive/attachments/sidecars of excluded roots; no-candidate history writes0. Record file/byte counts and comparative isolated elapsed times without promising total startup latency. Separate current readiness scan remains out of measurement claim.
- Failure controls: wrong owner, mixed/inconsistent summary, unexpected root claimant, unsafe identity/path, invalid source metadata and family collision retain data/diagnose. Do not automatically reconstruct unsupported packages.

## Tradeoffs / risks
Metadata reads and per-root transactions are proportionate, but history candidates can still be large. Preserve source markers and dependency checks despite desire to minimize I/O. Three-field normalization deliberately does not add native Org group rows to statistics UI. No full startup speed guarantee because separate readiness validation still scans. Real outside-cohort reference behavior remains unproved; latest user-directed no-scan boundary is authoritative, with escalation if contrary supported evidence emerges. Prior development ledger reset/testing is operationally separate and must not be smuggled into shipped code. No guarantee of safe concurrently running old/new clients on one profile; stop writers for validation/cutover.

## Completion state
All design sections completed against SR-003. No implementation/test/result pass or local data repair claimed. Independent architecture review required for High risk; route determined by tool lookup, not hard-coded here. Escalations remain explicit; archived superseded tentative success-hook proposal is not part of DS-001.
