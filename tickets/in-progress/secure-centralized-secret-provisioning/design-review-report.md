# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental Task Artifacts Reviewed: `use-case-spine-validation.md`, `secret-storage-architecture.md`, `secret-storage-backend-contract.md`, `credential-consumer-mapping.md`, `live-test-secret-provisioning.md`, `threat-model-and-option-analysis.md`, `repository-prisma-1.0.8-assessment.md`
- Current Review Round: 19
- Trigger: corrected CR-021 artifact reconciliation preserving the original dual-key Gemini metadata path
- Prior Review Round Reviewed: round 18 plus code-review round 25's reclassified CR-021 Requirement Gap
- Latest Authoritative Round: round 19
- Current-State Evidence Basis: implementation HEAD `ad629bc55ed5c653db957ce46bdbc5092c7738ac`; approved requirements and ten intended/evidence artifacts; direct `origin/personal` inspection of `gemini-helper.ts`, `GeminiModelMetadataProvider`, and `ModelMetadataResolver`; current `ModelMetadataProvisioningService`, metadata provider/resolver, and exact LLM/media construction contracts; code-review round 25's withdrawal of the unsupported source-defect inference; value-free dedicated-E2E status evidence; retained sanitized round-10 execution evidence; and preserved downstream reports/evidence. The target keeps exact Google SDK modes for LLM/media while preserving metadata's separate selected-key Generative Language request/mapping and live-over-curated behavior. No secret-bearing file, Store, database, real authentication state, or credential value was opened.
- Independent Package Checks: exact BEH-001–015, REQ-001–021, AC-001–021, and UC-001–020 sets pass; all ten intended/evidence artifacts exist, have balanced fences, and have no missing relative-file links; the design and validation artifacts contain the same 34 unique spines; 20 Mermaid blocks are present; focused rejected-metadata-redesign scans show the SDK-mode union is limited to LLM/media and the exact selected-consumer metadata branch is preserved; and `git diff --check` passes.
- Containment Evidence: existing implementation, test, API/E2E, delivery, and execution-evidence changes remain preserved and were not reset. This review changed only this reviewer-owned report.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | AR-001–AR-006 | Fail | No | Release scope, health, pair integrity, and Claude authentication required correction. |
| 2 | User-approved correction set | AR-001–AR-006, MP-001 | None | Pass | No | Later withdrawn when AR-006 reopened. |
| 2-Hold | User reopened AR-006 | AR-006 | AR-006 reopened | Blocked | No | Implementation authority withdrawn. |
| 3 | User-approved two-mode Claude revision | AR-001–AR-006, MP-001 | AR-007 / MP-002 | Fail | No | External Anthropic authority was initially treated as an implementation prerequisite. |
| 4 | Complete official Anthropic source set | AR-007 / MP-002 | None | Pass | No | Two-mode design passed; release-time recheck retained. |
| 5 | CR-001 AutoByteus gateway revision | CR-001 | AR-008 | Fail | No | Construction still used displayed provider identity. |
| 6 | Bounded AR-008 target correction | AR-008 | None | Pass | No | Credential-owner construction target became exact. |
| 7 | Explicit-source Local Store importer | Prior basis | None | Pass | No | Superseded when automatic-upgrade behavior reopened. |
| 7-Hold / Decision | User reopened then rejected automatic credential update | Round-7 basis | AR-009 / MP-003 | Blocked / Fail | No | Requirements were decided, then artifacts required revision. |
| 8 | Revised no-automatic-update package | AR-009 / MP-003 | None | Fail | No | Backend contract retained an automatic migration instruction. |
| 9 | Backend bootstrap correction | AR-009 / MP-003 | None | Fail | No | Threat model retained migration ownership. |
| 10 | Residual alias-ownership correction | AR-009 / MP-003 | None | Pass | No | Explicit importer retained; all automatic credential updates removed. |
| 11 | `repository_prisma@1.0.7` dependency revision | All prior findings | AR-010 / MP-004 | Fail | No | Required probe could load dotenv through the selected upstream artifact. |
| 12 | User-approved `repository_prisma@1.0.8` clean replacement | AR-010 / MP-004 | AR-011 | Fail | No | Exact upstream artifact and safe probe resolved AR-010, but one rule retained removed patch ownership. |
| 13 | Bounded AR-011 ownership correction | AR-011 | None | Pass | No | Exact upstream bytes plus regression probes own the policy. |
| 14 | Recognize-first importer and corrected Qwen mapping | All prior findings | AR-012 | Fail | No | Clean-cut target omitted the current legacy-named shared importer domain/type file. |
| 15 | Bounded AR-012 clean-cut mapping correction | AR-012 | None | Pass | No | Exact replacement owner, imports, tests, and removals became explicit. |
| 16 | Empty recognized assignment becomes absent | All prior findings | None | Pass | No | Empty is non-selection before duplicate/value state; populated validation remains. |
| 17 | CR-019 external Codex preservation and CR-020 exact Gemini modes | All prior findings | AR-013, AR-014 | Fail | No | Main paths and supplements expressed the approved corrections, but active design rules still universally governed Codex and the mandatory LLM example contradicted the canonical construction target. |
| 18 | Bounded AR-013/AR-014 reconciliation | AR-013, AR-014 | None | Pass | No | Governed-launch scope is exact; Codex remains the explicit external exclusion; the mandatory example now uses the canonical target and explicit Gemini-mode requirement. |
| 19 | User-confirmed original Gemini metadata reconciliation | CR-021 / CR-MP-022 | None | Pass | Yes | CR-021 is resolved as an artifact-only Requirement Gap: exact SDK modes stay with LLM/media; metadata keeps exact Store consumer selection, its established Generative Language adapter, Vertex Project zero lookup, and live-over-curated behavior. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | Critical | Resolved | First delivery claims `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` is deferred. | Codex is now an explicit exclusion from the child-environment part of that claim. |
| 1 | AR-002 | High | Resolved | First delivery registers Local plus InMemory/test fixtures only. | No enterprise placeholder dependency. |
| 1 | AR-003 | Medium | Resolved | Direct target-specific E2E provisioning; no Store copy/fallback. | UC-019 writes one selected target only. |
| 1 | AR-004 | High | Resolved | Five-state backend health plus READY-only per-definition state. | Degraded control plane remains value-free. |
| 1 | AR-005 / MP-001 | High | Resolved | Random `store_id` plus authenticated pair verifier on every open. | Empty and read-only Stores covered. |
| 1 / 2-Hold | AR-006 | High | Resolved | Exact `cli` and `managed-secret` Claude modes with JIT exact-child delivery and no fallback. | Preserve both modes. |
| 3 | AR-007 / MP-002 | High | Resolved / Reclassified | Official Anthropic sources remain conflicting. | `EXT-ANTHROPIC-AGENT-SDK-AUTH` is a delivery/release recheck, not legal clearance or an implementation blocker. |
| Source review | CR-001 | High | Resolved | BEH-013/REQ-019/AC-019/UC-018 preserve AutoByteus remote LLM/audio/image behavior. | Preserve CR-002–CR-005. |
| 5 | AR-008 | Medium | Resolved | The canonical construction target is exactly `{credentialProviderId, authenticationRequirement}`. | AR-014 is a new contradiction in the revised mandatory example, not a reopening of credential-owner policy. |
| 7–9 | AR-009 / MP-003 | Medium | Resolved | Startup performs read-only non-secret projection; no migration owner or automatic credential transition remains. | Explicit importer stays operator-only. |
| 11 | AR-010 / MP-004 | Medium | Resolved | Exact `1.0.8` removes dotenv discovery; target probes use empty cwd/environment. | No local package patch or production owner. |
| 12 | AR-011 | Low | Resolved | Exact unpatched upstream bytes plus integration probes own the package invariant. | No replacement patch path. |
| 14 | AR-012 | Low | Resolved | Exact current importer domain/service/registry files and import-edge removals are mapped. | No compatibility exports. |
| 17 | AR-013 / MP-006 | Medium | Resolved | Boundary map, Dependency Rule 9, interface row, reusable-policy row, and launch-caller file map now apply only to governed launchers and explicitly exclude Codex. | The single `options.env ?? process.env` Codex path remains separate; no auth subsystem or stronger claim. |
| 17 | AR-014 / MP-007 | Medium | Resolved | Mandatory example now uses exact `{credentialProviderId, authenticationRequirement}`, keeps `modelIdentifier` separate, includes `geminiAuthenticationMode`, and maps explicit configured mode through existing provisioning/config owners. | No competing target, inference, fallback, or new owner. |
| Code review 25 | CR-021 / CR-MP-022 | Medium / Requirement Gap | Resolved | Direct `origin/personal` comparison establishes distinct working contracts: LLM/media use mode-specific Google SDK construction, while metadata accepts either selected API-key mode through one Generative Language request/mapping and resolver fallback. The corrected package carries that distinction through BEH-003, REQ-011, AC-005/006/010, UC-008, DS-UC008C, architecture, backend, consumer, test, and threat artifacts. | No metadata implementation redesign is authorized or required; current source already replaces ambient precedence with exact Store consumer selection. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): Confirmed
- Approved requirements / intended behavior understood: preserve externally authenticated Codex through the single pre-ticket `options.env ?? process.env` launch with real HOME/CODEX_HOME and no AutoByteus credential lifecycle; preserve exact AI Studio, Vertex Express, and Vertex Project Google SDK construction for LLM/media; and separately preserve the original key-authenticated Gemini metadata contract through exact Store consumer selection, the established Generative Language request/mapping, Vertex Project zero lookup, and live-over-curated resolution.
- Relevant existing behavior and evidence confirmed: direct `origin/personal` inspection shows LLM/media were mode-specific, whereas `GeminiModelMetadataProvider` accepted `GEMINI_API_KEY ?? VERTEX_AI_API_KEY` against the same Generative Language models endpoint and `ModelMetadataResolver` merged live fields over curated data. Current source preserves that provider/resolver contract while `ModelMetadataProvisioningService` selects only the configured AI Studio or Vertex Express Store consumer and supplies no live provider for Vertex Project. The user confirms the original dual-key metadata path works; endpoint difference alone does not establish a defect.
- Approved change, preserved behavior, and outside scope understood: CR-021 corrects only the written package. Keep CR-020's exact LLM/media variants/helper; keep the current metadata provisioning/provider/resolver source path; add no metadata SDK-mode union, provider/service/type, endpoint change, alternate-definition retry, ambient alias, Store fallback, or Vertex Project key inference. All previously reviewed Codex, Store, importer, Docker, Claude, AutoByteus, dependency, and assurance decisions remain unchanged.
- Remaining material ambiguity, if any: none. CR-021 and CR-MP-022 are fully reconciled without a metadata source redesign.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | User/System | Pass | Pass | Pass | Confirmed | Governed launchers use empty-base security; the single external Codex path is explicitly excluded. |
| BEH-003 | User/System | Pass | Pass | Pass | Confirmed | Exact LLM/media SDK construction and the separate exact-consumer Gemini metadata request/mapping/fallback path are both explicit and coherent. |
| BEH-004–011 | User/System/Contract/Operational | Pass | Pass | Pass | Confirmed | None. |
| BEH-012 | System | Pass | Pass | Pass | Confirmed | Preserve both Claude modes and external release recheck. |
| BEH-013 | User/System | Pass | Pass | Pass | Confirmed | Preserve AutoByteus remote behavior and the declared endpoint outcome. |
| BEH-014 | Operational | Pass | Pass | Pass | Confirmed | Preserve recognize-first, empty-as-absent, DASHSCOPE-only importer behavior. |
| BEH-015 | Operational/Dependency | Pass | Pass | Pass | Confirmed | Preserve exact unpatched `repository_prisma@1.0.8` and isolated probes. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| use-case-spine-validation.md | Pass | Pass | Pass | Pass | Pass | None. DS-UC008C now reaches the exact selected metadata consumer, established provider request/mapping, resolver merge, and returned catalog without conflating SDK construction. |
| secret-storage-architecture.md | Pass | Pass | Pass | Pass | Pass | None. Its dedicated Gemini metadata sequence preserves all three mode outcomes and the distinct metadata boundary. |
| secret-storage-backend-contract.md | Pass | Pass | Pass | Pass | Pass | None. Exact metadata consumer selection and zero-lookup Vertex Project behavior align. |
| credential-consumer-mapping.md | Pass | Pass | Pass | Pass | Pass | None. AI Studio and Vertex Express rows distinguish LLM/media SDK construction from the shared metadata adapter. |
| live-test-secret-provisioning.md | Pass | Pass | Pass | Pass | Pass | None. LLM/media constructor capture and metadata request/mapping/fallback evidence are correctly separate. |
| threat-model-and-option-analysis.md | Pass | Pass | Pass | Pass | Pass | None. The detailed Gemini decision preserves the two original contracts and rejects the unsupported redesign. |
| repository-prisma-1.0.8-assessment.md | Pass | Pass | Pass | Pass | Pass | None. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | CR-021 is classified as an artifact-only Requirement Gap after direct base comparison and user confirmation; CR-019/020 remain resolved. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Code-review round 24 conflated different LLM/media and metadata contracts; round 25 withdrew that premise after inspecting `origin/personal` and the supported product path. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | No metadata refactor is needed: current exact Store selection plus existing provider/resolver preserve the approved behavior. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | DS-UC008C, dependency/interface rules, file maps, examples, test mapping, and the threat decision all retain existing owners and explicitly prohibit the rejected redesign. | None. |

## Spine Inventory Verdict

The active inventory contains 34 spines: 29 use-case paths, two return/event spines, and three bounded-local spines.

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-UC001–DS-UC006A | Lifecycle/configuration/Store/direct setup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC007–DS-UC008B | LLM/search/media construction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC008C | Gemini live metadata list/reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC009–DS-UC013 | Testing/deployment/Settings | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC014A | Governed launcher hardening | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC014B | External Codex preservation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC015–DS-UC018D | Legacy non-authority/conformance/Claude/AutoByteus | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC019A–DS-UC019C | Explicit importer preview/default/E2E | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-UC020 | `repository_prisma@1.0.8` clean integration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-RET001–DS-RET002 | Status/provider returns | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-LOC001–DS-LOC003 | Local encrypted write/reset/import batch | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| SecretManagementService / backend port | Pass | Pass | Pass | Pass | Catalog lifecycle remains above one bound backend. |
| Subject provisioning / LLMFactory | Pass | Pass | Pass | Pass | Subject provisioning remains above storage-neutral factory/client owners. |
| ModelMetadataProvisioningService / metadata provider / resolver | Pass | Pass | Pass | Pass | Server provisioning alone selects mode and exact Store consumer; the storage-neutral provider owns request/mapping and the resolver owns live-over-curated merge/failure containment. |
| Local backend/repository/setup/importer | Pass | Pass | Pass | Pass | Runtime management, target setup, and operator import remain distinct. |
| Governed execution security / external Codex client | Pass | Pass | Pass | Pass | Governed callers use the security boundary; Codex is explicitly separate and preserves the approved environment/home. |
| Claude / AutoByteus runtime owners | Pass | Pass | Pass | Pass | JIT resolution stays above storage-neutral clients. |
| Dependency package/probe boundary | Pass | Pass | Pass | Pass | No production package owner/import is added. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core consumers -> explicit auth/context | Pass | Pass | Pass | Pass | Core does not import server storage. |
| Subject services -> management -> backend | Pass | Pass | Pass | Pass | No catalog/backend bypass. |
| Metadata catalog -> provisioning -> management -> provider/resolver | Pass | Pass | Pass | Pass | Metadata receives only the selected key at its trusted request boundary; it cannot inspect aliases, retry another definition, or enter the LLM/media SDK union. |
| Governed launchers -> execution security context; Codex -> external launch | Pass | Pass | Pass | Pass | Rule 9 and related rows explicitly scope empty-base rules to governed launchers and preserve DS-UC014B. |
| AppConfig/importer -> exclusion/import policy | Pass | Pass | Pass | Pass | No value/runtime authority. |
| Package integration -> upstream artifact/probes | Pass | Pass | Pass | Pass | Exact unpatched bytes and isolated probes remain coherent. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| Secret management/configuration/backend contracts | Pass | Pass | Pass | Low | Pass |
| `LLMConstructionTarget` / authentication requirement / resolved context | Pass | Pass | Pass | Low | Pass |
| `ModelMetadataProvisioningService` exact mode/consumer selection | Pass | Pass | Pass | Low | Pass |
| `GeminiModelMetadataProvider(apiKey)` / `ProviderModelMetadataProvider` | Pass | Pass | Pass | Low | Pass |
| Governed execution launcher boundary | Pass | Pass | Pass | Low | Pass |
| Codex App Server launch | Pass | Pass | Pass | Low | Pass |
| Claude runtime authentication / child builder | Pass | Pass | Pass | Low | Pass |
| AutoByteus discovery and scoped publication | Pass | Pass | Pass | Low | Pass |
| Local importer / target-bound setup batch | Pass | Pass | Pass | Low | Pass |
| Exact ESM/CommonJS package-policy probe | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| External Codex authentication preservation | Pass | Pass | N/A | Pass | Restore the established client path; create no AutoByteus auth subsystem. |
| Exact Gemini LLM/media construction | Pass | Pass | N/A | Pass | Existing shared contracts/provisioning/helper own the closed SDK variants. |
| Gemini live metadata preservation | Pass | Pass | N/A | Pass | Reuse the existing provisioning/provider/resolver path; do not force it through the LLM/media construction union. |
| Catalog lifecycle and consumer construction | Pass | Pass | Pass | Pass | Existing subject boundaries remain authoritative. |
| Local setup/import persistence | Pass | Pass | Pass | Pass | Existing setup persistence is reused below the importer. |
| Package logging/import validation | Pass | Pass | N/A | Pass | No wrapper or local patch. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core/server LLM and media construction | Pass | Pass | Pass | Pass | Shared union, two provisioning owners, and Gemini helper are the right existing owners. |
| Server/core model metadata | Pass | Pass | Pass | Pass | Existing provisioning, Generative Language adapter, and resolver retain singular selection, request/mapping, and merge ownership. |
| Governed agent execution security / external Codex runtime | Pass | Pass | Pass | Pass | All active rules preserve the split and name Codex as the external exclusion. |
| Secret management / Local storage / importer | Pass | Pass | Pass | Pass | Existing reviewed allocation remains unchanged. |
| Package/dependency integration | Pass | Pass | Pass | Pass | Manifest/lock/removal/probe allocation is sound. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Resolved LLM/media authentication | Pass | Pass | Pass | Pass | One shared exact closed union is the sound target. |
| Selected Gemini metadata credential | Pass | Pass | Pass | Pass | One already-selected key crosses only into the existing request adapter; no metadata mode DTO or duplicate construction union is justified. |
| LLM construction target/requirement | Pass | Pass | Pass | Pass | The mandatory example now reuses the canonical two-field target and exact Gemini-mode requirement. |
| Governed agent launch policy | Pass | Pass | Pass | Pass | Reuse is explicitly limited to governed spawners; Codex is not wrapped. |
| Secret/auth/status contracts | Pass | Pass | Pass | Pass | Existing boundaries remain tight. |
| Import request/plan/result | Pass | Pass | Pass | Pass | Empty remains absence, not DTO state. |
| Dependency probe builder | Pass | Pass | Pass | Pass | One isolated builder covers both entrypoints. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ResolvedLLMAuthentication` / media alias | Pass | Pass | Pass | Pass | Pass | Exact generic/Gemini/none variants are sound. |
| Gemini metadata selected-key boundary | Pass | Pass | Pass | Pass | Pass | The raw key has one narrow meaning after server-owned mode/consumer selection; request mapping and resolver state are not duplicated into a new union. |
| `LLMConstructionTarget` / `LLMAuthenticationRequirement` | Pass | Pass | Pass | Pass | Pass | Exact two-field target, separate model identifier, and tagged Gemini-mode requirement form one representation. |
| Backend health + managed status | Pass | Pass | Pass | Pass | Pass | Definition state remains READY-only. |
| Import request/plan/status | Pass | Pass | Pass | Pass | Pass | No backend/path/value/profile bag. |
| Package integration identity/evidence | Pass | Pass | Pass | N/A | Pass | Exact version/removal/outcomes only. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `codex-app-server-client.ts` | Pass | Pass | Pass | Pass | Exact restoration/removal responsibility is mapped. |
| `llm-construction-context.ts` / `multimedia-construction-context.ts` | Pass | Pass | Pass | Pass | Exact shared-variant ownership is mapped and the corrected example now matches it. |
| LLM/media provisioning services / `gemini-helper.ts` | Pass | Pass | Pass | Pass | Existing owners map mode and SDK options. |
| `model-metadata-provisioning-service.ts` / `gemini-model-metadata-provider.ts` / `model-metadata-resolver.ts` | Pass | Pass | Pass | Pass | Existing files retain exact selection, storage-neutral request/mapping, and live-over-curated responsibilities; CR-021 maps no source change. |
| Secret-management/runtime/importer target files | Pass | Pass | Pass | Pass | Prior exact ownership remains intact. |
| Server/root manifests, lock, obsolete patch, policy test | Pass | Pass | N/A | Pass | Exact unpatched dependency integration remains intact. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex client | Pass | Pass | Low | Pass | Preserve existing external runtime owner. |
| LLM/media construction contracts and helper | Pass | Pass | Low | Pass | Shared core contract plus existing subject adapters is proportionate. |
| Model metadata provisioning/provider/resolver | Pass | Pass | Low | Pass | Separate established metadata contract is clearer than an artificial shared SDK-mode layer. |
| Secret management/configuration/backends/importer | Pass | Pass | Low | Pass | Prior reviewed placement remains intact. |
| Package integration files | Pass | Pass | Low | Pass | No new production folder or wrapper. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Ticket-added Codex helper import/use | Pass | Pass | Pass | Pass | Remove helper use and restore one pre-ticket path; no dual path. |
| Loose Gemini authentication variants | Pass | Pass | Pass | Pass | Replace with exact closed variants and exhaustive helper mapping. |
| CR-021 metadata SDK-mode redesign wording | Pass | N/A | Pass | Pass | Contradictory artifact language is removed; no source mechanism or compatibility path replaces it. |
| Automatic legacy cutover/runtime credential fallbacks | Pass | Pass | Pass | Pass | No replacement migration owner. |
| Legacy-named explicit-import source files | Pass | Pass | Pass | Pass | Prior atomic removal mapping remains explicit. |
| Obsolete `repository_prisma` patch/versions | Pass | Pass | Pass | Pass | Exact unpatched `1.0.8` remains the only target. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Codex launch | No | Pass | Pass | Restoring the one established path is preserved current behavior, not a compatibility wrapper. |
| Gemini construction | No | Pass | Pass | Exact variants replace loose variants; no fallback. |
| Gemini metadata | No | Pass | Pass | Exact current consumer selection replaces ambient precedence; the provider does not retain an alternate-definition, endpoint, or SDK-mode fallback. |
| Runtime credential environment fallback | No | Pass | Pass | Historical names remain exclusion/import policy only. |
| Automatic credential upgrade transition | No | Pass | Pass | Explicit operator import only. |
| `repository_prisma` version/patch integration | No | Pass | Pass | No dual install, wrapper, or patch. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CR-019 external Codex state | Not Affected | Pass | Pass | N/A | Pass | Preserve existing external account/configuration state; do not inspect or migrate it. |
| CR-020 Gemini construction | Not Affected | Pass | Pass | N/A | Pass | Runtime construction-shape correction only. |
| CR-021 Gemini metadata reconciliation | Not Affected | Pass | Pass | N/A | Pass | Documentation-only correction; provider, resolver, schema, cache semantics, and persisted data remain unchanged. |
| Application `.env` non-secret settings | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Name-first projection preserves source bytes. |
| Legacy credentials / custom-provider v1 | Discard or Reprovision; source untouched | Pass | Pass | N/A | Pass | Operator-approved outcome. |
| Explicit assignment source | Explicit Operator Transformation | Pass | Pass | Pass | Pass | Selected-target transaction remains atomic. |
| Local Store | New current schema | Pass | Pass | N/A | Pass | Pair binding and health remain fail-closed. |
| `repository_prisma@1.0.8` | Not Affected | Pass | Pass | N/A | Pass | No schema/data/owner change. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| CR-019 Codex restore plus governed-policy scope | Pass | Pass | Pass | Pass |
| CR-020 shared union/provisioning/helper correction | Pass | Pass | Pass | Pass |
| CR-021 metadata artifact-only reconciliation | Pass | Pass | Pass | Pass |
| Secret contracts/management/consumer cutover | Pass | Pass | Pass | Pass |
| Local backend/importer/no-automatic-update cutover | Pass | Pass | Pass | Pass |
| `repository_prisma@1.0.8` integration | Pass | Pass | Pass | Pass |

The CR-019/020 implementation sequence remains safe and singular: restore the one Codex launch/remove its helper use, then tighten the shared LLM/media union and existing provisioning/helper mappings without a temporary compatibility path. CR-021 adds no implementation seam: align the artifacts, retain the current metadata source path, run proportionate preservation checks, and resume source/API-E2E review.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| External Codex path vs governed launcher path | Yes | Pass | Pass | Pass | DS-UC014A/B and all normative rules now show the same governed/external split. |
| LLM/Gemini construction | Yes | Pass | Pass | Pass | Canonical target, tagged mode requirement, exact provisioning variants, and exhaustive helper mapping are shown together. |
| Gemini metadata selection/request/merge | Yes | Pass | Pass | Pass | The mandatory example and DS-UC008C show exact AI Studio/Vertex Express consumer selection, Vertex Project zero lookup, the existing request adapter, and live-over-curated result without an SDK-mode DTO. |
| Store pair/import transaction | Yes | Pass | Pass | Pass | Prior exact states remain defined. |
| Claude/AutoByteus routing | Yes | Pass | Pass | Pass | Exact consumers/owners remain explicit. |
| Dependency clean replacement/probe | Yes | Pass | Pass | Pass | DS-UC020 remains actionable. |

## Material Premise Validation (Only When Needed)

### MP-001 — A configured Local database/key pair can be mismatched at open

- Related approved requirement or established contract: REQ-012; AC-014/015; UC-005/011.
- Relevant behavior ID(s): BEH-010.
- Initiating basis kind: System.
- Independent product-supported initiating trigger or applicable governing contract: normal server or host-test startup opens the configured physical pair.
- Support evidence: default and E2E startup derive and open separate persistent database/key files.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: startup -> configured pair -> Local initializer/backend open -> pair verification -> READY or CORRUPT.
- Lifecycle preconditions and material consequence at the claimed point: both files exist but do not belong together; an empty Store otherwise lacks a ciphertext witness.
- Reachability: Reachable.
- Review consequence / proportionate response: satisfied by random `store_id` and authenticated pair verifier on every open.

### MP-002 — External Claude account authentication categorically blocks implementation absent product-specific approval

- Related approved requirement or established contract: BEH-012, REQ-018, AC-018, UC/DS-UC017.
- Relevant behavior ID(s): BEH-012.
- Initiating basis kind: System.
- Independent product-supported initiating trigger or applicable governing contract: default `cli` discovery/run uses pre-existing node-local Claude account state with zero secret lookup.
- Support evidence: current integration is local/self-hosted without an AutoByteus login broker or pooled subscription service; official Anthropic sources conflict.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: discovery/run -> Claude SDK client -> CLI mode -> sanitized node-local account environment -> child.
- Lifecycle preconditions and material consequence at the claimed point: authorization remains externally governed and cannot be established solely by technical success.
- Reachability: Not Reachable as a categorical implementation blocker on current evidence; precise external authorization remains unclear.
- Review consequence / proportionate response: retain `EXT-ANTHROPIC-AGENT-SDK-AUTH` as a delivery/release recheck only; no silent mode change.

### MP-003 — Existing users can start the upgrade with credentials in canonical legacy sources

- Related approved requirement or established contract: BEH-008, REQ-014, AC-009, UC/DS-UC015.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: System.
- Independent product-supported initiating trigger or applicable governing contract: an existing user starts the upgraded server with previously supported application `.env` and/or custom-provider-v1 data.
- Support evidence: released AppConfig/custom-provider schemas used those sources.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: startup -> non-secret projection/current provider read -> source remains untouched/non-authoritative -> Store-only runtime.
- Lifecycle preconditions and material consequence at the claimed point: plaintext values may remain on disk, but startup must neither mutate nor use them.
- Reachability: Reachable.
- Review consequence / proportionate response: no automatic updater or runtime fallback; explicit provisioning/import only.

### MP-004 — Exact `repository_prisma@1.0.8` entrypoint import loads a supported legacy `.env`

- Related approved requirement or established contract: REQ-021; AC-021; UC/DS-UC020.
- Relevant behavior ID(s): BEH-015.
- Initiating basis kind: Operational.
- Independent product-supported initiating trigger or applicable governing contract: developer/CI executes exact-entrypoint package-policy validation.
- Support evidence: exact `1.0.8` has no dotenv dependency/import or `.env` discovery; approved probes use empty cwd/environment.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: clean validation -> isolated child -> exact installed ESM/CJS import -> no dotenv discovery/client acquisition -> synthetic assertions.
- Lifecycle preconditions and material consequence at the claimed point: rejected `1.0.7` behavior is absent from exact target bytes.
- Reachability: Not Reachable in the approved `1.0.8` target.
- Review consequence / proportionate response: retain isolated regression verification; add no wrapper, patch, fallback, or owner.

### MP-005 — The supported explicit source can contain an empty recognized placeholder alongside populated credentials

- Related approved requirement or established contract: BEH-014, REQ-020, AC-020, UC/DS-UC019.
- Relevant behavior ID(s): BEH-014.
- Initiating basis kind: Operational.
- Independent product-supported initiating trigger or applicable governing contract: trusted operator invokes the committed importer with an explicit absolute current application source and closed target.
- Support evidence: retained value-free evidence shows a recognized empty Gemini placeholder alongside populated current aliases.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: PNPM command -> file checks -> recognize/normalize empty to absence -> populated selections -> value-free plan -> selected Store transaction.
- Lifecycle preconditions and material consequence at the claimed point: empty placeholder previously blocked otherwise valid populated selections.
- Reachability: Reachable.
- Review consequence / proportionate response: empty is absent before selection/duplicate state; all-empty remains no-mapped before target access.

### MP-006 — A supported Codex runtime launch requires externally established Codex account/home state

- Related approved requirement or established contract: BEH-002, REQ-004, AC-003/013, UC/DS-UC014B.
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: the runtime-selection product surface allows the user to select Codex App Server after completing the supported external `codex login` action.
- Support evidence: the pre-ticket client used `options.env ?? process.env`; Codex remains user-selectable; current ticket helper substitutes a synthetic HOME and hides the account state.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Codex runtime selection -> client manager -> `CodexAppServerClient.start` -> real HOME/CODEX_HOME environment -> Codex app-server -> external account state -> model/thread/turn result or sanitized failure.
- Lifecycle preconditions and material consequence at the claimed point: login exists outside AutoByteus; empty-base synthetic HOME makes the supported runtime appear unauthenticated.
- Reachability: Reachable.
- Review consequence / proportionate response: restore the one pre-ticket environment path, exclude it honestly from child-environment assurance, and scope every governed-launch rule accordingly. The corrected design satisfies this without inventing a Codex auth subsystem.

### MP-007 — A configured Vertex Express product request can reach SDK construction with the right key but the wrong mode

- Related approved requirement or established contract: BEH-003, REQ-005/011, AC-005/010, UC/DS-UC007/008.
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: the existing provider configuration surface selects `GEMINI_SETUP_MODE=VERTEX_EXPRESS`, and users invoke supported Gemini LLM/audio/image product actions.
- Support evidence: current LLM/media provisioning selects the Vertex Express credential slot but emits generic `apiKey`; current helper maps generic API key to `GoogleGenAI({apiKey})`; retained sanitized evidence records the product-path failure and corrected-mode diagnostic distinction.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: configured Vertex Express mode -> LLM/media action -> provisioning -> Store-backed Vertex Express resolve -> construction context -> Gemini helper -> Google SDK -> provider result/failure.
- Lifecycle preconditions and material consequence at the claimed point: credential resolution succeeds but mode erasure constructs AI Studio semantics, so real Vertex Express product behavior fails.
- Reachability: Reachable.
- Review consequence / proportionate response: preserve mode in exact shared variants and keep the mandatory target/requirement example aligned with that path. The corrected design satisfies the contract; real LLM/audio/image evidence remains necessary, with no fallback or new owner.

### CR-MP-022 — Configured Vertex Express model listing reaches the preserved dual-key Gemini metadata endpoint

- Related approved requirement or established contract: BEH-003, REQ-005/011, AC-005/006/010, UC-008, and DS-UC008C.
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: the existing provider Settings surface selects `GEMINI_SETUP_MODE=VERTEX_EXPRESS`, and the user opens a supported model selector/provider view or invokes model reload.
- Support evidence: web model-list/reload reaches `LlmProviderService` and `ModelCatalogService`; direct `origin/personal` inspection shows metadata accepted `GEMINI_API_KEY ?? VERTEX_AI_API_KEY` against the Generative Language models endpoint while LLM/media separately used mode-specific `GoogleGenAI` options; the user confirms that original metadata behavior works. Current source selects the exact Vertex Express metadata Store consumer, and retained value-free status evidence reports that definition READY/CONFIGURED in the dedicated E2E Store.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Settings/model selector or reload -> GraphQL/LlmProviderService -> ModelCatalogService -> ModelMetadataProvisioningService -> explicit Vertex Express mode -> exact `llmMetadata/GEMINI/geminiVertexExpressApiKey` resolve -> selected value reveal to `GeminiModelMetadataProvider` -> established Generative Language models request/mapping -> ModelMetadataResolver live-over-curated merge -> returned catalog.
- Lifecycle preconditions and material consequence at the claimed point: the Store is ready and the selected definition is configured. The endpoint differs from LLM/media SDK construction, but that difference does not establish a metadata failure; treating it as proof would force an unsupported source rewrite and conflate distinct working contracts.
- Reachability: Reachable for the metadata product path; the claimed necessary-failure consequence is not established by that reachable path or by the downstream endpoint itself.
- Review consequence / proportionate response: resolve CR-021 by aligning the artifacts to the preserved contract. Keep exact LLM/media SDK modes, exact Store-backed metadata consumer selection, the current provider/resolver, Vertex Project zero lookup, and curated fallback. Add no metadata source redesign, alias, fallback, or new owner.

AR-013 and AR-014 remain resolved. CR-MP-022 establishes a supported metadata journey but does not support the withdrawn necessary-failure premise; the round-19 design therefore preserves existing owners rather than introducing machinery justified by the endpoint alone.

## Unresolved Approved-Behavior Or Current-State Gaps

None. Requirements, current-state evidence, and target design are coherent.

## Review Decision

Pass. CR-021 is resolved as an artifact-only Requirement Gap. The cumulative package now distinguishes the two original Gemini contracts consistently: exact AI Studio/Vertex Express/Vertex Project Google SDK construction for LLM/media, and exact Store consumer selection followed by the established key-authenticated Generative Language metadata provider and live-over-curated resolver, with zero metadata lookup for Vertex Project. No metadata source redesign, new owner, inference, alias, retry, or fallback is authorized. AR-013/014 and every earlier decision remain resolved. The design is coherent, proportionate, and ready to resume the implementation/source-review flow.

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Preserve all downstream dirty implementation/test/report/evidence state without reset; it is evidence/context, not architecture authority.
- CR-021 authorizes no metadata production-source rework. `ModelMetadataProvisioningService` must continue selecting only the exact configured AI Studio or Vertex Express consumer, `GeminiModelMetadataProvider` must retain its established request/mapping boundary, `ModelMetadataResolver` must retain live-over-curated behavior, and Vertex Project must perform zero metadata secret lookup.
- Implementation must restore only the single pre-ticket Codex launch line and remove its ticket-added helper import. It must not add a Codex Store consumer, login/account RPC, mode, status, rotation, synthetic home, wrapper, fallback, or environment non-inheritance claim.
- Both LLM and media must carry exact Gemini variants through the shared union; real Vertex Express LLM/audio/image product paths must pass. Metadata validation is separate: READY/CONFIGURED status proves custody only, not live endpoint success, and any real model-list/reload claim must report the established metadata request/catalog outcome accurately. The same-credential corrected-mode diagnostic remains supporting evidence only.
- The declared AutoByteus endpoint's DNS-unavailable result remains allowed by AC-019(f); no alternate endpoint or credential-failure inference is authorized.
- `LOCAL_HARDENED` does not resist arbitrary same-user/same-container inspection; Codex is excluded from its child-environment portion, and `STRONG_AGENT_ISOLATION` remains deferred. The authorized managed Claude child can observe its credential.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a delivery/release source recheck, not legal advice or clearance and not authority for a silent authentication-mode change.
- Preserve recognize-first/empty-as-absent importer behavior, sole Qwen `DASHSCOPE_API_KEY`, no automatic legacy update, exact unpatched `repository_prisma@1.0.8`, unchanged Docker behavior, both Claude modes, external Codex behavior, Vertex Express declarations, sanitized OpenAI/AutoByteus evidence classifications, CR-002–CR-005, and CR-009–CR-020.

## Latest Authoritative Result

- Review Decision: Pass
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): Pass. CR-MP-022 provides the complete supported model-list/reload path and distinguishes path reachability from the withdrawn necessary-failure inference. The design preserves proportionate existing-owner behavior, and no in-scope machinery depends on the downstream endpoint proving its own defect.
- Notes: the cumulative round-19 package is architecture-approved. CR-021 requires no metadata source rework; implementation engineering should preserve current source, reconcile its handoff if needed, and route the cumulative package back through source review before API/E2E resumes.
