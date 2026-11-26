# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation-notes.md | `components/agentInput/ContextFilePathInputArea.vue:97,136,173` uses `<i class="fas fa-spinner fa-spin">` and `<i class="fas fa-trash-alt">`. The web loads Font Awesome only as SVG components (`plugins/fontawesome.ts`, `faCog`), with no font CSS, so these render as nothing: no upload spinner, no icon on "Clear" | The plugin and `nuxt.config.ts:121-126` load no `fa-*` font classes; the same cause as autobyteus-608's blank file icons | A different component and feature (context file input); this ticket's file list works without it | No | Replace the remaining `<i class="fa…">` icons in the web with local Iconify icons (`svg-spinners`, `heroicons`), and add a check that no `class="fa…"` icon remains | |
