# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Refined` — approved by the user on 2026-08-23 and clarified in `SR-007` for the already-approved host-change and mixed-result journeys. This version supersedes the former global Reload, static-provider Reload, refresh-on-cache-hit, and whole-catalog loading behavior.

## UX Goal

Credential management is always the primary usable surface. Model availability is supplementary and provider-local: static models appear immediately; a cold dynamic provider loads only its own models; a warm dynamic provider uses its in-process snapshot; and a provider-local Reload never removes the credential form or last-known models.

## Related Requirements And Acceptance Criteria

- Requirements: `REQ-001`–`REQ-018`
- Acceptance criteria: `AC-001`–`AC-022`
- Current-state screenshot: `api-key-panel-loading.png`

## Product Rules

1. The page header has no **Reload Models** action.
2. Static/pre-provided providers show curated models immediately and have no Reload.
3. Dynamic sources are AutoByteus, Ollama, LM Studio, and each custom OpenAI-compatible provider.
4. Selecting a cold dynamic provider automatically starts only that provider's discovery.
5. Selecting a warm dynamic provider shows the in-process snapshot immediately and performs no network request.
6. Only a selected dynamic provider shows **Reload Models**. While it reloads, last-known rows remain visible.
7. Provider navigation and credential configuration remain usable during every model state.
8. AutoByteus key save applies configured state and reports credential success first. The mounted UI then starts a non-awaited exact-AutoByteus ensure so its model section transitions to background refreshing and ultimately publishes the server result.
9. Static-provider, Gemini, and Qwen credential saves do not refresh models.
10. No UI claims an offline/durable cache; after application restart, dynamic sources are cold again.

## Users / Personas / Contexts

- A user opening API Keys while a configured AutoByteus gateway is offline.
- A user providing a first credential before any dynamic model has loaded.
- A user revisiting a dynamic provider whose models were discovered earlier in the same process.
- A user manually refreshing one changing endpoint.
- A user changing gateway hosts or creating/deleting a custom provider.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related IDs |
| --- | --- | --- | --- | --- | --- |
| `UXJ-001` | User with cold/offline gateway | API Keys opens; dynamic sources cold or unreachable | Configure a credential immediately | Provider/form ready; selected model section independently loads or reports unavailable | `REQ-001`–`REQ-006`, `AC-001`–`AC-007` |
| `UXJ-002` | User selecting a static provider | Static provider selected | See known models and configure key | Curated models shown immediately; no Reload present | `REQ-007`, `AC-008` |
| `UXJ-003` | User selecting a cold dynamic source | Dynamic provider selected with no process snapshot | Discover its models | Only that model section progresses to ready/empty/unavailable | `REQ-008`, `REQ-015`, `AC-009`, `AC-017`–`AC-020` |
| `UXJ-004` | User revisiting during one process | Dynamic provider has a successful process snapshot | Revisit without delay | Cached rows render immediately; no request occurs | `REQ-009`, `AC-010` |
| `UXJ-005` | User needing current dynamic data | Dynamic provider has current/last-known rows | Explicitly refresh it | Rows remain during refresh; only this source updates or warns | `REQ-011`, `REQ-017`, `AC-011`–`AC-013` |
| `UXJ-006` | User saving credentials/custom provider | Credential form is ready; model work may be pending | Complete command | Credential result settles independently; applicable source refresh is background only | `REQ-005`, `REQ-012`–`REQ-014`, `AC-014`–`AC-016` |
| `UXJ-007` | User changing discovery hosts | Host/source identity is changed | Avoid showing models from the old source | Only affected dynamic section becomes cold/loading; unrelated sections remain unchanged | `REQ-017`, `REQ-018`, `AC-013` |

## Journey Details

### `UXJ-001` — Fast API Keys entry

1. The user selects **API Keys**.
2. Page heading, provider navigation, and a credential-area skeleton or local error render independently of models.
3. The local credential read resolves and the selected provider form becomes usable within the performance budget.
4. The model area reads current local snapshots separately. It never places an overlay over provider navigation or the form.
5. The user may change provider, type, or save while any dynamic source is still pending.

### `UXJ-002` — Static provider

1. The user selects OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Kimi, Qwen, GLM, or MiniMax.
2. Curated model rows appear immediately from local state.
3. No Reload or Retry affordance appears because the model list is not discovery-backed.
4. Optional metadata may enrich the cards later without changing model presence or blocking interaction.

### `UXJ-003` — First dynamic demand

1. The user selects AutoByteus, Ollama, LM Studio, or a custom provider with no successful in-process snapshot.
2. The model section announces **Loading models…** and starts only that source.
3. The credential form remains present and independently interactive.
4. Success shows rows or the authoritative **No models found** state.
5. Partial AutoByteus success shows successful rows and a compact warning.
6. Cold failure shows **Models unavailable** with **Retry**; it does not create a credential error.

### `UXJ-004` — Dynamic cache hit

1. The user revisits a dynamic provider discovered earlier in this process.
2. The previous snapshot and its model count render immediately.
3. No spinner, refresh badge, or background network request starts.
4. The user may choose **Reload Models** if a live refresh is desired.

### `UXJ-005` — Provider-local manual Reload

1. The user selects **Reload Models** inside a dynamic provider's model section.
2. That control disables and the section announces **Refreshing models…**.
3. Existing rows/count stay visible and usable.
4. Success atomically replaces only that provider's rows.
5. Failure retains existing rows and shows **Could not refresh models. Showing last known models.**
6. With no prior snapshot, failure uses the cold unavailable state.

### `UXJ-006` — Credential and custom-provider commands

- Ordinary static/Gemini/Qwen save: only the form reports saving; success updates configured state, with no model transition.
- AutoByteus save: the credential mutation applies configured state and the form reports success first. The section runtime then starts—but does not await—the model store's exact-AutoByteus ensure. It sends the targeted server ensure even when an old client snapshot is `READY`, retains those rows, shows background loading/refreshing, joins the already-scheduled server single-flight, and publishes the final provider snapshot. A model failure remains localized and does not alter the credential notification.
- Custom create: the existing endpoint probe remains part of creation. On success, its returned models appear immediately as the initial ready snapshot; no second loading pass occurs.
- Custom delete: the provider and only its model snapshot disappear after command success.

### `UXJ-007` — Endpoint or host change

1. The user saves changed AutoByteus/Ollama/LM Studio host settings.
2. The normal setting-save success appears independently; it does not wait for model discovery.
3. The shared model store immediately clears rows/status for only the mapped dynamic provider/model kinds and starts a non-awaited provider-targeted ensure. Unaffected kinds such as video remain present. This occurs even when API Keys is not mounted and its prior snapshot was `READY`.
4. Rows belonging to the old full discovery identity—including a same-authority endpoint with a different scheme or path—must no longer be presented as current or executable.
5. Only the affected source shows loading (or unavailable if the new source fails) while the contained refresh runs. Returning to API Keys displays that current shared state/result, never the pre-save snapshot.
6. Other providers retain their rows and state; there is no global refresh or global loading treatment.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States / Rules | Exit / Next Action |
| --- | --- | --- | --- | --- |
| API Key Management header | Page identity/navigation | API Keys route selected | No model Reload action | Return to workspace |
| Provider navigation | Select provider and show configured state/model count | Credential descriptors ready | Count may be unknown/loading; selection never waits for discovery | Select provider |
| Provider configuration pane | Provider-specific credential/custom controls | Provider selected | Ready, saving, validation error, saved; unaffected by model state | Save/probe/create/delete |
| Selected provider model section | Static rows or one dynamic lifecycle | Provider selected | Static-ready; cold loading; ready; refreshing-with-rows; empty; partial; stale warning; unavailable | Reload/Retry only if dynamic |
| Dynamic Reload/Retry | Force one live source | Dynamic provider selected | Disabled only for that source's active attempt | Refresh exact provider |
| Notification | Report explicit commands | Command completed | Credential and model outcomes remain separate | Auto-dismiss/current behavior |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Credential entry | Open API Keys | Shell + credential-area progress | Provider/form ready or local credential error | Local credential read only | Select/save or retry |
| Static selection | Select static provider | Curated rows render | Static ready; no Reload | Local snapshot read | Configure credential |
| Cold dynamic selection | Select cold dynamic provider | **Loading models…** locally | Ready/empty/partial/unavailable | Exact provider ensure | Configure credential; Retry after failure |
| Warm dynamic selection | Revisit ready provider | Rows/count immediate | Ready with Reload | Local snapshot only | Reload or configure |
| Manual reload | Select provider Reload | Rows retained; **Refreshing models…** | Replaced rows or retained stale warning | Exact provider force reload | Continue credential work; Retry |
| AutoByteus save | Save valid key | Configured state + credential success first | Non-awaited exact AutoByteus model action shows refreshing/final state | Server schedules source refresh; client ensure joins/publishes it | Continue navigation/editing |
| Host change | Save new host settings | Settings success independent | Exact provider becomes cold/loading in shared state; all old affected-source rows are absent, including same-authority old paths | Server exact invalidation/detached ensure + non-awaited client targeted ensure | Navigate freely; return sees current result; retry in provider section |

### Model State Contract

| State | Model Rows | Status Copy | Action | Credential Impact |
| --- | --- | --- | --- | --- |
| Static ready | Curated rows immediately | None | No Reload | None |
| Dynamic cold/idle | None | Transition immediately to **Loading models…** on selection/demand | Reload disabled while initial attempt active | None |
| Dynamic loading | None | **Loading models…** | Disabled spinner | None |
| Dynamic ready | Snapshot rows | None | **Reload Models** | None |
| Dynamic ready-empty | None | **No models found** | **Reload Models** | None |
| Dynamic refreshing | Last-known rows | **Refreshing models…** | Reload disabled | None |
| Dynamic partial | Current successful rows from some hosts or model kinds | **Some model sources were unavailable** | **Reload Models** | None |
| Dynamic stale-error | Last-known rows | **Could not refresh models. Showing last known models.** | **Retry** | None |
| Dynamic cold error | None | **Models unavailable** | **Retry** | None |

Unknown or loading model counts must use a neutral placeholder/progress treatment, never a false confirmed `0`.

## Non-Happy-Path States

### Loading

- Credential loading and model loading are separate.
- First dynamic discovery uses compact provider-local progress.
- Refresh retains existing rows and focus.

### Empty

- **No models found** is only a successful authoritative empty result.
- A failed cold attempt is **Models unavailable**, never successful empty.

### Error And Recovery

- Credential errors use the credential area and retry only its local read/command.
- Model failures stay in the model section; partial/stale rows remain visible.
- Current rows from one AutoByteus kind plus a cold failure from another are a partial result. The UI must not claim those current rows are last-known/stale; per-kind status remains available to explain the unavailable part.
- Stale copy is reserved for rows retained from a failed refresh of the same source. If an endpoint identity changed, old rows are cleared and a failed replacement is cold unavailable rather than stale.
- A model failure after credential success cannot relabel the command.

### Disabled / Unavailable

- Save follows only established form validation/submission.
- Reload is absent for static providers and disabled only during its exact dynamic attempt.
- Model state never disables provider navigation.

### Permission / Authentication

- No new permission state is introduced.
- Credential inputs remain transient/write-only and preserve existing visibility/clearing behavior.

## Markdown Wireframes

### Static provider

```text
API Key Management
Manage provider keys and available models

┌ Providers ─────────┐  ┌ OpenAI                    Configured ─────┐
│ ● OpenAI        12 │  │ [API-key configuration / Save]           │
│ ○ AutoByteus     — │  ├───────────────────────────────────────────┤
│ ○ Ollama          8 │  │ Models                                   │
│ + New provider      │  │ [curated model cards shown immediately]  │
└─────────────────────┘  │            (no Reload action)            │
                         └───────────────────────────────────────────┘
```

### Dynamic provider during first discovery

```text
┌ Providers ─────────┐  ┌ AutoByteus                Configured ─────┐
│ ○ OpenAI        12 │  │ [API-key configuration / Save]           │
│ ● AutoByteus     … │  ├───────────────────────────────────────────┤
│ ○ Ollama          8 │  │ Models                                   │
└─────────────────────┘  │  ◌ Loading models…                       │
                         └───────────────────────────────────────────┘
```

### Dynamic provider during manual refresh

```text
┌ AutoByteus Models ─────────────────── [Refreshing…] ┐
│ [last-known LLM/audio/image model cards remain]     │
│ Some sources may report a localized warning here.   │
└──────────────────────────────────────────────────────┘
```

There is never a whole-page model spinner and never a global Reload button.

## Interaction Details

- Changing provider selection must not cancel or overwrite another source's lifecycle; results publish only to their exact source.
- Repeated selection while a cold attempt is active joins it and does not flash between states.
- Starting/completing refresh must not move focus from a credential input.
- A credential Save control follows only its own validation/submission state.
- AutoByteus LLM/audio/image progress may be summarized at provider level while preserving per-kind partial failure information for diagnostics and retry semantics.
- Gateway-discovered cards may be grouped under AutoByteus, but labels/identifiers must retain the actual upstream provider identity.
- The credential action never returns a model promise. The API Keys runtime invokes the model-store ensure only after the success notification/state is applied; changing selection or leaving Settings does not let its exact-key response overwrite another provider/runtime.
- The Server Settings store owns the corresponding cross-section handoff: after a supported host save succeeds, it directly invokes the model store's exact provider convergence action without awaiting it. Pinia persists across Settings-section unmounts, so no event bus, API Keys mount, or global catalog fetch is required.

## Responsive And Platform Behavior

- Preserve the existing side-by-side large-screen and stacked narrow-screen layout.
- On narrow screens: provider navigation, credential form, then model section.
- A tall or slow model state cannot push the credential form behind a blocking overlay.
- Browser-equivalent and Electron behavior must match; no desktop-only interaction is introduced.

## Accessibility And Keyboard Behavior

- Provider selection, Save, Reload, and Retry are keyboard reachable with visible focus.
- Loading/refresh text uses a polite status announcement; failures use a non-destructive alert.
- Progress includes text, not animation alone.
- Existing rows remaining during refresh prevents unnecessary focus loss and layout collapse.
- Disabled Reload has adjacent status text explaining the active operation.

## Content, Labels, And Validation Messages

Required semantic copy:

- **Loading models…** — first dynamic attempt with no prior snapshot.
- **Refreshing models…** — forced/background refresh with possible prior rows.
- **No models found** — successful authoritative empty result.
- **Models unavailable** — cold attempt failed and no snapshot exists.
- **Some model sources were unavailable** — partial AutoByteus result.
- **Could not refresh models. Showing last known models.** — refresh failed with a usable snapshot.
- **Reload Models** / **Retry** — provider-local dynamic action only.

Exact localization keys may follow repository conventions while preserving these meanings.

## Data And API Dependencies

- Provider descriptors and `apiKeyConfigured` are credential-free and load independently.
- Catalog snapshots expose static/current registry rows plus safe lifecycle status; they never expose credentials.
- Initial snapshot reads perform no remote request. Dynamic ensure/reload are explicit source-targeted operations.
- UI store keys include runtime and exact discovery owner; one runtime's late response cannot publish into another.
- Supported discovery-setting keys map explicitly to AutoByteus LLM/audio/image, Ollama LLM, or LM Studio LLM. Immediately after confirmed mutation success, the client fences and clears only those provider/model-kind rows before issuing its targeted ensure; unrelated settings and unaffected kinds such as video perform no catalog transition. The ordinary settings-list reload may finish later and does not govern this model handoff.

## Out Of Scope

- Global Reload, static-provider Reload, automatic warm-cache refresh, periodic/TTL refresh.
- New visual system, model-card redesign, host editor, or credential-field redesign.
- Offline/durable cache promise.
- Changes to inference/media operation timeouts.

## Open Decisions / Risks

- No product decision remains open.
- Model count remains unknown until a cold dynamic source settles; the neutral placeholder is intentional.
- A process restart returns dynamic providers to cold state; the UI must not imply offline persistence.
- A legitimate AutoByteus host may time out after `30,000ms`; recovery remains provider-local.

## Approval Status

`Approved` by the user on 2026-08-23 following source-code re-analysis. `SR-006` clarified the already-approved AutoByteus success-first refreshing/final publication path. `SR-007` clarifies the already-approved exact host-change transition and partial/stale copy semantics exposed by code review; it adds no product surface and does not change the UX contract. No UX decisions remain blocking.
