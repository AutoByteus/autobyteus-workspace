# Latest Backend/Browser Docker Recheck — 2026-05-30

## Refresh performed

- Backend workspace branch `codex/backend-docker-browser-base-analysis` was fast-forwarded to latest `origin/personal`:
  - from `21d05cf9`
  - to `2f545609568b7cb369e4b4b086fa9268cb7fd3e8` (`v1.3.34`)
- Browser Docker repo `/Users/normy/autobyteus_org/browser_docker` was fetched:
  - latest `origin/main`: `2bc0b4a` (`docs(release): record browser docker 1.3.6 publication`)
  - substantive browser release commit: `3951af5` (`Release 1.3.6 Chromium profile lock recovery`)

## Latest browser_docker findings

Latest published browser Docker is now `1.3.6`.

Important latest contracts from `origin/main`:

- `README.md` still says downstream images should mount `/home/vncuser/.config/chromium` to persistent storage.
- `entrypoint.sh` now:
  - prepares `/home/vncuser/.config/chromium` permissions;
  - clears stale Chromium profile lock artifacts (`SingletonLock`, `SingletonSocket`, `SingletonCookie`, `Default/LOCK`, `.org.chromium.Chromium.*`) before Supervisor starts Chromium.
- `run-container.sh` and browser compose files mount `/home/vncuser/.config/chromium`.
- `base.conf` on `origin/main` still launches Chromium directly with `/usr/bin/chromium ...`; the local uncommitted `start-chrome.sh` / `--no-sandbox` wrapper is **not** part of latest `origin/main`.

Published browser images checked:

- `autobyteus/chrome-vnc:latest` = `autobyteus/chrome-vnc:1.3.6` = digest `sha256:dbd749ca4bcbdab7fefc48b2f2fa2741e24e5919b6078596ec59b41ab77f1daa`.
- `autobyteus/chrome-vnc:zh` = `autobyteus/chrome-vnc:1.3.6-zh` = digest `sha256:1e1e1fcd71775fdbf7c682b47a98bb78548f4d78db0dc50ffdd2fd2c9ec2f850`.

## Latest backend origin/personal findings

Latest backend `origin/personal` includes `server-docker-desktop-only-analysis`, which removes the old `mobile-safe` profile from active launcher code and restores one normal/desktop Docker run shape.

Current active backend Docker surfaces still do **not** mount `/home/vncuser/.config/chromium`:

- `scripts/public/docker/autobyteus-docker.sh`
  - config hash is `v5`;
  - volumes are only `<node>-workspace`, `<node>-data`, and `<node>-root-home`;
  - no Chromium profile volume is in the config hash, run args, storage output, or tests.
- `scripts/public/docker/autobyteus-docker.ps1`
  - same shape as Bash launcher.
- `autobyteus-server-ts/docker/docker-compose.yml`
  - mounts only workspace/data/root-home.
- `docker/compose.personal-test.yml`
  - all-in-one mounts only data and gateway memory.
- `README.md` and `autobyteus-server-ts/docker/README.md`
  - persistence/direct-run docs list workspace/data/root-home, not Chromium profile.

Current published server image checked:

- `autobyteus/autobyteus-server:latest` = `autobyteus/autobyteus-server:1.3.34` = digest `sha256:3481434ac9412641261f7f890cc6a25c61723bbcd1e980b5602c7c21749ed315`.
- After pulling this image, `/entrypoint.sh` includes the old `CHROMIUM_PROFILE_DIR` ownership block from browser Docker 1.3.5 but does **not** include the 1.3.6 stale-lock cleanup function.
- Therefore the published server image should be rebuilt/released again if we want it to inherit browser Docker 1.3.6.

## Updated recommendation

Backend still needs an update.

Recommended backend code changes:

1. Add a named Chromium profile volume to the public Bash launcher:
   - `<node>-chromium-profile:/home/vncuser/.config/chromium`
2. Add the same named Chromium profile volume to the public PowerShell launcher.
3. Include the Chromium profile volume in launcher config hash input and bump the hash version from `v5` to `v6`, so existing managed containers are recreated once and attach the new volume.
4. Update launcher `storage` output and durable tests to list/assert the Chromium profile volume.
5. Add source-helper compose volume:
   - `autobyteus-server-chromium-profile:/home/vncuser/.config/chromium`
6. Add personal all-in-one compose volume:
   - `main-allinone-chromium-profile:/home/vncuser/.config/chromium`
7. Update `README.md` and `autobyteus-server-ts/docker/README.md` direct-run/storage docs.
8. After code update, rebuild/publish `autobyteus/autobyteus-server` so it uses browser Docker 1.3.6 and therefore includes the stale Chromium profile lock cleanup.

No backend change is needed for the old `mobile-safe`/`--no-sandbox` branch, because latest backend `origin/personal` removed that active profile path. The dirty local browser Docker `start-chrome.sh` branch should not drive backend changes unless it is later committed to `browser_docker` `origin/main` and reintroduced as a supported base-image contract.
