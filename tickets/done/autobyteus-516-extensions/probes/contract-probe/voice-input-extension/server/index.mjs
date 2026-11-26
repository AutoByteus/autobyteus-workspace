// Probe-only Voice Input server part written against extension-contract.md (contract version 1).
// It wraps the existing voice runtime 0.3.0 found in ctx.dir. The download path of a fresh install
// is not part of this probe.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const MODEL_FOLDER = 'whisper-small-mlx';
let worker = null;
let requestCounter = 0;

const exists = async (p) => fs.access(p).then(() => true, () => false);
const runtimePaths = (ctx) => ({
  entry: path.join(ctx.dir, 'runtime', 'bin', 'voice-input-worker'),
  model: path.join(ctx.dir, 'models', MODEL_FOLDER),
  settings: path.join(ctx.dir, 'settings.json'),
  temp: path.join(ctx.dir, 'temp'),
});
const backendFor = (platform) => (platform === 'darwin-arm64' ? 'mlx' : 'faster-whisper');

async function readLanguage(ctx) {
  try {
    const parsed = JSON.parse(await fs.readFile(runtimePaths(ctx).settings, 'utf8'));
    return ['auto', 'en', 'zh'].includes(parsed.language) ? parsed.language : 'auto';
  } catch {
    return 'auto';
  }
}

function startWorker(ctx) {
  const p = runtimePaths(ctx);
  const child = spawn(p.entry, ['serve', '--backend', backendFor(ctx.platform), '--model-path', p.model], { stdio: ['pipe', 'pipe', 'pipe'] });
  const state = { child, pending: new Map(), buffer: '', stderr: '' };
  state.ready = new Promise((resolve, reject) => { state.resolveReady = resolve; state.rejectReady = reject; });
  child.stdout.on('data', (chunk) => {
    state.buffer += chunk.toString();
    const lines = state.buffer.split('\n');
    state.buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let message;
      try { message = JSON.parse(line); } catch { continue; }
      if (message.type === 'ready') { state.resolveReady(); continue; }
      const pending = state.pending.get(message.requestId);
      if (pending) { state.pending.delete(message.requestId); pending(message); }
    }
  });
  child.stderr.on('data', (chunk) => { state.stderr += chunk.toString(); });
  child.on('close', (code) => {
    state.rejectReady(new Error(`worker exited ${code}: ${state.stderr.trim().slice(-400)}`));
    worker = null;
  });
  ctx.log(`worker started (backend ${backendFor(ctx.platform)})`);
  return state;
}

export default {
  async install(ctx) {
    const p = runtimePaths(ctx);
    if (await exists(p.entry) && await exists(p.model)) {
      ctx.progress({ message: 'Using the runtime and model already on this computer', percent: 100 });
      ctx.log('install: adopted existing runtime and model, nothing downloaded');
      return;
    }
    // Fresh install: the same steps as today's desktop code (voiceInputRuntimeService.installRuntime).
    const manifestUrl = process.env.VOICE_RUNTIME_MANIFEST_URL
      ?? 'https://github.com/AutoByteus/autobyteus-voice-runtime/releases/download/v0.3.0/voice-input-runtime-manifest.json';
    ctx.progress({ message: 'Fetching runtime manifest…', percent: null });
    const manifest = await (await fetch(manifestUrl)).json();
    const [os, cpu] = ctx.platform.split('-');
    const asset = manifest.assets.find((a) => a.platform === os && a.arch === cpu);
    if (!asset) throw new Error(`No voice runtime for ${ctx.platform}`);
    const downloads = path.join(ctx.dir, 'downloads');
    await fs.mkdir(downloads, { recursive: true });
    const archive = path.join(downloads, asset.fileName);
    const response = await fetch(asset.url);
    const total = Number(response.headers.get('content-length')) || null;
    const chunks = []; let received = 0;
    for await (const chunk of response.body) {
      chunks.push(chunk); received += chunk.length;
      ctx.progress({ message: 'Downloading the voice runtime…', percent: total ? Math.round((received / total) * 100) : null });
    }
    const bytes = Buffer.concat(chunks);
    const { createHash } = await import('node:crypto');
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('voice runtime checksum mismatch');
    await fs.writeFile(archive, bytes);
    await fs.mkdir(path.join(ctx.dir, 'runtime'), { recursive: true });
    const { execFileSync } = await import('node:child_process');
    ctx.progress({ message: 'Extracting the voice runtime…', percent: null });
    execFileSync('tar', ['-xzf', archive, '-C', path.join(ctx.dir, 'runtime')]);
    await fs.chmod(p.entry, 0o755);
    ctx.progress({ message: 'Preparing the speech model (downloads it once)…', percent: null });
    ctx.log(`install: downloaded runtime ${manifest.runtimeVersion}; preparing model ${asset.model.sourceRepo}`);
    await new Promise((resolve, reject) => {
      const child = spawn(p.entry, ['prepare', '--backend', asset.backendKind, '--model-path', path.join(ctx.dir, 'models', asset.model.id), '--model-source-repo', asset.model.sourceRepo, ...(asset.model.sourceRevision ? ['--model-source-revision', asset.model.sourceRevision] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = ''; child.stderr.on('data', (c) => { err += c; });
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim().slice(-400) || `prepare exited ${code}`))));
    });
    ctx.log('install: runtime and model ready');
  },

  // Optional start step (contract §4, added 2026-11-26): warm the speech model so the first dictation is fast.
  async start(ctx) {
    worker ??= startWorker(ctx);
    await worker.ready;
    // A 1 s, 440 Hz tone: silence is answered "no speech" without loading the model (probe finding), a tone is not.
    const samples = 16000; const clip = Buffer.alloc(44 + samples * 2);
    clip.write('RIFF', 0); clip.writeUInt32LE(36 + samples * 2, 4); clip.write('WAVE', 8); clip.write('fmt ', 12);
    clip.writeUInt32LE(16, 16); clip.writeUInt16LE(1, 20); clip.writeUInt16LE(1, 22); clip.writeUInt32LE(16000, 24);
    clip.writeUInt32LE(32000, 28); clip.writeUInt16LE(2, 32); clip.writeUInt16LE(16, 34); clip.write('data', 36); clip.writeUInt32LE(samples * 2, 40);
    for (let i = 0; i < samples; i += 1) clip.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / 16000)), 44 + i * 2);
    const silence = clip;
    await this.actions.transcribe(ctx, { json: null, bytes: silence });
    ctx.log('start: speech model warm');
  },

  async status(ctx) {
    const p = runtimePaths(ctx);
    const ready = await exists(p.entry) && await exists(p.model);
    return { ready, message: ready ? `Ready (${await readLanguage(ctx)})` : 'Runtime or model missing; reinstall' };
  },

  async stop(ctx) {
    if (!worker) return;
    const closing = new Promise((resolve) => worker.child.once('close', resolve));
    worker.child.kill();
    await closing;
    ctx.log('worker stopped');
  },

  actions: {
    async getLanguage(ctx) {
      return { language: await readLanguage(ctx) };
    },
    async setLanguage(ctx, input) {
      const language = input.json?.language;
      if (!['auto', 'en', 'zh'].includes(language)) throw new Error('language must be auto, en or zh');
      await fs.writeFile(runtimePaths(ctx).settings, `${JSON.stringify({ language })}\n`);
      return { language };
    },
    async transcribe(ctx, input) {
      if (!input.bytes) throw new Error('transcribe needs the WAV recording as bytes');
      const p = runtimePaths(ctx);
      await fs.mkdir(p.temp, { recursive: true });
      const audioPath = path.join(p.temp, `rec-${Date.now()}.wav`);
      await fs.writeFile(audioPath, input.bytes);
      try {
        worker ??= startWorker(ctx);
        await worker.ready;
        const requestId = `r${++requestCounter}`;
        const languageMode = await readLanguage(ctx);
        const response = await new Promise((resolve) => {
          worker.pending.set(requestId, resolve);
          worker.child.stdin.write(`${JSON.stringify({ requestId, type: 'transcribe-file', audioPath, languageMode })}\n`);
        });
        if (!response.ok) throw new Error(response.error ?? 'transcription failed');
        return { text: response.text ?? '', noSpeech: Boolean(response.noSpeech), detectedLanguage: response.detectedLanguage ?? null };
      } finally {
        await fs.rm(audioPath, { force: true });
      }
    },
  },
};
