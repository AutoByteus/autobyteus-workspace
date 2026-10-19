## What's New
- **Agent packages refresh automatically.** Changes to Agent, Team and Org definitions appear without Reload. Invalid edits retain the last working definition with a visible explanation; new invalid definitions and unavailable package folders show their status.
- **Launch defaults follow delegated work.** Agent and Team runtime/model defaults apply to delegated copies and collaborators. Team and Org launch forms seed member defaults, including when switching from New chat. Settings shows the source of each choice and explains unusable defaults.
- **Stop a delegated copy and change its model.** Stop one Agent or Team copy and its descendants without stopping the rest of the run. While stopped, change its model or member settings; its next message resumes the existing conversation with the saved choice.
- **Estimated output speed in the Token Meter.** Output TPS shows an estimate for the selected Agent, with runtime/model identity and observation time. Collecting and Unavailable states avoid invented readings. This estimate includes tool/wait time and is not instantaneous inference speed.

## Improvements
- Delegated Teams under standalone Agent conversations start collapsed after reopening or when new Teams appear; expand them to inspect members without changing ongoing work.
- Team details put Members directly after Description.
- Enabled sidebar Stop controls are consistently red, with darker hover styling. Disabled and pending controls remain gray; keyboard behavior and targets are preserved.
- Runtime availability messages distinguish missing software from sign-in and other failures. An installed but signed-out Antigravity CLI explains how to sign in on that node; reopening the model menu rechecks unavailable runtimes.
- Retired obsolete personal Docker build assets and clarified the supported monorepo Docker build path. Existing user containers, volumes and data are not deleted by this source change.

## Fixes
- **Reliable Docker Prisma startup after recreation.** Startup resolves the installed Prisma CLI's own matching engines and only accepts an exact-revision cache fallback, rather than selecting an incompatible retained cache.
- **Saved Settings refresh in place.** Stopped Agent, Team and collaborator model/configuration changes now show the saved values immediately, including repeated edits and reopen. If a write succeeded but readback failed, Settings reports that state and offers a read-only refresh instead of pretending the old values were saved.
- PDFs selected from Files search open in the workspace preview even when their folder was not expanded, while retaining file-access restrictions.
- Creating or editing Agents and Orgs keeps catalog diagnostic fields complete, avoiding missing-field cache errors without hiding warnings.
- The Workspaces panel uses the available layout width correctly, avoiding an unnecessary drawer when it can remain docked.

## Notes and known limitations
- This release does not automatically upgrade an existing Docker node. A separately chosen upgrade is required to use the corrected image; a temporary engine pin in an old container is not recreation-durable.
- Launch defaults affect newly started copies. Per-copy model changes do not alter definitions, unrelated copies or future copies. Older copies without recorded starter relationships cannot be stopped together with their starter.
- Package auto-refresh does not watch Skills or application-packaged Agent/Team definitions. An unavailable watch falls back to explicit Reload.
- Live response batching can flush earlier than its configured interval; this existing streaming-cadence defect remains unresolved.
- Some updater failures can be mislabeled as network errors when incidental diagnostic stack paths contain matching words; the underlying updater error classification defect remains unresolved.
- The Docker installer's printed commands can be invalid for custom installation paths containing an apostrophe. This existing installer limitation remains unresolved.
