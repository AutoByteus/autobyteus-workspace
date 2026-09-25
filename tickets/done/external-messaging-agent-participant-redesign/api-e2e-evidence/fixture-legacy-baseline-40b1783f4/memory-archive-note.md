# Fixture memory archive

`memory.tar.gz` holds the `memory/` tree of this baseline-produced legacy fixture
(agent and team run memory created by binding-started runs on `40b1783f4`).

It is packed because the expanded run-memory paths exceeded the repository's
200-character tracked-path limit (`scripts/check_repository_artifact_hygiene.py`),
which blocks the Desktop release workflow's Windows checkout.

Extract with: `tar -xzf memory.tar.gz`
