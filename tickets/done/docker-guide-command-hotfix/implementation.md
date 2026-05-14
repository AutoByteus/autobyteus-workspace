# Implementation: Docker Guide command hotfix

Status: Complete

## Changed files

- `autobyteus-web/utils/dockerNodeLauncherCommands.ts`
- `autobyteus-web/localization/messages/en/settings.ts`
- `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
- `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts`
- `autobyteus-web/docs/settings.md`
- `autobyteus-server-ts/README.md`
- `autobyteus-server-ts/docker/README.md`

## Summary

- Replaced frontend direct Docker Guide commands:
  - removed `autobyteus-docker start`
  - removed `autobyteus-docker start --new`
  - added `autobyteus-docker new-container`
  - added `autobyteus-docker upgrade --all`
  - added `autobyteus-docker destroy --all`
  - added `autobyteus-docker reset`
- Updated visible English copy:
  - install now says “installs or replaces”
  - new container copy explains indexed naming from `autobyteus-server-0`
  - next-step copy now references `new-container` / `reset`
- Updated tests and adjacent docs to prevent recurrence.
