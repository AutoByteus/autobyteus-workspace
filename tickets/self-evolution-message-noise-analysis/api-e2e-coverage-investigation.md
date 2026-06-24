# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolution-message-noise-analysis/tickets/self-evolution-message-noise-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review handoff requested API/E2E coverage investigation and execution for the review-passed self-evolution prompt/static-guidance cleanup.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed implementation must prove these current behaviors:

- Manual self-evolution sends the Skill Self-Evolver a concise runtime task packet with dynamic work-trace paths, editable skill roots, bounded package tree, target AgentRun id, and `skill_update` message type.
- The runtime task packet must not carry the old `Rules:` section, raw trace pattern warnings, semantic-completeness/backend-protocol rationale, or `Primary guidance file` wording.
- `SKILL.md` must be represented as the package entry file, while supporting files inside the editable skill root remain visible through a bounded relative package tree.
- The Skill Self-Evolver built-in app-data package must include and configure the agent-private `retrospective-skill-coach` skill, and normal configured private-skill resolution must be able to load it from the bootstrapped app-data agent directory.
- Built-in template `skills/` mirroring must remove stale product-managed private skills when a template omits or replaces them, while leaving standalone local agents and user package roots untouched.
- Existing direct-message grant enforcement remains code-owned and unchanged: final `skill_update` delivery is constrained by exact target id, message type, allowed reference roots, one accepted delivery, expiry, and target liveness.
- The implementation handoff's Legacy / Compatibility Removal Check is clean: no old prompt branch, compatibility flag, dual prompt format, or retained legacy runtime wording was introduced. Code review confirmed the same, with only internal `self_evolution_primary_skill_paths` metadata retained as non-user-facing compatibility metadata alongside entry metadata.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Runtime self-evolution companion prompt | Changed / Removed old content | REQ-001 through REQ-005, AC-001 through AC-005; implementation handoff “concise dynamic task packet” | Existing prompt assertions remain valid but need one integrated delivery scenario through `postSelfImproveRequest`, not only direct builder construction. |
| Editable skill package tree | Added | REQ-005, REQ-006, AC-003; implementation handoff renderer caps and exclusions | Retain new renderer unit tests and execute a realistic-root probe/test path. |
| Thin Skill Self-Evolver + private `retrospective-skill-coach` | Added / Changed | REQ-007 through REQ-014, AC-006 through AC-010 | Retain template/config checks; add/execute coverage proving bootstrapped app-data agent configured-skill resolution loads the private skill. |
| Built-in bootstrap `skills/` mirror | Changed | REQ-015, AC-011, AC-012; implementation handoff stale removal | Existing bootstrap tests are current; add the private-skill resolution assertion to close the startup/loading boundary. |
| Direct-message grant constraints | Preserved | REQ-016, AC-014; code review notes grant enforcement unchanged | Existing router grant tests are still valid and should be executed; no durable coverage update needed. |
| Work trace projection/storage rationale | Preserved | Out-of-scope list and docs; runtime prompt should only list work trace paths | Existing work-trace projection tests remain valid; final prompt tests must assert no inline work trace bodies. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` existing lifecycle scenarios | Companion session create/reuse/restore/replacement state | Companion lifecycle remains in scope and async builder wiring must not regress it | Still Valid | Read test and source; code review passed it | Retain and execute. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` prompt builder scenario | Concise path-only trigger with package tree, metadata, forbidden runtime phrases | REQ-001 through REQ-006, AC-001 through AC-005, AC-013 | Needs Update | The direct builder scenario is valid but does not exercise actual `postSelfImproveRequest` registration/posting/subscription path | Add `APIE2E-COV-001` integrated prompt-delivery scenario in the same file. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | `SelfEvolutionService.startFromEvolutionRequest` orchestration: active target check, projection before trigger, companion reuse, record lifecycle | Manual self-evolution start flow and work-trace freshness | Still Valid | Test uses service-level fakes and covers orchestration order; changed prompt text is downstream of this boundary | Retain and execute as part of self-evolution suite. |
| `autobyteus-server-ts/tests/unit/self-evolution-skill-package-tree-renderer.test.ts` | Relative tree, `SKILL.md [entry]`, exclusions, symlink skip, caps/omissions | REQ-005, REQ-006, AC-003, AC-013 | Still Valid | New focused renderer coverage maps directly to requirements | Retain and execute. |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` existing sync/stale/user-root scenarios | Built-ins are synced into app data; stale built-in files/private skills are removed; standalone local agents and user package roots are preserved | REQ-014, REQ-015, AC-010 through AC-012 | Needs Update | Existing assertions prove file/config sync but not that normal configured private-skill resolution loads the bootstrapped app-data `retrospective-skill-coach` | Add `APIE2E-COV-002` assertion in the startup sync scenario that `SkillService.resolveConfiguredSkillsForAgent` loads the private skill from the bootstrapped app-data agent directory. |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` configured private skill scenarios | Agent-private and team-shared configured skill resolution, app-data bundled skill discovery, global fallback, safety guards | Agent-private skill resolution reused by design | Still Valid | Existing tests validate resolver semantics generically | Execute focused file or rely on focused built-in assertion plus e2e; no update needed. |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | GraphQL package import plus Codex/AutoByteus runtime materialization of configured private skills | Runtime loading/materialization of agent-private skill packages | Still Valid | Existing e2e does not target the built-in template specifically but still proves the runtime private-skill path used after bootstrap | Execute final focused e2e. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` grant scenario | Wrong target/message/reference rejected; correct `skill_update` accepted once; exhausted grant rejected; inactive target recorded | REQ-016, AC-014 | Still Valid | Direct-message grant implementation unchanged and existing test maps exactly to preserved contract | Execute final focused test. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Work trace projection from raw traces into readable work traces | Work-trace evidence package remains path-listed and content is not in prompt | Still Valid | Projection behavior was not changed but is an upstream boundary for manual self-evolution evidence | Execute as part of self-evolution suite. |
| Runtime/team e2e tests containing `Rules:` fixtures under `tests/e2e/runtime/*` | Generic inter-agent/team communication prompt fixtures unrelated to self-evolution trigger text | Not related to self-evolution prompt contract | Out Of Scope | `rg` hits are non-self-evolution fixture text | Do not update. |
| Raw trace migration/memory tests containing `raw_traces` | Raw trace storage/migration/memory synchronization | Explicitly out of scope for prompt cleanup | Out Of Scope | Requirements preserve raw trace storage format | Do not update. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale current-scope durable coverage identified. The old prompt assertions have already been updated by implementation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-COV-001 | `SelfEvolutionCompanionSessionService.postSelfImproveRequest` registers the self-evolution grant, builds the async concise task packet, posts it to the active companion run, and observes completion without reintroducing old prompt wording | REQ-001 through REQ-006, REQ-016, AC-001 through AC-005, AC-013, AC-014; implementation handoff coverage hint “realistic manual self-evolution prompt delivery” | Update `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Direct builder construction is useful but insufficient for the integrated manual-companion request boundary after `build()` became async and package-tree-aware. |
| APIE2E-COV-002 | Bootstrapped product-managed Skill Self-Evolver app-data agent resolves and loads configured agent-private `retrospective-skill-coach` through normal `SkillService.resolveConfiguredSkillsForAgent` | REQ-014, REQ-015, AC-010, AC-011; implementation handoff coverage hint “app-data built-in private skill resolution/loading at startup” | Update `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Existing sync tests prove files and config exist; this assertion closes the startup-to-normal-resolution boundary and catches broken sourceInfo/config/root interactions. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-COV-001 | `tests/self-evolution/self-evolution-companion-session-service.test.ts` | Add an integrated delivery test around `postSelfImproveRequest`; no existing assertions removed. | Prompt contract and grant registration/preserved constraints | Repository-resident durable test update; will require return to `code_reviewer`. |
| APIE2E-COV-002 | `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Add configured private-skill resolution assertion after bootstrap; no existing assertions removed. | Built-in private skill sync/config/loading | Repository-resident durable test update; will require return to `code_reviewer`. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale coverage found that should be removed in this round. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Focused final command execution of self-evolution, bootstrap, grant-router, and private-skill e2e suites in the local repository environment | Confirms the current durable coverage passes together after the coverage additions | Command evidence belongs in the execution report; no extra probe artifact needed. |
| TEMP-002 | Build/source-typecheck and built-in bootstrap smoke check through `pnpm -C autobyteus-server-ts build` | Confirms source compiles and runtime bootstrap smoke still works with private skill template files | This is executable validation, not a new durable test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full LLM-driven self-evolver run that edits a real skill from real traces | Would require live model/tool execution and subjective output evaluation; current repository coverage can prove the backend prompt/grant/bootstrap boundaries without consuming external LLM execution | Low for this cleanup because changed backend contracts are deterministic and covered at service/runtime-loading boundaries | None for this ticket; future product-level self-evolution acceptance can add live-run harnesses if needed. |
| Active target worker live-reload of updated skills | Explicitly out of scope / next-run-only limitation | None for this task | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement gap, design impact, unclear behavior, compatibility wrapper, dual prompt path, or implementation local fix identified during investigation. | N/A |

## Execution Plan

1. Add the two narrow repository-resident durable coverage updates recorded above.
2. Execute focused final validation:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution/self-evolution-companion-session-service.test.ts tests/self-evolution/self-evolution-service.integration.test.ts tests/self-evolution/self-evolution-work-trace-projection-service.test.ts tests/unit/self-evolution-skill-package-tree-renderer.test.ts tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-communication/global-agent-run-message-router.test.ts tests/unit/skills/services/skill-service.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
   - `pnpm -C autobyteus-server-ts build`
   - `git diff --check`
   - Optionally re-run `pnpm -C autobyteus-server-ts typecheck` to confirm the known existing TS6059 config failure remains non-implementation-specific.
3. Write the canonical execution coverage report with scenario IDs, command evidence, changed durable coverage paths, and compatibility/legacy check.
4. Because repository-resident durable coverage will be updated after code review, route the cumulative package back to `code_reviewer` for narrow coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage investigation found no stale tests or compatibility/legacy reroute. Two narrow durable coverage additions are required to close realistic prompt-delivery and app-data built-in private-skill loading gaps.
