# Implementation Plan — Docker CLI Latest Install Defaults

## Scope

Small packaging change. The change is constrained to Docker build defaults and release/local build cache behavior.

## Solution Sketch

1. Keep the CLI install command build-arg based:
   - `@openai/codex@${CODEX_CLI_VERSION}`
   - `@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}`
2. Change default build arg values from fixed versions to `latest`:
   - `ARG CODEX_CLI_VERSION=latest`
   - `ARG CLAUDE_CODE_VERSION=latest`
3. Add a dedicated no-op cache-buster build arg in the Dockerfile before the CLI `npm install -g` layer:
   - `ARG CLI_INSTALL_CACHE_BUSTER=0`
   - echo it during the install layer so build systems can invalidate exactly that layer.
4. Wire scripted build paths to pass a changing cache-buster value by default:
   - `autobyteus-server-ts/docker/build.sh`
   - `autobyteus-server-ts/docker/build-multi-arch.sh`
   - `.github/workflows/release-server-docker.yml`
5. Add durable lightweight validation that checks:
   - Dockerfile defaults are `latest`.
   - Dockerfile install command still uses build args.
   - local scripts and release workflow pass `CLI_INSTALL_CACHE_BUSTER`.

## Ownership / File Placement

- Server Docker packaging owns the Dockerfile and local build scripts under `autobyteus-server-ts/docker/`.
- Release CI owns GitHub workflow cache-buster wiring under `.github/workflows/release-server-docker.yml`.
- Validation belongs under `scripts/tests/` because existing repo-level tests already validate release/build helper behavior from there.

## Risks

- A direct manual `docker build` without a cache-buster or `--no-cache` can still reuse Docker's local layer cache. The official local scripts and CI release path should be robust by default; manual override behavior remains user-controlled.

## Implementation Execution Log

### Completed Source Changes

- Updated `autobyteus-server-ts/docker/Dockerfile.monorepo` defaults:
  - `CODEX_CLI_VERSION=latest`
  - `CLAUDE_CODE_VERSION=latest`
- Added Dockerfile `CLI_INSTALL_CACHE_BUSTER` arg and referenced it in the CLI install layer, so scripted builds can force npm to re-resolve `latest` without requiring a full no-cache build.
- Updated local Docker build scripts:
  - `autobyteus-server-ts/docker/build.sh`
  - `autobyteus-server-ts/docker/build-multi-arch.sh`
- Updated release workflow:
  - `.github/workflows/release-server-docker.yml`
- Added durable validation:
  - `scripts/tests/test_server_docker_cli_latest_defaults.py`

### Stage 6 Validation

Passed:

```bash
python3 -m unittest scripts/tests/test_server_docker_cli_latest_defaults.py
bash -n autobyteus-server-ts/docker/build.sh autobyteus-server-ts/docker/build-multi-arch.sh
git diff --check
```

Additional source hygiene check passed:

```bash
grep -RIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=electron-dist \
  -E 'ARG (CODEX_CLI_VERSION|CLAUDE_CODE_VERSION)=[0-9]' \
  autobyteus-server-ts docker scripts .github
# result: none
```

### Stage 6 Ownership / Quality Checks

- No backward-compatibility removal: explicit version override path remains.
- No legacy retention: stale default version pins removed from tracked source.
- File placement: changes stay in Docker packaging, release workflow, and repo-level tests.
- Source-file size/delta pressure: all changed source/script files are small; no >220-line or >500-line implementation-file pressure introduced.
