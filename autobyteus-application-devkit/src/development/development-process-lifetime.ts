export class ProcessShutdownTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} did not close within ${timeoutMs}ms.`);
    this.name = 'ProcessShutdownTimeoutError';
  }
}

export const closeWithinTimeout = async (
  close: () => Promise<void>,
  label: string,
  timeoutMs = 15_000,
): Promise<void> => {
  let timeout: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      close(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new ProcessShutdownTimeoutError(label, timeoutMs)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export const waitForDevelopmentShutdown = (
  close: () => Promise<void>,
): Promise<void> => new Promise((resolve, reject) => {
  let closing = false;
  const shutdown = (): void => {
    if (closing) return;
    closing = true;
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    void closeWithinTimeout(close, 'Application process').then(resolve, (error) => {
      if (error instanceof ProcessShutdownTimeoutError) {
        console.error(error.message);
        process.exit(1);
      }
      reject(error);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
});
