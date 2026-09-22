# Architecture Design Complete Handoff — Astra And Fable 5.1 Pricing Support

## Result Identity

- Result: `Architecture Design Complete`
- Stable package identifier: `astra-fable-pricing-support`
- Current solution revision: `SR-002`
- Classification: `task_size=Small`; `architectural_risk=Low`
- Handoff route: Direct implementation via `/software_engineering_team/implementation_engineer`, selected from the matching rule for `Architecture Design Complete` with `task_size=Small` and `architectural_risk=Low`.
- Requirements owner / design owner: Solution Designer
- Date: 2026-09-22

## Original Request

The user reported that selecting GPT-6 Astra through the Codex App Server runtime produces no price, noted that GPT-5.6 Sol and Luna already work, suspected Claude Fable 5.1 is unsupported too, and asked for correct support. The user explicitly asked not to perform real paid tests for these expensive models because the existing framework is considered robust.

## Goals And Expected Output

Implement exact built-in metadata and Standard pricing support for:

- `OPENAI` + `gpt-6-astra`: input `$10`, cache read `$1`, cache write `$12.50`, output `$50` per million tokens; above 272,000 input tokens, full-request prices become `$20`, `$2`, `$25`, and `$75` respectively.
- `ANTHROPIC` + `claude-fable-5-1`: input `$10`, output `$50`, cache read `$0.25`, 5-minute cache write `$12.50`, and 1-hour cache write `$20` per million tokens.

Expected output is a narrow catalog correction whose existing server/UI path turns future exact target observations from `price_missing` into trusted estimated cost, with source-dated metadata, deterministic non-paid coverage, and durable documentation. No provider inference call is required or authorized for validation.

## Approval Basis

- Requirements baseline: `SR-001` at commit `4fda6c4377491ab5401c029a6302d9ca78a4f7cc`.
- User approval: explicit message `approve` on 2026-09-22, directly responding to the SR-001 summary and approval request.
- Approved decisions: Standard-only pricing; retain existing Fable 5; keep adjacent Sonnet 5 price correction out of scope; do not run paid Astra or Fable 5.1 inference.
- Behavior-defining supplements: None.
- Design revision `SR-002` changes no intended behavior and does not require renewed approval.

## Status And Design Decision

Investigation, approved requirements, architecture investigation, design, and post-design classification are complete. The existing exact catalog/pricing pipeline is structurally sufficient. Root cause is a `Local Implementation Defect`: both official exact IDs are absent from `autobyteus-ts/src/llm/supported-model-definitions.ts`.

The design changes one production source file:

1. Add exact Astra and Fable 5.1 definitions with official metadata/prices.
2. Rename/generalize the file-local GPT-5.6 long-context price helper to accept an explicit effective date and reuse it for Astra; delete the old narrow helper name.
3. Give Astra a direct OpenAI schema with efforts `low` through `max`, default `medium`; leave Codex runtime capabilities, including dynamically advertised `ultra`, runtime-owned.
4. Omit a Fable 5.1 manual thinking toggle because adaptive thinking is always on and the per-message effort beta is out of scope. Reuse the existing Anthropic family-prefix request policy, proven with mocked tests.
5. Add focused catalog/factory/request, server price-policy/tier, non-network GraphQL model-list tests, and update existing docs.

No dynamic runtime discovery, usage adapter, server production pricing logic, API/GraphQL shape, persistence schema, frontend source, security, concurrency, deployment, or lifecycle change is designed.

## Evidence Summary

- Installed non-billable `codex app-server` 0.155.1 `model/list` returned exact `gpt-6-astra`, default `medium`, efforts through `ultra`, and Fast/priority capability; no turn was started.
- Codex and Claude usage adapters already emit exact provider/model identity.
- `LLMFactory` and server pricing use exact provider/model matching and fail closed when absent.
- `TokenCostCalculator` already selects inclusive max-input tiers from `accounting_input_tokens`.
- Existing Anthropic family-prefix handling already covers `claude-fable-5-1` and strips provider-invalid manual enabled/disabled thinking plus unsupported sampling fields.
- Existing OpenAI Responses adapter is generic and needs no model-specific production change.
- Token usage persists observation-time estimates; old rows are not automatically repriced.
- No paid Astra or Fable 5.1 inference was run during investigation/design.

## Authoritative Sources And Links

- OpenAI GPT-6 Astra model/pricing contract, verified 2026-09-22: `https://developers.openai.com/api/docs/models/gpt-6-astra`
- Claude Fable 5.1 model contract, verified 2026-09-22: `https://platform.claude.com/docs/en/models/fable-5-1/overview`
- Claude pricing contract, verified 2026-09-22: `https://platform.claude.com/docs/en/about-claude/pricing`
- Exact code/evidence path inventory and probe details: canonical `investigation-notes.md` below.

## Constraints And Scope Boundaries

- Exact identities only; no aliases, fuzzy pricing match, or family-price inheritance.
- Standard pricing only. Do not infer OpenAI Fast/Batch/Flex or Claude Batch, geo, partner, negotiated, subscription, or credit prices.
- Preserve dynamic Codex/Claude runtime availability and capability ownership.
- Preserve GPT-5.6 Sol/Terra/Luna, Fable 5, all unrelated price rows, unknown-model fail-closed behavior, and current UI/transport contracts.
- Prospective only: no migration, historical rewrite, or repricing.
- No paid target-model generation/inference in implementation or validation.
- No adjacent Claude Sonnet 5 price correction in this package.

## Supported Scenarios

- `SCN-001`: Codex runtime exposes Astra, a run emits exact usage, and existing token accounting resolves Standard or >272K trusted prices.
- `SCN-002`: Claude runtime exposes Fable 5.1, a run emits exact/cache usage, and existing token accounting resolves trusted component prices.
- `SCN-003`: Shared static catalog/factory consumers enumerate and construct each exact row with provider-valid configuration.
- `SCN-004`: Engineering validates catalog, price policy, tiering, request shape, persistence preservation, and docs without paid inference.
- `SCN-005`: Variant-specific pricing remains unsupported/out of scope.

## Persisted Data Decision

`Not Affected`. Catalog support changes only future observation enrichment. Existing usage records, price/cost snapshots, policy keys, analytics, and missing states remain untouched. No migration, rebuild, compatibility reader, or dual path is allowed.

## Classification Evidence

- `Small`: one production catalog file, two data rows, one private local helper cleanup, and focused tests/docs. Test and documentation count is content/evidence volume, not architectural breadth.
- `Low`: existing owners and contracts absorb the change; there is no new API, schema, persistence, security, concurrency, deployment, lifecycle, or ownership boundary and no unresolved material uncertainty.
- Escalation: return a Design Impact if implementation needs any runtime discovery, provider adapter, public/persisted contract, frontend, or migration change. Return a Requirement Gap before adding a variant, alias, fallback, provider feature, or adjacent model correction.

## Risks And Blockers

- Blockers: None.
- Accepted risk: provider prices/specifications can change after the recorded verification date; retain provenance and normal catalog maintenance.
- Controlled risk: direct catalog exposure is covered by existing generic adapters and must receive mocked request regressions.
- External uncertainty: actual Claude/Astra availability can vary by installed runtime/account and is not promised by static support.
- Separate concern: Claude Sonnet 5's repository price appears stale versus current official documentation; deliberately out of scope.

## Canonical Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/requirements-doc.md`
- Investigation/evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/investigation-notes.md`
- Architecture design: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/design-spec.md`
- Revision history: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/solution-revision-record.md`
- This full-context result/handoff file: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/handoff-summary.md`

## Workspace And Finalization Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support`
- Branch: `codex/astra-fable-pricing-support`
- Resolved base: `origin/personal` at `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target: `origin/personal`
- Requirements approval does not authorize repository finalization.

## Next Expected Action

`/software_engineering_team/implementation_engineer` should implement `design-spec.md`, keep all validation non-paid, and return any scope/architecture expansion instead of silently changing the approved design. This is the configured direct implementation route for an `Architecture Design Complete`, `Small`, `Low` package.
