export const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

export const SEND_MESSAGE_TO_TOOL_DESCRIPTION =
  "Send a self-contained message to a reachable team recipient. Provide exactly one target selector: recipient_name for a logical roster recipient, or target_agent_run_id for an exact active/recoverable AgentRun such as a delegated task-agent run. Use reference_files for files that should be projected with the Team Communication message.";

export const SEND_MESSAGE_TO_FIELD_DESCRIPTIONS = {
  recipientName: "Logical recipient name from the team roster. Provide either recipient_name or target_agent_run_id, never both.",
  targetAgentRunId: "Exact active/recoverable AgentRun id reachable in this team boundary, for example a task-agent run id from a task packet, task event, or prior message. Provide either target_agent_run_id or recipient_name, never both.",
  content:
    "Self-contained message body to deliver. Explain the handoff like an email body; you may naturally mention important absolute paths here, and also put files that should appear under the Team Communication message in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'",
  messageType: "Optional message type label.",
  referenceFiles:
    "Optional attachment/reference list of absolute local file paths the recipient may need to inspect and that should appear in Team Communication messages. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].",
} as const;
