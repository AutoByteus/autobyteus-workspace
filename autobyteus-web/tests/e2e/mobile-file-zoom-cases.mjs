// Touch zoom and Download in the phone viewer (autobyteus-472). A case of `pnpm -C autobyteus-web test:e2e:mobile-shell`,
// run by `mobile-shell-probe.mjs` right after MSP-16, on its phone page (`--cases=MSP-39` runs only this one).
//
//   MSP-39 AC-001, AC-002, AC-003 (browser), AC-004  The Delivery Team lead's message links a four-page PDF and a
//          600×400 PNG outside the run's folder; each opens in the phone viewer (production phone bundle, headless
//          Chrome with touch, 390×844). Touches go through Chrome's own input path (CDP `Input.dispatchTouchEvent`).
//          PDF: a two-finger pinch out draws the pages at twice the width (canvas bitmaps at the new width × the device
//          pixel ratio: sharp), the pinched point stays under the fingers, one finger then scrolls down through the
//          pages, a double tap returns to page width and another goes to 2×. Image: a pinch zooms the picture, a double
//          tap returns to fit. Throughout: the page itself never zooms (`visualViewport.scale` 1) and the back arrow
//          stays where it is. Download in the bar saves each file through the browser's download, with the file's
//          name and bytes.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { randomUUID } from 'node:crypto';

/** A PDF of `pageCount` pages, each with a heading and lines of small print. */
const multiPagePdf = (pageCount) => {
  const pages = Array.from({ length: pageCount }, (_, index) => index);
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map(i => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`];
  for (const i of pages) {
    const lines = [`BT /F1 20 Tf 40 760 Td (RESUME-472 PAGE ${i + 1}) Tj ET`,
      ...Array.from({ length: 40 }, (_, line) => `BT /F1 7 Tf 40 ${730 - line * 16} Td (Small print line ${line + 1} of page ${i + 1}: experience, skills, education.) Tj ET`)];
    const stream = lines.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 ${3 + pageCount * 2} 0 R >> >> >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => { const at = out.length; out += `${index + 1} 0 obj\n${object}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
};

/** A `width`×`height` PNG of stripes (so a zoom is visible in the screenshots). */
const stripedPng = (width, height) => {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const rows = Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x += 1) row.fill(Math.floor(x / 40) % 2 ? 0x30 : (Math.floor(y / 40) % 2 ? 0xc0 : 0x90), 1 + x * 3, 4 + x * 3);
    return row;
  });
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
};

/**
 * @param probe `runCase`, `page` (the paired phone), `stack`, `alpha`, `sel`, `toList`, `openRow`, `shot`, `sendOver`,
 *   `waitFor`, `sleep`, `assert`, `outputDir`.
 */
export const runFileZoomCases = async (probe) => {
  const { runCase, page, stack, sel, toList, openRow, shot, sendOver, waitFor, sleep, assert, outputDir } = probe;

  await runCase('MSP-39', async () => {
    const outsideDir = path.join(path.dirname(stack.workspace), 'outside-472');
    const pdfPath = path.join(outsideDir, 'resume-472.pdf');
    const pngPath = path.join(outsideDir, 'photo-472.png');
    await fs.mkdir(outsideDir, { recursive: true });
    const pdfBytes = multiPagePdf(4);
    const pngBytes = stripedPng(600, 400);
    await fs.writeFile(pdfPath, pdfBytes);
    await fs.writeFile(pngPath, pngBytes);
    const downloadDir = path.join(outputDir, 'MSP-39-downloads');
    await fs.mkdir(downloadDir, { recursive: true });

    const marker = 'FILE-ZOOM-472';
    await sendOver(stack.wsUrl(`agent-team/${stack.delivery}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
      context_file_paths: [], image_urls: [], agent_run_id: stack.deliveryLead,
      content: `ECHO_INPUT ${marker} The resume [resume-472.pdf](${pdfPath}) and the photo [photo-472.png](${pngPath}).` });
    await waitFor('the lead\'s answer naming the PDF and the image', async () => /ECHO:[^]*FILE-ZOOM-472/.test(await stack.leadProjection()), 60_000);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });
    const touches = (points) => points.map(([x, y], id) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 }));
    const gesture = async (from, to, steps = 12) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(from) });
      for (let step = 1; step <= steps; step += 1) {
        const at = from.map(([x, y], i) => [x + (to[i][0] - x) * step / steps, y + (to[i][1] - y) * step / steps]);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(at) });
        await sleep(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const doubleTap = async (x, y) => {
      for (let i = 0; i < 2; i += 1) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches([[x, y]]) });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sleep(60);
      }
    };
    const pageState = () => page.evaluate(() => {
      const back = document.querySelector('[data-testid="mobile-screen-back"]')?.getBoundingClientRect();
      const scroller = document.querySelector('[data-testid="pdf-viewer-scroller"]');
      const pages = document.querySelector('[data-testid="pdf-viewer-pages"]');
      const canvases = [...(pages?.querySelectorAll('.vue-pdf-embed__page canvas') ?? [])];
      const picture = document.querySelector('[data-testid="image-viewer-picture"]');
      const rect = pages?.getBoundingClientRect();
      return {
        zoomScale: visualViewport?.scale ?? null, dpr: devicePixelRatio,
        back: back ? { x: Math.round(back.x), y: Math.round(back.y) } : null,
        pagesWidth: pages ? parseFloat(pages.style.width) : null, pagesTransform: pages?.style.transform ?? null,
        pagesRect: rect ? { left: rect.left, top: rect.top } : null,
        canvases: canvases.map(c => ({ cssWidth: parseFloat(c.style.width), bitmapWidth: c.width })),
        scrollLeft: scroller?.scrollLeft ?? null, scrollTop: scroller?.scrollTop ?? null,
        pictureTransform: picture?.style.transform ?? null,
        download: Boolean(document.querySelector('[data-testid="mobile-file-download"]')),
      };
    });
    const control = filePath => page.locator(`${sel('mobile-run-conversation')} [data-event-monitor-file-action-control="true"][title="${filePath}"]`);
    const viewer = page.locator(sel('mobile-file-viewer'));
    const openFile = async (filePath) => {
      await control(filePath).last().scrollIntoViewIfNeeded();
      await control(filePath).last().tap();
      await viewer.waitFor({ timeout: 20_000 });
    };
    const closeViewer = async () => {
      await page.goBack();
      await waitFor('the conversation again', async () => (await viewer.count()) === 0, 15_000).catch(() => undefined);
    };
    const downloaded = async (name, bytes) => {
      await page.locator(sel('mobile-file-download')).tap();
      const file = path.join(downloadDir, name);
      await waitFor(`${name} downloaded`, async () => (await fs.readFile(file).catch(() => null))?.equals(bytes) === true, 20_000).catch(() => undefined);
      return (await fs.readFile(file).catch(() => null))?.equals(bytes) === true;
    };

    await toList(page);
    await openRow(page, `team:${stack.delivery}`);
    await control(pdfPath).first().waitFor({ timeout: 30_000 });

    // The PDF.
    await openFile(pdfPath);
    await waitFor('four pages drawn at page width', async () => {
      const s = await pageState();
      return s.canvases.length === 4 && s.canvases.every(c => c.cssWidth === s.pagesWidth && c.bitmapWidth > 0);
    }, 30_000);
    const pdfStart = await pageState();
    const base = pdfStart.pagesWidth;
    await shot(page, 'MSP-39-pdf-1x');
    const centre = [195, 420];
    const anchor = { x: centre[0] - pdfStart.pagesRect.left, y: centre[1] - pdfStart.pagesRect.top };
    await gesture([[centre[0] - 50, centre[1]], [centre[0] + 50, centre[1]]], [[centre[0] - 100, centre[1]], [centre[0] + 100, centre[1]]]);
    await waitFor('the pages drawn at twice the width', async () => {
      const s = await pageState();
      return Math.abs(s.pagesWidth - base * 2) <= 2 && s.pagesTransform === '' && s.canvases.every(c => Math.abs(c.cssWidth - s.pagesWidth) <= 1);
    }, 20_000);
    await sleep(800);
    const pinched = await pageState();
    await shot(page, 'MSP-39-pdf-2x');
    const anchorNow = { x: pinched.pagesRect.left + anchor.x * (pinched.pagesWidth / base), y: pinched.pagesRect.top + anchor.y * (pinched.pagesWidth / base) };
    // One finger: the pages scroll on, at 2×.
    await gesture([[195, 700]], [[195, 300]]);
    await sleep(800);
    const scrolled = await pageState();
    await shot(page, 'MSP-39-pdf-2x-scrolled');
    await doubleTap(195, 420);
    await waitFor('a double tap returns to page width', async () => Math.abs((await pageState()).pagesWidth - base) <= 1, 20_000).catch(() => undefined);
    const backToFit = await pageState();
    await sleep(400);
    await doubleTap(195, 420);
    await waitFor('a double tap goes to 2×', async () => Math.abs((await pageState()).pagesWidth - base * 2) <= 2, 20_000).catch(() => undefined);
    const doubleTapped = await pageState();
    const pdfDownloaded = await downloaded('resume-472.pdf', pdfBytes);
    await closeViewer();

    // The image.
    await openFile(pngPath);
    await waitFor('the image shown', async () => (await pageState()).pictureTransform !== null, 20_000);
    await sleep(500);
    const imageStart = await pageState();
    await gesture([[145, 420], [245, 420]], [[95, 420], [295, 420]]);
    await sleep(300);
    const imagePinched = await pageState();
    await shot(page, 'MSP-39-image-pinched');
    await doubleTap(195, 420);
    await sleep(400);
    const imageFit = await pageState();
    const pngDownloaded = await downloaded('photo-472.png', pngBytes);
    await closeViewer();
    await cdp.detach().catch(() => undefined);

    const details = { base, pdfStart, pinched, anchor, anchorNow, centre, scrolled, backToFit, doubleTapped, pdfDownloaded, imageStart, imagePinched, imageFit, pngDownloaded };
    const all = [pdfStart, pinched, scrolled, backToFit, doubleTapped, imageStart, imagePinched, imageFit];
    assert(base > 300 && pdfStart.download, 'the PDF opens at page width with Download in the bar', details);
    assert(Math.abs(pinched.pagesWidth - base * 2) <= 2, 'AC-001 a pinch out draws the PDF at twice the width', details);
    assert(pinched.canvases.every(c => c.bitmapWidth >= c.cssWidth * pinched.dpr * 0.95), 'AC-001 the zoomed pages are drawn at the new width (sharp)', details);
    assert(Math.abs(anchorNow.x - centre[0]) <= 4 && Math.abs(anchorNow.y - centre[1]) <= 4, 'AC-001 the pinched point stays under the fingers', details);
    assert(scrolled.scrollTop > pinched.scrollTop + 200, 'AC-001 one finger scrolls through the zoomed pages', details);
    assert(Math.abs(backToFit.pagesWidth - base) <= 1 && Math.abs(doubleTapped.pagesWidth - base * 2) <= 2, 'AC-001 a double tap switches between page width and 2×', details);
    assert(/scale\((1\.9|2(\.0)?)/.test(imagePinched.pictureTransform ?? '') && imageFit.pictureTransform === 'translate(0px, 0px) scale(1)', 'AC-002 the image pinches to 2× and a double tap returns to fit', details);
    assert(all.every(s => s.zoomScale === 1), 'REQ-003 the page itself never zooms', details);
    assert(all.every(s => s.back && s.back.x === pdfStart.back.x && s.back.y === pdfStart.back.y), 'REQ-003 the back arrow stays where it is', details);
    assert(pdfDownloaded && pngDownloaded, 'REQ-004 Download saves the PDF and the image with their names and bytes (browser download)', details);
    return details;
  });
};
