# Handoff Summary — Docker CLI Latest Install Defaults

## Current State

User confirmed finalization. Repository finalization is now in progress; release/publication/deployment is explicitly not required per user instruction.

## What Changed

- Dockerfile defaults now install npm `latest` for:
  - `@openai/codex`
  - `@anthropic-ai/claude-code`
- Explicit build-arg version overrides still work.
- Local build scripts and the GitHub release workflow now pass `CLI_INSTALL_CACHE_BUSTER` so scripted builds do not reuse stale CLI install layers when `latest` should be resolved again.
- Added durable validation for Dockerfile defaults and cache-buster wiring.
- Updated Docker README with default/latest behavior and override example.

## Validation

Passed:

```bash
python3 -m unittest scripts/tests/test_server_docker_cli_latest_defaults.py
bash -n autobyteus-server-ts/docker/build.sh autobyteus-server-ts/docker/build-multi-arch.sh
git diff --check
```

Additional stale-pin grep passed with no matches.

## Release Notes

Not required. User explicitly requested finalization with no new release/version.

## Important Operational Note

The already-running container is not automatically changed by this source fix. Rebuild/recreate the server Docker image/container to get the new default behavior in the image. The currently running container can still have an old Claude Code version until rebuilt or manually updated.
