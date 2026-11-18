// Waiting for a probe's `nuxt dev` server after its backend restarted (autobyteus-426 REQ-011).
// Killing the proxied backend can make the dev server reject with `read ECONNRESET` and restart itself
// (277 UPD-NVP/frontend.log); it comes back on its own, so a probe waits until it answers again before it
// navigates: the page itself (`/`) and the proxied backend (`/rest/health`), both 200.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const answers200 = async (url) => {
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    await response.arrayBuffer().catch(() => undefined);
    return response.status === 200;
  } catch {
    return false;
  }
};

/** Resolves once `<frontendUrl>/` and `<frontendUrl>/rest/health` both answer 200; throws after `timeoutMs`. */
export async function waitForDevServerReady(frontendUrl, { timeoutMs = 60_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const base = frontendUrl.replace(/\/$/, '');
  while (Date.now() < deadline) {
    if (await answers200(`${base}/`) && await answers200(`${base}/rest/health`)) return;
    await sleep(intervalMs);
  }
  throw new Error(`nuxt dev at ${base} did not answer / and /rest/health with 200 within ${timeoutMs} ms`);
}
