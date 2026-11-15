// API-05 temporary probe: the built autobyteus-ts media sanitizer, then the built Gemini prompt renderer, on real files.
// Usage: node api-05-gemini-request-probe.mjs <autobyteus-ts dir> <data dir>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [tsDir, dataDir] = process.argv.slice(2);
const load = (rel) => import(pathToFileURL(path.join(tsDir, 'dist', rel)).href);
const { sanitizeMediaInputMessages, INLINE_MEDIA_MAX_BYTES } = await load('llm/utils/media-input-sanitizer.js');
const { Message, MessageRole } = await load('llm/utils/messages.js');
const { GeminiPromptRenderer } = await load('llm/prompt-renderers/gemini-prompt-renderer.js');
const MiB = 1024 * 1024;
fs.mkdirSync(dataDir, { recursive: true });
const make = (name, bytes) => { const p = path.join(dataDir, name); fs.writeFileSync(p, Buffer.alloc(bytes, 3)); return p; };
const files = {
  videoOver: make('video-26mib.mp4', 26 * MiB), videoAt: make('video-25mib.mp4', 25 * MiB), videoSmall: make('video-3mib.mp4', 3 * MiB),
  audioOver: make('audio-26mib.mp3', 26 * MiB), imageOver: make('image-26mib.png', 26 * MiB), imageSmall: make('image-1mib.png', 1 * MiB),
};
const geminiVideo = { image: 'supported', audio: 'supported', video: 'supported' };
const message = new Message(MessageRole.USER, { content: 'Reference files:\n' + Object.values(files).join('\n'),
  image_urls: [files.imageOver, files.imageSmall], audio_urls: [files.audioOver], video_urls: [files.videoOver, files.videoAt, files.videoSmall,
    'data:video/mp4;base64,AAAA'] });
// A URL is not read from disk; the sanitizer leaves it (the renderer would download it, so it is checked on the sanitizer only).
const urlOnly = await sanitizeMediaInputMessages([new Message(MessageRole.USER, { content: 'u', video_urls: ['https://example.com/clip.mp4'] })], { image: 'supported', audio: 'supported', video: 'supported' });
const warn = console.warn; const heapBefore = process.memoryUsage().rss;
const out = await sanitizeMediaInputMessages([message], geminiVideo);
const kept = { image: out.outboundMessages[0].image_urls.map((u) => path.basename(u)), audio: out.outboundMessages[0].audio_urls.map((u) => path.basename(u)),
  video: out.outboundMessages[0].video_urls.map((u) => (u.startsWith('http') || u.startsWith('data:') ? u.slice(0, 24) : path.basename(u))) };
const rendered = await new GeminiPromptRenderer().render(out.outboundMessages);
const inline = rendered[0].parts.filter((p) => p.inlineData).map((p) => ({ mimeType: p.inlineData.mimeType, base64Chars: p.inlineData.data.length }));
const textPart = rendered[0].parts.find((p) => p.text)?.text ?? '';
const result = { INLINE_MEDIA_MAX_BYTES, kept, diagnostics: out.diagnostics.map((d) => `${d.mediaType}:${d.reason}`), inlineDataParts: inline,
  pathsStillInText: Object.values(files).every((p) => textPart.includes(p)), urlKept: urlOnly.outboundMessages[0].video_urls.length === 1 && urlOnly.diagnostics.length === 0, canonicalUntouched: message.video_urls.length === 4 && message.image_urls.length === 2,
  rssGrowthMiB: Math.round((process.memoryUsage().rss - heapBefore) / MiB) };
console.log(JSON.stringify(result, null, 2));
const failures = [];
if (kept.video.includes('video-26mib.mp4')) failures.push('26 MiB video kept');
if (!kept.video.includes('video-25mib.mp4')) failures.push('25 MiB video dropped');
if (kept.audio.length) failures.push('26 MiB audio kept');
if (kept.image.includes('image-26mib.png') || !kept.image.includes('image-1mib.png')) failures.push('image rule');
if (result.diagnostics.filter((d) => d.endsWith('too_large')).length !== 3) failures.push('expected 3 too_large diagnostics');
if (inline.length !== 4) failures.push(`expected 4 inline parts (1 image, 2 videos, 1 data URI), got ${inline.length}`);
if (!result.urlKept) failures.push('URL dropped');
if (!result.pathsStillInText || !result.canonicalUntouched) failures.push('path/canonical');
if (failures.length) { console.log('FAIL', failures.join('; ')); process.exit(1); }
console.log('PASS');
