"""The launcher's in-place update: `autobyteus-docker update` and the starter line of `status` (bash).

Run from the repository root with:
python3 -m unittest scripts/tests/test_public_docker_launcher_update.py -v
Uses the fake docker of test_public_docker_launcher_shared_workspace.py. Its `exec` runs the
launcher's own in-container script on the host, with a test double of the starter's cli.mjs
(FAKE_STARTER_CLI, needs node) that answers from a scenario file and records its arguments.
No Docker daemon, network or user state. The PowerShell twin is covered by the text contract test.
"""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_public_docker_launcher_shared_workspace import (  # noqa: E402
    fake_docker_environment, run_launcher, run_launcher_unchecked, state_path, write_fake_container, write_node_state,
)

FAKE_STARTER_CLI = r"""
const fs = require('fs')
const scenario = JSON.parse(fs.readFileSync(process.env.FAKE_STARTER_SCENARIO, 'utf8'))
const args = process.argv.slice(2)
fs.appendFileSync(process.env.FAKE_STARTER_SCENARIO + '.calls', JSON.stringify(args) + '\n')
let answer, code = 0
if (args[0] === 'update') {
  ({ answer, code } = scenario.update)
} else {
  const counter = process.env.FAKE_STARTER_SCENARIO + '.statusCount'
  const count = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0
  fs.writeFileSync(counter, String(count + 1))
  answer = scenario.statuses[Math.min(count, scenario.statuses.length - 1)]
}
process.stdout.write(JSON.stringify(answer) + '\n')
process.exit(code)
"""

IDLE = {"state": "idle", "targetVersion": None, "step": None, "code": None, "message": None}


def running_status(version, update=None, blocker=None):
    status = {"version": version, "state": "running", "server": {"pid": 9, "packageVersion": version, "source": "builtIn"},
              "update": {**IDLE, **(update or {})}}
    if blocker:
        status["updateBlocker"] = blocker
    return status


class LauncherUpdateTest(unittest.TestCase):
    def node(self, env, name="autobyteus-server-0", image_ref="autobyteus/autobyteus-server:latest"):
        write_node_state(env, name, name)
        path = state_path(env, name)
        path.write_text(path.read_text(encoding="utf-8").replace("IMAGE_REF=autobyteus/test:v1", f"IMAGE_REF={image_ref}"),
                        encoding="utf-8")
        write_fake_container(env, name, name)

    def scenario(self, env, update=None, statuses=None):
        root = Path(env["FAKE_DOCKER_ROOT"])
        cli = root / "fake-cli.cjs"
        cli.write_text(FAKE_STARTER_CLI, encoding="utf-8")
        scenario = root / "scenario.json"
        scenario.write_text(json.dumps({"update": update or {"answer": {}, "code": 1}, "statuses": statuses or []}), encoding="utf-8")
        env.update({"FAKE_STARTER_CLI": str(cli), "FAKE_STARTER_SCENARIO": str(scenario)})
        return scenario

    def calls(self, scenario):
        path = Path(f"{scenario}.calls")
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()] if path.exists() else []

    def test_update_follows_the_steps_to_the_result(self):
        with fake_docker_environment() as env:
            self.node(env)
            scenario = self.scenario(env, update={"answer": {"accepted": True, "version": "1.5.12"}, "code": 0}, statuses=[
                running_status("1.5.11", {"state": "running", "targetVersion": "1.5.12", "step": "downloading"}),
                running_status("1.5.11", {"state": "running", "targetVersion": "1.5.12", "step": "restarting"}),
                running_status("1.5.12", {"state": "succeeded", "targetVersion": "1.5.12", "message": "Updated to 1.5.12."}),
            ])
            result = run_launcher(env, "update", "--version", "1.5.12")
            self.assertEqual([["update", "--version", "1.5.12"], ["status"], ["status"], ["status"]], self.calls(scenario))
            lines = [line for line in result.stdout.splitlines() if "autobyteus-server-0:" in line]
            self.assertEqual([
                "[AutoByteus Docker] autobyteus-server-0: updating to 1.5.12",
                "[AutoByteus Docker] autobyteus-server-0: downloading",
                "[AutoByteus Docker] autobyteus-server-0: restarting",
                "[AutoByteus Docker] autobyteus-server-0: Updated to 1.5.12.",
            ], lines)

    def test_a_failed_update_ends_with_its_code_and_a_non_zero_exit(self):
        with fake_docker_environment() as env:
            self.node(env)
            self.scenario(env, update={"answer": {"accepted": True, "version": "1.5.12"}, "code": 0}, statuses=[
                running_status("1.5.11", {"state": "failed", "targetVersion": "1.5.12", "code": "FAILED_AFTER_SWITCH",
                                          "message": "1.5.12 did not come up; 1.5.11 runs again."}),
            ])
            result = run_launcher_unchecked(env, "update", "--version", "1.5.12")
            self.assertEqual(1, result.returncode)
            self.assertIn("autobyteus-server-0: failed (FAILED_AFTER_SWITCH): 1.5.12 did not come up; 1.5.11 runs again.", result.stdout)

    def test_without_a_version_the_saved_image_tag_chooses_the_track_or_refuses(self):
        cases = [
            ("autobyteus/autobyteus-server:latest", ["update", "--track", "stable"], None),
            ("autobyteus/autobyteus-server:latest-zh", ["update", "--track", "stable"], None),
            ("docker.io/autobyteus/autobyteus-server:beta", ["update", "--track", "beta"], None),
            ("autobyteus/autobyteus-server:1.5.10", None, "This node is pinned to 1.5.10; pass --version."),
            ("autobyteus/autobyteus-server:1.5.11-beta.2-zh", None, "This node is pinned to 1.5.11-beta.2-zh; pass --version."),
            ("registry.local:5000/team/server:latest", None,
             "This node uses a custom image (registry.local:5000/team/server:latest); pass --version."),
        ]
        for image_ref, expected_call, refusal in cases:
            with self.subTest(image_ref=image_ref), fake_docker_environment() as env:
                self.node(env, image_ref=image_ref)
                scenario = self.scenario(env, update={"answer": {"refused": "NOT_NEWER", "message": "not newer"}, "code": 2})
                result = run_launcher_unchecked(env, "update")
                self.assertEqual(1, result.returncode)
                if refusal:
                    self.assertIn(f"autobyteus-server-0: {refusal}", result.stdout)
                    self.assertEqual([], self.calls(scenario), "the starter is not asked")
                else:
                    self.assertEqual([expected_call], self.calls(scenario))
                    self.assertIn("autobyteus-server-0: refused (NOT_NEWER): not newer", result.stdout)

    def test_update_all_updates_each_node_in_turn(self):
        with fake_docker_environment() as env:
            self.node(env, "autobyteus-server-0")
            self.node(env, "autobyteus-server-1")
            scenario = self.scenario(env, update={"answer": {"accepted": True, "version": "1.5.12"}, "code": 0}, statuses=[
                running_status("1.5.12", {"state": "succeeded", "targetVersion": "1.5.12", "message": "Updated to 1.5.12."}),
            ])
            result = run_launcher(env, "update", "--all", "--version", "1.5.12")
            self.assertIn("autobyteus-server-0: Updated to 1.5.12.", result.stdout)
            self.assertIn("autobyteus-server-1: Updated to 1.5.12.", result.stdout)
            self.assertEqual(2, sum(call[0] == "update" for call in self.calls(scenario)))

    def test_update_refuses_options_that_do_not_apply(self):
        with fake_docker_environment() as env:
            self.node(env)
            for args, message in (
                (("update", "--all", "--name", "autobyteus-server-0"), "update accepts --all or --name <node>, not both."),
                (("update", "--tag", "beta"), "update keeps each node's image"),
                (("status", "--version", "1.5.12"), "--version applies only to update."),
            ):
                with self.subTest(args=args):
                    result = run_launcher_unchecked(env, *args)
                    self.assertNotEqual(0, result.returncode)
                    self.assertIn(message, result.stderr)

    def test_an_image_without_a_starter_cannot_update_in_place(self):
        with fake_docker_environment() as env:
            self.node(env)
            result = run_launcher_unchecked(env, "update", "--version", "1.5.12")
            self.assertEqual(1, result.returncode)
            self.assertIn("Images before the starter cannot update in place; run: autobyteus-docker upgrade --all", result.stdout)

    def test_status_shows_what_each_starter_runs(self):
        for statuses, expected in (
            ([running_status("1.5.11")], "  server: 1.5.11"),
            ([running_status("1.5.11", {"state": "running", "targetVersion": "1.5.12", "step": "preparing"})],
             "  server: 1.5.11, updating to 1.5.12 (preparing)"),
            ([running_status("1.5.11", blocker={"code": "NO_PACKAGES_VOLUME", "message": "Reinstall the launcher, then run: autobyteus-docker upgrade --all"})],
             "  server: 1.5.11, in-place update unavailable: Reinstall the launcher, then run: autobyteus-docker upgrade --all"),
            ([{"version": "1.5.13", "state": "needsNewImage", "update": IDLE,
               "message": "This node already ran 1.5.13; this image can run only 1.5.11."}],
             "  server: no server runs: This node already ran 1.5.13; this image can run only 1.5.11."),
        ):
            with self.subTest(expected=expected), fake_docker_environment() as env:
                self.node(env)
                self.scenario(env, statuses=statuses)
                output = run_launcher(env, "status").stdout.splitlines()
                self.assertEqual(expected, output[output.index(next(l for l in output if l.startswith("autobyteus-server-0"))) + 1])

    def test_status_says_not_available_without_a_starter_or_a_container(self):
        with fake_docker_environment() as env:
            self.node(env, "autobyteus-server-0")
            write_node_state(env, "autobyteus-server-1", "autobyteus-server-1")
            output = run_launcher(env, "status").stdout
            self.assertIn("  server: not available (no starter answer; images before the starter have none)", output)
            self.assertIn("  server: not available (container missing)", output)


if __name__ == "__main__":
    unittest.main()
