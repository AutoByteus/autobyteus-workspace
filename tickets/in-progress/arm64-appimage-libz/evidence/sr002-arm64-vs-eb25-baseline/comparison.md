# SR-002 arm64 build vs the electron-builder 25 baseline (IR-001 `evidence/eb25-vs-eb26-arm64/v25`)

Same prepared inputs, electron-builder 25.1.8, `node build/dist/build.js --linux --arm64` with
`AUTOBYTEUS_BUILD_FLAVOR=personal`, `GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace`, build-only trust key, Go 1.27.4.
node_modules: clean `pnpm install --frozen-lockfile` (pnpm 10.28.2) of the SR-002 lockfile.
Compared with `collect-facts.sh` (in `../eb25-vs-eb26-arm64/`).

| Fact | Result |
| --- | --- |
| Artifact names, electron-dist files | same |
| `latest-linux-arm64.yml` keys | same |
| `app.asar` sha256, listing (14,388 entries, sizes, integrity hashes) | same (`7a2a1c07…`) |
| `app.asar.unpacked`, `linux-arm64-unpacked` file list (27,149) | same |
| Image tree (`unsquashfs -lls`, modes/owners/sizes, dates dropped), 31,368 entries | same |
| Image contents and modes (both images fully extracted, `diff -r` + `find -printf %m %y %p %l`) | identical |
| Squashfs compression | gzip (both) |
| Runtime prefix | v25: 197,808 bytes sha256 `207f8955…1d85` (legacy, NEEDED libz.so) → 936,456 bytes sha256 `00cbdfcf…7444` (pinned static, no NEEDED) |
| AppImage size | 350,484,119 → 351,223,261 (+739,142 = runtime +738,648, blockmap +494) |
| blockMapSize / sha512 | 365,027 → 365,521 / new digest (follows from the new bytes) |
| Squashfs bytes | differ only as between any two builds (mkfs time, inode mtimes); contents identical as above |
