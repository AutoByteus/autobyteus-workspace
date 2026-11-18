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
    DIGEST = "sha256:" + "a" * 64

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
        self.assertIn("needs: [prepare-release, publish-image]", job)
        for platform, arch, package_arch in (("linux/amd64", "amd64", "x64"), ("linux/arm64", "arm64", "arm64")):
            self.assertIn(f"- platform: {platform}\n            arch: {arch}\n            package_arch: {package_arch}\n", job)
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        self.assertEqual(1, self.workflow.count("contents: write"))
        self.assertIn("    permissions:\n      contents: write", job)
        self.assertIn("SERVER_PACKAGE_SIGNING_KEY: ${{ secrets.SERVER_PACKAGE_SIGNING_KEY }}", job)

    def test_job_extracts_from_the_digest_publish_image_checked(self) -> None:
        job = self.job_text()
        self.assertIn("DIGEST: ${{ needs.publish-image.outputs[format('{0}_digest', matrix.arch)] }}", job)
        self.assertNotIn("download-artifact", job)
        self.assertNotIn("normalized_tag }}:", job)
        # Only the two folders the package steps read are checked out.
        self.assertIn("sparse-checkout: |\n            scripts/server-package\n            autobyteus-server-ts/docker\n", job)

    def test_wait_and_upload_run_only_when_publishing(self) -> None:
        publishing = "${{ needs.prepare-release.outputs.build_only != 'true' }}"
        self.assertEqual(publishing, extract_step(WORKFLOW, "Wait for the GitHub release")["if"])
        self.assertEqual(publishing, extract_step(WORKFLOW, "Upload the server package to the release")["if"])
        self.assertEqual("${{ needs.prepare-release.outputs.build_only == 'true' }}",
                         extract_step(WORKFLOW, "Summarize the build-only server package")["if"])

    def extract(self) -> None:
        result = self.run_step("Extract the built-in server package",
                               {"IMAGE_NAME": "autobyteus/autobyteus-server", "DIGEST": self.DIGEST, "PLATFORM": "linux/arm64"})
        self.assertEqual(0, result.returncode, result.stderr)

    def package(self, **env: str) -> subprocess.CompletedProcess:
        return self.run_step("Archive, describe and sign the server package",
                             {"BUILD_ONLY": "false", "NORMALIZED_TAG": "1.5.12", "PACKAGE_ARCH": ARCH,
                              "SERVER_PACKAGE_SIGNING_KEY": self.private_key, **env})

    def test_steps_publish_the_images_package_signed_in_upload_order(self) -> None:
        self.extract()
        result = self.package()
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertNotIn("PRIVATE KEY", result.stdout + result.stderr)
        asset_base = self.outputs.read_text(encoding="utf-8").split("asset_base=", 1)[1].strip()
        self.assertTrue(asset_base.endswith(f"autobyteus-server-1.5.12-linux-{ARCH}"))
        release_env = {"GH_TOKEN": "t", "GH_REPO": "AutoByteus/autobyteus-workspace", "RELEASE_TAG": "v1.5.12"}
        result = self.run_step("Wait for the GitHub release", {**release_env, "FAKE_RELEASE_AFTER": "3"})
        self.assertEqual(0, result.returncode, result.stderr)
        result = self.run_step("Upload the server package to the release",
                               {**release_env, "ASSET_BASE": asset_base, "PLATFORM": "linux/arm64"})
        self.assertEqual(0, result.returncode, result.stderr)

        calls = self.calls.read_text(encoding="utf-8").splitlines()
        self.assertEqual([
            f"docker create --platform linux/arm64 --name server-package-source autobyteus/autobyteus-server@{self.DIGEST}",
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
        summary = self.summary.read_text(encoding="utf-8")
        self.assertIn("### Server package (linux/arm64)", summary)
        self.assertIn(f"`{name}.json.sig`", summary)

    def test_a_package_of_another_architecture_is_refused(self) -> None:
        self.extract()
        other = "x64" if ARCH == "arm64" else "arm64"
        result = self.package(PACKAGE_ARCH=other)
        self.assertNotEqual(0, result.returncode)
        self.assertIn(f"The image's server package is for '{ARCH}', not '{other}'", result.stdout)
        self.assertEqual([], list((self.runner_temp / "server-package-assets").iterdir()))
        self.assertEqual("", self.outputs.read_text(encoding="utf-8") if self.outputs.exists() else "")

    def test_build_only_signs_the_package_under_its_own_version_and_uploads_nothing(self) -> None:
        self.extract()
        result = self.package(BUILD_ONLY="true", NORMALIZED_TAG="")
        self.assertEqual(0, result.returncode, result.stderr)
        asset_base = self.outputs.read_text(encoding="utf-8").split("asset_base=", 1)[1].strip()
        name = f"autobyteus-server-1.5.12-linux-{ARCH}"
        self.assertTrue(asset_base.endswith(name))
        self.assertTrue(verify(self.public_key, Path(f"{asset_base}.json"), Path(f"{asset_base}.json.sig")))
        result = self.run_step("Summarize the build-only server package", {"ASSET_BASE": asset_base, "PLATFORM": "linux/arm64"})
        self.assertEqual(0, result.returncode, result.stderr)
        archive = Path(f"{asset_base}.tar.gz")
        summary = self.summary.read_text(encoding="utf-8")
        self.assertIn("### Server package (linux/arm64), build only: not uploaded", summary)
        for suffix in (".tar.gz", ".json", ".json.sig"):
            self.assertIn(f"- `{name}{suffix}`", summary)
        self.assertIn(f"Archive SHA-256: `{hashlib.sha256(archive.read_bytes()).hexdigest()}`, size: {archive.stat().st_size} bytes",
                      summary)
        self.assertFalse(any(call.startswith("gh ") for call in self.calls.read_text(encoding="utf-8").splitlines()))

    def test_a_release_that_never_appears_fails_the_job_after_60_minutes(self) -> None:
        result = self.run_step("Wait for the GitHub release", {"GH_TOKEN": "t", "GH_REPO": "r", "RELEASE_TAG": "v1.5.12",
                                                               "FAKE_RELEASE_AFTER": "999"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("The GitHub release v1.5.12 did not appear within 60 minutes", result.stdout)
        # 120 polls 30 seconds apart.
        self.assertEqual("120", (self.tmp / "views").read_text(encoding="utf-8").strip())
        self.assertIn("sleep 30", extract_step(WORKFLOW, "Wait for the GitHub release")["run"])


def job_section(workflow: str, job: str) -> str:
    """The text of one top-level job, up to the next one."""
    start = workflow.index(f"\n  {job}:\n")
    following = re.search(r"\n  [a-z][a-z-]*:\n", workflow[start + 1:])
    return workflow[start:start + 1 + following.start()] if following else workflow[start:]


class BuildJobTest(unittest.TestCase):
    """Each architecture builds on its own runner and is pushed untagged, by digest."""

    def setUp(self) -> None:
        self.workflow = WORKFLOW.read_text(encoding="utf-8")
        self.job = job_section(self.workflow, "build")

    def test_each_architecture_builds_natively_and_pushes_by_digest(self) -> None:
        self.assertIn("runs-on: ${{ matrix.runner }}", self.job)
        self.assertIn("fail-fast: false", self.job)
        self.assertIn("- platform: linux/amd64\n            arch: amd64\n            runner: ubuntu-latest\n", self.job)
        self.assertIn("- platform: linux/arm64\n            arch: arm64\n            runner: ubuntu-24.04-arm\n", self.job)
        self.assertIn("platforms: ${{ matrix.platform }}", self.job)
        self.assertIn("outputs: type=image,name=${{ needs.prepare-release.outputs.image_name }},"
                      "push-by-digest=true,name-canonical=true,push=true", self.job)
        self.assertIn("provenance: false", self.job)
        self.assertIn("sbom: false", self.job)
        self.assertIn("name: server-image-digest-${{ matrix.arch }}", self.job)
        self.assertIn("overwrite: true", self.job)
        self.assertIn("fetch-depth: 1", self.job)

    def test_no_tag_emulation_or_layer_cache(self) -> None:
        self.assertNotIn("tags:", self.job)
        self.assertNotIn("push: true", self.job)
        for retired in ("setup-qemu-action", "type=gha", "cache-from", "cache-to", "build-and-push:"):
            self.assertNotIn(retired, self.workflow)


class DiskGuardStepTest(unittest.TestCase):
    """The build and package jobs clean the runner's disk only when it has less than 30 GB free."""

    STEP = "- name: Free runner disk space when low"

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="disk-guard-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.calls = self.tmp / "calls.txt"
        write_executable(bin_dir / "df", f"""#!/usr/bin/env bash
echo "df $*" >> "{self.calls}"
if [[ "$1" == -BG ]]; then printf ' Avail\\n  %sG\\n' "$FAKE_FREE_GB"; fi
""")
        for tool in ("sudo", "docker"):
            write_executable(bin_dir / tool, f'#!/usr/bin/env bash\necho "{tool} $*" >> "{self.calls}"\n')
        self.path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"

    def test_both_jobs_have_the_same_step(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        copies = [block.split("\n      - name:", 1)[0] for block in workflow.split(self.STEP)[1:]]
        self.assertEqual(2, len(copies))
        self.assertEqual(copies[0], copies[1])
        self.assertIn(self.STEP, job_section(workflow, "build"))
        self.assertIn(self.STEP, job_section(workflow, "publish-server-package"))

    def run_guard(self, free_gb: str) -> list:
        self.calls.write_text("", encoding="utf-8")
        step = extract_step(WORKFLOW, "Free runner disk space when low")
        result = run_bash(substitute_expressions(step["run"], {}), self.tmp, {"PATH": self.path, "FAKE_FREE_GB": free_gb})
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn(f"Free disk on /: {free_gb} GB", result.stdout)
        return self.calls.read_text(encoding="utf-8").splitlines()

    def test_cleans_only_below_30_gb(self) -> None:
        self.assertEqual(["df -BG --output=avail /"], self.run_guard("79"))
        self.assertEqual(["df -BG --output=avail /"], self.run_guard("30"))
        calls = self.run_guard("29")
        self.assertEqual("sudo rm -rf", calls[1][:len("sudo rm -rf")])
        self.assertEqual(["docker system prune -af", "df -h /"], calls[2:])


def index_json(entries) -> str:
    """An OCI image index listing (architecture, digest) entries for linux."""
    return json.dumps({
        "schemaVersion": 2,
        "mediaType": "application/vnd.oci.image.index.v1+json",
        "manifests": [{"mediaType": "application/vnd.oci.image.manifest.v1+json", "digest": digest, "size": 1234,
                       "platform": {"architecture": arch, "os": "linux"}} for arch, digest in entries],
    }, indent=2)


class PublishImageStepTest(unittest.TestCase):
    """Runs "Create and check the multi-arch image" with a fake docker that returns given indexes."""

    IMAGE = "autobyteus/autobyteus-server"
    AMD64 = "sha256:" + "a" * 64
    ARM64 = "sha256:" + "b" * 64
    OTHER = "sha256:" + "c" * 64

    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="publish-image-"))
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.runner_temp = self.tmp / "runner"
        (self.runner_temp / "digests").mkdir(parents=True)
        (self.runner_temp / "digests" / "amd64").write_text(self.AMD64 + "\n", encoding="utf-8")
        (self.runner_temp / "digests" / "arm64").write_text(self.ARM64 + "\n", encoding="utf-8")
        bin_dir = self.tmp / "bin"
        bin_dir.mkdir()
        self.calls = self.tmp / "calls.txt"
        self.dry_run_index = self.tmp / "dry-run.json"
        self.pushed_index = self.tmp / "pushed.json"
        write_executable(bin_dir / "docker", f"""#!/usr/bin/env bash
echo "docker $*" >> "{self.calls}"
case "$*" in
  "buildx imagetools create --dry-run "*) cat "{self.dry_run_index}" ;;
  "buildx imagetools inspect --raw "*) cat "{self.pushed_index}" ;;
esac
""")
        self.path = f"{bin_dir}{os.pathsep}{os.environ['PATH']}"
        self.outputs = self.tmp / "outputs.txt"
        good = index_json([("amd64", self.AMD64), ("arm64", self.ARM64)])
        self.dry_run_index.write_text(good, encoding="utf-8")
        self.pushed_index.write_text(good, encoding="utf-8")

    def run_step(self, *, build_only: str, version_tag: str = "", tags: str = "") -> subprocess.CompletedProcess:
        self.outputs.write_text("", encoding="utf-8")
        step = extract_step(WORKFLOW, "Create and check the multi-arch image")
        env = {"PATH": self.path, "RUNNER_TEMP": str(self.runner_temp), "GITHUB_OUTPUT": str(self.outputs),
               "BUILD_ONLY": build_only, "IMAGE_NAME": self.IMAGE, "VERSION_TAG": version_tag, "TAGS": tags}
        return run_bash(substitute_expressions(step["run"], {}), self.tmp, env)

    def docker_calls(self) -> list:
        return self.calls.read_text(encoding="utf-8").splitlines() if self.calls.exists() else []

    def sources(self) -> str:
        return f"{self.IMAGE}@{self.AMD64} {self.IMAGE}@{self.ARM64}"

    def assert_checked_outputs(self) -> None:
        self.assertEqual(f"amd64_digest={self.AMD64}\narm64_digest={self.ARM64}\n", self.outputs.read_text(encoding="utf-8"))

    def test_job_needs_both_architectures_and_outputs_the_checked_digests(self) -> None:
        job = job_section(WORKFLOW.read_text(encoding="utf-8"), "publish-image")
        self.assertIn("needs: [prepare-release, build]", job)
        self.assertIn("amd64_digest: ${{ steps.index.outputs.amd64_digest }}", job)
        self.assertIn("arm64_digest: ${{ steps.index.outputs.arm64_digest }}", job)
        self.assertIn("pattern: server-image-digest-*", job)
        self.assertIn("merge-multiple: true", job)
        self.assertIn("VERSION_TAG: ${{ needs.prepare-release.outputs.version_tag }}", job)

    def test_build_only_checks_the_dry_run_index_and_pushes_nothing(self) -> None:
        result = self.run_step(build_only="true")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertEqual([f"docker buildx imagetools create --dry-run -t {self.IMAGE}:build-only {self.sources()}"],
                         self.docker_calls())
        self.assertIn("The dry-run index lists linux/amd64", result.stdout)
        self.assert_checked_outputs()

    def test_publish_pushes_every_tag_then_checks_the_version_tag(self) -> None:
        tags = f"{self.IMAGE}:1.5.14\n{self.IMAGE}:latest"
        result = self.run_step(build_only="false", version_tag=f"{self.IMAGE}:1.5.14", tags=tags)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertEqual([
            f"docker buildx imagetools create --dry-run -t {self.IMAGE}:1.5.14 {self.sources()}",
            f"docker buildx imagetools create -t {self.IMAGE}:1.5.14 -t {self.IMAGE}:latest {self.sources()}",
            f"docker buildx imagetools inspect --raw {self.IMAGE}:1.5.14",
        ], self.docker_calls())
        self.assert_checked_outputs()

    def test_a_zh_republish_checks_its_own_version_tag(self) -> None:
        result = self.run_step(build_only="false", version_tag=f"{self.IMAGE}:1.5.12-zh",
                               tags=f"{self.IMAGE}:1.5.12-zh\n{self.IMAGE}:latest-zh")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertEqual(f"docker buildx imagetools inspect --raw {self.IMAGE}:1.5.12-zh", self.docker_calls()[-1])
        self.assert_checked_outputs()

    def test_a_wrong_dry_run_index_fails_before_any_tag_is_pushed(self) -> None:
        cases = {
            "swapped": [("amd64", self.ARM64), ("arm64", self.AMD64)],
            "missing arm64": [("amd64", self.AMD64)],
            "another digest": [("amd64", self.AMD64), ("arm64", self.OTHER)],
            "an extra entry": [("amd64", self.AMD64), ("arm64", self.ARM64), ("arm64", self.OTHER)],
        }
        for name, entries in cases.items():
            for build_only in ("true", "false"):
                with self.subTest(case=name, build_only=build_only):
                    self.calls.write_text("", encoding="utf-8")
                    self.dry_run_index.write_text(index_json(entries), encoding="utf-8")
                    result = self.run_step(build_only=build_only, version_tag=f"{self.IMAGE}:1.5.14",
                                           tags=f"{self.IMAGE}:1.5.14")
                    self.assertNotEqual(0, result.returncode)
                    self.assertIn("The dry-run index does not list exactly", result.stdout)
                    self.assertEqual(1, len(self.docker_calls()))
                    self.assertIn("--dry-run", self.docker_calls()[0])
                    self.assertEqual("", self.outputs.read_text(encoding="utf-8"))

    def test_a_wrong_pushed_index_fails_and_outputs_no_digest(self) -> None:
        self.pushed_index.write_text(index_json([("amd64", self.AMD64), ("arm64", self.OTHER)]), encoding="utf-8")
        result = self.run_step(build_only="false", version_tag=f"{self.IMAGE}:1.5.14", tags=f"{self.IMAGE}:1.5.14")
        self.assertNotEqual(0, result.returncode)
        self.assertIn(f"The pushed {self.IMAGE}:1.5.14 index does not list exactly", result.stdout)
        self.assertEqual("", self.outputs.read_text(encoding="utf-8"))


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
