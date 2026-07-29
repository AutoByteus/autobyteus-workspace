import glob
import json
import shlex
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SUPPORTED_DOCKERFILES = (
    REPO_ROOT / "autobyteus-server-ts" / "docker" / "Dockerfile.monorepo",
    REPO_ROOT / "docker" / "Dockerfile.allinone",
    REPO_ROOT / "docker" / "Dockerfile.remote-server",
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
