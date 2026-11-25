## Audio and message attachments play in the phone apps' own player, the file viewer keeps its width, and more languages are highlighted

(For the release that includes this change, together with the phone apps' video player of the previous ticket, autobyteus-574: both ship in the same release, because this change renames what the apps and the page say to each other and the folder where the apps keep what they fetched. User-facing. No user action is needed, so there is no "What you need to do" section: an app without the new player keeps playing files in the page.)

- **Audio plays in the phone apps' own player.** An MP3, M4A, AAC or WAV file of your node (also AIFF and CAF on iPhone, FLAC, Ogg and Opus on Android) opens in the phone's player with the file's name and the standard controls. It starts in about a second, jumps anywhere by fetching only the part it needs, also over a slow connection, and does not download again when you reopen an unchanged file. Back returns to where you were. A type the app's player does not play (for example Ogg audio or WebM video on iPhone) keeps playing in the page, as before.
- **A video or audio file attached to a Team or Organization message streams.** In the Messages panel on the desktop it starts at once and seeks, instead of downloading the whole file first; in the phone apps it plays in the app's player. Text, PDF and image attachments open as before, and an attachment that was deleted still says so.
- **The sound is heard on an iPhone set to silent.** The video or audio you tap plays with its sound whatever the Ring/Silent switch says, as in media apps, and other apps' audio resumes when you close the player. It does not keep playing after the screen locks.
- **The desktop file viewer is never too narrow.** In the Files tab, the viewer keeps at least 400 px beside the tree: when the panel is too narrow for both, the tree sits above the viewer, and dragging the divider stops at 400 px.
- **More file types are highlighted.** YAML, TOML, shell scripts, Go, Rust, Java, XML, INI files and Dockerfiles, and HTML and Vue files, are colored in the file viewer. In a chat message, a code block marked `yaml`, `toml`, `bash`, `sh`, `zsh`, `go`, `rust`, `java`, `xml`, `ini` or `dockerfile` is colored too.

### Good to know

- The new audio player needs the new app. An older app, the node's web page in a phone browser and the desktop app play audio in the page as before.
- An attachment file of zero bytes shows "Failed to fetch reference content (416)" instead of an empty player.
- On iPhone, the app's **Back** bar sits over the player's own top buttons while the controls show. Both close the player; swiping down does not.
