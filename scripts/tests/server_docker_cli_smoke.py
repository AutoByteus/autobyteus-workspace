#!/usr/bin/env python3
"""Opt-in, offline production-image regression for AC-001/002/003/004.

Usage: python3 scripts/tests/server_docker_cli_smoke.py --image IMAGE
       [--platform linux/arm64]

Requires an already built production image and Docker. Does not build/pull, log
in, start inference, or touch existing containers/volumes. Tests image commands,
not application/server startup. Temporary named volumes and containers are
uniquely owned and removed even on a failed probe. No third-party Python deps.
"""
import argparse
import json
import re
import subprocess
import uuid


PROBE = r'''
set -eu
test "$(id -u)" = 0
test "$HOME" = /root
test -z "${GROK_HOME+x}"
test -f /app/autobyteus-server-ts/dist/app.js
test "$(command -v agy)" = /usr/local/bin/agy
test "$(readlink -f "$(command -v grok)")" = "$(npm root -g)/@xai-official/grok/bin/grok-native"
for cli in agy grok; do
  native="$(readlink -f "$(command -v "$cli")")"
  test "$(od -An -tx1 -N4 "$native" | tr -d ' \n')" = 7f454c46
  printf 'NATIVE %s %s\n' "$cli" "$native"
done
for cli in agy grok codex claude; do
  version="$(timeout 30s "$cli" --version)"
  printf '%s\n' "$version" | grep -Eq '[0-9]+\.[0-9]+\.[0-9]+'
  printf 'VERSION %s %s\n' "$cli" "$version"
done
node --version
'''

SEED = r'''
set -eu
mkdir -p /root/.local/bin /root/.grok/bin /root/.gemini/antigravity-cli /root/.claude /root/.codex
for path in /root/.local/bin/agy /root/.local/bin/grok /root/.grok/bin/grok; do
  printf '#!/bin/sh\necho OLD_HOME_TOOL_SELECTED >&2\nexit 97\n' > "$path"
  chmod +x "$path"
done
printf '{"fixture":"synthetic-no-credentials"}\n' > /root/.gemini/antigravity-cli/settings.json
printf '# synthetic fixture, no credentials\n' > /root/.grok/config.toml
for dir in /root /home/autobyteus/data /home/vncuser/.config/chromium; do
  printf 'cli-smoke-preserved\n' > "$dir/cli-smoke-marker"
done
sha256sum /root/.local/bin/agy /root/.local/bin/grok /root/.grok/bin/grok /root/.gemini/antigravity-cli/settings.json /root/.grok/config.toml > /root/cli-smoke-checksums
'''
VERIFY = r'''
for dir in /root /home/autobyteus/data /home/vncuser/.config/chromium; do
  test "$(cat "$dir/cli-smoke-marker")" = cli-smoke-preserved
done
sha256sum -c /root/cli-smoke-checksums
'''


def docker(*args, timeout=180):
    command = ['docker', *args]
    print('$ ' + ' '.join(command[:14]), flush=True)
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=timeout)
    print(result.stdout, end='', flush=True)
    result.check_returncode()
    return result.stdout


def versions(output):
    result = dict(re.findall(r'^VERSION (agy|grok|codex|claude) (.+)$', output, re.M))
    if set(result) != {'agy', 'grok', 'codex', 'claude'}:
        raise AssertionError(f'Missing version records: {result}')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--platform', choices=['linux/amd64', 'linux/arm64'])
    args = parser.parse_args()
    metadata = json.loads(subprocess.check_output(
        ['docker', 'image', 'inspect', args.image], text=True, timeout=30))[0]
    if args.platform and args.platform != f"{metadata['Os']}/{metadata['Architecture']}":
        parser.error('Local image does not match the requested platform')
    image = metadata['Id']  # Hold the tested local image fixed; never pull.
    print(f"Testing {image} ({metadata['Os']}/{metadata['Architecture']})")
    prefix = 'cli-smoke-' + uuid.uuid4().hex[:12]
    owned_volumes = []
    active = None

    def run(shell, script, mounts=()):
        nonlocal active
        active = prefix + '-' + uuid.uuid4().hex[:6]
        command = ['run', '--pull=never', '--rm', '--name', active,
                   '--network', 'none', '--user', '0', '--entrypoint', '/bin/bash']
        if args.platform:
            command += ['--platform', args.platform]
        for source, target in mounts:
            command += ['--mount', f'type=volume,source={source},target={target}']
        output = docker(*command, image, shell, script)
        active = None
        return output

    try:
        baseline = versions(run('-c', PROBE))
        assert versions(run('-lc', PROBE)) == baseline, 'Clean login shell differs'
        mounts = []
        for suffix, target in [('home', '/root'), ('data', '/home/autobyteus/data'),
                               ('browser', '/home/vncuser/.config/chromium')]:
            volume = prefix + '-' + suffix
            docker('volume', 'create', '--label', 'autobyteus.validation=cli-smoke', volume)
            owned_volumes.append(volume)
            mounts.append((volume, target))
        run('-c', SEED, mounts)
        # Separate run containers prove recreation does not hide packaged commands.
        for shell in ['-c', '-lc']:
            observed = versions(run(shell, PROBE + VERIFY, mounts))
            assert observed == baseline, f'Reused-home {shell} changed versions'
        print('PASS: clean/reused-home default and login shells; offline versions; preserved fixtures')
    finally:
        if active:
            # A timed-out client may leave its uniquely named container running.
            subprocess.run(['docker', 'rm', '-f', active], check=False)
        for volume in reversed(owned_volumes):
            docker('volume', 'rm', volume)


if __name__ == '__main__':
    main()
