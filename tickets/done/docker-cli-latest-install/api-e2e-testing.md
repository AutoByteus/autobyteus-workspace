# API/E2E + Executable Validation — Docker CLI Latest Install Defaults

## Validation Scope

No backend API behavior changes. The executable validation target is Docker packaging behavior and release/build configuration.

## Scenarios

### EV-001: Dockerfile defaults to npm latest

Command:

```bash
python3 -m unittest scripts/tests/test_server_docker_cli_latest_defaults.py
```

Result: Passed.

Covers:

- AC-001 Dockerfile defaults are `latest`.
- AC-002 install command still uses build args for explicit overrides.
- AC-003 Dockerfile exposes cache-buster arg.
- AC-005 durable validation exists.

### EV-002: Build scripts are shell-syntax valid

Command:

```bash
bash -n autobyteus-server-ts/docker/build.sh autobyteus-server-ts/docker/build-multi-arch.sh
```

Result: Passed.

Covers:

- AC-003 local build scripts pass `CLI_INSTALL_CACHE_BUSTER` without shell syntax errors.

### EV-003: Source hygiene has no stale tracked CLI default pins

Command:

```bash
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=electron-dist \
  -E 'ARG (CODEX_CLI_VERSION|CLAUDE_CODE_VERSION)=[0-9]' \
  autobyteus-server-ts docker scripts .github
```

Result: Passed (`none`).

Covers:

- AC-004 tracked source has no stale default CLI version pins.

## Not Run / Rationale

A full Docker image rebuild was not run because this change is validated at the Dockerfile/script/workflow contract level and a multi-arch build is expensive. The new durable test protects the intended default behavior and release cache-buster wiring.

## Gate Decision

Stage 7 executable validation: Pass.
