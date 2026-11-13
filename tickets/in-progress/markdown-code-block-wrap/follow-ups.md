# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation-notes.md | `autobyteus-web/components/conversation/segments/renderer/FileDisplay.vue` is dead code: no production file imports it | `grep -rln FileDisplay` over `autobyteus-web` (excluding node_modules) finds only the file itself and its path in the list of `tests/integration/app-font-size-fixed-px-audit.integration.test.ts:29` | This ticket does not touch the file; markdown wrapping works without removing it | No | Remove the unused `FileDisplay.vue` and its entry in the font-size audit's file list, after confirming no dynamic import or route uses it. | |
