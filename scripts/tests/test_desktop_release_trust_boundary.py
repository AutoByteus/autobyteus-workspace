"""Release, beta and prepare refuse an unofficial origin, including with --no-push.

Requires Git, Bash, Python and Node. No GitHub access or keys needed. Run with
python3 -m unittest discover -s scripts/tests -p test_desktop_release_trust_boundary.py
"""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class ReleaseTrustBoundary(unittest.TestCase):
    def test_untrusted_origin_refuses_before_mutation(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            repo, remote = base / "work", base / "origin.git"
            env = {
                "PATH": os.environ["PATH"], "HOME": temp, "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_CONFIG_GLOBAL": os.devnull, "GIT_ALLOW_PROTOCOL": "file",
                "GIT_TERMINAL_PROMPT": "0", "PYTHONDONTWRITEBYTECODE": "1",
            }

            def run(directory, *args, check=True):
                return subprocess.run(args, cwd=directory, env=env, capture_output=True,
                                      text=True, check=check, timeout=30)

            run(base, "git", "init", "-q", "--bare", str(remote))
            run(base, "git", "init", "-qb", "personal", str(repo))
            run(repo, "git", "remote", "add", "origin", str(remote))
            for script in ("desktop-release.sh", "release_versions.py",
                           "desktop-package/check-release-trust.mjs",
                           "desktop-package/desktop-trust-state.mjs",
                           "desktop-package/release-record.mjs"):
                dest = repo / "scripts" / script
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / "scripts" / script, dest)

            for file, contents in {
                "autobyteus-web/package.json": '{"version":"1.2.3"}',
                ".github/release-notes/release-notes.md": "original",
                "new-notes.md": "candidate",
                "autobyteus-server-ts/src/app-data-migrations/released-migration-order.json": "[]",
            }.items():
                path = repo / file
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(contents + "\n", encoding="utf8")
            run(repo, "git", "add", ".")
            run(repo, "git", "-c", "user.name=QA", "-c", "user.email=qa@example.test",
                "commit", "-qm", "baseline")

            def snapshot():
                return ((repo / ".git" / "FETCH_HEAD").exists(),
                        run(repo, "git", "symbolic-ref", "HEAD").stdout,
                        run(repo, "git", "status", "--porcelain", "-uall").stdout,
                        run(repo, "git", "for-each-ref").stdout,
                        run(remote, "git", "for-each-ref").stdout)

            initial = snapshot()
            for command in ("release", "prepare", "beta"):
                for flags in ([], ["--no-push"]):
                    with self.subTest(command=command, flags=flags):
                        args = [] if command == "beta" else ["1.2.4", "--release-notes", "new-notes.md"]
                        out = run(repo, "bash", "scripts/desktop-release.sh", command,
                                  *args, *flags, check=False)
                        self.assertEqual(out.returncode, 1, out.stderr)
                        self.assertIn("Verify the official origin fetch/push destinations.", out.stderr)
                        self.assertIn("before retrying", out.stderr)
                        self.assertEqual(snapshot(), initial)
