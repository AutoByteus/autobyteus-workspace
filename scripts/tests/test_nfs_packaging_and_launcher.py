"""Implementation unit fixtures only: no downloads, sudo, mounts or real Docker.
Run: python3 -m unittest scripts/tests/test_nfs_packaging_and_launcher.py -v
The shell fixture substitutes only its fixed reference-directory constant so it
never writes /etc; CLI and Docker replies are test doubles, not live integration.
"""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / 'scripts/public/docker/autobyteus-docker.d/bash/nfs-attachment.sh'


class NfsPackagingAndLauncherTest(unittest.TestCase):
    def test_unpublished_installer_fails_before_download(self):
        result = subprocess.run(['/bin/bash', str(ROOT / 'scripts/public/nfs/install.sh')],
                                capture_output=True, text=True, env={'PATH':'/usr/bin:/bin'})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('No qualified versioned release', result.stderr)

    def test_unqualified_release_cannot_publish(self):
        result = subprocess.run(['python3', str(ROOT / 'autobyteus-nfs/packaging/release.py'), '--check-publish'],
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('No qualified release targets', result.stderr)

    def test_shell_selected_attachment_arguments_and_wrong_daemon_refusal(self):
        with tempfile.TemporaryDirectory(prefix='nfs-launcher-unit-') as root:
            home=Path(root); (home/'.local/bin').mkdir(parents=True)
            refs=home/'refs'; refs.mkdir(); (refs/'node-one.json').write_text('{}')
            fields=['5544dadc-86b0-43ba-9799-74728b442227','/Volumes/autobyteus-shared',
                    'autobyteus-nfs-5544dadc-86b0-43ba-9799-74728b442227','/etc/autobyteus-nfs',
                    'daemon-fixture',':/autobyteus/5544dadc-86b0-43ba-9799-74728b442227',
                    'addr=192.168.1.10,rw,hard,tcp,vers=4.1,actimeo=1,timeo=50,retrans=2,nosharecache']
            helper=home/'.local/bin/autobyteus-nfs'
            helper.write_text('#!/bin/bash\nprintf "%s\\n" '+ ' '.join("'"+x+"'" for x in fields)+'\n');helper.chmod(0o755)
            module=MODULE.read_text().replace('ref="/etc/autobyteus-nfs/nodes/${node}.json"',f'ref="{refs}/${{node}}.json"')
            volume='local|'+fields[0]+'|nfs|'+fields[5]+'|'+fields[6]
            prefix='''set -euo pipefail
fail() { printf '%s\\n' "$*" >&2; exit 1; }
container_for_node() { :; }
docker() { if [[ "$1" == info ]]; then printf '%s\\n' "$DAEMON"; else printf '%s\\n' "$VOLUME"; fi; }
'''
            commands='\nresolve_nfs_attachment node-one\nrun_args=()\nappend_nfs_run_args\nprintf "%s\\n" "${run_args[@]}"\n'
            env={'PATH':'/usr/bin:/bin','HOME':root,'DAEMON':'daemon-fixture','VOLUME':volume}
            result=subprocess.run(['/bin/bash','-c',prefix+module+commands],env=env,text=True,capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertIn('volume-nocopy',result.stdout);self.assertIn('target=/etc/autobyteus-nfs,readonly',result.stdout)
            self.assertNotIn('/root',result.stdout)
            env['DAEMON']='other-daemon'
            result=subprocess.run(['/bin/bash','-c',prefix+module+commands],env=env,text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0);self.assertIn('not the selected NFS daemon',result.stderr)

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

    def test_nfs_workflow_build_only_never_pushes_or_publishes(self):
        content=(ROOT/'.github/workflows/release-nfs.yml').read_text()
        self.assertIn('default: false',content)
        self.assertIn("push: ${{ needs.prepare.outputs.publish == 'true' }}",content)
        self.assertIn("if: needs.prepare.outputs.publish == 'true'",content)
        self.assertIn('--check-publish',content)
        self.assertNotIn('gh release create',content)


if __name__=='__main__':
    unittest.main()
