import { beforeEach, describe, expect, it, vi } from 'vitest';

// autobyteus-647 D-5 (REQ-005, DEC-002): one pdf.js worker serves every PDF. The first call makes it (from pdfjs-dist's
// worker, a Vite inline worker) and hands it to the pdf.js that vue-pdf-embed's essential build carries, as its
// `GlobalWorkerOptions.workerPort`; later calls make nothing.
// Doubled: the worker constructor (a test environment has no Worker) and the essential build's GlobalWorkerOptions.
const made = vi.hoisted(() => ({ workers: [] as unknown[], options: { workerPort: null as unknown } }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline', () => ({
  default: class { constructor() { made.workers.push(this); } },
}));
vi.mock('vue-pdf-embed/dist/index.essential.mjs', () => ({ GlobalWorkerOptions: made.options }));

describe('ensureSharedPdfWorker', () => {
  beforeEach(() => { vi.resetModules(); made.workers.length = 0; made.options.workerPort = null; });

  it('makes one worker for every PDF and gives it to pdf.js as its workerPort', async () => {
    const { ensureSharedPdfWorker } = await import('../sharedPdfWorker');
    ensureSharedPdfWorker();
    ensureSharedPdfWorker();
    ensureSharedPdfWorker();
    expect(made.workers).toHaveLength(1);
    expect(made.options.workerPort).toBe(made.workers[0]);
  });
});
