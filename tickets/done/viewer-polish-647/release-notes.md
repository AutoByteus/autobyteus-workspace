## The file viewer reads cleaner, an empty video reference says so, the iPhone player uses iOS's own screen, and PDFs no longer pile up memory

(For the release that includes this change. User-facing. No user action is needed beyond the usual update, so there is no "What you need to do" section.)

- **The file viewer shows no line numbers.** Text, code, JSON and Markdown source open with only a small margin before the first character, so the text uses the whole width, on the phone and on the desktop. Editing and saving on the desktop work as before.
- **An attachment with no content says so.** A video or audio attachment of zero bytes in a Team or Organization message no longer shows "Failed to fetch reference content (416)", as it did in the previous beta. The viewer opens and says "This video could not be played." with **Retry** (in the phone apps, the player's "could not be played" screen). An attachment that was deleted still says it is unavailable.
- **The iPhone's video and audio player is iOS's own screen.** It has iOS's close button and the file's name on top, with nothing of the app over its controls: the app's **Back** bar that sat over the player's top buttons in the previous beta is gone. Close it with that button or by swiping down: the playback and its sound stop. A wide video still turns the phone to landscape.
- **Opening many PDFs no longer grows the app's memory.** Every PDF is drawn by one shared worker instead of a new one for each document, in the desktop app and on the phone.
- **A file message about one run no longer follows you to another.** The line under a conversation that says a file could not be opened (for example, a file on another node) clears when you switch runs.

### Good to know

- The iPhone's new player screen needs the new app; an older app keeps its own player.
- The sound with the Ring/Silent switch on silent has been checked on a simulator, not on a physical iPhone.
