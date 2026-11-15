// A probe's command channel to a run (`/ws/agent/<id>`, `/ws/agent-team/<id>`, `/ws/agent-org/<id>`), opened as a client must:
// commands wait for the session. CONNECTED announces it; on a Team or Org view (autobyteus-461) the session is ready once the
// view's tree snapshot (RUN_TREE_SNAPSHOT) is sent, so a Team or Org channel also waits for that (F-76: a command sent
// between CONNECTED and the tree snapshot is refused SESSION_NOT_READY; the base sends CONNECTED last).
//
//   const frames = []; socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
//   await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
//   await waitRunSocketReady(frames, route);

export const waitRunSocketReady = async (frames, route, timeoutMs = 60000) => {
  const view = /^agent-(team|org)\//.test(route);
  const ready = () => frames.some((frame) => frame?.type === 'CONNECTED') && (!view || frames.some((frame) => frame?.type === 'RUN_TREE_SNAPSHOT'));
  const deadline = Date.now() + timeoutMs;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${route} session ready (frames: ${frames.map((frame) => frame?.type).join(', ')})`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
