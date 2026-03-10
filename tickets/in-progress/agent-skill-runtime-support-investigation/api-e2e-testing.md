# API/E2E Testing

## Testing Scope

- Ticket: `agent-skill-runtime-support-investigation`
- Scope classification: `Medium`
- Workflow state source: `tickets/in-progress/agent-skill-runtime-support-investigation/workflow-state.md`
- Requirements source: `tickets/in-progress/agent-skill-runtime-support-investigation/requirements.md`
- Call stack source: `tickets/in-progress/agent-skill-runtime-support-investigation/future-state-runtime-call-stack.md`
- Design source: `tickets/in-progress/agent-skill-runtime-support-investigation/implementation-plan.md`

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | Shared runtime bootstrap resolves configured skills and effective access mode. | `S7-001`, `S7-004` | Passed | 2026-03-10 |
| `AC-002` | `R-002` | Codex workspace skill materialization occurs when enabled. | `S7-002`, `S7-007` | Passed | 2026-03-10 |
| `AC-003` | `R-003` | Claude turn construction carries configured skill instructions with root-path guidance when enabled. | `S7-003` | Passed | 2026-03-10 |
| `AC-004` | `R-004` | Missing skills are skipped and disabled modes suppress exposure without failing startup. | `S7-004` | Passed | 2026-03-10 |
| `AC-005` | `R-005` | Regression coverage proves shared bootstrap plus Codex and Claude runtime wiring, including live provider-backed proof for the supported Codex contract. | `S7-005`, `S7-006`, `S7-007`, `S7-008` | Passed | 2026-03-10 |
| `AC-006` | `R-006` | Codex client reuse is isolated by canonical `cwd`. | `S7-009` | Passed | 2026-03-10 |

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Objective/Risk | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `S7-001` | Requirement | `AC-001` | `R-001` | `UC-001` | API | Verify shared runtime bootstrap is consumed by both runtime adapters. | Create/restore flows receive configured skills and effective skill access mode from the shared runtime context. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/configured-runtime-skills.test.ts tests/unit/runtime-execution/single-agent-runtime-context.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts --no-watch` | Passed |
| `S7-002` | Requirement | `AC-002` | `R-002` | `UC-002` | API | Verify Codex session bootstrap materializes agent-configured skills into workspace `.codex/skills` bundles when exposure is enabled. | Codex runtime mirrors selected skills into workspace-local `.codex/skills` bundles with usable `SKILL.md` and `agents/openai.yaml`, refreshes owned leftovers from source contents, and suppresses materialization for `NONE`. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-workspace-skill-materializer.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/configured-runtime-skills.test.ts --no-watch` | Passed |
| `S7-003` | Requirement | `AC-003` | `R-003` | `UC-003` | API | Verify Claude turn construction exposes only the agent-configured skills. | Claude turn preamble includes a `<configured_skills>` block with skill content and root-path guidance when enabled. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts --no-watch` | Passed |
| `S7-004` | Requirement | `AC-001`, `AC-004` | `R-001`, `R-004` | `UC-001`, `UC-004` | API | Verify suppression and missing-skill tolerance. | `NONE` suppresses skill exposure and unresolved skill names are skipped without startup failure. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/configured-runtime-skills.test.ts tests/unit/runtime-execution/single-agent-runtime-context.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts --no-watch` | Passed |
| `S7-005` | Requirement | `AC-005` | `R-005` | `UC-004` | API | Verify full runtime-skill regression slice after the Codex contract shift. | Shared bootstrap, Codex wiring, Claude wiring, updated Codex workspace-materialization coverage, and runtime-reference persistence pass together in the mapped suite. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/configured-runtime-skills.test.ts tests/unit/runtime-execution/single-agent-runtime-context.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/codex-app-server/codex-workspace-skill-materializer.test.ts tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/run-history/run-continuation-service.test.ts --no-watch` | Passed |
| `S7-006` | Requirement | `AC-005` | `R-005` | `UC-003` | E2E | Verify live provider-backed configured-skill execution for Claude. | A Claude live run persists `PRELOADED_ONLY`, records configured skill names, and responds with the configured skill's exact response token. | `RUN_CLAUDE_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-runtime-configured-skills-graphql.e2e.test.ts --no-watch` | Passed |
| `S7-007` | Requirement | `AC-002`, `AC-005` | `R-002`, `R-005` | `UC-002` | E2E | Verify live provider-backed configured-skill execution for Codex using the repo-scoped workspace-skill contract. | A Codex live run materializes the configured workspace skill, records configured skill names, produces the configured skill response token, and cleans up the mirrored workspace bundle at shutdown. | `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-configured-skills-graphql.e2e.test.ts --no-watch` | Passed |
| `S7-008` | Design-Risk | `AC-005` | `R-005` | `UC-002` | E2E | Confirm that baseline Codex live projection remains healthy after the `cwd` hardening and before/after the new workspace-skill logic. | Existing non-skill Codex live projection test materializes a non-empty assistant conversation. | `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "returns non-empty run projection conversation for completed codex runs" --no-watch` | Passed |
| `S7-009` | Requirement | `AC-006` | `R-006` | `UC-005` | API | Verify canonical-`cwd` client reuse and release. | Same canonical `cwd` reuses one started client, different `cwd`s isolate, and last-holder release closes the client. | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-process-manager.test.ts tests/unit/runtime-execution/codex-app-server/codex-thread-history-reader.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts --no-watch` | Passed |

## Failure Escalation Log

- 2026-03-10: The first Claude live configured-skill E2E run exposed a real persistence bug: `manifestConfig.skillAccessMode` stayed `null` even though `runtimeReference.metadata.configuredSkillNames` was already present. This was fixed by persisting runtime-resolved `skillAccessMode` from runtime reference metadata in `run-continuation-service.ts`, then verified by `tests/unit/run-history/run-continuation-service.test.ts` and a passing rerun of `S7-006`.
- 2026-03-10: Codex live configured-skill E2E initially remained blocked by non-materialized thread history, and a direct raw `codex app-server` repro showed the same symptom. This later narrowed to a repository-side client-boundary issue plus a remaining Codex skill-delivery issue.
- 2026-03-10: After implementing canonical-`cwd` Codex client reuse and rerunning sequentially, `S7-008` now passes. This proved the earlier one-global-client boundary was part of the Codex live-provider failure.
- 2026-03-10: After that fix, `S7-007` still failed functionally: the run became active and idle cleanly, but the assistant replied with the plain prompt answer instead of the configured skill token. The original hint-based Codex design was therefore incomplete.
- 2026-03-10: Direct raw `codex app-server` probes then showed that explicit `$skill-name` text plus direct `skill` attachments is still insufficient; Codex returned the trigger text instead of following the custom skill.
- 2026-03-10: Raw `skills/list` probing showed that a custom skill is discovered when it is repo-scoped under `<workspace>/.codex/skills/<name>/` with `SKILL.md` and `agents/openai.yaml`. A matching raw turn probe then returned the expected skill response token. This proves the Codex-supported contract is workspace-local repo-skill discovery, not arbitrary external path attachment.
- 2026-03-10: AutoByteus now materializes agent-configured Codex skills into workspace `.codex/skills` bundles, removes the invalid turn-level hint/attachment path, and passes the live configured-skill Codex E2E.
- 2026-03-10: A final local robustness fix refreshed any leftover AutoByteus-owned mirrored skill bundle from the current source contents, and the Codex live configured-skill E2E was rerun successfully after that change.

## Feasibility And Risk Record

- Any infeasible scenarios: No
- Environment constraints: Claude live-provider execution is working. Codex live-provider execution is also healthy for the baseline projection scenario and configured-skill execution after the canonical-`cwd` client fix and workspace-skill materialization.
- Compensating automated evidence: shared runtime bootstrap tests pass, Claude live configured-skill proof passes, Codex live configured-skill proof passes, baseline Codex live projection proof passes, and targeted Codex materializer regression coverage includes leftover-bundle refresh behavior.
- Residual risk notes: live provider-backed proof now exists for both runtimes. Remaining risk is limited to future upstream runtime behavior drift rather than an uncovered repository-owned acceptance-criteria gap.
- User waiver for infeasible acceptance criteria recorded: No

## Stage 7 Gate Decision

- Stage 7 complete: Yes
- All in-scope acceptance criteria mapped to scenarios: Yes
- All executable in-scope acceptance criteria status = Passed: Yes
- Critical executable scenarios passed: Yes
- Any infeasible acceptance criteria: No
- Explicit user waiver recorded for infeasible acceptance criteria: No
- Unresolved escalation items: No
- Ready to enter Stage 8 code review: Yes
