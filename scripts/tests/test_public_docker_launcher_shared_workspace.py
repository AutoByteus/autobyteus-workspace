import os
import shutil
import shlex
import socket
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BASH_LAUNCHER = REPO_ROOT / "scripts/public/docker/autobyteus-docker.sh"
POWERSHELL_LAUNCHER = REPO_ROOT / "scripts/public/docker/autobyteus-docker.ps1"
BASH_MODULE_DIR = REPO_ROOT / "scripts/public/docker/autobyteus-docker.d/bash"
POWERSHELL_MODULE_DIR = REPO_ROOT / "scripts/public/docker/autobyteus-docker.d/powershell"
BASH_LAUNCHER_SOURCES = [
    BASH_LAUNCHER,
    BASH_MODULE_DIR / "core.sh",
    BASH_MODULE_DIR / "docker-runtime.sh",
    BASH_MODULE_DIR / "commands.sh",
]
POWERSHELL_LAUNCHER_SOURCES = [
    POWERSHELL_LAUNCHER,
    POWERSHELL_MODULE_DIR / "Core.ps1",
    POWERSHELL_MODULE_DIR / "DockerRuntime.ps1",
    POWERSHELL_MODULE_DIR / "Commands.ps1",
]
PUBLIC_LAUNCHER_SOURCES = BASH_LAUNCHER_SOURCES + POWERSHELL_LAUNCHER_SOURCES
REMOVED_NODE_PROFILE_ENV = "AUTOBYTEUS" + "_NODE_PROFILE"
REMOVED_PROFILE_LABEL = "com.autobyteus." + "profile"
REMOVED_STATE_FIELD = "PROFILE" + "="
MAX_PUBLIC_LAUNCHER_SOURCE_LINES = 500


class PublicDockerLauncherSharedWorkspaceTest(unittest.TestCase):
    def test_new_container_adds_bind_mounts_without_removing_named_volumes(self) -> None:
        with fake_docker_environment() as env:
            shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])

            result = run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            self.assertIn("Started autobyteus-server-0", result.stdout)
            self.assertIn("/home/autobyteus/workspace", result.stdout)
            self.assertIn("/home/autobyteus/shared", result.stdout)
            run_args = read_last_run_args(env)
            self.assertIn("autobyteus-server-0-workspace:/app/autobyteus-server-ts/workspace", run_args)
            self.assertIn("autobyteus-server-0-data:/home/autobyteus/data", run_args)
            self.assertIn("autobyteus-server-0-root-home:/root", run_args)
            self.assertIn("autobyteus-server-0-chromium-profile:/home/vncuser/.config/chromium", run_args)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace", run_args)
            self.assertIn("--cap-add", run_args)
            self.assertIn("SYS_ADMIN", run_args)
            self.assertIn("--security-opt", run_args)
            self.assertIn("seccomp=unconfined", run_args)
            self.assertTrue(has_unqualified_port_mapping(run_args, "8000"), run_args)
            self.assertTrue(has_unqualified_port_mapping(run_args, "5900"), run_args)
            self.assertTrue(has_unqualified_port_mapping(run_args, "6080"), run_args)
            self.assertTrue(has_unqualified_port_mapping(run_args, "9223"), run_args)
            self.assertFalse(any(arg.startswith(f"{REMOVED_NODE_PROFILE_ENV}=") for arg in run_args), run_args)
            self.assertFalse(any(arg.startswith("127.0.0.1:") for arg in run_args), run_args)
            self.assertFalse(any(arg.startswith(f"{REMOVED_PROFILE_LABEL}=") for arg in run_args), run_args)
            self.assertIn(
                f"type=bind,source={shared_root / 'nodes' / 'autobyteus-server-0'},target=/home/autobyteus/workspace",
                run_args,
            )
            self.assertIn(
                f"type=bind,source={shared_root / 'shared'},target=/home/autobyteus/shared",
                run_args,
            )
            self.assertTrue((shared_root / "nodes" / "autobyteus-server-0").is_dir())
            self.assertTrue((shared_root / "shared").is_dir())

            state_file = Path(env["AUTOBYTEUS_DOCKER_STATE_DIR"]) / "nodes" / "autobyteus-server-0.env"
            state_text = state_file.read_text(encoding="utf-8")
            self.assertIn("IMAGE_REF=autobyteus/test:v1", state_text)
            self.assertRegex(state_text, r"CONFIG_HASH=[0-9a-f]{64}")
            self.assertNotIn(REMOVED_STATE_FIELD, state_text)

    def test_profile_option_is_rejected_as_unknown(self) -> None:
        with fake_docker_environment() as env:
            result = subprocess.run(
                [
                    str(BASH_LAUNCHER),
                    "new-container",
                    "--profile",
                    "standard",
                    "--image",
                    "autobyteus/test",
                    "--tag",
                    "v1",
                ],
                check=False,
                text=True,
                capture_output=True,
                env=env,
            )

            self.assertNotEqual(0, result.returncode)
            self.assertIn("Unknown new-container option(s): --profile standard", result.stderr)
            self.assertFalse((Path(env["FAKE_DOCKER_ROOT"]) / "run-args.nul").exists())

    def test_workspace_paths_and_storage_commands_report_the_launcher_owned_mapping(self) -> None:
        with fake_docker_environment() as env:
            shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])

            paths = run_launcher(env, "workspace", "paths", "--name", "My Node").stdout
            storage = run_launcher(env, "storage", "--name", "My Node").stdout

            self.assertIn(f"Shared workspace host root: {shared_root}", paths)
            self.assertIn(f"Node workspace host path: {shared_root / 'nodes' / 'my-node'}", paths)
            self.assertIn("Node workspace container path: /home/autobyteus/workspace", paths)
            self.assertIn("Shared folder container path: /home/autobyteus/shared", paths)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace", paths)

            self.assertIn("my-node-data -> /home/autobyteus/data", storage)
            self.assertIn("my-node-root-home -> /root", storage)
            self.assertIn("my-node-chromium-profile -> /home/vncuser/.config/chromium", storage)
            self.assertIn("my-node-workspace -> /app/autobyteus-server-ts/workspace", storage)
            self.assertIn(f"{shared_root / 'nodes' / 'my-node'} -> /home/autobyteus/workspace", storage)
            self.assertIn(f"{shared_root / 'shared'} -> /home/autobyteus/shared", storage)
            self.assertIn("workspace apply keeps the named volumes", storage)

    def test_workspace_apply_all_recreates_stale_containers_with_current_bind_mounts(self) -> None:
        with fake_docker_environment() as env:
            original_shared_root = Path(env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"])
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            current_shared_root = original_shared_root.parent / "shared-workspace-current"
            env["AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR"] = str(current_shared_root)
            result = run_launcher(env, "workspace", "apply", "--all")

            self.assertIn("Applying shared workspace bind mounts to autobyteus-server-0", result.stdout)
            self.assertIn("Launcher config changed for autobyteus-server-0", result.stdout)
            run_args = read_last_run_args(env)
            self.assertIn("autobyteus-server-0-data:/home/autobyteus/data", run_args)
            self.assertIn("autobyteus-server-0-chromium-profile:/home/vncuser/.config/chromium", run_args)
            self.assertIn(
                f"type=bind,source={current_shared_root / 'nodes' / 'autobyteus-server-0'},target=/home/autobyteus/workspace",
                run_args,
            )
            self.assertIn(
                f"type=bind,source={current_shared_root / 'shared'},target=/home/autobyteus/shared",
                run_args,
            )
            self.assertTrue((current_shared_root / "nodes" / "autobyteus-server-0").is_dir())
            self.assertTrue((current_shared_root / "shared").is_dir())

    def test_upgrade_all_preserves_each_node_saved_image_ref_by_default(self) -> None:
        with fake_docker_environment() as env:
            create_mixed_image_nodes(env)
            call_count_before_upgrade = len(read_call_records(env))

            result = run_launcher(env, "upgrade", "--all")

            self.assertIn("Checking image autobyteus/test:latest", result.stdout)
            self.assertIn("Checking image autobyteus/test:latest-zh", result.stdout)
            self.assertEqual("autobyteus/test:latest", read_state_image_ref(env, "autobyteus-server-0"))
            self.assertEqual("autobyteus/test:latest-zh", read_state_image_ref(env, "autobyteus-server-1"))
            upgrade_pulls = [
                record
                for record in read_call_records(env)[call_count_before_upgrade:]
                if record[:1] == ["pull"]
            ]
            self.assertEqual(
                [["pull", "autobyteus/test:latest"], ["pull", "autobyteus/test:latest-zh"]],
                upgrade_pulls,
            )

    def test_upgrade_all_with_explicit_tag_retargets_all_nodes(self) -> None:
        with fake_docker_environment() as env:
            create_mixed_image_nodes(env)
            call_count_before_upgrade = len(read_call_records(env))

            result = run_launcher(env, "upgrade", "--all", "--tag", "latest-zh")

            self.assertIn("Checking image autobyteus/autobyteus-server:latest-zh", result.stdout)
            self.assertEqual("autobyteus/autobyteus-server:latest-zh", read_state_image_ref(env, "autobyteus-server-0"))
            self.assertEqual("autobyteus/autobyteus-server:latest-zh", read_state_image_ref(env, "autobyteus-server-1"))
            upgrade_pulls = [
                record
                for record in read_call_records(env)[call_count_before_upgrade:]
                if record[:1] == ["pull"]
            ]
            self.assertEqual(
                [
                    ["pull", "autobyteus/autobyteus-server:latest-zh"],
                    ["pull", "autobyteus/autobyteus-server:latest-zh"],
                ],
                upgrade_pulls,
            )

    def test_upgrade_all_with_explicit_image_retargets_all_nodes(self) -> None:
        with fake_docker_environment() as env:
            create_mixed_image_nodes(env)
            call_count_before_upgrade = len(read_call_records(env))

            result = run_launcher(env, "upgrade", "--all", "--image", "autobyteus/custom-server:latest-zh")

            self.assertIn("Checking image autobyteus/custom-server:latest-zh", result.stdout)
            self.assertEqual("autobyteus/custom-server:latest-zh", read_state_image_ref(env, "autobyteus-server-0"))
            self.assertEqual("autobyteus/custom-server:latest-zh", read_state_image_ref(env, "autobyteus-server-1"))
            upgrade_pulls = [
                record
                for record in read_call_records(env)[call_count_before_upgrade:]
                if record[:1] == ["pull"]
            ]
            self.assertEqual(
                [
                    ["pull", "autobyteus/custom-server:latest-zh"],
                    ["pull", "autobyteus/custom-server:latest-zh"],
                ],
                upgrade_pulls,
            )

    def test_bash_curl_pipe_mode_resolves_modules_from_source_base(self) -> None:
        with fake_docker_environment() as env:
            env["AUTOBYTEUS_DOCKER_PUBLIC_SOURCE_BASE"] = (REPO_ROOT / "scripts/public/docker").resolve().as_uri()

            result = subprocess.run(
                ["bash", "-s", "--", "storage", "--name", "Pipe Node"],
                input=BASH_LAUNCHER.read_text(encoding="utf-8"),
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            self.assertIn("AutoByteus Docker storage: pipe-node", result.stdout)
            self.assertIn("pipe-node-chromium-profile -> /home/vncuser/.config/chromium", result.stdout)

    def test_bash_install_writes_entry_and_modules_for_installed_cli(self) -> None:
        with fake_docker_environment() as env:
            install_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "install bin"
            env["AUTOBYTEUS_DOCKER_INSTALL_DIR"] = str(install_dir)
            env["AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL"] = BASH_LAUNCHER.resolve().as_uri()

            install = subprocess.run(
                [str(BASH_LAUNCHER), "install"],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )
            self.assertIn("Installed AutoByteus Docker launcher", install.stdout)
            self.assertIn(f"Direct path: {shlex.quote(str(install_dir / 'autobyteus-docker'))} new-container", install.stdout)
            self.assertIn(f"export PATH={shlex.quote(str(install_dir))}:\"$PATH\"", install.stdout)

            installed_entry = install_dir / "autobyteus-docker"
            installed_modules = install_dir / "autobyteus-docker.d" / "bash"
            self.assertTrue(installed_entry.is_file())
            for module in ("core.sh", "docker-runtime.sh", "commands.sh"):
                self.assertTrue((installed_modules / module).is_file(), module)

            result = subprocess.run(
                [str(installed_entry), "storage", "--name", "Installed Node"],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )
            self.assertIn("AutoByteus Docker storage: installed-node", result.stdout)
            self.assertIn("installed-node-chromium-profile -> /home/vncuser/.config/chromium", result.stdout)

    def test_bash_install_when_path_missing_updates_profile_and_prints_current_shell_guidance(self) -> None:
        with fake_docker_environment() as env:
            install_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "profile install"
            env["AUTOBYTEUS_DOCKER_INSTALL_DIR"] = str(install_dir)
            env["AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL"] = BASH_LAUNCHER.resolve().as_uri()
            env["SHELL"] = "/bin/bash"

            install = subprocess.run(
                [str(BASH_LAUNCHER), "install"],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            installed_entry = install_dir / "autobyteus-docker"
            profile = Path(env["HOME"]) / ".bashrc"
            profile_text = profile.read_text(encoding="utf-8")
            self.assertTrue(installed_entry.is_file())
            self.assertIn("Install directory is not on this shell's PATH", install.stdout)
            self.assertIn("Updated shell profile with an AutoByteus PATH block", install.stdout)
            self.assertIn(f"Direct path: {shlex.quote(str(installed_entry))} new-container", install.stdout)
            self.assertIn(f"export PATH={shlex.quote(str(install_dir))}:\"$PATH\"", install.stdout)
            self.assertIn("cannot change the PATH of the terminal", install.stdout)
            self.assertNotIn("Persistent PATH setup (copy/paste", install.stdout)
            self.assertEqual(1, profile_text.count("# >>> autobyteus-docker PATH >>>"))
            self.assertIn(f"autobyteus_docker_bin={shlex.quote(str(install_dir))}", profile_text)

    def test_bash_install_path_profile_update_is_idempotent(self) -> None:
        with fake_docker_environment() as env:
            install_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "install-bin"
            env["AUTOBYTEUS_DOCKER_INSTALL_DIR"] = str(install_dir)
            env["AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL"] = BASH_LAUNCHER.resolve().as_uri()
            env["SHELL"] = "/bin/bash"

            subprocess.run([str(BASH_LAUNCHER), "install"], check=True, text=True, capture_output=True, env=env)
            second = subprocess.run([str(BASH_LAUNCHER), "install"], check=True, text=True, capture_output=True, env=env)

            profile_text = (Path(env["HOME"]) / ".bashrc").read_text(encoding="utf-8")
            self.assertIn("Persistent PATH already appears configured", second.stdout)
            self.assertEqual(1, profile_text.count("# >>> autobyteus-docker PATH >>>"))
            self.assertEqual(1, profile_text.count("# <<< autobyteus-docker PATH <<<"))

    def test_bash_install_no_update_path_skips_profile_write(self) -> None:
        with fake_docker_environment() as env:
            install_dir = Path(env["FAKE_DOCKER_ROOT"]).parent / "install bin's"
            env["AUTOBYTEUS_DOCKER_INSTALL_DIR"] = str(install_dir)
            env["AUTOBYTEUS_DOCKER_INSTALL_SOURCE_URL"] = BASH_LAUNCHER.resolve().as_uri()
            env["SHELL"] = "/bin/bash"

            install = subprocess.run(
                [str(BASH_LAUNCHER), "install", "--no-update-path"],
                check=True,
                text=True,
                capture_output=True,
                env=env,
            )

            profile = Path(env["HOME"]) / ".bashrc"
            profile_text = profile.read_text(encoding="utf-8") if profile.exists() else ""
            export_line = f"export PATH={entry_shell_quote(str(install_dir))}:\"$PATH\""
            self.assertIn("Persistent PATH update skipped by request", install.stdout)
            self.assertIn(export_line, install.stdout)
            self.assertIn("Persistent PATH setup (copy/paste for future shells):", install.stdout)
            self.assertIn(f"autobyteus_docker_profile={entry_shell_quote(str(profile))}", install.stdout)
            self.assertIn(f"autobyteus_docker_path_line={entry_shell_quote(export_line)}", install.stdout)
            self.assertIn('grep -qxF "$autobyteus_docker_path_line" "$autobyteus_docker_profile"', install.stdout)
            self.assertIn('source "$autobyteus_docker_profile"', install.stdout)
            self.assertNotIn("# >>> autobyteus-docker PATH >>>", profile_text)

    def test_new_containers_prefer_sequential_friendly_ports(self) -> None:
        with fake_docker_environment() as env:
            for _ in range(3):
                run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            records = read_run_arg_records(env)
            self.assertEqual(3, len(records))
            expected_mappings = [
                ("8001:8000", "5908:5900", "6080:6080", "9228:9223"),
                ("8002:8000", "5909:5900", "6081:6080", "9229:9223"),
                ("8003:8000", "5910:5900", "6082:6080", "9230:9223"),
            ]
            for record, mappings in zip(records, expected_mappings, strict=True):
                for mapping in mappings:
                    self.assertIn(mapping, record)

    def test_preferred_port_collision_falls_back_for_that_service(self) -> None:
        with fake_docker_environment() as env:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as held:
                try:
                    held.bind(("127.0.0.1", 8001))
                except OSError:
                    self.skipTest("port 8001 is not available for collision test setup")
                held.listen(1)

                run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            run_args = read_last_run_args(env)
            state_text = (Path(env["AUTOBYTEUS_DOCKER_STATE_DIR"]) / "nodes" / "autobyteus-server-0.env").read_text(encoding="utf-8")
            self.assertNotIn("8001:8000", run_args)
            self.assertNotEqual("8001", read_state_value(state_text, "BACKEND_PORT"))
            self.assertIn("5908:5900", run_args)
            self.assertIn("6080:6080", run_args)
            self.assertIn("9228:9223", run_args)

    def test_bind_failure_retry_uses_random_ports_after_first_friendly_attempt(self) -> None:
        with fake_docker_environment() as env:
            env["FAKE_DOCKER_FAIL_FIRST_RUN_BIND"] = "1"

            result = run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            records = read_run_arg_records(env)
            self.assertEqual(2, len(records))
            self.assertIn("Port bind failed; retrying with fresh ports", result.stdout)
            for mapping in ("8001:8000", "5908:5900", "6080:6080", "9228:9223"):
                self.assertIn(mapping, records[0])
                self.assertNotIn(mapping, records[1])

    def test_read_only_discovery_commands_default_to_all_nodes(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            for args in (("urls",), ("ports",), ("workspace", "paths"), ("storage",)):
                with self.subTest(args=args):
                    output = run_launcher(env, *args).stdout
                    self.assertIn("autobyteus-server-0", output)
                    self.assertIn("autobyteus-server-1", output)

    def test_read_only_discovery_commands_keep_explicit_single_node_output(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            urls = run_launcher(env, "urls", "autobyteus-server-1").stdout
            paths = run_launcher(env, "workspace", "paths", "--name", "autobyteus-server-1").stdout
            storage = run_launcher(env, "storage", "--name", "autobyteus-server-1").stdout

            for output in (urls, paths, storage):
                self.assertIn("autobyteus-server-1", output)
                self.assertNotIn("autobyteus-server-0", output)

    def test_read_only_discovery_commands_reject_all_with_name(self) -> None:
        with fake_docker_environment() as env:
            for args in (
                ("urls", "--all", "--name", "autobyteus-server-1"),
                ("ports", "--all", "autobyteus-server-1"),
                ("workspace", "paths", "--all", "--name", "autobyteus-server-1"),
                ("storage", "--all", "--name", "autobyteus-server-1"),
            ):
                with self.subTest(args=args):
                    result = subprocess.run(
                        [str(BASH_LAUNCHER), *args],
                        check=False,
                        text=True,
                        capture_output=True,
                        env=env,
                    )
                    self.assertNotEqual(0, result.returncode)
                    self.assertIn("does not accept --all", result.stderr)

    def test_mutating_commands_do_not_default_to_all_nodes(self) -> None:
        with fake_docker_environment() as env:
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")
            run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "v1")

            apply = run_launcher(env, "workspace", "apply")
            self.assertIn("Applying shared workspace bind mounts to autobyteus-server-0", apply.stdout)
            self.assertNotIn("Applying shared workspace bind mounts to autobyteus-server-1", apply.stdout)

            for args in (("upgrade",), ("destroy",)):
                with self.subTest(args=args):
                    result = subprocess.run(
                        [str(BASH_LAUNCHER), *args],
                        check=False,
                        text=True,
                        capture_output=True,
                        env=env,
                    )
                    self.assertNotEqual(0, result.returncode)
                    if args == ("destroy",):
                        self.assertIn("requires exactly one of --all or --name", result.stderr)
                    else:
                        self.assertIn("rerun with --all", result.stderr)

    def test_powershell_launcher_matches_the_shared_workspace_cli_contract(self) -> None:
        bash_text = read_combined_text(BASH_LAUNCHER_SOURCES)
        powershell_text = read_combined_text(POWERSHELL_LAUNCHER_SOURCES)

        for text in (bash_text, powershell_text):
            self.assertIn("v6", text)
            self.assertNotIn(REMOVED_NODE_PROFILE_ENV, text)
            self.assertNotIn(REMOVED_PROFILE_LABEL, text)
            self.assertIn("saved image refs", text)
            self.assertIn("chromium_profile_volume", text)
            self.assertIn("chromium_profile_target", text)
            self.assertIn("-chromium-profile", text)
            self.assertIn("/home/vncuser/.config/chromium", text)
            self.assertIn("/home/autobyteus/workspace", text)
            self.assertIn("/home/autobyteus/shared", text)
            self.assertIn("AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR", text)
            self.assertIn("AUTOBYTEUS_DOCKER_MODULE_SOURCE_BASE", text)
            self.assertIn("AUTOBYTEUS_TEMP_WORKSPACE_DIR", text)
            self.assertIn("workspace paths", text)
            self.assertIn("workspace apply", text)
            self.assertIn("storage", text)
            self.assertIn("type=bind,source=", text)
        self.assertIn("image_ref_override_explicit", bash_text)
        self.assertIn("upgrade_image_ref_for_node", bash_text)
        self.assertIn("imageRefOverrideExplicit", powershell_text)
        self.assertIn("Get-UpgradeImageRefForNode", powershell_text)

    def test_public_launcher_source_files_stay_within_reviewable_size_guard(self) -> None:
        for path in PUBLIC_LAUNCHER_SOURCES:
            with self.subTest(path=path.relative_to(REPO_ROOT)):
                effective_lines = sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())
                self.assertLessEqual(effective_lines, MAX_PUBLIC_LAUNCHER_SOURCE_LINES)

    def test_powershell_launcher_parses_when_pwsh_is_available(self) -> None:
        if not shutil.which("pwsh"):
            self.skipTest("pwsh is not installed")
        paths_literal = "@(" + ",".join(f"'{path}'" for path in POWERSHELL_LAUNCHER_SOURCES) + ")"
        subprocess.run(
            [
                "pwsh",
                "-NoLogo",
                "-NoProfile",
                "-Command",
                f"$paths={paths_literal}; foreach ($path in $paths) {{ $null=[scriptblock]::Create((Get-Content -Raw $path)) }}",
            ],
            check=True,
            text=True,
            capture_output=True,
        )


def read_state_value(state_text: str, key: str) -> str:
    prefix = f"{key}="
    for line in state_text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):]
    raise AssertionError(f"state key not found: {key}")


def create_mixed_image_nodes(env: dict[str, str]) -> None:
    run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "latest")
    run_launcher(env, "new-container", "--image", "autobyteus/test", "--tag", "latest-zh")


def read_state_image_ref(env: dict[str, str], node_name: str) -> str:
    state_file = Path(env["AUTOBYTEUS_DOCKER_STATE_DIR"]) / "nodes" / f"{node_name}.env"
    return read_state_value(state_file.read_text(encoding="utf-8"), "IMAGE_REF")


def read_combined_text(paths: list[Path]) -> str:
    return "\n".join(path.read_text(encoding="utf-8") for path in paths)


def has_unqualified_port_mapping(args: list[str], container_port: str) -> bool:
    suffix = f":{container_port}"
    return any(arg.endswith(suffix) and not arg.startswith("127.0.0.1:") for arg in args)


def entry_shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\\''") + "'"


def run_launcher(env: dict[str, str], *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(BASH_LAUNCHER), *args],
        check=True,
        text=True,
        capture_output=True,
        env=env,
    )


def read_last_run_args(env: dict[str, str]) -> list[str]:
    records = read_run_arg_records(env)
    if not records:
        raise AssertionError("fake docker did not record a docker run invocation")
    return records[-1]


def read_run_arg_records(env: dict[str, str]) -> list[list[str]]:
    run_args_path = Path(env["FAKE_DOCKER_ROOT"]) / "run-args.nul"
    payload = run_args_path.read_bytes()
    records = [record for record in payload.split(b"\n--RUN--\n") if record]
    return [[arg.decode("utf-8") for arg in record.split(b"\0") if arg] for record in records]


def read_call_records(env: dict[str, str]) -> list[list[str]]:
    calls_path = Path(env["FAKE_DOCKER_ROOT"]) / "calls.nul"
    payload = calls_path.read_bytes()
    records = [record for record in payload.split(b"\n--CALL--\n") if record]
    return [[arg.decode("utf-8") for arg in record.split(b"\0") if arg] for record in records]


class fake_docker_environment:
    def __enter__(self) -> dict[str, str]:
        self._tmp = tempfile.TemporaryDirectory(prefix="autobyteus-launcher-test-")
        root = Path(self._tmp.name)
        self.fake_root = root / "fake-docker"
        fake_bin = root / "bin"
        home = root / "home"
        state_root = root / "state"
        shared_root = root / "shared workspace"
        self.fake_root.mkdir()
        fake_bin.mkdir()
        home.mkdir()
        write_fake_docker(fake_bin / "docker")
        env = os.environ.copy()
        env.update(
            {
                "PATH": f"{fake_bin}{os.pathsep}{env.get('PATH', '')}",
                "FAKE_DOCKER_ROOT": str(self.fake_root),
                "HOME": str(home),
                "SHELL": "/bin/bash",
                "AUTOBYTEUS_DOCKER_STATE_DIR": str(state_root),
                "AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR": str(shared_root),
            }
        )
        return env

    def __exit__(self, exc_type, exc, tb) -> None:
        self._tmp.cleanup()


def write_fake_docker(path: Path) -> None:
    path.write_text(
        r"""#!/usr/bin/env bash
set -euo pipefail
root="${FAKE_DOCKER_ROOT:?}"
mkdir -p "$root/containers"

record_call() { printf '%s\0' "$@" >> "$root/calls.nul"; printf '\n--CALL--\n' >> "$root/calls.nul"; }
container_file() { printf '%s/containers/%s\n' "$root" "$1"; }
read_meta() {
  local file
  file="$(container_file "$1")"
  [[ -f "$file" ]] || return 1
  # shellcheck disable=SC1090
  source "$file"
}

record_call "$@"

case "${1:-}" in
  info)
    exit 0
    ;;
  pull)
    printf 'pulled %s\n' "${2:-}"
    exit 0
    ;;
  image)
    if [[ "${2:-}" == "inspect" ]]; then
      printf 'sha256:fake-image\n'
      exit 0
    fi
    ;;
  container)
    if [[ "${2:-}" == "inspect" ]]; then
      [[ -f "$(container_file "${3:-}")" ]]
      exit $?
    fi
    ;;
  ps)
    filters=()
    shift
    while [[ $# -gt 0 ]]; do
      case "$1" in
        -a) shift ;;
        --filter) filters+=("${2:-}"); shift 2 ;;
        --format) shift 2 ;;
        *) shift ;;
      esac
    done
    shopt -s nullglob
    for file in "$root"/containers/*; do
      name="$(basename "$file")"
      read_meta "$name" || continue
      include=1
      for filter in "${filters[@]}"; do
        case "$filter" in
          label=com.autobyteus.launcher=server-docker) ;;
          label=com.autobyteus.nodeName=*)
            expected="${filter#label=com.autobyteus.nodeName=}"
            [[ "${node_name:-$name}" == "$expected" ]] || include=0
            ;;
          label=*) ;;
        esac
      done
      [[ "$include" == "1" ]] && printf '%s\n' "$name"
    done
    exit 0
    ;;
  inspect)
    fmt=""
    name=""
    shift
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --format) fmt="$2"; shift 2 ;;
        *) name="$1"; shift ;;
      esac
    done
    read_meta "$name" || exit 1
    case "$fmt" in
      *'.Image'*) printf 'sha256:fake-image\n' ;;
      *'.State.Running'*) printf 'true\n' ;;
      *'.State.Status'*) printf 'running\n' ;;
      *'.State.ExitCode'*) printf '0\n' ;;
      *'.State.Error'*) printf '\n' ;;
      *'.Config.Labels'*'com.autobyteus.launcher'*) printf 'server-docker\n' ;;
      *'.Config.Labels'*'com.autobyteus.nodeName'*) printf '%s\n' "${node_name:-$name}" ;;
      *'.Config.Labels'*'com.autobyteus.configHash'*) printf '%s\n' "${config_hash:-}" ;;
      *'{{json .State}}'*) printf '{"Running":true,"Status":"running","ExitCode":0,"Error":""}\n' ;;
      *) printf '\n' ;;
    esac
    exit 0
    ;;
  run)
    printf '%s\0' "$@" >> "$root/run-args.nul"
    printf '\n--RUN--\n' >> "$root/run-args.nul"
    if [[ "${FAKE_DOCKER_FAIL_FIRST_RUN_BIND:-}" == "1" && ! -f "$root/run-bind-failed-once" ]]; then
      touch "$root/run-bind-failed-once"
      printf 'Error response from daemon: Ports are not available: bind: address already in use\n' >&2
      exit 1
    fi
    name=""
    node_name=""
    config_hash=""
    prev=""
    for arg in "$@"; do
      if [[ "$prev" == "--name" ]]; then name="$arg"; prev=""; continue; fi
      if [[ "$prev" == "--label" ]]; then
        case "$arg" in
          com.autobyteus.nodeName=*) node_name="${arg#*=}" ;;
          com.autobyteus.configHash=*) config_hash="${arg#*=}" ;;
        esac
        prev=""
        continue
      fi
      case "$arg" in
        --name|--label) prev="$arg" ;;
      esac
    done
    [[ -n "$name" ]] || name="unnamed"
    {
      printf 'node_name=%q\n' "${node_name:-$name}"
      printf 'config_hash=%q\n' "$config_hash"
    } > "$(container_file "$name")"
    printf 'fake-container-id\n'
    exit 0
    ;;
  rm)
    shift
    for arg in "$@"; do
      [[ "$arg" == "-f" ]] && continue
      rm -f "$(container_file "$arg")"
    done
    exit 0
    ;;
  start|stop)
    printf '%s\n' "${2:-}"
    exit 0
    ;;
  logs)
    printf 'fake logs\n'
    exit 0
    ;;
esac

printf 'unsupported fake docker command: %s\n' "$*" >&2
exit 1
""",
        encoding="utf-8",
    )
    path.chmod(0o755)


if __name__ == "__main__":
    unittest.main()
