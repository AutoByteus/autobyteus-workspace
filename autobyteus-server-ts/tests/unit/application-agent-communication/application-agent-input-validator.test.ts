import { describe, expect, it } from "vitest";
import {
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_COUNT_LIMIT,
  APPLICATION_AGENT_INPUT_CONTEXT_FILE_URI_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_METADATA_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_REQUEST_ID_BYTES_LIMIT,
  APPLICATION_AGENT_INPUT_TEXT_BYTES_LIMIT,
} from "../../../src/application-communication-limits.js";
import { parseApplicationAgentClientFrame } from "../../../src/application-agent-communication/services/application-agent-communication-frame-parser.js";
import { isApplicationAgentInputWithinLimits } from "../../../src/application-orchestration/domain/application-agent-input-validator.js";

const protocol = "autobyteus.application-agent-communication.v1";

describe("application agent input limits", () => {
  it("accepts text, request ID, metadata, and context-file values at their exact bounds", () => {
    const metadataOverhead = Buffer.byteLength(JSON.stringify({ value: "" }), "utf8");
    const metadata = { value: "m".repeat(APPLICATION_AGENT_INPUT_METADATA_BYTES_LIMIT - metadataOverhead) };
    const contextFile = {
      uri: "u".repeat(APPLICATION_AGENT_INPUT_CONTEXT_FILE_URI_BYTES_LIMIT),
      fileType: "t".repeat(APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT),
      fileName: "n".repeat(APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT),
      metadata,
    };
    const input = {
      text: "x".repeat(APPLICATION_AGENT_INPUT_TEXT_BYTES_LIMIT),
      contextFiles: Array.from({ length: APPLICATION_AGENT_INPUT_CONTEXT_FILE_COUNT_LIMIT }, () => contextFile),
      metadata,
    };
    expect(isApplicationAgentInputWithinLimits(input)).toBe(true);
    expect(parseApplicationAgentClientFrame(JSON.stringify({
      protocol,
      type: "INPUT",
      requestId: "r".repeat(APPLICATION_AGENT_INPUT_REQUEST_ID_BYTES_LIMIT),
      input: { text: "ok" },
    }), false)).not.toBeNull();
  });

  it("rejects each input component one unit above its configured bound", () => {
    const base = { text: "ok" };
    expect(isApplicationAgentInputWithinLimits({
      text: "x".repeat(APPLICATION_AGENT_INPUT_TEXT_BYTES_LIMIT + 1),
    })).toBe(false);
    expect(isApplicationAgentInputWithinLimits({
      ...base,
      contextFiles: Array.from({ length: APPLICATION_AGENT_INPUT_CONTEXT_FILE_COUNT_LIMIT + 1 }, () => ({ uri: "file://one" })),
    })).toBe(false);
    expect(isApplicationAgentInputWithinLimits({
      ...base,
      contextFiles: [{ uri: "u".repeat(APPLICATION_AGENT_INPUT_CONTEXT_FILE_URI_BYTES_LIMIT + 1) }],
    })).toBe(false);
    expect(isApplicationAgentInputWithinLimits({
      ...base,
      contextFiles: [{ uri: "file://one", fileName: "n".repeat(APPLICATION_AGENT_INPUT_CONTEXT_FILE_ATTRIBUTE_BYTES_LIMIT + 1) }],
    })).toBe(false);
    expect(isApplicationAgentInputWithinLimits({
      ...base,
      metadata: { value: "m".repeat(APPLICATION_AGENT_INPUT_METADATA_BYTES_LIMIT) },
    })).toBe(false);
    expect(parseApplicationAgentClientFrame(JSON.stringify({
      protocol,
      type: "INPUT",
      requestId: "r".repeat(APPLICATION_AGENT_INPUT_REQUEST_ID_BYTES_LIMIT + 1),
      input: base,
    }), false)).toBeNull();
  });
});
