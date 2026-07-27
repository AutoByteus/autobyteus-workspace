# UI/UX Specification — Gemini Connection Setup

## Status (`Draft`/`Requirements-ready`/`Refined`)

`Requirements-ready — the user approved the compact Gemini Save/overwrite, Save-and-use, and Use-this-mode behavior and explicitly rejected standalone configuration/key removal. The cumulative narrow-scope correction is submitted for architecture review; implementation, API/E2E, and delivery remain unauthorized until a Pass.`

## UX Goal

Let a user configure any of AutoByteus’s three supported Gemini connection modes and explicitly choose exactly one active mode without hidden priority, save-order effects, secret readback, or explanatory clutter.

The surface should feel like the existing API Key Management UI: restrained, direct, and operational. It must distinguish **configured** from **active** using structure and short labels rather than paragraphs that over-explain obvious actions.

## Related Requirements And Acceptance Criteria

- `BEH-001`, `BEH-004`, `BEH-006`, `BEH-007`
- `REQ-001`, `REQ-006`, `REQ-009`, `REQ-010`, `REQ-013`
- `AC-001`, `AC-004`, `AC-006`, `AC-009`, `AC-015`
- `UC-002`, `UC-003`, `UC-005`, `UC-006`, `UC-010`

## Users / Personas / Contexts

- Local desktop user configuring Gemini for the first time.
- Direct-server/browser user managing an existing Gemini setup.
- Operator who keeps more than one valid Gemini configuration but wants deterministic explicit selection.
- Test operator selecting a mode through the same Settings/API command against an isolated test runtime.

The page is not a tutorial. Users who need provider-specific credential instructions may follow an external documentation link in future work; the primary configuration surface stays concise.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
|---|---|---|---|---|---|
| `UXJ-001` | First-time user | No configured options; no active mode | Configure and activate one mode | Chosen option is `Configured` and `Active` | REQ-006, REQ-009, REQ-010 / AC-004, AC-006 |
| `UXJ-002` | Existing user | One active configured mode | Update its credentials/config | Same mode remains active with updated configuration | REQ-006, REQ-010 / AC-004, AC-006 |
| `UXJ-003` | Existing user | Multiple configured options; one active | Switch active mode | Newly selected configured option is active; others remain configured | REQ-010 / AC-006 |
| `UXJ-004` | Existing user | One active option; another option not configured | Configure a secondary option without switching | Secondary option becomes `Configured`; original mode remains `Active` | REQ-006, REQ-010 / AC-006 |
| `UXJ-005` | User during vault failure | Key-backed modes visible but unavailable | Understand/recover without secret exposure | Concise value-free status; catalogs remain usable | REQ-001, REQ-006 / AC-001, AC-004 |

## Journey Details

### UXJ-001 — Configure and activate

1. User selects `Gemini` in the existing provider list.
2. The Gemini section shows `Active mode: Not selected` and three compact option rows.
3. User opens one option through `Configure`.
4. Exactly one editor expands; other rows remain compact.
5. User enters the required fields and selects `Save`.
6. The input clears after success. The row becomes `Configured` and exposes `Use this mode`.
7. User selects `Use this mode`.
8. The header and row show `Active`; no other configuration is removed or modified.

The UI may also provide `Save and use this mode` as the primary first-time action when no active mode exists. This is one explicit compound user action, not implicit activation on every save.

### UXJ-002 — Update active configuration

1. User opens the active option’s editor.
2. Secret inputs remain empty; the UI never pre-fills a saved key.
3. User enters a replacement and selects `Save`.
4. The option remains active because its explicit active-mode setting did not change.
5. Success feedback is the short toast `AI Studio saved.` or `Vertex Express saved.`

### UXJ-003 — Switch mode

1. Multiple rows show `Configured`; exactly one shows `Active`.
2. A non-active configured row exposes `Use this mode`.
3. User selects it.
4. The server verifies the selected option is complete, persists `GEMINI_SETUP_MODE`, and returns the new active mode.
5. Only the `Active` badge moves. Credentials/project configuration remain untouched.

### UXJ-004 — Configure a secondary option without switching

1. One configured option is already active.
2. User opens a different option through `Configure`.
3. User enters the required fields and selects `Save`.
4. The secondary option becomes `Configured`; the existing `GEMINI_SETUP_MODE` and active badge remain unchanged.
5. The secondary row now exposes `Use this mode`.

Saving is create-or-overwrite only. The screen exposes no standalone Gemini key/configuration-removal action; users switch by selecting `Use this mode` and replace configuration by saving a new value.

### UXJ-005 — Vault unavailable

1. Provider and model catalogs still render.
2. AI Studio/Vertex Express status shows `Unavailable` rather than `Not configured` when vault health is not ready.
3. Secret Save/Use actions are disabled.
4. One concise value-free status line appears under the affected editor, e.g. `Credential storage is locked.`
5. Vertex Project remains independently governed by normal non-secret configuration availability.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
|---|---|---|---|---|
| API Key Management | Existing provider/model screen | Settings opened | Loading, ready, provider selected | Select Gemini/provider/model/reload |
| Gemini setup header | Show sole runtime authority | Gemini selected | `Active mode: <mode>` or `Not selected` | Inspect/configure/switch |
| Mode row | Compact option identity/status/actions | Gemini selected | Not configured, configured, active, unavailable | Configure or activate |
| Mode editor | Edit exactly one option | `Configure` selected | Clean, dirty, saving, saved, error | Save/collapse |
| Notification toast | Short operation outcome | Save/select completes/fails | Success/error | Auto-dismiss |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
|---|---|---|---|---|---|
| No active mode | Open Gemini | Header shows `Not selected` | Three compact rows | None | Configure |
| Unconfigured row | `Configure` | Row expands | Required inputs visible | None | Save/collapse |
| Valid unsaved input | `Save` | Button shows `Saving…` | Input disabled temporarily | Save only addressed option | Retry/use/collapse |
| First setup, no active mode | `Save and use this mode` | Single pending action | Row becomes configured + active when both stages pass | One server-owned save-then-activate command; if activation fails, saved configuration remains and the response says configured but not active | Retry activation/update |
| Configured non-active | `Use this mode` | Button shows `Activating…` | Active badge moves on success | Persist normal non-secret `GEMINI_SETUP_MODE` | Invoke/update/switch |
| Active mode | Open editor | No redundant warning | Input empty for secrets | None | Update |
| Save active | Save replacement | `Saving…` | Remains active | Replace addressed config only | Invoke/update |
| Vault closed | Open key-backed option | Concise status | Actions unavailable | None | Recover vault/choose eligible project mode |
| Runtime with no active mode | Invoke Gemini | No implicit mode selection | Value-free error directs to Settings | No secret resolution | Open Gemini Settings |

## Markdown Wireframes / Visual Structure

### Default — no mode selected

```text
┌──────────────────────────────────────────────────────────────┐
│ Gemini                                      Active mode      │
│                                             Not selected     │
├──────────────────────────────────────────────────────────────┤
│ AI Studio                 Not configured      [Configure]    │
│ Vertex Express            Configured           [Use this mode]│
│                                                [Configure]    │
│ Vertex Project            Not configured      [Configure]    │
└──────────────────────────────────────────────────────────────┘
```

No blue explanatory banner is needed. The header and row actions explain the state.

### One editor expanded

```text
┌──────────────────────────────────────────────────────────────┐
│ Gemini                                      Active mode      │
│                                             Not selected     │
├──────────────────────────────────────────────────────────────┤
│ AI Studio                 Not configured      [Collapse]     │
│                                                              │
│ API key                                                     │
│ [ Enter API key                                      ][Show] │
│                                                              │
│ [Save and use this mode]  [Save only]                        │
├──────────────────────────────────────────────────────────────┤
│ Vertex Express            Configured           [Use this mode]│
│                                                [Configure]    │
│ Vertex Project            Not configured      [Configure]    │
└──────────────────────────────────────────────────────────────┘
```

`Save and use this mode` appears as the primary action only when there is no active mode. Once a mode is active, the editor uses `Save` because updating does not change activation.

### Active mode

```text
┌──────────────────────────────────────────────────────────────┐
│ Gemini                                      Active mode      │
│                                             AI Studio        │
├──────────────────────────────────────────────────────────────┤
│ AI Studio                 Configured  [Active] [Configure]    │
│ Vertex Express            Configured           [Use this mode]│
│                                                [Configure]    │
│ Vertex Project            Not configured      [Configure]    │
└──────────────────────────────────────────────────────────────┘
```

### Vertex Project editor

```text
Vertex Project                                      Configured

Project ID                    Location
[ my-project              ]   [ us-central1               ]

[Save]
```

Project and location are non-secret and may be displayed/prefilled. API key fields are never prefilled.

## Non-Happy-Path States

### Loading

- Use the existing provider-section loading treatment.
- Do not render placeholder secret values.
- Render Gemini from its single provider Settings record. Capability catalogs are subordinate groups and do not own or repeat credential status; a vault/status failure must not erase successful Gemini model groups.

### Empty

- `Active mode: Not selected` is a valid configuration state.
- Catalog/model areas remain populated independently.
- Gemini invocation is unavailable until one configured mode is explicitly activated.

### Error And Recovery

Use short operation-specific messages:

- `AI Studio could not be saved.`
- `Vertex Express could not be activated.`
- `Gemini mode is not selected.`
- `The selected Gemini mode is not configured.`
- `Credential storage is locked.`

Do not show raw GraphQL, provider, database, key-path, or cryptographic causes in the user message. A value-safe technical-details path may expose a stable code.

### Disabled / Unavailable

- `Use this mode` appears only for a complete configured option.
- The active row displays `Active` instead of a disabled duplicate button.
- Key-backed actions are unavailable when vault health is closed.
- A row-level reason appears only when needed; do not repeat the same status in the page header and every row.

### Permission / Authentication

No new application user/admin permission model is introduced. Provider authentication is configured server-side; saved credential values never return to the browser.

## Responsive And Platform Behavior

### Desktop/wide

- Preserve the existing provider list + detail layout.
- Mode status/actions align in one compact row.
- Only one option editor is expanded at a time.

### Narrow/mobile web

- Header stacks `Active mode` below `Gemini`.
- Each mode row becomes two lines: label/status, then actions.
- Buttons remain at least 44px touch targets.
- Project/location fields stack vertically.

Electron and direct browser render the same component and behavior.

## Accessibility And Keyboard Behavior

- Mode rows use semantic headings or labelled regions.
- `Configure`, `Use this mode`, and `Save` are real buttons with visible focus.
- Expanding an editor moves focus to its first input.
- Saving/activating announces a concise `aria-live` status.
- Status is communicated by text (`Configured`, `Active`, `Unavailable`), never color alone.
- Secret visibility toggles have accessible names and affect only transient typed input.

## Content, Labels, And Validation Messages

### Preferred labels

| Purpose | Label |
|---|---|
| Section | `Gemini` |
| Selected authority | `Active mode` |
| No selection | `Not selected` |
| Configure editor | `Configure` |
| Activate | `Use this mode` |
| First-time compound action | `Save and use this mode` |
| Secondary first-time action | `Save only` |
| Config state | `Configured` / `Not configured` |
| Active state | `Active` |
| AI Studio secret input | `API key` |
| Vertex Express secret input | `API key` |
| Vertex Project fields | `Project ID`, `Location` |

Avoid:

- long educational paragraphs;
- “effective mode” when the state is explicitly selected;
- “authentication requirement” in the UI;
- repeated explanations of priority/fallback because neither exists;
- exposing environment variable or `secret_id` names to ordinary users;
- implying that saving automatically activates.

### Validation

- AI Studio/Vertex Express Save requires a non-empty transient key input.
- Vertex Project Save requires both trimmed Project ID and Location.
- `Use this mode` requires the server’s current configured status, not merely local form content.
- Saved secret input is cleared on success and component close.

## Data And API Dependencies

Required query projection:

```ts
type GeminiSetupState = {
  activeMode: 'AI_STUDIO' | 'VERTEX_EXPRESS' | 'VERTEX_PROJECT' | null;
  aiStudioConfigured: boolean | null;
  vertexExpressConfigured: boolean | null;
  vertexProject: {
    project: string;
    location: string;
  } | null;
};
```

The general `providerSettings` group for Gemini reuses the established provider/model types. Its provider-level `apiKeyConfigured` value is true when at least one supported Gemini option is completely configured (AI Studio key, Vertex Express key, or complete Vertex Project project/location); it does not mean a mode is active. Its four model lists remain credential-independent. The group does not duplicate option status, active mode, project/location, instruction codes, or the specialized state. The Gemini editor obtains all option-specific configuration and active-mode state only from the specialized query above.

`aiStudioConfigured` and `vertexExpressConfigured` are ordinary booleans when readable. A null value accompanied by its GraphQL field error means the credential state could not be read; no `MISSING|CONFIGURED|UNAVAILABLE` wrapper is needed. Vertex Project is represented by one complete object or null, so it needs no second configured flag.

Required operations (no removal command):

```text
saveGeminiAiStudio(apiKey, activateAfterSave)
saveGeminiVertexExpress(apiKey, activateAfterSave)
saveGeminiVertexProject(project, location, activateAfterSave)
useGeminiMode(mode)
```

Behavior:

- each option-specific Save accepts only fields that option actually needs; **Save** passes `activateAfterSave=false`, while **Save and use this mode** passes `true`;
- `useGeminiMode` validates current server-side completeness, then persists non-secret `GEMINI_SETUP_MODE`;
- save does not activate unless `activateAfterSave=true`;
- Save is create-or-overwrite; neither the ordinary provider surface nor the Gemini surface exposes a standalone key/configuration-removal operation;
- the compound action saves first and activates second; a failed activation leaves the option configured and active mode unchanged;
- the query and every Gemini Save/Use mutation return the same authoritative `GeminiSetupState`; the UI compares the requested action with the returned option configuration and `activeMode` to render full or partial success;
- responses do not add `operation`, `outcome`, stage-outcome, or `instructionCode` fields;
- queries never return secret values.

Persistence:

- `GEMINI_SETUP_MODE` is normal non-secret application configuration, not `secret_entries` data;
- production Settings persists it through the normal application configuration owner;
- tests use the same activation API and persist it only in their ignored ordinary runtime `.env`; the committed `.env.test` is immutable launch configuration and never contains the selection;
- absent/invalid mode is `Not selected`/closed, never priority fallback.

## Out Of Scope

- Provider tutorials or account-creation walkthroughs.
- Automatic mode inference/priority.
- Automatic activation after ordinary Save.
- Standalone deletion/removal of a Gemini key or configuration; Save overwrites and `Use this mode` switches selection.
- Secret value display/readback.
- Model filtering by configured/active mode.
- Live Vertex model listing.

## Resolved Design Notes / Risks

- `GeminiConfigurationService` owns Save, Save-and-activate, and Activate command sequencing and returns one authoritative setup state; the UI never orchestrates cross-owner compensation or interprets a parallel outcome protocol.
- `AppConfig` owns `GEMINI_SETUP_MODE`, project, and location. The vault owns AI Studio and Vertex Express values. Their cross-owner compound operations return the truthful resulting setup state rather than claim impossible atomicity or add a staged-outcome DTO.
- Managed Gemini clients never use credential aliases from `.env` as credential authority or fallback; AppConfig may still preserve established `.env`/`process.env` projection for the wider application. Explicit importer/UI vault provisioning remains required.

## Approval Status

`The compact Gemini Save/overwrite, Save-and-use, and Use-this-mode journeys, the absence of standalone Gemini removal, and the provider-centric general group are user-approved and travel with the cumulative architecture-review package.`

Approval makes this supplement part of the intended-behavior requirements basis. It does not authorize implementation before the complete clean-state design passes architecture review.
