# Use-Case Spine And Design-Principles Validation

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`.
- Purpose: re-derive the target architecture from every approved use case, validate complete data-flow spans and ownership, apply the product-reachability gate, and retain/remove proposed data attributes according to actual spine needs.
- Scope: UC-001 through UC-020; REQ-001 through REQ-021; AC-001 through AC-021.
- Status: `Refined — Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required`.
- Approval applicability: `Required`; the importer/no-automatic-update/`repository_prisma@1.0.8` decisions and external Codex preservation remain approved. The user confirmed the original dual-key Gemini metadata path works. CR-021 therefore corrects the artifacts only: LLM/media keep exact SDK-mode variants, while metadata keeps exact Store consumer selection followed by the established key-based Generative Language provider and curated fallback.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [secret-storage-architecture.md](./secret-storage-architecture.md), [secret-storage-backend-contract.md](./secret-storage-backend-contract.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md), [repository-prisma-1.0.8-assessment.md](./repository-prisma-1.0.8-assessment.md).

## Validation Method

The audit applies the shared design principles in this order:

1. start from each approved use case and its supported/current or approved target trigger;
2. draw a primary spine from initiating surface through the authoritative owner and critical dependency to the meaningful outcome;
3. add return/event and bounded-local spines where they materially shape behavior;
4. assign concrete ownership to every main-line node and move lookup, mapping, validation, redaction, persistence, and translation off the main line unless they own sequencing;
5. apply the authoritative-boundary rule so callers cannot depend on both an outer service and its backend/repository;
6. apply the product-reachability gate to every proposed field, state, failure, and recovery mechanism;
7. retain only data attributes consumed or produced on a verified spine, an approved security/operational contract, or the explicit operator import boundary;
8. derive interfaces and files after the spine and ownership decisions.

## Second Design-Principles Audit (2026-07-21)

The user requested a second, explicit audit before architecture re-review. The audit re-read the canonical design principles rather than relying on the first pass and checked all 17 use cases, the 24 inventoried spines, every proposed shared structure, and the final file mapping.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass | UC-001–UC-016 retain the approved basis; the user selected and authorized re-review of UC-017's exact `cli` and `managed-secret` behavior |
| use-case spine completeness | Pass | UC-001–UC-017 each has at least one full initiating-surface-to-outcome path; UC-002 and UC-008 have separate business paths rather than one compressed generic path |
| span sufficiency | Pass | every primary path includes the initiating surface, orchestration, authoritative boundary, critical custody/provider mechanism, and meaningful result; return and bounded-local paths supplement rather than replace it |
| ownership and authoritative boundaries | Pass | subject services use `SecretManagementService`; only backend implementations access custody; Claude session/catalog callers use `ClaudeSdkClient` and cannot reach authentication or storage internals |
| off-spine placement | Pass after refinement | UC-008 composite management/backend nodes were split; UC-008 and UC-013 now state their owners explicitly; catalog, repository, redaction, path composition, and legacy-source exclusion remain attached to named owners |
| data tightness | Pass after refinement | status shapes are discriminated so non-ready health cannot coexist with definition state; unused `definitionId`, `messageCode`, and `retryable` status fields are removed |
| reuse without generalization | Pass | one management boundary, backend port, secret-safe value, LLM construction contract, launch policy, conformance suite, and live manifest are reused; provider/search/media/metadata/Claude behavior remains specialized |
| shared-base overreach | Pass | no generic runtime option bag, generic provider provisioning service, generic Store selector/profile, vendor-placeholder configuration, or caller-visible physical address is introduced |
| persisted-data transition | Pass after AR-009 correction | approved non-secret settings are directly usable through name-first projection; legacy credential authority and custom-provider-v1 are `Discard or Rebuild`; sources remain untouched and no migration owner exists |
| clean-cut removal | Pass | environment readers, plaintext fields, cross-Store copy/fallback, Claude ambient modes/caller env, compatibility wrappers, daemon/IPC, and profile machinery are explicitly removed |
| folder and file proportionality | Pass | files follow concrete owners; Local crypto/repository/initialization split reflects distinct persistence responsibilities without creating another process or executable package |
| product reachability | Pass | retained failures and controls have supported operational/security witnesses; speculative tenancy/profile/CAS/hot-swap/vendor behavior remains excluded |

No further subsystem, coordinator, compatibility layer, profile abstraction, runtime configuration bag, or backend-specific resolver is justified. The refinements above reduce, rather than expand, the implementation surface.

## Third Design-Principles Audit — CR-001 Revision (2026-07-21)

Source review exposed one missing supported production path: the base factories discover and construct remote LLM/audio/image models through AutoByteus hosts using `AUTOBYTEUS_API_KEY`. The initial implementation removed the factory reload/discovery calls while changing provider constructors, which removed supported behavior rather than only changing custody. The user explicitly required that this functionality remain and that only key provisioning change.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass after revision | BEH-013/UC-018 now preserve the supported Settings -> remote discovery -> catalog -> construction/invocation path; the environment alias is replaced only as the credential source |
| complete spine inventory | Pass after revision | four UC-018 paths cover Settings lifecycle/reload, host-gated discovery including the no-host branch, discovered-model construction, and fresh-worktree real evidence; the inventory now has 28 active spines: 24 use-case paths, two return/event spines, and two bounded-local spines |
| span sufficiency | Pass | each UC-018 primary path begins at its supported trigger and reaches catalog state or a real remote provider result rather than stopping at key resolution |
| ownership / no bypass | Pass | `AutobyteusRemoteModelDiscoveryService` owns typed refresh sequencing and calls `SecretManagementService`; registries and provider wrappers remain behind their existing owners; no caller opens custody or resolves a definition ID |
| data tightness | Pass after revision | one `provider.autobyteus.api-key` definition is shared; distinct semantic consumer identities authorize use; one non-secret `credentialProviderId` distinguishes credential owner from displayed model provider without copying authentication or backend data into model metadata |
| reuse without redundant code | Pass | one typed remote discovery service handles LLM/audio/image refresh policy; generic LLM/media provisioning uses `credentialProviderId`; there is no AutoByteus branch in secret management, no provider-specific resolver, and no three parallel coordinators |
| catalog integrity | Pass | successful replacement is scoped by model kind plus `runtimeProviderId = AUTOBYTEUS`; native same-provider models remain; authoritative empty success clears only that subset; pre-authoritative failure preserves last-known-good |
| persisted-data transition | Pass | `AUTOBYTEUS_API_KEY` is present only in the positive explicit-import registry and the separate non-secret exclusion boundary; current catalog/runtime never retains or reads it, and startup leaves its source unchanged |
| product reachability | Pass | existing Settings surfaces, host configuration, factory reload calls, registries, and provider wrappers are concrete production witnesses; the corrected design adds no speculative gateway behavior |
| proportional local rework | Pass | CR-002–CR-005 remain bounded implementation/packaging fixes: actual CLI account-state mapping, additive stdio MCP env composition over a sanitized base, idempotent custom-provider delete, and accurate managed-only handoff wording |

This audit does not add a second credential lifecycle or new endpoint UI. It restores the existing gateway path through the same management boundary and keeps every earlier approved spine intact.

## AR-008 Bounded Target-Shape Revalidation (2026-07-21)

Round 5 found that one concrete example bypassed the otherwise authoritative credential-owner design by reading `target.providerId`. The correction applies the shared-structure tightness and authoritative-boundary principles:

| Check | Result | Correction |
| --- | --- | --- |
| semantic tightness | Pass after correction | `LLMConstructionTarget` contains exactly required `credentialProviderId` plus `LLMAuthenticationRequirement`; displayed/creator provider is absent |
| singular attribute meaning | Pass | `credentialProviderId` means credential owner only; `providerId` remains display/creator identity only on the authoritative model |
| no redundant representation | Pass after correction | credential slot exists only inside the tagged authentication requirement, not as a parallel top-level target field |
| boundary derivation | Pass | registration materializes credential owner; `describeConstructionTarget` returns it; provisioning constructs the semantic consumer from it; no caller re-derives ownership |
| product-path preservation | Pass | DS-UC007 and DS-UC018C are unchanged except that their previously stated credential-owner invariant is now enforced by the target shape and example |
| requirement impact | None | BEH-013/REQ-019/AC-019 and all other approved behavior remain unchanged; AR-008 is bounded design impact |

No new coordinator, resolver, fallback, model field, or compatibility path is introduced.

## Fourth Design-Principles Audit — Explicit Local Import Revision (2026-07-22)

The user explicitly approved one committed PNPM/TypeScript command to migrate recognized current variables from an operator-selected absolute file—regardless of filename or extension—into either the canonical host default Local Store or the physically separate host real-E2E Local Store. Only selected credential assignments use the strict value grammar; unrelated lines are ignored. The audit treats this as local product/operator functionality, not test-runner behavior; custom-data-directory, Docker, Kubernetes, remote, and enterprise Stores keep their existing provisioning surfaces.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass; user approved 2026-07-22 and later tightened the parser boundary | the initiating trigger is an explicit operator command; neither startup nor tests can invoke it; filename flexibility changes no trust boundary because only positively recognized credential assignments are parsed |
| complete spine inventory | Pass after revision | DS-UC019A/B/C cover dry-run, confirmed default import, and confirmed E2E import; DS-LOC003 covers selected parse/plan/atomic commit inside the owner. At this revision point the package had 32 active spines; UC-020 later raised the cumulative total to 33 without changing these importer spines |
| span sufficiency | Pass | every UC-019 path starts at PNPM, crosses source trust/parser/mapping and selected Store state, and ends at a value-free preview or committed Store consequence |
| ownership / no bypass | Pass | `LocalEnvironmentSecretImportService` owns transition policy; the CLI is thin; an internal Local setup batch owns persistence; neither runtime management nor the generic backend port gains a bulk API |
| reuse without duplication | Pass after final refinement | one immutable positive registry owns only current explicit-import eligibility; non-secret projection may reuse its alias-name view while retaining its separate broader exclusion responsibility. The Local repository gains one setup-only batch instead of a second persistence implementation |
| data tightness | Pass | request is exactly absolute source, closed `default\|e2e` target, dry-run, overwrite; outward plan/result contains definition IDs/actions/counts/codes only. No Store path, definition/value input, environment bag, backend descriptor, removal flag, or implicit selector exists |
| source/target isolation | Pass | source is required/absolute and verified without mutation; any filename/extension is accepted under one strict content grammar; target role resolves internally to one canonical Store pair; no target path or other-Store read/fallback exists |
| safety and failure atomicity | Pass | complete validation precedes prompt; dry-run never initializes; confirmed execution may stage-create a both-absent selected pair; default is skip; replacement needs `--overwrite`; every record write needs exact target-specific direct-TTY confirmation and one SQLite transaction |
| persisted-data transition | Pass for UC-019 | UC-019 is an explicit operator transformation from a retained plaintext assignment source into current encrypted records and never mutates that operator source. Startup performs no legacy credential update. |
| honest assurance | Pass | values necessarily exist in trusted process memory; outward channels are prohibited and owned buffers are minimized/cleared best-effort, but JavaScript/runtime zeroization is not claimed |
| product reachability | Pass for UC-019 | the user explicitly requested default and E2E targets; arbitrary paths/definitions, cross-Store copy, removal, and noninteractive bypass remain unsupported. UC-019 itself is never automatic. |

The importer adds one bounded owner, not a generic secret-management feature. It preserves the existing service-over-backend runtime architecture and the physical default/E2E separation.

## Fifth Design-Principles Audit — AR-009 No-Automatic-Update Decision (2026-07-22)

AR-009 established that released application `.env` and custom-provider-v1 credentials are reachable installed data. A correct automatic value-preservation design would require a separate pre-config owner, Store batch, source-ordering ledger, and interruption recovery because the general app-data runner executes too late and continues after failures. After reviewing that cost, the user explicitly rejected every automatic legacy update—including the existing scrub/rewrite path—and selected untouched, non-authoritative sources plus explicit provisioning/import.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass | legacy files and parent aliases remain byte-for-byte/operator-owned; approved non-secret application settings remain usable; custom-provider-v1 is not preserved as current metadata and requires explicit rebuild |
| complete spine inventory | Pass | no new use case or automatic-upgrade phase spine is needed; the active inventory returns to 32 spines—27 use-case paths, two return/event spines, three bounded-local spines |
| proportionality | Pass after simplification | remove the existing updater/call/ledger; add no pre-config Store owner, automatic source parser, mutation, or app-data framework extension |
| authoritative boundaries | Pass | `AppConfig` owns non-secret name-first projection; the current provider store owns v2-only reading/value-free v1 guidance; UI/Settings, hidden input, and UC-019 own explicit provisioning; runtime consumers use Store custody only |
| data tightness | Pass | there is no automatic source/target/phase/request or cutover record; explicit import retains only the current positive alias registry, while the non-secret projection retains only its read-boundary exclusion policy |
| persisted-data transition | Pass | approved non-secret settings are `Directly Usable — No Migration`; credential authority/custom-provider-v1 are `Discard or Rebuild`; no source is rewritten or deleted |
| product reachability | Pass | installed legacy sources are real, but explicit importer/UI reconfiguration and operator cleanup are the approved actions; no automatic recovery machinery is justified |
| clean-cut runtime | Pass | credential aliases are excluded before retention, custom v1 is not decoded into current metadata, no fallback remains, and startup never invokes the importer or mutates a legacy source |

This decision keeps the earlier explicit importer intact and does not weaken its source/target/TTY/atomicity controls.

## Sixth Design-Principles Audit — `repository_prisma@1.0.8` Clean Replacement (2026-07-22)

The corrected request is an update of the separately packaged `repository_prisma` dependency, not Prisma ORM. Exact primary-package evidence shows that latest `1.0.8` keeps the `@prisma/client:^5.22.0` peer, removes package-owned dotenv loading, and provides default-off/explicit-opt-in query logging upstream. The user approved latest `1.0.8` and explicitly prohibited legacy code. The design therefore treats UC-020 as one clean package-integration replacement, not a database-owner refactor.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass | the server manifest, lock, obsolete exact patch, and focused policy test are supported install/build surfaces; current production source does not import `repository_prisma`; the user selected exact verified `1.0.8` |
| complete spine inventory | Pass | DS-UC020 spans approved latest-version request, manifest, attested artifact, obsolete patch removal, static/dynamic import/log checks, clean install, build/restart regressions, and sanitized evidence; at this historical revision point the package had 33 active spines: 28 use-case paths, two return/event spines, three bounded-local spines |
| span sufficiency | Pass | the spine starts at approved dependency selection and reaches meaningful clean-install/build/runtime-regression evidence rather than stopping at a manifest edit |
| ownership / no bypass | Pass | package/dependency integration owns manifest/lock/removal/evidence; AppConfig/configured-client and bounded lazy Prisma owners remain authoritative and are not bypassed or replaced |
| off-spine placement | Pass | npm provenance, exact-byte inspection, isolated import/log instrumentation, and evidence sanitization serve package integration; they do not become runtime services |
| data tightness | Pass | no runtime DTO, datasource option, owner selector, schema field, or migration record is introduced; only package identity, removal, and value-free outcomes change |
| reuse without redundant code | Pass | one existing focused policy test is strengthened for both exact entrypoints; no package wrapper, duplicate lifecycle, or replacement patch is added |
| persisted-data transition | Pass | `Not Affected`: Prisma/client stay `5.22.0`, schemas/migrations do not change, package is not adopted in production, and application SQLite/Local Store data are untouched |
| clean-cut removal | Pass | obsolete `1.0.6` lock resolution, patch key, and patch file are removed; no `1.0.7` path or new patch remains; no dual version, wrapper, or fallback exists |
| security policy | Pass | both exact `1.0.8` entrypoints are dotenv-free and default query logging off; empty-cwd/empty-base synthetic probes make these upstream properties executable regression contracts |
| product reachability | Pass | clean/frozen installation, package import, production build, and CR-009–CR-014 restart/reopen regressions are normal repository contracts; Prisma ORM migration or owner replacement is outside the approved request |

No new secret-management node, database abstraction, production package adoption, local dependency patch, schema migration, compatibility wrapper, dual path, or fallback is justified.

## Seventh Design-Principles Audit — Recognize-First Mixed-Source Import (2026-07-22)

The user required the importer to care only about current AutoByteus credentials. API/E2E proved that the first implementation violated that subject boundary by validating unrelated names and leaking the PNPM separator into domain option parsing. This audit re-ran the spine, ownership, tightness, reuse, and no-legacy checks without adding a use case or owner.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior / production reality | Pass after revision | the supported operator selects the current application `.env` by absolute path; name-only evidence proves it contains recognized aliases plus unrelated/legacy content and that the old whole-file classifier blocks it |
| complete spine inventory | Pass | DS-UC019A/B/C and DS-LOC003 remain the same four paths; at this historical revision point the package had 33 active spines: 28 use-case paths, two return/event spines, three bounded-local spines |
| span sufficiency | Pass | each importer primary spine begins at PNPM, normalizes adapter syntax, crosses file trust and recognize-first selection, reaches the selected Store plan, and ends in value-free preview or atomic Store consequence |
| ownership / no bypass | Pass after revision | CLI owns one optional separator; source reader owns file safety plus positive selection; the existing import service owns plan/confirmation; Local setup owns transaction. Unknown-content validation belongs to none of them and is removed |
| separation / reuse | Pass | one positive registry owns import eligibility; each definition has one current supported source name. No negative classifier, second mapping, generic dotenv parser, ignored-line DTO, new service, or ZHIPU compatibility survives |
| data tightness | Pass | outward plan/result carries only selected definition/action data; ignored-line metadata and values are absent. The registry carries definition ID plus one source spelling per current definition only |
| fail-closed proportionality | Superseded only for normalized-empty selected values | file identity/permissions/race/size/UTF-8/NUL, selected alias syntax/populated duplicates/dynamic values, zero selected definitions, target health, confirmation, plan drift, transaction, and leak controls remain fail-closed; unrelated lines are deliberately ignored. The eighth audit records the later user-approved empty-as-absent correction |
| product reachability | Pass | current app `.env` direct import is user-approved and executable; legacy ZHIPU preservation and arbitrary whole-file validation are not product requirements and cannot drive compatibility machinery |
| no legacy / removal | Pass after AR-012 correction | remove `IMPORT_SOURCE_UNSUPPORTED_SECRET_ALIAS`, negative name patterns, and any ZHIPU mapping. Keep `DASHSCOPE_API_KEY` as the only Qwen mapping and `QWEN_API_KEY` unmapped. Rename the shared domain file to `local-environment-secret-import.ts`, the service to `local-environment-secret-import-service.ts`, and the registry to `local-import-credential-alias-registry.ts`; update every production/test import and retain no old file, wrapper, or compatibility re-export |
| dependency / other behavior | Pass | AR-011 correction, exact unpatched 1.0.8, Store/runtime/Docker/Claude/AutoByteus/no-automatic-update decisions remain unchanged |

## Eighth Design-Principles Audit — Empty Recognized Assignment As Absence (2026-07-22)

Round-9 API/E2E proved a reachable ordinary input: the explicitly selected current application `.env` uses populated `VERTEX_AI_API_KEY` while retaining an empty `GEMINI_API_KEY` placeholder. Whole-import rejection is disproportionate because the empty entry has no credential to import and does not conflict with the independently populated Vertex definition. The user explicitly approved treating empty recognized assignments as absent.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior / production reality | Pass after revision | the real selected source reached the recognize-first reader and failed only at `IMPORT_SOURCE_EMPTY_CREDENTIAL`; user confirmed empty provider placeholders are ordinary when another supported authentication mode is used |
| complete spine inventory | Pass unchanged for this bounded correction | DS-UC019A/B/C and DS-LOC003 still cover preview/default/E2E/batch; no new use case, owner, return spine, or local loop is introduced; the inventory at this historical revision point was 33 spines |
| span sufficiency | Pass | each primary path still begins at PNPM, crosses source trust/selection and selected-target planning, and ends at preview or atomic Store consequence; empty normalization is bounded inside the reader node |
| ownership / authoritative boundary | Pass | `LocalEnvironmentSourceReader` already owns selected assignment parsing; it converts valid empty parsed values to no selected record before handing populated credentials to `LocalEnvironmentSecretImportService` |
| data tightness | Pass | no `isEmpty`, ignored-placeholder, warning, reason, value-state, or alias-fallback field is added. Absence is represented by absence; `IMPORT_SOURCE_EMPTY_CREDENTIAL` is removed |
| reuse / redundancy | Pass | existing parser normalization and selected array are reused; no second parser, provider-mode policy, fallback map, service, or DTO is added |
| failure proportionality | Pass | malformed recognized syntax, dynamic populated values, two populated duplicate occurrences, file trust, mapping, target, TTY, plan drift, transaction, and leak controls remain fail-closed. Empty-only/absent sources return existing `IMPORT_NO_MAPPED_CREDENTIALS` |
| provider separation | Pass | empty `GEMINI_API_KEY` does not choose Vertex; the importer simply selects the independently populated `VERTEX_AI_API_KEY`. Authentication mode remains non-secret configuration outside importer responsibility |
| no legacy / non-responsibility | Pass | exact positive aliases, DASHSCOPE-only Qwen, unmapped QWEN/ZHIPU, unrecognized-line ignoring, no automatic update, and AR-012 current filenames/import edges remain unchanged |

The target is the smallest owner-correct change: parse a recognized assignment, normalize its value, skip it when empty, and otherwise apply the existing populated-value checks. Empty occurrences do not enter duplicate state; one populated occurrence remains selectable, while two populated occurrences reject. This follows separation of concerns and uses absence rather than creating redundant state.

## Ninth Design-Principles Audit — External Codex Preservation And Exact Gemini Modes (2026-07-22)

Code review round 23 supplied two complete production witnesses. Codex remains user-selectable, but ticket-owned generic child hardening replaced its pre-ticket `options.env ?? process.env` and real HOME/CODEX_HOME with a synthetic home, making existing `codex login` state unavailable. Separately, both Gemini provisioning owners resolve the correct Vertex Express definition but collapse it into generic `apiKey`, so the shared helper constructs the wrong Google SDK mode. The user directed that Codex authentication be left alone.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass after revision | Codex external login is existing supported behavior and is preserved as one path; Gemini AI Studio, Vertex Express, and Vertex Project behavior was already approved and must remain exact |
| complete spine inventory | Pass after revision | The UC-014 design spine is split into DS-UC014A for governed launcher hardening and DS-UC014B for the established external Codex path; the cumulative inventory is 34 spines. DS-UC007 and DS-UC008A/B/C already span Gemini LLM/media and now carry exact mode variants |
| span sufficiency | Pass | Codex spans runtime selection, manager/client, external process, Codex-owned account state, and result/failure; Gemini spans request, explicit mode/credential resolution, factory/helper, exact SDK construction, provider, and result |
| ownership / no bypass | Pass | `CodexAppServerClient` remains the single launch owner and never calls management/account RPC; existing LLM/media provisioning own mode selection and `gemini-helper.ts` owns SDK construction |
| data tightness | Pass after correction | one closed shared union distinguishes generic API key, `geminiAiStudio`, `geminiVertexExpress`, `geminiVertexProject`, and none; no optional mode field, duplicate provider selector, or loose Google base shape remains |
| reuse without redundant code | Pass | LLM and media reuse the same tight variants; no Google resolver/service or Codex auth service/UI/status/rotation owner is introduced |
| assurance honesty | Pass | Codex preserves inherited operator state and is explicitly outside the `LOCAL_HARDENED` child-environment guarantee; the rest of the tier is not widened or overstated |
| clean-cut removal | Pass | remove the ticket-added Codex child-environment helper use rather than retaining two modes; replace loose Gemini variants with no compatibility alias/fallback |
| product reachability | Pass | user-selectable Codex and real Vertex Express LLM/media failures are supported paths; no alternate endpoint/account mode is inferred |
| persisted data | Not Affected | no Store/schema/account-state rewrite or migration occurs; existing Codex state remains Codex-owned and is merely reachable through the restored launch environment/home |

The correction follows the authoritative-boundary and shared-structure-tightness principles: one Codex owner/path is restored, and one shared authentication union carries exactly the semantics its existing consumers require.

## Tenth Design-Principles Audit — Original Gemini Metadata Preservation (2026-07-22)

Code review round 24 correctly traced a third reachable Gemini consumer family but incorrectly inferred that its established endpoint must be replaced. Direct comparison with `origin/personal` shows two intentionally different contracts. LLM/media construct exact Google SDK modes: Vertex Express uses `{ vertexai: true, apiKey }`, Vertex Project uses `{ vertexai: true, project, location }`, and AI Studio uses `{ apiKey }`. Metadata selects `GEMINI_API_KEY ?? VERTEX_AI_API_KEY`, calls the Generative Language models endpoint, maps its response, and lets `ModelMetadataResolver` merge live fields over curated data. The user confirms this dual-key metadata path works. Current source preserves the same behavior while replacing ambient lookup with exact Store consumers. CR-021 is therefore an artifact-only reconciliation, not authority for metadata source rework.

| Audit Dimension | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior and production reality | Pass after correction | web model list/reload is supported; direct original-branch comparison and user confirmation establish the dual-key Generative Language metadata path as working behavior, separately from exact LLM/media SDK construction |
| complete spine inventory | Pass unchanged | DS-UC008C already spans web list/reload through GraphQL, catalog, explicit setup-mode selection, exact semantic consumer or no-provider branch, existing provider request/mapping, resolver merge, and returned catalog; the cumulative total remains 34 |
| span sufficiency | Pass after correction | DS-UC008C exposes the complete selected-consumer-to-provider-to-merge path without inventing a metadata SDK-mode branch or stopping at secret resolution |
| ownership / no bypass | Pass | existing `ModelMetadataProvisioningService` owns mode/config/credential selection, `SecretManagementService` remains the only secret resolver, `GeminiModelMetadataProvider` owns provider request/mapping, and `ModelMetadataResolver` owns live-over-curated merge/failure containment |
| data tightness | Pass after correction | LLM/media retain their closed exact-mode variants; metadata receives only the one selected revealed key at its existing trusted construction boundary. A metadata SDK-mode union or optional Google-options bag would add data no accepted metadata spine consumes |
| reuse without redundant code | Pass | the existing LLM/media helper remains the sole exhaustive SDK-construction boundary for those subjects; the existing metadata provider remains the sole request/mapping owner for its distinct contract. No new provider, adapter, endpoint selector, or duplicate mode switch is added |
| authoritative boundary | Pass | server provisioning selects the exact metadata consumer and reveals only that value to the existing provider; metadata code does not reach Store management, read environment aliases, retry another definition, or infer a different credential source |
| fallback semantics | Pass after clarification | curated metadata remains an availability fallback for absent/failed live enrichment; it is never an authentication mode, credential source, alternate-definition retry, or proof of successful live enrichment |
| product reachability | Pass | the supported Settings/model list/reload path proves the metadata spine is reachable; the rejected premise that the established endpoint is necessarily defective is not reachable after direct original-branch evidence and user confirmation |
| persisted data / migration | Not Affected | no Store schema, definition, binding, model record, setup-mode persistence, or migration changes; only ephemeral construction data remains exact for one existing consumer family |

This is a bounded artifact correction, not a shared-structure or metadata subsystem change. It preserves exact LLM/media SDK modes, exact Store-backed metadata consumer selection, the existing dual-key Generative Language request/mapping, and curated fallback. Vertex Project continues to create no live metadata provider and performs zero metadata secret lookup.

## Audit Verdict

The central architecture remains coherent after the round-1 requirement-gap tightening:

```text
subject-specific caller/service
  -> SecretManagementService
  -> one physical-location/namespace-bound SecretStorageBackend
  -> selected custody implementation
```

The audit found and removed speculative structure that did not have an approved product path:

- generic `organizationId`, `deploymentId`, `environmentId`, `nodeId`, and `sharing` fields;
- caller-visible `SecretScope`, `scopePath`, and generic physical backend address fields;
- a Local Store `connectionName`/alias and caller Store selector: trusted startup supplies exact paths, while runtime callers remain Store-agnostic;
- expected-version/CAS input on ordinary Settings lifecycle operations;
- separate management `create` versus `replace` commands: the supported Settings journey is one save action, so the target uses atomic save (create-or-replace);
- runtime `ResolvedSecret.version` and `resolvedAt` attributes plus the unrequired global client-cache design;
- duplicated status attributes such as `version`, `updatedAt`, `backendKind`, and generic migration flags;
- every cross-Store copy method and source/default Store dependency from hidden-input setup and runtime; UC-019 instead reads one explicit trusted plaintext source and writes exactly one internally selected Store without opening another Store;
- overlapping `writable` and `externallyManaged` booleans; one tagged lifecycle capability replaces them;
- `requestedAssuranceTier` as configuration; assurance is derived from verified controls, not requested by a config value;
- legacy aliases and provider validation policy from the current runtime catalog; aliases stay exclusion/import-policy-owned and validation stays subject-owned.
- duplicate resolution input (`consumer identity` plus expected definition ID) and a pass-through binding resolver; `SecretManagementService` now owns catalog lookup and backend resolution behind one entrypoint.
- a Local Store daemon/launcher/IPC protocol: the same-user boundary did not add meaningful isolation and the server already owns backend lifecycle;
- arbitrary named profiles and their table/identity/lifecycle: the approved default and real-E2E contexts use physically separate databases and keys instead.
- concrete enterprise adapter classes/configuration discriminants: first delivery registers Local only in product and InMemory in tests; the extension contract remains without placeholder implementations.
- Claude-specific resolution APIs, ambient `auto`/raw `api-key` selection, caller-provided SDK environments, and settings/tool paths that could propagate a managed child credential. The exact managed Claude runtime consumer instead reuses the existing generic management boundary.

## Complete Use-Case Spine Inventory

| Spine ID | Use Case | Scope | Start | Meaningful End | Governing Owner | Span Check |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-UC001` | UC-001 built-in provider lifecycle | Primary End-to-End | direct/Electron Settings | stored/removed credential status in selected backend location | `LlmProviderService` for use case; `SecretManagementService` for lifecycle | Pass — UI, transport, subject owner, authoritative boundary, custody, return state |
| `DS-UC002A` | UC-002 custom provider create | Primary End-to-End | custom-provider editor | metadata-only provider and credential-backed model catalog | `LlmProviderService` | Pass — probe, identity allocation, metadata/secret transaction, runtime sync, UI result |
| `DS-UC002B` | UC-002 custom provider delete | Primary End-to-End | delete action | provider and derived credential absent; catalog refreshed | `LlmProviderService` | Pass |
| `DS-UC003` | UC-003 backend configuration | Primary End-to-End | deployment/startup or Settings config | active startup backend or validated saved configuration with restart-required status | `SecretStorageConfigurationService` | Pass |
| `DS-UC004` | UC-004 local backend bootstrap | Primary End-to-End | Electron/direct/normal Docker/single Kubernetes server Pod/test server start | management/provisioning services ready with in-process Store-bound Local backend | server bootstrap composer | Pass |
| `DS-UC005` | UC-005 physical Local Store lifecycle | Primary End-to-End | writable initialization or read-only open | pair verifier authenticated and Store ready, or exact value-free health failure | `LocalSecretStorageBackend` | Pass |
| `DS-UC006A` | UC-006 direct real-E2E Store provision | Primary End-to-End | trusted hidden input | encrypted E2E record and value-free status | `LocalSecretStoreProvisioningService` | Pass |
| `DS-UC007` | UC-007 LLM construction/invocation | Primary End-to-End | agent/run LLM request | provider response/stream returned to run | `LLMProvisioningService` until construction; concrete LLM for request | Pass |
| `DS-UC008A` | UC-008 search | Primary End-to-End | Search tool invocation | normalized real search result | `SearchProvisioningService` / injected executor | Pass |
| `DS-UC008B` | UC-008 media | Primary End-to-End | media generation service/tool | provider-produced media result | `MediaClientProvisioningService` | Pass |
| `DS-UC008C` | UC-008 live metadata | Primary End-to-End | web model list/reload | selected AI Studio-or-Vertex-key live metadata merged into and returned from the catalog, or curated-only availability | `ModelMetadataProvisioningService` for selection/construction; `GeminiModelMetadataProvider` for request/mapping; `ModelMetadataResolver` for merge | Pass — surface, GraphQL, catalog, exact consumer/no-provider branch, established request/mapping, merge, returned result |
| `DS-UC009` | UC-009 deterministic testing | Primary Operational | default test command | deterministic assertions and sanitized artifacts | package test harness | Pass |
| `DS-UC010` | UC-010 real-provider host-worktree testing | Primary Operational | real test command in fresh host worktree | sanitized evidence from real provider behavior | live E2E harness | Pass |
| `DS-UC011` | UC-011 Local backend concurrency/reset | Bounded Local / Startup | backend open or explicit exact-Store reset | ready in-process handle or one Store deleted safely | `LocalSecretStorageBackend` / exact-Store reset owner | Pass — bounded local spine supplements UC-004/UC-010 |
| `DS-UC012` | UC-012 container deployment/extension | Primary End-to-End | Docker/single-Pod startup or future kind configuration | node-local Local Store ready, or unregistered kind rejected without fallback | server deployment composition | Pass |
| `DS-UC013` | UC-013 capability-aware Settings | Primary End-to-End | Settings opens backend/provider state | lifecycle controls enabled or deployment guidance displayed | `SecretStorageConfigurationService` for backend capability projection | Pass |
| `DS-UC014A` | UC-014 governed first-delivery agent hardening | Primary End-to-End | governed agent/application-worker run provisioning | sanitized result plus verified `LOCAL_HARDENED` state | `AgentExecutionSecurityContext` and launcher | Pass |
| `DS-UC014B` | UC-014 external Codex preservation | Primary End-to-End | Codex runtime selection | result through existing Codex-owned login state or existing sanitized failure | `CodexAppServerClient` | Pass |
| `DS-UC015` | UC-015 legacy-source non-authority | Primary Startup | server start with legacy files/aliases present | approved non-secret config available; legacy credential sources unchanged and non-authoritative; v1 guidance value-free | non-secret `AppConfig` reader and current custom-provider store | Pass |
| `DS-UC016` | UC-016 backend conformance | Primary Operational | adapter conformance test | assertions against declared capability behavior | reusable backend conformance suite | Pass |
| `DS-UC017` | UC-017 Claude authentication cutover | Primary End-to-End | Claude model-discovery/run authentication selection | CLI-authenticated result, managed-secret result, or exact value-free failure | `ClaudeRuntimeAuthenticationService`; `ClaudeSdkClient` owns child delivery/spawn | Pass — initiating caller, explicit mode owner, authoritative secret boundary when applicable, exact child, result/failure |
| `DS-UC018A` | UC-018 AutoByteus credential lifecycle/reload | Primary End-to-End | existing AutoByteus Settings row | credential status plus refreshed remote catalogs | `LlmProviderService`; `AutobyteusRemoteModelDiscoveryService` owns typed refresh | Pass — existing UI, subject lifecycle, authoritative custody, reload, catalog outcome |
| `DS-UC018B` | UC-018 host-gated AutoByteus discovery | Primary End-to-End | startup/reload trigger plus configured or absent hosts | zero-lookup scoped clear or runtime-scoped LLM/audio/image catalog update | `AutobyteusRemoteModelDiscoveryService` | Pass — trigger, host gate, conditional JIT resolution, provider request, registry consequence |
| `DS-UC018C` | UC-018 remote model construction/use | Primary End-to-End | selected discovered LLM/audio/image target | real AutoByteus remote response/artifact | generic LLM/media provisioning owner | Pass — target identity, credential owner, management, provider client, result |
| `DS-UC018D` | UC-018 fresh-worktree real validation | Primary Operational | tracked live scenario in a fresh worktree | sanitized real discovery/invocation/generation evidence | live E2E harness | Pass — tracked config, read-only E2E Store, product path, real endpoint, evidence |
| `DS-UC019A` | UC-019 local import preview | Primary Operational | PNPM command with optional separator, absolute source, explicit target, `--dry-run` | value-free populated selected definition/action plan with zero writes and no ignored/empty-placeholder metadata | `LocalEnvironmentSecretImportService` | Pass — adapter, source trust/recognize-first/empty-as-absent selection, target status, plan, cleanup, outward result |
| `DS-UC019B` | UC-019 default Store import | Primary Operational | PNPM command with explicit `target=default` | atomic selected default-Store records plus restart instruction | `LocalEnvironmentSecretImportService` | Pass — complete validation, overwrite policy, exact TTY phrase, Local transaction, consequence |
| `DS-UC019C` | UC-019 real-E2E Store import | Primary Operational | PNPM command with explicit `target=e2e` | atomic selected E2E records plus preflight instruction | `LocalEnvironmentSecretImportService` | Pass — E2E target only; no default-Store open/fallback |
| `DS-UC020` | UC-020 `repository_prisma@1.0.8` clean replacement | Primary Operational | approved latest dependency update / clean install | exact unpatched artifact plus value-free static/import/log/build/restart compatibility evidence | package/dependency integration | Pass — manifest, artifact, obsolete patch removal, existing owners, build/regression consequence |
| `DS-RET001` | UC-001/002/003/005/006/011/013/015/016/019 status return | Return-Event | backend/Store/import/configuration or v1-read outcome | exact health plus healthy-only definition/import state or stable value-free legacy guidance | owner of initiating use case | Pass |
| `DS-RET002` | UC-007/008/010/012/017 provider return | Return-Event | provider/runtime response/error | normalized product/test result | concrete client plus initiating use-case owner | Pass |
| `DS-LOC001` | UC-001/005/006/011 Local Store encrypted record save | Bounded Local | validated exact record command | atomically committed ciphertext and status | `LocalEncryptedSecretRepository` | Pass — crypto/persistence stays inside in-process Local backend |
| `DS-LOC002` | UC-011 explicit exact-Store reset | Bounded Local | explicit Store-target confirmation | selected database/key/SQLite sidecars deleted after handles close | Local Store reset owner | Pass — destructive path cannot race open writer |
| `DS-LOC003` | UC-019 selected import batch | Bounded Local | file-safe source, populated selected current credentials, and selected-target import plan | all planned records committed or none; empty recognized and unrecognized lines absent from the plan | local import owner + recognize-first/empty-as-absent source reader + internal Local setup repository | Pass — positive selection/plan/transaction/cleanup stay bounded; generic backend port remains unchanged |

## Per-Use-Case Spines And Ownership Validation

### UC-001 — Built-In Provider Credential Lifecycle

Primary spine:

```text
ProviderApiKeyEditor
  -> LLM provider Pinia action
  -> provider-specific GraphQL mutation
  -> LlmProviderService
  -> SecretManagementService
  -> active writable SecretStorageBackend
  -> selected custody record
```

Return spine:

```text
backend outcome
  -> SecretManagementService value-free ManagedSecretStatus
  -> LlmProviderService composes provider-owned validation state
  -> GraphQL
  -> Pinia/UI configured or error state
```

- Supported trigger/evidence: existing direct/Electron provider Settings and `setLlmProviderApiKey` path.
- Governing owner: `LlmProviderService` coordinates the provider use case; `SecretManagementService` remains authoritative for secret lifecycle.
- Data required: provider ID/credential slot, transient `SecretValue`, operation (`save` or `remove`), resulting storage state and subject-owned validation state.
- Data not justified: application-user identity, organization/deployment scope, expected version, concrete backend path, saved value readback.

### UC-002 — Custom Provider Lifecycle

Create spine:

```text
CustomProviderEditor
  -> GraphQL create command
  -> LlmProviderService normalize/validate metadata
  -> OpenAI-compatible discovery probe using transient input
  -> allocate provider ID
  -> CustomLlmProviderStore writes metadata-only record
  -> SecretManagementService saves the custom-provider consumer's derived definition
  -> CustomLlmProviderRuntimeSyncService / ModelCatalogService refresh
  -> provider and models returned to Settings
```

If the secret save fails after metadata creation, the service deletes the newly allocated metadata record before returning failure. No plaintext was persisted. Runtime refresh occurs only after both durable operations succeed.

Delete spine:

```text
Settings delete
  -> GraphQL
  -> LlmProviderService loads provider metadata
  -> if absent, return value-free success
  -> SecretManagementService removes derived definition
  -> CustomLlmProviderStore removes metadata
  -> runtime/model catalog refresh
  -> value-free result
```

- Supported trigger/evidence: current custom probe/create/delete UI, GraphQL, service, store, and runtime sync.
- Governing owner: `LlmProviderService`; neither the secret service nor metadata store owns the cross-subject transaction.
- Idempotency: an absent custom provider and an absent derived secret are successful terminal states. Built-in provider deletion remains rejected by the existing subject rule.
- Data required: provider UUID, name, provider type, normalized base URL, transient credential, derived definition ID.
- Data not justified: duplicated `credentialSecretId`, credential in model/metadata, ordinary lifecycle CAS input.

### UC-003 — Backend Configuration

```text
deployment/startup config or supported Settings form
  -> typed configuration transport
  -> SecretStorageConfigurationService
  -> adapter-specific non-secret schema validation
  -> temporary adapter construction + health/capability probe
  -> non-secret configuration repository
  -> restart-required status for a running server
```

- Owner: `SecretStorageConfigurationService`.
- Required data: a registered adapter discriminant and adapter-specific non-secret fields. First delivery accepts Local product configuration only; InMemory is test composition. Local requires exact trusted database/key paths plus read-only/read-write mode. Ordinary bootstrap derives default paths below `serverDataDir`; Electron therefore resolves under `~/.autobyteus/server-data`, and normal Docker under `/home/autobyteus/data` in its existing volume. The host live launcher derives canonical E2E paths. Future adapters must introduce their own explicit types when implemented; no placeholder vendor configuration is accepted now.
- Forbidden data: Local Store key bytes, Vault/cloud token, provider credential, runtime caller path selector, generic `Record<string, ...>` adapter bag.
- Reachability result: dynamic hot-swap is not an approved use case. Startup activates the persisted/deployment configuration; a Settings change on a running server is validated, saved, and reported as restart-required.

### UC-004 — Local Backend Bootstrap

```text
Electron embedded, direct local, normal Docker, single Kubernetes server Pod, or host test server start
  -> server bootstrap
  -> derive normal Store below serverDataDir or load explicit host-test Store configuration
  -> LocalSecretStoreBackendFactory
  -> construct LocalSecretStorageBackend inside Agent Server
  -> open exactly one configured database/key pair
  -> validate permissions, formats, and authenticated Store/key pair verifier
  -> SecretManagementService and consumer provisioning become ready
```

- Owner: server bootstrap composition.
- Normal custody path: `${serverDataDir}/secret-store/`; Electron resolves under `~/.autobyteus/server-data`, Docker resolves inside its existing persistent data volume without Compose/launcher changes, and a single Kubernetes server Pod may bind its own persistent volume to the server data directory.
- Node rule: each writable Local Store belongs to one independent server-node/persistent-volume domain. Multiple containers/Pods/replicas never share it; such a deployment is unavailable until an appropriate future centralized adapter is implemented and installed.
- Required data: trusted database path, key path, and access mode. Normal servers default to `secret-store.db`/`secret-store.key`; host live tests select `real-e2e-secret-store.db`/`real-e2e-secret-store.key`. The in-process Local backend—not callers above `SecretManagementService`—opens the database. No daemon, connection alias, profile, runtime selector, or Docker E2E mount is needed.

### UC-005 — Physical Local Store Lifecycle

```text
writable initialization or read-only backend bootstrap
  -> LocalSecretStorageBackend
  -> normalize exact configured database/key paths
  -> require both absent for explicit writable creation or both present for open
  -> validate owner permissions and store_metadata format
  -> derive domain-separated pair-verifier key from root key + store_id
  -> authenticate pair verifier and bound format metadata
  -> open transaction-capable or read-only database handle
  -> value-free health/capability status
```

- Owner: `LocalSecretStorageBackend` owns initialization/open/close and delegates exact persistence/crypto internally. Server bootstrap owns configuration selection.
- Required persistent attributes: singleton schema/encryption/verifier versions, random `store_id`, pair-verifier nonce/ciphertext/tag, and exact encrypted records. `store_id` binds one physical database/key pair; it is not a profile, product owner, path, or caller identity. Profiles, rename, organization, and inheritance attributes have no approved path and are omitted.
- Safety rule: every open authenticates the pair verifier before `READY`, even with zero records. If only one file exists, the key is wrong/swapped, the current verifier is absent/tampered, or its authentication fails, health is `CORRUPT`; never regenerate. Unsupported versions are `INCOMPATIBLE`. `READ_ONLY` never initializes or mutates.

### UC-006 — Direct Real-E2E Store Provisioning

Direct provision:

```text
hidden trusted setup input
  -> LocalSecretStoreProvisioningService bound to writable E2E backend
  -> E2E Store-key derivation + authenticated encryption
  -> exact definitionId record in real-e2e-secret-store.db
  -> checkpoint/close for subsequent read-only use
  -> configured status only
```

- Owner: trusted Local Store setup boundary.
- Design correction: setup is constructed with only the writable E2E target. Its request carries one catalog-validated definition ID and hidden transient value. There is no source/default backend dependency, copy/read method, path selector, or runtime/GraphQL route.

### UC-007 — LLM Construction And Invocation

```text
AutoByteusAgentRunBackendFactory
  -> LLMProvisioningService
  -> derive semantic consumer from target credentialProviderId + credential slot
  -> SecretManagementService.resolveForUse(semantic consumer)
  -> active Store/namespace-bound backend
  -> resolved SecretValue/authentication
  -> LLMFactory.createLLM(modelIdentifier, { configInput, authentication })
  -> concrete LLM constructs provider SDK client
  -> real provider request/stream
  -> normalized LLM response to agent run
```

- Governing owners: provisioning owns resolution/construction sequencing; factory owns model/default config composition; concrete LLM owns request lifecycle.
- Off-spine: the catalog maps provider/credential-slot identity to a definition inside `SecretManagementService`; there is no caller-visible binding resolver step or duplicate expected-definition input.
- Required construction data: `configInput`, target `credentialProviderId`, tagged authentication requirement, and resolved authentication. Native registration materializes its credential owner once; gateway registration explicitly materializes `AUTOBYTEUS`. The construction target omits displayed/creator `providerId`, so provisioning cannot fall back to it. Factory creates effective `LLMConfig` and ephemeral context; authentication is never stored on the model target.
- Removed data: `runScope`, generic deployment scope, resolution timestamp/version, backend/Store/path on LLM types.

### UC-008 — Search, Media, And Metadata

Search:

```text
Search tool
  -> injected SearchExecutor
  -> SearchProvisioningService
  -> SecretManagementService
  -> active Store-bound backend
  -> selected search strategy/client
  -> real search provider
  -> normalized search result
```

Media:

```text
media tool/service
  -> MediaClientProvisioningService
  -> SecretManagementService
  -> active Store-bound backend
  -> media client factory/client
  -> real media provider
  -> normalized media result/artifact
```

Live metadata:

```text
web model list/reload
  -> GraphQL LlmProviderResolver / LlmProviderService
  -> ModelCatalogService
  -> ModelMetadataProvisioningService reads explicit GEMINI_SETUP_MODE
  -> AI Studio: SecretManagementService resolves llmMetadata/GEMINI/geminiAiStudioApiKey
     OR Vertex Express: SecretManagementService resolves llmMetadata/GEMINI/geminiVertexExpressApiKey
     OR Vertex Project: no live metadata provider and zero secret lookup
  -> reveal the one selected key at GeminiModelMetadataProvider construction
  -> established Generative Language models request and response mapping
  -> ModelMetadataResolver live-over-curated merge/failure containment
  -> refreshed model catalog returned to the web surface
```

- Design correction: these are three subject-specific spines, not one generic `ConsumerProvisioningService` implementation.
- Governing owners: `SearchProvisioningService`, `MediaClientProvisioningService`, and `ModelMetadataProvisioningService` each own their family-specific construction/request sequence; `SecretManagementService` owns only catalog-bound credential resolution. `GeminiModelMetadataProvider` owns metadata loading/mapping, while `ModelMetadataResolver` owns live-over-curated merge and failure containment.
- Shared structures are limited to authentication/value contracts, exact Gemini LLM/media construction, and secret management; each family keeps its natural owner. Metadata intentionally does not consume the LLM/media SDK-mode union because its accepted request contract needs only the one selected key.
- For LLM/media, AI Studio constructs `GoogleGenAI({ apiKey })`, Vertex Express constructs `GoogleGenAI({ vertexai: true, apiKey })`, and Vertex Project constructs `GoogleGenAI({ vertexai: true, project, location })`. Metadata separately selects the exact AI Studio or Vertex Express consumer and calls the established Generative Language endpoint; Vertex Project has no live metadata provider. Key presence, ambient aliases, or provider failure never select another credential/branch.
- Curated metadata can keep catalog fields available when live loading is absent or fails. That availability fallback does not retry another definition, read another credential, or count as successful live enrichment.

### UC-009 — Deterministic Tests

```text
default package test command
  -> scenario/test fixture classification
  -> fresh InMemorySecretStorageBackend or disposable temporary Local Store with synthetic canary
  -> normal management/provisioning/subject boundary under test
  -> fake/local provider where applicable
  -> deterministic assertions + sanitized report
```

- Owner: package/test harness appropriate to the subject.
- No shared canonical default/E2E Store, real credential, or global resolver is required. Local storage lifecycle/CRUD tests use a disposable database/key pair.

### UC-010 — Real-Provider Worktree Tests

```text
fresh worktree test:e2e:real command
  -> tracked test-config/live-e2e.json
  -> live E2E harness validates selected scenarios
  -> root launcher derives canonical host E2E paths
  -> real-E2E Store opens read-only, validates format, and authenticates pair verifier
  -> exact definition-ID preflight
  -> host worktree server starts with in-process Store-bound backend
  -> browser/API runner uses normal product path
  -> trusted provisioning/client boundary calls real provider
  -> sanitized assertions and evidence
```

- Owner: live E2E harness for setup/execution/evidence; product services own behavior once invoked.
- No worktree secret path, credential dotenv, raw key environment, default-Store access, Docker mount, or Store fallback is needed. Existing Docker deployment is a separate node-local workflow and remains unchanged.

### UC-011 — Local Backend Concurrency And Reset Lifecycle

Bounded local spine attached to UC-004/UC-010:

```text
server bootstrap requests Local backend
  -> normalize configured database/key pair
  -> validate pair presence, ownership and access mode
  -> open SQLite handle
  -> validate schema/encryption/verifier metadata and authenticate pair verifier
  -> configure transactions and bounded busy handling or read-only mode
  -> return ready Store-bound backend
```

- Owner: `LocalSecretStorageBackend` for open/close and access; exact-Store reset owner for deletion coordination.
- Format contract: an unsupported schema/encryption/verifier format is `INCOMPATIBLE`; partial pair or authentication failure is `CORRUPT`. Both return value-free repair/upgrade instructions, and a worktree never rewrites, downgrades, regenerates, or replaces either file automatically.
- Concurrency contract: prepared host real-E2E Store access is read-only and supports concurrent worktree readers. Writable paths use SQLite transaction/busy rules; provisioning finishes/checkpoints/closes before read-only opening.
- Reset contract: ordinary server runtime-data reset must not erase either Store; Store deletion is an explicit separate action naming exactly one physical Store.

Explicit reset bounded spine:

```text
DS-LOC002
explicit confirmed Store reset
  -> identify exact configured database/key pair
  -> stop new operations and close that server's backend handle
  -> obtain database/filesystem exclusion
  -> delete selected database + independent key + SQLite sidecars
  -> return value-free reset status
```

`DS-LOC001` is the shared internal write path used by direct E2E provision and normal Local Store backend save:

```text
validated definition ID + SecretValue on writable Store-bound backend
  -> derive Store encryption key from that Store's independent root key
  -> authenticated encrypt with fresh nonce and bound associated data
  -> one SQLite transaction on exact record
  -> durable commit
  -> value-free status
```

### UC-012 — Container Deployment And Future Extension Boundary

```text
unchanged Docker node or single Kubernetes server Pod/PVC start
  -> server derives node-local data directory
  -> registered Local backend factory
  -> authenticate node-local Store/key pair
  -> management/provider services ready at LOCAL_HARDENED tier
```

Unsupported multi-node configuration path:

```text
deployment selects unregistered Vault/AWS/Kubernetes/company kind
  -> typed configuration/registry rejects kind
  -> SECRET_BACKEND_KIND_NOT_INSTALLED
  -> value-free degraded configuration/health control plane
  -> no Local fallback and no provider construction
```

- First-delivery owner: server deployment/bootstrap composition.
- A Local writable Store belongs to one Docker node/volume or one server Pod/PVC and is never shared by replicas. Existing Docker Compose/launcher remains unchanged.
- The backend interface/registration seam is retained for future separately installed adapters, but no Vault/AWS/Kubernetes concrete configuration, class, bootstrap identity, or production behavior is claimed in this delivery.

### UC-013 — Capability-Aware Settings

```text
Settings opens provider/backend section
  -> GraphQL status query
  -> SecretStorageConfigurationService
  -> active backend health/capability descriptor
  -> lifecycle capability projection
  -> provider Settings state
  -> writable controls or externally-managed guidance
```

- Owner: `SecretStorageConfigurationService` owns backend health/capability projection; the provider subject service owns composition with its credential-validation state before transport projection.
- Required capability shape is a tagged union: `WRITABLE` or `EXTERNALLY_MANAGED` with a value-free instruction code.
- Removed overlap: separate writable/external booleans could represent impossible combinations.

### UC-014 — Governed Agent Hardening And External Codex Preservation

```text
Governed path (DS-UC014A):
agent/application-worker trigger
  -> AgentExecutionSecurityContext
  -> canonical file roots + empty-base environment/descriptor allowlist
  -> governed file/shell/PTY/Claude/MCP/browser/application-worker runtime
  -> bounded sanitized result + verified LOCAL_HARDENED state

Codex path (DS-UC014B):
Codex runtime selection
  -> existing CodexAppServerClient manager
  -> CodexAppServerClient.start
  -> pre-ticket options.env ?? process.env with real HOME/CODEX_HOME
  -> codex app-server uses Codex-owned external login/configuration state
  -> model/thread/turn result or existing sanitized failure
```

- `AgentExecutionSecurityContext` governs only the first branch. It builds operational environments from an empty allowlist, denies Store/server-data roots through built-in file tools, and keeps Store/provider/backend state out of governed children.
- Codex is one explicit external-runtime exclusion. It performs no `SecretManagementService.resolveForUse`, Store lookup, AutoByteus account/login RPC, auth-mode selection, synthetic-home mapping, or fallback. Restoring the pre-ticket client line removes the ticket regression; it does not create a dual path or compatibility wrapper.
- The exact managed Claude child remains the only Store-resolved provider-key recipient. Parent, siblings, unrelated governed runtime children, and AutoByteus-owned tool children remain secret-free. Managed-mode settings and built-in tool policy close supported descendant environment-inspection/spawn paths.
- This is not an OS/process identity boundary. It explicitly does not claim arbitrary same-user/all-in-one process filesystem denial, secrecy from the authorized Claude executable/SDK, or environment non-inheritance for Codex. First delivery reports only `LOCAL_HARDENED` within that stated boundary and never reports `STRONG_AGENT_ISOLATION`.

### UC-015 — Legacy-Source Non-Authority

```text
server bootstrap with legacy files/aliases present
  -> non-secret AppConfig reader scans assignment names
  -> admit only approved non-secret settings before value retention
  -> leave application .env bytes and parent aliases unchanged
  -> current custom-provider store accepts metadata-only v2
  -> untouched v1 returns CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED
  -> Store-only runtime with no credential fallback
```

- Owner: the non-secret `AppConfig` reader owns name-first projection and source-preserving non-secret writes; the current custom-provider store owns v2-only reads and stable value-free v1 guidance.
- The automatic legacy updater, startup call, rewrite/ledger records, parent-alias deletion, and custom-provider conversion are removed. The general Prisma-backed app-data migration runner remains unchanged.
- Users provision missing definitions through UI/Settings, hidden input, or UC-019 and perform any legacy cleanup themselves.
- Current runtime never retains, dual-reads, or falls back to a legacy credential source.
### UC-016 — Backend Conformance

```text
adapter conformance runner
  -> adapter fixture declares lifecycle/location binding behavior
  -> reusable applicable capability suite
  -> adapter under test
  -> synthetic custody/fault fixture
  -> behavior + redaction + no-fallback assertions
```

- Owner: conformance suite; adapter fixture owns setup/cleanup only. First delivery runs against InMemory, Local read-write/read-only, and a test-only externally-managed capability fixture. No production enterprise adapter is an acceptance dependency. Local fixtures use disposable database/key pairs; they never mutate shared default/real-E2E Stores.
- Ordinary lifecycle is one atomic save (create-or-replace) plus idempotent remove without a caller CAS contract, matching the existing Settings save/delete journey.

### UC-017 — Claude Runtime Authentication Cutover

Default CLI/account path:

```text
Claude model-discovery/run request (mode omitted or `cli`)
  -> ClaudeSdkClient public launch/list-model boundary
  -> ClaudeRuntimeAuthenticationService selects CLI
  -> zero SecretManagementService calls
  -> return {kind: cli} to ClaudeSdkClient
  -> internal empty-base CLI/account environment
  -> Claude Agent SDK / exact Claude Code child
  -> provider/runtime result
  -> bounded sanitized product result or CLAUDE_RUNTIME_CLI_AUTH_UNAVAILABLE
```

Explicit managed-secret path:

```text
Claude model-discovery/run request (`managed-secret`)
  -> ClaudeSdkClient public launch/list-model boundary
  -> ClaudeRuntimeAuthenticationService
  -> SecretManagementService.resolveForUse({agentRuntime, claude_agent_sdk, apiKey})
  -> catalog authorizes provider.anthropic.api-key
  -> configured backend decrypts SecretValue
  -> return {kind: managedApiKey, apiKey} to ClaudeSdkClient
  -> internal empty-base managed environment
  -> add only ANTHROPIC_API_KEY to exact SDK child
  -> Claude Agent SDK / Claude Code child
  -> drop AutoByteus temporary references
  -> bounded sanitized product result/error
```

Invalid/non-ready path:

```text
Claude request (`auto`, `api-key`, unknown) OR managed Store/binding failure
  -> ClaudeSdkClient -> ClaudeRuntimeAuthenticationService / SecretManagementService
  -> exact value-free mode, missing, locked, unavailable, corrupt, incompatible, or binding code
  -> no child spawn
  -> no CLI/ambient/other-Store fallback
```

- Owner: `ClaudeSdkClient` is the single public boundary used by session and model catalog and owns last-mile environment/options/spawn. Its injected `ClaudeRuntimeAuthenticationService` owns exact mode parsing, the managed consumer identity, just-in-time resolution, and subject error mapping. The central management service remains authoritative for catalog/backend resolution.
- `ClaudeSdkClient` start/model-discovery inputs no longer accept `env`; session/catalog callers depend only on the client boundary and never receive authentication.
- Managed mode uses empty setting sources, strict explicit AutoByteus MCP configuration, no hooks/plugins/API-key helper/external MCP, and SDK `tools: []` so no Claude built-in file/shell/skill/process path exists. `allowedTools` contains only materialized AutoByteus MCP names and is not itself a security boundary. AutoByteus tool children use their own sanitized server environment.
- Diagnostics redact before buffering and again on output. Spawn/provider-auth failures are value-free and never trigger mode fallback.
- Native `AnthropicLLM` and metadata consumers remain separately authorized through DS-UC007/008. One definition is reused; consumer authority is not shared.
- The authorized Claude process/SDK can observe its credential and may retain it in native/JavaScript memory. That is an explicit `LOCAL_HARDENED` trust limit, not a zeroization claim.

### UC-018 — AutoByteus Remote Gateway Preservation

`DS-UC018A` — existing Settings lifecycle and full refresh:

```text
existing AutoByteus built-in provider row
  -> existing provider credential save/remove/status mutation/query
  -> LlmProviderService
  -> SecretManagementService (llm/AUTOBYTEUS/apiKey)
  -> selected backend -> provider.autobyteus.api-key
  -> value-free status
  -> save/replace: existing provider reload + full AutoByteus remote catalog refresh
  -> remove: authoritative clear of all AutoByteus runtime subsets with zero lookup
  -> updated Settings/catalog result
```

`DS-UC018B` — host-gated discovery for each `modelKind = llm | audio | image`:

```text
server startup, provider reload, or explicit full AutoByteus reload
  -> AutobyteusRemoteModelDiscoveryService.refresh(modelKind)
  -> read non-secret AUTOBYTEUS_LLM_SERVER_HOSTS
  -> SecretManagementService.resolveForUse({modelDiscovery, modelKind, AUTOBYTEUS, apiKey})
  -> selected backend -> provider.autobyteus.api-key
  -> credential-agnostic AutoByteus remote provider/factory
  -> remote model response
  -> replace only matching modelKind + runtimeProviderId=AUTOBYTEUS subset
  -> refreshed catalog while native same-provider models remain
```

No-host branch inside `DS-UC018B`:

```text
server startup/reload
  -> AutobyteusRemoteModelDiscoveryService.refresh(modelKind)
  -> configured host list is empty
  -> no SecretManagementService/backend/provider call
  -> authoritative clear of only matching modelKind + runtimeProviderId=AUTOBYTEUS subset
  -> native/unrelated catalog remains unchanged
```

`DS-UC018C` — discovered-model construction/invocation:

```text
agent/media request selects AutoByteus-discovered target
  -> generic LLMProvisioningService or MediaClientProvisioningService
  -> target credentialProviderId=AUTOBYTEUS (displayed provider may differ)
  -> SecretManagementService.resolveForUse(llm|media/AUTOBYTEUS/apiKey)
  -> selected backend -> provider.autobyteus.api-key
  -> credential-agnostic LLM/media factory and AutoByteus remote client
  -> real remote response/artifact
  -> normalized product result
```

`DS-UC018D` — fresh-worktree real evidence:

```text
fresh worktree with tracked non-secret AutoByteus hosts/capabilities
  -> live E2E harness derives read-only real-E2E Store paths
  -> value-free preflight for provider.autobyteus.api-key
  -> normal product discovery and construction path
  -> real AutoByteus endpoint
  -> representative LLM invocation and advertised audio/image generation
  -> sanitized capability/evidence report with no key environment or artifact
```

- Governing owner: `AutobyteusRemoteModelDiscoveryService` owns host gating, typed discovery sequencing, result scoping, last-known-good behavior, and value-free diagnostics. It calls the authoritative management boundary and existing remote provider/factory; it does not own Store access or generic registry implementation.
- Synchronization invariant: a successful response replaces only the corresponding AutoByteus runtime subset. A successful authoritative empty list or absent host configuration clears only that model-kind subset. A transient missing/non-ready/provider failure during configured-host refresh before an authoritative response preserves the last-known-good subset. Explicit successful credential removal is itself authoritative and clears every AutoByteus runtime subset without lookup. Native models are never removed merely because their displayed provider matches a remote model.
- Data-tightness invariant: definition identity is stored once; semantic consumer identity authorizes use; `credentialProviderId` is non-secret construction routing metadata. Hosts never enter a secret definition/consumer and authentication never enters model metadata.
- Removal: normal runtime/factory code no longer retains or reads `AUTOBYTEUS_API_KEY`; the alias exists only in the positive explicit-import registry and the separate non-secret projection boundary. No fallback restores it, and startup leaves its source unchanged.
- UI scope: no new screen, backend selector, or AutoByteus-specific credential UI is added. The existing built-in provider row and endpoint settings remain the supported surfaces.
- CR-002–CR-005 do not add UC-018 nodes: they correct implementation-local environment composition, deletion idempotency, and handoff wording under already approved owners.

### UC-019 — Explicit Local Environment-Secret Import

`DS-UC019A` — value-free dry-run:

```text
trusted operator invokes pnpm secrets:local:import
  -> thin CLI removes zero/one leading PNPM sentinel and validates required options
  -> LocalEnvironmentSecretImportService
  -> non-mutating source identity/access plus size/UTF-8/NUL verification
  -> scan exact assignment names against immutable positive registry
  -> parse valid recognized assignments; normalized empty becomes absent/non-selected
  -> validate populated values/duplicates only; Qwen accepts DASHSCOPE only
  -> ignore every unrecognized line without interpreting its right-hand side
  -> current catalog-known definition validation
  -> internally resolve exactly target=default or target=e2e and read target status
  -> READY reads definition state; both-absent is INITIALIZATION_REQUIRED; partial pair is CORRUPT
  -> derive CREATE / SKIPPED_CONFIGURED / REPLACE plan from the request overwrite policy
  -> value-free selected definition IDs/actions and cleanup; zero prompt/write
```

`DS-UC019B` — confirmed normal/default Store write:

```text
trusted operator invokes explicit source + target=default
  -> complete DS-UC019A validation and plan without --dry-run
  -> configured entries skip unless --overwrite
  -> direct TTY exact phrase IMPORT DEFAULT STORE
  -> initialize selected pair through staged Local initializer only if both files were absent
  -> internal Local setup provisionBatchExact against canonical default pair only
  -> one SQLite transaction + checkpoint/close
  -> CONFIGURED/SKIPPED/REPLACED counts + restart-required code
```

`DS-UC019C` — confirmed real-E2E Store write:

```text
trusted operator invokes explicit source + target=e2e
  -> complete DS-UC019A validation and plan without --dry-run
  -> direct TTY exact phrase IMPORT REAL-E2E STORE
  -> initialize selected pair through staged Local initializer only if both files were absent
  -> internal Local setup provisionBatchExact against canonical real-E2E pair only
  -> one SQLite transaction + checkpoint/close
  -> CONFIGURED/SKIPPED/REPLACED counts + run-preflight code
```

Failure/return spine:

```text
option/source/file-safety/selected-value/mapping/target/confirmation/batch failure
  -> rollback or zero write
  -> stable value-free error/health/instruction code
  -> best-effort owned-buffer overwrite and reference release
  -> source unchanged; other Store unopened
```

- Supported trigger: the operator deliberately invokes the committed command. There is no startup, automatic legacy updater, UI, GraphQL, MCP, agent, test-runner, Docker-launcher, or implicit caller.
- Governing owner: the PNPM/CLI layer owns exactly optional-sentinel normalization plus flags/TTY/output. The source reader owns file trust/safety, positive name recognition and selected-only value parsing. `LocalEnvironmentSecretImportService` owns selected mapping/catalog validation, target/overwrite policy, plan, confirmation, batch sequencing, cleanup, and value-free result. The internal Local setup repository owns encrypted atomic persistence.
- Target identity: the required closed role is `default|e2e`. It resolves inside the owner to canonical files below `~/.autobyteus/server-data/secret-store/`; neither argv nor source contents may supply target paths, Store keys, backend configuration, values, or definition IDs.
- Source identity: the required operator-supplied path must be absolute; any basename/extension, including the current application `.env`, extensionless or renamed copies, is accepted. No current/parent search, inference, format auto-detection, JSON/YAML, dotenv execution, or shell-source behavior exists. The source is a regular non-symlink file, current-identity-owned, privately accessible, and stable across verification/open. The verifier never mutates source ACLs or permissions.
- Recognize/map policy: maximum 1 MiB, valid UTF-8, and no NUL apply to the file. The reader matches exact assignment names to one positive registry before parsing an assignment. Recognized lines must use the supported static same-line grammar. After unquoting and outer-horizontal-whitespace normalization, empty recognized values are absent/non-selected and create no plan/output metadata, warning, or failure. Empty occurrences do not enter duplicate state; one populated occurrence selects, two populated occurrences reject, and populated values remain non-dynamic. Every unrecognized line—including malformed unrelated content—is ignored without right-hand-side interpretation and produces no ignored metadata. Only `DASHSCOPE_API_KEY` maps for Qwen. `QWEN_API_KEY` and `ZHIPU_API_KEY` remain unmapped/non-blocking. Zero populated selected credentials returns `IMPORT_NO_MAPPED_CREDENTIALS` without target access.
- Persistence semantics: dry-run is zero-write, including for an absent selected pair; confirmed execution initializes only a both-absent selected pair, while one-file partial is `CORRUPT`. Normal rerun skips configured entries; `--overwrite` only enables replacement; absent aliases and unrelated records are preserved; removal is unsupported. The transaction revalidates `CREATE`-absent and `REPLACE`-present preconditions, so plan drift aborts all records rather than overwriting silently. If a newly initialized pair's record batch fails, a valid empty selected Store may remain, but no mapped record is partially committed.
- Disclosure limit: values necessarily exist transiently in the trusted process and encryption library. They never enter argv, `process.env`, shell commands, stdout/stderr, logs, exceptions, reports, or serialized plan/result objects. Owned buffers are minimized and cleaned best-effort, but JavaScript/runtime copies cannot be proven zeroized.
- Hidden-input `LocalSecretStoreProvisioningService.provisionExact` remains behaviorally available for one-at-a-time E2E setup; its target-bound lifecycle composition may be strengthened to share safe open/initialize/checkpoint/close ownership with the batch path.

### UC-020 — `repository_prisma@1.0.8` Clean Dependency Replacement

`DS-UC020`:

```text
approved latest repository_prisma request
  -> autobyteus-server-ts/package.json selects ^1.0.8
  -> pnpm resolves the attested 1.0.8 artifact with @prisma/client 5.22 peer
  -> root patchedDependencies removes obsolete repository_prisma entry and old patch file
  -> exact installed ESM/CommonJS no-dotenv/import-safety/default-off-log checks
  -> clean/frozen install, production build, and CR-009–CR-014 lazy-owner/restart/reopen regressions
  -> value-free dependency evidence with unchanged schemas/data/owners
```

- Supported trigger: the user explicitly requests this dependency version. Clean/frozen repository installation and production build are established operational contracts.
- Governing owner: package/dependency integration owns the server manifest, lock resolution, obsolete patch removal, and focused compatibility evidence. The dependency's internal lifecycle does not become an AutoByteus production owner.
- Authority invariant: current configured `@prisma/client` ownership remains in AppConfig/configured-client and bounded lazy repository owners. No production `src/**` import of `repository_prisma`, datasource routing change, or lifecycle delegation is authorized.
- Import/log invariant: both exact published entrypoints omit dotenv/config and `.env` discovery, acquire no Prisma at import, and default to `info`, `warn`, and `error`. `query` is added only through documented explicit environment or typed opt-in; typed false wins over environment true and post-bind conflict is stable. Tests inspect synthetic construction/options and execute or capture no real SQL.
- Installation invariant: manifest and lock move to one exact attested `1.0.8` artifact while the obsolete `1.0.6` patched-dependency key/file is deleted. A successful clean frozen install has no `1.0.6`/`1.0.7` resolution and no repository patch for any version.
- Persisted-data decision: `Not Affected`; Prisma/client, schema, SQL migrations, ordinary SQLite files, Local secret Stores, and Docker remain unchanged.
- Evidence boundary: no raw query, datasource URL/path, provider result, credential, or raw diagnostic enters stdout, logs, reports, or attached evidence.

## Attribute Provenance And Tightness Audit

| Proposed Attribute / Structure | Use-Case Witness | Decision | Reason / Replacement |
| --- | --- | --- | --- |
| `SecretDefinitionId` | UC-001, 002, 006–010, 012, 016–019 | Retain | stable semantic storage identity; runtime and explicit-import mutations use only mapped catalog-known IDs; UC-015 emits no credential identity record |
| `SecretConsumerIdentity` | UC-007/008/017/018 | Retain and tighten | permits catalog-bound resolution; exact subject/provider/runtime/model-kind/credential slot only |
| `SecretScope.organizationId/deploymentId/environmentId/sharing/nodeId` | none | Remove | no current/approved product identity or caller supplies these fields |
| `SecretStorageAddress.namespace/scopePath` in service request | none | Remove | adapter configuration owns physical prefix; backend input is validated definition ID |
| caller-selectable runtime Store/path | none | Remove/forbid | server/backend instance is bound to one Store at bootstrap; UC-019 accepts only a closed setup target role, never a path |
| named profile, profile ID/name/table | none after physical separation decision | Remove | approved default/E2E contexts are separate databases/keys; no namespace lifecycle remains |
| Store database path, key path, access mode in trusted bootstrap | UC-003–006, 010, 011 | Retain | required to construct one in-process Local backend; normal paths derive from serverDataDir and host test paths are explicit; never runtime caller input |
| cross-Store inheritance/fallback | explicitly rejected by UC-006/010 | Remove/forbid | missing target is failure |
| `SecretDefinition.displayName/purpose/sensitivity/scopePolicy` | none; provider UI owns display | Remove | duplicate/descriptive attributes do not affect a spine |
| `SecretDefinition.legacyAliases` | UC-015/019 only | Move | one immutable exclusion/import-owned alias map supports name-first sensitive exclusion and explicit import, never current runtime definitions |
| `SecretDefinition.validationPolicy` | UC-001/002 subject behavior | Move | provider/search subject service owns probe/validation |
| `ResolvedSecret.version/resolvedAt` | none | Remove | current construction needs only authentication; no approved global cache/CAS path |
| expected version on Settings replace/remove | none | Remove | current supported behavior is atomic save/delete, not optimistic-concurrency UI |
| separate management create/replace methods | none; current Settings exposes one save | Collapse | one `saveForConsumer` and one backend `save` preserve the actual journey and remove a synthetic branch |
| internal DB `revision` exposed to product | none | Remove | SQLite transaction + fresh nonce provides atomic replace; no caller uses revision |
| `SecretStatus.version/updatedAt/backendKind/genericMigrationRequired` | none or duplicative | Remove | use management-owned storage status plus separately composed subject-validation state |
| `ManagedSecretStatus.definitionId/messageCode` | none on the return spine; the caller already supplied semantic identity and failures/events have their own codes | Remove | keep catalog mapping internal and return only storage state plus lifecycle capability |
| `SecretBackendHealth.retryable` | none; retry policy is not an approved status contract and can contradict the state/code | Remove | use a discriminated health state with an exact value-free instruction code for every non-ready variant |
| storage and validation state in one management DTO | UC-001, 002, 010, 013 | Split by owner | management reports storage; provider/search service composes its own validation state |
| lifecycle capability booleans | UC-013 | Replace | tagged `WRITABLE` / `EXTERNALLY_MANAGED` prevents contradictory combinations |
| generic or setup cross-Store copy port | UC-006/019 explicitly reject | Remove | hidden input/explicit source writes one selected Store; no Store is a source and no general backend port is widened |
| `requestedAssuranceTier` config | none | Remove | UC-014 assurance is derived from verified controls |
| `LLMFactoryCreationInput.configInput` | UC-007 | Retain | existing factory behavior and caller overrides |
| `LLMFactoryCreationInput.authentication` | UC-007 | Retain | explicit credential delivery; mandatory even when `none` |
| `LLMConstructionContext.config` + `authentication` | UC-007 | Retain | single concrete constructor boundary; ephemeral |
| `runScope` on LLM provisioning | none | Remove | active backend Store/namespace binding already determines custody |
| Local Store `connectionName` | none | Remove | trusted bootstrap supplies exact paths; runtime does not select aliases |
| expected definition ID alongside consumer identity | none | Remove | management owns catalog lookup; duplicate identity can drift or create a boundary bypass |
| generic adapter option map | none | Remove | each enabled adapter defines a typed non-secret schema |
| Local Store DB `definition_id`, `ciphertext`, `nonce` | UC-005/006/011 | Retain | minimal persistent record identity and encryption data; no `profile_name` |
| Local Store `schema_version` and `encryption_format_version` | UC-004/005/010/011 | Retain | multiple worktree/Electron versions must detect incompatible persistent formats without silent rewrite/downgrade |
| Local Store `pair_verifier_format_version`, random `store_id`, verifier nonce/ciphertext/tag | UC-005/010/011 plus pair-integrity contract | Retain | authenticates the database/key pair before ready, including an empty Store; attributes do not encode product/profile identity |
| Local Store `protocolVersion`, process endpoint, socket capability | none after in-process decision | Remove | there is no Store process or IPC contract |
| Local Store timestamps/value hash/prefix/length | none | Remove/forbid | no behavior needs value-derived or historical hints |
| exact Claude `agentRuntime/claude_agent_sdk/apiKey` identity | UC-017 managed path | Retain | authorizes managed mode to reuse the Anthropic definition without a Claude-specific resolver/definition; CLI never constructs it |
| Claude `auto`, ambient `api-key`, caller `env`, settings/hooks/plugins/external MCP, built-in process/env inspection | UC-017 failure/security paths | Remove/forbid | eliminates hidden fallback and supported propagation/readout paths around exact child delivery |
| exact AutoByteus `modelDiscovery/{llm\|audio\|image}/AUTOBYTEUS/apiKey` identities | UC-018 discovery paths | Retain | one definition is reused while model kind still determines authorized refresh and registry consequence |
| `LLMConstructionTarget.credentialProviderId` and media analogue | UC-007/008/018 construction paths | Retain | required credential-owner fact materialized at registration; native and gateway registrations assign it explicitly, while displayed provider is absent from each subject target |
| exact inline Gemini variants inside `ResolvedLLMAuthentication` and multimedia authentication | UC-007 and UC-008 LLM/media paths | Retain once per existing subject contract | exact AI Studio, Vertex Express, and Vertex Project SDK-construction semantics survive trusted resolution; no optional mode bag or generic-api-key collapse |
| selected Gemini metadata `SecretValue` at existing provider construction | UC-008 live metadata | Retain narrowly | the existing metadata provider consumes exactly one key selected by its server owner; this matches the accepted dual-key Generative Language request contract without adding an SDK-mode DTO |
| metadata SDK-mode union, endpoint override, alternate-definition retry, or ambient environment bag | none in target | Remove/forbid | misrepresents the accepted metadata path, adds unused Vertex Project live behavior, or bypasses exact consumer selection and Store authority |
| AutoByteus hosts on secret definition/consumer | none | Remove/forbid | hosts are non-secret endpoint configuration owned by discovery; they do not change secret identity or custody |
| AutoByteus remote runtime marker used for scoped registry replacement | UC-018 discovery synchronization | Retain | preserves native same-provider models and permits authoritative clear/replace of only the gateway-owned subset |
| `LocalEnvironmentSecretImportRequest.sourceAbsolutePath` | UC-019 | Retain | explicit source identity; access/identity validated before parse; any filename/extension; never inferred/searched |
| `LocalEnvironmentSecretImportRequest.target` | UC-019 | Retain and close | exactly `default\|e2e`; resolves internally to canonical Local Store pair; no path/backend selector |
| `dryRun` / `overwrite` | UC-019 | Retain | two independent explicit policies: preview without mutation and opt-in replacement; configured entries otherwise skip |
| Qwen source alias | UC-019 | Retain internally | exactly `DASHSCOPE_API_KEY` maps to the existing Qwen definition; `QWEN_API_KEY` remains unrecognized; no alias priority/group exists |
| negative secret-like classifier / ZHIPU alias / ignored-line metadata | none | Remove/forbid | importer eligibility is positive; unrelated content is outside its subject, ZHIPU is legacy, and no ignored-line information belongs in outward data |
| caller definition/value list, Store paths, backend config, env override, remove flag, `--yes` | none | Remove/forbid | would bypass immutable mapping, selected target custody, or direct-TTY safety |
| outward import plan/result value, ignored-line metadata, or value-derived metadata | none | Remove/forbid | outward plan contains definition ID and closed action; result contains health, action counts, and instruction codes only |
| `repository_prisma` runtime ownership/configuration DTO | none in UC-020 | Remove/forbid | dependency integration needs only exact package identity, obsolete patch removal, and value-free evidence; current Prisma owners remain authoritative |
| exact `repository_prisma@1.0.8` manifest/lock identity | UC-020 | Retain in package metadata only | clean/frozen installation must bind one attested artifact while proving no repository patch or old resolution remains; this is not a runtime data shape |

## Minimal Target Data Shapes After Audit

```ts
type SecretDefinitionId = string & { readonly __brand: "SecretDefinitionId" };

type SecretConsumerIdentity =
  | { kind: "llm"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "llmMetadata"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "search"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "media"; mediaKind: "audio" | "image" | "video"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "agentRuntime"; runtimeKind: "claude_agent_sdk"; credentialSlot: "apiKey" }
  | {
      kind: "modelDiscovery";
      modelKind: "llm" | "audio" | "image";
      providerId: "AUTOBYTEUS";
      credentialSlot: "apiKey";
    };

type SecretCredentialSlot =
  | "apiKey"
  | "geminiAiStudioApiKey"
  | "geminiVertexExpressApiKey";

type ResolvedLLMAuthentication =
  | { kind: "none" }
  | { kind: "apiKey"; apiKey: SecretValue }
  | { kind: "geminiAiStudio"; apiKey: SecretValue }
  | { kind: "geminiVertexExpress"; apiKey: SecretValue }
  | { kind: "geminiVertexProject"; project: string; location: string };

// ResolvedMultimediaAuthentication retains the same exact inline Gemini variants.
// Metadata does not consume this SDK-construction union: server provisioning reveals
// the one selected AI Studio or Vertex Express key to GeminiModelMetadataProvider.
// Vertex Project constructs no live metadata provider and performs zero secret lookup.

type WritableSecretLifecycleCapability = { kind: "WRITABLE" };
type ExternallyManagedSecretLifecycleCapability = {
  kind: "EXTERNALLY_MANAGED";
  instructionCode: string;
};
type SecretLifecycleCapability =
  | WritableSecretLifecycleCapability
  | ExternallyManagedSecretLifecycleCapability;

type ManagedSecretStatus = {
  storageState: "MISSING" | "CONFIGURED";
  lifecycle: SecretLifecycleCapability;
};

type ProviderCredentialValidationState =
  | "UNVERIFIED"
  | "VALID"
  | "INVALID"
  | "VALIDATION_UNAVAILABLE";

type BackendSecretStatus = { storageState: "MISSING" | "CONFIGURED" };

type ReadySecretBackendHealth = { state: "READY" };
type NonReadySecretBackendHealth =
  | { state: "LOCKED"; instructionCode: "SECRET_BACKEND_LOCKED" }
  | {
      state: "UNAVAILABLE";
      instructionCode:
        | "SECRET_BACKEND_UNAVAILABLE"
        | "SECRET_BACKEND_KIND_NOT_INSTALLED";
    }
  | { state: "CORRUPT"; instructionCode: "SECRET_BACKEND_CORRUPT" }
  | {
      state: "INCOMPATIBLE";
      instructionCode: "SECRET_BACKEND_INCOMPATIBLE";
    };
type SecretBackendHealth =
  | ReadySecretBackendHealth
  | NonReadySecretBackendHealth;

type ManagedSecretStatusResult =
  | { health: ReadySecretBackendHealth; secret: ManagedSecretStatus }
  | { health: NonReadySecretBackendHealth; secret: null };

interface SecretManagementService {
  resolveForUse(consumer: SecretConsumerIdentity): Promise<SecretValue>;
  // lifecycle methods accept the same semantic consumer identity;
  // this service performs the catalog lookup internally.
}

type ClaudeRuntimeAuthenticationMode = "cli" | "managed-secret";
type ClaudeRuntimeAuthentication =
  | { kind: "cli" }
  | { kind: "managedApiKey"; apiKey: SecretValue };

type LLMConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: LLMAuthenticationRequirement;
};

interface SecretStorageBackendOperations {
  getStatus(definitionId: SecretDefinitionId): Promise<BackendSecretStatus>;
  resolve(definitionId: SecretDefinitionId): Promise<SecretValue>;
  health(): Promise<SecretBackendHealth>;
  close(): Promise<void>;
}

interface WritableSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: WritableSecretLifecycleCapability;
  save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void>;
  remove(definitionId: SecretDefinitionId): Promise<void>;
}

interface ExternallyManagedSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: ExternallyManagedSecretLifecycleCapability;
}

type SecretStorageBackend =
  | WritableSecretStorageBackend
  | ExternallyManagedSecretStorageBackend;

type LocalStoreConfiguration = {
  kind: "local-store";
  databasePath: string;
  keyPath: string;
  accessMode: "READ_WRITE" | "READ_ONLY";
};

// Internal immutable registry shape; never returned by product/runtime APIs.
type LocalImportCredentialAliasRegistry = Readonly<
  Record<string, SecretDefinitionId>
>;

type LocalEnvironmentSecretImportRequest = {
  sourceAbsolutePath: string;
  target: "default" | "e2e";
  dryRun: boolean;
  overwrite: boolean;
};

type LocalEnvironmentSecretImportAction =
  | "CREATE"
  | "SKIPPED_CONFIGURED"
  | "REPLACE";

type LocalEnvironmentSecretImportPlanEntry = {
  definitionId: SecretDefinitionId;
  action: LocalEnvironmentSecretImportAction;
};

type LocalEnvironmentSecretImportTargetStatus =
  | { state: "READY" }
  | {
      state: "INITIALIZATION_REQUIRED";
      instructionCode: "LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED";
    }
  | NonReadySecretBackendHealth;

type LocalEnvironmentSecretImportResult = {
  targetStatus: LocalEnvironmentSecretImportTargetStatus;
  definitionIds: SecretDefinitionId[];
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
  instructionCode: "RESTART_REQUIRED" | "RUN_REAL_E2E_PREFLIGHT" | "NONE";
};

```

`LocalEnvironmentSecretImportPlanEntry` is outward/value-free. The raw `SecretValue` association is a separate internal short-lived collection scoped to the selected transaction and is never serialized, returned, or stored in the plan/result.

`LocalImportCredentialAliasRegistry` has exactly one meaning: positive current source eligibility. Every definition has one supported source spelling in this delivery; Qwen uses only `DASHSCOPE_API_KEY`. The registry contains no precedence/group machinery, negative pattern, legacy-status flag, provider mode, consumer identity, target, or value.

UC-015 defines no automatic request, migration state, plan, result, or record. Stable v1 reconfiguration guidance is a closed error/status code only; it carries no provider metadata or credential identity.

Local Store logical schema:

```text
store_metadata(
  singleton_id PRIMARY KEY,
  schema_version,
  encryption_format_version,
  pair_verifier_format_version,
  store_id,
  pair_verifier_nonce,
  pair_verifier_ciphertext,
  pair_verifier_tag
)
secret_records(
  definition_id PRIMARY KEY,
  nonce,
  ciphertext
)
```

Record authentication tags may be encoded with `ciphertext` according to the selected vetted library. Pair-verifier tag is explicit because pair initialization/open must validate it before records exist. Pair-verifier and record keys use distinct HKDF-SHA-256 info domains.

## Product-Reachability Decisions

| Premise | Reachability | Witness / Absence | Design Consequence |
| --- | --- | --- | --- |
| fresh worktree lacks ignored credential file | Reachable/current | current Git ignore and test bootstrap behavior | tracked manifest + one machine-global physical real-E2E Store required |
| AutoByteus must mount the host real-E2E Store into Docker | Not Reachable/explicitly out of scope | normal Docker already persists node-local server data; user rejected a prescribed Docker E2E deployment | preserve Compose/launcher/volumes unchanged; do not design mount variables or external E2E volumes |
| Settings and agent server are available without Electron | Reachable/current | direct web/server deployment | Local Store/backend cannot be Electron-owned |
| application organization/environment identity scopes secret access | Not Reachable | no such product model/caller exists | remove generic scope attributes |
| runtime request selects arbitrary backend/Store/path | Not Reachable/forbidden target | configuration is bootstrap-bound | no selector in lifecycle/resolve API |
| local configuration selects among named Store connections/profiles | Not Reachable | approved target has exact default/E2E paths and no generic connection catalog | remove connection/profile alias; tracked live config names canonical E2E files only |
| Local Store requires a daemon to share across worktrees | Not Reachable as a requirement | SQLite file locking and in-process backend satisfy the supported workflow; same-user process adds no security boundary | remove launcher/IPC/protocol machinery |
| default-to-E2E Store copy is required for zero-touch worktrees | Not Reachable as a per-worktree requirement | hidden input or explicit source-to-E2E import gives every later worktree tracked zero-touch access without opening the default Store | remove source/default backend from hidden setup and every Store-to-Store copy command |
| trusted operator needs a bounded source-file-to-Local-Store transition | Reachable/user-approved | user explicitly requested a committed PNPM script with absolute source and explicit default/E2E target | add UC-019 owner/spines; keep it unreachable from runtime/test startup and never genericize target/value/definition input |
| released canonical application credential sources require seamless value preservation | Reachable source, rejected continuity requirement | released AppConfig consumed `${serverDataDir}/.env`; released custom-provider v1 required `apiKey`; the user explicitly accepts reconfiguration rather than any automatic update | leave sources untouched/non-authoritative; project approved non-secret settings only; return value-free v1 guidance; use explicit UI/import paths |
| general AppDataMigrationRunner should own credential movement | Not approved/not proportionate | it depends on AppConfig/Prisma, runs after secret bootstrap, logs general results, and continues after failures; the user rejected the separate machinery needed to correct those constraints | leave it unchanged; no automatic credential movement |
| importer may accept arbitrary Store paths or run noninteractively | Not Reachable/explicitly rejected | requested UX names only default/E2E local custody; no supported automation caller exists | closed target role, internal paths, direct TTY exact phrase, no `--yes` |
| same server handles simultaneous stale expected-version updates as an approved contract | Unclear and not required | current Settings is last-write save with no version field | do not add optimistic-concurrency product API |
| Local Store is deleted by ordinary current `reset-server-data` if nested without change | Reachable/current code | current reset removes entire `server-data` | change reset semantics or require explicit include-Store confirmation |
| empty Local Store can be paired with the wrong key without detection | Reachable under approved pair lifecycle | separate DB/key files can be swapped or partially created before any record exists | authenticate pair verifier on every open; map mismatch/partial/tamper to CORRUPT |
| all-in-one agent container can read a server-mounted secret outside built-in tools | Reachable limitation of current topology/security contract | same container/identity hosts trusted and agent execution | first delivery reports LOCAL_HARDENED only; strong tier explicitly deferred |
| Codex external login state becomes unavailable under synthetic HOME | Reachable/current regression | Codex remains user-selectable; base client inherited real HOME/process environment; ticket helper forces a synthetic home; user directed preservation | restore the single pre-ticket Codex launch path, add no auth subsystem, and exclude Codex inheritance from `LOCAL_HARDENED` |
| Vertex Express mode is lost after correct credential resolution | Reachable/observed | LLM/media provisioning return generic `apiKey`; helper builds AI Studio; real product paths failed while exact-mode diagnostic passed | exact shared Gemini variants plus exhaustive SDK construction and substantive real product-path retest; no fallback |
| the established dual-key Generative Language metadata endpoint is necessarily invalid for Vertex Express | Not established; withdrawn premise | direct `origin/personal` comparison shows this exact dual-key path, and the user confirms it works; code review round 25 withdrew the source-defect inference | preserve current metadata source/owners; correct artifacts only; test exact consumer selection, established request/mapping, curated fallback, and no alternate-definition/ambient fallback |
| test code with direct credential can exfiltrate | Reachable by direct-mode contract | trusted code receives plaintext for SDK | require implementation source review before direct execution and dedicated keys; do not invent runtime attestation or claim impossible non-disclosure |
| Claude current raw API-key mode can receive ambient key | Reachable/current | current auth environment builder supports key aliases and broad parent environment | remove ambient/auto selection and caller env; explicit managed mode must resolve centrally and deliver only to exact child |
| Claude managed child can expose/inherit its own environment through supported tools/settings | Reachable under approved managed mode | credential is intentionally in child env; pinned SDK loads settings and supports process tools unless constrained | empty setting sources, strict explicit MCP, no hooks/plugins/API-key helper, `tools: []`, sanitized AutoByteus MCP tool children, early redaction |
| authorized Claude executable/SDK can observe or retain its credential | Reachable/accepted trust limit | the SDK child must authenticate and receives `ANTHROPIC_API_KEY` | document `LOCAL_HARDENED` limit; do not claim child secrecy or deterministic zeroization |
| every third-party Agent SDK subscription path categorically requires product-specific prior approval | Unclear due to conflicting current official authority | SDK overview/legal pages retain restriction language, while the newer June 15–16 Help Center update expressly says third-party app usage still draws from subscriptions during the paused change; current AutoByteus CLI use succeeds technically | retain the user-approved two-mode spine; record `EXT-ANTHROPIC-AGENT-SDK-AUTH`; ask reviewer to reassess MP-002; do not treat technical success alone as permission proof |
| AutoByteus remote gateway discovery and construction are supported product behavior | Reachable/current | base factory reload calls, `AUTOBYTEUS_LLM_SERVER_HOSTS`, Settings AutoByteus reload, registries, and LLM/audio/image provider wrappers form complete production callers | preserve BEH-013/UC-018 and replace only the credential source with Store-backed resolution |
| a remote AutoByteus model can display a native provider different from its credential owner | Reachable/current contract | gateway results carry provider/model semantics while the request still authenticates to the AutoByteus server | retain explicit non-secret `credentialProviderId`; never infer custody from displayed provider |
| AutoByteus discovery failure should clear every matching displayed-provider model | Not Reachable as a valid consequence | native and remote models coexist in shared registries; only the gateway runtime owns its discovered subset | scope replace/clear by model kind plus runtime owner; preserve last-known-good on pre-authoritative failure |
| first delivery must prove a concrete enterprise adapter | Not Reachable after phasing decision | Local covers approved first-delivery nodes; extension contract can be tested with fixture | ship/register no concrete enterprise adapter and fail unknown kinds closed |
| clean/frozen install can retain obsolete `repository_prisma` patch/version state or a future artifact can regress import/log policy | Reachable/operational contract | current root package registers exact `1.0.6` patch state; latest `1.0.8` fixes the policy upstream, but install and future-resolution drift are real package-boundary risks | treat exact manifest/lock, removal of every repository patch/old resolution, static checks, isolated probes, and clean-install proof as one UC-020 integration unit |
| updating `repository_prisma` requires adopting its lifecycle in production or migrating data | Not Reachable from the approved request | current production source has no package import; Prisma/client peer and schemas stay unchanged | preserve current database owners/data; prohibit production adoption and migration in this ticket |

## Design-Principle Checklist

| Principle / Smell | Result | Evidence / Correction |
| --- | --- | --- |
| approved behavior before structure | Pass | UC-001–019 retain their approved basis; UC-020 is the user-approved exact latest `1.0.8` clean dependency replacement, not a Prisma ORM or ownership change |
| primary spine for every use case | Pass | complete 34-spine inventory and per-use-case sections above, including separate governed/Codex UC-014 paths |
| sufficient span (surface -> owner -> dependency -> outcome) | Pass | each primary spine spans at least the complete real path; small Store-control paths are genuinely shorter |
| return/event spines | Pass | DS-RET001/002 plus per-use-case return outcomes |
| bounded local spine | Pass | Local backend pair-open/write/reset and importer parse/plan/batch stay inside named owners; hidden setup remains target-only |
| ownership clarity | Pass | subject services own runtime use cases; management owns lifecycle; in-process Local backend owns database/crypto; local importer owns only explicit transition; `AppConfig` owns non-secret projection; `CodexAppServerClient` alone preserves external Codex launch; LLM/media provisioning plus `gemini-helper.ts` own exact SDK construction, while metadata provisioning/provider/resolver retain their separate selection/request/merge ownership; package integration owns only manifest/lock/obsolete-patch removal/evidence |
| no mixed-level bypass | Pass | subject/provisioning callers use management, never backend; only Local backend opens its configured DB |
| off-spine concerns do not compete | Pass after correction | binding, redaction, validation, repository, path resolution serve named owners |
| no generalist provisioning owner | Pass after correction | LLM/search/media/metadata retain separate provisioning services; one typed AutoByteus discovery owner centralizes only truly identical gateway refresh policy |
| tight data structures | Pass after removals | generic scope/address/version/connection alias/capability booleans removed; storage and validation status split by owner; one credential-owner field prevents provider-identity overloading; exact inline Gemini variants prevent LLM/media mode erasure, while metadata receives only its selected key and is not forced into an unused SDK-mode union |
| product reachability | Pass | unsupported identity/concurrency attributes rejected; reset and all-in-one risks retained because reachable |
| current-schema runtime | Pass | legacy aliases are excluded before retention and exist only in the explicit-import policy; runtime never parses credential environment values or custom v1 into current state |
| removal first-class | Pass | environment/custom JSON/test dotenv/fallback paths are explicitly removed |
| folder mapping follows ownership | Pass | server management/config, subject provisioning, explicit operator import, in-process Local persistence, and root/package patch integration remain distinct without a migration owner, new workspace process package, or new database owner |
| empty indirection | Pass after correction | management owns catalog lookup plus backend resolution; no caller-visible pass-through binding resolver remains |

## Final Validation Conclusion

The provider/backend pattern is justified by every relevant use case. The in-process Local backend with server-data-derived normal Stores, authenticated empty-Store pair binding, and physically separate host default/real-E2E Stores materially solves local custody and fresh-host-worktree real testing. Existing Docker persistence remains independent and unchanged. First delivery stays bounded to Local/InMemory and `LOCAL_HARDENED`, removes cross-Store copy and ambient Claude raw-key exposure, and adds one precise managed Claude consumer without bypassing the generic service or overstating secrecy from the authorized child. The CR-001 revision preserves the full AutoByteus remote path. UC-019 remains one explicit operator transition and now has the cohesive subject boundary the user required: recognize only current aliases, validate only selected credentials, ignore every other line, and expose no ignored-line metadata or value detail. AR-009 adds no automatic migration/update use case: legacy sources stay untouched and non-authoritative, users explicitly provision/import and clean up, and the ordinary app-data runner is unchanged. UC-020 cleanly replaces patched `repository_prisma@1.0.6` state with exact unpatched `1.0.8`, deletes legacy patch integration, and preserves default-off query logging, existing Prisma owners, schemas, migrations, and persisted data. The CR-019 correction restores one existing external Codex path and explicitly excludes it from the child-environment assurance rather than inventing another auth owner. The CR-020 correction keeps AI Studio, Vertex Express, and Vertex Project exact through LLM/media construction without fallback. The CR-021 reconciliation preserves the separate original metadata contract: exact AI Studio-or-Vertex Store consumer selection, one trusted reveal into the existing Generative Language provider, established response mapping, curated fallback, and Vertex Project zero metadata lookup. It authorizes no metadata source rewrite.

UC-019 recognize-first/empty-as-absent behavior, the no-automatic-legacy-update outcome, exact latest `repository_prisma@1.0.8` with no legacy package path, external Codex preservation, and original dual-key metadata behavior are user-approved. CR-021 is an artifact-only non-regression reconciliation and requires no source redesign or new product choice. The 34-spine cumulative package can return to architecture review. A future multi-tenant organization/environment requirement or production adoption of the dependency's lifecycle must introduce its own approved use cases before adding scope fields or replacing database ownership; neither is anticipated inside this ticket.
