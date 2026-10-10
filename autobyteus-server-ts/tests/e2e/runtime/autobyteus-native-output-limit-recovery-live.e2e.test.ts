/**
 * Live AutoByteus (native runtime) output-limit recovery and finish-handling E2E (Step 2), run through the real studio
 * server (HTTP GraphQL + agent WebSocket) with real providers, entered as the desktop app does: create an agent run
 * (with a small configured `max_tokens` where the case needs a cut) and send a message. The shared harness records every
 * provider request body; reloads use the app's `getRunProjection` query.
 *
 * Cases (each needs its provider key; a skip is not a pass):
 *   OLR-E2E-001  Opus, `max_tokens: 1200`, a 100-line `write_file` request cut on the turn's FIRST call (tool call or
 *                adaptive thinking): the hidden note follows the user's request in the merged "current message" shape,
 *                nothing of the cut is stored, and the model carries on with the ORIGINAL request in smaller pieces until
 *                all 100 lines exist; reload shows no note and no cut call; one usage record per LLM call
 *                (AC-003, REQ-003, D-08; CND-102 observation)
 *   OLR-E2E-002  Same cut after a tool result (the stuck-run shape): the note follows the tool result without the
 *                "current message" merge (AC-003, CND-102 contrast)
 *   OLR-E2E-003  Text-only cut: partial text kept, hidden resume note, two consecutive assistant parts live and after
 *                reload (AC-005)
 *   OLR-E2E-004  Exhaustion: four cut responses in a row → exactly 3 recoveries, then LLM_OUTPUT_LIMIT_EXHAUSTED naming
 *                the limit; unique llm_call_ids; the next user message yields a valid request (AC-006)
 *   OLR-E2E-005  DeepSeek (OpenAI-compatible) `finish_reason: length` mid tool call: same recovery (AC-011, AC-010)
 *   OLR-E2E-006  Refusal stop mid tool call → LLM_RESPONSE_REFUSED, no tool, no recovery; next message valid (AC-004)
 *   OLR-E2E-007  `model_context_window_exceeded` stop → LLM_CONTEXT_WINDOW_EXCEEDED, no recovery (AC-004, REQ-002)
 *   OLR-E2E-008  Stream ends without `message_stop` after a tool_use start → fails and rolls back; next message valid
 *                (AC-007)
 *   OLR-E2E-009b DeepSeek (OpenAI-compatible) tool call whose arguments are not JSON → the tool does not run; the next
 *                request carries the "malformed … Please retry." tool result and the provider accepts it; the turn
 *                continues (AC-012). Chat-completions `arguments` are model-generated with no documented server
 *                validation, so this is where malformed calls occur. Anthropic is not covered: without
 *                `eager_input_streaming` (not sent by AutoByteus) the API buffers and validates tool input before
 *                streaming it, so a completed `tool_use` with invalid JSON is not a supported scenario (Anthropic
 *                fine-grained tool streaming docs). If a later ticket enables eager input streaming, add an Anthropic case.
 *   OLR-E2E-011  Opus, `max_tokens: 400`: a write_file response cut mid tool call (whichever attempt it is) ends its segment as
 *                "Discarded", never executes, and is absent from the next request, which names the tool and the limit (AC-003)
 *   OLR-E2E-010  Compaction summary under a small limit (DeepSeek, non-streaming): completion_status `incomplete` with
 *                the provider reason; the summary is rejected (AR-004)
 * OLR-E2E-006..008 and 009b use a one-shot rewrite of the REAL provider response text (the request still goes to the
 * provider) to produce stream shapes that real use produces but that cannot be requested on demand: a refusal or
 * context-window stop (Anthropic `stop_reason`), a network cut before `message_stop`, and DeepSeek tool-call arguments
 * that are not JSON.
 *
 * Gate and environment: as `autobyteus-native-output-limit-live.e2e.test.ts` (RUN_NATIVE_OUTPUT_LIMIT_E2E=1, keys as
 * credential aliases, clean `env -i`). OLR-E2E-010 temporarily sets three server settings through `updateServerSetting`
 * and deletes them afterwards. Cost: small (≤ ~25 short Opus calls, a few DeepSeek calls).
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  MAX_OUTPUT_LIMIT_RECOVERIES,
  OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR,
} from "autobyteus-ts/agent/loop/output-limit-recovery.js";
import {
  frameDigest,
  NativeRuntimeLiveHarness,
  requestMessages,
  type CapturedCall,
  type RunSession,
  type WsMessage,
} from "../helpers/native-runtime-live-harness.js";

const ENABLED = process.env.RUN_NATIVE_OUTPUT_LIMIT_E2E === "1";
const describeLive = ENABLED ? describe : describe.skip;
const hasKey = (alias: string) => Boolean(process.env[alias]?.trim());
const STEP_TIMEOUT_MS = Number(process.env.OUTPUT_LIMIT_E2E_STEP_TIMEOUT_MS || 1_200_000);
const EVIDENCE_DIR = process.env.OUTPUT_LIMIT_E2E_EVIDENCE_DIR?.trim() || null;
const ANTHROPIC_MODEL = process.env.OUTPUT_LIMIT_E2E_ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
const DEEPSEEK_MODEL = process.env.OUTPUT_LIMIT_E2E_DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
const CURRENT_MESSAGE_CONNECTOR = "The user's current message is:";
const LINES_FILE = "sea-lines.md";
const linesRequest = (lines: number) => [
  `Create the file ${LINES_FILE} with exactly ${lines} lines.`,
  `Line N (for every N from 1 to ${lines}) is "Line N: " followed by one different sentence of 12 to 16 words about the sea.`,
  "Write every line in full.",
].join(" ");
/** First-call cut with room to recover: one 100-line write (~2,000 tokens) exceeds 1,200, a 40-line piece fits. */
const RECOVERABLE_LIMIT = 1200;
const RECOVERABLE_LINES = 100;
const PONG = "Reply with the single word pong.";

const has = (frames: WsMessage[], predicate: (frame: WsMessage) => boolean) => frames.some(predicate);
const discardedSegments = (frames: WsMessage[]) => frames.filter((frame) =>
  frame.type === "SEGMENT_END" && frame.payload.failed === true && String(frame.payload.error ?? "").startsWith(OUTPUT_LIMIT_DISCARDED_TOOL_CALL_ERROR.slice(0, 20)));
const toolStarts = (frames: WsMessage[]) => frames.filter((frame) => frame.type === "TOOL_EXECUTION_STARTED");
const userMessages = (call: CapturedCall) => requestMessages(call.body).filter((message) => message.role === "user");
const noteMessages = (call: CapturedCall) => requestMessages(call.body).filter((message) => message.text.includes("System note:"));
const assistantToolUses = (call: CapturedCall) => requestMessages(call.body)
  .filter((message) => message.role === "assistant").reduce((sum, message) => sum + message.toolUses, 0);
/** The Token Meter feed: one TOKEN_USAGE_UPDATED per LLM call, each with its `llm_call_id`. */
const usageCallIds = (frames: WsMessage[]) => frames.filter((frame) => frame.type === "TOKEN_USAGE_UPDATED")
  .map((frame) => String(frame.payload.llm_call_id ?? ""));
const projectionText = (conversation: unknown[]) => JSON.stringify(conversation);

describeLive("AutoByteus native runtime output-limit recovery (live)", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: EVIDENCE_DIR, stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "output-limit-recovery-e2e" });
  let chatDefinitionId = "";
  let writerDefinitionId = "";
  let readerWriterDefinitionId = "";
  const writerInstructions = [
    "You are a file-writing agent working in the workspace with tools.",
    "Use write_file to create a file and edit_file to change or extend an existing one.",
    "When a task is finished, reply with the single word done.",
  ].join("\n");

  beforeAll(async () => {
    await harness.start();
    chatDefinitionId = await harness.createDefinition("output-limit-recovery-chat", "You are a helpful assistant. Answer the user's request directly.", []);
    writerDefinitionId = await harness.createDefinition("output-limit-recovery-writer", writerInstructions, ["write_file", "edit_file"]);
    readerWriterDefinitionId = await harness.createDefinition("output-limit-recovery-reader-writer", writerInstructions, ["read_file", "write_file", "edit_file"]);
  }, 300_000);

  afterEach(async (context) => { await harness.finishCase(context); });
  afterAll(async () => { await harness.stop(); }, 180_000);

  const anthropicModel = () => harness.catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
  const fileLines = async (session: RunSession, name: string) => {
    const file = path.join(session.workspaceRootPath, name);
    if (!await stat(file).catch(() => null)) return null;
    return (await readFile(file, "utf-8")).split("\n").filter((line) => line.trim());
  };
  /** The first recovery request after `cut` in the same phase. */
  const nextCall = (phaseCalls: CapturedCall[], cut: CapturedCall) => phaseCalls.find((call) => call.index > cut.index);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-001: a write_file cut on the turn's first call is discarded and the turn recovers with the hidden note", async () => {
    const model = await anthropicModel();
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, { max_tokens: RECOVERABLE_LIMIT });
    const { error, frames } = await harness.runTurn(session, "OLR-001", linesRequest(RECOVERABLE_LINES));
    const phaseCalls = harness.callsOf("OLR-001");
    const cut = phaseCalls[0]!;
    const recovery = nextCall(phaseCalls, cut);
    const note = recovery ? noteMessages(recovery) : [];
    const lines = await fileLines(session, LINES_FILE);
    const projection = await harness.projection(session.runId);
    const callIds = usageCallIds(frames);
    harness.recordCase("OLR-E2E-001", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      recoveryUserMessages: recovery ? userMessages(recovery).map((message) => message.text.slice(0, 1200)) : null,
      noteMergedWithCurrentMessageConnector: note.some((message) => message.text.includes(CURRENT_MESSAGE_CONNECTOR)),
      fileLineCount: lines?.length ?? null, firstLine: lines?.[0] ?? null, lastLine: lines?.at(-1) ?? null,
      projection, usageCallIds: callIds,
    });
    harness.assertAccepted(phaseCalls, "OLR-001");
    for (const call of phaseCalls) harness.assertLimit(call, "max_tokens", RECOVERABLE_LIMIT, "OLR-001");
    // The turn's FIRST response was cut. Opus may spend it on the write_file call or on adaptive thinking; either way
    // the hidden note follows the user's request directly (the CND-102 merge shape) and nothing of the cut is stored.
    expect(cut.stopSignals).toContain("max_tokens");
    expect(recovery, "the turn continued automatically").toBeTruthy();
    expect(note.length).toBeGreaterThanOrEqual(1);
    expect(note.at(-1)!.text).toContain(cut.responseHasToolCall
      ? `hit the output limit of ${RECOVERABLE_LIMIT} tokens while generating a \`write_file\` tool call`
      : `hit the output limit of ${RECOVERABLE_LIMIT} tokens before producing any visible output`);
    expect(assistantToolUses(recovery!), "no cut tool call in the recovery request").toBe(0);
    if (cut.responseHasToolCall) expect(discardedSegments(frames).length).toBeGreaterThanOrEqual(1);
    // Reload: no note and no discarded call in the conversation.
    expect(projectionText(projection)).not.toContain("System note:");
    expect(projectionText(projection)).not.toContain("Discarded:");
    // One usage record per LLM call, each with its own call id.
    expect(callIds.every(Boolean), `llm_call_ids ${JSON.stringify(callIds)}`).toBe(true);
    expect(new Set(callIds).size, `llm_call_ids ${JSON.stringify(callIds)}`).toBe(callIds.length);
    expect(callIds.length).toBe(phaseCalls.length);
    // CND-102 observation: the model continued the ORIGINAL request after the note.
    expect(lines, `${LINES_FILE} written after recovery`).not.toBeNull();
    expect(lines!.some((line) => line.startsWith("Line 1:")), "the written file is the requested file").toBe(true);
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    expect(lines!.filter((line) => /^Line \d+:/.test(line)).length, "all requested lines, written in smaller pieces").toBe(RECOVERABLE_LINES);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-011: an Anthropic write_file cut mid tool call is discarded: segment failed, never executed, not in the next request", async () => {
    const model = await anthropicModel();
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, { max_tokens: 400 });
    const { error, frames } = await harness.runTurn(session, "OLR-011", linesRequest(40));
    const phaseCalls = harness.callsOf("OLR-011");
    const cut = phaseCalls.find((call) => call.stopSignals.includes("max_tokens") && call.responseHasToolCall);
    const recovery = cut ? nextCall(phaseCalls, cut) : undefined;
    const discardedIds = discardedSegments(frames).map((frame) => String(frame.payload.id));
    const executedIds = frames.filter((frame) => frame.type.startsWith("TOOL_EXECUTION_"))
      .map((frame) => String(frame.payload.invocation_id ?? frame.payload.id ?? ""));
    harness.recordCase("OLR-E2E-011", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      discardedIds, executedIds,
      recoveryTail: recovery ? requestMessages(recovery.body).slice(-2).map((message) => ({ ...message, text: message.text.slice(0, 600) })) : null,
    });
    harness.assertAccepted(phaseCalls, "OLR-011");
    expect(cut, "a response cut by max_tokens while generating a tool call (4 attempts at 400 tokens)").toBeTruthy();
    expect(discardedIds.length, "the cut tool segment ends as discarded").toBeGreaterThanOrEqual(1);
    for (const id of discardedIds) expect(executedIds, `discarded call ${id} never executes`).not.toContain(id);
    expect(recovery, "the turn continued automatically").toBeTruthy();
    expect(noteMessages(recovery!).at(-1)!.text).toContain("hit the output limit of 400 tokens while generating a `write_file` tool call; the call was discarded and not executed");
    expect(assistantToolUses(recovery!), "the cut call is not in the next request")
      .toBe(phaseCalls.filter((call) => call.index < cut!.index && call.stopSignals.includes("tool_use")).length);
    expect(error === null || error.payload.code === "LLM_OUTPUT_LIMIT_EXHAUSTED", `ERROR frame: ${JSON.stringify(error?.payload)}`).toBe(true);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-002: a write_file cut after a tool result recovers with a note that is not merged as the user's current message", async () => {
    const model = await anthropicModel();
    const workspace = await harness.makeWorkspace({ "seed.txt": "Topic: the sea. Tone: calm. Each line names a different sea creature or coastal feature.\n" });
    const session = await harness.startRun(readerWriterDefinitionId, model.modelIdentifier, { max_tokens: RECOVERABLE_LIMIT }, workspace);
    const { error, frames } = await harness.runTurn(session, "OLR-002",
      `First read seed.txt with read_file. Then, following its topic and tone: ${linesRequest(RECOVERABLE_LINES)}`);
    const phaseCalls = harness.callsOf("OLR-002");
    // The first cut after the read_file result (the stuck-run shape).
    const cut = phaseCalls.find((call) => call.index > phaseCalls[0]!.index && call.stopSignals.includes("max_tokens"));
    const recovery = cut ? nextCall(phaseCalls, cut) : undefined;
    const note = recovery ? noteMessages(recovery) : [];
    harness.recordCase("OLR-E2E-002", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      recoveryMessages: recovery ? requestMessages(recovery.body).slice(-3).map((message) => ({ ...message, text: message.text.slice(0, 1200) })) : null,
      fileLineCount: (await fileLines(session, LINES_FILE))?.length ?? null,
    });
    harness.assertAccepted(phaseCalls, "OLR-002");
    expect(error === null || error.payload.code === "LLM_OUTPUT_LIMIT_EXHAUSTED", `ERROR frame: ${JSON.stringify(error?.payload)}`).toBe(true);
    expect(phaseCalls[0]!.stopSignals, "the first call is the read_file step").toContain("tool_use");
    expect(cut, "a response after the tool result was cut").toBeTruthy();
    // The note follows the tool result as its own message, not merged under "The user's current message is:".
    const tail = requestMessages(recovery!.body).slice(-2);
    expect(tail[0]!.toolResults.length, "the tool result precedes the note").toBeGreaterThan(0);
    expect(tail[1]!.text.startsWith("System note:"), "the note is the last message").toBe(true);
    expect(tail[1]!.text).not.toContain(CURRENT_MESSAGE_CONNECTOR);
    expect(assistantToolUses(recovery!), "only executed tool calls are in history")
      .toBe(phaseCalls.filter((call) => call.index < cut!.index && call.stopSignals.includes("tool_use")).length);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-003: a text-only cut keeps the partial text, resumes with the hidden note, and shows two assistant parts live and after reload", async () => {
    const model = await anthropicModel();
    const session = await harness.startRun(chatDefinitionId, model.modelIdentifier, { max_tokens: 300 });
    const { error, frames } = await harness.runTurn(session, "OLR-003",
      "Write an essay of about 330 words on the history of lighthouses. Plain paragraphs only: no title, headings or lists.");
    const phaseCalls = harness.callsOf("OLR-003");
    const cut = phaseCalls[0]!;
    const recovery = nextCall(phaseCalls, cut);
    const projection = await harness.projection(session.runId);
    const recoveryMessages = recovery ? requestMessages(recovery.body) : [];
    harness.recordCase("OLR-E2E-003", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      recoveryMessages: recoveryMessages.map((message) => ({ ...message, text: message.text.slice(0, 600) })), projection,
    });
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    harness.assertAccepted(phaseCalls, "OLR-003");
    expect(cut.stopSignals).toContain("max_tokens");
    expect(cut.responseHasToolCall).toBe(false);
    expect(recovery, "the turn continued automatically").toBeTruthy();
    // user → assistant (kept partial text) → hidden resume note.
    const tail = recoveryMessages.slice(-2);
    expect(tail[0]!.role).toBe("assistant");
    expect(tail[0]!.text.length, "the partial text is kept").toBeGreaterThan(200);
    expect(tail[1]!.role).toBe("user");
    expect(tail[1]!.text).toContain("Resume directly from where your previous message stopped");
    // Live: one text segment per response part. Reload: the parts are consecutive assistant messages after the user's.
    const textSegments = frames.filter((frame) => frame.type === "SEGMENT_START" && frame.payload.segment_type === "text");
    expect(textSegments.length).toBe(phaseCalls.length);
    const entries = projection as Array<{ kind?: string; role?: string; content?: string }>;
    const userIndex = entries.findIndex((entry) => entry.role === "user");
    const assistantParts = entries.slice(userIndex + 1);
    expect(assistantParts.length, "one reloaded assistant message per response part").toBe(phaseCalls.length);
    expect(assistantParts.every((entry) => entry.role === "assistant")).toBe(true);
    expect(assistantParts[0]!.content).toBe(tail[0]!.text);
    expect(projectionText(projection)).not.toContain("System note:");
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-004: four cut responses in a row end the turn with LLM_OUTPUT_LIMIT_EXHAUSTED after 3 recoveries; the next message is valid", async () => {
    const model = await anthropicModel();
    const session = await harness.startRun(chatDefinitionId, model.modelIdentifier, { max_tokens: 20 });
    const { error, frames } = await harness.runTurn(session, "OLR-004", "Write a 300-word paragraph about the history of lighthouses.");
    const phaseCalls = harness.callsOf("OLR-004");
    const callIds = usageCallIds(frames);
    const followUp = await harness.runTurn(session, "OLR-004-next", "Reply with only the word ok.");
    const followUpCalls = harness.callsOf("OLR-004-next");
    harness.recordCase("OLR-E2E-004", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames), usageCallIds: callIds,
      followUpError: followUp.error?.payload ?? null, followUpCalls: followUpCalls.map((call) => harness.summarize(call)),
      followUpMessages: followUpCalls[0] ? requestMessages(followUpCalls[0].body).map((message) => ({ ...message, text: message.text.slice(0, 300) })) : null,
    });
    harness.assertAccepted(phaseCalls, "OLR-004");
    expect(phaseCalls.length, "1 call + 3 recoveries").toBe(MAX_OUTPUT_LIMIT_RECOVERIES + 1);
    for (const call of phaseCalls) expect(call.stopSignals).toContain("max_tokens");
    expect(error?.payload.code).toBe("LLM_OUTPUT_LIMIT_EXHAUSTED");
    expect(String(error?.payload.message)).toContain("output limit of 20 tokens");
    expect(callIds.length).toBe(phaseCalls.length);
    expect(callIds.every(Boolean)).toBe(true);
    expect(new Set(callIds).size, `llm_call_ids ${JSON.stringify(callIds)}`).toBe(callIds.length);
    // The next user message produces a valid request that the provider accepts.
    harness.assertAccepted(followUpCalls, "OLR-004-next");
    expect(userMessages(followUpCalls[0]!).at(-1)!.text).toContain("Reply with only the word ok.");
    expect(assistantToolUses(followUpCalls[0]!)).toBe(0);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("DEEPSEEK_API_KEY"))("OLR-E2E-005: DeepSeek finish_reason length mid tool call is discarded and recovered the same way", async () => {
    const model = await harness.catalogModel("DEEPSEEK", DEEPSEEK_MODEL);
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, { max_tokens: 150, extra_params: { thinking_type: "disabled" } });
    const { error, frames } = await harness.runTurn(session, "OLR-005", linesRequest(40));
    const phaseCalls = harness.callsOf("OLR-005");
    const cut = phaseCalls.find((call) => call.stopSignals.includes("length") && call.responseHasToolCall);
    const recovery = cut ? nextCall(phaseCalls, cut) : undefined;
    const note = recovery ? noteMessages(recovery) : [];
    harness.recordCase("OLR-E2E-005", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      recoveryTail: recovery ? requestMessages(recovery.body).slice(-3).map((message) => ({ ...message, text: message.text.slice(0, 800) })) : null,
      fileLineCount: (await fileLines(session, LINES_FILE))?.length ?? null,
    });
    harness.assertAccepted(phaseCalls, "OLR-005");
    expect(cut, "a response cut by `length` while generating a tool call").toBeTruthy();
    expect(discardedSegments(frames).length).toBeGreaterThanOrEqual(1);
    expect(recovery, "the turn continued automatically").toBeTruthy();
    expect(note.at(-1)?.text).toContain("hit the output limit of 150 tokens while generating a `write_file` tool call");
    expect(assistantToolUses(recovery!)).toBe(phaseCalls.filter((call) => call.index < cut!.index && call.responseHasToolCall && !call.stopSignals.includes("length")).length);
    expect(error === null || error.payload.code === "LLM_OUTPUT_LIMIT_EXHAUSTED", `ERROR frame: ${JSON.stringify(error?.payload)}`).toBe(true);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  const rewriteStopReason = (from: string, to: string) => (text: string) =>
    text.replace(`"stop_reason":"${from}"`, `"stop_reason":"${to}"`);

  const runRejectedStop = async (caseId: string, stopReason: string, expectedCode: string) => {
    const model = await anthropicModel();
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, null);
    harness.rewriteNextResponse(rewriteStopReason("tool_use", stopReason));
    const { error, frames } = await harness.runTurn(session, caseId, "Create hello.txt with write_file containing exactly the text: hello");
    const phaseCalls = harness.callsOf(caseId);
    const next = await harness.runTurn(session, `${caseId}-next`, PONG);
    const nextCalls = harness.callsOf(`${caseId}-next`);
    harness.recordCase(caseId, {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      nextError: next.error?.payload ?? null, nextMessages: nextCalls[0] ? requestMessages(nextCalls[0].body).map((message) => ({ ...message, text: message.text.slice(0, 300) })) : null,
    });
    expect(phaseCalls.length, "one call, no recovery").toBe(1);
    expect(phaseCalls[0]!.rewritten, "the stop reason was rewritten").toBe(true);
    expect(error?.payload.code).toBe(expectedCode);
    expect(String(error?.payload.message)).toContain(stopReason);
    expect(toolStarts(frames)).toHaveLength(0);
    expect(await stat(path.join(session.workspaceRootPath, "hello.txt")).catch(() => null), "no tool ran").toBeNull();
    expect(noteMessages(phaseCalls[0]!)).toHaveLength(0);
    expect(next.error, `next ERROR: ${JSON.stringify(next.error?.payload)}`).toBeNull();
    harness.assertAccepted(nextCalls, `${caseId}-next`);
    expect(assistantToolUses(nextCalls[0]!), "the refused tool call is not in history").toBe(0);
    await harness.stopRun(session);
  };

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-006: a refusal stop mid tool call fails clearly with no tool and no recovery; the next message is valid", async () => {
    await runRejectedStop("OLR-E2E-006", "refusal", "LLM_RESPONSE_REFUSED");
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-007: a model_context_window_exceeded stop fails clearly with no recovery; the next message is valid", async () => {
    await runRejectedStop("OLR-E2E-007", "model_context_window_exceeded", "LLM_CONTEXT_WINDOW_EXCEEDED");
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLR-E2E-008: a stream that ends without message_stop after a tool_use start fails and rolls back; the next message is valid", async () => {
    const model = await anthropicModel();
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, null);
    harness.rewriteNextResponse((text) => text.replace(/event: message_stop\r?\ndata: [^\n]*\r?\n(\r?\n)?/, ""));
    const { error, frames } = await harness.runTurn(session, "OLR-008", "Create hello.txt with write_file containing exactly the text: hello");
    const phaseCalls = harness.callsOf("OLR-008");
    const next = await harness.runTurn(session, "OLR-008-next", PONG);
    const nextCalls = harness.callsOf("OLR-008-next");
    harness.recordCase("OLR-E2E-008", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      nextError: next.error?.payload ?? null, nextMessages: nextCalls[0] ? requestMessages(nextCalls[0].body).map((message) => ({ ...message, text: message.text.slice(0, 300) })) : null,
    });
    expect(phaseCalls).toHaveLength(1);
    expect(phaseCalls[0]!.rewritten, "message_stop was removed").toBe(true);
    expect(phaseCalls[0]!.responseHasToolCall).toBe(true);
    expect(error, "the turn failed").not.toBeNull();
    expect(toolStarts(frames)).toHaveLength(0);
    expect(await stat(path.join(session.workspaceRootPath, "hello.txt")).catch(() => null)).toBeNull();
    expect(next.error, `next ERROR: ${JSON.stringify(next.error?.payload)}`).toBeNull();
    harness.assertAccepted(nextCalls, "OLR-008-next");
    expect(assistantToolUses(nextCalls[0]!), "the broken response is rolled back").toBe(0);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("DEEPSEEK_API_KEY"))("OLR-E2E-009b: DeepSeek tool call with malformed arguments does not run; the model gets the retry error and the turn continues", async () => {
    const model = await harness.catalogModel("DEEPSEEK", DEEPSEEK_MODEL);
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, { extra_params: { thinking_type: "disabled" } });
    harness.rewriteNextResponse((text) => text.replace('"arguments":"', '"arguments":"@@'));
    const { error, frames } = await harness.runTurn(session, "OLR-009b", "Create hello.txt with write_file containing exactly the text: hello");
    const phaseCalls = harness.callsOf("OLR-009b");
    const retry = phaseCalls[1];
    const toolResults = retry ? requestMessages(retry.body).flatMap((message) => message.toolResults) : [];
    const content = await readFile(path.join(session.workspaceRootPath, "hello.txt"), "utf-8").catch(() => null);
    harness.recordCase("OLR-E2E-009b", {
      error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)), frames: frameDigest(frames),
      retryToolResults: toolResults.map((result) => result.slice(0, 400)), fileContent: content,
    });
    expect(phaseCalls[0]!.rewritten, "the tool arguments were corrupted").toBe(true);
    harness.assertAccepted(phaseCalls, "OLR-009b");
    expect(retry, "the turn continued").toBeTruthy();
    expect(toolResults.some((result) => result.includes("malformed") && result.includes("Please retry")), "malformed-call tool result").toBe(true);
    // Ordinary tool errors on the model's retries are fine; no LLM-level failure ends the turn.
    const llmErrors = frames.filter((frame) => frame.type === "ERROR" && String(frame.payload.code ?? "").startsWith("LLM_"));
    expect(llmErrors, JSON.stringify(llmErrors.map((frame) => frame.payload))).toHaveLength(0);
    expect(has(frames, (frame) => frame.type === "TURN_COMPLETED")).toBe(true);
    expect(content?.trim()).toBe("hello");
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("DEEPSEEK_API_KEY"))("OLR-E2E-010: a compaction summary cut by its output limit reports incomplete with the provider reason and is rejected", async () => {
    const model = await harness.catalogModel("DEEPSEEK", DEEPSEEK_MODEL);
    const settings: Record<string, string> = {
      AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE: "60000",
      AUTOBYTEUS_COMPACTION_TRIGGER_RATIO: "0.3",
      AUTOBYTEUS_COMPACTION_MODEL_SETTINGS: JSON.stringify({ modelIdentifier: null, llmConfig: { max_tokens: 24 } }),
    };
    const settingMessages: string[] = [];
    try {
      for (const [key, value] of Object.entries(settings)) settingMessages.push(await harness.updateServerSetting(key, value));
      const session = await harness.startRun(chatDefinitionId, model.modelIdentifier, { max_tokens: 1024, extra_params: { thinking_type: "disabled" } });
      const notes = (from: number) => Array.from({ length: 600 }, (_, index) =>
        `Note ${from + index}: warehouse bin ${from + index} holds ${(from + index) * 7} units of part P-${1000 + from + index}.`).join("\n");
      // Long turns grow the history past the trigger (~17.6K of a ~58.7K input budget); the send after that compacts.
      // A rejected summary blocks compaction and holds the input, so each send ends at TURN_COMPLETED or COMPACTION_BLOCKED.
      const ended = (frame: WsMessage) => frame.type === "COMPACTION_BLOCKED" || frame.type === "TURN_COMPLETED";
      const sends = [`${notes(1)}\n\nReply with only the word ok.`, `${notes(601)}\n\nReply with only the word ok.`, "Reply with only the word ok again."];
      const sendFrames: WsMessage[][] = [];
      for (const [index, content] of sends.entries()) {
        const frames = await harness.sendAndWaitFor(session, `OLR-010-T${index + 1}`, content, ended, `OLR-010-T${index + 1} outcome`);
        sendFrames.push(frames);
        if (has(frames, (frame) => frame.type === "COMPACTION_BLOCKED")) break;
        await harness.waitFor(session, 0, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", "idle");
      }
      const third = sendFrames.at(-1)!;
      const allFrames = sendFrames.flat();
      const statuses = allFrames.filter((frame) => frame.type.startsWith("COMPACTION_"));
      const turnCalls = ["OLR-010-T1", "OLR-010-T2", "OLR-010-T3"].flatMap((phase) => harness.callsOf(phase));
      const compactionCalls = turnCalls.filter((call) => !call.stream);
      harness.recordCase("OLR-E2E-010", {
        settingMessages, sendsMade: sendFrames.length,
        errors: allFrames.filter((frame) => frame.type === "ERROR").map((frame) => frame.payload),
        compactionFrames: statuses.map((frame) => ({ type: frame.type, ...frame.payload })),
        compactionCalls: compactionCalls.map((call) => harness.summarize(call)), turnCalls: turnCalls.map((call) => harness.summarize(call)),
      });
      expect(compactionCalls.length, "compaction summary calls were made").toBeGreaterThan(0);
      for (const call of compactionCalls) {
        harness.assertLimit(call, "max_tokens", 24, "OLR-010 compaction");
        expect(call.stopSignals).toContain("length");
      }
      const reported = statuses.filter((frame) => frame.payload.completion_status !== undefined && frame.payload.completion_status !== null);
      expect(reported.length, "compaction status frames report a completion status").toBeGreaterThan(0);
      for (const frame of reported) {
        expect(frame.payload.completion_status).toBe("incomplete");
        expect(frame.payload.completion_reason).toBe("length");
      }
      // The output-limited summary is rejected: the compaction does not complete; the run holds the input instead.
      expect(has(third, (frame) => frame.type === "COMPACTION_BLOCKED"), "compaction blocked after the rejected summaries").toBe(true);
      expect(statuses.some((frame) => frame.payload.phase === "failed"), "the compaction attempt failed").toBe(true);
      await harness.stopRun(session);
    } finally {
      for (const key of Object.keys(settings)) await harness.deleteServerSetting(key);
    }
  }, STEP_TIMEOUT_MS);
});
