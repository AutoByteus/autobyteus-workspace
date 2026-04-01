# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: The change spans provider selection, two runtime provider implementations, Prisma schema surface, and integration coverage, but it stays inside the `external-channel` capability area.
- Investigation Goal: Identify the remaining SQL-backed external-channel persistence paths and confirm whether removing them is sufficient to stop the observed Prisma query log noise.
- Investigation Goal: Identify the remaining SQL-backed external-channel persistence paths and confirm whether removing them is sufficient to stop the observed Prisma query log noise, including whether Prisma query logging is separately enabled by default elsewhere.
- Primary Questions To Resolve:
  - Which runtime path still selects SQL for external-channel receipts and delivery events?
  - Are bindings already file-only?
  - Do Prisma schema models remain only for those external-channel SQL providers?
  - Is there any separate explicit query-log hook in this repo?

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | Verify runtime provider selection | Bindings already always use file provider; receipts and delivery events still switch to SQL when persistence profile is not `file`. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | Confirm remaining receipt SQL implementation | Provider uses Prisma-backed `BaseRepository` and performs repeated receipt lifecycle queries by external message key and by ingress state. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/providers/sql-delivery-event-provider.ts` | Confirm remaining delivery-event SQL implementation | Provider uses Prisma-backed `BaseRepository` for callback delivery event upsert and lookup. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | Confirm file-backed replacement capability | File provider already supports the full receipt lifecycle, state transitions, source lookup, and list-by-state behavior. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/src/external-channel/providers/file-delivery-event-provider.ts` | Confirm file-backed replacement capability | File provider already supports callback delivery-event upsert and lookup by callback idempotency key. | No |
| 2026-04-01 | Code | `autobyteus-server-ts/prisma/schema.prisma` | Check whether Prisma still exposes external-channel tables | Prisma schema still contains `ChannelMessageReceipt` and `ChannelDeliveryEvent` models used only by the SQL providers in scope. | No |
| 2026-04-01 | Command | `rg -n "prisma:query|\\$on\\(['\\\"]query['\\\"]\\)|new PrismaClient\\(" ...` | Find explicit query logging | No explicit Prisma query event hook or query-log config was found in this repo. | No |
| 2026-04-01 | Test | `autobyteus-server-ts/tests/integration/external-channel/providers/*.test.ts` | Measure current provider-specific coverage | Integration coverage exists for SQL receipt provider and SQL delivery-event provider, but not for the file equivalents. | Yes |
| 2026-04-01 | Code | `autobyteus-server-ts/node_modules/repository_prisma/dist/index.mjs` | Trace shared Prisma client construction | Shared `rootPrismaClient` is hardcoded with `log: ["query", "info", "warn", "error"]`, so SQL query logging remains enabled by default even after external-channel SQL paths are removed. | No |
| 2026-04-01 | Runtime probe | `node --input-type=module -e 'import { rootPrismaClient } from "repository_prisma"; console.log(rootPrismaClient._engineConfig?.logQueries)'` | Verify effective Prisma client behavior | Current repository wrapper resolves `logQueries === true` by default; plain Prisma client without `query` in the log array resolves `logQueries === false`. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-server-ts/src/external-channel/services/channel-message-receipt-service.ts`
  - `autobyteus-server-ts/src/external-channel/services/delivery-event-service.ts`
  - runtime consumers in `autobyteus-server-ts/src/external-channel/runtime/`
- Execution boundaries:
  - `provider-proxy-set.ts` decides which persistence provider the external-channel services delegate to.
  - file providers use JSON files under external-channel storage.
  - SQL providers use Prisma-backed repositories.
- Owning subsystems / capability areas:
  - `src/external-channel/providers/`
  - `src/external-channel/services/`
  - `src/external-channel/runtime/`
  - `prisma/schema.prisma`
- Folder / file placement observations:
  - The persistence decision is centralized in `provider-proxy-set.ts`, so that file is the correct owner for removing SQL selection.
  - The SQL provider files are isolated and removable without changing service APIs.
  - The shared Prisma logging policy is not owned by the server repo today; it is embedded inside the `repository_prisma` package consumed from npm.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | `resolveProviderSet` | Selects external-channel providers | Still selects SQL receipt and delivery-event providers when profile is `sqlite` or `postgresql`. | Must become file-only for external-channel persistence. |
| `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | `SqlChannelMessageReceiptProvider` | SQL-backed receipt lifecycle persistence | Sole remaining SQL receipt implementation in runtime code. | Remove in scope. |
| `autobyteus-server-ts/src/external-channel/providers/sql-delivery-event-provider.ts` | `SqlDeliveryEventProvider` | SQL-backed callback delivery-event persistence | Sole remaining SQL delivery-event implementation in runtime code. | Remove in scope. |
| `autobyteus-server-ts/src/external-channel/providers/file-channel-message-receipt-provider.ts` | `FileChannelMessageReceiptProvider` | File-backed receipt lifecycle persistence | Already covers pending, dispatching, accepted, routed, unbound, and source lookup behaviors. | Reuse as the single runtime implementation. |
| `autobyteus-server-ts/src/external-channel/providers/file-delivery-event-provider.ts` | `FileDeliveryEventProvider` | File-backed callback delivery-event persistence | Already covers upsert and lookup flows. | Reuse as the single runtime implementation. |
| `autobyteus-server-ts/prisma/schema.prisma` | `ChannelMessageReceipt`, `ChannelDeliveryEvent` | Prisma model surface | These models are only referenced by the two SQL provider files in scope. | Remove in scope. |
| `autobyteus-server-ts/node_modules/repository_prisma/dist/index.mjs` | `rootPrismaClient` | Shared Prisma client construction | Query logging is always enabled at client creation time. | Runtime log policy must be changed at this shared boundary, not per repository call site. |

### Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-01 | Command | `rg -n "channel_message_receipts|channel_delivery_events|Sql.*Provider|provider-proxy-set"` | Only two external-channel SQL runtime providers remain. | Removing those two paths should eliminate external-channel Prisma activity. |
| 2026-04-01 | Command | `rg -n "prisma:query|\\$on\\(['\\\"]query['\\\"]\\)|emit:\\s*['\\\"]event['\\\"]"` | No explicit query log hook found in repo code. | The observed log spam is most likely a consequence of runtime SQL access rather than a custom logging wrapper. |
| 2026-04-01 | Command | `node --input-type=module -e 'import { rootPrismaClient } from "repository_prisma"; console.log(rootPrismaClient._engineConfig?.logQueries)'` | Shared wrapper sets `logQueries=true`. | A dependency-level patch or override is required to make query logging opt-in. |

## Constraints

- Technical constraints:
  - The external-channel service interfaces must remain unchanged.
  - File-backed providers must preserve current lifecycle semantics.
- Environment constraints:
  - The user required all work to happen in a dedicated worktree.
- Third-party / API constraints:
  - Prisma remains in use for other persistence domains, so this change must stay scoped to external-channel persistence only.
  - The shared Prisma wrapper is provided by the external npm package `repository_prisma`, so changing default query logging requires a dependency patch/override rather than only local repository file edits.

## Unknowns / Open Questions

- Unknown: Whether the `repository_prisma` logging fix should be upstreamed separately after the local patch lands.
- Why it matters: Long-term dependency maintenance may benefit from carrying less local patch surface.
- Planned follow-up: Keep the local patch in this ticket; upstreaming can be handled separately.

## Implications

### Requirements Implications

- Requirements should explicitly scope SQL removal to external-channel receipts and delivery events, not to all server persistence.
- Requirements must also include default-off Prisma query logging for the shared repository client, with an explicit opt-in debug switch.

### Design Implications

- The persistence-profile branch in `provider-proxy-set.ts` becomes unnecessary for external-channel runtime storage and should collapse to the file-backed set.
- No compatibility wrapper is needed because the file providers already implement the required behavior.
- Shared Prisma log policy should move from implicit always-on behavior to explicit opt-in behavior at Prisma client construction time.

### Implementation / Placement Implications

- Replace SQL-specific integration tests with file-provider integration tests that preserve the same behavior checks.
- Remove the Prisma models that exist only for the deleted SQL providers.
- Patch the `repository_prisma` package through the workspace package manager so query logging defaults off without forking repository call sites.
