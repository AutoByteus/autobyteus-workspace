## Videos and audio in chat play on the phone with a clear loading state

- **No more "Video URL is not available." while a file loads.** Tapping a video or audio path in a conversation on your phone now shows "Loading video…" (or "Loading audio…" / "Loading file…") with how much has arrived, for example "4.1 of 9.7 MB", and then plays it. This holds for files inside the run's folder and anywhere else on the node's computer, in every kind of conversation, including delegated agents.
- **A file that cannot be loaded says so plainly, and you can retry.** A broken download or a file that is not there shows a short message such as "This video could not be played." or "This file was not found on the computer." with a **Retry** button. Retry reads the file again, so a file that appeared in the meantime plays. A path that is a folder says so and has no Retry. The messages are available in English and Chinese.
- **Nothing changes in who may read which file.** The phone still proves itself to the node the same way, and a file outside what the node allows is still refused.
- The desktop app plays these links as before.

### Good to know

- The phone downloads a video or audio file completely before it plays, so a large video takes as long as its download and cannot be skipped through until it has loaded.
- Right after a node restarts, Retry can fail once for a second or two while the node reloads the run's folder; tap Retry again.
- Only full paths in a conversation open as files; a relative path such as `media/clip.mp4` is not opened as a file, as before.
