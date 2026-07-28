# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined`

## Goal / Problem Statement

Fix Settings → Token Statistics so a supported date-range report remains available when a valid aggregated token count exceeds GraphQL's signed 32-bit `Int` range. The report must return and render the exact count rather than fail with `Int cannot represent non 32-bit signed integer value`.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Opening Settings → Token Statistics and fetching the approved date range reaches the statistics API, but the response fails when `inputTokens` is `3136827911`; the page shows the GraphQL serialization error and no report. | The same supported request succeeds and the report's primary input/output token cells display the exact large count as decimal digits (locale separators permitted). | Date inputs, Task/Model grouping, period semantics, pricing and aggregation rules, smaller counts, table structure, loading/empty states, secondary explanatory compact sublines, and error presentation for unrelated failures remain unchanged. | REQ-001–REQ-004; AC-001–AC-005 |

## Investigation Findings

The supplied screenshot and `/Users/normy/.autobyteus/logs/app.log` show the exact GraphQL failure at `usageStatisticsInPeriod[0].inputTokens`. A read-only query of `/Users/normy/.autobyteus/server-data/db/production.db` reproduces the exact `3136827911` aggregate for `codex_app_server` / `gpt-5.6-sol` over the selected 2026-07-21 through 2026-07-28 bounds. SQLite stores the underlying values correctly. The authoritative transport defect is in `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`, where non-negative token counts are exposed as built-in GraphQL `Int`. Downstream coverage investigation additionally found that the primary Settings Task table formats large input/output values with compact notation (`3.14B`), which contradicts the already-approved exact-decimal display criterion. The corrected design therefore includes a narrow Task-table presentation fix: primary input/output cells use full locale-aware integer formatting, while secondary cache/thinking sublines may remain compact. The current domain, persistence, client normalization, and model-table paths already use JavaScript numbers and can preserve this safe integer. This is a shared source defect plus a local presentation defect, not evidence of local database corruption. Public repository issue searches found no existing duplicate report as of 2026-07-28.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md` | Protocol/API contract defining the large non-negative token-count boundary and rejected corrupting alternatives. | REQ-001, REQ-002 | AC-001, AC-002, AC-005 | Current; approved with the requirements basis on 2026-07-28. | Makes the exact transport contract and code-generation consequence reviewable without replacing the core requirements. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Local Implementation Defect`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: The GraphQL transport declaration is narrower than the already-supported non-negative safe-integer token domain. The existing resolver/type owner, aggregation owner, storage boundary, client store, and UI formatter remain appropriate for this scope.
- Requirement or scope impact: Widen and tighten only the authoritative token-count transport contract, keep generated client types explicit, and preserve all report semantics. No persistence refactor or UI redesign is approved.

## Recommendations

Use the existing `GraphQLSafeInt` scalar from `graphql-scalars` for token-valued GraphQL output fields in the token-usage type family. The domain ingestion/projection path remains the owner of the non-negative invariant; the transport scalar owns exact safe-integer serialization beyond signed 32-bit range. Explicitly map `SafeInt` to TypeScript `number` in frontend codegen, regenerate the client artifact, and change the primary Task-table input/output cells from compact to full locale-aware integer formatting so the approved exact-display criterion is true. Keep compact formatting only for secondary explanatory sublines. Prove the real GraphQL response path with an aggregate above `2_147_483_647`, including the primary task-statistics query. Do not cap, round, stringify the primary count, drop rows, or rewrite the ledger.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the source defect is localized, but the authoritative correction spans the backend GraphQL schema, frontend schema/codegen contract, generated types, and executable API/UI coverage.

## In-Scope Use Cases

1. A user opens Settings → Token Statistics, keeps or changes the existing Task/Model grouping and date range, and fetches a report whose token values are within or above the signed 32-bit range while still within JavaScript's exact safe-integer range.
2. The existing report displays the returned large non-negative token values exactly and remains usable.

## Out of Scope

- Changing token accounting, pricing, aggregation, grouping, or date-boundary semantics.
- Redesigning the Token Statistics controls, table structure, charts, loading, or empty states. A narrow formatting correction to the primary input/output token cells is in scope because it is required by AC-002.
- Changing SQLite/Prisma token storage or rewriting existing ledger data.
- Introducing bigint/string token contracts for values above `Number.MAX_SAFE_INTEGER`; that requires a separately approved cross-client design if it ever becomes reachable.
- Fixing unrelated log warnings, server failures, or model-discovery errors.

## Functional Requirements

- `REQ-001`: Every token-valued field exposed through the token-usage GraphQL type family must accept and serialize valid non-negative safe integers above GraphQL `Int`'s `2_147_483_647` maximum.
- `REQ-002`: The Token Statistics fetch path must preserve the exact authoritative backend token values through GraphQL, frontend normalization, and the report's primary input/output token cells; `3136827911` must be shown as exact decimal digits (locale separators permitted) and must not be compact-only, rounded, truncated, capped, string-coerced, or omitted.
- `REQ-003`: Existing supported smaller counts, date filtering, Task/Model grouping, aggregation, pricing, loading, and empty-state behavior must remain unchanged.
- `REQ-004`: Failures unrelated to the corrected scalar boundary must continue to use the existing error state; the fix must not suppress genuine GraphQL or request errors.

## Acceptance Criteria

- `AC-001`: A real GraphQL Token Statistics request whose aggregate contains `inputTokens = 3136827911` completes without `Int cannot represent non 32-bit signed integer value` and without GraphQL errors.
- `AC-002`: The successful result reaches the existing report and its primary input/output token cell displays the exact decimal value `3136827911` with locale separators permitted (for example, `3,136,827,911`); compact notation alone (for example, `3.14B`), precision loss, truncation, capping, or row dropping is not acceptable.
- `AC-003`: A representative report with counts below the prior `Int` limit returns the same values, grouping, pricing, and date-filtering outcomes as before.
- `AC-004`: A separately induced or existing covered non-scalar request failure still populates the existing Token Statistics error state and clears loading normally.
- `AC-005`: Backend schema/API checks, frontend codegen/type checks, and proportionate UI/store coverage pass using project-native commands; durable test changes are owned and reviewed in the downstream API/E2E stage.

## Constraints / Dependencies

- GraphQL built-in `Int` is signed 32-bit; JavaScript `number`, SQLite `INTEGER`, current client normalization, and the observed `3136827911` all remain exact for this case.
- `graphql-scalars@1.25.0` is already a backend dependency and provides `GraphQLSafeInt`, which accepts exact ECMAScript safe integers and exposes a numeric codegen intent.
- Remote GraphQL introspection does not preserve the scalar package's `codegenScalarType` extension; `autobyteus-web/codegen.ts` therefore needs an explicit `SafeInt` → `number` mapping.
- Work must remain in `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow` on `codex/token-statistics-int-overflow`, based on refreshed `origin/personal` commit `a3beeec29`.
- The installed Electron app is version `1.4.26`; source changes require a rebuilt/reinstalled or source-launched application before the user's packaged runtime reflects the fix.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Token usage ledger events in `/Users/normy/.autobyteus/server-data/db/production.db`, represented by Prisma/SQLite table `token_usage_ledger_events`.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Not Affected` — the change is only to the GraphQL response contract and generated client schema types.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve every existing ledger event and aggregate meaning exactly; no discard, rebuild, transform, or quarantine is approved.
- Unacceptable data loss or corruption: Capping, rounding, truncating, dropping rows, changing accounting fields, or rewriting correct stored counts.
- Relevant availability, maintenance-window, or rollout constraints: No database migration, maintenance window, backup, or data rewrite is needed for this fix.
- Related requirement and acceptance-criteria IDs: REQ-001, REQ-002; AC-001, AC-002.

## Assumptions

- Token counts are non-negative domain quantities; ingestion normalization and representative persisted data support this invariant.
- Supported aggregates may exceed signed 32-bit range as usage accumulates.
- The current number-based application contract is authoritative through `Number.MAX_SAFE_INTEGER`; values beyond that range are not part of this approved task.

## Risks / Open Questions

- Non-blocking rollout risk: the currently running packaged application will continue to show the error until a build containing the fix is installed or launched.
- Non-blocking domain limit: `GraphQLSafeInt` intentionally rejects values above JavaScript's safe-integer range. No current data or supported path approaches that bound.
- Open blocking questions: `None`.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case 1: fetch supported report | Use Case 2: display exact large value |
| --- | --- | --- |
| REQ-001 | Yes | Yes |
| REQ-002 | Yes | Yes |
| REQ-003 | Yes | Yes |
| REQ-004 | Yes | No |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario intent |
| --- | --- |
| AC-001 | Execute the real GraphQL statistics path with individually valid ledger events whose aggregate is `3136827911`. |
| AC-002 | Carry and render the exact large number through generated types, store normalization, and the report table. |
| AC-003 | Retain an existing below-limit regression scenario unchanged. |
| AC-004 | Retain the existing generic GraphQL/request error-state scenario. |
| AC-005 | Execute backend, frontend codegen/type, store/component, and broader project-native validation proportionately. |

## Approval Status

`Approved` — the user explicitly approved proceeding on 2026-07-28 after the source-code root cause, no-migration outcome, dedicated worktree, and investigation package were confirmed. Downstream API/E2E coverage identified that the existing Task table's compact primary values contradicted AC-002; this revision resolves that contradiction using the already-approved exact-display behavior, without adding a new product use case. The GraphQL token-count contract supplement remains included in the approved basis.
