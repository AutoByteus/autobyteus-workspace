## Extensions: optional capabilities you install from Settings, and Voice Input moves there

(For the release that includes this change. User-facing. Voice Input needs a one-time reinstall, so there is a "What you need to do" section.)

## What you need to do

- **Install Voice Input again.** The first time the new version starts, it removes the old Voice Input install. Open **Settings → Extensions**, press **Install** on Voice Input (about 2 GB, downloaded once; it takes a few minutes), and choose your language and microphone again. Until it is installed, the microphone buttons stay hidden.

## What's New

- **Settings → Extensions.** Every node now has a list of optional capabilities that AutoByteus offers. Each card says what the extension needs before you install it. You can install it, turn it on and off, update it and remove it. While it installs, the card shows what it is doing, and when something fails it shows the reason and lets you open the extension's log.
- **Each node has its own extensions.** A Docker node or a Linux server lists and manages its own extensions in its own window, and only the node's owner can change them (a phone cannot). An extension that has no build for that node's computer says so on its card.
- **Voice Input is an extension.** It belongs to the computer you work at: you manage it in the window of this computer's own node, and every window can dictate with it, including windows of other nodes. Its card holds your language and, in the same place, a microphone choice and a **Test** button.
- **Updates without a new app version.** When AutoByteus publishes a newer version of an extension, its card shows **Update**. Your settings stay. If an update fails, the old version keeps working and the card says why.

## Improvements

- While the speech model loads, Voice Input says "Getting ready" instead of looking idle, and the microphone appears when it can record.
- One broken extension no longer affects anything else: its card shows the problem, and the rest of the app and the other extensions keep working.

## Good to know

- Extensions come only from AutoByteus's signed list. A computer that cannot reach the list still shows the extensions it has installed, with a note that the list could not be reached.
- Your Voice Input language and microphone choice from the old install are not carried over.
- Going back to an older version of the app: the older app looks for its own Voice Input install, which this version removed, so you would install it there again.
