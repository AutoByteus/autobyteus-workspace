## Improvements
- On the phone, a file a conversation names now opens wherever it is on the node's computer, not only inside the run's folder: tap the path and the file opens read-only, full screen, and Back returns to the conversation. Text, Markdown, images and PDFs show as they do for workspace files. On a Docker node, the paths are the container's own, such as its shared folder.
- A path that cannot be opened says why: "This file was not found on the computer." or "This path is a folder, not a file."
- A paired phone can read any file on its node by path, read-only. It can never change, rename or delete a file there, and linked nodes cannot read files this way.
