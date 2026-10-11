# Docs Sync Report

## Scope

- Ticket: `claude-sonnet-haiku-5-5-model-support`
- Current trigger: API/E2E Pass API-REV-003 (IR-002 / SR-007 rework after independent code review CRR-001). Direct low-risk route, `task_size=Small`, `architectural_risk=Low` (SR-007 classification; the original package was `Medium`/`Low`). Architecture review: `N/A — not applicable`. Test-code review: `Not Required — direct low-risk route`. CRR-001 was a user-requested independent review, not a route gate.
- Prior trigger: API-REV-001/002 on HEAD `30541612c` over base `ff227eb72` (DR-001/002). Superseded by the rebase.
- Bootstrap base reference: `origin/personal` @ `ff227eb72`
- Integrated base reference used for docs sync: `origin/personal` @ `228cd9b5e` (re-fetched 2026-10-11 at delivery start; the branch is rebased onto it, ahead 4 / behind 0)
- Post-integration verification reference: API-REV-003 evidence on HEAD `31132efcf` (`api-e2e-evidence/rev3/`); `git merge-tree --write-tree HEAD origin/personal` clean.
- Docs commit: `2aa2a6062` (local, not pushed).

## Why Docs Were Updated

- Summary: the implementation updated the autobyteus-ts catalog/LLM design docs (and, under SR-007, removed the dated-snapshot claim and named the explicit `claude-sonnet-4-6` row). Delivery commits the server-side pricing record for the two new models (CR-005), moves the importer `tcgetattr` workaround out of `TESTING.md` into the secrets importer doc (D-SR7-6), and rewraps one long line in `provider_model_catalogs.md`.
- Why this should live in long-lived project docs: `token_usage.md` is the server's per-model pricing reference (it already lists Opus 5.5 and Sonnet 5); Haiku 5.5 is the first tiered Anthropic price. The importer workaround belongs with the importer's agent-operator guidance; origin's rewritten `TESTING.md` forbids this kind of per-task note.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Catalog rows, request-policy table, prices | Updated (rewrap only) | Content updated by implementation (`bc1777e02`, `b38d0a909`) matches the integrated code: explicit `claude-sonnet-4-6` row, no dated-ID claim, Opus 5.5 off cell "— (fails locally)". Delivery rewrapped the long line the API/E2E engineer flagged. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Adapter request-shape ownership | No change | States every catalog row has an explicit entry, including fixed-budget `claude-sonnet-4-6` |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Per-model Standard pricing reference | Updated (committed) | Sonnet 5.5 rates and Haiku 5.5 tier table; re-read against the rebased file — placement after the Sonnet 5 paragraph and before the "Standard estimates only" paragraph still reads correctly |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Importer agent-operator guidance | Updated | `tcgetattr` / Python `pty.fork()` fallback sentence after the `script` sentence; `IMPORT` challenge confirmed in `local-environment-secret-import-service.ts:186-190` |
| `TESTING.md` | Origin rewrite (`361804e45`) | No change | Origin's version, unchanged by the branch; per-suite rows dropped by the rebase; run commands now live in the two live-test headers (`31132efcf`) |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Mentions `claude-opus-5-5[1m]` | No change | Claude Agent SDK canonical-name example only |
| `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md` | Model picker / thinking menu docs | No change | Frontend unchanged; thinking menu is schema-driven |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Pricing reference | Sonnet 5.5 rates; Haiku 5.5 `prompt_le_100k`/`prompt_gt_100k` table; note that rates come from the ts catalog and calculator code is unchanged | CR-005: keep the server pricing doc complete and committed |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Operational guidance | Fallback when `script` fails with `tcgetattr: Operation not supported on socket` | D-SR7-6: relocated from `TESTING.md` |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Formatting | Rewrapped one paragraph | API/E2E docs nit |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Exact-value Anthropic request policy | One table, discriminated by thinking mode, with an explicit entry per catalog row; errors name the model value | design-spec.md (SR-007) | provider_model_catalogs.md, llm_module_design_nodejs.md (by implementation) |
| Haiku 5.5 tiered pricing | 100k gross-input boundary incl. cache tokens | requirements-doc.md, investigation-notes.md (AF-005) | provider_model_catalogs.md, token_usage.md |
| Live suites | Gate, cost and exact command | api-e2e-execution-coverage-report.md | The two live-test file headers (per origin `TESTING.md`) |
| Importer PTY fallback | Python `pty.fork()` wrapper when `script` cannot get a terminal | design-spec.md D-SR7-6 | secret_management.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `matchesAnthropicModelFamily` prefix matching and the Opus 5.5 special-case blocks in `anthropic-llm.ts` | `anthropic-model-request-policy.ts` exact-value table | provider_model_catalogs.md, llm_module_design_nodejs.md |
| Implicit fallback for `claude-sonnet-4-6`; "dated snapshot ID" doc claim | Explicit `claude-sonnet-4-6` row | provider_model_catalogs.md, llm_module_design_nodejs.md |
| `TESTING.md` per-suite rows and importer note (DR-001) | Test-file headers; secret_management.md | Test headers; secret_management.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary update and user-verification hold.
