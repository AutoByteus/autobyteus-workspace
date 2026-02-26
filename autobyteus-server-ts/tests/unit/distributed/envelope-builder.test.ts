import { describe, expect, it, vi } from "vitest";
import { EnvelopeBuilder } from "../../../src/distributed/envelope/envelope-builder.js";
import { UniqueIdGenerator } from "../../../src/utils/unique-id-generator.js";

describe("EnvelopeBuilder", () => {
  it("builds a team envelope and auto-generates envelopeId when not provided", () => {
    const idSpy = vi.spyOn(UniqueIdGenerator, "generateId").mockReturnValue("env-123");
    const builder = new EnvelopeBuilder();

    const envelope = builder.buildEnvelope({
      teamRunId: "team-run-1",
      runVersion: "7",
      kind: "INTER_AGENT_MESSAGE",
      payload: { content: "hello" },
      causationId: "cause-1",
      sequence: 11,
    });

    expect(envelope).toEqual({
      envelopeId: "env-123",
      teamRunId: "team-run-1",
      runVersion: "7",
      kind: "INTER_AGENT_MESSAGE",
      causationId: "cause-1",
      sequence: 11,
      payload: { content: "hello" },
    });
    expect(idSpy).toHaveBeenCalledTimes(1);
    idSpy.mockRestore();
  });

  it("preserves caller-provided envelopeId", () => {
    const idSpy = vi.spyOn(UniqueIdGenerator, "generateId");
    const builder = new EnvelopeBuilder();

    const envelope = builder.buildEnvelope({
      envelopeId: "fixed-id",
      teamRunId: "team-run-1",
      runVersion: 2,
      kind: "TOOL_APPROVAL",
      payload: { approved: true },
    });

    expect(envelope.envelopeId).toBe("fixed-id");
    expect(idSpy).not.toHaveBeenCalled();
    idSpy.mockRestore();
  });

  it("attaches runVersion onto an envelope without runVersion", () => {
    const builder = new EnvelopeBuilder();
    const envelope = builder.attachRunVersion(
      {
        envelopeId: "env-9",
        teamRunId: "team-run-9",
        kind: "CONTROL_STOP",
        payload: { reason: "manual" },
      },
      9
    );

    expect(envelope.runVersion).toBe(9);
    expect(envelope.envelopeId).toBe("env-9");
    expect(envelope.teamRunId).toBe("team-run-9");
  });
});
