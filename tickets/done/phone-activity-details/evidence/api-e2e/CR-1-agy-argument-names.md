# CR-1: Antigravity argument names vs. the shared summary's keys (tree f411294735)

## The summary's keys (`autobyteus-web/utils/toolDisplaySummary.ts`)

```
const FILE_ARG_KEYS = ['path', 'file_path', 'filepath', 'filename', 'target_path', 'Path', 'AbsolutePath'];
const COMMAND_ARG_KEYS = ['command', 'cmd', 'script', 'CommandLine'];
const RECIPIENT_ARG_KEYS = ['recipient_address'];
const TASK_ARG_KEYS = ['task_id'];
const TEXT_ARG_KEYS = ['query', 'prompt', 'url', 'message', 'text', 'title', 'name', 'raw'];
```

Keys are matched exactly (`obj[key]`). Tool-name fallbacks: `isFileToolName` matches `write_file`, `edit_file`, `read_file`, `apply_patch`
(so `write_to_file` and `replace_file_content` do not match); `isCommandToolName` matches `bash`, `terminal`, `exec_command`, `run_command`.

## AGY passes its arguments through (`autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts:199-208`)

```
const parameters = agyRecord(info?.parameters);
...
arguments: name === "call_mcp_tool" ? mcpCall?.arguments ?? parameters ?? {}
  : structuredClone(nativeArguments ?? parameters ?? {}),
```

## The AGY tools and arguments the node knows (`autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/antigravity-translation.ts`)

| AGY tool | Arguments the node reads | Summary today |
| --- | --- | --- |
| `run_command` | `CommandLine`, `Cwd`, `IsDaemon`, `RunPersistent` | command (`CommandLine`) |
| `view_file` | `AbsolutePath`, `StartLine`, `EndLine` | file (`AbsolutePath`) |
| `read_file` | `Path`, `StartLine`, `EndLine`, `ContentOffset` | file (`Path`) |
| `write_to_file` | `TargetFile`, `CodeContent`, `Append` | **none** |
| `replace_file_content` | `TargetFile`, `TargetContent`, `ReplacementContent` | **none** |
| `grep_search` | `Query`, `SearchPath`, `Includes`, `IsRegex`, `CaseInsensitive` | **none** (`query` is lower-case) |
| `find_by_name` | `Pattern`, `SearchDirectory`, `Type`, `Extensions`, `Excludes` | **none** |
| `list_dir` | `DirectoryPath` | **none** |

The scripted AGY CLI's `native_arguments` case (`tests/fixtures/agy-native-arguments-turn.mjs`) records the same shapes
(`write_to_file {TargetFile, CodeContent, …}`, `replace_file_content {TargetFile, TargetContent, ReplacementContent, …}`,
`grep_search {SearchPath, Query, …}`, `find_by_name {SearchDirectory, Pattern, …}`, `list_dir {DirectoryPath}`), as does
`tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts:222` (`write_to_file` `{ TargetFile: "a.ts" }`).

## Consequence

An Antigravity run's file edits show only their tool name on the phone row (and on the conversation's tool card, which
reads the same summary): the founder's symptom for AGY file writes and edits. Proven on the phone in MSP-97
(`MSP-94-97-round1/MSP-97-native-tool-rows.png`).
