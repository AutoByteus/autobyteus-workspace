# Real browser evidence — 2026-09-26
Executed with CUA in Chrome against isolated Nuxt 3423 / Studio 3421. No API probe substituted for the actions below. Accessibility/DOM states and screenshot were observed in tool results; this durable log records their material results. Backend JSON/trace/hash corroboration is retained beside this file. No screenshot file is claimed.

## Fixture and import
Source read only: `/Users/normy/autobyteus_org/autobyteus-private-agents/agent-orgs/nested-classroom-test` (current Org, not obsolete configured nested Team).
Staged under owned `/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/api-e2e-exact-kpgwwj97/browser-package/agent-orgs/attachment-classroom-test`; only exact definition-ID references renamed to avoid collision. Empty root agents directory satisfies package importer; copied flat Student Study Group separately to `agent-teams/attachment-study-group`, display name Attachment Study Group, no role/tool behavior edits. Settings > Agent Packages > Import Package visibly succeeded; Agent Orgs > Reload > View Details showed `id=attachment-classroom-test`. Agent Teams list showed Attachment Study Group after package Reload.

## Nested real task
Browser configured Codex App Server, GPT-6-Luna, medium, owned workspace, auto approve OFF, then Run Agent Org.
Org `nested_classroom_test_org_cc397abfb4834b62a3d7b25acdfffde8`; Teacher `test_teacher_601ab3a9e1c94c21adaa5620a959bb7a`.
Native picker uploaded generated browser-image.png (68 bytes, 1×1); Context Files (1) thumbnail and preview rendered. Browser Send requested bounded exact nested delegation, no repository/shell work. Approved delegate_task `/StudentStudyGroup`; browser showed distinct configured versus task student IDs. Task coordinator `student_one_ec725cac6c6d42af94c7ac9e0b2b9302` submitted ATTACHMENT_NESTED_OK; Teacher review acceptance produced Accepted for `task_9d4a5ecba5fd4332aa78710ed5f433c6`. Teacher returned exact task ID. History Open image created new browser image tab with exact Org/Teacher path and `(1×1)` title. No files/settings changed by test agents.

## Root Team duplicate-address task
Browser Run on Attachment Study Group with same live runtime and owned workspace.
Root `attachment_study_group_c937c29a406b4120ae7d4895fb1afc8c`:
- coordinator `student_one_8b8cd5aad8ce4bba8eeda205ad62145a`
- configured /student_two `student_two_f99f196b7e06445d864f214795cf38c9`
- first delegated /student_two `student_two_4c9cf1f680a642b4b5b07aa8980042f4`, task `task_510a45c7e19a42aa886eb7facc0baeeb`
- later delegated /student_two `student_two_0d3fcfccab2d477ba3b7a2ad2dffa743`, task `task_805c341c119e4b5f83cd859b140d5e46`

First task reached READY_FOR_ATTACHMENT. Its source role tried old fixture-specific /StudentStudyGroup/student_one ordinary reply; this was denied, then its exact coordinator run-ID reply was approved. No attachments were forwarded. Browser selected **Temporary task agent**, heading `student_two · 0042f4`, not configured student_two. Native picker uploaded browser-notes.txt and browser-image.png, showing Context Files (2).

Before Send, test-only sentinel file blocked exact task context_files directory. Browser Send ATTACHMENT_EXACT_TASK_20260926 produced HTTP400/EEXIST; text and both chips remained. Exact persisted raw trace SHA256 stayed identical, so no runtime dispatch. After removing only sentinel, browser retried unchanged text/attachments: composer cleared; live model returned “Acknowledged the generated image and text attachment in this conversation.” Persisted trace contains exactly one input marker with current exact Team/agent-runs locators. Configured same-address member has no raw input/file; later task has neither marker nor attachment. See browser-finalize-failure.json and browser-exact-delivery.json.

Browser coordinator delegated a second independent same-address task, which returned SECOND_READY. Original task's Open browser-notes.txt opened a browser tab displaying `API E2E browser exact execution file bytes.`. Browser reload and workspace navigation rehydrated exactly one persisted original attachment row (temporary failed optimistic UI row was gone).

## Stop/restart/reopen/restore
Browser Terminate team marked both tasks Interrupted/Offline, not deleted. Stopped only owned Studio, restarted same data. Original task raw trace and both files hash-identical, HTTP200 matching bytes. Browser reopened stopped Team and first interrupted task: original marker, response, image/file labels visible. Open text displayed original contents; Open image selected Files viewer, `ctx_d5255e9eb12e__browser-image.png`, **Image content**, 100%.

Configured student_one browser send RESTORE_TEXT_ONLY_20260926 initially exposed an inherited package-root configuration override omitting the staged package after restart. Corrected only restart environment (unset AUTOBYTEUS_AGENT_PACKAGE_ROOTS to read persisted import roots), retried same input; real native Codex restore returned **RESTORE_OK**, Idle. No data repair was needed. Browser stopped Team again. Original interrupted task history was not revived.

## Evidence and limits
- `browser-exact-delivery.json`: exact IDs, one persisted input, current image/file URLs, absence on other executions, hashes and byte lengths.
- `browser-finalize-failure.json`: equal before/failed trace hash, noDispatch true.
- `browser-prerestart-hashes.json` / `browser-postrestart-hashes.json`: unchanged raw trace/image/file, HTTP200.
- `browser-restore-result.json`: actual user marker + RESTORE_OK response.
- `browser-*-trace.jsonl`, task/tree snapshots: only owned fixture histories; system instructions omitted from copied trace evidence.
- `studio-fixture.log`, `studio-restart-browser.log`, `studio-restart-browser-final.log`: actual process/transport observations and environment correction.

Prelaunch draft sequencing is proven by durable built-process case, not claimed as a separate browser prelaunch journey. Removal/failed-clear/local preview also has frontend component coverage. Real browser uses existing authenticated Codex; deterministic provider transport tests are separate and explicitly emulated. No installed Docker data or Electron shell validation claim.

## Cleanup
Own UI Team stopped; own servers/provider/Nuxt stopped; five own tabs closed. Owned temporary roots and staged copies removed after evidence preservation. Original package unchanged. Provider-managed test conversations retained inactive. See cleanup.json.
