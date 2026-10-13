# Investigation Notes — token-meter-tps

## Investigation Meta
- Package/task: token-meter-tps / project_task_b91ece4e-98ad-4694-b51b-4a5967905ca4.
- Repository mode: Git. Workspace / task worktree: /home/autobyteus/workspace/.codex/worktrees/token-meter-tps.
- Branch: codex/token-meter-tps.
- Resolved base: origin/personal at be4190e94b4fd715ae41951a0ff9648d4f65f5fa, after successful `git fetch origin` on 2026-10-13.
- Finalization target: origin/personal. Shared checkout /home/autobyteus/workspace/autobyteus-workspace was on personal with unrelated untracked folders; not modified.
- Bootstrap: PASS. Existing worktree list and tickets searched; new isolated task tree created before authoring. Initial template-relative path was absent in tracked checkout; templates then loaded from installed skill root. No workspace blocker.
- Current revision: SR-002 (architecture investigation complete; R1 remains approved).
- Authorities read in full 2026-10-13: installed solution-designer SKILL.md; requirements-engineering.md; architecture-design.md; design-principles.md; requirements, investigation, revision, design templates; repository AGENTS.md, DESIGN.md, TESTING.md, web/server AGENTS.md; server docs/design/agent_websocket_streaming_protocol.md and codex_raw_event_mapping.md. Long outputs were followed by chunked reads to finish truncated portions. No additional package DESIGN.md applies. RELEASE.md is a downstream finalization gate, not invoked here.

## Initial Request And Clarifications
Project Task Manager delegated a user-authorized immediate feature ticket: show runtime/model TPS for the selected agent in existing Token tab, especially watching Project Task Manager while working and selecting team members. User accepts rough calculation and explicitly asks Software Engineering to determine it. No formula was selected by delegator. Preserve meter reporting/runtime behavior, investigate available telemetry, explain live/estimated/last-known/unavailable distinctions, test honestly, avoid paid benchmark traffic and workers/data interference, deliver source vs installed-runtime status separately. No further user clarification was necessary.

## Product And Domain Understanding
Token Meter is the right-hand workspace Token panel. Output/cost totals are not the same scope as one agent's model activity: standalone primary totals can include its collaborators and task copies. A usage report is a model-call observation or a reconciliation/context observation, not a token delta stream or an inference timer. TPS here will be a new product observation using existing evidence, not a benchmark.

## Source Log And Technical Facts
Paths in this table are relative to the task worktree above; exact locations are given for reproducibility. Read-only `cat`, `sed`, `rg -n`, `rg --files`, `git status`, `git worktree list`, `git symbolic-ref refs/remotes/origin/HEAD`, `git rev-parse` used on 2026-10-13. No changed-source tests have been run at solution stage.

| ID | Exact source / command | Fact and implication |
|---|---|---|
| E1 | `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`; original screenshot | Current hierarchy: context card, input/output/total cards, breakdown, pricing/details; model/runtime in pricing, no TPS. Main sections gated by primarySummary, so TPS empty/collecting must not depend on that gate |
| E2 | `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts`; `types/workspace/activeAgentWorkspaceTarget.ts` | selected context has exact state.runId. Standalone primarySummary calls getStandaloneRunSummary and rolls up collaborators/copies. Team chooses focused row; exact run summary is separate. Several delegated target kinds exist beyond hasTeam/isOrg helper recognition; TPS should derive direct target.context identity without expanding/fixing old summary selectors |
| E3 | `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | Five supported runtime kinds: autobyteus, codex_app_server, claude_agent_sdk, antigravity_cli, grok_build |
| E4 | `autobyteus-ts/src/agent/loop/llm-phase.ts` lines ~204–218; `src/llm/utils/llm-token-usage-observation.ts`; server `src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts` ~173–187 | Native LlmPhase emits usage for activeTurnId/call with model identity when available. Converter reports model call and preserves event timestamp. No generic inference duration in usage contract; providers may have missing counts |
| E5 | server `src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`; `backend/codex-agent-run-backend.ts` ~240–290 | thread/tokenUsage/updated uses total/last, cumulative_snapshot or per_call, with turn/model and reports_model_call. Context-only compaction updates can repeat cumulative totals; raw counts cannot be directly summed in frontend |
| E6 | server `src/agent-execution/backends/claude/session/claude-call-usage-tracker.ts`; `claude-session-token-usage.ts` | Main-loop message_start/model paired with message_delta final counts, excludes parent_tool_use_id subagent frames; emits reports_model_call=true. Turn-end result emits reports_model_call=false and reconciles potentially multi-model cumulative SDK data; must not be TPS output or identity source |
| E7 | server `src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` ~109–166 | DONE agent_response step reports per-call input/output/thinking and configured runtime model; active text arrives earlier but usage only DONE. No common duration |
| E8 | server `src/agent-execution/backends/grok/grok-build-call-usage.ts` | ACP response_completed output counts form per-call usage, reports_model_call=true, model from session; turn totals excluded. Reasoning inside output, not extra output |
| E9 | server `src/agent-execution/domain/agent-run-token-usage.ts`; `src/token-usage/projections/token-usage-component-basis-resolver.ts`, `domain/token-usage-component-basis.ts`, `projections/token-usage-run-fold.ts`, `token-usage-snapshot-delta-normalizer.ts`; `services/token-usage-run-accumulator.ts` | observed_at is source timestamp or normalization-time date. Canonical meter_delta_output_tokens derives accounted/billable output; server folds cumulative deltas, suppresses duplicates, flags regressed/missing evidence. Exact run summary revision advances once per saved observation; duplicates can have zero contributions with unchanged revision; no frontend counter reconciliation needed |
| E10 | `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts`; `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`; server `src/agent-collaboration/execution/events/agent-presentation-message-projector.ts`, `collaboration-agent-presentation-adapter.ts` | Presentation payload carries observed_at, turn, model, delta, reports_model_call, quality flags and exact run summary. Unlike standalone payload, it omits top-level runtime_kind. Exact event summary contains latest_runtime_kind; do not use cost-rollup/config to fill an observed identity. No shared schema extension required |
| E11 | web `stores/tokenUsageMeterStore.ts`, `stores/tokenUsageCompactionMarks.ts`, `services/agentStreaming/handlers/tokenUsageHandler.ts` | Meter owns live and record-backed updates, de-dupes event keys, revision-orders exact summaries; transient compaction helper is precedent. Live applyTokenUsageUpdated and applyTeamTokenUsage are two intake boundaries. Record-backed fetch/upsert must never seed TPS |
| E12 | web `services/agentStreaming/AgentStreamingService.ts`, `TeamStreamingService.ts` ~327–407, `teamStreamDtoAdapters.ts`, `agentStreamMessageProjector.ts`; `services/teamExecution/teamExecutionViewState.ts` ~432–447 | Standalone dispatch→usage handler→meter. Team applies validated exact member effect `record_team_token_usage` then `dispatch_agent` (second handler call); rate intake must de-dupe and not double advance. Snapshot is not usage sample stream |
| E13 | web `services/agentOrgExecution/agentOrgExecutionContext.ts` ~210–236; `services/agentCollaboration/agentRunCollaborationContext.ts` ~128–137 | Org and collaboration children validate run/address then dispatch presentation-adapted token event to common meter. Active workspace target preserves these exact run identities |
| E14 | web `components/workspace/usage/tokenUsageFormatting.ts`, `localization/messages/en/shell.ts`, `zh-CN/shell.ts`, colocated panel/store/composable specs; server `tests/e2e/runtime/agy-token-usage-transport.e2e.test.ts`, `tests/fixtures/agy-failure-cli.mjs`; web `tests/e2e/token-statistics-ui-probe.mjs` | Existing locale and testing surfaces. Scripted AGY usage_report fixture exists, but existing fixture's cross-turn reports alone cannot prove same-turn TPS; use an isolated multi-call turn fixture/probe. Existing browser probe is adjacent Settings proof, not TPS evidence |

## Relevant Existing Behavior And Supported Product Paths
BEH-001: user selects Token, sees totals/context/pricing (E1).
BEH-002: user changes focused workspace AgentRun; existing scope hydrates standalone roll-up or exact member summary (E2/E13). TPS has no current supported behavior, new trigger approved in R1/SR-001.
BEH-003: agent receives input, model generates/calls tools, usage observations flow through normalization/persistence into selected streams; meter updates at usage report cadence (E3–E12).
BEH-004: saved-history selection/fetch supplies aggregate summary, not a timing series; reconnection can miss events and changed runtime/model choices can update context (E2/E9/E12/E13). The user explicitly requested honest lack-of-evidence handling.
Scenario validity and product sequences: R1 SCN-001–004. Synthetic payloads will reproduce these supported paths, not establish extra product scope.

## Structural And Payload Surface Inventory
Payload surfaces: new localized copy/help and regression fixtures; no external/provider payload change.
Structural surfaces potentially used: web meter live intake/helper, local view types, scope projection and card. Server usage normalization, strict presentation/team contracts and transports can already carry required evidence and remain unchanged.
Potential impacts resolved: no new API, persistence schema, migration, security boundary, deployment config, runtime lifecycle control, global history reads or provider calls. Local transient view state only. Existing team duplicate intake and exact summary identity are relevant correctness obligations, not new coordination machinery.

## Runtime, Probe, Or Reproduction Findings
Only original user screenshot visually inspected: selected delivery engineer, codex_app_server, latest model gpt-6-astra, 26 usage reports; no TPS. This establishes current UI/use case, not a measurement or changed-source validation.
No browser/server/live provider or executable validation run in this authoring phase. No processes/test data created. Repository tools were read-only except isolated task docs. Downstream must supply actual changed-build evidence, not cite old screenshot/tests as a pass.

## Runtime Support Matrix (Code-Evidenced, NOT Execution-Verified Here)
| Runtime | Available numerator/source | Timing and limitations |
|---|---|---|
| autobyteus | canonical output per native LlmPhase, provider-dependent availability | server observed timestamps; two compatible reports in one turn needed; output quality depends on provider |
| codex_app_server | server-folded output delta from thread usage | cumulative normalization already owned server-side; reject broken accounting evidence/context-only reports; no rate from first/only report |
| claude_agent_sdk | main-loop paired message_start/message_delta output | excludes subagent/result remainder; model is reported API raw ID, may differ from configured alias; context read can delay report |
| antigravity_cli | DONE agent_response output | counts delayed until DONE; model from runtime binding; missing per-step usage gives no estimate |
| grok_build | response_completed per-call output | only emitted call usage; no numeric promise if extension/source absent |
All: interval includes tools, waits, prompt handling and report overhead. No generic inference-only timestamps. Strict same turn prevents including idle between user turns. Method has no hard-coded model allowlist, but missing identity/count/time is unavailable. No real runtime/model pair was tested by Solution Designer.

## Persisted Data And State Facts
Stored usage is server-owned per-run aggregate/compact state (E9), not a reconstructable generic report timing series. This feature will not change readers/writers/records. No user data inspected or copied. Data volume irrelevant because no scan/migration. Ephemeral sample loss on renderer reload is explicitly accepted by R1; no TPS backfill.

## Product Design Request Context / Findings
Not stated as a request for Product Team assistance. Existing panel visual language is sufficient. External Product artifacts, UI/UX approval and review URL: N/A — not applicable. Screenshot is current evidence only.

## Supplemental Artifact Inventory
| Absolute artifact | Owner | Purpose / scope | Related IDs | Status / approval |
|---|---|---|---|---|
| /home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_b91ece4e-98ad-4694-b51b-4a5967905ca4/context/ctx_a0fdcd22397a__ctx_473cdd5a37a6_image.png | User/Task context | Current Token UI | BEH-001,002 | Read; evidence only |
No other supplements at design handoff. Future runtime/test evidence belongs to downstream owners.

## Architecture Investigation Findings (After R1 Approval)
Reconfirmed clean isolated branch except owned docs, read stream contracts and traced E9–E14 end-to-end. The meter is already the authoritative browser owner; small estimator kept behind it can serve all stream routes. Most important pitfalls: standalone summary is roll-up; presentation payload drops runtime_kind but preserves exact summary runtime; Team delivers same event twice through different intents; reading-only/Claude result events advance revisions without a model call. A new shared telemetry contract or persistence owner is unnecessary.
The exact run summary's revision/usage_report_count and output_tokens can verify continuous single-call contribution: revision advancement, model-call count +1 across eligible calls and output cumulative advancement matching later delta; maintain revision across non-call observations. Any inconsistency may safely restart collection, not repair accounting.
No relevant structural issue requires refactoring existing accounting or workspace selection. A separate existing helper's incomplete classification of delegated kinds in usage-total scope is visible in E2 but not demonstrated as a user-facing defect here; do not broaden this ticket to repair/alter total reporting. All TPS selection uses target.context across the union.

## Assumptions, Unknowns, Risks And Requirement Implications
- RSK-001: clocks or batching distort elapsed wall interval. Guard missing/nonpositive/nonfinite durations; always mark estimate, no inference claim.
- RSK-002: single-call turns cannot provide a pair; explicitly documented non-goal, not hidden coverage failure.
- RSK-003: missing events/counts break continuous comparison; re-baseline rather than guessed catch-up. Delayed but ordered reports use server timestamps, never arrival-time bursts.
- RSK-004: runtime/model attribution must use exact event sample and distinct card, not aggregate latest fields/config alias.
- RSK-005: executable and rendered evidence still pending downstream; report runtime matrix honestly.
No remaining design-blocking evidence gap. Technical design and classification are in design-spec.md, not inferred from this factual log.
