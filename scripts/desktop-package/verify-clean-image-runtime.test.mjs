// node --test scripts/desktop-package/verify-clean-image-runtime.test.mjs
// A fake `docker` on PATH records the call; the real container run is release-job and ticket evidence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./verify-clean-image-runtime.mjs', import.meta.url).pathname;

function withFakeDocker(run) {
  const tmp = mkdtempSync(join(tmpdir(), 'clean-image-runtime-unit-'));
  try {
    const bin = join(tmp, 'bin'); mkdirSync(bin);
    const fake = join(bin, 'docker');
    writeFileSync(fake, `#!${process.execPath}
require('fs').writeFileSync(process.env.FAKE_DOCKER_ARGS, JSON.stringify(process.argv.slice(2)));
if (process.env.FAKE_DOCKER_STDERR) process.stderr.write(process.env.FAKE_DOCKER_STDERR);
process.exit(Number(process.env.FAKE_DOCKER_EXIT || 0));
`);
    chmodSync(fake, 0o755);
    const image = join(tmp, 'AutoByteus_personal_linux-arm64-1.5.14.AppImage');
    writeFileSync(image, 'inert test bytes, not executable');
    const argsFile = join(tmp, 'docker-args.json');
    const cli = (args, env = {}) => spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8', env: { PATH: bin, FAKE_DOCKER_ARGS: argsFile, ...env },
    });
    run({ tmp, image, cli, dockerArgs: () => JSON.parse(readFileSync(argsFile, 'utf8')) });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

test('runs the image read-only in a networkless stock ubuntu:24.04 container after asserting libz.so is absent', () => {
  withFakeDocker(({ image, cli, dockerArgs }) => {
    const result = cli([image]);
    assert.equal(result.status, 0, result.stderr);
    const args = dockerArgs();
    assert.deepEqual(args.slice(0, 4), ['run', '--rm', '--network', 'none']);
    assert.deepEqual(args.slice(4, 6), ['--mount', `type=bind,source=${image},target=/autobyteus.AppImage,readonly`]);
    assert.deepEqual(args.slice(6, 9), ['ubuntu:24.04', 'sh', '-ec']);
    const check = args[9];
    assert.equal(args.length, 10);
    const precondition = check.indexOf('/usr/lib/*-linux-gnu/libz.so');
    const extract = check.indexOf('/autobyteus.AppImage --appimage-extract AppRun');
    assert.ok(precondition >= 0 && extract > precondition, 'libz.so absence is asserted before the image runs');
    assert.match(check, /exit 3/);
    assert.match(check, /test -x squashfs-root\/AppRun/);
  });
});

test('a container failure fails the check with the container message', () => {
  withFakeDocker(({ image, cli }) => {
    const loader = '/autobyteus.AppImage: error while loading shared libraries: libz.so: cannot open shared object file: No such file or directory';
    const result = cli([image], { FAKE_DOCKER_EXIT: '127', FAKE_DOCKER_STDERR: loader });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not run in a clean ubuntu:24\.04 image \(exit 127\)/);
    assert.match(result.stderr, /libz\.so: cannot open shared object file/);
  });
});

test('a missing IMAGE argument or a missing docker fails loudly', () => {
  withFakeDocker(({ tmp, image, cli }) => {
    const usage = cli([]);
    assert.notEqual(usage.status, 0);
    assert.match(usage.stderr, /Usage: verify-clean-image-runtime\.mjs IMAGE/);
    const noDockerPath = join(tmp, 'empty-bin'); mkdirSync(noDockerPath);
    const noDocker = cli([image], { PATH: noDockerPath });
    assert.notEqual(noDocker.status, 0);
    assert.match(noDocker.stderr, /needs docker/);
  });
});
