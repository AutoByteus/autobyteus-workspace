const METHOD_RUNTIME_ALIAS_MAP: Record<string, string> = {
  "turn.started": "turn/started",
  "turn/completed": "turn/completed",
  "turn.completed": "turn/completed",
  "turn/diff_updated": "turn/diffUpdated",
  "turn.diff_updated": "turn/diffUpdated",
  "turn/diff/updated": "turn/diffUpdated",
  "turn/task_progress_updated": "turn/taskProgressUpdated",
  "turn.plan_updated": "turn/taskProgressUpdated",
  "turn/plan/updated": "turn/taskProgressUpdated",
  "item.created": "item/added",
  "item/created": "item/added",
  "item.updated": "item/delta",
  "item/updated": "item/delta",
  "item/started": "item/added",
  "item/tool_call": "item/tool/call",
  "item/toolcall": "item/tool/call",
  "item.toolCall": "item/tool/call",
  "item/completed": "item/completed",
  "item/agentMessage/delta": "item/outputText/delta",
  "item/output_text/delta": "item/outputText/delta",
  "item/output_text/completed": "item/outputText/completed",
  "item/outputText/outputDelta": "item/outputText/delta",
  "item.reasoning.outputDelta": "item/reasoning/delta",
  "item/reasoning/outputDelta": "item/reasoning/delta",
  "item/command_execution/request_approval": "item/commandExecution/requestApproval",
  "item/command_execution/approved": "item/commandExecution/approved",
  "item/command_execution/denied": "item/commandExecution/denied",
  "item/command_execution/started": "item/commandExecution/started",
  "item/command_execution/delta": "item/commandExecution/delta",
  "item/command_execution/completed": "item/commandExecution/completed",
  "item.commandExecution.outputDelta": "item/commandExecution/delta",
  "item/commandExecution/outputDelta": "item/commandExecution/delta",
  "item.toolCallApprovalRequested": "item/commandExecution/requestApproval",
  "item/file_change/started": "item/fileChange/started",
  "item/file_change/delta": "item/fileChange/delta",
  "item/file_change/completed": "item/fileChange/completed",
  "item/file_change/request_approval": "item/fileChange/requestApproval",
  "item.fileChange.outputDelta": "item/fileChange/delta",
  "item/fileChange/outputDelta": "item/fileChange/delta",
  "thread/token_usage/updated": "thread/tokenUsage/updated",
};

export const normalizeMethodRuntimeMethod = (method: string): string => {
  const normalized = method.trim();
  if (!normalized) {
    return normalized;
  }
  const pathNormalized = normalized.replace(/\./g, "/").replace(/\/+/g, "/");
  return METHOD_RUNTIME_ALIAS_MAP[pathNormalized] ?? METHOD_RUNTIME_ALIAS_MAP[normalized] ?? pathNormalized;
};
