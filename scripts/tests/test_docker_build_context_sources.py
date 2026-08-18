import glob
import json
import shlex
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PRIMARY_DOCKERFILE = REPO_ROOT / "autobyteus-server-ts" / "docker" / "Dockerfile.monorepo"
ALLINONE_DOCKERFILE = REPO_ROOT / "docker" / "Dockerfile.allinone"
REMOTE_SERVER_DOCKERFILE = REPO_ROOT / "docker" / "Dockerfile.remote-server"
SUPPORTED_DOCKERFILES = (
    PRIMARY_DOCKERFILE,
    ALLINONE_DOCKERFILE,
    REMOTE_SERVER_DOCKERFILE,
)


class DockerBuildContextSourcesTest(unittest.TestCase):
    def test_direct_copy_sources_exist_in_repository_root_context(self) -> None:
        for dockerfile in SUPPORTED_DOCKERFILES:
            direct_sources = list(direct_copy_sources(dockerfile))
            self.assertTrue(direct_sources, f"{dockerfile} has no direct COPY sources")

            for source in direct_sources:
                with self.subTest(dockerfile=dockerfile.relative_to(REPO_ROOT), source=source):
                    matches = glob.glob(str(REPO_ROOT / source), recursive=True)
                    self.assertTrue(
                        matches,
                        f"{dockerfile.relative_to(REPO_ROOT)} copies missing repository-root source {source!r}",
                    )

    def test_team_stream_contracts_dependency_is_built_and_materialized_in_all_server_images(self) -> None:
        server_manifest = json.loads(
            (REPO_ROOT / "autobyteus-server-ts" / "package.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            server_manifest["dependencies"]["@autobyteus/team-stream-contracts"],
            "workspace:*",
        )

        common_instructions = (
            "COPY autobyteus-team-stream-contracts/package.json autobyteus-team-stream-contracts/tsconfig.build.json "
            "autobyteus-team-stream-contracts/tsconfig.json ./autobyteus-team-stream-contracts/",
            "COPY autobyteus-team-stream-contracts ./autobyteus-team-stream-contracts",
            "RUN pnpm -C autobyteus-team-stream-contracts build",
        )
        runtime_instructions = {
            PRIMARY_DOCKERFILE: (
                "COPY --from=builder /app/autobyteus-team-stream-contracts/node_modules "
                "./autobyteus-team-stream-contracts/node_modules",
                "COPY --from=builder /app/autobyteus-team-stream-contracts/dist "
                "./autobyteus-team-stream-contracts/dist",
                "COPY --from=builder /app/autobyteus-team-stream-contracts/package.json "
                "./autobyteus-team-stream-contracts/package.json",
            ),
            ALLINONE_DOCKERFILE: (
                "COPY --from=builder /app/autobyteus-team-stream-contracts ./autobyteus-team-stream-contracts",
            ),
            REMOTE_SERVER_DOCKERFILE: (
                "COPY --from=builder /app/autobyteus-team-stream-contracts ./autobyteus-team-stream-contracts",
            ),
        }

        for dockerfile in SUPPORTED_DOCKERFILES:
            instructions = set(logical_instructions(dockerfile.read_text(encoding="utf-8")))
            with self.subTest(dockerfile=dockerfile.relative_to(REPO_ROOT)):
                for instruction in common_instructions + runtime_instructions[dockerfile]:
                    self.assertIn(instruction, instructions)

        allinone_instructions = set(logical_instructions(ALLINONE_DOCKERFILE.read_text(encoding="utf-8")))
        allinone_install = next(
            (instruction for instruction in allinone_instructions if instruction.startswith("RUN pnpm install ")),
            "",
        )
        self.assertIn(
            "--filter @autobyteus/team-stream-contracts...",
            allinone_install,
            "Dockerfile.allinone must admit @autobyteus/team-stream-contracts to its filtered install command",
        )


def direct_copy_sources(dockerfile: Path):
    for instruction in logical_instructions(dockerfile.read_text(encoding="utf-8")):
        command, separator, arguments = instruction.partition(" ")
        if not separator or command.upper() != "COPY":
            continue

        tokens = copy_tokens(arguments)
        from_stage = False
        while tokens and tokens[0].startswith("--"):
            flag = tokens.pop(0)
            from_stage = from_stage or flag == "--from" or flag.startswith("--from=")
            if flag in {"--from", "--chown", "--chmod", "--exclude"}:
                if not tokens:
                    raise AssertionError(f"{dockerfile}: COPY flag {flag!r} has no value")
                tokens.pop(0)

        if from_stage:
            continue
        if len(tokens) < 2:
            raise AssertionError(f"{dockerfile}: COPY must declare a source and destination: {instruction!r}")

        yield from tokens[:-1]


def logical_instructions(dockerfile: str):
    pending = ""
    for raw_line in dockerfile.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        pending = f"{pending} {stripped}".strip()
        if pending.endswith("\\"):
            pending = pending[:-1].rstrip()
            continue

        yield pending
        pending = ""

    if pending:
        yield pending


def copy_tokens(arguments: str) -> list[str]:
    arguments = arguments.strip()
    if arguments.startswith("["):
        tokens = json.loads(arguments)
        if not isinstance(tokens, list) or not all(isinstance(token, str) for token in tokens):
            raise AssertionError(f"COPY JSON form must be an array of strings: {arguments!r}")
        return tokens
    return shlex.split(arguments)


if __name__ == "__main__":
    unittest.main()
