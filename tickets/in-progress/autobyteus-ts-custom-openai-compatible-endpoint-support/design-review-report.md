# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-custom-openai-compatible-endpoint-support/tickets/in-progress/autobyteus-ts-custom-openai-compatible-endpoint-support/design-spec.md`
- Current Review Round: `7`
- Trigger: `Re-review after user-approved scope expansion to add end-to-end custom-provider delete lifecycle and custom-only friendly model-label correction on top of the provider-object direction`
- Prior Review Round Reviewed: `6`
- Latest Authoritative Round: `7`
- Current-State Evidence Basis: `Revised design package plus direct code/context read of the pre-task provider-centered baseline and the screenshot-driven UX gaps called out in the investigation notes on 2026-04-17.`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial design package ready | `N/A` | `3` | `Fail` | `No` | Blocking gaps: secret persistence exposure, selector/catalog distinguishability, and per-endpoint failure isolation. |
| `2` | Revised package after round-1 feedback | `3` | `1` | `Fail` | `No` | Round-1 blockers were closed, but one new design gap remained around post-sync model-catalog cache consistency. |
| `3` | Revised package after round-2 feedback | `1` | `0` | `Pass` | `No` | The revised design routed custom-endpoint changes through the real catalog-serving cache path and named the affected owners/files explicitly. |
| `4` | Revised package after fixed-provider write-only hardening extension | `0` | `0` | `Pass` | `Yes` | The earlier endpoint/source-aware design plus fixed-provider hardening was implementation-ready. |
| `5` | New provider-object architecture direction superseding the earlier public endpoint/source overlay direction | `4` | `1` | `Fail` | `No` | The provider-object direction was cleaner, but provider-name collision/disambiguation was still undefined for the new primary public provider subject. |
| `6` | Revised provider-object package after ARC-005 closure and baseline-API reuse clarification | `1` | `0` | `Pass` | `Yes` | ARC-005 was closed, the public API shape was anchored to the pre-task provider-centered baseline, and no new blockers were introduced. |
| `7` | Revised provider-object package after delete lifecycle + custom-only label correction additions | `0` | `0` | `Pass` | `Yes` | The new delete and label-correction scope is structurally sound and does not reopen earlier resolved issues. |

## Reviewed Design Spec

The revised package remains implementation-ready.

The provider-object architecture still cleanly reuses the pre-task provider-centered baseline, and the new scope additions are now concretely covered without reopening prior review findings.

### Why the revised direction still passes

1. **The provider-centered baseline remains intact**
   - The requirements still explicitly treat the pre-task provider-centered surface as the reference shape (`requirements.md:32, 44, 104, 123`).
   - The design still keeps `availableLlmProvidersWithModels`, `ProviderWithModels`, `reloadLlmProviderModels`, `reloadLlmModels`, and `setLlmProviderApiKey` where they fit, while only upgrading the nested `provider` payload to a provider object (`design-spec.md:15-18, 193-201, 627-636, 755-763`).
   - The new delete support is additive rather than replacing the baseline collection/reload shape: `deleteCustomLlmProvider(providerId, runtimeKind?)` is introduced as a delete-specific lifecycle command because deletion no longer has a valid provider-targeted reload subject (`design-spec.md:274, 288, 633, 719-721`).

2. **The delete lifecycle is now end-to-end and selector-visible**
   - The requirements explicitly cover removal and authoritative post-delete refresh (`requirements.md:60-61, 108-109, 133-134`).
   - The design adds a full delete spine: UI -> resolver -> `LlmProviderService` -> `CustomLlmProviderStore.deleteProvider` -> authoritative catalog refresh -> deleted provider disappears from provider rows/selectors (`design-spec.md:261, 274, 288, 318-324`).
   - The reasoning for the chosen refresh path is correct: because the deleted provider id no longer exists, delete must refresh through `ModelCatalogService.reloadLlmModels(runtimeKind)` instead of a deleted-provider targeted reload (`design-spec.md:633, 719-721`).
   - Ownership is clear: delete is governed by `LlmProviderService`, persistence deletion lives in `CustomLlmProviderStore`, and selector-visible effects still flow through the real cached catalog path (`design-spec.md:318-324, 543-548, 699-721, 783-789`).

3. **The custom-only label correction is explicit and well-bounded**
   - The requirements correctly scope the UX correction to custom `OPENAI_COMPATIBLE` providers only, while preserving existing built-in label behavior in this ticket (`requirements.md:47-50, 109-110, 135-136`).
   - The design makes the rule explicit in the shared model contract and critical behavior rules: for custom providers, `model.name` is the primary UI label, while `modelIdentifier` remains the stored/runtime value (`design-spec.md:204-226, 723-727`).
   - Ownership is appropriately split: runtime/model identity keeps `name` clean in `autobyteus-ts/src/llm/models.ts`, while the custom-only display policy lives in UI-facing label owners such as `ProviderModelBrowser` and `modelSelectionLabel.ts` (`design-spec.md:377, 390, 398, 533-534`).
   - That keeps the UX fix narrow instead of accidentally forcing a built-in-wide relabeling pass.

4. **Earlier resolved structural points remain intact**
   - Write-only secret semantics are still preserved (`requirements.md:42-46, 100-101`; `design-spec.md:350-351, 699-703`).
   - Custom-provider secrets still stay in a dedicated secret-bearing persistence boundary outside generic Server Settings (`requirements.md:46-47, 127-131`; `design-spec.md:229-238, 542-548`).
   - Normalized provider-name uniqueness remains authoritative and unchanged (`requirements.md:50, 103-104`; `design-spec.md:20-23, 170-181, 318-324`).
   - Per-provider failure isolation and cache-consistent selector refresh remain explicit (`requirements.md:97-99, 132`; `design-spec.md:285, 374-376, 728-733, 783-789`).

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `1` | `ARC-001` | `High` | `Resolved` | Custom-provider secrets remain outside generic Server Settings and frontend contracts remain write-only (`requirements.md:42-47, 127-131`; `design-spec.md:229-238, 350-351, 542-548, 699-703`). | Still closed. |
| `1` | `ARC-002` | `High` | `Resolved differently` | The design still keeps provider as the main public subject and avoids reintroducing public source overlays, while carrying direct provider ownership on models (`requirements.md:40-45, 89-93, 101-102`; `design-spec.md:131-160, 204-223, 347-349, 712-715`). | The provider-object model remains the intended replacement for the old source-aware public contract. |
| `1` | `ARC-003` | `Medium` | `Resolved` | Per-provider failure isolation and status snapshots remain explicit (`requirements.md:97-99`; `design-spec.md:285, 374-376, 485-493, 728-733, 783-789`). | Still closed. |
| `2` | `ARC-004` | `Medium` | `Resolved` | Provider save/reload/delete still route through `ModelCatalogService -> AutobyteusModelCatalog -> CachedAutobyteusLlmModelProvider` (`requirements.md:99, 108-109, 132`; `design-spec.md:274, 285, 719-721, 728-733, 783-789`). | Still closed. |
| `5` | `ARC-005` | `Medium` | `Resolved` | Requirements still require normalized unique provider names and duplicate rejection (`requirements.md:50, 103-104`). The design still defines the normalization rule and keeps enforcement authoritative in the provider lifecycle (`design-spec.md:20-23, 170-181, 318-324`). | Still closed. |

## Findings

`None`

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Custom-provider edit lifecycle after delete is added | Delete is now covered, but edit remains a separate lifecycle decision. | Keep as explicit follow-up unless product scope expands. | `Accepted Risk / Follow-up` |
| `/models` availability fallback for targets that do not expose discovery | Some OpenAI-compatible targets may require manual model entry later. | Keep as explicit product follow-up if user demand appears; not blocking this round. | `Accepted Risk / Follow-up` |
| Shared `SecretStore` migration for all fixed-provider and non-LLM secrets | This round preserves write-only frontend semantics, but at-rest unification remains future work. | Keep as explicit follow-up; out of scope for this ticket. | `Accepted Risk / Follow-up` |
| Plaintext app-data secret persistence for first-pass custom providers | At-rest secret hardening may matter later depending on deployment expectations. | Revisit if product/security scope expands. | `Accepted Risk / Follow-up` |

## Review Decision

`Pass`

## Classification

`None`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Custom-provider edit remains a possible follow-up after delete; it is not required for this reviewed scope.
- `/models` fallback/manual-entry remains a future product decision for non-discoverable OpenAI-compatible targets.
- A unified at-rest secret-store migration remains future work beyond this ticket.
- The worktree still contains in-progress code from the superseded endpoint/source-aware direction, so implementation should treat removal/decommission as first-class work, not incremental layering.

## Latest Authoritative Result

- Current Review Decision: `Pass`
- Latest Authoritative Round: `7`
- Notes: `The provider-object architecture remains sound: it still cleanly reuses the provider-centered baseline and preserves prior security/cache/isolation fixes, while the new delete lifecycle and custom-only friendly model-label correction are now fully covered.`
