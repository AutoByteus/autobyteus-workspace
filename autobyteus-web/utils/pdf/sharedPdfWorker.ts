import { GlobalWorkerOptions } from 'vue-pdf-embed/dist/index.essential.mjs';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&inline';

let sharedWorker: Worker | null = null;

/**
 * The one pdf.js worker every PDF uses (autobyteus-647 D-5, DEC-002). vue-pdf-embed's essential build carries pdf.js
 * (4.10.38) without a worker; on the first call this creates one from `pdfjs-dist`'s worker of the same version (a Vite
 * inline worker: its blob is made once, so it also works in the packaged `file://` window) and gives it to pdf.js as
 * `GlobalWorkerOptions.workerPort`, so each document reuses it instead of making a worker (and a blob URL) of its own.
 * It lives as long as the page; later calls do nothing.
 */
export const ensureSharedPdfWorker = (): void => {
  if (sharedWorker || typeof window === 'undefined') return;
  sharedWorker = new PdfJsWorker();
  GlobalWorkerOptions.workerPort = sharedWorker;
};
