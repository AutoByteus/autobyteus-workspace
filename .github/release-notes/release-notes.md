# Release Notes — Tool Result Continuation Wording and RPA Media Repeats

## Summary

This update fixes tool-result continuation prompts so completed tool calls are described to the model with concise semantic wording instead of internal continuation labels.

## Fixes

- Replaced model-visible `Tool history continuation` / `Native API tool continuation` carrier text with completed-tool wording such as `The read_media_file tool call completed successfully.`
- Preserved media context files on the next model request so `read_media_file` audio/image/video results remain available without reattaching historical media.
- Kept native/API text-only tool continuations on structured tool-result history without adding redundant aggregate user prompts.
- Updated AutoByteus/RPA rendering so text-only trailing tool results produce one deterministic `Tool result:` record plus minimal current-user completed-tool wording, avoiding duplicate result blocks.
- Ensured generated continuation text does not add XML, markdown backtick, or future tool-call formatting guidance.

## Validation

- Focused renderer, builder, loop/pipeline, integration, and TypeScript checks passed before delivery.
- Delivery re-ran the corrected TS checks after integrating latest `origin/personal`.
- A temporary live RPA media probe against the original audio path proceeded to transcript output without repeating `read_media_file`.

## Note

Final browser cache-hit composition for text-only RPA tool results remains owned by the linked RPA server worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition`.
