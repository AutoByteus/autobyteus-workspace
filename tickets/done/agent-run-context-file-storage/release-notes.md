## What's New
- Browser-uploaded context attachments are now stored with the agent run or team member that sent them instead of the shared media library.
- Standard, team, and application composers now all use the same finalized run-owned attachment flow for uploaded context files.
- Sent image attachments now render as compact thumbnails in conversation surfaces when a preview is available.

## Improvements
- Uploaded attachments keep the original visible filename after send even when the stored server filename is sanitized.
- The Socratic Math Teacher Electron composer now preserves native dropped file paths and keeps attachments bound to the correct member even if focus changes mid-drop.
- Uploaded image clicks now use the shared preview/open behavior so image attachments open consistently across standard and app-specific message views.

## Fixes
- Fixed browser-uploaded context files being routed through shared `/rest/files/...` media storage instead of run-owned `/rest/.../context-files/...` storage.
- Fixed attachment ownership drift during in-flight app/team focus changes.
- Fixed sent-message image preview behavior so non-image and failed-preview attachments still fall back to normal attachment-open behavior.
