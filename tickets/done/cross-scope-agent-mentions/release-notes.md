# Release Notes — Bring agents and teams into a running conversation with `@`

## New

- **`@` in any live run.** In a running standalone agent, a Team run or an Org run, type `@` in the message box. Pick a shared agent or agent team that is not already in the run. The message goes to the agent you are talking to, and the agent or team you mentioned joins this run.
  - The list shows shared agents first, then shared agent teams. It never shows the Daily Assistant, Agent Orgs, or anything already in the run.
- **One collaborator per run.** A mentioned agent or team joins once. It appears under the run straight away as **Offline** and starts when it gets its first message. Mentioning it again in the same run reuses it.
  - It uses the run's own settings: runtime, model, workspace and tool approval.
  - It is saved with the run. After you stop and reopen the run, it is still there and continues its conversation when messaged.
- **Agents brief collaborators with ordinary messages.** Your agent contacts the collaborator with `send_message_to`. The collaborator reports back the same way. Every message appears in the Team/Org tab. A collaborator team's own handoffs between its members work too.
- **Open and chat with a collaborator.** Click a collaborator's row to see its conversation and message it directly.
- **Standalone agents can now work with others.** Every agent you run, including the Daily Assistant, can use `send_message_to` and `delegate_task` from its first turn. Once a standalone run has a collaborator, it shows rows under the run and a **Team** tab.

## Changed

- **Agent-to-agent messages show who sent them.** A message from another agent is shown as **"From <Sender>:"** instead of looking like your own message. This applies live and after reopening, in Team, Org and standalone runs. Messages stored before this version keep their old look.
- **Simpler task rows.** Delegated agents show the same status dot and initials as team members. The "Started by …" line is no longer shown; it is still read out by screen readers.
- **`delegate_task` to a collaborator** starts a separate extra copy for parallel work. The collaborator itself is unaffected.

## If adding fails

- If a mentioned agent or team can't run with this run's settings (for example, the run's model is not available for it), **nothing is added and your message is not sent**. Your text and chips stay in the box, and a red notice says "Couldn't add <name> to this run" with the reason. Remove the chip and send again.

## Upgrade notes

- **No data migration.** Existing runs and history open as before.
- **Downgrade:** an older version can't read runs that have collaborators.

## Known limitations

- In a standalone run's collaborator view, the Team tab labels the host in lowercase ("research assistant").
- The Event Monitor's "earlier events" page still shows agent-to-agent messages like user messages.
- Sending a message for the first time with a new `@` mention can take up to about a second while the collaborator is checked and added.
