# Docs Sync Report — Runtime-specific stopped-run model switching

## Scope And Authority
- Ticket: `runtime-specific-stopped-model-switch`; `task_size=Medium`, `architectural_risk=High`, reviewed route.
- Latest trigger: CRR-009 proportional durable-test Pass on API-REV-004 Pass/**94.3%** following approved SR-006 requirements, SR-009 design, ARCH-REV-003, IR-005 and CRR-008 source Pass. Earlier DR-001/002 docs and test build are historical.
- Bootstrap/integrated base: refreshed `origin/personal` `a2694ed453e353550d8b345fa82ef489634dcaf2`, unchanged from bootstrap; ticket HEAD `2c4699a142deaaf8f11361d8a10b937f23179da4`. `delivery-integrated-state-refresh-rev003.log` records no new base commits, no integration mutation, and why no post-integration executable rerun was needed. API-REV-004's executed validation remains the behavioral authority.

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
| `autobyteus-server-ts/docs/modules/agent_execution.md`, `agent_team_execution.md`; `autobyteus-web/README.md`, `autobyteus-server-ts/README.md` | No change | Existing lifecycle/packaging guidance does not assert obsolete alias behavior; detailed runtime-selection contract is in modules above. |

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
- `git diff --check`: Pass. Obsolete public alias-folding/universal-capacity doc scan: no matches. See `delivery-integrated-state-refresh-rev003.log`.
- Result: **Pass — synchronized to current reviewed implementation**. No docs-only behavior change, migration or source correction.
- Next: present a fresh current-code test package for explicit user verification. The previous DR-002 Electron package was built before SR-006/SR-009/IR-005 and is superseded.
- Bounded validation remains **94.3%, not the default 95% clean target**. No numerically verified smaller-window external provider pair, real-device/mobile Create Run, CI-durable credentialed full-stack/provider suite, or universal provider success is claimed. Real Chromium Application Agent/Team Save→new-page restore closed F-API-003; F-API-002 remains closed.
- Docs-sync blocker/escalation: N/A.
