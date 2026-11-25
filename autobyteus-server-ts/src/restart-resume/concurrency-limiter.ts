/**
 * A semaphore over async work: at most `limit` run at once; the work holds a slot only while it runs. Shared by the
 * restart resumer's posts and the running-run restorer's restores (autobyteus-638: extracted verbatim from the resumer).
 */
export const createConcurrencyLimiter = (limit: number) => {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async <T>(work: () => Promise<T>): Promise<T> => {
    if (running >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    running += 1;
    try { return await work(); }
    finally { running -= 1; waiting.shift()?.(); }
  };
};
