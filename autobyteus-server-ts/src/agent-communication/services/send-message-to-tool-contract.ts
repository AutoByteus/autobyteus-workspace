export const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

export const SEND_MESSAGE_TO_TOOL_DESCRIPTION =
  "Send a self-contained message using exactly one selector: recipient_address for a rooted /... or immediate-Team-relative ./... logical Agent-or-Team address, or target_agent_run_id for an exact currently active AgentRun id. Team addresses deliver through the configured coordinator ingress.";

export const SEND_MESSAGE_TO_FIELD_DESCRIPTIONS = {
  recipientAddress: "Rooted logical Agent-or-Team address using /... or immediate-Team-relative ./... syntax. Bare names are invalid. Provide either recipient_address or target_agent_run_id, never both.",
  targetAgentRunId: "Exact currently active AgentRun.runId. Provide either target_agent_run_id or recipient_address, never both. This selector is live-only: inactive, preallocated, recoverable, lazy-startable, or unknown run ids are rejected.",
  content:
    "Self-contained message body to deliver. Explain the handoff like an email body; you may naturally mention important absolute paths here, and also put files that should appear with the message in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'",
  messageType: "Optional message type label.",
  referenceFiles:
    "Optional attachment/reference list of absolute local file paths the recipient may need to inspect. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].",
} as const;
