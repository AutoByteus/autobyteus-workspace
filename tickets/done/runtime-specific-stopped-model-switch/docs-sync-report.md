# Docs Sync Report — Runtime-specific stopped-run model switching

## Scope And Authority
- Ticket: `runtime-specific-stopped-model-switch`; `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Latest trigger: CRR-009 proportional durable-test Pass on API-REV-004 Pass/**94.3%** following approved SR-006 requirements, SR-009 design, ARCH-REV-003, IR-005 and CRR-008 source Pass. Earlier DR-001/002 docs and test build are historical.
- Bootstrap base: `origin/personal` `a2694ed453e353550d8b345fa82ef489634dcaf2`. On finalization entry 2026-09-26, tracked `origin/personal` had advanced to `69006cc79a1c02afab2fad19f955a34846c9907e` with the separately finalized memory explorer feature. Delivery checkpointed the reviewed candidate at `5f1cad274`, merged the latest base into the ticket branch at `3010bb35b`, and resolved the only overlap in generated GraphQL types additively (both runtime-model and memory query fields/args retained).
- Integrated-state executable evidence: `delivery-post-integration-server-build.log` Pass; `delivery-post-integration-focused-tests.log` Pass (built GraphQL 3/3, affected Web 26/26); `delivery-post-integration-web-build.log` Pass; `delivery-post-integration-memory-spot.log` Pass (5/5); `delivery-post-integration-browser.log` Pass (durable existing-run browser 6 scenarios). No model-selection source/contract path was changed by the new base aside from the generated type merge. API-REV-004 remains the primary broad validation authority; these delivery reruns verify the integrated state.

## Why Docs Were Updated
The user-approved SR-006 correction moved proven Claude `default` deduplication to the backend selection catalog. Offered choices and an exact saved/current ID now have different meanings, with a self-contained stopped-run options descriptor and a separate exact-current lookup for definition, Run, mobile and Application Setup consumers. The prior long-lived docs still instructed frontend alias folding, universal native-like capacity rejection, or separate catalog intersection; those statements would mislead future implementation and product troubleshooting. IR-005 also fixed reactive saved Application launch-profile cloning on reopen. The current docs now describe these boundaries and preserve history/provider identity, schema, and failure visibility.

## Long-Lived Docs Reviewed / Updated
| Doc | Result | Current durable truth |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Updated | Backend Claude offered/current split; proven redundant `default` filtering; recommendation-only public hint; descriptor GraphQL; fresh Save rules; native-only capacity gate; removed external readers. |
| `autobyteus-server-ts/docs/modules/run_history.md`, `agent_orgs.md` | Updated | Stopped Agent/Team/Org current-only `default`, offered-only replacements, exact-current same-model validation, atomic scope behavior. |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Updated | Application host readiness resolves exact effective saved/seeded model, not offered-list membership; no arbitrary new-choice bypass. |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` | Updated | Backend-authoritative offered rows, self-contained stopped descriptors, selected-current display, no frontend alias folding, launch/mobile exact-current query, no platform external capacity gate. |
| `autobyteus-web/docs/agent_management.md`, `agent_teams.md`, `agent_orgs.md` | Updated | Persisted definition/Team/Org exact-current continuity and scope-specific offered choices. |
| `autobyteus-web/docs/applications.md` | Updated | Application Agent/Team exact-current setup/readiness and safe sparse reactive-config cloning on new-page reopen. |
| `autobyteus-server-ts/docs/modules/agent_execution.md`, `agent_team_execution.md`; `autobyteus-web/README.md`, `autobyteus-server-ts/README.md`; integrated memory module docs | No delivery change | Existing lifecycle/packaging and separately finalized memory guidance remain accurate; detailed runtime-selection contract is in modules above. |

## Promoted Design / Runtime Knowledge
| Topic | Source ticket authority | Long-lived home |
| --- | --- | --- |
| Only proven Claude `default` duplicate is omitted from backend offered choices; distinct `[1m]`/other IDs remain; saved exact ID is not rewritten | SR-006 REQ-008/AC-010–011, SR-009 design, API-REV-002/004 | Server `llm_management.md`; Web `settings.md`, `agent_execution_architecture.md` |
| Changed selection requires fresh offered membership; unchanged exact saved ID requires raw current descriptor/schema; stopped options carry current and replacements | SR-009 DS-01–03, IR-004, CRR-008, API-REV-004 | Server `llm_management.md`, `run_history.md`, `agent_orgs.md`; Web `settings.md`, `agent_teams.md`, `agent_orgs.md` |
| Agent/Team definition→Run, mobile setup and Application Setup resolve server-origin current IDs separately; Application restore unwraps reactive config before cloning | ARCH-REV-003 MP-001/002, IR-004/005, API-REV-003/004 | Web architecture, management, Teams and Applications docs; server Application orchestration doc |
| External capacity gate removed; AutoByteus non-decrease preserved; provider continuation may reject without history loss | SR-002/SR-006, API-REV-004 | Server LLM/run-history docs; Web Settings/architecture docs |

## Removed / Replaced Concepts
| Obsolete concept | Replacement | Documented where |
| --- | --- | --- |
| Frontend `aliasIds`/`aliasOfModelIdentifier` folding and alias matching | Backend Claude offered normalization plus exact-current descriptor/display | Server LLM management; Web Settings/architecture |
| ID-only stopped-run options and second Web display/schema catalog intersection | Self-contained current/replacement descriptors | Server LLM/run-history; Web Settings/architecture |
| Treating `listLlmModels` offered membership as proof a saved Application/model is invalid | `resolveExactCurrentLlmModel` for effective saved/seeded ID | Server Application orchestration; Web Applications |
| Universal replacement capacity gate and obsolete external readers | External offered catalog/schema validation; native verified non-decrease only | Server LLM/run-history/Org; Web Settings/Teams/Org |

## Validation And Continuation
- Delivery docs scan and `git diff --check` passed before integration; the integrated executable checks above passed after resolving the generated type overlap. The upstream memory ticket docs include two historical whitespace warnings only; no runtime failure was inferred.
- Result: **Pass — synchronized to the integrated reviewed implementation**. No new docs-only behavior change, migration or source correction after integration.
- User explicitly accepted the DR-003 test package on 2026-09-26 (“i already tested, it works. lets fianlize and release a new version”). The advanced base affects the separately finalized memory explorer; runtime-model source and visible Settings/Application behavior are unchanged. The additive generated-type resolution and relevant integrated checks passed, so this ticket's accepted behavior has not materially changed and renewed manual verification is not required. A release package will be built from the integrated target.
- Bounded validation remains **94.3%, not the default 95% clean target**. No numerically verified smaller-window external provider pair, real-device/mobile Create Run, CI-durable credentialed full-stack/provider suite, or universal provider success is claimed. Real Chromium Application Agent/Team Save→new-page restore closed F-API-003; F-API-002 remains closed.
- Docs-sync blocker/escalation: N/A.
