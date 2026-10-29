import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { nfsLauncherCommand, nfsPublishedRelease, nfsUsageCommands, type NfsPublishedRelease } from '../nfsLauncherCommands';

const url = 'https://github.com/AutoByteus/autobyteus-nfs/releases/download/v0.1.0/autobyteus-nfs-install.sh';
const digest = '65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa';
const expected = (checker: string) => `curl --fail --location --proto '=https' --tlsv1.2 \\\n  '${url}' \\\n  -o autobyteus-nfs-install.sh &&
printf '%s  %s\\n' '${digest}' 'autobyteus-nfs-install.sh' | ${checker} &&
bash autobyteus-nfs-install.sh version`;

describe('NFS guide public distribution data (not field qualification)', () => {
  it('pins the actual public installer, checksum, release and two host downloads', () => {
    expect(nfsPublishedRelease).toEqual({ tag: 'v0.1.0', installerUrl: url,
      downloadUrl: 'https://github.com/AutoByteus/autobyteus-nfs/releases/tag/v0.1.0',
      installerSha256: digest, availableComputers: ['macos', 'linux'] });
    expect(nfsLauncherCommand('macos')).toBe(expected('shasum -a 256 -c -'));
    expect(nfsLauncherCommand('linux')).toBe(expected('sha256sum -c -'));
  });
  it('retains explicit unavailable and partial-platform fallbacks', () => {
    expect(nfsLauncherCommand('macos', null)).toBeNull();
    expect(nfsLauncherCommand('linux', null)).toBeNull();
    expect(nfsLauncherCommand('linux', { ...nfsPublishedRelease, availableComputers: ['macos'] })).toBeNull();
    expect(nfsLauncherCommand('macos', { ...nfsPublishedRelease, availableComputers: ['macos'] })).toBe(expected('shasum -a 256 -c -'));
  });
  it.each(['http://unsafe/install.sh', "https://host/a';touch /tmp/oops;echo '", 'https://u:p@host/script', 'javascript:alert(1)', 'https://host/\nscript'])(
    'refuses unsafe installer AND download URLs: %s', value => {
      for (const key of ['installerUrl', 'downloadUrl']) {
        expect(nfsLauncherCommand('macos', { ...nfsPublishedRelease, [key]: value })).toBeNull();
      }
    },
  );
  it.each([
    ['tag', ''], ['tag', '  '], ['tag', 'latest'], ['tag', 'v0.1.0\n'], ['tag', "v0.1.0';oops"],
    ['installerSha256', ''], ['installerSha256', 'a'.repeat(63)], ['installerSha256', 'g'.repeat(64)],
    ['installerSha256', digest.toUpperCase()], ['installerSha256', digest + '\n'],
  ])('refuses invalid %s=%s', (key, value) => {
    expect(nfsLauncherCommand('linux', { ...nfsPublishedRelease, [key]: value } as NfsPublishedRelease)).toBeNull();
  });
  it('lists exactly the seven public installed commands, with explicit installed paths', () => {
    expect(nfsUsageCommands).toEqual([
      { id: 'interactive', command: '~/.local/bin/autobyteus-nfs' },
      ...['create', 'connect', 'status', 'reconnect', 'detach', 'version'].map(id => ({ id, command: `~/.local/bin/autobyteus-nfs ${id}` })),
    ]);
  });
});

describe('displayed install shell guards (ALL external commands are inert stubs)', () => {
  for (const computer of ['macos', 'linux'] as const) {
    it.each(['success', 'download-failure', 'checksum-failure'])(`${computer}: %s`, outcome => {
      const dir = mkdtempSync(join(tmpdir(), 'nfs-guide-shell-'));
      const log = join(dir, 'calls');
      const stub = (name: string, body: string) => writeFileSync(join(dir, name), `#!/bin/sh\n${body}\n`, { mode: 0o700 });
      try {
        stub('curl', 'printf "curl" >> "$CALLS"; printf " <%s>" "$@" >> "$CALLS"; printf "\\n" >> "$CALLS"; exit "$DOWNLOAD_EXIT"');
        for (const name of ['shasum', 'sha256sum']) {
          stub(name, `printf "${name}" >> "$CALLS"; printf " <%s>" "$@" >> "$CALLS"; printf "\\n" >> "$CALLS"; IFS= read -r line; printf '%s\\n' "$line" >> "$CALLS"; exit "$CHECKSUM_EXIT"`);
        }
        stub('bash', 'printf "bash" >> "$CALLS"; printf " <%s>" "$@" >> "$CALLS"; printf "\\n" >> "$CALLS"');
        const result = spawnSync('/bin/bash', ['-c', nfsLauncherCommand(computer)!], {
          cwd: dir, encoding: 'utf8', env: { PATH: dir, HOME: dir, CALLS: log,
            DOWNLOAD_EXIT: outcome === 'download-failure' ? '22' : '0', CHECKSUM_EXIT: outcome === 'checksum-failure' ? '1' : '0' },
        });
        const calls = readFileSync(log, 'utf8');
        expect(calls).toContain(`curl <--fail> <--location> <--proto> <=https> <--tlsv1.2> <${url}> <-o> <autobyteus-nfs-install.sh>\n`);
        expect(result.stderr).toBe('');
        expect(result.status).toBe(outcome === 'success' ? 0 : outcome === 'download-failure' ? 22 : 1);
        if (outcome === 'download-failure') expect(calls).not.toMatch(/shasum|sha256sum|bash/);
        else {
          expect(calls).toContain(computer === 'macos' ? 'shasum <-a> <256> <-c> <->' : 'sha256sum <-c> <->');
          expect(calls).toContain(`${digest}  autobyteus-nfs-install.sh\n`);
        }
        if (outcome === 'success') expect(calls).toContain('bash <autobyteus-nfs-install.sh> <version>\n');
        else expect(calls).not.toContain('bash');
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });
  }
});
