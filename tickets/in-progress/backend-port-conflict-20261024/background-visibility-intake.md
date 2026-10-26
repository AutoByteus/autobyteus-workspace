# Background-work visibility — proposed follow-up intake

Date: 2026-10-26. Originating package: backend-port-conflict-20261024; saved task project_task_8a0359c2-3b8e-47f1-a14a-d18d1459d8ca, requested by /project_task_manager. This is a proposed extension, not an approved amendment to R1/D3.1/SR-006 or implementation-ready design.

## User direction
Code Reviewer relays the user's exact request: “do you think we could do that as well? in general, i feel like background process could be shown in teh frontend, and it gives mroe transparency you know”. Preceding question compared Codex background visibility with Claude. User direction is transparency into application-tracked background work, not permission for arbitrary OS-process scanning, stop buttons, provider rewrites or changed agent/idle lifetimes.

## Recommendation and approval boundary
Recommend a separate follow-up task, leaving current shutdown/conflict validation uninterrupted. Current work has independent source-review Pass CRR-002 at5fd30310e and is already with API/E2E; no pass is reversed. Adding frontend tracking now would alter approved scope and its acceptance surface. Ask user directly to confirm a separate task, starting with Codex in the existing background-task panel; do not create/delegate or authorize implementation before that scope decision. Broader native-provider coverage can be considered in that task's investigation, not silently promised as universal support.

Proposed first scope: read-only visibility of provider/application-tracked background commands, associated with the originating agent/run; a useful safe description/command summary and truthful running/completed/failed/stopped status only when evidence supports it. Assistant-turn completion must never be treated as process completion. Unsupported/unavailable tracking must not imply an empty process inventory. No new stop control, global OS process list, log streaming, historical persistence or idle-policy change is included by default. These are candidate requirements for the new task, not final technical design.

## Current evidence
Inspected at5fd30310e in /Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024, branch task/backend-port-conflict-20261024. Recorded original base origin/personal@034bfe51ab697817773ff545d369e1cfc03a79c5; no rebase/merge/release/install performed.
- Existing web components/progress/BackgroundTaskPanel.vue reads activeAgentContext run ID, displays per-run counts, description, optional expandable command, status and terminal summary. It is not a global inventory and has no stop button.
- web/services/agentStreaming/handlers/backgroundTaskHandler.ts maps BACKGROUND_TASK_UPDATED snapshots into stores/agentBackgroundTaskStore.ts. That store is runtime-only, starts empty after reload and upserts by task ID; reload/reconnect correctness needs investigation, not a persistence assumption.
- server agent-execution/backends/claude/session/claude-background-task-registry.ts owns Claude task state/identity/command correlation and snapshot callback. It explicitly does not infer completion just from absence in a task-set update.
- server agent-execution/backends/codex/backend/codex-agent-run-backend.ts:105-108 returns false from hasRunningBackgroundTasks; current adapter has no corresponding background-terminal list integration (source investigation and Code Reviewer report). Changing this method could affect lifecycle behavior, so frontend visibility must not incidentally change idle policy.
- SR-006 codex-background-investigation.md/P-011 measures actual Codex0.164.0 exec_command with deterministic local model responses: start/completion events, completion after turn end and experimental list/stop APIs. Six probe cases pass. This is version-specific tracked-session evidence, not all-descendant tracking, arbitrary OS PID authority, full host acceptance or proof of the historical Nuxt failure's cause. Provider processId was opaque and osPid null.

## Required investigation before design
Trace provider event identity through existing converter/stream/reconnect/frontend consumers; distinguish long-running background command from ordinary foreground command; handle missing/late/duplicate terminal evidence, reconnection and unsupported API versions honestly; assess sensitive arguments/output before displaying new provider data; test running-after-turn and natural/failed/stopped outcomes using actual Codex tool fixtures. Keep data/agent-lifetime contracts unchanged unless explicitly approved. Reuse existing panel where appropriate, but no implementation mechanism has yet been selected.

## Constraints and status
Preserve all user data, unrelated edits, installed app and existing previews. New code/test work needs its own approved package/isolated workspace if the separate-task recommendation is accepted. Existing API/E2E-owned untracked reports/evidence and SDK dist outputs are untouched. This intake is not a new Product Design request/handoff; the user has requested a capability, not separate UI/UX design services.

Status: scope decision pending user. R1/D3.1/SR-006 unchanged. Suggested next action after confirmation: send this durable context to /project_task_manager to create and dispatch the follow-up under its project-task approval workflow. No current shutdown validation expansion or duplicate review forwarding.
