## New

- **An Integrations page.** In the main menu, **Integrations** shows each integration you have as a card: its name, description, icon and status (**Installed, needs a token**, **Connected as @login**, or **Needs a newer AutoByteus**).
- **Import** takes a GitHub repository link or a local folder. Each integration in it gets a card, and its skill joins your skills. **Manage sources** updates or removes what you imported.
- **Connect** on a card asks for the token, checks it with GitHub and keeps it in AutoByteus's encrypted vault. **Test** checks it again; **Remove** deletes it. The token is never shown again.
- **Which agents may use an integration is now decided by its skill.** Add the integration's skill (for GitHub, `github-integration`) to an agent, as with any skill. Only agents with the skill can use GitHub; removing or disabling the skill stops access at once.

## Changed

- The GitHub card in Settings → Server Settings → Basics is gone; GitHub is set up on the Integrations page instead.
- If you connected GitHub in an earlier beta, your token is kept. Import `https://github.com/AutoByteus/autobyteus-integrations` on the Integrations page, and its GitHub card shows as connected right away.
- The agent ticks from the old card no longer apply. Give the `github-integration` skill to the agents that should use GitHub.

## Notes

- An agent set to "all installed skills" gets GitHub as soon as the integration is connected.
- Removing an integration's source (on the Integrations or Skills page) also removes its connection.
- Opening the page makes no network request; only Import and Update contact GitHub.
