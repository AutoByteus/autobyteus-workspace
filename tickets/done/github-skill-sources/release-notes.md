# Release Notes — GitHub Skill Sources

Prepared for verification; this feature has not been published by this delivery round.

- Add public GitHub repository-root URLs in **Skills → Sources**, alongside existing local folders. Root skills and supported collections become ordinary catalog skills.
- See automatic checks when Sources opens and manually recheck. Updates are explicit, confirmed whole-source replacements; failed preparation keeps the prior install.
- Confirmed removal deletes the managed copy only. Failed removal stays visible for retry; local folder removal still only unlinks it.
- Preserve duplicate-name protection, runtime-default precedence notices, surviving disabled choices and future-run skill selection. A later same-workspace run can use the updated generation while the older run remains open.

**Data caution:** confirmed changed-revision updates/removal discard local edits in the managed copy. Use local sources for edits you need to maintain. No automatic installs, live-context refresh, old-generation snapshot or undo/history promise.

Public repositories/default branch only; no private credentials, branch/subfolder picker or script execution during import. Import only sources you trust.
