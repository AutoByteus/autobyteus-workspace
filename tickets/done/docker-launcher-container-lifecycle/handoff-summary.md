# Handoff Summary: Docker launcher lifecycle commands

Status: Ready for user verification

## What changed

- Public creation command is now `autobyteus-docker new-container`.
- Container naming is indexed from zero: `autobyteus-server-0`, `autobyteus-server-1`, ...
- Added:
  - `autobyteus-docker upgrade --all`
  - `autobyteus-docker destroy --all`
  - `autobyteus-docker reset`
- Removed the old public `start` / `start --new` command model from help/routing.
- Kept only `install` as the launcher self-install/update command; removed the `update` alias to avoid ambiguity.
- Kept named Docker volumes safe; no volume removal path was added.
- Added targeted image cleanup for old image IDs captured from managed containers.

## Validation

- Bash syntax check passed.
- Git whitespace diff check passed.
- Help command model checks passed.
- Fake-Docker smoke tests passed for:
  - `new-container` indexing
  - `upgrade --all`
  - `destroy --all`
- Safety grep passed: no volume removal or global prune commands.

## Residual risk

PowerShell was updated for parity but could not be parser/runtime tested locally because PowerShell is not installed in this environment.

## User verification suggestion

In a safe local Docker environment, install the launcher and verify:

```bash
autobyteus-docker new-container
autobyteus-docker new-container
autobyteus-docker status
autobyteus-docker upgrade --all
autobyteus-docker destroy --all
autobyteus-docker reset
```

Confirm volumes remain present after destroy/reset.
