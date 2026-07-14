# Compaction Strategy Settings UI/UX Specification

## Status

`Reconciled after Code Review Round 7 / ready for architecture re-review` — the user-approved product direction and server-normalized effective-ID baseline are unchanged. CR-PMCS-009 removes the unsupported same-window rebinding journey and its Compaction-specific revision-fenced patch states. The authoritative desktop journey is now the real product flow: open one node's own window, edit its Compaction settings, save through the existing per-key setting action, and continue using that node.

Canonical path: `tickets/done/pluggable-memory-compaction-strategies/compaction-strategy-settings-ui-ux-spec.md`

## UX Goal

Let a user choose the working-context compaction strategy for the currently bound server node without configuring every agent and without exposing a strategy's private worker implementation.

The Compaction card must distinguish:

- **strategy selection** — which registered context-to-context algorithm the server uses globally;
- **universal compaction controls** — trigger ratio, effective context override, and detailed logs;
- **strategy internals** — agents, teams, prompts, condensers, files, and other mechanisms that remain owned by the selected strategy and are not generic controls.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-PMCS-004, REQ-PMCS-010, REQ-PMCS-017, REQ-PMCS-019 through REQ-PMCS-021, and REQ-PMCS-025 through REQ-PMCS-030.
- Acceptance criteria: AC-PMCS-013, AC-PMCS-015 through AC-PMCS-017, and AC-PMCS-023 through AC-PMCS-029.
- Mandatory-artifact relationship: `requirements.md` owns the authoritative user-visible requirements and acceptance criteria; `design-spec.md` owns API, state, file, and dependency design. This supplement clarifies the observable UI states and journeys.

## Users / Personas / Contexts

- A local or remote-node operator comparing process-global compaction strategies.
- A user tuning when compaction occurs without needing to understand its internal agent workflow.
- A user recovering from an unavailable registry catalog, an obsolete configured strategy ID, or a failed settings write.

On desktop, the card operates inside the separate Electron window already bound to one node during bootstrap. Opening another node focuses or creates that node's own window; this Compaction surface does not switch the current desktop window from node A to node B. Generic/mobile node-binding behavior is separate scope and remains unchanged.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-PMCS-001 | Operator on Settings -> Server Settings -> Basics | Bound server is ready; catalog/settings are available | Review the active global strategy and universal controls | Card shows registry name and current values | REQ-PMCS-017, REQ-PMCS-025, REQ-PMCS-027; AC-PMCS-023, AC-PMCS-026 |
| UXJ-PMCS-002 | Operator changing global behavior | At least one registered strategy is available | Select a strategy and save | Server persists the stable strategy ID; subsequent compactions use it | REQ-PMCS-019, REQ-PMCS-021, REQ-PMCS-025; AC-PMCS-017, AC-PMCS-023 |
| UXJ-PMCS-003 | Operator tuning trigger/diagnostics | Card loaded | Change ratio, context override, or detailed logs | Existing global controls persist with unchanged semantics | REQ-PMCS-027; AC-PMCS-026 |
| UXJ-PMCS-004 | Operator on a server with an obsolete/unknown configured strategy | Settings contain an ID absent from the current registry | Recover without silent fallback | Unknown ID is identified; user selects an available strategy and saves | REQ-PMCS-019, REQ-PMCS-027; AC-PMCS-015, AC-PMCS-025 |
| UXJ-PMCS-005 | Operator experiencing catalog/save failure | Server query or mutation fails | Understand failure and retry safely | Error remains visible; no false success; retry is available | REQ-PMCS-027; AC-PMCS-025 |
| UXJ-PMCS-006 | Operator on a fresh/blank node | No nonblank persisted strategy key | See what runtime will actually use without causing a write | Server-effective `Structured JSON` is shown as clean; no default is persisted | REQ-PMCS-029; AC-PMCS-028 |
| UXJ-PMCS-007 | Operator saving several fields in one node-bound desktop window | Several changed valid fields on the opened node | Save through the existing simple setting flow and understand a same-node later-key failure | Full success is clean; first failure stops remaining writes, stays visible, and never produces false whole-card success | REQ-PMCS-030; AC-PMCS-029 |

## Journey Details

### UXJ-PMCS-001 — Review configuration

1. User opens Settings -> Server Settings -> Basics.
2. The existing Compaction card loads generic settings plus `getEffectiveWorkingContextCompactionStrategyId` and the registry-backed strategy catalog from the server to which this desktop window is already bound.
3. The strategy selector presents each strategy's `name`; its option value is the stable `id`.
4. The selected/dirty baseline is the server-returned effective ID, never a web constant or first catalog option.
5. The first production catalog contains `Structured JSON` (`structured-json`).
6. The card does not load the agent-definition catalog and does not show a compactor-agent field, launch summary, or missing-agent warning.

### UXJ-PMCS-002 — Select and save strategy

1. User selects a registered strategy name.
2. The save control becomes enabled and clearly indicates an unsaved change.
3. On save, the card builds a deterministic list containing only changed valid fields.
4. For each changed field, the card awaits the existing `ServerSettingsStore.updateServerSetting(key, value)` action. No Compaction-specific batch result, revision argument, or client/session owner is added.
5. The first thrown server validation/persistence error stops the loop, remains visible, and prevents every later unsent field from being attempted.
6. While saving, the save control is disabled and exposes busy state.
7. Because every successful existing action reloads authoritative settings, a fully successful loop leaves all submitted values clean.
8. If a later write fails after an earlier write succeeded, the card shows no whole-card success. Earlier same-node values remain persisted, while failed and unsent draft values remain dirty against the reloaded authoritative store state; no rollback is implied.
9. A confirmed strategy change applies to subsequent compaction operations on that server; it does not alter agent definitions or interrupt an operation already executing.

### UXJ-PMCS-003 — Tune universal controls

The existing fields remain below the strategy selector:

- Compaction trigger ratio (%), constrained to 1–100;
- Effective context override, blank or a positive integer;
- Enable detailed compaction logs, boolean.

Their existing runtime meaning remains unchanged. They are not copied into individual agents.

### UXJ-PMCS-004 — Recover unknown configured ID

1. If the persisted explicit ID is not returned by the bound server's registry, the card must not silently display `Structured JSON` as if it were active.
2. The selector shows a nonselectable/unavailable representation identifying the current ID and an inline warning.
3. Registered choices remain selectable.
4. Saving a valid choice replaces the obsolete ID and clears the warning after authoritative reload.

### UXJ-PMCS-005 — Recover from failures

- Catalog failure disables only reliable strategy selection, retains the currently configured text for context, and presents an inline retry action.
- Universal settings remain visible. They may remain editable, but a save must never overwrite the strategy with a guessed/default ID while the catalog is unavailable.
- Mutation failure leaves failed and unsent input dirty, presents the server error, stops later writes, and does not show or infer whole-card success.
- Existing generic binding-aware read state continues to discard a catalog/settings response if its node revision is no longer current. This is read invalidation for contexts such as the separate mobile session flow, not a desktop Compaction save/rebind journey.

### UXJ-PMCS-006 — Fresh or blank strategy setting

1. The server effective-selection read applies the same core normalization used by runtime.
2. An absent key or whitespace/blank value returns `structured-json`; an explicit value returns its normalized ID even when unregistered.
3. The card initializes both its selected value and dirty baseline from that effective ID.
4. Therefore absent/blank `structured-json` is clean. Opening the card, retrying reads, or saving only another universal field does not write `AUTOBYTEUS_COMPACTION_STRATEGY`.
5. With a test-only second registration and no configured key, the effective read still selects `structured-json`; catalog order never chooses the selection.

### UXJ-PMCS-007 — Save several settings in one node window

1. The user creates/configures a node or opens it from Node Manager; Electron focuses or creates that node's separate window.
2. Window bootstrap establishes that window's node context once. The user opens Server Settings -> Basics in that window.
3. The card computes changed valid fields in deterministic order and calls the existing `updateServerSetting` action sequentially.
4. If every call succeeds, existing reload behavior supplies authoritative same-node values and the card becomes clean.
5. If the first call fails, no later key is sent. The server error remains visible and all draft changes remain dirty.
6. If a later call fails, earlier calls remain persisted on this same node, no later key is sent, the error remains visible, failed/unsent values stay dirty, and the card never announces whole-card success or rollback.
7. Opening a different node occurs in that node's own window; it is not an alternate branch of this save journey.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| Settings -> Server Settings -> Basics | Existing global settings surface | Bound server selected | Server ready/unavailable | Open Compaction card |
| `CompactionConfigCard` | Edit one server's global compaction configuration | Server settings surface mounted in its node window | Loading, ready, dirty, saving, catalog/effective-read error, unknown ID, same-node save error | Save or retry |
| Strategy selector | Present registry-backed names against server-effective selected ID | Catalog and effective ID loaded from the window-bound server | One/many options, absent/blank effective default, unknown explicit ID, disabled during load/save | Change selection |
| Universal controls | Preserve trigger/context/log configuration | Server settings loaded | Valid, dirty, validation error, saving | Save |
| Existing `ServerSettingsStore.updateServerSetting` | Validate/persist one changed field and reload authoritative settings | One changed key/value | Success or server failure | Continue next changed field or stop |
| Save control | Persist dirty values | At least one valid change | Disabled, enabled, busy, failed | Continue or retry |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Initial loading | Card mounts in the node-bound window | Strategy selector disabled; loading text/status exposed | Awaiting catalog/effective ID/settings | Reads target the current window's server | Wait |
| Ready, absent/blank strategy | Queries succeed; effective read returns `structured-json` | `Structured JSON` shown | Clean despite no nonblank persisted key | None; no default write | Edit controls |
| Ready, explicit valid strategy | Queries succeed | Matching catalog name shown | Clean | None | Edit controls |
| Dirty strategy | User selects option | Save becomes enabled | Dirty | Local ID only | Save or restore selection |
| Dirty universal setting | User edits valid value | Save becomes enabled | Dirty | Local value only | Save |
| Invalid ratio/override | User enters invalid value | Field-level message; save disabled | Invalid | None | Correct value |
| Saving | User activates save | Busy state; duplicate submission prevented | Saving | Existing per-key mutations run sequentially in deterministic changed-key order | Wait |
| Save success | Every changed key succeeds and reloads | Error cleared | Clean, authoritative values | `.env`/process updates on the opened node | Continue |
| First-key mutation failure | First mutation fails | Inline server error | Dirty/error | No later key sent; no successful write | Retry dirty values |
| Later-key mutation failure | A later mutation fails after an earlier success | Inline server error; no whole-card success | Remaining failed/unsent values dirty | Earlier same-node writes remain; no later key sent; no rollback claim | Retry remaining dirty values |
| Generic read invalidation | Existing non-desktop/generic node context changes while a catalog/settings read is pending | Old read is not rendered | Await current-node reads | Stale response discarded by existing binding-aware store behavior | Wait or retry |
| Catalog failure | Strategy query fails | Inline catalog error and retry | Strategy control unavailable; no guessed write | None | Retry; edit universal values if safe |
| Unknown configured ID | Settings ID absent from catalog | Warning names ID | Recovery required | No silent fallback | Select available strategy and save |

## Markdown Wireframes / Visual Structure

```text
+--------------------------------------------------------------+
| Compaction configuration                                  [✓] |
| Choose the global compaction strategy and adjust when it      |
| runs. Strategy internals are managed automatically.           |
|                                                              |
| Compaction strategy                                           |
| [ Structured JSON                                         v ] |
| Used for subsequent compactions on this server.               |
|                                                              |
| Compaction trigger ratio (%)                                  |
| [ 80                                                       ] |
|                                                              |
| Effective context override                                    |
| [ Leave blank to disable                                   ] |
|                                                              |
| [x] Enable detailed compaction logs                           |
+--------------------------------------------------------------+
```

There is no `Compactor agent` selector and no selected-agent runtime/model summary.

Unknown-ID recovery:

```text
Compaction strategy
[ Unavailable: removed-strategy                              v ]
! This configured strategy is not available on this server.
  Select an available strategy and save.
```

## Non-Happy-Path States

### Loading

- Keep the card layout stable.
- Disable strategy selection until both its catalog and server-effective selected ID have loaded from the current window's server/current generic binding revision.
- Expose loading state to assistive technology; do not substitute a hard-coded option/default before the server responds.

### Empty

An empty registry is a server/configuration error because production must register at least `structured-json`. Show `No compaction strategies are available on this server`, disable strategy saving, and offer retry. Do not fabricate a default option.

### Error And Recovery

- Catalog error: inline message near selector plus Retry.
- Effective-selection read error: keep strategy control unavailable and offer retry; never derive selection from catalog order.
- Save error: inline card-level message; retain valid same-node unsaved values; do not clear dirty state falsely.
- Later-key failure: keep the server error visible, keep failed/unsent values dirty, and do not imply that earlier successful same-node writes were rolled back or that the whole card saved.
- Unknown ID: explicit warning and selectable registered recovery options.

### Disabled / Unavailable

- Disable the save control when no values changed, while saving, or when a changed value is invalid.
- A failed strategy catalog or effective-selection read must prevent a strategy overwrite but need not block saving unrelated universal fields because the card persists only changed settings and omits the strategy key.

### Permission / Authentication

No new permission model is introduced. Existing bound-server GraphQL authorization and availability rules apply. A rejected query/mutation uses the error behavior above.

## Responsive And Platform Behavior

- Preserve the current single-column card layout on narrow surfaces.
- Labels remain above controls; controls remain full width.
- Long strategy names truncate/wrap without hiding the stable selected state.
- Desktop Electron uses one node-bound window per node. A browser connected to a fixed server uses the same simple per-key setting flow. Mobile session rebinding is owned by the existing generic/mobile subsystem and is not redesigned by this Compaction ticket.

## Accessibility And Keyboard Behavior

- Every input has a programmatically associated label.
- Native select keyboard behavior remains available.
- Save control has an accessible name such as `Save compaction configuration`, not icon-only semantics.
- Busy/error/loading states are announced with appropriate status/alert semantics.
- Focus is not discarded on validation failure. After a save error, focus may move to the error summary only when doing so does not interrupt typing.
- Visible focus treatment and disabled state meet the existing settings design system.

## Content, Labels, And Validation Messages

Required English concepts (localized through the existing English and Simplified Chinese message files):

- Title: `Compaction configuration`
- Description: `Choose the global compaction strategy and adjust when it runs. Strategy internals are managed automatically.`
- Strategy label: `Compaction strategy`
- Strategy help: `Used for subsequent compactions on this server.`
- Ratio label: `Compaction trigger ratio (%)`
- Override label: `Effective context override`
- Logs label: `Enable detailed compaction logs`
- Unknown-ID warning: `This configured strategy is not available on this server. Select an available strategy and save.`
- Catalog error: `Compaction strategies could not be loaded.`
- Empty catalog: `No compaction strategies are available on this server.`
- Retry action: `Retry`
- Save accessible name: `Save compaction configuration`
- Same-node later-key failure: `Some settings were saved, but the remaining changes were not saved.`

Removed concepts:

- `Compactor agent`
- `Select a compactor agent`
- selected compactor launch configuration summary
- missing compactor-agent warning

## Data And API Dependencies

Read paths:

```text
bound server
    -> getWorkingContextCompactionStrategies
    -> [{ id, name }]

bound server
    -> getEffectiveWorkingContextCompactionStrategyId
    -> normalized ID runtime will attempt

bound server
    -> existing getServerSettings
    -> AUTOBYTEUS_COMPACTION_TRIGGER_RATIO
       AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE
       AUTOBYTEUS_COMPACTION_DEBUG_LOGS
```

Write path:

```text
CompactionConfigCard computes changed valid keys
    -> sequentially calls existing ServerSettingsStore.updateServerSetting(key, value)
    -> ServerSettingsService validation
    -> AppConfig.set
    -> process.env + persisted .env for each successful key
    -> existing authoritative settings reload after success
    -> stop on first error; no whole-card success when later keys remain dirty
```

The catalog query is registry-backed and remains `{id,name}` only. The effective selected-ID query is ServerSettingsService-backed and uses the same core normalizer as runtime. The frontend must not hard-code `structured-json` as its available option or default, infer selection from catalog order, use a display name as the persisted value, or fetch all agent definitions.

Persisted-versus-effective dirty semantics:

- absent or blank persisted strategy + effective `structured-json` = clean;
- explicit valid ID + same effective ID = clean;
- explicit unknown ID = clean-but-unavailable until the user deliberately selects a registered ID;
- only a form value different from the loaded effective ID adds the strategy key to the changed-key list;
- loading, retrying, or saving only another field never writes the effective default.

## Out Of Scope

- Implementing or displaying a second production strategy.
- Generic dynamic forms or arbitrary per-strategy configuration schemas.
- Selecting an arbitrary compactor agent.
- Selecting a separate compaction model/runtime.
- Per-agent, per-team, or per-run strategy selection.
- Agent-creation UI changes.
- Skill-improvement settings.
- Same-window desktop node switching or Compaction-specific binding-revision/session APIs.
- Changes to generic/mobile node-binding infrastructure.

## Open Decisions / Risks

- The first catalog contains one option, so the selector is intentionally preparatory rather than offering an immediate algorithm comparison.
- A future strategy with genuine user-facing settings must add a deliberately designed bounded settings surface; this ticket does not predict that surface through a generic schema.
- Multiple setting writes retain existing non-transactional settings semantics. A later same-node failure cannot roll back an earlier successful call; the card therefore stops on the first error, keeps remaining values dirty, and never implies all-or-nothing persistence.

## Approval Status

The user-approved UI direction remains unchanged. This revision preserves ARCH-PMCS-005's server-effective selection authority while reconciling CR-PMCS-009 by removing the unsupported ARCH-PMCS-006 desktop rebind premise and returning saves to the existing simple node-window setting flow. It is ready for architecture re-review.
