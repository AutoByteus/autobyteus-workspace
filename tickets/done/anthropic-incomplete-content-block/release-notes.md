# Release Notes — anthropic-incomplete-content-block

## Fixed

- Claude agents on the AutoByteus runtime no longer stop with "Anthropic content block is incomplete." when one answer or tool call is long, such as writing a large file with `write_file`. Requests used to be capped at 8,192 output tokens. They now allow the model's full output limit (128,000 tokens for Claude Opus 5.5).
- If a response still hits the output limit, the agent recovers on its own. A tool call that was cut off is discarded and never run, and the agent continues in smaller pieces. Text that was cut off is kept and the agent picks up where it stopped. This happens up to 3 times in a row. After that, the turn stops with a clear error that names the limit, and your next message works normally.
- A tool call whose arguments the model garbled is no longer run with empty arguments. The model is told the call was malformed and tries again.

## Improved

- If you don't set Max Tokens, every AutoByteus-runtime provider now uses the model's own maximum output limit. Before, some providers used a much lower default. A value you set yourself is still sent unchanged.
- DeepSeek and GLM now receive the output limit under the parameter name they support (`max_tokens`), so a Max Tokens setting applies there.
- When the model refuses, a content filter stops a response, or the conversation is too long for the model's context window, the turn ends with a clear error that says which one happened. No tool is run.
- Each automatic recovery attempt gets its own entry in the Token Meter.
- With a Gemini model, memory compaction makes only one attempt again, as intended, even when your model settings set their own retry options.
