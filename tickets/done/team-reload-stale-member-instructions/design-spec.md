# Design Spec — Team Reload Refreshes Member Definitions

## Design Meta / Approval Basis
- Package: team-reload-stale-member-instructions; Solution Designer; 2026-10-03.
- Current solution revision: SR-003; design status: Ready / Architecture Design Complete.
- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions/requirements-doc.md, Approved.
- Approved basis: unchanged SR-001 intended requirements, SR-002 evidence, captured as A-001 in SR-003. User: “cool. approve. now work on it”. Covers REQ-001–003 / AC-001–004 and their scope/preservation boundaries. Behavior-defining supplements: none.
- Canonical investigation: same ticket root/investigation-notes.md, E-001–E-019.
- Isolated worktree/branch: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions / codex/team-reload-stale-member-instructions.
- Resolved base: refreshed origin/personal d6f6c7a9ff11f8a3a2f11aabd413de2ef8818b2b. Prospective finalization target: origin/personal; deployment/release not performed or implicitly approved.

## Current-State Read
Agent Teams Reload enters the Team store's explicit refresh action. The server mutation already refreshes Agent and Team catalogs. The client subsequently queries only Teams, leaving the separately populated Agent Pinia snapshot unchanged. TeamDetail fetch skips warmed Agent data; AgentDetail looks up that stale snapshot. Existing Agent store already owns the network-only reload needed to publish current visible Agent definitions. A real unchanged-worktree packaged app reproduces the split, and the separate Agents Reload control corrects it (E-012–014).

## Architecture Investigation Evidence
| Evidence | Source in canonical notes | Supports | Residual uncertainty |
| --- | --- | --- | --- |
| E-015 | Current worktree/branch/status | Isolated existing workspace is valid; no tracked source changes | Integration may advance; downstream finalization reconciles later |
| E-016 | Team and Agent public reload actions / reverse dependency search | Reuse Agent's public query-only action without cycle; preserve its error/publication owner | Post-change completion/failure must be tested |
| E-017 | All callers of Team explicit and query-only reload | Modify explicit refresh only; do not broaden query-only package operations | None material for local delta |
| E-018 | TeamList feedback + current store/component tests | Existing Team error/loading surfaces suffice; real warmed-store coverage missing | Real changed-build UI validation remains required |
| E-019 | Existing backend mutation + isolated source/API observations | Backend contract/readers unchanged | User's exact installed binary is not the changed-build validation target |

## Intended Change
Within `refreshAndReloadAllAgentTeamDefinitions`, after successful `RefreshAgentTeamDefinitionCatalog` mutation/error check, **await `useAgentDefinitionStore().reloadAllAgentDefinitions()` before the existing network-only Team query/publication**. Import the Agent store factory; resolve it within the action. Both required snapshots must have completed before this explicit action resolves successfully.

Do not call Agent's backend-refresh action: the Team mutation already refreshes that cache. Do not add a second UI refresh handler, general cache coordinator, new API, cache invalidation registry, per-member stale fallback, watcher or reload-on-every-navigation. Retain `reloadAllAgentTeamDefinitions` as query-only and leave ordinary first-load fetch behavior unchanged.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Approved IDs / trigger | Current evidence | Target outcome / path |
| --- | --- | --- | --- |
| BEH-001 / User | REQ-001,002; AC-001,002; SCN-001/UC-001; completed local package edit → Agent Teams Reload | E-005–008,E-012–014 | DS-001: TeamList → explicit Team refresh → backend refresh → Agent public reload/publication → Team query/publication → TeamDetail/Worker inspection. Updated fields, same scoped identity, no separate Agents Reload |
| BEH-002 / User | REQ-002; AC-003; SCN-002/UC-002; first inspection | E-007,E-017 | DS-002 unchanged: TeamDetail ordinary catalog fetches → scoped member ID → AgentDetail lookup. No private member promotion/source writes/run mutation |
| BEH-003 / User | REQ-003; AC-004; SCN-003/UC-003; required refresh/read fails and retry | E-016,E-018 | DS-003: failed mutation/Agent read/Team read → existing Team catch/error + finally → TeamList error panel/control reenabled → same action retry |

## Relevant Supplemental Task Artifacts
Canonical ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/team-reload-stale-member-instructions/tickets/in-progress/team-reload-stale-member-instructions.
- browser-reproduction-report.md; evidence/ui-observation-excerpts.md; api-before-edit.json, api-after-edit-before-reload.json, api-after-reload-and-control.json: real pre-fix evidence for REQ-001/AC-001; factual, not behavior supplements.
- evidence/reproduction-package/: disposable copy for realistic linked-package reproduction, v2 with deliberately 2 tools; never overwrite the public package.
- evidence/store-cache-probe.cjs/.log: unchanged-source bug probe; **asserts stale behavior and is not a post-fix pass test**. Retain original evidence; new durable tests must assert desired freshness.
- evidence/source-pins.txt, worker-source.md, worker-source-config.json, creator-simplification-result.md and four external user screenshots: source/reported symptom evidence. Screenshot absolute paths indexed in investigation notes.
- evidence/install.log, isolated-build.log, isolated-start.json, isolated-app.log, isolated-stop.json, isolated-list-after-stop.json: setup/isolation/cleanup context. Prior packaged artifact is pre-fix; rebuild before validating changes.
- Complete inventory/absolute parent paths remain in investigation notes and reproduction report. Product UI/UX and independent review: N/A — not applicable at this completed classification.

## Task Design Health Assessment (Mandatory)
- Posture: Bug Fix. Current issue: Yes, narrowly missing dependent snapshot publication.
- Root cause: Local Implementation Defect / missing completeness at existing explicit refresh owner.
- Refactor needed now: No. Existing Team refresh lifecycle, Agent publication action, API shape and file placement are appropriate; no reverse store dependency. Reuse the Agent public boundary instead of duplicating its query/error/array assignment in Team or UI.
- Response: local sequential action composition enforcing refresh completion; healthy separation of Agent and Team subjects retained.
- Intentional deferrals: broader node-binding/concurrent file-edit/automatic watcher policies remain outside approved scope. No atomic cross-catalog transaction promise or general refactor is necessary to fix the reproduced completed-edit workflow.

## Terminology / Design Reading Order
“Explicit Team refresh” means backend refresh plus client catalog reads, not the separate query-only reload. Read current evidence → approved behavior map → lifecycle/ownership → final file delta → verification/classification. No additional domain vocabulary.

## Legacy Removal Policy / Removal-Decommission Plan (Mandatory)
No backward compatibility; clean-cut replacement of the team-only **explicit refresh** sequence with the dependent-Agent-plus-Team sequence. Remove its implicit assumption that backend cache refresh alone updates member UI data. No source files or healthy public query-only actions are obsolete. No old-path branch, feature flag or “refresh Agents only if empty” fallback may remain for explicit Reload. Migration/compatibility mechanisms: N/A.

## Persisted Data / State Transition Decision
**Not Affected.** No schema/model/serialization, package source, config or run-history write changes. Existing disk-backed readers and identities remain; only in-memory frontend catalog replacement through existing query actions changes. No migration convention investigation/design needed because no persisted transformation is proposed. Satisfies REQ-002/AC-003; no persisted loss/reset authorized.

## Data-Flow Spine Inventory
| ID | Scope / behaviors | Start → end | Owner / purpose |
| --- | --- | --- | --- |
| DS-001 | Primary End-to-End / BEH-001 | Reload click → current Team/member inspection | Team explicit refresh governs completion; Agent action owns Agent state |
| DS-002 | Primary End-to-End preserved / BEH-002 | First Team selection → first member inspection | Existing TeamDetail/Agent store readers; no change |
| DS-003 | Return-Event / BEH-003 | Refresh failure → visible failure/loading end → retry | Existing Team store catch/finally + TeamList |

## Primary Execution Spines / Narratives / Main-Line Nodes
**DS-001:** AgentTeamList Reload → Team store explicit refresh → GraphQL backend catalog refresh → Agent store network-only read and publication → Team network-only read and publication → TeamDetail member selection → AgentDetail scoped lookup/render.
After the server establishes refreshed definitions, Team refresh awaits Agent's complete read/publication, then fetches/publishes Teams. The list keeps its existing in-progress state until the action resolves. Later member inspection reads current Agent data even though ordinary fetch skips already-populated arrays.

**DS-002:** TeamDetail selection → existing ordinary Team/Agent fetches → existing Team-local ID construction → AgentDetail catalog lookup → member content. Initial load, identities and visibility remain unchanged.

**DS-003:** transport/GraphQL failure → existing throwing public action → Team refresh catch sets its error → existing finally releases Team loading → list shows existing error/reenables Reload → normal retry. On Agent failure do not continue Team publication; no success fallback. On later Team failure Agent snapshot may already be fresh; existing previous Team snapshot remains. This is an explicit failure, not a successful transaction or an automatic rollback. Successful retry rereads both. No new atomicity guarantee.

## Ownership Map / Thin Entry Facades
- TeamList: click/loading control and existing error display, not Agent cache orchestration.
- Team refresh action: existing public boundary governs complete explicitly requested catalog refresh sequence.
- Backend Team refresh resolver/services: authoritative server catalog refresh; unchanged.
- Agent public reload: Agent query, normalization already present, snapshot/loading/error publication. Team must not directly write Agent arrays/cache.
- Team query/publication: Team snapshot/error/loading; unchanged query payload.
- Details: existing scoped identity lookup/render/navigation, not new refresh owners.
Thin facade table: N/A — no new facade or intermediary added.

## Return/Event And Bounded Local Spines
DS-003 above is the required error return spine. No new event loop, worker, subscription, background callback, parallel-read policy or state machine; bounded local spine: N/A beyond the existing async sequential action.

## Off-Spine Concerns
| Concern | Serves owner / spine | Responsibility | Boundary |
| --- | --- | --- | --- |
| Server settings reload | TeamList/DS-001 | Existing featured settings refresh | Keep existing parallel list call; not authority over member freshness |
| Apollo transport/cache | Each definition store/DS-001 | Existing bound client and network-only catalog request | Do not evict unrelated cache or depend on mutation auto-refresh |
| Scoped member ID/ownership filtering | Details/DS-001,002 | Exact Team-local identity and catalog visibility | No new public promotion, permissions or ID rewriting |

## Ownership Boundaries / Boundary Encapsulation Map / Dependency Rules
| Public boundary | Encapsulated mechanism | Caller | Forbidden bypass |
| --- | --- | --- | --- |
| Team explicit refresh | Mutation, required reads, its completion/error lifecycle | TeamList | Component reproducing Agent/Team refresh sequence |
| Agent query-only reload | Agent query and snapshot/error/loading assignment | Team explicit refresh | Team directly assigning Agent arrays or copying its query code |
| Backend Team refresh | Server definition providers/caches | Client mutation | Client guessing/recreating provider invalidation |
One-way Team store → Agent public action; no reverse dependency, component/internal cache mutation or new generic coordinator. Existing package coordinators continue using independent query-only reload actions unchanged.

## Interface Boundary Mapping / Check / Naming
| Interface | Subject / explicit identity | Responsibility / check |
| --- | --- | --- |
| refreshAndReloadAllAgentTeamDefinitions() | Team catalog including referenced member freshness; no selector | Complete explicit Reload, singular use case; existing name retained |
| reloadAllAgentDefinitions() | Visible Agent definitions with existing canonical IDs | Query-only Agent publication, singular owner; reused |
| GetAgentTeamDefinitions / GetAgentDefinitions | Separate typed catalog result shapes | Existing network-only transport; no mixed-subject DTO/new fields |
| buildTeamLocalAgentDefinitionId | Team ID + local Agent ref | Exact member lookup; unchanged |
All identities explicit, ambiguous selector risk Low, natural existing names retained. No corrective renaming.

## Existing Capability Reuse / Subsystem Allocation
Reuse Agent definitions store for current Agent data; extend existing Team definitions refresh completion. Reuse catalog details, transport and scoped identity utilities unchanged. Create New: none. No cross-cutting/common helper, subsystem or wrapper justified for one bounded action.

## Draft File Responsibilities → Reusable Structures → Final Mapping
Draft: Team store owns explicit refresh composition; Agent store remains the existing Agent publication owner; tests verify warmed-state and failures; UI remains on current public action. Reusable owned structures: no new/repeated DTO/parser/normalizer introduced. Reuse existing stores and identities. Shared structure/data model tightness: existing Agent/Team shapes unchanged, no overlapping representation added.

| Final path | Action / owner | Concrete responsibility / must not contain |
| --- | --- | --- |
| autobyteus-web/stores/agentTeamDefinitionStore.ts | Modify / Team catalog | Import Agent store; await public query-only reload after successful existing mutation, before Team read/publication. No duplicate Agent query logic/new cache/state owner |
| autobyteus-web/stores/__tests__/agentTeamDefinitionStore.spec.ts | Modify / store regression | Real two-store warm-state freshness, operation-specific Apollo responses, ordering/completion/failure/retry; do not mask absent Agent reads with one generic payload |
| autobyteus-web/components/agentTeams/__tests__/AgentTeamList.spec.ts | Modify if needed / existing UI boundary | Loading/error/retry delegation assertions for required action failures; do not mistake stub-only coverage for real data freshness |
| Existing colocated AgentDetail/TeamDetail tests | Reuse/extend proportionately / preserved views | Confirm first-load/scoping where relevant; no redesign |
| Canonical API/browser E2E surfaces selected by API-E2E owner | Test work only / validation | Durable freshness journey, real owned source/HTTP or browser-equivalent regression; exact paths owned by validator, not fabricated here |
| autobyteus-web/docs/agent_teams.md | Documentation sync by Delivery | Explain completed Reload refreshes current definitions; distinguish source definitions vs existing run instructions; no unapproved guarantees |

Folder mapping/check: retain stores/, stores/__tests__/ and component-local __tests__ ownership. Existing compact renderer catalog placement is coherent; no deeper folder/module split improves this one-action fix. Backend files, Agent public store implementation, public package content, routes and production deployment configuration: no change expected. Add: focused test only if existing file insufficient; Rename/Move/Remove files: none.

## Applied Patterns / Concrete Example / Backward-Compatibility Rejection
Pattern: sequential composition of existing public actions, no new abstraction.
Good: successful Team refresh mutation → await Agent network-only reload → Team network-only read/publication → success.
Avoid: Team mutation → Team-only query → stale Worker, or Agent fetch-if-empty instead of forced read, or a second Agent refresh mutation.
Compatibility candidate retaining previous team-only refresh or conditional warmed-cache bypass: Rejected; replace cleanly. No old/new version branches or legacy fallback. Derived layering: current UI → stores → GraphQL → definition providers, unchanged.

## Change / Refactor Sequence
1. Implement the bounded store composition; leave unrelated actions/contracts untouched.
2. Add desired-outcome durable tests, including warm v1 → reload v2 → edit/reload v3, shared member fixture, unchanged private scopes and failures at mutation/Agent/Team reads. Assert no second backend-refresh mutation and no successful resolution before required reads.
3. Run implementation checks per web AGENTS.md/TESTING.md; API-E2E owns executable validation and new durable journey coverage.
4. Rebuild changed worktree packaged app and reproduce the same completed-source-edit journey without Agents Reload, using fresh own instance/ports. Prior pre-fix build is not valid proof. Persist real DOM/AX/API assertions and cleanup.
5. Delivery owns docs synchronization, user verification and applicable finalization. No publishing/release inferred from approval of this fix.

## Key Tradeoffs / Risks / Implementation Guidance
- Sequential read adds one catalog request and serial latency, but minimizes changes/concurrency and reuses authoritative Agent publication. No unapproved performance SLA; do not add parallelism for speculative speed.
- Full visible Agent catalog reload also refreshes existing shared/application catalog data through unchanged visibility projection, not promotion of private members. Assert scopes remain intact.
- Child query failure must propagate into Team error surface; never swallow it or convert to complete success. Existing partial state on failed later reads need not be rolled back.
- Existing pre-fix bug probe deliberately asserts the defect; it is historical evidence, not a post-fix expected pass. Build new assertions for freshness.
- Concurrent edits during Reload / node rebinding policies / GitHub download freshness are not expanded by this fix. Return Design Impact or Requirement Gap if materially required for approved scenarios rather than broaden silently.

## Verification And Acceptance Coverage
REQ-001/AC-001,002: both-store operation-aware tests plus changed-build real Team Reload/member inspection, repeat edit and shared-member regression. REQ-002/AC-003: preserve first-load/scoped IDs/catalog projection; verify no new source/run writers. REQ-003/AC-004: injected mutation/Agent/Team failures, loading end, visible existing failure and successful same-action retry. Executable tests and integrated validation remain downstream responsibilities; current reproduction is pre-fix only.

## Task Size And Architectural Risk (Mandatory; Completed Design)
- task_size: **Small**. One production store's explicit action plus focused colocated tests and documentation/validation. Backend and detail consumers unchanged; no large refactor/subsystem.
- architectural_risk: **Low**. Existing public action/GraphQL/disk readers absorb the change; no new API/persisted schema/security/visibility/runtime owner/concurrency/deployment semantics. Adds bounded sequential required read within existing loading/error lifecycle. Real pre-fix packaged evidence isolates the missing client publication (E-012–019).
- Payload inventory: existing Team/Agent source fixture and investigation docs; not production package rewrite. Structural delta: local renderer explicit-action composition only. Evidence volume/package count does not inflate classification.
- Escalation: return to Solution Designer if implementation needs new API/cache transaction owner, changed node-binding/concurrency or visibility policy, persisted writes/migration, runtime restart/hot-reload behavior or broad architecture refactor; reclassify rather than silently widening direct route.
- Independent review artifacts: N/A — not applicable to Small/Low completed design unless handoff rules require otherwise. Rule lookup supplies route; no implementation/test result claimed by this spec.
