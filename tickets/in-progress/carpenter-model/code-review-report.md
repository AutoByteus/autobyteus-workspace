# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `system-prompt-contract.md`, `agent-identity-prompt-spec.md`, `working-environment-prompt-spec.md`, `bash-operating-practice-prompt-spec.md`, `file-and-directory-practice-prompt-spec.md`, `team-and-runtime-prompt-spec.md`, `prompt-value-binding-spec.md`, `system-skill-decision.md`, and `classroom-simulation-composed-system-prompt.md` at their canonical ticket paths.
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/carpenter-model/tickets/in-progress/carpenter-model/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Trigger: Initial source review of commit `99976b55ab0f988e09fa9851f760ca9776f30a1c`.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: Round 1 / `CRR-001`
- Coverage Investigation Reviewed: `N/A`
- Execution Coverage Report Reviewed: `N/A`
- API/E2E Revision Record Reviewed: `N/A`
- Relevant API/E2E Revision IDs: `N/A`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: `N/A`
- Failure Evidence Paths: `N/A`

## Review Scope

- Changed implementation and behavior reviewed: shared carpenter prompt composition and authored-heading containment; native/Codex/Claude projection; provider-neutral requested-tool exposure and automatic team tools; native terminal Skills and final-payload validation; team runtime rendering; agent-definition/API/web removal of optional processor selection; persisted-config handling; obsolete strategy/composer cleanup.
- Files / areas reviewed: all 117 changed paths, with production-path tracing through the three runtime bootstrappers/factories, core `AgentConfig`/prompt pipeline, team context/roster builders, MCP catalog/session transport, skill loaders/processors, GraphQL definition surfaces, and affected web authoring/store code.
- Explicit exclusions: API/E2E execution, stale integration/E2E repair, live browser validation, and durable conceptual documentation synchronization remain downstream-owned.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes; `R-001`–`R-014`, `AC-001`–`AC-014`, and all exact prompt supplements were reviewed.
- Design-spec behavior map verified against the implementation: Mostly. The primary native/Codex/Claude prompt/tool spines are present, but the approved closed native prompt contract is contradicted by the still-public core processor extension surface, and the heading-containment implementation can rewrite content inside a reachable fenced body.
- Design review report and round confirmed: Yes; `ARCH-REV-003` was the implementation basis.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: No new supported product behavior. Two implementation/design mismatches were found against existing approved behavior.
- Remaining material ambiguity, if any: None for the findings below.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Resolved definition/workspace/team context -> `composeCarpenterPrompt` -> native/Codex/Claude instruction boundary. | N/A |
| `BEH-002` | Confirmed | Skill service -> native terminal metadata/path catalog or provider-native materializer; bodies remain lazy. | N/A |
| `BEH-003` | Confirmed | `resolveRuntimeAgentToolExposure` unions/deduplicates the two team defaults before native/MCP projection. | N/A |
| `BEH-004` | Confirmed | Native `AgentConfig.systemPrompt`, Codex `baseInstructions`, and Claude query `systemPrompt`; Claude user `prompt` remains raw turn content. | N/A |
| `BEH-005` | Confirmed | Each adapter supplies its resolved working directory to the composer and its normal runtime/tool boundary. | N/A |
| `BEH-006` | Confirmed | Existing ordinary `Skill` model and provider materializers remain in use; no kind taxonomy was added. | N/A |
| `BEH-007` | Confirmed | Identity renderer uses name, optional description/body, no role, and no description fallback. | N/A |
| `BEH-008` | Contradicted | Ordered section composition is shared, but `autobyteus-ts/src/agent/context/agent-config.ts` still accepts and copies arbitrary `systemPromptProcessors`, and core exports retain processor registration/registry entry points. | `R-010` / `AC-010` require removal of the optional extension surface so Skills is terminal and no later configurable processor can mutate the contract. |
| `BEH-009` | Confirmed | Fixed exact Bash section is emitted by the shared section owner. | N/A |
| `BEH-010` | Confirmed | Fixed exact File And Directory section follows Bash. | N/A |
| `BEH-011` | Confirmed | Valid `MemberTeamContext` -> fixed Team Runtime renderer and automatic provider tools; standalone omits team sections. | N/A |
| `BEH-012` | Contradicted | Required/optional scalar handling and final placeholder validation are present, but the fence state machine can treat a non-closing same-marker content line as a close and rewrite a following fenced heading. | Supported agent-instruction authoring -> `AgentDefinition.instructions` -> containment -> provider prompt violates the approved fenced-content preservation rule; see `CR-MP-001`. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Shared composer/tool-exposure owners replace the three fragmented provider policies. | None beyond findings. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Fixed text/order/bindings match, but the optional core processor surface and fence parsing contradict `system-prompt-contract.md` and `prompt-value-binding-spec.md`. | Resolve `CR-001` and `CR-002`. |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | Definition/workspace/team facts flow through one composer; tool exposure remains a parallel provider-native spine. | None. |
| Ownership boundary preservation and clarity | Fail | Semantic ownership is good, but public core runtime configuration still allows arbitrary post-composition processors. | Resolve `CR-001`. |
| Off-spine concern clarity | Pass | Heading containment, skill cataloging, roster building, and provider transport serve named owners. | None. |
| Existing capability/subsystem reuse check | Pass | Existing skill, roster, delegation, MCP, workspace, and provider lifecycle owners are reused. | None. |
| Reusable owned structures check | Pass | Shared composer, sections, containment, team renderer, and runtime exposure remove repeated provider policy. | None. |
| Shared-structure/data-model tightness check | Pass | Composer input and runtime exposure shapes are narrow and provider-neutral. | None. |
| Repeated coordination ownership check | Pass | Section ordering and automatic team-tool union each have one owner. | None. |
| Empty indirection check | Pass | New files own policy or transformation; no pass-through-only layer was added. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Prompt semantics, team rendering, exposure, and provider projection remain separated. | None. |
| Ownership-driven dependency check | Pass | Adapters depend on shared semantic owners; composer does not inspect MCP/provider state. | None. |
| Authoritative Boundary Rule check | Pass | No reviewed caller simultaneously bypasses a new owner into its internals. | None. |
| File placement check | Pass | New prompt files are under `agent-execution/prompt`; team rendering remains under team execution. | None. |
| Flat-vs-over-split layout judgment | Pass | Three small prompt files represent real separate responsibilities without artificial depth. | None. |
| Interface/API/query/command/service-method boundary clarity | Fail | `AgentConfig` still publicly accepts arbitrary `systemPromptProcessors`, contradicting the closed current runtime interface. | Resolve `CR-001`. |
| Naming quality and naming-to-responsibility alignment check | Pass | Carpenter/runtime-exposure naming is truthful; the historical-key split/join is slightly opaque but bounded. | Prefer a documented current-field projection rather than string obfuscation when revising. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Fixed policy is centralized. | None. |
| Patch-on-patch complexity control | Pass | Old strategies/composers were deleted rather than wrapped. | None. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Core optional processor registry/registration exports and injection points remain. | Resolve `CR-001`. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Provider/tool tests are coherent, but the containment suite misses valid fence-content cases and the native final-payload test uses a custom processor rather than the required real Skills append scenario. | Add focused coverage with the fixes. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Provider and exposure fixtures are scoped and reusable. | None. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Obsolete unit suites were removed; known broader stale suites are explicitly handed to API/E2E. | None. |
| API/E2E readiness for the next workflow stage | Fail | Focused tests pass, but source/design corrections are required before API/E2E. | Do not advance until reimplementation and source re-review pass. |

## Source File Size And Structure Audit

All changed implementation-source files were measured using effective non-empty lines. Tests, fixtures, generated GraphQL output, localization, JSON, and ticket artifacts were excluded. No changed source file exceeds 500 effective lines and no changed source delta exceeds 220 lines.

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `claude/session/claude-session.ts` | 489 | Pass | Pass (20) | Pass | Pass | None | None |
| `autobyteus/autobyteus-agent-run-backend-factory.ts` | 477 | Pass | Pass (74) | Pass | Pass | None | None |
| `runtime-management/claude/client/claude-sdk-client.ts` | 460 | Pass | Pass (2) | Pass | Pass | None | None |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | 419 | Pass | Pass (3) | Pass | Pass | None | None |
| `agent-definition/providers/file-agent-definition-provider.ts` | 385 | Pass | Pass (1) | Pass | Pass | None | None |
| `codex/backend/codex-thread-bootstrapper.ts` | 367 | Pass | Pass (75) | Pass | Pass | None | None |
| `autobyteus-web/stores/agentDefinitionStore.ts` | 318 | Pass | Pass (3) | Pass | Pass | None | None |
| `agent-execution/services/agent-run-manager.ts` | 295 | Pass | Pass (6) | Pass | Pass | None | None |
| `agent-tools/mcp/agent-tool-mcp-catalog.ts` | 293 | Pass | Pass (34) | Pass | Pass | None | None |
| `api/graphql/types/agent-definition.ts` | 272 | Pass | Pass (10) | Pass | Pass | None | None |
| `agent-definition/services/agent-definition-service.ts` | 271 | Pass | Pass (15) | Pass | Pass | None | None |
| `member-team-context-builder.ts` | 219 | Pass | Pass (6) | Pass | Pass | None | None |
| New `carpenter-prompt-composer.ts` / `carpenter-prompt-sections.ts` / `markdown-heading-containment.ts` | 50 / 51 / 49 | Pass | Pass (54 / 62 / 53) | Composer/sections pass; containment has `CR-002` | Pass | `Local Fix` for containment | Resolve `CR-002` |
| New `runtime-agent-tool-exposure.ts` / `team-runtime-instruction-renderer.ts` | 57 / 46 | Pass | Pass (64 / 48) | Pass | Pass | None | None |
| `autobyteus-ts` prompt step / Skills processor | 44 / 76 | Pass | Pass (4 / 18) | Final boundary is correct; surrounding configurable processor API is not closed | Pass | `Design Impact` | Resolve `CR-001` |
| All remaining changed implementation-source files | 11–173 each | Pass | Pass (1–50 each) | Pass except the core `AgentConfig`/processor surface recorded in `CR-001` | Pass | As finding | Resolve `CR-001` |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No dual prompt format, compatibility wrapper, or version-specific reader was added. |
| No legacy old-behavior retention in changed scope | Fail | The obsolete optional core prompt-processor extension remains callable/exported. |
| Dead/obsolete code cleanup completeness in changed scope | Fail | Registry/registration entry points remain after all production callers were removed. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Current field projection ignores historical keys; no bulk rewrite was added. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Current reader/writer remains version-agnostic. |
| Approved transition mechanics match the reviewed design | Pass | Existing data stays directly usable and new writes omit the retired field. |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/agent/context/agent-config.ts` optional `systemPromptProcessors` constructor/property/copy path and mutable `DEFAULT_SYSTEM_PROMPT_PROCESSORS` | `LegacyBranch` / `UnusedFlag` | Lines 25–27, 39, 60, 86–91, and 118 retain arbitrary processor injection/copying. | `R-010` / `AC-010` require one terminal platform-owned Skills mutation and no optional extension surface. | Redesign the core config boundary so callers cannot inject or globally mutate arbitrary prompt processors. |
| `autobyteus-ts/src/agent/system-prompt-processor/processor-definition.ts`, `processor-registry.ts`, `register-system-prompt-processors.ts`, and their public exports | `UnusedHelper` / `DormantPath` | Production search finds no caller after server registration removal; `index.ts` still exports them. | They preserve the retired customization contract and make cleanup incomplete. | Remove obsolete registry/registration API or justify a non-optional internal owner in the corrected design. |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: The carpenter foundation, ordinary lazy skills, automatic team tools, provider projection, and removal of optional prompt-processor customization change durable conceptual/authoring behavior.
- Files or areas likely affected: project skill design/agent authoring/runtime prompt documentation identified by delivery after branch integration. Documentation work remains delivery-owned.

## Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| `MP-001` | Confirmed | Existing Codex MCP lifecycle remains unchanged; it drives no finding. |
| `MP-002` | Confirmed | Native post-Skills final validation exists before state/LLM mutation. The exact real-skill coverage requested upstream is still absent, but source behavior is present. |
| `MP-003` | No Longer Relevant | The prohibited full-cleanup mechanism remains absent; `Not Reachable` drives no finding. |

### `CR-MP-001` — A supported authored instruction body contains a same-marker fenced content line that is not a legal closing fence

- Origin: `New`
- Related approved requirement or established contract: `R-010`, `R-014`, `AC-010`, `AC-014`; authored fenced Markdown must remain untouched while only ATX headings outside fences are contained.
- Relevant behavior ID(s): `BEH-008`, `BEH-012`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A user creates or edits an agent definition's free-form instruction body through the Agent Definition form or GraphQL create/update mutation.
- Support evidence: `AgentDefinitionForm.vue` exposes the `instructions` textarea and mutations carry it to `CreateAgentDefinitionInput` / `UpdateAgentDefinitionInput`; file-backed `agent.md` bodies are another supported source.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Agent Definition form/GraphQL mutation or file-backed source -> `AgentDefinition.instructions` -> `composeCarpenterPrompt` -> `containAuthoredMarkdownHeadings` -> provider system/base instructions.
- Lifecycle preconditions and material consequence at the claimed point: For ` ```md\n```not-a-close\n# should stay code\n``` `, the current fence regex treats ` ```not-a-close ` as a close, rewrites the following fenced heading to `#### should stay code`, and treats the actual close as a new opener. Authored code content is mutated.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-002` requires a bounded parser correction and focused regression test; no generalized Markdown parser framework is required.

## Review Scorecard

- Overall score (`/10`): `8.9`
- Overall score (`/100`): `89`
- Score calculation note: Simple average of the ten category scores; the failing categories and findings determine the review decision.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | Prompt and tool spines are explicit, shared, and provider-independent. | No material spine issue beyond the extension boundary. | Preserve this structure. |
| 2 | Ownership Clarity and Boundary Encapsulation | 8.7 | New semantic owners are strong. | Core runtime config still permits arbitrary prompt mutation outside the closed owner. | Resolve `CR-001`. |
| 3 | API / Interface / Query / Command Clarity | 8.8 | Server/API/web selection fields are removed cleanly. | Public `AgentConfig` and core exports still advertise the retired extension. | Close the core interface. |
| 4 | Separation of Concerns and File Placement | 9.3 | Prompt, team, tool, skill, and provider responsibilities are well placed. | Fence state handling has one local correctness flaw. | Correct `CR-002` without broadening the helper. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.2 | Composer and exposure shapes are narrow and eliminate duplication. | Core processor list remains a parallel mutation representation. | Make Skills the single terminal representation. |
| 6 | Naming Quality and Local Readability | 9.0 | New names align with responsibilities. | The split/join historical-key filter is opaque and the processor names no longer reflect current ownership. | Use explicit, documented current-field handling during revision. |
| 7 | API/E2E Readiness | 8.7 | Seventy-five focused server tests and seven focused core tests pass. | Source/design findings remain; containment and real post-Skills placeholder coverage are incomplete. | Fix and add focused coverage before API/E2E. |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Main provider projections and tool union match the approved contract. | Reachable fenced content is rewritten, and the closed mutation contract is not structurally enforced. | Resolve both findings. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.1 | No dual prompt formats or request-time fallback were added. | Obsolete core extension API remains, though it has no in-repo production caller. | Remove the retired surface. |
| 10 | Cleanup Completeness | 8.6 | Old server/provider composers and strategies were deleted. | Core registry/registration and optional injection paths remain dormant/exported. | Complete core cleanup under a corrected design. |

## Findings

### `CR-001` — The closed native prompt contract still exposes arbitrary core system-prompt processors

- Severity: `High`
- Classification: `Design Impact`
- Affected behavior/contracts: `BEH-008`; `R-010`; `AC-010`; the approved terminal-Skills ownership boundary.
- Evidence: `autobyteus-ts/src/agent/context/agent-config.ts` retains a public mutable `DEFAULT_SYSTEM_PROMPT_PROCESSORS`, public `systemPromptProcessors` property, constructor injection parameter, and copy propagation. `autobyteus-ts/src/agent/system-prompt-processor/index.ts` still exports the processor definition, registry, default registry, and registration function; production search finds no remaining caller for that registry. The new final-payload test itself supplies a custom `PlaceholderAppendingProcessor`, demonstrating that the supposedly removed runtime extension remains accepted.
- Consequence: The source does not structurally enforce the approved closed composition contract or terminal Skills ownership, and obsolete public/dormant API remains after the server authoring surface was removed. This finding is based directly on the governing removal contract; it does not assume a hypothetical current UI path that mutates the core default.
- Why `Design Impact`: The reviewed target mapping called the server/domain/API/web list complete while omitting the public core `AgentConfig` and exported registry boundaries. Correcting this requires an explicit upstream decision about the core mandatory processor representation and public API removal, not an unreviewed local signature shift.
- Required action: Update the design/change inventory to close the core runtime boundary, then implement the clean cut. At minimum, callers must not be able to inject/copy/globally mutate arbitrary prompt processors; obsolete registry/registration exports with no current owner must be removed. Preserve one platform-owned terminal Skills append and the post-pipeline final validator.

### `CR-002` — Fence containment rewrites headings after a non-closing fence-like content line

- Severity: `Medium`
- Classification: `Local Fix`
- Affected behavior/contracts: `BEH-008`, `BEH-012`; `R-010`, `R-014`; `AC-010`, `AC-014`; `CR-MP-001`.
- Evidence: `markdown-heading-containment.ts` uses one unanchored `FENCE` prefix regex for both opening and closing. While inside a fence it closes on any same-marker run of sufficient length, even when non-space text follows. Direct execution with ` ```md\n```not-a-close\n# should stay code\n``` ` produced `#### should stay code` inside the authored code block.
- Consequence: Supported free-form agent/team Markdown can be modified inside a fenced region, contradicting the explicit preservation rule.
- Required action: Distinguish valid fence opening from valid closing syntax; while a fence is active, close only on a same-marker run of sufficient length followed solely by allowed trailing whitespace. Add regression tests covering this case, ordinary info-string openings, alternate markers, and the existing overflow behavior.

## Classification

- Overall failure classification: `Design Impact`
- The structural core-surface gap takes precedence for routing. `CR-002` is a bounded implementation correction to carry through the revised solution.

## Recommended Recipient

- `solution_designer`
- Reason: `CR-001` reveals an omitted core public/runtime boundary in the reviewed design. The cumulative package must return through solution/design review before implementation revision and source re-review.

## Residual Risks

- Known stale integration/E2E tests remain downstream work only after source review passes.
- The full server typecheck and Nuxt typecheck retain the documented existing tooling blockers; focused source checks/tests passed and do not resolve those repository-wide issues.
- External shell-first skill-package cleanup and authored-body editorial normalization remain explicitly out of scope.

## Validation Evidence

- `autobyteus-server-ts`: focused composer, runtime exposure, native factory, Codex bootstrap, Claude bootstrap/session/tooling suites — `7 files / 75 tests passed`.
- `autobyteus-ts`: final-payload and Skills suites — `2 files / 7 tests passed`.
- Direct containment probe reproduced `CR-002` with the current source.
- Changed-source audit: no current implementation source over 500 effective non-empty lines; no implementation-source delta over 220 lines.
- Worktree remained clean before review artifacts were written.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate: `Pass` — the only new scenario-dependent finding has a complete supported authoring path in `CR-MP-001`; no `Not Reachable` premise drives a finding or deduction.
- Score Summary: `8.9/10` (`89/100`); Ownership, Interface Clarity, API/E2E Readiness, Runtime Fidelity, and Cleanup are below the 9.0 clean-pass threshold.
- Failure Origin: Reviewed design omitted the core runtime extension surface from its claimed complete removal boundary; implementation also contains a bounded fence-state defect.
- Recommended Recipient: `solution_designer`
- Notes: Do not advance to API/E2E. After solution/design revision and implementation, repeat implementation source review before API/E2E.
