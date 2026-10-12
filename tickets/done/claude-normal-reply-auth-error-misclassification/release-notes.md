## Fixes
- Fixed Claude agent replies being shown as a red "authentication failed" error when the reply itself mentioned being "not logged in" or asked to "run /login". Such replies now appear as normal messages and the run returns to idle. A Claude runtime that is really not logged in still reports the authentication error.
