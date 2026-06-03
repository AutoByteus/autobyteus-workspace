# Requirements: read_media_file Tool Continuation Media Regression

Status: Design-ready

## Problem

`read_media_file` in `autobyteus-ts` appears to execute but no longer causes the selected media file to be available to the LLM on the follow-up turn. The user reports this started within the last 2-3 days after recent refactoring. The investigation must compare earlier working code with current code before deciding the fix.

## Scope

- Current project: `autobyteus_rpa_llm_workspace` must remain on latest `origin/main`.
- Workspace superrepo: `autobyteus-workspace-superrepo` and the ticket worktree must remain on latest `origin/personal`.
- Primary suspected area: `autobyteus-ts` tool-result continuation path for `ContextFile` results from `read_media_file`.
- Related server area to verify: `autobyteus-server-ts` context-file and websocket media input handling.
- Preserve the recent canonical tool-history/memory ingestion design; do not restore the entire removed synthetic continuation formatter as the primary continuation path.
- Keep the fix focused on media `ContextFile` results and request-mode selection.

## Acceptance Criteria

- AC-001: Current code is compared with an earlier working/pre-refactor version for the relevant runtime path.
- AC-002: The root cause is recorded with specific file/function evidence.
- AC-003: `read_media_file` returning a `ContextFile` for small audio and small video files is covered by tests, including workspace-relative path resolution and inferred file types.
- AC-004: A tool-result continuation containing one or more media `ContextFile` results preserves those files on `AgentInputUserMessage.contextFiles`.
- AC-005: A media-bearing tool continuation attaches those files to the next LLM request as `image_urls`, `audio_urls`, and/or `video_urls` instead of dropping them.
- AC-006: Existing canonical tool-history continuations without media remain `tool_history_only`.
- AC-007: Tool-history/memory ingestion remains active for media-bearing and no-media tool continuations.
- AC-008: Related server/web attachment paths are reviewed and any separate media URL gaps are recorded.
- AC-009: Focused unit/integration tests pass in `autobyteus-ts`, and any applicable server tests pass or are explicitly ruled out with rationale.

## Non-Goals

- Reworking upload threshold policy for small vs large files.
- Replacing current context-file upload storage or staging services.
- Adding websocket `audio_urls`/`video_urls` SEND_MESSAGE support unless it becomes necessary for the `read_media_file` continuation bug.
- Changing provider-level media encoding behavior.
