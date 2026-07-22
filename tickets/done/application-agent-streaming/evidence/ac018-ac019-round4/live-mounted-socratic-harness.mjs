import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");
const controlPath = "/tmp/autobyteus-ac018-round4-current.json";
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
  .replaceAll(hostUrl, "<isolated-host-origin>")
  .replace(/(?:socratic_math_(?:team|tutor)|binding|lesson|message|thread|run)_[0-9a-f_-]+/gi, "<isolated-runtime-id>");

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

const lessonsQuery = `query LessonsQuery { lessons { lessonId prompt status latestBindingId latestRunId latestBindingStatus lastErrorMessage updatedAt } }`;
const lessonQuery = `query LessonQuery($lessonId: ID!) { lesson(lessonId: $lessonId) { lessonId prompt status latestBindingId latestRunId latestBindingStatus lastErrorMessage updatedAt createdAt closedAt tutorTargetAddress messages { messageId lessonId role kind body createdAt } } }`;

const entryHtmlUrl = `${baseUrl}/rest${application.entryHtmlAssetPath}`;
const iframeLaunchId = `${applicationId}::iframe-launch-ac018-round4`;
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
window.addEventListener("message", (event) => {
  const message = event.data;
  if (event.source !== iframe.contentWindow || event.origin !== expectedOrigin) return;
  if (message?.channel !== "autobyteus.application.host" || message?.eventName !== "autobyteus.application.ui.ready") return;
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
  connections: 0,
  connectionCloses: 0,
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
let frame;
let lessonId = null;
let teamRunId = null;
let lessonClosed = false;
let effectiveTutor = null;
let initialDetail = null;

const safeFrameString = (payload) => {
  if (typeof payload === "string") return payload;
  if (Buffer.isBuffer(payload)) return payload.toString("utf8");
  return String(payload);
};

const recordAgentFrame = (direction, raw) => {
  let serverFrame;
  try { serverFrame = JSON.parse(safeFrameString(raw)); } catch { return; }
  const order = ++wire.order;
  if (direction === "sent" && serverFrame.type === "INPUT") {
    wire.inputs.push({
      order,
      requestId: serverFrame.requestId,
      textMatches: serverFrame.input?.text === prompt,
      metadata: serverFrame.input?.metadata,
    });
    return;
  }
  if (direction !== "received") return;
  if (serverFrame.type === "READY") {
    wire.ready.push({ order, address: serverFrame.address });
    return;
  }
  if (serverFrame.type === "INPUT_ACCEPTED") {
    wire.accepted.push({ order, requestId: serverFrame.requestId });
    return;
  }
  if (serverFrame.type !== "EVENT" || !serverFrame.event) return;
  const event = serverFrame.event;
  const publicEvent = event.event ?? {};
  const row = {
    order,
    sequence: event.sequence,
    type: publicEvent.type,
    producerMemberRouteKey: event.producer?.memberRouteKey ?? null,
  };
  if (publicEvent.type === "TEXT_DELTA" && typeof publicEvent.delta === "string" && publicEvent.delta.length > 0) {
    wire.text += publicEvent.delta;
    wire.textLengths.push(wire.text.length);
    row.textDeltaLength = publicEvent.delta.length;
    row.cumulativeTextLength = wire.text.length;
  }
  wire.events.push(row);
};

const recordNotificationFrame = (raw) => {
  let serverFrame;
  try { serverFrame = JSON.parse(safeFrameString(raw)); } catch { return; }
  if (serverFrame?.type === "notification" && typeof serverFrame.notification?.topic === "string") {
    wire.notifications.push({ order: ++wire.order, topic: serverFrame.notification.topic });
  }
};

const flattenAgentMembers = (members, out = []) => {
  for (const member of Array.isArray(members) ? members : []) {
    if (member?.memberKind === "agent") out.push(member);
    if (member?.memberKind === "agent_team") flattenAgentMembers(member.memberTree, out);
  }
  return out;
};

const readSafeMonitor = async () => {
  if (!teamRunId) return { publicAssistantText: "", publicVisuals: [], thinkingVisualsObservedButContentNotQueriedOrRetained: 0 };
  const monitor = await platformGraphql(
    `query SafeTeamMemberMonitor($teamRunId: String!, $memberRouteKey: String!) {
      getTeamMemberEventMonitorActiveTracePage(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
        cursorStatus
        events { visuals {
          __typename
          ... on EventMonitorUserVisual { kind text }
          ... on EventMonitorAssistantTextVisual { kind content }
          ... on EventMonitorToolCardVisual { kind toolName statusKey summaryArgs { path file_path filepath filename target_path } }
        } }
      }
    }`,
    { teamRunId, memberRouteKey: "tutor" },
  );
  const pageData = monitor.getTeamMemberEventMonitorActiveTracePage;
  const publicVisuals = [];
  let thinkingCount = 0;
  for (const event of pageData?.events ?? []) {
    for (const visual of event.visuals ?? []) {
      if (visual.__typename === "EventMonitorThinkingVisual") {
        thinkingCount += 1;
      } else if (visual.__typename === "EventMonitorAssistantTextVisual") {
        publicVisuals.push({ type: "assistant_text", content: String(visual.content ?? "") });
      } else if (visual.__typename === "EventMonitorUserVisual") {
        publicVisuals.push({ type: "user", textMatchesApprovedPrompt: visual.text === prompt });
      } else if (visual.__typename === "EventMonitorToolCardVisual") {
        const args = visual.summaryArgs ?? {};
        const candidatePath = args.path ?? args.file_path ?? args.filepath ?? args.filename ?? args.target_path ?? null;
        publicVisuals.push({
          type: "tool",
          toolName: visual.toolName,
          statusKey: visual.statusKey,
          ...(candidatePath ? { pathSuffix: String(candidatePath).split(/[/\\]/).slice(-2).join("/") } : {}),
        });
      }
    }
  }
  return {
    cursorStatus: pageData?.cursorStatus ?? null,
    publicAssistantText: publicVisuals.filter((entry) => entry.type === "assistant_text").map((entry) => entry.content).join("").trim(),
    publicVisuals,
    thinkingVisualsObservedButContentNotQueriedOrRetained: thinkingCount,
  };
};

const readSafeArtifact = async () => {
  const files = await fs.readdir(root, { recursive: true });
  const metadataRel = files.find((entry) => entry.endsWith("published_artifacts.json"));
  if (!metadataRel) return null;
  const metadata = JSON.parse(await fs.readFile(path.join(root, metadataRel), "utf8"));
  const summary = (metadata.summaries ?? []).find((entry) => String(entry.path ?? "").endsWith("socratic-math/lesson-response.md")) ?? metadata.summaries?.[0];
  if (!summary) return null;
  const revision = (metadata.revisions ?? []).find((entry) => entry.artifactId === summary.id) ?? metadata.revisions?.[0] ?? {};
  const artifact = { ...revision, ...summary };
  const absolutePath = artifact.path;
  const content = absolutePath ? await fs.readFile(absolutePath, "utf8") : "";
  return {
    status: artifact.status ?? null,
    pathSuffix: String(absolutePath ?? "").split(/[/\\]/).slice(-2).join("/"),
    type: artifact.type ?? null,
    sourceFileName: artifact.sourceFileName ?? null,
    description: artifact.description ?? null,
    content: content.trim(),
  };
};

const readUiObservations = async () => frame ? frame.evaluate(() => window.__ac018UiObservations ?? []) : [];

const writeFailureEvidence = async (error) => {
  let durableDetail = null;
  if (lessonId) {
    durableDetail = (await appGraphql(lessonQuery, "LessonQuery", { lessonId }).catch(() => null))?.lesson ?? null;
  }
  const safeMonitor = await readSafeMonitor().catch(() => null);
  const safeArtifact = await readSafeArtifact().catch(() => null);
  const tutorMessage = durableDetail?.messages?.find((message) => message.role === "tutor" && message.kind === "lesson_response") ?? null;
  const failure = {
    result: "FAIL",
    scenarioId: "ASE-018-LIVE",
    error: redact(error instanceof Error ? error.message : String(error)),
    execution: { prompt, paidLiveTurnsStarted: teamRunId ? 1 : 0, retryUsed: false },
    effectiveTutorConfig: effectiveTutor ? {
      runtimeKind: effectiveTutor.runtimeKind,
      llmModelIdentifier: effectiveTutor.llmModelIdentifier,
      llmConfig: effectiveTutor.llmConfig,
      serviceTierPresent: Object.prototype.hasOwnProperty.call(effectiveTutor.llmConfig ?? {}, "service_tier"),
      workspaceMatchesOwnedIsolatedPath: effectiveTutor.workspaceRootPath === path.join(root, "tutor-workspace"),
    } : null,
    target: initialDetail?.tutorTargetAddress?.target ?? null,
    wire: {
      connectionCount: wire.connections,
      readyCount: wire.ready.length,
      inputCount: wire.inputs.length,
      acceptedCount: wire.accepted.length,
      textLength: wire.text.length,
      publicEvents: wire.events.map(({ sequence, type, producerMemberRouteKey, textDeltaLength, cumulativeTextLength }) => ({ sequence, type, producerMemberRouteKey, ...(textDeltaLength ? { textDeltaLength, cumulativeTextLength } : {}) })),
    },
    notifications: [...new Set(wire.notifications.map((entry) => entry.topic))],
    uiObservations: await readUiObservations().catch(() => []),
    backendEventMonitor: safeMonitor,
    durable: tutorMessage ? { kind: tutorMessage.kind, response: tutorMessage.body } : null,
    artifact: safeArtifact ? { ...safeArtifact, content: undefined } : null,
    evidencePolicy: { credentialsRetained: false, hiddenReasoningRetained: false, rawProviderPayloadsRetained: false, runtimeIdentifiersRetained: false },
  };
  await fs.writeFile(path.join(here, "10-live-failure-redacted.json"), `${JSON.stringify(failure, null, 2)}\n`);
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
    if (message.type() === "error" || message.type() === "warning") consoleErrors.push(redact(message.text()));
  });
  page.on("websocket", (socket) => {
    if (socket.url().includes("/agent-communication")) {
      wire.connections += 1;
      socket.on("framesent", (event) => recordAgentFrame("sent", event.payload));
      socket.on("framereceived", (event) => recordAgentFrame("received", event.payload));
      socket.on("close", () => { wire.connectionCloses += 1; });
    }
    if (socket.url().includes("/backend/notifications")) {
      socket.on("framereceived", (event) => recordNotificationFrame(event.payload));
    }
  });

  await page.goto(`${hostUrl}/host`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForFunction(() => document.documentElement.dataset.bootstrapDelivered === "true", null, { timeout: 15_000 });
  frame = await waitFor(
    async () => page.frames().find((candidate) => candidate !== page.mainFrame() && candidate.url().includes("/application-bundles/")),
    Boolean,
    15_000,
    "generated application iframe",
  );
  await frame.locator("#workspace-status").waitFor({ state: "visible", timeout: 30_000 });
  await frame.waitForFunction(() => document.querySelector("#workspace-status")?.textContent?.includes("Socratic Math Teacher is ready"), null, { timeout: 30_000 });
  await frame.addStyleTag({ content: ".brief-meta-row,.detail-header p,.inline-details{display:none!important}" });
  await frame.evaluate(() => {
    window.__ac018UiObservations = [];
    const capture = () => {
      const live = document.querySelector(".live-tutor");
      const record = {
        liveState: live?.getAttribute("data-live-state") ?? null,
        liveTextLength: document.querySelector(".live-tutor-text")?.textContent?.length ?? 0,
        tutorTranscriptRows: Array.from(document.querySelectorAll(".note-row strong")).filter((node) => node.textContent?.trim() === "tutor").length,
        hintDisabled: document.querySelector("#request-hint")?.disabled ?? null,
        followUpDisabled: document.querySelector("#follow-up-input")?.disabled ?? null,
        closeDisabled: document.querySelector("#close-lesson")?.disabled ?? null,
        closeLabel: document.querySelector("#close-lesson")?.textContent?.trim() ?? null,
        lessonStatus: document.querySelector(".detail-header .badge")?.textContent?.trim() ?? null,
      };
      const rows = window.__ac018UiObservations;
      if (JSON.stringify(rows.at(-1)) !== JSON.stringify(record)) rows.push(record);
    };
    new MutationObserver(capture).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    capture();
  });

  await page.screenshot({ path: path.join(here, "09-mounted-initial.png"), fullPage: true });
  await frame.locator("#lesson-prompt-input").fill(prompt);
  await frame.locator("#start-lesson-button").click();

  const lessonSummary = await waitFor(
    async () => (await appGraphql(lessonsQuery, "LessonsQuery"))?.lessons?.find((entry) => entry.prompt === prompt) ?? null,
    (value) => Boolean(value?.lessonId && value?.latestBindingId && value?.latestRunId),
    60_000,
    "started lesson binding",
  );
  lessonId = lessonSummary.lessonId;
  teamRunId = lessonSummary.latestRunId;
  initialDetail = await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson ?? null,
    (value) => Boolean(value?.tutorTargetAddress),
    30_000,
    "builder-backed tutor target",
  );
  assert.deepEqual(initialDetail.tutorTargetAddress?.target, { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" });
  assert.equal(initialDetail.tutorTargetAddress?.bindingId, initialDetail.latestBindingId);

  const resume = await platformGraphql(
    `query GetTeamRunResumeConfig($teamRunId: String!) { getTeamRunResumeConfig(teamRunId: $teamRunId) { isActive metadata } }`,
    { teamRunId },
  );
  effectiveTutor = flattenAgentMembers(resume.getTeamRunResumeConfig.metadata?.memberTree).find((member) => member.memberRouteKey === "tutor");
  assert(effectiveTutor, "Effective tutor metadata missing.");
  assert.equal(effectiveTutor.runtimeKind, "codex_app_server");
  assert.equal(effectiveTutor.llmModelIdentifier, "gpt-5.6-sol");
  assert.deepEqual(effectiveTutor.llmConfig, { reasoning_effort: "high" });
  assert.equal(effectiveTutor.workspaceRootPath, path.join(root, "tutor-workspace"));
  assert.equal(effectiveTutor.llmConfig?.service_tier, undefined);

  let streamingScreenshotCaptured = false;
  const streamingScreenshotTask = (async () => {
    await frame.locator(".live-tutor-text").waitFor({ state: "visible", timeout: 180_000 });
    await page.screenshot({ path: path.join(here, "10-mounted-streaming.png"), fullPage: true });
    streamingScreenshotCaptured = true;
  })().catch(() => undefined);

  await waitFor(
    async () => ({
      textLength: wire.text.length,
      completed: wire.events.some((row) => row.type === "TURN_COMPLETED"),
    }),
    (value) => value.textLength > 0 && value.completed,
    180_000,
    "nonempty TEXT_DELTA and TURN_COMPLETED",
    250,
  );

  const durableDetail = await waitFor(
    async () => (await appGraphql(lessonQuery, "LessonQuery", { lessonId }))?.lesson ?? null,
    (value) => Array.isArray(value?.messages) && value.messages.some((message) => message.role === "tutor" && message.kind === "lesson_response" && String(message.body).trim()),
    30_000,
    "durable tutor transcript",
    250,
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
  await streamingScreenshotTask;

  assert.equal(wire.connections, 1, "Expected one standard application-agent connection.");
  assert.equal(wire.ready.length, 1, "Expected one READY frame.");
  assert.equal(wire.inputs.length, 1, "Expected exactly one INPUT frame.");
  assert.equal(wire.accepted.length, 1, "Expected exactly one INPUT_ACCEPTED frame.");
  assert(wire.ready[0].order < wire.inputs[0].order, "READY must precede INPUT.");
  assert(wire.inputs[0].order < wire.accepted[0].order, "INPUT_ACCEPTED must follow INPUT.");
  assert.equal(wire.inputs[0].requestId, wire.accepted[0].requestId);
  assert.equal(wire.inputs[0].textMatches, true);
  assert.deepEqual(wire.inputs[0].metadata, { lessonId, requestKind: "lesson_start" });
  assert.deepEqual(wire.ready[0].address?.target, { kind: "AGENT_TEAM_MEMBER", memberRouteKey: "tutor" });
  assert(wire.textLengths.length > 0 && wire.textLengths.every((value, index, values) => index === 0 ? value > 0 : value > values[index - 1]));
  const eventSequences = wire.events.map((row) => row.sequence);
  assert(eventSequences.every((value, index, values) => Number.isInteger(value) && (index === 0 || value > values[index - 1])));
  const allowedEventTypes = new Set(["TURN_STARTED", "TEXT_DELTA", "TURN_COMPLETED", "TURN_INTERRUPTED", "ERROR"]);
  assert(wire.events.every((row) => allowedEventTypes.has(row.type)), "Observed a non-contract public event.");
  assert.equal(wire.events.some((row) => row.type === "TURN_INTERRUPTED" || row.type === "ERROR"), false);
  assert.equal(wire.events.some((row) => String(row.type).startsWith("TOOL_") || row.type === "AGENT_RESPONSE_COMPLETED" || row.type === "SEGMENT_CONTENT"), false);

  const uiObservations = await readUiObservations();
  assert(uiObservations.some((entry) => entry.liveTextLength > 0 && ["streaming", "completed"].includes(entry.liveState)), "Live text was not visibly presented while open.");
  assert(uiObservations.some((entry) => entry.liveState && entry.liveState !== "saved" && entry.hintDisabled === true && entry.followUpDisabled === true && entry.closeDisabled === false), "Open-turn controls were not correctly fenced.");
  const savedUi = uiObservations.findLast((entry) => entry.liveState === "saved");
  assert(savedUi && savedUi.tutorTranscriptRows === 1 && savedUi.liveTextLength === 0 && savedUi.hintDisabled === false && savedUi.followUpDisabled === false && savedUi.closeDisabled === false, "Saved UI did not converge to one authoritative transcript row and available next action.");

  const monitor = await waitFor(readSafeMonitor, (value) => value.publicVisuals.some((entry) => entry.type === "tool" && entry.toolName === "publish_artifacts" && entry.statusKey === "success"), 30_000, "successful publish_artifacts monitor card");
  const artifact = await waitFor(readSafeArtifact, (value) => value?.status === "available" && value.pathSuffix === "socratic-math/lesson-response.md", 30_000, "available lesson artifact");
  const durableText = tutorMessage.body.trim();
  assert.equal(artifact.content, durableText);
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
  );
  await frame.waitForFunction(() => {
    const close = document.querySelector("#close-lesson");
    const hint = document.querySelector("#request-hint");
    const follow = document.querySelector("#follow-up-input");
    return close?.disabled === true && close.textContent?.trim() === "Lesson closed" && hint?.disabled === true && follow?.disabled === true;
  }, null, { timeout: 30_000 });
  await waitFor(async () => wire.connectionCloses, (value) => value === 1, 30_000, "exactly one standard connection close");
  await sleep(1_000);
  assert.equal(wire.connections, 1, "Close must not reconnect.");
  assert.equal(wire.inputs.length, 1, "Close must not resend input.");
  lessonClosed = true;
  await page.screenshot({ path: path.join(here, "12-mounted-closed.png"), fullPage: true });

  const finalUiObservations = await readUiObservations();
  const closedUi = finalUiObservations.at(-1);
  assert.equal(closedUi?.lessonStatus, "closed");
  assert.equal(closedUi?.closeDisabled, true);
  assert.equal(closedUi?.closeLabel, "Lesson closed");
  const publicEvents = wire.events.map(({ sequence, type, producerMemberRouteKey, textDeltaLength, cumulativeTextLength }) => ({
    sequence,
    type,
    producerMemberRouteKey,
    ...(textDeltaLength ? { textDeltaLength, cumulativeTextLength } : {}),
  }));
  const result = {
    result: "PASS",
    scenarios: ["ASE-018-LIVE", "ASE-018-CLOSE"],
    execution: {
      generatedPackageImportedFresh: true,
      mountedGeneratedUiInChrome: true,
      prompt,
      retryUsed: false,
      paidLiveTurnsStarted: 1,
      streamingScreenshotCaptured,
    },
    effectiveTutorConfig: {
      runtimeKind: effectiveTutor.runtimeKind,
      llmModelIdentifier: effectiveTutor.llmModelIdentifier,
      llmConfig: effectiveTutor.llmConfig,
      serviceTierPresent: Object.prototype.hasOwnProperty.call(effectiveTutor.llmConfig ?? {}, "service_tier"),
      workspaceMatchesOwnedIsolatedPath: effectiveTutor.workspaceRootPath === path.join(root, "tutor-workspace"),
    },
    targetAndWire: {
      target: initialDetail.tutorTargetAddress.target,
      connectionCount: wire.connections,
      connectionCloseCount: wire.connectionCloses,
      readyCount: wire.ready.length,
      inputCount: wire.inputs.length,
      acceptedCount: wire.accepted.length,
      readyBeforeInput: wire.ready[0].order < wire.inputs[0].order,
      acceptedRequestMatched: wire.inputs[0].requestId === wire.accepted[0].requestId,
      exactPromptSent: wire.inputs[0].textMatches,
      metadataKeys: Object.keys(wire.inputs[0].metadata ?? {}).sort(),
      increasingTextLengths: wire.textLengths,
      publicEvents,
      onlyApprovedFiveEventTypes: true,
      prohibitedPublicToolThinkingProviderNativeOrObsoleteEventsObserved: false,
    },
    liveAndDurable: {
      publicLiveText: wire.text.trim(),
      turnCompleted: wire.events.some((row) => row.type === "TURN_COMPLETED"),
      notificationTopics: [...new Set(wire.notifications.map((row) => row.topic))],
      durableMessageKind: tutorMessage.kind,
      durableTutorText: durableText,
      durableTutorMessageCount: durableDetail.messages.filter((message) => message.role === "tutor").length,
      uiVisiblyStreamedText: true,
      uiReachedSavedState: true,
      singleAuthoritativeTutorTranscriptRow: true,
      backendMonitorAssistantText: monitor.publicAssistantText,
      publishArtifactsSucceeded: true,
      artifact: { status: artifact.status, pathSuffix: artifact.pathSuffix, type: artifact.type, sourceFileName: artifact.sourceFileName, description: artifact.description },
      artifactMatchesDurableTutorText: artifact.content === durableText,
    },
    qualitative: { mathMarkers, focusedSocraticCue: socraticCue, relevantAndSocratic: true },
    uiStateSummary: {
      openTurnControlsFenced: true,
      savedJoinReenabledOneNextTurn: true,
      finalClosedMonotonic: true,
      observationCount: finalUiObservations.length,
      stateTransitions: finalUiObservations.map((entry) => ({
        liveState: entry.liveState,
        liveTextLength: entry.liveTextLength,
        tutorTranscriptRows: entry.tutorTranscriptRows,
        hintDisabled: entry.hintDisabled,
        followUpDisabled: entry.followUpDisabled,
        closeDisabled: entry.closeDisabled,
        closeLabel: entry.closeLabel,
        lessonStatus: entry.lessonStatus,
      })),
    },
    closure: {
      lessonClosed: closedDetail.status === "closed",
      closedAtPresent: Boolean(closedDetail.closedAt),
      terminalBindingObserved: true,
      oneConnectionClose: wire.connectionCloses === 1,
      reconnectObserved: false,
      secondInputObserved: false,
      browserConsoleWarningsOrErrors: consoleErrors,
    },
    evidencePolicy: {
      credentialsRetained: false,
      hiddenReasoningRetained: false,
      rawProviderPayloadsRetained: false,
      runtimeIdentifiersRetained: false,
      toolInternalsRetained: false,
    },
  };
  await fs.writeFile(path.join(here, "10-live-journey-redacted.json"), `${JSON.stringify(result, null, 2)}\n`);
  control.lessonStarted = true;
  control.lessonClosed = true;
  control.liveResultPath = path.join(here, "10-live-journey-redacted.json");
  await fs.writeFile(controlPath, JSON.stringify(control));
  console.log(JSON.stringify({
    result: "PASS",
    textDeltaCount: wire.events.filter((row) => row.type === "TEXT_DELTA").length,
    turnCompleted: true,
    publishArtifactsSucceeded: true,
    durableTutorMessageCount: 1,
    relevantAndSocratic: true,
    lessonClosed: true,
  }, null, 2));
} catch (error) {
  await writeFailureEvidence(error).catch(() => undefined);
  throw error;
} finally {
  if (lessonId && !lessonClosed) {
    await appGraphql(
      `mutation CloseLessonMutation($input: CloseLessonInput!) { closeLesson(input: $input) { status closedAt latestBindingStatus } }`,
      "CloseLessonMutation",
      { input: { lessonId } },
    ).catch(() => undefined);
  }
  if (context) await context.close().catch(() => undefined);
  await new Promise((resolve) => hostServer.close(() => resolve()));
}
