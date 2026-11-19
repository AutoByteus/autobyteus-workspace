// A message sent from the phone is never lost silently (autobyteus-540 REQ-001…REQ-005, AC-002…AC-004, QR-001). Cases of
// `pnpm -C autobyteus-web test:e2e:mobile-shell`, run by `mobile-shell-probe.mjs` on its paired phone page
// (`--cases=MSP-85,MSP-86,MSP-87,MSP-88` runs only these). Every run here is the cases' own, on the scripted Antigravity
// runtime (`HOLD_TURN` keeps a turn running; a Stop takes the AGY run offline, the next message restores it). The phone's
// sockets pass through the probe's wire (`fixtures/stop-generation-wire.mjs`), which logs each message with the node's
// answers and can drop the phone's whole path or lose the phone's next message on the way.
//
//   MSP-85 AC-002  A standalone run: 10 rounds of a message right after a Stop took the run offline, and 5 rounds of a
//                  message sent at once after the phone's path dropped and came back: each starts its turn, leaves only on a
//                  bound stream (after its link's `CONNECTED`), no `SESSION_NOT_READY`, no notice.
//   MSP-86 AC-004 (a)  The same run, live: a message lost on the way: text (a) above the phone's message box, the
//                  message gone, its text back in the box; no run id or internal word.
//   MSP-87 AC-004  An Org member: a message lost on the way: text (b), the text back, the status never Error; then the
//                  phone's path down: if the screen still offers Send, text (a) at once; else nothing to send.
//   MSP-88 AC-004, R-4  A run on beta (a peer run): the phone's path down when the user sends: after the 10 s wait, text (a)
//                  with the text kept in the box; then a message lost on the way: text (b) (a peer run cannot say its
//                  queued input), the text kept.
import { randomUUID } from 'node:crypto';

const STOP = 'Stop generation';
const SEND = 'Send message';
const TEXT_A = 'Your message was not sent: not connected to the node. It is back in the message box; send it again.';
const TEXT_B = 'The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again.';
const internalWords = (text, runIds) => [/SESSION_NOT_READY/, /\bstream\b/i, /\bsession\b/i, /\bsocket\b/i, /AgentRun/]
  .filter((word) => word.test(text)).map(String).concat(runIds.filter((id) => id && text.includes(id)).map((id) => `run id ${id}`));

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `ensureUnfolded`,
 *   `rowsOf`, `runScreen`, `shot`, `waitFor`, `sleep`, `assert`, `selected`, `phoneWire`, `peer` (beta's name on alpha).
 */
export const runSendDeliveryCases = async (probe) => {
  const { runCase, page, stack, alpha, sel, toList, openRow, ensureUnfolded, rowsOf, runScreen, shot, waitFor, sleep, assert, phoneWire: wire } = probe;
  const ids = ['MSP-85', 'MSP-86', 'MSP-87', 'MSP-88'];
  if (probe.selected && !ids.some((id) => probe.selected.has(id))) return;
  const gql = (query, variables) => alpha.gql(query, variables);
  const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1] ?? null;
  const SCOPE = sel('mobile-run-conversation');
  const textarea = () => page.locator(`${SCOPE} textarea`).last();
  const button = () => page.locator(`${SCOPE} button[aria-label="${SEND}"], ${SCOPE} button[aria-label="${STOP}"], ${SCOPE} button[aria-label="Stopping…"]`).last();
  const label = () => button().getAttribute('aria-label').catch(() => null);
  const enabled = () => button().isEnabled().catch(() => false);

  const createAgentRun = async (agentDefinitionId) => {
    const r = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...stack.runConfig } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const terminate = {
    agent: (id) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id }).catch(() => undefined),
    org: (id) => gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id }).catch(() => undefined),
  };

  const rowsUnder = (rows, parentKey) => {
    const start = rows.findIndex((row) => row.key === parentKey);
    if (start < 0) return [];
    const under = [];
    for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index += 1) under.push(rows[index]);
    return under;
  };
  const openOnPhone = async (rootKey, steps = []) => {
    await toList(page);
    await waitFor(`${rootKey} on the phone`, async () => {
      if (await page.locator(sel(`mobile-run-row-${rootKey}`)).count()) return true;
      const fold = page.locator(sel('mobile-run-list-show-older'));
      if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
      return false;
    }, 60_000);
    let key = rootKey;
    for (const step of steps) {
      await ensureUnfolded(page, key);
      let next = null;
      await waitFor(`${step} under ${key}`, async () => Boolean(next = rowsUnder(await rowsOf(page), key).find((row) => step.test(row.name))?.key), 60_000).catch(() => undefined);
      assert(next, `the row ${step} under ${key}`, rowsUnder(await rowsOf(page), rootKey).map((row) => ({ key: row.key, name: row.name })));
      key = next;
    }
    await openRow(page, key);
    await page.locator(SCOPE).waitFor({ timeout: 30_000 });
    await waitFor('the composer', async () => (await textarea().count()) > 0, 30_000);
    await sleep(1_000);
  };
  /** The phone's run screen: its status line, the notice, the box's text, how often `marker` shows in the conversation. */
  const view = async (marker) => {
    const screen = await runScreen(page);
    const state = await page.evaluate(({ scope, marker }) => {
      const root = document.querySelector(scope);
      const notice = document.querySelector('[data-test="message-not-delivered"]');
      let count = 0;
      if (root && marker) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.parentElement?.closest('textarea')) continue;
          if (node.textContent.includes(marker)) count += 1;
        }
      }
      return { notice: notice ? { certainty: notice.querySelector('[data-certainty]')?.getAttribute('data-certainty') ?? null,
        text: notice.querySelector('[data-test="message-not-delivered-text"]')?.textContent?.trim() ?? null } : null,
      draft: [...(root?.querySelectorAll('textarea') ?? [])].at(-1)?.value ?? null, count };
    }, { scope: SCOPE, marker });
    return { status: screen.subtitle, ...state };
  };
  const typeAndSend = async (text) => {
    await waitFor('Send enabled', async () => { await textarea().fill(text); await sleep(150); return (await label()) === SEND && await enabled(); }, 60_000);
    await button().click();
  };
  const held = (since) => waitFor('the held turn', async () => wire.holds.some((h) => h.at >= since) && (await label()) === STOP && await enabled(), 60_000);
  const stopRun = async () => {
    for (let i = 0; i < 3 && (await label()) === STOP; i += 1) { await button().click().catch(() => undefined); await sleep(1_500); }
    await waitFor('Stop gone', async () => ![STOP, 'Stopping…'].includes(await label()), 30_000).catch(() => undefined);
    await sleep(800);
  };
  const waitNotice = (ms = 20_000) => waitFor('the notice', async () => Boolean((await view()).notice), ms);
  const dismiss = async () => { const b = page.locator('[data-test="message-not-delivered-dismiss"]'); if (await b.count()) await b.click(); };
  const notReady = (from) => wire.since(from).filter((f) => f.type === 'ERROR' && f.code === 'SESSION_NOT_READY').length;
  /** Each message the phone sent since `from` on `path`: did it leave after its link's `CONNECTED`? */
  const sentBound = (from, path) => wire.since(from).filter((f) => f.dir === 'up' && f.type === 'SEND_MESSAGE' && f.url.startsWith(path)).map((s) => ({
    link: s.link, bound: wire.log.some((f) => f.link === s.link && f.dir === 'down' && f.type === 'CONNECTED' && f.at <= s.at) }));
  const frames = (from, since) => wire.since(from).map((f) => `${f.at - since} L${f.link} ${f.dir} ${f.url.split('/').slice(0, 3).join('/')} ${f.type}${f.state ? ` ${f.state}` : ''}${f.code ? ` ${f.code}` : ''}${f.status ? ` ${f.status}` : ''}${f.inputState !== undefined ? ` input_state=${JSON.stringify(f.inputState)}` : ''}${f.note ? ` (${f.note})` : ''}`);
  const caseBody = (fn) => async () => { try { return await fn(); } finally { if (wire.down) wire.up(); wire.reset(); } };

  const tag = randomUUID().slice(0, 4);
  let standalone = null;

  await runCase('MSP-85', caseBody(async () => {
    standalone = await createAgentRun(stack.ids.checker);
    const path = `/ws/agent/${standalone}`;
    await openOnPhone(`agent:${standalone}`);
    // The first message (re)starts the runtime.
    let since = Date.now();
    await typeAndSend(`HOLD_TURN MSP-85-start-${tag}`);
    await held(since);
    await stopRun();
    const afterStop = [];
    for (let round = 1; round <= 10; round += 1) {
      const from = wire.log.length; since = Date.now();
      await typeAndSend(`HOLD_TURN MSP-85-after-stop-${round}`);
      let started = true;
      await held(since).catch(() => { started = false; });
      const v = await view();
      afterStop.push({ round, started, notReady: notReady(from), sends: sentBound(from, path), notice: v.notice, frames: started ? undefined : frames(from, since) });
      if (!started) break;
      await stopRun();
    }
    const afterReconnect = [];
    for (let round = 1; round <= 5; round += 1) {
      const from = wire.log.length; since = Date.now();
      wire.blip('a forced reconnect');
      await textarea().fill(`HOLD_TURN MSP-85-after-reconnect-${round}`);
      await waitFor('Send enabled', async () => (await label()) === SEND && await enabled(), 30_000);
      await button().click();
      let started = true;
      await held(since).catch(() => { started = false; });
      const v = await view();
      afterReconnect.push({ round, started, notReady: notReady(from), sends: sentBound(from, path), notice: v.notice, frames: started ? undefined : frames(from, since) });
      if (!started) break;
      await stopRun();
    }
    await shot(page, 'MSP-85-after-rounds');
    const bad = [...afterStop, ...afterReconnect].filter((r) => !r.started || r.notReady || r.notice || !r.sends.length || r.sends.some((s) => !s.bound));
    const details = { afterStop, afterReconnect };
    assert(afterStop.length === 10 && afterReconnect.length === 5 && !bad.length, 'every message after a Stop and after a reconnect left on a bound stream and started its turn; no SESSION_NOT_READY, no notice', { bad, ...details });
    return { rounds: afterStop.length + afterReconnect.length, ...details };
  }));

  await runCase('MSP-86', caseBody(async () => {
    if (!standalone) throw new Error('MSP-85 did not create its run');
    await openOnPhone(`agent:${standalone}`);
    // Live again: a message answered at once.
    await typeAndSend(`PLAIN MSP-86-wake-${tag}`);
    await waitFor('the run idle', async () => /^Idle/.test((await view()).status ?? ''), 30_000).catch(() => undefined);
    await sleep(1_500);
    const marker = `MSP-86-lost-${tag}`;
    const before = await view();
    const from = wire.log.length; const since = Date.now();
    wire.loseNextSend = true;
    await typeAndSend(`PLAIN ${marker}`);
    await waitNotice();
    await sleep(1_500);
    const v = await view(marker);
    await shot(page, 'MSP-86-phone-text-a');
    const details = { before: before.status, view: v, frames: frames(from, since) };
    assert(v.notice?.certainty === 'not_sent' && v.notice.text === TEXT_A, 'text (a) on the phone', details);
    assert(v.count === 0 && v.draft === `PLAIN ${marker}` && v.status === before.status, 'the message gone; its text back; the status unchanged', details);
    assert(!internalWords(v.notice.text, [standalone]).length, 'no run id or internal word', details);
    await dismiss();
    await terminate.agent(standalone);
    return details;
  }));

  await runCase('MSP-87', caseBody(async () => {
    const r = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: stack.ids.org, rootConfiguration: stack.runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(r.success, r.message);
    const orgRunId = r.agentOrgRunId;
    await openOnPhone(`org:${orgRunId}`);
    let since = Date.now();
    await typeAndSend(`PLAIN MSP-87-start-${tag}`);
    await waitFor('the member idle', async () => /^Idle/.test((await view()).status ?? ''), 60_000).catch(() => undefined);
    await sleep(1_500);
    // (b): lost on the way.
    const marker = `MSP-87-lost-${tag}`;
    const before = await view();
    let from = wire.log.length; since = Date.now();
    wire.loseNextSend = true;
    await typeAndSend(`PLAIN ${marker}`);
    await waitNotice();
    await sleep(3_000);
    const lost = await view(marker);
    await shot(page, 'MSP-87-org-text-b');
    const lostFrames = frames(from, since);
    await dismiss();
    await textarea().fill('');
    // (a): the phone's path down.
    from = wire.log.length; since = Date.now();
    wire.cut('the phone\'s path is down');
    await sleep(500);
    const offered = { label: await label(), enabled: await enabled() };
    let down = null;
    if (offered.label === SEND && offered.enabled !== false) {
      await textarea().fill(`PLAIN MSP-87-down-${tag}`);
      await sleep(200);
      offered.enabledWithText = await enabled();
      if (offered.enabledWithText) {
        await button().click();
        await waitNotice(20_000).catch(() => undefined);
        down = await view(`MSP-87-down-${tag}`);
        await shot(page, 'MSP-87-org-path-down');
      }
    }
    wire.up();
    await sleep(3_000);
    await terminate.org(orgRunId);
    const details = { before: before.status, lost, lostFrames, offered, down };
    assert(lost.notice?.certainty === 'unknown' && lost.notice.text === TEXT_B && lost.draft === `PLAIN ${marker}`, 'an Org member\'s lost message: text (b), the text back', details);
    assert(!/Error/i.test(lost.status ?? ''), 'the member\'s status is not Error', details);
    if (down) assert(down.notice?.certainty === 'not_sent' && down.notice.text === TEXT_A && down.draft === `PLAIN MSP-87-down-${tag}`, 'path down: text (a), the text back', details);
    return details;
  }));

  await runCase('MSP-88', caseBody(async () => {
    const delegator = await createAgentRun(stack.ids.ptm);
    const remote = pickId(await stack.agentCall(delegator, 'delegate_task', { node: probe.peer, recipient_address: '/publisher', description: `Send probe remote run. Marker 540-REMOTE-${tag}.` }), 'target_agent_run_id');
    assert(remote, 'the delegator delegated a run on beta');
    await openOnPhone(`agent:${delegator}`, [/publisher/i]);
    let since = Date.now();
    await typeAndSend(`PLAIN MSP-88-start-${tag}`);
    await sleep(4_000);
    // (a): not bound.
    const marker = `MSP-88-down-${tag}`;
    let from = wire.log.length; since = Date.now();
    wire.cut('the phone\'s path is down');
    await sleep(500);
    const offered = { label: await label(), enabled: await enabled() };
    await typeAndSend(`PLAIN ${marker}`).catch((error) => { offered.sendFailed = error.message; });
    const sentAt = Date.now();
    await waitNotice(30_000).catch(() => undefined);
    const noticeAfterMs = Date.now() - sentAt;
    const down = await view(marker);
    await shot(page, 'MSP-88-peer-not-bound');
    const upAt = Date.now();
    wire.up();
    await waitFor('the peer stream back', async () => wire.log.some((f) => f.at >= upAt && f.dir === 'down' && f.url.startsWith('/ws/peer-run/') && f.type === 'AGENT_STREAM_SNAPSHOT'), 90_000).catch(() => undefined);
    await sleep(2_000);
    await dismiss();
    await textarea().fill('');
    // (b): lost on the way.
    const lostMarker = `MSP-88-lost-${tag}`;
    from = wire.log.length; since = Date.now();
    wire.loseNextSend = true;
    await typeAndSend(`PLAIN ${lostMarker}`);
    await waitNotice(30_000).catch(() => undefined);
    await sleep(2_000);
    const lost = await view(lostMarker);
    await shot(page, 'MSP-88-peer-lost');
    const lostFrames = frames(from, since);
    await dismiss();
    await terminate.agent(delegator);
    const details = { remote, offered, down, noticeAfterMs, lost, lostFrames };
    assert(down.notice?.certainty === 'not_sent' && down.notice.text === TEXT_A && down.draft === `PLAIN ${marker}` && noticeAfterMs >= 9_000, 'a peer run not bound: after the 10 s wait, text (a), the text kept', details);
    assert(lost.draft === `PLAIN ${lostMarker}` && ((lost.notice?.certainty === 'unknown' && lost.notice.text === TEXT_B) || (!lost.notice && lost.count >= 1)),
      'a peer run\'s lost message: text (b) with the text kept (or it shows)', details);
    assert(![down, lost].some((v) => v.notice && internalWords(v.notice.text, [delegator, remote]).length), 'no run id or internal word', details);
    return details;
  }));
};
