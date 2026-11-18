## What you need to do
- **Nothing to set up.** Update the desktop app and your nodes as usual.
- **The first start after the update builds the agents' run catalogs once.** It writes new files only under `episodic/` in the memory folder, one catalog per agent plus an index, in about 12 seconds for around 4,000 runs. Nothing in any run folder is changed, and the catalogs can be deleted at any time: they are rebuilt at the next start. On a long-used installation, the server log can show, at each start, one warning for each old team run that was saved without its team structure; those runs are left out of the catalogs and are otherwise unaffected.
- **Text size on the phone moved.** It is now in the run list's **⋮** → **On this phone** and covers every phone screen. The size you chose before is kept.
- **Reviewing tool calls on the AutoByteus runtime:** a tool other than the four base tools now asks for approval twice, first for the search, then for the tool. Running tools automatically is unchanged.

## Good to know
- After a restart, a restored run can show the restart reminder card twice, and the agent's first reply after the restart can be hidden in the conversation view. The agent receives the reminder once, and the saved conversation is right.
- The restart reminder gives the time in UTC.
- Codex, Grok and DeepSeek agents still show "Idle" while a background task of theirs runs (no live count).
- On the desktop, some small text with a fixed size does not follow **Settings → Display → App font size**.
