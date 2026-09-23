# Design Spec — Truthful Anthropic API key save feedback

## Solution And Approval Basis
- Package: `anthropic-api-key-save-failure`; current solution revision: `SR-004` (approval `SR-003`, design completion `SR-004`).
- Approved intended-behavior baseline: `requirements-doc.md` `REQ-001–004`, `AC-001–004`, `BEH-001–002`, `SCN-001`; explicit user message “approve” on 2026-09-23 directly following the proposal that a successful save immediately shows Configured, displays success, and clears the input while genuine failures still show an error.
- Behavior-defining supplements: `N/A — not applicable`. The user's screenshot and isolated browser screenshots are diagnostic evidence, not a new Product UI/UX specification.
- Design status: Ready — no material approval or technical evidence gap.
- Canonical investigation notes: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/tickets/in-progress/anthropic-api-key-save-failure/investigation-notes.md`.
- Worktree/branch/base/finalization target: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure` / `requirements/anthropic-api-key-save-failure` / `origin/personal@467c1bc12d439ee79243d124402c2f65f25c3cd2` / `origin/personal`.

## Current-State Read
The supported Settings Save Key path crosses UI input, section runtime, Pinia credential-status store, Apollo/GraphQL, and backend vault. The backend commits and returns `apiKeyConfigured=true`. The store then fails while applying that returned status because its initial credential list aliases a read-only Apollo query array, yet `applyCredentialSetting` mutates the list in place. The UI runtime's existing catch interprets this post-commit frontend exception as a failed save, leaving the input and Not Configured badge until refresh. The isolated browser probe reproduces exactly this sequence. The server resolver, vault, GraphQL response, editor, notification wording and model catalog are otherwise fit for the approved behavior. See the SR-002 and SR-003 architecture evidence in `investigation-notes.md` and `evidence/ui-probe-summary.json`.

## Task Size And Architectural Risk
- `task_size`: **Small**.
- Size evidence: One existing frontend store owns the defect and target update (`autobyteus-web/stores/llmProviderConfig.ts`); focused store/Apollo contract tests and browser validation are needed. No new production module or route is required. The number of providers/catalog records is payload, not code scope.
- `architectural_risk`: **Low**.
- Risk evidence: Existing ownership boundaries, GraphQL contract, encrypted persistence, security custody, concurrency, deployment and model-catalog behavior remain unchanged. The store's credential-list collection ownership is corrected locally. Shared callsites require preservation checks, but no material new or changed architectural contract.
- Escalation trigger: If implementation finds the list is mutated by another production owner, requires a changed GraphQL/vault contract, changes actual persisted credential semantics, or cannot keep special-provider flows intact with the local correction, return a Design Impact for reclassification rather than widening scope silently.

## Architecture Investigation Evidence
| Source / probe | Exact reference | Observation | Design decision | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Browser+isolated backend probe | `evidence/ui-probe-summary.json`, `evidence/before-save.png`, `evidence/after-save.png` | GraphQL HTTP 200/configured=true; client throws read-only index assignment; UI false failure; refresh Configured. | Correct frontend status-list update, not backend save. | User's specific stored key identity cannot be inferred from value-free status; not needed for repair. |
| Store read/update inspection | `autobyteus-web/stores/llmProviderConfig.ts:390–416,491–496` | Apollo result array is adopted; later index/push/sort mutation throws. | Establish store-owned collection at ingress and use replacement updates. | None material. |
| Existing callers and UI | `llmProviderConfig.ts:429,441,467,488`; `useProviderApiKeySectionRuntime.ts:35–42,124–162,287–312`; `ProviderApiKeyEditor.vue:54–64` | All commands share one upsert; UI status derives from store; editor reset/success already follow a resolved store action. | Preserve current interfaces and UI flow; repair common store invariant. | Separate failures in untested special-provider scenarios are not claimed. |
| Existing tests | `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts:387–398`; `components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` | Save test starts with mutable empty list; Apollo contract test reads but does not save. | Add regression with read-only result after initial load and repeat save. | Exact durable browser-test placement belongs to API/E2E owner. |
| Backend/value-free contract | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:202–207`; `src/llm-management/llm-providers/services/llm-provider-service.ts:198–215`; `docs/modules/secret_management.md` | Backend save and vault custody already work; returns value-free setting. | Do not alter backend/API/persistence. | None material. |

## Intended Change And Relevant Behavior / Production-Path Map
| Behavior ID | Kind | Approved intent / AC | Approved trigger | Existing behavior | Target production path and spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-003, REQ-004 / AC-001, AC-003, AC-004 | SCN-001: click Save Key for Anthropic | Server succeeds, client store throws, UI falsely reports failure. | Same Save Key path; store safely publishes returned status; UI runtime completes reset/success. DS-001, DS-002. |
| BEH-002 | System | REQ-002, REQ-004 / AC-002, AC-004 | Existing provider credential save contract under SCN-001 | Encrypted vault stores key and returns value-free status. | Preserve backend path and status shape; no credential value readback. DS-001. |

The desired visible UI is the existing screen and messages in the successful-save branch; no new visual design is requested.

## Relevant Supplemental Task Artifacts
- Diagnostic-only evidence: `evidence/ui-probe-summary.json`, `evidence/before-save.png`, `evidence/after-save.png`; they prove current failure and validation target, not independent behavior-defining supplements.
- Product prototype/UI-UX spec: `N/A — not applicable`.

## Task Design Health Assessment
- Change posture: Bug Fix.
- Current design issue found: Yes.
- Root cause classification: **Boundary Or Ownership Issue**, localized to a collection crossing Apollo-cache and Pinia-store ownership.
- Refactor needed now: **Yes, local**. Replace direct adoption of the Apollo array and in-place mutation of the state-held array; this is the smallest coherent correction of the broken ownership invariant, not a broader store rewrite.
- Evidence: Browser Console read-only-array exception and store source cited above; existing `deleteCustomProvider` already uses replacement-list publication.
- Design response: Treat credential rows/descriptors as immutable values and the store collection as store-owned. Copy the query result array at ingress. For each returned credential setting, construct/sort a **new local array** and assign it once to `providerCredentialSettings`; do not mutate the current state-held array. Preserve existing ordering and one setting per provider ID.
- Intentional deferrals/residual risk: Generic error-detail UX improvement is out of approved scope. A genuinely failed request continues to use the existing failure notification. No new caching abstraction or deep clone is needed because nested provider descriptors are read-only in this path.

## Legacy Removal, Persisted Data, And Compatibility
- Legacy removal policy: No backward compatibility; remove the in-scope direct array alias at `fetchProviderCredentialSettings` and the in-place index/push/sort update at `applyCredentialSetting`. No other obsolete path or file is evidenced.
- Persisted data/state transition decision: **Not Affected**. The stored subject remains the encrypted Anthropic credential in SQLite and its sibling vault key, written/read by unchanged backend services. This design changes only the transient frontend status-list projection; no schema, encryption, writer, reader, volume handling, migration, data rewrite, downtime or backup procedure changes. Required invariant remains that only the user's explicit Save Key command may replace the real key. `AC-002` is supported without any migration.
- Backward-compatibility rejection: Do not add a fallback catch that reports success despite a store exception, a parallel credential list, a special Anthropic path, or a second query/response shape. Correct the existing shared owner cleanly.

## Data-Flow Spine Inventory And Narratives
| Spine ID | Scope | Related behavior | Start → end | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | User Save Key → editor emit → section runtime → credential store → Apollo/GraphQL resolver → provider service/vault commit | Backend service owns credential commit; frontend store owns status projection | Establishes that backend commit succeeds before frontend status publication. |
| DS-002 | Return/Event | BEH-001 | Value-free GraphQL setting → store replacement update → reactive provider summary/badge → runtime editor reset and success notification | Frontend credential store for status; section runtime for transient UI feedback | This is the broken return path and repair target. |
| DS-003 | Return/Event | BEH-001 | Genuine GraphQL/network rejection → store action rejection → runtime failure notification | Section runtime | Preserves true failure behavior without false configured state. |

Primary spine (full path): `Settings user action → ProviderApiKeyEditor → ProviderAPIKeyManager/useProviderApiKeySectionRuntime → llmProviderConfig store → Apollo SaveProviderApiKey → GraphQL LlmProviderResolver → LlmProviderService → encrypted SecretManagementService vault`. The return path is DS-002. No bounded local loop/state machine is applicable.

## Ownership, Boundaries, And Dependency Rules
- Editor owns only masked raw input and clears it when `resetVersion` changes; it must not call GraphQL or read back a credential.
- `useProviderApiKeySectionRuntime` owns save-in-progress sequencing, UI notification and reset version; it must use the store command rather than directly editing credential rows.
- `llmProviderConfig` owns the frontend credential-status collection and its ordering/upsert invariant. `fetchProviderCredentialSettings` is the read boundary; `applyCredentialSetting` is the shared update boundary. It may consume immutable Apollo values, but must not mutate an Apollo-owned or currently published list.
- Apollo/GraphQL is a transport boundary returning value-free settings. Backend resolver/service/vault remain authoritative for credential commit. Frontend status projection must never be treated as a credential value.
- Model catalog state is independent/off-spine; do not refetch/reload models merely to make credential save appear successful. Existing AutoByteus-specific background catalog refresh remains as-is.
- Interfaces stay unchanged: `fetchProviderCredentialSettings(networkOnly?)`, `setLLMProviderApiKey(providerId, apiKey)`, `applyCredentialSetting(setting)`, `SaveProviderApiKey(providerId, apiKey) -> ProviderCredentialSetting`. Provider ID is explicit. No new public API, schema, or ambiguous selector.

## Subsystem, File Responsibility, And Folder Mapping
| Path | Capability / owner | Target responsibility | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/stores/llmProviderConfig.ts` | Frontend provider credential-status store | Copy Apollo status array at ingress; replace (rather than mutate) list on setting upsert; retain sort and provider ID semantics. | Modify existing file. |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | Store regression tests | Model a read-only query result after initial load, then successful and repeated saves; assert unrelated rows, ordering and no catalog side effects. | Extend existing tests. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` | Apollo/store integration contract tests | If useful, test actual Apollo query→save transition rather than only separate read and save; verify value-free status remains separate from model catalog. | Extend proportionately; avoid duplicative tests. |
| `autobyteus-web/tests/e2e/` | API/E2E-owned browser validation | Durable or focused isolated-backend browser scenario for AC-003/AC-004, using synthetic key and no live DB. | API/E2E owner chooses exact test file/harness. |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`, `ProviderApiKeyEditor.vue`, server files | Existing UI/runtime and backend owners | Preserve current public behavior and sequencing; no production edit planned. | Unchanged unless implementation discovers a Design Impact. |

Existing `ProviderCredentialSetting` and provider descriptor types are semantically sufficient; no new shared structure, module, folder or interface is justified. The compact existing frontend store/tests layout keeps a clear owner for this small change. No folder move or mixed-layer cleanup is needed.

## Removal / Decommission Plan
| Item | Why unnecessary | Replacement | Scope |
| --- | --- | --- | --- |
| Direct assignment of Apollo's credential array into mutable store collection | Carries read-only cache ownership into a state list later mutated. | New array at read boundary in `llmProviderConfig.ts`. | In this change. |
| In-place index assignment/push/sort on the published credential array | Throws on read-only data and violates immutable publication. | Local copied/upserted/sorted list assigned once by `applyCredentialSetting`. | In this change. |
| Compatibility wrappers, dual flow, special Anthropic path | Not required; would obscure shared root cause. | N/A; reject. | N/A. |

## Verification, Change Sequence, Tradeoffs, And Risks
1. Add a focused regression that first loads a read-only/frozen credential list and then calls the existing save action. It should fail on current code with the reproduced exception. Include a second save and unrelated provider preservation; keep fake key out of assertions/logs.
2. Correct the store's collection ingress/update invariant within `llmProviderConfig.ts` (new array at read and replacement upsert). Do not change GraphQL mutation, backend, editor, notification branch, or model catalog.
3. Run focused frontend store/Apollo/section tests and typecheck as implementation self-checks. API/E2E validates the full Settings browser journey against an isolated backend: before Not Configured; save response configured=true; immediate Configured, success toast, cleared input; refresh still Configured; no read-only Console error. Also verify a simulated genuine mutation rejection retains failure behavior.
4. Compare before/after provider rows and special-provider shared-method tests. No migration or deployment sequencing is needed beyond normal frontend build/release.

Tradeoff: array-copy/replacement has trivial cost for the small provider list and avoids broad store/cache coordination. It treats nested result records as immutable; no deep cloning or new dependency is needed. The main risk is regression in other callers of `applyCredentialSetting` (custom, Qwen, Gemini); maintain their current outcomes with focused tests. A false failure on any genuinely successful command should not be reintroduced by the common method.

## Guidance For Implementation
- Keep the fix in the established credential-status store owner. A local `next` array is enough; sort **before** publication. Do not mutate `this.providerCredentialSettings` or Apollo-returned arrays/objects.
- Preserve exact GraphQL operation and value-free response; never log or assert a real API key. Use temporary isolated backend data for browser validation.
- Do not make a frontend error toast disappear by suppressing store exceptions without repairing state publication. The UI must actually show the committed status immediately.
- If implementation requires changing intended behavior, backend semantics, shared public contracts, or persisted data, return to Solution Designer for recovery before widening the patch.

## Explicit Compatibility And Off-Spine Checks
| Candidate compatibility mechanism | Decision | Reason / clean cut |
| --- | --- | --- |
| Dual old/new credential-list update paths | Rejected | Only the replacement-list path should remain; dual publication would retain the aliasing hazard. |
| Anthropic-only UI workaround or special post-save refetch | Rejected | The defect is in the shared store owner; a provider-specific bypass would conceal it and leave other callers exposed. |
| Backend/schema migration | N/A | No backend or persisted representation changes. |

| Off-spine concern | Serves | Decision |
| --- | --- | --- |
| Provider model catalog projection and AutoByteus refresh | Existing section runtime / store | Preserve independent catalog lifecycle; not needed on Anthropic credential save critical path. |
| Credential-status tests and browser diagnostics | Store and UI owners | Verify status publication and false-failure absence; keep synthetic values and isolation. |

No new boundary, interface, shared type, subsystem, or folder is introduced. Existing interface identities (`providerId` and value-free `ProviderCredentialSetting`) remain explicit and singular; boundary-bypass and ambiguous-selector risks are Low. The current `llmProviderConfig` capability is reused rather than creating a helper or parallel credential-state store.
