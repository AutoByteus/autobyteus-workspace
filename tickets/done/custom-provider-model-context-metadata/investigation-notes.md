# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete for SR-017 architecture review`
- Investigation Goal: Preserve the passed exact-metadata, configurable-Qwen, and readable-custom-identity solution while deciding whether collision-safe Qwen selectors should be visible labels. Trace the current DR-009 browser/API/request path and define the smallest consistent friendly-label correction without changing internal or wire identity.
- Scope Classification (`Small`/`Medium`/`Large`): `Large`
- Scope Classification Rationale: Metadata and Qwen changes are bounded, but readable identity affects provider persistence, startup migration order, structured model selectors, resumable state, and missing-model UX.
- Scope Summary: Preserve the implemented SR-016 scope. For SR-017 only, make existing Qwen friendly names visible across live catalog-backed AutoByteus selection surfaces through the shared label owner; keep prefixed selectors internal and retain exact unprefixed request values.
- Primary Questions Resolved:
  1. Which custom metadata can be inferred safely when `/models` omits context limits?
  2. How can Qwen support regional and Token Plan endpoints without hardcoding one URL?
  3. Which exact native Qwen offerings and global identifiers are needed?
  4. How should a user-entered provider name become the provider component of model identity?
  5. Which legacy data is worth preserving versus resetting for simplicity?
  6. Is extending existing-provider key repair justified, or can the unchanged create flow handle re-entry?
  7. What happens to defaults, bindings, application launch state, and resumable runs while the provider/model is absent?
  8. What migration ordering is necessary after rejecting crash-perfect recovery?
  9. Are `qwen:...` prefixes product labels or only collision-safe internal selectors?
  10. If internal-only, should friendly labels be a Settings exception or a shared policy across model-selection surfaces?
  11. Can the change reuse existing `ModelInfo.name`/`providerType` without a new attribute or catalog/routing change?

## Request Context

The request evolved through explicit user refinements:

1. Custom OpenAI-compatible endpoints can return exact model IDs but omit context metadata, preventing model-derived token budgeting and compaction.
2. Custom inference routes should reuse internal metadata only when their exact model value matches a built-in definition; otherwise capacity stays unknown.
3. Alibaba-specific endpoint profiles, URL matching, region/plan attributes, and aliases overcomplicate a generic custom-provider path and must be removed.
4. Native Qwen must let each user enter the Alibaba Base URL and matching key because region, workspace, and Token Plan routes differ.
5. Native Qwen must include exact values `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; `qwen3.8-max-preview` is obsolete.
6. A model identifier should be provider identity plus the exact model value. The existing composite already has that shape, but the custom provider component is an unreadable backend UUID even though the user supplies a unique name.
7. New custom provider IDs should derive from the frontend-entered name; the frontend should not add a separate ID field.
8. The earlier seamless V2-to-V3 design became crash-perfect and secret-preserving. The user explicitly superseded that posture.
9. The user first asked to preserve easy deterministic non-secret state, especially exact selectors, but then made simplicity authoritative: legacy provider records, Base URLs, and keys may be removed and re-entered through the frontend.
10. The smallest final posture is to use each valid legacy name transiently to map selectors to the future readable ID, publish empty V3, and let the user recreate the provider through the unchanged add form. No reconnect specialization or credential-state attribute is needed.
11. Optimistic interruption behavior is acceptable. Do not retain a private journal, backups, completion receipt, special runner retry, runtime UUID alias, or generalized migration/reset framework.
12. During hands-on testing of DR-009, the user challenged the visible `qwen:` prefixes. API-REV-009 reproduced them against the packaged backend and proved that they are internal collision-safe selectors, not values sent to Alibaba.
13. The product decision for SR-017 is to display the already-available friendly Qwen `name` consistently on every live catalog-backed AutoByteus model-selection/list surface while retaining `qwen:...` for storage, selection, and routing. A Settings-only branch would create inconsistent labels and is unnecessary because a shared label owner already serves the relevant surfaces.

`ARCH-REV-010` passed SR-016, which is implemented and packaged in DR-009. API-REV-009 is current evidence of the presentation gap. The SR-017 delta requires a fresh architecture decision; it does not invalidate unchanged SR-016 routing, persistence, or migration behavior.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata`
- Current Branch: `codex/custom-provider-model-context-metadata`
- Current Worktree / Working Directory: dedicated ticket worktree at the workspace root above
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: DR-009 refreshed and merged `origin/personal@37660dd61347b630889a698769af5641566357bb` on 2026-08-10
- Task Branch HEAD: `331ff94da3c2c9a2a07e11efff68f5307a4cfabb`
- Recorded Divergence: ahead 17, behind 0 before current report/artifact edits
- Expected Base Branch: `personal`
- Expected Finalization Target: refreshed ticket branch integrated against the latest tracked `origin/personal`
- Bootstrap Blockers: none for solution design
- Notes For Downstream Agents: Delivery owns the eventual remote refresh. Current downstream report/probe edits belong to API-REV-009/DR-009 and must not be overwritten. SR-016 production behavior is implemented; SR-017 source has not been implemented by the solution designer.

Bootstrap commands:

```bash
git branch --show-current
git rev-parse HEAD
git rev-parse origin/personal
git rev-list --left-right --count HEAD...origin/personal
git worktree list --porcelain
git status --short
```

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` | Native Qwen Base URL/API-key journey, UI states, and live model presentation | Dynamic endpoint entry, server-owned default/configured projection, durable pair-save outcomes, friendly Qwen labels with internal selectors | Requirements, design | REQ-005–REQ-008, REQ-010–REQ-012, REQ-016; AC-007–AC-014, AC-020, AC-021 | Refined for SR-017 | User-approved setup scope; user hands-on feedback establishes label intent; architecture review pending | Review with SR-017 package |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md` | Readable identity and reset/selector transition | ID codec, V1/V2 reset, exact selectors/order, optimistic execution, provider-absent interval, recreation | Requirements, investigation, design | REQ-013–REQ-015; AC-015–AC-019 | Refined for SR-016 | User-approved and passed by ARCH-REV-010 | No SR-017 content change |

Sanitized live-probe findings are embedded below. No raw response or secret-bearing artifact is promoted.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-30 | Trace | Local GraphQL token-summary trace for the reported run | Confirm why compaction capacity was missing | Prompt usage existed, but `effectiveContextWindowTokens` and percentage were null | No |
| 2026-07-30 | Probe | Authenticated `GET {saved-custom-baseUrl}/models` | Inspect provider metadata | HTTP 200; ID/ownership fields only; no context/input/output limit | No |
| 2026-07-30 | Probe | Minimal authenticated `POST {saved-custom-baseUrl}/chat/completions` | Check alternate metadata source | Usage counts only; no model limit | No |
| 2026-08-06 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts` | Inspect advertised metadata normalization | Strict positive-integer aliases and discovery resilience already exist | Preserve |
| 2026-08-06 | Code | `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Inspect custom fallback | Current branch contains Alibaba profiles, endpoint matching, aliases, and exact built-in fallback | Retain only exact fallback |
| 2026-08-06 | Code | `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Inspect source contract | Source union includes obsolete `endpoint_profile` | Remove variant |
| 2026-08-06 | Code | `autobyteus-ts/src/llm/api/qwen-llm.ts` | Inspect Qwen route ownership | Constructor hardcodes Singapore pay-as-you-go URL | Replace with effective endpoint resolver |
| 2026-08-06 | Code | `autobyteus-ts/src/llm/supported-model-definition.ts`, `supported-model-definitions.ts` | Inspect model identity/catalog | `modelIdentifierOverride` already separates duplicate provider offerings without changing wire value | Reuse; no new identity field |
| 2026-08-09 | Code | `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts` | Verify reported Qwen omission | Native list omitted `deepseek-v4-flash-0731` | Add exact definition |
| 2026-08-06 | Code | `autobyteus-ts/src/agent/token-budget.ts` and compaction/token-meter consumers | Trace metadata effect | Known context drives derived budget/compaction; unknown remains null | Preserve |
| 2026-08-06 | Code | `autobyteus-server-ts/src/config/app-config.ts:502-578` | Test Qwen durability premise | `set` mutates session then can swallow `.env` write failure | Add narrow strict durable setter |
| 2026-08-06 | Code | provider credential catalog and `secret-management-service.ts` | Inspect Qwen/custom secret ownership | Qwen already uses `provider.qwen.api-key`; service can snapshot/restore a command-local `SecretValue` | Use bounded Qwen compensation only |
| 2026-08-09 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`, `llm-factory.ts` | Inspect custom identity | Selector is already `openai-compatible:<providerId>:<exact-model-id>`; request sends exact model value | Change only provider component |
| 2026-08-09 | Code | `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Inspect provider ID creation | Store generates `provider_<UUID>` in V2 | Replace with shared name-derived codec |
| 2026-08-09 | Code | `llm-provider-service.ts` and provider domain models | Inspect create/uniqueness | Browser input is `{name,baseUrl,apiKey}`; service name precheck is separate from append | Store must own final atomic uniqueness |
| 2026-08-09 | Data | Sanitized `llm/custom-llm-providers.json` inspection | Verify representative legacy shape | V2 record has UUID ID plus name/Base URL; name can derive the future ID | Use name transiently for mapping, then reset record/Base URL |
| 2026-08-09 | Code | `autobyteus-ts/src/llm/custom-llm-provider-config.ts` | Inspect canonical schema reader | Baseline accepts V2; clean target needs strict V3 ID/name invariant | Runtime becomes V3-only |
| 2026-08-09 | Code | custom secret ID/catalog and vault crypto | Check rename implications | UUID is embedded in authenticated secret ID; safe secret transfer would require value resolution/re-encryption | User rejects transfer; never resolve/copy |
| 2026-08-09 | Code | `custom-provider-v1-app-data-migration.ts` | Inspect V1 inline secret path | Existing migration copies inline key into vault before V2 | Change direct V1 upgrade to secretless V2 staging |
| 2026-08-09 | Code | `app-data-migration-registry.ts`, runner, record repository, `server-runtime.ts` | Inspect startup behavior | Runner records state, continues after failed/recent-running items, and treats recent `RUNNING` as active for 15 minutes | Keep ordinary behavior; add only terminal readable gate |
| 2026-08-09 | Code | `token-usage-provider-name-snapshot-backfill-migration.ts` | Inspect old-ID consumer | It resolves missing provider names by old UUID from model identifier/provider map | Must finish before V3 publication |
| 2026-08-09 | Code | remove-global-skill, team-member-tree, remove-self-evolution migrations | Inspect selector writers | They can rewrite bindings/run/team metadata that readable identity manages | Must finish before readable migration |
| 2026-08-09 | Code | `token-usage-legacy-path-columns-drop-migration.ts` | Find narrow prerequisite precedent | Exact migration-record terminal check already exists | Reuse pattern, no dependency framework |
| 2026-08-09 | Code | agent/team definition providers and web forms | Inspect missing default selector | Raw nonempty identifier is stored; selection controls display missing raw value | Preserve behavior |
| 2026-08-09 | Code | external-channel binding provider, launcher, binding editor | Inspect missing binding selector | Binding stores required string and forwards it; missing model later fails activation; editor can display raw value | Preserve stored selector/no fallback |
| 2026-08-09 | Code | application resource config store and launch-profile editors | Inspect application state | Server accepts raw selector; team editor blocks unavailable; agent editor uniquely clears non-catalog value on load | Correct agent editor to retain-and-block |
| 2026-08-09 | Code | run/team metadata stores, activation/backend factory paths | Inspect resume | Metadata preserves selector; `LLMFactory.createLLM` throws not found; inactive command surfaces `ACTIVATION_FAILED` | Preserve viewability and explicit failure |
| 2026-08-09 | Code | GraphQL `saveProviderApiKey`, web provider store/runtime/editor | Check reconnect capability | Generic chain exists, but the supported custom path remains create/delete | Compare extension cost with recreation |
| 2026-08-09 | Code | `LlmProviderService.setProviderApiKey`, `ProviderAPIKeyManager.vue`, `CustomProviderDetailsCard.vue`, `CustomProviderEditor.vue` | Verify actual custom repair/recreation | Existing-record key save rejects custom IDs and details has no key editor; add-custom-provider already accepts name/Base URL/key, probes, creates, saves, and reloads | Reuse unchanged create flow; do not add reconnect branch |
| 2026-08-09 | Command | `git fetch origin personal`; `git rev-parse`; `git rev-list --left-right --count` | Refresh bootstrap facts | Recorded HEAD/base/divergence above | Delivery refresh later |
| 2026-08-10 | API/E2E evidence | `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (`API-REV-009`) and `probes/api-e2e/qwen-prefix-*` | Reproduce user's DR-009 screen and separate display/selector/wire identity | Real Chrome showed the three `qwen:` labels; live GraphQL returned distinct friendly names and exact unprefixed values; read-only execution succeeded | Use as SR-017 current-production evidence |
| 2026-08-10 | Code | `autobyteus-web/utils/modelSelectionLabel.ts` and `utils/__tests__/modelSelectionLabel.spec.ts` | Identify governing label policy and current regression boundary | Shared helper uses friendly names only for custom `OPENAI_COMPATIBLE`; default AutoByteus models otherwise show `modelIdentifier` | Extend narrowly for Qwen and preserve existing cases |
| 2026-08-10 | Code | `ProviderModelBrowser.vue`, `useRuntimeScopedModelSelection.ts`, `messaging-binding-flow/launch-preset-model-selection.ts`, `useMediaDefaultModelsCard.ts` | Inventory live model-selection/list consumers | Settings cards, shared runtime selectors, binding launch selectors, and media defaults already call the same label helper | One owner can enforce consistent presentation |
| 2026-08-10 | Code | consumers of `useRuntimeScopedModelSelection` and `SearchableGroupedSelect.vue` | Confirm model-selection reach | Agent/team run configuration, application agent/team/member setup, and workspace member overrides receive shared friendly option/selected labels; missing synthesized choices remain raw | No component-specific label policy needed |
| 2026-08-10 | Code | `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts`, live API-REV-009 JSON, `openai-compatible-llm.ts` | Verify required fields and request path | Friendly names already exist; `providerType=QWEN`; `modelIdentifier` is prefixed only for duplicates; request uses `model.value` | No catalog/API/schema/routing change |
| 2026-08-10 | Command | focused `rg` inventory for `modelSelectionLabel`, grouped options, and raw model-identifier labels | Find bypassing active surfaces | All active catalog-backed selectors found use shared helper; legacy `components/agentInput/GroupedSelect.vue` has no current consumer | Leave unused legacy component outside this delta |
| 2026-08-10 | Command | `git rev-parse HEAD origin/personal`; `git rev-list --left-right --count HEAD...origin/personal` | Refresh task state after DR-009 | HEAD `331ff94d...`; base `37660dd...`; ahead 17/behind 0 before current artifact edits | Delivery refresh later |

### External / Public Sources Previously Consulted

| Date | URL | Relevant Finding | Design Use |
| --- | --- | --- | --- |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/what-is-model-studio` | Base URLs vary by region/workspace and are used with an API key | User-configurable native Qwen endpoint |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/deepseek-api` | Region-specific service endpoints and exact Alibaba-served DeepSeek values | Exact native offering, no custom URL profile |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/text-generation-model` | Alibaba publishes route-specific static model capacity information | Curated Qwen metadata provenance |
| 2026-08-06 | `https://www.alibabacloud.com/help/en/model-studio/token-plan-overview` | Token Plan provides its own Base URL/key and named offerings | Dynamic pair configuration |

User-provided screenshots on 2026-08-09 showed the live Alibaba catalog including exact `deepseek-v4-flash-0731` while the native Qwen list omitted it. The screenshot says `0731`, not `0713`.

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Custom provider discovery succeeds | saved Base URL/key -> discovery -> strict optional limit normalization -> discovered model | Valid advertised limits attach to model; bad/missing values fall through | Current discovery/resolver files; retained live probe and API-REV-008 evidence |
| BEH-002 | System | Discovered model lacks one or more limits | custom provider -> exact metadata resolver -> exact definitions/unknown | Current branch has no endpoint profile/alias policy; exact case-sensitive value only | Current custom metadata file/tests and API-REV-008 |
| BEH-003 | System | Runtime selects a model with known/unknown context | model catalog -> token budget -> compaction/meter | Known capacity enables derived budget; unknown stays null | Token-budget/UI/runtime consumers and retained coverage |
| BEH-004 | User | Settings saves Qwen Base URL/key | Qwen form -> GraphQL -> provider service -> probe -> secret -> strict AppConfig -> status/catalog refresh | Current pair is all-new or truthful previous-restored/repair-required | Current Settings/server/core files; API-REV-008/DR-009 |
| BEH-005 | User/System | User opens/selects native Qwen models | supported definition registry -> GraphQL groups -> selection UI -> factory -> Qwen API | Four exact offerings exist; duplicate selectors are prefixed; exact values go on wire | Current definitions, API-REV-009 JSON, retained lifecycle coverage |
| BEH-006 | User/System | Existing install has Qwen key and no URL or user saves an endpoint | Qwen status/config -> effective resolver -> API | Server distinguishes DEFAULT/CONFIGURED and preserves historical absent-setting route | Current AppConfig/provider service/Qwen adapter and retained coverage |
| BEH-007 | User/Operational | User creates custom provider; installed data upgrades; user launches/resumes with saved selector | create form -> service/store readable V3 -> composite selector; startup reset/mapping -> config/binding/application/run readers -> factory | Readable identity/reset/recreation and retain-and-block missing behavior are implemented | ARCH-REV-010; implementation/code/API-E2E/delivery evidence through DR-009 |
| BEH-008 | User | User opens Settings/Qwen or any live AutoByteus catalog-backed model selector | Qwen definition -> GraphQL `ModelInfo` -> shared `getModelSelectionOptionLabel` -> card/grouped option/selected label | Current default-runtime policy renders `modelIdentifier`, exposing `qwen:` despite a distinct friendly `name`; selected ID remains collision-safe and outbound request uses unprefixed `value` | API-REV-009 live JSON/browser/screenshot/integrity evidence plus shared-consumer source trace |

## Design Health Assessment Evidence

- Change posture: `Behavior Change / Refactor`
- Candidate root cause classification: `Boundary Or Ownership Issue`, `Missing Invariant`, `Duplicated Policy Or Coordination`, `Legacy Or Compatibility Pressure`; SR-017 specifically is `Missing Invariant`.
- Refactor posture evidence summary: The cumulative design corrections remain valid. For SR-017, the shared label owner and transport shape are healthy; it lacks one provider-scoped presentation invariant. A local shared-policy extension is sufficient, while component-specific branches or a new catalog attribute would duplicate policy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Custom metadata resolver | Endpoint profiles and aliases sit in generic custom logic | Remove misplaced policy; keep exact generic inference | Implement after architecture pass |
| Qwen adapter/settings | Runtime route is hardcoded and UI is key-only | Extend native Qwen owner with endpoint policy/form | Implement after pass |
| Store/service create path | UUID generation and split uniqueness checks | Shared codec + store-atomic invariant needed | Implement after pass |
| V1/V2 secret paths | Secret transfer is possible but user explicitly rejects it | Remove transfer/recovery complexity; re-entry is product contract | Implement after pass |
| Existing custom create path | Already accepts/probes/saves `{name,baseUrl,apiKey}` | Reuse it after reset; avoid reconnect specialization | Preserve unchanged |
| Missing-selector paths | Most preserve raw value; one clears it | Align app-agent editor with established retain-and-block behavior | Implement after pass |
| Shared selection-label helper | Already centralizes live option/selected labels, but default AutoByteus branch exposes Qwen internal selectors | Extend this owner for `providerType=QWEN`; no structural refactor | Implement after fresh pass |
| Qwen catalog/API/request fields | Existing `name`, `modelIdentifier`, `value`, and `providerType` have singular meanings | Reuse the current tight structure; add no display field | Preserve |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Custom metadata policy | Current advertised/exact-only implementation is correct | No SR-017 change |
| `autobyteus-ts/src/llm/api/qwen-llm.ts` | Qwen client adapter | Current configured endpoint and exact `model.value` request behavior are correct | No SR-017 change |
| `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts` | Qwen static catalog | Current definitions already provide exact identifiers, friendly names, values, and metadata | Reuse unchanged |
| `autobyteus-ts/src/llm/custom-llm-provider-config.ts` | Custom provider file schema | Target V3 invariant belongs here | Strict V3 runtime parser |
| `autobyteus-ts/src/llm/custom-llm-provider-identity.ts` | Shared readable-ID codec | Implemented SR-016 owner remains correct | No SR-017 change |
| `.../stores/custom-llm-provider-store.ts` | Provider persistence | Implements V3 name-derived/store-atomic uniqueness | No SR-017 change |
| `.../services/llm-provider-service.ts` | Provider workflows | Implements Qwen pair and readable custom create flows | No SR-017 change |
| `.../migrations/custom-provider-v1-app-data-migration.ts` | V1 transition | Implements secretless staging | No SR-017 change |
| `.../migrations/custom-provider-readable-id-app-data-migration.ts` | Readable transition | Implements ARCH-REV-010 optimistic reset/mapping | No SR-017 change |
| `.../migrations/custom-provider-migration-name-snapshot.ts` | Migration-only provider names | Needed by old-ID token snapshot and mapping | Retain narrow missing/V2/V3 projection |
| `.../migrations/custom-provider-readable-id-prerequisite-guard.ts` | Exact ordering check | Proportionate remaining safety | Retain fixed allowlist only |
| `.../migrations/custom-provider-readable-id-*-state/recovery/secret*` | Superseded SR-015 machinery | Removed by implemented SR-016 | Keep absent |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` | Provider settings composition | Existing custom editor supports add/create; saved card supports delete | Reuse unchanged add flow after empty-V3 reset |
| `CustomProviderDetailsCard.vue` | Saved custom details | Read-only details/delete | No reconnect change needed because no migrated record remains |
| `ApplicationAgentLaunchProfileEditor.vue` | Agent application launch selector | Current SR-016 implementation retains unavailable raw selector and blocks readiness | No SR-017 change |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Shared live model option/selected-label policy | Default AutoByteus policy uses `modelIdentifier`; only custom OpenAI-compatible has a friendly-name exception | Add a narrow Qwen friendly-name rule before generic identifier fallback |
| `autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts` | Unit contract for shared label policy | Covers generic built-in identifier and custom friendly cases, but no Qwen case | Add Qwen option/selected-label coverage and keep existing regressions |
| `autobyteus-web/components/settings/providerApiKey/ProviderModelBrowser.vue` | Settings provider model cards | Delegates label to shared helper with default runtime | No component branch; gains friendly Qwen labels through owner |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | Shared agent/team/application/member model options | Delegates option and selected labels to shared helper | Existing production path carries the policy consistently |
| `autobyteus-web/composables/messaging-binding-flow/launch-preset-model-selection.ts` | External binding launch model options | Delegates option and selected labels to shared helper | Existing production path carries the policy consistently |
| `autobyteus-web/components/settings/useMediaDefaultModelsCard.ts` | Media default model options | Delegates catalog-backed labels; synthesizes raw identifiers only for missing rows | Preserve missing raw fallback; shared Qwen rule is harmless if applicable |
| `autobyteus-web/components/agentInput/GroupedSelect.vue` | Legacy raw-identifier grouped select | No current source consumer found | No SR-017 edit; do not broaden into dead-code cleanup |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-30 | Trace | Reported run token summary | Usage present, context absent | Metadata is root cause for missing derived compaction |
| 2026-07-30 | Probe | Saved Alibaba-compatible `/models` | No context fields | Exact internal inference is needed |
| 2026-07-30 | Probe | Minimal completion | No limit field | Completion path is not a metadata source |
| 2026-08-09 | Data scan | Exact UUID scan under app-data root | UUID exists in resumable metadata and immutable traces | Migrate structured active/resume selectors only; exclude traces |
| 2026-08-09 | Static trace | `LLMFactory.createLLM` and activation call chain | Missing identifier throws and surfaces activation failure | No new fallback; expose recreation/reselection |
| 2026-08-10 | Live GraphQL + real Chrome | API-REV-009 against packaged Electron backend `http://127.0.0.1:29695` | Returned distinct selector/name/value triples; current Nuxt displayed exactly three prefixed duplicate selectors without console error | Confirms a presentation policy gap, not routing/profile residue |

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for static architecture investigation; earlier sanitized provider probes used the user's already-configured endpoint.
- Required config, feature flags, env vars, or accounts: no new credentials created or persisted during SR-017 investigation; API-REV-009 used the user's already-running packaged backend read-only.
- External repos, samples, or artifacts cloned/downloaded: none.
- Setup commands that materially affected the investigation: repository status/ref commands recorded above.
- Cleanup notes: no disposable source files created. Source and test changes visible in the worktree belong to the in-progress superseded implementation, not this solution-design round.

## Findings From Code / Docs / Data / Logs

1. Provider-advertised fields already have a strict path and must remain authoritative per field.
2. Exact built-in value matching is the narrow generic fallback. Base URL, provider name, display name, suffix, case folding, and family similarity must not influence it.
3. `modelIdentifierOverride` already solves global catalog collisions for Qwen-served third-party models while leaving the API wire value unchanged.
4. One compiled Qwen URL is not viable for region/workspace/Token Plan users. The route comes from user configuration.
5. Qwen URL/key save needs a narrow all-old-or-new durable contract because current `AppConfig.set` can report only session persistence after file failure.
6. The effective Qwen default must be server-projected as `DEFAULT` versus `CONFIGURED`; equality with the default string is not proof of source.
7. The browser already supplies the meaningful custom provider name. No extra ID input or generalized provider attributes are needed.
8. The existing composite custom model selector already expresses provider plus exact model value; the provider component alone is opaque.
9. Exact structured selectors are worth preserving because the legacy name deterministically yields their future provider prefix. Preserving provider records/Base URLs is unnecessary because the user accepts re-entering them.
10. Existing-record custom key repair is absent. Adding it would require service/UI branches, while the existing create form already probes and saves name/Base URL/key. Reset-and-recreate is therefore simpler.
11. Empty V3 represents no custom providers. There is no credential-missing provider record, persisted flag, or new status attribute.
12. Selectors can remain while their provider/model is absent. Most current surfaces retain the raw value; the agent application editor is the isolated clearing bug.
13. Recreating with the same canonical name produces the same readable ID, so migrated selectors become usable when the endpoint advertises the same suffix. A different name or unavailable suffix requires reselection.
14. Old-ID provider-name snapshot work is the only identified reader that must run before empty-V3 publication; current selector writers must also finish first.
15. Empty-V3-last publication is the reset commit. Individual selector failures are warning-only; provider-file publication failure is fatal. Old secret deletion after V3 is cleanup only.
16. Qwen `modelIdentifier`, friendly `name`, and exact `value` are already separate in the live API. The three Qwen-served duplicates need the prefixed selector for global registry routing but do not need that internal key as their display label.
17. The outbound OpenAI-compatible Qwen request builder uses `model.value`, so changing only the label helper cannot change the Alibaba wire value.
18. The shared label helper is the correct owner because every identified active live catalog-backed Settings/runtime/binding surface calls it. A Settings-only fix would leave agent/team/application/binding selectors inconsistent.
19. A direct `providerType === 'QWEN' && nonblank name` rule is the minimal contract. Native Qwen names already equal their identifiers, generic built-ins keep the existing rule, and missing selectors have no live row/name and therefore retain their raw identifier.
20. Historical traces, debug logs, GraphQL/API fields, persisted selections, and factory routing must continue to use exact identifiers; they are not model-selection presentation surfaces.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume:
  - `llm/custom-llm-providers.json`: small V1/V2 JSON collection of provider records; V1 includes inline `apiKey`, V2 does not.
  - Secret vault: one custom key per configured UUID provider under authenticated secret ID.
  - Agent/team definitions, external bindings, application SQLite resource configs, run/team metadata, and improver sessions: small structured selector fields.
  - Token/history/traces: historical or observational data, potentially much larger.
- Relevant change: Custom provider identity changes from arbitrary UUID to deterministic name-derived ID; current schema becomes V3 with the same record attributes but a stronger ID/name invariant.
- Normal readers/writers: Current provider store baseline reads V2; target normal store will read V3 only. Config/binding/run readers accept selector strings without catalog validation; LLM factory validates at use.
- Required semantics preserved by direct use: `No` for active/default/resumable UUID selectors because the new catalog key changes; `Yes` for historical traces/token IDs/model-free indexes because their historical meaning remains correct.
- Physical/privacy constraints: V1 inline secrets must be removed from the provider file; secret plaintext must never enter migration logs, selector adapters, provider V3, GraphQL, or fixtures. Old vault deletion can fail without exposing the value.
- Concrete benefit/cost:
  - Migrate exact selectors: deterministic, bounded, and preserves active/default/resume choices.
  - Preserve provider records/Base URLs or add reconnect: unnecessary because the existing create flow is cheap and user-approved.
  - Migrate secrets: explicitly rejected and would add authenticated-ID re-encryption/recovery complexity.
  - Rewrite historical data: no runtime benefit and unnecessary I/O/corruption risk.
- Existing lifecycle constraints: Required startup migrations have durable status and ordered registration, but ordinary `runPending()` continues after failures/recent `RUNNING`. A fixed prerequisite guard and terminal post-run gate are required; a custom recovery path is not.
- Decision:
  - Legacy provider records/Base URLs: `Discard / Recreate`; use names only transiently for selector mapping, then publish empty V3.
  - Exact active/default/resume selectors: `Migration Required`.
  - V1/V2 custom secrets: `Discard / User Re-entry`; no value transfer.
  - Historical token identities/traces/indexes: `Directly Usable — No Migration`.
- Existing Qwen key-only state: `Directly Usable — No Migration`.
- SR-017 label policy: `Not Affected`; no persisted value or schema changes.

## Constraints / Dependencies / Compatibility Facts

- Custom fallback is exact, case-sensitive `SupportedModelDefinition.value` only.
- Custom and built-in providers may advertise the same value; registry identity must remain unique while wire value remains exact.
- Readable provider IDs retain `provider_`, contain no `:`, and satisfy existing secret-ID grammar.
- New provider name remains immutable in this scope; no rename/Base-URL-edit/reconnect path is added.
- V3 records add no attribute; the invariant is `id === buildCustomProviderId(name)`.
- Normal provider runtime is V3-only. Historical parsers live only in migrations.
- Exact prerequisite IDs are:
  - `20260727_custom_provider_v1_secret_migration`
  - `20260706_remove_global_skill_discovery_mode`
  - `20260517_team_run_metadata_member_tree`
  - `20260730_token_usage_provider_name_snapshot_backfill`
  - `20260623_remove_self_evolution_run_metadata`
- `SUCCEEDED_WITH_WARNINGS` is terminal under the existing runner and is accepted by the prerequisite/gate.
- Readable identity remains the final current required startup definition.
- Normal 15-minute stale-`RUNNING` behavior remains; immediate restart convergence is not promised.
- Existing selector suffixes are not normalized or mapped. Recreation must use the same canonical name to recover the same provider ID; a different name or unavailable suffix requires reselection.
- Live `ModelInfo` already supplies nonblank Qwen names and `providerType=QWEN`; no GraphQL or core type change is needed for friendly display.
- The selector remains the `id` of each grouped option. Labels must never be fed back as selected values or request model values.

## Open Unknowns / Risks

- Alibaba can change model availability independently of preserved selectors; recreation cannot guarantee an old suffix is still offered.
- Deterministic names can collide after canonicalization/slugging; such create requests fail, and non-derivable/colliding legacy provider sets reset to empty V3 with warnings.
- A read-only/malformed/concurrently changed selector target can remain stale; UI must keep it visible and require manual reselection.
- A pre-V3 interruption can leave some selectors changed while the provider file remains V2; idempotent ordinary retry is accepted after the runner's stale window.
- A post-V3 interruption before runner success can block startup until ordinary retry; user accepted no immediate recovery.
- Best-effort old secret cleanup can leave unreachable orphan ciphertext; no runtime lookup may use it.
- API-REV-009/DR-009 report and probe files are intentionally dirty/untracked downstream evidence; solution rework must not overwrite or misclassify them as SR-017 source.
- Delivery must refresh against the latest tracked base before finalization.
- A future new model-selection component could bypass the shared helper; source review should reject such duplication for live catalog-backed AutoByteus selection.

## Notes For Architecture Reviewer

- Review current authority as cumulative SR-017: `ARCH-REV-010` passed and implementation through DR-009 remains valid for SR-016; only Qwen live-label presentation is reopened.
- The deliberate simplification is substantive: migrate exact structured selectors, publish empty V3, and reuse the existing add-custom-provider flow. Do not preserve legacy records/Base URLs, grandfather UUIDs, or add reconnect/credential-state logic.
- Confirm recreation is actionable without a new API/UI path: the existing custom form already accepts/probes/saves name, Base URL, and key. Reusing the same canonical name recreates the expected readable ID.
- Confirm the provider-absent interval across agent/team defaults, external bindings, application launch state, and resumable metadata: stored/raw-visible, no fallback, launch/resume failure until recreation or reselection.
- Confirm the application-agent selector-clearing exception is explicitly corrected.
- Confirm only the minimal ordering remains: five exact prerequisite statuses, final readable registration, V3-last publication, and a terminal post-`runPending` gate.
- Confirm removal of secret migrator, journal, backups, completion receipt, recovery coordinator, special runner bypass, PID-lock-specific recovery protocol, and crash-perfect coverage.
- Confirm BEH-008's identity separation: friendly `name` is visible for live Qwen rows; `modelIdentifier` stays stored/routed; `value` stays on the provider wire.
- Confirm the existing shared label helper is the single presentation owner across Settings, runtime-scoped agent/team/application/member selectors, binding selectors, and any applicable media-default catalog rows. Do not approve a Settings-only branch or a new display attribute.
- Confirm missing selectors with no live catalog row remain raw and actionable, and generic non-Qwen built-in/custom label behavior does not regress.
- API-REV-009 is current evidence of the old label behavior, not authorization to retain it after the user's hands-on clarification. Expect a fresh architecture decision before a focused implementation/review/API-E2E/delivery loop.
