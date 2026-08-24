# Solution Revision Record — Universal Application Framework Latest-Personal Integration

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This file is only the chronological solution index.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request and isolated merge investigation / baseline | N/A | Initial Baseline | Design-ready semantic integration package prepared for architecture review |
| SR-002 | Architecture reviewer / `design-review-report.md` / `ARCH-REV-001` | AR-001–AR-003 | Design Impact | Exact lifecycle, activation/provisioning/construction, inventory, and launch direct-use contracts added; ready for re-review |
| SR-003 | Architecture reviewer / `design-review-report.md` / `ARCH-REV-002` | AR-001 | Design Impact | Required-tool readiness corrected to one source-backed Core-plus-six-server-unit owner with exact removal and proof inventory |
| SR-004 | Delivery engineer / `latest-base-refresh-conflict-report.md` / `DR-004` | Latest-base provider/model/error semantic conflicts | Design Impact | Newest Personal refresh mapped to retained owners with exact conflict, current-model, message-only error, no-migration, and verification contracts |
| SR-005 | Delivery engineer / `latest-base-refresh-round-2-conflict-report.md` / `DR-006` | Nested physical-scope, graph-local member boundary, and Team Agent memory migration | Design Impact | Five-commit refresh mapped to exact existing owners with combined conflict/overlap, isolated migration, and verification contracts |
| SR-006 | Implementation engineer / mandatory immediate re-fetch before SR-005 merge | Personal v1.4.56 provider/catalog/API-key architecture superseded reviewed target | Design Impact | Current five-conflict/ten-overlap merge and exact provider/model/credential/UI application adaptations designed; SR-005 physical-scope decisions preserved |
| SR-007 | Architecture reviewer / `design-review-report.md` / `ARCH-REV-006` | AR-004, AR-005 | Design Impact | Provider-granularity and snapshot-settled contracts corrected; runtime model cache removed in favor of fresh exact per-leaf resolution and credential-authority equivalence |

## Revision Entries

### SR-001 — Latest-Personal semantic integration baseline

- Triggering role, report path, and round: User request to rebuild the finalized feature on the dramatically refactored latest Personal branch; initial solution round.
- Triggering finding IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: Design-ready.
- Why this baseline is recorded: A real no-commit merge proved that the headline 177 conflicts contain a large mechanical derived-output class but also a bounded source/ownership seam that requires design before implementation.
- Resolution: Use one semantic merge on a latest-Personal-based ticket branch; retain Personal's current agent/team/provider lifecycle and identity, retain the feature's dual-host/application boundaries, adapt their construction through one concrete activation registry, remove/regenerate derived paths, and rerun complete proof.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-007; AC-001–AC-011.
- Canonical artifacts and sections updated: initial `requirements.md`, `investigation-notes.md`, `design-spec.md`, and this revision record.
- Supplemental artifacts added: `integration-strategy-analysis.md`, `merge-attempt.log`, `merge-conflict-inventory.txt`, `branch-overlap-inventory.txt`, `integration-path-inventory.txt`.
- Downstream and architecture-review impact: production integration remains blocked pending architecture review; no implementation handoff exists for this ticket.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: architecture must validate the exact activation/session/publication seam and proportionality; Personal must be refreshed again at delivery if it advances.

### SR-002 — Exact lifecycle, activation, and launch-persistence correction

- Triggering role, report path, and round: `/architecture_reviewer`; `design-review-report.md`; `ARCH-REV-001`.
- Triggering finding IDs: `AR-001`, `AR-002`, `AR-003`.
- Prior authoritative result: `Fail — Design Impact`.
- Current authoritative result: Design-ready correction prepared for architecture re-review; implementation remains blocked until review passes.
- Resolution:
  - allocated every current Personal and finalized-feature startup, readiness, recovery, background, failure-unwind, and stop phase across the Studio starter, standalone starter, host builders, and `ApplicationPlatformLifecycle`;
  - specified the current provisioning/activation construction DAG, exact claim/prepare/publish/abort/remove/stop result contracts, current candidate/metadata/provider/quarantine responsibilities, graph-local resource/session cleanup, every application constructor/factory obligation, and the named general-process exemptions;
  - corrected the target inventory to retain current Personal mixed configured/task registries, reject the feature-era active-only/member registries, include Personal-only current owners, and remove the competing Personal launch store/service;
  - selected `ApplicationLaunchOverrideStore` as the single physical owner and proved valid current Personal agent/team rows directly usable through a current-rooted sparse contract with no read-time rewrite, fallback, or migration.
- Approved behavior or requirement IDs affected: BEH-003–BEH-004; REQ-004–REQ-007; AC-005–AC-011. No approved behavior or scope changed.
- Canonical artifacts and sections updated: `requirements.md` functional/persisted-data precision; `investigation-notes.md` evidence/source/data findings; `design-spec.md` persisted decision, DS-002–DS-009, ownership/interfaces/file inventory/sequence; `integration-strategy-analysis.md`; `integration-path-inventory.txt`; this record.
- Supplemental artifact added: `integration-runtime-contracts.md` (normative exact seam contract).
- Downstream and architecture-review impact: the implementation engineer receives no handoff until this revision passes architecture review. When passed, implementation must consume the target inventory and supplement section 4 verification delta.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: the architecture reviewer must validate the exact state/result and store contracts; delivery must still refresh Personal if the remote advances.

### SR-003 — Source-backed required-tool readiness correction

- Triggering role, report path, and round: `/architecture_reviewer`; `design-review-report.md`; `ARCH-REV-002`.
- Triggering finding IDs: remaining bounded branch of `AR-001`.
- Prior authoritative result: `Fail — Design Impact`; `AR-002` and `AR-003` resolved, `AR-001` open only for required-tool identity/ownership/order/inventory.
- Current authoritative result: Design-ready bounded correction prepared for architecture re-review; implementation remains blocked until review passes.
- Resolution:
  - replaced the unsupported Skills label with the source-backed Core registrar as the seventh required unit;
  - assigned one memoized `AgentToolRegistryReadiness` path to lifecycle phase 16 with Core first, five independent server-owned units next, and provisioned Search last after vault readiness;
  - removed from the target every competing trigger: direct Studio Search registration, background/wrapper loading, Search-to-Core chaining, and `AgentFactory` registry mutation;
  - specified sticky failure/once semantics, exact ordered result keys, file dispositions, current-tree call-site assertions, and dedicated success/concurrency/order/failure/missing-export/no-retry tests;
  - expanded the target inventory with 109 Add/Adapt paths, 9 integration-only modifications, and 2 explicit retained dependencies (Core registrar and registry-pure AutoByteus default-factory edge).
- Approved behavior or requirement IDs affected: BEH-003, BEH-006; REQ-005–REQ-007; AC-007, AC-009, AC-011. No product behavior, host, route, persistence, migration, or tool capability changed.
- Canonical artifacts and sections updated: `requirements.md` REQ-005/AC-007; `investigation-notes.md` source/call-graph evidence and reviewer note; `design-spec.md` ownership/removal/file/sequence/proof mapping; `integration-strategy-analysis.md`; `integration-runtime-contracts.md` sections 1.2.1/1.5/4; `integration-path-inventory.txt`; this record.
- Downstream and architecture-review impact: implementation remains paused. On a Pass, implementation must perform the one semantic merge and apply the exact phase-16 clean-cut correction without restoring the removed wrapper or adding compatibility behavior.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: architecture must validate that the one owner, result set, order, and test inventory fully close `AR-001`; delivery must still refresh Personal if the remote advances.

### SR-004 — Newest-Personal provider/model/error refresh

- Triggering role, report path, and round: `/delivery_engineer`; `latest-base-refresh-conflict-report.md`; `DR-004` newest-base refresh.
- Triggering finding IDs: delivery classified the 11-path refresh as Design Impact; no architecture-review finding ID exists yet for this revision.
- Prior authoritative result: the completed integration at protected checkpoint `663f44d...` had passed architecture, implementation/source review, API/E2E, provider, package, and Electron verification. Delivery then fetched `origin/personal@1629441a3...`, 31 commits beyond the prior integrated base, and correctly stopped before a non-semantic merge. Before handoff, solution design revalidated current `origin/personal@7edfb1625...`; its one additional commit is delivery-document-only and leaves the exact 11-conflict semantic surface unchanged.
- Current authoritative result: Design-ready SR-004 correction prepared for architecture review; no refresh merge, production source edit, or Electron rebuild is authorized yet.
- Resolution:
  - retained the passed Studio/standalone/application-platform/run/session/publication architecture unchanged;
  - accepted newest Personal as authority for provider catalog/pricing/current AutoByteus membership, missing-key/provider error extraction/redaction, canonical native error metadata, and native consumers;
  - added one explicit stateless `ApplicationCurrentModelSelectionPolicy` design, constructed once and required by launch readiness, Save, and direct run validation, with only AutoByteus pairs delegated to `LLMFactory` and Claude/Codex ownership preserved;
  - specified stale read retention, exact `CURRENT_MODEL_SELECTION_REQUIRED` readiness, no-write Save rejection, and pre-allocation direct agent/team rejection;
  - combined the latest safe provider message with the existing closed v6 message-only application ERROR projection, strict metadata/secret exclusion, exact `agentRunId`/rooted identity, and current URL codec;
  - resolved all 11 conflicts plus two marker-free overlaps, keeping three retired configuration paths and two generated SDK declarations deleted;
  - preserved `Directly Usable — No Migration` and defined the focused plus complete refreshed verification matrix.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004–BEH-007; REQ-001–REQ-002, REQ-004–REQ-008; AC-001–AC-002, AC-005–AC-015. No new host, route, public metadata protocol, authentication, migration, or product workflow was added.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md`; `integration-strategy-analysis.md`; `integration-runtime-contracts.md`; `integration-path-inventory.txt`; this record.
- Supplemental artifact added: `latest-base-refresh-design-analysis.md`.
- Self-validation result: Passed. The SR-004 supplement records approved-behavior, reachability, spine-span, authoritative-boundary, proportionality, dependency, clean-cut removal, no-migration, host-parity, return-contract, construction-side-effect, naming, and verification checks plus eight reachable scenario closures.
- Evidence retained: delivery-owned `latest-base-refresh-conflict-report.md` and `evidence/delivery/dr-004-base-refresh-and-integration.log`, plus the four modified DR-004 delivery artifacts, remain untouched by solution design.
- Downstream and architecture-review impact: implementation and delivery remain paused. On an architecture Pass, implementation must merge the re-confirmed Personal ref once and follow the exact conflict/file/policy/error map; then the full source-review/API-E2E/durable-test/delivery chain restarts.
- Next recipient or routing: `/architecture_reviewer` with the cumulative solution package and DR-004 evidence.
- Remaining gaps or risks: Personal may move again before implementation; re-fetch must stop for re-analysis if the target changes. The final integrated provider/Electron proof depends on the existing environment and must be reported truthfully.

### SR-005 — Nested TeamRun physical-scope and memory-migration refresh

- Triggering role, report path, and round: `/delivery_engineer`; `latest-base-refresh-round-2-conflict-report.md`; `DR-006` newest-base refresh.
- Triggering finding IDs: delivery classified the three-path refresh as Design Impact; no architecture-review finding ID exists yet for this revision.
- Prior authoritative result: the SR-004 refresh was integrated, passed architecture/source/API-E2E/durable-test/delivery gates, and produced a working Electron build at protected checkpoint `a23849f...`. Delivery then fetched `origin/personal@a00f0d07d...`, five commits beyond integrated base `7edfb1625...`, and stopped after a non-mutating preview found three semantic conflicts.
- Current authoritative result: Design-ready SR-005 correction prepared for architecture review; no second-refresh merge, production edit, or Electron rebuild is authorized yet.
- Resolution:
  - accepted newest Personal as authority for immutable `TeamRunPhysicalScope`, root/child propagation, nested configured/task memory placement, nested history restart hydration, memory sync, settled historical-task navigation, and the registered Team Agent memory-layout migration;
  - retained the verified ticket as authority for the exact recursively injected application `AgentRunManager`, `AgentToolMcpSessionManager`, `AgentMemoryLocationService`, member-context/workspace family, prepared activation/platform binding, and scoped MCP cleanup;
  - resolved the production seam without a new service: `MixedAgentMemberHandle` uses `{...teamContext.physicalScope, agentRunId}` through the injected memory service and continues using the injected session manager's exact run revocation;
  - specified both conflicted test combinations and audited the three marker-free changed-both paths;
  - changed the persisted-data result from one blanket statement to a domain matrix: launch overrides and TeamRun V1 metadata remain direct; only affected old flat nested Team Agent memory is `Migration Required`; fresh/current/direct-root/standalone Agent data is unaffected;
  - allocated the migration to the existing shared startup runner after TeamRun V1 and before dependent snapshot migrations, with whole-directory rename, validation, explicit skip/warning/failure, ledger/retry semantics, and no runtime dual read;
  - defined proportional proof using newest Personal nested restart/migration coverage plus exact application dependency/activation/cleanup coverage and retained real dual-host/Electron proof, without inventing a maintained test-only application.
- Approved behavior or requirement IDs affected: BEH-001, BEH-003, BEH-005–BEH-008; REQ-001–REQ-002, REQ-004–REQ-009; AC-001–AC-002, AC-005, AC-008–AC-011, AC-015–AC-020. The user's explicit newest-Personal instruction approves adoption of current nested-team behavior; no new product surface was added.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md`; `integration-strategy-analysis.md`; `integration-runtime-contracts.md`; `integration-path-inventory.txt`; this record.
- Supplemental artifact added: `latest-base-refresh-round-2-design-analysis.md`.
- Self-validation result: Passed. The supplement validates production reachability, complete runtime/migration spines, owner reuse, exact dependency direction, isolated current-schema migration, no empty indirection/fallback, host parity, conflict/overlap completeness, and proportional proof.
- Evidence retained: delivery-owned `latest-base-refresh-round-2-conflict-report.md`, `evidence/delivery/dr-006-base-refresh-and-integration.log`, and the five modified DR-006 delivery records remain untouched by solution design.
- Downstream and architecture-review impact: implementation and delivery remain paused. On architecture Pass, implementation merges the confirmed Personal ref once and follows the exact three-conflict/six-overlap/runtime/migration map; the full source-review/API-E2E/durable-test/delivery chain restarts.
- Next recipient or routing: `/architecture_reviewer` with the cumulative solution package and DR-006 evidence.
- Remaining gaps or risks: Personal may move again before implementation/delivery; re-fetch must stop for re-analysis if the target changes. Final Electron/provider/environment proof must be reported truthfully.

### SR-006 — Personal v1.4.56 provider/catalog refresh

- Triggering role, report path, and round: `/implementation_engineer`; mandatory immediate re-fetch before implementing architecture-approved SR-005; no new report file was created by implementation because it stopped before merge/source edits.
- Triggering finding IDs: renewed latest-base Design Impact; current Personal ref `3ab4946c7e816787f782755de41077b0bb09d2e2` superseded reviewed `a00f0d07d...` and materially intersects application provider/model readiness owners.
- Prior authoritative result: SR-005 had passed architecture, but implementation had not begun. Protected checkpoint `a23849f...` and all upstream/downstream evidence remained intact.
- Current authoritative result: Design-ready SR-006 correction prepared for architecture review; no refresh merge, production edit, or Electron rebuild is authorized yet.
- Resolution:
  - re-measured exact current refs and a non-mutating merge: sixteen commits beyond integrated base, eleven beyond prior target, 256 latest-delta paths, five content conflicts, ten changed-both paths, clean index and unchanged protected HEAD; the final two commits after `91134347...` are delivery-record/evidence-only and do not change the production design;
  - preserved the one history-preserving semantic-merge strategy and every approved SR-005 physical-scope/migration decision;
  - accepted Personal v1.4.56 as authority for network-free provider descriptors/static catalogs, split credential/model snapshots, source-local dynamic lifecycle, exact selected-model availability, endpoint identity, GraphQL/Pinia contracts, media factory ownership, and deletion of aggregate/cached owners;
  - evolved the existing application current-model policy rather than adding a catalog: static AutoByteus identifiers use exact membership; canonical dynamic identifiers ensure only their parsed source through Personal's availability service then exact membership; removed static and dynamic-unavailable states remain distinct; Codex/Claude retain native ownership;
  - adapted credential readiness to the network-free exact credential setting and explicit serving-runtime mapping for API, custom OpenAI-compatible, AutoByteus gateway, Ollama, LM Studio, Codex, and Claude;
  - combined Personal's runtime snapshot/background missing-source ensure with the ticket's stored/inherited/optional-default runtime behavior in the shared Studio composable;
  - specified all five conflict outcomes, all ten overlap outcomes, exact Add/Modify/Remove proof inventory, direct-use provider/launch persistence, and complete provider + physical-scope + dual-host/Electron verification.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004–BEH-006, BEH-008–BEH-009; REQ-001–REQ-002, REQ-004–REQ-010; AC-001–AC-002, AC-005–AC-025. No new host, route, public SDK protocol, persistence schema, authentication product surface, or business workflow was added.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md`; `integration-strategy-analysis.md`; `integration-runtime-contracts.md`; `integration-path-inventory.txt`; `latest-base-refresh-round-2-design-analysis.md` status; this record.
- Supplemental artifact added: `latest-base-refresh-round-3-design-analysis.md`.
- Evidence added: `evidence/solution/latest-base-refresh-round-3-merge-preview.log`, `...conflict-inventory.txt`, `...overlap-inventory.txt`, and `...path-inventory.txt`.
- Self-validation result: Passed. The SR-006 supplement validates approved production reality, product reachability, complete model/credential/UI and retained execution spines, singular process/application ownership, no empty indirection/eager discovery/compatibility API, domain-specific data outcomes, host parity, failure semantics, and proportional proof.
- Downstream and architecture-review impact: implementation remains paused. On architecture Pass, implementation must re-fetch exact `3ab4946c7...`, stop again if moved, perform one semantic merge, resolve the five conflicts/audit ten overlaps, apply only the bounded application seams, and restart the complete source-review/API-E2E/durable-test/delivery chain.
- Next recipient or routing: `/architecture_reviewer` with the complete cumulative solution package and current evidence.
- Remaining gaps or risks: Personal may advance again before implementation/delivery; provider and Electron proof depend on the normal environment and must be reported truthfully.

### SR-007 — Provider-granularity, settled Studio state, and fresh per-leaf resolution

- Triggering role, report path, and round: `/architecture_reviewer`; `design-review-report.md`; `ARCH-REV-006` reviewing SR-006.
- Triggering finding IDs: `AR-004`, `AR-005`, grounded by `MP-ARCH-006-001`–`MP-ARCH-006-003`.
- Prior authoritative result: `Fail — Design Impact`. The then-current five-conflict/ten-overlap/256-path map, Personal provider/credential ownership, retired-owner removal, credential-mapping direction, sparse launch semantics, and all SR-005 physical-scope/migration decisions passed. Provider discovery breadth/UI settlement and multi-leaf model handoff did not.
- Current authoritative result: Design-ready SR-007 correction prepared for architecture re-review; implementation remains paused.
- Resolution:
  - corrected Personal discovery from nonexistent parsed-endpoint/source-only work to identifier -> provider ID -> provider-granularity ensure -> exact identifier/endpoint registration post-check; Ollama/LM Studio may enumerate configured hosts, AutoByteus settles LLM/audio/image provider work, and custom provider identity remains one endpoint record;
  - retained network-free static startup and selected-provider on-demand behavior without adding an endpoint-local application lifecycle or all-provider readiness gate;
  - specified that `ApplicationLaunchHostCapabilityValidator` removes `modelsByRuntime` and, after each leaf policy/ensure, immediately calls `listLlmModels(runtimeKind)`, exact-matches that leaf, and carries the fresh `ModelInfo` to credential resolution before advancing;
  - added an adapter-owned credential-authority union/equivalence key: provider ID, normalized Codex workspace, Claude process, or local no-credential serving runtime; unsupported authority is fail-closed and uncached;
  - corrected Studio convergence: Personal provider mutations own `ERROR`/`STALE_ERROR`; `ensureMissingDynamicProviders` normally fulfills through `Promise.allSettled`; the composable re-reads rows/source status after settlement and retains aggregate catch only defensively;
  - added exact durable proof for provider-granularity invocation, two leaves backed by distinct dynamic providers, fresh read order, correct credential authorities, no-upsert/no-allocation failure ordering, and store/composable settled stale/error retention;
  - re-fetched latest Personal at `c5b87df4d...` and proved the six commits after `3ab4946c7...` affect only an isolated 1,934-file non-workspace UI prototype plus eight prototype/API-key ticket or delivery paths; current inventory is 2,194 paths while the five conflicts, ten overlaps, and production design remain unchanged. The prototype is accepted byte-for-byte, outside root workspace membership and production imports.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004–BEH-005, BEH-009; REQ-001–REQ-002, REQ-005–REQ-006, REQ-008, REQ-010; UC-001–UC-002, UC-008, UC-014–UC-015; AC-001–AC-002, AC-021–AC-025. No new application-framework product behavior, host, route, persistence schema, public SDK contract, provider owner, or migration is introduced; the separate approved prototype is merely preserved from latest Personal.
- Canonical artifacts and sections updated: `requirements.md`; `investigation-notes.md`; `design-spec.md` DS-015/DS-016, ownership/dependency/interface/file/proof maps; `integration-strategy-analysis.md`; `integration-runtime-contracts.md` section 7; `integration-path-inventory.txt`; revised `latest-base-refresh-round-3-design-analysis.md`; this record.
- Supplemental artifact added: none; the existing SR-006 round-3 supplement remains the normative current-Personal integration artifact and is revised in place.
- Self-validation result: Passed. The corrected design follows current source owners and return contracts, covers both primary and return spines, eliminates the demonstrated stale cache, retains exact failure meanings, adds no empty indirection, preserves all host/data/execution behavior, isolates the unrelated prototype, and allocates proportional durable proof.
- Downstream and architecture-review impact: implementation remains paused. On architecture Pass, implementation must re-fetch exact `c5b87df4d...`, stop if moved, perform the one semantic merge, preserve the isolated prototype exactly, implement the bounded SR-007 seam corrections with the already-approved conflict/migration decisions, and restart the complete source-review/API-E2E/durable-test/delivery chain.
- Next recipient or routing: `/architecture_reviewer` with the full cumulative package, `ARCH-REV-006`, and current evidence.
- Remaining gaps or risks: Personal may advance before implementation/delivery; real provider and Electron proof remains environment-dependent and must be reported truthfully.
