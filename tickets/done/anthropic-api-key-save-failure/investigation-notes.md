# Investigation Notes — Anthropic API key save failure

## Investigation Meta
- Package identifier: anthropic-api-key-save-failure
- Request: Investigate failed Anthropic key save in Settings > API Keys.
- Workspace root: /home/autobyteus/workspace/autobyteus-workspace
- Repository mode: Git
- Task worktree / branch: /home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure ; requirements/anthropic-api-key-save-failure
- Resolved base remote / branch / revision: origin/personal / personal / 467c1bc12d439ee79243d124402c2f65f25c3cd2
- Finalization target remote / branch: origin / personal
- Bootstrap result: Isolated task worktree created from freshly fetched origin/personal.
- Bootstrap blocker: None.
- Current solution revision ID: SR-004
- Investigation status: Root cause established; requirements approved; architecture investigation complete.

## Initial Request And Clarifications
- Original request: User cannot save an Anthropic API key in Settings > API Keys; a toast reads “Failed to save API key for Anthropic.” User requests investigation, optionally frontend/backend reproduction or log analysis.
- Clarifications received: None.
- User-supplied facts and constraints: Screenshot shows Anthropic selected, status Not Configured, seven model entries, a masked filled key field, and failure toast.
- Initial ambiguity: Exact backend error and runtime context unknown; no real key provided.

## Source Log
| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-23 | User | Attached screenshot at /home/autobyteus/data/memory/agent_teams/software_engineering_team_5b7a15421115487783117d431b7f2b2b/solution_designer_9829cfc26b7241fc814365b719297af0/context_files/ctx_83b54a2a39d4__image.png | Establish observed failure | Generic frontend toast; no underlying error visible. | Trace request and logs. |
| 2026-09-23 | Command | git fetch origin --prune; git rev-parse origin/personal; git worktree add -b requirements/anthropic-api-key-save-failure ... origin/personal | Establish isolated workspace | Base revision 467c1bc12d439ee79243d124402c2f65f25c3cd2. | Investigate. |

## Product And Domain Understanding
- Product area: Settings > API Keys; Anthropic is a built-in LLM provider.
- The screenshot's seven Anthropic model names match the current backend's Anthropic catalog projection. This is consistent with, but does not prove, the same backend connection.
- Credential status and model catalog are independent; models may display even when the key is not configured.

## Source Log (continued)
| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-23 | Code | `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts:287-312`, `autobyteus-web/stores/llmProviderConfig.ts:410-418`, `autobyteus-web/graphql/mutations/llm_provider_mutations.ts:25-33` | Trace UI failure | Catch block emits the generic toast for any thrown mutation/store error and logs underlying error only to browser Console. | Obtain the console/network error for the user's attempt. |
| 2026-09-23 | Code | `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts:202-207`, `src/llm-management/llm-providers/services/llm-provider-service.ts:198-215`, `src/secret-management/catalog/provider-credential-catalog.ts` | Trace backend save | Anthropic is explicitly bound to `provider.anthropic.api-key`; any nonblank string is saved to vault, then a value-free status is returned. No Anthropic remote check occurs. | Compare failing response if obtained. |
| 2026-09-23 | Doc | `autobyteus-server-ts/docs/modules/secret_management.md:99-127` | Check contract | Settings credential writes are write-only; status is value-free; catalog independent. | Preserve during diagnosis. |
| 2026-09-23 | Runtime | POST read-only GraphQL query to `http://127.0.0.1:8000/graphql` for `getSearchConfig`, `providerCredentialSettings`, and `providerModelCatalogSnapshots` at 04:03:52 UTC | Check local server without changing key | Vault READY; Anthropic `apiKeyConfigured: true`; seven Anthropic models. No GraphQL errors. | Ask user to refresh and confirm this is the backend their UI uses. |
| 2026-09-23 | Runtime | Separate `/app/autobyteus-server-ts/dist/app.js` server on `127.0.0.1:18082`, newly migrated temporary SQLite DB, synthetic invalid key; same `SaveProviderApiKey` response fields as frontend | Safe reproduction | Before: false, vault READY. Mutation: HTTP 200, `apiKeyConfigured: true`, no errors. After: true. Temporary DB/process removed; live key untouched. | No backend deterministic failure found; obtain actual failing response. |
| 2026-09-23 | Runtime | Searched `/home/autobyteus/data/logs/server.log` for recent Anthropic/save/vault/GraphQL errors | Look for cause | No contemporaneous Anthropic/save/vault failure found. Successful GraphQL requests are not reliably represented by this log. Absence is not proof of success. | Client error or request trace needed. |
| 2026-09-23 | Runtime | Read-only `PRAGMA table_info(secret_entries)` on `/home/autobyteus/data/db/production.db` | See if key timestamp could be established without reading value | Secret entry table has no created/updated timestamp; cannot date the stored Anthropic credential from this table. | Do not infer when the key was saved. |

## Relevant Existing Behavior And Supported Product Paths
| Behavior ID | Kind | Supported trigger | Current product path / lifecycle | Outcome / invariant | Evidence | Confidence / unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Settings > API Keys > Anthropic > Save Key | Frontend submits a nonblank key through GraphQL; on error, generic failure toast appears. | User's screenshot shows this failure feedback while status is Not Configured. | Screenshot and frontend source. | High for visible behavior; actual thrown error unknown. |
| BEH-002 | System | Built-in provider credential save | GraphQL resolver calls provider service; service stores encrypted key and returns value-free status. | Isolated synthetic probe succeeds. Current local server reports configured. | Backend code, contract, probe, read-only query. | High for normal path; cannot tie current key's presence to screenshot attempt. |

## Runtime, Probe, Or Reproduction Findings
| Method | Scenario | Observation | Implication | Artifact |
| --- | --- | --- | --- | --- |
| Local GraphQL query | Current production-like backend, read-only | Anthropic configured=true, vault READY, catalog count=7. | Screenshot's Not Configured state differs from current server state; could be later save, stale frontend state, or different backend. | `http://127.0.0.1:8000/graphql`, query described above; no secret value returned. |
| Isolated GraphQL mutation | New DB + synthetic key | Before false; mutation HTTP 200/configured true; after true. | No deterministic server rejection for Anthropic or key format. | One-off probe output in current investigation conversation; temp runtime deleted. |
| Server log inspection | Approximate screenshot period | No save-specific failure logged. | Cannot establish exact error from server log alone. | `/home/autobyteus/data/logs/server.log`. |

## Structural And Payload Surface Inventory
- Payload/content: encrypted `secret_entries` row in SQLite; external sibling root-key file; static Anthropic model catalog. Secret value not inspected.
- Structural surfaces: Nuxt editor/runtime/store/Apollo mutation; GraphQL resolver; LLM provider service; vault runtime/catalog/repository.
- Potential impacts: unknown until the failing response is captured. No evidence yet for API/schema, persistence, security, concurrency, or migration change.

## Assumptions, Unknowns, And Risks
| ID | Type | Description | Why it matters | Resolution / owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether the screenshot UI targets this same `:8000` backend. | A different endpoint can explain status mismatch. | User/browser Network endpoint or app context. | Open. |
| UNK-002 | Unknown | Exact client or GraphQL error from the failed mutation. | The toast hides the cause. | User supplies redacted Console/Network response or a reproduced trace. | Open. |
| UNK-003 | Unknown | Whether the currently configured Anthropic key is the user's attempted key, an older key, or a later save. | Status alone does not establish chronology or validity. | User refresh/state report and redacted request timing; do not read credential. | Open. |
| RSK-001 | Risk | Repeating a save against the live DB with a dummy key would replace a potentially valid key. | Data loss/credential disruption. | Do not perform live mutation. | Avoided. |

## Requirement Implications
- The reported error is real as a UI observation, but a specific root cause is not yet proven.
- The current backend and isolated save path work; an invalid Anthropic key format cannot explain a storage failure in this implementation because save checks only nonblank input and does not call Anthropic.
- Before a repair package can be proposed, capture the redacted failing response and reconcile the status mismatch.

## Product Design Request Context
- Product Design request in current input: Not stated.
- UI/UX package: N/A — not applicable.

## Supplemental Artifact Inventory
- N/A — no behavior-defining supplements.


## SR-002 — Full frontend/browser reproduction, 2026-09-23
- Trigger: User explicitly requested starting the frontend with a backend and saving a dummy key through the actual UI.
- Setup: An isolated `/app/autobyteus-server-ts/dist/app.js` server was started with a freshly migrated temporary SQLite database and separate derived root key. The repository Nuxt frontend was started with `BACKEND_NODE_BASE_URL` pointed at that server. Chromium/Playwright opened `/settings?section=api-keys`, selected default Anthropic, entered only `synthetic-ui-probe-not-a-real-anthropic-key`, and clicked Save Key. Ports and processes were temporary and removed; no live credential or live DB was modified. Initial frontend startup failed due missing local workspace contract dependencies; the locked dependencies were installed and the two local contract packages built, after which the test ran. This setup failure is not the reported bug.
- Before save: Browser showed Anthropic **Not Configured** and seven Anthropic models, matching the user's screenshot state.
- Save GraphQL response: HTTP 200, no GraphQL errors, `saveProviderApiKey.provider.id=ANTHROPIC`, `apiKeyConfigured=true`.
- Frontend result: Browser displayed **“Failed to save API key for Anthropic”**, still showed **Not Configured**, and did not clear the input. This visually reproduces the user's screenshot. The browser Console recorded `TypeError: Cannot assign to read only property '0' of object '[object Array]'` at `Proxy.applyCredentialSetting` in `stores/llmProviderConfig.ts`.
- Backend follow-up read: Anthropic `apiKeyConfigured=true`. After a browser reload, Anthropic displayed **Configured**. This proves the UI failure occurred after successful persistence in this reproduction.
- Source-level cause: `autobyteus-web/stores/llmProviderConfig.ts:399` assigns Apollo query result array directly to `providerCredentialSettings`. At lines 491–496 `applyCredentialSetting` tries index assignment or push, then in-place sort. The returned array is read-only at runtime. The store throws at line 494 after the GraphQL mutation succeeds (lines 410–415). `useProviderApiKeySectionRuntime.ts:287–312` catches the thrown store error as if the save itself failed, producing the false toast. The UI never reaches its input-reset/success steps.
- Scope implication: This is a shared frontend store defect, not an Anthropic-specific vault rejection. Other save commands that call `applyCredentialSetting` may be affected; that is a design/verification consideration, not evidence that all such user journeys failed. The specific Anthropic journey is proven.
- Exact evidence: `evidence/ui-probe-summary.json`, `evidence/before-save.png`, `evidence/after-save.png`, `evidence/isolated-backend-runtime.log`, and `evidence/isolated-frontend-runtime.log` under this ticket directory. The summary intentionally omits request variables/key material. Images show only a masked dummy input. The temporary probe script was disposable and is not a normative artifact.
- Revised conclusion: The earlier root-cause uncertainty is resolved for the reproduced failure mode. A different unseen failure in the user's particular environment cannot be categorically excluded, but the screenshot symptom has a precise matching, causally explained reproduction.

## Architecture Investigation Findings — SR-003 Approval Basis
- Approval reference: User message “approve” on 2026-09-23 in direct response to the repair proposal. Approved requirements `REQ-001–004` / `AC-001–004`, supported `SCN-001`, preserve write-only/value-free credential handling. Product Design request N/A.
- Worktree isolation reconfirmed: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure`, branch `requirements/anthropic-api-key-save-failure`, base `origin/personal` revision `467c1bc12d439ee79243d124402c2f65f25c3cd2`; all authored task documents remain here.
- Current entrypoint/lifecycle: `ProviderApiKeyEditor.vue` emits `save`; `ProviderAPIKeyManager.vue` routes to `useProviderApiKeySectionRuntime.saveProviderApiKey`; runtime owns `saving`, notification, and editor reset; `llmProviderConfig` store owns credential-status list; Apollo mutation crosses to GraphQL resolver/service/vault; value-free status returns. The UI runtime's catch currently conflates a post-response store exception with server save failure. Exact source: `autobyteus-web/components/settings/providerApiKey/ProviderApiKeyEditor.vue:62–64`, `ProviderAPIKeyManager.vue:95–104`, `useProviderApiKeySectionRuntime.ts:287–312`, `autobyteus-web/stores/llmProviderConfig.ts:390–416`.
- Return/status lifecycle: `storeToRefs(store)` in `useProviderApiKeySectionRuntime.ts:35–42` feeds the provider summary and `selectedProviderConfigured`; successful `applyCredentialSetting` must publish an updated list before the runtime increments reset version and shows success. Exact source: `useProviderApiKeySectionRuntime.ts:124–162`, `ProviderModelBrowser.vue:47–62`, `ProviderApiKeyEditor.vue:54–59`.
- Ownership/coupling defect: The store takes the Apollo query array by reference at `llmProviderConfig.ts:399`, then `applyCredentialSetting` performs index assignment/push and in-place sort at `:491–496`; the browser trace proves a read-only array at runtime. The store currently mixes Apollo-owned immutable result data with Pinia-owned mutable state. By contrast, `deleteCustomProvider` at `:441` already replaces the list using `filter`; model catalog state uses replacement objects. No separate credential-list writer outside this store was found by `rg 'providerCredentialSettings\\s*(\\.|\\[|=)|applyCredentialSetting\\(' autobyteus-web`.
- Existing owner and API shape are otherwise fit: `fetchProviderCredentialSettings` is the status-read boundary; `applyCredentialSetting` is the shared upsert boundary called by ordinary, custom, Qwen, and Gemini commands (`llmProviderConfig.ts:415,429,467,488`); the GraphQL value-free response shape and backend vault owner need no change. Correcting the collection-ownership invariant inside the store is proportionate. Other special-provider flows must be preserved, not redesigned.
- Test gap: `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts:387–398` tests save only with an initially empty mutable list, so it misses post-fetch frozen-array failure. `components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` uses a real Apollo cache to test initial read but does not save after that read. The browser reproduction evidence covers the actual failure. A durable regression must seed/read a read-only credential list before saving and assert immediate UI/store success, repeated save and unrelated rows.
- Persisted-data transition: **Not Affected** by the proposed frontend-only change. The existing vault's encrypted records are written solely by the unchanged backend resolver/service; the status list is client in-memory projection. No schema, key file, migration, or startup behavior changes. The isolated probe proved current backend save succeeds and returns configured=true; production key value remained untouched. No migration or data rewrite is justified.
- Risk/classification inputs: Production delta is one frontend store's collection ownership/update logic plus focused tests. No API contract, backend persistence, security boundary, concurrency policy, deployment configuration, or subsystem ownership change is required. The same shared method has several callers, so focused regression coverage across its current callsite semantics is needed; this bounded blast radius does not by itself create architectural risk.
