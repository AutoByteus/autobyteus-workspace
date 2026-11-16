// A test client's reading of a run's own stream (`/ws/agent/<id>`), as the web's `AgentStreamingService` applies it
// (autobyteus-461 SR-085, SR-087; the approved wire change):
//   - the stream opens with `AGENT_STREAM_SNAPSHOT`: the stored conversation (`stored`) and the unconfirmed turn's frames
//     (`turn_frames`); a stopped run's session gets its full stored conversation;
//   - then numbered frames; coalesced content leaves as one `SEGMENT_CONTENT_BATCH` whose `items` are `SEGMENT_CONTENT`
//     payloads, in order.
// A client that reads content frames takes each batch as its items (`agentStreamFramesOf`); one that reads a turn's frames
// takes those after the latest snapshot (`liveFramesOf`), or the snapshot's stored part and turn frames (`shownText`).

type Rec = Record<string, any>;
export type AgentStreamFrame = { type: string; payload: Rec };

/** The frames a client applies for one received message: a `SEGMENT_CONTENT_BATCH` is its items, each a `SEGMENT_CONTENT`. */
export const agentStreamFramesOf = (message: { type?: unknown; payload?: unknown }): AgentStreamFrame[] => {
  if (typeof message.type !== "string") return [];
  const payload = message.payload && typeof message.payload === "object" ? message.payload as Rec : {};
  if (message.type === "SEGMENT_CONTENT_BATCH") return ((payload.items ?? []) as Rec[]).map((item) => ({ type: "SEGMENT_CONTENT", payload: item }));
  return [{ type: message.type, payload }];
};

/** The frames after the latest snapshot: what happened live since the session's view was taken. */
export const liveFramesOf = <T extends { type: string }>(frames: readonly T[]): T[] =>
  frames.slice(frames.map((frame) => frame.type).lastIndexOf("AGENT_STREAM_SNAPSHOT") + 1);

/** The content text of frames (each content frame's `delta`), batches taken as their items. */
export const contentTextOf = (frames: ReadonlyArray<{ type: string; payload?: Rec }>): string =>
  frames.flatMap((frame) => agentStreamFramesOf(frame)).filter((frame) => frame.type === "SEGMENT_CONTENT")
    .map((frame) => String(frame.payload.delta ?? "")).join("");

/** The text the session shows: its latest snapshot's stored entries and turn frames, then the content after it. */
export const shownText = (frames: ReadonlyArray<{ type: string; payload?: Rec }>): string => {
  const at = frames.map((frame) => frame.type).lastIndexOf("AGENT_STREAM_SNAPSHOT");
  if (at < 0) return contentTextOf(frames);
  const snapshot = frames[at]!.payload ?? {};
  const stored = ((snapshot.stored?.conversation ?? []) as Rec[]).map((entry) => String(entry.content ?? "")).join("\n");
  return `${stored}\n${contentTextOf([...((snapshot.turn_frames ?? []) as AgentStreamFrame[]), ...frames.slice(at + 1)])}`;
};

/** The protocol's rule for a client: commands wait for the session, which `CONNECTED` announces (refused SESSION_NOT_READY before). */
export const waitConnected = async (frames: ReadonlyArray<{ type: string }>, timeoutMs = 30_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (!frames.some((frame) => frame.type === "CONNECTED")) {
    if (Date.now() > deadline) throw new Error(`CONNECTED not received within ${timeoutMs} ms (frames: ${frames.map((frame) => frame.type).join(", ")})`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};
