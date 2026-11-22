// Platform notices of native runs on the phone (autobyteus-526): a run restarted twice, and a Team's and an Org's agent
// told that its background build ended; and how a notice is drawn (autobyteus-585). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` after its own cases
// (`--cases=MSP-75,MSP-76,MSP-77,MSP-99` runs only these).
//
// Stack (owned by the case, removed at its end, inside the probe's temp root):
// - delta, one more node from this worktree's `autobyteus-server-ts/dist/app.js`, whose LM Studio provider is a scripted
//   server of the case: each request is answered by the next step of the case's script, and what the model received is
//   kept (the reminder the agent reads). A native (AutoByteus) run on it starts a real background command with
//   `run_bash(run_in_background)`, so each graceful restart of delta (SIGTERM, as the app's quit) leaves a reminder.
// - The phone: a headless Chrome that maps 192.168.77.21 to 127.0.0.1 and loads the production phone bundle delta serves
//   at /mobile from `http://192.168.77.21:<delta port>`, paired through Phone Access. 390×844, locale en-US, time zone
//   Europe/Berlin (the viewer's zone; the node and the agent keep UTC).
//
// Case:
//   MSP-75 AC-002, AC-003  The phone opens a new native run and sends a first message (a background build starts, the
//                  agent answers REPLY_ONE). delta restarts; the phone sends again (REPLY_TWO, the build started again);
//                  delta restarts again; the phone sends again (REPLY_THREE). Live, without a reload, the conversation
//                  then shows every input and reply once and one restart reminder card per restart, each card's time in
//                  the viewer's zone (`DD Mon YYYY, HH:MM CET`, the agent's UTC time converted); after a reload, the same.
//                  The agent received each reminder with its UTC time. Before autobyteus-526 the turns after a restart
//                  reused `turn_0001`: the view grouped them with the first turn, showing a reminder twice and hiding a reply.
//   MSP-76 AC-002 (SR-002)  A Team's coordinator (native) starts a short background build from the phone and goes idle;
//                  the build ends and the platform's notice wakes it. The phone, open on the coordinator, shows the notice
//                  once and each reply once, live and after a reload.
//   MSP-77 AC-002 (SR-002)  The same for an Org's member (native), opened from the Org's row.
//   MSP-99 autobyteus-585 AC-005  A platform notice is its own row on the phone, never in the agent's message. A native run
//                  starts a short background build (a tool card and a reply); the build ends and the notice wakes it (the
//                  founder's shape: agent row, notice, agent row, the agent after it with its avatar and name again).
//                  Then a long build runs and delta restarts: the restart reminder is its own row after the agent's
//                  long-build turn, before the phone's next message. Live and after a reload: each notice row is
//                  `data-speaker="system"`, labelled "Background tasks finished" / "Application restarted" as its speaker
//                  line, with an icon and no agent avatar or name, no `[Platform notice — …]` line in its body, no colored
//                  panel, and no agent row holds a notice.
import { createServer } from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';

const PHONE_HOST = '192.168.77.21';
const MODEL_KEY = 'restored-run-fixture';
const HEADER = '[Platform notice — application restarted]';
const ZONE = 'Europe/Berlin';

/** An LM Studio-compatible model that answers each request with the next scripted step and records what it received. */
const scriptedModel = () => {
  const requests = [];
  const steps = [];
  const textOf = content => typeof content === 'string' ? content : Array.isArray(content) ? content.map(part => part?.text ?? '').join('\n') : JSON.stringify(content ?? '');
  const server = createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ models: [{ key: MODEL_KEY, max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] }));
      return;
    }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
    const lastAssistant = messages.map(message => message.role).lastIndexOf('assistant');
    if (hasTools) requests.push({ at: Date.now(), lastUser: textOf([...messages].reverse().find(message => message.role === 'user')?.content ?? ''),
      toolResults: messages.slice(lastAssistant + 1).filter(message => message.role === 'tool').map(message => textOf(message.content)) });
    const reply = (hasTools ? steps.shift() : null) ?? { text: 'OK.' };
    const toolCalls = reply.toolCalls?.map((call, index) => ({ index, id: `call-${randomUUID().slice(0, 12)}`, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.args) } }));
    const delta = toolCalls?.length ? { role: 'assistant', tool_calls: toolCalls } : { role: 'assistant', content: reply.text };
    const chunk = (value, finish) => ({ id: `fixture-${requests.length}`, object: 'chat.completion.chunk', created: 1, model: MODEL_KEY, choices: [{ index: 0, delta: value, finish_reason: finish }] });
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls?.length ? 'tool_calls' : 'stop'))}\n\ndata: [DONE]\n\n`);
  });
  return {
    requests, steps,
    listen: () => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))),
    close: () => { server.closeAllConnections(); return new Promise(resolve => server.close(() => resolve())); },
  };
};

/** `YYYY-MM-DD HH:MM UTC` in the agent's text, as the card should show it in `ZONE` (en-GB: day first, 24 h, zone name). */
const localOf = (utc) => {
  const [, date, time] = /(\d{4}-\d\d-\d\d) (\d\d:\d\d) UTC/.exec(utc) ?? [];
  if (!date) return null;
  return new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' })
    .format(new Date(`${date}T${time}:00Z`));
};

/**
 * @param probe the probe's helpers: `runCase`, `serverAt`, `freePort`, `chromium`, `executablePath`, `outputDir`,
 *   `evidence`, `selected`, `sleep`, `waitFor`, `assert`, `redact`.
 */
export const runRestoredRunCases = async (probe) => {
  const { runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, sleep, waitFor, assert, redact } = probe;
  const ids = ['MSP-75', 'MSP-76', 'MSP-77', 'MSP-99'];
  if (probe.selected && !ids.some(id => probe.selected.has(id))) return;
  const model = scriptedModel();
  const modelOrigin = await model.listen();
  const tag = `MSP75_${randomUUID().slice(0, 8)}`;
  const delta = await serverAt('delta', await freePort(), { LMSTUDIO_HOSTS: modelOrigin });
  const phoneOrigin = `http://${PHONE_HOST}:${delta.port}`;
  let browser = null;
  let currentCase = 'restored-run-setup';
  /** Browser lines while delta is down on purpose (and shortly after, while the phone reconnects) are expected. */
  let downUntil = 0;
  const restartDelta = async () => {
    downUntil = Number.POSITIVE_INFINITY;
    await delta.stop();
    await delta.start();
    downUntil = Date.now() + 15_000;
  };
  try {
    // ---- delta's native model and definitions -------------------------------------------------------------------
    const models = (await delta.gql('mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}'))
      .reloadProviderModelCatalog.llmModels.map(entry => entry.modelIdentifier);
    const llmModelIdentifier = models.find(id => id.startsWith(MODEL_KEY));
    assert(llmModelIdentifier, 'delta lists the scripted LM Studio model', { models });
    const definition = async (name) => (await delta.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name,
      role: 'engineer', description: 'restored run (phone probe)', instructions: 'Run the commands you are asked to run.', toolNames: ['run_bash'], skillNames: [] } })).createAgentDefinition.id;
    const workspace = path.join(delta.dataDir, '..', 'workspace');
    await fs.mkdir(workspace, { recursive: true });
    const native = { workspaceRootPath: workspace, llmModelIdentifier, autoExecuteTools: true, runtimeKind: 'autobyteus' };
    const build = { name: 'run_bash', args: { command: `${JSON.stringify(process.execPath)} -e "setInterval(()=>{},1000)" ${tag}`, run_in_background: true } };

    // ---- the phone, paired, in Europe/Berlin ----------------------------------------------------------------------
    browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', `--host-resolver-rules=MAP ${PHONE_HOST} 127.0.0.1`] });
    const settings = await delta.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
    assert(settings.status === 200, 'delta Phone Access on', settings);
    const pairing = await delta.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: phoneOrigin, serverName: 'Delta Test Node', trustedPrivateHttpAcknowledged: true });
    assert(pairing.status === 201 && pairing.body.mobileUrl, 'delta pairing session', pairing.status);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: ZONE });
    const page = await context.newPage();
    const browserError = (text, sourceUrl = '') => {
      const line = redact(`phone-delta console: ${text}`);
      const cause = Date.now() <= downUntil ? 'delta restarted on purpose; the phone reconnects'
        // The browser's own `/favicon.ico` request at the origin root carries no credential: 401 before any route (NA-1).
        : /status of 401 \(Unauthorized\)$/.test(line) && sourceUrl.startsWith(phoneOrigin) && new URL(sourceUrl).pathname === '/favicon.ico'
          ? 'the browser\'s favicon request at the origin root (401 /favicon.ico, no credential)' : null;
      evidence.browserErrors.push({ case: currentCase, line, known: Boolean(cause), ...(cause ? { cause } : {}) });
    };
    page.on('console', message => { if (message.type() === 'error') browserError(message.text(), message.location()?.url ?? ''); });
    page.on('pageerror', error => browserError(`pageerror ${error.message}`));
    await page.goto(pairing.body.mobileUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="mobile-pair-button"]').click({ timeout: 60_000 });
    // Paired: the pairing page goes; delta has no run yet, so the phone shows its empty list until a case makes one.
    await page.locator('[data-testid="mobile-pair-button"]').waitFor({ state: 'detached', timeout: 60_000 });
    const screen = () => page.evaluate(() => {
      const node = document.querySelector('[data-testid="mobile-run-screen"]');
      return { state: node?.getAttribute('data-state') ?? null, query: location.search };
    });
    /** Opens the run of a list row (`agent:<id>`, `team:<id>` its coordinator, `org:<id>` its member); a reload keeps an open run open. */
    const openRun = async (key, runId) => {
      await sleep(1_500);
      const now = await screen();
      if (now.state === 'open' && now.query.includes(runId)) return;
      // The list, opened at the phone's own address: after a reload the screen's back follows the browser history, which
      // here starts at the pairing link. The pairing is kept in the phone's storage.
      if (now.state === 'open' || !(await page.locator('[data-testid="mobile-run-tree"]:visible').count())) {
        await page.goto(`${phoneOrigin}/mobile/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      }
      const rowOpen = `[data-testid="mobile-run-row-${key}"] [data-testid="mobile-run-open"]`;
      await page.locator('[data-testid="mobile-run-tree"]').waitFor({ timeout: 60_000 });
      await waitFor(`row ${key} in the phone's list`, async () => (await page.locator(rowOpen).count()) > 0, 60_000);
      await page.locator(rowOpen).click();
      await waitFor(`the run screen of ${key}`, async () => (await screen()).state === 'open', 30_000);
    };
    /** A failing case's screen, kept for its evidence. */
    const failShot = name => page.screenshot({ path: path.join(outputDir, `${name}-at-failure.png`) }).catch(() => undefined);
    const conversation = () => page.evaluate(() => document.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? '');
    const send = async (text) => {
      const box = page.locator('[data-testid="mobile-run-conversation"] textarea').last();
      const button = page.locator('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]').last();
      await waitFor(`Send enabled for "${text}"`, async () => {
        if (!(await box.inputValue().catch(() => ''))) await box.fill(text).catch(() => undefined);
        return (await button.count()) > 0 && await button.isEnabled();
      }, 60_000);
      await button.click();
    };
    /**
     * The notice rows labelled `label` (the row's name, its `aria-label`: "Application restarted", "Background tasks
     * finished", …), as the phone shows them now: each row's text (label and body).
     */
    const cardsWith = label => page.locator(`[data-testid="mobile-run-conversation"] [data-testid="system-task-notification-segment"][aria-label="${label}"]`)
      .evaluateAll(nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim()));
    const count = async needle => (await conversation()).split(needle).length - 1;

    currentCase = 'MSP-75';
    await runCase('MSP-75', async () => {
      const created = (await delta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: await definition('Build Runner'), ...native } })).createAgentRun;
      assert(created.success, created.message);
      const runId = created.runId;
      const first = model.requests.length;
      model.steps.push({ toolCalls: [build] }, { text: 'REPLY_ONE' }, { toolCalls: [build] }, { text: 'REPLY_TWO' }, { text: 'REPLY_THREE' });
      /** What the phone shows now: the reminder cards' text, and how often each input and reply appears. */
      const shown = async () => ({ cards: await cardsWith('Application restarted'),
        inputs: [await count('Start the build in the background.'), await count('Start the build again.'), await count('And now?')],
        replies: [await count('REPLY_ONE'), await count('REPLY_TWO'), await count('REPLY_THREE')] });
      const backgroundStarted = (index) => waitFor(`background start ${index + 1}`, async () => model.requests[first + index]?.toolResults[0]?.includes('"status":"running"') ?? false, 60_000);

      await openRun(`agent:${runId}`, runId);
      await send('CASE:MSP-75 Start the build in the background.');
      await waitFor('REPLY_ONE on the phone', async () => (await conversation()).includes('REPLY_ONE'), 90_000);
      await backgroundStarted(1);
      await sleep(3_000);
      await restartDelta();
      await send('CASE:MSP-75 Start the build again.');
      await waitFor('REPLY_TWO on the phone', async () => (await conversation()).includes('REPLY_TWO'), 120_000);
      await backgroundStarted(3);
      const afterFirst = await shown();
      await page.screenshot({ path: path.join(outputDir, 'MSP-75-after-first-restart.png') }).catch(() => undefined);
      await sleep(3_000);
      await restartDelta();
      await send('CASE:MSP-75 And now?');
      await waitFor('REPLY_THREE on the phone', async () => (await conversation()).includes('REPLY_THREE'), 120_000);
      await sleep(2_000);
      const live = await shown();
      await page.screenshot({ path: path.join(outputDir, 'MSP-75-live-after-two-restarts.png') }).catch(() => undefined);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openRun(`agent:${runId}`, runId);
      await waitFor('the conversation loaded after the reload', async () => (await conversation()).includes('REPLY_THREE'), 60_000);
      await sleep(2_000);
      const reloaded = await shown();
      await page.screenshot({ path: path.join(outputDir, 'MSP-75-after-reload.png') }).catch(() => undefined);
      // The first request of each turn (no tool results yet) carries the input with its reminder; later ones repeat it.
      const agentTimes = model.requests.slice(first).filter(request => request.toolResults.length === 0 && request.lastUser.includes(HEADER)).map(request => /restarted at (\d{4}-\d\d-\d\d \d\d:\d\d UTC)/.exec(request.lastUser)?.[1] ?? null);
      const expectedCards = agentTimes.map(utc => localOf(utc));
      const facts = { runId, agentTimes, expectedCards, afterFirst, live, reloaded, requests: model.requests.length - first };
      evidence.restoredRun = facts;

      assert(agentTimes.length === 2 && agentTimes.every(Boolean), 'the agent received each reminder once, with its UTC time', facts);
      assert(expectedCards.every(local => / (CET|CEST)$/.test(local ?? '')), 'the expected local times name the Berlin zone', facts);
      const right = (state, restarts) => state.cards.length === restarts
        && state.cards.every((card, index) => card.includes(`The application restarted at ${expectedCards[index]} (reason: a restart).`))
        && state.cards.every(card => !card.includes(' UTC'))
        && state.inputs.slice(0, restarts + 1).every(n => n === 1) && state.replies.slice(0, restarts + 1).every(n => n === 1);
      assert(right(afterFirst, 1), 'live after the first restart: one card in the viewer\'s time, every input and reply once', facts);
      assert(right(live, 2), 'live after the second restart: one card per restart in the viewer\'s time, every input and reply once', facts);
      assert(right(reloaded, 2), 'after a reload: the same', facts);
      return facts;
    });

    /**
     * A background build of a Team's coordinator or an Org's member ends while it is idle: the platform's notice wakes it.
     * The phone, open on that agent, shows the notice once live and once after a reload, and each reply once.
     */
    const noticeOnce = async (caseId, key, runId, shot) => {
      try { return await noticeOnceSteps(caseId, key, runId, shot); } catch (error) { await failShot(shot); throw error; }
    };
    const noticeOnceSteps = async (caseId, key, runId, shot) => {
      const first = model.requests.length;
      const short = { name: 'run_bash', args: { command: `sleep 4; echo ${caseId}_BUILT`, run_in_background: true } };
      model.steps.push({ toolCalls: [short] }, { text: `${caseId}_STARTED` }, { text: `${caseId}_NOTED` });
      await openRun(key, runId);
      await send(`CASE:${caseId} Start the build in the background.`);
      await waitFor(`${caseId}_NOTED on the phone`, async () => (await conversation()).includes(`${caseId}_NOTED`), 120_000);
      await sleep(2_000);
      const marker = 'Background tasks finished';
      const live = { cards: await cardsWith(marker), started: await count(`${caseId}_STARTED`), noted: await count(`${caseId}_NOTED`) };
      await page.screenshot({ path: path.join(outputDir, `${shot}-live.png`) }).catch(() => undefined);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openRun(key, runId);
      await waitFor(`${caseId} conversation after the reload`, async () => (await conversation()).includes(`${caseId}_NOTED`), 60_000);
      await sleep(2_000);
      const reloaded = { cards: await cardsWith(marker), started: await count(`${caseId}_STARTED`), noted: await count(`${caseId}_NOTED`) };
      await page.screenshot({ path: path.join(outputDir, `${shot}-after-reload.png`) }).catch(() => undefined);
      const facts = { key, runId, live, reloaded, requests: model.requests.length - first, noticeReachedAgent: model.requests.slice(first).some(request => request.lastUser.includes(`${caseId}_BUILT`)) };
      evidence[`noticeOnce${caseId}`] = facts;
      assert(facts.noticeReachedAgent, `${caseId}: the agent received the notice`, facts);
      for (const [label, state] of [['live', live], ['after a reload', reloaded]]) {
        assert(state.cards.length === 1 && state.cards[0].includes(`${caseId}_BUILT`), `${caseId} ${label}: the notice once`, facts);
        assert(state.started === 1 && state.noted === 1, `${caseId} ${label}: each reply once`, facts);
      }
      return facts;
    };

    currentCase = 'MSP-76';
    await runCase('MSP-76', async () => {
      const lead = await definition('Build Lead');
      const mate = await definition('Build Mate');
      const teamDef = (await delta.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name: 'Build Team',
        description: 'notices (phone probe)', instructions: 'Follow your instructions.', coordinatorMemberName: 'lead',
        nodes: [{ memberName: 'lead', ref: lead, refScope: 'SHARED' }, { memberName: 'mate', ref: mate, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
      const team = (await delta.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: teamDef,
        teamConfigs: [{ teamAddress: '/', ...native }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: lead, ...native }, { memberAddress: '/mate', agentDefinitionId: mate, ...native }] } })).createAgentTeamRun;
      assert(team.success, team.message);
      return noticeOnce('MSP-76', `team:${team.teamRunId}`, team.teamRunId, 'MSP-76-team-lead');
    });

    currentCase = 'MSP-77';
    await runCase('MSP-77', async () => {
      const worker = await definition('Build Worker');
      const orgDef = (await delta.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Build Org', description: 'notices (phone probe)',
        instructions: 'Deliver.', handoffs: [], members: [{ memberName: 'worker', ref: worker, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
      const org = (await delta.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
        { i: { agentOrgDefinitionId: orgDef, rootConfiguration: { ...native, llmConfig: null }, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
      assert(org.success, org.message);
      return noticeOnce('MSP-77', `org:${org.agentOrgRunId}`, org.agentOrgRunId, 'MSP-77-org-member');
    });

    /** Each conversation row as the phone draws it: who speaks, what is visible of the avatar and speaker line, the notice. */
    const phoneRows = () => page.evaluate(() => {
      const shown = el => Boolean(el) && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
      return [...document.querySelectorAll('[data-testid="mobile-run-conversation"] .conv-row')].map(row => {
        const notice = row.querySelector('[data-testid="system-task-notification-segment"]');
        const speaker = row.querySelector('.conv-speaker');
        const avatar = row.querySelector('.conv-avatar');
        return {
          speaker: row.getAttribute('data-speaker'),
          text: row.innerText.replace(/\s+/g, ' ').trim(),
          avatarShown: shown(avatar), avatarImageOrInitials: Boolean(avatar?.querySelector('img, span')),
          speakerShown: shown(speaker), speakerText: speaker?.innerText.trim() ?? null,
          notice: notice ? {
            ariaLabel: notice.getAttribute('aria-label'),
            icon: Boolean(avatar?.querySelector('svg')),
            body: notice.querySelector('[data-testid="system-task-notification-body"]')?.innerText ?? '',
            background: getComputedStyle(notice).backgroundColor,
            bodyLabelShown: shown(notice.querySelector('[data-testid="system-task-notification-label"]')),
          } : null,
        };
      });
    });
    /**
     * The notice row labelled `label` stands alone after the agent's row that holds `beforeText`; the row after it is
     * `afterSpeaker`'s with `afterText`, and an agent row there shows its avatar and name again.
     */
    const noticeRowRight = (rows, label, beforeText, afterSpeaker, afterText) => {
      const at = rows.findIndex(row => row.notice?.ariaLabel === label);
      const [before, notice, after] = [rows[at - 1], rows[at], rows[at + 1]];
      const agentName = rows.find(row => row.speaker === 'agent' && row.speakerShown)?.speakerText ?? null;
      return {
        at, agentName,
        checks: {
          ownRow: at > 0 && notice?.speaker === 'system',
          labelAsSpeakerLine: notice?.speakerShown === true && notice?.speakerText === label && notice?.notice.bodyLabelShown === false,
          iconNoAgentAvatar: notice?.notice.icon === true && notice?.avatarImageOrInitials === false && Boolean(agentName) && !notice?.text.includes(agentName),
          noHeaderLine: !notice?.notice.body.includes('[Platform notice'),
          noColoredPanel: ['rgba(0, 0, 0, 0)', 'transparent'].includes(notice?.notice.background),
          beforeIsAgent: before?.speaker === 'agent',
          beforeHasNoNotice: !before?.text.includes('[Platform notice') && before?.notice === null,
          beforeText: before?.text.includes(beforeText) ?? false,
          afterSpeaker: after?.speaker === afterSpeaker,
          afterShowsItsSpeaker: after?.avatarShown === true && after?.speakerShown === true
            && (afterSpeaker !== 'agent' || after?.speakerText === agentName),
          afterText: after?.text.includes(afterText) ?? false,
        },
      };
    };

    currentCase = 'MSP-99';
    await runCase('MSP-99', async () => {
      try {
        const created = (await delta.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: await definition('Notice Reader'), ...native } })).createAgentRun;
        assert(created.success, created.message);
        const runId = created.runId;
        const first = model.requests.length;
        const short = { name: 'run_bash', args: { command: 'sleep 4; echo MSP99_BUILT', run_in_background: true } };
        model.steps.push({ toolCalls: [short] }, { text: 'MSP99_STARTED' }, { text: 'MSP99_NOTED' });
        await openRun(`agent:${runId}`, runId);
        await send('CASE:MSP-99 Start the short build in the background.');
        await waitFor('MSP99_NOTED on the phone', async () => (await conversation()).includes('MSP99_NOTED'), 120_000);
        await sleep(2_000);
        const wakeLive = noticeRowRight(await phoneRows(), 'Background tasks finished', 'MSP99_STARTED', 'agent', 'MSP99_NOTED');
        await page.screenshot({ path: path.join(outputDir, 'MSP-99-wake-notice-live.png') }).catch(() => undefined);

        model.steps.push({ toolCalls: [build] }, { text: 'MSP99_BUILDING' }, { text: 'MSP99_AFTER_RESTART' });
        await send('CASE:MSP-99 Start the long build.');
        await waitFor('MSP99_BUILDING on the phone', async () => (await conversation()).includes('MSP99_BUILDING'), 120_000);
        await waitFor('the long build running', async () => model.requests.slice(first).some(request => request.toolResults[0]?.includes('"status":"running"') && request.toolResults[0]?.includes('setInterval')), 60_000).catch(() => undefined);
        await sleep(3_000);
        await restartDelta();
        await send('CASE:MSP-99 And now?');
        await waitFor('MSP99_AFTER_RESTART on the phone', async () => (await conversation()).includes('MSP99_AFTER_RESTART'), 120_000);
        await sleep(2_000);
        const restartLive = noticeRowRight(await phoneRows(), 'Application restarted', 'setInterval', 'user', 'And now?');
        await page.screenshot({ path: path.join(outputDir, 'MSP-99-restart-notice-live.png') }).catch(() => undefined);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await openRun(`agent:${runId}`, runId);
        await waitFor('the conversation loaded after the reload', async () => (await conversation()).includes('MSP99_AFTER_RESTART'), 60_000);
        await sleep(2_000);
        const reloadedRows = await phoneRows();
        const wakeReloaded = noticeRowRight(reloadedRows, 'Background tasks finished', 'MSP99_STARTED', 'agent', 'MSP99_NOTED');
        const restartReloaded = noticeRowRight(reloadedRows, 'Application restarted', 'setInterval', 'user', 'And now?');
        await page.locator('[data-testid="system-task-notification-segment"][aria-label="Background tasks finished"]').scrollIntoViewIfNeeded().catch(() => undefined);
        await page.screenshot({ path: path.join(outputDir, 'MSP-99-wake-notice-after-reload.png') }).catch(() => undefined);
        const facts = { runId, wakeLive, restartLive, wakeReloaded, restartReloaded, rowsAfterReload: reloadedRows.map(row => [row.speaker, row.text.slice(0, 120)]) };
        evidence.noticeRows = facts;
        for (const [name, state] of Object.entries({ wakeLive, restartLive, wakeReloaded, restartReloaded })) {
          const failed = Object.entries(state.checks).filter(([, ok]) => !ok).map(([check]) => check);
          assert(failed.length === 0, `MSP-99 ${name}: the notice is its own labelled row and the agent after it shows its name (failed: ${failed.join(', ') || 'none'})`, facts);
        }
        return facts;
      } catch (error) { await failShot('MSP-99'); throw error; }
    });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await delta.stop();
    await model.close();
    for (const line of (await import('node:child_process')).execFileSync('ps', ['-ww', '-A', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n')) {
      const match = line.trim().match(/^(\d+)\s+(.*)$/);
      if (match && match[2].includes(tag)) { try { process.kill(Number(match[1]), 'SIGKILL'); } catch { /* gone */ } }
    }
  }
};
