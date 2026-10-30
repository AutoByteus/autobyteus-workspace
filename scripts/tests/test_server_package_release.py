"""Signed server package release: the scripts in scripts/server-package/ and the package job of
the Server Docker Release workflow.

Run from the repository root with:
python3 -m unittest scripts/tests/test_server_package_release.py -v
Needs Node 22 and bash. No Docker daemon, network, GitHub access or real signing key: the
workflow's package steps run with fake `docker` and `gh`, against a fixture package and a
throwaway Ed25519 key pair made by the test. On a host without GNU tar, a `tar` shim drops the
GNU-only ordering and ownership flags; everything else in the steps runs as CI runs it.
"""

import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_release_channel_workflow_steps import extract_step, run_bash, substitute_expressions  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = REPO_ROOT / "scripts" / "server-package"
DOCKER_DIR = REPO_ROOT / "autobyteus-server-ts" / "docker"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "release-server-docker.yml"
NODE = shutil.which("node") or "node"
ARCH = subprocess.run([NODE, "-p", "process.arch"], capture_output=True, text=True, check=True).stdout.strip()
ABI = subprocess.run([NODE, "-p", "process.versions.modules"], capture_output=True, text=True, check=True).stdout.strip()


def node(script: str, *args: str, env=None, cwd=None) -> subprocess.CompletedProcess:
    return subprocess.run([NODE, str(SCRIPTS / script), *args], capture_output=True, text=True,
                          env=env, cwd=cwd, check=False)


def key_pair(directory: Path, name: str):
    """A throwaway Ed25519 pair: (private PEM text, public key file)."""
    program = ("const {generateKeyPairSync}=require('crypto');const k=generateKeyPairSync('ed25519');"
               "console.log(JSON.stringify({priv:k.privateKey.export({type:'pkcs8',format:'pem'}),"
               "pub:k.publicKey.export({type:'spki',format:'pem'})}))")
    pair = json.loads(subprocess.run([NODE, "-e", program], capture_output=True, text=True, check=True).stdout)
    public_key = directory / f"{name}.pem"
    public_key.write_text(pair["pub"], encoding="utf-8")
    return pair["priv"], public_key


def verify(public_key: Path, data: Path, signature: Path) -> bool:
    program = ("const c=require('crypto'),f=require('fs');const [k,d,s]=process.argv.slice(1);"
               "console.log(c.verify(null,f.readFileSync(d),c.createPublicKey(f.readFileSync(k)),"
               "Buffer.from(f.readFileSync(s,'utf8'),'base64')))")
    out = subprocess.run([NODE, "-e", program, str(public_key), str(data), str(signature)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return out == "true"


def make_package(root: Path) -> Path:
    """A fixture server package folder with Prisma and app-data migration folders."""
    package = root / "server-package"
    for folder in ("prisma/migrations/20260203074245_init", "prisma/migrations/20260310153000_add_x",
                   "dist/app-data-migrations/migrations/project-task-titles", "node_modules/.pnpm/a"):
        (package / folder).mkdir(parents=True)
    (package / "prisma/migrations/migration_lock.toml").write_text('provider = "sqlite"\n', encoding="utf-8")
    (package / "dist/app.js").write_text("console.log('server')\n", encoding="utf-8")
    (package / "package.json").write_text('{"name":"autobyteus-server-ts"}\n', encoding="utf-8")
    (package / "node_modules/.pnpm/a/index.js").write_text("module.exports = 1\n", encoding="utf-8")
    os.symlink(".pnpm/a", package / "node_modules/a")
    return package


class DescribeServerPackageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-describe-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.package = make_package(self.tmp)
        self.level_file = self.tmp / "system-level.json"
        self.level_file.write_text('{"level": 3}\n', encoding="utf-8")

    def write_package_json(self, version: str) -> subprocess.CompletedProcess:
        return node("describe-server-package.mjs", "package-json", "--package-dir", str(self.package),
                    "--version", version, "--system-level-file", str(self.level_file))

    def test_package_json_records_this_build_and_its_migration_folders(self) -> None:
        result = self.write_package_json("1.5.12-beta.1")
        self.assertEqual(0, result.returncode, result.stderr)
        written = json.loads((self.package / "server-package.json").read_text(encoding="utf-8"))
        self.assertEqual({
            "version": "1.5.12-beta.1",
            "arch": ARCH,
            "nodeModuleVersion": ABI,
            "systemLevel": 3,
            "dataMigrations": ["app-data/project-task-titles", "prisma/20260203074245_init", "prisma/20260310153000_add_x"],
        }, written)
        self.assertEqual(list(written), ["version", "arch", "nodeModuleVersion", "systemLevel", "dataMigrations"])

    def test_package_json_refuses_versions_nodes_cannot_order(self) -> None:
        for version in ("1.5.12-rc1", "v1.5.12", "1.05.12", "1.5.12-beta.0", ""):
            with self.subTest(version=version):
                result = self.write_package_json(version)
                self.assertNotEqual(0, result.returncode)
                self.assertFalse((self.package / "server-package.json").exists())

    def test_package_json_refuses_a_package_without_its_migration_folders(self) -> None:
        shutil.rmtree(self.package / "dist" / "app-data-migrations")
        result = self.write_package_json("1.5.12")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("app-data-migrations/migrations is missing", result.stderr)

    def test_package_json_refuses_a_link_that_points_outside_the_package(self) -> None:
        os.symlink("../../../workspace/autobyteus-server-ts", self.package / "node_modules/.pnpm/self")
        result = self.write_package_json("1.5.12")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("links point outside it: node_modules/.pnpm/self", result.stderr)
        self.assertFalse((self.package / "server-package.json").exists())

    def describe(self, archive: Path, version: str) -> subprocess.CompletedProcess:
        return node("describe-server-package.mjs", "description", "--package-dir", str(self.package),
                    "--archive", str(archive), "--version", version, "--out", str(self.tmp / "description.json"))

    def test_description_is_the_package_json_plus_its_archive(self) -> None:
        self.assertEqual(0, self.write_package_json("1.5.12").returncode)
        archive = self.tmp / f"autobyteus-server-1.5.12-linux-{ARCH}.tar.gz"
        archive.write_bytes(b"archive bytes")
        result = self.describe(archive, "1.5.12")
        self.assertEqual(0, result.returncode, result.stderr)
        description = json.loads((self.tmp / "description.json").read_text(encoding="utf-8"))
        package_json = json.loads((self.package / "server-package.json").read_text(encoding="utf-8"))
        archive_info = description.pop("archive")
        self.assertEqual(package_json, description)
        self.assertEqual({
            "name": archive.name,
            "sha256": hashlib.sha256(b"archive bytes").hexdigest(),
            "size": len(b"archive bytes"),
            # Regular files only: app.js, package.json, index.js, lock file and server-package.json.
            "unpackedSize": sum(p.lstat().st_size for p in self.package.rglob("*") if p.is_file() and not p.is_symlink()),
        }, archive_info)

    def test_description_refuses_another_version_or_archive_name(self) -> None:
        self.assertEqual(0, self.write_package_json("1.5.12").returncode)
        right = self.tmp / f"autobyteus-server-1.5.12-linux-{ARCH}.tar.gz"
        right.write_bytes(b"x")
        wrong_name = self.tmp / "autobyteus-server-1.5.12-linux-other.tar.gz"
        wrong_name.write_bytes(b"x")
        result = self.describe(right, "1.5.13")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("the package is version 1.5.12, not 1.5.13", result.stderr)
        result = self.describe(wrong_name, "1.5.12")
        self.assertNotEqual(0, result.returncode)
        self.assertIn(f"must be named autobyteus-server-1.5.12-linux-{ARCH}.tar.gz", result.stderr)
        self.assertFalse((self.tmp / "description.json").exists())


class SignServerPackageTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-sign-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.private_key, self.public_key = key_pair(self.tmp, "release")
        self.description = self.tmp / "autobyteus-server-1.5.12-linux-arm64.json"
        self.description.write_text('{"version": "1.5.12"}\n', encoding="utf-8")

    def sign(self, secret, public_key=None) -> subprocess.CompletedProcess:
        env = {"PATH": os.environ["PATH"]}
        if secret is not None:
            env["SERVER_PACKAGE_SIGNING_KEY"] = secret
        return node("sign-server-package.mjs", "--description", str(self.description),
                    "--public-key", str(public_key or self.public_key), env=env)

    def assert_no_key_material(self, result: subprocess.CompletedProcess) -> None:
        output = result.stdout + result.stderr
        self.assertNotIn("PRIVATE KEY", output)
        for line in self.private_key.splitlines()[1:-1]:
            self.assertNotIn(line, output)

    def test_signature_is_base64_over_the_exact_description_bytes(self) -> None:
        result = self.sign(self.private_key)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assert_no_key_material(result)
        signature = Path(f"{self.description}.sig")
        self.assertRegex(signature.read_text(encoding="utf-8"), r"^[A-Za-z0-9+/]{86}==$")
        self.assertTrue(verify(self.public_key, self.description, signature))
        self.description.write_text('{"version": "1.5.13"}\n', encoding="utf-8")
        self.assertFalse(verify(self.public_key, self.description, signature))

    def test_refuses_without_a_usable_matching_secret(self) -> None:
        _, other_public_key = key_pair(self.tmp, "other")
        rsa_key = subprocess.run([NODE, "-e", "console.log(require('crypto').generateKeyPairSync('rsa',{modulusLength:1024})"
                                  ".privateKey.export({type:'pkcs8',format:'pem'}))"],
                                 capture_output=True, text=True, check=True).stdout
        cases = {
            "missing": (None, None, "SERVER_PACKAGE_SIGNING_KEY is not set"),
            "unreadable": ("not a key", None, "is not a readable private key"),
            "not ed25519": (rsa_key, None, "is not an Ed25519 key"),
            "another key": (self.private_key, other_public_key, "does not match the public key"),
        }
        for name, (secret, public_key, message) in cases.items():
            with self.subTest(case=name):
                result = self.sign(secret, public_key)
                self.assertNotEqual(0, result.returncode)
                self.assertIn(message, result.stderr)
                self.assert_no_key_material(result)
                self.assertFalse(Path(f"{self.description}.sig").exists())


class GenerateSigningKeyTest(unittest.TestCase):
    """Runs a copy of the script in a temporary tree, with a fake `gh` that keeps what it receives."""

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-keygen-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.tree = self.tmp / "tree"
        (self.tree / "scripts" / "server-package").mkdir(parents=True)
        (self.tree / "autobyteus-server-ts" / "docker").mkdir(parents=True)
        shutil.copy(SCRIPTS / "generate-signing-key.mjs", self.tree / "scripts" / "server-package")
        self.public_key = self.tree / "autobyteus-server-ts" / "docker" / "server-package-signing-key.pem"
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.received = self.tmp / "gh-stdin"
        write_executable(bin_dir / "gh", f"""#!/usr/bin/env bash
echo "$*" > "{self.tmp}/gh-args"
cat > "{self.received}"
exit "${{FAKE_GH_STATUS:-0}}"
""")
        self.env = {"PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}

    def generate(self, *args: str, gh_status: str = "0") -> subprocess.CompletedProcess:
        return subprocess.run([NODE, str(self.tree / "scripts" / "server-package" / "generate-signing-key.mjs"), *args],
                              capture_output=True, text=True, env={**self.env, "FAKE_GH_STATUS": gh_status}, check=False)

    def test_sets_the_secret_from_stdin_and_writes_the_matching_public_key(self) -> None:
        result = self.generate()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertNotIn("PRIVATE KEY", result.stdout + result.stderr)
        self.assertEqual("secret set SERVER_PACKAGE_SIGNING_KEY --repo AutoByteus/autobyteus-workspace",
                         (self.tmp / "gh-args").read_text(encoding="utf-8").strip())
        private_key = self.received.read_text(encoding="utf-8")
        self.assertTrue(private_key.startswith("-----BEGIN PRIVATE KEY-----"))
        description = self.tmp / "description.json"
        description.write_text("{}\n", encoding="utf-8")
        signed = node("sign-server-package.mjs", "--description", str(description), "--public-key", str(self.public_key),
                      env={"PATH": os.environ["PATH"], "SERVER_PACKAGE_SIGNING_KEY": private_key})
        self.assertEqual(0, signed.returncode, signed.stderr)

    def test_keeps_an_existing_key_unless_replacing_and_writes_nothing_when_gh_fails(self) -> None:
        self.public_key.write_text("existing\n", encoding="utf-8")
        result = self.generate()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("pass --replace", result.stderr)
        self.assertFalse(self.received.exists())
        result = self.generate("--replace", gh_status="1")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("the public key was not written", result.stderr)
        self.assertEqual("existing\n", self.public_key.read_text(encoding="utf-8"))
        self.assertEqual(0, self.generate("--replace").returncode)
        self.assertIn("BEGIN PUBLIC KEY", self.public_key.read_text(encoding="utf-8"))


class CheckSystemLevelTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-level-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.dockerfile = self.tmp / "Dockerfile.monorepo"
        self.level_file = self.tmp / "system-level.json"
        shutil.copy(DOCKER_DIR / "Dockerfile.monorepo", self.dockerfile)
        shutil.copy(DOCKER_DIR / "system-level.json", self.level_file)

    def check(self) -> subprocess.CompletedProcess:
        return node("check-system-level.mjs", "--dockerfile", str(self.dockerfile), "--system-level", str(self.level_file))

    def edit(self, path: Path, old: str, new: str) -> None:
        text = path.read_text(encoding="utf-8")
        self.assertIn(old, text)
        path.write_text(text.replace(old, new, 1), encoding="utf-8")

    def test_repository_system_level_matches_its_inputs(self) -> None:
        result = node("check-system-level.mjs")
        self.assertEqual(0, result.returncode, result.stderr)

    def test_a_system_part_change_needs_a_new_level(self) -> None:
        self.edit(self.dockerfile, "git ripgrep curl ca-certificates", "git ripgrep curl ca-certificates jq")
        result = self.check()
        self.assertNotEqual(0, result.returncode)
        level = json.loads(self.level_file.read_text(encoding="utf-8"))["level"]
        self.assertIn(f"to {level + 1}", result.stderr)
        new_hash = re.search(r'"systemInputsSha256" to "([0-9a-f]{64})"', result.stderr).group(1)
        data = json.loads(self.level_file.read_text(encoding="utf-8"))
        data.update(level=level + 1, systemInputsSha256=new_hash)
        self.level_file.write_text(json.dumps(data), encoding="utf-8")
        self.assertEqual(0, self.check().returncode)

    def test_a_base_image_change_needs_a_new_level(self) -> None:
        data = json.loads(self.level_file.read_text(encoding="utf-8"))
        data["baseImages"]["zh"] = "sha256:" + "0" * 64
        self.level_file.write_text(json.dumps(data), encoding="utf-8")
        self.assertNotEqual(0, self.check().returncode)

    def test_changes_after_the_system_part_need_no_new_level(self) -> None:
        self.edit(self.dockerfile, "EXPOSE 8000 5900 6080 9223", "EXPOSE 8000 5900 6080 9223 9999")
        self.assertEqual(0, self.check().returncode)

    def test_the_dockerfile_default_base_must_be_the_recorded_default(self) -> None:
        default = json.loads(self.level_file.read_text(encoding="utf-8"))["baseImages"]["default"]
        self.edit(self.dockerfile, f"ARG BASE_IMAGE_DIGEST={default}", "ARG BASE_IMAGE_DIGEST=sha256:" + "1" * 64)
        result = self.check()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("must equal baseImages.default", result.stderr)


class CheckSystemLevelStepTest(unittest.TestCase):
    """Runs the build job's "Check system level" step in a checkout copy."""

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-level-step-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.checkout = self.tmp / "checkout"
        shutil.copytree(SCRIPTS, self.checkout / "scripts" / "server-package")
        shutil.copytree(DOCKER_DIR, self.checkout / "autobyteus-server-ts" / "docker",
                        ignore=shutil.ignore_patterns(".runtime"))
        self.outputs = self.tmp / "outputs.txt"
        self.levels = json.loads((DOCKER_DIR / "system-level.json").read_text(encoding="utf-8"))

    def run_step(self, variant: str) -> subprocess.CompletedProcess:
        step = extract_step(WORKFLOW, "Check system level")
        self.outputs.write_text("", encoding="utf-8")
        env = {"PATH": os.environ["PATH"], "VARIANT_LABEL": variant, "RELEASE_REF": "v1.5.12",
               "GITHUB_OUTPUT": str(self.outputs)}
        return run_bash(substitute_expressions(step["run"], {}), self.checkout, env)

    def test_each_variant_builds_from_its_recorded_base_digest(self) -> None:
        for variant in ("default", "zh"):
            with self.subTest(variant=variant):
                result = self.run_step(variant)
                self.assertEqual(0, result.returncode, result.stdout + result.stderr)
                self.assertEqual(f"base_image_digest={self.levels['baseImages'][variant]}\n",
                                 self.outputs.read_text(encoding="utf-8"))

    def test_refuses_unknown_variants_changed_system_parts_and_refs_before_packages(self) -> None:
        result = self.run_step("fr")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("no base image digest for the variant 'fr'", result.stdout)
        dockerfile = self.checkout / "autobyteus-server-ts" / "docker" / "Dockerfile.monorepo"
        dockerfile.write_text(dockerfile.read_text(encoding="utf-8").replace("git ripgrep", "git jq ripgrep"), encoding="utf-8")
        result = self.run_step("default")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("raise", result.stderr)
        (self.checkout / "autobyteus-server-ts" / "docker" / "system-level.json").unlink()
        result = self.run_step("default")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("v1.5.12 predates server packages", result.stdout)
        self.assertIn("-f release_tag=<tag>\n", result.stdout)
        zh = self.run_step("zh")
        self.assertNotEqual(0, zh.returncode)
        self.assertIn("-f release_tag=<tag> -f publish_zh=true", zh.stdout)
        self.assertEqual("", self.outputs.read_text(encoding="utf-8"))


def write_executable(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IEXEC)


class PackageJobTest(unittest.TestCase):
    """Runs the package job's steps with fake docker and gh, as CI runs them."""

    JOB = "publish-server-package"

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="server-package-job-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.workflow = WORKFLOW.read_text(encoding="utf-8")
        # The image's package, as the fake docker cp hands it out.
        self.image_package = make_package(self.tmp / "image")
        level_file = self.tmp / "level.json"
        level_file.write_text('{"level": 1}\n', encoding="utf-8")
        subprocess.run([NODE, str(SCRIPTS / "describe-server-package.mjs"), "package-json", "--package-dir",
                        str(self.image_package), "--version", "1.5.12", "--system-level-file", str(level_file)], check=True,
                       capture_output=True)
        # A checkout with the scripts and a test public key in the image's key path.
        self.checkout = self.tmp / "checkout"
        shutil.copytree(SCRIPTS, self.checkout / "scripts" / "server-package")
        (self.checkout / "autobyteus-server-ts" / "docker").mkdir(parents=True)
        self.private_key, public_key = key_pair(self.tmp, "release")
        shutil.copy(public_key, self.checkout / "autobyteus-server-ts" / "docker" / "server-package-signing-key.pem")
        self.public_key = public_key

        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.calls = self.tmp / "calls.txt"
        write_executable(bin_dir / "docker", f"""#!/usr/bin/env bash
echo "docker $*" >> "{self.calls}"
if [[ "$1" == cp ]]; then cp -R "{self.image_package}" "$3"; fi
""")
        self.uploads = self.tmp / "uploads"
        self.uploads.mkdir()
        write_executable(bin_dir / "gh", f"""#!/usr/bin/env bash
echo "gh $*" >> "{self.calls}"
if [[ "$1 $2" == "release view" ]]; then
  count=$(cat "{self.tmp}/views" 2>/dev/null || echo 0); echo $((count + 1)) > "{self.tmp}/views"
  [[ $((count + 1)) -ge "${{FAKE_RELEASE_AFTER:-1}}" ]]; exit $?
fi
if [[ "$1 $2" == "release upload" ]]; then cp "$4" "{self.uploads}/"; fi
""")
        write_executable(bin_dir / "sleep", "#!/usr/bin/env bash\nexit 0\n")
        if subprocess.run(["tar", "--version"], capture_output=True, text=True).stdout.find("GNU tar") < 0:
            real_tar = shutil.which("tar")
            write_executable(bin_dir / "tar", f"""#!/usr/bin/env bash
args=()
for arg in "$@"; do
  case "$arg" in --sort=name|--owner=0|--group=0|--numeric-owner) ;; *) args+=("$arg") ;; esac
done
exec "{real_tar}" "${{args[@]}}"
""")
        self.path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"
        self.runner_temp = self.tmp / "runner"
        self.runner_temp.mkdir()
        self.outputs = self.tmp / "outputs.txt"
        self.summary = self.tmp / "summary.md"

    def run_step(self, name: str, env: dict) -> subprocess.CompletedProcess:
        step = extract_step(WORKFLOW, name)
        script = substitute_expressions(step["run"], {"matrix.platform": "linux/arm64"})
        full_env = {"PATH": self.path, "HOME": str(self.tmp), "RUNNER_TEMP": str(self.runner_temp),
                    "GITHUB_OUTPUT": str(self.outputs), "GITHUB_STEP_SUMMARY": str(self.summary), **env}
        return run_bash(script, self.checkout, full_env)

    def job_text(self) -> str:
        start = self.workflow.index(f"  {self.JOB}:")
        return self.workflow[start:]

    def test_job_runs_for_the_default_variant_only_and_alone_may_write_contents(self) -> None:
        job = self.job_text()
        self.assertIn("if: ${{ needs.prepare-release.outputs.build_variant == '' }}", job)
        self.assertIn("needs: [prepare-release, build-and-push]", job)
        self.assertIn("platform: [linux/amd64, linux/arm64]", job)
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertEqual(1, self.workflow.count("contents: write"))
        self.assertIn("    permissions:\n      contents: write", job)
        self.assertIn("SERVER_PACKAGE_SIGNING_KEY: ${{ secrets.SERVER_PACKAGE_SIGNING_KEY }}", job)

    def test_steps_publish_the_images_package_signed_in_upload_order(self) -> None:
        image = "autobyteus/autobyteus-server:1.5.12"
        result = self.run_step("Extract the built-in server package", {"IMAGE": image, "PLATFORM": "linux/arm64"})
        self.assertEqual(0, result.returncode, result.stderr)
        result = self.run_step("Archive, describe and sign the server package",
                               {"NORMALIZED_TAG": "1.5.12", "SERVER_PACKAGE_SIGNING_KEY": self.private_key})
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertNotIn("PRIVATE KEY", result.stdout + result.stderr)
        asset_base = self.outputs.read_text(encoding="utf-8").split("asset_base=", 1)[1].strip()
        self.assertTrue(asset_base.endswith(f"autobyteus-server-1.5.12-linux-{ARCH}"))
        release_env = {"GH_TOKEN": "t", "GH_REPO": "AutoByteus/autobyteus-workspace", "RELEASE_TAG": "v1.5.12"}
        result = self.run_step("Wait for the GitHub release", {**release_env, "FAKE_RELEASE_AFTER": "3"})
        self.assertEqual(0, result.returncode, result.stderr)
        result = self.run_step("Upload the server package to the release", {**release_env, "ASSET_BASE": asset_base})
        self.assertEqual(0, result.returncode, result.stderr)

        calls = self.calls.read_text(encoding="utf-8").splitlines()
        self.assertEqual([
            f"docker create --platform linux/arm64 --name server-package-source {image}",
            f"docker cp server-package-source:/opt/autobyteus/server-package {self.runner_temp}/server-package",
            "docker rm server-package-source",
        ], calls[:3])
        self.assertEqual(3, sum(1 for call in calls if call.startswith("gh release view v1.5.12")))
        name = f"autobyteus-server-1.5.12-linux-{ARCH}"
        self.assertEqual([f"gh release upload v1.5.12 {asset_base}{suffix} --clobber" for suffix in (".tar.gz", ".json", ".json.sig")],
                         [call for call in calls if call.startswith("gh release upload")])

        uploaded = {path.name for path in self.uploads.iterdir()}
        self.assertEqual({f"{name}.tar.gz", f"{name}.json", f"{name}.json.sig"}, uploaded)
        self.assertTrue(verify(self.public_key, self.uploads / f"{name}.json", self.uploads / f"{name}.json.sig"))
        description = json.loads((self.uploads / f"{name}.json").read_text(encoding="utf-8"))
        archive = self.uploads / f"{name}.tar.gz"
        self.assertEqual(hashlib.sha256(archive.read_bytes()).hexdigest(), description["archive"]["sha256"])
        # The archive holds the image's package folder at its root, unchanged.
        unpacked = self.tmp / "unpacked"
        unpacked.mkdir()
        subprocess.run(["tar", "-xzf", str(archive), "-C", str(unpacked)], check=True)
        self.assertEqual(tree(self.image_package), tree(unpacked))
        self.assertIn(f"`{name}.json.sig`", self.summary.read_text(encoding="utf-8"))

    def test_a_release_that_never_appears_fails_the_job(self) -> None:
        result = self.run_step("Wait for the GitHub release", {"GH_TOKEN": "t", "GH_REPO": "r", "RELEASE_TAG": "v1.5.12",
                                                               "FAKE_RELEASE_AFTER": "999"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("did not appear within 30 minutes", result.stdout)


def tree(root: Path) -> dict:
    """Relative path → file SHA-256 or symlink target, for every entry under root."""
    entries = {}
    for path in sorted(root.rglob("*")):
        relative = str(path.relative_to(root))
        if path.is_symlink():
            entries[relative] = "symlink:" + os.readlink(path)
        elif path.is_file():
            entries[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        else:
            entries[relative] = "dir"
    return entries


if __name__ == "__main__":
    unittest.main()
