## Fixes
- **Claude no longer stops with "Anthropic content block is incomplete."** on long answers or long tool calls, such as writing a large file with `write_file`. Requests were capped at 8,192 output tokens; they now allow the model's full output limit (128,000 tokens for Claude Opus 5.5).
- **Automatic recovery when a response hits the output limit.** A tool call that was cut off is discarded and never run, and the agent continues in smaller pieces. Text that was cut off is kept, and the agent picks up where it stopped. This happens up to 3 times in a row. After that, the turn stops with a clear error that names the limit, and your next message works normally.
- A tool call whose arguments the model garbled is no longer run with empty arguments. The model is told the call was malformed and tries again.
- **Security:** a crafted owner ID in a context-file request could reach another agent's attached files. Every context-file request now rejects such IDs and filenames, and a malformed request no longer touches any file.
- With a Gemini model, memory compaction makes only one attempt again, as intended.

## Improvements
- If you don't set Max Tokens, every AutoByteus-runtime provider now uses the model's own maximum output limit. A value you set yourself is still sent unchanged. DeepSeek and GLM now receive it under the parameter name they support.
- When the model refuses, a content filter stops a response, or the conversation is too long for the model's context window, the turn ends with a clear error that says which one happened. No tool is run.
- Each automatic recovery attempt gets its own entry in the Token Meter.
- **New Manage Skill Sources dialog** (Skills → Sources):
  - Each source is one compact row with its skill count and a copy button for the path or URL.
  - One **Add skill source** box takes a folder path or a GitHub URL.
  - In the desktop app, **Browse…** fills in a folder path.
  - GitHub sources are checked when the dialog opens, and **Update** appears only when an update is available.
  - Focus stays inside the dialog, and Esc closes it.

## Changed
- For integrations: malformed context-file requests (traversal or padded owner IDs, unknown descriptor fields, invalid filenames) now get `400` with a `detail` message instead of 200, 204, 404 or 500. The app's own requests are unaffected.

## Notes
- No reset or data migration is needed.
