# Executable Validation: Docker launcher lifecycle commands

Status: Pass

## Validation commands

- `bash -n scripts/public/docker/autobyteus-docker.sh` — Pass
- `git diff --check` — Pass
- Help command model grep checks — Pass
  - help contains `new-container`
  - help does not contain `start --new`
  - help does not list `start`
- Fake-Docker smoke: `new-container` twice — Pass
  - first isolated run created state/container for `autobyteus-server-0`
  - second isolated run created state/container for `autobyteus-server-1`
- Fake-Docker smoke: `upgrade --all` — Pass
  - enumerated both managed nodes
  - reconciled both nodes through the shared single-node path
- Fake-Docker smoke: `destroy --all` — Pass
  - removed managed container
  - removed state file
  - kept volumes by not invoking any volume removal
- Safety grep — Pass
  - no `docker volume rm`
  - no `docker system prune`
  - no `docker image prune`

## Notes

PowerShell parser validation was not executable in this environment because neither `pwsh` nor Windows PowerShell is installed locally.

## Refinement validation: install-only launcher replacement command

- `bash -n scripts/public/docker/autobyteus-docker.sh` — Pass
- Bash help contains `install            Install or replace` — Pass
- Bash help does not advertise `update` — Pass
- `autobyteus-docker update` exits through usage before Docker assertion — Pass
- Source grep confirms no `install|update`, `('install', 'update')`, `Alias for install`, or help-listed `update` remains in Bash/PowerShell launcher command routing/help — Pass
- `git diff --check` — Pass
