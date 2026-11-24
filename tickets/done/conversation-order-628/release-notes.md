## What you need to do

- Update the app and every node it connects to (a Docker node, a node on another computer or the one a phone pairs with) to this release together. This release's app shows only the times a node recorded, and it refuses a live update that does not carry one. A node on an earlier release sends none, so an app and a node on different releases cannot show a conversation reliably until both are updated.

## A conversation keeps its order, and every time on it is the node's

- **Your message always shows before the notice and the reply, whatever your clock says.** Before, a phone or computer whose clock ran a second or more behind the node's could show a message you had just sent after the platform's note ("Tools updated", "Skill updated") or after the agent's reply. The conversation now keeps the order in which things happened, live, on the phone and on the desktop, also when another window sends the message while you watch, and for a run on another node.
- **A platform notice sits right after its message when you reopen a run.** Live it already read: your message, the notice, the reply. After a reload the notice could come first. A reopened run now reads the same as it did live, for a run on any agent runtime.
- **Times come from the node, not from the device.** The time on a message, a notice, a tool call or a compaction row is the time the node recorded, so a device with the wrong clock shows the same times as any other. A message you have just sent shows no time until the node confirms it, then shows the node's.
- **Compaction rows stay between the right turns.** They are still placed by time, now by the node's time, and they no longer move your messages.

### Good to know

- The "last activity" time in the run list still follows the clock of the device you look at it with.
- The time of a reopened message is the moment the node saved it, which can differ by a few thousandths of a second from the time it showed live. The order is the same.
