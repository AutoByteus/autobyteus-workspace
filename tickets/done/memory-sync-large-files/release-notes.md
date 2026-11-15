# Release Notes — Memory Sync Carries Large Files And Lists What Could Not Sync

Not released yet: this ticket is merged and waits for the next release. Beta tags publish GitHub-generated notes; this file is the curated, user-facing summary, and its first section is the one a beta's notes need.

## What you need to do
- If you use Memory Sync, update every Memory Sync node, each source and the hub, to this version together. A source and a hub on different versions are not supported: an older hub does not accept the new large-file uploads.

## What's New
- Memory Sync now sends files of any size to the hub: long agent traces and large attachments such as videos of 2 GB and more. A large file is uploaded in pieces of 8 MB, appears on the hub only after its size and checksum are verified, and an interrupted upload continues where it stopped instead of starting again.
- Nodes → Memory Sync lists the files that could not be synced: how many, then for each its path, size, the reason and when the next attempt happens (at most 20 files, then "and N more"), in English and Chinese. **Sync now** retries them at once.

## Improvements
- Memory Sync no longer reads files that did not change since their last sync, so each background run is lighter.
- Memory use of a transfer no longer grows with the size of the file.

## Fixes
- One large attachment no longer stops all of Memory Sync. Before, a single file above about 37 MB made the hub refuse the request, and every later run failed the same way. Now the other files sync, and only the file that cannot be synced is reported.
