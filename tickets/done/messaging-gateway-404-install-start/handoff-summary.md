# Handoff Summary

## Outcome

- Root cause confirmed: the shipped app bundled a stale managed messaging `release-manifest.json` pointing to `v1.2.26`, so `Install and Start Gateway` attempted to download a non-existent gateway asset and surfaced `HTTP 404 Not Found`.
- Fix implemented: desktop release preparation now syncs the checked-in managed messaging manifest to the same release tag as the desktop package version, and desktop CI now fails if the manifest tag drifts.

## Key Verification

- Positive sync/check path passed for `v1.2.30`.
- Negative drift detection failed as expected for `v1.2.31`.
- `scripts/desktop-release.sh` syntax check passed.
- `.github/workflows/release-desktop.yml` YAML parse passed.
- `git diff --check` passed.

## User Verification Hold

- Ticket remains in `tickets/in-progress/` pending your verification that this fix direction is acceptable.
