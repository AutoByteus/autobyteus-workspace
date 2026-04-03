Browser and shell improvements in this release:

- Renamed the old Preview capability into Browser/tab tools across the touched scope.
- Browser and `send_message_to` tool exposure now strictly follows `AgentDefinition.toolNames`.
- Browser is now a permanent right-side tab with manual open, navigate, refresh, close, and full-view controls.
- Browser popups now open as in-app Browser tabs instead of failing immediately.
- Browser address entry now accepts shorthand inputs like `google.com` and `www.google.com`.
- Browser full-view now uses a tighter top chrome layout so page content gets more vertical space.
