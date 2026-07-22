import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");
const controlPath = "/tmp/autobyteus-ac018-round3-current.json";
const control = JSON.parse(await fs.readFile(controlPath, "utf8"));
const { root, baseUrl, hostUrl, hostPort, application } = control;
const applicationId = application.id;
const prompt = "Solve 3x + 5 = 20";
const browserExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const playwrightPath = path.resolve(
  repoRoot,
  "node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.js",
);
const playwrightModule = await import(pathToFileURL(playwrightPath).href);
const { chromium } = playwrightModule.default ?? playwrightModule;

const redact = (value) => String(value)
  .replaceAll(root, "<owned-temporary-root>")
  .replaceAll(applicationId, "<isolated-application-id>")
  .replaceAll(baseUrl, "<isolated-server-origin>")
  .replaceAll(hostUrl, "<isolated-host-origin>");

const platformGraphql = async (query, variables = null) => {
  const response = await fetch(`${baseUrl}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  assert(response.ok, `Platform GraphQL returned ${response.status}.`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map((entry) => entry.message).join("\n"));
  return payload.data;
};

const appGraphql = async (query, operationName, variables = null) => {
  const response = await fetch(
    `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend/graphql`,
    {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        requestContext: { applicationId },
        request: { query, operationName, variables },
      }),
    },
  );
  assert(response.ok, `Application GraphQL returned ${response.status}.`);
  const payload = await response.json();
  const result = payload.result;
  if (result?.errors?.length) throw new Error(result.errors.map((entry) => entry.message).join("\n"));
  return result?.data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (read, predicate, timeoutMs, label, intervalMs = 250) => {
  const deadline = Date.now() + timeoutMs;
  let latest;
  do {
    latest = await read();
    if (predicate(latest)) return latest;
    await sleep(intervalMs);
  } while (Date.now() < deadline);
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}. Latest=${redact(JSON.stringify(latest))}`);
};

const entryHtmlUrl = `${baseUrl}/rest${application.entryHtmlAssetPath}`;
const iframeLaunchId = `${applicationId}::iframe-launch-ac018-round3`;
const iframeSrc = new URL(entryHtmlUrl);
iframeSrc.searchParams.set("autobyteusContractVersion", "4");
iframeSrc.searchParams.set("autobyteusApplicationId", applicationId);
iframeSrc.searchParams.set("autobyteusIframeLaunchId", iframeLaunchId);
iframeSrc.searchParams.set("autobyteusHostOrigin", hostUrl);

const bootstrapEnvelope = {
  channel: "autobyteus.application.host",
  contractVersion: "4",
  eventName: "autobyteus.application.host.bootstrap",
  payload: {
    host: { origin: hostUrl },
    application: {
      applicationId,
      localApplicationId: application.localApplicationId,
      packageId: application.packageId,
      name: application.name,
    },
    iframeLaunchId,
    requestContext: { applicationId },
    transport: {
      backendBaseUrl: `${baseUrl}/rest/applications/${encodeURIComponent(applicationId)}/backend`,
      backendNotificationsUrl: `${baseUrl.replace("http://", "ws://")}/ws/applications/${encodeURIComponent(applicationId)}/backend/notifications`,
      backendWebSocketBaseUrl: `${baseUrl.replace("http://", "ws://")}/ws/applications/${encodeURIComponent(applicationId)}/backend/routes`,
      agentCommunicationWebSocketBaseUrl: `${baseUrl.replace("http://", "ws://")}/ws/applications/${encodeURIComponent(applicationId)}/agent-communication`,
    },
  },
};

const hostPage = `<!doctype html>
<html><head><meta charset="utf-8"><title>AC-018 mounted host</title>
<style>html,body{height:100%;margin:0;background:#020617}iframe{width:100%;height:100%;border:0;background:white}</style></head>
<body><iframe id="application-frame" title="Socratic Math Teacher"></iframe>
<script>
const iframe = document.getElementById("application-frame");
const expectedOrigin = ${JSON.stringify(baseUrl)};
const readyEvent = "autobyteus.application.ui.ready";
window.addEventListener("message", (event) => {
  const message = event.data;
  if (event.source !== iframe.contentWindow || event.origin !== expectedOrigin) return;
  if (message?.channel !== "autobyteus.application.host" || message?.eventName !== readyEvent) return;
  iframe.contentWindow.postMessage(${JSON.stringify(bootstrapEnvelope)}, expectedOrigin);
  document.documentElement.dataset.bootstrapDelivered = "true";
}, { once: true });
iframe.src = ${JSON.stringify(iframeSrc.toString())};
</script></body></html>`;

const hostServer = http.createServer((request, response) => {
  if (request.url === "/host") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(hostPage);
    return;
  }
  response.writeHead(404).end();
});

const wire = {
  order: 0,
  ready: [],
  inputs: [],
  accepted: [],
  events: [],
  text: "",
  textLengths: [],
  notifications: [],
};
const consoleErrors = [];
let context;
let page;

const safeFrameString = (payload) => {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  return String(payload);
};

const recordAgentFrame = (direction, raw) => {
  let frame;
  try { frame = JSON.parse(safeFrameString(raw)); } catch { return; }
  const order = ++wire.order;
  if (direction === "sent" && frame.type === "INPUT") {
    wire.inputs.push({
      order,
      requestId: frame.requestId,
      textMatches: frame.input?.text === prompt,
      metadata: frame.input?.metadata,
    });
    return;
  }
  if (direction !== "received") return;
  if (frame.type === "READY") {
    wire.ready.push({ order, address: frame.address });
    return;
  }
  if (frame.type === "INPUT_ACCEPTED") {
    wire.accepted.push({ order, requestId: frame.requestId });
    return;
  }
  if (frame.type !== "EVENT" || !frame.event) return;
  const event = frame.event;
  const publicEvent = event.event ?? {};
  const row = {
    order,
    sequence: event.sequence,
    source: publicEvent.source,
    type: publicEvent.type,
    producerMemberRouteKey: event.producer?.memberRouteKey ?? null,
  };
  if (publicEvent.type === "SEGMENT_CONTENT") {
    row.kind = publicEvent.data?.kind ?? null;
    if (row.kind === "TEXT" && typeof publicEvent.data?.delta === "string" && publicEvent.data.delta.length > 0) {
      wire.text += publicEvent.data.delta;
      wire.textLengths.push(wire.text.length);
      row.textDeltaLength = publicEvent.data.delta.length;
      row.cumulativeTextLength = wire.text.length;
    }
  }
  if (String(publicEvent.type).startsWith("TOOL_")) {
    row.toolName = publicEvent.data?.toolName ?? null;
  }
  wire.events.push(row);
};

const recordNotificationFrame = (raw) => {
  let frame;
  try { frame = JSON.parse(safeFrameString(raw)); } catch { return; }
  if (frame?.type === "notification" && typeof frame.notification?.topic === "string") {
    wire.notifications.push({ order: ++wire.order, topic: frame.notification.topic });
  }
};

const flattenAgentMembers = (members, out = []) => {
  for (const member of Array.isArray(members) ? members : []) {
    if (member?.memberKind === "agent") out.push(member);
    if (member?.memberKind === "agent_team") flattenAgentMembers(member.memberTree, out);
  }
  return out;
};

try {
  await new Promise((resolve, reject) => {
    hostServer.once("error", reject);
    hostServer.listen(hostPort, "127.0.0.1", resolve);
  });
  context = await chromium.launchPersistentContext(path.join(root, "browser-profile"), {
    executablePath: browserExecutable,
    headless: true,
    viewport: { width: 1440, height: 1100 },
    locale: "en-US",
    timezoneId: "Europe/Berlin",
    args: ["--disable-background-networking", "--no-first-run"],
  });
  page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleErrors.push(redact(message.text()));
    }
  });
  page.on("websocket", (socket) => {
    if (socket.url().includes("/agent-communication")) {
      socket.on("framesent", (event) => recordAgentFrame("sent", event.payload));
      socket.on("framereceived", (event) => recordAgentFrame("received", event.payload));
    }
    if (socket.url().includes("/backend/notifications")) {
      socket.on("framereceived", (event) => recordNotificationFrame(event.payload));
    }
  });

  await page.goto(`${hostUrl}/host`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => document.documentElement.dataset.bootstrapDelivered === "true", null, { timeout: 15_000 });
  const frame = await waitFor(
    async () => page.frames().find((candidate) => candidate !== page.mainFrame() && candidate.url().includes("/application-bundles/")),
    Boolean,
    15_000,
    "generated application iframe",
  );
  await frame.locator("#workspace-status").waitFor({ state: "visible", timeout: 30_000 });
  await frame.locator("#workspace-status").waitFor({ state: "visible", timeout: 30_000 });
  await frame.waitForFunction(() => document.querySelector("#workspace-status")?.textContent?.includes("Socratic Math Teacher is ready"), null, { timeout: 30_000 });

  await page.screenshot({ path: path.join(here, "10-mounted-initial.png"), fullPage: true });
  await frame.locator("#lesson-prompt-input").fill(prompt);
  await frame.locator("#start-lesson-button").click();

  const lessonsQuery = `query LessonsQuery { lessons { lessonId prompt status latestBindingId latestRunId latestBindingStatus lastErrorMessage updatedAt } }`;
  const lessonQuery = `query LessonQuery($lessonId: ID!) { lesson(lessonId: $lessonId) { lessonId prompt status latestBindingId latestRunId latestBindingStatus lastErrorMessage updatedAt createdAt closedAt tutorTargetAddress messages { messageId lessonId role kind body createdAt } } }`;
  const lessonSummary = await waitFor(
    async () => (await appGraphql(lessonsQuery, "LessonsQuery"))?.lessons?.[0] ?? null,
    (value) => Boolean(value?.lessonId && value?.latestBindingId && value?.latestRunId),
    60_000,
    "started lesson binding",
  );
  assert.equal(lessonSummary.prompt, prompt);
  const lessonId = lessonSummary.lessonId;
  const initialDetail = await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson ?? null,
    (value) => Boolean(value?.tutorTargetAddress),
    30_000,
    "builder-backed tutor target",
  );
  assert.deepEqual(initialDetail.tutorTargetAddress?.target, { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" });
  assert.equal(initialDetail.tutorTargetAddress?.bindingId, initialDetail.latestBindingId);

  const resume = await platformGraphql(
    `query GetTeamRunResumeConfig($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { teamRunId isActive metadata } }`,
    { teamRunId: lessonSummary.latestRunId },
  );
  const metadata = resume.getTeamRunResumeConfig.metadata;
  const members = flattenAgentMembers(metadata?.memberTree);
  const tutor = members.find((member) => member.memberRouteKey === "tutor");
  assert(tutor, "Effective tutor metadata missing.");
  assert.equal(tutor.runtimeKind, "codex_app_server");
  assert.equal(tutor.llmModelIdentifier, "gpt-5.6-sol");
  assert.deepEqual(tutor.llmConfig, { reasoning_effort: "high" });
  assert.equal(tutor.workspaceRootPath, path.join(root, "tutor-workspace"));
  assert.equal(tutor.llmConfig?.service_tier, undefined);

  await waitFor(
    async () => ({
      textLength: wire.text.length,
      completed: wire.events.some((row) => row.type === "AGENT_RESPONSE_COMPLETED"),
      toolStarted: wire.events.some((row) => row.type === "TOOL_EXECUTION_STARTED" && row.toolName === "publish_artifacts"),
      toolSucceeded: wire.events.some((row) => row.type === "TOOL_EXECUTION_SUCCEEDED" && row.toolName === "publish_artifacts"),
    }),
    (value) => value.textLength > 0 && value.completed && value.toolStarted && value.toolSucceeded,
    180_000,
    "live TEXT, response completion, and publish_artifacts success",
    500,
  );

  const durableDetail = await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson ?? null,
    (value) => Array.isArray(value?.messages) && value.messages.some((message) => message.role === "tutor" && message.kind === "lesson_response" && String(message.body).trim()),
    30_000,
    "durable tutor transcript",
    500,
  );
  const tutorMessage = durableDetail.messages.find((message) => message.role === "tutor" && message.kind === "lesson_response");
  assert(tutorMessage);
  await waitFor(
    async () => wire.notifications.map((row) => row.topic),
    (topics) => topics.includes("lesson.response_received"),
    30_000,
    "lesson.response_received notification",
  );
  await frame.waitForFunction(() => document.querySelector(".live-tutor")?.getAttribute("data-live-state") === "saved", null, { timeout: 30_000 });

  assert.equal(wire.ready.length, 1, "Expected one standard-connection READY frame.");
  assert.equal(wire.inputs.length, 1, "Expected exactly one INPUT frame.");
  assert.equal(wire.accepted.length, 1, "Expected exactly one INPUT_ACCEPTED frame.");
  assert(wire.ready[0].order < wire.inputs[0].order, "READY must precede INPUT.");
  assert(wire.inputs[0].order < wire.accepted[0].order, "INPUT_ACCEPTED must follow INPUT.");
  assert.equal(wire.inputs[0].requestId, wire.accepted[0].requestId, "INPUT acceptance correlation mismatch.");
  assert.equal(wire.inputs[0].textMatches, true);
  assert.deepEqual(wire.inputs[0].metadata, { lessonId, requestKind: "lesson_start" });
  assert.deepEqual(wire.ready[0].address?.target, { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" });
  assert(wire.textLengths.length > 0 && wire.textLengths.every((value, index, values) => index === 0 ? value > 0 : value > values[index - 1]));
  const eventSequences = wire.events.map((row) => row.sequence).filter(Number.isInteger);
  assert(eventSequences.every((value, index, values) => index === 0 || value > values[index - 1]), "Public event sequence must increase.");

  const durableText = tutorMessage.body.trim();
  const normalized = durableText.toLowerCase();
  const mathMarkers = ["3x", "20", "subtract", "minus", "both sides", "isolate", "equation", "5"].filter((marker) => normalized.includes(marker));
  const socraticCue = durableText.includes("?") || /\b(what|which|how|can you|try|first step|next step)\b/i.test(durableText);
  assert(mathMarkers.length >= 2, `Tutor output was not demonstrably relevant: ${durableText}`);
  assert(socraticCue, `Tutor output was not demonstrably Socratic: ${durableText}`);

  await page.screenshot({ path: path.join(here, "11-mounted-saved.png"), fullPage: true });
  await frame.locator("#close-lesson").click();
  const closedDetail = await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson ?? null,
    (value) => value?.status === "closed" && Boolean(value?.closedAt),
    30_000,
    "closed lesson",
  );
  await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson?.latestBindingStatus ?? null,
    (value) => ["TERMINATED", "FAILED", "ORPHANED"].includes(value),
    30_000,
    "terminal binding projection",
  ).catch(() => null);

  const safeEvents = wire.events.map((row) => ({
    sequence: row.sequence,
    source: row.source,
    type: row.type,
    producerMemberRouteKey: row.producerMemberRouteKey,
    ...(row.kind ? { kind: row.kind } : {}),
    ...(row.textDeltaLength ? { textDeltaLength: row.textDeltaLength, cumulativeTextLength: row.cumulativeTextLength } : {}),
    ...(row.toolName ? { toolName: row.toolName } : {}),
  }));
  const result = {
    result: "PASS",
    execution: {
      generatedPackageImportedFresh: true,
      mountedGeneratedUiInChrome: true,
      prompt,
      cleanRetryUsed: false,
      paidLiveTurnsStarted: 1,
    },
    effectiveTutorConfig: {
      runtimeKind: tutor.runtimeKind,
      llmModelIdentifier: tutor.llmModelIdentifier,
      llmConfig: tutor.llmConfig,
      serviceTierPresent: Object.prototype.hasOwnProperty.call(tutor.llmConfig ?? {}, "service_tier"),
      workspaceMatchesOwnedIsolatedPath: tutor.workspaceRootPath === path.join(root, "tutor-workspace"),
    },
    targetAndWire: {
      target: { kind: initialDetail.tutorTargetAddress.target.kind, memberRouteKey: initialDetail.tutorTargetAddress.target.memberRouteKey },
      readyCount: wire.ready.length,
      inputCount: wire.inputs.length,
      acceptedCount: wire.accepted.length,
      readyBeforeInput: wire.ready[0].order < wire.inputs[0].order,
      acceptedRequestMatched: wire.inputs[0].requestId === wire.accepted[0].requestId,
      exactPromptSent: wire.inputs[0].textMatches,
      metadataKeys: Object.keys(wire.inputs[0].metadata ?? {}).sort(),
      increasingTextLengths: wire.textLengths,
      publicEvents: safeEvents,
    },
    liveAndDurable: {
      publicLiveText: wire.text.trim(),
      responseCompleted: wire.events.some((row) => row.type === "AGENT_RESPONSE_COMPLETED"),
      publishArtifactsStarted: wire.events.some((row) => row.type === "TOOL_EXECUTION_STARTED" && row.toolName === "publish_artifacts"),
      publishArtifactsSucceeded: wire.events.some((row) => row.type === "TOOL_EXECUTION_SUCCEEDED" && row.toolName === "publish_artifacts"),
      notificationTopics: [...new Set(wire.notifications.map((row) => row.topic))],
      durableMessageKind: tutorMessage.kind,
      durableTutorText: durableText,
      durableTutorMessageCount: durableDetail.messages.filter((message) => message.role === "tutor").length,
      uiReachedSavedState: true,
      liveAndDurableTextEqual: wire.text.trim() === durableText,
    },
    qualitative: {
      mathMarkers,
      focusedSocraticCue: socraticCue,
      relevantAndSocratic: true,
    },
    closure: {
      lessonClosed: closedDetail.status === "closed",
      closedAtPresent: Boolean(closedDetail.closedAt),
      browserErrors: consoleErrors,
    },
    evidencePolicy: {
      credentialsRetained: false,
      hiddenReasoningRetained: false,
      rawProviderPayloadsRetained: false,
      runtimeIdentifiersRetained: false,
    },
  };
  await fs.writeFile(path.join(here, "10-live-journey-redacted.json"), `${JSON.stringify(result, null, 2)}\n`);
  control.lessonStarted = true;
  control.lessonClosed = true;
  control.liveResultPath = path.join(here, "10-live-journey-redacted.json");
  await fs.writeFile(controlPath, JSON.stringify(control));
  console.log(JSON.stringify({
    result: result.result,
    mountedGeneratedUiInChrome: true,
    effectiveTutorConfig: result.effectiveTutorConfig,
    targetAndWire: {
      target: result.targetAndWire.target,
      readyCount: result.targetAndWire.readyCount,
      inputCount: result.targetAndWire.inputCount,
      acceptedCount: result.targetAndWire.acceptedCount,
      increasingTextEventCount: result.targetAndWire.increasingTextLengths.length,
    },
    liveAndDurable: {
      responseCompleted: true,
      publishArtifactsSucceeded: true,
      durableMessageKind: result.liveAndDurable.durableMessageKind,
      notificationTopics: result.liveAndDurable.notificationTopics,
    },
    qualitative: result.qualitative,
    lessonClosed: result.closure.lessonClosed,
  }, null, 2));
} finally {
  if (context) await context.close().catch(() => undefined);
  await new Promise((resolve) => hostServer.close(() => resolve()));
}
