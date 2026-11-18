// API-10 (AC-008): the app's viewers still display every type under the user-file reply headers, opened the way a user
// opens them: the start surface's target and folder, the Files panel, a click on each file. Then a PDF opened top-level
// in the in-app browser from F1 (an attachment's workspace path) and from F3 (an uploaded media file, the media page).
// args: <files dir> <F1 attachment pdf URL> <pdf file to upload>
import fs from 'node:fs/promises';
import path from 'node:path';
export default async ({ args, main, instance, gql, openTab, shot, refusals, nodeLog, assert, waitFor, sleep }) => {
  const [filesDir, attachmentPdfUrl, uploadPdf] = args;
  const before = nodeLog().length;
  const test = name => main.locator(`[data-test="${name}"]`);
  const agent = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: 'Viewer Proof Agent', description: 'API-10 fixture', instructions: 'Fixture; no inference.', toolNames: [] } })).createAgentDefinition.id;
  await main.goto(main.url().split('#')[0] + '#/chat'); await main.reload();
  await test('run-target-switcher-trigger').waitFor({ timeout: 60_000 });
  await test('run-target-switcher-trigger').click(); await test(`run-target-switcher-option-${agent}`).click();
  await test('run-target-switcher-menu').waitFor({ state: 'detached' });
  await test('chat-workspace-trigger').click(); await test('chat-workspace-open-folder').click();
  await main.locator('#chat-workspace-path').fill(filesDir);
  await test('chat-workspace-folder-form').locator('button[type="submit"]').click();
  await test('chat-workspace-menu').waitFor({ state: 'detached' });
  // The start surface keeps its tools panel (Files, …) collapsed until "Show tools".
  const toolsToggle = test('start-surface-tools-toggle');
  if (await toolsToggle.count() && (await toolsToggle.getAttribute('aria-label')) === 'Show tools') await toolsToggle.click();
  await sleep(1000);
  const filesTab = main.locator('[data-test="right-side-tab-list"] button').filter({ hasText: /^\s*Files\s*$/ });
  if (await filesTab.count()) await filesTab.first().click();
  await main.locator('.file-explorer').waitFor({ timeout: 30_000 });
  await waitFor('the fixture files listed', async () => (await main.locator('.file-explorer .file-header').filter({ hasText: 'report.pdf' }).count()) > 0, 30_000);
  const open = async name => { await main.locator('.file-explorer .file-header').filter({ hasText: new RegExp(`^\\s*${name.replace('.', '\\.')}\\s*$`) }).first().click(); await sleep(1500); };
  const viewer = () => main.locator('#contentViewer');
  const results = {};
  const check = async (name, fn) => { try { await open(name); results[name] = { result: 'Pass', ...(await fn()) }; } catch (e) { results[name] = { result: 'Fail', error: e.message }; } await shot(main, `API-10-viewer-${name.replace(/\W/g, '_')}`); };
  await check('report.pdf', async () => { await waitFor('pdf pages', async () => (await viewer().locator('.pdf-content canvas').count()) > 0, 20_000); return { canvases: await viewer().locator('.pdf-content canvas').count() }; });
  await check('sheet.xlsx', async () => { await waitFor('sheet cell', async () => (await viewer().innerText()).includes('API10-SHEET-CELL'), 20_000); return { cell: 'API10-SHEET-CELL' }; });
  await check('image.png', async () => { const w = await waitFor('image decoded', async () => viewer().locator('img').first().evaluate(i => i.complete && i.naturalWidth), 20_000); return { naturalWidth: w }; });
  await check('clip.webm', async () => { const m = await waitFor('video metadata', async () => viewer().locator('video').first().evaluate(v => v.readyState >= 1 ? { readyState: v.readyState, duration: v.duration, width: v.videoWidth } : null), 20_000); return m; });
  await check('sound.wav', async () => { const m = await waitFor('audio metadata', async () => viewer().locator('audio').first().evaluate(a => a.readyState >= 1 ? { readyState: a.readyState, duration: a.duration } : null), 20_000); return m; });
  await check('notes.md', async () => { await waitFor('markdown text', async () => (await viewer().innerText()).includes('API10 MARKDOWN HEADING'), 20_000); const img = await viewer().locator('img').first().evaluate(i => i.complete && i.naturalWidth).catch(() => null); return { text: true, imageNaturalWidth: img }; });
  // The text viewer is Monaco: it renders spaces as U+00A0.
  await check('notes.txt', async () => { await waitFor('text', async () => (await viewer().innerText()).replace(/\u00a0/g, ' ').includes('API10 PLAIN TEXT LINE'), 20_000); return { text: true }; });
  await check('preview.html', async () => {
    const previewToggle = viewer().locator('button, [role="tab"]').filter({ hasText: /^\s*Preview\s*$/ });
    if (await previewToggle.count()) await previewToggle.first().click();
    await sleep(2500);
    // The preview is a sandboxed (allow-scripts) iframe on a blob: URL; read every child frame's heading.
    const frames = main.frames().filter(f => f !== main.mainFrame());
    const texts = await waitFor('the preview frame text', async () => { const t = await Promise.all(frames.map(f => f.evaluate(() => document.getElementById('p')?.textContent ?? null).catch(() => null))); return t.includes('API10 HTML PREVIEW SCRIPT RAN') ? t : null; }, 15_000).catch(() => null);
    assert(texts.includes('API10 HTML PREVIEW SCRIPT RAN'), 'the HTML preview renders and its script runs', { frames: frames.map(f => f.url()), texts });
    return { frameText: 'API10 HTML PREVIEW SCRIPT RAN' };
  });
  // Top-level PDFs in the in-app browser (Electron's PDF viewer).
  const pdfTop = async (label, url) => {
    const { page } = await openTab(url); await sleep(5000);
    const doc = await page.evaluate(() => ({ embeds: [...document.querySelectorAll('embed')].map(e => e.type), contentType: document.contentType, bodyChildren: document.body?.children.length ?? 0 }));
    await shot(page, `API-10-top-level-pdf-${label}`);
    const h = await fetch(url); return { url: url.replace(instance.backendUrl, '<node>'), doc, headers: { contentType: h.headers.get('content-type'), csp: h.headers.get('content-security-policy'), nosniff: h.headers.get('x-content-type-options') } };
  };
  results.topLevelAttachmentPdf = await pdfTop('attachment-F1', attachmentPdfUrl);
  const form = new FormData(); form.append('file', new Blob([await fs.readFile(uploadPdf)], { type: 'application/pdf' }), path.basename(uploadPdf));
  const up = await (await fetch(`${instance.backendUrl}/rest/upload-file`, { method: 'POST', body: form })).json();
  results.upload = up;
  const mediaUrl = up.fileUrl ?? up.url ?? up.file_url;
  if (mediaUrl) results.topLevelMediaPdf = await pdfTop('media-F3', mediaUrl.startsWith('http') ? mediaUrl : `${instance.backendUrl}${mediaUrl}`);
  const lines = refusals(nodeLog().slice(before));
  results.refusalLines = lines;
  const failed = Object.entries(results).filter(([, v]) => v?.result === 'Fail').map(([k]) => k);
  assert(failed.length === 0, 'every viewer displays', { failed, results });
  for (const k of ['topLevelAttachmentPdf', 'topLevelMediaPdf']) assert(results[k]?.doc.embeds.includes('application/pdf') || results[k]?.doc.contentType === 'application/pdf', `${k} renders in the PDF viewer`, results[k]);
  assert(lines.length === 0, 'no refusal while viewing', lines);
  return results;
};
