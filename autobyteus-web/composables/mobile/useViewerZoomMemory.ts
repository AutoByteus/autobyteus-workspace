import type { PictureZoomState } from '~/composables/usePictureZoom';

/** Where a zoomed PDF is: its zoom (1× = page width) and its scroll position as fractions of the scrolled size. */
export type PdfZoomPlace = { zoom: number; scrollLeftRatio: number; scrollTopRatio: number };

/**
 * The phone viewer's memory of how its file is zoomed (autobyteus-472 REQ-006): kept while the same path is open, so a
 * reload of the file (a live refresh, an explicit open again, a node file read again) keeps the zoom and position;
 * another path starts at 1×. The viewers inside the phone viewer are replaced while a file reloads ("Opening…"), so
 * `MobileFileViewer` owns this holder and passes it down; a viewer reads it when its content is ready and writes it
 * after each finished gesture.
 */
export type ViewerZoomMemory = {
  readonly pdf: PdfZoomPlace | null;
  readonly image: PictureZoomState | null;
  rememberPdf(place: PdfZoomPlace): void;
  rememberImage(state: PictureZoomState): void;
};

type Remembered = { path: string; pdf: PdfZoomPlace | null; image: PictureZoomState | null };

export function useViewerZoomMemory(path: () => string): ViewerZoomMemory {
  let remembered: Remembered = { path: path(), pdf: null, image: null };
  /** The memory of the open path: another path starts empty. */
  const current = (): Remembered => {
    const open = path();
    if (remembered.path !== open) remembered = { path: open, pdf: null, image: null };
    return remembered;
  };
  return {
    get pdf() { return current().pdf; },
    get image() { return current().image; },
    rememberPdf(place) { current().pdf = { ...place }; },
    rememberImage(state) { current().image = { ...state }; },
  };
}
