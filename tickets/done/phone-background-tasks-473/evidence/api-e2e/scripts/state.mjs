// autobyteus-473 API/E2E (temporary; from autobyteus-472's tools): page-state expressions read over CDP by the journeys (see droid.mjs).
export const TOUCH_COUNTER = `(() => { window.__t = { starts: 0, maxTouches: 0, moves: 0 };
  if (!window.__tInstalled) { window.__tInstalled = true;
    addEventListener('touchstart', e => { __t.starts++; __t.maxTouches = Math.max(__t.maxTouches, e.touches.length); }, { capture: true, passive: true });
    addEventListener('touchend', e => { (__t.ends ??= []).push(Math.round(performance.now())); }, { capture: true, passive: true });
    addEventListener('touchmove', e => { __t.moves++; __t.maxTouches = Math.max(__t.maxTouches, e.touches.length); }, { capture: true, passive: true }); }
  return 'counter reset'; })()`;
/** The page as a whole: zoom of the page itself, the bar, which screen. */
export const PAGE = `(() => { const back = document.querySelector('[data-testid="mobile-screen-back"], [data-testid="mobile-run-back"]')?.getBoundingClientRect();
  return { vvScale: visualViewport.scale, vvOffset: [visualViewport.offsetLeft, visualViewport.offsetTop], docScroll: [scrollX, scrollY], innerWidth,
    viewer: !!document.querySelector('[data-testid="mobile-file-viewer"]'), runScreen: document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? null,
    title: document.querySelector('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-title"]')?.textContent?.trim() ?? null,
    back: back ? { x: Math.round(back.x), y: Math.round(back.y), w: Math.round(back.width) } : null,
    download: !!document.querySelector('[data-testid="mobile-file-download"]'), touches: window.__t ?? null }; })()`;
/** The PDF viewer: the pages' CSS width, the live transform, canvases (CSS and bitmap width), the scroller. */
export const PDF = `(() => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'), p = document.querySelector('[data-testid="pdf-viewer-pages"]');
  if (!s || !p) return null; const cs = [...p.querySelectorAll('canvas')];
  const firstVisible = cs.findIndex(c => { const r = c.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight; });
  return { pagesCssWidth: Math.round(p.getBoundingClientRect().width), transform: p.style.transform || '', canvases: cs.length,
    canvasCss: cs.slice(0, 2).map(c => Math.round(c.getBoundingClientRect().width)), canvasBitmap: cs.slice(0, 2).map(c => [c.width, c.height]),
    allBitmapsMatch: cs.every(c => Math.abs(c.width - Math.round(c.getBoundingClientRect().width * devicePixelRatio)) <= 2),
    bitmapPixelsMillions: Math.round(cs.reduce((a, c) => a + c.width * c.height, 0) / 1e5) / 10,
    scroll: { top: Math.round(s.scrollTop), left: Math.round(s.scrollLeft), height: s.scrollHeight, width: s.scrollWidth, clientW: s.clientWidth, clientH: s.clientHeight },
    firstVisiblePage: firstVisible + 1, scrollerRect: (() => { const r = s.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; })() }; })()`;
/** The image viewer: the picture layer's transform and the image's natural size. */
export const IMAGE = `(() => { const layer = document.querySelector('[data-testid="image-viewer-touch"]'), pic = document.querySelector('[data-testid="image-viewer-picture"]');
  if (!layer || !pic) return null; const img = pic.querySelector('img'); const r = pic.getBoundingClientRect(), lr = layer.getBoundingClientRect();
  return { transform: pic.style.transform, layer: [Math.round(lr.x), Math.round(lr.y), Math.round(lr.width), Math.round(lr.height)], picture: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
    natural: img ? [img.naturalWidth, img.naturalHeight] : null, imgRect: img ? (() => { const b = img.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; })() : null }; })()`;
