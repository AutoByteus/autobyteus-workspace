# Docs Sync Report

## Scope

- Ticket: `test-vault-developer-experience` (Project Task `c15a77b2-18b8-4ac6-b3de-8afcba81211e`)
- Trigger: delivery after the code reviewer's CRR-004 (Not Applicable: no durable test change after `a525ca02ac`) and API-REV-003 Pass (95%).
- Bootstrap base reference: `origin/personal` @ `d28c56d5de` (2026-10-10). Merged again before coding at `303a04e945` (`origin/personal` @ `ad784b0a8f`).
- Integrated base reference used for docs sync: `origin/personal` @ `79b638e787` (`chore(release): bump workspace release version to 1.5.7`), merged into the ticket branch at `ee78ab81a1`.
- Post-integration verification reference: DEL-01..DEL-06 in `evidence/` (all passed on `ee78ab81a1`).

## Why Docs Were Updated

- Summary: the ticket replaces per-database imports of real provider keys with one standing test vault, selected by `AUTOBYTEUS_TEST_VAULT` the way `DATABASE_URL` selects a database. Every guide that told runners, agents or isolated instances to import keys had to change. The new behavior has to be documented where people look: setup, read-only use, refused locations, no fallback, how autobyteus-ts reads the vault, and the live-gate opt-in.
- Why this should live in long-lived project docs: it is how every future live test, script and isolated instance gets keys, and agents follow `AGENTS.md`/`TESTING.md` and the isolated-app skill literally.

## Long-Lived Docs Reviewed

The implementation updated these docs in the ticket's doc commits (`3f01a6013a`, `198c9066dc`, `e40b0fe6ce`, `3c9a4e799a`). Delivery reviewed each against the final integrated code (IR-003, `469de3d47e`, merged as `ee78ab81a1`).

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `AGENTS.md` | Agent entry rule for real keys | Updated | Set `AUTOBYTEUS_TEST_VAULT`; scripts need nothing else; tests need their gate; never read keys from `.env` or the environment. Matches IR-002 behavior. |
| `TESTING.md` | Canonical testing guide (AC-012) | Updated | New `## Test vault` section, Rules entry and isolated-instance step 4; the command examples include the variable. Matches AE-11/AE-13 commands, which ran verbatim. |
| `README.md` (root) | Isolated-instance credentials paragraph | Updated | The instance gets keys through the forwarded selector. The remaining `secrets:import` example targets the **development** database, which this ticket kept unchanged (design: "general `pnpm secrets:import` behavior" left alone). |
| `autobyteus-server-ts/README.md` | Real-provider checks | Updated | `test:e2e:real` examples use the test vault. The `secrets:import` example is for the development DB (unchanged behavior). |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Canonical vault design | Updated | `## Test Vault`: layout, commands, refused locations, source selection, read-only store, no fallback, harness opt-ins, autobyteus-ts environment default. Checked against `selectSecretVaultSource`, the error codes seen in AE-06/AE-09/AE-15, and the AC-018 behavior. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | autobyteus-ts key resolution | Updated | "Key resolution": resolver, then environment default, then `MissingApiKeyError`. `src/secrets/vault/` owns the read side. Matches AE-12/AE-15. |
| `autobyteus-ts/docs/nodejs_architecture.md` | Credential rule for autobyteus-ts tests | Updated | Setup deletes `*_API_KEY`. Matches the isolation test in AE-11/DEL-06. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Live catalog checks | Updated | Uses the variable with `RUN_LIVE_PROVIDER_TESTS=1`. |
| `autobyteus-web/README.md`, `autobyteus-web/docs/electron_packaging.md` | Embedded-server environment | Updated | `AUTOBYTEUS_TEST_VAULT` is the one forwarded AutoByteus variable. Matches `serverRuntimeEnv.ts` and DEL-05. |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | Isolated-instance credentials | Updated | Start with the variable; never import keys. Matches AE-09. |
| `autobyteus-web/docs/settings.md` | Settings API-key save | No change | Saves on a test-vault instance fail with `SECRET_VAULT_READ_ONLY`; the UI is unchanged by design. The generic toast is follow-up FU-006. |
| `RELEASE.md` | Release guide | No change | Not affected. |
| `autobyteus-ts/tickets/migrate_nodesjs_ticket/MIGRATION_STRATEGY.md` (mentions `.env.test` keys) | Found by a grep for stale guidance | No change | Historical ticket artifact, not a long-lived guide. |

A repository-wide grep for `secrets:import`, `AUTOBYTEUS_TEST_VAULT`, "import keys" and `.env` key guidance in long-lived `*.md` files (outside `tickets/`) found no remaining instruction to import keys into test databases or instances, or to read them from `.env` or the environment.

## Docs Updated

Delivery made no further edits to long-lived docs; the ticket's doc commits were already accurate. Those updates are listed below for the record.

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | New section + rule replacements | `## Test vault`; Rules "Real-provider credentials"; isolated-instance step 4; Core library tests row | AC-012, REQ-013 |
| `autobyteus-server-ts/docs/modules/secret_management.md` | New section + edits | `## Test Vault`; importer note that tests do not import | Canonical design of the new source |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | New subsection | "Key resolution" order and vault read-side ownership | IR-002 (SR-009/SR-010) |
| `AGENTS.md`, `README.md`, server/web READMEs, `electron_packaging.md`, `isolated-app-instances.md`, isolated-app `SKILL.md`, `nodejs_architecture.md`, `provider_model_catalogs.md` | Instruction replacement | Import instructions replaced by the selector | One message everywhere (goal) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Test-vault source selection | One decision (`selectSecretVaultSource`) at startup; unset or real app data → own vault; unusable → startup fails | `design-spec.md` DS-002 | `secret_management.md` § Test Vault |
| Read-only consumption | Consumers never migrate or write the vault; Settings saves fail with `SECRET_VAULT_READ_ONLY` | `design-spec.md`; AE-09 | `secret_management.md`, `TESTING.md` |
| autobyteus-ts environment default | Resolver → `AUTOBYTEUS_TEST_VAULT` → `MissingApiKeyError`; lazy `node:sqlite`; servers disable the default | SR-009/SR-010, IR-002 | `llm_module_design_nodejs.md`, `secret_management.md` |
| Live opt-in | Deterministic runs ignore the selector; live gates apply it; missing key = reasoned skip; strict mode fails | DS-003..DS-005 | `TESTING.md` § Test vault |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Per-database `pnpm secrets:import` for tests and isolated instances | `pnpm test-vault setup` once + `AUTOBYTEUS_TEST_VAULT` | `TESTING.md` § Test vault; `secret_management.md` § Test Vault |
| Env-sourced test credentials (`*_API_KEY`, env→vault helper) | Stripped in test setups; keys come from the vault only | `TESTING.md`; `nodejs_architecture.md` |
| Success-returning skip on a missing key | Reasoned skip; `AUTOBYTEUS_LIVE_STRICT=1` fails | `TESTING.md` § Test vault |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive the ticket, and finalize into `origin/personal` (no release).
- Notes: one out-of-scope observation (generic Settings toast) is recorded as FU-006 in `follow-ups.md`.
