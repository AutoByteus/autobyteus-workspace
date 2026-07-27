# Docs Sync Report

## Scope

- Ticket: `secure-centralized-secret-provisioning`
- Trigger: Round 16 API/E2E Pass at 98.1% and proportional durable-test review
  Pass at final HEAD `53dd05ecaac6e3196497597cceba0799f8093aba`.
- Bootstrap base reference: `origin/personal`
- Integrated base reference used for docs sync:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Integration method: already current; branch was 41 commits ahead and 0 behind,
  with merge-base equal to the tracked base after a 2026-07-27 fetch.
- Post-integration verification reference:
  `execution-evidence/220-delivery-round16-latest-base-integration.log`
  (hermetic harness 13/13, removed-authority checks, Node syntax, and
  `git diff --check` passed).

## Why Docs Were Updated

- Summary: Round 16 keeps the one-database vault but makes the standalone
  importer target explicit through the sole `secrets:import --database-url`
  command and reorganizes API-key Settings around one provider-owned grouped
  read. Historical Round 13 delivery docs and long-lived importer/API wording
  were no longer authoritative.
- Why this should live in long-lived project docs: operators must know that an
  importer never inherits a database target, while maintainers must know that
  Settings credential state has one exact provider authority rather than four
  capability-array occurrences or a parallel credential map.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Primary server, test-runtime, and operator-import instructions | Updated | Preserved the user-requested `.env.test`/`dev:test` clarification; replaced the obsolete implicit importer with the exact required `secrets:import --database-url` command and test-DB example. |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Canonical vault, Settings, importer, and test-runtime contract | Updated | Distinguishes running-AppConfig DB authority from standalone explicit URL authority; records provider-group state and removed test importer. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Provider Settings/API and custom-provider contract | Updated | Documents `providerSettings`, provider-owned `apiKeyConfigured`, existing `ModelDetail` capability lists, exact command mutations, and tight custom operations. |
| `autobyteus-web/docs/electron_packaging.md` | Desktop packaging/reset/log behavior | No change | Existing one-DB/key destructive reset and diagnostic IPC wording remains accurate. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex external-account exclusion | No change | Existing account/environment and `LOCAL_HARDENED` exclusion wording remains accurate. |
| `autobyteus-server-ts/docker/README.md` | Container topology/persistence | No change | Docker topology is intentionally unchanged; secret-management docs own the DB/key pairing rule. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | Operator/test command correction | Documents sole importer, required absolute SQLite `--database-url`, forbidden implicit target sources, and explicit test-DB example with no wrapper | Prevents production/test DB ambiguity and preserves the requested test-start guidance. |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Durable boundary update | Explicit importer target lifecycle, immutable typed location, validation/failure rules, provider-group status authority, and removal of `run-test-import.mjs` | Matches the reviewed security boundary and final removals. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | GraphQL/Settings contract rewrite | One `ProviderSettingsGroup` per provider, provider-owned configured Boolean, existing four model lists, Boolean save/remove, tight custom operations, canonical refetch behavior | Removes obsolete credential-status/outcome/aggregation authority and reflects the actual API. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Explicit importer target | Every import requires an absolute SQLite `--database-url`; `.env`, `.env.test`, parent state, cwd, AppConfig, and source assignments cannot select/override it | Requirements, design, importer handoff, Round 16 evidence | Server `README.md`, `secret_management.md` |
| Test importer removal | Test DB import uses the same generic command with its exact URL; no `run-test-import.mjs` or `secrets:*:import:test` exists | Requirements, execution/test-review reports | Server `README.md`, `secret_management.md` |
| Provider-centric Settings | One provider appears once with one provider-owned `apiKeyConfigured` and four existing `ModelDetail` lists; web maintains no parallel credential map | Requirements, design, implementation handoff, browser/GraphQL evidence | `secret_management.md`, `llm_management.md` |
| Tight commands/custom API | Ordinary save/remove are Boolean completion + canonical refetch; custom input/output carries only purpose-required fields; errors use GraphQL | Requirements, source review, execution report | `llm_management.md` |
| One-database custody | Running app still uses canonical `DATABASE_URL`; secret tables and adjacent key remain an inseparable pair | Vault contract, design, Docker/Electron/restart evidence | Existing `secret_management.md`, server `README.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `secrets:local:import` and `secrets:local:import:test` | `secrets:import` with required explicit `--database-url` | Server `README.md`, `secret_management.md` |
| `test-support/live-e2e/run-test-import.mjs` | Direct generic importer invocation against explicit test DB URL | Server `README.md`, `secret_management.md` |
| Implicit importer target from AppConfig/environment/test bootstrap | One immutable `ApplicationDatabaseLocation` created from explicit absolute URL | `secret_management.md` |
| Four-array Settings provider/status merge and parallel credential map | One `providerSettings` grouped collection | `llm_management.md`, `secret_management.md` |
| Credential-status/instruction/outcome DTO authority | Provider-owned Boolean, exact Gemini state, Boolean commands, typed GraphQL errors | `llm_management.md` |
| `test-config/live-e2e.json` and `live-e2e-manifest.ts` | Code-owned scenarios plus fixed test-runtime bootstrap | `secret_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Long-lived docs now match the refreshed Round 16 integrated state.
  Repository archival/push/merge/release remains on hold until explicit user
  verification of the candidate.
