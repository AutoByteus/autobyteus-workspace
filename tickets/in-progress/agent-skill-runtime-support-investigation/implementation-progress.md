# Implementation Progress

## Status

- Completed (implementation, mapped verification, code review, and docs sync are complete; the ticket is now awaiting user verification in Stage 10)

## Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/agent-skill-runtime-support-investigation/workflow-state.md`): Yes
- `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: Yes
- Scope classification confirmed (`Medium`): Yes
- Investigation notes current: Yes
- Requirements status is `Design-ready`: Yes
- Runtime review gate is `Go Confirmed`: Yes
- No unresolved blocking findings: Yes

## Progress Log

- 2026-03-10: Entered Stage 6 with shared runtime-skill wiring scope approved for Codex and Claude.
- 2026-03-10: Added shared runtime-context resolution and configured-skill rendering so agent `skillNames` resolve through `SkillService` before runtime launch.
- 2026-03-10: Wired Claude runtime create/restore/turn flows to persist configured skills and inject a `<configured_skills>` instruction block with skill root-path guidance.
- 2026-03-10: Added and passed targeted shared/Claude/Codex unit suites for runtime-context resolution, suppression behavior, and adapter wiring.
- 2026-03-10: Fixed `run-continuation-service.ts` so runtime-resolved `skillAccessMode` from runtime reference metadata persists into the manifest during send/continue lifecycle updates.
- 2026-03-10: Added live configured-skill GraphQL E2E coverage for Claude and Codex; Claude live configured-skill E2E passed.
- 2026-03-10: Reinvestigation and direct raw Codex probes isolated a separate repository issue: `CodexAppServerProcessManager` used one global client across different `cwd` values. Implemented canonical-`cwd` client reuse and release lifecycle; targeted Codex process-manager/runtime regression suites passed and the baseline live Codex projection scenario recovered.
- 2026-03-10: A later raw Codex probe invalidated the follow-up hint design: direct turn-level `skill` attachments plus `$skill-name` text still did not activate the custom skill.
- 2026-03-10: Raw `skills/list` and live-turn probes then showed the working Codex contract: custom skills execute when they are repo-scoped under `<workspace>/.codex/skills/<name>/` with `SKILL.md` and `agents/openai.yaml`.
- 2026-03-10: Reentered Stage 6 through a design-impact path. The next implementation slice is now Codex workspace-skill materialization, `agents/openai.yaml` preservation/synthesis, cleanup ownership, and removal of the invalid turn-level hint/attachment path.
- 2026-03-10: Implemented Codex workspace-skill materialization under workspace-local `.codex/skills/`, including ownership markers, conflict-safe directory aliases, `agents/openai.yaml` preservation/synthesis, and cleanup on session close.
- 2026-03-10: Removed the invalid Codex turn-level skill attachment and text-hint path so Codex turns now send plain user content after workspace skill discovery.
- 2026-03-10: Verified the refreshed runtime-skill regression slice with targeted unit suites, including Codex materializer coverage, runtime-reference persistence, Claude selected-skill prompt injection, and Codex `cwd`-scoped client reuse.
- 2026-03-10: Passed live provider-backed Codex configured-skill E2E, live provider-backed Claude configured-skill E2E, and the baseline Codex live projection regression scenario.
- 2026-03-10: During final review, identified and fixed one repository-owned robustness gap: leftover AutoByteus-owned mirrored workspace skills were being reused without refresh. The materializer now refreshes those bundles from source contents, and the Codex live configured-skill E2E was rerun successfully after the fix.

## Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-03-10 | `Medium` | `Medium` | Initial implementation kickoff baseline | None |
| 2026-03-10 | `Medium` | `Medium` | Stage 8 hard-limit prevention required splitting Codex session bootstrap into a new provider-owned support file | Local structural split only; no requirement or design-basis rewrite required |
| 2026-03-10 | `Medium` | `Medium` | Stage 7 proof bar was raised to require provider-backed configured-skill E2E for both runtimes | Local verification fix only; reopen Stage 6/7 without design changes |
| 2026-03-10 | `Medium` | `Medium` | Reinvestigation identified one-global-client Codex reuse across different workspace paths | Refresh requirements/design/call-stack/review artifacts, then implement canonical-`cwd` client reuse before the next Stage 7 rerun |
| 2026-03-10 | `Medium` | `Medium` | Raw Codex probes proved repo-scoped workspace skills are the supported custom-skill contract | Refresh requirements/design/call-stack/review artifacts, then replace the invalid turn-level hint/attachment path with workspace-skill materialization |

## File-Level Progress Table (Stage 6)

| Change ID | File / Module | File Status | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- |
| `C-001` | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/single-agent-runtime-context.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts --no-watch` | Old `single-agent-runtime-metadata.ts` references were removed. |
| `C-002` | `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/configured-runtime-skills.test.ts --no-watch` | Shared selected-skill types, Claude rendering helpers, and Codex `openai.yaml` synthesis helpers are in place. |
| `C-003` | `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts --no-watch` | Codex adapter already forwards resolved configured skills and effective access mode. |
| `C-004` | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-workspace-skill-materializer.test.ts --no-watch` | Mirrors selected skills into workspace `.codex/skills`, preserves or synthesizes `agents/openai.yaml`, tracks cleanup ownership, and refreshes owned leftovers from current source contents. |
| `C-005` | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-shared.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/codex-app-server/codex-workspace-skill-materializer.test.ts --no-watch` | Session state now persists workspace-materialization state and cleans up mirrored bundles before releasing the `cwd`-scoped Codex client. |
| `C-006` | `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts --no-watch` | Claude adapter forwards configured skills and effective access mode. |
| `C-007` | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-shared.ts`, `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-session-state.ts`, `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts --no-watch` | Claude selected-skill prompt injection is working and live-provider proof passed. |
| `C-008` | `autobyteus-server-ts/tests/unit/runtime-execution/...` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/configured-runtime-skills.test.ts tests/unit/runtime-execution/single-agent-runtime-context.test.ts tests/unit/runtime-execution/adapters/codex-app-server-runtime-adapter.test.ts tests/unit/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.test.ts tests/unit/runtime-execution/codex-app-server/codex-workspace-skill-materializer.test.ts tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts tests/unit/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.test.ts tests/unit/run-history/run-continuation-service.test.ts --no-watch` | The mapped runtime-skill regression slice passes with the final Codex workspace-materialization design. |
| `C-009` | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-app-server-process-manager.test.ts tests/unit/runtime-execution/codex-app-server/codex-thread-history-reader.test.ts tests/unit/runtime-execution/codex-app-server/codex-app-server-runtime-service.test.ts --no-watch` | Canonical-`cwd` client reuse and release lifecycle are implemented and verified. |
| `C-010` | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts` | Completed | 2026-03-10 | `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.3-codex-spark pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-runtime-graphql.e2e.test.ts -t "returns non-empty run projection conversation for completed codex runs" --no-watch` | The repository-side client-boundary fix restored the baseline live Codex projection scenario and remained stable after the workspace-skill implementation. |
| `C-011` | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts`, `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | Completed | 2026-03-10 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-execution/codex-app-server/codex-user-input-mapper.test.ts tests/unit/runtime-execution/configured-runtime-skills.test.ts --no-watch` | The invalid Codex turn-level hint/attachment path is removed; Codex turns now send plain user content once workspace skills are materialized. |

## API/E2E Testing Scenario Log (Stage 7)

| Date | Scenario ID | Level | Status | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path Taken | Resume Condition Met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | `S7-001` | API | Passed | N/A | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-003` | API | Passed | N/A | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-004` | API | Passed | N/A | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-006` | E2E | Passed | Claude live configured-skill run persisted `PRELOADED_ONLY`, recorded configured skill names, and produced the configured skill response token. | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-008` | E2E | Passed | Baseline non-skill Codex live projection scenario passes again after canonical-`cwd` client reuse. | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-002` | API | Passed | Codex workspace skill materialization, cleanup ownership, `openai.yaml` synthesis, and stale-bundle refresh behavior are covered by the refreshed unit suite. | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-005` | API | Passed | Shared bootstrap, Codex wiring, Claude wiring, and runtime-reference persistence pass together in the mapped suite. | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-007` | E2E | Passed | Live Codex configured-skill run materialized the workspace skill, returned the configured skill response token, and removed the mirrored bundle at shutdown. | No | N/A | Direct pass | Yes |
| 2026-03-10 | `S7-009` | API | Passed | Canonical-`cwd` client reuse and release remain correct. | No | N/A | Direct pass | Yes |

## Acceptance Criteria Closure Matrix (Stage 7 Gate)

| Date | Acceptance Criteria ID | Requirement ID | Scenario ID(s) | Coverage Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-03-10 | `AC-001` | `R-001` | `S7-001`, `S7-004` | Passed | Shared runtime bootstrap resolves configured skills plus effective skill access mode. |
| 2026-03-10 | `AC-002` | `R-002` | `S7-002`, `S7-007` | Passed | Codex now materializes configured skills into workspace `.codex/skills` bundles and live provider-backed execution proves the contract. |
| 2026-03-10 | `AC-003` | `R-003` | `S7-003` | Passed | Claude turn input contains the configured skill instruction block with root-path guidance. |
| 2026-03-10 | `AC-004` | `R-004` | `S7-004` | Passed | Missing skills are skipped and disabled modes suppress exposure without throwing. |
| 2026-03-10 | `AC-005` | `R-005` | `S7-005`, `S7-006`, `S7-007`, `S7-008` | Passed | Shared bootstrap, Claude live proof, Codex live proof, and the baseline Codex regression scenario all pass against the final implementation. |
| 2026-03-10 | `AC-006` | `R-006` | `S7-009` | Passed | Canonical-`cwd` Codex client reuse is implemented and verified. |

## API/E2E Feasibility Record

- API/E2E scenarios feasible in current environment: Yes
- If `No`, concrete infeasibility reason: N/A
- Current environment constraints (tokens/secrets/third-party dependency/access limits): Claude and Codex live-provider execution are both available and passed for the mapped configured-skill scenarios in this run.
- Best-available compensating automated evidence: not needed beyond the mapped automated proof; both live provider-backed scenarios and the mapped unit suites passed.
- Residual risk accepted: Yes. Residual risk is limited to future vendor-runtime drift outside this verified repository snapshot.
- Explicit user waiver for infeasible acceptance criteria: No
- Waiver reference (if `Yes`): N/A

## Blocked Items

| File | Blocked By | Unblock Condition | Owner/Next Action |
| --- | --- | --- | --- |
| None | N/A | N/A | Await user verification in Stage 10 |

## Completion Gate

- Stage 6 complete: Yes
- Stage 7 complete: Yes
- Stage 8 complete: Yes
- Stage 9 complete: Yes
