# Investigation Notes — Direct Gemini `.m4a` Media Tool Result Input

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements and design refined after user clarification and design-principles/examples re-read.
- Investigation Goal: Determine why `read_media_file` succeeds for `.m4a` but the following direct Gemini 3.1 Pro Preview request appears text-only / has tiny input-token count.
- Scope Classification (`Small`/`Medium`/`Large`): Medium-small
- Scope Classification Rationale: The confirmed bug crosses tool-result continuation and provider rendering, but the actual code change should be a focused media-policy refactor plus renderer behavior/coverage.
- Scope Summary: Remove duplicated media extension authority, support `.m4a` consistently, and prevent direct Gemini from silently dropping declared media.
- Primary Questions Resolved:
  - `read_media_file` works and returns a `ContextFile`.
  - `.m4a` is accepted by context-file typing but rejected by Gemini media payload validation.
  - The low token count is explained by Gemini receiving text/tool history without the audio media part.
  - This is a design issue because media support policy is duplicated and contradictory.

## Request Context

User reported a bug after running AudioTranscriber with Gemini 3.1 Pro Preview. The agent called `read_media_file` for `/Users/normy/church/meetings/26-Juni-20-12-tonggong-meeting_parts/26-Juni-20-12-tonggong-meeting_part1.m4a`, but Token Meter showed implausibly small input for a >36 minute audio file.

Important correction from user on 2026-07-03: this was **not RPA**. The relevant path is direct Gemini 3.1 Pro Preview provider rendering.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a4f787fd046744d4a706c839451b286c/solution_designer_02a3273b503a472898a2eb2a07868b2b/context_files/ctx_c2cf46d8d5d6__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a4f787fd046744d4a706c839451b286c/solution_designer_02a3273b503a472898a2eb2a07868b2b/context_files/ctx_236c297dde51__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input`
- Current Branch: `codex/gemini-media-tool-result-input`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed during bootstrap and was refreshed after recovery.
- Task Branch: `codex/gemini-media-tool-result-input`, refreshed to `origin/personal` commit `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: `.env.test` was copied into `autobyteus-ts/.env.test` and `autobyteus-server-ts/.env.test`. Do not print or commit secret contents. Temporary investigation symlinks/probe files were removed.

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-02 | Command | Initial `pwd`, `git rev-parse`, `git status`, `git remote -v` in shared checkout | Discover repo state | Shared checkout was branch `personal` tracking `origin/personal`. | No |
| 2026-07-02 | Command | `find . -maxdepth 3 -type f -name '.env.test'` | Locate env files for experiments | Found `autobyteus-ts/.env.test` and `autobyteus-server-ts/.env.test`. | Copied to worktree |
| 2026-07-02 | Setup | `git fetch origin --prune`; `git worktree add -b codex/gemini-media-tool-result-input ... origin/personal` | Create dedicated task worktree | Worktree created. | No |
| 2026-07-03 | Setup | `git fetch origin --prune && git reset --hard origin/personal` | Recover after interruption | Worktree refreshed to `5832196cca5215f4771b29a72d4f3fe20a0a8d8b`. | No |
| 2026-07-03 | Data | `stat` / `du` on user `.m4a` | Confirm file exists and size | File size `26,794,681` bytes / `26M`. | Do not commit |
| 2026-07-03 | Code | `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts` | Inspect `read_media_file` | Tool validates path and returns `new ContextFile(absolutePath)`. | No |
| 2026-07-03 | Code | `autobyteus-ts/src/agent/message/context-file-type.ts` | Inspect context-file classification | `.m4a` maps to `ContextFileType.AUDIO`. | Delegate media cases to shared classifier |
| 2026-07-03 | Code | `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Trace tool-result media continuation | Collects `ContextFile`s from tool results. | Add `.m4a` test |
| 2026-07-03 | Code | `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Check LLM request mode | Tool continuation with context files uses `append_user_message`. | No |
| 2026-07-03 | Code | `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Check context file to LLM mapping | Audio context files become `LLMUserMessage.audio_urls`. | No |
| 2026-07-03 | Code | `autobyteus-ts/src/agent/llm-request-assembler.ts` | Check request assembly | Appends media-bearing user message before render. | No |
| 2026-07-03 | Code | `autobyteus-ts/src/llm/utils/media-payload-formatter.ts` | Inspect Gemini media source conversion dependency | `isValidMediaPath()` has a duplicate media extension allowlist that omits `.m4a`; `mediaSourceToBase64()` therefore rejects local `.m4a`. | Refactor |
| 2026-07-03 | Code | `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Inspect direct Gemini rendering | Media conversion errors are caught/logged and media is skipped, producing possible text-only requests. | Make failure explicit |
| 2026-07-03 | Test/Probe | Temporary `tests/tmp-media-probe.test.ts`, removed after run; `pnpm -C autobyteus-ts exec vitest run tests/tmp-media-probe.test.ts --pool=forks --fileParallelism=false` | Confirm `.m4a` bug | `.m4a`: MIME `audio/mp4`, `isValidMediaPath=false`, `mediaSourceToBase64` throws; Gemini `.m4a` has text-only part; `.mp3` has inlineData. | Add durable tests |
| 2026-07-03 | Test | Focused existing tests: formatter, Gemini renderer, continuation integration, etc. | Baseline | Existing tests pass except one unrelated env-sensitive AutoByteusClient default-host assertion under copied `.env.test`; existing tests do not cover `.m4a` Gemini rendering. | Add coverage |
| 2026-07-03 | Skill/Design | `design-principles.md`; `references/design-examples.md` | User explicitly requested design-principles/examples-based redesign | Design should be spine-first, with one authoritative boundary for shared media classification, no duplicate policies, removal of obsolete lists, and no silent fallback. | Design revised |

## Current Behavior / Current Flow

Direct Gemini current flow:

`User request -> AgentTurnRunner -> ReadMediaFile -> ContextFile(.m4a/AUDIO) -> ToolResultContinuationBuilder -> AgentInputPipeline -> LLMUserMessage.audio_urls -> LLMRequestAssembler -> GeminiPromptRenderer -> mediaSourceToBase64 -> isValidMediaPath -> failure -> logged and skipped -> text-only Gemini request`

Current ownership observations:

- `ReadMediaFile` owns path validation and `ContextFile` production. It is not the failing owner.
- `ContextFileType` currently owns one media extension list.
- `media-payload-formatter` currently owns another media extension list.
- `GeminiPromptRenderer` owns Gemini request shape but currently tolerates media conversion failure by silently skipping media.

Current behavior summary: The direct Gemini request can lose `.m4a` media after correct tool/context handling because the provider media formatter rejects `.m4a` and the renderer suppresses the error.

## Design Health Assessment Evidence

- Change posture: Bug Fix with required small refactor
- Candidate root cause classification: Duplicated Policy Or Coordination + Shared Structure Looseness + Missing Invariant
- Refactor posture evidence summary: Refactor needed now; otherwise adding `.m4a` to a second list leaves the same architecture smell.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `ContextFileType.fromPath()` | `.m4a` is audio | Upstream media classification accepts file | Use shared classifier |
| `media-payload-formatter.isValidMediaPath()` | Duplicate allowlist omits `.m4a` | Contradictory authority over same subject | Remove duplicate list |
| `GeminiPromptRenderer` | Catches conversion error and continues | Silent media loss; missing invariant | Fail declared media conversion explicitly |
| Design examples/principles | Repeated structures should be extracted and tightened; authoritative boundary rule applies | Need one media classification owner and explicit dependency rules | Revise design |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/tools/multimedia/media-reader-tool.ts` | `read_media_file` implementation | Correctly returns `ContextFile` | No root fix here |
| `autobyteus-ts/src/agent/message/context-file-type.ts` | Context file type inference | Duplicates media extension policy | Delegate media to shared classifier |
| `autobyteus-ts/src/agent/loop/tool-result-continuation-builder.ts` | Tool result continuation | Preserves `ContextFile`s | Add `.m4a` regression coverage |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | LLM input mode | Uses `append_user_message` when context files exist | Existing behavior is correct |
| `autobyteus-ts/src/agent/message/multimodal-message-builder.ts` | Maps context files to LLM media arrays | Audio goes to `audio_urls` | Existing behavior is correct |
| `autobyteus-ts/src/llm/utils/media-payload-formatter.ts` | Media conversion | Rejects `.m4a` due duplicate list | Use shared classifier |
| `autobyteus-ts/src/llm/prompt-renderers/gemini-prompt-renderer.ts` | Gemini request rendering | Logs/skips media conversion error | Surface error; no text-only downgrade |
| `autobyteus-ts/tests/unit/agent/message/context-file-type.test.ts` | Context-file type tests | Does not assert `.m4a` path today | Add coverage |
| `autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts` | Formatter tests | Covers `.mp3` but not `.m4a` | Add coverage |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Gemini renderer tests | Does not cover media input | Add `.m4a` inlineData and failure behavior tests |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | Tool-result media integration | Uses `.mp3` audio today | Add or switch to `.m4a` audio |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-03 | Data | `stat` / `du` user `.m4a` | `26,794,681` bytes / `26M` | File exists; bug is not missing file |
| 2026-07-03 | Probe | Temporary Vitest media probe | `.m4a` MIME `audio/mp4`, invalid in formatter, text-only Gemini render; `.mp3` renders inlineData | Confirms direct Gemini `.m4a` drop |
| 2026-07-03 | Test | Focused existing test run | Existing coverage misses `.m4a`; one env-sensitive unrelated failure under copied `.env.test` | Add targeted durable tests |

## External / Public Source Findings

No external web research was required. The defect is in local code: direct Gemini renderer cannot reach provider media input because local media validation rejects `.m4a` before the SDK call.

## Reproduction / Environment Setup

- Durable tests can use small synthetic `.m4a` files in temp directories; real audio content is not needed to validate request construction.
- `.env.test` is available for optional live Gemini API/E2E, but secrets must not be printed or committed.
- Temporary investigation files were removed.

## Findings From Code / Docs / Data / Logs

1. `read_media_file` works.
2. Same-turn continuation works.
3. `.m4a` classification works in `ContextFileType`.
4. Direct Gemini media payload conversion rejects `.m4a` because of duplicated media extension policy.
5. Gemini renderer suppresses the conversion failure, causing text-only requests.
6. Design principles/examples point to a small refactor: one authoritative media classifier, explicit ownership/dependencies, decommission duplicate lists, no compatibility fallback.

## Constraints / Dependencies / Compatibility Facts

- Do not commit private user audio or `.env.test` values.
- Do not keep duplicate media extension allowlists.
- Do not silently continue without declared media.
- Preserve existing supported `.mp3`, image, and video behavior.

## Open Unknowns / Risks

- If after the fix Gemini usage metadata still appears low despite confirmed `inlineData`, that is a separate provider usage-reporting follow-up.
- Existing invalid media references that were previously ignored may now fail; that is expected and should produce clear errors.

## Notes For Architect Reviewer

The revised design removes RPA scope after user clarification. The key architecture decision is the authoritative media classifier. This is the exact design issue: two owners currently answer the same question differently. The target design should make media classification a bounded off-spine concern that serves both the context-file owner and the provider payload formatter, while Gemini renderer remains the provider-shape owner and must not silently drop declared media.
