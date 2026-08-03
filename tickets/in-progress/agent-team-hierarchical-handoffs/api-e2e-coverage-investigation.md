# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-test-review-report.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: `2`
- Trigger: `code_reviewer` CRR-003 / TR-F-001 reporting-only Local Fix after the 48 durable test files passed proportional review.
- Prior Investigation Reviewed: `Round 1 / API-REV-001`
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The reviewed implementation must prove AC-001 through AC-020 and AC-022 at the executable boundary; AC-021 is delivery-owned documentation synchronization. The critical spans are: complete AgentTeam handoff definition/file/GraphQL round trips and validation; one strict `/...` and `./...` placement authority shared by message delivery and task delegation; direct, nested, upward, cross-branch, duplicate-leaf, and Team-ingress resolution; fail-closed typed errors with no recipient input or accepted Team Communication; sender-only handoff retrieval; immutable launch snapshot persistence and restore after definition mutation; unchanged exact-run routing/codes; truthful prompt/tool metadata; provider envelope parity across AutoByteus and the Codex/Claude Agent Tools MCP materialization path; recursively localized persistent/restored/task child topology; direct/current-Team task eligibility and complete task lifecycle; active persistent-child task-service lookup and cleanup; and preserved root-coordinator user ingress.

The approved legacy posture is a clean cut: bare logical names, synthetic representatives, flat recipient/task rosters, `{target:{kind,name}}`, root/local coordinator retry, and message-only communication provider results are obsolete. Missing definition and current-format metadata `handoffs` remains valid current data and normalizes to `[]` without migration.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / definition domain, file sources, GraphQL | Added / Changed | R-001–R-006, R-019; AC-001–AC-005, AC-016 | Extend definition API/file tests for handoffs, validation, order, all ownership scopes, omission/clear, and rejected-update atomicity. |
| BEH-002–BEH-004 / shared placement and nested Team runtime | Changed | R-007–R-010, R-016, R-025; AC-006–AC-011 | Replace flat-roster assertions with strict path, Team-ingress, same-name, cross-branch, actual-participant, and no-fallback coverage. |
| BEH-005–BEH-006 / handoff tool and instructions | Added / Changed | R-011–R-014; AC-012–AC-013 | Add sender-only/empty/no-context results and configured instruction/tool exposure checks. |
| BEH-007 / exact live AgentRun selector | Preserved | R-015, R-026; AC-015 | Keep direct-router tests; extend wrapper/MCP assertions so existing codes survive the canonical envelope. |
| BEH-008 / snapshot and restore | Added / Changed | R-017–R-020; AC-014, AC-016, AC-017 | Add metadata direct-use and create/terminate/definition-mutate/restore evidence; prove no recompilation. |
| BEH-009 / runtime/provider contract | Changed | R-021, R-026; AC-019 | Update plain-text expectations and add exact AutoByteus JSON vs MCP text/structured parity, rejection-only `isError`, tool names, delivery, and typed errors. |
| BEH-010 / Team default entry | Preserved | R-022; AC-020 | Retain and rerun default root-coordinator ingress coverage. |
| BEH-011 / shared task recipient plus task lifecycle | Changed | R-023, R-027; AC-018, AC-022 | Replace `{kind,name}` tests with `recipient_name`; add same-placement, direct Agent/Team, non-direct/self/legacy rejection-before-activation, three-level ingress, active-child create/restore/dispose, and result/review/settlement coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Address/handoff values, definition graph/compiler, placement resolver, child localizer, task mapper | Unit and integration Vitest seams exist; only one test file changed in implementation | Most existing assertions still encode removed contracts; lifecycle composition is not yet proven | Repository unit/integration/E2E |
| API / transport / contract | Yes | GraphQL definition fields/errors; AutoByteus and MCP tool contracts/results | GraphQL E2E and MCP integration infrastructure exist | Handoff round trips and canonical provider envelope are not covered durably | In-process GraphQL/API and adapter integration |
| Frontend component / state | No | No frontend source changed | N/A | None in approved scope | None |
| Browser integration / user journey | No | No web UI or browser API changed | N/A | Backend contract is directly executable without a browser | None |
| Authentication / session / permissions | No | Tool exposure is configuration/context gated, but no auth/session policy changed | Provider materialization/tool-gating unit seams | External-provider authentication is not required for adapter-level AC-019 | None unless repository evidence exposes a gap |
| Desktop renderer / web-equivalent UI | No | No renderer change | N/A | None | None |
| Desktop shell / Electron-specific integration | No | No shell/preload/IPC change | N/A | None | None |
| Process / lifecycle | Yes | TeamRun create/terminate/restore; lazy child create/restore/dispose; task lifecycle | Mixed runtime E2E and task integration suites exist | Snapshot-after-mutation and active-child directory cleanup are not covered | In-process lifecycle E2E |
| Persisted-data transition | Yes | Optional definition/run `handoffs`; task records unchanged | File/metadata tests and history helpers exist | Representative current records need direct-use proof; restore must not recompile | Repository persistence and lifecycle probes |
| Worker / queue / distributed coordination | No | No queue/distributed path changed | N/A | None | None |
| External integration | No for required proof | Codex/Claude adapters use MCP materialization but AC-019 explicitly permits adapter-level evidence | Materializer and MCP provider seams exist | Real LLM nondeterminism/secrets would not improve the deterministic contract proof enough to justify dependency | None unless deterministic adapter coverage fails |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Project type and runtime stack: pnpm monorepo; Node.js/TypeScript; Fastify; GraphQL/Mercurius; Prisma/SQLite; Vitest using fork pool and serial file execution.
- Conflicting, missing, or unclear project instructions: `AGENTS.md` gives `pnpm -C autobyteus-server-ts ...` commands from the workspace parent, while inside the server the equivalent `pnpm exec vitest ...` is valid. The root README additionally defines `pnpm test:e2e`. `pnpm typecheck` includes a known pre-existing test/rootDir incompatibility, so production source checks use `tsconfig.build.json` as recorded upstream. No conflict affects the intended test commands.
- Required environment variables or secrets available: `N/A` for deterministic repository coverage. `.env.test` supplies the test runtime's non-secret SQLite/host configuration. Real provider credentials will not be assumed or represented as passed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/AGENTS.md` | Closest repository test instructions | Use `vitest run`/`--no-watch`; full, integration, or single-file examples. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/README.md` | Runtime/test/environment authority | Dependencies via root `pnpm install`; `.env.test` and `tests/.tmp`; deterministic `pnpm test:e2e`; external capabilities must be skipped/reported, not called passed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/package.json` | Workspace scripts | `pnpm test:e2e` runs server `tests/e2e`; real-provider preflight/run are separate and optional. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/package.json` | Server scripts/runtime dependencies | `pnpm test -- --run ...`; `build:full`; Prisma and shared workspace preparation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/vitest.config.ts` | Test runner configuration | Node environment, fork pool, no file parallelism, Prisma setup/global setup, `tests/**/*.test.ts`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/.env.test` | Test runtime config | Test-owned SQLite and server host values; do not use development DB. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/setup/prisma-env.ts` and `prisma-global-setup.ts` | Fixture/environment setup | Vitest owns test DB preparation; tests must not reuse development or production state. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| pnpm dependencies/shared builds | Worktree root / server | Already installed upstream with `pnpm install --frozen-lockfile`; test pre-scripts build shared packages | Worktree-local `node_modules` exists | `pnpm exec vitest --version`; build/typecheck commands | No process |
| Deterministic Vitest runtime | `autobyteus-server-ts` | `pnpm exec vitest run <paths> --no-watch` | Uses `.env.test`, Prisma global setup, and `tests/.tmp` | Test collection and setup completion | Vitest exits; test-owned temporary files cleaned by hooks where defined |
| In-process GraphQL/E2E app | `autobyteus-server-ts` | Existing test helpers construct/start the app inside Vitest | No separately owned public port required | Existing helper/application readiness | Existing `afterAll`/fixture cleanup |
| Real provider runtime | N/A | Not initially selected | AC-019 accepts adapter-level coverage; secrets/configuration are not assumed | N/A | N/A |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions with nested topology and handoffs | Test-local temporary package/config writers and in-memory provider fixtures already used by definition/runtime suites | Unique temp directories and test-owned IDs only | Existing hooks remove temp directories; any added fixture cleanup will be explicit |
| TeamRun metadata/current records | Existing metadata mapper/store and E2E helper fixtures | Test SQLite/file memory roots only | Remove test-owned temp roots; never touch user memory |
| Provider results and tool sessions | In-memory/fake dispatcher, MCP session registry, configured materializer fixtures | Deterministic, no external credentials | Registry/session cleanup in tests |
| Task agents/teams and active-child directory | Existing mixed backend/task lifecycle harnesses | Test-owned runs/services only | Terminate/dispose runs and assert directory/service detachment |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design spec “Persisted Data / State Transition Decision”; implementation handoff “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: definition config and current-format TeamRun metadata omit `handoffs`; normal readers must produce `[]` without rewrite or definition lookup. Existing task records remain readable because they persist structured conversation addresses/kind rather than the removed live selector.
- Evidence planned for the approved direct-use outcome: shared/team-local/application-owned config reads; GraphQL reads; metadata schema/mapper read without field; restore of absent snapshot as empty; new writes emit canonical arrays; restore with a stored snapshot after current definition mutation uses the stored array unchanged.
- Migration-specific completion/recovery scenarios: `N/A`.
- Upstream ambiguity or reroute required: `None`.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-team-definition/agent-team-definition-service.test.ts` | Definition service CRUD plus new IR-002 atomic update checks | AC-003; DS-001 | Still Valid, needs expansion | IR-002 added only two direct service scenarios | Retain; add validation/ordering/clear coverage in appropriate definition/provider suites. |
| `tests/unit/agent-team-definition/application-owned-team-source.test.ts`, provider/cache/discovery tests | Source-specific definition reads/writes | AC-001, AC-002, AC-016 | Needs Update | Current fixtures generally omit/expect no canonical handoff field | Add absent/present/ordered handoff round trips without changing unrelated discovery semantics. |
| `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Public GraphQL definition CRUD | AC-001–AC-004, AC-016 | Needs Update | Existing public E2E is the correct boundary but has no handoff input/output/error assertions | Extend create/read/update/clear/typed rejection and rejected-update state preservation. |
| `tests/unit/agent-team-execution/team-definition-topology-planner.test.ts` | Recursive topology planning | AC-003–AC-005 | Still Valid, needs expansion | Focused upstream suite passes but compilation breadth is limited | Retain; add nested handoff rebase/composition/collision and immutable snapshot assertions. |
| `tests/unit/agent-team-execution/member-team-context-builder.test.ts` | Flat recipient roster/representative exposure | AC-006–AC-013, AC-018 | Replace | Imports/asserts removed `communicationRecipients`, `allowedRecipientNames`, representatives, and coordinator-only parent projection | Replace scenarios with root/member/immediate-Team addressing, caller-filtered handoffs, and no flat authority. |
| `tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Flat roster and exact-run guidance | AC-013, AC-019, AC-022 | Needs Update | Imports removed recipient types and asserts obsolete roster prose; exact-run/exposure parts remain useful | Rewrite fixtures/assertions around canonical address grammar, Team ingress, configured handoff guidance, shared task selector, and no inline rules/roster. |
| `tests/unit/agent-team-execution/inter-agent-message-delivery*.test.ts`, `mixed-team-manager.test.ts`, `mixed-sub-team-member-handle.test.ts` | Delivery intent, representative invariants, mixed routing/events | AC-006–AC-011, AC-015 | Needs Update / Replace obsolete assertions | Several tests construct bare recipients and `representedSubTeam`; root/exact delivery mechanics remain valuable | Replace synthetic identity cases with coordinate-only placement, real participants, strict failures, and exact-once event/no-event checks. |
| `tests/unit/agent-tools/team-communication/send-message-to.test.ts` and AutoByteus tool/backend exposure tests | Native wrapper result and bound Team context | AC-012, AC-015, AC-019 | Needs Update | Constructs removed flat context and expects message-only output | Assert canonical JSON envelopes, codes, Team/no-Team contexts, get-handoff rules, and configured names. |
| MCP catalog/session/materializer/provider tests and `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Codex/Claude/external Agent Tools MCP exposure and calls | AC-012, AC-019 | Needs Update | Correct deterministic boundary exists; new tool/result parity is absent | Add both tool names, accepted/rejected text/structured parity, exact codes, and gating. |
| `tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts`, `team-run-service.test.ts`, `tests/integration/agent-team-execution/team-run-service.integration.test.ts` | TeamRun config/metadata lifecycle | AC-014, AC-016–AC-018, AC-020 | Needs Update | Existing topology/restore tests are useful but do not assert handoff snapshot/absence | Add stored/absent snapshot and definition-mutation restore scenarios. |
| `tests/integration/app-data-migrations/team-run-metadata-member-tree-history.integration.test.ts` | Older supported metadata transformations | AC-017 | Out Of Scope except regression | It governs an earlier migration, not the new version-agnostic optional field | Rerun; do not add a new migration or compatibility branch. |
| `tests/unit/agent-tools/task-delegation/task-delegation-autobyteus-context.test.ts`, task runtime-description/parser tests | Native task context and old public selector | AC-018, AC-022 | Replace / Needs Update | Constructs representative/flat targets and `{target:{kind,name}}` | Replace with caller addressing, `recipient_name`, strict legacy rejection, and shared error-code semantics. |
| `tests/unit/agent-team-execution/task-delegation-service.test.ts` | Task Agent/Team activation/result/review/settlement | AC-018, AC-022 | Needs Update | Lifecycle assertions remain valid; inputs use removed selector/flat resolver | Update to placement/recipient contract and retain full lifecycle proof; assert rejections before task ID/ledger activation. |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Durable complete task lifecycle | AC-018, AC-022; DS-009–DS-011 | Replace stale setup, retain lifecycle purpose | Imports removed path stripper, constructs representatives and old selector | Rewrite harness to canonical localizer/addressing; cover direct Agent/Team, three-level ingress, persistent/restored/task callers, submit/review/settlement, and rejection/cleanup. |
| `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | GraphQL-created mixed Team plus task execution | AC-018, AC-022 | Needs Update | Public runtime boundary is valuable; calls use `{kind,name}` | Convert to `recipient_name`; add equivalent relative/absolute direct targets and task-specific non-direct/legacy rejections. |
| `tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Root Team runtime/default coordinator/message events | AC-006, AC-008, AC-020 | Still Valid, needs expansion | Correct in-process runtime boundary | Retain root ingress; add hierarchical direct/Team delivery and real participant assertions if not better placed in nested suite. |
| `tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Nested live Team create/restore and messaging | AC-006–AC-011, AC-014, AC-018 | Needs Update | Uses obsolete bare recipient names and coordinator-only parent flow | Rewrite addresses and expected events; extend cross-branch/non-coordinator/snapshot restore coverage. |
| `tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | AutoByteus/Codex/Claude configured send contract | AC-019 | Needs Update | Correct cross-runtime matrix but current expected selector/result predates hierarchical envelopes | Update canonical addresses/envelopes and add get-handoff tool names/typed rejection parity without external LLM dependency. |
| `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`, `claude-team-inter-agent-roundtrip.e2e.test.ts` | Real provider Team round trips | AC-019 | Needs Update but not required for deterministic pass | Live tests contain bare names and message-text assumptions; require external capabilities | Update stale durable inputs/assertions so they are valid when configured; report actual skip/unavailable status separately. |
| `tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts`, `tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Exact-run delivery/codes | AC-015, AC-019 | Still Valid, needs envelope assertion | Routing owner unchanged | Retain; add code-preserving public provider assertions. |
| `tests/integration/api/team-communication-api.integration.test.ts` and E2E helper | Communication projection API | AC-006–AC-011, AC-015 | Still Valid, needs changed-event fixtures | Projection API is unchanged but accepted participants no longer use representatives | Update fixtures only where obsolete; add actual-address/no-event checks near runtime boundary. |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts`, `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Runtime context construction | AC-013, AC-019 | Needs Update | Explicit `allowedRecipientNames`/recipient descriptors are removed | Replace with address/collaboration context assertions. |
| `tests/e2e/external-channel/external-channel-team-open-delivery.e2e.test.ts` | External channel Team member selection | Preserved external channel behavior | Needs Update only if changed internal intent type reaches it | A bare `recipientName` currently appears in an internal intent fixture, not necessarily the public Agent tool | Validate against production path; update to canonical logical address if it reaches shared Team delivery. |
| Unrelated server test suites | Broad regression | Preserved behavior | Still Valid | No approved behavior change | Run broader affected and full suite after focused coverage is valid. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `member-team-context-builder.test.ts` flat roster cases | `communicationRecipients`, `allowedRecipientNames`, `subteam_representative`, coordinator-only `parent_boundary_agent` | R-010/R-025 remove the parallel authority and synthetic reachability | Requirements BEH-003/BEH-006; design removal plan | Addressing/collaboration context and root-wide reachability cases | N/A |
| `inter-agent-message-delivery.test.ts` represented-subteam invariants | Synthetic `representedSubTeam` participant/prefix rules | R-016 requires actual source/final Agent identity | AC-007–AC-011; design DS-007 | Root-canonical real participant/event cases | N/A |
| Task context/parser/lifecycle tests using `{target:{kind,name}}` | Caller supplies kind and flat target name | R-027 cleanly removes the selector | AC-022; SR-004 | Required `recipient_name`, inferred kind, same placement, and explicit eligibility rejection | N/A |
| Provider tests expecting message-only text or `Error:` | Adapters discard codes and omit structured envelope | R-021/R-026 require canonical fields and exact code preservation | AC-019; SR-002 | JSON/envelope parity and rejection-only error tests | N/A |
| Bare-name nested/provider E2E inputs | `recipient_name: "review_lead"`, `"specialist"`, etc. | R-007/R-010 require `/...` or `./...` with no fallback | AC-010 | Canonical relative/absolute address cases plus explicit bare-name rejection | N/A |
| Tests that expect new writers to omit empty `handoffs` | Empty field absent after write | New canonical writes include arrays; omission is read-only direct-use behavior | R-001/R-020; AC-016/AC-017 | Separate absent-field read and canonical empty write assertions | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-DEF-001 | Definition source/GraphQL handoff roundtrip, order, clear, typed invalid update with state preserved | AC-001–AC-004, AC-016; CR-F-001 resolution | Existing definition unit/E2E files; add focused tests only if current seams cannot express it | Public persisted contract and atomic rejection are critical. |
| API-COMP-001 | Nested child handoff rebase/parent composition/duplicate launch rejection | AC-005; DS-002/DS-008 | Topology planner/compiler unit tests and TeamRun integration | Launch compilation is the only run snapshot authority. |
| API-ADDR-001 | Same shared Agent/Team placements for absolute/relative/root paths; duplicate leaves; exact Team ingress; forbidden fields/immutability | AC-006–AC-009, AC-022; DS-009 | New or existing placement-resolver unit suite | Direct proof of the common identity seam is missing. |
| E2E-MSG-001 | Nested/upward/cross-branch/non-coordinator delivery exactly once with actual participants | AC-006–AC-011 | Nested mixed runtime E2E/integration | Root forwarding and event identity require multi-boundary proof. |
| E2E-MSG-002 | Malformed/missing/traversal/self rejection produces typed code, no recipient input, no accepted event | AC-010; R-026 | Mixed manager/runtime tests | Fail-closed side-effect absence is critical. |
| API-HANDOFF-001 | Sender-only, ordered, empty, and no-context `get_handoff_rules` through native and MCP | AC-012, AC-019 | Communication wrapper/MCP integration tests | New public capability has no existing durable coverage. |
| API-PROMPT-001 | Address/team/tool protocol, no full rule set/roster, configured tool parity | AC-013, AC-019 | Instruction/exposure/materializer tests | Prevents provider-visible contract drift. |
| E2E-SNAP-001 | Launch -> communicate -> terminate -> definition mutation -> restore -> original rules/address -> communicate | AC-014 | TeamRun/nested runtime lifecycle integration/E2E | Static historical snapshot is a critical acceptance criterion. |
| API-EXACT-001 | Accepted/rejected exact-run routing, events, and unchanged codes in native/MCP envelopes | AC-015, AC-019 | Existing router and provider adapter tests | Routing is preserved but public projection changed. |
| API-DATA-001 | Missing definition/run handoffs reads empty; new writes canonical; no migration/definition recompilation | AC-016, AC-017 | Provider/metadata tests | Required direct-use decision must be proven. |
| E2E-TASK-001 | Direct Agent/Team relative/absolute placement, three-level ingress, full submit/review/settlement | AC-018, AC-022 | Task lifecycle integration + mixed task E2E | Shared resolution must not regress task ownership/lifecycle. |
| E2E-TASK-002 | Self/non-direct/cross-branch/malformed/old selector rejected before task ID/ledger/activation | AC-022 | Task mapper/service/integration tests | Clean-cut and side-effect ordering are critical. |
| E2E-DIR-001 | Persistent child create/restore binds active service; dispose/termination detaches with no stale resolution | Implementation handoff risk; AC-018/AC-022 lifecycle support | Focused active-directory/factory integration test | New lifecycle owner has no durable coverage and can misroute tasks. |
| API-PROV-001 | AutoByteus/Codex/Claude configured names and equal accepted/rejected envelope values | AC-019 | All-runtime matrix plus MCP materializer/provider tests | Adapter-level proof satisfies the acceptance criterion deterministically. |
| E2E-INGRESS-001 | User post without target reaches root coordinator | AC-020 | Existing mixed Team runtime E2E | Preserved critical ingress should be rerun. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| UPD-CTX-001 | Member context/instruction tests | Replace flat fields/roster prose with address/collaboration context and shared selector guidance | AC-012, AC-013, AC-022 | Remove obsolete imports/assertions rather than aliasing them. |
| UPD-MSG-001 | Delivery/mixed manager/subteam/runtime tests | Canonical paths, actual participants, Team ingress, root forwarding, typed rejections | AC-006–AC-011 | Retain exact-once lifecycle evidence. |
| UPD-TASK-001 | Task context/parser/service/integration/E2E tests | `recipient_name`, shared placement, direct eligibility, exact local ingress, lifecycle | AC-018, AC-022 | No `{kind,name}` compatibility input. |
| UPD-PROV-001 | AutoByteus/MCP/Codex/Claude exposure and runtime tests | Canonical envelope/code/structured content and get-handoff tool | AC-012, AC-015, AC-019 | Live suites must be valid when configured even if not required for deterministic pass. |
| UPD-PERSIST-001 | Definition/metadata/history tests | Present/absent canonical handoff arrays and immutable restore | AC-001–AC-005, AC-014, AC-016, AC-017 | No migration-specific branch/test. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Individual flat-roster, synthetic representative, old selector, and message-only result cases within the files above | Assertions protect behavior explicitly removed by R-010, R-016, R-021, R-027 | AC-010, AC-019, AC-022; design removal and compatibility rejection logs | Replace with current-boundary scenarios; no whole-file deletion is planned unless a file's only subject was removed. |

## Coverage Decision Outcomes

- Initial validity decisions were executed without requirement/design reroute.
- `42` existing durable test files classified `Needs Update`, `Replace`, or “still valid, needs expansion” were updated in place; valid mechanics were retained while obsolete assertions were replaced.
- `6` focused durable test files were added for active-child lifecycle, shared task mapping, canonical placement, delivery coordination, recursive localization, and `get_handoff_rules`.
- `0` durable test files were removed. Obsolete flat-roster, representative, old task selector, bare-name, and message-only result cases were removed within their owning files and replaced by current-contract scenarios.
- Live Codex/Claude runtime files were updated so their durable inputs/assertions are current when capabilities exist. They collected successfully and skipped through the project capability gates in this environment; no skip is counted as a pass.
- The actual native tool and Agent Tools MCP materializer/provider boundary passed accepted/rejected canonical text, structured content, exact code, and `isError` parity, so external model execution is not required for AC-019.
- CRR-003 passed all proportional durable test-code checks. API-REV-002 changes no coverage decision or executable artifact; it corrects the API-REV-001 approved lineage from nonexistent IDs to `SR-005; ARCH-REV-004; IR-002; CRR-002` and reissues the same Pass / 97.0% result after bounded verification.
- Authoritative exhaustive path/change inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-execution-coverage-report.md`, “Tests Implemented Or Updated”.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused 14-file pre-edit baseline | `autobyteus-server-ts`; `.env.test`/Prisma | Existing-coverage validity | Baseline fail: 10 failed/4 passed files; 43 failed/33 passed tests. Failures were dominated by approved removed contracts. | `api-e2e-evidence/focused-baseline-20260803.log` |
| 2 | Whole-server pre-edit baseline, `pnpm exec vitest run --no-watch` | Same | Broad classification | Baseline fail: 51 failed/489 passed/32 skipped files; 140 failed/2719 passed/110 skipped tests; 4 errors. This mixed ticket-stale coverage with unrelated pre-existing order/environment/global-state failures. | `api-e2e-evidence/full-baseline-after-focused-20260803.log` |
| 3 | `pnpm exec vitest run --no-watch <40 changed non-E2E files>` | Same | All updated/added unit and integration seams | Pass: 40/40 files, 251/251 tests. | `api-e2e-evidence/changed-unit-integration-final.log` |
| 4 | `pnpm exec vitest run --no-watch <8 changed E2E files>` | Same | Public definition API plus current live-suite collection | Pass: definition GraphQL 6/6; 20 live-provider scenarios declared capability-gated skips. | `api-e2e-evidence/changed-e2e-final.log` |
| 5 | `pnpm exec vitest run --no-watch tests/unit/agent-team-execution tests/unit/agent-tools/team-communication tests/unit/agent-tools/task-delegation tests/integration/agent-team-execution tests/integration/api/runtime-selection-top-level.integration.test.ts` | Same | Broader affected regression | Pass: 53/53 files, 229/229 tests. | `api-e2e-evidence/affected-broad-final.log` |
| 6 | Runtime-selection integration plus `team-run.test.ts` | Same | Root default coordinator ingress, top-level create/restore | Pass: 2/2 files, 10/10 tests. | `api-e2e-evidence/ingress-final.log` |
| 7 | `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` | Server | Production compilation | Pass. | `api-e2e-evidence/production-typecheck-final.log` |
| 8 | `pnpm run build:full` | Server | Production build/assets/sanitized bootstrap | Pass. | `api-e2e-evidence/build-full-final.log` |
| 9 | `pnpm test:e2e` | Worktree root | Full deterministic E2E regression / selected broader validation | Pass: 51 passed/14 skipped files; 178 passed/49 capability-gated skipped tests. | `api-e2e-evidence/repository-e2e-final.log` |
| 10 | `git diff --check`; static selector/authority audits | Worktree root | Hygiene and clean-cut test authority | Pass. No stale runtime bare/old selectors; remaining removed-field terms are explicit negative assertions. | `api-e2e-evidence/diff-check-final.log`; `api-e2e-evidence/legacy-test-authority-audit-final.log` |
| 11 | Exact upstream-lineage/artifact/path checks, `git diff --check`, and before/after SHA-256 manifest comparison for the 48 reviewed tests | Worktree root; API-REV-002 reporting-only reissue | TR-F-001 resolution without executable drift | Pass: corrected IDs match, invalid IDs are absent, referenced paths exist, and test manifest is unchanged. | `api-e2e-evidence/lineage-reissue-final.log` |

The pre-edit whole-server baseline is retained and classified rather than hidden. It is not the final ticket result. Final proof is the all-changed suite, broader affected suite, full deterministic E2E suite, and production build/typecheck, all of which passed.

## Post-Repository Confidence Scorecard (Mandatory)

These scores reflect the completed changed and broader affected repository checks before the selected full deterministic E2E broader-validation run. The execution coverage report records the final post-broader scores.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Improved / Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Every critical AC has a passing durable scenario across definitions, placement, delivery, handoffs, snapshot, exact-run, task lifecycle, providers, and ingress | Full deterministic E2E not yet included in this score | Completed `pnpm test:e2e` |
| Changed-boundary execution directness | 97% | Direct compiler/resolver/localizer/mapper, native tool, actual MCP projection, GraphQL, TeamRun, and task seams passed | External model process not executed | Not required for changed deterministic authority |
| Cross-boundary integration realism and mock gap | 94% | Top-level GraphQL/WebSocket, SQLite, create/restore, task lifecycle, and event boundaries passed | Live external Codex/Claude model processes capability-gated | Full deterministic E2E completed; adapter boundary already direct |
| Environment, configuration, identity, and fixture fidelity | 95% | Project `.env.test`, Prisma migrations, in-process app, and canonical Agent/Team/task identities used | No external credentials | Full deterministic E2E completed in same project environment |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Typed syntax/topology/self failures, atomic invalid update, no-event paths, definition-mutation restore, task revision/settlement, child cleanup | None material before full E2E | Full deterministic E2E completed |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/browser/desktop source or behavior changed | None in scope | N/A |
| Durable regression coverage quality and relevance | 95% | Forty-eight narrow requirement-linked files; obsolete assertions replaced and every changed test passed | Proportional test-code review pending | `code_reviewer` is next gate |

- Overall post-repository confidence: `95.7%`
- Calculation method: Arithmetic mean of six applicable categories; browser/desktop excluded as genuinely inapplicable.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: bounded external-provider process/bootstrap drift; direct deterministic native/MCP projection already proves the accepted/rejected contract.

## Broader Validation Decision (Mandatory)

- Decision: `Required — Completed`
- Selected execution mode: Deterministic Live API/Lifecycle through the project-owned in-process GraphQL, WebSocket, TeamRun, task, persistence, and full E2E harnesses; external real-provider LLM invocation was not selected.
- Specific confidence gap addressed: Cross-boundary persistence, create/terminate/restore, root coordinator ingress, task result/review/revision/settlement, cleanup, and full deterministic E2E regression.
- Why it materially improved confidence: The selected mode exercised real server composition and project configuration beyond isolated seams, raising final overall confidence to `97.0%`.
- Browser decision: `Not selected`; no UI/browser boundary changed.
- Evidence: `api-e2e-evidence/repository-e2e-final.log` (51 passed/14 skipped files; 178 passed/49 declared capability-gated skipped tests), plus `ingress-final.log` and `changed-e2e-final.log`.
- Blocked dependencies: `None`. External provider capability absence is a truthful skip, not a blocker, because the actual deterministic adapter boundary passed and AC-019 permits it.

## Desktop Application Validation Decision (When Applicable)

Not applicable. This change affects server-side definition, Team runtime, tools, transport projection, and persistence only; no Electron shell or renderer behavior is in scope.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Executed startup order: Vitest/Prisma global setup and migrations -> test-local app/runtime helpers -> unique definitions/TeamRuns/MCP/task fixtures -> scenario execution -> hooks/finalizers.
- Environment: `.env.test`, test-owned SQLite and temporary roots; no development/user database or real-provider secrets.
- Readiness: Application builders and WebSocket connected messages completed; `pnpm test:e2e` exited with no failures.
- Fixtures/identities: Minimal nested/root Team definitions, canonical paths, stored/missing handoffs, Agent/Team task identities, MCP sessions, and restored runtime metadata.
- Captured evidence: GraphQL results/errors, tool envelopes/structured content, recorded Agent inputs, Team events, metadata/config objects, task states, directory bindings, and command logs.
- Cleanup: Test hooks closed apps/sockets/sessions/runs and removed temporary state. Two accidental empty-argument whole-suite process trees owned by this run were terminated explicitly; no worktree Vitest/pnpm processes remain.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Result / Cleanup |
| --- | --- | --- | --- |
| TMP-AUDIT-001 | Static legacy-selector/removed-authority `rg` audit | No stale runtime bare/old target inputs; remaining removed fields are negative assertions only | Pass; `api-e2e-evidence/legacy-test-authority-audit-final.log`; no resources |
| TMP-DIFF-001 | `git diff --check` and exact changed-test inventory | Diff hygiene and 42 updated + 6 added + 0 removed durable files | Pass; `api-e2e-evidence/diff-check-final.log` |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| External LLM judgment of rule applicability | Explicitly out of scope; rules are opaque guidance | None for framework contract | None |
| Live external Codex/Claude model orchestration | Capability-gated and nondeterministic; AC-019 accepts adapter-level proof, which passed at the actual native/MCP projection boundary | Bounded provider-process/bootstrap drift | Keep updated live tests valid; do not count skips as passes |
| Browser/desktop UI | No affected surface | None | None |
| Cross-process/distributed Team messaging | Explicitly out of scope | None for Ticket 1 | Future ticket only |
| AC-021 documentation sync | Delivery-owned acceptance criterion | None for API/E2E result | `delivery_engineer` after proportional test review |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| `TR-F-001` — API-REV-001 cited nonexistent `SRR-003` / `ARR-003` identifiers | `Local Fix` / API/E2E reporting | CRR-003; corrected to approved `SR-005` / `ARCH-REV-004`, with unchanged executable manifest | `code_reviewer` bounded resolution verification |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`
- Repository-Resident Durable Coverage Added / Updated / Removed: `API-REV-002: No changes; cumulative API-REV-001 scope remains 6 added, 42 updated, 0 removed`
- Post-repository confidence: `95.7%`
- Broader validation decision: `Required — completed through deterministic Live API/Lifecycle and full repository E2E`
- Final confidence (authoritative execution report): `97.0%`
- Reroute Required Before/During Validation: `Yes — CRR-003 TR-F-001 reporting-only Local Fix; resolved in API-REV-002`
- Current result: `Pass`
- Recommended recipient: `code_reviewer` for bounded verification of TR-F-001 resolution. All 48 durable test files already passed proportional review.
- Notes: API-REV-002 changes no test, fixture, source, scenario result, or confidence score. The canonical execution report contains the exhaustive absolute path inventory and reissue evidence. Live external-provider skips remain reported truthfully and are not counted as passes.
