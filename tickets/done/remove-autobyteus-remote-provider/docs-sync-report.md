# Docs Sync Report

## Scope

- Ticket: `remove-autobyteus-remote-provider`
- Trigger: CRR-006 Pass (post-API/E2E test-code review, round 3) from `/software_engineering_team/code_reviewer`. API-REV-003 Pass at 95%.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Bootstrap base reference: `origin/personal` @ `beb6b3b49`
- Integrated base reference used for docs sync: `origin/personal` @ `beb6b3b49` (fetched again at DR-001; it had not moved, so the branch is already current)
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; logs in `delivery-evidence/dr1-*.log`

## Why Docs Were Updated

- Summary: the implementation commit `ac3868577` removed the remote AutoByteus provider from the current docs. It removed discovery, credentials, the RPA conversation and Settings content, and it added short notes on how leftover data behaves (DEC-002). Delivery re-checked those docs against the integrated branch, including the later IR-002 delta (`403eb2784`, `MultimediaRuntime` removed). Delivery did not need further doc edits. The `TESTING.md` bullet requested by the user was committed separately as `5a25fe46e` (`docs(testing)`).
- Why this should live in long-lived project docs: users and maintainers who upgrade need to know that the provider and the "AutoByteus LLM Hosts" card are gone, how leftover saved selections, `.env` values and vault rows behave, and that the native AutoByteus runtime is a different thing and stays.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Remote discovery, provider catalog, unavailable saved ids | `Updated` (in `ac3868577`) | Leftover note at lines 564-569: a remote id resolves to the ordinary unavailable outcome; the `.env` value is a deletable custom setting |
| `autobyteus-server-ts/docs/modules/multimedia_management.md` | Remote image/audio providers; `MultimediaRuntime` | `Updated` (in `ac3868577`) | `MultimediaRuntime` was not mentioned in any current doc, so IR-002 needed no doc change (re-checked with `git grep`) |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Vault binding, `.env` import alias | `Updated` (in `ac3868577`) | An orphaned vault row is inert and never read |
| `autobyteus-server-ts/docs/modules/agent_customization.md` | AutoByteus-only tool preprocessor | `Updated` (in `ac3868577`) | — |
| `autobyteus-ts/docs/llm_module_design.md`, `llm_module_design_nodejs.md` | Adapter, client, prompt renderer, `LLMRuntime` | `Updated` (in `ac3868577`) | RPA/remote sections removed |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `agent_memory_design.md` | Provider lists | `Updated` (in `ac3868577`) | — |
| `autobyteus-web/docs/settings.md` | Provider row, hosts card | `Updated` (in `ac3868577`) | Lines 82-88 describe the removal and leftovers, and state that the native runtime and "AutoByteus VNC Hosts" are unaffected |
| `TESTING.md` | User-requested guideline bullet | `Updated` (`5a25fe46e`) | "Local model servers share limited compute" |
| Docker docs and entrypoints | `AUTOBYTEUS_LLM_SERVER_HOSTS` writes | `No change` | Entrypoints changed in `fdb7635f3`; a `git grep` over `*.sh`, Dockerfiles, YAML and env files finds no reference outside tickets |

Static check on the delivered state: a `git grep` for the AC-001 symbol list over current docs finds only the intentional leftover notes listed above. The remaining repository matches are negative/leftover tests, historical tickets, UI prototypes and an old `test-results` log. DEC-004 says historical records stay as they are.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| 9 docs listed above | Removal + leftover-behavior notes | See `ac3868577` (65 insertions, 212 deletions) | REQ-010 |
| `TESTING.md` | Guideline addition | Run at most one local-model run or suite at a time, prefer a small model, unload just-in-time models | User request during API/E2E |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Leftover data after removal (DEC-002) | No migration. Saved ids show as unavailable, the `.env` value is a deletable custom setting, the vault row is inert | `requirements-doc.md` DEC-002, `design-spec.md` | `llm_management.md`, `secret_management.md`, web `settings.md` |
| Frozen backfill display names | The released token-usage backfill uses a frozen copy of the provider display-name table, so its result does not change | `design-spec.md`, `4196f55a5` | In the migration code; the guideline already covers it (`data_migration_guideline.md` §4) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Remote AutoByteus LLM/image/audio provider, its client, discovery and renderer | Nothing (decommissioned) | `llm_management.md`, `multimedia_management.md`, `llm_module_design*.md` |
| `LLMRuntime.AUTOBYTEUS`, `LLMProvider.AUTOBYTEUS`, `MultimediaProvider.AUTOBYTEUS` | Removed enum members | Same |
| `MultimediaRuntime` (single-valued after the removal) | Removed; media GraphQL rows still emit `runtime: 'api'` | No doc mentioned it |
| "AutoByteus LLM Hosts" card, `AUTOBYTEUS_LLM_SERVER_HOSTS` | Removed; a leftover value is a custom setting | web `settings.md`, `llm_management.md` |
| `provider.autobyteus.api-key`, `AUTOBYTEUS_API_KEY` import alias | Removed; a leftover row is inert | `secret_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user verification.
- Notes: web `settings.md` says a saved selection stays unavailable "until the user picks another model". For stopped native runs, the pre-existing OBS-001 limitation means no replacement can be picked. The requirements record this as an out-of-scope known limitation (SR-004) and it is not caused by this change, so the docs were not edited for it. If OBS-001 becomes a ticket, that ticket owns the wording.
