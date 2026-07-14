# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — user-approved on 2026-07-14.

## Goal / Problem Statement

Update `autobyteus-ts` so the active built-in Grok catalog exposes only xAI's
current flagship `grok-4.5`. Remove the older `grok-4.3` and the separate
`grok-build-0.1` coding row, update the provider default and request contract,
refresh pricing/metadata, and remove stale active references. The user's
testing instruction is part of the task setup: when tests run in this
worktree, copy `.env.test` from the main repository's `autobyteus-ts`
directory locally; never commit or attach it.

## Investigation Findings

- The current active `autobyteus-ts` catalog contains `grok-4.3` and
  `grok-build-0.1` (`src/llm/supported-model-definitions.ts:239-253`).
- `GrokLLM` defaults to `grok-4.3` and uses the existing OpenAI-compatible
  Chat Completions endpoint at `https://api.x.ai/v1`.
- The Grok integration test constructs retired `grok-4-1-fast-reasoning`,
  which xAI redirects; its green baseline therefore does not prove that the
  requested current model is selected.
- xAI's July 2026 documentation identifies `grok-4.5` as the current flagship
  for code and general use. It supports Chat Completions, streaming,
  function calling, and low/medium/high reasoning effort with high as the
  default. The documented context window is 500,000 tokens.
- xAI documents `presencePenalty`, `frequencyPenalty`, and `stop` as invalid
  for reasoning models. The current shared OpenAI-compatible builder emits
  those fields when present in `LLMConfig`; the Grok adapter is the provider
  boundary for model-specific sanitization.
- No Grok curated metadata exists today. Adding `grok-4.5` requires
  docs-backed context metadata; maximum output remains unknown and must not be
  fabricated.
- No package-owned persistent schema stores a Grok catalog row that needs
  transformation. Model identifiers can appear in runtime/token-usage/
  compaction metadata as historical strings; removing active rows must not
  rewrite those records or add old-ID compatibility logic.
- `grok-code-fast-1` appears only as an intentional negative assertion/current
  retirement evidence; it is not an active catalog, runtime, documentation, or
  alias surface. That negative assertion and historical ticket/audit evidence
  may remain and must be distinguished from active support references.

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model/tickets/in-progress/support-new-grok-model/grok-model-contract.md` | Focused provider/model contract and active-reference removal matrix | REQ-001–REQ-008 | AC-001–AC-007 | Approved — user selected `grok-4.5` only | Supplements this requirements doc; the requirements doc remains authoritative for scope and acceptance behavior. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change + Feature + Cleanup
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with a provider-request invariant gap for the new reasoning model
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely needed, but bounded to the existing `GrokLLM` provider boundary rather than a subsystem redesign
- Evidence basis: The active catalog and adapter still default to `grok-4.3`; the integration test uses a retired slug; the shared builder can emit xAI-invalid sampling fields; the existing provider boundary can absorb the invariant. The user explicitly chose a single-model Grok catalog, so the Build row is a clean-cut removal rather than a compatibility case.
- Requirement or scope impact: Replace the flagship row and fallback with `grok-4.5`, remove `grok-build-0.1`, add exact metadata/pricing/schema, update deterministic/live coverage, sanitize Grok 4.5 requests, and remove active legacy references without aliases.

## Recommendations

- Keep the existing Chat Completions transport for this focused change; do not
  mix a model-catalog update with a full Responses API migration.
- Add provider-owned Grok 4.5 request normalization so explicit invalid
  `presence_penalty`, `frequency_penalty`, and `stop` settings cannot be sent
  to xAI; expose only `reasoning_effort: low|medium|high` with default `high`.
- Treat removal as clean-cut: no aliases, redirect fallbacks, or compatibility
  wrappers for `grok-4.3`, `grok-build-0.1`, or the retired integration-test
  slug.
- Keep xAI region/access limits truthful: the configured EU test credential
  currently receives HTTP 403 because Grok 4.5 is not available in its region.
  This blocks live validation for now, not deterministic catalog/request tests.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium. The implementation is bounded to one package/provider but crosses the
catalog, adapter invariants, metadata/pricing, tests, docs, and live-validation
setup. The user-visible catalog decision itself is intentionally simple.

## In-Scope Use Cases

- `UC-001`: A caller lists built-in Grok models and sees exactly `grok-4.5`;
  `grok-4.3` and `grok-build-0.1` are absent.
- `UC-002`: A caller creates `grok-4.5` through `LLMFactory` or `GrokLLM`, and
  requests use the xAI API with the exact `grok-4.5` value.
- `UC-003`: A caller configures Grok 4.5 reasoning effort as low, medium, or
  high; the default is high and reasoning cannot be disabled through a
  fabricated `none` value.
- `UC-004`: Grok 4.5 supports the existing completion, streaming, and
  function-tool call flow without requiring callers to switch transport APIs.
- `UC-005`: Pricing and model metadata are exposed consistently through model
  listing and server-facing pricing lookup.
- `UC-006`: Non-Grok catalog/provider behavior remains unchanged.
- `UC-007`: Credential-gated tests run using a locally copied, ignored
  `.env.test` when the provider region/account permits access; secrets never
  enter the patch.

## Out of Scope

- Migrating Grok from Chat Completions to Responses API, adding xAI server-side
  search/code-execution tools, or changing generic tool transport.
- Supporting Grok voice, image, video, or realtime APIs in the LLM catalog.
- Rewriting package-owned historical usage/compaction records or adding
  model-ID migration/alias logic.
- Updating unrelated applications or server settings that may independently
  persist a selected model.

## Functional Requirements

- `REQ-001`: The active built-in Grok catalog shall contain exactly one row:
  name, value, and canonical name `grok-4.5`, backed by `GrokLLM`.
- `REQ-002`: The active built-in `grok-4.3` row, `grok-build-0.1` row, adapter
  default, and active test/docs references shall be removed; no alias,
  redirect, fallback, or compatibility wrapper shall preserve them.
- `REQ-003`: `GrokLLM`'s fallback model shall be an exact `grok-4.5` model and
  shall continue using `GROK_API_KEY` and `https://api.x.ai/v1`.
- `REQ-004`: Grok 4.5 catalog metadata shall record trusted pricing of `$2.00`
  input, `$6.00` output, and `$0.50` cached input per 1M tokens, with an
  effective/source date tied to official xAI evidence. Curated context
  metadata shall record `500000` tokens, with no invented maximum output
  limit.
- `REQ-005`: Grok 4.5 configuration metadata shall expose only
  `reasoning_effort` values `low`, `medium`, and `high`, defaulting to `high`;
  it shall not advertise a disabled/`none` value.
- `REQ-006`: The Grok provider boundary shall keep the existing xAI Chat
  Completions request/response/stream/tool path while ensuring Grok 4.5
  requests do not emit xAI-invalid `presence_penalty`, `frequency_penalty`, or
  `stop` fields. Pure provider-local config/kwargs normalizers shall use a
  fresh copy of all mutable config state, normalize both synchronous and
  streaming invocation entrypoints, and handle the raw spellings
  `stop`, `stop_sequences`, `stopSequences`, `presence_penalty`,
  `presencePenalty`, `frequency_penalty`, and `frequencyPenalty`. Existing
  content, tool-call, streaming, and usage normalization behavior shall remain
  intact.
- `REQ-007`: Deterministic tests, credential-gated integration coverage, model
  metadata coverage, and provider catalog documentation shall reflect the
  single-model target and must not depend on a retired Grok slug redirect.
  Active runtime/catalog/docs references to `grok-code-fast-1` are forbidden;
  an intentional negative assertion proving its absence and historical
  ticket/audit evidence are permitted and must be labeled as such.
- `REQ-008`: Test execution may copy
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/.env.test`
  into the task worktree's `autobyteus-ts/.env.test`; the file is ignored,
  must remain local, and must never be committed, printed, or attached.

## Acceptance Criteria

- `AC-001`: `LLMFactory.listModelsByProvider(LLMProvider.GROK)` exposes exactly
  `grok-4.5` among built-in API models and does not expose `grok-4.3` or
  `grok-build-0.1`.
- `AC-002`: `LLMFactory.createLLM('grok-4.5')` creates `GrokLLM` whose model
  value is exactly `grok-4.5`; creating either removed identifier fails with
  the normal not-found behavior rather than redirecting.
- `AC-003`: Grok 4.5 model info reports a 500,000-token curated context limit,
  a schema with `reasoning_effort` enum `['low','medium','high']` and default
  `high`, and no fabricated output limit.
- `AC-004`: Pricing lookup for Grok 4.5 reports trusted USD input/output/cache-
  read prices of `2.00/6.00/0.50` per million and a catalog source/effective
  date.
- `AC-005`: Mocked synchronous and streaming request-payload tests prove Grok
  4.5 sends the exact model value, permitted reasoning effort, and tools/stream
  controls while omitting `presence_penalty`, `frequency_penalty`, and `stop`,
  including when invalid values are present in a caller config or raw kwargs.
  The tests also prove the source `LLMConfig`, nested `extraParams`, and
  original kwargs remain unchanged after request construction.
- `AC-006`: The Grok integration test uses `grok-4.5` for both non-streaming
  and streaming paths and no longer passes a retired Grok slug. If the
  configured account/region still rejects the model, the report records the
  exact 403 region blocker and keeps deterministic coverage passing rather than
  claiming live success.
- `AC-007`: `pnpm run build` and relevant unit/integration tests pass;
  repository search finds no unintended active `grok-4.3`,
  `grok-build-0.1`, `grok-4-1-fast-reasoning`, or `grok-code-fast-1` runtime,
  catalog, documentation, or alias references. The intentional negative
  assertion for `grok-code-fast-1` and historical ticket/audit records are
  explicitly allowed; `.env.test` and dependency folders remain
  ignored/untracked.

## Constraints / Dependencies

- Official xAI documentation and API availability constrain model ID, pricing,
  context, reasoning, and request fields.
- xAI's Chat Completions endpoint is documented as legacy; this task
  intentionally keeps it because the existing adapter and current model
  support already use it.
- Grok 4.5 is not available to the current EU credential as of 2026-07-14;
  live integration validation may be blocked until xAI enables access.
- `OpenAICompatibleRequestBuilder` is shared by several providers;
  Grok-specific invalid-field handling must not regress other providers.
- Branch/worktree: `codex/support-new-grok-model` at
  `/Users/normy/autobyteus_org/autobyteus-worktrees/support-new-grok-model`,
  based on refreshed `origin/personal`.
- `.env.test` is ignored by `autobyteus-ts/.gitignore` and is only a local test
  dependency.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Package-owned token-usage observations and
  compaction metadata may retain `model_identifier`/`model_value` as historical
  strings; no package-owned model-catalog storage was found.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Not Affected for schema/storage; `Directly Usable — No Migration` for historical model-ID strings.
- Existing data to preserve, discard/rebuild, transform, or quarantine:
  Preserve historical usage/compaction records as-is; do not transform old
  IDs. Runtime selection records outside this package must be updated by their
  owner, not aliased here.
- Unacceptable data loss or corruption: No loss or mutation of historical
  usage/compaction records; no silent request redirection from removed IDs.
- Relevant availability, maintenance-window, or rollout constraints: Removal
  is a clean catalog contraction; callers using removed active IDs receive a
  normal not-found result and must select `grok-4.5`.
- Related requirement and acceptance-criteria IDs: REQ-002, REQ-007, AC-001,
  AC-002, AC-007

## Assumptions

- The user explicitly selected `grok-4.5` as the only supported Grok model.
- The existing OpenAI-compatible Chat Completions path remains adequate for
  this focused replacement; xAI documents Grok 4.5 on that API and the
  Responses API.
- Model metadata/pricing is a static catalog concern; live provider model
  discovery is not used for the built-in Grok entry.

## Risks / Open Questions

- Live Grok 4.5 completion/stream/tool behavior remains unverified in the
  current EU region; use deterministic mocked payload tests and record the 403
  blocker.
- xAI may make Chat Completions more limited than Responses over time; the
  transport migration is intentionally deferred and remains residual risk.
- xAI model pricing/limits may change after implementation; record exact
  verification date/source in code/docs.
- Existing external server/app settings might retain removed Grok IDs; this
  package will not add a compatibility wrapper, so their owner must select the
  new exact ID.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-002 |
| REQ-004 | UC-001, UC-005 |
| REQ-005 | UC-002, UC-003 |
| REQ-006 | UC-002, UC-004, UC-006 |
| REQ-007 | UC-005, UC-006, UC-007 |
| REQ-008 | UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Exact single-model catalog membership and clean-cut removal |
| AC-002 | Factory creation of new model and rejection of both removed IDs |
| AC-003 | Model-info metadata/schema exposure |
| AC-004 | Trusted pricing lookup |
| AC-005 | Provider request payload with valid reasoning and invalid-field omission |
| AC-006 | Credential-gated completion/stream integration using new ID; truthful region-blocked outcome if applicable |
| AC-007 | Build, targeted suite, active-reference scan, and secret hygiene |

## Approval Status

Approved by the user on 2026-07-14: keep only `grok-4.5`; remove
`grok-4.3`, `grok-build-0.1`, and other active retired Grok references without
aliases.
