import {
  SEND_MESSAGE_TO_LLM_DESCRIPTION,
  SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION,
  SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION,
} from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

export const SEND_MESSAGE_TO_TOOL_NAME = "send_message_to";

export const SEND_MESSAGE_TO_TOOL_DESCRIPTION = SEND_MESSAGE_TO_LLM_DESCRIPTION;

export const SEND_MESSAGE_TO_FIELD_DESCRIPTIONS = {
  recipientAddress: SEND_MESSAGE_TO_RECIPIENT_ADDRESS_DESCRIPTION,
  targetAgentRunId: SEND_MESSAGE_TO_TARGET_AGENT_RUN_ID_DESCRIPTION,
  content:
    "Self-contained work request, result, or specific blocker. State the requested work or outcome and relevant context; include important absolute paths here and put files the recipient should inspect in reference_files. Example: 'Implementation is ready. The handoff is at /Users/me/project/implementation-handoff.md and the test log is at /Users/me/project/test.log; please review the risks below.'",
  messageType: "Optional message type label.",
  referenceFiles:
    "Optional attachment/reference list of absolute local file paths the recipient may need to inspect. Use this in addition to self-contained content, not instead of explaining the handoff. Example: ['/Users/me/project/implementation-handoff.md', '/Users/me/project/test.log'].",
} as const;
