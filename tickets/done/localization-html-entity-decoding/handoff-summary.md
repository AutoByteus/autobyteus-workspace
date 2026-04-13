Status: Complete

# What Changed

- Added HTML entity decoding to the localization runtime after parameter interpolation.
- Covered named entities used by the current UI regression class (`amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, `larr`, `rarr`, `times`) and numeric entities for forward coverage.
- Added focused unit coverage for the decoded plain-text output.

# Root Cause

The multilingual extraction work moved HTML entities out of raw Vue template text and into plain translation catalog strings. The runtime returned those strings as-is, so Vue rendered the literal entity text instead of the intended characters.

# User-Visible Impact

This fixes:

1. `View Details &rarr;` -> `View Details →`
2. `&larr; Back to all agents/teams` -> `← Back to all agents/teams`
3. `Install &amp; Restart` -> `Install & Restart`
4. `user:&lt;snowflake&gt;` -> `user:<snowflake>`
5. `&times;` close labels -> `×`

# Validation

- Targeted runtime Vitest spec passed: `4/4` tests.

# Finalization

- User verification received on `2026-04-10`.
- Ticket archival/finalization requested without release publication.
- Release/publication/deployment not required for this ticket because it is a bug-fix finalization only and the user explicitly requested no new version release.

# Remaining Note

- The local `autobyteus-web` test workspace contains stale dependency symlinks. I worked around that for the focused runtime spec, but I did not change tracked project code to repair the workspace install itself.
