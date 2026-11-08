# Emulator evidence — autobyteus-433 API/E2E round 2 (API-REV-002)

Same conventions as `../emulator/README.md` (file names, `.txt`/`.xml`/`.json`/`.png`, the address check), with these differences:

- Commit: app code `ea45dc1643` (IR-003); worktree at `2175dfba74`. Debug APK built from it: sha256 `a67fb0ae22d248339427525cd6a1be45c22b566b7f8f2390e34b466e7d7acf10` (API-04, API-08 reload/Retry, API-09); after the temporary diagnostic build was reverted, `7445857c3502d18eac53912826e8d58f55ae476f55f1d845761cba8c129ff61b` (API-08 Back, API-11). Its source equals `ea45dc1643` (`git diff ea45dc1643 -- autobyteus-android` empty) and its dex holds no `DIAG433`. The `/mobile` bundle and server `dist` are from round 1 (no web or server source changed).
- Date: 2026-11-08, 08:29Z–08:39Z.
- Device: a new ticket-owned AVD `pnnp433_api35` (same image, headless), deleted at the end (`cleanup.log`).
- Nodes: A `127.0.0.1:47331` ("Test Desktop", `hostbox-9f3.home.arpa`), B `127.0.0.1:47332`. A test TCP proxy (`/tmp/pnnp-e2e/scripts/proxy.py`) ran on `127.0.0.1:47333` → A. Its modes were `pass`, `502` for `/mobile…` and `drop` (closed) for `/mobile…`; stopped meant refused. It was paired as "Test Server" at `http://hostbox-9f3.home.arpa:47333`, and its log is `API-11-proxy.log`.
- `API-08-cause-onPageFinished-twice.log`: callback order from temporary logging (reverted, never committed).
