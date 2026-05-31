# Docs Sync — Docker CLI Latest Install Defaults

## Docs Updated

- `autobyteus-server-ts/docker/README.md`

## Summary

Documented that the server Dockerfile installs npm `latest` for `@openai/codex` and `@anthropic-ai/claude-code` by default, that scripted builds pass `CLI_INSTALL_CACHE_BUSTER`, and that explicit version build args remain available for reproducible rollback/emergency pinning.

## Validation After Docs Sync

Passed:

```bash
python3 -m unittest scripts/tests/test_server_docker_cli_latest_defaults.py
bash -n autobyteus-server-ts/docker/build.sh autobyteus-server-ts/docker/build-multi-arch.sh
git diff --check
```

## Gate Decision

Stage 9 docs sync: Pass.
