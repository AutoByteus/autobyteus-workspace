"""Hermetic fail-closed probes for the production CLI installation RUN.

Real native success paths belong to server_docker_cli_smoke.py. These doubles
prevent downloads/system writes while reproducing upstream soft failures.
"""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = ROOT / 'autobyteus-server-ts/docker/Dockerfile.monorepo'


class ServerDockerCliInstallFailuresTest(unittest.TestCase):
    def run_failure(self, mode):
        layer = next(line[4:] for line in DOCKERFILE.read_text().replace('\\\n', ' ').splitlines()
                     if line.startswith('RUN echo "CLI install cache buster:'))
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            installer = temp / 'installer.sh'
            installer.write_text('''#!/bin/bash
set -eu
printf 'fixture-installer invoked\\n'
if [ "$MODE" = missing ]; then exit 0; fi
# The official installer receives --dir PATH.
printf '#!/bin/sh\\nexit 0\\n' > "$2/agy"
chmod +x "$2/agy"
''')
            doubles = r'''
npm() { printf 'npm invoked\n'; }
curl() {
  if [ "$MODE" = download ]; then return 22; fi
  cp "$INSTALLER" "${@: -1}"
}
timeout() { shift; "$@"; }
install() { printf 'UNEXPECTED_PUBLICATION\n'; return 99; }
'''
            result = subprocess.run(['/bin/bash', '-c', doubles + layer], text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    timeout=10, env={
                                        'PATH': os.defpath, 'HOME': directory,
                                        'TMPDIR': directory, 'MODE': mode,
                                        'INSTALLER': str(installer),
                                        'CLI_INSTALL_CACHE_BUSTER': 'failure-test',
                                        'CODEX_CLI_VERSION': 'latest',
                                        'CLAUDE_CODE_VERSION': 'latest',
                                    })
            self.assertEqual(result.returncode, 22 if mode == 'download' else 1, result.stdout)
            if mode != 'download':
                self.assertIn('fixture-installer invoked', result.stdout)
            self.assertIn('npm invoked', result.stdout)
            self.assertNotIn('UNEXPECTED_PUBLICATION', result.stdout)
            self.assertNotIn('Installed agy:', result.stdout)

    def test_failed_official_download_fails_layer(self):
        self.run_failure('download')

    def test_successful_installer_without_payload_fails_layer(self):
        self.run_failure('missing')

    def test_executable_with_empty_successful_version_fails_layer(self):
        self.run_failure('empty-version')


if __name__ == '__main__':
    unittest.main()
