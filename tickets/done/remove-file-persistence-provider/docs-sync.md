# Docs Sync

## Scope

- Ticket: `remove-file-persistence-provider`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/remove-file-persistence-provider/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - active server docs still described a global `PERSISTENCE_PROVIDER` mode, Android file-profile behavior, and separate file build outputs that no longer exist after this ticket
- Why this change matters to long-lived project understanding:
  - future readers need the durable docs to reflect subsystem-owned persistence, SQL-only token usage storage, and the standard build/runtime path

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | user-facing server setup and runtime notes still advertised the removed profile contract | Updated | removed `PERSISTENCE_PROVIDER` example and file-profile migration note |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | architecture doc still described profile-driven persistence and file-profile build outputs | Updated | rewrote persistence and startup sections to the subsystem-owned model |
| `autobyteus-server-ts/docs/modules/README.md` | module overview still claimed registry/proxy profile selection | Updated | replaced with subsystem-owned persistence guidance |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | runtime contract correction | removed `PERSISTENCE_PROVIDER` from env examples, explained subsystem-owned persistence, and removed Android file-profile migration wording | keep setup docs truthful |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | architecture correction | replaced profile-driven persistence narrative with DB-config-driven startup and SQL-only token usage boundary | keep architecture aligned with actual runtime ownership |
| `autobyteus-server-ts/docs/modules/README.md` | module pattern correction | replaced registry/proxy selection guidance with subsystem-owned persistence notes | keep module documentation consistent with the current codebase |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| subsystem-owned persistence | persistence behavior is decided by the owning subsystem, not by a global runtime mode | `proposed-design.md`, `future-state-runtime-call-stack.md` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/modules/README.md` |
| SQL-only token usage storage | token usage now persists through `TokenUsageStore` and database-backed repositories only | `proposed-design.md`, `implementation.md` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| standard build/runtime path | there is no `build:file` or `dist-file` path anymore; bootstrap surfaces use the normal build | `implementation.md`, `api-e2e-testing.md` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| global `PERSISTENCE_PROVIDER` contract | subsystem-owned persistence + DB config | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| `build:file`, `build:file:package`, `dist-file` | standard `build` output and `dist/app.js` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` |
| token-usage file/proxy provider stack | `TokenUsageStore` over SQL repositories | `autobyteus-server-ts/docs/ARCHITECTURE.md`, `autobyteus-server-ts/docs/modules/README.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not applicable.

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - none for active docs in scope
  - Stage 7 and Stage 8 re-entry reruns added a Codex runtime ownership correction plus test-surface stabilizations, but those changes did not require any further long-lived documentation edits beyond the updates already captured above
