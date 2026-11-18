import type { FixtureRow } from "../acp/acp-fake-agent-harness.js";

/** The fake agent's rows for a DeepSeek Harness-shaped ACP agent (dsh 0.2.2-rc.1 frames, RT-001/RT-002). */

export const DSH_SESSION_ID = "a9af1152-1f29-48a3-99b2-41f3a0a4d2a1";

export const DSH_INITIALIZE_RESULT = {
  protocolVersion: 1,
  agentInfo: { name: "deepseek-harness-acp", version: "0.0.1" },
  agentCapabilities: {
    mcpCapabilities: { http: true },
    promptCapabilities: { image: false, audio: false, embeddedContext: false },
    sessionCapabilities: { close: {}, list: {}, resume: {} },
  },
  authMethods: [],
};

/** dsh's recorded config options (RT-008, with a key): the official route's models and the reasoning efforts. */
export const DSH_CONFIG_OPTIONS = [
  {
    id: "model", name: "Model", category: "model", type: "select",
    currentValue: "[\"deepseek-official\",\"deepseek-v4-flash\"]",
    options: [{
      group: "deepseek-official", name: "DeepSeek", options: [
        { value: "[\"deepseek-official\",\"deepseek-v4-flash\"]", name: "deepseek-v4-flash" },
        { value: "[\"deepseek-official\",\"deepseek-flash\"]", name: "DeepSeek-V4.1-Flash" },
        { value: "[\"deepseek-official\",\"deepseek-v4-pro\"]", name: "DeepSeek-V4-Pro", description: "Stronger agentic coding." },
      ],
    }],
  },
  {
    id: "reasoning_effort", name: "Reasoning effort", category: "thought_level", type: "select", currentValue: "high",
    options: [
      { value: "off", name: "Off" }, { value: "low", name: "Low" }, { value: "high", name: "High" }, { value: "max", name: "Max" },
    ],
  },
];

const request = (id: number, method: string): FixtureRow => ({ dir: "out", msg: { jsonrpc: "2.0", id, method } });
const result = (id: number, value: Record<string, unknown>): FixtureRow => ({ dir: "in", msg: { jsonrpc: "2.0", id, result: value } });

const openRows = (mode: "new" | "resume"): FixtureRow[] => [
  request(1, "initialize"), result(1, DSH_INITIALIZE_RESULT),
  ...(mode === "new"
    ? [request(2, "session/new"), result(2, { sessionId: DSH_SESSION_ID, configOptions: DSH_CONFIG_OPTIONS })]
    : [request(2, "session/resume"), result(2, { configOptions: DSH_CONFIG_OPTIONS })]),
];

/**
 * Open (new or resume), the run's model and effort, then a prompt the agent answers with one message chunk and leaves
 * open (the test ends the turn) or ends at once.
 */
export const dshRunRows = (input: Readonly<{ mode: "new" | "resume"; endTurn?: boolean; configs?: number }>): FixtureRow[] => {
  const rows = openRows(input.mode);
  for (let index = 0; index < (input.configs ?? 2); index += 1) {
    rows.push(request(3 + index, "session/set_config_option"), result(3 + index, { configOptions: DSH_CONFIG_OPTIONS }));
  }
  rows.push(request(9, "session/prompt"), { dir: "in", msg: { jsonrpc: "2.0", method: "session/update", params: {
    sessionId: DSH_SESSION_ID,
    update: { sessionUpdate: "agent_message_chunk", messageId: "m-1", content: { type: "text", text: "Working on it." } },
  } } });
  if (input.endTurn) rows.push(result(9, { stopReason: "end_turn" }));
  return rows;
};
