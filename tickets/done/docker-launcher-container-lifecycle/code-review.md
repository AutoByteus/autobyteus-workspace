# Code Review: Docker launcher lifecycle commands

Status: Pass

## Review summary

Reviewed changed files:

- README.md
- scripts/public/docker/autobyteus-docker.sh
- scripts/public/docker/autobyteus-docker.ps1

Diff stat:

```text
 README.md                                   |  23 ++-
 scripts/public/docker/autobyteus-docker.ps1 | 190 ++++++++++++++++++++++---
 scripts/public/docker/autobyteus-docker.sh  | 208 ++++++++++++++++++++++++----
 3 files changed, 372 insertions(+), 49 deletions(-)
```

## Findings

No blocking findings.

## Checks

- Command model: Pass
  - new creation command is `new-container`.
  - `start` / `start --new` are not advertised or routed as supported commands.
- Indexed naming: Pass
  - Bash and PowerShell both start at `autobyteus-server-0` and scan upward.
- All-node lifecycle: Pass
  - `upgrade --all`, `destroy --all`, and `reset` are explicit.
  - `upgrade` and `destroy` require `--all`.
- Volume safety: Pass
  - no volume removal or global Docker prune command was introduced.
- Image cleanup safety: Pass
  - cleanup is based on image IDs captured from managed containers.
  - cleanup skips image IDs still used by any Docker container.
- Self-update behavior: Pass
  - `install` is the only launcher self-install/update command; `update` alias is removed.
- PowerShell parity: Pass by inspection
  - command model and lifecycle helpers mirror Bash.
  - parser execution could not be run because PowerShell is unavailable locally.

## Residual risk

PowerShell runtime behavior should be smoke-tested on Windows or an environment with `pwsh` before publication.

## Refinement review: install-only launcher replacement command

Status: Pass

- Removed `update` from Bash help and install command dispatch.
- Removed `update` from PowerShell help and install command dispatch.
- Added an explicit unknown-command preflight before Docker assertion so removed commands such as `update` show usage instead of requiring Docker.
- `install` remains the single unambiguous command for installing or replacing the local launcher.
