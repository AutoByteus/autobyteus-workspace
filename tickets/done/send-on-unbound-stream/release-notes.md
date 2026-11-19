## A message is never lost silently

- **A message you send always reaches the agent, or comes back to you.** Before, a message sent the instant a run's connection opened (for example right after pressing Stop, or right after a connection came back) could vanish without a word. The app now sends only when the connection is ready, so such a message goes through.
- **A message that does not get through is returned.** It disappears from the conversation, its text, attachments, mentions and skill tags are back in the message box (anything you typed meanwhile is kept), and one notice above the box tells you why: "Your message was not sent: not connected to the node. It is back in the message box; send it again." This works for single agents, Team members, Agent Org members, delegated agents and agents on a paired node, on the desktop app and on the phone. The agent's status does not change.
- **When the connection drops while a message is on its way,** the app checks what the node received after the connection returns. If the node has the message, you see it once and nothing else happens, even when the agent was busy and held it until its turn ended. If the node does not have it, it comes back as above. If the app cannot tell, the message comes back with a notice that says so: "The connection to the node was lost while sending. Your message is back in the message box; if it does not appear in the conversation, send it again."
- **The first message of a new run that does not get through keeps its run,** so sending it again works.

### Good to know

- When the app cannot tell whether a message arrived, the message may still appear in the conversation after it came back to the message box. Check the conversation before you send it again.
- The app and every server node it connects to must be on this release. A node on an earlier release sends run snapshots in a form this app does not accept.
- While your computer cannot reach the node, a Team or Org member's Send button can stay disabled, so "send it again" has to wait until the connection returns.
