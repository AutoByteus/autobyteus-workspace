// The page's network path to its node, for the Stop generation probes (autobyteus-533): `stop-generation-probe.mjs`
// (desktop) and `mobile-stop-generation-cases.mjs` (phone), and the send delivery probes (autobyteus-540):
// `send-delivery-probe.mjs` (desktop) and `mobile-send-delivery-cases.mjs` (phone). Test code only.
//
// A probe routes the page's run sockets through `createStopWire().link(...)` (Playwright `routeWebSocket` on the page side,
// a `ws` client on the node side). By default every frame passes at once, in order, so a probe that never changes the
// wire behaves as without it. A case may change it, as a real network does:
// - `latencyMs`: every frame, in each direction, arrives that much later (a phone on a remote path); order is kept.
// - `extraToPageMs`: frames toward the page arrive this much later still (a slow downlink), e.g. while another window's
//   Stop ends the turn, so the page still shows Running.
// - `down`: the path is down: the open sockets are closed (a retryable close, as a dropped connection) and new ones are
//   closed at once until it is up again.
// - `loseNextStop`: the page's next `INTERRUPT_GENERATION` is lost on the way and the connection drops.
// - `dropAfterNextStop`: the page's next `INTERRUPT_GENERATION` reaches the node, then the connection drops before the
//   node's answer can come back.
// - `refuseStops`: the page's Stops do not reach the node; the page receives the node's refusal for each, in the node's
//   own failed-answer shape for that stream and with its raw words (`INTERRUPT_EXECUTION_FAILED`, the run id,
//   "AgentRun", "canonical turn"). The run keeps working, as after a real refusal. No scripted runtime refuses an
//   interrupt (AGY always stops), so this stands in for a runtime that could not stop; the page's presentation is what
//   it proves.
// - `loseNextSend` / `dropAfterNextSend`: the same for the page's next `SEND_MESSAGE` (autobyteus-540 SCN-002).
// - `withholdBeforeTeamIdle`: on a Team stream, the numbered frame (one with a `change_sequence`) right before the next
//   `AGENT_STATUS` idle toward the page is withheld, never delivered: the idle status arrives past a gap, as after a lost
//   event, when the Team has finished its work (autobyteus-541 AC-001). While armed, each numbered Team frame waits for the
//   next one (their order kept); the option disarms itself once it withheld one.
// - `withholdNextTeamEvent`: the next numbered frame toward the page on a Team stream is withheld, never delivered; the
//   following one arrives past a gap, and the page keeps the statuses it had (autobyteus-541 AC-002).
// Each link keeps the order of each direction's frames: one queue per direction, each frame due at its arrival plus the
// delay or after the frame before it, whichever is later, drained in order by one timer (autobyteus-541 D-A8).
// Every Stop- and send-related frame is logged with its time (`log`), so a case counts the Stops and messages the page
// sent and reads the node's answers; an `AGENT_STREAM_SNAPSHOT`'s `input_state` (the run's queued input) is logged too.

const KEEP = /INTERRUPT_GENERATION|SEND_MESSAGE|AGENT_COMMAND_ACK|STATUS|^CONNECTED$|SNAPSHOT|^TURN_|^ERROR$/;

/** The parts of a frame a case reads: type, command, answer and status. */
const summarize = (frame) => {
  const p = frame?.payload ?? {};
  return {
    type: frame?.type ?? null,
    commandType: p.command_type ?? null,
    commandId: p.command_id ?? null,
    state: p.state ?? null,
    code: p.code ?? null,
    message: typeof p.message === 'string' ? p.message.slice(0, 200) : null,
    status: p.status ?? p.new_status ?? p.payload?.status ?? null,
    agentRunId: p.agent_run_id ?? p.target_agent_run_id ?? p.target?.agent_run_id ?? p.target?.run_id ?? p.run_id ?? null,
    messageId: p.message_id ?? null,
    // An agent stream snapshot's `input_state`: 'absent' (no field), null, or its queued entries' message ids.
    inputState: frame?.type !== 'AGENT_STREAM_SNAPSHOT' ? undefined
      : !('input_state' in p) ? 'absent' : p.input_state === null ? null
        : { revision: p.input_state.revision, entries: (p.input_state.entries ?? []).map((e) => `${e.state}:${e.message_id}`) },
    // A frame's place in its stream (an agent stream's `sequence`, a Team view's change sequence).
    seq: frame?.sequence ?? p.sequence ?? p.change_sequence ?? p.changeSequence ?? p.base_change_sequence ?? null,
  };
};

/**
 * The node's failed answer to a Stop on the stream at `path`, in that stream's shape: the Org stream's `commandAck`
 * (`/ws/agent-org/<org>`), the Team stream's answer with the member's run id (`/ws/agent-team/<team>`), else
 * `buildInterruptGenerationCommandAck` with the run target (`/ws/agent/<run>`, `/ws/peer-run/<node>/<kind>/<root>/<agent run>`).
 */
const refusalFor = (path, payload) => {
  const id = decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? '');
  const runId = payload.target_agent_run_id ?? payload.agent_run_id ?? id;
  const failure = { state: 'failed', code: 'INTERRUPT_EXECUTION_FAILED', message: `AgentRun '${runId}' could not interrupt its canonical turn.` };
  if (payload.root_subject_kind === 'agent_org') {
    return { type: 'AGENT_COMMAND_ACK', payload: { root_subject_kind: 'agent_org', root_run_id: payload.root_run_id, command_id: payload.command_id,
      command_type: 'INTERRUPT_GENERATION', target_agent_run_id: payload.target_agent_run_id, ...failure } };
  }
  if (path.startsWith('/ws/agent-team/')) {
    // The Team stream's own answer (`@autobyteus/team-stream-contracts`, team-agent-message-dtos): the member's run id.
    return { type: 'AGENT_COMMAND_ACK', payload: { command_type: 'INTERRUPT_GENERATION', command_id: payload.command_id, ...failure, agent_run_id: payload.agent_run_id } };
  }
  return { type: 'AGENT_COMMAND_ACK', payload: { command_type: 'INTERRUPT_GENERATION', command_id: payload.command_id, ...failure,
    target: { target_kind: 'standalone_run', run_id: id } } };
};

export const createStopWire = () => {
  const wire = {
    latencyMs: 0,
    extraToPageMs: 0,
    down: false,
    loseNextStop: false,
    dropAfterNextStop: false,
    refuseStops: false,
    loseNextSend: false,
    dropAfterNextSend: false,
    withholdBeforeTeamIdle: false,
    withholdNextTeamEvent: false,
    /**
     * `{ at, link, dir, url, ...summary, note? }`: `up` page → node (when the page sent it), `down` node → page (when the page
     * received it), `node` a command answer as the node sent it (when it reached the wire, before any delay: the node's
     * answer even if the page never receives it).
     */
    log: [],
    /** Times a frame toward the page carried the scripted AGY's held step (`sleep 600 # HOLD_TURN`): a turn is running. */
    holds: [],
    links: new Set(),
    nextLinkId: 1,
  };

  const record = (link, dir, frame, note) => {
    const summary = summarize(frame);
    if (!summary.type || !KEEP.test(summary.type)) return;
    wire.log.push({ at: Date.now(), link: link.id, dir, url: link.path, ...summary, ...(note ? { note } : {}) });
  };

  /**
   * One routed socket. `sendToPage`, `sendToNode`, `closePage(code, reason)` and `closeNode()` are the probe's; the
   * returned `fromPage(text)` and `fromNode(text)` take each frame. Returns null when the path is down (the probe then
   * closes the page side at once and opens nothing upstream).
   */
  wire.link = ({ url, sendToPage, sendToNode, closePage, closeNode }) => {
    const path = new URL(url).pathname;
    const link = { id: wire.nextLinkId++, path, closed: false };
    if (wire.down) {
      wire.log.push({ at: Date.now(), link: link.id, dir: 'down', url: path, type: 'REFUSED (path down)' });
      return null;
    }
    // One FIFO queue per direction: a frame is never delivered before one that arrived earlier (no per-frame timers,
    // whose durations from two clock reads could invert two frames a millisecond apart: investigation A).
    const queues = { up: { frames: [], lastDue: 0, timer: null }, down: { frames: [], lastDue: 0, timer: null } };
    const drain = (queue) => {
      queue.timer = null;
      const now = Date.now();
      while (queue.frames.length && queue.frames[0].due <= now) queue.frames.shift().deliver();
      if (queue.frames.length) queue.timer = setTimeout(() => drain(queue), queue.frames[0].due - now);
    };
    const schedule = (dir, deliver, extraMs) => {
      const queue = queues[dir];
      const arrival = Date.now();
      const delay = wire.latencyMs + extraMs;
      if (delay <= 0 && !queue.frames.length) { deliver(); return; }
      const due = Math.max(arrival + delay, queue.lastDue);
      queue.lastDue = due;
      queue.frames.push({ due, deliver });
      if (!queue.timer) queue.timer = setTimeout(() => drain(queue), Math.max(0, due - arrival));
    };
    link.drop = (reason) => {
      if (link.closed) return;
      link.closed = true;
      wire.links.delete(link);
      wire.log.push({ at: Date.now(), link: link.id, dir: 'down', url: path, type: 'DROPPED', note: reason });
      try { closePage(1011, reason); } catch { /* closed */ }
      try { closeNode(); } catch { /* closed */ }
    };
    /** The socket ended by one side (`'page'` or `'node'`), not by the wire. */
    link.closedByEnd = (by) => {
      if (link.closed) return;
      link.closed = true;
      wire.links.delete(link);
      wire.log.push({ at: Date.now(), link: link.id, dir: 'down', url: path, type: `CLOSED by the ${by ?? 'other side'}` });
    };
    link.fromPage = (text) => {
      if (link.closed) return;
      let frame = null;
      try { frame = JSON.parse(String(text)); } catch { /* not JSON */ }
      if (frame?.type === 'INTERRUPT_GENERATION' && wire.refuseStops) {
        record(link, 'up', frame, 'refused by the wire: never reached the node');
        const refusal = refusalFor(path, frame.payload ?? {});
        schedule('down', () => {
          if (link.closed) return;
          record(link, 'down', refusal);
          try { sendToPage(JSON.stringify(refusal)); } catch { /* closed */ }
        }, wire.extraToPageMs);
        return;
      }
      const kind = frame?.type === 'INTERRUPT_GENERATION' ? 'Stop' : frame?.type === 'SEND_MESSAGE' ? 'message' : null;
      const loseKey = kind === 'Stop' ? 'loseNextStop' : kind === 'message' ? 'loseNextSend' : null;
      if (loseKey && wire[loseKey]) {
        wire[loseKey] = false;
        record(link, 'up', frame, 'lost on the way');
        setTimeout(() => wire.blip(`the path dropped with the ${kind} on it`), 30);
        return;
      }
      record(link, 'up', frame);
      const dropKey = kind === 'Stop' ? 'dropAfterNextStop' : kind === 'message' ? 'dropAfterNextSend' : null;
      const dropAfter = Boolean(dropKey && wire[dropKey]);
      if (dropAfter) wire[dropKey] = false;
      schedule('up', () => {
        if (link.closed) return;
        sendToNode(text);
        if (dropAfter) wire.blip(`the path dropped after the ${kind} reached the node`);
      }, 0);
    };
    link.fromNode = (text) => {
      if (link.closed) return;
      if (String(text).includes('sleep 600 # HOLD_TURN')) wire.holds.push({ at: Date.now(), link: link.id, url: path });
      let frame = null;
      try { frame = JSON.parse(String(text)); } catch { /* not JSON */ }
      if (frame?.type === 'AGENT_COMMAND_ACK') record(link, 'node', frame);
      const toPage = (sendText, sendFrame) => schedule('down', () => {
        if (link.closed) return;
        record(link, 'down', sendFrame);
        try { sendToPage(sendText); } catch { /* closed */ }
      }, wire.extraToPageMs);
      if (wire.withholdNextTeamEvent && path.startsWith('/ws/agent-team/') && Number.isInteger(frame?.payload?.change_sequence)) {
        wire.withholdNextTeamEvent = false;
        wire.log.push({ at: Date.now(), link: link.id, dir: 'down', url: path, ...summarize(frame), note: 'withheld by the wire' });
        return;
      }
      if ((wire.withholdBeforeTeamIdle || link.heldTeamEvent) && path.startsWith('/ws/agent-team/') && Number.isInteger(frame?.payload?.change_sequence)) {
        const held = link.heldTeamEvent;
        link.heldTeamEvent = null;
        if (held && wire.withholdBeforeTeamIdle && frame.type === 'AGENT_STATUS' && frame.payload.status === 'idle') {
          wire.withholdBeforeTeamIdle = false;
          wire.log.push({ at: Date.now(), link: link.id, dir: 'down', url: path, ...summarize(held.frame), note: 'withheld by the wire' });
          toPage(text, frame);
          return;
        }
        if (held) toPage(held.text, held.frame);
        if (wire.withholdBeforeTeamIdle) link.heldTeamEvent = { text, frame };
        else toPage(text, frame);
        return;
      }
      toPage(text, frame);
    };
    wire.links.add(link);
    return link;
  };

  /** A blip: every open socket drops at once (the whole path, as a network drop); new ones connect again. */
  wire.blip = (reason) => { for (const link of [...wire.links]) link.drop(reason); };
  /** Path down: every open socket drops; new ones are refused until `up()`. */
  wire.cut = (reason = 'the path is down') => {
    wire.down = true;
    for (const link of [...wire.links]) link.drop(reason);
  };
  wire.up = () => { wire.down = false; };
  /** Back to a plain path (between cases). */
  wire.reset = () => {
    Object.assign(wire, { latencyMs: 0, extraToPageMs: 0, down: false, loseNextStop: false, dropAfterNextStop: false, refuseStops: false,
      loseNextSend: false, dropAfterNextSend: false, withholdBeforeTeamIdle: false, withholdNextTeamEvent: false });
  };
  /** The log since `from` (an index into `log`). */
  wire.since = (from) => wire.log.slice(from);
  return wire;
};

/**
 * Starts (once per page) an in-page recorder of the composer's primary button and the toasts, sampled every 10 ms:
 * `window.__stopTrace = { button: [[time, label, busy, enabled]], toasts: [[time, text]] }`. `scope` is a CSS selector
 * that holds the open run's composer (its last visible textarea).
 */
export const startStopTrace = (page, scope) => page.evaluate((scopeSelector) => {
  if (window.__stopTrace) { window.__stopTrace.scope = scopeSelector; return; }
  const trace = { scope: scopeSelector, button: [], toasts: [] };
  window.__stopTrace = trace;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const primary = () => {
    const areas = [...document.querySelectorAll(`${trace.scope} textarea`)].filter(visible);
    const area = areas[areas.length - 1];
    let node = area?.parentElement ?? null;
    for (let depth = 0; node && depth < 3; depth += 1, node = node.parentElement) {
      const button = node.querySelector('button[aria-label="Send message"], button[aria-label="Stop generation"], button[aria-label="Stopping…"], button.rounded-full[aria-label]');
      if (button) return button;
    }
    return null;
  };
  let lastButton = '';
  let lastToasts = '';
  setInterval(() => {
    const button = primary();
    const state = button ? [button.getAttribute('aria-label'), button.getAttribute('aria-busy') === 'true', !button.disabled] : ['none', false, false];
    const key = JSON.stringify(state);
    if (key !== lastButton) { lastButton = key; trace.button.push([Date.now(), ...state]); }
    const toasts = document.querySelector('[data-testid="toast-container"]')?.innerText?.trim() ?? '';
    if (toasts !== lastToasts) { lastToasts = toasts; if (toasts) trace.toasts.push([Date.now(), toasts]); }
  }, 10);
}, scope);

/** The recorder's entries from `since` (ms since epoch). */
export const readStopTrace = (page, since = 0) => page.evaluate((from) => ({
  button: (window.__stopTrace?.button ?? []).filter(([at]) => at >= from),
  toasts: (window.__stopTrace?.toasts ?? []).filter(([at]) => at >= from),
  // The state when `from` began, for a reader that needs the button before the first change.
  before: [...(window.__stopTrace?.button ?? [])].reverse().find(([at]) => at < from) ?? null,
}), since);

/** The primary button's current state, as the recorder reads it. */
export const primaryButtonState = async (page) => {
  const trace = await page.evaluate(() => window.__stopTrace?.button?.at(-1) ?? null);
  return trace ? { label: trace[1], busy: trace[2], enabled: trace[3] } : null;
};

/** Words a user-visible Stop text must not contain (REQ-006, QR-001): a run id, internal words, codes, stream states. */
export const internalWords = (text, runIds = []) => {
  const found = [];
  for (const word of [/AgentRun/, /canonical/i, /\bturn\b/i, /INTERRUPT_/, /NO_ACTIVE_TURN/, /RUN_NOT/, /stream is/i, /CONNECTING|DISCONNECTED|RECONNECTING/]) {
    if (word.test(text)) found.push(String(word));
  }
  for (const id of runIds) if (id && text.includes(id)) found.push(`run id ${id}`);
  return found;
};
