// Fixture boundaries for probe pages whose Workspaces tree lists Task workers (task Agent / task Team rows).
// Since delegated-copy-task-locator those rows ask the server for each worker's current Task
// (`GetTaskWorkerTasks`) and keep the answers live from the `/ws/projects` change feed. Fixture pages run
// without a backend, so a probe that renders such rows supplies both boundaries here:
//   - the read answers "no Task" for every requested worker (rows stay one line, as the probes' baselines expect);
//   - the feed is an open socket that sends its `connected` frame and nothing else.
// Register it after the probe's own `**/graphql` route on the same page or context: other operations fall back.

/** @param {import('playwright-core').Page | import('playwright-core').BrowserContext} target */
export const routeTaskWorkerBoundaries = async (target) => {
  await target.routeWebSocket(/\/ws\/projects(\?|$)/, (ws) => { ws.send(JSON.stringify({ type: 'connected' })); });
  await target.route('**/graphql', async (route) => {
    let payload = {};
    try { payload = route.request().postDataJSON() ?? {}; } catch { payload = {}; }
    if (payload.operationName !== 'GetTaskWorkerTasks') return route.fallback();
    const { agentRunIds = [], teamRunIds = [] } = payload.variables ?? {};
    const answer = (workerKind) => (workerRunId) => ({ __typename: 'TaskWorkerTask', workerKind, workerRunId, task: null });
    const taskWorkerTasks = [...agentRunIds.map(answer('agent')), ...teamRunIds.map(answer('team'))];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { taskWorkerTasks } }) });
  });
};
