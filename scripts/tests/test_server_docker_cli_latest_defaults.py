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

    def cli_install_layer(self) -> str:
        dockerfile = DOCKERFILE.read_text(encoding="utf-8")
        return next(
            instruction
            for instruction in dockerfile.replace("\\\n", " ").splitlines()
            if instruction.startswith('RUN echo "CLI install cache buster:')
        )

    def test_new_clis_use_official_latest_in_the_cache_busted_layer(self) -> None:
        layer = self.cli_install_layer()
        self.assertIn('npm install -g --include=optional --ignore-scripts=false "@xai-official/grok@latest"', layer)
        self.assertIn('curl -fsSL https://antigravity.google/cli/install.sh -o ', layer)
        self.assertIn('bash "${cli_scratch}/agy-install.sh" --dir "${cli_scratch}/agy-bin"', layer)
        self.assertNotIn("| bash", layer)

    def test_installers_use_disposable_state_and_publish_outside_home(self) -> None:
        layer = self.cli_install_layer()
        self.assertIn('cli_scratch="$(mktemp -d)"', layer)
        self.assertIn('GROK_HOME="${cli_scratch}/grok" npm install', layer)
        self.assertIn('HOME="${cli_scratch}/home" bash', layer)
        self.assertLess(layer.index('test -x "${cli_scratch}/agy-bin/agy"'), layer.index('install -m 0755'))
        self.assertLess(layer.index('agy_version='), layer.index('install -m 0755'))
        self.assertIn('install -m 0755 "${cli_scratch}/agy-bin/agy" /usr/local/bin/agy', layer)
        self.assertIn('rm -rf "$cli_scratch"', layer)
        self.assertIn('rm -rf "$probe_home"', layer)
        self.assertNotRegex(DOCKERFILE.read_text(), r"(?m)^(?:ENV|ARG) GROK_HOME")
        self.assertNotIn("rm -rf /root", layer)

    def test_cleaned_install_must_resolve_native_grok_not_home_fallback(self) -> None:
        layer = self.cli_install_layer()
        self.assertLess(layer.index('rm -rf "$cli_scratch"'), layer.index('grok_native='))
        self.assertIn('readlink -f "$(command -v grok)"', layer)
        self.assertIn('test "$grok_native" = "$(npm root -g)/@xai-official/grok/bin/grok-native"', layer)
        self.assertIn('test -x "$grok_native"', layer)
        self.assertIn('od -An -tx1 -N4 "$grok_native"', layer)
        self.assertIn("= '7f454c46'", layer)  # ELF magic, not the JS bootstrap.
        self.assertIn('test "$(command -v agy)" = /usr/local/bin/agy', layer)

    def test_final_probes_require_successful_meaningful_versions_in_empty_home(self) -> None:
        layer = self.cli_install_layer()
        self.assertLess(layer.index('rm -rf "$cli_scratch"'), layer.index('probe_home='))
        self.assertIn('probe_home="$(mktemp -d)"', layer)
        for cli in ("agy", "grok"):
            self.assertIn(f'{cli}_version="$(HOME="$probe_home" timeout 30s {cli} --version)"', layer)
            self.assertIn(f"printf '%s\\n' \"${cli}_version\" | grep -E '[0-9]+\\.[0-9]+\\.[0-9]+'", layer)
            self.assertIn(f"Installed {cli}:", layer)
        self.assertNotIn("|| true", layer)

    def test_no_runtime_installer_or_home_override_is_added(self) -> None:
        for name in ("entrypoint.sh", "bootstrap.sh", "supervisor-autobyteus-server.conf"):
            content = (DOCKERFILE.parent / name).read_text(encoding="utf-8")
            self.assertNotIn("@xai-official/grok", content)
            self.assertNotIn("antigravity.google/cli/install.sh", content)
            self.assertNotIn("GROK_HOME", content)

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
