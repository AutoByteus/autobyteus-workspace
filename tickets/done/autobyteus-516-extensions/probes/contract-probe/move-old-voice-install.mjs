// Probe-only prototype of the one-time move (V3): today's desktop Voice Input layout → extension-contract §7.
// Runs on the desktop side before the embedded node starts. Moves (renames) folders; copies nothing big.
// Input: the extensions folder (on the desktop: ~/.autobyteus/extensions). Returns the microphone choice,
// which becomes an AutoByteus setting of this computer.
import fs from 'node:fs/promises';
import path from 'node:path';

export async function moveOldVoiceInstall(extensionsDir) {
  const registryPath = path.join(extensionsDir, 'registry.json');
  let registry;
  try { registry = JSON.parse(await fs.readFile(registryPath, 'utf8')); } catch { return { moved: false, reason: 'no old registry' }; }
  const old = registry?.extensions?.['voice-input'];
  const oldDir = path.join(extensionsDir, 'voice-input');
  if (!old || old.status !== 'installed') return { moved: false, reason: `old Voice Input not installed (${old?.status ?? 'absent'})` };
  const dataDir = path.join(oldDir, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  for (const name of ['runtime', 'models']) await fs.rename(path.join(oldDir, name), path.join(dataDir, name));
  const language = ['auto', 'en', 'zh'].includes(old.settings?.languageMode) ? old.settings.languageMode : 'auto';
  await fs.writeFile(path.join(dataDir, 'settings.json'), `${JSON.stringify({ language })}\n`);
  await fs.writeFile(path.join(extensionsDir, 'state.json'), `${JSON.stringify({ 'voice-input': { enabled: Boolean(old.enabled) } })}\n`);
  for (const name of ['installation.json', 'temp', 'downloads']) await fs.rm(path.join(oldDir, name), { recursive: true, force: true });
  await fs.rm(registryPath);
  return { moved: true, enabled: Boolean(old.enabled), language, microphone: old.settings?.audioInputDeviceId ?? null };
}
