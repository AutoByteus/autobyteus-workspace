# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `implementation_engineer` initial implementation after architecture review round `ARCH-REV-002` | N/A | `Initial Baseline` | `SR-005`, `SR-006`, `ARCH-REV-002` | Reviewed design implemented; implementation handoff ready for source review. |
| IR-002 | `architecture_reviewer` architecture re-review round `ARCH-REV-003` after approved `SR-008` | N/A | `Local Fix` | `SR-005`–`SR-008`, `ARCH-REV-002`, `ARCH-REV-003` | Added the exact Alibaba DeepSeek wire-alias profile and focused regression coverage; handoff is refreshed for source review. |
| IR-003 | `code_reviewer` source review round `CRR-001` | `CR-001` | `Local Fix` | `SR-005`–`SR-008`, `ARCH-REV-002`, `ARCH-REV-003`, `CRR-001` | Refused profile matching for query/fragment-bearing endpoint URLs, added focused fallback/unknown regression coverage, and returned the implementation for source re-review. |
| IR-004 | `architecture_reviewer` re-review round `ARCH-REV-005` after material replacement `SR-010`/`SR-011` | `ARCH-DESIGN-004`, `ARCH-DESIGN-005` | `Local Fix` | `SR-010`, `SR-011`, `ARCH-REV-004`, `ARCH-REV-005`; `CRR/API-REV/DR: N/A` | Replaced the superseded endpoint-profile implementation with exact-only custom metadata plus the durable native-Qwen setup/runtime/catalog/UI contract; handoff is ready for fresh source review. |
| IR-005 | `code_reviewer` source review round `CRR-005` | `CR-002` | `Local Fix` | `SR-010`, `SR-011`, `ARCH-REV-004`, `ARCH-REV-005`, `CRR-005`; `API-REV/DR: N/A` | Kept committed Qwen mutation success authoritative and separated rejected provider-data refresh into an amber warning/retry outcome; handoff is ready for source re-review. |
| IR-006 | `code_reviewer` source re-review round `CRR-006` | `CR-003` | `Local Fix` | `SR-010`, `SR-011`, `ARCH-REV-004`, `ARCH-REV-005`, `CRR-005`, `CRR-006`; `API-REV/DR: N/A` | Made the advertised Reload Models recovery reissue both provider settings and catalog refresh after the failed-settings state; handoff is ready for source re-review. |

## Revision Entries

### IR-001 — Initial reviewed implementation baseline

- Triggering role, report path, and round: `implementation_engineer`; architecture re-review package at `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`; round `ARCH-REV-002`.
- Triggering finding IDs: `N/A`; architecture findings were already resolved before implementation.
- Classification: `Initial Baseline`.
- Prior authoritative result: `N/A`.
- Current authoritative result: The reviewed custom-provider metadata path is implemented, including exact discovery normalization, endpoint/profile/fallback resolution, source propagation, catalog merge preservation, and unknown-capacity UI rendering. Source review and downstream API/E2E investigation remain required.
- Related solution revision IDs: `SR-005`, `SR-006`.
- Related architecture-review revision IDs: `ARCH-REV-002`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this baseline is recorded: Establish the first implementation handoff against the passed architecture package. No prior implementation result or code-review finding exists.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-005`; `REQ-001`–`REQ-011`; `AC-001`–`AC-013`.
- Implementation delta:
  - Added strict top-level advertised metadata alias normalization with JSON-number validation and payload-order duplicate merging.
  - Added the pure exact endpoint identity/profile resolver, Alibaba Token Plan profile facts, exact `SupportedModelDefinition.value` fallback index, conservative per-field duplicate selection, and the five-kind source union.
  - Passed resolved metadata into custom `LLMModel` construction and required non-secret `resolved_model_metadata` on `ModelInfo`.
  - Preserved source-bearing custom metadata in server enrichment while retaining built-in live-over-static behavior and truthful coarse provenance.
  - Added the explicit unknown-context token-meter state and localized copy.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/`, custom endpoint discovery/model/provider files, `autobyteus-ts/src/llm/models.ts`, server model normalizers and provisioning service, and workspace token-meter component/locales.
- Local validation and result: TypeScript build checks passed for `autobyteus-ts` and `autobyteus-server-ts` build configurations; 23 focused `autobyteus-ts` unit tests passed; 9 server metadata-provisioning unit tests passed; 9 token-meter component tests passed; localization/web-boundary guards and localization-literal audit passed; `git diff --check` passed. A repository-wide web `tsc -p tsconfig.json --noEmit` remains blocked by pre-existing generated Nuxt/type errors outside this change.
- Next recipient or routing: `code_reviewer` for source and architecture review before API/E2E coverage investigation.
- Remaining limitations or risks: Vendor profile facts are source-dated and may become stale; exact built-in fallback is explicitly inferred and can differ from a plan-specific serving limit; broader API/E2E/runtime compaction evidence and browser-level UI inspection remain downstream work. No secrets or raw provider payloads were added.

### IR-002 — Implement approved endpoint-scoped DeepSeek wire alias

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`; round `ARCH-REV-003` after solution revisions `SR-007` and `SR-008`.
- Triggering finding IDs: `N/A`; the architecture decision remained `Pass` and extended the already-approved contract without opening a new finding.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-001` implemented exact profiles and fallback resolution but had no profile entry for the newly approved Alibaba returned wire ID `deepseek-v4-flash-0731`; that differing value therefore could not reach canonical DeepSeek metadata.
- Current authoritative result: The exact Alibaba Token Plan canonical endpoint tuple plus returned `deepseek-v4-flash-0731` now matches a source-dated `endpoint_profile` carrying `{ provider: DEEPSEEK, value: deepseek-v4-flash }`. Referenced context/output values carry endpoint-profile provenance and the canonical reference. The same wire ID on an unrecognized endpoint remains unknown; the implementation has no global suffix stripping, fuzzy/family matching, or cross-endpoint aliasing.
- Related solution revision IDs: `SR-005`, `SR-006`, `SR-007`, `SR-008`.
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`.
- Related code-review revision IDs: `N/A`.
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Complete the approved `SR-008` behavior before source review and preserve the prior implementation baseline as historical context without treating it as current authority.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-004`; `REQ-003`, `REQ-012`; `AC-004`, `AC-014`.
- Implementation delta:
  - Added `alibaba-token-plan-deepseek-wire-alias-2026-08-03` to the exact endpoint profile table with returned wire ID, DeepSeek `{provider, value}` reference, and source URL/date provenance.
  - Added focused resolver coverage for exact alias resolution, referenced provenance, cross-endpoint unknown behavior, and the canonical built-in ID remaining a separate exact fallback case.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`; `autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts`; refreshed current handoff artifacts.
- Local validation and result: `autobyteus-ts` build typecheck passed; the focused Vitest selection passed with 24 tests; `git diff --check` passed. Temporary dependency symlinks were removed after execution.
- Next recipient or routing: `code_reviewer` for source review; API/E2E coverage investigation remains blocked on that review as required by the team workflow.
- Remaining limitations or risks: The alias profile is source-dated and can become stale if Alibaba changes the returned wire ID or serving semantics. The profile has no independent Alibaba context override; it references the canonical DeepSeek static metadata, and absent the exact profile the differing wire ID remains unknown. Downstream API/E2E validation remains pending.

### IR-003 — Fix query/fragment profile addressability gap

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`; source review round `CRR-001`.
- Triggering finding IDs: `CR-001`.
- Classification: `Local Fix`.
- Prior authoritative result: `IR-002` failed source review because `canonicalizeOpenAICompatibleEndpointIdentity` removed URL search/hash components before profile lookup. A reachable query/fragment-bearing custom-provider URL could therefore receive the query-free Alibaba profile and an unsupported compaction capacity.
- Current authoritative result: Profile matching now uses an internal parsed endpoint result with an explicit `profileAddressable` guard. Any non-empty search or hash refuses profile matching while preserving normal protocol/hostname/port/base-path canonicalization. Query and fragment variants therefore use advertised values, then exact wire-value fallback, then unknown; `deepseek-v4-flash-0731` has no global fallback and remains unknown without the exact profile.
- Related solution revision IDs: `SR-005`, `SR-006`, `SR-007`, `SR-008`.
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-003`.
- Related implementation revision IDs: `IR-001`, `IR-002`, `IR-003`.
- Related code-review revision IDs: `CRR-001` (`CR-001`).
- Related API/E2E revision IDs: `N/A`.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Resolve the blocking source-review finding with the smallest implementation-owned change and preserve the reviewed non-profile-addressable query/fragment contract.
- Approved behavior or requirement IDs affected: `BEH-004`; `REQ-011`; `AC-013`.
- Implementation delta:
  - Added an internal endpoint parser that retains the canonical tuple and marks search/hash-bearing inputs as non-profile-addressable; exported canonicalization remains tuple-only for existing callers.
  - Gated exact profile lookup on `profileAddressable` without changing advertised metadata, exact fallback, or source precedence.
  - Added query-only and fragment-bearing resolver tests covering advertised precedence, exact built-in fallback after a profile miss, and unknown differing wire IDs.
- Changed files or areas: `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts`; `autobyteus-ts/tests/unit/llm/metadata/openai-compatible-endpoint-model-metadata.test.ts`; refreshed current handoff artifacts.
- Local validation and result: `autobyteus-ts` build typecheck passed; the focused Vitest selection passed with 25 tests; `git diff --check` passed. Temporary dependency symlinks were removed after execution.
- Next recipient or routing: `code_reviewer` for source re-review; API/E2E remains blocked until source review passes.
- Remaining limitations or risks: Canonical profile facts remain source-dated. Query/hash-bearing URLs intentionally cannot use endpoint profiles even when their tuple matches; they may still use live advertised fields or exact built-in fallback. Downstream API/E2E validation remains pending.

### IR-004 — Replace obsolete endpoint profiles with durable native Qwen setup

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`; re-review round `ARCH-REV-005` after `SR-010`/`SR-011`.
- Triggering finding IDs: `ARCH-DESIGN-004`, `ARCH-DESIGN-005` (resolved in the reviewed design and implemented in this round).
- Classification: `Local Fix` (material implementation rework against the approved replacement).
- Prior authoritative result: `IR-003` implemented endpoint-scoped profiles, URL identity, `endpoint_profile` provenance, and a DeepSeek wire alias. `SR-010` explicitly superseded that direction; all prior source-review/API-E2E/delivery evidence is obsolete for the replacement.
- Current authoritative result: The current code implements advertised -> exact built-in `value` -> unknown custom metadata, the reduced source union, configured/default Qwen runtime ownership, exact Qwen-served definitions, strict atomic AppConfig persistence, command-local prior-secret compensation, sanitized truthful failure codes, and the Qwen-only setup projection/form.
- Related solution revision IDs: `SR-010`, `SR-011`.
- Related architecture-review revision IDs: `ARCH-REV-004`, `ARCH-REV-005`.
- Related code-review revision IDs: `N/A` — `CRR-001` is historical and reviewed the superseded implementation.
- Related API/E2E revision IDs: `N/A` — prior API/E2E evidence is obsolete.
- Related delivery revision IDs: `N/A` — prior delivery evidence is obsolete.
- Why this implementation revision is recorded: The user-approved native-Qwen/exact-only direction is a clean-cut material replacement, and `ARCH-REV-005` made the durable pair/status contracts implementation-ready.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-012`; `AC-001`–`AC-014`.
- Implementation delta: Removed profile/URL/alias policy and `endpoint_profile`; added exact per-field fallback; added Qwen endpoint resolver and exact definitions; added strict one-setting AppConfig atomic replacement; added probe/snapshot/key/URL/compensate command and Qwen status GraphQL contract; added Qwen Settings form/store/runtime/generated types/localization and responsive polish. No generalized transaction or provider-offering schema was introduced.
- Changed files or areas: `autobyteus-ts/src/llm/{metadata,qwen-provider-config.ts,qwen-supported-model-definitions.ts,api/qwen-llm.ts}`; server config/provider service/GraphQL/provisioning paths; web Settings Qwen component/runtime/store/GraphQL/generated types/locales; focused unit tests and current long-lived metadata docs.
- Local validation and result: Core focused tests `25 passed`, token-budget/compaction preservation `8 passed`, core build passed; server focused tests `63 passed` and build passed; web Qwen tests `21 passed`, Token Meter `9 passed`, three guards/audits passed, codegen passed, production build passed; rendered default/invalid/previous-restored/repair/success/desktop/narrow states inspected and polished; `git diff --check` passed. Repository-wide server/web typechecks remain baseline-blocked as detailed in `implementation-handoff.md`.
- Next recipient or routing: `code_reviewer` for a fresh source/architecture review against `SR-010`/`SR-011` and `ARCH-REV-005`.
- Remaining limitations or risks: Independent coverage investigation and API/E2E/system/browser sign-off remain required; historical preview-string durable fixtures require downstream validity classification; vendor metadata remains time-sensitive.

### IR-005 — Preserve committed Qwen success across view-refresh failure

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`; source review round `CRR-005`.
- Triggering finding IDs: `CR-002` (`PREM-QWEN-002`, `Reachable`).
- Classification: `Local Fix`.
- Prior authoritative result: `IR-004` failed source review because `llmProviderConfig.saveQwenConfiguration` assigned the committed status and then awaited provider/catalog refresh inside the mutation try/catch. A later network/GraphQL rejection was normalized as a save failure, so the runtime retained plaintext input and did not reset the form even though the URL/key pair was already durable.
- Current authoritative result: The store's Qwen save action ends with the returned mutation status; provider-view refresh is a separate store action. The runtime clears the plaintext form, releases saving state, and reports committed success before attempting that refresh. If refresh rejects, the save still returns `true`, no Qwen save-error state is set, and a distinct localized amber warning tells the user that the pair was saved and to use Reload Models to retry.
- Related solution revision IDs: `SR-010`, `SR-011`.
- Related architecture-review revision IDs: `ARCH-REV-004`, `ARCH-REV-005`.
- Related implementation revision IDs: `IR-004`, `IR-005`.
- Related code-review revision IDs: `CRR-005` (`CR-002`).
- Related API/E2E revision IDs: `N/A` — API/E2E remains blocked until source re-review passes.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Resolve the single blocking source-review finding without changing the approved server transaction, Qwen setup projection, or exact-only metadata direction.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-006`; `REQ-005`, `REQ-011`; `AC-007`; `UXJ-001`.
- Implementation delta:
  - Removed provider/catalog refresh from the authoritative `saveQwenConfiguration` mutation action and added `refreshProviderDataAfterQwenSave` as the subordinate refresh boundary.
  - Changed the section runtime to reset the Qwen form and publish save success immediately after the mutation status, then map only later refresh rejection to a warning/retry notification.
  - Added a warning notification variant and localized English/Chinese text that explicitly says the configuration was saved and names Reload Models as the retry path.
  - Added an actual Pinia/Apollo store regression proving a successful mutation returns and stores its status before a forced refresh rejection, a runtime regression proving the save remains successful and plaintext reset/error state is correct, and a component regression for non-error warning treatment.
- Changed files or areas: `autobyteus-web/stores/llmProviderConfig.ts`; `components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`; `components/settings/ProviderAPIKeyManager.vue`; English/Chinese Settings locales; focused store/runtime/manager tests; current handoff artifacts.
- Local validation and result: Current focused Qwen web run passed `4 files / 24 tests`; web boundary, localization boundary, and localization literal audit passed; production Nuxt build passed; `git diff --check` passed. Browser self-validation forced a successful mutation followed by provider-settings network failure and confirmed the committed configured status, empty plaintext key, absent save-error panel, amber saved-but-refresh-failed warning, visible Reload Models retry, and zero horizontal overflow at 1440x1000. Screenshot: `/tmp/qwen-settings-postcommit-refresh-warning.png` (temporary implementation evidence only).
- Next recipient or routing: `code_reviewer` for source re-review; do not advance to API/E2E until that review passes.
- Remaining limitations or risks: API/E2E still owns independent coverage investigation and realistic system/browser execution. A refresh failure can leave provider/catalog views unavailable or stale until the user retries Reload Models, which is now reported truthfully rather than misclassifying the durable save.

### IR-006 — Make Reload Models complete the advertised refresh recovery

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`; source re-review round `CRR-006`.
- Triggering finding IDs: `CR-003` (`PREM-QWEN-003`, `Reachable`).
- Classification: `Local Fix`.
- Prior authoritative result: `IR-005` resolved `CR-002`, but its warning named Reload Models as recovery after a provider-settings query failure. That failure cleared `hasFetchedProviderSettings`; the store's reload actions only fetched provider settings when the flag remained true, so the top-level retry could refresh the catalog, skip provider settings, and falsely report success while the Settings view stayed empty.
- Current authoritative result: Both global and provider-specific model reload actions always reissue the model-catalog query and the provider-settings query together after the server reload mutation. Their success notification is reachable only after both data owners complete, independent of the prior cache flag. The existing AutoByteus key-save caller avoids a duplicate provider-settings query by relying on the strengthened reload action.
- Related solution revision IDs: `SR-010`, `SR-011`.
- Related architecture-review revision IDs: `ARCH-REV-004`, `ARCH-REV-005`.
- Related implementation revision IDs: `IR-004`, `IR-005`, `IR-006`.
- Related code-review revision IDs: `CRR-005`, `CRR-006` (`CR-003`; `CR-002` resolved).
- Related API/E2E revision IDs: `N/A` — API/E2E remains blocked until source re-review passes.
- Related delivery revision IDs: `N/A`.
- Why this revision is recorded: Complete the exact recovery action promised by IR-005 warning copy with a bounded change in the existing store reload owner; no new transaction, recovery framework, or server behavior was introduced.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-006`; `UXJ-001` step 8 and the successful-save provider settings/model refresh contract.
- Implementation delta:
  - Changed `reloadModels` and `reloadModelsForProvider` to unconditionally refresh both the provider/model catalog and canonical AutoByteus provider-settings groups after their server reload mutation, instead of gating provider settings on `hasFetchedProviderSettings`.
  - Changed the AutoByteus generic key-save path to avoid a duplicate provider-settings query now that `reloadModels` owns both refreshes.
  - Added an actual Pinia/runtime/Apollo recovery regression that loads Qwen, commits the pair, forces only the post-save provider-settings refresh to reject and clear state, invokes the real top-level `reloadAllModels` path, and proves three provider-settings requests, two catalog requests, configured Qwen provider-row recovery, Qwen catalog/model recovery, and the final success notification.
- Changed files or areas: `autobyteus-web/stores/llmProviderConfig.ts`; `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts`; current handoff artifacts.
- Local validation and result: Current focused web run passed `5 files / 32 tests`; web boundary, localization boundary, and localization literal audit passed; production Nuxt build passed; `git diff --check` passed. Headless Chrome at 1440x1000 forced the complete supported path and observed `GetProviderSettings` three times (initial, failed post-save, successful retry), catalog twice (post-save and retry), the actual `ReloadLLMModels` mutation, restored configured Qwen row/model view, success notification, retained empty plaintext key, and zero horizontal overflow. Temporary screenshots: `/tmp/qwen-settings-postcommit-refresh-warning-ir006.png` and `/tmp/qwen-settings-refresh-retry-recovered.png`.
- Next recipient or routing: `code_reviewer` for source re-review; do not advance to API/E2E until that review passes.
- Remaining limitations or risks: API/E2E still owns independent coverage investigation and realistic system/browser execution. If either required refresh fails again, Reload Models reports failure rather than a false recovery success and remains available for another retry.
