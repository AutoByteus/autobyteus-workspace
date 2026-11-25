// The essential build carries its own pdf.js (4.10.38) and puts its classes on `globalThis.pdfjsLib` when imported.
import 'vue-pdf-embed/dist/index.essential.mjs';
import type { PDFWorker } from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

/** The essential build's pdf.js no longer offers `PDFWorker` on `globalThis.pdfjsLib` (a library upgrade changed it). */
export class PdfJsWorkerUnavailableError extends Error {
  constructor() {
    super("vue-pdf-embed's pdf.js offers no PDFWorker on globalThis.pdfjsLib");
    this.name = 'PdfJsWorkerUnavailableError';
  }
}

/** pdf.js's `new PDFWorker({ port })` (its `PDFWorkerParameters`; the generated constructor type wrongly says `port?: null`). */
type BundledPdfWorkerClass = new (params: { port: Worker }) => PDFWorker;

let sharedWorker: PDFWorker | null = null;

/**
 * The one pdf.js worker every PDF uses (autobyteus-647 D-5 as revised in SR-002, DEC-002), for the app's lifetime: an
 * inline module worker made from `pdfjs-dist`'s worker script of the same version (a Vite inline worker, its blob made
 * once, so it works in the packaged `file://` window), and one pdf.js `PDFWorker` wrapper on it. Each document gets the
 * wrapper as `getDocument({ url, worker })`; a loading task given a worker does not own it, so no document's destroy
 * marks or destroys it (vue-pdf-embed destroys a task on unmount without awaiting it, IMP-003). The wrapper must be the
 * essential build's own `PDFWorker` (`getDocument` checks `instanceof`), not `pdfjs-dist`'s. `GlobalWorkerOptions` stays
 * unset, so a document loaded without this worker fails loudly instead of taking it over.
 */
export const getSharedPdfWorker = (): PDFWorker => {
  if (sharedWorker) return sharedWorker;
  const BundledPdfWorker = (globalThis as { pdfjsLib?: { PDFWorker?: BundledPdfWorkerClass } }).pdfjsLib?.PDFWorker;
  if (typeof BundledPdfWorker !== 'function') throw new PdfJsWorkerUnavailableError();
  sharedWorker = new BundledPdfWorker({ port: new PdfJsWorker() });
  return sharedWorker;
};
