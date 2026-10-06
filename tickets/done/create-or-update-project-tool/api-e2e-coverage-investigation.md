# API/E2E Coverage Investigation

## Investigation Meta
2026-10-06, initial round; trigger CRR-001 Implementation Review Pass. No prior API result inferred.
Canonical worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool`, branch `codex/create-or-update-project-tool`, source `3124a8bf6`, review `103c22fcb`, base/target origin/personal `68261f8111e2f0eb119824c91a2650410c9aeffa`. No release requested.
All upstream paths are in this ticket: requirements-doc.md (SR-002/AP-001), investigation-notes.md, solution-revision-record.md, design-spec.md (SR-003), solution-handoff.md, design-review-report.md, architecture-review-revision-record.md (ARCH-REV-001), implementation-handoff.md, implementation-revision-record.md (IR-001), implementation-evidence/checks-summary.md, code-review-report.md, code-review-revision-record.md (CRR-001), code-review-evidence/checks-summary.md. Read cumulatively, including legacy/transition sections. Only supplement is the supplied Tools screenshot indexed upstream; evidence only, no private data access authorized. Product and delivery revision: N/A — not applicable. API revision record will be created after completion; ledger: api-e2e-test-case-ledger.md.

## Routing Classification
Medium / High; Reviewed route. Successful-output route: Code Review, proportional durable test-code review Required. No source or architecture changes planned.

## Current Requirement And Design Basis
REQ/AC-001–006 and SCN-001–004: strict selected node-local native/MCP create or explicit-ID patch; committed compact metadata/link acknowledgement; omission preserves, blank clears, provided links replace the entire list, [] unlinks only; retained root/time/omitted row descriptions preserved; additions need real registration; atomic validation, exact identity/creation time and unrelated Task/context/assignment/history/registry/folder preservation. Existing full-form semantics and Manager eight-tool bootstrap remain. Caller supplies actual IDs/full desired list; no discovery, registration by tool, implicit upsert, custom grants, running-session upgrades, auto-refresh or feature-default change.
No unsupported/contrived designer scenarios. Added real-use evidence: separate node cannot use another node's Project/registered workspace; persisted current records remain directly usable after reader reconstruction and owned process restart.

## Changed Behavior And Surface Classification
| Boundary | Change | Existing evidence | Gap / selected evidence |
| --- | --- | --- | --- |
| Domain/backend, persistence | Added command/extracted creation/resolver policy | Real-store units, callback/byte preservation | Actual registry + HTTP persisted reads |
| API/transport/contract | Added nested shared native/MCP contract | Parser, provider and schema units | Selected-session actual HTTP/native parity |
| Authorization/session | Preserved exact selections, protected adapters | Unit catalog/native exposure | Read-only rejection and mutator collision through HTTP |
| Bootstrap/process | Changed Manager payload; unchanged lifecycle | Unit and real built smoke upstream | Independent current build; built-node restart/locality |
| Data transition | Directly Usable — No Migration | Unchanged reader/writer/schema | Current records read/reconstructed with no rewrite on reads |
| Frontend/browser/desktop shell | No source change | Existing GraphQL readers | N/A; no UI/desktop approval from API evidence |
| Worker/queue/external provider | No changed coordination or inference | Unchanged | No paid model needed; real static tool session admission |

## Project Execution Discovery
Instructions read: root AGENTS.md, DESIGN.md, TESTING.md; server AGENTS.md (no closer guideline/instructions); server README.md Tests/development, package.json, vitest.config.ts, tests/setup/prisma-{env,global-setup,test-config}.ts; tests/e2e/helpers/studio-runtime-test-server.ts and context-file-process-fixture.ts; Project GraphQL/Workspace contracts. TESTING.md selects server deterministic/API tests for backend changes; current builds before built-process checks, owned resources only. No conflicting instruction. Generic default tsconfig has known unchanged TS6059 rootDir/config failure; do not claim it passes. Secrets N/A.
Setup: installed pnpm workspace, `pnpm -C autobyteus-server-ts prebuild`, then build (shared core/SDKs, Prisma generation, current templates/bootstrap smoke). Vitest forks serial files and resets **worktree-owned** tests/.tmp SQLite only. Main HTTP suite uses mkdtemp data, private temp workspaces, free-port Studio/MCP, real default host/provider/authority, real public GraphQL registration and multipart context; unused publisher throws. Lifecycle prepare/listen/recover and HTTP status establish readiness; authority/app close and directory removal clean owned resources.
Built-node sibling will launch two separate current-dist processes with their own HOME/data/database/temp workspace, free ports and normal Studio lifecycle. Session authority grants only explicitly selected names, not a changed runtime permission policy. No model request. Stop exact children; verify listener release and fixture removal. User's installed app/data/processes never accessed or reused.

## Persisted Data Transition Coverage Basis
Directly Usable — No Migration per reviewed design/IR. Current Project records and linked root/time snapshots read through normal GraphQL/native/service; no conversion needed. Existing Task/context/assignment/history bytes compared before/after metadata/list writes. Seed opaque history preservation sentinel only, not history semantic/replay proof. Existing migration-gate regressions retained; no new migration work.

## Existing Durable Coverage Inventory
| Server-relative path | Intent | Validity | Action |
| --- | --- | --- | --- |
| tests/e2e/projects/project-task-boundaries.e2e.test.ts | Real MCP/session/native Task reads/writes, files, collision, aggregate registration | Needs Update for three-tool inventory; all existing journeys Still Valid | Add canonical fourth name, mutator read-only denial/collision; retain original Task/files/form assertions |
| tests/unit/projects/* | Current-store commands/forms/Task/context/serialization and invalid writes | Still Valid | Run broader group unchanged |
| tests/unit/agent-tools/project-tasks/* | Native/provider contract, unconfirmed result, assignment business read | Still Valid | Rerun; preserve unit-only sparse/undefined/coercion/error proof |
| tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts | Exact selection/static adapters | Still Valid | Rerun |
| tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts | Fresh eight-tool Manager/prompt | Still Valid | Rerun and actual build smoke |
| tests/architecture/projects-boundaries.test.ts | Ownership layering | Still Valid | Rerun |
| tests/e2e/projects/projects-graphql.e2e.test.ts | Real schema/service/registry forms, locality | Still Valid (in-process schema, not HTTP/process) | Run unchanged |
| tests/e2e/projects/projects-startup-migration.e2e.test.ts | Existing migration startup lifecycle | Still Valid | Run unchanged, no new migration semantics |
| Renderer/voice/desktop/provider suites | Unchanged boundaries | Out Of Scope | No broad UI/provider run claimed |
No obsolete coverage deletion or compatibility-only coverage added.

## Durable Coverage Plan / Requirement Mapping
| Case | Coverage | AC / scenario | Planned artifact |
| --- | --- | --- | --- |
| E-001 | Existing selected catalog/Task parity/default-off/regressions | AC-004/005, SCN-003 | Update original HTTP suite |
| E-002 | Existing multipart/context/Task lifecycle | AC-002/005/006 preserved behavior | Preserve original HTTP suite |
| E-003 | Existing protected list collision plus mutator collision and exact-only selection | AC-004/005, SCN-003 | Extend original collision case |
| E-004 | Existing aggregate GraphQL registration/form semantics | AC-005/006 | Preserve original HTTP suite |
| E-005 | Native and HTTP Project create defaults/trim/saved list, omission patch and strict/domain failures with byte atomicity | AC-001/002/003/006, SCN-001/002/003 | Add to original HTTP suite |
| E-006 | Real registered links, complete replacement/retention/blank/[]/unregistered retention | AC-002/006, SCN-004 | Add to original HTTP suite |
| E-007 | Existing Project/Task/context/resource/history/registry/folder bytes and reader reconstruction | AC-002/005/006 | Add to original HTTP suite |
| E-008 | Two built-node HTTP sessions: local identity/registration, saved reads and restart, Manager bootstrap | AC-001/004/005/006 | Focused projects sibling and owned built-process fixture |
Durable automation fits existing real-server suites, not a temporary probe. None removed. Initial ledger required (eight meaningful journeys/build/regression steps, interruption risk).

## Repository Execution Plan
Narrow unit group first, current prebuild/build, focused HTTP cases E-001–007, broader projects/unit/catalog/bootstrap/architecture regression, then current-built-process E-008. Exact command/output recorded in evidence/checks-summary.md; cases ledger updated after attempts. Planned now, no new execution result yet.

## Confidence And Broader Validation Decision
Scorecard pending independent repository execution (not inferred from upstream passes). Broader validation Required: actual sessions/registered lookup and distinct processes are not proven by unit/provider mocks. Selected mode Live API + Lifecycle (durable repository harness); no browser chosen because no renderer/shell boundary changed and static agent tool mutation has no browser-specific dependency. Expected >=95% with every critical AC directly proven at backend scope. Full product/desktop/paid inference/explicit user verification not claimed and remain delivery responsibilities. No runtime dependency blocker observed.

## Investigation Decision
Proceed Yes; durable coverage Added/Updated Yes; removals None; ambiguity/reroute None. No external browse required for local repository executable work. This initial plan is persisted before test edits or execution.

## Execution Discovery Update — inherited environment (before subsequent cases)
E-005 initial focused attempt passed, but the existing harness only cleared ENABLE_*; observed 49 cached definitions exposed inherited AUTOBYTEUS_AGENT_PACKAGE_ROOTS/DEFINITION_SOURCE_PATHS configuration. No fixture mutation targeted those sources and no private definition content was inspected. This is insufficient isolation fidelity for final evidence. Harden the existing harness to stash/clear all AUTOBYTEUS_* overrides before startup and restore them after cleanup, rather than allow ambient package/memory/provider paths. Rerun E-005; retain initial log as historical evidence, not final isolation proof. Built-node sibling already uses a minimal environment/private HOME.

## E-007 Fixture Validity Update (before rerun)
First attempt failed before any mutation: handcrafted assignment used the domain hostRoot/agentRun shape instead of the current physical serializer shape. Strict reader correctly rejected it (`hostRoot is invalid`). Local test fixture issue, not implementation/domain defect. Correct to `{hostRoot:{kind,runId},agentRun:{kind,agentRunId}}` per task-agent-resource-schema.ts; retain original log and rerun existing-data preservation case. No requirement/design change, assertion weakened or source fix.

## Post-Repository Confidence Scorecard — before E-008
Independent narrow 115 tests pass; current prebuild/build/bootstrap pass. E-001–007 pass in focused runs; full affected regression 14 files/194 tests, no skips, pass (regression.log). Focused E-003 executes two collision cases. Filtered focused runs intentionally deselect other tests; no skipped tests counted as proof. Changed-test build-flags typecheck passes (test-typecheck.log), not generic tsconfig proof.

| Category | Score | Support / remaining gap | Additional validation |
| --- | --- | --- | --- |
| Requirement/AC proof | 95% | All create/patch/strict/link/preservation paths direct; process node-locality still only indirect | E-008 distinct node HTTP |
| Changed-boundary directness | 95% | Real source HTTP/MCP/GraphQL/registry and native execution | Same current dist in child |
| Cross-boundary realism/mock gap | 90% | Real host/session/store; selected session actor scripted; distinct processes outstanding | E-008 built nodes |
| Environment/identity/fixture fidelity | 95% | Sanitized inherited overrides, real registered IDs, owned fixtures; representative data not user corpus | Private HOME/database child |
| Failure/edge/lifecycle/recovery | 90% | Strict invalid atomicity, collision/read-only and current reader reconstruction; owned process restart not yet run | E-008 graceful restart |
| User surface/browser/desktop shell | N/A | No renderer/shell change; backend agent API is validated under directness; product/user gate separately remains delivery-owned | None for changed boundary |
| Durable regression relevance | 95% | Existing journeys preserved, narrow extensions and 194 regression tests | Separate proportional review |
Overall **93.33%**, arithmetic mean of six applicable categories. No category below90; clean95 target not met. Direct cross-process critical node-locality evidence still pending. Broader decision **Required**, Live API + Lifecycle via E-008 current-built nodes: close node-locality/current-built-session and restart gaps. No browser/desktop/model execution chosen or claimed; it cannot improve the unchanged backend-only contract more directly than live API processes.

## Final Evidence / Investigation Decision
E-008 passes independently and again in final combined run: two real current-dist nodes, public registration, explicit selected MCP sessions, remote-ID/registration denial, same-name local identity, GraphQL saved Project/root/time exact reads, graceful restart without read rewrite, postrestart patch and fresh Manager eight-tool definition. Explicit cleanup assertions prove child exit0, four listener releases and both private root removal. Final regression **15 files/195 tests, no skips**, all pass. E-006 final assertion also proves exact retained root/addedAt after public unregistration. Final source and changed-test typechecks, fixture syntax and diff hygiene exit0.
Final confidence **95.83%** (95/100/95/95/95/N/A/95); every critical AC directly proven at changed backend scope; no unresolved failure/blocker. Broader Required → Completed via durable Live API + Lifecycle. No further browser/desktop/model validation needed for this changed boundary, but product/user/delivery approval is not claimed. Proportional changed-test review remains Required on Medium/High route.

## Complete Cumulative Absolute Artifact Inventory
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/solution-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/design-review-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/architecture-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/implementation-handoff.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/implementation-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/implementation-evidence/checks-summary.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/code-review-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/code-review-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/code-review-evidence/checks-summary.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-coverage-investigation.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-execution-coverage-report.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-test-case-ledger.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-evidence/checks-summary.md
- Screenshot evidence only (not inspected again; not normative): /Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e534fba4fd4c4cb9ae89925e454758d0/solution_designer_0c7ba6fd88d34653a1667f9c7967b6e7/context_files/ctx_f64c4459936b__image.png
- Product package / delivery revision: N/A — not applicable.
