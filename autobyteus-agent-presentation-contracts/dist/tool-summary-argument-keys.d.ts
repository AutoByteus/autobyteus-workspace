/**
 * The tool-call argument names whose value is a call's one-line summary, by kind (autobyteus-609 D-E): the one list the web's
 * summary (`getToolDisplaySummary`) and the node's earlier-trace page cards read, so the two cannot drift. Within a kind the
 * first present key wins; the web tries the kinds in this order: command, file, recipient, task, text.
 *
 * Antigravity's own tools name their arguments in PascalCase and the node passes them through as they are
 * (`agy-stream-event-converter.ts`; the tools and arguments the node reads: `antigravity-translation.ts`), autobyteus-590:
 * `run_command` CommandLine; `read_file` Path; `view_file` AbsolutePath; `write_to_file` and `replace_file_content`
 * TargetFile; `list_dir` DirectoryPath; `grep_search` Query; `find_by_name` Pattern. A search's folder (SearchPath,
 * SearchDirectory) is not a summary key: a file key would win over the query, and what it looks for says more.
 *
 * The platform's agent tools (autobyteus-590 DEC-006): whom a message or a delegation addresses (`recipient`), and which
 * Task a Task tool reads or changes (`task`).
 */
export declare const TOOL_SUMMARY_ARGUMENT_KEYS: Readonly<{
    file: readonly ["path", "file_path", "filepath", "filename", "target_path", "Path", "AbsolutePath", "TargetFile", "DirectoryPath"];
    command: readonly ["command", "cmd", "script", "CommandLine"];
    recipient: readonly ["recipient_address"];
    task: readonly ["task_id"];
    text: readonly ["query", "Query", "Pattern", "prompt", "url", "message", "text", "title", "name", "raw"];
}>;
export type ToolSummaryArgumentKind = keyof typeof TOOL_SUMMARY_ARGUMENT_KEYS;
export type ToolSummaryArgumentKey = (typeof TOOL_SUMMARY_ARGUMENT_KEYS)[ToolSummaryArgumentKind][number];
//# sourceMappingURL=tool-summary-argument-keys.d.ts.map