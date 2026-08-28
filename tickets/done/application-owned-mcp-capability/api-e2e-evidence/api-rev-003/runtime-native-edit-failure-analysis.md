# API-REV-003 Runtime Native-Edit Failure Analysis

## Direct observation

The supported Brief Studio browser surface launched the unchanged shipped `codex_app_server` / `gpt-5.6-luna` Team twice for the same selected brief. In both attempts:

1. `/researcher` called `get_brief_context({})` exactly once as its first tool call and received the matching binding-derived brief.
2. The actual model then reasoned that the required provider-native `edit_file` operation was unavailable in its current tool context.
3. It correctly used `send_message_to` to fail closed; it made no `run_bash`, `read_file`, `write_file`, `edit_file`, or `publish_artifacts` call.
4. `/writer` called `get_brief_context({})` exactly once after the blocker handoff, detected the incomplete handoff, and failed closed without file or publication work.
5. The application database retained both launch bindings but zero artifacts and zero artifact revisions. The same browser brief remained `not_started` with `0` draft outputs and `0` final outputs.

## Boundary inference for focused review

Production Codex event conversion can normalize a provider-emitted file-change event to `edit_file`; that normalization does not itself prove that the shipped role text caused a provider file-change event. The real provider emitted none in two independent UI launches. The maintained prompts name `provider-native edit_file`, while the actual model explicitly treated that operation as unavailable. This is direct evidence of a remaining reachable model-facing/provider-operation contract mismatch, not a mocked or direct-MCP result.

Preliminary origin: **Design Impact / maintained role contract**, pending `/code_reviewer` focused failure-origin review. The corrected workflow needs a model-facing instruction that maps to the actual provider-visible native file-change primitive while preserving normalized `edit_file` trace evidence, no shell/ordinary-file fallback, relative publication, and fail-closed semantics. API/E2E must not silently edit that contract or substitute direct provider calls.
