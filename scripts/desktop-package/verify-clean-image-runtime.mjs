#!/usr/bin/env node
// Run a Linux AppImage's runtime in a stock Ubuntu image of the runner's architecture, never on the runner:
// the runner has zlib's development package (libz.so), a stock desktop does not (autobyteus-28).
// Only `--appimage-extract AppRun` runs, which proves the runtime loads and reads the image; the desktop never starts.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const CLEAN_IMAGE = 'ubuntu:24.04';
const IMAGE_IN_CONTAINER = '/autobyteus.AppImage';
// Fails closed (exit 3) when the clean image ever ships libz.so, so the check cannot pass for the wrong reason.
const CHECK = [
  'for f in /lib/libz.so /usr/lib/libz.so /lib/*-linux-gnu/libz.so /usr/lib/*-linux-gnu/libz.so; do',
  '  [ ! -e "$f" ] || { echo "clean image has $f" >&2; exit 3; }',
  'done',
  'cd "$(mktemp -d)"',
  `${IMAGE_IN_CONTAINER} --appimage-extract AppRun >/dev/null`,
  'test -x squashfs-root/AppRun',
].join('\n');

const [image] = process.argv.slice(2);
if (!image || process.argv.length !== 3) throw Error('Usage: verify-clean-image-runtime.mjs IMAGE');
const result = spawnSync('docker', [
  'run', '--rm', '--network', 'none',
  '--mount', `type=bind,source=${resolve(image)},target=${IMAGE_IN_CONTAINER},readonly`,
  CLEAN_IMAGE, 'sh', '-ec', CHECK,
], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
if (result.error) throw Error(`Clean-image runtime check needs docker: ${result.error.message}`);
if (result.status !== 0) {
  throw Error(`AppImage does not run in a clean ${CLEAN_IMAGE} image (exit ${result.status ?? result.signal}): ${result.stderr.trim()}`);
}
console.log(`Verified the AppImage runtime loads and extracts AppRun in a clean ${CLEAN_IMAGE} image without libz.so`);
