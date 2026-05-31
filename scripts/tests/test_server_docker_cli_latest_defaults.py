import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DOCKERFILE = REPO_ROOT / "autobyteus-server-ts" / "docker" / "Dockerfile.monorepo"
BUILD_SCRIPT = REPO_ROOT / "autobyteus-server-ts" / "docker" / "build.sh"
MULTI_ARCH_BUILD_SCRIPT = REPO_ROOT / "autobyteus-server-ts" / "docker" / "build-multi-arch.sh"
RELEASE_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "release-server-docker.yml"


class ServerDockerCliLatestDefaultsTest(unittest.TestCase):
    def test_dockerfile_defaults_cli_versions_to_npm_latest(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")

        self.assertRegex(dockerfile, r"(?m)^ARG CODEX_CLI_VERSION=latest$")
        self.assertRegex(dockerfile, r"(?m)^ARG CLAUDE_CODE_VERSION=latest$")
        self.assertNotRegex(dockerfile, r"(?m)^ARG CODEX_CLI_VERSION=\d")
        self.assertNotRegex(dockerfile, r"(?m)^ARG CLAUDE_CODE_VERSION=\d")

    def test_dockerfile_keeps_explicit_version_override_path(self) -> None:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")

        self.assertIn('\"@openai/codex@${CODEX_CLI_VERSION}\"', dockerfile)
        self.assertIn('\"@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}\"', dockerfile)
        self.assertRegex(dockerfile, r"(?m)^ARG CLI_INSTALL_CACHE_BUSTER=0$")
        self.assertIn("CLI install cache buster: ${CLI_INSTALL_CACHE_BUSTER}", dockerfile)

    def test_scripted_and_release_builds_bust_cli_install_cache(self) -> None:
        for path in (BUILD_SCRIPT, MULTI_ARCH_BUILD_SCRIPT):
            script = path.read_text(encoding="utf-8")
            self.assertIn('CLI_INSTALL_CACHE_BUSTER="${CLI_INSTALL_CACHE_BUSTER:-$(date -u +%Y%m%d%H%M%S)}"', script)
            self.assertIn('"--build-arg" "CLI_INSTALL_CACHE_BUSTER=${CLI_INSTALL_CACHE_BUSTER}"', script)

        workflow = RELEASE_WORKFLOW.read_text(encoding="utf-8")
        self.assertEqual(
            2,
            len(re.findall(r"CLI_INSTALL_CACHE_BUSTER=\$\{\{ github\.run_id \}\}", workflow)),
            "Both default and zh release builds must bust the CLI install layer cache.",
        )


if __name__ == "__main__":
    unittest.main()
