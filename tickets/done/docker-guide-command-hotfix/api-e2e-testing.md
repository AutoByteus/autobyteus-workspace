# Validation: Docker Guide command hotfix

Status: Pass

## Commands

```bash
NUXT_TEST=true ./node_modules/.bin/vitest run \
  utils/__tests__/dockerNodeLauncherCommands.spec.ts \
  components/settings/__tests__/DockerNodeStartGuideCard.spec.ts
```

Result: Pass — 2 files, 4 tests.

```bash
rg -n "autobyteus-docker start|start --new|autobyteus-docker update" \
  autobyteus-web autobyteus-server-ts README.md scripts/public/docker | grep -v "not.toContain"
```

Result: Pass — no current user-facing stale command references found.

```bash
git diff --check
```

Result: Pass.

## Notes

The worktree reused the already-installed main checkout `autobyteus-web/node_modules` and `.nuxt` via temporary local symlinks for targeted Vitest execution; those symlinks were removed before commit.
