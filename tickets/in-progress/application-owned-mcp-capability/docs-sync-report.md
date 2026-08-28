# Docs Sync Report

## Scope

- Ticket: `application-owned-mcp-capability`
- Trigger: `/code_reviewer` `CRR-009` proportional durable test-code review Pass after `API-REV-004` (`Pass / 97.6%`) for `AC-032`–`AC-039`; `API-REV-001` remains `Pass / 97.2%` for `AC-001`–`AC-031`.
- Bootstrap base reference: `origin/personal` at `fd9b33e20ace3e7c221f931dbbcd5f4acf1df65f`.
- Integrated base reference used for docs sync: `origin/personal` at `bf396dd5ed541cf6ef2179b305132b079aadd7ab`; ticket HEAD `61d9c3b39c7955289cae7c1bef31f51aca275a9b`, `0 behind / 3 ahead`.
- Post-integration verification reference: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-integration-evidence.log`.
- Current delivery revision: `DR-003`.

## Why Docs Were Updated

- Summary: Long-lived docs still described application manifest v4/backend definition v6 and the removed `ApplicationCatalogRefreshCoordinator`, and did not describe application-owned tool declaration, selection, authorization, worker dispatch, call drain, or the final actual Brief Studio Agent-to-UI workflow.
- Why this should live in long-lived project docs: These are current package/SDK contracts and runtime ownership boundaries that application authors, platform maintainers, and operators must follow independently of the ticket history. The provider built-in/native-event/normalized-trace distinction is also required to prevent future prompts from naming the wrong layer.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Shared manifest/backend/tool contract authority | Updated | Current v5/v7 contracts, declaration/handler/caller/result shapes |
| `autobyteus-application-backend-sdk/README.md` | Application handler authoring guidance | Updated | v7 example, exact handler matching, trusted caller context, result/failure behavior |
| `docs/custom-application-development.md` | External application build/validate/runtime guidance | Updated | v5/v7 validation plus end-to-end application-owned tool authoring and lifecycle |
| `applications/brief-studio/README.md` | Maintained sample behavior | Updated | Exact read-only Codex/Luna researcher/writer workflow and UI-state causality |
| `autobyteus-server-ts/docs/modules/applications.md` | Package/catalog ownership and contract versions | Updated | v5/v7, static declarations, transition owner, runtime projection |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Scoped route composition and transport boundary | Updated | `application_agent_tool` route, isolation, collision precedence, common gateway/result mapping |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Worker definition/invocation/shutdown authority | Updated | v7 exact handlers, tool invocation, admitted-call drain before worker stop |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Binding authorization, transitions, recovery | Updated | Common tool gateway and serialized staged catalog transition/re-entry |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md` | Reload and internal-route boundary | Updated | Current transition-based reload and separation from backend REST/WebSocket gateway |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical redirect's current MCP-session summary | Updated | Ephemeral application routes and drain ordering |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Codex materialization and file-change evidence semantics | Updated | Application route resolution and `apply_patch` / `fileChange` / `edit_file` distinction |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Canonical raw-to-normalized event mapping | No change | Already correctly treats `fileChange` as normalized `edit_file` lifecycle authority and `apply_patch` completion as non-authoritative |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Contract reference | Manifest v5/backend v7; application tool declarations, handlers, caller, content/result, exact matching | Align package consumers with shipped contracts |
| `autobyteus-application-backend-sdk/README.md` | Authoring guide | v7 handler example; declaration/handler pairing; host-derived caller; bounded/sanitized no-retry results | Prevent identity spoofing and incorrect backend definitions |
| `docs/custom-application-development.md` | External developer guide | Validator versions; manifest declaration and handler examples; selection, runtime projection, collision, reload/shutdown semantics | Make current application-owned capability usable without ticket archaeology |
| `applications/brief-studio/README.md` | Maintained sample runbook | Exact one-call-per-role, marker, built-in patch, relative publication, full handoff, reconciliation/UI path, fail-closed behavior | Preserve the approved and executable Agent-to-UI contract |
| `autobyteus-server-ts/docs/modules/applications.md` | Architecture/module doc | v5/v7 package fields; reserved static names; `ApplicationCatalogTransitionService`; application-specific projection | Remove obsolete catalog/version ownership |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Transport/security doc | Third route kind, application isolation/precedence, declaration fingerprint and binding checks, result mapping, out-of-scope boundaries | Document the shared MCP host without implying global registration |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Worker/lifecycle doc | Exact v7 handlers, tool invocation boundary, completion coupling, drain-before-stop order | Keep worker and shutdown authority explicit |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` | Runtime architecture doc | Tool route/gateway authorization; serialized target-slice transition/rollback/re-entry | Record the current owner replacing competing refresh paths |
| `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md` | API/operation doc | Current re-entry sequence and separation of Agent Tools MCP from backend REST/WebSocket transport | Avoid stale “worker remains stopped” and route-ownership guidance |
| `autobyteus-server-ts/docs/modules/application_sessions.md` | Historical redirect | Current ephemeral application route and shutdown drain summary | Keep old links safe without reviving durable session identity |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Provider integration doc | Application route resolution; model-facing built-in vs provider-native vs normalized names | Prevent configuration/prompt regressions such as the superseded `edit_file` instruction |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Package/worker contract | Manifest v5 declares static tools; backend v7 implements the exact handler set | `requirements.md`, `design-spec.md`, `implementation-handoff.md` | SDK READMEs, custom application guide, `applications.md`, `application_engine.md` |
| Runtime-neutral application capability | Claude/Codex use scoped Agent Tools MCP; native uses bound local tools; both reach one gateway | Design and API-REV-001 evidence | MCP, applications, orchestration, custom application docs |
| Isolation and precedence | Static names are reserved; application wins over configured MCP only in its own session; no general/cross-app visibility | Design, CRR-002, API-REV-001 | MCP, applications, custom application docs |
| Invocation/lifecycle | Current declaration, availability, binding/producer, schema, worker, result, no retry, drain-before-stop | Design, implementation handoff, API-REV-001 | Backend SDK, MCP, engine, orchestration, session docs |
| Catalog mutation | One serialized staged transition owner coordinates bundle and tool slices with targeted recovery/rollback | Design, implementation handoff, API-REV-001 | Applications, orchestration, backend gateway docs |
| Maintained Agent-to-UI proof | Read-only context call feeds built-in patch, native/normalized evidence, relative publication, Team handoff, reconciliation, and existing UI | `application-owned-mcp-intended-behavior.md`, API-REV-004 evidence | Brief README and Codex integration docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Application manifest v4 | Strict current manifest v5 with optional `agentTools[]` | Contracts README, custom application guide, `applications.md` |
| Backend definition contract v6 | Strict current backend definition v7 with `agentToolHandlers` | Contracts/backend SDK READMEs, `application_engine.md` |
| `ApplicationCatalogRefreshCoordinator` and competing direct re-entry mutation | `ApplicationCatalogTransitionService` with participant drain, staged paired commit, recovery/quarantine | `applications.md`, `application_orchestration.md`, backend gateway doc |
| Treating normalized `edit_file` as the Luna model operation | Model-facing built-in `apply_patch` -> Codex native `fileChange` -> normalized `edit_file` evidence | Brief README, Codex integration doc |
| Direct-MCP-only sample proof as sufficient user journey | Actual configured Brief Studio Agent/Team plus same-brief browser outcome | Brief README; ticket evidence remains in API-REV-004 |

## No-Impact Decision

Not applicable. Durable documentation changes were required and completed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Present the DR-003 handoff for explicit user verification; wait before archival or repository finalization.
- Notes: No new tracked-base commit was integrated during the resume refresh, so no additional delivery-stage executable rerun was required. API-REV-004 and CRR-009 remain the executable/review evidence for the current working state.

## Blocked Or Escalated Follow-Up

None. The DR-002 Requirement Gap was resolved by SR-008 through CRR-009/API-REV-004. The only hold is the mandatory explicit user-verification gate.
