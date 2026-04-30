# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-review-report.md`
- Implementation design-impact note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/implementation-design-impact-note.md`
- Visible-runs solution note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-visible-compactor-runs.md`
- Default/E2E solution note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-default-compactor-agent-and-e2e.md`
- Prompt-ownership implementation design-impact note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/implementation-design-impact-note-prompt-ownership.md`
- Prompt-ownership solution note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-compactor-prompt-ownership.md`
- Output-tags solution note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-compactor-output-tags.md`
- Minimal-schema solution note: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-impact-resolution-minimal-compactor-schema.md`
- Prior code review report with `CR-004-001`: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/review-report.md`

## What Changed

- Replaced direct-model memory compaction with agent-based compaction:
  - `AgentCompactionSummarizer` builds one compaction task prompt and calls a `CompactionAgentRunner` boundary.
  - `ServerCompactionAgentRunner` creates a normal visible compactor run through `AgentRunService.createAgentRun`, posts a normal user message, collects final output from normal run events, and terminates the run through `AgentRunService.terminateAgentRun`.
- Implemented the two-layer prompt ownership split:
  - default `autobyteus-memory-compactor/agent.md` owns stable compaction behavior, category meanings, preservation/drop rules, JSON-only discipline, and manual-test guidance;
  - automated task prompts are a short envelope plus `[OUTPUT_CONTRACT]`, the memory-owned exact parser contract, and `[SETTLED_BLOCKS]`;
  - parser compatibility is not delegated exclusively to editable `agent.md`.
- Implemented the round-7 facts-only compactor schema:
  - `CompactionTaskPromptBuilder` now requests only `{ "fact": "string" }` entries inside typed arrays;
  - default compactor `agent.md` manual schema also uses facts-only entries;
  - `CompactionResponseParser` ignores/drops stale custom `reference`/`tags` metadata instead of carrying it into compactor results;
  - `CompactionResultNormalizer` no longer reads model-generated references/tags and no longer auto-extracts important-artifact references from fact text;
  - compactor-persisted semantic items now receive only the fact text from model output, with `reference: null` and `tags: []` unless a future non-compactor/internal deterministic metadata design adds otherwise.
- Added a system-provided default normal shared/editable compactor agent:
  - id: `autobyteus-memory-compactor`
  - source template: `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/{agent.md,agent-config.json}`
  - runtime seed path: `getAgentsDir()/autobyteus-memory-compactor/{agent.md,agent-config.json}`
  - `agent-config.json` uses `defaultLaunchConfig: null` and no runtime/model assumptions.
- Added `DefaultCompactorAgentBootstrapper` and wired it in server startup before app route construction/background cache preloading.
  - Creates missing files only.
  - Preserves existing user-edited files.
  - Logs invalid existing definition files without repairing/overwriting them.
  - Selects `autobyteus-memory-compactor` only when `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank and the default definition resolves.
  - Refreshes agent-definition cache after a successful default resolve.
- Extended runtime asset copying so the default compactor template files are available from built `dist/` output.
- Added normal-run final-output collection for AutoByteus/Codex/Claude event shapes via `CompactionRunOutputCollector`.
- Injected the server-backed compaction runner at the AutoByteus parent-agent construction seam without changing generic manager/backend hidden-run behavior.
- Replaced the compaction server setting/UI from direct model selection to compactor-agent selection:
  - new setting `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`
  - web card lists agent definitions and shows selected/default agent launch summary.
- Added parent compaction status metadata fields for compactor agent/runtime/model/run/task correlation, including `compaction_run_id`.
- Removed/decommissioned the old production direct-model path:
  - deleted `LLMCompactionSummarizer`
  - deleted `CompactionPromptBuilder`
  - removed `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` production setting/read path
  - removed active-parent-model fallback behavior.
- Updated docs for default compactor setup, prompt ownership split, facts-only compactor schema, visible compactor runs, normal agent-editor runtime/model configuration, and no active-model fallback.

## Key Files Or Areas

- Core compaction boundary and facts-only prompt/parser/normalizer:
  - `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts`
  - `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts`
  - `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts`
  - `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts`
  - `autobyteus-ts/src/memory/compaction/compaction-result.ts`
  - `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts`
  - `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts`
- Server visible-run adapter/setup:
  - `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts`
  - `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts`
  - `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts`
  - `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent-bootstrapper.ts`
  - `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md`
  - `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent-config.json`
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
  - `autobyteus-server-ts/src/server-runtime.ts`
  - `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs`
- Settings/UI/status:
  - `autobyteus-server-ts/src/services/server-settings-service.ts`
  - `autobyteus-web/components/settings/CompactionConfigCard.vue`
  - `autobyteus-web/services/agentStreaming/handlers/agentStatusHandler.ts`
  - `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`
  - `autobyteus-web/types/agent/AgentRunState.ts`
- Tests:
  - `autobyteus-ts/tests/unit/memory/compaction-task-prompt-builder.test.ts`
  - `autobyteus-ts/tests/unit/memory/compaction-response-parser.test.ts`
  - `autobyteus-ts/tests/unit/memory/agent-compaction-summarizer.test.ts`
  - `autobyteus-ts/tests/unit/memory/compaction-result-normalizer.test.ts`
  - `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts`
  - `autobyteus-ts/tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/compaction/default-compactor-agent-template.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/compaction/default-compactor-agent-bootstrapper.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/compaction/*`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
  - `autobyteus-server-ts/tests/unit/services/server-settings-service.test.ts`
  - `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
  - `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts`

## Important Assumptions

- Compactor behavior is represented by a normal agent definition; its `agent.md` instructions own stable behavior and its normal `defaultLaunchConfig` owns runtime/model/config.
- Memory compaction code remains the source of truth for the exact automated JSON output contract consumed by `CompactionResponseParser`.
- The active compactor-facing semantic schema is facts-only. Category is the surrounding typed array; model-generated `reference` and `tags` are not part of the contract.
- Fresh installs seed and select `autobyteus-memory-compactor`, but that seed intentionally has no runtime/model. Users or validation setup must configure launch defaults through the normal agent editor/API.
- Compactor runs are intentionally visible normal runs in history and are terminated after one task to avoid active-run leaks.
- Initial tool policy is conservative normal-run launch behavior: `autoExecuteTools=false` and `skillAccessMode=PRELOADED_ONLY`; if the compactor asks for tool approval, compaction fails clearly and the visible run remains inspectable.
- No legacy/direct-model compatibility branch is retained.

## Known Risks

- Visible compactor runs add normal run-history entries; this matches the revised design/user preference but may increase history volume.
- `CompactionRunOutputCollector` depends on normalized run events from each backend; unit fixtures cover AutoByteus/Codex/Claude shapes, but API/E2E must verify real runtime event streams.
- Fresh installs will have a selected default compactor id but still need a runtime/model configured on that agent before real compaction can succeed. This is intentional; there is no parent-model fallback.
- Manual compactor testing uses the default `agent.md` guidance, but production parser compatibility is still enforced by the automated task envelope plus parser.
- `CompactionResponseParser` tolerates stale custom `reference`/`tags` fields by ignoring them; that tolerance is not the active contract and no consumer depends on those fields.
- `pnpm -C autobyteus-server-ts typecheck` previously failed before implementation-specific checking because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many existing test files. `pnpm -C autobyteus-server-ts build` passes with `tsconfig.build.json`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - Static grep over changed source found no compaction-specific `internalTask`, `agent-execution/internal-tasks`, Codex/Claude bootstrap/thread/session changes, or hidden/internal compactor-run code. Grep matches for `hidden` are only unrelated docs text.
  - Production grep found no `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, `LLMCompactionSummarizer`, or old direct-model compaction prompt-builder references; remaining matches are tests asserting the old setting is absent.
  - `ServerCompactionAgentRunner` imports/calls `AgentRunService` and normal `AgentRun` operations only; it does not import/call `AgentRunManager` or backend factories.
  - Round-7 focused grep confirms `CompactionTaskPromptBuilder` and default compactor `agent.md` facts-only schemas contain no `reference` or `tags`; remaining doc `tags` hits are raw-trace/internal persistence examples, not compactor output contract requests.
  - `CompactionResponseParser` no longer parses model-generated metadata, and `CompactionResultNormalizer` no longer extracts references from important-artifact fact text.
  - Largest changed source implementation file by effective non-empty line count remains under 500; round-7 changed compaction source files are 130 lines or fewer after cleanup.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` earlier in the worktree because dependencies were not installed. No lockfile change was produced.
- Ran `pnpm -C autobyteus-web exec nuxi prepare` earlier before web unit tests to generate `.nuxt/tsconfig.json`.
- `pnpm -C autobyteus-server-ts build` copies default compactor template files into `dist/agent-execution/compaction/default-compactor-agent/`.

## Local Implementation Checks Run

- `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/compaction-task-prompt-builder.test.ts tests/unit/memory/compaction-response-parser.test.ts tests/unit/memory/agent-compaction-summarizer.test.ts tests/unit/memory/compaction-result-normalizer.test.ts tests/unit/memory/compaction-runtime-settings.test.ts tests/unit/agent/llm-request-assembler.test.ts tests/integration/agent/runtime/agent-runtime-compaction.test.ts tests/integration/agent/memory-compaction-real-summarizer-flow.test.ts` — passed: 8 files, 17 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction/default-compactor-agent-template.test.ts tests/unit/agent-execution/compaction/default-compactor-agent-bootstrapper.test.ts tests/unit/agent-execution/compaction/compaction-agent-settings-resolver.test.ts tests/unit/agent-execution/compaction/compaction-run-output-collector.test.ts tests/unit/agent-execution/compaction/server-compaction-agent-runner.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/services/server-settings-service.test.ts` — passed: 7 files, 43 tests.
- `pnpm -C autobyteus-ts build` — passed.
- `pnpm -C autobyteus-server-ts build` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` — passed before prompt/schema-only reworks: 1 file, 4 tests. This was a narrow settings regression check only, not downstream API/E2E validation sign-off.
- `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/CompactionConfigCard.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts` — passed before prompt/schema-only reworks: 4 files, 24 tests.
- `pnpm -C autobyteus-web run guard:web-boundary` — passed after round-7 docs update.
- `pnpm -C autobyteus-web run guard:localization-boundary` — passed after round-7 docs update.
- `pnpm -C autobyteus-web run audit:localization-literals` — passed with zero unresolved findings after round-7 docs update. Node emitted the existing module-type warning for `autobyteus-web/localization/audit/migrationScopes.ts`.
- `git diff --check` — passed after round-7 rework.
- Static grep checks:
  - changed-file grep for `internalTask`, `agent-execution/internal-tasks`, `hidden` — no forbidden source matches; only unrelated docs `hidden` wording.
  - repo grep for `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`, `LLMCompactionSummarizer`, `llm-compaction-summarizer` outside tickets — only tests asserting absence of the old env key.
  - prompt-builder/default-agent focused grep verifies active schemas are facts-only and do not include `reference` or `tags` fields.
  - parser/normalizer focused grep found no `entryRecord.reference`, `entryRecord.tags`, `extractReferenceFromText`, `maxReferenceChars`, `normalizeReference`, `candidate.reference`, or `candidate.tags` compactor-path usage.
- `pnpm -C autobyteus-server-ts typecheck` — failed before round-5 with existing TS6059 `tests` outside `rootDir` issue described above; not rerun because the failure is project-config-wide and source build passes.

## Downstream Validation Hints / Suggested Scenarios

- Required round-4+ scenario: configure a real AutoByteus parent agent/run using local AutoByteus runtime/model, configure the selected/default `autobyteus-memory-compactor` default launch config to Codex runtime, set a very low effective context/trigger threshold, trigger compaction, and verify:
  - parent compaction status includes `compaction_run_id`
  - compactor run is visible in normal run history/status
  - visible compactor run output/history is inspectable
  - parent continues after compaction success or reports a clear compaction failure.
- Verify the real compactor output is accepted with facts-only semantic entries and that persisted semantic items do not include model-generated `reference` or `tags`; any file/path/source detail should remain in `fact` text for this ticket.
- Manually run the seeded/default `autobyteus-memory-compactor` as a normal visible agent, paste representative conversation/history, and verify its own `agent.md` guidance is sufficient to produce the six memory categories without relying on hidden task behavior prose.
- Verify automated compaction user messages contain `[OUTPUT_CONTRACT]`, the exact facts-only JSON schema, and `[SETTLED_BLOCKS]`, while stable behavior/category guidance lives in `agent.md`.
- Verify startup seeding on a fresh app-data dir before cache preloading, then verify normal agent-definition listing/editing sees `autobyteus-memory-compactor`.
- Verify existing edited `getAgentsDir()/autobyteus-memory-compactor/{agent.md,agent-config.json}` files are not overwritten on restart.
- Verify invalid existing default files surface normal agent-definition errors and do not auto-select the default.
- Verify missing runtime/model on the selected/default compactor fails actionably and never falls back to the parent active model.
- Run real compactor-agent executions for AutoByteus, Codex, and Claude runtimes and inspect final-output collection.
- Verify compactor tool-approval request fails clearly, terminates the compactor run, and leaves history inspectable.

## API / E2E / Executable Validation Still Required

Yes. API/E2E validation remains required after code review. In particular, the real AutoByteus-parent + Codex-compactor scenario is mandatory. If Codex or the local AutoByteus/LM Studio/Qwen runtime environment is unavailable, API/E2E must record a concrete environment blocker instead of claiming pass.
