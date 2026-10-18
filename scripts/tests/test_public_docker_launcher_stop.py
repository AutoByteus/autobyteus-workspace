"""Offline launcher fixtures: fake Docker, no mounts or /etc writes.
Run: python3 -m unittest scripts/tests/test_public_docker_launcher_stop.py -v
"""
import tempfile
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class DockerLauncherStopTest(unittest.TestCase):
    def test_launcher_stop_explains_noop_without_changing_policy(self):
        module=(ROOT/'scripts/public/docker/autobyteus-docker.d/bash/commands.sh').read_text()
        with tempfile.TemporaryDirectory(prefix='nfs-stop-unit-') as root:
            p=Path(root); (p/'node-one.env').write_text('')
            prefix="""set -euo pipefail
state_dir() { printf '%s\\n' "$HOME"; }
load_state() { NODE_NAME=node-one; CONTAINER_NAME=node-one; }
container_exists() { return 0; }
log() { printf '%s\\n' "$*"; }
fail() { exit 1; }
docker() { printf '%s\\n' "$*" >> "$HOME/calls"; }
"""
            q=subprocess.run(['/bin/bash','-c',prefix+module+'\nstop_nodes node-one 0'],
                env={'HOME':root,'PATH':'/usr/bin:/bin'},capture_output=True,text=True)
            self.assertEqual(q.returncode,0,q.stderr)
            self.assertEqual((p/'calls').read_text(),'stop node-one\n')
            self.assertIn('already-failed/non-running node is a no-op',q.stdout)
            self.assertIn('docker update --restart=no node-one',q.stdout)
            self.assertIn('restart policy were kept',q.stdout)


if __name__ == "__main__":
    unittest.main()
