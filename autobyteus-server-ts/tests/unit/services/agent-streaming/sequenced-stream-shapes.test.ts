import { describe, expect, it } from "vitest";
import { CollaborationStreamServerMessageSchema } from "@autobyteus/collaboration-stream-contracts";
import { parseTeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import { teamStreamSequencedShape } from "../../../../src/services/agent-streaming/websocket-egress/team-stream-sequenced-shape.js";
import { rootExecutionEventSequencedShape } from "../../../../src/services/agent-streaming/websocket-egress/root-execution-event-sequenced-shape.js";
import { streamPayloadsEqual } from "../../../../src/services/agent-streaming/websocket-egress/stream-payload-equality.js";

const segment = { segment_id: "segment-1", turn_id: "turn-1", segment_type: "text" as const };
const runningStatus = { status: "running" as const, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null };

describe("teamStreamSequencedShape", () => {
  const content = (seq: number, agent: string, delta: string, segmentId = "segment-1") => parseTeamStreamServerMessage({
    type: "SEGMENT_CONTENT", payload: { change_sequence: seq, agent_run_id: agent, ...segment, segment_id: segmentId, delta },
  });
  const status = (seq: number, agent: string) => parseTeamStreamServerMessage({
    type: "AGENT_STATUS", payload: { change_sequence: seq, agent_run_id: agent, ...runningStatus },
  });

  it("reads sequences, content identity and sequence-free status", () => {
    expect(teamStreamSequencedShape.sequenceOf(content(7, "a", "x"))).toBe(7);
    expect(teamStreamSequencedShape.sequenceOf(parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: true } }))).toBeNull();
    const first = teamStreamSequencedShape.contentOf(content(1, "a", "x"))!;
    expect(first).toMatchObject({ delta: "x", item: { agent_run_id: "a", ...segment } });
    expect(teamStreamSequencedShape.contentOf(content(2, "a", "y"))!.identityKey).toBe(first.identityKey);
    expect(teamStreamSequencedShape.contentOf(content(3, "b", "y"))!.identityKey).not.toBe(first.identityKey);
    expect(teamStreamSequencedShape.contentOf(content(4, "a", "y", "segment-2"))!.identityKey).not.toBe(first.identityKey);
    expect(teamStreamSequencedShape.contentOf(status(5, "a"))).toBeNull();
    const [one, two] = [teamStreamSequencedShape.statusOf(status(5, "a"))!, teamStreamSequencedShape.statusOf(status(9, "a"))!];
    expect(one.agentRunId).toBe("a");
    expect(streamPayloadsEqual(one.comparable, two.comparable)).toBe(true);
  });

  it("builds a valid SEGMENT_CONTENT_BATCH covering the range", () => {
    const items = [content(1, "a", "x"), content(2, "b", "1")].map((message) => teamStreamSequencedShape.contentOf(message)!);
    const batch = teamStreamSequencedShape.buildBatch(21, 26, items.map(({ item }, index) => ({ item, text: index ? "12" : "xy" })));
    expect(batch).toEqual({ type: "SEGMENT_CONTENT_BATCH", payload: { change_sequence: 21, change_sequence_through: 26, items: [
      { agent_run_id: "a", ...segment, delta: "xy" }, { agent_run_id: "b", ...segment, delta: "12" },
    ] } });
    expect(teamStreamSequencedShape.isSnapshot(batch)).toBe(false);
  });
});

describe("rootExecutionEventSequencedShape", () => {
  const event = (seq: number, agent: string, message: unknown, rootKind: "agent_org" | "agent" = "agent_org") =>
    CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: {
      root_subject_kind: rootKind, root_run_id: "root-1", change_sequence: seq,
      event: { kind: "agent_presentation", member_address: `/${agent}`, agent_run_id: agent, message },
    } });
  const content = (seq: number, agent: string, delta: string, rootKind?: "agent_org" | "agent") =>
    event(seq, agent, { type: "SEGMENT_CONTENT", payload: { ...segment, delta } }, rootKind);
  const status = (seq: number, agent: string) => event(seq, agent, { type: "AGENT_STATUS", payload: runningStatus });

  it("reads envelope sequences, content identity and envelope-free status", () => {
    expect(rootExecutionEventSequencedShape.sequenceOf(content(3, "a", "x"))).toBe(3);
    expect(rootExecutionEventSequencedShape.sequenceOf(CollaborationStreamServerMessageSchema.parse({
      type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent_org", root_run_id: "root-1", is_active: true } }))).toBeNull();
    const first = rootExecutionEventSequencedShape.contentOf(content(1, "a", "x"))!;
    expect(first.delta).toBe("x");
    expect(rootExecutionEventSequencedShape.contentOf(content(2, "a", "y"))!.identityKey).toBe(first.identityKey);
    expect(rootExecutionEventSequencedShape.contentOf(content(3, "b", "y"))!.identityKey).not.toBe(first.identityKey);
    expect(rootExecutionEventSequencedShape.contentOf(status(4, "a"))).toBeNull();
    const [one, two] = [rootExecutionEventSequencedShape.statusOf(status(4, "a"))!, rootExecutionEventSequencedShape.statusOf(status(8, "a"))!];
    expect(one.agentRunId).toBe("a");
    expect(streamPayloadsEqual(one.comparable, two.comparable)).toBe(true);
  });

  it.each(["agent_org", "agent"] as const)("builds a valid %s agent_presentation_batch envelope", (rootKind) => {
    const parts = [content(1, "a", "x", rootKind), content(2, "b", "1", rootKind)].map((message) => rootExecutionEventSequencedShape.contentOf(message)!);
    const batch = rootExecutionEventSequencedShape.buildBatch(21, 26, [{ item: parts[0]!.item, text: "xy" }, { item: parts[1]!.item, text: "12" }]);
    expect(batch).toEqual({ type: "ROOT_EXECUTION_EVENT", payload: {
      root_subject_kind: rootKind, root_run_id: "root-1", change_sequence: 21, change_sequence_through: 26,
      event: { kind: "agent_presentation_batch", items: [
        { member_address: "/a", agent_run_id: "a", message: { type: "SEGMENT_CONTENT", payload: { ...segment, delta: "xy" } } },
        { member_address: "/b", agent_run_id: "b", message: { type: "SEGMENT_CONTENT", payload: { ...segment, delta: "12" } } },
      ] },
    } });
  });
});
