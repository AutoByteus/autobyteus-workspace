# IR004 frontend self-check — NOT visually verified

Affected real components: UserMessage held/queued indicators; AgentUserInputTextArea
recoverable-error notice and usable composer. Projection/store tests cover identity,
attachments, error vs running and no false completion; they are not visual proof.

A synthetic fixture using the real components and projection handler is retained as
render-fixture.vue. A task-owned Nuxt dev server was started at 127.0.0.1:31478 with
that temporary page (__compaction-ir004); renderer-dev.log records startup.
Attempted CUA Chrome tab creation returned “Browser is not available: chrome”.
After restoring documented controls, cua.getState() returned:
{"apps":[],"browsers":[],"errors":["Native apps: Error: Sky Computer Use native pipe startup failed"]}
No browser or native surface could be driven. No screenshot, viewport, layout,
focus, keyboard or interactive rendered-state verification is claimed. No alternate
UI automation was used. Only the task-owned dev session was stopped; lsof found no
listener on31478. The temporary production page was removed; evidence fixture remains.
Full browser/desktop journey remains a gate after implementation completes.
