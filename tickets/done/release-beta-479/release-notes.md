## What you need to do

- **Android:** install the new version of the AutoByteus Android app (the APK on this release). Downloading files on the phone needs it. Pinch zoom works without it. It also brings the previous beta's Android fixes if you have not installed that one yet.
- **Docker nodes:** update your nodes to this beta (`autobyteus-docker upgrade --all --tag beta`), or let them update themselves if you run them on the beta channel. The launcher has not changed.
- **Desktop:** nothing to do. With **Settings > Updates > Receive beta updates** on, the app updates itself.
- **Do not go back to an older version after updating.** An older build would not see agents delegated after the update. If you need to go back, contact support instead of installing an older build.

## What's new

### Phone viewer

- PDFs and images opened on the phone zoom with two fingers: pinch to zoom in and out, drag to move around, double tap to zoom in or back. PDFs stay sharp at every zoom and still scroll through their pages. A file that reloads keeps its zoom.
- A PDF or image opened on the phone has a Download button. In the Android app it saves the file to the phone's Downloads under its own name and says "Saved to Downloads: <name>". In a phone browser it uses the browser's download.
- The phone shows a text file of any size in full; the "too large" limit is gone.

### Files

- **Open files follow their changes.** A workspace file you have open shows its new content within a second when it changes on disk, for example when an agent rewrites it. This works on the desktop and on the phone, for text, images and PDFs. An unsaved edit you are making is kept.
- In a desktop window that shows a Docker node or a node on another computer, a file a conversation names opens wherever it is on that node, not only inside the run's folder: click the path and the file opens read-only in the Files panel. A path that cannot be opened says why.
- A file path in a run that another node runs says which node it is on: "This file is on <node>, where this run runs.", on the desktop and on the phone.

### Long-running managers

- When a Task is closed (DONE or CANCELLED), the agents and teams delegated for it leave the tree of the run that delegated them once they have stopped. A run that has delegated many Tasks over weeks opens as quickly as one with few.
- Finished work comes back when needed. When a closed Task is reopened and its assigner messages the delegated run, or the same run gets a follow-up Task, the run continues with its conversation and appears in the tree again.
- Nothing you see is lost. The Team tab keeps every message with finished runs, the Memory page keeps listing finished delegated runs, and token totals and earlier attachments are unchanged.
- No data migration runs. Delegated runs from builds before mid-October 2026 that belong to no Task are no longer shown under the run that started them. Their conversations stay on disk and on the Memory page.
- A manager that closes a copy's Task and gives the same copy its next Task at the same time now works in either order. The copy stays live and gets its Task, where before it could be refused with "already active or reserved".

### Model settings

- **Claude thinking settings tell the truth.** On the AutoByteus runtime, Opus 5 "Off" really turns thinking off. Fable 5 and 5.1 offer effort only, and models with an On/Off switch default to On, as Anthropic does. On the Claude Agent SDK runtime, only effort is offered, and an untouched setting shows "Default" and sends nothing.
- Only the settings a model declares reach the provider and new runs. Old runs that hold other settings still resume.
- Model pickers read the current list each time they open, and on "Refresh models". A failed refresh keeps the shown list and offers Retry.
- A refused Save says which model and scope, that nothing was saved, and to refresh the model list and choose again.
