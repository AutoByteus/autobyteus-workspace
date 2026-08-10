# Custom Provider Readable Identity Reset And Selector Transition Specification

## Artifact Metadata

- Status: `Refined for SR-016 architecture review`
- Owner: `solution_designer`
- Related behavior: `BEH-007`
- Related requirements: `REQ-013`–`REQ-015`
- Related acceptance criteria: `AC-015`–`AC-019`
- Supersedes: the secret-preserving/crash-perfect transition defined by `SR-013`–`SR-015`, and the interim SR-016 preserved-record/reconnect draft
- Historical only: `ARCH-REV-009` and its secret migration, journal, backups, receipt, runner bypass, and recovery coordinator

## Approved Product Contract

1. The browser continues submitting `{name, baseUrl, apiKey}` for new custom providers; it never invents or edits a provider ID.
2. New custom-provider IDs derive deterministically from the normalized display name.
3. Custom model identity remains `openai-compatible:<providerId>:<exact-model-value>`; API requests send only the exact model value.
4. During legacy transition, valid unique provider names are used transiently to derive future readable provider IDs and map exact structured selectors.
5. Legacy provider records and Base URLs are not preserved. The transition atomically publishes `{version:3, providers:[]}` after selector attempts.
6. Legacy secret values are not copied, decrypted for transfer, re-encrypted, or used as fallback. Old UUID vault entries are removed only best-effort after empty-V3 publication.
7. The user recreates each desired provider through the unchanged add-custom-provider form, re-entering name, Base URL, and key. The same canonical name produces the ID already embedded in migrated selectors.
8. No migrated provider exists during the gap, so there is no credential-missing record, persisted flag, `apiKeyConfigured=false` provider row, or reconnect branch.
9. Exact allowlisted active/default/resumable selector suffixes are copied byte-for-byte. Missing selectors remain visible/unavailable and never fall back.
10. Historical raw/work traces, token model identifiers/accounting, and model-free history indexes are not rewritten.
11. Normal runtime is V3-only. There is no UUID alias, old-secret lookup, dual identity reader, or generalized migration/reset/recovery framework.

## Canonical Name And ID Contract

### Name normalization

```text
canonicalName = NFKC(displayName)
  -> trim
  -> collapse internal Unicode whitespace to one ASCII space
  -> lowercase
```

The stored name for newly created providers retains normalized presentation form; canonical lowercase form owns uniqueness.

### Readable ID

`buildCustomProviderId(displayName)`:

1. NFKD-normalize the canonical name.
2. Remove combining marks.
3. Collect lowercase ASCII letters/digits into underscore-separated words.
4. Encode every remaining non-ASCII code point as `u<lowercase-hex>`.
5. Collapse/trim underscores.
6. Prefix `provider_`.
7. Reject an empty body.

| Display name | Derived provider ID |
| --- | --- |
| `Alibaba Cloud Token Plan` | `provider_alibaba_cloud_token_plan` |
| `Qwen Zürich` | `provider_qwen_zurich` |
| `阿里云` | `provider_u963f_u91cc_u4e91` |
| `🚀` | `provider_u1f680` |

No random, numeric, hash, or collision suffix is permitted. Provider ID is immutable after creation.

### Store authority

The service may give an early conflict error, but the locked `CustomLlmProviderStore.createProvider` update owns final canonical-name and derived-ID uniqueness. A concurrent duplicate produces exactly one record.

## Stored Shapes And Reset Outcome

### Legacy V1

```json
{
  "version": 1,
  "providers": [
    {
      "id": "provider_<legacy-uuid>",
      "name": "Alibaba Cloud Token Plan",
      "providerType": "OPENAI_COMPATIBLE",
      "baseUrl": "https://example.invalid/compatible-mode/v1",
      "apiKey": "<inline-secret>"
    }
  ]
}
```

### Legacy V2

```json
{
  "version": 2,
  "providers": [
    {
      "id": "provider_<legacy-uuid>",
      "name": "Alibaba Cloud Token Plan",
      "providerType": "OPENAI_COMPATIBLE",
      "baseUrl": "https://example.invalid/compatible-mode/v1"
    }
  ]
}
```

### Immediate migration target

```json
{
  "version": 3,
  "providers": []
}
```

### Later ordinary recreation

```json
{
  "version": 3,
  "providers": [
    {
      "id": "provider_alibaba_cloud_token_plan",
      "name": "Alibaba Cloud Token Plan",
      "providerType": "OPENAI_COMPATIBLE",
      "baseUrl": "<user re-entered URL>"
    }
  ]
}
```

V3 adds no record attribute. Its normal parser requires every record to satisfy `id === buildCustomProviderId(name)` and rejects duplicate canonical names/derived IDs.

## Persisted-Data Decisions

| Stored subject | Decision | Required behavior |
| --- | --- | --- |
| Legacy provider records/Base URLs | `Discard / Recreate` | Use valid names transiently for mapping; publish empty V3; user re-enters all fields |
| V1 inline API keys | `Discard / Re-enter` | Never copy to vault; remove by secretless V2 staging, then empty V3 |
| V2 UUID vault API keys | `Discard / Re-enter` | Never resolve/copy; best-effort delete only after empty V3 |
| Active/default/resumable structured selectors | `Migration Required` | Rewrite exact old prefix to future readable prefix where target is app-owned/writable |
| Historical traces/token identity/accounting | `Directly Usable — No Rewrite` | Preserve bytes/rows; pre-existing token provider-name snapshot may fill missing name before reset |
| Model-free run-history indexes | `Directly Usable — No Rewrite` | Current rows carry no model identity |

Malformed, non-derivable, or colliding legacy provider data cannot produce a reliable mapping. The migration still atomically publishes empty V3, reports warnings, leaves selectors unchanged, and requires recreation/reselection. No endpoint, secret, or file content is logged.

## Legacy V1 Boundary

Keep historical migration ID `20260727_custom_provider_v1_secret_migration` for installed ledger compatibility:

- Missing, strict V2, or strict V3: existing not-required outcome.
- Valid V1: atomically publish secretless V2 containing only `id`, `name`, `providerType`, and `baseUrl`; clear owned inline values/source bytes; return `SUCCEEDED_WITH_WARNINGS` with `CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED`.
- Invalid/unsafe V1: retain existing delete/reset and reconfiguration-required warning.
- Do not call secret batch creation, `resolveForUse`, `saveForConsumer`, `removeForConsumer`, or compensation.
- Any UUID vault orphan is handled only after the final readable migration publishes empty V3.

An installation that previously completed the old V1 secret migration already has V2 plus an optional old UUID secret. It follows the same V2 reset path; no value is transferred.

## Exact Ordering Boundary

`CustomProviderReadableIdAppDataMigration` is the final current `requiredOnStartup` definition. Before reading or mutating legacy providers/selectors, it requires `SUCCEEDED | SUCCEEDED_WITH_WARNINGS` for exactly:

| Definition | Migration ID | Reason |
| --- | --- | --- |
| Custom Provider V1 | `20260727_custom_provider_v1_secret_migration` | Removes V1 inline secret and produces missing/V2/current V3 |
| Remove Global Skill Discovery Mode | `20260706_remove_global_skill_discovery_mode` | May write `run_metadata.json`, `team_run_metadata.json`, `bindings.json` |
| Team Run Metadata Member Tree | `20260517_team_run_metadata_member_tree` | May rewrite `team_run_metadata.json` |
| Token Usage Provider-Name Snapshot Backfill | `20260730_token_usage_provider_name_snapshot_backfill` | Needs the old UUID-to-name projection before reset |
| Remove Self-Evolution Run Metadata | `20260623_remove_self_evolution_run_metadata` | May write `run_metadata.json`, `team_run_metadata.json` |

Missing, `NOT_RUN`, `RUNNING`, or `FAILED` returns `CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_INCOMPLETE` before any readable write. This is a migration-local allowlist, not generalized dependency metadata.

`TokenUsageProviderNameSnapshotBackfillMigration` uses a migration-only strict missing/V2/V3 reader returning only `{id,name}`. Normal provider store/runtime remain V3-only. Readable reset never updates token rows.

No current required definition is registered after readable reset. A registry test protects that boundary.

## Transient Mapping

For each valid V2 record:

```text
oldProviderId = record.id
futureProviderId = buildCustomProviderId(record.name)
oldPrefix = "openai-compatible:" + oldProviderId + ":"
futurePrefix = "openai-compatible:" + futureProviderId + ":"
oldSecretId = customProviderSecretId(oldProviderId) // removal only after empty V3
```

Example:

```text
openai-compatible:provider_5b8b...554e:deepseek-v4-flash-0731
->
openai-compatible:provider_alibaba_cloud:deepseek-v4-flash-0731
```

Only the prefix changes. The mapping is held only for the current migration attempt; it is not persisted as an alias or receipt. The legacy Base URL is not copied.

## Exact Managed Selector Inventory

No recursive arbitrary-key or text rewrite is authorized. Migration-local adapters update only:

| Store / location | Exact selector fields |
| --- | --- |
| Shared/application-owned/team-local `agent-config.json` | `defaultLaunchConfig.llmModelIdentifier` |
| Shared/application-owned `team-config.json` | `defaultLaunchConfig.llmModelIdentifier` |
| `external-channel/bindings.json` | each agent/team binding `launchPreset.llmModelIdentifier` |
| `applications/*/db/platform.sqlite`, `__autobyteus_resource_configurations.launch_profile_json` | agent `llmModelIdentifier`; team `defaults.llmModelIdentifier`; each `memberProfiles[].llmModelIdentifier` |
| Same table, `launch_defaults_json` | legacy `llmModelIdentifier` |
| `memory/agents/*/run_metadata.json` | root `llmModelIdentifier` |
| `memory/agent_teams/*/team_run_metadata.json` | each current agent member node recursively |
| `memory/**/skill_improvement/**/improver_session.json` | root `llmModelIdentifier` |

Other keys, raw/work traces, token rows, arbitrary text, application run-binding summaries, and model-free indexes are excluded.

Each JSON target uses same-directory temp write/fsync/atomic rename. Each application database uses one SQLite transaction. Exact old prefix changes to exact future prefix; already-future/unrelated identifiers remain unchanged.

A malformed/read-only/concurrently changed/unwritable individual target is skipped with sanitized `SUCCEEDED_WITH_WARNINGS`; other attempts continue and empty V3 still publishes. The stale selector remains visible/unavailable for manual reselection. Failure to publish the provider file is fatal.

## Optimistic Execution And Startup Gate

The transition has no private journal, backups, completion receipt, per-item phases, dedicated transition lock, or runner timestamp bypass.

Execution as the final ordinary startup migration:

1. Require exact prerequisites.
2. Strictly classify missing, V2, V3, or invalid provider data.
3. Missing or strict current V3 returns success without legacy work.
4. Valid unique V2 derives the complete transient mapping in memory.
5. Invalid/non-derivable/colliding data records a warning and uses no selector mapping.
6. Independently attempt every exact writable selector target.
7. Fsync and atomically publish empty V3 last; this is the reset commit point.
8. Best-effort remove old UUID vault entries by consumer identity without resolving values.
9. Return `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`.

If interrupted before empty-V3 publication, V2 remains authoritative. Completed selector rewrites are idempotent; after the ordinary runner's stale-`RUNNING` window, retry derives the same map. If interrupted after empty-V3 publication, all targets were attempted and providers are reset; a later ordinary retry sees strict V3 and completes as a no-op. Immediate recovery is intentionally not guaranteed.

After ordinary `runPending()`, `server-runtime` performs one narrow status gate:

- `SUCCEEDED | SUCCEEDED_WITH_WARNINGS`: continue startup.
- missing/`NOT_RUN`/`RUNNING`/`FAILED`: stop before provider/model/runtime/bootstrap/listen with sanitized migration code/log path.

The gate does not rerun, acknowledge, or infer success.

## Provider-Absent Runtime Contract

After reset and before recreation:

- No migrated custom provider record, Base URL, readable-ID secret, custom model group, or credential-state attribute exists.
- Migrated/stale selectors remain stored and are never replaced by a default.
- Selection controls display the exact retained identifier as unavailable instead of clearing it.
- New launches, external dispatches, and run/team resume fail through existing missing-model/activation-failed paths without fallback.
- Historical run/binding/configuration records remain viewable.
- `ApplicationAgentLaunchProfileEditor` changes from clearing a non-catalog value to retaining it and marking the slot not ready/unavailable.

## Existing Recreation Flow

No new reconnect API/UI is added. The existing custom form already supplies the full necessary contract:

1. User enters name, Base URL, and API key.
2. Existing create service validates/probes the pair.
3. Store derives and commits the readable ID under V3.
4. Existing secret save and runtime reload register models.
5. Same canonical name restores the exact provider prefix used by migrated selectors.
6. Bad probe creates nothing. Different name or missing model suffix requires manual reselection.

## Failure And User-Visible Outcomes

| Condition | Durable outcome | User/runtime outcome |
| --- | --- | --- |
| Valid V1/V2 | Selectors attempted; empty V3; no new secret/Base URL | User recreates desired providers in existing form |
| Invalid/colliding legacy file | Empty V3; selectors unchanged | Recreate providers and reselect stale values |
| Individual selector target skipped | Empty V3 plus stale selector in target | Exact value remains visible/unavailable; manually reselect |
| Empty-V3 publication fails | V2 retained; migration failed | Startup blocked; ordinary retry after cause/stale window |
| Old-secret deletion fails/interrupted | Empty V3 plus inaccessible orphan | Startup succeeds with warning; no fallback to orphan |
| Before recreation | No custom provider/models | Launch/resume fails explicitly without fallback |
| Same-name recreation, exact suffix advertised | New readable record/secret/models | Migrated selector works again |
| Different name or unavailable suffix | New ID/model set does not match selector | User manually reselects; history remains viewable |

## Rejected Alternatives

| Alternative | Rejection reason |
| --- | --- |
| Grandfather UUID IDs | Retains unreadable/two identity invariants |
| Preserve legacy records/Base URLs with no key | Requires a custom existing-record repair path or delete-then-recreate dance |
| Extend `saveProviderApiKey`/saved details for reconnect | Unnecessary service/UI specialization when full recreation is accepted and already supported |
| Persist credential-missing state | Absence needs no schema; reset has no provider record at all |
| Resolve/copy/re-encrypt old keys | Explicitly rejected by the user |
| Delete selectors too | Discards deterministic active/default/resume intent that is cheap to map |
| Journal/backups/receipt/immediate runner bypass | Crash-perfect complexity is not required |
| Broad recursive/text rewrite | Risks historical/unrelated data |

## Required Coverage

1. Codec/store tests prove deterministic normalization, no suffix, collision handling, and atomic duplicate creation.
2. V1 fixture proves inline key never enters vault, secretless V2 staging occurs, and final target is empty V3.
3. V2 fixture proves legacy names derive selector mapping, Base URLs/records are absent from V3, old key is never resolved/copied, and cleanup starts only after empty V3.
4. Exact selector fixtures cover agent/team defaults, bindings, application agent/team/default/member state, agent/team resume metadata, and improver session; suffix bytes remain identical.
5. Malformed/read-only/concurrently changed target coverage proves warning-only skip and no broad rewrite.
6. Empty-V3 publication failure proves terminal gate blocks startup.
7. Pre-publication interruption plus ordinary stale retry proves idempotent convergence without special runner API; post-publication may wait for the same window.
8. Old-secret cleanup failure proves warning success, empty V3, and no fallback.
9. Multi-version fixture proves provider-name snapshot/current selector writers finish before reset; token identifier stays unchanged while missing `provider_name` may be populated.
10. Existing create-flow coverage proves bad pair creates nothing; valid same-name pair produces expected readable ID, saves new key, reloads exact models, and restores migrated selectors.
11. Missing-model coverage proves defaults, bindings, applications, and resumable metadata remain stored/raw-visible with no fallback or initial-load clearing.

## Explicit Non-Goals

- Legacy provider/Base-URL preservation.
- Secret preservation/copy/alias/automatic reuse.
- Existing-provider reconnect or persisted credential state.
- Immediate restart convergence.
- General migration dependency, transaction, journal, reset, or recovery frameworks.
- Runtime UUID aliases or dual V2/V3 readers.
- Rewriting token identifiers, traces, free text, or model-free indexes.
- Structured `{providerId,value}` registry refactor or generalized offering schema.
