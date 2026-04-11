# Release Notes

## Improvements
- Reopened runs now rebuild historical conversation and right-side Activity state from the same run-history replay bundle.
- Historical replay ownership is now separated cleanly from raw memory storage, which makes restore behavior more consistent across AutoByteus and Codex-backed runs.

## Fixes
- Fixed historical reopen so the Activity panel restores tool events after a server restart instead of showing `0 Events`.
- Fixed the projection boundary so raw memory views no longer own the canonical replay contract used by run reopen.
