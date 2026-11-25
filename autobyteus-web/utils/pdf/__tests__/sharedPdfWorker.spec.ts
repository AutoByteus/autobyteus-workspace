import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// autobyteus-647 D-5 as revised in SR-002 (REQ-005, DEC-002): one pdf.js worker and one wrapper on it serve every PDF.
// The first call makes the worker (pdfjs-dist's worker script, a Vite inline worker) and wraps it in the PDFWorker of the
// pdf.js that vue-pdf-embed's essential build carries (`globalThis.pdfjsLib`); later calls return the same wrapper.
// Doubled: the worker constructor (a test environment has no Worker), the essential build (only its side effect,
// `globalThis.pdfjsLib`, matters here) and its PDFWorker.
const made = vi.hoisted(() => ({ workers: [] as unknown[], wrappers: [] as { port: unknown }[] }));
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline', () => ({
  default: class { constructor() { made.workers.push(this); } },
}));
vi.mock('vue-pdf-embed/dist/index.essential.mjs', () => ({}));

class BundledPdfWorker {
  port: unknown;
  constructor({ port }: { port: unknown }) { this.port = port; made.wrappers.push(this); }
}

describe('getSharedPdfWorker', () => {
  beforeEach(() => { vi.resetModules(); made.workers.length = 0; made.wrappers.length = 0; });
  afterEach(() => { delete (globalThis as { pdfjsLib?: unknown }).pdfjsLib; });

  it('makes one worker and one wrapper on it, and returns that wrapper for every PDF', async () => {
    (globalThis as { pdfjsLib?: unknown }).pdfjsLib = { PDFWorker: BundledPdfWorker };
    const { getSharedPdfWorker } = await import('../sharedPdfWorker');
    const first = getSharedPdfWorker();
    expect(getSharedPdfWorker()).toBe(first);
    expect(getSharedPdfWorker()).toBe(first);
    expect(made.workers).toHaveLength(1);
    expect(made.wrappers).toHaveLength(1);
    expect(first).toBeInstanceOf(BundledPdfWorker);
    expect((first as unknown as BundledPdfWorker).port).toBe(made.workers[0]);
  });

  it('fails with a named error, making no worker, when the bundled pdf.js offers no PDFWorker', async () => {
    (globalThis as { pdfjsLib?: unknown }).pdfjsLib = {};
    const { getSharedPdfWorker, PdfJsWorkerUnavailableError } = await import('../sharedPdfWorker');
    expect(() => getSharedPdfWorker()).toThrow(PdfJsWorkerUnavailableError);
    expect(made.workers).toHaveLength(0);
  });
});
