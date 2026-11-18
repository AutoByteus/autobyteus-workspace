# Docs Sync Report — model-settings-reality (autobyteus-9)

## Scope

- Ticket: `model-settings-reality` (Project Task `autobyteus-9`); `task_size` `Large`, `architectural_risk` `High`; route `Reviewed` (architecture review ARCH-REV-001..003, source review CRR-001..004, API/E2E API-REV-001..003, test-code review CRR-005/CRR-006).
- Trigger: the code reviewer's delivery handoff after CRR-006 (Pass).
- Bootstrap base reference: `origin/personal` @ `fd0eb664c`.
- Integrated base reference used for docs sync: `origin/personal` @ `358771e83` (107 commits newer), merged into the ticket branch as `ce929a9f4` (`git merge --no-ff`, after the checkpoint commit `8c1bb4b94`).
- Post-integration verification reference: `ce929a9f4`. Checks and results are in [release-deployment-report.md](release-deployment-report.md), "Initial Delivery Integration Refresh".

## Why Docs Were Updated

- Summary: the ticket changed what the Claude thinking settings are (truthful Off on Opus 5, effort-only Fable 5 / 5.1, switch rows defaulting to On, effort-only on the Claude Agent SDK runtime), which settings reach providers and new runs (declared ones only), when model pickers re-read their runtime's list, what a refused Save says, and added an explicit "model list unreadable" result (`model_list_unavailable`, `MODEL_LIST_UNAVAILABLE`, `modelListReadable`). The implementation updated the long-lived docs in IR-001..IR-003; delivery checked each against the final integrated code and added one test-list entry (below).
- Why this should live in long-lived project docs: the LLM module docs and the server and web module docs are the canonical description of the catalog, the request policy, the launch/resume contract and the picker behavior. The ticket artifacts do not outlive the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Anthropic catalog, thinking switch/effort schemas, declared-settings projection | No change (updated in IR-001/IR-002) | checked: lines 248-260 (switch default On, Off per model policy, effort-only rows), 291-304 (stored undeclared keys dropped, Off sends no effort), 322 (always-on rows); `rg "gemini-3.5-flash\|kimi-k2" autobyteus-ts/docs` finds nothing (AC-009) |
| `autobyteus-ts/docs/llm_module_design.md` | adapter request shapes, config schema table | No change (updated in IR-001/IR-002) | row `Current Claude adaptive rows | thinking_enabled | {thinking:{type:"adaptive"}}` matches `anthropic-model-request-policy.ts` |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Node implementation notes | No change (updated in IR-001/IR-002) | Anthropic adapter reads only `thinking_enabled` and `reasoning_effort`; switch default On |
| `autobyteus-server-ts/docs/modules/llm_management.md` | refusal wording and outcomes, options contract, model-list read rule | No change (updated in IR-001..IR-003) | `model_list_unavailable` / `MODEL_UNAVAILABLE` / `MODEL_LIST_UNAVAILABLE` and `modelListReadable` described at L194-198 and L289 |
| `autobyteus-server-ts/docs/modules/run_history.md` | saved-run edit refusals | No change (updated in IR-001..IR-003) | `MODEL_LIST_UNAVAILABLE` at L262 |
| `autobyteus-web/docs/chat.md` | model picker refresh, thinking menu, locked menu merge rule | **Updated by delivery** (earlier updated in IR-001..IR-003) | Refresh/merge text at L325-340 matches `mergeReloadedOptions` / `optionsStateOfAnswer`; delivery added the ticket's refresh specs and the durable journeys probe to the Tests list |
| `GLOSSARY.md` | "Offered models" and "model list" naming | No change (updated in IR-002/IR-003) | entry names `model_list_unavailable` / `MODEL_LIST_UNAVAILABLE` / `modelListReadable` |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | mention `thinking_enabled` among the stored keys (L1527, L1832) | No change | both lists describe keys a stored config may hold, still true; no claim about defaults or Claude Agent SDK |
| `DESIGN.md` | project design rules (read for rule 12 and the ticket's ownership decisions) | No change | no rule changed; no discrepancy recorded by any report |
| `TESTING.md` | browser-probe, fresh-start build, Rule 9/10 | No change | the new durable probe (`model-list-journeys-probe.mjs`) follows "Browser probes" (owns its stack, fails on page errors after CRR-005 T-001); TESTING.md lists no probe by name, so nothing to add there; no command the reports recorded as no longer working |
| `RELEASE.md` | finalization and release rules (read from `origin/personal`) | No change | no step was wrong or missing for this delivery |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` (delivery, this round) | Tests list | Added the model-list refresh specs (`useChatModelCatalog.refresh`, `ModelListRefreshControl`, `ChatModelMenu.refresh`, `MobileRuntimeModelRows.refresh`, `useLockedModelOptionsRefresh`, `existingRunModelOptionsState`, `existingRunModelOptionsActions`, `delegatedLaunchDraftStore`) and `tests/e2e/model-list-journeys-probe.mjs` with its two modes | the picker-refresh behavior the doc describes had no entry in the doc's own Tests list; every listed path exists |
| `autobyteus-ts/docs/provider_model_catalogs.md`, `llm_module_design.md`, `llm_module_design_nodejs.md`; `autobyteus-server-ts/docs/modules/llm_management.md`, `run_history.md`; `autobyteus-web/docs/chat.md`; `GLOSSARY.md` (implementation, IR-001..IR-003; already on the branch) | Behavior and contract | see "Durable Design / Runtime Knowledge Promoted" | `git diff --stat fd0eb664c 8c1bb4b94 -- '*.md' ':!tickets'`: 7 files, 264 insertions, 142 deletions |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude thinking settings by row | AutoByteus runtime: switch rows (Opus 5, Sonnet 5, Sonnet 5.5, Haiku 5.5) default On; Off sends the model's own off form (`disabled`, or `between_tools` on Sonnet 5.5) and no effort; Fable 5 / 5.1 / Opus 5.5 are effort-only (always-on thinking). Claude Agent SDK runtime: effort only, no invented default, no `thinking` option | design-spec, investigation-notes | `provider_model_catalogs.md`, `llm_module_design(_nodejs).md` |
| Only declared settings are projected | `LLMFactory` drops keys a model's schema does not declare before any adapter sees the config; new runs store the declared subset (`projectNewRunLlmConfig`); old runs holding other keys resume | design-spec DEC-D1, implementation-handoff | `llm_management.md`, `provider_model_catalogs.md` |
| Model-list freshness | pickers re-read their runtime's list on open and on "Refresh models" (AutoByteus runtime: discovered providers re-discovered); a failed refresh keeps the list shown | requirements REQ-010/011/014 | `autobyteus-web/docs/chat.md` |
| Refused Save texts and the unreadable-list result | a refusal names the model and scope, says nothing was saved and what to do; `model_list_unavailable` / `MODEL_LIST_UNAVAILABLE` / `modelListReadable:false` is distinct from "not offered" and never marks a saved model "No longer offered" | SR-004, IR-003 | `llm_management.md`, `run_history.md`, `chat.md`, `GLOSSARY.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Claude SDK `thinking: {type: disabled/adaptive}` session option and the SDK thinking switch | effort-only schema; `claudeSessionReasoningOptions` returns effort alone | `provider_model_catalogs.md` (L325), `llm_management.md` (L265), `chat.md` (L232) |
| Undeclared stored keys reaching a provider (`extra_params`, stale `thinking_enabled`) | `projectRawLlmConfig` / `projectNewRunLlmConfig` | `llm_management.md` |
| Saved-run mode of `RuntimeModelConfigFields.vue` | the existing-run editor and the locked menu refresh (`useLockedModelOptionsRefresh`) | `chat.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs were updated by the implementation and by this delivery.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: finalization (secret gate, move the ticket to `done`, commit, push the ticket branch, merge into `personal`).
- Notes: no discrepancy between the docs and the integrated code was found after the merge. The two base changes that touch the Claude session config (semantic-memory `additionalDirectories`) and the e2e credential attachment do not alter any statement in the ticket's docs. Out-of-ticket findings are in `follow-ups.md` (FU-001..FU-003, FU-005..FU-010); delivery added none.
