## What's New

- `edit_file` now accepts model-friendly context patches with a simple bare `@@` hunk header, so supported agents can make surgical changes without calculating line numbers.

## Improvements

- Edits use unique surrounding context, preserve unrelated file content, and retry safely when whitespace differs.
- The file-editing tool set is simpler: use `read_file`, `edit_file`, `write_file`, or `run_bash` without redundant replacement and insertion tools.

## Fixes

- Fixed valid context edits from models such as DeepSeek being rejected for omitting numeric unified-diff ranges.
- Ambiguous, malformed, or partially applicable patches continue to fail without partially modifying the target file.
