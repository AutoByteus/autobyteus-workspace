# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-review-report.md`
- Implementation pause note: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/implementation-pause-note.md`

## What Changed

- Reconciled the paused draft against latest `origin/personal` and implemented the round-2 live-only design.
- Moved shared `send_message_to` contract, parser, selector, reference-file validation, dispatcher, direct router, direct event/input builders, sender context, and optional grant policy into the new `agent-communication` capability.
- Implemented `target_agent_run_id` as a global exact live `AgentRun.runId` route through `SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun -> AgentRun.postUserMessage`.
- Preserved `recipient_name` as the only team-semantic route; it still requires team context/team delivery and remains the path that creates Team Communication projection/lazy team behavior.
- Updated AutoByteus, Codex, and Claude adapters to expose configured `send_message_to` for standalone exact-run use and to call the shared dispatcher rather than owning delivery logic.
- Added direct global `INTER_AGENT_MESSAGE` events only after target input acceptance; direct events intentionally omit `team_run_id` and Team Communication reference projection fields.
- Updated Team Communication event processing to ignore direct global events with no `team_run_id`.
- Updated Skill Self-Evolver to require `send_message_to`, register a direct-message grant for helper outcome reporting, pass the target run id into the helper prompt/metadata, require live target at start, and record truthful sent/rejected/inactive/not-attempted summaries without duplicate generic notifications.
- Updated built-in Skill Self-Evolver config/instructions to include `send_message_to` and final outcome guidance.

## Key Files Or Areas

- New shared capability:
  - `autobyteus-server-ts/src/agent-communication/domain/send-message-target-selector.ts`
  - `autobyteus-server-ts/src/agent-communication/domain/agent-run-message-sender.ts`
  - `autobyteus-server-ts/src/agent-communication/domain/direct-agent-run-message-grant.ts`
  - `autobyteus-server-ts/src/agent-communication/services/send-message-to-dispatcher.ts`
  - `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts`
  - `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-runtime-builders.ts`
  - `autobyteus-server-ts/src/agent-communication/services/direct-agent-run-message-grant-registry.ts`
- Runtime adapters:
  - `autobyteus-server-ts/src/agent-tools/agent-communication/send-message-to.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/...`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/...`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/...`
- Team boundary/instructions:
  - `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/team-communication/team-communication-message-event-processor.ts`
- Self-evolution:
  - `autobyteus-server-ts/src/self-evolution/services/strategies/single-agent-evolver-strategy.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-service.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolution-record-lifecycle.ts`
  - `autobyteus-server-ts/src/self-evolution/services/self-evolver-agent-settings-resolver.ts`
- Focused tests:
  - `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-tools/team-communication/send-message-to.test.ts`
  - `autobyteus-server-ts/tests/self-evolution/self-evolution-record-lifecycle.test.ts`
  - Existing AutoByteus/Codex/Claude/self-evolution tests updated for configured exact-run exposure and live-only messaging.

## Important Assumptions

- `AgentRunManager.getActiveRun(runId)` is the authoritative and sufficient live-target decision for global exact direct delivery.
- Exact-run direct delivery is server-local/in-process for this ticket; no discovery, metadata lookup, queueing, lazy start, task-agent recovery, or cross-process routing was added.
- Optional `DirectAgentRunMessageGrant` is policy/usage tracking only; it does not resolve or revive targets.
- Public `send_message_to(target_agent_run_id)` now dispatches before team delivery. Existing internal team/task-delegation code that uses target run ids was not redesigned beyond this public tool route.

## Known Risks

- Direct global messages to active team members do not create Team Communication records. This is intentional; callers needing Team Communication projection must use `recipient_name`.
- Runtime adapters now expose `send_message_to` for configured exact-run delivery even when `recipient_name` delivery is unavailable; prompts warn not to use `recipient_name` unless Team Communication is enabled.
- Global exact messaging remains broad for configured senders that already know an active run id. No discovery was added, and the router/grant seam is preserved for future authorization policy.
- `pnpm -C autobyteus-server-ts typecheck` is currently blocked by the repository `tsconfig.json` including `tests` while `rootDir` is `src`; see local checks.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement / Feature / Refactor
- Reviewed root-cause classification: Boundary Or Ownership Issue; Duplicated Policy Or Coordination; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: Runtime-specific handlers are thin wrappers over `SendMessageToDispatcher`; the global router only uses `AgentRunManager.getActiveRun`; parser/contract moved under `agent-communication`; stale address-directory/team-claim design was not retained.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Old team-owned send-message parser/contract/tool registration paths were moved to `agent-communication`; no `GlobalAgentRunAddressDirectory` or team target-claim router was implemented.

## Environment Or Dependency Notes

- Dependencies were installed with `pnpm install --frozen-lockfile`; no package or lockfile changes were produced.
- `pnpm -C autobyteus-server-ts typecheck` still fails before useful type errors because the repo `tsconfig.json` includes `tests` while `rootDir` is `src` (`TS6059`). Source build checks pass via `tsconfig.build.json`.

## Local Implementation Checks Run

- `pnpm install --frozen-lockfile` — passed.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts build:full` — passed, including built-in agent bootstrap smoke check.
- Focused implementation Vitest suite — passed: 15 files / 64 tests.
  - `tests/unit/agent-communication/global-agent-run-message-router.test.ts`
  - `tests/unit/agent-tools/team-communication/send-message-to.test.ts`
  - `tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts`
  - `tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.test.ts`
  - `tests/unit/agent-execution/backends/claude/team-communication/claude-send-message-tool-definition-builder.test.ts`
  - `tests/unit/agent-execution/backends/codex/team-communication/codex-send-message-tool-spec-builder.test.ts`
  - `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
  - `tests/self-evolution/single-agent-evolver-strategy.test.ts`
  - `tests/self-evolution/self-evolution-service.integration.test.ts`
  - `tests/self-evolution/self-evolution-record-lifecycle.test.ts`
  - `tests/unit/agent-team-execution/member-run-instruction-composer.test.ts`
  - `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts`
  - `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
  - `tests/unit/agent-execution/backends/claude/team-communication/claude-team-mcp-server-builder.test.ts`
- `pnpm -C autobyteus-server-ts typecheck` — failed due existing `TS6059` project config issue (`tests` not under `rootDir` `src`); shared package pretypecheck completed successfully first.

## Downstream Coverage Hints / Suggested Scenarios

- API/E2E should verify actual standalone AutoByteus/Codex/Claude configured runs expose `send_message_to` and can deliver to a live exact run id.
- Verify live active standalone and active team-member exact targets receive model-visible direct messages and direct `INTER_AGENT_MESSAGE` events without Team Communication projection.
- Verify inactive, unknown, preallocated-only, lazy-startable-only, and recoverable-only ids fail closed without team lookup/recovery.
- Verify `recipient_name` still routes through team delivery and creates Team Communication projection after accepted recipient input.
- Exercise Skill Self-Evolver end-to-end for sent outcome, not-attempted outcome, denied grant, stale target at start, and target inactive at final send.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. API/E2E coverage investigation and execution remain owned by `api_e2e_engineer` after code review.
