## A file that cannot be opened shows an error message, not raw text

- In the Files viewer, a file the node cannot give you (it was deleted, the path is outside the folder, a link is not allowed, or you lack permission) now opens in the viewer's error state with the node's message, for example "Error! File not found: …". Before, the viewer showed the raw refusal text, `{"error":"File not found: …"}`, as if it were the file. The error line also has a space between "Error!" and the message.
- A file whose own text is `{"error":…}` now opens as the text it is; before, it could not be told from a refusal.
- This works the same for links to files in the Memory page's semantic memory view and in chat, and in the phone app's built-in demo.
- Nothing is needed from you; the app and the node change together in the same release.
