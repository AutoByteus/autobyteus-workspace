# Native TODO Capability Removal

## Removed

- Removed the native `autobyteus-ts` personal TODO tools: `create_todo_list`, `add_todo`, `get_todo_list`, and `update_todo_status`.
- Removed the transient native TODO model, runtime state, notifier/event, stream payload, and AutoByteus-native TODO mapping.

## Preserved

- File tools and skills remain the supported way for native agents to maintain workspace task files.
- Server/Codex `TODO_LIST_UPDATE` progress, WebSocket mapping, web TODO handling, generic tools, and server task delegation remain supported.

## Compatibility And Data

- No persisted-data migration is required; the removed native TODO state was in-memory only.
- Consumers importing the intentionally removed native TODO classes, barrels, event names, or stream types must migrate to file/skill-based task tracking.

## Validation

- Changed-boundary validation passed: native 7-file/32-test focus, native build, server 4-file/96-test focus, source-only server typecheck/build, preserved server E2E and task-delegation integration, built Codex-to-WebSocket TODO mapping, and web TODO handler/stream tests.
- The server package typecheck and full native Vitest commands remain red due to confirmed unchanged repository configuration/environment origins; these are explicitly not clean-pass claims.
