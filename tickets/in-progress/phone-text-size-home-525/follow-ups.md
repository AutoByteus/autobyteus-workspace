# Follow-ups — phone-text-size-home-525

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, design-spec.md (Change Scope) | Desktop: small labels with fixed `text-[11px]` do not follow the desktop's Display font size (Large 112.5 %, Extra large 125 %) | `CompactionStatusRow.vue:14`, `SystemInstructionActivityItem.vue:28,35`, `ToolActivityItem.vue:26`, `CompactionActivityItem.vue:19`, `TokenUsageMeterPanel.vue:62,72,84` and about 20 more desktop components (grep `text-\[[0-9]*px\]` in `autobyteus-web/components`) | This ticket is phone only and must not change the desktop; on the phone they are scaled by a phone-only rule | No | Desktop: make fixed-pixel text classes (`text-[11px]` etc.) rem-based so they follow the Display font size; check the desktop at Large and Extra large. |  |
