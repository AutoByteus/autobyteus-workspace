# Docs Sync

## Scope

- Ticket: `external-channel-sql-removal`
- Trigger Stage: `9`
- Workflow state source: `tickets/in-progress/external-channel-sql-removal/workflow-state.md`

## Why Docs Were Updated

- Summary: External-channel persistence is no longer dual-path, and shared Prisma SQL query logging is now opt-in instead of default-on.
- Why this change matters to long-lived project understanding: The previous docs and operator templates would mislead future debugging by implying external-channel SQL persistence still existed and by leaving the Prisma query-log flood control undiscoverable.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | It documents external-channel persistence rules. | Updated | Removed the old SQL-vs-file statement for receipts/delivery events. |
| `autobyteus-server-ts/README.md` | It documents runtime environment defaults and logging controls. | Updated | Added `PRISMA_LOG_QUERIES=0` to the minimal example and explained the default-off policy. |
| `autobyteus-server-ts/.env.example` | It is the primary operator template for local/server startup. | Updated | Added the explicit query-log env switch and troubleshooting guidance. |
| `autobyteus-server-ts/docker/.env.example` | It is the operator template for the dockerized server workflow. | Updated | Added the explicit query-log env switch so container runs match the server default. |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Behavior clarification | Documented that external-channel receipts and delivery events are file-backed regardless of the global persistence profile. | Keeps the architecture doc aligned with current runtime behavior. |
| `autobyteus-server-ts/README.md` | Operator guidance | Documented `PRISMA_LOG_QUERIES=0` in the minimal environment example and noted that `PRISMA_LOG_QUERIES=1` is the explicit troubleshooting opt-in. | Makes the logging policy discoverable for normal server operators. |
| `autobyteus-server-ts/.env.example` | Environment template | Added `PRISMA_LOG_QUERIES=0` plus an opt-in troubleshooting comment. | Keeps local/server defaults truthful and low-noise. |
| `autobyteus-server-ts/docker/.env.example` | Environment template | Added `PRISMA_LOG_QUERIES=0`. | Keeps docker startup defaults aligned with the shared Prisma log policy. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| external-channel persistence ownership | Bindings, receipts, delivery events, and callback outbox all live under file-backed external-channel storage. | `proposed-design.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| shared Prisma query-log policy | Normal server operation uses a shared Prisma client with SQL query logs disabled by default, and operators must opt in through `PRISMA_LOG_QUERIES=1` when they need raw SQL visibility. | `proposed-design.md`, `api-e2e-testing.md` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/.env.example`, `autobyteus-server-ts/docker/.env.example` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| SQL external-channel receipt persistence | File-backed receipt persistence | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| SQL external-channel delivery-event persistence | File-backed delivery-event persistence | `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| default-on shared Prisma SQL query logging | env-gated query logging via `PRISMA_LOG_QUERIES` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/.env.example`, `autobyteus-server-ts/docker/.env.example` |

## Final Result

- Result: `Updated`
- Follow-up needed: `No`
- Re-check after Stage 7 re-entry: `Requirement-gap re-entry and validation re-run are both reflected; no additional long-lived docs changes are pending.`
