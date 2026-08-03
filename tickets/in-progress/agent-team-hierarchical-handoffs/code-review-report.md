# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001` through `SR-005`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001` through `ARCH-REV-004`; `ARCH-REV-004` is the approved baseline.
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: `implementation_engineer` source-review handoff for commit `2ed26efb9` (`Implement hierarchical agent team handoffs`) on `codex/agent-team-hierarchical-handoffs`, based on `2a7271c9d`.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- API/E2E Revision Record Reviewed (failure-origin entry point): `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `N/A` — implementation-review findings are `CR-F-001` and `CR-F-002`.
- Exact Failing Commands / Execution Mode: `N/A` for API/E2E. A built-source probe described under `CR-PREM-001` reproduced `CR-F-001`.
- Failure Evidence Paths: source paths cited in the findings; no external failure artifact.

## Review Scope

- Changed implementation and behavior reviewed: commit `2ed26efb9`, including definition handoffs, recursive definition compilation, TeamRun snapshot/localization, hierarchical message placement/delivery, handoff retrieval, task delegation mapping, provider envelopes, instruction materialization, and legacy-authority removal.
- Files / areas reviewed: all changed production TypeScript under `autobyteus-server-ts/src`; targeted upstream/current behavior paths; implementation handoff evidence; changed-file sizes; removed-authority and dependency audits.
- Explicit exclusions: no API/E2E failure-origin review; no durable test maintenance; no frontend rendered-result review; no delivery-owned documentation edits; no release/deployment review.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. The requirements and supplemental contract establish strict hierarchical addressing, validated authored handoffs, immutable run snapshots, one coordinate-only placement resolver, task-owned eligibility, exact-run preservation, and canonical provider envelopes.
- Design-spec behavior map verified against the implementation: `Yes`, except for the rejected-update state leak recorded against `BEH-001` and the approved MCP mapper placement deviation in `CR-F-002`.
- Design review report and round confirmed: `Yes`; `ARCH-REV-004` passed the cumulative `SR-005` design.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: `None`. `CR-F-001` is an implementation contradiction of the supported definition update/validation path, not a new requirement.
- Remaining material ambiguity, if any: `None`.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | `Contradicted` | File/application-owned adapters and GraphQL map `handoffs`; `AgentTeamDefinitionService` invokes graph resolution and compilation. | The supported GraphQL update path reaches `AgentTeamDefinitionService.updateDefinition`, which mutates the cached definition before validation. An invalid handoff is rejected but remains observable in the catalog; see `CR-PREM-001` / `CR-F-001`. |
| `BEH-002` | `Confirmed` | `buildSendMessageTargetSelector` preserves raw logical input; `collaboration-logical-address.ts` and root `TeamLogicalPlacementResolver` provide the only Team parser/traversal path. | — |
| `BEH-003` | `Confirmed` | Child managers forward root-bound intents; the root manager resolves and privately materializes actual Agent delivery endpoints; delivery records canonical source/receiver addresses. | — |
| `BEH-004` | `Confirmed` | `localizeSubTeamRunTopology` recursively localizes paths/routes/coordinators, and `MixedSubTeamRunFactory` consumes the result once. | — |
| `BEH-005` | `Confirmed` | `GetHandoffRulesService` reads only the bound sender projection; AutoByteus and MCP adapters return the required success/empty/missing-context envelopes. | — |
| `BEH-006` | `Confirmed` | `member-collaboration-instruction-renderer.ts` supplies actual identity, grammar, task selector, and handoff lookup guidance without embedding the complete rule set. | — |
| `BEH-007` | `Confirmed` | `SendMessageToDispatcher` still sends `target_agent_run_id` directly to `GlobalAgentRunMessageRouter`; the shared envelope copies the router code. | — |
| `BEH-008` | `Confirmed` | `effectiveHandoffs` is copied through production `TeamRunConfig` reconstruction and metadata conversion; missing metadata normalizes to `[]`. | — |
| `BEH-009` | `Confirmed` | Configured exposure, AutoByteus tools, Codex/Claude materialization, and Agent Tools MCP providers are connected to the shared communication contract. | — |
| `BEH-010` | `Confirmed` | Existing root coordinator default selection remains; graph resolution also requires the configured coordinator to be exactly one direct Agent. | — |
| `BEH-011` | `Confirmed` | Task router obtains root placement, then `TaskDelegationTargetMapper` checks current immediate-Team/direct config identity before `reserveTaskId` and ledger mutation. | — |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | `Pass` | Implementation handoff traces the approved boundary/duplication refactor and the source generally realizes one parser, root placement owner, localizer, and task mapper. | None beyond findings below. |
| Implementation matches approved behavior-defining supplemental artifacts | `Fail` | Valid handoff/address paths match the contract, but a rejected invalid definition update can still alter the active cached catalog (`CR-F-001`). | Make definition update validation atomic. |
| Data-flow spine inventory clarity and preservation under shared principles | `Pass` | Definition -> graph/compiler -> run snapshot -> member context -> root placement -> operation policy is explicit and traceable. | None. |
| Ownership boundary preservation and clarity | `Fail` | `agent-communication-tool-result.ts` imports an MCP result type and owns MCP transport projection, reversing the approved wrapper-to-service direction (`CR-F-002`). | Move MCP projection to the Tools MCP boundary. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | `Pass` | Event bus/status/results were split from `MixedTeamManager`; persistence, instructions, and transport adapters remain off the placement spine. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | `Pass` | Existing graph lookup, scoped member resolution, global exact-run router, TeamRun facade, task lifecycle, and MCP adapter framework are reused. | None. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | `Pass` | Address/handoff/error values, logical member context, placement, localizer, task mapper, and canonical envelope are shared. | Correct only the MCP mapper ownership in `CR-F-002`. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | `Pass` | `ResolvedTeamLogicalPlacement` is coordinate-only; collaboration and task contexts compose the minimal address context without configs/handles/lifecycle IDs. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | `Pass` | Root manager/resolver owns placement; task mapper owns task eligibility; communication service owns semantic envelope normalization. | None. |
| Empty indirection check (no pass-through-only boundary) | `Pass` | Facades either select transport, protect active-root resolution, bind runtime context, or adapt provider output. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | `Fail` | MCP `content`/`structuredContent`/`isError` construction sits in a communication service rather than the approved MCP mapper file. | Apply `CR-F-002`. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | `Fail` | `src/agent-communication/services/agent-communication-tool-result.ts:2` imports upward from `src/agent-tools/mcp`. | Remove the communication -> Tools MCP dependency. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | `Pass` | Task tooling uses the `TeamRun` facade; root manager alone invokes the placement resolver and privately converts placement to delivery endpoints; GraphQL uses the definition service. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | `Fail` | Canonical semantic result code is correctly in communication, but MCP transport mapping is not in the approved `src/agent-tools/mcp/agent-communication-mcp-result-mapper.ts`. | Apply `CR-F-002`. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | `Pass` | New domain/service files each hold a distinct contract or policy; the high-churn mixed manager was kept below the hard limit through cohesive extractions. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | `Pass` | Logical and exact-run selectors are exclusive; task input exposes only `recipient_name`; placement and task identities are explicit tagged values. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | `Pass` | Names distinguish authored/effective handoffs, root/owner/local coordinates, collaboration vs task policy, and persistent/task child directories. | Rename/move only as required by `CR-F-002`. |
| No unjustified duplication of code / repeated structures in changed scope | `Pass` | Parser, graph resolver/compiler, placement, localizer, and envelope serializer are single owners. | None. |
| Patch-on-patch complexity control | `Pass` | Old roster/representative/task-selector paths were deleted rather than wrapped; no retry/fallback chain was added. | None. |
| Dead/obsolete code cleanup completeness in changed scope | `Pass` | Six obsolete production files were deleted; production audit found no old roster/representative/task-kind authority. Remaining `{kind,name}` is internal persisted activation identity, not public input/resolution. | None. |
| Relevant test scenarios and assertions are clear and requirement-aligned | `Pass` | The handoff identifies focused source checks and downstream coverage scenarios; reviewer reran six focused files (36 tests). | API/E2E still owns durable coverage investigation after source passes. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | `Pass` | No test files were changed in this source implementation; focused existing suites use their established fixtures. | Downstream should classify/update stale fixtures. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | `Pass` | No test files are in the implementation diff. Known stale tests are explicitly disclosed for downstream coverage investigation rather than retained as production compatibility. | API/E2E must decide update/removal/replacement. |
| API/E2E readiness for the next workflow stage | `Fail` | Compilation/build/focused tests pass, but the two source findings must be corrected before coverage investigation/execution. | Return to implementation, then repeat source review. |

## Source File Size And Structure Audit (If Applicable)

Audit command counted effective non-empty lines for all 86 added/modified TypeScript implementation files under `autobyteus-server-ts/src`; six deleted obsolete files were reviewed under cleanup rather than line-counted. No changed implementation file exceeds 500 effective non-empty lines.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-execution/backends/claude/session/claude-session.ts` | 496 | `Pass` | Existing large file; `+1/-0` | Existing session owner; change only tool availability. | `Pass` | None | None. |
| `agent-team-execution/backends/mixed/mixed-team-manager.ts` | 489 | `Pass` | Reviewed; `+132/-102` | Cohesive root runtime orchestrator after event/status/result extraction. | `Pass` | None | Monitor future growth. |
| `agent-team-execution/task-delegation/task-delegation-service.ts` | 415 | `Pass` | Existing large file; `+16/-1` | Existing lifecycle owner; mapping is delegated to the mapper before mutation. | `Pass` | None | None. |
| `agent-team-definition/providers/file-agent-team-definition-provider.ts` | 386 | `Pass` | Existing large file; `+1/-0` | Existing multi-scope file provider. | `Pass` | None | None. |
| `agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | 331 | `Pass` | Shrunk `+3/-73` | Existing Agent handle owner; representative state removed. | `Pass` | None | None. |
| `api/graphql/types/agent-team-definition.ts` | 325 | `Pass` | Reviewed `+46/-2` | Existing GraphQL DTO/resolver boundary; handoff fields and typed error mapping are cohesive. | `Pass` | None | None. |
| `agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` | 325 | `Pass` | Shrunk `+19/-35` | Existing persistent child handle/lifecycle owner. | `Pass` | None | None. |
| `agent-team-execution/domain/team-run-config.ts` | 295 | `Pass` | Reviewed `+112/-20` | Domain config plus its one-way topology localization invariant is cohesive. | `Pass` | None | None. |
| `agent-team-execution/services/team-run-metadata-mapper.ts` | 283 | `Pass` | Existing file; `+6/-0` | Existing metadata/config conversion owner. | `Pass` | None | None. |
| `agent-team-execution/domain/team-run.ts` | 276 | `Pass` | Existing file; `+15/-0` | Public active-run facade remains narrow. | `Pass` | None | None. |
| `agent-team-execution/task-delegation/task-delegation-record.ts` | 269 | `Pass` | Shrunk `+3/-8` | Existing task record identity owner. | `Pass` | None | None. |
| `agent-team-execution/services/team-definition-topology-planner.ts` | 262 | `Pass` | Shrunk overall `+52/-77` | Planner now consumes the graph/compiler instead of repeating traversal. | `Pass` | None | None. |
| `run-history/store/team-run-metadata-schema.ts` | 262 | `Pass` | Existing file; `+3/-0` | Existing current-format schema owner. | `Pass` | None | None. |
| `agent-team-execution/backends/mixed/mixed-team-run-backend.ts` | 257 | `Pass` | Existing file; `+8/-0` | Backend delegates the placement facade without exposing config. | `Pass` | None | None. |
| `agent-team-execution/backends/mixed/members/mixed-task-team-member-handle.ts` | 251 | `Pass` | Shrunk `+19/-39` | Existing task-Team lifecycle handle. | `Pass` | None | None. |
| `agent-team-execution/services/agent-team-run-manager.ts` | 250 | `Pass` | Existing file; `+2/-0` | Existing run normalization owner; handoff snapshots are copied. | `Pass` | None | None. |
| `agent-team-definition/services/agent-team-definition-service.ts` | 200 | `Pass` | `<=220`; local correctness audit required by behavior | Correct authoritative service, but update mutates provider-owned cached state before validation. | `Pass` | `Local Fix` (`CR-F-001`) | Validate a detached candidate, then persist/cache it. |
| `agent-communication/services/agent-communication-tool-result.ts` | 38 | `Pass` | `<=220` | Semantic envelope belongs here; MCP container projection does not. | `Fail` | `Local Fix` (`CR-F-002`) | Move MCP mapping into `agent-tools/mcp`. |
| All other 68 added/modified production TypeScript files (individually counted by the audit) | 6–219 each | `Pass` | `Pass` | No additional size/SoC defect found in individual diff review. | `Pass` | None | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | `Pass` | No bare-name, `../`, task `{kind,name}`, route retry, representative, or old result fallback was introduced. |
| No legacy old-behavior retention in changed scope | `Pass` | Old production roster/resolver/representative/task-target authorities were deleted. |
| Dead/obsolete code cleanup completeness in changed scope | `Pass` | Production `rg` audit found only unrelated/internal tagged target values, not removed public authorities. |
| Approved persisted-data transition decision is followed without unnecessary migration work | `Pass` | Missing definition/run `handoffs` normalizes to `[]`; no record rewrite or migration branch exists. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | `Pass` | Readers are version-agnostic and runtime parsers are strict. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | `Pass` | Current data is directly usable and future writes use the canonical field. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: Public AgentTeam definition shape, logical messaging/task selector grammar, tool results, MCP tool availability, and TeamRun metadata behavior changed.
- Files or areas likely affected: `autobyteus-server-ts/docs/modules/agent_team_definition.md`, `agent_team_execution.md`, `agent_communication.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, and `run_history.md`. Final scope/content remains delivery-owned under `AC-021`.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

None.

### `CR-PREM-001` — A rejected invalid definition update can alter the active cached catalog

- Origin: `New`
- Related approved requirement or established contract: `R-004`, `R-006`, `R-019`, `R-026`, `AC-003`, `DS-001`; `AgentTeamDefinitionService.updateDefinition` is the authoritative semantic validation/persistence boundary.
- Relevant behavior ID(s): `BEH-001`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A user invokes the exposed GraphQL `updateAgentTeamDefinition` mutation with a syntactically typed but semantically invalid handoff endpoint, such as bare `from: "lead"`.
- Support evidence: The GraphQL mutation accepts `AgentTeamHandoffInput` strings at `src/api/graphql/types/agent-team-definition.ts:331-361`, constructs `AgentTeamDefinitionUpdate`, and invokes the service. Semantic rejection is deliberately service-owned and exported as a typed GraphQL error.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: GraphQL mutation -> `AgentTeamDefinitionResolver.updateAgentTeamDefinition` -> singleton `AgentTeamDefinitionService.updateDefinition` -> `CachedAgentTeamDefinitionProvider.getById` returns the cached object by reference -> service assigns update fields/handoffs -> graph/compiler throws before `provider.update` -> GraphQL returns rejection -> later GraphQL catalog read or TeamRun launch calls the same cached provider and receives the mutated object.
- Lifecycle preconditions and material consequence at the claimed point: The catalog cache has been populated, which is normal service operation. The persisted file is not updated and the mutation reports failure, yet subsequent reads expose rejected handoffs and a new launch can fail compilation until a cache refresh/restart restores persisted state.
- Reachability: `Reachable`
- Review consequence / proportionate response: Blocking runtime-correctness finding `CR-F-001`; a bounded detached-candidate update fixes the service without changing requirements or design.
- Verification evidence: After a successful `pnpm run build:full`, a built-JavaScript probe invoked `updateDefinition` with `{from:"lead",to:"./lead"}`. Output was `{"rejected":true,"code":"COLLABORATION_ADDRESS_INVALID"}` followed by `{"updateCalls":0,"cachedHandoffs":[{"from":"lead","to":"./lead","rules":["invalid should reject"]}]}`.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.9`
- Overall score (`/100`): `89`
- Score calculation note: simple average of the ten category scores, rounded for display. The decision is `Fail` because four categories are below `9.0` and two blocking findings remain.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | `9.3` | The implementation realizes a traceable definition/graph/snapshot/placement/operation spine and removes the competing flat projection. | The rejected-update state leak compromises the start of the definition spine under invalid input. | Make service updates atomic. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | `8.4` | Major runtime owners are well separated, including root placement and task mapping. | Communication owns MCP transport projection and imports upward from Tools MCP (`CR-F-002`). | Restore wrapper -> shared-service dependency direction. |
| `3` | `API / Interface / Query / Command Clarity` | `9.2` | Public selectors and result envelopes are explicit; placement/task identities are typed and narrow. | A rejected definition update has non-atomic observable semantics. | Ensure failure leaves catalog state unchanged. |
| `4` | `Separation of Concerns and File Placement` | `8.5` | Most new files are cohesive and well placed. | MCP `content`/`structuredContent`/`isError` mapping is in the communication service instead of the approved MCP boundary. | Add the dedicated MCP mapper file and update providers. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | `9.3` | Coordinate-only placement, minimal address context, immutable handoffs, and task specialization avoid kitchen-sink structures. | Minor drag from the transport-aware communication result file. | Apply `CR-F-002`. |
| `6` | `Naming Quality and Local Readability` | `9.2` | Names consistently distinguish definitions, effective snapshots, root placement, owner/local pairing, and task lifecycle. | MCP conversion naming resides in the wrong concern. | Move it to an accurately placed MCP mapper. |
| `7` | `API/E2E Readiness` | `8.5` | Handoff evidence, focused checks, and downstream scenario inventory are strong. | Source defects mean the package is not yet ready for coverage investigation/execution. | Fix both findings and pass source re-review. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | `8.0` | Core hierarchical placement, snapshot, delivery, and task sequencing align with the approved behavior. | A supported rejected GraphQL update corrupts in-memory catalog state (`CR-PREM-001` / `CR-F-001`). | Validate a detached candidate before any provider-owned object mutation. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | `9.5` | Old public selector/roster/representative/fallback authorities are cleanly removed while approved missing-field normalization remains. | Downstream still must remove/update stale tests, but no production compatibility authority remains. | Preserve the clean cut during rework. |
| `10` | `Cleanup Completeness` | `9.4` | Obsolete production files and fields are deleted; audits found no dormant replacement path. | Known stale tests remain outside this implementation-owned diff and await the required coverage investigation. | API/E2E should classify and maintain durable coverage after source passes. |

## Findings

### `CR-F-001` — Rejected definition updates mutate the cached catalog before validation

- Status: `Open`
- Severity: `High`
- Classification: `Local Fix`
- Affected approved behavior/contract: `BEH-001`, `R-004`, `R-006`, `R-019`, `R-026`, `AC-003`, `DS-001`.
- Material premise: `CR-PREM-001` (`Reachable`).
- Evidence: `src/agent-team-definition/services/agent-team-definition-service.ts:123-162` retrieves and mutates `existing`; semantic graph validation occurs only at `:164-172`; persistence is called at `:174`. The default cache returns its stored object directly at `src/agent-team-definition/providers/cached-agent-team-definition-provider.ts:52-62`. The built-source probe showed the invalid update was rejected and `provider.update` was never called, while a subsequent read returned the rejected handoff.
- Material consequence: A failed public definition update changes the active in-memory read/launch authority until refresh or restart. API clients can read content that was never accepted/persisted, and new TeamRun launch can fail on the poisoned definition.
- Required action: Construct a detached candidate definition from the current value plus requested changes; validate that candidate; call `provider.update(candidate)` only after validation succeeds. Do not mutate any provider-returned/current cached object before validation. The fix should cover all update fields, not only `handoffs`, because any later graph failure must be atomic.
- Re-review evidence required: source diff plus a local proof that an invalid handoff update rejects with its typed code, does not call provider persistence, and leaves `getDefinitionById` deeply unchanged; also show a valid update still persists/returns its changed handoffs.

### `CR-F-002` — Shared communication service owns MCP transport projection and imports upward from Tools MCP

- Status: `Open`
- Severity: `Medium`
- Classification: `Local Fix`
- Affected approved engineering contract: design-spec ownership/dependency rules 12–13 and the approved target map for `src/agent-tools/mcp/agent-communication-mcp-result-mapper.ts` (`design-spec.md:657-662`, `:717-720`, `:831`).
- Evidence: `src/agent-communication/services/agent-communication-tool-result.ts:2` imports `McpToolResult` from `src/agent-tools/mcp/agent-tools-mcp-result-mapper.ts` and `:24-32` builds MCP `content`, `structuredContent`, and `isError`. Both communication MCP providers import this transport mapper back from the communication service. The approved direction is provider/runtime wrapper -> shared communication semantics, with MCP projection in Tools MCP.
- Material consequence: The otherwise shared communication subsystem is coupled to one transport/provider layer, weakening reuse and making transport container changes propagate into the semantic service boundary.
- Required action: Keep the envelope type, operation normalization, rejection constructor, and canonical JSON serializer in `agent-communication-tool-result.ts`. Move `toAgentCommunicationMcpToolResult` and its `McpToolResult` dependency into the approved `src/agent-tools/mcp/agent-communication-mcp-result-mapper.ts`, then update both MCP providers to import it there. Continue returning explicit `mcp_tool_result`; do not route communication through the generic operation-result mapper.
- Why `Local Fix`, not `Design Impact`: The approved design already specifies the correct owner, dependency direction, and target file; no upstream design change is needed.

## Classification

- Current classification: `Local Fix`
- Rationale: Both findings are bounded implementation corrections. The behavior and architecture package is sufficient and already specifies the correct target state.

## Recommended Recipient

- `implementation_engineer`
- Implementation-owned fixes must return through implementation review before API/E2E coverage investigation.

## Residual Risks

- Provider/live parity, hierarchical Team Communication events, persistent/restored/task child lifecycle, snapshot restoration after definition change, and full task submission/review/settlement remain unexecuted at API/E2E level.
- Existing durable tests known to encode removed public shapes still require the mandatory downstream coverage investigation after source passes.
- `MixedTeamManager` remains close to the 500-line hard limit (489 effective non-empty lines); current extraction is coherent, but future changes should avoid reabsorbing off-spine concerns.

## Verification Performed In This Review

- `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- Focused Vitest suite named in the implementation handoff — 6 files, 36 tests passed.
- `pnpm run build:full` — passed, including sanitized built-module/bootstrap smoke.
- `git diff --check 2a7271c9d..HEAD` — passed.
- Changed-source size audit — 86 added/modified TypeScript implementation files, zero over 500 effective non-empty lines.
- Production legacy-authority audit — no removed roster/representative/task-kind/fallback authority found.
- Built-JavaScript rejected-update probe — reproduced `CR-F-001` exactly as recorded in `CR-PREM-001`.
- Final worktree status after review checks — clean except for the two review artifacts created by this review.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` — the only finding requiring a lifecycle premise has a complete reachable witness in `CR-PREM-001`.
- Score Summary: `8.9/10` (`89/100`); categories 2, 4, 7, and 8 are below the clean-pass threshold.
- Failure Origin (when applicable): `Implementation source`
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: Resolve `CR-F-001` and `CR-F-002`, update the implementation handoff/revision record, and return the cumulative package for code re-review before API/E2E.
