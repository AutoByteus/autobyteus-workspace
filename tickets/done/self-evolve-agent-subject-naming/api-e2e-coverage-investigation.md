# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolve-agent-subject-naming/tickets/in-progress/self-evolve-agent-subject-naming/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and routed to `api_e2e_engineer` for required coverage investigation plus executable/API/E2E validation.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved change replaces generated Agent Work Trace evidence-subject labels from generic `worker` wording to the target agent display name. The shared projection boundary must receive `agentName`, normalize it by trimming/collapsing whitespace while preserving casing, fall back to `Agent` for blank names, render assistant/reasoning/tool/compaction entries as `<Agent Name>`, `<Agent Name> reasoning`, and `<Agent Name> tool call`, preserve `user:`, and keep file paths/names unchanged. Archive projection reuse must be sensitive to render context so unchanged archived raw trace segments are reused only when both raw source fingerprint and normalized render fingerprint match; old schema-1 derived manifests without `renderContext` are stale and must regenerate derived archive Markdown rather than retaining `worker` or an old label. Self-evolution companion task packets remain path-only but use target-agent wording, and built-in self-evolver guidance uses target-agent/future-agent/agent-message terminology while preserving legitimate runtime/background worker terminology. The implementation handoff's Legacy / Compatibility Removal Check reports no compatibility branch or retained old behavior, and code review passed with a residual risk that old schema-1 manifests lack a dedicated fixture test.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `AgentWorkTraceProjectionContext` carries target display identity as `agentName`. | Added | REQ-001, REQ-002; design migration step 1; implementation handoff "What Changed". | Validate through projection tests and self-evolution service flow that the full resolved context reaches projection. |
| Assistant, reasoning, tool, and compaction Markdown labels use normalized target agent display name; tools use `tool call`. | Changed | REQ-003 through REQ-008; AC-001 through AC-004, AC-006, AC-007. | Existing projection coverage remains the durable local boundary and is still required. |
| User message label remains `user:`. | Preserved | REQ-009; AC-005. | Existing projection assertion remains valid. |
| Work trace root, manifest, active/archive file names, raw-trace source reading, and path-only companion shape remain unchanged. | Preserved | REQ-012; AC-010, AC-011. | Existing projection and companion session coverage remains valid. |
| Archive reuse requires both raw source fingerprint and render-context fingerprint. | Changed | REQ-010, REQ-011; AC-008, AC-009; design cache examples; code-review residual risk. | Existing render-context changed/unchanged test is valid; add a schema-1/no-render-context fixture scenario because implementation relies on null render fingerprint to mark old manifests stale. |
| Runtime companion prompt says target agent instead of target worker. | Changed | REQ-016; AC-011. | Existing companion trigger test is valid. |
| Static built-in self-evolver guidance uses target-agent/future-agent/agent-message wording for retrospective evidence. | Changed | REQ-015; AC-012. | Static grep/document inspection plus build smoke coverage are sufficient; no API/E2E surface invokes static wording directly here. |
| Worker-labeled generated traces and compatibility/dual render modes are removed. | Removed | REQ-017; design Legacy Removal Policy; implementation handoff compatibility check. | Negative assertions and scoped grep are required; do not add compatibility coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / projects readable work trace files | Uses public projection service with raw trace records; asserts target-agent assistant/reasoning/tool-call/compaction labels, `user:` preservation, schema 2 manifest render context, hidden backend fields, unchanged paths. | REQ-003 through REQ-009, REQ-011, REQ-012, AC-001 through AC-005, AC-010, AC-013. | Still Valid | Inspected test: now expects `Implementation Engineer`, `Implementation Engineer reasoning`, `Implementation Engineer tool call`, compaction under agent label, no `worker` labels. | Retain and execute. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / whitespace normalization and blank fallback | Asserts `"  Code   Reviewer  "` renders `Code Reviewer` and blank names render `Agent`. | REQ-003, REQ-004, AC-006, AC-007. | Still Valid | Inspected test coverage uses public `ensureCurrent`. | Retain and execute. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / archived+active backfill and unchanged archive reuse on catch-up | Asserts archive and active files generated under unchanged file names, active regenerated, unchanged archive generatedAt reused. | REQ-010, REQ-012, AC-009, AC-010. | Still Valid | Inspected test coverage. | Retain and execute. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` / re-renders unchanged archive only when normalized render context changes | Asserts same normalized label reuses archive generatedAt; changed label regenerates archive content and summary hash. | REQ-010, REQ-011, AC-008, AC-009. | Needs Update | Valid for new schema-2 changed/unchanged render context. It does not explicitly seed an old schema-1/no-render-context manifest, which code review identifies as residual risk and design says must be treated stale. | Add a focused scenario in the same durable projection test file for an old schema-1 manifest with matching source fingerprint but no `renderContext`. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` / postSelfImproveRequest concise task packet | Asserts path-only companion post, work trace manifest/file paths, editable skill metadata, no raw trace or internal history leakage. | REQ-012, REQ-016, AC-011. | Still Valid | Inspected test; no target-worker wording in posted content. | Retain and execute. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` / build concise path-only trigger | Asserts prompt contains target-agent wording and does not contain `target worker`, `worker:\n`, raw traces, prior run ids, or backend protocol guidance. | REQ-016, AC-011, AC-013. | Still Valid | Inspected test; target-agent wording and negative checks are present. | Retain and execute. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` / executable direct-edit flow | Verifies self-evolution launch flow refreshes work traces before each companion trigger, records summary hash, handles stale targets and companion failures. | REQ-002, REQ-012; downstream hint to verify self-evolution still refreshes projection. | Still Valid | Inspected test; it stubs a schema-2 work trace package and uses target context containing `agentName`. | Retain and execute. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts` | Verifies GraphQL self-evolution boundary fields and disabled capability gate. | Public API boundary unchanged by this ticket except downstream execution remains enabled/disabled as before. | Still Valid | Inspected test; no generated work-trace subject assertions or target-worker wording. | Not required in focused final suite; out of direct changed behavior but remains valid. |
| `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts` | Verifies manual trigger request creation. | Trigger request shape unchanged. | Still Valid | Inspected test; no work trace label behavior. | Not required in focused final suite; out of direct changed behavior but remains valid. |
| Broad runtime/team/memory E2E files under `autobyteus-server-ts/tests/e2e/**` | Cover unrelated GraphQL/runtime/messaging/memory boundaries. | Out of scope: ticket does not change raw trace schemas, runtime worker loops, GraphQL APIs, or browser UI. | Out Of Scope | Inventory command listed E2E suite; no self-evolution work-trace API/E2E test exists, and changed boundary is local service/projection plus companion task packet. | Do not run broad E2E suite for this stage; use focused executable service checks. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None identified for removal in API/E2E investigation. | N/A | Code review confirms worker-centric projection assertions were already updated during implementation; remaining worker mentions in scoped grep are negative assertions or legitimate unrelated worker concepts. | REQ-017, AC-013, code review no findings. | N/A | No durable coverage removal is required. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| AWT-005 | Old schema-1 work trace manifests with matching archive source fingerprint but missing `renderContext` must be treated as stale and regenerate archived Markdown with the current target-agent label. | Design Legacy Removal Policy: no-render-context derived caches are stale; design migration step 3; implementation handoff known risk; code review residual risk; REQ-010, REQ-011, AC-008, REQ-017. | `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Prevents a regression where source-only archive reuse preserves stale `worker`/old-label Markdown from old derived manifests. This is durable projection-cache boundary coverage, not compatibility coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| AWT-005 | `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Add one focused test in the existing projection suite. | REQ-010, REQ-011, REQ-017; design schema-1/no-render-context stale-cache rule; code-review residual risk. | Repository-resident durable coverage will change after code review, so final pass must return to `code_reviewer` for coverage-code re-review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TPROBE-001 | Run focused `vitest` suites for projection, companion session, and self-evolution service integration. | Current durable coverage passes against the reviewed implementation plus added stale-cache fixture. | These are normal durable tests, not temporary scaffolding. |
| TPROBE-002 | Run `git grep` over scoped source/docs/templates/tests for obsolete target-worker/worker-label evidence wording. | No generated-evidence actor wording remains except negative tests or legitimate unrelated worker docs. | Static grep is an execution-stage evidence collection command, not a reusable test. |
| TPROBE-003 | Run `tsc -p tsconfig.build.json --noEmit` and `git diff --check`. | Type-level source contract and whitespace integrity remain valid. | Existing project commands; no temporary files. |
| TPROBE-004 | Run `pnpm -C autobyteus-server-ts build`. | Full build and built-in agents bootstrap smoke check pass with updated static guidance. | Existing project command; no temporary files. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full server/browser E2E from GraphQL mutation through a live companion LLM run. | This ticket changes projection/service/task-packet behavior; live LLM/runtime E2E would be slow, nondeterministic, and not necessary to prove label/cache policy. Existing service integration exercises the launch/companion boundary with deterministic fakes. | Low. Bugs in live runtime transport would not be specific to label rendering. | None. |
| Full `pnpm -C autobyteus-server-ts typecheck`. | Implementation and code review record pre-existing TS6059 `rootDir`/tests include failures unrelated to this change. | Low for changed source because `tsconfig.build.json --noEmit` passed and will be rerun. | None for this ticket; keep known pre-existing failure documented. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently. | N/A | Upstream requirements/design are explicit; implementation handoff compatibility check is clean; no compatibility wrapper or dual render mode found in inspected code. | N/A |

## Execution Plan

1. Add durable scenario AWT-005 to `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` for old schema-1/no-render-context archive-manifest stale regeneration.
2. Run focused projection + companion session tests: `pnpm -C autobyteus-server-ts test tests/agent-work-traces/agent-work-trace-projection-service.test.ts tests/self-evolution/self-evolution-companion-session-service.test.ts --run`.
3. Run self-evolution executable integration suite: `pnpm -C autobyteus-server-ts test tests/self-evolution/self-evolution-service.integration.test.ts --run`.
4. Run source build no-emit and whitespace checks: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`; `git diff --check`.
5. Run full build and built-in agents bootstrap smoke check: `pnpm -C autobyteus-server-ts build`.
6. Run scoped grep for obsolete evidence-actor wording: `git grep -n "target worker\|future worker\|worker message\|worker messages\|worker reasoning\|worker tool\|worker:\\n" autobyteus-server-ts/src/built-in-agents/templates/skill-evolver autobyteus-server-ts/docs autobyteus-server-ts/src/self-evolution autobyteus-server-ts/src/agent-work-traces autobyteus-server-ts/tests` and classify remaining hits.
7. Write the canonical execution coverage report. Because durable coverage is added after code review, route the cumulative package back to `code_reviewer` instead of delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Add a narrow stale-cache fixture test, then execute focused durable and executable checks. Coverage-code re-review is required before delivery because repository-resident durable coverage changes after the prior code review.
