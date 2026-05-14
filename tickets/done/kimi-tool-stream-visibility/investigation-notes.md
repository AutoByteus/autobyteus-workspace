# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Refactor investigation complete; design artifact updated for architecture review`
- Investigation Goal: Determine whether invocation aliasing is required by AutoByteus/Kimi, Codex, or Claude runtimes, and design the clean-cut removal of legacy alias/cross-stream identity behavior.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The affected invariant crosses web transcript projection, web Activity projection, server file-change correlation, Codex approval bridging, runtime/e2e tests, and docs.
- Scope Summary: Replace legacy invocation-id alias/cross-stream compatibility with exact canonical invocation identity across frontend, server, and runtime adapter boundaries.
- Primary Questions To Resolve:
  - `Q-001`: Does AutoByteus/Kimi require aliases such as `call_3:write_file` or does it emit exact ids?
  - `Q-002`: Do Codex or Claude Agent SDK require frontend/server alias matching?
  - `Q-003`: Which in-repo components currently create, consume, or preserve alias behavior?
  - `Q-004`: Can Codex approval use exact `itemId` as public `invocation_id` while preserving `approvalId` separately?
  - `Q-005`: What old tests/docs must be changed from positive compatibility to negative unsupported cases?

## Request Context

The original user report showed Kimi 2.5 AutoByteus tool calls creating files while later tool call events were not visible in the middle conversation area or Activity panel. A narrowed alias hotfix was designed and partially implemented, but the user then challenged the alias concept as an ugly legacy/code smell and explicitly requested a refactoring design that removes all legacies, consistent with project design principles.

This revision therefore investigates whether any runtime genuinely needs alias behavior. The conclusion is: no active runtime evidence requires alias matching; aliasing is an in-repo compatibility mechanism that should be removed.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility/tickets/done/kimi-tool-stream-visibility`
- Current Branch: `codex/kimi-tool-stream-visibility`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-tool-stream-visibility`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: Previously refreshed during ticket bootstrap; current branch tracks `origin/personal`.
- Task Branch: `codex/kimi-tool-stream-visibility`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Current HEAD: `b056b5f809dacb27524e492f3acef16630969e1b`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Current worktree contains uncommitted narrowed-alias implementation changes. Treat them as superseded by this refactor design; implementation should remove the alias helpers rather than refine them.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-13 | Repro/Trace | Kimi 2.5 Daily Assistant live run, prompt marker `BUGTRACE-KIMI-0513C`, Nuxt frontend on `127.0.0.1:3022`, Electron backend on `127.0.0.1:29695` | Reproduce original bug | Backend and browser received distinct `run_bash:0..4` events; visible transcript/Activity collapsed to one `run_bash` item | No for design; implement exact-only projection |
| 2026-05-13 | Code | `autobyteus-web/utils/invocationAliases.ts` | Inspect frontend identity policy | Broad/narrowed alias helper exists and parses colon suffixes | Remove |
| 2026-05-13 | Code | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Find transcript projection consumer | `findSegmentById()` uses `invocationIdsMatch()` for tool-like segments | Replace with exact matching |
| 2026-05-13 | Code | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Find lifecycle consumer | `resolveToolSegmentByAlias()` loops `buildInvocationAliases()` | Remove alias resolver; resolve exact id only |
| 2026-05-13 | Code | `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Find Activity consumer | Activity dedupe/update resolves aliases and existing alias ids | Replace with exact id operations |
| 2026-05-13 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | Inspect server copy | File-change domain exports same alias/match helper | Remove exports |
| 2026-05-13 | Code | `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-invocation-context-store.ts` | Inspect server file-change consumer | Context store records and deletes all aliases | Refactor to one exact key |
| 2026-05-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Inspect Codex approval source | `resolveApprovalInvocationCandidates()` constructs `${itemId}:${approvalId}` and records `itemId` alias | Refactor to primary `itemId`, no aliases |
| 2026-05-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Inspect Codex approval lookup | `recordApprovalRecord(record, aliases)` stores aliases; `findApprovalRecord()` splits at `:`; delete removes both invocation and item id | Exact-key records only |
| 2026-05-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Inspect Codex event id parser | Appends `approval_id`/`approvalId` to public invocation id | Stop appending; keep approval metadata separate |
| 2026-05-14 | Command | `git log --date=iso --pretty=format:'%h %ad %s' -- autobyteus-web/utils/invocationAliases.ts ...` | Determine origin of alias behavior | `43c89b60` on `2026-04-03` introduced frontend alias utility; `83d1a8b2` on `2026-05-02` added Activity projection use; `0eba4c0f` on `2026-05-03` added server file-change alias copy | No |
| 2026-05-14 | Test/Trace | `RUN_CODEX_E2E=1 ... pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "routes Codex MCP tool approval over websocket" --reporter=verbose` with logs in `/tmp/autobyteus-runtime-id-debug-codex-mcp-20260514-045010` | Check Codex MCP runtime id behavior | Exact id `call_2HeJc72tHWbM66V59vJDCv8p` used across raw call, segment start, execution started, approval requested, approved, execution succeeded, segment end, and log | Preserve with tests |
| 2026-05-14 | Test/Trace | `RUN_CLAUDE_E2E=1 ... pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts -t "routes tool approval over websocket" --reporter=verbose` with logs in `/tmp/autobyteus-runtime-id-debug-claude-20260514-045217` | Check Claude Agent SDK id behavior | Exact id `call_00_lYYd6th842OuYuDs2kE21167` used across tool_use, segment start, execution started, approval requested, approved, segment end, execution succeeded, and file changes | Preserve with tests |
| 2026-05-14 | Test/Trace | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts -t "requests terminal approval, approves" --reporter=verbose` with logs in `/tmp/autobyteus-runtime-id-debug-codex-thread-20260514-045114` | Check Codex terminal approval path | Runtime request used `itemId`; current tests contain helper that can create `${itemId}:${approvalId}`; app-server approval emits both `invocation_id` and separate `approvalId` fields | Refactor helper/tests to canonical item id |
| 2026-05-14 | Code Search | `rg -n "buildInvocationAliases|invocationIdsMatch|invocationAliases|resolveApprovalInvocation|findApprovalRecord" ...` | Inventory active alias and approval paths | Active alias consumers are limited and removable; Codex approval fallback is localized | Implement clean removal |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: runtime/provider emits or reports a tool invocation id; server converts it to stream events; frontend projects stream events into transcript and Activity.
- Current execution flow: `Provider/runtime tool event -> backend converter/parser -> AgentRunEvent websocket payload -> web handler -> transcript segment and Activity projection`.
- Current approval flow: `Codex app-server approval request -> CodexThread approval record -> TOOL_APPROVAL_REQUESTED -> frontend approve/deny by invocation_id -> CodexThread.findApprovalRecord() -> provider response`.
- Current file-change flow: `tool lifecycle or file-change event -> FileChangeEventProcessor -> FileChangeInvocationContextStore -> run file-change payload/projection`.
- Ownership or boundary observations:
  - Runtime adapters should own provider-specific metadata normalization.
  - Frontend projection should not infer provider or approval semantics from id strings.
  - File-change context store should not implement cross-runtime compatibility identity rules.
  - Codex approval bridge should own approval records and metadata; it should not ask frontend/server shared projection code to understand `itemId:approvalId`.
- Current behavior summary: The old design has multiple places where suffixes are interpreted as aliases. That blurs the identity boundary, duplicates policy, and lets provider-generated ids such as Kimi `run_bash:N` collapse incorrectly.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor` plus `Bug Fix` and `Behavior Change`
- Candidate root cause classification: `Legacy Or Compatibility Pressure`, `Boundary Or Ownership Issue`, `Shared Structure Looseness`, `Duplicated Policy Or Coordination`
- Refactor posture evidence summary: Refactor needed now. Keeping an allowlist still preserves two representations of the same subject (`base id` and `suffixed id`) and still requires every consumer to understand legacy identity shapes. Exact identity belongs at the runtime/protocol boundary; metadata belongs in metadata fields.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Kimi live repro | Browser received distinct ids but UI collapsed them | Frontend alias matching violates provider id uniqueness | Remove aliases |
| Web alias consumers | Transcript and Activity both depend on `invocationIdsMatch()` | Duplicated/cross-cutting identity policy in projection layer | Exact matching only |
| Server file-change alias copy | File-change store stores aliases | Same loose identity policy duplicated server-side | Exact key store |
| Codex MCP e2e logs | Exact id works across full lifecycle | No Codex MCP need for aliases | Preserve exact tests |
| Claude e2e logs | Exact id works across lifecycle, approval, file changes | No Claude need for aliases | Preserve exact tests |
| Codex terminal approval code | Our adapter constructs `itemId:approvalId` | Legacy shape is self-inflicted; approval metadata should be separate | Refactor adapter |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/utils/invocationAliases.ts` | Shared frontend alias helper | Encodes legacy suffix parsing | Delete; no replacement alias helper |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | Transcript segment lookup/update | Uses alias matcher for tool-like segments | Exact id lookup only |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | Applies lifecycle events to tool segments | Has `resolveToolSegmentByAlias()` | Replace with exact segment resolution |
| `autobyteus-web/services/agentStreaming/handlers/toolActivityProjection.ts` | Projects lifecycle/segments into Activity | Resolves alias sets and existing alias rows | Exact Activity upsert/update by `invocationId` |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change.ts` | File-change payload/id domain helpers | Contains mirrored alias helpers unrelated to file-change path/id building | Remove alias exports; keep file-change domain only |
| `autobyteus-server-ts/src/agent-execution/events/processors/file-change/file-change-invocation-context-store.ts` | Stores transient invocation context for file-change correlation | Stores and deletes under aliases | Store one context under one exact key |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-types.ts` | Reexports file-change domain types/helpers | Reexports alias helpers | Remove reexports |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-server-request-handler.ts` | Converts Codex app-server requests into runtime events/approval records | Creates `${itemId}:${approvalId}` public id | Use `itemId` as canonical public id; keep `approvalId` metadata |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Owns Codex thread state and approval records | Stores aliases and fallback-splits ids | Exact keyed records only |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.ts` | Resolves ids from Codex item event payloads | Appends approval id | Never append approval id to invocation id |
| `autobyteus-server-ts/tests/integration/runtime-execution/codex-app-server/thread/codex-thread.integration.test.ts` | Codex app-server integration coverage | Helper expects `${itemId}:${approvalId}` when approval exists | Update to exact `itemId` plus separate metadata assertions |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend streaming architecture docs | Currently updated for narrowed alias semantics | Rewrite to exact-only semantics |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Server artifacts/file-change docs | Currently updated for narrowed alias semantics | Rewrite to exact-only semantics |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-13 | Repro | Local frontend + Electron backend Kimi 2.5 run | Distinct `run_bash:0..4` events existed; UI collapsed them | Runtime did not lose events; projection identity bug |
| 2026-05-13 | Test | `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/streaming/kimi-k25-event-stream-boundary.test.ts` | Kimi-shaped ids preserved through handler/notifier/stream | AutoByteus runtime boundary exact-id guard |
| 2026-05-14 | Test/Trace | Codex MCP runtime e2e command above | Exact `call_...` id across segment/lifecycle/approval/result/log | No alias required for Codex MCP |
| 2026-05-14 | Test/Trace | Claude runtime e2e command above | Exact `call_...` id across segment/lifecycle/approval/file-change/result | No alias required for Claude |
| 2026-05-14 | Test/Trace | Codex thread integration command above | Request carries `itemId`; code/test can combine with `approvalId` | Refactor Codex terminal approval legacy |

## External / Public Source Findings

No external public docs were required. The decisive evidence comes from local runtime traces, source code, and integration tests.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: local Electron backend and Nuxt frontend for the original Kimi repro; server runtime e2e tests for Codex/Claude probes.
- Required config, feature flags, env vars, or accounts: `.env.test` credentials loaded for live provider/runtime probes; values were not copied into artifacts.
- Setup commands that materially affected the investigation: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` before server runtime e2e tests; runtime debug env vars such as `RUNTIME_RAW_EVENT_DEBUG=1`, `CODEX_THREAD_EVENT_DEBUG=1`, `CLAUDE_SESSION_EVENT_DEBUG=1`.
- Cleanup notes: Debug logs remain under `/tmp/autobyteus-runtime-id-debug-*` and are investigation evidence only, not repo artifacts.

## Findings From Code / Docs / Data / Logs

- The alias abstraction is not a clean domain concept. It conflates several different ideas:
  - provider-generated id suffixes (`run_bash:1`),
  - historical file/tool segment suffixes (`call_3:write_file`),
  - approval metadata (`approval-1` or Codex `approvalId`),
  - and generic namespace/random suffixes.
- Keeping an allowlist still leaves frontend/server projection responsible for deciding which suffixes are semantic. That is the wrong boundary; provider adapters and approval owners should produce one canonical id and expose all other data as metadata.
- Codex terminal approval is the only inspected path that actively constructs a combined id. Because that construction is in our adapter, the correct fix is to stop constructing it, not to preserve frontend aliases.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility for alias shapes is in scope. Old alias-shaped events may display as separate items if replayed; that is accepted for this refactor.
- Team approval tokens are existing capability-specific metadata and should not be generalized into invocation aliasing.
- Provider approval metadata must remain internal to runtime/approval owners unless a public protocol field is explicitly required.

## Open Unknowns / Risks

- Codex terminal approval with non-null `approvalId` must be covered because local live trace did not include a non-null approval id in the exercised terminal request, even though code supports that shape.
- Historical runs created under old alias policy may not visually merge when replayed. This is intentional no-compat behavior for this scope.

## Notes For Architect Reviewer

- This is a scope revision from the prior narrowed-alias design. The prior design review findings about exactly which suffixes may alias are superseded because the new requirement rejects all aliases.
- The architecture question is not whether the allowlist should include `write_file`/`edit_file`; it should not exist. The target invariant is exact canonical invocation identity.
